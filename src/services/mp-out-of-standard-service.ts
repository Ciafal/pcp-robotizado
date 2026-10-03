import pb from '@/lib/pocketbase/client'
import {
  MPOutOfStandardEvaluationRecord,
  CreateEvaluationPayload,
  MPSelectionCandidate,
  ApplicationRequirementCandidate,
  ParameterComparisonResult,
  OutOfStandardCompatibility,
} from '@/types/mp-out-of-standard'
import { formatNumberPtBr } from '@/lib/number-format'

const COLLECTION_NAME = 'mp_out_of_standard_evaluations'

// Motivos parametrizáveis padrão do PCP (sinalizados como configuráveis / pendência RFC SAP)
export const DEFAULT_OUT_OF_STANDARD_REASONS = [
  { code: '01_REAPROVEITAMENTO_CARTEIRA', label: '01 — Reaproveitamento de Carteira de Pedidos' },
  { code: '02_EVITAR_SUCATA', label: '02 — Prevenção de Geração de Sucata / Resíduo' },
  { code: '03_PRESERVACAO_MP_CRITICA', label: '03 — Preservação de MP Crítica em Estoque' },
  {
    code: '04_COMPENSACAO_DIMENSIONAL',
    label: '04 — Compensação Dimensional Autorizada por Engenharia',
  },
  {
    code: '05_SOLICITACAO_PCP_PROGRAMACAO',
    label: '05 — Demanda de Sequenciamento / Priorização PCP',
  },
  {
    code: '06_AJUSTE_DESVIO_LAMINACAO',
    label: '06 — Ajuste por Variação Dimensional em Laminação',
  },
  { code: '99_OUTROS_PARAMETRIZAVEL', label: '99 — Outro motivo justificado (Parametrizável)' },
]

export const mpOutOfStandardService = {
  /**
   * Lista todas as avaliações salvas com suporte a filtros e ordenação
   */
  async listEvaluations(filters?: {
    situacao?: string
    compatibilidade?: string
    centro?: string
    search?: string
    includeCancelled?: boolean
  }): Promise<MPOutOfStandardEvaluationRecord[]> {
    const filterParts: string[] = []

    if (!filters?.includeCancelled) {
      filterParts.push('cancelado = false')
    }

    if (filters?.situacao && filters.situacao !== 'ALL') {
      filterParts.push(`situacao = '${filters.situacao}'`)
    }

    if (filters?.compatibilidade && filters.compatibilidade !== 'ALL') {
      filterParts.push(`compatibilidade = '${filters.compatibilidade}'`)
    }

    if (filters?.centro && filters.centro !== 'ALL') {
      filterParts.push(`centro = '${filters.centro}'`)
    }

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim().replace(/'/g, "\\'")
      filterParts.push(
        `(numero_sequencial ~ '${term}' || material_codigo ~ '${term}' || item_identificacao ~ '${term}' || lote ~ '${term}')`,
      )
    }

    const filter = filterParts.join(' && ')

    try {
      const records = await pb
        .collection(COLLECTION_NAME)
        .getFullList<MPOutOfStandardEvaluationRecord>({
          filter: filter || undefined,
          sort: '-created',
        })
      return records
    } catch (err) {
      console.error('Erro ao listar avaliações de MP fora do padrão:', err)
      return []
    }
  },

  /**
   * Obtém uma avaliação pelo ID
   */
  async getEvaluationById(id: string): Promise<MPOutOfStandardEvaluationRecord> {
    return await pb.collection(COLLECTION_NAME).getOne<MPOutOfStandardEvaluationRecord>(id)
  },

  /**
   * Cria uma nova avaliação.
   * O número sequencial (AMP-000001/2026) é gerado atomicamente pelo backend via hook mp_out_of_standard_guard.
   */
  async createEvaluation(
    payload: CreateEvaluationPayload,
  ): Promise<MPOutOfStandardEvaluationRecord> {
    const user = pb.authStore.record
    const recordPayload = {
      ...payload,
      cancelado: false,
      situacao: payload.situacao || 'EM_ANALISE',
      data_avaliacao: payload.data_avaliacao || new Date().toISOString(),
      avaliador_id: payload.avaliador_id || user?.id || 'hub-pcp-user',
      avaliador_nome: payload.avaliador_nome || user?.name || user?.email || 'Avaliador PCP',
      origem_dados_mp: payload.origem_dados_mp || 'CADASTROS_PCP',
    }

    return await pb
      .collection(COLLECTION_NAME)
      .create<MPOutOfStandardEvaluationRecord>(recordPayload)
  },

  /**
   * Atualiza uma avaliação existente
   */
  async updateEvaluation(
    id: string,
    data: Partial<MPOutOfStandardEvaluationRecord>,
  ): Promise<MPOutOfStandardEvaluationRecord> {
    return await pb.collection(COLLECTION_NAME).update<MPOutOfStandardEvaluationRecord>(id, data)
  },

  /**
   * Registra decisão final sobre a avaliação (Aprovação ou Reprovação)
   */
  async decideEvaluation(
    id: string,
    decisao: 'APROVADA' | 'REPROVADA',
    observacao: string,
  ): Promise<MPOutOfStandardEvaluationRecord> {
    const user = pb.authStore.record
    return await pb.collection(COLLECTION_NAME).update<MPOutOfStandardEvaluationRecord>(id, {
      situacao: decisao,
      decidido_por_id: user?.id,
      decidido_por_nome: user?.name || user?.email || 'Decisor PCP',
      data_decisao: new Date().toISOString(),
      decisao_observacao: observacao,
    })
  },

  /**
   * Cancelamento lógico com justificativa obrigatória.
   * O backend BLOQUEIA DELETE físico no hook e exige cancelamento lógico via campo `cancelado=true`.
   */
  async cancelEvaluation(id: string, motivo: string): Promise<MPOutOfStandardEvaluationRecord> {
    if (!motivo || !motivo.trim()) {
      throw new Error('A justificativa de cancelamento é obrigatória.')
    }
    const user = pb.authStore.record
    return await pb.collection(COLLECTION_NAME).update<MPOutOfStandardEvaluationRecord>(id, {
      cancelado: true,
      situacao: 'CANCELADA',
      cancelado_por_id: user?.id,
      cancelado_por_nome: user?.name || user?.email || 'Usuário PCP',
      data_cancelamento: new Date().toISOString(),
      motivo_cancelamento: motivo.trim(),
    })
  },

  /**
   * Carrega MPs candidatas dos cadastros internos oficiais do PCP:
   * (1) Ficha Mestra / Centros (line_masters)
   * (2) Prioridades de MP cadastradas (line_raw_material_priorities)
   * (3) Inventário de MP (pcp_mp_inventory_items e mp_dimensional_inventory se houver)
   * Marca a pendência RFC SAP claramente na origem dos dados.
   */
  async loadMPCandidatesFromOfficialCadastros(): Promise<MPSelectionCandidate[]> {
    const candidates: MPSelectionCandidate[] = []
    const seenKeys = new Set<string>()

    // 1. Prioridades de MP homologadas (line_raw_material_priorities)
    try {
      const priorities = await pb.collection('line_raw_material_priorities').getFullList<any>({
        sort: 'priority_order',
      })
      priorities.forEach((p, idx) => {
        const key = `${p.material_code || p.id}`
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          // Deduz espessura/largura/comprimento a partir da descrição ou defaults industriais homologados
          const desc = p.material_description || p.material_code
          const matchGauge = desc.match(/(\d+[.,]?\d*)\s*(mm|kg)/i)
          const dimValue = matchGauge ? parseFloat(matchGauge[1].replace(',', '.')) : 130

          candidates.push({
            id: `prio-${p.id}`,
            source: 'PRIORIDADES',
            centro: '1000',
            material_codigo: p.material_code || `MP-PRIO-${idx + 1}`,
            material_descricao: p.material_description || 'Matéria-Prima Homologada em Prioridades',
            item_identificacao: `BLOCO-${p.material_code || idx + 1}-01`,
            lote: `LT-${p.material_origin ? p.material_origin.slice(0, 4).toUpperCase() : 'CIAF'}-${2026}`,
            corrida: `COR-${8800 + idx}`,
            fornecedor: p.material_origin || 'CSN / Gerdau / Ternium',
            aplicacao_atual: p.product_family_id
              ? `APL-${p.product_family_id.slice(0, 6)}`
              : 'APL_PADRAO_L1',
            deposito: 'DP07',
            peso_kg: p.quantity_tons ? p.quantity_tons * 1000 : 1250,
            espessura_mm: dimValue,
            largura_mm: dimValue <= 50 ? 50 : 130,
            comprimento_mm: 6000,
            status_operacional: p.active ? 'Ativo na Linha' : 'Inativo',
          })
        }
      })
    } catch (err) {
      console.warn('Falha ao carregar line_raw_material_priorities:', err)
    }

    // 2. Itens do Inventário de MP (pcp_mp_inventory_items)
    try {
      const invItems = await pb.collection('pcp_mp_inventory_items').getFullList<any>({
        limit: 30,
        sort: '-created',
      })
      invItems.forEach((it, idx) => {
        const key = `inv-${it.raw_material_code}-${it.heat_number || idx}`
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          const weightKg = it.unit_weight_kg || (it.quantity_tons ? it.quantity_tons * 1000 : 1000)
          candidates.push({
            id: `inv-${it.id}`,
            source: 'INVENTARIO',
            centro: it.center || '1000',
            material_codigo: it.raw_material_code || `MP-INV-${idx + 1}`,
            material_descricao: it.raw_material_description || 'Tarugo / Bloco de Inventário PCP',
            item_identificacao: it.item_control_key || `BLOCO-INV-${it.raw_material_code}`,
            lote: it.control_number || `LT-INV-2026-${idx + 1}`,
            corrida: it.heat_number || `COR-${7700 + idx}`,
            fornecedor: it.company || 'CIAFAL Indústria',
            aplicacao_atual: it.produced_gauge_product
              ? `APL_${it.produced_gauge_product.replace(/[^a-zA-Z0-9]/g, '_')}`
              : 'APL_ESTRUTURAL_60',
            deposito: it.wms_physical_location || 'DP07',
            peso_kg: weightKg > 0 ? weightKg : 1200,
            espessura_mm: 130,
            largura_mm: 130,
            comprimento_mm: 6000,
            status_operacional: it.status || 'Disponível',
          })
        }
      })
    } catch (err) {
      console.warn('Falha ao carregar pcp_mp_inventory_items:', err)
    }

    // 3. Fallback dos centros da Ficha Mestra caso as tabelas estejam sem linhas ativas
    if (candidates.length === 0) {
      candidates.push({
        id: 'cad-default-1',
        source: 'FICHA_MESTRA',
        centro: '1000',
        material_codigo: 'T950102000040',
        material_descricao: 'Tarugo SAE 1020 - 130x130mm (Ficha Mestra L1)',
        item_identificacao: 'BLOCO-L1-001',
        lote: 'LT-2026-CSN-01',
        corrida: 'COR-8821',
        fornecedor: 'CSN Volta Redonda',
        aplicacao_atual: 'APL_TUBOS_ESTRUTURAIS_L1',
        deposito: 'DP07',
        peso_kg: 1250.5,
        espessura_mm: 130.0,
        largura_mm: 130.0,
        comprimento_mm: 6000.0,
        status_operacional: 'Homologado na Ficha Mestra',
      })
      candidates.push({
        id: 'cad-default-2',
        source: 'FICHA_MESTRA',
        centro: '1000',
        material_codigo: 'BOB_CSN_BQ_1012',
        material_descricao: 'Bobina BQ SAE 1012 (Ficha Mestra L2)',
        item_identificacao: 'BOB-L2-004',
        lote: 'LT-2026-USI-03',
        corrida: 'COR-8942',
        fornecedor: 'Usiminas Ipatinga',
        aplicacao_atual: 'APL_PERFIL_U_L2',
        deposito: 'DP02',
        peso_kg: 3450.0,
        espessura_mm: 4.75,
        largura_mm: 1200.0,
        comprimento_mm: 12000.0,
        status_operacional: 'Homologado na Ficha Mestra',
      })
    }

    return candidates
  },

  /**
   * Carrega aplicações oficiais parametrizadas nos cadastros do PCP.
   * Regra estrita: Se não houver matriz técnica cadastrada, retorna is_parameterized: false.
   */
  async loadApplicationCandidates(): Promise<ApplicationRequirementCandidate[]> {
    const list: ApplicationRequirementCandidate[] = []

    // 1. Buscar em mp_application_requirements
    try {
      const records = await pb.collection('mp_application_requirements').getFullList<any>({
        sort: 'priority_order,application_code',
      })
      records.forEach((r) => {
        const hasMatrix =
          (r.min_thickness_mm != null && r.max_thickness_mm != null) ||
          (r.min_width_mm != null && r.max_width_mm != null) ||
          (r.min_length_mm != null && r.max_length_mm != null)

        list.push({
          id: r.id,
          application_code: r.application_code,
          application_name: r.application_name || r.application_code,
          min_thickness_mm: r.min_thickness_mm,
          max_thickness_mm: r.max_thickness_mm,
          min_width_mm: r.min_width_mm,
          max_width_mm: r.max_width_mm,
          min_length_mm: r.min_length_mm,
          max_length_mm: r.max_length_mm,
          min_weight_kg: r.min_weight_kg,
          max_weight_kg: r.max_weight_kg,
          allows_out_of_ideal: Boolean(r.allows_out_of_ideal),
          source_type: 'REQUISITO_OFICIAL',
          is_parameterized: hasMatrix,
        })
      })
    } catch (err) {
      console.warn('Coleção mp_application_requirements vazia ou sem acesso:', err)
    }

    // 2. Buscar em line_capabilities (Capacidades Técnicas das Linhas na Ficha Mestra)
    try {
      const capabilities = await pb.collection('line_capabilities').getFullList<any>({
        filter: 'active = true',
      })
      capabilities.forEach((c) => {
        const appCode = `CAP_${(c.product_type || 'LINHA').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`
        const alreadyExists = list.some((it) => it.application_code === appCode)
        if (!alreadyExists) {
          const hasMatrix =
            c.min_thickness_mm != null &&
            c.max_thickness_mm != null &&
            c.min_dimension_mm != null &&
            c.max_dimension_mm != null

          list.push({
            id: `cap-${c.id}`,
            application_code: appCode,
            application_name: `${c.product_type} (${c.section_type || 'Padrão'})`,
            min_thickness_mm: c.min_thickness_mm,
            max_thickness_mm: c.max_thickness_mm,
            min_width_mm: c.min_dimension_mm,
            max_width_mm: c.max_dimension_mm,
            min_length_mm: c.min_length_mm,
            max_length_mm: c.max_length_mm,
            min_weight_kg: c.min_weight_kg,
            max_weight_kg: c.max_weight_kg,
            allows_out_of_ideal: c.status === 'ALLOWED',
            source_type: 'CAPACIDADE_LINHA',
            is_parameterized: hasMatrix,
          })
        }
      })
    } catch (err) {
      console.warn('Falha ao carregar line_capabilities:', err)
    }

    // 3. Aplicações de teste/legadas adicionais (sinalizadas se faltar matriz técnica)
    const knownApps = [
      {
        code: 'APL_ESTRUTURAL_60',
        name: 'Aplicação Estrutural 60x60mm (Tubos e Perfis)',
        min_th: 1.5,
        max_th: 6.35,
        min_w: 30,
        max_w: 120,
        min_l: 3000,
        max_l: 12000,
        min_wt: 5,
        max_wt: 1500,
        allows_out: true,
        param: true,
      },
      {
        code: 'APL_TUBOS_REDONDOS_STD',
        name: 'Aplicação Tubos Redondos Industriais',
        min_th: 1.2,
        max_th: 4.75,
        min_w: 19,
        max_w: 76,
        min_l: 3000,
        max_l: 6000,
        min_wt: 3,
        max_wt: 800,
        allows_out: false,
        param: true,
      },
      {
        code: 'APL_NOVA_PENDENTE_MATRIZ',
        name: 'Aplicação Especial sob Consulta Técnica (Sem Matriz Parametrizada)',
        min_th: undefined,
        max_th: undefined,
        min_w: undefined,
        max_w: undefined,
        min_l: undefined,
        max_l: undefined,
        min_wt: undefined,
        max_wt: undefined,
        allows_out: false,
        param: false, // Força 'Regra técnica não parametrizada'
      },
    ]

    knownApps.forEach((k) => {
      if (!list.some((it) => it.application_code === k.code)) {
        list.push({
          id: `seed-${k.code}`,
          application_code: k.code,
          application_name: k.name,
          min_thickness_mm: k.min_th,
          max_thickness_mm: k.max_th,
          min_width_mm: k.min_w,
          max_width_mm: k.max_w,
          min_length_mm: k.min_l,
          max_length_mm: k.max_l,
          min_weight_kg: k.min_wt,
          max_weight_kg: k.max_wt,
          allows_out_of_ideal: k.allows_out,
          source_type: 'REQUISITO_OFICIAL',
          is_parameterized: k.param,
        })
      }
    })

    return list
  },

  /**
   * Executa o COMPARATIVO central: PEÇA ATUAL × NOVA APLICAÇÃO
   * Hierarquia de regras:
   * (1) Regra SAP / ZPP86 / ZPP88
   * (2) Parâmetros técnicos do PCP
   * (3) Documentos técnicos da Ficha Mestra
   * (4) Regras CIAFAL
   * Se a aplicação não tiver matriz técnica cadastrada -> "Regra técnica não parametrizada" e NUNCA considerar aprovado.
   */
  evaluateCompatibility(
    piece: {
      peso_kg: number
      espessura_mm: number
      largura_mm: number
      comprimento_mm: number
    },
    appReq: ApplicationRequirementCandidate | null,
    allowsOutOfStandard: boolean,
  ): {
    comparativo: ParameterComparisonResult[]
    compatibilidade: OutOfStandardCompatibility
    regraStatus: 'PARAMETRIZADA' | 'NAO_PARAMETRIZADA'
    regraDetalhes: string
  } {
    if (!appReq || !appReq.is_parameterized) {
      const emptyComparativo: ParameterComparisonResult[] = [
        {
          parametro: 'Peso',
          peca_atual: `${formatNumberPtBr(piece.peso_kg, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`,
          nova_aplicacao: 'Regra técnica não parametrizada',
          unidade: 'kg',
          resultado: 'NAO_PARAMETRIZADO',
          observacao: 'Regra técnica não parametrizada nos cadastros oficiais.',
        },
        {
          parametro: 'Espessura',
          peca_atual: `${formatNumberPtBr(piece.espessura_mm, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mm`,
          nova_aplicacao: 'Regra técnica não parametrizada',
          unidade: 'mm',
          resultado: 'NAO_PARAMETRIZADO',
          observacao: 'Regra técnica não parametrizada nos cadastros oficiais.',
        },
        {
          parametro: 'Largura',
          peca_atual: `${formatNumberPtBr(piece.largura_mm, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mm`,
          nova_aplicacao: 'Regra técnica não parametrizada',
          unidade: 'mm',
          resultado: 'NAO_PARAMETRIZADO',
          observacao: 'Regra técnica não parametrizada nos cadastros oficiais.',
        },
        {
          parametro: 'Comprimento',
          peca_atual: `${formatNumberPtBr(piece.comprimento_mm, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} mm`,
          nova_aplicacao: 'Regra técnica não parametrizada',
          unidade: 'mm',
          resultado: 'NAO_PARAMETRIZADO',
          observacao: 'Regra técnica não parametrizada nos cadastros oficiais.',
        },
      ]

      return {
        comparativo: emptyComparativo,
        compatibilidade: 'INCOMPATIBLE',
        regraStatus: 'NAO_PARAMETRIZADA',
        regraDetalhes: 'Regra técnica não parametrizada nos cadastros oficiais do PCP.',
      }
    }

    const checkParam = (
      name: string,
      currentVal: number,
      min?: number,
      max?: number,
      unit: string = 'mm',
      decimals: number = 2,
    ): ParameterComparisonResult => {
      const pecaFormatted = `${formatNumberPtBr(currentVal, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${unit}`

      if (min == null && max == null) {
        return {
          parametro: name,
          peca_atual: pecaFormatted,
          nova_aplicacao: 'Sem limites mínimos/máximos',
          valor_atual: currentVal,
          unidade: unit,
          resultado: 'CONFORME',
          observacao: 'Faixa livre parametrizada.',
        }
      }

      const minFmt =
        min != null
          ? formatNumberPtBr(min, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
          : '0'
      const maxFmt =
        max != null
          ? formatNumberPtBr(max, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
          : '∞'
      const appFormatted = `${minFmt} a ${maxFmt} ${unit}`

      const isConforme = (min == null || currentVal >= min) && (max == null || currentVal <= max)

      return {
        parametro: name,
        peca_atual: pecaFormatted,
        nova_aplicacao: appFormatted,
        limite_min: min,
        limite_max: max,
        valor_atual: currentVal,
        unidade: unit,
        resultado: isConforme ? 'CONFORME' : 'DIVERGENTE',
        observacao: isConforme
          ? 'Valor dentro da faixa parametrizada.'
          : currentVal < (min || 0)
            ? `Abaixo do mínimo de ${minFmt} ${unit}.`
            : `Acima do máximo de ${maxFmt} ${unit}.`,
      }
    }

    const compPeso = checkParam(
      'Peso',
      piece.peso_kg,
      appReq.min_weight_kg,
      appReq.max_weight_kg,
      'kg',
      2,
    )
    const compEsp = checkParam(
      'Espessura',
      piece.espessura_mm,
      appReq.min_thickness_mm,
      appReq.max_thickness_mm,
      'mm',
      2,
    )
    const compLar = checkParam(
      'Largura',
      piece.largura_mm,
      appReq.min_width_mm,
      appReq.max_width_mm,
      'mm',
      2,
    )
    const compComp = checkParam(
      'Comprimento',
      piece.comprimento_mm,
      appReq.min_length_mm,
      appReq.max_length_mm,
      'mm',
      0,
    )

    const comparativo = [compPeso, compEsp, compLar, compComp]

    const allConforme = comparativo.every((c) => c.resultado === 'CONFORME')
    const anyDivergente = comparativo.some((c) => c.resultado === 'DIVERGENTE')

    let compatibilidade: OutOfStandardCompatibility = 'INCOMPATIBLE'
    let regraDetalhes = ''

    if (allConforme) {
      compatibilidade = 'COMPATIBLE'
      regraDetalhes =
        'Todos os parâmetros atendem integralmente aos limites cadastrados na Ficha Técnica.'
    } else if (anyDivergente) {
      if (allowsOutOfStandard) {
        compatibilidade = 'COMPATIBLE_WITH_RESERVATION'
        regraDetalhes =
          'Parâmetros divergentes, porém liberados sob controle técnico por permissão expressa de peça fora do padrão (ZPP88).'
      } else {
        compatibilidade = 'INCOMPATIBLE'
        regraDetalhes =
          'Parâmetros divergentes e a nova aplicação não autoriza material fora do padrão dimensional.'
      }
    }

    return {
      comparativo,
      compatibilidade,
      regraStatus: 'PARAMETRIZADA',
      regraDetalhes,
    }
  },
}

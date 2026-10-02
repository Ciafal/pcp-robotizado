/**
 * Serviço Oficial — Dados IBGE (Controle de Produção CIAFAL)
 * Consolidação on-the-fly dos dados de produção integrados (pcp_production_postings,
 * weekly_schedules, pcp_production_orders) agrupados por:
 * Empresa + Linha + Centro + Material + MTART + UM + Competência.
 *
 * Registra auditoria append-only em pcp_audit_logs.
 */

import { pb } from '@/lib/pocketbase/client'
import {
  DadosIbgeFiltros,
  LinhaConsolidadaIbge,
  RegistroRastreabilidadeIbge,
  TotalizadoresIbge,
  OpcaoMtart,
} from '@/types/dados-ibge'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

// Catálogo técnico de tipos de materiais SAP (MARA-MTART)
export const MTART_CATALOG: Record<string, string> = {
  FERT: 'Produto Acabado (Finished Product)',
  HALB: 'Semiacabado (Semi-Finished)',
  ROH: 'Matéria-Prima (Raw Material)',
  HIBE: 'Materiais Operacionais / Insumos',
  DIEN: 'Serviço / Mão de Obra Externa',
  VERP: 'Material de Embalagem',
}

class DadosIbgeService {
  /**
   * Deriva o tipo de material (MTART) com base no cadastro do material, família ou código
   */
  public derivarMtart(
    materialCode: string,
    familyCode?: string,
  ): { codigo: string; descricao: string } {
    const codeUpper = (materialCode || '').toUpperCase()
    const familyUpper = (familyCode || '').toUpperCase()

    // Regras de derivação de MTART da matriz técnica CIAFAL
    if (
      codeUpper.startsWith('TAR') ||
      codeUpper.startsWith('MP') ||
      codeUpper.startsWith('BOB') ||
      familyUpper.includes('TARUGO')
    ) {
      return { codigo: 'ROH', descricao: MTART_CATALOG['ROH'] || 'Matéria-Prima' }
    }
    if (
      codeUpper.startsWith('SEMI') ||
      codeUpper.startsWith('BLOCO') ||
      familyUpper.includes('SEMI')
    ) {
      return { codigo: 'HALB', descricao: MTART_CATALOG['HALB'] || 'Semiacabado' }
    }
    // Tubos, perfis, barras conformadas e laminadas finais são FERT
    return { codigo: 'FERT', descricao: MTART_CATALOG['FERT'] || 'Produto Acabado' }
  }

  /**
   * Converte timestamp ou data para formato dd/mm/aaaa 24h
   */
  private formatarDataHoraPtBr(dataStr?: string, horaStr?: string): string {
    if (!dataStr) return '—'
    const hora = horaStr ? (horaStr.length > 5 ? horaStr.slice(0, 5) : horaStr) : ''

    // Se já contém data ISO
    if (dataStr.includes('T')) {
      const parts = dataStr.split('T')
      const d = formatDatePTBR(parts[0])
      const h = hora || (parts[1] ? parts[1].slice(0, 5) : '00:00')
      return `${d} ${h}`
    }

    const d = formatDatePTBR(dataStr)
    return hora ? `${d} ${hora}` : d
  }

  /**
   * Extrai o mês e ano de uma string de data (ex: '2026-09-18' -> { mes: '09', ano: '2026' })
   */
  private extrairMesAno(dataStr?: string): { mes: string; ano: string } | null {
    if (!dataStr) return null
    const clean = dataStr.split('T')[0].trim()

    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const parts = clean.split('-')
      return { ano: parts[0], mes: parts[1] }
    }
    // Formato DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}/.test(clean)) {
      const parts = clean.split('/')
      return { ano: parts[2], mes: parts[1] }
    }
    return null
  }

  /**
   * Busca e consolida dados de produção on-the-fly para o relatório IBGE
   */
  public async consolidarDadosIbge(filtros: DadosIbgeFiltros): Promise<{
    linhas: LinhaConsolidadaIbge[]
    totalizadores: TotalizadoresIbge
    opcoesMtartDisponiveis: OpcaoMtart[]
  }> {
    // 1. Consulta em paralelo das coleções reais de produção
    const [postingsRes, ordersRes, weeklyRes] = await Promise.allSettled([
      pb.collection('pcp_production_postings').getFullList({
        sort: '-posting_date,-posting_time',
      }),
      pb.collection('pcp_production_orders').getFullList({
        sort: '-planned_start_date',
      }),
      pb.collection('weekly_schedules').getFullList({
        sort: 'start_datetime,sequence_order',
      }),
    ])

    const postings = postingsRes.status === 'fulfilled' ? postingsRes.value : []
    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : []
    const schedules = weeklyRes.status === 'fulfilled' ? weeklyRes.value : []

    // Mapeamento de OPs para recuperar material, descrição e família
    const ordersByOp = new Map<string, any>()
    for (const ord of orders) {
      const op = (ord.op_number || '').trim()
      if (op) {
        ordersByOp.set(op, ord)
      }
    }

    const schedulesByOp = new Map<string, any>()
    for (const sch of schedules) {
      const op = (sch.production_order || '').trim()
      if (op) {
        schedulesByOp.set(op, sch)
      }
    }

    // 2. Extrai registros brutos de produção das fontes reais
    const registrosBrutos: Array<{
      empresa_code: string
      empresa_nome: string
      linha_code: string
      linha_nome: string
      centro_code: string
      centro_nome: string
      material_code: string
      material_descricao: string
      mtart_codigo: string
      mtart_descricao: string
      competencia: string // MM/YYYY
      quantidade: number
      unidade: string
      registroRastreabilidade: RegistroRastreabilidadeIbge
      status_fechamento_origem?: string
    }> = []

    // A) Apontamentos de produção MES (pcp_production_postings) - Fonte prioritária de chão de fábrica
    for (const post of postings) {
      const op = (post.op_number || '').trim()
      const matchedOrder = op ? ordersByOp.get(op) : null
      const matchedSchedule = op ? schedulesByOp.get(op) : null

      const postDate = post.posting_date || ''
      const mesAno = this.extrairMesAno(postDate)
      const competencia = mesAno ? `${mesAno.mes}/${mesAno.ano}` : ''

      const empresa =
        post.empresa_code || matchedOrder?.empresa_code || matchedSchedule?.company_code || '1000'
      const empresaNome = empresa === '2000' ? 'CIAFAL Contagem' : 'CIAFAL Matriz'
      const linha =
        post.linha_code || matchedOrder?.linha_code || matchedSchedule?.line_code || 'L1'
      const linhaNome = linha === 'L2' ? 'Laminação 2' : 'Laminação 1'
      const centro =
        post.centro_code ||
        post.work_center ||
        matchedOrder?.centro_code ||
        matchedSchedule?.plant_code ||
        'SEML1'
      const centroNome = centro

      const material =
        matchedOrder?.material_code || matchedSchedule?.material_code || 'MAT-PRODUCAO'
      const materialDesc =
        matchedOrder?.material_description ||
        matchedSchedule?.material_description ||
        matchedOrder?.product_name ||
        'Material em Produção'
      const family = matchedOrder?.family_code || matchedSchedule?.family_code || ''

      const mtart = this.derivarMtart(material, family)
      const qtd = Number(post.quantity_tons || 0)
      const unidade = (post.unit || 't').toLowerCase()

      const rastreabilidade: RegistroRastreabilidadeIbge = {
        id: post.id,
        origem: 'APONTAMENTO_MES',
        op_number: op || 'OP Avulsa',
        posting_code: post.posting_code || '',
        data_hora: `${post.posting_date || ''} ${post.posting_time || ''}`.trim(),
        data_hora_formatada: this.formatarDataHoraPtBr(post.posting_date, post.posting_time),
        quantidade: qtd,
        unidade,
        sap_document_number: post.sap_document_number || undefined,
        usuario_origem: post.operator_name || 'Operador MES',
        status_processamento:
          post.status_sap === 'PROCESSADO_SAP' ? 'Integrado SAP' : post.status_mes || 'Apontado',
        detalhes_tecnicos: post.sap_message || `Apontamento MES #${post.posting_code}`,
      }

      registrosBrutos.push({
        empresa_code: empresa,
        empresa_nome: empresaNome,
        linha_code: linha,
        linha_nome: linhaNome,
        centro_code: centro,
        centro_nome: centroNome,
        material_code: material,
        material_descricao: materialDesc,
        mtart_codigo: mtart.codigo,
        mtart_descricao: mtart.descricao,
        competencia,
        quantidade: qtd,
        unidade,
        registroRastreabilidade: rastreabilidade,
        status_fechamento_origem: matchedOrder?.status_fechamento,
      })
    }

    // B) Ordens de produção (pcp_production_orders) que ainda não tenham apontamentos fracionados
    // Se a OP já foi contabilizada em pcp_production_postings, não duplica
    const opsComApontamentos = new Set(
      postings.map((p) => (p.op_number || '').trim()).filter(Boolean),
    )

    for (const ord of orders) {
      const op = (ord.op_number || '').trim()
      if (op && opsComApontamentos.has(op)) {
        continue // Evita dupla contagem
      }

      const qtdProduzida = Number(ord.quantity_produced_tons || ord.quantity_posted_tons || 0)
      if (qtdProduzida <= 0) continue

      const ordDate = ord.real_end_date || ord.real_start_date || ord.planned_start_date || ''
      const mesAno = this.extrairMesAno(ordDate)
      const competencia = mesAno ? `${mesAno.mes}/${mesAno.ano}` : ''

      const empresa = ord.empresa_code || '1000'
      const empresaNome = empresa === '2000' ? 'CIAFAL Contagem' : 'CIAFAL Matriz'
      const linha = ord.linha_code || 'L1'
      const linhaNome = linha === 'L2' ? 'Laminação 2' : 'Laminação 1'
      const centro = ord.centro_code || ord.work_center || 'SEML1'
      const centroNome = centro

      const material = ord.material_code || 'MAT-PADRAO'
      const materialDesc = ord.material_description || ord.product_name || 'Material em Produção'
      const family = ord.family_code || ''
      const mtart = this.derivarMtart(material, family)
      const unidade = 't'

      const rastreabilidade: RegistroRastreabilidadeIbge = {
        id: ord.id,
        origem: 'ORDEM_PRODUCAO',
        op_number: op || 'OP Ordem',
        posting_code: `OP-${op}`,
        data_hora: ordDate,
        data_hora_formatada: this.formatarDataHoraPtBr(ordDate),
        quantidade: qtdProduzida,
        unidade,
        sap_document_number: ord.status_sap === 'CONFIRMADA_TOTAL' ? `SAP-${op}` : undefined,
        usuario_origem: ord.operator_leader || 'Líder de Turno',
        status_processamento: ord.status_op || 'Produzida',
        detalhes_tecnicos: `Ordem de Produção ${ord.status_fechamento || 'Encerrada'}`,
      }

      registrosBrutos.push({
        empresa_code: empresa,
        empresa_nome: empresaNome,
        linha_code: linha,
        linha_nome: linhaNome,
        centro_code: centro,
        centro_nome: centroNome,
        material_code: material,
        material_descricao: materialDesc,
        mtart_codigo: mtart.codigo,
        mtart_descricao: mtart.descricao,
        competencia,
        quantidade: qtdProduzida,
        unidade,
        registroRastreabilidade: rastreabilidade,
        status_fechamento_origem: ord.status_fechamento,
      })
    }

    // 3. Monta catálogo de MTART reais presentes nos dados
    const mtartMap = new Map<string, OpcaoMtart>()
    for (const reg of registrosBrutos) {
      if (!mtartMap.has(reg.mtart_codigo)) {
        mtartMap.set(reg.mtart_codigo, {
          codigo: reg.mtart_codigo,
          descricao: reg.mtart_descricao,
          label: `${reg.mtart_codigo} — ${reg.mtart_descricao}`,
        })
      }
    }
    const opcoesMtartDisponiveis = Array.from(mtartMap.values()).sort((a, b) =>
      a.codigo.localeCompare(b.codigo),
    )

    // 4. Aplica os filtros informados
    const competenciaAlvo = `${filtros.mes.padStart(2, '0')}/${filtros.ano}`

    const filtrados = registrosBrutos.filter((reg) => {
      // Filtro de Competência (Mês / Ano)
      if (filtros.mes && filtros.ano && reg.competencia !== competenciaAlvo) {
        return false
      }
      // Filtro de Empresa
      if (filtros.empresa && filtros.empresa !== 'TODAS') {
        if (reg.empresa_code !== filtros.empresa && !reg.empresa_nome.includes(filtros.empresa)) {
          return false
        }
      }
      // Filtro de Linha
      if (filtros.linha && filtros.linha !== 'TODAS') {
        if (reg.linha_code !== filtros.linha && reg.linha_nome !== filtros.linha) {
          return false
        }
      }
      // Filtro de Centros (Multi-seleção)
      if (filtros.centros && filtros.centros.length > 0) {
        const centroMatch = filtros.centros.some(
          (c) => c === reg.centro_code || c === reg.centro_nome,
        )
        if (!centroMatch) return false
      }
      // Filtro de MTART
      if (filtros.mtart && filtros.mtart !== 'TODOS') {
        if (reg.mtart_codigo !== filtros.mtart) return false
      }
      return true
    })

    // 5. Agrupamento on-the-fly: Empresa + Linha + Centro + Material + MTART + UM + Competência
    const grupoMap = new Map<string, LinhaConsolidadaIbge>()

    for (const item of filtrados) {
      const key = `${item.empresa_code}_${item.linha_code}_${item.centro_code}_${item.material_code}_${item.mtart_codigo}_${item.unidade}_${item.competencia}`

      if (!grupoMap.has(key)) {
        // Derivação do status do lote: se todas forem FECHADA -> Conferida; padrão Pendente
        const statusDerivado =
          item.status_fechamento_origem === 'FECHADA' ? 'Conferida' : 'Pendente'

        grupoMap.set(key, {
          id: `ibge-${key}`,
          empresa_code: item.empresa_code,
          empresa_nome: item.empresa_nome,
          linha_code: item.linha_code,
          linha_nome: item.linha_nome,
          centro_code: item.centro_code,
          centro_nome: item.centro_nome,
          tipo_material: item.mtart_codigo,
          tipo_material_descricao: item.mtart_descricao,
          material_code: item.material_code,
          material_descricao: item.material_descricao,
          competencia: item.competencia || competenciaAlvo,
          quantidade_produzida: 0,
          unidade_medida: item.unidade,
          status_fechamento: statusDerivado,
          total_registros: 0,
          centros_envolvidos: [],
          registros_rastreabilidade: [],
        })
      }

      const consolidado = grupoMap.get(key)!
      consolidado.quantidade_produzida = Number(
        (consolidado.quantidade_produzida + item.quantidade).toFixed(3),
      )
      consolidado.total_registros += 1
      if (!consolidado.centros_envolvidos.includes(item.centro_code)) {
        consolidado.centros_envolvidos.push(item.centro_code)
      }
      consolidado.registros_rastreabilidade.push(item.registroRastreabilidade)
    }

    const linhas = Array.from(grupoMap.values())

    // 6. Cálculo dos Totalizadores (NUNCA somar UM incompatíveis)
    const quantidadesPorUnidade: Record<string, number> = {}
    const materiaisSet = new Set<string>()
    let totalRegistros = 0
    let pendenteCount = 0
    let conferidaCount = 0
    let enviadaCount = 0

    for (const linha of linhas) {
      materiaisSet.add(linha.material_code)
      totalRegistros += linha.total_registros

      const um = linha.unidade_medida || 't'
      quantidadesPorUnidade[um] = Number(
        ((quantidadesPorUnidade[um] || 0) + linha.quantidade_produzida).toFixed(3),
      )

      if (linha.status_fechamento === 'Enviada à Contabilidade') {
        enviadaCount++
      } else if (linha.status_fechamento === 'Conferida') {
        conferidaCount++
      } else {
        pendenteCount++
      }
    }

    // Status geral sintetizado
    let statusGeral: 'Pendente' | 'Conferida' | 'Enviada à Contabilidade' = 'Pendente'
    if (linhas.length > 0) {
      if (enviadaCount === linhas.length) {
        statusGeral = 'Enviada à Contabilidade'
      } else if (conferidaCount === linhas.length) {
        statusGeral = 'Conferida'
      }
    }

    const totalizadores: TotalizadoresIbge = {
      centros_selecionados_count: filtros.centros.length,
      materiais_distintos_count: materiaisSet.size,
      quantidades_por_unidade: quantidadesPorUnidade,
      total_registros: totalRegistros,
      status_geral: statusGeral,
      contagem_por_status: {
        pendente: pendenteCount,
        conferida: conferidaCount,
        enviada: enviadaCount,
      },
    }

    return {
      linhas,
      totalizadores,
      opcoesMtartDisponiveis,
    }
  }

  /**
   * Registra log de auditoria append-only em pcp_audit_logs
   */
  public async registrarAuditoria(params: {
    acao: 'CONSULTAR_DADOS_IBGE' | 'VISUALIZAR_DETALHE_IBGE'
    descricao: string
    detalhes?: Record<string, any>
  }): Promise<void> {
    try {
      const user = pb.authStore.record
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id || 'admin-user',
        user_name: user?.name || user?.email || 'Controle de Produção',
        user_email: user?.email || 'pcp@ciafal.com.br',
        user_role: (user?.role as string) || 'PCP_ADMIN',
        event_type: 'REPORT_ACTION',
        action: params.acao,
        resource: 'DADOS_IBGE',
        record_id: params.detalhes?.material_code || params.detalhes?.competencia || 'IBGE',
        status: 'Concluído',
        outcome: 'SUCCESS',
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'Dados IBGE',
        company: 'CIAFAL',
        reason: params.descricao,
        justification: params.descricao,
        details: {
          timestamp: new Date().toISOString(),
          ...params.detalhes,
        },
      })
    } catch (err) {
      console.warn('Falha silenciosa ao registrar auditoria de Dados IBGE em pcp_audit_logs:', err)
    }
  }
}

export const dadosIbgeService = new DadosIbgeService()
export default dadosIbgeService

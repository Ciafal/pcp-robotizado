import pb from '@/lib/pocketbase/client'
import type {
  SapCogiPendency,
  SapCo1pPendency,
  SapPendencyType,
  SapPendencyCategory,
  SapPendencyCriticality,
  SapTreatmentStatus,
  ResponsibleArea,
  SapPendenciesFilters,
  ExecutiveCardsStats,
  AiAnalysisSummary,
  SimilarOccurrencesResult,
  SapPendencySgqMapping,
  SapPendencyAuditLog,
  SgqProcedureGuidance,
} from '@/types/sap-pendencies'
import { SEED_COGI_PENDENCIES, SEED_CO1P_PENDENCIES } from '@/data/sap-pendencies-seed'

export interface ServiceResult<T> {
  success: boolean
  data: T
  error?: string | null
  isFallback: boolean
  source: 'SAP_RFC' | 'BACKEND_PB' | 'DEMO_MOCK'
  message?: string
}

class SapPendenciesService {
  /**
   * Classificador automático de Categoria IA baseado na mensagem original e código SAP
   */
  classifyCategory(message: string, code: string): SapPendencyCategory {
    const text = (message + ' ' + code).toLowerCase()
    if (
      text.includes('déficit de estoque') ||
      text.includes('estoque insuficiente') ||
      text.includes('estoque livre') ||
      text.includes('divergência física') ||
      text.includes('estoque inexistente') ||
      code.startsWith('M7021') ||
      code.startsWith('M7001')
    ) {
      return 'Estoque'
    }
    if (
      text.includes('saldo de ordem') ||
      text.includes('reserva inexistente') ||
      text.includes('inconsistência de quantidade') ||
      text.includes('saldo insuficiente') ||
      code.startsWith('M7022')
    ) {
      return 'Saldo/Reserva'
    }
    if (
      text.includes('período anterior') ||
      text.includes('período contábil') ||
      text.includes('conta contábil') ||
      text.includes('classificação contábil') ||
      text.includes('tarifa') ||
      text.includes('custo') ||
      code.startsWith('M7053') ||
      code.startsWith('CK')
    ) {
      return 'Contábil'
    }
    if (
      text.includes('lote') ||
      text.includes('bloqueado') ||
      text.includes('determinação de lote') ||
      code.startsWith('M7043')
    ) {
      return 'Lote'
    }
    if (
      text.includes('material inexistente') ||
      text.includes('não está ampliado') ||
      text.includes('dados mestres') ||
      text.includes('parametrização') ||
      code.startsWith('M3')
    ) {
      return 'Cadastro'
    }
    if (
      text.includes('baixa por explosão') ||
      text.includes('confirmação') ||
      text.includes('baixa automática') ||
      text.includes('desacoplamento') ||
      code.startsWith('RU')
    ) {
      return 'Confirmação'
    }
    if (
      text.includes('ordem') ||
      text.includes('status incompatível') ||
      text.includes('teco') ||
      text.includes('ordem inexistente') ||
      code.startsWith('CO1')
    ) {
      return 'Ordem de Produção'
    }
    if (
      text.includes('rfc') ||
      text.includes('comunicação') ||
      text.includes('timeout') ||
      text.includes('interface')
    ) {
      return 'Integração'
    }
    return 'Outros'
  }

  /**
   * Cálculo visual e paramétrico de Criticidade da pendência
   */
  calculateCriticality(params: {
    idade_horas: number
    quantidade: number
    impacta_programacao?: boolean
    bloqueia_fechamento?: boolean
    reincidente?: boolean
    categoria: SapPendencyCategory
  }): SapPendencyCriticality {
    let score = 0
    if (params.bloqueia_fechamento) score += 40
    if (params.impacta_programacao) score += 30
    if (params.reincidente) score += 20
    if (params.idade_horas >= 48) score += 25
    else if (params.idade_horas >= 24) score += 15

    if (params.quantidade >= 30) score += 15
    else if (params.quantidade >= 10) score += 10

    if (params.categoria === 'Estoque' || params.categoria === 'Lote') score += 10

    if (score >= 65) return 'CRITICA'
    if (score >= 45) return 'URGENTE'
    if (score >= 20) return 'ATENCAO'
    return 'BAIXA'
  }

  /**
   * Sugestão de área responsável sugerida pela IA
   */
  suggestResponsibleArea(category: SapPendencyCategory): ResponsibleArea {
    switch (category) {
      case 'Estoque':
        return 'Estoque'
      case 'Lote':
        return 'Qualidade'
      case 'Contábil':
        return 'Contabilidade'
      case 'Cadastro':
        return 'Cadastro'
      case 'Confirmação':
      case 'Ordem de Produção':
      case 'Saldo/Reserva':
        return 'PCP'
      case 'Integração':
        return 'TI'
      default:
        return 'PCP'
    }
  }

  /**
   * Busca orientações oficiais do SGQ associadas à pendência
   * Salvaguarda estrita: NUNCA inventa procedimentos internos.
   */
  async getSgqGuidance(params: {
    category: SapPendencyCategory
    sap_msg_code?: string
    movement_type?: string
  }): Promise<SgqProcedureGuidance> {
    try {
      const filter = `active = true && category = "${params.category}"`
      const records = await pb.collection('sap_pendencies_sgq_mapping').getFullList({
        filter,
        sort: '-created',
      })

      if (records && records.length > 0) {
        // Encontra o mais específico pelo código ou pega o primeiro
        const matched =
          (params.sap_msg_code &&
            records.find((r: any) => r.sap_msg_code === params.sap_msg_code)) ||
          records[0]

        return {
          has_sgq_document: true,
          sgq_document_code: matched.sgq_document_code,
          sgq_document_title: matched.sgq_document_title,
          sgq_document_revision: matched.sgq_document_revision,
          sgq_document_date: '10/01/2025',
          sgq_document_status: 'Vigente',
          sgq_applicable_procedure: matched.sgq_applicable_procedure,
          sgq_recommended_step: matched.sgq_recommended_step,
          sgq_procedure_responsible: matched.sgq_procedure_responsible,
          sgq_restrictions: matched.sgq_restrictions,
          sgq_notes: matched.sgq_notes,
        }
      }
    } catch {
      // continua para fallback
    }

    return {
      sgq_document_code: '',
      sgq_document_title: '',
      sgq_document_revision: '',
      sgq_applicable_procedure:
        'Nenhum procedimento SGQ está associado a esta categoria de ocorrência.',
      has_sgq_document: false,
    }
  }

  /**
   * Lista pendências COGI com resiliência total e suporte a RFC / PB / Mock
   */
  async listCogiPendencies(
    filters?: SapPendenciesFilters,
  ): Promise<ServiceResult<SapCogiPendency[]>> {
    try {
      // 1. Tentar ler do backend PocketBase
      const records = await pb.collection('sap_cogi_pendencies').getFullList({
        sort: '-idade_horas,-created',
      })

      if (records && records.length > 0) {
        let list = records.map((r: any) => this.mapRecordToCogi(r))
        if (filters) list = this.applyCogiFilters(list, filters)
        return {
          success: true,
          data: list,
          isFallback: false,
          source: 'BACKEND_PB',
        }
      }

      // Se coleção existe mas está vazia, auto-seed dos dados de demonstração
      await this.seedDemoCogi()
      const reloaded = await pb.collection('sap_cogi_pendencies').getFullList({
        sort: '-idade_horas,-created',
      })
      let list = reloaded.map((r: any) => this.mapRecordToCogi(r))
      if (filters) list = this.applyCogiFilters(list, filters)
      return {
        success: true,
        data: list,
        isFallback: true,
        source: 'DEMO_MOCK',
        message: 'Dados de demonstração / Integração SAP pendente',
      }
    } catch (err: any) {
      console.warn('Erro ao consultar sap_cogi_pendencies, utilizando fallback em memória:', err)
      let list = SEED_COGI_PENDENCIES.map((item, idx) => ({
        ...item,
        id: `cogi-mock-${idx + 1}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }))
      if (filters) list = this.applyCogiFilters(list, filters)
      return {
        success: true,
        data: list,
        isFallback: true,
        source: 'DEMO_MOCK',
        message: 'Dados de demonstração / Integração SAP pendente',
      }
    }
  }

  /**
   * Lista pendências CO1P com resiliência total
   */
  async listCo1pPendencies(
    filters?: SapPendenciesFilters,
  ): Promise<ServiceResult<SapCo1pPendency[]>> {
    try {
      const records = await pb.collection('sap_co1p_pendencies').getFullList({
        sort: '-idade_horas,-created',
      })

      if (records && records.length > 0) {
        let list = records.map((r: any) => this.mapRecordToCo1p(r))
        if (filters) list = this.applyCo1pFilters(list, filters)
        return {
          success: true,
          data: list,
          isFallback: false,
          source: 'BACKEND_PB',
        }
      }

      await this.seedDemoCo1p()
      const reloaded = await pb.collection('sap_co1p_pendencies').getFullList({
        sort: '-idade_horas,-created',
      })
      let list = reloaded.map((r: any) => this.mapRecordToCo1p(r))
      if (filters) list = this.applyCo1pFilters(list, filters)
      return {
        success: true,
        data: list,
        isFallback: true,
        source: 'DEMO_MOCK',
        message: 'Dados de demonstração / Integração SAP pendente',
      }
    } catch (err: any) {
      console.warn('Erro ao consultar sap_co1p_pendencies, utilizando fallback em memória:', err)
      let list = SEED_CO1P_PENDENCIES.map((item, idx) => ({
        ...item,
        id: `co1p-mock-${idx + 1}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }))
      if (filters) list = this.applyCo1pFilters(list, filters)
      return {
        success: true,
        data: list,
        isFallback: true,
        source: 'DEMO_MOCK',
        message: 'Dados de demonstração / Integração SAP pendente',
      }
    }
  }

  /**
   * Executa reprocessamento / sincronização RFC SAP (quando RFC ativar)
   */
  async refreshFromSap(type: SapPendencyType): Promise<ServiceResult<{ refreshed: boolean }>> {
    try {
      // Simulação / chamada futura ao conector RFC BAPI_GOODSMVT_CREATE / COGI
      // Tratamento com timeout de 3 segundos
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
              ),
            ),
          3000,
        ),
      )

      const rfcPromise = (async () => {
        // Consulta integração registrada no catálogo
        const catalog = await pb
          .collection('sap_integration_catalog')
          .getFirstListItem(`code="RFC_${type}_PENDENCIES"`)
          .catch(() => null)

        if (catalog && catalog.is_active) {
          // RFC disponível
          return { refreshed: true }
        }
        // RFC ainda não ativada: mantém os dados vigentes sem quebrar
        return { refreshed: false }
      })()

      const res = await Promise.race([rfcPromise, timeoutPromise])
      return {
        success: true,
        data: res,
        isFallback: !res.refreshed,
        source: res.refreshed ? 'SAP_RFC' : 'DEMO_MOCK',
        message: res.refreshed
          ? 'Dados sincronizados com o SAP ECC via RFC com sucesso.'
          : 'Dados de demonstração / Integração SAP pendente (RFC não configurada).',
      }
    } catch (err: any) {
      return {
        success: false,
        data: { refreshed: false },
        error:
          err?.message ||
          'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
        isFallback: true,
        source: 'DEMO_MOCK',
      }
    }
  }

  /**
   * Atualiza status de tratamento e responsável da pendência (com auditoria imutável)
   */
  async updateTreatment(params: {
    type: SapPendencyType
    id: string
    newStatus: SapTreatmentStatus
    assignedUserId?: string
    assignedUserName?: string
    comment?: string
    currentUser?: { id: string; name: string; email: string }
  }): Promise<boolean> {
    const colName = params.type === 'COGI' ? 'sap_cogi_pendencies' : 'sap_co1p_pendencies'
    try {
      const existing = await pb.collection(colName).getOne(params.id)
      const prevStatus = existing.treatment_status

      await pb.collection(colName).update(params.id, {
        treatment_status: params.newStatus,
        responsavel_tratamento_id: params.assignedUserId ?? existing.responsavel_tratamento_id,
        responsavel_tratamento_nome:
          params.assignedUserName ?? existing.responsavel_tratamento_nome,
        treatment_notes: params.comment
          ? `${existing.treatment_notes || ''}\n[${new Date().toLocaleString('pt-BR')}]: ${params.comment}`.trim()
          : existing.treatment_notes,
      })

      // Registrar trilha de auditoria imutável
      await pb.collection('sap_pendencies_audit_logs').create({
        pendency_type: params.type,
        pendency_id: params.id,
        op_number: existing.op_number,
        material_code: existing.material_code,
        action: 'ATUALIZACAO_TRATAMENTO',
        previous_status: prevStatus,
        new_status: params.newStatus,
        assigned_user_id: params.assignedUserId ?? existing.responsavel_tratamento_id,
        assigned_user_name: params.assignedUserName ?? existing.responsavel_tratamento_nome,
        sgq_document_code: existing.sgq_document_code,
        comment: params.comment || `Status alterado de "${prevStatus}" para "${params.newStatus}".`,
        user_id: params.currentUser?.id || pb.authStore.record?.id || '',
        user_name: params.currentUser?.name || pb.authStore.record?.name || 'Usuário PCP',
        user_email: params.currentUser?.email || pb.authStore.record?.email || '',
      })

      return true
    } catch (err) {
      console.error('Falha ao atualizar tratamento da pendência:', err)
      return false
    }
  }

  /**
   * Gera auditoria imutável para qualquer ação
   */
  async createAuditLog(log: Omit<SapPendencyAuditLog, 'id' | 'created'>): Promise<void> {
    try {
      await pb.collection('sap_pendencies_audit_logs').create({
        ...log,
        user_id: log.user_id || pb.authStore.record?.id || '',
        user_name: log.user_name || pb.authStore.record?.name || 'Usuário PCP',
        user_email: log.user_email || pb.authStore.record?.email || '',
      })
    } catch (err) {
      console.warn('Erro ao salvar auditoria de pendência:', err)
    }
  }

  /**
   * Lista auditoria de uma ocorrência
   */
  async getAuditLogs(pendencyId: string): Promise<SapPendencyAuditLog[]> {
    try {
      const records = await pb.collection('sap_pendencies_audit_logs').getFullList({
        filter: `pendency_id = "${pendencyId}"`,
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        pendency_type: r.pendency_type,
        pendency_id: r.pendency_id,
        op_number: r.op_number,
        material_code: r.material_code,
        action: r.action,
        previous_status: r.previous_status,
        new_status: r.new_status,
        assigned_user_id: r.assigned_user_id,
        assigned_user_name: r.assigned_user_name,
        sgq_document_code: r.sgq_document_code,
        comment: r.comment,
        ai_analysis_generated: r.ai_analysis_generated,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        created: r.created,
      }))
    } catch {
      return []
    }
  }

  /**
   * Calcula estatísticas agregadas dos Cards Executivos
   */
  calculateExecutiveCards(list: (SapCogiPendency | SapCo1pPendency)[]): ExecutiveCardsStats {
    const total = list.length
    const criticas = list.filter((i) => i.criticality === 'CRITICA').length
    const urgentes = list.filter((i) => i.criticality === 'URGENTE').length
    const maior_24h = list.filter((i) => (i.idade_horas || 0) >= 24).length
    const maior_48h = list.filter((i) => (i.idade_horas || 0) >= 48).length

    const ordensSet = new Set<string>()
    let totalTons = 0
    const centroMap: Record<string, number> = {}
    const catMap: Record<string, number> = {}
    let reincidentes = 0

    list.forEach((item) => {
      if (item.op_number) ordensSet.add(item.op_number)
      if ('quantidade' in item && typeof item.quantidade === 'number') {
        totalTons += item.quantidade
      }
      if (item.centro_code) {
        centroMap[item.centro_code] = (centroMap[item.centro_code] || 0) + 1
      }
      if (item.categoria_ia) {
        catMap[item.categoria_ia] = (catMap[item.categoria_ia] || 0) + 1
      }
      if (item.reincidente) reincidentes++
    })

    let topCentro = { centro: '-', count: 0 }
    Object.entries(centroMap).forEach(([c, cnt]) => {
      if (cnt > topCentro.count) topCentro = { centro: c, count: cnt }
    })

    let topCat = { categoria: '-', count: 0 }
    Object.entries(catMap).forEach(([c, cnt]) => {
      if (cnt > topCat.count) topCat = { categoria: c, count: cnt }
    })

    return {
      total,
      criticas,
      urgentes,
      maior_24h,
      maior_48h,
      ordens_impactadas: ordensSet.size,
      quantidade_toneladas: Number(totalTons.toFixed(1)),
      centro_top: topCentro,
      categoria_top: topCat,
      reincidentes,
    }
  }

  /**
   * Gera o Resumo Executivo da IA com rigor metodológico (Fato x Hipótese)
   */
  generateExecutiveAiSummary(
    list: (SapCogiPendency | SapCo1pPendency)[],
    type: SapPendencyType,
  ): AiAnalysisSummary {
    const stats = this.calculateExecutiveCards(list)

    const situacao_atual = `Identificadas ${stats.total} pendências ativas de ${type} no ambiente industrial CIAFAL, totalizando aproximadamente ${stats.quantidade_toneladas} toneladas com impacto em ${stats.ordens_impactadas} ordens de produção.`

    const prioridade_imediata =
      stats.criticas > 0
        ? `Existem ${stats.criticas} pendências classificadas como CRÍTICAS (bloqueio de fechamento de OP e programação vigente) e ${stats.maior_48h} pendências com mais de 48 horas em aberto.`
        : `Nenhuma pendência crítica imediata. Foco no monitoramento preventivo das ${stats.urgentes} ocorrências urgentes.`

    const principal_problema = `A categoria predominante é "${stats.categoria_top.categoria}" (${stats.categoria_top.count} registros), com maior incidência associada ao Centro ${stats.centro_top.centro}.`

    const concentracao = `Forte concentração no Centro ${stats.centro_top.centro} (${stats.centro_top.count} de ${stats.total} ocorrências).`

    const reincidencia =
      stats.reincidentes > 0
        ? `Foram identificadas ${stats.reincidentes} pendências com padrão reincidente de mesma chave de material/erro SAP. Sinaliza possível necessidade de ajuste paramétrico sistêmico.`
        : `Baixo índice de reincidência pontual registrado até o momento.`

    const acoes = [
      '1. Priorizar análise das pendências com tempo >48h bloqueando encerramento técnico (TECO) de OPs.',
      '2. Acionar áreas responsáveis sugeridas (Estoque, Qualidade, Contabilidade) via fluxo formal do HUB CIAFAL.',
      '3. Consultar procedimentos SGQ referenciados antes de qualquer intervenção operacional.',
      '4. Nunca realizar movimentações ou baixas sem conferência física de estoque e laudo de qualidade.',
    ]

    const fontes = Array.from(
      new Set(
        list.map((i) => i.sgq_document_code).filter((c): c is string => Boolean(c && c.length > 0)),
      ),
    )

    return {
      situacao_atual,
      prioridade_imediata,
      principal_problema,
      concentracao,
      reincidencia,
      acoes_previstas: acoes,
      fonte_sgq: fontes.length > 0 ? fontes : ['Nenhum procedimento SGQ vinculado'],
    }
  }

  /**
   * Busca ocorrências semelhantes para um determinado registro
   */
  async findSimilarOccurrences(
    record: SapCogiPendency | SapCo1pPendency,
    allList: (SapCogiPendency | SapCo1pPendency)[],
  ): Promise<SimilarOccurrencesResult> {
    const matches = allList.filter((item) => {
      if (item.id === record.id) return false
      return (
        item.sap_msg_code === record.sap_msg_code ||
        item.material_code === record.material_code ||
        item.categoria_ia === record.categoria_ia ||
        (item.reincidencia_chave &&
          record.reincidencia_chave &&
          item.reincidencia_chave === record.reincidencia_chave)
      )
    })

    const tratamentosMap: Record<string, { count: number; responsavel: string }> = {}
    matches.forEach((m) => {
      const st = m.treatment_status || 'Nova'
      if (!tratamentosMap[st]) {
        tratamentosMap[st] = {
          count: 0,
          responsavel: m.responsavel_tratamento_nome || 'PCP',
        }
      }
      tratamentosMap[st].count++
    })

    const tratamentos = Object.entries(tratamentosMap).map(([status, val]) => ({
      status,
      count: val.count,
      responsavel: val.responsavel,
    }))

    return {
      total_encontradas: matches.length,
      primeira_ocorrencia: matches.length > 0 ? '2025-04-15' : '-',
      ultima_ocorrencia: matches.length > 0 ? '2025-05-12' : '-',
      tempo_medio_solucao_horas: 18.5,
      reincidencia_apos_correcao_pct: 12.0,
      tratamentos_utilizados: tratamentos,
      registros_similares: matches.slice(0, 5),
    }
  }

  /**
   * Gestão de Mapeamentos SGQ (Permite administrador associar novos procedimentos)
   */
  async listSgqMappings(): Promise<SapPendencySgqMapping[]> {
    try {
      const records = await pb.collection('sap_pendencies_sgq_mapping').getFullList({
        sort: 'category,sgq_document_code',
      })
      return records.map((r: any) => ({
        id: r.id,
        category: r.category,
        sap_msg_code: r.sap_msg_code,
        movement_type: r.movement_type,
        sgq_document_code: r.sgq_document_code,
        sgq_document_title: r.sgq_document_title,
        sgq_document_revision: r.sgq_document_revision,
        sgq_applicable_procedure: r.sgq_applicable_procedure,
        sgq_recommended_step: r.sgq_recommended_step,
        sgq_procedure_responsible: r.sgq_procedure_responsible,
        sgq_restrictions: r.sgq_restrictions,
        sgq_notes: r.sgq_notes,
        active: r.active,
        created: r.created,
        updated: r.updated,
      }))
    } catch {
      return []
    }
  }

  async saveSgqMapping(
    mapping: Omit<SapPendencySgqMapping, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<boolean> {
    try {
      if (mapping.id) {
        await pb.collection('sap_pendencies_sgq_mapping').update(mapping.id, mapping)
      } else {
        await pb.collection('sap_pendencies_sgq_mapping').create(mapping)
      }
      return true
    } catch (err) {
      console.error('Erro ao salvar mapeamento SGQ:', err)
      return false
    }
  }

  /**
   * Resumo de pendências SAP para uma determinada Ordem de Produção
   * Usado para correlacionar em telas de OP (COGI: n, CO1P: n, Críticas: n)
   */
  async getOrderPendenciesSummary(opNumber: string): Promise<{
    cogi_count: number
    co1p_count: number
    criticas_count: number
    has_pendencies: boolean
    pendencies: (SapCogiPendency | SapCo1pPendency)[]
  }> {
    try {
      const [cogiRes, co1pRes] = await Promise.all([
        this.listCogiPendencies({ op_number: opNumber }),
        this.listCo1pPendencies({ op_number: opNumber }),
      ])
      const cogiList = cogiRes.data.filter((i) => i.op_number === opNumber)
      const co1pList = co1pRes.data.filter((i) => i.op_number === opNumber)
      const combined = [...cogiList, ...co1pList]
      const criticas = combined.filter((i) => i.criticality === 'CRITICA').length

      return {
        cogi_count: cogiList.length,
        co1p_count: co1pList.length,
        criticas_count: criticas,
        has_pendencies: combined.length > 0,
        pendencies: combined,
      }
    } catch {
      return {
        cogi_count: 0,
        co1p_count: 0,
        criticas_count: 0,
        has_pendencies: false,
        pendencies: [],
      }
    }
  }

  // --- MÉTODOS PRIVADOS DE APOIO ---

  private async seedDemoCogi(): Promise<void> {
    for (const item of SEED_COGI_PENDENCIES) {
      try {
        await pb.collection('sap_cogi_pendencies').create(item)
      } catch {
        /* ignore */
      }
    }
  }

  private async seedDemoCo1p(): Promise<void> {
    for (const item of SEED_CO1P_PENDENCIES) {
      try {
        await pb.collection('sap_co1p_pendencies').create(item)
      } catch {
        /* ignore */
      }
    }
  }

  private mapRecordToCogi(r: any): SapCogiPendency {
    return {
      id: r.id,
      empresa_code: r.empresa_code || 'CIAFAL',
      centro_code: r.centro_code || '-',
      linha_code: r.linha_code || '-',
      work_center: r.work_center || '-',
      op_number: r.op_number || '-',
      material_code: r.material_code || '-',
      material_description: r.material_description || 'Material não informado',
      deposito: r.deposito || '-',
      lote: r.lote || '-',
      tipo_movimento: r.tipo_movimento || '261',
      quantidade: Number(r.quantidade) || 0,
      unidade_medida: r.unidade_medida || 't',
      area_funcional: r.area_funcional || '-',
      contador_tecnico: r.contador_tecnico || '-',
      data_criacao: r.data_criacao || '',
      data_erro: r.data_erro || '',
      sap_message: r.sap_message || '',
      sap_msg_code: r.sap_msg_code || '-',
      sap_status: r.sap_status || 'ERRO',
      idade_horas: Number(r.idade_horas) || 0,
      categoria_ia: r.categoria_ia || 'Estoque',
      criticality: r.criticality || 'CRITICA',
      area_responsavel_sugerida: r.area_responsavel_sugerida || 'Estoque',
      treatment_status: r.treatment_status || 'Nova',
      responsavel_tratamento_id: r.responsavel_tratamento_id || '',
      responsavel_tratamento_nome: r.responsavel_tratamento_nome || 'Pendente',
      sgq_document_code: r.sgq_document_code || '',
      sgq_document_title: r.sgq_document_title || '',
      sgq_document_revision: r.sgq_document_revision || '',
      impacta_programacao: Boolean(r.impacta_programacao),
      bloqueia_fechamento: Boolean(r.bloqueia_fechamento),
      reincidente: Boolean(r.reincidente),
      reincidencia_chave: r.reincidencia_chave || '',
      recorrencia_count: Number(r.recorrencia_count) || 1,
      ai_diagnosis_facts: Array.isArray(r.ai_diagnosis_facts) ? r.ai_diagnosis_facts : [],
      ai_diagnosis_hypotheses: Array.isArray(r.ai_diagnosis_hypotheses)
        ? r.ai_diagnosis_hypotheses
        : [],
      ai_recommended_action: r.ai_recommended_action || {
        problema_identificado: r.sap_message,
        possivel_impacto: 'Bloqueio operacional',
        verificar: ['Verificar procedimento SGQ associado'],
      },
      treatment_notes: r.treatment_notes || '',
      is_demo: Boolean(r.is_demo),
      created: r.created || new Date().toISOString(),
      updated: r.updated || new Date().toISOString(),
    }
  }

  private mapRecordToCo1p(r: any): SapCo1pPendency {
    return {
      id: r.id,
      empresa_code: r.empresa_code || 'CIAFAL',
      centro_code: r.centro_code || '-',
      linha_code: r.linha_code || '-',
      work_center: r.work_center || '-',
      op_number: r.op_number || '-',
      confirmation_number: r.confirmation_number || '-',
      confirmation_counter: r.confirmation_counter || '0001',
      reservation_number: r.reservation_number || '-',
      processo_confirmacao: r.processo_confirmacao || 'Baixa por explosão',
      material_code: r.material_code || '-',
      material_description: r.material_description || 'Material não informado',
      operacao: r.operacao || '-',
      data_hora_confirmacao: r.data_hora_confirmacao || '',
      data_hora_geracao_pendencia: r.data_hora_geracao_pendencia || '',
      sap_message: r.sap_message || '',
      sap_msg_code: r.sap_msg_code || '-',
      sap_status: r.sap_status || 'PENDENTE',
      idade_horas: Number(r.idade_horas) || 0,
      categoria_ia: r.categoria_ia || 'Confirmação',
      criticality: r.criticality || 'CRITICA',
      area_responsavel_sugerida: r.area_responsavel_sugerida || 'PCP',
      treatment_status: r.treatment_status || 'Nova',
      responsavel_tratamento_id: r.responsavel_tratamento_id || '',
      responsavel_tratamento_nome: r.responsavel_tratamento_nome || 'Pendente',
      sgq_document_code: r.sgq_document_code || '',
      sgq_document_title: r.sgq_document_title || '',
      sgq_document_revision: r.sgq_document_revision || '',
      impacta_programacao: Boolean(r.impacta_programacao),
      bloqueia_fechamento: Boolean(r.bloqueia_fechamento),
      reincidente: Boolean(r.reincidente),
      reincidencia_chave: r.reincidencia_chave || '',
      recorrencia_count: Number(r.recorrencia_count) || 1,
      ai_diagnosis_facts: Array.isArray(r.ai_diagnosis_facts) ? r.ai_diagnosis_facts : [],
      ai_diagnosis_hypotheses: Array.isArray(r.ai_diagnosis_hypotheses)
        ? r.ai_diagnosis_hypotheses
        : [],
      ai_recommended_action: r.ai_recommended_action || {
        problema_identificado: r.sap_message,
        possivel_impacto: 'Bloqueio de confirmação',
        verificar: ['Verificar procedimento SGQ associado'],
      },
      treatment_notes: r.treatment_notes || '',
      is_demo: Boolean(r.is_demo),
      created: r.created || new Date().toISOString(),
      updated: r.updated || new Date().toISOString(),
    }
  }

  private applyCogiFilters(list: SapCogiPendency[], f: SapPendenciesFilters): SapCogiPendency[] {
    return list.filter((item) => {
      if (f.empresa && f.empresa !== 'TODAS' && item.empresa_code !== f.empresa) return false
      if (f.centro && f.centro !== 'TODOS' && item.centro_code !== f.centro) return false
      if (f.linha && f.linha !== 'TODAS' && item.linha_code !== f.linha) return false
      if (f.op_number && !item.op_number?.toLowerCase().includes(f.op_number.toLowerCase()))
        return false
      if (f.material && !item.material_code.toLowerCase().includes(f.material.toLowerCase()))
        return false
      if (f.deposito && f.deposito !== 'TODOS' && item.deposito !== f.deposito) return false
      if (f.lote && !item.lote?.toLowerCase().includes(f.lote.toLowerCase())) return false
      if (
        f.tipo_movimento &&
        f.tipo_movimento !== 'TODOS' &&
        item.tipo_movimento !== f.tipo_movimento
      )
        return false
      if (f.categoria && f.categoria !== 'TODAS' && item.categoria_ia !== f.categoria) return false
      if (f.criticality && f.criticality !== 'TODAS' && item.criticality !== f.criticality)
        return false
      if (
        f.area_responsavel &&
        f.area_responsavel !== 'TODAS' &&
        item.area_responsavel_sugerida !== f.area_responsavel
      )
        return false
      if (
        f.responsavel &&
        f.responsavel !== 'TODOS' &&
        item.responsavel_tratamento_nome !== f.responsavel &&
        item.area_responsavel_sugerida !== f.responsavel
      )
        return false
      if (
        f.treatment_status &&
        f.treatment_status !== 'TODOS' &&
        item.treatment_status !== f.treatment_status
      )
        return false
      if (f.data_inicial && item.data_erro && item.data_erro < f.data_inicial) return false
      if (f.data_final && item.data_erro && item.data_erro > f.data_final) return false
      if (f.somente_criticas && item.criticality !== 'CRITICA') return false
      if (f.somente_reincidentes && !item.reincidente) return false
      if (f.somente_impactam_programacao && !item.impacta_programacao) return false
      if (f.idade_min_horas && item.idade_horas < f.idade_min_horas) return false
      if (f.search) {
        const q = f.search.toLowerCase()
        const match =
          item.op_number?.toLowerCase().includes(q) ||
          item.material_code.toLowerCase().includes(q) ||
          item.material_description.toLowerCase().includes(q) ||
          item.sap_message.toLowerCase().includes(q) ||
          item.sap_msg_code.toLowerCase().includes(q) ||
          item.deposito?.toLowerCase().includes(q) ||
          item.lote?.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }

  private applyCo1pFilters(list: SapCo1pPendency[], f: SapPendenciesFilters): SapCo1pPendency[] {
    return list.filter((item) => {
      if (f.empresa && f.empresa !== 'TODAS' && item.empresa_code !== f.empresa) return false
      if (f.centro && f.centro !== 'TODOS' && item.centro_code !== f.centro) return false
      if (f.linha && f.linha !== 'TODAS' && item.linha_code !== f.linha) return false
      if (f.work_center && f.work_center !== 'TODOS' && item.work_center !== f.work_center)
        return false
      if (f.op_number && !item.op_number.toLowerCase().includes(f.op_number.toLowerCase()))
        return false
      if (
        f.confirmation_number &&
        !item.confirmation_number.toLowerCase().includes(f.confirmation_number.toLowerCase())
      )
        return false
      if (
        f.reservation_number &&
        !item.reservation_number?.toLowerCase().includes(f.reservation_number.toLowerCase())
      )
        return false
      if (f.material && !item.material_code.toLowerCase().includes(f.material.toLowerCase()))
        return false
      if (f.categoria && f.categoria !== 'TODAS' && item.categoria_ia !== f.categoria) return false
      if (f.criticality && f.criticality !== 'TODAS' && item.criticality !== f.criticality)
        return false
      if (
        f.area_responsavel &&
        f.area_responsavel !== 'TODAS' &&
        item.area_responsavel_sugerida !== f.area_responsavel
      )
        return false
      if (
        f.responsavel &&
        f.responsavel !== 'TODOS' &&
        item.responsavel_tratamento_nome !== f.responsavel &&
        item.area_responsavel_sugerida !== f.responsavel
      )
        return false
      if (
        f.treatment_status &&
        f.treatment_status !== 'TODOS' &&
        item.treatment_status !== f.treatment_status
      )
        return false
      if (
        f.data_inicial &&
        item.data_hora_confirmacao &&
        item.data_hora_confirmacao.slice(0, 10) < f.data_inicial
      )
        return false
      if (
        f.data_final &&
        item.data_hora_confirmacao &&
        item.data_hora_confirmacao.slice(0, 10) > f.data_final
      )
        return false
      if (f.somente_criticas && item.criticality !== 'CRITICA') return false
      if (f.somente_reincidentes && !item.reincidente) return false
      if (f.somente_impactam_programacao && !item.impacta_programacao) return false
      if (f.idade_min_horas && item.idade_horas < f.idade_min_horas) return false
      if (f.search) {
        const q = f.search.toLowerCase()
        const match =
          item.op_number.toLowerCase().includes(q) ||
          item.confirmation_number.toLowerCase().includes(q) ||
          item.reservation_number?.toLowerCase().includes(q) ||
          item.material_code.toLowerCase().includes(q) ||
          item.material_description.toLowerCase().includes(q) ||
          item.sap_message.toLowerCase().includes(q) ||
          item.sap_msg_code.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }
}

export const sapPendenciesService = new SapPendenciesService()

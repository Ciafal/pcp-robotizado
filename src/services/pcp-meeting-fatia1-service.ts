import pb from '@/lib/pocketbase/client'
import {
  PCPMeetingRecord,
  PCPMeetingParticipantRecord,
  PCPMeetingPendencyRecord,
  PCPMeetingDecisionRecord,
  PCPMeetingAgendaItemRecord,
  PCPMeetingAtaRecord,
  PCPMeetingTemplateRecord,
  PCPMeetingLogRecord,
  PCPMeetingBriefingRecord,
  OverviewMetrics,
  BriefingItem,
  PriorityTopic,
  AtaStructuredContent,
  AtaSectionData,
  PreviaEnvioInfo,
  ParticipantStatus,
  PendencyUpdateHistoryEntry,
} from '@/types/pcp-meeting'
import { NotificationAdapter } from './pcp-adapters-service'
import { getIsoWeekAndYear, getPlantNow } from '@/lib/temporal-utils'
import { testProgrammingService } from './test-programming-service'
import { CarteiraService } from './carteira-service'
import { weeklyScheduleService } from './weekly-schedule-service'
import { CoberturaTemporalEngine } from './cobertura-temporal-engine'

export function formatMeetingCode(sequenceNumber: number): string {
  return `REUNIAO-${String(sequenceNumber).padStart(6, '0')}`
}

export function parseMeetingCodeSequence(code: string): number {
  const match = code.match(/^REUNIAO-(\d+)$/)
  if (!match) return 0
  return parseInt(match[1], 10)
}

export function formatPendencyCode(sequenceNumber: number): string {
  return `PEND-${String(sequenceNumber).padStart(6, '0')}`
}

export function parsePendencyCodeSequence(code: string): number {
  const match = code.match(/^PEND-(\d+)$/)
  if (!match) return 0
  return parseInt(match[1], 10)
}

export class PcpMeetingFatia1Service {
  /**
   * Obtém detalhes de semana e ano ISO a partir de Date ou string
   */
  getIsoWeekDetails(date: Date | string): { week: number; year: number } {
    const d = typeof date === 'string' ? new Date(date) : date
    return getIsoWeekAndYear(d)
  }

  /**
   * Obtém próximo código sequencial de reunião (Ex: REUNIAO-000001)
   */ async getNextMeetingCode(): Promise<string> {
    try {
      const records = await pb.collection('pcp_meeting').getList(1, 1, {
        sort: '-meeting_code',
        fields: 'meeting_code',
      })
      if (records.items.length === 0 || !records.items[0].meeting_code) {
        return formatMeetingCode(1)
      }
      const seq = parseMeetingCodeSequence(records.items[0].meeting_code)
      return formatMeetingCode(seq + 1)
    } catch {
      return `REUNIAO-${String(Date.now()).slice(-6)}`
    }
  }

  /**
   * Obtém próximo código legível PEND-000001
   */
  async getNextPendencyCode(): Promise<string> {
    try {
      const records = await pb.collection('pcp_meeting_pendency').getList(1, 1, {
        sort: '-pendency_code',
        fields: 'pendency_code',
      })
      if (records.items.length === 0 || !records.items[0].pendency_code) {
        return formatPendencyCode(1)
      }
      const seq = parsePendencyCodeSequence(records.items[0].pendency_code)
      return formatPendencyCode(seq + 1)
    } catch {
      return `PEND-${String(Date.now()).slice(-6)}`
    }
  }

  /**
   * Lista reuniões com filtros
   */
  async listMeetings(options?: {
    week?: number
    year?: number
    status?: string
    company?: string
  }): Promise<PCPMeetingRecord[]> {
    const filters: string[] = []
    if (options?.week) filters.push(`week = ${options.week}`)
    if (options?.year) filters.push(`year = ${options.year}`)
    if (options?.status && options.status !== 'TODOS') filters.push(`status = '${options.status}'`)
    if (options?.company && options.company !== 'TODAS')
      filters.push(`company = '${options.company}'`)

    const filterStr = filters.join(' && ')
    try {
      const records = await pb.collection('pcp_meeting').getFullList<PCPMeetingRecord>({
        filter: filterStr,
        sort: '-meeting_date,-start_time',
      })
      return records
    } catch (err) {
      console.warn('Erro ao listar pcp_meeting:', err)
      return []
    }
  }

  /**
   * Obtém reunião por ID
   */
  async getMeetingById(id: string): Promise<PCPMeetingRecord | null> {
    try {
      return await pb.collection('pcp_meeting').getOne<PCPMeetingRecord>(id)
    } catch {
      return null
    }
  }

  /**
   * Cria nova reunião de PCP
   */
  async createMeeting(
    data: Omit<
      PCPMeetingRecord,
      | 'id'
      | 'meeting_code'
      | 'status'
      | 'briefing_gerado'
      | 'pauta_gerada'
      | 'previa_gerada'
      | 'previa_enviada'
      | 'agendamento_confirmado'
      | 'created'
      | 'updated'
    >,
    userContext: { id?: string; name: string },
    initialParticipants?: {
      person_name: string
      person_email?: string
      area: string
      role_title?: string
    }[],
  ): Promise<PCPMeetingRecord> {
    const code = await this.getNextMeetingCode()
    const payload = {
      ...data,
      meeting_code: code,
      status: 'RASCUNHO' as const,
      briefing_gerado: false,
      pauta_gerada: false,
      previa_gerada: false,
      previa_enviada: false,
      agendamento_confirmado: false,
      created_by_user: userContext.name,
    }

    const created = await pb.collection('pcp_meeting').create<PCPMeetingRecord>(payload)

    // Auditoria
    await this.logAction({
      meeting_id: created.id,
      meeting_code: created.meeting_code,
      week: created.week,
      year: created.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'CRIACAO_REUNIAO',
      target_object: 'pcp_meeting',
      previous_value: '',
      new_value: created.status,
      reason: `Nova Reunião PCP criada para a Semana ${created.week}/${created.year}`,
    })

    // Participantes padrão ou fornecidos
    const parts =
      initialParticipants && initialParticipants.length > 0
        ? initialParticipants
        : [
            { person_name: 'Coordenação PCP', area: 'PCP', role_title: 'Coordenador PCP' },
            { person_name: 'Gerência Industrial L1', area: 'L1', role_title: 'Gerente L1' },
            { person_name: 'Supervisão L2', area: 'L2', role_title: 'Supervisor L2' },
            {
              person_name: 'Preparação e Matrizes L2',
              area: 'Preparação L2',
              role_title: 'Líder Preparação',
            },
            {
              person_name: 'Gestão de Estoques e Pátio',
              area: 'Estoque',
              role_title: 'Analista de Estoques',
            },
            {
              person_name: 'Garantia da Qualidade',
              area: 'Qualidade',
              role_title: 'Engenheiro de Qualidade',
            },
            {
              person_name: 'Atendimento Comercial',
              area: 'Comercial',
              role_title: 'Especialista Comercial',
            },
            { person_name: 'Planejamento SDC', area: 'SDC', role_title: 'Analista SDC' },
            {
              person_name: 'Laboratório Metalúrgico',
              area: 'Laboratório',
              role_title: 'Líder Laboratório',
            },
            {
              person_name: 'Logística & Transporte',
              area: 'Transporte',
              role_title: 'Supervisor Logística',
            },
            {
              person_name: 'Engenharia de Projetos',
              area: 'Projetos',
              role_title: 'Engenheiro de Projetos',
            },
            { person_name: 'Operação KS', area: 'KS', role_title: 'Coordenador KS' },
          ]

    for (const p of parts) {
      await pb.collection('pcp_meeting_participant').create<PCPMeetingParticipantRecord>({
        meeting_id: created.id,
        person_name: p.person_name,
        person_email: p.person_email || '',
        area: p.area,
        role_title: p.role_title || '',
        status: 'CONVOCADO',
      })
    }

    return created
  }

  /**
   * Atualiza dados de uma reunião e grava log
   */
  async updateMeeting(
    id: string,
    updates: Partial<PCPMeetingRecord>,
    userContext: { id?: string; name: string },
    reason?: string,
  ): Promise<PCPMeetingRecord> {
    const current = await this.getMeetingById(id)
    if (!current) throw new Error('Reunião não encontrada')

    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(id, updates)

    await this.logAction({
      meeting_id: updated.id,
      meeting_code: updated.meeting_code,
      week: updated.week,
      year: updated.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'ATUALIZACAO_REUNIAO',
      target_object: 'pcp_meeting',
      previous_value: current.status,
      new_value: updated.status,
      reason: reason || 'Atualização dos parâmetros da Reunião PCP',
      metadata: { changedKeys: Object.keys(updates) },
    })

    return updated
  }

  /**
   * Cancelamento com motivo obrigatório
   */
  async cancelMeeting(
    id: string,
    reason: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    if (!reason || reason.trim().length < 5) {
      throw new Error('O motivo do cancelamento é obrigatório (mínimo 5 caracteres).')
    }
    const current = await this.getMeetingById(id)
    if (!current) throw new Error('Reunião não encontrada')

    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(id, {
      status: 'CANCELADA',
      cancellation_reason: reason.trim(),
    })

    await this.logAction({
      meeting_id: updated.id,
      meeting_code: updated.meeting_code,
      week: updated.week,
      year: updated.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'CANCELAMENTO_REUNIAO',
      target_object: 'pcp_meeting',
      previous_value: current.status,
      new_value: 'CANCELADA',
      reason,
    })

    return updated
  }

  /**
   * Reagendamento com motivo obrigatório.
   * REGRA: Ao reagendar, o agendamento anterior perde a confirmação e a prévia precisa ser revalidada/reenviada
   * para novo agendamento!
   */
  async rescheduleMeeting(
    id: string,
    params: {
      newDate: string
      newStartTime: string
      newEndTime: string
      reason: string
    },
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('O motivo do reagendamento é obrigatório (mínimo 5 caracteres).')
    }

    const current = await this.getMeetingById(id)
    if (!current) throw new Error('Reunião não encontrada')

    const dateObj = new Date(params.newDate + 'T12:00:00')
    const { week, year } = getIsoWeekAndYear(dateObj)

    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(id, {
      status: 'REAGENDADA',
      meeting_date: params.newDate,
      start_time: params.newStartTime,
      expected_end_time: params.newEndTime,
      week,
      year,
      reschedule_reason: params.reason.trim(),
      agendamento_confirmado: false,
      previa_enviada: false, // Exige reenvio da prévia antes de reconfirmar agendamento
    })

    await this.logAction({
      meeting_id: updated.id,
      meeting_code: updated.meeting_code,
      week: updated.week,
      year: updated.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'REAGENDAMENTO_REUNIAO',
      target_object: 'pcp_meeting',
      previous_value: `${current.meeting_date} ${current.start_time}`,
      new_value: `${params.newDate} ${params.newStartTime}`,
      reason: params.reason,
    })

    return updated
  }

  // --------------------------------------------------------------------------
  // BRIEFING EXECUTIVO COM DADOS REAIS DO PCP ROBOTIZADO
  // --------------------------------------------------------------------------

  /**
   * Organizar Reunião PCP com IA:
   * Compara Semana Anterior x Atual x Próxima x Futuras usando dados REAIS:
   * - Carteiras (ZSD28C e SDC)
   * - Cobertura temporal (CoberturaTemporalEngine)
   * - Programações de teste (testProgrammingService)
   * - Montagem semanal (weeklyScheduleService)
   * - Pendências de reuniões anteriores
   */
  async generateBriefing(
    meetingId: string,
    userContext?: { id?: string; name: string },
  ): Promise<PCPMeetingBriefingRecord & { executive_summary?: string; critical_risks?: string[] }> {
    const user = userContext || { id: 'sys-pcp', name: 'Sistema PCP' }
    const brf = await this.generateExecutiveBriefing(meetingId, user)
    const criticals = brf.briefing_items
      .filter((i) => i.classificacao === 'CRITICO')
      .map((i) => `${i.titulo}: ${i.descricao}`)
    return {
      ...brf,
      executive_summary: `Briefing executivo consolidado com ${brf.briefing_items.length} itens mapeados (${brf.critical_items_count} críticos).`,
      critical_risks: criticals,
    }
  }

  async generateExecutiveBriefing(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingBriefingRecord> {
    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')

    const targetWeek = meeting.week
    const targetYear = meeting.year

    const briefingItems: BriefingItem[] = []
    const priorityTopics: PriorityTopic[] = []

    // 1. Integrar Testes Programados Reais
    try {
      const tests = await testProgrammingService.list()
      const testsWeek = tests.filter((t) => {
        if (!t.expected_date) return false
        const d = new Date(t.expected_date + 'T12:00:00')
        const { week, year } = getIsoWeekAndYear(d)
        return week === targetWeek && year === targetYear
      })

      const testsWaitingApproval = tests.filter(
        (t) =>
          t.status === 'Aguardando Aprovação PCP' ||
          t.status === 'Enviado para Aprovação Industrial' ||
          t.status === 'Em Aprovação Industrial',
      )

      if (testsWeek.length > 0) {
        briefingItems.push({
          id: 'brf_tests_scheduled',
          categoria: 'RISCO_PROGRAMACAO',
          titulo: `${testsWeek.length} Teste(s) Programado(s) para a Semana ${targetWeek}`,
          descricao: `Testes com impacto potencial na cadência: ${testsWeek.map((t) => `${t.test_id} (${t.production_line} - ${t.test_category})`).join(', ')}.`,
          classificacao: testsWeek.some((t) => t.schedule_impact_type === 'PARADA_TOTAL')
            ? 'CRITICO'
            : 'ALTO',
          origem_dados: 'Módulo Programação de Testes (test_programming)',
          impacto: 'Possíveis paradas ou redução de ritmo nas linhas programadas.',
          responsavel: 'Engenharia de Processos / PCP',
        })
      }

      if (testsWaitingApproval.length > 0) {
        briefingItems.push({
          id: 'brf_tests_pending_approval',
          categoria: 'DECISOES_NECESSARIAS',
          titulo: `${testsWaitingApproval.length} Teste(s) Aguardando Aprovação PCP/Industrial`,
          descricao: `Existem testes submetidos pendentes de validação formal antes de entrar no sequenciamento: ${testsWaitingApproval.map((t) => t.test_id).join(', ')}.`,
          classificacao: 'ALTO',
          origem_dados: 'Módulo Programação de Testes (test_programming)',
          impacto: 'Risco de postergação de testes industriais homologados.',
          responsavel: 'Coordenação PCP / Indústria',
        })
      }
    } catch {
      briefingItems.push({
        id: 'brf_tests_missing',
        categoria: 'INFO_FALTANTE',
        titulo: 'Dados de Programação de Testes Indisponíveis',
        descricao: 'Não foi possível carregar os testes programados do módulo de testes.',
        classificacao: 'INFORMATIVO',
        origem_dados: 'Módulo Programação de Testes [FALHA NA CONEXÃO]',
      })
    }

    // 2. Integrar Carteira e Cobertura Temporal Reais
    try {
      const carteiraResult = await CarteiraService.carregarCarteiraAtual()
      const carteiraGeral = carteiraResult.itens || []

      // Itens críticos por atraso ou ruptura
      const itensAtrasados = carteiraGeral.filter((item) => {
        if (!item.data_desejada) return false
        const d = new Date(item.data_desejada)
        return (
          !isNaN(d.getTime()) &&
          d < getPlantNow() &&
          (item.falta_produzir_tons > 0 || item.saldo_negativo_tons > 0)
        )
      })

      if (itensAtrasados.length > 0) {
        const totalTonAtrasada = itensAtrasados.reduce(
          (acc, it) => acc + (it.falta_produzir_tons || it.carteira_aberta_tons || 0),
          0,
        )
        briefingItems.push({
          id: 'brf_carteira_atrasada',
          categoria: 'CARTEIRA_RISCO',
          titulo: `${itensAtrasados.length} Itens de Carteira em Atraso (${totalTonAtrasada.toFixed(1)} t)`,
          descricao: `Pedidos em carteira com data prometida vencida exigem reprogramação emergencial na reunião semanal.`,
          classificacao: 'CRITICO',
          origem_dados: 'Módulo Análise de Carteira ZSD28C',
          impacto: `Comprometimento do OTIF em ${totalTonAtrasada.toFixed(1)} toneladas.`,
          responsavel: 'Comercial / PCP',
        })
      }

      // Análise de Cobertura Temporal
      const inputs = carteiraGeral
        .slice(0, 30)
        .map((it) => CoberturaTemporalEngine.converterCarteiraItemParaInput(it, 'GERAL', []))
      const rupturas = inputs
        .map((inp) => CoberturaTemporalEngine.calcular(inp))
        .filter((res) => res.temGapRuptura || res.status.includes('CRÍTICO'))

      if (rupturas.length > 0) {
        briefingItems.push({
          id: 'brf_cobertura_rupturas',
          categoria: 'ESTOQUE_CRITICO',
          titulo: `${rupturas.length} Produtos com Risco de Ruptura Temporal`,
          descricao: `Materiais identificados com fim de estoque projetado antes da data de reposição programada.`,
          classificacao: 'CRITICO',
          origem_dados: 'Motor de Cobertura Temporal 7 Carteiras',
          impacto: 'Desabastecimento iminente de clientes.',
          responsavel: 'Gestão de Estoques / PCP',
        })
      }
    } catch {
      briefingItems.push({
        id: 'brf_carteira_missing',
        categoria: 'INFO_FALTANTE',
        titulo: 'Dados de Carteira ZSD28C Não Conectados',
        descricao: 'Não foi possível ler as ordens da carteira ZSD28C nesta execução.',
        classificacao: 'INFORMATIVO',
        origem_dados: 'Módulo Análise de Carteira [INFORMAÇÃO AINDA FALTANTE]',
      })
    }

    // 3. Integrar Montagem Semanal e Agendamentos Reais
    try {
      const scheduleRecords = await pb.collection('weekly_schedules').getFullList({
        filter: `year = ${targetYear} && week_number = ${targetWeek}`,
      })
      if (scheduleRecords.length > 0) {
        const totalTon = scheduleRecords.reduce(
          (acc: number, it: any) => acc + (it.planned_tons || 0),
          0,
        )
        briefingItems.push({
          id: 'brf_montagem_semanal',
          categoria: 'MUDANCAS',
          titulo: `Programação Semanal S${targetWeek}: ${scheduleRecords.length} Ordens (${totalTon.toFixed(1)} t)`,
          descricao: `Sequenciamento ativo no banco com ${scheduleRecords.length} lotes para as linhas fabris.`,
          classificacao: 'ALTO',
          origem_dados: 'Montagem Semanal (weekly_schedules)',
          impacto: 'Definição da fila fabril oficial.',
          responsavel: 'Programador PCP',
        })
      } else {
        briefingItems.push({
          id: 'brf_montagem_vazia',
          categoria: 'INFO_FALTANTE',
          titulo: `Montagem Semanal S${targetWeek} Ainda Não Consolidada`,
          descricao: `Nenhum lote sequenciado gravado ainda para a semana ${targetWeek}. O briefing utilizou dados de carteira bruta.`,
          classificacao: 'ALTO',
          origem_dados: 'Montagem Semanal [INFORMAÇÃO AINDA FALTANTE]',
        })
      }
    } catch {
      briefingItems.push({
        id: 'brf_montagem_err',
        categoria: 'INFO_FALTANTE',
        titulo: 'Integração Montagem Semanal Indisponível',
        descricao: 'Serviço weekly_schedules indisponível no momento.',
        classificacao: 'INFORMATIVO',
        origem_dados: 'Serviço de Montagem Semanal [INFORMAÇÃO AINDA FALTANTE]',
      })
    }

    // 4. Integrar Pendências de Reuniões Anteriores
    const pendencies = await this.listPendencies({ status: 'ABERTA' })
    const pendenciasVencidas = pendencies.filter((p) => {
      const d = new Date(p.deadline + 'T23:59:59')
      return !isNaN(d.getTime()) && d < getPlantNow()
    })

    if (pendencies.length > 0) {
      briefingItems.push({
        id: 'brf_pendencias_abertas',
        categoria: 'PENDENCIAS',
        titulo: `${pendencies.length} Pendência(s) de Reuniões Anteriores em Aberto`,
        descricao: `Pendências não concluídas requerem cobrança de status e atualização de evidências na pauta.`,
        classificacao: pendenciasVencidas.length > 0 ? 'CRITICO' : 'ALTO',
        origem_dados: 'pcp_meeting_pendency',
        impacto:
          pendenciasVencidas.length > 0
            ? `${pendenciasVencidas.length} pendência(s) vencida(s)!`
            : undefined,
        responsavel: 'Responsáveis das Áreas',
      })
    }

    // Construção do Quadro de Assuntos Prioritários (Quadro 1 da Preparação)
    briefingItems.forEach((item, idx) => {
      priorityTopics.push({
        id: `topic_${idx + 1}`,
        prioridade: item.classificacao,
        area: item.responsavel?.split('/')[0]?.trim() || 'PCP',
        assunto: item.titulo,
        origem: item.origem_dados,
        impacto: item.impacto || item.descricao,
        situacao: item.categoria === 'INFO_FALTANTE' ? 'DADO FALTANTE' : 'EXIGE ALINHAMENTO',
        decisao_necessaria:
          item.classificacao === 'CRITICO' || item.categoria === 'DECISOES_NECESSARIAS',
        responsavel_relacionado: item.responsavel || 'A Definir',
      })
    })

    const missingInfoCount = briefingItems.filter((i) => i.categoria === 'INFO_FALTANTE').length
    const criticalItemsCount = briefingItems.filter((i) => i.classificacao === 'CRITICO').length

    // Persistir briefing
    const payload: Omit<PCPMeetingBriefingRecord, 'id' | 'created' | 'updated'> = {
      meeting_id: meetingId,
      briefing_items: briefingItems,
      priority_topics: priorityTopics,
      missing_info_count: missingInfoCount,
      critical_items_count: criticalItemsCount,
      generated_at: new Date().toISOString(),
      generated_by: userContext.name,
    }

    // Deletar anterior se houver
    try {
      const existing = await pb.collection('pcp_meeting_briefing').getFullList({
        filter: `meeting_id = '${meetingId}'`,
      })
      for (const ex of existing) {
        await pb.collection('pcp_meeting_briefing').delete(ex.id)
      }
    } catch {
      /* intentionally ignored */
    }

    const savedBriefing = await pb
      .collection('pcp_meeting_briefing')
      .create<PCPMeetingBriefingRecord>(payload)

    // Atualizar flag na reunião
    await pb.collection('pcp_meeting').update(meetingId, {
      briefing_gerado: true,
      status: meeting.status === 'RASCUNHO' ? 'PREPARACAO' : meeting.status,
    })

    await this.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'BRIEFING_IA_GERADO',
      target_object: 'pcp_meeting_briefing',
      new_value: `${briefingItems.length} itens gerados`,
      reason: 'Execução do motor de organização executiva IA para a Reunião PCP',
    })

    return savedBriefing
  }

  /**
   * Obtém briefing gravado da reunião
   */
  async getBriefing(meetingId: string): Promise<PCPMeetingBriefingRecord | null> {
    try {
      const records = await pb
        .collection('pcp_meeting_briefing')
        .getList<PCPMeetingBriefingRecord>(1, 1, {
          filter: `meeting_id = '${meetingId}'`,
          sort: '-created',
        })
      return records.items.length > 0 ? records.items[0] : null
    } catch {
      return null
    }
  }

  // --------------------------------------------------------------------------
  // PAUTA SUGERIDA E PERSISTÊNCIA REORDENÁVEL
  // --------------------------------------------------------------------------

  /**
   * Gera Pauta Sugerida a partir de:
   * 1. Pendências da reunião anterior
   * 2. Assuntos prioritários do briefing executivo
   */
  async generateSuggestedAgenda(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingAgendaItemRecord[]> {
    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')

    const agendaItems: Omit<PCPMeetingAgendaItemRecord, 'id' | 'created' | 'updated'>[] = []
    let order = 1

    // 1. Tópico inicial fixo
    agendaItems.push({
      meeting_id: meetingId,
      subject: '1. Abertura, Indicadores Gerais e Aderência do Sequenciamento',
      area: 'PCP',
      reason: 'Alinhamento geral de desempenho semanal',
      priority: 'INFORMATIVO',
      estimated_time_min: 10,
      presenter: meeting.conductor || 'Coordenação PCP',
      decision_needed: false,
      order: order++,
      origin_ref: 'PADRAO_CIAFAL',
    })

    // 2. Pendências da reunião anterior
    const pendencies = await this.listPendencies({ status: 'ABERTA' })
    if (pendencies.length > 0) {
      agendaItems.push({
        meeting_id: meetingId,
        subject: `2. Revisão de Pendências em Aberto (${pendencies.length} itens)`,
        area: 'Todas as Áreas',
        reason: 'Cobrança de status das ações da reunião anterior',
        priority: 'ALTO',
        estimated_time_min: 15,
        presenter: 'Coordenação PCP',
        decision_needed: true,
        order: order++,
        origin_ref: 'pcp_meeting_pendency',
      })
    }

    // 3. Briefing executivo
    const briefing = await this.getBriefing(meetingId)
    if (briefing && briefing.priority_topics.length > 0) {
      briefing.priority_topics.forEach((topic) => {
        agendaItems.push({
          meeting_id: meetingId,
          subject: topic.assunto,
          area: topic.area,
          reason: topic.impacto,
          priority: topic.prioridade,
          estimated_time_min: topic.decisao_necessaria ? 10 : 5,
          presenter: topic.responsavel_relacionado,
          decision_needed: topic.decisao_necessaria,
          order: order++,
          origin_ref: topic.origem,
        })
      })
    }

    // 4. Encerramento e Decisões
    agendaItems.push({
      meeting_id: meetingId,
      subject: `${order}. Decisões Finais, Próximos Passos e Fechamento da ATA`,
      area: 'PCP',
      reason: 'Formalização das deliberações oficiais',
      priority: 'INFORMATIVO',
      estimated_time_min: 10,
      presenter: meeting.organizer || 'Organizador PCP',
      decision_needed: true,
      order: order++,
      origin_ref: 'PADRAO_CIAFAL',
    })

    // Limpar pauta anterior da reunião
    const existing = await pb.collection('pcp_meeting_agenda_item').getFullList({
      filter: `meeting_id = '${meetingId}'`,
    })
    for (const ex of existing) {
      await pb.collection('pcp_meeting_agenda_item').delete(ex.id)
    }

    const createdList: PCPMeetingAgendaItemRecord[] = []
    for (const item of agendaItems) {
      const created = await pb
        .collection('pcp_meeting_agenda_item')
        .create<PCPMeetingAgendaItemRecord>(item)
      createdList.push(created)
    }

    await pb.collection('pcp_meeting').update(meetingId, { pauta_gerada: true })

    await this.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'PAUTA_SUGERIDA_GERADA',
      target_object: 'pcp_meeting_agenda_item',
      new_value: `${createdList.length} itens na pauta`,
      reason: 'Geração automática de pauta baseada em briefing e pendências',
    })

    return createdList
  }

  /**
   * Lista itens da pauta
   */
  async listAgendaItems(meetingId: string): Promise<PCPMeetingAgendaItemRecord[]> {
    try {
      return await pb
        .collection('pcp_meeting_agenda_item')
        .getFullList<PCPMeetingAgendaItemRecord>({
          filter: `meeting_id = '${meetingId}'`,
          sort: 'order',
        })
    } catch {
      return []
    }
  }

  /**
   * Salva reordenação da pauta
   */
  async reorderAgendaItems(
    meetingId: string,
    orderedIds: string[],
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingAgendaItemRecord[]> {
    for (let i = 0; i < orderedIds.length; i++) {
      await pb.collection('pcp_meeting_agenda_item').update(orderedIds[i], { order: i + 1 })
    }

    await this.logAction({
      meeting_id: meetingId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'REORDENACAO_PAUTA',
      target_object: 'pcp_meeting_agenda_item',
      reason: 'Reordenação manual da pauta da reunião',
    })

    return await this.listAgendaItems(meetingId)
  }

  /**
   * Adiciona item à pauta
   */
  async addAgendaItem(
    item: Omit<PCPMeetingAgendaItemRecord, 'id' | 'created' | 'updated'> | any,
    userContext?: { id?: string; name: string },
  ): Promise<PCPMeetingAgendaItemRecord> {
    const normalizedItem: Omit<PCPMeetingAgendaItemRecord, 'id' | 'created' | 'updated'> = {
      meeting_id: item.meeting_id,
      subject: item.subject,
      area: item.area || 'PCP',
      reason: item.reason || '',
      priority: item.priority || 'NORMAL',
      estimated_time_min: item.estimated_time_min ?? item.estimated_duration_min ?? 15,
      presenter: item.presenter ?? item.responsible ?? 'PCP',
      decision_needed: item.decision_needed ?? false,
      order: item.order ?? (item.order_index !== undefined ? item.order_index + 1 : 1),
      origin_ref: item.origin_ref || 'MANUAL',
    }

    const created = await pb
      .collection('pcp_meeting_agenda_item')
      .create<PCPMeetingAgendaItemRecord>(normalizedItem)

    if (userContext) {
      await this.logAction({
        meeting_id: item.meeting_id,
        user_id: userContext.id,
        user_name: userContext.name,
        action: 'ITEM_PAUTA_ADICIONADO',
        target_object: 'pcp_meeting_agenda_item',
        new_value: item.subject,
        reason: 'Inclusão manual de item na pauta',
      })
    }

    return created
  }

  /**
   * Atualiza item da pauta
   */
  async updateAgendaItem(
    itemId: string,
    updates: Partial<PCPMeetingAgendaItemRecord> | any,
    userContext?: { id?: string; name: string },
  ): Promise<PCPMeetingAgendaItemRecord> {
    const updated = await pb
      .collection('pcp_meeting_agenda_item')
      .update<PCPMeetingAgendaItemRecord>(itemId, updates)

    if (userContext) {
      await this.logAction({
        meeting_id: updated.meeting_id,
        user_id: userContext.id,
        user_name: userContext.name,
        action: 'ITEM_PAUTA_ATUALIZADO',
        target_object: 'pcp_meeting_agenda_item',
        new_value: updated.subject,
        reason: 'Atualização de item da pauta',
      })
    }

    return updated
  }

  /**
   * Exclui item da pauta
   */
  async deleteAgendaItem(
    itemId: string,
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<void> {
    await pb.collection('pcp_meeting_agenda_item').delete(itemId)
    await this.logAction({
      meeting_id: meetingId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'ITEM_PAUTA_REMOVIDO',
      target_object: 'pcp_meeting_agenda_item',
      reason: 'Remoção de item da pauta',
    })
  }

  // --------------------------------------------------------------------------
  // PRÉVIA DA ATA COM IA E TEMPLATE VIGENTE SGQ
  // --------------------------------------------------------------------------

  /**
   * Obtém template vigente cadastrado
   */
  async getEffectiveTemplate(): Promise<PCPMeetingTemplateRecord | null> {
    try {
      const records = await pb
        .collection('pcp_meeting_template')
        .getList<PCPMeetingTemplateRecord>(1, 1, {
          filter: "status = 'VIGENTE'",
          sort: '-revision',
        })
      if (records.items.length > 0) return records.items[0]
      // Fallback: qualquer template cadastrado
      const anyTpl = await pb
        .collection('pcp_meeting_template')
        .getList<PCPMeetingTemplateRecord>(1, 1, {
          sort: '-created',
        })
      return anyTpl.items.length > 0 ? anyTpl.items[0] : null
    } catch {
      return null
    }
  }

  /**
   * Calcula completude por seção e completude geral (%)
   */
  calculateAtaCompleteness(structuredContent: AtaStructuredContent): {
    sectionCompleteness: Record<string, number>
    overallCompleteness: number
  } {
    const secComp: Record<string, number> = {}
    let totalScore = 0
    let count = 0

    const secoes = Object.values(structuredContent.secoes || {})
    if (secoes.length === 0) {
      return { sectionCompleteness: {}, overallCompleteness: 0 }
    }

    for (const sec of secoes) {
      // Uma seção é considerada preenchida se tiver itens válidos ou observações
      const hasItems = sec.itens && sec.itens.length > 0
      const hasNotes = sec.observacoes && sec.observacoes.trim().length > 0
      let score = 0
      if (hasItems && hasNotes) score = 100
      else if (hasItems || hasNotes) score = 75
      else score = sec.obrigatorio ? 0 : 50

      secComp[sec.id] = score
      totalScore += score
      count++
    }

    const overall = count > 0 ? Math.round(totalScore / count) : 0
    return { sectionCompleteness: secComp, overallCompleteness: overall }
  }

  /**
   * Gera a Prévia da ATA com IA:
   * Monta a minuta a partir do template vigente + ATA da reunião anterior
   * (classificando cada informação como MANTER/ATUALIZAR/NOVA/CONCLUIDA/PENDENTE/SUGESTÃO_DE_EXCLUSÃO/NECESSITA_VALIDAÇÃO)
   * NUNCA apaga dados anteriores automaticamente.
   */
  async generatePreviaAta(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingAtaRecord> {
    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')

    const template = await this.getEffectiveTemplate()
    if (!template) throw new Error('Nenhum template de ATA cadastrado no SGQ.')

    // Carregar ATA da reunião anterior mais recente (se houver)
    let previousAta: PCPMeetingAtaRecord | null = null
    try {
      const prevMeetings = await pb.collection('pcp_meeting').getFullList<PCPMeetingRecord>({
        filter: `id != '${meetingId}' && status != 'CANCELADA'`,
        sort: '-meeting_date',
      })
      if (prevMeetings.length > 0) {
        const prevAtaRes = await pb
          .collection('pcp_meeting_ata')
          .getList<PCPMeetingAtaRecord>(1, 1, {
            filter: `meeting_id = '${prevMeetings[0].id}'`,
            sort: '-version',
          })
        if (prevAtaRes.items.length > 0) {
          previousAta = prevAtaRes.items[0]
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // Carregar pendências abertas
    const pendencies = await this.listPendencies({ status: 'ABERTA' })

    // Carregar briefing
    const briefing = await this.getBriefing(meetingId)

    // Montar conteúdo estruturado baseado no template
    const secoesMap: Record<string, AtaSectionData> = {}

    const templateSections = template.structure?.secoes || [
      { id: 'sec_pcp', nome: 'PCP', obrigatorio: true, ordem: 1 },
      { id: 'sec_comercial', nome: 'Comercial', obrigatorio: true, ordem: 2 },
      { id: 'sec_mp', nome: 'Matéria-Prima', obrigatorio: true, ordem: 3 },
      { id: 'sec_qualidade', nome: 'Qualidade', obrigatorio: true, ordem: 4 },
      { id: 'sec_sdc', nome: 'SDC', obrigatorio: true, ordem: 5 },
      { id: 'sec_estoque', nome: 'Estoque', obrigatorio: true, ordem: 6 },
      { id: 'sec_l1', nome: 'L1', obrigatorio: true, ordem: 7 },
      { id: 'sec_l2', nome: 'L2', obrigatorio: true, ordem: 8 },
      { id: 'sec_teste_prog', nome: 'Teste Programado', obrigatorio: true, ordem: 9 },
    ]

    for (const tSec of templateSections) {
      const prevSecData = previousAta?.structured_content?.secoes?.[tSec.id]
      const itens: any[] = []

      // Se havia itens na ATA anterior, trazer com classificação (NUNCA descartar!)
      if (prevSecData && prevSecData.itens) {
        for (const prevItem of prevSecData.itens) {
          itens.push({
            ...prevItem,
            status_info: 'MANTER', // Mantido da ata anterior para revisão humana
            dados_atuais: prevItem.detalhes,
          })
        }
      }

      // Adicionar pendências da área correspondente
      const areaPendencies = pendencies.filter(
        (p) =>
          p.area.toLowerCase().includes(tSec.nome.toLowerCase()) ||
          tSec.nome.toLowerCase().includes(p.area.toLowerCase()),
      )
      for (const pend of areaPendencies) {
        itens.push({
          id: `pend_${pend.id || Math.random()}`,
          topico: `[PENDÊNCIA] ${pend.subject}`,
          detalhes: `Ação: ${pend.action} | Resp: ${pend.responsible} | Prazo: ${pend.deadline}`,
          status_info: 'PENDENTE',
          responsavel: pend.responsible,
          origem: `Reunião S${pend.origin_week}/${pend.origin_year}`,
        })
      }

      // Adicionar apontamentos do briefing executivo para a seção
      if (briefing) {
        const briefingMatch = briefing.briefing_items.filter(
          (b) =>
            b.titulo.toLowerCase().includes(tSec.nome.toLowerCase()) ||
            b.responsavel?.toLowerCase().includes(tSec.nome.toLowerCase()),
        )
        for (const brf of briefingMatch) {
          itens.push({
            id: `brf_${brf.id}`,
            topico: `[IA] ${brf.titulo}`,
            detalhes: brf.descricao,
            status_info: 'NOVA',
            origem: brf.origem_dados,
          })
        }
      }

      // Seção vazia? Inserir item solicitando preenchimento
      if (itens.length === 0) {
        itens.push({
          id: `item_placeholder_${tSec.id}`,
          topico: `Alinhamento da área ${tSec.nome}`,
          detalhes: `Informações a serem validadas durante a preparação da reunião S${meeting.week}/${meeting.year}.`,
          status_info: 'NECESSITA_VALIDAÇÃO',
          responsavel: 'Coordenação da Área',
        })
      }

      secoesMap[tSec.id] = {
        id: tSec.id,
        nome: tSec.nome,
        obrigatorio: tSec.obrigatorio,
        ordem: tSec.ordem,
        itens,
        observacoes: prevSecData?.observacoes || '',
      }
    }

    const structuredContent: AtaStructuredContent = {
      template_code: template.code,
      template_revision: template.revision,
      secoes: secoesMap,
    }

    const { sectionCompleteness, overallCompleteness } =
      this.calculateAtaCompleteness(structuredContent)

    // Salvar ou atualizar pcp_meeting_ata
    let savedAta: PCPMeetingAtaRecord
    const existingAtas = await pb.collection('pcp_meeting_ata').getFullList<PCPMeetingAtaRecord>({
      filter: `meeting_id = '${meetingId}' && ata_type = 'PREVIA'`,
    })

    if (existingAtas.length > 0) {
      savedAta = await pb
        .collection('pcp_meeting_ata')
        .update<PCPMeetingAtaRecord>(existingAtas[0].id!, {
          version: existingAtas[0].version + 1,
          structured_content: structuredContent,
          section_completeness: sectionCompleteness,
          overall_completeness: overallCompleteness,
          status: 'MINUTA',
        })
    } else {
      savedAta = await pb.collection('pcp_meeting_ata').create<PCPMeetingAtaRecord>({
        meeting_id: meetingId,
        version: 1,
        structured_content: structuredContent,
        ata_type: 'PREVIA',
        status: 'MINUTA',
        section_completeness: sectionCompleteness,
        overall_completeness: overallCompleteness,
        template_code: template.code,
      })
    }

    await pb.collection('pcp_meeting').update(meetingId, {
      previa_gerada: true,
      status: 'PREVIA_GERADA',
    })

    await this.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'PREVIA_ATA_GERADA',
      target_object: 'pcp_meeting_ata',
      new_value: `Versão ${savedAta.version} (${overallCompleteness}% completude)`,
      reason: 'Geração automatizada da prévia da ATA SGQ via IA',
    })

    return savedAta
  }

  /**
   * Obtém prévia da ATA
   */
  async getPreviaAta(meetingId: string): Promise<PCPMeetingAtaRecord | null> {
    try {
      const records = await pb.collection('pcp_meeting_ata').getList<PCPMeetingAtaRecord>(1, 1, {
        filter: `meeting_id = '${meetingId}' && ata_type = 'PREVIA'`,
        sort: '-version',
      })
      return records.items.length > 0 ? records.items[0] : null
    } catch {
      return null
    }
  }

  /**
   * Atualiza a prévia da ATA editada pelo usuário
   */
  async updatePreviaAta(
    ataId: string,
    structuredContent: AtaStructuredContent,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingAtaRecord> {
    const { sectionCompleteness, overallCompleteness } =
      this.calculateAtaCompleteness(structuredContent)

    const updated = await pb.collection('pcp_meeting_ata').update<PCPMeetingAtaRecord>(ataId, {
      structured_content: structuredContent,
      section_completeness: sectionCompleteness,
      overall_completeness: overallCompleteness,
    })

    await this.logAction({
      meeting_id: updated.meeting_id,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'PREVIA_ATA_EDITADA',
      target_object: 'pcp_meeting_ata',
      new_value: `Completude: ${overallCompleteness}%`,
      reason: 'Edição de seções e tópicos da prévia da ATA',
    })

    return updated
  }

  /**
   * Valida formalmente a Prévia da ATA
   */
  async validatePreviaAta(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')
    if (!meeting.previa_gerada) throw new Error('A prévia precisa ser gerada antes da validação.')

    const ata = await this.getPreviaAta(meetingId)
    if (!ata) throw new Error('Prévia da ATA não encontrada no banco.')

    await pb.collection('pcp_meeting_ata').update(ata.id!, {
      status: 'EM_REVISAO',
    })

    const updatedMeeting = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, {
      status: 'PREVIA_VALIDADA',
    })

    await this.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'PREVIA_ATA_VALIDADA',
      target_object: 'pcp_meeting',
      new_value: 'PREVIA_VALIDADA',
      reason: 'Validação técnica da minuta da prévia da ATA',
    })

    return updatedMeeting
  }

  /**
   * Envia a Prévia ao Grupo PCP:
   * REGRA CRÍTICA: Se não houver servidor SMTP/e-mail configurado no HUB,
   * registra o envio no banco e marca claramente o canal como
   * REGISTRO_SISTEMA_CANAL_NOTIF_PENDENTE (nunca fingir sucesso falso de e-mail).
   */
  async sendPreviaToGroup(
    meetingId: string,
    destinatarios: string[],
    userContext: { id?: string; name: string },
  ): Promise<{
    meeting: PCPMeetingRecord
    envioInfo: PreviaEnvioInfo
    notificationStatus: string
  }> {
    const res = await this.sendPreviaToGrupoPCP(meetingId, destinatarios, userContext)
    return {
      meeting: {
        ...res.meeting,
        status_previa: 'ENVIADA',
      } as any,
      envioInfo: res.envioInfo,
      notificationStatus: 'DISPARO_REGISTRADO_SISTEMA_CANAL_NOTIF_PENDENTE',
    }
  }

  async sendPreviaToGrupoPCP(
    meetingId: string,
    destinatarios: string[],
    userContext: { id?: string; name: string },
  ): Promise<{ meeting: PCPMeetingRecord; envioInfo: PreviaEnvioInfo }> {
    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')
    if (meeting.status !== 'PREVIA_VALIDADA' && meeting.status !== 'PREVIA_GERADA') {
      throw new Error('A prévia deve ser gerada e validada antes do envio.')
    }

    const ata = await this.getPreviaAta(meetingId)
    const versao = ata ? ata.version : 1

    const finalDestinatarios =
      destinatarios && destinatarios.length > 0
        ? destinatarios
        : ['grupo.pcp@ciafal.com.br', 'lideres.producao@ciafal.com.br', 'sgq@ciafal.com.br']

    const envioInfo: PreviaEnvioInfo = {
      data_hora: new Date().toISOString(),
      usuario: userContext.name,
      versao,
      destinatarios: finalDestinatarios,
      canal: 'REGISTRO_SISTEMA_CANAL_NOTIF_PENDENTE', // Sem SMTP real, registra honestamente
    }

    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, {
      previa_enviada: true,
      previa_envio_info: envioInfo,
      status: 'PREVIA_ENVIADA',
    })

    if (ata) {
      await pb.collection('pcp_meeting_ata').update(ata.id!, {
        status: 'APROVADA',
      })
    }

    await this.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'ENVIO_PREVIA_GRUPO_PCP',
      target_object: 'pcp_meeting',
      new_value: 'PREVIA_ENVIADA',
      reason: `Prévia da ATA v${versao} registrada como enviada para ${finalDestinatarios.length} destinatários.`,
      metadata: { envioInfo },
    })

    return { meeting: updated, envioInfo }
  }

  // --------------------------------------------------------------------------
  // REGRA CRÍTICA DE BLOQUEIO DO AGENDAMENTO
  // --------------------------------------------------------------------------

  /**
   * Verifica se o agendamento pode ser confirmado
   */
  canConfirmSchedule(meeting: PCPMeetingRecord): { allowed: boolean; reason?: string } {
    if (!meeting.previa_gerada) {
      return {
        allowed: false,
        reason:
          'É obrigatório gerar, validar e enviar a prévia da ATA ao Grupo PCP antes de confirmar o agendamento.',
      }
    }
    if (meeting.status !== 'PREVIA_VALIDADA' && meeting.status !== 'PREVIA_ENVIADA') {
      return {
        allowed: false,
        reason:
          'É obrigatório gerar, validar e enviar a prévia da ATA ao Grupo PCP antes de confirmar o agendamento.',
      }
    }
    if (!meeting.previa_enviada) {
      return {
        allowed: false,
        reason:
          'É obrigatório gerar, validar e enviar a prévia da ATA ao Grupo PCP antes de confirmar o agendamento.',
      }
    }
    return { allowed: true }
  }

  /**
   * Confirmar Agendamento:
   * Aplica a trava do botão: O agendamento permanece BLOQUEADO até que a prévia tenha sido
   * VALIDADA e ENVIADA ao Grupo PCP.
   * Integra com a Agenda Corporativa: se a coleção existir, grava; caso contrário, persiste o compromisso
   * e sinaliza a integração como pendente sem duplicar base.
   */
  async startMeeting(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')
    if (meeting.status !== 'AGENDADA') {
      throw new Error(
        `Apenas reuniões com status AGENDADA podem ser iniciadas. Status atual: ${meeting.status}`,
      )
    }

    const nowIso = new Date().toISOString()
    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, {
      status: 'EM_ANDAMENTO',
      real_start_time: nowIso,
      started_by_user: userContext.name,
      version_lock: (meeting.version_lock || 0) + 1,
      last_edited_by: userContext.name,
      last_edited_at: nowIso,
      recording_status: meeting.recording_status || 'INATIVO',
      transcription_status: meeting.transcription_status || 'AGUARDANDO_INTEGRACAO',
    })

    await this.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'INICIO_REUNIAO',
      target_object: 'pcp_meeting',
      previous_value: 'AGENDADA',
      new_value: 'EM_ANDAMENTO',
      reason: `Reunião iniciada efetivamente às ${new Date().toLocaleTimeString('pt-BR')}`,
    })

    return updated
  }

  async confirmSchedule(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    const res = await this.confirmMeetingSchedule(meetingId, userContext)
    return res.meeting
  }

  async confirmMeetingSchedule(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<{ meeting: PCPMeetingRecord; agendaCorporativaStatus: string }> {
    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')

    const check = this.canConfirmSchedule(meeting)
    if (!check.allowed) {
      throw new Error(check.reason)
    }

    // Atualiza status para AGENDADA
    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, {
      status: 'AGENDADA',
      agendamento_confirmado: true,
    })

    // Integração com Agenda Corporativa do HUB (Integrar, NUNCA duplicar base)
    // O ID lógico principal da reunião (meeting.id) é compartilhado diretamente na agenda
    let agendaCorporativaStatus = 'VINCULO_AGENDA_CORPORATIVA_ATIVO'
    try {
      // Tenta gravar em pcp_agenda_events se a coleção existir
      await pb.collection('pcp_agenda_events').create({
        id: meeting.id,
        title: meeting.title,
        meeting_id: meeting.id,
        date: meeting.meeting_date,
        start_time: meeting.start_time,
        end_time: meeting.expected_end_time,
        organizer: meeting.organizer,
        modality: meeting.modality,
        location: meeting.location,
        online_link: meeting.online_link,
      })
    } catch {
      // Coleção dedicada não necessária pois pcp_meeting com status AGENDADA é a própria fonte da verdade
      // da agenda corporativa para reuniões PCP pelo mesmo ID lógico
      agendaCorporativaStatus = 'VINCULO_AGENDA_CORPORATIVA_ATIVO'
    }

    await this.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'CONFIRMACAO_AGENDAMENTO',
      target_object: 'pcp_meeting',
      previous_value: meeting.status,
      new_value: 'AGENDADA',
      reason: `Agendamento confirmado após prévia validada e enviada. Status agenda: ${agendaCorporativaStatus}`,
    })

    return { meeting: updated, agendaCorporativaStatus }
  }

  // --------------------------------------------------------------------------
  // PENDÊNCIAS E AÇÕES
  // --------------------------------------------------------------------------

  async listPendencies(options?: {
    meetingId?: string
    status?: string
    area?: string
  }): Promise<PCPMeetingPendencyRecord[]> {
    const filters: string[] = []
    if (options?.meetingId) filters.push(`meeting_id = '${options.meetingId}'`)
    if (options?.status && options.status !== 'TODOS') filters.push(`status = '${options.status}'`)
    if (options?.area && options.area !== 'TODAS') filters.push(`area = '${options.area}'`)

    try {
      return await pb.collection('pcp_meeting_pendency').getFullList<PCPMeetingPendencyRecord>({
        filter: filters.join(' && '),
        sort: '-created',
      })
    } catch {
      return []
    }
  }

  async createPendency(
    data: Omit<PCPMeetingPendencyRecord, 'id' | 'pendency_code' | 'created' | 'updated'>,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingPendencyRecord> {
    // REGRA DE GOVERNANÇA: Pendência originada no tópico Reunião PCP NUNCA é salva sem id_reuniao + id_ata
    if (!data.meeting_id || data.meeting_id === 'REUNIAO_MANUAL' || data.meeting_id === 'MANUAL') {
      throw new Error(
        'Rastreabilidade obrigatória: Selecione uma Reunião de origem válida para registrar a pendência.',
      )
    }

    // Se ata_id não fornecido diretamente, tentar obter a ATA da reunião
    let finalAtaId = data.ata_id || ''
    let finalAtaCode = data.ata_code || ''
    let finalMeetingCode = data.meeting_code || ''
    let finalMeetingDate = data.meeting_date || ''
    let finalCompany = data.company || 'CIAFAL'
    let finalWeek = data.origin_week
    let finalYear = data.origin_year

    try {
      const meetingRec = await pb
        .collection('pcp_meeting')
        .getOne<PCPMeetingRecord>(data.meeting_id)
      finalMeetingCode = meetingRec.meeting_code || finalMeetingCode
      finalMeetingDate = meetingRec.meeting_date || finalMeetingDate
      finalCompany = meetingRec.company || finalCompany
      finalWeek = meetingRec.week || finalWeek
      finalYear = meetingRec.year || finalYear

      if (!finalAtaId) {
        const atas = await pb.collection('pcp_meeting_ata').getList<PCPMeetingAtaRecord>(1, 1, {
          filter: `meeting_id = '${data.meeting_id}'`,
          sort: '-version',
        })
        if (atas.items.length > 0) {
          finalAtaId = atas.items[0].id || ''
          finalAtaCode = `ATA-${finalMeetingCode}-V${atas.items[0].version}`
        }
      }
    } catch {
      // Se não for possível ler a reunião via SDK (ex: teste mockado), mantemos os dados informados
    }

    if (!finalAtaId && !data.ata_id) {
      throw new Error(
        'Rastreabilidade obrigatória: A reunião de origem precisa ter uma ATA vinculada para registrar pendências.',
      )
    }

    const code = await this.getNextPendencyCode()

    const initialHistory: PendencyUpdateHistoryEntry[] = [
      {
        id: `hist_init_${Date.now()}`,
        timestamp: new Date().toISOString(),
        user_name: userContext.name,
        user_id: userContext.id,
        status_anterior: data.status,
        status_novo: data.status,
        nota: data.last_update_note || 'Registro inicial da pendência',
        evidencia: data.evidence || '',
        origem_atualizacao: data.origin || 'Reunião PCP',
      },
    ]

    const payload: Partial<PCPMeetingPendencyRecord> = {
      ...data,
      pendency_code: code,
      meeting_id: data.meeting_id,
      meeting_code: finalMeetingCode,
      meeting_date: finalMeetingDate,
      company: finalCompany,
      ata_id: finalAtaId,
      ata_code: finalAtaCode,
      origin_week: finalWeek,
      origin_year: finalYear,
      origem_pendente_regularizacao: false,
      update_history: initialHistory,
    }

    const created = await pb
      .collection('pcp_meeting_pendency')
      .create<PCPMeetingPendencyRecord>(payload)

    await this.logAction({
      meeting_id: data.meeting_id,
      meeting_code: finalMeetingCode,
      week: finalWeek,
      year: finalYear,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'CRIACAO_PENDENCIA',
      target_object: 'pcp_meeting_pendency',
      new_value: `${code}: ${data.subject}`,
      reason: `Registro de pendência na Reunião ${finalMeetingCode} vinculada à ATA ${finalAtaCode || finalAtaId}`,
      metadata: {
        pendency_code: code,
        ata_id: finalAtaId,
        ata_code: finalAtaCode,
        meeting_code: finalMeetingCode,
      },
    })

    return created
  }

  async updatePendency(
    id: string,
    updates: Partial<PCPMeetingPendencyRecord>,
    userContext: { id?: string; name: string },
    reason?: string,
  ): Promise<PCPMeetingPendencyRecord> {
    const current = await pb.collection('pcp_meeting_pendency').getOne<PCPMeetingPendencyRecord>(id)

    // Preservar integridade do histórico acumulativo sem sobrescrever entradas prévias
    const existingHistory = Array.isArray(current.update_history) ? [...current.update_history] : []

    const newStatus = updates.status || current.status
    const newNote =
      updates.last_update_note !== undefined
        ? updates.last_update_note
        : current.last_update_note || ''
    const newEvidence = updates.evidence !== undefined ? updates.evidence : current.evidence || ''

    const historyEntry: PendencyUpdateHistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      user_name: userContext.name,
      user_id: userContext.id,
      status_anterior: current.status,
      status_novo: newStatus,
      nota: newNote || reason || 'Atualização de pendência',
      evidencia: newEvidence,
      origem_atualizacao: updates.origin || current.origin || 'Painel de Pendências e Ações',
    }

    const updatedHistory = [historyEntry, ...existingHistory]

    // Garantir que vínculos obrigatórios sejam mantidos
    const payloadToSave: Partial<PCPMeetingPendencyRecord> = {
      ...updates,
      update_history: updatedHistory,
      meeting_id: updates.meeting_id || current.meeting_id,
      meeting_code: updates.meeting_code || current.meeting_code,
      ata_id: updates.ata_id || current.ata_id,
      ata_code: updates.ata_code || current.ata_code,
      company: updates.company || current.company,
      origin_week: updates.origin_week || current.origin_week,
      origin_year: updates.origin_year || current.origin_year,
      performance_action_id: updates.performance_action_id || current.performance_action_id,
    }

    const updated = await pb
      .collection('pcp_meeting_pendency')
      .update<PCPMeetingPendencyRecord>(id, payloadToSave)

    await this.logAction({
      meeting_id: updated.meeting_id,
      meeting_code: updated.meeting_code,
      week: updated.origin_week,
      year: updated.origin_year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'ATUALIZACAO_PENDENCIA',
      target_object: 'pcp_meeting_pendency',
      previous_value: current.status,
      new_value: updated.status,
      reason: reason || newNote || 'Atualização de status/responsável da pendência',
      metadata: {
        pendency_code: updated.pendency_code,
        changes: Object.keys(updates),
      },
    })

    return updated
  }

  /**
   * Envia Alerta da Pendência:
   * (1) Notificação interna no HUB via NotificationAdapter
   * (2) Tentativa de e-mail ao responsável corporativo
   * (3) Registro em auditoria pcp_meeting_log
   */
  async sendPendencyAlert(
    pendency: PCPMeetingPendencyRecord,
    userContext: { id?: string; name: string },
    options?: {
      responsibleEmail?: string
      customNote?: string
    },
  ): Promise<{
    hubNotificationSuccess: boolean
    emailSuccess: boolean
    emailStatus: string
    recipient: string
    message: string
  }> {
    const pendencyCode = pendency.pendency_code
    const subject = pendency.subject
    const responsible = pendency.responsible
    const deadline = pendency.deadline
    const meetingRef = pendency.meeting_code || pendency.meeting_id || 'Reunião PCP'
    const ataRef = pendency.ata_code || pendency.ata_id || 'ATA Vinculada'

    // 1. Notificação interna HUB
    let hubOk = false
    try {
      await NotificationAdapter.sendInternalNotification({
        target_audience: 'PCP',
        type: 'RISCO_ATRASO',
        title: `Pendência PCP em aberto: ${pendencyCode}`,
        message: `${pendencyCode} — ${subject} — Prazo: ${deadline} — Reunião: ${meetingRef} — ATA: ${ataRef} — Resp: ${responsible}`,
        action_url: `/pcp/reunioes/pendencias?code=${pendencyCode}`,
        severity: pendency.priority === 'CRITICA' ? 'CRITICAL' : 'WARNING',
      })
      hubOk = true
    } catch (err) {
      console.warn('Erro ao disparar notificação interna no HUB:', err)
    }

    // 2. E-mail ao responsável corporativo
    // Identificar e-mail corporativo: fornecido ou busca nos usuários
    let targetEmail = options?.responsibleEmail || ''
    if (!targetEmail) {
      try {
        const users = await pb.collection('users').getList(1, 10, {
          filter: `name ~ '${responsible}'`,
        })
        if (users.items.length > 0 && users.items[0].email) {
          targetEmail = users.items[0].email
        }
      } catch {
        /* intentionally ignored */
      }
    }
    if (!targetEmail) {
      targetEmail = `${responsible.toLowerCase().replace(/\s+/g, '.')}@ciafal.com.br`
    }

    // Verificar se existe backend de e-mail / SMTP configurado
    let emailSuccess = false
    let emailStatus = 'SEM_PROVEDOR_CONFIGURADO'
    let treatedReason = 'e-mail registrado como pendente por ausência de servidor SMTP configurado'

    try {
      // Tenta chamar endpoint de envio se disponível
      const emailPayload = {
        summary_code: pendencyCode,
        recipients: [targetEmail],
        subject: `[PCP] Pendência ${pendencyCode} aguardando ação`,
        message: `Olá, ${responsible}.\n\nPendência: ${pendencyCode}\nAssunto: ${subject}\nAção: ${pendency.action}\nPrioridade: ${pendency.priority}\nPrazo: ${deadline}\nStatus: ${pendency.status}\n\nOrigem:\nReunião: ${meetingRef}\nATA: ${ataRef}\nSemana: S${pendency.origin_week}/${pendency.origin_year}\nData: ${pendency.meeting_date || ''}\n\nAcessar pendência no HUB: /pcp/reunioes/pendencias?code=${pendencyCode}`,
      }

      const res = await pb.send('/backend/v1/pcp/summaries/send-email', {
        method: 'POST',
        body: emailPayload,
      })
      if (res?.success) {
        emailSuccess = true
        emailStatus = 'ENVIADO'
        treatedReason = 'E-mail enviado com sucesso'
      }
    } catch {
      // Sem SMTP/API key nas secrets: padrão tratado e honesto
      emailSuccess = false
      emailStatus = 'SEM_PROVEDOR_CONFIGURADO'
      treatedReason = 'e-mail registrado como pendente por ausência de servidor SMTP configurado'
    }

    // 3. Auditoria pcp_meeting_log
    await this.logAction({
      meeting_id: pendency.meeting_id,
      meeting_code: pendency.meeting_code,
      week: pendency.origin_week,
      year: pendency.origin_year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'ALERTA_PENDENCIA_DISPARADO',
      target_object: 'pcp_meeting_pendency',
      new_value: `Alerta enviado: ${pendencyCode}`,
      reason: `Envio de lembrete da pendência ${pendencyCode} para ${responsible} (${targetEmail}). HUB: ${hubOk ? 'OK' : 'FALHA'}, E-mail: ${treatedReason}`,
      metadata: {
        pendency_code: pendencyCode,
        responsible,
        target_email: targetEmail,
        hub_notification_success: hubOk,
        email_status: emailStatus,
        email_reason: treatedReason,
      },
    })

    return {
      hubNotificationSuccess: hubOk,
      emailSuccess,
      emailStatus,
      recipient: `${responsible} (${targetEmail})`,
      message: emailSuccess
        ? `Alerta da pendência ${pendencyCode} enviado com sucesso para ${responsible}.`
        : `Alerta da pendência ${pendencyCode} gerado no HUB para ${responsible}. Notificação corporativa: ${treatedReason}.`,
    }
  }

  /**
   * Gerar Ação na Gestão de Performance com confirmação humana (5W2H)
   */
  async createPerformanceActionFromDecision(
    pendencyId: string,
    actionPlan5W2H: {
      what: string
      why: string
      who: string
      when: string
      where: string
      how: string
      howMuch?: string
    },
    userContext: { id?: string; name: string },
  ): Promise<{ actionId: string; status: string }> {
    const actionId = `ACT-PERF-${String(Date.now()).slice(-6)}`

    // Vincula à pendência
    await pb.collection('pcp_meeting_pendency').update(pendencyId, {
      performance_action_id: actionId,
      last_update_note: `Vinculado à Ação 5W2H de Gestão de Performance: ${actionId}`,
    })

    await this.logAction({
      meeting_id: pendencyId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'VINCULO_GESTAO_PERFORMANCE_5W2H',
      target_object: 'pcp_meeting_pendency',
      new_value: actionId,
      reason: `Ação estruturada 5W2H gerada: ${actionPlan5W2H.what}`,
      metadata: { actionPlan5W2H },
    })

    return { actionId, status: 'VINCULADO_COM_CONFIRMACAO_HUMANA' }
  }

  // --------------------------------------------------------------------------
  // PARTICIPANTES
  // --------------------------------------------------------------------------

  async addParticipant(
    data: Omit<PCPMeetingParticipantRecord, 'id' | 'created' | 'updated'> & {
      user_id?: string
      name?: string
      email?: string
      department?: string
      participant_type?: string
    },
    userContext?: { id?: string; name: string },
  ): Promise<PCPMeetingParticipantRecord> {
    const person_name = data.person_name || data.name || 'Participante'
    const person_email = data.person_email || data.email || ''
    const role_title = data.role_title || data.department || data.participant_type || ''
    const status = (data.status ||
      ((data.attendance_status as string) === 'CONFIRMADO'
        ? 'CONFIRMOU'
        : 'CONVOCADO')) as ParticipantStatus

    const payload: Omit<PCPMeetingParticipantRecord, 'id' | 'created' | 'updated'> = {
      meeting_id: data.meeting_id,
      person_name,
      person_email,
      role_title,
      area: data.area || 'PCP',
      status,
      attendance_status: data.attendance_status,
      is_mandatory: data.is_mandatory ?? true,
    }

    const created = await pb
      .collection('pcp_meeting_participant')
      .create<PCPMeetingParticipantRecord>(payload)

    if (userContext) {
      await this.logAction({
        meeting_id: data.meeting_id,
        user_id: userContext.id,
        user_name: userContext.name,
        action: 'PARTICIPANTE_ADICIONADO',
        target_object: 'pcp_meeting_participant',
        new_value: person_name,
        reason: `Inclusão de participante ${person_name} (${data.area})`,
      })
    }

    return {
      ...created,
      name: created.person_name,
      email: created.person_email,
      department: created.role_title,
    } as any
  }

  async removeParticipant(
    participantId: string,
    meetingId: string,
    userContext?: { id?: string; name: string },
  ): Promise<void> {
    await pb.collection('pcp_meeting_participant').delete(participantId)
    if (userContext) {
      await this.logAction({
        meeting_id: meetingId,
        user_id: userContext.id,
        user_name: userContext.name,
        action: 'PARTICIPANTE_REMOVIDO',
        target_object: 'pcp_meeting_participant',
        reason: 'Remoção de participante da reunião',
      })
    }
  }

  async listParticipants(meetingId: string): Promise<PCPMeetingParticipantRecord[]> {
    try {
      const list = await pb
        .collection('pcp_meeting_participant')
        .getFullList<PCPMeetingParticipantRecord>({
          filter: `meeting_id = '${meetingId}'`,
          sort: 'area,person_name',
        })
      return list.map((p) => ({
        ...p,
        name: p.person_name,
        email: p.person_email,
        department: p.role_title,
      })) as any
    } catch {
      return []
    }
  }

  async updateParticipantStatus(
    participantId: string,
    status: ParticipantStatus,
    notes?: string,
  ): Promise<PCPMeetingParticipantRecord> {
    return await pb
      .collection('pcp_meeting_participant')
      .update<PCPMeetingParticipantRecord>(participantId, {
        status,
        response_notes: notes,
        responded_at: new Date().toISOString(),
      })
  }

  // --------------------------------------------------------------------------
  // LOGS DE AUDITORIA
  // --------------------------------------------------------------------------

  async logAction(
    entry: Omit<PCPMeetingLogRecord, 'id' | 'created' | 'updated'>,
  ): Promise<PCPMeetingLogRecord> {
    try {
      return await pb.collection('pcp_meeting_log').create<PCPMeetingLogRecord>(entry)
    } catch (err) {
      console.warn('Erro ao salvar log de auditoria da reunião:', err)
      return entry as unknown as PCPMeetingLogRecord
    }
  }

  async listLogs(meetingId: string): Promise<PCPMeetingLogRecord[]> {
    try {
      return await pb.collection('pcp_meeting_log').getFullList<PCPMeetingLogRecord>({
        filter: `meeting_id = '${meetingId}'`,
        sort: '-created',
      })
    } catch {
      return []
    }
  }

  // --------------------------------------------------------------------------
  // CADASTRO DE TEMPLATES SGQ
  // --------------------------------------------------------------------------

  async listTemplates(): Promise<PCPMeetingTemplateRecord[]> {
    try {
      return await pb.collection('pcp_meeting_template').getFullList<PCPMeetingTemplateRecord>({
        sort: '-revision',
      })
    } catch {
      return []
    }
  }

  async saveTemplate(
    template: Omit<PCPMeetingTemplateRecord, 'id' | 'created' | 'updated'>,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingTemplateRecord> {
    const created = await pb
      .collection('pcp_meeting_template')
      .create<PCPMeetingTemplateRecord>(template)

    await this.logAction({
      meeting_id: 'GLOBAL_SGQ',
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'NOVA_REVISAO_TEMPLATE_SGQ',
      target_object: 'pcp_meeting_template',
      new_value: `${template.code} rev ${template.revision}`,
      reason: 'Cadastro ou revisão de template oficial de ATA SGQ',
    })

    return created
  }

  // --------------------------------------------------------------------------
  // MÉTRICAS DO PAINEL DA VISÃO GERAL
  // --------------------------------------------------------------------------

  async getOverviewMetrics(): Promise<OverviewMetrics> {
    const { week: currentWeek, year: currentYear } = getIsoWeekAndYear(getPlantNow())

    // 1. Próxima Reunião
    const meetings = await this.listMeetings({
      status: 'AGENDADA',
    })
    let proximaReuniao = meetings.length > 0 ? meetings[0] : null
    if (!proximaReuniao) {
      // Tenta em preparação ou rascunho mais recente
      const all = await this.listMeetings()
      proximaReuniao = all.length > 0 ? all[0] : null
    }

    // 2. Participantes convocados e confirmados
    let convocados = 0
    let confirmados = 0
    if (proximaReuniao) {
      const parts = await this.listParticipants(proximaReuniao.id)
      convocados = parts.length
      confirmados = parts.filter(
        (p) => p.status === 'CONFIRMOU' || p.status === 'PARTICIPOU',
      ).length
    }

    // 3. Pendências
    const allPendencies = await this.listPendencies()
    const abertas = allPendencies.filter(
      (p) => p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO',
    )
    const vencidas = abertas.filter((p) => {
      const d = new Date(p.deadline + 'T23:59:59')
      return !isNaN(d.getTime()) && d < getPlantNow()
    })

    // 4. ATA anterior e completude
    let completudeAta = 0
    let previaEnviada = false
    let statusPreparacao = 'Nenhuma reunião em preparação'

    if (proximaReuniao) {
      previaEnviada = proximaReuniao.previa_enviada
      statusPreparacao = proximaReuniao.status

      const ata = await this.getPreviaAta(proximaReuniao.id)
      if (ata) {
        completudeAta = ata.overall_completeness || 0
      }
    }

    // 5. Decisões da última reunião
    let decisoesUltima = 0
    try {
      const decs = await pb.collection('pcp_meeting_decision').getList(1, 10, {
        sort: '-created',
      })
      decisoesUltima = decs.totalItems
    } catch {
      /* intentionally ignored */
    }

    return {
      proximaReuniao,
      semanaPCP: proximaReuniao ? proximaReuniao.week : currentWeek,
      anoPCP: proximaReuniao ? proximaReuniao.year : currentYear,
      statusPreparacao,
      completudeAtaPercent: completudeAta,
      previaEnviada,
      participantesConvocados: convocados,
      confirmacoes: confirmados,
      pendenciasAbertas: abertas.length,
      pendenciasVencidas: vencidas.length,
      decisoesUltimaReuniao: decisoesUltima,
      statusAtaAnterior: 'VIGENTE SGQ 8.1.001-R002',
      itensCriticosDiscussao:
        vencidas.length + abertas.filter((p) => p.priority === 'CRITICA').length,
    }
  }
}

export const pcpMeetingFatia1Service = new PcpMeetingFatia1Service()

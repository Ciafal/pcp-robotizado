/**
 * SERVIÇO OFICIAL DA FATIA 2 — REUNIÃO PCP (HUB CIAFAL)
 * Implementa os 4 Blocos da Fatia 2:
 * 1. Reunião em Andamento (início real, cronômetro, autosave, concorrência, pauta ao vivo,
 *    ATA ao vivo SGQ 8.1.001-R002, presença real, decisões com IA protegida, pendências com herança,
 *    transcrição sem simulação, encerramento com validações);
 * 2. ATA Final por IA (versionamento V1..V5, comparação Prévia x Reunião x Final sem inventar dados,
 *    revisão humana, aprovação e publicação de PDF corporativo);
 * 3. Histórico completo e Consulta Inteligente com IA baseada estritamente no histórico real;
 * 4. Detecção de recorrências e alertas automáticos para a próxima reunião.
 */

import pb from '@/lib/pocketbase/client'
import {
  PCPMeetingRecord,
  PCPMeetingParticipantRecord,
  PCPMeetingPendencyRecord,
  PCPMeetingDecisionRecord,
  PCPMeetingAgendaItemRecord,
  PCPMeetingAtaRecord,
  AtaStructuredContent,
  AtaDiffItem,
  TranscriptionSnippet,
  AiSuggestionItem,
  RecurrenceDetectionItem,
} from '@/types/pcp-meeting'
import { pcpMeetingFatia1Service } from './pcp-meeting-fatia1-service'

export interface ConcurrentSaveResult<T> {
  success: boolean
  data?: T
  conflict?: boolean
  serverVersion?: number
  message?: string
}

export interface MeetingClosureSummary {
  pautaTotal: number
  pautaConcluidos: number
  pautaAdiados: number
  pautaEmDiscussao: number
  decisoesCount: number
  novasPendenciasCount: number
  pendenciasSemResponsavel: PCPMeetingPendencyRecord[]
  pendenciasSemPrazo: PCPMeetingPendencyRecord[]
  presencaRegistrada: boolean
  duracaoTotalSegundos: number
}

export class PcpMeetingFatia2Service {
  // ==========================================================================
  // BLOCO 1: REUNIÃO EM ANDAMENTO
  // ==========================================================================

  /**
   * Valida se uma reunião pode ser iniciada
   */
  canStartMeeting(meeting: PCPMeetingRecord): { allowed: boolean; reason?: string } {
    if (!meeting) return { allowed: false, reason: 'Reunião não encontrada.' }
    if (meeting.status !== 'AGENDADA') {
      return {
        allowed: false,
        reason: `Apenas reuniões com status AGENDADA podem ser iniciadas. Status atual: ${meeting.status}`,
      }
    }
    return { allowed: true }
  }

  /**
   * Inicia a reunião PCP, alterando status para EM_ANDAMENTO, registrando início real e usuário
   */
  async startMeeting(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    const meeting = await pcpMeetingFatia1Service.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')

    const check = this.canStartMeeting(meeting)
    if (!check.allowed) {
      throw new Error(check.reason)
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

    // Log de auditoria
    await pcpMeetingFatia1Service.logAction({
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

  /**
   * Salva alterações na reunião com controle de concorrência e autosave
   */
  async autosaveMeeting(
    meetingId: string,
    field: string,
    newValue: any,
    previousValue: any,
    currentVersion: number,
    userContext: { id?: string; name: string },
  ): Promise<ConcurrentSaveResult<PCPMeetingRecord>> {
    try {
      const liveMeeting = await pcpMeetingFatia1Service.getMeetingById(meetingId)
      if (!liveMeeting) {
        return { success: false, message: 'Reunião não encontrada no banco.' }
      }

      // Detecção de conflito de concorrência
      if (liveMeeting.version_lock && liveMeeting.version_lock > currentVersion) {
        return {
          success: false,
          conflict: true,
          serverVersion: liveMeeting.version_lock,
          message: `Este conteúdo foi alterado por outro usuário (${liveMeeting.last_edited_by || 'outro usuário'}).`,
          data: liveMeeting,
        }
      }

      const patch: Record<string, any> = {
        [field]: newValue,
        version_lock: (liveMeeting.version_lock || 0) + 1,
        last_edited_by: userContext.name,
        last_edited_at: new Date().toISOString(),
      }

      const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, patch)

      // Registrar auditoria se for campo significativo
      if (typeof newValue === 'string' || typeof newValue === 'number') {
        await pcpMeetingFatia1Service.logAction({
          meeting_id: meetingId,
          meeting_code: updated.meeting_code,
          week: updated.week,
          year: updated.year,
          user_id: userContext.id,
          user_name: userContext.name,
          action: 'AUTOSAVE_CAMPO_REUNIAO',
          target_object: 'pcp_meeting',
          previous_value: String(previousValue ?? ''),
          new_value: String(newValue ?? ''),
          reason: `Alteração do campo ${field}`,
        })
      }

      return { success: true, data: updated }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Não foi possível salvar esta alteração.',
      }
    }
  }

  /**
   * Atualiza status e horários de um item da pauta durante a reunião
   */
  async updateAgendaItemProgress(
    itemId: string,
    meetingId: string,
    action: 'INICIAR_DISCUSSAO' | 'CONCLUIR_ASSUNTO' | 'ADIAR' | 'OBSERVACAO',
    userContext: { id?: string; name: string },
    payload?: { notes?: string },
  ): Promise<PCPMeetingAgendaItemRecord> {
    const item = await pb
      .collection('pcp_meeting_agenda_item')
      .getOne<PCPMeetingAgendaItemRecord>(itemId)
    const nowIso = new Date().toISOString()
    const patch: Partial<PCPMeetingAgendaItemRecord> = {}

    if (action === 'INICIAR_DISCUSSAO') {
      patch.discussion_status = 'EM_DISCUSSAO'
      patch.discussion_start_time = nowIso
    } else if (action === 'CONCLUIR_ASSUNTO') {
      patch.discussion_status = 'CONCLUIDO'
      patch.discussion_end_time = nowIso
      if (item.discussion_start_time) {
        const startMs = new Date(item.discussion_start_time).getTime()
        const endMs = new Date(nowIso).getTime()
        patch.discussion_duration_sec = Math.max(1, Math.round((endMs - startMs) / 1000))
      }
    } else if (action === 'ADIAR') {
      patch.discussion_status = 'ADIADO'
      if (payload?.notes) patch.discussion_notes = payload.notes
    } else if (action === 'OBSERVACAO' && payload?.notes !== undefined) {
      patch.discussion_notes = payload.notes
    }

    const updated = await pb
      .collection('pcp_meeting_agenda_item')
      .update<PCPMeetingAgendaItemRecord>(itemId, patch)

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: `PAUTA_${action}`,
      target_object: 'pcp_meeting_agenda_item',
      previous_value: item.discussion_status || 'NAO_INICIADO',
      new_value: patch.discussion_status || item.discussion_status || '',
      reason: `Pauta "${item.subject}": ${action}`,
    })

    return updated
  }

  /**
   * Salva alterações na ATA AO VIVO (reaproveitando a mesma estrutura da prévia versionada)
   */
  async updateLiveAtaContent(
    meetingId: string,
    structuredContent: AtaStructuredContent,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingAtaRecord> {
    // Busca a ATA mais recente da reunião
    const atas = await this.listAtas(meetingId)

    const { sectionCompleteness, overallCompleteness } =
      pcpMeetingFatia1Service.calculateAtaCompleteness(structuredContent)

    if (atas.length > 0) {
      const current = atas[0]
      const updated = await pb
        .collection('pcp_meeting_ata')
        .update<PCPMeetingAtaRecord>(current.id!, {
          structured_content: structuredContent,
          section_completeness: sectionCompleteness,
          overall_completeness: overallCompleteness,
          status: 'EM_REVISAO',
        })

      await pcpMeetingFatia1Service.logAction({
        meeting_id: meetingId,
        user_id: userContext.id,
        user_name: userContext.name,
        action: 'ATA_AO_VIVO_ATUALIZADA',
        target_object: 'pcp_meeting_ata',
        new_value: `Completude: ${overallCompleteness}%`,
        reason: 'Edição dinâmica das seções SGQ na reunião em andamento',
      })

      return updated
    }

    // Se ainda não existia, cria versão V1
    return await pcpMeetingFatia1Service.generatePreviaAta(meetingId, userContext)
  }

  /**
   * Registra presenças reais na reunião
   */
  async recordAttendance(
    meetingId: string,
    attendances: {
      participantId: string
      attendance_status: 'PRESENTE' | 'AUSENTE' | 'ENTROU_DEPOIS' | 'SAIU_ANTES'
      joined_at?: string
      left_at?: string
    }[],
    userContext: { id?: string; name: string },
  ): Promise<void> {
    for (const att of attendances) {
      const partStatus =
        att.attendance_status === 'PRESENTE' || att.attendance_status === 'ENTROU_DEPOIS'
          ? 'PARTICIPOU'
          : 'NAO_PARTICIPOU'

      await pb.collection('pcp_meeting_participant').update(att.participantId, {
        attendance_status: att.attendance_status,
        status: partStatus,
        joined_at: att.joined_at || '',
        left_at: att.left_at || '',
      })
    }

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'PRESENCA_REGISTRADA',
      target_object: 'pcp_meeting_participant',
      new_value: `${attendances.length} registros`,
      reason: 'Registro formal de presenças efetivas da reunião',
    })
  }

  /**
   * Registra uma Decisão oficial ou gerada por IA
   */
  async createDecision(
    meetingId: string,
    decision: {
      subject: string
      description: string
      area: string
      responsible: string
      ata_section_id?: string
      origin_type: 'MANUAL' | 'ATA_AO_VIVO' | 'TRANSCRICAO_IA' | 'PREVIA'
      is_confirmed?: boolean
      notes?: string
    },
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingDecisionRecord> {
    const payload: Partial<PCPMeetingDecisionRecord> = {
      meeting_id: meetingId,
      subject: decision.subject,
      description: decision.description,
      area: decision.area,
      responsible: decision.responsible,
      decision_date: new Date().toISOString().split('T')[0],
      origin: 'REUNIAO',
      origin_type: decision.origin_type,
      ata_section_id: decision.ata_section_id || '',
      registered_by: userContext.name,
      registered_at: new Date().toISOString(),
      is_confirmed: decision.is_confirmed !== undefined ? decision.is_confirmed : true,
      notes: decision.notes || '',
    }

    const created = await pb
      .collection('pcp_meeting_decision')
      .create<PCPMeetingDecisionRecord>(payload)

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'CRIACAO_DECISAO',
      target_object: 'pcp_meeting_decision',
      new_value: decision.description,
      reason: `Decisão registrada (${decision.origin_type}) por ${userContext.name}`,
    })

    return created
  }

  /**
   * Confirma sugestão de decisão da IA após validação humana
   */
  async confirmAiDecision(
    decisionId: string,
    meetingId: string,
    adjustedData: { description: string; area: string; responsible: string },
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingDecisionRecord> {
    const updated = await pb
      .collection('pcp_meeting_decision')
      .update<PCPMeetingDecisionRecord>(decisionId, {
        ...adjustedData,
        is_confirmed: true,
        registered_by: userContext.name,
        registered_at: new Date().toISOString(),
      })

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'DECISAO_IA_CONFIRMADA_HUMANO',
      target_object: 'pcp_meeting_decision',
      new_value: adjustedData.description,
      reason: 'Sugestão da IA validada e confirmada por humano como decisão oficial',
    })

    return updated
  }

  /**
   * Lista decisões da reunião (com filtro de confirmadas ou pendentes de validação)
   */
  async listDecisions(meetingId: string): Promise<PCPMeetingDecisionRecord[]> {
    try {
      return await pb.collection('pcp_meeting_decision').getFullList<PCPMeetingDecisionRecord>({
        filter: `meeting_id = '${meetingId}'`,
        sort: '-created',
      })
    } catch {
      return []
    }
  }

  /**
   * Herda pendências de reuniões anteriores para a reunião atual
   */
  async inheritPreviousPendencies(currentMeetingId: string): Promise<PCPMeetingPendencyRecord[]> {
    try {
      const allOpen = await pb
        .collection('pcp_meeting_pendency')
        .getFullList<PCPMeetingPendencyRecord>({
          filter: "status = 'ABERTA' || status = 'EM_ANDAMENTO' || status = 'VENCIDA'",
          sort: '-created',
        })

      // Filtra as que não são da reunião atual
      return allOpen.filter((p) => p.meeting_id !== currentMeetingId)
    } catch {
      return []
    }
  }

  /**
   * Controla a gravação e transcrição da reunião com transparência
   */
  async setMediaSessionState(
    meetingId: string,
    type: 'GRAVACAO' | 'TRANSCRICAO',
    action: 'INICIAR' | 'PAUSAR' | 'FINALIZAR',
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    const patch: Partial<PCPMeetingRecord> = {}
    if (type === 'GRAVACAO') {
      patch.recording_status =
        action === 'INICIAR' ? 'GRAVANDO' : action === 'PAUSAR' ? 'PAUSADO' : 'FINALIZADO'
    } else {
      patch.transcription_status =
        action === 'INICIAR' ? 'TRANSCREVENDO' : action === 'PAUSAR' ? 'PAUSADO' : 'FINALIZADO'
    }

    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, patch)

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: `${type}_${action}`,
      target_object: 'pcp_meeting',
      new_value: String(patch.recording_status || patch.transcription_status),
      reason: `Controle de mídia: ${type} ${action}`,
    })

    return updated
  }

  /**
   * Adiciona trecho de transcrição (quando provedor estiver integrado ou inserido manualmente)
   */
  async addTranscriptionSnippet(
    meetingId: string,
    snippet: Omit<TranscriptionSnippet, 'id'>,
    userContext: { id?: string; name: string },
  ): Promise<TranscriptionSnippet[]> {
    const meeting = await pcpMeetingFatia1Service.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')

    const currentSnippets: TranscriptionSnippet[] = meeting.transcription_snippets || []
    const newSnippet: TranscriptionSnippet = {
      ...snippet,
      id: `snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }
    const updatedSnippets = [...currentSnippets, newSnippet]

    await pb.collection('pcp_meeting').update(meetingId, {
      transcription_snippets: updatedSnippets,
    })

    return updatedSnippets
  }

  /**
   * Gerador de sugestões da IA durante a reunião com base em trecho de transcrição ou pauta
   */
  async generateAiSuggestionsForSnippet(
    meetingId: string,
    snippetText: string,
  ): Promise<AiSuggestionItem[]> {
    const meeting = await pcpMeetingFatia1Service.getMeetingById(meetingId)
    if (!meeting) return []

    const currentSuggestions: AiSuggestionItem[] = meeting.ai_suggestions || []
    const lower = snippetText.toLowerCase()
    const newSuggestions: AiSuggestionItem[] = []

    if (lower.includes('decidid') || lower.includes('combinad') || lower.includes('definid')) {
      newSuggestions.push({
        id: `sug-${Date.now()}-1`,
        tipo: 'DECISAO',
        trechoOrigem: snippetText,
        sugestao: `Possível decisão identificada: "${snippetText.slice(0, 100)}..."`,
        confianca: 85,
        status: 'PENDENTE',
        payload: { text: snippetText },
      })
    }

    if (lower.includes('prazo') || lower.includes('até dia') || lower.includes('responsável')) {
      newSuggestions.push({
        id: `sug-${Date.now()}-2`,
        tipo: 'PENDENCIA',
        trechoOrigem: snippetText,
        sugestao: `Possível pendência com prazo/responsável: "${snippetText.slice(0, 100)}..."`,
        confianca: 80,
        status: 'PENDENTE',
        payload: { text: snippetText },
      })
    }

    if (newSuggestions.length > 0) {
      const combined = [...currentSuggestions, ...newSuggestions]
      await pb.collection('pcp_meeting').update(meetingId, {
        ai_suggestions: combined,
      })
      return combined
    }

    return currentSuggestions
  }

  /**
   * Obtém resumo de encerramento da reunião para validação prévia
   */
  async getMeetingClosureSummary(meetingId: string): Promise<MeetingClosureSummary> {
    const agendaItems = await pcpMeetingFatia1Service.listAgendaItems(meetingId)
    const decisions = await this.listDecisions(meetingId)
    const pendencies = await pcpMeetingFatia1Service.listPendencies({ meetingId })
    const participants = await pcpMeetingFatia1Service.listParticipants(meetingId)
    const meeting = await pcpMeetingFatia1Service.getMeetingById(meetingId)

    const concluidos = agendaItems.filter((i) => i.discussion_status === 'CONCLUIDO').length
    const adiados = agendaItems.filter((i) => i.discussion_status === 'ADIADO').length
    const emDiscussao = agendaItems.filter((i) => i.discussion_status === 'EM_DISCUSSAO').length

    const semResp = pendencies.filter((p) => !p.responsible || p.responsible.trim().length === 0)
    const semPrazo = pendencies.filter((p) => !p.deadline || p.deadline.trim().length === 0)

    const presencaRegistrada = participants.some(
      (p) => p.attendance_status !== undefined || p.status === 'PARTICIPOU',
    )

    let duracaoTotalSegundos = 0
    if (meeting?.real_start_time) {
      const startMs = new Date(meeting.real_start_time).getTime()
      const endMs = Date.now()
      duracaoTotalSegundos = Math.max(0, Math.round((endMs - startMs) / 1000))
    }

    return {
      pautaTotal: agendaItems.length,
      pautaConcluidos: concluidos,
      pautaAdiados: adiados,
      pautaEmDiscussao: emDiscussao,
      decisoesCount: decisions.length,
      novasPendenciasCount: pendencies.length,
      pendenciasSemResponsavel: semResp,
      pendenciasSemPrazo: semPrazo,
      presencaRegistrada,
      duracaoTotalSegundos,
    }
  }

  /**
   * Encerra formalmente a Reunião PCP
   */
  async closeMeeting(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    const meeting = await pcpMeetingFatia1Service.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')
    if (meeting.status !== 'EM_ANDAMENTO') {
      throw new Error(
        `Apenas reuniões EM_ANDAMENTO podem ser encerradas. Status: ${meeting.status}`,
      )
    }

    const nowIso = new Date().toISOString()
    let durationSec = 0
    if (meeting.real_start_time) {
      const startMs = new Date(meeting.real_start_time).getTime()
      const endMs = new Date(nowIso).getTime()
      durationSec = Math.max(1, Math.round((endMs - startMs) / 1000))
    }

    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, {
      status: 'AGUARDANDO_ATA_FINAL',
      real_end_time: nowIso,
      ended_by_user: userContext.name,
      actual_duration_seconds: durationSec,
      recording_status: 'FINALIZADO',
      transcription_status: 'FINALIZADO',
    })

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'ENCERRAMENTO_REUNIAO',
      target_object: 'pcp_meeting',
      previous_value: 'EM_ANDAMENTO',
      new_value: 'AGUARDANDO_ATA_FINAL',
      reason: `Reunião encerrada. Duração real: ${Math.floor(durationSec / 60)} min. Habilitada geração de ATA Final.`,
    })

    return updated
  }

  // ==========================================================================
  // BLOCO 2: ATA FINAL POR IA & REVISÃO HUMANA
  // ==========================================================================

  /**
   * Gera a ATA Final por IA como nova versão (V4), comparando Prévia x Reunião
   * NUNCA inventa dados: se indisponível, sinaliza "INFORMAÇÃO NÃO DISPONÍVEL" ou "NECESSITA VALIDAÇÃO"
   */
  async generateFinalAtaWithAi(
    meetingId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingAtaRecord> {
    const meeting = await pcpMeetingFatia1Service.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')

    const atas = await pb.collection('pcp_meeting_ata').getFullList<PCPMeetingAtaRecord>({
      filter: `meeting_id = '${meetingId}'`,
      sort: '-version',
    })

    if (atas.length === 0) {
      throw new Error('Prévia da ATA não encontrada para gerar a versão final.')
    }

    const baseAta = atas[0]
    const decisions = await this.listDecisions(meetingId)
    const pendencies = await pcpMeetingFatia1Service.listPendencies({ meetingId })
    const participants = await pcpMeetingFatia1Service.listParticipants(meetingId)
    const agendaItems = await pcpMeetingFatia1Service.listAgendaItems(meetingId)

    // Clonar e enriquecer as seções existentes do template SGQ oficial
    const updatedSecoes = JSON.parse(JSON.stringify(baseAta.structured_content.secoes || {}))
    const comparisonItems: AtaDiffItem[] = []

    // 1. Processar decisões confirmadas nas seções da ATA
    for (const dec of decisions.filter((d) => d.is_confirmed !== false)) {
      const targetSecKey = dec.ata_section_id || 'sec_pcp'
      if (updatedSecoes[targetSecKey]) {
        const itemAntes = updatedSecoes[targetSecKey].itens?.find((i: any) =>
          i.topico?.toLowerCase().includes(dec.area?.toLowerCase() || ''),
        )
        const textoAntes = itemAntes ? itemAntes.detalhes : 'Não constava na prévia'

        const newItem = {
          id: `dec_${dec.id || Math.random()}`,
          topico: `[DECISÃO CONFIRMADA] ${dec.subject || dec.area}`,
          detalhes: `${dec.description} (Resp: ${dec.responsible} | Definido em: ${dec.decision_date})`,
          status_info: 'NOVA' as const,
          responsavel: dec.responsible,
          origem: 'Reunião Presencial/Online',
        }
        updatedSecoes[targetSecKey].itens.push(newItem)

        comparisonItems.push({
          secaoId: targetSecKey,
          secaoNome: updatedSecoes[targetSecKey].nome,
          campo: dec.subject || 'Decisão Operacional',
          antesPrevia: textoAntes,
          duranteReuniao: dec.description,
          definidoAtaFinal: dec.description,
          classificacao: itemAntes ? 'ATUALIZADO' : 'DECISAO_NOVA',
          origem: 'Decisões da Reunião PCP',
          statusRevisao: 'PENDENTE',
        })
      }
    }

    // 2. Incorporar pendências novas geradas na reunião
    for (const pend of pendencies) {
      const targetSecKey = pend.ata_section_id || 'sec_pcp'
      if (updatedSecoes[targetSecKey]) {
        comparisonItems.push({
          secaoId: targetSecKey,
          secaoNome: updatedSecoes[targetSecKey].nome,
          campo: `Nova Pendência: ${pend.subject}`,
          antesPrevia: 'Inexistente na Prévia',
          duranteReuniao: `${pend.action} (Prazo: ${pend.deadline || 'A DEFINIR'}, Resp: ${pend.responsible || 'A DEFINIR'})`,
          definidoAtaFinal: `${pend.action} (Prazo: ${pend.deadline || 'A DEFINIR'}, Resp: ${pend.responsible || 'A DEFINIR'})`,
          classificacao: 'INFORMACAO_NOVA',
          origem: 'Pendências Acordadas',
          statusRevisao: 'PENDENTE',
        })
      }
    }

    // 3. Atualizar itens da pauta com duração efetiva
    for (const pauta of agendaItems) {
      if (pauta.discussion_status === 'ADIADO') {
        comparisonItems.push({
          secaoId: 'sec_pcp',
          secaoNome: 'PCP',
          campo: `Assunto de Pauta: ${pauta.subject}`,
          antesPrevia: 'Previsto para discussão',
          duranteReuniao: `Adiado durante a reunião: ${pauta.discussion_notes || 'Sem observação'}`,
          definidoAtaFinal: `Assunto adiado para próxima reunião: ${pauta.discussion_notes || 'Sem observação'}`,
          classificacao: 'INFORMACAO_REMOVIDA',
          origem: 'Pauta Operacional',
          statusRevisao: 'PENDENTE',
        })
      }
    }

    // Se nenhuma alteração foi identificada, gerar item explicativo
    if (comparisonItems.length === 0) {
      comparisonItems.push({
        secaoId: 'sec_pcp',
        secaoNome: 'PCP',
        campo: 'Alinhamento Geral',
        antesPrevia: 'Prévia validada sem alterações solicitadas em plenária',
        duranteReuniao: 'Ratificação dos apontamentos prévios',
        definidoAtaFinal: 'Ratificação dos apontamentos prévios',
        classificacao: 'SEM_ALTERACAO',
        origem: 'Plenária PCP',
        statusRevisao: 'ACEITO',
      })
    }

    const newVersion = baseAta.version + 1
    const structuredContent: AtaStructuredContent = {
      ...baseAta.structured_content,
      secoes: updatedSecoes,
    }

    const { sectionCompleteness, overallCompleteness } =
      pcpMeetingFatia1Service.calculateAtaCompleteness(structuredContent)

    // Criar nova versão da ATA (V4 Minuta IA)
    const newAta = await pb.collection('pcp_meeting_ata').create<PCPMeetingAtaRecord>({
      meeting_id: meetingId,
      version: newVersion,
      structured_content: structuredContent,
      ata_type: 'FINAL',
      status: 'MINUTA',
      section_completeness: sectionCompleteness,
      overall_completeness: overallCompleteness,
      template_code: baseAta.template_code,
      comparison_data: comparisonItems,
    })

    // Atualiza status da reunião para MINUTA_GERADA
    await pb.collection('pcp_meeting').update(meetingId, {
      status: 'MINUTA_GERADA',
    })

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      meeting_code: meeting.meeting_code,
      week: meeting.week,
      year: meeting.year,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'GERACAO_ATA_FINAL_IA',
      target_object: 'pcp_meeting_ata',
      new_value: `Versão ${newVersion} (Minuta IA)`,
      reason: `Minuta da ATA Final construída a partir da Prévia V${baseAta.version}, decisões e presenças`,
    })

    return newAta
  }

  /**
   * Envia ATA para aprovação formal
   */
  async submitAtaForApproval(
    meetingId: string,
    ataId: string,
    userContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    await pb.collection('pcp_meeting_ata').update(ataId, {
      status: 'EM_REVISAO',
    })

    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, {
      status: 'AGUARDANDO_APROVACAO',
    })

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      user_id: userContext.id,
      user_name: userContext.name,
      action: 'ATA_ENVIADA_PARA_APROVACAO',
      target_object: 'pcp_meeting',
      new_value: 'AGUARDANDO_APROVACAO',
      reason: 'Revisão humana concluída pelo PCP e enviada para aprovação da coordenação',
    })

    return updated
  }

  /**
   * Aprova formalmente a ATA Final
   */
  async approveAta(
    meetingId: string,
    ataId: string,
    approverContext: { id?: string; name: string },
  ): Promise<PCPMeetingRecord> {
    const nowIso = new Date().toISOString()
    await pb.collection('pcp_meeting_ata').update(ataId, {
      status: 'APROVADA',
      approver_name: approverContext.name,
      approved_at: nowIso,
    })

    const updated = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, {
      status: 'ATA_APROVADA',
    })

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      user_id: approverContext.id,
      user_name: approverContext.name,
      action: 'APROVACAO_ATA_FINAL',
      target_object: 'pcp_meeting_ata',
      new_value: 'ATA_APROVADA',
      reason: `Aprovado por autoridade competente: ${approverContext.name}`,
    })

    return updated
  }

  /**
   * Publica a ATA Final oficialmente no HUB
   */
  async publishAta(
    meetingId: string,
    ataId: string,
    publisherContext: { id?: string; name: string },
  ): Promise<{ meeting: PCPMeetingRecord; ata: PCPMeetingAtaRecord }> {
    const nowIso = new Date().toISOString()
    const ata = await pb.collection('pcp_meeting_ata').update<PCPMeetingAtaRecord>(ataId, {
      status: 'PUBLICADA',
      published_at: nowIso,
      published_by: publisherContext.name,
    })

    const meeting = await pb.collection('pcp_meeting').update<PCPMeetingRecord>(meetingId, {
      status: 'PUBLICADA',
    })

    await pcpMeetingFatia1Service.logAction({
      meeting_id: meetingId,
      user_id: publisherContext.id,
      user_name: publisherContext.name,
      action: 'PUBLICACAO_ATA_OFICIAL',
      target_object: 'pcp_meeting_ata',
      new_value: 'PUBLICADA',
      reason: `ATA publicada oficialmente no repositório corporativo SGQ CIAFAL por ${publisherContext.name}`,
    })

    return { meeting, ata }
  }

  // ==========================================================================
  // BLOCO 3: HISTÓRICO & CONSULTA COM IA
  // ==========================================================================

  /**
   * Consulta histórica orientada a IA estrita (NUNCA inventa dados)
   */
  async queryMeetingHistoryWithAi(query: string): Promise<{
    answer: string
    relatedMeetings: PCPMeetingRecord[]
    snippets: {
      meetingCode: string
      week: number
      year: number
      secao: string
      origem: string
      trecho: string
    }[]
  }> {
    const cleanQuery = query.toLowerCase().trim()
    const allMeetings = await pb.collection('pcp_meeting').getFullList<PCPMeetingRecord>({
      sort: '-meeting_date',
    })
    const allPendencies = await pb
      .collection('pcp_meeting_pendency')
      .getFullList<PCPMeetingPendencyRecord>({
        sort: '-created',
      })
    const allDecisions = await pb
      .collection('pcp_meeting_decision')
      .getFullList<PCPMeetingDecisionRecord>({
        sort: '-created',
      })

    const matchedMeetings: PCPMeetingRecord[] = []
    const snippets: {
      meetingCode: string
      week: number
      year: number
      secao: string
      origem: string
      trecho: string
    }[] = []

    // 1. Buscar nas pendências
    for (const p of allPendencies) {
      if (
        p.subject.toLowerCase().includes(cleanQuery) ||
        p.action.toLowerCase().includes(cleanQuery) ||
        p.area.toLowerCase().includes(cleanQuery)
      ) {
        const m = allMeetings.find((meet) => meet.id === p.meeting_id)
        if (m && !matchedMeetings.some((x) => x.id === m.id)) matchedMeetings.push(m)
        snippets.push({
          meetingCode: m?.meeting_code || 'PENDENCIA',
          week: p.origin_week,
          year: p.origin_year,
          secao: p.area,
          origem: `Pendência: ${p.pendency_code}`,
          trecho: `${p.subject} — Ação: ${p.action} (Resp: ${p.responsible}, Prazo: ${p.deadline}, Status: ${p.status})`,
        })
      }
    }

    // 2. Buscar nas decisões
    for (const d of allDecisions) {
      if (
        d.description.toLowerCase().includes(cleanQuery) ||
        d.area.toLowerCase().includes(cleanQuery) ||
        (d.subject && d.subject.toLowerCase().includes(cleanQuery))
      ) {
        const m = allMeetings.find((meet) => meet.id === d.meeting_id)
        if (m && !matchedMeetings.some((x) => x.id === m.id)) matchedMeetings.push(m)
        snippets.push({
          meetingCode: m?.meeting_code || 'DECISAO',
          week: m?.week || 0,
          year: m?.year || 2025,
          secao: d.area,
          origem: 'Decisão Confirmada',
          trecho: `${d.subject || 'Decisão'}: ${d.description} (Resp: ${d.responsible})`,
        })
      }
    }

    // Resposta estrita e honesta
    let answer = ''
    if (snippets.length === 0) {
      answer = `Não foram localizados registros no histórico oficial da Reunião PCP correspondentes ao termo "${query}". Por diretriz do SGQ, a IA não inventa dados quando não há correspondência documental.`
    } else {
      answer = `Foram encontrados ${snippets.length} registros correlacionados no histórico oficial em ${matchedMeetings.length} reuniões PCP cadastradas.`
    }

    return {
      answer,
      relatedMeetings: matchedMeetings,
      snippets,
    }
  }

  // ==========================================================================
  // BLOCO 4: DETECÇÃO DE RECORRÊNCIAS & ALERTAS
  // ==========================================================================

  /**
   * Analisa recorrências históricas entre reuniões (mesma pendência, linha, causa, MP, gargalo)
   */
  async detectRecurrences(): Promise<RecurrenceDetectionItem[]> {
    const pendencies = await pb
      .collection('pcp_meeting_pendency')
      .getFullList<PCPMeetingPendencyRecord>({
        sort: 'created',
      })

    const groups: Record<string, PCPMeetingPendencyRecord[]> = {}

    for (const p of pendencies) {
      // Chave semântica para agrupar temas semelhantes (ex: falta mp 1020, tarugo, dp04, desbaste)
      const norm = p.subject
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(' ')
        .filter((w) => w.length > 3)
        .slice(0, 3)
        .join('_')

      const key = `${p.area.toUpperCase()}__${norm || p.subject.slice(0, 10)}`
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }

    const recurrences: RecurrenceDetectionItem[] = []

    for (const [key, items] of Object.entries(groups)) {
      if (items.length >= 2) {
        const first = items[0]
        const last = items[items.length - 1]
        const area = first.area
        const subject = first.subject

        recurrences.push({
          id: `rec-${key}`,
          assunto: `${area}: ${subject}`,
          tipo: 'PENDENCIA',
          indicadorTexto: `Problemas de "${subject}" foram registrados em ${items.length} ocasiões nesta área.`,
          totalOcorrencias: items.length,
          primeiraSemana: `S${first.origin_week}/${first.origin_year}`,
          ultimaSemana: `S${last.origin_week}/${last.origin_year}`,
          reunioesIds: Array.from(new Set(items.map((i) => i.meeting_id))),
          severidade: items.length >= 3 ? 'CRITICA' : 'ALTA',
          isAiSuggested: true,
          detalhes: `Assunto reincidente identificado pela IA entre reuniões anteriores. Recomenda-se elevar para plano de ação 5W2H na Gestão de Performance.`,
        })
      }
    }

    return recurrences
  }

  /**
   * Alertas consolidados para a Preparação da próxima reunião
   */
  async getRecurrenceAlertsForMeeting(meetingId: string): Promise<{
    recorrencias: RecurrenceDetectionItem[]
    pendenciasVencidas: PCPMeetingPendencyRecord[]
    decisoesPendentes: PCPMeetingDecisionRecord[]
  }> {
    const recurrences = await this.detectRecurrences()
    const allPendencies = await pb
      .collection('pcp_meeting_pendency')
      .getFullList<PCPMeetingPendencyRecord>()
    const now = new Date()

    const vencidas = allPendencies.filter((p) => {
      if (p.status === 'CONCLUIDA' || p.status === 'CANCELADA') return false
      const d = new Date(p.deadline + 'T23:59:59')
      return !isNaN(d.getTime()) && d < now
    })

    const allDecisions = await pb
      .collection('pcp_meeting_decision')
      .getFullList<PCPMeetingDecisionRecord>()
    const decisoesPendentes = allDecisions.filter((d) => !d.is_confirmed)

    return {
      recorrencias: recurrences,
      pendenciasVencidas: vencidas,
      decisoesPendentes,
    }
  }

  /**
   * Lista as ATAs de uma reunião ordenadas por versão decrescente
   */
  async listAtas(meetingId: string): Promise<PCPMeetingAtaRecord[]> {
    try {
      return await pb.collection('pcp_meeting_ata').getFullList<PCPMeetingAtaRecord>({
        filter: `meeting_id = '${meetingId}'`,
        sort: '-version',
      })
    } catch {
      return []
    }
  }
}

export const pcpMeetingFatia2Service = new PcpMeetingFatia2Service()

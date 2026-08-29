import pb from '@/lib/pocketbase/client'
import {
  PCPMeeting,
  PCPMeetingMinute,
  PCPMinuteItem,
  PreMeetingBriefing,
  ItemStatus,
  ParticipantResponseStatus,
} from '@/types/pcp-meetings-comms'

export const pcpMeetingService = {
  /**
   * Lista reuniões com filtros
   */
  async listMeetings(options?: {
    status?: string
    week?: string
    lineCode?: string
    limit?: number
  }): Promise<PCPMeeting[]> {
    const filters: string[] = []
    if (options?.status && options.status !== 'ALL') {
      filters.push(`status = '${options.status}'`)
    }
    if (options?.week && options.week !== 'ALL') {
      filters.push(`reference_week = '${options.week}'`)
    }
    const filterString = filters.join(' && ')

    const records = await pb.collection('pcp_meetings').getFullList({
      filter: filterString,
      sort: '-meeting_date,-meeting_time',
      expand: 'organizer_id,conductor_id,minute_taker_id',
    })

    let results = records.map((r: any) => this.mapMeetingRecord(r))
    if (options?.lineCode && options.lineCode !== 'ALL') {
      results = results.filter((m) => m.involved_lines?.includes(options.lineCode!))
    }
    return results
  },

  /**
   * Obtém a próxima reunião de PCP agendada
   */
  async getNextMeeting(): Promise<PCPMeeting | null> {
    const today = new Date().toISOString().split('T')[0]
    try {
      const records = await pb.collection('pcp_meetings').getList(1, 1, {
        filter: `status = 'AGENDADA' || status = 'EM_ANDAMENTO'`,
        sort: 'meeting_date,meeting_time',
        expand: 'organizer_id,conductor_id,minute_taker_id',
      })
      if (records.items.length > 0) {
        return this.mapMeetingRecord(records.items[0])
      }
    } catch {
      /* intentionally ignored */
    }

    // Fallback: buscar a mais recente criada
    const all = await this.listMeetings({ limit: 1 })
    return all.length > 0 ? all[0] : null
  },

  /**
   * Obtém reunião por ID
   */
  async getMeetingById(id: string): Promise<PCPMeeting | null> {
    try {
      const r = await pb.collection('pcp_meetings').getOne(id, {
        expand: 'organizer_id,conductor_id,minute_taker_id',
      })
      return this.mapMeetingRecord(r)
    } catch (_) {
      return null
    }
  },

  /**
   * Cria nova reunião de PCP e gera convites
   */
  async createMeeting(payload: Partial<PCPMeeting>): Promise<PCPMeeting> {
    const user = pb.authStore.record
    const timestamp = Date.now().toString().slice(-4)
    const code =
      payload.code ||
      `MEET-PCP-${payload.reference_week?.replace(/[^a-zA-Z0-9]/g, '') || 'W' + timestamp}-${timestamp}`

    const recordData = {
      code,
      title:
        payload.title ||
        `Reunião Semanal de PCP - ${payload.reference_week || 'Semana ' + timestamp}`,
      reference_week: payload.reference_week || `Semana ${new Date().toLocaleDateString('pt-BR')}`,
      meeting_date: payload.meeting_date || new Date().toISOString().split('T')[0],
      meeting_time: payload.meeting_time || '15:00',
      duration_minutes: payload.duration_minutes || 60,
      modality: payload.modality || 'PRESENCIAL',
      location: payload.location || 'Sala de Reuniões PCP - Prédio Administrativo',
      online_link: payload.online_link || '',
      organizer_id: payload.organizer_id || user?.id,
      conductor_id: payload.conductor_id || user?.id,
      minute_taker_id: payload.minute_taker_id || user?.id,
      status: 'AGENDADA',
      agenda_topics: payload.agenda_topics || [
        {
          id: '1',
          title: '1. Abertura e Alinhamento de Indicadores Gerais',
          order: 1,
          duration_minutes: 10,
        },
        {
          id: '2',
          title: '2. Avaliação das Linhas e Aderência do Sequenciamento',
          order: 2,
          duration_minutes: 20,
        },
        {
          id: '3',
          title: '3. Status das Pendências da Reunião Anterior',
          order: 3,
          duration_minutes: 15,
        },
        {
          id: '4',
          title: '4. Restrições de Matéria-Prima, Qualidade e Manutenção',
          order: 4,
          duration_minutes: 10,
        },
        { id: '5', title: '5. Decisões Oficiais e Próximos Passos', order: 5, duration_minutes: 5 },
      ],
      mandatory_participants: payload.mandatory_participants || [],
      optional_participants: payload.optional_participants || [],
      involved_sectors: payload.involved_sectors || ['PCP', 'PRODUCAO', 'QUALIDADE', 'MANUTENCAO'],
      involved_lines: payload.involved_lines || ['L01', 'L02', 'L03', 'L04'],
      general_notes: payload.general_notes || '',
      reschedule_history: [],
      pre_meeting_briefing: null,
      audio_transcript_status: 'NONE',
    }

    const created = await pb.collection('pcp_meetings').create(recordData)

    // Log de auditoria
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id,
        user_email: user?.email,
        user_name: user?.name || user?.email,
        user_role: user?.role || 'PCP_ADMIN',
        event_type: 'SCHEDULE_ACTION',
        action: 'MEETING_CREATED',
        resource: 'PCP_MEETINGS',
        resource_id: created.id,
        permission_required: 'pcp.meeting.create',
        outcome: 'SUCCESS',
        details: { code, title: recordData.title, meeting_date: recordData.meeting_date },
      })
    } catch {
      /* intentionally ignored */
    }

    return this.mapMeetingRecord(created)
  },

  /**
   * Atualiza / Edita dados da reunião
   */
  async updateMeeting(id: string, data: Partial<PCPMeeting>): Promise<PCPMeeting> {
    const updated = await pb.collection('pcp_meetings').update(id, data)
    return this.mapMeetingRecord(updated)
  },

  /**
   * Remarcação de reunião com rastreabilidade obrigatória
   */
  async rescheduleMeeting(
    id: string,
    params: {
      newDate: string
      newTime: string
      reason: string
      currentMeeting: PCPMeeting
    },
  ): Promise<PCPMeeting> {
    const user = pb.authStore.record
    const history: any[] = params.currentMeeting.reschedule_history || []

    const rescheduleEntry = {
      previous_date: params.currentMeeting.meeting_date,
      previous_time: params.currentMeeting.meeting_time,
      new_date: params.newDate,
      new_time: params.newTime,
      reason: params.reason,
      changed_by: user?.name || user?.email || 'Usuário PCP',
      changed_at: new Date().toISOString(),
    }
    history.push(rescheduleEntry)

    const updated = await pb.collection('pcp_meetings').update(id, {
      meeting_date: params.newDate,
      meeting_time: params.newTime,
      status: 'REMARCADA',
      reschedule_history: history,
    })

    // Log de auditoria
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id,
        user_email: user?.email,
        user_name: user?.name || user?.email,
        user_role: user?.role || 'PCP_ADMIN',
        event_type: 'SCHEDULE_ACTION',
        action: 'MEETING_RESCHEDULED',
        resource: 'PCP_MEETINGS',
        resource_id: id,
        permission_required: 'pcp.meeting.create',
        outcome: 'SUCCESS',
        details: rescheduleEntry,
      })
    } catch {
      /* intentionally ignored */
    }

    return this.mapMeetingRecord(updated)
  },

  /**
   * Atualiza resposta de participação do usuário
   */
  async respondParticipant(
    meetingId: string,
    status: ParticipantResponseStatus,
    declineReason?: string,
  ): Promise<PCPMeeting> {
    const user = pb.authStore.record
    if (!user) throw new Error('Não autenticado')

    const meeting = await this.getMeetingById(meetingId)
    if (!meeting) throw new Error('Reunião não encontrada')

    const updateList = (list: any[]) =>
      list.map((p) => {
        if (p.user_id === user.id || p.email === user.email) {
          return {
            ...p,
            status,
            responded_at: new Date().toISOString(),
            decline_reason: declineReason || p.decline_reason,
          }
        }
        return p
      })

    const mandatory = updateList(meeting.mandatory_participants || [])
    const optional = updateList(meeting.optional_participants || [])

    return await this.updateMeeting(meetingId, {
      mandatory_participants: mandatory,
      optional_participants: optional,
    })
  },

  /**
   * Inicia reunião (muda status para EM_ANDAMENTO)
   */
  async startMeeting(meetingId: string): Promise<PCPMeeting> {
    return await this.updateMeeting(meetingId, { status: 'EM_ANDAMENTO' })
  },

  /**
   * Encerra reunião (muda status para CONCLUIDA)
   */
  async finishMeeting(meetingId: string): Promise<PCPMeeting> {
    return await this.updateMeeting(meetingId, { status: 'CONCLUIDA' })
  },

  // -------------------------------------------------------------
  // ATAS E ITENS DE REUNIÃO
  // -------------------------------------------------------------

  /**
   * Lista itens de ATA / Reunião
   */
  async listMinuteItems(options?: {
    meetingId?: string
    classification?: string
    status?: string
    lineCode?: string
    isOperationalOnly?: boolean
  }): Promise<PCPMinuteItem[]> {
    const filters: string[] = []
    if (options?.meetingId) {
      filters.push(`meeting_id = '${options.meetingId}'`)
    }
    if (options?.classification && options.classification !== 'ALL') {
      filters.push(`classification = '${options.classification}'`)
    }
    if (options?.status && options.status !== 'ALL') {
      filters.push(`status = '${options.status}'`)
    }
    if (options?.isOperationalOnly) {
      filters.push(`is_active_operational = true`)
    }

    const filterString = filters.join(' && ')
    const records = await pb.collection('pcp_minute_items').getFullList({
      filter: filterString,
      sort: '-created',
      expand: 'responsible_user_id,meeting_id',
    })

    let results = records.map((r: any) => this.mapMinuteItemRecord(r))
    if (options?.lineCode && options.lineCode !== 'ALL') {
      results = results.filter((item) =>
        item.line_codes?.some(
          (c) => c.toLowerCase() === options.lineCode!.toLowerCase() || options.lineCode === 'ALL',
        ),
      )
    }
    return results
  },

  /**
   * Cria item de ATA (Decisão, Pendência, Alerta, Risco, Comunicado, etc.)
   */
  async createMinuteItem(payload: Partial<PCPMinuteItem>): Promise<PCPMinuteItem> {
    const user = pb.authStore.record
    const timestamp = Date.now().toString().slice(-4)
    const item_code =
      payload.item_code || `ITEM-${payload.classification?.slice(0, 3) || 'PCP'}-${timestamp}`

    const recordData = {
      meeting_id: payload.meeting_id,
      minute_id: payload.minute_id || null,
      item_code,
      topic_title: payload.topic_title || 'Geral',
      classification: payload.classification || 'PENDENCIA',
      category: payload.category || 'GERAL',
      title: payload.title || 'Novo Registro',
      description: payload.description || '',
      impact_level: payload.impact_level || 'MEDIO',
      responsible_user_id: payload.responsible_user_id || null,
      responsible_name: payload.responsible_name || 'A Definir',
      sector: payload.sector || 'PCP',
      deadline: payload.deadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: payload.status || 'ABERTA',
      is_ai_generated: !!payload.is_ai_generated,
      ai_confidence_score: payload.ai_confidence_score || null,
      line_codes: payload.line_codes || [],
      line_ids: payload.line_ids || [],
      product_code: payload.product_code || '',
      product_name: payload.product_name || '',
      material_code: payload.material_code || '',
      production_order: payload.production_order || '',
      customer_order: payload.customer_order || '',
      customer_name: payload.customer_name || '',
      schedule_code: payload.schedule_code || '',
      reference_week: payload.reference_week || '',
      valid_from: payload.valid_from || new Date().toISOString().split('T')[0],
      valid_until: payload.valid_until || '',
      is_active_operational:
        payload.is_active_operational !== undefined ? payload.is_active_operational : true,
      history_log: [
        {
          timestamp: new Date().toISOString(),
          user_name: user?.name || user?.email || 'Sistema PCP',
          from_status: 'CRIADO',
          to_status: payload.status || 'ABERTA',
          note: 'Item registrado na reunião de PCP.',
        },
      ],
      attachments: payload.attachments || [],
    }

    const created = await pb.collection('pcp_minute_items').create(recordData)

    // Se for ALERTA ou RISCO, criar também em pcp_alerts se vinculado a linha para sinergia
    if (
      (payload.classification === 'ALERTA' || payload.classification === 'RISCO') &&
      payload.line_ids &&
      payload.line_ids.length > 0
    ) {
      try {
        for (const lineId of payload.line_ids) {
          await pb.collection('pcp_alerts').create({
            title: `[Reunião PCP] ${payload.title}`,
            severity: payload.classification === 'RISCO' ? 'critical' : 'warning',
            message: payload.description,
            line_id: lineId,
            category: payload.category || 'REUNIAO_PCP',
            acknowledged: false,
          })
        }
      } catch {
        /* intentionally ignored */
      }
    }

    return this.mapMinuteItemRecord(created)
  },

  /**
   * Atualiza status de item de ATA (reflete em todas as visualizações)
   */
  async updateMinuteItemStatus(
    itemId: string,
    newStatus: ItemStatus,
    note?: string,
  ): Promise<PCPMinuteItem> {
    const user = pb.authStore.record
    const item = await pb.collection('pcp_minute_items').getOne(itemId)
    const history: any[] = item.history_log || []

    history.push({
      timestamp: new Date().toISOString(),
      user_name: user?.name || user?.email || 'Usuário PCP',
      from_status: item.status,
      to_status: newStatus,
      note: note || `Status alterado para ${newStatus}`,
    })

    const updatePayload: any = {
      status: newStatus,
      history_log: history,
    }

    if (newStatus === 'CONCLUIDA' || newStatus === 'CANCELADA') {
      updatePayload.concluded_at = new Date().toISOString()
      updatePayload.concluded_by_id = user?.id
      updatePayload.conclusion_notes = note || 'Concluído na gestão de reuniões PCP.'
      // Se concluída ou cancelada, desativa da tela operacional ativa
      updatePayload.is_active_operational = false
    }

    if (newStatus === 'VALIDADO_HUMANO') {
      updatePayload.validated_at = new Date().toISOString()
      updatePayload.validated_by_id = user?.id
      updatePayload.status = 'ABERTA'
    }

    const updated = await pb.collection('pcp_minute_items').update(itemId, updatePayload)
    return this.mapMinuteItemRecord(updated)
  },

  /**
   * Lista ou cria a ATA da reunião
   */
  async getOrCreateMinute(meeting: PCPMeeting): Promise<PCPMeetingMinute> {
    try {
      const records = await pb.collection('pcp_meeting_minutes').getList(1, 1, {
        filter: `meeting_id = '${meeting.id}'`,
        sort: '-version',
      })
      if (records.items.length > 0) {
        return this.mapMinuteRecord(records.items[0])
      }
    } catch {
      /* intentionally ignored */
    }

    // Criar rascunho de ATA
    const newMinute = await pb.collection('pcp_meeting_minutes').create({
      meeting_id: meeting.id,
      meeting_code: meeting.code,
      reference_week: meeting.reference_week,
      title: `ATA Oficial - ${meeting.title}`,
      version: 1,
      status: 'REVISAO_PCP',
      executive_summary:
        meeting.pre_meeting_briefing?.executive_summary ||
        `ATA da Reunião de PCP realizada em ${meeting.meeting_date}. Pauta e deliberações técnicas registradas no sistema.`,
      topics_payload: [],
      participants_present: meeting.mandatory_participants
        ?.filter((p) => p.status === 'ACCEPTED')
        .map((p) => ({ user_id: p.user_id, name: p.name, email: p.email })),
    })

    return this.mapMinuteRecord(newMinute)
  },

  /**
   * Publica ATA Oficial e dispara notificações/e-mails
   */
  async publishMinute(minuteId: string): Promise<PCPMeetingMinute> {
    const user = pb.authStore.record
    const minute = await pb.collection('pcp_meeting_minutes').getOne(minuteId)

    const updated = await pb.collection('pcp_meeting_minutes').update(minuteId, {
      status: 'PUBLICADA',
      published_by_id: user?.id,
      published_by_name: user?.name || user?.email,
      published_at: new Date().toISOString(),
      email_dispatched_at: new Date().toISOString(),
    })

    // Log de auditoria
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id,
        user_email: user?.email,
        user_name: user?.name || user?.email,
        user_role: user?.role || 'PCP_ADMIN',
        event_type: 'SCHEDULE_ACTION',
        action: 'MINUTE_PUBLISHED',
        resource: 'PCP_MEETING_MINUTES',
        resource_id: minuteId,
        permission_required: 'pcp.meeting.publish',
        outcome: 'SUCCESS',
        details: { meeting_id: minute.meeting_id, version: minute.version },
      })
    } catch {
      /* intentionally ignored */
    }

    return this.mapMinuteRecord(updated)
  },

  // Helpers de Mapeamento
  mapMeetingRecord(r: any): PCPMeeting {
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      reference_week: r.reference_week,
      meeting_date: r.meeting_date,
      meeting_time: r.meeting_time,
      duration_minutes: r.duration_minutes || 60,
      modality: r.modality,
      location: r.location,
      online_link: r.online_link,
      organizer_id: r.organizer_id,
      conductor_id: r.conductor_id,
      minute_taker_id: r.minute_taker_id,
      status: r.status,
      agenda_topics: r.agenda_topics || [],
      mandatory_participants: r.mandatory_participants || [],
      optional_participants: r.optional_participants || [],
      involved_sectors: r.involved_sectors || [],
      involved_lines: r.involved_lines || [],
      general_notes: r.general_notes,
      reschedule_history: r.reschedule_history || [],
      pre_meeting_briefing: r.pre_meeting_briefing,
      pre_meeting_generated_at: r.pre_meeting_generated_at,
      audio_recording_url: r.audio_recording_url,
      audio_transcript_status: r.audio_transcript_status,
      audio_transcript_text: r.audio_transcript_text,
      created: r.created,
      updated: r.updated,
      expand: r.expand,
    }
  },

  mapMinuteRecord(r: any): PCPMeetingMinute {
    return {
      id: r.id,
      meeting_id: r.meeting_id,
      meeting_code: r.meeting_code,
      reference_week: r.reference_week,
      title: r.title,
      version: r.version,
      status: r.status,
      executive_summary: r.executive_summary,
      topics_payload: r.topics_payload || [],
      participants_present: r.participants_present || [],
      reviewed_by_id: r.reviewed_by_id,
      reviewed_by_name: r.reviewed_by_name,
      reviewed_at: r.reviewed_at,
      published_by_id: r.published_by_id,
      published_by_name: r.published_by_name,
      published_at: r.published_at,
      email_dispatched_at: r.email_dispatched_at,
      email_recipients: r.email_recipients || [],
      created: r.created,
      updated: r.updated,
    }
  },

  mapMinuteItemRecord(r: any): PCPMinuteItem {
    return {
      id: r.id,
      meeting_id: r.meeting_id,
      minute_id: r.minute_id,
      item_code: r.item_code,
      topic_title: r.topic_title,
      classification: r.classification,
      category: r.category,
      title: r.title,
      description: r.description,
      impact_level: r.impact_level,
      responsible_user_id: r.responsible_user_id,
      responsible_name: r.responsible_name,
      sector: r.sector,
      deadline: r.deadline,
      status: r.status,
      is_ai_generated: !!r.is_ai_generated,
      ai_confidence_score: r.ai_confidence_score,
      validated_by_id: r.validated_by_id,
      validated_at: r.validated_at,
      line_codes: r.line_codes || [],
      line_ids: r.line_ids || [],
      product_code: r.product_code,
      product_name: r.product_name,
      material_code: r.material_code,
      production_order: r.production_order,
      customer_order: r.customer_order,
      customer_name: r.customer_name,
      schedule_code: r.schedule_code,
      reference_week: r.reference_week,
      valid_from: r.valid_from,
      valid_until: r.valid_until,
      is_active_operational: r.is_active_operational,
      conclusion_notes: r.conclusion_notes,
      concluded_at: r.concluded_at,
      concluded_by_id: r.concluded_by_id,
      history_log: r.history_log || [],
      attachments: r.attachments || [],
      created: r.created,
      updated: r.updated,
      expand: r.expand,
    }
  },
}

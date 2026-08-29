import pb from '@/lib/pocketbase/client'
import {
  PCPCommunication,
  PCPCommunicationRead,
  PCPInboxItem,
  CommunicationStatus,
} from '@/types/pcp-meetings-comms'

export const pcpCommunicationService = {
  /**
   * Lista comunicados com filtros avançados
   */
  async listCommunications(options?: {
    status?: string
    commType?: string
    criticality?: string
    lineCode?: string
    requiresAck?: boolean
    onlyActive?: boolean
  }): Promise<PCPCommunication[]> {
    const filters: string[] = []
    const today = new Date().toISOString().split('T')[0]

    if (options?.status && options.status !== 'ALL') {
      filters.push(`status = '${options.status}'`)
    }
    if (options?.commType && options.commType !== 'ALL') {
      filters.push(`comm_type = '${options.commType}'`)
    }
    if (options?.criticality && options.criticality !== 'ALL') {
      filters.push(`criticality = '${options.criticality}'`)
    }
    if (options?.requiresAck) {
      filters.push(`requires_acknowledgement = true`)
    }
    if (options?.onlyActive) {
      filters.push(`status = 'VIGENTE' && valid_from <= '${today}'`)
    }

    const filterString = filters.join(' && ')
    const records = await pb.collection('pcp_communications').getFullList({
      filter: filterString,
      sort: '-created',
      expand: 'author_id,approver_id',
    })

    const user = pb.authStore.record
    let readsMap: Record<string, PCPCommunicationRead> = {}
    if (user?.id) {
      try {
        const reads = await pb.collection('pcp_communication_reads').getFullList({
          filter: `user_id = '${user.id}'`,
        })
        reads.forEach((rd: any) => {
          readsMap[rd.communication_id] = rd
        })
      } catch {
        /* intentionally ignored */
      }
    }

    let results = records.map((r: any) => {
      const comm = this.mapCommRecord(r)
      const userRead = readsMap[comm.id]
      comm.user_read_state = {
        is_read: !!userRead?.read_at,
        is_acknowledged: !!userRead?.acknowledged_at,
        read_at: userRead?.read_at,
        acknowledged_at: userRead?.acknowledged_at,
      }
      return comm
    })

    if (options?.lineCode && options.lineCode !== 'ALL') {
      results = results.filter(
        (c) =>
          c.target_line_codes?.includes(options.lineCode!) ||
          c.target_audience_type === 'TODOS' ||
          c.target_audience_type === 'PCP' ||
          c.target_audience_type === 'OPERACAO',
      )
    }

    return results
  },

  /**
   * Obtém comunicado por ID
   */
  async getCommunicationById(id: string): Promise<PCPCommunication | null> {
    try {
      const r = await pb.collection('pcp_communications').getOne(id, {
        expand: 'author_id,approver_id',
      })
      const comm = this.mapCommRecord(r)
      const user = pb.authStore.record
      if (user?.id) {
        try {
          const reads = await pb.collection('pcp_communication_reads').getList(1, 1, {
            filter: `communication_id = '${id}' && user_id = '${user.id}'`,
          })
          if (reads.items.length > 0) {
            const rd = reads.items[0]
            comm.user_read_state = {
              is_read: !!rd.read_at,
              is_acknowledged: !!rd.acknowledged_at,
              read_at: rd.read_at,
              acknowledged_at: rd.acknowledged_at,
            }
          }
        } catch {
          /* intentionally ignored */
        }
      }
      return comm
    } catch (_) {
      return null
    }
  },

  /**
   * Cria novo comunicado
   */
  async createCommunication(payload: Partial<PCPCommunication>): Promise<PCPCommunication> {
    const user = pb.authStore.record
    const timestamp = Date.now().toString().slice(-4)
    const code = payload.code || `COM-${payload.comm_type?.slice(0, 3) || 'PCP'}-${timestamp}`

    const recordData = {
      code,
      title: payload.title || 'Novo Comunicado PCP',
      summary: payload.summary || '',
      content: payload.content || '',
      comm_type: payload.comm_type || 'INFORMATIVO',
      criticality: payload.criticality || 'NORMAL',
      origin_type: payload.origin_type || 'MANUAL',
      origin_ref_id: payload.origin_ref_id || '',
      origin_ref_code: payload.origin_ref_code || '',
      status: payload.status || 'VIGENTE',
      published_at: payload.status === 'VIGENTE' ? new Date().toISOString() : '',
      scheduled_publish_at: payload.scheduled_publish_at || '',
      valid_from: payload.valid_from || new Date().toISOString().split('T')[0],
      valid_until: payload.valid_until || '',
      author_id: payload.author_id || user?.id,
      author_name: payload.author_name || user?.name || user?.email,
      approver_id: payload.approver_id || (payload.criticality === 'BLOQUEANTE' ? user?.id : null),
      approver_name:
        payload.approver_name || (payload.criticality === 'BLOQUEANTE' ? user?.name : ''),
      approved_at: payload.criticality === 'BLOQUEANTE' ? new Date().toISOString() : '',
      requires_acknowledgement: !!payload.requires_acknowledgement,
      ack_deadline: payload.ack_deadline || '',
      is_blocking: payload.comm_type === 'BLOQUEANTE' || !!payload.is_blocking,
      block_reason: payload.block_reason || '',
      unblock_condition: payload.unblock_condition || '',
      target_audience_type: payload.target_audience_type || 'TODOS',
      target_line_codes: payload.target_line_codes || [],
      target_sectors: payload.target_sectors || [],
      target_user_ids: payload.target_user_ids || [],
      product_code: payload.product_code || '',
      material_code: payload.material_code || '',
      production_order: payload.production_order || '',
      customer_order: payload.customer_order || '',
      customer_name: payload.customer_name || '',
      schedule_code: payload.schedule_code || '',
      total_recipients_count: 0,
      read_count: 0,
      acknowledged_count: 0,
      pending_count: 0,
      attachments: payload.attachments || [],
      is_ai_assisted: !!payload.is_ai_assisted,
    }

    const created = await pb.collection('pcp_communications').create(recordData)

    // Log de auditoria
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id,
        user_email: user?.email,
        user_name: user?.name || user?.email,
        user_role: user?.role || 'PCP_ADMIN',
        event_type: 'SCHEDULE_ACTION',
        action: 'COMMUNICATION_CREATED',
        resource: 'PCP_COMMUNICATIONS',
        resource_id: created.id,
        permission_required: 'pcp.communication.create',
        outcome: 'SUCCESS',
        details: { code, title: recordData.title, criticality: recordData.criticality },
      })
    } catch {
      /* intentionally ignored */
    }

    return this.mapCommRecord(created)
  },

  /**
   * Atualiza status do comunicado
   */
  async updateCommunicationStatus(
    commId: string,
    status: CommunicationStatus,
    reason?: string,
  ): Promise<PCPCommunication> {
    const user = pb.authStore.record
    const updatePayload: any = { status }

    if (status === 'ENCERRADO' || status === 'CANCELADO') {
      updatePayload.closed_at = new Date().toISOString()
      updatePayload.closed_by_id = user?.id
      updatePayload.close_reason = reason || 'Encerrado na gestão de comunicados.'
    }
    if (status === 'VIGENTE') {
      updatePayload.published_at = new Date().toISOString()
    }

    const updated = await pb.collection('pcp_communications').update(commId, updatePayload)
    return this.mapCommRecord(updated)
  },

  /**
   * Registra leitura / visualização de um comunicado pelo usuário atual
   */
  async markAsRead(communicationId: string): Promise<void> {
    const user = pb.authStore.record
    if (!user) return

    try {
      const existing = await pb.collection('pcp_communication_reads').getList(1, 1, {
        filter: `communication_id = '${communicationId}' && user_id = '${user.id}'`,
      })

      if (existing.items.length === 0) {
        await pb.collection('pcp_communication_reads').create({
          communication_id: communicationId,
          user_id: user.id,
          user_email: user.email,
          user_name: user.name || user.email,
          user_role: user.role || 'OPERADOR',
          viewed_at: new Date().toISOString(),
          read_at: new Date().toISOString(),
        })

        // Incrementar contador de leitura no comunicado
        try {
          const comm = await pb.collection('pcp_communications').getOne(communicationId)
          await pb.collection('pcp_communications').update(communicationId, {
            read_count: (comm.read_count || 0) + 1,
          })
        } catch {
          /* intentionally ignored */
        }
      }
    } catch (e) {
      console.warn('Aviso ao marcar como lido:', e)
    }
  },

  /**
   * Registra CIÊNCIA FORMAL [LI E ESTOU CIENTE] com versão e data/hora
   */
  async acknowledgeCommunication(communicationId: string): Promise<PCPCommunicationRead> {
    const user = pb.authStore.record
    if (!user) throw new Error('Usuário não autenticado para registrar ciência.')

    let readRecord: any = null
    const existing = await pb.collection('pcp_communication_reads').getList(1, 1, {
      filter: `communication_id = '${communicationId}' && user_id = '${user.id}'`,
    })

    const ackTimestamp = new Date().toISOString()

    if (existing.items.length > 0) {
      readRecord = await pb.collection('pcp_communication_reads').update(existing.items[0].id, {
        read_at: existing.items[0].read_at || ackTimestamp,
        acknowledged_at: ackTimestamp,
        acknowledged_version: 1,
      })
    } else {
      readRecord = await pb.collection('pcp_communication_reads').create({
        communication_id: communicationId,
        user_id: user.id,
        user_email: user.email,
        user_name: user.name || user.email,
        user_role: user.role || 'OPERADOR',
        viewed_at: ackTimestamp,
        read_at: ackTimestamp,
        acknowledged_at: ackTimestamp,
        acknowledged_version: 1,
      })
    }

    // Incrementar contagem no comunicado
    try {
      const comm = await pb.collection('pcp_communications').getOne(communicationId)
      await pb.collection('pcp_communications').update(communicationId, {
        acknowledged_count: (comm.acknowledged_count || 0) + 1,
      })
    } catch {
      /* intentionally ignored */
    }

    // Log de auditoria de ciência formal
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: user.id,
        user_email: user.email,
        user_name: user.name || user.email,
        user_role: user.role || 'PCP_ADMIN',
        event_type: 'SCHEDULE_ACTION',
        action: 'COMMUNICATION_ACKNOWLEDGED',
        resource: 'PCP_COMMUNICATIONS',
        resource_id: communicationId,
        permission_required: 'pcp.communication.ack',
        outcome: 'SUCCESS',
        details: { communication_id: communicationId, acknowledged_at: ackTimestamp },
      })
    } catch {
      /* intentionally ignored */
    }

    return {
      id: readRecord.id,
      communication_id: readRecord.communication_id,
      user_id: readRecord.user_id,
      user_email: readRecord.user_email,
      user_name: readRecord.user_name,
      read_at: readRecord.read_at,
      acknowledged_at: readRecord.acknowledged_at,
      acknowledged_version: readRecord.acknowledged_version,
    }
  },

  /**
   * Lista histórico de leituras e ciências de um comunicado específico
   */
  async listCommunicationReads(communicationId: string): Promise<PCPCommunicationRead[]> {
    const records = await pb.collection('pcp_communication_reads').getFullList({
      filter: `communication_id = '${communicationId}'`,
      sort: '-acknowledged_at,-read_at',
    })
    return records.map((r: any) => ({
      id: r.id,
      communication_id: r.communication_id,
      user_id: r.user_id,
      user_email: r.user_email,
      user_name: r.user_name,
      delivered_at: r.delivered_at,
      viewed_at: r.viewed_at,
      read_at: r.read_at,
      acknowledged_at: r.acknowledged_at,
      acknowledged_version: r.acknowledged_version,
      user_role: r.user_role,
      user_sector: r.user_sector,
      created: r.created,
      updated: r.updated,
    }))
  },

  /**
   * Desbloqueia comunicado de tipo BLOQUEANTE
   */
  async unblockCommunication(
    communicationId: string,
    unblockCondition: string,
  ): Promise<PCPCommunication> {
    const user = pb.authStore.record
    const updated = await pb.collection('pcp_communications').update(communicationId, {
      status: 'ENCERRADO',
      unblocked_at: new Date().toISOString(),
      unblocked_by_id: user?.id,
      unblock_condition: unblockCondition,
      closed_at: new Date().toISOString(),
      closed_by_id: user?.id,
      close_reason: `Desbloqueio operacional efetuado: ${unblockCondition}`,
    })
    return this.mapCommRecord(updated)
  },

  /**
   * Carrega itens da INBOX unificada do usuário
   */
  async getInboxItems(): Promise<PCPInboxItem[]> {
    const user = pb.authStore.record
    const items: PCPInboxItem[] = []

    try {
      // 1. Comunicados vigentes com ciência pendente
      const comms = await this.listCommunications({ status: 'VIGENTE' })
      comms.forEach((c) => {
        const needsAck = c.requires_acknowledgement && !c.user_read_state?.is_acknowledged
        items.push({
          id: `comm_${c.id}`,
          type: 'COMUNICADO',
          title: c.title,
          subtitle: c.summary || c.content.slice(0, 100),
          source_label: `Comunicado PCP • ${c.comm_type}`,
          priority:
            c.criticality === 'BLOQUEANTE' || c.criticality === 'CRITICA'
              ? 'CRITICA'
              : c.criticality === 'ATENCAO'
                ? 'ATENCAO'
                : 'NORMAL',
          deadline: c.ack_deadline || c.valid_until,
          created_at: c.created || c.valid_from,
          requires_action: needsAck,
          action_type: needsAck ? 'ACKNOWLEDGE' : undefined,
          item_payload: c,
          link: '/pcp/comunicados',
        })
      })

      // 2. Próximas reuniões agendadas onde o usuário é participante
      const meetings = await pb.collection('pcp_meetings').getFullList({
        filter: `status = 'AGENDADA' || status = 'EM_ANDAMENTO'`,
        sort: 'meeting_date,meeting_time',
      })

      meetings.forEach((m: any) => {
        const myInvite = m.mandatory_participants?.find(
          (p: any) => p.user_id === user?.id || p.email === user?.email,
        )
        const isPending = myInvite?.status === 'PENDING'

        items.push({
          id: `meet_${m.id}`,
          type: 'REUNIAO',
          title: m.title,
          subtitle: `${m.reference_week} • ${m.meeting_date} às ${m.meeting_time} (${m.modality})`,
          source_label: 'Reunião PCP',
          priority: m.status === 'EM_ANDAMENTO' ? 'CRITICA' : 'ATENCAO',
          deadline: `${m.meeting_date} ${m.meeting_time}`,
          created_at: m.created,
          requires_action: isPending || m.status === 'EM_ANDAMENTO',
          action_type:
            m.status === 'EM_ANDAMENTO' ? 'JOIN_MEETING' : isPending ? 'CONFIRM_INVITE' : undefined,
          item_payload: m,
          link:
            m.status === 'EM_ANDAMENTO' ? `/pcp/reunioes/andamento?id=${m.id}` : `/pcp/reunioes`,
        })
      })

      // 3. Pendências atribuídas ao usuário ou abertas
      const pendencies = await pb.collection('pcp_minute_items').getFullList({
        filter: `status = 'ABERTA' || status = 'EM_ANDAMENTO' || status = 'VENCIDA' || status = 'SEM_ATUALIZACAO'`,
        sort: 'deadline,-created',
      })

      pendencies.forEach((p: any) => {
        const isMyPendency =
          p.responsible_user_id === user?.id ||
          p.responsible_name?.toLowerCase().includes(user?.name?.toLowerCase() || '___')

        items.push({
          id: `pend_${p.id}`,
          type: 'PENDENCIA',
          title: `[${p.item_code}] ${p.title}`,
          subtitle: `${p.description.slice(0, 90)}... (Linhas: ${p.line_codes?.join(', ') || 'Geral'})`,
          source_label: `Pendência ATA • ${p.sector || 'PCP'}`,
          priority: p.status === 'VENCIDA' || p.impact_level === 'CRITICO' ? 'CRITICA' : 'ATENCAO',
          deadline: p.deadline,
          created_at: p.created,
          requires_action: isMyPendency,
          action_type: 'RESOLVE_PENDENCY',
          item_payload: p,
          link: `/pcp/reunioes/pendencias`,
        })
      })
    } catch (e) {
      console.error('Erro ao carregar inbox PCP:', e)
    }

    // Ordenar por prioridade: CRITICA -> ATENCAO -> NORMAL
    const priorityWeight: Record<string, number> = { CRITICA: 3, ATENCAO: 2, NORMAL: 1 }
    return items.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
  },

  mapCommRecord(r: any): PCPCommunication {
    return {
      id: r.id,
      code: r.code,
      title: r.title,
      summary: r.summary,
      content: r.content,
      comm_type: r.comm_type,
      criticality: r.criticality,
      origin_type: r.origin_type,
      origin_ref_id: r.origin_ref_id,
      origin_ref_code: r.origin_ref_code,
      status: r.status,
      published_at: r.published_at,
      scheduled_publish_at: r.scheduled_publish_at,
      valid_from: r.valid_from,
      valid_until: r.valid_until,
      closed_at: r.closed_at,
      closed_by_id: r.closed_by_id,
      close_reason: r.close_reason,
      author_id: r.author_id,
      author_name: r.author_name,
      approver_id: r.approver_id,
      approver_name: r.approver_name,
      approved_at: r.approved_at,
      requires_acknowledgement: !!r.requires_acknowledgement,
      ack_deadline: r.ack_deadline,
      escalation_responsible_id: r.escalation_responsible_id,
      is_blocking: !!r.is_blocking,
      block_reason: r.block_reason,
      unblock_condition: r.unblock_condition,
      unblocked_at: r.unblocked_at,
      unblocked_by_id: r.unblocked_by_id,
      target_audience_type: r.target_audience_type,
      target_line_codes: r.target_line_codes || [],
      target_sectors: r.target_sectors || [],
      target_user_ids: r.target_user_ids || [],
      product_code: r.product_code,
      material_code: r.material_code,
      production_order: r.production_order,
      customer_order: r.customer_order,
      customer_name: r.customer_name,
      schedule_code: r.schedule_code,
      total_recipients_count: r.total_recipients_count || 0,
      read_count: r.read_count || 0,
      acknowledged_count: r.acknowledged_count || 0,
      pending_count: r.pending_count || 0,
      attachments: r.attachments || [],
      is_ai_assisted: !!r.is_ai_assisted,
      created: r.created,
      updated: r.updated,
      expand: r.expand,
    }
  },
}

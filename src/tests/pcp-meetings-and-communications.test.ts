import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { pcpCommunicationService } from '@/services/pcp-communication-service'
import pb from '@/lib/pocketbase/client'

describe('Módulos de Reuniões PCP & Central de Comunicados (Testes Funcionais e Critérios de Aceite)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Deve criar uma reunião de PCP com semana de referência, pauta e participantes', async () => {
    const meetingPayload = {
      title: 'Reunião Semanal de Sequenciamento & Riscos',
      reference_week: 'Semana 35 / 2026',
      meeting_date: '2026-09-02',
      meeting_time: '15:00',
      duration_minutes: 60,
      modality: 'PRESENCIAL' as const,
      location: 'Sala 01 PCP',
      involved_lines: ['L01', 'L02', 'ENDL1'],
      mandatory_participants: [
        { user_id: 'u1', name: 'Carlos Gestor', email: 'carlos@ciafal.com.br', status: 'PENDING' as const },
      ],
    }

    const created = await pcpMeetingService.createMeeting(meetingPayload)
    expect(created).toBeDefined()
    expect(created.code).toMatch(/^MEET-PCP-/)
    expect(created.reference_week).toBe('Semana 35 / 2026')
    expect(created.status).toBe('AGENDADA')
    expect(created.involved_lines).toContain('L01')
    expect(created.mandatory_participants.length).toBe(1)
  })

  it('2. Deve registrar remarcação com histórico e motivo obrigatório (Critério de Rastreabilidade)', async () => {
    const meeting = await pcpMeetingService.createMeeting({
      title: 'Reunião PCP para Remarcação',
      reference_week: 'Semana 36 / 2026',
      meeting_date: '2026-09-09',
      meeting_time: '15:00',
    })

    const rescheduled = await pcpMeetingService.rescheduleMeeting(meeting.id, {
      newDate: '2026-09-10',
      newTime: '16:00',
      reason: 'Conflito de agenda da diretoria industrial',
      currentMeeting: meeting,
    })

    expect(rescheduled.meeting_date).toBe('2026-09-10')
    expect(rescheduled.meeting_time).toBe('16:00')
    expect(rescheduled.status).toBe('REMARCADA')
    expect(rescheduled.reschedule_history?.length).toBe(1)
    expect(rescheduled.reschedule_history?.[0].reason).toBe('Conflito de agenda da diretoria industrial')
  })

  it('3. Deve registrar item na reunião (1 ITEM ➔ N LINHAS) e verificar regra de ALERTA na linha', async () => {
    const meeting = await pcpMeetingService.createMeeting({
      title: 'Reunião de Deliberação',
      reference_week: 'Semana 35 / 2026',
      meeting_date: '2026-09-02',
    })

    const minuteItem = await pcpMeetingService.createMinuteItem({
      meeting_id: meeting.id,
      classification: 'ALERTA',
      category: 'QUALIDADE',
      title: 'Aguardar resultado de ultrassom antes da produção',
      description: 'Lote de teste da L01 condicionado a ensaio não destrutivo.',
      line_codes: ['L01', 'ENDL1', 'ACABL1'],
      product_code: 'PERFIL-ESTRUT-350',
      responsible_name: 'Engenharia de Qualidade',
      deadline: '2026-09-04',
      status: 'ABERTA',
      is_active_operational: true,
    })

    expect(minuteItem.item_code).toMatch(/^ITEM-ALE-/)
    expect(minuteItem.line_codes).toEqual(['L01', 'ENDL1', 'ACABL1'])
    expect(minuteItem.is_active_operational).toBe(true)

    // Atualização de status reflete no mesmo registro
    const updated = await pcpMeetingService.updateMinuteItemStatus(
      minuteItem.id,
      'EM_ANDAMENTO',
      'Iniciada coleta das amostras metalúrgicas',
    )
    expect(updated.status).toBe('EM_ANDAMENTO')
    expect(updated.history_log?.length).toBeGreaterThanOrEqual(2)
  })

  it('4. Deve criar e publicar ATA oficial estruturada com transição de status', async () => {
    const meeting = await pcpMeetingService.createMeeting({
      title: 'Reunião PCP para Publicação de ATA',
      reference_week: 'Semana 35 / 2026',
      meeting_date: '2026-09-02',
    })

    const minute = await pcpMeetingService.getOrCreateMinute(meeting)
    expect(minute.meeting_id).toBe(meeting.id)
    expect(minute.version).toBe(1)

    const published = await pcpMeetingService.publishMinute(minute.id)
    expect(published.status).toBe('PUBLICADA')
    expect(published.published_at).toBeDefined()
  })

  it('5. Deve criar Comunicado PCP com exigência de ciência formal e registrar [LI E ESTOU CIENTE]', async () => {
    const comm = await pcpCommunicationService.createCommunication({
      title: 'COMUNICADO PCP: Restrição de bitola na Linha L01',
      summary: 'Produção condicionada à liberação de qualidade',
      content: 'Diretriz técnica obrigatória para cumprimento no turno 1 e 2.',
      comm_type: 'QUALIDADE',
      criticality: 'URGENTE',
      status: 'VIGENTE',
      valid_from: '2026-09-02',
      target_line_codes: ['L01'],
      requires_acknowledgement: true,
      ack_deadline: '2026-09-03',
    })

    expect(comm.code).toMatch(/^COM-QUA-/)
    expect(comm.requires_acknowledgement).toBe(true)
    expect(comm.criticality).toBe('URGENTE')

    // Registro de ciência formal
    const ack = await pcpCommunicationService.acknowledgeCommunication(comm.id)
    expect(ack.communication_id).toBe(comm.id)
    expect(ack.acknowledged_at).toBeDefined()
    expect(ack.acknowledged_version).toBe(1)

    // Consultar histórico de leituras
    const reads = await pcpCommunicationService.listCommunicationReads(comm.id)
    expect(reads.length).toBeGreaterThanOrEqual(1)
    expect(reads[0].acknowledged_at).toBeDefined()
  })

  it('6. Deve suportar Comunicado BLOQUEANTE com motivo e condição de desbloqueio operacional', async () => {
    const blockingComm = await pcpCommunicationService.createCommunication({
      title: 'BLOQUEIO OPERACIONAL - NÃO CONFORMIDADE DIMENSIONAL',
      content: 'Parada imediata da conformação na linha L02 até novo setup.',
      comm_type: 'BLOQUEANTE',
      criticality: 'BLOQUEANTE',
      is_blocking: true,
      block_reason: 'Desvio no diâmetro externo superior à tolerância',
      unblock_condition: 'Ajuste de cilindros e aprovação com laudo metrológico',
      valid_from: '2026-09-02',
      target_line_codes: ['L02'],
    })

    expect(blockingComm.is_blocking).toBe(true)
    expect(blockingComm.criticality).toBe('BLOQUEANTE')

    // Desbloqueio
    const unblocked = await pcpCommunicationService.unblockCommunication(
      blockingComm.id,
      'Cilindros ajustados e laudo nº 4892 emitido favorável.',
    )
    expect(unblocked.status).toBe('ENCERRADO')
    expect(unblocked.unblocked_at).toBeDefined()
  })

  it('7. Deve consolidar Inbox do PCP com ordenação prioritária', async () => {
    const inboxItems = await pcpCommunicationService.getInboxItems()
    expect(Array.isArray(inboxItems)).toBe(true)
    if (inboxItems.length > 1) {
      const priorityWeight: Record<string, number> = { CRITICA: 3, ATENCAO: 2, NORMAL: 1 }
      for (let i = 0; i < inboxItems.length - 1; i++) {
        expect(priorityWeight[inboxItems[i].priority]).toBeGreaterThanOrEqual(
          priorityWeight[inboxItems[i + 1].priority],
        )
      }
    }
  })
})

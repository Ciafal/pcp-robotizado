import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  pcpMeetingFatia1Service,
  formatMeetingCode,
  parseMeetingCodeSequence,
  formatPendencyCode,
  parsePendencyCodeSequence,
} from '@/services/pcp-meeting-fatia1-service'
import { getIsoWeekAndYear } from '@/lib/temporal-utils'
import { PCPMeetingRecord } from '@/types/pcp-meeting'
import pb from '@/lib/pocketbase/client'

describe('REUNIÃO PCP — FATIA 1: Regras Críticas e Motores de Governança', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // (a) Bloqueio do agendamento sem prévia enviada
  it('(a) deve BLOQUEAR a confirmação do agendamento se a prévia não tiver sido enviada', () => {
    const meetingSemPrevia: PCPMeetingRecord = {
      id: 'meet-1',
      meeting_code: 'REUNIAO-000001',
      title: 'Reunião Semanal PCP - S08/2025',
      week: 8,
      year: 2025,
      company: 'CIAFAL',
      meeting_date: '2025-02-18',
      start_time: '09:00',
      expected_end_time: '10:30',
      modality: 'PRESENCIAL',
      organizer: 'Coordenação PCP',
      conductor: 'Coordenação PCP',
      status: 'RASCUNHO',
      briefing_gerado: false,
      pauta_gerada: false,
      previa_gerada: false,
      previa_enviada: false,
      agendamento_confirmado: false,
    }

    const check1 = pcpMeetingFatia1Service.canConfirmSchedule(meetingSemPrevia)
    expect(check1.allowed).toBe(false)
    expect(check1.reason).toContain(
      'É obrigatório gerar, validar e enviar a prévia da ATA ao Grupo PCP antes de confirmar o agendamento.',
    )

    // Mesmo com prévia gerada, se status for PREVIA_GERADA e não enviada, continua bloqueado
    const meetingPreviaGeradaNaoEnviada: PCPMeetingRecord = {
      ...meetingSemPrevia,
      previa_gerada: true,
      status: 'PREVIA_GERADA',
      previa_enviada: false,
    }

    const check2 = pcpMeetingFatia1Service.canConfirmSchedule(meetingPreviaGeradaNaoEnviada)
    expect(check2.allowed).toBe(false)
    expect(check2.reason).toContain('É obrigatório gerar, validar e enviar a prévia')
  })

  // (b) Liberação do agendamento após envio registrado
  it('(b) deve LIBERAR o agendamento após a prévia ser validada e enviada ao Grupo PCP', () => {
    const meetingAptaAgendamento: PCPMeetingRecord = {
      id: 'meet-2',
      meeting_code: 'REUNIAO-000002',
      title: 'Reunião Semanal PCP - S08/2025',
      week: 8,
      year: 2025,
      company: 'CIAFAL',
      meeting_date: '2025-02-18',
      start_time: '09:00',
      expected_end_time: '10:30',
      modality: 'PRESENCIAL',
      organizer: 'Coordenação PCP',
      conductor: 'Coordenação PCP',
      status: 'PREVIA_ENVIADA',
      briefing_gerado: true,
      pauta_gerada: true,
      previa_gerada: true,
      previa_enviada: true,
      previa_envio_info: {
        data_hora: '2025-02-17T14:30:00.000Z',
        usuario: 'Coordenação PCP',
        versao: 1,
        destinatarios: ['grupo.pcp@ciafal.com.br'],
        canal: 'REGISTRO_SISTEMA_CANAL_NOTIF_PENDENTE',
      },
      agendamento_confirmado: false,
    }

    const check = pcpMeetingFatia1Service.canConfirmSchedule(meetingAptaAgendamento)
    expect(check.allowed).toBe(true)
    expect(check.reason).toBeUndefined()
  })

  // (c) Detecção de semana ISO a partir da data
  it('(c) deve calcular a semana ISO e ano corretamente a partir da data da reunião', () => {
    // 18 de Fevereiro de 2025 é terça-feira da Semana 8 de 2025
    const date1 = new Date('2025-02-18T12:00:00')
    const res1 = getIsoWeekAndYear(date1)
    expect(res1.week).toBe(8)
    expect(res1.year).toBe(2025)

    // 01 de Janeiro de 2025 é quarta-feira da Semana 1 de 2025
    const date2 = new Date('2025-01-01T12:00:00')
    const res2 = getIsoWeekAndYear(date2)
    expect(res2.week).toBe(1)
    expect(res2.year).toBe(2025)

    // 29 de Dezembro de 2024 é domingo da Semana 52 de 2024
    const date3 = new Date('2024-12-29T12:00:00')
    const res3 = getIsoWeekAndYear(date3)
    expect(res3.week).toBe(52)
    expect(res3.year).toBe(2024)
  })

  // Códigos legíveis sequenciais
  it('deve formatar e fazer parse dos códigos legíveis sequenciais REUNIAO-000001 e PEND-000001', () => {
    expect(formatMeetingCode(1)).toBe('REUNIAO-000001')
    expect(formatMeetingCode(42)).toBe('REUNIAO-000042')
    expect(parseMeetingCodeSequence('REUNIAO-000042')).toBe(42)

    expect(formatPendencyCode(1)).toBe('PEND-000001')
    expect(formatPendencyCode(150)).toBe('PEND-000150')
    expect(parsePendencyCodeSequence('PEND-000150')).toBe(150)
  })

  // (d) Persistência e reordenação da pauta
  it('(d) deve suportar reordenação da pauta e atualizar as ordens sequencialmente', async () => {
    const fakeItems = [
      { id: 'item-1', order: 1, subject: 'Abertura' },
      { id: 'item-2', order: 2, subject: 'Gargalo L1' },
      { id: 'item-3', order: 3, subject: 'Fechamento' },
    ]

    const updateSpy = vi
      .spyOn(pb.collection('pcp_meeting_agenda_item'), 'update')
      .mockResolvedValue({} as any)
    const listSpy = vi
      .spyOn(pb.collection('pcp_meeting_agenda_item'), 'getFullList')
      .mockResolvedValue([
        { id: 'item-2', order: 1, subject: 'Gargalo L1' } as any,
        { id: 'item-1', order: 2, subject: 'Abertura' } as any,
        { id: 'item-3', order: 3, subject: 'Fechamento' } as any,
      ])
    vi.spyOn(pb.collection('pcp_meeting_log'), 'create').mockResolvedValue({} as any)

    const reordered = await pcpMeetingFatia1Service.reorderAgendaItems(
      'meet-1',
      ['item-2', 'item-1', 'item-3'],
      { name: 'Test User' },
    )

    expect(updateSpy).toHaveBeenCalledWith('item-2', { order: 1 })
    expect(updateSpy).toHaveBeenCalledWith('item-1', { order: 2 })
    expect(updateSpy).toHaveBeenCalledWith('item-3', { order: 3 })
    expect(reordered[0].id).toBe('item-2')
  })

  // (e) Pendências abertas carregadas automaticamente
  it('(e) deve listar pendências abertas para inclusão automática na pauta da próxima reunião', async () => {
    const pendenciasMock = [
      {
        id: 'pend-1',
        pendency_code: 'PEND-000001',
        origin_week: 7,
        origin_year: 2025,
        meeting_id: 'meet-old',
        area: 'L1',
        subject: 'Ajuste no desbaste L1',
        action: 'Substituir cilindro',
        responsible: 'Líder L1',
        deadline: '2025-02-25',
        priority: 'ALTA',
        status: 'ABERTA',
      },
      {
        id: 'pend-2',
        pendency_code: 'PEND-000002',
        origin_week: 7,
        origin_year: 2025,
        meeting_id: 'meet-old',
        area: 'Estoque',
        subject: 'Inventário rotativo',
        action: 'Contagem diária',
        responsible: 'Líder Estoque',
        deadline: '2025-02-20',
        priority: 'MEDIA',
        status: 'CONCLUIDA',
      },
    ]

    vi.spyOn(pb.collection('pcp_meeting_pendency'), 'getFullList').mockImplementation(
      async (opts: any) => {
        if (opts?.filter?.includes("status = 'ABERTA'")) {
          return pendenciasMock.filter((p) => p.status === 'ABERTA') as any
        }
        return pendenciasMock as any
      },
    )

    const abertas = await pcpMeetingFatia1Service.listPendencies({ status: 'ABERTA' })
    expect(abertas).toHaveLength(1)
    expect(abertas[0].pendency_code).toBe('PEND-000001')
    expect(abertas[0].status).toBe('ABERTA')
  })

  // (f) Log de auditoria em cada mutação
  it('(f) deve registrar log de auditoria ao realizar mutações na reunião e pendências', async () => {
    const logSpy = vi.spyOn(pb.collection('pcp_meeting_log'), 'create').mockResolvedValue({
      id: 'log-1',
      action: 'CANCELAMENTO_REUNIAO',
    } as any)

    vi.spyOn(pb.collection('pcp_meeting'), 'getOne').mockResolvedValue({
      id: 'meet-1',
      meeting_code: 'REUNIAO-000001',
      status: 'AGENDADA',
      week: 8,
      year: 2025,
    } as any)

    vi.spyOn(pb.collection('pcp_meeting'), 'update').mockResolvedValue({
      id: 'meet-1',
      meeting_code: 'REUNIAO-000001',
      status: 'CANCELADA',
      cancellation_reason: 'Manutenção elétrica emergencial na planta',
      week: 8,
      year: 2025,
    } as any)

    await pcpMeetingFatia1Service.cancelMeeting(
      'meet-1',
      'Manutenção elétrica emergencial na planta',
      { id: 'user-1', name: 'Gerente PCP' },
    )

    expect(logSpy).toHaveBeenCalledTimes(1)
    const logArgs = logSpy.mock.calls[0][0] as any
    expect(logArgs.action).toBe('CANCELAMENTO_REUNIAO')
    expect(logArgs.target_object).toBe('pcp_meeting')
    expect(logArgs.user_name).toBe('Gerente PCP')
    expect(logArgs.reason).toBe('Manutenção elétrica emergencial na planta')
  })

  // (g) Completude da ATA calculada por seção
  it('(g) deve calcular a completude da ATA por seção e o percentual geral com base nos tópicos', () => {
    const structuredContent = {
      template_code: '8.1.001-R002',
      template_revision: 8,
      secoes: {
        sec_pcp: {
          id: 'sec_pcp',
          nome: 'PCP',
          obrigatorio: true,
          ordem: 1,
          itens: [
            {
              id: 'it1',
              topico: 'Aderência S07',
              detalhes: '98% de assertividade fabril',
              status_info: 'MANTER' as const,
            },
          ],
          observacoes: 'Tudo em conformidade',
        },
        sec_l1: {
          id: 'sec_l1',
          nome: 'L1',
          obrigatorio: true,
          ordem: 2,
          itens: [
            {
              id: 'it2',
              topico: 'Parada Programada',
              detalhes: 'Troca de fieiras',
              status_info: 'NOVA' as const,
            },
          ],
          observacoes: '', // Apenas itens, sem observações => score 75
        },
        sec_ks: {
          id: 'sec_ks',
          nome: 'KS',
          obrigatorio: false, // não obrigatória vazia => score 50
          ordem: 3,
          itens: [],
        },
      },
    }

    const { sectionCompleteness, overallCompleteness } =
      pcpMeetingFatia1Service.calculateAtaCompleteness(structuredContent as any)

    expect(sectionCompleteness['sec_pcp']).toBe(100)
    expect(sectionCompleteness['sec_l1']).toBe(75)
    expect(sectionCompleteness['sec_ks']).toBe(50)
    // Média: (100 + 75 + 50) / 3 = 75%
    expect(overallCompleteness).toBe(75)
  })
})

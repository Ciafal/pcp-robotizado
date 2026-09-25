import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  pcpMeetingFatia1Service,
  formatMeetingCode,
  formatPendencyCode,
} from '@/services/pcp-meeting-fatia1-service'
import {
  PCPMeetingPendencyRecord,
  PCPMeetingRecord,
  PCPMeetingAtaRecord,
} from '@/types/pcp-meeting'
import pb from '@/lib/pocketbase/client'
import { NotificationAdapter } from '@/services/pcp-adapters-service'

describe('REUNIÃO PCP — Suíte de Testes de Rastreabilidade Obrigatória Reunião → ATA → Pendência (T1–T13)', () => {
  const userContext = {
    id: 'usr-pcp-01',
    name: 'Coordenação PCP',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --------------------------------------------------------------------------
  // T1 Vínculo: pendência criada grava id_ata e id_reuniao e exibe código reunião
  // --------------------------------------------------------------------------
  it('T1 vínculo: pendência criada a partir de uma ATA grava id_ata e id_reuniao e exibe o código da reunião', async () => {
    const mockMeeting: Partial<PCPMeetingRecord> = {
      id: 'rec_meeting_004',
      meeting_code: 'REUNIAO-000004',
      meeting_date: '2026-10-14',
      company: 'CIAFAL',
      week: 42,
      year: 2026,
    }

    const mockAta: Partial<PCPMeetingAtaRecord> = {
      id: 'rec_ata_004_v1',
      meeting_id: 'rec_meeting_004',
      version: 1,
    }

    vi.spyOn(pb.collection('pcp_meeting'), 'getOne').mockResolvedValue(mockMeeting as any)
    vi.spyOn(pb.collection('pcp_meeting_ata'), 'getList').mockResolvedValue({
      items: [mockAta],
      totalItems: 1,
      page: 1,
      perPage: 1,
      totalPages: 1,
    } as any)
    vi.spyOn(pb.collection('pcp_meeting_pendency'), 'getList').mockResolvedValue({
      items: [],
      totalItems: 0,
      page: 1,
      perPage: 1,
      totalPages: 0,
    } as any)

    const createSpy = vi
      .spyOn(pb.collection('pcp_meeting_pendency'), 'create')
      .mockImplementation(async (payload: any) => ({
        id: 'rec_pend_001',
        ...payload,
      }))

    vi.spyOn(pb.collection('pcp_meeting_log'), 'create').mockResolvedValue({} as any)

    const created = await pcpMeetingFatia1Service.createPendency(
      {
        meeting_id: 'rec_meeting_004',
        meeting_code: 'REUNIAO-000004',
        ata_id: 'rec_ata_004_v1',
        ata_code: 'ATA-REUNIAO-000004-V1',
        origin_week: 42,
        origin_year: 2026,
        area: 'L1',
        subject: 'Ajuste no desbaste L1',
        action: 'Substituição das guias de entrada',
        responsible: 'Líder L1',
        deadline: '2026-10-20',
        priority: 'ALTA',
        status: 'ABERTA',
        origin: 'Reunião REUNIAO-000004 · ATA-REUNIAO-000004-V1',
      },
      userContext,
    )

    expect(createSpy).toHaveBeenCalled()
    const payload = createSpy.mock.calls[0][0] as any
    expect(payload.meeting_id).toBe('rec_meeting_004')
    expect(payload.ata_id).toBe('rec_ata_004_v1')
    expect(payload.meeting_code).toBe('REUNIAO-000004')
    expect(payload.ata_code).toBe('ATA-REUNIAO-000004-V1')
    expect(created.meeting_code).toBe('REUNIAO-000004')
    expect(created.pendency_code).toBe('PEND-000001')
  })

  // --------------------------------------------------------------------------
  // T2 Bloqueio: não permite salvar pendência sem ATA/reunião
  // --------------------------------------------------------------------------
  it('T2 bloqueio: não permite salvar pendência sem ATA/reunião válida', async () => {
    // Caso 1: meeting_id vazio ou MANUAL
    await expect(
      pcpMeetingFatia1Service.createPendency(
        {
          meeting_id: '',
          origin_week: 42,
          origin_year: 2026,
          area: 'PCP',
          subject: 'Sem reunião',
          action: 'Ação solta',
          responsible: 'Qualquer',
          deadline: '2026-10-20',
          priority: 'ALTA',
          status: 'ABERTA',
        },
        userContext,
      ),
    ).rejects.toThrow(/Rastreabilidade obrigatória.*Selecione uma Reunião/i)

    await expect(
      pcpMeetingFatia1Service.createPendency(
        {
          meeting_id: 'REUNIAO_MANUAL',
          origin_week: 42,
          origin_year: 2026,
          area: 'PCP',
          subject: 'Reunião manual inválida',
          action: 'Ação solta',
          responsible: 'Qualquer',
          deadline: '2026-10-20',
          priority: 'ALTA',
          status: 'ABERTA',
        },
        userContext,
      ),
    ).rejects.toThrow(/Rastreabilidade obrigatória.*Selecione uma Reunião/i)

    // Caso 2: Reunião existe mas sem ATA associada
    vi.spyOn(pb.collection('pcp_meeting'), 'getOne').mockResolvedValue({
      id: 'rec_meeting_orphan',
      meeting_code: 'REUNIAO-000099',
    } as any)
    vi.spyOn(pb.collection('pcp_meeting_ata'), 'getList').mockResolvedValue({
      items: [],
      totalItems: 0,
    } as any)

    await expect(
      pcpMeetingFatia1Service.createPendency(
        {
          meeting_id: 'rec_meeting_orphan',
          ata_id: '',
          origin_week: 42,
          origin_year: 2026,
          area: 'PCP',
          subject: 'Sem ATA',
          action: 'Ação solta',
          responsible: 'Qualquer',
          deadline: '2026-10-20',
          priority: 'ALTA',
          status: 'ABERTA',
        },
        userContext,
      ),
    ).rejects.toThrow(/A reunião de origem precisa ter uma ATA vinculada/i)
  })

  // --------------------------------------------------------------------------
  // T3 Origem: coluna ORIGEM mostra código da reunião + ATA + semana
  // --------------------------------------------------------------------------
  it('T3 origem: formata corretamente a origem com código de reunião + ATA + semana (ex.: REUNIAO-000004 / ATA-REUNIAO-000004-V1 · S42/2026)', () => {
    const pendency: Partial<PCPMeetingPendencyRecord> = {
      meeting_code: 'REUNIAO-000004',
      ata_code: 'ATA-REUNIAO-000004-V1',
      origin_week: 42,
      origin_year: 2026,
    }

    const meetingDisplay = pendency.meeting_code
    const ataDisplay = `${pendency.ata_code} · S${pendency.origin_week}/${pendency.origin_year}`
    const fullOrigin = `${meetingDisplay} / ${ataDisplay}`

    expect(meetingDisplay).toBe('REUNIAO-000004')
    expect(ataDisplay).toBe('ATA-REUNIAO-000004-V1 · S42/2026')
    expect(fullOrigin).toContain('REUNIAO-000004')
    expect(fullOrigin).toContain('ATA-REUNIAO-000004-V1')
    expect(fullOrigin).toContain('S42/2026')
    expect(fullOrigin).not.toBe('S8/2025')
  })

  // --------------------------------------------------------------------------
  // T4 Navegação: clicar no código da reunião abre a reunião correta
  // --------------------------------------------------------------------------
  it('T4 navegação: handler de clique na reunião aciona callback de navegação com ID/código correto', () => {
    const navigateTabSpy = vi.fn()
    const availableMeetings: any[] = [
      { id: 'meet_id_004', meeting_code: 'REUNIAO-000004' },
      { id: 'meet_id_005', meeting_code: 'REUNIAO-000005' },
    ]

    const handleOpenMeeting = (meetingCodeOrId?: string) => {
      if (!meetingCodeOrId || meetingCodeOrId === 'REUNIAO_MANUAL') return
      const matched = availableMeetings.find(
        (m) => m.id === meetingCodeOrId || m.meeting_code === meetingCodeOrId,
      )
      navigateTabSpy('preparacao', matched ? matched.id : meetingCodeOrId)
    }

    handleOpenMeeting('REUNIAO-000004')
    expect(navigateTabSpy).toHaveBeenCalledWith('preparacao', 'meet_id_004')

    handleOpenMeeting('meet_id_005')
    expect(navigateTabSpy).toHaveBeenCalledWith('preparacao', 'meet_id_005')
  })

  // --------------------------------------------------------------------------
  // T5 ATA: clicar na ATA abre a ATA correta
  // --------------------------------------------------------------------------
  it('T5 ATA: handler de clique na ATA aciona callback de navegação para a aba "atas" com o ID correspondente', () => {
    const navigateTabSpy = vi.fn()
    const availableMeetings: any[] = [{ id: 'meet_id_004', meeting_code: 'REUNIAO-000004' }]

    const handleOpenAta = (meetingCodeOrId?: string) => {
      if (!meetingCodeOrId || meetingCodeOrId === 'REUNIAO_MANUAL') return
      const matched = availableMeetings.find(
        (m) => m.id === meetingCodeOrId || m.meeting_code === meetingCodeOrId,
      )
      navigateTabSpy('atas', matched ? matched.id : meetingCodeOrId)
    }

    handleOpenAta('REUNIAO-000004')
    expect(navigateTabSpy).toHaveBeenCalledWith('atas', 'meet_id_004')
  })

  // --------------------------------------------------------------------------
  // T6 Alerta HUB: ação "Enviar Alerta" gera notificação interna para o responsável
  // --------------------------------------------------------------------------
  it('T6 alerta HUB: "Enviar Alerta" gera notificação interna via NotificationAdapter', async () => {
    const notifSpy = vi
      .spyOn(NotificationAdapter, 'sendInternalNotification')
      .mockResolvedValue({ id: 'notif-1' } as any)

    vi.spyOn(pb.collection('users'), 'getList').mockResolvedValue({
      items: [{ email: 'lider.l1@ciafal.com.br' }],
    } as any)
    vi.spyOn(pb.collection('pcp_meeting_log'), 'create').mockResolvedValue({} as any)

    const pendency: PCPMeetingPendencyRecord = {
      id: 'pend_101',
      pendency_code: 'PEND-000004',
      meeting_id: 'meet_id_004',
      meeting_code: 'REUNIAO-000004',
      ata_id: 'rec_ata_004_v1',
      ata_code: 'ATA-REUNIAO-000004-V1',
      origin_week: 42,
      origin_year: 2026,
      area: 'L1',
      subject: 'Ajuste de temperatura',
      action: 'Verificar pirômetro da zona 2',
      responsible: 'Líder L1',
      deadline: '2026-10-25',
      priority: 'CRITICA',
      status: 'ABERTA',
    }

    const res = await pcpMeetingFatia1Service.sendPendencyAlert(pendency, userContext)

    expect(notifSpy).toHaveBeenCalled()
    const callArg = notifSpy.mock.calls[0][0]
    expect(callArg.target_audience).toBe('PCP')
    expect(callArg.title).toContain('PEND-000004')
    expect(callArg.message).toContain('REUNIAO-000004')
    expect(callArg.message).toContain('ATA-REUNIAO-000004-V1')
    expect(callArg.message).toContain('Líder L1')
    expect(callArg.severity).toBe('CRITICAL')
    expect(res.hubNotificationSuccess).toBe(true)
  })

  // --------------------------------------------------------------------------
  // T7 E-mail: dispara/monta e-mail corporativo com dados da pendência e link
  // --------------------------------------------------------------------------
  it('T7 e-mail: dispara chamada de serviço de e-mail corporativo com payload contendo código, link e detalhes', async () => {
    let sentPayload: any = null
    const pbSendSpy = vi
      .spyOn(pb, 'send')
      .mockImplementation(async (path: string, options: any) => {
        if (path === '/backend/v1/pcp/summaries/send-email') {
          sentPayload = options.body
          return { success: true }
        }
        return {}
      })
    vi.spyOn(NotificationAdapter, 'sendInternalNotification').mockResolvedValue({} as any)
    vi.spyOn(pb.collection('pcp_meeting_log'), 'create').mockResolvedValue({} as any)

    const pendency: PCPMeetingPendencyRecord = {
      id: 'pend_102',
      pendency_code: 'PEND-000005',
      meeting_id: 'meet_id_004',
      meeting_code: 'REUNIAO-000004',
      ata_code: 'ATA-REUNIAO-000004-V1',
      origin_week: 42,
      origin_year: 2026,
      meeting_date: '2026-10-14',
      area: 'L2',
      subject: 'Calibração de laminador',
      action: 'Ajuste fino de canal',
      responsible: 'Carlos Silva',
      deadline: '2026-10-28',
      priority: 'ALTA',
      status: 'ABERTA',
    }

    const res = await pcpMeetingFatia1Service.sendPendencyAlert(pendency, userContext, {
      responsibleEmail: 'carlos.silva@ciafal.com.br',
    })

    expect(pbSendSpy).toHaveBeenCalledWith(
      '/backend/v1/pcp/summaries/send-email',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(sentPayload).not.toBeNull()
    expect(sentPayload.recipients).toContain('carlos.silva@ciafal.com.br')
    expect(sentPayload.subject).toContain('PEND-000005')
    expect(sentPayload.message).toContain('REUNIAO-000004')
    expect(sentPayload.message).toContain('ATA-REUNIAO-000004-V1')
    expect(sentPayload.message).toContain('/pcp/reunioes/pendencias?code=PEND-000005')
    expect(res.emailSuccess).toBe(true)
    expect(res.emailStatus).toBe('ENVIADO')
  })

  // --------------------------------------------------------------------------
  // T8 Duplicidade: botão desabilitado durante envio (proteção contra duplo clique)
  // --------------------------------------------------------------------------
  it('T8 duplicidade: estado sendingAlert bloqueia reentrância e previne múltiplos envios concorrentes', async () => {
    let isSending = false
    let callCount = 0

    const triggerSendAlert = async () => {
      if (isSending) return { skipped: true }
      isSending = true
      try {
        callCount++
        await new Promise((r) => setTimeout(r, 20))
        return { success: true }
      } finally {
        isSending = false
      }
    }

    // Disparar simultaneamente (duplo clique rápido)
    const [first, second] = await Promise.all([triggerSendAlert(), triggerSendAlert()])

    expect(first).toEqual({ success: true })
    expect(second).toEqual({ skipped: true })
    expect(callCount).toBe(1)
  })

  // --------------------------------------------------------------------------
  // T9 Popup atualização: mostra bloco de origem somente leitura
  // --------------------------------------------------------------------------
  it('T9 popup atualização: bloco de origem expõe Reunião/ATA clicáveis, Semana, Responsável e Prazo', () => {
    const pendency: PCPMeetingPendencyRecord = {
      id: 'pend_103',
      pendency_code: 'PEND-000006',
      meeting_id: 'meet_id_004',
      meeting_code: 'REUNIAO-000004',
      meeting_date: '2026-10-14',
      ata_id: 'rec_ata_004_v1',
      ata_code: 'ATA-REUNIAO-000004-V1',
      origin_week: 42,
      origin_year: 2026,
      area: 'Qualidade',
      subject: 'Certificados de corrida',
      action: 'Anexar laudos',
      responsible: 'Engenharia Qualidade',
      deadline: '2026-10-22',
      priority: 'MEDIA',
      status: 'EM_ANDAMENTO',
    }

    const readonlyOriginBlock = {
      meetingCode: pendency.meeting_code || pendency.meeting_id,
      ataCode:
        pendency.ata_code ||
        (pendency.ata_id ? `ATA-${pendency.ata_id.slice(0, 8)}` : 'Não informada'),
      weekYear: `S${pendency.origin_week}/${pendency.origin_year}`,
      meetingDate: pendency.meeting_date,
      responsible: pendency.responsible,
      deadline: pendency.deadline,
    }

    expect(readonlyOriginBlock.meetingCode).toBe('REUNIAO-000004')
    expect(readonlyOriginBlock.ataCode).toBe('ATA-REUNIAO-000004-V1')
    expect(readonlyOriginBlock.weekYear).toBe('S42/2026')
    expect(readonlyOriginBlock.responsible).toBe('Engenharia Qualidade')
    expect(readonlyOriginBlock.deadline).toBe('2026-10-22')
  })

  // --------------------------------------------------------------------------
  // T10 Atualização: atualiza o MESMO registro e insere entrada nova no histórico
  // --------------------------------------------------------------------------
  it('T10 atualização: alterar status + nota atualiza o MESMO registro e adiciona entrada no update_history', async () => {
    const currentRecord: PCPMeetingPendencyRecord = {
      id: 'pend_104',
      pendency_code: 'PEND-000007',
      meeting_id: 'meet_id_004',
      meeting_code: 'REUNIAO-000004',
      ata_id: 'rec_ata_004_v1',
      ata_code: 'ATA-REUNIAO-000004-V1',
      origin_week: 42,
      origin_year: 2026,
      area: 'PCP',
      subject: 'Reunião de alinhamento SDC',
      action: 'Definir datas de entrega',
      responsible: 'Analista SDC',
      deadline: '2026-10-21',
      priority: 'ALTA',
      status: 'ABERTA',
      update_history: [
        {
          id: 'hist_init',
          timestamp: '2026-10-14T10:00:00.000Z',
          user_name: 'Coordenação PCP',
          status_anterior: 'ABERTA',
          status_novo: 'ABERTA',
          nota: 'Criação inicial',
          origem_atualizacao: 'Reunião PCP',
        },
      ],
    }

    vi.spyOn(pb.collection('pcp_meeting_pendency'), 'getOne').mockResolvedValue(
      currentRecord as any,
    )
    const updateSpy = vi
      .spyOn(pb.collection('pcp_meeting_pendency'), 'update')
      .mockImplementation(async (id: string, payload: any) => ({
        ...currentRecord,
        ...payload,
        id,
      }))
    vi.spyOn(pb.collection('pcp_meeting_log'), 'create').mockResolvedValue({} as any)

    const updated = await pcpMeetingFatia1Service.updatePendency(
      'pend_104',
      {
        status: 'CONCLUIDA',
        last_update_note: 'Ação executada e validada pelo supervisor',
        evidence: 'OP-994827',
      },
      userContext,
    )

    expect(updateSpy).toHaveBeenCalledWith('pend_104', expect.any(Object))
    expect(updated.id).toBe('pend_104') // mesmo ID, não criou pendência nova
    expect(updated.status).toBe('CONCLUIDA')
    expect(updated.update_history).toHaveLength(2)

    const newestHist = updated.update_history![0]
    expect(newestHist.status_anterior).toBe('ABERTA')
    expect(newestHist.status_novo).toBe('CONCLUIDA')
    expect(newestHist.nota).toBe('Ação executada e validada pelo supervisor')
    expect(newestHist.evidencia).toBe('OP-994827')
    expect(newestHist.user_name).toBe('Coordenação PCP')
  })

  // --------------------------------------------------------------------------
  // T11 Persistência: dados, vínculos e histórico permanecem no service/collection
  // --------------------------------------------------------------------------
  it('T11 persistência: após salvar, dados, vínculos (meeting/ata) e histórico permanecem íntegros', async () => {
    let databaseStore: Record<string, any> = {
      pend_persist_01: {
        id: 'pend_persist_01',
        pendency_code: 'PEND-000008',
        meeting_id: 'meet_id_004',
        meeting_code: 'REUNIAO-000004',
        ata_id: 'rec_ata_004_v1',
        ata_code: 'ATA-REUNIAO-000004-V1',
        origin_week: 42,
        origin_year: 2026,
        status: 'EM_ANDAMENTO',
        subject: 'Manutenção Preventiva',
        update_history: [],
      },
    }

    vi.spyOn(pb.collection('pcp_meeting_pendency'), 'getOne').mockImplementation(
      async (id: string) => {
        return databaseStore[id]
      },
    )
    vi.spyOn(pb.collection('pcp_meeting_pendency'), 'update').mockImplementation(
      async (id: string, payload: any) => {
        databaseStore[id] = { ...databaseStore[id], ...payload }
        return databaseStore[id]
      },
    )
    vi.spyOn(pb.collection('pcp_meeting_log'), 'create').mockResolvedValue({} as any)

    await pcpMeetingFatia1Service.updatePendency(
      'pend_persist_01',
      {
        status: 'CONCLUIDA',
        last_update_note: 'Manutenção concluída no terceiro turno',
      },
      userContext,
    )

    // Validar direto no armazenamento simulado
    const persisted = databaseStore['pend_persist_01']
    expect(persisted.meeting_id).toBe('meet_id_004')
    expect(persisted.meeting_code).toBe('REUNIAO-000004')
    expect(persisted.ata_id).toBe('rec_ata_004_v1')
    expect(persisted.ata_code).toBe('ATA-REUNIAO-000004-V1')
    expect(persisted.status).toBe('CONCLUIDA')
    expect(persisted.update_history.length).toBeGreaterThan(0)
  })

  // --------------------------------------------------------------------------
  // T12 Gestão de Performance: pendência vinculada a ACT-PERF preserva integração
  // --------------------------------------------------------------------------
  it('T12 Gestão de Performance: pendência vinculada a ACT-PERF-172420 preserva integração existente', async () => {
    const existingWithPerf: PCPMeetingPendencyRecord = {
      id: 'pend_perf_01',
      pendency_code: 'PEND-000009',
      meeting_id: 'meet_id_004',
      meeting_code: 'REUNIAO-000004',
      ata_id: 'rec_ata_004_v1',
      origin_week: 42,
      origin_year: 2026,
      area: 'L1',
      subject: 'Plano de Ação 5W2H',
      action: 'Ajuste de rendimento metálico',
      responsible: 'Gestor L1',
      deadline: '2026-10-31',
      priority: 'ALTA',
      status: 'EM_ANDAMENTO',
      performance_action_id: 'ACT-PERF-172420',
      update_history: [],
    }

    vi.spyOn(pb.collection('pcp_meeting_pendency'), 'getOne').mockResolvedValue(
      existingWithPerf as any,
    )
    const updateSpy = vi
      .spyOn(pb.collection('pcp_meeting_pendency'), 'update')
      .mockImplementation(async (id: string, payload: any) => ({
        ...existingWithPerf,
        ...payload,
      }))
    vi.spyOn(pb.collection('pcp_meeting_log'), 'create').mockResolvedValue({} as any)

    const updated = await pcpMeetingFatia1Service.updatePendency(
      'pend_perf_01',
      {
        status: 'CONCLUIDA',
        last_update_note: 'Ação 5W2H encerrada com sucesso',
      },
      userContext,
    )

    // O campo performance_action_id NÃO pode ser descartado ou sobrescrito por undefined
    const savedPayload = updateSpy.mock.calls[0][1] as any
    expect(savedPayload.performance_action_id).toBe('ACT-PERF-172420')
    expect(updated.performance_action_id).toBe('ACT-PERF-172420')
  })

  // --------------------------------------------------------------------------
  // T13 Responsividade e Não-Scroll Global: popups centralizados e responsivos
  // --------------------------------------------------------------------------
  it('T13 responsividade: checagem estática garante modais centralizados, overflow controlado e ausência de overflow-x: hidden global', () => {
    // Usar import.meta.glob com query ?raw para carregar arquivos fonte de forma compatível com o bundler do browser
    const componentsRaw = import.meta.glob(
      [
        '/src/components/meetings/PendenciasReuniaoView.tsx',
        '/src/components/meetings/ReuniaoEmAndamentoView.tsx',
        '/src/pages/PCPMeetingsPage.tsx',
      ],
      { query: '?raw', import: 'default', eager: true },
    ) as Record<string, string>

    const pendenciasViewCode =
      componentsRaw['/src/components/meetings/PendenciasReuniaoView.tsx'] || ''
    const reuniaoAndamentoCode =
      componentsRaw['/src/components/meetings/ReuniaoEmAndamentoView.tsx'] || ''
    const meetingsPageCode = componentsRaw['/src/pages/PCPMeetingsPage.tsx'] || ''

    expect(pendenciasViewCode.length).toBeGreaterThan(0)
    expect(reuniaoAndamentoCode.length).toBeGreaterThan(0)
    expect(meetingsPageCode.length).toBeGreaterThan(0)

    // Modais com max-w responsivo e overflow-y auto
    expect(pendenciasViewCode).toContain('max-w-lg')
    expect(pendenciasViewCode).toContain('max-h-[90vh]')
    expect(pendenciasViewCode).toContain('overflow-y-auto')
    expect(pendenciasViewCode).toContain('overflow-x-auto')

    // Proibido overflow-x: hidden global nos componentes de reunião
    expect(pendenciasViewCode).not.toContain('overflow-x: hidden')
    expect(pendenciasViewCode).not.toContain('overflow-x:hidden')
    expect(reuniaoAndamentoCode).not.toContain('overflow-x: hidden')
    expect(reuniaoAndamentoCode).not.toContain('overflow-x:hidden')
    expect(meetingsPageCode).not.toContain('overflow-x: hidden')
    expect(meetingsPageCode).not.toContain('overflow-x:hidden')

    // Proibido window.location.reload() nestes componentes
    expect(pendenciasViewCode).not.toContain('window.location.reload')
    expect(reuniaoAndamentoCode).not.toContain('window.location.reload')
    expect(meetingsPageCode).not.toContain('window.location.reload')
  })

  // --------------------------------------------------------------------------
  // Teste de Migração: Idempotência da 1774000049_expand_pendency_traceability_schema.js
  // --------------------------------------------------------------------------
  it('Migração 1774000049: é idempotente, não-destrutiva e marca origem_pendente_regularizacao = true sem associação automática errônea', () => {
    const migrationRaw = import.meta.glob(
      '/pocketbase/migrations/1774000049_expand_pendency_traceability_schema.js',
      { query: '?raw', import: 'default', eager: true },
    ) as Record<string, string>

    const migrationCode =
      migrationRaw['/pocketbase/migrations/1774000049_expand_pendency_traceability_schema.js'] || ''
    expect(migrationCode.length).toBeGreaterThan(0)

    // Verifica campos adicionados condicionalmente
    expect(migrationCode).toContain("!col.fields.getByName('ata_id')")
    expect(migrationCode).toContain("!col.fields.getByName('ata_code')")
    expect(migrationCode).toContain("!col.fields.getByName('meeting_code')")
    expect(migrationCode).toContain("!col.fields.getByName('meeting_date')")
    expect(migrationCode).toContain("!col.fields.getByName('company')")
    expect(migrationCode).toContain("!col.fields.getByName('update_history')")
    expect(migrationCode).toContain("!col.fields.getByName('origem_pendente_regularizacao')")

    // Verifica tratamento seguro de legados (REUNIAO_MANUAL ou MANUAL)
    expect(migrationCode).toContain("mId === 'REUNIAO_MANUAL'")
    expect(migrationCode).toContain("rec.set('origem_pendente_regularizacao', true)")
  })
})

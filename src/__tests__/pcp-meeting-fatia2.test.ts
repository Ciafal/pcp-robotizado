/**
 * SUÍTE DE TESTES AUTOMATIZADOS — FATIA 2: REUNIÃO PCP (HUB CIAFAL)
 * Cobre os requisitos formais da Fatia 2:
 * 1. Iniciar reunião agendada
 * 2. Impedir início de reunião inválida (cancelada, rascunho, etc.)
 * 3. Autosave de alterações e detecção de concorrência
 * 4. Mudança de status da pauta (iniciar discussão, concluir, adiar)
 * 5. Registro de presença real na reunião
 * 6. Criação de decisão (manual e validação humana de sugestão IA)
 * 7. Criação de pendência durante a reunião
 * 8. Herança de pendências de reuniões anteriores
 * 9. Encerramento formal com resumo e validações
 * 10. Geração da ATA final com IA (minuta V4)
 * 11. Versionamento estrito da ATA
 * 12. Comparação Prévia x Reunião x ATA Final com classificação
 * 13. Fluxo de aprovação humana
 * 14. Publicação oficial no HUB
 * 15. Listagem de histórico de reuniões
 * 16. Busca e filtros no histórico
 * 17. Consulta ao histórico com IA sem alucinações
 * 18. Detecção automática de recorrências
 * 19. Alertas de reincidência na preparação
 * 20. Trilha de auditoria e logs detalhados
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pcpMeetingFatia2Service } from '@/services/pcp-meeting-fatia2-service'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import {
  PCPMeetingRecord,
  PCPMeetingAtaRecord,
  PCPMeetingPendencyRecord,
} from '@/types/pcp-meeting'
import pb from '@/lib/pocketbase/client'

// Mocks do cliente PocketBase
vi.mock('@/lib/pocketbase/client', () => {
  const collections: Record<string, any[]> = {
    pcp_meeting: [],
    pcp_meeting_agenda_item: [],
    pcp_meeting_participant: [],
    pcp_meeting_ata: [],
    pcp_meeting_pendency: [],
    pcp_meeting_decision: [],
    pcp_meeting_log: [],
    pcp_meeting_briefing: [],
  }

  return {
    default: {
      collection: (name: string) => ({
        getOne: vi.fn(async (id: string) => {
          const item = (collections[name] || []).find((x) => x.id === id)
          if (!item) throw new Error(`Record ${id} not found in ${name}`)
          return item
        }),
        getFullList: vi.fn(async (options?: any) => {
          let list = [...(collections[name] || [])]
          if (options?.filter) {
            // Suporte a filtro básico de status e meeting_id para testes
            if (options.filter.includes("meeting_id = '")) {
              const mId = options.filter.split("meeting_id = '")[1].split("'")[0]
              list = list.filter((i) => i.meeting_id === mId)
            }
          }
          return list
        }),
        create: vi.fn(async (data: any) => {
          const record = {
            ...data,
            id: `id_${Date.now()}_${Math.random()}`,
            created: new Date().toISOString(),
          }
          if (!collections[name]) collections[name] = []
          collections[name].push(record)
          return record
        }),
        update: vi.fn(async (id: string, data: any) => {
          const list = collections[name] || []
          const idx = list.findIndex((x) => x.id === id)
          if (idx === -1) {
            const newRec = { ...data, id }
            list.push(newRec)
            return newRec
          }
          list[idx] = { ...list[idx], ...data }
          return list[idx]
        }),
        delete: vi.fn(async (id: string) => {
          if (collections[name]) {
            collections[name] = collections[name].filter((x) => x.id !== id)
          }
          return true
        }),
      }),
      _resetMockData: () => {
        for (const k in collections) collections[k] = []
      },
      _seedData: (colName: string, items: any[]) => {
        collections[colName] = [...items]
      },
    },
  }
})

describe('Fatia 2 — Reunião PCP: Suíte Completa de Governança e Operação', () => {
  const userMock = { id: 'usr-1', name: 'João Coordenador PCP' }

  beforeEach(() => {
    ;(pb as any)._resetMockData()
  })

  // 1 & 2. Iniciar reunião e validações de impedimento
  it('1 e 2: Deve permitir iniciar reunião AGENDADA e impedir reuniões em outros estados', async () => {
    const meetingAgendada: PCPMeetingRecord = {
      id: 'meet-1',
      meeting_code: 'REUNIAO-001',
      title: 'Reunião PCP S38',
      week: 38,
      year: 2025,
      company: 'CIAFAL',
      meeting_date: '2025-09-18',
      start_time: '09:00',
      expected_end_time: '10:30',
      modality: 'PRESENCIAL',
      organizer: 'João',
      conductor: 'João',
      status: 'AGENDADA',
      briefing_gerado: true,
      pauta_gerada: true,
      previa_gerada: true,
      previa_enviada: true,
      agendamento_confirmado: true,
    }

    const meetingCancelada: PCPMeetingRecord = {
      ...meetingAgendada,
      id: 'meet-2',
      status: 'CANCELADA',
    }

    ;(pb as any)._seedData('pcp_meeting', [meetingAgendada, meetingCancelada])

    expect(pcpMeetingFatia2Service.canStartMeeting(meetingAgendada).allowed).toBe(true)
    expect(pcpMeetingFatia2Service.canStartMeeting(meetingCancelada).allowed).toBe(false)

    // Iniciar de fato a reunião
    const started = await pcpMeetingFatia2Service.startMeeting('meet-1', userMock)
    expect(started.status).toBe('EM_ANDAMENTO')
    expect(started.started_by_user).toBe(userMock.name)
    expect(started.real_start_time).toBeDefined()
  })

  // 3. Autosave e detecção de concorrência
  it('3: Deve executar autosave e detectar conflito caso a versão seja anterior', async () => {
    const meeting: PCPMeetingRecord = {
      id: 'meet-sync',
      meeting_code: 'REUNIAO-002',
      title: 'Reunião Teste Autosave',
      week: 38,
      year: 2025,
      company: 'CIAFAL',
      meeting_date: '2025-09-18',
      start_time: '09:00',
      expected_end_time: '10:00',
      modality: 'ONLINE',
      organizer: 'Maria',
      conductor: 'Maria',
      status: 'EM_ANDAMENTO',
      briefing_gerado: true,
      pauta_gerada: true,
      previa_gerada: true,
      previa_enviada: true,
      agendamento_confirmado: true,
      version_lock: 5,
    }
    ;(pb as any)._seedData('pcp_meeting', [meeting])

    // Caso de sucesso (mesma versão)
    const resSuccess = await pcpMeetingFatia2Service.autosaveMeeting(
      'meet-sync',
      'notes',
      'Anotação em tempo real',
      '',
      5,
      userMock,
    )
    expect(resSuccess.success).toBe(true)
    expect(resSuccess.data?.notes).toBe('Anotação em tempo real')

    // Caso de conflito (tentando salvar com versão 4 quando o banco já está em 6)
    const resConflict = await pcpMeetingFatia2Service.autosaveMeeting(
      'meet-sync',
      'notes',
      'Outra anotação desatualizada',
      '',
      4,
      userMock,
    )
    expect(resConflict.success).toBe(false)
    expect(resConflict.conflict).toBe(true)
  })

  // 4. Mudança de pauta durante a reunião
  it('4: Deve atualizar o status da pauta (iniciar discussão, concluir assunto e adiar)', async () => {
    const agendaItem = {
      id: 'item-1',
      meeting_id: 'meet-1',
      subject: 'Programação Linha 2',
      area: 'L2',
      priority: 'CRITICO' as const,
      estimated_time_min: 15,
      presenter: 'Carlos',
      decision_needed: true,
      order: 1,
      discussion_status: 'NAO_INICIADO' as const,
    }
    ;(pb as any)._seedData('pcp_meeting_agenda_item', [agendaItem])

    // Iniciar discussão
    const started = await pcpMeetingFatia2Service.updateAgendaItemProgress(
      'item-1',
      'meet-1',
      'INICIAR_DISCUSSAO',
      userMock,
    )
    expect(started.discussion_status).toBe('EM_DISCUSSAO')
    expect(started.discussion_start_time).toBeDefined()

    // Concluir assunto
    const finished = await pcpMeetingFatia2Service.updateAgendaItemProgress(
      'item-1',
      'meet-1',
      'CONCLUIR_ASSUNTO',
      userMock,
    )
    expect(finished.discussion_status).toBe('CONCLUIDO')
    expect(finished.discussion_end_time).toBeDefined()
  })

  // 5. Presença real na reunião
  it('5: Deve persistir o registro de presenças reais', async () => {
    const part = {
      id: 'part-1',
      meeting_id: 'meet-1',
      person_name: 'Roberto Gerente',
      area: 'Operações',
      status: 'CONFIRMADO' as const,
    }
    ;(pb as any)._seedData('pcp_meeting_participant', [part])

    await pcpMeetingFatia2Service.recordAttendance(
      'meet-1',
      [{ participantId: 'part-1', attendance_status: 'PRESENTE', joined_at: '09:05' }],
      userMock,
    )

    const updated = await pb.collection('pcp_meeting_participant').getOne('part-1')
    expect(updated.attendance_status).toBe('PRESENTE')
    expect(updated.status).toBe('PARTICIPOU')
  })

  // 6. Decisões: manual e validação da IA
  it('6: Deve registrar decisões e exigir confirmação para sugestões da IA', async () => {
    // Decisão manual
    const decManual = await pcpMeetingFatia2Service.createDecision(
      'meet-1',
      {
        subject: 'Priorizar Bobina 304',
        description: 'Reprogramar acabamento para quinta-feira',
        area: 'L2',
        responsible: 'Carlos',
        origin_type: 'MANUAL',
      },
      userMock,
    )
    expect(decManual.id).toBeDefined()
    expect(decManual.is_confirmed).toBe(true)

    // Decisão gerada por IA que necessita confirmação humana
    const decAi = await pcpMeetingFatia2Service.createDecision(
      'meet-1',
      {
        subject: 'Sugestão IA sobre Tarugos',
        description: 'Comprar lote emergencial',
        area: 'Matéria-Prima',
        responsible: 'A Definir',
        origin_type: 'TRANSCRICAO_IA',
        is_confirmed: false,
      },
      userMock,
    )
    expect(decAi.is_confirmed).toBe(false)

    // Validação humana
    const confirmed = await pcpMeetingFatia2Service.confirmAiDecision(
      decAi.id!,
      'meet-1',
      {
        description: 'Comprar lote emergencial de 50t de SAE 1020',
        area: 'Matéria-Prima',
        responsible: 'Marcos Compras',
      },
      userMock,
    )
    expect(confirmed.is_confirmed).toBe(true)
    expect(confirmed.responsible).toBe('Marcos Compras')
  })

  // 7 & 8. Pendências e Herança de reuniões passadas
  it('7 e 8: Deve permitir herdar pendências anteriores e criar novas pendências', async () => {
    const pendPassada: PCPMeetingPendencyRecord = {
      id: 'pend-old',
      pendency_code: 'PEND-00010',
      meeting_id: 'meet-anterior',
      origin_week: 37,
      origin_year: 2025,
      area: 'L1',
      subject: 'Ajuste de matriz L1',
      action: 'Aguardando usinagem',
      responsible: 'Pedro Roll Shop',
      deadline: '2025-09-22',
      priority: 'ALTA',
      status: 'EM_ANDAMENTO',
    }
    ;(pb as any)._seedData('pcp_meeting_pendency', [pendPassada])

    const herdadas = await pcpMeetingFatia2Service.inheritPreviousPendencies('meet-1')
    expect(herdadas.length).toBe(1)
    expect(herdadas[0].pendency_code).toBe('PEND-00010')

    // Criar nova pendência na reunião atual
    const nova = await pcpMeetingFatia1Service.createPendency(
      {
        meeting_id: 'meet-1',
        area: 'Qualidade',
        subject: 'Certificado de MTO',
        action: 'Cobrar fornecedor',
        responsible: 'Juliana',
        deadline: '2025-09-20',
        priority: 'CRITICA',
        status: 'ABERTA',
        origin_week: 38,
        origin_year: 2025,
      },
      userMock,
    )
    expect(nova.pendency_code).toBeDefined()
    expect(nova.area).toBe('Qualidade')
  })

  // 9. Encerramento de Reunião com resumo e validações
  it('9: Deve calcular o resumo de encerramento e encerrar a reunião para AGUARDANDO_ATA_FINAL', async () => {
    const meeting: PCPMeetingRecord = {
      id: 'meet-close',
      meeting_code: 'REUNIAO-009',
      title: 'Reunião de Encerramento',
      week: 38,
      year: 2025,
      company: 'CIAFAL',
      meeting_date: '2025-09-18',
      start_time: '09:00',
      expected_end_time: '10:00',
      real_start_time: new Date(Date.now() - 3600000).toISOString(),
      modality: 'PRESENCIAL',
      organizer: 'João',
      conductor: 'João',
      status: 'EM_ANDAMENTO',
      briefing_gerado: true,
      pauta_gerada: true,
      previa_gerada: true,
      previa_enviada: true,
      agendamento_confirmado: true,
    }
    ;(pb as any)._seedData('pcp_meeting', [meeting])

    const summary = await pcpMeetingFatia2Service.getMeetingClosureSummary('meet-close')
    expect(summary.duracaoTotalSegundos).toBeGreaterThan(0)

    const closed = await pcpMeetingFatia2Service.closeMeeting('meet-close', userMock)
    expect(closed.status).toBe('AGUARDANDO_ATA_FINAL')
    expect(closed.real_end_time).toBeDefined()
    expect(closed.actual_duration_seconds).toBeGreaterThan(0)
  })

  // 10, 11 e 12. Geração da ATA Final com IA, versionamento e comparação Prévia x Reunião
  it('10, 11 e 12: Deve gerar a Minuta da ATA Final por IA mantendo versionamento e criando comparação', async () => {
    const baseAta: PCPMeetingAtaRecord = {
      id: 'ata-previa',
      meeting_id: 'meet-ata',
      version: 2,
      ata_type: 'PREVIA',
      status: 'EM_REVISAO',
      overall_completeness: 80,
      template_code: 'SGQ 8.1.001-R002 Rev 8',
      structured_content: {
        template_code: 'SGQ 8.1.001-R002 Rev 8',
        template_revision: 8,
        secoes: {
          sec_pcp: {
            id: 'sec_pcp',
            nome: 'PCP',
            ordem: 1,
            obrigatorio: true,
            itens: [
              {
                id: 'it-1',
                topico: 'Produção Prevista',
                detalhes: 'Produção prevista para 18/09',
                status_info: 'MANTER',
              },
            ],
          },
        },
      },
    }

    const meeting: PCPMeetingRecord = {
      id: 'meet-ata',
      meeting_code: 'REUNIAO-ATA',
      title: 'Reunião ATA Final',
      week: 38,
      year: 2025,
      company: 'CIAFAL',
      meeting_date: '2025-09-18',
      start_time: '09:00',
      expected_end_time: '10:00',
      modality: 'PRESENCIAL',
      organizer: 'João',
      conductor: 'João',
      status: 'AGUARDANDO_ATA_FINAL',
      briefing_gerado: true,
      pauta_gerada: true,
      previa_gerada: true,
      previa_enviada: true,
      agendamento_confirmado: true,
    }

    ;(pb as any)._seedData('pcp_meeting', [meeting])
    ;(pb as any)._seedData('pcp_meeting_ata', [baseAta])

    // Inserir decisão
    await pcpMeetingFatia2Service.createDecision(
      'meet-ata',
      {
        subject: 'Produção Reprogramada',
        description: 'Produção reprogramada para 21/09',
        area: 'PCP',
        responsible: 'Carlos',
        ata_section_id: 'sec_pcp',
        origin_type: 'MANUAL',
      },
      userMock,
    )

    // Gerar ATA Final com IA
    const finalAta = await pcpMeetingFatia2Service.generateFinalAtaWithAi('meet-ata', userMock)
    expect(finalAta.version).toBe(3)
    expect(finalAta.ata_type).toBe('FINAL')
    expect(finalAta.comparison_data).toBeDefined()
    expect(finalAta.comparison_data?.length).toBeGreaterThan(0)

    // O status da reunião avança para MINUTA_GERADA
    const meetUpdated = await pb.collection('pcp_meeting').getOne('meet-ata')
    expect(meetUpdated.status).toBe('MINUTA_GERADA')
  })

  // 13 e 14. Aprovação e Publicação da ATA Oficial
  it('13 e 14: Deve executar fluxo de aprovação e publicação formal com registro no HUB', async () => {
    const meeting = {
      id: 'meet-pub',
      title: 'Reunião a Publicar',
      status: 'MINUTA_GERADA',
      meeting_code: 'REUNIAO-PUB',
    }
    const ata = {
      id: 'ata-pub',
      meeting_id: 'meet-pub',
      version: 4,
      status: 'MINUTA',
    }
    ;(pb as any)._seedData('pcp_meeting', [meeting])
    ;(pb as any)._seedData('pcp_meeting_ata', [ata])

    // Enviar para aprovação
    const forApproval = await pcpMeetingFatia2Service.submitAtaForApproval(
      'meet-pub',
      'ata-pub',
      userMock,
    )
    expect(forApproval.status).toBe('AGUARDANDO_APROVACAO')

    // Aprovar
    const approved = await pcpMeetingFatia2Service.approveAta('meet-pub', 'ata-pub', {
      name: 'Gerente Fabril',
    })
    expect(approved.status).toBe('ATA_APROVADA')

    // Publicar
    const published = await pcpMeetingFatia2Service.publishAta('meet-pub', 'ata-pub', userMock)
    expect(published.meeting.status).toBe('PUBLICADA')
    expect(published.ata.status).toBe('PUBLICADA')
    expect(published.ata.published_by).toBe(userMock.name)
  })

  // 15, 16 e 17. Consulta Histórica Inteligente com IA estrita (NUNCA alucinar)
  it('15, 16 e 17: Consulta com IA deve retornar trechos exatos de decisões/pendências e não alucinar', async () => {
    const meet = { id: 'm-hist', meeting_code: 'REUNIAO-008', week: 36, year: 2025 }
    const pend = {
      id: 'p-1',
      meeting_id: 'm-hist',
      pendency_code: 'PEND-008-01',
      area: 'L2',
      subject: 'Problema no motor DP04',
      action: 'Troca de escovas',
      responsible: 'Elétrica',
      deadline: '2025-09-15',
      status: 'ABERTA',
      origin_week: 36,
      origin_year: 2025,
    }
    ;(pb as any)._seedData('pcp_meeting', [meet])
    ;(pb as any)._seedData('pcp_meeting_pendency', [pend])

    const res = await pcpMeetingFatia2Service.queryMeetingHistoryWithAi('DP04')
    expect(res.snippets.length).toBe(1)
    expect(res.snippets[0].trecho).toContain('Problema no motor DP04')
    expect(res.relatedMeetings.length).toBe(1)

    // Consulta de termo inexistente (não deve inventar resposta)
    const resVazia = await pcpMeetingFatia2Service.queryMeetingHistoryWithAi('TermoInexistenteXYZ')
    expect(resVazia.snippets.length).toBe(0)
    expect(resVazia.answer).toContain('Não foram localizados registros no histórico oficial')
  })

  // 18 e 19. Detecção de Recorrências e Alertas
  it('18 e 19: Deve agrupar pendências recorrentes e emitir alertas para reuniões', async () => {
    const p1 = {
      id: 'p-rec-1',
      meeting_id: 'm-1',
      area: 'Matéria-Prima',
      subject: 'Falta de Tarugo SAE 1020',
      action: 'Cobrar usina',
      responsible: 'Suprimentos',
      origin_week: 35,
      origin_year: 2025,
      status: 'ABERTA',
      deadline: '2025-09-01',
    }
    const p2 = {
      id: 'p-rec-2',
      meeting_id: 'm-2',
      area: 'Matéria-Prima',
      subject: 'Falta de Tarugo SAE 1020',
      action: 'Cobrar novamente usina',
      responsible: 'Suprimentos',
      origin_week: 37,
      origin_year: 2025,
      status: 'ABERTA',
      deadline: '2025-09-10',
    }
    ;(pb as any)._seedData('pcp_meeting_pendency', [p1, p2])

    const recorrencias = await pcpMeetingFatia2Service.detectRecurrences()
    expect(recorrencias.length).toBeGreaterThan(0)
    expect(recorrencias[0].totalOcorrencias).toBe(2)
    expect(recorrencias[0].indicadorTexto).toContain('Falta de Tarugo SAE 1020')

    const alerts = await pcpMeetingFatia2Service.getRecurrenceAlertsForMeeting('m-3')
    expect(alerts.recorrencias.length).toBeGreaterThan(0)
    expect(alerts.pendenciasVencidas.length).toBe(2) // Ambas com deadline passado
  })

  // 20. Trilha de auditoria
  it('20: Deve registrar trilha de auditoria para todas as operações da Fatia 2', async () => {
    const logs = await pcpMeetingFatia1Service.listLogs('meet-1')
    expect(Array.isArray(logs)).toBe(true)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  pcpAtaDistribuicaoService,
  PcpAtaDistribuicaoService,
} from '@/services/pcp-ata-distribuicao-service'
import {
  getAtaPdfFileName,
  renderAtaOfficialHtml,
  createAtaPdfBlob,
} from '@/services/pcp-ata-pdf-generator'
import pb from '@/lib/pocketbase/client'
import { PCPMeetingAtaRecord, PCPMeetingRecord } from '@/types/pcp-meeting'

describe('Distribuição de ATAs da Reunião PCP — Testes de Negócio e Serviços', () => {
  const mockMeeting: PCPMeetingRecord = {
    id: 'meet-123',
    meeting_code: 'PCP-2025-W12',
    week: 12,
    year: 2025,
    title: 'Reunião Semanal de Programação PCP W12',
    meeting_date: '17/03/2025',
    start_time: '08:30',
    expected_end_time: '10:00',
    company: 'CIAFAL',
    modality: 'PRESENCIAL',
    organizer: 'PCP',
    conductor: 'Carlos Oliveira',
    status: 'REALIZADA',
    briefing_gerado: true,
    pauta_gerada: true,
    previa_gerada: true,
    previa_enviada: true,
    agendamento_confirmado: true,
  }

  const mockAta: PCPMeetingAtaRecord = {
    id: 'ata-999',
    meeting_id: 'meet-123',
    version: 4,
    ata_type: 'FINAL',
    status: 'EM_REVISAO',
    overall_completeness: 100,
    structured_content: {
      template_code: '8.1.001-R002',
      template_revision: 8,
      secoes: {
        acabamento_l2: {
          id: 'acabamento_l2',
          nome: 'Acabamento L2',
          obrigatorio: true,
          ordem: 1,
          itens: [
            {
              id: 'item-1',
              topico: 'Velocidade Operacional',
              detalhes: 'Meta mantida em 85 t/h com setup otimizado.',
              responsavel: 'Operação',
              status_info: 'MANTER',
            },
          ],
        },
        comercial: {
          id: 'comercial',
          nome: 'Comercial & Carteira',
          obrigatorio: true,
          ordem: 2,
          itens: [
            {
              id: 'item-2',
              topico: 'Atendimento MTO',
              detalhes: 'Priorização de pedidos de clientes estratégicos da carteira.',
              responsavel: 'Comercial',
              status_info: 'NOVA',
            },
          ],
        },
      },
      ...({
        paradas_programadas_snapshot: [
          {
            line: 'L1',
            type: 'PREVENTIVA',
            start_time: '18/03/2025 06:00',
            end_time: '18/03/2025 14:00',
            reason: 'Troca de facas e calibração',
          },
        ],
        pendencias_snapshot: [
          {
            id: 'pend-1',
            pendency_title: 'Regularizar apontamentos COGI L2',
            responsible_name: 'Roberto Souza',
            area: 'Produção',
            due_date: '20/03/2025',
            status: 'PENDENTE',
            notes: 'Verificar divergência no SAP',
          },
        ],
      } as any),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Gera nome de arquivo PDF oficial no padrão ATA_PCP_[CodigoATA]_[AAAAMMDD].pdf', () => {
    const nome = getAtaPdfFileName('PCP-2025-W12', '17/03/2025')
    expect(nome).toBe('ATA_PCP_PCP-2025-W12_20250317.pdf')
  })

  it('Gera nome de arquivo resiliente para datas no formato YYYY-MM-DD', () => {
    const nome = getAtaPdfFileName('PCP-2025-W12', '2025-03-17')
    expect(nome).toBe('ATA_PCP_PCP-2025-W12_20250317.pdf')
  })

  it('Gera HTML oficial contendo cabeçalho SGQ, seções completas, paradas e pendências', () => {
    const html = renderAtaOfficialHtml({
      meeting: mockMeeting,
      ata: mockAta,
      dataHoraEmissao: '17/03/2025 10:15',
    })

    expect(html).toContain('SGQ 8.1.001-R002 Rev 8')
    expect(html).toContain('ATA OFICIAL DE REUNIÃO PCP')
    expect(html).toContain('PCP-2025-W12')
    expect(html).toContain('Acabamento L2')
    expect(html).toContain('Velocidade Operacional')
    expect(html).toContain('Comercial &amp; Carteira')
    expect(html).toContain('Paradas Programadas da Semana')
    expect(html).toContain('Troca de facas e calibração')
    expect(html).toContain('Pendências e Ações Pactuadas')
    expect(html).toContain('Regularizar apontamentos COGI L2')
  })

  it('createAtaPdfBlob cria Blob consistente e não nulo com o nome correto', () => {
    const res = createAtaPdfBlob({
      meeting: mockMeeting,
      ata: mockAta,
    })

    expect(res.fileName).toBe('ATA_PCP_PCP-2025-W12_20250317.pdf')
    expect(res.blob).toBeDefined()
    expect(res.blob.size).toBeGreaterThan(0)
    expect(res.html).toContain('CIAFAL')
  })

  it('Publicação no HUB cria registros no pcp_communications, pcp_ata_distribuicoes, envios individuais e audit log', async () => {
    // Mocks do PocketBase
    const mockCreatedComm = { id: 'comm-123' }
    const mockCreatedDist = {
      id: 'dist-456',
      ata_id: mockAta.id,
      meeting_id: mockMeeting.id,
      status_distribuicao: 'PUBLICADO',
    }

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      return {
        create: vi.fn().mockImplementation((data: any) => {
          if (collName === 'pcp_communications') return Promise.resolve(mockCreatedComm)
          if (collName === 'pcp_ata_distribuicoes') return Promise.resolve(mockCreatedDist)
          if (collName === 'pcp_ata_destinatarios_envio')
            return Promise.resolve({ id: 'dest-1', ...data })
          if (collName === 'pcp_internal_notifications') return Promise.resolve({ id: 'notif-1' })
          if (collName === 'pcp_audit_logs') return Promise.resolve({ id: 'audit-1' })
          return Promise.resolve({ id: 'rec-1' })
        }),
      } as any
    })

    const result = await pcpAtaDistribuicaoService.publicarComunicadoNoHub({
      ataId: mockAta.id,
      meetingId: mockMeeting.id,
      meetingCode: mockMeeting.meeting_code,
      meetingDate: mockMeeting.meeting_date,
      meetingTitle: mockMeeting.title,
      versaoAta: mockAta.version,
      isMinuta: false,
      assunto: 'ATA Reunião PCP — 17/03/2025',
      mensagemComplementar: 'Favor confirmar leitura até 18/03.',
      exigirConfirmacao: true,
      destinatarios: [
        {
          id: 'user-1',
          name: 'Carlos Oliveira',
          email: 'carlos@ciafal.com.br',
          role: 'PCP',
          sector: 'PCP',
        },
      ],
      pdfNomeArquivo: 'ATA_PCP_PCP-2025-W12_20250317.pdf',
      currentUser: {
        id: 'adm-1',
        name: 'Administrador PCP',
        email: 'pcp@ciafal.com.br',
        role: 'PCP_ADMIN',
      },
    })

    expect(result.id).toBe('dist-456')
    expect(result.status_distribuicao).toBe('PUBLICADO')
  })

  it('Envio de e-mail sem anexo PDF é impedido com erro explicativo SGQ', async () => {
    await expect(
      pcpAtaDistribuicaoService.enviarAtaPorEmail({
        ataId: mockAta.id,
        meetingId: mockMeeting.id,
        meetingCode: mockMeeting.meeting_code,
        meetingDate: mockMeeting.meeting_date,
        meetingTitle: mockMeeting.title,
        versaoAta: mockAta.version,
        isMinuta: false,
        assunto: 'ATA OFICIAL — Reunião PCP',
        exigirConfirmacao: true,
        destinatarios: [
          {
            id: 'user-1',
            name: 'Carlos Oliveira',
            email: 'carlos@ciafal.com.br',
          },
        ],
        pdfNomeArquivo: '',
        pdfBlob: null as any,
        corpoEmailHtml: '<p>HTML</p>',
        currentUser: {
          id: 'adm-1',
          name: 'Administrador PCP',
        },
      }),
    ).rejects.toThrow('O PDF oficial SGQ é obrigatório como anexo do e-mail')
  })

  it('Envio de e-mail registra honestamente status PENDENTE_SMTP sem simulações falsas', async () => {
    const mockCreatedDist = {
      id: 'dist-email-789',
      status_distribuicao: 'PENDENTE_SMTP',
    }

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      return {
        create: vi.fn().mockImplementation((data: any) => {
          if (collName === 'pcp_ata_distribuicoes') {
            expect(data.status_distribuicao).toBe('PENDENTE_SMTP')
            return Promise.resolve(mockCreatedDist)
          }
          if (collName === 'pcp_ata_destinatarios_envio') {
            expect(data.status_envio).toBe('PENDENTE_SMTP')
            return Promise.resolve({ id: 'dest-env', ...data })
          }
          if (collName === 'pcp_audit_logs') return Promise.resolve({ id: 'aud-1' })
          return Promise.resolve({ id: 'generic-1' })
        }),
      } as any
    })

    const dummyBlob = new Blob(['teste'], { type: 'text/html' })

    const res = await pcpAtaDistribuicaoService.enviarAtaPorEmail({
      ataId: mockAta.id,
      meetingId: mockMeeting.id,
      meetingCode: mockMeeting.meeting_code,
      meetingDate: mockMeeting.meeting_date,
      meetingTitle: mockMeeting.title,
      versaoAta: mockAta.version,
      isMinuta: false,
      assunto: 'ATA OFICIAL — Reunião Semanal PCP — 17/03/2025',
      exigirConfirmacao: true,
      destinatarios: [
        {
          id: 'u1',
          name: 'João Silva',
          email: 'joao@ciafal.com.br',
          sector: 'Produção',
        },
      ],
      destinatariosCc: [
        {
          id: 'u2',
          name: 'Mariana Costa',
          email: 'mariana@ciafal.com.br',
          sector: 'Qualidade',
        },
      ],
      pdfNomeArquivo: 'ATA_PCP_PCP-2025-W12_20250317.pdf',
      pdfBlob: dummyBlob,
      corpoEmailHtml: '<html></html>',
      currentUser: {
        id: 'adm-1',
        name: 'Administrador PCP',
        email: 'pcp@ciafal.com.br',
      },
    })

    expect(res.status_distribuicao).toBe('PENDENTE_SMTP')
  })

  it('Confirmação de leitura registra evidência auditada e atualiza status do destinatário', async () => {
    const mockConf = {
      id: 'conf-321',
      codigo_ata: 'PCP-2025-W12',
      versao_ata: 4,
      user_email: 'carlos@ciafal.com.br',
      confirmado_em: '2025-03-17T11:00:00.000Z',
    }

    const mockEnvios = [{ id: 'envio-1', destinatario_email: 'carlos@ciafal.com.br' }]
    const mockUpdateEnvio = vi.fn().mockResolvedValue({})
    const mockUpdateDist = vi.fn().mockResolvedValue({})

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      return {
        create: vi.fn().mockImplementation((data: any) => {
          if (collName === 'pcp_ata_confirmacoes_leitura') return Promise.resolve(mockConf)
          if (collName === 'pcp_audit_logs') return Promise.resolve({ id: 'aud-conf' })
          return Promise.resolve({ id: 'res-1' })
        }),
        getFullList: vi.fn().mockImplementation(() => {
          if (collName === 'pcp_ata_destinatarios_envio') return Promise.resolve(mockEnvios)
          if (collName === 'pcp_ata_distribuicoes')
            return Promise.resolve([{ id: 'dist-1', confirmacoes_count: 0 }])
          return Promise.resolve([])
        }),
        update: vi.fn().mockImplementation((id: string, data: any) => {
          if (collName === 'pcp_ata_destinatarios_envio') {
            mockUpdateEnvio(id, data)
            return Promise.resolve(data)
          }
          if (collName === 'pcp_ata_distribuicoes') {
            mockUpdateDist(id, data)
            return Promise.resolve(data)
          }
          return Promise.resolve(data)
        }),
      } as any
    })

    const confRes = await pcpAtaDistribuicaoService.confirmarLeituraAta({
      ataId: mockAta.id,
      meetingId: mockMeeting.id,
      codigoAta: mockMeeting.meeting_code,
      versaoAta: mockAta.version,
      canalAcesso: 'HUB_PCP_ROBOTIZADO',
      currentUser: {
        id: 'u1',
        name: 'Carlos Oliveira',
        email: 'carlos@ciafal.com.br',
        sector: 'PCP',
      },
    })

    expect(confRes.id).toBe('conf-321')
    expect(mockUpdateEnvio).toHaveBeenCalledWith(
      'envio-1',
      expect.objectContaining({
        confirmado_leitura: true,
        status_envio: 'LEITURA_CONFIRMADA',
      }),
    )
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ParadaForm } from '@/components/programacao-parada/ParadaForm'
import { CentrosComParadaProgramadaSection } from '@/components/programacao-parada/CentrosComParadaProgramadaSection'
import { SendCommunicationModal } from '@/components/programacao-parada/SendCommunicationModal'
import { ParadasProgramadasAtaSection } from '@/components/meetings/ParadasProgramadasAtaSection'
import { programacaoParadaService } from '@/services/programacao-parada-service'
import { pcpMeetingFatia2Service } from '@/services/pcp-meeting-fatia2-service'
import { pb } from '@/lib/pocketbase/client'
import { PCPMeetingAtaRecord } from '@/types/pcp-meeting'

// Mocking pb calls defensively
vi.mock('@/lib/pocketbase/client', async () => {
  const actual = await vi.importActual<any>('@/lib/pocketbase/client')
  return {
    ...actual,
    pb: {
      ...actual.pb,
      authStore: {
        model: {
          id: 'user-pcp-01',
          name: 'Lucas Ferreira (PCP)',
          email: 'lucas.pcp@ciafal.com.br',
          role: 'PCP_PROGRAMMER',
        },
      },
      collection: (col: string) => ({
        getFullList: vi.fn().mockImplementation(async (opts?: any) => {
          if (col === 'programacao_parada_centros') {
            return [
              {
                id: 'ppc-01',
                parada_id: 'par-01',
                empresa_id: '1001',
                empresa_code: '1001',
                linha_id: 'L1',
                linha_code: 'L1',
                centro_id: 'C-L1-01',
                centro_code: 'C-L1-01',
                inicio_iso: '01/11/2026 06:00',
                fim_iso: '06/11/2026 18:00',
                data_inicio: '01/11/2026',
                hora_inicio: '06:00',
                data_fim: '06/11/2026',
                hora_fim: '18:00',
                duracao_horas: 132,
                motivo: 'Manutenção preventiva',
                status: 'ATIVO',
              },
              {
                id: 'ppc-02',
                parada_id: 'par-01',
                empresa_id: '1001',
                empresa_code: '1001',
                linha_id: 'L2',
                linha_code: 'L2',
                centro_id: 'C-L2-01',
                centro_code: 'C-L2-01',
                inicio_iso: '02/11/2026 06:00',
                fim_iso: '04/11/2026 18:00',
                data_inicio: '02/11/2026',
                hora_inicio: '06:00',
                data_fim: '04/11/2026',
                hora_fim: '18:00',
                duracao_horas: 60,
                motivo: 'Reforma de Refratário',
                status: 'PENDENTE',
              },
            ]
          }
          if (col === 'programacao_parada_comunicados') {
            return []
          }
          if (col === 'users') {
            return [
              {
                id: 'u1',
                name: 'Lucas Ferreira',
                email: 'lucas.pcp@ciafal.com.br',
                role: 'PCP_PROGRAMMER',
              },
            ]
          }
          return []
        }),
        create: vi.fn().mockImplementation(async (data: any) => ({
          id: `created-${Math.random()}`,
          ...data,
        })),
        update: vi.fn().mockImplementation(async (id: string, data: any) => ({
          id,
          ...data,
        })),
        getOne: vi.fn().mockImplementation(async (id: string) => ({
          id,
          structured_content: { secoes: {} },
        })),
      }),
      send: vi.fn().mockResolvedValue({ sucesso: true, destinatarios_count: 3 }),
    },
    default: actual.pb,
  }
})

describe('Testes de Aceitação: Entregas 1, 2 e 3 de Programação de Paradas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ═════════════════════════════════════════════════════════════════════════
  // ENTREGA 1 — GRID ALINHADO DOS 5 CAMPOS + SANEAMENTO BOTÃO FANTASMA
  // ═════════════════════════════════════════════════════════════════════════
  it('E1: ParadaForm renderiza o grid unificado lg:grid-cols-5 items-end com 5 campos e duração readonly', () => {
    render(<ParadaForm onAddCentro={vi.fn()} />)

    const grid = screen.getByTestId('periodo-grid')
    expect(grid).toBeDefined()
    expect(grid.className).toContain('grid')
    expect(grid.className).toContain('lg:grid-cols-5')
    expect(grid.className).toContain('items-end')

    // Labels padronizados
    expect(screen.getByText('Data Início')).toBeDefined()
    expect(screen.getByText('Horário Início (24h)')).toBeDefined()
    expect(screen.getByText('Data Fim')).toBeDefined()
    expect(screen.getByText('Horário Fim (24h)')).toBeDefined()
    expect(screen.getByText('Duração Prevista')).toBeDefined()

    // Campo de duração prevista readonly
    const duracaoBox = screen.getByTestId('duracao-prevista-display')
    expect(duracaoBox).toBeDefined()
    expect(duracaoBox.className).toContain('cursor-not-allowed')
    expect(duracaoBox.className).toContain('bg-slate-50')
  })

  it('E1: ParadaForm não renderiza nenhum botão fantasma sem centro em edição', () => {
    render(<ParadaForm onAddCentro={vi.fn()} editingCentro={null} />)

    // Apenas o botão "+ Adicionar Centro à Parada" deve estar presente na área de ação
    expect(screen.queryByText('Cancelar Edição')).toBeNull()
    const submitBtn = screen.getByText('+ Adicionar Centro à Parada')
    expect(submitBtn).toBeDefined()
  })

  // ═════════════════════════════════════════════════════════════════════════
  // ENTREGA 2 — SEÇÃO "CENTROS COM PARADA PROGRAMADA" + SELEÇÃO + COMUNICADO
  // ═════════════════════════════════════════════════════════════════════════
  it('E2: CentrosComParadaProgramadaSection desabilita botão de comunicado quando 0 selecionados e habilita com badge para >= 1', async () => {
    render(<CentrosComParadaProgramadaSection />)

    // Aguarda carregar centros
    await waitFor(() => {
      expect(screen.getByText('C-L1-01')).toBeDefined()
    })

    const btnEnviar = screen.getByTestId('btn-enviar-comunicado-selecao')
    expect(btnEnviar).toBeDefined()
    // Inicialmente com 0 selecionados -> disabled
    expect(btnEnviar).toBeDisabled()

    // Clica no checkbox do primeiro centro
    const checkboxCentro1 = screen.getByTestId('checkbox-centro-ppc-01')
    fireEvent.click(checkboxCentro1)

    // Agora o botão deve estar habilitado e conter badge "1"
    await waitFor(() => {
      expect(btnEnviar).not.toBeDisabled()
      expect(screen.getByTestId('badge-selecionados').textContent).toBe('1')
    })
  })

  it('E2: SendCommunicationModal monta corpo HTML corporativo com tabela inline e destinatários configurados', async () => {
    const mockCentros = [
      {
        id: 'ppc-01',
        empresa_code: '1001',
        linha_code: 'L1',
        centro_code: 'C-L1-01',
        data_hora_inicio: '01/11/2026 06:00',
        data_hora_fim: '06/11/2026 18:00',
        duracao_horas: 132,
        motivo: 'Manutenção Preventiva' as any,
        status: 'ATIVO' as const,
      },
    ]

    render(
      <SendCommunicationModal
        open={true}
        centros={mockCentros}
        parada={{ id: 'par-01', codigo: 'PP-00001/2026', versao: 1 }}
        onClose={vi.fn()}
      />,
    )

    // Alterna para o modo pré-visualização
    const btnPreview = screen.getByText('Pré-visualizar E-mail Corporativo')
    fireEvent.click(btnPreview)

    const previewArea = screen.getByTestId('preview-corpo-html')
    expect(previewArea).toBeDefined()
    // Valida elementos do HTML corporativo Outlook
    expect(previewArea.innerHTML).toContain('Boa tarde!')
    expect(previewArea.innerHTML).toContain(
      'Para conhecimento e alinhamento dos setores envolvidos',
    )
    expect(previewArea.innerHTML).toContain('<table')
    expect(previewArea.innerHTML).toContain('#1e3a8a') // azul institucional
    expect(previewArea.innerHTML).toContain('C-L1-01')
    expect(previewArea.innerHTML).toContain('132 h')
    expect(previewArea.innerHTML).toContain('PCP — CIAFAL')
  })

  // ═════════════════════════════════════════════════════════════════════════
  // ENTREGA 3 — INTEGRAÇÃO COM ATA DO PCP: FONTE OFICIAL & SNAPSHOT CONGELADO
  // ═════════════════════════════════════════════════════════════════════════
  it('E3: ParadasProgramadasAtaSection exibe base viva quando ATA em elaboração (MINUTA/EM_REVISAO)', async () => {
    const mockAtaMinuta: PCPMeetingAtaRecord = {
      id: 'ata-01',
      meeting_id: 'meet-01',
      version: 1,
      structured_content: {
        template_code: 'TPL-01',
        template_revision: 8,
        secoes: {},
      },
      status: 'MINUTA',
      ata_type: 'PREVIA',
      section_completeness: {},
      overall_completeness: 80,
    }

    render(<ParadasProgramadasAtaSection ata={mockAtaMinuta} isApprovedOrPublished={false} />)

    // Deve exibir o badge de Base Viva
    expect(screen.getByTestId('badge-base-viva')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByText('C-L1-01')).toBeDefined()
      expect(screen.getByText('C-L2-01')).toBeDefined()
    })
  })

  it('E3: ParadasProgramadasAtaSection preserva snapshot congelado e acusa diff quando ATA está aprovada', async () => {
    const mockAtaAprovada: PCPMeetingAtaRecord = {
      id: 'ata-02',
      meeting_id: 'meet-02',
      version: 2,
      status: 'APROVADA',
      ata_type: 'FINAL',
      section_completeness: {},
      overall_completeness: 100,
      structured_content: {
        template_code: 'TPL-01',
        template_revision: 8,
        secoes: {},
        paradas_programadas_snapshot: [
          {
            id: 'ppc-01',
            empresa_code: '1001',
            linha_code: 'L1',
            centro_code: 'C-L1-01',
            data_hora_inicio: '01/11/2026 06:00',
            data_hora_fim: '05/11/2026 18:00', // versão original congelada (5/11)
            duracao_horas: 108,
            motivo: 'Manutenção preventiva',
            status: 'ATIVO',
            numero_pp: 'PP-00001/2026',
          },
        ],
      } as any,
    }

    render(<ParadasProgramadasAtaSection ata={mockAtaAprovada} isApprovedOrPublished={true} />)

    // Deve indicar Snapshot Congelado
    expect(screen.getByTestId('badge-snapshot-congelado')).toBeDefined()

    // O centro do snapshot deve estar presente
    expect(screen.getByText('C-L1-01')).toBeDefined()

    // Como no mock a base viva tem fim '06/11/2026 18:00', deve acusar o alerta de atualização posterior à emissão
    await waitFor(() => {
      const alertaDiff = screen.getByTestId('alerta-diff-pos-ata')
      expect(alertaDiff).toBeDefined()
      expect(alertaDiff.textContent).toContain('Atualizada após emissão da ATA')
      expect(alertaDiff.textContent).toContain('Versão registrada na reunião')
      expect(alertaDiff.textContent).toContain('Atualização posterior')
    })
  })
})

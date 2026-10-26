import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SchedulesAndRunsTab } from '@/components/pcp/entregas/SchedulesAndRunsTab'
import { lineSummaryAutomationService } from '@/services/pcp-line-summary-automation-service'

// Mock de serviços
vi.mock('@/services/pcp-line-summary-automation-service', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    lineSummaryAutomationService: {
      ...actual.lineSummaryAutomationService,
      listLineConfigs: vi.fn(),
      listRuns: vi.fn(),
      getRealProductionLines: vi.fn(),
      generateSummariesByLine: vi.fn(),
      reprocessRun: vi.fn(),
      suspendConfig: vi.fn(),
      reactivateConfig: vi.fn(),
      saveLineConfig: vi.fn(),
    },
  }
})

describe('SchedulesAndRunsTab UI & Acceptance Suite', () => {
  const mockTemplates = [
    {
      id: 'tpl-1',
      template_code: 'TMP-GERAL',
      nome: 'Template Geral Institucional',
      tipo: 'Resumo Mensal PCP',
      empresa_code: 'CIAFAL',
      linha_code: 'ALL',
      centro_code: 'ALL',
      aplicacao: 'GERAL',
      status: 'ATIVO',
      is_default: true,
      vigencia_inicio: '2025-01-01',
      versao: 1,
      versao_tag: 'V1.0',
      responsavel_criacao: 'Admin',
      ultima_atualizacao_por: 'Admin',
      sections_config: [],
      revisions_history: [],
      created: '2025-01-01',
      updated: '2025-01-01',
    },
  ]

  const mockConfigs = [
    {
      id: 'cfg-1',
      linha_code: 'L1',
      linha_nome: 'Linha de Laminação 1',
      centro_code: '1001',
      empresa_code: 'CIAFAL',
      periodicidade: 'mensal',
      parametros_personalizados: { horario: '08:00', dia_do_mes: 1 },
      geracao_automatica: true,
      exigir_aprovacao: true,
      envio_automatico_apos_aprovacao: true,
      status: 'ATIVO',
      proxima_execucao: '2025-06-01T08:00:00.000Z',
      responsavel_geracao_nome: 'Carlos PCP',
      created: '2025-01-01',
      updated: '2025-01-01',
    },
  ]

  const mockRuns = [
    {
      id: 'run-1',
      config_id: 'cfg-1',
      linha_code: 'L1',
      centro_code: '1001',
      empresa_code: 'CIAFAL',
      periodo: '2025-05',
      origem: 'AUTO_JOB',
      status: 'FALHA',
      erro: 'Falha de conexão',
      created: '2025-05-01T08:00:00.000Z',
      updated: '2025-05-01T08:00:00.000Z',
    },
  ]

  const mockRealLines = [
    { id: 'l1', code: 'L1', name: 'Laminação 1', center: '1001', plant: 'CIAFAL' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(lineSummaryAutomationService.listLineConfigs).mockResolvedValue(mockConfigs as any)
    vi.mocked(lineSummaryAutomationService.listRuns).mockResolvedValue(mockRuns as any)
    vi.mocked(lineSummaryAutomationService.getRealProductionLines).mockResolvedValue(
      mockRealLines as any,
    )
  })

  it('deve renderizar os 6 cards de resumo com contagens corretas', async () => {
    render(<SchedulesAndRunsTab templates={mockTemplates as any} canManage={true} />)

    await waitFor(() => {
      expect(screen.getByText('Configurações Ativas')).toBeInTheDocument()
      expect(screen.getByText('Programados')).toBeInTheDocument()
      expect(screen.getByText('Gerados (Runs)')).toBeInTheDocument()
      expect(screen.getByText('Aguard. Aprovação')).toBeInTheDocument()
      expect(screen.getByText('Enviados')).toBeInTheDocument()
      expect(screen.getByText('Falhas / Erros')).toBeInTheDocument()
    })
  })

  it('deve renderizar a tabela com as 9 colunas exigidas', async () => {
    render(<SchedulesAndRunsTab templates={mockTemplates as any} canManage={true} />)

    await waitFor(() => {
      expect(screen.getByText('Linha')).toBeInTheDocument()
      expect(screen.getByText('Período')).toBeInTheDocument()
      expect(screen.getByText('Template')).toBeInTheDocument()
      expect(screen.getByText('Última Geração')).toBeInTheDocument()
      expect(screen.getByText('Próxima Geração')).toBeInTheDocument()
      expect(screen.getByText('Data Prevista de Envio')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Responsável')).toBeInTheDocument()
      expect(screen.getByText('Ações')).toBeInTheDocument()
    })
  })

  it('deve permitir disparar a ação Gerar Agora e exibir mensagem de sucesso', async () => {
    vi.mocked(lineSummaryAutomationService.generateSummariesByLine).mockResolvedValue({
      success: true,
      periodo: '2025-05',
      processed_count: 1,
      results: [
        {
          config_id: 'cfg-1',
          linha_code: 'L1',
          success: true,
          resumo_codigo: 'RES-L1-2025-05-V01',
        },
      ],
    })

    render(<SchedulesAndRunsTab templates={mockTemplates as any} canManage={true} />)

    await waitFor(() => {
      expect(screen.getByText('Gerar Agora')).toBeInTheDocument()
    })

    const btnGerar = screen.getByText('Gerar Agora')
    fireEvent.click(btnGerar)

    await waitFor(() => {
      expect(lineSummaryAutomationService.generateSummariesByLine).toHaveBeenCalled()
    })
  })

  it('deve exibir mensagem de restrição quando usuário não tem permissão e lista está vazia', async () => {
    vi.mocked(lineSummaryAutomationService.listLineConfigs).mockResolvedValue([])

    render(<SchedulesAndRunsTab templates={mockTemplates as any} canManage={false} />)

    await waitFor(() => {
      expect(screen.getByText('Acesso Restrito ao Monitoramento Operacional')).toBeInTheDocument()
    })
  })
})

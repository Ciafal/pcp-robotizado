import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LineConfigTab } from '@/components/pcp/entregas/LineConfigTab'
import { SchedulesAndRunsTab } from '@/components/pcp/entregas/SchedulesAndRunsTab'
import { lineSummaryAutomationService } from '@/services/pcp-line-summary-automation-service'

// Mock dos serviços de backend
vi.mock('@/services/pcp-line-summary-automation-service', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    lineSummaryAutomationService: {
      ...actual.lineSummaryAutomationService,
      listLineConfigs: vi.fn(),
      listRuns: vi.fn(),
      getRealProductionLines: vi.fn(),
      getHubUsers: vi.fn(),
      saveLineConfig: vi.fn(),
      generateSummariesByLine: vi.fn(),
      reprocessRun: vi.fn(),
      suspendConfig: vi.fn(),
      reactivateConfig: vi.fn(),
      deleteConfig: vi.fn(),
    },
  }
})

describe('Fluxo Centralizado de Periodicidade & Execução Automática (v0.0.572)', () => {
  const mockTemplates = [
    {
      id: 'tpl-1',
      template_code: 'TMP-CANONICO-L1',
      nome: 'Template Canônico Linha 1',
      tipo: 'Resumo Mensal PCP',
      empresa_code: 'CIAFAL',
      linha_code: 'L1',
      centro_code: 'SDPL',
      aplicacao: 'LINHA',
      status: 'ATIVO',
      is_default: true,
      vigencia_inicio: '2025-01-01',
      versao: 1,
      versao_tag: 'V1.0',
      responsavel_criacao: 'Admin PCP',
      ultima_atualizacao_por: 'Admin PCP',
      sections_config: [],
      revisions_history: [],
      created: '2025-01-01',
      updated: '2025-01-01',
    },
  ]

  const mockConfigs = [
    {
      id: 'cfg-l1',
      empresa_code: 'CIAFAL',
      linha_code: 'L1',
      linha_nome: 'Linha de Laminação 1',
      centro_code: 'SDPL',
      centro_nome: 'Sidercentro',
      template_id: 'tpl-1',
      template_code: 'TMP-CANONICO-L1',
      template_nome: 'Template Canônico Linha 1',
      tipo_resumo: 'Resumo Mensal PCP',
      responsavel_geracao_id: 'usr-1',
      responsavel_geracao_nome: 'Carlos Ferreira (PCP)',
      programador_pcp_id: 'usr-1',
      programador_pcp_nome: 'Carlos Ferreira (PCP)',
      programador_substituto_id: '',
      programador_substituto_nome: '',
      supervisor_pcp_id: 'usr-2',
      supervisor_pcp_nome: 'Roberto Supervisor',
      status: 'ATIVO' as const,
      observacoes: 'Diretrizes fabris oficiais CIAFAL',
      finalidade: 'Fechamento operacional mensal',
      periodicidade: 'mensal' as const,
      parametros_personalizados: {
        horario: '08:00',
        dia_do_mes: 1,
        intervalo_dias: 30,
        data_inicio: '2025-01-01',
        data_fim: '',
      },
      geracao_automatica: true,
      exigir_aprovacao: true,
      envio_automatico_apos_aprovacao: false,
      proxima_execucao: '2025-06-01T08:00:00.000Z',
      created: '2025-01-01',
      updated: '2025-01-01',
    },
  ]

  const mockRealLines = [
    { id: 'line-l1', code: 'L1', name: 'Linha de Laminação 1', sap_work_center: 'SDPL' },
    { id: 'line-l2', code: 'L2', name: 'Linha de Laminação 2', sap_work_center: 'LAML2' },
  ]

  const mockHubUsers = [
    { id: 'usr-1', name: 'Carlos Ferreira', email: 'carlos@ciafal.com.br', role: 'PCP_PROGRAMMER' },
    {
      id: 'usr-2',
      name: 'Roberto Supervisor',
      email: 'roberto@ciafal.com.br',
      role: 'LINE_MANAGER',
    },
  ]

  const mockRuns = [
    {
      id: 'run-1',
      config_id: 'cfg-l1',
      config_dedup_key: 'cfg-l1-2025-05',
      periodo: '2025-05',
      linha_code: 'L1',
      linha_nome: 'Linha de Laminação 1',
      centro_code: 'SDPL',
      template_id_usado: 'tpl-1',
      template_codigo_usado: 'TMP-CANONICO-L1',
      template_versao_usada: 'V1.0',
      resumo_gerado_id: 'pms-1',
      resumo_codigo: 'RES-L1-2025-05-V01',
      tentativas: 1,
      origem: 'automatica' as const,
      status: 'SUCESSO' as const,
      iniciado_em: '2025-05-01T08:00:00.000Z',
      finalizado_em: '2025-05-01T08:01:00.000Z',
      tempo_execucao_ms: 60000,
      created: '2025-05-01T08:00:00.000Z',
      updated: '2025-05-01T08:01:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(lineSummaryAutomationService.listLineConfigs).mockResolvedValue(mockConfigs as any)
    vi.mocked(lineSummaryAutomationService.listRuns).mockResolvedValue(mockRuns as any)
    vi.mocked(lineSummaryAutomationService.getRealProductionLines).mockResolvedValue(
      mockRealLines as any,
    )
    vi.mocked(lineSummaryAutomationService.getHubUsers).mockResolvedValue(mockHubUsers as any)
    vi.mocked(lineSummaryAutomationService.saveLineConfig).mockResolvedValue({
      id: 'cfg-l1',
    } as any)
  })

  describe('(a) LineConfigTab: Remoção dos 6 controles de periodicidade & preservação do contexto fabril', () => {
    it('deve renderizar a tabela e o banner de centralização sem exibir campos de periodicidade na listagem', async () => {
      render(
        <LineConfigTab
          templates={mockTemplates as any}
          canManage={true}
          onNavigateToSchedules={vi.fn()}
        />,
      )

      await waitFor(() => {
        expect(
          screen.getByText('Gestão de Periodicidade & Execução Automática:'),
        ).toBeInTheDocument()
        expect(screen.getByText('Ir para Agendamentos & Envios')).toBeInTheDocument()
        expect(screen.getByText('Linha de Laminação 1')).toBeInTheDocument()
      })

      // Cabeçalhos homologados da tabela de Configuração por Linha
      expect(screen.getByText('Empresa / Linha')).toBeInTheDocument()
      expect(screen.getByText('Centro')).toBeInTheDocument()
      expect(screen.getByText('Tipo de Resumo')).toBeInTheDocument()
      expect(screen.getByText('Template Vinculado')).toBeInTheDocument()
      expect(screen.getByText('Responsável Elaboração')).toBeInTheDocument()
      expect(screen.getByText('Programadores PCP')).toBeInTheDocument()
      expect(screen.getByText('Supervisor')).toBeInTheDocument()

      // NENHUMA coluna de periodicidade deve existir na tabela de LineConfigTab
      expect(screen.queryByRole('columnheader', { name: /Periodicidade/i })).not.toBeInTheDocument()
      expect(
        screen.queryByRole('columnheader', { name: /Próxima Geração/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('columnheader', { name: /Data Prevista de Envio/i }),
      ).not.toBeInTheDocument()
    })

    it('ao abrir o modal de nova configuração, os 6 controles de periodicidade/distribuição NÃO devem existir', async () => {
      render(
        <LineConfigTab
          templates={mockTemplates as any}
          canManage={true}
          onNavigateToSchedules={vi.fn()}
        />,
      )

      await waitFor(() => {
        expect(screen.getByText('Nova Configuração de Linha')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Nova Configuração de Linha'))

      await waitFor(() => {
        expect(screen.getByText('1. Contexto Fabril & Linha Real')).toBeInTheDocument()
        expect(screen.getByText('2. Matriz de Responsáveis (HUB CIAFAL)')).toBeInTheDocument()
        expect(screen.getByText('Observações Operacionais')).toBeInTheDocument()
      })

      // Verificação estrita da ausência dos 6 controles no formulário
      // 1. Periodicidade (label de input/select de periodicidade)
      expect(screen.queryByLabelText(/Periodicidade \*/i)).not.toBeInTheDocument()
      // 2. Horário da execução
      expect(screen.queryByLabelText(/Horário da execução/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Horário de Execução/i)).not.toBeInTheDocument()
      // 3. Dia do mês
      expect(screen.queryByLabelText(/Dia do Mês/i)).not.toBeInTheDocument()
      // 4. Geração automática
      expect(screen.queryByLabelText(/Geração Automática/i)).not.toBeInTheDocument()
      // 5. Exigir aprovação
      expect(screen.queryByLabelText(/Exigir Aprovação/i)).not.toBeInTheDocument()
      // 6. Envio pós-aprovação
      expect(screen.queryByLabelText(/Envio Automático Pós-Aprovação/i)).not.toBeInTheDocument()
    })

    it('ao salvar na LineConfigTab, deve enviar estritamente dados contextuais e preservar periodicidade existente', async () => {
      render(
        <LineConfigTab
          templates={mockTemplates as any}
          canManage={true}
          onNavigateToSchedules={vi.fn()}
        />,
      )

      await waitFor(() => {
        expect(screen.getByTitle('Editar Configuração')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('Editar Configuração'))

      await waitFor(() => {
        expect(screen.getByText('Editar Configuração de Linha')).toBeInTheDocument()
      })

      // Submeter formulário
      const btnSalvar = screen.getByText('Salvar Configuração')
      fireEvent.click(btnSalvar)

      await waitFor(() => {
        expect(lineSummaryAutomationService.saveLineConfig).toHaveBeenCalledTimes(1)
      })

      const payloadEnviado = vi.mocked(lineSummaryAutomationService.saveLineConfig).mock.calls[0][0]
      expect(payloadEnviado.id).toBe('cfg-l1')
      expect(payloadEnviado.linha_code).toBe('L1')
      expect(payloadEnviado.empresa_code).toBe('CIAFAL')
      expect(payloadEnviado.responsavel_geracao_id).toBe('usr-1')
      expect(payloadEnviado.supervisor_pcp_id).toBe('usr-2')
      // Periodicidade e execução automática devem ser preservadas do registro existente
      expect(payloadEnviado.periodicidade).toBe('mensal')
      expect(payloadEnviado.geracao_automatica).toBe(true)
      expect(payloadEnviado.exigir_aprovacao).toBe(true)
    })
  })

  describe('(b) SchedulesAndRunsTab: Única aba de periodicidade, vinculação obrigatória e herança de template', () => {
    it('deve listar agendamentos com as colunas de periodicidade e permitir abrir modal de Novo Agendamento', async () => {
      render(<SchedulesAndRunsTab templates={mockTemplates as any} canManage={true} />)

      await waitFor(() => {
        expect(screen.getByText('Novo Agendamento')).toBeInTheDocument()
        expect(screen.getByText('Programados')).toBeInTheDocument()
      })

      // Verificar as 9 colunas exigidas da aba centralizada
      expect(screen.getByText('Linha')).toBeInTheDocument()
      expect(screen.getByText('Período')).toBeInTheDocument()
      expect(screen.getByText('Template')).toBeInTheDocument()
      expect(screen.getByText('Última Geração')).toBeInTheDocument()
      expect(screen.getByText('Próxima Geração')).toBeInTheDocument()
      expect(screen.getByText('Data Prevista de Envio')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Responsável')).toBeInTheDocument()
      expect(screen.getByText('Ações')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Novo Agendamento'))

      await waitFor(() => {
        expect(screen.getByText('Novo Agendamento & Disparo')).toBeInTheDocument()
        expect(screen.getByText('1. Configuração por Linha Vinculada')).toBeInTheDocument()
        expect(screen.getByText('2. Periodicidade, Horário & Vigência')).toBeInTheDocument()
        expect(screen.getByText('3. Governança & Regras de Distribuição')).toBeInTheDocument()
      })
    })

    it('deve exigir seleção de Configuração por Linha e exibir o Template Herdado em somente leitura', async () => {
      render(<SchedulesAndRunsTab templates={mockTemplates as any} canManage={true} />)

      await waitFor(() => {
        expect(screen.getByText('Novo Agendamento')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Novo Agendamento'))

      await waitFor(() => {
        expect(screen.getByText('Template Herdado da Linha (Somente Leitura):')).toBeInTheDocument()
        expect(screen.getByText('Herança Automática')).toBeInTheDocument()
      })

      // O template vinculado à linha cfg-l1 deve ser exibido
      expect(screen.getByText('Template Canônico Linha 1')).toBeInTheDocument()
      expect(screen.getByText(/TMP-CANONICO-L1/)).toBeInTheDocument()
    })

    it('deve suportar todas as 7 periodicidades canônicas no seletor', async () => {
      render(<SchedulesAndRunsTab templates={mockTemplates as any} canManage={true} />)

      await waitFor(() => {
        expect(screen.getByText('Novo Agendamento')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Novo Agendamento'))

      await waitFor(() => {
        expect(screen.getByLabelText(/Periodicidade \*/i)).toBeInTheDocument()
      })

      const selectPeriodicidade = screen.getByLabelText(/Periodicidade \*/i) as HTMLSelectElement
      const options = Array.from(selectPeriodicidade.options).map((o) => o.value)

      expect(options).toEqual([
        'diaria',
        'semanal',
        'quinzenal',
        'mensal',
        'trimestral',
        'sob_demanda',
        'personalizada',
      ])
    })

    it('deve salvar agendamento com o payload correto (periodicidade, dia, horário, geração auto, travas de governança)', async () => {
      render(<SchedulesAndRunsTab templates={mockTemplates as any} canManage={true} />)

      await waitFor(() => {
        expect(screen.getByTitle('Editar Periodicidade e Agendamento')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('Editar Periodicidade e Agendamento'))

      await waitFor(() => {
        expect(screen.getByText('Parametrizar Agendamento & Disparo')).toBeInTheDocument()
      })

      // Alterar horário para 09:30 e dia do mês para 5
      const inputHorario = screen.getByLabelText(/Horário da Execução/i)
      fireEvent.change(inputHorario, { target: { value: '09:30' } })

      const inputDiaMes = screen.getByLabelText(/Dia do Mês de Execução/i)
      fireEvent.change(inputDiaMes, { target: { value: '5' } })

      const btnSalvar = screen.getByText('Salvar Agendamento')
      fireEvent.click(btnSalvar)

      await waitFor(() => {
        expect(lineSummaryAutomationService.saveLineConfig).toHaveBeenCalledTimes(1)
      })

      const payload = vi.mocked(lineSummaryAutomationService.saveLineConfig).mock.calls[0][0]
      expect(payload.id).toBe('cfg-l1')
      expect(payload.periodicidade).toBe('mensal')
      expect(payload.parametros_personalizados?.horario).toBe('09:30')
      expect(payload.parametros_personalizados?.dia_do_mes).toBe(5)
      expect(payload.geracao_automatica).toBe(true)
      expect(payload.exigir_aprovacao).toBe(true)
      expect(payload.proxima_execucao).toBeTruthy()
    })
  })
})

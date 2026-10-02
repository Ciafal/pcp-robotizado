import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'

// Mock dos serviços para isolamento
vi.mock('@/services/checklist-fechamento-service', async () => {
  const actual = await vi.importActual<any>('@/services/checklist-fechamento-service')
  return {
    ...actual,
    checklistFechamentoService: {
      ...actual.checklistFechamentoService,
      listarCompetencias: vi.fn().mockResolvedValue(['09/2026', '08/2026']),
      obterOuGerarExecucao: vi.fn().mockResolvedValue({
        execucao: {
          id: 'exec-test-1',
          competencia: '09/2026',
          empresa: 'CIAFAL',
          responsavel: 'Controle de Produção',
          data_inicio: '2026-09-01',
          data_limite: '2026-10-02',
          status_geral: 'Em andamento',
          percentual_concluido: 4,
          total_atividades: 26,
          total_ok: 1,
          total_erro: 0,
          total_pendente: 25,
          total_obrigatorias: 24,
          ordens_fechadas: 18,
          ordens_pendentes: 2,
        },
        itens: [
          {
            id: 'item-1-1',
            codigo: '1.1',
            titulo: 'Orientação do Fechamento',
            descricao_detalhada: 'Card informativo orientando a finalidade do fechamento...',
            categoria: 'Orientação',
            linha_centro_relacionado: 'Geral',
            empresa: 'CIAFAL',
            transacao_sap: 'N/A',
            deposito_sap: 'N/A',
            obrigatoria: false,
            responsavel_padrao: 'PCP / Controle de Produção',
            area_responsavel: 'Controle de Produção',
            regra_validacao: 'Leitura e ciência dos requisitos gerais...',
            status_regra: 'Oficial',
            fonte_dados: 'Manual',
            status: 'OK',
          },
          {
            id: 'item-1-2',
            codigo: '1.2',
            titulo: 'CO1P e COGI — Pendências de Processamento Posterior',
            descricao_detalhada: 'Validar que não existam pendências de processamento...',
            categoria: 'Processamento SAP',
            linha_centro_relacionado: 'Geral',
            empresa: 'CIAFAL',
            transacao_sap: 'CO1P / COGI',
            deposito_sap: 'N/A',
            obrigatoria: true,
            responsavel_padrao: 'Controle de Produção',
            area_responsavel: 'PCP / Produção',
            regra_validacao: 'Quantidade total de pendências deve ser zero.',
            status_regra: 'Oficial',
            fonte_dados: 'SAP RFC',
            status: 'PENDENTE',
          },
        ],
      }),
      listarModelos: vi.fn().mockResolvedValue([]),
      listarOcorrencias: vi.fn().mockResolvedValue([]),
      listarEvidencias: vi.fn().mockResolvedValue([]),
      listarFeriados: vi.fn().mockResolvedValue([]),
    },
  }
})

describe('Check-list Fechamento — Rota e Interface (Etapa 1)', () => {
  it('1. Acessa a rota /pcp/controle-producao/checklist-fechamento e renderiza o cabeçalho e atividades', async () => {
    window.history.pushState({}, 'Test', '/pcp/controle-producao/checklist-fechamento')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Check-list Fechamento do Controle de Produção')).toBeInTheDocument()
    })

    // Cabeçalho da CIAFAL
    expect(screen.getByText('CIAFAL')).toBeInTheDocument()
    expect(screen.getByText('Competência:')).toBeInTheDocument()

    // Regra de bloqueio de fechamento presente quando há obrigatórias em aberto
    expect(screen.getByText('Fechamento Bloqueado')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Existem atividades obrigatórias ainda não concluídas. Regularize as pendências antes de confirmar o fechamento./i,
      ),
    ).toBeInTheDocument()

    // Botões funcionais da Etapa 1
    expect(screen.getByText('Gerar Relatório de Pendências')).toBeInTheDocument()
    expect(screen.getByText('+ Nova Atividade')).toBeInTheDocument()
  })

  it('1.1 PermissionGuard não bloqueia nem trava a rota /pcp/controle-producao/checklist-fechamento', async () => {
    const { PermissionGuard } = await import('@/components/auth/PermissionGuard')
    render(
      <MemoryRouter initialEntries={['/pcp/controle-producao/checklist-fechamento']}>
        <PermissionGuard permission="pcp.production.view">
          <div data-testid="checklist-route-content">Checklist Acessível Sem Bloqueio</div>
        </PermissionGuard>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('checklist-route-content')).toBeInTheDocument()
  })

  it('2. Acessa a rota /pcp/controle-producao/indicadores e renderiza os indicadores do controle', async () => {
    window.history.pushState({}, 'Test', '/pcp/controle-producao/indicadores')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Indicadores do Controle de Produção')).toBeInTheDocument()
    })

    expect(screen.getByText('Pontualidade no Fechamento')).toBeInTheDocument()
    expect(screen.getByText('Rendimento Médio Fechamento L1')).toBeInTheDocument()
  })
})

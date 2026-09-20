import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PCPNavigation } from '@/components/layout/PCPNavigation'
import { AuthContext } from '@/contexts/AuthContext'
import ProductionOrdersPage from '@/pages/production-control/ProductionOrdersPage'
import ProductionPostingsPage from '@/pages/production-control/ProductionPostingsPage'
import ProductionHistoryPage from '@/pages/production-control/ProductionHistoryPage'
import ProductionAIAnalysisPage from '@/pages/production-control/ProductionAIAnalysisPage'

// Mock de dados e chamadas
vi.mock('@/services/pcp-production-service', async () => {
  const actual = await vi.importActual<any>('@/services/pcp-production-service')
  return {
    ...actual,
    pcpProductionService: {
      ...actual.pcpProductionService,
      checkMESConnection: vi.fn().mockResolvedValue({
        available: true,
        lastChecked: new Date().toISOString(),
        message: 'Conectado ao MES 4.0',
        source: 'MES_40_INTEGRATED',
        activeLinesWithRealtime: ['L1', 'L2'],
      }),
      getOrders: vi.fn().mockResolvedValue({
        success: true,
        data: actual.pcpProductionService.getStandardSeedOrders(),
        error: null,
        isFallback: false,
        source: 'BACKEND',
      }),
      getPostings: vi.fn().mockResolvedValue({
        success: true,
        data: actual.pcpProductionService.getStandardSeedPostings(),
        error: null,
        isFallback: false,
        source: 'BACKEND',
      }),
      getPendencies: vi.fn().mockResolvedValue({
        success: true,
        data: actual.pcpProductionService.getStandardSeedPendencies(),
        error: null,
        isFallback: false,
        source: 'BACKEND',
      }),
      getStops: vi.fn().mockResolvedValue({
        success: true,
        data: actual.pcpProductionService.getStandardSeedStops(),
        error: null,
        isFallback: false,
        source: 'BACKEND',
      }),
      listOrders: vi.fn().mockResolvedValue(actual.pcpProductionService.getStandardSeedOrders()),
      listPostings: vi
        .fn()
        .mockResolvedValue(actual.pcpProductionService.getStandardSeedPostings()),
      listPendencies: vi
        .fn()
        .mockResolvedValue(actual.pcpProductionService.getStandardSeedPendencies()),
      listStops: vi.fn().mockResolvedValue(actual.pcpProductionService.getStandardSeedStops()),
      getOrderEvents: vi.fn().mockResolvedValue([]),
      requestAIAnalysis: vi.fn().mockResolvedValue({ content: 'Parecer gerado com sucesso.' }),
    },
  }
})

const mockAuthValue: any = {
  user: {
    id: 'user-pcp',
    name: 'Planejador PCP',
    email: 'planejador@ciafal.com.br',
    roles: ['pcp_planner', 'admin'],
  },
  hasPermission: () => true,
  loading: false,
}

describe('Testes de Aceite — Controle de Produção (HUB CIAFAL)', () => {
  // TESTE A: expandir Controle de Produção mostra os 4 subitens
  it('TESTE A: ao renderizar o menu, o grupo CONTROLE DE PRODUÇÃO exibe seus 4 subitens funcionais', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/controle-producao/ordens']}>
          <PCPNavigation />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // O grupo "CONTROLE DE PRODUÇÃO" deve estar no DOM
    const grupoTitle = screen.getByText('CONTROLE DE PRODUÇÃO')
    expect(grupoTitle).toBeInTheDocument()

    // Os 4 subitens obrigatórios devem estar no menu
    expect(screen.getByText('Controle de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Apontamentos')).toBeInTheDocument()
    expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Análise de Ordens')).toBeInTheDocument()
  })

  // TESTE B: clicar em cada item aponta para a rota correta
  it('TESTE B: cada subitem possui o link e rota própria esperada no menu', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/']}>
          <PCPNavigation />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Clica no header do grupo CONTROLE DE PRODUÇÃO para garantir expansão
    const grupoHeader = screen.getByText('CONTROLE DE PRODUÇÃO')
    fireEvent.click(grupoHeader)

    const linkOrdens = screen.getByText('Controle de Ordens de Produção').closest('a')
    expect(linkOrdens).toHaveAttribute('href', '/pcp/controle-producao/ordens')

    const linkApontamentos = screen.getByText('Apontamentos').closest('a')
    expect(linkApontamentos).toHaveAttribute('href', '/pcp/controle-producao/apontamentos')

    const linkHistorico = screen.getByText('Histórico de Ordens de Produção').closest('a')
    expect(linkHistorico).toHaveAttribute('href', '/pcp/controle-producao/historico')

    const linkAnalise = screen.getByText('Análise de Ordens').closest('a')
    expect(linkAnalise).toHaveAttribute('href', '/pcp/controle-producao/analise')
  })

  // TESTE C: rotas carregam direto (simulação de F5 direto na rota)
  it('TESTE C: cada subrota funcional renderiza sua tela respectiva sem RootRedirect nem erro', async () => {
    // 1. Rota de Ordens
    const { unmount: unmount1 } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/controle-producao/ordens']}>
          <Routes>
            <Route path="/pcp/controle-producao/ordens" element={<ProductionOrdersPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByText('Controle de Ordens de Produção (MES x SAP ECC)')).toBeInTheDocument()
    unmount1()

    // 2. Rota de Apontamentos
    const { unmount: unmount2 } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/controle-producao/apontamentos']}>
          <Routes>
            <Route
              path="/pcp/controle-producao/apontamentos"
              element={<ProductionPostingsPage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByText(/Apontamentos de Produção/i)).toBeInTheDocument()
    unmount2()

    // 3. Rota de Histórico
    const { unmount: unmount3 } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/controle-producao/historico']}>
          <Routes>
            <Route path="/pcp/controle-producao/historico" element={<ProductionHistoryPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    unmount3()

    // 4. Rota de Análise
    const { unmount: unmount4 } = render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/controle-producao/analise']}>
          <Routes>
            <Route path="/pcp/controle-producao/analise" element={<ProductionAIAnalysisPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )
    expect(screen.getByText(/Análise de Ordens com Inteligência Artificial/i)).toBeInTheDocument()
    unmount4()
  })

  // TESTE D: rota da Torre de Controle renderiza com os critérios de aceite executivos
  it('TESTE D: Torre de Controle da Produção renderiza com título, status MES, KPIs e seções executivas', async () => {
    const { default: ProductionOverviewPage } =
      await import('@/pages/production-control/ProductionOverviewPage')

    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/controle-producao']}>
          <Routes>
            <Route path="/pcp/controle-producao" element={<ProductionOverviewPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Título Principal e Subtítulo
    expect(screen.getByText('Torre de Controle da Produção')).toBeInTheDocument()
    expect(
      screen.getByText(
        /Acompanhamento das ordens, apontamentos, desvios e pendências da produção/i,
      ),
    ).toBeInTheDocument()

    // Status MES 4.0 compacto
    expect(screen.getByTestId('mes-status-compact-card')).toBeInTheDocument()
    expect(screen.getByText(/MES 4.0/i)).toBeInTheDocument()

    // 8 KPIs
    expect(screen.getByText('Total de OPs')).toBeInTheDocument()
    expect(screen.getByText('Programadas')).toBeInTheDocument()
    expect(screen.getByText('Em Produção')).toBeInTheDocument()
    expect(screen.getByText('Concluídas')).toBeInTheDocument()
    expect(screen.getByText('Aguardando Fechamento')).toBeInTheDocument()
    expect(screen.getByText('Com Pendência')).toBeInTheDocument()
    expect(screen.getByText('Com Desvio')).toBeInTheDocument()
    expect(screen.getByText('Críticas')).toBeInTheDocument()

    // Gráficos e Seções
    expect(screen.getByText('Produção Programada x Realizada')).toBeInTheDocument()
    expect(screen.getByText('Status das Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Últimas Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Alertas e Exceções (IA)')).toBeInTheDocument()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PCPSidebar, PCPNavigation } from '@/components/layout/PCPNavigation'
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'
import ProductionOrdersPage from '@/pages/production-control/ProductionOrdersPage'
import ProductionPostingsPage from '@/pages/production-control/ProductionPostingsPage'
import ProductionHistoryPage from '@/pages/production-control/ProductionHistoryPage'
import ProductionAIAnalysisPage from '@/pages/production-control/ProductionAIAnalysisPage'

vi.mock('@/services/pcp-production-service', async () => {
  const actual = await vi.importActual<any>('@/services/pcp-production-service')
  return {
    ...actual,
    pcpProductionService: {
      ...actual.pcpProductionService,
      checkMESConnection: vi.fn().mockResolvedValue({
        status: 'ONLINE',
        lastHeartbeat: new Date().toISOString(),
        pendingBufferCount: 0,
        syncLatencyMs: 42,
      }),
      listOrders: vi.fn().mockResolvedValue([]),
      listPostings: vi.fn().mockResolvedValue([]),
      getOrderEvents: vi.fn().mockResolvedValue([]),
      requestAIAnalysis: vi.fn().mockResolvedValue({ content: 'Parecer gerado com sucesso.' }),
    },
  }
})

function renderSidebarWithRole(initialRoute = '/pcp/cockpit', role: string = 'PCP_PROGRAMMER') {
  const perms = authService.getPermissionsForRole(role)
  const permSet = new Set(perms)

  const authValue: AuthContextType = {
    user: {
      id: 'test-user-id',
      name: 'Usuário Teste Programador',
      email: 'programador@ciafal.com.br',
      role: role as any,
    },
    isAuthenticated: true,
    isLoading: false,
    authError: null,
    isGlobal: role === 'PCP_ADMIN',
    scopes: [],
    delegations: [],
    permissions: perms.map((key) => ({
      key,
      name: key,
      category: 'TEST',
      is_critical: false,
      source: 'ROLE' as const,
    })),
    permissionKeys: permSet,
    activeScopeFilter: 'ALL',
    setActiveScopeFilter: vi.fn(),
    can: (perm: string) => permSet.has(perm),
    canAny: (permsArr: string[]) => permsArr.some((p) => permSet.has(p)),
    canAll: (permsArr: string[]) => permsArr.every((p) => permSet.has(p)),
    hasLineScope: () => true,
    loginWithCorporateAD: vi.fn(),
    switchUserSimulated: vi.fn(),
    logout: vi.fn(),
    refreshPermissions: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="*"
            element={
              <div className="flex">
                <PCPSidebar />
                <div data-testid="route-content">
                  <Routes>
                    <Route
                      path="/pcp/controle-producao/ordens"
                      element={<ProductionOrdersPage />}
                    />
                    <Route
                      path="/pcp/controle-producao/apontamentos"
                      element={<ProductionPostingsPage />}
                    />
                    <Route
                      path="/pcp/controle-producao/historico"
                      element={<ProductionHistoryPage />}
                    />
                    <Route
                      path="/pcp/controle-producao/analise"
                      element={<ProductionAIAnalysisPage />}
                    />
                    <Route
                      path="/pcp/controle-producao/documentos-referencia"
                      element={<div>Documentos de Referência — Controle de Produção</div>}
                    />
                  </Routes>
                </div>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('PCPNavigation — Controle de Produção Submenu Acceptance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Validação de RBAC estático: PCP_PROGRAMMER e PPC_PROGRAMMER possuem pcp.production.view e pcp.production.close', () => {
    const progPerms = authService.getPermissionsForRole('PCP_PROGRAMMER')
    expect(progPerms).toContain('pcp.production.view')
    expect(progPerms).toContain('pcp.production.close')

    const ppcPerms = authService.getPermissionsForRole('PPC_PROGRAMMER')
    expect(ppcPerms).toContain('pcp.production.view')
    expect(ppcPerms).toContain('pcp.production.close')
  })

  it('2. Teste de DOM e renderização dos 4 subitens: após expandir CONTROLE DE PRODUÇÃO para perfil PCP_PROGRAMMER', async () => {
    renderSidebarWithRole('/pcp/cockpit', 'PCP_PROGRAMMER')

    const header = screen.getByTestId('nav-group-header-CONTROLE DE PRODUÇÃO')
    expect(header).toBeInTheDocument()

    // Clica para expandir caso colapsado
    fireEvent.click(header)

    // Todos os 7 itens devem estar no DOM e visíveis
    expect(screen.getByText('Controle de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Apontamentos')).toBeInTheDocument()
    expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Análise de Ordens')).toBeInTheDocument()
    expect(screen.getByText('Pendências - COGI')).toBeInTheDocument()
    expect(screen.getByText('Pendências - CO1P')).toBeInTheDocument()
    expect(screen.getByText('Documentos de Referência')).toBeInTheDocument()

    // Verifica links corretos
    const linkOrdens = screen.getByText('Controle de Ordens de Produção').closest('a')
    expect(linkOrdens).toHaveAttribute('href', '/pcp/controle-producao/ordens')

    const linkApontamentos = screen.getByText('Apontamentos').closest('a')
    expect(linkApontamentos).toHaveAttribute('href', '/pcp/controle-producao/apontamentos')

    const linkHistorico = screen.getByText('Histórico de Ordens de Produção').closest('a')
    expect(linkHistorico).toHaveAttribute('href', '/pcp/controle-producao/historico')

    const linkAnalise = screen.getByText('Análise de Ordens').closest('a')
    expect(linkAnalise).toHaveAttribute('href', '/pcp/controle-producao/analise')

    const linkDocRef = screen.getByText('Documentos de Referência').closest('a')
    expect(linkDocRef).toHaveAttribute('href', '/pcp/controle-producao/documentos-referencia')

    // Verifica estilos dos filhos: recuo pl-6 e quebra de linha whitespace-normal break-words
    expect(linkOrdens).toHaveClass('pl-6')
    expect(screen.getByText('Histórico de Ordens de Produção')).toHaveClass('whitespace-normal')
    expect(screen.getByText('Histórico de Ordens de Produção')).toHaveClass('break-words')
  })

  it('3. Expansão persistente (simulação de F5 ou entrada direta) em /pcp/controle-producao/ordens com destaque do subitem', () => {
    renderSidebarWithRole('/pcp/controle-producao/ordens', 'PCP_PROGRAMMER')

    // Deve estar automaticamente expandido
    expect(screen.getByText('Controle de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Apontamentos')).toBeInTheDocument()
    expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Análise de Ordens')).toBeInTheDocument()

    const linkOrdens = screen.getByText('Controle de Ordens de Produção').closest('a')
    expect(linkOrdens).toHaveClass('bg-blue-50/90')
    expect(linkOrdens).toHaveClass('text-[#004C97]')
    expect(linkOrdens).toHaveClass('border-l-2')
    expect(linkOrdens).toHaveClass('border-[#004C97]')
  })

  it('4. Expansão persistente em cada uma das outras 3 rotas (/apontamentos, /historico, /analise)', () => {
    // 4.1 Apontamentos
    const { unmount: u1 } = renderSidebarWithRole(
      '/pcp/controle-producao/apontamentos',
      'PCP_PROGRAMMER',
    )
    const linkApont = screen.getByText('Apontamentos').closest('a')
    expect(linkApont).toHaveClass('bg-blue-50/90')
    expect(linkApont).toHaveClass('text-[#004C97]')
    u1()

    // 4.2 Histórico
    const { unmount: u2 } = renderSidebarWithRole(
      '/pcp/controle-producao/historico',
      'PCP_PROGRAMMER',
    )
    const linkHist = screen.getByText('Histórico de Ordens de Produção').closest('a')
    expect(linkHist).toHaveClass('bg-blue-50/90')
    expect(linkHist).toHaveClass('text-[#004C97]')
    u2()

    // 4.3 Análise
    const { unmount: u3 } = renderSidebarWithRole(
      '/pcp/controle-producao/analise',
      'PCP_PROGRAMMER',
    )
    const linkAnalise = screen.getByText('Análise de Ordens').closest('a')
    expect(linkAnalise).toHaveClass('bg-blue-50/90')
    expect(linkAnalise).toHaveClass('text-[#004C97]')
    u3()
  })

  it('5. Teste de clique e navegação nos 4 subitens renderizando as telas corretas', async () => {
    renderSidebarWithRole('/pcp/controle-producao/ordens', 'PCP_PROGRAMMER')

    // Clica em Apontamentos
    fireEvent.click(screen.getByText('Apontamentos'))
    await waitFor(() => {
      expect(screen.getByText(/Apontamentos de Produção/i)).toBeInTheDocument()
    })

    // Clica em Histórico de Ordens de Produção
    fireEvent.click(screen.getByText('Histórico de Ordens de Produção'))
    await waitFor(() => {
      expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    })

    // Clica em Análise de Ordens
    fireEvent.click(screen.getByText('Análise de Ordens'))
    await waitFor(() => {
      expect(screen.getByText(/Análise de Ordens com Inteligência Artificial/i)).toBeInTheDocument()
    })

    // Clica em Documentos de Referência
    fireEvent.click(screen.getByText('Documentos de Referência'))
    await waitFor(() => {
      expect(
        screen.getByText('Documentos de Referência — Controle de Produção'),
      ).toBeInTheDocument()
    })

    // Clica de volta em Controle de Ordens de Produção
    fireEvent.click(screen.getByText('Controle de Ordens de Produção'))
    await waitFor(() => {
      expect(screen.getByText('Controle de Ordens de Produção (MES x SAP ECC)')).toBeInTheDocument()
    })
  })
})

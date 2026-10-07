import React, { Suspense } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { pb } from '@/lib/pocketbase/client'
import { officialNavGroups } from '@/components/layout/PCPNavigation'

const mockAuthValuePcpProgrammer: AuthContextType = {
  user: {
    id: 'user-prog-01',
    email: 'programador@ciafal.com.br',
    name: 'Programador PCP',
    role: 'PCP_PROGRAMMER',
  },
  roles: ['PCP_PROGRAMMER'],
  permissions: ['pcp.schedule.view', 'pcp.carteira.view', 'pcp.cockpit.view'],
  activeRole: 'PCP_PROGRAMMER',
  isLoading: false,
  isAuthenticated: true,
  isGlobalAdmin: false,
  isExecutiveViewer: false,
  isPcpSupervisor: false,
  isProgrammer: true,
  isOperator: false,
  hasCriticalPermission: false,
  can: (perm: string) => {
    return ['pcp.schedule.view', 'pcp.carteira.view', 'pcp.cockpit.view'].includes(perm)
  },
  canAccessModule: () => true,
  hasLineScope: () => true,
  login: async () => {},
  logout: () => {},
  loginAsProfile: () => {},
  refreshPermissions: async () => {},
  delegations: [],
  switchRole: () => {},
}

const mockAuthWithoutPerm: AuthContextType = {
  user: {
    id: 'user-guest-01',
    email: 'guest@ciafal.com.br',
    name: 'Visitante Externo',
    role: 'OPERATOR',
  },
  roles: ['OPERATOR'],
  permissions: [],
  activeRole: 'OPERATOR',
  isLoading: false,
  isAuthenticated: true,
  isGlobalAdmin: false,
  isExecutiveViewer: false,
  isPcpSupervisor: false,
  isProgrammer: false,
  isOperator: true,
  hasCriticalPermission: false,
  can: (_perm: string) => false,
  canAccessModule: () => false,
  hasLineScope: () => false,
  login: async () => {},
  logout: () => {},
  loginAsProfile: () => {},
  refreshPermissions: async () => {},
  delegations: [],
  switchRole: () => {},
}

describe('Suíte de Aceitação — Resiliência do PermissionGuard em Gestão Industrializador', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    pb.authStore.clear()
  })

  // Teste 1: PCP_PROGRAMMER acessa /pcp/gestao-industrializador por menu sem retenção no PermissionGuard.
  it('Teste 1: PCP_PROGRAMMER acessa /pcp/gestao-industrializador pelo menu sem retenção no PermissionGuard', async () => {
    const industrializerGroup = officialNavGroups.find(
      (g) => g.groupTitle === 'GESTÃO INDUSTRIALIZADOR',
    )
    expect(industrializerGroup).toBeDefined()
    const mainItem = industrializerGroup?.items.find(
      (item) => item.href === '/pcp/gestao-industrializador',
    )
    expect(mainItem).toBeDefined()
    expect(mainItem?.title).toBe('Visão Consolidada')

    render(
      <MemoryRouter initialEntries={['/pcp/gestao-industrializador']}>
        <AuthContext.Provider value={mockAuthValuePcpProgrammer}>
          <Routes>
            <Route
              path="/pcp/gestao-industrializador"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <ErrorBoundary moduleName="Gestão Industrializador — Visão Consolidada">
                    <div data-testid="gestao-industrializador-consolidada-screen">
                      <h1>Gestão Industrializador — Visão Consolidada</h1>
                    </div>
                  </ErrorBoundary>
                </PermissionGuard>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('gestao-industrializador-consolidada-screen')).toBeInTheDocument()
    })
    expect(screen.getByText('Gestão Industrializador — Visão Consolidada')).toBeInTheDocument()
    expect(screen.queryByText(/Instabilidade na Validação de Acessos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
  })

  // Teste 2: F5 direto na URL /pcp/gestao-industrializador abre a página (não depender de ter vindo de outra tela).
  it('Teste 2: F5 direto na URL /pcp/gestao-industrializador abre a página com sessão authStore válida em cold start', async () => {
    // Simula sessão válida no authStore do PocketBase como ocorre em um reload de navegador (F5 direto)
    pb.authStore.save('fake-token-jwt-12345', {
      id: 'user-prog-01',
      email: 'programador@ciafal.com.br',
      name: 'Programador PCP',
      role: 'PCP_PROGRAMMER',
    })

    // Estado transitório de revalidação inicial (AuthContext ainda carregando assincronamente)
    const coldStartAuth: AuthContextType = {
      ...mockAuthValuePcpProgrammer,
      user: null,
      isLoading: true,
      can: () => false,
      hasLineScope: () => false,
    }

    render(
      <MemoryRouter initialEntries={['/pcp/gestao-industrializador']}>
        <AuthContext.Provider value={coldStartAuth}>
          <Routes>
            <Route
              path="/pcp/gestao-industrializador"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <ErrorBoundary moduleName="Gestão Industrializador — Visão Consolidada">
                    <div data-testid="f5-direct-url-gestao-industrializador">
                      <h1>Gestão Industrializador Direto Via F5</h1>
                    </div>
                  </ErrorBoundary>
                </PermissionGuard>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    // O bypass resiliente (Stale-While-Revalidate com authStore) libera a renderização imediata
    await waitFor(() => {
      expect(screen.getByTestId('f5-direct-url-gestao-industrializador')).toBeInTheDocument()
    })
    expect(screen.getByText('Gestão Industrializador Direto Via F5')).toBeInTheDocument()
    expect(screen.queryByText(/Instabilidade na Validação de Acessos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
  })

  // Teste 2b: valida as 4 sub-rotas estruturais de Gestão Industrializador
  it('Teste 2b: valida resiliência nas 4 sub-rotas (/mp, /carteira, /sequenciamento, /estoque)', async () => {
    const subRoutes = [
      { path: '/pcp/gestao-industrializador/mp', testId: 'screen-mp', perm: 'pcp.schedule.view' },
      {
        path: '/pcp/gestao-industrializador/carteira',
        testId: 'screen-carteira',
        perm: 'pcp.carteira.view',
      },
      {
        path: '/pcp/gestao-industrializador/sequenciamento',
        testId: 'screen-sequenciamento',
        perm: 'pcp.schedule.view',
      },
      {
        path: '/pcp/gestao-industrializador/estoque',
        testId: 'screen-estoque',
        perm: 'pcp.schedule.view',
      },
    ]

    for (const sub of subRoutes) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[sub.path]}>
          <AuthContext.Provider value={mockAuthValuePcpProgrammer}>
            <Routes>
              <Route
                path={sub.path}
                element={
                  <PermissionGuard permission={sub.perm}>
                    <ErrorBoundary moduleName={sub.path}>
                      <div data-testid={sub.testId}>Módulo {sub.path} OK</div>
                    </ErrorBoundary>
                  </PermissionGuard>
                }
              />
            </Routes>
          </AuthContext.Provider>
        </MemoryRouter>,
      )

      await waitFor(() => {
        expect(screen.getByTestId(sub.testId)).toBeInTheDocument()
      })
      expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
      unmount()
    }
  })

  // Teste 3: navegação Análise real time → GESTÃO INDUSTRIALIZADOR → Análise real time sem erro.
  it('Teste 3: navegação Análise real time → GESTÃO INDUSTRIALIZADOR → Análise real time sem erro', async () => {
    const NavTestComponent = () => {
      const navigate = useNavigate()
      return (
        <div>
          <button
            data-testid="go-to-industrializador"
            onClick={() => navigate('/pcp/gestao-industrializador')}
          >
            Ir para Industrializador
          </button>
          <button data-testid="go-to-realtime" onClick={() => navigate('/pcp/analise-real-time')}>
            Ir para Real Time
          </button>
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AuthContext.Provider value={mockAuthValuePcpProgrammer}>
          <NavTestComponent />
          <Routes>
            <Route
              path="/pcp/analise-real-time"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <ErrorBoundary moduleName="Análise Real Time">
                    <div data-testid="screen-realtime">Tela Análise Real Time Ativa</div>
                  </ErrorBoundary>
                </PermissionGuard>
              }
            />
            <Route
              path="/pcp/gestao-industrializador"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <ErrorBoundary moduleName="Gestão Industrializador">
                    <div data-testid="screen-industrializador">
                      Tela Gestão Industrializador Ativa
                    </div>
                  </ErrorBoundary>
                </PermissionGuard>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    // 1. Está na tela Análise real time
    await waitFor(() => {
      expect(screen.getByTestId('screen-realtime')).toBeInTheDocument()
    })

    // 2. Navega para Gestão Industrializador
    screen.getByTestId('go-to-industrializador').click()
    await waitFor(() => {
      expect(screen.getByTestId('screen-industrializador')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('screen-realtime')).not.toBeInTheDocument()

    // 3. Retorna para Análise Real Time
    screen.getByTestId('go-to-realtime').click()
    await waitFor(() => {
      expect(screen.getByTestId('screen-realtime')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('screen-industrializador')).not.toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
  })

  // Teste 4: Principal e Torre de Controle continuam abrindo; nenhuma outra tela alterada.
  it('Teste 4: Principal e Torre de Controle continuam abrindo normalmente sem regressão', async () => {
    const { unmount: unmountPrincipal } = render(
      <MemoryRouter initialEntries={['/pcp']}>
        <AuthContext.Provider value={mockAuthValuePcpProgrammer}>
          <Routes>
            <Route
              path="/pcp"
              element={
                <PermissionGuard permission="pcp.cockpit.view">
                  <div data-testid="screen-principal">Cockpit Principal PCP Aberto</div>
                </PermissionGuard>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('screen-principal')).toBeInTheDocument()
    })
    unmountPrincipal()

    const { unmount: unmountTorre } = render(
      <MemoryRouter initialEntries={['/pcp/sequenciamento']}>
        <AuthContext.Provider value={mockAuthValuePcpProgrammer}>
          <Routes>
            <Route
              path="/pcp/sequenciamento"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <div data-testid="screen-torre-controle">
                    Torre de Controle Sequenciamento Aberta
                  </div>
                </PermissionGuard>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('screen-torre-controle')).toBeInTheDocument()
    })
    unmountTorre()
  })

  // Teste 5: usuários sem permissão continuam recebendo a mensagem de falta de permissão (RBAC intacto).
  it('Teste 5: usuários sem permissão REAL recebem a mensagem amigável de falta de permissão (RBAC intacto, nunca ErrorBoundary)', async () => {
    // OPERATOR não possui pcp.schedule.view nem pcp.admin.manage
    render(
      <MemoryRouter initialEntries={['/pcp/admin/gerenciamento-seguranca']}>
        <AuthContext.Provider value={mockAuthWithoutPerm}>
          <Routes>
            <Route
              path="/pcp/admin/gerenciamento-seguranca"
              element={
                <PermissionGuard permission="pcp.security.manage">
                  <ErrorBoundary moduleName="Admin Segurança">
                    <div data-testid="secret-admin-screen">Painel Ultra Secreto</div>
                  </ErrorBoundary>
                </PermissionGuard>
              }
            />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    // Não deve renderizar a página protegida
    expect(screen.queryByTestId('secret-admin-screen')).not.toBeInTheDocument()

    // Deve exibir o card de Acesso Restrito com a mensagem amigável
    await waitFor(() => {
      expect(
        screen.getByText(/Você não possui permissão para acessar esta página\./i),
      ).toBeInTheDocument()
    })
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar esta página/i)).not.toBeInTheDocument()
  })
})

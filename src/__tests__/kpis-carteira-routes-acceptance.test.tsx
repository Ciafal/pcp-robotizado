import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { AuthContext } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'
import { Layout } from '@/components/Layout'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { KpisCarteiraPage } from '@/pages/KpisCarteiraPage'
import AnaliseCarteiraPage from '@/pages/AnaliseCarteiraPage'
import { Index } from '@/pages/Index'

const mockAuthAdmin: any = {
  user: {
    id: 'user-pcp-admin',
    name: 'Administrador PCP',
    email: 'admin.pcp@ciafal.com.br',
    role: 'PCP_ADMIN',
    roles: ['pcp_admin', 'pcp_programmer'],
  },
  effectiveRole: 'PCP_ADMIN',
  can: (perm: string) => true,
  hasPermission: () => true,
  hasLineScope: () => true,
  refreshPermissions: vi.fn(),
  loading: false,
  isLoading: false,
}

const LocationDisplay = () => {
  const location = useLocation()
  return (
    <div data-testid="current-location">{location.pathname + location.search + location.hash}</div>
  )
}

describe('Testes de Aceitação: Rotas, Menu e PermissionGuard para Análise de Carteira & KPIs', () => {
  it('1. Rota raiz "/" renderiza o Cockpit diretamente sem bloqueio do PermissionGuard', async () => {
    render(
      <AuthContext.Provider value={mockAuthAdmin}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <div>
                    <LocationDisplay />
                    <Index />
                  </div>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByTestId('current-location')).toHaveTextContent('/')
    expect(screen.queryByText(/Acesso Restrito/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Instabilidade na Validação de Acessos/i)).not.toBeInTheDocument()
  })

  it('2. Acesso à rota /pcp/analise-carteira/kpis renderiza o título oficial e não trava no PermissionGuard', async () => {
    render(
      <AuthContext.Provider value={mockAuthAdmin}>
        <MemoryRouter initialEntries={['/pcp/analise-carteira/kpis']}>
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/pcp/analise-carteira/kpis"
                element={
                  <PermissionGuard permission="pcp.carteira.view">
                    <div>
                      <LocationDisplay />
                      <KpisCarteiraPage />
                    </div>
                  </PermissionGuard>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByTestId('current-location')).toHaveTextContent(
      '/pcp/analise-carteira/kpis',
    )
    expect(
      await screen.findByText("KPI's - Carteira & Gestão de Saldos Negativos"),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Acesso Restrito/i)).not.toBeInTheDocument()
  })

  it('3. Rota /pcp/analise-carteira/mto não trava no PermissionGuard e renderiza a Carteira MTO', async () => {
    render(
      <AuthContext.Provider value={mockAuthAdmin}>
        <MemoryRouter initialEntries={['/pcp/analise-carteira/mto']}>
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/pcp/analise-carteira/mto"
                element={
                  <PermissionGuard permission="pcp.carteira.view">
                    <div>
                      <LocationDisplay />
                      <AnaliseCarteiraPage />
                    </div>
                  </PermissionGuard>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByTestId('current-location')).toHaveTextContent(
      '/pcp/analise-carteira/mto',
    )
    expect(screen.queryByText(/Acesso Restrito/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Instabilidade na Validação de Acessos/i)).not.toBeInTheDocument()
  })

  it('4. Navegação pelo menu lateral: link "KPI\'s - Carteira" existe e leva a /pcp/analise-carteira/kpis', async () => {
    render(
      <AuthContext.Provider value={mockAuthAdmin}>
        <MemoryRouter initialEntries={['/pcp/analise-carteira/mto']}>
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/pcp/analise-carteira/mto"
                element={
                  <PermissionGuard permission="pcp.carteira.view">
                    <AnaliseCarteiraPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/pcp/analise-carteira/kpis"
                element={
                  <PermissionGuard permission="pcp.carteira.view">
                    <KpisCarteiraPage />
                  </PermissionGuard>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Abre o grupo ANÁLISE DE CARTEIRA se estiver fechado
    const carteiraGroup = screen.getByTestId('nav-group-header-ANÁLISE DE CARTEIRA')
    expect(carteiraGroup).toBeInTheDocument()

    // O link KPI's - Carteira deve estar presente
    const kpisLink = await screen.findByRole('link', { name: /KPI's - Carteira/i })
    expect(kpisLink).toBeInTheDocument()
    expect(kpisLink.getAttribute('href')).toBe('/pcp/analise-carteira/kpis')

    // Clica no link
    fireEvent.click(kpisLink)

    // Renderiza a página de KPIs
    expect(
      await screen.findByText("KPI's - Carteira & Gestão de Saldos Negativos"),
    ).toBeInTheDocument()
  })

  it('5. Alternância e histórico: MTO -> KPIs -> Voltar -> Avançar sem travar', async () => {
    const HistoryControls = () => {
      const navigate = useNavigate()
      return (
        <div>
          <button onClick={() => navigate(-1)}>Voltar</button>
          <button onClick={() => navigate(1)}>Avançar</button>
        </div>
      )
    }

    render(
      <AuthContext.Provider value={mockAuthAdmin}>
        <MemoryRouter
          initialEntries={['/pcp/analise-carteira/mto', '/pcp/analise-carteira/kpis']}
          initialIndex={1}
        >
          <HistoryControls />
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/pcp/analise-carteira/mto"
                element={
                  <PermissionGuard permission="pcp.carteira.view">
                    <AnaliseCarteiraPage />
                  </PermissionGuard>
                }
              />
              <Route
                path="/pcp/analise-carteira/kpis"
                element={
                  <PermissionGuard permission="pcp.carteira.view">
                    <KpisCarteiraPage />
                  </PermissionGuard>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Inicia em KPIs
    expect(
      await screen.findByText("KPI's - Carteira & Gestão de Saldos Negativos"),
    ).toBeInTheDocument()

    // Clica em Voltar para MTO
    fireEvent.click(screen.getByText('Voltar'))
    expect(screen.queryByText(/Acesso Restrito/i)).not.toBeInTheDocument()

    // Clica em Avançar para KPIs
    fireEvent.click(screen.getByText('Avançar'))
    expect(
      await screen.findByText("KPI's - Carteira & Gestão de Saldos Negativos"),
    ).toBeInTheDocument()
  })
})

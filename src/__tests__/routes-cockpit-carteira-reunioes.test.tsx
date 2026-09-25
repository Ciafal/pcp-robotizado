import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthContext } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { Index } from '@/pages/Index'
import { KpisCarteiraPage } from '@/pages/KpisCarteiraPage'
import AnaliseCarteiraPage from '@/pages/AnaliseCarteiraPage'
import { PCPMeetingsPage } from '@/pages/PCPMeetingsPage'

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

describe('Verificação de Rotas: Raiz Cockpit, Análise de Carteira (KPIs/MTO) e Reunião PCP', () => {
  it('1. Rota raiz "/" renderiza o Cockpit diretamente sem bloqueios', async () => {
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
  })

  it('2. Rota "/pcp/analise-carteira/kpis" renderiza normalmente', async () => {
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
  })

  it('3. Rota "/pcp/analise-carteira/mto" renderiza a carteira MTO sem bloqueio', async () => {
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
  })

  it('4. Rotas de Reunião PCP: sub-rota de pendências renderiza acessível e sem bloqueios', async () => {
    render(
      <AuthContext.Provider value={mockAuthAdmin}>
        <MemoryRouter initialEntries={['/pcp/reunioes/pendencias']}>
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/pcp/reunioes/:tab"
                element={
                  <PermissionGuard permission="pcp.reuniao.view">
                    <div>
                      <LocationDisplay />
                      <PCPMeetingsPage />
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
      '/pcp/reunioes/pendencias',
    )
    expect(screen.queryByText(/Acesso Restrito/i)).not.toBeInTheDocument()
  })
})

import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { AuthContext } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { EntregasPcpPage } from '@/pages/EntregasPcpPage'
import { ResumoMensalPage } from '@/pages/ResumoMensalPage'
import { EntregasHistoricoPage } from '@/pages/EntregasHistoricoPage'
import { EntregasRevisoesPage } from '@/pages/EntregasRevisoesPage'
import { EntregasIndicadoresPage } from '@/pages/EntregasIndicadoresPage'

// Mock de serviços externos se necessário
vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    authStore: {
      isValid: false,
      token: '',
      model: null,
      record: null,
    },
    collection: vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([]),
      getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
    })),
  },
  pb: {
    authStore: {
      isValid: false,
      token: '',
      model: null,
      record: null,
    },
    collection: vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([]),
      getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
    })),
  },
}))

const mockAuthValue: any = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  role: 'PRODUCTION_VIEWER',
  can: () => false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshPermissions: vi.fn(),
  isRetrying: false,
  isLoadingPermissions: false,
  authError: null,
}

describe('Validação de Todas as 5 Rotas de Entregas PCP', () => {
  it('1. Deve renderizar a rota raiz /pcp/entregas com EntregasPcpPage', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/entregas']}>
          <Routes>
            <Route
              path="/pcp/entregas"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <EntregasPcpPage />
                </PermissionGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByTestId('entregas-pcp-page')).toBeInTheDocument()
    expect(screen.getByText('Entregas PCP')).toBeInTheDocument()
    expect(screen.getByText('Aderência às Entregas')).toBeInTheDocument()
  })

  it('2. Deve renderizar a subrota /pcp/entregas/visao-geral com EntregasPcpPage', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/entregas/visao-geral']}>
          <Routes>
            <Route
              path="/pcp/entregas/visao-geral"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <EntregasPcpPage />
                </PermissionGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByTestId('entregas-pcp-page')).toBeInTheDocument()
    expect(screen.getByText('Aderência às Entregas')).toBeInTheDocument()
  })

  it('3. Deve renderizar a subrota /pcp/entregas/resumo-mensal com ResumoMensalPage', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/entregas/resumo-mensal']}>
          <Routes>
            <Route
              path="/pcp/entregas/resumo-mensal"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <ResumoMensalPage />
                </PermissionGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByTestId('resumo-mensal-page')).toBeInTheDocument()
  })

  it('4. Deve renderizar a subrota /pcp/entregas/historico com EntregasHistoricoPage', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/entregas/historico']}>
          <Routes>
            <Route
              path="/pcp/entregas/historico"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <EntregasHistoricoPage />
                </PermissionGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByTestId('entregas-historico-page')).toBeInTheDocument()
    expect(screen.getByText('Histórico de Entregas')).toBeInTheDocument()
  })

  it('5. Deve renderizar a subrota /pcp/entregas/revisoes com EntregasRevisoesPage', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/entregas/revisoes']}>
          <Routes>
            <Route
              path="/pcp/entregas/revisoes"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <EntregasRevisoesPage />
                </PermissionGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByTestId('entregas-revisoes-page')).toBeInTheDocument()
    expect(screen.getByText('Revisões e Versões')).toBeInTheDocument()
  })

  it('6. Deve renderizar a subrota /pcp/entregas/indicadores com EntregasIndicadoresPage', () => {
    render(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter initialEntries={['/pcp/entregas/indicadores']}>
          <Routes>
            <Route
              path="/pcp/entregas/indicadores"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <EntregasIndicadoresPage />
                </PermissionGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByTestId('entregas-indicadores-page')).toBeInTheDocument()
    expect(screen.getByText('Indicadores de Entregas')).toBeInTheDocument()
  })
})

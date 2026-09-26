import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { EntregasPcpPage } from '@/pages/EntregasPcpPage'
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'

function makeMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: null, // Sem user (cold start ou não logado ainda)
    isAuthenticated: false,
    isLoading: true, // Simula loading de permissões
    authError: null,
    isGlobal: false,
    scopes: [],
    delegations: [],
    permissions: [],
    permissionKeys: new Set<string>(),
    activeScopeFilter: 'ALL',
    setActiveScopeFilter: vi.fn(),
    can: () => false,
    canAny: () => false,
    canAll: () => false,
    hasLineScope: () => true,
    loginWithCorporateAD: vi.fn(),
    switchUserSimulated: vi.fn(),
    logout: vi.fn(),
    refreshPermissions: vi.fn(),
    ...overrides,
  }
}

describe('Entrega 1: Bypass de Rota e Aceitação de /pcp/entregas no PermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não deve travar no PermissionGuard em /pcp/entregas mesmo com isLoading=true e user=null', async () => {
    const authVal = makeMockAuth()

    render(
      <AuthContext.Provider value={authVal}>
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

    // EntregasPcpPage deve ser renderizada imediatamente sem cair em tela de erro de restrição ou skeleton infinito
    expect(screen.getByText('Entregas PCP')).toBeInTheDocument()
    expect(screen.getByText('Aderência às Entregas')).toBeInTheDocument()
    expect(screen.queryByText('Acesso Restrito')).not.toBeInTheDocument()
    expect(screen.queryByText('Instabilidade na Validação de Acessos')).not.toBeInTheDocument()
  })

  it('deve permitir acesso direto à subrota /pcp/entregas/visao-geral', async () => {
    const authVal = makeMockAuth()

    render(
      <AuthContext.Provider value={authVal}>
        <MemoryRouter initialEntries={['/pcp/entregas/visao-geral']}>
          <Routes>
            <Route
              path="/pcp/entregas/visao-geral"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <div data-testid="visao-geral-ok">Visão Geral Entregas OK</div>
                </PermissionGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByTestId('visao-geral-ok')).toBeInTheDocument()
    expect(screen.queryByText('Acesso Restrito')).not.toBeInTheDocument()
  })

  it('não deve abrir brecha para outras permissões restritas em rotas não-bypass', () => {
    const authVal = makeMockAuth({
      can: (perm: string) => perm === 'pcp.schedule.view',
    })

    render(
      <AuthContext.Provider value={authVal}>
        <MemoryRouter initialEntries={['/pcp/admin/acessos-confidenciais']}>
          <Routes>
            <Route
              path="/pcp/admin/acessos-confidenciais"
              element={
                <PermissionGuard permission="pcp.admin.manage">
                  <div data-testid="secreto">Conteúdo Confidencial</div>
                </PermissionGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // Não deve renderizar o conteúdo confidencial
    expect(screen.queryByTestId('secreto')).not.toBeInTheDocument()
    expect(screen.getByText('Acesso Restrito')).toBeInTheDocument()
  })
})

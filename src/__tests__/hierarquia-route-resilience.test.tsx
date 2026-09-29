import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React, { Suspense } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { lazyWithRetry } from '@/lib/lazyWithRetry'
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'

// Mock de AuthContext padrão
const mockAuthValue: AuthContextType = {
  user: {
    id: 'user-teste',
    email: 'teste@ciafal.com.br',
    name: 'Usuário Teste',
    role: 'PCP_PROGRAMMER',
  },
  isAuthenticated: true,
  permissionKeys: new Set(['pcp.masterdata.view', 'pcp.cockpit.view']),
  isGlobal: true,
  scopes: [
    {
      id: 'scope-1',
      scope_type: 'GLOBAL',
      target_id: 'ALL',
      target_name: 'Escopo Geral CIAFAL',
      active: true,
    },
  ],
  delegations: [],
  permissions: [],
  isLoading: false,
  authError: null,
  activeScopeFilter: null,
  can: (perm: string) => perm === 'pcp.masterdata.view' || perm === 'pcp.cockpit.view',
  canAny: () => true,
  canAll: () => true,
  hasLineScope: () => true,
  loginWithCorporateAD: async () => {},
  logout: () => {},
  switchUserSimulated: async () => {},
  refreshPermissions: async () => {},
  setActiveScopeFilter: () => {},
}

describe('Rota /pcp/cadastros/hierarquia — Resiliência no PermissionGuard e Lazy Chunk', () => {
  const originalLocation = window.location

  beforeEach(() => {
    sessionStorage.clear()
    delete (window as any).location
    ;(window as any).location = {
      ...originalLocation,
      reload: vi.fn(),
      pathname: '/pcp/cadastros/hierarquia',
      href: 'http://localhost/pcp/cadastros/hierarquia',
      hash: '',
    }
  })

  afterEach(() => {
    ;(window as any).location = originalLocation
  })

  it('renderiza /pcp/cadastros/hierarquia via PermissionGuard com lazy chunk com sucesso', async () => {
    const FakeHierarchyPage = () => (
      <div data-testid="hierarquia-page">
        <h1>Hierarquia das Linhas e Centros</h1>
      </div>
    )

    const LazyHierarchy = lazyWithRetry(
      () => Promise.resolve({ default: FakeHierarchyPage }),
      'LineCapacitiesSubpage',
    )

    render(
      <MemoryRouter initialEntries={['/pcp/cadastros/hierarquia']}>
        <AuthContext.Provider value={mockAuthValue}>
          <Suspense fallback={<div>Carregando módulo...</div>}>
            <Routes>
              <Route
                path="/pcp/cadastros/hierarquia"
                element={
                  <PermissionGuard permission="pcp.masterdata.view">
                    <ErrorBoundary moduleName="Hierarquia das Linhas">
                      <LazyHierarchy />
                    </ErrorBoundary>
                  </PermissionGuard>
                }
              />
            </Routes>
          </Suspense>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('hierarquia-page')).toBeInTheDocument()
    })
    expect(screen.getByText('Hierarquia das Linhas e Centros')).toBeInTheDocument()
  })

  it('libera bypass imediato de inicialização mesmo quando auth está em loading/sem user no cold-start', async () => {
    const FakeHierarchyPage = () => (
      <div data-testid="hierarquia-page-cold-start">
        <h1>Hierarquia Cold Start</h1>
      </div>
    )

    const uninitializedAuth: AuthContextType = {
      ...mockAuthValue,
      user: null,
      isLoading: true,
      can: () => false,
      hasLineScope: () => false,
    }

    render(
      <MemoryRouter initialEntries={['/pcp/cadastros/hierarquia']}>
        <AuthContext.Provider value={uninitializedAuth}>
          <PermissionGuard permission="pcp.masterdata.view">
            <FakeHierarchyPage />
          </PermissionGuard>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    // O bypass imediato do PermissionGuard para /pcp/cadastros/hierarquia não aguarda auth nem bloqueia em loading
    expect(screen.getByTestId('hierarquia-page-cold-start')).toBeInTheDocument()
    expect(screen.getByText('Hierarquia Cold Start')).toBeInTheDocument()
  })

  it('recupera com retry automático quando o chunk lazy falha na 1ª tentativa', async () => {
    let callCount = 0
    const FakeHierarchyPage = () => (
      <div data-testid="hierarquia-page-recovered">
        <h1>Hierarquia Recuperada</h1>
      </div>
    )

    const flakingFactory = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(
          new TypeError(
            'Failed to fetch dynamically imported module: LineCapacitiesSubpage-123.js',
          ),
        )
      }
      return Promise.resolve({ default: FakeHierarchyPage })
    })

    const LazyHierarchy = lazyWithRetry(flakingFactory, 'LineCapacitiesSubpage', 3)

    render(
      <MemoryRouter initialEntries={['/pcp/cadastros/hierarquia']}>
        <AuthContext.Provider value={mockAuthValue}>
          <Suspense fallback={<div>Carregando módulo...</div>}>
            <PermissionGuard permission="pcp.masterdata.view">
              <ErrorBoundary moduleName="Hierarquia das Linhas">
                <LazyHierarchy />
              </ErrorBoundary>
            </PermissionGuard>
          </Suspense>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('hierarquia-page-recovered')).toBeInTheDocument()
    })
    expect(callCount).toBe(2)
  })

  it('exibe fallback com botão de recarregar se todas as tentativas de chunk falharem e reload automático já ocorreu', async () => {
    sessionStorage.setItem('pcp_chunk_reload_attempted', 'true')

    const alwaysFailingFactory = vi
      .fn()
      .mockRejectedValue(
        new TypeError(
          'Failed to fetch dynamically imported module: LineCapacitiesSubpage-chunk.js',
        ),
      )

    const LazyHierarchy = lazyWithRetry(alwaysFailingFactory, 'LineCapacitiesSubpage', 2)

    render(
      <MemoryRouter initialEntries={['/pcp/cadastros/hierarquia']}>
        <AuthContext.Provider value={mockAuthValue}>
          <Suspense fallback={<div>Carregando módulo...</div>}>
            <PermissionGuard permission="pcp.masterdata.view">
              <ErrorBoundary moduleName="Hierarquia das Linhas">
                <LazyHierarchy />
              </ErrorBoundary>
            </PermissionGuard>
          </Suspense>
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('chunk-error-fallback')).toBeInTheDocument()
    })
    expect(screen.getByText('Nova Versão do Sistema Disponível')).toBeInTheDocument()
    expect(screen.getByText(/LineCapacitiesSubpage/)).toBeInTheDocument()
  })
})

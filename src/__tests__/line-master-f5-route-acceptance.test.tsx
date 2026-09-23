import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AuthProvider } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import LineMasterPage from '@/pages/LineMasterPage'
import pb from '@/lib/pocketbase/client'

const LocationDisplay = () => {
  const location = useLocation()
  return (
    <div data-testid="current-location">{location.pathname + location.search + location.hash}</div>
  )
}

vi.mock('@/lib/pocketbase/client', () => {
  return {
    default: {
      authStore: {
        isValid: true,
        record: { id: 'usr_pcp', email: 'pcp@ciafal.com.br', role: 'PCP_PROGRAMMER' },
        onChange: vi.fn(() => () => {}),
        clear: vi.fn(),
      },
      collection: vi.fn(() => ({
        authWithPassword: vi.fn(),
        getFullList: vi.fn().mockResolvedValue([]),
        getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        subscribe: vi.fn().mockResolvedValue(() => {}),
      })),
      send: vi.fn().mockResolvedValue({}),
    },
    pb: {
      authStore: {
        isValid: true,
        record: { id: 'usr_pcp', email: 'pcp@ciafal.com.br', role: 'PCP_PROGRAMMER' },
        onChange: vi.fn(() => () => {}),
        clear: vi.fn(),
      },
      collection: vi.fn(() => ({
        authWithPassword: vi.fn(),
        getFullList: vi.fn().mockResolvedValue([]),
        getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        subscribe: vi.fn().mockResolvedValue(() => {}),
      })),
      send: vi.fn().mockResolvedValue({}),
    },
  }
})

describe('F5 e Recarga Direta na Ficha Mestra (/pcp/cadastros/ficha-mestre)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renderiza /pcp/cadastros/ficha-mestre diretamente em cold-start / F5 sem ErrorBoundary e sem 404', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/cadastros/ficha-mestre']}>
        <AuthProvider>
          <ControlTowerProvider>
            <ErrorBoundary moduleName="Estrutura de Rotas">
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    path="/pcp/cadastros/ficha-mestre"
                    element={
                      <PermissionGuard permission="pcp.lines.view">
                        <ErrorBoundary moduleName="Ficha Mestre">
                          <div>
                            <LocationDisplay />
                            <LineMasterPage />
                          </div>
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                </Route>
              </Routes>
            </ErrorBoundary>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Sem tela de instabilidade
    expect(screen.queryByText(/Instabilidade Temporária no Módulo/i)).toBeNull()
    expect(screen.queryByText(/Página Não Encontrada/i)).toBeNull()

    // Confirma rota e exibição do módulo
    expect(screen.getByTestId('current-location').textContent).toBe('/pcp/cadastros/ficha-mestre')
    await waitFor(() => {
      expect(screen.getByText(/Centros e Ficha Mestra/i)).toBeDefined()
    })
  })

  it('mantém query parameters ao acessar diretamente com centro e sub-aba selecionada', async () => {
    render(
      <MemoryRouter
        initialEntries={['/pcp/cadastros/ficha-mestre?center=L1&subtab=LESSONS_LEARNED']}
      >
        <AuthProvider>
          <ControlTowerProvider>
            <ErrorBoundary moduleName="Estrutura de Rotas">
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    path="/pcp/cadastros/ficha-mestre"
                    element={
                      <PermissionGuard permission="pcp.lines.view">
                        <ErrorBoundary moduleName="Ficha Mestre">
                          <div>
                            <LocationDisplay />
                            <LineMasterPage />
                          </div>
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                </Route>
              </Routes>
            </ErrorBoundary>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Instabilidade Temporária no Módulo/i)).toBeNull()
    expect(screen.getByTestId('current-location').textContent).toBe(
      '/pcp/cadastros/ficha-mestre?center=L1&subtab=LESSONS_LEARNED',
    )
  })
})

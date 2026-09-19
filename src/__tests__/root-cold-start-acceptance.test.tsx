import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Index from '@/pages/Index'
import { AuthProvider } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'
import pb from '@/lib/pocketbase/client'
import { authService } from '@/services/pcp-auth'

// Mock de chamadas do authService e pb
vi.mock('@/lib/pocketbase/client', () => {
  return {
    default: {
      authStore: {
        isValid: false,
        record: null,
        onChange: vi.fn(() => () => {}),
        clear: vi.fn(),
      },
      collection: vi.fn(() => ({
        authWithPassword: vi.fn().mockRejectedValue(new Error('Network offline')),
        getFullList: vi.fn().mockResolvedValue([]),
        getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        subscribe: vi.fn().mockResolvedValue(() => {}),
      })),
      send: vi.fn().mockRejectedValue(new Error('Network offline')),
    },
  }
})

describe('Aceite de Cold Start na Raiz (/) — Renderização imediata sem skeleton eterno', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('carregar "/" em cold start sem sessão aterrissa deterministicamente na página PRINCIPAL (/pcp/cockpit)', async () => {
    // Garante que pb.authStore.isValid é falso (cold start sem sessão prévia)
    ;(pb.authStore as any).isValid = false
    ;(pb.authStore as any).record = null

    const { RootRedirect } = await import('@/App')
    const { useLocation } = await import('react-router-dom')

    const LocationDisplay = () => {
      const location = useLocation()
      return <div data-testid="current-location">{location.pathname + location.search}</div>
    }

    render(
      <MemoryRouter initialEntries={['/?v=919b1f1']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<RootRedirect />} />
                <Route
                  path="/pcp/cockpit"
                  element={
                    <div>
                      <LocationDisplay />
                      <span>Página Principal Cockpit Operacional PCP</span>
                    </div>
                  }
                />
                <Route path="/pcp-robotizado" element={<Index />} />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Casca do Layout e Página Principal Cockpit devem estar presentes imediatamente
    expect(screen.getByText(/Página Principal Cockpit Operacional PCP/i)).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe('/pcp/cockpit?v=919b1f1')
  })

  it('carregar "/" com sessão válida aterrissa na página PRINCIPAL (/pcp/cockpit) imediatamente', async () => {
    ;(pb.authStore as any).isValid = true
    ;(pb.authStore as any).record = {
      id: 'user-lucas',
      email: 'lucas@ciafal.com.br',
      name: 'Lucas Ferreira',
      role: 'PCP_PROGRAMMER',
    }

    const { RootRedirect } = await import('@/App')
    const { useLocation } = await import('react-router-dom')

    const LocationDisplay = () => {
      const location = useLocation()
      return <div data-testid="current-location">{location.pathname}</div>
    }

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<RootRedirect />} />
                <Route
                  path="/pcp/cockpit"
                  element={
                    <div>
                      <LocationDisplay />
                      <span>Página Principal Cockpit Operacional PCP</span>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Página Principal Cockpit Operacional PCP/i)).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe('/pcp/cockpit')
  })

  it('PermissionGuard com permissão pcp.cockpit.view não bloqueia nem redireciona de volta para "/"', async () => {
    ;(pb.authStore as any).isValid = false
    ;(pb.authStore as any).record = null

    const { PermissionGuard } = await import('@/components/auth/PermissionGuard')
    const { useLocation } = await import('react-router-dom')

    const LocationDisplay = () => {
      const location = useLocation()
      return <div data-testid="current-location">{location.pathname}</div>
    }

    render(
      <MemoryRouter initialEntries={['/pcp/cockpit']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route
                path="/pcp/cockpit"
                element={
                  <PermissionGuard permission="pcp.cockpit.view">
                    <div>
                      <LocationDisplay />
                      <span>Conteúdo Protegido da Página Principal</span>
                    </div>
                  </PermissionGuard>
                }
              />
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Conteúdo Protegido da Página Principal')).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe('/pcp/cockpit')
  })

  it('redirecionamento da raiz "/" para a página PRINCIPAL ("/pcp/cockpit") preserva parâmetros de query (?token=...&v=...)', async () => {
    const { RootRedirect } = await import('@/App')
    const { useLocation } = await import('react-router-dom')

    const LocationDisplay = () => {
      const location = useLocation()
      return <div data-testid="location-display">{location.pathname + location.search}</div>
    }

    render(
      <MemoryRouter initialEntries={['/?token=jwt-secret-xyz&v=0.0.217']}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/pcp/cockpit"
            element={
              <div>
                <LocationDisplay />
                <span>Página Principal Cockpit Destino</span>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Página Principal Cockpit Destino')).toBeDefined()
    expect(screen.getByTestId('location-display').textContent).toBe(
      '/pcp/cockpit?token=jwt-secret-xyz&v=0.0.217',
    )
  })
})

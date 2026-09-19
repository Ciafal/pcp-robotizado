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

  it('carregar "/" em cold start sem sessão aterrissa deterministicamente em /pcp/analise-carteira/geral', async () => {
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
                  path="/pcp/analise-carteira/geral"
                  element={
                    <div>
                      <LocationDisplay />
                      <span>Análise de Carteira Geral CIAFAL</span>
                    </div>
                  }
                />
                <Route path="/pcp-robotizado" element={<Index />} />
                <Route path="/pcp/cockpit" element={<Index />} />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Casca do Layout e Análise de Carteira Geral devem estar presentes imediatamente
    expect(screen.getByText(/Análise de Carteira Geral CIAFAL/i)).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe(
      '/pcp/analise-carteira/geral?v=919b1f1',
    )
  })

  it('carregar "/" com sessão válida aterrissa em /pcp/analise-carteira/geral imediatamente', async () => {
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
                  path="/pcp/analise-carteira/geral"
                  element={
                    <div>
                      <LocationDisplay />
                      <span>Análise de Carteira Geral CIAFAL</span>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Análise de Carteira Geral CIAFAL/i)).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe('/pcp/analise-carteira/geral')
  })

  it('PermissionGuard com permissão pcp.carteira.view não bloqueia nem redireciona de volta para "/"', async () => {
    ;(pb.authStore as any).isValid = false
    ;(pb.authStore as any).record = null

    const { PermissionGuard } = await import('@/components/auth/PermissionGuard')
    const { useLocation } = await import('react-router-dom')

    const LocationDisplay = () => {
      const location = useLocation()
      return <div data-testid="current-location">{location.pathname}</div>
    }

    render(
      <MemoryRouter initialEntries={['/pcp/analise-carteira/geral']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route
                path="/pcp/analise-carteira/geral"
                element={
                  <PermissionGuard permission="pcp.carteira.view">
                    <div>
                      <LocationDisplay />
                      <span>Conteúdo Protegido da Carteira</span>
                    </div>
                  </PermissionGuard>
                }
              />
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Conteúdo Protegido da Carteira')).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe('/pcp/analise-carteira/geral')
  })

  it('redirecionamento da raiz "/" para "/pcp/analise-carteira/geral" preserva parâmetros de query (?token=...&v=...)', async () => {
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
            path="/pcp/analise-carteira/geral"
            element={
              <div>
                <LocationDisplay />
                <span>Análise de Carteira Geral Destino</span>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Análise de Carteira Geral Destino')).toBeDefined()
    expect(screen.getByTestId('location-display').textContent).toBe(
      '/pcp/analise-carteira/geral?token=jwt-secret-xyz&v=0.0.217',
    )
  })
})

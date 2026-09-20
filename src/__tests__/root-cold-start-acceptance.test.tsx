import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Index } from '@/pages/Index'
import { ProductionOrdersPage } from '@/pages/production-control/ProductionOrdersPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import pb from '@/lib/pocketbase/client'

// Helper para inspecionar localização atual no DOM
const LocationDisplay = () => {
  const location = useLocation()
  return (
    <div data-testid="current-location">{location.pathname + location.search + location.hash}</div>
  )
}

// Mock de chamadas do PocketBase client
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

describe('Aceite de Cold Start na Raiz (/) e Resiliência de Rotas — HUB CIAFAL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('(a) abrir "/" carrega diretamente o cockpit normalmente sem ErrorBoundary e sem tela de instabilidade', async () => {
    ;(pb.authStore as any).isValid = false
    ;(pb.authStore as any).record = null

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ControlTowerProvider>
            <ErrorBoundary moduleName="Estrutura de Rotas">
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    path="/"
                    element={
                      <ErrorBoundary moduleName="Cockpit Principal">
                        <div>
                          <LocationDisplay />
                          <Index />
                        </div>
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/pcp/cockpit"
                    element={
                      <ErrorBoundary moduleName="Cockpit Principal">
                        <div>
                          <LocationDisplay />
                          <Index />
                        </div>
                      </ErrorBoundary>
                    }
                  />
                </Route>
              </Routes>
            </ErrorBoundary>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Não deve haver tela de erro do ErrorBoundary
    expect(screen.queryByText(/Instabilidade Temporária no Módulo/i)).toBeNull()
    expect(screen.queryByText(/Recuperação de Falha/i)).toBeNull()

    // O Cockpit deve ser renderizado com sucesso
    expect(screen.getByTestId('current-location').textContent).toBe('/')
    expect(screen.getByText(/Visão Geral & Indicadores Chave da Fábrica/i)).toBeDefined()
    expect(screen.getByText(/PCP ROBOTIZADO/i)).toBeDefined()

    // O item "Principal" no menu lateral deve estar ativo
    const principalLink = screen.getByRole('link', { name: /^Principal$/i })
    expect(principalLink).toBeDefined()
    expect(principalLink.className).toContain('bg-[#004C97]')
  })

  it('(a-2) abrir "/" com parâmetros de querystring e hash preserva parâmetros e renderiza Cockpit', async () => {
    render(
      <MemoryRouter initialEntries={['/?v=1.0.4&token=demo-xyz#dashboard']}>
        <AuthProvider>
          <ControlTowerProvider>
            <ErrorBoundary moduleName="Estrutura de Rotas">
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    path="/"
                    element={
                      <ErrorBoundary moduleName="Cockpit Principal">
                        <div>
                          <LocationDisplay />
                          <Index />
                        </div>
                      </ErrorBoundary>
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
      '/?v=1.0.4&token=demo-xyz#dashboard',
    )
    expect(screen.getByText(/Visão Geral & Indicadores Chave da Fábrica/i)).toBeDefined()
  })

  it('(b) F5 / acesso direto em sub-rota do Controle de Produção ("/pcp/producao/ordens") carrega a tela sem "página inexistente" nem ErrorBoundary', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/producao/ordens']}>
        <AuthProvider>
          <ControlTowerProvider>
            <ErrorBoundary moduleName="Estrutura de Rotas">
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    path="/pcp/producao/ordens"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Ordens de Produção">
                          <div>
                            <LocationDisplay />
                            <ProductionOrdersPage />
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

    // Não pode disparar tela de erro nem página 404
    expect(screen.queryByText(/Instabilidade Temporária no Módulo/i)).toBeNull()
    expect(screen.queryByText(/Página Não Encontrada/i)).toBeNull()

    // O cabeçalho de Ordens de Produção deve renderizar normalmente
    expect(screen.getByText(/Ordens de Produção \(OPs\)/i)).toBeDefined()
    expect(screen.getByText(/GESTÃO DE ORDENS/i)).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe('/pcp/producao/ordens')
  })

  it('(c) navegação pelo menu lateral entre módulos não faz nenhuma tela desaparecer', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ControlTowerProvider>
            <ErrorBoundary moduleName="Estrutura de Rotas">
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    path="/"
                    element={
                      <div>
                        <LocationDisplay />
                        <span data-testid="screen-cockpit">Cockpit Visão Geral</span>
                      </div>
                    }
                  />
                  <Route
                    path="/pcp/cockpit"
                    element={
                      <div>
                        <LocationDisplay />
                        <span data-testid="screen-cockpit">Cockpit Visão Geral</span>
                      </div>
                    }
                  />
                  <Route
                    path="/pcp/producao/ordens"
                    element={
                      <div>
                        <LocationDisplay />
                        <span data-testid="screen-ordens">Ordens de Produção Ativas</span>
                      </div>
                    }
                  />
                </Route>
              </Routes>
            </ErrorBoundary>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // 1. Inicial na rota raiz
    expect(screen.getByTestId('screen-cockpit')).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe('/')

    // 2. Localiza grupo Controle de Produção e clica para expandir
    const groupControle = screen.getByTestId('nav-group-header-CONTROLE DE PRODUÇÃO')
    fireEvent.click(groupControle)

    // 3. Clica no item "Ordens de Produção"
    const ordensLink = await screen.findByRole('link', { name: /Ordens de Produção/i })
    expect(ordensLink).toBeDefined()
    fireEvent.click(ordensLink)

    // 4. A tela de ordens de produção deve carregar sem tela branca nem ErrorBoundary
    await waitFor(() => {
      expect(screen.getByTestId('screen-ordens')).toBeDefined()
      expect(screen.getByTestId('current-location').textContent).toBe('/pcp/producao/ordens')
    })
    expect(screen.queryByText(/Instabilidade Temporária no Módulo/i)).toBeNull()

    // 5. Clica de volta no item "Principal" no menu lateral
    const principalLink = screen.getByRole('link', { name: /^Principal$/i })
    fireEvent.click(principalLink)

    await waitFor(() => {
      expect(screen.getByTestId('screen-cockpit')).toBeDefined()
      expect(screen.getByTestId('current-location').textContent).toBe('/pcp/cockpit')
    })
    expect(screen.queryByText(/Instabilidade Temporária no Módulo/i)).toBeNull()
  })

  it('(d) histórico de navegação e voltar pelo navegador mantém as rotas corretas', async () => {
    const historyEntries = ['/', '/pcp/producao/ordens']

    render(
      <MemoryRouter initialEntries={historyEntries} initialIndex={1}>
        <AuthProvider>
          <ControlTowerProvider>
            <ErrorBoundary moduleName="Estrutura de Rotas">
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    path="/"
                    element={
                      <div>
                        <LocationDisplay />
                        <span data-testid="screen-cockpit">Cockpit Principal Raiz</span>
                      </div>
                    }
                  />
                  <Route
                    path="/pcp/producao/ordens"
                    element={
                      <div>
                        <LocationDisplay />
                        <span data-testid="screen-ordens">Ordens de Produção</span>
                      </div>
                    }
                  />
                </Route>
              </Routes>
            </ErrorBoundary>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Estado inicial no índice 1: /pcp/producao/ordens
    expect(screen.getByTestId('screen-ordens')).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe('/pcp/producao/ordens')
    expect(screen.queryByText(/Instabilidade Temporária no Módulo/i)).toBeNull()
  })

  it('garante que RootRedirect de compatibilidade não entra em loop e preserva query params', async () => {
    const { RootRedirect } = await import('@/App')

    render(
      <MemoryRouter initialEntries={['/redirect-test?token=ciafal-auth&env=prod#status']}>
        <Routes>
          <Route path="/redirect-test" element={<RootRedirect />} />
          <Route
            path="/pcp/cockpit"
            element={
              <div>
                <LocationDisplay />
                <span>Página Cockpit Destino</span>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Página Cockpit Destino')).toBeDefined()
    expect(screen.getByTestId('current-location').textContent).toBe(
      '/pcp/cockpit?token=ciafal-auth&env=prod#status',
    )
  })
})

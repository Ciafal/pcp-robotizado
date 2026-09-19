import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PCPNavbar } from '@/components/layout/PCPNavigation'
import { AuthProvider } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'

// Mock básico para evitar requisições de rede
vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    authStore: {
      isValid: false,
      record: null,
      onChange: vi.fn(() => () => {}),
      clear: vi.fn(),
    },
    collection: vi.fn(() => ({
      authWithPassword: vi.fn().mockRejectedValue(new Error('Offline')),
      getFullList: vi.fn().mockResolvedValue([]),
      getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(() => {}),
    })),
    send: vi.fn().mockRejectedValue(new Error('Offline')),
  },
}))

describe('Layout & PCPNavbar — Arquitetura Vertical e Cabeçalho Sem Truncamento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('PCPNavbar exibe todos os elementos institucionais e controles: HUB INDUSTRIAL, PCP ROBOTIZADO, Divinópolis, Contagem e Seletor de Ambiente', () => {
    render(
      <MemoryRouter initialEntries={['/pcp/cockpit']}>
        <AuthProvider>
          <ControlTowerProvider>
            <PCPNavbar />
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Elementos institucionais do topo
    expect(screen.getByText('HUB INDUSTRIAL')).toBeInTheDocument()
    expect(screen.getByText('PCP ROBOTIZADO')).toBeInTheDocument()
    expect(screen.getByText(/CIAFAL • Divinópolis • Contagem/i)).toBeInTheDocument()

    // Seletor de Ambiente
    expect(screen.getByText(/AMBIENTE:/i)).toBeInTheDocument()

    // Botões de Ação do Simulador AD
    expect(screen.getByText('Route Suite')).toBeInTheDocument()
    expect(screen.getByText('30 Testes')).toBeInTheDocument()
  })

  it('Layout possui fluxo vertical flex-col com container principal flex-1 min-h-0 sem calc() restritivo', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/pcp/cockpit']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route
                  path="/pcp/cockpit"
                  element={
                    <div data-testid="test-content">
                      <div data-testid="breadcrumb-test">PCP Robotizado &gt; Principal</div>
                      <h1>Cockpit Operacional</h1>
                    </div>
                  }
                />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // 1. O root do Layout deve ter h-screen e flex-col para ocupar o viewport sem vazamento
    const layoutRoot = container.firstElementChild as HTMLElement
    expect(layoutRoot).toHaveClass('h-screen')
    expect(layoutRoot).toHaveClass('flex-col')
    expect(layoutRoot).toHaveClass('overflow-hidden')

    // 2. O header do PCPNavbar deve estar presente e não possuir position fixed que sobreponha o conteúdo
    const header = container.querySelector('header')
    expect(header).toBeInTheDocument()
    expect(header).not.toHaveClass('fixed')
    expect(header).toHaveClass('shrink-0')

    // 3. O container intermediário de conteúdo (Sidebar + Main) deve ter flex-1 e min-h-0 (não calc restritivo)
    const contentContainer = container.querySelector('div.flex-1.flex.w-full')
    expect(contentContainer).toBeInTheDocument()
    expect(contentContainer).toHaveClass('flex-1')
    expect(contentContainer).toHaveClass('min-h-0')
    // Não deve usar calc() mágico que causava corte horizontal
    expect(contentContainer?.className).not.toMatch(/h-\[calc\(/)

    // 4. A main#pcp-main-content deve ter flex-1 e scroll próprio min-h-0
    const mainContent = container.querySelector('#pcp-main-content')
    expect(mainContent).toBeInTheDocument()
    expect(mainContent).toHaveClass('flex-1')
    expect(mainContent).toHaveClass('min-h-0')
    expect(mainContent).toHaveClass('overflow-y-auto')

    // 5. O conteúdo (breadcrumb e título) é renderizado dentro da main
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
    expect(screen.getByTestId('breadcrumb-test')).toBeInTheDocument()
  })

  it('A sidebar de 230px é preservada estruturalmente com largura fixa', () => {
    render(
      <MemoryRouter initialEntries={['/pcp/cockpit']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/pcp/cockpit" element={<div>Cockpit</div>} />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const sidebar = screen.getByTestId('pcp-sidebar')
    expect(sidebar).toBeInTheDocument()
    expect(sidebar).toHaveClass('w-[230px]')
    expect(sidebar).toHaveClass('min-w-[230px]')
    expect(sidebar).toHaveClass('max-w-[230px]')
  })
})

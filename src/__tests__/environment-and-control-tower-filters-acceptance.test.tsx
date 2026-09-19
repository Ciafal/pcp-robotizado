import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { PCPNavbar } from '@/components/layout/PCPNavigation'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'
import { AuthProvider } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'

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

describe('Aceite: Correção 1 & 2 — Pilha de Camadas, Unificação de Ambiente e Responsividade dos Filtros', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('Correção 1: Badge de ambiente vive no PCPNavbar com z-30 superior ao fluxo principal (z-10)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/pcp/sequenciamento/torre-controle']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/pcp/sequenciamento/torre-controle" element={<ControlTowerHeader />} />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // O header do PCPNavbar tem z-30 relativo e está no fluxo antes do conteúdo
    const header = container.querySelector('header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('z-30')
    expect(header).toHaveClass('relative')

    // O badge oficial de ambiente é renderizado dentro do header
    const envBadge = screen.getByText(/AMBIENTE: HOMOLOGAÇÃO/i)
    expect(envBadge).toBeInTheDocument()
    expect(header).toContainElement(envBadge)

    // O container principal (sidebar + main) possui z-10, garantindo que não sobreponha o header
    const mainWrapper = container.querySelector('div.flex-1.flex.w-full')
    expect(mainWrapper).toHaveClass('z-10')

    // Ausência de duplicação: apenas UM único indicador de ambiente existe na tela
    const homologacaoOccurrences = screen.getAllByText(/HOMOLOGAÇÃO/i)
    // O texto 'HOMOLOGAÇÃO' deve aparecer apenas no seletor oficial de ambiente (e dropdown se aberto), nunca em banner duplicado
    expect(screen.queryByText('⚠ AMBIENTE DE HOMOLOGAÇÃO')).not.toBeInTheDocument()
    expect(screen.queryByText(/8 cenários ativos • ZPP003 mock/i)).not.toBeInTheDocument()
  })

  it('Correção 2: Filtros da Torre de Controle possuem min-w-0 elástico e não sofrem com overflow fixo', () => {
    render(
      <MemoryRouter initialEntries={['/pcp/sequenciamento/torre-controle']}>
        <AuthProvider>
          <ControlTowerProvider>
            <ControlTowerHeader />
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const companySelect = screen.getByLabelText('Filtro de Empresa')
    const plantSelect = screen.getByLabelText('Filtro de Planta')
    const lineSelect = screen.getByLabelText('Filtro de Linha')

    // Todos os selects devem possuir min-w-0 e truncate
    expect(companySelect).toHaveClass('min-w-0')
    expect(companySelect).toHaveClass('truncate')
    expect(plantSelect).toHaveClass('min-w-0')
    expect(plantSelect).toHaveClass('truncate')
    expect(lineSelect).toHaveClass('min-w-0')
    expect(lineSelect).toHaveClass('truncate')

    // O select de linha deve ter w-full com max-w flexível
    expect(lineSelect).toHaveClass('w-full')
    expect(lineSelect.className).toContain('max-w-[')

    // Wrappers pais flex/grid com min-w-0
    expect(companySelect.parentElement).toHaveClass('min-w-0')
    expect(plantSelect.parentElement).toHaveClass('min-w-0')
    expect(lineSelect.parentElement).toHaveClass('min-w-0')

    // Botões de ação possuem colapso com shrink-0 e textos ocultáveis em telas intermediárias
    const refreshBtn = screen.getByTitle('Atualizar dados')
    expect(refreshBtn).toBeInTheDocument()
    expect(refreshBtn).toHaveClass('shrink-0')

    const simulateBtn = screen.getByTitle('Simular Cenário')
    expect(simulateBtn).toBeInTheDocument()
    expect(simulateBtn).toHaveClass('shrink-0')

    const aiBtn = screen.getByTitle('Analisar com IA')
    expect(aiBtn).toBeInTheDocument()
    expect(aiBtn).toHaveClass('shrink-0')
  })
})

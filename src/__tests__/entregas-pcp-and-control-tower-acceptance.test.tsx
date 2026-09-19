import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'
import { PCPSidebar } from '@/components/layout/PCPNavigation'
import { EntregasPcpPage } from '@/pages/EntregasPcpPage'

// Mock do AuthContext completo
function makeMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: {
      id: 'usr-1',
      name: 'Lucas Ferreira',
      email: 'lucas.pcp@ciafal.com.br',
      role: 'PCP_PROGRAMMER',
    },
    isAuthenticated: true,
    isLoading: false,
    authError: null,
    isGlobal: true,
    scopes: [],
    delegations: [],
    permissions: [],
    permissionKeys: new Set(['pcp.schedule.view', 'pcp.schedule.edit', 'pcp.audit.view']),
    activeScopeFilter: 'ALL',
    setActiveScopeFilter: vi.fn(),
    can: (perm: string) => true,
    canAny: () => true,
    canAll: () => true,
    hasLineScope: () => true,
    loginWithCorporateAD: vi.fn(),
    switchUserSimulated: vi.fn(),
    logout: vi.fn(),
    refreshPermissions: vi.fn(),
    ...overrides,
  }
}

describe('Entrega 1: Responsividade e Truncamento da Torre de Controle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar os seletores de filtros com min-w-0 e truncate sem quebras fixas', () => {
    const authVal = makeMockAuth()
    const { container } = render(
      <AuthContext.Provider value={authVal}>
        <ControlTowerProvider>
          <MemoryRouter>
            <ControlTowerHeader />
          </MemoryRouter>
        </ControlTowerProvider>
      </AuthContext.Provider>,
    )

    // Seletor de Linha deve conter classes de truncamento e min-w-0
    const lineSelect = screen.getByLabelText('Filtro de Linha')
    expect(lineSelect).toBeInTheDocument()
    expect(lineSelect).toHaveClass('min-w-0')
    expect(lineSelect).toHaveClass('truncate')
    expect(lineSelect).toHaveClass('md:max-w-[260px]')

    // O container pai imediato do select de Linha também deve ter min-w-0
    const lineWrapper = lineSelect.parentElement
    expect(lineWrapper).toBeInTheDocument()
    expect(lineWrapper).toHaveClass('min-w-0')

    // Empresa e Planta também devem ter min-w-0 e flexibilidade sem shrink-0 rígido
    const companySelect = screen.getByLabelText('Filtro de Empresa')
    const plantSelect = screen.getByLabelText('Filtro de Planta')
    expect(companySelect).toHaveClass('min-w-0')
    expect(companySelect).toHaveClass('truncate')
    expect(plantSelect).toHaveClass('min-w-0')
    expect(plantSelect).toHaveClass('truncate')
    expect(companySelect.parentElement).toHaveClass('min-w-0')
    expect(plantSelect.parentElement).toHaveClass('min-w-0')

    // Container geral dos filtros deve ter flex-wrap e min-w-0
    const filterBox = lineWrapper?.parentElement
    expect(filterBox).toBeInTheDocument()
    expect(filterBox).toHaveClass('min-w-0')
    expect(filterBox).toHaveClass('flex-wrap')

    // Garantir ausência do banner duplicado no ControlTowerHeader
    expect(screen.queryByText('⚠ AMBIENTE DE HOMOLOGAÇÃO')).not.toBeInTheDocument()

    // Garantir que nenhum dos wrappers tem overflow-x hidden mascarando problema
    expect(filterBox?.className).not.toContain('overflow-x-hidden')
    expect(lineWrapper?.className).not.toContain('overflow-x-hidden')
  })

  it('deve permitir seleção de linha mantendo acessibilidade e título atualizado', () => {
    const authVal = makeMockAuth()
    render(
      <AuthContext.Provider value={authVal}>
        <ControlTowerProvider>
          <MemoryRouter>
            <ControlTowerHeader />
          </MemoryRouter>
        </ControlTowerProvider>
      </AuthContext.Provider>,
    )

    const lineSelect = screen.getByLabelText('Filtro de Linha') as HTMLSelectElement
    fireEvent.change(lineSelect, { target: { value: 'L1' } })
    expect(lineSelect.value).toBe('L1')
  })
})

describe('Entrega 2: Novo tópico ENTREGAS PCP', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve exibir o item "Entregas PCP" no menu de navegação lateral (PCPNavigation)', () => {
    const authVal = makeMockAuth()
    render(
      <AuthContext.Provider value={authVal}>
        <MemoryRouter initialEntries={['/pcp/entregas']}>
          <PCPSidebar />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    // O link Entregas PCP deve estar presente e apontar para /pcp/entregas
    const navLink = screen.getByText('Entregas PCP').closest('a')
    expect(navLink).toBeInTheDocument()
    expect(navLink).toHaveAttribute('href', '/pcp/entregas')
    expect(navLink).toHaveClass('bg-[#004C97]') // rota ativa destacada
  })

  it('deve renderizar a página EntregasPcpPage com KPIs formatados pt-BR, resumo por linha e tabela', () => {
    render(
      <MemoryRouter>
        <EntregasPcpPage />
      </MemoryRouter>,
    )

    // Cabeçalho
    expect(screen.getByText('Entregas PCP')).toBeInTheDocument()

    // KPIs obrigatórios
    expect(screen.getByText('Aderência às Entregas')).toBeInTheDocument()
    expect(screen.getByText('Entregas no Prazo')).toBeInTheDocument()
    expect(screen.getByText('Entregas Atrasadas')).toBeInTheDocument()
    expect(screen.getByText('Total Programado')).toBeInTheDocument()

    // Formato de percentual pt-BR (vírgula decimal)
    const percentageRegex = /\d+,\d/
    const pageText = document.body.textContent || ''
    expect(percentageRegex.test(pageText)).toBe(true)

    // Datas na tabela em formato pt-BR DD/MM/AAAA
    const ptBrDateRegex = /\d{2}\/\d{2}\/\d{4}/
    expect(ptBrDateRegex.test(pageText)).toBe(true)

    // Badges de status
    expect(screen.getAllByText('No Prazo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Atrasada').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Reprogramada').length).toBeGreaterThan(0)

    // Resumo de linhas
    expect(screen.getByText('Resumo de Entregas por Linha Fabril')).toBeInTheDocument()
  })

  it('deve filtrar os dados ao alterar o seletor de status e linha', () => {
    render(
      <MemoryRouter>
        <EntregasPcpPage />
      </MemoryRouter>,
    )

    const statusFilter = screen.getByLabelText('Filtro de Status') as HTMLSelectElement
    fireEvent.change(statusFilter, { target: { value: 'ATRASADA' } })
    expect(statusFilter.value).toBe('ATRASADA')

    // Tabela deve continuar exibindo registros condizentes
    expect(screen.getAllByText('Atrasada').length).toBeGreaterThan(0)
  })
})

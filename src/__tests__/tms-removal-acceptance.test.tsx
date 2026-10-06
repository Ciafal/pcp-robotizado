import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { officialNavGroups, PCPSidebar } from '@/components/layout/PCPNavigation'

// Mock de autenticação e contexto
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', email: 'planejador@ciafal.com.br', role: 'PCP_ADMIN', permissions: ['*'] },
    hasPermission: () => true,
    hasLineScope: () => true,
    can: () => true,
    isAdmin: true,
    userRole: 'PCP_ADMIN',
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/auth/Can', () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/auth/ADSimulatorSwitcher', () => ({
  ADSimulatorSwitcher: () => <div data-testid="mock-ad-switcher" />,
}))

vi.mock('./EnvironmentSelectorBadge', () => ({
  EnvironmentSelectorBadge: () => <div data-testid="mock-env-badge" />,
}))

describe('Correção Cirúrgica — Remoção Completa do TMS do PCP Robotizado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Grupo "TMS" NÃO deve existir em officialNavGroups', () => {
    const tmsGroup = officialNavGroups.find(
      (g) => g.groupTitle === 'TMS' || g.groupTitle.toLowerCase().includes('tms'),
    )
    expect(tmsGroup).toBeUndefined()
  })

  it('2. Item "Planejador de Cargas" NÃO deve existir em nenhum grupo de officialNavGroups', () => {
    const allItems = officialNavGroups.flatMap((g) => g.items)
    const planejadorItem = allItems.find(
      (item) =>
        item.title.toLowerCase().includes('planejador de cargas') ||
        item.href.includes('planejador-cargas') ||
        item.href.includes('/pcp/tms'),
    )
    expect(planejadorItem).toBeUndefined()
  })

  it('3. Sequência obrigatória do menu: ANÁLISE DE CARTEIRA imediatamente seguida por GESTÃO DE MP', () => {
    const groupTitles = officialNavGroups.map((g) => g.groupTitle)
    const indexCarteira = groupTitles.indexOf('ANÁLISE DE CARTEIRA')
    const indexMp = groupTitles.indexOf('GESTÃO DE MP')

    expect(indexCarteira).toBeGreaterThan(-1)
    expect(indexMp).toBeGreaterThan(-1)
    expect(indexMp).toBe(indexCarteira + 1)
  })

  it('4. Sidebar renderizada em runtime não contém menção, ícone ou link para TMS ou Planejador de Cargas', () => {
    render(
      <MemoryRouter initialEntries={['/pcp/cockpit']}>
        <PCPSidebar />
      </MemoryRouter>,
    )

    // Não deve haver nenhum elemento de cabeçalho de grupo TMS
    expect(screen.queryByTestId('nav-group-header-TMS')).toBeNull()
    expect(screen.queryByText(/^TMS$/i)).toBeNull()
    expect(screen.queryByText(/Planejador de Cargas/i)).toBeNull()

    // Grupos legítimos devem estar presentes
    expect(screen.getByText('ANÁLISE DE CARTEIRA')).toBeInTheDocument()
    expect(screen.getByText('GESTÃO DE MP')).toBeInTheDocument()
    expect(screen.getByText('CONTROLE DE PRODUÇÃO')).toBeInTheDocument()
    expect(screen.getByText('CADASTROS')).toBeInTheDocument()
  })

  it('5. Validação estática de ausência de referências a rotas /pcp/tms no App.tsx', async () => {
    const appSource = await import('../App.tsx?raw')
    const content = appSource.default || ''

    expect(content).not.toContain('/pcp/tms')
    expect(content).not.toContain('PlanejadorCargasPage')
    expect(content).not.toContain('/tms/planejador-cargas')
    expect(content).not.toContain('/tms/mapa-logistico')
  })
})

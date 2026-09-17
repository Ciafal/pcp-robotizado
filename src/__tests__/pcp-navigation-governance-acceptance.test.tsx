import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PCPSidebar } from '../components/layout/PCPNavigation'
import { AuthContext, AuthContextType } from '../contexts/AuthContext'

// Helper para mock do AuthContext
function renderSidebarWithAuth(
  initialRoute = '/pcp/sequenciamento/programacao-testes',
  authOverrides?: Partial<AuthContextType>,
) {
  const defaultAuthValue: AuthContextType = {
    user: {
      id: 'admin-1',
      name: 'Administrador PCP',
      email: 'admin@ciafal.com.br',
      role: 'PCP_ADMIN',
    },
    isAuthenticated: true,
    isLoading: false,
    authError: null,
    isGlobal: true,
    scopes: [],
    delegations: [],
    permissions: [],
    permissionKeys: new Set([
      'pcp.schedule.view',
      'pcp.schedule.edit',
      'pcp.audit.view',
      'pcp.integrations.view',
      'pcp.admin.manage',
      'pcp.admin.access',
      'pcp.carteira.view',
      'pcp.mp_opt.view',
      'pcp.quality.view',
      'pcp.masterdata.view',
      'pcp.meeting.view',
    ]),
    activeScopeFilter: 'ALL',
    setActiveScopeFilter: vi.fn(),
    can: (perm: string) => {
      // PCP_ADMIN tem acesso total
      const role = authOverrides?.user?.role || 'PCP_ADMIN'
      if (role === 'PCP_ADMIN' || role === 'ADMIN' || role === 'ADMINISTRADOR') return true
      if (authOverrides?.permissionKeys) {
        return authOverrides.permissionKeys.has(perm) || authOverrides.permissionKeys.has('*')
      }
      return [
        'pcp.schedule.view',
        'pcp.audit.view',
        'pcp.integrations.view',
        'pcp.admin.manage',
        'pcp.admin.access',
        'pcp.carteira.view',
      ].includes(perm)
    },
    canAny: () => true,
    canAll: () => true,
    hasLineScope: () => true,
    loginWithCorporateAD: vi.fn(),
    switchUserSimulated: vi.fn(),
    logout: vi.fn(),
    refreshPermissions: vi.fn(),
    ...authOverrides,
  }

  return render(
    <AuthContext.Provider value={defaultAuthValue}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <PCPSidebar />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('PCPNavigation — Integrações & Governança Acceptance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Teste 1: Abrir PCP Robotizado → Grupo "Integrações & Governança" exibe TODOS os subitens obrigatórios', async () => {
    renderSidebarWithAuth('/pcp/sequenciamento/programacao-testes')

    // O cabeçalho deve estar presente
    const header = screen.getByText('INTEGRAÇÕES & GOVERNANÇA')
    expect(header).toBeInTheDocument()

    // Todos os subitens obrigatórios devem estar visíveis
    expect(screen.getByText('Integrações PCP')).toBeInTheDocument()
    expect(screen.getByText('Monitor de Eventos')).toBeInTheDocument()
    expect(screen.getByText('Qualidade dos Dados PCP')).toBeInTheDocument()
    expect(screen.getByText('Status de Homologação')).toBeInTheDocument()
    expect(screen.getByText('Motivos & Justificativas')).toBeInTheDocument()
    expect(screen.getByText('Logs & Auditoria')).toBeInTheDocument()
    expect(screen.getByText('Configurações & Acessos')).toBeInTheDocument()
  })

  it('Teste 2: Ao clicar em "Logs & Auditoria" ou abrir /pcp/auditoria, o grupo permanece expandido e o item é destacado', async () => {
    renderSidebarWithAuth('/pcp/auditoria')

    // Deve estar visível e destacado
    const auditItem = screen.getByText('Logs & Auditoria').closest('a')
    expect(auditItem).toBeInTheDocument()
    expect(auditItem).toHaveClass('bg-[#004C97]')
    expect(auditItem).toHaveClass('text-white')

    // Os demais itens permanecem visíveis
    expect(screen.getByText('Integrações PCP')).toBeInTheDocument()
    expect(screen.getByText('Motivos & Justificativas')).toBeInTheDocument()
    expect(screen.getByText('Configurações & Acessos')).toBeInTheDocument()
  })

  it('Teste 3: Em /pcp/motivos-justificativas ou /pcp/motivos, o item ativo muda corretamente e o grupo autoexpande', async () => {
    renderSidebarWithAuth('/pcp/motivos-justificativas')

    const motivosItem = screen.getByText('Motivos & Justificativas').closest('a')
    expect(motivosItem).toBeInTheDocument()
    expect(motivosItem).toHaveClass('bg-[#004C97]')
    expect(motivosItem).toHaveClass('text-white')

    // Demais itens ainda visíveis
    expect(screen.getByText('Logs & Auditoria')).toBeInTheDocument()
    expect(screen.getByText('Integrações PCP')).toBeInTheDocument()
  })

  it('Teste 4: Alternar perfil para Administrador / PCP_ADMIN / PCP_PROGRAMMER / AUDITOR → nenhum item administrativo desaparece indevidamente', async () => {
    // 4.1 Teste com PCP_ADMIN
    const { unmount: unmountAdmin } = renderSidebarWithAuth('/pcp/cockpit', {
      user: { id: 'u1', name: 'Admin', email: 'adm@ciafal.com.br', role: 'PCP_ADMIN' },
    })
    expect(screen.getByText('Logs & Auditoria')).toBeInTheDocument()
    expect(screen.getByText('Configurações & Acessos')).toBeInTheDocument()
    expect(screen.getByText('Integrações PCP')).toBeInTheDocument()
    unmountAdmin()

    // 4.2 Teste com PCP_PROGRAMMER
    const programmerPerms = new Set([
      'pcp.schedule.view',
      'pcp.schedule.edit',
      'pcp.integrations.view',
      'pcp.audit.view',
      'pcp.admin.manage',
      'pcp.admin.access',
    ])
    const { unmount: unmountProg } = renderSidebarWithAuth('/pcp/cockpit', {
      user: { id: 'u2', name: 'Programmer', email: 'prog@ciafal.com.br', role: 'PCP_PROGRAMMER' },
      permissionKeys: programmerPerms,
      can: (perm: string) => programmerPerms.has(perm),
    })
    expect(screen.getByText('Logs & Auditoria')).toBeInTheDocument()
    expect(screen.getByText('Configurações & Acessos')).toBeInTheDocument()
    expect(screen.getByText('Integrações PCP')).toBeInTheDocument()
    unmountProg()

    // 4.3 Teste com AUDITOR
    const auditorPerms = new Set(['pcp.schedule.view', 'pcp.integrations.view', 'pcp.audit.view'])
    const { unmount: unmountAuditor } = renderSidebarWithAuth('/pcp/cockpit', {
      user: { id: 'u3', name: 'Auditor', email: 'aud@ciafal.com.br', role: 'AUDITOR' },
      permissionKeys: auditorPerms,
      can: (perm: string) => auditorPerms.has(perm),
    })
    expect(screen.getByText('Logs & Auditoria')).toBeInTheDocument()
    expect(screen.getByText('Integrações PCP')).toBeInTheDocument()
    expect(screen.getByText('Monitor de Eventos')).toBeInTheDocument()
    expect(screen.getByText('Qualidade dos Dados PCP')).toBeInTheDocument()
    expect(screen.getByText('Status de Homologação')).toBeInTheDocument()
    expect(screen.getByText('Motivos & Justificativas')).toBeInTheDocument()
    unmountAuditor()
  })

  it('Teste 5: Expansão manual — Clicar no cabeçalho alterna entre recolhido e expandido', async () => {
    renderSidebarWithAuth('/pcp/sequenciamento')

    const header = screen.getByTestId('nav-group-header-INTEGRAÇÕES & GOVERNANÇA')
    expect(screen.getByText('Logs & Auditoria')).toBeInTheDocument()

    // Clica para recolher
    fireEvent.click(header)
    expect(screen.queryByText('Logs & Auditoria')).not.toBeInTheDocument()

    // Clica novamente para expandir
    fireEvent.click(header)
    expect(screen.getByText('Logs & Auditoria')).toBeInTheDocument()
    expect(screen.getByText('Integrações PCP')).toBeInTheDocument()
    expect(screen.getByText('Configurações & Acessos')).toBeInTheDocument()
  })

  it('Teste 6: Container do submenu não possui height 0 ou overflow hidden restritivo quando expandido', async () => {
    renderSidebarWithAuth('/pcp/sequenciamento/programacao-testes')

    const itemsContainer = screen.getByTestId('nav-group-items-INTEGRAÇÕES & GOVERNANÇA')
    expect(itemsContainer).toHaveClass('h-auto')
    expect(itemsContainer).not.toHaveClass('h-0')
    expect(itemsContainer).not.toHaveClass('max-h-0')
    expect(itemsContainer).not.toHaveClass('hidden')
  })
})

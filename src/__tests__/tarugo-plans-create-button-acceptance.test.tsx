import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TarugoPlansTab } from '@/components/mp-optimization/TarugoPlansTab'
import { tarugoPlansService } from '@/services/tarugo-plans-service'

import { AuthContext, type AuthContextType } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'

function createMockAuth(role: string): AuthContextType {
  const permKeys = new Set(authService.getPermissionsForRole(role))
  const isGlobal = role === 'PCP_ADMIN' || role === 'ADMIN'

  const can = (key: string) => {
    if (isGlobal) return true
    return permKeys.has(key) || permKeys.has('*')
  }

  return {
    user: {
      id: `user-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@ciafal.com.br`,
      name: `Usuário ${role}`,
      role: role as any,
    },
    isAuthenticated: true,
    isLoading: false,
    authError: null,
    isGlobal,
    scopes: [],
    delegations: [],
    permissions: [],
    permissionKeys: permKeys,
    activeScopeFilter: null,
    setActiveScopeFilter: vi.fn(),
    can,
    hasPermission: can,
    canAny: (keys: string[]) => keys.some((k) => can(k)),
    canAll: (keys: string[]) => keys.every((k) => can(k)),
    hasLineScope: () => true,
    loginWithCorporateAD: vi.fn(),
    switchUserSimulated: vi.fn(),
    logout: vi.fn(),
    refreshPermissions: vi.fn(),
  }
}

function renderWithRole(ui: React.ReactElement, role: string) {
  const authValue = createMockAuth(role)
  return render(<AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>)
}

vi.mock('@/services/tarugo-plans-service', () => ({
  tarugoPlansService: {
    listPlans: vi.fn(),
    createPlan: vi.fn(),
    checkDuplicateKey: vi.fn(),
    validatePlan: vi.fn().mockReturnValue([]),
  },
  tarugoFormatters: {
    meters: (v: number) => `${v} m`,
    kg: (v: number) => `${v} kg`,
    dateTime: () => '05/11/2026 12:00',
  },
}))

describe('TarugoPlansTab - Botão "+ Criar Plano" no cabeçalho', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tarugoPlansService.listPlans).mockResolvedValue([])
  })

  it('renderiza o botão com texto verbatim "+ Criar Plano" para perfil PCP_PROGRAMMER com 0 planos', async () => {
    renderWithRole(<TarugoPlansTab />, 'PCP_PROGRAMMER')

    await waitFor(() => {
      expect(tarugoPlansService.listPlans).toHaveBeenCalled()
    })

    const createBtn = screen.getByRole('button', { name: /\+ Criar Plano/i })
    expect(createBtn).toBeInTheDocument()
    expect(createBtn).toHaveTextContent('+ Criar Plano')

    // Botão secundário na mensagem de lista vazia também aparece
    expect(screen.getByRole('button', { name: /Cadastrar primeiro plano/i })).toBeInTheDocument()

    // Estilo visual Ciafal Pantone 2945
    expect(createBtn.className).toContain('bg-[#004C97]')
    expect(createBtn.className).toContain('hover:bg-[#003870]')
    expect(createBtn.className).toContain('text-white')
    expect(createBtn.className).toContain('rounded-md')
  })

  it('NÃO renderiza o botão "+ Criar Plano" para perfil somente leitura PCP_PLANNER', async () => {
    renderWithRole(<TarugoPlansTab />, 'PCP_PLANNER')

    await waitFor(() => {
      expect(tarugoPlansService.listPlans).toHaveBeenCalled()
    })

    expect(screen.queryByRole('button', { name: /\+ Criar Plano/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Cadastrar primeiro plano/i })).toBeNull()
  })

  it('NÃO renderiza o botão "+ Criar Plano" para perfil somente leitura OPERATOR', async () => {
    renderWithRole(<TarugoPlansTab />, 'OPERATOR')

    await waitFor(() => {
      expect(tarugoPlansService.listPlans).toHaveBeenCalled()
    })

    expect(screen.queryByRole('button', { name: /\+ Criar Plano/i })).toBeNull()
  })

  it('renderiza o botão "+ Criar Plano" para perfil PCP_ADMIN (bypass total)', async () => {
    renderWithRole(<TarugoPlansTab />, 'PCP_ADMIN')

    await waitFor(() => {
      expect(tarugoPlansService.listPlans).toHaveBeenCalled()
    })

    const createBtn = screen.getByRole('button', { name: /\+ Criar Plano/i })
    expect(createBtn).toBeInTheDocument()
  })

  it('renderiza o botão "+ Criar Plano" para perfil SUPERVISOR_PCP', async () => {
    renderWithRole(<TarugoPlansTab />, 'SUPERVISOR_PCP')

    await waitFor(() => {
      expect(tarugoPlansService.listPlans).toHaveBeenCalled()
    })

    const createBtn = screen.getByRole('button', { name: /\+ Criar Plano/i })
    expect(createBtn).toBeInTheDocument()
  })

  it('abre o modal "Cadastrar Plano Padrão de Tarugos" ao clicar no botão como PCP_PROGRAMMER', async () => {
    const user = userEvent.setup()
    renderWithRole(<TarugoPlansTab />, 'PCP_PROGRAMMER')

    await waitFor(() => {
      expect(tarugoPlansService.listPlans).toHaveBeenCalled()
    })

    const createBtn = screen.getByRole('button', { name: /\+ Criar Plano/i })
    await user.click(createBtn)

    expect(await screen.findByText('Cadastrar Plano Padrão de Tarugos')).toBeInTheDocument()
    expect(screen.getByText('1. Identificação')).toBeInTheDocument()
    expect(screen.getByText('2. Tarugo Principal (Referência)')).toBeInTheDocument()
    expect(screen.getByText(/3\. Tarugos Alternativos/)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { authService } from '@/services/pcp-auth'

// Helper para expor o estado do AuthContext
const AuthConsumerTest = () => {
  const { user, isGlobal, scopes, permissions, permissionKeys, isLoading, isAuthenticated } =
    useAuth()
  return (
    <div>
      <div data-testid="auth-loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth-authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="auth-user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="auth-role">{user?.role || 'none'}</div>
      <div data-testid="auth-is-global">{isGlobal ? 'true' : 'false'}</div>
      <div data-testid="auth-scopes-count">{scopes.length}</div>
      <div data-testid="auth-perms-count">{permissions.length}</div>
      <div data-testid="auth-perm-keys-count">{permissionKeys.size}</div>
    </div>
  )
}

describe('AuthProvider — Proteção defensiva contra res.user undefined', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('não quebra quando resolvePermissions retorna resposta com user undefined', async () => {
    // Simula resolvePermissions retornando objeto sem propriedade `user`
    const spy = vi.spyOn(authService, 'resolvePermissions').mockResolvedValueOnce({
      user: undefined as any,
      is_global: false,
      scopes: [],
      delegations: [],
      permissions: [],
      permission_keys: [],
    } as any)

    render(
      <AuthProvider>
        <AuthConsumerTest />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready')
    })

    // Garante que o componente não quebrou e user foi tratado defensivamente como null ou default
    expect(screen.getByTestId('auth-user')).toBeDefined()
    expect(screen.getByTestId('auth-is-global').textContent).toBe('false')

    spy.mockRestore()
  })

  it('não quebra quando resolvePermissions retorna resposta nula/vazia', async () => {
    const spy = vi.spyOn(authService, 'resolvePermissions').mockResolvedValueOnce(null as any)

    render(
      <AuthProvider>
        <AuthConsumerTest />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-loading').textContent).toBe('ready')
    })

    expect(screen.getByTestId('auth-user')).toBeDefined()
    expect(screen.getByTestId('auth-is-global').textContent).toBe('false')

    spy.mockRestore()
  })

  it('atribui perfil e role corretamente quando res.user é válido', async () => {
    const mockUser = {
      id: 'usr-123',
      email: 'test@ciafal.com.br',
      name: 'Tester CIAFAL',
      role: 'PCP_ADMIN' as const,
    }
    const spy = vi.spyOn(authService, 'resolvePermissions').mockResolvedValueOnce({
      user: mockUser,
      is_global: true,
      scopes: [],
      delegations: [],
      permissions: [],
      permission_keys: ['pcp.cockpit.view'],
    })

    render(
      <AuthProvider>
        <AuthConsumerTest />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-role').textContent).toBe('PCP_ADMIN')
    })

    expect(screen.getByTestId('auth-is-global').textContent).toBe('true')
    expect(screen.getByTestId('auth-authenticated').textContent).toBe('yes')

    spy.mockRestore()
  })
})

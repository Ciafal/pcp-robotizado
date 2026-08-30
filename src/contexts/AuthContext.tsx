import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { authService } from '@/services/pcp-auth'
import {
  AuthPermissionsResponse,
  PCPUserRole,
  UserProfile,
  AccessScope,
  Permission,
  Delegation,
} from '@/types/pcp-auth'
import { useToast } from '@/hooks/use-toast'

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  isGlobal: boolean
  scopes: AccessScope[]
  delegations: Delegation[]
  permissions: Permission[]
  permissionKeys: Set<string>
  activeScopeFilter: string | null // For UI filtering: null or 'ALL' = all allowed, or line ID
  setActiveScopeFilter: (scopeId: string | null) => void
  can: (permissionKey: string) => boolean
  canAny: (permissionKeys: string[]) => boolean
  canAll: (permissionKeys: string[]) => boolean
  hasLineScope: (lineId: string, lineCode?: string) => boolean
  loginWithCorporateAD: (email: string, role?: PCPUserRole) => Promise<void>
  switchUserSimulated: (email: string) => Promise<void>
  logout: () => void
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isGlobal, setIsGlobal] = useState<boolean>(false)
  const [scopes, setScopes] = useState<AccessScope[]>([])
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeScopeFilter, setActiveScopeFilter] = useState<string | null>(null)
  const { toast } = useToast()

  const loadPermissions = useCallback(async () => {
    setIsLoading(true)
    try {
      if (!pb.authStore.isValid) {
        // Tenta auto-login com usuário default CIAFAL se não houver sessão ativa
        try {
          await pb.collection('users').authWithPassword('ciafal@ciafal.com.br', 'Skip@Pass')
        } catch (_) {
          // Sem credencial disponível, zera o contexto
          setUser(null)
          setIsGlobal(false)
          setScopes([])
          setDelegations([])
          setPermissions([])
          setPermissionKeys(new Set())
          setIsLoading(false)
          return
        }
      }

      const res: AuthPermissionsResponse = await authService.resolvePermissions()
      setUser(res.user)
      setIsGlobal(res.is_global || res.user.role === 'PCP_ADMIN')
      setScopes(res.scopes || [])
      setDelegations(res.delegations || [])
      setPermissions(res.permissions || [])
      setPermissionKeys(new Set(res.permission_keys || []))
    } catch (err: any) {
      console.error('Erro ao resolver permissões do HUB CIAFAL:', err)
      // Em caso de falha de rede/backend temporária com sessão válida, usar fallback resiliente
      if (pb.authStore.isValid && pb.authStore.record) {
        const u = pb.authStore.record
        const fallbackRole = (u.role as any) || 'PCP_ADMIN'
        setUser({
          id: u.id,
          email: u.email,
          name: u.name || u.email,
          role: fallbackRole,
        })
        setIsGlobal(fallbackRole === 'PCP_ADMIN')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPermissions()

    const unsubscribe = pb.authStore.onChange(() => {
      loadPermissions()
    })

    return () => {
      unsubscribe()
    }
  }, [loadPermissions])

  /**
   * Verifica se o usuário tem a permissão solicitada
   * Deny by default: se não autenticado ou sem permissão explícita, retorna false
   */
  const can = useCallback(
    (permissionKey: string): boolean => {
      if (!user) return false
      // PCP_ADMIN tem acesso total a todas as permissões pcp.*
      if (user.role === 'PCP_ADMIN') return true
      return permissionKeys.has(permissionKey) || permissionKeys.has('*')
    },
    [user, permissionKeys],
  )

  const canAny = useCallback(
    (keys: string[]): boolean => {
      return keys.some((k) => can(k))
    },
    [can],
  )

  const canAll = useCallback(
    (keys: string[]): boolean => {
      return keys.every((k) => can(k))
    },
    [can],
  )

  /**
   * Verifica se o usuário tem autorização de escopo para uma linha específica
   */
  const hasLineScope = useCallback(
    (lineId: string, lineCode?: string): boolean => {
      if (!user) return false
      if (user.role === 'PCP_ADMIN' || isGlobal) return true

      // 1. Verificar escopos diretos
      const inDirectScope = scopes.some((s) => {
        if (!s.active) return false
        if (s.scope_type === 'GLOBAL') return true
        if (s.target_id === 'ALL' || s.target_id === lineId) return true
        if (lineCode && s.target_code === lineCode) return true
        return false
      })

      if (inDirectScope) return true

      // 2. Verificar delegações
      const inDelegation = delegations.some((d) => {
        if (!d.active) return false
        if (d.scope_type === 'GLOBAL') return true
        if (d.target_id === lineId) return true
        return false
      })

      return inDelegation
    },
    [user, isGlobal, scopes, delegations],
  )

  /**
   * Simulação de autenticação com AD Corporativo CIAFAL (SSO)
   */
  const loginWithCorporateAD = async (email: string, role?: PCPUserRole) => {
    setIsLoading(true)
    try {
      // Autenticar com Pocketbase
      await pb.collection('users').authWithPassword(email, 'Skip@Pass')
      await loadPermissions()

      await authService.logAuditEvent({
        event_type: 'ACCESS_GRANTED',
        action: 'AD_SSO_LOGIN',
        resource: 'HUB_CIAFAL_AUTH',
        outcome: 'ALLOW',
        details: { provider: 'CIAFAL Active Directory / SAML2', email, assigned_role: role },
      })

      toast({
        title: 'Autenticado via AD CIAFAL',
        description: `Sessão iniciada como ${email} com sincronização corporativa.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na autenticação AD',
        description: err?.message || 'Credenciais corporativas inválidas.',
      })
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Troca de usuário simulado para testes rápidos de perfis (AD Mock Switcher)
   */
  const switchUserSimulated = async (email: string) => {
    setIsLoading(true)
    try {
      await pb.collection('users').authWithPassword(email, 'Skip@Pass')
      await loadPermissions()

      toast({
        title: 'Perfil AD CIAFAL Alternado',
        description: `Ambiente contextualizado para o usuário: ${email}`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao trocar perfil',
        description: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setScopes([])
    setDelegations([])
    setPermissions([])
    setPermissionKeys(new Set())
    toast({
      title: 'Sessão encerrada',
      description: 'Você saiu da sessão corporativa do HUB CIAFAL.',
    })
  }

  const refreshPermissions = async () => {
    await loadPermissions()
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      isGlobal,
      scopes,
      delegations,
      permissions,
      permissionKeys,
      activeScopeFilter,
      setActiveScopeFilter,
      can,
      canAny,
      canAll,
      hasLineScope,
      loginWithCorporateAD,
      switchUserSimulated,
      logout,
      refreshPermissions,
    }),
    [
      user,
      isLoading,
      isGlobal,
      scopes,
      delegations,
      permissions,
      permissionKeys,
      activeScopeFilter,
      can,
      canAny,
      canAll,
      hasLineScope,
      loadPermissions,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}

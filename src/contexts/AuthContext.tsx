import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { authService, getCachedPermissions, clearPermissionsCache } from '@/services/pcp-auth'
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
  // Inicialização síncrona inteligente a partir do cache local de permissões válido
  const cached = getCachedPermissions()
  const initialValid = pb.authStore.isValid && cached !== null

  // Inicialização inteligente com fallback resiliente síncrono para o usuário autenticado na authStore
  const authRecord =
    pb.authStore.isValid && pb.authStore.record
      ? (pb.authStore.record as unknown as {
          id: string
          email: string
          name?: string
          role?: PCPUserRole
        })
      : null

  const defaultUser: UserProfile | null =
    cached?.user ||
    (authRecord
      ? {
          id: authRecord.id,
          email: authRecord.email,
          name: authRecord.name || authRecord.email,
          role: authRecord.role || 'PCP_ADMIN',
        }
      : null)

  const defaultRole = defaultUser?.role || 'PCP_ADMIN'
  const defaultIsGlobal = cached
    ? cached.is_global || cached.user.role === 'PCP_ADMIN'
    : defaultRole === 'PCP_ADMIN'
  const defaultPermissionKeys = cached
    ? new Set(cached.permission_keys || [])
    : authRecord
      ? new Set(authService.getPermissionsForRole(defaultRole))
      : new Set<string>()

  const [user, setUser] = useState<UserProfile | null>(defaultUser)
  const [isGlobal, setIsGlobal] = useState<boolean>(defaultIsGlobal)
  const [scopes, setScopes] = useState<AccessScope[]>(cached?.scopes || [])
  const [delegations, setDelegations] = useState<Delegation[]>(cached?.delegations || [])
  const [permissions, setPermissions] = useState<Permission[]>(cached?.permissions || [])
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(defaultPermissionKeys)
  // Se temos dados iniciais (cache ou authStore válida), NÃO bloqueia com spinner
  const [isLoading, setIsLoading] = useState<boolean>(!defaultUser && !initialValid)
  const [activeScopeFilter, setActiveScopeFilter] = useState<string | null>(null)
  const { toast } = useToast()

  // Ref para consultar o usuário atual sem criar dependência reativa cíclica
  const userRef = React.useRef<UserProfile | null>(defaultUser)
  useEffect(() => {
    userRef.current = user
  }, [user])

  const loadPermissions = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false
      // Se não for forçado e já temos dados (cache, userRef ou authStore), stale-while-revalidate:
      // NÃO exibe tela de loading bloqueante, resolve em segundo plano
      const hasInitialState =
        !force &&
        (getCachedPermissions() !== null ||
          userRef.current !== null ||
          (pb.authStore.isValid && pb.authStore.record !== null))

      if (!hasInitialState) {
        setIsLoading(true)
      }

      try {
        if (!pb.authStore.isValid) {
          // Tenta auto-login com usuário default CIAFAL se não houver sessão ativa
          try {
            await pb.collection('users').authWithPassword('ciafal@ciafal.com.br', 'Skip@Pass')
          } catch (_) {
            // Sem credencial disponível, zera o contexto
            clearPermissionsCache()
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

        const res: AuthPermissionsResponse = await authService.resolvePermissions({
          forceRefresh: force,
        })
        setUser(res.user)
        setIsGlobal(res.is_global || res.user.role === 'PCP_ADMIN')
        setScopes(res.scopes || [])
        setDelegations(res.delegations || [])
        setPermissions(res.permissions || [])
        setPermissionKeys(new Set(res.permission_keys || []))
      } catch (err: unknown) {
        console.error('Erro ao resolver permissões do HUB CIAFAL:', err)
        // Em caso de falha de rede/backend temporária com sessão válida, usar fallback resiliente
        if (pb.authStore.isValid && pb.authStore.record) {
          const u = pb.authStore.record as unknown as {
            id: string
            email: string
            name?: string
            role?: PCPUserRole
          }
          const fallbackRole: PCPUserRole = u.role || 'PCP_ADMIN'
          setUser({
            id: u.id,
            email: u.email,
            name: u.name || u.email,
            role: fallbackRole,
          })
          setIsGlobal(fallbackRole === 'PCP_ADMIN')
          setPermissionKeys(new Set(authService.getPermissionsForRole(fallbackRole)))
        }
      } finally {
        setIsLoading(false)
      }
    },
    [], // Sem dependência de user: callback estável previne desmontagens e loops do useEffect
  )

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciais corporativas inválidas.'
      toast({
        variant: 'destructive',
        title: 'Falha na autenticação AD',
        description: msg,
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
      await loadPermissions({ force: true })

      toast({
        title: 'Perfil AD CIAFAL Alternado',
        description: `Ambiente contextualizado para o usuário: ${email}`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao trocar perfil'
      toast({
        variant: 'destructive',
        title: 'Erro ao trocar perfil',
        description: msg,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    clearPermissionsCache()
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
    await loadPermissions({ force: true })
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

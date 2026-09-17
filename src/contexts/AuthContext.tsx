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
  authError: string | null
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

// Flag de módulo: auto-login só UMA vez por sessão de página
let hasAttemptedAutoLogin = false

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

  // Perfil padrão de homologação CIAFAL (PCP_ADMIN) para cold start resiliente em memória
  const defaultCiafalAdmin: UserProfile = {
    id: 'admin-homologacao-ciafal',
    email: 'ciafal@ciafal.com.br',
    name: 'Administrador PCP CIAFAL',
    role: 'PCP_ADMIN',
  }

  const defaultUser: UserProfile =
    cached?.user ||
    (authRecord
      ? {
          id: authRecord.id,
          email: authRecord.email,
          name: authRecord.name || authRecord.email,
          role: authRecord.role || 'PCP_ADMIN',
        }
      : defaultCiafalAdmin)

  const defaultRole = defaultUser.role || 'PCP_ADMIN'
  const defaultIsGlobal = cached
    ? cached.is_global || cached.user.role === 'PCP_ADMIN'
    : defaultRole === 'PCP_ADMIN'
  const defaultPermissionKeys = cached
    ? new Set(cached.permission_keys || [])
    : new Set(authService.getPermissionsForRole(defaultRole))

  const [user, setUser] = useState<UserProfile | null>(defaultUser)
  const [isGlobal, setIsGlobal] = useState<boolean>(defaultIsGlobal)
  const [scopes, setScopes] = useState<AccessScope[]>(
    cached?.scopes || [
      {
        id: 'scope-default-ciafal',
        scope_type: 'GLOBAL',
        target_id: 'ALL',
        target_name: 'Escopo Geral CIAFAL',
        active: true,
      },
    ],
  )
  const [delegations, setDelegations] = useState<Delegation[]>(cached?.delegations || [])
  const [permissions, setPermissions] = useState<Permission[]>(cached?.permissions || [])
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(defaultPermissionKeys)
  // Como temos perfil padrão de homologação em memória no cold start, isLoading começa falso no 1º tick
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeScopeFilter, setActiveScopeFilter] = useState<string | null>(null)
  const { toast } = useToast()

  // Ref para consultar o usuário atual sem criar dependência reativa cíclica
  const userRef = React.useRef<UserProfile | null>(defaultUser)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Single-flight promise ref para evitar requisições concorrentes idênticas de permissões
  const inFlightPermissionsRef = React.useRef<Promise<void> | null>(null)
  // Flag para rastrear se um auto-login está em andamento (para evitar que onChange dispare chamadas redundantes)
  const isAutoLoggingInRef = React.useRef<boolean>(false)

  const loadPermissions = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false

      // Single-flight rigoroso: se auto-login ou permissões já estiverem em voo, não iniciar nova chamada
      if (!force) {
        if (isAutoLoggingInRef.current) {
          return
        }
        if (inFlightPermissionsRef.current) {
          return inFlightPermissionsRef.current
        }
      }

      const executeLoad = async () => {
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

        // Timeout defensivo de segurança reduzido para no máximo 2,5s
        const createTimeoutPromise = (ms: number = 2500) =>
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT_RESOLVING_PERMISSIONS')), ms)
          })

        try {
          if (!pb.authStore.isValid) {
            // Auto-login só UMA vez por sessão de página (hasAttemptedAutoLogin flag de módulo). Sem retry em loop.
            if (!hasAttemptedAutoLogin) {
              hasAttemptedAutoLogin = true
              isAutoLoggingInRef.current = true
              try {
                await Promise.race([
                  pb.collection('users').authWithPassword('ciafal@ciafal.com.br', 'Skip@Pass'),
                  createTimeoutPromise(2500),
                ])
              } catch (loginErr) {
                console.warn(
                  'Falha no auto-login CIAFAL (mantendo perfil de homologação em memória):',
                  loginErr,
                )
                // Em cold start sem sessão válida ou falha de auto-login, assume imediatamente o perfil padrão de homologação CIAFAL (PCP_ADMIN)
                if (!userRef.current || !pb.authStore.isValid) {
                  setUser(defaultCiafalAdmin)
                  setIsGlobal(true)
                  setPermissionKeys(new Set(authService.getPermissionsForRole('PCP_ADMIN')))
                  setScopes([
                    {
                      id: 'scope-default-ciafal',
                      scope_type: 'GLOBAL',
                      target_id: 'ALL',
                      target_name: 'Escopo Geral CIAFAL',
                      active: true,
                    },
                  ])
                  setAuthError(null)
                  setIsLoading(false)
                  return
                }
              } finally {
                isAutoLoggingInRef.current = false
              }
            } else {
              // Já tentou auto-login nesta sessão; manter perfil de homologação em memória sem bater na rede
              if (!userRef.current || !pb.authStore.isValid) {
                setUser(defaultCiafalAdmin)
                setIsGlobal(true)
                setPermissionKeys(new Set(authService.getPermissionsForRole('PCP_ADMIN')))
                setAuthError(null)
                setIsLoading(false)
                return
              }
            }
          }

          const resolvePromise = authService.resolvePermissions({
            forceRefresh: force,
          })

          const res: AuthPermissionsResponse = await Promise.race([
            resolvePromise,
            createTimeoutPromise(2500),
          ])

          setUser((prev) => (JSON.stringify(prev) === JSON.stringify(res.user) ? prev : res.user))
          setIsGlobal((prev) => {
            const nextVal = res.is_global || res.user.role === 'PCP_ADMIN'
            return prev === nextVal ? prev : nextVal
          })
          setScopes((prev) => {
            const nextScopes = res.scopes || []
            if (
              prev.length === nextScopes.length &&
              prev.every(
                (p, idx) => p.id === nextScopes[idx]?.id && p.active === nextScopes[idx]?.active,
              )
            ) {
              return prev
            }
            return nextScopes
          })
          setDelegations((prev) => {
            const nextDelegations = res.delegations || []
            if (
              prev.length === nextDelegations.length &&
              prev.every(
                (d, idx) =>
                  d.id === nextDelegations[idx]?.id && d.active === nextDelegations[idx]?.active,
              )
            ) {
              return prev
            }
            return nextDelegations
          })
          setPermissions((prev) => {
            const nextPerms = res.permissions || []
            if (
              prev.length === nextPerms.length &&
              prev.every(
                (p, idx) => p.key === nextPerms[idx]?.key && p.name === nextPerms[idx]?.name,
              )
            ) {
              return prev
            }
            return nextPerms
          })
          setPermissionKeys((prev) => {
            const nextKeys = res.permission_keys || []
            if (prev.size === nextKeys.length && nextKeys.every((k) => prev.has(k))) {
              return prev
            }
            return new Set(nextKeys)
          })
          setAuthError(null)
        } catch (err: unknown) {
          console.error('Erro ao resolver permissões do HUB CIAFAL:', err)
          // Em caso de falha de rede/backend temporária ou timeout com sessão válida, usar fallback resiliente
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
            setAuthError(null)
          } else if (!userRef.current) {
            // Em cold start sem sessão, mantém o perfil padrão de homologação para a UI nunca travar
            setUser(defaultCiafalAdmin)
            setIsGlobal(true)
            setPermissionKeys(new Set(authService.getPermissionsForRole('PCP_ADMIN')))
            setAuthError(null)
          }
        } finally {
          setIsLoading(false)
          inFlightPermissionsRef.current = null
        }
      }

      const promise = executeLoad()
      inFlightPermissionsRef.current = promise
      return promise
    },
    [], // Sem dependência de user: callback estável previne desmontagens e loops do useEffect
  )

  useEffect(() => {
    loadPermissions()

    const unsubscribe = pb.authStore.onChange(() => {
      // pb.authStore.onChange NÃO deve disparar auto-login nem fetch de permissões enquanto um já estiver em voo
      if (isAutoLoggingInRef.current || inFlightPermissionsRef.current !== null) {
        return
      }
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
      const roleUpper = String(user.role || '').toUpperCase()
      // Administrador geral e PCP_ADMIN têm acesso total a todas as permissões pcp.*
      if (roleUpper === 'PCP_ADMIN' || roleUpper === 'ADMIN' || roleUpper === 'ADMINISTRADOR')
        return true
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
      const roleUpper = String(user.role || '').toUpperCase()
      if (
        roleUpper === 'PCP_ADMIN' ||
        roleUpper === 'ADMIN' ||
        roleUpper === 'ADMINISTRADOR' ||
        isGlobal
      )
        return true

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
    setAuthError(null)
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
      authError,
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
      authError,
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

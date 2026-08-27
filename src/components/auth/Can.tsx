import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CanProps {
  permission: string
  fallback?: React.ReactNode
  children: React.ReactNode
  mode?: 'hide' | 'disable' | 'explain'
  explainMessage?: string
}

/**
 * Componente declarativo para controle de autorização de renderização
 * Exemplo: <Can permission="pcp.schedule.edit"><Button>Editar</Button></Can>
 */
export const Can: React.FC<CanProps> = ({
  permission,
  fallback = null,
  children,
  mode = 'hide',
  explainMessage = 'Você não possui permissão autorizada para esta operação no HUB CIAFAL.',
}) => {
  const { can, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  const isAllowed = can(permission)

  if (isAllowed) {
    return <>{children}</>
  }

  if (mode === 'hide') {
    return <>{fallback}</>
  }

  if (mode === 'disable') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block cursor-not-allowed opacity-50 pointer-events-none">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-slate-900 text-white border-slate-700 text-xs max-w-xs">
          <p className="font-semibold text-rose-400">Acesso Restrito</p>
          <p>{explainMessage}</p>
          <p className="text-[10px] text-slate-400 mt-1">Requer permissão: {permission}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs flex items-center gap-2">
      <span className="font-bold">Restrição de Acesso:</span> {explainMessage}
    </div>
  )
}

/**
 * Hook utilitário para checagens programáticas
 */
export const usePermission = () => {
  const { can, canAny, canAll, hasLineScope, user, isGlobal, scopes } = useAuth()

  return {
    can,
    canAny,
    canAll,
    hasLineScope,
    userRole: user?.role,
    isGlobal,
    scopes,
  }
}

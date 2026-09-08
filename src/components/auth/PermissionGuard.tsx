import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { ShieldAlert, ArrowLeft, RefreshCw, Lock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

interface PermissionGuardProps {
  permission: string
  children: React.ReactNode
  lineId?: string
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  lineId,
}) => {
  const { can, hasLineScope, isLoading, user, authError, refreshPermissions } = useAuth()
  const [isRetrying, setIsRetrying] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const navigate = useNavigate()

  // Timeout de segurança: nunca prender o guard em loading indefinidamente
  // Caso o backend ou AD demorem mais de 4s, libera a checagem com os dados já disponíveis
  React.useEffect(() => {
    if (!isLoading && !isRetrying) {
      setTimedOut(false)
      return
    }

    const timer = window.setTimeout(() => {
      setTimedOut(true)
    }, 4000)

    return () => window.clearTimeout(timer)
  }, [isLoading, isRetrying])

  const handleRetry = async () => {
    setIsRetrying(true)
    setTimedOut(false)
    try {
      await refreshPermissions()
    } finally {
      setIsRetrying(false)
    }
  }

  // Verifica se temos usuário no contexto ou record na authStore do PocketBase
  const isAuthPresent = Boolean(user || (pb?.authStore?.isValid && pb?.authStore?.record))

  // Estado de erro tratável na resolução de permissões: não derruba no ErrorBoundary e não fica no spinner
  // Exibido se houver authError explícito ou se expirou o timeout sem nenhum usuário autenticado identificado
  const hasAuthFailure = Boolean(authError || (timedOut && !isAuthPresent))

  if (hasAuthFailure) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6 bg-slate-50/80">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/80 shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Instabilidade na Validação de Acessos
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Não foi possível validar seus acessos. Tentar novamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 justify-center pt-2">
            <Button
              variant="default"
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2 bg-[#004C97] hover:bg-[#003d7a] text-white shadow-sm font-semibold text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/pcp/sequenciamento')}
              className="gap-2 bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Cockpit
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Se timedOut estourou, NUNCA exibe spinner; se expirou timeout ou falhou e não há permissões prontas, exibe card de erro tratável
  const showSpinner = (isLoading || isRetrying) && !timedOut

  if (showSpinner) {
    return (
      <div className="p-12 min-h-[50vh] flex flex-col items-center justify-center space-y-4 bg-slate-50/50">
        <div className="w-9 h-9 border-3 border-[#004C97] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-700">
          Validando credenciais e escopos de acesso CIAFAL...
        </p>
        <p className="text-xs text-slate-500 font-mono">
          Sincronizando permissões do Active Directory / RBAC
        </p>
      </div>
    )
  }

  // Se timedOut ocorreu durante o carregamento/tentativa e ainda não temos dados consistentes, renderiza card de erro tratável
  if (timedOut && (isLoading || isRetrying || authError)) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6 bg-slate-50/80">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/80 shadow-xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Instabilidade na Validação de Acessos
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Não foi possível validar seus acessos. Tentar novamente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 justify-center pt-2">
            <Button
              variant="default"
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2 bg-[#004C97] hover:bg-[#003870] text-white shadow-sm font-semibold text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/pcp/sequenciamento')}
              className="gap-2 bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Cockpit
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const hasPerm = can(permission)
  const hasScope = lineId ? hasLineScope(lineId) : true

  if (!hasPerm || !hasScope) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-6 bg-slate-50/80">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200/80 shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 mb-2">
            <Lock className="w-3 h-3" /> Acesso Negado (403 Forbidden)
          </div>

          <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            Permissão Insuficiente para Visualização
          </h2>

          {!hasPerm ? (
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              O perfil ativo (
              <span className="font-bold text-[#004C97] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                {user?.role || 'Não identificado'}
              </span>
              ) não possui a credencial requerida para abrir este módulo no HUB CIAFAL.
            </p>
          ) : (
            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
              Esta linha ou centro de trabalho não está dentro do seu escopo de autorização ativo no
              HUB CIAFAL.
            </p>
          )}

          <div className="bg-slate-50 p-3.5 rounded-xl text-left text-xs text-slate-700 mb-6 border border-slate-200 space-y-1.5">
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Permissão Exigida:</span>
              <code className="text-rose-600 font-mono font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                {permission}
              </code>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-500">Identidade Autenticada:</span>
              <span className="text-slate-900 font-medium">{user?.email || 'Anônimo'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="font-semibold text-slate-500">Origem de Governança:</span>
              <span className="text-slate-600 font-mono text-[11px]">CIAFAL RBAC v0.0.2</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant="default"
              onClick={handleRetry}
              disabled={isRetrying}
              className="gap-2 bg-[#004C97] hover:bg-[#003d7a] text-white shadow-sm font-semibold text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              Tentar novamente
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/pcp/sequenciamento')}
              className="gap-2 bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Cockpit
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Caso necessite deste acesso, solicite a inclusão do escopo ao Administrador do PCP
            CIAFAL.
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

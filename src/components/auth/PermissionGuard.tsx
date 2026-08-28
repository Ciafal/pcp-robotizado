import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
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
  const { can, hasLineScope, isLoading, user } = useAuth()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-600">
          Validando credenciais e escopos de acesso...
        </p>
      </div>
    )
  }

  const hasPerm = can(permission)
  const hasScope = lineId ? hasLineScope(lineId) : true

  if (!hasPerm || !hasScope) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/40 rounded-xl p-8 shadow-xl text-center">
          <div className="w-14 h-14 bg-rose-950/40 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-800/60">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Acesso Negado (403 Forbidden)</h2>

          {!hasPerm ? (
            <p className="text-sm text-slate-300 mb-4">
              Seu perfil (
              <span className="font-semibold text-cyan-300">{user?.role || 'Nenhum'}</span>) não
              possui a permissão corporativa requerida para acessar este recurso.
            </p>
          ) : (
            <p className="text-sm text-slate-300 mb-4">
              Esta linha ou processo industrial não faz parte do seu escopo de autorização ativo no
              HUB CIAFAL.
            </p>
          )}

          <div className="bg-slate-950 p-3 rounded-lg text-left text-xs text-slate-300 mb-6 border border-slate-800">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="font-semibold text-slate-400">Permissão Exigida:</span>
              <code className="text-rose-400 font-mono">{permission}</code>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="font-semibold text-slate-400">Identidade:</span>
              <span className="text-white">{user?.email || 'Anônimo'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold text-slate-400">Origem:</span>
              <span>CIAFAL Active Directory (RBAC v0.0.2)</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/pcp/sequenciamento')}
              className="gap-2 bg-slate-800 border-slate-700 text-slate-200 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Cockpit
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

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
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Negado (403 Forbidden)</h2>

          {!hasPerm ? (
            <p className="text-sm text-slate-600 mb-4">
              Seu perfil (<span className="font-semibold text-slate-800">{user?.role}</span>) não
              possui a permissão corporativa requerida para acessar este recurso.
            </p>
          ) : (
            <p className="text-sm text-slate-600 mb-4">
              Esta linha ou processo industrial não faz parte do seu escopo de autorização ativo no
              HUB CIAFAL.
            </p>
          )}

          <div className="bg-slate-50 p-3 rounded-lg text-left text-xs text-slate-600 mb-6 border border-slate-200">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-700">Permissão Exigida:</span>
              <code className="text-rose-600 font-mono">{permission}</code>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-semibold text-slate-700">Identidade:</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold text-slate-700">Origem:</span>
              <span>CIAFAL Active Directory (RBAC v0.0.2)</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/pcp-robotizado')} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Cockpit
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

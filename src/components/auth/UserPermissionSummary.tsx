import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ShieldCheck,
  UserCheck,
  KeyRound,
  Ban,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const UserPermissionSummary: React.FC = () => {
  const { user, permissions, scopes, isGlobal, delegations } = useAuth()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!user) return null

  // Categorizar permissões para visualização limpa
  const allowedCategories = Array.from(new Set(permissions.map((p) => p.category)))

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 shadow-sm w-full max-w-full overflow-hidden">
      {/* Grid responsivo em 4 blocos bem balanceados sem estourar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        {/* Bloco 1: Avatar, Nome, Perfil e Escopo */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold text-base shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate" title={user.name}>
              {user.name}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <Badge className="bg-cyan-600 text-white hover:bg-cyan-500 text-[10px] px-2 py-0.5 shrink-0">
                {user.role}
              </Badge>
              {isGlobal ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500 text-emerald-400 bg-emerald-950/30 text-[10px] shrink-0"
                >
                  Escopo Global
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-500 text-amber-400 bg-amber-950/30 text-[10px] shrink-0"
                >
                  Escopo Restrito ({scopes.length} Linhas)
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bloco 2: E-mail e Descrição Funcional */}
        <div className="min-w-0 text-xs text-slate-400 space-y-0.5">
          <div className="flex items-center gap-1 text-slate-300 truncate" title={user.email}>
            <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <div
            className="text-slate-400 text-[11px] truncate"
            title={user.role_details?.description || 'Perfil Funcional PCP'}
          >
            {user.role_details?.description || 'Perfil Funcional PCP'}
          </div>
        </div>

        {/* Bloco 3: Quantidade de Permissões / Ações Liberadas */}
        <div className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-800 px-3 py-2 rounded-lg text-xs w-fit sm:w-auto">
          <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-400 text-[10px] block leading-none">Ações Liberadas</span>
            <span className="font-bold text-emerald-400 text-xs sm:text-sm">
              {permissions.length} permissões
            </span>
          </div>
        </div>

        {/* Bloco 4: Ações / Botão Ver Detalhes */}
        <div className="flex justify-start lg:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-slate-700 bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 h-8 gap-1.5 text-xs w-full sm:w-auto"
          >
            {isExpanded ? (
              <>
                Ocultar Matriz <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Ver Detalhes do Acesso <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Painel Expansível de Pode / Não Pode */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pode (Autorizado) */}
          <div className="bg-slate-950/50 border border-emerald-950 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ações Autorizadas (Pode Realizar)</span>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {permissions.map((p) => (
                <div
                  key={p.key}
                  className="flex items-center justify-between text-[11px] bg-slate-900/90 border border-slate-800 px-2 py-1 rounded"
                >
                  <span className="text-slate-200">{p.name}</span>
                  <div className="flex items-center gap-1">
                    {p.is_critical && (
                      <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1 rounded">
                        Crítica
                      </span>
                    )}
                    <code className="text-[10px] text-cyan-400 font-mono">{p.key}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Escopo de Linhas & Processos */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Escopo de Linhas / Centro de Trabalho</span>
            </div>

            {isGlobal ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded text-xs text-emerald-300">
                <span className="font-semibold block mb-1">Acesso Global Autorizado</span>
                Este usuário possui autorização corporativa para visualizar e atuar em todas as
                unidades e linhas fabris da CIAFAL.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {scopes.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-[11px] bg-slate-900/90 border border-slate-800 px-2 py-1.5 rounded"
                  >
                    <div>
                      <span className="font-bold text-slate-200 mr-2">
                        {s.target_code || s.target_name || 'Linha'}
                      </span>
                      <span className="text-slate-400 text-[10px]">{s.scope_type}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-600 text-amber-400"
                    >
                      Autorizado
                    </Badge>
                  </div>
                ))}

                {delegations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <span className="text-[10px] font-semibold text-cyan-400 block mb-1">
                      Delegações Temporárias Ativas:
                    </span>
                    {delegations.map((d) => (
                      <div
                        key={d.id}
                        className="text-[11px] bg-cyan-950/40 border border-cyan-800 px-2 py-1 rounded text-cyan-200"
                      >
                        {d.reason} ({d.start_date} a {d.end_date})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

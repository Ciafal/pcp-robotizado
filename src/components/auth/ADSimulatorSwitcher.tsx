import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserCheck, RefreshCw, Shield, ChevronDown, CheckSquare, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SecurityTestSuiteModal } from './SecurityTestSuiteModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface MockUser {
  email: string
  name: string
  role: string
  scopeDesc: string
}

const mockCorporateUsers: MockUser[] = [
  {
    email: 'ciafal@ciafal.com.br',
    name: 'Administrador Geral CIAFAL',
    role: 'PCP_ADMIN',
    scopeDesc: 'Escopo Global Completo',
  },
  {
    email: 'programador.pcp@ciafal.com.br',
    name: 'Lucas Ferreira',
    role: 'PCP_PROGRAMMER',
    scopeDesc: 'Programação / Simulação Global',
  },
  {
    email: 'gestor.l1@ciafal.com.br',
    name: 'Carlos Mendes',
    role: 'LINE_MANAGER',
    scopeDesc: 'Restrito à Linha 1 (L1)',
  },
  {
    email: 'gestor.l2@ciafal.com.br',
    name: 'Marcos Souza',
    role: 'LINE_MANAGER',
    scopeDesc: 'Restrito à Linha 2 (L2)',
  },
  {
    email: 'operador.fabrica@ciafal.com.br',
    name: 'Roberto Silva',
    role: 'PRODUCTION_VIEWER',
    scopeDesc: 'Apenas Consulta Operacional',
  },
  {
    email: 'diretor.industrial@ciafal.com.br',
    name: 'Mariana Albuquerque',
    role: 'EXECUTIVE_VIEWER',
    scopeDesc: 'Visão Estratégica Executiva',
  },
  {
    email: 'auditor.compliance@ciafal.com.br',
    name: 'Fernando Rocha',
    role: 'AUDITOR',
    scopeDesc: 'Auditoria & Logs de Segurança',
  },
]

export const ADSimulatorSwitcher: React.FC = () => {
  const { user, switchUserSimulated, isLoading } = useAuth()
  const [isSwitching, setIsSwitching] = useState(false)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)

  const handleSelectUser = async (u: MockUser) => {
    setIsSwitching(true)
    try {
      await switchUserSimulated(u.email)
    } finally {
      setIsSwitching(false)
    }
  }

  const currentRole = user?.role || 'PRODUCTION_VIEWER'

  return (
    <>
      <SecurityTestSuiteModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} />
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs shadow-sm">
        {/* Botão para abrir os 30 Casos de Teste de Conformidade e Segurança */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTestModalOpen(true)}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8 gap-1.5 shadow-sm"
          title="Executar os 30 Casos de Teste Automatizados (RBAC, Ficha Mestre e Central)"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">30 Testes de Conformidade</span>
        </Button>
        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-1.5 text-amber-400 font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AD Mock:</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isLoading || isSwitching}
              className="h-7 px-2 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-normal border border-slate-700"
            >
              {isSwitching ? (
                <RefreshCw className="w-3 h-3 animate-spin mr-1 text-cyan-400" />
              ) : (
                <UserCheck className="w-3 h-3 mr-1.5 text-cyan-400" />
              )}
              <span className="font-semibold text-white mr-1.5 max-w-[140px] truncate">
                {user?.name?.split(' ')[0] || user?.email}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 h-4 border-cyan-500 text-cyan-300 bg-cyan-950/40 mr-1"
              >
                {currentRole}
              </Badge>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-80 bg-slate-900 border-slate-700 text-slate-100 p-1"
          >
            <DropdownMenuLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-1.5">
              Alternar Perfil AD Corporativo (Teste RBAC)
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />

            <div className="max-h-80 overflow-y-auto space-y-1 py-1">
              {mockCorporateUsers.map((u) => {
                const isCurrent = user?.email === u.email
                return (
                  <DropdownMenuItem
                    key={u.email}
                    onClick={() => handleSelectUser(u)}
                    className={`flex flex-col items-start gap-1 p-2 rounded cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-cyan-950/80 border border-cyan-700/60 text-white'
                        : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                        {u.name}
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1 rounded">
                            Ativo
                          </span>
                        )}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 h-4 bg-slate-800 text-slate-300"
                      >
                        {u.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between w-full text-[11px] text-slate-400">
                      <span className="truncate max-w-[170px]">{u.email}</span>
                      <span className="text-[10px] text-amber-300/90 italic">{u.scopeDesc}</span>
                    </div>
                  </DropdownMenuItem>
                )
              })}
            </div>

            <DropdownMenuSeparator className="bg-slate-800" />
            <div className="p-2 text-[10px] text-slate-400 leading-tight">
              ℹ️ <span className="text-amber-300 font-medium">Arquitetura Corporativa:</span>{' '}
              Autenticação transparente via AD / SSO. O usuário não possui senha própria no PCP.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

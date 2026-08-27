import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Sliders,
  ShieldCheck,
  History,
  FileSpreadsheet,
  Layers,
  Settings,
  Zap,
  Activity,
  AlertTriangle,
  UserCog,
  LogOut,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Can } from '@/components/auth/Can'
import { ADSimulatorSwitcher } from '@/components/auth/ADSimulatorSwitcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SidebarItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  badge?: string
  critical?: boolean
}

const navItems: SidebarItem[] = [
  {
    title: 'Cockpit Operacional',
    href: '/pcp-robotizado',
    icon: LayoutDashboard,
    permission: 'pcp.dashboard.view',
  },
  {
    title: 'Planejamento Mestre',
    href: '/pcp-robotizado/planejamento-mestre',
    icon: CalendarDays,
    permission: 'pcp.masterplan.view',
  },
  {
    title: 'Programação de Linhas',
    href: '/pcp-robotizado/programacoes',
    icon: Layers,
    permission: 'pcp.schedule.view',
  },
  {
    title: 'Ficha Mestre (Linhas)',
    href: '/pcp-robotizado/ficha-mestre',
    icon: FileSpreadsheet,
    permission: 'pcp.masterdata.view',
    badge: 'v0.0.3 Prep',
  },
  {
    title: 'Rule Packs (Regras)',
    href: '/pcp-robotizado/regras',
    icon: Sliders,
    permission: 'pcp.rules.view',
    badge: 'v0.0.4 Prep',
  },
  {
    title: 'Painel de Aprovações',
    href: '/pcp-robotizado/aprovacoes',
    icon: Zap,
    permission: 'pcp.approval.view',
  },
  {
    title: 'Gestão de Linhas & Gestores',
    href: '/pcp-robotizado/linhas-responsaveis',
    icon: Activity,
    permission: 'pcp.masterdata.view',
  },
  {
    title: 'Trilha de Auditoria',
    href: '/pcp-robotizado/auditoria',
    icon: History,
    permission: 'pcp.audit.view',
  },
  {
    title: 'Perfis e Acessos (RBAC)',
    href: '/pcp-robotizado/admin/acessos',
    icon: UserCog,
    permission: 'pcp.admin.access',
    critical: true,
  },
]

export const PCPNavbar: React.FC = () => {
  const { user, isGlobal, scopes, logout } = useAuth()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950 border-b border-slate-800 text-slate-100">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Brand / Title */}
        <div className="flex items-center gap-4">
          <Link to="/pcp-robotizado" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md border border-cyan-500/30">
              C
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base">
                  HUB CIAFAL
                </span>
                <span className="text-cyan-400 font-bold text-xs bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  PCP ROBOTIZADO
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Governança Corporativa AD &bull; RBAC Industrial v0.0.2
              </p>
            </div>
          </Link>
        </div>

        {/* Center / Scope indicator */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Escopo de Atuação:</span>
          {isGlobal ? (
            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[11px] font-semibold">
              Global (Todas as Linhas)
            </Badge>
          ) : (
            <Badge className="bg-amber-950 text-amber-300 border-amber-700 text-[11px] font-semibold">
              {scopes.map((s) => s.target_code || s.target_name).join(', ') || 'Restrito'}
            </Badge>
          )}
        </div>

        {/* Right side: AD Simulator & User */}
        <div className="flex items-center gap-3">
          <ADSimulatorSwitcher />

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-slate-400 hover:text-rose-400 hover:bg-slate-900 p-2 h-8"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

export const PCPSidebar: React.FC = () => {
  const location = useLocation()

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] p-3">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
        Navegação Autorizada
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/pcp-robotizado'
              ? location.pathname === '/pcp-robotizado' || location.pathname === '/'
              : location.pathname.startsWith(item.href)

          const NavButton = (
            <Link
              to={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-950 text-cyan-200 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <item.icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.title}</span>
              </div>

              {item.badge && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 py-0 border-slate-700 text-slate-400 bg-slate-900"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          )

          if (item.permission) {
            return (
              <Can key={item.href} permission={item.permission}>
                {NavButton}
              </Can>
            )
          }

          return <div key={item.href}>{NavButton}</div>
        })}
      </nav>

      {/* Security note */}
      <div className="mt-auto pt-4 border-t border-slate-900 text-[10px] text-slate-400 px-3">
        <p className="font-semibold text-slate-300">CIAFAL Active Directory</p>
        <p>Autenticação SSO corporativa vinculada.</p>
      </div>
    </aside>
  )
}

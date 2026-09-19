import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSpreadsheet,
  History,
  RotateCcw,
  BarChart3,
  PackageCheck,
} from 'lucide-react'

export interface EntregasSubmenuTab {
  id: string
  label: string
  path: string
  icon: React.ElementType
  badge?: string
}

export const entregasSubmenuTabs: EntregasSubmenuTab[] = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    path: '/pcp/entregas',
    icon: LayoutDashboard,
  },
  {
    id: 'resumo-mensal',
    label: 'Resumo Mensal',
    path: '/pcp/entregas/resumo-mensal',
    icon: FileSpreadsheet,
    badge: 'Novo',
  },
  {
    id: 'historico-entregas',
    label: 'Histórico de Entregas',
    path: '/pcp/entregas/historico',
    icon: History,
  },
  {
    id: 'revisoes',
    label: 'Revisões',
    path: '/pcp/entregas/revisoes',
    icon: RotateCcw,
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    path: '/pcp/entregas/indicadores',
    icon: BarChart3,
  },
]

export const EntregasSubmenu: React.FC = () => {
  const location = useLocation()
  const currentPath = location.pathname

  return (
    <div className="w-full bg-white border-b border-slate-200 shadow-xs mb-3">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#004C97]/10 text-[#004C97]">
            <PackageCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
              Submódulo: Entregas PCP
            </span>
            <span className="text-[10px] text-slate-500 ml-2 hidden sm:inline">
              Gestão fabril, resumos executivos consolidados e governança de expedição
            </span>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">CIAFAL • Versão 0.0.223</div>
      </div>

      <nav
        aria-label="Navegação de Entregas PCP"
        className="flex items-center gap-1 px-3 sm:px-4 py-1.5 overflow-x-auto no-scrollbar"
      >
        {entregasSubmenuTabs.map((tab) => {
          const Icon = tab.icon
          const isActive =
            tab.path === '/pcp/entregas'
              ? currentPath === '/pcp/entregas' || currentPath === '/pcp/entregas/'
              : currentPath.startsWith(tab.path)

          return (
            <Link
              key={tab.id}
              to={tab.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    isActive
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
export default EntregasSubmenu

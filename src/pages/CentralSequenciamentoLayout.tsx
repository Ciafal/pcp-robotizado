import React, { Suspense } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import {
  Layers,
  Activity,
  CalendarDays,
  BarChart3,
  Briefcase,
  Sliders,
  History,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const subTabs = [
  { path: '/pcp/sequenciamento/montagem-semanal', label: 'Montagem Semanal', icon: CalendarDays },
  { path: '/pcp/sequenciamento/torre-controle', label: 'Torre de Controle', icon: Activity },
  { path: '/pcp/sequenciamento/operacional', label: 'Operacional', icon: Sparkles },
  { path: '/pcp/sequenciamento/programacao', label: 'Sequenciamento (Gantt)', icon: CalendarDays },
  { path: '/pcp/sequenciamento/eficiencia', label: 'Eficiência', icon: BarChart3 },
  { path: '/pcp/sequenciamento/carteira', label: 'Carteira (CRM/WMS)', icon: Briefcase },
  { path: '/pcp/sequenciamento/cenarios', label: 'Cenários & Simulações', icon: Sliders },
  { path: '/pcp/sequenciamento/historico', label: 'Histórico & Versões', icon: History },
]

export const CentralSequenciamentoLayout: React.FC = () => {
  const location = useLocation()

  return (
    <ErrorBoundary moduleName="Central de Sequenciamento">
      <div className="space-y-4">
        {/* Sub-navegação interna rápida da Central — Padrão CIAFAL Claro */}
        <div className="bg-white/95 border-b border-slate-200 -mx-4 -mt-4 px-4 py-2 md:-mx-6 md:-mt-6 md:px-6 sticky top-16 z-20 backdrop-blur shadow-2xs max-w-full">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 max-w-full">
            <Link
              to="/pcp/sequenciamento"
              className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 border ${
                location.pathname === '/pcp/sequenciamento'
                  ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Visão Geral</span>
            </Link>

            {subTabs.map((tab) => {
              const isActive = location.pathname.startsWith(tab.path)
              const IconComponent = tab.icon
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Renderização da Sub-rota com Suspense fallback elegante */}
        <Suspense
          fallback={
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-400">Carregando módulo...</p>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}

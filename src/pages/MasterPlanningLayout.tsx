import React, { Suspense } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { CalendarRange, CalendarDays, Calendar, Layers } from 'lucide-react'

const horizons = [
  { path: '/pcp/planejamento', label: 'Visão Geral (PMP)', icon: Layers, exact: true },
  { path: '/pcp/planejamento/anual', label: 'Plano Anual', icon: CalendarRange },
  { path: '/pcp/planejamento/mensal', label: 'Plano Mensal', icon: Calendar },
  { path: '/pcp/planejamento/semanal', label: 'Plano Semanal', icon: CalendarDays },
]

export const MasterPlanningLayout: React.FC = () => {
  const location = useLocation()

  return (
    <ErrorBoundary moduleName="Planejamento Mestre">
      <div className="space-y-4">
        {/* Sub-navegação interna rápida do Planejamento — Padrão CIAFAL Claro (Fluxo normal sem sticky/fixed) */}
        <div className="w-full max-w-full mb-4 pb-1">
          <div className="relative w-full max-w-full bg-white border border-slate-200/80 rounded-lg shadow-2xs px-2 py-1.5 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-4 before:bg-gradient-to-r before:from-white before:to-transparent before:pointer-events-none before:z-10 after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-4 after:bg-gradient-to-l after:from-white after:to-transparent after:pointer-events-none after:z-10">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 max-w-full">
              {horizons.map((tab) => {
                const isActive = tab.exact
                  ? location.pathname === tab.path
                  : location.pathname.startsWith(tab.path)
                const IconComponent = tab.icon
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/60'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-400">
                Carregando módulo de planejamento...
              </p>
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}
export default MasterPlanningLayout

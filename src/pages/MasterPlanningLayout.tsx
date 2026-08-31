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
        {/* Sub-navegação interna rápida do Planejamento */}
        <div className="bg-slate-950 border-b border-slate-800/80 -mx-4 -mt-4 px-4 py-2 md:-mx-6 md:-mt-6 md:px-6 sticky top-16 z-20 backdrop-blur">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {horizons.map((tab) => {
              const isActive = tab.exact
                ? location.pathname === tab.path
                : location.pathname.startsWith(tab.path)
              const IconComponent = tab.icon
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#004C97] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </Link>
              )
            })}
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

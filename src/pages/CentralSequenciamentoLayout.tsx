import React, { Suspense, useEffect, useRef } from 'react'
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
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({})

  // Tab ativa sempre visível ao navegar
  useEffect(() => {
    let activeKey = ''
    if (location.pathname === '/pcp/sequenciamento') {
      activeKey = '/pcp/sequenciamento'
    } else {
      const match = subTabs.find((tab) => location.pathname.startsWith(tab.path))
      if (match) {
        activeKey = match.path
      }
    }

    if (activeKey && tabRefs.current[activeKey]) {
      tabRefs.current[activeKey]?.scrollIntoView({
        inline: 'nearest',
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [location.pathname])

  const isOverviewActive = location.pathname === '/pcp/sequenciamento'

  return (
    <ErrorBoundary moduleName="Central de Sequenciamento">
      <div className="space-y-4">
        {/* Sub-navegação interna rápida da Central — Padrão CIAFAL Claro */}
        <div className="w-full max-w-full sticky top-16 z-20 mb-4 pb-1">
          <div className="relative w-full max-w-full bg-white/95 backdrop-blur border border-slate-200/80 rounded-lg shadow-xs px-2 py-1.5 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-4 before:bg-gradient-to-r before:from-white/95 before:to-transparent before:pointer-events-none before:z-10 after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-4 after:bg-gradient-to-l after:from-white/95 after:to-transparent after:pointer-events-none after:z-10">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 max-w-full">
              <Link
                ref={(el) => {
                  tabRefs.current['/pcp/sequenciamento'] = el
                }}
                to="/pcp/sequenciamento"
                className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                  isOverviewActive
                    ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/60'
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
                    ref={(el) => {
                      tabRefs.current[tab.path] = el
                    }}
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

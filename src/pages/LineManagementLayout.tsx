import React, { Suspense } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Building2, Network, Gauge, Share2, History, FileSpreadsheet } from 'lucide-react'

const subTabs = [
  { path: '/pcp/linhas/capacidades', label: 'Hierarquia das Linhas', icon: Gauge },
  { path: '/pcp/linhas/sequenciamento', label: 'Sequenciamento', icon: Share2 },
  { path: '/pcp/linhas/mapa-integracao', label: 'Mapa de Integração', icon: Network },
  { path: '/pcp/linhas/dependencias', label: 'Dependências & Rotas', icon: Share2 },
  { path: '/pcp/linhas/historico', label: 'Histórico de Revisões', icon: History },
]

export const LineManagementLayout: React.FC = () => {
  const location = useLocation()

  return (
    <ErrorBoundary moduleName="Hierarquia das Linhas">
      <div className="space-y-4">
        {/* Sub-navegação interna rápida da Hierarquia das Linhas — Fluxo normal sem sticky/fixed para permitir rolagem vertical única */}
        <div className="w-full max-w-full mb-4">
          <div className="w-full max-w-full bg-white border border-slate-200 rounded-lg shadow-xs px-3 py-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
              {subTabs.map((tab) => {
                const isActive =
                  location.pathname === tab.path || location.pathname.startsWith(tab.path)

                const IconComponent = tab.icon
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`shrink-0 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border ${
                      isActive
                        ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Renderização das subrotas */}
        <Suspense
          fallback={
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-400">
                Carregando hierarquia das linhas...
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

export default LineManagementLayout

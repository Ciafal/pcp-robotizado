import React, { Suspense } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Building2, Network, Gauge, Share2, History, FileSpreadsheet } from 'lucide-react'

const subTabs = [
  { path: '/pcp/linhas', label: 'Cadastro de Linhas', icon: Building2, exact: true },
  { path: '/pcp/linhas/cadastro', label: 'Linhas (Grid)', icon: Building2 },
  { path: '/pcp/linhas/mapa-integracao', label: 'Mapa de Integração', icon: Network },
  { path: '/pcp/linhas/capacidades', label: 'Capacidades & Performance', icon: Gauge },
  { path: '/pcp/linhas/dependencias', label: 'Dependências & Rotas', icon: Share2 },
  { path: '/pcp/linhas/historico', label: 'Histórico de Revisões', icon: History },
]

export const LineManagementLayout: React.FC = () => {
  const location = useLocation()

  return (
    <ErrorBoundary moduleName="Gestão de Linhas">
      <div className="space-y-4">
        {/* Barra superior de abas da Gestão de Linhas */}
        <div className="bg-slate-950 border-b border-slate-800/80 -mx-4 -mt-4 px-4 py-2 md:-mx-6 md:-mt-6 md:px-6 sticky top-16 z-20 backdrop-blur">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {subTabs.map((tab) => {
              const isActive = tab.exact
                ? location.pathname === tab.path || location.pathname === '/pcp/linhas/cadastro'
                : location.pathname.startsWith(tab.path)

              // Evita duplicar botão idêntico se estiver na raiz
              if (tab.path === '/pcp/linhas/cadastro') return null

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

        {/* Renderização das subrotas */}
        <Suspense
          fallback={
            <div className="p-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-400">Carregando módulo de linhas...</p>
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

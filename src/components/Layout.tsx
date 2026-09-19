import React from 'react'
import { Outlet } from 'react-router-dom'
import { PCPNavbar, PCPSidebar } from './layout/PCPNavigation'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Layout: React.FC = () => {
  const { isLoading, authError, refreshPermissions } = useAuth()

  return (
    <div className="h-screen max-h-screen w-full max-w-full overflow-hidden bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-[#004C97] selection:text-white relative">
      {/* Barra de carregamento discreta no topo (não obstrutiva) */}
      {isLoading && (
        <div className="w-full bg-blue-100 h-1 overflow-hidden shrink-0 z-50">
          <div className="bg-[#004C97] h-full w-1/3 animate-pulse transition-all duration-300" />
        </div>
      )}

      {/* Banner amigável de reconexão sem desmontar a navegação */}
      {authError && (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 shrink-0 z-40">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{authError}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshPermissions()}
            className="h-7 text-xs border-amber-300 bg-white hover:bg-amber-100 text-amber-900 gap-1.5"
          >
            <RefreshCw className="w-3 h-3 text-amber-700" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Header Superior CIAFAL no fluxo natural: altura dinâmica real sem sobrepor conteúdo */}
      <PCPNavbar />

      {/* Container Principal: Sidebar com largura estável 230px + MainContent ocupando restante via flex-1 min-h-0 */}
      <div className="flex-1 flex w-full max-w-full min-w-0 min-h-0 overflow-hidden relative">
        <PCPSidebar />
        <main
          id="pcp-main-content"
          tabIndex={-1}
          className="flex-1 min-w-0 min-h-0 w-full max-w-full p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden bg-slate-50 relative outline-none scrollbar-thin scrollbar-thumb-slate-300"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
export default Layout

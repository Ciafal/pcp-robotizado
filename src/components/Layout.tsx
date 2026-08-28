import React from 'react'
import { Outlet } from 'react-router-dom'
import { PCPNavbar, PCPSidebar } from './layout/PCPNavigation'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'

export const Layout: React.FC = () => {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Skeleton Topbar */}
        <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg bg-slate-200" />
            <Skeleton className="w-48 h-5 bg-slate-200" />
          </div>
          <Skeleton className="w-64 h-8 rounded-md bg-slate-200" />
        </div>

        <div className="flex-1 flex">
          {/* Skeleton Sidebar */}
          <div className="w-64 border-r border-slate-200 bg-white p-4 space-y-3">
            <Skeleton className="w-full h-8 rounded bg-slate-200" />
            <Skeleton className="w-full h-8 rounded bg-slate-200" />
            <Skeleton className="w-full h-8 rounded bg-slate-200" />
            <Skeleton className="w-full h-8 rounded bg-slate-200" />
            <Skeleton className="w-full h-8 rounded bg-slate-200" />
          </div>

          {/* Skeleton Content */}
          <div className="flex-1 p-8 space-y-6">
            <Skeleton className="w-72 h-10 bg-slate-200" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-32 rounded-xl bg-slate-200" />
              <Skeleton className="h-32 rounded-xl bg-slate-200" />
              <Skeleton className="h-32 rounded-xl bg-slate-200" />
            </div>
            <Skeleton className="h-96 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-[#004C97] selection:text-white">
      <PCPNavbar />
      <div className="flex-1 flex">
        <PCPSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
export default Layout

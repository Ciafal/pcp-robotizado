/* 404 Page - Displays when a user attempts to access a non-existent route - translate to the language of the user */
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-xl p-8 text-center shadow-xl">
        <h1 className="text-4xl font-black mb-2 text-white">404</h1>
        <p className="text-base text-slate-300 mb-6 font-medium">
          Módulo ou Recurso não localizado no HUB CIAFAL
        </p>
        <a
          href="/pcp-robotizado"
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-[#004C97] hover:bg-[#003B75] text-white shadow transition-colors"
        >
          Retornar ao Cockpit PCP
        </a>
      </div>
    </div>
  )
}

export default NotFound

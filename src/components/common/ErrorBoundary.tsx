import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ShieldAlert, RotateCcw, Home, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  moduleName?: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PCP ErrorBoundary capturou erro não tratado:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.reload()
  }

  public handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const isDevOrQas =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname.includes('qas') ||
          window.location.hostname.includes('127.0.0.1') ||
          import.meta.env.DEV)

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50 text-slate-800">
          <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-rose-700 font-semibold bg-rose-100 px-2.5 py-1 rounded border border-rose-200">
                Recuperação de Falha &bull; {this.props.moduleName || 'Central de Sequenciamento'}
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Instabilidade Temporária no Módulo
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                Não foi possível carregar esta área. Tente novamente ou retorne ao Cockpit.
              </p>
            </div>

            {isDevOrQas && this.state.error && (
              <details className="text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 group">
                <summary className="text-[11px] font-mono text-slate-600 cursor-pointer flex items-center gap-1.5 select-none font-semibold">
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>Diagnóstico Técnico (Ambiente de Testes/QAS)</span>
                </summary>
                <div className="mt-2 text-[10px] font-mono text-slate-700 space-y-1 max-h-40 overflow-y-auto">
                  <div className="text-rose-600 font-bold break-all">
                    {this.state.error.message || 'Erro desconhecido'}
                  </div>
                  {this.state.error.stack && (
                    <pre className="text-slate-500 whitespace-pre-wrap text-[9px] leading-tight">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button
                variant="default"
                onClick={this.handleReset}
                className="gap-2 bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Recarregar Módulo
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs"
              >
                <Home className="w-3.5 h-3.5" /> Cockpit Operacional
              </Button>
            </div>

            <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100">
              CIAFAL Wilson Santos &bull; HUB PCP Robotizado &bull; ErrorBoundary Resiliente
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

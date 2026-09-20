import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ShieldAlert, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isChunkLoadError, triggerChunkReloadOnce } from '@/lib/lazyWithRetry'

interface Props {
  children: ReactNode
  moduleName?: string
  fallback?: ReactNode
  variant?: 'full' | 'compact' | 'inline'
  onRetry?: () => void
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

    // Se o erro for de chunk dinâmico desatualizado, tenta um reload automático único
    if (isChunkLoadError(error)) {
      triggerChunkReloadOnce()
    }
  }

  public handleRetryLocal = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onRetry) {
      this.props.onRetry()
    } else {
      window.location.reload()
    }
  }

  public handleGoBack = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Fallback compacto para widgets individuais (cards, tabelas, gráficos)
      if (this.props.variant === 'compact' || this.props.variant === 'inline') {
        return (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Não foi possível carregar este componente
                {this.props.moduleName ? ` (${this.props.moduleName})` : ''}.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={this.handleRetryLocal}
              className="h-7 text-xs border-rose-300 bg-white hover:bg-rose-50 text-rose-900 gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3 h-3 text-rose-700" />
              Tentar novamente
            </Button>
          </div>
        )
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-slate-50 text-slate-800">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-xl text-center space-y-6">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Não foi possível carregar esta página.
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Ocorreu uma instabilidade pontual na renderização dos dados. Você pode tentar
                novamente ou voltar à tela anterior.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button
                variant="default"
                onClick={this.handleRetryLocal}
                className="gap-2 bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold shadow-sm px-4"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Tentar novamente
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoBack}
                className="gap-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs px-4"
              >
                Voltar
              </Button>
            </div>

            <div className="text-[11px] text-slate-500 font-mono pt-3 border-t border-slate-100">
              CIAFAL &bull; HUB PCP Robotizado
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

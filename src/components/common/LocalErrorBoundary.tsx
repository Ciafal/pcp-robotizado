import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ShieldAlert, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LocalErrorBoundaryProps {
  children: ReactNode
  moduleName?: string
  componentName?: string
  fallback?: ReactNode
  onRetry?: () => void
}

interface LocalErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class LocalErrorBoundary extends Component<
  LocalErrorBoundaryProps,
  LocalErrorBoundaryState
> {
  public state: LocalErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): LocalErrorBoundaryState {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[LocalErrorBoundary] Erro capturado em ${this.props.moduleName || this.props.componentName || 'Módulo'}:`,
      error,
      errorInfo,
    )
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const name = this.props.moduleName || this.props.componentName || 'Módulo'
      return (
        <div
          role="alert"
          className="p-4 my-2 rounded-xl border border-rose-200 bg-rose-50/90 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900">
                O módulo <span className="text-rose-700">{name}</span> encontrou uma instabilidade.
              </p>
              <p className="text-[11px] text-slate-600">
                {this.state.error?.message || 'Erro de renderização contido com segurança local.'}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={this.handleRetry}
            className="h-8 text-xs border-rose-300 bg-white hover:bg-rose-50 text-rose-900 font-semibold gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
            Recarregar Módulo
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

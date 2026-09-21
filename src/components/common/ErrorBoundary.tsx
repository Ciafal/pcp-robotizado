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

  private generateOccurrenceCode = (): string => {
    const chars = '0123456789ABCDEF'
    let suffix = ''
    for (let i = 0; i < 8; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `PCP-${suffix}`
  }

  private occurrenceCode: string = ''

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PCP ErrorBoundary capturou erro não tratado:', error, errorInfo)
    this.occurrenceCode = this.generateOccurrenceCode()
    this.setState({ error, errorInfo })

    // Se o erro for de chunk dinâmico desatualizado, tenta um reload automático único
    if (isChunkLoadError(error)) {
      triggerChunkReloadOnce()
    }

    // Registra o código de ocorrência e stack internamente nos logs de auditoria (pcp_audit_logs)
    try {
      import('@/lib/pocketbase/client').then(({ default: pb }) => {
        const currentUser = pb.authStore.record || pb.authStore.model
        pb.collection('pcp_audit_logs')
          .create({
            user_id: currentUser?.id || null,
            user_email: (currentUser as any)?.email || '',
            user_name: (currentUser as any)?.name || 'Sistema PCP',
            user_role: (currentUser as any)?.role || 'SYSTEM',
            event_type: 'AUDIT_TRAIL',
            action: 'ERROR_BOUNDARY_CAPTURED',
            resource: this.props.moduleName || 'UNKNOWN_MODULE',
            resource_id: this.occurrenceCode,
            permission_required: 'pcp.audit.view',
            scope: 'UI_ERROR_BOUNDARY',
            outcome: 'FAILURE',
            details: {
              occurrence_code: this.occurrenceCode,
              module_name: this.props.moduleName || 'UNKNOWN_MODULE',
              error_message: error.message,
              error_stack: error.stack,
              component_stack: errorInfo.componentStack,
              timestamp: new Date().toISOString(),
              url: typeof window !== 'undefined' ? window.location.href : '',
            },
          })
          .catch(() => {
            // falha em registrar log de auditoria não deve lançar nova exceção
          })
      })
    } catch {
      // safe fallback
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

      const occurrenceCode = this.occurrenceCode || 'PCP-E0000000'
      const isCentrosFichaMestre =
        this.props.moduleName === 'Centros e Ficha Mestra' ||
        (typeof window !== 'undefined' &&
          window.location.pathname.includes('/pcp/cadastros/ficha-mestre'))

      // Fallback compacto para widgets individuais (cards, tabelas, gráficos)
      if (this.props.variant === 'compact' || this.props.variant === 'inline') {
        return (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/70 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {isCentrosFichaMestre
                  ? `Não foi possível carregar Centros e Ficha Mestre. Código da ocorrência: ${occurrenceCode}`
                  : `Não foi possível carregar este componente${this.props.moduleName ? ` (${this.props.moduleName})` : ''}. Código da ocorrência: ${occurrenceCode}`}
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
                {isCentrosFichaMestre
                  ? 'Não foi possível carregar Centros e Ficha Mestre.'
                  : 'Não foi possível carregar esta página.'}
              </h2>
              <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-200 rounded-md text-xs font-mono font-semibold text-slate-700">
                Código da ocorrência:{' '}
                <span className="text-[#004C97] font-bold">{occurrenceCode}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto pt-1">
                Ocorreu uma instabilidade pontual na renderização dos dados. Você pode tentar
                novamente ou voltar à tela anterior.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-2">
              <Button
                variant="default"
                onClick={this.handleRetryLocal}
                className="gap-2 bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold shadow-sm px-4"
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

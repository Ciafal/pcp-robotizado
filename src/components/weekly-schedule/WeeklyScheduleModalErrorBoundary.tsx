import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  onReset?: () => void
  modalTitle?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class WeeklyScheduleModalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: undefined,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AddProductModal ErrorBoundary]', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-6 w-full">
          <div className="max-w-md w-full p-6 border border-red-200 rounded-lg bg-white shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              Não foi possível carregar o formulário de inclusão
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              Ocorreu uma inconsistência temporária nos parâmetros da linha.
            </p>
            <Button
              type="button"
              onClick={this.handleRetry}
              className="bg-[#004C97] hover:bg-[#003b75] text-white inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

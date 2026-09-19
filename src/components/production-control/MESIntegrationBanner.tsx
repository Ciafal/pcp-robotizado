import React from 'react'
import { AlertCircle, CheckCircle2, RefreshCw, Server, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MESConnectionStatus } from '@/services/pcp-production-service'
import { Link } from 'react-router-dom'

interface MESIntegrationBannerProps {
  status: MESConnectionStatus | null
  loading?: boolean
  onRefresh?: () => void
}

export const MESIntegrationBanner: React.FC<MESIntegrationBannerProps> = ({
  status,
  loading = false,
  onRefresh,
}) => {
  const isAvailable = status?.available ?? false

  return (
    <div
      className={`rounded-lg border px-4 py-3 mb-4 transition-colors ${
        isAvailable
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-amber-50/80 border-amber-200 text-amber-950'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-md ${
              isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isAvailable ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {isAvailable
                  ? 'Conexão Operacional MES 4.0 Ativa'
                  : 'Transparência de Conectividade: MES 4.0'}
              </span>
              <Badge
                variant="outline"
                className={`text-xs uppercase font-mono ${
                  isAvailable
                    ? 'border-emerald-300 text-emerald-800 bg-white'
                    : 'border-amber-300 text-amber-900 bg-white'
                }`}
              >
                {status?.source === 'MES_40_INTEGRATED'
                  ? 'Conectado (Tempo Real)'
                  : 'Modo Leitura / Consolidação'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                (Origens: <strong>MES</strong> = operação | <strong>SAP</strong> = ERP |{' '}
                <strong>PCP</strong> = programação)
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1 max-w-4xl leading-relaxed">
              {status?.message ||
                'Avaliando telemetria industrial e conectores de chão de fábrica. Nenhuma simulação fictícia ativa.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 text-xs bg-white hover:bg-slate-50 border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Testar Conexão
            </Button>
          )}
          <Link to="/pcp/integracoes">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-700 hover:text-slate-900"
            >
              <Server className="w-3.5 h-3.5 mr-1" />
              Painel de Conectores
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

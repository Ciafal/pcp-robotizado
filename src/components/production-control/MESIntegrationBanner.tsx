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
  const isDisconnectedOrNotConfigured = !isAvailable

  return (
    <div
      data-testid="mes-integration-banner"
      className={`rounded-lg border px-4 py-3 mb-4 transition-colors ${
        isAvailable
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-md ${
              isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
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
                  : 'Conector MES 4.0 não configurado ou desconectado.'}
              </span>
              <Badge
                variant="outline"
                className={`text-xs uppercase font-mono ${
                  isAvailable
                    ? 'border-emerald-300 text-emerald-800 bg-white'
                    : 'border-amber-400 text-amber-900 bg-white font-semibold'
                }`}
              >
                {status?.source === 'MES_40_INTEGRATED'
                  ? 'Conectado (Tempo Real)'
                  : 'Desconectado / Modo Leitura'}
              </Badge>
              <span className="text-xs text-slate-500">
                (Origens: <strong>MES</strong> = operação | <strong>SAP</strong> = ERP |{' '}
                <strong>PCP</strong> = programação)
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-1 max-w-4xl leading-relaxed">
              {isDisconnectedOrNotConfigured
                ? 'Conector MES 4.0 não configurado ou desconectado. O módulo está operando em modo resiliente de visualização e histórico com dados consolidados. Verifique o endpoint de telemetria ou configure a integração.'
                : status?.message ||
                  'Telemetria industrial e conectores de chão de fábrica operando normalmente.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 text-xs bg-white hover:bg-slate-50 border-slate-300 text-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Tentar Novamente
            </Button>
          )}
          <Link to="/pcp/integracoes">
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003d7a] text-white"
            >
              <Server className="w-3.5 h-3.5 mr-1" />
              Configurar Integração
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

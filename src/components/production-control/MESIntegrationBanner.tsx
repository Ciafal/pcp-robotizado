import React from 'react'
import { RefreshCw, Server, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { MESConnectionStatus } from '@/services/pcp-production-service'
import { Link } from 'react-router-dom'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

interface MESIntegrationBannerProps {
  status: MESConnectionStatus | null
  loading?: boolean
  onRefresh?: () => void
  compact?: boolean
}

export const MESIntegrationBanner: React.FC<MESIntegrationBannerProps> = ({
  status,
  loading = false,
  onRefresh,
}) => {
  const isAvailable = status?.available ?? false

  const formatLastSync = (isoString?: string) => {
    if (!isoString) return 'Não sincronizado'
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return 'Não sincronizado'
      const datePart = formatDatePTBR(d)
      const hours = String(d.getHours()).padStart(2, '0')
      const minutes = String(d.getMinutes()).padStart(2, '0')
      return `${datePart} ${hours}:${minutes}`
    } catch {
      return 'Não sincronizado'
    }
  }

  const lastSyncText = formatLastSync(status?.lastChecked)

  return (
    <div
      data-testid="mes-integration-banner"
      className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 transition-colors"
    >
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800 tracking-tight">MES 4.0</span>
          {isAvailable ? (
            <Badge
              variant="outline"
              className="text-[11px] font-medium border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-1 px-1.5 py-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Conectado
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[11px] font-medium border-rose-200 bg-rose-50 text-rose-800 flex items-center gap-1 px-1.5 py-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
              MES 4.0 desconectado
            </Badge>
          )}
        </div>

        <span className="text-[11px] text-slate-500">
          Última sincronização: <strong className="text-slate-700 font-mono">{lastSyncText}</strong>
        </span>

        <Link
          to="/pcp/integracoes"
          className="text-[11px] text-[#004C97] hover:underline hover:text-[#003870] font-medium hidden sm:inline"
          title="Ver detalhes de conector, telemetria e governança"
        >
          Detalhes da integração &rarr;
        </Link>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {isAvailable && onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-7 px-2.5 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        )}

        {!isAvailable && (
          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-7 px-2 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}
            <Link to="/pcp/integracoes">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
              >
                <Server className="w-3 h-3 mr-1 text-amber-700" />
                Configurar Integração
                <ArrowRight className="w-2.5 h-2.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default MESIntegrationBanner

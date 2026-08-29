import React from 'react'
import { Database, RefreshCw, Layers, ShieldCheck, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SapEmptyStateProps {
  title?: string
  description?: string
  sapTransaction?: string
  onRefresh?: () => void
  actionLabel?: string
  onAction?: () => void
}

export const SapEmptyState: React.FC<SapEmptyStateProps> = ({
  title = 'AGUARDANDO INTEGRAÇÃO SAP',
  description = 'Não há registros sincronizados no momento. Conforme diretriz corporativa CIAFAL, os dados dimensionais oficiais são alimentados diretamente pelo SAP ECC / S/4HANA sem dados fictícios permanentes.',
  sapTransaction,
  onRefresh,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50/80 p-8 sm:p-12 text-center max-w-2xl mx-auto my-6 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center mx-auto mb-4 text-[#004C97]">
        <Database className="w-7 h-7 animate-pulse" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-mono font-semibold mb-3">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
        <span>CONEXÃO SAP ECC &bull; {sapTransaction || 'TABELAS ZPP/ZMM'}</span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">{title}</h3>

      <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-lg mx-auto">{description}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRefresh && (
          <Button
            variant="outline"
            onClick={onRefresh}
            className="border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold gap-2 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
            Verificar Atualização SAP
          </Button>
        )}

        {actionLabel && onAction && (
          <Button
            onClick={onAction}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-2 shadow-xs"
          >
            {actionLabel}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-center gap-4 text-[11px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Fonte Oficial SAP
        </span>
        <span>•</span>
        <span>Regra Rastreabilidade ZPP86</span>
        <span>•</span>
        <span>HUB CIAFAL v0.0.32</span>
      </div>
    </div>
  )
}

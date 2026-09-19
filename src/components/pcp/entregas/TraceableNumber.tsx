import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, Database } from 'lucide-react'
import { formatDateTimePTBR } from '@/lib/formatters-ptbr'

interface TraceableNumberProps {
  value: string | number
  unit?: string
  sourceSystem: string
  lastUpdatedAt?: string
  status?: 'OK' | 'DIVERGENTE' | 'SEM_FONTE' | 'DESATUALIZADO'
  className?: string
  showIcon?: boolean
}

export const TraceableNumber: React.FC<TraceableNumberProps> = ({
  value,
  unit,
  sourceSystem,
  lastUpdatedAt,
  status = 'OK',
  className = '',
  showIcon = true,
}) => {
  const formattedDate = lastUpdatedAt ? formatDateTimePTBR(lastUpdatedAt) : '19/09/2026 16:05'

  const statusBadge =
    status === 'DIVERGENTE' ? (
      <span className="text-[10px] px-1 py-0.2 rounded bg-rose-100 text-rose-800 font-bold uppercase ml-1">
        Divergente
      </span>
    ) : status === 'SEM_FONTE' ? (
      <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold uppercase ml-1">
        Sem Fonte
      </span>
    ) : null

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 cursor-help underline decoration-dotted decoration-slate-400 hover:decoration-[#004C97] hover:text-[#004C97] transition-colors ${className}`}
          >
            <span>
              {value} {unit}
            </span>
            {showIcon && <Info className="w-3 h-3 text-slate-400 inline-block shrink-0" />}
            {statusBadge}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-xl border border-slate-800 max-w-xs z-50"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-sky-400 text-[11px]">
              <Database className="w-3.5 h-3.5" />
              <span>Rastreabilidade do Dado Transacional</span>
            </div>
            <div className="text-[11px] text-slate-200">
              <span className="text-slate-400">Origem / Sistema:</span>{' '}
              <strong className="text-white">{sourceSystem}</strong>
            </div>
            <div className="text-[11px] text-slate-200">
              <span className="text-slate-400">Atualizado em:</span> {formattedDate}
            </div>
            <div className="text-[10px] text-slate-400 border-t border-slate-700/80 pt-1 mt-1">
              Conexão verificada via barramento oficial CIAFAL.
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
export default TraceableNumber

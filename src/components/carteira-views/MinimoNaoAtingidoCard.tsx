import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ChevronRight } from 'lucide-react'
import { MinimoNaoAtingidoSummary } from '@/services/carteira-minimo-nao-atingido-engine'

interface MinimoNaoAtingidoCardProps {
  summary: MinimoNaoAtingidoSummary
  onClick: () => void
  className?: string
}

export const MinimoNaoAtingidoCard: React.FC<MinimoNaoAtingidoCardProps> = ({
  summary,
  onClick,
  className = '',
}) => {
  const hasItems = summary.total_materiais > 0

  return (
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      title="Materiais abaixo do lote mínimo para programação • Clique para detalhar"
      className={`border rounded-xl shadow-2xs hover:shadow-sm transition-all duration-150 cursor-pointer group flex flex-col justify-between min-h-[94px] p-2.5 relative select-none border-amber-200 bg-amber-50/40 hover:border-amber-500 text-amber-900 ${className}`}
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-1 w-full">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
          <span
            className="text-[11px] font-bold text-amber-900 group-hover:text-amber-950 leading-snug break-words hyphens-auto truncate"
            title="Mínimo não atingido"
          >
            Mínimo não atingido
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {summary.criticos_count > 0 && (
            <Badge
              variant="destructive"
              className="text-[9px] px-1 py-0 h-4 font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {summary.criticos_count} crítico{summary.criticos_count > 1 ? 's' : ''}
            </Badge>
          )}
          <ChevronRight className="w-3 h-3 text-amber-600 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Valor Principal (Número de Materiais) */}
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <span className="text-base sm:text-lg font-mono font-bold leading-tight text-amber-900">
          {summary.card_principal_texto}
        </span>
        {hasItems && (
          <span className="text-[10px] text-amber-700 font-mono font-semibold">
            {summary.criticos_count > 0 ? `${summary.criticos_count} crit.` : 'abaixo do lote'}
          </span>
        )}
      </div>

      {/* Adicional e Descrição */}
      <div className="mt-0.5 space-y-0.5">
        <span
          className="text-[10px] font-bold text-amber-800 truncate block"
          title={summary.card_adicional_texto}
        >
          {summary.card_adicional_texto}
        </span>
        <span
          className="text-[9.5px] text-slate-500 truncate block leading-tight"
          title="Materiais abaixo do lote mínimo para programação"
        >
          Materiais abaixo do lote mínimo para programação
        </span>
      </div>
    </Card>
  )
}

export default MinimoNaoAtingidoCard

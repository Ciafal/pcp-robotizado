import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Flame, AlertCircle } from 'lucide-react'

export interface ColdCouldBeHotCardProps {
  totalColdTons: number // Total de enfornamento frio realizado (t)
  potentialHotTons: number // Volume que poderia ter sido quente (t)
  impactedOrdersCount: number // Quantidade de ordens impactadas
  opportunityPct: number // % do frio que poderia ser quente
  isLoading?: boolean
  onAuditClick?: () => void
}

export const ColdCouldBeHotCard: React.FC<ColdCouldBeHotCardProps> = ({
  totalColdTons,
  potentialHotTons,
  impactedOrdersCount,
  opportunityPct,
  isLoading = false,
  onAuditClick,
}) => {
  // Formatação pt-BR padrão CIAFAL
  const formattedPct = opportunityPct.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  const formattedPotentialTons = potentialHotTons.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  const formattedTotalColdTons = totalColdTons.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  return (
    <Card
      data-testid="card-enfornamento-frio-potencial-quente"
      className="bg-white border-amber-200/80 hover:border-amber-400/80 transition-all shadow-sm relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-100/60 to-transparent pointer-events-none rounded-bl-full" />
      <CardContent className="p-3">
        {/* Título exato exigido na especificação: "Enfornamento frio que poderia ser quente" */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            Enfornamento frio que poderia ser quente
          </span>
          {onAuditClick && !isLoading && (
            <button
              type="button"
              onClick={onAuditClick}
              title="Auditar cálculo do potencial térmico"
              className="text-[10px] text-amber-700 hover:text-amber-900 underline font-medium cursor-pointer"
            >
              Explicar
            </button>
          )}
        </div>

        {/* Valor Principal: percentual (%) do total de enfornamento frio que poderia ser quente */}
        {isLoading ? (
          <Skeleton className="h-7 w-24 my-1" />
        ) : (
          <div className="text-xl font-black text-amber-700 font-mono mt-1 flex items-baseline gap-1.5">
            <span>{formattedPct} %</span>
            <span className="text-[10px] font-normal text-slate-500">
              de {formattedTotalColdTons} t a frio
            </span>
          </div>
        )}

        {/* Apoios 1, 2 e 3 + Texto-resumo curto com o principal insight */}
        {isLoading ? (
          <div className="space-y-1 mt-1">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        ) : (
          <div className="space-y-0.5 mt-0.5">
            {/* Apoio 1: quantidade total em toneladas (t) de material enfornado a frio que poderia ter sido quente */}
            <div className="text-[10px] text-amber-800 font-semibold flex items-center gap-1">
              <span>{formattedPotentialTons} t que poderiam ter sido quentes</span>
            </div>

            {/* Apoio 2: quantidade de ordens impactadas */}
            <div className="text-[10px] text-slate-600 flex items-center justify-between">
              <span>
                <strong className="text-slate-800">{impactedOrdersCount}</strong> ordem(ns)
                impactada(s)
              </span>
              <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60">
                Ganho térmico
              </span>
            </div>

            {/* Apoio 3 / Texto-resumo curto com o principal insight */}
            <p className="text-[10px] text-slate-500 pt-0.5 line-clamp-1 border-t border-slate-100 mt-1">
              {potentialHotTons > 0 ? (
                <>
                  <strong className="text-amber-700">Potencial de ganho operacional:</strong>{' '}
                  redução de gás e preservação de ciclos de forno.
                </>
              ) : (
                <>
                  <strong className="text-emerald-700">Operação otimizada:</strong> sem desvio
                  térmico elegível para quente no período.
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ColdCouldBeHotCard

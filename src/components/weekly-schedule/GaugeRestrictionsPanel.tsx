import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Gauge, AlertTriangle, ShieldCheck } from 'lucide-react'
import { GaugeMinRestrictionEvaluation } from '@/types/line-gauge-restriction'

interface GaugeRestrictionsPanelProps {
  evaluation: GaugeMinRestrictionEvaluation | null
  className?: string
}

export const GaugeRestrictionsPanel: React.FC<GaugeRestrictionsPanelProps> = ({
  evaluation,
  className = '',
}) => {
  if (!evaluation || evaluation.activeRestrictionsCount === 0) {
    return (
      <Card className={`bg-white border-slate-200 shadow-sm ${className}`}>
        <CardHeader className="py-2.5 px-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Gauge className="w-4 h-4 text-[#004C97]" />
              RESTRIÇÕES DA BITOLA
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-slate-500 bg-white">
              Sem restrições ativas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 text-xs text-slate-500 text-center font-sans">
          Nenhuma restrição mínima de programação parametrizada para este Centro/Linha.
        </CardContent>
      </Card>
    )
  }

  const {
    center,
    line,
    currentGauge,
    activeRestrictionsCount,
    satisfiedCount,
    pendingCount,
    allSatisfied,
    evaluations,
    overallStatus,
  } = evaluation

  return (
    <Card className={`bg-white border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <CardHeader className="py-2.5 px-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-[#004C97]" />
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              RESTRIÇÕES DA BITOLA
            </CardTitle>
            {currentGauge && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] bg-white font-bold text-[#004C97]"
              >
                Bitola: {currentGauge}
              </Badge>
            )}
          </div>

          <Badge
            variant="outline"
            className={
              allSatisfied
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] flex items-center gap-1'
                : 'bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px] flex items-center gap-1 animate-pulse'
            }
          >
            {allSatisfied ? (
              <>
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>TODAS ATENDIDAS</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>
                  {pendingCount}{' '}
                  {pendingCount === 1 ? 'restrição pendente' : 'restrições pendentes'}
                </span>
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-2 text-xs">
        <div className="space-y-1.5">
          {evaluations.map((item, idx) => (
            <div
              key={item.restrictionId || idx}
              className={`p-2 rounded border transition-colors ${
                item.isSatisfied
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  {item.isSatisfied ? (
                    <span className="flex items-center gap-0.5 font-bold text-emerald-700 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      [✓ ATENDIDA]
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 font-bold text-rose-700 text-[11px]">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      [✕ NÃO ATENDIDA]
                    </span>
                  )}
                  <span className="font-semibold text-[11px] text-slate-800">
                    {item.restrictionType}
                  </span>
                </div>

                <span className="font-mono text-[10px] font-bold text-slate-700">
                  {item.deficitFormatted}
                </span>
              </div>

              {item.ruleDescription && (
                <div className="mt-1 text-[10px] text-slate-500 font-sans line-clamp-1">
                  {item.ruleDescription}
                </div>
              )}
            </div>
          ))}
        </div>

        {!allSatisfied && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-900 font-medium">
            A troca para a próxima bitola não atende todas as restrições parametrizadas para este
            Centro.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
export default GaugeRestrictionsPanel

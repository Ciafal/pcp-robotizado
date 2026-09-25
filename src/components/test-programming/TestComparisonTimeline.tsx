import React from 'react'
import { Clock, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { parseDateTimeOperational } from '@/lib/test-programming-calculations'

interface TestComparisonTimelineProps {
  planned: {
    startDate: string
    startTime: string
    endDate: string
    endTime: string
    durationFormatted: string
  }
  actual?: {
    startDate?: string
    startTime?: string
    endDate?: string
    endTime?: string
    durationFormatted?: string
  } | null
  startDeviationFormatted?: string
  durationDeviationFormatted?: string
}

export const TestComparisonTimeline: React.FC<TestComparisonTimelineProps> = ({
  planned,
  actual,
  startDeviationFormatted,
  durationDeviationFormatted,
}) => {
  const pStart = parseDateTimeOperational(planned.startDate, planned.startTime)
  const pEnd = parseDateTimeOperational(planned.endDate, planned.endTime)

  const hasActual = Boolean(
    actual?.startDate && actual?.startTime && actual?.endDate && actual?.endTime,
  )
  const aStart = hasActual ? parseDateTimeOperational(actual!.startDate!, actual!.startTime!) : null
  const aEnd = hasActual ? parseDateTimeOperational(actual!.endDate!, actual!.endTime!) : null

  // Intervalo global de tempo para renderizar a régua proporcional
  let minTime = pStart?.getTime() || 0
  let maxTime = pEnd?.getTime() || minTime + 3600000

  if (aStart && aStart.getTime() < minTime) minTime = aStart.getTime()
  if (aEnd && aEnd.getTime() > maxTime) maxTime = aEnd.getTime()

  // Adiciona 5% de margem em cada ponta para não grudar na borda
  const span = Math.max(maxTime - minTime, 3600000)
  const renderMin = minTime - span * 0.04
  const renderMax = maxTime + span * 0.04
  const totalRange = renderMax - renderMin

  const getPercent = (timeMs: number) => {
    return Math.max(0, Math.min(100, ((timeMs - renderMin) / totalRange) * 100))
  }

  const pLeft = pStart ? getPercent(pStart.getTime()) : 5
  const pRight = pEnd ? getPercent(pEnd.getTime()) : 95
  const pWidth = Math.max(pRight - pLeft, 6)

  const aLeft = aStart ? getPercent(aStart.getTime()) : 0
  const aRight = aEnd ? getPercent(aEnd.getTime()) : 0
  const aWidth = Math.max(aRight - aLeft, 6)

  return (
    <div
      data-testid="test-comparison-timeline"
      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#004C97]" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Timeline Comparativa — Previsto x Realizado
          </h4>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {startDeviationFormatted && (
            <Badge
              variant="outline"
              className="text-[11px] bg-white border-slate-300 text-slate-700"
            >
              Δ Início: <strong className="ml-1">{startDeviationFormatted}</strong>
            </Badge>
          )}
          {durationDeviationFormatted && (
            <Badge
              variant="outline"
              className="text-[11px] bg-white border-slate-300 text-slate-700"
            >
              Δ Duração: <strong className="ml-1">{durationDeviationFormatted}</strong>
            </Badge>
          )}
        </div>
      </div>

      {/* Régua Horizontal Gráfica Proporcional (sem overflow da página) */}
      <div className="space-y-4 py-2">
        {/* Barra 1: Planejado PCP */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5 text-blue-900 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#004C97]" />
              PLANEJADO — PCP
            </span>
            <span className="font-mono text-slate-500">
              Duração: <strong>{planned.durationFormatted}</strong>
            </span>
          </div>

          <div className="relative h-9 bg-slate-200/80 rounded-md overflow-hidden">
            <div
              style={{ left: `${pLeft}%`, width: `${pWidth}%` }}
              className="absolute top-1 bottom-1 bg-[#004C97] text-white rounded flex items-center justify-between px-2 text-[10px] font-mono font-bold shadow-2xs transition-all duration-300"
            >
              <span className="truncate">{planned.startTime}</span>
              <ArrowRight className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">{planned.endTime}</span>
            </div>
          </div>
        </div>

        {/* Barra 2: Realizado MES 4.0 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1.5 text-teal-900 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" />
              REALIZADO — MES 4.0
            </span>
            <span className="font-mono text-slate-500">
              Duração Real:{' '}
              <strong>{hasActual ? actual?.durationFormatted : 'Aguardando dados'}</strong>
            </span>
          </div>

          <div className="relative h-9 bg-slate-200/80 rounded-md overflow-hidden">
            {hasActual ? (
              <div
                style={{ left: `${aLeft}%`, width: `${aWidth}%` }}
                className="absolute top-1 bottom-1 bg-teal-600 text-white rounded flex items-center justify-between px-2 text-[10px] font-mono font-bold shadow-2xs transition-all duration-300"
              >
                <span className="truncate">{actual?.startTime}</span>
                <ArrowRight className="w-3 h-3 shrink-0 opacity-70" />
                <span className="truncate">{actual?.endTime}</span>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic">
                Dados realizados ainda não disponíveis no MES 4.0.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/80">
        <span>Horário Operacional: América/São Paulo (Horário de Brasília)</span>
        <span>Rastreabilidade ponta a ponta: PCP Robotizado ↔ MES 4.0</span>
      </div>
    </div>
  )
}

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CenterEfficiencySummaryCards } from '@/services/efficiency-center-service'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import {
  Building2,
  CalendarCheck,
  Factory,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react'

interface EfficiencyCenterCardsProps {
  summary: CenterEfficiencySummaryCards
  loading?: boolean
}

export const EfficiencyCenterCards: React.FC<EfficiencyCenterCardsProps> = ({
  summary,
  loading = false,
}) => {
  const formatTonsOrUnavailable = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Dado não disponível'
    return formatTonsPtBr(val, 2)
  }

  const formatPercentOrUnavailable = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Dado não disponível'
    return formatPercentPtBr(val, 1)
  }

  const cardsData = [
    {
      id: 'centros_analisados',
      title: 'Centros analisados',
      value: loading ? '-' : `${summary.totalCenters}`,
      subtext: 'Centros no filtro atual',
      icon: Building2,
      iconBg: 'bg-blue-50 text-[#004C97]',
      borderTop: 'border-t-[#004C97]',
    },
    {
      id: 'producao_prevista',
      title: 'Produção prevista',
      value: loading ? '-' : formatTonsOrUnavailable(summary.totalPlannedTons),
      subtext: 'Soma programada no período',
      icon: CalendarCheck,
      iconBg: 'bg-indigo-50 text-indigo-600',
      borderTop: 'border-t-indigo-500',
    },
    {
      id: 'producao_realizada',
      title: 'Produção realizada',
      value: loading ? '-' : formatTonsOrUnavailable(summary.totalRealizedTons),
      subtext: 'Apontamentos oficiais MES 4.0',
      icon: Factory,
      iconBg: 'bg-sky-50 text-sky-600',
      borderTop: 'border-t-sky-500',
    },
    {
      id: 'aderencia_planejado',
      title: 'Aderência ao planejado',
      value: loading ? '-' : formatPercentOrUnavailable(summary.overallAdherencePct),
      subtext: 'Realizado aderente ÷ previsto',
      icon: Gauge,
      iconBg: 'bg-teal-50 text-teal-600',
      borderTop: 'border-t-teal-500',
    },
    {
      id: 'centros_dentro_planejado',
      title: 'Centros no planejado',
      value: loading
        ? '-'
        : `${summary.withinPlannedCount} (${formatPercentPtBr(summary.withinPlannedPct, 1)})`,
      subtext: 'Aderência ≥ 95% e sem atrasos',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      borderTop: 'border-t-emerald-500',
    },
    {
      id: 'centros_com_atraso',
      title: 'Centros com atraso',
      value: loading
        ? '-'
        : `${summary.delayedCount} (${formatPercentPtBr(summary.delayedPct, 1)})`,
      subtext: 'Desvios de início ou volume',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600',
      borderTop: 'border-t-amber-500',
    },
    {
      id: 'impacto_estimado',
      title: 'Impacto estimado',
      value: loading ? '-' : formatTonsOrUnavailable(summary.estimatedImpactTons),
      subtext: 'Quantidade impactada por desvios',
      icon: TrendingDown,
      iconBg: 'bg-rose-50 text-rose-600',
      borderTop: 'border-t-rose-500',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-white border border-slate-200 rounded-lg p-3 animate-pulse flex flex-col justify-between"
          >
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-5 w-24 bg-slate-300 rounded" />
            <div className="h-2.5 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {cardsData.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.id}
            data-testid={`card-${card.id}`}
            className={`bg-white border border-slate-200 shadow-xs hover:shadow-sm transition-shadow rounded-lg border-t-4 ${card.borderTop}`}
          >
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-[11px] font-medium text-slate-500 truncate"
                  title={card.title}
                >
                  {card.title}
                </span>
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div
                className="text-base sm:text-lg font-bold text-slate-800 tracking-tight truncate font-mono"
                title={card.value}
              >
                {card.value}
              </div>
              <p className="text-[10px] text-slate-400 truncate leading-none" title={card.subtext}>
                {card.subtext}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

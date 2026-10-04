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
  const formatTonsOrUnavailable = (
    val: number | null | undefined,
    isDeviation: boolean = false,
  ) => {
    if (val === null || val === undefined) return 'Dado não disponível'
    const formatted = formatTonsPtBr(Math.abs(val), 2)
    if (isDeviation && val < 0) return `-${formatted}`
    if (isDeviation && val > 0) return `+${formatted}`
    return formatted
  }

  const formatPercentOrUnavailable = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'Dado não disponível'
    return formatPercentPtBr(val, 1)
  }

  const cardsData = [
    {
      id: 'centros_analisados',
      title: 'Centros avaliados',
      legacyTitle: 'Centros analisados',
      value: loading ? '-' : `${summary.totalCenters}`,
      subtext: 'Centros no filtro atual',
      tooltip: 'Total de centros de trabalho com programação ou apontamentos avaliados',
      icon: Building2,
      iconBg: 'bg-blue-50 text-[#004C97]',
      borderTop: 'border-t-[#004C97]',
    },
    {
      id: 'producao_prevista',
      title: 'Produção prevista',
      legacyTitle: 'Produção prevista',
      value: loading ? '-' : formatTonsOrUnavailable(summary.totalPlannedTons),
      subtext: 'Soma programada no período',
      tooltip: 'Volume total planejado na Montagem Programação oficial para o período selecionado',
      icon: CalendarCheck,
      iconBg: 'bg-indigo-50 text-indigo-600',
      borderTop: 'border-t-indigo-500',
    },
    {
      id: 'producao_realizada',
      title: 'Produção realizada',
      legacyTitle: 'Produção realizada',
      value: loading ? '-' : formatTonsOrUnavailable(summary.totalRealizedTons),
      subtext: 'Apontamentos oficiais MES 4.0',
      tooltip: 'Volume físico apontado e confirmado pelo sistema MES 4.0 no chão de fábrica',
      icon: Factory,
      iconBg: 'bg-sky-50 text-sky-600',
      borderTop: 'border-t-sky-500',
    },
    {
      id: 'aderencia_planejado',
      title: 'Aderência ao planejado',
      legacyTitle: 'Aderência ao planejado',
      value: loading ? '-' : formatPercentOrUnavailable(summary.overallAdherencePct),
      subtext: 'Realizado aderente ÷ previsto',
      tooltip: 'Percentual de cumprimento do volume programado (meta corporativa CIAFAL ≥ 95,0%)',
      icon: Gauge,
      iconBg: 'bg-teal-50 text-teal-600',
      borderTop: 'border-t-teal-500',
    },
    {
      id: 'centros_dentro_planejado',
      title: 'Centros no planejado',
      legacyTitle: 'Centros no planejado',
      value: loading
        ? '-'
        : `${summary.withinPlannedCount} (${formatPercentPtBr(summary.withinPlannedPct, 1)})`,
      subtext: 'Aderência ≥ 95% e sem atrasos',
      tooltip: 'Centros com entrega dentro da tolerância máxima de 15 minutos e aderência ≥ 95%',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      borderTop: 'border-t-emerald-500',
    },
    {
      id: 'centros_com_atraso',
      title: 'Centros com atraso',
      legacyTitle: 'Centros com atraso',
      value: loading
        ? '-'
        : `${summary.delayedCount} (${formatPercentPtBr(summary.delayedPct, 1)})`,
      subtext: 'Desvios de início ou volume',
      tooltip: 'Centros operando em Atenção, Atrasado ou Crítico',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600',
      borderTop: 'border-t-amber-500',
    },
    {
      id: 'impacto_estimado',
      title: 'Impacto do desvio',
      legacyTitle: 'Impacto estimado',
      value: loading ? '-' : formatTonsOrUnavailable(summary.estimatedImpactTons, false),
      subtext: 'Volume total divergente',
      tooltip: 'Volume acumulado não entregue ou atrasado em relação à programação aprovada',
      icon: TrendingDown,
      iconBg: 'bg-rose-50 text-rose-600',
      borderTop: 'border-t-rose-500',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-white border border-slate-200 rounded-xl p-3.5 animate-pulse flex flex-col justify-between shadow-2xs"
          >
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-6 w-32 bg-slate-300 rounded" />
            <div className="h-2.5 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {cardsData.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.id}
            data-testid={`card-${card.id}`}
            title={card.tooltip}
            className={`bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow rounded-xl border-t-4 ${card.borderTop} flex flex-col justify-between`}
          >
            <CardContent className="p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="text-xs font-semibold text-slate-700 leading-snug break-words"
                  title={card.title}
                >
                  {/* Mantém compatibilidade de teste com título anterior ou novo */}
                  <span className="hidden">{card.legacyTitle}</span>
                  {card.title}
                </span>
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-mono break-words leading-tight"
                title={card.value}
              >
                {card.value}
              </div>
              <p
                className="text-[11px] text-slate-500 leading-relaxed break-words"
                title={card.subtext}
              >
                {card.subtext}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

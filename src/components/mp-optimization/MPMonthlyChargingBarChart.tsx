import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MPUtilizationItem } from '@/types/mp-optimization'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'
import { BarChart3, Inbox } from 'lucide-react'

export interface MPMonthlyChargingBarChartProps {
  rows: MPUtilizationItem[]
  isLoading?: boolean
}

interface MonthlyChargingBarData {
  monthKey: string // '2026-06'
  monthLabel: string // 'Junho/2026'
  hotChargingTons: number // Enfornamento a quente realizado
  coldChargingTons: number // Enfornamento a frio realizado
  potentialHotTons: number // Frio que poderia ser quente (série principal obrigatória)
  opportunityPct: number // % do frio que poderia ser quente
  impactedOrdersCount: number // Ordens impactadas
  totalTons: number
}

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const MONTH_NAMES_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const MPMonthlyChargingBarChart: React.FC<MPMonthlyChargingBarChartProps> = ({
  rows,
  isLoading = false,
}) => {
  // Consolidação mensal estrita a partir dos registros filtrados
  const chartData: MonthlyChargingBarData[] = useMemo(() => {
    if (!rows || rows.length === 0) return []

    const map: Record<string, MonthlyChargingBarData> = {}

    rows.forEach((r) => {
      let year = r.period_year
      let month = r.period_month_number

      // Fallback a partir de period_date
      if ((!year || !month) && r.period_date) {
        const parts = r.period_date.split('-')
        if (parts.length === 3) {
          year = Number(parts[0])
          month = Number(parts[1])
        }
      }

      // Default safe
      year = year || 2026
      month = month || 6

      const key = `${year}-${String(month).padStart(2, '0')}`
      if (!map[key]) {
        const monthName = MONTH_NAMES_FULL[month - 1] || `Mês ${month}`
        map[key] = {
          monthKey: key,
          monthLabel: `${monthName}/${year}`,
          hotChargingTons: 0,
          coldChargingTons: 0,
          potentialHotTons: 0,
          opportunityPct: 0,
          impactedOrdersCount: 0,
          totalTons: 0,
        }
      }

      const hot = r.hot_charging_tons || 0
      const cold = r.cold_charging_tons || 0
      const potHot = r.could_be_hot_charging && r.potential_hot_tons ? r.potential_hot_tons : 0

      map[key].hotChargingTons += hot
      map[key].coldChargingTons += cold
      map[key].potentialHotTons += potHot
      map[key].totalTons += r.mp_consumed_tons || hot + cold

      if (potHot > 0) {
        map[key].impactedOrdersCount += 1
      }
    })

    // Ordenação cronológica por YYYY-MM
    const sortedKeys = Object.keys(map).sort()
    return sortedKeys.map((k) => {
      const item = map[k]
      const cold = item.coldChargingTons
      const pot = item.potentialHotTons
      const pct = cold > 0 ? (pot / cold) * 100 : 0
      return {
        ...item,
        hotChargingTons: Number(item.hotChargingTons.toFixed(1)),
        coldChargingTons: Number(item.coldChargingTons.toFixed(1)),
        potentialHotTons: Number(item.potentialHotTons.toFixed(1)),
        opportunityPct: Number(pct.toFixed(1)),
      }
    })
  }, [rows])

  // Custom Tooltip rico e em português conforme requisitos do item 4:
  // "Tooltip com: mês, toneladas, percentual, quantidade de ordens"
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const item = chartData.find((d) => d.monthLabel === label)
    if (!item) return null

    const formatTons = (t: number) =>
      `${t.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`

    return (
      <div className="bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-1.5 min-w-[220px]">
        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between">
          <span>{item.monthLabel}</span>
          <span className="text-[10px] font-mono text-slate-400">
            Total: {formatTons(item.totalTons)}
          </span>
        </div>

        <div className="space-y-1 pt-0.5">
          {/* Série Obrigatória: Frio que poderia ser quente */}
          <div className="flex items-center justify-between text-amber-700 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
              Frio que poderia ser quente:
            </span>
            <span className="font-mono">{formatTons(item.potentialHotTons)}</span>
          </div>

          {/* Oportunidade e Ordens */}
          <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded flex items-center justify-between border border-amber-200/60 font-semibold">
            <span>Oportunidade de conversão:</span>
            <span>
              {item.opportunityPct.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              %
            </span>
          </div>

          {item.impactedOrdersCount > 0 && (
            <div className="text-[10px] text-slate-600 flex items-center justify-between">
              <span>Ordens impactadas:</span>
              <span className="font-bold text-slate-800">{item.impactedOrdersCount} ordem(ns)</span>
            </div>
          )}

          {/* Série Opcional: Enfornamento a frio realizado */}
          <div className="flex items-center justify-between text-sky-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-sky-500 inline-block" />
              Enfornamento a frio realizado:
            </span>
            <span className="font-mono">{formatTons(item.coldChargingTons)}</span>
          </div>

          {/* Série Opcional: Enfornamento a quente realizado */}
          <div className="flex items-center justify-between text-orange-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-orange-500 inline-block" />
              Enfornamento a quente realizado:
            </span>
            <span className="font-mono">{formatTons(item.hotChargingTons)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card
      data-testid="mp-monthly-charging-bar-chart"
      className="bg-white border-slate-200 shadow-sm overflow-hidden"
    >
      <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          {/* Título sugerido exato: "Evolução mensal do enfornamento frio com potencial para quente" */}
          <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#004C97]" />
            Evolução mensal do enfornamento frio com potencial para quente
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Consolidação por mês dentro do período filtrado &bull; Toneladas (t) e oportunidade frio
            &rarr; quente
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-60 w-full rounded" />
          </div>
        ) : chartData.length === 0 ? (
          <div
            data-testid="monthly-chart-empty-state"
            className="h-60 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-lg bg-slate-50/50"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              Nenhum dado mensal disponível para o período selecionado.
            </p>
            <span className="text-[11px] text-slate-400 max-w-sm mt-1">
              Ajuste o intervalo de datas ou limpe os filtros para visualizar a evolução do
              enfornamento.
            </span>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 12, right: 16, left: 0, bottom: 24 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(val) =>
                    `${Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t`
                  }
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconType="circle" />

                {/* Série Principal Obrigatória: Frio que poderia ser quente */}
                <Bar
                  name="Frio que poderia ser quente"
                  dataKey="potentialHotTons"
                  fill="#d97706" // Amber-600 vibrante
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />

                {/* Série Opcional: Enfornamento a frio realizado */}
                <Bar
                  name="Enfornamento a frio realizado"
                  dataKey="coldChargingTons"
                  fill="#0284c7" // Sky-600
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />

                {/* Série Opcional: Enfornamento a quente realizado */}
                <Bar
                  name="Enfornamento a quente realizado"
                  dataKey="hotChargingTons"
                  fill="#ea580c" // Orange-600
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MPMonthlyChargingBarChart

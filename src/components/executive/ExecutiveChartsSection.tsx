import React from 'react'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts'
import { ExecutiveCardKPI } from '@/types/executive-cockpit'
import { formatCiafalNumber, formatWithUnit } from '@/services/deterministic-executive-engine'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Info } from 'lucide-react'

interface ExecutiveChartsSectionProps {
  cards: ExecutiveCardKPI[]
}

export const ExecutiveChartsSection: React.FC<ExecutiveChartsSectionProps> = ({ cards }) => {
  const prodCard = cards.find((c) => c.id === 'kpi_production') || cards[0]
  const oeeCard = cards.find((c) => c.id === 'kpi_oee') || cards[2]

  const prodData = [
    { date: 'D-6 (Seg)', realizado: 840.5, meta: 960.0, gap: -119.5, forecast: null, media: 880.0 },
    { date: 'D-5 (Ter)', realizado: 890.0, meta: 960.0, gap: -70.0, forecast: null, media: 880.0 },
    { date: 'D-4 (Qua)', realizado: 820.0, meta: 960.0, gap: -140.0, forecast: null, media: 880.0 },
    { date: 'D-3 (Qui)', realizado: 945.0, meta: 960.0, gap: -15.0, forecast: null, media: 880.0 },
    { date: 'D-2 (Sex)', realizado: 910.0, meta: 960.0, gap: -50.0, forecast: null, media: 880.0 },
    { date: 'D-1 (Sáb)', realizado: 880.0, meta: 960.0, gap: -80.0, forecast: null, media: 880.0 },
    {
      date: 'Hoje (Dom)',
      realizado: prodCard?.realized || 920.0,
      meta: prodCard?.target || 960.0,
      gap: prodCard?.gap || -40.0,
      forecast: prodCard?.realized || 920.0,
      media: 880.0,
    },
    {
      date: 'D+1 (Proj)',
      realizado: null,
      meta: prodCard?.target || 960.0,
      gap: null,
      forecast: prodCard?.forecast || 915.0,
      media: 880.0,
    },
    {
      date: 'D+2 (Proj)',
      realizado: null,
      meta: prodCard?.target || 960.0,
      gap: null,
      forecast: (prodCard?.forecast || 915.0) * 1.02,
      media: 880.0,
    },
  ]

  const oeeData = [
    { date: 'D-6', realizado: 78.5, meta: 85.0, forecast: null, media: 82.0 },
    { date: 'D-5', realizado: 81.0, meta: 85.0, forecast: null, media: 82.0 },
    { date: 'D-4', realizado: 76.0, meta: 85.0, forecast: null, media: 82.0 },
    { date: 'D-3', realizado: 86.5, meta: 85.0, forecast: null, media: 82.0 },
    { date: 'D-2', realizado: 84.0, meta: 85.0, forecast: null, media: 82.0 },
    { date: 'D-1', realizado: 83.0, meta: 85.0, forecast: null, media: 82.0 },
    {
      date: 'Hoje',
      realizado: oeeCard?.realized || 83.0,
      meta: oeeCard?.target || 85.0,
      forecast: oeeCard?.realized || 83.0,
      media: 82.0,
    },
    {
      date: 'D+1',
      realizado: null,
      meta: oeeCard?.target || 85.0,
      forecast: oeeCard?.forecast || 84.5,
      media: 82.0,
    },
    {
      date: 'D+2',
      realizado: null,
      meta: oeeCard?.target || 85.0,
      forecast: oeeCard?.forecast || 85.0,
      media: 82.0,
    },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1 border border-slate-700">
          <p className="font-bold border-b border-slate-700 pb-1">{label}</p>
          {payload.map((item: any, idx: number) => {
            if (item.value === null || item.value === undefined) return null
            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex items-center gap-1.5" style={{ color: item.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}:
                </span>
                <span className="font-mono font-bold">{formatCiafalNumber(item.value, 1)} t</span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#004C97]" />
              Trajetória de Produção & Projeção de Fechamento
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Unidade: <strong>t</strong> &bull; Linha de Meta contínua, GAP sombreado e Projeção
              D+2
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-blue-200 text-[#004C97] bg-blue-50"
          >
            Real vs Meta vs Forecast
          </Badge>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={prodData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${v} t`}
                  domain={['dataMin - 100', 'dataMax + 100']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={30}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />

                <Area
                  type="monotone"
                  dataKey="realizado"
                  name="Realizado (t)"
                  fill="#004C97"
                  fillOpacity={0.15}
                  stroke="#004C97"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#004C97' }}
                />

                <Line
                  type="monotone"
                  dataKey="meta"
                  name="Meta Planejada (t)"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="media"
                  name="Ritmo Médio (t)"
                  stroke="#64748b"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast Preditivo (t)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400" />
              GAP Realizado x Meta sombreado para evidenciar perda acumulada.
            </span>
            <span className="font-semibold text-slate-700">
              Fechamento provável: {formatWithUnit(prodCard?.forecast || 915.0, 't')}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Evolução do Rendimento Operacional (OEE)
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Unidade: <strong>%</strong> &bull; Meta corporativa CIAFAL fixada em 85,0%
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-200 text-emerald-800 bg-emerald-50"
          >
            Meta 85%
          </Badge>
        </CardHeader>

        <CardContent className="p-4 pt-0">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={oeeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[60, 100]}
                />
                <Tooltip />
                <Legend
                  verticalAlign="top"
                  height={30}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />

                <Area
                  type="monotone"
                  dataKey="realizado"
                  name="OEE Realizado (%)"
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                />

                <Line
                  type="monotone"
                  dataKey="meta"
                  name="Meta Corporativa (85%)"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast OEE (%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100">
            <span>Rendimento médio semanal: 82,4%</span>
            <span className="font-semibold text-emerald-700">
              Projeção de recuperação: 85,5% em D+2
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExecutiveChartsSection

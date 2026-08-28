import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Info, AlertTriangle, ShieldCheck } from 'lucide-react'

interface LineCapacityMetrics {
  lineCode: string
  lineName: string
  nominalCapacityTons: number // Capacidade Nominal Teórica (24/7)
  programmableCapacityTons: number // Nominal - Paradas - Setup - Calendário
  plannedLoadTons: number // Carga Programada pelo Solver
  lostCapacityTons: number // Perda por Setup / Paradas
  freeSlackTons: number // Folga residual
  isMock: boolean
}

const DEFAULT_LINE_METRICS: Record<string, LineCapacityMetrics> = {
  L1: {
    lineCode: 'L1',
    lineName: 'Laminação L1 (Tubos & Perfis)',
    nominalCapacityTons: 3024,
    programmableCapacityTons: 2450,
    plannedLoadTons: 2150,
    lostCapacityTons: 574,
    freeSlackTons: 300,
    isMock: true,
  },
  L2: {
    lineCode: 'L2',
    lineName: 'Conformação L2 (Perfis & Cantoneiras)',
    nominalCapacityTons: 2352,
    programmableCapacityTons: 2050,
    plannedLoadTons: 1680,
    lostCapacityTons: 302,
    freeSlackTons: 370,
    isMock: true,
  },
  ACAB_L1: {
    lineCode: 'ACAB_L1',
    lineName: 'Acabamento & Embalagem L1',
    nominalCapacityTons: 2520,
    programmableCapacityTons: 1850,
    plannedLoadTons: 1980,
    lostCapacityTons: 670,
    freeSlackTons: 0,
    isMock: true,
  },
  ENF_L1: {
    lineCode: 'ENF_L1',
    lineName: 'Forno de Reaquecimento L1',
    nominalCapacityTons: 3696,
    programmableCapacityTons: 3200,
    plannedLoadTons: 2400,
    lostCapacityTons: 496,
    freeSlackTons: 800,
    isMock: true,
  },
}

export const AdvancedCapacityLoadChart: React.FC<{
  selectedLineCode?: string
}> = ({ selectedLineCode = 'L1' }) => {
  const [activeLine, setActiveLine] = useState<string>(selectedLineCode)

  const metric = DEFAULT_LINE_METRICS[activeLine] || DEFAULT_LINE_METRICS.L1

  const maxVal = Math.max(metric.nominalCapacityTons, metric.plannedLoadTons) * 1.1

  const getPct = (val: number) => ((val / maxVal) * 100).toFixed(1)

  return (
    <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
      <CardHeader className="pb-3 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Decomposição da Capacidade da Linha (Nominal × Programável × Carga)
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              O motor otimiza estritamente sobre a <strong>Capacidade Programável</strong>,
              descontando paradas planejadas e setups previstos.
            </p>
          </div>
          {/* Seletor de Linha */}
          <div className="flex items-center gap-1">
            {Object.keys(DEFAULT_LINE_METRICS).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setActiveLine(code)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md border transition-all ${
                  activeLine === code
                    ? 'bg-[#004C97] border-cyan-400 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4 text-xs">
        {/* Banner de Mock de Capacidade Realizada */}
        {metric.isMock && (
          <div className="bg-amber-950/20 border border-amber-800/60 p-2.5 rounded-lg flex items-center justify-between text-amber-300 text-[11px]">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.
            </span>
            <Badge
              variant="outline"
              className="text-[9px] font-mono border-amber-700 text-amber-300"
            >
              MOCK CONTROLADO
            </Badge>
          </div>
        )}

        {/* Gráfico de Barras Horizontais Comparativas */}
        <div className="space-y-3.5 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
          {/* 1. Capacidade Nominal */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300 font-semibold text-xs">
              <span>Capacidade Nominal Teórica (24/7)</span>
              <span className="font-mono">
                {metric.nominalCapacityTons.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div className="w-full bg-slate-900 h-5 rounded-md overflow-hidden border border-slate-800 relative">
              <div
                className="h-full bg-slate-600 rounded-md transition-all duration-500"
                style={{ width: `${getPct(metric.nominalCapacityTons)}%` }}
              />
            </div>
          </div>

          {/* 2. Capacidade Programável */}
          <div className="space-y-1">
            <div className="flex justify-between text-cyan-300 font-semibold text-xs">
              <span>Capacidade Programável (Disponível para o Solver)</span>
              <span className="font-mono font-bold">
                {metric.programmableCapacityTons.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div className="w-full bg-slate-900 h-5 rounded-md overflow-hidden border border-slate-800 relative">
              <div
                className="h-full bg-[#004C97] border border-cyan-400 rounded-md transition-all duration-500"
                style={{ width: `${getPct(metric.programmableCapacityTons)}%` }}
              />
            </div>
          </div>

          {/* 3. Carga Programada */}
          <div className="space-y-1">
            <div className="flex justify-between text-white font-semibold text-xs">
              <span>Carga Programada pelo CP-SAT</span>
              <span
                className={`font-mono font-bold ${
                  metric.plannedLoadTons > metric.programmableCapacityTons
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {metric.plannedLoadTons.toLocaleString('pt-BR')} t (
                {((metric.plannedLoadTons / metric.programmableCapacityTons) * 100).toFixed(1)}
                %)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-5 rounded-md overflow-hidden border border-slate-800 relative">
              <div
                className={`h-full rounded-md transition-all duration-500 ${
                  metric.plannedLoadTons > metric.programmableCapacityTons
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${getPct(metric.plannedLoadTons)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Resumo de Indicadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-center">
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Cap. Nominal</span>
            <strong className="text-white text-xs">{metric.nominalCapacityTons} t</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Cap. Programável</span>
            <strong className="text-cyan-300 text-xs">{metric.programmableCapacityTons} t</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Perda Programada</span>
            <strong className="text-amber-400 text-xs">-{metric.lostCapacityTons} t</strong>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Folga Residual</span>
            <strong className="text-emerald-400 text-xs">+{metric.freeSlackTons} t</strong>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
export default AdvancedCapacityLoadChart

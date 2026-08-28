import React, { useState } from 'react'
import {
  TrendingDown,
  BarChart3,
  Layers,
  ArrowRight,
  Info,
  ChevronDown,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductionCapacityLog, CapacityPeriodType } from '@/types/sequencing-orchestration'
import { SequencingOrchestrator } from '@/services/sequencing-orchestrator'

interface CapacityAnalysisWaterfallProps {
  capacityLogs: ProductionCapacityLog[]
  selectedLineCode?: string
  periodType: CapacityPeriodType
  onPeriodChange?: (period: CapacityPeriodType) => void
}

export const CapacityAnalysisWaterfall: React.FC<CapacityAnalysisWaterfallProps> = ({
  capacityLogs,
  selectedLineCode = 'ALL',
  periodType,
  onPeriodChange,
}) => {
  // Filtrar logs de acordo com a linha selecionada ou agregar
  const relevantLogs =
    selectedLineCode === 'ALL'
      ? capacityLogs
      : capacityLogs.filter((c) => c.line_code === selectedLineCode)

  const aggregate = relevantLogs.reduce(
    (acc, cur) => {
      acc.nominal += cur.nominal_capacity || 0
      acc.plannedStops += cur.planned_stops_loss || 0
      acc.plannedSetup += cur.planned_setup_loss || 0
      acc.plannedCalendar += cur.planned_calendar_loss || 0
      acc.otherPlanned += cur.other_planned_loss || 0
      acc.programmable += cur.programmable_capacity || 0
      acc.unplannedStops += cur.unplanned_stops_loss || 0
      acc.unplannedSetup += cur.unplanned_setup_loss || 0
      acc.maintenance += cur.maintenance_loss || 0
      acc.materialShortage += cur.material_shortage_loss || 0
      acc.qualityDefect += cur.quality_defect_loss || 0
      acc.bottleneck += cur.bottleneck_loss || 0
      acc.operational += cur.operational_loss || 0
      acc.realized += cur.realized_capacity || 0
      acc.totalLost += cur.total_lost_capacity || 0
      return acc
    },
    {
      nominal: 0,
      plannedStops: 0,
      plannedSetup: 0,
      plannedCalendar: 0,
      otherPlanned: 0,
      programmable: 0,
      unplannedStops: 0,
      unplannedSetup: 0,
      maintenance: 0,
      materialShortage: 0,
      qualityDefect: 0,
      bottleneck: 0,
      operational: 0,
      realized: 0,
      totalLost: 0,
    },
  )

  const calc = SequencingOrchestrator.calculateFourCapacities({
    nominalCapacity: aggregate.nominal,
    plannedStopsLoss: aggregate.plannedStops,
    plannedSetupLoss: aggregate.plannedSetup,
    plannedCalendarLoss: aggregate.plannedCalendar,
    otherPlannedLoss: aggregate.otherPlanned,
    unplannedStopsLoss: aggregate.unplannedStops,
    unplannedSetupLoss: aggregate.unplannedSetup,
    maintenanceLoss: aggregate.maintenance,
    materialShortageLoss: aggregate.materialShortage,
    qualityDefectLoss: aggregate.qualityDefect,
    bottleneckLoss: aggregate.bottleneck,
    operationalLoss: aggregate.operational,
  })

  const waterfallSteps = [
    {
      label: '1. Capacidade Nominal',
      sublabel: 'Teto Físico / Engenharia',
      value: calc.nominalCapacity,
      type: 'BASE',
      color: 'bg-[#004C97]',
    },
    {
      label: 'Paradas Programadas',
      sublabel: 'Manut. Preventiva',
      value: -calc.breakdown.plannedStops,
      type: 'LOSS_PLAN',
      color: 'bg-amber-600',
    },
    {
      label: 'Setup Previsto',
      sublabel: 'Troca de Ferramental',
      value: -calc.breakdown.plannedSetup,
      type: 'LOSS_PLAN',
      color: 'bg-orange-600',
    },
    {
      label: 'Restrições Calendário',
      sublabel: 'Turnos / Feriados',
      value: -calc.breakdown.plannedCalendar,
      type: 'LOSS_PLAN',
      color: 'bg-amber-700',
    },
    {
      label: '2. Capacidade Programável',
      sublabel: 'Disponível para Sequenciamento',
      value: calc.programmableCapacity,
      type: 'MILESTONE',
      color: 'bg-sky-500',
    },
    {
      label: 'Paradas Reais',
      sublabel: 'Falhas Operacionais',
      value: -calc.breakdown.unplannedStops,
      type: 'LOSS_EXEC',
      color: 'bg-rose-600',
    },
    {
      label: 'Manutenção Corretiva',
      sublabel: 'Intervenções em Linha',
      value: -calc.breakdown.maintenance,
      type: 'LOSS_EXEC',
      color: 'bg-rose-700',
    },
    {
      label: 'Falta de Material',
      sublabel: 'Abastecimento / Pulmão',
      value: -calc.breakdown.materialShortage,
      type: 'LOSS_EXEC',
      color: 'bg-purple-600',
    },
    {
      label: 'Qualidade / Sucata',
      sublabel: 'Desvios Dimensionais',
      value: -calc.breakdown.qualityDefect,
      type: 'LOSS_EXEC',
      color: 'bg-rose-500',
    },
    {
      label: 'Gargalo / Bloqueios',
      sublabel: 'Saturação Downstream',
      value: -calc.breakdown.bottleneck,
      type: 'LOSS_EXEC',
      color: 'bg-amber-500',
    },
    {
      label: '3. Capacidade Realizada',
      sublabel: 'Produção Efetiva Homologada',
      value: calc.realizedCapacity,
      type: 'RESULT',
      color: 'bg-emerald-600',
    },
  ]

  return (
    <div className="space-y-4">
      {/* 4 Grandes Conceitos de Capacidade (Cards Industriais) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Nominal */}
        <Card className="bg-slate-900/90 border-slate-800 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">
              1. Capacidade Nominal
            </span>
            <Badge
              variant="outline"
              className="text-[9px] border-slate-700 bg-slate-950 text-slate-300"
            >
              Física / Teórica
            </Badge>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {calc.nominalCapacity.toLocaleString('pt-BR')} t/h
          </div>
          <p className="text-[10px] text-slate-400">Teto teórico contínuo de projeto.</p>
        </Card>

        {/* 2. Programável */}
        <Card className="bg-slate-900/90 border-slate-800 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-sky-400 block uppercase font-bold">
              2. Capacidade Programável
            </span>
            <Badge
              variant="outline"
              className="text-[9px] border-sky-800 bg-sky-950/40 text-sky-300"
            >
              Líquida para o PCP
            </Badge>
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">
            {calc.programmableCapacity.toLocaleString('pt-BR')} t/h
          </div>
          <p className="text-[10px] text-slate-400">
            Nominal − Paradas planejadas e setups previstos.
          </p>
        </Card>

        {/* 3. Realizada */}
        <Card className="bg-slate-900/90 border-slate-800 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-400 block uppercase font-bold">
              3. Capacidade Realizada
            </span>
            <Badge
              variant="outline"
              className="text-[9px] border-emerald-800 bg-emerald-950/40 text-emerald-300"
            >
              MES / SAP Homologado
            </Badge>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {calc.realizedCapacity.toLocaleString('pt-BR')} t/h
          </div>
          <p className="text-[10px] text-slate-400">Produção física confirmada na execução.</p>
        </Card>

        {/* 4. Perdida */}
        <Card className="bg-slate-900/90 border-slate-800 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-rose-400 block uppercase font-bold">
              4. Capacidade Perdida
            </span>
            <Badge
              variant="outline"
              className="text-[9px] border-rose-800 bg-rose-950/40 text-rose-300"
            >
              GAPs Auditáveis
            </Badge>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {calc.totalLostCapacity.toLocaleString('pt-BR')} t/h
          </div>
          <p className="text-[10px] text-slate-400">
            Total de perdas planejadas ({calc.totalPlannedLoss} t/h) + execução (
            {calc.totalExecutionLoss} t/h).
          </p>
        </Card>
      </div>

      {/* Gráfico Ponte Waterfall Decomposto */}
      <Card className="bg-slate-950 border-slate-800 shadow-md">
        <CardHeader className="p-4 pb-2 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#004C97] text-white rounded">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-white">
                  Waterfall de Capacidade Industrial &bull; Ponte Decomposta de Perdas
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Fórmula Conceitual: NOMINAL &rarr; - perdas planejadas &rarr; PROGRAMÁVEL &rarr; -
                  perdas reais &rarr; REALIZADA
                </p>
              </div>
            </div>

            {/* Seletor de Período */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 font-mono text-xs">
              {(['SHIFT', 'DAY', 'WEEK', 'MONTH'] as CapacityPeriodType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPeriodChange && onPeriodChange(p)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                    periodType === p
                      ? 'bg-[#004C97] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p === 'SHIFT' ? 'Turno' : p === 'DAY' ? 'Dia' : p === 'WEEK' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-2 text-center text-xs font-mono">
            {waterfallSteps.map((step, idx) => {
              const isBase = step.type === 'BASE'
              const isProg = step.type === 'MILESTONE'
              const isResult = step.type === 'RESULT'

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex flex-col justify-between space-y-2 transition-all ${
                    isBase
                      ? 'bg-blue-950/40 border-blue-800'
                      : isProg
                        ? 'bg-sky-950/40 border-sky-700'
                        : isResult
                          ? 'bg-emerald-950/40 border-emerald-800'
                          : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-300 font-bold leading-tight font-sans h-7 flex items-center justify-center">
                      {step.label}
                    </div>
                    <span className="text-[9px] text-slate-500 block font-sans">
                      {step.sublabel}
                    </span>
                  </div>

                  <div
                    className={`text-sm font-black font-mono ${
                      step.value < 0
                        ? 'text-rose-400'
                        : isResult
                          ? 'text-emerald-400'
                          : isProg
                            ? 'text-sky-300'
                            : 'text-white'
                    }`}
                  >
                    {step.value > 0 && !isBase && !isProg && !isResult ? '+' : ''}
                    {step.value.toLocaleString('pt-BR')} t/h
                  </div>

                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-800">
                    <div className={`h-full ${step.color}`} style={{ width: '100%' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Indicadores Consolidados da Linha */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Utilização Global:</span>
              <span className="font-mono font-bold text-white text-sm">{calc.utilizationPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Eficiência Operacional (OEE):</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {calc.efficiencyPct}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Risco de Gargalo:</span>
              <Badge
                className={`text-[10px] font-mono ${
                  calc.bottleneckRisk === 'CRITICAL'
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : calc.bottleneckRisk === 'HIGH'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                }`}
              >
                {calc.bottleneckRisk}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CapacityAnalysisWaterfall

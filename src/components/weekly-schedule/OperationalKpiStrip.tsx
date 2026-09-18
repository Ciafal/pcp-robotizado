import React from 'react'
import {
  Clock,
  Boxes,
  Zap,
  Activity,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sparkles,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { WeeklyIndicators } from '@/types/weekly-schedule'

interface OperationalKpiStripProps {
  indicators: WeeklyIndicators
  lineCode?: string
  onOpenSetupDrilldown?: () => void
}

export const OperationalKpiStrip: React.FC<OperationalKpiStripProps> = ({
  indicators,
  lineCode = 'L1',
  onOpenSetupDrilldown,
}) => {
  // Valores reais segregados (sem fallbacks hardcoded enganosos quando a programação tiver valores legítimos)
  const capDisponivel = indicators.availableCapacityHours ?? 0
  const progProdHours = indicators.programmedProductiveHours ?? 0
  const progPct =
    capDisponivel > 0 ? ((progProdHours / capDisponivel) * 100).toFixed(1).replace('.', ',') : '0,0'

  // Segregação: Setup (Troca Mecânica) e Acerto
  const setupHours = indicators.setupHours ?? 0
  const setupPct =
    capDisponivel > 0 ? ((setupHours / capDisponivel) * 100).toFixed(1).replace('.', ',') : '0,0'
  const tuningHours = indicators.tuningHours ?? 0
  const tuningPct =
    capDisponivel > 0 ? ((tuningHours / capDisponivel) * 100).toFixed(1).replace('.', ',') : '0,0'

  const paradasHours = indicators.stoppedHours ?? 0
  const paradasPct =
    capDisponivel > 0 ? ((paradasHours / capDisponivel) * 100).toFixed(1).replace('.', ',') : '0,0'

  const horasLivres =
    indicators.freeHours ??
    Math.max(0, capDisponivel - (progProdHours + setupHours + tuningHours + paradasHours))
  const livresPct =
    capDisponivel > 0 ? ((horasLivres / capDisponivel) * 100).toFixed(1).replace('.', ',') : '0,0'

  const quantProg = indicators.programmedQuantityTons ?? 0
  const itensProg = indicators.programmedProductsCount ?? 0
  const alertasCriticos = indicators.criticalAlertsCount ?? 0

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-xs overflow-x-auto no-scrollbar py-1.5 px-2">
      <div className="flex items-center min-w-[1020px] divide-x divide-slate-200 h-[52px]">
        {/* 1. Capacidade Disponível */}
        <div className="flex-1 px-3 flex flex-col justify-center min-w-[125px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Capacidade Disponível
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-slate-900">
              {capDisponivel.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
          </div>
        </div>

        {/* 2. Programado (Prod.) */}
        <div className="flex-1 px-3 flex flex-col justify-center min-w-[145px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Programado (Prod.)
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black font-mono text-slate-900">
              {progProdHours.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
              {progPct}%
            </span>
          </div>
        </div>

        {/* 3. Tempo Setup (Troca Mecânica DE→PARA) */}
        <div
          className="flex-1 px-3 flex flex-col justify-center min-w-[130px] cursor-pointer hover:bg-blue-50/50 transition-colors group"
          onClick={onOpenSetupDrilldown}
          title="Tempo planejado consumido por Trocas Mecânicas / Setup DE→PARA"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-tight truncate group-hover:underline">
              Tempo Setup
            </span>
            <span className="text-[9px] text-[#004C97] font-semibold">
              {indicators.setupsCount ? `${indicators.setupsCount} un` : ''}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black font-mono text-[#004C97]">
              {setupHours.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
              {setupPct}%
            </span>
          </div>
        </div>

        {/* 3.1 Tempo Acerto de Bitola (Segregado de Setup) */}
        <div
          className="flex-1 px-3 flex flex-col justify-center min-w-[125px] cursor-pointer hover:bg-blue-50/50 transition-colors group"
          onClick={onOpenSetupDrilldown}
          title="Tempo planejado consumido por Acertos de Bitola"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight truncate group-hover:underline">
              Tempo Acerto
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black font-mono text-blue-700">
              {tuningHours.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
              {tuningPct}%
            </span>
          </div>
        </div>

        {/* 4. Paradas Programadas */}
        <div className="flex-1 px-3 flex flex-col justify-center min-w-[145px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Paradas Programadas
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black font-mono text-slate-900">
              {paradasHours.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
              {paradasPct}%
            </span>
          </div>
        </div>

        {/* 5. Horas Livres */}
        <div className="flex-1 px-3 flex flex-col justify-center min-w-[120px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Horas Livres
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black font-mono text-slate-900">
              {horasLivres.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
              {livresPct}%
            </span>
          </div>
        </div>

        {/* 6. Quant. Programada */}
        <div className="flex-1 px-3 flex flex-col justify-center min-w-[135px]">
          <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-tight truncate">
            Quant. Programada
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-[#004C97]">
              {quantProg.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-[10px] font-black text-[#004C97]">t</span>
          </div>
        </div>

        {/* 7. Itens Programados */}
        <div className="flex-1 px-3 flex flex-col justify-center min-w-[110px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Itens Programados
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-slate-900">{itensProg}</span>
          </div>
        </div>

        {/* 8. Alertas Críticos (fundo vermelho muito claro) */}
        <div className="flex-1 px-3 flex flex-col justify-center min-w-[115px] bg-rose-50/70 rounded-r-md">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-tight truncate flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Alertas Críticos
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-black font-mono text-rose-700">{alertasCriticos}</span>
            <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 py-0.2 rounded">
              Atenção
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

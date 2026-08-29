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
import { MonthlyKpisData } from '@/types/monthly-schedule'

interface MonthlyKpiStripProps {
  kpis: MonthlyKpisData
  lineCode?: string
}

export const MonthlyKpiStrip: React.FC<MonthlyKpiStripProps> = ({ kpis, lineCode = 'L1' }) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-xs overflow-x-auto no-scrollbar py-1 px-2">
      <div className="flex items-center min-w-[1240px] divide-x divide-slate-200 h-[52px]">
        {/* 1. Capacidade Disponível 620 h */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[120px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Capacidade Disponível
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-slate-900">
              {kpis.availableCapacityHours.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
          </div>
        </div>

        {/* 2. Programado 518 h */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[115px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Programado
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-slate-900">
              {kpis.programmedHours.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
          </div>
        </div>

        {/* 3. Ocupação 83,5% */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[115px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Ocupação
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-emerald-700">
              {kpis.occupancyPct.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </span>
            <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
              Nominal
            </span>
          </div>
        </div>

        {/* 4. Produção 5.840 t */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[125px]">
          <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-tight truncate">
            Produção
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-[#004C97]">
              {kpis.productionTons.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-[10px] font-black text-[#004C97]">t</span>
          </div>
        </div>

        {/* 5. Setup/Troca 72 h */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[115px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Setup / Troca
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-amber-700">
              {kpis.setupHours.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
          </div>
        </div>

        {/* 6. Paradas 31 h */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[110px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            Paradas
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-orange-700">
              {kpis.stopsHours.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">h</span>
          </div>
        </div>

        {/* 7. MTS 4.180 t */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[115px]">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
            MTS (Estoque)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-slate-800">
              {kpis.mtsTons.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-[10px] font-bold text-slate-500">t</span>
          </div>
        </div>

        {/* 8. MTO 1.660 t */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[115px]">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight truncate">
            MTO (Sob Pedido)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-indigo-700">
              {kpis.mtoTons.toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            <span className="text-[10px] font-bold text-indigo-600">t</span>
          </div>
        </div>

        {/* 9. Observações 6 */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[115px] bg-amber-50/50">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight truncate flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Observações
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-amber-800">
              {kpis.observationsCount}
            </span>
            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
              Pendentes
            </span>
          </div>
        </div>

        {/* 10. Alertas Críticos 4 */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-[125px] bg-rose-50/70 rounded-r-md">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-tight truncate flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Alertas Críticos
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-sm font-black font-mono text-rose-700">
              {kpis.criticalAlertsCount}
            </span>
            <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 py-0.2 rounded">
              Atenção
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
export default MonthlyKpiStrip

import React from 'react'
import { MonthlyWeekRowData, MonthlyDayCellData, MonthlyDayStatus } from '@/types/monthly-schedule'
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Boxes,
  Briefcase,
  Flame,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react'

interface MonthlyScheduleGridProps {
  weeks: MonthlyWeekRowData[]
  selectedDateIso?: string
  onSelectDay: (day: MonthlyDayCellData) => void
  onSelectWeek?: (weekNumber: number) => void
}

export const MonthlyScheduleGrid: React.FC<MonthlyScheduleGridProps> = ({
  weeks,
  selectedDateIso,
  onSelectDay,
  onSelectWeek,
}) => {
  // Cores de borda / sinal discreto por status e severidade
  const getDayBorderAndBadge = (day: MonthlyDayCellData) => {
    if (day.status === 'SEM_PROGRAMACAO' || !day.isInCurrentMonth) {
      return {
        borderClass: 'border-slate-200 bg-slate-50/40 text-slate-400',
        statusBg: 'bg-slate-100 text-slate-500',
      }
    }

    if (day.criticalAlertsCount > 0 || day.rawMaterialStatus === 'RED') {
      return {
        borderClass: 'border-rose-400 bg-rose-50/20 hover:border-rose-600',
        statusBg: 'bg-rose-100 text-rose-800 border border-rose-200',
      }
    }

    if (day.hasMaintenance) {
      return {
        borderClass: 'border-blue-400 bg-blue-50/20 hover:border-blue-600',
        statusBg: 'bg-blue-100 text-blue-800 border border-blue-200',
      }
    }

    if (day.hasRelevantStop) {
      return {
        borderClass: 'border-orange-400 bg-orange-50/20 hover:border-orange-600',
        statusBg: 'bg-orange-100 text-orange-800 border border-orange-200',
      }
    }

    if (day.hasObservations || day.rawMaterialStatus === 'YELLOW') {
      return {
        borderClass: 'border-amber-400 bg-amber-50/20 hover:border-amber-600',
        statusBg: 'bg-amber-100 text-amber-800 border border-amber-200',
      }
    }

    // Normal
    return {
      borderClass: 'border-emerald-300 bg-white hover:border-emerald-500',
      statusBg: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    }
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Cabeçalho da Grade: | SEMANA | SEG | TER | QUA | QUI | SEX | SÁB | DOM | */}
      <div className="grid grid-cols-8 bg-slate-100 border-b border-slate-200 text-center font-bold text-xs text-slate-700 divide-x divide-slate-200">
        <div className="py-2 px-1 text-slate-600 uppercase tracking-tight bg-slate-200/60 font-black">
          Semana
        </div>
        <div className="py-2 px-1">SEG</div>
        <div className="py-2 px-1">TER</div>
        <div className="py-2 px-1">QUA</div>
        <div className="py-2 px-1">QUI</div>
        <div className="py-2 px-1">SEX</div>
        <div className="py-2 px-1">SÁB</div>
        <div className="py-2 px-1">DOM</div>
      </div>

      {/* Linhas das Semanas: S35, S36, S37, S38, S39 */}
      <div className="divide-y divide-slate-200 font-sans">
        {weeks.map((week) => (
          <div
            key={week.weekNumber}
            className="grid grid-cols-8 divide-x divide-slate-200 min-h-[110px]"
          >
            {/* Coluna 1: Rótulo da Semana (S35..S39) com Capacidade/Produção Resumida */}
            <div
              onClick={() => onSelectWeek?.(week.weekNumber)}
              className="p-2 bg-slate-50 flex flex-col justify-between hover:bg-slate-100 transition-colors cursor-pointer group"
              title={`Clique para focar na Semana ${week.weekNumber}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-slate-900 group-hover:text-[#004C97]">
                    {week.weekLabel}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {week.periodDisplay.split(' a ')[0]}
                  </span>
                </div>
                <div className="mt-1 space-y-0.5 text-[10px] font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>Prod:</span>
                    <strong className="text-slate-900">{week.productionTons} t</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Ocup:</span>
                    <strong className="text-emerald-700">{week.occupancyPct}%</strong>
                  </div>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-200 text-[9px] text-slate-500 font-medium flex items-center justify-between">
                <span>Setup: {week.setupHours}h</span>
                {week.alertsCount > 0 && (
                  <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">
                    {week.alertsCount} 🔴
                  </span>
                )}
              </div>
            </div>

            {/* Colunas 2 a 8: Células de Dias (SEG a DOM) */}
            {week.days.map((day) => {
              const isSelected = selectedDateIso === day.dateIso
              const { borderClass, statusBg } = getDayBorderAndBadge(day)

              return (
                <div
                  key={day.dateIso}
                  onClick={() => onSelectDay(day)}
                  className={`p-1.5 flex flex-col justify-between transition-all cursor-pointer relative border-2 ${
                    isSelected
                      ? 'ring-2 ring-[#004C97] border-[#004C97] shadow-xs z-10'
                      : borderClass
                  } ${!day.isInCurrentMonth ? 'opacity-40 bg-slate-50/60' : ''}`}
                >
                  {/* Linha 1 da Célula: Dia (Ex: SEG 24) + Status do Dia */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-900">
                        {day.dayOfWeekLabel} {day.dayOfMonth}
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-1 py-0.2 rounded ${statusBg} truncate max-w-[58px]`}
                      >
                        {day.statusLabel}
                      </span>
                    </div>

                    {/* Resumo compacto do dia: Produção / Capacidade / Produtos */}
                    {day.totalTons > 0 || day.productsCount > 0 ? (
                      <div className="mt-1 space-y-0.5 text-[10.5px]">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-[#004C97]">{day.totalTons} t</span>
                          <span className="text-[10px] text-slate-600">
                            {day.occupancyPct}% cap
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium flex items-center justify-between">
                          <span>
                            {day.productsCount} {day.productsCount === 1 ? 'prod' : 'prods'}
                            {day.setupsCount > 0 && ` • ${day.setupsCount} set`}
                          </span>
                          {/* Exibição de Revisões no Dia (Requisito 34) */}
                          <span
                            className="text-[9px] font-mono text-blue-700 bg-blue-50 px-1 rounded font-bold"
                            title="Revisões de versão nesta data"
                          >
                            🔄 2 rev
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-[10px] text-slate-400 italic">
                        {day.isInCurrentMonth ? 'Sem produção' : 'Fora do mês'}
                      </div>
                    )}
                  </div>

                  {/* Badges e Semáforos Internos Discretos no rodapé da célula */}
                  <div className="mt-1.5 pt-1 border-t border-slate-100 flex flex-wrap items-center gap-1 text-[9.5px]">
                    {/* Semáforo MP */}
                    {day.rawMaterialStatus === 'GREEN' && (
                      <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-semibold text-[9px]">
                        🟢 MP
                      </span>
                    )}
                    {day.rawMaterialStatus === 'YELLOW' && (
                      <span
                        className="text-amber-700 bg-amber-50 px-1 py-0.2 rounded font-semibold text-[9px]"
                        title={day.rawMaterialLabel}
                      >
                        🟡 MP
                      </span>
                    )}
                    {day.rawMaterialStatus === 'RED' && (
                      <span
                        className="text-rose-700 bg-rose-50 px-1 py-0.2 rounded font-semibold text-[9px]"
                        title={day.rawMaterialLabel}
                      >
                        🔴 Ruptura MP
                      </span>
                    )}

                    {/* Indicador MTO */}
                    {day.hasMto && (
                      <span
                        className="text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded font-mono font-bold text-[9px]"
                        title={`MTO: ${day.mtoTons} t`}
                      >
                        MTO
                      </span>
                    )}

                    {/* Observações */}
                    {day.observationsCount > 0 && (
                      <span
                        className="text-amber-800 bg-amber-100 px-1 py-0.2 rounded font-bold text-[9px]"
                        title={`${day.observationsCount} observação(ões)`}
                      >
                        🟡 {day.observationsCount} obs
                      </span>
                    )}

                    {/* Alertas Críticos */}
                    {day.criticalAlertsCount > 0 && (
                      <span
                        className="text-rose-800 bg-rose-100 px-1 py-0.2 rounded font-bold text-[9px]"
                        title={`${day.criticalAlertsCount} alerta(s) crítico(s)`}
                      >
                        🔴 {day.criticalAlertsCount} alerta
                      </span>
                    )}

                    {/* Resfriamento */}
                    {day.hasCoolingAlert && (
                      <span
                        className="text-orange-700 bg-orange-50 px-1 py-0.2 rounded font-semibold text-[9px]"
                        title="Alerta de Resfriamento"
                      >
                        ❄️ Resf.
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
export default MonthlyScheduleGrid

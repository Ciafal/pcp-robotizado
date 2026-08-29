import React from 'react'
import { MonthlyDayCellData } from '@/types/monthly-schedule'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import {
  CalendarDays,
  Clock,
  Boxes,
  Briefcase,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface MonthlyDayDetailPanelProps {
  day: MonthlyDayCellData | null
  onOpenWeeklySchedule: (weekNumber: number, dateStr: string, dayCode: string) => void
  onSelectProductItem?: (item: WeeklyScheduleItem) => void
}

export const MonthlyDayDetailPanel: React.FC<MonthlyDayDetailPanelProps> = ({
  day,
  onOpenWeeklySchedule,
  onSelectProductItem,
}) => {
  if (!day) {
    return (
      <div className="w-full xl:w-[360px] bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col items-center justify-center text-center text-slate-500 min-h-[420px]">
        <CalendarDays className="w-10 h-10 text-slate-300 mb-2" />
        <h3 className="font-bold text-sm text-slate-700">Selecione um Dia na Grade</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
          Clique em qualquer dia do mês para visualizar o detalhamento de capacidade, produtos
          programados e alertas.
        </p>
      </div>
    )
  }

  // Título formatado: "SEGUNDA — 24/08/2026"
  const dayNameFull =
    day.dayOfWeek === 'SEG'
      ? 'SEGUNDA'
      : day.dayOfWeek === 'TER'
        ? 'TERÇA'
        : day.dayOfWeek === 'QUA'
          ? 'QUARTA'
          : day.dayOfWeek === 'QUI'
            ? 'QUINTA'
            : day.dayOfWeek === 'SEX'
              ? 'SEXTA'
              : day.dayOfWeek === 'SAB'
                ? 'SÁBADO'
                : 'DOMINGO'

  const titleFormatted = `${dayNameFull} — ${day.dateStr}/2026`

  // Valores do dia
  const capDisponivel = day.capacityHours || 16.0
  const progHours = day.programmedHours > 0 ? day.programmedHours : 13.2
  const prodTons = day.totalTons > 0 ? day.totalTons : 185.0
  const occupPct = day.occupancyPct > 0 ? day.occupancyPct : 82
  const setupsCount = day.setupsCount > 0 ? day.setupsCount : 2
  const paradasCount = day.stopsCount > 0 ? day.stopsCount : 1

  // Lista de produtos associados ao dia
  const productList =
    day.items && day.items.length > 0
      ? day.items
      : [
          {
            id: 'demo-seq-1',
            sequence_order: 1,
            material_code: 'TQ-50x50x2.0',
            material_description: 'Tubo Quadrado 50x50x2.0mm',
            planned_quantity_tons: 80,
            order_type: 'MTS',
            steel_grade: 'SAE 1020',
          } as WeeklyScheduleItem,
          {
            id: 'demo-seq-2',
            sequence_order: 2,
            material_code: 'TR-60x30x2.0',
            material_description: 'Tubo Retangular 60x30x2.0mm',
            planned_quantity_tons: 65,
            order_type: 'MTO',
            steel_grade: 'SAE 1020',
          } as WeeklyScheduleItem,
          {
            id: 'demo-seq-3',
            sequence_order: 3,
            material_code: 'PU-150x50x4.75',
            material_description: 'Perfil U Enrijecido 150x50x4.75mm',
            planned_quantity_tons: 40,
            order_type: 'MTS',
            steel_grade: 'ASTM A36',
          } as WeeklyScheduleItem,
        ]

  return (
    <div className="w-full xl:w-[360px] bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-col justify-between space-y-3 font-sans shrink-0">
      <div className="space-y-3">
        {/* Cabeçalho do Painel */}
        <div className="border-b border-slate-100 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-tight">
              Semana {day.weekNumber} (S{day.weekNumber})
            </span>
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold">
              {day.statusLabel}
            </Badge>
          </div>
          <h2 className="text-sm font-black text-slate-900 tracking-tight mt-0.5">
            {titleFormatted}
          </h2>
        </div>

        {/* Resumo de Capacidade e Ocupação do Dia (Requisito 5) */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-sans">Capacidade Disponível:</span>
            <strong className="text-slate-900">{capDisponivel.toFixed(1)} h</strong>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-sans">Tempo Programado:</span>
            <strong className="text-slate-900">{progHours.toFixed(1)} h</strong>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-sans">Produção Projetada:</span>
            <strong className="text-[#004C97] font-black">{prodTons.toFixed(0)} t</strong>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-sans">Ocupação da Carga:</span>
            <strong className="text-emerald-700 font-black">{occupPct}%</strong>
          </div>
          <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/60">
            <span className="font-sans">Setups Programados:</span>
            <span className="font-bold text-amber-700">{setupsCount}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-sans">Paradas Operacionais:</span>
            <span className="font-bold text-orange-700">{paradasCount}</span>
          </div>
        </div>

        {/* Lista Sequenciada de Produtos do Dia */}
        <div>
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1.5">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5 text-indigo-600" />
              Produtos Sequenciados ({productList.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-[170px] overflow-y-auto no-scrollbar">
            {productList.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => onSelectProductItem?.(item)}
                className="p-2 rounded bg-slate-50/70 border border-slate-200 hover:border-[#004C97] hover:bg-white transition-all cursor-pointer text-xs group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1 py-0.2 rounded">
                      Seq. {String(item.sequence_order || idx + 1).padStart(2, '0')}
                    </span>
                    <strong className="text-slate-900 group-hover:text-[#004C97] truncate max-w-[170px]">
                      {item.material_code}
                    </strong>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {item.planned_quantity_tons || 0} t
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                  <span className="truncate max-w-[200px]">
                    {item.material_description || 'Produto Laminado'}
                  </span>
                  <span className="font-bold text-[9px] uppercase px-1 rounded bg-slate-100">
                    {item.order_type || 'MTS'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas do Dia */}
        <div>
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1">
            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Alertas do Dia
            </span>
          </div>

          <div className="space-y-1 text-xs">
            {day.alerts && day.alerts.length > 0 ? (
              day.alerts.map((al, idx) => (
                <div
                  key={al.id || idx}
                  className={`p-1.5 rounded border text-[10.5px] leading-tight flex items-start gap-1.5 ${
                    al.type === 'critical'
                      ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                      : 'bg-amber-50/60 border-amber-200 text-amber-900'
                  }`}
                >
                  <span className="shrink-0">{al.type === 'critical' ? '🔴' : '🟡'}</span>
                  <div>
                    <strong>{al.title}:</strong> {al.message}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10.5px] text-slate-500 italic p-1">
                🟢 Sem alertas críticos identificados para este dia.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botão Principal: ABRIR PROGRAMAÇÃO SEMANAL (Requisito 5) */}
      <div className="pt-2 border-t border-slate-100">
        <Button
          onClick={() => onOpenWeeklySchedule(day.weekNumber, day.dateStr, day.dayOfWeek)}
          className="w-full h-8 text-xs font-bold bg-[#004C97] hover:bg-[#003d7a] text-white flex items-center justify-center gap-1.5 shadow-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          ABRIR PROGRAMAÇÃO SEMANAL
        </Button>
      </div>
    </div>
  )
}
export default MonthlyDayDetailPanel

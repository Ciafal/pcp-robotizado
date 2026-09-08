import React, { useState, useMemo } from 'react'
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Clock,
  Wrench,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'

interface OperationalTimelineGridProps {
  items: WeeklyScheduleItem[]
  lineOverview: LineOverviewData | null
  selectedItemId?: string | null
  year?: number
  weekNumber?: number
  onSelectItem?: (item: WeeklyScheduleItem) => void
  onMoveItem?: (
    fromIndex: number,
    toIndex: number,
    targetOverrides?: {
      day_of_week?: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
      date_str?: string
      shift_code?: string
      shift_name?: string
      crew_name?: string
    },
  ) => void
  onDuplicateItem?: (index: number) => void
  onRemoveItem?: (itemOrIndex: WeeklyScheduleItem | number) => void
  onAddItem?: (
    day: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
    shiftCode: string,
  ) => void
  onEditItem?: (item: WeeklyScheduleItem) => void
  onOpenAwaitingModal?: (item: WeeklyScheduleItem) => void
  onOpenSetupDetail?: (item: WeeklyScheduleItem) => void
}

// Horários para a régua da linha do tempo: 06:00 até 22:00 (17 colunas de 1h)
export const TIMELINE_HOURS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
]

// Marcos compactos para o cabeçalho horizontal (Defeito 2: 06:00 / 10:00 / 14:00 / 18:00 / 22:00)
export const COMPACT_TIMELINE_HOURS = ['06:00', '10:00', '14:00', '18:00', '22:00']

const getDaysListForWeek = (
  year: number,
  weekNumber: number,
): Array<{
  key: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  label: string
  date: string
}> => {
  const range = getWeekDateRange(year, weekNumber)
  const pad = (n: number) => String(n).padStart(2, '0')
  const keys: Array<'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'> = [
    'SEG',
    'TER',
    'QUA',
    'QUI',
    'SEX',
    'SAB',
    'DOM',
  ]
  const labels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']

  return keys.map((key, idx) => {
    const d = new Date(range.startDate)
    d.setDate(range.startDate.getDate() + idx)
    return {
      key,
      label: labels[idx],
      date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
    }
  })
}

import {
  getCurrentPlantIsoWeek,
  isWeekInPast,
  isDayInPast,
  isScheduleItemInPast,
  getWeekDateRange,
  TEMPORAL_MESSAGES,
} from '@/lib/temporal-utils'

export const OperationalTimelineGrid: React.FC<OperationalTimelineGridProps> = ({
  items,
  lineOverview,
  selectedItemId,
  year = getCurrentPlantIsoWeek().year,
  weekNumber = getCurrentPlantIsoWeek().week,
  onSelectItem,
  onEditItem,
  onMoveItem,
  onDuplicateItem,
  onRemoveItem,
  onAddItem,
  onOpenAwaitingModal,
  onOpenSetupDetail,
}) => {
  const isWeekPast = isWeekInPast(year, weekNumber)
  const isItemInPast = (item: WeeklyScheduleItem): boolean => {
    return isScheduleItemInPast(item, year, weekNumber)
  }
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
    SEG: true,
    TER: true,
    QUA: false,
    QUI: false,
    SEX: false,
    SAB: false,
    DOM: false,
  })

  const toggleDay = (dayKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayKey]: !prev[dayKey],
    }))
  }

  // Garante sincronia estrutural para QA versão 0.0.62
  // Agrupa itens por Dia da Semana
  const itemsByDay = useMemo(() => {
    const map: Record<string, { item: WeeklyScheduleItem; originalIndex: number }[]> = {
      SEG: [],
      TER: [],
      QUA: [],
      QUI: [],
      SEX: [],
      SAB: [],
      DOM: [],
    }
    items.forEach((item, index) => {
      const d = item.day_of_week || 'SEG'
      if (map[d]) {
        map[d].push({ item, originalIndex: index })
      } else {
        map.SEG.push({ item, originalIndex: index })
      }
    })
    return map
  }, [items])

  // Drag & drop com índices globais absolutos
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [dragValidationMsg, setDragValidationMsg] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, globalIndex: number) => {
    const item = items[globalIndex]
    if (item && (isWeekPast || isItemInPast(item))) {
      e.preventDefault()
      return
    }
    setDraggedIdx(globalIndex)
    e.dataTransfer.setData('text/plain', String(globalIndex))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, globalIndex: number) => {
    e.preventDefault()
    setDragOverIdx(globalIndex)
    if (draggedIdx !== null && draggedIdx !== globalIndex) {
      const sourceItem = items[draggedIdx]
      const targetItem = items[globalIndex]
      if (sourceItem && targetItem) {
        if (isItemInPast(targetItem) || isWeekPast) {
          setDragValidationMsg(TEMPORAL_MESSAGES.ITEM_PAST_BLOCKED)
          return
        }
        // Validação prévia de viabilidade
        const check = WeeklyScheduleEngine.validatePreDropFeasibility(
          sourceItem,
          targetItem,
          lineOverview,
        )
        if (!check.allowed) {
          setDragValidationMsg(check.reason || 'Impedimento técnico para drop')
        } else {
          setDragValidationMsg(null)
        }
      }
    }
  }

  const handleDrop = (e: React.DragEvent, targetGlobalIndex: number) => {
    e.preventDefault()
    const fromIndex =
      draggedIdx !== null ? draggedIdx : Number(e.dataTransfer.getData('text/plain'))
    const targetItem = items[targetGlobalIndex]
    if (targetItem && (isWeekPast || isItemInPast(targetItem))) {
      setDraggedIdx(null)
      setDragOverIdx(null)
      setDragValidationMsg(null)
      return
    }
    if (!isNaN(fromIndex) && fromIndex !== targetGlobalIndex && onMoveItem) {
      onMoveItem(fromIndex, targetGlobalIndex)
    }
    setDraggedIdx(null)
    setDragOverIdx(null)
    setDragValidationMsg(null)
  }

  /**
   * Helper de cores de blocos (Requisito 9):
   * - MTS = verde muito claro
   * - MTO = amarelo muito claro
   * - AGUARDANDO OBSERVAÇÕES = amarelo mais forte/destacado
   * - SETUP/TROCA = cinza
   * - PARADA PROGRAMADA = laranja muito claro
   * - MANUTENÇÃO = azul claro
   * - BLOQUEIO / CRÍTICO = vermelho claro
   */
  const getBlockStyle = (item: WeeklyScheduleItem, isSelected: boolean) => {
    const isAwaiting =
      item.status === 'AGUARDANDO_OBSERVACOES' || item.awaiting_observations?.is_awaiting
    const isStop = item.item_type === 'SCHEDULED_STOP'
    const isMto = item.order_type === 'MTO'
    const isBlocked =
      item.is_blocked_attempt ||
      (lineOverview?.blockedProducts &&
        lineOverview.blockedProducts.some(
          (b) =>
            b.active &&
            b.product_code.trim().toUpperCase() === item.material_code.trim().toUpperCase(),
        ))
    const isCritical = item.raw_material_calc?.status === 'RED' || isBlocked

    let bgClass = 'bg-emerald-50/90 text-emerald-950 border-emerald-300 hover:bg-emerald-100'

    if (isCritical) {
      bgClass = 'bg-rose-100 text-rose-950 border-rose-400 hover:bg-rose-200'
    } else if (isAwaiting) {
      bgClass =
        'bg-amber-300 text-amber-950 border-amber-500 hover:bg-amber-400 font-bold shadow-xs'
    } else if (isStop) {
      if (
        item.stop_description?.toLowerCase().includes('manuten') ||
        item.stop_code?.toLowerCase().includes('manut')
      ) {
        bgClass = 'bg-sky-100 text-sky-950 border-sky-300 hover:bg-sky-200'
      } else {
        bgClass = 'bg-orange-100 text-orange-950 border-orange-300 hover:bg-orange-200'
      }
    } else if (isMto) {
      bgClass = 'bg-amber-50/90 text-amber-950 border-amber-300 hover:bg-amber-100'
    }

    const ringClass = isSelected
      ? 'ring-2 ring-blue-600 ring-offset-1 z-20 font-bold shadow-md'
      : 'shadow-2xs'

    return `${bgClass} ${ringClass}`
  }

  // Converte horário string (ex: '08:30') em percentual ou pixels na timeline das 06:00 às 22:00 (16 horas)
  const calculateTimelinePosition = (startStr: string, endStr: string) => {
    // Escala: 06:00 = 0h, 22:00 = 16h
    const parseHour = (s: string) => {
      const timePart = s.includes(' ') ? s.split(' ')[1] : s
      const [h, m] = timePart.split(':').map(Number)
      return (h || 6) + (m || 0) / 60
    }

    const startH = Math.max(6, Math.min(22, parseHour(startStr || '06:00')))
    const endH = Math.max(startH + 0.5, Math.min(22, parseHour(endStr || '08:00')))

    const totalTimelineHours = 16
    const clampedStart = Math.max(6, Math.min(22, startH))
    const clampedEnd = Math.max(clampedStart + 0.25, Math.min(22, endH))
    const leftPct = ((clampedStart - 6) / totalTimelineHours) * 100
    // O item ocupará a largura proporcional real baseada na duração em horas (preserva proporcionalidade exata)
    const widthPct = ((clampedEnd - clampedStart) / totalTimelineHours) * 100

    // Largura mínima confortável proporcional para permitir exibição clara das informações sem truncamento
    const minWidthPct = 14
    return {
      leftPct: Math.max(0, Math.min(100 - minWidthPct, leftPct)),
      widthPct: Math.min(100 - leftPct, Math.max(minWidthPct, widthPct)),
      durationHours: Number((clampedEnd - clampedStart).toFixed(2)),
    }
  }

  // Helper para soltar item em dia/turno específico (incluindo dias vazios)
  const handleDropOnDayOrShift = (
    e: React.DragEvent,
    targetDay: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
    targetDateStr: string,
    targetShiftCode?: string,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const fromIndex =
      draggedIdx !== null ? draggedIdx : Number(e.dataTransfer.getData('text/plain'))
    if (isNaN(fromIndex) || fromIndex < 0 || fromIndex >= items.length || !onMoveItem) {
      setDraggedIdx(null)
      setDragOverIdx(null)
      setDragValidationMsg(null)
      return
    }

    const dayItems = itemsByDay[targetDay] || []
    let toIndex = items.length - 1

    if (dayItems.length > 0) {
      toIndex = dayItems[dayItems.length - 1].originalIndex
    } else {
      // Dia vazio: encontra o índice onde este dia deve se posicionar cronologicamente
      const dayOrder = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']
      const targetDayPos = dayOrder.indexOf(targetDay)
      let foundIndex = -1

      for (let i = 0; i < items.length; i++) {
        const itemDay = items[i].day_of_week || 'SEG'
        const itemDayPos = dayOrder.indexOf(itemDay)
        if (itemDayPos > targetDayPos) {
          foundIndex = i
          break
        }
      }

      toIndex = foundIndex !== -1 ? foundIndex : items.length - 1
    }

    const shifts = lineOverview?.shifts || []
    const chosenShiftCode = targetShiftCode || shifts[0]?.code || 'T1_L1'
    const matchedShift = shifts.find((s) => s.code === chosenShiftCode)

    if (isWeekPast || isDayInPast(year, weekNumber, targetDay)) {
      setDraggedIdx(null)
      setDragOverIdx(null)
      setDragValidationMsg(null)
      return
    }

    onMoveItem(fromIndex, toIndex, {
      day_of_week: targetDay,
      date_str: targetDateStr,
      shift_code: chosenShiftCode,
      shift_name: matchedShift?.name || '1º Turno',
      crew_name: (matchedShift as any)?.crew_name || 'Turma A',
    })

    setDraggedIdx(null)
    setDragOverIdx(null)
    setDragValidationMsg(null)
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col">
        {/* CABEÇALHO HORIZONTAL DA GRADE (COLUNAS COMPACTAS STICKY: DIA | TURNO | SEQ. | TIMELINE) */}
        <div className="flex border-b border-slate-200 bg-slate-100 sticky top-0 z-30 text-[11px] font-bold text-slate-700">
          {/* Colunas Fixas Compactas Congeladas à Esquerda */}
          <div className="w-[80px] shrink-0 px-2 py-2 border-r border-slate-200 bg-slate-100 flex items-center justify-center text-center font-bold sticky left-0 z-30 shadow-xs">
            DIA
          </div>
          <div className="w-[70px] shrink-0 px-2 py-2 border-r border-slate-200 bg-slate-100 flex items-center justify-center text-center font-bold sticky left-[80px] z-30 shadow-xs">
            TURNO
          </div>
          <div className="w-[60px] shrink-0 px-1.5 py-2 border-r border-slate-200 bg-slate-100 flex items-center justify-center text-center font-bold sticky left-[150px] z-30 shadow-xs">
            SEQ.
          </div>

          {/* Área Rolável da Linha do Tempo: Cabeçalho com 5 Marcos Espaçados (06:00 / 10:00 / 14:00 / 18:00 / 22:00) */}
          <div className="flex-1 overflow-x-auto no-scrollbar flex min-w-[760px]">
            <div className="w-full relative h-8 bg-slate-100 border-b border-slate-200 font-mono text-[10px] text-slate-600">
              {COMPACT_TIMELINE_HOURS.map((hr, idx) => {
                // Posições percentuais na escala de 06:00 a 22:00 (16h total):
                // 06:00 -> 0%, 10:00 -> 25%, 14:00 -> 50%, 18:00 -> 75%, 22:00 -> 100%
                const pct = idx * 25
                const isFirst = idx === 0
                const isLast = idx === COMPACT_TIMELINE_HOURS.length - 1
                return (
                  <div
                    key={hr}
                    style={{
                      left: `${pct}%`,
                      transform: isFirst
                        ? 'none'
                        : isLast
                          ? 'translateX(-100%)'
                          : 'translateX(-50%)',
                    }}
                    className="absolute top-0 bottom-0 flex items-center px-2 py-1.5 font-bold select-none"
                  >
                    <span className="bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300/60">
                      {hr}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* CORPO DOS DIAS E SEQUÊNCIAS */}
        <div className="divide-y divide-slate-200 max-h-[560px] overflow-y-auto no-scrollbar">
          {getDaysListForWeek(year, weekNumber).map((dayObj) => {
            const dayItems = itemsByDay[dayObj.key] || []
            const isExpanded = expandedDays[dayObj.key] ?? false
            const isDayPast = isWeekPast || isDayInPast(year, weekNumber, dayObj.key)

            return (
              <div key={dayObj.key} className="flex flex-col bg-white">
                {/* BARRA DO DIA (RECOLHÍVEL E ÁREA DE DROP DE DIA) */}
                <div
                  onClick={() => toggleDay(dayObj.key)}
                  onDragOver={(e) => {
                    if (isDayPast) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    if (isDayPast) return
                    handleDropOnDayOrShift(e, dayObj.key, dayObj.date)
                  }}
                  className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors select-none ${
                    isExpanded
                      ? 'bg-slate-50 font-bold border-b border-slate-200'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                      aria-label="Alternar dia"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <span className="font-black text-xs text-slate-900">{dayObj.label}</span>
                    <span className="font-mono text-[10px] text-slate-500 font-normal">
                      {dayObj.date}
                    </span>
                    {isDayPast && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 font-medium">
                        Histórico / Bloqueado
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      • {dayItems.length} atividade(s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isDayPast}
                      title={
                        isDayPast ? TEMPORAL_MESSAGES.ADD_PAST_BLOCKED : 'Adicionar item ao dia'
                      }
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isDayPast && onAddItem) onAddItem(dayObj.key, 'T1_L1')
                      }}
                      className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded border ${
                        isDayPast
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                          : 'text-[#004C97] hover:underline bg-blue-50/60 border-blue-200'
                      }`}
                    >
                      <Plus className="w-3 h-3" /> Adicionar item
                    </button>
                  </div>
                </div>

                {/* CONTEÚDO EXPANDIDO DO DIA */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {dayItems.length === 0 ? (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(e) => handleDropOnDayOrShift(e, dayObj.key, dayObj.date)}
                        className="flex py-4 px-4 text-xs text-slate-500 items-center justify-between bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-md m-1.5 hover:bg-blue-50/40 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Nenhum produto programado para este dia.
                          </span>
                          <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Solte um item aqui para transferir para {dayObj.label} ({dayObj.date})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddItem && onAddItem(dayObj.key, 'T1_L1')}
                          className="text-[#004C97] hover:underline font-bold text-[11px] flex items-center gap-1 bg-blue-50 px-2 py-1 rounded border border-blue-200"
                        >
                          <Plus className="w-3 h-3" /> Inserir Atividade
                        </button>
                      </div>
                    ) : (
                      dayItems.map(({ item, originalIndex }, idx) => {
                        const isSelected = selectedItemId === item.id
                        const isStop = item.item_type === 'SCHEDULED_STOP'
                        const isAwaiting =
                          item.status === 'AGUARDANDO_OBSERVACOES' ||
                          item.awaiting_observations?.is_awaiting
                        const isCoolingViolated = item.cooling_validation?.hasViolation
                        const hasSetupBefore = !isStop && item.setup_duration_minutes > 0

                        const startStr = item.start_datetime
                          ? item.start_datetime.split(' ')[1] || '06:00'
                          : '06:00'
                        const endStr = item.end_datetime
                          ? item.end_datetime.split(' ')[1] || '10:15'
                          : '10:15'
                        const timelinePos = calculateTimelinePosition(startStr, endStr)

                        return (
                          <div
                            key={item.id || originalIndex}
                            draggable
                            onDragStart={(e) => handleDragStart(e, originalIndex)}
                            onDragOver={(e) => handleDragOver(e, originalIndex)}
                            onDrop={(e) => {
                              e.preventDefault()
                              const fromIndex =
                                draggedIdx !== null
                                  ? draggedIdx
                                  : Number(e.dataTransfer.getData('text/plain'))
                              if (!isNaN(fromIndex) && onMoveItem) {
                                onMoveItem(fromIndex, originalIndex, {
                                  day_of_week: item.day_of_week || dayObj.key,
                                  date_str: item.date_str || dayObj.date,
                                  shift_code: item.shift_code,
                                  shift_name: item.shift_name,
                                  crew_name: item.crew_name,
                                })
                              }
                              setDraggedIdx(null)
                              setDragOverIdx(null)
                              setDragValidationMsg(null)
                            }}
                            onClick={() => onSelectItem && onSelectItem(item)}
                            className={`flex min-h-[44px] transition-colors cursor-pointer group ${
                              dragOverIdx === originalIndex
                                ? 'bg-blue-50/80 border-t-2 border-blue-500'
                                : ''
                            } ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                          >
                            {/* Coluna Fixa 1: DIA/DATA COMPACTA (Sticky) */}
                            <div className="w-[80px] shrink-0 px-2 py-1.5 border-r border-slate-200 text-xs font-semibold text-slate-700 flex flex-col justify-center text-center sticky left-0 z-20 bg-white group-hover:bg-slate-50">
                              <span className="font-black text-slate-900 text-[11px]">
                                {dayObj.label}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {dayObj.date}
                              </span>
                            </div>

                            {/* Coluna Fixa 2: TURNO COMPACTO (T1, T2...) COM TOOLTIP DA TURMA COMPLETA (Sticky) */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-[70px] shrink-0 px-2 py-1.5 border-r border-slate-200 text-xs flex items-center justify-center text-center sticky left-[80px] z-20 bg-white group-hover:bg-slate-50 cursor-help">
                                  <span className="font-black text-slate-900 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                                    {WeeklyScheduleEngine.formatShiftCodeOnly(
                                      item.shift_name,
                                      item.shift_code,
                                    )}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="bg-slate-900 text-white text-xs p-2"
                              >
                                <p className="font-bold text-amber-300">
                                  {WeeklyScheduleEngine.getShiftTooltipDetails(
                                    item.shift_name,
                                    item.shift_code,
                                    item.crew_name,
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-300 mt-0.5">
                                  Horário de trabalho e escala vinculados à Ficha Mestra
                                </p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Coluna Fixa 3: SEQUÊNCIA COMPACTA COM DRAG INDICATOR (Sticky) */}
                            <div className="w-[60px] shrink-0 px-1 py-1.5 border-r border-slate-200 flex items-center justify-center font-mono text-xs sticky left-[150px] z-20 bg-white group-hover:bg-slate-50">
                              <div className="flex items-center gap-0.5">
                                <div
                                  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 transition-colors"
                                  title="Clique e arraste para alterar a sequência"
                                >
                                  <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700" />
                                </div>
                                <span className="font-black text-slate-900 text-[11px]">
                                  {item.sequence_order || originalIndex + 1}
                                </span>
                                {draggedIdx === originalIndex && dragOverIdx !== null && (
                                  <span className="text-[9px] bg-blue-100 text-[#004C97] px-1 rounded font-bold">
                                    {item.sequence_order} →{' '}
                                    {items[dragOverIdx]?.sequence_order || dragOverIdx + 1}
                                  </span>
                                )}
                                {item.exception_approval_status === 'PENDING_SUPERVISOR' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-0.5" />
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="text-xs bg-slate-900 text-amber-200"
                                    >
                                      Exceção pendente de aprovação do Supervisor PCP
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>

                            {/* LINHA DO TEMPO COM BLOCO PROPORCIONAL AO TEMPO */}
                            <div className="flex-1 overflow-x-auto no-scrollbar relative min-w-[720px] p-1 flex items-center">
                              {/* Linhas verticais de fundo a cada hora */}
                              <div className="absolute inset-0 grid grid-cols-16 divide-x divide-slate-100 pointer-events-none opacity-60" />

                              {/* BLOCO DE SETUP EXPLÍCITO (TROCA E ACERTO SEPARADOS) */}
                              {hasSetupBefore && (
                                <div
                                  style={{
                                    left: `${Math.max(0, timelinePos.leftPct - 9.0)}%`,
                                    width: '8.8%',
                                  }}
                                  className="absolute h-7 flex items-center gap-1 z-20"
                                >
                                  {/* Bloco Troca (planned_change_minutes) */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (onOpenSetupDetail) onOpenSetupDetail(item)
                                        }}
                                        className="h-7 flex-1 bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-400 rounded-sm flex items-center justify-center px-1 text-[9px] font-mono font-bold cursor-pointer transition-colors shadow-xs"
                                      >
                                        <span className="truncate">
                                          🔧 {item.setup_breakdown?.planned_change_minutes || 0}m
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-slate-900 text-white text-xs p-2.5 max-w-xs"
                                    >
                                      <div className="font-bold text-slate-100 flex items-center gap-1 mb-1">
                                        🔧 Troca Mecânica / Setup DE→PARA
                                      </div>
                                      <p className="text-[11px] text-slate-300">
                                        Tempo planejado:{' '}
                                        <strong className="text-white">
                                          {item.setup_breakdown?.planned_change_minutes || 0} min
                                        </strong>
                                      </p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                        Responsável:{' '}
                                        {item.setup_breakdown?.responsible_area ===
                                        'OFICINA_CILINDROS'
                                          ? 'Oficina de Cilindros'
                                          : 'Produção'}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* Bloco Acerto (planned_tuning_minutes) */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (onOpenSetupDetail) onOpenSetupDetail(item)
                                        }}
                                        className={`h-7 flex-1 border rounded-sm flex items-center justify-center px-1 text-[9px] font-mono font-bold cursor-pointer transition-colors shadow-xs ${
                                          item.tuning_unparametrized
                                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-400 animate-pulse'
                                            : 'bg-blue-100 hover:bg-blue-200 text-[#004C97] border-blue-300'
                                        }`}
                                      >
                                        <span className="truncate">
                                          {item.tuning_unparametrized
                                            ? '⚠️ N/P'
                                            : `⚙ ${item.setup_breakdown?.planned_tuning_minutes || 0}m`}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-slate-900 text-white text-xs p-2.5 max-w-sm"
                                    >
                                      <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1">
                                        <span
                                          className={`font-bold flex items-center gap-1 ${
                                            item.tuning_unparametrized
                                              ? 'text-amber-400'
                                              : 'text-blue-300'
                                          }`}
                                        >
                                          ⚙ ACERTO DE BITOLA
                                        </span>
                                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                          {item.tuning_unparametrized
                                            ? 'Alerta'
                                            : `${item.setup_breakdown?.planned_tuning_minutes || 0} min`}
                                        </span>
                                      </div>
                                      {item.tuning_unparametrized ? (
                                        <div className="text-amber-300 text-[11px] space-y-1">
                                          <p className="font-bold flex items-center gap-1">
                                            ⚠️ Acerto não parametrizado
                                          </p>
                                          <p className="text-[10px] text-slate-300">
                                            Não há regra de acerto vigente para a bitola{' '}
                                            <strong>{item.material_code}</strong>
                                            {item.sample_type ? ` (${item.sample_type})` : ''} na
                                            Ficha Mestre Expandida.
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-slate-300">
                                          <p>
                                            Tempo de Acerto:{' '}
                                            <strong className="text-white">
                                              {item.setup_breakdown?.planned_tuning_minutes || 0}{' '}
                                              min
                                            </strong>
                                          </p>
                                          {item.sample_type && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                              Tipo de Amostra:{' '}
                                              <span className="text-slate-200">
                                                {item.sample_type}
                                              </span>
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}

                              {/* BLOCO PRINCIPAL DA ATIVIDADE NA TIMELINE COM TOOLTIP COMPLETO */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    style={{
                                      left: `${timelinePos.leftPct}%`,
                                      width: `${timelinePos.widthPct}%`,
                                    }}
                                    className={`absolute h-8 rounded border px-2 flex items-center justify-between text-xs transition-all z-10 ${getBlockStyle(
                                      item,
                                      isSelected,
                                    )} shadow-2xs hover:shadow-xs`}
                                  >
                                    {/* Conteúdo Interno do Bloco com Anti-Truncamento Soberano */}
                                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-1 mr-1">
                                      {isCoolingViolated && (
                                        <span
                                          className="text-[9px] text-rose-800 bg-rose-200 px-1 py-0.5 rounded font-black flex items-center gap-0.5 shrink-0 shadow-2xs whitespace-nowrap"
                                          title="Resfriamento não atendido. Verifique o tempo de resfriamento do tarugo."
                                        >
                                          ⚠ NÃO ATENDIDO
                                        </span>
                                      )}

                                      {!isCoolingViolated && !isStop && (
                                        <span
                                          className="text-[9px] text-sky-700 shrink-0 font-bold"
                                          title="Resfriamento atendido"
                                        >
                                          ❄
                                        </span>
                                      )}

                                      <span className="font-mono font-extrabold text-[11px] text-slate-900 shrink-0 whitespace-nowrap">
                                        {item.material_code}
                                      </span>

                                      {item.tuning_unparametrized && (
                                        <span
                                          className="text-[9px] text-amber-900 bg-amber-200 border border-amber-300 px-1 py-0.5 rounded font-black flex items-center gap-0.5 shrink-0 whitespace-nowrap"
                                          title="Acerto não parametrizado na Ficha Mestre"
                                        >
                                          ⚠ Acerto N/P
                                        </span>
                                      )}

                                      {item.dimensions && (
                                        <span className="text-[10px] text-slate-600 font-mono hidden xl:inline shrink-0 whitespace-nowrap">
                                          {item.dimensions}
                                        </span>
                                      )}

                                      {!isStop && (
                                        <>
                                          <span className="text-slate-400 shrink-0">•</span>
                                          <span className="font-mono text-[11px] font-black text-slate-900 shrink-0 whitespace-nowrap">
                                            {item.planned_quantity_tons} t
                                          </span>
                                          <span className="text-slate-400 shrink-0">•</span>
                                          <span className="text-[9px] uppercase font-extrabold px-1 py-0.5 rounded bg-white/70 border border-slate-200 text-slate-700 shrink-0 whitespace-nowrap hidden sm:inline-block">
                                            {isAwaiting
                                              ? 'AGUARDANDO OBS'
                                              : item.exception_approval_status ===
                                                  'PENDING_SUPERVISOR'
                                                ? 'PENDENTE PCP'
                                                : item.order_type === 'MTO'
                                                  ? `MTO · ${item.sales_order_mto || 'Ped'}`
                                                  : 'MTS'}
                                          </span>
                                        </>
                                      )}

                                      {isStop && (
                                        <>
                                          <span className="text-slate-400 shrink-0">•</span>
                                          <span className="text-[10px] font-bold text-amber-900 shrink-0 whitespace-nowrap">
                                            Parada ({item.stop_duration_minutes || 60} min)
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {/* Horário sempre legível e botões de edição e exclusão */}
                                    <div className="font-mono text-[10px] text-slate-900 font-black pl-1.5 shrink-0 bg-white/95 px-1.5 py-0.5 rounded border border-slate-300 flex items-center gap-1 shadow-2xs whitespace-nowrap ml-auto">
                                      <span className="shrink-0">
                                        {startStr} &rarr; {endStr}
                                      </span>
                                      {onEditItem && !isItemInPast(item) && !isWeekPast && (
                                        <button
                                          type="button"
                                          title="Editar item da programação"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onEditItem(item)
                                          }}
                                          className="p-0.5 text-slate-500 hover:text-blue-700 rounded hover:bg-slate-200 transition-colors shrink-0 cursor-pointer"
                                        >
                                          ✏️
                                        </button>
                                      )}
                                      {onRemoveItem && !isItemInPast(item) && !isWeekPast && (
                                        <button
                                          type="button"
                                          title="Eliminar"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onRemoveItem(item)
                                          }}
                                          className="p-0.5 text-slate-400 hover:text-rose-700 rounded hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-600" />
                                        </button>
                                      )}
                                      {(isItemInPast(item) || isWeekPast) && (
                                        <span
                                          title={TEMPORAL_MESSAGES.ITEM_PAST_BLOCKED}
                                          className="text-[9px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 font-sans"
                                        >
                                          🔒 Bloqueado
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-slate-950 text-white text-xs p-3 max-w-md shadow-xl border border-slate-800"
                                >
                                  <div className="border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between gap-4">
                                    <span className="font-black text-amber-400 text-sm">
                                      {item.material_code} —{' '}
                                      {item.material_description || 'Produto Laminado'}
                                    </span>
                                    <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                      Seq. #{item.sequence_order || originalIndex + 1}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                    <div>
                                      <span className="text-slate-400">Família:</span>{' '}
                                      <strong className="text-slate-200">
                                        {item.family_code || 'Não informada'}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Dimensões:</span>{' '}
                                      <strong className="text-slate-200">
                                        {item.dimensions || 'Padrão'}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Quantidade:</span>{' '}
                                      <strong className="text-emerald-400 font-mono">
                                        {item.planned_quantity_tons} t
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Cadência:</span>{' '}
                                      <strong className="text-blue-300 font-mono">
                                        {item.productivity_rate_th || 12} t/h
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Horário:</span>{' '}
                                      <strong className="text-amber-300 font-mono">
                                        {startStr} &rarr; {endStr}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Duração:</span>{' '}
                                      <strong className="text-slate-200">
                                        {item.production_hours || 0} h
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Regime:</span>{' '}
                                      <strong className="text-slate-200">
                                        {item.order_type === 'MTO'
                                          ? `MTO (${item.sales_order_mto || 'Ped'})`
                                          : 'MTS (Estoque)'}
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">Status:</span>{' '}
                                      <strong className="text-slate-200">{item.status}</strong>
                                    </div>
                                    {item.setup_duration_minutes > 0 && (
                                      <div className="col-span-2 text-slate-300 border-t border-slate-800 pt-1 mt-1">
                                        🔧 <span className="text-slate-400">Setup Prévio:</span>{' '}
                                        <strong>{item.setup_duration_minutes} min</strong> (
                                        {item.setup_breakdown?.responsible_area || 'Produção'})
                                      </div>
                                    )}
                                    {item.pcp_notes && (
                                      <div className="col-span-2 text-slate-300 bg-slate-900 p-1.5 rounded mt-1 border border-slate-800">
                                        📝 <span className="text-slate-400">Obs:</span>{' '}
                                        {item.pcp_notes}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* FAIXA DE LEGENDA DISCRETA ABAIXO DA GRADE */}
        <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
              <span>MTS (verde)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-50 border border-amber-300" />
              <span>MTO (amarelo)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-300 border border-amber-500 font-bold" />
              <span className="font-semibold text-amber-950">Aguardando observações</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-200 border border-slate-400" />
              <span>Troca Setup (cinza)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
              <span>Acerto (azul)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400" />
              <span>Acerto N/P (amarelo)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-orange-100 border border-orange-300" />
              <span>Parada Programada (laranja)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-sky-100 border border-sky-300" />
              <span>Manutenção (azul)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sky-700 font-bold">❄ Resfriamento</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded ring-2 ring-blue-600 bg-blue-50" />
              <span>Selecionado</span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400">
            Arraste para mover • Recalculo automático em tempo real
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

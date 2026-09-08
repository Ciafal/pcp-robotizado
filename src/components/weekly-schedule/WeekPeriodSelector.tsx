import React, { useState } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  History,
  Check,
  Clock,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getWeekDateRange,
  isWeekInPast,
  getCurrentPlantIsoWeek,
  getIsoWeekAndYear,
} from '@/lib/temporal-utils'

interface WeekPeriodSelectorProps {
  currentYear: number
  currentWeekNumber: number
  onSelectWeek: (year: number, weekNumber: number) => void
  disabled?: boolean
}

export const WeekPeriodSelector: React.FC<WeekPeriodSelectorProps> = ({
  currentYear,
  currentWeekNumber,
  onSelectWeek,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const [selectorYear, setSelectorYear] = useState<number>(currentYear)

  const plantIso = getCurrentPlantIsoWeek()
  const activeRange = getWeekDateRange(currentYear, currentWeekNumber)
  const isSelectedHistorical = isWeekInPast(currentYear, currentWeekNumber)
  const isSelectedCurrent = currentYear === plantIso.year && currentWeekNumber === plantIso.week

  // Gera lista de 52/53 semanas para o ano do seletor
  const weeksList = Array.from({ length: 52 }, (_, i) => {
    const w = i + 1
    const range = getWeekDateRange(selectorYear, w)
    const isPast = isWeekInPast(selectorYear, w)
    const isCurrent = selectorYear === plantIso.year && w === plantIso.week
    const isSelected = selectorYear === currentYear && w === currentWeekNumber

    return {
      weekNumber: w,
      year: selectorYear,
      rangeDisplay: range.display,
      isPast,
      isCurrent,
      isSelected,
    }
  })

  const handlePickWeek = (year: number, week: number) => {
    onSelectWeek(year, week)
    setOpen(false)
  }

  // Permite selecionar data via input de data para ir direto para a semana dela
  const handleDatePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value
    if (!dateVal) return
    const [y, m, d] = dateVal.split('-').map(Number)
    const parsed = new Date(y, m - 1, d)
    if (!isNaN(parsed.getTime())) {
      const iso = getIsoWeekAndYear(parsed)
      onSelectWeek(iso.year, iso.week)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all shadow-xs ${
            isSelectedHistorical
              ? 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              : isSelectedCurrent
                ? 'bg-emerald-50/60 border-emerald-300/80 text-emerald-900 hover:bg-emerald-50'
                : 'bg-white border-[#004C97]/30 text-[#004C97] hover:bg-sky-50/50 hover:border-[#004C97]/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title="Clique para selecionar semana e período"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-[#004C97]" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-normal">Período:</span>
            <span className="font-bold text-[#004C97] text-slate-800">
              S{String(currentWeekNumber).padStart(2, '0')}/{currentYear} ({activeRange.display})
            </span>
          </div>
          {isSelectedHistorical ? (
            <Badge
              variant="outline"
              className="ml-1 bg-slate-100 text-slate-600 border-slate-300 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 font-medium"
            >
              <History className="w-2.5 h-2.5 text-slate-500" />
              Somente Leitura
            </Badge>
          ) : isSelectedCurrent ? (
            <Badge
              variant="outline"
              className="ml-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 font-medium"
            >
              <Clock className="w-2.5 h-2.5 text-emerald-600" />
              Semana Atual
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="ml-1 bg-sky-50 text-sky-700 border-sky-200 text-[10px] px-1.5 py-0 h-4 font-medium"
            >
              Futura
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[380px] p-0 bg-white border-slate-200 text-slate-800 shadow-xl z-50 rounded-lg overflow-hidden"
      >
        <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-[#004C97]" />
            <span className="text-xs font-bold text-slate-900">Seletor de Período & Semana</span>
          </div>

          {/* Controle de Ano */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              onClick={() => setSelectorYear((prev) => prev - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-bold text-[#004C97] px-1">{selectorYear}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              onClick={() => setSelectorYear((prev) => prev + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Atalhos Rápidos */}
        <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 text-[11px]">
          <button
            type="button"
            className="text-xs font-semibold text-[#004C97] hover:underline flex items-center gap-1"
            onClick={() => {
              setSelectorYear(plantIso.year)
              handlePickWeek(plantIso.year, plantIso.week)
            }}
          >
            Ir para Semana Atual (S{String(plantIso.week).padStart(2, '0')})
          </button>

          {/* Selecionar por data específica */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-[10px]">Data:</span>
            <input
              type="date"
              onChange={handleDatePicked}
              className="h-6 px-1.5 text-[10px] bg-slate-50 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#004C97]"
            />
          </div>
        </div>

        {/* Lista de Semanas */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
          {weeksList.map((w) => {
            return (
              <button
                key={`${w.year}-W${w.weekNumber}`}
                type="button"
                onClick={() => handlePickWeek(w.year, w.weekNumber)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors text-xs ${
                  w.isSelected
                    ? 'bg-[#004C97] text-white font-semibold shadow-xs'
                    : w.isPast
                      ? 'text-slate-500 hover:bg-slate-100'
                      : 'text-slate-800 hover:bg-sky-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] ${
                      w.isSelected
                        ? 'text-white font-bold'
                        : w.isCurrent
                          ? 'text-emerald-700 font-bold'
                          : w.isPast
                            ? 'text-slate-500 font-medium'
                            : 'text-[#004C97] font-semibold'
                    }`}
                  >
                    S{String(w.weekNumber).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-[11px] ${w.isSelected ? 'text-blue-100' : 'text-slate-500'}`}
                  >
                    {w.rangeDisplay}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {w.isCurrent && (
                    <Badge
                      variant="outline"
                      className={`${
                        w.isSelected
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      } text-[9px] px-1 py-0 h-3.5`}
                    >
                      Atual
                    </Badge>
                  )}
                  {w.isPast ? (
                    <Badge
                      variant="outline"
                      className={`${
                        w.isSelected
                          ? 'bg-white/20 text-white border-white/40'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      } text-[9px] px-1 py-0 h-3.5`}
                    >
                      Histórico
                    </Badge>
                  ) : !w.isCurrent ? (
                    <Badge
                      variant="outline"
                      className={`${
                        w.isSelected
                          ? 'bg-white/20 text-white border-white/40'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      } text-[9px] px-1 py-0 h-3.5`}
                    >
                      Futura
                    </Badge>
                  ) : null}

                  {w.isSelected && <Check className="w-3.5 h-3.5 text-white ml-1" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Rodapé explicativo */}
        <div className="p-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-600 text-center font-medium">
          Semanas passadas: somente leitura · Semanas futuras: totalmente programáveis
        </div>
      </PopoverContent>{' '}
    </Popover>
  )
}

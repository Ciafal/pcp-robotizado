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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${
            isSelectedHistorical
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              : isSelectedCurrent
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-pantone-2945/15 border-pantone-2945/40 text-cyan-300 hover:bg-pantone-2945/25'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          title="Clique para selecionar semana e período"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-pantone-2945" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Período:</span>
            <span className="font-bold text-white">
              S{String(currentWeekNumber).padStart(2, '0')}/{currentYear} ({activeRange.display})
            </span>
          </div>
          {isSelectedHistorical ? (
            <Badge
              variant="outline"
              className="ml-1 bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1"
            >
              <History className="w-2.5 h-2.5" />
              Somente Leitura
            </Badge>
          ) : isSelectedCurrent ? (
            <Badge
              variant="outline"
              className="ml-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1"
            >
              <Clock className="w-2.5 h-2.5" />
              Semana Atual
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="ml-1 bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-[10px] px-1.5 py-0 h-4"
            >
              Futura
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[380px] p-0 bg-slate-900 border-slate-700 text-slate-100 shadow-2xl z-50"
      >
        <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-pantone-2945" />
            <span className="text-xs font-semibold text-slate-200">
              Seletor de Período & Semana
            </span>
          </div>

          {/* Controle de Ano */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              onClick={() => setSelectorYear((prev) => prev - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-bold text-slate-100 px-1">{selectorYear}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              onClick={() => setSelectorYear((prev) => prev + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Atalhos Rápidos */}
        <div className="px-3 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-2 text-[11px]">
          <button
            type="button"
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
            onClick={() => {
              setSelectorYear(plantIso.year)
              handlePickWeek(plantIso.year, plantIso.week)
            }}
          >
            Ir para Semana Atual (S{String(plantIso.week).padStart(2, '0')})
          </button>

          {/* Selecionar por data específica */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">Data:</span>
            <input
              type="date"
              onChange={handleDatePicked}
              className="h-6 px-1 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-pantone-2945"
            />
          </div>
        </div>

        {/* Lista de Semanas */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
          {weeksList.map((w) => {
            return (
              <button
                key={`${w.year}-W${w.weekNumber}`}
                type="button"
                onClick={() => handlePickWeek(w.year, w.weekNumber)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors text-xs ${
                  w.isSelected
                    ? 'bg-pantone-2945/25 text-white font-semibold border border-pantone-2945/50'
                    : w.isPast
                      ? 'text-slate-400 hover:bg-slate-800/60'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] ${
                      w.isSelected
                        ? 'text-cyan-400 font-bold'
                        : w.isCurrent
                          ? 'text-emerald-400 font-bold'
                          : w.isPast
                            ? 'text-amber-500/80'
                            : 'text-slate-300'
                    }`}
                  >
                    S{String(w.weekNumber).padStart(2, '0')}
                  </span>
                  <span className="text-slate-400 text-[11px]">{w.rangeDisplay}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {w.isCurrent && (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] px-1 py-0 h-3.5"
                    >
                      Atual
                    </Badge>
                  )}
                  {w.isPast ? (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-400/90 border-amber-500/20 text-[9px] px-1 py-0 h-3.5"
                    >
                      Histórico
                    </Badge>
                  ) : !w.isCurrent ? (
                    <Badge
                      variant="outline"
                      className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px] px-1 py-0 h-3.5"
                    >
                      Futura
                    </Badge>
                  ) : null}

                  {w.isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 ml-1" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Rodapé explicativo */}
        <div className="p-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 text-center">
          Semanas passadas: somente leitura · Semanas futuras: totalmente programáveis
        </div>
      </PopoverContent>
    </Popover>
  )
}

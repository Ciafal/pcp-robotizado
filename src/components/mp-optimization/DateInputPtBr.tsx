import React, { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface DateInputPtBrProps {
  id?: string
  label?: string
  value: string // Formato DD/MM/AAAA ou string parcial/vazia
  onChange: (val: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  hasError?: boolean
}

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const WEEKDAY_NAMES_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Validador e conversor de data pt-BR DD/MM/AAAA para objeto Date
 */
export function parseDatePtBr(value: string): Date | null {
  if (!value || typeof value !== 'string') return null
  const cleaned = value.trim()
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(cleaned)
  if (!match) return null

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)

  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  if (year < 1900 || year > 2100) return null

  // Validação real de dias do mês (incluindo ano bissexto)
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day > daysInMonth) return null

  const d = new Date(year, month - 1, day, 12, 0, 0, 0)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Converte Date para string DD/MM/AAAA
 */
export function formatDatePtBr(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Aplica máscara progressiva DD/MM/AAAA ao digitar
 */
export function applyDateMask(raw: string): string {
  // Mantém apenas dígitos
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) {
    return digits
  }
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

export const DateInputPtBr: React.FC<DateInputPtBrProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  disabled = false,
  className,
  hasError = false,
}) => {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')

  // Sincroniza estado interno caso prop mude externamente
  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  const parsedCurrent = parseDatePtBr(value)
  const today = new Date()

  // Mês e ano exibidos no mini-calendário
  const [viewYear, setViewYear] = useState<number>(
    parsedCurrent ? parsedCurrent.getFullYear() : today.getFullYear(),
  )
  const [viewMonth, setViewMonth] = useState<number>(
    parsedCurrent ? parsedCurrent.getMonth() : today.getMonth(),
  )

  // Quando o popover abre, foca no mês da data se válida
  useEffect(() => {
    if (open) {
      if (parsedCurrent) {
        setViewYear(parsedCurrent.getFullYear())
        setViewMonth(parsedCurrent.getMonth())
      } else {
        setViewYear(today.getFullYear())
        setViewMonth(today.getMonth())
      }
    }
  }, [open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyDateMask(e.target.value)
    setInputValue(masked)
    onChange(masked)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setInputValue('')
    onChange('')
  }

  const handleSelectDay = (dayNum: number) => {
    const selected = new Date(viewYear, viewMonth, dayNum, 12, 0, 0, 0)
    const formatted = formatDatePtBr(selected)
    setInputValue(formatted)
    onChange(formatted)
    setOpen(false)
  }

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  // Geração da grade de dias do mês
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay() // 0 = Domingo
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const calendarDays: Array<{
    day: number
    isCurrentMonth: boolean
    date: Date
  }> = []

  // Dias do mês anterior para preencher a primeira semana
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1
    const prevYearVal = viewMonth === 0 ? viewYear - 1 : viewYear
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(prevYearVal, prevMonthIdx, d, 12, 0, 0),
    })
  }

  // Dias do mês corrente
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    calendarDays.push({
      day: d,
      isCurrentMonth: true,
      date: new Date(viewYear, viewMonth, d, 12, 0, 0),
    })
  }

  // Preenche até fechar múltiplo de 7 (até 35 ou 42)
  const remainingCells = (7 - (calendarDays.length % 7)) % 7
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1
    const nextYearVal = viewMonth === 11 ? viewYear + 1 : viewYear
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(nextYearVal, nextMonthIdx, d, 12, 0, 0),
    })
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      <div className="relative w-full">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          maxLength={10}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'h-8 text-xs bg-slate-50 pr-14 pl-2.5 font-mono text-slate-800 transition-colors',
            hasError ? 'border-rose-400 focus-visible:ring-rose-400 bg-rose-50/30' : '',
          )}
          aria-label={label || 'Data DD/MM/AAAA'}
        />

        {/* Botão de Limpeza Individual */}
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
            title="Limpar data"
            aria-label="Limpar data"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Botão Popover Calendário pt-BR */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-500 hover:text-[#004C97] hover:bg-slate-200 p-0"
              title="Abrir calendário (pt-BR)"
              aria-label="Abrir calendário"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-64 p-3 bg-white border border-slate-200 shadow-lg rounded-lg z-50 text-xs"
            align="end"
            sideOffset={4}
          >
            {/* Cabeçalho do Calendário: Mês e Ano por extenso em pt-BR + Navegação */}
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-6 w-6 text-slate-600 hover:text-slate-900"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="font-semibold text-slate-900 text-xs">
                {MONTH_NAMES_PT[viewMonth]} {viewYear}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-6 w-6 text-slate-600 hover:text-slate-900"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Dias da semana em pt-BR */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAY_NAMES_PT.map((w, idx) => (
                <span
                  key={w}
                  className={cn(
                    'text-[10px] font-bold',
                    idx === 0 ? 'text-rose-600' : 'text-slate-400',
                  )}
                >
                  {w}
                </span>
              ))}
            </div>

            {/* Grade de dias */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((c, index) => {
                const isSelected =
                  parsedCurrent &&
                  parsedCurrent.getFullYear() === c.date.getFullYear() &&
                  parsedCurrent.getMonth() === c.date.getMonth() &&
                  parsedCurrent.getDate() === c.date.getDate()

                const isToday =
                  today.getFullYear() === c.date.getFullYear() &&
                  today.getMonth() === c.date.getMonth() &&
                  today.getDate() === c.date.getDate()

                return (
                  <button
                    key={`${c.date.toISOString()}-${index}`}
                    type="button"
                    onClick={() => {
                      if (!c.isCurrentMonth) {
                        setViewMonth(c.date.getMonth())
                        setViewYear(c.date.getFullYear())
                      }
                      const formatted = formatDatePtBr(c.date)
                      setInputValue(formatted)
                      onChange(formatted)
                      setOpen(false)
                    }}
                    className={cn(
                      'h-7 w-7 rounded-md flex items-center justify-center font-mono text-[11px] transition-colors',
                      !c.isCurrentMonth && 'text-slate-300 hover:bg-slate-50',
                      c.isCurrentMonth && 'text-slate-700 hover:bg-blue-50 hover:text-[#004C97]',
                      isToday && !isSelected && 'border border-blue-400 font-bold text-[#004C97]',
                      isSelected &&
                        'bg-[#004C97] text-white font-bold hover:bg-[#003870] hover:text-white',
                    )}
                  >
                    {c.day}
                  </button>
                )
              })}
            </div>

            {/* Botão Hoje / Limpar */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  const formatted = formatDatePtBr(now)
                  setInputValue(formatted)
                  onChange(formatted)
                  setOpen(false)
                }}
                className="text-blue-700 hover:underline font-semibold"
              >
                Hoje ({formatDatePtBr(new Date())})
              </button>

              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('')
                    onChange('')
                    setOpen(false)
                  }}
                  className="text-slate-500 hover:text-rose-600"
                >
                  Limpar
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export default DateInputPtBr

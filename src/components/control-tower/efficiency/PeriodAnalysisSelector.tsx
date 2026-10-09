import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  RotateCcw,
  Search,
  Loader2,
  CalendarDays,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PeriodAnalysisType,
  getPeriodDateRange,
  formatIsoPeriodLabel,
  getCurrentPlantIsoWeek,
  getIsoWeeksInYear,
  getWeekDateRange,
} from '@/lib/temporal-utils'
import {
  DateInputPtBr,
  formatDatePtBr,
  parseDatePtBr,
} from '@/components/mp-optimization/DateInputPtBr'
import { cn } from '@/lib/utils'

export interface PeriodSelectionValue {
  type: PeriodAnalysisType
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  startDatePtBr: string // DD/MM/AAAA
  endDatePtBr: string // DD/MM/AAAA
  week?: number
  year?: number
  displayLabel: string
}

export interface PeriodAnalysisSelectorProps {
  value?: Partial<PeriodSelectionValue>
  onChange?: (val: PeriodSelectionValue) => void
  onApply?: (val: PeriodSelectionValue) => void
  onReset?: () => void
  isLoading?: boolean
  className?: string
  showBanner?: boolean
}

const PERIOD_TYPES: { type: PeriodAnalysisType; label: string }[] = [
  { type: 'ONTEM', label: 'Ontem' },
  { type: 'HOJE', label: 'Hoje' },
  { type: 'SEMANA', label: 'Semana' },
  { type: 'MES', label: 'Mês' },
  { type: 'ANO', label: 'Ano' },
  { type: 'PERSONALIZADO', label: 'Personalizado' },
]

export const PeriodAnalysisSelector: React.FC<PeriodAnalysisSelectorProps> = ({
  value,
  onChange,
  onApply,
  onReset,
  isLoading = false,
  className,
  showBanner = true,
}) => {
  const currentPlantWeek = useMemo(() => getCurrentPlantIsoWeek(), [])

  // Estado interno dos filtros de período
  const [activeType, setActiveType] = useState<PeriodAnalysisType>(value?.type || 'HOJE')
  const [selectedYear, setSelectedYear] = useState<number>(value?.year || currentPlantWeek.year)
  const [selectedWeek, setSelectedWeek] = useState<number>(value?.week || currentPlantWeek.week)

  // Para Personalizado: DD/MM/AAAA
  const [customStart, setCustomStart] = useState<string>(() => {
    if (value?.startDatePtBr) return value.startDatePtBr
    if (value?.startDate) {
      const p = new Date(value.startDate)
      if (!isNaN(p.getTime())) return formatDatePtBr(p)
    }
    return formatDatePtBr(new Date())
  })

  const [customEnd, setCustomEnd] = useState<string>(() => {
    if (value?.endDatePtBr) return value.endDatePtBr
    if (value?.endDate) {
      const p = new Date(value.endDate)
      if (!isNaN(p.getTime())) return formatDatePtBr(p)
    }
    return formatDatePtBr(new Date())
  })

  // Validação: fim >= início no personalizado
  const customDatesInvalid = useMemo(() => {
    if (activeType !== 'PERSONALIZADO') return false
    const s = parseDatePtBr(customStart)
    const e = parseDatePtBr(customEnd)
    if (!s || !e) return true
    return e.getTime() < s.getTime()
  }, [activeType, customStart, customEnd])

  // Lista de anos para o select (ano atual - 3 até ano atual + 2)
  const availableYears = useMemo(() => {
    const list: number[] = []
    const y = currentPlantWeek.year
    for (let i = y - 3; i <= y + 2; i++) {
      list.push(i)
    }
    return list
  }, [currentPlantWeek.year])

  // Semanas disponíveis no ano selecionado
  const totalWeeksInSelectedYear = useMemo(() => {
    return getIsoWeeksInYear(selectedYear)
  }, [selectedYear])

  const weeksList = useMemo(() => {
    const arr: number[] = []
    for (let w = 1; w <= totalWeeksInSelectedYear; w++) {
      arr.push(w)
    }
    return arr
  }, [totalWeeksInSelectedYear])

  // Ajusta semana caso o ano tenha menos semanas que a selecionada
  useEffect(() => {
    if (selectedWeek > totalWeeksInSelectedYear) {
      setSelectedWeek(totalWeeksInSelectedYear)
    }
  }, [totalWeeksInSelectedYear, selectedWeek])

  // Calcula o intervalo de datas atual
  const computedRange = useMemo(() => {
    let opt: any = {}
    if (activeType === 'SEMANA') {
      opt = { year: selectedYear, week: selectedWeek }
    } else if (activeType === 'MES') {
      opt = { year: selectedYear }
    } else if (activeType === 'ANO') {
      opt = { year: selectedYear }
    } else if (activeType === 'PERSONALIZADO') {
      opt = {
        customStartDate: customStart,
        customEndDate: customEnd,
      }
    }
    const r = getPeriodDateRange(activeType, opt)
    const pad = (n: number) => String(n).padStart(2, '0')
    const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    return {
      startDate: toIsoDate(r.startDate),
      endDate: toIsoDate(r.endDate),
      startDatePtBr: formatDatePtBr(r.startDate),
      endDatePtBr: formatDatePtBr(r.endDate),
      rawStartDate: r.startDate,
      rawEndDate: r.endDate,
      label: formatIsoPeriodLabel(r.startDate, r.endDate),
    }
  }, [activeType, selectedYear, selectedWeek, customStart, customEnd])

  // Notifica onChange quando parâmetros mudam
  const emitCurrentSelection = useCallback(
    (overrides?: Partial<PeriodSelectionValue>) => {
      const selection: PeriodSelectionValue = {
        type: activeType,
        startDate: computedRange.startDate,
        endDate: computedRange.endDate,
        startDatePtBr: computedRange.startDatePtBr,
        endDatePtBr: computedRange.endDatePtBr,
        week: activeType === 'SEMANA' ? selectedWeek : undefined,
        year:
          activeType === 'SEMANA' || activeType === 'MES' || activeType === 'ANO'
            ? selectedYear
            : undefined,
        displayLabel: computedRange.label,
        ...overrides,
      }
      if (onChange) {
        onChange(selection)
      }
      return selection
    },
    [activeType, computedRange, selectedWeek, selectedYear, onChange],
  )

  // Ao alterar activeType
  const handleTypeSelect = (type: PeriodAnalysisType) => {
    setActiveType(type)
    if (type === 'SEMANA') {
      setSelectedYear(currentPlantWeek.year)
      setSelectedWeek(currentPlantWeek.week)
    }
  }

  // Ações Aplicar e Limpar
  const handleApplyClick = () => {
    const payload = emitCurrentSelection()
    if (onApply) {
      onApply(payload)
    }
  }

  const handleResetClick = () => {
    setActiveType('HOJE')
    setSelectedYear(currentPlantWeek.year)
    setSelectedWeek(currentPlantWeek.week)
    const todayStr = formatDatePtBr(new Date())
    setCustomStart(todayStr)
    setCustomEnd(todayStr)

    const r = getPeriodDateRange('HOJE')
    const pad = (n: number) => String(n).padStart(2, '0')
    const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    const resetPayload: PeriodSelectionValue = {
      type: 'HOJE',
      startDate: toIsoDate(r.startDate),
      endDate: toIsoDate(r.endDate),
      startDatePtBr: formatDatePtBr(r.startDate),
      endDatePtBr: formatDatePtBr(r.endDate),
      displayLabel: formatIsoPeriodLabel(r.startDate, r.endDate),
    }

    if (onChange) onChange(resetPayload)
    if (onReset) onReset()
    if (onApply) onApply(resetPayload)
  }

  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3.5 text-slate-900',
        className,
      )}
      data-testid="period-analysis-selector"
    >
      {/* CABEÇALHO DO BLOCO DE PERÍODO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <CalendarDays className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">Período de Análise</h3>
            <p className="text-[11px] text-slate-500">
              Filtro temporal integrado: Ontem &bull; Hoje &bull; Semana &bull; Mês &bull; Ano
              &bull; Personalizado
            </p>
          </div>
        </div>

        {/* Botões de Ação Aplicar e Limpar */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetClick}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5 font-medium transition-colors"
            title="Voltar o período para Hoje"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Limpar filtros</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleApplyClick}
            disabled={isLoading || customDatesInvalid}
            className="h-8 px-3 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold shadow-xs gap-1.5 transition-colors disabled:opacity-50"
            title="Aplicar filtros de período nas consultas oficiais"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Aplicando...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Aplicar filtros</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* LINHA 1: BOTÕES DE ATALHO DE PERÍODO (Responsivo, wrap em mobile sem scroll horizontal na tela) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {PERIOD_TYPES.map((pt) => {
          const isActive = activeType === pt.type
          return (
            <button
              key={pt.type}
              type="button"
              onClick={() => handleTypeSelect(pt.type)}
              className={cn(
                'h-8 px-3 rounded-lg text-xs transition-colors shrink-0',
                isActive
                  ? 'bg-[#004C97] text-white shadow-xs font-semibold'
                  : 'bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-medium',
              )}
              data-testid={`period-btn-${pt.type.toLowerCase()}`}
            >
              {pt.label}
            </button>
          )
        })}
      </div>

      {/* LINHA 2 CONDICIONAL: QUANDO SEMANA */}
      {activeType === 'SEMANA' && (
        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-slate-100 bg-slate-50/60 p-2.5 rounded-lg"
          data-testid="period-line2-semana"
        >
          {/* Seletor de Semana */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Semana:</span>
            <Select
              value={String(selectedWeek)}
              onValueChange={(val) => setSelectedWeek(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium flex-1">
                <SelectValue placeholder="Selecione a semana" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {weeksList.map((w) => {
                  const pad = (n: number) => String(n).padStart(2, '0')
                  const range = getWeekDateRange(selectedYear, w)
                  return (
                    <SelectItem key={w} value={String(w)}>
                      Semana {pad(w)}/{selectedYear} ({range.display})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Ano */}
          <div className="flex items-center gap-2 w-full sm:w-44">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Ano:</span>
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(Number(val))}
            >
              <SelectTrigger className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium flex-1">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((yr) => (
                  <SelectItem key={yr} value={String(yr)}>
                    {yr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* LINHA 2 CONDICIONAL: QUANDO PERSONALIZADO */}
      {activeType === 'PERSONALIZADO' && (
        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100 bg-slate-50/60 p-2.5 rounded-lg"
          data-testid="period-line2-personalizado"
        >
          {/* Período Início */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Período início:
            </span>
            <DateInputPtBr
              value={customStart}
              onChange={setCustomStart}
              className="flex-1"
              hasError={customDatesInvalid}
            />
          </div>

          {/* Período Fim */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Período fim:
            </span>
            <DateInputPtBr
              value={customEnd}
              onChange={setCustomEnd}
              className="flex-1"
              hasError={customDatesInvalid}
            />
          </div>

          {customDatesInvalid && (
            <span className="text-[11px] text-rose-600 font-medium">
              A data final deve ser posterior ou igual à inicial.
            </span>
          )}
        </div>
      )}

      {/* BANNER DO PERÍODO ANALISADO:
          "Período analisado: dd/mm/aaaa a dd/mm/aaaa — Semana 41/2026" */}
      {showBanner && (
        <div
          className="flex items-center gap-2 bg-[#004C97]/5 border border-[#004C97]/20 rounded-lg px-3 py-2 text-xs text-[#004C97]"
          data-testid="period-analysis-banner"
        >
          <Info className="w-3.5 h-3.5 shrink-0 text-[#004C97]" />
          <span className="font-semibold">{computedRange.label}</span>
        </div>
      )}
    </div>
  )
}

export default PeriodAnalysisSelector

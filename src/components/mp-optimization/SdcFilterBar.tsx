import React, { useState, useId } from 'react'
import { Calendar as CalendarIcon, Filter, RotateCcw, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'

export interface SdcFilterState {
  startDate: string // dd/mm/aaaa
  endDate: string // dd/mm/aaaa
  steel: string // Aço pesquisável
  material: string // Material "código — descrição"
}

export const initialSdcFilters: SdcFilterState = {
  startDate: '',
  endDate: '',
  steel: '',
  material: '',
}

interface SdcFilterBarProps {
  availableSteels: string[]
  availableMaterials: { code: string; description: string }[]
  activeFilters: SdcFilterState
  onApplyFilters: (filters: SdcFilterState) => void
  onClearFilters: () => void
  totalCount: number
  filteredCount: number
}

// Utilitário para parse de dd/mm/aaaa para Date
export function parseDatePtBr(dateStr: string): Date | null {
  if (!dateStr) return null
  const clean = dateStr.trim()
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean)
  if (!match) return null
  const [, day, month, year] = match
  const d = parseInt(day, 10)
  const m = parseInt(month, 10) - 1
  const y = parseInt(year, 10)
  const dt = new Date(y, m, d, 12, 0, 0)
  return isNaN(dt.getTime()) ? null : dt
}

// Utilitário para formatar Date para dd/mm/aaaa
export function formatDatePtBr(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export const SdcFilterBar: React.FC<SdcFilterBarProps> = ({
  availableSteels,
  availableMaterials,
  activeFilters,
  onApplyFilters,
  onClearFilters,
  totalCount,
  filteredCount,
}) => {
  const [localFilters, setLocalFilters] = useState<SdcFilterState>(activeFilters)
  const [dateError, setDateError] = useState<string | null>(null)
  const [steelSearch, setSteelSearch] = useState('')
  const [isSteelOpen, setIsSteelOpen] = useState(false)
  const [materialSearch, setMaterialSearch] = useState('')
  const [isMaterialOpen, setIsMaterialOpen] = useState(false)

  // Sincroniza quando activeFilters mudar externamente
  React.useEffect(() => {
    setLocalFilters(activeFilters)
  }, [activeFilters])

  // Validação: data final não pode ser anterior à data inicial
  const validateDates = (startStr: string, endStr: string): boolean => {
    if (!startStr || !endStr) {
      setDateError(null)
      return true
    }
    const start = parseDatePtBr(startStr)
    const end = parseDatePtBr(endStr)
    if (start && end && end < start) {
      setDateError('A data final não pode ser anterior à data inicial.')
      return false
    }
    setDateError(null)
    return true
  }

  const handleStartDateChange = (val: string) => {
    setLocalFilters((prev) => ({ ...prev, startDate: val }))
    validateDates(val, localFilters.endDate)
  }

  const handleEndDateChange = (val: string) => {
    setLocalFilters((prev) => ({ ...prev, endDate: val }))
    validateDates(localFilters.startDate, val)
  }

  const handleApply = () => {
    if (!validateDates(localFilters.startDate, localFilters.endDate)) {
      return
    }
    onApplyFilters(localFilters)
  }

  const handleClear = () => {
    setDateError(null)
    setLocalFilters(initialSdcFilters)
    onClearFilters()
  }

  const hasActiveFilters = Boolean(
    activeFilters.startDate ||
    activeFilters.endDate ||
    activeFilters.steel ||
    activeFilters.material,
  )

  const filteredSteels = availableSteels.filter((s) =>
    s.toLowerCase().includes(steelSearch.toLowerCase()),
  )

  const filteredMaterialsList = availableMaterials.filter((m) =>
    `${m.code} — ${m.description}`.toLowerCase().includes(materialSearch.toLowerCase()),
  )

  const startParsed = parseDatePtBr(localFilters.startDate)
  const endParsed = parseDatePtBr(localFilters.endDate)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2">
      {/* Linha de Filtros Responsiva */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        {/* Bloco de Datas (dd/mm/aaaa com calendário) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Data Inicial */}
          <div className="flex items-center gap-1.5 flex-1 sm:w-44">
            <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">De:</span>
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="dd/mm/aaaa"
                value={localFilters.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                maxLength={10}
                className="h-8 text-xs font-mono pr-8 bg-slate-50 border-slate-300"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-slate-400 hover:text-[#004C97] transition-colors"
                    title="Selecionar data inicial"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startParsed || undefined}
                    onSelect={(d) => {
                      if (d) handleStartDateChange(formatDatePtBr(d))
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Data Final */}
          <div className="flex items-center gap-1.5 flex-1 sm:w-44">
            <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">Até:</span>
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="dd/mm/aaaa"
                value={localFilters.endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                maxLength={10}
                className="h-8 text-xs font-mono pr-8 bg-slate-50 border-slate-300"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-slate-400 hover:text-[#004C97] transition-colors"
                    title="Selecionar data final"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endParsed || undefined}
                    disabled={(date) => {
                      if (!startParsed) return false
                      return date < startParsed
                    }}
                    onSelect={(d) => {
                      if (d) handleEndDateChange(formatDatePtBr(d))
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Separador vertical em desktop */}
        <div className="hidden lg:block h-6 w-[1px] bg-slate-200" />

        {/* Campo Pesquisável de Aço */}
        <div className="flex-1 min-w-[160px] relative">
          <Popover open={isSteelOpen} onOpenChange={setIsSteelOpen}>
            <PopoverTrigger asChild>
              <div className="relative cursor-pointer">
                <Input
                  readOnly
                  placeholder="Selecione o Aço..."
                  value={localFilters.steel ? `Aço: ${localFilters.steel}` : ''}
                  className="h-8 text-xs bg-slate-50 border-slate-300 cursor-pointer pr-8 font-semibold text-slate-800"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-white" align="start">
              <div className="space-y-2">
                <Input
                  autoFocus
                  placeholder="Buscar aço nos dados..."
                  value={steelSearch}
                  onChange={(e) => setSteelSearch(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalFilters((prev) => ({ ...prev, steel: '' }))
                      setIsSteelOpen(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-slate-100 ${
                      !localFilters.steel ? 'font-bold text-[#004C97] bg-blue-50' : 'text-slate-700'
                    }`}
                  >
                    <span>Todos os Aços</span>
                    {!localFilters.steel && <Check className="w-3.5 h-3.5 text-[#004C97]" />}
                  </button>
                  {filteredSteels.map((st) => {
                    const isSelected = localFilters.steel === st
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setLocalFilters((prev) => ({ ...prev, steel: st }))
                          setIsSteelOpen(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-slate-100 ${
                          isSelected ? 'font-bold text-[#004C97] bg-blue-50' : 'text-slate-700'
                        }`}
                      >
                        <span>{st}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#004C97]" />}
                      </button>
                    )
                  })}
                  {filteredSteels.length === 0 && (
                    <div className="text-[11px] text-slate-400 p-2 text-center">
                      Nenhum aço encontrado
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Campo Pesquisável de Material ("código do material — descrição") */}
        <div className="flex-1 min-w-[200px] relative">
          <Popover open={isMaterialOpen} onOpenChange={setIsMaterialOpen}>
            <PopoverTrigger asChild>
              <div className="relative cursor-pointer">
                <Input
                  readOnly
                  placeholder="Selecione o Material (código — descrição)..."
                  value={localFilters.material ? `Material: ${localFilters.material}` : ''}
                  className="h-8 text-xs bg-slate-50 border-slate-300 cursor-pointer pr-8 font-semibold text-slate-800 truncate"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2 bg-white" align="start">
              <div className="space-y-2">
                <Input
                  autoFocus
                  placeholder="Buscar código ou descrição..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="h-7 text-xs"
                />
                <div className="max-h-56 overflow-y-auto space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalFilters((prev) => ({ ...prev, material: '' }))
                      setIsMaterialOpen(false)
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-slate-100 ${
                      !localFilters.material
                        ? 'font-bold text-[#004C97] bg-blue-50'
                        : 'text-slate-700'
                    }`}
                  >
                    <span>Todos os Materiais</span>
                    {!localFilters.material && <Check className="w-3.5 h-3.5 text-[#004C97]" />}
                  </button>
                  {filteredMaterialsList.map((m) => {
                    const label = `${m.code} — ${m.description}`
                    const isSelected = localFilters.material === m.code
                    return (
                      <button
                        key={m.code}
                        type="button"
                        onClick={() => {
                          setLocalFilters((prev) => ({ ...prev, material: m.code }))
                          setIsMaterialOpen(false)
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-start justify-between gap-1 hover:bg-slate-100 ${
                          isSelected ? 'font-bold text-[#004C97] bg-blue-50' : 'text-slate-700'
                        }`}
                      >
                        <span className="line-clamp-2">{label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#004C97] shrink-0 mt-0.5" />
                        )}
                      </button>
                    )
                  })}
                  {filteredMaterialsList.length === 0 && (
                    <div className="text-[11px] text-slate-400 p-2 text-center">
                      Nenhum material encontrado
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Botões Aplicar filtros e Limpar filtros */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
          <Button
            size="sm"
            onClick={handleApply}
            className="h-8 px-3 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5 mr-1" /> Aplicar filtros
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!hasActiveFilters}
            className="h-8 px-2.5 text-xs text-slate-600 border-slate-300 hover:bg-slate-100 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Limpar filtros
          </Button>
        </div>
      </div>

      {/* Erro de validação de datas */}
      {dateError && (
        <div className="text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <span>&bull;</span> {dateError}
        </div>
      )}

      {/* Resumo de Filtros Ativos e Contadores */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Filtros ativos:</span>
            {activeFilters.startDate && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 text-[11px]"
              >
                De: {activeFilters.startDate}
              </Badge>
            )}
            {activeFilters.endDate && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 text-[11px]"
              >
                Até: {activeFilters.endDate}
              </Badge>
            )}
            {activeFilters.steel && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 text-[11px]"
              >
                Aço: {activeFilters.steel}
              </Badge>
            )}
            {activeFilters.material && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 text-[11px]"
              >
                Material: {activeFilters.material}
              </Badge>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-600">
            Exibindo <strong>{filteredCount}</strong> de {totalCount} registro(s) filtrados
          </div>
        </div>
      )}
    </div>
  )
}

export default SdcFilterBar

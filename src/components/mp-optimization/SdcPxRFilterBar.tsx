import React, { useState } from 'react'
import { Calendar as CalendarIcon, Filter, RotateCcw, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { parseDatePtBr, formatDatePtBr } from '@/components/mp-optimization/SdcFilterBar'

export interface SdcPxRFilterState {
  startDate: string // dd/mm/aaaa
  endDate: string // dd/mm/aaaa
  steel: string // Aço pesquisável
  material: string // Material "código — descrição"
  trafficLight: 'TODOS' | 'VERDE' | 'AMARELO' | 'LARANJA' | 'VERMELHO' | ''
  pool: string // Pool pesquisável / selecionável
}

export const initialSdcPxRFilters: SdcPxRFilterState = {
  startDate: '',
  endDate: '',
  steel: '',
  material: '',
  trafficLight: 'TODOS',
  pool: 'TODOS',
}

interface SdcPxRFilterBarProps {
  availableSteels: string[]
  availableMaterials: { code: string; description: string }[]
  availablePools: { pool_code: string; pool_name: string }[]
  activeFilters: SdcPxRFilterState
  onApplyFilters: (filters: SdcPxRFilterState) => void
  onClearFilters: () => void
  totalCount: number
  filteredCount: number
}

export const SdcPxRFilterBar: React.FC<SdcPxRFilterBarProps> = ({
  availableSteels,
  availableMaterials,
  availablePools,
  activeFilters,
  onApplyFilters,
  onClearFilters,
  totalCount,
  filteredCount,
}) => {
  const [localFilters, setLocalFilters] = useState<SdcPxRFilterState>(activeFilters)
  const [dateError, setDateError] = useState<string | null>(null)
  const [steelSearch, setSteelSearch] = useState('')
  const [isSteelOpen, setIsSteelOpen] = useState(false)
  const [materialSearch, setMaterialSearch] = useState('')
  const [isMaterialOpen, setIsMaterialOpen] = useState(false)

  // Sincroniza quando activeFilters mudar externamente
  React.useEffect(() => {
    setLocalFilters(activeFilters)
  }, [activeFilters])

  // Validação: data final não pode ser menor que a inicial
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
    setLocalFilters(initialSdcPxRFilters)
    onClearFilters()
  }

  const hasActiveFilters = Boolean(
    activeFilters.startDate ||
    activeFilters.endDate ||
    activeFilters.steel ||
    activeFilters.material ||
    (activeFilters.trafficLight && activeFilters.trafficLight !== 'TODOS') ||
    (activeFilters.pool && activeFilters.pool !== 'TODOS'),
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
    <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 shadow-xs space-y-2.5">
      {/* Barra de Filtros Integrada ao Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end">
        {/* 1. Período: Data Inicial */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">Data Inicial:</label>
          <div className="relative">
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={localFilters.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              maxLength={10}
              className="h-8 text-xs font-mono pr-7 bg-white border-slate-300"
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

        {/* 2. Período: Data Final (impede data final menor que a inicial) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">Data Final:</label>
          <div className="relative">
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={localFilters.endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              maxLength={10}
              className="h-8 text-xs font-mono pr-7 bg-white border-slate-300"
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

        {/* 3. Aço Pesquisável (derivado dos dados carregados) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">Aço:</label>
          <Popover open={isSteelOpen} onOpenChange={setIsSteelOpen}>
            <PopoverTrigger asChild>
              <div className="relative cursor-pointer">
                <Input
                  readOnly
                  placeholder="Todos os aços"
                  value={localFilters.steel ? localFilters.steel : ''}
                  className="h-8 text-xs bg-white border-slate-300 cursor-pointer pr-7 font-semibold text-slate-800"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2 bg-white" align="start">
              <div className="space-y-2">
                <Input
                  autoFocus
                  placeholder="Pesquisar aço..."
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
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 4. Material Pesquisável ("código — descrição") */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">Material:</label>
          <Popover open={isMaterialOpen} onOpenChange={setIsMaterialOpen}>
            <PopoverTrigger asChild>
              <div className="relative cursor-pointer">
                <Input
                  readOnly
                  placeholder="Todos os materiais"
                  value={
                    localFilters.material
                      ? availableMaterials.find((m) => m.code === localFilters.material)?.code ||
                        localFilters.material
                      : ''
                  }
                  className="h-8 text-xs bg-white border-slate-300 cursor-pointer pr-7 font-semibold text-slate-800 truncate"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 bg-white" align="start">
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
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 5. Status / Semáforo (Verde, Amarelo, Laranja/Vermelho) */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">Semáforo / Status:</label>
          <select
            value={localFilters.trafficLight}
            onChange={(e) =>
              setLocalFilters((prev) => ({
                ...prev,
                trafficLight: e.target.value as SdcPxRFilterState['trafficLight'],
              }))
            }
            className="w-full h-8 text-xs border border-slate-300 rounded-md px-2 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="VERDE">🟢 Verde (Adequado / Conforme)</option>
            <option value="AMARELO">🟡 Amarelo (Atenção / Desvio Leve)</option>
            <option value="LARANJA">🟠 Laranja / Vermelho (Crítico)</option>
          </select>
        </div>

        {/* 6. Pool de MP */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-700 block">Pool de MP:</label>
          <select
            value={localFilters.pool}
            onChange={(e) => setLocalFilters((prev) => ({ ...prev, pool: e.target.value }))}
            className="w-full h-8 text-xs border border-slate-300 rounded-md px-2 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="TODOS">Todos os Pools</option>
            {availablePools.map((p) => (
              <option key={p.pool_code} value={p.pool_code}>
                {p.pool_name}
              </option>
            ))}
            <option value="SEM_POOL">Aços sem Pool</option>
          </select>
        </div>
      </div>

      {/* Botões Aplicar filtros e Limpar filtros + Validação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-200">
        <div className="flex-1">
          {dateError ? (
            <div className="text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <span>&bull;</span> {dateError}
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium">
              Filtre os dados da Linha 2 por período, aço, material, semáforo ou pool.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleApply}
            className="h-8 px-3.5 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5 mr-1" /> Aplicar filtros
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!hasActiveFilters}
            className="h-8 px-3 text-xs text-slate-600 border-slate-300 hover:bg-slate-100 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Limpar filtros
          </Button>
        </div>
      </div>

      {/* Resumo de Filtros Ativos */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Filtros da aba:</span>
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
            {activeFilters.trafficLight && activeFilters.trafficLight !== 'TODOS' && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 text-[11px]"
              >
                Semáforo: {activeFilters.trafficLight}
              </Badge>
            )}
            {activeFilters.pool && activeFilters.pool !== 'TODOS' && (
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 text-[11px]"
              >
                Pool: {activeFilters.pool}
              </Badge>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-600">
            Exibindo <strong>{filteredCount}</strong> de {totalCount} registro(s) L2
          </div>
        </div>
      )}
    </div>
  )
}

export default SdcPxRFilterBar

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Filter,
  RotateCcw,
  RefreshCw,
  Check,
  ChevronsUpDown,
  Calendar,
  X,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type TemporalVision = 'DIARIA' | 'SEMANAL' | 'MENSAL' | 'ANUAL'

export interface MPFilterItemOption {
  code: string
  description: string
  group?: string
}

export interface MPUtilizationFiltersState {
  companyCode: string // 'ALL' ou código da empresa
  lineCode: string // 'ALL' ou código da linha
  centerCode: string // 'ALL' ou código do centro
  selectedRawMaterials: string[] // [] significa todas
  temporalVision: TemporalVision
  // Período de acordo com a visão:
  dailyDate: string // YYYY-MM-DD (exibido como dd/mm/aaaa)
  weeklyWeek: number // 1 a 53
  weeklyYear: number // ex: 2026
  monthlyMonth: number // 1 a 12
  monthlyYear: number // ex: 2026
  annualYear: number // ex: 2026
}

export interface MPUtilizationHierarchyOptions {
  companies: { code: string; name: string }[]
  lines: { code: string; name: string; companyCode: string }[]
  centers: { code: string; name: string; lineCode: string; companyCode?: string }[]
  rawMaterials: MPFilterItemOption[]
}

interface MPUtilizationFilterHeaderProps {
  filters: MPUtilizationFiltersState
  options: MPUtilizationHierarchyOptions
  onChange: (next: MPUtilizationFiltersState) => void
  onApply: (filters: MPUtilizationFiltersState) => void
  onReset: () => void
  isLoading?: boolean
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

/**
 * Calcula início (segunda-feira) e término (domingo) da semana ISO no formato dd/mm/aaaa a dd/mm/aaaa
 */
export function getIsoWeekDateRangePtBr(
  year: number,
  week: number,
): {
  startDateStr: string
  endDateStr: string
  display: string
} {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dayOfWeek = simple.getDay()
  const ISOweekStart = new Date(simple)
  if (dayOfWeek <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  }
  ISOweekStart.setHours(0, 0, 0, 0)

  const ISOweekEnd = new Date(ISOweekStart)
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6)
  ISOweekEnd.setHours(23, 59, 59, 999)

  const pad = (n: number) => String(n).padStart(2, '0')
  const startStr = `${pad(ISOweekStart.getDate())}/${pad(ISOweekStart.getMonth() + 1)}/${ISOweekStart.getFullYear()}`
  const endStr = `${pad(ISOweekEnd.getDate())}/${pad(ISOweekEnd.getMonth() + 1)}/${ISOweekEnd.getFullYear()}`

  return {
    startDateStr: startStr,
    endDateStr: endStr,
    display: `${startStr} a ${endStr}`,
  }
}

export const MPUtilizationFilterHeader: React.FC<MPUtilizationFilterHeaderProps> = ({
  filters,
  options,
  onChange,
  onApply,
  onReset,
  isLoading = false,
}) => {
  // Estado local para combobox de matéria-prima pesquisável
  const [isMpPopoverOpen, setIsMpPopoverOpen] = useState(false)
  const [mpSearchTerm, setMpSearchTerm] = useState('')

  // 1. Cascata reativa Empresa -> Linha vinculada
  const availableLines = useMemo(() => {
    if (!filters.companyCode || filters.companyCode === 'ALL') {
      return options.lines
    }
    return options.lines.filter(
      (l) => !l.companyCode || l.companyCode === filters.companyCode || l.companyCode === 'ALL',
    )
  }, [filters.companyCode, options.lines])

  // 2. Cascata reativa Linha -> Centros vinculados à linha selecionada
  // Exclusivamente os centros cadastrados em PCP Robotizado -> Cadastros -> Centros e Ficha Mestra
  const availableCenters = useMemo(() => {
    if (!filters.lineCode || filters.lineCode === 'ALL') {
      // Se linha for ALL mas houver empresa selecionada, restringe centros pela empresa
      if (filters.companyCode && filters.companyCode !== 'ALL') {
        const lineCodesOfCompany = new Set(availableLines.map((l) => l.code))
        return options.centers.filter(
          (c) =>
            !c.companyCode ||
            c.companyCode === filters.companyCode ||
            lineCodesOfCompany.has(c.lineCode),
        )
      }
      return options.centers
    }
    return options.centers.filter((c) => c.lineCode === filters.lineCode)
  }, [filters.lineCode, filters.companyCode, availableLines, options.centers])

  // Handlers com validação estrita de hierarquia:
  // "Se o usuário trocar a Empresa, limpar automaticamente Linha e Centro caso a seleção anterior não seja válida para a nova empresa."
  const handleCompanyChange = (newCompany: string) => {
    const validLinesForNewCompany =
      newCompany === 'ALL'
        ? options.lines
        : options.lines.filter(
            (l) => !l.companyCode || l.companyCode === newCompany || l.companyCode === 'ALL',
          )

    const isCurrentLineValid =
      filters.lineCode === 'ALL' || validLinesForNewCompany.some((l) => l.code === filters.lineCode)

    const nextLine = isCurrentLineValid ? filters.lineCode : 'ALL'

    // Verifica se centro continua válido
    const validCentersForNextLine =
      nextLine === 'ALL'
        ? options.centers.filter(
            (c) =>
              newCompany === 'ALL' ||
              !c.companyCode ||
              c.companyCode === newCompany ||
              validLinesForNewCompany.some((l) => l.code === c.lineCode),
          )
        : options.centers.filter((c) => c.lineCode === nextLine)

    const isCurrentCenterValid =
      filters.centerCode === 'ALL' ||
      validCentersForNextLine.some((c) => c.code === filters.centerCode)

    const nextCenter = isCurrentCenterValid ? filters.centerCode : 'ALL'

    onChange({
      ...filters,
      companyCode: newCompany,
      lineCode: nextLine,
      centerCode: nextCenter,
    })
  }

  const handleLineChange = (newLine: string) => {
    const validCenters =
      newLine === 'ALL' ? availableCenters : options.centers.filter((c) => c.lineCode === newLine)

    const isCurrentCenterValid =
      filters.centerCode === 'ALL' || validCenters.some((c) => c.code === filters.centerCode)

    onChange({
      ...filters,
      lineCode: newLine,
      centerCode: isCurrentCenterValid ? filters.centerCode : 'ALL',
    })
  }

  const handleCenterChange = (newCenter: string) => {
    onChange({
      ...filters,
      centerCode: newCenter,
    })
  }

  const handleTemporalVisionChange = (vision: TemporalVision) => {
    onChange({
      ...filters,
      temporalVision: vision,
    })
  }

  // Multi-seleção de matéria-prima
  const toggleRawMaterial = (mpCode: string) => {
    const current = new Set(filters.selectedRawMaterials)
    if (current.has(mpCode)) {
      current.delete(mpCode)
    } else {
      current.add(mpCode)
    }
    onChange({
      ...filters,
      selectedRawMaterials: Array.from(current),
    })
  }

  const clearRawMaterials = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    onChange({
      ...filters,
      selectedRawMaterials: [],
    })
  }

  const selectAllRawMaterials = () => {
    onChange({
      ...filters,
      selectedRawMaterials: [],
    })
  }

  // Filtragem da lista pesquisável de MP (por código, descrição, grupo de MP)
  const filteredMpOptions = useMemo(() => {
    const term = mpSearchTerm.trim().toLowerCase()
    if (!term) return options.rawMaterials
    return options.rawMaterials.filter(
      (mp) =>
        mp.code.toLowerCase().includes(term) ||
        mp.description.toLowerCase().includes(term) ||
        (mp.group && mp.group.toLowerCase().includes(term)),
    )
  }, [options.rawMaterials, mpSearchTerm])

  // Rótulo para o botão de matéria-prima
  const mpButtonLabel = useMemo(() => {
    if (filters.selectedRawMaterials.length === 0) {
      return 'Todas as matérias-primas'
    }
    if (filters.selectedRawMaterials.length === 1) {
      const found = options.rawMaterials.find((m) => m.code === filters.selectedRawMaterials[0])
      return found ? `${found.code} - ${found.description}` : filters.selectedRawMaterials[0]
    }
    return `${filters.selectedRawMaterials.length} matérias-primas selecionadas`
  }, [filters.selectedRawMaterials, options.rawMaterials])

  // Formatação amigável da data dd/mm/aaaa
  const formatIsoDateToBr = (isoDate: string) => {
    if (!isoDate) return ''
    const parts = isoDate.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return isoDate
  }

  // Anos disponíveis para seleção (2024 a 2028)
  const availableYears = [2024, 2025, 2026, 2027, 2028]

  // Semanas disponíveis 1 a 53
  const availableWeeks = useMemo(() => {
    const weeks: { week: number; label: string }[] = []
    for (let w = 1; w <= 52; w++) {
      const range = getIsoWeekDateRangePtBr(filters.weeklyYear, w)
      weeks.push({
        week: w,
        label: `Semana ${String(w).padStart(2, '0')} (${range.display})`,
      })
    }
    return weeks
  }, [filters.weeklyYear])

  return (
    <div
      data-testid="mp-utilization-filter-header"
      className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm space-y-3.5 transition-all"
    >
      {/* Linha 1: Título do Cabeçalho, Seletor de Visão Temporal e Botões de Ação */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        {/* Identificação com ícone */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97] shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Filtros & Período de Análise
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold tracking-wider border-blue-200 bg-blue-50/70 text-[#004C97]"
              >
                1020 vs AC • CIAFAL
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Contexto global: Empresa &rarr; Linha &rarr; Centro &rarr; Matéria-prima &rarr;
              Período
            </p>
          </div>
        </div>

        {/* Direita: Seletor de Visão Temporal [ DIÁRIA ] [ SEMANAL ] [ MENSAL ] [ ANUAL ] + Botões */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
          {/* Controle Segmentado de Visão Temporal (Destaque Azul CIAFAL) */}
          <div
            data-testid="temporal-vision-segmented-control"
            role="group"
            aria-label="Seletor de visão temporal"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs"
          >
            {(['DIARIA', 'SEMANAL', 'MENSAL', 'ANUAL'] as const).map((vision) => {
              const isActive = filters.temporalVision === vision
              return (
                <button
                  key={vision}
                  type="button"
                  onClick={() => handleTemporalVisionChange(vision)}
                  aria-pressed={isActive}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all select-none',
                    isActive
                      ? 'bg-[#004C97] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
                  )}
                >
                  {vision}
                </button>
              )
            })}
          </div>

          {/* Botões do Cabeçalho: Aplicar Filtros e Limpar Filtros */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
              title="Limpar filtros e retornar para o período padrão"
              className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-white gap-1.5 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Limpar filtros</span>
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onApply(filters)}
              disabled={isLoading}
              title="Aplicar filtros e atualizar toda a página"
              className="h-8 px-3 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-bold shadow-xs transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Aplicando...</span>
                </>
              ) : (
                <span>Aplicar filtros</span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Linha 2: Grade Horizontal Responsiva dos Filtros
          Desktop: Empresa | Linha | Centro | Matéria-prima | Período Específico
          Em telas menores, organiza em 2 linhas sem rolagem horizontal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        {/* 1. Empresa */}
        <div className="space-y-1 min-w-0">
          <Label className="text-[11px] font-semibold text-slate-700 block">Empresa</Label>
          <Select value={filters.companyCode || 'ALL'} onValueChange={handleCompanyChange}>
            <SelectTrigger
              data-testid="filter-select-empresa"
              className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium focus:ring-[#004C97] truncate"
            >
              <SelectValue placeholder="Todas as Empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Empresas</SelectItem>
              {options.companies.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. Linha (Dependente de Empresa) */}
        <div className="space-y-1 min-w-0">
          <Label className="text-[11px] font-semibold text-slate-700 block">Linha Produtiva</Label>
          <Select value={filters.lineCode || 'ALL'} onValueChange={handleLineChange}>
            <SelectTrigger
              data-testid="filter-select-linha"
              className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium focus:ring-[#004C97] truncate"
            >
              <SelectValue placeholder="Todas as Linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Linhas</SelectItem>
              {availableLines.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.code} - {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Centro (Dependente de Empresa -> Linha, da Ficha Mestra) */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-semibold text-slate-700 block">
              Centro de Produção
            </Label>
            <span className="text-[10px] text-slate-400 font-mono">Ficha Mestra</span>
          </div>
          <Select
            value={filters.centerCode || 'ALL'}
            onValueChange={handleCenterChange}
            disabled={availableCenters.length === 0}
          >
            <SelectTrigger
              data-testid="filter-select-centro"
              className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium focus:ring-[#004C97] truncate"
            >
              <SelectValue placeholder="Todos os Centros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Centros</SelectItem>
              {availableCenters.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Matéria-prima (Pesquisável, Múltipla seleção, Código / Descrição / Grupo) */}
        <div className="space-y-1 min-w-0">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-semibold text-slate-700 block">Matéria-prima</Label>
            {filters.selectedRawMaterials.length > 0 && (
              <button
                type="button"
                onClick={clearRawMaterials}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-medium"
              >
                Limpar MP
              </button>
            )}
          </div>

          <Popover open={isMpPopoverOpen} onOpenChange={setIsMpPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={isMpPopoverOpen}
                data-testid="filter-mp-combobox-trigger"
                className="w-full h-8 px-2.5 justify-between font-normal text-left text-xs bg-white border-slate-200 hover:bg-slate-50 text-slate-800 focus:ring-1 focus:ring-[#004C97]"
              >
                <span className="truncate">{mpButtonLabel}</span>
                <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50 text-slate-500" />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[360px] sm:w-[420px] p-0 shadow-lg border-slate-200 z-50"
              align="start"
            >
              <Command shouldFilter={false} className="w-full">
                <div className="p-2 border-b border-slate-100 flex items-center justify-between gap-1.5 bg-slate-50/70">
                  <span className="text-[11px] font-bold text-slate-700">
                    Catálogo de MP (SAP / RFC)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllRawMaterials}
                      className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-[#004C97]"
                    >
                      Selecionar Todas
                    </Button>
                    {filters.selectedRawMaterials.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearRawMaterials}
                        className="h-6 px-1.5 text-[10px] text-rose-600 hover:text-rose-800"
                      >
                        Limpar Seleção
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-2 border-b border-slate-100">
                  <CommandInput
                    placeholder="Pesquisar por código, descrição ou grupo de MP..."
                    value={mpSearchTerm}
                    onValueChange={setMpSearchTerm}
                    className="h-8 text-xs border-0 focus:ring-0"
                  />
                </div>

                <CommandList className="max-h-64 overflow-y-auto p-1">
                  {filteredMpOptions.length === 0 ? (
                    <CommandEmpty className="p-4 text-xs text-center text-slate-500">
                      Nenhuma matéria-prima encontrada.
                    </CommandEmpty>
                  ) : (
                    <CommandGroup heading="Matérias-primas Elegíveis e Utilizadas">
                      {filteredMpOptions.map((mp) => {
                        const isSelected = filters.selectedRawMaterials.includes(mp.code)
                        return (
                          <CommandItem
                            key={mp.code}
                            value={mp.code}
                            onSelect={() => toggleRawMaterial(mp.code)}
                            className={cn(
                              'flex items-center justify-between p-2 cursor-pointer rounded text-xs',
                              isSelected && 'bg-blue-50/80 font-medium text-[#004C97]',
                            )}
                          >
                            <div className="flex flex-col gap-0.5 max-w-[85%]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 font-mono text-xs">
                                  {mp.code}
                                </span>
                                {mp.group && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1 bg-slate-100 text-slate-600 border-slate-200"
                                  >
                                    {mp.group}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-600 truncate">
                                {mp.description}
                              </span>
                            </div>

                            <div
                              className={cn(
                                'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                isSelected
                                  ? 'bg-[#004C97] border-[#004C97] text-white'
                                  : 'border-slate-300 bg-white',
                              )}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* 5. Período Dinâmico Conforme a Visão Temporal Selecionada */}
        <div className="space-y-1 min-w-0">
          {/* VISÃO DIÁRIA: campo de data específica dd/mm/aaaa */}
          {filters.temporalVision === 'DIARIA' && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-slate-700 block">
                  Data Específica
                </Label>
                {filters.dailyDate && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {formatIsoDateToBr(filters.dailyDate)}
                  </span>
                )}
              </div>
              <Input
                type="date"
                data-testid="filter-period-diaria-input"
                value={filters.dailyDate}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    dailyDate: e.target.value,
                  })
                }
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus-visible:ring-[#004C97]"
              />
            </div>
          )}

          {/* VISÃO SEMANAL: semana de segunda-feira a domingo com dd/mm/aaaa a dd/mm/aaaa */}
          {filters.temporalVision === 'SEMANAL' && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-semibold text-slate-700 block">
                  Semana (Seg a Dom)
                </Label>
                <span className="text-[10px] text-slate-500 font-mono">{filters.weeklyYear}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Select
                  value={String(filters.weeklyWeek)}
                  onValueChange={(val) =>
                    onChange({
                      ...filters,
                      weeklyWeek: Number(val),
                    })
                  }
                >
                  <SelectTrigger
                    data-testid="filter-period-semana-select"
                    className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium focus:ring-[#004C97] truncate"
                  >
                    <SelectValue placeholder="Selecione a semana" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {availableWeeks.map((item) => (
                      <SelectItem key={item.week} value={String(item.week)}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(filters.weeklyYear)}
                  onValueChange={(val) =>
                    onChange({
                      ...filters,
                      weeklyYear: Number(val),
                    })
                  }
                >
                  <SelectTrigger className="w-20 h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium focus:ring-[#004C97]">
                    <SelectValue />
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

          {/* VISÃO MENSAL: Mês + Ano */}
          {filters.temporalVision === 'MENSAL' && (
            <div>
              <Label className="text-[11px] font-semibold text-slate-700 block">
                Mês &bull; Ano
              </Label>
              <div className="flex items-center gap-1.5">
                <Select
                  value={String(filters.monthlyMonth)}
                  onValueChange={(val) =>
                    onChange({
                      ...filters,
                      monthlyMonth: Number(val),
                    })
                  }
                >
                  <SelectTrigger
                    data-testid="filter-period-mes-select"
                    className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium focus:ring-[#004C97] truncate flex-1"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES_PT.map((mName, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>
                        {mName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={String(filters.monthlyYear)}
                  onValueChange={(val) =>
                    onChange({
                      ...filters,
                      monthlyYear: Number(val),
                    })
                  }
                >
                  <SelectTrigger
                    data-testid="filter-period-mes-ano-select"
                    className="w-20 h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium focus:ring-[#004C97]"
                  >
                    <SelectValue />
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

          {/* VISÃO ANUAL: Ano */}
          {filters.temporalVision === 'ANUAL' && (
            <div>
              <Label className="text-[11px] font-semibold text-slate-700 block">
                Ano de Análise
              </Label>
              <Select
                value={String(filters.annualYear)}
                onValueChange={(val) =>
                  onChange({
                    ...filters,
                    annualYear: Number(val),
                  })
                }
              >
                <SelectTrigger
                  data-testid="filter-period-ano-select"
                  className="h-8 text-xs bg-white border-slate-200 text-slate-900 font-medium focus:ring-[#004C97]"
                >
                  <SelectValue />
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
          )}
        </div>
      </div>

      {/* Resumo visual do filtro ativo quando há filtros refinados */}
      {(filters.companyCode !== 'ALL' ||
        filters.lineCode !== 'ALL' ||
        filters.centerCode !== 'ALL' ||
        filters.selectedRawMaterials.length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-500">Filtros aplicados:</span>

          {filters.companyCode !== 'ALL' && (
            <Badge
              variant="outline"
              className="bg-slate-50 text-slate-800 border-slate-200 text-[10px] gap-1 py-0"
            >
              Empresa: {filters.companyCode}
              <X
                className="w-3 h-3 cursor-pointer hover:text-rose-600"
                onClick={() => handleCompanyChange('ALL')}
              />
            </Badge>
          )}

          {filters.lineCode !== 'ALL' && (
            <Badge
              variant="outline"
              className="bg-slate-50 text-slate-800 border-slate-200 text-[10px] gap-1 py-0"
            >
              Linha: {filters.lineCode}
              <X
                className="w-3 h-3 cursor-pointer hover:text-rose-600"
                onClick={() => handleLineChange('ALL')}
              />
            </Badge>
          )}

          {filters.centerCode !== 'ALL' && (
            <Badge
              variant="outline"
              className="bg-slate-50 text-slate-800 border-slate-200 text-[10px] gap-1 py-0"
            >
              Centro: {filters.centerCode}
              <X
                className="w-3 h-3 cursor-pointer hover:text-rose-600"
                onClick={() => handleCenterChange('ALL')}
              />
            </Badge>
          )}

          {filters.selectedRawMaterials.length > 0 && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] gap-1 py-0"
            >
              MP: {filters.selectedRawMaterials.length} selecionada(s)
              <X
                className="w-3 h-3 cursor-pointer hover:text-rose-600"
                onClick={() => clearRawMaterials()}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

export default MPUtilizationFilterHeader

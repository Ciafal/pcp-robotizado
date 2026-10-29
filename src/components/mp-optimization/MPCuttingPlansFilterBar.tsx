import React, { useMemo, useState } from 'react'
import {
  Search,
  Filter,
  X,
  Building2,
  Warehouse,
  Boxes,
  ShieldCheck,
  Check,
  ChevronsUpDown,
  Layers,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export interface MPCuttingViewFilters {
  searchTerm: string
  center: string
  depot: string
  itemType: string
  steelGrade: string
  reservationStatus: string
}

export const DEFAULT_CUTTING_VIEW_FILTERS: MPCuttingViewFilters = {
  searchTerm: '',
  center: 'ALL',
  depot: 'ALL',
  itemType: 'ALL',
  steelGrade: 'ALL',
  reservationStatus: 'ALL',
}

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface MPCuttingPlansFilterBarProps {
  filters: MPCuttingViewFilters
  onFiltersChange: (newFilters: MPCuttingViewFilters) => void
  onClearFilters: () => void
  availableCenters: string[]
  availableDepots: string[]
  availableItemTypes: string[]
  availableSteelGrades: string[]
  totalItemsCount: number
  filteredItemsCount: number
  className?: string
  isSapEmpty?: boolean
}

interface SearchableFilterComboboxProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (val: string) => void
  icon: React.ReactNode
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  widthClass?: string
  disabled?: boolean
  testId?: string
}

const SearchableFilterCombobox: React.FC<SearchableFilterComboboxProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
  placeholder = 'Todos',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado.',
  widthClass = 'w-full sm:w-[150px]',
  disabled = false,
  testId,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedOption = useMemo(() => options.find((opt) => opt.value === value), [options, value])

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q),
    )
  }, [options, search])

  const isSelected = value !== 'ALL'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn(
            'h-9 px-2.5 justify-between font-normal text-xs bg-white border-slate-300 hover:bg-slate-50 transition-colors',
            isSelected && 'border-[#004C97] bg-blue-50/60 font-medium text-[#004C97]',
            widthClass,
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className={cn('shrink-0 text-slate-500', isSelected && 'text-[#004C97]')}>
              {icon}
            </span>
            <span className="truncate">
              {isSelected ? (
                <span>
                  <strong className="text-[10px] uppercase font-bold text-slate-500 mr-1">
                    {label}:
                  </strong>
                  {selectedOption?.label || value}
                </span>
              ) : (
                <span className="text-slate-600">
                  <span className="text-slate-400 mr-1">{label}:</span>
                  {placeholder}
                </span>
              )}
            </span>
          </div>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[240px] p-0 shadow-lg border-slate-200 z-50" align="start">
        <Command shouldFilter={false} className="w-full">
          <div className="p-2 border-b border-slate-100 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              className="h-7 text-xs border-0 focus:ring-0"
            />
          </div>

          <CommandList className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <CommandEmpty className="p-3 text-xs text-center text-slate-500">
                {emptyText}
              </CommandEmpty>
            ) : (
              <CommandGroup heading={`Filtro por ${label}`}>
                {filteredOptions.map((opt) => {
                  const active = opt.value === value
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      onSelect={() => {
                        onChange(opt.value)
                        setOpen(false)
                        setSearch('')
                      }}
                      className={cn(
                        'flex items-center justify-between p-2 cursor-pointer rounded text-xs',
                        active && 'bg-blue-50/80 font-medium text-[#004C97]',
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.count !== undefined && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono px-1 py-0 h-4 bg-slate-100 text-slate-600"
                          >
                            {opt.count}
                          </Badge>
                        )}
                      </div>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 text-[#004C97] shrink-0',
                          active ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export const MPCuttingPlansFilterBar: React.FC<MPCuttingPlansFilterBarProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  availableCenters,
  availableDepots,
  availableItemTypes,
  availableSteelGrades,
  totalItemsCount,
  filteredItemsCount,
  className,
  isSapEmpty = false,
}) => {
  const hasActiveFilters =
    Boolean(filters.searchTerm.trim()) ||
    filters.center !== 'ALL' ||
    filters.depot !== 'ALL' ||
    filters.itemType !== 'ALL' ||
    filters.steelGrade !== 'ALL' ||
    filters.reservationStatus !== 'ALL'

  // Montagem das opções
  const centerOptions: FilterOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Todos os Centros' },
      ...availableCenters.map((c) => ({ value: c, label: `Centro ${c}` })),
    ]
  }, [availableCenters])

  const depotOptions: FilterOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Todos os Depósitos' },
      ...availableDepots.map((d) => ({ value: d, label: `Depósito ${d}` })),
    ]
  }, [availableDepots])

  const typeOptions: FilterOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Todos os Tipos' },
      ...availableItemTypes.map((t) => {
        let label = t
        if (t === 'PLACA') label = 'Placa'
        else if (t === 'BLOCO') label = 'Bloco'
        else if (t === 'PECA') label = 'Peça'
        else if (t === 'SOBRA_REUTILIZAVEL') label = 'Sobra Reutilizável'
        return { value: t, label }
      }),
    ]
  }, [availableItemTypes])

  const steelOptions: FilterOption[] = useMemo(() => {
    return [
      { value: 'ALL', label: 'Todos os Aços' },
      ...availableSteelGrades.map((s) => ({ value: s, label: s })),
    ]
  }, [availableSteelGrades])

  const reservationOptions: FilterOption[] = [
    { value: 'ALL', label: 'Todas as Situações' },
    { value: 'LIVRE', label: 'Livre para Corte' },
    { value: 'RESERVADA', label: 'Reservada' },
    { value: 'SUGESTAO_RESERVA', label: 'Sugestão Reserva' },
    { value: 'BLOQUEADA', label: 'Bloqueada (Qualidade)' },
    { value: 'EM_PLANO_DE_CORTE', label: 'Em Plano de Corte' },
    { value: 'CORTE_APROVADO', label: 'Corte Aprovado' },
  ]

  return (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3',
        className,
      )}
      data-testid="mp-cutting-plans-filter-bar"
    >
      {/* Linha Principal: Campo de Pesquisa Geral + Botão Limpar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            value={filters.searchTerm}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                searchTerm: e.target.value,
              })
            }
            placeholder="Pesquisar por Código SAP, Descrição, Lote, Corrida, Fornecedor ou Bloco..."
            className="pl-9 pr-8 h-9 text-xs bg-white border-slate-300 focus-visible:ring-[#004C97]"
            data-testid="filter-cutting-search-input"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() => onFiltersChange({ ...filters, searchTerm: '' })}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Indicador de Itens Filtrados e Botão Limpar */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-[#004C97]" />
            <span className="font-mono text-[11px]">
              <strong className="text-slate-900 font-bold">{filteredItemsCount}</strong>
              <span className="text-slate-400">/{totalItemsCount}</span> itens
            </span>
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              data-testid="filter-cutting-clear-button"
              className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* Linha Secundária: Comboboxes Pesquisáveis Ciafal */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-slate-100">
        {/* Centro */}
        <SearchableFilterCombobox
          label="Centro"
          value={filters.center}
          options={centerOptions}
          onChange={(val) => onFiltersChange({ ...filters, center: val })}
          icon={<Building2 className="w-3.5 h-3.5" />}
          placeholder="Todos"
          searchPlaceholder="Filtrar centro..."
          emptyText="Nenhum centro encontrado"
          testId="filter-combobox-center"
        />

        {/* Depósito */}
        <SearchableFilterCombobox
          label="Depósito"
          value={filters.depot}
          options={depotOptions}
          onChange={(val) => onFiltersChange({ ...filters, depot: val })}
          icon={<Warehouse className="w-3.5 h-3.5" />}
          placeholder="Todos"
          searchPlaceholder="Filtrar depósito..."
          emptyText="Nenhum depósito encontrado"
          testId="filter-combobox-depot"
        />

        {/* Tipo de Material */}
        <SearchableFilterCombobox
          label="Tipo"
          value={filters.itemType}
          options={typeOptions}
          onChange={(val) => onFiltersChange({ ...filters, itemType: val })}
          icon={<Boxes className="w-3.5 h-3.5" />}
          placeholder="Todos"
          searchPlaceholder="Filtrar tipo..."
          emptyText="Nenhum tipo encontrado"
          testId="filter-combobox-type"
        />

        {/* Aço */}
        <SearchableFilterCombobox
          label="Aço"
          value={filters.steelGrade}
          options={steelOptions}
          onChange={(val) => onFiltersChange({ ...filters, steelGrade: val })}
          icon={<Layers className="w-3.5 h-3.5" />}
          placeholder="Todos"
          searchPlaceholder="Filtrar tipo de aço..."
          emptyText="Nenhum aço encontrado"
          testId="filter-combobox-steel"
        />

        {/* Disponibilidade / Reserva */}
        <SearchableFilterCombobox
          label="Disponib."
          value={filters.reservationStatus}
          options={reservationOptions}
          onChange={(val) => onFiltersChange({ ...filters, reservationStatus: val })}
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          placeholder="Todas"
          searchPlaceholder="Filtrar disponibilidade..."
          emptyText="Nenhuma situação encontrada"
          testId="filter-combobox-reservation"
        />
      </div>

      {/* Chips de Filtros Ativos para feedback visual imediato */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-slate-400 font-medium">Filtros aplicados:</span>

          {filters.searchTerm && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 gap-1 py-0 h-5"
            >
              Busca: &ldquo;{filters.searchTerm}&rdquo;
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, searchTerm: '' })}
                className="hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.center !== 'ALL' && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 gap-1 py-0 h-5"
            >
              Centro: {filters.center}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, center: 'ALL' })}
                className="hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.depot !== 'ALL' && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 gap-1 py-0 h-5"
            >
              Depósito: {filters.depot}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, depot: 'ALL' })}
                className="hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.itemType !== 'ALL' && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 gap-1 py-0 h-5"
            >
              Tipo: {filters.itemType}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, itemType: 'ALL' })}
                className="hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.steelGrade !== 'ALL' && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 gap-1 py-0 h-5"
            >
              Aço: {filters.steelGrade}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, steelGrade: 'ALL' })}
                className="hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {filters.reservationStatus !== 'ALL' && (
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 gap-1 py-0 h-5"
            >
              Disponibilidade: {filters.reservationStatus}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, reservationStatus: 'ALL' })}
                className="hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}

export default MPCuttingPlansFilterBar

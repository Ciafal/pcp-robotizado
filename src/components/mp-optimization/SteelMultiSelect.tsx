/**
 * SteelMultiSelectPop.tsx
 * Componente Popover de Multisseleção de Aços / Classes de Aço Especial
 * Baseado no padrão consolidado de DadosIbgeFilterBar.tsx:
 * - Popover com Trigger que não cresce nem quebra layout
 * - Exibição no trigger:
 *    - 0 selecionados ou todos => "Todos os Aços"
 *    - 1 a 3 selecionados => "1045, 1050, 1060"
 *    - > 3 selecionados => "1045, 1050 + 2 aços" (ou N aços selecionados)
 * - Busca/filtro interno em tempo real por código ou descrição
 * - Botão "Selecionar todos" e "Limpar seleção"
 * - Lista rolável com max-h e overflow-y-auto
 * - Checkboxes individuais com indicação visual acessível e design Ciafal (#004C97)
 */

import React, { useState, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, ChevronDown, Check, X, Layers } from 'lucide-react'

export interface SteelOption {
  code: string
  name?: string
  description?: string
  label: string
  source?: string
  poolCode?: string
}

interface SteelMultiSelectProps {
  options: SteelOption[]
  selectedSteels: string[] // lista de códigos selecionados, ex: ['1045', '1050']
  onChange: (selected: string[]) => void
  disabled?: boolean
  className?: string
  placeholderAll?: string
}

export const SteelMultiSelect: React.FC<SteelMultiSelectProps> = ({
  options,
  selectedSteels,
  onChange,
  disabled = false,
  className = '',
  placeholderAll = 'Todos os Aços',
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Filtragem da busca
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.trim().toLowerCase()
    return options.filter(
      (opt) =>
        opt.code.toLowerCase().includes(q) ||
        (opt.name && opt.name.toLowerCase().includes(q)) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        (opt.label && opt.label.toLowerCase().includes(q)),
    )
  }, [options, search])

  // Rótulo dinâmico do trigger
  const triggerLabel = useMemo(() => {
    const qtd = selectedSteels.length
    if (qtd === 0 || (options.length > 0 && qtd === options.length)) {
      return placeholderAll
    }
    if (qtd <= 3) {
      return selectedSteels.join(', ')
    }
    const firstTwo = selectedSteels.slice(0, 2).join(', ')
    const remaining = qtd - 2
    return `${firstTwo} + ${remaining} aço${remaining > 1 ? 's' : ''}`
  }, [selectedSteels, options.length, placeholderAll])

  const handleToggle = (code: string) => {
    const exists = selectedSteels.includes(code)
    const next = exists ? selectedSteels.filter((c) => c !== code) : [...selectedSteels, code]
    onChange(next)
  }

  const handleSelectAll = () => {
    const all = options.map((opt) => opt.code)
    onChange(all)
  }

  const handleClear = () => {
    onChange([])
  }

  const isAllSelected = options.length > 0 && selectedSteels.length === options.length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Selecionar Aços"
          data-testid="steel-multiselect-trigger"
          className={`h-8 px-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium flex items-center justify-between transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97] text-left text-xs ${
            disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
          } ${className}`}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <Layers className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
            <span className="truncate">{triggerLabel}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {selectedSteels.length > 0 && !isAllSelected && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 h-4 bg-blue-100 text-[#004C97] font-bold"
              >
                {selectedSteels.length}
              </Badge>
            )}
            {selectedSteels.length > 0 && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    handleClear()
                  }
                }}
                className="hover:text-rose-600 text-slate-400 p-0.5 rounded-xs"
                title="Limpar seleção"
              >
                <X className="w-3 h-3" />
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-2 text-xs space-y-2 z-50 bg-white shadow-xl border-slate-200"
        align="start"
      >
        {/* Campo de pesquisa interno */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
          <Input
            placeholder="Buscar por código ou descrição do aço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs bg-slate-50"
            data-testid="steel-multiselect-search"
          />
        </div>

        {/* Botões Selecionar Todos / Limpar Seleção */}
        <div className="flex items-center justify-between pt-1 border-b border-slate-100 pb-1.5 text-[11px]">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[#004C97] hover:underline font-semibold"
            data-testid="steel-select-all"
          >
            Selecionar todos ({options.length})
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-500 hover:text-slate-800 hover:underline"
            data-testid="steel-clear-all"
          >
            Limpar seleção
          </button>
        </div>

        {/* Lista de checkboxes com scroll */}
        <div
          className="max-h-56 overflow-y-auto space-y-1 pt-1 pr-0.5"
          tabIndex={0}
          role="region"
          aria-label="Lista de aços disponíveis"
        >
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-slate-400 text-xs">Nenhum aço encontrado</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selectedSteels.includes(opt.code)
              return (
                <label
                  key={opt.code}
                  data-testid={`steel-checkbox-${opt.code}`}
                  className={`flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/80 text-[#004C97] font-semibold' : 'text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(opt.code)}
                    className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97] w-3.5 h-3.5 shrink-0"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {opt.code}
                      </span>
                      {opt.poolCode && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600 border-slate-200"
                        >
                          {opt.poolCode}
                        </Badge>
                      )}
                    </div>
                    {opt.description && (
                      <span className="text-[10px] text-slate-500 truncate">{opt.description}</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#004C97] ml-auto shrink-0" />}
                </label>
              )
            })
          )}
        </div>

        {/* Rodapé informativo */}
        <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <span>
            {selectedSteels.length === 0
              ? 'Todos selecionados por padrão'
              : `${selectedSteels.length} de ${options.length} selecionado(s)`}
          </span>
          <span className="font-mono font-medium">ZPPT002 / SDC</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default SteelMultiSelect

/**
 * Componente de Seleção Múltipla de Fornecedores Homologados da MP
 * - Opções fixas homologadas em SYSTEM_HOMOLOGATED_SUPPLIERS
 * - Busca/filtro por código, nome ou localidade
 * - Seleção de múltiplos itens com badges removíveis (código + nome)
 * - Botão selecionar todos / limpar
 * - Nunca texto livre
 */

import React, { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search, X, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SYSTEM_HOMOLOGATED_SUPPLIERS, StructuredSupplier } from '@/types/raw-material-application'
import { cn } from '@/lib/utils'

interface SupplierMultiSelectProps {
  selectedSuppliers: StructuredSupplier[]
  onChange: (suppliers: StructuredSupplier[]) => void
  disabled?: boolean
  hasError?: boolean
  className?: string
}

export const SupplierMultiSelect: React.FC<SupplierMultiSelectProps> = ({
  selectedSuppliers,
  onChange,
  disabled = false,
  hasError = false,
  className,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedCodes = useMemo(
    () => new Set(selectedSuppliers.map((s) => s.code)),
    [selectedSuppliers],
  )

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return SYSTEM_HOMOLOGATED_SUPPLIERS
    const q = search.trim().toLowerCase()
    return SYSTEM_HOMOLOGATED_SUPPLIERS.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.cityState && s.cityState.toLowerCase().includes(q)),
    )
  }, [search])

  const handleToggle = (item: { code: string; name: string }) => {
    if (selectedCodes.has(item.code)) {
      onChange(selectedSuppliers.filter((s) => s.code !== item.code))
    } else {
      onChange([...selectedSuppliers, { code: item.code, name: item.name }])
    }
  }

  const handleRemove = (code: string) => {
    onChange(selectedSuppliers.filter((s) => s.code !== code))
  }

  const handleSelectAll = () => {
    onChange(SYSTEM_HOMOLOGATED_SUPPLIERS.map((s) => ({ code: s.code, name: s.name })))
  }

  const handleClear = () => {
    onChange([])
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            data-testid="supplier-multiselect-trigger"
            className={cn(
              'w-full justify-between h-9 px-2.5 text-xs bg-white text-slate-800 font-normal border hover:bg-slate-50',
              hasError
                ? 'border-red-500 ring-1 ring-red-500'
                : 'border-slate-300 focus-visible:ring-[#004C97]',
              disabled && 'bg-slate-100 opacity-60 cursor-not-allowed',
            )}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
              <span className="truncate">
                {selectedSuppliers.length === 0
                  ? 'Selecione um ou mais fornecedores homologados...'
                  : `${selectedSuppliers.length} fornecedor(es) selecionado(s)`}
              </span>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0 ml-1" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[340px] sm:w-[400px] p-2 text-xs space-y-2 z-50 bg-white shadow-xl border-slate-200"
          align="start"
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Buscar por código ou nome da siderúrgica..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50"
              data-testid="supplier-search-input"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-b border-slate-100 pb-1 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[#004C97] hover:underline font-semibold"
              data-testid="supplier-select-all"
            >
              Selecionar todos ({SYSTEM_HOMOLOGATED_SUPPLIERS.length})
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-slate-800 hover:underline"
              data-testid="supplier-clear-all"
            >
              Limpar
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pt-1 pr-0.5">
            {filteredSuppliers.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs">
                Nenhum fornecedor encontrado
              </div>
            ) : (
              filteredSuppliers.map((sup) => {
                const isSelected = selectedCodes.has(sup.code)
                return (
                  <label
                    key={sup.code}
                    data-testid={`supplier-option-${sup.code}`}
                    className={cn(
                      'flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors',
                      isSelected ? 'bg-blue-50/80 text-[#004C97] font-semibold' : 'text-slate-700',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(sup)}
                      className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97] w-3.5 h-3.5 shrink-0"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {sup.code}
                        </span>
                        <span className="text-xs text-slate-700 truncate">{sup.name}</span>
                      </div>
                      {sup.cityState && (
                        <span className="text-[10px] text-slate-400 truncate">{sup.cityState}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#004C97] ml-auto shrink-0" />
                    )}
                  </label>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Lista de Badges Selecionados com Remoção Individual */}
      {selectedSuppliers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1" data-testid="selected-suppliers-badges">
          {selectedSuppliers.map((sup) => (
            <Badge
              key={sup.code}
              variant="outline"
              data-testid={`badge-supplier-${sup.code}`}
              className="bg-blue-50 text-[#004C97] border-blue-200 text-xs py-0.5 px-2 font-medium flex items-center gap-1"
            >
              <span className="font-mono font-bold">{sup.code}</span>
              <span className="text-slate-700">— {sup.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(sup.code)}
                  data-testid={`btn-remove-supplier-${sup.code}`}
                  className="hover:text-red-600 text-slate-400 p-0.5 ml-0.5 rounded transition-colors"
                  title={`Remover ${sup.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
export default SupplierMultiSelect

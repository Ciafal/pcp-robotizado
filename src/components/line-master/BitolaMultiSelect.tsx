/**
 * BitolaMultiSelect.tsx
 * Seleção MÚLTIPLA de Bitolas vinculadas ao Centro / Catálogo SAP ECC ZPPT052-APLICACAO
 * - Consulta via sapParametersMasterDataService.fetchBitolas({ center })
 * - Opção padrão "Não há" caso não haja restrição
 * - Badges com remoção individual
 * - Busca com debounce/filtro interno
 * - Seleção de múltiplas bitolas sem truncamento
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Check,
  ChevronsUpDown,
  Search,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  CircleDot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  sapParametersMasterDataService,
  SapBitolaOption,
  OPCAO_FIXA_NAO_HA,
} from '@/services/sap-parameters-master-data-service'
import { cn } from '@/lib/utils'

interface BitolaMultiSelectProps {
  selectedBitolas: string[]
  onChange: (bitolas: string[]) => void
  centerCode?: string
  disabled?: boolean
  hasError?: boolean
  className?: string
}

export const BitolaMultiSelect: React.FC<BitolaMultiSelectProps> = ({
  selectedBitolas,
  onChange,
  centerCode,
  disabled = false,
  hasError = false,
  className,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUnavailable, setIsUnavailable] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [options, setOptions] = useState<SapBitolaOption[]>([])

  const loadData = async (force = false) => {
    setIsLoading(true)
    setErrorMessage(null)
    setIsUnavailable(false)
    try {
      const res = await sapParametersMasterDataService.fetchBitolas({
        center: centerCode,
        forceRefresh: force,
      })
      if (res.success) {
        setOptions(res.data)
        setIsUnavailable(false)
      } else {
        setIsUnavailable(true)
        setErrorMessage(res.error || 'Não foi possível carregar bitolas do SAP.')
      }
    } catch {
      setIsUnavailable(true)
      setErrorMessage('Não foi possível carregar bitolas do SAP.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [centerCode])

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.trim().toLowerCase()
    return options.filter((item) => item.label.toLowerCase().includes(q))
  }, [options, search])

  const selectedSet = useMemo(() => new Set(selectedBitolas), [selectedBitolas])

  const handleToggle = (val: string) => {
    if (selectedSet.has(val)) {
      onChange(selectedBitolas.filter((b) => b !== val))
    } else {
      onChange([...selectedBitolas, val])
    }
  }

  const handleRemove = (val: string) => {
    onChange(selectedBitolas.filter((b) => b !== val))
  }

  const handleSelectAll = () => {
    const all = options.map((o) => o.value)
    onChange(all)
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
            data-testid="bitola-multiselect-trigger"
            className={cn(
              'w-full justify-between h-9 px-2.5 text-xs bg-white text-slate-800 font-normal border hover:bg-slate-50',
              hasError
                ? 'border-red-500 ring-1 ring-red-500'
                : 'border-slate-300 focus-visible:ring-[#004C97]',
              disabled && 'bg-slate-100 opacity-60 cursor-not-allowed',
            )}
          >
            <div className="flex items-center gap-1.5 truncate">
              <CircleDot className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
              <span className="truncate">
                {selectedBitolas.length === 0
                  ? 'Selecione uma ou mais bitolas (ZPPT052)...'
                  : `${selectedBitolas.length} bitola(s) selecionada(s)`}
              </span>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50 shrink-0 ml-1" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[320px] sm:w-[380px] p-2 text-xs space-y-2 z-50 bg-white shadow-xl border-slate-200"
          align="start"
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Pesquisar bitola..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50"
              data-testid="bitola-search-input"
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-b border-slate-100 pb-1 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[#004C97] hover:underline font-semibold"
              data-testid="bitola-select-all"
            >
              Selecionar todas ({options.length})
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-slate-800 hover:underline"
              data-testid="bitola-clear-all"
            >
              Limpar
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pt-1 pr-0.5">
            {/* Opção fixa "Não há" */}
            <label
              data-testid="bitola-option-nao-ha"
              className={cn(
                'flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors',
                selectedSet.has(OPCAO_FIXA_NAO_HA)
                  ? 'bg-blue-50/80 text-[#004C97] font-semibold'
                  : 'text-slate-700',
              )}
            >
              <input
                type="checkbox"
                checked={selectedSet.has(OPCAO_FIXA_NAO_HA)}
                onChange={() => handleToggle(OPCAO_FIXA_NAO_HA)}
                className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97] w-3.5 h-3.5 shrink-0"
              />
              <div className="flex items-center gap-2 flex-1">
                <span className="font-bold text-slate-900">{OPCAO_FIXA_NAO_HA}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1 bg-slate-100 text-slate-600 border-slate-300"
                >
                  Sem restrição
                </Badge>
              </div>
              {selectedSet.has(OPCAO_FIXA_NAO_HA) && (
                <Check className="w-3.5 h-3.5 text-[#004C97] ml-auto shrink-0" />
              )}
            </label>

            {isLoading ? (
              <div className="flex items-center justify-center p-3 text-slate-500 gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#004C97]" />
                <span>Carregando bitolas SAP...</span>
              </div>
            ) : isUnavailable ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-semibold text-[11px]">SAP ZPPT052 Indisponível</span>
                </div>
                <p className="text-[10px] text-amber-800">{errorMessage}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => loadData(true)}
                  className="w-full h-6 text-[10px] bg-white border-amber-300"
                >
                  <RefreshCw className="w-3 h-3 mr-1 text-amber-700" /> Tentar novamente
                </Button>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-400 text-xs">
                Nenhuma bitola encontrada
              </div>
            ) : (
              filteredOptions.map((item) => {
                const isSelected = selectedSet.has(item.value)
                return (
                  <label
                    key={item.value}
                    data-testid={`bitola-option-${item.value}`}
                    className={cn(
                      'flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors',
                      isSelected ? 'bg-blue-50/80 text-[#004C97] font-semibold' : 'text-slate-700',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(item.value)}
                      className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97] w-3.5 h-3.5 shrink-0"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {item.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] py-0 px-1 bg-blue-50 text-[#004C97] border-blue-200"
                      >
                        SAP
                      </Badge>
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

      {/* Badges de Bitolas Selecionadas */}
      {selectedBitolas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1" data-testid="selected-bitolas-badges">
          {selectedBitolas.map((bitola) => (
            <Badge
              key={bitola}
              variant="outline"
              data-testid={`badge-bitola-${bitola}`}
              className="bg-blue-50 text-[#004C97] border-blue-200 text-xs py-0.5 px-2 font-mono font-medium flex items-center gap-1"
            >
              <span>{bitola}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(bitola)}
                  data-testid={`btn-remove-bitola-${bitola}`}
                  className="hover:text-red-600 text-slate-400 p-0.5 ml-0.5 rounded transition-colors"
                  title={`Remover ${bitola}`}
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
export default BitolaMultiSelect

/**
 * Combobox pesquisável para seleção de Tipo de Aço (Origem SAP ECC ZPPT002-MATNR)
 * - Busca incremental com rolagem
 * - Apresenta código + descrição técnica
 * - Não permite digitação livre de valores inexistentes
 * - Tratamento gracioso quando SAP indisponível com mensagem oficial e botão de retry
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Check, ChevronsUpDown, Loader2, RefreshCw, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  sapParametersMasterDataService,
  SapTipoAcoOption,
} from '@/services/sap-parameters-master-data-service'

interface TipoAcoSelectorProps {
  value: string
  onChange: (value: string, option?: SapTipoAcoOption) => void
  centerCode?: string
  disabled?: boolean
  hasError?: boolean
  className?: string
}

export const TipoAcoSelector: React.FC<TipoAcoSelectorProps> = ({
  value,
  onChange,
  centerCode,
  disabled = false,
  hasError = false,
  className,
}) => {
  const [open, setOpen] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sapTiposAco, setSapTiposAco] = useState<SapTipoAcoOption[]>([])

  const loadData = async (force = false) => {
    setIsLoading(true)
    setErrorMessage(null)
    setIsUnavailable(false)

    try {
      const res = await sapParametersMasterDataService.fetchTiposAco({
        center: centerCode,
        forceRefresh: force,
      })

      if (res.success) {
        setSapTiposAco(res.data)
        setIsUnavailable(false)
      } else {
        setIsUnavailable(true)
        setErrorMessage(
          res.error ||
            'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
        )
      }
    } catch {
      setIsUnavailable(true)
      setErrorMessage(
        'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [centerCode])

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return sapTiposAco
    const q = search.toLowerCase()
    return sapTiposAco.filter(
      (item) =>
        item.code.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q),
    )
  }, [sapTiposAco, search])

  // Identificar descrição do item selecionado caso venha apenas o código
  const selectedOption = useMemo(() => {
    if (!value) return null
    return sapTiposAco.find((item) => item.code === value) || null
  }, [sapTiposAco, value])

  const displayLabel = selectedOption ? selectedOption.label : value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid="select-tipo-aco-trigger"
          className={cn(
            'w-full justify-between font-normal text-left h-8 px-2.5 text-xs bg-white text-slate-900 border hover:bg-slate-50',
            hasError
              ? 'border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500'
              : 'border-slate-300 focus-visible:ring-[#004C97]',
            disabled && 'opacity-60 cursor-not-allowed bg-slate-100',
            className,
          )}
        >
          <span className="truncate">
            {value ? (
              <span className="font-medium text-slate-900">{displayLabel}</span>
            ) : (
              <span className="text-slate-400">Selecione o Tipo de Aço (ZPPT002)...</span>
            )}
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {value && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange('')
                }}
                className="hover:text-rose-600 text-slate-400 p-0.5"
                title="Limpar seleção"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] sm:w-[400px] p-0 shadow-lg border-slate-200 z-50 text-xs"
        align="start"
      >
        <Command shouldFilter={false} className="w-full">
          <div className="flex items-center border-b px-2.5">
            <CommandInput
              placeholder="Pesquisar por código ou descrição do aço..."
              value={search}
              onValueChange={setSearch}
              className="h-8 text-xs border-0 focus:ring-0"
              data-testid="input-search-tipo-aco"
            />
          </div>

          <CommandList className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-xs text-slate-500 gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#004C97]" />
                Consultando tabela SAP ZPPT002 via RFC...
              </div>
            ) : isUnavailable ? (
              <div
                className="p-3 text-xs bg-amber-50/90 border-t border-amber-200 text-amber-900 space-y-2"
                data-testid="sap-tipo-aco-unavailable"
              >
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-[11px] leading-tight">
                      Integração SAP Indisponível
                    </p>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      {errorMessage ||
                        'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="btn-retry-sap-tipo-aco"
                  onClick={() => loadData(true)}
                  className="w-full h-7 text-[11px] font-semibold bg-white border-amber-300 text-amber-900 hover:bg-amber-100 gap-1.5"
                >
                  <RefreshCw className="w-3 h-3 text-amber-700" /> Tentar novamente
                </Button>
              </div>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty className="p-4 text-xs text-center text-slate-500">
                Nenhum tipo de aço encontrado na tabela ZPPT002.
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Tipos de Aço SAP ECC (ZPPT002-MATNR)">
                {filteredOptions.map((item) => {
                  const isSelected = value === item.code
                  return (
                    <CommandItem
                      key={item.code}
                      value={item.code}
                      data-testid={`tipo-aco-option-${item.code}`}
                      onSelect={() => {
                        onChange(item.code, item)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex items-center justify-between p-2 cursor-pointer hover:bg-blue-50/80',
                        isSelected && 'bg-blue-50 font-bold text-[#004C97]',
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-900 text-xs">
                            {item.code}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 px-1 bg-blue-50 text-[#004C97] border-blue-200"
                          >
                            ZPPT002
                          </Badge>
                        </div>
                        {item.description && (
                          <span className="text-[11px] text-slate-500 line-clamp-1">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 text-[#004C97] shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
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
export default TipoAcoSelector

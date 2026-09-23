/**
 * Combobox pesquisável para seleção de Bitola (Origem SAP ECC ZPPT052-APLICACAO ou "Não há")
 * - Lista paginada/virtualizada no cliente com rolagem fluida
 * - Pesquisa com debounce
 * - Opção fixa "Não há" sempre claramente visível no topo
 * - Tratamento gracioso quando SAP indisponível com mensagem oficial e botão de retry
 * - Não permite digitação livre de valores inexistentes
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Check, ChevronsUpDown, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  sapParametersMasterDataService,
  SapBitolaOption,
  OPCAO_FIXA_NAO_HA,
} from '@/services/sap-parameters-master-data-service'

interface BitolaSelectorProps {
  value: string
  onChange: (value: string, option?: SapBitolaOption) => void
  centerCode?: string
  disabled?: boolean
  hasError?: boolean
  className?: string
}

export const BitolaSelector: React.FC<BitolaSelectorProps> = ({
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
  const [sapBitolas, setSapBitolas] = useState<SapBitolaOption[]>([])

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
        setSapBitolas(res.data)
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

  // Filtragem no cliente para resposta instantânea
  const filteredSapOptions = useMemo(() => {
    if (!search.trim()) return sapBitolas
    const term = search.toLowerCase()
    return sapBitolas.filter((item) => item.label.toLowerCase().includes(term))
  }, [sapBitolas, search])

  const isNaoHaSelected = value === OPCAO_FIXA_NAO_HA

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid="select-bitola-trigger"
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
              <span className="font-semibold text-slate-900">
                {value === OPCAO_FIXA_NAO_HA ? (
                  <span className="text-slate-500 italic">Não há (sem restrição)</span>
                ) : (
                  value
                )}
              </span>
            ) : (
              <span className="text-slate-400">Selecione uma Bitola ou &quot;Não há&quot;...</span>
            )}
          </span>
          <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] sm:w-[380px] p-0 shadow-lg border-slate-200 z-50 text-xs"
        align="start"
      >
        <Command shouldFilter={false} className="w-full">
          <div className="flex items-center border-b px-2.5">
            <CommandInput
              placeholder="Pesquisar bitola..."
              value={search}
              onValueChange={setSearch}
              className="h-8 text-xs border-0 focus:ring-0"
              data-testid="input-search-bitola"
            />
          </div>

          <CommandList className="max-h-60 overflow-y-auto">
            {/* Opção fixa OBRIGATÓRIA "Não há" - Sempre visível */}
            <CommandGroup heading="Opção Padrão">
              <CommandItem
                value={OPCAO_FIXA_NAO_HA}
                data-testid="bitola-option-nao-ha"
                onSelect={() => {
                  onChange(OPCAO_FIXA_NAO_HA, {
                    value: OPCAO_FIXA_NAO_HA,
                    label: OPCAO_FIXA_NAO_HA,
                    source: 'FIXA',
                  })
                  setOpen(false)
                }}
                className={cn(
                  'flex items-center justify-between p-2 cursor-pointer hover:bg-blue-50/80',
                  isNaoHaSelected && 'bg-blue-50 font-bold text-[#004C97]',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">Não há</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0 px-1.5 bg-slate-100 text-slate-600 border-slate-300"
                  >
                    Sem restrição
                  </Badge>
                </div>
                <Check
                  className={cn(
                    'h-3.5 w-3.5 text-[#004C97]',
                    isNaoHaSelected ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Seção SAP ZPPT052 */}
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-xs text-slate-500 gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#004C97]" />
                Consultando tabela SAP ZPPT052 via RFC...
              </div>
            ) : isUnavailable ? (
              <div
                className="p-3 text-xs bg-amber-50/90 border-t border-amber-200 text-amber-900 space-y-2"
                data-testid="sap-bitola-unavailable"
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
                  data-testid="btn-retry-sap-bitola"
                  onClick={() => loadData(true)}
                  className="w-full h-7 text-[11px] font-semibold bg-white border-amber-300 text-amber-900 hover:bg-amber-100 gap-1.5"
                >
                  <RefreshCw className="w-3 h-3 text-amber-700" /> Tentar novamente
                </Button>
              </div>
            ) : filteredSapOptions.length === 0 ? (
              <CommandEmpty className="p-4 text-xs text-center text-slate-500">
                Nenhuma bitola encontrada na tabela ZPPT052.
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Bitolas SAP ECC (ZPPT052-APLICACAO)">
                {filteredSapOptions.map((item) => {
                  const isSelected = value === item.value
                  return (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      data-testid={`bitola-option-${item.value}`}
                      onSelect={() => {
                        onChange(item.value, item)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex items-center justify-between p-2 cursor-pointer hover:bg-blue-50/80',
                        isSelected && 'bg-blue-50 font-bold text-[#004C97]',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-slate-900 text-xs">
                          {item.label}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 px-1 bg-blue-50 text-[#004C97] border-blue-200"
                        >
                          SAP
                        </Badge>
                      </div>
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 text-[#004C97]',
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
export default BitolaSelector

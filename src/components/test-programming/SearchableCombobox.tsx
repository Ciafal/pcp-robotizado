import React, { useState } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface SearchableComboboxOption {
  value: string // ID interno
  label: string // Texto de exibição
  subLabel?: string // Setor, código ou detalhe
}

interface SearchableComboboxProps {
  options: SearchableComboboxOption[]
  value: string
  onChange: (value: string, selectedOption?: SearchableComboboxOption) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  error?: string | null
  disabled?: boolean
  className?: string
  id?: string
  'data-testid'?: string
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyText = 'Nenhum registro encontrado.',
  loading = false,
  error = null,
  disabled = false,
  className,
  id,
  'data-testid': testId,
}) => {
  const [open, setOpen] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          data-testid={testId}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'w-full h-8 justify-between text-xs px-2.5 font-normal bg-white border-slate-300 hover:bg-slate-50',
            !selectedOption && 'text-slate-400',
            error && 'border-red-400 focus:ring-red-300',
            className,
          )}
        >
          <span className="truncate text-left flex-1">
            {loading ? (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Carregando...
              </span>
            ) : selectedOption ? (
              <span className="text-slate-900 font-medium">{selectedOption.label}</span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0 z-50 shadow-md border-slate-200"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-xs" />
          <CommandList className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#004C97]" />
                <span>Carregando dados cadastrais...</span>
              </div>
            ) : error ? (
              <div className="p-3 text-center text-xs text-red-600 space-y-1">
                <p className="font-semibold">Erro ao carregar lista</p>
                <p className="text-[11px] text-red-500">{error}</p>
              </div>
            ) : (
              <>
                <CommandEmpty className="py-4 text-center text-xs text-slate-500">
                  {emptyText}
                </CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => {
                    const isSelected = opt.value === value
                    return (
                      <CommandItem
                        key={opt.value}
                        value={`${opt.label} ${opt.subLabel || ''} ${opt.value}`}
                        onSelect={() => {
                          onChange(opt.value, opt)
                          setOpen(false)
                        }}
                        className="text-xs py-1.5 px-2 cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                          <span className={cn('truncate', isSelected && 'font-bold text-[#004C97]')}>
                            {opt.label}
                          </span>
                          {opt.subLabel && (
                            <span className="text-[10px] text-slate-400 truncate">
                              {opt.subLabel}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#004C97] shrink-0" />}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

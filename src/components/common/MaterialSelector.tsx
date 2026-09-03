import React, { useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, Package, Search } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { weeklyScheduleService } from '@/services/weekly-schedule-service'
import { OfficialMaterialOption } from '@/types/weekly-schedule'

export interface MaterialOption {
  code: string
  name: string
  family?: string
  dimension?: string
  steelGrade?: string
}

export interface MaterialSelectorProps {
  value?: string
  onChange: (value: string, material?: MaterialOption) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  lineId?: string
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  value,
  onChange,
  placeholder = 'Selecione ou busque o material SAP...',
  disabled = false,
  className,
  lineId,
}) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    let isMounted = true
    const loadMaterials = async () => {
      setLoading(true)
      try {
        const rawMaterials = await weeklyScheduleService.getOfficialMaterialsForLine(lineId || 'L1')
        if (!isMounted) return

        const mapped: MaterialOption[] = rawMaterials.map((m: OfficialMaterialOption) => ({
          code: m.material_code,
          name: m.material_name || m.material_code,
          family: m.family_name || m.family_code || undefined,
          dimension: m.dimension_spec || undefined,
          steelGrade: m.steel_grade || undefined,
        }))

        setMaterials(mapped)
      } catch (err) {
        console.error('Erro ao carregar catálogo de materiais para o seletor:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadMaterials()
    return () => {
      isMounted = false
    }
  }, [lineId])

  const selectedMaterial = useMemo(() => {
    if (!value) return null
    return (
      materials.find((m) => m.code.trim().toUpperCase() === value.trim().toUpperCase()) || {
        code: value,
        name: value,
      }
    )
  }, [value, materials])

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return materials
    return materials.filter(
      (m) =>
        m.code.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.family && m.family.toLowerCase().includes(q)) ||
        (m.dimension && m.dimension.toLowerCase().includes(q)) ||
        (m.steelGrade && m.steelGrade.toLowerCase().includes(q)),
    )
  }, [materials, searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal text-left h-10 bg-white border-slate-300 hover:bg-slate-50 text-slate-800',
            !value && 'text-slate-400',
            className,
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Package className="w-4 h-4 text-[#004C97] shrink-0" />
            {selectedMaterial ? (
              <span className="truncate">
                <strong className="text-slate-900 font-medium mr-1.5">
                  {selectedMaterial.code}
                </strong>
                {selectedMaterial.name !== selectedMaterial.code && (
                  <span className="text-slate-500 text-xs">({selectedMaterial.name})</span>
                )}
              </span>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0 shadow-lg border-slate-200 z-50" align="start">
        <Command shouldFilter={false} className="w-full">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
            <CommandInput
              placeholder="Buscar por código SAP, descrição, bitola ou família..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-10 text-xs border-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-6 text-xs text-slate-500 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#004C97]" />
                Carregando catálogo SAP...
              </div>
            ) : filteredMaterials.length === 0 ? (
              <CommandEmpty className="p-4 text-xs text-center text-slate-500">
                Nenhum material encontrado no catálogo SAP.
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Catálogo de Materiais SAP">
                {filteredMaterials.map((mat) => {
                  const isSelected = value?.trim().toUpperCase() === mat.code.trim().toUpperCase()
                  return (
                    <CommandItem
                      key={mat.code}
                      value={mat.code}
                      onSelect={() => {
                        onChange(mat.code, mat)
                        setOpen(false)
                      }}
                      className={cn(
                        'flex items-center justify-between p-2.5 cursor-pointer hover:bg-blue-50/70 aria-selected:bg-blue-50',
                        isSelected && 'bg-blue-50 font-medium',
                      )}
                    >
                      <div className="flex flex-col gap-0.5 max-w-[90%]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 text-xs font-mono">
                            {mat.code}
                          </span>
                          {mat.family && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 bg-slate-100 text-slate-600 border-slate-300 font-normal"
                            >
                              {mat.family}
                            </Badge>
                          )}
                          {mat.dimension && (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 bg-blue-50 text-[#004C97] border-blue-200 font-normal"
                            >
                              {mat.dimension}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-600 truncate">{mat.name}</span>
                      </div>
                      <Check
                        className={cn(
                          'h-4 w-4 text-[#004C97] shrink-0',
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

export default MaterialSelector

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, RotateCcw, Search } from 'lucide-react'
import { CenterOperationalStatus } from '@/lib/pcp/efficiency-status-rules'
import { CenterEfficiencyFilters } from '@/services/efficiency-center-service'

interface EfficiencyCenterFiltersBarProps {
  initialFilters: CenterEfficiencyFilters
  options: {
    companies: { code: string; name: string }[]
    plants: { code: string; name: string; companyCode: string }[]
    lines: { code: string; name: string; plantCode: string }[]
    centers: { code: string; name: string; lineCode: string }[]
  }
  onApplyFilters: (filters: CenterEfficiencyFilters) => void
  onResetFilters: () => void
  isLoading?: boolean
}

export const EfficiencyCenterFiltersBar: React.FC<EfficiencyCenterFiltersBarProps> = ({
  initialFilters,
  options,
  onApplyFilters,
  onResetFilters,
  isLoading = false,
}) => {
  const [localFilters, setLocalFilters] = useState<CenterEfficiencyFilters>(initialFilters)

  // Sincroniza se os filtros externos mudarem
  useEffect(() => {
    setLocalFilters(initialFilters)
  }, [initialFilters])

  const handleChange = <K extends keyof CenterEfficiencyFilters>(
    field: K,
    value: CenterEfficiencyFilters[K],
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    onApplyFilters(localFilters)
  }

  const handleReset = () => {
    const defaultFilters: CenterEfficiencyFilters = {
      companyCode: 'ALL',
      plantCode: 'ALL',
      lineCode: 'ALL',
      centerCode: 'ALL',
      status: 'ALL',
      startDate: '',
      endDate: '',
      product: '',
      order: '',
      allowDraftSchedule: false,
    }
    setLocalFilters(defaultFilters)
    onResetFilters()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Filter className="w-4 h-4 text-[#004C97]" />
          <span>Filtros Operacionais — Eficiência Centro</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isLoading}
            className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Limpar filtros
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleApply()}
            disabled={isLoading}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium gap-1.5 shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            {isLoading ? 'Filtrando...' : 'Aplicar filtros'}
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleApply}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5"
      >
        {/* 1. Empresa */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-slate-600">Empresa</Label>
          <Select
            value={localFilters.companyCode || 'ALL'}
            onValueChange={(val) => handleChange('companyCode', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Todas" />
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

        {/* 2. Planta */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-slate-600">Planta</Label>
          <Select
            value={localFilters.plantCode || 'ALL'}
            onValueChange={(val) => handleChange('plantCode', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Plantas</SelectItem>
              {options.plants.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Linha */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-slate-600">Linha</Label>
          <Select
            value={localFilters.lineCode || 'ALL'}
            onValueChange={(val) => handleChange('lineCode', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Linhas</SelectItem>
              {options.lines.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  Linha {l.code} ({l.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 4. Centro */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-slate-600">Centro de Trabalho</Label>
          <Select
            value={localFilters.centerCode || 'ALL'}
            onValueChange={(val) => handleChange('centerCode', val)}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Centros</SelectItem>
              {options.centers.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. Data Inicial */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-slate-600">Data Inicial</Label>
          <Input
            type="date"
            value={localFilters.startDate || ''}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="h-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        {/* 6. Data Final */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-slate-600">Data Final</Label>
          <Input
            type="date"
            value={localFilters.endDate || ''}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="h-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        {/* 7. Status */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-slate-600">Status</Label>
          <Select
            value={localFilters.status || 'ALL'}
            onValueChange={(val) => handleChange('status', val as CenterOperationalStatus | 'ALL')}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Status</SelectItem>
              <SelectItem value="DENTRO_PLANEJADO">Dentro do planejado</SelectItem>
              <SelectItem value="ATENCAO">Atenção</SelectItem>
              <SelectItem value="ATRASADO">Atrasado</SelectItem>
              <SelectItem value="CRITICO">Crítico</SelectItem>
              <SelectItem value="SEM_APONTAMENTO">Sem apontamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 8. Produto / Ordem */}
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-slate-600">Produto ou Ordem</Label>
          <Input
            placeholder="Ex: TQ-50, OP-45..."
            value={localFilters.product || localFilters.order || ''}
            onChange={(e) => {
              handleChange('product', e.target.value)
              handleChange('order', e.target.value)
            }}
            className="h-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>
      </form>
    </div>
  )
}

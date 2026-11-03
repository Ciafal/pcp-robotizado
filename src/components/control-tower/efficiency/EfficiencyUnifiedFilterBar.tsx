import React from 'react'
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
import { RotateCcw, RefreshCw, Filter, Search } from 'lucide-react'
import { PCPContextFilters } from '@/components/pcp/PCPContextFilters'

import { PeriodAnalysisSelector, PeriodSelectionValue } from './PeriodAnalysisSelector'

export interface UnifiedEfficiencyFilters {
  companyCode: string
  plantCode: string
  lineCode: string
  centerCode?: string
  product?: string
  startDate?: string
  endDate?: string
  search?: string
  status?: string
  periodType?: string
  periodLabel?: string
  startDatePtBr?: string
  endDatePtBr?: string
  week?: number
  year?: number
}

export interface EfficiencyFilterOptions {
  companies: { code: string; name: string }[]
  plants: { code: string; name: string; companyCode: string }[]
  lines: { code: string; name: string; plantCode: string }[]
  centers: { code: string; name: string; lineCode: string }[]
}

interface EfficiencyUnifiedFilterBarProps {
  filters: UnifiedEfficiencyFilters
  options: EfficiencyFilterOptions
  onChange: (next: UnifiedEfficiencyFilters) => void
  onReset: () => void
  onRefresh?: () => void
  isLoading?: boolean
  showCenterFilter?: boolean
  showLine2?: boolean
  showPeriodSelector?: boolean
  onApply?: (filters: UnifiedEfficiencyFilters) => void
}

export const EfficiencyUnifiedFilterBar: React.FC<EfficiencyUnifiedFilterBarProps> = ({
  filters,
  options,
  onChange,
  onReset,
  onRefresh,
  isLoading = false,
  showCenterFilter = true,
  showLine2 = true,
  showPeriodSelector = true,
  onApply,
}) => {
  // Cascata reativa:
  // Empresa -> Plantas da empresa
  const availablePlants = React.useMemo(() => {
    if (!filters.companyCode || filters.companyCode === 'ALL') {
      return options.plants
    }
    return options.plants.filter(
      (p) => !p.companyCode || p.companyCode === filters.companyCode || p.companyCode === 'CIAFAL',
    )
  }, [filters.companyCode, options.plants])

  // Planta -> Linhas da planta
  const availableLines = React.useMemo(() => {
    if (!filters.plantCode || filters.plantCode === 'ALL') {
      return options.lines
    }
    return options.lines.filter((l) => !l.plantCode || l.plantCode === filters.plantCode)
  }, [filters.plantCode, options.lines])

  // Linha -> Centros da linha
  const availableCenters = React.useMemo(() => {
    if (!filters.lineCode || filters.lineCode === 'ALL') {
      return options.centers
    }
    return options.centers.filter((c) => !c.lineCode || c.lineCode === filters.lineCode)
  }, [filters.lineCode, options.centers])

  const handleCompanyChange = (val: string) => {
    onChange({
      ...filters,
      companyCode: val,
      plantCode: 'ALL',
      lineCode: 'ALL',
      centerCode: 'ALL',
    })
  }

  const handlePlantChange = (val: string) => {
    onChange({
      ...filters,
      plantCode: val,
      lineCode: 'ALL',
      centerCode: 'ALL',
    })
  }

  const handleLineChange = (val: string) => {
    onChange({
      ...filters,
      lineCode: val,
      centerCode: 'ALL',
    })
  }

  const handleCenterChange = (val: string) => {
    onChange({
      ...filters,
      centerCode: val,
    })
  }

  const handlePeriodChange = (p: PeriodSelectionValue) => {
    onChange({
      ...filters,
      periodType: p.type,
      startDate: p.startDate,
      endDate: p.endDate,
      startDatePtBr: p.startDatePtBr,
      endDatePtBr: p.endDatePtBr,
      periodLabel: p.displayLabel,
      week: p.week,
      year: p.year,
    })
  }

  const handlePeriodApply = (p: PeriodSelectionValue) => {
    const nextFilters: UnifiedEfficiencyFilters = {
      ...filters,
      periodType: p.type,
      startDate: p.startDate,
      endDate: p.endDate,
      startDatePtBr: p.startDatePtBr,
      endDatePtBr: p.endDatePtBr,
      periodLabel: p.displayLabel,
      week: p.week,
      year: p.year,
    }
    onChange(nextFilters)
    if (onApply) onApply(nextFilters)
    if (onRefresh) onRefresh()
  }

  const handlePeriodReset = () => {
    onReset()
  }

  return (
    <div className="space-y-3">
      {/* SELETOR DE PERÍODO DE ANÁLISE INTEGRADO (Ontem | Hoje | Semana | Mês | Ano | Personalizado) */}
      {showPeriodSelector && (
        <PeriodAnalysisSelector
          value={{
            type: (filters.periodType as any) || 'HOJE',
            startDate: filters.startDate,
            endDate: filters.endDate,
            startDatePtBr: filters.startDatePtBr,
            endDatePtBr: filters.endDatePtBr,
            week: filters.week,
            year: filters.year,
            displayLabel: filters.periodLabel || '',
          }}
          onChange={handlePeriodChange}
          onApply={handlePeriodApply}
          onReset={handlePeriodReset}
          isLoading={isLoading}
        />
      )}

      {/* BLOCO DE FILTROS OPERACIONAIS (Empresa -> Planta -> Linha -> Centro -> Produto -> Status) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        {/* Linha de Título e Ações */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
              <Filter className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                Filtros Operacionais Integrados
              </h3>
              <p className="text-[11px] text-slate-500">
                Hierarquia reativa: Empresa &rarr; Planta &rarr; Linha &rarr; Centro &rarr; Produto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-50 p-0.5 rounded-lg border border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
              title="Limpar todos os filtros para os valores padrão"
              className="h-8 px-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-white gap-1.5 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Limpar filtros</span>
            </Button>

            {/* Botão de conveniência para disparo manual em formulários ou suítes de teste */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ ...filters })
                if (onApply) onApply({ ...filters })
                if (onRefresh) onRefresh()
              }}
              disabled={isLoading}
              title="Aplicar filtros atuais"
              className="h-8 px-2.5 text-xs text-[#004C97] hover:text-[#003870] hover:bg-white gap-1 font-semibold transition-colors"
            >
              <span>Aplicar filtros</span>
            </Button>

            {onRefresh && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                title="Atualizar dados oficiais"
                className="h-8 px-2.5 text-xs text-slate-700 hover:text-[#004C97] hover:bg-white gap-1.5 font-medium transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`}
                />
                <span>Atualizar</span>
              </Button>
            )}
          </div>
        </div>

        {/* Componente Global de Filtros de Contexto PCP: Empresa -> Planta -> Linha -> Centro */}
        <PCPContextFilters
          companyCode={filters.companyCode || 'ALL'}
          plantCode={filters.plantCode || 'ALL'}
          lineCode={filters.lineCode || 'ALL'}
          centerCode={filters.centerCode || 'ALL'}
          companies={options.companies}
          plants={options.plants}
          lines={options.lines}
          centers={options.centers}
          onCompanyChange={handleCompanyChange}
          onPlantChange={handlePlantChange}
          onLineChange={handleLineChange}
          onCenterChange={handleCenterChange}
          showCompany={true}
          showPlant={true}
          showLine={true}
          showCenter={showCenterFilter}
          allowConsolidatedCompany={true}
          allowConsolidatedPlant={true}
          allowConsolidatedLine={true}
          allowConsolidatedCenter={true}
          companyAllText="Todas as Empresas"
          plantAllText="Todas as Plantas"
          lineAllText="Todas as Linhas"
          centerAllText="Todos os Centros"
          companyLabel="Empresa"
          plantLabel="Planta Industrial"
          lineLabel="Linha Produtiva"
          centerLabel="Centro de Trabalho"
          isLoading={isLoading}
          idPrefix="efficiency-ctx"
          className="bg-transparent border-0 p-0 shadow-none space-y-0"
        />

        {/* Status Operacional se showCenterFilter for false */}
        {!showCenterFilter && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 tracking-tight block">
                Status Operacional
              </Label>
              <Select
                value={filters.status || 'ALL'}
                onValueChange={(val) => onChange({ ...filters, status: val })}
              >
                <SelectTrigger className="h-10 text-xs sm:text-sm bg-white border border-slate-300 rounded-md px-3 font-medium text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004C97] focus:border-[#004C97] transition-colors truncate">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="DENTRO_ESPERADO">Dentro do Esperado</SelectItem>
                  <SelectItem value="ATENCAO">Atenção Preventiva</SelectItem>
                  <SelectItem value="CRITICO">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Grade de Filtros — Linha 2 quando aplicável: Produto | Período (dd/mm - dd/mm) | Pesquisa (h-8 padronizado) */}
        {showLine2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
            {/* Produto */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 block">Produto</Label>
              <Input
                type="text"
                placeholder="Ex: Treliça, TQ-50, CA-50..."
                value={filters.product || ''}
                onChange={(e) => onChange({ ...filters, product: e.target.value })}
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#004C97]"
              />
            </div>

            {/* Data Inicial */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 block">Data Inicial</Label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus-visible:ring-[#004C97]"
              />
            </div>

            {/* Data Final */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 block">Data Final</Label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                className="h-8 text-xs bg-white border-slate-200 text-slate-900 focus-visible:ring-[#004C97]"
              />
            </div>

            {/* Pesquisa Livre */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700 block">
                Pesquisa Geral
              </Label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar código, OP, ordem..."
                  value={filters.search || ''}
                  onChange={(e) => onChange({ ...filters, search: e.target.value })}
                  className="pl-8 h-8 text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#004C97]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

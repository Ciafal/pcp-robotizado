import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { StorageDeposit } from '../../services/pcp-storage-deposits-service'
import { Search, RotateCcw, Filter } from 'lucide-react'

export interface ResidualBalancesFiltersState {
  deposito: string
  materialCodigo: string
  materialDescricao: string
  lote: string
  status: string
  dataInicial: string
  dataFinal: string
}

interface ResidualBalancesFilterBarProps {
  filters: ResidualBalancesFiltersState
  deposits: StorageDeposit[]
  onFilterChange: (newFilters: ResidualBalancesFiltersState) => void
  onApplyFilters: () => void
  onClearFilters: () => void
  loading?: boolean
}

export const ResidualBalancesFilterBar: React.FC<ResidualBalancesFilterBarProps> = ({
  filters,
  deposits,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  loading = false,
}) => {
  const handleChange = (field: keyof ResidualBalancesFiltersState, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onApplyFilters()
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Depósito */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Depósito</label>
            <select
              value={filters.deposito}
              onChange={(e) => handleChange('deposito', e.target.value)}
              className="w-full text-xs h-9 border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="TODOS">Todos os depósitos</option>
              {deposits.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.description}
                </option>
              ))}
            </select>
          </div>

          {/* Código do Material */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Código do Material
            </label>
            <div className="relative">
              <Input
                type="text"
                value={filters.materialCodigo}
                onChange={(e) => handleChange('materialCodigo', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ex: MP-AC-1020"
                className="text-xs h-9 pr-8"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Descrição do Material */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Descrição do Material
            </label>
            <Input
              type="text"
              value={filters.materialDescricao}
              onChange={(e) => handleChange('materialDescricao', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: Tarugo, Aço, Fio"
              className="text-xs h-9"
            />
          </div>

          {/* Lote */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lote</label>
            <Input
              type="text"
              value={filters.lote}
              onChange={(e) => handleChange('lote', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: L-2403"
              className="text-xs h-9"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full text-xs h-9 border border-slate-300 rounded-md px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="TODOS">Todos os status</option>
              <option value="DENTRO_PARAMETRO">Dentro do parâmetro</option>
              <option value="SALDO_RESIDUAL_IDENTIFICADO">Saldo residual identificado</option>
              <option value="ACAO_NECESSARIA">Ação necessária</option>
              <option value="EM_TRATAMENTO">Em tratamento</option>
              <option value="REGULARIZADO">Regularizado</option>
              <option value="REGULARIZADO_AUTOMATICO">Regularizado automaticamente</option>
            </select>
          </div>

          {/* Período (Datas) */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Data Inicial
              </label>
              <Input
                type="date"
                value={filters.dataInicial}
                onChange={(e) => handleChange('dataInicial', e.target.value)}
                className="text-xs h-9 px-1.5"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Data Final
              </label>
              <Input
                type="date"
                value={filters.dataFinal}
                onChange={(e) => handleChange('dataFinal', e.target.value)}
                className="text-xs h-9 px-1.5"
              />
            </div>
          </div>
        </div>

        {/* Botões Filtrar e Limpar */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            disabled={loading}
            className="text-xs h-8 text-slate-600 hover:text-slate-900 border-slate-300 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar filtros
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onApplyFilters}
            disabled={loading}
            className="text-xs h-8 bg-blue-700 hover:bg-blue-800 text-white font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtrar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

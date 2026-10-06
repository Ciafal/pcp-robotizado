import React from 'react'
import { TmsFiltersState, SapItinerario } from '@/types/tms-mapa-logistico'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Filter, Calendar } from 'lucide-react'

interface TmsFilterBarProps {
  filters: TmsFiltersState
  onFilterChange: (key: keyof TmsFiltersState, value: any) => void
  onReset: () => void
  itinerarios: SapItinerario[]
  companies: string[]
  shippingCenters: string[]
  materialsGroups: string[]
  totalFilteredCount: number
}

export const TmsFilterBar: React.FC<TmsFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  itinerarios,
  companies,
  shippingCenters,
  materialsGroups,
  totalFilteredCount,
}) => {
  return (
    <div className="bg-white border rounded-lg p-3 shadow-xs space-y-3">
      {/* Linha 1: Filtros de Localização e Empresa */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mr-1">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filtros Logísticos</span>
        </div>

        {/* Empresa */}
        <Select
          value={filters.company || 'ALL'}
          onValueChange={(val) => onFilterChange('company', val === 'ALL' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas Empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Centro Expedidor */}
        <Select
          value={filters.center || 'ALL'}
          onValueChange={(val) => onFilterChange('center', val === 'ALL' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="Centro Expedidor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos Centros</SelectItem>
            {shippingCenters.map((sc) => (
              <SelectItem key={sc} value={sc}>
                {sc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* UF */}
        <Select
          value={filters.uf || 'ALL'}
          onValueChange={(val) => onFilterChange('uf', val === 'ALL' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-xs w-[90px]">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas UFs</SelectItem>
            <SelectItem value="MG">MG</SelectItem>
            <SelectItem value="SP">SP</SelectItem>
            <SelectItem value="RJ">RJ</SelectItem>
            <SelectItem value="GO">GO</SelectItem>
            <SelectItem value="DF">DF</SelectItem>
            <SelectItem value="PR">PR</SelectItem>
            <SelectItem value="BA">BA</SelectItem>
            <SelectItem value="ES">ES</SelectItem>
          </SelectContent>
        </Select>

        {/* Cidade */}
        <div className="w-[140px]">
          <Input
            placeholder="Buscar cidade..."
            className="h-8 text-xs"
            value={filters.city}
            onChange={(e) => onFilterChange('city', e.target.value)}
          />
        </div>

        {/* Itinerário SAP */}
        <Select
          value={filters.itinerary || 'ALL'}
          onValueChange={(val) => onFilterChange('itinerary', val === 'ALL' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue placeholder="Itinerário SAP" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos Itinerários SAP</SelectItem>
            {itinerarios.map((it) => (
              <SelectItem key={it.code} value={it.code}>
                {it.code} — {it.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Grupo de Mercadoria */}
        <Select
          value={filters.materialGroup || 'ALL'}
          onValueChange={(val) => onFilterChange('materialGroup', val === 'ALL' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="Grupo Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos Grupos</SelectItem>
            {materialsGroups.map((mg) => (
              <SelectItem key={mg} value={mg}>
                {mg}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Prioridade Comercial */}
        <Select
          value={filters.priority || 'ALL'}
          onValueChange={(val) => onFilterChange('priority', val === 'ALL' ? '' : val)}
        >
          <SelectTrigger className="h-8 text-xs w-[120px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas Priorid.</SelectItem>
            <SelectItem value="CRITICA">Crítica</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="MEDIA">Média</SelectItem>
            <SelectItem value="BAIXA">Baixa</SelectItem>
          </SelectContent>
        </Select>

        {/* Modo de Disponibilidade / Estoque Futuro */}
        <div className="inline-flex rounded-md border p-0.5 bg-slate-50">
          <button
            type="button"
            onClick={() => onFilterChange('futureStockMode', 'CURRENT_ONLY')}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              filters.futureStockMode === 'CURRENT_ONLY'
                ? 'bg-white shadow-xs text-blue-700 font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Carteira Atual
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('futureStockMode', 'CURRENT_AND_FUTURE')}
            className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
              filters.futureStockMode === 'CURRENT_AND_FUTURE'
                ? 'bg-blue-600 shadow-xs text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Considera ordens de produção PCP e disponibilidade futura"
          >
            Carteira + Estoque Futuro
          </button>
        </div>

        {/* Botão Reset */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 text-xs text-slate-500 hover:text-slate-800 ml-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Limpar Filtros
        </Button>
      </div>

      {/* Linha 2: Busca por Cliente, Material e Indicador de itens filtrados */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-[200px]">
            <Input
              placeholder="Filtrar por cliente..."
              className="h-7 text-xs"
              value={filters.customer}
              onChange={(e) => onFilterChange('customer', e.target.value)}
            />
          </div>
          <div className="w-[200px]">
            <Input
              placeholder="Filtrar por material..."
              className="h-7 text-xs"
              value={filters.material}
              onChange={(e) => onFilterChange('material', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Total filtrado:</span>
          <Badge variant="secondary" className="font-semibold text-slate-700">
            {totalFilteredCount} pedidos encontrados
          </Badge>
        </div>
      </div>
    </div>
  )
}

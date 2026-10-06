import React from 'react'
import { UfAggregation } from '@/types/tms-mapa-logistico'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Compass, ChevronRight } from 'lucide-react'

interface TmsDemandDestinationsPanelProps {
  ufs: UfAggregation[]
  selectedUf: string
  onSelectUf: (uf: string) => void
}

export const TmsDemandDestinationsPanel: React.FC<TmsDemandDestinationsPanelProps> = ({
  ufs,
  selectedUf,
  onSelectUf,
}) => {
  const sortedUfs = [...ufs].sort((a, b) => b.total_tons - a.total_tons)

  return (
    <Card className="border shadow-xs bg-white">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>Onde está a demanda? (Principais Destinos)</span>
          </div>
          <span className="text-[11px] text-slate-400">Clique para centralizar</span>
        </div>

        {/* Cabeçalho da tabela compacta */}
        <div className="grid grid-cols-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 bg-slate-50 rounded">
          <span>Estado</span>
          <span className="text-right">Tonelagem</span>
          <span className="text-right">Pedidos</span>
          <span className="text-right">Clientes</span>
          <span className="text-right">Cargas</span>
          <span className="text-right">Ação</span>
        </div>

        {/* Linhas */}
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {sortedUfs.map((u) => {
            const isSelected = selectedUf === u.uf
            return (
              <div
                key={u.uf}
                onClick={() => onSelectUf(u.uf)}
                className={`grid grid-cols-6 items-center px-2 py-1.5 text-xs rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50 text-blue-900 font-semibold ring-1 ring-blue-300'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">{u.uf}</span>
                  <span className="text-[10px] text-slate-400">({u.region})</span>
                </div>

                <div className="text-right font-medium text-slate-900">
                  {u.total_tons.toFixed(1).replace('.', ',')} t
                </div>

                <div className="text-right text-slate-600">{u.orders_count}</div>

                <div className="text-right text-slate-600">{u.customers_count}</div>

                <div className="text-right font-semibold text-blue-700">{u.potential_loads}</div>

                <div className="text-right flex justify-end">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

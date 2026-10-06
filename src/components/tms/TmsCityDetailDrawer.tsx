import React from 'react'
import { CityAggregation, SapSalesOrderItem } from '@/types/tms-mapa-logistico'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { X, MapPin, AlertTriangle, PlayCircle, Truck, PackageCheck, Calendar } from 'lucide-react'

interface TmsCityDetailDrawerProps {
  city: CityAggregation | null
  onClose: () => void
  selectedOrderIds: string[]
  onToggleOrderSelection: (orderId: string) => void
  onSelectAllCityOrders: (orders: SapSalesOrderItem[]) => void
  onSimulateLoad: (orders: SapSalesOrderItem[]) => void
}

export const TmsCityDetailDrawer: React.FC<TmsCityDetailDrawerProps> = ({
  city,
  onClose,
  selectedOrderIds,
  onToggleOrderSelection,
  onSelectAllCityOrders,
  onSimulateLoad,
}) => {
  if (!city) return null

  const selectedCount = city.orders.filter((o) => selectedOrderIds.includes(o.id)).length
  const allSelected = city.orders.length > 0 && selectedCount === city.orders.length

  const handleSimulateSelected = () => {
    const ordersToSimulate = city.orders.filter((o) => selectedOrderIds.includes(o.id))
    if (ordersToSimulate.length > 0) {
      onSimulateLoad(ordersToSimulate)
    } else {
      onSimulateLoad(city.orders)
    }
  }

  return (
    <div className="absolute top-0 right-0 w-full sm:w-[480px] h-full bg-white border-l shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b bg-slate-50 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {city.city}/{city.uf}
            </h2>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Itinerário {city.primary_itinerary}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Detalhamento de carteira logística da localidade
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="w-4 h-4 text-slate-500" />
        </Button>
      </div>

      {/* Resumo da Localidade */}
      <div className="p-4 border-b bg-white space-y-3">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Resumo Logístico
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2 rounded border">
            <span className="text-slate-500 block text-[11px]">Tonelagem Total</span>
            <span className="font-bold text-slate-900 text-sm">
              {city.total_tons.toFixed(1).replace('.', ',')} t
            </span>
          </div>

          <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100">
            <span className="text-emerald-700 block text-[11px]">Estoque Disponível</span>
            <span className="font-bold text-emerald-800 text-sm">
              {city.available_tons.toFixed(1).replace('.', ',')} t
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded border">
            <span className="text-slate-500 block text-[11px]">Pedidos / Clientes</span>
            <span className="font-semibold text-slate-800">
              {city.orders_count} pedidos ({city.customers_count} clientes)
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded border">
            <span className="text-slate-500 block text-[11px]">Cargas Potenciais</span>
            <span className="font-semibold text-slate-800">
              {city.potential_loads} estimadas (~32 t)
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded border">
            <span className="text-slate-500 block text-[11px]">Valor da Carteira</span>
            <span className="font-semibold text-slate-800">
              R$ {city.order_value_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded border">
            <span className="text-slate-500 block text-[11px]">Pedido Mais Antigo</span>
            <span className="font-semibold text-slate-800">{city.oldest_order_date || 'N/A'}</span>
          </div>
        </div>

        {city.has_rfid_alert && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Alerta WMS: um ou mais itens sem movimentação RFID recente.</span>
          </div>
        )}
      </div>

      {/* Ações de Seleção */}
      <div className="px-4 py-2 bg-slate-50 border-b flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all-city"
            checked={allSelected}
            onCheckedChange={() => onSelectAllCityOrders(city.orders)}
          />
          <label htmlFor="select-all-city" className="font-medium text-slate-700 cursor-pointer">
            Selecionar todos ({city.orders.length})
          </label>
        </div>

        {selectedCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedCount} selecionado(s)
          </Badge>
        )}
      </div>

      {/* Tabela de Clientes e Pedidos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Clientes e Pedidos ({city.orders.length})
        </div>

        {city.orders.map((o) => {
          const isSelected = selectedOrderIds.includes(o.id)
          return (
            <div
              key={o.id}
              onClick={() => onToggleOrderSelection(o.id)}
              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleOrderSelection(o.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <div className="font-semibold text-slate-900">{o.customer_name}</div>
                    <div className="text-[11px] text-slate-500">
                      OV: <span className="font-mono">{o.sales_order}</span> (Item{' '}
                      {o.sales_order_item})
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-900">
                    {o.weight_tons.toFixed(1).replace('.', ',')} t
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 ${
                      o.stock_available_tons >= o.weight_tons
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    {o.stock_available_tons >= o.weight_tons ? 'Estoque OK' : 'Estoque Futuro'}
                  </Badge>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="truncate max-w-[200px]" title={o.material_description}>
                  {o.material_description || o.material_code}
                </span>
                <span>Entrega: {o.requested_delivery_date || 'N/A'}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer com Botão de Ação */}
      <div className="p-4 border-t bg-slate-50 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
          Fechar
        </Button>
        <Button
          size="sm"
          onClick={handleSimulateSelected}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>
            {selectedCount > 0
              ? `Simular Carga (${selectedCount} itens)`
              : `Simular Carga para ${city.city}`}
          </span>
        </Button>
      </div>
    </div>
  )
}

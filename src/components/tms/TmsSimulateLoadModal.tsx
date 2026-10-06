import React, { useState } from 'react'
import { ConsolidationOpportunity, SapSalesOrderItem } from '@/types/tms-mapa-logistico'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PlayCircle, Truck, MapPin, CheckCircle2, TrendingUp } from 'lucide-react'

interface TmsSimulateLoadModalProps {
  isOpen: boolean
  onClose: () => void
  ordersToSimulate: SapSalesOrderItem[]
  opportunitySource?: ConsolidationOpportunity | null
  onConfirmCreation: (createdLoadData: any) => Promise<void>
}

export const TmsSimulateLoadModal: React.FC<TmsSimulateLoadModalProps> = ({
  isOpen,
  onClose,
  ordersToSimulate,
  opportunitySource,
  onConfirmCreation,
}) => {
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen || ordersToSimulate.length === 0) return null

  const totalWeight = ordersToSimulate.reduce((acc, o) => acc + o.weight_tons, 0)
  const clients = Array.from(new Set(ordersToSimulate.map((o) => o.customer_name)))
  const cities = Array.from(new Set(ordersToSimulate.map((o) => o.city)))
  const originPlant = ordersToSimulate[0]?.origin_plant || 'CIAFAL Matriz'
  const primaryItin = ordersToSimulate[0]?.itinerary_code || '015'

  // Seleção automática do veículo ideal por faixa de peso
  let vehicleType = 'Carreta Graneleira 3 eixos'
  let vehicleCapacity = 32
  if (totalWeight > 32 && totalWeight <= 50) {
    vehicleType = 'Bitrem Articulado 7 eixos'
    vehicleCapacity = 48
  } else if (totalWeight > 50) {
    vehicleType = 'Bitrem Articulado 9 eixos (74 t)'
    vehicleCapacity = 74
  } else if (totalWeight < 15) {
    vehicleType = 'Truck 3 eixos (14 t)'
    vehicleCapacity = 14
  }

  const occupancyPct = Math.min(100, Math.round((totalWeight / vehicleCapacity) * 100))
  const estimatedFreight = Math.round(totalWeight * 210)
  const estimatedSavings = Math.round(estimatedFreight * 0.12)

  const handleConfirm = async () => {
    setIsSaving(true)
    try {
      const loadNumber = `CRG-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const loadData = {
        load_number: loadNumber,
        status: 'CARGA_PLANEJADA',
        origin_plant: originPlant,
        origin_city: originPlant.includes('Sidercentro') ? 'Sete Lagoas' : 'Divinópolis',
        origin_uf: 'MG',
        itinerary_code: primaryItin,
        itinerary_description:
          opportunitySource?.itinerary_description || `Itinerário ${primaryItin}`,
        destinations_sequence: cities.map((c) => ({
          city: c,
          uf: ordersToSimulate.find((o) => o.city === c)?.uf || 'MG',
          client: ordersToSimulate.find((o) => o.city === c)?.customer_name || 'Cliente',
          weight_tons: ordersToSimulate
            .filter((o) => o.city === c)
            .reduce((acc, o) => acc + o.weight_tons, 0),
        })),
        destinations_summary: cities.join(' → '),
        total_weight_tons: Math.round(totalWeight * 10) / 10,
        total_orders_count: ordersToSimulate.length,
        total_customers_count: clients.length,
        vehicle_type_suggested: vehicleType,
        vehicle_capacity_tons: vehicleCapacity,
        load_occupancy_pct: occupancyPct,
        carrier_name: 'Transportadora Homologada CIAFAL',
        estimated_freight_cost_brl: estimatedFreight,
        estimated_toll_cost_brl: 350,
        estimated_savings_brl: estimatedSavings,
        total_unloading_stops: cities.length,
        total_distance_km: cities.length * 160 + 120,
        estimated_travel_time_hours: Math.round(cities.length * 2.5 + 3),
        departure_planned_date: new Date().toISOString().split('T')[0],
        orders_json: ordersToSimulate.map((o) => ({
          sales_order: o.sales_order,
          item: o.sales_order_item,
          weight: o.weight_tons,
          client: o.customer_name,
          city: o.city,
        })),
        ai_rationale: `Simulação de formação de carga realizada diretamente a partir do Mapa Logístico. Ocupação ${occupancyPct}% com ${cities.length} descargas no itinerário ${primaryItin}.`,
        is_future_prediction: false,
        wms_rfid_alert: ordersToSimulate.some((o) => !o.rfid_tag_verified)
          ? 'Verificar disponibilidade física de itens sem RFID'
          : '',
      }

      await onConfirmCreation(loadData)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-blue-600" />
            <span>Simulação e Formação de Carga TMS</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Formação proativa de carga a partir dos pedidos selecionados no Mapa Logístico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 text-xs py-2">
          {/* Card Resumo do Planejamento */}
          <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900">
                Itinerário {primaryItin} —{' '}
                {opportunitySource?.itinerary_description || 'Rota Principal'}
              </span>
              <Badge className="bg-blue-600 text-white text-[11px]">{occupancyPct}% ocupação</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Tonelagem Total</span>
                <span className="font-bold text-slate-900">
                  {totalWeight.toFixed(1).replace('.', ',')} t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Veículo Indicado</span>
                <span className="font-semibold text-slate-800 truncate block">{vehicleType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Economia Prevista</span>
                <span className="font-bold text-emerald-700">
                  R$ {estimatedSavings.toLocaleString('pt-BR')},00
                </span>
              </div>
            </div>
          </div>

          {/* Rota de Entrega */}
          <div className="p-2.5 bg-slate-50 rounded border text-xs">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">Trajeto Proposto:</div>
            <div className="flex items-center gap-1.5 flex-wrap font-medium text-slate-800">
              <span className="text-blue-700 font-bold">{originPlant}</span>
              <span>→</span>
              {cities.map((city, idx) => (
                <span key={city} className="flex items-center gap-1">
                  <span>{city}</span>
                  {idx < cities.length - 1 && <span className="text-slate-400">→</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Pedidos Selecionados */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Pedidos Inclusos na Formação ({ordersToSimulate.length})</span>
              <span className="text-slate-500 font-normal">{clients.length} clientes únicos</span>
            </div>

            <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
              {ordersToSimulate.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-2 rounded border bg-white text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{o.customer_name}</span>
                    <span className="text-[11px] text-slate-500 ml-2">
                      OV: {o.sales_order} ({o.city}/{o.uf})
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {o.weight_tons.toFixed(1).replace('.', ',')} t
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
          >
            {isSaving ? 'Gravando Carga...' : 'Confirmar e Criar Carga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

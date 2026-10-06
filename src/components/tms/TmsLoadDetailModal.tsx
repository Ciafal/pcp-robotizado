import React from 'react'
import { TmsPlannedLoad } from '@/types/tms-mapa-logistico'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Truck, MapPin, DollarSign, Clock, PackageCheck, AlertTriangle } from 'lucide-react'

interface TmsLoadDetailModalProps {
  load: TmsPlannedLoad | null
  onClose: () => void
}

export const TmsLoadDetailModal: React.FC<TmsLoadDetailModalProps> = ({ load, onClose }) => {
  if (!load) return null

  const statusMap: Record<string, { label: string; color: string }> = {
    ROTA_SUGERIDA_IA: {
      label: 'Rota sugerida pela IA',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    },
    CARGA_PLANEJADA: {
      label: 'Carga planejada',
      color: 'bg-blue-50 text-blue-700 border-blue-300',
    },
    CARGA_CONFIRMADA: {
      label: 'Carga confirmada',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    },
    CARGA_EM_NEGOCIACAO: {
      label: 'Carga em negociação',
      color: 'bg-amber-50 text-amber-700 border-amber-300',
    },
    TRANSPORTE_CRIADO: {
      label: 'Transporte criado',
      color: 'bg-purple-50 text-purple-700 border-purple-300',
    },
    TRANSPORTE_EM_EXECUCAO: {
      label: 'Transporte em execução',
      color: 'bg-cyan-50 text-cyan-700 border-cyan-300',
    },
    CANCELADA: { label: 'Cancelada', color: 'bg-rose-50 text-rose-700 border-rose-300' },
  }

  const currentStatus = statusMap[load.status] || {
    label: load.status,
    color: 'bg-slate-50 text-slate-700 border-slate-300',
  }

  return (
    <Dialog open={Boolean(load)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <span>Carga {load.load_number}</span>
            </DialogTitle>
            <Badge variant="outline" className={`text-xs ${currentStatus.color}`}>
              {currentStatus.label}
            </Badge>
          </div>
          <DialogDescription className="text-xs">
            Origem: {load.origin_plant} ({load.origin_city}/{load.origin_uf}) → Destino:{' '}
            {load.destinations_summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 text-xs py-2">
          {/* Indicadores Principais */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-slate-50 rounded border">
              <span className="text-slate-500 block text-[11px]">Peso Total</span>
              <span className="font-bold text-slate-900 text-sm">
                {load.total_weight_tons.toFixed(1).replace('.', ',')} t
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Ocupação: {load.load_occupancy_pct}%
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border">
              <span className="text-slate-500 block text-[11px]">Veículo Sugerido</span>
              <span
                className="font-semibold text-slate-800 text-xs truncate block"
                title={load.vehicle_type_suggested}
              >
                {load.vehicle_type_suggested}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Capacidade: {load.vehicle_capacity_tons} t
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border">
              <span className="text-slate-500 block text-[11px]">Transportadora</span>
              <span
                className="font-semibold text-slate-800 text-xs truncate block"
                title={load.carrier_name}
              >
                {load.carrier_name || 'A definir'}
              </span>
            </div>
          </div>

          {/* Dados Financeiros e Rota */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-blue-50/50 rounded border border-blue-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-blue-700 text-[11px]">Valor do Frete Previsto:</span>
                <span className="font-bold text-blue-900">
                  R$ {load.estimated_freight_cost_brl.toLocaleString('pt-BR')},00
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700 text-[11px]">Pedágio Estimado:</span>
                <span className="font-bold text-blue-900">
                  R$ {load.estimated_toll_cost_brl.toLocaleString('pt-BR')},00
                </span>
              </div>
              {load.estimated_savings_brl > 0 && (
                <div className="flex justify-between pt-1 border-t border-blue-200">
                  <span className="text-emerald-700 text-[11px]">Economia de Consolidação:</span>
                  <span className="font-bold text-emerald-800">
                    R$ {load.estimated_savings_brl.toLocaleString('pt-BR')},00
                  </span>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-slate-50 rounded border space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px]">Distância Total:</span>
                <span className="font-semibold text-slate-800">{load.total_distance_km} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px]">Nº de Descargas:</span>
                <span className="font-semibold text-slate-800">
                  {load.total_unloading_stops} paradas
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-[11px]">Previsão de Viagem:</span>
                <span className="font-semibold text-slate-800">
                  {load.estimated_travel_time_hours}h
                </span>
              </div>
            </div>
          </div>

          {/* Alerta WMS/RFID caso exista */}
          {load.wms_rfid_alert && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{load.wms_rfid_alert}</span>
            </div>
          )}

          {/* Justificativa da IA */}
          {load.ai_rationale && (
            <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded text-xs text-indigo-900">
              <span className="font-semibold block mb-0.5">Recomendação do Planejador IA:</span>
              <p className="leading-snug">{load.ai_rationale}</p>
            </div>
          )}

          {/* Lista de Pedidos da Carga */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-700 block">
              Pedidos Vinculados ({load.orders_json.length})
            </span>
            <div className="space-y-1 max-h-[140px] overflow-y-auto">
              {load.orders_json.map((ord, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded border text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{ord.client}</span>
                    <span className="text-slate-400 text-[11px] ml-2">
                      OV: {ord.sales_order} ({ord.city})
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {Number(ord.weight).toFixed(1).replace('.', ',')} t
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

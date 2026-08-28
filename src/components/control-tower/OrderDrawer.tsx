import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { X, CalendarDays, Zap, Clock, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const OrderDrawer: React.FC = () => {
  const { selectedOrder, setSelectedOrder, setActiveTab, setIsSimulatorModalOpen } =
    useControlTower()

  if (!selectedOrder) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-slate-950 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-cyan-400 text-base">
              {selectedOrder.orderNumber}
            </span>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
              Linha: {selectedOrder.lineCode}
            </Badge>
            <Badge
              className={`text-[9px] uppercase ${
                selectedOrder.status === 'IN_PRODUCTION'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : selectedOrder.status === 'SETUP'
                    ? 'bg-amber-950 text-amber-400 border-amber-700'
                    : selectedOrder.status === 'BLOCKED'
                      ? 'bg-rose-950 text-rose-400 border-rose-700'
                      : 'bg-slate-900 text-slate-300'
              }`}
            >
              {selectedOrder.status}
            </Badge>
          </div>
          <h3 className="text-sm font-bold text-white mt-1">{selectedOrder.materialName}</h3>
          <p className="text-xs text-slate-400">
            Cliente: <strong className="text-slate-200">{selectedOrder.customerName}</strong>
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedOrder(null)}
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
        {/* Tonelagem e Aderência */}
        <div className="grid grid-cols-2 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 block text-[11px]">Volume Programado:</span>
            <strong className="text-white text-base font-mono">
              {selectedOrder.plannedTons} t
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Realizado / Restante:</span>
            <strong className="text-emerald-400 text-base font-mono">
              {selectedOrder.producedTons} t{' '}
              <span className="text-slate-500 font-normal">({selectedOrder.remainingTons} t)</span>
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Ritmo Atual:</span>
            <strong className="text-cyan-300 font-mono">
              {selectedOrder.currentRatePerHour} t/h (Meta: {selectedOrder.targetRatePerHour} t/h)
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Aderência:</span>
            <strong className="text-emerald-400 font-mono">{selectedOrder.adherencePct}%</strong>
          </div>
        </div>

        {/* Datas e Horários */}
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
            Cronograma Operacional:
          </span>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>
              Início Previsto: <strong>{selectedOrder.plannedStart}</strong>
            </div>
            <div>
              Fim Previsto: <strong>{selectedOrder.plannedEnd}</strong>
            </div>
            <div>
              Conclusão Projetada:{' '}
              <strong className="text-cyan-300">{selectedOrder.projectedEnd}</strong>
            </div>
            <div>
              Setup: <strong>{selectedOrder.setupMinutes} min</strong>
            </div>
          </div>
        </div>

        {/* Drill-down de Pedido e Cliente */}
        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
            Vínculo Comercial SAP ECC:
          </span>
          <div className="space-y-1 text-slate-300">
            <div>
              Ordem de Venda: <strong>{selectedOrder.salesOrderId}</strong> (Item:{' '}
              {selectedOrder.salesOrderItem})
            </div>
            <div>
              Cliente: <strong>{selectedOrder.customerName}</strong>
            </div>
            <div>
              Campanha: <strong>{selectedOrder.campaignName}</strong>
            </div>
            <div>
              Programador PCP: <strong>{selectedOrder.programmer}</strong>
            </div>
          </div>
        </div>

        {/* Alerta de Atraso se houver */}
        {selectedOrder.delayMinutes > 0 && (
          <div className="bg-amber-950/40 border border-amber-700 p-3 rounded-lg text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-300">
                Atraso Projetado: +{selectedOrder.delayMinutes} minutos
              </strong>
              <span>
                Recomendada simulação de realocação ou ajuste de sequência para evitar impacto na
                expedição.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Drawer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActiveTab('GANTT')
            setSelectedOrder(null)
          }}
          className="border-slate-700 bg-slate-950 text-slate-200 text-xs h-8 gap-1.5"
        >
          <CalendarDays className="w-3.5 h-3.5 text-cyan-400" /> Ver Bloco no Gantt
        </Button>

        <Button
          size="sm"
          onClick={() => {
            setIsSimulatorModalOpen(true)
            setSelectedOrder(null)
          }}
          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs h-8 gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" /> Simular Cenário com Esta OP
        </Button>
      </div>
    </div>
  )
}

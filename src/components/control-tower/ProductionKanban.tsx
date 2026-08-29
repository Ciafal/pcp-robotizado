import React, { useState } from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { OrderStatus, ProductOrder } from '@/types/control-tower'
import {
  KanbanSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ColumnDef {
  id: OrderStatus
  title: string
  color: string
}

const columns: ColumnDef[] = [
  { id: 'PLANNED', title: 'Planejado', color: 'border-slate-700 text-slate-400' },
  { id: 'RELEASED', title: 'Liberado SAP', color: 'border-cyan-700 text-cyan-300' },
  { id: 'SETUP', title: 'Preparação / Setup', color: 'border-amber-700 text-amber-300' },
  { id: 'IN_PRODUCTION', title: 'Em Produção', color: 'border-[#004C97] text-white' },
  { id: 'WAITING_NEXT', title: 'Aguardando Próximo', color: 'border-blue-700 text-blue-300' },
  { id: 'BLOCKED', title: 'Bloqueado', color: 'border-rose-700 text-rose-300' },
  { id: 'COMPLETED', title: 'Concluído', color: 'border-emerald-700 text-emerald-300' },
  { id: 'DELAYED', title: 'Atrasado', color: 'border-red-600 text-red-400' },
]

export const ProductionKanban: React.FC = () => {
  const { filteredOrders, setSelectedOrder } = useControlTower()
  const { toast } = useToast()

  const [draggedOrder, setDraggedOrder] = useState<ProductOrder | null>(null)

  // Validação de Regras Produtivas para movimentação
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetStatus: OrderStatus) => {
    if (!draggedOrder) return

    // Regra de Validação de Negócio
    if (targetStatus === 'IN_PRODUCTION' && !draggedOrder.rawMaterialAvailable) {
      toast({
        variant: 'destructive',
        title: '⛔ Movimentação Não Permitida',
        description: `Matéria-prima indisponível para ${draggedOrder.orderNumber} (Déficit em MPL).`,
      })
      setDraggedOrder(null)
      return
    }

    if (targetStatus === 'IN_PRODUCTION' && draggedOrder.lineCode === 'ENDIR') {
      toast({
        variant: 'destructive',
        title: '⛔ Movimentação Não Permitida',
        description:
          'Linha Endireitadeira está em manutenção mecânica extraordinária. Respeite as restrições da Ficha Mestre.',
      })
      setDraggedOrder(null)
      return
    }

    toast({
      title: '🧪 Simulação Kanban Registrada',
      description: `Ordem ${draggedOrder.orderNumber} movida para status ${targetStatus} em memória.`,
    })
    setDraggedOrder(null)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header do Kanban */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <KanbanSquare className="w-4 h-4 text-[#004C97]" />
          <span className="font-bold text-white uppercase tracking-wider">
            Esteira de Ordens de Produção (Fluxo de Estágios)
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Validações de restrições de matéria-prima e capacidade ativas nas transições.
        </span>
      </div>

      {/* Grid de Colunas Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 overflow-x-auto min-w-[1200px] pb-4">
        {columns.map((col) => {
          const colOrders = filteredOrders.filter((o) => o.status === col.id)

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
              className="bg-slate-950 border border-slate-850 rounded-xl p-2.5 flex flex-col min-h-[480px]"
            >
              {/* Header da Coluna */}
              <div
                className={`p-2 rounded-lg border bg-slate-900/80 mb-2 flex items-center justify-between text-xs ${col.color}`}
              >
                <span className="font-bold text-[11px] truncate">{col.title}</span>
                <span className="font-mono text-[10px] font-black bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {colOrders.length}
                </span>
              </div>

              {/* Cards de Ordens */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                {colOrders.map((ord) => {
                  return (
                    <div
                      key={ord.id}
                      draggable
                      onDragStart={() => setDraggedOrder(ord)}
                      onClick={() => setSelectedOrder(ord)}
                      className="bg-slate-900 border border-slate-800 hover:border-[#004C97] p-2.5 rounded-lg text-xs space-y-2 cursor-grab active:cursor-grabbing transition-all shadow-sm group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-300 text-[11px]">
                          {ord.orderNumber}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge
                            className={`text-[8px] font-bold px-1 py-0 ${
                              ord.productionType === 'MTO'
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {ord.productionType || 'MTS'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 border-slate-700 text-slate-400"
                          >
                            {ord.lineCode}
                          </Badge>
                        </div>
                      </div>

                      <div className="font-semibold text-white text-[11px] truncate">
                        {ord.familyName}
                      </div>

                      {/* Badges de Qualidade Discretos US / EM / Status */}
                      <div className="flex items-center gap-1 text-[9px] pt-0.5">
                        {ord.requiresUltrasound && (
                          <span className="px-1 py-0.2 bg-blue-950 text-cyan-300 border border-blue-800 rounded font-bold">
                            US
                          </span>
                        )}
                        {ord.requiresMechanical && (
                          <span className="px-1 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded font-bold">
                            EM
                          </span>
                        )}
                        {ord.qualityStatus && (
                          <span
                            className={`px-1 py-0.2 rounded font-medium border ${
                              ord.qualityStatus === 'APROVADA' || ord.qualityStatus === 'LIBERADA'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : ord.qualityStatus === 'REPROVADA'
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            {ord.qualityStatus}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>
                          Volume: <strong className="text-white">{ord.plannedTons} t</strong>
                        </span>
                        <span>
                          Aderência:{' '}
                          <strong className="text-emerald-400">{ord.adherencePct}%</strong>
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-850">
                        <span>➔ {ord.downstreamProcessCode || 'Expedição'}</span>
                        {ord.alertsCount > 0 && (
                          <span className="text-rose-400 flex items-center gap-0.5 font-bold">
                            <AlertTriangle className="w-3 h-3" /> {ord.alertsCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {colOrders.length === 0 && (
                  <div className="h-28 border border-dashed border-slate-850 rounded-lg flex items-center justify-center text-[10px] text-slate-600">
                    Nenhuma ordem
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

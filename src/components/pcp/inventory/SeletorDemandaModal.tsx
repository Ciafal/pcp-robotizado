import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { InventoryDemand } from '@/types/pcp-inventory-demands'
import { ClipboardCheck, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SeletorDemandaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demands: InventoryDemand[]
  onSelectDemand: (demand: InventoryDemand) => void
}

export const SeletorDemandaModal: React.FC<SeletorDemandaModalProps> = ({
  open,
  onOpenChange,
  demands,
  onSelectDemand,
}) => {
  // R1: ELEGIBILIDADE: lista "Selecionar Demanda para Lançamento" mostra APENAS status Aberto, Parcial, Cancelado;
  // exclui exclusivamente Concluído. NUNCA usar "status != CANCELADO".
  const pendentes = demands.filter((d) => {
    const s = (d.status || '').trim().toLowerCase()
    const isConcluded =
      s === 'concluído' ||
      s === 'concluido' ||
      s === 'inventário concluído' ||
      s === 'inventario concluido'
    if (isConcluded) return false
    // Mostra Aberto (inclusive legados Gerada), Parcial e Cancelado
    return (
      s === 'aberto' ||
      s === 'gerada' ||
      s === 'gerado' ||
      s === 'parcial' ||
      s === 'em inventário' ||
      s === 'em inventario' ||
      s === 'inventário parcial' ||
      s === 'inventario parcial' ||
      s === 'cancelado' ||
      s === 'cancelada'
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Selecionar Demanda para Lançamento
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecione qual demanda pendente você deseja registrar contagens físicas agora.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {pendentes.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
              Não existem demandas pendentes de inventário no momento.
            </div>
          ) : (
            pendentes.map((demand) => {
              const st = (demand.status || '').trim().toLowerCase()
              const isCancelled = st === 'cancelado' || st === 'cancelada'
              const isPartial =
                st === 'parcial' ||
                st === 'inventário parcial' ||
                st === 'inventario parcial' ||
                st === 'em inventário' ||
                st === 'em inventario'
              const demandQty = demand.total_pieces_required || 0

              return (
                <div
                  key={demand.id}
                  onClick={() => {
                    onSelectDemand(demand)
                    onOpenChange(false)
                  }}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between group cursor-pointer ${
                    isCancelled
                      ? 'border-rose-200 bg-rose-50/20 hover:border-rose-400 hover:bg-rose-50/50'
                      : 'border-slate-200 hover:border-[#004C97] hover:bg-blue-50/40'
                  }`}
                >
                  <div className="space-y-1">
                    {/* Linha 1: número da demanda; badge de Status; Prioridade */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#004C97]">
                        {demand.control_number}
                      </span>
                      {isCancelled ? (
                        <Badge
                          className="bg-rose-600 text-white border-rose-600 font-bold text-[10px]"
                          title="Demanda cancelada: ao clicar em Lançar, iniciará um novo ciclo de contagem."
                        >
                          Cancelado
                        </Badge>
                      ) : isPartial ? (
                        <Badge
                          className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]"
                          variant="outline"
                        >
                          Parcial
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-blue-100 text-[#004C97] border-blue-300 font-semibold text-[10px]"
                          variant="outline"
                        >
                          {demand.status === 'Gerada' ? 'Aberto' : demand.status || 'Aberto'}
                        </Badge>
                      )}
                      <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                        {demand.priority || 'Normal'}
                      </Badge>
                    </div>

                    {/* Linha 2: Material (Código — Descrição) */}
                    <div className="text-xs font-semibold text-slate-800">
                      {demand.material_code} — {demand.material_description || 'Tarugo Laminado'}
                    </div>

                    {/* Linha 3: Centro | Depósito | Demanda: X pçs | Último ciclo: Status */}
                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5">
                      <span>{demand.center}</span>
                      <span className="text-slate-300">|</span>
                      <span>{demand.storage_deposit}</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-semibold text-slate-700">Demanda: {demandQty} pçs</span>
                      <span className="text-slate-300">|</span>
                      {isCancelled ? (
                        <span className="text-rose-700 font-semibold flex items-center gap-1">
                          Último ciclo: Cancelado
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Último ciclo:{' '}
                          {demand.status === 'Gerada' ? 'Aberto' : demand.status || 'Aberto'}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 text-xs font-bold transition-transform group-hover:translate-x-1 ${
                      isCancelled
                        ? 'text-rose-700 hover:text-rose-900 hover:bg-rose-100/50'
                        : 'text-[#004C97] hover:text-[#003B75] hover:bg-blue-100/50'
                    }`}
                  >
                    Lançar →
                  </Button>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

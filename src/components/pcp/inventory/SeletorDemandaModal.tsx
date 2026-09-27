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
  // Apenas demandas aptas a inventariar (não concluídas e não canceladas)
  const pendentes = demands.filter(
    (d) => d.status !== 'Inventário concluído' && d.status !== 'Cancelada',
  )

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
            pendentes.map((demand) => (
              <div
                key={demand.id}
                onClick={() => {
                  onSelectDemand(demand)
                  onOpenChange(false)
                }}
                className="p-3 rounded-lg border border-slate-200 hover:border-[#004C97] hover:bg-blue-50/40 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#004C97]">
                      {demand.control_number}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {demand.status}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                      {demand.priority}
                    </Badge>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {demand.material_code} —{' '}
                    {demand.material_description || 'Material Sem Descrição'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {demand.center} | {demand.storage_deposit} | Previsto:{' '}
                    {demand.total_pieces_required || 0} pçs | Apurado:{' '}
                    {demand.total_pieces_inventoried || 0} pçs
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs font-bold text-[#004C97] group-hover:translate-x-1 transition-transform"
                >
                  Lançar
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            ))
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

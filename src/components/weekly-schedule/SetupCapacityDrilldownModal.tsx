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
import { Badge } from '@/components/ui/badge'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { Clock, Flame, Wrench, Layers, AlertCircle, ArrowRight } from 'lucide-react'

interface SetupCapacityDrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  items: WeeklyScheduleItem[]
  lineCode: string
  totalSetupHours: number
  totalSetupsCount: number
  capacityLossTons: number
  onSelectSetupItem?: (item: WeeklyScheduleItem) => void
}

export const SetupCapacityDrilldownModal: React.FC<SetupCapacityDrilldownModalProps> = ({
  isOpen,
  onClose,
  items,
  lineCode,
  totalSetupHours,
  totalSetupsCount,
  capacityLossTons,
  onSelectSetupItem,
}) => {
  const setupItems = items.filter((it) => (it.setup_duration_minutes || 0) > 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#004C97]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Drill-down: Capacidade Consumida em Setups & Trocas — Linha {lineCode}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Detalhamento analítico de todas as trocas físicas e acertos que consom capacidade da
                linha
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo Consolidado */}
        <div className="grid grid-cols-4 gap-3 py-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <span className="text-[11px] text-slate-500 font-bold uppercase">
              Tempo Total Setup
            </span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{totalSetupHours} h</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <span className="text-[11px] text-slate-500 font-bold uppercase">
              Quantidade Setups
            </span>
            <div className="text-xl font-black text-[#004C97] mt-0.5">{totalSetupsCount}</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <span className="text-[11px] text-slate-500 font-bold uppercase">
              Tempo Médio / Setup
            </span>
            <div className="text-xl font-black text-slate-800 mt-0.5">
              {totalSetupsCount > 0 ? Math.round((totalSetupHours * 60) / totalSetupsCount) : 0} min
            </div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
            <span className="text-[11px] text-amber-800 font-bold uppercase flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5" /> Throughput Potencial
            </span>
            <div className="text-xl font-black text-rose-700 mt-0.5">{capacityLossTons} t</div>
          </div>
        </div>

        {/* Tabela de Setups */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="py-2 px-3">Data / Horário</th>
                <th className="py-2 px-3">De → Para (Produto)</th>
                <th className="py-2 px-3">Família</th>
                <th className="py-2 px-3 text-center">Troca Prev.</th>
                <th className="py-2 px-3 text-center">Acerto Prev.</th>
                <th className="py-2 px-3 text-center">Total Setup</th>
                <th className="py-2 px-3">Oficina / Ferramental</th>
                <th className="py-2 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {setupItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400">
                    Nenhum setup registrado nesta programação.
                  </td>
                </tr>
              ) : (
                setupItems.map((item, idx) => {
                  const b = item.setup_breakdown
                  const changeMin =
                    b?.planned_change_minutes ||
                    Math.round((item.setup_duration_minutes || 30) * 0.65)
                  const tuningMin =
                    b?.planned_tuning_minutes ||
                    Math.max(5, (item.setup_duration_minutes || 30) - changeMin)
                  const total = changeMin + tuningMin

                  return (
                    <tr key={item.id || idx} className="hover:bg-blue-50/40">
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {item.start_datetime ? item.start_datetime.substring(5, 16) : '24/08 10:15'}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1">
                          <span className="text-slate-500">
                            {b?.from_material_code || 'Início'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-blue-700 font-bold">{item.material_code}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-[10px] text-slate-600">
                          {item.family_code || 'TQ_LEVES'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-slate-700">
                        {changeMin} min
                      </td>
                      <td className="py-2 px-3 text-center font-semibold text-[#004C97]">
                        {tuningMin} min
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900 bg-slate-50">
                        {total} min
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {b?.cylinder_set_code || 'CJ-L1-STD'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-[#004C97] hover:bg-blue-100/50"
                          onClick={() => {
                            if (onSelectSetupItem) onSelectSetupItem(item)
                          }}
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex justify-between items-center">
          <span className="text-[11px] text-slate-500">
            * Equivalente de Throughput calculado com base na capacidade nominal do gargalo (24,8
            t/h).
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

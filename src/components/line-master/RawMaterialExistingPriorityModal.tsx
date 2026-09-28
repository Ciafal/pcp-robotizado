import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { LineRawMaterialPriority } from '@/types/line-master'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

interface RawMaterialExistingPriorityModalProps {
  open: boolean
  existingRecord: LineRawMaterialPriority | null
  newPriority: number
  newValidFrom: string
  newValidUntil?: string | null
  isSubmitting?: boolean
  onCancel: () => void
  onConfirmAlter: () => void
}

function formatVigencia(start?: string | null, end?: string | null): string {
  const startFmt = start ? formatDatePTBR(start) : '—'
  const endFmt = end ? formatDatePTBR(end) : 'Indeterminado'
  return `${startFmt} → ${endFmt}`
}

export const RawMaterialExistingPriorityModal: React.FC<RawMaterialExistingPriorityModalProps> = ({
  open,
  existingRecord,
  newPriority,
  newValidFrom,
  newValidUntil,
  isSubmitting = false,
  onCancel,
  onConfirmAlter,
}) => {
  if (!existingRecord) return null

  return (
    <Dialog open={open} onOpenChange={(v) => (!v && !isSubmitting ? onCancel() : null)}>
      <DialogContent
        className="bg-white border-blue-200 text-slate-900 max-w-lg shadow-2xl p-0 overflow-hidden"
        data-testid="raw-material-existing-priority-modal"
      >
        <DialogHeader className="p-5 pb-3 bg-blue-50/70 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 text-[#004C97] border border-blue-200 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Prioridade já cadastrada
              </DialogTitle>
              <p className="text-xs text-slate-600 mt-0.5">
                A matéria-prima{' '}
                <strong className="text-slate-900 font-mono font-bold">
                  {existingRecord.material_code}
                </strong>{' '}
                já possui uma prioridade cadastrada.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs text-slate-700">
          {/* Card com os dados comparativos */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
            <div className="p-3 border-b border-slate-200 bg-white grid grid-cols-3 gap-2">
              <span className="text-slate-500 font-semibold">Código MP:</span>
              <span className="col-span-2 font-mono font-bold text-slate-900">
                {existingRecord.material_code}
              </span>
            </div>
            <div className="p-3 border-b border-slate-200 bg-white grid grid-cols-3 gap-2">
              <span className="text-slate-500 font-semibold">Descrição:</span>
              <span className="col-span-2 text-slate-800">
                {existingRecord.material_description}
              </span>
            </div>
            <div className="p-3 border-b border-slate-200 bg-white grid grid-cols-3 gap-2 items-center">
              <span className="text-slate-500 font-semibold">Prioridade:</span>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-slate-600 font-medium">Atual:</span>
                <Badge
                  variant="outline"
                  className="font-mono text-slate-700 bg-slate-100 border-slate-300 font-bold"
                >
                  #{existingRecord.priority_order}
                </Badge>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-slate-600 font-medium">Nova:</span>
                <Badge className="bg-[#004C97] text-white font-mono font-bold">
                  #{newPriority}
                </Badge>
              </div>
            </div>
            <div className="p-3 bg-white grid grid-cols-3 gap-2 items-center">
              <span className="text-slate-500 font-semibold">Vigência:</span>
              <div className="col-span-2 space-y-1 font-mono text-[11px]">
                <div className="text-slate-600">
                  <span className="text-slate-400 font-sans text-[10px] mr-1">Atual:</span>
                  {formatVigencia(existingRecord.valid_from, existingRecord.valid_until)}
                </div>
                <div className="text-blue-900 font-semibold">
                  <span className="text-slate-400 font-sans text-[10px] mr-1">Nova:</span>
                  {formatVigencia(newValidFrom, newValidUntil)}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            Tem certeza de que deseja alterar a prioridade desta matéria-prima?
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onCancel}
            data-testid="existing-priority-cancel-btn"
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={onConfirmAlter}
            data-testid="existing-priority-confirm-btn"
            className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              'Confirmar alteração'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RawMaterialExistingPriorityModal

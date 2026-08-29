import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Send, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'
import { WeeklyScheduleWorkflowState } from '@/types/weekly-schedule'

interface WorkflowTransitionModalProps {
  isOpen: boolean
  onClose: () => void
  currentState: WeeklyScheduleWorkflowState
  targetState: WeeklyScheduleWorkflowState
  targetLabel: string
  currentVersion: number
  lineCode: string
  onConfirm: (reason: string, notes?: string) => Promise<void>
}

export const WorkflowTransitionModal: React.FC<WorkflowTransitionModalProps> = ({
  isOpen,
  onClose,
  currentState,
  targetState,
  targetLabel,
  currentVersion,
  lineCode,
  onConfirm,
}) => {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPublishing = targetState === 'PUBLICADO'
  const isPostPublishRevision = currentState === 'PUBLICADO' || currentVersion > 1

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(reason || `Transição formal de status para ${targetLabel}`, notes)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-800 p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Confirmar Transição de Fluxo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Avançar a programação semanal da Linha {lineCode} no ciclo de governança.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          {/* Status De -> Para */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="text-center flex-1">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">
                Estado Atual
              </span>
              <Badge className="mt-1 bg-slate-200 text-slate-800 text-[10px]">{currentState}</Badge>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 mx-2" />

            <div className="text-center flex-1">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">
                Novo Estado
              </span>
              <Badge className="mt-1 bg-[#004C97] text-white text-[10px]">{targetLabel}</Badge>
            </div>
          </div>

          {isPostPublishRevision && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
              <strong>Governança de Versões:</strong> Como a programação já passou por publicação,
              esta alteração incrementará a versão oficial para{' '}
              <strong>v{currentVersion + 1}.0</strong> e registrará na auditoria.
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Justificativa / Motivo da Transição *
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Validação técnica aprovada após simulação sem rupturas."
              className="text-xs h-9 bg-slate-50 border-slate-300"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Notas Adicionais para a Liderança
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Turno da tarde de quinta-feira foi priorizado com bitola pesada..."
              className="text-xs bg-slate-50 border-slate-300"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs h-9"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold flex items-center gap-1.5 h-9"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Processando...' : `Confirmar (${targetLabel})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default WorkflowTransitionModal

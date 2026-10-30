import React, { useState } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Send,
  CheckCheck,
  XCircle,
  Clock,
  RotateCcw,
} from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  mpMultipleCuttingPlansService,
  MPCuttingPlanStatus,
  MPMultipleCuttingPlanRecord,
} from '@/services/mp-dimensional-notes-service'
import { MPCuttingPlanStatusBadge, normalizeCuttingPlanStatus } from './MPCuttingPlanStatusBadge'

export interface MPCuttingPlanStatusTransitionModalProps {
  isOpen: boolean
  onClose: () => void
  plan: MPMultipleCuttingPlanRecord
  targetStatus: MPCuttingPlanStatus
  onSuccess: (updatedPlan: MPMultipleCuttingPlanRecord) => void
}

export const MPCuttingPlanStatusTransitionModal: React.FC<
  MPCuttingPlanStatusTransitionModalProps
> = ({ isOpen, onClose, plan, targetStatus, onSuccess }) => {
  const { toast } = useToast()
  const [justification, setJustification] = useState('')
  const [operationalConfirmation, setOperationalConfirmation] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const currentStatus = normalizeCuttingPlanStatus(plan.status)
  const isCancelling = targetStatus === 'Cancelado'
  const isExecuting = targetStatus === 'Executado'

  const getActionTitle = () => {
    switch (targetStatus) {
      case 'Aprovado':
        return 'Aprovar Plano de Corte'
      case 'Liberado':
        return 'Liberar para Execução'
      case 'Executado':
        return 'Confirmar Execução Operacional'
      case 'Cancelado':
        return 'Cancelar Plano de Corte'
      case 'Em Revisão':
        return 'Enviar para Revisão'
      case 'Rascunho':
        return 'Retornar para Rascunho'
      default:
        return `Transicionar para ${targetStatus}`
    }
  }

  const getActionIcon = () => {
    switch (targetStatus) {
      case 'Aprovado':
        return <CheckCircle2 className="w-5 h-5 text-[#004C97]" />
      case 'Liberado':
        return <Send className="w-5 h-5 text-indigo-700" />
      case 'Executado':
        return <CheckCheck className="w-5 h-5 text-emerald-700" />
      case 'Cancelado':
        return <XCircle className="w-5 h-5 text-rose-700" />
      case 'Em Revisão':
        return <Clock className="w-5 h-5 text-amber-700" />
      default:
        return <RotateCcw className="w-5 h-5 text-slate-700" />
    }
  }

  const handleSubmit = async () => {
    setErrorMessage(null)

    if (isCancelling && justification.trim().length < 5) {
      setErrorMessage('A justificativa de cancelamento é obrigatória (mínimo de 5 caracteres).')
      return
    }

    if (isExecuting && !operationalConfirmation) {
      setErrorMessage(
        'A confirmação operacional é obrigatória para registrar a efetiva realização do corte.',
      )
      return
    }

    setIsSubmitting(true)
    try {
      const res = await mpMultipleCuttingPlansService.transitionStatus({
        planId: plan.id!,
        targetStatus,
        justification: justification.trim() || undefined,
        operationalConfirmation: isExecuting ? operationalConfirmation : undefined,
      })

      toast({
        title: 'Status Atualizado com Sucesso',
        description:
          res.message || `O plano ${plan.plan_code} agora está no status "${targetStatus}".`,
      })

      if (res.plan) {
        onSuccess(res.plan)
      } else {
        onSuccess({
          ...plan,
          status: targetStatus,
          status_justification: justification.trim() || plan.status_justification,
          status_updated_at: new Date().toISOString(),
        })
      }
      onClose()
    } catch (err: any) {
      const message = err?.message || 'Falha ao atualizar o status do plano de corte no servidor.'
      setErrorMessage(message)
      toast({
        title: 'Falha na Transição de Status',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white border border-slate-200 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              {getActionIcon()}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {getActionTitle()}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Código: <strong className="font-mono text-[#004C97]">{plan.plan_code}</strong>{' '}
                &bull; Versão: <strong className="font-mono">v0{plan.version || 1}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 my-2">
          {/* Card de Transição de Estado */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Status Atual:</span>
              <MPCuttingPlanStatusBadge status={currentStatus} />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-slate-700 font-bold">Novo Status:</span>
              <MPCuttingPlanStatusBadge status={targetStatus} />
            </div>
          </div>

          {/* Mensagem Informativa de Regra */}
          {targetStatus === 'Aprovado' && (
            <p className="text-[11px] text-slate-600 leading-relaxed bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
              Ao <strong>Aprovar</strong>, você valida tecnicamente a distribuição de cortes e o
              rendimento metálico para o lote/corrida especificados.
            </p>
          )}

          {targetStatus === 'Liberado' && (
            <p className="text-[11px] text-slate-600 leading-relaxed bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200">
              Ao <strong>Liberar</strong>, o plano é encaminhado e autorizado formalmente para
              execução pelas serras do chão de fábrica.
            </p>
          )}

          {/* Checkbox de Confirmação Operacional para Executado */}
          {isExecuting && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="oper-conf"
                  checked={operationalConfirmation}
                  onCheckedChange={(c) => setOperationalConfirmation(Boolean(c))}
                  className="mt-0.5 border-emerald-400 data-[state=checked]:bg-emerald-700"
                />
                <Label
                  htmlFor="oper-conf"
                  className="text-xs text-emerald-950 font-medium leading-snug cursor-pointer select-none"
                >
                  <strong>Confirmação Operacional Obrigatória:</strong> declaro que os cortes deste
                  plano foram efetivamente realizados na serra e inspecionados conforme os
                  parâmetros de qualidade da CIAFAL.
                </Label>
              </div>
            </div>
          )}

          {/* Campo de Justificativa (Obrigatório para Cancelamento) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-700 font-semibold flex items-center justify-between">
              <span>Justificativa {isCancelling ? '(Obrigatória)' : '(Opcional)'}</span>
              {isCancelling && (
                <span className="text-[10px] text-rose-600 font-bold">Mínimo 5 caracteres</span>
              )}
            </Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={
                isCancelling
                  ? 'Descreva detalhadamente o motivo do cancelamento deste plano de corte...'
                  : 'Adicione observações ou notas de governança sobre esta mudança de status...'
              }
              rows={3}
              className="text-xs resize-none border-slate-300 focus-visible:ring-[#004C97]"
            />
          </div>

          {/* Exibição de Erro do Servidor / Validação */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
              <div className="space-y-0.5">
                <span className="font-bold block">Ação Bloqueada:</span>
                <span className="leading-snug">{errorMessage}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto text-xs"
          >
            Voltar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full sm:w-auto text-xs font-bold ${
              isCancelling
                ? 'bg-rose-700 hover:bg-rose-800 text-white'
                : isExecuting
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-[#004C97] hover:bg-[#003870] text-white'
            }`}
          >
            {isSubmitting ? 'Processando...' : 'Confirmar Transição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

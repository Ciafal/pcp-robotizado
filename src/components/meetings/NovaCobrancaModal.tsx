import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  Send,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Building,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { PCPMeetingPendencyRecord } from '@/types/pcp-meeting'
import { pcpCobrancasService } from '@/services/pcp-cobrancas-service'
import { useToast } from '@/hooks/use-toast'
import { getPlantNow } from '@/lib/temporal-utils'

interface NovaCobrancaModalProps {
  open: boolean
  onClose: () => void
  pendency: PCPMeetingPendencyRecord | null
  onCobrancaSuccess?: () => void
}

export const NovaCobrancaModal: React.FC<NovaCobrancaModalProps> = ({
  open,
  onClose,
  pendency,
  onCobrancaSuccess,
}) => {
  const { toast } = useToast()

  const [mensagemComplementar, setMensagemComplementar] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!pendency) return null

  // Cálculo de dias em aberto
  const calculateDaysOpen = (createdDate?: string) => {
    if (!createdDate) return 0
    const created = new Date(createdDate)
    const now = getPlantNow()
    const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  // Formatação de data padrão dd/mm/aaaa
  const formatDatePtBr = (dateStr?: string) => {
    if (!dateStr) return '-'
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-')
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const isVencida =
    (pendency.status === 'ABERTA' || pendency.status === 'EM_ANDAMENTO') &&
    new Date(pendency.deadline + 'T23:59:59') < getPlantNow()

  const diasEmAberto = calculateDaysOpen(pendency.created)
  const meetingDisplayCode =
    pendency.meeting_code ||
    (pendency.meeting_id !== 'REUNIAO_MANUAL' ? pendency.meeting_id : 'Reunião PCP')

  // Ao clicar em "Enviar cobrança", abrir diálogo de confirmação
  const handlePreSubmit = () => {
    setShowConfirmDialog(true)
  }

  // Ao confirmar no alerta, disparar cobrança de verdade
  const handleConfirmSend = async () => {
    if (submitting) return
    setSubmitting(true)

    // Gerar idempotency key única por tentativa
    const idempotencyKey = `cob_${pendency.id}_${Date.now()}`

    try {
      const response = await pcpCobrancasService.enviarCobranca({
        pendencia_id: pendency.id!,
        mensagem_complementar: mensagemComplementar.trim(),
        idempotency_key: idempotencyKey,
      })

      setShowConfirmDialog(false)
      onClose()
      setMensagemComplementar('')

      if (onCobrancaSuccess) {
        onCobrancaSuccess()
      }

      toast({
        title: `Nova Cobrança — ${pendency.pendency_code}`,
        description: response.message,
        variant: response.success ? 'default' : 'destructive',
      })
    } catch (err: any) {
      toast({
        title: 'Falha ao enviar cobrança',
        description: err.message || 'Erro durante processamento da cobrança.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!submitting) {
            if (!isOpen) {
              setMensagemComplementar('')
              setShowConfirmDialog(false)
            }
            onClose()
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#004C97]" />
                Nova Cobrança da Pendência
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono font-bold ${
                  pendency.status === 'CONCLUIDA'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : isVencida
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {isVencida ? 'VENCIDA' : pendency.status}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Notifique o responsável formalmente criando um alerta no <strong>Meu Dia</strong> e
              disparando e-mail corporativo auditado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Bloco 1: Identificação da Pendência */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Código da Pendência
                  </span>
                  <span className="font-mono font-bold text-sm text-[#004C97]">
                    {pendency.pendency_code}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Reunião PCP de Origem
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-800">
                    {meetingDisplayCode} &bull; S{pendency.origin_week}/{pendency.origin_year}
                  </span>
                </div>
              </div>

              {/* Assunto e Ação */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Assunto / Ação
                </span>
                <p className="font-bold text-slate-900 text-xs">{pendency.subject}</p>
                <p className="text-slate-600 text-xs leading-relaxed bg-white p-2 rounded border border-slate-200/60">
                  {pendency.action || 'Ação não especificada.'}
                </p>
              </div>

              {/* Metadados: Área, Responsável, Data de Criação, Prazo, Dias em aberto, Status */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/80 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Área:</span>
                  <strong className="text-slate-800">{pendency.area}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Responsável:</span>
                  <strong className="text-slate-900 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    {pendency.responsible}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Data de Criação:</span>
                  <span className="font-mono text-slate-700">
                    {formatDatePtBr(pendency.created)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Prazo Final:</span>
                  <span
                    className={`font-mono font-bold ${
                      isVencida ? 'text-rose-600' : 'text-slate-800'
                    }`}
                  >
                    {formatDatePtBr(pendency.deadline)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Dias em Aberto:</span>
                  <strong className="text-slate-800 font-mono">{diasEmAberto} dia(s)</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Prioridade:</span>
                  <Badge variant="outline" className="text-[9px] font-semibold">
                    {pendency.priority}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Bloco 2: Mensagem Complementar Opcional */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Mensagem Complementar (opcional)
              </label>
              <Textarea
                value={mensagemComplementar}
                onChange={(e) => setMensagemComplementar(e.target.value)}
                placeholder="Favor atualizar esta pendência antes da próxima reunião semanal de PCP."
                rows={3}
                disabled={submitting}
                className="text-xs resize-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Esta mensagem será anexada ao card no Meu Dia e no corpo do e-mail ao responsável.
              </span>
            </div>

            {/* Info dos Canais */}
            <div className="bg-blue-50/70 p-3 rounded border border-blue-100 flex items-start gap-2 text-[11px] text-blue-900">
              <CheckCircle2 className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
              <div>
                <strong>Canais acionados:</strong>
                <ul className="list-disc list-inside mt-0.5 text-blue-800 space-y-0.5">
                  <li>
                    <strong>Meu Dia:</strong> atividade real vinculada para{' '}
                    <strong>{pendency.responsible}</strong> com botão "Abrir pendência".
                  </li>
                  <li>
                    <strong>E-mail Corporativo:</strong> notificação formal com dados da pendência
                    (com status honesto de envio).
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handlePreSubmit}
              disabled={submitting}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processando Cobrança...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Enviar cobrança
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação antes do envio */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#004C97]" />
              Confirmar Envio da Cobrança
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              Deseja enviar uma nova cobrança da pendência{' '}
              <strong className="text-slate-900 font-mono">{pendency.pendency_code}</strong> para{' '}
              <strong className="text-slate-900">{pendency.responsible}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmSend()
              }}
              disabled={submitting}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enviando...
                </span>
              ) : (
                'Confirmar envio'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default NovaCobrancaModal

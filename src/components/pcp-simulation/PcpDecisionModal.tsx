import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CommercialSimulationRecord } from '@/types/pcp-commercial-simulation'
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, HelpCircle } from 'lucide-react'

interface PcpDecisionModalProps {
  isOpen: boolean
  onClose: () => void
  simulation: CommercialSimulationRecord | null
  onDecide: (
    decision: 'APROVADA_PCP' | 'REPROVADA_PCP' | 'SOLICITADO_AJUSTE_PCP',
    feedbackNotes: string,
  ) => Promise<void>
}

export const PcpDecisionModal: React.FC<PcpDecisionModalProps> = ({
  isOpen,
  onClose,
  simulation,
  onDecide,
}) => {
  const [feedbackNotes, setFeedbackNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!simulation) return null

  const handleAction = async (
    decision: 'APROVADA_PCP' | 'REPROVADA_PCP' | 'SOLICITADO_AJUSTE_PCP',
  ) => {
    try {
      setSubmitting(true)
      setErrorMsg(null)
      await onDecide(decision, feedbackNotes)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao registrar decisão do PCP.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Avaliação e Decisão do PCP
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Simulação {simulation.simulation_code} — {simulation.customer_name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo da Simulação */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 my-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Produto:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {simulation.product_code}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Quantidade Solicitada:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {simulation.requested_quantity_tons} t
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Prazo Desejado:</span>
            <span className="text-slate-700 dark:text-slate-300">
              {simulation.requested_deadline}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Melhor Data Calculada:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {simulation.best_date_possible}
            </span>
          </div>
        </div>

        {/* Aviso de Não Alteração da Programação */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
          <strong>Atenção Programador:</strong> A aprovação desta simulação serve como parecer
          formal de viabilidade, mas <strong>NÃO insere a ordem na programação vigente</strong>. A
          inclusão oficial ocorre exclusivamente pelo planejamento oficial da Montagem Semanal.
        </div>

        {/* Parecer do Programador */}
        <div className="space-y-1.5 mt-3">
          <Label
            htmlFor="pcp-feedback"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Parecer Técnico / Justificativa do PCP:
          </Label>
          <Textarea
            id="pcp-feedback"
            rows={3}
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            placeholder="Ex.: Viável para encaixe na semana W40 na L1 conforme campanha de bitola; ou reprovado por falta de estoque de tarugo..."
            className="text-xs resize-none"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => handleAction('SOLICITADO_AJUSTE_PCP')}
            className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <HelpCircle className="w-3.5 h-3.5 mr-1" />
            Solicitar Ajuste
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => handleAction('REPROVADA_PCP')}
            className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Reprovar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => handleAction('APROVADA_PCP')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Aprovar Simulação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

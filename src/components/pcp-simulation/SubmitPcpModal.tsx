import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Badge } from '../ui/badge'
import { Send, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { SimulationResultBundle } from '../../types/pcp-commercial-simulation'
import { formatNumberPtBr } from '../../lib/number-format'

interface SubmitPcpModalProps {
  isOpen: boolean
  onClose: () => void
  simulationCode?: string
  customerName: string
  productCode: string
  productDescription?: string
  requestedQuantity: number
  requestedDeadline: string
  resultBundle: SimulationResultBundle
  onSubmit: (chosenScenario: string, commercialNotes: string) => Promise<void>
}

export const SubmitPcpModal: React.FC<SubmitPcpModalProps> = ({
  isOpen,
  onClose,
  simulationCode,
  customerName,
  productCode,
  productDescription,
  requestedQuantity,
  requestedDeadline,
  resultBundle,
  onSubmit,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('A')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setErrorMsg(null)
      await onSubmit(selectedScenario, notes)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao enviar solicitação ao PCP.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-2xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Enviar para Análise Formal do PCP
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Submete o estudo de viabilidade comercial para validação oficial pela equipe de
                programação.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Alerta de Governança Estrita */}
        <div className="my-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>REGRA DE GOVERNANÇA CIAFAL:</strong> O envio ou eventual aprovação desta
            simulação pelo PCP <strong>NÃO altera a programação vigente</strong>, não cria ordem no
            SAP e não reserva estoque. A efetivação de qualquer inserção é realizada unicamente pelo
            fluxo oficial da Montagem Semanal.
          </div>
        </div>

        {/* Resumo da Demanda */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Código da Simulação:</span>{' '}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {simulationCode || 'Novo Registro'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Cliente:</span>{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {customerName}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Produto:</span>{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {productCode}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Quantidade Solicitada:</span>{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatNumberPtBr(requestedQuantity, 1)} t
              </span>
            </div>
            <div>
              <span className="text-slate-500">Prazo Solicitado:</span>{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {requestedDeadline}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Melhor Data Calculada:</span>{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {resultBundle.kpis.best_date_possible}
              </span>
            </div>
          </div>
        </div>

        {/* Seleção do Cenário Pretendido */}
        <div className="space-y-3 pt-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Selecione a Alternativa Pretendida pelo Comercial:
          </Label>

          <RadioGroup
            value={selectedScenario}
            onValueChange={setSelectedScenario}
            className="grid grid-cols-1 gap-2.5"
          >
            {resultBundle.scenariosComparison.map((sc) => (
              <label
                key={sc.scenario_id}
                htmlFor={`sc-${sc.scenario_id}`}
                className={`p-3 rounded-lg border cursor-pointer transition flex items-start gap-3 ${
                  selectedScenario === sc.scenario_id
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <RadioGroupItem
                  value={sc.scenario_id}
                  id={`sc-${sc.scenario_id}`}
                  className="mt-1"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{sc.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      Data: {sc.delivery_date}
                    </Badge>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{sc.subtitle}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Observações do Comercial */}
        <div className="space-y-1.5 pt-2">
          <Label
            htmlFor="comm-notes"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            Observações e Justificativa Comercial para o PCP:
          </Label>
          <Textarea
            id="comm-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: Cliente estratégico com proposta de fidelização; negociar encaixe com a L1 sem comprometer o pedido da Usiminas..."
            className="text-xs resize-none"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={onClose}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
          >
            {submitting ? (
              'Enviando...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Envio ao PCP
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

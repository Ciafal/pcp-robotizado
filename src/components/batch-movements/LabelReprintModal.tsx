import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BatchSummary, LabelReprintRequest, LabelReprintResult } from '@/types/batch-movements'
import { SAP_PRINTERS, REPRINT_REASONS } from '@/services/batch-movements-service'
import { Printer, AlertCircle, CheckCircle2, ShieldAlert, FileText } from 'lucide-react'

interface LabelReprintModalProps {
  summary: BatchSummary | null
  isOpen: boolean
  onClose: () => void
  onSubmitReprint: (request: LabelReprintRequest) => Promise<LabelReprintResult>
}

export const LabelReprintModal: React.FC<LabelReprintModalProps> = ({
  summary,
  isOpen,
  onClose,
  onSubmitReprint,
}) => {
  const [impressora, setImpressora] = useState<string>(SAP_PRINTERS[0]?.id || '')
  const [quantidadeCopias, setQuantidadeCopias] = useState<number>(1)
  const [motivo, setMotivo] = useState<string>('')
  const [justificativa, setJustificativa] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<LabelReprintResult | null>(null)

  if (!summary) return null

  const handleReset = () => {
    setImpressora(SAP_PRINTERS[0]?.id || '')
    setQuantidadeCopias(1)
    setMotivo('')
    setJustificativa('')
    setFormError(null)
    setResult(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setResult(null)

    // Validações obrigatórias
    if (!impressora) {
      setFormError('Selecione uma impressora SAP.')
      return
    }

    if (!motivo) {
      setFormError('O campo "Motivo da reimpressão" é obrigatório.')
      return
    }

    if (motivo === 'Outro' && (!justificativa || !justificativa.trim())) {
      setFormError('Para o motivo "Outro", a justificativa é estritamente obrigatória.')
      return
    }

    if (quantidadeCopias < 1 || quantidadeCopias > 10) {
      setFormError('A quantidade de cópias deve ser entre 1 e 10.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await onSubmitReprint({
        lote: summary.lote,
        material_code: summary.material_code,
        material_desc: summary.material_desc,
        peso: summary.saldo_atual || summary.peso_estimado_kg,
        centro: summary.centro,
        deposito: summary.deposito_atual,
        etiqueta_atual_id: summary.etiqueta_atual_id,
        impressora,
        quantidade_copias: quantidadeCopias,
        motivo_reimpressao: motivo as any,
        justificativa: justificativa.trim() || undefined,
      })

      setResult(res)
    } catch (err: any) {
      setResult({
        success: false,
        protocolo: 'ETIQ-ERRO',
        lote: summary.lote,
        message: 'Não foi possível emitir a etiqueta.',
        retorno_sap: err?.message || 'Erro inesperado na chamada',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-50 text-[#004C97]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Emissão de 2ª Via de Etiqueta
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Rotina oficial SAP ECC — Lote{' '}
                <strong className="font-mono text-slate-700">{summary.lote}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Feedback de Resultado da Operação */}
        {result ? (
          <div className="py-4 space-y-4">
            {result.success ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold text-sm">
                    2ª via da etiqueta do lote {result.lote} emitida com sucesso.
                  </span>
                </div>
                <div className="text-xs space-y-1 pl-7">
                  <div>
                    Protocolo de Auditoria:{' '}
                    <strong className="font-mono">{result.protocolo}</strong>
                  </div>
                  <div>
                    Retorno SAP: <span>{result.retorno_sap || 'Spool gerado com sucesso'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <span className="font-bold text-sm">
                    {result.code === 'SAP_PRINT_NOT_CONFIGURED'
                      ? 'Integração SAP de reimpressão pendente de parametrização.'
                      : 'Não foi possível emitir a etiqueta.'}
                  </span>
                </div>
                <div className="text-xs space-y-1 pl-7 text-rose-700">
                  <p>
                    A tentativa foi auditada sob o protocolo{' '}
                    <strong className="font-mono">{result.protocolo}</strong>.
                  </p>
                  <p className="text-[11px] text-rose-600 font-mono bg-rose-100/60 p-2 rounded">
                    Retorno técnico: {result.retorno_sap || 'Gateway RFC indisponível'}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={handleClose}
                className="bg-[#004C97] text-white text-xs"
              >
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Aviso de Auditoria Obrigatória */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Auditoria ativa: toda solicitação de 2ª via é gravada com usuário, data/hora, motivo
                e retorno oficial SAP.
              </span>
            </div>

            {/* Dados Fixos do Lote (Não Editáveis) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-slate-50/70 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Lote</span>
                <span className="font-mono font-bold text-slate-800">{summary.lote}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Material
                </span>
                <span
                  className="font-mono font-bold text-slate-800 truncate block"
                  title={summary.material_code}
                >
                  {summary.material_code}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Centro / Depósito
                </span>
                <span className="font-bold text-slate-800">
                  {summary.centro} / {summary.deposito_atual}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Peso / Saldo
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {summary.saldo_atual.toLocaleString('pt-BR')} {summary.unidade_medida}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Identificação Etiqueta Atual
                </span>
                <span className="font-mono text-slate-700 text-[11px]">
                  {summary.etiqueta_atual_id || 'Não informada'}
                </span>
              </div>
            </div>

            {/* Campos do Formulário */}
            <div className="space-y-3">
              {/* Impressora SAP */}
              <div>
                <Label htmlFor="printer-select" className="text-xs font-semibold text-slate-700">
                  Impressora SAP de Destino <span className="text-rose-600">*</span>
                </Label>
                <Select value={impressora} onValueChange={setImpressora}>
                  <SelectTrigger id="printer-select" className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Selecione a impressora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SAP_PRINTERS.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantidade de Cópias */}
              <div>
                <Label htmlFor="copies-input" className="text-xs font-semibold text-slate-700">
                  Quantidade de Cópias <span className="text-rose-600">*</span>
                </Label>
                <Input
                  id="copies-input"
                  type="number"
                  min={1}
                  max={10}
                  value={quantidadeCopias}
                  onChange={(e) => setQuantidadeCopias(parseInt(e.target.value) || 1)}
                  className="mt-1 h-9 text-xs w-28 font-mono"
                />
              </div>

              {/* Motivo da Reimpressão (OBRIGATÓRIO) */}
              <div>
                <Label htmlFor="reason-select" className="text-xs font-semibold text-slate-700">
                  Motivo da Reimpressão <span className="text-rose-600">*</span>
                </Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger id="reason-select" className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Selecione o motivo oficial..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPRINT_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Justificativa (Obrigatória se "Outro") */}
              {motivo === 'Outro' && (
                <div className="animate-in fade-in">
                  <Label
                    htmlFor="justification-input"
                    className="text-xs font-semibold text-rose-700"
                  >
                    Justificativa Obrigatória <span className="text-rose-600">*</span>
                  </Label>
                  <Textarea
                    id="justification-input"
                    placeholder="Descreva detalhadamente a necessidade de reimpressão da etiqueta..."
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    className="mt-1 text-xs border-rose-300 focus-visible:ring-rose-500 min-h-[70px]"
                    required
                  />
                </div>
              )}
            </div>

            {/* Mensagem de Erro de Formulário */}
            {formError && (
              <div className="flex items-center gap-2 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold px-4"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando ao SAP...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5" />
                    Confirmar e Emitir
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

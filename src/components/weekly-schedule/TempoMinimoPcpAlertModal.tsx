import React from 'react'
import { AlertTriangle, Clock, Calendar, ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TempoMinimoPcpEvaluationResult } from '@/services/tempo-minimo-pcp-engine'
import { formatBrNumber } from '@/lib/number-format'

export interface TempoMinimoPcpAlertModalData {
  isOpen: boolean
  evaluation: TempoMinimoPcpEvaluationResult
  actionTitle?: string
}

interface TempoMinimoPcpAlertModalProps {
  data: TempoMinimoPcpAlertModalData | null
  onClose: () => void
}

export const TempoMinimoPcpAlertModal: React.FC<TempoMinimoPcpAlertModalProps> = ({
  data,
  onClose,
}) => {
  if (!data || !data.isOpen) return null

  const { evaluation } = data
  const mostRestrictive = evaluation.mostRestrictiveRule
  const rawCode = mostRestrictive?.rawMaterialCode || 'MP'
  const valorFormatado = mostRestrictive
    ? formatBrNumber(mostRestrictive.valor, mostRestrictive.valor % 1 === 0 ? 0 : 2)
    : '0'
  const unidade = mostRestrictive?.unidade || 'Horas'

  // Formata antecedência disponível amigável (em horas com vírgula decimal)
  const horasDisponiveis = evaluation.horasDisponiveis ?? evaluation.minutosDisponiveis / 60
  const horasMinimas = evaluation.horasMinimasExigidas ?? evaluation.minutosMinimosExigidos / 60

  return (
    <Dialog open={data.isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-lg bg-white border-amber-300 text-slate-900 shadow-2xl p-0 overflow-hidden"
        data-testid="modal-tempo-minimo-pcp-alert"
      >
        {/* Cabeçalho padrão Ciafal de Alerta */}
        <div className="bg-[#004C97] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-lg text-amber-300">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
                Antecedência mínima não atendida
                <Badge className="bg-amber-400 text-amber-950 text-[10px] font-mono font-black uppercase">
                  BLOQUEIO PCP
                </Badge>
              </DialogTitle>
              <p className="text-xs text-blue-100 font-medium">
                Controle de Antecedência de Matéria-Prima — Ficha Mestra CIAFAL
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Mensagem Principal */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p
                className="font-bold text-amber-950 text-xs leading-relaxed"
                data-testid="tempo-minimo-alert-message"
              >
                A programação não pode ser realizada porque a matéria-prima{' '}
                <span className="font-mono text-amber-900 underline underline-offset-2">
                  {rawCode}
                </span>{' '}
                exige antecedência mínima de{' '}
                <strong>
                  {valorFormatado} {unidade}
                </strong>
                .
              </p>
              {evaluation.violatingRules.length > 1 && (
                <p className="text-[11px] text-amber-800">
                  Prevalece a restrição mais severa entre as {evaluation.violatingRules.length}{' '}
                  matérias-primas avaliadas.
                </p>
              )}
            </div>
          </div>

          {/* Grid com Antecedência mínima, disponível e primeiro início */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-[11px]">
            <div className="space-y-0.5">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Antecedência mínima
              </span>
              <span
                className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1"
                data-testid="tempo-minimo-exigido"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {valorFormatado} {unidade}
                <span className="text-[10px] text-slate-500 font-normal">
                  ({formatBrNumber(horasMinimas, 1)} h)
                </span>
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Antecedência disponível
              </span>
              <span
                className="font-mono font-bold text-rose-600 text-xs flex items-center gap-1"
                data-testid="tempo-minimo-disponivel"
              >
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                {formatBrNumber(Math.max(0, horasDisponiveis), 2)} h
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Primeiro início permitido
              </span>
              <span
                className="font-mono font-bold text-[#004C97] text-xs flex items-center gap-1"
                data-testid="tempo-minimo-primeiro-inicio"
              >
                <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                {evaluation.primeiroInicioPermitidoFormatado || '—'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-tight">
            Para programar esta ordem com a matéria-prima selecionada, reagende o início previsto
            para após o primeiro horário permitido ou ajuste o cadastro na Ficha Mestra caso o tempo
            mínimo tenha sido alterado pela engenharia.
          </p>
        </div>

        <DialogFooter className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end">
          <Button
            type="button"
            onClick={onClose}
            data-testid="btn-entendi-tempo-minimo"
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold px-5"
          >
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TempoMinimoPcpAlertModal

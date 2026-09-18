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
import { AlertTriangle, CheckCircle2, XCircle, Info, ShieldAlert } from 'lucide-react'
import { GaugeMinRestrictionEvaluation } from '@/types/line-gauge-restriction'

interface GaugeMinRestrictionAlertModalProps {
  isOpen: boolean
  onClose: () => void
  evaluation: GaugeMinRestrictionEvaluation | null
  onProceedOverride?: () => void
}

export const GaugeMinRestrictionAlertModal: React.FC<GaugeMinRestrictionAlertModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  onProceedOverride,
}) => {
  if (!evaluation) return null

  const {
    company,
    line,
    center,
    currentGauge,
    nextGauge,
    activeRestrictionsCount,
    satisfiedCount,
    pendingCount,
    evaluations,
    allSatisfied,
  } = evaluation

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200 shadow-2xl p-0 overflow-hidden">
        {/* Cabeçalho de Alerta Padrão CIAFAL */}
        <div className="bg-amber-500 text-white p-5 flex items-start gap-3 border-b border-amber-600">
          <div className="p-2 bg-amber-600 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-base font-bold uppercase tracking-wider text-white">
              ATENÇÃO — Restrições mínimas de programação por bitola não atendidas.
            </DialogTitle>
            <DialogDescription className="text-amber-100 text-xs mt-1">
              Centro <span className="font-mono font-bold text-white">{center || line}</span> (
              {company}) — Avaliação determinística da Ficha Mestra
            </DialogDescription>
          </div>
        </div>

        {/* Corpo do Detalhamento */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Card Resumo do Centro e Bitolas */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Centro</span>
                <span className="font-mono font-bold text-slate-900">{center || line}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Bitola Atual
                </span>
                <span className="font-mono font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded">
                  {currentGauge || 'N/D'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Próxima Bitola
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {nextGauge || 'Troca Prevista'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Status</span>
                <Badge
                  variant="outline"
                  className={
                    allSatisfied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-[10px]'
                      : 'bg-rose-50 text-rose-700 border-rose-300 font-bold text-[10px]'
                  }
                >
                  {satisfiedCount}/{activeRestrictionsCount} atendidas
                </Badge>
              </div>
            </div>

            {/* Frase oficial obrigatória */}
            <div className="pt-2 border-t border-slate-200 flex items-start gap-1.5 text-rose-800 font-semibold text-[11px]">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                A troca para a próxima bitola não atende todas as restrições parametrizadas para
                este Centro.
              </span>
            </div>
          </div>

          {/* Lista de Restrições com ícone ✓/✕ + texto completo (nunca só cor) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Restrições Parametrizadas ({evaluations.length})</span>
              <span className="text-[11px] font-normal text-slate-500">
                {pendingCount} pendente(s) • {satisfiedCount} atendida(s)
              </span>
            </h4>

            <div className="space-y-2">
              {evaluations.map((item, idx) => (
                <div
                  key={item.restrictionId || idx}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    item.isSatisfied
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-300 text-rose-950 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {item.isSatisfied ? (
                        <div className="flex items-center gap-1 font-bold text-emerald-700 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>[✓ ATENDIDA]</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 font-bold text-rose-700 shrink-0">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <span>[✕ NÃO ATENDIDA]</span>
                        </div>
                      )}
                      <div>
                        <span className="font-bold uppercase tracking-wider text-[11px]">
                          Tipo: {item.restrictionType}
                        </span>
                        {item.ruleDescription && (
                          <p className="text-[11px] text-slate-600 mt-0.5 font-normal">
                            {item.ruleDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes de Atual / Mínimo / Déficit */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-white/70 p-1.5 rounded border border-slate-200/60">
                      <span className="text-slate-500 font-sans block text-[10px]">
                        Atendimento vs Mínimo:
                      </span>
                      <strong className="text-slate-900">{item.deficitFormatted}</strong>
                    </div>

                    <div className="bg-white/70 p-1.5 rounded border border-slate-200/60">
                      <span className="text-slate-500 font-sans block text-[10px]">
                        Diagnóstico:
                      </span>
                      <span className="text-slate-700 font-sans text-[11px]">
                        {item.explanation}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Recomendação Operacional:</strong> Mantenha a produção na mesma bitola{' '}
              <strong>{currentGauge}</strong> adicionando ou remanejando lotes compatíveis até que
              todas as restrições mínimas sejam plenamente satisfeitas.
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex sm:justify-between items-center gap-2">
          <div className="text-[11px] text-slate-500">
            PCP Robotizado • Regra Soberana da Ficha Mestra
          </div>
          <div className="flex items-center gap-2">
            {onProceedOverride && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onProceedOverride()
                  onClose()
                }}
                className="text-xs text-amber-800 border-amber-300 hover:bg-amber-100"
              >
                Forçar Troca com Justificativa
              </Button>
            )}
            <Button
              size="sm"
              onClick={onClose}
              className="bg-[#004C97] hover:bg-blue-800 text-white text-xs font-bold"
            >
              Entendido / Ajustar Sequência
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

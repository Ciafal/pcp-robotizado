import React from 'react'
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  FileText,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MaterialTimelineStep } from '@/services/gestao-industrializador-service'
import { formatNumberPtBr } from '@/lib/number-format'

interface MaterialTimelineModalProps {
  isOpen: boolean
  onClose: () => void
  materialCode: string
  materialDescription: string
  productionOrder: string
  steps: MaterialTimelineStep[]
}

export const MaterialTimelineModal: React.FC<MaterialTimelineModalProps> = ({
  isOpen,
  onClose,
  materialCode,
  materialDescription,
  productionOrder,
  steps,
}) => {
  if (!isOpen) return null

  const formatStepDate = (dStr: string | null) => {
    if (!dStr) return 'Pendente'
    try {
      const d = new Date(dStr)
      if (isNaN(d.getTime())) return dStr
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-xl shadow-2xl flex flex-col w-[94vw] h-[92vh] max-w-[1300px] border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center text-[#004C97]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Rastreabilidade da Cadeia Industrializador
                </span>
                <Badge className="bg-[#004C97] text-white text-[10px]">{productionOrder}</Badge>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {materialCode} &mdash; {materialDescription}
              </h2>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Linha do Tempo Visual */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-semibold text-slate-800">Cadeia Completa: </span>
              <span>
                CARTEIRA &rarr; MP RESERVADA &rarr; MP ENVIADA &rarr; RECEBIDA INDUSTRIALIZADOR
                &rarr; INDUSTRIALIZAÇÃO INICIADA &rarr; CONCLUÍDA &rarr; ESTOQUE ACABADO &rarr;
                FATURAMENTO &rarr; RETORNO CIAFAL
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
              Fórmula rastreável &bull; Sem datas fictícias
            </Badge>
          </div>

          {/* Stepper / Timeline */}
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {steps.map((step, idx) => {
              const isCompleted = step.status === 'CONCLUIDO'
              const isInProgress = step.status === 'EM_ANDAMENTO'
              const isPending = step.status === 'PENDENTE'

              return (
                <div key={step.step_id} className="relative flex items-start gap-4">
                  {/* Marcador do Ponto */}
                  <div
                    className={`absolute -left-6 sm:-left-8 w-6 sm:w-7 h-6 sm:h-7 rounded-full flex items-center justify-center border-2 bg-white transition-all ${
                      isCompleted
                        ? 'border-emerald-600 text-emerald-600 ring-2 ring-emerald-100'
                        : isInProgress
                          ? 'border-amber-500 text-amber-600 ring-2 ring-amber-100 animate-pulse'
                          : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isInProgress ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    )}
                  </div>

                  {/* Cartão de Conteúdo da Etapa */}
                  <div
                    className={`flex-1 rounded-lg border p-4 transition-all ${
                      isCompleted
                        ? 'bg-white border-slate-200 shadow-2xs'
                        : isInProgress
                          ? 'bg-amber-50/50 border-amber-200 shadow-2xs'
                          : 'bg-slate-50/60 border-slate-200/60 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          {step.label}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isInProgress
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isCompleted ? 'Concluído' : isInProgress ? 'Em Execução' : 'Pendente'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatStepDate(step.date)}</span>
                        </div>
                        {step.quantity_tons !== null && (
                          <div className="font-bold text-slate-800">
                            {formatNumberPtBr(step.quantity_tons, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 2,
                            })}{' '}
                            t
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>{step.details || 'Sem observações adicionais.'}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Sistema responsável:{' '}
                        <span className="font-semibold text-slate-700">
                          {step.responsible_system}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs text-slate-600">
          <span>Rastreabilidade ponta a ponta com carimbo de tempo real</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs bg-white text-slate-700 hover:bg-slate-100"
          >
            Fechar Linha do Tempo
          </Button>
        </div>
      </div>
    </div>
  )
}
export default MaterialTimelineModal

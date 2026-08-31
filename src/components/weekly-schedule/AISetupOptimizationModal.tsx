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
import { AISetupRecommendation } from '@/types/roll-shop'
import {
  Sparkles,
  ArrowRight,
  Clock,
  TrendingUp,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'

interface AISetupOptimizationModalProps {
  isOpen: boolean
  onClose: () => void
  recommendations: AISetupRecommendation[]
  onApplyRecommendation: (rec: AISetupRecommendation) => void
}

export const AISetupOptimizationModal: React.FC<AISetupOptimizationModalProps> = ({
  isOpen,
  onClose,
  recommendations,
  onApplyRecommendation,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Otimizador de Sequência & Setup com IA (PCP Robotizado)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Avaliação multivariável de Atendimento de Carteira, MTS/MTO, Ficha Mestre, Gargalos
                e SMED
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              Nenhuma oportunidade crítica de setup detectada. A sequência atual já está altamente
              otimizada.
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`p-4 rounded-lg border text-xs space-y-3 transition-colors ${
                  rec.severity === 'CRITICAL' || rec.severity === 'WARNING'
                    ? 'bg-amber-50/50 border-amber-200'
                    : rec.severity === 'OPPORTUNITY'
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {rec.type === 'BOTTLENECK_SETUP' && <Flame className="w-4 h-4 text-rose-600" />}
                    {rec.type === 'SEQUENCE_OPTIMIZATION' && (
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                    )}
                    {rec.type === 'STANDARD_TIME_REVISION' && (
                      <Clock className="w-4 h-4 text-blue-600" />
                    )}
                    <h4 className="font-bold text-slate-900 text-sm">{rec.title}</h4>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      rec.severity === 'OPPORTUNITY'
                        ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                        : rec.severity === 'WARNING'
                          ? 'border-amber-400 text-amber-700 bg-amber-50'
                          : 'border-blue-400 text-blue-700 bg-blue-50'
                    }
                  >
                    {rec.severity}
                  </Badge>
                </div>

                <p className="text-slate-700 leading-relaxed">{rec.description}</p>

                {rec.current_sequence_summary && rec.suggested_sequence_summary && (
                  <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Sequência Atual:</span>
                      <span className="font-mono text-slate-700 text-[11px]">
                        {rec.current_sequence_summary}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        Sugestão IA <ArrowRight className="w-3 h-3" />
                      </span>
                      <span className="font-mono text-emerald-800 font-semibold text-[11px]">
                        {rec.suggested_sequence_summary}
                      </span>
                    </div>
                  </div>
                )}

                {rec.minutes_saved && (
                  <div className="flex items-center gap-4 text-slate-600 pt-1">
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <Clock className="w-3.5 h-3.5" /> Ganho: {rec.minutes_saved} min (+
                      {rec.capacity_hours_gain} h)
                    </span>
                    {rec.potential_throughput_unavailable_tons && (
                      <span className="flex items-center gap-1 font-semibold text-[#004C97]">
                        <TrendingUp className="w-3.5 h-3.5" /> Throughput recuperável:{' '}
                        {rec.potential_throughput_unavailable_tons} t
                      </span>
                    )}
                  </div>
                )}

                {rec.historical_evidence && (
                  <div className="bg-white p-2.5 rounded border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800">
                      Evidência Histórica MES (Amostra de {rec.historical_evidence.sample_size}{' '}
                      trocas):
                    </div>
                    <div>
                      Tempo Padrão Ficha Mestre:{' '}
                      <strong className="font-semibold text-slate-700">
                        {rec.historical_evidence.standard_minutes} min
                      </strong>
                    </div>
                    <div>
                      Mediana Real Executada:{' '}
                      <strong className="font-semibold text-rose-600">
                        {rec.historical_evidence.realized_median_minutes} min
                      </strong>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    size="sm"
                    className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs"
                    onClick={() => onApplyRecommendation(rec)}
                  >
                    {rec.type === 'STANDARD_TIME_REVISION'
                      ? 'Recomendar Revisão na Ficha Mestre'
                      : 'Aplicar Otimização na Programação'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

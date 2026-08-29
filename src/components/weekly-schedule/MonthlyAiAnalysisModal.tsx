import React from 'react'
import { MonthlyAiAnalysisReport } from '@/types/monthly-schedule'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Boxes,
  Zap,
  Clock,
  Briefcase,
  CheckCircle2,
  X,
  Calendar,
} from 'lucide-react'

interface MonthlyAiAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  report: MonthlyAiAnalysisReport | null
  lineCode?: string
}

export const MonthlyAiAnalysisModal: React.FC<MonthlyAiAnalysisModalProps> = ({
  isOpen,
  onClose,
  report,
  lineCode = 'L1',
}) => {
  if (!report) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar font-sans p-5">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  ANÁLISE DE IA DA PROGRAMAÇÃO MENSAL — AGOSTO/2026
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold">
                    Linha {lineCode}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Avaliação integral de ocupação, setups, gargalos, suprimento de matéria-prima e
                  ordens MTO.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Parecer Executivo Geral */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3 text-indigo-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Síntese Executiva do Motor de IA
            </div>
            <p className="text-xs leading-relaxed text-indigo-900/90">{report.overviewVerdict}</p>
          </div>

          {/* 1. Principais Riscos & Gargalos */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              1. Principais Riscos & Gargalos Operacionais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {report.mainRisks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex flex-col justify-between space-y-1.5 ${
                    risk.severity === 'CRITICA'
                      ? 'bg-rose-50/60 border-rose-200'
                      : risk.severity === 'ALTA'
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-900">{risk.title}</span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1 rounded ${
                          risk.severity === 'CRITICA'
                            ? 'bg-rose-200 text-rose-800'
                            : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                      {risk.description}
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60 text-[10.5px] text-slate-700">
                    <strong className="text-slate-900">Recomendação:</strong> {risk.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Oportunidades de Sequenciamento & Agrupamento */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              2. Oportunidades de Otimização de Sequência
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {report.sequencingOpportunities.map((opp, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-950">{opp.title}</span>
                    <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      +{opp.gainHours}h disp. / +{opp.gainTons}t
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{opp.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Semanas Críticas & Matéria-Prima com Maior Risco */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Semanas Críticas */}
            <div className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-white">
              <h4 className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Semanas Críticas do Mês
              </h4>
              <div className="space-y-1.5">
                {report.criticalWeeks.map((cw, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-slate-50 border border-slate-100 space-y-0.5"
                  >
                    <div className="font-bold text-slate-900 text-[11px]">{cw.weekLabel}</div>
                    <div className="text-[10.5px] text-slate-600">{cw.riskReason}</div>
                    <div className="text-[10px] text-indigo-700 font-medium">
                      Ação: {cw.suggestedAction}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MP com Maior Risco */}
            <div className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-white">
              <h4 className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-rose-600" />
                Matéria-Prima com Maior Risco
              </h4>
              <div className="space-y-1.5">
                {report.rawMaterialRisks.map((rmr, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-rose-50/40 border border-rose-100 space-y-0.5"
                  >
                    <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                      <span>{rmr.material}</span>
                      <span className="text-rose-700 font-mono">
                        1ª Ruptura: {rmr.firstRuptureDate}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-600">
                      Déficit: {rmr.deficitTons} t • {rmr.consequence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Capacidade Ociosa Aproveitável & Ordens MTO em Risco */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Capacidade Ociosa */}
            <div className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-white">
              <h4 className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Capacidade Ociosa Aproveitável
              </h4>
              <div className="space-y-1.5">
                {report.usableIdleCapacity.map((uic, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-slate-50 border border-slate-100 space-y-0.5"
                  >
                    <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                      <span>{uic.lineOrWeek}</span>
                      <span className="text-emerald-700 font-mono font-bold">
                        +{uic.idleHours} h livres
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-600">
                      Recomendação: {uic.recommendedMaterial}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ordens MTO em Risco */}
            <div className="border border-slate-200 rounded-lg p-2.5 space-y-2 bg-white">
              <h4 className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                Ordens MTO em Risco de Atraso
              </h4>
              <div className="space-y-1.5">
                {report.mtoOrdersAtRisk.map((mto, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-amber-50/40 border border-amber-100 space-y-0.5"
                  >
                    <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                      <span>
                        Pedido {mto.orderNumber} — {mto.customer}
                      </span>
                      <span className="font-mono text-indigo-700">
                        {mto.tons} t ({mto.promisedDate})
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-600">
                      {mto.material} — {mto.impactReason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 italic">
            * A Inteligência Artificial sugere cenários determinísticos e nunca altera a programação
            automaticamente.
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs font-bold bg-[#004C97] hover:bg-[#003d7a] text-white"
          >
            Entendido / Fechar Análise
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default MonthlyAiAnalysisModal

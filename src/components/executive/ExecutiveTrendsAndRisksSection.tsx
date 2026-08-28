import React from 'react'
import {
  TrendAnalysisItem,
  RiskPredictionItem,
  CrossModuleCorrelation,
} from '@/types/executive-cockpit'
import {
  TrendingUp,
  AlertTriangle,
  GitMerge,
  ShieldCheck,
  ArrowRight,
  Clock,
  Info,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ExecutiveTrendsAndRisksSectionProps {
  trends: TrendAnalysisItem[]
  risks: RiskPredictionItem[]
  correlations: CrossModuleCorrelation[]
}

export const ExecutiveTrendsAndRisksSection: React.FC<ExecutiveTrendsAndRisksSectionProps> = ({
  trends,
  risks,
  correlations,
}) => {
  return (
    <div className="space-y-4">
      {/* Bloco 4: Análise de Tendência Detalhada com Alerta de Correlação */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#004C97]" />
              Análise de Tendência & Inflexão Trajetorial
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Resposta determinística sobre fechamento provável, alcance de meta e variáveis
              coincidentes.
            </p>
          </div>
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
            Correlação ≠ Causalidade
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trends.slice(0, 2).map((trend, idx) => (
              <div
                key={idx}
                className="bg-slate-50/90 border border-slate-200 rounded-lg p-3 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-xs">
                    {trend.indicatorName}
                  </span>
                  <Badge
                    className={`text-[9px] font-bold ${
                      trend.willReachTarget
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {trend.willReachTarget ? 'Meta Provável' : 'Risco de Gap'}
                  </Badge>
                </div>

                <p className="text-slate-700 leading-snug">{trend.trendDescription}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded border border-slate-200">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Situação Atual
                    </span>
                    <span className="font-semibold text-slate-800">{trend.currentState}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Fechamento Provável
                    </span>
                    <span className="font-bold text-[#004C97]">{trend.probableClosing}</span>
                  </div>
                </div>

                <div className="text-[10px] space-y-1 pt-1 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold block">
                    Variáveis Coincidentes no Período:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {trend.coincidingVariables.map((v, i) => (
                      <span
                        key={i}
                        className="bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded text-[9px]"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 text-amber-900 text-[10px] p-2 rounded border border-amber-200 flex items-center gap-1.5 font-medium">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Correlação identificada — causalidade ainda não comprovada.</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grid: Bloco 5 (Previsões e Riscos) + Bloco 6 (Correlação entre Módulos) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 5 — Previsões e Riscos Preditivos */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Previsões de Risco & Confiança do Modelo
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Risco de ruptura, sobreestoque, gargalo e capacidade com probabilidade e horizonte.
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-2 space-y-2.5">
            {risks.map((r) => (
              <div
                key={r.id}
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  r.severity === 'CRITICAL'
                    ? 'bg-rose-50/70 border-rose-200'
                    : r.severity === 'HIGH'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-blue-50/50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900">{r.title}</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] bg-white text-slate-800 shrink-0 font-mono"
                  >
                    Horizonte: {r.horizonDays}d
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-700">{r.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[10px]">
                  <span className="text-slate-600 font-medium">
                    Alvo: <strong className="text-slate-900">{r.affectedLineOrProduct}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">
                      Probabilidade: <strong className="text-rose-700">{r.probabilityPct}%</strong>
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-bold text-emerald-700">
                      Confiança: {r.confidencePct}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bloco 6 — Correlação Transversal entre Módulos */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-[#004C97]" />
              Correlação Transversal PCP (Cadeia de Impacto)
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Análise transversal dos dados PCP (Carteira → Ocupação → Paradas → Buffer → OTIF).
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-2 space-y-3">
            {correlations.map((corr) => (
              <div
                key={corr.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs"
              >
                <span className="font-extrabold text-[#004C97] text-[11px] block leading-snug">
                  {corr.chainTitle}
                </span>

                <p className="text-[11px] text-slate-700 leading-relaxed">{corr.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200 text-[10px]">
                  <span className="font-mono text-slate-600 font-semibold">
                    Coeficiente de Correlação (r):{' '}
                    <strong className="text-[#004C97]">{corr.correlationCoefficient}</strong>
                  </span>
                  <span className="text-amber-800 font-medium">{corr.warningNote}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ExecutiveTrendsAndRisksSection

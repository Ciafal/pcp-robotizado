import React from 'react'
import { Sparkles, FileText, CheckCircle2, TrendingUp, AlertCircle, HelpCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ExecutiveSummaryAiCardProps {
  summary: {
    currentSituation: string
    evidences: string[]
    trend: string
    impact: string
    recommendation: string
  }
  sourcesUsed: Array<{
    system: string
    module: string
    tableOrOrigin: string
    period: string
    updatedAt: string
    status: string
  }>
  confidenceLevel?: string
}

export const ExecutiveSummaryAiCard: React.FC<ExecutiveSummaryAiCardProps> = ({
  summary,
  sourcesUsed,
  confidenceLevel = 'ALTA (94%)',
}) => {
  return (
    <Card className="bg-white border-blue-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50/80 via-white to-slate-50 border-b border-blue-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] text-white rounded-md shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                Resumo Executivo CIAFAL
                <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-bold">
                  Agente Nativo Skip Cloud
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                Síntese transversal gerada por IA com base estrita nos dados autorizados do PCP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50"
            >
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Confiança:{' '}
              {confidenceLevel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5 text-xs">
        {/* Seção 1: Situação Atual */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" /> 1. Situação Atual
          </span>
          <p className="text-slate-800 leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
            {summary.currentSituation}
          </p>
        </div>

        {/* Seção 2: Evidências Extraídas */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 2. Evidências dos Dados
          </span>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {summary.evidences.map((ev, idx) => (
              <li
                key={idx}
                className="bg-white border border-slate-200 p-2 rounded text-[11px] text-slate-700 flex items-start gap-2 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#004C97] mt-1.5 shrink-0" />
                <span>{ev}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Grid: 3. Tendência & 4. Impacto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-amber-50/50 border border-amber-200/80 rounded-lg p-2.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-600" /> 3. Tendência Preditiva
            </span>
            <p className="text-[11px] text-slate-800 leading-snug">{summary.trend}</p>
          </div>

          <div className="bg-rose-50/50 border border-rose-200/80 rounded-lg p-2.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-600" /> 4. Impacto Operacional
            </span>
            <p className="text-[11px] text-slate-800 leading-snug">{summary.impact}</p>
          </div>
        </div>

        {/* Seção 5: Recomendação da IA */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#004C97]" /> 5. Recomendação Estratégica
          </span>
          <p className="text-[11px] font-medium text-slate-900 leading-relaxed">
            {summary.recommendation}
          </p>
        </div>

        {/* Rodapé de Rastreabilidade e Fontes Utilizadas */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-600">Fontes Utilizadas:</span>
            {sourcesUsed.map((s, idx) => (
              <span
                key={idx}
                className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
              >
                {s.module} ({s.tableOrOrigin})
              </span>
            ))}
          </div>
          <span className="font-mono text-[9px] text-slate-400">
            Atualizado em: {new Date().toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ExecutiveSummaryAiCard

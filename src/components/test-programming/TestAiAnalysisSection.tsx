import React from 'react'
import {
  Sparkles,
  ShieldAlert,
  HelpCircle,
  TrendingDown,
  Layers,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TestAiAnalysisResult } from '@/types/test-programming'

interface TestAiAnalysisSectionProps {
  analysis: TestAiAnalysisResult
  onRefresh?: () => void
  isRefreshing?: boolean
}

export const TestAiAnalysisSection: React.FC<TestAiAnalysisSectionProps> = ({
  analysis,
  onRefresh,
  isRefreshing = false,
}) => {
  return (
    <Card className="bg-white border-blue-200/90 shadow-sm overflow-hidden">
      <CardHeader className="p-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border-b border-blue-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#004C97] text-white rounded-md shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Análise IA — Testes Industriais
              <Badge
                variant="outline"
                className="text-[10px] border-blue-300 bg-blue-50 text-[#004C97] font-semibold"
              >
                Padrão Ação IA • 7 Dimensões SGQ/PCP
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Correlação de programação, telemetria MES 4.0, ocorrências e histórico operacional.
            </p>
          </div>
        </div>

        {onRefresh && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-xs h-7 gap-1 text-[#004C97] hover:bg-blue-100/50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar Análise</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-3.5 text-xs text-slate-800">
        {/* Aviso de Governança: IA só analisa, nunca executa */}
        <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              <strong>Governança Corporativa:</strong> A IA correlaciona premissas operacionais e
              gera orientações consultivas; nunca executa apontamentos, paradas ou alterações no
              SAP.
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {new Date(analysis.generated_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* SEÇÃO 1: PRINCIPAIS DESVIOS */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              1. Principais Desvios
            </div>
            <ul className="space-y-1 pl-3.5 list-disc text-slate-700 text-[11px]">
              {analysis.principais_desvios.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* SEÇÃO 2: EVIDÊNCIAS */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              2. Evidências
            </div>
            <ul className="space-y-1 pl-3.5 list-disc text-slate-700 text-[11px]">
              {analysis.evidencias.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* SEÇÃO 3: POSSÍVEIS CAUSAS (HIPÓTESES) */}
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              3. Possíveis Causas (Hipóteses Técnicas)
            </div>
            <span className="text-[10px] text-amber-800 italic">
              * Hipótese técnica investigativa — sem invenção de dados.
            </span>
          </div>
          <ul className="space-y-1 pl-3.5 list-disc text-amber-950 text-[11px]">
            {analysis.possiveis_causas.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* SEÇÃO 4: IMPACTO PRODUTIVO */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              4. Impacto Produtivo
            </div>
            <ul className="space-y-1 pl-3.5 list-disc text-slate-700 text-[11px]">
              {analysis.impacto_produtivo.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* SEÇÃO 5: RECORRÊNCIA */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              5. Recorrência
            </div>
            <ul className="space-y-1 pl-3.5 list-disc text-slate-700 text-[11px]">
              {analysis.recorrencia.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* SEÇÃO 6: APRENDIZADOS */}
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              6. Aprendizados
            </div>
            <ul className="space-y-1 pl-3.5 list-disc text-emerald-950 text-[11px]">
              {analysis.aprendizados.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* SEÇÃO 7: AÇÕES SUGERIDAS */}
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wide">
              <ArrowRight className="w-3.5 h-3.5 text-blue-700" />
              7. Ações Sugeridas
            </div>
            <ul className="space-y-1 pl-3.5 list-disc text-blue-950 text-[11px]">
              {analysis.acoes_sugeridas.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

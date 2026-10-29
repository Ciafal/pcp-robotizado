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
import { TestAiAnalysisResult, TestProgrammingRecord } from '@/types/test-programming'
import { testProgrammingService } from '@/services/test-programming-service'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

interface TestAiAnalysisSectionProps {
  analysis: TestAiAnalysisResult
  testRecord?: TestProgrammingRecord
  onRefresh?: () => void
  isRefreshing?: boolean
}

export const TestAiAnalysisSection: React.FC<TestAiAnalysisSectionProps> = ({
  analysis,
  testRecord,
  onRefresh,
  isRefreshing = false,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [decisionState, setDecisionState] = React.useState<'CONFIRMADA' | 'DESCARTADA' | null>(
    testRecord?.ai_revision_decision || null,
  )
  const [isDeciding, setIsDeciding] = React.useState(false)

  React.useEffect(() => {
    setDecisionState(testRecord?.ai_revision_decision || null)
  }, [testRecord?.ai_revision_decision])

  const suggestion = analysis.ai_revision_suggestion

  const handleDecision = async (decision: 'CONFIRMADA' | 'DESCARTADA') => {
    if (!testRecord) {
      toast({
        title: 'Decisão registrada localmente',
        description: `Sugestão ${decision === 'CONFIRMADA' ? 'confirmada' : 'descartada'} pelo usuário.`,
      })
      setDecisionState(decision)
      return
    }

    setIsDeciding(true)
    try {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const updates: Partial<TestProgrammingRecord> = {
        ai_revision_decision: decision,
      }

      if (decision === 'CONFIRMADA') {
        updates.needs_revision = true
        updates.revision_status = testRecord.revision_status || 'Pendente'
        if (!testRecord.revision_reason) {
          updates.revision_reason = suggestion?.justification || 'Confirmada a partir da recomendação da IA'
        }
        if (!testRecord.revision_types && suggestion?.suggestedRevisionTypes) {
          updates.revision_types = suggestion.suggestedRevisionTypes.join(' e ') as any
        }
      }

      await testProgrammingService.update(
        testRecord.id,
        updates,
        { id: user?.id, name: user?.name || 'Programador PCP', role: user?.role },
        `Decisão de Governança IA: sugestão de revisão ${decision} por ${user?.name || 'usuário'}`,
        'Análise IA',
      )

      setDecisionState(decision)
      toast({
        title: decision === 'CONFIRMADA' ? 'Necessidade de revisão confirmada' : 'Sugestão da IA descartada',
        description: `Decisão de auditoria gravada: ${decision}.`,
      })
      onRefresh?.()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar decisão',
        description: err?.message || 'Falha ao registrar auditoria.',
        variant: 'destructive',
      })
    } finally {
      setIsDeciding(false)
    }
  }
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

        {/* BLOCO DE CONCLUSÃO E GOVERNANÇA (REQUISITO 5) */}
        <div
          data-testid="ai-governance-closure-block"
          className="p-3.5 rounded-lg border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-white space-y-2.5 shadow-2xs"
        >
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-700" />
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                Conclusão e Governança — Recomendação IA
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                className={`text-[10px] font-bold ${
                  decisionState === 'CONFIRMADA'
                    ? 'bg-emerald-600 text-white'
                    : decisionState === 'DESCARTADA'
                      ? 'bg-slate-600 text-white'
                      : 'bg-amber-600 text-white'
                }`}
              >
                Decisão: {decisionState || 'Aguardando deliberação humana'}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-slate-700 shrink-0">Sugestão da IA:</span>
              <span
                className={`font-semibold ${
                  suggestion?.recommended ? 'text-amber-800' : 'text-slate-700'
                }`}
              >
                {suggestion?.recommended ? '⚠ Revisão recomendada' : 'Revisão não mandatória'}
              </span>
              {suggestion?.suggestedRevisionTypes && (
                <Badge variant="outline" className="text-[10px] bg-white font-medium">
                  {suggestion.suggestedRevisionTypes.join(' e ')}
                </Badge>
              )}
            </div>

            <p className="text-[11px] text-slate-700 leading-relaxed bg-white/80 p-2.5 rounded border border-indigo-100">
              <strong>Justificativa Técnica:</strong>{' '}
              {suggestion?.justification ||
                'Com base nos parâmetros industriais e desvios apurados, a IA orienta a deliberação dos responsáveis técnicos.'}
            </p>

            <div className="p-2 bg-amber-50/80 border border-amber-200 rounded text-[11px] text-amber-900 flex items-center justify-between">
              <span>
                <strong>Regra de Governança:</strong> A IA NUNCA marca revisão automaticamente.
                Qualquer necessidade deve ser deliberada e confirmada pelo usuário com registro de auditoria.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-indigo-100">
            <Button
              data-testid="ai-discard-suggestion-btn"
              type="button"
              size="sm"
              variant="outline"
              disabled={isDeciding}
              onClick={() => handleDecision('DESCARTADA')}
              className={`text-xs h-7.5 px-3 border-slate-300 ${
                decisionState === 'DESCARTADA' ? 'bg-slate-200 text-slate-800 font-bold' : ''
              }`}
            >
              Descartar sugestão
            </Button>

            <Button
              data-testid="ai-confirm-revision-btn"
              type="button"
              size="sm"
              disabled={isDeciding}
              onClick={() => handleDecision('CONFIRMADA')}
              className={`text-xs h-7.5 px-3 gap-1.5 ${
                decisionState === 'CONFIRMADA'
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white font-bold'
                  : 'bg-[#004C97] hover:bg-[#003974] text-white font-bold'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmar necessidade de revisão</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

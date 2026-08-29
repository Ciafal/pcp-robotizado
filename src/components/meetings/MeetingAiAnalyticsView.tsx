import React, { useState } from 'react'
import {
  Sparkles,
  BarChart2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export const MeetingAiAnalyticsView: React.FC = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState<any>(null)

  const handleRunAnalysis = async () => {
    setLoading(true)
    try {
      const res = await pb.send<any>('/backend/v1/meetings/ai-analysis', {
        method: 'POST',
      })
      if (res.analysis) {
        setAnalysisData(res.analysis)
        toast({
          title: 'Análise de Reuniões Concluída',
          description:
            'Fatos consolidados, hipóteses e recomendações preditivas geradas pelo agente nativo Skip Cloud.',
        })
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na análise com IA',
        description: e.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#004C97]" />
            IA &bull; Análise Contínua de Reuniões PCP
          </h2>
          <p className="text-xs text-slate-500">
            Identificação de padrões reincidentes, desvios recorrentes e recomendações para
            otimização do sequenciamento.
          </p>
        </div>

        <Button
          onClick={handleRunAnalysis}
          disabled={loading}
          className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 px-4 gap-1.5 font-bold shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
          {loading ? 'Analisando Histórico...' : 'Analisar Reuniões com IA'}
        </Button>
      </div>

      {!analysisData ? (
        <Card className="bg-white border-slate-200 p-12 text-center space-y-3">
          <Sparkles className="w-12 h-12 text-blue-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Pronto para rodar o motor analítico</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Clique no botão acima para processar todas as atas e pendências registradas. A IA separa
            rigorosamente FATO, HIPÓTESE DA IA e RECOMENDAÇÃO.
          </p>
          <Button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="bg-[#004C97] text-white text-xs h-8"
          >
            Executar Análise Agora
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: FATOS COMPROVADOS (Dados do Banco) */}
          <Card className="bg-white border-blue-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-blue-100">
              <CardTitle className="text-xs font-bold text-[#004C97] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> 1. Fatos Comprovados (Base de Dados)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              {analysisData.facts?.map((f: string, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 bg-blue-50/50 rounded-md border border-blue-100 text-slate-800 leading-relaxed"
                >
                  &bull; {f}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Coluna 2: HIPÓTESES DA IA (Correlações & Tendências) */}
          <Card className="bg-white border-amber-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-amber-100">
              <CardTitle className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> 2. Hipóteses da IA (Correlações)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <p className="text-[10px] text-amber-900 font-medium italic">
                * Correlações identificadas para análise da engenharia de processos (não tratadas
                como causa comprovada).
              </p>
              {analysisData.ai_hypotheses?.map((h: string, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 bg-amber-50/60 rounded-md border border-amber-200 text-amber-950 leading-relaxed"
                >
                  &bull; {h}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Coluna 3: RECOMENDAÇÕES EXECUTIVAS */}
          <Card className="bg-white border-emerald-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-emerald-100">
              <CardTitle className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 3. Recomendações Prioritárias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              {analysisData.recommendations?.map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-emerald-50/60 rounded-md border border-emerald-200 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-emerald-950 font-bold">{rec.focus}</strong>
                    <Badge className="bg-emerald-600 text-white text-[9px] font-mono">
                      Confiança {rec.confidence}
                    </Badge>
                  </div>
                  <p className="text-slate-800 text-[11px] leading-relaxed">{rec.action}</p>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    Resp. Sugerido: {rec.responsible_suggested}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
export default MeetingAiAnalyticsView

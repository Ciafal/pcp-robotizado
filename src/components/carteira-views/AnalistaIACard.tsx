import React from 'react'
import { Sparkles, ChevronRight, ShieldCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CarteiraIAInsight } from '@/types/carteira-analise'

interface AnalistaIACardProps {
  insights: CarteiraIAInsight[]
  onFiltrarMaterial?: (materialCode: string) => void
}

export const AnalistaIACard: React.FC<AnalistaIACardProps> = ({ insights, onFiltrarMaterial }) => {
  if (insights.length === 0) return null

  const getCriticidadeBadge = (crit: string) => {
    switch (crit) {
      case 'CRITICA':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
            Crítica
          </Badge>
        )
      case 'ALTA':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
            Alta Relevância
          </Badge>
        )
      case 'MEDIA':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-bold">
            Atenção
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]">
            Informativo
          </Badge>
        )
    }
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50/70 via-white to-slate-50 border-blue-200 shadow-sm overflow-hidden">
      <CardHeader className="p-3.5 pb-2 border-b border-blue-100 bg-blue-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] text-white rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                Agente Analista de Carteira CIAFAL (IA)
                <Badge className="bg-[#004C97] text-white text-[9px] font-bold">
                  Modo Consultivo
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                Detecção contínua de gargalos, duplicidades de atendimento, risco de ruptura e
                anomalias de carteira.
              </p>
            </div>
          </div>

          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
            {insights.length} diagnósticos ativos
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((ins) => (
            <div
              key={ins.insight_code}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  {getCriticidadeBadge(ins.criticidade)}
                  <span className="text-[10px] font-mono text-slate-400">
                    Confiança: {ins.nivel_confianca_pct}%
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 leading-tight">{ins.titulo}</h4>

                <p className="text-[11px] text-slate-600 leading-relaxed">{ins.evidencia}</p>

                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-[10px]">
                  <div>
                    <strong className="text-slate-700">Causa Provável:</strong>{' '}
                    <span className="text-slate-600">{ins.causa_provavel}</span>
                  </div>
                  <div>
                    <strong className="text-[#004C97]">Ação Recomendada:</strong>{' '}
                    <span className="text-slate-800 font-medium">{ins.acao_sugerida}</span>
                  </div>
                </div>
              </div>

              {ins.materiais_afetados && ins.materiais_afetados.length > 0 && onFiltrarMaterial && (
                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Materiais:{' '}
                    <strong className="text-slate-800">
                      {ins.materiais_afetados.slice(0, 2).join(', ')}
                    </strong>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onFiltrarMaterial(ins.materiais_afetados![0])}
                    className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold"
                  >
                    Filtrar Item <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-2 bg-slate-100/70 rounded-lg border border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            A IA atua exclusivamente como ferramenta de apoio à decisão do PCP, sem alterações
            autônomas na carteira ou programação.
          </span>
          <span className="font-mono text-slate-400 text-[9px]">Motor IA v2.6-ZSD28C</span>
        </div>
      </CardContent>
    </Card>
  )
}
export default AnalistaIACard

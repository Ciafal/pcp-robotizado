import React, { useState } from 'react'
import { AiMapInsight } from '@/types/tms-mapa-logistico'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BrainCircuit, Info, ArrowRight, ExternalLink } from 'lucide-react'

interface TmsAiInsightsPanelProps {
  insights: AiMapInsight[]
  onActionClick?: (insight: AiMapInsight) => void
}

export const TmsAiInsightsPanel: React.FC<TmsAiInsightsPanelProps> = ({
  insights,
  onActionClick,
}) => {
  const [selectedTraceInsight, setSelectedTraceInsight] = useState<AiMapInsight | null>(null)

  return (
    <>
      <Card className="border shadow-xs bg-gradient-to-r from-blue-50/40 via-white to-indigo-50/30">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
              <BrainCircuit className="w-4 h-4 text-blue-600" />
              <span>Análise da IA — Torre Geográfica de Cargas</span>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-blue-100/60 text-blue-800">
              {insights.length} insights operacionais
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between space-y-2 hover:border-blue-300 transition-colors"
              >
                <div>
                  <div className="font-semibold text-xs text-slate-900 mb-1">{ins.title}</div>
                  <p className="text-xs text-slate-600 leading-snug">{ins.description}</p>
                  <div className="text-[11px] font-medium text-emerald-700 mt-1">
                    Impacto: {ins.impact}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedTraceInsight(ins)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium underline-offset-2 hover:underline cursor-pointer"
                  >
                    <Info className="w-3 h-3" />
                    <span>Ver dados de origem</span>
                  </button>

                  {ins.action_label && onActionClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onActionClick(ins)}
                      className="h-6 text-[11px] px-2 text-slate-700 hover:text-blue-700 font-medium"
                    >
                      <span>{ins.action_label}</span>
                      <ArrowRight className="w-2.5 h-2.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Rastreabilidade e Auditoria da IA */}
      <Dialog
        open={Boolean(selectedTraceInsight)}
        onOpenChange={(open) => !open && setSelectedTraceInsight(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Rastreabilidade da Análise IA</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Transparência operacional: base de dados cadastrada e parâmetros que originaram este
              cálculo.
            </DialogDescription>
          </DialogHeader>

          {selectedTraceInsight && (
            <div className="space-y-3 text-xs py-2">
              <div className="p-2.5 bg-slate-50 rounded border">
                <div className="font-semibold text-slate-800 mb-0.5">
                  {selectedTraceInsight.title}
                </div>
                <div className="text-slate-600">{selectedTraceInsight.description}</div>
              </div>

              <div>
                <div className="font-semibold text-slate-700 mb-1.5">
                  Parâmetros e Variáveis Extraídas da Carteira SAP:
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded text-[11px] font-mono overflow-x-auto max-h-[200px]">
                  {JSON.stringify(selectedTraceInsight.traceability_data, null, 2)}
                </pre>
              </div>

              <div className="text-[11px] text-slate-400 italic">
                * Conclusão auditável conforme política de governança do HUB CIAFAL. Nenhuma
                inferência fictícia é permitida.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

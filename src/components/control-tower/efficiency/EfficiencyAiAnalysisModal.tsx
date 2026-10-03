import React from 'react'
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ListFilter,
  Search,
  CheckCheck,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ConsolidatedAiAnalysis } from '@/services/efficiency-drilldown-ai-service'

export interface EfficiencyAiAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  analysis: ConsolidatedAiAnalysis | null
  contextTitle: string
  contextCode: string
  breadcrumb: string[]
}

export const EfficiencyAiAnalysisModal: React.FC<EfficiencyAiAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysis,
  contextTitle,
  contextCode,
  breadcrumb,
}) => {
  if (!isOpen || !analysis) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl w-[92vw] max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Análise de Eficiência com IA
              </DialogTitle>
              <p className="text-xs text-slate-500 font-sans">
                {breadcrumb.join(' / ') || contextCode} &bull; {analysis.totalAnalisadas} Ordens
                analisadas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo com scroll interno */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* 1. Resumo Gerencial (2-4 frases) */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#004C97] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Resumo Executivo
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    analysis.requeremAtencaoCount > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-300 font-mono text-[10px]'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 font-mono text-[10px]'
                  }
                >
                  {analysis.requeremAtencaoCount > 0
                    ? `${analysis.requeremAtencaoCount} requerem atenção`
                    : '100% em conformidade'}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-slate-800 leading-relaxed font-medium">{analysis.resumo}</p>
          </div>

          {/* 2. Principais Desvios (só os reais) */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Principais Desvios Identificados
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.principaisDesvios.map((desvio, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-start gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span className="text-slate-800 text-xs leading-snug">{desvio}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Ordens que Requerem Atenção (só com anomalias reais) */}
          {analysis.ordensRequeremAtencao.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-rose-600" />
                Ordens que Requerem Atenção ({analysis.ordensRequeremAtencao.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {analysis.ordensRequeremAtencao.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        OP {item.opNumber}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono text-slate-600">
                        {item.materialCode}
                      </Badge>
                    </div>
                    <span className="text-slate-700 text-xs sm:text-right font-medium">
                      {item.descricaoDesvio}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Pontos Positivos (ordens aderentes / sem desvios) */}
          {analysis.pontosPositivos.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pontos Positivos &bull; Ordens em Conformidade
              </h4>
              <div className="border border-emerald-100 bg-emerald-50/30 rounded-xl p-3 space-y-1.5">
                {analysis.pontosPositivos.map((positivo, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-emerald-950 text-xs">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span className="leading-snug">{positivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Próximas Verificações e Recomendações */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ListFilter className="w-3.5 h-3.5 text-blue-600" />
              Próximas Verificações Operacionais
            </h4>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              {analysis.proximasVerificacoes.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-700 text-xs">
                  <span className="font-bold text-[#004C97] font-mono text-[11px] shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="leading-snug">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé Oficial (Regra 8: NÃO mostrar append-only pcp_audit_logs aqui) */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Análise registrada automaticamente para rastreabilidade.</span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 bg-slate-800 hover:bg-slate-900 text-white font-semibold"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

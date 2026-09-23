import React from 'react'
import { Sparkles, Info, Lightbulb, AlertTriangle, FileText, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SapCogiPendency, SapCo1pPendency } from '@/types/sap-pendencies'

interface SapPendenciesAiPanelProps {
  selectedRecord?: SapCogiPendency | SapCo1pPendency | null
  totalCount: number
  criticalCount: number
  topCategory: string
  topCentro: string
  recurrentCount: number
  onOpenSgqModal?: () => void
}

export const SapPendenciesAiPanel: React.FC<SapPendenciesAiPanelProps> = ({
  selectedRecord,
  totalCount,
  criticalCount,
  topCategory,
  topCentro,
  recurrentCount,
  onOpenSgqModal,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-xl p-4 shadow-md border border-blue-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-800/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300 ring-1 ring-blue-400/30">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Análise Inteligente das Pendências de Produção
              <Badge className="bg-blue-600/60 text-[9px] font-mono border-blue-400/40 text-blue-200">
                IA PCP CO-PILOT
              </Badge>
            </h3>
            <p className="text-[11px] text-blue-200/80">
              Diagnóstico preventivo, correlações sistêmicas e orientação documental SGQ (sem
              invenção de procedimentos).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSgqModal && (
            <button
              type="button"
              onClick={onOpenSgqModal}
              className="text-[11px] font-medium bg-blue-800/60 hover:bg-blue-700 text-blue-200 hover:text-white px-2.5 py-1 rounded border border-blue-600/40 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-blue-300" />
              Matriz de Procedimentos SGQ
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Bloco 1: O que está acontecendo? */}
        <div className="bg-slate-800/60 backdrop-blur rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-blue-300 text-[11px] uppercase tracking-wide mb-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              1. O que está acontecendo?
            </div>
            <p className="text-slate-200 leading-relaxed text-[11px]">
              O volume acumulado é de <strong>{totalCount} pendências</strong>. O principal
              agrupamento concentra-se em{' '}
              <span className="text-amber-300 font-semibold">{topCategory}</span>, impactando o
              fluxo de baixa de materiais e apontamento posterior.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 font-mono">
            Origem: Fato sistêmico apurado
          </div>
        </div>

        {/* Bloco 2: Onde está concentrado? */}
        <div className="bg-slate-800/60 backdrop-blur rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-[11px] uppercase tracking-wide mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
              2. Onde está concentrado?
            </div>
            <p className="text-slate-200 leading-relaxed text-[11px]">
              Maior concentração observada no <strong>Centro {topCentro}</strong>. Foram detectadas{' '}
              <span className="text-amber-300 font-semibold">
                {recurrentCount} ocorrências reincidentes
              </span>{' '}
              com a mesma chave técnica de material/erro SAP.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 font-mono">
            Rastreio por Centro e Material
          </div>
        </div>

        {/* Bloco 3: O que é crítico agora? */}
        <div className="bg-slate-800/60 backdrop-blur rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-rose-300 text-[11px] uppercase tracking-wide mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              3. O que é crítico agora?
            </div>
            <p className="text-slate-200 leading-relaxed text-[11px]">
              {criticalCount > 0 ? (
                <>
                  Existem{' '}
                  <strong className="text-rose-300">{criticalCount} pendências críticas</strong>{' '}
                  bloqueando encerramento técnico (TECO) de ordens e fechamento contábil.
                </>
              ) : (
                'Nenhuma pendência com nível crítico neste momento. O fluxo operacional permanece desbloqueado.'
              )}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/40 text-[10px] text-rose-300/80 font-mono">
            Trava TECO e Fechamento
          </div>
        </div>

        {/* Bloco 4: Por que está acontecendo? (Fato x Hipótese) */}
        <div className="bg-slate-800/60 backdrop-blur rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px] uppercase tracking-wide mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              4. Por que está acontecendo?
            </div>
            {selectedRecord ? (
              <div className="space-y-1 text-[11px]">
                <div className="text-slate-300">
                  <span className="text-emerald-400 font-bold uppercase text-[9px] mr-1">
                    Fato:
                  </span>
                  {selectedRecord.sap_message}
                </div>
                {selectedRecord.ai_diagnosis_hypotheses &&
                  selectedRecord.ai_diagnosis_hypotheses.length > 0 && (
                    <div className="text-amber-200/90 text-[10px]">
                      <span className="text-amber-300 font-bold uppercase text-[9px] mr-1">
                        Hipótese IA:
                      </span>
                      {selectedRecord.ai_diagnosis_hypotheses[0]}
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Selecione uma pendência na tabela abaixo para visualizar o parecer analítico
                detalhado com estrita separação entre fatos comprovados e hipóteses da IA.
              </p>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-mono">Guia: Procedimento SGQ</span>
            {selectedRecord?.sgq_document_code && (
              <span className="text-blue-300 font-mono font-bold truncate max-w-[120px]">
                {selectedRecord.sgq_document_code}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

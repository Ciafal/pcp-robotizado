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
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-2xs">
      {/* Header Institucional CIAFAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-[#004C97] rounded border border-blue-200">
            <Sparkles className="w-4 h-4 text-[#004C97]" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
              Análise das Pendências
              <Badge className="bg-blue-100 text-[#004C97] text-[10px] font-mono border-blue-200 hover:bg-blue-100">
                IA PCP &bull; Apoio Operacional
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-500">
              Análise consultiva com separação estrita de Fatos, Hipóteses e Orientações baseadas no
              SGQ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSgqModal && (
            <button
              type="button"
              onClick={onOpenSgqModal}
              className="text-[11px] font-medium bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-[#004C97] px-2.5 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#004C97]" />
              Matriz de Procedimentos SGQ
            </button>
          )}
        </div>
      </div>

      {/* 4 Blocos Obrigatórios: Prioridade agora, Principal concentração, Reincidências, Orientação */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
        {/* Bloco 1: Prioridade agora */}
        <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wide mb-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              Prioridade agora
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              {criticalCount > 0 ? (
                <>
                  <strong className="text-rose-700 font-bold">
                    {criticalCount} ocorrências críticas
                  </strong>{' '}
                  requerem atenção imediata por impacto direto em encerramento técnico (TECO) e
                  programação vigente.
                </>
              ) : (
                'Nenhuma pendência crítica imediata detectada. O fluxo de ordens e apontamentos permanece estável.'
              )}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              FATO
            </span>
            <span>{totalCount} pendências ativas</span>
          </div>
        </div>

        {/* Bloco 2: Principal concentração */}
        <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wide mb-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              Principal concentração
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              Maior volume localizado no <strong>Centro {topCentro}</strong>, concentrado na
              categoria <strong className="text-slate-900">{topCategory}</strong>.
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              FATO
            </span>
            <span>
              Centro {topCentro} &bull; {topCategory}
            </span>
          </div>
        </div>

        {/* Bloco 3: Reincidências */}
        <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wide mb-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              Reincidências
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              {recurrentCount > 0 ? (
                <>
                  <strong className="text-amber-800 font-bold">
                    {recurrentCount} ocorrências reincidentes
                  </strong>{' '}
                  com a mesma chave técnica SAP, indicando padrão recorrente.
                </>
              ) : (
                'Sem recorrência repetida detectada nas chaves técnicas dos registros analisados.'
              )}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              HIPÓTESE IA
            </span>
            <span>Chave técnica repetida</span>
          </div>
        </div>

        {/* Bloco 4: Orientação (Ações suportadas pelo SGQ) */}
        <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wide mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              Orientação
            </div>
            {selectedRecord ? (
              <div className="space-y-1 text-[11px]">
                <div className="text-slate-700">
                  <span className="font-semibold text-slate-900">Documento:</span>{' '}
                  {selectedRecord.sgq_document_code ? (
                    <span className="font-mono text-[#004C97] font-semibold">
                      {selectedRecord.sgq_document_code}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Nenhum procedimento SGQ vinculado</span>
                  )}
                </div>
                <p className="text-slate-600 line-clamp-2">
                  {selectedRecord.ai_recommended_action?.verificar?.[0] ||
                    'Seguir instrução normativa formal.'}
                </p>
              </div>
            ) : (
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Selecione uma pendência na tabela para visualizar a orientação referenciada no
                procedimento SGQ oficial.
              </p>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ORIENTAÇÃO SGQ
            </span>
            <span className="truncate max-w-[120px]">
              {selectedRecord?.sgq_document_code || 'Norma Oficial'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

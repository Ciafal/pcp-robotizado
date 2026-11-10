/**
 * Modal de Análise de IA do Previsto x Realizado (Melhoria 3).
 *
 * Características Mandatórias:
 * 1. Janela ampla e responsiva com:
 *    - Resumo executivo
 *    - Análise por linha
 *    - Detalhamento expansível por Centro e OP
 *    - Observações (campo editável para o Programador PCP)
 * 2. Ações:
 *    - Reanalisar com IA (chama agente nativo ciafal-pxr-agent)
 *    - Salvar análise (persiste rascunho com auditoria)
 *    - Aprovar análise (valida formalmente tornando documento oficial com registro de responsável, data e hora)
 * 3. Contrato de Factualidade:
 *    - Nunca apresenta hipótese como fato confirmado.
 *    - Quando não houver evidência suficiente, declara 'Causa não identificada nos registros disponíveis'.
 *    - Apresenta possíveis causas separadamente como hipóteses para investigação.
 */

import React, { useState } from 'react'
import {
  Sparkles,
  Save,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileText,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatNumberPtBr } from '@/lib/number-format'
import type { HierarchyLineItem } from '@/services/efficiency-assertiveness-hierarchy-service'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import {
  requestPxrAiAnalysis,
  savePxrAnalysis,
  approvePxrAnalysis,
  type PxrAiStructuredAnalysis,
  type PxrSavedAnalysisRecord,
} from '@/services/assertiveness-pxr-ai-service'

interface PxrAiAnalysisModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hierarchy: HierarchyLineItem[]
  filters: UnifiedEfficiencyFilters
  summary: {
    totalProgramadoT: number
    totalRealizadoT: number
    percentualRealizadoGeral: number | null
    totalPerdaT: number
    totalOps: number
    opsNaoRealizadas: number
    opsParciais: number
    opsComAtraso: number
    carteiraTotalT: number | null
  }
  currentAnalysis: PxrAiStructuredAnalysis | null
  savedRecord: PxrSavedAnalysisRecord | null
  onAnalysisUpdated: (
    analysis: PxrAiStructuredAnalysis,
    savedRecord: PxrSavedAnalysisRecord | null,
  ) => void
}

export const PxrAiAnalysisModal: React.FC<PxrAiAnalysisModalProps> = ({
  open,
  onOpenChange,
  hierarchy,
  filters,
  summary,
  currentAnalysis,
  savedRecord,
  onAnalysisUpdated,
}) => {
  const { toast } = useToast()
  const [plannerNotes, setPlannerNotes] = useState(savedRecord?.planner_notes || '')
  const [approvalNotes, setApprovalNotes] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())
  const [analysisState, setAnalysisState] = useState<PxrAiStructuredAnalysis | null>(
    currentAnalysis,
  )
  const [recordState, setRecordState] = useState<PxrSavedAnalysisRecord | null>(savedRecord)

  // Sincroniza estado inicial se mudar prop
  React.useEffect(() => {
    if (open) {
      setAnalysisState(currentAnalysis)
      setRecordState(savedRecord)
      setPlannerNotes(savedRecord?.planner_notes || '')
    }
  }, [open, currentAnalysis, savedRecord])

  const toggleLine = (code: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  // Ação 1: Reanalisar com IA
  const handleReanalyze = async () => {
    setIsAnalyzing(true)
    try {
      const res = await requestPxrAiAnalysis({
        filters,
        hierarchy,
        summary,
      })
      if (res.success && res.analysis) {
        setAnalysisState(res.analysis)
        onAnalysisUpdated(res.analysis, recordState)
        toast({
          title: 'Análise de IA concluída',
          description: 'A síntese analítica factual foi gerada com base nos registros da tela.',
        })
      }
    } catch (err) {
      console.error('[PxR Modal] Falha ao reanalisar:', err)
      toast({
        title: 'Falha na análise',
        description: 'Não foi possível completar a análise de IA. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Ação 2: Salvar análise (Rascunho)
  const handleSave = async () => {
    if (!analysisState) {
      toast({
        title: 'Nenhuma análise gerada',
        description: 'Execute a análise de IA antes de salvar.',
        variant: 'destructive',
      })
      return
    }
    setIsSaving(true)
    try {
      const res = await savePxrAnalysis({
        analysis_code: recordState?.analysis_code,
        version_number: (recordState?.version_number || 0) + 1,
        status: recordState?.is_official ? 'APROVADA_OFICIAL' : 'RASCUNHO_IA',
        empresa_code: filters.companyCode,
        planta_code: filters.plantCode,
        linha_code: filters.lineCode,
        centro_code: filters.centerCode,
        period_initial: filters.startDate,
        period_final: filters.endDate,
        period_label: `${filters.startDate || ''} a ${filters.endDate || ''}`,
        filters_snapshot: filters as unknown as Record<string, unknown>,
        executive_summary: analysisState.executive_summary,
        planner_notes: plannerNotes,
        ai_findings: analysisState.identified_causes,
        investigation_hypotheses: analysisState.investigation_hypotheses,
        recommendations: analysisState.recommendations,
      })

      if (res.success) {
        const updatedRecord: PxrSavedAnalysisRecord = {
          id: res.id,
          analysis_code: res.analysis_code,
          version_number: (recordState?.version_number || 0) + 1,
          status: recordState?.is_official ? 'APROVADA_OFICIAL' : 'RASCUNHO_IA',
          executive_summary: analysisState.executive_summary,
          planner_notes: plannerNotes,
          is_official: recordState?.is_official || false,
        }
        setRecordState(updatedRecord)
        onAnalysisUpdated(analysisState, updatedRecord)
        toast({
          title: 'Análise salva',
          description: `Versão ${updatedRecord.version_number} salva com sucesso no banco de dados.`,
        })
      }
    } catch (err) {
      console.error('[PxR Modal] Falha ao salvar:', err)
      toast({
        title: 'Erro ao salvar análise',
        description: 'Não foi possível gravar a análise no momento.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Ação 3: Aprovar análise (Oficial)
  const handleApprove = async () => {
    let targetId = recordState?.id
    setIsApproving(true)
    try {
      // Se ainda não salvou, salva primeiro
      if (!targetId && analysisState) {
        const saveRes = await savePxrAnalysis({
          status: 'RASCUNHO_IA',
          empresa_code: filters.companyCode,
          planta_code: filters.plantCode,
          linha_code: filters.lineCode,
          centro_code: filters.centerCode,
          period_initial: filters.startDate,
          period_final: filters.endDate,
          executive_summary: analysisState.executive_summary,
          planner_notes: plannerNotes,
          ai_findings: analysisState.identified_causes,
          investigation_hypotheses: analysisState.investigation_hypotheses,
          recommendations: analysisState.recommendations,
        })
        targetId = saveRes.id
      }

      if (!targetId) {
        throw new Error('Identificador da análise não encontrado.')
      }

      const res = await approvePxrAnalysis({
        analysis_id: targetId,
        approval_notes: approvalNotes || 'Aprovado formalmente pelo Programador PCP.',
        planner_notes: plannerNotes,
      })

      if (res.success) {
        const approvedRec: PxrSavedAnalysisRecord = {
          id: res.id,
          analysis_code: res.analysis_code,
          version_number: recordState?.version_number || 1,
          status: 'APROVADA_OFICIAL',
          is_official: true,
          approved_by_user_name: res.approved_by_name,
          approved_at: res.approved_at,
          approval_notes: approvalNotes,
          planner_notes: plannerNotes,
          executive_summary: analysisState?.executive_summary,
        }
        setRecordState(approvedRec)
        if (analysisState) {
          onAnalysisUpdated(analysisState, approvedRec)
        }
        toast({
          title: 'Análise Aprovada como Relatório Oficial',
          description: `Rastreabilidade registrada: ${res.approved_by_name} em ${new Date(res.approved_at).toLocaleString('pt-BR')}.`,
        })
      }
    } catch (err) {
      console.error('[PxR Modal] Falha ao aprovar:', err)
      toast({
        title: 'Erro na aprovação',
        description: 'Não foi possível aprovar a análise. Verifique as permissões.',
        variant: 'destructive',
      })
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#004C97]/10 text-[#004C97] rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Análise Operacional de IA — Previsto x Realizado
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Agente Nativo CIAFAL &bull; Módulo Execução &bull; Regra de Ouro Factual
                  (Hipóteses separadas de fatos)
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {recordState?.is_official ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-xs py-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Oficial Aprovado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs py-1">
                  Rascunho IA (Pendente Aprovação)
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status de Aprovação Oficial (se houver) */}
          {recordState?.is_official && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>
                  <strong>Aprovado por:</strong>{' '}
                  {recordState.approved_by_user_name || 'Aprovador PCP'} &bull;{' '}
                  <strong>Data/Hora:</strong>{' '}
                  {recordState.approved_at
                    ? new Date(recordState.approved_at).toLocaleString('pt-BR')
                    : '—'}
                </span>
              </div>
              <span className="font-mono text-[11px] text-emerald-700">
                Código: {recordState.analysis_code}
              </span>
            </div>
          )}

          {/* 1. Resumo Executivo */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#004C97] uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4" /> 1. Resumo Executivo
            </h3>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed font-sans">
              {analysisState?.executive_summary ||
                'Nenhuma análise gerada ainda. Clique em "Reanalisar com IA" para processar os registros da tela.'}
            </div>
          </div>

          {/* 2. Causas Identificadas (Fatos Verificáveis) x Hipóteses de Investigação */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fatos Comprovados */}
            <div className="p-4 border border-emerald-200 bg-emerald-50/50 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Causas Identificadas nos Registros (Vínculo Verificável)
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                {(analysisState?.identified_causes || []).length === 0 ? (
                  <li className="text-slate-500 italic">
                    Nenhum desvio crítico com vínculo direto localizado.
                  </li>
                ) : (
                  analysisState?.identified_causes.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold text-slate-900">{c.evidencia}:</span>{' '}
                      {c.descricao}{' '}
                      {c.impactoTons ? (
                        <span className="text-emerald-700 font-bold">
                          ({formatNumberPtBr(c.impactoTons, 2)} t)
                        </span>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Hipóteses para Investigação */}
            <div className="p-4 border border-amber-200 bg-amber-50/50 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Hipóteses para Investigação (Sem Vínculo Conclusivo)
              </div>
              <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                {(analysisState?.investigation_hypotheses || []).length === 0 ? (
                  <li className="text-slate-500 italic">
                    Causa não identificada nos registros disponíveis.
                  </li>
                ) : (
                  analysisState?.investigation_hypotheses.map((h, i) => (
                    <li key={i}>
                      <span className="font-semibold text-amber-900">{h.hipotese}</span>
                      <ul className="list-circle pl-4 mt-1 space-y-1 text-slate-600">
                        {(h.acoesInvestigacao || []).map((a, j) => (
                          <li key={j}>{a}</li>
                        ))}
                      </ul>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* 3. Recomendações Operacionais */}
          <div className="p-4 border border-blue-200 bg-blue-50/40 rounded-lg space-y-2">
            <h4 className="text-xs font-bold text-[#004C97] uppercase">
              3. Recomendações Operacionais da IA
            </h4>
            <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
              {(analysisState?.recommendations || []).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          {/* 4. Detalhamento Expansível por Linha, Centro e OP */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[#004C97] uppercase tracking-wide">
              4. Detalhamento Operacional da Tela
            </h3>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {hierarchy.map((line) => {
                const isExp = expandedLines.has(line.lineCode)
                return (
                  <div key={line.lineCode} className="text-xs">
                    <button
                      type="button"
                      onClick={() => toggleLine(line.lineCode)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 text-left font-semibold text-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        {isExp ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>
                          {line.lineCode} — {line.lineName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-600 font-mono text-[11px]">
                        <span>Prog: {formatNumberPtBr(line.programadoT, 2)} t</span>
                        <span>
                          Real:{' '}
                          {line.realizadoT !== null
                            ? `${formatNumberPtBr(line.realizadoT, 2)} t`
                            : '—'}
                        </span>
                        <span className="font-bold text-[#004C97]">
                          {line.percentualRealizado !== null
                            ? `${formatNumberPtBr(line.percentualRealizado, 1)}%`
                            : '—'}
                        </span>
                      </div>
                    </button>

                    {isExp && (
                      <div className="bg-slate-50/50 p-3 pl-8 space-y-2 border-t border-slate-100">
                        {(line.centers || []).map((cnt) => (
                          <div
                            key={cnt.centerCode}
                            className="border-l-2 border-[#004C97] pl-3 py-1"
                          >
                            <div className="flex items-center justify-between text-slate-800 font-medium">
                              <span>
                                {cnt.centerCode} — {cnt.centerName}
                              </span>
                              <span className="text-[11px] font-mono">
                                {cnt.percentualRealizado !== null
                                  ? `${formatNumberPtBr(cnt.percentualRealizado, 1)}%`
                                  : '—'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {(cnt.ops || []).length} OP(s) carregada(s)
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 5. Observações do Programador PCP (Campo Editável) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              5. Observações e Ajustes do Programador PCP
            </label>
            <Textarea
              value={plannerNotes}
              onChange={(e) => setPlannerNotes(e.target.value)}
              placeholder="Insira aqui observações complementares, justificativas operacionais ou correções antes de aprovar formalmente o relatório..."
              className="text-xs min-h-[80px]"
            />
          </div>

          {/* 6. Campo de Justificativa de Aprovação (Se for aprovar) */}
          {!recordState?.is_official && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5">
              <label className="text-xs font-bold text-amber-900">
                Justificativa / Parecer de Homologação Oficial
              </label>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Ex: Análise conferida e validada com o apontamento de turno."
                className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded bg-white text-slate-900"
              />
            </div>
          )}
        </div>

        {/* Rodapé / Ações */}
        <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReanalyze}
            disabled={isAnalyzing || isSaving || isApproving}
            className="text-xs gap-1.5"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Reanalisar com IA
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isAnalyzing || isApproving}
              className="text-xs gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Salvar Análise
            </Button>

            {!recordState?.is_official && (
              <Button
                type="button"
                size="sm"
                onClick={handleApprove}
                disabled={isApproving || isSaving || isAnalyzing}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isApproving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                Aprovar Análise
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

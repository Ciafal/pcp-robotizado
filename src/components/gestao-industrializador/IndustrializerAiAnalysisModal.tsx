/**
 * Modal grande responsivo "Análise IA"
 * - Executa análise REAL sobre os dados filtrados
 * - Estado "Analisando informações..." enquanto processa
 * - Conteúdo estruturado específico por tela:
 *    • Gestão de MP: Ruptura, autonomia, saldo projetado, CQ, trânsito, consumo; Resumo Executivo (<=5 pontos); Alertas críticos; Tabela Materiais prioritários (|Prioridade|Material|Situação|Impacto|Ação sugerida|); Recomendações; Pergunta final "Quais ações precisam ser priorizadas pelo PCP agora?"
 *    • Análise de Carteira: Concentração, riscos de atendimento, gargalos, oportunidades de replanejamento; sem inventar dados
 *    • Sequenciamento P x R: Desvios previsto x realizado, sequências críticas, impactos; se dado insuficiente: "Não há dados suficientes para avaliar este indicador."
 * - Botões internos: [Atualizar análise] [Enviar Hub] [Enviar e-mail] [Fechar]
 * - Repasse dos textos para Enviar Hub e Enviar e-mail
 * - Rodapé obrigatório: "Análise gerada por IA para suporte à decisão. Os dados e recomendações devem ser validados pelo responsável antes da execução."
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Sparkles,
  RefreshCw,
  Send,
  Mail,
  X,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  IndustrializerScreenKey,
  IndustrializerAiResult,
  generateIndustrializerAiAnalysis,
  formatAiForSharing,
} from '@/services/gestao-industrializador-actions-service'

export interface IndustrializerAiAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  screenKey: IndustrializerScreenKey
  screenName: string
  filters: Record<string, any>
  metrics?: Record<string, any>
  records: Array<Record<string, any>>
  onSendHub?: (subject: string, message: string) => void
  onSendEmail?: (subject: string, body: string) => void
}

export const IndustrializerAiAnalysisModal: React.FC<IndustrializerAiAnalysisModalProps> = ({
  isOpen,
  onClose,
  screenKey,
  screenName,
  filters,
  metrics = {},
  records,
  onSendHub,
  onSendEmail,
}) => {
  const [analysis, setAnalysis] = useState<IndustrializerAiResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await generateIndustrializerAiAnalysis({
        screen_key: screenKey,
        screen_name: screenName,
        filters,
        metrics,
        records,
      })
      setAnalysis(result)
    } catch (err: any) {
      console.error('Erro na análise IA:', err)
      setError(err?.message || 'Falha ao processar análise inteligente.')
    } finally {
      setIsLoading(false)
    }
  }, [screenKey, screenName, filters, metrics, records])

  useEffect(() => {
    if (isOpen) {
      runAnalysis()
    } else {
      setAnalysis(null)
      setError(null)
    }
  }, [isOpen, runAnalysis])

  const handleShareHub = () => {
    if (!analysis) return
    const formatted = formatAiForSharing(analysis)
    onSendHub?.(formatted.subject, formatted.body)
    onClose()
  }

  const handleShareEmail = () => {
    if (!analysis) return
    const formatted = formatAiForSharing(analysis)
    onSendEmail?.(formatted.subject, formatted.body)
    onClose()
  }

  const getPriorityBadgeClass = (priority: string) => {
    const p = priority.toLowerCase()
    if (p.includes('crítica') || p.includes('critica')) {
      return 'bg-red-100 text-red-800 border-red-300 font-bold'
    }
    if (p.includes('alta')) {
      return 'bg-orange-100 text-orange-800 border-orange-300 font-semibold'
    }
    if (p.includes('média') || p.includes('media')) {
      return 'bg-amber-100 text-amber-800 border-amber-300'
    }
    return 'bg-slate-100 text-slate-700 border-slate-200'
  }

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('crítico') || s.includes('critico') || s.includes('ruptura') || s.includes('atrasado')) {
      return <Badge className="bg-red-600 text-white font-semibold">{status}</Badge>
    }
    if (s.includes('alerta') || s.includes('atenção') || s.includes('atencao') || s.includes('risco')) {
      return <Badge className="bg-amber-500 text-white font-semibold">{status}</Badge>
    }
    return <Badge className="bg-emerald-600 text-white font-semibold">{status}</Badge>
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="modal-analise-ia"
        className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 border-slate-200 shadow-2xl"
      >
        {/* Cabeçalho */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-[#004C97] to-[#002f5e] text-white flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                Análise IA — {screenName}
              </DialogTitle>
              <p className="text-xs text-blue-100 mt-0.5">
                PCP Robotizado CIAFAL • Dados filtrados ({records.length} registros)
              </p>
            </div>
          </div>
          {analysis?.status_geral && (
            <div className="mr-8">
              {getStatusBadge(analysis.status_geral)}
            </div>
          )}
        </DialogHeader>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isLoading ? (
            <div
              data-testid="ia-loading-state"
              className="py-16 flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-[#004C97] animate-spin" />
                <Sparkles className="w-6 h-6 text-[#004C97] absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-800">
                  Analisando informações...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Processando métricas filtradas, cruzando saldos, desvios operacionais e calculando prioridades do PCP.
                </p>
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertDescription className="text-sm font-medium">
                {error}
              </AlertDescription>
            </Alert>
          ) : analysis ? (
            <div className="space-y-5" data-testid="ia-content">
              {/* Contexto dos Filtros Utilizados */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  <span className="font-semibold text-slate-800">Base da análise:</span>
                  <span>{records.length} registros com filtros ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">
                    Gerado em: {analysis.data_geracao || 'Hoje'}
                  </span>
                  {analysis.modelo && (
                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300 py-0">
                      {analysis.modelo}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 1. Resumo Executivo (até 5 pontos) */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#004C97]">
                  <CheckCircle2 className="w-4 h-4 text-[#004C97]" />
                  <span>Resumo Executivo</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-800">
                  {analysis.resumo_executivo.slice(0, 5).map((ponto, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#004C97] mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{ponto}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Alertas Críticos */}
              {analysis.alertas_criticos && analysis.alertas_criticos.length > 0 && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Pontos de Atenção & Alertas Críticos</span>
                  </div>
                  <div className="space-y-1.5">
                    {analysis.alertas_criticos.map((alerta, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-amber-900 flex items-start gap-2 bg-white/70 p-2 rounded border border-amber-200/60"
                      >
                        <span className="font-bold text-amber-700 shrink-0">#{idx + 1}</span>
                        <span className="leading-relaxed">{alerta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Tabela de Materiais / Itens Prioritários */}
              {analysis.materiais_prioritarios && analysis.materiais_prioritarios.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Materiais / Sequências Prioritárias
                    </h5>
                    <span className="text-[11px] text-slate-500">
                      {analysis.materiais_prioritarios.length} itens com ação recomendada
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-xs">
                    <table className="w-full text-xs text-left divide-y divide-slate-200">
                      <thead className="bg-slate-50 font-semibold text-slate-600">
                        <tr>
                          <th className="py-2 px-3">Prioridade</th>
                          <th className="py-2 px-3">Material / Ref</th>
                          <th className="py-2 px-3">Situação</th>
                          <th className="py-2 px-3">Impacto</th>
                          <th className="py-2 px-3">Ação Sugerida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {analysis.materiais_prioritarios.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={`text-[11px] ${getPriorityBadgeClass(item.prioridade)}`}
                              >
                                {item.prioridade}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {item.material}
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              {item.situacao}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {item.impacto}
                            </td>
                            <td className="py-2 px-3 font-medium text-[#004C97]">
                              {item.acao_sugerida}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Recomendações Táticas */}
              {analysis.recomendacoes && analysis.recomendacoes.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-[#004C97]" />
                    Recomendações Táticas para o PCP
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {analysis.recomendacoes.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white rounded border border-slate-200/80 text-xs text-slate-700 flex items-start gap-2 shadow-2xs"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-[#004C97] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Pergunta Final para Decisão */}
              {analysis.pergunta_final && (
                <div className="p-3.5 bg-gradient-to-r from-blue-900 to-[#004C97] text-white rounded-xl shadow-sm flex items-start gap-3">
                  <div className="p-1.5 bg-white/10 rounded-md shrink-0 mt-0.5">
                    <Info className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-200 block">
                      Decisão Imediata
                    </span>
                    <p className="text-xs font-medium text-white mt-0.5 leading-relaxed">
                      {analysis.pergunta_final}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Rodapé com Governança e Ações */}
        <DialogFooter className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 italic max-w-md text-left">
            Análise gerada por IA para suporte à decisão. Os dados e recomendações devem ser validados pelo responsável antes da execução.
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runAnalysis}
              disabled={isLoading}
              className="text-slate-700 border-slate-300 hover:bg-slate-100"
              data-testid="btn-ia-atualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar análise
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareHub}
              disabled={isLoading || !analysis}
              className="text-[#004C97] border-[#004C97]/30 hover:bg-blue-50"
              data-testid="btn-ia-enviar-hub"
            >
              <Send className="w-3.5 h-3.5 mr-1.5 text-[#004C97]" />
              Enviar Hub
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShareEmail}
              disabled={isLoading || !analysis}
              className="text-slate-700 border-slate-300 hover:bg-slate-100"
              data-testid="btn-ia-enviar-email"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
              Enviar e-mail
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

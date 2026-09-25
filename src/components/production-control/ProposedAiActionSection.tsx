import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  FileText,
  ExternalLink,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  HelpCircle,
  Building2,
  Tag,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import {
  ProductionProposedAiAction,
  ProductionAiActionContext,
  ProductionTreatmentHistoryItem,
} from '@/types/production-reference-documents'
import { productionControlReferenceDocsService } from '@/services/production-control-reference-docs-service'

interface ProposedAiActionSectionProps {
  context: ProductionAiActionContext
  onOpenReferenceDocuments?: () => void
  onTreatmentCompleted?: () => void
}

export const ProposedAiActionSection: React.FC<ProposedAiActionSectionProps> = ({
  context,
  onOpenReferenceDocuments,
  onTreatmentCompleted,
}) => {
  const [loading, setLoading] = useState(true)
  const [actionData, setActionData] = useState<ProductionProposedAiAction | null>(null)
  const [historyItems, setHistoryItems] = useState<ProductionTreatmentHistoryItem[]>([])

  // Formulário de Registro de Tratamento
  const [actualActionTaken, setActualActionTaken] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [reprocessingDone, setReprocessingDone] = useState(false)
  const [isResolved, setIsResolved] = useState(true)
  const [treatmentObservation, setTreatmentObservation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      const res = await productionControlReferenceDocsService.generateProposedAction(context)
      setActionData(res)

      // Carregar histórico prévio para a ocorrência
      const hist = await productionControlReferenceDocsService.getTreatmentHistoryByOccurrence(
        context.occurrence_id,
      )
      setHistoryItems(hist)
    } catch {
      toast({
        title: 'Erro na análise da IA',
        description: 'Não foi possível correlacionar os documentos do SGQ.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (context.occurrence_id) {
      loadAnalysis()
    }
  }, [context.occurrence_id])

  const handleRecordTreatment = async () => {
    if (!actionData) return

    if (!actualActionTaken.trim()) {
      toast({
        title: 'Ação realizada obrigatória',
        description: 'Descreva a ação que foi efetivamente executada.',
        variant: 'destructive',
      })
      return
    }

    if (!responsibleName.trim()) {
      toast({
        title: 'Responsável obrigatório',
        description: 'Informe o nome do responsável pelo tratamento.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const item = await productionControlReferenceDocsService.recordTreatmentHistory({
        occurrence_id: context.occurrence_id,
        occurrence_type: context.occurrence_type,
        op_number: context.op_number,
        material_code: context.material_code,
        document_code: actionData.documento_utilizado?.codigo,
        document_title: actionData.documento_utilizado?.titulo,
        document_revision: actionData.documento_utilizado?.revisao,
        proposed_action: actionData.passos_acao_proposta.join('; '),
        actual_action_taken: actualActionTaken,
        responsible_name: responsibleName,
        responsible_area: actionData.area_sugerida,
        outcome: isResolved ? 'Resolvido com sucesso' : 'Em andamento / Pendente',
        reprocessing_done: reprocessingDone,
        resolved: isResolved,
        divergence_identified: actionData.divergencia_historico?.identificada,
        divergence_notes: actionData.divergencia_historico?.mensagem,
        observation: treatmentObservation,
        ai_traceability_data: actionData.rastreabilidade,
      })

      setHistoryItems((prev) => [item, ...prev])
      setActualActionTaken('')
      setTreatmentObservation('')

      toast({
        title: 'Tratamento registrado com sucesso',
        description:
          'A ação realizada foi vinculada à rastreabilidade da IA para auditoria e análise de recorrência.',
      })

      onTreatmentCompleted?.()
    } catch (e: any) {
      toast({
        title: 'Erro ao registrar tratamento',
        description: e.message || 'Falha ao salvar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3 bg-white rounded-lg border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-700" />
        <p className="text-sm font-medium text-slate-700">
          Avaliando ocorrência frente aos Documentos de Referência oficiais do SGQ...
        </p>
        <span className="text-xs text-slate-400">
          Hierarquia: Documento SGQ Vigente &gt; Critérios de Aderência &gt; Histórico Operacional
        </span>
      </div>
    )
  }

  if (!actionData) return null

  return (
    <div className="space-y-4 text-slate-800">
      {/* ALERTA DE DIVERGÊNCIA COM HISTÓRICO ANTERIOR */}
      {actionData.divergencia_historico?.identificada && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wider text-amber-950 block">
              ⚠ Divergência Identificada com Tratamento Passado
            </span>
            <p className="text-amber-900">{actionData.divergencia_historico.mensagem}</p>
            {actionData.divergencia_historico.tratamento_anterior && (
              <p className="text-[11px] text-amber-800 font-mono mt-1">
                <strong>Tratamento anterior:</strong>{' '}
                {actionData.divergencia_historico.tratamento_anterior}
              </p>
            )}
            <p className="text-[10px] text-amber-700 italic pt-1 border-t border-amber-200">
              * O histórico nunca prevalece sobre o procedimento oficial vigente da CIAFAL.
              Correções passadas desatualizadas não viram procedimento.
            </p>
          </div>
        </div>
      )}

      {/* CABEÇALHO DO PROBLEMA & CLASSIFICAÇÃO */}
      <Card className="bg-white border-slate-200 shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                1. Problema Identificado (Objetivo)
              </span>
              <h3 className="text-sm font-bold text-slate-900 font-mono">
                {actionData.problema_identificado}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-semibold uppercase border-slate-300 text-slate-700 bg-slate-50"
              >
                {actionData.classificacao.categoria} • {actionData.classificacao.subcategoria}
              </Badge>
              <Badge
                className={`text-xs font-semibold ${
                  actionData.classificacao.criticidade === 'CRITICA'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : actionData.classificacao.criticidade === 'URGENTE'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}
              >
                {actionData.classificacao.criticidade}
              </Badge>
            </div>
          </div>

          {/* EVIDÊNCIAS COLETADAS DO SAP */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              3. Evidências do SAP Coletadas
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
              {actionData.evidencias.codigo_mensagem && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Mensagem SAP</span>
                  <span className="font-mono font-bold text-slate-800">
                    {actionData.evidencias.codigo_mensagem}
                  </span>
                </div>
              )}
              {actionData.evidencias.ordem && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Ordem OP</span>
                  <span className="font-mono font-bold text-blue-800">
                    {actionData.evidencias.ordem}
                  </span>
                </div>
              )}
              {actionData.evidencias.material && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Material</span>
                  <span className="font-mono text-slate-800 truncate block">
                    {actionData.evidencias.material}
                  </span>
                </div>
              )}
              {actionData.evidencias.centro && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Centro</span>
                  <span className="font-mono text-slate-800">{actionData.evidencias.centro}</span>
                </div>
              )}
              {actionData.evidencias.deposito && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Depósito</span>
                  <span className="font-mono text-slate-800">{actionData.evidencias.deposito}</span>
                </div>
              )}
              {actionData.evidencias.movimento && (
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Movimento</span>
                  <span className="font-mono font-bold text-purple-700">
                    {actionData.evidencias.movimento}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEPARAÇÃO METODOLÓGICA: FATOS x HIPÓTESES x ORIENTAÇÃO DOCUMENTADA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* FATO IDENTIFICADO */}
        <Card className="bg-white border-emerald-200 shadow-2xs">
          <CardHeader className="p-3 border-b border-emerald-100 bg-emerald-50/50">
            <CardTitle className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 font-semibold">
                FATO IDENTIFICADO
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-xs text-slate-700 space-y-1.5">
            {actionData.fatos_identificados.length > 0 ? (
              actionData.fatos_identificados.map((fact, idx) => (
                <div key={idx} className="flex items-start gap-1.5 font-mono text-[11px]">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>{fact}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs">Registro obtido do log técnico SAP.</p>
            )}
          </CardContent>
        </Card>

        {/* HIPÓTESE IA */}
        <Card className="bg-white border-amber-200 shadow-2xs">
          <CardHeader className="p-3 border-b border-amber-100 bg-amber-50/50">
            <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <Badge className="bg-amber-600 text-white text-[9px] px-1 py-0 font-semibold">
                HIPÓTESE IA
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-xs text-slate-700 space-y-1.5">
            {actionData.hipoteses_ia.length > 0 ? (
              actionData.hipoteses_ia.map((hyp, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-[11px]">
                  <span className="text-amber-500 font-bold">?</span>
                  <span>{hyp}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs">Sem hipóteses adicionais.</p>
            )}
            <p className="text-[10px] text-amber-800 italic pt-2 border-t border-amber-100">
              * Hipótese técnica consultiva — nunca tratada como fato antes de validação humana.
            </p>
          </CardContent>
        </Card>

        {/* ORIENTAÇÃO DOCUMENTADA */}
        <Card className="bg-white border-blue-200 shadow-2xs">
          <CardHeader className="p-3 border-b border-blue-100 bg-blue-50/50">
            <CardTitle className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
              <BookOpen className="w-3.5 h-3.5 text-blue-700" />
              <Badge className="bg-blue-700 text-white text-[9px] px-1 py-0 font-semibold">
                ORIENTAÇÃO DOCUMENTADA
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-xs text-slate-700 space-y-1.5">
            {actionData.orientacao_documentada.map((ori, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] font-medium">
                <span className="text-blue-600 font-bold">§</span>
                <span>{ori}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* BLOCO CENTRAL: 4. AÇÃO PROPOSTA OBJETIVA & 5. ÁREA SUGERIDA & 6. DOCUMENTO UTILIZADO */}
      <Card className="bg-white border-slate-200 shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                4. Ação Proposta por IA (Roteiro de Tratamento)
              </CardTitle>
              <span className="text-[11px] text-slate-500">
                Passos objetivos extraídos do documento oficial de referência vigente
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Área Sugerida:</span>
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-bold px-2 py-0.5">
              {actionData.area_sugerida}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Cenário: SEM documento associado */}
          {actionData.referencia_nao_localizada ? (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-lg space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-950 text-sm">
                    Referência oficial não localizada
                  </h4>
                  <p className="text-amber-900 font-medium">
                    Nenhum Documento de Referência vigente foi localizado para esta ocorrência.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Esta análise preliminar não substitui procedimento oficial da CIAFAL. Nenhuma
                    ação foi inventada pela IA.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-amber-200">
                <span className="font-bold text-amber-950 uppercase text-[10px] tracking-wider block">
                  Análise Técnica Preliminar Sugerida:
                </span>
                <div className="space-y-1 font-mono text-[11px] text-amber-900 bg-white/70 p-2.5 rounded border border-amber-200">
                  {actionData.passos_acao_proposta.map((step, idx) => (
                    <div key={idx}>{step}</div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenReferenceDocuments}
                  className="text-xs border-amber-400 text-amber-900 hover:bg-amber-100 flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Solicitar associação de Documento
                </Button>{' '}
              </div>
            </div>
          ) : (
            /* Cenário: COM documento associado */
            <div className="space-y-4">
              {/* Passos Objetivos */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Passos de Tratamento Recomendados:
                </span>
                <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-lg border border-blue-100 font-mono text-xs text-blue-950">
                  {actionData.passos_acao_proposta.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-blue-700 font-bold shrink-0">{idx + 1}.</span>
                      <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documento Insuficiente (se aplicável) */}
              {actionData.documento_insuficiente && actionData.detalhes_insuficiencia && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs space-y-1 text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    O documento localizado possui relação com a ocorrência, porém não contém
                    instrução suficiente para determinar o tratamento completo.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    <strong>O que o documento determina:</strong>{' '}
                    {actionData.detalhes_insuficiencia.o_que_determina}
                  </p>
                  <p className="text-[11px] text-amber-800">
                    <strong>O que precisa de validação humana:</strong>{' '}
                    {actionData.detalhes_insuficiencia.o_que_precisa_validacao_humana}
                  </p>
                </div>
              )}

              {/* 6. Documento Utilizado */}
              {actionData.documento_utilizado && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        6. Documento Oficial Utilizado:
                      </span>
                      <span className="font-mono font-bold text-blue-900 text-xs">
                        {actionData.documento_utilizado.codigo}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px] border-slate-300">
                        {actionData.documento_utilizado.revisao}
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                        {actionData.documento_utilizado.status}
                      </Badge>
                    </div>
                    <p className="font-semibold text-slate-800">
                      {actionData.documento_utilizado.titulo}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (actionData.documento_utilizado?.original_url) {
                        window.open(actionData.documento_utilizado.original_url, '_blank')
                      } else {
                        onOpenReferenceDocuments?.()
                      }
                    }}
                    className="text-xs border-blue-600 text-blue-700 hover:bg-blue-50 shrink-0 flex items-center gap-1.5 h-8"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Abrir Documento
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* RASTREABILIDADE DA RESPOSTA IA */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
            <span>ID Análise: {actionData.rastreabilidade.id_analise}</span>
            <span>
              Timestamp: {new Date(actionData.rastreabilidade.timestamp).toLocaleString('pt-BR')}
            </span>
            <span>
              Docs consultados:{' '}
              {actionData.rastreabilidade.documentos_consultados.join(', ') || 'Nenhum'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* REGISTRO DO HISTÓRICO DE TRATAMENTO (FEEDBACK DO OPERADOR) */}
      <Card className="bg-white border-slate-200 shadow-2xs">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            Registrar Tratamento Executado (Histórico Operacional)
          </CardTitle>
          <span className="text-[11px] text-slate-500">
            Alimenta a base de conhecimento de recorrência e auditoria de tratamentos
          </span>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">
                Ação Efetivamente Realizada *
              </Label>
              <Input
                placeholder="Ex: Realizada transferência 311 de 12 TO para o depósito 0005..."
                value={actualActionTaken}
                onChange={(e) => setActualActionTaken(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">
                Nome do Responsável *
              </Label>
              <Input
                placeholder="Ex: Operador PCP / Almoxarife"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={reprocessingDone}
                onChange={(e) => setReprocessingDone(e.target.checked)}
                className="rounded text-blue-700"
              />
              <span>Reprocessamento no SAP já executado</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={isResolved}
                onChange={(e) => setIsResolved(e.target.checked)}
                className="rounded text-blue-700"
              />
              <span>Ocorrência resolvida</span>
            </label>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-700">
              Observações Adicionais (Opcional)
            </Label>
            <Input
              placeholder="Ex: Lote liberado com autorização do Inspetor de Qualidade..."
              value={treatmentObservation}
              onChange={(e) => setTreatmentObservation(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={handleRecordTreatment}
              className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Registrando...' : 'Registrar Tratamento no Histórico'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* HISTÓRICO DE TRATAMENTOS ANTERIORES PARA ESTA OCORRÊNCIA */}
      {historyItems.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Histórico de Tratamentos Registrados ({historyItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-800">{item.actual_action_taken}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(item.created).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <span>Responsável: {item.responsible_name}</span>
                  <span>•</span>
                  <span>
                    Doc: {item.document_code || 'S/N'} ({item.document_revision || '—'})
                  </span>
                  <span>•</span>
                  <Badge
                    className={`text-[9px] px-1 py-0 ${
                      item.resolved
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.outcome}
                  </Badge>
                </div>
                {item.observation && (
                  <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-100">
                    {item.observation}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ProposedAiActionSection

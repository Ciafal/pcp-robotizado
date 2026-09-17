import React, { useState } from 'react'
import {
  FileText,
  AlertOctagon,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DocumentValidationResult } from '@/types/sgq-rules'
import { SGQ_INTERFERENCE_CATEGORY_LABELS } from '@/services/sgq-document-provider'

interface PreApprovalDocumentValidationPanelProps {
  validationResult: DocumentValidationResult
  onApplyRecommendation?: (ruleId: string) => void
  onDismissRecommendation?: (ruleId: string) => void
  onOpenDetails?: () => void
}

export const PreApprovalDocumentValidationPanel: React.FC<
  PreApprovalDocumentValidationPanelProps
> = ({ validationResult, onApplyRecommendation, onDismissRecommendation, onOpenDetails }) => {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'violations' | 'conflicts' | 'recommendations' | 'satisfied'
  >('violations')

  const {
    passed,
    blocking_violations_count,
    warnings_count,
    recommendations_count,
    considered_documents,
    mandatory_violations,
    recommendations,
    conflicts,
    rules_satisfied,
  } = validationResult

  const handleOpenModal = () => {
    setDetailsOpen(true)
    if (onOpenDetails) onOpenDetails()
  }

  return (
    <div className="space-y-4 my-4">
      {/* Bloco principal: Validação de Documentos de Referência */}
      <Card
        className={`border shadow-xs ${
          blocking_violations_count > 0
            ? 'border-rose-300 bg-rose-50/40'
            : warnings_count > 0
              ? 'border-amber-300 bg-amber-50/40'
              : 'border-emerald-300 bg-emerald-50/30'
        }`}
      >
        <CardHeader className="py-3 px-4 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {blocking_violations_count > 0 ? (
              <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" />
            ) : warnings_count > 0 ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Validação de Documentos de Referência (SGQ)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Conformidade com os Procedimentos Operacionais, Instruções Técnicas e Especificações
                Oficiais da linha.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenModal}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <span>Ver Detalhes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="p-4">
          {/* Grid com os 5 cards requisitados */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {/* 1. Documentos Analisados */}
            <div className="p-2.5 rounded-lg border bg-background/80 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground font-medium">
                Documentos Analisados
              </span>
              <span className="text-xl font-extrabold text-foreground mt-0.5">
                {considered_documents.length}
              </span>
            </div>

            {/* 2. Regras Atendidas */}
            <div className="p-2.5 rounded-lg border bg-background/80 flex flex-col items-center justify-center">
              <span className="text-xs text-emerald-700 font-medium">Regras Atendidas</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {rules_satisfied.length}
              </span>
            </div>

            {/* 3. Recomendações */}
            <div className="p-2.5 rounded-lg border bg-background/80 flex flex-col items-center justify-center">
              <span className="text-xs text-indigo-700 font-medium">Recomendações</span>
              <span className="text-xl font-extrabold text-indigo-600 mt-0.5">
                {recommendations_count}
              </span>
            </div>

            {/* 4. Alertas / Conflitos */}
            <div className="p-2.5 rounded-lg border bg-background/80 flex flex-col items-center justify-center">
              <span className="text-xs text-amber-700 font-medium">Alertas / Conflitos</span>
              <span className="text-xl font-extrabold text-amber-600 mt-0.5">{warnings_count}</span>
            </div>

            {/* 5. Restrições Obrigatórias Não Atendidas */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col items-center justify-center ${
                blocking_violations_count > 0
                  ? 'bg-rose-100 border-rose-300 text-rose-900'
                  : 'bg-background/80 text-foreground'
              }`}
            >
              <span className="text-xs font-semibold">Restrições Obrigatórias</span>
              <span
                className={`text-xl font-extrabold mt-0.5 ${
                  blocking_violations_count > 0 ? 'text-rose-700 animate-pulse' : 'text-foreground'
                }`}
              >
                {blocking_violations_count}
              </span>
            </div>
          </div>

          {/* Destaque de Restrição Obrigatória Não Atendida (Item 10) */}
          {blocking_violations_count > 0 && (
            <div className="mt-4 p-3.5 rounded-md border border-rose-300 bg-rose-50 space-y-3">
              <div className="flex items-center gap-2 text-rose-950 font-bold text-xs uppercase tracking-wide">
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                Restrição documental não atendida — Envio para aprovação bloqueado
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                A programação contém regras obrigatórias ou proibições do SGQ violadas. Ajuste os
                itens abaixo antes de submeter ao fluxo de aprovação executiva.
              </p>

              <div className="space-y-2">
                {mandatory_violations.slice(0, 3).map((v, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-white/90 border border-rose-200 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-rose-900 flex items-center gap-1.5">
                        <Badge className="bg-rose-600 text-white text-[10px] font-mono">
                          {v.rule_type}
                        </Badge>
                        {v.document_code} ({v.revision}) — {v.description}
                      </span>
                      {v.date_str && (
                        <span className="text-muted-foreground text-[11px] font-mono">
                          Data: {v.date_str}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      <strong>Impacto: </strong>
                      {v.impact_description}
                    </div>
                    <div className="text-slate-700 text-[11px] italic">
                      <strong>Evidência oficial: </strong>"{v.source_excerpt}"
                    </div>
                    <div className="text-primary font-medium text-[11px] pt-0.5">
                      <strong>Ação recomendada: </strong>
                      {v.recommended_action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Destaque de Conflitos de Regras entre Fontes (Item 10) */}
          {conflicts.length > 0 && (
            <div className="mt-3 p-3.5 rounded-md border border-amber-300 bg-amber-50 space-y-2">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                Conflito de Regra entre Fontes Oficiais
              </div>
              <p className="text-xs text-amber-800">
                Identificada divergência entre parâmetros da Ficha Mestra/Programação e os limites
                fixados no Documento SGQ.
              </p>
              <div className="space-y-2 pt-1">
                {conflicts.map((c, i) => (
                  <div key={i} className="p-2 bg-white/90 rounded border border-amber-200 text-xs">
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>Parâmetro: {c.parameter}</span>
                      <span className="text-amber-800">{c.description}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground">
                      <span>
                        <strong>{c.source_a.name}:</strong> {c.source_a.value}
                      </span>
                      <span>×</span>
                      <span>
                        <strong>{c.source_b.name}:</strong> {c.source_b.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Validação */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              Detalhamento da Validação Documental SGQ
            </DialogTitle>
            <DialogDescription>
              Relatório analítico de conformidade das regras industriais estruturadas consideradas
              pelo motor.
            </DialogDescription>
          </DialogHeader>

          {/* Abas internas */}
          <div className="flex border-b text-xs font-semibold gap-2">
            <button
              onClick={() => setActiveTab('violations')}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                activeTab === 'violations'
                  ? 'border-rose-600 text-rose-700 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Restrições Violadas ({mandatory_violations.length})
            </button>
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                activeTab === 'conflicts'
                  ? 'border-amber-600 text-amber-700 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Conflitos de Origem ({conflicts.length})
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                activeTab === 'recommendations'
                  ? 'border-indigo-600 text-indigo-700 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Recomendações SGQ ({recommendations.length})
            </button>
            <button
              onClick={() => setActiveTab('satisfied')}
              className={`pb-2 px-3 border-b-2 transition-colors ${
                activeTab === 'satisfied'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Regras Atendidas ({rules_satisfied.length})
            </button>
          </div>

          <div className="py-3 text-xs space-y-3">
            {activeTab === 'violations' && (
              <div className="space-y-2">
                {mandatory_violations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground border border-dashed rounded">
                    Nenhuma restrição obrigatória violada. Conformidade integral com o SGQ.
                  </div>
                ) : (
                  mandatory_violations.map((v, i) => (
                    <div
                      key={i}
                      className="p-3 rounded border border-rose-200 bg-rose-50/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-semibold text-rose-950">
                        <span className="flex items-center gap-1.5">
                          <Badge className="bg-rose-600 text-white text-[10px]">
                            {v.rule_type}
                          </Badge>
                          {v.document_code} ({v.revision}) — {v.category}
                        </span>
                        <span>{v.product_code || 'Geral'}</span>
                      </div>
                      <p className="text-foreground">{v.description}</p>
                      <p className="text-muted-foreground italic text-[11px]">
                        <strong>Trecho original: </strong>"{v.source_excerpt}"
                      </p>
                      <p className="text-primary font-medium text-[11px]">
                        <strong>Ação requerida: </strong>
                        {v.recommended_action}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'conflicts' && (
              <div className="space-y-2">
                {conflicts.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground border border-dashed rounded">
                    Nenhum conflito de parâmetros detectado entre a Ficha Mestra e os documentos.
                  </div>
                ) : (
                  conflicts.map((c, i) => (
                    <div
                      key={i}
                      className="p-3 rounded border border-amber-200 bg-amber-50/60 space-y-1"
                    >
                      <div className="font-semibold text-amber-950 flex justify-between">
                        <span>{c.parameter}</span>
                        <span>Produto: {c.product_code || 'Linha'}</span>
                      </div>
                      <p className="text-muted-foreground">{c.description}</p>
                      <div className="flex gap-4 pt-1 font-mono text-[11px]">
                        <span className="bg-white px-2 py-1 rounded border">
                          {c.source_a.name}: <strong>{c.source_a.value}</strong>
                        </span>
                        <span className="bg-white px-2 py-1 rounded border">
                          {c.source_b.name}: <strong>{c.source_b.value}</strong>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className="space-y-2">
                {recommendations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground border border-dashed rounded">
                    Nenhuma recomendação adicional pendente.
                  </div>
                ) : (
                  recommendations.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded border border-indigo-200 bg-indigo-50/60 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-indigo-950 flex items-center gap-1.5">
                          <Lightbulb className="h-4 w-4 text-indigo-600" />
                          <span>Sugestão baseada em Documento de Referência</span>
                          <Badge variant="outline" className="text-[10px]">
                            {r.document_code} ({r.revision})
                          </Badge>
                        </div>
                        <p className="text-foreground">{r.description}</p>
                        <p className="text-muted-foreground italic text-[11px]">
                          "{r.source_excerpt}"
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="sm"
                          className="h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => onApplyRecommendation?.(r.rule_id)}
                        >
                          Aplicar sugestão
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => onDismissRecommendation?.(r.rule_id)}
                        >
                          Manter programação atual
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'satisfied' && (
              <div className="space-y-2">
                {rules_satisfied.map((s, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-foreground font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      {s.description}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {s.document_code} ({s.revision})
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PreApprovalDocumentValidationPanel

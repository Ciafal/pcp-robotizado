import React, { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Calendar,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Info,
  Check,
  ShieldCheck,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Can } from '@/components/auth/Can'
import { useToast } from '@/hooks/use-toast'
import {
  sgqDocumentProvider,
  SgqDocument,
  SgqDocumentStatus,
  SgqInterferenceCategory,
  SGQ_INTERFERENCE_CATEGORY_LABELS,
  SGQ_INTERFERENCE_CATEGORY_COLORS,
  SgqIntegrationStatus,
} from '@/services/sgq-document-provider'
import {
  lineReferenceDocumentsService,
  LineReferenceDocument,
} from '@/services/line-reference-documents-service'
import { sgqAiExtractionEngine } from '@/services/sgq-ai-extraction-engine'
import { StructuredDocumentRule, RuleStatus } from '@/types/sgq-rules'
import { pcpAuditService, computeDiff } from '@/services/pcp-audit-service'

interface LineReferenceDocumentsPanelProps {
  lineId: string
  lineCode: string
  lineName?: string
  companyId?: string
  onCountChange?: (count: number) => void
}

const ALL_INTERFERENCE_CATEGORIES: SgqInterferenceCategory[] = [
  'SEQUENCING',
  'SETUP',
  'PRODUCTIVITY',
  'BOTTLENECK_MATRIX',
  'MP_UTILIZATION',
]

export const LineReferenceDocumentsPanel: React.FC<LineReferenceDocumentsPanelProps> = ({
  lineId,
  lineCode,
  lineName,
  companyId = 'CIAFAL',
  onCountChange,
}) => {
  const { toast } = useToast()

  // Lista de documentos vinculados
  const [documents, setDocuments] = useState<LineReferenceDocument[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Status da integração SGQ
  const [sgqStatus, setSgqStatus] = useState<SgqIntegrationStatus>({
    connected: false,
    state: 'NAO_CONFIGURADO',
    title: 'Integração com SGQ aguardando configuração',
    message: 'Integração com SGQ aguardando configuração',
    sourceLabel: 'SGQ > Informação Documentada',
  })
  const [isSyncingSgq, setIsSyncingSgq] = useState<boolean>(false)

  // Modal: Adicionar Documento
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false)
  const [searchFilters, setSearchFilters] = useState({
    code: '',
    name: '',
    documentType: '',
    process: '',
    responsibleArea: '',
    revision: '',
    status: '' as SgqDocumentStatus | '',
    validityDate: '',
    keyword: '',
  })
  const [searchResults, setSearchResults] = useState<SgqDocument[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [selectedDocToAdd, setSelectedDocToAdd] = useState<SgqDocument | null>(null)
  const [selectedCategoriesToAdd, setSelectedCategoriesToAdd] = useState<SgqInterferenceCategory[]>(
    ['SEQUENCING'],
  )
  const [isSavingAdd, setIsSavingAdd] = useState<boolean>(false)

  // Modal: Editar Categorias
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false)
  const [docToEdit, setDocToEdit] = useState<LineReferenceDocument | null>(null)
  const [editCategories, setEditCategories] = useState<SgqInterferenceCategory[]>([])
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false)

  // Modal: Confirmar Remoção de Vínculo
  const [docToRemove, setDocToRemove] = useState<LineReferenceDocument | null>(null)
  const [isRemoving, setIsRemoving] = useState<boolean>(false)

  // Modal: Ver / Gerenciar Regras Extraídas
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false)
  const [selectedDocForRules, setSelectedDocForRules] = useState<LineReferenceDocument | null>(null)
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false)
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null)

  // Carregar dados
  const loadDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const [list, status] = await Promise.all([
        lineReferenceDocumentsService.getByLineId(lineId),
        sgqDocumentProvider.getIntegrationStatus(),
      ])
      setDocuments(list)
      setSgqStatus(status)
      if (onCountChange) {
        onCountChange(list.length)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar documentos de referência',
        description: err?.message || 'Falha ao buscar dados no backend.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [lineId, onCountChange, toast])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Ação: Atualizar SGQ
  const handleRefreshSgq = async () => {
    setIsSyncingSgq(true)
    try {
      const updatedStatus = await sgqDocumentProvider.syncSgq()
      setSgqStatus(updatedStatus)
      await loadDocuments()

      toast({
        title: 'Sincronização com SGQ Concluída',
        description: `Status: ${updatedStatus.title}`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha na sincronização',
        description: err?.message || 'Erro ao sincronizar repositório SGQ.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncingSgq(false)
    }
  }

  // Busca no provedor SGQ
  const handleSearchSgq = async () => {
    setIsSearching(true)
    try {
      const results = await sgqDocumentProvider.searchDocuments(searchFilters)
      setSearchResults(results)
    } catch (err: any) {
      toast({
        title: 'Erro na consulta ao SGQ',
        description: err?.message || 'Falha ao buscar documentos no provedor.',
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Abrir modal de adicionar
  const handleOpenAddModal = async () => {
    setIsAddModalOpen(true)
    setSelectedDocToAdd(null)
    setSelectedCategoriesToAdd(['SEQUENCING'])
    setSearchResults([])
    setSearchFilters({
      code: '',
      name: '',
      documentType: '',
      process: '',
      responsibleArea: '',
      revision: '',
      status: '',
      validityDate: '',
      keyword: '',
    })
    const status = await sgqDocumentProvider.getIntegrationStatus()
    setSgqStatus(status)
    if (status.connected) {
      handleSearchSgq()
    }
  }

  // Salvar novo vínculo
  const handleConfirmAdd = async () => {
    if (!selectedDocToAdd) {
      toast({
        title: 'Selecione um documento',
        description: 'É necessário selecionar um documento do SGQ para vincular.',
        variant: 'destructive',
      })
      return
    }

    if (selectedCategoriesToAdd.length === 0) {
      toast({
        title: 'Selecione ao menos 1 interferência',
        description:
          'O documento deve possuir ao menos uma categoria de interferência na programação.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingAdd(true)
    try {
      const createdDoc = await lineReferenceDocumentsService.create({
        line_id: lineId,
        company_id: companyId,
        line_code: lineCode,
        document_ref: selectedDocToAdd.id,
        document_code: selectedDocToAdd.code,
        title: selectedDocToAdd.title,
        revision: selectedDocToAdd.revision,
        document_type: selectedDocToAdd.documentType,
        responsible_area: selectedDocToAdd.responsibleArea,
        validity_date: selectedDocToAdd.validityDate || selectedDocToAdd.validityDateEnd,
        status: selectedDocToAdd.status,
        source: selectedDocToAdd.isSimulatedHomologation
          ? 'Fonte de homologação / dados simulados'
          : 'SGQ',
        original_url: selectedDocToAdd.originalUrl,
        interference_categories: selectedCategoriesToAdd,
        active_revision_ref: selectedDocToAdd.activeRevisionRef,
      })

      // Auto-extração por IA imediata do documento vinculado
      try {
        const analysis = await sgqAiExtractionEngine.analyzeDocument(
          createdDoc,
          selectedDocToAdd.extractableContent,
        )
        if (analysis && analysis.rules.length > 0) {
          await lineReferenceDocumentsService.saveInterpretedRules(createdDoc.id, analysis, {
            line_code: lineCode,
            line_id: lineId,
            company_id: companyId,
          })
        }
      } catch (aiErr) {
        console.warn('Auto-análise IA inicial postergada:', aiErr)
      }

      toast({
        title: 'Documento vinculado com sucesso',
        description: `${selectedDocToAdd.code} vinculado e pronto para uso no PCP.`,
      })

      setIsAddModalOpen(false)
      loadDocuments()
    } catch (err: any) {
      toast({
        title: 'Erro ao vincular documento',
        description: err?.message || 'Falha ao salvar vínculo no backend.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingAdd(false)
    }
  }

  // Ação: Analisar Documento com IA
  const handleAnalyzeWithAi = async (doc: LineReferenceDocument) => {
    setAnalyzingDocId(doc.id)
    setIsAnalyzingAi(true)
    try {
      // Obter conteúdo extraível via provider se disponível
      const sgqDoc = await sgqDocumentProvider.getDocumentById(
        doc.document_ref || doc.document_code,
      )
      const analysis = await sgqAiExtractionEngine.analyzeDocument(doc, sgqDoc?.extractableContent)

      await lineReferenceDocumentsService.saveInterpretedRules(doc.id, analysis, {
        line_code: lineCode,
        line_id: lineId,
        company_id: companyId,
      })

      toast({
        title: 'Análise de Documento por IA Concluída',
        description: `${analysis.rules.length} regra(s) estruturada(s) extraída(s) para ${doc.document_code}.`,
      })

      await loadDocuments()

      // Se o modal de regras estiver aberto para este documento, atualiza-o
      if (selectedDocForRules?.id === doc.id) {
        setSelectedDocForRules({
          ...doc,
          interpreted_rules: analysis,
        })
      }
    } catch (err: any) {
      toast({
        title: 'Falha na análise por IA',
        description: err?.message || 'Erro ao extrair regras estruturadas.',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzingAi(false)
      setAnalyzingDocId(null)
    }
  }

  // Ação: Validar Regra / Desativar Regra (controla apenas o uso pelo PCP, nunca o documento no SGQ)
  const handleToggleRuleStatus = async (
    doc: LineReferenceDocument,
    targetRuleId: string,
    targetStatus: RuleStatus,
  ) => {
    const existingPayload = doc.interpreted_rules || { rules: [] }
    const updatedRules = (existingPayload.rules || []).map((r: StructuredDocumentRule) => {
      if (r.rule_id === targetRuleId) {
        return {
          ...r,
          status: targetStatus,
          requires_human_review: false,
          human_reviewed_at: new Date().toISOString(),
          human_reviewer: 'PCP Supervisor',
        }
      }
      return r
    })

    const newPayload = {
      ...existingPayload,
      rules: updatedRules,
    }

    try {
      await lineReferenceDocumentsService.saveInterpretedRules(doc.id, newPayload, {
        line_code: lineCode,
        line_id: lineId,
        company_id: companyId,
      })

      // Auditoria no PCP
      await pcpAuditService.recordLog({
        action: `${targetStatus === 'ATIVA' ? 'Validação' : 'Desativação'} de Regra Documental: ${targetRuleId}`,
        event_type: 'RULE_ACTION',
        module: 'Hierarquia das Linhas',
        screen: 'Documentos de Referência',
        company: companyId,
        line: lineCode,
        record_id: doc.id,
        entity: 'line_reference_documents',
        status: 'Concluída',
        outcome: 'SUCCESS',
        changes: computeDiff({ status: 'ANTERIOR' }, { status: targetStatus }),
        details: { rule_id: targetRuleId, targetStatus },
      })

      toast({
        title:
          targetStatus === 'ATIVA' ? 'Regra Validada e Ativada' : 'Regra Desativada para o PCP',
        description: `A regra ${targetRuleId} foi atualizada. O documento original no SGQ permanece inalterado.`,
      })

      const updatedDoc = { ...doc, interpreted_rules: newPayload }
      setSelectedDocForRules(updatedDoc)
      loadDocuments()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status da regra',
        description: err?.message || 'Falha ao persistir status.',
        variant: 'destructive',
      })
    }
  }

  // Abrir modal de edição de categorias
  const handleOpenEdit = (doc: LineReferenceDocument) => {
    setDocToEdit(doc)
    setEditCategories([...doc.interference_categories])
    setIsEditModalOpen(true)
  }

  // Salvar edição de categorias
  const handleConfirmEdit = async () => {
    if (!docToEdit) return

    if (editCategories.length === 0) {
      toast({
        title: 'Selecione ao menos 1 interferência',
        description: 'O documento deve possuir ao menos uma categoria de interferência.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingEdit(true)
    try {
      await lineReferenceDocumentsService.updateCategories({
        id: docToEdit.id,
        line_id: lineId,
        line_code: lineCode,
        company_id: companyId,
        interference_categories: editCategories,
      })

      toast({
        title: 'Vínculo atualizado',
        description: `Categorias de interferência de ${docToEdit.document_code} atualizadas com sucesso.`,
      })

      setIsEditModalOpen(false)
      setDocToEdit(null)
      loadDocuments()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar categorias',
        description: err?.message || 'Falha ao atualizar registro no backend.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Confirmar remoção de vínculo
  const handleConfirmRemove = async () => {
    if (!docToRemove) return

    setIsRemoving(true)
    try {
      await lineReferenceDocumentsService.remove(docToRemove.id, {
        line_code: lineCode,
        line_id: lineId,
        company_id: companyId,
      })

      toast({
        title: 'Vínculo removido',
        description: `O vínculo do documento ${docToRemove.document_code} foi removido desta linha no PCP.`,
      })

      setDocToRemove(null)
      loadDocuments()
    } catch (err: any) {
      toast({
        title: 'Erro ao remover vínculo',
        description: err?.message || 'Falha ao deletar registro no backend.',
        variant: 'destructive',
      })
    } finally {
      setIsRemoving(false)
    }
  }

  const toggleCategory = (
    category: SgqInterferenceCategory,
    list: SgqInterferenceCategory[],
    setter: (l: SgqInterferenceCategory[]) => void,
  ) => {
    if (list.includes(category)) {
      if (list.length === 1) {
        toast({
          title: 'Atenção',
          description:
            'O documento precisa ter no mínimo 1 categoria de interferência selecionada.',
        })
        return
      }
      setter(list.filter((c) => c !== category))
    } else {
      setter([...list, category])
    }
  }

  const getStatusBadge = (status: SgqDocumentStatus) => {
    switch (status) {
      case 'VIGENTE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
            Vigente
          </Badge>
        )
      case 'OBSOLETO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
            Obsoleto
          </Badge>
        )
      case 'CANCELADO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100">
            Cancelado
          </Badge>
        )
      case 'SUBSTITUIDO':
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100">
            Substituído
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getRuleTypeBadge = (type: string) => {
    switch (type) {
      case 'OBRIGATORIA':
        return <Badge className="bg-rose-600 text-white font-mono text-[10px]">OBRIGATÓRIA</Badge>
      case 'PROIBICAO':
        return <Badge className="bg-red-700 text-white font-mono text-[10px]">PROIBIÇÃO</Badge>
      case 'LIMITE':
        return <Badge className="bg-amber-500 text-white font-mono text-[10px]">LIMITE</Badge>
      case 'PARAMETRO_TECNICO':
        return <Badge className="bg-blue-600 text-white font-mono text-[10px]">PARÂMETRO</Badge>
      case 'RECOMENDACAO':
        return (
          <Badge className="bg-indigo-500 text-white font-mono text-[10px]">RECOMENDAÇÃO</Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            INFORMATIVA
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Documentos de Referência da Linha — {lineCode}
            </h2>
            <Badge variant="outline" className="text-xs font-semibold uppercase">
              {lineName || 'Centro Operacional'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Documentos oficiais do SGQ utilizados como regras e referências técnicas pelo PCP
            Robotizado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSgq}
            disabled={isSyncingSgq || loading}
            className="h-9 gap-1.5"
            title="Sincronizar repositório SGQ"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncingSgq ? 'animate-spin' : ''}`} />
            <span>Atualizar SGQ</span>
          </Button>

          <Can permission="pcp.masterdata.edit">
            <Button
              size="sm"
              onClick={handleOpenAddModal}
              className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Documento de Referência</span>
            </Button>
          </Can>
        </div>
      </div>

      {/* Card de Status da Integração SGQ (Requisitos 4 e 5) */}
      <Card
        className={`border shadow-xs ${
          sgqStatus.state === 'CONECTADO'
            ? 'border-emerald-200 bg-emerald-50/50'
            : sgqStatus.state === 'HOMOLOGACAO_SIMULADO'
              ? 'border-blue-200 bg-blue-50/50'
              : 'border-amber-200 bg-amber-50/70'
        }`}
      >
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {sgqStatus.state === 'CONECTADO' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            ) : sgqStatus.state === 'HOMOLOGACAO_SIMULADO' ? (
              <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">{sgqStatus.title}</span>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {sgqStatus.sourceLabel}
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {sgqStatus.description || sgqStatus.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Última sincronização: </span>
              <span>
                {sgqStatus.lastSyncAt
                  ? new Date(sgqStatus.lastSyncAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Pendente'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Documentos Vinculados */}
      <Card>
        <CardHeader className="py-4 px-6 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-foreground">
                Documentos Associados ({documents.length})
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Fonte oficial: {sgqStatus.sourceLabel}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Nenhum documento de referência vinculado
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Esta linha ainda não possui documentos controlados do SGQ associados às suas regras
                de sequenciamento e programação.
              </p>
              <Can permission="pcp.masterdata.edit">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddModal}
                  className="mt-2 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Documento
                </Button>
              </Can>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase border-b border-border/60">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Documento
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Revisão
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Interferência na Programação
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Regras IA Extraídas
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Origem
                    </th>
                    <th scope="col" className="px-6 py-3 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {documents.map((doc) => {
                    const rulesList: StructuredDocumentRule[] = doc.interpreted_rules?.rules || []
                    const activeRulesCount = rulesList.filter((r) => r.status === 'ATIVA').length

                    return (
                      <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                        {/* Documento */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                              {doc.document_code}
                            </span>
                            <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {doc.title}
                            </span>
                            {doc.responsible_area && (
                              <span className="text-[11px] text-muted-foreground/80 mt-0.5">
                                Área: {doc.responsible_area}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Revisão */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant="outline" className="font-mono text-xs">
                            {doc.revision}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(doc.status)}
                        </td>

                        {/* Interferência */}
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {doc.interference_categories.length > 0 ? (
                              doc.interference_categories.map((cat) => {
                                const color = SGQ_INTERFERENCE_CATEGORY_COLORS[cat] || {
                                  bg: 'bg-muted',
                                  text: 'text-foreground',
                                  border: 'border-border',
                                }
                                return (
                                  <span
                                    key={cat}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${color.bg} ${color.text} ${color.border}`}
                                  >
                                    {SGQ_INTERFERENCE_CATEGORY_LABELS[cat] || cat}
                                  </span>
                                )
                              })
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Sem categoria
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Regras IA */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {rulesList.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDocForRules(doc)
                                  setIsRulesModalOpen(true)
                                }}
                                className="h-7 text-xs font-semibold gap-1 text-primary hover:bg-primary/10"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                <span>{activeRulesCount} regra(s) ativa(s)</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAnalyzeWithAi(doc)}
                                disabled={isAnalyzingAi && analyzingDocId === doc.id}
                                className="h-7 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 gap-1"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>
                                  {isAnalyzingAi && analyzingDocId === doc.id
                                    ? 'Analisando...'
                                    : 'Analisar com IA'}
                                </span>
                              </Button>
                            )}
                          </div>
                        </td>

                        {/* Origem */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant="secondary" className="text-[11px]">
                            {doc.source || 'SGQ'}
                          </Badge>
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Ação Analisar Documento com IA */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAnalyzeWithAi(doc)}
                              disabled={isAnalyzingAi && analyzingDocId === doc.id}
                              className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                              title="Analisar Documento com IA"
                            >
                              <Sparkles
                                className={`h-4 w-4 ${isAnalyzingAi && analyzingDocId === doc.id ? 'animate-spin' : ''}`}
                              />
                              <span className="sr-only">Analisar com IA</span>
                            </Button>

                            {/* Ver Regras Extraídas */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDocForRules(doc)
                                setIsRulesModalOpen(true)
                              }}
                              className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-100"
                              title="Ver Regras Extraídas"
                            >
                              <Layers className="h-4 w-4" />
                              <span className="sr-only">Ver Regras</span>
                            </Button>

                            {/* Abrir Documento Original */}
                            {doc.original_url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-8 w-8 p-0"
                                title="Abrir documento original"
                              >
                                <a
                                  href={doc.original_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  <span className="sr-only">Abrir documento original</span>
                                </a>
                              </Button>
                            ) : null}

                            <Can permission="pcp.masterdata.edit">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(doc)}
                                className="h-8 w-8 p-0"
                                title="Editar categorias de interferência"
                              >
                                <Edit2 className="h-4 w-4 text-foreground" />
                                <span className="sr-only">Editar categorias</span>
                              </Button>
                            </Can>

                            <Can permission="pcp.masterdata.edit">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDocToRemove(doc)}
                                className="h-8 w-8 p-0 hover:bg-rose-50 hover:text-rose-600"
                                title="Remover vínculo com o PCP"
                              >
                                <Trash2 className="h-4 w-4 text-rose-500" />
                                <span className="sr-only">Remover vínculo</span>
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Tabela de Regras Extraídas pelo Processamento de IA (Requisito 7) */}
      <Dialog open={isRulesModalOpen} onOpenChange={setIsRulesModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Regras Extraídas do Documento — {selectedDocForRules?.document_code} (
                {selectedDocForRules?.revision})
              </DialogTitle>
              {selectedDocForRules && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAnalyzeWithAi(selectedDocForRules)}
                  disabled={isAnalyzingAi}
                  className="h-8 text-xs gap-1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
                  Reanalisar com IA
                </Button>
              )}
            </div>
            <DialogDescription>
              Regras industriais estruturadas que alimentam os motores da Montagem Semanal. A
              ativação/desativação aqui controla apenas a utilização pelo PCP, sem alterar o
              documento no SGQ.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {/* Guardrail aviso */}
            <div className="p-3 bg-muted/30 rounded border text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Guardrail Absoluto:</strong> Apenas regras com documento, revisão e trecho
                de origem comprovados interferem no motor do PCP. Recomendações nunca viram
                obrigações automaticamente.
              </span>
            </div>

            {/* Tabela Categoria | Tipo | Regra | Valor | Origem | Status */}
            {!selectedDocForRules?.interpreted_rules?.rules ||
            selectedDocForRules.interpreted_rules.rules.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded text-xs text-muted-foreground">
                Nenhuma regra estruturada extraída até o momento. Clique em "Reanalisar com IA" para
                processar o conteúdo do documento.
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/40 uppercase font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="px-3 py-2.5">Categoria</th>
                      <th className="px-3 py-2.5">Tipo</th>
                      <th className="px-3 py-2.5">Regra & Restrição</th>
                      <th className="px-3 py-2.5">Valor</th>
                      <th className="px-3 py-2.5">Origem & Seção</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(selectedDocForRules.interpreted_rules.rules as StructuredDocumentRule[]).map(
                      (rule) => {
                        const isActive = rule.status === 'ATIVA'
                        const isNeedsReview = rule.status === 'REVISAO_NECESSARIA'

                        return (
                          <tr key={rule.rule_id} className="hover:bg-muted/20">
                            <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                              <span className="font-semibold text-foreground">
                                {SGQ_INTERFERENCE_CATEGORY_LABELS[rule.category] || rule.category}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {getRuleTypeBadge(rule.rule_type)}
                            </td>
                            <td className="px-3 py-2.5 max-w-sm">
                              <div className="space-y-0.5">
                                <p className="font-medium text-foreground">
                                  {rule.action_or_restriction}
                                </p>
                                {rule.condition && (
                                  <p className="text-[11px] text-muted-foreground">
                                    Condição: {rule.condition}
                                  </p>
                                )}
                                {rule.ai_interpretation && (
                                  <p className="text-[10px] text-primary italic">
                                    Interpretação IA: {rule.ai_interpretation}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-mono">
                              {rule.value !== undefined ? `${rule.value} ${rule.unit || ''}` : '—'}
                            </td>
                            <td className="px-3 py-2.5 max-w-xs">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-[11px] text-foreground block">
                                  {rule.page_or_section || 'Seção'}
                                </span>
                                <span
                                  className="text-[10px] text-muted-foreground italic line-clamp-2"
                                  title={rule.source_excerpt}
                                >
                                  "{rule.source_excerpt}"
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {isNeedsReview ? (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                                  Revisão Necessária
                                </Badge>
                              ) : isActive ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                  Ativa
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-500 text-[10px]">
                                  Desativada
                                </Badge>
                              )}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-right">
                              {isActive ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleToggleRuleStatus(
                                      selectedDocForRules,
                                      rule.rule_id,
                                      'DESATIVADA',
                                    )
                                  }
                                  className="h-6 text-[10px] px-2 text-rose-700 hover:bg-rose-50"
                                >
                                  Desativar Regra
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleToggleRuleStatus(
                                      selectedDocForRules,
                                      rule.rule_id,
                                      'ATIVA',
                                    )
                                  }
                                  className="h-6 text-[10px] px-2 text-emerald-700 hover:bg-emerald-50"
                                >
                                  Validar Regra
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsRulesModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Documento de Referência */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Adicionar Documento de Referência da Linha {lineCode}
            </DialogTitle>
            <DialogDescription>
              Vincule um documento oficial do SGQ para atuar como diretriz técnica nas operações e
              regras desta linha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Aviso se a integração não estiver conectada */}
            {!sgqStatus.connected && (
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-amber-950">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  {sgqStatus.title}
                </div>
                <p className="text-xs leading-relaxed text-amber-800">
                  {sgqStatus.description || sgqStatus.message}
                </p>
              </div>
            )}

            {/* Filtros de busca no SGQ com todos os campos requisitados */}
            <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filtros de Pesquisa no SGQ
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Código do Documento</Label>
                  <Input
                    placeholder="Ex: PO-LAM-014"
                    value={searchFilters.code}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, code: e.target.value }))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Nome / Título</Label>
                  <Input
                    placeholder="Ex: Sequenciamento Trefila"
                    value={searchFilters.name}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, name: e.target.value }))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo de Documento</Label>
                  <Input
                    placeholder="Ex: Procedimento Operacional"
                    value={searchFilters.documentType}
                    onChange={(e) =>
                      setSearchFilters((f) => ({ ...f, documentType: e.target.value }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Processo</Label>
                  <Input
                    placeholder="Ex: Laminação"
                    value={searchFilters.process}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, process: e.target.value }))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Área Responsável</Label>
                  <Input
                    placeholder="Ex: Engenharia de Produção"
                    value={searchFilters.responsibleArea}
                    onChange={(e) =>
                      setSearchFilters((f) => ({ ...f, responsibleArea: e.target.value }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Revisão</Label>
                  <Input
                    placeholder="Ex: Rev.04"
                    value={searchFilters.revision}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, revision: e.target.value }))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Status SGQ</Label>
                  <Select
                    value={searchFilters.status}
                    onValueChange={(val: any) => setSearchFilters((f) => ({ ...f, status: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="VIGENTE">Vigente</SelectItem>
                      <SelectItem value="OBSOLETO">Obsoleto</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                      <SelectItem value="SUBSTITUIDO">Substituído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Palavra-chave</Label>
                  <Input
                    placeholder="Ex: setup, cadência, proibido"
                    value={searchFilters.keyword}
                    onChange={(e) => setSearchFilters((f) => ({ ...f, keyword: e.target.value }))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleSearchSgq}
                  disabled={isSearching}
                  className="h-8 text-xs gap-1.5"
                >
                  <Search className="h-3.5 w-3.5" />
                  {isSearching ? 'Consultando SGQ...' : 'Pesquisar Documentos'}
                </Button>
              </div>
            </div>

            {/* Resultados da busca */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Documentos Encontrados ({searchResults.length})
              </Label>
              {searchResults.length === 0 ? (
                <div className="p-6 border border-dashed rounded-lg text-center text-xs text-muted-foreground bg-muted/10">
                  {sgqStatus.connected
                    ? 'Nenhum documento encontrado com os filtros aplicados.'
                    : 'Nenhum documento listado porque o serviço do SGQ ainda não foi configurado.'}
                </div>
              ) : (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {searchResults.map((doc) => {
                    const isSelected = selectedDocToAdd?.id === doc.id
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDocToAdd(doc)}
                        className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-l-4 border-l-primary'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground">
                            {doc.code} — {doc.title}
                          </span>
                          <div className="text-muted-foreground flex items-center gap-3">
                            <span>Rev. {doc.revision}</span>
                            <span>{doc.responsibleArea || 'SGQ'}</span>
                            <span>{doc.status}</span>
                            {doc.isSimulatedHomologation && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                              >
                                Fonte de homologação / dados simulados
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Categorias de Interferência na Programação (Obrigatório ao menos 1) */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold text-foreground">
                Interferência na Programação da Linha (mínimo 1 categoria) *
              </Label>
              <p className="text-xs text-muted-foreground">
                Selecione as dimensões do planejamento produtivo em que as regras deste documento
                atuam.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {ALL_INTERFERENCE_CATEGORIES.map((cat) => {
                  const checked = selectedCategoriesToAdd.includes(cat)
                  return (
                    <label
                      key={cat}
                      className={`flex items-start gap-2.5 p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'bg-primary/5 border-primary/40'
                          : 'bg-muted/10 border-border/60 hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          toggleCategory(cat, selectedCategoriesToAdd, setSelectedCategoriesToAdd)
                        }
                        className="mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <span className="font-medium text-foreground">
                          {SGQ_INTERFERENCE_CATEGORY_LABELS[cat]}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSavingAdd}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmAdd}
              disabled={isSavingAdd || !selectedDocToAdd || selectedCategoriesToAdd.length === 0}
            >
              {isSavingAdd ? 'Salvando Vínculo...' : 'Vincular Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Categorias de Interferência */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Edit2 className="h-4 w-4 text-primary" />
              Editar Vínculo — {docToEdit?.document_code}
            </DialogTitle>
            <DialogDescription>
              Ajuste as categorias de interferência deste documento na programação da linha{' '}
              {lineCode}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/30 p-3 rounded border text-xs space-y-1">
              <div className="font-semibold text-foreground">{docToEdit?.title}</div>
              <div className="text-muted-foreground flex items-center gap-3">
                <span>Revisão: {docToEdit?.revision}</span>
                <span>Status: {docToEdit?.status}</span>
                <span>Origem: {docToEdit?.source}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Categorias de Interferência (mínimo 1 selecionada) *
              </Label>
              <div className="space-y-2">
                {ALL_INTERFERENCE_CATEGORIES.map((cat) => {
                  const checked = editCategories.includes(cat)
                  return (
                    <label
                      key={cat}
                      className={`flex items-start gap-2.5 p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'bg-primary/5 border-primary/40'
                          : 'bg-muted/10 border-border/60 hover:bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          toggleCategory(cat, editCategories, setEditCategories)
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-medium text-foreground">
                          {SGQ_INTERFERENCE_CATEGORY_LABELS[cat]}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSavingEdit}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmEdit}
              disabled={isSavingEdit || editCategories.length === 0}
            >
              {isSavingEdit ? 'Salvando Alterações...' : 'Salvar Vínculo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Remoção de Vínculo */}
      <AlertDialog open={!!docToRemove} onOpenChange={(open) => !open && setDocToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Remover Vínculo do Documento
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>
                Tem certeza de que deseja desvincular o documento{' '}
                <strong>{docToRemove?.document_code}</strong> ({docToRemove?.title}) da linha{' '}
                <strong>{lineCode}</strong>?
              </p>
              <p className="text-xs text-muted-foreground">
                Esta ação remove apenas a associação técnica no módulo PCP Robotizado. O documento
                original permanece intacto no repositório oficial do SGQ.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmRemove()
              }}
              disabled={isRemoving}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {isRemoving ? 'Removendo...' : 'Confirmar Remoção'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default LineReferenceDocumentsPanel

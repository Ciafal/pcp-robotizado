import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  RefreshCw,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Power,
  Layers,
  History,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Tag,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import {
  ProductionReferenceDocument,
  ProductionReferenceApplication,
  ProductionAiCategory,
  ProductionReferencePriority,
  PRODUCTION_REFERENCE_APPLICATIONS,
  PRODUCTION_AI_CATEGORIES,
  ProductionReferenceGovernanceLog,
} from '@/types/production-reference-documents'
import { productionControlReferenceDocsService } from '@/services/production-control-reference-docs-service'
import { SgqDocument, HOMOLOGATION_MOCK_DOCUMENTS } from '@/services/sgq-document-provider'
import { SgqDocumentMultiSelect } from '@/components/production-control/SgqDocumentMultiSelect'
import { Edit3 } from 'lucide-react'

export const ProductionReferenceDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<ProductionReferenceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterApplication, setFilterApplication] = useState<string>('ALL')
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedDocForDetail, setSelectedDocForDetail] =
    useState<ProductionReferenceDocument | null>(null)
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<ProductionReferenceDocument | null>(
    null,
  )
  const [selectedDocForHistory, setSelectedDocForHistory] =
    useState<ProductionReferenceDocument | null>(null)
  const [docHistoryLogs, setDocHistoryLogs] = useState<ProductionReferenceGovernanceLog[]>([])

  // Modal 4 Etapas de Associação
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [sgqSearchTerm, setSgqSearchTerm] = useState('')
  // Substituído de singular (selectedSgqDoc) para coleção multi-seleção de ponta a ponta (selectedSgqDocs)
  const [selectedSgqDocs, setSelectedSgqDocs] = useState<SgqDocument[]>([])
  const [selectedApplications, setSelectedApplications] = useState<
    ProductionReferenceApplication[]
  >([])
  const [selectedAiCategories, setSelectedAiCategories] = useState<ProductionAiCategory[]>([])
  const [criteriaCompany, setCriteriaCompany] = useState('')
  const [criteriaCenter, setCriteriaCenter] = useState('')
  const [criteriaLine, setCriteriaLine] = useState('')
  const [criteriaWorkCenter, setCriteriaWorkCenter] = useState('')
  const [criteriaMaterial, setCriteriaMaterial] = useState('')
  const [criteriaMovement, setCriteriaMovement] = useState('')
  const [criteriaSapMsg, setCriteriaSapMsg] = useState('')
  const [criteriaProcess, setCriteriaProcess] = useState('')
  const [priority, setPriority] = useState<ProductionReferencePriority>('ALTA')
  const [isPrimary, setIsPrimary] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Carregar documentos
  const loadDocs = async () => {
    try {
      setLoading(true)
      const data = await productionControlReferenceDocsService.listReferenceDocuments()
      setDocuments(data)
    } catch {
      toast({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível carregar os documentos de referência.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [])

  // Sincronizar SGQ
  const handleSyncSgq = async () => {
    try {
      setSyncing(true)
      const res = await productionControlReferenceDocsService.syncSgqAndCheckRevisions()
      await loadDocs()
      if (res.newRevisionsFound > 0) {
        toast({
          title: 'Sincronização SGQ concluída com alertas',
          description: `${res.newRevisionsFound} documento(s) com nova revisão disponível identificados no SGQ.`,
        })
      } else {
        toast({
          title: 'Sincronização SGQ concluída',
          description: `Todos os ${res.checkedCount} documentos estão com revisões alinhadas com o SGQ oficial.`,
        })
      }
    } catch {
      toast({
        title: 'Erro de sincronização',
        description: 'Falha ao sincronizar com catálogo do SGQ.',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  // Filtragem da tabela
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        doc.document_code.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q) ||
        doc.responsible_area?.toLowerCase().includes(q) ||
        doc.revision.toLowerCase().includes(q)

      const matchesApp =
        filterApplication === 'ALL' || doc.applications.some((app) => app === filterApplication)

      const matchesCat =
        filterCategory === 'ALL' || doc.ai_categories.some((cat) => cat === filterCategory)

      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ATIVO' && doc.active) ||
        (filterStatus === 'INATIVO' && !doc.active) ||
        (filterStatus === 'VIGENTE' && doc.status === 'VIGENTE') ||
        (filterStatus === 'OBSOLETO' && doc.status === 'OBSOLETO')

      return matchesSearch && matchesApp && matchesCat && matchesStatus
    })
  }, [documents, searchQuery, filterApplication, filterCategory, filterStatus])

  // Abrir histórico de governança
  const handleOpenHistory = async (doc: ProductionReferenceDocument) => {
    setSelectedDocForHistory(doc)
    try {
      const logs = await productionControlReferenceDocsService.getGovernanceLogs(doc.id)
      setDocHistoryLogs(logs)
    } catch {
      setDocHistoryLogs([])
    }
  }

  // Alternar ativo/inativo
  const handleToggleActive = async (id: string) => {
    try {
      const updated = await productionControlReferenceDocsService.toggleActive(id)
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)))
      toast({
        title: updated.active ? 'Associação Ativada' : 'Associação Inativada',
        description: `O documento ${updated.document_code} teve seu status alterado com sucesso.`,
      })
    } catch (e: any) {
      toast({
        title: 'Erro ao alterar status',
        description: e.message || 'Falha na operação.',
        variant: 'destructive',
      })
    }
  }

  // Remover associação
  const handleRemoveAssociation = async (doc: ProductionReferenceDocument) => {
    if (
      !confirm(
        `Deseja realmente remover a associação do documento "${doc.document_code}" no Controle de Produção?\n\nO documento oficial original do SGQ permanecerá intacto.`,
      )
    ) {
      return
    }

    try {
      await productionControlReferenceDocsService.removeReferenceDocument(doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      toast({
        title: 'Associação removida com sucesso',
        description: `O documento ${doc.document_code} não está mais associado ao Controle de Produção. O SGQ permanece inalterado.`,
      })
    } catch (e: any) {
      toast({
        title: 'Erro ao remover associação',
        description: e.message || 'Falha na operação.',
        variant: 'destructive',
      })
    }
  }

  // Aplicar nova revisão SGQ detectada
  const handleApplyNewRevision = async (id: string) => {
    try {
      const updated = await productionControlReferenceDocsService.applyNewRevision(id)
      setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)))
      toast({
        title: 'Nova revisão aplicada com sucesso',
        description: `O documento agora opera na revisão oficial ${updated.revision}.`,
      })
    } catch (e: any) {
      toast({
        title: 'Erro ao aplicar revisão',
        description: e.message || 'Falha ao aplicar nova revisão.',
        variant: 'destructive',
      })
    }
  }

  // Resetar Wizard
  const handleOpenAddModal = () => {
    setWizardStep(1)
    setSgqSearchTerm('')
    setSelectedSgqDocs([])
    setSelectedApplications([])
    setSelectedAiCategories([])
    setCriteriaCompany('')
    setCriteriaCenter('')
    setCriteriaLine('')
    setCriteriaWorkCenter('')
    setCriteriaMaterial('')
    setCriteriaMovement('')
    setCriteriaSapMsg('')
    setCriteriaProcess('')
    setPriority('ALTA')
    setIsPrimary(true)
    setIsActive(true)
    setIsAddModalOpen(true)
  }

  // Abrir Modal de Edição preservando todos os documentos vinculados
  const handleOpenEditModal = (doc: ProductionReferenceDocument) => {
    // Localizar documento correspondente no catálogo do SGQ
    const matchingSgq = HOMOLOGATION_MOCK_DOCUMENTS.find(
      (s) => s.code === doc.document_code || s.id === doc.document_ref,
    ) || {
      id: doc.document_ref || doc.id,
      code: doc.document_code,
      title: doc.title,
      revision: doc.revision,
      status: doc.status,
      documentType: doc.document_type || 'Procedimento',
      process: doc.process || 'Controle de Produção',
      responsibleArea: doc.responsible_area || 'PCP',
      validityDateStart: doc.validity_date_start,
      validityDateEnd: doc.validity_date_end,
      extractableContent: doc.extractable_content,
      isDemo: doc.is_demo,
    }

    // Identificar se há outros documentos compartilhando o mesmo contexto de critérios/aplicação
    const relatedDocs = documents
      .filter((d) => {
        if (d.id === doc.id) return true
        const sameApp =
          JSON.stringify(d.applications.sort()) === JSON.stringify(doc.applications.sort())
        const sameCrit = JSON.stringify(d.criteria || {}) === JSON.stringify(doc.criteria || {})
        return sameApp && sameCrit
      })
      .map((d) => {
        const found = HOMOLOGATION_MOCK_DOCUMENTS.find(
          (s) => s.code === d.document_code || s.id === d.document_ref,
        )
        return (
          found || {
            id: d.document_ref || d.id,
            code: d.document_code,
            title: d.title,
            revision: d.revision,
            status: d.status,
            documentType: d.document_type || 'Procedimento',
            process: d.process || 'Controle de Produção',
            responsibleArea: d.responsible_area || 'PCP',
            validityDateStart: d.validity_date_start,
            validityDateEnd: d.validity_date_end,
            extractableContent: d.extractable_content,
            isDemo: d.is_demo,
          }
        )
      })

    // Garante que o documento selecionado está incluso
    const allToLoad = relatedDocs.length > 0 ? relatedDocs : [matchingSgq]

    // Modo edição: carrega todos os documentos previamente associados
    setSelectedSgqDocs(allToLoad)
    setSelectedApplications(doc.applications || [])
    setSelectedAiCategories(doc.ai_categories || [])
    setCriteriaCompany(doc.criteria?.empresa || '')
    setCriteriaCenter(doc.criteria?.centro || '')
    setCriteriaLine(doc.criteria?.linha || '')
    setCriteriaWorkCenter(doc.criteria?.centro_trabalho || '')
    setCriteriaMaterial(doc.criteria?.material || '')
    setCriteriaMovement(doc.criteria?.tipo_movimento || '')
    setCriteriaSapMsg(doc.criteria?.codigo_mensagem_sap || '')
    setCriteriaProcess(doc.criteria?.processo || '')
    setPriority(doc.priority || 'ALTA')
    setIsPrimary(doc.is_primary)
    setIsActive(doc.active)
    setWizardStep(1)
    setIsAddModalOpen(true)
  }

  // Submissão do Wizard com suporte à coleção multi-seleção N:N
  const handleSaveAssociation = async () => {
    // Evita submissão concorrente/clique duplo rápido
    if (isSaving) return

    if (selectedSgqDocs.length === 0) {
      toast({
        title: 'Selecione pelo menos um documento',
        description: 'É necessário selecionar um ou mais documentos oficiais do SGQ na Etapa 1.',
        variant: 'destructive',
      })
      setWizardStep(1)
      return
    }

    if (selectedApplications.length === 0) {
      toast({
        title: 'Aplicação obrigatória',
        description: 'Selecione pelo menos uma aplicação no Controle de Produção na Etapa 2.',
        variant: 'destructive',
      })
      setWizardStep(2)
      return
    }

    try {
      setIsSaving(true)
      const payloadCriteria = {
        empresa: criteriaCompany || undefined,
        centro: criteriaCenter || undefined,
        linha: criteriaLine || undefined,
        centro_trabalho: criteriaWorkCenter || undefined,
        material: criteriaMaterial || undefined,
        tipo_movimento: criteriaMovement || undefined,
        codigo_mensagem_sap: criteriaSapMsg || undefined,
        processo: criteriaProcess || undefined,
      }

      const count = selectedSgqDocs.length
      const docCodesStr = selectedSgqDocs.map((d) => `${d.code} (${d.revision})`).join(', ')

      // 1. Enviar payload ao backend com coleção múltipla (documentosReferenciaIds)
      const createdDocs =
        await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
          sgq_docs: selectedSgqDocs,
          documentosReferenciaIds: selectedSgqDocs.map((d) => d.id),
          applications: selectedApplications,
          ai_categories: selectedAiCategories,
          criteria: payloadCriteria,
          priority,
          is_primary: isPrimary,
          active: isActive,
        })

      // 2. Validação rigorosa: backend deve retornar registros válidos
      if (!createdDocs || createdDocs.length === 0) {
        throw new Error('Nenhum registro retornado pelo serviço de persistência.')
      }

      // 3. Recarregar lista diretamente da consulta oficial (sem window.location.reload)
      // e atualizar estado local para exibição imediata na grade
      const freshDocs = await productionControlReferenceDocsService.listReferenceDocuments()
      setDocuments(freshDocs)

      // 4. Fechar o modal SOMENTE após sucesso confirmado da persistência
      setIsAddModalOpen(false)

      // 5. Exibir mensagem de sucesso seguindo estritamente as regras de negócio CIAFAL / HUB Industrial
      if (count === 1) {
        toast({
          title: 'Documento de referência associado com sucesso.',
          description: `✓ Associação salva com sucesso — ${docCodesStr} foi associado ao Controle de Produção.`,
        })
      } else {
        toast({
          title: `${count} documentos de referência associados com sucesso.`,
          description: `✓ Associações salvas com sucesso — ${count} documentos (${docCodesStr}) foram associados ao Controle de Produção.`,
        })
      }
    } catch (e: any) {
      // NÃO fecha o modal, NÃO mostra sucesso, mantém dados preenchidos no modal
      const rawErrorMsg =
        e?.message || e?.data?.message || 'Falha ao conectar com o serviço de persistência.'
      toast({
        title: 'Não foi possível salvar as associações.',
        description: `Motivo: ${rawErrorMsg}`,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Filtragem de documentos disponíveis do SGQ para associação
  const availableSgqDocs = useMemo(() => {
    const term = sgqSearchTerm.toLowerCase()
    return HOMOLOGATION_MOCK_DOCUMENTS.filter((doc) => {
      const matchText =
        doc.code.toLowerCase().includes(term) ||
        doc.title.toLowerCase().includes(term) ||
        doc.process?.toLowerCase().includes(term) ||
        doc.responsibleArea?.toLowerCase().includes(term)
      return matchText
    })
  }, [sgqSearchTerm])

  const toggleApplication = (app: ProductionReferenceApplication) => {
    setSelectedApplications((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app],
    )
  }

  const toggleAiCategory = (cat: ProductionAiCategory) => {
    setSelectedAiCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 space-y-6">
      {/* CABEÇALHO OFICIAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Controle de Produção CIAFAL
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Fonte Oficial: SGQ Informação Documentada
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-800" />
            Documentos de Referência — Controle de Produção
          </h1>
          <p className="text-sm text-slate-600 max-w-4xl">
            Documentos oficiais utilizados pela IA como regras, critérios e procedimentos para
            análise e tratamento das ocorrências do Controle de Produção.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncSgq}
            disabled={syncing}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-blue-600' : ''}`} />
            {syncing ? 'Sincronizando SGQ...' : 'Atualizar SGQ'}
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="bg-blue-800 hover:bg-blue-900 text-white font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />+ Adicionar Documento de Referência
          </Button>
        </div>
      </div>

      {/* CARDS DE RESUMO DE GOVERNANÇA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Documentos Associados
              </p>
              <h3 className="text-2xl font-bold text-slate-900">{documents.length}</h3>
              <p className="text-xs text-slate-500">Oficiais para a IA</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Revisões Vigentes
              </p>
              <h3 className="text-2xl font-bold text-emerald-700">
                {documents.filter((d) => d.status === 'VIGENTE' && d.active).length}
              </h3>
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Aptos para orientação IA
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Documentos Principais
              </p>
              <h3 className="text-2xl font-bold text-blue-900">
                {documents.filter((d) => d.is_primary).length}
              </h3>
              <p className="text-xs text-slate-500">Prioridade 1 em ocorrências</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Novas Revisões SGQ
              </p>
              <h3 className="text-2xl font-bold text-amber-600">
                {documents.filter((d) => d.has_new_revision_available).length}
              </h3>
              <p className="text-xs text-amber-600">Requerem validação</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BARRA DE FILTROS E PESQUISA */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Pesquisar por código, título, área, revisão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 text-sm focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Filter className="w-3.5 h-3.5" />
                Filtros:
              </div>

              {/* Filtro de Aplicação */}
              <select
                aria-label="Filtrar por Aplicação"
                value={filterApplication}
                onChange={(e) => setFilterApplication(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">Todas as Aplicações</option>
                {PRODUCTION_REFERENCE_APPLICATIONS.map((app) => (
                  <option key={app} value={app}>
                    {app}
                  </option>
                ))}
              </select>

              {/* Filtro de Categoria IA */}
              <select
                aria-label="Filtrar por Categoria IA"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">Todas as Categorias IA</option>
                {PRODUCTION_AI_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Filtro de Status */}
              <select
                aria-label="Filtrar por Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="VIGENTE">Vigente SGQ</option>
                <option value="OBSOLETO">Obsoleto SGQ</option>
              </select>

              {(searchQuery ||
                filterApplication !== 'ALL' ||
                filterCategory !== 'ALL' ||
                filterStatus !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterApplication('ALL')
                    setFilterCategory('ALL')
                    setFilterStatus('ALL')
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 h-8 px-2"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO PRINCIPAL: TABELA DE DOCUMENTOS ASSOCIADOS */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            Documentos Associados ({filteredDocuments.length})
          </CardTitle>
          <span className="text-xs text-slate-500">
            Hierarquia: Vigente &gt; Mais Específico &gt; Principal &gt; Maior Prioridade &gt;
            Revisão Mais Recente
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-sm">Carregando documentos associados...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                Nenhum documento de referência encontrado para os filtros selecionados.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddModal}
                className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                + Adicionar Documento de Referência
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-3">Revisão</th>
                    <th className="py-3 px-3">Aplicação no PCP</th>
                    <th className="py-3 px-3">Categoria IA</th>
                    <th className="py-3 px-3">Governança / Prioridade</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Última Atualização</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !doc.active ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* Documento */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-blue-900 font-mono text-xs">
                              {doc.document_code}
                            </span>
                            {doc.is_primary && (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0 font-medium">
                                Principal
                              </Badge>
                            )}
                            {doc.has_new_revision_available && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-amber-500 text-white border-amber-600 text-[10px] px-1.5 py-0 flex items-center gap-0.5 cursor-pointer">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Nova revisão
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                  {doc.new_revision_details?.impact_summary ||
                                    'Nova revisão detectada no SGQ.'}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-slate-800 font-medium line-clamp-1 max-w-md">
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{doc.process || 'Processo Industrial'}</span>
                            <span>•</span>
                            <span>{doc.responsible_area || 'PCP'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Revisão */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="font-mono text-xs border-slate-300">
                            {doc.revision}
                          </Badge>
                          {doc.revision_date && (
                            <p className="text-[11px] text-slate-400">
                              {new Date(doc.revision_date).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Aplicação */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {doc.applications.slice(0, 3).map((app) => (
                            <Badge
                              key={app}
                              variant="secondary"
                              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0 border border-slate-200"
                            >
                              {app}
                            </Badge>
                          ))}
                          {doc.applications.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-slate-500 px-1 py-0"
                            >
                              +{doc.applications.length - 3}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Categoria IA */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {doc.ai_categories.map((cat) => (
                            <Badge
                              key={cat}
                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </td>

                      {/* Governança / Prioridade */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                doc.priority === 'ALTA'
                                  ? 'bg-rose-500'
                                  : doc.priority === 'MEDIA'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                              }`}
                            />
                            <span className="text-xs font-semibold text-slate-700">
                              {doc.priority}
                            </span>
                          </div>
                          {doc.criteria?.codigo_mensagem_sap && (
                            <p className="text-[10px] font-mono text-slate-500">
                              SAP: {doc.criteria.codigo_mensagem_sap}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                                doc.active
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-300'
                              }`}
                            >
                              {doc.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] block ${
                              doc.status === 'VIGENTE'
                                ? 'text-emerald-600'
                                : 'text-rose-600 font-semibold'
                            }`}
                          >
                            SGQ: {doc.status}
                          </span>
                        </div>
                      </td>

                      {/* Última atualização */}
                      <td className="py-3 px-3">
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <p>
                            {doc.updated ? new Date(doc.updated).toLocaleDateString('pt-BR') : '—'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            por {doc.created_by_user_name || 'SGQ'}
                          </p>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botão de aplicar nova revisão se disponível */}
                          {doc.has_new_revision_available && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApplyNewRevision(doc.id)}
                                  className="h-7 px-2 text-[11px] bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3 text-amber-700" />
                                  Aplicar {doc.new_revision_details?.new_revision}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Aplicar nova revisão oficial do SGQ
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Editar Associação */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditModal(doc)}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-700 hover:bg-slate-100"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Editar associação</TooltipContent>
                          </Tooltip>

                          {/* Consultar Documento */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDocForDetail(doc)}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-700 hover:bg-slate-100"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Consultar documento</TooltipContent>
                          </Tooltip>

                          {/* Ver Histórico */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenHistory(doc)}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-700 hover:bg-slate-100"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Ver histórico de governança
                            </TooltipContent>
                          </Tooltip>

                          {/* Inativar / Reativar */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(doc.id)}
                                className={`h-8 w-8 p-0 ${
                                  doc.active
                                    ? 'text-slate-500 hover:text-amber-600'
                                    : 'text-emerald-600 hover:text-emerald-700'
                                } hover:bg-slate-100`}
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {doc.active ? 'Inativar associação' : 'Reativar associação'}
                            </TooltipContent>
                          </Tooltip>

                          {/* Remover associação */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAssociation(doc)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Remover associação do Controle de Produção
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 4 ETAPAS: ADICIONAR DOCUMENTO DE REFERÊNCIA */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-700" />
                  Adicionar Documento de Referência Oficial
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Seleção exclusiva a partir da fonte oficial do SGQ &gt; Informação Documentada
                </DialogDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-blue-200 text-blue-700">
                Etapa {wizardStep} de 4
              </Badge>
            </div>

            {/* Stepper horizontal */}
            <div className="grid grid-cols-4 gap-2 pt-4">
              {[
                { step: 1, label: '1. Documentos SGQ' },
                { step: 2, label: '2. Aplicação' },
                { step: 3, label: '3. Critérios' },
                { step: 4, label: '4. Governança' },
              ].map((s) => (
                <div
                  key={s.step}
                  onClick={() => {
                    // Navegação se já selecionou ao menos um doc
                    if (s.step === 1 || selectedSgqDocs.length > 0) {
                      setWizardStep(s.step as any)
                    }
                  }}
                  className={`text-center py-1.5 px-2 rounded cursor-pointer transition-colors border ${
                    wizardStep === s.step
                      ? 'bg-blue-800 text-white border-blue-800 font-semibold'
                      : s.step < wizardStep
                        ? 'bg-blue-50 text-blue-900 border-blue-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                  } text-xs`}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* ETAPA 1: COMBOBOX MULTI-SELECT DE DOCUMENTOS SGQ OFICIAIS */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    Documentos Oficiais do SGQ (Múltipla Seleção) *
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Selecione um ou mais procedimentos do SGQ. Todos os documentos derivam
                    diretamente da base SGQ homologada CIAFAL (sem uploads locais).
                  </p>
                </div>

                {/* Componente Multi-Select Combobox com Chips, Busca, Checkboxes e Contador */}
                <SgqDocumentMultiSelect
                  availableDocs={HOMOLOGATION_MOCK_DOCUMENTS}
                  selectedDocs={selectedSgqDocs}
                  onChange={(docs) => setSelectedSgqDocs(docs)}
                  placeholder="Pesquisar e selecionar documentos SGQ oficiais..."
                  id="wizard-sgq-docs-multi-select"
                />

                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-md text-xs text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <span>
                      {selectedSgqDocs.length === 0
                        ? 'Nenhum documento selecionado ainda.'
                        : `${selectedSgqDocs.length} documento(s) selecionado(s) para vinculação conjunta.`}
                    </span>
                  </div>
                  {selectedSgqDocs.length > 0 && (
                    <span className="font-mono font-semibold text-[11px] text-blue-950">
                      {selectedSgqDocs.map((d) => d.code).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 2: APLICAÇÃO E CATEGORIAS IA */}
            {wizardStep === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-700" />
                    Aplicação no Controle de Produção (Múltipla Seleção) *
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Indica em quais telas, relatórios ou processos este documento orientará a tomada
                    de decisão da IA.
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded border border-slate-200">
                    {PRODUCTION_REFERENCE_APPLICATIONS.map((app) => {
                      const active = selectedApplications.includes(app)
                      return (
                        <button
                          key={app}
                          type="button"
                          onClick={() => toggleApplication(app)}
                          className={`text-xs px-2.5 py-1 rounded transition-colors border ${
                            active
                              ? 'bg-blue-700 text-white border-blue-700 font-medium'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {app}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                    Categorias IA de Ocorrências (COGI, CO1P, Ordens, Apontamentos)
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Mapeamento direto com as categorias de erros e desvios detectados pelo HUB.
                  </p>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded border border-slate-200">
                    {PRODUCTION_AI_CATEGORIES.map((cat) => {
                      const active = selectedAiCategories.includes(cat)
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleAiCategory(cat)}
                          className={`text-xs px-2.5 py-1 rounded transition-colors border ${
                            active
                              ? 'bg-indigo-700 text-white border-indigo-700 font-medium'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {active ? '✓ ' : '+ '}
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: CRITÉRIOS DE APLICABILIDADE (OPCIONAIS) */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded text-xs text-blue-900">
                  <p className="font-semibold">Critérios de Refinamento (Opcionais)</p>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Se preenchidos, a IA dará prioridade máxima a este procedimento quando a
                    ocorrência corresponder exatamente a estes atributos técnicos do SAP.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Empresa / Filial</Label>
                    <Input
                      placeholder="Ex: CIAFAL Matriz (1000)"
                      value={criteriaCompany}
                      onChange={(e) => setCriteriaCompany(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Centro Fabril</Label>
                    <Input
                      placeholder="Ex: 1000, 2000"
                      value={criteriaCenter}
                      onChange={(e) => setCriteriaCenter(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Linha Produtiva</Label>
                    <Input
                      placeholder="Ex: L1, L2, Retrabalho"
                      value={criteriaLine}
                      onChange={(e) => setCriteriaLine(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Centro de Trabalho</Label>
                    <Input
                      placeholder="Ex: LAM-01, ACAB-L2"
                      value={criteriaWorkCenter}
                      onChange={(e) => setCriteriaWorkCenter(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">
                      Código do Material / Família
                    </Label>
                    <Input
                      placeholder="Ex: 1001234 ou Perfis Laminados"
                      value={criteriaMaterial}
                      onChange={(e) => setCriteriaMaterial(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Tipo de Movimento SAP</Label>
                    <Input
                      placeholder="Ex: 261, 101, 531, 311"
                      value={criteriaMovement}
                      onChange={(e) => setCriteriaMovement(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Código da Mensagem SAP</Label>
                    <Input
                      placeholder="Ex: M7021, M7043, RU010, M3018"
                      value={criteriaSapMsg}
                      onChange={(e) => setCriteriaSapMsg(e.target.value)}
                      className="text-xs h-8 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Processo Operacional</Label>
                    <Input
                      placeholder="Ex: Apontamento, Baixa de MP, Encerramento"
                      value={criteriaProcess}
                      onChange={(e) => setCriteriaProcess(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 4: GOVERNANÇA E PRIORIZAÇÃO */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-800">
                      Prioridade de Aplicação pela IA *
                    </Label>
                    <select
                      aria-label="Prioridade de Aplicação"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="ALTA">Alta (Diretriz Mandatória / Primária)</option>
                      <option value="MEDIA">Média (Diretriz Padrão)</option>
                      <option value="BAIXA">Baixa (Orientação Suplementar)</option>
                    </select>
                    <p className="text-[11px] text-slate-500">
                      A IA respeita: Documento Vigente &gt; Mais Específico &gt; Principal &gt;
                      Maior Prioridade &gt; Revisão Mais Recente.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="mt-0.5 rounded text-blue-700"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Documento principal para esta situação
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Se marcado, se sobrepõe a outros documentos genéricos da mesma categoria.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="mt-0.5 rounded text-blue-700"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Associação Ativa
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Documentos inativos não são consultados nas análises em tempo real.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <Card className="bg-slate-50 border-slate-200 p-3 space-y-2 text-xs">
                  <p className="font-semibold text-slate-800">
                    Resumo da Governança da Associação:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="font-medium text-slate-700">Documentos:</span>{' '}
                      {selectedSgqDocs.length > 0
                        ? selectedSgqDocs.map((d) => `${d.code} (${d.revision})`).join(', ')
                        : 'Nenhum'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Quantidade:</span>{' '}
                      {selectedSgqDocs.length} documento(s)
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Aplicações:</span>{' '}
                      {selectedApplications.join(', ') || 'Nenhuma'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Categorias IA:</span>{' '}
                      {selectedAiCategories.join(', ') || 'Nenhuma'}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Toda associação gera log de auditoria permanente com usuário, timestamp e
                    valores antes/depois.
                  </p>
                </Card>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <div>
              {wizardStep > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardStep((prev) => (prev - 1) as any)}
                  className="text-xs"
                >
                  Voltar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-slate-600"
              >
                Cancelar
              </Button>

              {wizardStep < 4 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    if (wizardStep === 1 && selectedSgqDocs.length === 0) {
                      toast({
                        title: 'Selecione um documento',
                        description:
                          'Escolha pelo menos um documento oficial do SGQ para prosseguir.',
                        variant: 'destructive',
                      })
                      return
                    }
                    if (wizardStep === 2 && selectedApplications.length === 0) {
                      toast({
                        title: 'Selecione uma aplicação',
                        description:
                          'Escolha pelo menos uma aplicação para o Controle de Produção.',
                        variant: 'destructive',
                      })
                      return
                    }
                    setWizardStep((prev) => (prev + 1) as any)
                  }}
                  className="bg-blue-800 hover:bg-blue-900 text-white text-xs flex items-center gap-1"
                >
                  Próxima Etapa <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSaveAssociation}
                  disabled={isSaving || selectedSgqDocs.length === 0}
                  className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-semibold"
                >
                  {isSaving
                    ? 'Salvando...'
                    : selectedSgqDocs.length === 1
                      ? 'Salvar 1 associação'
                      : `Salvar ${selectedSgqDocs.length} associações`}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONSULTA DETALHADA DO DOCUMENTO */}
      {selectedDocForDetail && (
        <Dialog
          open={Boolean(selectedDocForDetail)}
          onOpenChange={(open) => !open && setSelectedDocForDetail(null)}
        >
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white p-6">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-700" />
                    {selectedDocForDetail.document_code} — {selectedDocForDetail.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Fonte Oficial: {selectedDocForDetail.source || 'SGQ > Informação Documentada'}
                  </DialogDescription>
                </div>
                <Badge
                  className={`text-xs ${
                    selectedDocForDetail.status === 'VIGENTE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedDocForDetail.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="py-3 space-y-4 text-xs">
              {/* Metadados SGQ */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Revisão</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedDocForDetail.revision}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Data Revisão</span>
                  <span className="text-slate-800">
                    {selectedDocForDetail.revision_date || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">
                    Área Responsável
                  </span>
                  <span className="text-slate-800">
                    {selectedDocForDetail.responsible_area || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Processo</span>
                  <span className="text-slate-800">{selectedDocForDetail.process || '—'}</span>
                </div>
              </div>

              {/* Aplicação & Categorias */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block">
                  Aplicações no Controle de Produção:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDocForDetail.applications.map((app) => (
                    <Badge
                      key={app}
                      variant="secondary"
                      className="bg-slate-100 text-slate-700 text-xs"
                    >
                      {app}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Procedimento Oficial Extraído */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-700 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Procedimento Oficial Cadastrado para Orientação IA:
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-slate-800">
                  {selectedDocForDetail.extractable_content ||
                    'Procedimento operacional padrão em formato estruturado.'}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDocForDetail(null)}
                className="text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE HISTÓRICO DE GOVERNANÇA */}
      {selectedDocForHistory && (
        <Dialog
          open={Boolean(selectedDocForHistory)}
          onOpenChange={(open) => !open && setSelectedDocForHistory(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white p-6">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-700" />
                Histórico de Governança — {selectedDocForHistory.document_code}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Auditoria de todas as modificações, atualizações de revisão e status do vínculo
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3">
              {docHistoryLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhum log de governança adicional registrado para este documento.
                </div>
              ) : (
                <div className="space-y-3">
                  {docHistoryLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-900 font-mono text-[11px]">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {log.created ? new Date(log.created).toLocaleString('pt-BR') : '—'}
                        </span>
                      </div>
                      <p className="text-slate-700">{log.details}</p>
                      <p className="text-[10px] text-slate-400">
                        Responsável: {log.user_name || 'Sistema'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDocForHistory(null)}
                className="text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default ProductionReferenceDocumentsPage

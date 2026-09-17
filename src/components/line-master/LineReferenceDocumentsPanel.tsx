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
  Info,
  Calendar,
  Building2,
  Layers,
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
    message: '',
  })

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
      await lineReferenceDocumentsService.create({
        line_id: lineId,
        company_id: companyId,
        line_code: lineCode,
        document_ref: selectedDocToAdd.id,
        document_code: selectedDocToAdd.code,
        title: selectedDocToAdd.title,
        revision: selectedDocToAdd.revision,
        document_type: selectedDocToAdd.documentType,
        responsible_area: selectedDocToAdd.responsibleArea,
        validity_date: selectedDocToAdd.validityDate,
        status: selectedDocToAdd.status,
        source: 'SGQ',
        original_url: selectedDocToAdd.originalUrl,
        interference_categories: selectedCategoriesToAdd,
        active_revision_ref: selectedDocToAdd.activeRevisionRef,
      })

      // Toast somente após confirmação do backend
      toast({
        title: 'Documento vinculado com sucesso',
        description: `${selectedDocToAdd.code} vinculado à linha ${lineCode}.`,
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

      // Toast somente após confirmação do backend
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

      // Toast somente após confirmação do backend
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
            onClick={loadDocuments}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
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

      {/* Banner de status da integração com o SGQ */}
      {!sgqStatus.connected && (
        <Card className="border-amber-200 bg-amber-50/70 text-amber-900">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-amber-950">
                Integração SGQ Informação Documentada: Não Conectada
              </p>
              <p className="text-amber-800 leading-relaxed">{sgqStatus.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

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
              Fonte oficial: SGQ &gt; Informação Documentada
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
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
                      Interferência
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Vigência
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
                  {documents.map((doc) => (
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
                      <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>

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
                              Sem categoria definida
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vigência */}
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        {doc.validity_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {doc.validity_date}
                          </span>
                        ) : (
                          '—'
                        )}
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
                          {doc.original_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0"
                              title="Abrir no SGQ"
                            >
                              <a href={doc.original_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                <span className="sr-only">Abrir no SGQ</span>
                              </a>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="h-8 w-8 p-0 opacity-40"
                              title="Link original indisponível"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Link indisponível</span>
                            </Button>
                          )}

                          <Can permission="pcp.masterdata.edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(doc)}
                              className="h-8 w-8 p-0"
                              title="Editar categorias de interferência"
                            >
                              <Edit2 className="h-4 w-4 text-foreground" />
                              <span className="sr-only">Editar vínculo</span>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                  Integração SGQ &gt; Informação Documentada Pendente
                </div>
                <p className="text-xs leading-relaxed text-amber-800">{sgqStatus.message}</p>
                <div className="text-[11px] text-amber-700 font-medium">
                  Status: 0 documentos externos disponíveis no momento. Nenhum card fictício ou
                  simulado é gerado.
                </div>
              </div>
            )}

            {/* Filtros de busca no SGQ */}
            <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filtros de Consulta no SGQ
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
                    : 'Nenhum documento listado porque o serviço do SGQ ainda não foi conectado.'}
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
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Categorias de Interferência na Programação */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold text-foreground">
                Interferência na Programação da Linha (mínimo 1 categoria) *
              </Label>
              <p className="text-xs text-muted-foreground">
                Defina em quais aspectos de roteamento e planejamento este documento atua como
                regra.
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

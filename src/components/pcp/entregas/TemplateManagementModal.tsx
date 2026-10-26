import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Layers,
  Plus,
  Edit2,
  Copy,
  Eye,
  CheckCircle2,
  XCircle,
  Star,
  GitBranch,
  History,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
  Building2,
  Factory,
  Database,
  Calendar,
  Lock,
  Search,
} from 'lucide-react'
import {
  PCPMonthlySummaryTemplateRecord,
  SummaryTemplateSectionConfig,
  RealCenterOption,
  pcpMonthlySummaryService,
} from '@/services/pcp-monthly-summaries'
import { useAuth } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

interface TemplateManagementModalProps {
  isOpen: boolean
  onClose: () => void
  centers: RealCenterOption[]
  onTemplateSelected?: (template: PCPMonthlySummaryTemplateRecord) => void
}

const DATA_SOURCES_AVAILABLE = [
  'SAP ECC via RFC (ZSD28C / T001W / T001L)',
  'SAP MM MRP / Pátio de MP',
  'SAP PP / Ordens de Produção',
  'WMS / SAP MM Expedição',
  'Ficha Mestra / Cadastros Homologados',
  'Montagem da Programação',
  'Análise de Carteira',
  'Gestão de MP',
  'Programação de Parada',
  'Programação de Testes',
  'Controle de Produção / MES 4.0',
  'Histórico de Programações',
  'Entregas PCP',
  'Revisões / Auditoria PCP',
  'Indicadores / Governança',
  'Documentos de referência (SGQ)',
  'Informações editadas pelo Programador PCP',
  'Agente Nativo CIAFAL / Skip Cloud IA',
]

export const TemplateManagementModal: React.FC<TemplateManagementModalProps> = ({
  isOpen,
  onClose,
  centers,
  onTemplateSelected,
}) => {
  const { user, hasPermission } = useAuth()
  const role = String((user as any)?.role || '').toLowerCase()
  const hasDbPermission = Boolean(hasPermission && hasPermission('pcp.templates.manage'))
  const isFallbackAdminRole =
    role === 'admin' ||
    role === 'gestao' ||
    role === 'pcp' ||
    role === 'gerente_pcp' ||
    role === 'coordenador_pcp' ||
    role === 'pcp_programmer' ||
    role === 'pcp_admin' ||
    role === 'supervisor_pcp' ||
    role === 'aprovador_pcp' ||
    !user
  const canManageTemplates = hasDbPermission || isFallbackAdminRole

  // Estados principais
  const [activeTab, setActiveTab] = useState<'list' | 'line-configs' | 'schedules' | 'editor' | 'preview' | 'history'>('list')
  const [templates, setTemplates] = useState<PCPMonthlySummaryTemplateRecord[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PCPMonthlySummaryTemplateRecord | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState<string>('')

  // Formulário do editor de template
  const [formId, setFormId] = useState<string | null>(null)
  const [formCode, setFormCode] = useState<string>('')
  const [formNome, setFormNome] = useState<string>('')
  const [formDescricao, setFormDescricao] = useState<string>('')
  const [formEmpresa, setFormEmpresa] = useState<string>('CIAFAL')
  const [formLinha, setFormLinha] = useState<string>('ALL')
  const [formCentro, setFormCentro] = useState<string>('ALL')
  const [formAplicacao, setFormAplicacao] = useState<'GERAL' | 'EMPRESA' | 'LINHA' | 'CENTRO'>(
    'GERAL',
  )
  const [formStatus, setFormStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO')
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false)
  const [formVigenciaInicio, setFormVigenciaInicio] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )
  const [formVigenciaFim, setFormVigenciaFim] = useState<string>('')
  const [formSections, setFormSections] = useState<SummaryTemplateSectionConfig[]>([])
  const [formMotivo, setFormMotivo] = useState<string>('')

  // Carregar templates ao abrir
  const loadTemplates = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const list = await pcpMonthlySummaryService.listTemplates()
      setTemplates(list)
      setSelectedTemplate((prev) => {
        if (!prev && list.length > 0) return list[0]
        if (prev) {
          const updatedSelected = list.find((item) => item.id === prev.id)
          return updatedSelected || (list.length > 0 ? list[0] : null)
        }
        return null
      })
    } catch (err: any) {
      console.error('Erro ao carregar templates:', err)
      setErrorMsg('Falha ao carregar a lista de templates do Resumo Mensal.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  // Iniciar criação de novo template
  const handleStartCreate = () => {
    setFormId(null)
    setFormCode('Gerado automaticamente ao salvar')
    setFormNome('Novo Template Resumo Mensal')
    setFormDescricao('')
    setFormEmpresa('CIAFAL')
    setFormLinha('ALL')
    setFormCentro('ALL')
    setFormAplicacao('GERAL')
    setFormStatus('ATIVO')
    setFormIsDefault(false)
    setFormVigenciaInicio(new Date().toISOString().slice(0, 10))
    setFormVigenciaFim('')
    setFormSections(pcpMonthlySummaryService.getDefault18SectionsConfig())
    setFormMotivo('Criação de novo template customizado')
    setActiveTab('editor')
  }

  // Iniciar edição de template existente
  const handleStartEdit = (t: PCPMonthlySummaryTemplateRecord) => {
    setSelectedTemplate(t)
    setFormId(t.id)
    setFormCode(t.template_code)
    setFormNome(t.nome)
    setFormDescricao(t.descricao || '')
    setFormEmpresa(t.empresa_code || 'CIAFAL')
    setFormLinha(t.linha_code || 'ALL')
    setFormCentro(t.centro_code || 'ALL')
    setFormAplicacao(t.aplicacao || 'GERAL')
    setFormStatus(t.status)
    setFormIsDefault(t.is_default)
    setFormVigenciaInicio(t.vigencia_inicio || '')
    setFormVigenciaFim(t.vigencia_fim || '')
    setFormSections(
      JSON.parse(
        JSON.stringify(t.sections_config || pcpMonthlySummaryService.getDefault18SectionsConfig()),
      ),
    )
    setFormMotivo('Atualização de configurações do template')
    setActiveTab('editor')
  }

  // Abrir prévia do template
  const handleOpenPreview = (t: PCPMonthlySummaryTemplateRecord) => {
    setSelectedTemplate(t)
    setActiveTab('preview')
  }

  // Abrir histórico de alterações do template
  const handleOpenHistory = (t: PCPMonthlySummaryTemplateRecord) => {
    setSelectedTemplate(t)
    setActiveTab('history')
  }

  // Conversão da estrutura existente em Template Padrão Inicial
  const handleConvertInitial = async () => {
    setIsSaving(true)
    setErrorMsg(null)
    try {
      const created = await pcpMonthlySummaryService.convertCurrentStructureToInitialTemplate()
      await loadTemplates()
      setSelectedTemplate(created)
      setActiveTab('list')
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao converter estrutura atual em template padrão.')
    } finally {
      setIsSaving(false)
    }
  }

  // Alternar status Ativo/Inativo
  const handleToggleStatus = async (t: PCPMonthlySummaryTemplateRecord) => {
    try {
      const updated = await pcpMonthlySummaryService.toggleTemplateStatus(
        t.id,
        `Alteração de status via painel de parametrização`,
      )
      await loadTemplates()
      setSelectedTemplate(updated)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao alterar status do template.')
    }
  }

  // Definir como padrão
  const handleSetDefault = async (t: PCPMonthlySummaryTemplateRecord) => {
    try {
      const updated = await pcpMonthlySummaryService.setTemplateAsDefault(t.id)
      await loadTemplates()
      setSelectedTemplate(updated)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao definir template como padrão.')
    }
  }

  // Duplicar template
  const handleDuplicate = async (t: PCPMonthlySummaryTemplateRecord) => {
    try {
      const duplicated = await pcpMonthlySummaryService.duplicateTemplate(t.id)
      await loadTemplates()
      setSelectedTemplate(duplicated)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao duplicar template.')
    }
  }

  // Criar nova versão do template
  const handleCreateNewTemplateVersion = async (t: PCPMonthlySummaryTemplateRecord) => {
    const motivo = window.prompt(
      `Informe o motivo obrigatório para gerar nova versão a partir de ${t.versao_tag}:`,
      'Revisão periódica das diretrizes de geração do resumo',
    )
    if (!motivo || !motivo.trim()) return

    try {
      const newVersion = await pcpMonthlySummaryService.createNewTemplateVersion(
        t.id,
        motivo.trim(),
      )
      await loadTemplates()
      setSelectedTemplate(newVersion)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao gerar nova versão do template.')
    }
  }

  // Reordenação de seções: subir / descer
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= formSections.length) return

    const updated = [...formSections]
    const item = updated.splice(index, 1)[0]
    updated.splice(targetIndex, 0, item)

    // Recalcular ordens e números sequenciais
    const reordered = updated.map((sec, idx) => ({
      ...sec,
      order: idx + 1,
      number: String(idx + 1),
    }))
    setFormSections(reordered)
  }

  // Drag and drop HTML5 simples para seções
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return

    const updated = [...formSections]
    const item = updated.splice(draggedIndex, 1)[0]
    updated.splice(targetIndex, 0, item)

    const reordered = updated.map((sec, idx) => ({
      ...sec,
      order: idx + 1,
      number: String(idx + 1),
    }))
    setFormSections(reordered)
    setDraggedIndex(null)
  }

  // Atualização pontual de um campo de seção
  const handleUpdateSectionField = (
    index: number,
    field: keyof SummaryTemplateSectionConfig,
    value: any,
  ) => {
    const updated = [...formSections]
    updated[index] = {
      ...updated[index],
      [field]: value,
    }
    setFormSections(updated)
  }

  // Adicionar nova seção
  const handleAddSection = () => {
    const newOrder = formSections.length + 1
    const newSec: SummaryTemplateSectionConfig = {
      order: newOrder,
      number: String(newOrder),
      key: `custom_section_${Date.now()}`,
      title: 'Nova Seção Operacional',
      description: 'Descrição da seção e dados contemplados',
      ai_instruction:
        'Analise os dados consolidados da seção selecionada. Não invente informações. Quando não houver dados, informe explicitamente que não existem dados suficientes.',
      data_source: 'Informações editadas pelo Programador PCP',
      is_visible: true,
      allow_manual_edit: true,
      allow_ai_completion: true,
      is_mandatory: false,
    }
    setFormSections([...formSections, newSec])
  }

  // Remover seção
  const handleRemoveSection = (index: number) => {
    const sec = formSections[index]
    if (sec.is_mandatory) {
      alert('Esta seção está marcada como obrigatória e não pode ser excluída.')
      return
    }
    if (!window.confirm(`Deseja realmente remover a seção "${sec.title}"?`)) return

    const updated = formSections
      .filter((_, idx) => idx !== index)
      .map((s, idx) => ({
        ...s,
        order: idx + 1,
        number: String(idx + 1),
      }))
    setFormSections(updated)
  }

  // Salvar formulário do editor
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNome.trim()) {
      setErrorMsg('O nome do template é obrigatório.')
      return
    }
    if (!formVigenciaInicio) {
      setErrorMsg('A data de início da vigência é obrigatória.')
      return
    }

    setIsSaving(true)
    setErrorMsg(null)

    try {
      if (formId) {
        // Atualizar
        const updated = await pcpMonthlySummaryService.updateTemplate(formId, {
          nome: formNome.trim(),
          descricao: formDescricao.trim(),
          empresa_code: formEmpresa,
          linha_code: formLinha,
          centro_code: formCentro,
          aplicacao: formAplicacao,
          status: formStatus,
          is_default: formIsDefault,
          vigencia_inicio: formVigenciaInicio,
          vigencia_fim: formVigenciaFim || '',
          sections_config: formSections,
          motivo: formMotivo || 'Atualização salva via painel de parametrização',
        })
        setSelectedTemplate(updated)
      } else {
        // Criar
        const created = await pcpMonthlySummaryService.createTemplate({
          nome: formNome.trim(),
          descricao: formDescricao.trim(),
          tipo: 'Resumo Mensal PCP',
          empresa_code: formEmpresa,
          linha_code: formLinha,
          centro_code: formCentro,
          aplicacao: formAplicacao,
          status: formStatus,
          is_default: formIsDefault,
          vigencia_inicio: formVigenciaInicio,
          vigencia_fim: formVigenciaFim || '',
          sections_config: formSections,
        })
        setSelectedTemplate(created)
      }

      await loadTemplates()
      setActiveTab('list')
    } catch (err: any) {
      console.error('Erro ao salvar template:', err)
      setErrorMsg(err?.message || 'Falha ao salvar template de resumo mensal.')
    } finally {
      setIsSaving(false)
    }
  }

  // Filtragem na listagem
  const filteredTemplates = templates.filter((t) => {
    if (!searchFilter.trim()) return true
    const q = searchFilter.toLowerCase()
    return (
      t.nome.toLowerCase().includes(q) ||
      t.template_code.toLowerCase().includes(q) ||
      t.linha_code.toLowerCase().includes(q) ||
      t.centro_code.toLowerCase().includes(q) ||
      t.aplicacao.toLowerCase().includes(q)
    )
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(96vw,1300px)] max-w-[min(96vw,1300px)] max-h-[94vh] flex flex-col p-0 overflow-hidden shadow-2xl border-slate-200">
        <ErrorBoundary componentName="TemplateManagementModal">
          {/* Topo Azul Ciafal */}
          <DialogHeader className="p-4 border-b border-slate-200 bg-[#004C97] text-white shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-xs text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Parametrização de Templates do Resumo Mensal</span>
                    <Badge className="bg-white/20 text-white font-mono text-[10px] border-none">
                      {templates.length} Cadastrado(s)
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-blue-100/90 mt-0.5">
                    Definição hierárquica (Centro &rarr; Linha &rarr; Empresa &rarr; Geral) das
                    seções, fontes de dados e diretrizes de IA.
                  </DialogDescription>
                </div>
              </div>

              {canManageTemplates && activeTab === 'list' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleConvertInitial}
                    disabled={isSaving}
                    className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1.5 shadow-xs"
                    title="Converte as 18 seções mínimas em Template Institucional Padrão Oficial no banco de dados"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Converter Estrutura Atual em Template</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleStartCreate}
                    className="h-8 text-xs bg-white text-[#004C97] hover:bg-blue-50 font-bold gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Template</span>
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Abas Superiores de Navegação */}
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 shrink-0 flex items-center justify-between">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-auto"
            >
              <TabsList className="h-8 bg-slate-200/80 p-0.5 text-xs">
                <TabsTrigger value="list" className="text-xs h-7 gap-1.5 px-3">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Templates ({templates.length})</span>
                </TabsTrigger>
                <TabsTrigger value="line-configs" className="text-xs h-7 gap-1.5 px-3">
                  <Building className="w-3.5 h-3.5" />
                  <span>Configuração por Linha</span>
                </TabsTrigger>
                <TabsTrigger value="schedules" className="text-xs h-7 gap-1.5 px-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Agendamentos & Envios</span>
                </TabsTrigger>
                <TabsTrigger
                  value="editor"
                  disabled={!canManageTemplates}
                  className="text-xs h-7 gap-1.5 px-3"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{formId ? 'Editar Template' : 'Novo Template'}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  disabled={!selectedTemplate}
                  className="text-xs h-7 gap-1.5 px-3"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visualizar Prévia</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  disabled={
                    !selectedTemplate ||
                    !selectedTemplate.revisions_history ||
                    selectedTemplate.revisions_history.length === 0
                  }
                  className="text-xs h-7 gap-1.5 px-3"
                  title={
                    !selectedTemplate
                      ? 'Selecione um template para ver o histórico'
                      : !selectedTemplate.revisions_history ||
                          selectedTemplate.revisions_history.length === 0
                        ? 'Nenhum histórico registrado para este template'
                        : undefined
                  }
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Histórico de Alterações</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {!canManageTemplates && (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] gap-1"
              >
                <Lock className="w-3 h-3" />
                Modo Consulta (Somente Leitura)
              </Badge>
            )}
          </div>

          {/* Corpo com Rolagem Interna */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/50">
            {errorMsg && (
              <Alert
                variant="destructive"
                className="bg-rose-50 border-rose-300 text-rose-900 py-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <AlertDescription className="text-xs font-medium ml-2">{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* ABA: CONFIGURAÇÃO POR LINHA */}
            {activeTab === 'line-configs' && (
              <LineConfigTab
                templates={templates}
                canManage={canManageTemplates}
                onNavigateToSchedules={() => setActiveTab('schedules')}
              />
            )}

            {/* ABA: AGENDAMENTOS E ENVIOS */}
            {activeTab === 'schedules' && (
              <SchedulesAndRunsTab
                templates={templates}
                canManage={canManageTemplates}
              />
            )}

            {/* ABA 1: LISTA DE TEMPLATES */}
            {activeTab === 'list' && (
              <div className="space-y-3">
                {/* Barra de Filtro de Busca */}
                <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <Search className="w-4 h-4 text-slate-400 ml-1" />
                  <Input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por nome, código, linha, centro ou aplicação..."
                    className="h-8 text-xs border-none shadow-none focus-visible:ring-0 bg-transparent"
                  />
                  {searchFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchFilter('')}
                      className="h-7 text-xs text-slate-500"
                    >
                      Limpar
                    </Button>
                  )}
                </div>

                {isLoading ? (
                  <div className="p-12 text-center text-slate-500 bg-white border rounded-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-[#004C97] mx-auto mb-2" />
                    <span>Carregando templates homologados...</span>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-10 text-center bg-white border border-dashed rounded-lg space-y-3">
                    <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        Nenhum template cadastrado no momento
                      </div>
                      <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                        O Resumo Mensal está operando com a estrutura institucional padrão (18
                        seções mínimas). Você pode converter essa estrutura em um template
                        persistente agora.
                      </p>
                    </div>
                    {canManageTemplates && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={handleConvertInitial}
                          className="bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Converter Estrutura Atual em Template</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
                    <table className="w-full text-xs text-left min-w-[900px]">
                      <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Código / Nome</th>
                          <th className="py-2.5 px-3">Aplicação & Contexto</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Padrão</th>
                          <th className="py-2.5 px-3">Vigência</th>
                          <th className="py-2.5 px-3 text-center">Versão</th>
                          <th className="py-2.5 px-3 text-center">Seções</th>
                          <th className="py-2.5 px-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTemplates.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTemplate(t)}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                              selectedTemplate?.id === t.id ? 'bg-blue-50/70 font-medium' : ''
                            }`}
                          >
                            <td className="py-3 px-3 space-y-0.5">
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{t.nome}</span>
                                {t.is_default && (
                                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold">
                                    Padrão
                                  </Badge>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500">
                                {t.template_code}
                              </div>
                              {t.descricao && (
                                <div className="text-[10px] text-slate-600 line-clamp-1 max-w-sm">
                                  {t.descricao}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 space-y-0.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  t.aplicacao === 'CENTRO'
                                    ? 'bg-purple-50 text-purple-800 border-purple-300'
                                    : t.aplicacao === 'LINHA'
                                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                                      : t.aplicacao === 'EMPRESA'
                                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                                        : 'bg-slate-100 text-slate-800 border-slate-300'
                                }`}
                              >
                                {t.aplicacao}
                              </Badge>
                              <div className="text-[10px] text-slate-600">
                                Linha: <strong>{t.linha_code}</strong> &bull; Centro:{' '}
                                <strong>{t.centro_code}</strong>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                disabled={!canManageTemplates}
                                onClick={() => handleToggleStatus(t)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                  t.status === 'ATIVO'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={
                                  canManageTemplates ? 'Clique para alternar status' : undefined
                                }
                              >
                                {t.status === 'ATIVO' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                    <span>Ativo</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 text-slate-500" />
                                    <span>Inativo</span>
                                  </>
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {t.is_default ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                  <Star className="w-3.5 h-3.5 fill-emerald-600" />
                                  Sim
                                </span>
                              ) : canManageTemplates ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetDefault(t)}
                                  className="h-6 text-[10px] text-slate-500 hover:text-[#004C97] hover:bg-slate-100 px-2"
                                >
                                  Tornar Padrão
                                </Button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-[10px] font-mono text-slate-600">
                              <div>Início: {t.vigencia_inicio || '2025-01-01'}</div>
                              {t.vigencia_fim ? (
                                <div>Fim: {t.vigencia_fim}</div>
                              ) : (
                                <div className="text-slate-400">Sem data fim</div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <Badge variant="outline" className="font-mono text-xs bg-slate-50">
                                {t.versao_tag || 'V1.0'}
                              </Badge>
                            </td>

                            <td className="py-3 px-3 text-center font-bold text-slate-700">
                              {t.sections_config?.length || 18}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenPreview(t)}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Visualizar Template"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenHistory(t)}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                                  title="Histórico de Alterações"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </Button>

                                {canManageTemplates && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleStartEdit(t)}
                                      className="h-7 w-7 p-0 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      title="Editar Parâmetros & Seções"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDuplicate(t)}
                                      className="h-7 w-7 p-0 text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                                      title="Duplicar Template"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCreateNewTemplateVersion(t)}
                                      className="h-7 w-7 p-0 text-slate-600 hover:text-purple-700 hover:bg-purple-50"
                                      title="Criar Nova Versão do Template (V1.0 -> V2.0)"
                                    >
                                      <GitBranch className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: EDITOR DE TEMPLATE (PARÂMETROS & SEÇÕES COM DRAG-AND-DROP) */}
            {activeTab === 'editor' && canManageTemplates && (
              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Bloco 1: Metadados do Template */}
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-3">
                  <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider flex items-center justify-between">
                    <span>Parâmetros de Identificação & Regras de Seleção</span>
                    <span className="text-[10px] text-slate-400 font-mono">Código: {formCode}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Nome do Template *
                      </Label>
                      <Input
                        type="text"
                        value={formNome}
                        onChange={(e) => setFormNome(e.target.value)}
                        placeholder="Ex: Template Laminação Perfis e Tubos L1"
                        className="h-8 text-xs bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Tipo de Documento
                      </Label>
                      <Input
                        type="text"
                        value="Resumo Mensal PCP"
                        disabled
                        className="h-8 text-xs bg-slate-100 text-slate-600 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Nível de Aplicação
                      </Label>
                      <select
                        value={formAplicacao}
                        onChange={(e) => setFormAplicacao(e.target.value as any)}
                        className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
                      >
                        <option value="GERAL">Geral (Todos os Centros e Linhas)</option>
                        <option value="EMPRESA">Por Empresa (CIAFAL)</option>
                        <option value="LINHA">Por Linha de Produção</option>
                        <option value="CENTRO">Por Centro Industrial (Ficha Mestra)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Empresa</Label>
                      <select
                        value={formEmpresa}
                        onChange={(e) => setFormEmpresa(e.target.value)}
                        className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
                      >
                        <option value="CIAFAL">CIAFAL</option>
                        <option value="ALL">Todas</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Linha Produtiva
                      </Label>
                      <select
                        value={formLinha}
                        onChange={(e) => setFormLinha(e.target.value)}
                        className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
                      >
                        <option value="ALL">Todas as Linhas</option>
                        <option value="L1">Linha L1 (Tubos & Perfis Leves)</option>
                        <option value="L2">Linha L2 (Perfis & Estruturais)</option>
                        <option value="SDC">Linha SDC (Sidercentro)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Centro (Cadastros PCP)
                      </Label>
                      <select
                        value={formCentro}
                        onChange={(e) => setFormCentro(e.target.value)}
                        className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
                      >
                        <option value="ALL">Todos os Centros</option>
                        {centers.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Status</Label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
                      >
                        <option value="ATIVO">ATIVO</option>
                        <option value="INATIVO">INATIVO</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Início da Vigência *
                      </Label>
                      <Input
                        type="date"
                        value={formVigenciaInicio}
                        onChange={(e) => setFormVigenciaInicio(e.target.value)}
                        className="h-8 text-xs bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Fim da Vigência (Opcional)
                      </Label>
                      <Input
                        type="date"
                        value={formVigenciaFim}
                        onChange={(e) => setFormVigenciaFim(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-5">
                      <Switch
                        id="form-is-default"
                        checked={formIsDefault}
                        onCheckedChange={setFormIsDefault}
                      />
                      <Label
                        htmlFor="form-is-default"
                        className="text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        Template Padrão da Combinação
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Descrição do Template
                    </Label>
                    <Textarea
                      value={formDescricao}
                      onChange={(e) => setFormDescricao(e.target.value)}
                      placeholder="Finalidade e diretrizes do template..."
                      rows={2}
                      className="text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Motivo da Alteração / Criação
                    </Label>
                    <Input
                      type="text"
                      value={formMotivo}
                      onChange={(e) => setFormMotivo(e.target.value)}
                      placeholder="Registrado no log imutável de auditoria..."
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Bloco 2: Estrutura de Seções Configuráveis (Drag-and-Drop) */}
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                        Estrutura de Seções do Template ({formSections.length} configuradas)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Arraste para reordenar ou use os botões. Altere instruções de IA, fontes de
                        dados e permissões de edição.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddSection}
                      className="h-7 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Seção</span>
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {formSections.map((sec, idx) => (
                      <div
                        key={sec.key || idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`p-3 rounded-lg border transition-all ${
                          draggedIndex === idx
                            ? 'opacity-40 border-dashed border-[#004C97] bg-blue-50/50'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* Linha superior: Ordem, Título, Drag Handle e Ações */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-0.5"
                              title="Arraste para reordenar"
                            >
                              <GripVertical className="w-4 h-4" />
                            </span>

                            <Badge className="bg-[#004C97] text-white text-[10px] font-mono px-1.5 py-0 shrink-0">
                              #{sec.number || idx + 1}
                            </Badge>

                            <Input
                              type="text"
                              value={sec.title}
                              onChange={(e) =>
                                handleUpdateSectionField(idx, 'title', e.target.value)
                              }
                              placeholder="Título da Seção..."
                              className="h-7 text-xs font-bold text-slate-900 bg-white border-slate-300 max-w-sm"
                            />

                            {sec.is_mandatory && (
                              <Badge
                                variant="outline"
                                className="bg-rose-50 text-rose-800 border-rose-300 text-[9px] px-1.5 py-0 shrink-0"
                              >
                                Obrigatória
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={idx === 0}
                              onClick={() => handleMoveSection(idx, 'up')}
                              className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800"
                              title="Mover para cima"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={idx === formSections.length - 1}
                              onClick={() => handleMoveSection(idx, 'down')}
                              className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800"
                              title="Mover para baixo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </Button>

                            {!sec.is_mandatory && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveSection(idx)}
                                className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 ml-1"
                                title="Remover Seção"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Linha intermediária: Fonte de Dados, Descrição */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">
                              Fonte de Dados
                            </Label>
                            <select
                              value={sec.data_source}
                              onChange={(e) =>
                                handleUpdateSectionField(idx, 'data_source', e.target.value)
                              }
                              className="w-full h-7 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
                            >
                              {DATA_SOURCES_AVAILABLE.map((ds) => (
                                <option key={ds} value={ds}>
                                  {ds}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">
                              Descrição do Conteúdo
                            </Label>
                            <Input
                              type="text"
                              value={sec.description || ''}
                              onChange={(e) =>
                                handleUpdateSectionField(idx, 'description', e.target.value)
                              }
                              placeholder="Resumo dos dados apresentados..."
                              className="h-7 text-xs bg-white border-slate-300"
                            />
                          </div>
                        </div>

                        {/* Instruções para Geração por IA */}
                        <div className="pt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-indigo-900 uppercase flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              Instruções para Geração por IA
                            </Label>
                            <span className="text-[9px] text-slate-400">
                              Placeholder se vazio: "Não foram identificados dados suficientes..."
                            </span>
                          </div>
                          <Textarea
                            value={sec.ai_instruction || ''}
                            onChange={(e) =>
                              handleUpdateSectionField(idx, 'ai_instruction', e.target.value)
                            }
                            placeholder="Ex: Analise a carteira referente à linha selecionada... Não invente informações. Quando não houver dados, informe explicitamente que não existem dados suficientes."
                            rows={2}
                            className="text-xs bg-white border-indigo-200 focus:border-indigo-500"
                          />
                        </div>

                        {/* Flags de Configuração */}
                        <div className="flex flex-wrap items-center gap-4 pt-2.5 text-[11px] text-slate-700">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sec.is_mandatory}
                              onChange={(e) =>
                                handleUpdateSectionField(idx, 'is_mandatory', e.target.checked)
                              }
                              className="rounded text-[#004C97]"
                            />
                            <span>Obrigatória</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sec.is_visible}
                              onChange={(e) =>
                                handleUpdateSectionField(idx, 'is_visible', e.target.checked)
                              }
                              className="rounded text-[#004C97]"
                            />
                            <span>Exibir Seção</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sec.allow_manual_edit}
                              onChange={(e) =>
                                handleUpdateSectionField(idx, 'allow_manual_edit', e.target.checked)
                              }
                              className="rounded text-[#004C97]"
                            />
                            <span>Permitir Edição Manual</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sec.allow_ai_completion}
                              onChange={(e) =>
                                handleUpdateSectionField(
                                  idx,
                                  'allow_ai_completion',
                                  e.target.checked,
                                )
                              }
                              className="rounded text-[#004C97]"
                            />
                            <span>Permitir Complementação por IA</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botões do Rodapé do Editor */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('list')}
                    className="text-xs border-slate-300"
                  >
                    Voltar para a Lista
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-2 px-5 shadow-xs"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando Template...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Salvar Template Parametrizado</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* ABA 3: VISUALIZAR PRÉVIA DO TEMPLATE (SEM GRAVAR NADA) */}
            {activeTab === 'preview' && selectedTemplate && (
              <div className="space-y-4">
                {/* Cabeçalho da Prévia */}
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>{selectedTemplate.nome}</span>
                        <Badge className="bg-[#004C97] text-white font-mono text-xs">
                          {selectedTemplate.versao_tag || 'V1.0'}
                        </Badge>
                        {selectedTemplate.is_default && (
                          <Badge className="bg-emerald-600 text-white text-[10px]">Padrão</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        Código: {selectedTemplate.template_code} &bull; Aplicação:{' '}
                        <strong>{selectedTemplate.aplicacao}</strong> &bull; Linha:{' '}
                        <strong>{selectedTemplate.linha_code}</strong> &bull; Centro:{' '}
                        <strong>{selectedTemplate.centro_code}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-[#004C97] border-blue-200 text-xs"
                      >
                        Modo Prévia (Somente Leitura)
                      </Badge>
                    </div>
                  </div>

                  {selectedTemplate.descricao && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100">
                      {selectedTemplate.descricao}
                    </p>
                  )}
                </div>

                {/* Estrutura Ordenada de Seções e Comportamento da IA */}
                <div className="space-y-3">
                  <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                    Estrutura de Seções na Ordem de Execução (
                    {selectedTemplate.sections_config?.length || 18})
                  </div>

                  {selectedTemplate.sections_config?.map((sec, idx) => (
                    <div
                      key={sec.key || idx}
                      className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-800 text-white font-mono text-xs">
                            Seção {sec.number || idx + 1}
                          </Badge>
                          <span className="font-bold text-slate-900 text-xs">{sec.title}</span>
                          {sec.is_mandatory && (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-800 border-rose-300 text-[9px]"
                            >
                              Obrigatória
                            </Badge>
                          )}
                          {!sec.is_visible && (
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-slate-500 text-[9px]"
                            >
                              Oculta
                            </Badge>
                          )}
                        </div>

                        <div className="text-[11px] font-medium text-slate-500">
                          Fonte: <strong className="text-slate-800">{sec.data_source}</strong>
                        </div>
                      </div>

                      {sec.description && (
                        <div className="text-xs text-slate-600">{sec.description}</div>
                      )}

                      <div className="p-2.5 bg-indigo-50/60 rounded border border-indigo-100 text-xs space-y-1">
                        <div className="font-bold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>Diretriz de Geração por IA:</span>
                        </div>
                        <p className="text-indigo-900 text-[11px] leading-relaxed">
                          "
                          {sec.ai_instruction ||
                            'Preenchimento canônico dos dados a partir da fonte oficial sem mutação numérica.'}
                          "
                        </p>
                        <div className="text-[10px] text-slate-500 pt-0.5">
                          Placeholder quando não houver dados:{' '}
                          <span className="italic text-slate-600">
                            "Não foram identificados dados suficientes para esta análise no período
                            selecionado."
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1">
                        <span>
                          Edição Manual:{' '}
                          <strong>{sec.allow_manual_edit ? 'Permitida' : 'Bloqueada'}</strong>
                        </span>
                        &bull;
                        <span>
                          Complementação IA:{' '}
                          <strong>{sec.allow_ai_completion ? 'Habilitada' : 'Desabilitada'}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 4: HISTÓRICO DE ALTERAÇÕES DO TEMPLATE */}
            {activeTab === 'history' && selectedTemplate && (
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                  <div className="font-bold text-slate-900 text-xs">
                    Rastreabilidade Imutável: {selectedTemplate.nome} (
                    {selectedTemplate.template_code})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Histórico cronológico de revisões, ativações e incrementos de versão do
                    template.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
                  <table className="w-full text-xs text-left min-w-[650px]">
                    <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Versão</th>
                        <th className="py-2.5 px-3">Data / Hora</th>
                        <th className="py-2.5 px-3">Usuário</th>
                        <th className="py-2.5 px-3">Motivo da Alteração</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedTemplate.revisions_history || []).map((rev, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-[#004C97] font-mono">
                            {rev.versao_tag || 'V1.0'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{rev.data_hora}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {rev.usuario || 'Programador PCP'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {rev.motivo || 'Criação / Atualização de versão'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé Geral */}
          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Fechar Painel
            </Button>

            {onTemplateSelected && selectedTemplate && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onTemplateSelected(selectedTemplate)
                  onClose()
                }}
                className="text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Utilizar Template Selecionado</span>
              </Button>
            )}
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}

export default TemplateManagementModal

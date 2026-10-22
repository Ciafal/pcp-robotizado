import React, { useState, useEffect, useMemo } from 'react'
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Power,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  X,
  History,
  Building2,
  Layers,
  Boxes,
  Info,
  Trash2,
  Calendar,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  sapModelTypesService,
  SapModelType,
  SapModelTypeItem,
  SapCenterOption,
  SapWorkCenterOption,
  SapMaterialTypeOption,
  DUPLICATE_COMBINATION_ERROR_MSG,
} from '@/services/sap-model-types-service'
import { useAuth } from '@/contexts/AuthContext'

interface VinculadoDraft {
  tempId: string
  id?: string
  codigo_material: string
  descricao: string
  centro: string
  centro_trabalho: string
  tipo_material: string
  status: 'Ativo' | 'Inativo'
  data_inclusao?: string
  usuario_responsavel?: string
}

export const CodigosModelosPadraoTab: React.FC = () => {
  const { user: currentUser, can } = useAuth()

  // Permissões com suporte a papéis e governança do PCP
  const canManage = can?.('pcp.sap_validation.models.manage') ?? true
  const canView = can?.('pcp.sap_validation.models.view') ?? true

  // Dados principais
  const [modelTypes, setModelTypes] = useState<SapModelType[]>([])
  const [loading, setLoading] = useState(false)

  // Fontes de dados reutilizadas
  const [centros, setCentros] = useState<SapCenterOption[]>([])
  const [centrosTrabalho, setCentrosTrabalho] = useState<SapWorkCenterOption[]>([])
  const [tiposMaterial, setTiposMaterial] = useState<SapMaterialTypeOption[]>([])

  // Filtros de listagem
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipoNome, setFilterTipoNome] = useState('TODOS')
  const [filterCentro, setFilterCentro] = useState('TODOS')
  const [filterCentroTrabalho, setFilterCentroTrabalho] = useState('TODOS')
  const [filterTipoMaterial, setFilterTipoMaterial] = useState('TODOS')
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'Ativo' | 'Inativo'>('TODOS')
  const [filterCodigoSap, setFilterCodigoSap] = useState('')

  // Modal Principal: Novo / Editar / Visualizar
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  // Mensagens e erros no modal
  const [formError, setFormError] = useState<string | null>(null)
  const [duplicateExistingId, setDuplicateExistingId] = useState<string | null>(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null)

  // Campos do formulário
  const [formData, setFormData] = useState({
    tipo_codigo_modelo: '',
    descricao: '',
    centro: '',
    centro_trabalho: '',
    tipo_material: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
  })
  const [vinculadosDraft, setVinculadosDraft] = useState<VinculadoDraft[]>([])

  // Campos de adição de novo código vinculado
  const [newSapCode, setNewSapCode] = useState('')
  const [newSapDesc, setNewSapDesc] = useState('')

  // Modal de Histórico de Auditoria
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [selectedAuditModel, setSelectedAuditModel] = useState<SapModelType | null>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Diálogo de confirmação de Ativação/Inativação
  const [statusConfirmItem, setStatusConfirmItem] = useState<SapModelType | null>(null)
  const [statusJustificativa, setStatusJustificativa] = useState('')
  const [togglingStatus, setTogglingStatus] = useState(false)

  // 1. Carregar listas e dados
  const loadData = async () => {
    setLoading(true)
    try {
      const [typesList, cList, tmList] = await Promise.all([
        sapModelTypesService.listModelTypes(),
        sapModelTypesService.getCentros(),
        Promise.resolve(sapModelTypesService.getTiposMaterial()),
      ])
      setModelTypes(typesList)
      setCentros(cList)
      setTiposMaterial(tmList)

      const ctList = await sapModelTypesService.getCentrosTrabalho()
      setCentrosTrabalho(ctList)
    } catch (err) {
      console.error('Erro ao carregar dados de tipos de modelo SAP:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Quando o usuário seleciona um centro no formulário, refinar lista de centros de trabalho
  const centrosTrabalhoFiltradosModal = useMemo(() => {
    if (!formData.centro) return centrosTrabalho
    const w = formData.centro.trim().toUpperCase()
    const subset = centrosTrabalho.filter((ct) => {
      if (!ct.plant_code) return true
      return (
        ct.plant_code.toUpperCase().includes(w) ||
        w.includes(ct.plant_code.toUpperCase()) ||
        ct.code.toUpperCase().includes(w)
      )
    })
    return subset.length > 0 ? subset : centrosTrabalho
  }, [formData.centro, centrosTrabalho])

  // Cards de resumo no topo
  const resumoCards = useMemo(() => {
    const totalTipos = modelTypes.length
    const tiposAtivos = modelTypes.filter(
      (t) => t.status === 'Ativo' || t.status === 'ATIVO',
    ).length
    const tiposInativos = totalTipos - tiposAtivos
    const totalCodigosVinculados = modelTypes.reduce(
      (acc, t) => acc + (t.modelos_vinculados?.length || 0),
      0,
    )

    return {
      totalTipos,
      tiposAtivos,
      tiposInativos,
      totalCodigosVinculados,
    }
  }, [modelTypes])

  // Filtragem da tabela
  const filteredModelTypes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const codSapTerm = filterCodigoSap.trim().toLowerCase()

    return modelTypes.filter((mt) => {
      // 1. Termo de busca genérico: "Pesquisar tipo, centro, centro de trabalho ou código..."
      if (term) {
        const matchesType = mt.tipo_codigo_modelo.toLowerCase().includes(term)
        const matchesDesc = (mt.descricao || '').toLowerCase().includes(term)
        const matchesCentro = mt.centro.toLowerCase().includes(term)
        const matchesCT = mt.centro_trabalho.toLowerCase().includes(term)
        const matchesTM = mt.tipo_material.toLowerCase().includes(term)
        const matchesChildCode = (mt.modelos_vinculados || []).some(
          (c) =>
            c.codigo_material.toLowerCase().includes(term) ||
            (c.descricao || '').toLowerCase().includes(term),
        )

        if (
          !matchesType &&
          !matchesDesc &&
          !matchesCentro &&
          !matchesCT &&
          !matchesTM &&
          !matchesChildCode
        ) {
          return false
        }
      }

      // 2. Filtro específico por Tipo de Código Modelo
      if (filterTipoNome !== 'TODOS' && mt.tipo_codigo_modelo !== filterTipoNome) {
        return false
      }

      // 3. Filtro Centro
      if (filterCentro !== 'TODOS' && mt.centro !== filterCentro) {
        return false
      }

      // 4. Filtro Centro de Trabalho
      if (filterCentroTrabalho !== 'TODOS' && mt.centro_trabalho !== filterCentroTrabalho) {
        return false
      }

      // 5. Filtro Tipo de Material
      if (filterTipoMaterial !== 'TODOS' && mt.tipo_material !== filterTipoMaterial) {
        return false
      }

      // 6. Filtro Status
      if (filterStatus !== 'TODOS') {
        const mtStatusNorm = mt.status.toLowerCase() === 'ativo' ? 'Ativo' : 'Inativo'
        if (mtStatusNorm !== filterStatus) return false
      }

      // 7. Filtro específico por Código SAP
      if (codSapTerm) {
        const hasCode = (mt.modelos_vinculados || []).some((c) =>
          c.codigo_material.toLowerCase().includes(codSapTerm),
        )
        if (!hasCode) return false
      }

      return true
    })
  }, [
    modelTypes,
    searchTerm,
    filterTipoNome,
    filterCentro,
    filterCentroTrabalho,
    filterTipoMaterial,
    filterStatus,
    filterCodigoSap,
  ])

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setModalMode('create')
    setEditingId(null)
    setFormError(null)
    setDuplicateExistingId(null)
    setIsDirty(false)
    setFormData({
      tipo_codigo_modelo: '',
      descricao: '',
      centro: centros[0]?.code || '1001',
      centro_trabalho: centrosTrabalho[0]?.code || 'WC-DIV-L1',
      tipo_material: 'FERT',
      status: 'Ativo',
    })
    setVinculadosDraft([])
    setNewSapCode('')
    setNewSapDesc('')
    setModalOpen(true)
  }

  // Abrir modal de visualização ou edição
  const handleOpenEditOrView = (item: SapModelType, mode: 'edit' | 'view') => {
    setModalMode(mode)
    setEditingId(item.id)
    setFormError(null)
    setDuplicateExistingId(null)
    setIsDirty(false)

    setFormData({
      tipo_codigo_modelo: item.tipo_codigo_modelo,
      descricao: item.descricao || '',
      centro: item.centro,
      centro_trabalho: item.centro_trabalho,
      tipo_material: item.tipo_material,
      status: item.status === 'Ativo' || item.status === 'ATIVO' ? 'Ativo' : 'Inativo',
    })

    const drafts: VinculadoDraft[] = (item.modelos_vinculados || []).map((v) => ({
      tempId: v.id || `v-${Math.random()}`,
      id: v.id,
      codigo_material: v.codigo_material,
      descricao: v.descricao || '',
      centro: v.centro || item.centro,
      centro_trabalho: v.centro_trabalho || item.centro_trabalho,
      tipo_material: v.tipo_material || item.tipo_material,
      status: v.status === 'Ativo' || v.status === 'ATIVO' ? 'Ativo' : 'Inativo',
      data_inclusao: v.data_inclusao || v.created,
      usuario_responsavel: v.usuario_responsavel,
    }))

    setVinculadosDraft(drafts)
    setNewSapCode('')
    setNewSapDesc('')
    setModalOpen(true)
  }

  // Adicionar código SAP ao rascunho de vinculados
  const handleAddVinculado = () => {
    const code = newSapCode.trim()
    if (!code) return

    // Evitar duplicidade interna de código na mesma lista
    if (vinculadosDraft.some((v) => v.codigo_material.toLowerCase() === code.toLowerCase())) {
      setFormError(`O código SAP ${code} já está adicionado na lista de modelos vinculados.`)
      return
    }

    const newItem: VinculadoDraft = {
      tempId: `draft-${Date.now()}-${Math.random()}`,
      codigo_material: code,
      descricao: newSapDesc.trim() || `Material Homologado SAP ${code}`,
      centro: formData.centro,
      centro_trabalho: formData.centro_trabalho,
      tipo_material: formData.tipo_material,
      status: 'Ativo',
      data_inclusao: new Date().toISOString(),
      usuario_responsavel: currentUser?.name || currentUser?.email || 'PCP Engenharia',
    }

    setVinculadosDraft([...vinculadosDraft, newItem])
    setNewSapCode('')
    setNewSapDesc('')
    setFormError(null)
    setIsDirty(true)
  }

  // Remover código SAP do rascunho
  const handleRemoveVinculado = (tempId: string) => {
    setVinculadosDraft(vinculadosDraft.filter((v) => v.tempId !== tempId))
    setIsDirty(true)
  }

  // Alternar status de código vinculado no rascunho
  const handleToggleVinculadoStatus = (tempId: string) => {
    setVinculadosDraft(
      vinculadosDraft.map((v) => {
        if (v.tempId === tempId) {
          return { ...v, status: v.status === 'Ativo' ? 'Inativo' : 'Ativo' }
        }
        return v
      }),
    )
    setIsDirty(true)
  }

  // Salvar registro (Criar ou Editar)
  const handleSave = async () => {
    setFormError(null)
    setDuplicateExistingId(null)

    // Validações obrigatórias
    if (!formData.tipo_codigo_modelo.trim()) {
      setFormError('O campo "Tipo de Código Modelo" é obrigatório.')
      return
    }
    if (!formData.centro.trim()) {
      setFormError('O campo-chave "Centro" é obrigatório (ref. SAP WERKS).')
      return
    }
    if (!formData.centro_trabalho.trim()) {
      setFormError('O campo-chave "Centro de Trabalho" é obrigatório (ref. SAP ARBPL).')
      return
    }
    if (!formData.tipo_material.trim()) {
      setFormError('O campo-chave "Tipo de Material" é obrigatório (ref. SAP MARA-MTART).')
      return
    }

    setSaving(true)
    try {
      const usuarioNome = currentUser?.name || currentUser?.email || 'PCP Engenharia'

      if (modalMode === 'create') {
        const created = await sapModelTypesService.createModelType({
          tipo_codigo_modelo: formData.tipo_codigo_modelo,
          descricao: formData.descricao,
          centro: formData.centro,
          centro_trabalho: formData.centro_trabalho,
          tipo_material: formData.tipo_material,
          status: formData.status,
          usuario: usuarioNome,
          codigos_vinculados: vinculadosDraft.map((v) => ({
            codigo_material: v.codigo_material,
            descricao: v.descricao,
            centro: v.centro,
            centro_trabalho: v.centro_trabalho,
            tipo_material: v.tipo_material,
            status: v.status,
          })),
        })

        setFeedbackSuccess(
          `Tipo de Código Modelo '${created.tipo_codigo_modelo}' salvo com sucesso.`,
        )
        setModalOpen(false)
        await loadData()
      } else if (modalMode === 'edit' && editingId) {
        const updated = await sapModelTypesService.updateModelType(editingId, {
          tipo_codigo_modelo: formData.tipo_codigo_modelo,
          descricao: formData.descricao,
          centro: formData.centro,
          centro_trabalho: formData.centro_trabalho,
          tipo_material: formData.tipo_material,
          status: formData.status,
          usuario: usuarioNome,
          codigos_vinculados: vinculadosDraft.map((v) => ({
            id: v.id,
            codigo_material: v.codigo_material,
            descricao: v.descricao,
            centro: v.centro,
            centro_trabalho: v.centro_trabalho,
            tipo_material: v.tipo_material,
            status: v.status,
          })),
        })

        setFeedbackSuccess(
          `Tipo de Código Modelo '${updated.tipo_codigo_modelo}' salvo com sucesso.`,
        )
        setModalOpen(false)
        await loadData()
      }
    } catch (err: any) {
      console.error('Erro ao salvar Tipo de Código Modelo:', err)
      const msg = err?.data?.message || err?.message || 'Erro ao persistir registro.'
      setFormError(msg)
      if (err?.existingId || err?.data?.existingId) {
        setDuplicateExistingId(err.existingId || err.data.existingId)
      } else if (msg.includes('Já existe um Tipo de Código Modelo cadastrado')) {
        // Tenta achar o id duplicado no estado
        const dup = modelTypes.find(
          (m) =>
            m.centro === formData.centro &&
            m.centro_trabalho === formData.centro_trabalho &&
            m.tipo_material === formData.tipo_material &&
            (m.status === 'Ativo' || m.status === 'ATIVO') &&
            m.id !== editingId,
        )
        if (dup) setDuplicateExistingId(dup.id)
      }
    } finally {
      setSaving(false)
    }
  }

  // Ação de Cancelar modal
  const handleCancelModal = () => {
    if (modalMode === 'view') {
      setModalOpen(false)
      return
    }
    if (isDirty) {
      setDiscardConfirmOpen(true)
    } else {
      setModalOpen(false)
    }
  }

  const confirmDiscardChanges = () => {
    setDiscardConfirmOpen(false)
    setModalOpen(false)
    setIsDirty(false)
  }

  // Ação de Ativar / Inativar item
  const handlePromptToggleStatus = (item: SapModelType) => {
    setStatusConfirmItem(item)
    setStatusJustificativa('')
  }

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmItem) return
    setTogglingStatus(true)
    try {
      const nextStatus = statusConfirmItem.status === 'Ativo' ? 'Inativo' : 'Ativo'
      const usuarioNome = currentUser?.name || currentUser?.email || 'PCP Engenharia'

      await sapModelTypesService.toggleStatus(
        statusConfirmItem.id,
        statusJustificativa.trim() || undefined,
        usuarioNome,
      )

      setFeedbackSuccess(
        `Tipo de Código Modelo '${statusConfirmItem.tipo_codigo_modelo}' alterado para ${nextStatus} com sucesso.`,
      )
      setStatusConfirmItem(null)
      await loadData()
    } catch (err: any) {
      alert(err?.message || 'Erro ao alterar status do tipo de código modelo.')
    } finally {
      setTogglingStatus(false)
    }
  }

  // Abrir histórico de auditoria
  const handleOpenAuditHistory = async (item: SapModelType) => {
    setSelectedAuditModel(item)
    setAuditModalOpen(true)
    setLoadingAudit(true)
    try {
      const logs = await sapModelTypesService.getAuditHistory(item.id)
      setAuditLogs(logs)
    } finally {
      setLoadingAudit(false)
    }
  }

  // Ir diretamente para visualização do cadastro duplicado existente
  const handleViewExistingDuplicate = async (existingId: string) => {
    const item = modelTypes.find((m) => m.id === existingId)
    if (item) {
      handleOpenEditOrView(item, 'view')
    } else {
      const fetched = await sapModelTypesService.getModelTypeById(existingId)
      if (fetched) {
        handleOpenEditOrView(fetched, 'view')
      }
    }
  }

  // Formatação de data/hora pt-BR (dd/mm/aaaa hh:mm)
  const formatDateTimePtBr = (iso?: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      const ano = d.getFullYear()
      const hora = String(d.getHours()).padStart(2, '0')
      const min = String(d.getMinutes()).padStart(2, '0')
      return `${dia}/${mes}/${ano} ${hora}:${min}`
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner de Feedback de Sucesso */}
      {feedbackSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFeedbackSuccess(null)}
            className="text-emerald-800 hover:bg-emerald-100 h-7 text-xs"
          >
            Fechar
          </Button>
        </div>
      )}

      {/* 1. CARDS DE RESUMO NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Tipos */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total de Tipos de Código Modelo
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Boxes className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-slate-900">{resumoCards.totalTipos}</div>
            <p className="text-[11px] text-slate-500 mt-1">Configurações de modelos cadastradas</p>
          </CardContent>
        </Card>

        {/* Tipos Ativos */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Tipos Ativos
            </CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-700">{resumoCards.tiposAtivos}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Utilizados como referência nas validações
            </p>
          </CardContent>
        </Card>

        {/* Tipos Inativos */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tipos Inativos
            </CardTitle>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <Power className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-slate-600">{resumoCards.tiposInativos}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Preservados para auditoria (não-referência)
            </p>
          </CardContent>
        </Card>

        {/* Códigos Modelo Vinculados */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Códigos Modelo Cadastrados
            </CardTitle>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
              <FileCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-indigo-700">
              {resumoCards.totalCodigosVinculados}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Materiais SAP vinculados aos tipos</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. BARRA DE CABEÇALHO, AÇÃO NOVO E FILTROS */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Tipos de Código Modelo Padrão
                </CardTitle>
                <Badge variant="outline" className="bg-white text-slate-700 border-slate-300">
                  Regra SAP: WERKS + ARBPL + MARA-MTART
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cada tipo define a regra técnica de referência pelo trio <strong>Centro</strong> +{' '}
                <strong>Centro de Trabalho</strong> + <strong>Tipo de Material</strong>, agregando
                um ou múltiplos códigos SAP oficiais para validação cadastral.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="text-slate-700 h-9"
              >
                <RotateCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              {canManage && (
                <Button
                  onClick={handleOpenCreateModal}
                  size="sm"
                  className="bg-[#004C97] hover:bg-[#003870] text-white font-medium h-9 shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />+ Novo Tipo de Código Modelo
                </Button>
              )}
            </div>
          </div>

          {/* Linha de Busca Principal e Filtros Combinados */}
          <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Campo de Busca Texto */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Pesquisar tipo, centro, centro de trabalho ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white"
                />
              </div>

              {/* Filtro por Código SAP específico */}
              <div className="md:col-span-2 relative">
                <Input
                  placeholder="Filtrar por Código SAP..."
                  value={filterCodigoSap}
                  onChange={(e) => setFilterCodigoSap(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
              </div>

              {/* Filtro por Centro (WERKS) */}
              <div className="md:col-span-2">
                <Select value={filterCentro} onValueChange={setFilterCentro}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Centro (WERKS)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos os Centros</SelectItem>
                    {centros.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} — {c.name.split('—')[1] || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Centro de Trabalho (ARBPL) */}
              <div className="md:col-span-2">
                <Select value={filterCentroTrabalho} onValueChange={setFilterCentroTrabalho}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Centro de Trab. (ARBPL)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos Centros Trab.</SelectItem>
                    {centrosTrabalho.map((ct) => (
                      <SelectItem key={ct.code} value={ct.code}>
                        {ct.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Tipo de Material (MTART) */}
              <div className="md:col-span-1">
                <Select value={filterTipoMaterial} onValueChange={setFilterTipoMaterial}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Tipo Mat." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {tiposMaterial.map((tm) => (
                      <SelectItem key={tm.code} value={tm.code}>
                        {tm.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Status */}
              <div className="md:col-span-1">
                <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Status: Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* 3. LISTAGEM EM TABELA */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tipo de Código Modelo</th>
                  <th className="py-3 px-3">Centro</th>
                  <th className="py-3 px-3">Centro de Trabalho</th>
                  <th className="py-3 px-3">Tipo de Material</th>
                  <th className="py-3 px-3 text-center">Nº de Modelos</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Última Alteração</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      <RotateCw className="w-5 h-5 mx-auto mb-2 animate-spin text-slate-400" />
                      Carregando configurações de códigos modelos padrão...
                    </td>
                  </tr>
                ) : filteredModelTypes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      <Info className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                      <p className="font-semibold text-slate-700">
                        Nenhum Tipo de Código Modelo encontrado
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tente ajustar os filtros ou cadastre um novo Tipo de Código Modelo pelo
                        botão acima.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredModelTypes.map((item) => {
                    const isAtivo = item.status === 'Ativo' || item.status === 'ATIVO'
                    const vinculadosCount = item.modelos_vinculados?.length || 0

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Tipo de Código Modelo + Descrição */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {item.tipo_codigo_modelo}
                          </div>
                          {item.descricao && (
                            <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                              {item.descricao}
                            </div>
                          )}
                        </td>

                        {/* Centro (WERKS) */}
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className="font-mono text-xs bg-slate-50 text-slate-700"
                          >
                            {item.centro}
                          </Badge>
                        </td>

                        {/* Centro de Trabalho (ARBPL) */}
                        <td className="py-3 px-3">
                          <span className="font-mono font-medium text-slate-800">
                            {item.centro_trabalho}
                          </span>
                        </td>

                        {/* Tipo de Material (MARA-MTART) */}
                        <td className="py-3 px-3">
                          <Badge
                            variant="secondary"
                            className="bg-indigo-50 text-indigo-700 border-indigo-200 font-mono text-[11px]"
                          >
                            {item.tipo_material}
                          </Badge>
                        </td>

                        {/* Nº de Modelos Vinculados */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              vinculadosCount > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {vinculadosCount} {vinculadosCount === 1 ? 'modelo' : 'modelos'}
                          </span>
                        </td>

                        {/* Status (Ativo / Inativo) */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isAtivo
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAtivo ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {isAtivo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        {/* Data da Última Alteração */}
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          <div>{formatDateTimePtBr(item.updated || item.created)}</div>
                          {item.atualizado_por && (
                            <div className="text-[10px] text-slate-400">
                              por {item.atualizado_por}
                            </div>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Visualizar */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              onClick={() => handleOpenEditOrView(item, 'view')}
                              title="Visualizar Tipo de Código Modelo"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Editar */}
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                onClick={() => handleOpenEditOrView(item, 'edit')}
                                title="Editar Tipo de Código Modelo"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Ativar / Inativar */}
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 w-8 p-0 ${
                                  isAtivo
                                    ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                }`}
                                onClick={() => handlePromptToggleStatus(item)}
                                title={
                                  isAtivo
                                    ? 'Inativar Tipo de Código Modelo'
                                    : 'Ativar Tipo de Código Modelo'
                                }
                              >
                                <Power className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Histórico / Auditoria */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              onClick={() => handleOpenAuditHistory(item)}
                              title="Ver Trilha de Auditoria e Governança"
                            >
                              <History className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. MODAL GRANDE E RESPONSIVO "+ Novo Tipo de Código Modelo" / "Editar" / "Visualizar" */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && handleCancelModal()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {modalMode === 'create'
                    ? 'Novo Tipo de Código Modelo'
                    : modalMode === 'edit'
                      ? `Editar Tipo de Código Modelo: ${formData.tipo_codigo_modelo}`
                      : `Visualizar Tipo de Código Modelo: ${formData.tipo_codigo_modelo}`}
                  {formData.status && (
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        formData.status === 'Ativo'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {formData.status}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Configure o identificador por Centro (WERKS) + Centro de Trabalho (ARBPL) + Tipo
                  de Material (MARA-MTART) e vincule os códigos SAP de referência.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Bloco de Erro / Duplicidade */}
            {formError && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="font-semibold text-red-950">{formError}</p>
                  {duplicateExistingId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white border-red-300 text-red-800 hover:bg-red-100 h-7 text-xs font-medium"
                      onClick={() => handleViewExistingDuplicate(duplicateExistingId)}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Ver cadastro existente
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* SEÇÃO 1: IDENTIFICAÇÃO */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                <Boxes className="w-4 h-4 text-[#004C97]" />
                Identificação do Modelo
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Tipo de Código Modelo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ex.: Produto acabado L1, Matéria-prima, Semi-acabado fornos..."
                    value={formData.tipo_codigo_modelo}
                    disabled={modalMode === 'view'}
                    onChange={(e) => {
                      setFormData({ ...formData, tipo_codigo_modelo: e.target.value })
                      setIsDirty(true)
                    }}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-slate-400">
                    Nome descritivo livre. Não limita a aplicação técnica.
                  </p>
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Status</Label>
                  <Select
                    value={formData.status}
                    disabled={modalMode === 'view'}
                    onValueChange={(val: any) => {
                      setFormData({ ...formData, status: val })
                      setIsDirty(true)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo (Utilizado nas validações)</SelectItem>
                      <SelectItem value="Inativo">Inativo (Não utilizado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-12 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Descrição (Opcional)
                  </Label>
                  <Input
                    placeholder="Descrição detalhada dos propósitos ou família de itens deste tipo de modelo..."
                    value={formData.descricao}
                    disabled={modalMode === 'view'}
                    onChange={(e) => {
                      setFormData({ ...formData, descricao: e.target.value })
                      setIsDirty(true)
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: CAMPOS-CHAVE VISUAIS PARA IDENTIFICAÇÃO DO MODELO */}
            <div className="space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  Campos-chave para identificação do modelo
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Esta combinação é a regra estrita utilizada pelo motor de Validação SAP para
                  localizar o código de referência oficial. Não é descrição textual do material.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Centro (WERKS) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Centro (ref. SAP WERKS) <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.centro}
                    disabled={modalMode === 'view'}
                    onValueChange={(val) => {
                      setFormData({ ...formData, centro: val })
                      setIsDirty(true)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Selecione o Centro" />
                    </SelectTrigger>
                    <SelectContent>
                      {centros.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">
                    Fonte: plants e line_masters existentes
                  </p>
                </div>

                {/* 2. Centro de Trabalho (ARBPL) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Centro de Trabalho (ref. ARBPL) <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.centro_trabalho}
                    disabled={modalMode === 'view'}
                    onValueChange={(val) => {
                      setFormData({ ...formData, centro_trabalho: val })
                      setIsDirty(true)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Selecione o Centro de Trabalho" />
                    </SelectTrigger>
                    <SelectContent>
                      {centrosTrabalhoFiltradosModal.map((ct) => (
                        <SelectItem key={ct.code} value={ct.code}>
                          {ct.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">
                    Filtrado pelo Centro quando tecnicamente vinculado
                  </p>
                </div>

                {/* 3. Tipo de Material (MARA-MTART) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Tipo de Material (ref. MARA-MTART) <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.tipo_material}
                    disabled={modalMode === 'view'}
                    onValueChange={(val) => {
                      setFormData({ ...formData, tipo_material: val })
                      setIsDirty(true)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="Selecione o MTART" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposMaterial.map((tm) => (
                        <SelectItem key={tm.code} value={tm.code}>
                          {tm.code} — {tm.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">
                    Classificação oficial de material SAP
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 3: CÓDIGOS MODELO VINCULADOS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#004C97]" />
                    Códigos Modelo Vinculados ({vinculadosDraft.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Códigos SAP homologados a serem usados como modelo de referência para este Tipo.
                  </p>
                </div>
              </div>

              {/* Formulário de inclusão de código */}
              {modalMode !== 'view' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-4 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Código do Material SAP (MATNR)
                    </Label>
                    <Input
                      placeholder="Ex.: 10004521"
                      value={newSapCode}
                      onChange={(e) => setNewSapCode(e.target.value)}
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-5 space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Descrição do Material
                    </Label>
                    <Input
                      placeholder="Ex.: TUBO RETANGULAR 50X30X2,00MM SAE 1020"
                      value={newSapDesc}
                      onChange={(e) => setNewSapDesc(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddVinculado}
                      className="w-full h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />+ Adicionar Código Modelo
                    </Button>
                  </div>
                </div>
              )}

              {/* Tabela de Códigos Vinculados */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Código SAP</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-2">Centro</th>
                      <th className="py-2.5 px-2">Centro Trab.</th>
                      <th className="py-2.5 px-2">Tipo Mat.</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                      <th className="py-2.5 px-3">Data Inclusão</th>
                      <th className="py-2.5 px-3">Responsável</th>
                      {modalMode !== 'view' && <th className="py-2.5 px-3 text-right">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {vinculadosDraft.length === 0 ? (
                      <tr>
                        <td
                          colSpan={modalMode !== 'view' ? 9 : 8}
                          className="py-6 text-center text-slate-400"
                        >
                          Nenhum código SAP vinculado ainda. Adicione pelo formulário acima.
                        </td>
                      </tr>
                    ) : (
                      vinculadosDraft.map((item) => (
                        <tr key={item.tempId} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {item.codigo_material}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                            {item.descricao || '—'}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-600">
                            {item.centro || formData.centro}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-600">
                            {item.centro_trabalho || formData.centro_trabalho}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-600">
                            {item.tipo_material || formData.tipo_material}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.status === 'Ativo'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {formatDateTimePtBr(item.data_inclusao)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {item.usuario_responsavel || '—'}
                          </td>
                          {modalMode !== 'view' && (
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                                  onClick={() => handleToggleVinculadoStatus(item.tempId)}
                                  title="Alternar Status"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  onClick={() => handleRemoveVinculado(item.tempId)}
                                  title="Remover Código"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              {modalMode === 'edit' &&
                'Atualização persistida na mesma chave sem duplicar registro.'}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelModal}
                disabled={saving}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>

              {modalMode === 'view' ? (
                canManage && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setModalMode('edit')}
                    className="h-9 text-xs bg-[#004C97] hover:bg-[#003870] text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                    Editar
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium"
                >
                  {saving ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. DIÁLOGO DE CONFIRMAÇÃO DE DESCARTAR ALTERAÇÕES */}
      <Dialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Descartar alterações?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Você possui modificações não salvas neste Tipo de Código Modelo. Deseja realmente
              descartar as alterações feitas?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiscardConfirmOpen(false)}
              className="text-xs"
            >
              Continuar editando
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDiscardChanges}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. DIÁLOGO DE ATIVAR / INATIVAR */}
      <Dialog
        open={!!statusConfirmItem}
        onOpenChange={(open) => !open && setStatusConfirmItem(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Power className="w-5 h-5 text-amber-500" />
              {statusConfirmItem?.status === 'Ativo'
                ? `Inativar Tipo de Código Modelo?`
                : `Ativar Tipo de Código Modelo?`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2 leading-relaxed">
              {statusConfirmItem?.status === 'Ativo' ? (
                <>
                  Ao inativar <strong>{statusConfirmItem?.tipo_codigo_modelo}</strong>, o registro
                  será <strong>preservado integralmente</strong> para fins de governança e
                  auditoria, porém <strong>NÃO</strong> será mais utilizado como referência em novas
                  validações SAP.
                </>
              ) : (
                <>
                  Deseja reativar <strong>{statusConfirmItem?.tipo_codigo_modelo}</strong> como
                  modelo ativo de referência?
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Justificativa da Ação (Opcional)
            </Label>
            <Input
              placeholder="Motivo da alteração de status..."
              value={statusJustificativa}
              onChange={(e) => setStatusJustificativa(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusConfirmItem(null)}
              disabled={togglingStatus}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmToggleStatus}
              disabled={togglingStatus}
              className={`text-xs text-white ${
                statusConfirmItem?.status === 'Ativo'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {togglingStatus
                ? 'Processando...'
                : statusConfirmItem?.status === 'Ativo'
                  ? 'Confirmar Inativação'
                  : 'Confirmar Ativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL DE HISTÓRICO DE AUDITORIA E GOVERNANÇA */}
      <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-[#004C97]" />
              Trilha de Auditoria & Governança Imutável
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Histórico rastreável de criação, alterações, ativações e vinculações do tipo{' '}
              <strong>{selectedAuditModel?.tipo_codigo_modelo}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingAudit ? (
              <div className="py-8 text-center text-slate-500">
                <RotateCw className="w-5 h-5 mx-auto mb-2 animate-spin text-slate-400" />
                Carregando registros de auditoria...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum registro de auditoria gravado para este tipo de modelo ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-bold text-[#004C97]">{log.action || 'REGISTRO'}</span>
                      <span className="font-mono text-[11px]">
                        {formatDateTimePtBr(log.created)}
                      </span>
                    </div>

                    <div className="text-slate-700">
                      <strong>Usuário:</strong>{' '}
                      {log.user_name || log.user_email || 'PCP Engenharia'}
                    </div>

                    {log.reason && (
                      <div className="text-slate-600">
                        <strong>Motivo/Justificativa:</strong> {log.reason}
                      </div>
                    )}

                    {log.details && (
                      <div className="mt-2 pt-2 border-t border-slate-200 font-mono text-[11px] text-slate-600 bg-white p-2 rounded border">
                        <pre className="whitespace-pre-wrap">
                          {typeof log.details === 'string'
                            ? log.details
                            : JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-200 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuditModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CodigosModelosPadraoTab

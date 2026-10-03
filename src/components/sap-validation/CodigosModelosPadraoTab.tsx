import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search,
  Plus,
  Edit2,
  Power,
  Filter,
  RefreshCw,
  Building2,
  Factory,
  Layers,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Tag,
  Calendar,
  User,
  Info,
} from 'lucide-react'
import { pb } from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SapStandardModelRecord, SapStandardModelInput } from '@/types/sap-validation'
import {
  sapStandardModelsService,
  MaterialSuggestionItem,
} from '@/services/sap-standard-models-service'
import { sapWerksService, SapWerksItem } from '@/services/sap-werks-service'
import { formatNumberPtBr } from '@/lib/number-format'

interface CompanyOption {
  id: string
  code: string
  name: string
}

interface LineOption {
  id: string
  code: string
  name: string
}

const COMMON_MATERIAL_TYPES = [
  { code: 'ZHAL', label: 'ZHAL — Semi-Acabado / Tarugos / Perfis Intermediários' },
  { code: 'ZFER', label: 'ZFER — Produto Acabado Laminado / Trefilado' },
  { code: 'ROH', label: 'ROH — Matéria-Prima / Sucata / Tarugos Brutos' },
  { code: 'HALB', label: 'HALB — Produto Semi-Acabado Padrão' },
  { code: 'FERT', label: 'FERT — Produto Acabado' },
  { code: 'VERP', label: 'VERP — Material de Embalagem' },
  { code: 'ZROH', label: 'ZROH — Matéria-Prima Especial' },
]

export const CodigosModelosPadraoTab: React.FC = () => {
  const [models, setModels] = useState<SapStandardModelRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [lines, setLines] = useState<LineOption[]>([])
  const [werksList, setWerksList] = useState<SapWerksItem[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('TODOS')
  const [filterCompany, setFilterCompany] = useState('TODAS')
  const [filterLine, setFilterLine] = useState('TODAS')
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS')

  // Modal de Cadastro/Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<SapStandardModelRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null)

  // Campos do formulário
  const [formData, setFormData] = useState<SapStandardModelInput>({
    material_code: '',
    description: '',
    material_type: 'ZHAL',
    line_id: '',
    line_code: '',
    company_id: '',
    company_code: '',
    company_name: '',
    center: '',
    status: 'ATIVO',
    notes: '',
  })

  // Sugestões de busca de código no formulário
  const [codeQuery, setCodeQuery] = useState('')
  const [codeSuggestions, setCodeSuggestions] = useState<MaterialSuggestionItem[]>([])
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false)
  const [searchingCatalog, setSearchingCatalog] = useState(false)
  const suggestionContainerRef = useRef<HTMLDivElement>(null)

  // Diálogo de confirmação de Ativação/Inativação
  const [statusConfirmModel, setStatusConfirmModel] = useState<SapStandardModelRecord | null>(null)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Carregar dados de apoio e modelos
  const loadInitialData = async () => {
    setLoading(true)
    try {
      // 1. Carregar modelos
      const records = await sapStandardModelsService.listModels()
      setModels(records)

      // 2. Carregar Empresas do HUB
      try {
        const compRecords = await pb.collection('companies').getFullList({
          sort: 'name',
          requestKey: null,
        })
        const mappedComps: CompanyOption[] = compRecords.map((c: any) => ({
          id: c.id,
          code: c.code || c.id,
          name: c.name || c.code || 'Empresa',
        }))
        setCompanies(mappedComps)
      } catch {
        setCompanies([
          { id: 'ciafal-matriz', code: '1000', name: 'CIAFAL Matriz' },
          { id: 'sidercentro', code: '2000', name: 'Sidercentro' },
        ])
      }

      // 3. Carregar Linhas do PCP Robotizado
      try {
        const lineRecords = await pb.collection('production_lines').getFullList({
          filter: 'is_active = true',
          sort: 'name',
          requestKey: null,
        })
        const mappedLines: LineOption[] = lineRecords.map((l: any) => ({
          id: l.id,
          code: l.code || l.name,
          name: l.name || l.code,
        }))
        setLines(mappedLines)
      } catch {
        setLines([
          { id: 'L1', code: 'L1', name: 'Linha 1 — Conformação Tubos' },
          { id: 'L2', code: 'L2', name: 'Linha 2 — Perfis Pesados' },
        ])
      }

      // 4. Carregar Centros WERKS SAP
      try {
        const werksRes = await sapWerksService.getWerksList()
        setWerksList(werksRes.items || [])
      } catch {
        setWerksList([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionContainerRef.current &&
        !suggestionContainerRef.current.contains(e.target as Node)
      ) {
        setShowCodeSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Busca de sugestões de código ao digitar no modal
  useEffect(() => {
    if (!codeQuery || codeQuery.trim().length < 2) {
      setCodeSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingCatalog(true)
      try {
        const res = await sapStandardModelsService.searchMaterialsCatalog(codeQuery)
        setCodeSuggestions(res)
      } finally {
        setSearchingCatalog(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [codeQuery])

  // Abrir modal para novo cadastro
  const handleOpenCreateModal = () => {
    setEditingModel(null)
    setFormError(null)
    setCodeQuery('')
    setCodeSuggestions([])
    setFormData({
      material_code: '',
      description: '',
      material_type: 'ZHAL',
      line_id: lines[0]?.id || '',
      line_code: lines[0]?.code || '',
      company_id: companies[0]?.id || '',
      company_code: companies[0]?.code || '',
      company_name: companies[0]?.name || '',
      center: werksList[0]?.werks || '1001',
      status: 'ATIVO',
      notes: '',
    })
    setModalOpen(true)
  }

  // Abrir modal para edição
  const handleOpenEditModal = (model: SapStandardModelRecord) => {
    setEditingModel(model)
    setFormError(null)
    setCodeQuery(model.material_code)
    setCodeSuggestions([])
    setFormData({
      material_code: model.material_code,
      description: model.description || '',
      material_type: model.material_type,
      line_id: model.line_id,
      line_code: model.line_code || '',
      company_id: model.company_id,
      company_code: model.company_code || '',
      company_name: model.company_name || '',
      center: model.center,
      status: model.status,
      notes: model.notes || '',
    })
    setModalOpen(true)
  }

  // Salvar formulário (Criar ou Editar)
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.material_code.trim()) {
      setFormError('O código do material é obrigatório.')
      return
    }
    if (!formData.material_type.trim()) {
      setFormError('O tipo de material (MARA-MTART) é obrigatório.')
      return
    }
    if (!formData.line_id.trim()) {
      setFormError('A linha de produção é obrigatória.')
      return
    }
    if (!formData.company_id.trim()) {
      setFormError('A empresa é obrigatória.')
      return
    }
    if (!formData.center.trim()) {
      setFormError('O centro SAP (WERKS) é obrigatório.')
      return
    }

    setSaving(true)
    try {
      // Complementar dados de empresa e linha caso necessário
      const selectedComp = companies.find((c) => c.id === formData.company_id)
      const selectedLine = lines.find((l) => l.id === formData.line_id)

      const payload: SapStandardModelInput = {
        ...formData,
        company_code: selectedComp?.code || formData.company_code,
        company_name: selectedComp?.name || formData.company_name,
        line_code: selectedLine?.code || formData.line_code,
      }

      if (editingModel) {
        const res = await sapStandardModelsService.updateModel(editingModel.id, payload)
        if (!res.success) {
          setFormError(res.error || 'Falha ao atualizar código modelo.')
          return
        }
        setFeedbackSuccess(`Código Modelo ${res.record?.material_code} atualizado com sucesso.`)
      } else {
        const res = await sapStandardModelsService.createModel(payload)
        if (!res.success) {
          setFormError(res.error || 'Falha ao cadastrar código modelo.')
          return
        }
        setFeedbackSuccess(`Código Modelo ${res.record?.material_code} cadastrado com sucesso.`)
      }

      setModalOpen(false)
      await loadInitialData()

      // Limpar feedback após 4 segundos
      setTimeout(() => setFeedbackSuccess(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  // Confirmar alteração de status (Ativar/Inativar)
  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmModel) return
    const nextStatus = statusConfirmModel.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'

    setTogglingStatus(true)
    try {
      const res = await sapStandardModelsService.toggleStatus(statusConfirmModel.id, nextStatus)
      if (res.success) {
        if (nextStatus === 'INATIVO') {
          setFeedbackSuccess(
            `Código Modelo ${statusConfirmModel.material_code} inativado com sucesso.`,
          )
        } else {
          setFeedbackSuccess(
            `Código Modelo ${statusConfirmModel.material_code} ativado com sucesso.`,
          )
        }
        await loadInitialData()
        setTimeout(() => setFeedbackSuccess(null), 4000)
      } else {
        alert(res.error || 'Não foi possível alterar o status.')
      }
    } finally {
      setTogglingStatus(false)
      setStatusConfirmModel(null)
    }
  }

  // Filtragem da lista
  const filteredModels = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return models.filter((m) => {
      // Filtro texto: código, descrição, centro, linha, empresa
      if (term) {
        const matchText =
          m.material_code.toLowerCase().includes(term) ||
          (m.description || '').toLowerCase().includes(term) ||
          m.center.toLowerCase().includes(term) ||
          (m.line_code || '').toLowerCase().includes(term) ||
          (m.company_name || '').toLowerCase().includes(term) ||
          (m.company_code || '').toLowerCase().includes(term)
        if (!matchText) return false
      }

      // Filtro tipo material
      if (filterType !== 'TODOS' && m.material_type !== filterType) {
        return false
      }

      // Filtro empresa
      if (filterCompany !== 'TODAS' && m.company_id !== filterCompany) {
        return false
      }

      // Filtro linha
      if (filterLine !== 'TODAS' && m.line_id !== filterLine) {
        return false
      }

      // Filtro status
      if (filterStatus !== 'TODOS' && m.status !== filterStatus) {
        return false
      }

      return true
    })
  }, [models, searchTerm, filterType, filterCompany, filterLine, filterStatus])

  // Formatação de data/hora no padrão pt-BR
  const formatDateTime = (isoDate?: string) => {
    if (!isoDate) return '—'
    try {
      const d = new Date(isoDate)
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return isoDate
    }
  }

  return (
    <div className="space-y-5">
      {/* Mensagem de Feedback de Sucesso */}
      {feedbackSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-semibold">
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

      {/* Card de Apresentação / Header da Aba */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#004C97]/10 text-[#004C97] shrink-0 mt-0.5">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Códigos Modelos Padrão de Referência
                <Badge
                  variant="outline"
                  className="bg-white border-slate-300 text-slate-700 text-[10px]"
                >
                  {models.length} cadastrados
                </Badge>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Defina os códigos SAP já homologados a serem sugeridos automaticamente como modelo
                durante a validação de novos cadastros (priorizando Tipo de Material, Empresa,
                Centro e Linha).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={loadInitialData}
              disabled={loading}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs gap-1.5 h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs gap-1.5 h-9 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Código Modelo
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* BARRA DE BUSCA E FILTROS RESPONSIVA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Busca Textual */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar por código SAP, descrição, centro ou linha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-300"
              />
            </div>

            {/* Filtro Tipo Material */}
            <div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Tipo de Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Tipos (MTART)</SelectItem>
                  {COMMON_MATERIAL_TYPES.map((t) => (
                    <SelectItem key={t.code} value={t.code}>
                      {t.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Linha */}
            <div>
              <Select value={filterLine} onValueChange={setFilterLine}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Linha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as Linhas</SelectItem>
                  {lines.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Status */}
            <div>
              <Select
                value={filterStatus}
                onValueChange={(val) => setFilterStatus(val as 'TODOS' | 'ATIVO' | 'INATIVO')}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos os Status</SelectItem>
                  <SelectItem value="ATIVO">Somente Ativos</SelectItem>
                  <SelectItem value="INATIVO">Somente Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TABELA RESPONSIVA / LISTA DE CARDS PARA DISPOSITIVOS MÓVEIS */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#004C97]" />
              <span className="text-xs">Carregando códigos modelos padrão...</span>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-slate-700 font-semibold text-sm">
                Nenhum código modelo padrão encontrado.
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchTerm || filterType !== 'TODOS' || filterStatus !== 'TODOS'
                  ? 'Ajuste os filtros de busca para visualizar outros registros.'
                  : 'Cadastre o primeiro código modelo homologado para orientar o PCP durante a validação.'}
              </p>
              {!searchTerm && (
                <Button
                  size="sm"
                  onClick={handleOpenCreateModal}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Primeiro Modelo
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* VISÃO DESKTOP/NOTEBOOK/TABLET: Tabela com rolagem interna contida */}
              <div className="hidden md:block border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-[520px] overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 py-3">Código SAP</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3">Descrição</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3">
                          Tipo (MTART)
                        </TableHead>
                        <TableHead className="font-bold text-slate-700 py-3">Linha</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3">Empresa</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3">Centro</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3">Status</TableHead>
                        <TableHead className="font-bold text-slate-700 py-3">
                          Criado em / Por
                        </TableHead>
                        <TableHead className="font-bold text-slate-700 py-3 text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModels.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <TableCell className="font-mono font-bold text-slate-900 py-2.5">
                            {item.material_code}
                          </TableCell>
                          <TableCell
                            className="max-w-xs truncate text-slate-700 py-2.5 font-medium"
                            title={item.description}
                          >
                            {item.description || '—'}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] bg-slate-50 border-slate-300"
                            >
                              {item.material_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 text-slate-700">
                            {item.line_code || item.line_id}
                          </TableCell>
                          <TableCell className="py-2.5 text-slate-700">
                            {item.company_name || item.company_code || 'CIAFAL'}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] bg-blue-50 text-[#004C97] border-blue-200"
                            >
                              {item.center}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge
                              className={`text-[10px] ${
                                item.status === 'ATIVO'
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-slate-400 text-white hover:bg-slate-500'
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 text-slate-500 text-[11px]">
                            <div>{formatDateTime(item.created)}</div>
                            <div className="text-[10px] text-slate-400">
                              {item.created_by_user_name || 'Sistema'}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditModal(item)}
                                className="h-7 px-2 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1"
                                title="Editar código modelo"
                              >
                                <Edit2 className="w-3 h-3 text-slate-600" />
                                <span>Editar</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setStatusConfirmModel(item)}
                                className={`h-7 px-2 text-xs gap-1 ${
                                  item.status === 'ATIVO'
                                    ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                                    : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                                }`}
                                title={
                                  item.status === 'ATIVO' ? 'Inativar modelo' : 'Ativar modelo'
                                }
                              >
                                <Power className="w-3 h-3" />
                                <span>{item.status === 'ATIVO' ? 'Inativar' : 'Ativar'}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* VISÃO CELULAR: Cards verticais sem rolagem horizontal na tela */}
              <div className="md:hidden space-y-3">
                {filteredModels.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {item.material_code}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {item.material_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-700 font-medium leading-snug">
                          {item.description || 'Sem descrição cadastrada'}
                        </p>
                      </div>
                      <Badge
                        className={`text-[10px] shrink-0 ${
                          item.status === 'ATIVO'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-400 text-white'
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Linha</span>
                        <span className="font-semibold text-slate-800">
                          {item.line_code || item.line_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Centro</span>
                        <span className="font-semibold text-slate-800">{item.center}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block">Empresa</span>
                        <span className="font-semibold text-slate-800 truncate block">
                          {item.company_name || item.company_code || 'CIAFAL'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Criado: {formatDateTime(item.created)}</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(item)}
                          className="h-7 text-xs px-2"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatusConfirmModel(item)}
                          className={`h-7 text-xs px-2 ${
                            item.status === 'ATIVO'
                              ? 'border-amber-300 text-amber-800'
                              : 'border-emerald-300 text-emerald-800'
                          }`}
                        >
                          <Power className="w-3 h-3 mr-1" />
                          {item.status === 'ATIVO' ? 'Inativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE CADASTRO E EDIÇÃO RESPONSIVO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg w-full max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#004C97]" />
              {editingModel ? 'Editar Código Modelo Padrão' : 'Cadastrar Código Modelo Padrão'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Parametrização de códigos de referência homologados no SAP para sugestão na Validação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveModel} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Campo Código SAP com Busca Inteligente */}
            <div className="space-y-1.5 relative" ref={suggestionContainerRef}>
              <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Código SAP do Material de Referência *</span>
                <span className="text-[10px] text-slate-400 font-normal">MARA-MATNR</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Digite o código ou parte da descrição (ex: 1020)..."
                  value={codeQuery}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase()
                    setCodeQuery(val)
                    setFormData((prev) => ({ ...prev, material_code: val }))
                    setShowCodeSuggestions(true)
                  }}
                  onFocus={() => {
                    if (codeSuggestions.length > 0) setShowCodeSuggestions(true)
                  }}
                  className="font-mono text-sm font-semibold uppercase bg-white border-slate-300 pr-8"
                />
                {searchingCatalog && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-2.5 top-2.5" />
                )}
              </div>

              {/* Dropdown de sugestões */}
              {showCodeSuggestions && codeSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white rounded-md border border-slate-200 shadow-lg text-xs">
                  <div className="p-1.5 bg-slate-50 border-b text-[10px] text-slate-500 font-semibold">
                    Sugestões encontradas no catálogo:
                  </div>
                  {codeSuggestions.map((item) => (
                    <div
                      key={item.code}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          material_code: item.code,
                          description: item.description || prev.description,
                          material_type: item.material_type || prev.material_type,
                        }))
                        setCodeQuery(item.code)
                        setShowCodeSuggestions(false)
                      }}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-b-0 flex flex-col gap-0.5"
                    >
                      <div className="font-mono font-bold text-slate-900">{item.code}</div>
                      <div className="text-slate-600 truncate">{item.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Descrição do material logo abaixo dentro do bloco */}
              <div className="pt-1 space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">
                  Descrição do Material (MAKTX)
                </Label>
                <Input
                  placeholder="Descrição preenchida automaticamente ou manual..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="text-xs bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Grid: Tipo de Material e Centro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tipo de Material */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">
                  Tipo de Material (MARA-MTART) *
                </Label>
                <Select
                  value={formData.material_type}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, material_type: val }))}
                >
                  <SelectTrigger className="text-xs h-9 bg-white border-slate-300 font-mono">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_MATERIAL_TYPES.map((t) => (
                      <SelectItem key={t.code} value={t.code}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Centro SAP WERKS */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Centro SAP (WERKS) *</Label>
                <Select
                  value={formData.center}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, center: val }))}
                >
                  <SelectTrigger className="text-xs h-9 bg-white border-slate-300 font-mono">
                    <SelectValue placeholder="Selecione o centro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {werksList.map((w) => (
                      <SelectItem key={w.werks} value={w.werks}>
                        {w.werks} — {w.description}
                      </SelectItem>
                    ))}
                    {werksList.length === 0 && (
                      <>
                        <SelectItem value="1001">1001 — Divinópolis (Matriz)</SelectItem>
                        <SelectItem value="1002">1002 — Contagem</SelectItem>
                        <SelectItem value="2001">2001 — Ferradura</SelectItem>
                        <SelectItem value="2101">2101 — Ciafal</SelectItem>
                        <SelectItem value="3001">3001 — Sidercentro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grid: Empresa e Linha de Produção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Empresa */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Empresa (HUB) *</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(val) => {
                    const comp = companies.find((c) => c.id === val)
                    setFormData((prev) => ({
                      ...prev,
                      company_id: val,
                      company_code: comp?.code || '',
                      company_name: comp?.name || '',
                    }))
                  }}
                >
                  <SelectTrigger className="text-xs h-9 bg-white border-slate-300">
                    <SelectValue placeholder="Selecione a empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linha de Produção */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Linha (PCP Robotizado) *</Label>
                <Select
                  value={formData.line_id}
                  onValueChange={(val) => {
                    const line = lines.find((l) => l.id === val)
                    setFormData((prev) => ({
                      ...prev,
                      line_id: val,
                      line_code: line?.code || '',
                    }))
                  }}
                >
                  <SelectTrigger className="text-xs h-9 bg-white border-slate-300">
                    <SelectValue placeholder="Selecione a linha..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lines.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status: Ativo / Inativo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Status do Modelo</Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, status: val as 'ATIVO' | 'INATIVO' }))
                }
              >
                <SelectTrigger className="text-xs h-9 bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">ATIVO — Sugerir este modelo nas validações</SelectItem>
                  <SelectItem value="INATIVO">
                    INATIVO — Não sugerir (preservar histórico)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">
                Inativar impede que o modelo seja sugerido para novos materiais sem apagar o
                histórico de auditoria.
              </p>
            </div>

            {/* Observações / Notas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações Técnicas / Aplicação
              </Label>
              <Input
                placeholder="Ex: Utilizar para barras chatas SAE 1020 com bitolas até 25 mm..."
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="text-xs bg-white border-slate-300"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#004C97] hover:bg-[#003870] text-white gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingModel ? 'Salvar Alterações' : 'Salvar Código Modelo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE STATUS (ATIVAR / INATIVAR) */}
      <AlertDialog
        open={!!statusConfirmModel}
        onOpenChange={(open) => !open && setStatusConfirmModel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Power className="w-5 h-5 text-amber-600" />
              {statusConfirmModel?.status === 'ATIVO'
                ? 'Inativar Código Modelo'
                : 'Ativar Código Modelo'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed pt-2">
              {statusConfirmModel?.status === 'ATIVO' ? (
                <>
                  Deseja realmente inativar o Código Modelo{' '}
                  <strong>{statusConfirmModel?.material_code}</strong>? Ele deixará de ser sugerido
                  automaticamente durante as novas validações, mas todo o histórico será preservado
                  para fins de auditoria.
                </>
              ) : (
                <>
                  Deseja ativar o Código Modelo <strong>{statusConfirmModel?.material_code}</strong>
                  ? Ele voltará a ser sugerido automaticamente quando houver compatibilidade com o
                  material novo.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={togglingStatus}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={togglingStatus}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmToggleStatus()
              }}
              className={
                statusConfirmModel?.status === 'ATIVO'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }
            >
              {togglingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {statusConfirmModel?.status === 'ATIVO'
                ? 'Confirmar Inativação'
                : 'Confirmar Ativação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default CodigosModelosPadraoTab

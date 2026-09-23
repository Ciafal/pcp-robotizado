import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  SlidersHorizontal,
  Plus,
  Edit2,
  Eye,
  Power,
  Search,
  AlertCircle,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  pcpProgrammingParametersService,
  ProgrammingParameter,
  ProgrammingParameterType,
  ProgrammingParameterStatus,
} from '@/services/pcp-programming-parameters-service'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

interface LineProgrammingParametersPanelProps {
  lineId?: string
  centerCode: string
  centerName?: string
  onRefreshParent?: () => void
}

export const LineProgrammingParametersPanel: React.FC<LineProgrammingParametersPanelProps> = ({
  lineId,
  centerCode,
  centerName,
}) => {
  const { toast } = useToast()

  const [parameters, setParameters] = useState<ProgrammingParameter[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'Ativo' | 'Inativo' | 'Todos'>('Todos')
  const [typeFilter, setTypeFilter] = useState<string>('TODOS')

  // Estado do Modal de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingParameter, setEditingParameter] = useState<ProgrammingParameter | null>(null)
  const [viewingParameter, setViewingParameter] = useState<ProgrammingParameter | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [initialSnapshot, setInitialSnapshot] = useState<string>('')

  // Campos do formulário
  const [formName, setFormName] = useState<string>('')
  const [formDescription, setFormDescription] = useState<string>('')
  const [formType, setFormType] = useState<ProgrammingParameterType>('Restrição')
  const [formStatus, setFormStatus] = useState<ProgrammingParameterStatus>('Ativo')
  const [formValue, setFormValue] = useState<string>('')
  const [formUnit, setFormUnit] = useState<string>('')
  const [formValidFrom, setFormValidFrom] = useState<string>('')
  const [formValidUntil, setFormValidUntil] = useState<string>('')
  const [formTextoParametro, setFormTextoParametro] = useState<string>('')
  const [formImpactoConsequencia, setFormImpactoConsequencia] = useState<string>('')

  // Refs de foco para primeiro campo com erro
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const textoTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const impactoTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const validFromInputRef = useRef<HTMLInputElement | null>(null)

  // Carrega parâmetros do centro estritamente
  const loadParameters = useCallback(async () => {
    if (!centerCode) {
      setParameters([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const list = await pcpProgrammingParametersService.listByCenter(centerCode, {
        status: 'Todos',
      })
      setParameters(list)
    } catch (err: any) {
      console.warn('Erro ao carregar parâmetros de programação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar parâmetros',
        description: err?.message || 'Falha na comunicação com o backend.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [centerCode, toast])

  useEffect(() => {
    loadParameters()
  }, [loadParameters])

  // Normalizador de tipos compatível com legado e novos
  const normalizeType = (raw: string): ProgrammingParameterType => {
    const upper = (raw || '').toUpperCase()
    if (upper === 'RESTRICAO' || upper === 'RESTRIÇÃO') return 'Restrição'
    if (upper === 'REGRA') return 'Regra'
    if (upper === 'ALERTA') return 'Alerta'
    if (upper === 'CONDICAO' || upper === 'CONDIÇÃO') return 'Condição'
    if (upper === 'LIMITE') return 'Limite'
    if (upper === 'PRIORIDADE') return 'Prioridade'
    if (upper === 'NUMERICO' || upper === 'NUMÉRICO') return 'Numérico'
    if (upper === 'TEXTO') return 'Texto'
    if (upper === 'BOOLEANO') return 'Booleano'
    if (upper === 'PERCENTUAL') return 'Percentual'
    if (upper === 'TEMPO') return 'Tempo'
    return 'Restrição'
  }

  // Cria snapshot para detectar alterações não salvas
  const buildSnapshot = (data: {
    name: string
    description: string
    type: string
    status: string
    value: string
    unit: string
    validFrom: string
    validUntil: string
    texto: string
    impacto: string
  }) => JSON.stringify(data)

  // Verifica se houve modificação no formulário
  const hasUnsavedChanges = () => {
    const current = buildSnapshot({
      name: formName,
      description: formDescription,
      type: formType,
      status: formStatus,
      value: formValue,
      unit: formUnit,
      validFrom: formValidFrom,
      validUntil: formValidUntil,
      texto: formTextoParametro,
      impacto: formImpactoConsequencia,
    })
    return current !== initialSnapshot
  }

  // Abertura de modal para NOVO cadastro
  const handleOpenCreate = () => {
    setEditingParameter(null)
    setFormError(null)
    setFieldErrors({})
    const defaultValidFrom = new Date().toISOString().slice(0, 10)
    setFormName('')
    setFormDescription('')
    setFormType('Restrição')
    setFormStatus('Ativo')
    setFormValue('')
    setFormUnit('t')
    setFormValidFrom(defaultValidFrom)
    setFormValidUntil('')
    setFormTextoParametro('')
    setFormImpactoConsequencia('')

    setInitialSnapshot(
      buildSnapshot({
        name: '',
        description: '',
        type: 'Restrição',
        status: 'Ativo',
        value: '',
        unit: 't',
        validFrom: defaultValidFrom,
        validUntil: '',
        texto: '',
        impacto: '',
      }),
    )
    setIsModalOpen(true)
  }

  // Abertura de modal para EDIÇÃO
  const handleOpenEdit = (param: ProgrammingParameter) => {
    setEditingParameter(param)
    setFormError(null)
    setFieldErrors({})
    const normalizedType = normalizeType(param.parameter_type)
    const validFromStr = param.valid_from ? param.valid_from.slice(0, 10) : ''
    const validUntilStr = param.valid_until ? param.valid_until.slice(0, 10) : ''
    const textoStr = param.textoParametro || ''
    const impactoStr = param.impactoConsequencia || param.notes || ''

    setFormName(param.name || '')
    setFormDescription(param.description || '')
    setFormType(normalizedType)
    setFormStatus(param.status)
    setFormValue(param.value || '')
    setFormUnit(param.unit_of_measure || '')
    setFormValidFrom(validFromStr)
    setFormValidUntil(validUntilStr)
    setFormTextoParametro(textoStr)
    setFormImpactoConsequencia(impactoStr)

    setInitialSnapshot(
      buildSnapshot({
        name: param.name || '',
        description: param.description || '',
        type: normalizedType,
        status: param.status,
        value: param.value || '',
        unit: param.unit_of_measure || '',
        validFrom: validFromStr,
        validUntil: validUntilStr,
        texto: textoStr,
        impacto: impactoStr,
      }),
    )
    setIsModalOpen(true)
  }

  // Abertura de modal para VISUALIZAÇÃO integral
  const handleOpenView = (param: ProgrammingParameter) => {
    setViewingParameter(param)
  }

  // Cancelamento com verificação de alterações não salvas
  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      const confirmLeave = window.confirm(
        'Existem alterações não salvas. Deseja realmente cancelar?',
      )
      if (!confirmLeave) return
    }
    setIsModalOpen(false)
    setFieldErrors({})
    setFormError(null)
  }

  // Salvar Parâmetro
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFormError(null)
    const errors: Record<string, string> = {}

    // Validações obrigatórias com mensagens específicas sem mensagens nativas
    if (!formName.trim()) {
      errors.name = 'Informe o Nome do Parâmetro.'
    }

    if (!formType) {
      errors.type = 'Informe o Tipo de Parâmetro.'
    }

    if (!formValidFrom.trim()) {
      errors.validFrom = 'Informe a Vigência Inicial.'
    }

    if (!formTextoParametro.trim()) {
      errors.textoParametro = 'Informe o Texto do Parâmetro.'
    }

    if (!formImpactoConsequencia.trim()) {
      errors.impactoConsequencia = 'Informe o Impacto / Consequência.'
    }

    if (formValidUntil && formValidFrom && formValidUntil < formValidFrom) {
      errors.validUntil = 'A Vigência Final não pode ser anterior à Vigência Inicial.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setFormError('Por favor, preencha todos os campos obrigatórios destacados.')

      // Foco no primeiro campo pendente
      if (errors.name) {
        nameInputRef.current?.focus()
      } else if (errors.validFrom) {
        validFromInputRef.current?.focus()
      } else if (errors.textoParametro) {
        textoTextareaRef.current?.focus()
      } else if (errors.impactoConsequencia) {
        impactoTextareaRef.current?.focus()
      }
      return
    }

    setIsSaving(true)
    try {
      const currentUser = pb.authStore.record
      const userInfo = currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name || currentUser.email,
            email: currentUser.email,
          }
        : undefined

      await pcpProgrammingParametersService.saveParameter(
        {
          id: editingParameter?.id,
          center_id: lineId || undefined,
          center_code: centerCode,
          name: formName.trim(),
          description: formDescription.trim(),
          parameter_type: formType,
          value: formValue.trim(),
          unit_of_measure: formUnit.trim(),
          valid_from: formValidFrom,
          valid_until: formValidUntil || undefined,
          status: formStatus,
          textoParametro: formTextoParametro.trim(),
          impactoConsequencia: formImpactoConsequencia.trim(),
          notes: formImpactoConsequencia.trim(),
        },
        userInfo,
      )

      // Confirmação de persistência realizada com sucesso
      toast({
        title: '✅ Parâmetro salvo com sucesso.',
        description: `O parâmetro "${formName.trim()}" foi registrado para o Centro ${centerCode}.`,
      })

      // Fecha modal somente após sucesso e atualiza listagem automaticamente
      setIsModalOpen(false)
      setFieldErrors({})
      await loadParameters()
      if (onRefreshParent) {
        onRefreshParent()
      }
    } catch (err: any) {
      console.error('Erro ao salvar parâmetro:', err)
      // Mantém popup aberto, preserva dados e exibe mensagem objetiva
      setFormError(err?.message || 'Falha ao salvar o parâmetro no backend. Tente novamente.')
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar o parâmetro',
        description: err?.message || 'Ocorreu um erro ao persistir o registro.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Alternar Status Ativo / Inativo
  const handleToggleStatus = async (param: ProgrammingParameter) => {
    const nextStatus: ProgrammingParameterStatus = param.status === 'Ativo' ? 'Inativo' : 'Ativo'
    const currentUser = pb.authStore.record
    const userInfo = currentUser
      ? {
          id: currentUser.id,
          name: currentUser.name || currentUser.email,
          email: currentUser.email,
        }
      : undefined

    try {
      await pcpProgrammingParametersService.toggleStatus(param.id, nextStatus, userInfo)
      toast({
        title: 'Status atualizado com sucesso.',
        description: `O parâmetro "${param.name}" agora está ${nextStatus}.`,
      })
      await loadParameters()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err?.message || 'Não foi possível alterar o status do parâmetro.',
      })
    }
  }

  // Filtro em memória
  const filteredParameters = useMemo(() => {
    return (parameters || []).filter((p) => {
      // Filtro de status
      if (statusFilter !== 'Todos' && p.status !== statusFilter) return false

      // Filtro de tipo
      if (typeFilter !== 'TODOS' && p.parameter_type !== typeFilter) return false

      // Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchName = p.name.toLowerCase().includes(term)
        const matchDesc = (p.description || '').toLowerCase().includes(term)
        const matchVal = (p.value || '').toLowerCase().includes(term)
        const matchTexto = (p.textoParametro || '').toLowerCase().includes(term)
        const matchImpacto = (p.impactoConsequencia || '').toLowerCase().includes(term)
        const matchNotes = (p.notes || '').toLowerCase().includes(term)
        if (!matchName && !matchDesc && !matchVal && !matchTexto && !matchImpacto && !matchNotes)
          return false
      }

      return true
    })
  }, [parameters, statusFilter, typeFilter, searchTerm])

  const totalAtivos = (parameters || []).filter((p) => p.status === 'Ativo').length
  const totalInativos = (parameters || []).filter((p) => p.status === 'Inativo').length

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Seção com Identidade HUB Industrial */}
      <Card className="bg-white border-slate-200 text-slate-900 shadow-xs">
        <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#004C97]" />
              Parâmetros de Programação
              <Badge className="ml-2 bg-blue-50 text-[#004C97] border border-blue-200 text-xs font-mono font-semibold">
                Centro: {centerCode} {centerName ? `• ${centerName}` : ''}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Regras e parâmetros utilizados pelo PCP Robotizado para montagem e validação da
              programação deste Centro.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 gap-1.5 font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Cadastrar Parâmetro
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nome, descrição ou valor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro por Tipo */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs bg-white border-slate-200 w-36">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="TODOS">Todos os Tipos</SelectItem>
                  <SelectItem value="Restrição">Restrição</SelectItem>
                  <SelectItem value="Regra">Regra</SelectItem>
                  <SelectItem value="Alerta">Alerta</SelectItem>
                  <SelectItem value="Condição">Condição</SelectItem>
                  <SelectItem value="Limite">Limite</SelectItem>
                  <SelectItem value="Prioridade">Prioridade</SelectItem>
                  <SelectItem value="Numérico">Numérico</SelectItem>
                  <SelectItem value="Texto">Texto</SelectItem>
                  <SelectItem value="Booleano">Booleano</SelectItem>
                  <SelectItem value="Percentual">Percentual</SelectItem>
                  <SelectItem value="Tempo">Tempo</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro por Status */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('Todos')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === 'Todos'
                      ? 'bg-[#004C97] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({parameters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Ativo')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === 'Ativo'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ativos ({totalAtivos})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Inativo')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                    statusFilter === 'Inativo'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inativos ({totalInativos})
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Parâmetros */}
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-xs text-slate-700 min-w-[880px]">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold tracking-wider">
                <tr>
                  <th className="p-2.5">Nome do Parâmetro</th>
                  <th className="p-2.5 text-center">Tipo</th>
                  <th className="p-2.5">Valor Configurado</th>
                  <th className="p-2.5 text-center">Unidade</th>
                  <th className="p-2.5">Vigência</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic text-xs">
                      Carregando parâmetros de programação do Centro {centerCode}...
                    </td>
                  </tr>
                ) : filteredParameters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic text-xs">
                      {parameters.length === 0
                        ? `Nenhum parâmetro de programação cadastrado para o Centro ${centerCode}. Clique em "+ Cadastrar Parâmetro" para adicionar.`
                        : 'Nenhum parâmetro encontrado com os filtros aplicados.'}
                    </td>
                  </tr>
                ) : (
                  filteredParameters.map((p) => {
                    const isItemActive = p.status === 'Ativo'
                    const vigenciaLabel = p.valid_from
                      ? `${formatDatePTBR(p.valid_from)} ${
                          p.valid_until ? `a ${formatDatePTBR(p.valid_until)}` : 'em diante'
                        }`
                      : 'Indeterminada'

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 max-w-[260px]">
                          <span className="font-bold text-slate-900 block truncate" title={p.name}>
                            {p.name}
                          </span>
                          {p.description && (
                            <span
                              className="text-[11px] text-slate-500 block truncate"
                              title={p.description}
                            >
                              {p.description}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono border-slate-300 bg-slate-50 text-slate-700"
                          >
                            {p.parameter_type}
                          </Badge>
                        </td>
                        <td
                          className="p-2.5 font-mono font-medium text-slate-900 max-w-[200px] truncate"
                          title={p.value || '-'}
                        >
                          {p.value || '—'}
                        </td>
                        <td className="p-2.5 text-center text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {p.unit_of_measure || '—'}
                        </td>
                        <td className="p-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {vigenciaLabel}
                          </span>
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {isItemActive ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-semibold">
                              Inativo
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenView(p)}
                              className="h-7 px-2 text-xs font-semibold text-slate-600 hover:text-[#004C97] hover:bg-blue-50"
                              title="Visualizar Parâmetro Completo"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(p)}
                              className={`h-7 px-2 text-xs font-semibold ${
                                isItemActive
                                  ? 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                                  : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                              title={isItemActive ? 'Inativar Parâmetro' : 'Ativar Parâmetro'}
                            >
                              <Power className="w-3.5 h-3.5 mr-1" />
                              {isItemActive ? 'Inativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(p)}
                              className="h-7 px-2.5 text-xs font-semibold text-[#004C97] hover:bg-blue-50 border border-transparent hover:border-blue-200"
                              title="Editar Parâmetro"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Editar
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

      {/* MODAL: Visualizar Parâmetro de Programação Integral */}
      <Dialog
        open={Boolean(viewingParameter)}
        onOpenChange={(open) => !open && setViewingParameter(null)}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-slate-200 shadow-xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#004C97]" />
              Visualização de Parâmetro de Programação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Centro de Produção: <span className="font-semibold text-slate-800">{centerCode}</span>
              {centerName ? ` • ${centerName}` : ''}
            </DialogDescription>
          </DialogHeader>

          {viewingParameter && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">
                    Nome do Parâmetro:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{viewingParameter.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Status:</span>
                  <Badge
                    className={
                      viewingParameter.status === 'Ativo'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600'
                    }
                  >
                    {viewingParameter.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">Tipo:</span>
                  <span className="font-semibold text-slate-800">
                    {viewingParameter.parameter_type}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] font-medium">
                    Valor Configurado / Unidade:
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {viewingParameter.value || '—'}{' '}
                    {viewingParameter.unit_of_measure
                      ? `(${viewingParameter.unit_of_measure})`
                      : ''}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[11px] font-medium">Vigência:</span>
                  <span className="text-slate-700">
                    {viewingParameter.valid_from
                      ? formatDatePTBR(viewingParameter.valid_from)
                      : 'Indeterminada'}{' '}
                    a{' '}
                    {viewingParameter.valid_until
                      ? formatDatePTBR(viewingParameter.valid_until)
                      : 'em diante'}
                  </span>
                </div>
                {viewingParameter.description && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[11px] font-medium">
                      Descrição / Finalidade:
                    </span>
                    <span className="text-slate-700">{viewingParameter.description}</span>
                  </div>
                )}
              </div>

              {/* Texto do Parâmetro */}
              <div className="space-y-1.5 p-3 rounded-lg border border-blue-200 bg-blue-50/40">
                <Label className="text-xs font-bold text-[#004C97] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#004C97]" />
                  Texto do Parâmetro (Regra Operacional Completa)
                </Label>
                <div className="p-3 bg-white rounded border border-blue-100 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {viewingParameter.textoParametro || (
                    <span className="text-slate-400 italic">Não informado</span>
                  )}
                </div>
              </div>

              {/* Impacto / Consequência */}
              <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />
                  Impacto / Consequência
                </Label>
                <div className="p-3 bg-white rounded border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {viewingParameter.impactoConsequencia || (
                    <span className="text-slate-400 italic">Não informado</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewingParameter(null)}
              className="border-slate-300 text-slate-700"
            >
              Fechar
            </Button>
            {viewingParameter && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const p = viewingParameter
                  setViewingParameter(null)
                  handleOpenEdit(p)
                }}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar Parâmetro
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastrar / Editar Parâmetro */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel()
          } else {
            setIsModalOpen(true)
          }
        }}
      >
        <DialogContent
          className="max-w-2xl max-h-[92vh] overflow-y-auto bg-white text-slate-900 border-slate-200 shadow-2xl p-6"
          data-testid="parameter-form-modal"
        >
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#004C97]" />
              {editingParameter
                ? 'Editar Parâmetro de Programação'
                : 'Cadastrar Parâmetro de Programação'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Centro de Produção: <span className="font-semibold text-slate-800">{centerCode}</span>
              {centerName ? ` (${centerName})` : ''} • As alterações serão registradas no relatório
              de logs de auditoria.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} noValidate className="space-y-4 py-2">
            {formError && (
              <div
                role="alert"
                className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold block">Erro de validação:</span>
                  <span>{formError}</span>
                </div>
              </div>
            )}

            {/* ESTRUTURA FINAL DO FORMULÁRIO (ordem solicitada) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. Nome do Parâmetro * (texto, largura total) */}
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="form-param-name" className="text-xs font-semibold text-slate-700">
                  Nome do Parâmetro <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="form-param-name"
                  ref={nameInputRef}
                  type="text"
                  placeholder="Ex: Não programar quantidade inferior a 1 tonelada"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: '' }))
                    }
                  }}
                  className={`h-8 text-xs bg-white text-slate-900 ${
                    fieldErrors.name
                      ? 'border-rose-500 focus-visible:ring-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-300 focus-visible:ring-[#004C97]'
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">{fieldErrors.name}</p>
                )}
              </div>

              {/* 2. Descrição / Finalidade (texto, largura total) */}
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="form-param-desc" className="text-xs font-semibold text-slate-700">
                  Descrição / Finalidade
                </Label>
                <Input
                  id="form-param-desc"
                  type="text"
                  placeholder="Finalidade do parâmetro para o cálculo do sequenciamento ou validações"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="h-8 text-xs border-slate-300 bg-white text-slate-900 focus-visible:ring-[#004C97]"
                />
              </div>

              {/* 3. Linha dupla: Tipo de Parâmetro * | Status */}
              <div className="space-y-1">
                <Label htmlFor="form-param-type" className="text-xs font-semibold text-slate-700">
                  Tipo de Parâmetro <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formType}
                  onValueChange={(val: ProgrammingParameterType) => {
                    setFormType(val)
                    if (fieldErrors.type) {
                      setFieldErrors((prev) => ({ ...prev, type: '' }))
                    }
                  }}
                >
                  <SelectTrigger
                    id="form-param-type"
                    className={`h-8 text-xs bg-white text-slate-900 ${
                      fieldErrors.type
                        ? 'border-rose-500 focus-visible:ring-rose-500 ring-1 ring-rose-500'
                        : 'border-slate-300 focus-visible:ring-[#004C97]'
                    }`}
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Restrição">Restrição</SelectItem>
                    <SelectItem value="Regra">Regra</SelectItem>
                    <SelectItem value="Alerta">Alerta</SelectItem>
                    <SelectItem value="Condição">Condição</SelectItem>
                    <SelectItem value="Limite">Limite</SelectItem>
                    <SelectItem value="Prioridade">Prioridade</SelectItem>
                    <SelectItem value="Numérico">Numérico</SelectItem>
                    <SelectItem value="Texto">Texto</SelectItem>
                    <SelectItem value="Booleano">Booleano</SelectItem>
                    <SelectItem value="Percentual">Percentual</SelectItem>
                    <SelectItem value="Tempo">Tempo</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.type && (
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">{fieldErrors.type}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="form-param-status" className="text-xs font-semibold text-slate-700">
                  Status
                </Label>
                <Select
                  value={formStatus}
                  onValueChange={(val: ProgrammingParameterStatus) => setFormStatus(val)}
                >
                  <SelectTrigger
                    id="form-param-status"
                    className="h-8 text-xs border-slate-300 bg-white text-slate-900 focus-visible:ring-[#004C97]"
                  >
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Valor Configurado | Unidade de Medida */}
              <div className="space-y-1">
                <Label htmlFor="form-param-value" className="text-xs font-semibold text-slate-700">
                  Valor Configurado
                </Label>
                <Input
                  id="form-param-value"
                  type="text"
                  placeholder="Ex: 1, 10, 85, TRUE, Bloqueado"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="h-8 text-xs border-slate-300 bg-white font-mono text-slate-900 focus-visible:ring-[#004C97]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="form-param-unit" className="text-xs font-semibold text-slate-700">
                  Unidade de Medida
                </Label>
                <Select
                  value={formUnit || 'NONE'}
                  onValueChange={(val) => setFormUnit(val === 'NONE' ? '' : val)}
                >
                  <SelectTrigger
                    id="form-param-unit"
                    className="h-8 text-xs border-slate-300 bg-white text-slate-900 focus-visible:ring-[#004C97]"
                  >
                    <SelectValue placeholder="Selecione ou deixe em branco" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="NONE">Nenhuma (Sem unidade)</SelectItem>
                    <SelectItem value="t">t (Toneladas)</SelectItem>
                    <SelectItem value="kg">kg (Quilogramas)</SelectItem>
                    <SelectItem value="peça">peça</SelectItem>
                    <SelectItem value="h">h (Horas)</SelectItem>
                    <SelectItem value="min">min (Minutos)</SelectItem>
                    <SelectItem value="dia">dia</SelectItem>
                    <SelectItem value="%">% (Percentual)</SelectItem>
                    <SelectItem value="mm">mm (Milímetros)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 5. Vigência Inicial * | Vigência Final */}
              <div className="space-y-1">
                <Label
                  htmlFor="form-param-valid-from"
                  className="text-xs font-semibold text-slate-700"
                >
                  Vigência Inicial <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="form-param-valid-from"
                  ref={validFromInputRef}
                  type="date"
                  value={formValidFrom}
                  onChange={(e) => {
                    setFormValidFrom(e.target.value)
                    if (fieldErrors.validFrom) {
                      setFieldErrors((prev) => ({ ...prev, validFrom: '' }))
                    }
                  }}
                  className={`h-8 text-xs bg-white text-slate-900 font-mono ${
                    fieldErrors.validFrom
                      ? 'border-rose-500 focus-visible:ring-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-300 focus-visible:ring-[#004C97]'
                  }`}
                />
                {fieldErrors.validFrom && (
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                    {fieldErrors.validFrom}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="form-param-valid-until"
                  className="text-xs font-semibold text-slate-700"
                >
                  Vigência Final
                </Label>
                <Input
                  id="form-param-valid-until"
                  type="date"
                  placeholder="dd/mm/aaaa"
                  value={formValidUntil}
                  onChange={(e) => {
                    setFormValidUntil(e.target.value)
                    if (fieldErrors.validUntil) {
                      setFieldErrors((prev) => ({ ...prev, validUntil: '' }))
                    }
                  }}
                  className={`h-8 text-xs bg-white text-slate-900 font-mono ${
                    fieldErrors.validUntil
                      ? 'border-rose-500 focus-visible:ring-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-300 focus-visible:ring-[#004C97]'
                  }`}
                />
                {fieldErrors.validUntil && (
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                    {fieldErrors.validUntil}
                  </p>
                )}
              </div>

              {/* 6. Texto do Parâmetro * (textarea, largura total) */}
              <div className="space-y-1 md:col-span-2">
                <Label
                  htmlFor="form-param-texto"
                  className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                >
                  <span>
                    Texto do Parâmetro <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Regra operacional completa aplicada ao Centro
                  </span>
                </Label>
                <Textarea
                  id="form-param-texto"
                  ref={textoTextareaRef}
                  data-testid="input-texto-parametro"
                  placeholder="Ex: Não programar quantidade inferior a 1 tonelada de produção para este Centro."
                  value={formTextoParametro}
                  onChange={(e) => {
                    setFormTextoParametro(e.target.value)
                    if (fieldErrors.textoParametro) {
                      setFieldErrors((prev) => ({ ...prev, textoParametro: '' }))
                    }
                  }}
                  className={`text-xs bg-white text-slate-900 min-h-[75px] leading-relaxed resize-y ${
                    fieldErrors.textoParametro
                      ? 'border-rose-500 focus-visible:ring-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-300 focus-visible:ring-[#004C97]'
                  }`}
                />
                {fieldErrors.textoParametro && (
                  <p
                    data-testid="error-texto-parametro"
                    className="text-[11px] text-rose-600 font-medium mt-0.5"
                  >
                    {fieldErrors.textoParametro}
                  </p>
                )}
              </div>

              {/* 7. Impacto / Consequência * (textarea, largura total) */}
              <div className="space-y-1 md:col-span-2">
                <Label
                  htmlFor="form-param-impacto"
                  className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                >
                  <span>
                    Impacto / Consequência <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    O que ocorre quando a condição é atingida ou violada
                  </span>
                </Label>
                <Textarea
                  id="form-param-impacto"
                  ref={impactoTextareaRef}
                  data-testid="input-impacto-consequencia"
                  placeholder="Ex: Bloquear a inclusão da atividade e informar ao programador."
                  value={formImpactoConsequencia}
                  onChange={(e) => {
                    setFormImpactoConsequencia(e.target.value)
                    if (fieldErrors.impactoConsequencia) {
                      setFieldErrors((prev) => ({ ...prev, impactoConsequencia: '' }))
                    }
                  }}
                  className={`text-xs bg-white text-slate-900 min-h-[75px] leading-relaxed resize-y ${
                    fieldErrors.impactoConsequencia
                      ? 'border-rose-500 focus-visible:ring-rose-500 ring-1 ring-rose-500'
                      : 'border-slate-300 focus-visible:ring-[#004C97]'
                  }`}
                />
                {fieldErrors.impactoConsequencia && (
                  <p
                    data-testid="error-impacto-consequencia"
                    className="text-[11px] text-rose-600 font-medium mt-0.5"
                  >
                    {fieldErrors.impactoConsequencia}
                  </p>
                )}
              </div>
            </div>

            {/* 8. Rodapé Cancelar | Salvar */}
            <DialogFooter className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="btn-cancelar-parametro"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                data-testid="btn-salvar-parametro"
                disabled={isSaving}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 font-bold gap-1.5 shadow-xs"
              >
                {isSaving ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default LineProgrammingParametersPanel

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  SlidersHorizontal,
  Plus,
  Edit2,
  Power,
  Search,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  Info,
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
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Campos do formulário
  const [formName, setFormName] = useState<string>('')
  const [formDescription, setFormDescription] = useState<string>('')
  const [formType, setFormType] = useState<ProgrammingParameterType>('NUMERICO')
  const [formValue, setFormValue] = useState<string>('')
  const [formUnit, setFormUnit] = useState<string>('')
  const [formValidFrom, setFormValidFrom] = useState<string>('')
  const [formValidUntil, setFormValidUntil] = useState<string>('')
  const [formStatus, setFormStatus] = useState<ProgrammingParameterStatus>('Ativo')
  const [formNotes, setFormNotes] = useState<string>('')

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

  // Abertura de modal para NOVO cadastro
  const handleOpenCreate = () => {
    setEditingParameter(null)
    setFormError(null)
    setFormName('')
    setFormDescription('')
    setFormType('NUMERICO')
    setFormValue('')
    setFormUnit('')
    setFormValidFrom(new Date().toISOString().slice(0, 10))
    setFormValidUntil('')
    setFormStatus('Ativo')
    setFormNotes('')
    setIsModalOpen(true)
  }

  // Abertura de modal para EDIÇÃO
  const handleOpenEdit = (param: ProgrammingParameter) => {
    setEditingParameter(param)
    setFormError(null)
    setFormName(param.name || '')
    setFormDescription(param.description || '')
    setFormType(param.parameter_type || 'NUMERICO')
    setFormValue(param.value || '')
    setFormUnit(param.unit_of_measure || '')
    setFormValidFrom(param.valid_from ? param.valid_from.slice(0, 10) : '')
    setFormValidUntil(param.valid_until ? param.valid_until.slice(0, 10) : '')
    setFormStatus(param.status)
    setFormNotes(param.notes || '')
    setIsModalOpen(true)
  }

  // Salvar Parâmetro
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFormError(null)

    // Validações obrigatórias
    if (!formName.trim()) {
      setFormError('O Nome do Parâmetro é obrigatório.')
      return
    }

    if (!formType) {
      setFormError('Selecione o Tipo de Parâmetro.')
      return
    }

    if (!formValidFrom) {
      setFormError('A Vigência Inicial (De) é obrigatória.')
      return
    }

    if (formValidUntil && formValidFrom && formValidUntil < formValidFrom) {
      setFormError('A Vigência Final não pode ser anterior à Vigência Inicial.')
      return
    }

    // Validação de tipo numérico/percentual/tempo
    if (formType === 'NUMERICO' || formType === 'PERCENTUAL' || formType === 'TEMPO') {
      if (formValue.trim() !== '') {
        const normalized = formValue.replace(/\./g, '').replace(',', '.')
        if (isNaN(Number(normalized))) {
          setFormError(`O valor informado para o tipo "${formType}" deve ser um número válido.`)
          return
        }
      }
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
          notes: formNotes.trim(),
        },
        userInfo,
      )

      // Toast exato exigido na especificação
      toast({
        title: 'Parâmetro salvo com sucesso.',
        description: `O parâmetro "${formName.trim()}" foi registrado para o Centro ${centerCode}.`,
      })

      // Fecha modal somente após sucesso e atualiza listagem imediatamente
      setIsModalOpen(false)
      await loadParameters()
    } catch (err: any) {
      console.error('Erro ao salvar parâmetro:', err)
      // Mantém popup aberto, preserva dados e exibe mensagem objetiva com a causa
      setFormError(err?.message || 'Falha ao salvar o parâmetro. Tente novamente.')
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
        const matchNotes = (p.notes || '').toLowerCase().includes(term)
        if (!matchName && !matchDesc && !matchVal && !matchNotes) return false
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
                  <SelectItem value="NUMERICO">Numérico</SelectItem>
                  <SelectItem value="TEXTO">Texto</SelectItem>
                  <SelectItem value="BOOLEANO">Booleano</SelectItem>
                  <SelectItem value="PERCENTUAL">Percentual</SelectItem>
                  <SelectItem value="TEMPO">Tempo</SelectItem>
                  <SelectItem value="RESTRICAO">Restrição</SelectItem>
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

      {/* MODAL: Cadastrar / Editar Parâmetro */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#004C97]" />
              {editingParameter
                ? 'Editar Parâmetro de Programação'
                : 'Cadastrar Parâmetro de Programação'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Centro de Trabalho: <span className="font-semibold text-slate-800">{centerCode}</span>
              {centerName ? ` (${centerName})` : ''} • As alterações serão registradas no relatório
              de logs de auditoria.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {formError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold block">Erro de validação:</span>
                  <span>{formError}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Nome do Parâmetro (Obrigatório) */}
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Nome do Parâmetro <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Tempo Mínimo de Resfriamento, Sequência Crítica, Lote Máximo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-8 text-xs border-slate-200 bg-white"
                  required
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">
                  Descrição / Finalidade
                </Label>
                <Input
                  type="text"
                  placeholder="Finalidade do parâmetro para o cálculo do sequenciamento ou validações"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="h-8 text-xs border-slate-200 bg-white"
                />
              </div>

              {/* Tipo de Parâmetro (Obrigatório) */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Tipo de Parâmetro <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formType}
                  onValueChange={(val: ProgrammingParameterType) => setFormType(val)}
                >
                  <SelectTrigger className="h-8 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="NUMERICO">Numérico</SelectItem>
                    <SelectItem value="TEXTO">Texto</SelectItem>
                    <SelectItem value="BOOLEANO">Booleano</SelectItem>
                    <SelectItem value="PERCENTUAL">Percentual</SelectItem>
                    <SelectItem value="TEMPO">Tempo</SelectItem>
                    <SelectItem value="RESTRICAO">Restrição</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status (Ativo / Inativo) */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(val: ProgrammingParameterStatus) => setFormStatus(val)}
                >
                  <SelectTrigger className="h-8 text-xs border-slate-200 bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valor Configurado */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Valor Configurado
                  {formType === 'NUMERICO' && ' (Ex: 12,50 ou 100)'}
                  {formType === 'PERCENTUAL' && ' (Ex: 85 ou 92,5)'}
                  {formType === 'TEMPO' && ' (Ex: 30)'}
                  {formType === 'BOOLEANO' && ' (Ex: TRUE ou FALSE)'}
                </Label>
                <Input
                  type="text"
                  placeholder={
                    formType === 'BOOLEANO'
                      ? 'TRUE / FALSE'
                      : formType === 'NUMERICO'
                        ? '0,00'
                        : 'Valor do parâmetro'
                  }
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="h-8 text-xs border-slate-200 bg-white font-mono"
                />
              </div>

              {/* Unidade de Medida */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Unidade de Medida (Opcional)
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: min, h, t, %, mm, dias"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="h-8 text-xs border-slate-200 bg-white"
                />
              </div>

              {/* Vigência Inicial (Obrigatória) */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Vigência Inicial (De) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formValidFrom}
                  onChange={(e) => setFormValidFrom(e.target.value)}
                  className="h-8 text-xs border-slate-200 bg-white"
                  required
                />
              </div>

              {/* Vigência Final (Opcional) */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Vigência Final (Até)</Label>
                <Input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  className="h-8 text-xs border-slate-200 bg-white"
                />
              </div>

              {/* Observações / Notas */}
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Observações / Notas</Label>
                <Textarea
                  placeholder="Informações adicionais sobre o comportamento esperado na programação..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="text-xs border-slate-200 bg-white min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="h-8 text-xs border-slate-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 font-bold gap-1.5"
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

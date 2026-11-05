import React, { useState } from 'react'
import {
  LineGaugeMinRestriction,
  CreateGaugeMinRestrictionDTO,
  UpdateGaugeMinRestrictionDTO,
  RestrictionType,
  RestrictionStatus,
} from '@/types/line-gauge-restriction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  MoreVertical,
  Edit2,
  Power,
  Trash2,
  Clock,
  Calendar,
  Scale,
  AlertTriangle,
  Info,
  Layers,
  Flame,
  ShieldCheck,
  Wrench,
  Shuffle,
  FileText,
} from 'lucide-react'
import {
  ORDERED_RESTRICTION_TYPES,
  RESTRICTION_TYPE_OPTIONS,
  RESTRICTION_RULE_PLACEHOLDERS,
  DEFAULT_UNITS_BY_TYPE,
  QUANTITY_UNITS,
  getReasonCategory,
} from '@/types/restriction-reasons-catalog'
import { RestrictionReasonSelect } from './RestrictionReasonSelect'

interface GaugeRestrictionsSectionProps {
  lineCode: string
  lineId?: string
  restrictions: LineGaugeMinRestriction[]
  isLoading?: boolean
  onAddRestriction?: (dto: CreateGaugeMinRestrictionDTO) => Promise<void>
  onUpdateRestriction?: (id: string, dto: UpdateGaugeMinRestrictionDTO) => Promise<void>
  onToggleStatus?: (id: string, newStatus: RestrictionStatus) => Promise<void>
  onDeleteRestriction?: (id: string) => Promise<void>
  readOnly?: boolean
}

export const GaugeRestrictionsSection: React.FC<GaugeRestrictionsSectionProps> = ({
  lineCode,
  lineId,
  restrictions = [],
  isLoading = false,
  onAddRestriction,
  onUpdateRestriction,
  onToggleStatus,
  onDeleteRestriction,
  readOnly = false,
}) => {
  const { toast } = useToast()

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LineGaugeMinRestriction | null>(null)

  // Campos do formulário do modal
  const [formType, setFormType] = useState<RestrictionType>('Horas')
  const [formReason, setFormReason] = useState<string>('')
  const [formReasonCategory, setFormReasonCategory] = useState<string>('')
  const [formMinValue, setFormMinValue] = useState<string>('1')
  const [formUnit, setFormUnit] = useState<string>('h')
  const [formRule, setFormRule] = useState<string>('')
  const [formStatus, setFormStatus] = useState<RestrictionStatus>('ATIVA')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    type?: string
    reason?: string
    rule?: string
    unit?: string
    minValue?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Diálogo de confirmação para Inativar
  const [inactivateTarget, setInactivateTarget] = useState<LineGaugeMinRestriction | null>(null)
  const [isInactivating, setIsInactivating] = useState(false)

  // Diálogo de confirmação para Exclusão
  const [deleteTarget, setDeleteTarget] = useState<LineGaugeMinRestriction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleOpenCreateModal = () => {
    setEditingItem(null)
    setFormType('Horas')
    setFormReason('')
    setFormReasonCategory('')
    setFormMinValue('1')
    setFormUnit('h')
    setFormRule('')
    setFormStatus('ATIVA')
    setValidationError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleOpenEditModal = (item: LineGaugeMinRestriction) => {
    setEditingItem(item)
    const currentType = (item.restriction_type as RestrictionType) || 'Horas'
    setFormType(currentType)
    setFormReason(item.reason || '')
    setFormReasonCategory(
      item.reason_category || (item.reason ? getReasonCategory(item.reason) : ''),
    )
    setFormMinValue(String(item.min_value ?? item.min_value_numeric ?? '1'))
    setFormUnit(item.unit_of_measure || item.unit || DEFAULT_UNITS_BY_TYPE[currentType] || 'un')
    setFormRule(item.rule_description || '')
    setFormStatus(item.status || 'ATIVA')
    setValidationError(null)
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleTypeChange = (newType: RestrictionType) => {
    setFormType(newType)
    setFieldErrors((prev) => ({ ...prev, type: undefined }))
    if (newType === 'Horas') {
      setFormUnit('h')
    } else if (newType === 'Dias') {
      setFormUnit('dia')
    } else if (newType === 'Quantidade') {
      setFormUnit((prev) => (QUANTITY_UNITS.includes(prev as any) ? prev : 't'))
    } else {
      setFormUnit(DEFAULT_UNITS_BY_TYPE[newType] || 'un')
    }
  }

  const handleReasonChange = (reason: string, category: string) => {
    setFormReason(reason)
    setFormReasonCategory(category)
    if (reason) {
      setFieldErrors((prev) => ({ ...prev, reason: undefined }))
      if (validationError) setValidationError(null)
    }
  }

  const handleSaveModal = async () => {
    // Validações estritas campo a campo com mensagens claras abaixo e foco no primeiro erro
    const errors: {
      type?: string
      reason?: string
      rule?: string
      unit?: string
      minValue?: string
    } = {}

    if (!formType) {
      errors.type = 'Selecione o Tipo da Restrição.'
    }

    if (!formReason || !formReason.trim()) {
      errors.reason = 'O Motivo da Restrição é obrigatório. Selecione uma opção da lista.'
    }

    if (!formRule || !formRule.trim()) {
      errors.rule = 'O campo Restrição / Regra é obrigatório. Descreva a regra operacional.'
    }

    const numValue = formMinValue.trim() ? Number(formMinValue) : NaN
    const isQuantitativeType =
      formType === 'Horas' || formType === 'Dias' || formType === 'Quantidade'

    if (isQuantitativeType) {
      if (!formMinValue.trim() || isNaN(numValue) || numValue <= 0) {
        errors.minValue = 'Informe um valor numérico válido maior que zero.'
      }
    }

    if (formType === 'Quantidade' && !formUnit.trim()) {
      errors.unit = 'Unidade de Medida é obrigatória para restrições por Quantidade.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setValidationError('Preencha todos os campos obrigatórios destacados abaixo.')
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios não preenchidos',
        description: 'Revise os campos destacados em vermelho antes de salvar.',
      })

      // Foco no primeiro erro
      setTimeout(() => {
        if (errors.type) {
          document.getElementById('tipo-restricao-select')?.focus()
        } else if (errors.reason) {
          document.getElementById('motivo-restricao-input')?.focus()
        } else if (errors.minValue) {
          document.getElementById('valor-minimo-input')?.focus()
        } else if (errors.rule) {
          document.getElementById('restricao-regra-textarea')?.focus()
        }
      }, 50)

      return
    }

    setFieldErrors({})
    setValidationError(null)
    setIsSubmitting(true)

    const effectiveMinValue = !isNaN(numValue) && numValue > 0 ? numValue : 1
    const effectiveUnit = formUnit.trim() || DEFAULT_UNITS_BY_TYPE[formType] || 'un'
    const category = formReasonCategory || getReasonCategory(formReason)

    try {
      if (editingItem) {
        // Edição preservando o MESMO ID
        if (onUpdateRestriction) {
          await onUpdateRestriction(editingItem.id, {
            restriction_type: formType,
            reason: formReason.trim(),
            reason_category: category,
            min_value: effectiveMinValue,
            min_value_numeric: effectiveMinValue,
            unit_of_measure: effectiveUnit,
            unit: effectiveUnit,
            rule_description: formRule.trim(),
            status: formStatus,
            is_active: formStatus === 'ATIVA',
          })
        }
        toast({
          title: 'Restrição atualizada',
          description: 'Restrição mínima atualizada com sucesso.',
        })
      } else {
        // Nova restrição (sempre cria novo registro, permitindo múltiplos do mesmo tipo)
        if (onAddRestriction) {
          await onAddRestriction({
            line_id: lineId,
            line_code: lineCode,
            restriction_type: formType,
            reason: formReason.trim(),
            reason_category: category,
            min_value: effectiveMinValue,
            min_value_numeric: effectiveMinValue,
            unit_of_measure: effectiveUnit,
            unit: effectiveUnit,
            rule_description: formRule.trim(),
            status: formStatus,
            is_active: formStatus === 'ATIVA',
          })
        }
        toast({
          title: 'Restrição criada',
          description: 'Restrição mínima criada com sucesso.',
        })
      }
      setModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar restrição',
        description: err?.message || 'Ocorreu um erro ao persistir a restrição mínima.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmInactivate = async () => {
    if (!inactivateTarget || !onToggleStatus) return
    setIsInactivating(true)
    try {
      await onToggleStatus(inactivateTarget.id, 'INATIVA')
      toast({
        title: 'Restrição inativada',
        description: 'A restrição mínima foi inativada com sucesso.',
      })
      setInactivateTarget(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao inativar restrição',
        description: err?.message || 'Não foi possível inativar a restrição.',
      })
    } finally {
      setIsInactivating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteRestriction) return
    setIsDeleting(true)
    try {
      await onDeleteRestriction(deleteTarget.id)
      toast({
        title: 'Restrição excluída',
        description: 'Restrição mínima excluída com sucesso.',
      })
      setDeleteTarget(null)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Exclusão não permitida',
        description:
          err?.message ||
          'Esta restrição possui histórico de utilização e não pode ser excluída. Utilize a opção Inativar.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Horas':
        return <Clock className="w-3.5 h-3.5 text-blue-600" />
      case 'Dias':
        return <Calendar className="w-3.5 h-3.5 text-indigo-600" />
      case 'Quantidade':
        return <Scale className="w-3.5 h-3.5 text-amber-600" />
      case 'Carga de Enfornamento':
        return <Flame className="w-3.5 h-3.5 text-orange-600" />
      case 'Qualidade':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
      case 'Montagem':
        return <Wrench className="w-3.5 h-3.5 text-cyan-600" />
      case 'Sequenciamento':
        return <Shuffle className="w-3.5 h-3.5 text-purple-600" />
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-600" />
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#004C97]" />
              RESTRIÇÕES MÍNIMAS DE PROGRAMAÇÃO POR BITOLA
            </h4>
            <Badge
              variant="outline"
              className="text-[10px] font-mono font-bold bg-blue-50 text-[#004C97] border-blue-200"
            >
              {restrictions.length}{' '}
              {restrictions.length === 1 ? 'restrição cadastrada' : 'restrições cadastradas'}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cadastre as condições mínimas que deverão ser atendidas antes da troca de bitola neste
            Centro.
          </p>
        </div>

        {!readOnly && (
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-7 px-2.5 font-semibold gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> + Criar Restrição Mínima
          </Button>
        )}
      </div>

      {/* Listagem em formato de tabela compacta / identidade CIAFAL */}
      {isLoading ? (
        <div className="p-6 text-center text-xs text-slate-500">
          Carregando restrições mínimas...
        </div>
      ) : restrictions.length === 0 ? (
        <div className="p-4 bg-slate-50 rounded border border-dashed border-slate-200 text-center space-y-1.5">
          <Info className="w-5 h-5 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            Nenhuma restrição mínima cadastrada para este Centro.
          </p>
          <p className="text-[11px] text-slate-500">
            Clique em <strong>+ Criar Restrição Mínima</strong> para cadastrar limites de horas,
            dias ou quantidade antes da troca de bitola.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3">Motivo</th>
                <th className="py-2 px-3">Mínimo</th>
                <th className="py-2 px-3">Unidade</th>
                <th className="py-2 px-3">Restrição / Regra</th>
                <th className="py-2 px-3 text-center">Status</th>
                {!readOnly && <th className="py-2 px-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {restrictions.map((item) => {
                const isActive = item.status === 'ATIVA'

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !isActive ? 'bg-slate-50/50 text-slate-400 opacity-75' : 'text-slate-800'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {getTypeIcon(item.restriction_type)}
                        <span>{item.restriction_type}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {item.reason ? (
                        <div className="space-y-0.5">
                          <span
                            className="font-medium text-slate-900 block truncate max-w-[180px]"
                            title={item.reason}
                          >
                            {item.reason}
                          </span>
                          {item.reason_category && (
                            <span className="text-[9px] text-slate-400 block truncate max-w-[180px]">
                              {item.reason_category}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Não especificado</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {item.min_value ?? item.min_value_numeric ?? '-'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {item.unit_of_measure || item.unit || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] max-w-xs break-words">
                      {item.rule_description}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-[10px]">
                          ● Ativa
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-300 font-bold text-[10px]">
                          ○ Inativa
                        </Badge>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="py-2.5 px-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="text-xs min-w-[160px] bg-white"
                          >
                            <DropdownMenuItem
                              onClick={() => handleOpenEditModal(item)}
                              className="gap-2 cursor-pointer font-medium text-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[#004C97]" /> Editar Restrição
                            </DropdownMenuItem>

                            {isActive ? (
                              <DropdownMenuItem
                                onClick={() => setInactivateTarget(item)}
                                className="gap-2 cursor-pointer font-medium text-amber-600 hover:text-amber-700"
                              >
                                <Power className="w-3.5 h-3.5 text-amber-500" /> Inativar Restrição
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (onToggleStatus) {
                                    try {
                                      await onToggleStatus(item.id, 'ATIVA')
                                      toast({
                                        title: 'Restrição ativada',
                                        description: 'Restrição mínima ativada com sucesso.',
                                      })
                                    } catch (err: any) {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Erro ao ativar',
                                        description: err?.message,
                                      })
                                    }
                                  }
                                }}
                                className="gap-2 cursor-pointer font-medium text-emerald-600 hover:text-emerald-700"
                              >
                                <Power className="w-3.5 h-3.5 text-emerald-500" /> Reativar
                                Restrição
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => {
                                if (item.has_scheduling_history) {
                                  toast({
                                    variant: 'destructive',
                                    title: 'Exclusão Bloqueada',
                                    description:
                                      'Esta restrição possui histórico de utilização e não pode ser excluída. Utilize a opção Inativar.',
                                  })
                                } else {
                                  setDeleteTarget(item)
                                }
                              }}
                              className="gap-2 cursor-pointer font-medium text-rose-600 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar / Editar Restrição Mínima */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg bg-white border-slate-200 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#004C97]" />
              {editingItem ? 'Editar Restrição Mínima' : 'Criar Restrição Mínima'}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              Parametrize as regras mínimas operacionais do centro para auditoria e controle do PCP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {validationError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* 1. Tipo da Restrição * (7 opções ordenadas) */}
            <div className="space-y-1">
              <Label
                htmlFor="tipo-restricao-select"
                className="text-xs font-semibold text-slate-700"
              >
                Tipo da Restrição *
              </Label>
              <select
                id="tipo-restricao-select"
                value={formType}
                onChange={(e) => handleTypeChange(e.target.value as RestrictionType)}
                className={`w-full bg-slate-50 border rounded px-2.5 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97] ${
                  fieldErrors.type ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300'
                }`}
              >
                {RESTRICTION_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.order}. {t.label}
                  </option>
                ))}
              </select>
              {fieldErrors.type && (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.type}</p>
              )}
            </div>

            {/* 2. Motivo da Restrição * (Novo campo obrigatório, pesquisável, rolagem interna, ordenado por relevância ao Tipo) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="motivo-restricao-input"
                  className="text-xs font-semibold text-slate-700"
                >
                  Motivo da Restrição *
                </Label>
                <span className="text-[10px] text-slate-400">
                  Sugestões priorizadas para: <strong className="text-slate-600">{formType}</strong>
                </span>
              </div>
              <RestrictionReasonSelect
                id="motivo-restricao-input"
                value={formReason}
                onChange={handleReasonChange}
                restrictionType={formType}
                hasError={Boolean(fieldErrors.reason)}
              />
              {fieldErrors.reason && (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.reason}</p>
              )}
            </div>

            {/* 3. Restrição / Regra * (com placeholder dinâmico por tipo) */}
            <div className="space-y-1">
              <Label
                htmlFor="restricao-regra-textarea"
                className="text-xs font-semibold text-slate-700"
              >
                Restrição / Regra *
              </Label>
              <Textarea
                id="restricao-regra-textarea"
                rows={3}
                value={formRule}
                onChange={(e) => {
                  setFormRule(e.target.value)
                  if (fieldErrors.rule) setFieldErrors((prev) => ({ ...prev, rule: undefined }))
                  if (validationError) setValidationError(null)
                }}
                placeholder={RESTRICTION_RULE_PLACEHOLDERS[formType]}
                className={`text-xs bg-slate-50 resize-none ${
                  fieldErrors.rule ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300'
                }`}
              />
              {fieldErrors.rule ? (
                <p className="text-[11px] text-rose-600 font-medium">{fieldErrors.rule}</p>
              ) : (
                <p className="text-[10px] text-slate-400">
                  Descreva claramente a regra operacional para auditoria e acompanhamento do PCP.
                </p>
              )}
            </div>

            {/* 4. Valor Mínimo e Unidade de Medida (compatibilidade quantitativa quando aplicável) */}
            {(formType === 'Horas' || formType === 'Dias' || formType === 'Quantidade') && (
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/70 border border-slate-200 rounded">
                <div className="space-y-1">
                  <Label
                    htmlFor="valor-minimo-input"
                    className="text-[11px] font-semibold text-slate-700"
                  >
                    Valor Mínimo *
                  </Label>
                  <Input
                    id="valor-minimo-input"
                    type="number"
                    min="0.1"
                    step="any"
                    value={formMinValue}
                    onChange={(e) => {
                      setFormMinValue(e.target.value)
                      if (fieldErrors.minValue)
                        setFieldErrors((prev) => ({ ...prev, minValue: undefined }))
                      if (validationError) setValidationError(null)
                    }}
                    placeholder="Ex: 8, 100, 1"
                    className={`h-7 text-xs font-mono font-bold bg-white ${
                      fieldErrors.minValue ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300'
                    }`}
                  />
                  {fieldErrors.minValue && (
                    <p className="text-[10px] text-rose-600 font-medium">{fieldErrors.minValue}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    {formType === 'Quantidade' ? 'Unidade de Medida *' : 'Unidade'}
                  </Label>
                  {formType === 'Quantidade' ? (
                    <select
                      value={formUnit}
                      onChange={(e) => {
                        setFormUnit(e.target.value)
                        if (fieldErrors.unit)
                          setFieldErrors((prev) => ({ ...prev, unit: undefined }))
                      }}
                      className="w-full bg-white border border-slate-300 rounded px-2 h-7 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
                    >
                      {QUANTITY_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      readOnly
                      value={formType === 'Horas' ? 'Horas (h)' : 'Dias'}
                      className="h-7 text-xs bg-slate-100 text-slate-600 font-mono cursor-not-allowed"
                    />
                  )}
                  {fieldErrors.unit && (
                    <p className="text-[10px] text-rose-600 font-medium">{fieldErrors.unit}</p>
                  )}
                </div>
              </div>
            )}

            {/* 5. Status (Ativa / Inativa) */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Status Operacional</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formStatus === 'ATIVA' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormStatus('ATIVA')}
                  className={`h-7 text-xs flex-1 ${
                    formStatus === 'ATIVA'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                      : ''
                  }`}
                >
                  ● Ativa
                </Button>
                <Button
                  type="button"
                  variant={formStatus === 'INATIVA' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormStatus('INATIVA')}
                  className={`h-7 text-xs flex-1 ${
                    formStatus === 'INATIVA'
                      ? 'bg-slate-600 hover:bg-slate-700 text-white font-bold'
                      : ''
                  }`}
                >
                  ○ Inativa
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-1 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveModal}
              disabled={isSubmitting}
              className="bg-[#004C97] hover:bg-[#003870] text-white h-8 text-xs font-semibold"
            >
              {isSubmitting ? 'Salvando...' : editingItem ? 'Salvar Alterações' : 'Criar Restrição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Inativação */}
      <AlertDialog
        open={Boolean(inactivateTarget)}
        onOpenChange={(open) => !open && setInactivateTarget(null)}
      >
        <AlertDialogContent className="bg-white border-slate-200 max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <AlertDialogTitle className="text-base font-bold text-slate-900">
                Inativar esta restrição mínima?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              A restrição deixará de ser considerada nas novas programações, mas será preservada
              para histórico e auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel disabled={isInactivating} className="text-xs h-8">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmInactivate}
              disabled={isInactivating}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8"
            >
              {isInactivating ? 'Inativando...' : 'Inativar Restrição'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Confirmação para Exclusão */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-white border-slate-200 max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />
              <AlertDialogTitle className="text-base font-bold text-slate-900">
                Excluir restrição mínima?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Esta ação removerá permanentemente a restrição cadastrada ({deleteTarget?.min_value}{' '}
              {deleteTarget?.unit_of_measure}). Se houver histórico de utilização em programações, a
              exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel disabled={isDeleting} className="text-xs h-8">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

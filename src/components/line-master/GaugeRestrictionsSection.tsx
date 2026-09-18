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
} from 'lucide-react'

// Opções iniciais expansíveis
const RESTRICTION_TYPES: { label: string; value: RestrictionType; defaultUnit: string }[] = [
  { label: 'Horas', value: 'Horas', defaultUnit: 'h' },
  { label: 'Dias', value: 'Dias', defaultUnit: 'dia' },
  { label: 'Quantidade', value: 'Quantidade', defaultUnit: 't' },
]

// Unidades produtivas cadastradas no sistema/Centro/Ficha Mestra
const QUANTITY_UNITS = [
  't',
  'kg',
  'peças',
  'metros',
  'unidades',
  'barras',
  'tarugos',
  'palanquilhas',
]

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
  const [formMinValue, setFormMinValue] = useState<string>('')
  const [formUnit, setFormUnit] = useState<string>('h')
  const [formRule, setFormRule] = useState<string>('')
  const [formStatus, setFormStatus] = useState<RestrictionStatus>('ATIVA')
  const [validationError, setValidationError] = useState<string | null>(null)
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
    setFormMinValue('')
    setFormUnit('h')
    setFormRule('')
    setFormStatus('ATIVA')
    setValidationError(null)
    setModalOpen(true)
  }

  const handleOpenEditModal = (item: LineGaugeMinRestriction) => {
    setEditingItem(item)
    setFormType(item.restriction_type || 'Horas')
    setFormMinValue(String(item.min_value ?? ''))
    setFormUnit(
      item.unit_of_measure ||
        (item.restriction_type === 'Horas' ? 'h' : item.restriction_type === 'Dias' ? 'dia' : 't'),
    )
    setFormRule(item.rule_description || '')
    setFormStatus(item.status || 'ATIVA')
    setValidationError(null)
    setModalOpen(true)
  }

  const handleTypeChange = (newType: RestrictionType) => {
    setFormType(newType)
    if (newType === 'Horas') {
      setFormUnit('h')
    } else if (newType === 'Dias') {
      setFormUnit('dia')
    } else if (newType === 'Quantidade') {
      setFormUnit((prev) => (QUANTITY_UNITS.includes(prev) ? prev : 't'))
    }
  }

  const handleSaveModal = async () => {
    // Validações estritas
    const numValue = Number(formMinValue)

    if (!formType || !formMinValue.trim() || isNaN(numValue) || numValue <= 0 || !formRule.trim()) {
      setValidationError('Preencha os campos obrigatórios da restrição mínima.')
      toast({
        variant: 'destructive',
        title: 'Validação',
        description: 'Preencha os campos obrigatórios da restrição mínima.',
      })
      return
    }

    if (formType === 'Quantidade' && !formUnit.trim()) {
      setValidationError('Unidade de Medida é obrigatória para restrições por Quantidade.')
      toast({
        variant: 'destructive',
        title: 'Validação',
        description: 'Unidade de Medida é obrigatória para restrições por Quantidade.',
      })
      return
    }

    setValidationError(null)
    setIsSubmitting(true)

    try {
      if (editingItem) {
        // Edição preservando o MESMO ID
        if (onUpdateRestriction) {
          await onUpdateRestriction(editingItem.id, {
            restriction_type: formType,
            min_value: numValue,
            unit_of_measure: formUnit.trim(),
            rule_description: formRule.trim(),
            status: formStatus,
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
            min_value: numValue,
            unit_of_measure: formUnit.trim(),
            rule_description: formRule.trim(),
            status: formStatus,
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
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(item.restriction_type)}
                        <span>{item.restriction_type}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {item.min_value}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{item.unit_of_measure}</td>
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
        <DialogContent className="max-w-md bg-white border-slate-200 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              {editingItem ? 'Editar Restrição Mínima' : 'Criar Restrição Mínima'}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-slate-500">
              Parametrize as regras mínimas para a permanência na bitola antes da troca.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {validationError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                {validationError}
              </div>
            )}

            {/* 1. Tipo / Unidade da Restrição * */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Tipo da Restrição *</Label>
              <select
                value={formType}
                onChange={(e) => handleTypeChange(e.target.value as RestrictionType)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
              >
                {RESTRICTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Valor Mínimo * e Unidade de Medida */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Valor Mínimo *</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="any"
                  value={formMinValue}
                  onChange={(e) => {
                    setFormMinValue(e.target.value)
                    if (validationError) setValidationError(null)
                  }}
                  placeholder="Ex: 8, 100, 1"
                  className="h-8 text-xs font-mono font-bold bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  {formType === 'Quantidade' ? 'Unidade de Medida *' : 'Unidade'}
                </Label>
                {formType === 'Quantidade' ? (
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
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
                    className="h-8 text-xs bg-slate-100 text-slate-600 font-mono cursor-not-allowed"
                  />
                )}
              </div>
            </div>

            {/* 3. Restrição / Regra * */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Restrição / Regra *</Label>
              <Textarea
                rows={3}
                value={formRule}
                onChange={(e) => {
                  setFormRule(e.target.value)
                  if (validationError) setValidationError(null)
                }}
                placeholder="Ex: Manter no mínimo 8 horas consecutivas de produção da mesma bitola antes de permitir troca."
                className="text-xs bg-slate-50 resize-none"
              />
              <p className="text-[10px] text-slate-400">
                Descreva claramente a regra operacional para auditoria e acompanhamento do PCP.
              </p>
            </div>

            {/* 4. Status (Ativa / Inativa) */}
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

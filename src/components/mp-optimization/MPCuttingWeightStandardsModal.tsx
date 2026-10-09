import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Scale,
  Plus,
  Edit2,
  Power,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  X,
  Save,
  Search,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type {
  MPCuttingWeightStandard,
  MPCuttingType,
  MPToleranceType,
  MPStandardPriority,
} from '@/types/mp-cutting-weight-standards'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'
import { parsePtBrNumber, formatNumberPtBr } from '@/lib/number-format'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface MPCuttingWeightStandardsModalProps {
  isOpen: boolean
  onClose: () => void
  onStandardsChanged?: () => void
}

export const MPCuttingWeightStandardsModal: React.FC<MPCuttingWeightStandardsModalProps> = ({
  isOpen,
  onClose,
  onStandardsChanged,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [standards, setStandards] = useState<MPCuttingWeightStandard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('TODOS')

  // Estado do formulário de criação/edição
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<MPCuttingWeightStandard>>({
    cutting_type: 'BLOCOS',
    company_code: 'CIAFAL',
    center_codes: [],
    material_codes: [],
    steel_family: '',
    target_weight_kg: undefined,
    min_weight_kg: undefined,
    max_weight_kg: undefined,
    tolerance_lower_val: 0,
    tolerance_lower_type: 'KG',
    tolerance_upper_val: 0,
    tolerance_upper_type: 'KG',
    priority: 'MEDIA',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'ATIVO',
    technical_notes: '',
  })

  // Estados textuais em pt-BR para evitar parsing incorreto de milhar/decimal
  // O cadastro foi simplificado para 3 parâmetros: Peso Ideal (t), Peso Mínimo (t) e Peso Máximo (t)
  const [targetWeightInput, setTargetWeightInput] = useState('')
  const [minWeightInput, setMinWeightInput] = useState('')
  const [maxWeightInput, setMaxWeightInput] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [highlightedCode, setHighlightedCode] = useState<string | null>(null)

  // Diálogo de confirmação de Ativação / Inativação
  const [statusConfirmItem, setStatusConfirmItem] = useState<MPCuttingWeightStandard | null>(null)
  const [inactivationReason, setInactivationReason] = useState<string>('')
  const [statusConfirmError, setStatusConfirmError] = useState<string | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false)

  // Data atual no fuso America/Sao_Paulo (UTC-3)
  const getTodaySp = () => {
    const now = new Date()
    const spOffsetMs = -3 * 3600 * 1000
    const spNow = new Date(now.getTime() + spOffsetMs)
    return spNow.toISOString().split('T')[0]
  }
  const todaySp = getTodaySp()

  // Centros e materiais disponíveis no sistema CIAFAL
  const availableCenters = [
    { code: 'SEML1', name: 'SEML1 — Laminação Geral L1' },
    { code: 'PNCL1', name: 'PNCL1 — Prensa e Corte L1' },
    { code: 'PNCL2', name: 'PNCL2 — Prensa e Corte L2' },
    { code: 'OXIFERKS', name: 'OXIFERKS — Oxicorte CIAFAL' },
    { code: 'PNCSDC', name: 'PNCSDC — Corte Sidercentro' },
    { code: 'ACAB_L2', name: 'ACAB_L2 — Acabamento L2' },
  ]

  const availableMaterials = [
    { code: 'TARUGO-130-1020', label: 'Tarugo 130x130 SAE 1020' },
    { code: 'TARUGO-150-1045', label: 'Tarugo 150x150 SAE 1045' },
    { code: 'TARUGO-160-5160', label: 'Tarugo 160x160 SAE 5160' },
    { code: 'PLACA-200-A36', label: 'Placa Laminada 200 mm ASTM A36' },
    { code: 'BARRA-RED-75-1020', label: 'Barra Redonda 75 mm SAE 1020' },
  ]

  const fetchStandards = async () => {
    setLoading(true)
    try {
      const data = await mpCuttingWeightStandardsService.listStandards(true)
      setStandards(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStandards()
      setIsEditing(false)
      setFormError(null)
      setFormSuccess(null)
    }
  }, [isOpen])

  const handleOpenCreate = () => {
    // LIMPEZA COMPLETA: nunca reaproveita valores de cadastros anteriores
    setFormData({
      code: '',
      description: '',
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      steel_family: '',
      target_weight_kg: undefined,
      min_weight_kg: undefined,
      max_weight_kg: undefined,
      priority: 'MEDIA',
      start_date: todaySp,
      end_date: '',
      status: 'ATIVO',
      technical_notes: '',
    })
    setTargetWeightInput('')
    setMinWeightInput('')
    setMaxWeightInput('')
    setFieldErrors({})
    setFormError(null)
    setFormSuccess(null)
    setIsEditing(true)
  }

  const handleOpenEdit = (item: MPCuttingWeightStandard) => {
    setFormData({
      ...item,
    })

    // Formata os pesos de kg -> t no padrão visual pt-BR com 3 casas decimais
    setTargetWeightInput(
      item.target_weight_kg != null && !isNaN(Number(item.target_weight_kg))
        ? (Number(item.target_weight_kg) / 1000).toLocaleString('pt-BR', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          })
        : '',
    )
    setMinWeightInput(
      item.min_weight_kg != null && !isNaN(Number(item.min_weight_kg))
        ? (Number(item.min_weight_kg) / 1000).toLocaleString('pt-BR', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          })
        : '',
    )
    setMaxWeightInput(
      item.max_weight_kg != null && !isNaN(Number(item.max_weight_kg))
        ? (Number(item.max_weight_kg) / 1000).toLocaleString('pt-BR', {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
          })
        : '',
    )
    setFieldErrors({})
    setFormError(null)
    setFormSuccess(null)
    setIsEditing(true)
  }

  const handleToggleCenter = (centerCode: string) => {
    const current = formData.center_codes || []
    if (current.includes(centerCode)) {
      setFormData({
        ...formData,
        center_codes: current.filter((c) => c !== centerCode),
      })
    } else {
      setFormData({
        ...formData,
        center_codes: [...current, centerCode],
      })
    }
  }

  const handleToggleMaterial = (matCode: string) => {
    const current = formData.material_codes || []
    if (current.includes(matCode)) {
      setFormData({
        ...formData,
        material_codes: current.filter((m) => m !== matCode),
      })
    } else {
      setFormData({
        ...formData,
        material_codes: [...current, matCode],
      })
    }
  }

  // Regra literal do usuário:
  // "Não modificar automaticamente o peso mínimo ou máximo quando o usuário alterar o peso ideal."
  // O cadastro passa a usar exclusivamente três parâmetros: Peso Ideal (t), Peso Mínimo (t), Peso Máximo (t).
  const handleTargetChange = (raw: string) => {
    setTargetWeightInput(raw)
    setFieldErrors((prev) => ({
      ...prev,
      target_weight_kg: '',
      min_weight_kg: '',
      max_weight_kg: '',
    }))
  }

  const handleMinWeightChange = (raw: string) => {
    setMinWeightInput(raw)
    setFieldErrors((prev) => ({ ...prev, min_weight_kg: '' }))
  }

  const handleMaxWeightChange = (raw: string) => {
    setMaxWeightInput(raw)
    setFieldErrors((prev) => ({ ...prev, max_weight_kg: '' }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    setFormSuccess(null)
    setFieldErrors({})

    const parsedTargetTon = parsePtBrNumber(targetWeightInput)
    const parsedMinTon = parsePtBrNumber(minWeightInput)
    const parsedMaxTon = parsePtBrNumber(maxWeightInput)

    // Conversão para unidade interna canônica (kg)
    const targetKg = isNaN(parsedTargetTon) ? 0 : parsedTargetTon * 1000
    const minKg = isNaN(parsedMinTon) ? 0 : parsedMinTon * 1000
    const maxKg = isNaN(parsedMaxTon) ? 0 : parsedMaxTon * 1000

    // O sistema não exige tolerâncias adicionais. Os limites mínimo e máximo já definem a faixa permitida.
    const payloadToValidate: Partial<MPCuttingWeightStandard> = {
      ...formData,
      target_weight_kg: targetKg,
      min_weight_kg: minKg,
      max_weight_kg: maxKg,
    }

    // Validação de engenharia com destaque dos campos
    const validation = mpCuttingWeightStandardsService.validateStandard(
      payloadToValidate,
      standards,
    )
    if (!validation.isValid) {
      setFieldErrors(validation.errors)
      const firstErrKey = Object.keys(validation.errors)[0]
      const firstErrMsg = validation.errors[firstErrKey]
      const formattedReason = `Não foi possível salvar o padrão de peso: ${firstErrMsg}`
      setFormError(formattedReason)
      toast({
        variant: 'destructive',
        title: 'Validação de Engenharia',
        description: formattedReason,
      })
      setSaving(false)
      return
    }

    try {
      const res = await mpCuttingWeightStandardsService.saveStandard(
        payloadToValidate,
        user?.name || user?.email || 'Engenheiro PCP',
      )

      if (!res.success || !res.standard) {
        const errorReason = res.error || 'Erro interno ao processar gravação'
        const fullMsg = `Não foi possível salvar o padrão de peso: ${errorReason}.`
        setFormError(fullMsg)
        toast({
          variant: 'destructive',
          title: 'Erro ao Salvar',
          description: fullMsg,
        })
        return
      }

      const code = res.standard.code
      const isUpdate = Boolean(payloadToValidate.id)
      const successMsg = isUpdate
        ? `Padrão de Peso nº [${code}] atualizado com sucesso.`
        : `Padrão de Peso nº [${code}] cadastrado com sucesso.`
      setFormSuccess(successMsg)
      setHighlightedCode(code)
      toast({
        title: 'Sucesso',
        description: successMsg,
      })

      // Atualização imediata da tabela real (fetchPocketBase) e callback externo
      await fetchStandards()
      onStandardsChanged?.()

      // Regra inegociável: NUNCA fechar ou limpar automaticamente via setTimeout.
      // Retorna imediatamente à visão de lista dentro do popup, mantendo o banner persistente
      // e destacando a nova linha gravada até fechamento manual.
      setIsEditing(false)
      setFormError(null)
    } catch (e: any) {
      const msg = `Não foi possível salvar o padrão de peso: ${e?.message || 'Falha de rede'}.`
      setFormError(msg)
      toast({
        variant: 'destructive',
        title: 'Falha no Sistema',
        description: msg,
      })
    } finally {
      // GARANTIA: botão de salvar nunca fica travado
      setSaving(false)
    }
  }

  const handleOpenToggleStatusDialog = (item: MPCuttingWeightStandard) => {
    setStatusConfirmItem(item)
    setInactivationReason('')
    setStatusConfirmError(null)
  }

  const handleConfirmToggleStatus = async () => {
    if (!statusConfirmItem) return
    setIsTogglingStatus(true)
    setStatusConfirmError(null)

    const isActivating = statusConfirmItem.status !== 'ATIVO'

    try {
      const res = await mpCuttingWeightStandardsService.toggleStatus(
        statusConfirmItem,
        user?.name || user?.email || 'Engenheiro PCP',
        inactivationReason,
      )

      if (res.success) {
        toast({
          title: isActivating ? 'Padrão Ativado' : 'Padrão Inativado',
          description: `Padrão nº [${statusConfirmItem.code}] teve seu status atualizado para ${isActivating ? 'Ativo' : 'Inativo'}.`,
        })
        setStatusConfirmItem(null)
        await fetchStandards()
        onStandardsChanged?.()
      } else {
        setStatusConfirmError(res.error || 'Erro ao alterar status do padrão.')
      }
    } catch (err: any) {
      setStatusConfirmError(err?.message || 'Falha de comunicação ao atualizar status.')
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const filteredStandards = standards.filter((s) => {
    if (filterType !== 'TODOS' && s.cutting_type !== filterType) return false
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      s.code.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term) ||
      s.center_codes.some((c) => c.toLowerCase().includes(term)) ||
      s.material_codes.some((m) => m.toLowerCase().includes(term))
    )
  })

  const handleModalClose = () => {
    // Bloquear fechamento se estiver no meio do salvamento
    if (saving) return

    // Se estiver editando e houver dados digitados não salvos, confirmar antes de descartar
    const hasUnsavedChanges =
      isEditing &&
      Boolean(
        formData.description?.trim() ||
        targetWeightInput.trim() ||
        minWeightInput.trim() ||
        maxWeightInput.trim(),
      )

    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        'Há alterações não salvas no padrão de peso. Deseja realmente fechar e descartar os dados?',
      )
      if (!confirmDiscard) return
    }

    onClose()
  }

  // Verificar se o padrão recém-salvo ficou oculto pelos filtros ativos
  const isHighlightedItemHiddenByFilters =
    Boolean(highlightedCode) && !filteredStandards.some((s) => s.code === highlightedCode)

  const handleClearFilters = () => {
    setSearchTerm('')
    setFilterType('TODOS')
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleModalClose()
        }
      }}
    >
      <DialogContent
        onPointerDownOutside={(e) => {
          if (saving) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (saving) {
            e.preventDefault()
          }
        }}
        className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-50 border-blue-900/20 p-6"
      >
        <ErrorBoundary
          fallback={
            <div className="p-4 text-red-600">Erro ao renderizar popup de Padrões de Peso.</div>
          }
        >
          <DialogHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-900 text-white shadow-sm">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-blue-950 flex items-center gap-2">
                    Padrões de Peso para Corte
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      CIAFAL PCP
                    </Badge>
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Cadastro técnico de faixas nominais e tolerâncias industriais para blocos e
                    múltiplos de MP
                  </p>
                </div>
              </div>
              {!isEditing && (
                <Button
                  onClick={handleOpenCreate}
                  className="bg-blue-900 hover:bg-blue-950 text-white gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Novo Padrão de Peso
                </Button>
              )}
            </div>

            {/* BANNER DE SUCESSO PERSISTENTE NA VISÃO DE LISTA (fora do form desmontado) */}
            {!isEditing && formSuccess && (
              <div className="mt-3">
                <Alert className="bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm flex items-center justify-between py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <AlertDescription className="text-sm font-semibold text-emerald-900">
                      {formSuccess}
                    </AlertDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormSuccess(null)}
                    className="h-6 w-6 p-0 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/60 rounded"
                    title="Fechar aviso de confirmação"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </Alert>
              </div>
            )}
          </DialogHeader>

          {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5 py-4">
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-semibold text-blue-900 text-base">
                    {formData.id
                      ? `Editar Padrão: ${formData.code}`
                      : 'Cadastrar Novo Padrão de Peso'}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (saving) return
                      const hasData = Boolean(
                        formData.description?.trim() ||
                        targetWeightInput.trim() ||
                        minWeightInput.trim() ||
                        maxWeightInput.trim(),
                      )
                      if (hasData) {
                        const ok = window.confirm(
                          'Deseja cancelar a edição e descartar os dados preenchidos?',
                        )
                        if (!ok) return
                      }
                      setIsEditing(false)
                      setFormError(null)
                    }}
                    className="text-slate-500 hover:text-slate-800"
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                </div>

                {formError && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-sm font-medium">{formError}</AlertDescription>
                  </Alert>
                )}

                {formSuccess && (
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <AlertDescription className="text-sm font-medium">
                      {formSuccess}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Linha 1: Descrição, Tipo de Corte, Empresa, Prioridade */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Descrição do Padrão *
                    </Label>
                    <Input
                      value={formData.description || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, description: e.target.value })
                        setFieldErrors((prev) => ({ ...prev, description: '' }))
                      }}
                      placeholder="Ex: Tarugo L1 130x130 Padrão Bloco 1,250 t"
                      className={`mt-1 ${fieldErrors.description ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                      required
                    />{' '}
                    {fieldErrors.description && (
                      <p className="text-[11px] text-red-600 font-medium mt-1">
                        {fieldErrors.description}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Tipo de Corte *</Label>
                    <select
                      value={formData.cutting_type || 'BLOCOS'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cutting_type: e.target.value as MPCuttingType,
                        })
                      }
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="BLOCOS">Blocos</option>
                      <option value="MULTIPLOS">Múltiplos</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Prioridade *</Label>
                    <select
                      value={formData.priority || 'ALTA'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as MPStandardPriority,
                        })
                      }
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="ALTA">Alta</option>
                      <option value="MEDIA">Média</option>
                      <option value="BAIXA">Baixa</option>
                    </select>
                  </div>
                </div>

                {/* Linha 2: Centros de Aplicação (Múltiplos centros permitidos) */}
                <div>
                  <Label className="text-xs font-semibold text-slate-700 block mb-1">
                    Centros de Aplicação (PCP) * — Permite múltiplos centros
                  </Label>
                  {fieldErrors.center_codes && (
                    <p className="text-[11px] text-red-600 font-medium mb-1.5">
                      {fieldErrors.center_codes}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableCenters.map((c) => {
                      const selected = (formData.center_codes || []).includes(c.code)
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleToggleCenter(c.code)}
                          className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-all ${
                            selected
                              ? 'bg-blue-900 text-white border-blue-950 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {c.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Linha 3: Material / MP (Seleção Múltipla) e Família de Aço */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 block mb-1">
                      Material / Matéria-Prima * — Seleção múltipla
                    </Label>
                    {fieldErrors.material_codes && (
                      <p className="text-[11px] text-red-600 font-medium mb-1.5">
                        {fieldErrors.material_codes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {availableMaterials.map((m) => {
                        const selected = (formData.material_codes || []).includes(m.code)
                        return (
                          <button
                            key={m.code}
                            type="button"
                            onClick={() => handleToggleMaterial(m.code)}
                            className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-all ${
                              selected
                                ? 'bg-indigo-900 text-white border-indigo-950 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Família / Aço (Opcional)
                    </Label>
                    <Input
                      value={formData.steel_family || ''}
                      onChange={(e) => setFormData({ ...formData, steel_family: e.target.value })}
                      placeholder="Ex: SAE 1020, ASTM A36"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Bloco Simplificado de Parâmetros de Peso (Exclusivamente 3 parâmetros) */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-blue-700" /> Parâmetros de Peso (t)
                    </span>
                    <span className="text-xs text-slate-500">
                      Regra de Engenharia: Peso Mínimo ≤ Peso Ideal ≤ Peso Máximo (1 t = 1.000 kg)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Peso Ideal (t) *
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={targetWeightInput}
                        onChange={(e) => handleTargetChange(e.target.value)}
                        placeholder="Ex: 2,100"
                        className={`mt-1 font-bold text-blue-950 bg-white ${
                          fieldErrors.target_weight_kg
                            ? 'border-red-500 ring-1 ring-red-400 bg-red-50/20'
                            : ''
                        }`}
                        required
                      />
                      {fieldErrors.target_weight_kg && (
                        <p className="text-[11px] text-red-600 font-medium mt-1">
                          {fieldErrors.target_weight_kg}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Peso Mínimo Permitido (t) *
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={minWeightInput}
                        onChange={(e) => handleMinWeightChange(e.target.value)}
                        placeholder="Ex: 2,000"
                        className={`mt-1 font-semibold text-slate-900 bg-white ${
                          fieldErrors.min_weight_kg
                            ? 'border-red-500 ring-1 ring-red-400 bg-red-50/20'
                            : ''
                        }`}
                        required
                      />
                      {fieldErrors.min_weight_kg && (
                        <p className="text-[11px] text-red-600 font-medium mt-1">
                          {fieldErrors.min_weight_kg}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Peso Máximo Permitido (t) *
                      </Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={maxWeightInput}
                        onChange={(e) => handleMaxWeightChange(e.target.value)}
                        placeholder="Ex: 2,300"
                        className={`mt-1 font-semibold text-slate-900 bg-white ${
                          fieldErrors.max_weight_kg
                            ? 'border-red-500 ring-1 ring-red-400 bg-red-50/20'
                            : ''
                        }`}
                        required
                      />
                      {fieldErrors.max_weight_kg && (
                        <p className="text-[11px] text-red-600 font-medium mt-1">
                          {fieldErrors.max_weight_kg}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vigência, Status e Observações */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Data de Início da Vigência *
                    </Label>
                    <Input
                      type="date"
                      value={formData.start_date || ''}
                      min={!formData.id ? todaySp : undefined}
                      onChange={(e) => {
                        setFormData({ ...formData, start_date: e.target.value })
                        setFieldErrors((prev) => ({ ...prev, start_date: '' }))
                      }}
                      className={`mt-1 ${fieldErrors.start_date ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                      required
                    />
                    {fieldErrors.start_date && (
                      <p className="text-[11px] text-red-600 font-medium mt-1">
                        {fieldErrors.start_date}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Data de Fim da Vigência (Opcional)
                    </Label>
                    <Input
                      type="date"
                      value={formData.end_date || ''}
                      min={formData.start_date || todaySp}
                      onChange={(e) => {
                        setFormData({ ...formData, end_date: e.target.value })
                        setFieldErrors((prev) => ({ ...prev, end_date: '' }))
                      }}
                      className={`mt-1 ${fieldErrors.end_date ? 'border-red-500 ring-1 ring-red-400' : ''}`}
                    />
                    {fieldErrors.end_date && (
                      <p className="text-[11px] text-red-600 font-medium mt-1">
                        {fieldErrors.end_date}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Status *</Label>
                    <select
                      value={formData.status || 'ATIVO'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-medium"
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Observações Técnicas / Restrições
                  </Label>
                  <Input
                    value={formData.technical_notes || ''}
                    onChange={(e) => setFormData({ ...formData, technical_notes: e.target.value })}
                    placeholder="Instruções de corte de cabeceira, alinhamento de guia e tolerâncias de faca"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (saving) return
                    const hasData = Boolean(
                      formData.description?.trim() ||
                      targetWeightInput.trim() ||
                      minWeightInput.trim() ||
                      maxWeightInput.trim(),
                    )
                    if (hasData) {
                      const ok = window.confirm('Deseja cancelar e descartar os dados preenchidos?')
                      if (!ok) return
                    }
                    setIsEditing(false)
                    setFormError(null)
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-900 hover:bg-blue-950 text-white gap-2 shadow-sm font-semibold"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Padrão de Peso'}
                </Button>
              </div>
            </form>
          ) : (
            /* LISTAGEM DE PADRÕES CADASTRADOS */
            <div className="space-y-4 py-3">
              {/* Alerta de Registro Oculto por Filtros */}
              {isHighlightedItemHiddenByFilters && (
                <Alert className="bg-amber-50 border-amber-300 text-amber-900 flex items-center justify-between py-2 px-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <AlertDescription className="text-xs font-medium">
                      O padrão <strong>{highlightedCode}</strong> foi gravado com sucesso, mas está
                      oculto pelos filtros atuais (busca ou tipo).
                    </AlertDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearFilters}
                    className="h-7 text-xs bg-white border-amber-300 hover:bg-amber-100 text-amber-900 font-semibold"
                  >
                    Limpar filtros
                  </Button>
                </Alert>
              )}

              {/* Barra de Filtros da Lista */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Search className="w-4 h-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por código, descrição, centro ou material..."
                    className="w-full md:w-80 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Tipo:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-8 rounded border border-input bg-white px-2 text-xs"
                  >
                    <option value="TODOS">Todos os Tipos</option>
                    <option value="BLOCOS">Somente Blocos</option>
                    <option value="MULTIPLOS">Somente Múltiplos</option>
                  </select>
                  {(searchTerm || filterType !== 'TODOS') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearFilters}
                      className="h-8 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="w-24 text-xs font-bold text-slate-700">
                        Código
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Descrição</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Tipo</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Centros</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">
                        Peso Ideal (t)
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">
                        Faixa Permitida (t)
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Prioridade</TableHead>
                      <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                      <TableHead className="w-28 text-right text-xs font-bold text-slate-700">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                          Carregando padrões de peso...
                        </TableCell>
                      </TableRow>
                    ) : filteredStandards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                          Nenhum padrão de peso cadastrado com os filtros informados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStandards.map((std) => (
                        <TableRow
                          key={std.id || std.code}
                          className={`transition-colors ${
                            highlightedCode === std.code
                              ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600 font-medium'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <TableCell className="font-mono text-xs font-bold text-blue-900">
                            <span data-testid={`std-code-${std.code}`}>{std.code}</span>
                            {highlightedCode === std.code && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Novo
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-xs text-slate-900">
                              {std.description}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {(std.material_codes || []).join(', ') || 'Todas as MPs'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                std.cutting_type === 'BLOCOS'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }
                            >
                              {std.cutting_type === 'BLOCOS' ? 'Blocos' : 'Múltiplos'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {(std.center_codes || []).join(', ') || 'Geral'}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-900">
                            {std.target_weight_kg > 0 && !isNaN(std.target_weight_kg)
                              ? `${(std.target_weight_kg / 1000).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                })} t`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {std.min_weight_kg > 0 &&
                            std.max_weight_kg > 0 &&
                            !isNaN(std.min_weight_kg) &&
                            !isNaN(std.max_weight_kg)
                              ? `${(std.min_weight_kg / 1000).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                })} a ${(std.max_weight_kg / 1000).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                })} t`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                std.priority === 'ALTA'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : std.priority === 'MEDIA'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {std.priority}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                std.status === 'ATIVO'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : std.status === 'PENDENTE_CORRECAO'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {std.status === 'ATIVO'
                                ? 'Ativo'
                                : std.status === 'PENDENTE_CORRECAO'
                                  ? 'Pendente de correção'
                                  : 'Inativo'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(std)}
                                className="h-7 w-7 p-0 text-slate-600 hover:text-blue-900"
                                title="Editar Padrão"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenToggleStatusDialog(std)}
                                className={`h-7 w-7 p-0 ${
                                  std.status === 'ATIVO'
                                    ? 'text-amber-600 hover:text-amber-800'
                                    : 'text-emerald-600 hover:text-emerald-800'
                                }`}
                                title={std.status === 'ATIVO' ? 'Inativar Padrão' : 'Ativar Padrão'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between w-full text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-800" /> Padrões inativos não são
                calculados em novas simulações mas são preservados no histórico.
              </span>
              <Button variant="outline" size="sm" onClick={handleModalClose} disabled={saving}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>

      {/* DIÁLOGO MODAL DE CONFIRMAÇÃO DE ATIVAÇÃO / INATIVAÇÃO */}
      {statusConfirmItem && (
        <Dialog
          open={Boolean(statusConfirmItem)}
          onOpenChange={(open) => !open && setStatusConfirmItem(null)}
        >
          <DialogContent className="max-w-md bg-white border border-slate-200 p-5">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {statusConfirmItem.status === 'ATIVO'
                  ? `Deseja inativar o padrão de peso nº [${statusConfirmItem.code}]?`
                  : `Deseja ativar o padrão de peso nº [${statusConfirmItem.code}]?`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs text-slate-600">
              <p>
                <strong>Descrição:</strong> {statusConfirmItem.description}
              </p>
              <p>
                <strong>Faixa:</strong>{' '}
                {(statusConfirmItem.target_weight_kg / 1000).toLocaleString('pt-BR', {
                  minimumFractionDigits: 3,
                })}{' '}
                t (
                {(statusConfirmItem.min_weight_kg / 1000).toLocaleString('pt-BR', {
                  minimumFractionDigits: 3,
                })}{' '}
                a{' '}
                {(statusConfirmItem.max_weight_kg / 1000).toLocaleString('pt-BR', {
                  minimumFractionDigits: 3,
                })}{' '}
                t)
              </p>

              {statusConfirmItem.status === 'ATIVO' ? (
                <div>
                  <Label className="text-xs font-semibold text-slate-700 block mb-1">
                    Motivo da Inativação (Obrigatório para Auditoria):
                  </Label>
                  <Input
                    value={inactivationReason}
                    onChange={(e) => setInactivationReason(e.target.value)}
                    placeholder="Ex: Padrão descontinuado pela Engenharia de Processo"
                    className="text-xs"
                  />
                </div>
              ) : (
                <p className="text-slate-500">
                  O sistema validará automaticamente os pesos, a integridade do código e a vigência
                  antes de reativar o padrão.
                </p>
              )}

              {statusConfirmError && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 border-red-200 text-red-800 text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <AlertDescription>{statusConfirmError}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusConfirmItem(null)}
                disabled={isTogglingStatus}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmToggleStatus}
                disabled={isTogglingStatus}
                className={
                  statusConfirmItem.status === 'ATIVO'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }
              >
                {isTogglingStatus
                  ? 'Processando...'
                  : statusConfirmItem.status === 'ATIVO'
                    ? 'Confirmar Inativação'
                    : 'Confirmar Ativação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}

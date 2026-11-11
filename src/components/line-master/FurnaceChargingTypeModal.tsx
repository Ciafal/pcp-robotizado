import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Flame, Loader2, Save, X } from 'lucide-react'
import {
  LineFurnaceChargingType,
  FurnaceChargingTypeFormData,
  RawMaterialTypeOption,
  TIPOS_ENFORNAMENTO_OPCOES,
  PROPORCOES_POR_TIPO,
  TIPOS_COM_PROPORCAO,
  extractTipoBase,
  extractProporcaoRotulo,
  buildResumoEnfornamento,
  formatTermoPtBr,
} from '@/types/furnace-charging'
import {
  furnaceChargingService,
  DUPLICATE_CHARGING_TYPE_MSG,
} from '@/services/furnace-charging-service'
import { formatNumberPtBr, parsePtBrNumber } from '@/lib/number-format'

interface FurnaceChargingTypeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  centerCode: string
  lineId?: string
  lineMasterId?: string
  initialData?: LineFurnaceChargingType | null
  onSuccess: (savedChargingType?: string) => void
}

export const FurnaceChargingTypeModal: React.FC<FurnaceChargingTypeModalProps> = ({
  open,
  onOpenChange,
  centerCode,
  lineId,
  lineMasterId,
  initialData,
  onSuccess,
}) => {
  const [chargingType, setChargingType] = useState<string>('')
  const [rawMaterialCode, setRawMaterialCode] = useState<string>('')
  const [rawMaterialDesc, setRawMaterialDesc] = useState<string>('')
  const [active, setActive] = useState<boolean>(true)

  // Valores numéricos em formato pt-BR no input (vírgula decimal)
  const [minWeight, setMinWeight] = useState<string>('')
  const [maxWeight, setMaxWeight] = useState<string>('')
  const [minThickness, setMinThickness] = useState<string>('')
  const [maxThickness, setMaxThickness] = useState<string>('')
  const [minLength, setMinLength] = useState<string>('')
  const [maxLength, setMaxLength] = useState<string>('')
  const [minWidth, setMinWidth] = useState<string>('')
  const [maxWidth, setMaxWidth] = useState<string>('')

  const [rawMaterialOptions, setRawMaterialOptions] = useState<RawMaterialTypeOption[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [initialSnapshot, setInitialSnapshot] = useState<string>('')

  // Carregar opções de matérias-primas (mesma origem PCP/SAP usada pelo PCP)
  useEffect(() => {
    let mounted = true
    furnaceChargingService.getRawMaterialOptions().then((opts) => {
      if (mounted) setRawMaterialOptions(opts)
    })
    return () => {
      mounted = false
    }
  }, [])

  const tipoBaseSelecionado = chargingType ? extractTipoBase(chargingType) : ''
  const exigeProporcao = TIPOS_COM_PROPORCAO.includes(tipoBaseSelecionado as any)
  const proporcaoRotulo = chargingType ? extractProporcaoRotulo(chargingType) : null

  // MP principal/secundária selecionadas no formulário (dados, não sugestões)
  const [mpPrincipalCode, setMpPrincipalCode] = useState<string>('')
  const [mpSecundariaCode, setMpSecundariaCode] = useState<string>('')

  const mpPrincipalDesc = useMemo(
    () => rawMaterialOptions.find((o) => o.code === mpPrincipalCode)?.description || '',
    [rawMaterialOptions, mpPrincipalCode],
  )
  const mpSecundariaDesc = useMemo(
    () => rawMaterialOptions.find((o) => o.code === mpSecundariaCode)?.description || '',
    [rawMaterialOptions, mpSecundariaCode],
  )

  const proporcaoTermos = useMemo(() => {
    if (!exigeProporcao || !proporcaoRotulo) return null
    const m = proporcaoRotulo.match(/^(.+):(.+)$/)
    if (!m) return null
    const primeira = parsePtBrNumber(m[1])
    const segunda = parsePtBrNumber(m[2])
    if (isNaN(primeira) || isNaN(segunda)) return null
    return { primeira, segunda }
  }, [exigeProporcao, proporcaoRotulo])

  // Resumo automático ao vivo
  const resumo = useMemo(
    () =>
      buildResumoEnfornamento({
        tipoBase: tipoBaseSelecionado,
        proporcaoRotulo,
        mpPrincipalDescricao: mpPrincipalDesc || rawMaterialDesc || null,
        mpSecundariaDescricao: mpSecundariaDesc || null,
        proporcaoTermos,
      }),
    [
      tipoBaseSelecionado,
      proporcaoRotulo,
      mpPrincipalDesc,
      mpSecundariaDesc,
      rawMaterialDesc,
      proporcaoTermos,
    ],
  )

  // Inicializar formulário ao abrir (round-trip de edição carrega exatamente o salvo)
  useEffect(() => {
    if (open) {
      if (initialData) {
        setChargingType(initialData.charging_type || '')
        setRawMaterialCode(initialData.raw_material_code || '')
        setRawMaterialDesc(initialData.raw_material_description || '')
        setMpPrincipalCode(initialData.mp_principal_code || '')
        setMpSecundariaCode(initialData.mp_secundaria_code || '')
        setActive(initialData.active !== false)
        setMinWeight(fmt(initialData.min_weight_t, 3))
        setMaxWeight(fmt(initialData.max_weight_t, 3))
        setMinThickness(fmt(initialData.min_thickness_mm, 2))
        setMaxThickness(fmt(initialData.max_thickness_mm, 2))
        setMinLength(fmt(initialData.min_length_mm, 2))
        setMaxLength(fmt(initialData.max_length_mm, 2))
        setMinWidth(fmt(initialData.min_width_mm, 2))
        setMaxWidth(fmt(initialData.max_width_mm, 2))
        setInitialSnapshot(snapshot(initialData))
      } else {
        setChargingType('')
        setRawMaterialCode('')
        setRawMaterialDesc('')
        setMpPrincipalCode('')
        setMpSecundariaCode('')
        setActive(true)
        setMinWeight('')
        setMaxWeight('')
        setMinThickness('')
        setMaxThickness('')
        setMinLength('')
        setMaxLength('')
        setMinWidth('')
        setMaxWidth('')
        setInitialSnapshot(snapshot(null))
      }
      setErrors({})
      setSubmitting(false)
    }
  }, [open, initialData])

  const hasDirtyChanges = useMemo(() => {
    const current = JSON.stringify({
      chargingType,
      rawMaterialCode,
      mpPrincipalCode,
      mpSecundariaCode,
      active,
      minWeight: minWeight.trim(),
      maxWeight: maxWeight.trim(),
      minThickness: minThickness.trim(),
      maxThickness: maxThickness.trim(),
      minLength: minLength.trim(),
      maxLength: maxLength.trim(),
      minWidth: minWidth.trim(),
      maxWidth: maxWidth.trim(),
    })
    return current !== initialSnapshot
  }, [
    chargingType,
    rawMaterialCode,
    mpPrincipalCode,
    mpSecundariaCode,
    active,
    minWeight,
    maxWeight,
    minThickness,
    maxThickness,
    minLength,
    maxLength,
    minWidth,
    maxWidth,
    initialSnapshot,
  ])

  const clearFieldErrors = (...keys: string[]) => {
    setErrors((prev) => {
      const next = { ...prev }
      for (const k of keys) delete next[k]
      return next
    })
  }

  const handleChargingTypeChange = (val: string) => {
    setChargingType(val)
    // Proporção faz parte do rótulo do tipo: ao trocar o tipo, limpar MPs para reavaliar
    setMpPrincipalCode('')
    setMpSecundariaCode('')
    clearFieldErrors('charging_type', 'duplicate', 'mp_principal_code', 'mp_secundaria_code')
  }

  const handleRawMaterialChange = (code: string) => {
    setRawMaterialCode(code)
    const found = rawMaterialOptions.find((o) => o.code === code)
    if (found) setRawMaterialDesc(found.description)
    clearFieldErrors('raw_material_code', 'duplicate')
  }

  const handleMpPrincipalChange = (code: string) => {
    setMpPrincipalCode(code)
    clearFieldErrors('mp_principal_code')
  }

  const handleMpSecundariaChange = (code: string) => {
    setMpSecundariaCode(code)
    clearFieldErrors('mp_secundaria_code')
  }

  const handleCancelClick = () => {
    if (hasDirtyChanges) {
      setDiscardConfirmOpen(true)
    } else {
      onOpenChange(false)
    }
  }

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false)
    onOpenChange(false)
  }

  const parseOrNull = (val: string): number | null => {
    const trimmed = val.trim()
    if (!trimmed) return null
    const num = parsePtBrNumber(trimmed)
    return isNaN(num) ? null : num
  }

  // Formata valor numérico opcional para pt-BR (vazio quando null/undefined)
  const fmt = (val: number | null | undefined, decimals: number) =>
    val === null || val === undefined || isNaN(Number(val))
      ? ''
      : formatNumberPtBr(Number(val), {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })

  // Snapshot do estado inicial para detectar alterações não salvas
  const snapshot = (data: LineFurnaceChargingType | null) =>
    JSON.stringify({
      chargingType: data?.charging_type || '',
      rawMaterialCode: data?.raw_material_code || '',
      mpPrincipalCode: data?.mp_principal_code || '',
      mpSecundariaCode: data?.mp_secundaria_code || '',
      active: data ? data.active !== false : true,
      minWeight: data ? fmt(data.min_weight_t, 3).trim() : '',
      maxWeight: data ? fmt(data.max_weight_t, 3).trim() : '',
      minThickness: data ? fmt(data.min_thickness_mm, 2).trim() : '',
      maxThickness: data ? fmt(data.max_thickness_mm, 2).trim() : '',
      minLength: data ? fmt(data.min_length_mm, 2).trim() : '',
      maxLength: data ? fmt(data.max_length_mm, 2).trim() : '',
      minWidth: data ? fmt(data.min_width_mm, 2).trim() : '',
      maxWidth: data ? fmt(data.max_width_mm, 2).trim() : '',
    })

  // Troca apenas a proporção (mantém tipo base), reagrupando o rótulo completo
  const handleProporcaoChange = (novoRotulo: string) => {
    if (!novoRotulo) return
    setChargingType(`${tipoBaseSelecionado} (${novoRotulo})`)
    setMpPrincipalCode('')
    setMpSecundariaCode('')
    clearFieldErrors('duplicate', 'mp_principal_code', 'mp_secundaria_code')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return // bloqueio de duplo clique

    const formData: FurnaceChargingTypeFormData = {
      id: initialData?.id,
      center_code: centerCode,
      line_id: lineId,
      line_master_id: lineMasterId,
      charging_type: chargingType,
      raw_material_code: rawMaterialCode,
      raw_material_description: rawMaterialDesc,
      mp_principal_code: mpPrincipalCode,
      mp_principal_description: mpPrincipalDesc,
      mp_secundaria_code: mpSecundariaCode,
      mp_secundaria_description: mpSecundariaDesc,
      min_weight_t: parseOrNull(minWeight),
      max_weight_t: parseOrNull(maxWeight),
      min_thickness_mm: parseOrNull(minThickness),
      max_thickness_mm: parseOrNull(maxThickness),
      min_length_mm: parseOrNull(minLength),
      max_length_mm: parseOrNull(maxLength),
      min_width_mm: parseOrNull(minWidth),
      max_width_mm: parseOrNull(maxWidth),
      active,
    }

    const validationErrors = furnaceChargingService.validateChargingTypeFormData(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      await furnaceChargingService.saveChargingType(formData)
      onSuccess(chargingType)
      onOpenChange(false)
    } catch (err: any) {
      // Dados preservados em erro: não limpamos o formulário, só registramos a mensagem
      const msg = err?.message || 'Falha ao salvar tipo de enfornamento.'
      if (
        msg.includes('Já existe uma regra de enfornamento cadastrada') ||
        msg.includes('duplicada')
      ) {
        setErrors({ duplicate: DUPLICATE_CHARGING_TYPE_MSG })
      } else {
        setErrors({ form: msg })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (!v ? handleCancelClick() : onOpenChange(v))}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 bg-white shadow-xl border-slate-200">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-[#004C97]">
                <Flame className="w-5 h-5 text-[#004C97]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {initialData?.id ? 'Editar Tipo de Enfornamento' : 'Novo Tipo de Enfornamento'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Centro Operacional:{' '}
                  <span className="font-semibold text-[#004C97]">{centerCode}</span> • Ficha Mestre
                  Expandida
                </p>
              </div>
            </div>
          </DialogHeader>

          {errors.duplicate && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="font-medium">{errors.duplicate}</div>
            </div>
          )}

          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* ==================== SEÇÃO A: Tipo, Proporção, MPs e Status ==================== */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#004C97]">
                  Seção A — Tipo de Enfornamento, Proporção e Matérias-Primas
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  MP Principal = 1º termo • MP Secundária = 2º termo
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="charging_type"
                    className={`text-xs font-semibold ${errors.charging_type ? 'text-red-600' : 'text-slate-700'}`}
                  >
                    Tipo de Enfornamento <span className="text-red-500">*</span>
                  </Label>
                  <Select value={chargingType} onValueChange={handleChargingTypeChange}>
                    <SelectTrigger
                      id="charging_type"
                      className={`h-10 text-sm ${errors.charging_type ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    >
                      <SelectValue placeholder="Selecione o tipo de enfornamento" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {TIPOS_ENFORNAMENTO_OPCOES.map((tipo) => (
                        <SelectItem key={tipo} value={tipo} className="text-sm">
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.charging_type && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.charging_type}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="proporcao" className="text-xs font-semibold text-slate-700">
                    Proporção
                  </Label>
                  <Select
                    value={proporcaoRotulo || ''}
                    onValueChange={handleProporcaoChange}
                    disabled={!exigeProporcao}
                  >
                    <SelectTrigger
                      id="proporcao"
                      className={`h-10 text-sm ${!exigeProporcao ? 'bg-slate-100 text-slate-400' : 'border-slate-300'}`}
                    >
                      <SelectValue
                        placeholder={
                          exigeProporcao
                            ? proporcaoRotulo || 'Selecione'
                            : 'Sem proporção para este tipo'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {(PROPORCOES_POR_TIPO[tipoBaseSelecionado] || []).map((p, i) => (
                        <SelectItem key={`${p.rotulo}-${i}`} value={p.rotulo} className="text-sm">
                          {p.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    {exigeProporcao
                      ? 'Escolha a proporção desejada — exibida com vírgula decimal (ex.: 1,3:1).'
                      : 'Tipos sem proporção não exigem MP secundária.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="mp_principal"
                    className={`text-xs font-semibold ${errors.mp_principal_code ? 'text-red-600' : 'text-slate-700'}`}
                  >
                    MP Principal (1º termo){exigeProporcao && proporcaoRotulo ? ' *' : ''}
                  </Label>
                  <Select
                    value={mpPrincipalCode}
                    onValueChange={handleMpPrincipalChange}
                    disabled={!exigeProporcao || !proporcaoRotulo}
                  >
                    <SelectTrigger
                      id="mp_principal"
                      className={`h-10 text-sm ${errors.mp_principal_code ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    >
                      <SelectValue placeholder="Selecione a MP Principal" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {rawMaterialOptions.map((opt) => (
                        <SelectItem key={opt.code} value={opt.code} className="text-sm">
                          {opt.fullLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.mp_principal_code && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.mp_principal_code}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="mp_secundaria"
                    className={`text-xs font-semibold ${errors.mp_secundaria_code ? 'text-red-600' : 'text-red-500/0 text-slate-700'}`}
                  >
                    MP Secundária (2º termo){exigeProporcao && proporcaoRotulo ? ' *' : ''}
                  </Label>
                  <Select
                    value={mpSecundariaCode}
                    onValueChange={handleMpSecundariaChange}
                    disabled={!exigeProporcao || !proporcaoRotulo}
                  >
                    <SelectTrigger
                      id="mp_secundaria"
                      className={`text-sm h-10 ${errors.mp_secundaria_code ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    >
                      <SelectValue placeholder="Selecione a MP Secundária" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {rawMaterialOptions
                        .filter((opt) => opt.code !== mpPrincipalCode)
                        .map((opt) => (
                          <SelectItem key={opt.code} value={opt.code} className="text-sm">
                            {opt.fullLabel}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.mp_secundaria_code && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.mp_secundaria_code}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="raw_material_code"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Tipo de Matéria-Prima (base) <span className="text-red-500">*</span>
                  </Label>
                  <Select value={rawMaterialCode} onValueChange={handleRawMaterialChange}>
                    <SelectTrigger
                      id="raw_material_code"
                      className={`h-10 text-sm ${errors.raw_material_code ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    >
                      <SelectValue placeholder="Selecione a matéria-prima (PCP/SAP)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {rawMaterialOptions.map((opt) => (
                        <SelectItem key={opt.code} value={opt.code} className="text-sm">
                          {opt.fullLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.raw_material_code && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.raw_material_code}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
                  <div>
                    <Label htmlFor="status_active" className="text-xs font-semibold text-slate-700">
                      Status
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      {active ? 'Ativo — disponível no PCP' : 'Inativo — não disponível no PCP'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${active ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      {active ? 'Ativo' : 'Inativo'}
                    </span>
                    <Switch
                      id="status_active"
                      checked={active}
                      onCheckedChange={setActive}
                      className="data-[state=checked]:bg-[#004C97]"
                    />
                  </div>
                </div>
              </div>

              {/* Resumo automático ao vivo */}
              {resumo && (
                <div className="rounded-lg bg-blue-50/60 border border-blue-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] mb-1">
                    Resumo automático
                  </p>
                  <p className="text-sm font-semibold text-[#002F6C]">{resumo}</p>
                </div>
              )}
            </div>

            {/* ==================== SEÇÃO B: Limites físicos (INTACTA) ==================== */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Parâmetros de Carga (Unidades Padrão PCP)
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  Peso em toneladas (t) • Dimensões em milímetros (mm)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Peso Mínimo / Máximo (t) */}
                <div className="space-y-1">
                  <Label
                    htmlFor="min_weight"
                    className={`text-xs font-medium ${errors.min_weight_t ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                  >
                    Peso Mínimo (t)
                  </Label>
                  <Input
                    id="min_weight"
                    placeholder="0,000"
                    value={minWeight}
                    onChange={(e) => {
                      setMinWeight(e.target.value)
                      if (errors.min_weight_t || errors.max_weight_t)
                        clearFieldErrors('min_weight_t', 'max_weight_t')
                    }}
                    className={`h-9 text-sm ${errors.min_weight_t ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.min_weight_t && (
                    <p className="text-[11px] text-red-600 leading-tight">{errors.min_weight_t}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="max_weight"
                    className={`text-xs font-medium ${errors.max_weight_t ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                  >
                    Peso Máximo (t)
                  </Label>
                  <Input
                    id="max_weight"
                    placeholder="0,000"
                    value={maxWeight}
                    onChange={(e) => {
                      setMaxWeight(e.target.value)
                      if (errors.min_weight_t || errors.max_weight_t)
                        clearFieldErrors('min_weight_t', 'max_weight_t')
                    }}
                    className={`h-9 text-sm ${errors.max_weight_t ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.max_weight_t && (
                    <p className="text-[11px] text-red-600 leading-tight">{errors.max_weight_t}</p>
                  )}
                </div>

                {/* Espessura Mínima / Máxima (mm) */}
                <div className="space-y-1">
                  <Label
                    htmlFor="min_thickness"
                    className={`text-xs font-medium ${errors.min_thickness_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                  >
                    Espessura Mín. (mm)
                  </Label>
                  <Input
                    id="min_thickness"
                    placeholder="0,00"
                    value={minThickness}
                    onChange={(e) => {
                      setMinThickness(e.target.value)
                      if (errors.min_thickness_mm || errors.max_thickness_mm)
                        clearFieldErrors('min_thickness_mm', 'max_thickness_mm')
                    }}
                    className={`h-9 text-sm ${errors.min_thickness_mm ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.min_thickness_mm && (
                    <p className="text-[11px] text-red-600 leading-tight">
                      {errors.min_thickness_mm}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="max_thickness"
                    className={`text-xs font-medium ${errors.max_thickness_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                  >
                    Espessura Máx. (mm)
                  </Label>
                  <Input
                    id="max_thickness"
                    placeholder="0,00"
                    value={maxThickness}
                    onChange={(e) => {
                      setMaxThickness(e.target.value)
                      if (errors.min_thickness_mm || errors.max_thickness_mm)
                        clearFieldErrors('min_thickness_mm', 'max_thickness_mm')
                    }}
                    className={`h-9 text-sm ${errors.max_thickness_mm ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.max_thickness_mm && (
                    <p className="text-[11px] text-red-600 leading-tight">
                      {errors.max_thickness_mm}
                    </p>
                  )}
                </div>

                {/* Comprimento Mínimo / Máximo (mm) */}
                <div className="space-y-1">
                  <Label
                    htmlFor="min_length"
                    className={`text-xs font-medium ${errors.min_length_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                  >
                    Comprimento Mín. (mm)
                  </Label>
                  <Input
                    id="min_length"
                    placeholder="0,00"
                    value={minLength}
                    onChange={(e) => {
                      setMinLength(e.target.value)
                      if (errors.min_length_mm || errors.max_length_mm)
                        clearFieldErrors('min_length_mm', 'max_length_mm')
                    }}
                    className={`h-9 text-sm ${errors.min_length_mm ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.min_length_mm && (
                    <p className="text-[11px] text-red-600 leading-tight">{errors.min_length_mm}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="max_length"
                    className={`text-xs font-medium ${errors.max_length_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                  >
                    Comprimento Máx. (mm)
                  </Label>
                  <Input
                    id="max_length"
                    placeholder="0,00"
                    value={maxLength}
                    onChange={(e) => {
                      setMaxLength(e.target.value)
                      if (errors.min_length_mm || errors.max_length_mm)
                        clearFieldErrors('min_length_mm', 'max_length_mm')
                    }}
                    className={`h-9 text-sm ${errors.max_length_mm ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.max_length_mm && (
                    <p className="text-[11px] text-red-600 leading-tight">{errors.max_length_mm}</p>
                  )}
                </div>

                {/* Largura Mínima / Máxima (mm) */}
                <div className="space-y-1">
                  <Label
                    htmlFor="min_width"
                    className={`text-xs font-medium ${errors.min_width_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                  >
                    Largura Mín. (mm)
                  </Label>
                  <Input
                    id="min_width"
                    placeholder="0,00"
                    value={minWidth}
                    onChange={(e) => {
                      setMinWidth(e.target.value)
                      if (errors.min_width_mm || errors.max_width_mm)
                        clearFieldErrors('min_width_mm', 'max_width_mm')
                    }}
                    className={`h-9 text-sm ${errors.min_width_mm ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.min_width_mm && (
                    <p className="text-[11px] text-red-600 leading-tight">{errors.min_width_mm}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="max_width"
                    className={`text-xs font-medium ${errors.max_width_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                  >
                    Largura Máx. (mm)
                  </Label>
                  <Input
                    id="max_width"
                    placeholder="0,00"
                    value={maxWidth}
                    onChange={(e) => {
                      setMaxWidth(e.target.value)
                      if (errors.max_width_mm || errors.min_width_mm)
                        clearFieldErrors('min_width_mm', 'max_width_mm')
                    }}
                    className={`h-9 text-sm ${errors.max_width_mm ? 'border-red-500 bg-red-50/30' : 'border-slate-300'}`}
                  />
                  {errors.max_width_mm && (
                    <p className="text-[11px] text-red-600 leading-tight">{errors.max_width_mm}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelClick}
                disabled={submitting}
                className="gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#004C97] hover:bg-[#003A75] text-white gap-2 font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de descarte de alterações */}
      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você possui dados modificados no formulário. Se fechar agora, as alterações não salvas
              serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
export default FurnaceChargingTypeModal

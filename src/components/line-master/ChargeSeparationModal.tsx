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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, ArrowRightLeft, Layers, Loader2, Save, X } from 'lucide-react'
import {
  LineChargeSeparation,
  ChargeSeparationFormData,
  RawMaterialTypeOption,
} from '@/types/furnace-charging'
import {
  furnaceChargingService,
  DUPLICATE_SEPARATION_MSG,
} from '@/services/furnace-charging-service'
import { formatNumberPtBr, parsePtBrNumber } from '@/lib/number-format'

// Categorias/tipos comuns de carga no processo PCP Ciafal para facilitar a seleção,
// mas permitindo opções ricas e alinhadas ao processo industrial
const CARGA_TIPOS_PREDEFINIDOS = [
  '402 a 406',
  '407 a 412',
  '1020',
  '1045',
  'Placa / Bloco',
  'Palanquilha',
  'Tarugo / MP Retrabalhada',
  'MPPA — Palanquilha',
  'MPPL — Placa',
  'MPRE — Tarugo Retrabalhado',
  'MPBL — Bloco',
  'MPTA — Tarugo',
  'Outro (Especificar)',
]

interface ChargeSeparationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  centerCode: string
  lineId?: string
  lineMasterId?: string
  initialData?: LineChargeSeparation | null
  onSuccess: () => void
}

export const ChargeSeparationModal: React.FC<ChargeSeparationModalProps> = ({
  open,
  onOpenChange,
  centerCode,
  lineId,
  lineMasterId,
  initialData,
  onSuccess,
}) => {
  const [chargingLoadType, setChargingLoadType] = useState<string>('')
  const [chargingCustom, setChargingCustom] = useState<string>('')

  const [chargedLoadType, setChargedLoadType] = useState<string>('')
  const [chargedCustom, setChargedCustom] = useState<string>('')

  const [separatorQty, setSeparatorQty] = useState<string>('0')
  const [arrangement, setArrangement] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // 8 campos de peso e dimensões (opcionais, com formatação pt-BR)
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

  useEffect(() => {
    let mounted = true
    furnaceChargingService.getRawMaterialOptions().then((opts) => {
      if (mounted) setRawMaterialOptions(opts)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Lista unificada de opções para seleção de carga
  const loadOptions = useMemo(() => {
    const list: string[] = [...CARGA_TIPOS_PREDEFINIDOS]
    rawMaterialOptions.forEach((r) => {
      if (!list.includes(r.fullLabel)) list.push(r.fullLabel)
    })
    return list
  }, [rawMaterialOptions])

  useEffect(() => {
    if (open) {
      if (initialData) {
        const charging = initialData.charging_load_type || ''
        if (loadOptions.includes(charging)) {
          setChargingLoadType(charging)
          setChargingCustom('')
        } else {
          setChargingLoadType('Outro (Especificar)')
          setChargingCustom(charging)
        }

        const charged = initialData.charged_load_type || ''
        if (loadOptions.includes(charged)) {
          setChargedLoadType(charged)
          setChargedCustom('')
        } else {
          setChargedLoadType('Outro (Especificar)')
          setChargedCustom(charged)
        }

        setSeparatorQty(String(initialData.separator_blocks_qty ?? 0))
        setArrangement(initialData.blocks_arrangement || '')
        setNotes(initialData.notes || '')

        setMinWeight(
          initialData.min_weight_t != null
            ? formatNumberPtBr(initialData.min_weight_t, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3,
              })
            : '',
        )
        setMaxWeight(
          initialData.max_weight_t != null
            ? formatNumberPtBr(initialData.max_weight_t, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3,
              })
            : '',
        )
        setMinThickness(
          initialData.min_thickness_mm != null
            ? formatNumberPtBr(initialData.min_thickness_mm, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            : '',
        )
        setMaxThickness(
          initialData.max_thickness_mm != null
            ? formatNumberPtBr(initialData.max_thickness_mm, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            : '',
        )
        setMinLength(
          initialData.min_length_mm != null
            ? formatNumberPtBr(initialData.min_length_mm, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            : '',
        )
        setMaxLength(
          initialData.max_length_mm != null
            ? formatNumberPtBr(initialData.max_length_mm, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            : '',
        )
        setMinWidth(
          initialData.min_width_mm != null
            ? formatNumberPtBr(initialData.min_width_mm, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            : '',
        )
        setMaxWidth(
          initialData.max_width_mm != null
            ? formatNumberPtBr(initialData.max_width_mm, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })
            : '',
        )

        setInitialSnapshot(
          JSON.stringify({
            charging,
            charged,
            qty: String(initialData.separator_blocks_qty ?? 0),
            arrangement: initialData.blocks_arrangement || '',
            notes: initialData.notes || '',
            minWeight: initialData.min_weight_t ?? '',
            maxWeight: initialData.max_weight_t ?? '',
            minThickness: initialData.min_thickness_mm ?? '',
            maxThickness: initialData.max_thickness_mm ?? '',
            minLength: initialData.min_length_mm ?? '',
            maxLength: initialData.max_length_mm ?? '',
            minWidth: initialData.min_width_mm ?? '',
            maxWidth: initialData.max_width_mm ?? '',
          }),
        )
      } else {
        setChargingLoadType('')
        setChargingCustom('')
        setChargedLoadType('')
        setChargedCustom('')
        setSeparatorQty('0')
        setArrangement('')
        setNotes('')
        setMinWeight('')
        setMaxWeight('')
        setMinThickness('')
        setMaxThickness('')
        setMinLength('')
        setMaxLength('')
        setMinWidth('')
        setMaxWidth('')
        setInitialSnapshot(
          JSON.stringify({
            charging: '',
            charged: '',
            qty: '0',
            arrangement: '',
            notes: '',
            minWeight: '',
            maxWeight: '',
            minThickness: '',
            maxThickness: '',
            minLength: '',
            maxLength: '',
            minWidth: '',
            maxWidth: '',
          }),
        )
      }
      setErrors({})
      setSubmitting(false)
    }
  }, [open, initialData, loadOptions])

  const getEffectiveChargingLoad = () => {
    if (chargingLoadType === 'Outro (Especificar)') {
      return chargingCustom.trim()
    }
    return chargingLoadType.trim()
  }

  const getEffectiveChargedLoad = () => {
    if (chargedLoadType === 'Outro (Especificar)') {
      return chargedCustom.trim()
    }
    return chargedLoadType.trim()
  }

  const hasDirtyChanges = useMemo(() => {
    const current = JSON.stringify({
      charging: getEffectiveChargingLoad(),
      charged: getEffectiveChargedLoad(),
      qty: separatorQty.trim(),
      arrangement: arrangement.trim(),
      notes: notes.trim(),
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
    chargingLoadType,
    chargingCustom,
    chargedLoadType,
    chargedCustom,
    separatorQty,
    arrangement,
    notes,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const effectiveCharging = getEffectiveChargingLoad()
    const effectiveCharged = getEffectiveChargedLoad()
    const parsedQty = Number(separatorQty.trim())

    const parseOrNull = (val: string): number | null => {
      const trimmed = val.trim()
      if (!trimmed) return null
      const num = parsePtBrNumber(trimmed)
      return isNaN(num) ? null : num
    }

    const formData: ChargeSeparationFormData = {
      id: initialData?.id,
      center_code: centerCode,
      line_id: lineId,
      line_master_id: lineMasterId,
      charging_load_type: effectiveCharging,
      charged_load_type: effectiveCharged,
      separator_blocks_qty: parsedQty,
      blocks_arrangement: arrangement.trim(),
      notes: notes.trim(),
      min_weight_t: parseOrNull(minWeight),
      max_weight_t: parseOrNull(maxWeight),
      min_thickness_mm: parseOrNull(minThickness),
      max_thickness_mm: parseOrNull(maxThickness),
      min_length_mm: parseOrNull(minLength),
      max_length_mm: parseOrNull(maxLength),
      min_width_mm: parseOrNull(minWidth),
      max_width_mm: parseOrNull(maxWidth),
    }

    const valErrors = furnaceChargingService.validateChargeSeparationFormData(formData)
    if (Object.keys(valErrors).length > 0) {
      setErrors(valErrors)
      return
    }

    setSubmitting(true)
    try {
      await furnaceChargingService.saveChargeSeparation(formData)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      const msg = err?.message || 'Falha ao salvar regra de separação de carga.'
      if (msg.includes('Já existe uma regra de separação cadastrada')) {
        setErrors({ duplicate: DUPLICATE_SEPARATION_MSG })
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
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-6 bg-white shadow-xl border-slate-200">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-[#002F6C]">
                <Layers className="w-5 h-5 text-[#002F6C]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {initialData?.id
                    ? 'Editar Regra de Separação de Carga'
                    : 'Nova Regra de Separação de Carga'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Centro Operacional:{' '}
                  <span className="font-semibold text-[#002F6C]">{centerCode}</span> • Tabela Linear
                  Independente
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

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Bloco 1: Carga que irá enfornar e Carga enfornada */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1.5">
                <Label
                  htmlFor="charging_load"
                  className={`text-xs font-semibold ${errors.charging_load_type ? 'text-red-600' : 'text-slate-700'}`}
                >
                  Carga que irá enfornar <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={chargingLoadType}
                  onValueChange={(val) => {
                    setChargingLoadType(val)
                    if (errors.charging_load_type || errors.duplicate) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.charging_load_type
                        delete next.duplicate
                        return next
                      })
                    }
                  }}
                >
                  <SelectTrigger
                    id="charging_load"
                    className={`h-10 text-sm ${errors.charging_load_type ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                  >
                    <SelectValue placeholder="Selecione o tipo/categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadOptions.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-sm">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {chargingLoadType === 'Outro (Especificar)' && (
                  <Input
                    placeholder="Especifique a carga que irá enfornar"
                    value={chargingCustom}
                    onChange={(e) => setChargingCustom(e.target.value)}
                    className="mt-2 h-9 text-sm border-slate-300"
                  />
                )}
                {errors.charging_load_type && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.charging_load_type}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="charged_load"
                  className={`text-xs font-semibold ${errors.charged_load_type ? 'text-red-600' : 'text-slate-700'}`}
                >
                  Carga enfornada (anterior) <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={chargedLoadType}
                  onValueChange={(val) => {
                    setChargedLoadType(val)
                    if (errors.charged_load_type || errors.duplicate) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.charged_load_type
                        delete next.duplicate
                        return next
                      })
                    }
                  }}
                >
                  <SelectTrigger
                    id="charged_load"
                    className={`h-10 text-sm ${errors.charged_load_type ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                  >
                    <SelectValue placeholder="Selecione o tipo/categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadOptions.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-sm">
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {chargedLoadType === 'Outro (Especificar)' && (
                  <Input
                    placeholder="Especifique a carga já enfornada"
                    value={chargedCustom}
                    onChange={(e) => setChargedCustom(e.target.value)}
                    className="mt-2 h-9 text-sm border-slate-300"
                  />
                )}
                {errors.charged_load_type && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.charged_load_type}
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 2: Parâmetros de Separação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="separator_qty"
                  className={`text-xs font-semibold ${errors.separator_blocks_qty ? 'text-red-600' : 'text-slate-700'}`}
                >
                  Quantidade de blocos separadores <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="separator_qty"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={separatorQty}
                  onChange={(e) => {
                    setSeparatorQty(e.target.value)
                    if (errors.separator_blocks_qty) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next.separator_blocks_qty
                        return next
                      })
                    }
                  }}
                  className={`h-10 text-sm ${errors.separator_blocks_qty ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                />
                <p className="text-[11px] text-slate-500">
                  Número inteiro maior ou igual a zero (aceita 0 se não exigir blocos).
                </p>
                {errors.separator_blocks_qty && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.separator_blocks_qty}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="blocks_arrangement"
                  className="text-xs font-semibold text-slate-700"
                >
                  Disposição dos blocos (opcional)
                </Label>
                <Input
                  id="blocks_arrangement"
                  placeholder='Ex: "4 em pé + 4 deitados", "2 na ponta"'
                  value={arrangement}
                  onChange={(e) => setArrangement(e.target.value)}
                  className="h-10 text-sm border-slate-300"
                />
                <p className="text-[11px] text-slate-500">
                  Instruções de posicionamento no forno para a operação.
                </p>
              </div>
            </div>

            {/* Bloco 3: Peso e Dimensões da Carga (Opcionais) */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Limites de Peso e Dimensões (Opcional)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Defina limites operacionais de peso e medidas para esta regra de separação.
                    Formato pt-BR (ex: 2,50).
                  </p>
                </div>
              </div>

              {/* Faixa de Peso (t) */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Faixa de Peso da Carga (toneladas)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="min_weight_t"
                      className={`text-[11px] ${errors.min_weight_t ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Peso Mínimo (t)
                    </Label>
                    <Input
                      id="min_weight_t"
                      placeholder="Ex: 1,500"
                      value={minWeight}
                      onChange={(e) => {
                        setMinWeight(e.target.value)
                        if (errors.min_weight_t || errors.max_weight_t) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.min_weight_t
                            delete next.max_weight_t
                            return next
                          })
                        }
                      }}
                      className={`h-9 text-sm ${errors.min_weight_t ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    />
                    {errors.min_weight_t && (
                      <p className="text-[11px] text-red-600 font-medium">{errors.min_weight_t}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="max_weight_t"
                      className={`text-[11px] ${errors.max_weight_t ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Peso Máximo (t)
                    </Label>
                    <Input
                      id="max_weight_t"
                      placeholder="Ex: 5,000"
                      value={maxWeight}
                      onChange={(e) => {
                        setMaxWeight(e.target.value)
                        if (errors.min_weight_t || errors.max_weight_t) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.min_weight_t
                            delete next.max_weight_t
                            return next
                          })
                        }
                      }}
                      className={`h-9 text-sm ${errors.max_weight_t ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    />
                    {errors.max_weight_t && (
                      <p className="text-[11px] text-red-600 font-medium">{errors.max_weight_t}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Faixa de Espessura (mm) */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Espessura da Carga (mm)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="min_thickness_mm"
                      className={`text-[11px] ${errors.min_thickness_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Espessura Mínima (mm)
                    </Label>
                    <Input
                      id="min_thickness_mm"
                      placeholder="Ex: 50,00"
                      value={minThickness}
                      onChange={(e) => {
                        setMinThickness(e.target.value)
                        if (errors.min_thickness_mm || errors.max_thickness_mm) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.min_thickness_mm
                            delete next.max_thickness_mm
                            return next
                          })
                        }
                      }}
                      className={`h-9 text-sm ${errors.min_thickness_mm ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    />
                    {errors.min_thickness_mm && (
                      <p className="text-[11px] text-red-600 font-medium">
                        {errors.min_thickness_mm}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="max_thickness_mm"
                      className={`text-[11px] ${errors.max_thickness_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Espessura Máxima (mm)
                    </Label>
                    <Input
                      id="max_thickness_mm"
                      placeholder="Ex: 150,00"
                      value={maxThickness}
                      onChange={(e) => {
                        setMaxThickness(e.target.value)
                        if (errors.min_thickness_mm || errors.max_thickness_mm) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.min_thickness_mm
                            delete next.max_thickness_mm
                            return next
                          })
                        }
                      }}
                      className={`h-9 text-sm ${errors.max_thickness_mm ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    />
                    {errors.max_thickness_mm && (
                      <p className="text-[11px] text-red-600 font-medium">
                        {errors.max_thickness_mm}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Faixa de Comprimento (mm) */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Comprimento da Carga (mm)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="min_length_mm"
                      className={`text-[11px] ${errors.min_length_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Comprimento Mínimo (mm)
                    </Label>
                    <Input
                      id="min_length_mm"
                      placeholder="Ex: 3000,00"
                      value={minLength}
                      onChange={(e) => {
                        setMinLength(e.target.value)
                        if (errors.min_length_mm || errors.max_length_mm) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.min_length_mm
                            delete next.max_length_mm
                            return next
                          })
                        }
                      }}
                      className={`h-9 text-sm ${errors.min_length_mm ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    />
                    {errors.min_length_mm && (
                      <p className="text-[11px] text-red-600 font-medium">{errors.min_length_mm}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="max_length_mm"
                      className={`text-[11px] ${errors.max_length_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Comprimento Máximo (mm)
                    </Label>
                    <Input
                      id="max_length_mm"
                      placeholder="Ex: 6000,00"
                      value={maxLength}
                      onChange={(e) => {
                        setMaxLength(e.target.value)
                        if (errors.min_length_mm || errors.max_length_mm) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.min_length_mm
                            delete next.max_length_mm
                            return next
                          })
                        }
                      }}
                      className={`h-9 text-sm ${errors.max_length_mm ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    />
                    {errors.max_length_mm && (
                      <p className="text-[11px] text-red-600 font-medium">{errors.max_length_mm}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Faixa de Largura (mm) */}
              <div>
                <Label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Largura da Carga (mm)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label
                      htmlFor="min_width_mm"
                      className={`text-[11px] ${errors.min_width_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Largura Mínima (mm)
                    </Label>
                    <Input
                      id="min_width_mm"
                      placeholder="Ex: 100,00"
                      value={minWidth}
                      onChange={(e) => {
                        setMinWidth(e.target.value)
                        if (errors.min_width_mm || errors.max_width_mm) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.min_width_mm
                            delete next.max_width_mm
                            return next
                          })
                        }
                      }}
                      className={`h-9 text-sm ${errors.min_width_mm ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    />
                    {errors.min_width_mm && (
                      <p className="text-[11px] text-red-600 font-medium">{errors.min_width_mm}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="max_width_mm"
                      className={`text-[11px] ${errors.max_width_mm ? 'text-red-600 font-semibold' : 'text-slate-600'}`}
                    >
                      Largura Máxima (mm)
                    </Label>
                    <Input
                      id="max_width_mm"
                      placeholder="Ex: 400,00"
                      value={maxWidth}
                      onChange={(e) => {
                        setMaxWidth(e.target.value)
                        if (errors.min_width_mm || errors.max_width_mm) {
                          setErrors((prev) => {
                            const next = { ...prev }
                            delete next.min_width_mm
                            delete next.max_width_mm
                            return next
                          })
                        }
                      }}
                      className={`h-9 text-sm ${errors.max_width_mm ? 'border-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    />
                    {errors.max_width_mm && (
                      <p className="text-[11px] text-red-600 font-medium">{errors.max_width_mm}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 4: Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
                Observação (opcional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Observações operacionais adicionais para o operador de forno..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm border-slate-300 resize-none"
              />
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
                className="bg-[#002F6C] hover:bg-[#002555] text-white gap-2 font-medium"
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

      {/* Confirmação de descarte */}
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
export default ChargeSeparationModal

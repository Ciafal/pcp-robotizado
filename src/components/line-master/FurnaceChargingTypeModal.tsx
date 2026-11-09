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
} from '@/types/furnace-charging'
import { furnaceChargingService } from '@/services/furnace-charging-service'
import { formatNumberPtBr, parsePtBrNumber } from '@/lib/number-format'

interface FurnaceChargingTypeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  centerCode: string
  lineId?: string
  lineMasterId?: string
  initialData?: LineFurnaceChargingType | null
  onSuccess: () => void
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

  // Carregar opções de matérias-primas
  useEffect(() => {
    let mounted = true
    furnaceChargingService.getRawMaterialOptions().then((opts) => {
      if (mounted) setRawMaterialOptions(opts)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Inicializar formulário ao abrir
  useEffect(() => {
    if (open) {
      if (initialData) {
        setChargingType(initialData.charging_type || '')
        setRawMaterialCode(initialData.raw_material_code || '')
        setRawMaterialDesc(initialData.raw_material_description || '')
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
            chargingType: initialData.charging_type || '',
            rawMaterialCode: initialData.raw_material_code || '',
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
        setChargingType('')
        setRawMaterialCode('')
        setRawMaterialDesc('')
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
            chargingType: '',
            rawMaterialCode: '',
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
  }, [open, initialData])

  const hasDirtyChanges = useMemo(() => {
    const current = JSON.stringify({
      chargingType,
      rawMaterialCode,
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

  const handleRawMaterialChange = (code: string) => {
    setRawMaterialCode(code)
    const found = rawMaterialOptions.find((o) => o.code === code)
    if (found) {
      setRawMaterialDesc(found.description)
    }
    if (errors.raw_material_code) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.raw_material_code
        return next
      })
    }
  }

  const handleChargingTypeChange = (val: string) => {
    setChargingType(val)
    if (errors.charging_type) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.charging_type
        return next
      })
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const parsedMinWeight = parseOrNull(minWeight)
    const parsedMaxWeight = parseOrNull(maxWeight)
    const parsedMinThickness = parseOrNull(minThickness)
    const parsedMaxThickness = parseOrNull(maxThickness)
    const parsedMinLength = parseOrNull(minLength)
    const parsedMaxLength = parseOrNull(maxLength)
    const parsedMinWidth = parseOrNull(minWidth)
    const parsedMaxWidth = parseOrNull(maxWidth)

    const formData: FurnaceChargingTypeFormData = {
      id: initialData?.id,
      center_code: centerCode,
      line_id: lineId,
      line_master_id: lineMasterId,
      charging_type: chargingType,
      raw_material_code: rawMaterialCode,
      raw_material_description: rawMaterialDesc,
      min_weight_t: parsedMinWeight,
      max_weight_t: parsedMaxWeight,
      min_thickness_mm: parsedMinThickness,
      max_thickness_mm: parsedMaxThickness,
      min_length_mm: parsedMinLength,
      max_length_mm: parsedMaxLength,
      min_width_mm: parsedMinWidth,
      max_width_mm: parsedMaxWidth,
    }

    const validationErrors = furnaceChargingService.validateChargingTypeFormData(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      await furnaceChargingService.saveChargingType(formData)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setErrors({ form: err?.message || 'Falha ao salvar tipo de enfornamento.' })
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
              <div className="p-2 rounded-lg bg-blue-50 text-[#002F6C]">
                <Flame className="w-5 h-5 text-[#002F6C]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {initialData?.id ? 'Editar Tipo de Enfornamento' : 'Novo Tipo de Enfornamento'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Centro Operacional:{' '}
                  <span className="font-semibold text-[#002F6C]">{centerCode}</span> • Ficha Mestre
                  Expandida
                </p>
              </div>
            </div>
          </DialogHeader>

          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Bloco 1: Seleções Obrigatórias */}
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
                  <SelectContent>
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
                <Label
                  htmlFor="raw_material_code"
                  className={`text-xs font-semibold ${errors.raw_material_code ? 'text-red-600' : 'text-slate-700'}`}
                >
                  Tipo de Matéria-Prima <span className="text-red-500">*</span>
                </Label>
                <Select value={rawMaterialCode} onValueChange={handleRawMaterialChange}>
                  <SelectTrigger
                    id="raw_material_code"
                    className={`h-10 text-sm ${errors.raw_material_code ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                  >
                    <SelectValue placeholder="Selecione a matéria-prima (PCP/SAP)" />
                  </SelectTrigger>
                  <SelectContent>
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
            </div>

            {/* Bloco 2: Parâmetros Físicos e Dimensionais */}
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
                      if (errors.min_weight_t || errors.max_weight_t) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.min_weight_t
                          delete next.max_weight_t
                          return next
                        })
                      }
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
                      if (errors.min_weight_t || errors.max_weight_t) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.min_weight_t
                          delete next.max_weight_t
                          return next
                        })
                      }
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
                      if (errors.min_thickness_mm || errors.max_thickness_mm) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.min_thickness_mm
                          delete next.max_thickness_mm
                          return next
                        })
                      }
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
                      if (errors.min_thickness_mm || errors.max_thickness_mm) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.min_thickness_mm
                          delete next.max_thickness_mm
                          return next
                        })
                      }
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
                      if (errors.min_length_mm || errors.max_length_mm) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.min_length_mm
                          delete next.max_length_mm
                          return next
                        })
                      }
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
                      if (errors.min_length_mm || errors.max_length_mm) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.min_length_mm
                          delete next.max_length_mm
                          return next
                        })
                      }
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
                      if (errors.min_width_mm || errors.max_width_mm) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.min_width_mm
                          delete next.max_width_mm
                          return next
                        })
                      }
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
                      if (errors.min_width_mm || errors.max_width_mm) {
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.min_width_mm
                          delete next.max_width_mm
                          return next
                        })
                      }
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

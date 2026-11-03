import React, { useState, useEffect, useRef } from 'react'
import { ShieldAlert, Loader2, AlertCircle, Plus, X } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { MaterialSelector } from '@/components/common/MaterialSelector'
import { BitolaSelector } from '@/components/line-master/BitolaSelector'
import {
  LineRawMaterialRestriction,
  RawMaterialRestrictionSaveDTO,
  areGaugesEqual,
} from '@/services/line-raw-material-restrictions-service'

interface RawMaterialRestrictionModalProps {
  open: boolean
  centerCode: string
  lineId?: string
  lineMasterId?: string
  initialData?: LineRawMaterialRestriction | null
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (data: RawMaterialRestrictionSaveDTO) => Promise<void>
}

/**
 * Converte data ISO (YYYY-MM-DD) ou DD/MM/AAAA para DD/MM/AAAA para exibição
 */
function toDisplayDate(val?: string | null): string {
  if (!val) return ''
  const str = String(val).trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
  }
  return str
}

/**
 * Converte data DD/MM/AAAA para ISO YYYY-MM-DD
 */
function toIsoDate(val: string): string | null {
  const str = val.trim()
  if (!str) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${y}-${m}-${d}`
  }
  return null
}

/**
 * Validador de formato de data DD/MM/AAAA e data válida real
 */
function isValidPtBrDate(val: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return false
  const [dStr, mStr, yStr] = val.split('/')
  const d = parseInt(dStr, 10)
  const m = parseInt(mStr, 10)
  const y = parseInt(yStr, 10)
  if (y < 1900 || y > 2100) return false
  if (m < 1 || m > 12) return false
  const daysInMonth = new Date(y, m, 0).getDate()
  return d >= 1 && d <= daysInMonth
}

export const RawMaterialRestrictionModal: React.FC<RawMaterialRestrictionModalProps> = ({
  open,
  centerCode,
  lineId,
  lineMasterId,
  initialData,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const isEditing = Boolean(initialData?.id)

  // Estados dos campos
  const [materialCode, setMaterialCode] = useState('')
  const [materialDescription, setMaterialDescription] = useState('')
  const [bitolaMp, setBitolaMp] = useState('')
  const [restrictedGauges, setRestrictedGauges] = useState<string[]>([])
  const [currentSelectedGauge, setCurrentSelectedGauge] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [active, setActive] = useState(true)

  // Snapshot inicial para detecção de alterações não salvas
  const initialSnapshotRef = useRef<{
    materialCode: string
    materialDescription: string
    bitolaMp: string
    restrictedGauges: string[]
    validFrom: string
    validUntil: string
    reason: string
    notes: string
    active: boolean
  }>({
    materialCode: '',
    materialDescription: '',
    bitolaMp: '',
    restrictedGauges: [],
    validFrom: '',
    validUntil: '',
    reason: '',
    notes: '',
    active: true,
  })

  // Confirmação para descarte
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Erros por campo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Refs de foco
  const codeInputRef = useRef<HTMLInputElement | null>(null)
  const fromInputRef = useRef<HTMLInputElement | null>(null)
  const untilInputRef = useRef<HTMLInputElement | null>(null)
  const reasonInputRef = useRef<HTMLTextAreaElement | null>(null)

  // Inicializar dados ao abrir
  useEffect(() => {
    if (!open) return

    setFieldErrors({})
    setCurrentSelectedGauge('')

    if (initialData) {
      const initCode = initialData.material_code || ''
      const initDesc = initialData.material_description || ''
      const initBitolaMp = initialData.bitola_mp || ''
      const initGauges = Array.isArray(initialData.restricted_product_gauges)
        ? [...initialData.restricted_product_gauges]
        : []
      const initFrom =
        toDisplayDate(initialData.valid_from) ||
        toDisplayDate(new Date().toISOString().slice(0, 10))
      const initUntil = toDisplayDate(initialData.valid_until)
      const initReason = initialData.reason || ''
      const initNotes = initialData.notes || ''
      const initActive = initialData.active !== false

      setMaterialCode(initCode)
      setMaterialDescription(initDesc)
      setBitolaMp(initBitolaMp)
      setRestrictedGauges(initGauges)
      setValidFrom(initFrom)
      setValidUntil(initUntil)
      setReason(initReason)
      setNotes(initNotes)
      setActive(initActive)

      initialSnapshotRef.current = {
        materialCode: initCode,
        materialDescription: initDesc,
        bitolaMp: initBitolaMp,
        restrictedGauges: initGauges,
        validFrom: initFrom,
        validUntil: initUntil,
        reason: initReason,
        notes: initNotes,
        active: initActive,
      }
    } else {
      const initCode = ''
      const initDesc = ''
      const initBitolaMp = ''
      const initGauges: string[] = []
      const initFrom = toDisplayDate(new Date().toISOString().slice(0, 10))
      const initUntil = ''
      const initReason = ''
      const initNotes = ''
      const initActive = true

      setMaterialCode(initCode)
      setMaterialDescription(initDesc)
      setBitolaMp(initBitolaMp)
      setRestrictedGauges(initGauges)
      setValidFrom(initFrom)
      setValidUntil(initUntil)
      setReason(initReason)
      setNotes(initNotes)
      setActive(initActive)

      initialSnapshotRef.current = {
        materialCode: initCode,
        materialDescription: initDesc,
        bitolaMp: initBitolaMp,
        restrictedGauges: initGauges,
        validFrom: initFrom,
        validUntil: initUntil,
        reason: initReason,
        notes: initNotes,
        active: initActive,
      }
    }
  }, [open, initialData])

  // Detecção de alterações
  const hasDirtyChanges = (): boolean => {
    const snap = initialSnapshotRef.current
    if (materialCode.trim() !== (snap.materialCode || '').trim()) return true
    if (materialDescription.trim() !== (snap.materialDescription || '').trim()) return true
    if (bitolaMp.trim() !== (snap.bitolaMp || '').trim()) return true
    if (validFrom.trim() !== (snap.validFrom || '').trim()) return true
    if (validUntil.trim() !== (snap.validUntil || '').trim()) return true
    if (reason.trim() !== (snap.reason || '').trim()) return true
    if (notes.trim() !== (snap.notes || '').trim()) return true
    if (active !== snap.active) return true

    if (restrictedGauges.length !== snap.restrictedGauges.length) return true
    const sameGauges = restrictedGauges.every((g, idx) => g === snap.restrictedGauges[idx])
    if (!sameGauges) return true

    return false
  }

  const handleCancelRequest = () => {
    if (isSubmitting) return
    if (hasDirtyChanges()) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  // Adicionar bitola restrita via BitolaSelector
  const handleAddGauge = (gaugeValue: string) => {
    if (!gaugeValue || gaugeValue === 'Não há') return

    // Normaliza formato visual garantindo mm se não tiver
    let clean = gaugeValue.trim()
    if (!clean.toLowerCase().includes('mm')) {
      clean = `${clean} mm`
    }

    // Evitar duplicidade na lista de chips
    const alreadyExists = restrictedGauges.some((g) => areGaugesEqual(g, clean))
    if (!alreadyExists) {
      setRestrictedGauges((prev) => [...prev, clean])
      if (fieldErrors.restrictedGauges) {
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.restrictedGauges
          return next
        })
      }
    }
    setCurrentSelectedGauge('')
  }

  // Remover chip de bitola restrita
  const handleRemoveGauge = (gaugeToRemove: string) => {
    setRestrictedGauges((prev) => prev.filter((g) => g !== gaugeToRemove))
  }

  // Formatação de bitola da MP (caso preenchida manualmente ou carregada)
  const handleBitolaMpChange = (val: string) => {
    setBitolaMp(val.replace(/\./g, ','))
  }

  // Validação
  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (!materialCode.trim()) {
      errs.materialCode = 'O Código da Matéria-Prima é obrigatório.'
    }

    if (!materialDescription.trim()) {
      errs.materialDescription = 'A Descrição da Matéria-Prima é obrigatória.'
    }

    if (restrictedGauges.length === 0) {
      errs.restrictedGauges = 'Selecione pelo menos uma bitola de produto restrita.'
    }

    if (!validFrom.trim()) {
      errs.validFrom = 'A data de início é obrigatória.'
    } else if (!isValidPtBrDate(validFrom.trim())) {
      errs.validFrom = 'Informe uma data válida no formato dd/mm/aaaa.'
    }

    if (validUntil.trim()) {
      if (!isValidPtBrDate(validUntil.trim())) {
        errs.validUntil = 'Informe uma data válida no formato dd/mm/aaaa.'
      } else if (validFrom.trim() && isValidPtBrDate(validFrom.trim())) {
        const fromIso = toIsoDate(validFrom.trim())
        const untilIso = toIsoDate(validUntil.trim())
        if (fromIso && untilIso && untilIso < fromIso) {
          errs.validUntil = 'A data fim deve ser igual ou posterior à data de início.'
        }
      }
    }

    if (!reason.trim()) {
      errs.reason = 'O motivo da restrição é obrigatório.'
    } else if (reason.trim().length > 500) {
      errs.reason = 'O motivo não deve exceder 500 caracteres.'
    }

    setFieldErrors(errs)

    if (Object.keys(errs).length > 0) {
      if (errs.materialCode && codeInputRef.current) {
        codeInputRef.current.focus()
      } else if (errs.validFrom && fromInputRef.current) {
        fromInputRef.current.focus()
      } else if (errs.validUntil && untilInputRef.current) {
        untilInputRef.current.focus()
      } else if (errs.reason && reasonInputRef.current) {
        reasonInputRef.current.focus()
      }
      return false
    }

    return true
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    if (!validate()) return

    const isoFrom = toIsoDate(validFrom.trim()) || new Date().toISOString().slice(0, 10)
    const isoUntil = validUntil.trim() ? toIsoDate(validUntil.trim()) || undefined : undefined

    const payload: RawMaterialRestrictionSaveDTO = {
      id: initialData?.id,
      center_code: centerCode,
      line_id: lineId || centerCode,
      line_master_id: lineMasterId,
      material_code: materialCode.trim().toUpperCase(),
      material_description: materialDescription.trim(),
      bitola_mp: bitolaMp.trim(),
      restricted_product_gauges: restrictedGauges,
      valid_from: isoFrom,
      valid_until: isoUntil,
      reason: reason.trim(),
      notes: notes.trim(),
      active: active,
    }

    try {
      await onSubmit(payload)
    } catch (submitErr: any) {
      // Se for erro de duplicidade ou validação, exibir abaixo do campo correspondente sem apagar dados
      const msg = submitErr?.message || 'Erro ao salvar restrição.'
      if (msg.includes('Já existe uma restrição cadastrada')) {
        setFieldErrors((prev) => ({
          ...prev,
          restrictedGauges: msg,
        }))
      } else {
        setFieldErrors((prev) => ({
          ...prev,
          general: msg,
        }))
      }
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => (!v && !isSubmitting ? handleCancelRequest() : null)}
      >
        <DialogContent
          className="bg-white border-slate-200 text-slate-900 w-full max-w-2xl max-h-[92vh] shadow-2xl p-0 overflow-y-auto"
          data-testid="raw-material-restriction-form-modal"
        >
          <DialogHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between sticky top-0 bg-white z-10">
            <DialogTitle className="text-slate-900 text-base font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              {isEditing
                ? 'Editar Restrição de Matéria-Prima'
                : 'Cadastrar Restrição de Matéria-Prima'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
            {fieldErrors.general && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{fieldErrors.general}</span>
              </div>
            )}

            {/* SEÇÃO 1: MP (Código, Descrição e Bitola da MP) */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold flex items-center justify-between">
                  <span>Código MP *</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    Catálogo SAP / Base PCP
                  </span>
                </Label>
                <div className="space-y-1">
                  <MaterialSelector
                    value={materialCode}
                    lineId={lineId || centerCode}
                    onChange={(code, mat) => {
                      setMaterialCode(code)
                      if (mat && mat.name) {
                        setMaterialDescription(mat.name)
                      }
                      if (mat && (mat as any).gauge) {
                        setBitolaMp((mat as any).gauge)
                      }
                      if (fieldErrors.materialCode) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.materialCode
                          return next
                        })
                      }
                    }}
                    placeholder="Pesquisar código MP no catálogo..."
                  />
                  <Input
                    ref={codeInputRef}
                    value={materialCode}
                    onChange={(e) => {
                      setMaterialCode(e.target.value.toUpperCase())
                      if (fieldErrors.materialCode) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.materialCode
                          return next
                        })
                      }
                    }}
                    placeholder="Ou digite o código MP (Ex: BOB_CSN_BQ_1012)"
                    data-testid="input-restriction-material-code"
                    className={`bg-white border-slate-300 text-slate-900 font-mono font-bold uppercase focus-visible:ring-[#004C97] ${
                      fieldErrors.materialCode ? 'border-rose-500 ring-1 ring-rose-500' : ''
                    }`}
                  />
                </div>
                {fieldErrors.materialCode && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.materialCode}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Descrição MP (preenchimento automático)
                  </Label>
                  <Input
                    value={materialDescription}
                    readOnly
                    placeholder="Descrição carregada automaticamente do catálogo"
                    data-testid="input-restriction-material-desc"
                    className="bg-slate-100 border-slate-300 text-slate-800 cursor-not-allowed"
                  />
                  {fieldErrors.materialDescription && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {fieldErrors.materialDescription}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Bitola da MP (ex: 12,70 mm)
                  </Label>
                  <Input
                    value={bitolaMp}
                    onChange={(e) => handleBitolaMpChange(e.target.value)}
                    placeholder="Ex: 12,70 mm"
                    data-testid="input-restriction-bitola-mp"
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Bitolas com restrição de utilização (Multi-seleção) */}
            <div className="space-y-2 bg-rose-50/50 p-3.5 rounded-lg border border-rose-200">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-900 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Bitolas com restrição de utilização *
                </Label>
                <span className="text-[11px] text-slate-500">
                  A MP NÃO poderá ser utilizada para estas bitolas
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <BitolaSelector
                    value={currentSelectedGauge}
                    centerCode={centerCode}
                    onChange={(val) => {
                      setCurrentSelectedGauge(val)
                      if (val && val !== 'Não há') {
                        handleAddGauge(val)
                      }
                    }}
                    hasError={Boolean(fieldErrors.restrictedGauges)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentSelectedGauge) {
                      handleAddGauge(currentSelectedGauge)
                    }
                  }}
                  disabled={!currentSelectedGauge || currentSelectedGauge === 'Não há'}
                  data-testid="btn-add-restricted-gauge"
                  className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Bitola
                </Button>
              </div>

              {/* Chips / Tags removíveis */}
              <div
                className="min-h-[44px] p-2 bg-white rounded-md border border-slate-200 flex flex-wrap gap-1.5 items-center"
                data-testid="restricted-gauges-chips-container"
              >
                {restrictedGauges.length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">
                    Nenhuma bitola selecionada. Escolha uma ou mais bitolas acima para restringir.
                  </span>
                ) : (
                  restrictedGauges.map((gauge) => (
                    <Badge
                      key={gauge}
                      data-testid={`chip-restricted-gauge-${gauge}`}
                      className="bg-rose-100 text-rose-900 border-rose-300 text-xs py-0.5 px-2 font-mono font-bold flex items-center gap-1.5 hover:bg-rose-200 transition-colors"
                    >
                      <span>{gauge}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveGauge(gauge)}
                        data-testid={`btn-remove-gauge-${gauge}`}
                        className="text-rose-700 hover:text-rose-950 p-0.5 rounded-full hover:bg-rose-200"
                        title="Remover bitola"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>

              {fieldErrors.restrictedGauges && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {fieldErrors.restrictedGauges}
                </p>
              )}
            </div>

            {/* SEÇÃO 3: Vigência (Início e Fim) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold">
                  Data de Início * (dd/mm/aaaa)
                </Label>
                <Input
                  ref={fromInputRef}
                  value={validFrom}
                  onChange={(e) => {
                    setValidFrom(e.target.value)
                    if (fieldErrors.validFrom) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.validFrom
                        return next
                      })
                    }
                  }}
                  placeholder="dd/mm/aaaa (Ex: 01/10/2026)"
                  data-testid="input-restriction-valid-from"
                  className={`bg-white border-slate-300 text-slate-900 font-mono text-xs focus-visible:ring-[#004C97] ${
                    fieldErrors.validFrom ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {fieldErrors.validFrom && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.validFrom}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold">
                  Data de Fim (dd/mm/aaaa - opcional)
                </Label>
                <Input
                  ref={untilInputRef}
                  value={validUntil}
                  onChange={(e) => {
                    setValidUntil(e.target.value)
                    if (fieldErrors.validUntil) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.validUntil
                        return next
                      })
                    }
                  }}
                  placeholder="dd/mm/aaaa (Sem data = prazo indeterminado)"
                  data-testid="input-restriction-valid-until"
                  className={`bg-white border-slate-300 text-slate-900 font-mono text-xs focus-visible:ring-[#004C97] ${
                    fieldErrors.validUntil ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {fieldErrors.validUntil && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.validUntil}
                  </p>
                )}
              </div>
            </div>

            {/* SEÇÃO 4: Motivo da Restrição (Obrigatório, até 500 caracteres) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-700 font-semibold">
                  Motivo da Restrição *
                </Label>
                <span
                  className={`text-[11px] ${
                    reason.length > 500 ? 'text-rose-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {reason.length}/500 caracteres
                </span>
              </div>
              <Textarea
                ref={reasonInputRef}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (fieldErrors.reason) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.reason
                      return next
                    })
                  }
                }}
                rows={3}
                placeholder="Ex: Esta MP não deve ser utilizada para bitolas inferiores a 9,53 mm devido à condição dimensional e risco de perda de rendimento."
                data-testid="textarea-restriction-reason"
                className={`bg-white border-slate-300 text-slate-900 text-xs focus-visible:ring-[#004C97] ${
                  fieldErrors.reason ? 'border-rose-500 ring-1 ring-rose-500' : ''
                }`}
              />
              {fieldErrors.reason && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {fieldErrors.reason}
                </p>
              )}
            </div>

            {/* SEÇÃO 5: Observação (Opcional) */}
            <div className="space-y-1">
              <Label className="text-xs text-slate-700 font-semibold">Observação (opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações complementares para a equipe do PCP..."
                data-testid="input-restriction-notes"
                className="bg-white border-slate-300 text-slate-900 text-xs"
              />
            </div>

            {/* SEÇÃO 6: Status Ativo / Inativo */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-md border border-slate-200">
              <input
                type="checkbox"
                id="restrictionActiveCheckbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                data-testid="checkbox-restriction-active"
                className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97] h-4 w-4 cursor-pointer"
              />
              <Label
                htmlFor="restrictionActiveCheckbox"
                className="text-xs text-slate-700 font-semibold cursor-pointer"
              >
                Status:{' '}
                {active ? (
                  <span className="text-emerald-700 font-bold">Ativo</span>
                ) : (
                  <span className="text-slate-500">Inativo</span>
                )}
              </Label>
            </div>

            <DialogFooter className="gap-2 border-t border-slate-200 pt-3 sm:justify-end sticky bottom-0 bg-white">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={handleCancelRequest}
                data-testid="btn-restriction-cancel"
                className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                data-testid="btn-restriction-save"
                className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : isEditing ? (
                  'Salvar Alterações'
                ) : (
                  'Salvar Restrição'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação para descarte de alterações */}
      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-bold text-sm">
              Existem alterações não salvas. Deseja descartá-las?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              As informações preenchidas no formulário de restrição de matéria-prima serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end pt-2">
            <AlertDialogCancel
              onClick={() => setShowDiscardConfirm(false)}
              className="text-xs border-slate-300 hover:bg-slate-100"
            >
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardConfirm(false)
                onClose()
              }}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default RawMaterialRestrictionModal

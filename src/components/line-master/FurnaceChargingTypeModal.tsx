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
  STATUS_ENFORNAMENTO_OPCOES,
  extractTipoBase,
  extractProporcaoRotulo,
  buildResumoEnfornamento,
} from '@/types/furnace-charging'
import {
  furnaceChargingService,
  DUPLICATE_CHARGING_TYPE_MSG,
} from '@/services/furnace-charging-service'

interface FurnaceChargingTypeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  centerCode: string
  lineId?: string
  lineMasterId?: string
  initialData?: LineFurnaceChargingType | null
  onSuccess: (savedChargingType?: string) => void
}

/**
 * Formata a proporção digitada/registrada para exibição compacta na UI.
 * Aceita formatos "70/30", "80/20", "60% / 40%", "1,3:1" e devolve o rótulo canônico:
 * "A/B" quando os dois termos somam 100 (percentual) ou "A:B" caso contrário.
 */
export function formatProporcaoDisplay(raw?: string | null): string {
  const t = (raw || '').trim()
  if (!t) return ''
  const cleaned = t.replace(/%/g, '').replace(/\s+/g, '')
  const m = cleaned.match(/^(.+)[/:](.+)$/)
  if (!m) return t
  const a = m[1].replace(',', '.')
  const b = m[2].replace(',', '.')
  const na = Number(a)
  const nb = Number(b)
  if (isNaN(na) || isNaN(nb)) return t
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','))
  const soma = na + nb
  if (Math.abs(soma - 100) < 0.001) return `${fmt(na)}/${fmt(nb)}`
  return `${fmt(na)}:${fmt(nb)}`
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
  const [mpPrincipalCode, setMpPrincipalCode] = useState<string>('')
  const [mpSecundariaCode, setMpSecundariaCode] = useState<string>('')
  const [proporcao, setProporcao] = useState<string>('')
  const [status, setStatus] = useState<string>('Ativo')

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
  const proporcaoRotuloDoTipo = chargingType ? extractProporcaoRotulo(chargingType) : null

  const mpPrincipalDesc = useMemo(
    () => rawMaterialOptions.find((o) => o.code === mpPrincipalCode)?.description || '',
    [rawMaterialOptions, mpPrincipalCode],
  )
  const mpSecundariaDesc = useMemo(
    () => rawMaterialOptions.find((o) => o.code === mpSecundariaCode)?.description || '',
    [rawMaterialOptions, mpSecundariaCode],
  )

  // Proporção do tipo é o fallback inicial; usuário pode sobrescrever digitando (ex.: "70/30")
  const proporcaoInicial = proporcaoRotuloDoTipo || ''

  const resumo = useMemo(
    () =>
      buildResumoEnfornamento({
        tipoBase: tipoBaseSelecionado,
        proporcaoRotulo: proporcao || proporcaoInicial || null,
        mpPrincipalDescricao: mpPrincipalDesc || rawMaterialDesc || null,
        mpSecundariaDescricao: mpSecundariaDesc || null,
      }),
    [
      tipoBaseSelecionado,
      proporcao,
      proporcaoInicial,
      mpPrincipalDesc,
      mpSecundariaDesc,
      rawMaterialDesc,
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
        setProporcao(initialData.proporcao || '')
        setStatus(initialData.status === 'Inativo' ? 'Inativo' : 'Ativo')
        setInitialSnapshot(
          snapshot({
            charging_type: initialData.charging_type || '',
            raw_material_code: initialData.raw_material_code || '',
            mp_principal_code: initialData.mp_principal_code || '',
            mp_secundaria_code: initialData.mp_secundaria_code || '',
            proporcao: initialData.proporcao || '',
            status: initialData.status === 'Inativo' ? 'Inativo' : 'Ativo',
          }),
        )
      } else {
        setChargingType('')
        setRawMaterialCode('')
        setRawMaterialDesc('')
        setMpPrincipalCode('')
        setMpSecundariaCode('')
        setProporcao('')
        setStatus('Ativo')
        setInitialSnapshot(snapshot(null))
      }
      setErrors({})
      setSubmitting(false)
    }
  }, [open, initialData])

  const hasDirtyChanges = useMemo(() => {
    const current = snapshot({
      charging_type: chargingType,
      raw_material_code: rawMaterialCode,
      mp_principal_code: mpPrincipalCode,
      mp_secundaria_code: mpSecundariaCode,
      proporcao: proporcao,
      status,
    })
    return current !== initialSnapshot
  }, [
    chargingType,
    rawMaterialCode,
    mpPrincipalCode,
    mpSecundariaCode,
    proporcao,
    status,
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
    clearFieldErrors('charging_type', 'duplicate')
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
    if (code) clearFieldErrors('proporcao')
    clearFieldErrors('mp_secundaria_code')
  }

  const handleProporcaoChange = (value: string) => {
    setProporcao(value)
    if (value.trim()) clearFieldErrors('proporcao')
  }

  const handleCancelClick = () => {
    if (hasDirtyChanges) {
      setDiscardConfirmOpen(true)
      return
    }
    onOpenChange(false)
  }

  const handleStatusChange = (val: string) => {
    setStatus(val)
    clearFieldErrors('status')
  }

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false)
    onOpenChange(false)
  }

  // Snapshot do estado inicial para detectar alterações não salvas
  const snapshot = (
    d: {
      charging_type?: string
      raw_material_code?: string
      mp_principal_code?: string
      mp_secundaria_code?: string
      proporcao?: string
      status?: string
    } | null,
  ) =>
    JSON.stringify({
      chargingType: d?.charging_type || '',
      rawMaterialCode: d?.raw_material_code || '',
      mpPrincipalCode: d?.mp_principal_code || '',
      mpSecundariaCode: d?.mp_secundaria_code || '',
      proporcao: d?.proporcao || '',
      status: d ? (d.status === 'Inativo' ? 'Inativo' : 'Ativo') : 'Ativo',
    })

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
      proporcao: proporcao || proporcaoRotuloDoTipo || '',
      status,
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
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#004C97]">
                  Tipo de Enfornamento e Matérias-Primas
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  MP Principal = termo dominante • MP Secundária opcional
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
                  <Label
                    htmlFor="raw_material_code"
                    className={`text-xs font-semibold ${errors.raw_material_code ? 'text-red-600' : 'text-slate-700'}`}
                  >
                    Tipo MP <span className="text-red-500">*</span>
                  </Label>
                  <Select value={rawMaterialCode} onValueChange={handleRawMaterialChange}>
                    <SelectTrigger
                      id="raw_material_code"
                      className={`h-10 text-sm ${errors.raw_material_code ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    >
                      <SelectValue placeholder="Selecione o tipo de matéria-prima (PCP/SAP)" />
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

                <div className="space-y-1.5">
                  <Label
                    htmlFor="raw_material_desc"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Descrição MP
                  </Label>
                  <Input
                    id="raw_material_desc"
                    value={rawMaterialDesc}
                    onChange={(e) => setRawMaterialDesc(e.target.value)}
                    placeholder="Descrição da matéria-prima (opcional — preenchida ao selecionar o Tipo MP)"
                    className={`h-10 text-sm ${errors.raw_material_description ? 'border-red-500' : 'border-slate-300'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="mp_principal"
                    className={`text-xs font-semibold ${errors.mp_principal_code ? 'text-red-600' : 'text-slate-700'}`}
                  >
                    Matéria-prima principal <span className="text-red-500">*</span>
                  </Label>
                  <Select value={mpPrincipalCode} onValueChange={handleMpPrincipalChange}>
                    <SelectTrigger
                      id="mp_principal"
                      className={`h-10 text-sm ${errors.mp_principal_code ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    >
                      <SelectValue placeholder="Selecione a MP principal" />
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
                    className={`text-xs font-semibold ${errors.mp_secundaria_code ? 'text-red-600' : 'text-slate-700'}`}
                  >
                    Matéria-prima secundária
                  </Label>
                  <Select value={mpSecundariaCode} onValueChange={handleMpSecundariaChange}>
                    <SelectTrigger
                      id="mp_secundaria"
                      className={`h-10 text-sm ${errors.mp_secundaria_code ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    >
                      <SelectValue placeholder="Opcional — selecione a MP secundária" />
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
                    htmlFor="proporcao"
                    className={`text-xs font-semibold ${errors.proporcao ? 'text-red-600' : 'text-slate-700'}`}
                  >
                    Proporção{mpSecundariaCode ? ' *' : ''}
                  </Label>
                  <Input
                    id="proporcao"
                    value={proporcao}
                    onChange={(e) => handleProporcaoChange(e.target.value)}
                    placeholder={
                      mpSecundariaCode
                        ? 'Obrigatória — ex.: 70/30, 80/20 ou 60% / 40%'
                        : 'Ex.: 70/30 (opcional)'
                    }
                    className={`h-10 text-sm ${errors.proporcao ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Texto estruturado ou percentual — exemplos aceitos: 70/30, 80/20, 60% / 40%.
                    Obrigatória quando houver MP secundária.
                  </p>
                  {errors.proporcao && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.proporcao}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="status"
                    className={`text-xs font-semibold ${errors.status ? 'text-red-600' : 'text-slate-700'}`}
                  >
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger
                      id="status"
                      className={`h-10 text-sm ${errors.status ? 'border-red-500 ring-1 ring-red-500 bg-red-50/20' : 'border-slate-300'}`}
                    >
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ENFORNAMENTO_OPCOES.map((s) => (
                        <SelectItem key={s} value={s} className="text-sm">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.status && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.status}
                    </p>
                  )}
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

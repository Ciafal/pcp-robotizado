import React, { useState, useEffect, useRef } from 'react'
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
import { Layers, AlertCircle, Loader2 } from 'lucide-react'
import { LineRawMaterialPriority, RawMaterialPriorityCriterion } from '@/types/line-master'
import { MaterialSelector } from '@/components/common/MaterialSelector'
import { sapMatklService } from '@/services/sap-matkl-service'
import { MatklGroupItem } from '@/types/center-derivation'

export interface RawMaterialPriorityFormData {
  id?: string
  line_id: string
  line_master_id?: string
  material_code: string
  material_description: string
  bitola: string
  material_group: string
  priority_order: number
  valid_from: string
  valid_until?: string | null
  criterio_prioridade: RawMaterialPriorityCriterion | string
  descricao_outro_criterio?: string
  active: boolean
  idempotency_key?: string
  reorganize_hierarchy?: boolean
}

interface RawMaterialPriorityModalProps {
  open: boolean
  lineId: string
  lineMasterId?: string
  initialData?: LineRawMaterialPriority | null
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (data: RawMaterialPriorityFormData) => Promise<void>
}

const CRITERIOS_CATALOG: RawMaterialPriorityCriterion[] = [
  'Rotativa',
  'Cíclica',
  'Fixa',
  'Rígida',
  'Flexível',
  'Outro',
]

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

export const RawMaterialPriorityModal: React.FC<RawMaterialPriorityModalProps> = ({
  open,
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
  const [bitola, setBitola] = useState('')
  const [materialGroup, setMaterialGroup] = useState('')
  const [priorityOrder, setPriorityOrder] = useState<number | string>(1)
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [criterio, setCriterio] = useState<RawMaterialPriorityCriterion>('Rotativa')
  const [descricaoOutroCriterio, setDescricaoOutroCriterio] = useState('')
  const [active, setActive] = useState(true)

  // Catálogo de grupos de mercadorias
  const [matklGroups, setMatklGroups] = useState<MatklGroupItem[]>([])

  // Chave de idempotência única por abertura/sessão do formulário
  const idempotencyKeyRef = useRef<string>('')

  // Erros por campo com foco no primeiro
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Refs para focar no primeiro campo com erro
  const codeInputRef = useRef<HTMLInputElement | null>(null)
  const descInputRef = useRef<HTMLInputElement | null>(null)
  const bitolaInputRef = useRef<HTMLInputElement | null>(null)
  const priorityInputRef = useRef<HTMLInputElement | null>(null)
  const fromInputRef = useRef<HTMLInputElement | null>(null)
  const untilInputRef = useRef<HTMLInputElement | null>(null)
  const outroCriterioInputRef = useRef<HTMLInputElement | null>(null)

  // Carregar grupos MATKL do serviço oficial
  useEffect(() => {
    sapMatklService
      .searchMatklGroups('')
      .then((res) => {
        if (res && res.items) {
          setMatklGroups(res.items)
        }
      })
      .catch(() => {})
  }, [])

  // Inicializar formulário ao abrir
  useEffect(() => {
    if (!open) return

    setFieldErrors({})
    idempotencyKeyRef.current = `rmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    if (initialData) {
      setMaterialCode(initialData.material_code || '')
      setMaterialDescription(initialData.material_description || '')
      setBitola(initialData.bitola || '')
      setMaterialGroup(initialData.material_group || '')
      setPriorityOrder(initialData.priority_order ?? 1)
      setValidFrom(
        toDisplayDate(initialData.valid_from) ||
          toDisplayDate(new Date().toISOString().slice(0, 10)),
      )
      setValidUntil(toDisplayDate(initialData.valid_until))
      setCriterio((initialData.criterio_prioridade as RawMaterialPriorityCriterion) || 'Rotativa')
      setDescricaoOutroCriterio(initialData.descricao_outro_criterio || '')
      setActive(initialData.active !== false)
    } else {
      setMaterialCode('')
      setMaterialDescription('')
      setBitola('')
      setMaterialGroup('Bobinas BQ')
      setPriorityOrder(1)
      setValidFrom(toDisplayDate(new Date().toISOString().slice(0, 10)))
      setValidUntil('')
      setCriterio('Rotativa')
      setDescricaoOutroCriterio('')
      setActive(true)
    }
  }, [open, initialData])

  // Formatação de bitola com decimal por vírgula (ex: 12,70 mm)
  const handleBitolaChange = (raw: string) => {
    // Permite digitação livre de números, vírgula e sufixo 'mm'
    // Converte ponto em vírgula para não permitir ponto decimal
    let formatted = raw.replace(/\./g, ',')
    setBitola(formatted)
    if (fieldErrors.bitola) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.bitola
        return next
      })
    }
  }

  // Foco no primeiro erro
  const focusFirstError = (errors: Record<string, string>) => {
    if (errors.materialCode && codeInputRef.current) {
      codeInputRef.current.focus()
    } else if (errors.materialDescription && descInputRef.current) {
      descInputRef.current.focus()
    } else if (errors.priorityOrder && priorityInputRef.current) {
      priorityInputRef.current.focus()
    } else if (errors.validFrom && fromInputRef.current) {
      fromInputRef.current.focus()
    } else if (errors.validUntil && untilInputRef.current) {
      untilInputRef.current.focus()
    } else if (errors.bitola && bitolaInputRef.current) {
      bitolaInputRef.current.focus()
    } else if (errors.descricaoOutroCriterio && outroCriterioInputRef.current) {
      outroCriterioInputRef.current.focus()
    }
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    // Linha 1: Código MP obrigatório
    if (!materialCode.trim()) {
      errs.materialCode = 'O Código da Matéria-Prima é obrigatório.'
    }

    // Linha 1: Descrição MP obrigatória
    if (!materialDescription.trim()) {
      errs.materialDescription = 'A Descrição da Matéria-Prima é obrigatória.'
    }

    // Linha 3: Ordem da Prioridade (inteiro mínimo 1, não aceita 0 nem negativo)
    const prioNum = parseInt(String(priorityOrder), 10)
    if (isNaN(prioNum) || prioNum < 1) {
      errs.priorityOrder = 'Informe uma ordem de prioridade maior ou igual a 1.'
    }

    // Linha 4: Data de Início em dd/mm/aaaa
    if (!validFrom.trim()) {
      errs.validFrom = 'A data de início é obrigatória.'
    } else if (!isValidPtBrDate(validFrom.trim())) {
      errs.validFrom = 'Informe uma data válida no formato dd/mm/aaaa.'
    }

    // Linha 4: Data de Fim (se informada)
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

    // Critério "Outro" exige descrição
    if (criterio === 'Outro' && !descricaoOutroCriterio.trim()) {
      errs.descricaoOutroCriterio = 'Informe a descrição do critério.'
    }

    setFieldErrors(errs)

    if (Object.keys(errs).length > 0) {
      focusFirstError(errs)
      return false
    }

    return true
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    if (!validate()) {
      return
    }

    const isoFrom = toIsoDate(validFrom.trim()) || new Date().toISOString().slice(0, 10)
    const isoUntil = validUntil.trim() ? toIsoDate(validUntil.trim()) : null

    const payload: RawMaterialPriorityFormData = {
      id: initialData?.id,
      line_id: lineId,
      line_master_id: lineMasterId,
      material_code: materialCode.trim().toUpperCase(),
      material_description: materialDescription.trim(),
      bitola: bitola.trim(),
      material_group: materialGroup.trim(),
      priority_order: parseInt(String(priorityOrder), 10),
      valid_from: isoFrom,
      valid_until: isoUntil,
      criterio_prioridade: criterio,
      descricao_outro_criterio: criterio === 'Outro' ? descricaoOutroCriterio.trim() : '',
      active: active,
      idempotency_key: idempotencyKeyRef.current,
    }

    await onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v && !isSubmitting ? onClose() : null)}>
      <DialogContent
        className="bg-white border-slate-200 text-slate-900 max-w-xl shadow-2xl p-0 overflow-hidden"
        data-testid="raw-material-priority-form-modal"
      >
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <DialogTitle className="text-slate-900 text-base font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            {isEditing
              ? 'Editar Prioridade de Matéria-Prima'
              : 'Cadastrar Prioridade de Matéria-Prima'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700">
          {/* LINHA 1: Código MP & Descrição MP */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-700 font-semibold flex items-center justify-between">
                <span>1. Código MP *</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Pesquise no catálogo ou digite
                </span>
              </Label>
              <div className="space-y-1">
                <MaterialSelector
                  value={materialCode}
                  lineId={lineId}
                  onChange={(code, mat) => {
                    setMaterialCode(code)
                    if (mat && mat.name) {
                      setMaterialDescription(mat.name)
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
                  data-testid="input-raw-material-code"
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

            <div className="space-y-1">
              <Label className="text-xs text-slate-700 font-semibold">Descrição MP *</Label>
              <Input
                ref={descInputRef}
                value={materialDescription}
                onChange={(e) => {
                  setMaterialDescription(e.target.value)
                  if (fieldErrors.materialDescription) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.materialDescription
                      return next
                    })
                  }
                }}
                placeholder="Ex: Bobina Laminada a Quente SAE 1012"
                data-testid="input-raw-material-desc"
                className={`bg-white border-slate-300 text-slate-900 focus-visible:ring-[#004C97] ${
                  fieldErrors.materialDescription ? 'border-rose-500 ring-1 ring-rose-500' : ''
                }`}
              />
              {fieldErrors.materialDescription && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {fieldErrors.materialDescription}
                </p>
              )}
            </div>
          </div>

          {/* LINHA 2: Bitola (decimal com vírgula, ex 12,70 mm) & Grupo de Mercadorias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-700 font-semibold">
                Bitola (decimal com vírgula)
              </Label>
              <Input
                ref={bitolaInputRef}
                value={bitola}
                onChange={(e) => handleBitolaChange(e.target.value)}
                placeholder="Ex: 12,70 mm"
                data-testid="input-raw-material-bitola"
                className={`bg-white border-slate-300 text-slate-900 focus-visible:ring-[#004C97] ${
                  fieldErrors.bitola ? 'border-rose-500 ring-1 ring-rose-500' : ''
                }`}
              />
              <span className="text-[10px] text-slate-400">
                Exemplo: 12,70 mm (sem ponto decimal)
              </span>
              {fieldErrors.bitola && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {fieldErrors.bitola}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-700 font-semibold">Grupo de Mercadorias</Label>
              <div className="space-y-1">
                <select
                  value={materialGroup}
                  onChange={(e) => setMaterialGroup(e.target.value)}
                  data-testid="select-raw-material-group"
                  className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:ring-1 focus:ring-[#004C97] outline-none"
                >
                  <option value="">Selecione o grupo de mercadorias...</option>
                  {matklGroups.length > 0 ? (
                    matklGroups.map((g) => (
                      <option key={g.matkl} value={g.description || g.matkl}>
                        {g.matkl} — {g.description}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Bobinas BQ">030 — Bobinas e Tiras BQ</option>
                      <option value="Tarugos de Aço">012 — Tarugos e Palanquilhas</option>
                      <option value="Vergalhões e Fios">010 — Vergalhões e Fios</option>
                      <option value="Tubos Industriais">001 — Tubos Industriais</option>
                    </>
                  )}
                </select>
                <Input
                  value={materialGroup}
                  onChange={(e) => setMaterialGroup(e.target.value)}
                  placeholder="Ou digite o grupo de mercadorias"
                  className="bg-white border-slate-300 text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* LINHA 3: Ordem da Prioridade */}
          <div className="space-y-1">
            <Label className="text-xs text-slate-700 font-semibold flex items-center justify-between">
              <span>Ordem da Prioridade *</span>
              <span className="text-[11px] font-bold text-[#004C97]">1 = prioridade máxima</span>
            </Label>
            <Input
              ref={priorityInputRef}
              type="number"
              min="1"
              step="1"
              value={priorityOrder}
              onChange={(e) => {
                const val = e.target.value
                setPriorityOrder(val)
                if (fieldErrors.priorityOrder) {
                  setFieldErrors((prev) => {
                    const next = { ...prev }
                    delete next.priorityOrder
                    return next
                  })
                }
              }}
              data-testid="input-raw-material-priority"
              className={`bg-white border-slate-300 text-amber-900 font-mono font-bold focus-visible:ring-[#004C97] ${
                fieldErrors.priorityOrder ? 'border-rose-500 ring-1 ring-rose-500' : ''
              }`}
            />
            {fieldErrors.priorityOrder && (
              <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {fieldErrors.priorityOrder}
              </p>
            )}
          </div>

          {/* LINHA 4: Data de Início e Data de Fim em dd/mm/aaaa */}
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
                data-testid="input-raw-material-valid-from"
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
                placeholder="dd/mm/aaaa (Ex: 31/10/2026)"
                data-testid="input-raw-material-valid-until"
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

          {/* CRITÉRIO DA PRIORIDADE & DESCRIÇÃO QUANDO "OUTRO" */}
          <div className="p-3 bg-slate-50 rounded-md border border-slate-200 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Critério da Prioridade</Label>
              <select
                value={criterio}
                onChange={(e) => {
                  const val = e.target.value as RawMaterialPriorityCriterion
                  setCriterio(val)
                  if (fieldErrors.descricaoOutroCriterio) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.descricaoOutroCriterio
                      return next
                    })
                  }
                }}
                data-testid="select-raw-material-criterion"
                className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:ring-1 focus:ring-[#004C97] outline-none"
              >
                {CRITERIOS_CATALOG.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 italic">
                Classificação para uso futuro pelo motor de programação. Sem regras automáticas
                escondidas.
              </p>
            </div>

            {criterio === 'Outro' && (
              <div className="space-y-1 pt-1 border-t border-slate-200">
                <Label className="text-xs font-semibold text-slate-700">
                  Descrição do Critério *
                </Label>
                <Input
                  ref={outroCriterioInputRef}
                  value={descricaoOutroCriterio}
                  onChange={(e) => {
                    setDescricaoOutroCriterio(e.target.value)
                    if (fieldErrors.descricaoOutroCriterio) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.descricaoOutroCriterio
                        return next
                      })
                    }
                  }}
                  placeholder="Especifique o critério customizado adotado..."
                  data-testid="input-raw-material-custom-criterion"
                  className={`bg-white border-slate-300 text-slate-900 focus-visible:ring-[#004C97] ${
                    fieldErrors.descricaoOutroCriterio ? 'border-rose-500 ring-1 ring-rose-500' : ''
                  }`}
                />
                {fieldErrors.descricaoOutroCriterio && (
                  <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {fieldErrors.descricaoOutroCriterio}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* STATUS: ATIVO / INATIVO */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-md border border-slate-200">
            <input
              type="checkbox"
              id="rawActiveCheckbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              data-testid="checkbox-raw-material-active"
              className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97] h-4 w-4 cursor-pointer"
            />
            <Label
              htmlFor="rawActiveCheckbox"
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

          <DialogFooter className="gap-2 border-t border-slate-200 pt-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              data-testid="modal-cancel-btn"
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              data-testid="modal-save-btn"
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
                'Salvar Prioridade'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RawMaterialPriorityModal

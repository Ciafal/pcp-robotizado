/**
 * LineFamilyModal.tsx
 *
 * Modal amplo e responsivo para cadastro/edição de Famílias na Ficha Mestra Expandida
 *
 * Requisitos:
 * - Identificação: Família (obrigatória, sem duplicidade), Cilindro (seleção/pesquisa), Código PM (RFC SAP PM)
 * - Faixa de MP: Diâmetro mínimo e Diâmetro máximo (mm, decimal pt-BR, mín <= máx, > 0)
 * - Bitolas da Família: múltiplas bitolas com Bitola, Comprimento mín e máx (mm, tabela)
 * - Preenchimento em massa: "Aplicar comprimento para todas as bitolas" com confirmação se houver valores
 * - Validação amigável destacando o primeiro campo inválido sem apagar dados
 * - Botão Salvar família / Salvar alterações (loading, bloqueio de clique duplo)
 * - Botão Cancelar com confirmação de descarte se houver alterações não salvas
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Info,
  Wrench,
  SlidersHorizontal,
  ArrowRight,
  Disc,
} from 'lucide-react'
import {
  lineProductFamiliesService,
  LineProductFamily,
  LineFamilyFormData,
  LineFamilyValidationErrors,
  OFFICIAL_LINE_CYLINDERS,
  parseDimension,
  formatMm,
  formatLengthMm,
} from '@/services/line-product-families-service'
import { formatPtBrNumber } from '@/lib/number-format'
import { BitolaSelector } from '@/components/line-master/BitolaSelector'

interface LineFamilyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lineId: string
  centerCode: string
  centerName?: string
  lineMasterId?: string
  familyToEdit?: LineProductFamily | null
}

interface GaugeRowItem {
  id: string
  bitola: string
  min_length_mm: string
  max_length_mm: string
}

export const LineFamilyModal: React.FC<LineFamilyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lineId,
  centerCode,
  centerName,
  lineMasterId,
  familyToEdit,
}) => {
  const { toast } = useToast()

  const isEditing = Boolean(familyToEdit?.id)

  // Campos de Identificação
  const [familyName, setFamilyName] = useState<string>('')
  const [cylinderCode, setCylinderCode] = useState<string>('')
  const [pmEquipmentCode, setPmEquipmentCode] = useState<string>('')
  const [pmEquipmentName, setPmEquipmentName] = useState<string>('')

  // Faixa de MP (mm)
  const [minMpDiameter, setMinMpDiameter] = useState<string>('')
  const [maxMpDiameter, setMaxMpDiameter] = useState<string>('')

  // Bitolas da Família
  const [gauges, setGauges] = useState<GaugeRowItem[]>([])

  // Preenchimento em massa
  const [massMinLength, setMassMinLength] = useState<string>('')
  const [massMaxLength, setMassMaxLength] = useState<string>('')
  const [isConfirmingMassApply, setIsConfirmingMassApply] = useState<boolean>(false)

  // Status e Observações
  const [active, setActive] = useState<boolean>(true)
  const [notes, setNotes] = useState<string>('')

  // Estado de envio e erros
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [errors, setErrors] = useState<LineFamilyValidationErrors>({})
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState<boolean>(false)
  const [hasUserEdited, setHasUserEdited] = useState<boolean>(false)

  // Refs para focar no primeiro campo com erro
  const familyNameRef = useRef<HTMLInputElement>(null)
  const cylinderRef = useRef<HTMLSelectElement>(null)
  const pmEquipmentRef = useRef<HTMLInputElement>(null)
  const minMpRef = useRef<HTMLInputElement>(null)
  const maxMpRef = useRef<HTMLInputElement>(null)

  // Lista de cilindros oficiais disponíveis
  const cylinderOptions = useMemo(() => OFFICIAL_LINE_CYLINDERS, [])

  // Inicializa o formulário ao abrir
  useEffect(() => {
    if (!isOpen) {
      setErrors({})
      setHasUserEdited(false)
      setIsConfirmingMassApply(false)
      return
    }

    if (familyToEdit) {
      setFamilyName(familyToEdit.family_name || '')
      setCylinderCode(familyToEdit.cylinder_code || '')
      setPmEquipmentCode(familyToEdit.pm_equipment_code || '')
      setPmEquipmentName(familyToEdit.pm_equipment_name || '')
      setMinMpDiameter(
        familyToEdit.min_mp_diameter_mm != null
          ? formatPtBrNumber(familyToEdit.min_mp_diameter_mm, 2)
          : '',
      )
      setMaxMpDiameter(
        familyToEdit.max_mp_diameter_mm != null
          ? formatPtBrNumber(familyToEdit.max_mp_diameter_mm, 2)
          : '',
      )
      setActive(familyToEdit.active !== false)
      setNotes(familyToEdit.notes || '')

      const initialGauges = Array.isArray(familyToEdit.gauges_json)
        ? familyToEdit.gauges_json.map((g, idx) => ({
            id: g.id || `g-${Date.now()}-${idx}`,
            bitola: g.bitola || '',
            min_length_mm: g.min_length_mm != null ? formatPtBrNumber(g.min_length_mm, 0) : '',
            max_length_mm: g.max_length_mm != null ? formatPtBrNumber(g.max_length_mm, 0) : '',
          }))
        : []
      setGauges(initialGauges)
    } else {
      // Estado limpo para criação
      setFamilyName('')
      setCylinderCode(cylinderOptions[0]?.code || '')
      setPmEquipmentCode(cylinderOptions[0]?.pmEquipmentCode || '')
      setPmEquipmentName(cylinderOptions[0]?.pmEquipmentName || '')
      setMinMpDiameter('130,00')
      setMaxMpDiameter('140,00')
      setActive(true)
      setNotes('')
      setGauges([
        {
          id: `g-${Date.now()}-1`,
          bitola: '8,00 mm',
          min_length_mm: '6.000',
          max_length_mm: '12.000',
        },
        {
          id: `g-${Date.now()}-2`,
          bitola: '10,00 mm',
          min_length_mm: '6.000',
          max_length_mm: '12.000',
        },
      ])
    }

    setMassMinLength('')
    setMassMaxLength('')
    setErrors({})
    setHasUserEdited(false)
  }, [isOpen, familyToEdit, cylinderOptions])

  // Ao selecionar um cilindro, atualiza automaticamente o código do equipamento PM respectivo
  const handleCylinderChange = (newCylinderCode: string) => {
    setHasUserEdited(true)
    setCylinderCode(newCylinderCode)
    const match = lineProductFamiliesService.findEquipmentByCylinder(newCylinderCode)
    if (match) {
      setPmEquipmentCode(match.pmEquipmentCode)
      setPmEquipmentName(match.pmEquipmentName)
    }
  }

  // Adicionar nova bitola vazia
  const handleAddGauge = () => {
    setHasUserEdited(true)
    setGauges((prev) => [
      ...prev,
      {
        id: `gauge-${Date.now()}-${prev.length}`,
        bitola: '',
        min_length_mm: massMinLength || '6.000',
        max_length_mm: massMaxLength || '12.000',
      },
    ])
  }

  // Remover bitola
  const handleRemoveGauge = (index: number) => {
    setHasUserEdited(true)
    setGauges((prev) => prev.filter((_, i) => i !== index))
  }

  // Atualizar campo de bitola
  const handleUpdateGauge = (
    index: number,
    field: 'bitola' | 'min_length_mm' | 'max_length_mm',
    value: string,
  ) => {
    setHasUserEdited(true)
    setGauges((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // Aplicação em massa de comprimento para todas as bitolas cadastradas
  const handleApplyMassLength = (force = false) => {
    if (!massMinLength.trim() && !massMaxLength.trim()) {
      toast({
        variant: 'destructive',
        title: 'Preenchimento em massa',
        description: 'Informe ao menos o Comprimento mínimo padrão ou o Comprimento máximo padrão.',
      })
      return
    }

    // Verifica se vai sobrescrever valores existentes
    const willOverwrite = gauges.some(
      (g) => (massMinLength && g.min_length_mm) || (massMaxLength && g.max_length_mm),
    )

    if (willOverwrite && !force) {
      setIsConfirmingMassApply(true)
      return
    }

    setHasUserEdited(true)
    setGauges((prev) =>
      prev.map((g) => ({
        ...g,
        min_length_mm: massMinLength.trim() ? massMinLength.trim() : g.min_length_mm,
        max_length_mm: massMaxLength.trim() ? massMaxLength.trim() : g.max_length_mm,
      })),
    )

    setIsConfirmingMassApply(false)
    toast({
      title: 'Comprimentos aplicados em massa',
      description: `Comprimento aplicado com sucesso para ${gauges.length} bitolas. Você pode ajustá-las individualmente abaixo.`,
    })
  }

  // Tratamento de Cancelar com proteção contra descarte acidental
  const handleCancelClick = () => {
    if (hasUserEdited) {
      setIsDiscardConfirmOpen(true)
    } else {
      onClose()
    }
  }

  // Salvar registro
  const handleSave = async () => {
    if (isSaving) return

    const formData: LineFamilyFormData = {
      id: familyToEdit?.id,
      line_id: lineId,
      line_master_id: lineMasterId,
      center_code: centerCode,
      center_name: centerName,
      family_name: familyName,
      cylinder_code: cylinderCode,
      pm_equipment_code: pmEquipmentCode,
      min_mp_diameter_mm: minMpDiameter,
      max_mp_diameter_mm: maxMpDiameter,
      gauges: gauges.map((g) => ({
        id: g.id,
        bitola: g.bitola,
        min_length_mm: g.min_length_mm,
        max_length_mm: g.max_length_mm,
      })),
      active,
      notes,
    }

    // Validação local
    const validationErrors = lineProductFamiliesService.validateFormData(formData)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      // Destaca e foca no primeiro erro
      if (validationErrors.family_name) {
        familyNameRef.current?.focus()
      } else if (validationErrors.cylinder_code) {
        cylinderRef.current?.focus()
      } else if (validationErrors.pm_equipment_code) {
        pmEquipmentRef.current?.focus()
      } else if (validationErrors.min_mp_diameter_mm) {
        minMpRef.current?.focus()
      } else if (validationErrors.max_mp_diameter_mm) {
        maxMpRef.current?.focus()
      }

      const firstErrorMsg =
        validationErrors.family_name ||
        validationErrors.cylinder_code ||
        validationErrors.pm_equipment_code ||
        validationErrors.min_mp_diameter_mm ||
        validationErrors.max_mp_diameter_mm ||
        validationErrors.gauges ||
        'Por favor, corrija os campos destacados no formulário.'

      toast({
        variant: 'destructive',
        title: 'Campo inválido',
        description: firstErrorMsg,
      })
      return
    }

    setIsSaving(true)
    try {
      const saved = await lineProductFamiliesService.save(formData)
      toast({
        title: isEditing ? 'Família atualizada' : 'Família cadastrada',
        description: `Família "${saved.family_name}" salva com sucesso.`,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      console.warn('Erro ao salvar família:', err)
      const userFriendlyMsg =
        err?.message || 'Não foi possível salvar os dados da família. Tente novamente.'

      // Se for erro de duplicidade, destaca o campo da família
      if (userFriendlyMsg.toLowerCase().includes('já está cadastrada')) {
        setErrors((prev) => ({ ...prev, family_name: userFriendlyMsg }))
        familyNameRef.current?.focus()
      }

      toast({
        variant: 'destructive',
        title: 'Erro ao salvar família',
        description: userFriendlyMsg,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleCancelClick() : null)}>
        <DialogContent
          className="max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 bg-white border-slate-200 shadow-2xl text-slate-900 overflow-hidden"
          data-testid="modal-line-family"
        >
          {/* Cabeçalho Fixo do Modal */}
          <DialogHeader className="p-4 px-6 border-b border-slate-200 bg-slate-50/90 shrink-0 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#004C97]" />
                {isEditing ? 'Editar Família de Produtos' : 'Nova Família de Produtos'}
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-[#004C97] border-blue-200 font-bold"
                >
                  {centerCode}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Agrupamento técnico de bitolas, cilindro de conformação e faixa de matéria-prima
                vinculados à Ficha Mestra.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 pr-6">
              <span className="text-xs font-semibold text-slate-600">Status:</span>
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs">
                <Switch
                  id="family-active-switch"
                  checked={active}
                  onCheckedChange={(val) => {
                    setHasUserEdited(true)
                    setActive(val)
                  }}
                  data-testid="switch-family-active"
                />
                <Label
                  htmlFor="family-active-switch"
                  className={`text-xs font-bold cursor-pointer ${
                    active ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {active ? 'Ativa' : 'Inativa'}
                </Label>
              </div>
            </div>
          </DialogHeader>

          {/* Corpo Rolável do Modal */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Bloco 1: Identificação da Família */}
            <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Disc className="w-4 h-4 text-[#004C97]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  1. Identificação Técnica da Família
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Família */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="input-family-name" className="text-xs font-bold text-slate-700">
                    Família <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="input-family-name"
                    ref={familyNameRef}
                    value={familyName}
                    onChange={(e) => {
                      setHasUserEdited(true)
                      setFamilyName(e.target.value)
                      if (errors.family_name) {
                        setErrors((prev) => ({ ...prev, family_name: undefined }))
                      }
                    }}
                    placeholder="Ex: TUBOS QUADRADOS"
                    className={`h-8 text-xs bg-white ${
                      errors.family_name
                        ? 'border-rose-500 ring-1 ring-rose-500 focus-visible:ring-rose-500'
                        : 'border-slate-300'
                    }`}
                    data-testid="input-family-name"
                  />
                  {errors.family_name ? (
                    <span className="text-[11px] text-rose-600 font-semibold block">
                      {errors.family_name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 block">
                      Sem duplicidade da mesma família para este centro.
                    </span>
                  )}
                </div>

                {/* Cilindro */}
                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="select-cylinder" className="text-xs font-bold text-slate-700">
                    Cilindro <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="select-cylinder"
                    ref={cylinderRef}
                    value={cylinderCode}
                    onChange={(e) => handleCylinderChange(e.target.value)}
                    className={`h-8 w-full text-xs bg-white border rounded px-2.5 text-slate-800 outline-none ${
                      errors.cylinder_code
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : 'border-slate-300 focus:border-[#004C97]'
                    }`}
                    data-testid="select-cylinder"
                  >
                    <option value="">Selecione um cilindro...</option>
                    {cylinderOptions.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.cylinder_code && (
                    <span className="text-[11px] text-rose-600 font-semibold block">
                      {errors.cylinder_code}
                    </span>
                  )}
                </div>

                {/* Código do Equipamento PM (SAP PM RFC) */}
                <div className="space-y-1.5 md:col-span-1">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="input-pm-equipment"
                      className="text-xs font-bold text-slate-700"
                    >
                      Código Equipamento PM <span className="text-rose-500">*</span>
                    </Label>
                    <Badge
                      variant="outline"
                      className="text-[9px] py-0 px-1 bg-amber-50 text-amber-800 border-amber-200"
                    >
                      SAP PM RFC
                    </Badge>
                  </div>
                  <Input
                    id="input-pm-equipment"
                    ref={pmEquipmentRef}
                    value={pmEquipmentCode}
                    onChange={(e) => {
                      setHasUserEdited(true)
                      setPmEquipmentCode(e.target.value)
                      if (errors.pm_equipment_code) {
                        setErrors((prev) => ({ ...prev, pm_equipment_code: undefined }))
                      }
                    }}
                    placeholder="Ex: PM-EQ-100293"
                    className={`h-8 text-xs bg-white font-mono ${
                      errors.pm_equipment_code
                        ? 'border-rose-500 ring-1 ring-rose-500'
                        : 'border-slate-300'
                    }`}
                    data-testid="input-pm-equipment"
                  />
                  {pmEquipmentName && (
                    <span className="text-[10px] text-slate-600 font-medium block truncate">
                      {pmEquipmentName}
                    </span>
                  )}
                  {errors.pm_equipment_code && (
                    <span className="text-[11px] text-rose-600 font-semibold block">
                      {errors.pm_equipment_code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 2: Faixa de Matéria-Prima (MP) */}
            <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#004C97]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Faixa Admissível de Matéria-Prima (MP)
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Unidade SI: mm</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Diâmetro Mínimo */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="input-min-mp-diameter"
                    className="text-xs font-bold text-slate-700"
                  >
                    Diâmetro mínimo da MP (mm) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="input-min-mp-diameter"
                      ref={minMpRef}
                      value={minMpDiameter}
                      onChange={(e) => {
                        setHasUserEdited(true)
                        setMinMpDiameter(e.target.value)
                        if (errors.min_mp_diameter_mm) {
                          setErrors((prev) => ({ ...prev, min_mp_diameter_mm: undefined }))
                        }
                      }}
                      placeholder="130,00"
                      className={`h-8 text-xs bg-white font-mono pr-10 ${
                        errors.min_mp_diameter_mm
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300'
                      }`}
                      data-testid="input-min-mp-diameter"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">
                      mm
                    </span>
                  </div>
                  {errors.min_mp_diameter_mm ? (
                    <span className="text-[11px] text-rose-600 font-semibold block">
                      {errors.min_mp_diameter_mm}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 block">
                      Padrão brasileiro (ex: 130,00 mm). Não permitir negativo ou zero.
                    </span>
                  )}
                </div>

                {/* Diâmetro Máximo */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="input-max-mp-diameter"
                    className="text-xs font-bold text-slate-700"
                  >
                    Diâmetro máximo da MP (mm) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="input-max-mp-diameter"
                      ref={maxMpRef}
                      value={maxMpDiameter}
                      onChange={(e) => {
                        setHasUserEdited(true)
                        setMaxMpDiameter(e.target.value)
                        if (errors.max_mp_diameter_mm) {
                          setErrors((prev) => ({ ...prev, max_mp_diameter_mm: undefined }))
                        }
                      }}
                      placeholder="140,00"
                      className={`h-8 text-xs bg-white font-mono pr-10 ${
                        errors.max_mp_diameter_mm
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300'
                      }`}
                      data-testid="input-max-mp-diameter"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">
                      mm
                    </span>
                  </div>
                  {errors.max_mp_diameter_mm ? (
                    <span className="text-[11px] text-rose-600 font-semibold block">
                      {errors.max_mp_diameter_mm}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 block">
                      Validação obrigatória: diâmetro mínimo ≤ máximo.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 3: Bitolas da Família & Preenchimento em Massa */}
            <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    3. Bitolas da Família ({gauges.length})
                  </h4>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddGauge}
                  data-testid="btn-add-gauge-row"
                  className="h-7 text-xs font-bold border-slate-300 text-[#004C97] hover:bg-blue-50 gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar bitola
                </Button>
              </div>

              {/* Sub-bloco: Preenchimento em Massa de Comprimentos */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-md space-y-2">
                <div className="flex items-center gap-1.5 text-[#004C97]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-bold text-[11px]">
                    Aplicar comprimento para todas as bitolas
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Comprimento mínimo padrão (mm)
                    </Label>
                    <Input
                      value={massMinLength}
                      onChange={(e) => setMassMinLength(e.target.value)}
                      placeholder="6.000"
                      className="h-7 text-xs bg-white font-mono"
                      data-testid="input-mass-min-length"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-600 block mb-1">
                      Comprimento máximo padrão (mm)
                    </Label>
                    <Input
                      value={massMaxLength}
                      onChange={(e) => setMassMaxLength(e.target.value)}
                      placeholder="12.000"
                      className="h-7 text-xs bg-white font-mono"
                      data-testid="input-mass-max-length"
                    />
                  </div>
                  <div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApplyMassLength(false)}
                      data-testid="btn-apply-mass-length"
                      className="w-full h-7 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white"
                    >
                      Aplicar a todas
                    </Button>
                  </div>
                </div>

                {/* Confirmação de sobrescrita se houver valores preenchidos */}
                {isConfirmingMassApply && (
                  <div
                    className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2"
                    data-testid="confirm-mass-overwrite"
                  >
                    <span className="text-[11px] font-semibold">
                      Algumas bitolas já possuem comprimentos definidos. Deseja sobrescrever os
                      valores?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsConfirmingMassApply(false)}
                        className="h-6 text-[11px] px-2 text-slate-600 hover:text-slate-900"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleApplyMassLength(true)}
                        data-testid="btn-confirm-mass-overwrite"
                        className="h-6 text-[11px] px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                      >
                        Sim, sobrescrever
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabela de Bitolas */}
              {errors.gauges && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.gauges}
                </div>
              )}

              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 min-w-[200px]">
                        Bitola <span className="text-rose-500">*</span>
                      </th>
                      <th className="p-2.5 min-w-[150px]">
                        Comprimento mín (mm) <span className="text-rose-500">*</span>
                      </th>
                      <th className="p-2.5 min-w-[150px]">
                        Comprimento máx (mm) <span className="text-rose-500">*</span>
                      </th>
                      <th className="p-2.5 w-20 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {gauges.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                          Nenhuma bitola cadastrada. Clique em &quot;+ Adicionar bitola&quot; acima.
                        </td>
                      </tr>
                    ) : (
                      gauges.map((g, index) => {
                        const rowError = errors.gauge_errors?.[index]
                        return (
                          <tr
                            key={g.id || index}
                            className="hover:bg-slate-50/70 transition-colors"
                            data-testid={`gauge-row-${index}`}
                          >
                            <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">
                              {index + 1}
                            </td>

                            {/* Campo Bitola */}
                            <td className="p-2.5">
                              <Input
                                value={g.bitola}
                                onChange={(e) => handleUpdateGauge(index, 'bitola', e.target.value)}
                                placeholder="Ex: 8,00 mm ou Ø 10"
                                className={`h-8 text-xs bg-white font-medium ${
                                  rowError?.bitola
                                    ? 'border-rose-500 ring-1 ring-rose-500'
                                    : 'border-slate-300'
                                }`}
                                data-testid={`input-gauge-bitola-${index}`}
                              />
                              {rowError?.bitola && (
                                <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                                  {rowError.bitola}
                                </span>
                              )}
                            </td>

                            {/* Comprimento Mínimo */}
                            <td className="p-2.5">
                              <div className="relative">
                                <Input
                                  value={g.min_length_mm}
                                  onChange={(e) =>
                                    handleUpdateGauge(index, 'min_length_mm', e.target.value)
                                  }
                                  placeholder="6.000"
                                  className={`h-8 text-xs bg-white font-mono pr-8 ${
                                    rowError?.min_length_mm
                                      ? 'border-rose-500 ring-1 ring-rose-500'
                                      : 'border-slate-300'
                                  }`}
                                  data-testid={`input-gauge-min-${index}`}
                                />
                                <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">
                                  mm
                                </span>
                              </div>
                              {rowError?.min_length_mm && (
                                <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                                  {rowError.min_length_mm}
                                </span>
                              )}
                            </td>

                            {/* Comprimento Máximo */}
                            <td className="p-2.5">
                              <div className="relative">
                                <Input
                                  value={g.max_length_mm}
                                  onChange={(e) =>
                                    handleUpdateGauge(index, 'max_length_mm', e.target.value)
                                  }
                                  placeholder="12.000"
                                  className={`h-8 text-xs bg-white font-mono pr-8 ${
                                    rowError?.max_length_mm
                                      ? 'border-rose-500 ring-1 ring-rose-500'
                                      : 'border-slate-300'
                                  }`}
                                  data-testid={`input-gauge-max-${index}`}
                                />
                                <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">
                                  mm
                                </span>
                              </div>
                              {rowError?.max_length_mm && (
                                <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                                  {rowError.max_length_mm}
                                </span>
                              )}
                            </td>

                            {/* Ações */}
                            <td className="p-2.5 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveGauge(index)}
                                title="Excluir bitola"
                                data-testid={`btn-remove-gauge-${index}`}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observações Opcionais */}
            <div className="space-y-1.5">
              <Label htmlFor="input-family-notes" className="text-xs font-semibold text-slate-700">
                Observações Técnicas / Restrições (Opcional)
              </Label>
              <Input
                id="input-family-notes"
                value={notes}
                onChange={(e) => {
                  setHasUserEdited(true)
                  setNotes(e.target.value)
                }}
                placeholder="Ex: Utilizar preferencialmente trem laminador L1 com guias reforçadas."
                className="h-8 text-xs bg-white border-slate-300"
                data-testid="input-family-notes"
              />
            </div>
          </div>

          {/* Rodapé Fixo de Ações */}
          <DialogFooter className="p-3 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500">
              {isEditing
                ? 'Atualização sem duplicar o registro.'
                : 'Novo registro vinculado ao Centro / Ficha Mestra.'}
            </span>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelClick}
                disabled={isSaving}
                className="h-8 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
                data-testid="btn-cancel-family"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white shadow-xs min-w-[130px]"
                data-testid="btn-save-family"
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Salvando...
                  </span>
                ) : isEditing ? (
                  'Salvar alterações'
                ) : (
                  'Salvar família'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Descarte de Alterações */}
      <Dialog open={isDiscardConfirmOpen} onOpenChange={setIsDiscardConfirmOpen}>
        <DialogContent className="max-w-md p-5 bg-white text-slate-900 border-slate-200 shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Descartar alterações?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Você possui dados preenchidos que não foram salvos. Ao sair agora, todas as alterações
              serão perdidas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDiscardConfirmOpen(false)}
              className="h-8 text-xs font-semibold border-slate-300"
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsDiscardConfirmOpen(false)
                onClose()
              }}
              data-testid="btn-confirm-discard"
              className="h-8 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              Descartar e fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default LineFamilyModal

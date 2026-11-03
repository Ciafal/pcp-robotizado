/**
 * LineFamilyModal.tsx
 *
 * Modal no padrão visual do HUB Ciafal para cadastro e edição de Famílias Técnicas de Produtos (Ficha Mestra)
 *
 * Reestruturações atendidas:
 * 1. REMOÇÃO COMPLETA dos campos "Cilindro" e "Quantidade de bitolas" digitada manualmente.
 * 2. MANTER CAMPOS EXISTENTES NECESSÁRIOS: Família; Código do Equipamento PM; Diâmetro mín. MP; Diâmetro máx. MP; Status Ativo/Inativo.
 * 3. NOVOS CAMPOS: Comprimento mín. MP (m) e Comprimento máx. MP (m) no padrão brasileiro (ex: 6,00 m).
 * 4. REGRAS DE VALIDAÇÃO: comprimento_min_mp >= 0, comprimento_max_mp >= 0, comprimento_min_mp <= comprimento_max_mp.
 *    Se mínimo > máximo, bloquear com: "O comprimento mínimo da matéria-prima não pode ser maior que o comprimento máximo." sem apagar dados.
 * 5. SEÇÃO "Bitolas da Família" com botão "+ Adicionar bitola".
 * 6. FLUXO PARA ADICIONAR BITOLA: Modal no padrão HUB integrado à fonte oficial SAP.
 * 7. NÃO PERMITIR DUPLICIDADE: "Esta bitola já pertence a esta família."
 * 8. STATUS DAS BITOLAS: Ativa/Inativa, com exclusão lógica.
 * 12. AGRUPAMENTO: Identificação | Parâmetros da matéria-prima | Bitolas da Família.
 * 14. SALVAR: Validação completa, sem clique duplo, confirmação "Família salva com sucesso."
 * 15. CANCELAR: Perguntar "Descartar alterações?" se houver alterações não salvas.
 * 16. AUDITORIA: Registrada no padrão oficial do HUB em pcp_audit_logs.
 */

import React, { useState, useEffect, useRef } from 'react'
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
  SlidersHorizontal,
  Edit2,
  Power,
  Wrench,
  Disc,
} from 'lucide-react'
import {
  lineProductFamiliesService,
  LineProductFamily,
  LineFamilyFormData,
  LineFamilyValidationErrors,
  LineFamilyGauge,
} from '@/services/line-product-families-service'
import { formatPtBrNumber } from '@/lib/number-format'
import { LineFamilyAddGaugeModal } from '@/components/line-master/LineFamilyAddGaugeModal'

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

  // Bloco 1: Identificação
  const [familyName, setFamilyName] = useState<string>('')
  const [pmEquipmentCode, setPmEquipmentCode] = useState<string>('')
  const [active, setActive] = useState<boolean>(true)
  const [notes, setNotes] = useState<string>('')

  // Bloco 2: Parâmetros da matéria-prima
  // Diâmetros MP (mm)
  const [minMpDiameter, setMinMpDiameter] = useState<string>('')
  const [maxMpDiameter, setMaxMpDiameter] = useState<string>('')

  // Comprimentos MP (m) - Novos campos
  const [comprimentoMinMp, setComprimentoMinMp] = useState<string>('')
  const [comprimentoMaxMp, setComprimentoMaxMp] = useState<string>('')

  // Bloco 3: Bitolas da Família
  const [gauges, setGauges] = useState<LineFamilyGauge[]>([])

  // Modal para adicionar/editar bitola
  const [isGaugeModalOpen, setIsGaugeModalOpen] = useState<boolean>(false)
  const [gaugeToEditIndex, setGaugeToEditIndex] = useState<number | null>(null)

  // Estados de controle e envio
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [errors, setErrors] = useState<LineFamilyValidationErrors>({})
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState<boolean>(false)
  const [hasUserEdited, setHasUserEdited] = useState<boolean>(false)

  // Refs para focar no primeiro campo inválido
  const familyNameRef = useRef<HTMLInputElement>(null)
  const pmEquipmentRef = useRef<HTMLInputElement>(null)
  const minMpDiamRef = useRef<HTMLInputElement>(null)
  const maxMpDiamRef = useRef<HTMLInputElement>(null)
  const compMinMpRef = useRef<HTMLInputElement>(null)
  const compMaxMpRef = useRef<HTMLInputElement>(null)

  // Inicializa o formulário ao abrir
  useEffect(() => {
    if (!isOpen) {
      setErrors({})
      setHasUserEdited(false)
      setIsGaugeModalOpen(false)
      setGaugeToEditIndex(null)
      return
    }

    if (familyToEdit) {
      setFamilyName(familyToEdit.family_name || '')
      setPmEquipmentCode(familyToEdit.pm_equipment_code || '')
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
      setComprimentoMinMp(
        familyToEdit.comprimento_min_mp != null
          ? formatPtBrNumber(familyToEdit.comprimento_min_mp, 2)
          : '',
      )
      setComprimentoMaxMp(
        familyToEdit.comprimento_max_mp != null
          ? formatPtBrNumber(familyToEdit.comprimento_max_mp, 2)
          : '',
      )
      setActive(familyToEdit.active !== false)
      setNotes(familyToEdit.notes || '')

      const initialGauges = Array.isArray(familyToEdit.gauges_json)
        ? familyToEdit.gauges_json.map((g, idx) => ({
            id: g.id || `g-${Date.now()}-${idx}`,
            bitola: g.bitola || '',
            description: g.description || '',
            active: g.active !== false,
            deleted: Boolean(g.deleted),
          }))
        : []
      setGauges(initialGauges)
    } else {
      // Estado limpo para criação
      setFamilyName('')
      setPmEquipmentCode('')
      setMinMpDiameter('130,00')
      setMaxMpDiameter('140,00')
      setComprimentoMinMp('6,00')
      setComprimentoMaxMp('12,00')
      setActive(true)
      setNotes('')
      setGauges([])
    }

    setErrors({})
    setHasUserEdited(false)
  }, [isOpen, familyToEdit])

  // Abrir modal de adição de bitola
  const handleOpenAddGauge = () => {
    setGaugeToEditIndex(null)
    setIsGaugeModalOpen(true)
  }

  // Abrir modal de edição de bitola
  const handleOpenEditGauge = (index: number) => {
    setGaugeToEditIndex(index)
    setIsGaugeModalOpen(true)
  }

  // Confirmar adição ou edição de bitola no formulário
  const handleConfirmGaugeModal = (gaugeData: LineFamilyGauge) => {
    setHasUserEdited(true)
    if (gaugeToEditIndex !== null && gaugeToEditIndex >= 0) {
      setGauges((prev) => {
        const next = [...prev]
        next[gaugeToEditIndex] = {
          ...next[gaugeToEditIndex],
          bitola: gaugeData.bitola,
          description: gaugeData.description,
          active: gaugeData.active,
        }
        return next
      })
    } else {
      setGauges((prev) => [
        ...prev,
        {
          id: `gauge-${Date.now()}-${prev.length}`,
          bitola: gaugeData.bitola,
          description: gaugeData.description,
          active: gaugeData.active !== false,
          deleted: false,
        },
      ])
    }

    if (errors.gauges) {
      setErrors((prev) => ({ ...prev, gauges: undefined }))
    }
  }

  // Alternar status da bitola (Ativa / Inativa)
  const handleToggleGaugeStatus = (index: number) => {
    setHasUserEdited(true)
    setGauges((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], active: !next[index].active }
      return next
    })
  }

  // Remover bitola (exclusão lógica no cliente/servidor)
  const handleRemoveGauge = (index: number) => {
    setHasUserEdited(true)
    setGauges((prev) => {
      const next = [...prev]
      // Se for registro já existente com ID do banco, marca como excluído logicamente
      if (next[index].id && !next[index].id?.startsWith('gauge-')) {
        next[index] = { ...next[index], deleted: true, active: false }
        return next
      }
      // Se for novo (não salvo ainda), remove do array
      return next.filter((_, i) => i !== index)
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
      pm_equipment_code: pmEquipmentCode,
      min_mp_diameter_mm: minMpDiameter,
      max_mp_diameter_mm: maxMpDiameter,
      comprimento_min_mp: comprimentoMinMp,
      comprimento_max_mp: comprimentoMaxMp,
      gauges: gauges.map((g) => ({
        id: g.id,
        bitola: g.bitola,
        description: g.description,
        active: g.active !== false,
        deleted: Boolean(g.deleted),
      })),
      active,
      notes,
    }

    // Validação local
    const validationErrors = lineProductFamiliesService.validateFormData(formData)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      // Focar no primeiro campo inválido
      if (validationErrors.family_name) {
        familyNameRef.current?.focus()
      } else if (validationErrors.min_mp_diameter_mm) {
        minMpDiamRef.current?.focus()
      } else if (validationErrors.max_mp_diameter_mm) {
        maxMpDiamRef.current?.focus()
      } else if (validationErrors.comprimento_min_mp) {
        compMinMpRef.current?.focus()
      } else if (validationErrors.comprimento_max_mp) {
        compMaxMpRef.current?.focus()
      }

      const firstErrorMsg =
        validationErrors.comprimento_min_mp ||
        validationErrors.comprimento_max_mp ||
        validationErrors.family_name ||
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
        title: 'Família salva com sucesso.',
        description: `Família "${saved.family_name}" registrada com sucesso.`,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      console.warn('Erro ao salvar família:', err)
      const userFriendlyMsg =
        err?.message || 'Não foi possível salvar os dados da família. Tente novamente.'

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

  // Lista de bitolas visíveis (não excluídas logicamente)
  const visibleGauges = gauges.filter((g) => !g.deleted)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleCancelClick() : null)}>
        <DialogContent
          className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 bg-white border-slate-200 shadow-2xl text-slate-900 overflow-hidden"
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
                Cadastro técnico de parâmetros de matéria-prima e bitolas associadas à Ficha Mestra.
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
            {/* Bloco 1: Identificação */}
            <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Disc className="w-4 h-4 text-[#004C97]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Identificação
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Família */}
                <div className="space-y-1.5">
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

                {/* Código do Equipamento PM */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="input-pm-equipment"
                      className="text-xs font-bold text-slate-700"
                    >
                      Código Equipamento PM
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
                    }}
                    placeholder="Ex: PM-EQ-100293"
                    className="h-8 text-xs bg-white font-mono border-slate-300"
                    data-testid="input-pm-equipment"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Identificador SAP PM do equipamento associado.
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Parâmetros da matéria-prima */}
            <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#004C97]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Parâmetros da matéria-prima
                  </h4>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Unidades: mm e m</span>
              </div>

              {/* Linha 1: Diâmetros (mm) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Diâmetro Mínimo */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="input-min-mp-diameter"
                    className="text-xs font-bold text-slate-700"
                  >
                    Diâmetro mín. MP (mm) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="input-min-mp-diameter"
                      ref={minMpDiamRef}
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
                    <span className="text-[10px] text-slate-500 block">Ex: 130,00 mm</span>
                  )}
                </div>

                {/* Diâmetro Máximo */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="input-max-mp-diameter"
                    className="text-xs font-bold text-slate-700"
                  >
                    Diâmetro máx. MP (mm) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="input-max-mp-diameter"
                      ref={maxMpDiamRef}
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
                    <span className="text-[10px] text-slate-500 block">Ex: 140,00 mm</span>
                  )}
                </div>
              </div>

              {/* Linha 2: Novos campos de Comprimento MP (m) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/70">
                {/* Comprimento Mínimo MP (m) */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="input-comprimento-min-mp"
                    className="text-xs font-bold text-slate-700"
                  >
                    Comprimento mín. MP (m) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="input-comprimento-min-mp"
                      ref={compMinMpRef}
                      value={comprimentoMinMp}
                      onChange={(e) => {
                        setHasUserEdited(true)
                        setComprimentoMinMp(e.target.value)
                        if (errors.comprimento_min_mp) {
                          setErrors((prev) => ({
                            ...prev,
                            comprimento_min_mp: undefined,
                            comprimento_max_mp: undefined,
                          }))
                        }
                      }}
                      placeholder="6,00"
                      className={`h-8 text-xs bg-white font-mono pr-8 ${
                        errors.comprimento_min_mp
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300'
                      }`}
                      data-testid="input-comprimento-min-mp"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">
                      m
                    </span>
                  </div>
                  {errors.comprimento_min_mp ? (
                    <span
                      className="text-[11px] text-rose-600 font-semibold block"
                      data-testid="error-comprimento-min-mp"
                    >
                      {errors.comprimento_min_mp}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 block">
                      Padrão brasileiro (ex: 6,00 m).
                    </span>
                  )}
                </div>

                {/* Comprimento Máximo MP (m) */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="input-comprimento-max-mp"
                    className="text-xs font-bold text-slate-700"
                  >
                    Comprimento máx. MP (m) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="input-comprimento-max-mp"
                      ref={compMaxMpRef}
                      value={comprimentoMaxMp}
                      onChange={(e) => {
                        setHasUserEdited(true)
                        setComprimentoMaxMp(e.target.value)
                        if (errors.comprimento_max_mp) {
                          setErrors((prev) => ({
                            ...prev,
                            comprimento_min_mp: undefined,
                            comprimento_max_mp: undefined,
                          }))
                        }
                      }}
                      placeholder="12,00"
                      className={`h-8 text-xs bg-white font-mono pr-8 ${
                        errors.comprimento_max_mp
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : 'border-slate-300'
                      }`}
                      data-testid="input-comprimento-max-mp"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] font-bold text-slate-400">
                      m
                    </span>
                  </div>
                  {errors.comprimento_max_mp ? (
                    <span
                      className="text-[11px] text-rose-600 font-semibold block"
                      data-testid="error-comprimento-max-mp"
                    >
                      {errors.comprimento_max_mp}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 block">
                      Validação: mín ≤ máx (ex: 12,00 m).
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 3: Bitolas da Família */}
            <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Bitolas da Família ({visibleGauges.length})
                  </h4>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenAddGauge}
                  data-testid="btn-add-gauge"
                  className="h-7 text-xs font-bold border-slate-300 text-[#004C97] hover:bg-blue-50 gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" /> + Adicionar bitola
                </Button>
              </div>

              {/* Erro geral de bitolas */}
              {errors.gauges && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.gauges}
                </div>
              )}

              {/* Tabela de Bitolas da Família */}
              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 min-w-[140px]">Bitola</th>
                      <th className="p-2.5 min-w-[180px]">Descrição</th>
                      <th className="p-2.5 w-24 text-center">Status</th>
                      <th className="p-2.5 w-24 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {visibleGauges.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                          Nenhuma bitola vinculada. Clique em &quot;+ Adicionar bitola&quot; acima.
                        </td>
                      </tr>
                    ) : (
                      visibleGauges.map((g, index) => {
                        const originalIndex = gauges.findIndex((item) => item === g)
                        return (
                          <tr
                            key={g.id || index}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              !g.active ? 'bg-slate-50/50 opacity-70' : ''
                            }`}
                            data-testid={`gauge-row-${index}`}
                          >
                            <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">
                              {index + 1}
                            </td>

                            {/* Bitola */}
                            <td className="p-2.5 font-bold text-slate-900 font-mono">{g.bitola}</td>

                            {/* Descrição */}
                            <td className="p-2.5 text-slate-600">
                              {g.description || <span className="text-slate-400 italic">—</span>}
                            </td>

                            {/* Status */}
                            <td className="p-2.5 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-bold ${
                                  g.active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-slate-100 text-slate-500 border-slate-300'
                                }`}
                              >
                                {g.active ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </td>

                            {/* Ações (Editar, Remover, Alternar Status) */}
                            <td className="p-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditGauge(originalIndex)}
                                  title="Editar dados da bitola"
                                  data-testid={`btn-edit-gauge-${index}`}
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleGaugeStatus(originalIndex)}
                                  title={g.active ? 'Inativar bitola' : 'Ativar bitola'}
                                  data-testid={`btn-toggle-gauge-status-${index}`}
                                  className={`h-7 w-7 p-0 ${
                                    g.active
                                      ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveGauge(originalIndex)}
                                  title="Remover bitola da família"
                                  data-testid={`btn-remove-gauge-${index}`}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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
                placeholder="Ex: Parâmetros definidos conforme Ficha Mestra de laminação."
                className="h-8 text-xs bg-white border-slate-300"
                data-testid="input-family-notes"
              />
            </div>
          </div>

          {/* Rodapé Fixo de Ações */}
          <DialogFooter className="p-3 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-500">
              {isEditing
                ? 'Atualização do registro existente sem duplicidade.'
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

      {/* Modal para Adicionar / Editar Bitola */}
      <LineFamilyAddGaugeModal
        isOpen={isGaugeModalOpen}
        onClose={() => {
          setIsGaugeModalOpen(false)
          setGaugeToEditIndex(null)
        }}
        onConfirm={handleConfirmGaugeModal}
        centerCode={centerCode}
        existingGauges={gauges}
        gaugeToEdit={gaugeToEditIndex !== null ? gauges[gaugeToEditIndex] : null}
      />

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

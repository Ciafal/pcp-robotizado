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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Box, AlertTriangle, Shield, Wrench, Hammer, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  CenterBufferRecord,
  CenterBufferType,
  OFFICIAL_CENTER_BUFFER_TYPES,
  OFFICIAL_CAPACITY_REDUCTION_UNITS,
  SaveCenterBufferInput,
} from '@/types/center-buffers-and-lungs'
import {
  CenterBuffersAndLungsService,
  CenterBufferValidationErrors,
} from '@/services/center-buffers-and-lungs-service'
import { parsePtBrNumber, formatPtBrNumber } from '@/lib/number-format'

interface CenterBufferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  centerCode: string
  centerName?: string
  lineId?: string
  bufferToEdit?: CenterBufferRecord | null
  onSuccess: (saved: CenterBufferRecord) => void
}

export const CenterBufferModal: React.FC<CenterBufferModalProps> = ({
  open,
  onOpenChange,
  centerCode,
  centerName,
  lineId,
  bufferToEdit,
  onSuccess,
}) => {
  const { toast } = useToast()
  const isEdit = Boolean(bufferToEdit?.id)

  // Estado dos campos do formulário
  const [code, setCode] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [bufferType, setBufferType] = useState<CenterBufferType>('Espaço físico')

  // A. Espaço físico
  const [locationPhysical, setLocationPhysical] = useState<string>('')
  const [availableArea, setAvailableArea] = useState<string>('')
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>('m²')
  const [operationalCapacity, setOperationalCapacity] = useState<string>('')
  const [observation, setObservation] = useState<string>('')

  // B. Capacidade máxima da baia
  const [bayIdentification, setBayIdentification] = useState<string>('')
  const [maxCapacity, setMaxCapacity] = useState<string>('')
  const [recommendedCapacity, setRecommendedCapacity] = useState<string>('')
  const [maxPercentageAllowed, setMaxPercentageAllowed] = useState<string>('100')

  // C, D, E, F. Bloqueios
  const [blockReason, setBlockReason] = useState<string>('')
  const [responsibleName, setResponsibleName] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [expectedReleaseDate, setExpectedReleaseDate] = useState<string>('')
  const [blockStatus, setBlockStatus] = useState<
    'Programado' | 'Ativo' | 'Finalizado' | 'Cancelado'
  >('Programado')

  // E. Manutenção (Equipamento) & F. Obra
  const [relatedEquipment, setRelatedEquipment] = useState<string>('')
  const [constructionDescription, setConstructionDescription] = useState<string>('')

  // 3. Impacto na Capacidade Produtiva
  const [impactsCapacity, setImpactsCapacity] = useState<boolean>(false)
  const [capacityReduction, setCapacityReduction] = useState<string>('')
  const [capacityReductionUnit, setCapacityReductionUnit] = useState<string>('%')
  const [capacityImpactStart, setCapacityImpactStart] = useState<string>('')
  const [capacityImpactEnd, setCapacityImpactEnd] = useState<string>('')

  // Controle de validações e submissão
  const [errors, setErrors] = useState<CenterBufferValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false)

  // Inicialização ao abrir modal
  useEffect(() => {
    if (!open) {
      setHasUnsavedChanges(false)
      setShowDiscardConfirm(false)
      return
    }

    setErrors({})
    setHasUnsavedChanges(false)

    if (bufferToEdit) {
      setCode(bufferToEdit.code || '')
      setName(bufferToEdit.name || '')
      setDescription(bufferToEdit.description || '')
      setStatus(bufferToEdit.status || 'Ativo')
      setBufferType(bufferToEdit.buffer_type || 'Espaço físico')

      setLocationPhysical(bufferToEdit.location_physical || '')
      setAvailableArea(
        bufferToEdit.available_area != null
          ? String(bufferToEdit.available_area).replace('.', ',')
          : '',
      )
      setUnitOfMeasure(bufferToEdit.unit_of_measure || 'm²')
      setOperationalCapacity(
        bufferToEdit.operational_capacity != null
          ? String(bufferToEdit.operational_capacity).replace('.', ',')
          : '',
      )
      setObservation(bufferToEdit.observation || '')

      setBayIdentification(bufferToEdit.bay_identification || '')
      setMaxCapacity(
        bufferToEdit.max_capacity != null
          ? String(bufferToEdit.max_capacity).replace('.', ',')
          : '',
      )
      setRecommendedCapacity(
        bufferToEdit.recommended_capacity != null
          ? String(bufferToEdit.recommended_capacity).replace('.', ',')
          : '',
      )
      setMaxPercentageAllowed(
        bufferToEdit.max_percentage_allowed != null
          ? String(bufferToEdit.max_percentage_allowed).replace('.', ',')
          : '100',
      )

      setBlockReason(bufferToEdit.block_reason || '')
      setResponsibleName(bufferToEdit.responsible_name || '')
      setStartDate(bufferToEdit.start_date || '')
      setExpectedReleaseDate(bufferToEdit.expected_release_date || '')
      setBlockStatus(bufferToEdit.block_status || 'Programado')

      setRelatedEquipment(bufferToEdit.related_equipment || '')
      setConstructionDescription(bufferToEdit.construction_description || '')

      setImpactsCapacity(Boolean(bufferToEdit.impacts_capacity))
      setCapacityReduction(
        bufferToEdit.capacity_reduction != null
          ? String(bufferToEdit.capacity_reduction).replace('.', ',')
          : '',
      )
      setCapacityReductionUnit(bufferToEdit.capacity_reduction_unit || '%')
      setCapacityImpactStart(bufferToEdit.capacity_impact_start || '')
      setCapacityImpactEnd(bufferToEdit.capacity_impact_end || '')
    } else {
      // Modo Criação: gerar código automático
      CenterBuffersAndLungsService.generateNextBufferCode().then((nextCode) => {
        setCode(nextCode)
      })
      setName('')
      setDescription('')
      setStatus('Ativo')
      setBufferType('Espaço físico')

      setLocationPhysical('')
      setAvailableArea('')
      setUnitOfMeasure('m²')
      setOperationalCapacity('')
      setObservation('')

      setBayIdentification('')
      setMaxCapacity('')
      setRecommendedCapacity('')
      setMaxPercentageAllowed('100')

      setBlockReason('')
      setResponsibleName('')
      setStartDate('')
      setExpectedReleaseDate('')
      setBlockStatus('Programado')

      setRelatedEquipment('')
      setConstructionDescription('')

      setImpactsCapacity(false)
      setCapacityReduction('')
      setCapacityReductionUnit('%')
      setCapacityImpactStart('')
      setCapacityImpactEnd('')
    }
  }, [open, bufferToEdit])

  // Trata tentativa de fechar com alterações pendentes
  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true)
    } else {
      onOpenChange(false)
    }
  }

  const markDirty = () => {
    if (!hasUnsavedChanges) setHasUnsavedChanges(true)
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    // Construir input
    const parsedAvailableArea = availableArea.trim() ? parsePtBrNumber(availableArea) : null
    const parsedOperationalCapacity = operationalCapacity.trim()
      ? parsePtBrNumber(operationalCapacity)
      : null
    const parsedMaxCapacity = maxCapacity.trim() ? parsePtBrNumber(maxCapacity) : null
    const parsedRecommendedCapacity = recommendedCapacity.trim()
      ? parsePtBrNumber(recommendedCapacity)
      : null
    const parsedMaxPercentage = maxPercentageAllowed.trim()
      ? parsePtBrNumber(maxPercentageAllowed)
      : null
    const parsedCapacityReduction = capacityReduction.trim()
      ? parsePtBrNumber(capacityReduction)
      : null

    const inputPayload: SaveCenterBufferInput = {
      id: bufferToEdit?.id,
      code,
      name,
      center_code: centerCode,
      center_name: centerName,
      line_id: lineId,
      description,
      status,
      buffer_type: bufferType,

      location_physical: locationPhysical,
      availableArea: parsedAvailableArea,
      unit_of_measure: unitOfMeasure,
      operational_capacity: parsedOperationalCapacity,
      observation,

      bay_identification: bayIdentification,
      max_capacity: parsedMaxCapacity,
      recommended_capacity: parsedRecommendedCapacity,
      max_percentage_allowed: parsedMaxPercentage,

      block_reason: blockReason,
      responsible_name: responsibleName,
      start_date: startDate,
      expected_release_date: expectedReleaseDate,
      block_status: blockStatus,

      related_equipment: relatedEquipment,
      construction_description: constructionDescription,

      impacts_capacity: impactsCapacity,
      capacity_reduction: parsedCapacityReduction,
      capacity_reduction_unit: capacityReductionUnit,
      capacity_impact_start: capacityImpactStart,
      capacity_impact_end: capacityImpactEnd,
    }

    // Validação de negócio no cliente mantendo campos digitados
    const validationErrors = CenterBuffersAndLungsService.validateBuffer(inputPayload)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      const firstMsg = Object.values(validationErrors)[0]
      toast({
        variant: 'destructive',
        title: 'Verifique as informações',
        description: firstMsg,
      })
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const savedRecord = await CenterBuffersAndLungsService.saveBuffer(inputPayload)
      toast({
        title: isEdit ? 'Buffer atualizado' : 'Buffer cadastrado',
        description: `Buffer ${savedRecord.code} ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso.`,
      })
      setHasUnsavedChanges(false)
      onSuccess(savedRecord)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar buffer:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar buffer',
        description: err.message || 'Falha na persistência no banco de dados.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (!o ? handleRequestClose() : onOpenChange(true))}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto bg-white border border-slate-200 text-slate-900 p-0 shadow-2xl rounded-2xl">
          {/* Header Ciafal */}
          <div className="bg-[#004C97] text-white p-5 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
                <Box className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  {isEdit ? 'Editar Buffer' : 'Cadastrar Buffer'}
                  <Badge className="bg-white/20 text-white border-none text-[11px] font-mono uppercase">
                    {centerCode}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-blue-100">
                  Parametrização determinística vinculada ao Centro Produtivo {centerCode}
                  {centerName ? ` (${centerName})` : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-blue-200 font-mono block">Código</span>
              <span className="text-sm font-mono font-bold text-white bg-blue-900/60 px-2.5 py-0.5 rounded border border-blue-400/40">
                {code || 'Gerando...'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-5 text-xs">
            {/* 1. SEÇÃO DE IDENTIFICAÇÃO BÁSICA */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-[#004C97] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 1. Identificação do Buffer
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Código do Buffer (automático/somente leitura) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Código do Buffer</Label>
                  <Input
                    readOnly
                    value={code}
                    className="h-9 font-mono font-bold bg-slate-100 border-slate-300 text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500">Gerado automaticamente</span>
                </div>

                {/* Centro (preenchido automaticamente) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Centro Produtivo *</Label>
                  <Input
                    readOnly
                    value={centerName ? `${centerCode} - ${centerName}` : centerCode}
                    className="h-9 font-mono font-bold bg-slate-100 border-slate-300 text-[#004C97]"
                  />
                  {errors.center_code && (
                    <span className="text-[10px] text-rose-600 font-medium block">
                      {errors.center_code}
                    </span>
                  )}
                </div>

                {/* Status Ativo / Inativo */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Status *</Label>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="buf_status"
                        checked={status === 'Ativo'}
                        onChange={() => {
                          setStatus('Ativo')
                          markDirty()
                        }}
                        className="text-[#004C97]"
                      />
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Ativo
                      </span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="buf_status"
                        checked={status === 'Inativo'}
                        onChange={() => {
                          setStatus('Inativo')
                          markDirty()
                        }}
                        className="text-[#004C97]"
                      />
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                        Inativo
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Nome do Buffer */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Nome do Buffer *</Label>
                  <Input
                    placeholder="Ex: Baia MP-01, Área Bloqueada Gaiola 03..."
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      markDirty()
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                    }}
                    className={`h-9 bg-white border-slate-300 ${errors.name ? 'border-rose-500' : ''}`}
                  />
                  {errors.name && (
                    <span className="text-[10px] text-rose-600 font-medium block">
                      {errors.name}
                    </span>
                  )}
                </div>

                {/* Tipo de Buffer (obrigatório, 6 opções homologadas) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Buffer *</Label>
                  <select
                    value={bufferType}
                    onChange={(e) => {
                      setBufferType(e.target.value as CenterBufferType)
                      markDirty()
                    }}
                    className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-[#004C97] outline-none"
                  >
                    {OFFICIAL_CENTER_BUFFER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Descrição</Label>
                <Input
                  placeholder="Detalhamento funcional da finalidade deste buffer..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    markDirty()
                  }}
                  className="h-9 bg-white border-slate-300"
                />
              </div>
            </div>

            {/* 2. REGRAS POR TIPO DE BUFFER (CAMPOS ADAPTÁVEIS) */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  {bufferType.includes('Manutenção') ? (
                    <Wrench className="w-4 h-4 text-blue-600" />
                  ) : bufferType.includes('Obra') ? (
                    <Hammer className="w-4 h-4 text-amber-600" />
                  ) : bufferType.includes('segurança') || bufferType.includes('Segurança') ? (
                    <Shield className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Box className="w-4 h-4 text-[#004C97]" />
                  )}
                  2. Parâmetros Específicos: <span className="text-[#004C97]">{bufferType}</span>
                </span>
                <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                  Formulário Dinâmico
                </Badge>
              </div>

              {/* A. Espaço físico */}
              {bufferType === 'Espaço físico' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Localização / Identificação Física
                      </Label>
                      <Input
                        placeholder="Ex: Galpão A - Pátio 2, Baia Externa"
                        value={locationPhysical}
                        onChange={(e) => {
                          setLocationPhysical(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Área Disponível
                      </Label>
                      <Input
                        placeholder="Ex: 250,50"
                        value={availableArea}
                        onChange={(e) => {
                          setAvailableArea(e.target.value)
                          markDirty()
                          if (errors.available_area)
                            setErrors((prev) => ({ ...prev, available_area: '' }))
                        }}
                        className={`h-9 font-mono ${errors.available_area ? 'border-rose-500' : ''}`}
                      />
                      {errors.available_area && (
                        <span className="text-[10px] text-rose-600 font-medium block">
                          {errors.available_area}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Unidade de Medida
                      </Label>
                      <select
                        value={unitOfMeasure}
                        onChange={(e) => {
                          setUnitOfMeasure(e.target.value)
                          markDirty()
                        }}
                        className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-xs"
                      >
                        <option value="m²">m² (Metros quadrados)</option>
                        <option value="m">m (Metros lineares)</option>
                        <option value="t">t (Toneladas)</option>
                        <option value="m³">m³ (Volume)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Capacidade Operacional
                      </Label>
                      <Input
                        placeholder="Ex: 180,00"
                        value={operationalCapacity}
                        onChange={(e) => {
                          setOperationalCapacity(e.target.value)
                          markDirty()
                        }}
                        className="h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Observação</Label>
                      <Input
                        placeholder="Restrições de piso, altura livre, etc."
                        value={observation}
                        onChange={(e) => {
                          setObservation(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* B. Capacidade máxima da baia */}
              {bufferType === 'Capacidade máxima da baia' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Identificação da Baia *
                      </Label>
                      <Input
                        placeholder="Ex: Baia MP-01, Baia B-04"
                        value={bayIdentification}
                        onChange={(e) => {
                          setBayIdentification(e.target.value)
                          markDirty()
                        }}
                        className="h-9 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Capacidade Máxima *
                      </Label>
                      <Input
                        placeholder="Ex: 150,00"
                        value={maxCapacity}
                        onChange={(e) => {
                          setMaxCapacity(e.target.value)
                          markDirty()
                          if (errors.max_capacity)
                            setErrors((prev) => ({ ...prev, max_capacity: '' }))
                        }}
                        className={`h-9 font-mono font-bold ${errors.max_capacity ? 'border-rose-500' : ''}`}
                      />
                      {errors.max_capacity && (
                        <span className="text-[10px] text-rose-600 font-medium block">
                          {errors.max_capacity}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Unidade de Medida *
                      </Label>
                      <select
                        value={unitOfMeasure}
                        onChange={(e) => {
                          setUnitOfMeasure(e.target.value)
                          markDirty()
                        }}
                        className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-xs"
                      >
                        <option value="t">t (Toneladas)</option>
                        <option value="kg">kg (Quilogramas)</option>
                        <option value="unidade">unidade (Peças/Unidades)</option>
                        <option value="m²">m² (Área)</option>
                        <option value="outra">Outra cadastrada</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Capacidade Recomendada
                      </Label>
                      <Input
                        placeholder="Ex: 120,00"
                        value={recommendedCapacity}
                        onChange={(e) => {
                          setRecommendedCapacity(e.target.value)
                          markDirty()
                        }}
                        className="h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Percentual Máximo Permitido (%)
                      </Label>
                      <Input
                        placeholder="Ex: 95"
                        value={maxPercentageAllowed}
                        onChange={(e) => {
                          setMaxPercentageAllowed(e.target.value)
                          markDirty()
                        }}
                        className="h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Observação</Label>
                      <Input
                        placeholder="Ex: Baia MP-01, Capacidade máxima: 150 t"
                        value={observation}
                        onChange={(e) => {
                          setObservation(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* C. Área bloqueada por segurança */}
              {bufferType === 'Área bloqueada por segurança' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Localização / Área *
                      </Label>
                      <Input
                        placeholder="Ex: Entorno do Forno 1, Pátio de Sucata"
                        value={locationPhysical}
                        onChange={(e) => {
                          setLocationPhysical(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Motivo do Bloqueio
                      </Label>
                      <Input
                        placeholder="Ex: Risco de projeção de material, piso danificado"
                        value={blockReason}
                        onChange={(e) => {
                          setBlockReason(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Responsável</Label>
                      <Input
                        placeholder="Ex: Técnico de Segurança / Engenharia"
                        value={responsibleName}
                        onChange={(e) => {
                          setResponsibleName(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Data Inicial</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          markDirty()
                        }}
                        className="h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Status do Bloqueio
                      </Label>
                      <Input
                        value="Restrição Permanente / Sem data final definida"
                        readOnly
                        className="h-9 bg-slate-100 text-slate-600 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Observação</Label>
                      <Input
                        placeholder="Detalhes adicionais de segurança"
                        value={observation}
                        onChange={(e) => {
                          setObservation(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* D. Bloqueio temporário — Segurança */}
              {bufferType === 'Bloqueio temporário — Segurança' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Área / Localização *
                      </Label>
                      <Input
                        placeholder="Ex: Corredor de translação"
                        value={locationPhysical}
                        onChange={(e) => {
                          setLocationPhysical(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Motivo</Label>
                      <Input
                        placeholder="Ex: Interdição temporária para inspeção"
                        value={blockReason}
                        onChange={(e) => {
                          setBlockReason(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Responsável</Label>
                      <Input
                        placeholder="Ex: SESMT Ciafal"
                        value={responsibleName}
                        onChange={(e) => {
                          setResponsibleName(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Data/Hora Inicial *
                      </Label>
                      <Input
                        placeholder="Ex: 05/10/2026 08:00 ou 2026-10-05T08:00"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          markDirty()
                          if (errors.start_date) setErrors((prev) => ({ ...prev, start_date: '' }))
                        }}
                        className={`h-9 font-mono ${errors.start_date ? 'border-rose-500' : ''}`}
                      />
                      {errors.start_date && (
                        <span className="text-[10px] text-rose-600 font-medium block">
                          {errors.start_date}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Data/Hora Prevista de Liberação
                      </Label>
                      <Input
                        placeholder="Ex: 05/10/2026 18:00 ou 2026-10-05T18:00"
                        value={expectedReleaseDate}
                        onChange={(e) => {
                          setExpectedReleaseDate(e.target.value)
                          markDirty()
                          if (errors.expected_release_date)
                            setErrors((prev) => ({ ...prev, expected_release_date: '' }))
                        }}
                        className={`h-9 font-mono ${errors.expected_release_date ? 'border-rose-500' : ''}`}
                      />
                      {errors.expected_release_date && (
                        <span className="text-[10px] text-rose-600 font-medium block">
                          {errors.expected_release_date}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Status do Bloqueio
                      </Label>
                      <select
                        value={blockStatus}
                        onChange={(e) => {
                          setBlockStatus(e.target.value as any)
                          markDirty()
                        }}
                        className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-xs"
                      >
                        <option value="Programado">Programado</option>
                        <option value="Ativo">Ativo</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* E. Bloqueio temporário — Manutenção */}
              {bufferType === 'Bloqueio temporário — Manutenção' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Área / Localização *
                      </Label>
                      <Input
                        placeholder="Ex: Gaiola 03 / Desbaste"
                        value={locationPhysical}
                        onChange={(e) => {
                          setLocationPhysical(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Equipamento Relacionado (PCM/SAP PM)
                      </Label>
                      <Input
                        placeholder="Ex: Mancal G03-L1 / Ordem SAP PM 400129"
                        value={relatedEquipment}
                        onChange={(e) => {
                          setRelatedEquipment(e.target.value)
                          markDirty()
                        }}
                        className="h-9 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Responsável</Label>
                      <Input
                        placeholder="Ex: Eng. Roberto Silva - PCM"
                        value={responsibleName}
                        onChange={(e) => {
                          setResponsibleName(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Motivo</Label>
                      <Input
                        placeholder="Ex: Reforma emergencial e troca de mancais"
                        value={blockReason}
                        onChange={(e) => {
                          setBlockReason(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Data/Hora Inicial *
                      </Label>
                      <Input
                        placeholder="Ex: 05/10/2026 08:00"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          markDirty()
                          if (errors.start_date) setErrors((prev) => ({ ...prev, start_date: '' }))
                        }}
                        className={`h-9 font-mono ${errors.start_date ? 'border-rose-500' : ''}`}
                      />
                      {errors.start_date && (
                        <span className="text-[10px] text-rose-600 font-medium block">
                          {errors.start_date}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Data/Hora Prevista Liberação
                      </Label>
                      <Input
                        placeholder="Ex: 05/10/2026 18:00"
                        value={expectedReleaseDate}
                        onChange={(e) => {
                          setExpectedReleaseDate(e.target.value)
                          markDirty()
                          if (errors.expected_release_date)
                            setErrors((prev) => ({ ...prev, expected_release_date: '' }))
                        }}
                        className={`h-9 font-mono ${errors.expected_release_date ? 'border-rose-500' : ''}`}
                      />
                      {errors.expected_release_date && (
                        <span className="text-[10px] text-rose-600 font-medium block">
                          {errors.expected_release_date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Status</Label>
                      <select
                        value={blockStatus}
                        onChange={(e) => {
                          setBlockStatus(e.target.value as any)
                          markDirty()
                        }}
                        className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-xs"
                      >
                        <option value="Programado">Programado</option>
                        <option value="Ativo">Ativo</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Observação</Label>
                      <Input
                        placeholder="Anotações de campo da manutenção"
                        value={observation}
                        onChange={(e) => {
                          setObservation(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* F. Bloqueio temporário — Obra */}
              {bufferType === 'Bloqueio temporário — Obra' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Área / Localização *
                      </Label>
                      <Input
                        placeholder="Ex: Fundação do novo leito de resfriamento"
                        value={locationPhysical}
                        onChange={(e) => {
                          setLocationPhysical(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Descrição da Obra
                      </Label>
                      <Input
                        placeholder="Ex: Concretagem de base e instalação elétrica"
                        value={constructionDescription}
                        onChange={(e) => {
                          setConstructionDescription(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Responsável</Label>
                      <Input
                        placeholder="Ex: Engenharia Civil Ciafal"
                        value={responsibleName}
                        onChange={(e) => {
                          setResponsibleName(e.target.value)
                          markDirty()
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Data/Hora Inicial *
                      </Label>
                      <Input
                        placeholder="Ex: 01/11/2026 07:00"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          markDirty()
                          if (errors.start_date) setErrors((prev) => ({ ...prev, start_date: '' }))
                        }}
                        className={`h-9 font-mono ${errors.start_date ? 'border-rose-500' : ''}`}
                      />
                      {errors.start_date && (
                        <span className="text-[10px] text-rose-600 font-medium block">
                          {errors.start_date}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Data/Hora Prevista Liberação
                      </Label>
                      <Input
                        placeholder="Ex: 15/11/2026 19:00"
                        value={expectedReleaseDate}
                        onChange={(e) => {
                          setExpectedReleaseDate(e.target.value)
                          markDirty()
                          if (errors.expected_release_date)
                            setErrors((prev) => ({ ...prev, expected_release_date: '' }))
                        }}
                        className={`h-9 font-mono ${errors.expected_release_date ? 'border-rose-500' : ''}`}
                      />
                      {errors.expected_release_date && (
                        <span className="text-[10px] text-rose-600 font-medium block">
                          {errors.expected_release_date}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Status</Label>
                      <select
                        value={blockStatus}
                        onChange={(e) => {
                          setBlockStatus(e.target.value as any)
                          markDirty()
                        }}
                        className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-xs"
                      >
                        <option value="Programado">Programado</option>
                        <option value="Ativo">Ativo</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. IMPACTO DO BUFFER NA CAPACIDADE PRODUTIVA */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> 3. Impacto na Capacidade
                  Produtiva
                </span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Impacta capacidade produtiva?
                  </Label>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setImpactsCapacity(true)
                        markDirty()
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        impactsCapacity ? 'bg-[#004C97] text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImpactsCapacity(false)
                        markDirty()
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        !impactsCapacity ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Não
                    </button>
                  </div>
                </div>
              </div>

              {impactsCapacity ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-200/60">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Redução de Capacidade *
                    </Label>
                    <Input
                      placeholder="Ex: 25"
                      value={capacityReduction}
                      onChange={(e) => {
                        setCapacityReduction(e.target.value)
                        markDirty()
                      }}
                      className="h-9 font-mono font-bold bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Unidade *</Label>
                    <select
                      value={capacityReductionUnit}
                      onChange={(e) => {
                        setCapacityReductionUnit(e.target.value)
                        markDirty()
                      }}
                      className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-xs"
                    >
                      {OFFICIAL_CAPACITY_REDUCTION_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Data/Hora Inicial
                    </Label>
                    <Input
                      placeholder="05/10/2026 08:00"
                      value={capacityImpactStart}
                      onChange={(e) => {
                        setCapacityImpactStart(e.target.value)
                        markDirty()
                      }}
                      className="h-9 font-mono bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Data/Hora Final Prevista
                    </Label>
                    <Input
                      placeholder="05/10/2026 18:00"
                      value={capacityImpactEnd}
                      onChange={(e) => {
                        setCapacityImpactEnd(e.target.value)
                        markDirty()
                        if (errors.capacity_impact_end)
                          setErrors((prev) => ({ ...prev, capacity_impact_end: '' }))
                      }}
                      className={`h-9 font-mono bg-white ${errors.capacity_impact_end ? 'border-rose-500' : ''}`}
                    />
                    {errors.capacity_impact_end && (
                      <span className="text-[10px] text-rose-600 font-medium block">
                        {errors.capacity_impact_end}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-amber-800 italic">
                  Este buffer não acarreta redução da capacidade líquida nominal do Centro{' '}
                  {centerCode}.
                </p>
              )}
            </div>

            {/* Rodapé e Botões Funcionais */}
            <DialogFooter className="gap-2 border-t border-slate-200 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRequestClose}
                disabled={isSubmitting}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold px-4 h-9 shadow-xs"
              >
                {isSubmitting
                  ? 'Gravando no banco...'
                  : isEdit
                    ? 'Salvar Alterações'
                    : 'Salvar Buffer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Descarte de Alterações */}
      <Dialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <DialogContent className="max-w-md bg-white border border-slate-200 p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Descartar alterações?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-600 py-2">
            Existem alterações não salvas. Deseja descartá-las?
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDiscardConfirm(false)}
              className="text-xs"
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setShowDiscardConfirm(false)
                setHasUnsavedChanges(false)
                onOpenChange(false)
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

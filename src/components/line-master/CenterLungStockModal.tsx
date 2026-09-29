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
import { Layers, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  CenterLungStockRecord,
  SaveCenterLungStockInput,
  calculateLungStockBand,
} from '@/types/center-buffers-and-lungs'
import {
  CenterBuffersAndLungsService,
  CenterLungValidationErrors,
} from '@/services/center-buffers-and-lungs-service'
import { parsePtBrNumber } from '@/lib/number-format'

interface CenterLungStockModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  centerCode: string
  centerName?: string
  lineId?: string
  lungToEdit?: CenterLungStockRecord | null
  onSuccess: (saved: CenterLungStockRecord) => void
}

export const CenterLungStockModal: React.FC<CenterLungStockModalProps> = ({
  open,
  onOpenChange,
  centerCode,
  centerName,
  lineId,
  lungToEdit,
  onSuccess,
}) => {
  const { toast } = useToast()
  const isEdit = Boolean(lungToEdit?.id)

  // Identificação
  const [code, setCode] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [locationDeposit, setLocationDeposit] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')

  // Parametrização dos Limites Operacionais
  const [materialOrGroup, setMaterialOrGroup] = useState<string>('')
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>('t')
  const [minStock, setMinStock] = useState<string>('')
  const [idealStock, setIdealStock] = useState<string>('')
  const [maxStock, setMaxStock] = useState<string>('')
  const [maxPhysicalCapacity, setMaxPhysicalCapacity] = useState<string>('')
  const [minCoverageHours, setMinCoverageHours] = useState<string>('')
  const [idealCoverageHours, setIdealCoverageHours] = useState<string>('')
  const [currentRealStock, setCurrentRealStock] = useState<string>('')
  const [observation, setObservation] = useState<string>('')

  // Controle de validações e submissão
  const [errors, setErrors] = useState<CenterLungValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false)

  useEffect(() => {
    if (!open) {
      setHasUnsavedChanges(false)
      setShowDiscardConfirm(false)
      return
    }

    setErrors({})
    setHasUnsavedChanges(false)

    if (lungToEdit) {
      setCode(lungToEdit.code || '')
      setName(lungToEdit.name || '')
      setLocationDeposit(lungToEdit.location_deposit || '')
      setDescription(lungToEdit.description || '')
      setStatus(lungToEdit.status || 'Ativo')

      setMaterialOrGroup(lungToEdit.material_or_group || '')
      setUnitOfMeasure(lungToEdit.unit_of_measure || 't')
      setMinStock(
        lungToEdit.min_stock != null ? String(lungToEdit.min_stock).replace('.', ',') : '',
      )
      setIdealStock(
        lungToEdit.ideal_stock != null ? String(lungToEdit.ideal_stock).replace('.', ',') : '',
      )
      setMaxStock(
        lungToEdit.max_stock != null ? String(lungToEdit.max_stock).replace('.', ',') : '',
      )
      setMaxPhysicalCapacity(
        lungToEdit.max_physical_capacity != null
          ? String(lungToEdit.max_physical_capacity).replace('.', ',')
          : '',
      )
      setMinCoverageHours(
        lungToEdit.min_coverage_hours != null
          ? String(lungToEdit.min_coverage_hours).replace('.', ',')
          : '',
      )
      setIdealCoverageHours(
        lungToEdit.ideal_coverage_hours != null
          ? String(lungToEdit.ideal_coverage_hours).replace('.', ',')
          : '',
      )
      setCurrentRealStock(
        lungToEdit.current_real_stock != null
          ? String(lungToEdit.current_real_stock).replace('.', ',')
          : '',
      )
      setObservation(lungToEdit.observation || '')
    } else {
      CenterBuffersAndLungsService.generateNextLungCode().then((nextCode) => {
        setCode(nextCode)
      })
      setName('')
      setLocationDeposit('')
      setDescription('')
      setStatus('Ativo')

      setMaterialOrGroup('')
      setUnitOfMeasure('t')
      setMinStock('')
      setIdealStock('')
      setMaxStock('')
      setMaxPhysicalCapacity('')
      setMinCoverageHours('')
      setIdealCoverageHours('')
      setCurrentRealStock('')
      setObservation('')
    }
  }, [open, lungToEdit])

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

  // Faixa calculada em tempo real para pré-visualização didática
  const numMin = minStock.trim() ? parsePtBrNumber(minStock) : 0
  const numIdeal = idealStock.trim() ? parsePtBrNumber(idealStock) : 0
  const numMax = maxStock.trim() ? parsePtBrNumber(maxStock) : 0
  const numCurrent = currentRealStock.trim() ? parsePtBrNumber(currentRealStock) : numIdeal
  const previewBand = calculateLungStockBand(numCurrent, numMin, numIdeal, numMax)

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isSubmitting) return

    const parsedMin = parsePtBrNumber(minStock)
    const parsedIdeal = parsePtBrNumber(idealStock)
    const parsedMax = parsePtBrNumber(maxStock)
    const parsedPhys = maxPhysicalCapacity.trim() ? parsePtBrNumber(maxPhysicalCapacity) : null
    const parsedMinCov = minCoverageHours.trim() ? parsePtBrNumber(minCoverageHours) : null
    const parsedIdealCov = idealCoverageHours.trim() ? parsePtBrNumber(idealCoverageHours) : null
    const parsedCurrentReal = currentRealStock.trim() ? parsePtBrNumber(currentRealStock) : null

    const inputPayload: SaveCenterLungStockInput = {
      id: lungToEdit?.id,
      code,
      name,
      center_code: centerCode,
      center_name: centerName,
      line_id: lineId,
      location_deposit: locationDeposit,
      description,
      status,

      material_or_group: materialOrGroup,
      unit_of_measure: unitOfMeasure,
      min_stock: parsedMin,
      ideal_stock: parsedIdeal,
      max_stock: parsedMax,
      max_physical_capacity: parsedPhys,
      min_coverage_hours: parsedMinCov,
      ideal_coverage_hours: parsedIdealCov,
      current_real_stock: parsedCurrentReal,
      observation,
    }

    const validationErrors = CenterBuffersAndLungsService.validateLungStock(inputPayload)
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
      const savedRecord = await CenterBuffersAndLungsService.saveLungStock(inputPayload)
      toast({
        title: isEdit ? 'Estoque Pulmão atualizado' : 'Estoque Pulmão cadastrado',
        description: `Estoque Pulmão ${savedRecord.code} ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso.`,
      })
      setHasUnsavedChanges(false)
      onSuccess(savedRecord)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar estoque pulmão:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar estoque pulmão',
        description: err.message || 'Falha na gravação dos parâmetros no banco.',
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
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  {isEdit ? 'Editar Estoque Pulmão' : 'Cadastrar Estoque Pulmão'}
                  <Badge className="bg-white/20 text-white border-none text-[11px] font-mono uppercase">
                    {centerCode}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-blue-100">
                  Parâmetros de proteção operacional vinculados ao Centro {centerCode}
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
                <CheckCircle2 className="w-4 h-4" /> 1. Identificação do Estoque Pulmão
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Código</Label>
                  <Input
                    readOnly
                    value={code}
                    className="h-9 font-mono font-bold bg-slate-100 border-slate-300 text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500">Gerado automaticamente</span>
                </div>

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

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Status *</Label>
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="lung_status"
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
                        name="lung_status"
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
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Nome do Estoque Pulmão *
                  </Label>
                  <Input
                    placeholder="Ex: Pulmão Tarugos 130x130 SAE 1020..."
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

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Localização / Baia / Depósito
                  </Label>
                  <Input
                    placeholder="Ex: DP01 - Pátio de Matéria-Prima, Baia 04"
                    value={locationDeposit}
                    onChange={(e) => {
                      setLocationDeposit(e.target.value)
                      markDirty()
                    }}
                    className="h-9 bg-white border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Descrição</Label>
                <Input
                  placeholder="Detalhamento operacional da função deste estoque pulmão..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    markDirty()
                  }}
                  className="h-9 bg-white border-slate-300"
                />
              </div>
            </div>

            {/* 2. PARAMETRIZAÇÃO DE ESTOQUES E LIMITES */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#004C97]" /> 2. Parametrização dos Limites de
                Estoque
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Material Específico ou Grupo de Materiais *
                  </Label>
                  <Input
                    placeholder="Ex: Tarugo 130x130 SAE 1020 ou Bobinas Laminadas Frio"
                    value={materialOrGroup}
                    onChange={(e) => {
                      setMaterialOrGroup(e.target.value)
                      markDirty()
                      if (errors.material_or_group)
                        setErrors((prev) => ({ ...prev, material_or_group: '' }))
                    }}
                    className={`h-9 bg-white font-medium ${errors.material_or_group ? 'border-rose-500' : ''}`}
                  />
                  {errors.material_or_group && (
                    <span className="text-[10px] text-rose-600 font-medium block">
                      {errors.material_or_group}
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
                    className="w-full h-9 bg-white border border-slate-300 rounded-md px-3 text-xs font-semibold"
                  >
                    <option value="t">t (Toneladas)</option>
                    <option value="kg">kg (Quilogramas)</option>
                    <option value="unidade">unidade (Peças)</option>
                    <option value="m">m (Metros lineares)</option>
                    <option value="m²">m² (Área)</option>
                    <option value="m³">m³ (Volume)</option>
                  </select>
                </div>
              </div>

              {/* Mínimo, Ideal, Máximo e Capacidade Física */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                    Estoque Mínimo *
                  </Label>
                  <Input
                    placeholder="Ex: 40,00"
                    value={minStock}
                    onChange={(e) => {
                      setMinStock(e.target.value)
                      markDirty()
                      if (errors.min_stock) setErrors((prev) => ({ ...prev, min_stock: '' }))
                    }}
                    className={`h-9 font-mono font-bold bg-rose-50/40 border-rose-200 ${errors.min_stock ? 'border-rose-500 ring-1 ring-rose-400' : ''}`}
                  />
                  {errors.min_stock ? (
                    <span className="text-[10px] text-rose-600 font-medium block">
                      {errors.min_stock}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Limite de alerta vermelho</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    Estoque Ideal *
                  </Label>
                  <Input
                    placeholder="Ex: 100,00"
                    value={idealStock}
                    onChange={(e) => {
                      setIdealStock(e.target.value)
                      markDirty()
                      if (errors.ideal_stock) setErrors((prev) => ({ ...prev, ideal_stock: '' }))
                    }}
                    className={`h-9 font-mono font-bold bg-emerald-50/40 border-emerald-200 ${errors.ideal_stock ? 'border-rose-500 ring-1 ring-rose-400' : ''}`}
                  />
                  {errors.ideal_stock ? (
                    <span className="text-[10px] text-rose-600 font-medium block">
                      {errors.ideal_stock}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Nível alvo balanceado</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                    Estoque Máximo *
                  </Label>
                  <Input
                    placeholder="Ex: 220,00"
                    value={maxStock}
                    onChange={(e) => {
                      setMaxStock(e.target.value)
                      markDirty()
                      if (errors.max_stock) setErrors((prev) => ({ ...prev, max_stock: '' }))
                    }}
                    className={`h-9 font-mono font-bold bg-blue-50/40 border-blue-200 ${errors.max_stock ? 'border-rose-500 ring-1 ring-rose-400' : ''}`}
                  />
                  {errors.max_stock ? (
                    <span className="text-[10px] text-rose-600 font-medium block">
                      {errors.max_stock}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Limite superior operacional</span>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Capacidade Física Máx.
                  </Label>
                  <Input
                    placeholder="Ex: 250,00"
                    value={maxPhysicalCapacity}
                    onChange={(e) => {
                      setMaxPhysicalCapacity(e.target.value)
                      markDirty()
                      if (errors.max_physical_capacity)
                        setErrors((prev) => ({ ...prev, max_physical_capacity: '' }))
                    }}
                    className={`h-9 font-mono bg-slate-50 ${errors.max_physical_capacity ? 'border-rose-500' : ''}`}
                  />
                  {errors.max_physical_capacity ? (
                    <span className="text-[10px] text-rose-600 font-medium block">
                      {errors.max_physical_capacity}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Limite estrutural da baia</span>
                  )}
                </div>
              </div>

              {/* Cobertura em Horas e Preparação SAP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> Cobertura Mínima (horas)
                  </Label>
                  <Input
                    placeholder="Ex: 8"
                    value={minCoverageHours}
                    onChange={(e) => {
                      setMinCoverageHours(e.target.value)
                      markDirty()
                    }}
                    className="h-9 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Proteção mínima do fluxo</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" /> Cobertura Ideal (horas)
                  </Label>
                  <Input
                    placeholder="Ex: 24"
                    value={idealCoverageHours}
                    onChange={(e) => {
                      setIdealCoverageHours(e.target.value)
                      markDirty()
                    }}
                    className="h-9 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">Cadência recomendada</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Estoque Real Atual (SAP / Demonstração)
                  </Label>
                  <Input
                    placeholder="Ex: 115,00"
                    value={currentRealStock}
                    onChange={(e) => {
                      setCurrentRealStock(e.target.value)
                      markDirty()
                    }}
                    className="h-9 font-mono bg-amber-50/30"
                  />
                  <span className="text-[10px] text-amber-700">
                    Preparado para leitura automática SAP/RFC
                  </span>
                </div>
              </div>

              {/* Faixas Operacionais Dinâmicas Calculadas */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Classificação Operacional Dinâmica (Faixas de Estoque Pulmão)
                  </span>
                  <Badge className={`text-[10px] border ${previewBand.badgeClass}`}>
                    Status Simulado: {previewBand.label}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="p-1.5 rounded bg-rose-900 text-white font-bold">
                    ROMPIDO (≤ 0)
                  </div>
                  <div className="p-1.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold">
                    VERMELHO (&lt; Mínimo {numMin > 0 ? numMin : '—'})
                  </div>
                  <div className="p-1.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                    AMARELO (&lt; Ideal {numIdeal > 0 ? numIdeal : '—'})
                  </div>
                  <div className="p-1.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    VERDE (≥ Ideal {numIdeal > 0 ? numIdeal : '—'})
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  * As faixas operacionais não utilizam valores estáticos; são calculadas
                  especificamente a partir dos parâmetros mínimos, ideais e máximos deste registro.
                </p>
              </div>

              {/* Observação */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Observação Geral</Label>
                <Input
                  placeholder="Observações complementares para o PCP..."
                  value={observation}
                  onChange={(e) => {
                    setObservation(e.target.value)
                    markDirty()
                  }}
                  className="h-9 bg-white"
                />
              </div>
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
                    : 'Salvar Estoque Pulmão'}
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

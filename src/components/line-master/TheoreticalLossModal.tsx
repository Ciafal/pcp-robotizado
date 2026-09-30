/**
 * Modal de Cadastro e Edição de Perdas Teóricas da Linha
 * Vinculado à collection line_theoretical_losses
 *
 * Campos:
 * - Centro / Linha (readonly derivado)
 * - Tipo de Matéria-Prima (catálogo oficial)
 * - Código da Matéria-Prima (busca via MaterialSelector ou input direto)
 * - Descrição da Matéria-Prima
 * - Bitola (Combobox oficial BitolaSelector com opção "Não há" e suporte SAP)
 * - Aplicação (texto ou seleção)
 * - Perdas Percentuais: RM (%), Carepa (%), Apara (%) com parser pt-BR (vírgula decimal) e limites 0-100%
 * - Observações / Justificativa Técnica
 */

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
import { AlertCircle, Percent, Loader2, Info } from 'lucide-react'
import { OFFICIAL_MP_TYPES_CATALOG } from '@/services/mp-programming-engine'
import { BitolaSelector } from '@/components/line-master/BitolaSelector'
import { MaterialSelector } from '@/components/common/MaterialSelector'
import {
  theoreticalLossesService,
  LineTheoreticalLoss,
  TheoreticalLossFormData,
  TheoreticalLossValidationErrors,
} from '@/services/theoretical-losses-service'
import { formatPtBrNumber } from '@/lib/number-format'

interface TheoreticalLossModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lineId: string
  lineMasterId?: string
  centerCode: string
  centerName?: string
  editingItem?: LineTheoreticalLoss | null
  onSuccess: () => void
}

export const TheoreticalLossModal: React.FC<TheoreticalLossModalProps> = ({
  open,
  onOpenChange,
  lineId,
  lineMasterId,
  centerCode,
  centerName,
  editingItem,
  onSuccess,
}) => {
  const isEditing = Boolean(editingItem?.id)

  const [rawMaterialType, setRawMaterialType] = useState<string>('TARUGO_130X130')
  const [rawMaterialCode, setRawMaterialCode] = useState<string>('')
  const [rawMaterialDescription, setRawMaterialDescription] = useState<string>('')
  const [bitola, setBitola] = useState<string>('Não há')
  const [application, setApplication] = useState<string>('')
  const [rmPct, setRmPct] = useState<string>('')
  const [carepaPct, setCarepaPct] = useState<string>('')
  const [aparaPct, setAparaPct] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const [errors, setErrors] = useState<TheoreticalLossValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Reset ou preenchimento ao abrir
  useEffect(() => {
    if (!open) return

    setErrors({})
    if (editingItem) {
      setRawMaterialType(editingItem.raw_material_type || 'TARUGO_130X130')
      setRawMaterialCode(editingItem.raw_material_code || '')
      setRawMaterialDescription(editingItem.raw_material_description || '')
      setBitola(editingItem.bitola || 'Não há')
      setApplication(editingItem.application || '')
      setRmPct(
        editingItem.rm_pct !== undefined && editingItem.rm_pct !== null
          ? formatPtBrNumber(editingItem.rm_pct, 2)
          : '',
      )
      setCarepaPct(
        editingItem.carepa_pct !== undefined && editingItem.carepa_pct !== null
          ? formatPtBrNumber(editingItem.carepa_pct, 2)
          : '',
      )
      setAparaPct(
        editingItem.apara_pct !== undefined && editingItem.apara_pct !== null
          ? formatPtBrNumber(editingItem.apara_pct, 2)
          : '',
      )
      setNotes(editingItem.notes || '')
    } else {
      setRawMaterialType('TARUGO_130X130')
      setRawMaterialCode('')
      setRawMaterialDescription('')
      setBitola('Não há')
      setApplication('')
      setRmPct('')
      setCarepaPct('')
      setAparaPct('')
      setNotes('')
    }
  }, [open, editingItem])

  // Cálculo de soma das perdas em tempo real
  const currentTotalLoss = React.useMemo(() => {
    const rm = theoreticalLossesService.parsePercentage(rmPct) || 0
    const carepa = theoreticalLossesService.parsePercentage(carepaPct) || 0
    const apara = theoreticalLossesService.parsePercentage(aparaPct) || 0
    return Number((rm + carepa + apara).toFixed(2))
  }, [rmPct, carepaPct, aparaPct])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    const formData: TheoreticalLossFormData = {
      id: editingItem?.id,
      line_id: lineId,
      line_master_id: lineMasterId,
      center_code: centerCode,
      raw_material_type: rawMaterialType,
      raw_material_code: rawMaterialCode,
      raw_material_description: rawMaterialDescription,
      bitola,
      application,
      rm_pct: rmPct,
      carepa_pct: carepaPct,
      apara_pct: aparaPct,
      notes,
    }

    // Validação de campos e limites
    const validationErrors = theoreticalLossesService.validateFormData(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Validação de unicidade / duplicidade
    setIsSubmitting(true)
    try {
      const isDuplicate = await theoreticalLossesService.checkDuplicate({
        lineId,
        rawMaterialCode,
        bitola,
        application,
        excludeId: editingItem?.id,
      })

      if (isDuplicate) {
        setErrors({
          duplicate:
            'Já existe uma perda teórica cadastrada para a mesma Linha + Código MP + Bitola + Aplicação.',
        })
        setIsSubmitting(false)
        return
      }

      await theoreticalLossesService.save(formData)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Erro ao salvar perda teórica. Tente novamente.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-900 shadow-2xl p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#004C97]" />
              {isEditing ? 'Editar Perda Teórica' : 'Cadastrar Perda Teórica'}
            </span>
            <Badge
              variant="outline"
              className="font-mono text-xs bg-blue-50 text-[#004C97] border-blue-200"
            >
              {centerCode} {centerName ? `— ${centerName}` : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Alertas de validação geral ou duplicidade */}
          {(errors.general || errors.duplicate) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Atenção</p>
                <p>{errors.general || errors.duplicate}</p>
              </div>
            </div>
          )}

          {/* Linha 1: Tipo de Matéria-Prima */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              1. Tipo de Matéria-Prima *
            </Label>
            <select
              value={rawMaterialType}
              onChange={(e) => {
                setRawMaterialType(e.target.value)
                setErrors((prev) => ({ ...prev, raw_material_type: undefined }))
              }}
              className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:ring-1 focus:ring-[#004C97] outline-none"
              data-testid="input-raw-material-type"
            >
              {OFFICIAL_MP_TYPES_CATALOG.map((mp) => (
                <option key={mp.code} value={mp.code}>
                  {mp.label}
                </option>
              ))}
            </select>
            {errors.raw_material_type && (
              <span className="text-[11px] text-rose-600">{errors.raw_material_type}</span>
            )}
          </div>

          {/* Linha 2: Seletor / Código da Matéria-Prima */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              2. Código da Matéria-Prima *
            </Label>
            <MaterialSelector
              value={rawMaterialCode}
              lineId={lineId}
              onChange={(code, mat) => {
                setRawMaterialCode(code)
                if (mat?.name) {
                  setRawMaterialDescription(mat.name)
                }
                setErrors((prev) => ({ ...prev, raw_material_code: undefined }))
              }}
              placeholder="Pesquise o código SAP ou digite diretamente..."
            />
            {errors.raw_material_code && (
              <span className="text-[11px] text-rose-600">{errors.raw_material_code}</span>
            )}
          </div>

          {/* Linha 3: Descrição da Matéria-Prima */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              3. Descrição da Matéria-Prima *
            </Label>
            <Input
              value={rawMaterialDescription}
              onChange={(e) => {
                setRawMaterialDescription(e.target.value)
                setErrors((prev) => ({ ...prev, raw_material_description: undefined }))
              }}
              placeholder="Ex: Tarugo 130x130 SAE 1020 Ciafal"
              className="bg-white border-slate-300 text-xs text-slate-900 h-8"
              data-testid="input-raw-material-description"
            />
            {errors.raw_material_description && (
              <span className="text-[11px] text-rose-600">{errors.raw_material_description}</span>
            )}
          </div>

          {/* Linha 4: Bitola e Aplicação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                4. Bitola (SAP ECC / Fixo) *
              </Label>
              <BitolaSelector
                value={bitola}
                centerCode={centerCode}
                onChange={(val) => {
                  setBitola(val)
                  setErrors((prev) => ({ ...prev, bitola: undefined }))
                }}
              />
              {errors.bitola && <span className="text-[11px] text-rose-600">{errors.bitola}</span>}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">5. Aplicação *</Label>
              <Input
                value={application}
                onChange={(e) => {
                  setApplication(e.target.value)
                  setErrors((prev) => ({ ...prev, application: undefined }))
                }}
                placeholder="Ex: CA-50, CA-60, Fio Máquina, Geral"
                className="bg-white border-slate-300 text-xs text-slate-900 h-8"
                data-testid="input-application"
              />
              {errors.application && (
                <span className="text-[11px] text-rose-600">{errors.application}</span>
              )}
            </div>
          </div>

          {/* Linha 5: Percentuais de Perda (RM %, Carepa %, Apara %) */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-[#004C97]" />
                Taxas de Perdas Teóricas (0,00% a 100,00%)
              </span>
              <span className="text-[11px] text-slate-500 italic">Aceita vírgula pt-BR</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* RM % */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">RM (%) *</Label>
                <div className="relative">
                  <Input
                    value={rmPct}
                    onChange={(e) => {
                      setRmPct(e.target.value)
                      setErrors((prev) => ({ ...prev, rm_pct: undefined, general: undefined }))
                    }}
                    placeholder="Ex: 1,50"
                    className="h-8 text-xs font-mono bg-white pr-6 font-bold text-slate-900"
                    data-testid="input-rm-pct"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">
                    %
                  </span>
                </div>
                {errors.rm_pct && (
                  <span className="text-[10px] text-rose-600 block leading-tight">
                    {errors.rm_pct}
                  </span>
                )}
              </div>

              {/* Carepa % */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Carepa (%) *</Label>
                <div className="relative">
                  <Input
                    value={carepaPct}
                    onChange={(e) => {
                      setCarepaPct(e.target.value)
                      setErrors((prev) => ({ ...prev, carepa_pct: undefined, general: undefined }))
                    }}
                    placeholder="Ex: 0,80"
                    className="h-8 text-xs font-mono bg-white pr-6 font-bold text-slate-900"
                    data-testid="input-carepa-pct"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">
                    %
                  </span>
                </div>
                {errors.carepa_pct && (
                  <span className="text-[10px] text-rose-600 block leading-tight">
                    {errors.carepa_pct}
                  </span>
                )}
              </div>

              {/* Apara % */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Apara (%) *</Label>
                <div className="relative">
                  <Input
                    value={aparaPct}
                    onChange={(e) => {
                      setAparaPct(e.target.value)
                      setErrors((prev) => ({ ...prev, apara_pct: undefined, general: undefined }))
                    }}
                    placeholder="Ex: 0,50"
                    className="h-8 text-xs font-mono bg-white pr-6 font-bold text-slate-900"
                    data-testid="input-apara-pct"
                  />
                  <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">
                    %
                  </span>
                </div>
                {errors.apara_pct && (
                  <span className="text-[10px] text-rose-600 block leading-tight">
                    {errors.apara_pct}
                  </span>
                )}
              </div>
            </div>

            {/* Totalizador de perdas */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-600 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" /> Soma Total de Perdas Teóricas:
              </span>
              <span
                className={`font-mono font-bold text-sm ${
                  currentTotalLoss > 100
                    ? 'text-rose-600'
                    : currentTotalLoss > 15
                      ? 'text-amber-700'
                      : 'text-[#004C97]'
                }`}
                data-testid="total-loss-display"
              >
                {formatPtBrNumber(currentTotalLoss, 2)}%
              </span>
            </div>
          </div>

          {/* Linha 6: Observações */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Observações / Justificativa
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações técnicas sobre as perdas teóricas deste material..."
              className="bg-white border-slate-300 text-xs text-slate-900 min-h-[60px]"
              data-testid="input-notes"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs text-slate-700"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5"
              data-testid="btn-save-theoretical-loss"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Perda Teórica'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TheoreticalLossModal

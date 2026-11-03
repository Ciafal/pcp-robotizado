/**
 * LineFamilyAddGaugeModal.tsx
 *
 * Modal no padrão visual do HUB Ciafal para pesquisar e selecionar/vincular uma Bitola à Família.
 *
 * Requisitos:
 * - Seleção de bitola utilizando prioritariamente a fonte oficial do SAP (ZPPT052) / mecanismo do projeto
 * - Descrição opcional quando disponível
 * - Status Ativa / Inativa
 * - Bloqueio de duplicidade: "Esta bitola já pertence a esta família."
 */

import React, { useState, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Layers, Plus, Edit2, AlertCircle } from 'lucide-react'
import { BitolaSelector } from '@/components/line-master/BitolaSelector'
import { LineFamilyGauge } from '@/services/line-product-families-service'

interface LineFamilyAddGaugeModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (gauge: LineFamilyGauge) => void
  centerCode?: string
  existingGauges: LineFamilyGauge[]
  gaugeToEdit?: LineFamilyGauge | null
}

export const LineFamilyAddGaugeModal: React.FC<LineFamilyAddGaugeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  centerCode,
  existingGauges,
  gaugeToEdit,
}) => {
  const [selectedBitola, setSelectedBitola] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [active, setActive] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(gaugeToEdit)

  useEffect(() => {
    if (!isOpen) {
      setSelectedBitola('')
      setDescription('')
      setActive(true)
      setError(null)
      return
    }

    if (gaugeToEdit) {
      setSelectedBitola(gaugeToEdit.bitola || '')
      setDescription(gaugeToEdit.description || '')
      setActive(gaugeToEdit.active !== false)
      setError(null)
    } else {
      setSelectedBitola('')
      setDescription('')
      setActive(true)
      setError(null)
    }
  }, [isOpen, gaugeToEdit])

  const handleSave = () => {
    const cleanBitola = selectedBitola.trim()
    if (!cleanBitola) {
      setError('Por favor, selecione ou informe uma bitola.')
      return
    }

    // Validação de duplicidade na mesma família
    const isDuplicate = existingGauges.some((g) => {
      if (g.deleted) return false
      // Se estiver editando, não conflitar consigo mesmo
      if (gaugeToEdit && g.id && g.id === gaugeToEdit.id) return false
      if (gaugeToEdit && !g.id && g.bitola.toUpperCase() === gaugeToEdit.bitola.toUpperCase()) {
        return false
      }
      return g.bitola.trim().toUpperCase() === cleanBitola.toUpperCase()
    })

    if (isDuplicate) {
      setError('Esta bitola já pertence a esta família.')
      return
    }

    onConfirm({
      id: gaugeToEdit?.id,
      bitola: cleanBitola,
      description: description.trim() || undefined,
      active,
      deleted: false,
    })

    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent
        className="max-w-md p-0 bg-white text-slate-900 border-slate-200 shadow-2xl overflow-hidden"
        data-testid="modal-add-gauge-family"
      >
        <DialogHeader className="p-4 px-6 border-b border-slate-200 bg-slate-50/90 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              {isEditing ? 'Editar Bitola da Família' : 'Adicionar Bitola à Família'}
            </DialogTitle>
            {centerCode && (
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-50 text-[#004C97] border-blue-200 font-bold"
              >
                {centerCode}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Selecione uma bitola da lista oficial SAP ECC (ZPPT052) ou informe os detalhes do
            vínculo.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div
              className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs font-semibold flex items-center gap-2"
              data-testid="gauge-modal-error"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Campo Bitola */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">
              Bitola <span className="text-rose-500">*</span>
            </Label>
            <BitolaSelector
              value={selectedBitola}
              onChange={(val) => {
                setSelectedBitola(val)
                setError(null)
              }}
              centerCode={centerCode}
              hasError={Boolean(error)}
              className="w-full text-xs"
            />
            <span className="text-[10px] text-slate-500 block">
              Consulta oficial à tabela SAP ZPPT052. Não permite bitolas duplicadas na mesma
              família.
            </span>
          </div>

          {/* Descrição Opcional */}
          <div className="space-y-1.5">
            <Label htmlFor="input-gauge-desc" className="text-xs font-bold text-slate-700">
              Descrição do Vínculo / Aplicação (Opcional)
            </Label>
            <Input
              id="input-gauge-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Bitola para perfil leve / acabamento liso"
              className="h-8 text-xs bg-white border-slate-300"
              data-testid="input-gauge-description"
            />
          </div>

          {/* Status Ativa / Inativa */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Status da Bitola</span>
              <span className="text-[10px] text-slate-500">
                Bitolas inativas deixam de ser sugeridas na programação, preservando histórico.
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200">
              <Switch
                id="switch-gauge-status"
                checked={active}
                onCheckedChange={setActive}
                data-testid="switch-gauge-status"
              />
              <Label
                htmlFor="switch-gauge-status"
                className={`text-xs font-bold cursor-pointer ${
                  active ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {active ? 'Ativa' : 'Inativa'}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            data-testid="btn-confirm-add-gauge"
            className="h-8 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white shadow-xs gap-1.5"
          >
            {isEditing ? (
              <>
                <Edit2 className="w-3.5 h-3.5" /> Atualizar bitola
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Vincular bitola
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LineFamilyAddGaugeModal

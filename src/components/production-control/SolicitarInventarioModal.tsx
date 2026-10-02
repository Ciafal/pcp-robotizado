import React, { useState } from 'react'
import { Boxes, Send, AlertTriangle, FileText, User, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ChecklistFechamentoItem } from '@/types/checklist-fechamento'

interface Props {
  open: boolean
  onClose: () => void
  item: ChecklistFechamentoItem | null
  onConfirm: (dados: {
    motivo: string
    deposito: string
    material: string
    lote: string
    quantidade: number
  }) => Promise<void>
}

export const SolicitarInventarioModal: React.FC<Props> = ({ open, onClose, item, onConfirm }) => {
  const [deposito, setDeposito] = useState(item?.deposito_sap || 'DP06')
  const [material, setMaterial] = useState('')
  const [lote, setLote] = useState('')
  const [quantidade, setQuantidade] = useState<number>(0)
  const [motivo, setMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  React.useEffect(() => {
    if (item && open) {
      setDeposito(item.deposito_sap !== 'N/A' ? item.deposito_sap : 'DP06')
      setMotivo(
        `Divergência identificada durante check-list de fechamento na atividade ${item.codigo} (${item.titulo}). Necessidade de conferência física pelo Estoque.`,
      )
    }
  }, [item, open])

  const handleSubmit = async () => {
    if (!motivo.trim()) return
    setSubmitting(true)
    try {
      await onConfirm({
        motivo: motivo.trim(),
        deposito,
        material: material.trim(),
        lote: lote.trim(),
        quantidade,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-[#004C97] rounded-lg">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Solicitar Inventário Físico
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Atividade {item.codigo} — {item.titulo}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-xs py-2">
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              A solicitação formal de inventário registrará uma ocorrência imediata e alertará a
              equipe de Estoque/PCP para reconciliação física antes do fechamento definitivo.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Depósito SAP</label>
              <Input
                type="text"
                value={deposito}
                onChange={(e) => setDeposito(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Quantidade Estimada (t)</label>
              <Input
                type="number"
                step="0.01"
                value={quantidade}
                onChange={(e) => setQuantidade(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Código do Material</label>
              <Input
                type="text"
                placeholder="Ex: ST930..."
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Número do Lote / Corrida</label>
              <Input
                type="text"
                placeholder="Ex: LOTE 2026A"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700">
              Motivo e Justificativa da Solicitação <span className="text-rose-500">*</span>
            </label>
            <Textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="text-xs bg-white"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={submitting || !motivo.trim()}
            onClick={handleSubmit}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-medium shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            Confirmar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

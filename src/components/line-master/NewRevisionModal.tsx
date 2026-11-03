import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { History, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'

interface NewRevisionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMatrix: LineBottleneckMatrixRecord | null
  onConfirm: (notes: string) => Promise<void>
  saving: boolean
}

export const NewRevisionModal: React.FC<NewRevisionModalProps> = ({
  open,
  onOpenChange,
  currentMatrix,
  onConfirm,
  saving,
}) => {
  const [notes, setNotes] = useState('')
  const currentVersion = currentMatrix?.version || 1
  const nextVersion = currentVersion + 1

  const handleConfirm = async () => {
    await onConfirm(notes.trim())
    setNotes('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-0 overflow-hidden border-slate-200">
        <div className="h-1 bg-[#004C97] w-full" />
        <DialogHeader className="p-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#004C97]/10 text-[#004C97]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                Abrir Nova Revisão da Matriz
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 leading-snug mt-0.5">
                Incrementa o identificador oficial de revisão e grava o evento na auditoria.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-3.5 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Matriz Selecionada
              </span>
              <strong className="text-slate-900 text-xs">
                {currentMatrix?.matrix_name ||
                  currentMatrix?.gauge_dimension ||
                  'Matriz de Referência'}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-xs font-bold text-slate-600 bg-white border-slate-300"
              >
                Rev.{currentVersion}
              </Badge>
              <ArrowRight className="w-3.5 h-3.5 text-[#004C97]" />
              <Badge className="font-mono text-xs font-bold bg-[#004C97] text-white">
                Rev.{nextVersion}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revision-notes" className="text-xs font-bold text-slate-800">
              Motivo da Nova Revisão / Justificativa Técnica
            </Label>
            <Textarea
              id="revision-notes"
              placeholder="Ex.: Reajuste da capacidade do Trem Contínuo de 85 para 90 t/h devido a nova calibração..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs bg-slate-50 border-slate-300 min-h-[80px]"
            />
            <span className="text-[11px] text-slate-500 block">
              Esta nota será gravada na trilha de auditoria oficial da Matriz.
            </span>
          </div>
        </div>

        <DialogFooter className="p-4 pt-2 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-8 text-xs border-slate-300 text-slate-700 font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={saving}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {saving ? 'Gravando...' : `Confirmar Rev.${nextVersion}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

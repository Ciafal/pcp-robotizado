import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalculationExplainPayload } from '@/types/mp-optimization'
import { Info, Calculator, CheckCircle, BookOpen } from 'lucide-react'

interface CalculationExplainerModalProps {
  isOpen: boolean
  onClose: () => void
  payload: CalculationExplainPayload | null
}

export const CalculationExplainerModal: React.FC<CalculationExplainerModalProps> = ({
  isOpen,
  onClose,
  payload,
}) => {
  if (!payload) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {payload.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Auditoria e explicabilidade determinística de cálculos do PCP Robotizado CIAFAL
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Caixa de Fórmula */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#004C97]" />
              Fórmula Oficial Aplicada
            </div>
            <code className="text-sm font-mono font-semibold text-[#004C97] block bg-white p-2.5 rounded border border-slate-200/80">
              {payload.formula}
            </code>
          </div>

          {/* Variáveis e Valores de Entrada */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Parâmetros e Variáveis de Entrada
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(payload.variables).map(([key, val]) => (
                <div
                  key={key}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded flex justify-between items-center"
                >
                  <span className="text-slate-600">{key}:</span>
                  <span className="font-bold text-slate-900 font-mono">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Passo a Passo */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Demonstração Passo a Passo
            </h4>
            <div className="space-y-2">
              {payload.stepByStep.map((step, idx) => (
                <div
                  key={idx}
                  className="text-xs text-slate-700 bg-white border border-slate-200 p-2.5 rounded flex items-start gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-[#004C97] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resultado Final Consolidado */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-800 uppercase block">
                Resultado Auditado
              </span>
              <span className="text-xl font-black text-emerald-700 font-mono">
                {payload.resultFormatted}
              </span>
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 py-1">
              <CheckCircle className="w-3.5 h-3.5" />
              100% Determinístico
            </Badge>
          </div>

          {/* Referências e Normas */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong>Referência Oficial:</strong>{' '}
                {payload.regulatoryStandardRef || 'Diretrizes Técnicas PCP CIAFAL'}
              </span>
            </div>
            {payload.excelLegacyRef && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="font-semibold text-slate-500">Correspondência Excel:</span>
                <span>{payload.excelLegacyRef}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs px-4"
          >
            Fechar Auditoria
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

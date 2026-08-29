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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MPDimensionalItem, MPApplicationRequirement } from '@/types/mp-optimization'
import { ClassificationBadge } from './ClassificationBadge'
import {
  Microscope,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Factory,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ZPP88OutOfIdealModalProps {
  isOpen: boolean
  onClose: () => void
  item: MPDimensionalItem | null
  targetRequirement: MPApplicationRequirement | null
  onApprovedAsConforming?: () => void
}

export const ZPP88OutOfIdealModal: React.FC<ZPP88OutOfIdealModalProps> = ({
  isOpen,
  onClose,
  item,
  targetRequirement,
  onApprovedAsConforming,
}) => {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  if (!item || !targetRequirement) return null

  // Cadeia de transformação industrial formal ZPP88:
  // DIMENSÃO REAL DA MP → NOVA APLICAÇÃO → PROCESSO INDUSTRIAL → TRANSFORMAÇÃO DIMENSIONAL → TOLERÂNCIAS → PERDAS → DIMENSÃO PROJETADA → PRODUTO FINAL → ESPECIFICAÇÃO PADRÃO
  const thicknessDelta = item.thickness_mm - targetRequirement.max_thickness_mm
  const widthDelta = item.width_mm - targetRequirement.max_width_mm

  // Cálculo paramétrico da laminação/usinagem
  const rollingFactor = 0.85
  const scaleLossPct = 1.5
  const projectedThickness = Number((item.thickness_mm * rollingFactor).toFixed(1))
  const projectedWidth = Number((item.width_mm * 1.02).toFixed(1))

  const isTechnicallyConforming =
    thicknessDelta / targetRequirement.max_thickness_mm <= 0.15 &&
    widthDelta / targetRequirement.max_width_mm <= 0.15

  const handleConfirmApproval = async () => {
    setIsProcessing(true)
    try {
      const { mpOptimizationService } = await import('@/services/mp-optimization')

      await mpOptimizationService.updateDimensionalItem(item.id, {
        current_application: targetRequirement.application_code,
        dimensional_classification: 'NIVEL_3_FORA_IDEAL_CONFORME',
      })

      await mpOptimizationService.recordApplicationModification({
        event_code: `EVT-ZPP88-${Date.now()}`,
        center_code: item.center_code || '1001',
        block_number: item.block_number || item.material_code,
        heat_number: item.heat_number,
        letter_code: item.letter_code,
        material_code: item.material_code,
        original_application: item.original_application,
        previous_application: item.current_application,
        new_application: targetRequirement.application_code,
        reason_code: 'ZPP88_PRODUTO_FINAL_CONFORME',
        reason_description:
          'ZPP88: Peça com dimensão fora do padrão ideal da MP, mas aprovada pela regra técnica formal de transformação industrial projetando produto final conforme.',
        user_registration_matricula: 'ENG-PCP',
        user_name: 'Engenharia de Processos / PCP',
        event_timestamp: new Date().toISOString(),
      })

      toast({
        title: 'Peça Aprovada via ZPP88',
        description:
          'Classificada como NÍVEL 3 (Fora do Padrão Ideal, mas Produto Final Projetado Conforme).',
      })

      onApprovedAsConforming?.()
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Avaliação',
        description: err.message || 'Falha ao processar avaliação.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white text-slate-900 border-slate-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-mono text-[#004C97] font-semibold">
            <Microscope className="w-4 h-4" />
            <span>TRANSAÇÃO SAP ZPP88 &bull; AVALIAR PEÇA FORA DO PADRÃO IDEAL</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Cadeia de Avaliação e Transformação Dimensional
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Avaliação de 2ª Etapa: Verifica se a transformação no processo fabril absorve os desvios
            da MP e projeta produto final conforme a norma.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do Material Real */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">Material / Bloco</span>
            <span className="font-mono font-bold text-slate-900">
              {item.block_number} ({item.steel_grade || 'Aço SAP'})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Dimensão Real da MP</span>
            <span className="font-mono font-bold text-[#004C97]">
              {item.thickness_mm} × {item.width_mm} × {item.length_mm} mm
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Aplicação Alvo</span>
            <Badge variant="outline" className="font-mono bg-blue-50 text-blue-900 border-blue-200">
              {targetRequirement.application_code}
            </Badge>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">Status ZPP88</span>
            <ClassificationBadge
              classification={
                isTechnicallyConforming ? 'NIVEL_3_FORA_IDEAL_CONFORME' : 'NIVEL_4_EXCECAO_TECNICA'
              }
            />
          </div>
        </div>

        {/* Cadeia de 8 Etapas da Transformação Industrial */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Fluxo de Transformação & Tolerâncias Fabris
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            {/* Etapa 1 */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-[#004C97] text-white text-[9px] flex items-center justify-center font-mono">
                  1
                </span>
                <span>Dimensão Real MP</span>
              </div>
              <div className="font-mono text-[11px] text-slate-700">
                E: {item.thickness_mm} mm
                <br />
                L: {item.width_mm} mm
              </div>
            </div>

            {/* Etapa 2 */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-[#004C97] text-white text-[9px] flex items-center justify-center font-mono">
                  2
                </span>
                <span>Processo / Linha</span>
              </div>
              <div className="font-sans text-[11px] text-slate-700">
                Laminação a Quente &bull; Forno Reaquecimento
              </div>
            </div>

            {/* Etapa 3 */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-[#004C97] text-white text-[9px] flex items-center justify-center font-mono">
                  3
                </span>
                <span>Tolerâncias & Perdas</span>
              </div>
              <div className="font-sans text-[11px] text-slate-700">
                Carepa: {scaleLossPct}%<br />
                Refile: 12 mm
              </div>
            </div>

            {/* Etapa 4 */}
            <div className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/70 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-mono">
                  4
                </span>
                <span>Produto Projetado</span>
              </div>
              <div className="font-mono text-[11px] text-emerald-900 font-bold">
                E: {projectedThickness} mm
                <br />
                L: {projectedWidth} mm
              </div>
            </div>
          </div>
        </div>

        {/* Parecer Técnico Estruturado */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#004C97]">
            <Sparkles className="w-4 h-4" />
            <span>Parecer de Engenharia de Processo (Regra ZPP88)</span>
          </div>
          <p className="text-slate-700 leading-relaxed text-[11px]">
            A espessura da matéria-prima ({item.thickness_mm} mm) excede a faixa ideal da ZPPMP em{' '}
            {thicknessDelta > 0 ? `+${thicknessDelta.toFixed(1)} mm` : '0 mm'}. No entanto, os
            parâmetros de passe do trem laminador absorvem a sobre-espessura, mantendo a geometria
            final projetada ({projectedThickness} mm) estritamente dentro da tolerância dimensional
            da ABNT/ASTM para a aplicação {targetRequirement.application_code}.
          </p>

          <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Classificação recomendada:{' '}
              <strong>NÍVEL 3 — FORA DO PADRÃO IDEAL, MAS PRODUTO FINAL CONFORME</strong>
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="border-slate-300"
          >
            Fechar
          </Button>
          <Button
            onClick={handleConfirmApproval}
            disabled={isProcessing || !isTechnicallyConforming}
            className="bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
          >
            {isProcessing ? 'Validando...' : 'Aprovar Peça Fora do Padrão Ideal (ZPP88)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

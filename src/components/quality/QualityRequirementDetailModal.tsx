import React from 'react'
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  FileCheck,
  Microscope,
  Building2,
  Calendar,
  Layers,
  X,
  AlertOctagon,
} from 'lucide-react'
import { QualityInspectionDemand, ProductQualityRequirement } from '@/types/product-quality'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface QualityRequirementDetailModalProps {
  isOpen: boolean
  onClose: () => void
  productCode: string
  productName: string
  productionType?: 'MTS' | 'MTO'
  demandType: 'ULTRASSOM' | 'ENSAIOS_MECANICOS' | 'STATUS_QUALIDADE'
  demand?: QualityInspectionDemand | null
  requirement?: ProductQualityRequirement | null
  onOpenRequirementSheet?: () => void
}

export const QualityRequirementDetailModal: React.FC<QualityRequirementDetailModalProps> = ({
  isOpen,
  onClose,
  productCode,
  productName,
  productionType = 'MTS',
  demandType,
  demand,
  requirement,
  onOpenRequirementSheet,
}) => {
  if (!isOpen) return null

  const isUs = demandType === 'ULTRASSOM'
  const isEm = demandType === 'ENSAIOS_MECANICOS'
  const isMto = productionType === 'MTO'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900 shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-[#004C97] text-white p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20">
              {isUs ? (
                <Sparkles className="w-5 h-5 text-cyan-300" />
              ) : isEm ? (
                <Award className="w-5 h-5 text-amber-300" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-900 text-cyan-200 text-[10px] font-mono border-blue-700">
                  {isUs
                    ? 'ENSAIO DE ULTRASSOM (US)'
                    : isEm
                      ? 'ENSAIOS MECÂNICOS (EM)'
                      : 'STATUS DE QUALIDADE'}
                </Badge>
                <Badge
                  className={`text-[10px] font-bold ${
                    isMto ? 'bg-purple-900 text-purple-200' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {isMto ? 'MTO' : 'MTS'}
                </Badge>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">{productName}</h3>
              <p className="text-[11px] text-blue-100 font-mono">Código: {productCode}</p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-4 text-xs text-slate-800">
          {/* Status Atual da Demanda */}
          {demand ? (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">
                  Demanda de Qualidade:{' '}
                  <strong className="font-mono text-[#004C97]">{demand.demand_code}</strong>
                </span>
                <Badge
                  className={`text-[10px] font-bold ${
                    demand.status === 'APROVADA' || demand.status === 'LIBERADA'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : demand.status === 'REPROVADA'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : demand.status === 'EM_INSPECAO'
                          ? 'bg-blue-100 text-blue-900 border-blue-300 animate-pulse'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {demand.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1">
                <div>
                  OP / Ordem: <strong>{demand.production_order_number}</strong>
                </div>
                <div>
                  Linha: <strong>{demand.line_code}</strong>
                </div>
                <div>
                  Data Prevista Produção: <strong>{demand.planned_production_date}</strong>
                </div>
                <div>
                  Data Prevista Inspeção: <strong>{demand.planned_inspection_date}</strong>
                </div>
                <div>
                  Equipamento / Lab:{' '}
                  <strong>{demand.laboratory_equipment || 'Lab Central DIV'}</strong>
                </div>
                <div>
                  Amostras: <strong>{demand.sample_count || 3} CPs</strong>
                </div>
              </div>

              {demand.is_blocking_release && (
                <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 p-2 rounded border border-rose-200 font-medium text-[11px]">
                  <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  <span>Ensaio bloqueante para liberação física e faturamento da Ordem.</span>
                </div>
              )}

              {demand.result_notes && (
                <div className="bg-white p-2 rounded border border-slate-200 text-[11px]">
                  <span className="font-bold block text-slate-500">Parecer Técnico:</span>
                  <span>{demand.result_notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 space-y-1">
              <span className="font-bold text-slate-900 block text-xs">
                Parâmetro Mestre de Qualidade:
              </span>
              <div>
                Exige Ultrassom:{' '}
                <strong>{requirement?.ultrasound_requirement || 'CONDICIONAL'}</strong>
              </div>
              <div>
                Exige Ensaios Mecânicos:{' '}
                <strong>{requirement?.mechanical_test_requirement || 'SIM'}</strong>
              </div>
              <div>
                Normas: <strong>{requirement?.applicable_standards || 'ABNT NBR / ASTM'}</strong>
              </div>
            </div>
          )}

          {/* Regras e Condições Técnicas */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-slate-700 space-y-1.5 text-[11px]">
            <span className="font-bold text-slate-900 block text-xs flex items-center gap-1.5">
              <Microscope className="w-3.5 h-3.5 text-[#004C97]" /> Especificação Técnica & Critério
              de Aceite:
            </span>
            <p>
              {isUs
                ? requirement?.ultrasound_condition_rule ||
                  'Ensaio 100% de solda longitudinal por ultrassom feixe angular conforme norma ASME / ISO.'
                : requirement?.mechanical_test_condition_rule ||
                  'Ensaios de tração e dobramento obrigatórios para atendimento à norma técnica de conformação.'}
            </p>
          </div>
        </div>

        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {isMto && onOpenRequirementSheet ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose()
                onOpenRequirementSheet()
              }}
              className="border-[#004C97] text-[#004C97] hover:bg-blue-50 text-xs font-semibold gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5" /> Abrir Ficha Completa MTO
            </Button>
          ) : (
            <div />
          )}

          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default QualityRequirementDetailModal

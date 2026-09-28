/**
 * Modal / Drawer de Detalhamento da Linha da Grade da Visão Diária
 * CIAFAL PCP Robotizado
 *
 * Seções Obrigatórias (Requisito 10):
 * - Identificação: Data, Centro, Linha, Turno, Turma, Ordem de Produção, Código do material, Produto/material
 * - Planejado: Volume (t), Cadência (t/h), Horas, Início, Fim
 * - Realizado: Volume (t), Cadência (t/h), Horas, Início, Fim
 * - Desvio: Toneladas, Percentual, Tempo, Situação/status
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DailyDeviationItem } from '@/types/daily-deviation'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'
import {
  Calendar,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Info,
  Building2,
} from 'lucide-react'

interface DailyDeviationDetailModalProps {
  item: DailyDeviationItem | null
  open: boolean
  onClose: () => void
}

export const DailyDeviationDetailModal: React.FC<DailyDeviationDetailModalProps> = ({
  item,
  open,
  onClose,
}) => {
  if (!item) return null

  // Helper de badges visuais e acessíveis
  const renderSituationBadge = () => {
    switch (item.situation) {
      case 'DENTRO':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dentro da programação</span>
          </Badge>
        )
      case 'ABAIXO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            <span>Abaixo da programação</span>
          </Badge>
        )
      case 'ACIMA':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
            <span>Acima da programação</span>
          </Badge>
        )
      case 'PARADA':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
            <span>Parada Operacional</span>
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>Não iniciado</span>
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden shadow-xl border-slate-200 max-h-[90vh] flex flex-col">
        <DialogHeader className="bg-gradient-to-r from-[#004C97] to-[#003870] text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-0 text-xs font-mono">
                Seq. #{item.sequence}
              </Badge>
              {renderSituationBadge()}
            </div>
            <span className="text-xs text-white/80 font-medium">
              Análise de Desvios &bull; Visão Diária
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-white mt-2 flex items-center gap-2">
            <Layers className="w-5 h-5 text-white/90" />
            {item.materialDescription}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/80">
            Código: <span className="font-mono font-bold text-white">{item.materialCode}</span>{' '}
            &bull; {item.dayOfWeek}, {item.dateDisplay} &bull; {item.shiftDisplay}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* SEÇÃO 1: IDENTIFICAÇÃO */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <Building2 className="w-4 h-4 text-[#004C97]" />
              <span>1. Identificação Operacional</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Data</span>
                <span className="font-medium text-slate-900">{item.dateDisplay}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Centro SAP
                </span>
                <span className="font-medium text-slate-900">
                  {item.plantCode} &bull; {item.plantName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Linha PCP
                </span>
                <span className="font-medium text-slate-900">
                  {item.lineCode} &bull; {item.lineName}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Turno / Turma
                </span>
                <span className="font-medium text-slate-900">
                  {item.shiftDisplay} ({item.crewName})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Ordem de Produção (OP)
                </span>
                <div className="mt-0.5">
                  {item.hasRealProductionOrder ? (
                    <span className="font-mono font-bold text-[#004C97] text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                      {item.productionOrder}
                    </span>
                  ) : (
                    <span className="text-slate-500 italic bg-slate-100 px-2 py-0.5 rounded inline-block">
                      {item.productionOrder}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Material / Aço
                </span>
                <span className="font-semibold text-slate-800">
                  {item.materialCode} {item.steelGrade ? `(${item.steelGrade})` : ''}
                </span>
                {item.dimensions && (
                  <span className="text-[11px] text-slate-500 block">
                    Dimensões: {item.dimensions}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÕES 2 & 3: PLANEJADO vs REALIZADO (Lado a Lado) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 2. Planejado */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-blue-200 pb-1.5 font-bold text-[#004C97]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>2. Planejado</span>
                </div>
                <Badge className="bg-[#004C97] text-white text-[10px]">PCP Oficial</Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Volume Programado:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatNumberPTBR(item.plannedVolumeTons, 1)} t
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Cadência Planejada:</span>
                  <span className="font-mono text-slate-800">
                    {formatNumberPTBR(item.plannedRateTh, 1)} t/h
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Horas Programadas:</span>
                  <span className="font-mono text-slate-800">
                    {formatNumberPTBR(item.plannedHours, 2)} h
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-blue-100">
                  <span className="text-slate-600">Início Programado:</span>
                  <span className="font-mono text-slate-700">{item.plannedStart || '--:--'}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Fim Programado:</span>
                  <span className="font-mono text-slate-700">{item.plannedEnd || '--:--'}</span>
                </div>
              </div>
            </div>

            {/* 3. Realizado */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5 font-bold text-emerald-800">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>3. Realizado (MES)</span>
                </div>
                {item.hasMesData ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">Apontado</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 text-[10px]">
                    Pendente
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Volume Realizado:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    {item.realizedVolumeTons !== null
                      ? `${formatNumberPTBR(item.realizedVolumeTons, 1)} t`
                      : 'Dado ainda não disponível pela integração'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Cadência Real:</span>
                  <span className="font-mono text-slate-800">
                    {item.realizedRateTh !== null
                      ? `${formatNumberPTBR(item.realizedRateTh, 1)} t/h`
                      : 'Dado ainda não disponível pela integração'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Horas Realizadas:</span>
                  <span className="font-mono text-slate-800">
                    {item.realizedHours !== null
                      ? `${formatNumberPTBR(item.realizedHours, 2)} h`
                      : 'Dado ainda não disponível pela integração'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-emerald-100">
                  <span className="text-slate-600">Início Real:</span>
                  <span className="font-mono text-slate-700">
                    {item.realStart || 'Dado ainda não disponível pela integração'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-600">Fim Real:</span>
                  <span className="font-mono text-slate-700">
                    {item.realEnd || 'Dado ainda não disponível pela integração'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: ANÁLISE DE DESVIO */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-bold text-slate-900">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#004C97]" />
                <span>4. Análise de Desvio & Resultado</span>
              </div>
              {renderSituationBadge()}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Desvio em Toneladas
                </span>
                <span
                  className={`text-base font-black font-mono mt-0.5 block ${
                    item.deviationTons === null
                      ? 'text-slate-400 text-xs'
                      : item.deviationTons < 0
                        ? 'text-rose-600'
                        : item.deviationTons > 0
                          ? 'text-emerald-700'
                          : 'text-slate-800'
                  }`}
                >
                  {item.deviationTons !== null
                    ? `${item.deviationTons > 0 ? '+' : ''}${formatNumberPTBR(item.deviationTons, 1)} t`
                    : 'Dado ainda não disponível pela integração'}
                </span>
                <span className="text-[9px] text-slate-400">Realizado &minus; Programado</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Desvio Percentual
                </span>
                <span
                  className={`text-base font-black font-mono mt-0.5 block ${
                    item.deviationPct === null
                      ? 'text-slate-400 text-xs'
                      : item.deviationPct < 0
                        ? 'text-rose-600'
                        : item.deviationPct > 0
                          ? 'text-emerald-700'
                          : 'text-slate-800'
                  }`}
                >
                  {item.deviationPct !== null
                    ? `${item.deviationPct > 0 ? '+' : ''}${formatNumberPTBR(item.deviationPct, 1)} %`
                    : 'Dado ainda não disponível pela integração'}
                </span>
                <span className="text-[9px] text-slate-400">Base programada</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Variação de Tempo
                </span>
                <span className="text-sm font-black font-mono text-slate-800 mt-0.5 block">
                  {item.realizedHours !== null && item.plannedHours > 0
                    ? `${formatNumberPTBR(item.realizedHours - item.plannedHours, 2)} h`
                    : 'Dado ainda não disponível pela integração'}
                </span>
                <span className="text-[9px] text-slate-400">Horas Reais &minus; Horas Prog.</span>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Situação Operacional
                </span>
                <span className="text-xs font-bold text-slate-900 mt-1 block">
                  {item.statusDisplay}
                </span>
                <span className="text-[9px] text-slate-400">{item.situationLabel}</span>
              </div>
            </div>

            {item.notes && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900 mt-2 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-[11px]">Observações / Causa Registrada:</strong>
                  <span>{item.notes}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold px-4"
          >
            Fechar Detalhamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default DailyDeviationDetailModal

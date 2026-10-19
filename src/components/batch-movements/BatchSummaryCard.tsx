import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BatchSummary } from '@/types/batch-movements'
import {
  Printer,
  Box,
  Layers,
  Building2,
  MapPin,
  Scale,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface BatchSummaryCardProps {
  summary: BatchSummary
  onOpenReprintModal: () => void
  canReprint: boolean
}

export const BatchSummaryCard: React.FC<BatchSummaryCardProps> = ({
  summary,
  onOpenReprintModal,
  canReprint,
}) => {
  const [showAllMaterials, setShowAllMaterials] = useState(false)

  // Formatação pt-BR padrão
  const formatNumber = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const hasMultipleMaterials =
    summary.materiais_relacionados && summary.materiais_relacionados.length > 1

  return (
    <Card className="border border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 to-white">
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#004C97] text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Lote
                </span>
                <span className="text-xl font-extrabold text-[#004C97] font-mono tracking-tight">
                  {summary.lote}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2 py-0.5 ${
                    summary.status_lote === 'Ativo'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : summary.status_lote === 'Esgotado'
                        ? 'bg-slate-100 text-slate-600 border-slate-300'
                        : summary.status_lote === 'Em Trânsito'
                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                          : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  {summary.status_lote}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                <span className="font-bold text-slate-800">{summary.material_code}</span> —{' '}
                {summary.material_desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={onOpenReprintModal}
              disabled={!canReprint}
              className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold h-10 px-4 shadow-sm flex items-center gap-2"
              title={
                canReprint ? 'Emitir 2ª via de etiqueta oficial' : 'Sem permissão para reimpressão'
              }
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir 2ª via de etiqueta</span>
            </Button>
          </div>
        </div>

        {/* Alerta de Múltiplos Materiais (se houver) */}
        {hasMultipleMaterials && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  Atenção: Este lote possui movimentações vinculadas a mais de um material (
                  {summary.materiais_relacionados.length} materiais relacionados).
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllMaterials(!showAllMaterials)}
                className="text-amber-800 hover:bg-amber-100 text-xs h-7 px-2"
              >
                {showAllMaterials ? (
                  <span className="flex items-center gap-1">
                    Recolher <ChevronUp className="w-3.5 h-3.5" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    Ver materiais <ChevronDown className="w-3.5 h-3.5" />
                  </span>
                )}
              </Button>
            </div>

            {showAllMaterials && (
              <div className="mt-1 pt-2 border-t border-amber-200 space-y-1">
                {summary.materiais_relacionados.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] bg-white/70 p-1.5 rounded"
                  >
                    <span className="font-bold text-slate-800">
                      {m.code} — {m.desc || 'Material'}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {m.count} movimentação(ões)
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grade de Indicadores Principais */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Card 1: Centro & Depósito */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
              <Building2 className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Centro / Depósito</span>
            </div>
            <div className="text-sm font-bold text-slate-800 flex items-center gap-1">
              <span>{summary.centro}</span>
              <span className="text-slate-400">/</span>
              <span className="text-sky-700">{summary.deposito_atual}</span>
            </div>
          </div>

          {/* Card 2: Saldo Atual */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
              <Scale className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saldo Atual</span>
            </div>
            <div className="text-sm font-extrabold text-emerald-700">
              {formatNumber(summary.saldo_atual)}{' '}
              <span className="text-[10px] font-medium text-slate-500">
                {summary.unidade_medida}
              </span>
            </div>
          </div>

          {/* Card 3: Quantidade Inicial */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Qtd Inicial</span>
            </div>
            <div className="text-sm font-bold text-slate-700">
              {formatNumber(summary.quantidade_inicial)}{' '}
              <span className="text-[10px] font-medium text-slate-500">
                {summary.unidade_medida}
              </span>
            </div>
          </div>

          {/* Card 4: Quantidade Movimentada */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>Qtd Movimentada</span>
            </div>
            <div className="text-sm font-bold text-indigo-700">
              {formatNumber(summary.quantidade_movimentada)}{' '}
              <span className="text-[10px] font-medium text-slate-500">
                {summary.unidade_medida}
              </span>
            </div>
          </div>

          {/* Card 5: Última Movimentação */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Última Movimentação</span>
            </div>
            <div
              className="text-xs font-bold text-slate-800 truncate"
              title={summary.ultima_movimentacao_data_hora}
            >
              {summary.ultima_movimentacao_data_hora}
            </div>
          </div>

          {/* Card 6: Origem da Última Movimentação */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium mb-1">
              <Box className="w-3.5 h-3.5 text-purple-600" />
              <span>Origem Última Mov.</span>
            </div>
            <div>
              <Badge
                variant="outline"
                className={`text-[11px] font-bold ${
                  summary.ultima_movimentacao_origem === 'SAP'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : summary.ultima_movimentacao_origem === 'RFID'
                      ? 'bg-purple-50 text-purple-700 border-purple-300'
                      : 'bg-slate-50 text-slate-600 border-slate-300'
                }`}
              >
                {summary.ultima_movimentacao_origem}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

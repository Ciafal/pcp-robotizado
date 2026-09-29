import React, { useState } from 'react'
import {
  Factory,
  Gauge,
  Sparkles,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import { cn } from '@/lib/utils'

export interface LineEfficiencyItem {
  id: string
  lineCode: string
  lineName: string
  plantCode: string
  companyCode: string
  nominalCapacityTonsPerDay: number
  plannedTons: number
  realizedTons: number
  adherencePct: number
  oeePct: number
  availabilityPct: number
  performancePct: number
  qualityPct: number
  status: 'DENTRO_ESPERADO' | 'ATENCAO' | 'CRITICO' | string
}

interface LineEfficiencyCardsViewProps {
  lines: LineEfficiencyItem[]
  onRunAiAnalysis?: (line: LineEfficiencyItem) => void
}

export const LineEfficiencyCardsView: React.FC<LineEfficiencyCardsViewProps> = ({
  lines,
  onRunAiAnalysis,
}) => {
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({})

  const toggleLine = (id: string) => {
    setExpandedLines((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  if (lines.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2 shadow-2xs">
        <Factory className="w-8 h-8 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">
          Nenhuma linha produtiva encontrada para os filtros selecionados
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Tente alterar a planta ou o período de análise.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {lines.map((line) => {
        const isCritical = line.status === 'CRITICO' || line.adherencePct < 70
        const isWarning =
          line.status === 'ATENCAO' || (line.adherencePct >= 70 && line.adherencePct < 95)
        const isExpanded = !!expandedLines[line.id]

        return (
          <Card
            key={line.id}
            className={cn(
              'bg-white border border-slate-200 transition-all hover:shadow-sm rounded-xl overflow-hidden shadow-2xs',
              isCritical ? 'border-rose-300' : isWarning ? 'border-amber-300' : 'border-slate-200',
            )}
          >
            {/* Header com Identidade CIAFAL Clara */}
            <CardHeader className="p-4 pb-2 bg-slate-50/60 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-[#004C97] font-bold">
                    <span>{line.plantCode}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-700">{line.lineCode}</span>
                  </div>
                  <h4
                    className="text-sm font-bold text-slate-900 leading-snug mt-1 break-words"
                    title={line.lineName}
                  >
                    {line.lineName}
                  </h4>
                </div>

                <div className="shrink-0">
                  {isCritical ? (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                      Crítico
                    </Badge>
                  ) : isWarning ? (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">
                      Atenção Preventiva
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                      Dentro do Esperado
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-3 space-y-3">
              {/* OEE Geral da Linha */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">OEE Realizado:</span>
                  <OeeInteractiveValue
                    value={line.oeePct}
                    context={{
                      lineCode: line.lineCode,
                      period: 'SHIFT',
                    }}
                    className={cn(
                      'font-bold cursor-pointer font-mono text-sm',
                      isCritical
                        ? 'text-rose-600'
                        : isWarning
                          ? 'text-amber-600'
                          : 'text-emerald-700',
                    )}
                  />
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                  <div
                    className={cn(
                      'h-full transition-all',
                      isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500',
                    )}
                    style={{ width: `${Math.min(100, line.oeePct)}%` }}
                  />
                </div>
              </div>

              {/* Métricas Principais: Previsto x Realizado x Aderência */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Previsto</span>
                  <span className="text-slate-800 font-semibold">
                    {formatTonsPtBr(line.plannedTons, 1, '—')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Realizado</span>
                  <span className="text-slate-900 font-bold">
                    {formatTonsPtBr(line.realizedTons, 1, '—')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Aderência</span>
                  <span
                    className={cn(
                      'font-bold',
                      line.adherencePct >= 95
                        ? 'text-emerald-700'
                        : line.adherencePct >= 85
                          ? 'text-amber-700'
                          : 'text-rose-700',
                    )}
                  >
                    {formatPercentPtBr(line.adherencePct, 1)}
                  </span>
                </div>
              </div>

              {/* Detalhes Expansíveis: Disponibilidade, Performance, Qualidade e Capacidade */}
              {isExpanded && (
                <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-2.5 space-y-2 text-xs font-mono animate-fadeIn">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Disponibilidade</span>
                      <span className="text-slate-800 font-semibold">
                        {formatPercentPtBr(line.availabilityPct, 1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Performance</span>
                      <span className="text-slate-800 font-semibold">
                        {formatPercentPtBr(line.performancePct, 1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Qualidade</span>
                      <span className="text-slate-800 font-semibold">
                        {formatPercentPtBr(line.qualityPct, 1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 font-sans">
                    Capacidade nominal instalada:{' '}
                    {formatTonsPtBr(line.nominalCapacityTonsPerDay, 1)}/dia.
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleLine(line.id)}
                  className="flex-1 h-8 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium gap-1"
                >
                  {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </Button>

                {onRunAiAnalysis && (
                  <Button
                    size="sm"
                    onClick={() => onRunAiAnalysis(line)}
                    className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Analisar IA</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

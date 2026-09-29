import React, { useState, useMemo } from 'react'
import { CenterEfficiencyRow, CenterOrderDetail } from '@/services/efficiency-center-service'
import { getStatusVisual, CenterOperationalStatus } from '@/lib/pcp/efficiency-status-rules'
import { formatTonsPtBr, formatPercentPtBr, formatDateTimePTBR } from '@/lib/formatters-ptbr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Factory,
  Layers,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'

interface EfficiencyCenterHierarchyViewProps {
  rows: CenterEfficiencyRow[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  activeProgramacaoId?: string | null
  activeProgramacaoVersion?: number | null
}

export const EfficiencyCenterHierarchyView: React.FC<EfficiencyCenterHierarchyViewProps> = ({
  rows,
  loading = false,
  error = null,
  onRetry,
  activeProgramacaoId,
  activeProgramacaoVersion,
}) => {
  const [expandedCenters, setExpandedCenters] = useState<Record<string, boolean>>({})
  const [showAnalyticalTableModal, setShowAnalyticalTableModal] = useState(false)

  const toggleCenter = (centerKey: string) => {
    setExpandedCenters((prev) => ({
      ...prev,
      [centerKey]: !prev[centerKey],
    }))
  }

  // Agrupamento Planta -> Linha -> Centros
  const groupedHierarchy = useMemo(() => {
    const plantsMap: Record<
      string,
      {
        plantCode: string
        companyCode: string
        totalPlannedTons: number
        totalRealizedTons: number
        lines: Record<
          string,
          {
            lineCode: string
            lineName: string
            totalPlannedTons: number
            totalRealizedTons: number
            centers: CenterEfficiencyRow[]
          }
        >
      }
    > = {}

    rows.forEach((row) => {
      const plantKey = row.plantCode || 'DIV'
      if (!plantsMap[plantKey]) {
        plantsMap[plantKey] = {
          plantCode: plantKey,
          companyCode: row.companyCode || 'CIAFAL',
          totalPlannedTons: 0,
          totalRealizedTons: 0,
          lines: {},
        }
      }

      const plantGroup = plantsMap[plantKey]
      plantGroup.totalPlannedTons += row.plannedQuantityTons || 0
      plantGroup.totalRealizedTons += row.realizedQuantityTons || 0

      const lineKey = row.lineCode || 'L1'
      if (!plantGroup.lines[lineKey]) {
        plantGroup.lines[lineKey] = {
          lineCode: lineKey,
          lineName: row.lineName || lineKey,
          totalPlannedTons: 0,
          totalRealizedTons: 0,
          centers: [],
        }
      }

      const lineGroup = plantGroup.lines[lineKey]
      lineGroup.totalPlannedTons += row.plannedQuantityTons || 0
      lineGroup.totalRealizedTons += row.realizedQuantityTons || 0
      lineGroup.centers.push(row)
    })

    return Object.values(plantsMap).map((p) => ({
      ...p,
      lines: Object.values(p.lines),
    }))
  }, [rows])

  // Formatação segura de datas
  const formatDateTimeSafe = (dt: string | null | undefined) => {
    if (!dt) return '—'
    if (dt.includes('T') || dt.includes('-')) {
      const formatted = formatDateTimePTBR(dt)
      return formatted !== '-' ? formatted : dt
    }
    return dt
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-rose-900">
            Não foi possível carregar a eficiência dos centros
          </h4>
          <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
        </div>
        {onRetry && (
          <Button
            size="sm"
            onClick={onRetry}
            className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tentar novamente
          </Button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2 shadow-2xs">
        <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">
          Nenhum dado disponível para o período selecionado.
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Nenhum apontamento MES 4.0 ou programação oficial da Montagem Semanal encontrada no
          período.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de identificação da fonte de Programação Oficial */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-800">
            Hierarquia Operacional: Planta &rarr; Linha &rarr; Centro de Trabalho
          </span>
          {activeProgramacaoId && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono text-[#004C97] border-[#004C97]/30 bg-[#004C97]/5"
            >
              Programação: {activeProgramacaoId} (v{activeProgramacaoVersion || 1})
            </Badge>
          )}
        </div>
        <span className="text-[11px] text-slate-500 font-mono">Montagem Semanal vs MES 4.0</span>
      </div>

      {/* Árvore de Agrupamento: Planta -> Linha -> Centro */}
      <div className="space-y-4">
        {groupedHierarchy.map((plantGroup) => {
          const plantAdherence =
            plantGroup.totalPlannedTons > 0
              ? (plantGroup.totalRealizedTons / plantGroup.totalPlannedTons) * 100
              : null

          return (
            <div
              key={plantGroup.plantCode}
              className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden"
            >
              {/* Cabeçalho da Planta */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {plantGroup.companyCode} &bull; Planta {plantGroup.plantCode}
                      </h4>
                      <Badge variant="outline" className="text-[10px] text-slate-600 bg-white">
                        {plantGroup.lines.length}{' '}
                        {plantGroup.lines.length === 1 ? 'linha' : 'linhas'}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Volume total da planta no período
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Previsto</span>
                    <span className="font-semibold text-slate-800">
                      {formatTonsPtBr(plantGroup.totalPlannedTons, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Realizado</span>
                    <span className="font-bold text-slate-900">
                      {formatTonsPtBr(plantGroup.totalRealizedTons, 2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Aderência</span>
                    <span
                      className={`font-bold ${
                        plantAdherence !== null && plantAdherence >= 95
                          ? 'text-emerald-700'
                          : plantAdherence !== null && plantAdherence >= 85
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {plantAdherence !== null ? formatPercentPtBr(plantAdherence, 1) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linhas da Planta */}
              <div className="p-3 sm:p-4 space-y-3">
                {plantGroup.lines.map((lineGroup) => (
                  <div
                    key={lineGroup.lineCode}
                    className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2.5"
                  >
                    {/* Barra de Linha Produtiva */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4 text-[#004C97]" />
                        <span className="font-bold text-xs text-slate-800">
                          Linha {lineGroup.lineCode} &bull; {lineGroup.lineName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ({lineGroup.centers.length}{' '}
                          {lineGroup.centers.length === 1 ? 'centro' : 'centros'})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-slate-500">
                          Previsto:{' '}
                          <strong className="text-slate-700">
                            {formatTonsPtBr(lineGroup.totalPlannedTons, 2)}
                          </strong>
                        </span>
                        <span className="text-slate-500">
                          Realizado:{' '}
                          <strong className="text-slate-900">
                            {formatTonsPtBr(lineGroup.totalRealizedTons, 2)}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Cards Resumidos Expansíveis dos Centros */}
                    <div className="space-y-2">
                      {lineGroup.centers.map((centerRow) => {
                        const rowKey = `${centerRow.lineCode}__${centerRow.centerCode}`
                        const isExpanded = !!expandedCenters[rowKey]
                        const statusVisual = getStatusVisual(centerRow.status)

                        return (
                          <div
                            key={rowKey}
                            className="bg-white border border-slate-200 rounded-lg shadow-2xs transition-all overflow-hidden"
                          >
                            {/* Card Resumido Principal do Centro */}
                            <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                              {/* Identificação do Centro */}
                              <div className="min-w-0 flex items-start sm:items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleCenter(rowKey)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors mt-0.5 sm:mt-0"
                                  title={isExpanded ? 'Recolher detalhes' : 'Ver detalhes'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-[#004C97]" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 tracking-tight">
                                      {centerRow.centerName}
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-500">
                                      Linha: {centerRow.lineCode}
                                    </span>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusVisual.badgeBg} ${statusVisual.badgeText} ${statusVisual.badgeBorder}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${statusVisual.dotColor}`}
                                      />
                                      {statusVisual.label}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {centerRow.plannedProductName
                                      ? `Produto: ${centerRow.plannedProductName}`
                                      : 'Sem produto mapeado no período'}
                                  </p>
                                </div>
                              </div>

                              {/* Métricas Principais em Linha */}
                              <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 sm:gap-5 text-xs font-mono pt-1 md:pt-0 border-t md:border-t-0 border-slate-100">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Previsto</span>
                                  <span className="font-semibold text-slate-700">
                                    {formatTonsPtBr(centerRow.plannedQuantityTons, 2)}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-400 block">
                                    Realizado
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {centerRow.realizedQuantityTons !== null
                                      ? formatTonsPtBr(centerRow.realizedQuantityTons, 2)
                                      : '—'}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-400 block">
                                    Eficiência / Aderência
                                  </span>
                                  <span
                                    className={`font-bold ${
                                      centerRow.adherencePct !== null &&
                                      centerRow.adherencePct >= 95
                                        ? 'text-emerald-700'
                                        : centerRow.adherencePct !== null &&
                                            centerRow.adherencePct >= 85
                                          ? 'text-amber-700'
                                          : 'text-rose-700'
                                    }`}
                                  >
                                    {centerRow.adherencePct !== null
                                      ? formatPercentPtBr(centerRow.adherencePct, 1)
                                      : '—'}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[10px] text-slate-400 block">Desvio</span>
                                  <span
                                    className={`font-bold ${
                                      centerRow.differenceTons !== null &&
                                      centerRow.differenceTons < 0
                                        ? 'text-rose-700'
                                        : centerRow.differenceTons !== null &&
                                            centerRow.differenceTons > 0
                                          ? 'text-emerald-700'
                                          : 'text-slate-600'
                                    }`}
                                  >
                                    {centerRow.differenceTons !== null
                                      ? `${centerRow.differenceTons > 0 ? '+' : ''}${formatTonsPtBr(
                                          centerRow.differenceTons,
                                          2,
                                        )}`
                                      : '—'}
                                  </span>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleCenter(rowKey)}
                                  className="h-7 text-xs text-[#004C97] hover:text-[#003870] hover:bg-blue-50 font-semibold gap-1 px-2"
                                >
                                  {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Detalhamento Expansível Inline (Ordens, Produtos, Horários, Paradas, Desvios) */}
                            {isExpanded && (
                              <div className="border-t border-slate-200 bg-slate-50/70 p-3 sm:p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">
                                      Ordens e Sequências do Centro: {centerRow.centerName}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] text-slate-600 bg-white"
                                    >
                                      {centerRow.details.length} ordens registradas
                                    </Badge>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    Fonte: Montagem Semanal (Previsto) &bull; MES 4.0 (Realizado)
                                  </span>
                                </div>

                                {centerRow.details.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-2">
                                    Sem apontamentos realizados para este centro no período.
                                  </p>
                                ) : (
                                  <div className="w-full overflow-x-auto">
                                    <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200 min-w-[760px]">
                                      <thead>
                                        <tr className="bg-slate-100 text-slate-700 text-[11px] font-semibold border-b border-slate-200">
                                          <th className="py-2 px-3">Ordem / OP</th>
                                          <th className="py-2 px-3">Produto</th>
                                          <th className="py-2 px-3 text-center">Seq.</th>
                                          <th className="py-2 px-3 text-right">Previsto</th>
                                          <th className="py-2 px-3 text-right">Realizado</th>
                                          <th className="py-2 px-3 text-right">Variação</th>
                                          <th className="py-2 px-3">Horários Prev. / Real</th>
                                          <th className="py-2 px-3">Causas & Desvios</th>
                                          <th className="py-2 px-3">Fonte</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {centerRow.details.map((detail, dIdx) => {
                                          const diffDetail =
                                            detail.realizedQuantityTons !== null
                                              ? detail.realizedQuantityTons -
                                                detail.plannedQuantityTons
                                              : null

                                          return (
                                            <tr
                                              key={dIdx}
                                              className="hover:bg-slate-50/80 text-[11px]"
                                            >
                                              <td className="py-2 px-3 font-mono font-bold text-[#004C97]">
                                                {detail.orderNumber}
                                              </td>
                                              <td className="py-2 px-3">
                                                <div className="font-semibold text-slate-800">
                                                  {detail.productDescription}
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                  {detail.productCode}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3 text-center font-mono">
                                                {detail.scheduledSequence}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-medium">
                                                {formatTonsPtBr(detail.plannedQuantityTons, 2)}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-bold">
                                                {detail.realizedQuantityTons !== null
                                                  ? formatTonsPtBr(detail.realizedQuantityTons, 2)
                                                  : '—'}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono">
                                                {diffDetail !== null ? (
                                                  <span
                                                    className={
                                                      diffDetail < 0
                                                        ? 'text-rose-600 font-bold'
                                                        : diffDetail > 0
                                                          ? 'text-emerald-600 font-bold'
                                                          : 'text-slate-600'
                                                    }
                                                  >
                                                    {diffDetail > 0 ? '+' : ''}
                                                    {formatTonsPtBr(diffDetail, 2)}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400">—</span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3 text-[10px] text-slate-600 whitespace-nowrap">
                                                <div>
                                                  Prev: {formatDateTimeSafe(detail.plannedStart)}
                                                </div>
                                                <div>
                                                  Real:{' '}
                                                  {detail.realStart
                                                    ? formatDateTimeSafe(detail.realStart)
                                                    : '—'}
                                                </div>
                                              </td>
                                              <td className="py-2 px-3 max-w-[180px]">
                                                {detail.deviationReason ? (
                                                  <span
                                                    className="text-rose-700 font-medium truncate block"
                                                    title={detail.deviationReason}
                                                  >
                                                    {detail.deviationReason}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400">Sem desvio</span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3 text-[10px] font-mono text-slate-500 whitespace-nowrap">
                                                {detail.mesStatus
                                                  ? `MES (${detail.mesStatus})`
                                                  : 'PCP'}
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import {
  RealtimeProductivityConsolidated,
  RealtimeOrderProductivityItem,
  RealtimeFilters,
  RealtimePeriodRange,
} from '@/types/pcp-realtime-analysis'
import { PcpRealtimeAiService, ProductivityAiReport } from '@/services/pcp-realtime-ai-service'
import { formatNumberPtBr } from '@/lib/number-format'
import * as XLSX from 'xlsx'
import {
  Gauge,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  Wrench,
  Clock,
  Building2,
  FileSpreadsheet,
} from 'lucide-react'

interface RealtimeProductivityDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consolidated: RealtimeProductivityConsolidated | null | undefined
  orderList: RealtimeOrderProductivityItem[] | undefined
  filters: RealtimeFilters
  periodRange?: RealtimePeriodRange
  onRefresh?: () => void
}

function safeFormatNumber(val: number | null | undefined, suffix = ''): string {
  if (
    val === null ||
    val === undefined ||
    typeof val !== 'number' ||
    isNaN(val) ||
    !isFinite(val)
  ) {
    return 'N/D'
  }
  return `${formatNumberPtBr(val)}${suffix ? ` ${suffix}` : ''}`
}

export const RealtimeProductivityDetailModal: React.FC<RealtimeProductivityDetailModalProps> = ({
  open,
  onOpenChange,
  consolidated,
  orderList,
  filters,
  periodRange,
  onRefresh,
}) => {
  const [aiLoading, setAiLoading] = useState<boolean>(true)
  const [aiReport, setAiReport] = useState<ProductivityAiReport | null>(null)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  // Log de abertura conforme regras transversais
  useEffect(() => {
    if (open) {
      console.log('[RealtimeProductivityDetailModal] Modal aberto:', {
        empresa: filters.companyCode,
        linha: filters.lineCode,
        centro: filters.centerCode,
        periodo: filters.period,
        ordensTotal: orderList?.length || 0,
      })
    }
  }, [open, filters, orderList])

  // IA carrega por último sem travar a interface (com log de geração)
  useEffect(() => {
    if (!open) {
      setAiReport(null)
      return
    }

    setAiLoading(true)
    const timer = setTimeout(() => {
      try {
        console.log(
          '[RealtimeProductivityDetailModal] Gerando análise IA orientativa de 7 blocos...',
        )
        const report = PcpRealtimeAiService.generateProductivityAnalysis({
          consolidated,
          orders: orderList,
        })
        setAiReport(report)
        console.log('[RealtimeProductivityDetailModal] Análise IA concluída com sucesso.')
      } catch (err) {
        console.warn('[RealtimeProductivityDetailModal] Falha segura ao gerar IA:', err)
        setAiReport(null)
      } finally {
        setAiLoading(false)
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [open, consolidated, orderList])

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
  }

  // Exportação Excel XLSX
  const handleExportExcel = () => {
    try {
      const rows = (orderList || []).map((o) => ({
        'Ordem de Produção': o.opNumber,
        Centro: o.centerCode,
        Linha: o.lineCode,
        'Material Cód.': o.materialCode,
        'Descrição Material': o.materialDescription,
        Bitola: o.bitola,
        'Aço / Grade': o.steelGrade,
        'Qtd Planejada (t)': o.plannedQuantityTons,
        'Qtd Realizada (t)': o.realizedQuantityTons,
        'Prod. Prevista (t/h)': o.plannedProductivityTh !== null ? o.plannedProductivityTh : 'N/D',
        'Prod. Realizada (t/h)':
          o.realizedProductivityTh !== null ? o.realizedProductivityTh : 'N/D',
        'Desvio (t/h)': o.deviationTh !== null ? o.deviationTh : 'N/D',
        'Desvio (%)': o.deviationPct !== null ? o.deviationPct : 'N/D',
        'Tempo Produtivo Real (h)': o.productiveHours,
        'Tempo Parado (h)': o.stoppedHours,
        'Principal Motivo Parada': o.mainStopReason,
        Status: o.status,
        'Origem Regra': o.ruleOrigin || 'N/D',
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, 'Produtividade_OP')
      const stamp = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `Produtividade_th_CIAFAL_${stamp}.xlsx`)
    } catch (err) {
      console.error('Erro ao exportar XLSX de produtividade:', err)
    }
  }

  const handlePrintPdf = () => {
    window.print()
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'DENTRO_PREVISTO':
        return (
          <Badge className="bg-emerald-600 text-white font-medium text-[10px]">
            🟢 No previsto
          </Badge>
        )
      case 'ABAIXO_PREVISTO':
        return <Badge className="bg-rose-600 text-white font-medium text-[10px]">🔴 Abaixo</Badge>
      case 'ACIMA_PREVISTO':
        return <Badge className="bg-blue-600 text-white font-medium text-[10px]">🔵 Acima</Badge>
      default:
        return <Badge variant="outline">N/D</Badge>
    }
  }

  const safeOrders = useMemo(() => {
    return Array.isArray(orderList) ? orderList : []
  }, [orderList])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="realtime-productivity-detail-modal"
        className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] h-[94vh] max-h-[94vh] p-0 flex flex-col bg-slate-50 border-slate-300 rounded-2xl shadow-2xl overflow-hidden print:w-full print:h-auto print:max-h-none print:shadow-none print:border-none print:bg-white"
      >
        <ErrorBoundary moduleName="Modal Detalhamento Produtividade" variant="compact">
          {/* CABEÇALHO */}
          <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 print:border-none print:pb-2">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-[#004C97] border-blue-200 font-semibold text-xs flex items-center gap-1"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  Módulo de Produtividade t/h
                </Badge>
                {periodRange && (
                  <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">
                    Período: {periodRange.label}
                  </Badge>
                )}
                <span className="text-xs text-slate-500 font-mono">
                  {filters.companyCode || 'CIAFAL'} • Linha: {filters.lineCode || 'Todas'} • Centro:{' '}
                  {filters.centerCode || 'Todos'} • Turno: {filters.shiftCode || 'Todos'}
                </span>
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Gauge className="w-6 h-6 text-[#004C97]" />
                Detalhamento da Produtividade t/h
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Memória técnica e cruzamento entre toneladas produzidas, tempos produtivos e
                cadências oficiais
              </DialogDescription>
            </div>

            {/* AÇÕES DO CABEÇALHO */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-300 gap-1.5"
                title="Atualizar análise"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 text-xs font-semibold text-emerald-700 hover:text-emerald-800 border-emerald-300 hover:bg-emerald-50 gap-1.5"
                title="Exportar para planilha Excel XLSX"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Exportar Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintPdf}
                className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-300 gap-1.5"
                title="Imprimir relatório / Exportar PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                Exportar PDF
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white"
              >
                Fechar
              </Button>
            </div>
          </DialogHeader>

          {/* CORPO DO MODAL */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* MINI-CARDS DE RESUMO NO TOPO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {/* Prevista Consolidada */}
              <Card className="bg-white border-slate-200 p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Prevista (Ponderada)
                </span>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {safeFormatNumber(consolidated?.plannedProductivityTh, 't/h')}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  Σ(Cadência×t) / Σt
                </span>
              </Card>

              {/* Realizada Consolidada */}
              <Card className="bg-white border-slate-200 p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Realizada
                </span>
                <div className="text-lg font-black text-[#004C97] mt-1">
                  {safeFormatNumber(consolidated?.realizedProductivityTh, 't/h')}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  Produção real ÷ tempo
                </span>
              </Card>

              {/* Desvio Consolidado */}
              <Card className="bg-white border-slate-200 p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Desvio
                </span>
                <div
                  className={`text-lg font-black mt-1 ${
                    (consolidated?.deviationTh ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {consolidated?.deviationTh != null
                    ? `${consolidated.deviationTh > 0 ? '+' : ''}${formatNumberPtBr(consolidated.deviationTh)} t/h`
                    : 'N/D'}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  {consolidated?.deviationPct != null
                    ? `${consolidated.deviationPct > 0 ? '+' : ''}${formatNumberPtBr(consolidated.deviationPct)} %`
                    : 'N/D'}
                </span>
              </Card>

              {/* Produção Total Realizada */}
              <Card className="bg-white border-slate-200 p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Produção Total
                </span>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {safeFormatNumber(consolidated?.totalRealizedTons, 't')}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  Apontamentos MES
                </span>
              </Card>

              {/* Tempo Produtivo Real */}
              <Card className="bg-white border-slate-200 p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Tempo Produtivo
                </span>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {safeFormatNumber(consolidated?.totalProductiveHours, 'h')}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  Operacional − Paradas
                </span>
              </Card>

              {/* Horas Paradas */}
              <Card className="bg-white border-slate-200 p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Horas Paradas
                </span>
                <div className="text-lg font-black text-rose-600 mt-1">
                  {safeFormatNumber(consolidated?.totalStoppedHours, 'h')}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  pcp_production_stops
                </span>
              </Card>

              {/* Qtd Ordens */}
              <Card className="bg-white border-slate-200 p-3 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  Ordens Analisadas
                </span>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {consolidated?.ordersCount ?? safeOrders.length}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                  OPs no período
                </span>
              </Card>
            </div>

            {/* TABELA POR OP */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  Detalhamento de Produtividade por Ordem de Produção (OP)
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {safeOrders.length} ordem(ns) computadas
                </span>
              </div>

              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                    <tr>
                      <th className="p-2.5 whitespace-nowrap">OP</th>
                      <th className="p-2.5 whitespace-nowrap">Centro / Linha</th>
                      <th className="p-2.5 whitespace-nowrap">Material / Descrição</th>
                      <th className="p-2.5 whitespace-nowrap">Bitola</th>
                      <th className="p-2.5 whitespace-nowrap">Aço / Grade</th>
                      <th className="p-2.5 whitespace-nowrap text-right">Planejado (t)</th>
                      <th className="p-2.5 whitespace-nowrap text-right">Realizado (t)</th>
                      <th className="p-2.5 whitespace-nowrap text-right">Prevista (t/h)</th>
                      <th className="p-2.5 whitespace-nowrap text-right">Realizada (t/h)</th>
                      <th className="p-2.5 whitespace-nowrap text-right">Desvio (t/h)</th>
                      <th className="p-2.5 whitespace-nowrap text-right">Desvio (%)</th>
                      <th className="p-2.5 whitespace-nowrap text-right">Tempo Prod. (h)</th>
                      <th className="p-2.5 whitespace-nowrap text-right">Paradas (h)</th>
                      <th className="p-2.5 whitespace-nowrap">Motivo Parada</th>
                      <th className="p-2.5 whitespace-nowrap text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeOrders.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="p-8 text-center text-slate-500 italic">
                          Nenhuma ordem com apontamentos ou programação localizada no período e
                          filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      safeOrders.map((ord, idx) => (
                        <tr
                          key={`${ord.opNumber}-${ord.centerCode}-${idx}`}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="p-2.5 font-bold font-mono text-slate-900 whitespace-nowrap">
                            {ord.opNumber}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{ord.centerCode}</span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {ord.lineCode}
                            </span>
                          </td>
                          <td className="p-2.5 max-w-[200px]">
                            <div
                              className="font-semibold text-slate-800 truncate"
                              title={ord.materialDescription}
                            >
                              {ord.materialDescription}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {ord.materialCode}
                            </div>
                          </td>
                          <td className="p-2.5 whitespace-nowrap font-mono text-slate-700">
                            {ord.bitola || '-'}
                          </td>
                          <td className="p-2.5 whitespace-nowrap text-slate-700">
                            {ord.steelGrade || '-'}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                            {safeFormatNumber(ord.plannedQuantityTons, 't')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {safeFormatNumber(ord.realizedQuantityTons, 't')}
                          </td>
                          <td
                            className="p-2.5 text-right font-mono text-slate-700 whitespace-nowrap"
                            title={ord.ruleOrigin || ''}
                          >
                            {safeFormatNumber(ord.plannedProductivityTh, 't/h')}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#004C97] whitespace-nowrap">
                            {safeFormatNumber(ord.realizedProductivityTh, 't/h')}
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono font-semibold whitespace-nowrap ${
                              (ord.deviationTh ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {ord.deviationTh != null
                              ? `${ord.deviationTh > 0 ? '+' : ''}${formatNumberPtBr(ord.deviationTh)} t/h`
                              : 'N/D'}
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono whitespace-nowrap ${
                              (ord.deviationPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {ord.deviationPct != null
                              ? `${ord.deviationPct > 0 ? '+' : ''}${formatNumberPtBr(ord.deviationPct)} %`
                              : 'N/D'}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                            {safeFormatNumber(ord.productiveHours, 'h')}
                          </td>
                          <td className="p-2.5 text-right font-mono text-rose-600 whitespace-nowrap">
                            {safeFormatNumber(ord.stoppedHours, 'h')}
                          </td>
                          <td
                            className="p-2.5 max-w-[180px] truncate text-slate-600"
                            title={ord.mainStopReason}
                          >
                            {ord.mainStopReason}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {renderStatusBadge(ord.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAINEL DE ANÁLISE IA ORIENTATIVA (7 ANÁLISES) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-[#004C97] font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-[#004C97] animate-pulse" />
                  Análise IA Orientativa de Produtividade (PCP Robotizado)
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-700">
                    Base Real • Sem Alucinações
                  </Badge>
                  <Badge variant="outline" className="text-[11px] bg-white text-slate-500">
                    IA Orientativa • Não Executa
                  </Badge>
                </div>
              </div>

              {aiLoading ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-6 w-3/4 rounded-md" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                  </div>
                </div>
              ) : aiReport ? (
                <div className="space-y-4 text-xs">
                  {/* 1. Resumo Executivo */}
                  <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3.5 space-y-1">
                    <div className="font-bold text-[#004C97] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      1. Resumo Executivo
                    </div>
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {aiReport.executiveSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 2. Ordens com maior desvio negativo */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="font-bold text-rose-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        2. Ordens com Maior Desvio Negativo
                      </div>
                      {aiReport.highestNegativeDeviationOrders.length === 0 ? (
                        <p className="text-slate-500 italic">
                          Nenhuma ordem com desvio negativo expressivo registrada no período.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 divide-y divide-slate-200/60">
                          {aiReport.highestNegativeDeviationOrders.map((o, idx) => (
                            <li key={idx} className="pt-1.5 first:pt-0">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="font-mono text-slate-800">OP {o.opNumber}</span>
                                <span className="font-mono text-rose-600">
                                  {formatNumberPtBr(o.deviationTh)} t/h
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {o.material} • Real: {formatNumberPtBr(o.realizedRate)} t/h vs Plan:{' '}
                                {formatNumberPtBr(o.plannedRate)} t/h
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* 3. Ordens com melhor desempenho */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        3. Ordens com Melhor Desempenho
                      </div>
                      {aiReport.bestPerformanceOrders.length === 0 ? (
                        <p className="text-slate-500 italic">
                          Sem ordens superando a meta nominal no período.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 divide-y divide-slate-200/60">
                          {aiReport.bestPerformanceOrders.map((o, idx) => (
                            <li key={idx} className="pt-1.5 first:pt-0">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="font-mono text-slate-800">OP {o.opNumber}</span>
                                <span className="font-mono text-emerald-600">
                                  +{formatNumberPtBr(o.deviationTh)} t/h
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {o.material} • Real: {formatNumberPtBr(o.realizedRate)} t/h vs Plan:{' '}
                                {formatNumberPtBr(o.plannedRate)} t/h
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* 4 e 5: Causas de perda e Correlação com Paradas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 4. Principais causas prováveis de perda */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        4. Principais Causas Prováveis de Perda
                      </div>
                      <ul className="space-y-1.5 list-disc pl-4 text-slate-700">
                        {aiReport.probableLossCauses.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    {/* 5. Correlação com paradas */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        5. Correlação com Paradas Operacionais
                      </div>
                      {aiReport.stopsCorrelation.length === 0 ? (
                        <p className="text-slate-500 italic">
                          Sem correlação de paradas críticas registradas para as ordens filtradas.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 divide-y divide-slate-200/60">
                          {aiReport.stopsCorrelation.slice(0, 4).map((st, idx) => (
                            <li key={idx} className="pt-1.5 first:pt-0">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-slate-800">{st.reason}</span>
                                <span className="font-mono text-rose-600">
                                  {formatNumberPtBr(st.totalHours)} h
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {st.impactDescription}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* 6. Impacto operacional estimado */}
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5 space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      6. Impacto Operacional Estimado
                    </div>
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {aiReport.estimatedOperationalImpact.impactSummary}
                    </p>
                  </div>

                  {/* 7. Ações recomendadas */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="font-bold text-[#004C97] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Wrench className="w-3.5 h-3.5 text-[#004C97]" />
                      7. Ações Recomendadas Orientativas (PCP • Operação • Manutenção)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {/* PCP */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                        <span className="font-bold text-[#004C97] block text-[11px]">
                          PCP / Planejamento:
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
                          {aiReport.recommendedActions.pcp.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Operação */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                        <span className="font-bold text-emerald-800 block text-[11px]">
                          Operação Fabril:
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
                          {aiReport.recommendedActions.operacao.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Manutenção */}
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                        <span className="font-bold text-amber-800 block text-[11px]">
                          Manutenção & Engenharia:
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
                          {aiReport.recommendedActions.manutencao.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2">
                  Sem dados suficientes para gerar a análise de produtividade no momento.
                </div>
              )}
            </div>
          </div>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}

export default RealtimeProductivityDetailModal

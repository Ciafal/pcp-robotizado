import React, { useMemo, useState, useEffect } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RealtimeCenterData,
  RealtimeLineData,
  RealtimeCompanyConsolidated,
  RealtimeFilters,
  RealtimePeriodRange,
  RealtimeOrderProductivityItem,
  RealtimeProductivityConsolidated,
} from '@/types/pcp-realtime-analysis'
import { formatNumberPtBr } from '@/lib/number-format'
import { PcpRealtimeAiService, ProductivityAiReport } from '@/services/pcp-realtime-ai-service'
import {
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Wrench,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  Building2,
  Gauge,
  FileSpreadsheet,
  RefreshCw,
  Box,
} from 'lucide-react'

export interface RealtimeDrilldownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'COMPANY' | 'LINE' | 'CENTRO' | 'METRIC' | 'STOP'
  title: string
  center?: RealtimeCenterData | null
  line?: RealtimeLineData | null
  company?: RealtimeCompanyConsolidated | null
  metricKey?: 'oee' | 'utilization' | 'metallicYield' | 'production' | null
  // Extensões de contexto e controle
  mode?: 'SUMMARY' | 'FULL'
  filters?: RealtimeFilters
  periodRange?: RealtimePeriodRange
  orderProductivityList?: RealtimeOrderProductivityItem[]
  loading?: boolean
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

const formatModalTime = (isoString?: string | null, includeSeconds = true): string => {
  if (!isoString) return includeSeconds ? '--:--:--' : '--:--'
  try {
    const d = new Date(isoString)
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('pt-BR', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds ? { second: '2-digit' } : {}),
      })
    }
    if (isoString.includes('T')) {
      const part = isoString.split('T')[1]?.slice(0, includeSeconds ? 8 : 5)
      if (part) return part
    }
    if (isoString.length >= (includeSeconds ? 19 : 16)) {
      return isoString.slice(11, includeSeconds ? 19 : 16)
    }
  } catch {
    // fallback
  }
  return includeSeconds ? '--:--:--' : '--:--'
}

export const RealtimeDrilldownModal: React.FC<RealtimeDrilldownModalProps> = ({
  open,
  onOpenChange,
  type,
  title,
  center,
  line,
  company,
  metricKey,
  mode = 'SUMMARY',
  filters,
  periodRange,
  orderProductivityList,
  loading = false,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<string>('producao')
  const [aiReport, setAiReport] = useState<ProductivityAiReport | null>(null)
  const [aiLoading, setAiLoading] = useState<boolean>(false)

  // Sempre que abrir em modo FULL, reseta a aba inicial para 'producao'
  useEffect(() => {
    if (open) {
      setActiveTab('producao')
    }
  }, [open, mode])

  // Resumo operacional básico
  const aiSummary = useMemo(() => {
    try {
      if (center) return PcpRealtimeAiService.generateCenterSummary(center)
      if (line) return PcpRealtimeAiService.generateLineSummary(line)
      if (company) return PcpRealtimeAiService.generateCompanySummary(company, [])
      return null
    } catch (err) {
      console.warn('Erro ao gerar resumo IA no modal drilldown:', err)
      return null
    }
  }, [center, line, company])

  // Filtrar ordens estritamente do centro selecionado (isolamento por centro)
  const centerOrders = useMemo(() => {
    if (!orderProductivityList || !Array.isArray(orderProductivityList)) return []
    if (!center) return []
    const cCode = center.centerCode?.trim().toUpperCase()
    return orderProductivityList.filter((o) => (o.centerCode || '').trim().toUpperCase() === cCode)
  }, [orderProductivityList, center])

  // Consolidado de produtividade exclusivo do centro selecionado
  const centerProductivityConsolidated = useMemo<RealtimeProductivityConsolidated | null>(() => {
    if (centerOrders.length === 0) return null

    let sumWeightedPlannedRate = 0
    let sumWeightTons = 0
    let totalRealizedTons = 0
    let totalPlannedTons = 0
    let totalProductiveHours = 0
    let totalStoppedHours = 0

    for (const item of centerOrders) {
      if (!item) continue
      const planQty = Number(item.plannedQuantityTons) || 0
      const realQty = Number(item.realizedQuantityTons) || 0
      const prodHours = Number(item.productiveHours) || 0
      const stopHours = Number(item.stoppedHours) || 0

      totalRealizedTons += realQty
      totalPlannedTons += planQty
      totalProductiveHours += prodHours
      totalStoppedHours += stopHours

      if (item.plannedProductivityTh !== null && item.plannedProductivityTh > 0 && planQty > 0) {
        sumWeightedPlannedRate += item.plannedProductivityTh * planQty
        sumWeightTons += planQty
      }
    }

    const plannedProductivityTh =
      sumWeightTons > 0 ? Number((sumWeightedPlannedRate / sumWeightTons).toFixed(2)) : null

    const realizedProductivityTh =
      totalProductiveHours > 0 && totalRealizedTons > 0
        ? Number((totalRealizedTons / totalProductiveHours).toFixed(2))
        : null

    let deviationTh: number | null = null
    let deviationPct: number | null = null
    let achievementPct: number | null = null

    if (
      realizedProductivityTh !== null &&
      plannedProductivityTh !== null &&
      plannedProductivityTh > 0
    ) {
      deviationTh = Number((realizedProductivityTh - plannedProductivityTh).toFixed(2))
      deviationPct = Number(
        ((realizedProductivityTh / plannedProductivityTh) * 100 - 100).toFixed(2),
      )
      achievementPct = Number(((realizedProductivityTh / plannedProductivityTh) * 100).toFixed(2))
    }

    return {
      plannedProductivityTh,
      realizedProductivityTh,
      deviationTh,
      deviationPct,
      achievementPct,
      totalRealizedTons: Number(totalRealizedTons.toFixed(2)),
      totalPlannedTons: Number(totalPlannedTons.toFixed(2)),
      totalProductiveHours: Number(totalProductiveHours.toFixed(2)),
      totalStoppedHours: Number(totalStoppedHours.toFixed(2)),
      ordersCount: centerOrders.length,
    }
  }, [centerOrders])

  // Diagnóstico IA orientativo para o centro (Aba E)
  useEffect(() => {
    if (!open) {
      setAiReport(null)
      return
    }

    setAiLoading(true)
    const timer = setTimeout(() => {
      try {
        const report = PcpRealtimeAiService.generateProductivityAnalysis({
          consolidated: centerProductivityConsolidated,
          orders: centerOrders,
        })
        setAiReport(report)
      } catch (err) {
        console.warn('Falha segura ao gerar diagnóstico IA de produtividade do centro:', err)
        setAiReport(null)
      } finally {
        setAiLoading(false)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [open, centerProductivityConsolidated, centerOrders])

  const isFullPanel = mode === 'FULL'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="realtime-drilldown-modal-content"
        className="w-[94vw] max-w-[94vw] sm:max-w-[94vw] md:max-w-[94vw] lg:max-w-[94vw] xl:max-w-[94vw] h-[94vh] max-h-[94vh] p-0 flex flex-col bg-slate-50 border-slate-300 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Cabeçalho Fixo */}
        <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 font-semibold text-xs flex items-center gap-1"
              >
                <Activity className="w-3.5 h-3.5" />
                {isFullPanel ? 'Painel Completo do Centro' : 'Drill-down Operacional PCP'}
              </Badge>
              {center?.status ? (
                <Badge
                  className={
                    center.status === 'NORMAL'
                      ? 'bg-emerald-600 text-white'
                      : center.status === 'ATENCAO'
                        ? 'bg-amber-500 text-white'
                        : center.status === 'CRITICO'
                          ? 'bg-rose-600 text-white'
                          : center.status === 'PARADA_PROGRAMADA'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-400 text-white'
                  }
                >
                  {center.status}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500">
                  Sem programação
                </Badge>
              )}
              {periodRange && (
                <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">
                  Período: {periodRange.label}
                </Badge>
              )}
              {filters && (
                <span className="text-xs text-slate-500 font-mono hidden lg:inline">
                  {filters.companyCode || 'CIAFAL'} • Linha: {filters.lineCode || 'Todas'} • Turno:{' '}
                  {filters.shiftCode || 'Todos'}
                </span>
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#004C97]" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rastreabilidade analítica ponta a ponta com carimbo de tempo, fontes integradas e
              memória técnica.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-8 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-300 gap-1.5"
                title="Atualizar dados"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}
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

        {/* Corpo com Rolagem Vertical Interna e sem Corte Lateral */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Indicador de carregamento */}
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            </div>
          )}

          {!loading && (
            <>
              {/* Bloco Resumo Operacional IA (Sempre visível se disponível) */}
              {aiSummary && (
                <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border border-blue-200/80 rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#004C97] font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      Resumo Operacional IA — {aiSummary.entityName}
                    </div>
                    <Badge variant="outline" className="bg-white text-[11px] text-slate-600">
                      Sem alucinações • IA Orientativa
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* FATOS */}
                    <div className="bg-white/90 border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                      <div className="text-[11px] font-bold tracking-wider uppercase text-slate-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Fatos Medidos na Fonte
                      </div>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                        {aiSummary.factualPoints.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>

                    {/* ALERTAS */}
                    <div className="bg-white/90 border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                      <div className="text-[11px] font-bold tracking-wider uppercase text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        Alertas Calculados
                      </div>
                      {aiSummary.calculatedAlerts.length > 0 ? (
                        <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                          {aiSummary.calculatedAlerts.map((a, idx) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          Nenhum desvio crítico detectado.
                        </p>
                      )}
                    </div>

                    {/* INTERPRETAÇÃO & PRÓXIMA AÇÃO */}
                    <div className="bg-white/90 border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                      <div className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        Interpretação e Próxima Atenção
                      </div>
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                        {aiSummary.aiInterpretations.map((i, idx) => (
                          <li key={idx}>{i}</li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-indigo-900">
                          Recomendação PCP:{' '}
                        </span>
                        <span className="text-xs text-slate-700">{aiSummary.nextActionAdvice}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODO SUMMARY (BOTÃO "DETALHES"): Painel com identificação, OP em execução, volumes, cadência, OEE, paradas */}
              {!isFullPanel && (
                <div className="space-y-6" data-testid="realtime-summary-popup-content">
                  {/* Bloco 1: Identificação e Status Operacional */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-slate-500">Identificação do Centro / Linha</div>
                      <div className="text-base font-bold text-slate-900 mt-1">
                        {center?.centerName || center?.centerCode || 'Centro'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 font-mono">
                        Cód: {center?.centerCode || '-'} • Linha:{' '}
                        {center?.lineName || center?.lineCode || '-'}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-slate-500">Status Operacional Atual</div>
                      <div className="mt-1 flex items-center gap-2">
                        {center?.status ? (
                          <Badge
                            className={
                              center.status === 'NORMAL'
                                ? 'bg-emerald-600 text-white'
                                : center.status === 'ATENCAO'
                                  ? 'bg-amber-500 text-white'
                                  : center.status === 'CRITICO'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-500 text-white'
                            }
                          >
                            {center.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sem ordem</Badge>
                        )}
                        {center?.activeStop && (
                          <Badge variant="destructive" className="text-[10px]">
                            Parada Ativa
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Atualizado às {formatModalTime(center?.lastUpdated)}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-slate-500">Ordem em Execução (OP)</div>
                      <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                        {center?.productionOrder || 'Sem ordem ativa'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Campanha: {center?.campaign || 'Padrão'}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-slate-500">Material / Bitola / Aço</div>
                      <div
                        className="text-sm font-bold text-slate-900 mt-1 truncate"
                        title={center?.materialDescription || ''}
                      >
                        {center?.materialDescription || 'N/D'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Bitola: {center?.dimension || 'N/D'} | Aço: {center?.steelGrade || 'N/D'}
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Produção Prevista x Realizada e Produtividade t/h */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-slate-500">Produção Programada x Realizada</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">
                        {safeFormatNumber(center?.realizedTons, 't')} /{' '}
                        {safeFormatNumber(center?.programmedTons, 't')}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                        Atingimento:{' '}
                        {center?.achievementPct !== null && center?.achievementPct !== undefined
                          ? `${formatNumberPtBr(center.achievementPct)} %`
                          : 'N/D'}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-slate-500">Saldo da Programação</div>
                      <div className="text-lg font-bold text-slate-900 mt-1">
                        {safeFormatNumber(center?.balanceTons, 't')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Início: {center?.productionStartTime || '-'} | Fim:{' '}
                        {center?.productionForecastEndTime || '-'}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-slate-500">Produtividade Instantânea (t/h)</div>
                      <div className="text-lg font-bold text-[#004C97] mt-1">
                        {center?.currentRatePerHour !== null &&
                        center?.currentRatePerHour !== undefined
                          ? `${formatNumberPtBr(center.currentRatePerHour)} t/h`
                          : '0,00 t/h'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Meta nominal: {safeFormatNumber(center?.plannedRatePerHour, 't/h')}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                      <div className="text-xs text-slate-500">Paradas do Turno (MES)</div>
                      <div className="text-lg font-bold text-rose-600 mt-1">
                        {center?.stoppedMinutesShift ?? 0} min
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Ocorrências: {center?.stopsCountShift ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Bloco 3: Indicadores OEE, Utilização e Rendimento Metálico */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* OEE */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">OEE do Centro</span>
                        <Badge variant="outline" className="text-xs font-bold text-blue-700">
                          Meta: {safeFormatNumber(center?.oee?.target, '%')}
                        </Badge>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {safeFormatNumber(center?.oee?.value, '%')}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1">
                        {center?.oee?.trend === 'UP' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>
                          Diferença:{' '}
                          {center?.oee?.difference !== null && center?.oee?.difference !== undefined
                            ? `${formatNumberPtBr(center.oee.difference)} p.p.`
                            : 'N/D'}
                        </span>
                      </div>
                    </div>

                    {/* Taxa de Utilização */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">Taxa de Utilização</span>
                        <Badge variant="outline" className="text-xs font-bold text-blue-700">
                          Meta: {safeFormatNumber(center?.utilization?.target, '%')}
                        </Badge>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {safeFormatNumber(center?.utilization?.value, '%')}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1">
                        {center?.utilization?.trend === 'UP' ? (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        <span>
                          Diferença:{' '}
                          {center?.utilization?.difference !== null &&
                          center?.utilization?.difference !== undefined
                            ? `${formatNumberPtBr(center.utilization.difference)} p.p.`
                            : 'N/D'}
                        </span>
                      </div>
                    </div>

                    {/* Rendimento Metálico */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">
                          Rendimento Metálico
                        </span>
                        <Badge variant="outline" className="text-xs font-bold text-blue-700">
                          Meta: {safeFormatNumber(center?.metallicYield?.targetPct, '%')}
                        </Badge>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {safeFormatNumber(center?.metallicYield?.yieldPct, '%')}
                      </div>
                      <div className="text-xs text-slate-600">
                        Perda estimada:{' '}
                        {safeFormatNumber(center?.metallicYield?.estimatedLossTons, 't')}
                      </div>
                    </div>
                  </div>

                  {/* Paradas e Motivos Registrados no MES */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Paradas e Ocorrências no MES 4.0
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {center?.stopsHistory?.length ?? 0} registro(s)
                      </span>
                    </div>
                    {center?.stopsHistory && center.stopsHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">Código</th>
                              <th className="p-3">Categoria</th>
                              <th className="p-3">Motivo Informado</th>
                              <th className="p-3">Causa Técnica</th>
                              <th className="p-3">Início</th>
                              <th className="p-3">Duração</th>
                              <th className="p-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {center.stopsHistory.map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50/80">
                                <td className="p-3 font-mono font-semibold text-slate-900">
                                  {s.stopCode}
                                </td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-[11px]">
                                    {s.categoryLabel}
                                  </Badge>
                                </td>
                                <td className="p-3 max-w-[220px] truncate" title={s.reason}>
                                  {s.reason}
                                </td>
                                <td className="p-3 text-slate-600">
                                  {s.technicalCauseConfirmed || 'Em análise técnica'}
                                </td>
                                <td className="p-3 text-slate-600">
                                  {formatModalTime(s.startDatetime, false)}
                                </td>
                                <td className="p-3 font-bold text-slate-900">
                                  {s.durationMinutes} min
                                </td>
                                <td className="p-3">
                                  {s.isOpen ? (
                                    <Badge className="bg-rose-600 text-white">Ativa</Badge>
                                  ) : (
                                    <Badge variant="secondary">Encerrada</Badge>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500 italic">
                        Nenhuma parada registrada para este centro produtivo no período selecionado.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODO FULL (BOTÃO "ABRIR PAINEL COMPLETO DO CENTRO"): 5 BLOCOS A–E */}
              {isFullPanel && (
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full space-y-4"
                  data-testid="realtime-full-panel-tabs"
                >
                  <TabsList className="bg-slate-200/80 p-1 rounded-xl flex flex-wrap h-auto gap-1">
                    <TabsTrigger
                      value="producao"
                      className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
                      data-testid="tab-trigger-producao"
                    >
                      <Box className="w-3.5 h-3.5" />
                      Aba A — Produção
                    </TabsTrigger>
                    <TabsTrigger
                      value="produtividade"
                      className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
                      data-testid="tab-trigger-produtividade"
                    >
                      <Gauge className="w-3.5 h-3.5" />
                      Aba B — Produtividade t/h
                    </TabsTrigger>
                    <TabsTrigger
                      value="paradas"
                      className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
                      data-testid="tab-trigger-paradas"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Aba C — Paradas & Ocorrências
                    </TabsTrigger>
                    <TabsTrigger
                      value="indicadores"
                      className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
                      data-testid="tab-trigger-indicadores"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Aba D — Indicadores
                    </TabsTrigger>
                    <TabsTrigger
                      value="diagnostico_ia"
                      className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
                      data-testid="tab-trigger-diagnostico-ia"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Aba E — Diagnóstico IA
                    </TabsTrigger>
                  </TabsList>

                  {/* ABA A: Produção */}
                  <TabsContent
                    value="producao"
                    className="space-y-4 pt-1"
                    data-testid="tab-content-producao"
                  >
                    {/* Bloco 1: Ordem Atual */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <Box className="w-4 h-4 text-[#004C97]" />
                          Ordem Atual em Execução no Centro
                        </div>
                        <Badge variant="outline" className="text-xs font-mono">
                          OP: {center?.productionOrder || 'Sem ordem ativa'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 font-semibold">Produto / Material:</span>
                          <div
                            className="font-bold text-slate-900 mt-0.5 truncate"
                            title={center?.materialDescription || ''}
                          >
                            {center?.materialDescription || 'N/D'}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold">Bitola / Dimensão:</span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {center?.dimension || 'N/D'}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold">Família / Aço:</span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {center?.steelGrade || 'N/D'}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold">Campanha Vigente:</span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {center?.campaign || 'Padrão'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-slate-500 font-semibold">Previsto:</span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {safeFormatNumber(center?.programmedTons, 't')}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold">Realizado:</span>
                          <div className="font-bold text-emerald-600 mt-0.5">
                            {safeFormatNumber(center?.realizedTons, 't')}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold">Saldo:</span>
                          <div className="font-bold text-slate-900 mt-0.5">
                            {safeFormatNumber(center?.balanceTons, 't')}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold">Horários:</span>
                          <div className="text-slate-700 mt-0.5">
                            Início:{' '}
                            <span className="font-semibold">
                              {center?.productionStartTime || '-'}
                            </span>{' '}
                            | Previsão:{' '}
                            <span className="font-semibold">
                              {center?.productionForecastEndTime || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bloco 2: Histórico de Ordens do Período */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                          <Layers className="w-4 h-4 text-[#004C97]" />
                          Histórico de Ordens de Produção do Período ({centerOrders.length})
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          Centro: {center?.centerCode || '-'}
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              <th className="p-2.5">OP</th>
                              <th className="p-2.5">Produto / Descrição</th>
                              <th className="p-2.5">Bitola</th>
                              <th className="p-2.5">Aço</th>
                              <th className="p-2.5 text-right">Previsto (t)</th>
                              <th className="p-2.5 text-right">Realizado (t)</th>
                              <th className="p-2.5 text-right">Saldo (t)</th>
                              <th className="p-2.5 text-right">Horas Prod.</th>
                              <th className="p-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {centerOrders.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="p-6 text-center text-slate-500 italic">
                                  Nenhuma ordem histórica registrada para este centro produtivo no
                                  período.
                                </td>
                              </tr>
                            ) : (
                              centerOrders.map((ord, idx) => {
                                const saldo = ord.plannedQuantityTons - ord.realizedQuantityTons
                                return (
                                  <tr
                                    key={`${ord.opNumber}-${idx}`}
                                    className="hover:bg-slate-50/80"
                                  >
                                    <td className="p-2.5 font-bold font-mono text-slate-900">
                                      {ord.opNumber}
                                    </td>
                                    <td
                                      className="p-2.5 max-w-[200px] truncate"
                                      title={ord.materialDescription}
                                    >
                                      {ord.materialDescription}
                                    </td>
                                    <td className="p-2.5 font-mono">{ord.bitola || '-'}</td>
                                    <td className="p-2.5">{ord.steelGrade || '-'}</td>
                                    <td className="p-2.5 text-right font-mono">
                                      {safeFormatNumber(ord.plannedQuantityTons, 't')}
                                    </td>
                                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                      {safeFormatNumber(ord.realizedQuantityTons, 't')}
                                    </td>
                                    <td className="p-2.5 text-right font-mono text-slate-700">
                                      {safeFormatNumber(saldo, 't')}
                                    </td>
                                    <td className="p-2.5 text-right font-mono">
                                      {safeFormatNumber(ord.productiveHours, 'h')}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <Badge variant="outline" className="text-[10px]">
                                        {ord.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ABA B: Produtividade t/h */}
                  <TabsContent
                    value="produtividade"
                    className="space-y-4 pt-1"
                    data-testid="tab-content-produtividade"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 block truncate">
                          Taxa Instantânea
                        </span>
                        <div className="text-lg font-black text-[#004C97] mt-1">
                          {center?.currentRatePerHour !== null &&
                          center?.currentRatePerHour !== undefined
                            ? `${formatNumberPtBr(center.currentRatePerHour)} t/h`
                            : '0,00 t/h'}
                        </div>
                        <span className="text-[10px] text-slate-400">Ritmo atual do centro</span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 block truncate">
                          Prevista (Ponderada)
                        </span>
                        <div className="text-lg font-black text-slate-900 mt-1">
                          {safeFormatNumber(
                            centerProductivityConsolidated?.plannedProductivityTh ??
                              center?.plannedRatePerHour,
                            't/h',
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">Meta ponderada das OPs</span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 block truncate">
                          Realizada (Consolidada)
                        </span>
                        <div className="text-lg font-black text-[#004C97] mt-1">
                          {safeFormatNumber(
                            centerProductivityConsolidated?.realizedProductivityTh,
                            't/h',
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">Produção real ÷ horas</span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 block truncate">
                          Desvio Absoluto (t/h)
                        </span>
                        <div
                          className={`text-lg font-black mt-1 ${
                            (centerProductivityConsolidated?.deviationTh ?? 0) >= 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {centerProductivityConsolidated?.deviationTh !== null &&
                          centerProductivityConsolidated?.deviationTh !== undefined
                            ? `${centerProductivityConsolidated.deviationTh > 0 ? '+' : ''}${formatNumberPtBr(centerProductivityConsolidated.deviationTh)} t/h`
                            : 'N/D'}
                        </div>
                        <span className="text-[10px] text-slate-400">Realizada − Prevista</span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 block truncate">
                          Desvio Percentual
                        </span>
                        <div
                          className={`text-lg font-black mt-1 ${
                            (centerProductivityConsolidated?.deviationPct ?? 0) >= 0
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {centerProductivityConsolidated?.deviationPct !== null &&
                          centerProductivityConsolidated?.deviationPct !== undefined
                            ? `${centerProductivityConsolidated.deviationPct > 0 ? '+' : ''}${formatNumberPtBr(centerProductivityConsolidated.deviationPct)} %`
                            : 'N/D'}
                        </div>
                        <span className="text-[10px] text-slate-400">Variação % vs Meta</span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 block truncate">
                          Tempo Produtivo
                        </span>
                        <div className="text-lg font-black text-slate-900 mt-1">
                          {safeFormatNumber(
                            centerProductivityConsolidated?.totalProductiveHours,
                            'h',
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">Horas apontadas</span>
                      </div>
                    </div>

                    {/* Histórico de Produtividade por Ordem */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                        <span className="uppercase tracking-wider flex items-center gap-1.5">
                          <Gauge className="w-4 h-4 text-[#004C97]" />
                          Histórico de Produtividade por Ordem de Produção ({centerOrders.length})
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          Centro: {center?.centerCode || '-'}
                        </span>
                      </div>

                      <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              <th className="p-2.5">OP</th>
                              <th className="p-2.5">Material</th>
                              <th className="p-2.5">Bitola</th>
                              <th className="p-2.5 text-right">Qtd Real (t)</th>
                              <th className="p-2.5 text-right">Prevista (t/h)</th>
                              <th className="p-2.5 text-right">Realizada (t/h)</th>
                              <th className="p-2.5 text-right">Desvio (t/h)</th>
                              <th className="p-2.5 text-right">Desvio (%)</th>
                              <th className="p-2.5 text-right">Produtivo (h)</th>
                              <th className="p-2.5 text-right">Paradas (h)</th>
                              <th className="p-2.5">Motivo Parada</th>
                              <th className="p-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {centerOrders.length === 0 ? (
                              <tr>
                                <td colSpan={12} className="p-6 text-center text-slate-500 italic">
                                  Nenhum apontamento com produtividade apurada para este centro
                                  produtivo no período.
                                </td>
                              </tr>
                            ) : (
                              centerOrders.map((ord, idx) => (
                                <tr key={`${ord.opNumber}-${idx}`} className="hover:bg-slate-50/80">
                                  <td className="p-2.5 font-bold font-mono text-slate-900">
                                    {ord.opNumber}
                                  </td>
                                  <td
                                    className="p-2.5 max-w-[180px] truncate"
                                    title={ord.materialDescription}
                                  >
                                    {ord.materialDescription}
                                  </td>
                                  <td className="p-2.5 font-mono">{ord.bitola || '-'}</td>
                                  <td className="p-2.5 text-right font-mono">
                                    {safeFormatNumber(ord.realizedQuantityTons, 't')}
                                  </td>
                                  <td className="p-2.5 text-right font-mono">
                                    {safeFormatNumber(ord.plannedProductivityTh, 't/h')}
                                  </td>
                                  <td className="p-2.5 text-right font-mono font-bold text-[#004C97]">
                                    {safeFormatNumber(ord.realizedProductivityTh, 't/h')}
                                  </td>
                                  <td
                                    className={`p-2.5 text-right font-mono font-semibold ${
                                      (ord.deviationTh ?? 0) >= 0
                                        ? 'text-emerald-700'
                                        : 'text-rose-700'
                                    }`}
                                  >
                                    {ord.deviationTh !== null && ord.deviationTh !== undefined
                                      ? `${ord.deviationTh > 0 ? '+' : ''}${formatNumberPtBr(ord.deviationTh)} t/h`
                                      : 'N/D'}
                                  </td>
                                  <td
                                    className={`p-2.5 text-right font-mono ${
                                      (ord.deviationPct ?? 0) >= 0
                                        ? 'text-emerald-700'
                                        : 'text-rose-700'
                                    }`}
                                  >
                                    {ord.deviationPct !== null && ord.deviationPct !== undefined
                                      ? `${ord.deviationPct > 0 ? '+' : ''}${formatNumberPtBr(ord.deviationPct)} %`
                                      : 'N/D'}
                                  </td>
                                  <td className="p-2.5 text-right font-mono">
                                    {safeFormatNumber(ord.productiveHours, 'h')}
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-rose-600">
                                    {safeFormatNumber(ord.stoppedHours, 'h')}
                                  </td>
                                  <td
                                    className="p-2.5 max-w-[160px] truncate"
                                    title={ord.mainStopReason}
                                  >
                                    {ord.mainStopReason || '-'}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <Badge
                                      variant={
                                        ord.status === 'DENTRO_PREVISTO'
                                          ? 'outline'
                                          : ord.status === 'ACIMA_PREVISTO'
                                            ? 'default'
                                            : 'destructive'
                                      }
                                      className="text-[10px]"
                                    >
                                      {ord.status}
                                    </Badge>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ABA C: Paradas & Ocorrências */}
                  <TabsContent
                    value="paradas"
                    className="space-y-4 pt-1"
                    data-testid="tab-content-paradas"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                        <span className="text-xs text-slate-500 font-semibold">
                          Tempo Total Parado
                        </span>
                        <div className="text-2xl font-black text-rose-600 mt-1">
                          {center?.stoppedMinutesShift ?? 0} min
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Equivalente a {((center?.stoppedMinutesShift ?? 0) / 60).toFixed(2)} h
                        </span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                        <span className="text-xs text-slate-500 font-semibold">
                          Quantidade de Ocorrências
                        </span>
                        <div className="text-2xl font-black text-slate-900 mt-1">
                          {center?.stopsCountShift ?? center?.stopsHistory?.length ?? 0}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Paradas registradas no MES
                        </span>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                        <span className="text-xs text-slate-500 font-semibold">
                          Impacto Estimado na Produtividade
                        </span>
                        <div className="text-2xl font-black text-amber-600 mt-1">
                          {center?.plannedRatePerHour && (center?.stoppedMinutesShift ?? 0) > 0
                            ? `${formatNumberPtBr(((center.stoppedMinutesShift ?? 0) / 60) * center.plannedRatePerHour)} t`
                            : '0,00 t'}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Volume nominal não produzido
                        </span>
                      </div>
                    </div>

                    {/* Tabela de Paradas com correlação técnica MES 4.0 */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                        <span className="uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-blue-600" />
                          Motivos Informados vs Causas Técnicas MES 4.0
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {center?.stopsHistory?.length ?? 0} parada(s)
                        </span>
                      </div>

                      {center?.stopsHistory && center.stopsHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-3">Código</th>
                                <th className="p-3">Categoria</th>
                                <th className="p-3">Motivo Informado</th>
                                <th className="p-3">Causa Técnica Confirmada</th>
                                <th className="p-3">Equipamento</th>
                                <th className="p-3">Início</th>
                                <th className="p-3">Duração</th>
                                <th className="p-3">Impacto Produtividade</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {center.stopsHistory.map((s) => {
                                const lostVolume =
                                  center?.plannedRatePerHour != null
                                    ? (
                                        (s.durationMinutes / 60) *
                                        center.plannedRatePerHour
                                      ).toFixed(2)
                                    : null
                                return (
                                  <tr key={s.id} className="hover:bg-slate-50/80">
                                    <td className="p-3 font-mono font-semibold text-slate-900">
                                      {s.stopCode}
                                    </td>
                                    <td className="p-3">
                                      <Badge variant="outline" className="text-[11px]">
                                        {s.categoryLabel}
                                      </Badge>
                                    </td>
                                    <td className="p-3 max-w-[200px] truncate" title={s.reason}>
                                      {s.reason}
                                    </td>
                                    <td className="p-3 text-slate-700">
                                      {s.technicalCauseConfirmed || 'Em apuração MES 4.0'}
                                    </td>
                                    <td className="p-3 text-slate-600">{s.equipment || '-'}</td>
                                    <td className="p-3 text-slate-600">
                                      {formatModalTime(s.startDatetime, false)}
                                    </td>
                                    <td className="p-3 font-bold text-slate-900">
                                      {s.durationMinutes} min
                                    </td>
                                    <td className="p-3 font-mono text-amber-700 font-semibold">
                                      {lostVolume
                                        ? `-${formatNumberPtBr(Number(lostVolume))} t`
                                        : 'N/D'}
                                    </td>
                                    <td className="p-3">
                                      {s.isOpen ? (
                                        <Badge className="bg-rose-600 text-white">Ativa</Badge>
                                      ) : (
                                        <Badge variant="secondary">Encerrada</Badge>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-500 italic">
                          Nenhuma parada ou ocorrência registrada para este centro produtivo.
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* ABA D: Indicadores */}
                  <TabsContent
                    value="indicadores"
                    className="space-y-4 pt-1"
                    data-testid="tab-content-indicadores"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* OEE */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">OEE do Centro</span>
                          <Badge variant="outline" className="text-xs font-bold text-blue-700">
                            Meta: {safeFormatNumber(center?.oee?.target, '%')}
                          </Badge>
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900">
                          {safeFormatNumber(center?.oee?.value, '%')}
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1">
                          {center?.oee?.trend === 'UP' ? (
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-rose-600" />
                          )}
                          <span>
                            Diferença:{' '}
                            {center?.oee?.difference !== null &&
                            center?.oee?.difference !== undefined
                              ? `${formatNumberPtBr(center.oee.difference)} p.p.`
                              : 'N/D'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 border-t pt-2">
                          Origem: {center?.oee?.origin || 'MES 4.0 / Apontamento Real'} |
                          Atualizado: {formatModalTime(center?.oee?.timestamp)}
                        </div>
                      </div>

                      {/* Taxa de Utilização */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">
                            Taxa de Utilização
                          </span>
                          <Badge variant="outline" className="text-xs font-bold text-blue-700">
                            Meta: {safeFormatNumber(center?.utilization?.target, '%')}
                          </Badge>
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900">
                          {safeFormatNumber(center?.utilization?.value, '%')}
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-1">
                          {center?.utilization?.trend === 'UP' ? (
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-rose-600" />
                          )}
                          <span>
                            Diferença:{' '}
                            {center?.utilization?.difference !== null &&
                            center?.utilization?.difference !== undefined
                              ? `${formatNumberPtBr(center.utilization.difference)} p.p.`
                              : 'N/D'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 border-t pt-2">
                          Origem: {center?.utilization?.origin || 'PCP / Horas Produtivas'} |
                          Atualizado: {formatModalTime(center?.utilization?.timestamp)}
                        </div>
                      </div>

                      {/* Rendimento Metálico */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">
                            Rendimento Metálico
                          </span>
                          <Badge variant="outline" className="text-xs font-bold text-blue-700">
                            Meta: {safeFormatNumber(center?.metallicYield?.targetPct, '%')}
                          </Badge>
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900">
                          {safeFormatNumber(center?.metallicYield?.yieldPct, '%')}
                        </div>
                        <div className="text-xs text-slate-600">
                          Perda estimada:{' '}
                          {safeFormatNumber(center?.metallicYield?.estimatedLossTons, 't')}
                        </div>
                        <div className="text-[11px] text-slate-400 border-t pt-2">
                          Entrada: {safeFormatNumber(center?.metallicYield?.weightInputTons, 't')} |
                          Boa: {safeFormatNumber(center?.metallicYield?.weightGoodProductTons, 't')}
                        </div>
                      </div>
                    </div>

                    {/* Atingimento da Programação & Produtividade */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Atingimento da Programação Vigente
                        </span>
                        <div className="text-2xl font-black text-emerald-600">
                          {safeFormatNumber(center?.achievementPct, '%')}
                        </div>
                        <p className="text-xs text-slate-600">
                          {safeFormatNumber(center?.realizedTons, 't')} produzidas frente à
                          programação nominal de {safeFormatNumber(center?.programmedTons, 't')}.
                        </p>
                      </div>

                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                          Produtividade Média Ponderada do Centro
                        </span>
                        <div className="text-2xl font-black text-[#004C97]">
                          {safeFormatNumber(
                            centerProductivityConsolidated?.realizedProductivityTh,
                            't/h',
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          Meta ponderada:{' '}
                          {safeFormatNumber(
                            centerProductivityConsolidated?.plannedProductivityTh,
                            't/h',
                          )}{' '}
                          (Desvio:{' '}
                          {centerProductivityConsolidated?.deviationTh != null
                            ? `${centerProductivityConsolidated.deviationTh > 0 ? '+' : ''}${formatNumberPtBr(centerProductivityConsolidated.deviationTh)} t/h`
                            : 'N/D'}
                          ).
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ABA E: Diagnóstico IA */}
                  <TabsContent
                    value="diagnostico_ia"
                    className="space-y-4 pt-1"
                    data-testid="tab-content-diagnostico-ia"
                  >
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 text-[#004C97] font-bold text-sm">
                          <Sparkles className="w-4 h-4 text-[#004C97] animate-pulse" />
                          Diagnóstico IA — Centro Produtivo{' '}
                          {center?.centerName || center?.centerCode}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[11px] bg-slate-50 text-slate-700"
                          >
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
                          {/* 1. Resumo Operacional do Centro (Separando FATOS, HIPÓTESES e RECOMENDAÇÕES) */}
                          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 space-y-3">
                            <div className="font-bold text-[#004C97] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              1. Resumo Operacional do Centro (FATOS • HIPÓTESES • RECOMENDAÇÕES)
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* FATOS */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                                <span className="font-bold text-slate-700 block text-[11px]">
                                  FATOS MEDIDOS:
                                </span>
                                <p className="text-slate-700 leading-relaxed">
                                  {aiReport.executiveSummary ||
                                    'Sem dados suficientes para concluir a causa com segurança.'}
                                </p>
                              </div>

                              {/* HIPÓTESES */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                                <span className="font-bold text-amber-800 block text-[11px]">
                                  HIPÓTESES TÉCNICAS:
                                </span>
                                <ul className="list-disc pl-4 space-y-1 text-slate-700 leading-relaxed">
                                  {aiReport.probableLossCauses.map((cause, idx) => (
                                    <li key={idx}>{cause}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* RECOMENDAÇÕES */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1">
                                <span className="font-bold text-[#004C97] block text-[11px]">
                                  RECOMENDAÇÃO IMEDIATA:
                                </span>
                                <p className="text-slate-700 leading-relaxed">
                                  {aiSummary?.nextActionAdvice ||
                                    'Sem dados suficientes para concluir a causa com segurança.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 2. Principais Desvios & Ordens com Maior Perda */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                              <div className="font-bold text-rose-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                                2. Ordens com Maior Perda de Produtividade
                              </div>
                              {aiReport.highestNegativeDeviationOrders.length === 0 ? (
                                <p className="text-slate-500 italic">
                                  Sem dados suficientes para concluir a causa com segurança.
                                </p>
                              ) : (
                                <ul className="space-y-1.5 divide-y divide-slate-200/60">
                                  {aiReport.highestNegativeDeviationOrders.map((o, idx) => (
                                    <li key={idx} className="pt-1.5 first:pt-0">
                                      <div className="flex items-center justify-between font-semibold">
                                        <span className="font-mono text-slate-800">
                                          OP {o.opNumber}
                                        </span>
                                        <span className="font-mono text-rose-600">
                                          {formatNumberPtBr(o.deviationTh)} t/h
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 truncate">
                                        {o.material} • Real: {formatNumberPtBr(o.realizedRate)} t/h
                                        vs Plan: {formatNumberPtBr(o.plannedRate)} t/h
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* 3. Correlação Paradas × Desempenho */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                3. Correlação Paradas × Desempenho
                              </div>
                              {aiReport.stopsCorrelation.length === 0 ? (
                                <p className="text-slate-500 italic">
                                  Sem dados suficientes para concluir a causa com segurança.
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

                          {/* 4. Recomendações Segmentadas para PCP / Operação / Manutenção */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                            <div className="font-bold text-[#004C97] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                              <Wrench className="w-3.5 h-3.5 text-[#004C97]" />
                              4. Recomendações Segmentadas (PCP • Operação • Manutenção)
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                              {/* PCP */}
                              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-2xs">
                                <span className="font-bold text-[#004C97] block text-[11px]">
                                  PCP / Programação:
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
                          Sem dados suficientes para concluir a causa com segurança.
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </div>

        {/* Rodapé Fixo */}
        <DialogFooter className="px-6 py-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Padrão Industrial ABNT • HUB CIAFAL • Ponderação Real por Tempo Produtivo
          </div>
          <Button
            variant="default"
            onClick={() => onOpenChange(false)}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RealtimeDrilldownModal

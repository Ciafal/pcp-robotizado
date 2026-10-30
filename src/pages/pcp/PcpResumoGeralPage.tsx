import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import pb from '@/lib/pocketbase/client'
import { mpSdcService } from '@/services/mp-sidercentro-service'
import {
  mpMultipleCuttingPlansService,
  type MPMultipleCuttingPlanRecord,
} from '@/services/mp-dimensional-notes-service'
import { rawMaterialInventoryService } from '@/services/pcp-raw-material-inventory-service'
import type { MPInventoryHeader } from '@/types/pcp-mp-inventory'
import { formatTons3Decimals, formatNumberPTBR } from '@/lib/formatters-ptbr'
import { formatTonsSdc } from '@/lib/number-format'
import type { MPSdcSteelMatrixRow, MPSdcL2PlannedVsRealized } from '@/types/mp-optimization'

interface WeeklyScheduleItem {
  id: string
  schedule_code?: string
  line_code?: string
  planned_quantity_tons?: number
  realized_quantity_tons?: number
  status?: string
  lifecycle_stage?: string
  material_code?: string
  material_description?: string
}

export function PcpResumoGeralPage() {
  const navigate = useNavigate()

  // Estados de dados
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('TODAS')

  // Dados carregados dos services reais
  const [sdcMatrix, setSdcMatrix] = useState<MPSdcSteelMatrixRow[]>([])
  const [sdcL2Data, setSdcL2Data] = useState<MPSdcL2PlannedVsRealized[]>([])
  const [cuttingPlans, setCuttingPlans] = useState<MPMultipleCuttingPlanRecord[]>([])
  const [inventoryOrders, setInventoryOrders] = useState<MPInventoryHeader[]>([])
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleItem[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<string>('')

  // Carregamento consolidado das coleções reais
  const loadDashboardData = useCallback(async () => {
    try {
      setFetchError(null)

      const [matrixRes, l2Res, plansRes, inventoryRes, schedulesRes] = await Promise.allSettled([
        // 1. Matriz de Estoque SDC
        mpSdcService.getSteelMatrixRows(),
        // 2. Previsto x Realizado L2 da SDC
        pb
          .collection('mp_sdc_l2_planned_vs_realized')
          .getFullList<MPSdcL2PlannedVsRealized>({ sort: '-created' })
          .catch(async () => {
            return await mpSdcService.getL2PlannedVsRealized()
          }),
        // 3. Planos de Corte Reais
        mpMultipleCuttingPlansService.listPlans(),
        // 4. Ordens de Inventário de MP
        rawMaterialInventoryService.listInventoryOrders(),
        // 5. Programações semanais ativas
        pb
          .collection('weekly_schedules')
          .getFullList<WeeklyScheduleItem>({
            filter: 'lifecycle_stage = "PROGRAMADO" || status = "DRAFT"',
            sort: '-created',
          })
          .catch(() => []),
      ])

      // 1. Matriz SDC
      if (matrixRes.status === 'fulfilled' && Array.isArray(matrixRes.value)) {
        setSdcMatrix(matrixRes.value)
      } else {
        setSdcMatrix([])
      }

      // 2. L2 Previsto x Realizado
      if (l2Res.status === 'fulfilled' && Array.isArray(l2Res.value)) {
        setSdcL2Data(l2Res.value)
      } else {
        setSdcL2Data([])
      }

      // 3. Planos de Corte
      if (plansRes.status === 'fulfilled' && Array.isArray(plansRes.value)) {
        setCuttingPlans(plansRes.value)
      } else {
        setCuttingPlans([])
      }

      // 4. Inventário MP
      if (inventoryRes.status === 'fulfilled' && Array.isArray(inventoryRes.value)) {
        setInventoryOrders(inventoryRes.value)
      } else {
        setInventoryOrders([])
      }

      // 5. Programação Semanal
      if (schedulesRes.status === 'fulfilled' && Array.isArray(schedulesRes.value)) {
        setWeeklySchedules(schedulesRes.value)
      } else {
        setWeeklySchedules([])
      }

      setLastSyncTime(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      )
    } catch (err: any) {
      console.warn('[PcpResumoGeralPage] Erro ao carregar dados consolidados:', err)
      setFetchError('Não foi possível carregar alguns indicadores operacionais.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadDashboardData()
  }

  // Cálculos Agregados de MP e Estoque SDC
  const mpStats = useMemo(() => {
    if (!sdcMatrix || sdcMatrix.length === 0) {
      return {
        totalStockTons: null,
        stockDs03Tons: null,
        stockCiafalTons: null,
        lowStockItems: [],
        criticalItemsCount: 0,
        averageCoverageDays: null,
      }
    }

    let totalStock = 0
    let ds03Total = 0
    let ciafalTotal = 0
    let coverageDaysSum = 0
    let coverageCount = 0

    const lowStock: Array<{
      material: string
      grade: string
      stock: number
      minStock: number
      deficit: number
      status: string
    }> = []

    for (const row of sdcMatrix) {
      const stock = Number(row.total_stock_tons) || 0
      const ds03 = Number(row.stock_sdc_ds03_tons) || 0
      const ciafal = Number(row.stock_ciafal_dp04_tons) || 0
      const min = Number(row.min_stock_tons) || 0

      totalStock += stock
      ds03Total += ds03
      ciafalTotal += ciafal

      if (typeof row.statistical_coverage_days === 'number' && row.statistical_coverage_days > 0) {
        coverageDaysSum += row.statistical_coverage_days
        coverageCount += 1
      }

      if (
        stock < min ||
        row.rupture_risk_level === 'LARANJA' ||
        row.rupture_risk_level === 'AMARELO'
      ) {
        lowStock.push({
          material: row.material_code,
          grade: row.steel_grade,
          stock,
          minStock: min,
          deficit: Math.max(0, min - stock),
          status: row.auto_conclusion || 'ESTOQUE_ABAIXO_MINIMO',
        })
      }
    }

    return {
      totalStockTons: totalStock,
      stockDs03Tons: ds03Total,
      stockCiafalTons: ciafalTotal,
      lowStockItems: lowStock,
      criticalItemsCount: lowStock.length,
      averageCoverageDays: coverageCount > 0 ? Math.round(coverageDaysSum / coverageCount) : null,
    }
  }, [sdcMatrix])

  // Cálculos Agregados de Planos de Corte
  const cuttingPlanStats = useMemo(() => {
    if (!cuttingPlans || cuttingPlans.length === 0) {
      return {
        total: 0,
        byStatus: {
          Rascunho: 0,
          'Em Revisão': 0,
          Aprovado: 0,
          Liberado: 0,
          Executado: 0,
          Cancelado: 0,
        },
        pendingApprovalCount: 0,
        averageYield: null as number | null,
        recentPlans: [] as MPMultipleCuttingPlanRecord[],
      }
    }

    const counts: Record<string, number> = {
      Rascunho: 0,
      'Em Revisão': 0,
      Aprovado: 0,
      Liberado: 0,
      Executado: 0,
      Cancelado: 0,
    }

    let yieldSum = 0
    let yieldCount = 0

    for (const plan of cuttingPlans) {
      const st = plan.status || 'Rascunho'
      counts[st] = (counts[st] || 0) + 1

      if (typeof plan.cutting_yield_pct === 'number' && plan.cutting_yield_pct > 0) {
        yieldSum += plan.cutting_yield_pct
        yieldCount += 1
      }
    }

    const pendingApproval = (counts['Rascunho'] || 0) + (counts['Em Revisão'] || 0)
    const avgYield = yieldCount > 0 ? Number((yieldSum / yieldCount).toFixed(2)) : null

    // Ordena os 4 planos mais recentes
    const sorted = [...cuttingPlans].sort((a, b) => {
      const dateA = a.created ? new Date(a.created).getTime() : 0
      const dateB = b.created ? new Date(b.created).getTime() : 0
      return dateB - dateA
    })

    return {
      total: cuttingPlans.length,
      byStatus: counts,
      pendingApprovalCount: pendingApproval,
      averageYield: avgYield,
      recentPlans: sorted.slice(0, 4),
    }
  }, [cuttingPlans])

  // Cálculos Agregados de Inventário de MP
  const inventoryStats = useMemo(() => {
    if (!inventoryOrders || inventoryOrders.length === 0) {
      return {
        total: 0,
        openCount: 0,
        partialCount: 0,
        completedCount: 0,
        recentOrders: [] as MPInventoryHeader[],
      }
    }

    let open = 0
    let partial = 0
    let completed = 0

    for (const order of inventoryOrders) {
      const s = (order.status || '').toLowerCase()
      if (s.includes('abert') || s.includes('pendent')) {
        open += 1
      } else if (s.includes('parcial')) {
        partial += 1
      } else if (s.includes('conclu')) {
        completed += 1
      }
    }

    return {
      total: inventoryOrders.length,
      openCount: open,
      partialCount: partial,
      completedCount: completed,
      recentOrders: inventoryOrders.slice(0, 4),
    }
  }, [inventoryOrders])

  // Cálculos Agregados de Programação Semanal & L2
  const productionStats = useMemo(() => {
    const filteredSchedules =
      selectedLineFilter === 'TODAS'
        ? weeklySchedules
        : weeklySchedules.filter((s) => s.line_code === selectedLineFilter)

    let totalPlannedTons = 0
    let totalRealizedTons = 0

    for (const s of filteredSchedules) {
      totalPlannedTons += Number(s.planned_quantity_tons) || 0
      totalRealizedTons += Number(s.realized_quantity_tons) || 0
    }

    // Previsto x Realizado L2 (se houver dados reais)
    const hasL2Data = sdcL2Data && sdcL2Data.length > 0
    let l2PlannedTotal = 0
    let l2RealizedTotal = 0
    let l2AdherenceSum = 0
    let l2Count = 0

    if (hasL2Data) {
      for (const item of sdcL2Data) {
        l2PlannedTotal += Number(item.planned_l2_tons) || 0
        l2RealizedTotal += Number(item.realized_l2_tons) || 0
        if (typeof item.adherence_pct === 'number') {
          l2AdherenceSum += item.adherence_pct
          l2Count += 1
        }
      }
    }

    const avgL2Adherence = l2Count > 0 ? Number((l2AdherenceSum / l2Count).toFixed(1)) : null

    return {
      totalPlannedTons: filteredSchedules.length > 0 ? totalPlannedTons : null,
      totalRealizedTons: filteredSchedules.length > 0 ? totalRealizedTons : null,
      schedulesCount: filteredSchedules.length,
      hasL2Data,
      l2PlannedTotal: hasL2Data ? l2PlannedTotal : null,
      l2RealizedTotal: hasL2Data ? l2RealizedTotal : null,
      avgL2Adherence,
    }
  }, [weeklySchedules, sdcL2Data, selectedLineFilter])

  // Skeleton de Carregamento Inicial
  if (isLoading) {
    return (
      <div
        className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto animate-pulse"
        data-testid="resumo-geral-skeleton"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-slate-200" />
            <Skeleton className="h-4 w-96 bg-slate-200" />
          </div>
          <Skeleton className="h-10 w-36 bg-slate-200" />
        </div>

        {/* KPI Strip Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((idx) => (
            <Skeleton key={idx} className="h-28 rounded-xl bg-slate-200" />
          ))}
        </div>

        {/* Panels Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl bg-slate-200" />
          <Skeleton className="h-72 rounded-xl bg-slate-200" />
          <Skeleton className="h-72 rounded-xl bg-slate-200" />
          <Skeleton className="h-72 rounded-xl bg-slate-200" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto bg-slate-50/50 min-h-screen"
      data-testid="pcp-resumo-geral-page"
    >
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5 bg-white p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-lg bg-[#004C97]/10 text-[#004C97]">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Resumo Geral — PCP Robotizado
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
            >
              Snapshot Operacional Oficial
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Visão consolidada multi-módulos: Matéria-Prima, Planos de Corte, Inventário DP07 e
            Programação L1/L2.
          </p>
        </div>

        {/* AÇÕES E FILTRO SIMPLES */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Atualizado: {lastSyncTime || 'Agora'}</span>
          </div>

          <div className="flex items-center gap-1 border border-slate-200 rounded-lg bg-white p-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              aria-label="Filtrar por Linha"
              value={selectedLineFilter}
              onChange={(e) => setSelectedLineFilter(e.target.value)}
              className="text-xs text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer font-medium py-1 px-1"
            >
              <option value="TODAS">Todas as Linhas</option>
              <option value="L1">Linha L1</option>
              <option value="L2">Linha L2</option>
              <option value="SDC">Corte e Dobra SDC</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5 border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Recarregar'}
          </Button>
        </div>
      </div>

      {/* ALERTA DE ERRO RECUPERÁVEL (SEM STACK TRACE) */}
      {fetchError && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex items-center justify-between gap-3 text-amber-800 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchError} Alguns dados podem estar operando em modo offline.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-50 h-7"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* KPI STRIP SUPERIOR (5 INDICADORES AGREGADOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: MP Total em Estoque */}
        <Card className="border-slate-200 shadow-xs hover:border-[#004C97]/40 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>MP em Estoque</span>
              <Boxes className="w-4 h-4 text-[#004C97]" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {mpStats.totalStockTons !== null ? (
                formatTons3Decimals(mpStats.totalStockTons)
              ) : (
                <span className="text-xs font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Dado não disponível
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {mpStats.stockDs03Tons !== null
                ? `Depósito DS03: ${formatTonsSdc(mpStats.stockDs03Tons)}`
                : 'Sincronização SAP pendente'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Materiais em Estoque Baixo / Ruptura */}
        <Card className="border-slate-200 shadow-xs hover:border-amber-400/40 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Estoque Baixo / Risco</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{mpStats.criticalItemsCount}</span>
              <span className="text-xs font-medium text-slate-500">materiais</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {mpStats.criticalItemsCount > 0
                ? 'Abaixo do estoque mínimo'
                : 'Estoque em níveis regulares'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Planos de Corte Cadastrados */}
        <Card className="border-slate-200 shadow-xs hover:border-[#004C97]/40 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Planos de Corte</span>
              <FileSpreadsheet className="w-4 h-4 text-[#004C97]" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{cuttingPlanStats.total}</span>
              {cuttingPlanStats.pendingApprovalCount > 0 && (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] font-semibold">
                  {cuttingPlanStats.pendingApprovalCount} pendentes
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {cuttingPlanStats.averageYield !== null
                ? `Rendimento médio: ${formatNumberPTBR(cuttingPlanStats.averageYield, 1)}%`
                : 'Planos sem rendimento apurado'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Inventário DP07 (Ciclos/Ordens) */}
        <Card className="border-slate-200 shadow-xs hover:border-[#004C97]/40 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Inventário MP (DP07)</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{inventoryStats.total}</span>
              <span className="text-xs font-medium text-slate-500">ordens</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {inventoryStats.openCount > 0
                ? `${inventoryStats.openCount} ciclos abertos para contagem`
                : 'Nenhum ciclo pendente'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: Volume Programado */}
        <Card className="border-slate-200 shadow-xs hover:border-[#004C97]/40 transition-colors">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Volume Programado</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              {productionStats.totalPlannedTons !== null ? (
                formatTons3Decimals(productionStats.totalPlannedTons)
              ) : (
                <span className="text-xs font-normal text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Dado não disponível
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {productionStats.schedulesCount > 0
                ? `${productionStats.schedulesCount} lotes na programação ativa`
                : 'Sem lotes programados no filtro'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GRID DE PAINÉIS POR DOMÍNIO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PAINEL 1: MATÉRIA-PRIMA & ESTOQUE SDC */}
        <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#004C97]" />
                  Matéria-Prima & Sidercentro (SDC)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Disponibilidade física, estoques críticos e rupturas projetadas.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pcp/gestao-materia-prima')}
                className="text-xs text-[#004C97] hover:text-[#003d7a] hover:bg-slate-50 gap-1 font-semibold"
              >
                Acessar MP <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {sdcMatrix.length === 0 ? (
                <SapEmptyState
                  title="Estoque SAP não sincronizado"
                  description="Não foram encontrados dados de estoque da Sidercentro (SDC) cadastrados ou integrados via SAP ECC."
                  actionLabel="Ir para Gestão de MP"
                  onAction={() => {
                    navigate('/pcp/gestao-materia-prima')
                  }}
                />
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
                    <div>
                      <div className="text-[11px] text-slate-500">Estoque DS03</div>
                      <div className="text-sm font-bold text-slate-800">
                        {mpStats.stockDs03Tons !== null
                          ? formatTons3Decimals(mpStats.stockDs03Tons)
                          : 'Dado não disponível'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">CIAFAL Elegível</div>
                      <div className="text-sm font-bold text-slate-800">
                        {mpStats.stockCiafalTons !== null
                          ? formatTons3Decimals(mpStats.stockCiafalTons)
                          : 'Dado não disponível'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Cobertura Média</div>
                      <div className="text-sm font-bold text-slate-800">
                        {mpStats.averageCoverageDays !== null
                          ? `${mpStats.averageCoverageDays} dias`
                          : 'Dado não disponível'}
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Materiais em Atenção */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Materiais com Alerta de Estoque:</span>
                      <span className="text-[11px] text-slate-500">
                        {mpStats.lowStockItems.length} identificados
                      </span>
                    </div>

                    {mpStats.lowStockItems.length === 0 ? (
                      <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Todos os materiais cadastrados estão com cobertura acima do estoque
                          mínimo.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {mpStats.lowStockItems.slice(0, 4).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs hover:bg-slate-50 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-900">{item.material}</span>
                              <span className="text-[10px] text-slate-500 ml-1.5">
                                Aço: {item.grade}
                              </span>
                            </div>
                            <div className="text-right space-y-0.5">
                              <div className="font-bold text-amber-700">
                                {formatTons3Decimals(item.stock)}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Mín: {formatTons3Decimals(item.minStock)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </div>

          <div className="p-4 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pcp/analise-carteira/sdc')}
              className="w-full text-xs text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Ver Matriz Completa de Matéria-Prima SDC</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </Card>

        {/* PAINEL 2: PLANOS DE CORTE (OTIMIZAÇÃO MP) */}
        <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#004C97]" />
                  Planos de Corte de Matéria-Prima
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Planos cadastrados, status de aprovação e aproveitamento dimensional.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pcp/gestao-materia-prima/planos-corte')}
                className="text-xs text-[#004C97] hover:text-[#003d7a] hover:bg-slate-50 gap-1 font-semibold"
              >
                Planos de Corte <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {cuttingPlans.length === 0 ? (
                <div className="p-6 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-700">
                      Nenhum plano de corte registrado
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Gere novos planos de múltiplos ou blocos pelo módulo de Otimização MP.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate('/pcp/gestao-materia-prima/planos-corte')}
                    className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs"
                  >
                    Novo Plano de Corte
                  </Button>
                </div>
              ) : (
                <>
                  {/* Distribuição por status */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-medium">Rascunho</div>
                      <div className="text-sm font-bold text-slate-800">
                        {cuttingPlanStats.byStatus['Rascunho'] || 0}
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200/60 p-2 rounded-lg">
                      <div className="text-[10px] text-amber-700 font-medium">Em Revisão</div>
                      <div className="text-sm font-bold text-amber-800">
                        {cuttingPlanStats.byStatus['Em Revisão'] || 0}
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200/60 p-2 rounded-lg">
                      <div className="text-[10px] text-blue-700 font-medium">Aprovado</div>
                      <div className="text-sm font-bold text-blue-800">
                        {cuttingPlanStats.byStatus['Aprovado'] || 0}
                      </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200/60 p-2 rounded-lg">
                      <div className="text-[10px] text-emerald-700 font-medium">Liberado</div>
                      <div className="text-sm font-bold text-emerald-800">
                        {cuttingPlanStats.byStatus['Liberado'] || 0}
                      </div>
                    </div>
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-medium">Executado</div>
                      <div className="text-sm font-bold text-slate-800">
                        {cuttingPlanStats.byStatus['Executado'] || 0}
                      </div>
                    </div>
                    <div className="bg-rose-50 border border-rose-200/60 p-2 rounded-lg">
                      <div className="text-[10px] text-rose-700 font-medium">Cancelado</div>
                      <div className="text-sm font-bold text-rose-800">
                        {cuttingPlanStats.byStatus['Cancelado'] || 0}
                      </div>
                    </div>
                  </div>

                  {/* Planos Recentes */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Últimos Planos Gerados:</span>
                      <span className="text-[11px] text-slate-500">Histórico oficial</span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {cuttingPlanStats.recentPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#004C97]">
                                {plan.plan_code || 'PCM-SEM-CODIGO'}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1">
                                v{plan.version || 1}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                              {plan.material_description || plan.material_code || 'Matéria-Prima'}
                            </p>
                          </div>
                          <div className="text-right space-y-0.5">
                            <Badge
                              className={`text-[10px] font-medium ${
                                plan.status === 'Aprovado' || plan.status === 'Liberado'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : plan.status === 'Em Revisão'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {plan.status || 'Rascunho'}
                            </Badge>
                            {plan.cutting_yield_pct !== undefined &&
                              plan.cutting_yield_pct !== null && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  Rend: {formatNumberPTBR(plan.cutting_yield_pct, 1)}%
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </div>

          <div className="p-4 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pcp/gestao-materia-prima/planos-corte')}
              className="w-full text-xs text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Acessar Aba de Histórico de Planos</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </Card>

        {/* PAINEL 3: INVENTÁRIO DE MP (DP07) */}
        <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Inventário de Matéria-Prima (DP07)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Ciclos de contagem física, conferência WMS e divergências.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pcp/sequenciamento/inventario-mp')}
                className="text-xs text-[#004C97] hover:text-[#003d7a] hover:bg-slate-50 gap-1 font-semibold"
              >
                Inventário <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {inventoryOrders.length === 0 ? (
                <div className="p-6 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-700">
                      Sem ordens de inventário registradas
                    </p>
                    <p className="text-[11px] text-slate-500">
                      As ordens de inventário são geradas pela confirmação do enfornamento frio.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/pcp/sequenciamento/inventario-mp')}
                    className="text-xs"
                  >
                    Ir para Inventário de MP
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
                    <div>
                      <div className="text-[11px] text-slate-500">Ciclos Abertos</div>
                      <div className="text-sm font-bold text-amber-700">
                        {inventoryStats.openCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Contagens Parciais</div>
                      <div className="text-sm font-bold text-indigo-700">
                        {inventoryStats.partialCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Concluídos</div>
                      <div className="text-sm font-bold text-emerald-700">
                        {inventoryStats.completedCount}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Últimas Ordens de Inventário:</span>
                      <span className="text-[11px] text-slate-500">Registros em tempo real</span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {inventoryStats.recentOrders.map((ord: any) => (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs hover:bg-slate-50 transition-colors"
                        >
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-900">
                              Linha {ord.line || 'L1'} • {ord.schedule_date || 'Data não informada'}
                            </span>
                            <div className="text-[11px] text-slate-500">
                              Versão {ord.schedule_version || 1} • {ord.total_items_count || 0}{' '}
                              itens
                            </div>
                          </div>
                          <Badge
                            className={`text-[10px] font-medium ${
                              ord.status === 'Concluído'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'Parcial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.status || 'Aberto'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </div>

          <div className="p-4 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pcp/sequenciamento/inventario-mp')}
              className="w-full text-xs text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Gerenciar Ciclos de Inventário e Reabertura</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </Card>

        {/* PAINEL 4: PRODUÇÃO & PREVISTO X REALIZADO L2 */}
        <Card className="border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  Produção & Previsto x Realizado L2
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Aderência das campanhas, balanceamento fabril e apontamentos MES.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pcp/sequenciamento/montagem-semanal')}
                className="text-xs text-[#004C97] hover:text-[#003d7a] hover:bg-slate-50 gap-1 font-semibold"
              >
                Montagem Semanal <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {productionStats.hasL2Data ? (
                <>
                  <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center">
                    <div>
                      <div className="text-[11px] text-slate-500">Planejado L2</div>
                      <div className="text-sm font-bold text-slate-800">
                        {productionStats.l2PlannedTotal !== null
                          ? formatTons3Decimals(productionStats.l2PlannedTotal)
                          : 'Dado não disponível'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Realizado L2</div>
                      <div className="text-sm font-bold text-emerald-700">
                        {productionStats.l2RealizedTotal !== null
                          ? formatTons3Decimals(productionStats.l2RealizedTotal)
                          : 'Dado não disponível'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Aderência Média</div>
                      <div className="text-sm font-bold text-slate-800">
                        {productionStats.avgL2Adherence !== null
                          ? `${formatNumberPTBR(productionStats.avgL2Adherence, 1)}%`
                          : 'Dado não disponível'}
                      </div>
                    </div>
                  </div>

                  {/* Lista de Itens L2 */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {sdcL2Data.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {item.material_description || item.material_code}
                          </span>
                          <Badge
                            className={`text-[10px] ${
                              item.traffic_light === 'VERDE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.traffic_light === 'AMARELO'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.adherence_pct !== undefined
                              ? `${formatNumberPTBR(item.adherence_pct, 1)}% aderência`
                              : 'Sem %'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Prev: {formatTons3Decimals(item.planned_l2_tons || 0)} | Real:{' '}
                            {formatTons3Decimals(item.realized_l2_tons || 0)}
                          </span>
                          <span className="text-slate-400">Ref: {item.period_ref || 'W35'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : weeklySchedules.length > 0 ? (
                <>
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-[#004C97] flex items-center justify-between">
                      <span>Programação Ativa L1 / L2</span>
                      <Badge variant="outline" className="text-[10px] bg-white">
                        {productionStats.schedulesCount} lotes
                      </Badge>
                    </div>
                    <p className="text-slate-600">
                      Volume total alocado na malha:{' '}
                      <strong className="text-slate-900">
                        {productionStats.totalPlannedTons !== null
                          ? formatTons3Decimals(productionStats.totalPlannedTons)
                          : 'Dado não disponível'}
                      </strong>
                    </p>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {weeklySchedules.slice(0, 3).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900">
                            Linha {s.line_code || 'L1'} •{' '}
                            {s.material_description || s.material_code}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            Código: {s.schedule_code || 'WS-L1-2026'}
                          </div>
                        </div>
                        <div className="font-bold text-slate-800">
                          {formatTons3Decimals(s.planned_quantity_tons || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <SapEmptyState
                  title="Dado não disponível"
                  description="Não há apontamentos de Previsto x Realizado L2 nem lotes cadastrados na programação semanal atual."
                  actionLabel="Acessar Montagem Semanal"
                  onAction={() => {
                    navigate('/pcp/sequenciamento/montagem-semanal')
                  }}
                />
              )}
            </CardContent>
          </div>

          <div className="p-4 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/pcp/analise-real-time')}
              className="w-full text-xs text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Abrir Monitor de Análise Real Time</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
        </Card>
      </div>

      {/* RODAPÉ INFORMATIVO COM LINKS DIRETOS PARA MÓDULOS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#004C97]" />
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              Acesso Rápido aos Módulos Operacionais do PCP Robotizado
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">CIAFAL Wilson Santos S/A</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pcp/gestao-materia-prima')}
            className="text-xs justify-start gap-1.5 h-9 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <Boxes className="w-3.5 h-3.5 text-[#004C97]" />
            Gestão de MP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pcp/gestao-materia-prima/planos-corte')}
            className="text-xs justify-start gap-1.5 h-9 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#004C97]" />
            Planos de Corte
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pcp/sequenciamento/inventario-mp')}
            className="text-xs justify-start gap-1.5 h-9 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            Inventário MP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pcp/analise-carteira/sdc')}
            className="text-xs justify-start gap-1.5 h-9 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Carteira SDC
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PcpResumoGeralPage

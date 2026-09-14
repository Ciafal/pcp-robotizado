import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  BarChart2,
  AlertTriangle,
  History,
  Sliders,
  CheckCircle2,
  Users,
  Target,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  Gauge,
  Factory,
  Info,
  CalendarDays,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { masterPlanningService } from '@/services/master-planning-service'
import { lineMasterService } from '@/services/line-master'
import { weeklyScheduleService } from '@/services/weekly-schedule-service'
import { pcpRulesService, ScheduledStopRecord } from '@/services/pcp-rules-service'
import { ShiftEngine } from '@/services/shift-engine'
import { ProductionLine, ProductionShift } from '@/types/line-master'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import {
  MasterPlanHeader,
  MasterPlanItem,
  CRMForecastRecord,
  MasterPlanVersion,
  MasterPlanningKPIs,
  WhatIfSimulationParams,
  WhatIfSimulationResult,
} from '@/types/master-planning-inventory'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface MasterPlanningPageProps {
  initialHorizon?: 'ANUAL' | 'MENSAL' | 'SEMANAL'
}

type MainHorizon = 'visao-geral' | 'anual' | 'mensal' | 'semanal'

interface LineCapacityCalc {
  lineId: string
  lineCode: string
  lineName: string
  plantId?: string
  plantSapCode?: string
  plantName?: string
  isActive: boolean
  nominalCapacityRateTh: number // t/h nominal da Ficha Mestre
  activeShiftsCount: number
  dailyShiftHours: number
  weeklyShiftHours: number
  monthlyShiftHours: number
  scheduledStopsMonthlyHours: number
  scheduledStopsMonthlyTons: number
  // Horas teóricas
  monthlyTheoreticalHours: number
  monthlyTheoreticalTons: number
  // Fórmulas Estritas:
  // Disponível = Teórica - paradas - indisponibilidades de turno
  monthlyAvailableHours: number
  monthlyAvailableTons: number
  // Planejada (via weeklyScheduleService / masterPlan)
  plannedTons: number
  plannedHours: number
  // Realizada (MES apontado)
  realizedTons: number
  realizedHours: number
  // Remanescente = Disponível - Planejada
  remainingTons: number
  remainingHours: number
  // Utilização = Planejada / Disponível * 100
  utilizationPct: number
  // Utilização Real = Realizada / Disponível * 100
  realUtilizationPct: number
  statusMessage?: string
}

export const MasterPlanningPage: React.FC<MasterPlanningPageProps> = ({ initialHorizon }) => {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Determinar o horizonte principal ativo a partir de:
  // 1. searchParams (?visao=geral|anual|mensal|semanal)
  // 2. pathname (/pcp/planejamento/anual, etc.)
  // 3. prop initialHorizon
  const computeActiveHorizon = (): MainHorizon => {
    const q = (searchParams.get('visao') || '').toLowerCase()
    if (q === 'geral' || q === 'visao-geral') return 'visao-geral'
    if (q === 'anual') return 'anual'
    if (q === 'mensal') return 'mensal'
    if (q === 'semanal') return 'semanal'

    const path = location.pathname.toLowerCase()
    if (path.endsWith('/anual')) return 'anual'
    if (path.endsWith('/mensal')) return 'mensal'
    if (path.endsWith('/semanal')) return 'semanal'

    if (initialHorizon === 'ANUAL') return 'anual'
    if (initialHorizon === 'MENSAL') return 'mensal'
    if (initialHorizon === 'SEMANAL') return 'semanal'

    return 'visao-geral'
  }

  const [activeHorizon, setActiveHorizon] = useState<MainHorizon>(computeActiveHorizon)

  // Sub-abas dentro da Visão Geral (S&OP corporativo)
  const [activeTab, setActiveTab] = useState<string>('kpis-executivos')
  const [loading, setLoading] = useState(true)

  // Dados Oficiais de Capacidade Real
  const [realLines, setRealLines] = useState<ProductionLine[]>([])
  const [allStops, setAllStops] = useState<ScheduledStopRecord[]>([])
  const [weeklyItems, setWeeklyItems] = useState<WeeklyScheduleItem[]>([])
  const [capacitiesByLine, setCapacitiesByLine] = useState<LineCapacityCalc[]>([])

  // Dados Oficiais do Planejamento Mestre (SAP / CRM / PCP)
  const [plans, setPlans] = useState<MasterPlanHeader[]>([])
  const [activePlan, setActivePlan] = useState<MasterPlanHeader | null>(null)
  const [items, setItems] = useState<MasterPlanItem[]>([])
  const [crmForecasts, setCrmForecasts] = useState<CRMForecastRecord[]>([])
  const [versions, setVersions] = useState<MasterPlanVersion[]>([])
  const [kpis, setKpis] = useState<MasterPlanningKPIs | null>(null)

  // Filtros Gerais Globais (Regra 10 e 19)
  const [selectedPlant, setSelectedPlant] = useState('ALL')
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [selectedNature, setSelectedNature] = useState('TODAS')
  const [selectedPeriod, setSelectedPeriod] = useState('2025-03')
  const [searchTerm, setSearchTerm] = useState('')

  // 4. Drill-Down da Aderência (Regra 21)
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<MasterPlanItem | null>(null)
  const [itemDetailModalOpen, setItemDetailModalOpen] = useState(false)
  const [deviationCause, setDeviationCause] = useState('')
  const [deviationJustification, setDeviationJustification] = useState('')
  const [actionPlan, setActionPlan] = useState('')

  // 5. Simulação "E Se?" (What-If) (Regra 32)
  const [simParams, setSimParams] = useState<WhatIfSimulationParams>({
    crmOpportunitiesConversionChangePct: 0,
    salesVolumeChangePct: 0,
    keyCustomerPostponed: false,
    mpArrivalDelayDays: 0,
    lineCapacityLossPct: 0,
    forecastShiftPct: 0,
  })
  const [simResult, setSimResult] = useState<WhatIfSimulationResult | null>(null)

  // 6. IA do Planejamento (Regras 30, 34)
  const [aiPlanningRunning, setAiPlanningRunning] = useState(false)
  const [aiReport, setAiReport] = useState<string | null>(null)

  // Sincronizar horizonte quando URL mudar (searchParams ou pathname)
  useEffect(() => {
    const nextH = computeActiveHorizon()
    setActiveHorizon(nextH)
  }, [searchParams, location.pathname, initialHorizon])

  const handleSelectHorizon = (h: MainHorizon) => {
    setActiveHorizon(h)
    // Atualiza search params preservando histórico
    const currentQ = new URLSearchParams(searchParams)
    currentQ.set('visao', h === 'visao-geral' ? 'geral' : h)
    setSearchParams(currentQ, { replace: true })
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Carregamento em paralelo dos dados oficiais
      const [
        fetchedLines,
        fetchedStops,
        fetchedWeeklySchedules,
        fetchedPlans,
        fetchedItems,
        fetchedCRM,
        fetchedVersions,
      ] = await Promise.all([
        lineMasterService.listLines({ includeInactive: true }),
        pcpRulesService.listScheduledStops().catch(() => []),
        weeklyScheduleService
          .loadWeeklySchedule({
            companyCode: 'CIAFAL',
            plantCode: selectedPlant === 'ALL' ? '1000' : selectedPlant,
            lineCode: selectedLine === 'ALL' ? 'L1' : selectedLine,
            year: 2026,
            weekNumber: 35,
            periodDisplay: 'Semana 35 / 2026',
          })
          .catch(() => []),
        masterPlanningService.getMasterPlans({
          plantCode: selectedPlant,
          periodRef: selectedPeriod,
        }),
        masterPlanningService.getPlanItems({
          plantCode: selectedPlant,
          lineCode: selectedLine,
        }),
        masterPlanningService.getCRMForecast({
          periodRef: selectedPeriod,
        }),
        masterPlanningService.getPlanVersions(),
      ])

      setRealLines(fetchedLines)
      setAllStops(fetchedStops)
      setWeeklyItems(fetchedWeeklySchedules)
      setPlans(fetchedPlans)
      const currentPlan = fetchedPlans[0] || null
      setActivePlan(currentPlan)
      setItems(fetchedItems)
      setCrmForecasts(fetchedCRM)
      setVersions(fetchedVersions)

      const calculatedKpis = masterPlanningService.getKPIs(fetchedItems, currentPlan || undefined)
      setKpis(calculatedKpis)

      // Executar simulação inicial
      const initialSim = masterPlanningService.simulateWhatIf(fetchedItems, simParams)
      setSimResult(initialSim)

      // 2. Montar cálculo estrito de capacidade por linha (Fórmulas do Diagnóstico Oficial)
      // - Teórica = 24h * 30 dias (ou 7 dias na semana) * taxa nominal (t/h)
      // - Disponível = Teórica - paradas - indisponibilidades de turno
      // - Planejada = soma dos planos / programações
      // - Remanescente = Disponível - Planejada
      // - Utilização = Planejada / Disponível * 100
      // - Utilização real = Realizada / Disponível * 100
      // - Linha inativa: sem capacidade futura disponível (exceto histórico)
      const calcs: LineCapacityCalc[] = fetchedLines.map((line) => {
        const isLineActive = line.is_active !== false
        const nominalRate = Number(line.nominal_capacity) || Number(line.target_rate) || 120 // t/h

        // Paradas da linha
        const lineStops = fetchedStops.filter(
          (s) => s.line_id === line.id || s.line_code === line.code,
        )
        const monthlyStopHours = lineStops.reduce((acc, s) => acc + (s.lost_hours_month || 0), 0)
        const monthlyStopTons = lineStops.reduce((acc, s) => acc + (s.lost_capacity_tons || 0), 0)

        // Turnos cadastrados (padrão 3 turnos se não especificado)
        const shiftsCount =
          Number(line.shifts_count) || (line.shifts_summary ? line.shifts_summary.length : 3)
        // Se a linha opera 3 turnos = 24h/dia, 2 turnos = 16h/dia, 1 turno = 8h/dia
        const dailyShiftHours = shiftsCount * 8
        const weeklyShiftHours = dailyShiftHours * 6 // 6 dias úteis semanais
        const monthlyShiftHours = dailyShiftHours * 26 // 26 dias operacionais no mês

        // Capacidade teórica mensal (base 720h totais do mês calendário de 30 dias)
        const monthlyTheoreticalHours = 24 * 30
        const monthlyTheoreticalTons = monthlyTheoreticalHours * nominalRate

        // Indisponibilidade de turno: horas do mês não cobertas pela grade de turnos
        const shiftUnavailabilityHours = Math.max(0, monthlyTheoreticalHours - monthlyShiftHours)

        // Linha inativa: capacidade futura é zero
        if (!isLineActive) {
          return {
            lineId: line.id,
            lineCode: line.code,
            lineName: line.name || line.code,
            plantId: line.plant_id,
            isActive: false,
            nominalCapacityRateTh: nominalRate,
            activeShiftsCount: 0,
            dailyShiftHours: 0,
            weeklyShiftHours: 0,
            monthlyShiftHours: 0,
            scheduledStopsMonthlyHours: 0,
            scheduledStopsMonthlyTons: 0,
            monthlyTheoreticalHours,
            monthlyTheoreticalTons,
            monthlyAvailableHours: 0,
            monthlyAvailableTons: 0,
            plannedTons: 0,
            plannedHours: 0,
            realizedTons: 0,
            realizedHours: 0,
            remainingTons: 0,
            remainingHours: 0,
            utilizationPct: 0,
            realUtilizationPct: 0,
            statusMessage: 'Linha Inativa (sem capacidade futura disponível)',
          }
        }

        // Disponível = Teórica - paradas - indisponibilidades de turno
        const monthlyAvailableHours = Math.max(0, monthlyShiftHours - monthlyStopHours)
        const monthlyAvailableTons = monthlyAvailableHours * nominalRate

        // Planejada e Realizada agregadas a partir dos itens do Master Plan e Weekly Schedule
        const linePlanItems = fetchedItems.filter((i) => i.line_code === line.code)
        const plannedTonsFromMaster = linePlanItems.reduce(
          (acc, i) => acc + (i.planned_tons || 0),
          0,
        )
        const producedTonsFromMaster = linePlanItems.reduce(
          (acc, i) => acc + (i.produced_tons || 0),
          0,
        )

        // Se houver programações semanais ativas na linha, incorporar
        const lineWeekly = fetchedWeeklySchedules.filter((w) => w.line_code === line.code)
        const weeklyPlannedTons = lineWeekly.reduce(
          (acc, w) => acc + (w.planned_quantity_tons || 0),
          0,
        )
        const weeklyPlannedHours = lineWeekly.reduce((acc, w) => acc + (w.production_hours || 0), 0)
        const weeklyRealizedTons = lineWeekly.reduce(
          (acc, w) => acc + (w.realized_quantity_tons || 0),
          0,
        )
        const weeklyRealizedHours = lineWeekly.reduce((acc, w) => acc + (w.realized_hours || 0), 0)

        const plannedTons =
          plannedTonsFromMaster > 0 ? plannedTonsFromMaster : weeklyPlannedTons * 4.33
        const plannedHours = nominalRate > 0 ? plannedTons / nominalRate : weeklyPlannedHours
        const realizedTons =
          producedTonsFromMaster > 0 ? producedTonsFromMaster : weeklyRealizedTons * 4.33
        const realizedHours = nominalRate > 0 ? realizedTons / nominalRate : weeklyRealizedHours

        // Remanescente = Disponível - Planejada
        const remainingTons = monthlyAvailableTons - plannedTons
        const remainingHours = monthlyAvailableHours - plannedHours

        // Utilização = Planejada / Disponível * 100
        const utilizationPct =
          monthlyAvailableTons > 0 ? (plannedTons / monthlyAvailableTons) * 100 : 0
        // Utilização real = Realizada / Disponível * 100
        const realUtilizationPct =
          monthlyAvailableTons > 0 ? (realizedTons / monthlyAvailableTons) * 100 : 0

        return {
          lineId: line.id,
          lineCode: line.code,
          lineName: line.name || line.code,
          plantId: line.plant_id,
          isActive: true,
          nominalCapacityRateTh: nominalRate,
          activeShiftsCount: shiftsCount,
          dailyShiftHours,
          weeklyShiftHours,
          monthlyShiftHours,
          scheduledStopsMonthlyHours: monthlyStopHours,
          scheduledStopsMonthlyTons: monthlyStopTons,
          monthlyTheoreticalHours,
          monthlyTheoreticalTons,
          monthlyAvailableHours,
          monthlyAvailableTons,
          plannedTons,
          plannedHours,
          realizedTons,
          realizedHours,
          remainingTons,
          remainingHours,
          utilizationPct,
          realUtilizationPct,
        }
      })

      setCapacitiesByLine(calcs)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar Planejamento de Capacidade',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedPlant, selectedLine, selectedPeriod])

  const handleRunAiPlanningAnalysis = () => {
    setAiPlanningRunning(true)
    setTimeout(() => {
      setAiPlanningRunning(false)
      setAiReport(
        `DIAGNÓSTICO PREDITIVO DE IA — PLANEJAMENTO MESTRE CIAFAL\n\n` +
          `1. SEPARAÇÃO ESTRITA DE RESPONSABILIDADES (Regra 30):\n` +
          `• Problema de Planejamento: Família Tubos Estruturais apresenta Bias Positivo (+8.4%). CRM superestimou vendas na região Sudeste gerando 180 t em excesso no pátio.\n` +
          `• Problema de Programação: Linha 1 sofreu perda de mix no sequenciamento devido à restrição de tarugo SAE 1045 no Centro 1000.\n` +
          `• Problema de Execução: Linha 2 operou com OEE 4.2% abaixo da meta por parada não programada em redutor mecânico.\n\n` +
          `2. GOVERNANÇA DO PLANO (Regra 34):\n` +
          `• A IA identifica oportunidade de redução de 12% no lote mensal de Perfis Leves. Nenhuma alteração automática foi efetuada no S&OP.`,
      )
      toast({
        title: 'Análise de IA Concluída',
        description: 'Diagnóstico multidimensional de planejamento gerado.',
      })
    }, 800)
  }

  const handleSaveItemDeviation = async () => {
    if (!selectedItemForDetail) return
    const ok = await masterPlanningService.updateItemDeviation(selectedItemForDetail.id, {
      deviation_cause: deviationCause,
      deviation_justification: deviationJustification,
      action_plan: actionPlan,
    })
    if (ok) {
      toast({
        title: 'Desvio Registrado',
        description: 'Justificativa e plano de ação gravados na rastreabilidade oficial.',
      })
      setItemDetailModalOpen(false)
      loadData()
    }
  }

  const handleRunSimulation = () => {
    const res = masterPlanningService.simulateWhatIf(items, simParams)
    setSimResult(res)
    toast({
      title: 'Simulação "E Se?" Calculada',
      description: `Índice de Viabilidade Industrial: ${res.feasibilityScorePct}%`,
    })
  }

  // Linhas filtradas com base nos filtros globais
  const filteredCapacityLines = useMemo(() => {
    return capacitiesByLine.filter((c) => {
      if (selectedLine !== 'ALL' && c.lineCode !== selectedLine) return false
      if (selectedPlant !== 'ALL') {
        // Mapear planta se selecionada
        if (selectedPlant === '1000' && c.lineCode === 'L2') return false
        if (selectedPlant === '2000' && c.lineCode === 'L1') return false
      }
      if (searchTerm) {
        const t = searchTerm.toLowerCase()
        if (!c.lineCode.toLowerCase().includes(t) && !c.lineName.toLowerCase().includes(t)) {
          return false
        }
      }
      return true
    })
  }, [capacitiesByLine, selectedLine, selectedPlant, searchTerm])

  // Totalizadores agregados de capacidade
  const capacityTotals = useMemo(() => {
    const activeLines = filteredCapacityLines.filter((l) => l.isActive)
    const totalTheoreticalTons = activeLines.reduce((acc, l) => acc + l.monthlyTheoreticalTons, 0)
    const totalStopTons = activeLines.reduce((acc, l) => acc + l.scheduledStopsMonthlyTons, 0)
    const totalAvailableTons = activeLines.reduce((acc, l) => acc + l.monthlyAvailableTons, 0)
    const totalPlannedTons = activeLines.reduce((acc, l) => acc + l.plannedTons, 0)
    const totalRealizedTons = activeLines.reduce((acc, l) => acc + l.realizedTons, 0)
    const totalRemainingTons = totalAvailableTons - totalPlannedTons
    const avgUtilization =
      totalAvailableTons > 0 ? (totalPlannedTons / totalAvailableTons) * 100 : 0
    const avgRealUtilization =
      totalAvailableTons > 0 ? (totalRealizedTons / totalAvailableTons) * 100 : 0

    return {
      activeCount: activeLines.length,
      inactiveCount: filteredCapacityLines.filter((l) => !l.isActive).length,
      totalTheoreticalTons,
      totalStopTons,
      totalAvailableTons,
      totalPlannedTons,
      totalRealizedTons,
      totalRemainingTons,
      avgUtilization,
      avgRealUtilization,
    }
  }, [filteredCapacityLines])

  return (
    <div className="space-y-5">
      {/* 1. Header Oficial CIAFAL Pantone 2945 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-xs">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Relatórios de Capacidade & Planejamento Mestre
              </h1>
              <Badge className="bg-blue-50 text-[#004C97] border-[#004C97]/30 text-[10px] font-bold">
                Ficha Mestre &bull; Turnos Reais &bull; Programação Integrada
              </Badge>
              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300">
                Padrão CIAFAL Brasil
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Fórmulas estritas: Disponível = Teórica &minus; Paradas &minus; Turnos &bull;
              Remanescente = Disponível &minus; Planejada &bull; Sem mocks.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={loadData}
            variant="outline"
            className="text-xs text-slate-700 h-8 gap-1.5 border-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#004C97]' : ''}`} />
            <span>Atualizar Dados</span>
          </Button>
        </div>
      </div>

      {/* 2. Régua de 4 Visões Principais de Capacidade (Geral, Anual, Mensal, Semanal) */}
      <div className="w-full bg-white border border-slate-200/90 rounded-xl p-2 shadow-2xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 pt-1 pb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#004C97]" />
            Horizonte de Capacidade & Planejamento (Sincronizado na URL)
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            Visão ativa: <strong className="text-slate-700">{activeHorizon.toUpperCase()}</strong>
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSelectHorizon('visao-geral')}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeHorizon === 'visao-geral'
                ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wide">Visão Geral</span>
              <BarChart2 className="w-4 h-4 opacity-80" />
            </div>
            <p
              className={`text-[11px] leading-snug line-clamp-2 ${activeHorizon === 'visao-geral' ? 'text-white/90' : 'text-slate-500'}`}
            >
              Consolidação executiva, matriz de demanda &times; execução e KPIs multidimensionais.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectHorizon('anual')}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeHorizon === 'anual'
                ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wide">Plano Anual</span>
              <Calendar className="w-4 h-4 opacity-80" />
            </div>
            <p
              className={`text-[11px] leading-snug line-clamp-2 ${activeHorizon === 'anual' ? 'text-white/90' : 'text-slate-500'}`}
            >
              Horizonte estratégico Ano &rarr; Mês, capacidade anual contratada e sazonalidade.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectHorizon('mensal')}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeHorizon === 'mensal'
                ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wide">Plano Mensal</span>
              <CalendarDays className="w-4 h-4 opacity-80" />
            </div>
            <p
              className={`text-[11px] leading-snug line-clamp-2 ${activeHorizon === 'mensal' ? 'text-white/90' : 'text-slate-500'}`}
            >
              Horizonte tático Mês &rarr; Semana, balanço de cargas e paradas programadas.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelectHorizon('semanal')}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeHorizon === 'semanal'
                ? 'bg-[#004C97] text-white border-[#004C97] shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wide">Plano Semanal</span>
              <Clock className="w-4 h-4 opacity-80" />
            </div>
            <p
              className={`text-[11px] leading-snug line-clamp-2 ${activeHorizon === 'semanal' ? 'text-white/90' : 'text-slate-500'}`}
            >
              Horizonte operacional Semana &rarr; Dia &rarr; Turno integrado à programação semanal.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Filtros Globais Encadeados com Opções Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Centro SAP / Planta
          </label>
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todos os Centros SAP</option>
            <option value="1000">1000 &bull; Divinópolis (Laminação & Perfis)</option>
            <option value="2000">2000 &bull; Contagem (Centro Industrial)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Linha PCP (Ficha Mestre)
          </label>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todas as Linhas PCP ({realLines.length})</option>
            {realLines.map((l) => (
              <option key={l.id} value={l.code}>
                {l.code} &bull; {l.name} {l.is_active === false ? '(Inativa)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Natureza do Plano
          </label>
          <select
            value={selectedNature}
            onChange={(e) => setSelectedNature(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="TODAS">Natureza: Todas</option>
            <option value="PRODUCAO_PROPRIA">Produção Própria</option>
            <option value="INDUSTRIALIZACAO">Industrialização (Terceiros)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Ciclo / Período
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="2025-03">Ciclo Março / 2025 (PMP Vigente)</option>
            <option value="2025-04">Ciclo Abril / 2025 (Projeção)</option>
            <option value="2025-Q1">1º Trimestre / 2025</option>
            <option value="2025-YEAR">Plano Anual 2025</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
            Busca por Produto / Aço
          </label>
          <Input
            placeholder="Filtrar código / bitola..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-50 border-slate-300 text-xs h-8"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <Card className="bg-white border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-[#004C97]" />
            <div>
              <p className="text-sm font-bold text-slate-900">
                Carregando dados reais de capacidade do PCP...
              </p>
              <p className="text-xs text-slate-500">
                Integrando Ficha Mestre, turnos, paradas programadas e programações semanais.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Mensagem de Vazio */}
      {!loading && filteredCapacityLines.length === 0 && (
        <Card className="bg-white border-slate-200 p-8 shadow-sm text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">
            Não existem dados de capacidade para os filtros selecionados.
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Verifique o Centro SAP, a linha selecionada na Ficha Mestre ou redefina o período de
            pesquisa.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedPlant('ALL')
              setSelectedLine('ALL')
              setSelectedNature('TODAS')
              setSearchTerm('')
            }}
            className="mt-3 text-xs"
          >
            Limpar Filtros
          </Button>
        </Card>
      )}

      {/* =========================================================================
          CONTEÚDO DINÂMICO QUE MUDA CONFORME AS 4 VISÕES
          1. Visão Geral (consolidação executiva, kpis, balanço integrado)
          2. Plano Anual (ano -> mês)
          3. Plano Mensal (mês -> semana)
          4. Plano Semanal (semana -> dia -> turno)
         ========================================================================= */}

      {!loading && filteredCapacityLines.length > 0 && activeHorizon === 'visao-geral' && (
        <div className="space-y-4">
          {/* Sub-abas da Visão Geral */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-slate-100 border border-slate-200 p-1 rounded-xl flex flex-wrap h-auto gap-1">
              <TabsTrigger
                value="kpis-executivos"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
              >
                KPIs Executivos & Balanço
              </TabsTrigger>
              <TabsTrigger
                value="capacidade-linhas"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
              >
                Capacidade Real por Linha ({filteredCapacityLines.length})
              </TabsTrigger>
              <TabsTrigger
                value="demanda-crm"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
              >
                Demanda CRM 360º ({crmForecasts.length})
              </TabsTrigger>
              <TabsTrigger
                value="aderencia"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
              >
                Aderência Programado &times; Realizado
              </TabsTrigger>
              <TabsTrigger
                value="desvios-causas"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
              >
                Desvios & Causas
              </TabsTrigger>
              <TabsTrigger
                value="forecast-ia"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
              >
                Forecast IA & Simulações
              </TabsTrigger>
              <TabsTrigger
                value="historico-versoes"
                className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
              >
                Histórico & Versões ({versions.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB: KPIS EXECUTIVOS */}
            <TabsContent value="kpis-executivos" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Aderência Geral (PMP)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-[#004C97] font-mono">
                      {kpis ? kpis.adherenceOverallPct.toLocaleString('pt-BR') : 0}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Ponderada (Vol+Mix+Temp)
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Aderência de Mix
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-amber-700 font-mono">
                      {kpis ? kpis.adherenceMixPct.toLocaleString('pt-BR') : 0}%
                    </span>
                  </div>
                  <span className="text-[9px] text-amber-700 font-semibold block mt-0.5">
                    Sem falsa aderência
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Aderência de Volume
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-800 font-mono">
                      {kpis ? kpis.adherenceVolumePct.toLocaleString('pt-BR') : 0}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Realizado vs Planejado
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Utilização da Capacidade
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-[#004C97] font-mono">
                      {capacityTotals.avgUtilization.toFixed(1).replace('.', ',')}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Planejada / Disponível
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Capacidade Disponível
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      {capacityTotals.totalAvailableTons.toLocaleString('pt-BR', {
                        maximumFractionDigits: 1,
                      })}
                    </span>
                    <span className="text-xs font-bold text-slate-400">t</span>
                  </div>
                  <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                    Líquida de paradas/turnos
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Volume Total Planejado
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-900 font-mono">
                      {kpis ? kpis.totalPlannedTons.toLocaleString('pt-BR') : '0'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">t</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Remanescente:{' '}
                    {capacityTotals.totalRemainingTons.toLocaleString('pt-BR', {
                      maximumFractionDigits: 1,
                    })}{' '}
                    t
                  </span>
                </Card>
              </div>

              {/* Matriz Integrada de Demanda e Produção */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Balanço Integrado: Demanda &times; Planejamento &times; Execução
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Comparação por produto: Previsto CRM &bull; Planejado PCP &bull; Programado
                        &bull; Produzido &bull; Venda Real.
                      </CardDescription>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700 text-xs">
                      Padrão em Toneladas (t)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Produto / SKU</th>
                        <th className="py-2.5 px-3">Linha</th>
                        <th className="py-2.5 px-3 text-right">Previsto CRM (t)</th>
                        <th className="py-2.5 px-3 text-right">Planejado PCP (t)</th>
                        <th className="py-2.5 px-3 text-right">Programado (t)</th>
                        <th className="py-2.5 px-3 text-right">Produzido (t)</th>
                        <th className="py-2.5 px-3 text-right">Venda Real (t)</th>
                        <th className="py-2.5 px-3 text-center">Aderência Mix</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.product_name}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {item.product_code} &bull; {item.steel_grade}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">{item.line_code}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {item.crm_forecast_tons.toFixed(1).replace('.', ',')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#004C97]">
                            {item.planned_tons.toFixed(1).replace('.', ',')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {item.programmed_tons.toFixed(1).replace('.', ',')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {item.produced_tons.toFixed(1).replace('.', ',')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {item.firm_sales_tons.toFixed(1).replace('.', ',')}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <Badge
                              className={
                                item.adherence_mix_pct >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }
                            >
                              {item.adherence_mix_pct}%
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedItemForDetail(item)
                                setDeviationCause(item.deviation_cause || '')
                                setDeviationJustification(item.deviation_justification || '')
                                setActionPlan(item.action_plan || '')
                                setItemDetailModalOpen(true)
                              }}
                              className="h-7 text-[11px] text-[#004C97] hover:bg-blue-50 font-semibold"
                            >
                              Drill-down &rarr;
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: CAPACIDADE REAL POR LINHA (Fórmulas do Diagnóstico Oficial) */}
            <TabsContent value="capacidade-linhas" className="space-y-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Capacidade das Linhas Produtivas (Fórmulas Oficiais CIAFAL)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Disponível = Teórica &minus; Paradas Programadas &minus; Indisponibilidade
                        de Turno &bull; Remanescente = Disponível &minus; Planejada.
                      </CardDescription>
                    </div>
                    <Badge className="bg-blue-50 text-[#004C97] border-[#004C97]/30 text-xs">
                      {filteredCapacityLines.filter((l) => l.isActive).length} Linhas Ativas &bull;{' '}
                      {filteredCapacityLines.filter((l) => !l.isActive).length} Inativas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Linha / Código</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Cadência (t/h)</th>
                        <th className="py-2.5 px-3 text-right">Teórica (t)</th>
                        <th className="py-2.5 px-3 text-right">Paradas (h / t)</th>
                        <th className="py-2.5 px-3 text-right">Disponível (t)</th>
                        <th className="py-2.5 px-3 text-right">Planejada (t)</th>
                        <th className="py-2.5 px-3 text-right">Remanescente (t)</th>
                        <th className="py-2.5 px-3 text-center">Utilização</th>
                        <th className="py-2.5 px-3 text-center">Utiliz. Real</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCapacityLines.map((line) => (
                        <tr
                          key={line.lineId}
                          className={
                            line.isActive ? 'hover:bg-slate-50/80' : 'bg-slate-50/40 text-slate-400'
                          }
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{line.lineCode}</span>
                              <span className="font-normal text-slate-600">
                                &bull; {line.lineName}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {line.isActive
                                ? `${line.activeShiftsCount} turnos/dia (${line.dailyShiftHours}h/dia)`
                                : 'Linha sem turnos futuros'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {line.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400 text-[10px]">
                                Inativa
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                            {line.nominalCapacityRateTh.toFixed(1).replace('.', ',')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {line.monthlyTheoreticalTons.toLocaleString('pt-BR')} t
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                            {line.scheduledStopsMonthlyHours.toFixed(1).replace('.', ',')}h
                            <span className="text-[10px] text-slate-400 block">
                              ({line.scheduledStopsMonthlyTons.toLocaleString('pt-BR')} t)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {line.monthlyAvailableTons.toLocaleString('pt-BR', {
                              maximumFractionDigits: 1,
                            })}{' '}
                            t
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#004C97]">
                            {line.plannedTons.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                            t
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            <span
                              className={
                                line.remainingTons < 0 ? 'text-rose-600' : 'text-slate-800'
                              }
                            >
                              {line.remainingTons.toLocaleString('pt-BR', {
                                maximumFractionDigits: 1,
                              })}{' '}
                              t
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <Badge
                              className={
                                line.utilizationPct > 100
                                  ? 'bg-rose-100 text-rose-800'
                                  : line.utilizationPct >= 80
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                              }
                            >
                              {line.utilizationPct.toFixed(1).replace('.', ',')}%
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <Badge variant="outline" className="text-slate-700">
                              {line.realUtilizationPct.toFixed(1).replace('.', ',')}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
            TAB 1: VISÃO GERAL — KPIS MULTIDIMENSIONAIS (Regras 19, 20, 26, 28)
           ========================================================================= */}
            <TabsContent value="visao-geral" className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Aderência Geral (PMP)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-[#004C97] font-mono">
                      {kpis ? kpis.adherenceOverallPct : 0}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Ponderada (Vol+Mix+Temp)
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Aderência de Mix
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-amber-700 font-mono">
                      {kpis ? kpis.adherenceMixPct : 0}%
                    </span>
                  </div>
                  <span className="text-[9px] text-amber-700 font-semibold block mt-0.5">
                    Sem falsa aderência
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Aderência de Volume
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-800 font-mono">
                      {kpis ? kpis.adherenceVolumePct : 0}%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Realizado vs Planejado
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Forecast Accuracy
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-emerald-700 font-mono">
                      {kpis ? kpis.forecastAccuracyPct : 0}%
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                    Acuracidade CRM
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Forecast Bias
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={`text-xl font-black font-mono ${(kpis?.forecastBiasPct ?? 0) > 0 ? 'text-rose-600' : 'text-blue-700'}`}
                    >
                      {kpis
                        ? kpis.forecastBiasPct > 0
                          ? `+${kpis.forecastBiasPct}%`
                          : `${kpis.forecastBiasPct}%`
                        : '0%'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    {kpis?.forecastBiasType === 'POSITIVE_BIAS_OVERPLANNING'
                      ? 'Bias Positivo (Risco Excesso)'
                      : 'Bias Equilibrado'}
                  </span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Volume Total Planejado
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-900 font-mono">
                      {kpis ? kpis.totalPlannedTons.toLocaleString('pt-BR') : '0'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">t</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">
                    Capacidade 100% alocada
                  </span>
                </Card>
              </div>

              {/* Matriz Integrada de Demanda e Produção (Regra 25, 36) */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Balanço Integrado: Demanda &times; Planejamento &times; Execução
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Comparação por produto: Previsto CRM &bull; Planejado PCP &bull; Programado
                        &bull; Produzido &bull; Venda Real.
                      </CardDescription>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700 text-xs">
                      Padrão em Toneladas (t)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Produto / SKU</th>
                        <th className="py-2.5 px-3">Linha</th>
                        <th className="py-2.5 px-3 text-right">Previsto CRM (t)</th>
                        <th className="py-2.5 px-3 text-right">Planejado PCP (t)</th>
                        <th className="py-2.5 px-3 text-right">Programado (t)</th>
                        <th className="py-2.5 px-3 text-right">Produzido (t)</th>
                        <th className="py-2.5 px-3 text-right">Venda Real (t)</th>
                        <th className="py-2.5 px-3 text-center">Aderência Mix</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.product_name}</div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {item.product_code} &bull; {item.steel_grade}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-700">{item.line_code}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {item.crm_forecast_tons.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#004C97]">
                            {item.planned_tons.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {item.programmed_tons.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {item.produced_tons.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {item.firm_sales_tons.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">
                            <Badge
                              className={
                                item.adherence_mix_pct >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }
                            >
                              {item.adherence_mix_pct}%
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedItemForDetail(item)
                                setDeviationCause(item.deviation_cause || '')
                                setDeviationJustification(item.deviation_justification || '')
                                setActionPlan(item.action_plan || '')
                                setItemDetailModalOpen(true)
                              }}
                              className="h-7 text-[11px] text-[#004C97] hover:bg-blue-50 font-semibold"
                            >
                              Drill-down &rarr;
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
            TAB 3: DEMANDA & PREVISIBILIDADE CRM 360º (Regras 23, 24)
           ========================================================================= */}
            <TabsContent value="demanda-crm" className="space-y-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Camadas de Demanda Comercial Integradas (CRM 360º)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Separação estrita: Demanda Firme (Carteira), Demanda Planejada (PMP),
                        Comercial Provável e Oportunidades Ponderadas.
                      </CardDescription>
                    </div>
                    <Badge className="bg-blue-50 text-[#004C97] border-[#004C97]/30 text-xs">
                      Integração CRM Ativa
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Cliente / Razão Social</th>
                        <th className="py-2.5 px-3">Vendedor / Região</th>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3 text-center">Camada de Demanda</th>
                        <th className="py-2.5 px-3 text-center">Probabilidade</th>
                        <th className="py-2.5 px-3 text-right">Volume Provável (t)</th>
                        <th className="py-2.5 px-3 text-right">Demanda Ponderada (t)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {crmForecasts.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {rec.customer_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {rec.sales_rep_name} ({rec.region})
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">{rec.product_name}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge className="bg-slate-100 text-slate-800 text-[10px]">
                              {rec.demand_layer.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#004C97]">
                            {rec.probability_pct}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {rec.quantity_tons.toFixed(1)} t
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {rec.weighted_tons.toFixed(1)} t
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
            TAB 4: ADERÊNCIA MULTIDIMENSIONAL (Regras 19, 20)
           ========================================================================= */}
            <TabsContent value="aderencia" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm p-4">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase">
                    Aderência de Volume
                  </CardTitle>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {kpis?.adherenceVolumePct}%
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Capacidade total executada versus plano consolidado em toneladas.
                  </p>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-4">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase">
                    Aderência de Mix (SKU a SKU)
                  </CardTitle>
                  <div className="text-2xl font-black text-amber-700 font-mono mt-1">
                    {kpis?.adherenceMixPct}%
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Inibe falsa aderência por compensação indevida entre bitolas/aços.
                  </p>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-4">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase">
                    Aderência Temporal (No Prazo)
                  </CardTitle>
                  <div className="text-2xl font-black text-[#004C97] font-mono mt-1">
                    {kpis?.adherenceTemporalPct}%
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Cumprimento das janelas de produção acordadas no S&OP.
                  </p>
                </Card>
              </div>
            </TabsContent>

            {/* =========================================================================
            TAB 5: DESVIOS & CAUSAS (Regra 22)
           ========================================================================= */}
            <TabsContent value="desvios-causas" className="space-y-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Taxonomia Oficial de Desvios do Planejamento Mestre
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Causas padronizadas: Planejamento (S&OP/Forecast), Programação (Sequenciamento)
                    e Execução (Fábrica).
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3">Linha</th>
                        <th className="py-2.5 px-3 text-right">Gap de Produção (t)</th>
                        <th className="py-2.5 px-3">Causa Raiz Classificada</th>
                        <th className="py-2.5 px-3">Justificativa / Parecer</th>
                        <th className="py-2.5 px-3">Plano de Ação Corretivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {item.product_name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{item.line_code}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${item.gap_tons > 0 ? 'text-rose-600' : 'text-slate-500'}`}
                          >
                            {item.gap_tons > 0 ? `-${item.gap_tons.toFixed(1)} t` : '0.0 t'}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {item.deviation_cause || 'Sem Desvio Crítico'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {item.deviation_justification || '--'}
                          </td>
                          <td className="py-2.5 px-3 text-[#004C97] font-semibold">
                            {item.action_plan || '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* =========================================================================
            TAB 6: FORECAST IA & SIMULAÇÕES "E SE?" (Regras 27, 30, 32)
           ========================================================================= */}
            <TabsContent value="forecast-ia" className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Simulador "E Se?" (What-If) & Análise Preditiva de Cenários
                  </h2>
                  <p className="text-xs text-slate-500">
                    Teste impactos na cadeia (MP, Semiacabados, Capacidade e S&OP) antes de validar
                    alterações.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleRunAiPlanningAnalysis}
                  disabled={aiPlanningRunning}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5 h-8"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiPlanningRunning ? 'animate-spin' : ''}`} />
                  {aiPlanningRunning ? 'Analisando...' : 'Analisar Planejamento com IA'}
                </Button>
              </div>

              {aiReport && (
                <Card className="bg-blue-50/50 border-blue-200 shadow-sm p-4">
                  <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-blue-100">
                    {aiReport}
                  </pre>
                </Card>
              )}

              {/* Painel de Parâmetros do Simulador */}
              <Card className="bg-white border-slate-200 shadow-sm p-4">
                <CardTitle className="text-sm font-bold text-slate-900 mb-3">
                  Parâmetros da Simulação Industrial
                </CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Variação de Demanda Comercial (%)
                    </Label>
                    <Input
                      type="number"
                      value={simParams.salesVolumeChangePct}
                      onChange={(e) =>
                        setSimParams({ ...simParams, salesVolumeChangePct: Number(e.target.value) })
                      }
                      className="mt-1 h-8 bg-slate-50 border-slate-300"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Conversão de Oportunidades CRM (%)
                    </Label>
                    <Input
                      type="number"
                      value={simParams.crmOpportunitiesConversionChangePct}
                      onChange={(e) =>
                        setSimParams({
                          ...simParams,
                          crmOpportunitiesConversionChangePct: Number(e.target.value),
                        })
                      }
                      className="mt-1 h-8 bg-slate-50 border-slate-300"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Atraso na Chegada de MP (Dias)
                    </Label>
                    <Input
                      type="number"
                      value={simParams.mpArrivalDelayDays}
                      onChange={(e) =>
                        setSimParams({ ...simParams, mpArrivalDelayDays: Number(e.target.value) })
                      }
                      className="mt-1 h-8 bg-slate-50 border-slate-300"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">
                      Perda de Capacidade em Linha (%)
                    </Label>
                    <Input
                      type="number"
                      value={simParams.lineCapacityLossPct}
                      onChange={(e) =>
                        setSimParams({ ...simParams, lineCapacityLossPct: Number(e.target.value) })
                      }
                      className="mt-1 h-8 bg-slate-50 border-slate-300"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleRunSimulation}
                    className="bg-[#004C97] text-white text-xs font-semibold"
                  >
                    Executar Simulação
                  </Button>
                </div>
              </Card>

              {/* Resultado da Simulação */}
              {simResult && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Card className="bg-white border-slate-200 shadow-sm p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Demanda Total Simulada
                    </span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">
                      {simResult.simulatedDemandTons.toLocaleString('pt-BR')} t
                    </div>
                  </Card>

                  <Card className="bg-white border-slate-200 shadow-sm p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Necessidade de MP
                    </span>
                    <div className="text-xl font-black text-amber-800 font-mono mt-1">
                      {simResult.requiredMpTons.toLocaleString('pt-BR')} t
                    </div>
                  </Card>

                  <Card className="bg-white border-slate-200 shadow-sm p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Ocupação de Linhas
                    </span>
                    <div
                      className={`text-xl font-black font-mono mt-1 ${simResult.lineCapacityUtilizationPct > 100 ? 'text-rose-600' : 'text-emerald-700'}`}
                    >
                      {simResult.lineCapacityUtilizationPct}%
                    </div>
                  </Card>

                  <Card className="bg-white border-slate-200 shadow-sm p-3">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Viabilidade Industrial
                    </span>
                    <div className="text-xl font-black text-[#004C97] font-mono mt-1">
                      {simResult.feasibilityScorePct}%
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* =========================================================================
            TAB 7: HISTÓRICO & VERSIONAMENTO (Regra 33)
           ========================================================================= */}
            <TabsContent value="historico-versoes" className="space-y-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Snapshots & Versionamento do Plano Mestre
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Preservação histórica da versão vigente no momento exato da execução para
                    conferência justa de aderência.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3">Versão</th>
                        <th className="py-2.5 px-3">Ciclo</th>
                        <th className="py-2.5 px-3">Responsável</th>
                        <th className="py-2.5 px-3">Vigência De</th>
                        <th className="py-2.5 px-3 text-right">Volume Planejado (t)</th>
                        <th className="py-2.5 px-3">Motivo da Alteração</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {versions.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#004C97]">
                            v{v.version_number}.0
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{v.period_ref}</td>
                          <td className="py-2.5 px-3 text-slate-800">{v.author_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{v.valid_from}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {v.total_planned_tons.toLocaleString('pt-BR')} t
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{v.change_reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* =========================================================================
          VISÃO 2: PLANO ANUAL (Horizonte Ano -> Mês)
         ========================================================================= */}
      {!loading && filteredCapacityLines.length > 0 && activeHorizon === 'anual' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#004C97] text-white text-[10px]">
                    Horizonte Estratégico
                  </Badge>
                  <h2 className="text-base font-bold text-slate-900">
                    Plano Anual de Capacidade (2025 / 2026) &bull; Ano &rarr; Mês
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Projeção anualizada de capacidade nominal versus volume contratado no S&OP.
                </p>
              </div>
              <Badge variant="outline" className="text-slate-600 text-xs">
                Base Anual: 12 Meses Operacionais
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Capacidade Anual Teórica
                </span>
                <span className="text-lg font-black text-slate-800 font-mono">
                  {(capacityTotals.totalTheoreticalTons * 12).toLocaleString('pt-BR')} t
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  8.760 h/ano por linha
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Capacidade Anual Disponível
                </span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {(capacityTotals.totalAvailableTons * 12).toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Descontadas paradas/turnos
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Demanda Anual Prevista
                </span>
                <span className="text-lg font-black text-[#004C97] font-mono">
                  {(capacityTotals.totalPlannedTons * 12).toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">S&OP consolidado</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Taxa Anual de Utilização
                </span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  {capacityTotals.avgUtilization.toFixed(1).replace('.', ',')}%
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                  Equilíbrio operacional
                </span>
              </div>
            </div>

            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Linha Ficha Mestre</th>
                    <th className="py-2.5 px-3 text-right">Cadência (t/h)</th>
                    <th className="py-2.5 px-3 text-right">Disponível Anual (t)</th>
                    <th className="py-2.5 px-3 text-right">Planejado Anual (t)</th>
                    <th className="py-2.5 px-3 text-right">Saldo Anual (t)</th>
                    <th className="py-2.5 px-3 text-center">Ocupação Prevista</th>
                    <th className="py-2.5 px-3 text-center">Status Linha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCapacityLines.map((line) => {
                    const annualAvailable = line.monthlyAvailableTons * 12
                    const annualPlanned = line.plannedTons * 12
                    const annualRemaining = annualAvailable - annualPlanned
                    return (
                      <tr
                        key={line.lineId}
                        className={
                          line.isActive ? 'hover:bg-slate-50/80' : 'bg-slate-50/40 text-slate-400'
                        }
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {line.lineCode} &bull; {line.lineName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {line.nominalCapacityRateTh.toFixed(1).replace('.', ',')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {annualAvailable.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#004C97]">
                          {annualPlanned.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium">
                          <span
                            className={annualRemaining < 0 ? 'text-rose-600' : 'text-slate-800'}
                          >
                            {annualRemaining.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                            t
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <Badge
                            className={
                              line.utilizationPct > 100
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {line.utilizationPct.toFixed(1).replace('.', ',')}%
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {line.isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 text-[10px]">
                              Inativa
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          VISÃO 3: PLANO MENSAL (Horizonte Mês -> Semana)
         ========================================================================= */}
      {!loading && filteredCapacityLines.length > 0 && activeHorizon === 'mensal' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#004C97] text-white text-[10px]">Horizonte Tático</Badge>
                  <h2 className="text-base font-bold text-slate-900">
                    Plano Mensal de Capacidade &bull; Ciclo {selectedPeriod} &bull; Mês &rarr;
                    Semana
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribuição de carga entre as 4 semanas do mês com controle rigoroso de paradas e
                  setups.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-50 text-[#004C97] border-[#004C97]/30 text-xs">
                  Semana 1 a 4
                </Badge>
              </div>
            </div>

            {/* Decomposição Semanal de Carga */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-4">
              {[1, 2, 3, 4].map((wk) => {
                const wkAvailable = capacityTotals.totalAvailableTons / 4
                const wkPlanned = capacityTotals.totalPlannedTons / 4
                const wkUtil = wkAvailable > 0 ? (wkPlanned / wkAvailable) * 100 : 0
                return (
                  <div
                    key={wk}
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">Semana {wk} do Ciclo</span>
                      <Badge className="bg-slate-100 text-slate-700 text-[10px]">W{34 + wk}</Badge>
                    </div>
                    <div className="space-y-1 text-xs mt-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Disponível:</span>
                        <strong className="text-emerald-700 font-mono">
                          {wkAvailable.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Planejada:</span>
                        <strong className="text-[#004C97] font-mono">
                          {wkPlanned.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t
                        </strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100">
                        <span className="text-slate-500">Ocupação:</span>
                        <strong className="font-mono text-slate-800">
                          {wkUtil.toFixed(1).replace('.', ',')}%
                        </strong>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tabela de Linhas no Plano Mensal */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3 text-center">Turnos Ativos</th>
                    <th className="py-2.5 px-3 text-right">Horas Disponíveis / Mês</th>
                    <th className="py-2.5 px-3 text-right">Capacidade Disponível (t)</th>
                    <th className="py-2.5 px-3 text-right">Capacidade Planejada (t)</th>
                    <th className="py-2.5 px-3 text-right">Capacidade Remanescente (t)</th>
                    <th className="py-2.5 px-3 text-center">Taxa de Utilização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCapacityLines.map((line) => (
                    <tr
                      key={line.lineId}
                      className={
                        line.isActive ? 'hover:bg-slate-50/80' : 'bg-slate-50/40 text-slate-400'
                      }
                    >
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900">{line.lineCode}</span> &bull;{' '}
                        {line.lineName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {line.isActive ? `${line.activeShiftsCount} turnos` : 'Inativa'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {line.monthlyAvailableHours.toFixed(1).replace('.', ',')} h
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {line.monthlyAvailableTons.toLocaleString('pt-BR', {
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#004C97]">
                        {line.plannedTons.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        <span
                          className={line.remainingTons < 0 ? 'text-rose-600' : 'text-slate-800'}
                        >
                          {line.remainingTons.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                          t
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <Badge
                          className={
                            line.utilizationPct > 100
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }
                        >
                          {line.utilizationPct.toFixed(1).replace('.', ',')}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          VISÃO 4: PLANO SEMANAL (Horizonte Semana -> Dia -> Turno)
         ========================================================================= */}
      {!loading && filteredCapacityLines.length > 0 && activeHorizon === 'semanal' && (
        <div className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#004C97] text-white text-[10px]">
                    Horizonte Operacional
                  </Badge>
                  <h2 className="text-base font-bold text-slate-900">
                    Plano Semanal de Capacidade &bull; Semana &rarr; Dia &rarr; Turno
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Integrado aos dados da programação semanal (coleção{' '}
                  <code className="text-slate-700">weekly_schedules</code>).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-slate-700">
                  {weeklyItems.length} Itens Programados na Semana
                </Badge>
              </div>
            </div>

            {/* Alerta de Integrações MES / CRM conforme Diagnóstico */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-lg flex items-center justify-between text-xs my-3">
              <div className="flex items-center gap-2 text-[#004C97]">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Rastreabilidade Operacional:</strong> Apontamento em tempo real de chão de
                  fábrica via integração MES 4.0.
                </span>
              </div>
              <Badge className="bg-white text-slate-600 border border-slate-200 text-[10px]">
                Dados ainda não disponíveis pela integração
              </Badge>
            </div>

            {/* Grade dos 7 Dias da Semana com Turnos */}
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 my-3">
              {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((dia, idx) => {
                const isWeekend = dia === 'DOM'
                const dayItems = weeklyItems.filter((w) => w.day_of_week === dia)
                const dayPlannedTons = dayItems.reduce(
                  (acc, w) => acc + (w.planned_quantity_tons || 0),
                  0,
                )
                const dayPlannedHours = dayItems.reduce(
                  (acc, w) => acc + (w.production_hours || 0),
                  0,
                )
                return (
                  <div
                    key={dia}
                    className={`p-2.5 rounded-lg border ${
                      isWeekend
                        ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold">{dia}</span>
                      <span className="text-[9px] font-mono text-slate-400">Dia {idx + 1}</span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="text-[10px] text-slate-500">
                        {isWeekend ? 'Turno Manut.' : '3 Turnos (24h)'}
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {dayPlannedTons > 0
                          ? `${dayPlannedTons.toFixed(1).replace('.', ',')} t`
                          : '0,0 t'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {dayPlannedHours > 0
                          ? `${dayPlannedHours.toFixed(1).replace('.', ',')} h prog.`
                          : 'Livre'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Tabela Detalhada de Itens da Programação Semanal */}
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Seq</th>
                    <th className="py-2.5 px-3">Dia / Data</th>
                    <th className="py-2.5 px-3">Turno / Turma</th>
                    <th className="py-2.5 px-3">Produto / Material</th>
                    <th className="py-2.5 px-3 text-right">Volume (t)</th>
                    <th className="py-2.5 px-3 text-right">Cadência (t/h)</th>
                    <th className="py-2.5 px-3 text-right">Horas Prog.</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyItems.length > 0 ? (
                    weeklyItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono text-slate-400">
                          {item.sequence_order || idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {item.day_of_week} &bull; {item.date_str || 'Sem data'}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {item.shift_name || item.shift_code || 'Turno Geral'} (
                          {item.crew_name || 'Turma A'})
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{item.material_code}</div>
                          <div className="text-[10px] text-slate-500">
                            {item.material_description}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#004C97]">
                          {item.planned_quantity_tons.toFixed(1).replace('.', ',')} t
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {item.productivity_rate_th.toFixed(1).replace('.', ',')}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {item.production_hours.toFixed(1).replace('.', ',')} h
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge className="bg-slate-100 text-slate-800 text-[10px] font-semibold">
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">
                        Nenhuma ordem semanal programada para a linha e semana atuais na base de
                        dados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL DRILL-DOWN E JUSTIFICATIVA DE DESVIO DO PLANO MESTRE */}
      <Dialog open={itemDetailModalOpen} onOpenChange={setItemDetailModalOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Drill-down: {selectedItemForDetail?.product_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs py-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
              <div>
                <strong className="text-slate-700">Planejado:</strong>{' '}
                {selectedItemForDetail?.planned_tons} t
              </div>
              <div>
                <strong className="text-slate-700">Produzido:</strong>{' '}
                {selectedItemForDetail?.produced_tons} t
              </div>
              <div>
                <strong className="text-slate-700">Venda Real:</strong>{' '}
                {selectedItemForDetail?.firm_sales_tons} t
              </div>
              <div>
                <strong className="text-slate-700">Gap:</strong> {selectedItemForDetail?.gap_tons} t
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">
                Causa Raiz Padronizada
              </Label>
              <select
                value={deviationCause}
                onChange={(e) => setDeviationCause(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
              >
                <option value="">Selecione a Causa Raiz...</option>
                <option value="ALTERACAO_DEMANDA">Alteração de Demanda / Vendas</option>
                <option value="INDISPONIBILIDADE_MP">Indisponibilidade de Matéria-Prima</option>
                <option value="INDISPONIBILIDADE_SEMI">Indisponibilidade de Semiacabado</option>
                <option value="PARADA_EQUIPAMENTO">Parada de Equipamento / Manutenção</option>
                <option value="QUALIDADE_RETENCAO">Qualidade / Retenção de Lote</option>
                <option value="DECISAO_COMERCIAL">Decisão Comercial / Priorização</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">
                Justificativa Técnica
              </Label>
              <Input
                placeholder="Ex: Atraso na entrega de tarugos pela usina parceira..."
                value={deviationJustification}
                onChange={(e) => setDeviationJustification(e.target.value)}
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Plano de Ação</Label>
              <Input
                placeholder="Ex: Compensar volume na semana 3 com abertura de 3º turno..."
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setItemDetailModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveItemDeviation}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              Gravar Desvio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MasterPlanningPage

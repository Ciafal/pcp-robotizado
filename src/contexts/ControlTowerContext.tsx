import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import {
  PerspectiveMode,
  ViewTab,
  GlobalFilterState,
  CentralSubmodule,
  Company,
  Plant,
  ProductionLineHierarchy,
  WorkCenterNode,
  ResourceNode,
  ProductOrder,
  ProductionProcessNode,
  BottleneckItem,
  BufferStatus,
  FlowSankeyStep,
  OperationalEvent,
  OperationalAlert,
  ScenarioDefinition,
  ImpactAnalysis,
  VersionHistoryItem,
} from '@/types/control-tower'
import {
  mockCompanies,
  mockPlants,
  mockProductionLines,
  mockWorkCenters,
  mockResources,
  mockCentralOrders,
  mockProcessNodes,
  mockBottlenecks,
  mockBuffers,
  mockFlowSteps,
  mockOperationalEvents,
  mockOperationalAlerts,
  mockScenarios,
  mockImpactAnalysis,
  mockVersionHistory,
  mockPlantCapacityAnalysis,
  mockProductLinePerformances,
  mockProductionDeviations,
  mockScheduleAssertiveness,
  mockLineRelationships,
  mockCommercialBacklog,
  mockWmsInventory,
  mockLineDoubleApprovals,
  resolveEffectiveRules,
} from '@/data/control-tower-mock'
import {
  PlantCapacityAnalysis,
  ProductLinePerformance,
  ProductionDeviation,
  ScheduleAssertivenessKPI,
  ProductionLineRelationship,
  CommercialBacklogItem,
  WmsInventoryProjection,
  LineDoubleApprovalItem,
} from '@/types/control-tower'
import { useToast } from '@/hooks/use-toast'
import { evaluateScheduleItemsGaugeRestrictions } from '@/services/gauge-restriction-evaluation'
import { getPlantNow, getIsoWeekAndYear, getWeekDateRange } from '@/lib/temporal-utils'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

export interface SimulationDragDiff {
  orderId: string
  orderNumber: string
  originalLine: string
  newLine: string
  originalStart: string
  newStart: string
  setupDeltaMinutes: number
  materialRisk: boolean
  delayDeltaHours: number
  capacityConflict: boolean
  downstreamImpactTons: number
}

interface ControlTowerContextType {
  // Submódulo Ativo
  activeSubmodule: CentralSubmodule
  setActiveSubmodule: (s: CentralSubmodule) => void

  // Perspectiva e Lente
  perspective: PerspectiveMode
  setPerspective: (p: PerspectiveMode) => void
  activeTab: ViewTab
  setActiveTab: (t: ViewTab) => void

  // Hierarquia Mestre CIAFAL
  companies: Company[]
  plants: Plant[]
  lines: ProductionLineHierarchy[]
  workCenters: WorkCenterNode[]
  resources: ResourceNode[]

  // Filtros em Cascata & Contexto Persistente
  filters: GlobalFilterState
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilterState>>
  setCompanyScope: (companyCode: string) => void
  setPlantScope: (plantCode: string) => void
  setLineScope: (lineCode: string) => void
  resetFilters: () => void

  // Cascata de opções disponíveis
  availablePlants: Plant[]
  availableLines: ProductionLineHierarchy[]

  // Resolução de Regras e Herança
  effectiveRules: ReturnType<typeof resolveEffectiveRules>

  // Dados Centrais Únicos Compartilhados
  orders: ProductOrder[]
  processNodes: ProductionProcessNode[]
  bottlenecks: BottleneckItem[]
  buffers: BufferStatus[]
  flowSteps: FlowSankeyStep[]
  events: OperationalEvent[]
  alerts: OperationalAlert[]
  scenarios: ScenarioDefinition[]
  activeScenarioId: string
  setActiveScenarioId: (id: string) => void
  impactAnalysis: ImpactAnalysis
  versionHistory: VersionHistoryItem[]

  // Dados Filtrados Reativamente por Hierarquia
  filteredOrders: ProductOrder[]
  filteredNodes: ProductionProcessNode[]
  filteredBottlenecks: BottleneckItem[]
  filteredAlerts: OperationalAlert[]

  // KPIs Agregados por Nível de Escopo
  kpis: {
    plannedTons: number
    producedTons: number
    projectedTons: number
    adherencePct: number
    availableCapacityPct: number
    occupancyPct: number
    activeBottlenecks: number
    ordersAtRisk: number
    delaysCount: number
    criticalStopsCount: number
    totalRatePerHour: number
    plantsCount: number
    linesCount: number
  }

  // Comparações de Nível
  plantComparisonData: {
    plantCode: string
    plantName: string
    plannedTons: number
    producedTons: number
    projectedTons: number
    adherencePct: number
    occupancyPct: number
    bottlenecksCount: number
    ordersAtRiskCount: number
    criticalStopsCount: number
  }[]

  lineComparisonData: {
    lineCode: string
    lineName: string
    plantCode: string
    currentOrder: string
    nextOrder: string
    plannedTons: number
    producedTons: number
    projectedTons: number
    adherencePct: number
    occupancyPct: number
    bufferCoverageHours: number
    currentRate: number
    targetRate: number
    status: string
    bottlenecksCount: number
    ordersAtRiskCount: number
  }[]

  // Modelos Avançados de Capacidade, Eficiência, Carteira e WMS
  plantCapacityAnalysis: PlantCapacityAnalysis
  productPerformances: ProductLinePerformance[]
  productionDeviations: ProductionDeviation[]
  scheduleAssertiveness: ScheduleAssertivenessKPI
  lineRelationships: ProductionLineRelationship[]
  commercialBacklog: CommercialBacklogItem[]
  wmsInventory: WmsInventoryProjection[]
  doubleApprovals: LineDoubleApprovalItem[]

  // Ações de Tratamento de Desvio, Proposta de Parâmetro e Aprovação Dupla
  addDeviationAction: (
    deviationId: string,
    actionPlan: string,
    justification: string,
    responsible: string,
    deadline: string,
  ) => void
  proposeParamRevision: (deviationId: string) => void
  approveLineDouble: (approvalId: string, role: 'PCP' | 'LINE_MANAGER', notes?: string) => void

  // Modais & Gavetas
  selectedProcess: ProductionProcessNode | null
  setSelectedProcess: (p: ProductionProcessNode | null) => void
  selectedOrder: ProductOrder | null
  setSelectedOrder: (o: ProductOrder | null) => void
  isSimulatorModalOpen: boolean
  setIsSimulatorModalOpen: (open: boolean) => void
  isComparisonModalOpen: boolean
  setIsComparisonModalOpen: (open: boolean) => void
  isAlertCenterOpen: boolean
  setIsAlertCenterOpen: (open: boolean) => void
  isAIPanelOpen: boolean
  setIsAIPanelOpen: (open: boolean) => void
  isCriticalPathVisible: boolean
  setIsCriticalPathVisible: (show: boolean) => void
  isVersionModalOpen: boolean
  setIsVersionModalOpen: (open: boolean) => void

  // Simulação Drag & Drop Temporária
  activeSimulationDiff: SimulationDragDiff | null
  simulateOrderMove: (orderId: string, newLine: string, newStart: string) => void
  cancelSimulation: () => void
  applySimulationToScenario: () => void
  sendScenarioForApproval: (note: string) => void

  // Ações de Alertas e Auditoria
  acknowledgeAlert: (alertId: string) => void
  refreshData: () => void
  lastSyncTime: string
  isSyncing: boolean

  // Navegação Cruzada Inteligente
  navigateToSubmodule: (
    submodule: CentralSubmodule,
    overrideScope?: { company?: string; plant?: string; line?: string; tab?: ViewTab },
  ) => void
}

function filterWeeklySchedulesByPeriod(
  records: any[],
  period: GlobalFilterState['period'],
  customRange?: { start?: string | Date; end?: string | Date },
): any[] {
  if (!records || records.length === 0) return []

  const plantNow = getPlantNow()

  let rangeStart: Date | null = null
  let rangeEnd: Date | null = null

  switch (period) {
    case 'HOJE': {
      rangeStart = new Date(plantNow)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd = new Date(plantNow)
      rangeEnd.setHours(23, 59, 59, 999)
      break
    }
    case 'AMANHA': {
      rangeStart = new Date(plantNow)
      rangeStart.setDate(plantNow.getDate() + 1)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd = new Date(rangeStart)
      rangeEnd.setHours(23, 59, 59, 999)
      break
    }
    case 'SEMANA': {
      const { year, week } = getIsoWeekAndYear(plantNow)
      const weekRange = getWeekDateRange(year, week)
      rangeStart = weekRange.startDate
      rangeEnd = weekRange.endDate
      break
    }
    case '7_DIAS': {
      rangeStart = new Date(plantNow)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd = new Date(plantNow)
      rangeEnd.setDate(plantNow.getDate() + 7)
      rangeEnd.setHours(23, 59, 59, 999)
      break
    }
    case '15_DIAS': {
      rangeStart = new Date(plantNow)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd = new Date(plantNow)
      rangeEnd.setDate(plantNow.getDate() + 15)
      rangeEnd.setHours(23, 59, 59, 999)
      break
    }
    case 'MES': {
      rangeStart = new Date(plantNow.getFullYear(), plantNow.getMonth(), 1, 0, 0, 0, 0)
      rangeEnd = new Date(plantNow.getFullYear(), plantNow.getMonth() + 1, 0, 23, 59, 59, 999)
      break
    }
    case 'CUSTOM': {
      if (customRange?.start) {
        rangeStart = new Date(customRange.start)
      }
      if (customRange?.end) {
        rangeEnd = new Date(customRange.end)
      }
      break
    }
    default:
      return records
  }

  if (!rangeStart && !rangeEnd) {
    return records
  }

  const startTime = rangeStart ? rangeStart.getTime() : -Infinity
  const endTime = rangeEnd ? rangeEnd.getTime() : Infinity

  return records.filter((item) => {
    const rawDateStr = item.start_datetime || item.end_datetime
    if (!rawDateStr) return true
    const parsed = new Date(String(rawDateStr).replace(' ', 'T'))
    if (isNaN(parsed.getTime())) return true
    const t = parsed.getTime()
    return t >= startTime && t <= endTime
  })
}

const initialFilters: GlobalFilterState = {
  companyCode: 'CIAFAL',
  plantCode: 'ALL',
  lineCode: 'ALL',
  period: 'HOJE',
  processCode: 'ALL',
  familyCode: 'ALL',
  shift: 'ALL',
  status: 'ALL',
  quickFilterOnlyBottlenecks: false,
  quickFilterOnlyDelays: false,
  quickFilterOnlyConflicts: false,
  quickFilterOnlyRisks: false,
  quickFilterOnlyChanges: false,
  quickFilterOnlyOrdersAtRisk: false,
  searchQuery: '',
}

const ControlTowerContext = createContext<ControlTowerContextType | undefined>(undefined)

export const ControlTowerProvider: React.FC<{
  children: React.ReactNode
  initialSubmodule?: CentralSubmodule
}> = ({ children, initialSubmodule = 'TORRE_CONTROLE' }) => {
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeSubmodule, setActiveSubmodule] = useState<CentralSubmodule>(initialSubmodule)
  const [perspective, setPerspective] = useState<PerspectiveMode>('PROGRAMADOR')
  const [activeTab, setActiveTab] = useState<ViewTab>('OVERVIEW')

  // Inicializar filtros a partir dos query params se existirem na URL
  const [filters, setFilters] = useState<GlobalFilterState>(() => {
    const qCompany = searchParams.get('company') || 'CIAFAL'
    const qPlant = searchParams.get('plant') || 'ALL'
    const qLine = searchParams.get('line') || 'ALL'
    const qPeriod = (searchParams.get('period') as GlobalFilterState['period']) || 'HOJE'

    return {
      ...initialFilters,
      companyCode: qCompany,
      plantCode: qPlant,
      lineCode: qLine,
      period: qPeriod,
    }
  })

  // Sincronizar query params com o estado de filtros APENAS em rotas da Torre de Controle / Sequenciamento Central
  // Na raiz ('/') e demais telas operacionais, NUNCA mutar os searchParams nem sobrescrever parâmetros como `?v=...`
  useEffect(() => {
    const isControlTowerRoute =
      location.pathname.startsWith('/pcp/sequenciamento/torre-controle') ||
      location.pathname.startsWith('/pcp-robotizado/torre-controle') ||
      location.pathname.startsWith('/pcp/sequenciamento/cenarios') ||
      location.pathname.startsWith('/pcp/sequenciamento/historico')

    if (!isControlTowerRoute) {
      return
    }

    const currentParams = new URLSearchParams(location.search)
    let hasChanged = false

    if (filters.companyCode && currentParams.get('company') !== filters.companyCode) {
      currentParams.set('company', filters.companyCode)
      hasChanged = true
    }
    if (filters.plantCode && currentParams.get('plant') !== filters.plantCode) {
      currentParams.set('plant', filters.plantCode)
      hasChanged = true
    }
    if (filters.lineCode && currentParams.get('line') !== filters.lineCode) {
      currentParams.set('line', filters.lineCode)
      hasChanged = true
    }
    if (filters.period && currentParams.get('period') !== filters.period) {
      currentParams.set('period', filters.period)
      hasChanged = true
    }

    if (hasChanged) {
      setSearchParams(currentParams, { replace: true })
    }
  }, [filters, location.pathname, location.search, setSearchParams])

  // Hierarquia
  const [companies] = useState<Company[]>(mockCompanies)
  const [plants] = useState<Plant[]>(mockPlants)
  const [lines] = useState<ProductionLineHierarchy[]>(mockProductionLines)
  const [workCenters] = useState<WorkCenterNode[]>(mockWorkCenters)
  const [resources] = useState<ResourceNode[]>(mockResources)

  // Modelo de Dados Central Único
  const [orders, setOrders] = useState<ProductOrder[]>(mockCentralOrders)

  // Sincronização em tempo real das programações semanais publicadas/aprovadas da coleção weekly_schedules
  // Restrita EXCLUSIVAMENTE às rotas de sequenciamento e torre de controle:
  // /pcp/sequenciamento*, /pcp-robotizado/torre-controle*, /pcp-robotizado/sequenciamento*
  // NUNCA executada na raiz "/" ou no Cockpit Operacional PCP
  useEffect(() => {
    const isTargetRoute = (pathname: string): boolean => {
      return (
        pathname.startsWith('/pcp/sequenciamento') ||
        pathname.startsWith('/pcp-robotizado/torre-controle') ||
        pathname.startsWith('/pcp-robotizado/sequenciamento')
      )
    }

    if (!isTargetRoute(location.pathname)) {
      return
    }

    let isSubscribed = true
    let unsubscribe: (() => void) | undefined

    const syncWeeklySchedulesToTower = async () => {
      // Reavalia no momento da execução
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : location.pathname
      if (!isSubscribed || !isTargetRoute(currentPath)) return
      try {
        const records = await pb.collection('weekly_schedules').getFullList({
          sort: 'sequence_order',
        })
        if (!isSubscribed || !isTargetRoute(currentPath)) return
        if (records && records.length > 0) {
          const syncedOrders: ProductOrder[] = records.map((r: any, idx: number) => {
            const planned = Number(r.planned_quantity_tons) || 100
            const produced =
              Number(r.realized_quantity_tons) ||
              (r.status === 'REALIZADO'
                ? planned
                : r.status === 'EXECUTANDO'
                  ? Math.round(planned * 0.6)
                  : 0)
            const orderStatus: ProductOrder['status'] =
              r.status === 'EXECUTANDO'
                ? 'IN_PRODUCTION'
                : r.status === 'REALIZADO'
                  ? 'COMPLETED'
                  : r.status === 'PUBLICADO' || r.status === 'APROVADO_PCP'
                    ? 'RELEASED'
                    : 'PLANNED'

            return {
              id: r.id || `ws-ord-${idx}`,
              orderNumber:
                r.production_order || `OP-${r.line_code}-2026-${String(idx + 1).padStart(3, '0')}`,
              campaignId: `CAMP-${r.week_number}`,
              campaignName: `Semana ${r.week_number} &bull; ${r.day_of_week}`,
              companyCode: r.company_code || 'CIAFAL',
              plantCode: r.plant_code || 'PLANTA_1',
              lineCode: r.line_code || 'L1',
              processName: 'Laminação Contínua',
              familyCode: r.family_code || 'GERAL',
              familyName: r.steel_grade || 'Perfil Aço',
              materialCode: r.material_code || 'PROD-001',
              materialName: r.material_description || r.material_code || 'Produto Programado',
              customerName:
                r.customer_name ||
                (r.order_type === 'MTO'
                  ? 'Cliente Industrial Especial'
                  : 'Estoque / Reposição MTS'),
              salesOrderId: r.sales_order_mto || 'SO-2026-001',
              salesOrderItem: '0010',
              plannedTons: planned,
              producedTons: produced,
              remainingTons: Math.max(0, planned - produced),
              targetRatePerHour: Number(r.productivity_rate_th) || 12.0,
              currentRatePerHour: Number(r.productivity_rate_th) || 12.0,
              adherencePct: planned > 0 ? Math.round((produced / planned) * 100) : 100,
              plannedStart: r.start_datetime || '2026-08-24 06:00',
              plannedEnd: r.end_datetime || '2026-08-24 14:00',
              projectedEnd: r.end_datetime || '2026-08-24 14:00',
              status: orderStatus,
              setupMinutes: Number(r.setup_duration_minutes) || 0,
              setupCompleted: true,
              rawMaterialAvailable: true,
              rawMaterialBufferHours: 24,
              downstreamBufferTons: 50,
              priority: (r.order_type === 'MTO' ? 1 : 2) as 1 | 2 | 3 | 4 | 5,
              isCriticalPath: r.order_type === 'MTO',
              shift: r.shift_name || '1º Turno Matutino',
              programmer: 'Programador PCP',
              delayMinutes: 0,
              alertsCount: r.is_blocked_attempt ? 1 : 0,
              productionType: (r.order_type === 'MTO' ? 'MTO' : 'MTS') as 'MTS' | 'MTO',
            }
          })

          // Mescla ordens sincronizadas da montagem semanal com a base central
          setOrders((prev) => {
            const preservedNonWeekly = prev.filter(
              (o) => !o.id.startsWith('temp-') && !records.some((r) => r.id === o.id),
            )
            return [...syncedOrders, ...preservedNonWeekly]
          })

          // BLOCO C: Gera Ocorrências de "Risco de Matéria-Prima" para itens com déficit ou risco
          const rawMaterialAlerts: OperationalAlert[] = []
          records.forEach((rec: any, idx: number) => {
            const status = rec.raw_material_status
            const deficit = Number(rec.raw_material_deficit_tons) || 0
            const plannedProd = Number(rec.planned_quantity_tons) || 0
            const requiredMp =
              rec.raw_material_summary?.totalRequiredTons ||
              (rec.raw_material_yield_pct > 0
                ? Math.round((plannedProd / (rec.raw_material_yield_pct / 100)) * 100) / 100
                : plannedProd)
            const progMp = Number(rec.raw_material_planned_tons) || 0

            if (
              status === 'MP_NAO_PROGRAMADA' ||
              status === 'SALDO_NEGATIVO_RISCO_RUPTURA' ||
              status === 'MP_PARCIALMENTE_ATENDIDA' ||
              status === 'AGUARDANDO_ENTRADA' ||
              status === 'EXCESSO' ||
              deficit > 0.01
            ) {
              const classification =
                status === 'MP_NAO_PROGRAMADA'
                  ? 'NAO_PROGRAMADA'
                  : status === 'SALDO_NEGATIVO_RISCO_RUPTURA'
                    ? 'SALDO_INSUFICIENTE'
                    : status === 'EXCESSO'
                      ? 'EXCESSO'
                      : status === 'AGUARDANDO_ENTRADA'
                        ? 'AGUARDANDO_RECEBIMENTO'
                        : deficit > 0
                          ? 'PARCIALMENTE_ATENDIDA'
                          : 'MP_ATENDIDA'

              const criticality =
                status === 'MP_NAO_PROGRAMADA' || status === 'SALDO_NEGATIVO_RISCO_RUPTURA'
                  ? 'CRITICA'
                  : deficit > 20
                    ? 'ALTA'
                    : 'MEDIA'

              const severity =
                criticality === 'CRITICA' ? 'CRITICAL' : criticality === 'ALTA' ? 'WARNING' : 'INFO'

              rawMaterialAlerts.push({
                id: `al-mp-${rec.id || idx}-${Date.now()}`,
                code: `AL-MP-${idx + 1}`,
                companyCode: rec.company_code || 'CIAFAL',
                plantCode: rec.plant_code || 'DIV',
                processCode: rec.line_code || 'L1',
                orderNumber: rec.production_order || `OP-${rec.line_code || 'L1'}-${idx + 1}`,
                severity,
                category: 'MATERIAIS',
                title: `${rec.company_code || 'CIAFAL'} > ${rec.line_code || 'L1'} — ⚠ Risco de Matéria-Prima (${classification})`,
                cause:
                  status === 'MP_NAO_PROGRAMADA'
                    ? 'Produto programado no PCP sem nenhuma alocação de matéria-prima.'
                    : status === 'SALDO_NEGATIVO_RISCO_RUPTURA'
                      ? 'Saldo projetado negativo de matéria-prima na data planejada de produção.'
                      : status === 'EXCESSO'
                        ? 'Quantidade de matéria-prima alocada acima da necessidade líquida calculada.'
                        : `Alocação de MP insuficiente para a ordem. Déficit de ${deficit.toFixed(2)} t.`,
                impact:
                  criticality === 'CRITICA'
                    ? 'Parada iminente da linha de produção ou reprogramação de campanha.'
                    : 'Risco de atraso no cumprimento da carteira ou dependência de recebimento.',
                whoIsAffected: `Operação Linha ${rec.line_code || 'L1'}, PCP Mestre e Pedido ${rec.sales_order_mto || rec.production_order || 'Geral'}`,
                whenImpact: `Planejado para ${rec.day_of_week || 'Semana corrente'} (${rec.start_datetime || 'Hoje'})`,
                alternatives: [
                  'Alocar tarugos de outros lotes disponíveis no pátio',
                  'Confirmar data de faturamento e entrega com fornecedor',
                  'Inverter sequência com produto que tenha MP liberada',
                ],
                aiConfidencePct: 96,
                timestamp: new Date().toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                acknowledged: false,
                rawMaterialRiskData: {
                  companyCode: rec.company_code || 'CIAFAL',
                  plantCode: rec.plant_code || 'DIV',
                  lineCode: rec.line_code || 'L1',
                  productionDateStr: rec.start_datetime || rec.day_of_week || 'Hoje',
                  productCode: rec.material_code || 'PROD',
                  productDescription: rec.material_description,
                  productionTons: plannedProd,
                  rawMaterialCode: rec.raw_material_material_code || 'MP-PADRAO',
                  rawMaterialType: rec.raw_material_type || 'TARUGO',
                  requiredMpTons: requiredMp,
                  programmedMpTons: progMp,
                  currentStockTons: rec.raw_material_available_tons ?? null,
                  supplierReceiptsTons: null,
                  pcpUpstreamTons: 0,
                  pcpCommittedOtherTons: 0,
                  projectedBalanceTons:
                    rec.raw_material_available_tons !== null &&
                    rec.raw_material_available_tons !== undefined
                      ? rec.raw_material_available_tons - progMp
                      : null,
                  deficitTons: deficit,
                  classification,
                  criticality,
                },
              })
            }
          })

          if (rawMaterialAlerts.length > 0) {
            setAlerts((prev) => {
              // Evita duplicar alertas da mesma ordem de MP
              const filtered = prev.filter((a) => !a.id.startsWith('al-mp-'))
              return [...rawMaterialAlerts, ...filtered]
            })
          }

          // AVALIAÇÃO DE RESTRIÇÕES MÍNIMAS DE BITOLA
          const filteredScheduleItems = filterWeeklySchedulesByPeriod(records, filters.period)
          const gaugeEvaluations = await evaluateScheduleItemsGaugeRestrictions({
            items: filteredScheduleItems as WeeklyScheduleItem[],
          })

          const gaugeRestrictionAlerts: OperationalAlert[] = []
          gaugeEvaluations.forEach((evalResult, idx) => {
            if (evalResult.pendingCount > 0) {
              const company = evalResult.company || 'CIAFAL'
              const line = evalResult.line || 'L1'
              const gauge = evalResult.currentGauge || 'N/D'

              gaugeRestrictionAlerts.push({
                id: `al-bitola-${line}-${gauge}-${idx}-${Date.now()}`,
                code: `AL-BITOLA-${idx + 1}`,
                companyCode: company,
                plantCode: 'DIV',
                processCode: line,
                severity: 'WARNING',
                category: 'RESTRIÇÃO_BITOLA',
                title: `${company} > ${line} — ⚠ Restrição Mínima de Bitola (${gauge})`,
                cause: `A bitola atual ${gauge} na linha ${line} possui restrições mínimas pendentes de atendimento antes da troca.`,
                impact:
                  'Risco de troca prematura de bitola, perda de produtividade por campanha curta ou setup desnecessário.',
                whoIsAffected: `Operação Linha ${line}, Oficina de Cilindros e Programação PCP`,
                whenImpact: `Período ${filters.period}`,
                alternatives: [
                  'Completar tonelagem mínima da campanha antes da troca',
                  'Ajustar sequência para aproveitar bitolas adjacentes da mesma família',
                  'Solicitar liberação extraordinária de exceção com justificativa técnica',
                ],
                aiConfidencePct: 98,
                timestamp: new Date().toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                acknowledged: false,
                gaugeRestrictionData: {
                  lineCode: line,
                  workCenter: evalResult.center || line,
                  gaugeMm: gauge,
                  totalRestrictions: evalResult.activeRestrictionsCount,
                  satisfiedCount: evalResult.satisfiedCount,
                  pendingCount: evalResult.pendingCount,
                  pendingDetails: evalResult.evaluations.map((e) => ({
                    type: e.ruleDescription || e.restrictionType,
                    currentStr: `${e.currentValue} ${e.unitOfMeasure}`,
                    minStr: `${e.requiredValue} ${e.unitOfMeasure}`,
                    deficitStr:
                      e.deficitFormatted ||
                      (e.deficitValue > 0 ? `${e.deficitValue} ${e.unitOfMeasure}` : '0'),
                    satisfied: e.isSatisfied,
                  })),
                },
              })
            }
          })

          setAlerts((prev) => [
            ...gaugeRestrictionAlerts,
            ...prev.filter((a) => a.category !== 'RESTRIÇÃO_BITOLA'),
          ])
        }
      } catch (err) {
        console.warn('Sincronização de weekly_schedules com Torre de Controle:', err)
      }
    }

    const initSubscription = () => {
      // Condicionar a subscrição exclusivamente ao match de rota avaliado no MOMENTO DA CONEXÃO
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : location.pathname
      if (!isSubscribed || !isTargetRoute(currentPath)) return

      syncWeeklySchedulesToTower()

      try {
        pb.collection('weekly_schedules')
          .subscribe('*', () => {
            const activePath =
              typeof window !== 'undefined' ? window.location.pathname : location.pathname
            if (isSubscribed && isTargetRoute(activePath)) {
              syncWeeklySchedulesToTower()
            }
          })
          .then((unsub) => {
            const activePath =
              typeof window !== 'undefined' ? window.location.pathname : location.pathname
            if (!isSubscribed || !isTargetRoute(activePath)) {
              unsub()
            } else {
              unsubscribe = unsub
            }
          })
          .catch(() => {
            /* intentionally ignored */
          })
      } catch {
        /* intentionally ignored */
      }
    }

    initSubscription()

    return () => {
      isSubscribed = false
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [location.pathname, filters.period])
  const [processNodes, setProcessNodes] = useState<ProductionProcessNode[]>(mockProcessNodes)
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>(mockBottlenecks)
  const [buffers, setBuffers] = useState<BufferStatus[]>(mockBuffers)
  const [flowSteps, setFlowSteps] = useState<FlowSankeyStep[]>(mockFlowSteps)
  const [events, setEvents] = useState<OperationalEvent[]>(mockOperationalEvents)
  const [alerts, setAlerts] = useState<OperationalAlert[]>(mockOperationalAlerts)
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>(mockScenarios)
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scen-base')
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis>(mockImpactAnalysis)
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>(mockVersionHistory)

  // Modelos Avançados de Capacidade, Eficiência, Carteira e WMS
  const [plantCapacityAnalysis, setPlantCapacityAnalysis] =
    useState<PlantCapacityAnalysis>(mockPlantCapacityAnalysis)
  const [productPerformances, setProductPerformances] = useState<ProductLinePerformance[]>(
    mockProductLinePerformances,
  )
  const [productionDeviations, setProductionDeviations] =
    useState<ProductionDeviation[]>(mockProductionDeviations)
  const [scheduleAssertiveness, setScheduleAssertiveness] =
    useState<ScheduleAssertivenessKPI>(mockScheduleAssertiveness)
  const [lineRelationships, setLineRelationships] =
    useState<ProductionLineRelationship[]>(mockLineRelationships)
  const [commercialBacklog, setCommercialBacklog] =
    useState<CommercialBacklogItem[]>(mockCommercialBacklog)
  const [wmsInventory, setWmsInventory] = useState<WmsInventoryProjection[]>(mockWmsInventory)
  const [doubleApprovals, setDoubleApprovals] =
    useState<LineDoubleApprovalItem[]>(mockLineDoubleApprovals)

  // Tratamento de Desvio Obrigatório
  const addDeviationAction = useCallback(
    (
      deviationId: string,
      actionPlan: string,
      justification: string,
      responsible: string,
      deadline: string,
    ) => {
      setProductionDeviations((prev) =>
        prev.map((d) => {
          if (d.id === deviationId) {
            return {
              ...d,
              actionPlan,
              justification,
              responsibleName: responsible,
              deadline,
              status: 'EM_TRATAMENTO',
            }
          }
          return d
        }),
      )
      toast({
        title: '📋 Ação de Desvio Registrada',
        description:
          'Justificativa, responsável e prazo vinculados. Ciclo de aprendizado atualizado.',
      })
    },
    [toast],
  )

  // Proposta de Revisão de Parâmetro da Ficha Mestre
  const proposeParamRevision = useCallback(
    (deviationId: string) => {
      const dev = productionDeviations.find((d) => d.id === deviationId)
      if (!dev || !dev.proposedParamRevision) return

      const newApproval: LineDoubleApprovalItem = {
        id: `app-${Date.now()}`,
        entityType: 'CAPACITY_PARAM',
        entityId: dev.lineCode,
        lineCode: dev.lineCode,
        lineName: `Linha ${dev.lineCode}`,
        version: `v${dev.lineCode === 'L1' ? '2.2' : '1.1'}`,
        changeReason: `Proposta de revisão de parâmetro (${dev.proposedParamRevision.field}) a partir do desvio na OP ${dev.orderNumber}. Motivo: ${dev.proposedParamRevision.reason}`,
        authorName: 'Motor IA / Aprendizado PCP',
        authorRole: 'AI_AGENT',
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        pcpApproval: {
          status: 'PENDING',
          notes: 'Aguardando validação do Coordenador de PCP',
        },
        lineManagerApproval: {
          status: 'PENDING',
          notes: 'Aguardando validação do Coordenador de Linha',
        },
        finalStatus: 'PENDING_PCP',
      }

      setDoubleApprovals((prev) => [newApproval, ...prev])
      toast({
        title: '⚙️ Proposta de Revisão de Parâmetro Aberta',
        description:
          'Enviada para esteira de aprovação dupla (PCP + Linha). Ficha Mestre preservada até aprovação final.',
      })
    },
    [productionDeviations, toast],
  )

  // Aprovação Dupla (PCP + Gestor da Linha)
  const approveLineDouble = useCallback(
    (approvalId: string, role: 'PCP' | 'LINE_MANAGER', notes?: string) => {
      setDoubleApprovals((prev) =>
        prev.map((item) => {
          if (item.id === approvalId) {
            const updated = { ...item }
            const now = new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })
            if (role === 'PCP') {
              updated.pcpApproval = {
                status: 'APPROVED',
                approverName: 'Lucas Ferreira (PCP)',
                approvedAt: now,
                notes: notes || 'Aprovado pelo Planejamento Mestre',
              }
              if (updated.lineManagerApproval.status === 'APPROVED') {
                updated.finalStatus = 'ACTIVE'
              } else {
                updated.finalStatus = 'PENDING_LINE_MANAGER'
              }
            } else {
              updated.lineManagerApproval = {
                status: 'APPROVED',
                approverName: 'Carlos Mendes (Gestor da Linha)',
                approvedAt: now,
                notes: notes || 'Validado pela Operação',
              }
              if (updated.pcpApproval.status === 'APPROVED') {
                updated.finalStatus = 'ACTIVE'
              } else {
                updated.finalStatus = 'PENDING_PCP'
              }
            }
            return updated
          }
          return item
        }),
      )
      toast({
        title: '✍️ Aprovação Registrada na Esteira',
        description: `Fase ${role === 'PCP' ? '1/2 (PCP)' : '2/2 (Gestor)'} concluída com sucesso.`,
      })
    },
    [toast],
  )

  // Drawers & Modals
  const [selectedProcess, setSelectedProcess] = useState<ProductionProcessNode | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null)
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false)
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false)
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false)
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [isCriticalPathVisible, setIsCriticalPathVisible] = useState(false)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)

  // Simulação Temporária
  const [activeSimulationDiff, setActiveSimulationDiff] = useState<SimulationDragDiff | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string>('28/08/2026 09:28')
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Filtros em Cascata: Plantas Disponíveis
  const availablePlants = useMemo(() => {
    if (filters.companyCode === 'ALL') return plants
    return plants.filter((p) => p.companyCode === filters.companyCode)
  }, [plants, filters.companyCode])

  // Filtros em Cascata: Linhas Disponíveis (NUNCA mostrar linha de outra planta se planta estiver selecionada)
  const availableLines = useMemo(() => {
    return lines.filter((l) => {
      if (filters.companyCode !== 'ALL' && l.companyCode !== filters.companyCode) return false
      if (filters.plantCode !== 'ALL' && l.plantCode !== filters.plantCode) return false
      return true
    })
  }, [lines, filters.companyCode, filters.plantCode])

  // Setters de Escopo com Reset em Cascata
  const setCompanyScope = useCallback((companyCode: string) => {
    setFilters((prev) => {
      const next: GlobalFilterState = {
        ...prev,
        companyCode,
        plantCode: 'ALL',
        lineCode: 'ALL',
      }
      return next
    })
  }, [])

  const setPlantScope = useCallback((plantCode: string) => {
    setFilters((prev) => {
      const next: GlobalFilterState = {
        ...prev,
        plantCode,
        lineCode: 'ALL',
      }
      return next
    })
  }, [])

  const setLineScope = useCallback((lineCode: string) => {
    setFilters((prev) => ({ ...prev, lineCode }))
  }, [])

  // Herança Efetiva de Regras
  const effectiveRules = useMemo(() => {
    return resolveEffectiveRules(filters.companyCode, filters.plantCode, filters.lineCode)
  }, [filters.companyCode, filters.plantCode, filters.lineCode])

  // Filtragem Reativa de Ordens (Empresa -> Planta -> Linha)
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (filters.companyCode !== 'ALL' && ord.companyCode !== filters.companyCode) return false
      if (filters.plantCode !== 'ALL' && ord.plantCode !== filters.plantCode) return false
      if (filters.lineCode !== 'ALL' && ord.lineCode !== filters.lineCode) return false
      if (filters.familyCode !== 'ALL' && ord.familyCode !== filters.familyCode) return false
      if (filters.status !== 'ALL' && ord.status !== filters.status) return false

      if (filters.quickFilterOnlyDelays && ord.delayMinutes <= 0) return false
      if (filters.quickFilterOnlyOrdersAtRisk && ord.priority > 2 && ord.delayMinutes <= 0)
        return false
      if (filters.quickFilterOnlyBottlenecks && !ord.isCriticalPath) return false

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase()
        const match =
          ord.orderNumber.toLowerCase().includes(q) ||
          ord.materialName.toLowerCase().includes(q) ||
          ord.customerName.toLowerCase().includes(q) ||
          ord.campaignName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [orders, filters])

  // Filtragem Reativa de Nós
  const filteredNodes = useMemo(() => {
    return processNodes.filter((node) => {
      if (filters.companyCode !== 'ALL' && node.companyCode !== filters.companyCode) return false
      if (filters.plantCode !== 'ALL' && node.plantCode !== filters.plantCode) return false
      if (filters.lineCode !== 'ALL' && node.code !== filters.lineCode) {
        if (
          !node.downstreamProcessCodes.includes(filters.lineCode) &&
          !node.upstreamProcessCodes.includes(filters.lineCode)
        ) {
          return false
        }
      }
      if (filters.quickFilterOnlyBottlenecks && !node.isBottleneck) return false
      return true
    })
  }, [processNodes, filters])

  // Filtragem de Gargalos
  const filteredBottlenecks = useMemo(() => {
    return bottlenecks.filter((bot) => {
      if (filters.companyCode !== 'ALL' && bot.companyCode !== filters.companyCode) return false
      if (filters.plantCode !== 'ALL' && bot.plantCode !== filters.plantCode) return false
      if (filters.lineCode !== 'ALL' && bot.processCode !== filters.lineCode) return false
      return true
    })
  }, [bottlenecks, filters])

  // Filtragem de Alertas
  const filteredAlerts = useMemo(() => {
    return alerts.filter((al) => {
      if (filters.companyCode !== 'ALL' && al.companyCode !== filters.companyCode) return false
      if (filters.plantCode !== 'ALL' && al.plantCode !== filters.plantCode) return false
      if (filters.lineCode !== 'ALL' && al.processCode !== filters.lineCode) return false
      return true
    })
  }, [alerts, filters])

  // Cálculo de KPIs Unificados
  const kpis = useMemo(() => {
    const plannedTons = filteredOrders.reduce((sum, o) => sum + o.plannedTons, 0) || 12480
    const producedTons = filteredOrders.reduce((sum, o) => sum + o.producedTons, 0) || 10920
    const projectedTons = Math.round(plannedTons * 0.974) || 12150
    const adherencePct =
      plannedTons > 0 ? Number(((producedTons / plannedTons) * 100).toFixed(1)) : 97.4

    const totalRate = filteredNodes.reduce((sum, n) => sum + n.currentRateTonsPerHour, 0)
    const totalNominal = filteredNodes.reduce((sum, n) => sum + n.nominalCapacityTonsPerHour, 0)
    const occupancyPct = totalNominal > 0 ? Math.round((totalRate / totalNominal) * 100) : 91
    const activeBottlenecks = filteredBottlenecks.length || 4
    const ordersAtRisk =
      filteredOrders.filter((o) => o.delayMinutes > 0 || o.alertsCount > 0).length || 12
    const delaysCount = filteredOrders.filter((o) => o.delayMinutes > 0).length || 7
    const criticalStopsCount =
      filteredNodes.filter(
        (n) => n.currentStatus === 'maintenance' || n.currentStatus === 'stopped',
      ).length || 2

    return {
      plannedTons,
      producedTons,
      projectedTons,
      adherencePct,
      availableCapacityPct: 100 - occupancyPct,
      occupancyPct,
      activeBottlenecks,
      ordersAtRisk,
      delaysCount,
      criticalStopsCount,
      totalRatePerHour: totalRate || 840,
      plantsCount: availablePlants.length,
      linesCount: availableLines.length,
    }
  }, [filteredOrders, filteredNodes, filteredBottlenecks, availablePlants, availableLines])

  // Dados para Tabela de Comparação de Plantas (Visão Empresa na Torre)
  const plantComparisonData = useMemo(() => {
    return plants.map((pl) => {
      const plOrders = orders.filter((o) => o.plantCode === pl.code)
      const plPlanned =
        plOrders.reduce((s, o) => s + o.plannedTons, 0) || (pl.code === 'DIV' ? 6850 : 5630)
      const plProduced =
        plOrders.reduce((s, o) => s + o.producedTons, 0) || (pl.code === 'DIV' ? 6100 : 4820)
      const plProjected = Math.round(plPlanned * 0.978)
      const plAdherence = plPlanned > 0 ? Number(((plProduced / plPlanned) * 100).toFixed(1)) : 97.4
      const plBottlenecks = bottlenecks.filter((b) => b.plantCode === pl.code).length
      const plAtRisk = plOrders.filter((o) => o.delayMinutes > 0).length

      return {
        plantCode: pl.code,
        plantName: pl.name,
        plannedTons: plPlanned,
        producedTons: plProduced,
        projectedTons: plProjected,
        adherencePct: plAdherence,
        occupancyPct: pl.code === 'DIV' ? 94 : 88,
        bottlenecksCount: plBottlenecks,
        ordersAtRiskCount: plAtRisk,
        criticalStopsCount: pl.code === 'CTG' ? 1 : 0,
      }
    })
  }, [plants, orders, bottlenecks])

  // Dados para Tabela de Comparação de Linhas (Visão Planta na Torre)
  const lineComparisonData = useMemo(() => {
    return availableLines.map((l) => {
      const lineOrders = orders.filter((o) => o.lineCode === l.code)
      const activeOrd = lineOrders.find((o) => o.status === 'IN_PRODUCTION') || lineOrders[0]
      const nextOrd = lineOrders.find((o) => o.status === 'RELEASED' || o.status === 'SETUP')
      const planned = lineOrders.reduce((s, o) => s + o.plannedTons, 0) || 1850
      const produced = lineOrders.reduce((s, o) => s + o.producedTons, 0) || 1420
      const projected = Math.round(planned * 0.96)
      const adherence = planned > 0 ? Number(((produced / planned) * 100).toFixed(1)) : 89.2
      const node = processNodes.find((n) => n.code === l.code)

      return {
        lineCode: l.code,
        lineName: l.name,
        plantCode: l.plantCode,
        currentOrder: activeOrd
          ? `${activeOrd.orderNumber} (${activeOrd.familyName})`
          : 'Nenhuma OP ativa',
        nextOrder: nextOrd
          ? `${nextOrd.orderNumber} (${nextOrd.familyName})`
          : 'Aguardando liberação',
        plannedTons: planned,
        producedTons: produced,
        projectedTons: projected,
        adherencePct: adherence,
        occupancyPct: node?.occupancyPct || 92,
        bufferCoverageHours: node?.downstreamBufferHours || 6.2,
        currentRate: node?.currentRateTonsPerHour || 68,
        targetRate: l.nominal_capacity || 72,
        status: l.status,
        bottlenecksCount: bottlenecks.filter((b) => b.processCode === l.code).length,
        ordersAtRiskCount: lineOrders.filter((o) => o.delayMinutes > 0).length,
      }
    })
  }, [availableLines, orders, processNodes, bottlenecks])

  // Simulação Drag & Drop de Gantt / Kanban
  const simulateOrderMove = useCallback(
    (orderId: string, newLine: string, newStart: string) => {
      const order = orders.find((o) => o.id === orderId)
      if (!order) return

      const setupDeltaMinutes = newLine !== order.lineCode ? +35 : 0
      const materialRisk = newLine === 'L2' && !order.rawMaterialAvailable
      const delayDeltaHours = newLine === 'L1' ? -4.0 : +2.5
      const capacityConflict = newLine === 'ENDIR'

      setActiveSimulationDiff({
        orderId,
        orderNumber: order.orderNumber,
        originalLine: order.lineCode,
        newLine,
        originalStart: order.plannedStart,
        newStart,
        setupDeltaMinutes,
        materialRisk,
        delayDeltaHours,
        capacityConflict,
        downstreamImpactTons: order.remainingTons,
      })

      toast({
        title: '🧪 Simulação Temporária Criada',
        description: `Ordem ${order.orderNumber} realocada em memória. A programação oficial permanece inalterada.`,
      })
    },
    [orders, toast],
  )

  const cancelSimulation = useCallback(() => {
    setActiveSimulationDiff(null)
    toast({
      title: 'Simulação Cancelada',
      description: 'Nenhum impacto foi gravado na programação.',
    })
  }, [toast])

  const applySimulationToScenario = useCallback(() => {
    if (!activeSimulationDiff) return

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === activeSimulationDiff.orderId) {
          return {
            ...ord,
            lineCode: activeSimulationDiff.newLine,
            plannedStart: activeSimulationDiff.newStart,
            delayMinutes: Math.max(0, ord.delayMinutes + activeSimulationDiff.delayDeltaHours * 60),
          }
        }
        return ord
      }),
    )

    setEvents((prev) => [
      {
        id: `ev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        companyCode: filters.companyCode,
        plantCode: filters.plantCode !== 'ALL' ? filters.plantCode : 'DIV',
        processCode: activeSimulationDiff.newLine,
        orderNumber: activeSimulationDiff.orderNumber,
        source: 'PCP',
        category: 'SIMULATION',
        severity: 'INFO',
        title: `Cenário Alterado pelo Programador: ${activeSimulationDiff.orderNumber}`,
        description: `Ordem movida para ${activeSimulationDiff.newLine} às ${activeSimulationDiff.newStart}.`,
        actor: 'Lucas Ferreira (PCP)',
      },
      ...prev,
    ])

    setActiveSimulationDiff(null)
    toast({
      title: 'Cenário Atualizado em Memória',
      description: 'Alteração mantida no cenário ativo. Envie para aprovação para oficializar.',
    })
  }, [activeSimulationDiff, filters, toast])

  const sendScenarioForApproval = useCallback(
    (note: string) => {
      const newVersion = `v2.${versionHistory.length + 3}`
      const newHistoryItem: VersionHistoryItem = {
        id: `ver-${Date.now()}`,
        version: `${newVersion} (Pendente Homologação)`,
        companyCode: filters.companyCode,
        plantCode: filters.plantCode !== 'ALL' ? filters.plantCode : 'DIV',
        lineCode: filters.lineCode !== 'ALL' ? filters.lineCode : 'L1',
        publishedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        author: 'Lucas Ferreira (PCP)',
        approver: 'Aguardando Gestor de Linha',
        reason: note || 'Otimização de gargalos e realocação de ordens críticas',
        changesCount: 2,
        deltaTons: +80,
        status: 'CURRENT',
      }
      setVersionHistory((prev) => [newHistoryItem, ...prev])

      setEvents((prev) => [
        {
          id: `ev-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          companyCode: filters.companyCode,
          plantCode: filters.plantCode !== 'ALL' ? filters.plantCode : 'DIV',
          source: 'USUARIO',
          category: 'APPROVAL',
          severity: 'INFO',
          title: `Programador Enviou ${newVersion} para Homologação`,
          description: `Justificativa: ${note || 'Otimização de sequência'}`,
          actor: 'Lucas Ferreira (PCP)',
        },
        ...prev,
      ])

      toast({
        title: '✅ Cenário Enviado para Aprovação',
        description:
          'A esteira de 2 fases foi acionada. A programação oficial será atualizada após validação do Gestor.',
      })
    },
    [versionHistory, filters, toast],
  )

  const acknowledgeAlert = useCallback(
    (alertId: string) => {
      setAlerts((prev) =>
        prev.map((al) => (al.id === alertId ? { ...al, acknowledged: true } : al)),
      )
      toast({
        title: 'Alerta Reconhecido',
        description: 'Status registrado na trilha de auditoria.',
      })
    },
    [toast],
  )

  const refreshData = useCallback(() => {
    setIsSyncing(true)
    setTimeout(() => {
      setLastSyncTime(
        new Date().toLocaleDateString('pt-BR') +
          ' ' +
          new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      )
      setIsSyncing(false)
      toast({
        title: 'Dados Sincronizados com SAP ECC',
        description: 'Status de linhas, buffers e carteira atualizados em tempo real.',
      })
    }, 500)
  }, [toast])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [])

  // Navegação Cruzada Preservando Contexto e Query Params
  const navigateToSubmodule = useCallback(
    (
      submodule: CentralSubmodule,
      overrideScope?: { company?: string; plant?: string; line?: string; tab?: ViewTab },
    ) => {
      const targetCompany = overrideScope?.company || filters.companyCode
      const targetPlant = overrideScope?.plant || filters.plantCode
      const targetLine = overrideScope?.line || filters.lineCode

      if (overrideScope?.company) setCompanyScope(overrideScope.company)
      if (overrideScope?.plant) setPlantScope(overrideScope.plant)
      if (overrideScope?.line) setLineScope(overrideScope.line)
      if (overrideScope?.tab) setActiveTab(overrideScope.tab)

      let path = '/pcp/sequenciamento/torre-controle'
      if (submodule === 'OPERACIONAL') path = '/pcp/sequenciamento/operacional'
      else if (submodule === 'SEQUENCIAMENTO') path = '/pcp/sequenciamento/programacao'
      else if (submodule === 'CENARIOS') path = '/pcp/sequenciamento/cenarios'
      else if (submodule === 'HISTORICO') path = '/pcp/sequenciamento/historico'

      const params = new URLSearchParams()
      if (targetCompany) params.set('company', targetCompany)
      if (targetPlant) params.set('plant', targetPlant)
      if (targetLine) params.set('line', targetLine)
      if (filters.period) params.set('period', filters.period)

      navigate(`${path}?${params.toString()}`)
    },
    [filters, setCompanyScope, setPlantScope, setLineScope, navigate],
  )

  // FIX 3: Estabilizar o valor do Provider em useMemo com dependências estritas
  // Evita re-render em cascata de todos os consumidores (<Routes> e subcomponentes)
  const contextValue = useMemo<ControlTowerContextType>(
    () => ({
      activeSubmodule,
      setActiveSubmodule,
      perspective,
      setPerspective,
      activeTab,
      setActiveTab,
      companies,
      plants,
      lines,
      workCenters,
      resources,
      filters,
      setFilters,
      setCompanyScope,
      setPlantScope,
      setLineScope,
      resetFilters,
      availablePlants,
      availableLines,
      effectiveRules,
      orders,
      processNodes,
      bottlenecks,
      buffers,
      flowSteps,
      events,
      alerts,
      scenarios,
      activeScenarioId,
      setActiveScenarioId,
      impactAnalysis,
      versionHistory,
      filteredOrders,
      filteredNodes,
      filteredBottlenecks,
      filteredAlerts,
      kpis,
      plantComparisonData,
      lineComparisonData,
      selectedProcess,
      setSelectedProcess,
      selectedOrder,
      setSelectedOrder,
      isSimulatorModalOpen,
      setIsSimulatorModalOpen,
      isComparisonModalOpen,
      setIsComparisonModalOpen,
      isAlertCenterOpen,
      setIsAlertCenterOpen,
      isAIPanelOpen,
      setIsAIPanelOpen,
      isCriticalPathVisible,
      setIsCriticalPathVisible,
      isVersionModalOpen,
      setIsVersionModalOpen,
      activeSimulationDiff,
      simulateOrderMove,
      cancelSimulation,
      applySimulationToScenario,
      sendScenarioForApproval,
      acknowledgeAlert,
      refreshData,
      lastSyncTime,
      isSyncing,
      navigateToSubmodule,
      plantCapacityAnalysis,
      productPerformances,
      productionDeviations,
      scheduleAssertiveness,
      lineRelationships,
      commercialBacklog,
      wmsInventory,
      doubleApprovals,
      addDeviationAction,
      proposeParamRevision,
      approveLineDouble,
    }),
    [
      activeSubmodule,
      perspective,
      activeTab,
      companies,
      plants,
      lines,
      workCenters,
      resources,
      filters,
      setCompanyScope,
      setPlantScope,
      setLineScope,
      resetFilters,
      availablePlants,
      availableLines,
      effectiveRules,
      orders,
      processNodes,
      bottlenecks,
      buffers,
      flowSteps,
      events,
      alerts,
      scenarios,
      activeScenarioId,
      impactAnalysis,
      versionHistory,
      filteredOrders,
      filteredNodes,
      filteredBottlenecks,
      filteredAlerts,
      kpis,
      plantComparisonData,
      lineComparisonData,
      selectedProcess,
      selectedOrder,
      isSimulatorModalOpen,
      isComparisonModalOpen,
      isAlertCenterOpen,
      isAIPanelOpen,
      isCriticalPathVisible,
      isVersionModalOpen,
      activeSimulationDiff,
      simulateOrderMove,
      cancelSimulation,
      applySimulationToScenario,
      sendScenarioForApproval,
      acknowledgeAlert,
      refreshData,
      lastSyncTime,
      isSyncing,
      navigateToSubmodule,
      plantCapacityAnalysis,
      productPerformances,
      productionDeviations,
      scheduleAssertiveness,
      lineRelationships,
      commercialBacklog,
      wmsInventory,
      doubleApprovals,
      addDeviationAction,
      proposeParamRevision,
      approveLineDouble,
    ],
  )

  return (
    <ControlTowerContext.Provider value={contextValue}>{children}</ControlTowerContext.Provider>
  )
}

export const useControlTower = () => {
  const context = useContext(ControlTowerContext)
  if (!context) {
    throw new Error('useControlTower must be used within a ControlTowerProvider')
  }
  return context
}

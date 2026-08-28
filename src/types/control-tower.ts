// Modelo de Dados Central Unificado para a Central de Sequenciamento Produtivo CIAFAL

export type PerspectiveMode = 'GERAL' | 'PROGRAMADOR' | 'CHAO_FABRICA'

export type ViewTab =
  | 'OVERVIEW'
  | 'MAP'
  | 'GANTT'
  | 'KANBAN'
  | 'CAPACITY'
  | 'HEATMAP'
  | 'BOTTLENECKS'
  | 'FLOW'
  | 'TIMELINE'
  | 'SHOP_FLOOR'
  | 'INDICATORS'

export type OrderStatus =
  | 'PLANNED'
  | 'RELEASED'
  | 'SETUP'
  | 'IN_PRODUCTION'
  | 'WAITING_NEXT'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'DELAYED'

export type LineStatus = 'running' | 'idle' | 'stopped' | 'maintenance'

export type SeverityType = 'CRITICAL' | 'RISK' | 'WARNING' | 'INFO'

export type ScenarioType = 'BASE' | 'CENARIO_A' | 'CENARIO_B' | 'CENARIO_C' | 'SIMULACAO_TEMP'

export interface ProductOrder {
  id: string
  orderNumber: string
  campaignId: string
  campaignName: string
  lineCode: string
  processName: string
  familyCode: string
  familyName: string
  materialCode: string
  materialName: string
  customerName: string
  salesOrderId: string
  salesOrderItem: string
  plannedTons: number
  producedTons: number
  remainingTons: number
  targetRatePerHour: number
  currentRatePerHour: number
  adherencePct: number
  plannedStart: string // ISO string or HH:mm
  plannedEnd: string
  projectedEnd: string
  actualStart?: string
  actualEnd?: string
  status: OrderStatus
  setupMinutes: number
  setupCompleted: boolean
  rawMaterialAvailable: boolean
  rawMaterialBufferHours: number
  upstreamDependencyId?: string
  upstreamProcessCode?: string
  downstreamProcessCode?: string
  downstreamBufferTons: number
  priority: 1 | 2 | 3 | 4 | 5
  isCriticalPath: boolean
  shift: string
  programmer: string
  delayMinutes: number
  alertsCount: number
  notes?: string
}

export interface ProductionProcessNode {
  id: string
  code: string
  name: string
  sector: string
  type: 'SUPPLY' | 'FURNACE' | 'LINE' | 'FINISHING' | 'REWORK' | 'EXPEDITION' | 'BUFFER'
  currentStatus: LineStatus
  nominalCapacityTonsPerHour: number
  availableCapacityTonsPerHour: number
  currentRateTonsPerHour: number
  occupancyPct: number
  adherencePct: number
  activeCampaign?: string
  activeMaterial?: string
  activeTons?: number
  producedTonsToday: number
  plannedTonsToday: number
  downstreamBufferTons: number
  downstreamBufferHours: number
  upstreamBufferTons: number
  bufferMaxCapacityTons: number
  bufferMinSafeTons: number
  isBottleneck: boolean
  bottleneckReason?: string
  bottleneckSeverity?: SeverityType
  riskHorizonHours?: number
  nextProcessCode?: string
  upstreamProcessCodes: string[]
  downstreamProcessCodes: string[]
  operator: string
  activeOrderNumber?: string
  position: { x: number; y: number }
}

export interface BottleneckItem {
  id: string
  rank: number
  processCode: string
  processName: string
  classification:
    | 'CAPACITY'
    | 'MATERIAL'
    | 'PROCESS'
    | 'INTERMEDIATE_STOCK'
    | 'MANPOWER'
    | 'SETUP'
    | 'MAINTENANCE'
    | 'QUALITY'
    | 'LOGISTICS'
    | 'UPSTREAM'
    | 'DOWNSTREAM'
  impactTons: number
  impactOrdersCount: number
  impactOrders: string[]
  criticality: 'ALTA' | 'MEDIA' | 'BAIXA'
  coverageHours: number
  queueTons: number
  queueDurationHours: number
  description: string
  rootCause: string
  affectedCustomers: string[]
  aiRecommendation: string
  predictedRuptureTime?: string
}

export interface BufferStatus {
  id: string
  upstreamCode: string
  downstreamCode: string
  name: string
  currentStockTons: number
  minStockTons: number
  maxStockTons: number
  consumptionRateTonsPerHour: number
  productionRateTonsPerHour: number
  coverageHours: number
  predictedRuptureTime?: string
  predictedOverflowTime?: string
  status: 'NORMAL' | 'WARNING_LOW' | 'RUPTURE_RISK' | 'OVERFLOW_RISK'
  ordersInQueue: {
    orderNumber: string
    tons: number
    durationHours: number
    priority: number
  }[]
}

export interface FlowSankeyStep {
  id: string
  source: string
  target: string
  tons: number
  lossTons: number
  reworkTons: number
  accumulatedBufferTons: number
  status: 'NORMAL' | 'CHOKED' | 'STARVED'
}

export interface OperationalEvent {
  id: string
  timestamp: string // HH:mm:ss
  source: 'SAP' | 'PRODUCAO' | 'PCP' | 'IA' | 'MANUTENCAO' | 'QUALIDADE' | 'USUARIO'
  category: 'STOP' | 'RATE' | 'AI_RECALC' | 'ORDER_RISK' | 'SIMULATION' | 'APPROVAL' | 'MATERIAL'
  severity: SeverityType
  title: string
  description: string
  processCode?: string
  orderNumber?: string
  actor?: string
}

export interface OperationalAlert {
  id: string
  code: string
  processCode: string
  orderNumber?: string
  severity: SeverityType
  category: 'PARADA' | 'BUFFER' | 'PEDIDO' | 'SETUP' | 'MATERIAIS' | 'IA_PROJECAO'
  title: string
  cause: string
  impact: string
  whoIsAffected: string
  whenImpact: string
  alternatives: string[]
  aiConfidencePct?: number
  timestamp: string
  acknowledged: boolean
}

export interface ImpactPropagationNode {
  processCode: string
  processName: string
  deltaTons: number
  deltaHours: number
  direction: 'DOWNSTREAM' | 'UPSTREAM'
  status: 'IMPACTED' | 'SOURCE' | 'NORMAL'
  description: string
}

export interface ImpactAnalysis {
  sourceProcess: string
  triggerReason: string
  downstreamPropagation: ImpactPropagationNode[]
  upstreamPropagation: ImpactPropagationNode[]
  totalLostTons: number
  totalDelayHours: number
  impactedOrders: {
    orderNumber: string
    customer: string
    material: string
    tons: number
    originalDate: string
    newProjectedDate: string
    delayHours: number
    criticality: 'ALTA' | 'MEDIA' | 'BAIXA'
  }[]
  aiSummary: string
}

export interface ScenarioDefinition {
  id: string
  type: ScenarioType
  name: string
  creator: string
  createdAt: string
  assumptions: string
  changesApplied: string[]
  status: 'DRAFT' | 'SIMULATED' | 'APPROVED' | 'PUBLISHED' | 'REJECTED'
  kpis: {
    totalPlannedTons: number
    adherencePct: number
    totalDelaysCount: number
    totalSetupChanges: number
    activeBottlenecksCount: number
    ordersAtRiskCount: number
    idleHoursTotal: number
    intermediateStockTons: number
  }
  orders: ProductOrder[]
  tradeOffs: {
    advantages: string[]
    disadvantages: string[]
    risks: string[]
  }
}

export interface GlobalFilterState {
  period: 'HOJE' | 'AMANHA' | 'SEMANA' | '7_DIAS' | '15_DIAS' | 'MES' | 'CUSTOM'
  lineCode: string
  processCode: string
  familyCode: string
  shift: string
  status: string
  quickFilterOnlyBottlenecks: boolean
  quickFilterOnlyDelays: boolean
  quickFilterOnlyConflicts: boolean
  quickFilterOnlyRisks: boolean
  quickFilterOnlyChanges: boolean
  quickFilterOnlyOrdersAtRisk: boolean
  searchQuery: string
}

export interface VersionHistoryItem {
  version: string
  publishedAt: string
  author: string
  approver?: string
  reason: string
  changesCount: number
  deltaTons: number
  status: 'CURRENT' | 'ARCHIVED'
}

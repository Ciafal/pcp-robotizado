// Modelo de Dados Central Unificado para a Central de Sequenciamento Produtivo CIAFAL
// Hierarquia Corporativa: EMPRESA -> PLANTA -> LINHA DE PRODUÇÃO -> PROCESSO / CENTRO DE TRABALHO -> RECURSO

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

export type CentralSubmodule =
  | 'TORRE_CONTROLE'
  | 'OPERACIONAL'
  | 'SEQUENCIAMENTO'
  | 'CENARIOS'
  | 'HISTORICO'

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

export type RuleScopeLevel = 'GLOBAL' | 'COMPANY' | 'PLANT' | 'LINE' | 'RESOURCE'

// ==========================================
// 1. Entidades da Hierarquia Corporativa
// ==========================================

export interface Company {
  id: string
  code: string
  name: string
  corporate_name?: string
  cnpj?: string
  status: 'ACTIVE' | 'INACTIVE'
  timezone?: string
  currency?: string
  sap_company_code?: string
  description?: string
  plantsCount?: number
  linesCount?: number
}

export interface Plant {
  id: string
  code: string
  name: string
  companyId: string
  companyCode: string
  city?: string
  state?: string
  country?: string
  sap_plant_code?: string
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  timezone?: string
  responsible_user_name?: string
  linesCount?: number
}

export interface ProductionLineHierarchy {
  id: string
  code: string
  name: string
  plantId: string
  plantCode: string
  companyId: string
  companyCode: string
  line_type?: string
  sap_work_center?: string
  nominal_capacity: number
  capacity_unit: string
  shifts_count: number
  status: LineStatus
  manager_name?: string
  programmer_name?: string
}

export interface WorkCenterNode {
  id: string
  code: string
  name: string
  lineId: string
  lineCode: string
  processType: string
  sapWorkCenterCode?: string
  nominalCapacity: number
  capacityUnit: string
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
}

export interface ResourceNode {
  id: string
  code: string
  name: string
  workCenterId: string
  workCenterCode: string
  sapEquipmentId?: string
  status: string
}

// ==========================================
// 2. Rule Pack com Herança
// ==========================================

export interface RulePack {
  id: string
  code: string
  name: string
  version: string
  scope_level: RuleScopeLevel
  company_id?: string
  plant_id?: string
  line_id?: string
  resource_id?: string
  rules_payload: {
    maxSetupDurationMinutes?: number
    minBatchSizeTons?: number
    bufferSafetyHours?: number
    priorityWeightOEE?: number
    priorityWeightOTD?: number
    preferredFamilyOrder?: string[]
    [key: string]: unknown
  }
  status: 'ACTIVE' | 'DRAFT' | 'SUPERSEDED'
}

// ==========================================
// 3. Modelo Central de Ordens de Produção
// ==========================================

export interface ProductOrder {
  id: string
  orderNumber: string
  campaignId: string
  campaignName: string
  companyCode: string
  plantCode: string
  lineCode: string
  processName: string
  workCenterCode?: string
  resourceCode?: string
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
  plannedStart: string // HH:mm or ISO
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
  companyCode: string
  plantCode: string
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
  companyCode: string
  plantCode: string
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
  companyCode: string
  plantCode: string
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
  companyCode: string
  plantCode: string
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
  timestamp: string
  companyCode?: string
  plantCode?: string
  processCode?: string
  orderNumber?: string
  source: 'SAP' | 'PRODUCAO' | 'PCP' | 'IA' | 'MANUTENCAO' | 'QUALIDADE' | 'USUARIO'
  category: 'STOP' | 'RATE' | 'AI_RECALC' | 'ORDER_RISK' | 'SIMULATION' | 'APPROVAL' | 'MATERIAL'
  severity: SeverityType
  title: string
  description: string
  actor?: string
}

export interface OperationalAlert {
  id: string
  code: string
  companyCode: string
  plantCode: string
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
  companyCode: string
  plantCode: string
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
  companyCode: string
  plantCode: string
  lineCode: string
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
  companyCode: string // 'ALL' or 'CIAFAL'
  plantCode: string // 'ALL' or 'DIV' or 'CTG'
  lineCode: string // 'ALL' or 'L1' or 'L2'...
  period: 'HOJE' | 'AMANHA' | 'SEMANA' | '7_DIAS' | '15_DIAS' | 'MES' | 'CUSTOM'
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
  id?: string
  version: string
  companyCode: string
  plantCode: string
  lineCode: string
  publishedAt: string
  author: string
  approver?: string
  reason: string
  changesCount: number
  deltaTons: number
  status: 'CURRENT' | 'ARCHIVED'
  diffDetails?: {
    movedOrders: string[]
    setupDeltaMinutes: number
    capacityImpact: string
  }
}

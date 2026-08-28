/**
 * Contratos de Tipos e Entidades Principais do Prompt 05 — Motor de Programação CP-SAT,
 * Simulador de Cenários e Comparação de Gargalos Industriais (CIAFAL).
 */

export type HardConstraintCategory =
  | 'ROUTE'
  | 'CAPACITY'
  | 'MATERIAL_COMPATIBILITY'
  | 'PRODUCT_BLOCK'
  | 'DIMENSIONAL_LIMIT'
  | 'CALENDAR'
  | 'SHIFT'
  | 'PRECEDENCE'
  | 'RESOURCE_AVAILABILITY'
  | 'MANDATORY_DEPENDENCY'

export type SoftConstraintCategory =
  | 'MINIMIZE_SETUP'
  | 'MAXIMIZE_DEMAND_SERVICE'
  | 'MINIMIZE_DELAY'
  | 'MINIMIZE_INTERMEDIATE_STOCK'
  | 'MAXIMIZE_CAPACITY_UTILIZATION'
  | 'PREFER_MATERIAL_PRIORITY'
  | 'MINIMIZE_ROUTE_CHANGE'
  | 'BALANCE_LINES'

export type OptimizationProfileType =
  | 'ATENDIMENTO'
  | 'PRODUTIVIDADE'
  | 'ESTOQUE'
  | 'BALANCEADO'
  | 'CUSTOM'

export type OptimizationScenarioType =
  | 'BASELINE'
  | 'SCENARIO_A'
  | 'SCENARIO_B'
  | 'SCENARIO_C'
  | 'SCENARIO_D'
  | 'CUSTOM'

export type OptimizationExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type SolverSolutionStatus =
  | 'OPTIMAL'
  | 'FEASIBLE'
  | 'NO_SOLUTION'
  | 'TIME_LIMIT'
  | 'INFEASIBLE'

export type AllocationItemStatus = 'ALLOCATED' | 'PARTIALLY_ALLOCATED' | 'UNALLOCATED'

export type ScheduleWorkflowStatus =
  | 'DRAFT'
  | 'PCP_REVIEW'
  | 'PENDING_DOUBLE_APPROVAL'
  | 'APPROVED_OFFICIAL'
  | 'REJECTED'
  | 'SUPERSEDED'

export interface OptimizationObjective {
  category: SoftConstraintCategory
  name: string
  weight: number
  active: boolean
  scope?: string
  description: string
}

export interface ConstraintDefinition {
  id: string
  code: string
  category: HardConstraintCategory
  name: string
  description: string
  isHard: boolean
  active: boolean
  targetLine?: string
  targetProduct?: string
}

export interface ConstraintViolation {
  constraintCode: string
  category: HardConstraintCategory | SoftConstraintCategory
  demandId: string
  orderNumber: string
  productCode: string
  targetLine?: string
  message: string
  isFatal: boolean
}

export interface OptimizationDemandInput {
  id: string
  orderNumber: string
  productCode: string
  productName: string
  familyCode: string
  demandedQuantityTons: number
  dueDate: string
  priorityRank: number
  clientName?: string
  dimensions?: {
    diameterMm?: number
    thicknessMm?: number
    lengthMm?: number
    weightKg?: number
  }
}

export interface OptimizationStockItem {
  materialCode: string
  materialName: string
  group: string
  currentStockTons: number
  reservedStockTons: number
  availableStockTons: number
  unitCost: number
  priorityOrder: number
}

export interface OptimizationLineCapacityInput {
  lineId: string
  lineCode: string
  lineName: string
  nominalCapacityPerHour: number
  plannedStopsLossHours: number
  plannedSetupLossHours: number
  plannedCalendarLossHours: number
  programmableCapacityHours: number
  programmableCapacityTons: number
  isMock: boolean
  sourceNote?: string
}

export interface OptimizationEngineInput {
  scenarioId: string
  scenarioCode: string
  horizon: 'DIARIO' | 'SEMANAL' | 'MENSAL'
  periodRef: string
  demands: OptimizationDemandInput[]
  lines: OptimizationLineCapacityInput[]
  stocks: OptimizationStockItem[]
  objectives: OptimizationObjective[]
  hardConstraints: ConstraintDefinition[]
  solverTimeoutSeconds: number
  routesVersionUsed: string
  fichasMestreVersionUsed: string
}

export interface ScenarioItemAllocation {
  id: string
  demandId: string
  orderNumber: string
  productCode: string
  productName: string
  familyCode: string
  demandedQuantityTons: number
  allocatedQuantityTons: number
  allocationStatus: AllocationItemStatus
  unallocatedReason?: string
  assignedLineCode?: string
  routeCode?: string
  routeVersion?: number
  rawMaterialCode?: string
  rawMaterialPriority?: number
  startTime?: string
  endTime?: string
  sequenceOrder: number
  setupDurationMinutes: number
  leadTimeMinutes: number
  deterministicExplanation: string
  manualOverride?: {
    originalValue: string
    overrideValue: string
    reason: string
    changedBy: string
    changedAt: string
  }
}

export interface ScenarioBottleneckDetail {
  lineCode: string
  lineName: string
  periodRef: string
  programmableCapacityTons: number
  plannedLoadTons: number
  nominalCapacityTons: number
  utilizationPct: number
  freeSlackTons: number
  lostCapacityTons: number
  bufferRisk: 'BALANCED' | 'BELOW_MIN' | 'SATURATION_RISK' | 'DEPLETION_RISK'
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  deterministicReason: string
}

export interface OptimizationMetricSummary {
  demandServicePct: number
  adherencePct: number
  totalDemandedTons: number
  totalPlannedTons: number
  allocatedCount: number
  unallocatedCount: number
  unallocatedTons: number
  setupCount: number
  setupTimeMinutes: number
  intermediateStockTons: number
  avgUtilizationPct: number
  bottlenecksCount: number
  criticalBottlenecks: string[]
  lostCapacityTons: number
  totalDelaysMinutes: number
}

export interface OptimizationRunResult {
  runId: string
  scenarioId: string
  engineName: string
  engineVersion: string
  status: OptimizationExecutionStatus
  solverSolutionStatus: SolverSolutionStatus
  executionTimeMs: number
  objectiveValue: number
  variablesCount: number
  constraintsCount: number
  gapPct: number
  snapshot: {
    timestamp: string
    demandsCount: number
    linesCount: number
    weights: Record<string, number>
    solverTimeout: number
  }
  metrics: OptimizationMetricSummary
  allocations: ScenarioItemAllocation[]
  bottlenecks: ScenarioBottleneckDetail[]
  violations: ConstraintViolation[]
  errorMessage?: string
}

export interface OptimizationScenarioEntity {
  id: string
  code: string
  name: string
  description?: string
  type: OptimizationScenarioType
  profile: OptimizationProfileType
  horizon: string
  status: OptimizationExecutionStatus
  is_baseline: boolean
  assumptions: string
  target_lines: string[]
  target_products: string[]
  objectives_weights: Record<string, number>
  solver_timeout_seconds: number
  responsible_name?: string
  latest_run_id?: string
  summary_kpis?: OptimizationMetricSummary
  created?: string
  updated?: string
}

export interface PCPScheduleProposalEntity {
  id: string
  code: string
  title: string
  horizon: string
  period_ref: string
  version: number
  origin_type: 'SYSTEM_GENERATED' | 'AI_GENERATED' | 'MANUAL'
  workflow_status: ScheduleWorkflowStatus
  source_scenario_id?: string
  source_run_id?: string
  created_by_name?: string
  total_planned_tons: number
  total_items_count: number
  adherence_projected_pct: number
  pcp_approval_notes?: string
  created?: string
}

export interface ScenarioAnalysisDTO {
  scenarioId: string
  runId: string
  summary: string
  strengths: string[]
  risks: string[]
  recommendedActions: string[]
  tradeOffExplanation: string
}

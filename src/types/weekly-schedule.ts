import {
  ProductionLine,
  LineMaster,
  LineProductivityRate,
  LineBlockedProduct,
  LineSetupMatrix,
  ProductionShift,
  StandardScheduledStop,
} from './line-master'

export type RawMaterialTrafficLight = 'GREEN' | 'YELLOW' | 'RED'

export interface RawMaterialItemCalculation {
  steelGrade: string
  billetType: string
  sectionDimension: string
  billetWeightKg: number
  estimatedBilletsCount: number
  netRawMaterialTons: number
  yieldPct: number
  lossPct: number
  origin: string
  accumulatedWeekTons: number
  // Disponibilidade Projetada
  projectedAvailableTons: number
  currentSapStockTons: number
  confirmedPoTons: number
  upstreamProductionTons: number
  otherEntriesTons: number
  existingReservationsTons: number
  otherSchedulesCommittedTons: number
  priorOwnLineConsumptionTons: number
  projectedBalanceTons: number
  status: RawMaterialTrafficLight
  statusLabel: string
  statusReason: string
  deficitTons: number
  probableRuptureDate?: string
  hasConflictDualCommitment?: boolean
  conflictDetails?: string
  // Tooltip explicativo da regra
  calculationRuleExplanation: string
}

export type WeeklyScheduleWorkflowState =
  | 'DRAFT'
  | 'SIMULADO'
  | 'VALIDADO'
  | 'AGUARDANDO_APROVACAO_PCP'
  | 'APROVADO_PCP'
  | 'ENVIADO_GESTOR_LINHA'
  | 'PUBLICADO'
  | 'EXECUTANDO'
  | 'REALIZADO'
  | 'ANALISADO'
  | 'AGUARDANDO_OBSERVACOES'
  | 'EM_ANALISE' // legado
  | 'APROVADO' // legado

export type WeeklyLifecycleStage =
  | 'PLANEJADO'
  | 'PROGRAMADO'
  | 'APROVADO'
  | 'EXECUTANDO'
  | 'REALIZADO'
  | 'ANALISADO'

export interface WeeklyScheduleItem {
  id: string
  schedule_code: string
  company_code: string
  plant_code: string
  line_code: string
  line_id?: string
  year: number
  week_number: number
  period_display: string
  day_of_week: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  date_str: string
  shift_code: string
  shift_name: string
  crew_name: string
  sequence_order: number
  item_type: 'PRODUCTION' | 'SETUP' | 'SCHEDULED_STOP'
  material_code: string
  material_description: string
  family_code?: string
  steel_grade?: string
  dimensions?: string
  production_order?: string
  sales_order_mto?: string
  customer_name?: string
  order_type: 'MTS' | 'MTO' | 'INDUSTRIALIZACAO'
  planned_quantity_tons: number
  productivity_rate_th: number
  production_hours: number
  setup_duration_minutes: number
  setup_reason?: string
  stop_code?: string
  stop_description?: string
  stop_duration_minutes?: number
  // Estrutura explícita de Setup (Troca + Acerto + SMED + Oficina)
  setup_breakdown?: {
    from_material_code?: string
    to_material_code?: string
    from_family_code?: string
    to_family_code?: string
    change_type?: string
    planned_change_minutes: number
    planned_tuning_minutes: number
    planned_total_minutes: number
    responsible_area?: 'OFICINA_CILINDROS' | 'PRODUCAO' | 'MANUTENCAO'
    cylinder_set_code?: string
    cylinder_set_name?: string
    guides_code?: string
    tools_code?: string
    readiness_status?:
      | 'READY'
      | 'IN_PREPARATION'
      | 'DELAY_RISK'
      | 'NOT_STARTED'
      | 'BLOCKED_UNAVAILABLE'
    preparation_deadline?: string
    is_missing_standard_param?: boolean
    realized_change_minutes?: number
    realized_tuning_minutes?: number
    realized_total_minutes?: number
    is_bottleneck_resource?: boolean
    bottleneck_stage_name?: string
    bottleneck_loss_capacity_th?: number
    bottleneck_potential_tons?: number
  }
  start_datetime: string
  end_datetime: string
  status: WeeklyScheduleWorkflowState
  version: number
  pcp_notes?: string
  raw_material_req_tons: number
  raw_material_type?: string
  raw_material_calc?: RawMaterialItemCalculation
  // Dados de Ciclo Médio SAP, Sequência Ideal e Governança de Exceções PCP
  sap_cycle_time_avg_min?: number | null
  cycle_time_deviation_pct?: number
  deviation_analysis?: GaugeSequenceDeviationAnalysis
  exception_justification?: ExceptionJustificationData
  exception_approval_status?: 'NONE' | 'PENDING_SUPERVISOR' | 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_ADJUSTMENT'
  // Status Aguardando Observações
  awaiting_observations?: {
    is_awaiting: boolean
    reason: string
    observation: string
    responsible: string
    date_time: string
    deadline?: string
  }
  // Validação de Resfriamento
  cooling_validation?: {
    hasViolation: boolean
    requiredHours: number
    upstreamLineCode: string
    upstreamEndTime: string
    earliestPossibleTime: string
    currentProgrammedTime: string
    diffHours: number
    suggestedNewTime?: string
    message: string
  }
  is_blocked_attempt?: boolean
  scenario_id?: string
  scenario_name?: string
  // Previsto x Realizado
  realized_quantity_tons?: number
  realized_hours?: number
  realized_productivity_th?: number
  deviation_notes?: string
  lifecycle_stage?: WeeklyLifecycleStage
  metadata?: Record<string, any>
  created?: string
  updated?: string
}

export type SimulationFeasibilityResult = 'VIAVEL' | 'ALERTAS' | 'INVIAVEL'

export interface SimulationDomainCheck {
  id: string
  title: string
  status: 'PASS' | 'WARN' | 'FAIL'
  scorePct: number // 0-100%
  description: string
  details?: string
}

export interface WeeklySimulationReport {
  overallResult: SimulationFeasibilityResult
  overallTitle: string
  overallDescription: string
  timestamp: string
  indicators: WeeklyIndicators
  domains: {
    capacity: SimulationDomainCheck
    productivity: SimulationDomainCheck
    setups: SimulationDomainCheck
    sequencing: SimulationDomainCheck
    rawMaterial: SimulationDomainCheck
    stock: SimulationDomainCheck
    purchases: SimulationDomainCheck
    upstream: SimulationDomainCheck
    mtoOrders: SimulationDomainCheck
    specialRequirements: SimulationDomainCheck
    lineConflicts: SimulationDomainCheck
    backlog: SimulationDomainCheck
    stops: SimulationDomainCheck
  }
  suggestedActions: string[]
  aiSummaryRecommendation: string
}

export interface WeeklyScheduleScenario {
  id: string
  scenario_code: 'A' | 'B' | 'C' | string
  scenario_name: string
  description?: string
  schedule_code: string
  line_code: string
  year: number
  week_number: number
  is_active: boolean
  items_snapshot: WeeklyScheduleItem[]
  metrics_snapshot: {
    productionTons: number
    utilizationPct: number
    setupHours: number
    switchesCount: number
    rawMaterialRiskCount: number
    ordersMetCount: number
    ordersTotalCount: number
    sequenceEfficiencyPct: number
  }
  ai_recommendation?: {
    isRecommended: boolean
    score: number
    rationale: string
  }
  created?: string
  updated?: string
}

export interface WeeklyScheduleVersionRecord {
  id?: string
  schedule_code: string
  line_code: string
  year: number
  week_number: number
  version_number: number
  user_id?: string
  user_name: string
  user_email?: string
  change_reason: string
  impact_assessment: string
  previous_schedule_data: WeeklyScheduleItem[]
  new_schedule_data: WeeklyScheduleItem[]
  diff_summary?: {
    itemsAdded: number
    itemsRemoved: number
    itemsModified: number
    netTonsDiff: number
  }
  created?: string
}

export type WeeklyViewMode = 'MONTAGEM' | 'EXECUCAO' | 'PREVISTO_REALIZADO'

export interface WeeklyHeaderFilter {
  companyCode: string
  plantCode: string
  lineCode: string
  year: number
  weekNumber: number
  periodDisplay: string
}

export interface WeeklyIndicators {
  availableCapacityHours: number
  programmedQuantityTons: number
  programmedProductiveHours: number
  setupHours: number
  tuningHours?: number
  stoppedHours: number
  maintenanceHours?: number
  coolingHours?: number
  freeHours: number
  utilizationPct: number
  setupsCount?: number
  avgSetupMinutes?: number
  capacityLossTons?: number
  programmedProductsCount: number
  rawMaterialRequiredTons: number
  rawMaterialAvailableTons?: number
  rawMaterialBalanceTons?: number
  rawMaterialGreenCount?: number
  rawMaterialYellowCount?: number
  rawMaterialRedCount?: number
  criticalAlertsCount: number
  sequenceScore: number
  sequenceScoreLabel?: 'OTIMIZADA' | 'MELHORÁVEL' | 'CRÍTICA'
  sequenceRecommendation?: {
    hasBetterAlternative: boolean
    title: string
    currentSequenceSummary: string
    suggestedSequenceSummary: string
    gainMinutesSaved: number
    gainSetupAvoidedCount: number
    gainCapacityHours: number
    gainTonsImpact: number
    rationale: string
  }
}
export interface WeeklySummaryCapacity {
  calendarHours: number
  availableHours: number
  productionHours: number
  setupHours: number
  tuningHours?: number
  stoppedHours: number
  maintenanceHours?: number
  coolingHours?: number
  freeHours: number
  utilizationPct: number
  setupsCount?: number
  avgSetupMinutes?: number
  capacityLossTons?: number
}

export interface WeeklySummaryProduction {
  totalTons: number
  byFamily: Record<string, number>
  byMaterial: Record<string, number>
  byTurno: Record<string, number>
  byDay: Record<string, number>
}

export interface SapPurchaseOrder {
  orderNumber: string
  itemNumber?: string
  materialCode: string
  materialDescription: string
  steelGrade?: string
  sectionDimension?: string
  supplierCode: string
  supplierName: string
  totalQuantityTons: number
  receivedQuantityTons: number
  openBalanceTons: number
  estimatedDeliveryDate: string // YYYY-MM-DD ou ISO
  status: 'CONFIRMED' | 'IN_TRANSIT' | 'PENDING' | 'LATE'
  consideredAvailable: boolean
  availableQuantityTons: number
  disregardReason?: string
}

export interface UpstreamProductionPlan {
  lineCode: string
  lineName: string
  scheduleCode: string
  productionOrder?: string
  materialCode: string
  steelGrade: string
  sectionDimension: string
  quantityTons: number
  plannedEndDatetime: string // ISO date
  confirmed: boolean
}

export interface DualCommitmentConflict {
  steelGrade: string
  sectionDimension: string
  totalRequiredTons: number
  projectedAvailableTons: number
  deficitTons: number
  consumerSchedules: Array<{
    lineCode: string
    quantityTons: number
    consumptionDateStr: string
    consumptionDatetime: string
  }>
  alertMessage: string
}

export interface BilletRequirementGroup {
  steelGrade: string
  sectionDimension: string
  billetWeightKg: number
  requiredTons: number
  availableTons: number
  projectedBalanceTons: number
  status: RawMaterialTrafficLight
  statusLabel: string
  estimatedBilletsCount: number
  currentStockTons: number
  sapPurchaseOrdersTons: number
  upstreamProductionTons: number
  committedOtherSchedulesTons: number
  dualCommitmentAlert?: string
  ruleTooltip: string
}

export interface WeeklySummaryRawMaterial {
  steelGrade: string
  rawMaterialType: string
  sectionDimension?: string
  billetWeightKg?: number
  requiredTons: number
  availableStockTons: number | null // null = "Aguardando dados do SAP/WMS"
  futureEntryTons: number | null
  projectedConsumptionTons: number
  projectedBalanceTons: number | null
  status?: RawMaterialTrafficLight
  statusLabel?: string
  deficitTons?: number
  probableRuptureDate?: string
}

export interface WeeklySummaryBacklog {
  totalTons: number | null
  scheduledTons: number
  remainingTons: number | null
}

export interface WeeklyScheduleSummary {
  capacity: WeeklySummaryCapacity
  production: WeeklySummaryProduction
  rawMaterials: WeeklySummaryRawMaterial[]
  billetRequirements: BilletRequirementGroup[]
  sapPurchaseOrders: SapPurchaseOrder[]
  dualCommitments: DualCommitmentConflict[]
  backlog: WeeklySummaryBacklog
}

export interface ValidationResult {
  code: string
  level: 'OK' | 'WARNING' | 'CRITICAL' | 'BLOCKED'
  title: string
  message: string
  itemId?: string
}

export interface HardBlockModalData {
  isOpen: boolean
  materialCode: string
  materialDescription: string
  lineCode: string
  lineName: string
  reason: string
  blockDate?: string
  responsibleName?: string
}

export interface IdealGaugeSequenceItem {
  id: string
  line_code: string
  family_order: number
  family_code: string
  family_name: string
  subsequence_order: number
  gauge_dimension: string
  material_code: string
  material_description: string
  cycle_time_avg_min: number // Tempo médio de ciclo SAP/MRP (minutos)
  cycle_time_tolerance_pct: number // Tolerância configurável (%) ex: 10%
  stock_coverage_max_days: number // Cobertura máxima parametrizada em dias (ex: 30 dias)
  is_active: boolean
}

export interface GaugeSequenceDeviationAnalysis {
  hasDeviation: boolean
  deviationType?: 'GAUGE_SEQUENCE' | 'CYCLE_TIME' | 'STOCK_OVERCOVERAGE' | 'NONE'
  expectedRuleDescription: string
  proposedProgramDescription: string
  deviationDetails: string
  idealPreviousGauge?: string
  currentGauge: string
  idealNextGauge?: string
  cycleTimeSapMin?: number
  cycleTimeProgrammedMin?: number
  cycleTimeDeviationPct?: number
  stockCoverageCurrentDays?: number
  stockCoverageProjectedDays?: number
  stockCoverageMaxDays?: number
  stockExcessTons?: number
  currentStockTons?: number
  backlogTons?: number
  proposedProductionTons?: number
  hypotheses: string[]
  impacts: string[]
  aiRecommendation: string
  requiresSupervisorApproval: boolean
}

export interface ExceptionJustificationData {
  reason: string
  detailedJustification: string
  whyBypassRule: string
  needServed: string
  consequenceIfNotDone: string
  expectedImpact: string
  submittedBy: string
  submittedAt: string
  aiEvaluation?: {
    coherence: 'ALTA' | 'MEDIA' | 'BAIXA'
    evidenceAssessment: string
    risks: string[]
    benefits: string[]
    alternatives: string[]
    recommendation: string
  }
}

export interface PCPExceptionApprovalItem {
  id: string
  schedule_code: string
  line_code: string
  year: number
  week_number: number
  item_id: string
  material_code: string
  material_description: string
  sequence_order: number
  deviation_type: 'GAUGE_SEQUENCE' | 'CYCLE_TIME' | 'STOCK_OVERCOVERAGE'
  deviation_summary: string
  justification_data: ExceptionJustificationData
  status: 'PENDING_SUPERVISOR' | 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_ADJUSTMENT'
  supervisor_decision?: {
    decidedBy: string
    decidedAt: string
    decisionNotes?: string
    status: 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_ADJUSTMENT'
  }
  created: string
}

export interface OfficialMaterialOption {
  material_code: string
  material_name: string
  family_code: string
  family_name?: string
  dimension_spec?: string
  steel_grade?: string
  productivity_th: number
  default_yield_pct?: number
  default_order_type?: 'MTS' | 'MTO' | 'INDUSTRIALIZACAO'
  // Dados de Integração SAP/MRP
  sap_material_code?: string
  sap_material_description?: string
  sap_family_code?: string
  sap_unit?: string
  sap_cycle_time_avg_min?: number | null // Tempo Médio de Ciclo Oficial SAP/MRP
  sap_origin?: string
  sap_stock_coverage_max_days?: number
  sap_cycle_time_tolerance_pct?: number
  is_sap_integrated?: boolean
}

export const DAYS_OF_WEEK: {
  code: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  label: string
}[] = [
  { code: 'SEG', label: 'Segunda-feira' },
  { code: 'TER', label: 'Terça-feira' },
  { code: 'QUA', label: 'Quarta-feira' },
  { code: 'QUI', label: 'Quinta-feira' },
  { code: 'SEX', label: 'Sexta-feira' },
  { code: 'SAB', label: 'Sábado' },
  { code: 'DOM', label: 'Domingo' },
]

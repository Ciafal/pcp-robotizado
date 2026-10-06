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

export type RawMaterialProgrammedStatus =
  | 'ATENDIDO' // verde
  | 'MP_PARCIALMENTE_ATENDIDA' // amarelo
  | 'AGUARDANDO_ENTRADA' // amarelo
  | 'MP_NAO_PROGRAMADA' // vermelho
  | 'SALDO_NEGATIVO_RISCO_RUPTURA' // vermelho
  | 'EXCESSO' // vermelho bloqueante

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
  | 'CANCELLED'
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
  item_type: 'PRODUCTION' | 'SETUP' | 'SCHEDULED_STOP' | 'TEST_INDUSTRIAL'
  test_programming_id?: string
  test_code?: string
  is_origin_test_programming?: boolean
  is_locked_externally?: boolean
  test_technical_lead?: string
  test_objectives?: string[] | string
  is_programacao_parada?: boolean
  programacao_parada_codigo?: string
  programacao_parada_motivo?: string
  programacao_parada_tooltip?: string
  material_code: string
  material_description: string
  family_code?: string
  steel_grade?: string
  dimensions?: string
  production_order?: string
  sales_order_mto?: string
  customer_name?: string
  client_name?: string
  order_type: 'MTS' | 'MTO' | 'INDUSTRIALIZACAO'
  planned_quantity_tons: number
  productivity_rate_th: number
  production_hours: number
  setup_duration_minutes: number
  setup_reason?: string
  stop_code?: string
  stop_description?: string
  stop_duration_minutes?: number
  // Blocos temporais próprios na escala contínua do Gantt
  setup_start?: string
  setup_end?: string
  setup_rule_code?: string
  setup_rule_id?: string
  setup_source?: string
  tuning_start?: string
  tuning_end?: string
  tuning_duration_minutes?: number
  tuning_rule_code?: string
  tuning_rule_id?: string
  tuning_source?: string
  calculated_at?: string
  calculated_by?: string
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
  exception_approval_status?:
    | 'NONE'
    | 'PENDING_SUPERVISOR'
    | 'APPROVED'
    | 'REJECTED'
    | 'RETURNED_FOR_ADJUSTMENT'
  // Status Aguardando Observações
  awaiting_observations?: {
    is_awaiting: boolean
    reason: string
    observation: string
    responsible: string
    date_time: string
    deadline?: string
  }
  // Campos de Estoque, Carteira, Matéria-Prima e Enfornamento
  estoque_referencia_consultado?: number | null
  carteira_referencia?: number | null
  cobertura_antes_dias?: number | null
  cobertura_depois_dias?: number | null
  situacao_cobertura?: string
  raw_material_material_code?: string
  raw_material_yield_pct?: number
  raw_material_planned_tons?: number
  raw_material_available_tons?: number | null
  raw_material_status?: RawMaterialProgrammedStatus
  raw_material_status_label?: string
  raw_material_deficit_tons?: number
  raw_material_summary?: {
    plannedProductionTons: number
    totalRequiredTons: number
    totalProgrammedMpTons: number
    differenceTons: number
    fulfillmentPct: number
    status: RawMaterialProgrammedStatus
    statusLabel: string
    alertMessage?: string
    isExcessBlocked?: boolean
  }
  raw_material_rows?: Array<{
    id: string
    mpType: string
    materialCode: string
    yieldPct: number
    quantityTons: number
    availableTons?: number | null
    // Disponibilidade por linha de MP
    totalStockTons?: number | null
    pcpProgrammedStockTons?: number
    supplierReceiptsTons?: number
    pcpUpstreamPlannedTons?: number
    finalBalanceTons?: number | null
    status?: string
    statusLabel?: string
  }>
  enfornamento_type?: 'FRIO' | 'QUENTE' | 'INTERCALADO' | 'TAPETE' | 'NORMAL'
  sample_type?: 'PEQUENA' | 'MEDIA' | 'GRANDE' | 'TARUGO' | string
  tuning_unparametrized?: boolean
  productivity_applied_source?: string
  query_timestamp?: string
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
  // Rastreabilidade de Derivação de Centros (Requisito C)
  is_derived?: boolean
  tipo_geracao?: 'MANUAL' | 'AUTOMATICA'
  origem_programacao_id?: string
  derivada_programacao_id?: string
  centro_origem?: string
  centro_destino?: string
  matkl?: string
  regra_id?: string
  versao_origem?: number
  quantidade_origem?: number
  quantidade_derivada?: number
  usuario_criacao?: string
  derivation_status?: 'ATIVA' | 'ORIGEM_CANCELADA' | 'REVISAO_NECESSARIA' | 'DESVINCULADA'
  derivation_metadata?: {
    regra_codigo?: string
    regra_resumo?: string
    linha_origem?: string
    data_hora_prevista?: string
    data_hora_geracao?: string
  }
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

export interface CenterDerivationHeaderState {
  isDerived: boolean
  hasSource: boolean
  sourceCenterId?: string
  sourceCenterCode?: string
  sourceCenterName?: string
  sourceCenterDisplay?: string
  activeRules: any[]
}

export interface WeeklyHeaderFilter {
  companyCode: string
  plantCode: string
  lineCode: string
  year: number
  weekNumber: number
  periodDisplay: string
  programmingType?: string
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
  line_id?: string
  line_code: string
  family_order: number
  family_id?: string
  family_code?: string
  family_name: string
  subsequence_order: number
  gauge_dimension: string
  material_code: string
  material_description?: string
  cycle_time_avg_min: number // Tempo médio de ciclo SAP/MRP (minutos)
  cycle_time_tolerance_pct: number // Tolerância configurável (%) ex: 10%
  stock_coverage_max_days: number // Cobertura máxima parametrizada em dias (ex: 30 dias)
  is_active: boolean
  homologation_status?: 'HOMOLOGADA' | 'NAO_HOMOLOGADA'
  notes?: string
  sap_work_center?: string
  created?: string
  updated?: string
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
  // MARC-DISPO (Planejador MRP SAP) e MARC-DISGR (Grupo MRP)
  marc_dispo?: string
  mrp_controller_code?: string
  mrp_controller_description?: string
  marc_disgr?: string
  mrp_group_code?: string
  werks?: string
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

/**
 * =======================================================================
 * MAPEAMENTO CENTRAL ÚNICO DE CORES DA MONTAGEM PROGRAMAÇÃO CIAFAL (v0.0.434)
 * =======================================================================
 * Camada visual oficial e sincronizada entre a Legenda e os Blocos nas visões
 * Dia (OperationalTimelineGrid), Semana (WeeklyScheduleGrid) e Mês.
 *
 * Itens Oficiais da Legenda na ORDEM EXATA:
 * 1. MTS: azul claro (bg-sky-100 / border-sky-300 / text-slate-900)
 * 2. MTS Aço Especial: azul escuro (bg-[#003366] / border-[#002244] / text-white)
 * 3. MTO: vermelho (bg-red-600 / border-red-700 / text-white)
 * 4. Troca Setup: cinza escuro (bg-slate-700 / border-slate-800 / text-white)
 * 5. Acerto: cinza claro (bg-slate-200 / border-slate-300 / text-slate-900)
 * 6. Parada Programada: preto (bg-black / border-black / text-white)
 * 7. Manutenção Programada: laranja (bg-amber-600 / border-amber-700 / text-white)
 * 8. Resfriado: ❄ text-sky-700 font-bold (mantido como indicador)
 * 9. Selecionado: ring-2 ring-blue-600 bg-blue-50 (mantido como indicador)
 */

export type ScheduleItemVisualType =
  | 'MTS'
  | 'MTS_ACO_ESPECIAL'
  | 'MTO'
  | 'TROCA_SETUP'
  | 'ACERTO'
  | 'PARADA_PROGRAMADA'
  | 'MANUTENCAO_PROGRAMADA'
  | 'RESFRIADO'
  | 'SELECIONADO'

export interface ScheduleVisualConfig {
  type: ScheduleItemVisualType
  label: string
  bgClass: string
  borderClass: string
  textClass: string
  indicatorClass: string
  ringClass?: string
  badgeClass: string
  hoverClass: string
  icon?: string
}

export const SCHEDULE_TYPE_COLORS: Record<ScheduleItemVisualType, ScheduleVisualConfig> = {
  MTS: {
    type: 'MTS',
    label: 'MTS',
    bgClass: 'bg-sky-100',
    borderClass: 'border-sky-300',
    textClass: 'text-slate-900',
    indicatorClass: 'bg-sky-100 border border-sky-300',
    badgeClass: 'bg-sky-100 text-slate-900 border-sky-300',
    hoverClass: 'hover:bg-sky-200',
  },
  MTS_ACO_ESPECIAL: {
    type: 'MTS_ACO_ESPECIAL',
    label: 'MTS Aço Especial',
    bgClass: 'bg-[#003366]',
    borderClass: 'border-[#002244]',
    textClass: 'text-white',
    indicatorClass: 'bg-[#003366] border border-[#002244]',
    badgeClass: 'bg-[#003366] text-white border-[#002244]',
    hoverClass: 'hover:bg-[#002855]',
  },
  MTO: {
    type: 'MTO',
    label: 'MTO',
    bgClass: 'bg-red-600',
    borderClass: 'border-red-700',
    textClass: 'text-white',
    indicatorClass: 'bg-red-600 border border-red-700',
    badgeClass: 'bg-red-600 text-white border-red-700',
    hoverClass: 'hover:bg-red-700',
  },
  TROCA_SETUP: {
    type: 'TROCA_SETUP',
    label: 'Troca Setup',
    bgClass: 'bg-slate-700',
    borderClass: 'border-slate-800',
    textClass: 'text-white',
    indicatorClass: 'bg-slate-700 border border-slate-800',
    badgeClass: 'bg-slate-700 text-white border-slate-800',
    hoverClass: 'hover:bg-slate-800',
  },
  ACERTO: {
    type: 'ACERTO',
    label: 'Acerto',
    bgClass: 'bg-slate-200',
    borderClass: 'border-slate-300',
    textClass: 'text-slate-900',
    indicatorClass: 'bg-slate-200 border border-slate-300',
    badgeClass: 'bg-slate-200 text-slate-900 border-slate-300',
    hoverClass: 'hover:bg-slate-300',
  },
  PARADA_PROGRAMADA: {
    type: 'PARADA_PROGRAMADA',
    label: 'Parada Programada',
    bgClass: 'bg-black',
    borderClass: 'border-black',
    textClass: 'text-white',
    indicatorClass: 'bg-black border border-black',
    badgeClass: 'bg-black text-white border-black',
    hoverClass: 'hover:bg-neutral-900',
  },
  MANUTENCAO_PROGRAMADA: {
    type: 'MANUTENCAO_PROGRAMADA',
    label: 'Manutenção Programada',
    bgClass: 'bg-amber-600',
    borderClass: 'border-amber-700',
    textClass: 'text-white',
    indicatorClass: 'bg-amber-600 border border-amber-700',
    badgeClass: 'bg-amber-600 text-white border-amber-700',
    hoverClass: 'hover:bg-amber-700',
  },
  RESFRIADO: {
    type: 'RESFRIADO',
    label: 'Resfriado',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
    textClass: 'text-sky-700 font-bold',
    indicatorClass: 'text-sky-700 font-bold text-xs',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-300',
    hoverClass: 'hover:bg-sky-100',
    icon: '❄',
  },
  SELECIONADO: {
    type: 'SELECIONADO',
    label: 'Selecionado',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-600',
    textClass: 'text-blue-900',
    indicatorClass:
      'w-3.5 h-3.5 rounded border-2 border-blue-600 bg-blue-50 ring-2 ring-blue-600/40',
    ringClass: 'ring-2 ring-blue-600 ring-offset-1',
    badgeClass: 'bg-blue-50 text-blue-900 border-blue-600',
    hoverClass: 'hover:bg-blue-100',
  },
}

/**
 * Lista ordenada oficial dos 9 itens da legenda na ordem EXATA:
 * MTS | MTS Aço Especial | MTO | Troca Setup | Acerto | Parada Programada | Manutenção Programada | Resfriado | Selecionado
 */
export const SCHEDULE_LEGEND_ORDER: ScheduleItemVisualType[] = [
  'MTS',
  'MTS_ACO_ESPECIAL',
  'MTO',
  'TROCA_SETUP',
  'ACERTO',
  'PARADA_PROGRAMADA',
  'MANUTENCAO_PROGRAMADA',
  'RESFRIADO',
  'SELECIONADO',
]

export const SCHEDULE_LEGEND_ITEMS = SCHEDULE_LEGEND_ORDER.map((t) => SCHEDULE_TYPE_COLORS[t])

/**
 * Diferenciação automática de Aço Especial usando SOMENTE dados já carregados no item:
 * steel_grade, material_code, material_description e flags existentes como is_special_steel/steel_type === 'ACO_ESPECIAL'.
 * Aços identificados: 1045, 1050, 1060, 4140, 8620, 1524, 1522, 20MNCR5, LIGA, ESPECIAL e pools SDC POOL_B, POOL_C, POOL_D.
 */
export function isSpecialSteelGrade(
  grade?: string,
  desc?: string,
  code?: string,
  extraMetadata?: Record<string, any>,
): boolean {
  if (extraMetadata) {
    if (extraMetadata.is_special_steel === true) return true
    if (extraMetadata.steel_type === 'ACO_ESPECIAL' || extraMetadata.steel_type === 'ESPECIAL') {
      return true
    }
    const pool = String(extraMetadata.pool_code || extraMetadata.pool || '').toUpperCase()
    if (pool.includes('POOL_B') || pool.includes('POOL_C') || pool.includes('POOL_D')) {
      return true
    }
  }

  const combined = `${grade || ''} ${desc || ''} ${code || ''}`.toUpperCase()
  if (!combined.trim()) return false

  // Padrões de aços especiais CIAFAL / SDC
  const specialPatterns = [
    '1045',
    '1050',
    '1060',
    '4140',
    '8620',
    '1524',
    '1522',
    '20MNCR5',
    '20MNCR',
    'ACO LIGA',
    'AÇO LIGA',
    'LIGA',
    'ACO ESPECIAL',
    'AÇO ESPECIAL',
    'ESPECIAL',
    'POOL_B',
    'POOL_C',
    'POOL_D',
  ]

  return specialPatterns.some((p) => combined.includes(p))
}

/**
 * Determina se uma parada deve ser classificada como MANUTENCAO_PROGRAMADA ou PARADA_PROGRAMADA.
 * Baseia-se em: stop_type === 'MANUTENCAO' ou descrição/motivo contendo MANUTENÇÃO/MANUTENCAO/PREVENTIVA/CORRETIVA.
 */
export function isMaintenanceStop(
  item: Partial<WeeklyScheduleItem> & {
    stop_type?: string
    stop_description?: string
    stop_code?: string
    programacao_parada_motivo?: string
  },
): boolean {
  const stopType = String((item as any).stop_type || '').toUpperCase()
  if (stopType.includes('MANUTEN')) return true

  const combined = `${item.stop_description || ''} ${item.stop_code || ''} ${
    item.programacao_parada_motivo || ''
  }`.toUpperCase()

  return (
    combined.includes('MANUTENÇÃO') ||
    combined.includes('MANUTENCAO') ||
    combined.includes('MANUT') ||
    combined.includes('PREVENTIVA') ||
    combined.includes('CORRETIVA')
  )
}

/**
 * Helper unificado para determinar o tipo visual de um item de programação.
 */
export function resolveScheduleItemVisualType(
  item: Partial<WeeklyScheduleItem> & {
    stop_type?: string
  },
): ScheduleItemVisualType {
  // 1. SETUP explícito
  if (item.item_type === 'SETUP') {
    return 'TROCA_SETUP'
  }

  // 2. PARADA PROGRAMADA vs MANUTENÇÃO PROGRAMADA
  if (item.item_type === 'SCHEDULED_STOP') {
    return isMaintenanceStop(item) ? 'MANUTENCAO_PROGRAMADA' : 'PARADA_PROGRAMADA'
  }

  // 3. MTO
  if (item.order_type === 'MTO') {
    return 'MTO'
  }

  // 4. MTS (ou fallback de produção) -> verificar se é Aço Especial
  const isSpecial = isSpecialSteelGrade(
    item.steel_grade,
    item.material_description,
    item.material_code,
    item.metadata,
  )

  return isSpecial ? 'MTS_ACO_ESPECIAL' : 'MTS'
}

/**
 * Helper central que retorna a configuração visual completa para uso em blocos e linhas.
 * Retorna classes de fundo, borda, texto e ring de seleção garantindo consistência total.
 */
export function getScheduleItemVisualConfig(
  item: Partial<WeeklyScheduleItem> & { stop_type?: string },
  isSelected = false,
): {
  type: ScheduleItemVisualType
  config: ScheduleVisualConfig
  bgClass: string
  borderClass: string
  textClass: string
  combinedClass: string
  isCoolingAttended: boolean
  isSpecialSteel: boolean
} {
  const visualType = resolveScheduleItemVisualType(item)
  const config = SCHEDULE_TYPE_COLORS[visualType]
  const isSpecialSteel = visualType === 'MTS_ACO_ESPECIAL'
  const isCoolingAttended =
    !item.cooling_validation?.hasViolation && item.item_type !== 'SCHEDULED_STOP'

  const ringPart = isSelected
    ? 'ring-2 ring-blue-600 ring-offset-1 z-20 font-bold shadow-md'
    : 'shadow-2xs'

  // Para MTS Aço Especial, MTO, Troca Setup, Parada e Manutenção, garantimos contraste com texto branco
  const combinedClass =
    `${config.bgClass} ${config.borderClass} ${config.textClass} ${config.hoverClass} ${ringPart}`.trim()

  return {
    type: visualType,
    config,
    bgClass: config.bgClass,
    borderClass: config.borderClass,
    textClass: config.textClass,
    combinedClass,
    isCoolingAttended,
    isSpecialSteel,
  }
}

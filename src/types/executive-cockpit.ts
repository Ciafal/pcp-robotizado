export type PeriodFilterShortcut =
  | 'HOJE'
  | 'SEMANA'
  | 'MES'
  | 'YTD'
  | 'ANO'
  | 'HISTORICO_PERSONALIZADO'

export type TrafficLightStatus = 'GREEN' | 'YELLOW' | 'RED' | 'GRAY'

export type AlertLevel = 'INFORMATIVO' | 'ATENCAO' | 'CRITICO' | 'ESTRATEGICO'

export type PriorityCategory = 'CRITICA' | 'ALTA' | 'MONITORAR'

export type ActionType =
  | 'PLANO_ACAO'
  | 'DEMANDA'
  | 'PROJETO'
  | 'INVESTIGACAO'
  | 'ALERTA'
  | 'TAREFA'
  | 'REUNIAO'
  | 'ACOMPANHAMENTO'

export type ActionStatus = 'NAO_INICIADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | 'ATRASADA'

export type EfficacyStatus = 'PENDENTE_AVALIACAO' | 'EFICAZ' | 'PARCIALMENTE_EFICAZ' | 'INEFICAZ'

export type BriefingCadence = 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'SOB_DEMANDA'

export interface ExecutiveFilterState {
  period: PeriodFilterShortcut
  company: string
  plant: string
  sector: string
  process: string
  line: string
  product: string
  family: string
  customer: string
  manager: string
  responsible: string
  indicator: string
  project: string
  customStartDate?: string
  customEndDate?: string
}

export interface ExecutiveCardKPI {
  id: string
  title: string
  subtitle: string
  realized: number
  target: number
  gap: number
  unit: string // 't' | 't/h' | '%' | 'unidades'
  trend: 'UP' | 'DOWN' | 'STABLE'
  trendPct: number
  forecast: number
  status: TrafficLightStatus
  statusText: string
  statusRationale: string
  historySeries: Array<{ date: string; realized: number; target: number; forecast?: number }>
  sourceModule: 'PCP Robotizado' | 'Outro'
  confidencePct: number
}

export interface TrendAnalysisItem {
  indicatorId: string
  indicatorName: string
  previousState: string
  currentState: string
  trendDescription: string
  probableClosing: string
  willReachTarget: boolean
  trajectoryChangeDate: string
  coincidingVariables: string[]
  deteriorationRisk: string
  isCorrelationOnly: boolean // Explicit: "Correlação identificada — causalidade ainda não comprovada."
}

export interface RiskPredictionItem {
  id: string
  category:
    | 'META_RISK'
    | 'STOCK_RUPTURE'
    | 'OVERSTOCK'
    | 'DELIVERY_DELAY'
    | 'BOTTLENECK_CAPACITY'
    | 'MAINTENANCE_LOSS'
  title: string
  description: string
  horizonDays: number
  probabilityPct: number
  confidencePct: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  impactText: string
  affectedLineOrProduct: string
}

export interface CrossModuleCorrelation {
  id: string
  chainTitle: string
  description: string
  variables: string[]
  correlationCoefficient: number
  isCausalityProven: boolean
  warningNote: string
}

export interface InvestigationFinding {
  id: string
  anomalyTitle: string
  facts: string[]
  hypotheses: string[]
  evidences: string[]
  probableCauses: string[]
  provenCauses: string[]
  paretoSummary: Array<{
    factor: string
    count: number
    impactTons: number
    pct: number
    cumulativePct: number
  }>
  confidenceLevel: 'ALTA' | 'MEDIA' | 'BAIXA'
}

export interface ParetoItem {
  category: string
  count: number
  impactValue: number
  unit: string
  pct: number
  cumulativePct: number
  isTopVital: boolean // 80/20 top contributor
}

export interface HistoricalComparisonItem {
  metric: string
  currentValue: number
  unit: string
  previousPeriod: number
  samePeriodLastYear: number
  historicalAverage: number
  bestHistorical: number
  worstHistorical: number
  seasonalVariationPct: number
}

export interface PastCommitmentItem {
  id: string
  commitmentTitle: string
  promisedTarget: string
  deliveredResult: string
  adherencePct: number
  deliveryDate: string
  status: 'DELIVERED_ON_TIME' | 'DELIVERED_LATE' | 'UNDER_TARGET' | 'IN_PROGRESS'
  immutableRecordId: string
}

export interface ExecutiveAlertItem {
  id: string
  level: AlertLevel
  title: string
  lineCode: string
  message: string
  triggerMetric: string
  thresholdRule: string
  timestamp: string
}

export interface PrioritizationItem {
  id: string
  title: string
  impactScore: number // 1 to 5
  urgencyScore: number // 1 to 5
  probabilityScore: number // 1 to 5
  reachScore: number // 1 to 5
  totalPriorityScore: number // impact * urgency * probability * reach
  priorityCategory: PriorityCategory
  rationale: string
  lineCode: string
  suggestedDeadlineDays: number
}

export interface AIRecommendationItem {
  id: string
  title: string
  recommendation: string
  justification: string
  evidence: string
  expectedResult: string
  confidenceLevel: 'ALTA' | 'MEDIA' | 'BAIXA'
  confidencePct: number
  suggestedResponsible: string
  requiresHumanApproval: boolean
}

export interface ExecutiveActionRecord {
  id?: string
  code: string
  title: string
  description?: string
  action_type: ActionType
  priority: 'CRITICA' | 'ALTA' | 'MEDIA' | 'MONITORAR'
  status: ActionStatus
  analysis_ref_id?: string
  analysis_code?: string
  decision_rationale?: string
  responsible_name: string
  responsible_user_id?: string
  deadline: string
  expected_result?: string
  actual_result?: string
  efficacy_status?: EfficacyStatus
  line_code?: string
  created_by_id?: string
  created?: string
  updated?: string
}

export interface ExecutiveAnalysisRecord {
  id?: string
  analysis_code: string
  user_id?: string
  user_email?: string
  scope_applied: string
  period_filter: string
  line_code_filter: string
  model_version: string
  prompt_version: string
  confidence_level: string
  sources_used: Array<{
    system: string
    module: string
    tableOrOrigin: string
    period: string
    updatedAt: string
    status: string
  }>
  deterministic_kpis_snapshot: Record<string, unknown>
  executive_summary_payload: {
    currentSituation: string
    evidences: string[]
    trend: string
    impact: string
    recommendation: string
  }
  investigation_findings: InvestigationFinding[]
  recommendations_payload: AIRecommendationItem[]
  created?: string
}

export interface ExecutiveBriefingRecord {
  id?: string
  code: string
  title: string
  cadence: BriefingCadence
  period_ref: string
  generated_by_id?: string
  generated_by_name?: string
  summary_markdown: string
  kpi_highlights: Record<string, unknown>
  deviations_summary: Array<{ line: string; gapTons: number; reason: string }>
  risks_and_opportunities: Array<{ type: 'RISK' | 'OPPORTUNITY'; text: string; confidence: number }>
  pending_decisions: Array<{ title: string; deadline: string; impact: string }>
  overdue_actions: Array<{ code: string; title: string; responsible: string; daysOverdue: number }>
  ai_recommendations: AIRecommendationItem[]
  export_format: string
  created?: string
}

export interface ModuleIntegrationStatus {
  moduleId: string
  name: string
  category: string
  status: 'ACTIVE_REAL_DATA' | 'NOT_CONNECTED_STUB'
  description: string
  lastSync?: string
  recordsCount: number
}

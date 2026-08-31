import {
  WeeklyScheduleItem,
  WeeklyScheduleWorkflowState,
  WeeklySummaryRawMaterial,
  BilletRequirementGroup,
  SapPurchaseOrder,
  UpstreamProductionPlan,
  RawMaterialTrafficLight,
} from './weekly-schedule'

/**
 * Status operacional do dia no calendário mensal
 */
export type MonthlyDayStatus =
  | 'SEM_PROGRAMACAO'
  | 'RASCUNHO'
  | 'EM_REVISAO'
  | 'APROVADO'
  | 'ENVIADO_SAP'
  | 'EM_EXECUCAO'
  | 'CONCLUIDO'

/**
 * Indicadores consolidados do dia na grade mensal
 */
export interface MonthlyDayCellData {
  dateIso: string // YYYY-MM-DD
  dayOfMonth: number
  dayOfWeek: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  dayOfWeekLabel: string // 'SEG', 'TER', etc.
  dateStr: string // '24/08'
  weekNumber: number
  isInCurrentMonth: boolean

  // Resumo de produção e capacidade
  totalTons: number
  capacityHours: number
  programmedHours: number
  occupancyPct: number
  productsCount: number
  setupsCount: number
  setupHours?: number
  stopsCount: number

  // Semáforos e badges
  status: MonthlyDayStatus
  statusLabel: string
  rawMaterialStatus: RawMaterialTrafficLight
  rawMaterialLabel: string
  observationsCount: number
  criticalAlertsCount: number

  // Indicadores internos (badges discretos)
  hasMto: boolean
  mtoTons: number
  hasObservations: boolean
  hasRawMaterialRisk: boolean
  hasQualityRisk: boolean
  hasCoolingAlert: boolean
  hasRelevantStop: boolean
  hasMaintenance: boolean

  // Itens de programação associados a este dia
  items: WeeklyScheduleItem[]
  alerts: Array<{
    id: string
    type: 'critical' | 'warning' | 'info'
    title: string
    message: string
  }>
}

/**
 * Linha de semana na grade mensal (S35, S36, S37, S38, S39)
 */
export interface MonthlyWeekRowData {
  weekNumber: number
  weekLabel: string // 'S35', 'S36', etc.
  periodDisplay: string // '24/08 a 30/08/2026'
  capacityHours: number
  productionTons: number
  occupancyPct: number
  setupHours: number
  stopsHours: number
  alertsCount: number
  days: MonthlyDayCellData[]
}

/**
 * KPIs globais consolidados do mês
 */
export interface MonthlyKpisData {
  availableCapacityHours: number // 620.0 h
  programmedHours: number // 518.0 h
  occupancyPct: number // 83.5%
  productionTons: number // 5.840 t
  setupHours: number // 72.0 h
  stopsHours: number // 31.0 h
  mtsTons: number // 4.180 t
  mtoTons: number // 1.660 t
  observationsCount: number // 6
  criticalAlertsCount: number // 4
}

/**
 * Matéria-Prima & Tarugos com Primeira Data de Risco
 */
export interface MonthlyRawMaterialRow {
  steelGrade: string
  billetType: string
  sectionDimension: string
  monthlyNeedTons: number
  availableStockTons: number
  projectedEntriesTons: number
  projectedBalanceTons: number
  firstRiskDate: string | null // Ex: '27/08/2026' ou 'Sem risco'
  status: RawMaterialTrafficLight
  statusLabel: string
  details: string
}

/**
 * Carteira & Atendimento no Mês
 */
export interface MonthlyBacklogSummary {
  startMonthBacklogTons: number // Carteira início do mês
  newOrdersTons: number // Novos pedidos
  programmedMonthTons: number // Programado no mês
  projectedFinalBacklogTons: number // Carteira projetada final
  fulfillmentPct: number // % de atendimento previsto
  mtsShareTons: number
  mtsSharePct: number
  mtoShareTons: number
  mtoSharePct: number
}

/**
 * Item pendente em "Aguardando Observações"
 */
export interface MonthlyAwaitingObsItem {
  id: string
  scheduleItemId: string
  materialCode: string
  materialDescription: string
  lineCode: string
  weekNumber: number
  dayDateStr: string
  orderType: 'MTS' | 'MTO'
  tons: number
  reason: string
  observation: string
  responsible: string
  deadline: string
  status: WeeklyScheduleWorkflowState
}

/**
 * Relatório da Análise IA Mensal
 */
export interface MonthlyAiAnalysisReport {
  generatedAt: string
  overviewVerdict: string
  mainRisks: Array<{
    title: string
    severity: 'CRITICA' | 'ALTA' | 'MEDIA'
    description: string
    recommendation: string
  }>
  sequencingOpportunities: Array<{
    title: string
    gainHours: number
    gainTons: number
    description: string
  }>
  criticalWeeks: Array<{
    weekLabel: string
    riskReason: string
    suggestedAction: string
  }>
  rawMaterialRisks: Array<{
    material: string
    firstRuptureDate: string
    deficitTons: number
    consequence: string
  }>
  usableIdleCapacity: Array<{
    lineOrWeek: string
    idleHours: number
    recommendedMaterial: string
  }>
  mtoOrdersAtRisk: Array<{
    orderNumber: string
    customer: string
    material: string
    tons: number
    promisedDate: string
    impactReason: string
  }>
}

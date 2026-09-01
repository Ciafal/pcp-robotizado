/**
 * Types para o Drill-down do Indicador OEE (CIAFAL Hub Industrial / MES 4.0 / AOM)
 */

export interface OeeContext {
  companyCode?: string
  companyName?: string
  lineCode?: string
  lineName?: string
  equipmentCode?: string
  equipmentName?: string
  date?: string
  shiftCode?: string
  shiftName?: string
  crewCode?: string // Turma A, B, C, D
  productionOrder?: string
  productCode?: string
  productName?: string
  period?: 'SHIFT' | 'DAY' | 'WEEK' | 'MONTH'
  periodLabel?: string
}

export interface OeeDataSourceStatus {
  sap: 'CONNECTED' | 'NOT_AVAILABLE' | 'PARTIAL'
  mes: 'CONNECTED' | 'NOT_AVAILABLE' | 'PARTIAL'
  aomIba: 'CONNECTED' | 'NOT_AVAILABLE' | 'PARTIAL'
  pcm: 'CONNECTED' | 'NOT_AVAILABLE' | 'PARTIAL'
  notes?: Record<string, string>
}

export interface OeeScheduledStopEvent {
  id: string
  reason: string
  category:
    | 'PREVENTIVE'
    | 'SETUP'
    | 'TOOLING_CHANGE'
    | 'MEAL'
    | 'CLEANING'
    | 'TECHNICAL'
    | 'OPERATIONAL'
  source: 'PCP' | 'PCM' | 'MES' | 'SAP' | 'NOT_AVAILABLE'
  plannedStart: string
  plannedEnd: string
  plannedDurationHours: number
  realizedStart?: string | null
  realizedEnd?: string | null
  realizedDurationHours?: number | null
  deviationHours?: number | null
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'CANCELLED'
  orderOrEquipment?: string
}

export interface OeeUnscheduledStopEvent {
  id: string
  reason: string
  classification:
    | 'MECHANICAL'
    | 'ELECTRICAL'
    | 'OPERATIONAL'
    | 'RAW_MATERIAL'
    | 'PROCESS'
    | 'UTILITIES'
  source: 'MES' | 'PCM' | 'AOM_IBA' | 'NOT_AVAILABLE'
  equipmentCode: string
  realizedStart: string
  realizedEnd: string
  realizedDurationHours: number
  impactRatePct?: number
  orderNumber?: string
  notes?: string
}

export interface OeeAvailabilityBlock {
  totalAvailableHours: number // ex: 24.0h ou 8.0h por turno
  plannedStopsHours: number // ex: 2.0h
  plannedStopsPlannedHours: number // previsto
  plannedStopsDeviationHours: number
  availableProductionHours: number // Tempo Disponível para Produção = Total - Planejadas (ex: 22.0h)
  unplannedStopsHours: number // ex: 1.25h
  unplannedStopsCount: number
  realProductionHours: number // Tempo Real de Produção = Disponível Produção - Não Planejadas (ex: 20.75h)
  availabilityPct: number // Real Produção / Disponível Produção * 100
  targetAvailabilityPct: number
  gapAvailabilityPct: number
  stopsBreakdown: OeeScheduledStopEvent[]
  unscheduledStopsBreakdown: OeeUnscheduledStopEvent[]
}

export interface OeePerformanceBlock {
  realProductionHours: number
  theoreticalProductionTons: number // Tempo Real * Cadência Teórica
  realProductionTons: number // Produção Real apurada no MES
  theoreticalRatePerHour: number // ex: 120 t/h
  realRatePerHour: number // ex: 118 t/h
  plannedProductivityTons: number
  realProductivityTons: number
  rhythmSpeedLossTons: number // Perda de ritmo = Teórica - Real (ex: 15.0 t)
  rhythmSpeedLossHours: number // Tempo equivalente perdido por ritmo
  microStopsLossHours?: number | null
  temperatureSpeedLossTons?: number | null
  performancePct: number // (Real Rate / Theoretical Rate) ou (Real Tons / Theoretical Tons) * 100
  targetPerformancePct: number
  gapPerformancePct: number
  aomProcessVariables?: {
    avgSpeedMetersPerSec?: number | null
    targetSpeedMetersPerSec?: number | null
    avgFurnaceTempCelsius?: number | null
    targetFurnaceTempCelsius?: number | null
    microStopsCount?: number | null
    processDeviationsCount?: number | null
    isAvailable: boolean
  }
}

export interface OeeQualityBlock {
  dischargedTons: number // Produção desenfornada (t)
  rolledTons: number // Produção laminada (t)
  goodProductionTons: number // Produção boa aprovada (t)
  scrapTons: number // Sucata / refugo (t)
  reworkTons?: number | null // Retrabalho (quando aplicável)
  metallicLossTons: number // Perdas metálicas totais = desenfornada - boa
  metallicYieldPct: number // Rendimento metálico = (Produção boa / Produção desenfornada) * 100
  targetMetallicYieldPct: number // Meta versionada governada
  metallicYieldRuleSource: string // Regra de governança de rendimento
  qualityPct: number // Produção boa / Produção Real laminada * 100
  targetQualityPct: number
  gapQualityPct: number
}

export interface OeePlannedVsRealizedItem {
  metric: string
  unit: string
  planned: number
  realized: number
  deviationAbs: number
  deviationPct: number
  status: 'GREEN' | 'YELLOW' | 'RED'
  sourceModule: 'PCP' | 'MES' | 'AOM_IBA' | 'PCM' | 'SAP'
}

export interface OeeParetoLossItem {
  id: string
  rank: number
  category: 'AVAILABILITY' | 'PERFORMANCE' | 'QUALITY'
  lossName: string
  durationMinutes: number
  impactTons: number
  percentageOfTotalLoss: number
  accumulatedPercentage: number
  source: string
}

export interface OeeHistoryComparison {
  currentOee: number
  currentAvailability: number
  currentPerformance: number
  currentQuality: number
  previousShiftOee?: number | null
  previousDayOee?: number | null
  avg7DaysOee: number
  avg30DaysOee: number
  targetOee: number
  targetAvailability: number
  targetPerformance: number
  targetQuality: number
  gapOee: number
}

export interface OeeTimeFunnelStage {
  id: string
  label: string
  hours: number
  tons?: number
  lossLabel?: string
  lossHours?: number
  lossTons?: number
  percentageOfTotal: number
  barColor: string
}

export interface OeeAiFinding {
  id: string
  type: 'CONFIRMED_EVIDENCE' | 'HYPOTHESIS'
  title: string
  component: 'AVAILABILITY' | 'PERFORMANCE' | 'QUALITY' | 'GOVERNANCE'
  impactText: string
  evidenceDescription: string
  recommendation: string
}

export interface OeeAiAnalysisResult {
  generatedAt: string
  primaryDriver: 'AVAILABILITY' | 'PERFORMANCE' | 'QUALITY'
  primaryDriverDescription: string
  confidenceScorePct: number
  findings: OeeAiFinding[]
  prescriptiveActions: Array<{
    title: string
    responsible: string
    deadlineHours: number
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
  }>
}

export interface OeeCalculatedData {
  context: OeeContext
  dataSources: OeeDataSourceStatus
  overallOeePct: number
  targetOeePct: number
  gapOeePct: number
  availability: OeeAvailabilityBlock
  performance: OeePerformanceBlock
  quality: OeeQualityBlock
  plannedVsRealized: OeePlannedVsRealizedItem[]
  funnelStages: OeeTimeFunnelStage[]
  paretoLosses: OeeParetoLossItem[]
  history: OeeHistoryComparison
  aiAnalysis?: OeeAiAnalysisResult
}

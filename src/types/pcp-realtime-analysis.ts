export type OperationalStatus =
  | 'NORMAL' // 🟢 Normal (operando conforme plano)
  | 'ATENCAO' // 🟡 Atenção (desvio moderado ou risco)
  | 'CRITICO' // 🔴 Crítico (parado por falha ou desvio severo)
  | 'PARADA_PROGRAMADA' // 🔵 Parada programada
  | 'SEM_PROGRAMACAO' // ⚪ Sem programação

export type ScheduleSituation =
  | 'SEM_ATRASO' // No prazo
  | 'ADIANTADA' // À frente da programação
  | 'EM_RISCO' // Ritmo ou parada ameaça prazo
  | 'ATRASADA' // Atrasada em relação ao previsto

export type StopCategoryType =
  | 'PARADA_PROGRAMADA'
  | 'CORRETIVA_MECANICA'
  | 'CORRETIVA_ELETRICA'
  | 'OPERACIONAL'
  | 'SETUP_ACERTO'
  | 'OUTROS'

export interface RealtimeStopEvent {
  id: string
  stopCode: string
  centerCode: string
  lineCode: string
  companyCode: string
  opNumber?: string
  startDatetime: string
  endDatetime?: string | null
  durationMinutes: number
  isOpen: boolean
  category: StopCategoryType
  categoryLabel: string
  responsibleSector: string
  reason: string
  technicalCauseConfirmed?: string | null
  equipment?: string | null
  maintenanceOrderRef?: string | null
  maintenanceNoteRef?: string | null
  expectedReturnDatetime?: string | null
  isProgrammed: boolean
  operatorName?: string | null
}

export interface RealtimeTimelineEvent {
  id: string
  timestamp: string
  type: 'INICIO_TURNO' | 'INICIO_PRODUCAO' | 'FIM_PRODUCAO' | 'PARADA' | 'RETORNO' | 'SETUP'
  title: string
  description: string
  orderNumber?: string
  materialCode?: string
  durationMinutes?: number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  source: 'MES' | 'PCP' | 'SAP'
}

export interface CenterMetricDetail {
  title: string
  value: number | null
  target: number | null
  unit: string
  difference: number | null
  trend: 'UP' | 'DOWN' | 'STABLE'
  origin: string
  timestamp: string
  isMeasured: boolean
  notes?: string
}

export interface RealtimeCenterData {
  centerCode: string
  centerName: string
  lineCode: string
  lineName: string
  companyCode: string
  companyName: string
  plantCode: string
  plantName: string
  status: OperationalStatus
  lastUpdated: string
  isStale: boolean
  hasActiveOrder: boolean

  // Produção Atual
  productionOrder: string | null
  materialCode: string | null
  materialDescription: string | null
  dimension: string | null
  steelGrade: string | null
  campaign: string | null
  currentProduct: string | null
  previousProduct: string | null
  nextProgrammedProduct: string | null
  productionStartTime: string | null
  productionForecastEndTime: string | null

  // Volumes e Taxas (t e t/h)
  programmedTons: number | null
  realizedTons: number | null
  balanceTons: number | null
  achievementPct: number | null // pode ultrapassar 100% (ex: 103,00%)
  accumulatedProductionTons: number | null
  plannedRatePerHour: number | null // t/h
  currentRatePerHour: number | null // t/h
  rateDifference: number | null
  accumulatedShiftTons: number | null
  accumulatedDayTons: number | null

  // Indicadores
  oee: CenterMetricDetail
  utilization: CenterMetricDetail
  metallicYield: {
    weightInputTons: number | null
    weightGoodProductTons: number | null
    yieldPct: number | null
    targetPct: number | null
    estimatedLossTons: number | null
    origin: string
    timestamp: string
    isMeasured: boolean
  }

  // Parada Ativa e Totais
  activeStop: RealtimeStopEvent | null
  stopsCountShift: number
  stoppedMinutesShift: number
  stoppedMinutesDay: number
  stopsHistory: RealtimeStopEvent[]

  // Linha do tempo operacional
  timeline: RealtimeTimelineEvent[]
}

export interface RealtimeLineData {
  lineCode: string
  lineName: string
  companyCode: string
  companyName: string
  plantCode: string
  plantName: string
  status: OperationalStatus
  scheduleSituation: ScheduleSituation
  realizedTons: number | null
  plannedTons: number | null
  achievementPct: number | null
  oeePct: number | null
  utilizationPct: number | null
  metallicYieldPct: number | null
  currentRatePerHour: number | null
  plannedRatePerHour: number | null
  currentProduct: string | null
  accumulatedStopsSeconds: number // HH:mm:ss
  lastUpdated: string
  isStale: boolean
  centersCount: number
  centersRunning: number
  centersStopped: number
  centers: RealtimeCenterData[]
}

export interface RealtimeCompanyConsolidated {
  companyCode: string
  companyName: string
  totalCenters: number
  centersOperating: number
  centersStopped: number
  centersInSetup: number
  centersScheduledStop: number
  centersWithoutSchedule: number

  oeePct: number | null
  utilizationPct: number | null
  metallicYieldPct: number | null

  plannedProductionTons: number | null
  realizedProductionTons: number | null
  achievementPct: number | null
  deviationTons: number | null
  currentProductionRatePerHour: number | null // t/h
  totalStoppedTimeSeconds: number // para HH:mm:ss
  totalInputTons: number | null
  totalGoodTons: number | null
}

export type RealtimePeriod = 'DIA' | 'ONTEM' | 'SEMANA' | 'MES' | 'ANO'

export interface RealtimePeriodRange {
  period: RealtimePeriod
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  startDatetimeIso: string
  endDatetimeIso: string
  label: string
  isCurrentPeriodInProgress: boolean
  elapsedFractionOfPeriod: number // 0.0 a 1.0 (para cálculo de parcela de produção planejada transcorrida)
}

export interface RealtimeFilters {
  companyCode?: string
  lineCode?: string
  centerCode?: string
  date?: string
  shiftCode?: string
  operationalStatus?: string
  period?: RealtimePeriod
}

export interface RealtimeDataPayload {
  environment: 'Produção' | 'Homologação'
  dataFetchedAt: string // ISO string
  staleThresholdMinutes: number
  isStale: boolean
  qualityStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE'
  qualityMessage: string
  companies: { code: string; name: string }[]
  lines: { code: string; name: string; companyCode: string }[]
  centers: { code: string; name: string; lineCode: string; companyCode: string }[]
  consolidatedCompany: RealtimeCompanyConsolidated
  linesData: RealtimeLineData[]
  periodRange?: RealtimePeriodRange
}

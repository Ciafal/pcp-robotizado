import {
  ProductionLine,
  LineMaster,
  LineProductivityRate,
  LineBlockedProduct,
  LineSetupMatrix,
  ProductionShift,
  StandardScheduledStop,
} from './line-master'

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
  start_datetime: string
  end_datetime: string
  status: 'DRAFT' | 'EM_ANALISE' | 'APROVADO' | 'PUBLICADO'
  version: number
  pcp_notes?: string
  raw_material_req_tons: number
  raw_material_type?: string
  is_blocked_attempt?: boolean
  metadata?: Record<string, any>
  created?: string
  updated?: string
}

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
  stoppedHours: number
  freeHours: number
  utilizationPct: number
  programmedProductsCount: number
  rawMaterialRequiredTons: number
  criticalAlertsCount: number
  sequenceScore: number
}

export interface WeeklySummaryCapacity {
  calendarHours: number
  availableHours: number
  productionHours: number
  setupHours: number
  stoppedHours: number
  freeHours: number
  utilizationPct: number
}

export interface WeeklySummaryProduction {
  totalTons: number
  byFamily: Record<string, number>
  byMaterial: Record<string, number>
  byTurno: Record<string, number>
  byDay: Record<string, number>
}

export interface WeeklySummaryRawMaterial {
  steelGrade: string
  rawMaterialType: string
  requiredTons: number
  availableStockTons: number | null // null = "Aguardando dados do SAP/WMS"
  futureEntryTons: number | null
  projectedConsumptionTons: number
  projectedBalanceTons: number | null
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
}

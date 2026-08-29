// Tipos e Interfaces para o Módulo de Gestão de Estoques e Planejamento Mestre CIAFAL

import { InventoryItem, InventoryCategory, InventorySourceMode } from './inventory-projection'

export type { InventoryItem, InventoryCategory, InventorySourceMode }

export interface InventoryKPIs {
  rawMaterialTons: number
  semiFinishedTons: number
  finishedGoodsTons: number
  itemsBelowMinCount: number
  itemsAboveMaxCount: number
  itemsZeroStockCount: number
  totalItemsCount: number
  lastSyncTime: string
  sapConnected: boolean
}

export type ProductionNature = 'TODAS' | 'PRODUCAO_PROPRIA' | 'INDUSTRIALIZACAO'

export type StockScenarioType =
  | 'SCENARIO_A_APPROVED'
  | 'SCENARIO_B_HISTORIC'
  | 'SCENARIO_C_AI_FORECAST'

export interface InventoryDiscrepancy {
  id: string
  discrepancy_code: string
  plant_code: string
  storage_location: string
  material_code: string
  material_description?: string
  batch_number?: string
  sap_qty: number
  wms_qty: number
  diff_qty: number
  diff_pct: number
  unit: string
  sap_sync_at?: string
  wms_sync_at?: string
  status: 'PENDENTE' | 'EM_TRATAMENTO' | 'CONCILIADO' | 'JUSTIFICADO'
  occurrence_notes?: string
  responsible_name?: string
  resolved_at?: string
  created?: string
  updated?: string
}

export interface StockTimelinePoint {
  date: string
  dayIndex: number
  dayName: string
  stockCurrent: number
  plannedInput: number
  plannedConsumption: number
  projectedStock: number
  minStock: number
  safetyStock: number
  criticalLimit: number
  isRupture: boolean
}

export interface StockProjectionScenarioResult {
  scenarioId: StockScenarioType
  scenarioName: string
  scenarioDescription: string
  timeline: StockTimelinePoint[]
  predictedRuptureDate: string | null
  daysOfCoverage: number
  monthsOfCoverage: number
  currentStockTons: number
  totalPlannedConsumptionTons: number
  totalPlannedEntriesTons: number
  finalProjectedStockTons: number
  averageDailyConsumptionTons: number
}

export interface IntegratedIndustrialCoverage {
  steelGrade: string
  mpDays: number
  semiFinishedDays: number
  finishedGoodsDays: number
  crmDemandTons: number
  totalChainCoverageDays: number
  bottleneckStage: 'MP' | 'SEMI_FINISHED' | 'FINISHED_GOODS' | 'CAPACITY'
  status: 'SAUDAVEL' | 'ATENCAO' | 'CRITICO'
}

export interface SmartStockAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  category:
    | 'MP_BELOW_MIN'
    | 'FUTURE_RUPTURE'
    | 'SEMI_FINISHED_INSUFFICIENT'
    | 'FINISHED_GOOD_INSUFFICIENT'
    | 'EXCESSIVE_STOCK'
    | 'NO_APPLICATION'
    | 'SAP_WMS_DIVERGENCE'
    | 'DELAYED_ENTRY'
    | 'BLOCKED_MATERIAL'
    | 'QUALITY_HOLD'
    | 'SCHEDULE_NO_COVERAGE'
    | 'UNEXPECTED_DEMAND_SURGE'
    | 'CRM_FORECAST_SHIFT'
  title: string
  problem: string
  probableCause: string
  impact: string
  expectedDate: string
  materialCode: string
  materialDescription?: string
  lineCode?: string
  plantCode: string
  storageLocation?: string
  gapTons?: number
  recommendedAction: string
}

// ========================================================
// PLANEJAMENTO MESTRE (PMP / S&OP) INTERFACES
// ========================================================

export type PlanHorizon = 'ANUAL' | 'MENSAL' | 'SEMANAL'

export type DemandLayer =
  | 'DEMANDA_FIRME'
  | 'DEMANDA_PLANEJADA'
  | 'COMERCIAL_PROVAVEL'
  | 'DEMANDA_POTENCIAL'

export interface MasterPlanHeader {
  id: string
  plan_code: string
  title: string
  horizon_type: PlanHorizon
  period_ref: string
  year: number
  month?: number
  version: number
  status: 'DRAFT' | 'EM_APROVACAO' | 'VIGENTE' | 'SUPERSEDED' | 'CANCELADO'
  plant_code: string
  total_planned_tons: number
  total_produced_tons: number
  firm_demand_tons: number
  crm_forecast_tons: number
  adherence_volume_pct: number
  adherence_mix_pct: number
  adherence_temporal_pct: number
  adherence_overall_pct: number
  forecast_accuracy_pct: number
  forecast_bias_pct: number
  responsible_name: string
  change_reason?: string
  created?: string
  updated?: string
}

export interface MasterPlanItem {
  id: string
  item_code: string
  plan_code: string
  product_code: string
  product_name: string
  family_code: string
  steel_grade: string
  line_code: string
  plant_code: string
  production_nature: 'PRODUCAO_PROPRIA' | 'INDUSTRIALIZACAO'
  order_type: 'MTS' | 'MTO'
  period_ref: string
  planned_tons: number
  programmed_tons: number
  produced_tons: number
  firm_sales_tons: number
  crm_forecast_tons: number
  final_stock_tons: number
  adherence_volume_pct: number
  adherence_mix_pct: number
  adherence_temporal_pct: number
  gap_tons: number
  forecast_accuracy_pct: number
  forecast_bias_pct: number
  deviation_cause?: string
  deviation_justification?: string
  action_plan?: string
  created?: string
  updated?: string
}

export interface CRMForecastRecord {
  id: string
  record_code: string
  customer_code?: string
  customer_name: string
  sales_rep_name?: string
  region?: string
  segment?: string
  product_code: string
  product_name: string
  family_code?: string
  steel_grade?: string
  demand_layer: DemandLayer
  funnel_stage?: string
  probability_pct: number
  quantity_tons: number
  weighted_tons: number
  period_ref: string
  expected_date?: string
  last_purchase_date?: string
  historical_conversion_pct?: number
  status?: string
}

export interface MasterPlanVersion {
  id: string
  version_code: string
  plan_code: string
  version_number: number
  period_ref: string
  author_name: string
  author_email?: string
  change_reason: string
  valid_from: string
  valid_until?: string
  total_planned_tons: number
  crm_forecast_tons: number
  crm_active_snapshot?: any
  plan_payload?: any
  created?: string
  updated?: string
}

export interface MasterPlanningKPIs {
  adherenceOverallPct: number
  adherenceVolumePct: number
  adherenceMixPct: number
  adherenceTemporalPct: number
  forecastAccuracyPct: number
  forecastBiasPct: number
  forecastBiasType: 'POSITIVE_BIAS_OVERPLANNING' | 'NEGATIVE_BIAS_UNDERPLANNING' | 'BALANCED'
  totalPlannedTons: number
  totalProducedTons: number
  totalFirmSalesTons: number
  totalCrmForecastTons: number
  excessStockRiskTons: number
  lostSalesRiskTons: number
  reprogrammingCount: number
  planStabilityPct: number
}

export interface DeviationAnalysisCause {
  id: string
  code: string
  label: string
  category: 'PLANEJAMENTO' | 'PROGRAMACAO' | 'EXECUCAO'
  count: number
  impactTons: number
}

export interface WhatIfSimulationParams {
  crmOpportunitiesConversionChangePct: number // ex: +10% ou -20%
  salesVolumeChangePct: number // ex: +15%
  keyCustomerPostponed: boolean
  mpArrivalDelayDays: number
  lineCapacityLossPct: number
  forecastShiftPct: number
}

export interface WhatIfSimulationResult {
  simulatedDemandTons: number
  requiredMpTons: number
  mpShortageTons: number
  requiredSemiFinishedTons: number
  finishedGoodsStockGapTons: number
  lineCapacityUtilizationPct: number
  feasibilityScorePct: number
  criticalBottlenecks: string[]
  recommendedMitigations: string[]
}

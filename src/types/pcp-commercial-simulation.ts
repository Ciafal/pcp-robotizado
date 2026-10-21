/**
// Tipos para o Módulo de Simulação Comercial - PCP Robotizado CIAFAL
// Padrão pt-BR e modo cenário estrito (NÃO altera a programação vigente).
**/

export type CommercialPriority = 'NORMAL' | 'ALTA' | 'ESTRATEGICA' | 'URGENTE'

export type SimulationViability =
  | 'VIAVEL'
  | 'VIAVEL_COM_AJUSTE'
  | 'PARCIALMENTE_VIAVEL'
  | 'NAO_VIAVEL'

export type RawMaterialAvailabilityStatus =
  | 'DISPONIVEL'
  | 'PARCIALMENTE_DISPONIVEL'
  | 'INDISPONIVEL'
  | 'AGUARDANDO_RECEBIMENTO'

export type ScheduleChangeSeverity =
  | 'NAO_NECESSARIA'
  | 'PEQUENO_AJUSTE'
  | 'REPROGRAMACAO_NECESSARIA'
  | 'IMPACTO_CRITICO'

export type SimulationApprovalStatus =
  | 'SIMULADA'
  | 'AGUARDANDO_ANALISE_PCP'
  | 'APROVADA_PCP'
  | 'REPROVADA_PCP'
  | 'SOLICITADO_AJUSTE_PCP'

export type SimulationType = 'COMERCIAL' | 'PRODUTIVA'

export interface SimulationFormData {
  company_code?: string
  plant_code?: string
  line_code?: string
  production_center?: string
  simulation_type?: SimulationType
  customer_name: string
  customer_code?: string
  product_code: string
  product_description?: string
  requested_quantity_tons: number
  unit_measure: string // 't'
  requested_deadline: string // dd/mm/aaaa
  order_or_opportunity?: string
  commercial_priority: CommercialPriority
  notes?: string
}

export interface SimulationKpis {
  viability: SimulationViability
  viability_label: string
  best_date_possible: string // dd/mm/aaaa
  requested_deadline: string // dd/mm/aaaa
  difference_days: number // ex: +7
  quantity_possible_requested_date: number // ex: 18.5
  quantity_requested: number // ex: 25.0
  quantity_possible_requested_pct: number // ex: 74.0
  quantity_total_possible: number // ex: 25.0
  date_total_quantity_available: string // dd/mm/aaaa
  raw_material_status: RawMaterialAvailabilityStatus
  raw_material_label: string
  capacity_impact_text: string // ex: "+8,5 h de ocupação na L1 (3,2% da capacidade semanal)"
  schedule_change_severity: ScheduleChangeSeverity
  schedule_change_label: string
  impacted_orders_count: number // ex: 4
  delayed_orders_count: number // ex: 2
  delayed_tonnage: number // ex: 35.0 t
}

export interface ProductionCenterOption {
  center_code: string // L1, L2, ACAB_L2, etc.
  line_name: string
  process_type: string
  possible_start_date: string // dd/mm/aaaa HH:mm
  possible_end_date: string // dd/mm/aaaa HH:mm
  required_hours: number
  productivity_rate_th: number
  situation: string // "Melhor alternativa", "Alternativa viável", "Restrição técnica", etc.
  is_best_alternative: boolean
  setup_minutes_estimated: number
  technical_restrictions_note?: string
}

export interface SequenceImpactItem {
  current_sequence: number
  production_order: string
  product_code: string
  product_description: string
  quantity_tons: number
  customer_name: string
  current_date: string // dd/mm/aaaa
  simulated_new_date: string // dd/mm/aaaa
  displacement_days: number // +2 dias
  chain_level: number // 1 = direto, 2+ = em cadeia
  situation: string
}

export interface DeliveryImpactItem {
  sales_order: string
  production_order: string
  customer_name: string
  product_code: string
  product_description: string
  quantity_tons: number
  current_promised_date: string // dd/mm/aaaa
  simulated_delivery_date: string // dd/mm/aaaa
  difference_days: number // 0, +1, +2, etc.
  classification: 'Sem impacto' | 'Antecipado' | '+1 dia' | '+2 dias' | '+3 dias' | 'Atraso crítico'
  is_delayed: boolean
}

export interface RawMaterialAnalysisItem {
  raw_material_code: string
  description: string
  required_tons: number
  available_pcp_tons: number
  reserved_tons: number
  balance_after_simulation_tons: number
  expected_arrival_date?: string
  expected_arrival_tons?: number
  purchase_order?: string
  industrializer?: string
  situation: 'MP DISPONÍVEL' | 'FALTA DE MP' | 'PARCIAL' | 'AGUARDANDO RECEBIMENTO'
  details: string
}

export interface CapacityImpactByCenter {
  center_code: string
  center_name: string
  period_label: string
  total_available_hours: number
  current_programmed_hours: number
  additional_hours_simulated: number
  simulated_total_hours: number
  utilization_pct_before: number
  utilization_pct_simulated: number
  is_critical: boolean // > 90%
}

export interface SetupAndSequencingAnalysis {
  additional_setup_minutes: number
  setup_reason: string
  gauge_change?: boolean
  gaugeChange?: boolean
  profile_change?: boolean
  profileChange?: boolean
  steel_grade_change: boolean
  campaign_change: boolean
  sequence_break_detected: boolean
  technical_recommendation: string
  is_recommended: boolean
}

export interface SimulationScenarioAlternative {
  scenario_id: 'A' | 'B' | 'C'
  title: string
  subtitle: string
  criteria_highlight: string
  delivery_date: string
  quantity_tons: number
  impacted_orders_count: number
  delayed_orders_count: number
  additional_setup_minutes: number
  raw_material_status: string
  capacity_utilization_pct: number
  ai_summary: string
  is_recommended?: boolean
}

export interface CommercialExecutiveResponse {
  viability: SimulationViability
  viability_label: string
  best_date: string
  quantity_total_possible: number
  quantity_possible_requested_date: number
  raw_material_summary: string
  schedule_impact_summary: string
  delayed_orders_summary: string
  schedule_change_need: string
  executive_recommendation: string
}

export interface GanttComparisonItem {
  id: string
  item_type: 'CURRENT' | 'SIMULATED_NEW' | 'SIMULATED_DISPLACED'
  order_code: string
  material_code: string
  material_description: string
  customer_name: string
  quantity_tons: number
  start_datetime: string
  end_datetime: string
  is_new_order?: boolean
  is_displaced?: boolean
  is_delayed?: boolean
  is_critical_period?: boolean
  line_code: string
}

export interface DataReliabilityBreakdown {
  is_complete: boolean
  missing_data_items: string[]
  confirmed_data: string[]
  calculated_simulations: string[]
  ai_recommendations: string[]
}

export interface CommercialSimulationRecord {
  id: string
  simulation_code: string // SIM-000001/2026
  year: number
  seq_number: number
  customer_name: string
  customer_code?: string
  product_code: string
  product_description?: string
  requested_quantity_tons: number
  unit_measure: string
  requested_deadline: string
  order_or_opportunity?: string
  commercial_priority: CommercialPriority
  notes?: string
  viability: SimulationViability
  best_date_possible: string
  date_difference_days: number
  quantity_possible_requested_date: number
  quantity_possible_requested_pct: number
  quantity_total_possible: number
  date_total_quantity_available: string
  raw_material_status: RawMaterialAvailabilityStatus
  capacity_impact_text: string
  schedule_change_severity: ScheduleChangeSeverity
  impacted_orders_count: number
  delayed_orders_count: number
  selected_scenario_id: string
  approval_status: SimulationApprovalStatus
  is_data_complete: boolean
  missing_data_reasons?: string[]
  snapshot_id?: string
  created_by_id?: string
  created_by_name?: string
  created_by_role?: string
  created_by_email?: string
  created: string
  updated: string
}

export interface SimulationResultBundle {
  simulationRecord?: CommercialSimulationRecord
  kpis: SimulationKpis
  productionCenters: ProductionCenterOption[]
  sequenceImpact: SequenceImpactItem[]
  deliveryImpact: DeliveryImpactItem[]
  delayedOrders: DeliveryImpactItem[]
  rawMaterialAnalysis: RawMaterialAnalysisItem[]
  capacityImpact: CapacityImpactByCenter[]
  setupSequencing: SetupAndSequencingAnalysis
  scenariosComparison: SimulationScenarioAlternative[]
  commercialResponse: CommercialExecutiveResponse
  ganttComparison: GanttComparisonItem[]
  dataReliability: DataReliabilityBreakdown
  aiExplanation: string
}

/**
 * Tipos Oficiais e Estruturas para a Gestão de Matéria-Prima — CIAFAL
 * Subtópicos 1 a 8 com Tipagem Estrita
 */

export type DimensionalClassification =
  | 'NIVEL_1_IDEAL'
  | 'NIVEL_2_ADMISSIVEL'
  | 'NIVEL_3_FORA_IDEAL_CONFORME'
  | 'NIVEL_4_EXCECAO_TECNICA'
  | 'NIVEL_5_PROIBIDO'

export type SapBlockStatus =
  | '01_DISPONIVEL'
  | '02_SELECIONADO_ENVIO'
  | '03_TRANSITO'
  | '04_MP_CIAFAL'
  | '05_FORNO'
  | '06_DEVOLVIDO'
  | '07_LAMINADO'

export type ReservationStatus =
  | 'LIVRE'
  | 'SUGESTAO_RESERVA'
  | 'RESERVADA'
  | 'BLOQUEADA'
  | 'EM_PLANO_DE_CORTE'
  | 'CORTE_APROVADO'
  | 'EM_PROCESSO'

export type LeftoverClassification =
  | 'REUTILIZAVEL'
  | 'RESERVAR'
  | 'REAPLICAVEL'
  | 'ANALISE_TECNICA'
  | 'SUCATA'

export type MPItemType = 'PLACA' | 'BLOCO' | 'PECA' | 'SOBRA_REUTILIZAVEL' | 'RETALHO' | 'PARCIAL'

export type MPShape = 'PLACA' | 'PALANQUILHA' | 'TARUGO' | 'LINGOTE' | 'OUTRO'

export type DestinationType =
  | 'PRODUCAO_PROPRIA'
  | 'CLIENTE_INDUSTRIALIZADOR'
  | 'LINHA_INTERNA'
  | 'SEPARACAO'
  | 'SEM_APLICACAO'
  | 'OUTRO'

export type CuttingScenarioType =
  | 'RECOMENDADO_IA'
  | 'MAIOR_RENDIMENTO'
  | 'MENOR_CUSTO'
  | 'MENOR_SUCATA'
  | 'PRESERVACAO_CRITICA'
  | 'MAIOR_CARTEIRA'
  | 'PERSONALIZADO_HUMANO'

export type PlanStatus =
  | 'RASCUNHO'
  | 'IA_SUGERIDO'
  | 'REVISADO_PCP'
  | 'PENDENTE_APROVACAO'
  | 'APROVADO_PCP'
  | 'EXCECAO_LIBERADA'
  | 'ENVIADO_SAP'
  | 'INTEGRADO_SAP'
  | 'REJEITADO'
  | 'CANCELADO'
  | 'HISTORICO'

export type ApprovalType =
  | 'PLANO_CORTE'
  | 'ALTERACAO_APLICACAO_ZPP86'
  | 'PECA_FORA_PADRAO_ZPP88'
  | 'EXCECAO_TECNICA_NIVEL_4'
  | 'RESERVA_ESTRATEGICA'

export type StageApprovalStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'NAO_APLICAVEL'

export type OverallApprovalStatus = 'EM_ANALISE' | 'APROVADO_TOTAL' | 'REJEITADO' | 'CANCELADO'

export type HorizonCategory = 'HOJE' | '7_DIAS' | '15_DIAS' | '30_DIAS' | '60_DIAS' | '90_DIAS'

export type PurchaseOrderStatus =
  | 'ABERTO'
  | 'PARCIALMENTE_RECEBIDO'
  | 'CONCLUIDO'
  | 'ATRASADO'
  | 'BLOQUEADO'
  | 'CANCELADO'

export type RiskTrafficLight = 'VERDE' | 'AMARELO' | 'LARANJA' | 'VERMELHO' | 'CINZA'

export type L1AutoStatus =
  | 'OK_SOBRA'
  | 'ATENCAO'
  | 'FALTA_MP'
  | 'NECESSARIO_PRODUZIR_L2'
  | 'DEPENDENTE_RECEBIMENTO'
  | 'RECEBIMENTO_ATRASADO'
  | 'ESTOQUE_ABAIXO_MINIMO'
  | 'SEM_COBERTURA_PROGRAMACAO'
  | 'DIVERGENCIA_SALDO'

// Subtópico 1: Pedidos e Recebimento
export interface MPPurchaseOrder {
  id: string
  po_number: string
  po_item: string
  supplier_code: string
  supplier_name: string
  material_code: string
  material_description?: string
  steel_grade: string
  ordered_qty?: number
  ordered_weight_kg: number
  center_code: string
  storage_location?: string
  order_date: string
  delivery_date_contracted: string
  delivery_date_updated?: string
  received_qty?: number
  received_weight_kg?: number
  pending_weight_kg?: number
  po_status: PurchaseOrderStatus
  is_delayed?: boolean
  delay_days?: number
  contracted_thickness_mm?: number
  contracted_width_mm?: number
  contracted_length_mm?: number
  contracted_diameter_mm?: number
  contracted_dimensions_text?: string
  target_application?: string
  target_production_lines_json?: string[]
  risk_rupture_level?: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  sap_sync_timestamp?: string
  created?: string
  updated?: string
}

export interface MPFutureReception {
  id: string
  reception_code: string
  po_number: string
  po_item?: string
  supplier_name: string
  material_code: string
  material_description?: string
  steel_grade: string
  dimensions_text?: string
  expected_tons: number
  expected_date: string
  horizon_category: HorizonCategory
  target_application?: string
  target_lines_json?: string[]
  risk_delay_level?: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  risk_delay_reason?: string
  covers_critical_demand?: boolean
  critical_order_ref?: string
  created?: string
  updated?: string
}

export interface MPFutureInventoryProjection {
  id: string
  projection_code: string
  material_code: string
  material_description?: string
  steel_grade: string
  center_code: string
  storage_location?: string
  application_target?: string
  line_target?: string
  supplier_code?: string
  horizon_category: HorizonCategory
  current_stock_tons?: number
  confirmed_po_tons?: number
  future_receptions_tons?: number
  scheduled_consumption_tons?: number
  projected_future_stock_tons: number
  coverage_days?: number
  balance_status: 'NORMAL' | 'CRITICO_RUPTURA' | 'EXCESSO_ESTOQUE' | 'RECEBIMENTO_ATRASADO'
  alerts_json?: string[]
  calculated_at?: string
  created?: string
  updated?: string
}

// Subtópico 2 & 3: Estoque Dimensional, Requisitos, Planos de Corte, Otimização
export interface ZPPMPValidationResult {
  is_valid: boolean
  thickness: { value: number; min: number; max: number; status: 'GREEN' | 'RED' }
  width: { value: number; min: number; max: number; status: 'GREEN' | 'RED' }
  length: { value: number; min: number; max: number; status: 'GREEN' | 'RED' }
  weight?: { value: number; min?: number; max?: number; status: 'GREEN' | 'RED' }
}

export interface MPDimensionalItem {
  id: string
  material_code: string
  material_description?: string
  steel_grade?: string
  center_code: string
  storage_location?: string
  trauml?: string
  batch_number?: string
  heat_number?: string
  letter_code?: string
  block_number?: string
  supplier_code?: string
  supplier_name?: string
  invoice_number?: string
  reception_date?: string
  original_application: string
  current_application: string
  thickness_mm: number
  width_mm: number
  length_mm: number
  diameter_mm?: number
  weight_kg: number
  item_type: MPItemType
  sap_block_status: SapBlockStatus
  reservation_status: ReservationStatus
  dimensional_classification: DimensionalClassification
  is_critical?: boolean
  criticality_reason?: string
  opportunity_cost_score?: number
  strategic_value_score?: number
  applicable_scenarios_count?: number
  origin_parent_id?: string
  cut_date?: string
  physical_balance_status?: string
  possible_applications_json?: string[]
  alternative_applications_json?: string[]
  next_demand_schedule?: string
  line_destination_code?: string
  leftover_classification?: LeftoverClassification
  zppmp_validation_result?: ZPPMPValidationResult
  created?: string
  updated?: string
}

export interface MPApplicationRequirement {
  id: string
  application_code: string
  application_name: string
  steel_grade: string
  supplier_code?: string
  supplier_name?: string
  zppmp_table_ref?: string
  ideal_thickness_mm?: number
  min_thickness_mm: number
  max_thickness_mm: number
  ideal_width_mm?: number
  min_width_mm: number
  max_width_mm: number
  ideal_length_mm?: number
  min_length_mm: number
  max_length_mm: number
  ideal_weight_kg?: number
  min_weight_kg?: number
  max_weight_kg?: number
  allowed_alternatives_json?: string[]
  restrictions_json?: string[]
  priority_order?: number
  allows_out_of_ideal?: boolean
  zpp88_transformation_rules_json?: {
    process_type: string
    rolling_factor_thickness: number
    rolling_factor_width: number
    rolling_factor_length: number
    trimming_loss_pct: number
    scale_loss_pct: number
    projected_final_product_specs: string
  }
  is_active?: boolean
  created?: string
  updated?: string
}

export interface CutPieceResult {
  id: string
  target_application: string
  thickness_mm: number
  width_mm: number
  length_mm: number
  weight_kg: number
  x_pos_mm: number
  y_pos_mm: number
  z_pos_mm: number
  status: 'PRODUTIVA' | 'SOBRA_REUTILIZAVEL' | 'RETALHO' | 'SUCATA'
  destination_order?: string
  is_reusable_leftover: boolean
  leftover_classification?: LeftoverClassification
}

export interface MPCuttingPlan {
  id: string
  plan_code: string
  version: number
  title: string
  status: PlanStatus
  selected_scenario: CuttingScenarioType
  source_plates_count?: number
  total_input_weight_tons?: number
  total_output_weight_tons?: number
  total_reusable_leftover_tons?: number
  total_scrap_tons?: number
  overall_yield_pct?: number
  overall_ai_score?: number
  scenarios_comparison_json?: Record<string, any>
  cutting_layout_items_json?: any
  demands_covered_json?: any
  human_changes_notes?: string
  created_by_user_id?: string
  created_by_user_name?: string
  reviewed_by_user_id?: string
  reviewed_by_user_name?: string
  approved_by_user_id?: string
  approved_by_user_name?: string
  approved_at?: string
  sap_order_ref?: string
  sap_sync_status?: string
  created?: string
  updated?: string
}

export interface MPReapplicationOpportunity {
  id: string
  opportunity_code: string
  block_number: string
  heat_number?: string
  letter_code?: string
  material_code: string
  center_code: string
  storage_location?: string
  original_application: string
  current_application: string
  recommended_application: string
  thickness_mm: number
  width_mm: number
  length_mm: number
  weight_kg: number
  dimensional_classification: DimensionalClassification
  ai_score?: number
  confidence_pct?: number
  potential_savings_brl?: number
  scrap_avoided_kg?: number
  risk_level?: 'MUITO_BAIXO' | 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  urgency_level?: 'IMEDIATA' | 'ALTA' | 'NORMAL' | 'BAIXA'
  historical_precedents_count?: number
  historical_success_rate_pct?: number
  target_order_number?: string
  target_schedule_week?: string
  ai_reasoning?: string
  status: 'IDENTIFICADA' | 'SIMULADA' | 'SOLICITADA' | 'APROVADA' | 'APLICADA_SAP' | 'REJEITADA'
  evaluated_by_user_id?: string
  created?: string
  updated?: string
}

export interface MPWorkflowApproval {
  id: string
  approval_code: string
  approval_type: ApprovalType
  entity_ref_id: string
  entity_ref_code?: string
  title: string
  description?: string
  block_number?: string
  original_application?: string
  new_application?: string
  dimensional_classification?: string
  requires_engineering_quality_approval?: boolean
  requires_production_approval?: boolean
  stage_pcp_status: StageApprovalStatus
  stage_pcp_user_id?: string
  stage_pcp_user_name?: string
  stage_pcp_notes?: string
  stage_pcp_date?: string
  stage_quality_status: StageApprovalStatus
  stage_quality_user_id?: string
  stage_quality_user_name?: string
  stage_quality_notes?: string
  stage_quality_date?: string
  stage_production_status: StageApprovalStatus
  stage_production_user_id?: string
  stage_production_user_name?: string
  stage_production_notes?: string
  stage_production_date?: string
  overall_status: OverallApprovalStatus
  ai_recommendation_summary?: string
  created?: string
  updated?: string
}

export interface MPApplicationAuditHistory {
  id: string
  event_code: string
  plan_id?: string
  plan_version?: number
  center_code: string
  block_number: string
  heat_number?: string
  letter_code?: string
  material_code?: string
  supplier_code?: string
  original_application: string
  previous_application?: string
  new_application: string
  thickness_mm?: number
  width_mm?: number
  length_mm?: number
  weight_kg?: number
  reason_code: string
  reason_description: string
  user_registration_matricula: string
  user_name: string
  user_id?: string
  event_timestamp: string
  ai_score_at_time?: number
  scenario_chosen?: string
  was_human_override?: boolean
  human_override_justification?: string
  approvers_summary?: string
  sap_status_code?: string
  created?: string
  updated?: string
}

export interface MPPlannedVsRealized {
  id: string
  comparison_code: string
  plan_code: string
  plan_version?: number
  block_number?: string
  line_code?: string
  execution_date?: string
  planned_weight_kg?: number
  realized_weight_kg?: number
  planned_thickness_mm?: number
  realized_thickness_mm?: number
  planned_width_mm?: number
  realized_width_mm?: number
  planned_length_mm?: number
  realized_length_mm?: number
  planned_yield_pct?: number
  realized_yield_pct?: number
  planned_scrap_kg?: number
  realized_scrap_kg?: number
  planned_leftover_kg?: number
  realized_leftover_kg?: number
  planned_application?: string
  executed_application?: string
  final_product_conformance?: 'CONFORME' | 'DESVIO_MENOR' | 'NAO_CONFORME' | 'SUCATA'
  deviation_analysis?: string
  feedback_to_ai_model?: Record<string, any>
  created?: string
  updated?: string
}

export interface MPSapIntegrationQueueItem {
  id: string
  queue_code: string
  plan_code: string
  plan_version: number
  center_code: string
  material_code: string
  batch_number?: string
  heat_number?: string
  block_number?: string
  original_application: string
  new_application: string
  original_dimensions_json?: { thickness: number; width: number; length: number; weight: number }
  result_dimensions_json?: { thickness: number; width: number; length: number; weight: number }
  cutting_plan_json?: any
  weights_and_losses_json?: {
    input_kg: number
    output_kg: number
    leftover_kg: number
    scrap_kg: number
    yield_pct: number
  }
  line_code?: string
  schedule_reference?: string
  integration_lifecycle_stage:
    | 'PLANO_APROVADO'
    | 'ENVIADO_AO_SAP'
    | 'PROCESSADO_SAP'
    | 'ORDEM_GERADA'
    | 'EM_EXECUCAO'
    | 'CONCLUIDO'
    | 'ERRO_INTEGRACAO'
  sap_bapi_rfc_function?: string
  sap_order_number?: string
  sap_response_documents?: Record<string, any>
  sap_messages?: string
  sap_error_details?: string
  approved_by_user_id?: string
  approved_by_user_name?: string
  dispatched_at?: string
  processed_at?: string
  created?: string
  updated?: string
}

export interface MPOptimizationParameters {
  id: string
  config_key: string
  profile_name: string
  weight_yield: number
  weight_demand_fulfillment: number
  weight_cost_reduction: number
  weight_scrap_minimization: number
  weight_reutilization: number
  weight_critical_mp_preservation: number
  weight_rupture_risk: number
  weight_future_schedule_adherence: number
  weight_dimensional_conformance: number
  weight_quality_compliance: number
  default_kerf_mm: number
  default_margin_trim_mm: number
  is_active_default?: boolean
  updated_by_user_id?: string
  created?: string
  updated?: string
}

export interface AIScoreComponent {
  value: number
  weight: number
  contribution: number
}

export interface AIScoreBreakdown {
  overall_score: number
  yield_component: AIScoreComponent
  demand_fulfillment_component: AIScoreComponent
  cost_reduction_component: AIScoreComponent
  scrap_minimization_component: AIScoreComponent
  reutilization_component: AIScoreComponent
  critical_mp_preservation_component: AIScoreComponent
  rupture_risk_component: AIScoreComponent
  schedule_adherence_component: AIScoreComponent
  dimensional_conformance_component: AIScoreComponent
  quality_compliance_component: AIScoreComponent
}

export interface ScenarioDetail {
  scenario_type: CuttingScenarioType
  name: string
  description: string
  total_plates_used: number
  total_weight_tons: number
  yield_pct: number
  scrap_pct: number
  reusable_leftover_pct: number
  cost_estimate_brl: number
  potential_savings_brl: number
  orders_covered_count: number
  demands_covered_pct: number
  critical_mp_preserved_count: number
  risk_score: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  requires_approval: boolean
  approval_reason?: string
  score_ia: number
  bottleneck_impact?: any
  pieces_generated: CutPieceResult[]
}

// ============================================================================
// NOVAS ENTIDADES DOS SUBTÓPICOS 4 A 8
// ============================================================================

// 4. Projeções de MP por Aço / Cadeia Completa
export interface SteelProjectionSummary {
  steelGrade: string
  shape: MPShape
  totalAvailableTons: number
  ksAvailableTons: number
  otherDepotsTons: number
  slabsTons: number // Placas
  billetsTons: number // Palanquilhas
  bloomsTons: number // Tarugos
  otherShapesTons: number
  unrestrictedTons: number
  qualityControlTons: number
  blockedTons: number
  operationalAvailableTons: number
  // Consumo programado
  programmedL1Tons: number
  programmedL2Tons: number
  totalProgrammedConsumptionTons: number
  monthlyAverageConsumptionTons: number
  // Entradas
  confirmedReceiptsTons: number
  transitOrdersTons: number
  projectedIntermedProdTons: number
  // Saldo projetado
  projectedBalanceTons: number
  minStockLimitTons: number
  // Metodologia 1: Excel
  excelCoverageMonths: number
  excelCoverageDays: number
  excelRuptureDate: string
  // Metodologia 2: Motor Diário
  dailyRuptureDate: string
  dailyRuptureDays: number
  methodDiffDays: number
  // Cadeia MP -> Semiacabado -> Acabado
  finishedSemiStockTons: number
  finishedMonthlyDemandTons: number
  finishedCoverageMonths: number
  finishedRuptureDate: string
  totalChainCoverageDays: number
  totalChainCoverageMonths: number
  totalChainEndDate: string
  riskLevel: RiskTrafficLight
  dataSourceInfo: {
    source: string
    lastUpdated: string
    isOfficial: boolean
  }
}

// Simulação de Compras (Compra Objetivada)
export interface SimulatedPurchaseItem {
  id: string
  steelGrade: string
  shape: MPShape
  dimension: string
  quantityTons: number
  supplierName: string
  expectedArrivalDate: string
  notes?: string
}

// 5. Destinos e Lotes
export interface MPDestinationItem {
  id: string
  batch_number: string
  material_code: string
  material_text?: string
  steel_grade: string
  mp_shape: MPShape
  storage_location: string
  storage_name?: string
  qty_unrestricted_tons: number
  qty_quality_tons?: number
  qty_blocked_tons?: number
  qty_total_tons: number
  destination_type: DestinationType
  destination_name: string
  client_name?: string
  client_code?: string
  application_code?: string
  physical_location?: string
  status?: string
  is_leftover?: boolean
  leftover_age_days?: number
  qty_reserved_tons?: number
  qty_committed_tons?: number
  qty_effectively_free_tons?: number
  coverage_days?: number
  data_source?: string
  last_sync_date?: string
  created?: string
  updated?: string
}

export interface MPBatchClassificationHistory {
  id: string
  batch_number: string
  material_code: string
  change_type: string
  previous_destination?: string
  current_destination?: string
  previous_steel?: string
  current_steel?: string
  previous_application?: string
  current_application?: string
  previous_tons?: number
  current_tons?: number
  delta_tons?: number
  changed_at: string
  responsible_user_or_system: string
  alert_severity?: 'INFO' | 'AVISO' | 'CRITICO'
  notes?: string
  created?: string
  updated?: string
}

// 6. Níveis de Estoque — Aços Especiais
export interface MPSpecialSteelRow {
  id: string
  scenario_name: string
  dimension_pool: string // 525 kg, 510 kg, 533, 472, 480, 540...
  steel_class: string // A, B, C, D, AC, 1020, 1045, 1522...
  steel_grade: string
  period_ref: string
  date_str: string
  shift_code?: string // T1, T2, T3
  initial_stock_tons: number
  receptions_tons?: number
  l2_production_tons?: number
  l2_useful_production_tons?: number
  l2_factor_applied?: number
  scheduled_consumption_tons: number
  final_stock_tons: number
  min_stock_limit_tons?: number
  is_rupture?: boolean
  created?: string
  updated?: string
}

// 7. Saldo MP L1 e Previsão de Consumo
export interface MPL1RequirementRow {
  id: string
  steel_grade: string
  dimension_desc: string
  stock_ks_tons: number
  stock_dp07_tons: number
  stock_dp04_tons: number
  stock_other_depots_tons: number
  ks_cut_tons: number
  l2_production_weekly_tons: number
  po_supplier_balance_tons: number
  l1_schedule_weekly_tons: number
  total_consumption_tons: number
  projected_balance_tons: number
  min_stock_tons: number
  need_produce_l2_tons: number
  need_l2_week?: string
  need_l2_deadline?: string
  impacted_l1_orders_json?: string[]
  auto_status: L1AutoStatus
  human_observation?: string
  physical_location_summary?: string
  suppliers_breakdown_json?: Array<{
    supplier: string
    poNumber: string
    orderedTons: number
    receivedTons: number
    balanceTons: number
    expectedDate: string
    delayDays: number
  }>
  created?: string
  updated?: string
}

// 8. Utilização e Substituição de MP
export interface MPUtilizationItem {
  id: string
  order_number: string
  period_week?: string
  period_month?: string
  period_year?: number
  product_code: string
  product_description?: string
  produced_tons: number
  mp_consumed_code: string
  mp_consumed_tons: number
  steel_grade: string
  origin_group?: string // Arcelor, Vallourec, Ciafal, Faca, Aço Especial, Fura Forno, Aço Comercial B/C/D, A, 1020 L2...
  supplier_name?: string
  hot_charging_tons?: number
  cold_charging_tons?: number
  charging_type?: 'QUENTE' | 'FRIO' | 'MISTO'
  standard_mp_rule?: string
  could_be_ac?: boolean
  could_be_a?: boolean
  should_be_1020?: boolean
  is_substitute_application?: boolean
  substitution_category?: string // '1020 no lugar de AC', '1020 MPI no lugar de AC', '1020 L2 no lugar de AC'...
  deviation_detected?: boolean
  deviation_impact_tons?: number
  deviation_reason?: string
  observation?: string
  created?: string
  updated?: string
}

export interface MPGovernanceParameter {
  id: string
  param_key: string
  param_name: string
  param_value: number
  unit?: string
  version: number
  valid_from?: string
  valid_until?: string
  line_target?: string
  source_authority?: string
  responsible_name?: string
  description?: string
  created?: string
  updated?: string
}

// Explicabilidade e Homologação contra Excel Legado
export interface CalculationExplainPayload {
  title: string
  formula: string
  variables: Record<string, number | string>
  stepByStep: string[]
  result: number | string
  resultFormatted: string
  unit: string
  regulatoryStandardRef?: string
  excelLegacyRef?: string
}

export interface ExcelHomologationComparisonItem {
  steelOrMetric: string
  dimensionOrTopic: string
  excelLegacyValue: number | string
  systemCalculatedValue: number | string
  delta: number
  pctDiff: number
  status: 'CONFORME' | 'DIVERGENCIA_JUSTIFICADA' | 'DIVERGENCIA_CRITICA'
  justification: string
  sourceSheet: string
}

// ==========================================
// 9. NOVO TÓPICO: MATÉRIA-PRIMA – INDUSTRIALIZADOR (ARCELOR E DEMAIS CLIENTES)
// ==========================================

export type IndustrializerStatus = 'VERDE' | 'AMARELO' | 'LARANJA' | 'VERMELHO' | 'CINZA'

export type TransitStatus =
  | 'EM_TRANSITO'
  | 'PORTARIA'
  | 'AGUARDANDO_DESCARGA'
  | 'RECEBIDA'
  | 'DISPONIVEL'
  | 'PREPARACAO_KS'
  | 'PRONTA_PRODUCAO'

export type TransitSourceSystem =
  | 'INTEGRACAO_API'
  | 'TMS'
  | 'ARQUIVO_ESTRUTURADO'
  | 'EMAIL_INTEGRADO'
  | 'CONTINGENCIA_MANUAL'

export type ActionStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO'
export type ActionSeverity = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO'

export type CommunicationMode = 'MODO_REVISAO_PCP' | 'MODO_ENVIO_AUTOMATICO'
export type CommunicationApprovalStatus =
  | 'RASCUNHO'
  | 'AGUARDANDO_APROVACAO_PCP'
  | 'APROVADO'
  | 'ENVIADO'
  | 'CANCELADO'

export interface MPIndustrializerContract {
  id: string
  contract_code: string
  client_code: string // Ex: 'ARCELOR'
  client_name: string // Ex: 'ArcelorMittal'
  line_code: string // Ex: 'L1'
  product_group?: string
  metallic_yield_rate: number // Ex: 0.93 (93%)
  monthly_order_avg_tons: number // Ex: 6000
  source_authority: string // Ex: 'Contrato Vigente CIAFAL-Arcelor 2026'
  technical_doc_ref?: string // Ex: 'TB-002 Rev.05'
  version: number
  valid_from?: string
  valid_until?: string
  responsible_name: string
  status: 'ATIVO' | 'EM_REVISAO' | 'HISTORICO'
  schedule_check_routine_days: string // 'SEG_QUA_SEX'
  created?: string
  updated?: string
}

export interface MPIndustrializerMatrixItem {
  id: string
  client_code: string
  client_name: string
  sap_material_code: string // Ex: 'ST930001AI', 'ST950001AI'
  sap_description?: string
  material_family: string
  steel_grade: string
  dimension_section: '130x130' | '150x150' | string
  dimension_display: string
  billet_length_mm?: number
  billet_unit_weight_kg?: number
  standard_depot?: 'DP07' | 'DP18' | 'DP20' | string
  consuming_line: string
  meta_productivity_threshold_th: number // Ex: 18.0 t/h (TB-002)
  eligibility_rule_text?: string
  technical_doc_ref?: string // 'TB-002'
  version?: number
  status: 'ATIVO' | 'INATIVO'
  created?: string
  updated?: string
}

export interface MPIndustrializerInventoryItem {
  id: string
  client_code: string
  center_code: string // 'CFPL'
  dimension_section: '130x130' | '150x150' | string
  steel_grade: string
  dp18_whole_tons: number // Tarugos inteiros
  dp07_cut_ready_tons: number // Tarugos cortados prontos
  dp20_ks_pointed_tons: number // Apontados KS aguardando transferência
  awaiting_unloading_tons: number // Carretas na portaria/descarga
  in_transit_tons: number // Em trânsito
  received_tons: number // Quantidade já recebida
  remaining_to_receive_tons: number // Quantidade a receber do plano
  total_physical_ciafal_tons: number // DP18 + DP07 + DP20 + Descarga
  total_ciafal_plus_transit_tons: number // Físico + Trânsito
  data_source_official: string
  last_sync_timestamp?: string
  created?: string
  updated?: string
}

export interface MPIndustrializerTransitItem {
  id: string
  client_code: string
  supplier_mill: string
  material_code?: string
  steel_grade: string
  dimension_section: '130x130' | '150x150' | string
  quantity_tons: number
  vehicle_plate?: string
  invoice_number?: string
  departure_date?: string
  expected_arrival_date: string
  status: TransitStatus
  source_system: TransitSourceSystem
  driver_info?: string
  notes?: string
  created?: string
  updated?: string
}

export interface MPIndustrializerCommunication {
  id: string
  communication_code: string
  client_code: string
  subject: string
  mode: CommunicationMode
  approval_status: CommunicationApprovalStatus
  approved_by_user?: string
  approved_at?: string
  sent_at?: string
  recipients_roles_json: {
    comercial: boolean
    pcp: boolean
    estoque: boolean
    industria: boolean
  }
  recipients_emails_json?: string[]
  schedule_version_ref?: string
  ai_summary_text?: string
  full_body_html?: string
  rupture_detected?: boolean
  rupture_date?: string
  linked_to_meeting_minutes?: boolean
  meeting_minutes_id?: string
  created?: string
  updated?: string
}

export interface MPIndustrializerAction {
  id: string
  action_code: string
  client_code: string
  origin_trigger: 'RUPTURA_MP' | 'ATRASO_TRANSITO' | 'REVISAO_L1' | 'DESVIO_RENDIMENTO' | string
  action_type:
    | 'CONFIRMAR_TRANSITO'
    | 'ANTECIPAR_RECEBIMENTO'
    | 'REVISAR_L1'
    | 'REVISAR_KS'
    | 'MP_ALTERNATIVA'
    | 'COMUNICAR_COMERCIAL'
    | 'COMUNICAR_INDUSTRIA'
    | 'EVENTO_CRM'
  title: string
  description?: string
  responsible_name: string
  target_deadline?: string
  status: ActionStatus
  severity: ActionSeverity
  impacted_tons?: number
  impacted_orders_json?: string[]
  evidence_notes?: string
  crm_event_dispatched?: boolean
  control_tower_synced?: boolean
  created?: string
  updated?: string
}

export interface MPIndustrializerSnapshot {
  id: string
  snapshot_code: string
  client_code: string
  snapshot_date: string
  schedule_version?: string
  physical_stock_tons: number
  transit_stock_tons: number
  projected_consumption_tons: number
  projected_balance_tons: number
  predicted_rupture_date?: string
  requested_tons?: number
  effective_received_tons?: number
  outcome_status?:
    | 'RUPTURA_EVITADA'
    | 'RUPTURA_OCORRIDA'
    | 'AJUSTE_PROGRAMACAO'
    | 'EM_MONITORAMENTO'
  accuracy_score_pct?: number
  notes?: string
  created?: string
  updated?: string
}

export interface MPIndustrializerScheduleRow {
  date: string
  week: string
  order_number: string
  product_code: string
  product_name: string
  steel_grade: string
  meta_productivity_th: number // Meta t/h (ex: 22.5 > 18 -> aceita 130 ou 150)
  programmed_quantity_tons: number
  metallic_yield_applied: number // Ex: 0.93
  required_mp_tons: number // programmed_quantity_tons / yield
  standard_billet: '130x130' | '150x150'
  authorized_alternative_billet?: '130x130' | '150x150'
  allocated_billet: '130x130' | '150x150'
  balance_before_tons: number
  consumption_tons: number
  balance_after_tons: number
  transit_available_date?: number
  operational_status:
    | 'DISPONIVEL_AREA'
    | 'DEPENDENTE_DESCARGA'
    | 'DEPENDENTE_TRANSITO'
    | 'DEPENDENTE_CORTE_KS'
    | 'ATENCAO'
    | 'FALTA_DE_MP'
  observation: string
  is_rupture: boolean
  impacted_hours?: number
}

export interface MPIndustrializerDimensionSummary {
  dimension: '130x130' | '150x150' | string
  supplied_monthly_target_tons: number
  in_transit_tons: number
  received_tons: number
  received_pct: number
  to_receive_tons: number
  dp18_tons: number
  dp07_tons: number
  dp20_tons: number
  awaiting_unloading_tons: number
  total_physical_ciafal_tons: number
  programmed_consumption_week_tons: number
  need_week_current_tons: number
  programmed_consumption_total_tons: number
  physical_plus_transit_tons: number
  projected_balance_tons: number
  accumulated_received_tons: number
  total_need_tons: number
  status: IndustrializerStatus
}

export interface MPIndustrializerKpis {
  raw_material_availability_pct: number // Ex: 94.2%
  need_fulfillment_pct: number // Ex: 96.8%
  ruptures_count_month: number // Ex: 0
  lost_production_hours_mp: number // Ex: 0 h
  lost_production_tons_mp: number // Ex: 0 t
  transit_eta_accuracy_pct: number // Ex: 91.5%
  rupture_prediction_accuracy_pct: number // Ex: 98.2%
  requested_vs_received_ratio_pct: number // Ex: 95.0%
  avg_alert_lead_time_days: number // Ex: 6.4 dias
  schedule_dependent_on_transit_pct: number // Ex: 18.5%
  occurrences_prevented_after_alert_pct: number // Ex: 92.0%
}

// ==========================================
// 10. NOVO TÓPICO: MATÉRIA-PRIMA – SIDERCENTRO (SDC)
// ==========================================

export type SdcSteelConclusion =
  | 'ESTOQUE_ADEQUADO'
  | 'ESTOQUE_ABAIXO_MINIMO'
  | 'PRODUCAO_L2_NECESSARIA'
  | 'PRODUCAO_PREVISTA_SUFICIENTE'
  | 'DEPENDENTE_PRODUCAO_L2'
  | 'DEPENDENTE_RECEBIMENTO'
  | 'RISCO_RUPTURA'
  | 'SEM_COBERTURA'
  | 'MATERIAL_ALTERNATIVO_DISPONIVEL'
  | 'REVISAR_PROGRAMACAO'

export type SdcOwnershipType = 'SIDERCENTRO' | 'CIAFAL' | 'COMPARTILHAVEL' | 'TERCEIROS'
export type SdcStockCategory =
  | 'PROPRIO_SDC'
  | 'CIAFAL_ELEGIVEL'
  | 'KS_ELEGIVEL'
  | 'RECLASSIFICAVEL'
  | 'BLOQUEADO'

export interface MPSdcStockSource {
  id: string
  company_code: 'CIAFAL' | 'SIDERCENTRO_SDC' | 'KS' | string
  company_name: string
  plant_center: string // 'CFPL', 'SDC1', 'KS01'
  storage_deposit: string // 'DS03', 'DP04', 'DP07', 'DP18', 'DP20', 'KS_DEP'
  deposit_description?: string
  operation_type:
    | 'ESTOQUE_SDC'
    | 'ESTOQUE_CIAFAL'
    | 'ESTOQUE_KS'
    | 'PLACAS_FINAS'
    | 'SUCATA_UTILIZAVEL'
    | 'ENTRADAS_PROGRAMADAS'
  mp_owner: SdcOwnershipType
  stock_type: SdcStockCategory
  utilization_rule?: string // 'LIBERADO_SDC', 'AVALIACAO_TECNICA', 'CESSAO_RESTRITA'
  valid_from?: string
  valid_until?: string
  is_active: boolean
  created?: string
  updated?: string
}

export interface MPSdcPool {
  id: string
  pool_code: string // 'POOL_AC_B', 'POOL_A_C', 'POOL_AC_1020', 'POOL_AC_IF_Z', 'POOL_A_C_1020', 'POOL_A_B_C'
  pool_name: string
  participating_steels_json: string[] // ['AC', 'Classe B']
  participating_classes_json?: string[]
  target_line?: string // 'L1', 'L2', 'SDC_CORTE_DOBRA', 'TODAS'
  target_product_family?: string
  substitution_rule_description: string
  consumption_priority_json: string[]
  technical_restrictions?: string
  requires_quality_validation?: boolean
  valid_from?: string
  valid_until?: string
  is_active: boolean
  created?: string
  updated?: string
}

export interface MPSdcMinStockParameter {
  id: string
  company_code: string // 'SIDERCENTRO_SDC'
  operation_code: string // 'CORTE_DOBRA', 'LAMINACAO'
  steel_grade?: string // 'AC', '1020', '1045', '1522', 'IF', etc.
  steel_class?: string
  pool_code?: string
  line_code?: string
  min_stock_tons: number
  reorder_point_tons?: number
  valid_from?: string
  valid_until?: string
  responsible_name: string
  justification_origin: string
  rule_source_authority?: string
  version?: number
  is_active: boolean
  created?: string
  updated?: string
}

export interface MPSdcDailyConsumption {
  id: string
  consumption_date: string
  week_ref: string // 'W34'
  steel_grade: string
  steel_class?: string
  pool_code?: string
  programmed_tons: number
  realized_tons?: number
  variance_tons?: number
  need_origin: 'PROGRAMACAO_OFICIAL_PCP' | 'ORDEM_SAP_PP' | 'AJUSTE_SDC' | string
  production_order_ref?: string
  sap_order_ref?: string
  yielding_rate_applied?: number
  scrap_loss_rate?: number
  compatible_steels_json?: string[]
  allocated_steel?: string
  status: 'PROGRAMADO' | 'EM_CORTE' | 'CONSUMIDO' | 'REMARCADO' | string
  created?: string
  updated?: string
}

export interface MPSdcL2PlannedVsRealized {
  id: string
  period_ref: string // 'W34', '2026-08'
  steel_grade: string
  steel_class?: string
  planned_l2_tons: number
  realized_l2_tons: number
  deviation_tons: number
  adherence_pct: number
  useful_yield_factor?: number
  useful_tons_for_sdc: number
  availability_date?: string
  impact_on_sdc_coverage_days?: number
  traffic_light: 'VERDE' | 'AMARELO' | 'LARANJA' | 'VERMELHO'
  operational_risk_summary?: string
  human_notes?: string
  is_official_sync?: boolean
  created?: string
  updated?: string
}

export interface MPSdcSteelMatrixRow {
  steel_grade: string // 'AC', 'Classe A', 'Classe B', 'Classe C', 'Classe D', 'Classe Z', 'FX', '1522', '1524', '1020', '1045', 'IF', 'Total'
  steel_class: string
  pool_code?: string
  stock_sdc_ds03_tons: number
  stock_ciafal_dp04_tons: number
  stock_ciafal_eligible_tons: number
  stock_ks_tons: number
  stock_thin_plates_tons: number
  stock_usable_scrap_sdc_tons: number
  expected_receipts_tons: number
  total_stock_tons: number
  projected_l2_useful_tons: number
  projected_consumption_sdc_tons: number
  projected_balance_tons: number
  min_stock_tons: number
  need_mp_tons: number
  statistical_coverage_days: number
  chronological_coverage_date: string
  rupture_risk_level: RiskTrafficLight
  auto_conclusion: SdcSteelConclusion
  human_comment?: string
  eligible_alternatives_json?: string[]
  drilldown_batches_count?: number
}

export interface MPSdcRuptureAlert {
  id: string
  steel_grade: string
  steel_class?: string
  pool_code?: string
  week_ref: string
  estimated_date: string
  missing_quantity_tons: number
  needed_l2_production_tons: number
  impacted_orders: string[]
  recommended_action: string
  severity: 'CRITICO' | 'ALTO' | 'MEDIO'
}

export interface MPSdcCockpitKpis {
  stock_sdc_tons: number
  stock_ciafal_eligible_tons: number
  stock_ks_eligible_tons: number
  stock_usable_scrap_tons: number
  expected_entries_tons: number
  projected_l2_prod_tons: number
  programmed_sdc_consumption_tons: number
  projected_balance_tons: number
  steels_below_min_count: number
  first_rupture_date: string
  first_rupture_steel: string
  avg_coverage_days: number
  total_mp_need_tons: number
  l2_adherence_pct: number
}

/**
 * Tipos e Interfaces para o Submódulo de Planejamento e Otimização Dimensional de Matéria-Prima (PCP Robotizado CIAFAL)
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

export type MPItemType = 'PLACA' | 'BLOCO' | 'PECA' | 'SOBRA_REUTILIZAVEL' | 'RETALHO' | 'PARCIAL'

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
  original_application: string
  current_application: string
  thickness_mm: number
  width_mm: number
  length_mm: number
  weight_kg: number
  item_type: MPItemType
  sap_block_status: SapBlockStatus
  reservation_status: ReservationStatus
  dimensional_classification: DimensionalClassification
  is_critical?: boolean
  criticality_reason?: string
  origin_parent_id?: string
  reception_date?: string
  cut_date?: string
  physical_balance_status?: string
  possible_applications_json?: string[]
  alternative_applications_json?: string[]
  next_demand_schedule?: string
  line_destination_code?: string
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
  risk_score: 'BAIXO' | 'MEDIO' | 'ALTO'
  requires_approval: boolean
  approval_reason?: string
  score_ia: number
  pieces_generated: CutPieceResult[]
}

export interface AIScoreBreakdown {
  overall_score: number
  yield_component: { value: number; weight: number; contribution: number }
  demand_fulfillment_component: { value: number; weight: number; contribution: number }
  cost_reduction_component: { value: number; weight: number; contribution: number }
  scrap_minimization_component: { value: number; weight: number; contribution: number }
  reutilization_component: { value: number; weight: number; contribution: number }
  critical_mp_preservation_component: { value: number; weight: number; contribution: number }
  rupture_risk_component: { value: number; weight: number; contribution: number }
  schedule_adherence_component: { value: number; weight: number; contribution: number }
  dimensional_conformance_component: { value: number; weight: number; contribution: number }
  quality_compliance_component: { value: number; weight: number; contribution: number }
}

export interface AIExplanation {
  headline: string
  why_chosen: string
  historical_precedents_summary: string
  similar_cases_count: number
  successful_conforming_cases: number
  average_historical_yield_pct: number
  confidence_pct: number
  human_approval_mandatory: boolean
  sensitivity_analysis: {
    best_case: string
    probable_case: string
    worst_case: string
  }
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
  ai_score_breakdown_json?: AIScoreBreakdown
  ai_explanation_json?: AIExplanation
  scenarios_comparison_json?: Record<string, ScenarioDetail>
  cutting_layout_items_json?: {
    kerf_mm: number
    margin_trim_mm: number
    plates: {
      plate_id: string
      block_number: string
      dimensions: { thickness: number; width: number; length: number; weight: number }
      pieces: CutPieceResult[]
    }[]
  }
  demands_covered_json?: Array<{
    order_number: string
    customer_name: string
    product_code: string
    required_tons: number
    allocated_tons: number
  }>
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

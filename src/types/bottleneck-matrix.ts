// Tipos TypeScript para Matriz de Gargalos e Motor de Restrições Produtivas Integradas CIAFAL

export type ProductionStageType =
  | 'MP'
  | 'FORNO'
  | 'DESBASTE'
  | 'TREM_CONTINUO'
  | 'TESOURA_TR2'
  | 'TCC_RESFRIAMENTO'
  | 'ENDIREITAMENTO'
  | 'EMPACOTAMENTO'
  | 'GERAL_LINHA'

export type ConstraintLevel = 'HARD_CONSTRAINT' | 'SOFT_CONSTRAINT' | 'SAFETY_CONSTRAINT'
export type ConstraintStatus = 'APPROVED' | 'VIOLATED' | 'WARNING' | 'NOT_APPLICABLE'

export type PlanFeasibilityClassification =
  | 'VERDE_RECOMENDADO' // Atende integralmente a Matriz e tem boa eficiência global
  | 'AMARELO_POSSIVEL_COM_RESSALVA' // Atende Hard Constraints, possui Soft Constraints que exigem bypass
  | 'VERMELHO_INVIAVEL' // Viola Hard Constraint ou Restrição de Segurança (NÃO EXECUTÁVEL)
  | 'CINZA_DADOS_INSUFICIENTES' // Faltam parâmetros técnicos na Lista Mestra

export interface StageCapacityBreakdown {
  stage: ProductionStageType
  stageName: string
  theoretical_capacity_th: number
  operational_capacity_th: number
  effective_capacity_th: number
  cycle_time_seconds: number
  utilization_pct: number
  speed_m_s?: number
  is_bottleneck: boolean
  is_secondary_bottleneck: boolean
  limiting_factors: string[]
}

export interface LineBottleneckMatrixRecord {
  id: string
  line_id: string
  line_code: string
  material_code?: string
  product_family?: string
  profile_shape?: string
  gauge_dimension?: string
  steel_grade?: string
  billet_section_mm?: number
  billet_length_m?: number
  billet_weight_kg?: number
  route_code?: string
  passes_count?: number
  veins_count?: number

  // Capacidades por Etapa (t/h)
  furnace_capacity_th: number
  roughing_capacity_th: number
  continuous_mill_capacity_th: number
  shear_tr2_capacity_th: number
  cooling_bed_tcc_capacity_th: number
  straightener_capacity_th: number
  packaging_capacity_th: number

  // Gargalo Dinâmico
  primary_bottleneck_stage: ProductionStageType
  primary_bottleneck_rate_th: number
  secondary_bottleneck_stage: ProductionStageType
  secondary_bottleneck_rate_th: number
  bottleneck_gap_th: number

  // Restrições Técnicas
  max_tcc_bar_length_m: number
  max_tcc_bars_per_rack: number
  min_bar_interval_seconds: number
  max_crop_end_weight_kg: number
  standard_furnace_temp_c?: number
  thermal_curve_type?: 'QUENTE' | 'FRIO' | 'MORNO'

  version: number
  status: 'VIGENTE' | 'EM_REVISAO' | 'SUPERSEDED' | 'RASCUNHO'
  reference_doc: string
  source_authority: string
  responsible_name: string
  approver_name: string
  valid_from?: string
  valid_until?: string
  notes?: string
  raw_parameters_json?: Record<string, unknown>
  created?: string
  updated?: string
}

export interface LineProcessConstraint {
  id: string
  line_code: string
  rule_code: string
  title: string
  stage: ProductionStageType
  constraint_level: ConstraintLevel
  parameter_key: string
  min_limit?: number
  max_limit?: number
  target_value?: number
  unit: string
  bypass_allowed: boolean
  bypass_authority_required?: string
  failure_message: string
  source_doc: string
  active: boolean
  version: number
}

export interface ConstraintValidationResult {
  rule_code: string
  title: string
  stage: ProductionStageType
  constraint_level: ConstraintLevel
  parameter_key: string
  permitted_range_display: string
  actual_value: number | string
  unit: string
  status: ConstraintStatus
  is_hard_violation: boolean
  is_safety_violation: boolean
  message: string
  source_doc: string
  bypass_allowed: boolean
  bypass_authority_required?: string
  difference_display?: string
}

export interface DynamicBottleneckCalculationResult {
  line_code: string
  product_code: string
  gauge: string
  steel: string
  billet_section_mm: number
  billet_length_m: number
  billet_weight_kg: number

  stages: StageCapacityBreakdown[]

  primary_bottleneck: {
    stage: ProductionStageType
    stageName: string
    capacity_th: number
    drum_ratio: number
  }
  secondary_bottleneck: {
    stage: ProductionStageType
    stageName: string
    capacity_th: number
  }
  gap_to_secondary_th: number

  // Análise TOC / DBR
  drum_stage: string
  buffer_required_hours: number
  rope_cadence_th: number
  starvation_risk: 'BAIXO' | 'MEDIO' | 'ALTO'
  blocking_risk: 'BAIXO' | 'MEDIO' | 'ALTO'
  oee_bottleneck_expected_pct: number
  operational_robustness: 'ALTA' | 'MEDIA' | 'BAIXA'
  robustness_details: string
}

export interface CuttingPlanBottleneckImpact {
  plan_id: string
  plan_name: string
  classification: PlanFeasibilityClassification
  classification_label: string
  classification_color: 'emerald' | 'amber' | 'rose' | 'slate'

  // Gargalo antes e depois do corte
  bottleneck_before: {
    stage: ProductionStageType
    stageName: string
    capacity_th: number
  }
  bottleneck_after: {
    stage: ProductionStageType
    stageName: string
    capacity_th: number
  }
  bottleneck_migrated: boolean
  migration_explanation: string

  // Throughput e tempos globais
  throughput_before_th: number
  throughput_after_th: number
  throughput_delta_th: number
  hours_for_batch_500t: number
  batch_hours_delta: number

  // Multi-critério Score
  score_global: number
  score_components: {
    yield_component: { value: number; contribution: number }
    throughput_component: { value: number; contribution: number }
    bottleneck_utilization: { value: number; contribution: number }
    tcc_safety_margin: { value: number; contribution: number }
    scrap_component: { value: number; contribution: number }
    demand_fulfillment: { value: number; contribution: number }
    operational_robustness: { value: number; contribution: number }
  }

  // Validações da Matriz de Gargalos
  constraints_validations: ConstraintValidationResult[]
  hard_constraints_violated_count: number
  soft_constraints_warning_count: number
  safety_constraints_violated_count: number

  // Explicabilidade IA
  ai_choice_reasoning: {
    why_chosen: string
    what_discarded: string
    trade_off_analysis: string
    operational_risks: string
  }
}

export interface PcpTestRequest {
  id: string
  request_code: string
  company_code?: string
  line_code: string
  material_code?: string
  product_description?: string
  mp_block_number?: string
  proposed_application?: string
  test_quantity_tons: number
  estimated_test_hours?: number
  test_parameters_json?: Record<string, unknown>
  bottleneck_matrix_snapshot?: Record<string, unknown>
  expected_throughput_gain_pct?: number
  technical_risks?: string
  justification?: string
  status:
    | 'SOLICITADO'
    | 'EM_AVALIACAO_ENGENHARIA'
    | 'APROVADO_PARA_TESTE'
    | 'TESTE_EXECUTADO'
    | 'HOMOLOGADO'
    | 'REJEITADO'
  requester_name: string
  engineering_evaluator_name?: string
  engineering_parecer?: string
  mes_actual_result_json?: Record<string, unknown>
  created?: string
}

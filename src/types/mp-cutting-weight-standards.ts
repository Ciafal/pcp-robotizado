export type MPCuttingType = 'BLOCOS' | 'MULTIPLOS'
export type MPToleranceType = 'KG' | 'PERCENT'
export type MPStandardPriority = 'ALTA' | 'MEDIA' | 'BAIXA'
export type MPStandardStatus = 'ATIVO' | 'INATIVO'

export interface MPCuttingWeightStandard {
  id?: string
  code: string // Sequencial automático ex: "PAD-001"
  description: string
  cutting_type: MPCuttingType
  company_code: string
  center_codes: string[] // Múltiplos centros permitidos
  material_codes: string[] // Seleção múltipla de MP
  steel_family?: string
  target_weight_kg: number
  min_weight_kg: number
  max_weight_kg: number
  tolerance_lower_val: number
  tolerance_lower_type: MPToleranceType
  tolerance_upper_val: number
  tolerance_upper_type: MPToleranceType
  priority: MPStandardPriority
  start_date: string // ISO YYYY-MM-DD
  end_date?: string | null // ISO YYYY-MM-DD
  status: MPStandardStatus
  technical_notes?: string
  created?: string
  updated?: string
  created_by_user_name?: string
  updated_by_user_name?: string
}

export type MPOptimizationCriterion =
  | 'MAIOR_APROVEITAMENTO'
  | 'MENOR_SUCATA'
  | 'MAIOR_ATENDIMENTO_PADROES'
  | 'MENOR_QUANTIDADE_CORTES'
  | 'MELHOR_EQUILIBRIO'

export interface MPCuttingOptimizationFilters {
  company_code: string
  center_code: string
  cutting_type: 'BLOCOS' | 'MULTIPLOS' | 'AMBOS'
  material_code: string
  steel_family?: string
  selected_standard_codes: string[] // Seleção múltipla de padrões
  target_weight_kg?: number | null
  min_weight_kg?: number | null
  max_weight_kg?: number | null
  required_quantity?: number | null
  required_weight_tons?: number | null
  optimization_criterion: MPOptimizationCriterion
  // Parâmetros manuais ajustados com permissão do usuário
  manual_adjustment_active?: boolean
  manual_adjustment_notes?: string
}

export interface MPCuttingScenarioItem {
  id: string
  name: string
  cutting_type: MPCuttingType
  used_standard_code: string
  used_standard_description: string
  target_weight_kg: number
  min_allowed_weight_kg: number
  max_allowed_weight_kg: number
  calculated_weight_kg: number
  deviation_kg: number
  deviation_pct: number
  produced_quantity: number
  input_weight_kg: number
  used_weight_kg: number
  used_weight_pct: number // Rendimento de aproveitamento
  estimated_leftover_kg: number
  cutting_loss_kg: number // Perda de corte (apara, carepa, serra)
  yield_pct: number
  demand_fulfillment_pct: number
  status: 'VIÁVEL' | 'INVIÁVEL'
  inviability_reason?: string
  // Detalhamento industrial da composição
  composition: {
    pieces_count: number
    piece_nominal_weight_kg: number
    total_cuts_count: number
    nominal_length_mm?: number
    gauge_dimension?: string
    density_kg_m3?: number
    linear_mass_kg_m?: number
    cutting_width_mm?: number
    theoretical_loss_pct?: number
    distribution: Array<{
      item_index: number
      item_type: 'BLOCO' | 'MÚLTIPLO'
      target_kg: number
      calculated_kg: number
      tolerance_range_kg: string
      status: 'CONFORME' | 'DESVIO'
    }>
    satisfied_restrictions: string[]
    industrial_alerts: string[]
    technical_justification: string
  }
}

export interface MPCuttingSimulationResult {
  id?: string
  simulation_code: string
  company_code: string
  center_code: string
  material_code: string
  cutting_type: string
  optimization_criterion: MPOptimizationCriterion
  required_quantity?: number | null
  required_weight_tons?: number | null
  selected_standard_codes: string[]
  filter_parameters_snapshot: MPCuttingOptimizationFilters
  scenarios: MPCuttingScenarioItem[]
  best_scenario_id: string
  selected_scenario_id?: string
  status: 'SIMULADO' | 'SELECIONADO' | 'APROVADO_PCP' | 'CANCELADO'
  approved_plan_code?: string
  created_by_user_name?: string
  created?: string
  technical_justification?: string
}

export type MPCuttingType = 'BLOCOS' | 'MULTIPLOS'
export type MPToleranceType = 'TON' | 'PERCENT' | 'KG'
export type MPStandardPriority = 'ALTA' | 'MEDIA' | 'BAIXA'
export type MPStandardStatus = 'ATIVO' | 'INATIVO' | 'PENDENTE_CORRECAO'

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
  // Campos legados de tolerância (mantidos opcionais para compatibilidade com registros existentes no banco)
  tolerance_lower_val?: number
  tolerance_lower_type?: MPToleranceType
  tolerance_upper_val?: number
  tolerance_upper_type?: MPToleranceType
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
  // Seleção de Corrida e Múltiplos (quando Tipo de Corte = BLOCOS)
  selected_heat_number?: string // Corrida selecionada
  selected_multiple_numbers?: string[] // Números dos múltiplos selecionados (sem duplicados)
  // Matéria-Prima e Lote selecionados (obrigatório para Tipo de Corte = MULTIPLOS)
  selected_material_code?: string
  selected_material_description?: string
  selected_batch_number?: string
  selected_batch_available_stock?: number
  selected_batch_unit?: 't' | 'kg'
  selected_center_code?: string
  selected_storage_location?: string
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
      dimension_display?: string
      calculated_length_mm?: number
      width_mm?: number
      height_mm?: number
      gauge_dimension?: string
      linear_mass_kg_m?: number
      heat_number?: string // Corrida de origem (ou undefined / "—" no plano agregado)
      multiple_number?: string // Número do múltiplo de origem (ou undefined / "—")
      batch_code?: string // Lote rastreável
      origin_type?: 'SAP' | 'HOMOLOGACAO' | 'AGREGADO'
    }>
    satisfied_restrictions: string[]
    industrial_alerts: string[]
    technical_justification: string
  }
  // Matéria-prima e Lote utilizados no cenário (Múltiplos / Planos de Corte)
  raw_material_code?: string
  raw_material_description?: string
  batch_number?: string
  batch_initial_stock?: number
  batch_used_quantity?: number
  batch_projected_balance?: number
  batch_unit?: 't' | 'kg'
  storage_location?: string
  center_code?: string
  raw_material_utilization_pct?: number
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
  // Rastreabilidade de MP e Lote na simulação
  raw_material_code?: string
  raw_material_description?: string
  batch_number?: string
  batch_initial_stock?: number
  batch_used_quantity?: number
  batch_projected_balance?: number
  storage_location?: string
  batch_unit?: 't' | 'kg'
}

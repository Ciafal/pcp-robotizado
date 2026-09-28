/**
 * Tipos Oficiais — Matéria-Prima por Aplicação (Ficha Mestra Expandida & Programação Mensal)
 * Módulo PCP Robotizado - HUB Ciafal
 */

export interface LineRawMaterialApplication {
  id: string
  line_id: string
  line_master_id?: string
  center_code: string
  product_code: string
  product_description?: string
  raw_material_code: string // Obrigatório
  raw_material_description?: string
  supplier?: string // Fornecedor
  supplier_id?: string
  application: string // Aplicação / bitola
  bitola_ref?: string
  steel_type?: string
  // Pesos (kg)
  average_weight_kg?: number | null
  max_weight_kg?: number | null
  min_weight_kg?: number | null
  // Comprimentos (m)
  rolled_length_m?: number | null
  multiple_length_m?: number | null
  max_mp_length_m?: number | null
  min_mp_length_m?: number | null
  // Redução calculada
  reduction_ratio_x?: number | null
  reduction_ratio_text?: string | null // ex. "1:5" ou "1:5,00"
  reduction_percentage?: number | null // ex. 80.00
  // Flags de controle técnico
  first_run: boolean // 1ª corrida: Sim/Não
  allow_out_of_standard_mp: boolean // Permitir fora padrão MP: Sim/Não
  // Bloco 7: Tempo Mínimo PCP
  tempo_minimo_pcp_unidade?: 'Minutos' | 'Horas' | 'Dias' | 'Semanas' | string | null
  tempo_minimo_pcp_valor?: number | null
  tempo_minimo_pcp_minutos?: number | null
  status: 'Ativo' | 'Inativo' // Status
  notes?: string
  created_by_user_id?: string
  created_by_user_name?: string
  updated_by_user_id?: string
  updated_by_user_name?: string
  created?: string
  updated?: string
}

export interface RawMaterialApplicationFormData {
  id?: string
  line_id: string
  line_master_id?: string
  center_code: string
  product_code: string
  product_description?: string
  raw_material_code: string
  raw_material_description?: string
  supplier?: string
  supplier_id?: string
  application: string
  bitola_ref?: string
  steel_type?: string
  // Valores numéricos ou string no padrão pt-BR
  average_weight_kg?: number | string | null
  max_weight_kg?: number | string | null
  min_weight_kg?: number | string | null
  rolled_length_m?: number | string | null
  multiple_length_m?: number | string | null
  max_mp_length_m?: number | string | null
  min_mp_length_m?: number | string | null
  reduction_ratio_x?: number | string | null
  reduction_ratio_text?: string | null
  reduction_percentage?: number | string | null
  first_run: boolean
  allow_out_of_standard_mp: boolean
  // Bloco 7: Tempo Mínimo PCP
  tempo_minimo_pcp_unidade?: 'Minutos' | 'Horas' | 'Dias' | 'Semanas' | ''
  tempo_minimo_pcp_valor?: number | string | null
  status: 'Ativo' | 'Inativo'
  notes?: string
}

export interface RawMaterialApplicationValidationErrors {
  raw_material_code?: string
  supplier?: string
  application?: string
  weights?: string
  average_weight_kg?: string
  max_weight_kg?: string
  min_weight_kg?: string
  lengths?: string
  rolled_length_m?: string
  multiple_length_m?: string
  max_mp_length_m?: string
  min_mp_length_m?: string
  reduction?: string
  tempo_minimo_pcp?: string
  duplicate?: string
  general?: string
}

export interface RawMaterialApplicationFilters {
  center_code?: string
  product_code?: string
  raw_material_code?: string
  supplier?: string
  application?: string
  status?: 'Ativo' | 'Inativo' | 'Todos'
  first_run?: 'Sim' | 'Não' | 'Todos'
  allow_out_of_standard_mp?: 'Sim' | 'Não' | 'Todos'
  search?: string
}

/**
 * Registro de Rastreabilidade e Validação para Fase 2 (Programação Mensal)
 */
export interface MonthlyScheduleMpValidation {
  id: string
  schedule_id?: string
  monthly_period?: string
  center_code: string
  product_code: string
  raw_material_code: string
  application: string
  mp_application_id?: string
  line_master_version?: number
  validation_result:
    | 'APPROVED'
    | 'REJECTED_INACTIVE'
    | 'REJECTED_OUT_OF_STANDARD'
    | 'APPROVED_WITH_EXCEPTION'
  evaluated_parameters_json?: Record<string, unknown>
  exception_used: boolean
  exception_alert_message?: string
  user_id?: string
  user_name?: string
  user_role?: string
  validated_at_formatted?: string
  created?: string
}

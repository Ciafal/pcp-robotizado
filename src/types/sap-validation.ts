/**
 * Tipos e Interfaces do Módulo de Validação Técnica de Cadastro SAP (ZVALIDA)
 * Padrão Corporativo CIAFAL - PCP Robotizado
 */

export type ValidationStatus =
  | 'AGUARDANDO_VALIDACAO'
  | 'EM_VALIDACAO'
  | 'DIVERGENTE'
  | 'AGUARDANDO_CORRECAO_SAP'
  | 'APTO_PARA_APROVACAO'
  | 'VALIDADO'

export type FieldValidationResult = 'APROVADO' | 'DIVERGENTE' | 'NAO_SE_APLICA' | 'NEUTRO'

export type TipoValidacaoCampo =
  | 'COMPARAR_MODELO'
  | 'COMPARAR_PARAMETRO'
  | 'COMPARAR_MODELO_PARAMETRO'
  | 'NEUTRO'

export type DivergenceType =
  | 'NENHUMA'
  | 'OMISSAO_NOVO'
  | 'VALOR_INCORRETO'
  | 'REGRA_VIOLADA'
  | 'NAO_APLICAVEL'
  | 'NEUTRO_INFORMATIVO'

export type ComparisonSource = 'MODELO' | 'PARAMETRO_SISTEMA' | 'REGRA_CONDICIONAL' | 'MANUAL'

export interface SapValidationRule {
  id: string
  group_name: string
  subgroup_name: string
  field_name: string
  sap_table_field: string
  comparison_source: ComparisonSource
  expected_value_rule?: string
  applicability_condition?: string
  is_mandatory: boolean
  order_index: number
  active: boolean
  tipo_validacao?: TipoValidacaoCampo
  observacao?: string
  somente_leitura?: boolean
  parametro?: string
  regra_aplicabilidade?: string
  contexto_ocorrencia?: string
}

export interface SapValidationFieldResult {
  id?: string
  validation_id: string
  group_name: string
  subgroup_name: string
  field_name: string
  sap_table_field: string
  model_value: string
  new_value: string
  expected_value?: string
  validation_result: FieldValidationResult
  tipo_validacao?: TipoValidacaoCampo
  divergence_type?: DivergenceType
  is_blocking?: boolean
  action_plan?: string
  created?: string
  comparado?: boolean
  bloqueia_validacao?: boolean
  gera_divergencia?: boolean
  incluir_percentual?: boolean
  contexto_ocorrencia?: string
  observacao?: string
}

export interface SapMaterialValidationRecord {
  id: string
  validation_code: string
  material_new_code: string
  material_new_desc?: string
  material_model_code: string
  material_model_desc?: string
  center: string
  material_type: string
  responsible_user_name: string
  responsible_user_email?: string
  total_fields_checked: number
  comparable_fields_count?: number
  approved_fields_count: number
  divergent_fields_count: number
  not_applicable_fields_count: number
  neutral_fields_count?: number
  compliance_percentage: number
  overall_status: ValidationStatus
  sap_connection_status: 'OK' | 'INDISPONIVEL' | 'ERRO_AUTENTICACAO'
  revision_number: number
  divergence_resolution_status: 'PENDENTE' | 'PARCIAL' | 'RESOLVIDO'
  completed_at?: string
  created_at_sap?: string
  model_created_at_sap?: string
  sap_sync_alert?: string
  notes?: string
  created: string
  updated: string
}

export interface SapValidationAuditLog {
  id: string
  validation_id: string
  validation_code: string
  material_code: string
  user_name: string
  user_email: string
  action:
    | 'CRIACAO_REVISAO'
    | 'CONSULTA_SAP'
    | 'DETECCAO_DIVERGENCIA'
    | 'ADVERTENCIA_MODELO'
    | 'APROVACAO'
    | 'CONCLUSAO'
    | 'RECONSULTA_SAP'
    | 'CONSULTA_CAMPO_NEUTRO'
  sap_source: string
  rule_result?: string
  justification?: string
  previous_status?: string
  new_status?: string
  created: string
}

export interface SapValidationSummaryCards {
  totalDisplayed: number
  comparableFields: number
  neutralFields: number
  notApplicableFields: number
  approvedFields: number
  divergentFields: number
  compliancePercentage: number
  overallStatus: ValidationStatus
}

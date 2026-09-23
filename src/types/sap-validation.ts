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
  sap_last_queried_at?: string
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
  revision_number?: number
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

export type ValidationOverallStatus = ValidationStatus

export type ModelVisualStatus = 'VERDE' | 'AMARELO' | 'VERMELHO'

export type ModelWarningRule = 'MODEL_LESS_THAN_6_MONTHS' | 'MODEL_NO_MOVEMENTS' | 'FIRST_CHAR_DIFF'

export interface ModelWarning {
  rule: ModelWarningRule | string
  message: string
  detail?: string
}

export interface FcaIntegrationStatus {
  fca_configured: boolean
  matrix_loaded: boolean
  matrix_rules_count?: number
  fca_base_url?: string
  status_message?: string
}

export interface SapMovementSummary {
  last_movement_date?: string
  last_stock_entry?: { date: string; doc?: string }
  last_stock_consumption?: { date: string; doc?: string }
  last_stock_transfer?: { date: string; doc?: string }
  last_invoicing?: { date: string; doc?: string }
  last_send_industrialization?: { date: string; doc?: string }
  last_return_industrialization?: { date: string; doc?: string }
}

export interface SapFetchedMaterialData {
  material_code?: string
  description?: string
  center?: string
  material_type?: string
  price_control?: string
  created_at_sap?: string
  created_by_sap?: string
  modified_at_sap?: string
  modified_by_sap?: string
  raw_fields?: Record<string, unknown>
  movements_summary?: SapMovementSummary
}

export interface FieldComparisonItem extends SapValidationFieldResult {
  expected_parameter_value?: string
  divergence_detail?: string
  rule_applied?: string
}

export interface OfficialValidationGroup {
  id: string
  title: string
  transactionCode: string
  subgroups: string[]
}

export const OFFICIAL_VALIDATION_GROUPS: OfficialValidationGroup[] = [
  {
    id: 'MM03',
    title: 'DADOS MESTRES (MM03)',
    transactionCode: 'MM03',
    subgroups: [
      'Dados básicos 1',
      'Dados básicos 2',
      'Classificação',
      'Vendas: dados org.vendas 1',
      'Vendas: dados org.vendas 2',
      'Vendas: dados gerais/centro',
      'Comércio exterior: exportação',
      'Texto de vendas',
      'Compras',
      'Texto pedido compras',
      'Comércio exterior: importação',
      'MRP 1',
      'MRP 2',
      'MRP 3',
      'MRP 4',
      'Previsão',
      'Dados de centro / armazenagem 1',
      'Dados de centro / armazenagem 2',
      'Gestão de qualidade',
      'Contabilidade 1',
      'Contabilidade 2',
      'Cálculo do preço 1',
      'Cálculo do preço 2',
      'Versões de produção',
    ],
  },
  {
    id: 'CS01',
    title: 'LISTA TÉCNICA (CS01)',
    transactionCode: 'CS01',
    subgroups: ['Cabeçalho da lista', 'Componentes aplicáveis', 'Posições do item'],
  },
  {
    id: 'CA01',
    title: 'ROTEIRO (CA01)',
    transactionCode: 'CA01',
    subgroups: ['Detalhes do cabeçalho', 'Sequências de operações', 'Operações e tempos'],
  },
  {
    id: 'MMSC',
    title: 'DEPÓSITOS (MMSC)',
    transactionCode: 'MMSC',
    subgroups: ['Depósitos autorizados', 'Estoque de centro', 'Estoque especial'],
  },
  {
    id: 'CUSTEIO',
    title: 'CUSTEIO E PREÇOS',
    transactionCode: 'CK11N / CK24',
    subgroups: ['Cálculo de custos planejados', 'Liberação de preço padrão', 'Variância'],
  },
  {
    id: 'COMPLEMENTARES',
    title: 'INFORMAÇÕES COMPLEMENTARES',
    transactionCode: 'DIVERSOS',
    subgroups: ['Parâmetros complementares', 'Campos de usuário Z', 'Observações técnicas'],
  },
]

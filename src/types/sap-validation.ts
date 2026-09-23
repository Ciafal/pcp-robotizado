// Tipos e Interfaces para o Módulo de Validação de Cadastro SAP (PCP Robotizado CIAFAL)

export type ModelVisualStatus = 'VERDE' | 'AMARELO' | 'VERMELHO'

export type ValidationOverallStatus =
  | 'AGUARDANDO_VALIDACAO'
  | 'EM_VALIDACAO'
  | 'DIVERGENTE'
  | 'AGUARDANDO_CORRECAO_SAP'
  | 'APTO_PARA_APROVACAO'
  | 'VALIDADO'

export type FieldValidationResult = 'APROVADO' | 'DIVERGENTE' | 'NAO_SE_APLICA'

export type ComparisonSource = 'MODELO' | 'PARAMETRO_ESPERADO' | 'AMBOS' | 'REGRA_CUSTOM'

export interface ModelWarning {
  rule: 'MODEL_LESS_THAN_6_MONTHS' | 'MODEL_NO_MOVEMENTS' | 'FIRST_CHAR_DIFF'
  message: string
}

export interface SapMaterialMovementSummary {
  last_movement_date?: string
  last_movement_type?: string
  last_movement_desc?: string
  last_stock_entry?: {
    date: string
    movement_type: '101' | '531'
    quantity?: number
    unit?: string
    doc_number?: string
  } | null
  last_stock_consumption?: {
    date: string
    movement_type: '261'
    quantity?: number
    unit?: string
    doc_number?: string
  } | null
  last_stock_transfer?: {
    date: string
    movement_type: '311' | '309'
    quantity?: number
    unit?: string
    doc_number?: string
  } | null
  last_invoicing?: {
    date: string
    movement_type: '601'
    quantity?: number
    unit?: string
    doc_number?: string
  } | null
  last_send_industrialization?: {
    date: string
    movement_type: '541'
    quantity?: number
    unit?: string
    doc_number?: string
  } | null
  last_return_industrialization?: {
    date: string
    movement_type: '121'
    quantity?: number
    unit?: string
    doc_number?: string
  } | null
}

export interface SapFetchedMaterialData {
  material_code: string
  center?: string
  description?: string
  material_type?: string
  created_at_sap?: string
  created_by_sap?: string
  modified_at_sap?: string
  modified_by_sap?: string
  price_control?: string
  valuation_class?: string
  price_determination?: string
  movements_summary?: SapMaterialMovementSummary
  raw_fields?: Record<string, any>
}

export interface FieldComparisonItem {
  id?: string
  group_name: string
  subgroup_name?: string
  field_name: string
  sap_table_field: string
  model_value: string
  new_value: string
  expected_parameter_value?: string
  validation_result: FieldValidationResult
  rule_applied?: string
  divergence_detail?: string
  is_mandatory?: boolean
}

export interface SapMaterialValidationRecord {
  id: string
  validation_code: string
  revision_number: number
  material_new_code: string
  material_model_code: string
  center: string
  material_type: string
  material_new_desc: string
  material_model_desc: string
  price_control: string
  created_at_sap?: string
  created_by_sap?: string
  modified_at_sap?: string
  modified_by_sap?: string
  model_status: ModelVisualStatus
  model_warnings?: ModelWarning[]
  model_justification?: string
  overall_status: ValidationOverallStatus
  total_fields_analyzed: number
  approved_fields_count: number
  divergent_fields_count: number
  not_applicable_fields_count: number
  compliance_percentage: number
  model_movement_data?: SapMaterialMovementSummary
  sap_raw_new?: Record<string, any>
  sap_raw_model?: Record<string, any>
  sap_last_queried_at?: string
  sap_last_queried_by?: string
  started_at?: string
  completed_at?: string
  responsible_user_id?: string
  responsible_user_name?: string
  responsible_user_email?: string
  is_latest_revision?: boolean
  previous_validation_id?: string
  created: string
  updated: string
}

export interface SapValidationAuditLog {
  id: string
  validation_id?: string
  validation_code: string
  revision_number: number
  user_id?: string
  user_name: string
  user_email: string
  user_role?: string
  action:
    | 'INICIO_VALIDACAO'
    | 'SELECAO_CODIGO_MODELO'
    | 'CONSULTA_SAP'
    | 'ADVERTENCIA_MODELO'
    | 'JUSTIFICATIVA_MODELO'
    | 'COMPARACAO_EXECUTADA'
    | 'DETECCAO_DIVERGENCIA'
    | 'RECONSULTA_SAP'
    | 'APROVACAO'
    | 'CONCLUSAO'
    | 'CRIACAO_REVISAO'
  material_code?: string
  previous_value?: string
  new_value?: string
  sap_source?: string
  rule_result?: string
  justification?: string
  previous_status?: string
  new_status?: string
  details?: Record<string, any>
  correlation_id?: string
  created: string
  updated: string
}

export interface FcaIntegrationStatus {
  fca_configured: boolean
  fca_base_url: string | null
  matrix_loaded: boolean
  matrix_rules_count: number
  functional_message_when_unavailable: string
  matrix_pending_message: string
}

// Estrutura de grupos oficiais e seus subgrupos pré-definidos (arquitetura pronta)
export interface MasterDataAccordionGroup {
  id: string
  title: string
  transactionCode: string
  subgroups: string[]
}

export const OFFICIAL_VALIDATION_GROUPS: MasterDataAccordionGroup[] = [
  {
    id: 'MM03',
    title: 'DADOS MESTRES – MM03',
    transactionCode: 'MM03',
    subgroups: [
      'Dados básicos 1',
      'Dados adicionais/Unidade de medida',
      'Dados básicos 2',
      'Classificação',
      'Níveis organizacionais',
      'SD: Organização de vendas 1',
      'SD: Organização de vendas 2',
      'SD: Dados gerais/Centro',
      'Comércio exterior: exportação',
      'Texto SD',
      'Compras',
      'Comércio exterior: importação',
      'MRP 1',
      'MRP 2',
      'MRP 3',
      'MRP 4',
      'Versões de produção',
      'Esquematização de trabalho',
      'Dados centro/armazenamento',
      'Administração de depósitos',
      'Administração da qualidade',
      'Contabilidade 1',
      'Contabilidade 2',
      'Cálculo do preço 1',
      'Cálculo do preço 2',
    ],
  },
  {
    id: 'CS01',
    title: 'LISTA TÉCNICA (CS01)',
    transactionCode: 'CS01',
    subgroups: [
      'Utilização da lista técnica',
      'Dados básicos',
      'Status',
      'Atribuições',
      'Componentes aplicáveis',
    ],
  },
  {
    id: 'CA01',
    title: 'ROTEIRO (CA01)',
    transactionCode: 'CA01',
    subgroups: ['Detalhes do cabeçalho', 'Síntese das operações'],
  },
  {
    id: 'MMSC',
    title: 'DEPÓSITOS (MMSC)',
    transactionCode: 'MMSC',
    subgroups: ['Depósitos por Centro', 'Regras de Armazenagem'],
  },
  {
    id: 'CUSTEIO',
    title: 'CONTROLE / CUSTEIO (CK11N / CK24)',
    transactionCode: 'CK11N / CK24',
    subgroups: ['Cálculo de Custo', 'Liberação de Preço'],
  },
  {
    id: 'COMPLEMENTARES',
    title: 'VALIDAÇÕES COMPLEMENTARES',
    transactionCode: 'ZVAR',
    subgroups: ['CU41', 'ZCOIND', 'VD53', 'ZBITOLAS', 'ZPPT_08', 'ZPPMP'],
  },
]

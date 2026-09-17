/**
 * Tipos e Contratos Estruturados para Integração SGQ (Informação Documentada),
 * Extração por IA e Validação de Regras Documentais no PCP Robotizado.
 */

import { SgqDocumentStatus, SgqInterferenceCategory } from '@/services/sgq-document-provider'

export type RuleType =
  | 'OBRIGATORIA'
  | 'PROIBICAO'
  | 'LIMITE'
  | 'PARAMETRO_TECNICO'
  | 'RECOMENDACAO'
  | 'INFORMATIVA'

export type RuleStatus = 'ATIVA' | 'DESATIVADA' | 'REVISAO_NECESSARIA' | 'PENDENTE_VALIDACAO'

export interface StructuredDocumentRule {
  rule_id: string
  document_id: string
  document_code: string
  revision: string
  category: SgqInterferenceCategory
  rule_type: RuleType
  condition: string
  action_or_restriction: string
  value?: number | string
  unit?: string
  priority: number // 1 (crítica) a 5 (informativa)
  source_excerpt: string // Trecho original do documento obrigatório (guardrail)
  page_or_section: string
  confidence_level: number // 0.0 a 1.0
  processed_at: string
  status: RuleStatus
  requires_human_review: boolean
  human_reviewed_at?: string
  human_reviewer?: string
  ai_interpretation?: string
  // Parâmetros específicos para os motores
  product_from?: string
  product_to?: string
  target_material?: string
  target_gauge?: string
  min_value?: number
  max_value?: number
  setup_minutes?: number
  cadence_th?: number
}

export interface DocumentAnalysisResult {
  document_id: string
  document_code: string
  revision: string
  analyzed_at: string
  mode: 'AI_AGENT' | 'DETERMINISTIC_HOMOLOGATION'
  rules: StructuredDocumentRule[]
  summary: {
    total: number
    mandatory: number
    prohibitions: number
    limits: number
    parameters: number
    recommendations: number
    informative: number
    needsReview: number
  }
}

export interface DocumentValidationResult {
  passed: boolean
  blocking_violations_count: number
  warnings_count: number
  recommendations_count: number
  rules_considered_count: number
  considered_documents: Array<{
    document_code: string
    revision: string
    title: string
    rules_count: number
  }>
  rules_satisfied: Array<{
    rule_id: string
    document_code: string
    revision: string
    category: SgqInterferenceCategory
    rule_type: RuleType
    description: string
    item_id?: string
  }>
  mandatory_violations: Array<{
    rule_id: string
    document_code: string
    revision: string
    category: SgqInterferenceCategory
    rule_type: RuleType
    description: string
    source_excerpt: string
    item_id?: string
    product_code?: string
    sequence_order?: number
    date_str?: string
    impact_description: string
    recommended_action: string
  }>
  recommendations: Array<{
    rule_id: string
    document_code: string
    revision: string
    category: SgqInterferenceCategory
    description: string
    source_excerpt: string
    item_id?: string
    applied?: boolean
    dismissed?: boolean
    action_label: string
  }>
  parameters_used: Array<{
    rule_id: string
    document_code: string
    parameter: string
    value: any
    unit?: string
    item_id?: string
  }>
  conflicts: Array<{
    parameter: string
    source_a: {
      name: string
      value: any
      document_code?: string
      revision?: string
    }
    source_b: {
      name: string
      value: any
      document_code?: string
      revision?: string
    }
    item_id?: string
    product_code?: string
    description: string
  }>
}

export interface ScheduleItemDocumentImpact {
  document_code: string
  revision: string
  rule_id: string
  category: SgqInterferenceCategory
  rule_type: RuleType
  interference_title: string
  source_excerpt: string
  impact_realized: string
  original_url?: string
}

export interface DocumentRulesSnapshot {
  snapshot_id: string
  created_at: string
  user_email: string
  user_name: string
  schedule_code: string
  version_number: number
  documents_considered: Array<{
    document_code: string
    revision: string
    rules_count: number
  }>
  rules_applied: StructuredDocumentRule[]
  violations: Array<any>
  recommendations: Array<any>
  conflicts: Array<any>
  validation_outcome: 'APROVADO' | 'APROVADO_COM_RESSALVAS' | 'BLOQUEADO'
}

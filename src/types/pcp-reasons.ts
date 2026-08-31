export interface PCPReasonFamily {
  id: string
  code: string
  name: string
  description?: string
  icon_name?: string
  color?: string
  sort_order?: number
  active: boolean
  created?: string
  updated?: string
}

export interface PCPChangeReason {
  id: string
  code: string // ex: "MP-001"
  family_id: string
  family_code: string
  family_name: string
  name: string
  description?: string
  severity: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  source_type: string // ex: "SAP MM / WMS"
  related_modules: string // ex: "SAP,WMS,MES"
  change_types_allowed?: string
  allows_date_change: boolean
  allows_sequence_change: boolean
  allows_quantity_change: boolean
  allows_line_change: boolean
  allows_shift_change: boolean
  require_comment: boolean
  require_evidence: boolean
  require_approval: boolean
  criticality: 'NORMAL' | 'ATENCAO' | 'CRITICA' | 'BLOQUEANTE'
  notify_mes: boolean
  notify_crm: boolean
  notify_tms: boolean
  notify_pcm: boolean
  notify_roll_shop: boolean
  generate_sgq_occurrence: boolean
  generate_action_plan: boolean
  count_as_reprogram_cause: boolean
  created_by_name?: string
  updated_by_name?: string
  active: boolean
  created?: string
  updated?: string
}

export interface PCPVersionDiffItem {
  id: string
  schedule_code: string
  line_code: string
  previous_version_code: string
  current_version_code: string
  previous_version_id?: string
  current_version_id?: string
  entity_type: string // "SCHEDULE_ITEM"
  entity_id?: string
  material_code: string
  material_description?: string
  change_type: 'INCLUIDO' | 'ALTERADO' | 'REMOVIDO'
  field:
    | 'DATA'
    | 'HORARIO'
    | 'TURNO'
    | 'SEQUENCIA'
    | 'QUANTIDADE'
    | 'PRODUTO'
    | 'TIPO_PEDIDO'
    | 'OP_SAP'
    | 'OUTRO'
  field_name_pt: string
  old_value: string
  new_value: string
  delta_numeric?: number
  delta_display?: string
  relevance: 'BAIXA' | 'MEDIA' | 'ALTA'
  customer_affected?: string
  sales_order?: string
  sap_op_affected?: string
  diff_payload?: Record<string, unknown>
  created?: string
  updated?: string
}

export type EvidenceStatusType =
  | 'SYSTEM_CONFIRMED'
  | 'PARTIAL_EVIDENCE'
  | 'EXTERNAL_UNAVAILABLE'
  | 'HUMAN_ONLY'

export interface PCPChangeJustification {
  id: string
  schedule_code: string
  line_code: string
  shift_name?: string
  period_display?: string
  version_from: string
  version_to: string
  reason_id: string
  reason_code: string
  reason_name: string
  family_code: string
  family_name: string
  specific_cause: string // Causa específica / complemento (Nível 3)
  justification: string // Justificativa detalhada
  leadership_notes?: string // Notas adicionais para a liderança
  ai_generated: boolean
  ai_confidence: number // 0-100
  ai_suggested_reason_code?: string
  ai_suggested_reason_name?: string
  human_decision: 'ACCEPTED' | 'EDITED' | 'REJECTED' | 'MANUAL'
  evidence_status: EvidenceStatusType
  impact_hours?: number
  impact_tons?: number
  impact_orders_count?: number
  impact_customers_count?: number
  related_modules?: string
  created_by_id?: string
  created_by_name: string
  created_by_email?: string
  created_by_role?: string
  evidences?: PCPChangeEvidence[]
  created?: string
  updated?: string
}

export type SystemSourceType =
  | 'SAP'
  | 'WMS'
  | 'MES'
  | 'AOM'
  | 'PCM'
  | 'QUALIDADE'
  | 'CRM'
  | 'TMS'
  | 'OFICINA_CILINDROS'
  | 'FICHA_MESTRE'
  | 'MATRIZ_GARGALO'
  | 'MOTOR_REGRAS'

export interface PCPChangeEvidence {
  id?: string
  justification_id?: string
  source_system: SystemSourceType
  source_entity: string
  source_reference: string
  evidence_type: string
  description: string
  old_value?: string
  new_value?: string
  confidence_score: number
  evidence_timestamp?: string
  raw_payload?: Record<string, unknown>
  created?: string
}

export interface PCPAIReprogrammingSuggestion {
  id?: string
  diff_id?: string
  suggested_reason_code: string
  suggested_reason_name: string
  suggested_family_code: string
  suggested_family_name?: string
  confidence: number // 0-100
  explanation: string
  evidences: PCPChangeEvidence[]
  human_action?: 'PENDING' | 'ACCEPTED' | 'EDITED' | 'REJECTED'
  external_status_note?: string
}

export interface PCPReasonCluster {
  id: string
  cluster_code: string
  proposed_name: string
  proposed_code?: string
  proposed_family_code: string
  proposed_family_name: string
  occurrence_count: number
  similarity_score: number
  impact_hours: number
  impact_tons: number
  recurring_terms: string[]
  sample_justifications: string[]
  affected_lines: string[]
  status: 'PROPOSED' | 'APPROVED' | 'MERGED' | 'REJECTED'
  approved_reason_code?: string
  merged_into_reason_code?: string
  reviewed_by_name?: string
  reviewed_at?: string
  notes?: string
  created?: string
  updated?: string
}

export interface CauseAnalysisMetrics {
  totalAlterations: number
  schedulesChanged: number
  pctSchedulesUnchanged: number
  pctAlterationsJustified: number
  pctAiSuggested: number
  pctAiAccepted: number
  pctAiCorrected: number
  pctAiEdited: number
  pctAiRejected: number
  aiAvgConfidence: number
  aiCoveragePct: number
  alterationsHumanOnly: number
  totalHoursImpacted: number
  totalTonsImpacted: number
  totalOrdersImpacted: number
  totalCustomersImpacted: number
  stabilityIndex: number // IEP
  stabilityLabel: string
  paretoByFamily: Array<{
    code: string
    name: string
    count: number
    impactHours: number
    impactTons: number
    pct: number
  }>
  paretoByReason: Array<{
    code: string
    name: string
    family: string
    count: number
    impactHours: number
    impactTons: number
    pct: number
  }>
  paretoByLine: Array<{ line: string; count: number; impactHours: number; impactTons: number }>
  paretoByTurno: Array<{ turno: string; count: number; impactHours: number }>
  paretoByProduct: Array<{
    product: string
    count: number
    impactHours: number
    impactTons: number
  }>
  paretoByCustomer: Array<{
    customer: string
    count: number
    impactHours: number
    impactTons: number
  }>
  monthlyTrends: Array<{
    month: string
    total: number
    justified: number
    iep: number
    mp: number
    prd: number
    mnt: number
    set: number
    com: number
  }>
  topRisingCauses: Array<{ reason: string; growthPct: number; currentCount: number }>
}

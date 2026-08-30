import { WeeklyScheduleItem } from './weekly-schedule'

export type ScheduleRelevanceLevel = 'BAIXA' | 'MEDIA' | 'ALTA'

export type ChangeReasonExact =
  | 'disponibilidade de MP'
  | 'atraso upstream'
  | 'manutenção'
  | 'parada corretiva'
  | 'problema de qualidade'
  | 'prioridade comercial'
  | 'pedido MTO'
  | 'alteração de carteira'
  | 'disponibilidade de equipamento'
  | 'produtividade'
  | 'reprogramação operacional'
  | 'solicitação comercial'
  | 'alteração de prazo'
  | 'outro'

export const CHANGE_REASONS_LIST: ChangeReasonExact[] = [
  'disponibilidade de MP',
  'atraso upstream',
  'manutenção',
  'parada corretiva',
  'problema de qualidade',
  'prioridade comercial',
  'pedido MTO',
  'alteração de carteira',
  'disponibilidade de equipamento',
  'produtividade',
  'reprogramação operacional',
  'solicitação comercial',
  'alteração de prazo',
  'outro',
]

export interface RelevanceCriteriaConfig {
  id?: string
  code: string
  name: string
  description?: string
  is_active: boolean
  qty_low_threshold_pct: number // ex: 5
  qty_medium_threshold_pct: number // ex: 15
  date_shift_change_level: ScheduleRelevanceLevel // MEDIA
  date_day_change_level: ScheduleRelevanceLevel // ALTA
  date_week_change_level: ScheduleRelevanceLevel // ALTA
  seq_setup_increase_level: ScheduleRelevanceLevel // MEDIA
  seq_customer_affected_level: ScheduleRelevanceLevel // ALTA
  product_add_remove_level: ScheduleRelevanceLevel // ALTA
  mto_impact_level: ScheduleRelevanceLevel // ALTA
  post_approval_change_level: ScheduleRelevanceLevel // ALTA
  existing_sap_op_change_level: ScheduleRelevanceLevel // ALTA
  updated_by_name?: string
  created?: string
  updated?: string
}

export type DiffChangeType = 'INCLUIDO' | 'ALTERADO' | 'REMOVIDO'

export interface ScheduleItemDiff {
  id: string
  itemId?: string
  materialCode: string
  materialDescription?: string
  changeType: DiffChangeType
  fieldDiffs: Array<{
    field:
      | 'DATA'
      | 'HORARIO'
      | 'TURNO'
      | 'SEQUENCIA'
      | 'QUANTIDADE'
      | 'PRODUTO'
      | 'TIPO_PEDIDO'
      | 'OP_SAP'
    fieldNamePt: string
    previousValue: string
    newValue: string
    highlightColor: 'green' | 'yellow' | 'red'
  }>
  previousItem?: WeeklyScheduleItem
  newItem?: WeeklyScheduleItem
  customerAffected?: string
  salesOrder?: string
  sapOpAffected?: string
  relevance: ScheduleRelevanceLevel
  notes?: string
}

export interface VersionImpactAssessment {
  production: {
    itemsChangedCount: number
    itemsAddedCount: number
    itemsRemovedCount: number
    netTonsDiff: number
    setupDiffMinutes: number
    summary: string
  }
  mes: {
    willNotify: boolean
    lineCode: string
    summary: string
  }
  crm: {
    affectedOrdersCount: number
    affectedCustomersCount: number
    customersList: string[]
    summary: string
    willNotify: boolean
  }
  tms: {
    affectedCount: number
    needsRecalculation: boolean
    summary: string
  }
  sap: {
    existingOpAffectedCount: number
    opNumbers: string[]
    summary: string
    requiresHandling: boolean
  }
  overallRelevance: ScheduleRelevanceLevel
  relevanceReasons: string[]
}

export interface ScheduleVersionRecord {
  id: string
  version_code: string // ex: "PCP-L1-2026-S35-V01"
  schedule_code: string // ex: "WS-L1-2026-W35"
  line_code: string
  year: number
  week_number: number
  version_number: number
  version_tag: string // "V01", "V02"
  previous_version_tag?: string
  previous_version_code?: string
  status: 'DRAFT_REPROGRAMACAO' | 'SIMULADO' | 'APROVADO' | 'PUBLICADO' | 'HISTORICO'
  is_current_published: boolean
  relevance_level: ScheduleRelevanceLevel
  change_reason: ChangeReasonExact | string
  change_notes?: string
  user_id?: string
  user_name: string
  user_email?: string
  snapshot_data: WeeklyScheduleItem[]
  diff_payload: ScheduleItemDiff[]
  impact_summary: VersionImpactAssessment
  governing_parameters_snapshot?: Record<string, any>
  ai_score?: number
  ai_explanation?: string
  mes_dispatched: boolean
  mes_dispatched_at?: string
  mes_ack_status: 'NAO_LIDO' | 'VISUALIZADO' | 'RECONHECIDO'
  crm_dispatched: boolean
  crm_dispatched_at?: string
  tms_dispatched: boolean
  sap_dispatched: boolean
  created?: string
  updated?: string
}

export interface ScheduleMesAlert {
  id: string
  alert_code: string
  programacao_id: string
  version_code: string
  previous_version_tag?: string
  new_version_tag: string
  line_code: string
  line_name?: string
  product_code?: string
  product_description?: string
  sequence_prev?: string
  sequence_new?: string
  qty_prev_tons?: number
  qty_new_tons?: number
  datetime_prev?: string
  datetime_new?: string
  reason: string
  relevance: ScheduleRelevanceLevel
  user_name: string
  user_email?: string
  notes?: string
  diff_items_json?: ScheduleItemDiff[]
  ack_status: 'NAO_LIDO' | 'VISUALIZADO' | 'RECONHECIDO'
  viewed_at?: string
  viewed_by_user?: string
  acknowledged_at?: string
  acknowledged_by_user?: string
  acknowledgment_notes?: string
  is_active_banner: boolean
  created?: string
  updated?: string
}

export interface ScheduleCrmAlert {
  id: string
  alert_code: string
  programacao_id: string
  version_code: string
  sales_order_number: string // ex: "45871/10"
  sales_order_item?: string
  customer_name: string // ex: "ABC Ltda."
  customer_code?: string
  sales_rep_name?: string
  sales_rep_email?: string
  sales_agent_name?: string
  material_code: string // ex: "TR-60x30x2.0"
  material_description?: string
  order_type?: string
  original_promised_date?: string
  previous_production_date?: string
  new_production_date?: string
  previous_dispatch_date?: string
  new_dispatch_date?: string
  previous_delivery_date?: string
  new_delivery_date?: string
  previous_quantity_tons?: number
  new_quantity_tons?: number
  uncovered_quantity_tons?: number
  order_balance_tons?: number
  reason: string
  commercial_impact_summary: string
  ai_commercial_explanation?: string
  tms_recalculation_required: boolean
  tms_new_delivery_estimate?: string
  status: 'PENDENTE' | 'VISUALIZADO_VENDEDOR' | 'REAVALIACAO_SOLICITADA' | 'TRATADO'
  viewed_at?: string
  viewed_by_user?: string
  reevaluation_request_notes?: string
  created?: string
  updated?: string
}

export interface ScheduleTmsEvent {
  id: string
  event_code: string
  programacao_id: string
  version_code: string
  sales_order_number?: string
  customer_name?: string
  destination_city?: string
  destination_state?: string
  material_code: string
  quantity_tons: number
  product_available_datetime: string
  previous_product_available_datetime?: string
  recalculated_shipping_date?: string
  recalculated_delivery_date?: string
  transit_lead_time_days?: number
  carrier_name?: string
  logistics_status?: string
  created?: string
}

export interface ScheduleSapQueueItem {
  id: string
  queue_code: string
  programacao_id: string
  version_code: string
  sap_production_order: string // ex: "1000456789"
  material_code: string
  line_code: string
  sync_action:
    | 'CRIAR_OP'
    | 'ATUALIZAR_DATAS_OP'
    | 'ATUALIZAR_QTD_OP'
    | 'CANCELAR_REPLANEJAR_OP'
    | 'REORGANIZAR_SEQUENCIA'
  status:
    | 'AGUARDANDO_INTEGRACAO_SAP'
    | 'ENVIADO_SAP'
    | 'OP_CONFIRMADA'
    | 'DIVERGENCIA_SAP'
    | 'PROCESSADO_COM_SUCESSO'
  diff_details_json?: any
  sap_response_message?: string
  sap_document_number?: string
  dispatched_at?: string
  confirmed_at?: string
  user_name?: string
  created?: string
}

export interface StabilityIndicators {
  totalRevisionsCount: number
  revisionsPostApprovalCount: number
  highRelevanceRevisionsCount: number
  revisionsByLine: Record<string, number>
  topChangeReasons: Array<{ reason: string; count: number; pct: number }>
  impactedCustomersCount: number
  impactedTonsTotal: number
  mesAckPct: number
  stabilityIndex: number // 0 - 100
  stabilityLabel: 'MUITO ESTÁVEL' | 'ESTÁVEL' | 'ATENÇÃO' | 'INSTÁVEL'
}

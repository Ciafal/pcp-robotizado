import { WeeklyScheduleItem } from './weekly-schedule'

export type ScheduleRelevanceLevel = 'BAIXA' | 'MEDIA' | 'ALTA'

export type ScheduleSapSyncAction =
  | 'CRIAR_OP'
  | 'ATUALIZAR_DATAS_OP'
  | 'ATUALIZAR_QTD_OP'
  | 'CANCELAR_REPLANEJAR_OP'
  | 'REORGANIZAR_SEQUENCIA'

export type ScheduleSapStatus =
  | 'AGUARDANDO_INTEGRACAO_SAP'
  | 'ENVIADO_SAP'
  | 'OP_CONFIRMADA'
  | 'DIVERGENCIA_SAP'
  | 'PROCESSADO_COM_SUCESSO'

export type ScheduleCrmStatus =
  | 'NAO_APLICAVEL'
  | 'GERADO'
  | 'VISUALIZADO_VENDEDOR'
  | 'REAVALIACAO_SOLICITADA'
  | 'EM_TRATAMENTO'
  | 'RESOLVIDO'

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
    details?: string[]
  }
  mes: {
    willNotify: boolean
    lineCode: string
    summary: string
    immediateAttentionItemsCount?: number
    itemsList?: Array<{
      lineCode: string
      productCode: string
      changeType: string
      detail: string
    }>
  }
  crm: {
    affectedOrdersCount: number
    affectedCustomersCount: number
    customersList: string[]
    summary: string
    willNotify: boolean
    deliveryImpactEstimatedDays?: number
    uncoveredTonsTotal?: number
    alertDetails?: Array<{
      customer: string
      salesOrder: string
      material: string
      lineCode: string
      prevDate?: string
      newDate?: string
      prevQty?: number
      newQty?: number
      uncoveredQty?: number
      reductionPct?: number
      prevDelivery?: string
      newDelivery?: string
      reason: string
      commercialImpact: string
    }>
  }
  tms: {
    affectedCount: number
    needsRecalculation: boolean
    summary: string
    plannedLoadsAffectedCount?: number
    shippingDateShifts?: Array<{
      orderNumber: string
      customer?: string
      material?: string
      plannedLoadCode?: string
      oldDate: string
      newDate: string
      oldDeliveryDate?: string
      newDeliveryDate?: string
      shiftDays: number
      transitDays?: number
    }>
  }
  sap: {
    existingOpAffectedCount: number
    opNumbers: string[]
    summary: string
    requiresHandling: boolean
    actions?: Array<{
      sapOp: string
      material: string
      lineCode?: string
      sapQty?: number
      newQty?: number
      sapDate?: string
      newDate?: string
      action: ScheduleSapSyncAction
      impactType?: 'DATA' | 'QUANTIDADE' | 'CANCELAMENTO' | 'SUBSTITUICAO' | 'SEQUENCIA'
      notes: string
    }>
  }
  rawMaterial?: {
    hasImpact: boolean
    ruptureRiskCount: number
    summary: string
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
  id?: string
  alert_code: string
  programacao_id: string
  version_code: string
  line_code?: string
  sales_order_number: string
  sales_order_item?: string
  customer_name: string
  customer_code?: string
  sales_rep_name?: string
  sales_rep_email?: string
  sales_agent_name?: string
  sales_supervisor_name?: string
  material_code: string
  material_description?: string
  order_type: string
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
  reduction_pct?: number
  reason: string
  commercial_impact_summary: string
  ai_commercial_explanation?: string
  ai_customer_message_draft?: string
  tms_recalculation_required?: boolean
  tms_new_delivery_estimate?: string
  has_planned_load?: boolean
  planned_load_code?: string
  status: ScheduleCrmStatus
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
  has_planned_load?: boolean
  planned_load_code?: string
  replan_action_status?:
    | 'REAVALIACAO_NECESSARIA'
    | 'REPLANEJADO'
    | 'MANTIDO_COM_RESSALVA'
    | 'SEM_IMPACTO'
  alert_title?: string
  alert_message?: string
  created?: string
  updated?: string
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
  impact_category?: 'DATA' | 'QUANTIDADE' | 'CANCELAMENTO' | 'SUBSTITUICAO' | 'SEQUENCIA'
  status:
    | 'AGUARDANDO_INTEGRACAO_SAP'
    | 'ENVIADO_SAP'
    | 'OP_CONFIRMADA'
    | 'DIVERGENCIA_SAP'
    | 'PROCESSADO_COM_SUCESSO'
  sap_current_qty_tons?: number
  new_scheduled_qty_tons?: number
  sap_current_date?: string
  new_scheduled_date?: string
  diff_details_json?: any
  sap_response_message?: string
  sap_document_number?: string
  dispatched_at?: string
  confirmed_at?: string
  user_name?: string
  created?: string
  updated?: string
}

export interface StabilityWeights {
  lowPenalty: number
  mediumPenalty: number
  highPenalty: number
  postApprovalPenalty: number
  sapOpPenalty: number
  mtoPenalty?: number
}

export interface StabilityIndicators {
  totalRevisionsCount: number
  revisionsPostApprovalCount: number
  highRelevanceRevisionsCount: number
  mediumRelevanceRevisionsCount?: number
  lowRelevanceRevisionsCount?: number
  revisionsByLine: Record<string, number>
  topChangeReasons: Array<{ reason: string; count: number; pct: number }>
  impactedCustomersCount: number
  impactedTonsTotal: number
  mesAckPct: number
  stabilityIndex: number // 0 - 100
  stabilityLabel: 'MUITO ESTÁVEL' | 'ESTÁVEL' | 'ATENÇÃO' | 'INSTÁVEL'
  mtoChangesCount?: number
  dateChangesCount?: number
  qtyChangesCount?: number
  seqChangesCount?: number
  sapOpsImpactedCount?: number
  weeklyScores?: Array<{
    weekNumber: number
    weekLabel: string
    score: number
    changesCount: number
  }>
  deductions?: {
    lowDeduction: number
    mediumDeduction: number
    highDeduction: number
    postApprovalDeduction: number
    sapOpDeduction: number
  }
}

export interface StabilityAiInsights {
  summary: string
  structuralIssues: string[]
  topCauses: Array<{ reason: string; count: number; pct: number; recommendation: string }>
  mtoImpactObservation: string
  productRecurrenceObservation: string
  opportunities: string[]
}

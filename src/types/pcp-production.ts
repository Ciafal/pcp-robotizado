/**
 * MODELO DE DADOS: CONTROLE DE PRODUÇÃO (HUB CIAFAL)
 * Camada gerencial, analítica e de exceção sobre a produção realizada, consumindo dados do MES 4.0.
 * Registra origens: PCP / MES / SAP / IA / USUARIO
 */

export type ProductionDataOrigin = 'PCP' | 'MES' | 'SAP' | 'IA' | 'USUARIO'

export type ProductionVisualStatus =
  | 'NORMAL'
  | 'ATENCAO'
  | 'DESVIO'
  | 'CRITICO'
  | 'AGUARDANDO'
  | 'CONCLUIDO'

export type ProductionOrderStatus =
  | 'PROGRAMADA'
  | 'EM_PRODUCAO'
  | 'PARCIALMENTE_APONTADA'
  | 'CONCLUIDA_FISICAMENTE'
  | 'AGUARDANDO_FECHAMENTO'
  | 'ENCERRADA'
  | 'CANCELADA'

export type ProductionMESStatus =
  | 'NAO_INICIADO'
  | 'EM_EXECUCAO'
  | 'PARADA_OPERACIONAL'
  | 'INTERROMPIDO'
  | 'FINALIZADO_OPERADOR'
  | 'SEM_COMUNICACAO'

export type ProductionSAPStatus =
  | 'CRIADA_LIBERADA'
  | 'INTEGRADA_ZPPT010'
  | 'CONFIRMADA_TOTAL'
  | 'CONFIRMADA_PARCIAL'
  | 'ERRO_INTEGRACAO'
  | 'REJEITADA_SAP'
  | 'FECHADA_TECNICAMENTE'

export type ProductionClosingStatus = 'APTA' | 'PENDENTE_DE_FECHAMENTO' | 'FECHADA' | 'BLOQUEADA'

export type ProductionAIRiskScore = 'NORMAL' | 'ATENCAO' | 'ALTO_RISCO' | 'CRITICO'

export type ProductionPostingStatusMES =
  | 'RECEBIDO'
  | 'EM_PROCESSAMENTO'
  | 'VALIDADO_MES'
  | 'REJEITADO_MES'

export type ProductionPostingStatusSAP =
  | 'RECEBIDO'
  | 'EM_PROCESSAMENTO'
  | 'ENVIADO_SAP'
  | 'PROCESSADO_SAP'
  | 'REJEITADO_SAP'
  | 'AGUARDANDO_CORRECAO'
  | 'CORRIGIDO'
  | 'REPROCESSANDO'

export type ProductionPendencyCriticality = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'

export interface ProductionChecklistItem {
  id: string
  title: string
  status: 'OK' | 'PENDENTE' | 'ERRO'
  detail: string
}

export interface ProductionOrderFlowStep {
  step: 'PCP' | 'MES' | 'APONTAMENTO' | 'SAP' | 'FECHAMENTO'
  label: string
  status: 'CONCLUIDO' | 'EM_ANDAMENTO' | 'PENDENTE' | 'ERRO' | 'BLOQUEADO'
  timestamp?: string
  responsible?: string
  notes?: string
}

export interface ProductionTimelineEvent {
  id: string
  timestamp: string
  title: string
  category:
    | 'PROGRAMACAO'
    | 'APROVACAO'
    | 'CRIACAO_OP'
    | 'LIBERACAO'
    | 'INICIO_PRODUCAO'
    | 'APONTAMENTO'
    | 'PARADA'
    | 'ALTERACAO'
    | 'DEVOLUCAO'
    | 'RETRABALHO'
    | 'FIM_FISICO'
    | 'ENVIO_SAP'
    | 'ERRO_SAP'
    | 'CORRECAO'
    | 'FECHAMENTO'
  description: string
  origin: ProductionDataOrigin
  userOrSystem: string
  payload?: Record<string, unknown>
}

export interface ProductionOrder {
  id: string
  op_number: string
  empresa_code: string
  centro_code: string
  linha_code: string
  work_center: string
  material_code: string
  material_description: string
  family_code: string
  steel_grade: string
  gauge_dimension: string
  product_name: string
  mrp_planner: string
  programming_type: string
  quantity_planned_tons: number
  quantity_produced_tons: number
  quantity_posted_tons: number
  quantity_sap_tons: number
  balance_tons: number
  yield_planned_pct: number
  yield_realized_pct: number
  planned_start_date: string
  planned_end_date: string
  real_start_date: string
  real_end_date: string
  status_op: ProductionOrderStatus
  status_mes: ProductionMESStatus
  status_sap: ProductionSAPStatus
  status_fechamento: ProductionClosingStatus
  visual_status: ProductionVisualStatus
  ai_risk_score: ProductionAIRiskScore
  ai_risk_reason: string
  has_pendency: boolean
  has_deviation: boolean
  deviation_reason: string
  last_posting_at: string
  operator_leader: string
  flow_status_json?: ProductionOrderFlowStep[]
  timeline_json?: ProductionTimelineEvent[]
  checklist_fechamento_json?: ProductionChecklistItem[]
  notes?: string
  created?: string
  updated?: string
}

export interface ProductionPosting {
  id: string
  posting_code: string
  op_number: string
  posting_date: string
  posting_time: string
  empresa_code: string
  centro_code: string
  linha_code: string
  work_center: string
  shift_code: string
  operation_code: string
  posting_type: string
  quantity_tons: number
  unit: string
  operator_name: string
  data_origin: ProductionDataOrigin
  status_mes: ProductionPostingStatusMES
  status_sap: ProductionPostingStatusSAP
  sap_message: string
  sap_document_number: string
  retry_attempts: number
  last_retry_at: string
  has_pendency: boolean
  pendency_reason: string
  required_action: string
  zppt010_payload?: Record<string, unknown>
  created?: string
  updated?: string
}

export interface ProductionClosingPendency {
  id: string
  pendency_code: string
  op_number: string
  centro_code: string
  linha_code: string
  material_code: string
  material_description: string
  problem_category: string
  problem_description: string
  business_impact: string
  responsible_role_or_user: string
  detected_at: string
  pending_duration_text: string
  criticality: ProductionPendencyCriticality
  required_action: string
  resolution_status: 'PENDENTE' | 'EM_TRATAMENTO' | 'CONCILIADO' | 'JUSTIFICADO' | 'ENCERRADO'
  resolution_notes: string
  checklist_item_affected: string
  created?: string
  updated?: string
}

export interface ProductionStop {
  id: string
  stop_code: string
  op_number: string
  linha_code: string
  centro_code: string
  start_datetime: string
  end_datetime: string
  duration_minutes: number
  reason_reported: string
  technical_cause_confirmed: string
  category: string
  maintenance_order_ref: string
  maintenance_note_ref: string
  operator_name: string
  is_open: boolean
  correlation_notes: string
  created?: string
  updated?: string
}

export interface ProductionDeviation {
  id: string
  op_number: string
  centro_code: string
  linha_code: string
  material_code: string
  material_description: string
  deviation_type:
    | 'QUANTIDADE'
    | 'PRODUTIVIDADE'
    | 'RENDIMENTO'
    | 'TEMPO'
    | 'INICIO'
    | 'TERMINO'
    | 'SETUP'
    | 'PARADAS'
    | 'CONSUMO_MP'
    | 'SEQUENCIA'
    | 'ADERENCIA'
  planned_value: number
  realized_value: number
  unit: string
  diff_absolute: number
  diff_pct: number
  tolerance_pct: number
  status: 'NORMAL' | 'ATENCAO' | 'DESVIO' | 'CRITICO'
  probable_cause: string
  business_impact: string
  ai_recommendation: {
    fact: string
    hypothesis: string
    suggested_action: string
  }
}

export interface ProductionZPP01Config {
  id: string
  group_code: string
  group_label: string
  column_code: string
  column_label: string
  center_code: string
  line_code: string
  company_code: string
  is_active: boolean
  order_seq: number
  notes?: string
}

export interface ProductionFiltersState {
  empresa: string
  centro: string
  linha: string
  work_center: string
  dataInicial: string
  dataFinal: string
  turno: string
  op: string
  material: string
  familia: string
  produto: string
  mrpPlanner: string
  tipoProgramacao: string
  statusOp: string
  statusApontamento: string
  statusFechamento: string
  operador: string
  comSemPendencia: 'TODOS' | 'COM_PENDENCIA' | 'SEM_PENDENCIA'
  comSemDesvio: 'TODOS' | 'COM_DESVIO' | 'SEM_DESVIO'
  motivoDesvio: string
  buscaTexto: string
}

export interface ProductionOverviewCardIndicator {
  id: string
  label: string
  value: string | number
  unit?: string
  subtext?: string
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  badge?: string
  filterKey?: string
  filterValue?: string
  recordsCount: number
}

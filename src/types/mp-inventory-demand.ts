export type MPDemandPriority = 'Baixa' | 'Normal' | 'Alta' | 'Urgente'

export type MPDemandStatus =
  | 'Gerada'
  | 'Em inventário'
  | 'Inventário parcial'
  | 'Inventário concluído'
  | 'Cancelada'

export interface MPInventoryGaugeRequirement {
  id?: string
  demand_id?: string
  control_number?: string
  gauge: string
  application: string
  quantity_required: number
  unit_of_measure: string
  suggested_run?: string
  run_stock?: number
}

export interface MPInventoryRunAllocation {
  id?: string
  demand_id?: string
  control_number?: string
  run_number: string
  batch_number?: string
  gauge?: string
  application?: string
  sap_stock_pieces: number
  suggested_pieces: number
  selected_pieces: number
  is_ai_suggested: boolean
  is_manual_override: boolean
  ai_criteria?: string
  ai_justification?: string
  inventoried_pieces?: number
}

export interface MPInventoryEntry {
  id?: string
  demand_id: string
  run_id?: string
  control_number: string
  run_number: string
  gauge: string
  location_wms: string
  pieces_count: number
  entry_date_formatted: string // dd/mm/aaaa hh:mm
  user_id: string
  user_name: string
  user_role: string
  user_profile: string
  notes?: string
  is_active: boolean
  deleted_reason?: string
  deleted_by_name?: string
  deleted_at?: string
}

export type MPAuditEventType =
  | 'DEMANDA_GERADA'
  | 'CONSULTA_SAP'
  | 'RECOMENDACAO_IA'
  | 'ACEITE_IA'
  | 'ALTERACAO_MANUAL_CORRIDAS'
  | 'INVENTARIO_INICIADO'
  | 'LANCAMENTO_ADICIONADO'
  | 'LANCAMENTO_ALTERADO'
  | 'LANCAMENTO_EXCLUIDO_LOGICO'
  | 'SALVAMENTO_PARCIAL'
  | 'INVENTARIO_CONCLUIDO'
  | 'DEMANDA_CANCELADA'

export interface MPInventoryAuditEvent {
  id?: string
  demand_id: string
  control_number: string
  event_type: MPAuditEventType
  event_description: string
  run_number?: string
  location_wms?: string
  pieces_count?: number
  previous_value?: string
  new_value?: string
  origin: 'SAP' | 'IA' | 'USUARIO' | 'SISTEMA'
  result: 'SUCESSO' | 'DIVERGENCIA' | 'PENDENCIA' | 'INFO'
  user_id: string
  user_name: string
  user_role: string
  event_timestamp_formatted: string
  details_json?: any
  created?: string
}

export interface MPInventoryDemand {
  id: string
  control_number: string // INV-AAAA-######
  company: string
  line: string
  center: string
  storage_deposit: string
  material_code: string
  material_description: string
  unit_of_measure: string
  sap_stock: number
  sap_last_sync: string
  sap_query_status: 'ONLINE' | 'HOMOLOGACAO_MOCK' | 'DIVERGENTE'
  priority: MPDemandPriority
  status: MPDemandStatus
  observation?: string
  requester_id: string
  requester_name: string
  requester_role: string
  generation_date_formatted: string // dd/mm/aaaa hh:mm
  total_pieces_required: number
  total_pieces_inventoried: number
  divergence_pieces: number
  divergence_pct: number
  ai_suggestion_payload?: {
    summaryText: string
    recommendations: {
      run_number: string
      stock: number
      suggested_pieces: number
      criteria: string
      justification: string
      batch?: string
      location?: string
    }[]
    safetyFactor: number
    analysisNotes: string
    criteriaWeights?: Record<string, number>
  }
  cancellation_reason?: string
  cancelled_at?: string
  cancelled_by?: string
  concluded_at?: string
  concluded_by?: string
  created?: string
  updated?: string

  // Relacionamentos expandidos
  gauges?: MPInventoryGaugeRequirement[]
  runs?: MPInventoryRunAllocation[]
  entries?: MPInventoryEntry[]
  auditEvents?: MPInventoryAuditEvent[]
}

export interface SAPMaterialQueryResult {
  materialCode: string
  description: string
  unit: string
  center: string
  deposit: string
  stockAvailable: number
  lastSyncFormatted: string
  sourceType: 'SAP_RFC_REAL' | 'HOMOLOGACAO_MOCK'
  runs: {
    runNumber: string
    batch: string
    gauge: string
    stockPieces: number
    storageLocation: string
    receiptDate: string
    wmsZone?: string
    isReserved?: boolean
  }[]
}

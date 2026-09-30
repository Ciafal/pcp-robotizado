export type InventoryDemandPriority = 'Baixa' | 'Normal' | 'Alta' | 'Urgente'

export type InventoryDemandStatus =
  | 'Aberto'
  | 'Gerada'
  | 'Em inventário'
  | 'Parcial'
  | 'Inventário parcial'
  | 'Concluído'
  | 'Inventário concluído'
  | 'Cancelado'
  | 'Cancelada'

export interface DemandMaterialItem {
  id?: string
  demand_id?: string
  control_number?: string
  material_code: string
  material_description?: string
  heat_number?: string
  quantity_tons: number
  calculated_pieces: number
  unit_weight_kg?: number | null
  unit_weight_t?: number | null
  weight_origin?: string
  location_wms?: string
  status?: string
}

export interface InventoryDemand {
  id: string
  control_number: string
  company: string
  line: string
  center: string
  storage_deposit: string
  production_order?: string
  material_code: string
  material_description?: string
  unit_of_measure?: string
  sap_stock?: number
  sap_last_sync?: string
  sap_query_status?: string
  priority: InventoryDemandPriority
  status: InventoryDemandStatus
  observation?: string
  requester_id?: string
  requester_name?: string
  requester_role?: string
  generation_date_formatted?: string
  total_pieces_required?: number
  total_pieces_inventoried?: number
  divergence_pieces?: number
  divergence_pct?: number
  ai_suggestion_payload?: any
  cancellation_reason?: string
  cancelled_at?: string
  cancelled_by?: string
  concluded_at?: string
  concluded_by?: string
  cycle_count?: number
  materials_summary?: DemandMaterialItem[]
  materials?: DemandMaterialItem[]
  gauge?: string
  application?: string
  // Snapshot SAP na conclusão do inventário
  sap_snapshot_balance?: number
  sap_snapshot_at?: string
  sap_snapshot_status?: 'SINCRONIZADO' | 'INDISPONIVEL' | 'CONCILIADO'
  sap_snapshot_divergence?: number
  created?: string
  updated?: string
}

export interface InventoryGauge {
  id: string
  demand_id: string
  control_number: string
  gauge: string
  application: string
  quantity_required: number
  unit_of_measure: string
  suggested_run?: string
  run_stock?: number
  created?: string
  updated?: string
}

export interface InventoryRun {
  id: string
  demand_id: string
  control_number: string
  run_number: string
  batch_number?: string
  gauge?: string
  application?: string
  sap_stock_pieces?: number
  suggested_pieces?: number
  selected_pieces?: number
  is_ai_suggested?: boolean
  is_manual_override?: boolean
  ai_criteria?: string
  ai_justification?: string
  inventoried_pieces?: number
  created?: string
  updated?: string
}

export interface InventoryEntry {
  id: string
  demand_id: string
  run_id: string
  control_number: string
  run_number: string
  gauge?: string
  location_wms: string
  pieces_count: number
  cycle_number?: number
  entry_date_formatted: string
  user_id: string
  user_name: string
  user_role?: string
  user_profile?: string
  notes?: string
  is_active: boolean
  deleted_reason?: string
  deleted_by_name?: string
  deleted_at?: string
  created?: string
  updated?: string
}

export type InventoryAuditEventType =
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
  | 'DEMANDA_REABERTA'

export interface InventoryAuditEvent {
  id: string
  demand_id: string
  control_number: string
  event_type: InventoryAuditEventType
  event_description: string
  run_number?: string
  location_wms?: string
  pieces_count?: number
  previous_value?: string
  new_value?: string
  origin?: string
  result?: string
  user_id?: string
  user_name?: string
  user_role?: string
  event_timestamp_formatted?: string
  details_json?: any
  before_data?: any
  after_data?: any
  created?: string
  updated?: string
}

export interface CreateDemandMaterialInput {
  material_code: string
  material_description?: string
  heat_number?: string
  quantity_tons: number
  calculated_pieces: number
  unit_weight_kg?: number | null
  unit_weight_t?: number | null
  weight_origin?: string
}

export interface CreateDemandPayload {
  company: string
  line: string
  center: string
  storage_deposit: string
  production_order?: string
  material_code?: string
  material_description?: string
  priority: InventoryDemandPriority
  gauge?: string
  application?: string
  run_number?: string
  quantity_required?: number
  unit_of_measure?: string
  observation?: string
  requester_name?: string
  materials?: CreateDemandMaterialInput[]
}

export interface CreateEntryPayload {
  demand_id: string
  run_number: string
  location_wms: string
  pieces_count: number
  gauge?: string
  notes?: string
  // Snapshot SAP na conclusão do inventário
  sap_snapshot_balance?: number
  sap_snapshot_at?: string
}

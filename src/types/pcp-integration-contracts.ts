/**
 * CONTRATOS DE INTEGRAÇÃO OFICIAIS — PCP ROBOTIZADO HUB CIAFAL
 * Módulo: Inventário de Matéria-Prima & Preparação de Tarugos (DP07 / L1)
 *
 * Define formalmente os contratos de dados para:
 * 1. SAP Adapter (Centro, Ordem, Material, Descrição, Lote/Corrida, Depósito, Estoque em toneladas, Peças, UM, Status, Bloqueio, Rastreabilidade)
 * 2. WMS Adapter (Material, Corrida, Depósito, Galpão, Endereço WM, Quantidade física, Situação física, Status, Bloqueio, Reserva, Última movimentação, Rastreabilidade)
 * 3. PCP Adapter (Ordem, Bitola, Horário previsto, Tipo de Enfornamento, Sequência planejada, Necessidade em toneladas e peças)
 * 4. MES Adapter (Disparo de prontidão, Retorno de consumo real e apontamento)
 * 5. Notification Adapter (Central interna de notificações e conectores externos preparados)
 */

// ==========================================
// 1. CONTRATOS SAP
// ==========================================
export interface SapMaterialStockContract {
  center: string // Centro (ex: "FORNOL1" ou "1000")
  production_order: string // Ordem de Produção SAP (ex: "OP-100067068")
  raw_material_code: string // Código do Material (ex: "ST9301045525G")
  raw_material_description: string // Descrição Oficial SAP (ex: "Tarugo 130mm SAE 1020 Aço Carbono")
  heat_number: string // Lote / Corrida (ex: "COR-2026-4412")
  storage_location: string // Depósito (ex: "DP07" ou "DEP01")
  stock_tons: number // Estoque em Toneladas (t)
  pieces_count: number // Quantidade em Peças
  unit_of_measure: string // Unidade de Medida ("t" | "PC")
  sap_status: 'LIBERADO' | 'BLOQUEADO' | 'EM_INSPECAO' | 'RESERVADO'
  is_blocked: boolean // Indicador de Bloqueio de Qualidade
  traceability_code: string // Rastreabilidade do Lote
  last_sync_timestamp: string // Data/Hora da última sincronização
}

// ==========================================
// 2. CONTRATOS WMS
// ==========================================
export interface WmsMaterialLocationContract {
  raw_material_code: string // Código do Material
  heat_number: string // Corrida / Lote
  warehouse: string // Galpão / Depósito (ex: "GALPÃO DP07")
  wm_address: string // Endereço WM (ex: "BOX-04 / RUA 02")
  full_physical_location: string // Localização Completa (ex: "GALPÃO DP07 - RUA 2 / BOX 4")
  quantity_pieces: number // Quantidade Física Localizada
  physical_situation: 'DISPONIVEL' | 'EM_MOVIMENTACAO' | 'AVARIADO' | 'NAO_LOCALIZADO'
  status: 'DISPONIVEL_PREPARACAO' | 'AGUARDANDO_CONFERENCIA' | 'BLOQUEADO' | 'RESERVADO'
  is_blocked: boolean // Material com bloqueio no pátio
  is_reserved: boolean // Material já reservado para outra ordem
  last_movement_at: string // Última movimentação no pátio
  traceability_tag: string // Etiqueta / RFID / Código de Barras WMS
  last_sync_timestamp: string
}

// ==========================================
// 3. CONTRATOS DE ADAPTADORES & STATUS INDIVIDUAL POR CAMPO
// ==========================================
export type AdapterConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'DEGRADED'
  | 'TIMEOUT'
  | 'UNAVAILABLE'
  | 'CONFIG_PENDING'

export interface AdapterHealthInfo {
  adapter_id: 'PCP' | 'SAP' | 'WMS' | 'MES' | 'NOTIFICATION'
  adapter_name: string
  status: AdapterConnectionStatus
  endpoint: string
  timeout_ms: number
  last_sync_at: string | null
  last_error: string | null
  last_error_at: string | null
  latency_ms: number
  consecutive_failures: number
  is_external_credential_required: boolean
  description: string
}

export type FieldDataStatus =
  | 'AVAILABLE_PCP'
  | 'AVAILABLE_DP07'
  | 'AVAILABLE_SYSTEM'
  | 'AVAILABLE_SAP_REALTIME'
  | 'AVAILABLE_SAP_PREVIOUS'
  | 'AVAILABLE_WMS_REALTIME'
  | 'AVAILABLE_WMS_PREVIOUS'
  | 'AWAITING_SAP'
  | 'AWAITING_WMS'
  | 'SAP_UNAVAILABLE'
  | 'WMS_UNAVAILABLE'

export interface FieldSituationInfo {
  origin: 'PCP' | 'SAP' | 'WMS' | 'DP07' | 'Sistema'
  status: FieldDataStatus
  label: string
  sublabel?: string
  last_sync_at?: string | null
  is_previous_data?: boolean
  is_unavailable?: boolean
}

// ==========================================
// 4. LOG TÉCNICO DE INTEGRAÇÃO
// ==========================================
export interface TechnicalIntegrationLog {
  id?: string
  origin_system: 'SAP' | 'WMS' | 'PCP' | 'MES' | 'NOTIFICATION'
  target_system?: string
  operation: string
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'UNAVAILABLE' | 'DEGRADED'
  response_time_ms: number
  records_processed: number
  technical_message: string
  error_details?: string
  endpoint?: string
  payload_snapshot?: Record<string, any>
  user_name?: string
  timestamp: string
}

// ==========================================
// 5. NOTIFICAÇÕES INTERNAS DO HUB
// ==========================================
export interface HubInternalNotification {
  id?: string
  notification_code: string
  target_audience: 'DP07' | 'PCP' | 'ALL' | 'MES'
  type:
    | 'RISCO_ATRASO'
    | 'NOVO_INVENTARIO'
    | 'DIVERGENCIA'
    | 'QTD_INSUFICIENTE'
    | 'MUDANCA_SEQUENCIA'
    | 'MATERIAL_NAO_LOCALIZADO'
    | 'INVENTARIO_PRONTO'
    | 'PROGRAMACAO_ALTERADA'
  title: string
  message: string
  order_number?: string
  material_code?: string
  heat_number?: string
  line?: string
  expected_time?: string
  required_pieces?: number
  inventoried_pieces?: number
  missing_pieces?: number
  action_url?: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  is_read: boolean
  external_dispatch_channels?: {
    email: 'PENDING_INTEGRATION' | 'DISPATCHED' | 'DISABLED'
    teams: 'PENDING_INTEGRATION' | 'DISPATCHED' | 'DISABLED'
    telegram: 'PENDING_INTEGRATION' | 'DISPATCHED' | 'DISABLED'
  }
  timestamp: string
}

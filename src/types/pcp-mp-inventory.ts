/**
 * Tipos e Definições de Domínio para o Tópico:
 * INVENTÁRIO DE MATÉRIA-PRIMA PARA O DP07 — PREPARAÇÃO DE TARUGOS
 * Módulo: PCP Robotizado (CIAFAL)
 */

export type MPInventoryStatus =
  | 'Aguardando Inventário'
  | 'Em Inventário'
  | 'Inventário Parcial'
  | 'Inventário Concluído'
  | 'Divergência Encontrada'
  | 'Aguardando Material'
  | 'Material Bloqueado'
  | 'Preparação em Andamento'
  | 'Pronto para Enfornamento'
  | 'Cancelado'
  | 'Substituído por Nova Versão'

export type MPDataSourceOrigin = 'PCP' | 'SAP' | 'WMS' | 'DP07' | 'Sistema'

export type MPQuickViewFilter =
  | 'TODOS'
  | 'HOJE'
  | 'AMANHA'
  | 'PENDENTES'
  | 'DIVERGENCIAS'
  | 'PRONTOS'
  | 'HISTORICO'

export interface MPInventoryHeader {
  id?: string
  inventory_code: string
  control_key: string // CIAFAL|L1|FORNOL1|Data|Versao
  company: string // CIAFAL
  line: string // L1
  center: string // FORNOL1
  responsible_sector: string // DP07 — Preparação de Tarugos
  schedule_date: string // YYYY-MM-DD ou DD/MM/AAAA
  schedule_version: number
  schedule_code?: string
  programming_type: string // Enfornamento
  enfornamento_type: string // FRIO
  status: MPInventoryStatus
  orders_count: number
  total_tons_required: number
  total_pieces_required: number
  total_pieces_inventoried: number
  divergent_materials_count: number
  pending_materials_count: number
  ready_orders_count: number
  delay_risk_orders_count: number
  generated_at: string
  generated_by: string
  last_updated_at?: string
  last_updated_by?: string
  notification_status?: string
  mes_dispatch_status?: string
  sap_sync_status?: string
  wms_sync_status?: string
  metadata?: Record<string, any>
  created?: string
  updated?: string
}

export interface MPInventoryItem {
  id?: string
  inventory_id: string
  inventory_code: string
  item_control_key: string // CIAFAL|L1|FORNOL1|Data|Versao|Ordem|Material|Corrida
  record_version?: number // Controle de concorrência otimista (OCC)

  // 1. Empresa (Origem: PCP)
  company: string
  // 2. Linha (Origem: PCP)
  line: string
  // 3. Centro (Origem: PCP)
  center: string
  // 4. Data Enfornamento (Origem: PCP)
  enfornamento_date: string
  // 5. Hora Prevista Enfornamento (Origem: PCP)
  expected_enfornamento_time: string
  // 6. Ordem (Origem: PCP/SAP)
  production_order: string
  // 7. Código Matéria-Prima (Origem: SAP)
  raw_material_code: string
  // 8. Descrição Matéria-Prima (Origem: SAP)
  raw_material_description: string
  // 9. Corrida/Lote (Origem: SAP)
  heat_number: string
  // 10. Bitola/Produto Produzido (Origem: PCP/SAP)
  produced_gauge_product: string
  // 11. Tipo de Enfornamento (Origem: PCP)
  enfornamento_type: 'FRIO' | 'QUENTE' | 'INTERCALADO' | 'TAPETE' | 'NORMAL'
  // 12. Estoque SAP (t) (Origem: SAP)
  sap_stock_tons: number
  // 13. Necessidade (t) (Origem: PCP)
  planned_requirement_tons: number
  // 13.1 Necessidade em peças calculada pelo PCP
  planned_pieces_required?: number
  // 14. Nº Peças SAP (Origem: SAP)
  sap_pieces_count: number
  // 15. Localização Física (Origem: WMS)
  wms_physical_location: string
  wms_warehouse?: string
  wms_address?: string
  wms_stock_status?: string
  is_material_blocked: boolean
  is_material_located: boolean

  // 16. Nº Peças Inventariadas (Origem: DP07 - EDITÁVEL)
  dp07_inventoried_pieces?: number | null
  // 17. Divergência Peças (Origem: Sistema = DP07 - SAP)
  pieces_divergence?: number | null
  // 18. Sequência de Enfornamento (Origem: DP07 - EDITÁVEL)
  dp07_enfornamento_sequence?: number | null
  // 19. Status (Origem: Sistema)
  status: MPInventoryStatus
  // 20. Observação (Origem: DP07 - EDITÁVEL)
  dp07_observation?: string
  // 21. Responsável (Origem: Sistema)
  responsible_user?: string
  // 22. Data/Hora Atualização (Origem: Sistema)
  updated_at_timestamp?: string

  // Dados auxiliares de governança e rastreamento
  pcp_planned_sequence: number
  schedule_version: number
  is_active: boolean
  cancelled_reason?: string
  ready_at?: string
  sap_snapshot_data?: Record<string, any>
  wms_snapshot_data?: Record<string, any>
  created?: string
  updated?: string
}

export interface MPInventoryOccurrence {
  id?: string
  occurrence_code: string
  inventory_id: string
  inventory_item_id: string
  production_order: string
  raw_material_code: string
  heat_number: string
  divergence_type:
    | 'PEÇAS_FALTANTES'
    | 'PEÇAS_SOBRANTES'
    | 'MATERIAL_NAO_LOCALIZADO'
    | 'MATERIAL_BLOQUEADO'
    | 'SEQUENCIA_ALTERADA'
  sap_pieces: number
  inventoried_pieces: number
  divergence_pieces: number
  divergence_tons: number
  wms_location: string
  status: 'REGISTRADA_WMS' | 'EM_ANALISE_WMS' | 'RESOLVIDA' | 'BAIXA_AUTORIZADA'
  dp07_observation?: string
  reported_by: string
  reported_at: string
}

export interface MPInventoryHistoryEvent {
  id?: string
  inventory_id: string
  inventory_item_id?: string
  event_type:
    | 'AUTO_GERACAO'
    | 'EDICAO_DP07'
    | 'CONCLUSAO_PREPARACAO'
    | 'NOVA_VERSAO'
    | 'CANCELAMENTO_ITEM'
    | 'NOTIFICACAO_DISPARADA'
    | 'RETORNO_MES'
  user_name: string
  user_id?: string
  schedule_version?: number
  previous_value?: any
  new_value?: any
  divergence_snapshot?: any
  lead_time_seconds?: number
  description: string
  timestamp: string
}

export interface MPInventoryOperationalSummary {
  totalOrders: number
  totalTonsRequired: number
  totalPiecesRequired: number
  totalPiecesInventoried: number
  pendingMaterials: number
  divergentMaterials: number
  readyOrdersCount: number
  delayRiskOrdersCount: number
}

export interface MPInventoryItemAlert {
  type: 'INSUFFICIENT' | 'NOT_LOCATED' | 'BLOCKED' | 'DELAY_RISK' | 'SEQUENCE_DIFF'
  title: string
  description: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  order: string
  material: string
  heat: string
  piecesShort?: number
  tonsShort?: number
  expectedTime?: string
  previousSequence?: number
  newSequence?: number
}

export interface MPInventoryTimelineEntry {
  timestamp: string
  time_display: string // "08:10", "09:03", etc.
  actor: string // "PCP", "Sistema", "João (DP07)", etc.
  title: string
  description: string
  type: 'INFO' | 'ACTION' | 'WARNING' | 'SUCCESS' | 'ALERT'
}

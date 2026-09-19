/**
 * Tipos Oficiais para Derivação de Centros de Produção (HUB CIAFAL)
 * Módulo: Centros e Ficha Mestra
 */

export interface MatklGroupItem {
  matkl: string
  description: string
}

export type DerivationStatus = 'Ativa' | 'Inativa'

export interface CenterDerivationRule {
  id?: string
  center_id?: string
  center_code: string
  source_center_id?: string
  source_center_code: string
  source_center_name?: string
  source_center_sap?: string
  source_center_company?: string
  source_center_line?: string
  matkl_groups: MatklGroupItem[]
  start_date: string // DD/MM/AAAA or YYYY-MM-DD
  end_date?: string // DD/MM/AAAA or YYYY-MM-DD (opcional)
  status: DerivationStatus
  deleted?: boolean
  created_by?: string
  updated_by?: string
  user_id?: string
  created?: string
  updated?: string
}

export interface CenterDerivationAuditEntry {
  center: string
  action: 'criação' | 'edição' | 'ativação' | 'inativação' | 'exclusão'
  rule_summary: string
  previous_value?: string
  new_value?: string
  user_name: string
  timestamp: string // DD/MM/AAAA HH:mm
}

export interface MatklSearchResult {
  items: MatklGroupItem[]
  is_offline: boolean
  last_sync?: string
  message?: string
}

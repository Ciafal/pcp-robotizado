export type BufferPosition = 'Entrada do Centro' | 'Saída do Centro' | 'Entre Centros'

export type BufferType =
  | 'Buffer Físico'
  | 'Buffer Operacional'
  | 'Buffer de Segurança'
  | 'Pulmão de Produção'
  | 'Pulmão Intermediário'

export type BufferUnit = 't' | 'kg' | 'peças' | 'unidades' | 'barras' | 'tarugos' | 'palanquilhas'

export type BufferStatus = 'Ativo' | 'Inativo'

export type BufferStockSource =
  | 'WMS'
  | 'SAP'
  | 'MES 4.0'
  | 'Banco Industrial'
  | 'Sensor'
  | 'Apontamento Manual Controlado'

export type BufferHealthStatus = 'BELOW_MIN' | 'NEAR_MIN' | 'BALANCED' | 'NEAR_MAX' | 'ABOVE_MAX'

export interface BufferSourceConfig {
  deposito?: string
  localizacao?: string
  centro?: string
  campo?: string
  material_familia?: string
  origem?: string
  sensor_id?: string
  tabela_banco?: string
}

export interface LineBufferRecord {
  id: string
  company_id?: string
  company_code: string
  line_id?: string
  line_code: string
  route_id?: string
  route_code: string
  center_code: string
  related_center_code: string
  position: BufferPosition
  buffer_type: BufferType
  unit_of_measure: BufferUnit
  min_capacity: number
  ideal_capacity: number
  max_capacity: number
  alert_lower_limit?: number | null
  alert_upper_limit?: number | null
  status: BufferStatus
  valid_from: string
  valid_until: string
  observation?: string
  stock_source: BufferStockSource
  source_config?: BufferSourceConfig
  created?: string
  updated?: string
}

export interface BufferOperationalStatus {
  bufferId: string
  center_code: string
  related_center_code: string
  route_code: string
  relationLabel: string
  current_stock: number
  unit: BufferUnit
  min_capacity: number
  ideal_capacity: number
  max_capacity: number
  alert_lower_limit?: number | null
  alert_upper_limit?: number | null
  health: BufferHealthStatus
  healthLabel: string
  badgeVariant: 'destructive' | 'warning' | 'success' | 'outline' | 'secondary'
  alertMessage: string
  depletionRisk: boolean
  saturationRisk: boolean
  upstreamBlockRisk: boolean
  downstreamShortageRisk: boolean
  suggestedImpact: string
}

export interface BufferRouteCoverageAnalysis {
  route_code: string
  total_relations: number
  configured_buffers: number
  missing_relations: Array<{ from: string; to: string }>
  is_complete: boolean
  pending_text: string
}

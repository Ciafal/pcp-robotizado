/**
 * Tipos Oficiais para a camada de parametrização de Buffers e Estoque Pulmão
 * na Ficha Mestra de Centros do HUB Industrial Ciafal (PCP Robotizado).
 */

export type CenterBufferType =
  | 'Espaço físico'
  | 'Capacidade máxima da baia'
  | 'Área bloqueada por segurança'
  | 'Bloqueio temporário — Segurança'
  | 'Bloqueio temporário — Manutenção'
  | 'Bloqueio temporário — Obra'

export const OFFICIAL_CENTER_BUFFER_TYPES: CenterBufferType[] = [
  'Espaço físico',
  'Capacidade máxima da baia',
  'Área bloqueada por segurança',
  'Bloqueio temporário — Segurança',
  'Bloqueio temporário — Manutenção',
  'Bloqueio temporário — Obra',
]

export type CenterBufferStatus = 'Ativo' | 'Inativo'

export type CenterBlockStatus = 'Programado' | 'Ativo' | 'Finalizado' | 'Cancelado'

export type CapacityReductionUnit = '%' | 't' | 't/h' | 'quantidade' | 'área indisponível'

export const OFFICIAL_CAPACITY_REDUCTION_UNITS: CapacityReductionUnit[] = [
  '%',
  't',
  't/h',
  'quantidade',
  'área indisponível',
]

export interface CenterBufferRecord {
  id: string
  code: string // BUF-00001
  name: string
  line_id?: string
  center_code: string
  center_name?: string
  description?: string
  status: CenterBufferStatus
  buffer_type: CenterBufferType

  // Campos específicos de Espaço físico
  location_physical?: string
  available_area?: number | null
  unit_of_measure?: string
  operational_capacity?: number | null
  observation?: string

  // Campos de Capacidade máxima da baia
  bay_identification?: string
  max_capacity?: number | null
  recommended_capacity?: number | null
  max_percentage_allowed?: number | null

  // Campos de Bloqueio por segurança e Bloqueios Temporários
  block_reason?: string
  responsible_name?: string
  start_date?: string // Data ou Data/Hora inicial
  expected_release_date?: string // Data/Hora prevista de liberação
  block_status?: CenterBlockStatus

  // Campos específicos de Manutenção e Obra
  related_equipment?: string // PCM / SAP PM
  construction_description?: string

  // Impacto do Buffer na Capacidade
  impacts_capacity?: boolean
  capacity_reduction?: number | null
  capacity_reduction_unit?: CapacityReductionUnit | string
  capacity_impact_start?: string
  capacity_impact_end?: string

  is_deleted?: boolean
  created?: string
  updated?: string
}

export interface SaveCenterBufferInput {
  id?: string
  code?: string
  name: string
  line_id?: string
  center_code: string
  center_name?: string
  description?: string
  status: CenterBufferStatus
  buffer_type: CenterBufferType

  location_physical?: string
  available_area?: number | null
  unit_of_measure?: string
  operational_capacity?: number | null
  observation?: string

  bay_identification?: string
  max_capacity?: number | null
  recommended_capacity?: number | null
  max_percentage_allowed?: number | null

  block_reason?: string
  responsible_name?: string
  start_date?: string
  expected_release_date?: string
  block_status?: CenterBlockStatus

  related_equipment?: string
  construction_description?: string

  impacts_capacity?: boolean
  capacity_reduction?: number | null
  capacity_reduction_unit?: CapacityReductionUnit | string
  capacity_impact_start?: string
  capacity_impact_end?: string
}

export type CenterLungBand = 'VERDE' | 'AMARELO' | 'VERMELHO' | 'ROMPIDO'

export interface CenterLungStockRecord {
  id: string
  code: string // PUL-00001
  name: string
  line_id?: string
  center_code: string
  center_name?: string
  location_deposit?: string // Localização / baia / depósito
  description?: string
  status: 'Ativo' | 'Inativo'

  material_or_group: string
  unit_of_measure: string
  min_stock: number
  ideal_stock: number
  max_stock: number
  max_physical_capacity?: number | null
  min_coverage_hours?: number | null
  ideal_coverage_hours?: number | null
  current_real_stock?: number | null // Leitura futura via SAP/RFC
  observation?: string

  is_deleted?: boolean
  created?: string
  updated?: string
}

export interface SaveCenterLungStockInput {
  id?: string
  code?: string
  name: string
  line_id?: string
  center_code: string
  center_name?: string
  location_deposit?: string
  description?: string
  status: 'Ativo' | 'Inativo'

  material_or_group: string
  unit_of_measure: string
  min_stock: number
  ideal_stock: number
  max_stock: number
  max_physical_capacity?: number | null
  min_coverage_hours?: number | null
  ideal_coverage_hours?: number | null
  current_real_stock?: number | null
  observation?: string
}

/**
 * Classificação operacional dinâmica da faixa do Estoque Pulmão
 * VERDE: estoque entre ideal e máximo (ou dentro da faixa nominal aceitável)
 * AMARELO: sendo consumido, entre mínimo e ideal
 * VERMELHO: abaixo do mínimo operacional (mas maior que zero)
 * ROMPIDO: zero ou insuficiente para proteger o fluxo
 */
export function calculateLungStockBand(
  current: number | null | undefined,
  min: number,
  ideal: number,
  max: number,
): {
  band: CenterLungBand
  label: string
  badgeClass: string
  description: string
} {
  const stock = current != null ? Number(current) : ideal

  if (stock <= 0) {
    return {
      band: 'ROMPIDO',
      label: 'ROMPIDO',
      badgeClass: 'bg-rose-900 text-white border-rose-950 font-bold',
      description: 'Estoque insuficiente/esgotado para proteger o fluxo do Centro',
    }
  }

  if (stock < min) {
    return {
      band: 'VERMELHO',
      label: 'VERMELHO',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      description: 'Abaixo do mínimo operacional — risco de parada',
    }
  }

  if (stock < ideal) {
    return {
      band: 'AMARELO',
      label: 'AMARELO',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
      description: 'Em consumo — abaixo do ideal, exige atenção do PCP',
    }
  }

  return {
    band: 'VERDE',
    label: 'VERDE',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    description: 'Dentro da condição adequada e protegida',
  }
}

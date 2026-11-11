/**
 * Tipos para Tipos de Enfornamento e Separação de Carga
 * HUB CIAFAL - PCP Robotizado - Ficha Mestre Expandida
 */

// Opções EXATAS de Tipo de Enfornamento exigidas pelo PCP:
// Fonte ÚNICA das opções de Tipo de Enfornamento no PCP (Ficha Mestra Expandida).
// Interface sempre em pt-BR com VÍRGULA decimal ("1,3:1" / "1,5:1"); o valor salvo
// em banco é exatamente este rótulo (texto), garantindo round-trip de edição.
export const TIPOS_ENFORNAMENTO_OPCOES = [
  'Frio',
  'Quente',
  'Tapete (1:1)',
  'Tapete (1,3:1)',
  'Tapete (1,5:1)',
  'Tapete (2:1)',
  'Tapete (1:2)',
  'Normal',
  'Intercalado (1:1)',
  'Intercalado (1,3:1)',
  'Intercalado (1,5:1)',
  'Intercalado (2:1)',
  'Intercalado (3:1)',
  'Frente forno',
] as const

export type TipoEnfornamentoNome = (typeof TIPOS_ENFORNAMENTO_OPCOES)[number]

export interface LineFurnaceChargingType {
  id: string
  center_code: string
  line_id?: string
  line_master_id?: string
  charging_type: TipoEnfornamentoNome | string
  raw_material_code: string
  raw_material_description?: string
  min_weight_t?: number | null
  max_weight_t?: number | null
  min_thickness_mm?: number | null
  max_thickness_mm?: number | null
  min_length_mm?: number | null
  max_length_mm?: number | null
  min_width_mm?: number | null
  max_width_mm?: number | null
  active?: boolean
  deleted?: boolean
  deleted_at?: string
  deleted_by?: string
  created_by?: string
  updated_by?: string
  created?: string
  updated?: string
}

export interface FurnaceChargingTypeFormData {
  id?: string
  center_code: string
  line_id?: string
  line_master_id?: string
  charging_type: string
  raw_material_code: string
  raw_material_description?: string
  min_weight_t?: number | null
  max_weight_t?: number | null
  min_thickness_mm?: number | null
  max_thickness_mm?: number | null
  min_length_mm?: number | null
  max_length_mm?: number | null
  min_width_mm?: number | null
  max_width_mm?: number | null
}

export interface LineChargeSeparation {
  id: string
  center_code: string
  line_id?: string
  line_master_id?: string
  charging_load_type: string // Carga que irá enfornar
  charged_load_type: string // Carga enfornada
  separator_blocks_qty: number // Qtd blocos separadores (inteiro >= 0)
  blocks_arrangement?: string // Disposição (ex.: "4 em pé + 4 deitados")
  notes?: string // Observação
  min_weight_t?: number | null
  max_weight_t?: number | null
  min_thickness_mm?: number | null
  max_thickness_mm?: number | null
  min_length_mm?: number | null
  max_length_mm?: number | null
  min_width_mm?: number | null
  max_width_mm?: number | null
  active?: boolean
  deleted?: boolean
  deleted_at?: string
  deleted_by?: string
  created_by?: string
  updated_by?: string
  created?: string
  updated?: string
}

export interface ChargeSeparationFormData {
  id?: string
  center_code: string
  line_id?: string
  line_master_id?: string
  charging_load_type: string
  charged_load_type: string
  separator_blocks_qty: number
  blocks_arrangement?: string
  notes?: string
  min_weight_t?: number | null
  max_weight_t?: number | null
  min_thickness_mm?: number | null
  max_thickness_mm?: number | null
  min_length_mm?: number | null
  max_length_mm?: number | null
  min_width_mm?: number | null
  max_width_mm?: number | null
}

export interface RawMaterialTypeOption {
  code: string
  description: string
  fullLabel: string
}

// Catálogo fechado e canônico de tipos de matéria-prima homologados para enfornamento no PCP CIAFAL
export const RAW_MATERIAL_TYPE_CATALOG: RawMaterialTypeOption[] = [
  { code: 'MPPA', description: 'Palanquilha', fullLabel: 'MPPA — Palanquilha' },
  { code: 'MPPL', description: 'Placa', fullLabel: 'MPPL — Placa' },
  { code: 'MPRE', description: 'Tarugo Retrabalhado', fullLabel: 'MPRE — Tarugo Retrabalhado' },
  { code: 'MPBL', description: 'Bloco', fullLabel: 'MPBL — Bloco' },
  { code: 'MPTA', description: 'Tarugo', fullLabel: 'MPTA — Tarugo' },
  { code: 'MPLI', description: 'Lingote', fullLabel: 'MPLI — Lingote' },
]

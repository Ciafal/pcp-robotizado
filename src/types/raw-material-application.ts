/**
 * Definições de Tipos: Matéria-Prima por Aplicação
 * PCP Robotizado HUB Ciafal
 */

export interface StructuredSupplier {
  code: string
  name: string
}

export type RawMaterialType =
  | 'Placa'
  | 'Bloco'
  | 'Palanquilha'
  | 'Tarugo 155'
  | 'Tarugo 130x130'
  | 'Tarugo 150x150'
  | 'Tarugo'
  | 'Lingote'
  | string

export const SYSTEM_RAW_MATERIAL_TYPES: { code: string; label: string }[] = [
  { code: 'Placa', label: 'Placa' },
  { code: 'Bloco', label: 'Bloco' },
  { code: 'Palanquilha', label: 'Palanquilha' },
  { code: 'Tarugo 155', label: 'Tarugo 155' },
  { code: 'Tarugo 130x130', label: 'Tarugo 130x130' },
  { code: 'Tarugo 150x150', label: 'Tarugo 150x150' },
  { code: 'Tarugo', label: 'Tarugo' },
  { code: 'Lingote', label: 'Lingote' },
]

export const SYSTEM_HOMOLOGATED_SUPPLIERS: SupplierOptionItem[] = [
  { code: 'GERDAU', name: 'Gerdau Aços Especiais', cityState: 'Charqueadas / Brasil' },
  { code: 'ARCELOR', name: 'ArcelorMittal', cityState: 'Juiz de Fora / Brasil' },
  { code: 'BARRA_MANSA', name: 'Siderúrgica Barra Mansa', cityState: 'Barra Mansa / RJ' },
  { code: 'SINOBRAS', name: 'Sinobras', cityState: 'Marabá / PA' },
  { code: 'VILLARES', name: 'Villares Metals', cityState: 'Sumaré / SP' },
  { code: 'APERAM', name: 'Aperam South America', cityState: 'Timóteo / MG' },
  { code: 'USIMINAS', name: 'Usiminas', cityState: 'Ipatinga / MG' },
  { code: 'IMPORTADO', name: 'Importado / Outros', cityState: 'Internacional' },
]

export interface LineRawMaterialApplication {
  id: string
  line_id: string
  line_master_id?: string
  center_code: string
  product_code: string
  product_description?: string
  raw_material_code: string
  raw_material_description?: string

  // Tópico 2: Fornecedor da MP
  supplier_applicable?: boolean
  suppliers_json?: StructuredSupplier[]
  raw_material_type?: string
  // Campos legados para compatibilidade
  supplier?: string
  supplier_id?: string

  // Tópico 3: Aplicação do Produto
  application: string
  bitolas_json?: string[]
  steel_types_json?: string[]
  rolled_min_length_mm?: number | null
  rolled_ideal_length_mm?: number | null
  rolled_max_length_mm?: number | null
  reduction_min_pct?: number | null
  reduction_ideal_pct?: number | null
  reduction_max_pct?: number | null
  validity_start_date?: string | null
  validity_end_date?: string | null

  // Redução Sincronizada (mantida com cálculo 1:X <-> %)
  reduction_ratio_x?: number | null
  reduction_ratio_text?: string | null
  reduction_percentage?: number | null

  // Campos legados de aplicação
  bitola_ref?: string
  steel_type?: string
  rolled_length_m?: number | null
  multiple_length_m?: number | null

  // Tópico 4: Pesos da Matéria-prima (t)
  min_weight_t?: number | null
  average_weight_t?: number | null
  max_weight_t?: number | null
  // Campos legados em kg
  min_weight_kg?: number | null
  average_weight_kg?: number | null
  max_weight_kg?: number | null

  // Tópico 5: Comprimento Matéria-prima (mm)
  min_mp_length_mm?: number | null
  ideal_mp_length_mm?: number | null
  max_mp_length_mm?: number | null
  // Campos legados em m
  min_mp_length_m?: number | null
  max_mp_length_m?: number | null

  // Tópico 6: Controle de Sequenciamento & Execução Técnica
  first_run?: boolean
  allow_out_of_standard_mp?: boolean

  // Tópico 7: Tempo Mínimo PCP
  tempo_minimo_pcp_unidade?: 'Minutos' | 'Horas' | 'Dias' | 'Semanas' | ''
  tempo_minimo_pcp_valor?: number | null

  // Tópico 8: Status & Observações
  status?: 'Ativo' | 'Inativo'
  notes?: string

  created?: string
  updated?: string
}

export interface RawMaterialApplicationFormData {
  id?: string
  line_id: string
  line_master_id?: string
  center_code: string
  product_code: string
  product_description?: string
  raw_material_code: string
  raw_material_description?: string

  // Tópico 2: Fornecedor da MP
  supplier_applicable: boolean
  suppliers_json: StructuredSupplier[]
  raw_material_type: string

  // Tópico 3: Aplicação do Produto
  application: string
  bitolas_json: string[]
  steel_types_json: string[]
  rolled_min_length_mm: string
  rolled_ideal_length_mm: string
  rolled_max_length_mm: string
  reduction_min_pct: string
  reduction_ideal_pct: string
  reduction_max_pct: string
  reduction_ratio_x: string
  reduction_percentage: string
  validity_start_date: string // formato dd/mm/aaaa
  validity_end_date: string // formato dd/mm/aaaa

  // Tópico 4: Pesos da Matéria-prima (t)
  min_weight_t: string
  average_weight_t: string
  max_weight_t: string

  // Tópico 5: Comprimento Matéria-prima (mm)
  min_mp_length_mm: string
  ideal_mp_length_mm: string
  max_mp_length_mm: string

  // Tópico 6: Controle de Sequenciamento & Execução Técnica
  first_run: boolean
  allow_out_of_standard_mp: boolean

  // Tópico 7: Tempo Mínimo PCP
  tempo_minimo_pcp_unidade?: 'Minutos' | 'Horas' | 'Dias' | 'Semanas' | ''
  tempo_minimo_pcp_valor?: string

  // Tópico 8: Status & Observações
  status: 'Ativo' | 'Inativo'
  notes?: string

  // Campos legados para compatibilidade reversa opcional
  supplier?: string
  supplier_id?: string
  bitola_ref?: string
  steel_type?: string
  min_weight_kg?: string
  average_weight_kg?: string
  max_weight_kg?: string
  min_mp_length_m?: string
  max_mp_length_m?: string
  rolled_length_m?: string
  multiple_length_m?: string
}

export interface RawMaterialApplicationValidationErrors {
  general?: string
  raw_material_code?: string
  application?: string
  raw_material_type?: string
  suppliers?: string
  bitolas?: string
  steel_types?: string
  rolled_length?: string
  rolled_min_length_mm?: string
  rolled_ideal_length_mm?: string
  rolled_max_length_mm?: string
  reduction?: string
  reduction_order?: string
  reduction_min_pct?: string
  reduction_ideal_pct?: string
  reduction_max_pct?: string
  validity?: string
  validity_start_date?: string
  validity_end_date?: string
  weight?: string
  min_weight_t?: string
  average_weight_t?: string
  max_weight_t?: string
  mp_length?: string
  min_mp_length_mm?: string
  ideal_mp_length_mm?: string
  max_mp_length_mm?: string
  duplicate?: string
  tempo_minimo_pcp?: string
  [key: string]: string | undefined
}

export interface RawMaterialApplicationFilters {
  center_code?: string
  product_code?: string
  raw_material_code?: string
  supplier?: string
  application?: string
  status?: 'Ativo' | 'Inativo' | 'Todos'
  first_run?: 'Sim' | 'Não' | 'Todos'
  allow_out_of_standard_mp?: 'Sim' | 'Não' | 'Todos'
  search?: string
}

export interface SupplierOptionItem {
  code: string
  name: string
  cityState?: string
}

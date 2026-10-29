/**
 * Tipos Oficiais para Otimização de Aplicações por Peça no PCP Robotizado
 * Coleção PocketBase: mp_cutting_piece_applications
 */

export interface IndustrialApplicationCandidate {
  id: string
  application_code: string
  application_name: string
  product_code: string
  product_description: string
  steel_grade: string
  center_code?: string
  target_length_mm: number
  min_length_mm?: number
  max_length_mm?: number
  available_demand_qty: number
  priority_order: number // 1 = mais prioritária
  is_active: boolean
  tolerance_mm?: number
  unit_weight_estimate_kg?: number
  source_table?:
    | 'line_raw_material_applications'
    | 'mp_application_requirements'
    | 'line_raw_material_priorities'
}

export interface AllocatedPieceItem {
  application_id: string
  application_code: string
  application_name: string
  product_code: string
  product_description: string
  length_mm: number
  quantity: number
  priority: number
  used_length_mm: number // quantity * length_mm
  estimated_weight_kg: number
  cut_sequence: number
}

export interface VisualCutSegment {
  id: string
  type: 'PIECE' | 'KERF' | 'SQUARING' | 'END_CROP' | 'USABLE_LEFTOVER' | 'SCRAP'
  label: string
  application_name?: string
  product_code?: string
  length_mm: number
  start_mm: number
  end_mm: number
  piece_number?: number
  cut_sequence?: number
  estimated_weight_kg?: number
  color: string
}

export interface PieceOptimizationResult {
  piece_identifier: string
  scenario_id: string
  scenario_name?: string
  material_code: string
  gauge_dimension?: string
  center_code?: string
  heat_number?: string
  piece_weight_kg: number
  linear_mass_kg_m: number
  total_rolled_length_mm: number // Comprimento Laminado Total
  saw_kerf_mm: number // Kerf da serra por corte
  squaring_loss_mm: number // Perda de esquadrejamento
  end_crop_loss_mm: number // Pontas descartadas
  cuts_count: number
  cut_losses_length_mm: number // Soma dos cortes + esquadrejamento + pontas
  used_length_mm: number // Comprimento aproveitado em peças conformes
  usable_leftover_mm: number // Sobra aproveitável
  scrap_mm: number // Refugo final não aproveitável
  cutting_yield_pct: number // (used_length_mm / total_rolled_length_mm) * 100
  generated_pieces_count: number // Total de peças conformes produzidas
  fulfilled_applications_count: number // Quantidade de aplicações distintas atendidas
  allocated_items: AllocatedPieceItem[]
  visual_segments: VisualCutSegment[]
  is_viable: boolean
  inviability_reason?: string
}

export interface SavedPieceApplicationRecord {
  id?: string
  piece_identifier: string
  scenario_id: string
  scenario_name?: string
  material_code: string
  gauge_dimension?: string
  center_code?: string
  heat_number?: string
  piece_weight_kg?: number
  linear_mass_kg_m: number
  rolled_length_mm: number
  saw_kerf_mm: number
  squaring_loss_mm: number
  end_crop_loss_mm: number
  cutting_yield_pct: number
  used_length_mm: number
  cut_losses_length_mm: number
  usable_leftover_mm: number
  scrap_mm: number
  generated_pieces_count: number
  fulfilled_applications_count: number
  allocated_items_json: AllocatedPieceItem[]
  visual_segments_json: VisualCutSegment[]
  confirmed_by_user_name?: string
  notes?: string
  created?: string
  updated?: string
}

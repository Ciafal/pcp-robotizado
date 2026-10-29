import pb from '@/lib/pocketbase/client'

export interface MPDimensionalInventoryNote {
  id: string
  material_id: string
  material_code: string
  block_number?: string
  batch_number?: string
  heat_number?: string
  note_text: string
  author_name: string
  author_email?: string
  author_role?: string
  created?: string
  updated?: string
}

export interface MPMultipleCuttingPlanRecord {
  id?: string
  plan_code: string
  material_code: string
  material_description?: string
  steel_grade?: string
  batch_number?: string
  heat_number?: string
  supplier_code?: string
  supplier_name?: string
  center_code?: string
  line_code?: string
  gauge_dimension?: string
  block_weight_tons?: number
  thickness_mm?: number
  width_mm?: number
  length_mm?: number
  linear_mass_kg_m?: number
  projected_rolled_length_m?: number
  cutting_yield_pct?: number
  total_used_length_m?: number
  leftover_length_m?: number
  leftover_weight_tons?: number
  scrap_length_m?: number
  scrap_weight_tons?: number
  pieces_count?: number
  ai_score?: number
  ai_technical_justification?: string
  allocated_applications_json?: any
  multiples_summary_json?: any
  status?: string
  created_by_user_name?: string
  created?: string
  updated?: string
}

export const mpDimensionalNotesService = {
  async getNotesByMaterial(
    materialId: string,
    materialCode?: string,
  ): Promise<MPDimensionalInventoryNote[]> {
    try {
      const filters: string[] = []
      if (materialId) filters.push(`material_id = '${materialId}'`)
      if (materialCode) filters.push(`material_code = '${materialCode}'`)

      const filterStr = filters.join(' || ')
      const records = await pb
        .collection('mp_dimensional_inventory_notes')
        .getFullList<MPDimensionalInventoryNote>({
          filter: filterStr || undefined,
          sort: '-created',
        })
      return records
    } catch (err) {
      console.warn('[mpDimensionalNotesService] Falha ao carregar observações:', err)
      return []
    }
  },

  async addNote(
    note: Omit<MPDimensionalInventoryNote, 'id' | 'created' | 'updated'>,
  ): Promise<MPDimensionalInventoryNote> {
    const record = await pb
      .collection('mp_dimensional_inventory_notes')
      .create<MPDimensionalInventoryNote>(note)
    return record
  },
}

export const mpMultipleCuttingPlansService = {
  async listPlans(filters?: string): Promise<MPMultipleCuttingPlanRecord[]> {
    try {
      return await pb
        .collection('mp_multiple_cutting_plans')
        .getFullList<MPMultipleCuttingPlanRecord>({
          filter: filters,
          sort: '-created',
        })
    } catch (err) {
      console.warn('[mpMultipleCuttingPlansService] Erro ao listar planos:', err)
      return []
    }
  },

  async savePlan(plan: MPMultipleCuttingPlanRecord): Promise<MPMultipleCuttingPlanRecord> {
    return await pb
      .collection('mp_multiple_cutting_plans')
      .create<MPMultipleCuttingPlanRecord>(plan)
  },
}

import pb from '@/lib/pocketbase/client'
import {
  CenterBufferRecord,
  SaveCenterBufferInput,
  CenterLungStockRecord,
  SaveCenterLungStockInput,
} from '@/types/center-buffers-and-lungs'
import { pcpAuditService } from '@/services/pcp-audit-service'

export interface CenterBufferValidationErrors {
  [field: string]: string
}

export interface CenterLungValidationErrors {
  [field: string]: string
}

export class CenterBuffersAndLungsService {
  // =========================================================================
  // VALIDAÇÕES ESTITAS (sem apagar campos digitados)
  // =========================================================================

  public static validateBuffer(input: SaveCenterBufferInput): CenterBufferValidationErrors {
    const errors: CenterBufferValidationErrors = {}

    if (!input.center_code?.trim()) {
      errors.center_code = 'O Centro Produtivo é obrigatório.'
    }
    if (!input.name?.trim()) {
      errors.name = 'O Nome do Buffer é obrigatório.'
    }
    if (!input.buffer_type) {
      errors.buffer_type = 'O Tipo de Buffer é obrigatório.'
    }

    // Validação de capacidades negativas
    if (input.max_capacity != null && Number(input.max_capacity) < 0) {
      errors.max_capacity = 'A capacidade máxima não pode ser negativa.'
    }
    if (input.available_area != null && Number(input.available_area) < 0) {
      errors.available_area = 'A área disponível não pode ser negativa.'
    }
    if (input.operational_capacity != null && Number(input.operational_capacity) < 0) {
      errors.operational_capacity = 'A capacidade operacional não pode ser negativa.'
    }
    if (input.recommended_capacity != null && Number(input.recommended_capacity) < 0) {
      errors.recommended_capacity = 'A capacidade recomendada não pode ser negativa.'
    }
    if (input.capacity_reduction != null && Number(input.capacity_reduction) < 0) {
      errors.capacity_reduction = 'A redução de capacidade não pode ser negativa.'
    }

    // Regras de Bloqueio Temporário
    const isTempBlock =
      input.buffer_type === 'Bloqueio temporário — Segurança' ||
      input.buffer_type === 'Bloqueio temporário — Manutenção' ||
      input.buffer_type === 'Bloqueio temporário — Obra'

    if (isTempBlock) {
      if (!input.start_date || !input.start_date.trim()) {
        errors.start_date = 'Bloqueio temporário exige data/hora inicial de vigência.'
      }
      if (input.start_date && input.expected_release_date) {
        const dStart = new Date(input.start_date).getTime()
        const dEnd = new Date(input.expected_release_date).getTime()
        if (!isNaN(dStart) && !isNaN(dEnd) && dEnd < dStart) {
          errors.expected_release_date =
            'A data final de liberação não pode ser anterior à data inicial.'
        }
      }
    }

    // Validação de Vigência do Impacto na Capacidade
    if (input.impacts_capacity) {
      if (input.capacity_impact_start && input.capacity_impact_end) {
        const dStart = new Date(input.capacity_impact_start).getTime()
        const dEnd = new Date(input.capacity_impact_end).getTime()
        if (!isNaN(dStart) && !isNaN(dEnd) && dEnd < dStart) {
          errors.capacity_impact_end =
            'A data final prevista não pode ser anterior à data inicial do impacto.'
        }
      }
    }

    return errors
  }

  public static validateLungStock(input: SaveCenterLungStockInput): CenterLungValidationErrors {
    const errors: CenterLungValidationErrors = {}

    if (!input.center_code?.trim()) {
      errors.center_code = 'O Centro Produtivo é obrigatório.'
    }
    if (!input.name?.trim()) {
      errors.name = 'O Nome do Estoque Pulmão é obrigatório.'
    }
    if (!input.material_or_group?.trim()) {
      errors.material_or_group = 'Informe o material específico ou grupo de materiais.'
    }
    if (!input.unit_of_measure?.trim()) {
      errors.unit_of_measure = 'A unidade de medida é obrigatória.'
    }

    const min = Number(input.min_stock)
    const ideal = Number(input.ideal_stock)
    const max = Number(input.max_stock)
    const phys =
      input.max_physical_capacity != null && input.max_physical_capacity !== ('' as any)
        ? Number(input.max_physical_capacity)
        : null

    if (isNaN(min) || min < 0) {
      errors.min_stock = 'O estoque mínimo deve ser um número maior ou igual a zero.'
    }
    if (isNaN(ideal) || ideal < 0) {
      errors.ideal_stock = 'O estoque ideal deve ser um número maior ou igual a zero.'
    }
    if (isNaN(max) || max < 0) {
      errors.max_stock = 'O estoque máximo deve ser um número maior ou igual a zero.'
    }

    // - estoque mínimo maior que estoque ideal: bloquear
    if (!isNaN(min) && !isNaN(ideal) && min > ideal) {
      errors.min_stock = 'O estoque mínimo não pode ser maior que o estoque ideal.'
    }

    // - estoque ideal maior que estoque máximo: bloquear
    if (!isNaN(ideal) && !isNaN(max) && ideal > max) {
      errors.ideal_stock = 'O estoque ideal não pode ser maior que o estoque máximo.'
    }

    // - estoque máximo superior à capacidade física máxima, quando houver esse limite: bloquear
    if (phys != null && !isNaN(phys) && phys > 0 && !isNaN(max) && max > phys) {
      errors.max_stock =
        'O estoque máximo não pode ser superior à capacidade física máxima cadastrada.'
    }

    if (phys != null && phys < 0) {
      errors.max_physical_capacity = 'A capacidade física máxima não pode ser negativa.'
    }

    return errors
  }

  // =========================================================================
  // GERAÇÃO ATÔMICA DE CÓDIGOS (BUF-00001 e PUL-00001)
  // =========================================================================

  public static async generateNextBufferCode(): Promise<string> {
    try {
      const records = await pb.collection('center_buffers').getFullList<CenterBufferRecord>({
        sort: '-code',
      })
      let maxSeq = 0
      for (const r of records) {
        const m = (r.code || '').match(/^BUF-(\d+)$/)
        if (m) {
          const num = parseInt(m[1], 10)
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num
          }
        }
      }
      return `BUF-${String(maxSeq + 1).padStart(5, '0')}`
    } catch {
      return 'BUF-00001'
    }
  }

  public static async generateNextLungCode(): Promise<string> {
    try {
      const records = await pb.collection('center_lung_stocks').getFullList<CenterLungStockRecord>({
        sort: '-code',
      })
      let maxSeq = 0
      for (const r of records) {
        const m = (r.code || '').match(/^PUL-(\d+)$/)
        if (m) {
          const num = parseInt(m[1], 10)
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num
          }
        }
      }
      return `PUL-${String(maxSeq + 1).padStart(5, '0')}`
    } catch {
      return 'PUL-00001'
    }
  }

  // =========================================================================
  // SERVIÇOS DE BUFFERS DA FICHA MESTRA
  // =========================================================================

  public static async listBuffersByCenter(
    centerCode: string,
    includeInactive: boolean = true,
  ): Promise<CenterBufferRecord[]> {
    try {
      let filter = `center_code = '${centerCode}' && (is_deleted = false || is_deleted = null)`
      if (!includeInactive) {
        filter += " && status = 'Ativo'"
      }
      const records = await pb.collection('center_buffers').getFullList<CenterBufferRecord>({
        filter,
        sort: 'code',
      })
      return records
    } catch (err) {
      console.warn(`Erro ao listar center_buffers para ${centerCode}:`, err)
      return []
    }
  }

  public static async listAllActiveBuffers(): Promise<CenterBufferRecord[]> {
    try {
      const records = await pb.collection('center_buffers').getFullList<CenterBufferRecord>({
        filter: "status = 'Ativo' && (is_deleted = false || is_deleted = null)",
        sort: 'center_code,code',
      })
      return records
    } catch (err) {
      console.warn('Erro ao listar todos os center_buffers ativos:', err)
      return []
    }
  }

  public static async saveBuffer(input: SaveCenterBufferInput): Promise<CenterBufferRecord> {
    const errors = this.validateBuffer(input)
    const errKeys = Object.keys(errors)
    if (errKeys.length > 0) {
      throw new Error(errors[errKeys[0]])
    }

    const isEdit = Boolean(input.id)
    let previousRecord: CenterBufferRecord | null = null

    if (isEdit && input.id) {
      try {
        previousRecord = await pb.collection('center_buffers').getOne<CenterBufferRecord>(input.id)
      } catch {
        /* intentionally ignored */
      }
    }

    const code = input.code?.trim() || (await this.generateNextBufferCode())

    const payload: any = {
      code,
      name: input.name.trim(),
      center_code: input.center_code.trim(),
      center_name: input.center_name || '',
      description: input.description || '',
      status: input.status,
      buffer_type: input.buffer_type,

      location_physical: input.location_physical || '',
      available_area: input.available_area != null ? Number(input.available_area) : null,
      unit_of_measure: input.unit_of_measure || '',
      operational_capacity:
        input.operational_capacity != null ? Number(input.operational_capacity) : null,
      observation: input.observation || '',

      bay_identification: input.bay_identification || '',
      max_capacity: input.max_capacity != null ? Number(input.max_capacity) : null,
      recommended_capacity:
        input.recommended_capacity != null ? Number(input.recommended_capacity) : null,
      max_percentage_allowed:
        input.max_percentage_allowed != null ? Number(input.max_percentage_allowed) : null,

      block_reason: input.block_reason || '',
      responsible_name: input.responsible_name || '',
      start_date: input.start_date || '',
      expected_release_date: input.expected_release_date || '',
      block_status: input.block_status || 'Programado',

      related_equipment: input.related_equipment || '',
      construction_description: input.construction_description || '',

      impacts_capacity: Boolean(input.impacts_capacity),
      capacity_reduction:
        input.capacity_reduction != null ? Number(input.capacity_reduction) : null,
      capacity_reduction_unit: input.capacity_reduction_unit || '',
      capacity_impact_start: input.capacity_impact_start || '',
      capacity_impact_end: input.capacity_impact_end || '',
      is_deleted: false,
    }

    if (input.line_id) payload.line_id = input.line_id

    let resultRecord: CenterBufferRecord
    if (isEdit && input.id) {
      resultRecord = await pb
        .collection('center_buffers')
        .update<CenterBufferRecord>(input.id, payload)
    } else {
      resultRecord = await pb.collection('center_buffers').create<CenterBufferRecord>(payload)
    }

    // Auditoria append-only via pcpAuditService
    try {
      const authUser = pb.authStore.record || pb.authStore.model
      const changes: Array<{ field: string; fieldNamePt: string; before: any; after: any }> = []

      if (!isEdit) {
        Object.entries(payload).forEach(([k, v]) => {
          changes.push({ field: k, fieldNamePt: k, before: null, after: v })
        })
      } else if (previousRecord) {
        Object.entries(payload).forEach(([k, v]) => {
          const prevVal = (previousRecord as any)[k]
          if (String(prevVal ?? '') !== String(v ?? '')) {
            changes.push({ field: k, fieldNamePt: k, before: prevVal, after: v })
          }
        })
      }

      await pcpAuditService.recordLog({
        action: isEdit
          ? `Edição de Buffer ${resultRecord.code} (${resultRecord.name}) no Centro ${resultRecord.center_code}`
          : `Cadastro de Buffer ${resultRecord.code} (${resultRecord.name}) no Centro ${resultRecord.center_code}`,
        event_type: isEdit ? 'Edição' : 'Criação',
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra',
        line: resultRecord.center_code,
        center: resultRecord.center_code,
        resource: 'center_buffers',
        resource_id: resultRecord.id,
        record_id: resultRecord.id,
        entity: 'center_buffers',
        status: 'Concluída',
        reason: isEdit
          ? `Atualização cadastral do Buffer ${resultRecord.code}`
          : `Novo Buffer ${resultRecord.code} cadastrado na Ficha Mestra`,
        justification: `Tipo: ${resultRecord.buffer_type} | Impacta Capacidade: ${resultRecord.impacts_capacity ? 'Sim' : 'Não'}`,
        changes,
        details: {
          code: resultRecord.code,
          buffer_type: resultRecord.buffer_type,
          user: authUser?.name || authUser?.email || 'Programador PCP',
          center: resultRecord.center_code,
          impacts_capacity: resultRecord.impacts_capacity,
          capacity_reduction: resultRecord.capacity_reduction,
        },
      })
    } catch (audErr) {
      console.warn('Erro ao registrar auditoria de buffer:', audErr)
    }

    return resultRecord
  }

  public static async toggleBufferStatus(
    id: string,
    newStatus: 'Ativo' | 'Inativo',
  ): Promise<CenterBufferRecord> {
    const prev = await pb.collection('center_buffers').getOne<CenterBufferRecord>(id)
    const updated = await pb.collection('center_buffers').update<CenterBufferRecord>(id, {
      status: newStatus,
    })

    try {
      await pcpAuditService.recordLog({
        action: `${newStatus === 'Ativo' ? 'Ativação' : 'Inativação'} do Buffer ${prev.code} no Centro ${prev.center_code}`,
        event_type: newStatus === 'Ativo' ? 'Ativação' : 'Inativação',
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra',
        line: prev.center_code,
        center: prev.center_code,
        resource: 'center_buffers',
        resource_id: prev.id,
        record_id: prev.id,
        entity: 'center_buffers',
        status: 'Concluída',
        reason: `Alteração de status para ${newStatus}`,
        changes: [
          {
            field: 'status',
            fieldNamePt: 'Status',
            before: prev.status,
            after: newStatus,
          },
        ],
      })
    } catch (e) {
      console.warn('Erro ao auditar toggleBufferStatus:', e)
    }

    return updated
  }

  public static async deleteBuffer(id: string): Promise<void> {
    const prev = await pb.collection('center_buffers').getOne<CenterBufferRecord>(id)
    // Exclusão lógica com flag is_deleted
    await pb.collection('center_buffers').update(id, {
      is_deleted: true,
      status: 'Inativo',
    })

    try {
      await pcpAuditService.recordLog({
        action: `Exclusão lógica do Buffer ${prev.code} (${prev.name}) no Centro ${prev.center_code}`,
        event_type: 'Exclusão',
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra',
        line: prev.center_code,
        center: prev.center_code,
        resource: 'center_buffers',
        resource_id: prev.id,
        record_id: prev.id,
        entity: 'center_buffers',
        status: 'Concluída',
        reason: `Exclusão solicitada pelo usuário para o Buffer ${prev.code}`,
        changes: [
          { field: 'is_deleted', fieldNamePt: 'Exclusão Lógica', before: false, after: true },
        ],
      })
    } catch (e) {
      console.warn('Erro ao auditar deleteBuffer:', e)
    }
  }

  // =========================================================================
  // SERVIÇOS DE ESTOQUE PULMÃO DA FICHA MESTRA
  // =========================================================================

  public static async listLungsByCenter(
    centerCode: string,
    includeInactive: boolean = true,
  ): Promise<CenterLungStockRecord[]> {
    try {
      let filter = `center_code = '${centerCode}' && (is_deleted = false || is_deleted = null)`
      if (!includeInactive) {
        filter += " && status = 'Ativo'"
      }
      const records = await pb.collection('center_lung_stocks').getFullList<CenterLungStockRecord>({
        filter,
        sort: 'code',
      })
      return records
    } catch (err) {
      console.warn(`Erro ao listar center_lung_stocks para ${centerCode}:`, err)
      return []
    }
  }

  public static async listAllActiveLungs(): Promise<CenterLungStockRecord[]> {
    try {
      const records = await pb.collection('center_lung_stocks').getFullList<CenterLungStockRecord>({
        filter: "status = 'Ativo' && (is_deleted = false || is_deleted = null)",
        sort: 'center_code,code',
      })
      return records
    } catch (err) {
      console.warn('Erro ao listar todos os estoques pulmão ativos:', err)
      return []
    }
  }

  public static async saveLungStock(
    input: SaveCenterLungStockInput,
  ): Promise<CenterLungStockRecord> {
    const errors = this.validateLungStock(input)
    const errKeys = Object.keys(errors)
    if (errKeys.length > 0) {
      throw new Error(errors[errKeys[0]])
    }

    const isEdit = Boolean(input.id)
    let previousRecord: CenterLungStockRecord | null = null

    if (isEdit && input.id) {
      try {
        previousRecord = await pb
          .collection('center_lung_stocks')
          .getOne<CenterLungStockRecord>(input.id)
      } catch {
        /* intentionally ignored */
      }
    }

    const code = input.code?.trim() || (await this.generateNextLungCode())

    const payload: any = {
      code,
      name: input.name.trim(),
      center_code: input.center_code.trim(),
      center_name: input.center_name || '',
      location_deposit: input.location_deposit || '',
      description: input.description || '',
      status: input.status,

      material_or_group: input.material_or_group.trim(),
      unit_of_measure: input.unit_of_measure.trim(),
      min_stock: Number(input.min_stock),
      ideal_stock: Number(input.ideal_stock),
      max_stock: Number(input.max_stock),
      max_physical_capacity:
        input.max_physical_capacity != null && input.max_physical_capacity !== ('' as any)
          ? Number(input.max_physical_capacity)
          : null,
      min_coverage_hours:
        input.min_coverage_hours != null && input.min_coverage_hours !== ('' as any)
          ? Number(input.min_coverage_hours)
          : null,
      ideal_coverage_hours:
        input.ideal_coverage_hours != null && input.ideal_coverage_hours !== ('' as any)
          ? Number(input.ideal_coverage_hours)
          : null,
      current_real_stock:
        input.current_real_stock != null ? Number(input.current_real_stock) : null,
      observation: input.observation || '',
      is_deleted: false,
    }

    if (input.line_id) payload.line_id = input.line_id

    let resultRecord: CenterLungStockRecord
    if (isEdit && input.id) {
      resultRecord = await pb
        .collection('center_lung_stocks')
        .update<CenterLungStockRecord>(input.id, payload)
    } else {
      resultRecord = await pb
        .collection('center_lung_stocks')
        .create<CenterLungStockRecord>(payload)
    }

    // Auditoria append-only via pcpAuditService
    try {
      const authUser = pb.authStore.record || pb.authStore.model
      const changes: Array<{ field: string; fieldNamePt: string; before: any; after: any }> = []

      if (!isEdit) {
        Object.entries(payload).forEach(([k, v]) => {
          changes.push({ field: k, fieldNamePt: k, before: null, after: v })
        })
      } else if (previousRecord) {
        Object.entries(payload).forEach(([k, v]) => {
          const prevVal = (previousRecord as any)[k]
          if (String(prevVal ?? '') !== String(v ?? '')) {
            changes.push({ field: k, fieldNamePt: k, before: prevVal, after: v })
          }
        })
      }

      await pcpAuditService.recordLog({
        action: isEdit
          ? `Edição de Estoque Pulmão ${resultRecord.code} (${resultRecord.name}) no Centro ${resultRecord.center_code}`
          : `Cadastro de Estoque Pulmão ${resultRecord.code} (${resultRecord.name}) no Centro ${resultRecord.center_code}`,
        event_type: isEdit ? 'Edição' : 'Criação',
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra',
        line: resultRecord.center_code,
        center: resultRecord.center_code,
        resource: 'center_lung_stocks',
        resource_id: resultRecord.id,
        record_id: resultRecord.id,
        entity: 'center_lung_stocks',
        status: 'Concluída',
        reason: isEdit
          ? `Atualização de parâmetros do Estoque Pulmão ${resultRecord.code}`
          : `Novo Estoque Pulmão ${resultRecord.code} cadastrado na Ficha Mestra`,
        justification: `Material: ${resultRecord.material_or_group} | Limites: Mín ${resultRecord.min_stock} / Ideal ${resultRecord.ideal_stock} / Máx ${resultRecord.max_stock} ${resultRecord.unit_of_measure}`,
        changes,
        details: {
          code: resultRecord.code,
          material: resultRecord.material_or_group,
          user: authUser?.name || authUser?.email || 'Programador PCP',
          center: resultRecord.center_code,
          min_stock: resultRecord.min_stock,
          ideal_stock: resultRecord.ideal_stock,
          max_stock: resultRecord.max_stock,
          max_physical_capacity: resultRecord.max_physical_capacity,
        },
      })
    } catch (audErr) {
      console.warn('Erro ao registrar auditoria de estoque pulmão:', audErr)
    }

    return resultRecord
  }

  public static async toggleLungStatus(
    id: string,
    newStatus: 'Ativo' | 'Inativo',
  ): Promise<CenterLungStockRecord> {
    const prev = await pb.collection('center_lung_stocks').getOne<CenterLungStockRecord>(id)
    const updated = await pb.collection('center_lung_stocks').update<CenterLungStockRecord>(id, {
      status: newStatus,
    })

    try {
      await pcpAuditService.recordLog({
        action: `${newStatus === 'Ativo' ? 'Ativação' : 'Inativação'} do Estoque Pulmão ${prev.code} no Centro ${prev.center_code}`,
        event_type: newStatus === 'Ativo' ? 'Ativação' : 'Inativação',
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra',
        line: prev.center_code,
        center: prev.center_code,
        resource: 'center_lung_stocks',
        resource_id: prev.id,
        record_id: prev.id,
        entity: 'center_lung_stocks',
        status: 'Concluída',
        reason: `Alteração de status para ${newStatus}`,
        changes: [
          {
            field: 'status',
            fieldNamePt: 'Status',
            before: prev.status,
            after: newStatus,
          },
        ],
      })
    } catch (e) {
      console.warn('Erro ao auditar toggleLungStatus:', e)
    }

    return updated
  }

  public static async deleteLungStock(id: string): Promise<void> {
    const prev = await pb.collection('center_lung_stocks').getOne<CenterLungStockRecord>(id)
    await pb.collection('center_lung_stocks').update(id, {
      is_deleted: true,
      status: 'Inativo',
    })

    try {
      await pcpAuditService.recordLog({
        action: `Exclusão lógica do Estoque Pulmão ${prev.code} (${prev.name}) no Centro ${prev.center_code}`,
        event_type: 'Exclusão',
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra',
        line: prev.center_code,
        center: prev.center_code,
        resource: 'center_lung_stocks',
        resource_id: prev.id,
        record_id: prev.id,
        entity: 'center_lung_stocks',
        status: 'Concluída',
        reason: `Exclusão solicitada pelo usuário para o Estoque Pulmão ${prev.code}`,
        changes: [
          { field: 'is_deleted', fieldNamePt: 'Exclusão Lógica', before: false, after: true },
        ],
      })
    } catch (e) {
      console.warn('Erro ao auditar deleteLungStock:', e)
    }
  }
}

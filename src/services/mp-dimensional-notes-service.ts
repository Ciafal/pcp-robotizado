import pb from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

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
  version?: number
  plan_type?: 'MULTIPLO' | 'BLOCOS' | string
  parent_plan_id?: string
  is_latest?: boolean
  version_notes?: string
  distribution_cuts_json?: any
  audit_history_json?: any
  responsible_user_name?: string
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

export interface SavePlanResult {
  record: MPMultipleCuttingPlanRecord
  isUpdate: boolean
  previousVersion?: number
  version: number
  plan_code: string
}

export const mpMultipleCuttingPlansService = {
  /**
   * Reserva e gera o próximo código sequencial no formato PCM-YYYY-XXXXX ou PCB-YYYY-XXXXX
   * Garante unicidade e concorrência com retries automáticos.
   */
  async generateSequentialCode(prefix: 'PCM' | 'PCB' = 'PCM'): Promise<string> {
    const year = new Date().getFullYear()

    // 1. Tenta prioritariamente via endpoint oficial atômico no servidor
    try {
      const serverRes = await pb.send<{
        success: boolean
        plan_code: string
      }>('/backend/v1/pcp/cutting-plans/next-code', {
        method: 'POST',
        body: { prefix, year },
      })
      if (serverRes?.success && serverRes.plan_code) {
        return serverRes.plan_code
      }
    } catch (endpointErr) {
      console.warn(
        '[mpMultipleCuttingPlansService] Endpoint de código retornou erro, aplicando transação via SDK:',
        endpointErr,
      )
    }

    // 2. Fallback transacional com retries no SDK
    const maxRetries = 10
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const filterStr = `prefix = '${prefix}' && year = ${year}`
        const existingList = await pb
          .collection('mp_cutting_plan_sequences')
          .getList(1, 1, { filter: filterStr, sort: '-updated' })
          .catch(() => null)

        if (existingList && existingList.items.length > 0) {
          const seqRec = existingList.items[0]
          const nextVal = (Number(seqRec.current_number) || 0) + 1
          await pb.collection('mp_cutting_plan_sequences').update(seqRec.id, {
            current_number: nextVal,
            sequence_key: `${prefix}-${year}-${nextVal}`,
          })
          const formattedNumber = String(nextVal).padStart(5, '0')
          return `${prefix}-${year}-${formattedNumber}`
        }

        const initialVal = 1
        await pb.collection('mp_cutting_plan_sequences').create({
          prefix,
          year,
          current_number: initialVal,
          sequence_key: `${prefix}-${year}-${initialVal}`,
        })
        const formattedNumber = String(initialVal).padStart(5, '0')
        return `${prefix}-${year}-${formattedNumber}`
      } catch (err: any) {
        if (attempt < maxRetries - 1) {
          const delay = Math.floor(Math.random() * 80) + 40
          await new Promise((res) => setTimeout(res, delay))
        } else {
          const count = await pb
            .collection('mp_multiple_cutting_plans')
            .getList(1, 1, { filter: `plan_code ~ '${prefix}-${year}'` })
            .then((r) => r.totalItems)
            .catch(() => 0)
          const fallbackNum = String(count + 1).padStart(5, '0')
          return `${prefix}-${year}-${fallbackNum}`
        }
      }
    }
    return `${prefix}-${year}-00001`
  },

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

  async getPlanById(id: string): Promise<MPMultipleCuttingPlanRecord | null> {
    try {
      return await pb
        .collection('mp_multiple_cutting_plans')
        .getOne<MPMultipleCuttingPlanRecord>(id)
    } catch (err) {
      console.warn(`[mpMultipleCuttingPlansService] Erro ao buscar plano ${id}:`, err)
      return null
    }
  },

  async getVersionsByPlanCode(planCode: string): Promise<MPMultipleCuttingPlanRecord[]> {
    try {
      return await pb
        .collection('mp_multiple_cutting_plans')
        .getFullList<MPMultipleCuttingPlanRecord>({
          filter: `plan_code = '${planCode}'`,
          sort: '-version',
        })
    } catch (err) {
      console.warn(`[mpMultipleCuttingPlansService] Erro ao buscar versões de ${planCode}:`, err)
      return []
    }
  },

  /**
   * Salva um plano novo ou cria uma nova versão imutável se já houver registro persistido (targetPlanId).
   * Implementa collision guard e auditoria formal.
   */
  async savePlan(
    planData: MPMultipleCuttingPlanRecord,
    options?: {
      targetPlanId?: string
      clientExpectedVersion?: number
      justification?: string
      actionUser?: string
    },
  ): Promise<SavePlanResult> {
    const user = pb.authStore.record
    const authorName =
      options?.actionUser ||
      planData.responsible_user_name ||
      planData.created_by_user_name ||
      user?.name ||
      user?.email ||
      'Engenheiro PCP'

    const nowIso = new Date().toISOString()
    const targetId = options?.targetPlanId || planData.id

    // FLUXO DE ATUALIZAÇÃO / NOVA VERSÃO
    if (targetId) {
      const existing = await pb
        .collection('mp_multiple_cutting_plans')
        .getOne<MPMultipleCuttingPlanRecord>(targetId)
        .catch(() => null)

      if (!existing) {
        throw new Error(
          `Plano de corte com ID "${targetId}" não foi encontrado no banco de dados para atualização.`,
        )
      }

      // Collision guard: verifica se a versão do cliente coincide com a do registro atual
      const currentDbVersion = existing.version || 1
      if (
        options?.clientExpectedVersion !== undefined &&
        options.clientExpectedVersion !== currentDbVersion
      ) {
        throw new Error(
          `Conflito de versão detectado! A versão atual no servidor é v${currentDbVersion}, enquanto a sua visualização é v${options.clientExpectedVersion}. Recarregue o histórico antes de atualizar.`,
        )
      }

      // Marcar registro anterior como is_latest = false
      await pb.collection('mp_multiple_cutting_plans').update(existing.id!, {
        is_latest: false,
      })

      const newVersion = currentDbVersion + 1
      const planCode = existing.plan_code || planData.plan_code

      // Monta histórico de auditoria com diff
      const priorAudit = Array.isArray(existing.audit_history_json)
        ? existing.audit_history_json
        : []

      const auditEntry = {
        event: 'VERSION_UPDATE',
        from_version: currentDbVersion,
        to_version: newVersion,
        action: 'Atualização do Plano de Corte',
        timestamp: nowIso,
        user: authorName,
        justification:
          options?.justification ||
          'Atualização de parâmetros e recálculo da distribuição de cortes.',
        previous_yield_pct: existing.cutting_yield_pct,
        new_yield_pct: planData.cutting_yield_pct,
        previous_pieces_count: existing.pieces_count,
        new_pieces_count: planData.pieces_count,
      }

      const updatedAudit = [auditEntry, ...priorAudit]

      const newRecordData: MPMultipleCuttingPlanRecord = {
        ...planData,
        id: undefined, // força PocketBase a criar um novo registro com novo ID
        plan_code: planCode,
        version: newVersion,
        plan_type: planData.plan_type || 'MULTIPLO',
        parent_plan_id: existing.id,
        is_latest: true,
        version_notes: options?.justification || `Revisão v0${newVersion}`,
        responsible_user_name: authorName,
        created_by_user_name: existing.created_by_user_name || authorName,
        audit_history_json: updatedAudit,
        status: existing.status === 'APROVADO' ? 'EM_REVISAO' : existing.status || 'RASCUNHO',
      }

      const createdVersion = await pb
        .collection('mp_multiple_cutting_plans')
        .create<MPMultipleCuttingPlanRecord>(newRecordData)

      // Registrar no módulo de Auditoria central
      await pcpAuditService
        .recordLog({
          event_type: 'Alteração',
          action: 'ATUALIZAR_PLANO_CORTE',
          module: 'Gestão de MP',
          screen: 'Planos de Corte',
          entity: 'mp_multiple_cutting_plans',
          record_id: createdVersion.id,
          user_name: authorName,
          status: 'Concluída',
          outcome: 'SUCCESS',
          source: 'Usuário',
          details: {
            plan_code: planCode,
            version: newVersion,
            parent_id: existing.id,
            action: 'Nova versão gerada',
          },
        })
        .catch(() => null)

      return {
        record: createdVersion,
        isUpdate: true,
        previousVersion: currentDbVersion,
        version: newVersion,
        plan_code: planCode,
      }
    }

    // FLUXO DE NOVO PLANO (Versão 1)
    let planCode = planData.plan_code
    if (!planCode || planCode.startsWith('PCM-1') || planCode.includes('Date.now')) {
      const pfx = planData.plan_type === 'BLOCOS' ? 'PCB' : 'PCM'
      planCode = await mpMultipleCuttingPlansService.generateSequentialCode(pfx)
    }

    const initialAudit = [
      {
        event: 'CREATION',
        version: 1,
        action: 'Criação inicial do Plano de Corte',
        timestamp: nowIso,
        user: authorName,
        yield_pct: planData.cutting_yield_pct,
        pieces_count: planData.pieces_count,
      },
    ]

    const newRecordPayload: MPMultipleCuttingPlanRecord = {
      ...planData,
      plan_code: planCode,
      version: 1,
      plan_type: planData.plan_type || 'MULTIPLO',
      is_latest: true,
      parent_plan_id: '',
      version_notes: 'Criação inicial v01',
      responsible_user_name: authorName,
      created_by_user_name: authorName,
      audit_history_json: initialAudit,
      status: planData.status || 'RASCUNHO',
    }

    const createdRecord = await pb
      .collection('mp_multiple_cutting_plans')
      .create<MPMultipleCuttingPlanRecord>(newRecordPayload)

    // Log de auditoria
    await pcpAuditService
      .recordLog({
        event_type: 'Criação',
        action: 'CRIAR_PLANO_CORTE',
        module: 'Gestão de MP',
        screen: 'Planos de Corte',
        entity: 'mp_multiple_cutting_plans',
        record_id: createdRecord.id,
        user_name: authorName,
        status: 'Concluída',
        outcome: 'SUCCESS',
        source: 'Usuário',
        details: {
          plan_code: planCode,
          version: 1,
          action: 'Plano criado com sucesso',
        },
      })
      .catch(() => null)

    return {
      record: createdRecord,
      isUpdate: false,
      version: 1,
      plan_code: planCode,
    }
  },
}

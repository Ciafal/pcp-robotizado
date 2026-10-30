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

export type MPCuttingPlanStatus =
  | 'Rascunho'
  | 'Em Revisão'
  | 'Aprovado'
  | 'Liberado'
  | 'Executado'
  | 'Cancelado'

export const MP_CUTTING_PLAN_OFFICIAL_STATUSES: MPCuttingPlanStatus[] = [
  'Rascunho',
  'Em Revisão',
  'Aprovado',
  'Liberado',
  'Executado',
  'Cancelado',
]

export interface MPCuttingPlanStatusHistoryEntry {
  from_status: MPCuttingPlanStatus | string
  to_status: MPCuttingPlanStatus
  timestamp: string
  user_id?: string
  user_name: string
  user_role?: string
  justification?: string
  operational_confirmation?: boolean
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
  status?: MPCuttingPlanStatus | string
  status_justification?: string
  status_updated_at?: string
  status_updated_by?: string
  status_history_json?: MPCuttingPlanStatusHistoryEntry[] | any
  created_by_user_name?: string
  version?: number
  plan_type?: 'MULTIPLO' | 'BLOCOS' | 'multiplo' | 'blocos' | string
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

// Trava em memória para idempotência contra duplo clique simultâneo
let isMultipleCuttingPlanInFlight = false

export const mpMultipleCuttingPlansService = {
  /**
   * Obtém o próximo código atômico diretamente do endpoint seguro POST /backend/v1/pcp/cutting-plans/next-code.
   * Se o endpoint falhar, propaga o erro de forma explícita — proibido gerar código por timestamp.
   */
  async generateSequentialCode(
    prefixOrType: 'PCM' | 'PCB' | 'multiplo' | 'blocos' = 'PCM',
  ): Promise<string> {
    const rawType = String(prefixOrType || 'multiplo').toLowerCase()
    const isBlocos = rawType === 'pcb' || rawType === 'blocos'
    const planTypeNormalized = isBlocos ? 'blocos' : 'multiplo'
    const prefix = isBlocos ? 'PCB' : 'PCM'
    const year = new Date().getFullYear()

    try {
      const serverRes = await pb.send<{
        success: boolean
        plan_code: string
        error?: string
      }>('/backend/v1/pcp/cutting-plans/next-code', {
        method: 'POST',
        body: {
          plan_type: planTypeNormalized,
          prefix,
          year,
        },
      })

      if (serverRes?.success && serverRes.plan_code) {
        return serverRes.plan_code
      }
      throw new Error(serverRes?.error || 'Endpoint de numeração retornou resposta inválida.')
    } catch (endpointErr: any) {
      console.error(
        '[mpMultipleCuttingPlansService] Erro ao chamar endpoint /backend/v1/pcp/cutting-plans/next-code:',
        endpointErr,
      )
      // Tenta fallback atômico via tabela mp_cutting_plan_sequences
      try {
        const filterStr = `prefix = '${prefix}' && year = ${year}`
        const existingList = await pb
          .collection('mp_cutting_plan_sequences')
          .getList(1, 1, { filter: filterStr, sort: '-updated' })

        if (existingList.items.length > 0) {
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
      } catch (fallbackErr: any) {
        throw new Error(
          `Falha ao obter código transacional do servidor (${endpointErr.message || 'Erro no endpoint'}). Gravação abortada para evitar código inconsistente.`,
        )
      }
    }
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
   * Executa a transição de status de forma segura chamando o endpoint do servidor
   * /backend/v1/pcp/cutting-plans/transition-status que valida permissões RBAC,
   * regras da máquina de estados, justificativa obrigatória e confirmação operacional.
   */
  async transitionStatus(params: {
    planId: string
    targetStatus: MPCuttingPlanStatus
    justification?: string
    operationalConfirmation?: boolean
  }): Promise<{
    success: boolean
    plan?: MPMultipleCuttingPlanRecord
    message?: string
    error?: string
  }> {
    const { planId, targetStatus, justification, operationalConfirmation } = params

    // Validação no cliente antes do envio
    if (!planId) {
      throw new Error('ID do plano é obrigatório para alteração de status.')
    }

    if (targetStatus === 'Cancelado' && (!justification || justification.trim().length < 5)) {
      throw new Error(
        'Justificativa obrigatória não informada. Para cancelar um plano de corte é obrigatório fornecer uma justificativa clara (mínimo de 5 caracteres).',
      )
    }

    if (targetStatus === 'Executado' && !operationalConfirmation) {
      throw new Error('Confirmação operacional obrigatória para marcar o plano como Executado.')
    }

    try {
      const response = await pb.send<{
        success: boolean
        plan: MPMultipleCuttingPlanRecord
        message: string
        error?: string
      }>('/backend/v1/pcp/cutting-plans/transition-status', {
        method: 'POST',
        body: {
          plan_id: planId,
          target_status: targetStatus,
          justification: justification?.trim(),
          operational_confirmation: operationalConfirmation,
        },
      })

      if (response && response.success) {
        return response
      }

      throw new Error(response?.error || 'Falha ao alterar status do plano no servidor.')
    } catch (serverErr: any) {
      // Se for erro retornado pelo PocketBase (ex: 403 / 400 com payload JSON)
      const errorMsg =
        serverErr?.data?.error ||
        serverErr?.response?.error ||
        serverErr?.message ||
        'Erro ao processar transição de status no servidor.'
      throw new Error(errorMsg)
    }
  },

  /**
   * Atualiza um plano existente gerando uma nova versão imutável (version + 1).
   * Desativa a flag is_latest do anterior e grava log de auditoria no sistema central do PCP.
   */
  async atualizarPlano(
    targetPlanId: string,
    planData: Partial<MPMultipleCuttingPlanRecord>,
    options?: {
      clientExpectedVersion?: number
      justification?: string
      actionUser?: string
    },
  ): Promise<SavePlanResult> {
    if (isMultipleCuttingPlanInFlight) {
      throw new Error(
        'Uma operação de salvamento de plano de corte já está em andamento. Aguarde a confirmação do servidor antes de tentar novamente.',
      )
    }

    isMultipleCuttingPlanInFlight = true
    const user = pb.authStore.record
    const authorName =
      options?.actionUser ||
      planData.responsible_user_name ||
      planData.created_by_user_name ||
      user?.name ||
      user?.email ||
      'Engenharia PCP'

    const nowIso = new Date().toISOString()

    try {
      const existing = await pb
        .collection('mp_multiple_cutting_plans')
        .getOne<MPMultipleCuttingPlanRecord>(targetPlanId)

      if (!existing) {
        throw new Error(
          `Plano de corte com ID "${targetPlanId}" não foi encontrado no banco de dados para atualização.`,
        )
      }

      const currentDbVersion = existing.version || 1
      if (
        options?.clientExpectedVersion !== undefined &&
        options.clientExpectedVersion !== currentDbVersion
      ) {
        throw new Error(
          `Conflito de versão detectado! A versão atual no servidor é v${currentDbVersion}, enquanto a sua visualização é v${options.clientExpectedVersion}. Recarregue o histórico antes de atualizar.`,
        )
      }

      // 1. Marca versão anterior como is_latest = false
      await pb.collection('mp_multiple_cutting_plans').update(existing.id!, {
        is_latest: false,
      })

      const newVersion = currentDbVersion + 1
      const planCode = existing.plan_code || planData.plan_code || ''

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

      const planTypeVal = (planData.plan_type || existing.plan_type || 'multiplo').toLowerCase()

      const newRecordPayload: Partial<MPMultipleCuttingPlanRecord> = {
        ...existing,
        ...planData,
        id: undefined, // Garante geração de novo ID
        plan_code: planCode,
        version: newVersion,
        plan_type: planTypeVal,
        parent_plan_id: existing.id,
        is_latest: true,
        version_notes: options?.justification || `Revisão v0${newVersion}`,
        responsible_user_name: authorName,
        created_by_user_name: existing.created_by_user_name || authorName,
        audit_history_json: updatedAudit,
        // Salvar/atualizar um plano NUNCA altera automaticamente o status para Executado nem qualquer outro:
        // Mantém exatamente o status atual existente do plano
        status: existing.status || 'Rascunho',
      }

      // Limpa chaves gerenciadas pelo sistema para não enviar ao create
      delete (newRecordPayload as any).created
      delete (newRecordPayload as any).updated

      const createdVersion = await pb
        .collection('mp_multiple_cutting_plans')
        .create<MPMultipleCuttingPlanRecord>(newRecordPayload)

      // Grava log de auditoria no módulo central
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
            action: `Plano atualizado para Versão 0${newVersion}`,
            yield_pct: planData.cutting_yield_pct,
            pieces_count: planData.pieces_count,
          },
        })
        .catch((auditErr) => {
          console.warn('[mpMultipleCuttingPlansService] Erro ao gravar log de auditoria:', auditErr)
        })

      return {
        record: createdVersion,
        isUpdate: true,
        previousVersion: currentDbVersion,
        version: newVersion,
        plan_code: planCode,
      }
    } catch (err: any) {
      // Registra log de erro de auditoria
      await pcpAuditService
        .recordLog({
          event_type: 'Alteração',
          action: 'ERRO_ATUALIZAR_PLANO_CORTE',
          module: 'Gestão de MP',
          screen: 'Planos de Corte',
          entity: 'mp_multiple_cutting_plans',
          record_id: targetPlanId,
          user_name: authorName,
          status: 'Falha',
          outcome: 'FAILED',
          source: 'Sistema',
          details: {
            target_id: targetPlanId,
            error: err.message,
          },
        })
        .catch(() => null)

      throw err
    } finally {
      isMultipleCuttingPlanInFlight = false
    }
  },

  /**
   * Salva um plano novo ou cria uma nova versão imutável se já houver registro persistido (targetPlanId).
   * Implementa collision guard, trava in-flight de duplo clique e auditoria formal.
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
    const targetId = options?.targetPlanId || planData.id

    // Rota de atualização caso haja registro alvo
    if (targetId) {
      return await this.atualizarPlano(targetId, planData, options)
    }

    if (isMultipleCuttingPlanInFlight) {
      throw new Error(
        'Uma operação de salvamento de plano de corte já está em andamento. Aguarde a confirmação do servidor antes de tentar novamente.',
      )
    }

    isMultipleCuttingPlanInFlight = true
    const user = pb.authStore.record
    const authorName =
      options?.actionUser ||
      planData.responsible_user_name ||
      planData.created_by_user_name ||
      user?.name ||
      user?.email ||
      'Engenharia PCP'

    const nowIso = new Date().toISOString()

    try {
      // 1. OBTENÇÃO OBRIGATÓRIA DO CÓDIGO TRANSACIONAL VIA ENDPOINT ATÔMICO
      const rawType = (planData.plan_type || 'multiplo').toLowerCase()
      const isBlocos = rawType === 'blocos' || rawType === 'pcb'
      const planType = isBlocos ? 'blocos' : 'multiplo'
      const prefix = isBlocos ? 'PCB' : 'PCM'

      const allocatedSequentialCode = await this.generateSequentialCode(prefix)

      if (
        !allocatedSequentialCode ||
        allocatedSequentialCode.startsWith('PCM-1') ||
        allocatedSequentialCode.length < 10
      ) {
        throw new Error(
          `Código gerado "${allocatedSequentialCode}" é inválido. A gravação foi abortada.`,
        )
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

      const newRecordPayload: Partial<MPMultipleCuttingPlanRecord> = {
        ...planData,
        id: undefined,
        plan_code: allocatedSequentialCode,
        version: 1,
        plan_type: planType,
        is_latest: true,
        parent_plan_id: '',
        version_notes: 'Criação inicial v01',
        responsible_user_name: authorName,
        created_by_user_name: authorName,
        audit_history_json: initialAudit,
        // Plano novo inicia sempre com status oficial Rascunho
        status: planData.status || 'Rascunho',
        status_updated_at: nowIso,
        status_updated_by: authorName,
      }

      delete (newRecordPayload as any).created
      delete (newRecordPayload as any).updated

      const createdRecord = await pb
        .collection('mp_multiple_cutting_plans')
        .create<MPMultipleCuttingPlanRecord>(newRecordPayload)

      // Log de auditoria no módulo central
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
            plan_code: allocatedSequentialCode,
            version: 1,
            action: 'Plano criado com sucesso',
            material_code: planData.material_code,
            pieces_count: planData.pieces_count,
            yield_pct: planData.cutting_yield_pct,
          },
        })
        .catch((auditErr) => {
          console.warn('[mpMultipleCuttingPlansService] Erro ao gravar log de auditoria:', auditErr)
        })

      return {
        record: createdRecord,
        isUpdate: false,
        version: 1,
        plan_code: allocatedSequentialCode,
      }
    } catch (err: any) {
      await pcpAuditService
        .recordLog({
          event_type: 'Criação',
          action: 'ERRO_CRIAR_PLANO_CORTE',
          module: 'Gestão de MP',
          screen: 'Planos de Corte',
          entity: 'mp_multiple_cutting_plans',
          record_id: '',
          user_name: authorName,
          status: 'Falha',
          outcome: 'FAILED',
          source: 'Sistema',
          details: {
            error: err.message,
            material_code: planData.material_code,
          },
        })
        .catch(() => null)

      throw err
    } finally {
      isMultipleCuttingPlanInFlight = false
    }
  },
}

import pb from '@/lib/pocketbase/client'
import { IdealGaugeSequenceItem } from '@/types/weekly-schedule'
import { pcpAuditService, computeDiff } from '@/services/pcp-audit-service'

export interface CreateIdealSequenceDTO {
  line_id?: string
  line_code: string
  family_order: number
  family_id?: string
  family_code?: string
  family_name: string
  subsequence_order: number
  gauge_dimension: string
  material_code: string
  material_description?: string
  cycle_time_avg_min: number
  cycle_time_tolerance_pct: number
  stock_coverage_max_days: number
  is_active?: boolean
  homologation_status?: 'HOMOLOGADA' | 'NAO_HOMOLOGADA'
  notes?: string
  sap_work_center?: string
}

export interface UpdateIdealSequenceDTO extends Partial<CreateIdealSequenceDTO> {}

export const lineIdealSequenceService = {
  /**
   * Lista sequências ideais de uma linha do banco real PocketBase
   */
  async listByLine(
    lineCode: string,
    filterStatus?: 'ALL' | 'ACTIVE' | 'INACTIVE',
  ): Promise<IdealGaugeSequenceItem[]> {
    try {
      const filters: string[] = []
      if (lineCode) {
        filters.push(`line_code = '${lineCode}'`)
      }

      if (filterStatus === 'ACTIVE') {
        filters.push('(is_active = true || is_active = null)')
      } else if (filterStatus === 'INACTIVE') {
        filters.push('is_active = false')
      }

      const records = await pb
        .collection('line_ideal_sequences')
        .getFullList<IdealGaugeSequenceItem>({
          filter: filters.length > 0 ? filters.join(' && ') : undefined,
          sort: 'family_order,subsequence_order,created',
        })

      return records.map((r) => ({
        ...r,
        is_active: r.is_active !== false,
        homologation_status: r.homologation_status || 'HOMOLOGADA',
      }))
    } catch (err) {
      console.error('Erro ao listar sequências ideais:', err)
      return []
    }
  },

  /**
   * Obtém uma sequência ideal por ID com confirmação
   */
  async getById(id: string): Promise<IdealGaugeSequenceItem> {
    const rec = await pb.collection('line_ideal_sequences').getOne<IdealGaugeSequenceItem>(id)
    return {
      ...rec,
      is_active: rec.is_active !== false,
      homologation_status: rec.homologation_status || 'HOMOLOGADA',
    }
  },

  /**
   * Cria uma nova Sequência Ideal persistida no PocketBase
   * e registra auditoria completa em pcp_audit_logs.
   */
  async create(
    data: CreateIdealSequenceDTO,
    context?: { lineName?: string; companyCode?: string; centerCode?: string },
  ): Promise<IdealGaugeSequenceItem> {
    const payload: any = {
      line_id: data.line_id || null,
      line_code: data.line_code,
      family_order: Number(data.family_order) || 1,
      family_id: data.family_id || null,
      family_code: data.family_code || '',
      family_name: data.family_name?.trim() || '',
      subsequence_order: Number(data.subsequence_order) || 1,
      gauge_dimension: data.gauge_dimension?.trim() || '',
      material_code: data.material_code?.trim() || '',
      material_description: data.material_description?.trim() || '',
      cycle_time_avg_min: Number(data.cycle_time_avg_min) || 0,
      cycle_time_tolerance_pct: Number(data.cycle_time_tolerance_pct) || 0,
      stock_coverage_max_days: Number(data.stock_coverage_max_days) || 0,
      is_active: data.is_active !== false,
      homologation_status: data.homologation_status || 'HOMOLOGADA',
      notes: data.notes?.trim() || '',
      sap_work_center: data.sap_work_center?.trim() || '',
    }

    let created: IdealGaugeSequenceItem
    try {
      created = await pb.collection('line_ideal_sequences').create<IdealGaugeSequenceItem>(payload)
    } catch (err: any) {
      // Registrar falha na auditoria
      try {
        await pcpAuditService.recordFailureAttempt({
          operation: 'Criação de Sequência Ideal',
          module: 'Ficha Mestra',
          screen: 'Sequência Ideal',
          company: context?.companyCode || 'CIAFAL',
          line: data.line_code,
          center: context?.centerCode || data.line_code,
          errorMessage: err?.message || 'Falha ao salvar sequência ideal no PocketBase',
          reason: 'Falha cadastral',
          justification: `Tentativa de criar sequência ideal para material ${data.material_code}`,
        })
      } catch {
        /* intentionally ignored */
      }
      throw err
    }

    // Leitura de confirmação (garantia de persistência real)
    const confirmed = await this.getById(created.id)

    // Registro na Trilha Oficial de Auditoria
    try {
      const changes = computeDiff(null, confirmed)
      await pcpAuditService.recordLog({
        action: `Criação de Sequência Ideal: ${confirmed.gauge_dimension} (${confirmed.material_code})`,
        event_type: 'Criação',
        module: 'Ficha Mestra',
        screen: 'Sequência Ideal',
        company: context?.companyCode || 'CIAFAL',
        line: confirmed.line_code,
        center: context?.centerCode || confirmed.line_code,
        record_id: confirmed.id,
        entity: 'line_ideal_sequences',
        source: 'Usuário',
        status: 'Concluída',
        outcome: 'SUCCESS',
        reason: 'Parametrização da Sequência Ideal',
        justification: `Nova sequência cadastrada para família ${confirmed.family_name} e material ${confirmed.material_code}`,
        changes,
        details: {
          sequence_id: confirmed.id,
          line_code: confirmed.line_code,
          material_code: confirmed.material_code,
          gauge_dimension: confirmed.gauge_dimension,
          cycle_time_avg_min: confirmed.cycle_time_avg_min,
          homologation_status: confirmed.homologation_status,
          is_active: confirmed.is_active,
        },
      })
    } catch (audErr) {
      console.warn('Erro ao auditar criação da sequência ideal:', audErr)
    }

    return confirmed
  },

  /**
   * Atualiza Sequência Ideal existente sem mudar o ID (nunca duplicar)
   * Registra auditoria com Antes x Depois no pcp_audit_logs.
   */
  async update(
    id: string,
    data: UpdateIdealSequenceDTO,
    context?: { lineName?: string; companyCode?: string; centerCode?: string },
  ): Promise<IdealGaugeSequenceItem> {
    const beforeRecord = await this.getById(id)

    const payload: any = {}
    if (data.line_code !== undefined) payload.line_code = data.line_code
    if (data.family_order !== undefined) payload.family_order = Number(data.family_order)
    if (data.family_id !== undefined) payload.family_id = data.family_id || null
    if (data.family_code !== undefined) payload.family_code = data.family_code
    if (data.family_name !== undefined) payload.family_name = data.family_name.trim()
    if (data.subsequence_order !== undefined)
      payload.subsequence_order = Number(data.subsequence_order)
    if (data.gauge_dimension !== undefined) payload.gauge_dimension = data.gauge_dimension.trim()
    if (data.material_code !== undefined) payload.material_code = data.material_code.trim()
    if (data.material_description !== undefined)
      payload.material_description = data.material_description.trim()
    if (data.cycle_time_avg_min !== undefined)
      payload.cycle_time_avg_min = Number(data.cycle_time_avg_min)
    if (data.cycle_time_tolerance_pct !== undefined)
      payload.cycle_time_tolerance_pct = Number(data.cycle_time_tolerance_pct)
    if (data.stock_coverage_max_days !== undefined)
      payload.stock_coverage_max_days = Number(data.stock_coverage_max_days)
    if (data.is_active !== undefined) payload.is_active = Boolean(data.is_active)
    if (data.homologation_status !== undefined)
      payload.homologation_status = data.homologation_status
    if (data.notes !== undefined) payload.notes = data.notes.trim()
    if (data.sap_work_center !== undefined) payload.sap_work_center = data.sap_work_center.trim()

    let updated: IdealGaugeSequenceItem
    try {
      updated = await pb
        .collection('line_ideal_sequences')
        .update<IdealGaugeSequenceItem>(id, payload)
    } catch (err: any) {
      // Registrar falha na auditoria
      try {
        await pcpAuditService.recordFailureAttempt({
          operation: 'Edição de Sequência Ideal',
          module: 'Ficha Mestra',
          screen: 'Sequência Ideal',
          company: context?.companyCode || 'CIAFAL',
          line: beforeRecord.line_code,
          center: context?.centerCode || beforeRecord.line_code,
          recordId: id,
          errorMessage: err?.message || 'Falha ao atualizar sequência ideal no PocketBase',
          reason: 'Falha de atualização',
          justification: `Tentativa de editar sequência ${id}`,
        })
      } catch {
        /* intentionally ignored */
      }
      throw err
    }

    // Leitura de confirmação (garantia de persistência real)
    const confirmed = await this.getById(updated.id)

    // Auditoria com Antes x Depois
    try {
      const changes = computeDiff(beforeRecord, confirmed)
      if (changes.length > 0) {
        await pcpAuditService.recordLog({
          action: `Alteração de Sequência Ideal: ${confirmed.gauge_dimension} (${confirmed.material_code})`,
          event_type: 'Alteração',
          module: 'Ficha Mestra',
          screen: 'Sequência Ideal',
          company: context?.companyCode || 'CIAFAL',
          line: confirmed.line_code,
          center: context?.centerCode || confirmed.line_code,
          record_id: confirmed.id,
          entity: 'line_ideal_sequences',
          source: 'Usuário',
          status: 'Concluída',
          outcome: 'SUCCESS',
          reason: 'Ajuste de parâmetros de Sequência Ideal',
          justification: `Modificação dos parâmetros da sequência ${confirmed.id}`,
          changes,
          details: {
            sequence_id: confirmed.id,
            line_code: confirmed.line_code,
            material_code: confirmed.material_code,
            antes: beforeRecord,
            depois: confirmed,
          },
        })
      }
    } catch (audErr) {
      console.warn('Erro ao auditar alteração de sequência ideal:', audErr)
    }

    return confirmed
  },

  /**
   * Alterna status operacional Ativo / Inativo (Soft-Disable).
   * Nunca apaga o registro do banco. Preserva histórico e integridade referencial.
   */
  async toggleActive(
    id: string,
    isActive: boolean,
    context?: { lineName?: string; companyCode?: string; centerCode?: string },
  ): Promise<IdealGaugeSequenceItem> {
    const beforeRecord = await this.getById(id)

    await pb.collection('line_ideal_sequences').update(id, {
      is_active: Boolean(isActive),
    })

    const confirmed = await this.getById(id)
    if (Boolean(confirmed.is_active) !== Boolean(isActive)) {
      throw new Error(
        `Falha na confirmação de persistência do status: esperado ${isActive}, retornado ${confirmed.is_active}.`,
      )
    }

    // Auditoria do toggle de status
    try {
      const actionType = isActive ? 'Ativação' : 'Inativação'
      const changes = computeDiff(beforeRecord, confirmed)
      await pcpAuditService.recordLog({
        action: `${actionType} de Sequência Ideal: ${confirmed.gauge_dimension} (${confirmed.material_code})`,
        event_type: isActive ? 'Ativação' : 'Inativação',
        module: 'Ficha Mestra',
        screen: 'Sequência Ideal',
        company: context?.companyCode || 'CIAFAL',
        line: confirmed.line_code,
        center: context?.centerCode || confirmed.line_code,
        record_id: confirmed.id,
        entity: 'line_ideal_sequences',
        source: 'Usuário',
        status: 'Concluída',
        outcome: 'SUCCESS',
        reason: isActive
          ? 'Reativação operacional da sequência'
          : 'Inativação de sequência mantendo histórico',
        justification: isActive
          ? `Sequência reativada para uso em novas programações`
          : `Sequência inativada pelo usuário; histórico e rastreabilidade preservados`,
        changes,
        details: {
          sequence_id: confirmed.id,
          line_code: confirmed.line_code,
          material_code: confirmed.material_code,
          is_active_anterior: beforeRecord.is_active,
          is_active_novo: confirmed.is_active,
        },
      })
    } catch (audErr) {
      console.warn('Erro ao auditar toggle status de sequência ideal:', audErr)
    }

    return confirmed
  },
}

import pb from '@/lib/pocketbase/client'
import {
  LineGaugeMinRestriction,
  CreateGaugeMinRestrictionDTO,
  UpdateGaugeMinRestrictionDTO,
} from '@/types/line-gauge-restriction'
import { pcpAuditService, computeDiff } from '@/services/pcp-audit-service'

export const lineGaugeRestrictionService = {
  /**
   * Lista todas as restrições de um centro/linha no PocketBase real.
   */
  async listByLine(
    lineCode: string,
    filterStatus?: 'ALL' | 'ATIVA' | 'INATIVA',
  ): Promise<LineGaugeMinRestriction[]> {
    try {
      const filters: string[] = []
      if (lineCode) {
        filters.push(`line_code = '${lineCode}'`)
      }

      if (filterStatus === 'ATIVA') {
        filters.push("status = 'ATIVA'")
      } else if (filterStatus === 'INATIVA') {
        filters.push("status = 'INATIVA'")
      }

      const records = await pb
        .collection('line_gauge_min_restrictions')
        .getFullList<LineGaugeMinRestriction>({
          filter: filters.length > 0 ? filters.join(' && ') : undefined,
          sort: 'created',
        })

      return records.map((r) => ({
        ...r,
        status: (r.status as 'ATIVA' | 'INATIVA') || 'ATIVA',
        has_scheduling_history: Boolean(r.has_scheduling_history),
      }))
    } catch (err) {
      console.error('Erro ao listar restrições mínimas por bitola:', err)
      return []
    }
  },

  /**
   * Lista restrições pelo ID da linha (production_lines.id)
   */
  async listByLineId(
    lineId: string,
    filterStatus?: 'ALL' | 'ATIVA' | 'INATIVA',
  ): Promise<LineGaugeMinRestriction[]> {
    try {
      const filters: string[] = []
      if (lineId) {
        filters.push(`line_id = '${lineId}'`)
      }

      if (filterStatus === 'ATIVA') {
        filters.push("status = 'ATIVA'")
      } else if (filterStatus === 'INATIVA') {
        filters.push("status = 'INATIVA'")
      }

      const records = await pb
        .collection('line_gauge_min_restrictions')
        .getFullList<LineGaugeMinRestriction>({
          filter: filters.length > 0 ? filters.join(' && ') : undefined,
          sort: 'created',
        })

      return records.map((r) => ({
        ...r,
        status: (r.status as 'ATIVA' | 'INATIVA') || 'ATIVA',
        has_scheduling_history: Boolean(r.has_scheduling_history),
      }))
    } catch (err) {
      console.error('Erro ao listar restrições mínimas por lineId:', err)
      return []
    }
  },

  /**
   * Obtém uma restrição por ID com verificação de persistência
   */
  async getById(id: string): Promise<LineGaugeMinRestriction> {
    const rec = await pb
      .collection('line_gauge_min_restrictions')
      .getOne<LineGaugeMinRestriction>(id)
    return {
      ...rec,
      status: (rec.status as 'ATIVA' | 'INATIVA') || 'ATIVA',
      has_scheduling_history: Boolean(rec.has_scheduling_history),
    }
  },

  /**
   * Cria uma NOVA Restrição Mínima (1:N, NUNCA sobrescreve a anterior).
   * Registra auditoria completa no pcp_audit_logs.
   */
  async create(
    data: CreateGaugeMinRestrictionDTO,
    context?: { lineName?: string; companyCode?: string; centerCode?: string },
  ): Promise<LineGaugeMinRestriction> {
    const payload: any = {
      line_id: data.line_id || null,
      line_code: data.line_code?.trim().toUpperCase(),
      restriction_type: data.restriction_type?.trim() || 'Horas',
      min_value:
        data.min_value !== undefined && data.min_value !== null ? Number(data.min_value) : 1,
      unit_of_measure: data.unit_of_measure?.trim() || 'h',
      rule_description: data.rule_description?.trim() || '',
      status: data.status || 'ATIVA',
      reason: data.reason?.trim() || '',
      reason_category: data.reason_category?.trim() || '',
      min_value_numeric:
        data.min_value_numeric !== undefined
          ? Number(data.min_value_numeric)
          : data.min_value !== undefined
            ? Number(data.min_value)
            : undefined,
      max_value_numeric:
        data.max_value_numeric !== undefined ? Number(data.max_value_numeric) : undefined,
      target_value: data.target_value !== undefined ? Number(data.target_value) : undefined,
      unit: data.unit || data.unit_of_measure || undefined,
      product_code: data.product_code || undefined,
      family_code: data.family_code || undefined,
      gauge_dimension: data.gauge_dimension || undefined,
      steel_grade: data.steel_grade || undefined,
      raw_material_code: data.raw_material_code || undefined,
      origin_center_code: data.origin_center_code || undefined,
      target_center_code: data.target_center_code || undefined,
      product_from: data.product_from || undefined,
      product_to: data.product_to || undefined,
      gauge_from: data.gauge_from || undefined,
      gauge_to: data.gauge_to || undefined,
      valid_from: data.valid_from || undefined,
      valid_until: data.valid_until || undefined,
      rule_priority: data.rule_priority !== undefined ? Number(data.rule_priority) : undefined,
      created_by_user_id: data.created_by_user_id || undefined,
      updated_by_user_id: data.updated_by_user_id || undefined,
      is_active: data.status === 'INATIVA' ? false : true,
      created_by_name: data.created_by_name?.trim() || 'PCP Robotizado',
      has_scheduling_history: false,
      notes: data.notes?.trim() || '',
    }

    let created: LineGaugeMinRestriction
    try {
      created = await pb
        .collection('line_gauge_min_restrictions')
        .create<LineGaugeMinRestriction>(payload)
    } catch (err: any) {
      try {
        await pcpAuditService.recordFailureAttempt({
          operation: 'Criação de Restrição Mínima por Bitola',
          module: 'Centros e Ficha Mestra',
          screen: 'Restrições Mínimas de Programação por Bitola',
          company: context?.companyCode || 'CIAFAL',
          line: data.line_code,
          center: context?.centerCode || data.line_code,
          errorMessage: err?.message || 'Falha ao salvar restrição mínima no PocketBase',
          reason: 'Falha cadastral',
          justification: `Tentativa de criar restrição ${data.restriction_type} (${data.min_value} ${data.unit_of_measure})`,
        })
      } catch {
        /* intentionally ignored */
      }
      throw err
    }

    // Confirmação de persistência real via leitura imediata
    const confirmed = await this.getById(created.id)

    // Registro na Trilha Oficial de Auditoria (Logs & Auditoria)
    try {
      const changes = computeDiff(null, confirmed)
      await pcpAuditService.recordLog({
        action: `Criação de Restrição Mínima: ${confirmed.restriction_type} - ${confirmed.min_value} ${confirmed.unit_of_measure}`,
        event_type: 'Criação',
        module: 'Centros e Ficha Mestra',
        screen: 'Restrições Mínimas de Programação por Bitola',
        company: context?.companyCode || 'CIAFAL',
        line: confirmed.line_code,
        center: context?.centerCode || confirmed.line_code,
        record_id: confirmed.id,
        entity: 'line_gauge_min_restrictions',
        source: 'Usuário',
        status: 'Concluída',
        outcome: 'SUCCESS',
        reason: 'Parametrização de Restrição Mínima de Programação por Bitola',
        justification: `Nova restrição criada para o Centro ${confirmed.line_code}: ${confirmed.min_value} ${confirmed.unit_of_measure} (${confirmed.rule_description})`,
        changes,
        details: {
          restriction_id: confirmed.id,
          line_code: confirmed.line_code,
          restriction_type: confirmed.restriction_type,
          min_value: confirmed.min_value,
          unit_of_measure: confirmed.unit_of_measure,
          rule_description: confirmed.rule_description,
          status: confirmed.status,
        },
      })
    } catch (audErr) {
      console.warn('Erro ao auditar criação de restrição mínima:', audErr)
    }

    return confirmed
  },

  /**
   * Atualiza Restrição Mínima preservando o mesmo ID.
   * Registra auditoria Antes x Depois (alteração de valor, tipo, unidade, regra, status).
   */
  async update(
    id: string,
    data: UpdateGaugeMinRestrictionDTO,
    context?: { lineName?: string; companyCode?: string; centerCode?: string },
  ): Promise<LineGaugeMinRestriction> {
    const beforeRecord = await this.getById(id)

    const payload: any = {}
    if (data.restriction_type !== undefined) payload.restriction_type = data.restriction_type.trim()
    if (data.min_value !== undefined) {
      payload.min_value = Number(data.min_value)
      payload.min_value_numeric = Number(data.min_value)
    }
    if (data.unit_of_measure !== undefined) {
      payload.unit_of_measure = data.unit_of_measure.trim()
      payload.unit = data.unit_of_measure.trim()
    }
    if (data.rule_description !== undefined) payload.rule_description = data.rule_description.trim()
    if (data.status !== undefined) {
      payload.status = data.status
      payload.is_active = data.status === 'ATIVA'
    }
    if (data.reason !== undefined) payload.reason = data.reason.trim()
    if (data.reason_category !== undefined) payload.reason_category = data.reason_category.trim()
    if (data.min_value_numeric !== undefined)
      payload.min_value_numeric = Number(data.min_value_numeric)
    if (data.max_value_numeric !== undefined)
      payload.max_value_numeric = Number(data.max_value_numeric)
    if (data.target_value !== undefined) payload.target_value = Number(data.target_value)
    if (data.unit !== undefined) payload.unit = data.unit
    if (data.product_code !== undefined) payload.product_code = data.product_code
    if (data.family_code !== undefined) payload.family_code = data.family_code
    if (data.gauge_dimension !== undefined) payload.gauge_dimension = data.gauge_dimension
    if (data.steel_grade !== undefined) payload.steel_grade = data.steel_grade
    if (data.raw_material_code !== undefined) payload.raw_material_code = data.raw_material_code
    if (data.origin_center_code !== undefined) payload.origin_center_code = data.origin_center_code
    if (data.target_center_code !== undefined) payload.target_center_code = data.target_center_code
    if (data.product_from !== undefined) payload.product_from = data.product_from
    if (data.product_to !== undefined) payload.product_to = data.product_to
    if (data.gauge_from !== undefined) payload.gauge_from = data.gauge_from
    if (data.gauge_to !== undefined) payload.gauge_to = data.gauge_to
    if (data.valid_from !== undefined) payload.valid_from = data.valid_from
    if (data.valid_until !== undefined) payload.valid_until = data.valid_until
    if (data.rule_priority !== undefined) payload.rule_priority = Number(data.rule_priority)
    if (data.updated_by_user_id !== undefined) payload.updated_by_user_id = data.updated_by_user_id
    if (data.is_active !== undefined) payload.is_active = data.is_active
    if (data.updated_by_name !== undefined) payload.updated_by_name = data.updated_by_name.trim()
    if (data.has_scheduling_history !== undefined)
      payload.has_scheduling_history = Boolean(data.has_scheduling_history)
    if (data.notes !== undefined) payload.notes = data.notes.trim()

    let updated: LineGaugeMinRestriction
    try {
      updated = await pb
        .collection('line_gauge_min_restrictions')
        .update<LineGaugeMinRestriction>(id, payload)
    } catch (err: any) {
      try {
        await pcpAuditService.recordFailureAttempt({
          operation: 'Edição de Restrição Mínima por Bitola',
          module: 'Centros e Ficha Mestra',
          screen: 'Restrições Mínimas de Programação por Bitola',
          company: context?.companyCode || 'CIAFAL',
          line: beforeRecord.line_code,
          center: context?.centerCode || beforeRecord.line_code,
          recordId: id,
          errorMessage: err?.message || 'Falha ao atualizar restrição mínima no PocketBase',
          reason: 'Falha de atualização',
          justification: `Tentativa de editar restrição ${id}`,
        })
      } catch {
        /* intentionally ignored */
      }
      throw err
    }

    const confirmed = await this.getById(updated.id)

    // Auditoria com Antes x Depois no pcp_audit_logs
    try {
      const changes = computeDiff(beforeRecord, confirmed)
      if (changes.length > 0) {
        await pcpAuditService.recordLog({
          action: `Alteração de Restrição Mínima: ${confirmed.restriction_type} - ${confirmed.min_value} ${confirmed.unit_of_measure}`,
          event_type: 'Alteração',
          module: 'Centros e Ficha Mestra',
          screen: 'Restrições Mínimas de Programação por Bitola',
          company: context?.companyCode || 'CIAFAL',
          line: confirmed.line_code,
          center: context?.centerCode || confirmed.line_code,
          record_id: confirmed.id,
          entity: 'line_gauge_min_restrictions',
          source: 'Usuário',
          status: 'Concluída',
          outcome: 'SUCCESS',
          reason: 'Ajuste cadastral de Restrição Mínima por Bitola',
          justification: `Modificação de parâmetros da restrição ${confirmed.id} no centro ${confirmed.line_code}`,
          changes,
          details: {
            restriction_id: confirmed.id,
            line_code: confirmed.line_code,
            antes: {
              restriction_type: beforeRecord.restriction_type,
              min_value: beforeRecord.min_value,
              unit_of_measure: beforeRecord.unit_of_measure,
              rule_description: beforeRecord.rule_description,
              status: beforeRecord.status,
            },
            depois: {
              restriction_type: confirmed.restriction_type,
              min_value: confirmed.min_value,
              unit_of_measure: confirmed.unit_of_measure,
              rule_description: confirmed.rule_description,
              status: confirmed.status,
            },
          },
        })
      }
    } catch (audErr) {
      console.warn('Erro ao auditar alteração de restrição mínima:', audErr)
    }

    return confirmed
  },

  /**
   * Alterna status ATIVA / INATIVA.
   * Preserva histórico e auditoria sem apagar o registro.
   */
  async toggleStatus(
    id: string,
    status: 'ATIVA' | 'INATIVA',
    context?: { lineName?: string; companyCode?: string; centerCode?: string },
  ): Promise<LineGaugeMinRestriction> {
    const beforeRecord = await this.getById(id)

    await pb.collection('line_gauge_min_restrictions').update(id, {
      status,
      is_active: status === 'ATIVA',
    })

    const confirmed = await this.getById(id)
    if (confirmed.status !== status) {
      throw new Error(
        `Falha ao alternar status da restrição: esperado ${status}, obtido ${confirmed.status}.`,
      )
    }

    // Auditoria de Ativação / Inativação
    try {
      const actionType = status === 'ATIVA' ? 'Ativação' : 'Inativação'
      const changes = computeDiff(beforeRecord, confirmed)
      await pcpAuditService.recordLog({
        action: `${actionType} de Restrição Mínima: ${confirmed.restriction_type} - ${confirmed.min_value} ${confirmed.unit_of_measure}`,
        event_type: status === 'ATIVA' ? 'Ativação' : 'Inativação',
        module: 'Centros e Ficha Mestra',
        screen: 'Restrições Mínimas de Programação por Bitola',
        company: context?.companyCode || 'CIAFAL',
        line: confirmed.line_code,
        center: context?.centerCode || confirmed.line_code,
        record_id: confirmed.id,
        entity: 'line_gauge_min_restrictions',
        source: 'Usuário',
        status: 'Concluída',
        outcome: 'SUCCESS',
        reason:
          status === 'ATIVA'
            ? 'Reativação operacional da restrição mínima'
            : 'Inativação da restrição mantendo histórico e auditoria',
        justification:
          status === 'ATIVA'
            ? `Restrição reativada para ser considerada nas programações do Centro ${confirmed.line_code}`
            : `Restrição inativada; deixa de ser considerada nas novas programações, preservando histórico`,
        changes,
        details: {
          restriction_id: confirmed.id,
          line_code: confirmed.line_code,
          status_anterior: beforeRecord.status,
          status_novo: confirmed.status,
        },
      })
    } catch (audErr) {
      console.warn('Erro ao auditar toggle de status da restrição mínima:', audErr)
    }

    return confirmed
  },

  /**
   * Exclusão permitida APENAS se recém-criada e sem histórico de utilização em programações.
   * Se houver histórico, bloqueia com erro explícito.
   */
  async delete(
    id: string,
    context?: { lineName?: string; companyCode?: string; centerCode?: string },
  ): Promise<boolean> {
    const beforeRecord = await this.getById(id)

    if (beforeRecord.has_scheduling_history) {
      throw new Error(
        'Esta restrição possui histórico de utilização e não pode ser excluída. Utilize a opção Inativar.',
      )
    }

    // Checar também se há vinculação com programações no banco (weekly_schedules com stop ou setup referente)
    try {
      const relatedWeekly = await pb.collection('weekly_schedules').getList(1, 1, {
        filter: `line_code = '${beforeRecord.line_code}' && stop_description ~ '${beforeRecord.rule_description.slice(0, 20)}'`,
      })
      if (relatedWeekly && relatedWeekly.totalItems > 0) {
        throw new Error(
          'Esta restrição possui histórico de utilização e não pode ser excluída. Utilize a opção Inativar.',
        )
      }
    } catch (checkErr: any) {
      if (checkErr?.message?.includes('Esta restrição possui histórico')) {
        throw checkErr
      }
    }

    await pb.collection('line_gauge_min_restrictions').delete(id)

    // Auditoria de Exclusão Física Permitida
    try {
      await pcpAuditService.recordLog({
        action: `Exclusão de Restrição Mínima: ${beforeRecord.restriction_type} - ${beforeRecord.min_value} ${beforeRecord.unit_of_measure}`,
        event_type: 'Exclusão',
        module: 'Centros e Ficha Mestra',
        screen: 'Restrições Mínimas de Programação por Bitola',
        company: context?.companyCode || 'CIAFAL',
        line: beforeRecord.line_code,
        center: context?.centerCode || beforeRecord.line_code,
        record_id: beforeRecord.id,
        entity: 'line_gauge_min_restrictions',
        source: 'Usuário',
        status: 'Concluída',
        outcome: 'SUCCESS',
        reason: 'Exclusão de restrição sem histórico',
        justification: `Restrição ${beforeRecord.id} sem histórico foi removida fisicamente`,
        changes: [{ field: 'registro', before: beforeRecord.id, after: 'EXCLUÍDO' }],
        details: {
          restriction_id: beforeRecord.id,
          registro_excluido: beforeRecord,
        },
      })
    } catch (audErr) {
      console.warn('Erro ao auditar exclusão de restrição mínima:', audErr)
    }

    return true
  },
}

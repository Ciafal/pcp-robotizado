/**
 * Service de Perdas Teóricas vinculadas à Linha e Ficha Mestra
 * Collection: line_theoretical_losses
 *
 * Suporta:
 * - CRUD completo
 * - Valores percentuais de 0 a 100% com parser brasileiro (pt-BR, vírgula decimal)
 * - Exclusão lógica (deleted: true, deleted_at, deleted_by)
 * - Auditoria completa em pcp_audit_logs (criação, edição, exclusão lógica, restauração)
 * - Validações de limites e unicidade de combinação (linha + centro + MP + bitola + aplicação)
 */

import { pb } from '@/lib/pocketbase/client'
import { parsePtBrNumber, formatPtBrNumber } from '@/lib/number-format'

export interface LineTheoreticalLoss {
  id: string
  line_id: string
  line_master_id?: string
  center_code: string
  raw_material_type: string
  raw_material_code: string
  raw_material_description: string
  bitola: string
  application: string
  rm_pct: number
  carepa_pct: number
  apara_pct: number
  total_loss_pct?: number // calculado rm + carepa + apara
  deleted?: boolean
  deleted_at?: string | null
  deleted_by?: string | null
  created_by_user_id?: string | null
  created_by_user_name?: string | null
  updated_by_user_id?: string | null
  updated_by_user_name?: string | null
  notes?: string
  created?: string
  updated?: string
}

export interface TheoreticalLossFormData {
  id?: string
  line_id: string
  line_master_id?: string
  center_code: string
  raw_material_type: string
  raw_material_code: string
  raw_material_description: string
  bitola: string
  application: string
  rm_pct: string | number // aceita string '1,50' ou número 1.5
  carepa_pct: string | number
  apara_pct: string | number
  notes?: string
}

export interface TheoreticalLossValidationErrors {
  general?: string
  raw_material_type?: string
  raw_material_code?: string
  raw_material_description?: string
  bitola?: string
  application?: string
  rm_pct?: string
  carepa_pct?: string
  apara_pct?: string
  duplicate?: string
}

export const theoreticalLossesService = {
  /**
   * Converte valor flexível (string com vírgula ou number) para number float
   * Aceita formatos pt-BR (ex: "1,50", "0,75", "100") e padrão ("1.50")
   */
  parsePercentage(value: string | number | undefined | null): number | null {
    if (value === undefined || value === null) return null
    if (typeof value === 'number') {
      if (isNaN(value)) return null
      return value
    }
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = parsePtBrNumber(trimmed)
    if (parsed === null || isNaN(parsed)) return null
    return parsed
  },

  /**
   * Formata número percentual no padrão pt-BR com 2 casas decimais
   */
  formatPercentage(value: number | undefined | null, decimals = 2): string {
    if (value === undefined || value === null || isNaN(value)) return '0,00'
    return formatPtBrNumber(value, decimals)
  },

  /**
   * Valida os campos do formulário
   */
  validateFormData(data: TheoreticalLossFormData): TheoreticalLossValidationErrors {
    const errors: TheoreticalLossValidationErrors = {}

    if (!data.line_id || !data.center_code?.trim()) {
      errors.general = 'Identificação da Linha / Centro é obrigatória.'
    }

    if (!data.raw_material_type?.trim()) {
      errors.raw_material_type = 'Selecione o Tipo de Matéria-Prima.'
    }

    if (!data.raw_material_code?.trim()) {
      errors.raw_material_code = 'Informe o código da Matéria-Prima.'
    }

    if (!data.raw_material_description?.trim()) {
      errors.raw_material_description = 'Informe a descrição da Matéria-Prima.'
    }

    if (!data.bitola?.trim()) {
      errors.bitola = 'Selecione a Bitola ou "Não há".'
    }

    if (!data.application?.trim()) {
      errors.application = 'Informe a Aplicação.'
    }

    // Validação RM %
    const rm = this.parsePercentage(data.rm_pct)
    if (rm === null) {
      errors.rm_pct = 'Informe um percentual válido para RM (%) no padrão 0 a 100.'
    } else if (rm < 0 || rm > 100) {
      errors.rm_pct = 'RM (%) deve estar entre 0,00% e 100,00%.'
    }

    // Validação Carepa %
    const carepa = this.parsePercentage(data.carepa_pct)
    if (carepa === null) {
      errors.carepa_pct = 'Informe um percentual válido para Carepa (%) no padrão 0 a 100.'
    } else if (carepa < 0 || carepa > 100) {
      errors.carepa_pct = 'Carepa (%) deve estar entre 0,00% e 100,00%.'
    }

    // Validação Apara %
    const apara = this.parsePercentage(data.apara_pct)
    if (apara === null) {
      errors.apara_pct = 'Informe um percentual válido para Apara (%) no padrão 0 a 100.'
    } else if (apara < 0 || apara > 100) {
      errors.apara_pct = 'Apara (%) deve estar entre 0,00% e 100,00%.'
    }

    // Validação de soma de perdas (RM + Carepa + Apara não deve exceder 100%)
    if (rm !== null && carepa !== null && apara !== null) {
      const total = rm + carepa + apara
      if (total > 100) {
        errors.general = `A soma das perdas teóricas (${this.formatPercentage(total)}%) não pode ultrapassar 100,00%.`
      }
    }

    return errors
  },

  /**
   * Verifica se já existe um registro ativo (não excluído logicamente)
   * com a mesma chave composta: line_id + raw_material_code + bitola + application
   */
  async checkDuplicate(params: {
    lineId: string
    rawMaterialCode: string
    bitola: string
    application: string
    excludeId?: string
  }): Promise<boolean> {
    try {
      const cleanRmCode = params.rawMaterialCode.trim().toUpperCase()
      const cleanBitola = params.bitola.trim()
      const cleanApp = params.application.trim()

      const filterParts = [
        `line_id = '${params.lineId}'`,
        `deleted != true`,
        `raw_material_code ~ '${cleanRmCode}'`,
      ]

      const records = await pb
        .collection('line_theoretical_losses')
        .getFullList<LineTheoreticalLoss>({
          filter: filterParts.join(' && '),
        })

      return records.some((r) => {
        if (params.excludeId && r.id === params.excludeId) return false
        const matchRm = (r.raw_material_code || '').trim().toUpperCase() === cleanRmCode
        const matchBitola = (r.bitola || '').trim().toLowerCase() === cleanBitola.toLowerCase()
        const matchApp = (r.application || '').trim().toLowerCase() === cleanApp.toLowerCase()
        return matchRm && matchBitola && matchApp
      })
    } catch (err) {
      console.warn('Erro ao verificar duplicidade de perdas teóricas:', err)
      return false
    }
  },

  /**
   * Lista as perdas teóricas de uma linha (por padrão, apenas não excluídas logicamente)
   */
  async listByLine(
    lineId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<LineTheoreticalLoss[]> {
    try {
      const filter = options?.includeDeleted
        ? `line_id = '${lineId}'`
        : `line_id = '${lineId}' && deleted != true`

      const list = await pb.collection('line_theoretical_losses').getFullList<LineTheoreticalLoss>({
        filter,
        sort: '-created',
      })

      return list.map((item) => ({
        ...item,
        total_loss_pct: Number(
          ((item.rm_pct || 0) + (item.carepa_pct || 0) + (item.apara_pct || 0)).toFixed(2),
        ),
      }))
    } catch (err) {
      console.warn('Erro ao listar perdas teóricas da linha:', err)
      return []
    }
  },

  /**
   * Busca um registro por ID
   */
  async getById(id: string): Promise<LineTheoreticalLoss | null> {
    try {
      const item = await pb.collection('line_theoretical_losses').getOne<LineTheoreticalLoss>(id)
      return {
        ...item,
        total_loss_pct: Number(
          ((item.rm_pct || 0) + (item.carepa_pct || 0) + (item.apara_pct || 0)).toFixed(2),
        ),
      }
    } catch (err) {
      console.warn('Erro ao buscar perda teórica:', err)
      return null
    }
  },

  /**
   * Salva (cria ou atualiza) uma perda teórica com auditoria
   */
  async save(data: TheoreticalLossFormData): Promise<LineTheoreticalLoss> {
    const errors = this.validateFormData(data)
    if (Object.keys(errors).length > 0) {
      const firstMsg = Object.values(errors)[0]
      throw new Error(String(firstMsg || 'Dados do formulário de perda teórica inválidos.'))
    }

    const rmVal = this.parsePercentage(data.rm_pct) ?? 0
    const carepaVal = this.parsePercentage(data.carepa_pct) ?? 0
    const aparaVal = this.parsePercentage(data.apara_pct) ?? 0

    const currentUser = pb.authStore.record || pb.authStore.model
    const userId = currentUser?.id || null
    const userName = (currentUser as any)?.name || (currentUser as any)?.email || 'Usuário PCP'
    const userRole = (currentUser as any)?.role || 'PCP_PROGRAMMER'

    let previousRecord: LineTheoreticalLoss | null = null
    const isEditing = Boolean(data.id)

    if (isEditing && data.id) {
      try {
        previousRecord = await pb
          .collection('line_theoretical_losses')
          .getOne<LineTheoreticalLoss>(data.id)
      } catch {
        previousRecord = null
      }
    }

    const payload: Record<string, any> = {
      line_id: data.line_id,
      line_master_id: data.line_master_id || undefined,
      center_code: data.center_code.trim(),
      raw_material_type: data.raw_material_type.trim(),
      raw_material_code: data.raw_material_code.trim().toUpperCase(),
      raw_material_description: data.raw_material_description.trim(),
      bitola: data.bitola.trim(),
      application: data.application.trim(),
      rm_pct: Number(rmVal.toFixed(2)),
      carepa_pct: Number(carepaVal.toFixed(2)),
      apara_pct: Number(aparaVal.toFixed(2)),
      notes: (data.notes || '').trim(),
      deleted: false,
      deleted_at: null,
      deleted_by: null,
    }

    if (isEditing) {
      payload.updated_by_user_id = userId
      payload.updated_by_user_name = userName
    } else {
      payload.created_by_user_id = userId
      payload.created_by_user_name = userName
    }

    let saved: LineTheoreticalLoss
    if (isEditing && data.id) {
      saved = await pb
        .collection('line_theoretical_losses')
        .update<LineTheoreticalLoss>(data.id, payload)
    } else {
      saved = await pb.collection('line_theoretical_losses').create<LineTheoreticalLoss>(payload)
    }

    // Rastreabilidade / Auditoria em pcp_audit_logs
    try {
      const diffList: string[] = []
      if (previousRecord) {
        if (previousRecord.rm_pct !== saved.rm_pct) {
          diffList.push(
            `RM: ${this.formatPercentage(previousRecord.rm_pct)}% → ${this.formatPercentage(saved.rm_pct)}%`,
          )
        }
        if (previousRecord.carepa_pct !== saved.carepa_pct) {
          diffList.push(
            `Carepa: ${this.formatPercentage(previousRecord.carepa_pct)}% → ${this.formatPercentage(saved.carepa_pct)}%`,
          )
        }
        if (previousRecord.apara_pct !== saved.apara_pct) {
          diffList.push(
            `Apara: ${this.formatPercentage(previousRecord.apara_pct)}% → ${this.formatPercentage(saved.apara_pct)}%`,
          )
        }
        if (previousRecord.bitola !== saved.bitola) {
          diffList.push(`Bitola: "${previousRecord.bitola}" → "${saved.bitola}"`)
        }
        if (previousRecord.application !== saved.application) {
          diffList.push(`Aplicação: "${previousRecord.application}" → "${saved.application}"`)
        }
      }

      await pb.collection('pcp_audit_logs').create({
        user_id: userId,
        user_email: (currentUser as any)?.email || '',
        user_name: userName,
        user_role: userRole,
        event_type: 'SCHEDULE_ACTION',
        action: isEditing ? 'THEORETICAL_LOSS_UPDATE' : 'THEORETICAL_LOSS_CREATE',
        resource: 'line_theoretical_losses',
        resource_id: saved.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        module: 'Ficha Mestra Expandida',
        screen: 'Ficha Mestra > Perdas Teóricas',
        entity: 'line_theoretical_losses',
        record_id: saved.id,
        status: 'Ativo',
        reason: `${isEditing ? 'Edição' : 'Criação'} de perda teórica para a linha ${data.center_code}`,
        details: {
          line_id: saved.line_id,
          center_code: saved.center_code,
          raw_material_code: saved.raw_material_code,
          raw_material_type: saved.raw_material_type,
          bitola: saved.bitola,
          application: saved.application,
          rm_pct: saved.rm_pct,
          carepa_pct: saved.carepa_pct,
          apara_pct: saved.apara_pct,
          total_loss_pct: Number(
            ((saved.rm_pct || 0) + (saved.carepa_pct || 0) + (saved.apara_pct || 0)).toFixed(2),
          ),
          diff_descriptions: diffList,
          previous_value: previousRecord,
          new_value: saved,
        },
      })
    } catch (auditErr) {
      console.warn('Falha na gravação de auditoria de perda teórica:', auditErr)
    }

    return {
      ...saved,
      total_loss_pct: Number(
        ((saved.rm_pct || 0) + (saved.carepa_pct || 0) + (saved.apara_pct || 0)).toFixed(2),
      ),
    }
  },

  /**
   * Exclusão lógica (soft delete) da perda teórica com auditoria
   */
  async softDelete(id: string, reason?: string): Promise<LineTheoreticalLoss> {
    const currentUser = pb.authStore.record || pb.authStore.model
    const userId = currentUser?.id || null
    const userName = (currentUser as any)?.name || (currentUser as any)?.email || 'Usuário PCP'
    const userRole = (currentUser as any)?.role || 'PCP_PROGRAMMER'

    let previousRecord: LineTheoreticalLoss | null = null
    try {
      previousRecord = await pb
        .collection('line_theoretical_losses')
        .getOne<LineTheoreticalLoss>(id)
    } catch {
      previousRecord = null
    }

    const payload = {
      deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userName,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    }

    const updated = await pb
      .collection('line_theoretical_losses')
      .update<LineTheoreticalLoss>(id, payload)

    // Grava auditoria de exclusão lógica
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: userId,
        user_email: (currentUser as any)?.email || '',
        user_name: userName,
        user_role: userRole,
        event_type: 'SCHEDULE_ACTION',
        action: 'THEORETICAL_LOSS_DELETE',
        resource: 'line_theoretical_losses',
        resource_id: id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        module: 'Ficha Mestra Expandida',
        screen: 'Ficha Mestra > Perdas Teóricas',
        entity: 'line_theoretical_losses',
        record_id: id,
        status: 'Excluído',
        reason: reason || 'Exclusão lógica de perda teórica',
        details: {
          previous_value: previousRecord,
          deleted_at: payload.deleted_at,
          deleted_by: userName,
        },
      })
    } catch (auditErr) {
      console.warn('Falha na gravação de auditoria de exclusão:', auditErr)
    }

    return updated
  },

  /**
   * Restauração de registro excluído logicamente
   */
  async restore(id: string): Promise<LineTheoreticalLoss> {
    const currentUser = pb.authStore.record || pb.authStore.model
    const userId = currentUser?.id || null
    const userName = (currentUser as any)?.name || (currentUser as any)?.email || 'Usuário PCP'

    const payload = {
      deleted: false,
      deleted_at: null,
      deleted_by: null,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    }

    const updated = await pb
      .collection('line_theoretical_losses')
      .update<LineTheoreticalLoss>(id, payload)

    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: userId,
        user_email: (currentUser as any)?.email || '',
        user_name: userName,
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: 'THEORETICAL_LOSS_RESTORE',
        resource: 'line_theoretical_losses',
        resource_id: id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        module: 'Ficha Mestra Expandida',
        screen: 'Ficha Mestra > Perdas Teóricas',
        entity: 'line_theoretical_losses',
        record_id: id,
        status: 'Ativo',
        reason: 'Restauração de perda teórica previamente excluída logicamente',
        details: {
          restored_at: new Date().toISOString(),
          restored_by: userName,
        },
      })
    } catch (auditErr) {
      console.warn('Falha na gravação de auditoria de restauração:', auditErr)
    }

    return updated
  },
}

export default theoreticalLossesService

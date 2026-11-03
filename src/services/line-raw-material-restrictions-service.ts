import { pb } from '@/lib/pocketbase/client'

export interface LineRawMaterialRestriction {
  id: string
  center_code: string
  line_id?: string
  line_master_id?: string
  material_code: string
  material_description: string
  bitola_mp?: string
  restricted_product_gauges: string[]
  valid_from: string
  valid_until?: string
  reason: string
  notes?: string
  active: boolean
  deleted?: boolean
  deleted_at?: string
  deleted_by?: string
  created_by?: string
  updated_by?: string
  created?: string
  updated?: string
}

export interface RawMaterialRestrictionSaveDTO {
  id?: string
  center_code: string
  line_id?: string
  line_master_id?: string
  material_code: string
  material_description: string
  bitola_mp?: string
  restricted_product_gauges: string[]
  valid_from: string
  valid_until?: string
  reason: string
  notes?: string
  active: boolean
}

export interface RawMaterialRestrictionCheckResult {
  isRestricted: boolean
  precedenceApplied: 'RESTRICTION_OVER_PRIORITY' | 'NONE'
  restriction?: LineRawMaterialRestriction
  reason?: string
}

/**
 * Normaliza strings de bitola para comparação segura (ex: "12,70 mm" -> "12.70" ou formato chave)
 */
export function normalizeGaugeString(gauge: string): string {
  if (!gauge) return ''
  return gauge.toLowerCase().replace('mm', '').trim().replace(',', '.')
}

export function areGaugesEqual(gaugeA: string, gaugeB: string): boolean {
  const normA = normalizeGaugeString(gaugeA)
  const normB = normalizeGaugeString(gaugeB)
  const numA = parseFloat(normA)
  const numB = parseFloat(normB)
  if (!isNaN(numA) && !isNaN(numB)) {
    return Math.abs(numA - numB) < 0.001
  }
  return normA === normB
}

class RawMaterialRestrictionsService {
  /**
   * Lista todas as restrições de um centro/linha (não deletadas logicamente)
   */
  async getRestrictionsByCenter(
    centerCode: string,
    options: { onlyActive?: boolean } = {},
  ): Promise<LineRawMaterialRestriction[]> {
    if (!centerCode) return []

    const cleanCenter = centerCode.trim().toUpperCase()
    let filter = `(center_code = '${cleanCenter}' || line_id = '${cleanCenter}') && (deleted = false || deleted = null)`
    if (options.onlyActive) {
      filter += ` && active = true`
    }

    try {
      const records = await pb
        .collection('line_raw_material_restrictions')
        .getFullList<LineRawMaterialRestriction>({
          filter,
          sort: '-created',
        })
      return records.map((r) => this.sanitizeRecord(r))
    } catch (err: any) {
      console.warn('[RawMaterialRestrictionsService] Falha ao buscar restrições:', err)
      return []
    }
  }

  /**
   * Conta quantidade de restrições ATIVAS e NÃO DELETADAS para um Centro
   */
  async getActiveRestrictionsCount(centerCode: string): Promise<number> {
    if (!centerCode) return 0
    const list = await this.getRestrictionsByCenter(centerCode, { onlyActive: true })
    return list.length
  }

  /**
   * Verifica se a restrição está vigente na data informada (padrão hoje)
   */
  isRestrictionCurrentlyValid(
    restriction: LineRawMaterialRestriction,
    referenceDate: Date = new Date(),
  ): boolean {
    if (!restriction.active || restriction.deleted) return false

    const refStr = referenceDate.toISOString().slice(0, 10)
    const validFromStr = restriction.valid_from
      ? String(restriction.valid_from).slice(0, 10)
      : '1970-01-01'
    const validUntilStr = restriction.valid_until
      ? String(restriction.valid_until).slice(0, 10)
      : '9999-12-31'

    return refStr >= validFromStr && refStr <= validUntilStr
  }

  /**
   * Valida se já existe restrição ativa para a mesma MP + Centro + Bitola de Produto
   * Requisito 5: "Já existe uma restrição cadastrada para esta matéria-prima e esta bitola neste Centro."
   */
  async validateGaugeDuplicity(
    data: RawMaterialRestrictionSaveDTO,
    existingRules?: LineRawMaterialRestriction[],
  ): Promise<{ hasDuplicity: boolean; duplicateGauge?: string; message?: string }> {
    const cleanCenter = data.center_code.trim().toUpperCase()
    const cleanMaterial = data.material_code.trim().toUpperCase()

    const rules =
      existingRules || (await this.getRestrictionsByCenter(cleanCenter, { onlyActive: false }))

    const activeRules = rules.filter(
      (r) =>
        r.active &&
        !r.deleted &&
        (!data.id || r.id !== data.id) &&
        r.material_code.trim().toUpperCase() === cleanMaterial,
    )

    for (const newGauge of data.restricted_product_gauges || []) {
      for (const rule of activeRules) {
        const matches = (rule.restricted_product_gauges || []).some((existingGauge) =>
          areGaugesEqual(existingGauge, newGauge),
        )
        if (matches) {
          return {
            hasDuplicity: true,
            duplicateGauge: newGauge,
            message:
              'Já existe uma restrição cadastrada para esta matéria-prima e esta bitola neste Centro.',
          }
        }
      }
    }

    return { hasDuplicity: false }
  }

  /**
   * Salva ou atualiza uma restrição de MP, validando duplicidade exata e gravando auditoria completa
   */
  async saveRestriction(data: RawMaterialRestrictionSaveDTO): Promise<LineRawMaterialRestriction> {
    const cleanCenter = (data.center_code || '').trim().toUpperCase()
    const cleanMaterial = (data.material_code || '').trim().toUpperCase()

    if (!cleanCenter) {
      throw new Error('O Centro é obrigatório para cadastrar uma restrição.')
    }
    if (!cleanMaterial) {
      throw new Error('O Código da MP é obrigatório.')
    }
    if (!data.restricted_product_gauges || data.restricted_product_gauges.length === 0) {
      throw new Error('Selecione pelo menos uma bitola de produto restrita.')
    }
    if (!data.valid_from) {
      throw new Error('A Data de Início é obrigatória.')
    }
    if (data.valid_until && data.valid_until < data.valid_from) {
      throw new Error('A Data de Fim não pode ser anterior à Data de Início.')
    }
    if (!data.reason || !data.reason.trim()) {
      throw new Error('O Motivo da restrição é obrigatório.')
    }

    // Validação de duplicidade
    if (data.active) {
      const duplicityCheck = await this.validateGaugeDuplicity(data)
      if (duplicityCheck.hasDuplicity) {
        throw new Error(
          duplicityCheck.message ||
            'Já existe uma restrição cadastrada para esta matéria-prima e esta bitola neste Centro.',
        )
      }
    }

    let previousRecord: LineRawMaterialRestriction | null = null
    if (data.id) {
      try {
        const prev = await pb
          .collection('line_raw_material_restrictions')
          .getOne<LineRawMaterialRestriction>(data.id)
        previousRecord = this.sanitizeRecord(prev)
      } catch {
        previousRecord = null
      }
    }

    const currentUser = pb.authStore.record
    const payload = {
      center_code: cleanCenter,
      line_id: data.line_id || cleanCenter,
      line_master_id: data.line_master_id || '',
      material_code: cleanMaterial,
      material_description: data.material_description.trim(),
      bitola_mp: data.bitola_mp || '',
      restricted_product_gauges: data.restricted_product_gauges,
      valid_from: String(data.valid_from).slice(0, 10),
      valid_until: data.valid_until ? String(data.valid_until).slice(0, 10) : undefined,
      reason: data.reason.trim(),
      notes: data.notes ? data.notes.trim() : '',
      active: data.active !== false,
      deleted: false,
      ...(data.id
        ? { updated_by: currentUser?.id || 'PCP' }
        : { created_by: currentUser?.id || 'PCP' }),
    }

    let savedRaw: LineRawMaterialRestriction
    if (data.id) {
      savedRaw = await pb
        .collection('line_raw_material_restrictions')
        .update<LineRawMaterialRestriction>(data.id, payload)
    } else {
      savedRaw = await pb
        .collection('line_raw_material_restrictions')
        .create<LineRawMaterialRestriction>(payload)
    }

    const saved = this.sanitizeRecord(savedRaw)

    // Auditoria em pcp_audit_logs
    const auditAction = data.id
      ? 'UPDATE_RAW_MATERIAL_RESTRICTION'
      : 'CREATE_RAW_MATERIAL_RESTRICTION'
    await this.registrarAuditLog({
      action: auditAction,
      recordId: saved.id,
      center: cleanCenter,
      reason: data.id
        ? `MP ${saved.material_code} — alteração de restrição de bitolas (${saved.restricted_product_gauges.join(', ')})`
        : `MP ${saved.material_code} — cadastro de restrição de bitolas (${saved.restricted_product_gauges.join(', ')})`,
      previousValues: previousRecord
        ? {
            material_code: previousRecord.material_code,
            restricted_product_gauges: previousRecord.restricted_product_gauges,
            valid_from: previousRecord.valid_from,
            valid_until: previousRecord.valid_until,
            reason: previousRecord.reason,
            active: previousRecord.active,
          }
        : null,
      newValues: {
        material_code: saved.material_code,
        restricted_product_gauges: saved.restricted_product_gauges,
        valid_from: saved.valid_from,
        valid_until: saved.valid_until,
        reason: saved.reason,
        active: saved.active,
      },
    })

    return saved
  }

  /**
   * Ativar / Inativar restrição
   */
  async setRestrictionActive(id: string, active: boolean): Promise<LineRawMaterialRestriction> {
    const previous = await pb
      .collection('line_raw_material_restrictions')
      .getOne<LineRawMaterialRestriction>(id)

    // Se estiver reativando, verificar duplicidade antes de salvar
    if (active) {
      const duplicityCheck = await this.validateGaugeDuplicity({
        id: previous.id,
        center_code: previous.center_code,
        material_code: previous.material_code,
        material_description: previous.material_description,
        restricted_product_gauges: Array.isArray(previous.restricted_product_gauges)
          ? previous.restricted_product_gauges
          : [],
        valid_from: previous.valid_from,
        valid_until: previous.valid_until,
        reason: previous.reason,
        active: true,
      })
      if (duplicityCheck.hasDuplicity) {
        throw new Error(
          duplicityCheck.message ||
            'Já existe uma restrição cadastrada para esta matéria-prima e esta bitola neste Centro.',
        )
      }
    }

    const updatedRaw = await pb
      .collection('line_raw_material_restrictions')
      .update<LineRawMaterialRestriction>(id, {
        active,
        updated_by: pb.authStore.record?.id || 'PCP',
      })

    const updated = this.sanitizeRecord(updatedRaw)

    await this.registrarAuditLog({
      action: active ? 'ACTIVATE_RAW_MATERIAL_RESTRICTION' : 'DEACTIVATE_RAW_MATERIAL_RESTRICTION',
      recordId: updated.id,
      center: updated.center_code,
      reason: `MP ${updated.material_code} — status alterado de ${previous.active ? 'Ativo' : 'Inativo'} para ${active ? 'Ativo' : 'Inativo'}`,
      previousValues: { active: previous.active },
      newValues: { active: updated.active },
    })

    return updated
  }

  /**
   * Exclusão LÓGICA (deleted: true, active: false)
   */
  async softDeleteRestriction(id: string): Promise<LineRawMaterialRestriction> {
    const previous = await pb
      .collection('line_raw_material_restrictions')
      .getOne<LineRawMaterialRestriction>(id)

    const currentUser = pb.authStore.record
    const updatedRaw = await pb
      .collection('line_raw_material_restrictions')
      .update<LineRawMaterialRestriction>(id, {
        deleted: true,
        active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser?.id || 'PCP',
        updated_by: currentUser?.id || 'PCP',
      })

    const updated = this.sanitizeRecord(updatedRaw)

    await this.registrarAuditLog({
      action: 'SOFT_DELETE_RAW_MATERIAL_RESTRICTION',
      recordId: updated.id,
      center: updated.center_code,
      reason: `MP ${updated.material_code} — exclusão lógica da regra de restrição de bitolas (${(previous.restricted_product_gauges || []).join(', ')})`,
      previousValues: {
        active: previous.active,
        deleted: (previous as any).deleted || false,
      },
      newValues: {
        active: false,
        deleted: true,
        deleted_at: updated.deleted_at,
      },
    })

    return updated
  }

  // =========================================================================
  // REGRAS FUNCIONAIS E MOTOR DO PCP (Itens 12 e 13)
  // Precedência estrita: Restrições de MP prevalecem sobre Prioridades de MP
  // =========================================================================

  /**
   * Função de serviço consultável para o motor de programação do PCP (Item 12 e 13):
   * Dado centro + código MP + bitola do produto:
   * Responde se existe restrição ativa e vigente.
   * Se existir, informa isRestricted = true e precedenceApplied = 'RESTRICTION_OVER_PRIORITY'.
   * Mesmo que a MP esteja classificada com prioridade #1, esta função atesta a incompatibilidade.
   */
  async checkMaterialCompatibility(params: {
    centerCode: string
    materialCode: string
    productGauge: string
    referenceDate?: Date
  }): Promise<RawMaterialRestrictionCheckResult> {
    const { centerCode, materialCode, productGauge, referenceDate = new Date() } = params

    if (!centerCode || !materialCode || !productGauge) {
      return {
        isRestricted: false,
        precedenceApplied: 'NONE',
      }
    }

    const rules = await this.getRestrictionsByCenter(centerCode, { onlyActive: true })
    const cleanMaterial = materialCode.trim().toUpperCase()

    const matchingRule = rules.find((rule) => {
      if (!rule.active || rule.deleted) return false
      if (rule.material_code.trim().toUpperCase() !== cleanMaterial) return false
      if (!this.isRestrictionCurrentlyValid(rule, referenceDate)) return false

      return (rule.restricted_product_gauges || []).some((gauge) =>
        areGaugesEqual(gauge, productGauge),
      )
    })

    if (matchingRule) {
      return {
        isRestricted: true,
        precedenceApplied: 'RESTRICTION_OVER_PRIORITY',
        restriction: matchingRule,
        reason: matchingRule.reason || 'Matéria-prima com restrição cadastrada para esta bitola.',
      }
    }

    return {
      isRestricted: false,
      precedenceApplied: 'NONE',
    }
  }

  /**
   * Avalia uma lista de matérias-primas candidatas e filtra/classifica aplicando a precedência:
   * RESTRIÇÃO PREVALECE SOBRE PRIORIDADE.
   * MPs com restrição ativa e vigente são eliminadas ou marcadas como bloqueadas,
   * mesmo que possuam prioridade definida.
   */
  async filterCompatibleRawMaterials<T extends { material_code: string; priority_order?: number }>(
    centerCode: string,
    productGauge: string,
    candidates: T[],
    referenceDate: Date = new Date(),
  ): Promise<{
    compatible: T[]
    restricted: Array<{ candidate: T; restrictionReason: string }>
  }> {
    const compatible: T[] = []
    const restricted: Array<{ candidate: T; restrictionReason: string }> = []

    for (const candidate of candidates) {
      const check = await this.checkMaterialCompatibility({
        centerCode,
        materialCode: candidate.material_code,
        productGauge,
        referenceDate,
      })

      if (check.isRestricted) {
        restricted.push({
          candidate,
          restrictionReason: check.reason || 'Restrição ativa de MP cadastrada',
        })
      } else {
        compatible.push(candidate)
      }
    }

    // Ordenar compatíveis pela prioridade se houver
    compatible.sort((a, b) => (a.priority_order || 999) - (b.priority_order || 999))

    return { compatible, restricted }
  }

  /**
   * Helper unificado de registro de log de auditoria em pcp_audit_logs
   */
  private async registrarAuditLog(params: {
    action: string
    recordId: string
    center: string
    reason: string
    previousValues?: any
    newValues?: any
  }): Promise<void> {
    const currentUser = pb.authStore.record
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: (currentUser as any)?.email || '',
        user_name: (currentUser as any)?.name || (currentUser as any)?.email || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: params.action,
        resource: 'line_raw_material_restrictions',
        resource_id: params.recordId,
        permission_required: 'pcp.lines.manage',
        company: 'CIAFAL',
        line: params.center,
        center: params.center,
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestre Expandida > Restrições MP',
        entity: 'line_raw_material_restrictions',
        record_id: params.recordId,
        status: 'Concluído',
        outcome: 'SUCCESS',
        reason: params.reason,
        details: {
          center_code: params.center,
          action: params.action,
          record_id: params.recordId,
          previous_values: params.previousValues || null,
          new_values: params.newValues || null,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.warn('[RawMaterialRestrictionsService] Falha silenciosa ao registrar auditoria:', err)
    }
  }

  /**
   * Assegura campos array e booleanos consistentes
   */
  private sanitizeRecord(record: any): LineRawMaterialRestriction {
    let gauges = record.restricted_product_gauges
    if (typeof gauges === 'string') {
      try {
        gauges = JSON.parse(gauges)
      } catch {
        gauges = [gauges]
      }
    }
    if (!Array.isArray(gauges)) {
      gauges = []
    }

    return {
      ...record,
      restricted_product_gauges: gauges,
      active: record.active !== false,
      deleted: record.deleted === true,
      valid_from: record.valid_from ? String(record.valid_from).slice(0, 10) : '',
      valid_until: record.valid_until ? String(record.valid_until).slice(0, 10) : undefined,
    }
  }
}

export const rawMaterialRestrictionsService = new RawMaterialRestrictionsService()
export default rawMaterialRestrictionsService

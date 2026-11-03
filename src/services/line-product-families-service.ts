/**
 * line-product-families-service.ts
 *
 * Serviço de Gerenciamento das Famílias Técnicas da Ficha Mestra Expandida
 * Coleção: line_product_families
 *
 * Diretrizes do usuário:
 * - Campos removidos: Cilindro e Quantidade de bitolas (qtd de bitolas agora é calculada dinamicamente pelas bitolas vinculadas).
 * - Campos mantidos: Família; Código do Equipamento PM; Diâmetro mín. MP (mm); Diâmetro máx. MP (mm); Status Ativo/Inativo.
 * - Novos campos: Comprimento mín. MP (m) e Comprimento máx. MP (m) com validação:
 *   comprimento_min_mp >= 0, comprimento_max_mp >= 0, comprimento_min_mp <= comprimento_max_mp.
 *   Bloqueio: "O comprimento mínimo da matéria-prima não pode ser maior que o comprimento máximo."
 * - Bitolas dentro da Família: múltiplas bitolas com Bitola, Descrição, Status (Ativa/Inativa), Ações (Editar, Remover).
 * - Bloqueio de duplicidade de bitola: "Esta bitola já pertence a esta família."
 * - Auditoria completa em pcp_audit_logs (criação, edição, ativação/inativação, inclusão/remoção de bitola, alteração de limites mín/máx).
 */

import { pb } from '@/lib/pocketbase/client'
import { formatPtBrNumber, parsePtBrNumber } from '@/lib/number-format'
import { formatBrNumber, parseBrNumber } from '@/utils/number-br-formatters'

/**
 * Interface de uma bitola vinculada à Família
 */
export interface LineFamilyGauge {
  id?: string
  bitola: string
  description?: string
  active?: boolean
  deleted?: boolean
}

/**
 * Interface do registro de Família de Produto da Linha/Centro
 */
export interface LineProductFamily {
  id: string
  line_id: string
  line_master_id?: string
  center_code: string
  center_name?: string

  family_name: string
  family_code?: string

  pm_equipment_code?: string
  pm_equipment_name?: string

  // Parâmetros de Matéria-Prima
  min_mp_diameter_mm: number
  max_mp_diameter_mm: number
  comprimento_min_mp: number // unidade: m (metros)
  comprimento_max_mp: number // unidade: m (metros)

  gauges_json: LineFamilyGauge[]
  gauges_count: number // Calculada automaticamente a partir de gauges_json

  // Campos legados mantidos para retrocompatibilidade opcional sem uso em UI
  cylinder_code?: string
  cylinder_name?: string

  active: boolean
  notes?: string

  deleted?: boolean
  deleted_at?: string
  deleted_by?: string
  created_by_user_id?: string
  created_by_user_name?: string
  updated_by_user_id?: string
  updated_by_user_name?: string

  created?: string
  updated?: string
}

/**
 * Dados para submissão/validação de formulário
 */
export interface LineFamilyFormData {
  id?: string
  line_id: string
  line_master_id?: string
  center_code: string
  center_name?: string

  family_name: string
  pm_equipment_code?: string
  pm_equipment_name?: string

  // Faixa de diâmetro MP (mm)
  min_mp_diameter_mm: string | number
  max_mp_diameter_mm: string | number

  // Faixa de comprimento MP (m)
  comprimento_min_mp: string | number
  comprimento_max_mp: string | number

  // Lista de bitolas da família
  gauges: Array<{
    id?: string
    bitola: string
    description?: string
    active?: boolean
    deleted?: boolean
  }>

  // Legado opcional
  cylinder_code?: string

  active?: boolean
  notes?: string
}

export interface LineFamilyValidationErrors {
  general?: string
  family_name?: string
  pm_equipment_code?: string
  min_mp_diameter_mm?: string
  max_mp_diameter_mm?: string
  comprimento_min_mp?: string
  comprimento_max_mp?: string
  gauges?: string
  gauge_errors?: Record<number, { bitola?: string; description?: string }>
}

/**
 * Converte valor flexível (string pt-BR com vírgula ou número) para float number
 */
export function parseDimension(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'number') {
    if (isNaN(value)) return null
    return value
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parseBrNumber(trimmed) ?? parsePtBrNumber(trimmed)
  if (parsed === null || isNaN(parsed)) return null
  return parsed
}

/**
 * Formata dimensão de diâmetro em mm no padrão brasileiro:
 * 130,00 mm — vírgula decimal, espaço entre número e unidade.
 */
export function formatMm(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00 mm'
  return `${formatBrNumber(value, decimals)} mm`
}

/**
 * Formata comprimento em metros (m) no padrão brasileiro:
 * 6,00 m — vírgula decimal, espaço entre número e unidade m.
 */
export function formatMeters(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00 m'
  return `${formatBrNumber(value, decimals)} m`
}

/**
 * Helper de compatibilidade legado (se algum módulo antigo ainda chamar formatLengthMm)
 */
export function formatLengthMm(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0 mm'
  return `${formatBrNumber(value, 0)} mm`
}

export const lineProductFamiliesService = {
  /**
   * Valida os campos do formulário de Família
   */
  validateFormData(data: LineFamilyFormData): LineFamilyValidationErrors {
    const errors: LineFamilyValidationErrors = {}
    const gaugeErrors: Record<number, { bitola?: string; description?: string }> = {}

    if (!data.line_id || !data.center_code?.trim()) {
      errors.general = 'Identificação da Linha / Centro é obrigatória.'
    }

    if (!data.family_name || !data.family_name.trim()) {
      errors.family_name = 'Nome da Família é obrigatório.'
    }

    // Diâmetros de MP (mm)
    const minMpDiam = parseDimension(data.min_mp_diameter_mm)
    const maxMpDiam = parseDimension(data.max_mp_diameter_mm)

    if (minMpDiam === null) {
      errors.min_mp_diameter_mm = 'Informe o Diâmetro mínimo da MP em mm.'
    } else if (minMpDiam <= 0) {
      errors.min_mp_diameter_mm = 'Diâmetro mínimo da MP deve ser maior que zero.'
    }

    if (maxMpDiam === null) {
      errors.max_mp_diameter_mm = 'Informe o Diâmetro máximo da MP em mm.'
    } else if (maxMpDiam <= 0) {
      errors.max_mp_diameter_mm = 'Diâmetro máximo da MP deve ser maior que zero.'
    }

    if (
      minMpDiam !== null &&
      maxMpDiam !== null &&
      minMpDiam > 0 &&
      maxMpDiam > 0 &&
      minMpDiam > maxMpDiam
    ) {
      errors.min_mp_diameter_mm = 'Diâmetro mínimo não pode ser maior que o diâmetro máximo.'
      errors.max_mp_diameter_mm = 'Diâmetro máximo não pode ser menor que o diâmetro mínimo.'
    }

    // Comprimentos de MP (m) - Item 3 e 4 do prompt
    const minComp = parseDimension(data.comprimento_min_mp)
    const maxComp = parseDimension(data.comprimento_max_mp)

    if (minComp === null) {
      errors.comprimento_min_mp = 'Informe o Comprimento mín. MP (m).'
    } else if (minComp < 0) {
      errors.comprimento_min_mp = 'O comprimento mínimo não pode ser negativo.'
    }

    if (maxComp === null) {
      errors.comprimento_max_mp = 'Informe o Comprimento máx. MP (m).'
    } else if (maxComp < 0) {
      errors.comprimento_max_mp = 'O comprimento máximo não pode ser negativo.'
    }

    if (minComp !== null && maxComp !== null && minComp >= 0 && maxComp >= 0 && minComp > maxComp) {
      const msg =
        'O comprimento mínimo da matéria-prima não pode ser maior que o comprimento máximo.'
      errors.comprimento_min_mp = msg
      errors.comprimento_max_mp = msg
    }

    // Validações das Bitolas da Família (sem duplicidade)
    if (data.gauges && data.gauges.length > 0) {
      const bitolaSet = new Set<string>()

      data.gauges.forEach((g, index) => {
        if (g.deleted) return // Ignorar vínculos já excluídos logicamente
        const itemErr: { bitola?: string; description?: string } = {}

        const cleanBitola = (g.bitola || '').trim().toUpperCase()
        if (!cleanBitola) {
          itemErr.bitola = 'Bitola é obrigatória.'
        } else if (bitolaSet.has(cleanBitola)) {
          itemErr.bitola = 'Esta bitola já pertence a esta família.'
        } else {
          bitolaSet.add(cleanBitola)
        }

        if (Object.keys(itemErr).length > 0) {
          gaugeErrors[index] = itemErr
        }
      })

      if (Object.keys(gaugeErrors).length > 0) {
        errors.gauge_errors = gaugeErrors
        if (!errors.gauges) {
          errors.gauges = 'Existem bitolas com dados inválidos ou duplicados na família.'
        }
      }
    }

    return errors
  },

  /**
   * Bloqueio de duplicidade da mesma família para o mesmo centro
   */
  async checkDuplicate(params: {
    lineId: string
    centerCode: string
    familyName: string
    excludeId?: string
  }): Promise<boolean> {
    try {
      const cleanName = params.familyName.trim().toUpperCase()
      const records = await pb.collection('line_product_families').getFullList<LineProductFamily>({
        filter: `(line_id = '${params.lineId}' || center_code = '${params.centerCode}') && deleted != true`,
      })

      return records.some((r) => {
        if (params.excludeId && r.id === params.excludeId) return false
        return (r.family_name || '').trim().toUpperCase() === cleanName
      })
    } catch (err) {
      console.warn('Erro ao verificar duplicidade de família no centro:', err)
      return false
    }
  },

  /**
   * Lista famílias cadastradas para uma linha/centro
   */
  async listByLine(
    lineId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<LineProductFamily[]> {
    try {
      const filter = options?.includeDeleted
        ? `line_id = '${lineId}'`
        : `line_id = '${lineId}' && deleted != true`

      const list = await pb.collection('line_product_families').getFullList<LineProductFamily>({
        filter,
        sort: 'family_name',
      })

      return list.map((item) => {
        const rawGauges = Array.isArray(item.gauges_json) ? item.gauges_json : []
        const activeGauges = rawGauges.filter((g) => !g.deleted)
        return {
          ...item,
          comprimento_min_mp: item.comprimento_min_mp != null ? Number(item.comprimento_min_mp) : 0,
          comprimento_max_mp: item.comprimento_max_mp != null ? Number(item.comprimento_max_mp) : 0,
          gauges_json: rawGauges,
          gauges_count: activeGauges.length,
        }
      })
    } catch (err) {
      console.warn('Erro ao listar famílias da linha:', err)
      return []
    }
  },

  /**
   * Salva (cria ou atualiza) uma Família com auditoria completa
   */
  async save(data: LineFamilyFormData): Promise<LineProductFamily> {
    const errors = this.validateFormData(data)
    if (Object.keys(errors).length > 0) {
      const firstMsg =
        errors.comprimento_min_mp ||
        errors.comprimento_max_mp ||
        errors.family_name ||
        errors.min_mp_diameter_mm ||
        errors.max_mp_diameter_mm ||
        errors.gauges ||
        errors.general ||
        'Formulário contém dados inválidos.'
      throw new Error(String(firstMsg))
    }

    // Valida duplicidade de nome da família no centro
    const isDuplicate = await this.checkDuplicate({
      lineId: data.line_id,
      centerCode: data.center_code,
      familyName: data.family_name,
      excludeId: data.id,
    })

    if (isDuplicate) {
      throw new Error(`A família "${data.family_name.trim()}" já está cadastrada para este centro.`)
    }

    const minMpDiam = parseDimension(data.min_mp_diameter_mm) ?? 0
    const maxMpDiam = parseDimension(data.max_mp_diameter_mm) ?? 0
    const minCompMp = parseDimension(data.comprimento_min_mp) ?? 0
    const maxCompMp = parseDimension(data.comprimento_max_mp) ?? 0

    // Normaliza bitolas associadas preservando status e id
    const normalizedGauges: LineFamilyGauge[] = (data.gauges || []).map((g, idx) => ({
      id: g.id || `gauge-${Date.now()}-${idx}`,
      bitola: g.bitola.trim(),
      description: g.description ? g.description.trim() : undefined,
      active: g.active !== false,
      deleted: Boolean(g.deleted),
    }))

    const activeGaugesCount = normalizedGauges.filter((g) => !g.deleted).length

    const currentUser = pb.authStore.record || pb.authStore.model
    const userId = currentUser?.id || null
    const userName = (currentUser as any)?.name || (currentUser as any)?.email || 'Programador PCP'
    const userRole = (currentUser as any)?.role || 'PCP_PROGRAMMER'

    let previousRecord: LineProductFamily | null = null
    const isEditing = Boolean(data.id)

    if (isEditing && data.id) {
      try {
        previousRecord = await pb
          .collection('line_product_families')
          .getOne<LineProductFamily>(data.id)
      } catch {
        previousRecord = null
      }
    }

    const payload: Record<string, any> = {
      line_id: data.line_id,
      line_master_id: data.line_master_id || undefined,
      center_code: data.center_code.trim(),
      center_name: data.center_name?.trim() || '',
      family_name: data.family_name.trim(),
      family_code: data.family_name.trim().toUpperCase().replace(/\s+/g, '_'),
      pm_equipment_code: (data.pm_equipment_code || '').trim(),
      pm_equipment_name: (data.pm_equipment_name || data.pm_equipment_code || '').trim(),
      min_mp_diameter_mm: Number(minMpDiam.toFixed(2)),
      max_mp_diameter_mm: Number(maxMpDiam.toFixed(2)),
      comprimento_min_mp: Number(minCompMp.toFixed(2)),
      comprimento_max_mp: Number(maxCompMp.toFixed(2)),
      gauges_json: normalizedGauges,
      gauges_count: activeGaugesCount,
      active: data.active !== false,
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

    let saved: LineProductFamily
    if (isEditing && data.id) {
      saved = await pb
        .collection('line_product_families')
        .update<LineProductFamily>(data.id, payload)
    } else {
      saved = await pb.collection('line_product_families').create<LineProductFamily>(payload)
    }

    // Auditoria append-only em pcp_audit_logs com rastreio de alterações antes/depois (+/-/~ logs)
    try {
      const diffList: string[] = []
      if (previousRecord) {
        if (previousRecord.family_name !== saved.family_name) {
          diffList.push(`~ Família: "${previousRecord.family_name}" → "${saved.family_name}"`)
        }
        if (previousRecord.pm_equipment_code !== saved.pm_equipment_code) {
          diffList.push(
            `~ Código Equipamento PM: "${previousRecord.pm_equipment_code || '—'}" → "${saved.pm_equipment_code || '—'}"`,
          )
        }
        if (
          previousRecord.min_mp_diameter_mm !== saved.min_mp_diameter_mm ||
          previousRecord.max_mp_diameter_mm !== saved.max_mp_diameter_mm
        ) {
          diffList.push(
            `~ Diâmetro MP: [${formatMm(previousRecord.min_mp_diameter_mm)} - ${formatMm(previousRecord.max_mp_diameter_mm)}] → [${formatMm(saved.min_mp_diameter_mm)} - ${formatMm(saved.max_mp_diameter_mm)}]`,
          )
        }
        if (
          previousRecord.comprimento_min_mp !== saved.comprimento_min_mp ||
          previousRecord.comprimento_max_mp !== saved.comprimento_max_mp
        ) {
          diffList.push(
            `~ Comprimento MP: [${formatMeters(previousRecord.comprimento_min_mp)} - ${formatMeters(previousRecord.comprimento_max_mp)}] → [${formatMeters(saved.comprimento_min_mp)} - ${formatMeters(saved.comprimento_max_mp)}]`,
          )
        }
        if (previousRecord.active !== saved.active) {
          diffList.push(
            `~ Status: ${previousRecord.active ? 'Ativa' : 'Inativa'} → ${saved.active ? 'Ativa' : 'Inativa'}`,
          )
        }

        // Auditoria das bitolas (+/-/~ bitolas)
        const prevBitolas = (previousRecord.gauges_json || []).filter((g) => !g.deleted)
        const newBitolas = (saved.gauges_json || []).filter((g) => !g.deleted)
        const prevSet = new Set(prevBitolas.map((g) => g.bitola))
        const newSet = new Set(newBitolas.map((g) => g.bitola))

        newBitolas.forEach((g) => {
          if (!prevSet.has(g.bitola)) {
            diffList.push(
              `+ Bitola adicionada: "${g.bitola}"${g.description ? ` (${g.description})` : ''}`,
            )
          }
        })
        prevBitolas.forEach((g) => {
          if (!newSet.has(g.bitola)) {
            diffList.push(`- Bitola removida/inativada: "${g.bitola}"`)
          }
        })
      } else {
        diffList.push(`+ Família criada: "${saved.family_name}"`)
        ;(saved.gauges_json || [])
          .filter((g) => !g.deleted)
          .forEach((g) => {
            diffList.push(`+ Bitola associada: "${g.bitola}"`)
          })
      }

      await pb.collection('pcp_audit_logs').create({
        user_id: userId,
        user_email: (currentUser as any)?.email || '',
        user_name: userName,
        user_role: userRole,
        event_type: 'SCHEDULE_ACTION',
        action: isEditing ? 'LINE_FAMILY_UPDATE' : 'LINE_FAMILY_CREATE',
        resource: 'line_product_families',
        resource_id: saved.id,
        permission_required: 'pcp.line_families.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        module: 'Ficha Mestra Expandida',
        screen: 'Ficha Mestra > Famílias',
        entity: 'line_product_families',
        record_id: saved.id,
        status: saved.active ? 'Ativa' : 'Inativa',
        reason: `${isEditing ? 'Edição' : 'Criação'} de família técnica "${saved.family_name}" para o centro ${saved.center_code}`,
        details: {
          line_id: saved.line_id,
          center_code: saved.center_code,
          family_name: saved.family_name,
          pm_equipment_code: saved.pm_equipment_code,
          min_mp_diameter_mm: saved.min_mp_diameter_mm,
          max_mp_diameter_mm: saved.max_mp_diameter_mm,
          comprimento_min_mp: saved.comprimento_min_mp,
          comprimento_max_mp: saved.comprimento_max_mp,
          gauges_count: activeGaugesCount,
          gauges: saved.gauges_json,
          active: saved.active,
          diff_descriptions: diffList,
          previous_value: previousRecord,
          new_value: saved,
        },
      })
    } catch (auditErr) {
      console.warn('Falha na gravação de auditoria da família:', auditErr)
    }

    return {
      ...saved,
      gauges_count: activeGaugesCount,
    }
  },

  /**
   * Altera status Ativa/Inativa da família com log de auditoria
   */
  async toggleActive(id: string, newActive: boolean): Promise<LineProductFamily> {
    const currentUser = pb.authStore.record || pb.authStore.model
    const userId = currentUser?.id || null
    const userName = (currentUser as any)?.name || (currentUser as any)?.email || 'Programador PCP'
    const userRole = (currentUser as any)?.role || 'PCP_PROGRAMMER'

    let previousRecord: LineProductFamily | null = null
    try {
      previousRecord = await pb.collection('line_product_families').getOne<LineProductFamily>(id)
    } catch {
      previousRecord = null
    }

    const updated = await pb.collection('line_product_families').update<LineProductFamily>(id, {
      active: newActive,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    })

    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: userId,
        user_email: (currentUser as any)?.email || '',
        user_name: userName,
        user_role: userRole,
        event_type: 'SCHEDULE_ACTION',
        action: newActive ? 'LINE_FAMILY_ACTIVATE' : 'LINE_FAMILY_DEACTIVATE',
        resource: 'line_product_families',
        resource_id: id,
        permission_required: 'pcp.line_families.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        module: 'Ficha Mestra Expandida',
        screen: 'Ficha Mestra > Famílias',
        entity: 'line_product_families',
        record_id: id,
        status: newActive ? 'Ativa' : 'Inativa',
        reason: `${newActive ? 'Ativação' : 'Inativação'} da família "${updated.family_name}"`,
        details: {
          diff_descriptions: [
            `~ Status da Família: ${previousRecord?.active ? 'Ativa' : 'Inativa'} → ${newActive ? 'Ativa' : 'Inativa'}`,
          ],
          previous_active: previousRecord?.active,
          new_active: newActive,
        },
      })
    } catch (auditErr) {
      console.warn('Falha na auditoria de alteração de status:', auditErr)
    }

    return updated
  },

  /**
   * Exclusão lógica com auditoria
   */
  async softDelete(id: string, reason?: string): Promise<LineProductFamily> {
    const currentUser = pb.authStore.record || pb.authStore.model
    const userId = currentUser?.id || null
    const userName = (currentUser as any)?.name || (currentUser as any)?.email || 'Programador PCP'
    const userRole = (currentUser as any)?.role || 'PCP_PROGRAMMER'

    let previousRecord: LineProductFamily | null = null
    try {
      previousRecord = await pb.collection('line_product_families').getOne<LineProductFamily>(id)
    } catch {
      previousRecord = null
    }

    const payload = {
      deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userName,
      active: false,
      updated_by_user_id: userId,
      updated_by_user_name: userName,
    }

    const updated = await pb
      .collection('line_product_families')
      .update<LineProductFamily>(id, payload)

    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: userId,
        user_email: (currentUser as any)?.email || '',
        user_name: userName,
        user_role: userRole,
        event_type: 'SCHEDULE_ACTION',
        action: 'LINE_FAMILY_SOFT_DELETE',
        resource: 'line_product_families',
        resource_id: id,
        permission_required: 'pcp.line_families.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        module: 'Ficha Mestra Expandida',
        screen: 'Ficha Mestra > Famílias',
        entity: 'line_product_families',
        record_id: id,
        status: 'Excluído',
        reason: reason || 'Exclusão lógica de família técnica',
        details: {
          diff_descriptions: [`- Exclusão lógica da família "${updated.family_name}"`],
          previous_value: previousRecord,
          deleted_at: payload.deleted_at,
          deleted_by: userName,
        },
      })
    } catch (auditErr) {
      console.warn('Falha na gravação de auditoria de exclusão lógica:', auditErr)
    }

    return updated
  },
}

export default lineProductFamiliesService

/**
 * line-product-families-service.ts
 *
 * Serviço de Gerenciamento das Famílias Técnicas da Ficha Mestra Expandida
 * Coleção: line_product_families
 *
 * Vínculos:
 * - Centro / Linha de Produção (Centro -> várias Famílias)
 * - Cilindro associado e Código de Equipamento SAP PM (RFC)
 * - Faixa de Matéria-Prima admissível (diâmetro mín / máx em mm, pt-BR)
 * - Múltiplas bitolas associadas à família (comprimento mín / máx em mm, pt-BR)
 * - Auditoria completa em pcp_audit_logs (append-only)
 */

import { pb } from '@/lib/pocketbase/client'
import { formatPtBrNumber, parsePtBrNumber } from '@/lib/number-format'
import { formatBrNumber, parseBrNumber } from '@/utils/number-br-formatters'
import { OFFICIAL_CYLINDER_SETS } from '@/services/roll-shop-service'

/**
 * Interface de uma bitola vinculada à Família
 */
export interface LineFamilyGauge {
  id?: string
  bitola: string
  min_length_mm: number
  max_length_mm: number
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

  cylinder_code: string
  cylinder_name?: string
  pm_equipment_code: string
  pm_equipment_name?: string

  min_mp_diameter_mm: number
  max_mp_diameter_mm: number

  gauges_json: LineFamilyGauge[]
  gauges_count: number

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
  cylinder_code: string
  pm_equipment_code: string

  // Faixas MP (em mm) - aceita string pt-BR ("130,00") ou número
  min_mp_diameter_mm: string | number
  max_mp_diameter_mm: string | number

  // Lista de bitolas da família
  gauges: Array<{
    id?: string
    bitola: string
    min_length_mm: string | number
    max_length_mm: string | number
  }>

  active?: boolean
  notes?: string
}

export interface LineFamilyValidationErrors {
  general?: string
  family_name?: string
  cylinder_code?: string
  pm_equipment_code?: string
  min_mp_diameter_mm?: string
  max_mp_diameter_mm?: string
  gauges?: string
  gauge_errors?: Record<number, { bitola?: string; min_length_mm?: string; max_length_mm?: string }>
}

/**
 * Opção de Cilindro com seu respectivo Equipamento SAP PM
 */
export interface CylinderOption {
  code: string
  name: string
  pmEquipmentCode: string
  pmEquipmentName: string
}

/**
 * Catálogo padrão de cilindros da laminação/indústria e seus códigos SAP PM vinculados
 * (Compatível com roll-shop-service e pronto para substituição transparente por RFC SAP PM)
 */
export const OFFICIAL_LINE_CYLINDERS: CylinderOption[] = [
  {
    code: 'CJ-L1-TQ-50',
    name: 'Jogo Conformador Tubo Quadrado 50x50 mm',
    pmEquipmentCode: 'PM-EQ-100291',
    pmEquipmentName: 'Gaiola Desbastadora & Acabamento G1-G4 PM',
  },
  {
    code: 'CJ-L1-TR-6030',
    name: 'Jogo Cilindros Tubo Retangular 60x30 mm',
    pmEquipmentCode: 'PM-EQ-100292',
    pmEquipmentName: 'Laminador Trio & Calibrador Final PM',
  },
  {
    code: 'CJ-L1-PU-150',
    name: 'Jogo de Rolos Perfil U 150x50 mm Heavy Duty',
    pmEquipmentCode: 'PM-EQ-100293',
    pmEquipmentName: 'Trem Contínuo Gaiolas 1-6 Heavy Duty PM',
  },
  {
    code: 'CJ-L1-RED-635',
    name: 'Cilindros Desbaste e Acabamento Redondo Ø 63.5 mm',
    pmEquipmentCode: 'PM-EQ-100294',
    pmEquipmentName: 'Acabador Barra Redonda & Desbastador PM',
  },
  {
    code: 'CJ-L1-CAN-204',
    name: 'Cilindros Cantoneira 2" x 1/4"',
    pmEquipmentCode: 'PM-EQ-100295',
    pmEquipmentName: 'Gaiola Laminadora Cantoneiras PM',
  },
  {
    code: 'CJ-L1-QUAD-50',
    name: 'Cilindros Barra Quadrada 50 mm',
    pmEquipmentCode: 'PM-EQ-100296',
    pmEquipmentName: 'Gaiola Laminadora Barras Quadradas PM',
  },
  {
    code: 'CJ-L2-PERF-200',
    name: 'Jogo de Cilindros Perfis Médios 200 mm',
    pmEquipmentCode: 'PM-EQ-100297',
    pmEquipmentName: 'Mesa de Alimentação e Desbaste L2 PM',
  },
  {
    code: 'CJ-L2-CORTE-EMB',
    name: 'Conjunto de Cilindros Tracionadores Acabamento',
    pmEquipmentCode: 'PM-EQ-100298',
    pmEquipmentName: 'Endireitadeira e Tracionador L2 PM',
  },
]

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
 * Formata dimensão em mm no padrão brasileiro oficial:
 * 130,00 mm — vírgula decimal, ponto de milhar, nunca ponto decimal solto.
 */
export function formatMm(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00 mm'
  return `${formatBrNumber(value, decimals)} mm`
}

/**
 * Formata comprimento inteiro em mm no padrão brasileiro com separador de milhar:
 * ex: 6000 -> 6.000 mm, 12000 -> 12.000 mm
 */
export function formatLengthMm(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0 mm'
  return `${formatBrNumber(value, 0)} mm`
}

export const lineProductFamiliesService = {
  /**
   * Obtém opções de cilindros disponíveis
   */
  getCylinderOptions(): CylinderOption[] {
    return OFFICIAL_LINE_CYLINDERS
  },

  /**
   * Localiza equipamento PM respectivo a um cilindro
   */
  findEquipmentByCylinder(cylinderCode: string): CylinderOption | undefined {
    return OFFICIAL_LINE_CYLINDERS.find(
      (c) => c.code.toLowerCase() === (cylinderCode || '').trim().toLowerCase(),
    )
  },

  /**
   * Valida os campos do formulário de Família
   */
  validateFormData(data: LineFamilyFormData): LineFamilyValidationErrors {
    const errors: LineFamilyValidationErrors = {}
    const gaugeErrors: Record<
      number,
      { bitola?: string; min_length_mm?: string; max_length_mm?: string }
    > = {}

    if (!data.line_id || !data.center_code?.trim()) {
      errors.general = 'Identificação da Linha / Centro é obrigatória.'
    }

    if (!data.family_name || !data.family_name.trim()) {
      errors.family_name = 'Nome da Família é obrigatório.'
    }

    if (!data.cylinder_code || !data.cylinder_code.trim()) {
      errors.cylinder_code = 'Selecione o Cilindro.'
    }

    if (!data.pm_equipment_code || !data.pm_equipment_code.trim()) {
      errors.pm_equipment_code = 'Informe o Código do Equipamento PM.'
    }

    // Validações da Faixa de MP (diâmetro mín / máx)
    const minMp = parseDimension(data.min_mp_diameter_mm)
    const maxMp = parseDimension(data.max_mp_diameter_mm)

    if (minMp === null) {
      errors.min_mp_diameter_mm = 'Informe o Diâmetro mínimo da MP em mm.'
    } else if (minMp <= 0) {
      errors.min_mp_diameter_mm = 'Diâmetro mínimo da MP deve ser maior que zero.'
    }

    if (maxMp === null) {
      errors.max_mp_diameter_mm = 'Informe o Diâmetro máximo da MP em mm.'
    } else if (maxMp <= 0) {
      errors.max_mp_diameter_mm = 'Diâmetro máximo da MP deve ser maior que zero.'
    }

    if (minMp !== null && maxMp !== null && minMp > 0 && maxMp > 0 && minMp > maxMp) {
      errors.min_mp_diameter_mm = 'Diâmetro mínimo não pode ser maior que o diâmetro máximo.'
      errors.max_mp_diameter_mm = 'Diâmetro máximo não pode ser menor que o diâmetro mínimo.'
    }

    // Validações das Bitolas da Família
    if (!data.gauges || data.gauges.length === 0) {
      errors.gauges = 'Adicione pelo menos uma bitola para a família.'
    } else {
      const bitolaSet = new Set<string>()

      data.gauges.forEach((g, index) => {
        const itemErr: { bitola?: string; min_length_mm?: string; max_length_mm?: string } = {}

        const cleanBitola = (g.bitola || '').trim().toUpperCase()
        if (!cleanBitola) {
          itemErr.bitola = 'Bitola é obrigatória.'
        } else if (bitolaSet.has(cleanBitola)) {
          itemErr.bitola = `Bitola "${cleanBitola}" duplicada na mesma família.`
        } else {
          bitolaSet.add(cleanBitola)
        }

        const minLen = parseDimension(g.min_length_mm)
        const maxLen = parseDimension(g.max_length_mm)

        if (minLen === null) {
          itemErr.min_length_mm = 'Comprimento mínimo é obrigatório.'
        } else if (minLen <= 0) {
          itemErr.min_length_mm = 'Comprimento mínimo deve ser maior que zero.'
        }

        if (maxLen === null) {
          itemErr.max_length_mm = 'Comprimento máximo é obrigatório.'
        } else if (maxLen <= 0) {
          itemErr.max_length_mm = 'Comprimento máximo deve ser maior que zero.'
        }

        if (minLen !== null && maxLen !== null && minLen > 0 && maxLen > 0 && minLen > maxLen) {
          itemErr.min_length_mm = 'Comprimento mín não pode ser maior que o máx.'
          itemErr.max_length_mm = 'Comprimento máx não pode ser menor que o mín.'
        }

        if (Object.keys(itemErr).length > 0) {
          gaugeErrors[index] = itemErr
        }
      })

      if (Object.keys(gaugeErrors).length > 0) {
        errors.gauge_errors = gaugeErrors
        if (!errors.gauges) {
          errors.gauges = 'Existem bitolas com dados inválidos ou incompletos.'
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

      return list.map((item) => ({
        ...item,
        gauges_json: Array.isArray(item.gauges_json) ? item.gauges_json : [],
        gauges_count: Array.isArray(item.gauges_json)
          ? item.gauges_json.length
          : item.gauges_count || 0,
      }))
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
        errors.family_name ||
        errors.cylinder_code ||
        errors.pm_equipment_code ||
        errors.min_mp_diameter_mm ||
        errors.max_mp_diameter_mm ||
        errors.gauges ||
        errors.general ||
        'Formulário contém dados inválidos.'
      throw new Error(String(firstMsg))
    }

    // Valida duplicidade
    const isDuplicate = await this.checkDuplicate({
      lineId: data.line_id,
      centerCode: data.center_code,
      familyName: data.family_name,
      excludeId: data.id,
    })

    if (isDuplicate) {
      throw new Error(`A família "${data.family_name.trim()}" já está cadastrada para este centro.`)
    }

    const minMp = parseDimension(data.min_mp_diameter_mm) ?? 0
    const maxMp = parseDimension(data.max_mp_diameter_mm) ?? 0

    const normalizedGauges: LineFamilyGauge[] = data.gauges.map((g, idx) => ({
      id: g.id || `gauge-${Date.now()}-${idx}`,
      bitola: g.bitola.trim(),
      min_length_mm: parseDimension(g.min_length_mm) ?? 0,
      max_length_mm: parseDimension(g.max_length_mm) ?? 0,
    }))

    const cylinder = this.findEquipmentByCylinder(data.cylinder_code)

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
      cylinder_code: data.cylinder_code.trim(),
      cylinder_name: cylinder?.name || data.cylinder_code.trim(),
      pm_equipment_code: data.pm_equipment_code.trim(),
      pm_equipment_name: cylinder?.pmEquipmentName || data.pm_equipment_code.trim(),
      min_mp_diameter_mm: Number(minMp.toFixed(2)),
      max_mp_diameter_mm: Number(maxMp.toFixed(2)),
      gauges_json: normalizedGauges,
      gauges_count: normalizedGauges.length,
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

    // Auditoria append-only em pcp_audit_logs
    try {
      const diffList: string[] = []
      if (previousRecord) {
        if (previousRecord.family_name !== saved.family_name) {
          diffList.push(`Família: "${previousRecord.family_name}" → "${saved.family_name}"`)
        }
        if (previousRecord.cylinder_code !== saved.cylinder_code) {
          diffList.push(`Cilindro: "${previousRecord.cylinder_code}" → "${saved.cylinder_code}"`)
        }
        if (previousRecord.pm_equipment_code !== saved.pm_equipment_code) {
          diffList.push(
            `Equipamento PM: "${previousRecord.pm_equipment_code}" → "${saved.pm_equipment_code}"`,
          )
        }
        if (
          previousRecord.min_mp_diameter_mm !== saved.min_mp_diameter_mm ||
          previousRecord.max_mp_diameter_mm !== saved.max_mp_diameter_mm
        ) {
          diffList.push(
            `Faixa MP: [${formatMm(previousRecord.min_mp_diameter_mm)} - ${formatMm(previousRecord.max_mp_diameter_mm)}] → [${formatMm(saved.min_mp_diameter_mm)} - ${formatMm(saved.max_mp_diameter_mm)}]`,
          )
        }
        if (previousRecord.active !== saved.active) {
          diffList.push(
            `Status: ${previousRecord.active ? 'Ativa' : 'Inativa'} → ${saved.active ? 'Ativa' : 'Inativa'}`,
          )
        }
        if (previousRecord.gauges_count !== saved.gauges_count) {
          diffList.push(`Qtd Bitolas: ${previousRecord.gauges_count} → ${saved.gauges_count}`)
        }
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
          cylinder_code: saved.cylinder_code,
          pm_equipment_code: saved.pm_equipment_code,
          min_mp_diameter_mm: saved.min_mp_diameter_mm,
          max_mp_diameter_mm: saved.max_mp_diameter_mm,
          gauges_count: saved.gauges_count,
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

    return saved
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

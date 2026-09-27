/**
 * Serviço Oficial de Matéria-Prima por Aplicação (Ficha Mestra Expandida & Programação Mensal)
 * Módulo PCP Robotizado - HUB Ciafal
 *
 * Inclui:
 * - CRUD completo com transações e persistência no PocketBase
 * - Validações dos 8 casos de erro sob os campos correspondentes
 * - Auditoria completa em pcp_audit_logs (append-only)
 * - Rastreabilidade técnica para validação na Programação Mensal (Fase 2)
 */

import pb from '@/lib/pocketbase/client'
import {
  LineRawMaterialApplication,
  RawMaterialApplicationFormData,
  RawMaterialApplicationValidationErrors,
  RawMaterialApplicationFilters,
} from '@/types/raw-material-application'
import {
  parseBrNumber,
  formatBrNumber,
  formatBrDateTime,
  calculateReductionFromRatioX,
} from '@/utils/number-br-formatters'

export const rawMaterialApplicationService = {
  /**
   * Valida os campos do formulário conforme as regras técnicas obrigatórias:
   * 1. Código MP obrigatório (não vazio)
   * 2. Aplicação obrigatória
   * 3. Valores negativos não permitidos
   * 4. Peso mínimo > Peso máximo -> erro
   * 5. Peso médio < Peso mínimo -> erro
   * 6. Peso médio > Peso máximo -> erro
   * 7. Comprimento mínimo da MP > Comprimento máximo da MP -> erro
   * 8. Redução inválida (divisão por zero ou X <= 0) -> erro
   */
  validateFormData(data: RawMaterialApplicationFormData): RawMaterialApplicationValidationErrors {
    const errors: RawMaterialApplicationValidationErrors = {}

    // 1. Código MP vazio bloqueado
    if (!data.raw_material_code || !data.raw_material_code.trim()) {
      errors.raw_material_code = 'Código MP é obrigatório.'
    }

    // Aplicação obrigatória
    if (!data.application || !data.application.trim()) {
      errors.application = 'Aplicação é obrigatória.'
    }

    // Parse dos números (suporta pt-BR com vírgula ou number puro)
    const avgW = parseBrNumber(data.average_weight_kg)
    const maxW = parseBrNumber(data.max_weight_kg)
    const minW = parseBrNumber(data.min_weight_kg)

    const rolledL = parseBrNumber(data.rolled_length_m)
    const multL = parseBrNumber(data.multiple_length_m)
    const maxMpL = parseBrNumber(data.max_mp_length_m)
    const minMpL = parseBrNumber(data.min_mp_length_m)

    // Validação de valores negativos
    if (avgW !== null && avgW < 0) {
      errors.average_weight_kg = 'Peso médio não pode ser negativo.'
    }
    if (maxW !== null && maxW < 0) {
      errors.max_weight_kg = 'Peso máximo não pode ser negativo.'
    }
    if (minW !== null && minW < 0) {
      errors.min_weight_kg = 'Peso mínimo não pode ser negativo.'
    }
    if (rolledL !== null && rolledL < 0) {
      errors.rolled_length_m = 'Comprimento laminado não pode ser negativo.'
    }
    if (multL !== null && multL < 0) {
      errors.multiple_length_m = 'Comprimento múltiplo não pode ser negativo.'
    }
    if (maxMpL !== null && maxMpL < 0) {
      errors.max_mp_length_m = 'Comprimento máximo MP não pode ser negativo.'
    }
    if (minMpL !== null && minMpL < 0) {
      errors.min_mp_length_m = 'Comprimento mínimo MP não pode ser negativo.'
    }

    // Validações de consistência de Peso
    if (minW !== null && maxW !== null && minW > maxW) {
      errors.min_weight_kg = 'Peso mínimo não pode ser maior que o peso máximo.'
    }
    if (avgW !== null && minW !== null && avgW < minW) {
      errors.average_weight_kg = 'Peso médio não pode ser menor que o peso mínimo.'
    }
    if (avgW !== null && maxW !== null && avgW > maxW) {
      errors.average_weight_kg = 'Peso médio não pode ser maior que o peso máximo.'
    }

    // Validações de consistência de Comprimento
    if (minMpL !== null && maxMpL !== null && minMpL > maxMpL) {
      errors.min_mp_length_m =
        'Comprimento mínimo da MP não pode ser maior que o comprimento máximo.'
    }

    // Validação de Redução (se preenchida razão 1:X)
    if (
      data.reduction_ratio_x !== undefined &&
      data.reduction_ratio_x !== null &&
      data.reduction_ratio_x !== ''
    ) {
      const redResult = calculateReductionFromRatioX(data.reduction_ratio_x)
      if (!redResult.isValid) {
        errors.reduction = redResult.error || 'Redução inválida.'
      }
    }

    return errors
  },

  /**
   * Verifica se já existe um registro duplicado exatamente igual para a combinação:
   * Centro + Produto + Aplicação + Código MP
   */
  async checkDuplicate(params: {
    lineId: string
    centerCode: string
    productCode: string
    application: string
    rawMaterialCode: string
    excludeId?: string
  }): Promise<boolean> {
    const center = params.centerCode.trim()
    const product = params.productCode.trim().toUpperCase()
    const app = params.application.trim().toUpperCase()
    const mp = params.rawMaterialCode.trim().toUpperCase()

    try {
      const records = await pb
        .collection('line_raw_material_applications')
        .getFullList<LineRawMaterialApplication>({
          filter: `line_id = '${params.lineId}'`,
        })

      return records.some((r) => {
        if (params.excludeId && r.id === params.excludeId) return false
        return (
          (r.center_code || '').trim().toUpperCase() === center.toUpperCase() &&
          (r.product_code || '').trim().toUpperCase() === product &&
          (r.application || '').trim().toUpperCase() === app &&
          (r.raw_material_code || '').trim().toUpperCase() === mp
        )
      })
    } catch (err) {
      console.warn('Erro ao verificar duplicidade de matéria-prima por aplicação:', err)
      return false
    }
  },

  /**
   * Lista todos os registros de uma linha com ordenação e filtros
   */
  async listByLine(
    lineId: string,
    filters?: RawMaterialApplicationFilters,
  ): Promise<LineRawMaterialApplication[]> {
    try {
      const list = await pb
        .collection('line_raw_material_applications')
        .getFullList<LineRawMaterialApplication>({
          filter: `line_id = '${lineId}'`,
          sort: '-created',
        })

      if (!filters) return list

      return list.filter((item) => {
        if (filters.center_code && item.center_code !== filters.center_code) return false
        if (filters.product_code && item.product_code !== filters.product_code) return false
        if (filters.raw_material_code && item.raw_material_code !== filters.raw_material_code)
          return false
        if (filters.supplier && item.supplier !== filters.supplier) return false
        if (filters.application && item.application !== filters.application) return false
        if (filters.status && filters.status !== 'Todos' && item.status !== filters.status)
          return false
        if (filters.first_run && filters.first_run !== 'Todos') {
          const expected = filters.first_run === 'Sim'
          if (Boolean(item.first_run) !== expected) return false
        }
        if (filters.allow_out_of_standard_mp && filters.allow_out_of_standard_mp !== 'Todos') {
          const expected = filters.allow_out_of_standard_mp === 'Sim'
          if (Boolean(item.allow_out_of_standard_mp) !== expected) return false
        }
        if (filters.search && filters.search.trim()) {
          const s = filters.search.toLowerCase()
          const combined = [
            item.center_code,
            item.product_code,
            item.product_description,
            item.raw_material_code,
            item.raw_material_description,
            item.supplier,
            item.application,
            item.notes,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (!combined.includes(s)) return false
        }
        return true
      })
    } catch (err) {
      console.warn('Falha ao listar matérias-primas por aplicação:', err)
      return []
    }
  },

  /**
   * Salva (criação ou edição) com registro de auditoria antes/depois
   */
  async save(formData: RawMaterialApplicationFormData): Promise<LineRawMaterialApplication> {
    // 1. Validações locais
    const errors = this.validateFormData(formData)
    if (Object.keys(errors).length > 0) {
      const firstErr = Object.values(errors)[0] as string
      throw new Error(firstErr)
    }

    // 2. Validação de duplicidade
    const isDup = await this.checkDuplicate({
      lineId: formData.line_id,
      centerCode: formData.center_code,
      productCode: formData.product_code,
      application: formData.application,
      rawMaterialCode: formData.raw_material_code,
      excludeId: formData.id,
    })
    if (isDup) {
      throw new Error(
        `Já existe cadastro idêntico para a combinação Centro "${formData.center_code}", Produto "${formData.product_code}", Aplicação "${formData.application}" e Código MP "${formData.raw_material_code}".`,
      )
    }

    const isEditing = Boolean(formData.id)
    let previousRecord: LineRawMaterialApplication | null = null
    if (isEditing && formData.id) {
      try {
        previousRecord = await pb
          .collection('line_raw_material_applications')
          .getOne<LineRawMaterialApplication>(formData.id)
      } catch {
        previousRecord = null
      }
    }

    // Parse dos campos numéricos
    const avgW = parseBrNumber(formData.average_weight_kg)
    const maxW = parseBrNumber(formData.max_weight_kg)
    const minW = parseBrNumber(formData.min_weight_kg)
    const rolledL = parseBrNumber(formData.rolled_length_m)
    const multL = parseBrNumber(formData.multiple_length_m)
    const maxMpL = parseBrNumber(formData.max_mp_length_m)
    const minMpL = parseBrNumber(formData.min_mp_length_m)

    // Redução sincronizada
    let redRatioX: number | null = null
    let redRatioText: string | null = null
    let redPercentage: number | null = null

    if (
      formData.reduction_ratio_x !== undefined &&
      formData.reduction_ratio_x !== null &&
      formData.reduction_ratio_x !== ''
    ) {
      const redResult = calculateReductionFromRatioX(formData.reduction_ratio_x)
      if (redResult.isValid) {
        redRatioX = redResult.ratioX
        redRatioText = redResult.ratioText
        redPercentage = redResult.percentage
      }
    }

    const currentUser = pb.authStore.record || pb.authStore.model

    const payload: Partial<LineRawMaterialApplication> = {
      line_id: formData.line_id,
      line_master_id: formData.line_master_id || undefined,
      center_code: formData.center_code.trim(),
      product_code: formData.product_code.trim().toUpperCase(),
      product_description: formData.product_description?.trim() || '',
      raw_material_code: formData.raw_material_code.trim().toUpperCase(),
      raw_material_description: formData.raw_material_description?.trim() || '',
      supplier: formData.supplier?.trim() || '',
      supplier_id: formData.supplier_id?.trim() || '',
      application: formData.application.trim(),
      bitola_ref: formData.bitola_ref?.trim() || '',
      steel_type: formData.steel_type?.trim() || '',
      average_weight_kg: avgW,
      max_weight_kg: maxW,
      min_weight_kg: minW,
      rolled_length_m: rolledL,
      multiple_length_m: multL,
      max_mp_length_m: maxMpL,
      min_mp_length_m: minMpL,
      reduction_ratio_x: redRatioX,
      reduction_ratio_text: redRatioText,
      reduction_percentage: redPercentage,
      first_run: Boolean(formData.first_run),
      allow_out_of_standard_mp: Boolean(formData.allow_out_of_standard_mp),
      status: formData.status,
      notes: formData.notes?.trim() || '',
    }

    if (!isEditing) {
      payload.created_by_user_id = currentUser?.id || ''
      payload.created_by_user_name =
        (currentUser as any)?.name || (currentUser as any)?.email || 'Usuário PCP'
    } else {
      payload.updated_by_user_id = currentUser?.id || ''
      payload.updated_by_user_name =
        (currentUser as any)?.name || (currentUser as any)?.email || 'Usuário PCP'
    }

    let saved: LineRawMaterialApplication
    if (isEditing && formData.id) {
      saved = await pb
        .collection('line_raw_material_applications')
        .update<LineRawMaterialApplication>(formData.id, payload)
    } else {
      saved = await pb
        .collection('line_raw_material_applications')
        .create<LineRawMaterialApplication>(payload)
    }

    // Auditoria oficial append-only em pcp_audit_logs
    try {
      const operation = isEditing ? 'EDIÇÃO' : 'CRIAÇÃO'
      const auditAction = isEditing
        ? 'LINE_RAW_MATERIAL_APPLICATION_UPDATE'
        : 'LINE_RAW_MATERIAL_APPLICATION_CREATE'

      const diffList: string[] = []
      if (previousRecord) {
        if (previousRecord.raw_material_code !== saved.raw_material_code) {
          diffList.push(
            `Código MP: ${previousRecord.raw_material_code} → ${saved.raw_material_code}`,
          )
        }
        if (previousRecord.supplier !== saved.supplier) {
          diffList.push(`Fornecedor: ${previousRecord.supplier || '-'} → ${saved.supplier || '-'}`)
        }
        if (previousRecord.application !== saved.application) {
          diffList.push(`Aplicação: ${previousRecord.application} → ${saved.application}`)
        }
        if (previousRecord.average_weight_kg !== saved.average_weight_kg) {
          diffList.push(
            `Peso médio: ${formatBrNumber(previousRecord.average_weight_kg)} kg → ${formatBrNumber(saved.average_weight_kg)} kg`,
          )
        }
        if (previousRecord.max_weight_kg !== saved.max_weight_kg) {
          diffList.push(
            `Peso máximo: ${formatBrNumber(previousRecord.max_weight_kg)} kg → ${formatBrNumber(saved.max_weight_kg)} kg`,
          )
        }
        if (previousRecord.min_weight_kg !== saved.min_weight_kg) {
          diffList.push(
            `Peso mínimo: ${formatBrNumber(previousRecord.min_weight_kg)} kg → ${formatBrNumber(saved.min_weight_kg)} kg`,
          )
        }
        if (previousRecord.rolled_length_m !== saved.rolled_length_m) {
          diffList.push(
            `Comprimento laminado: ${formatBrNumber(previousRecord.rolled_length_m)} m → ${formatBrNumber(saved.rolled_length_m)} m`,
          )
        }
        if (previousRecord.multiple_length_m !== saved.multiple_length_m) {
          diffList.push(
            `Comprimento múltiplo: ${formatBrNumber(previousRecord.multiple_length_m)} m → ${formatBrNumber(saved.multiple_length_m)} m`,
          )
        }
        if (previousRecord.max_mp_length_m !== saved.max_mp_length_m) {
          diffList.push(
            `Comprimento máx MP: ${formatBrNumber(previousRecord.max_mp_length_m)} m → ${formatBrNumber(saved.max_mp_length_m)} m`,
          )
        }
        if (previousRecord.min_mp_length_m !== saved.min_mp_length_m) {
          diffList.push(
            `Comprimento mín MP: ${formatBrNumber(previousRecord.min_mp_length_m)} m → ${formatBrNumber(saved.min_mp_length_m)} m`,
          )
        }
        if (previousRecord.reduction_ratio_text !== saved.reduction_ratio_text) {
          diffList.push(
            `Redução (razão): ${previousRecord.reduction_ratio_text || '-'} → ${saved.reduction_ratio_text || '-'}`,
          )
        }
        if (previousRecord.reduction_percentage !== saved.reduction_percentage) {
          diffList.push(
            `Redução (%): ${formatBrNumber(previousRecord.reduction_percentage)}% → ${formatBrNumber(saved.reduction_percentage)}%`,
          )
        }
        if (previousRecord.first_run !== saved.first_run) {
          diffList.push(
            `1ª corrida: ${previousRecord.first_run ? 'Sim' : 'Não'} → ${saved.first_run ? 'Sim' : 'Não'}`,
          )
        }
        if (previousRecord.allow_out_of_standard_mp !== saved.allow_out_of_standard_mp) {
          diffList.push(
            `Permitir fora padrão MP: ${previousRecord.allow_out_of_standard_mp ? 'Sim' : 'Não'} → ${saved.allow_out_of_standard_mp ? 'Sim' : 'Não'}`,
          )
        }
        if (previousRecord.status !== saved.status) {
          diffList.push(`Status: ${previousRecord.status} → ${saved.status}`)
        }
      }

      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: (currentUser as any)?.email || '',
        user_name: (currentUser as any)?.name || (currentUser as any)?.email || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'RULE_ACTION',
        action: auditAction,
        resource: 'line_raw_material_applications',
        resource_id: saved.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        line: saved.center_code,
        center: saved.center_code,
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra Expandida > Matéria-prima por aplicação',
        entity: 'line_raw_material_applications',
        record_id: saved.id,
        status: saved.status,
        reason: `${operation}: MP ${saved.raw_material_code} para produto ${saved.product_code} (${saved.application})`,
        details: {
          operation_type: operation,
          user: (currentUser as any)?.name || 'Usuário PCP',
          date_time_br: formatBrDateTime(),
          center: saved.center_code,
          product_code: saved.product_code,
          raw_material_code: saved.raw_material_code,
          supplier: saved.supplier,
          application: saved.application,
          previous_value: previousRecord,
          new_value: saved,
          origin: 'Ficha Mestra Expandida',
          diff_descriptions: diffList,
        },
      })
    } catch (auditErr) {
      console.warn('Falha na auditoria de matéria-prima por aplicação:', auditErr)
    }

    return saved
  },

  /**
   * Altera status (Ativar/Inativar) com auditoria
   */
  async toggleStatus(item: LineRawMaterialApplication): Promise<LineRawMaterialApplication> {
    const newStatus: 'Ativo' | 'Inativo' = item.status === 'Ativo' ? 'Inativo' : 'Ativo'
    const currentUser = pb.authStore.record || pb.authStore.model

    const updated = await pb
      .collection('line_raw_material_applications')
      .update<LineRawMaterialApplication>(item.id, {
        status: newStatus,
        updated_by_user_id: currentUser?.id || '',
        updated_by_user_name: (currentUser as any)?.name || 'Usuário PCP',
      })

    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: (currentUser as any)?.email || '',
        user_name: (currentUser as any)?.name || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'RULE_ACTION',
        action: newStatus === 'Ativo' ? 'ACTIVATE_MP_APPLICATION' : 'DEACTIVATE_MP_APPLICATION',
        resource: 'line_raw_material_applications',
        resource_id: item.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        line: item.center_code,
        center: item.center_code,
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra Expandida > Matéria-prima por aplicação',
        entity: 'line_raw_material_applications',
        record_id: item.id,
        status: newStatus,
        reason: `Alteração de status de ${item.status} para ${newStatus} na MP ${item.raw_material_code}`,
        details: {
          user: (currentUser as any)?.name || 'Usuário PCP',
          date_time_br: formatBrDateTime(),
          center: item.center_code,
          product_code: item.product_code,
          raw_material_code: item.raw_material_code,
          previous_status: item.status,
          new_status: newStatus,
          origin: 'Ficha Mestra Expandida',
        },
      })
    } catch (auditErr) {
      console.warn('Falha na auditoria de ativação/inativação de MP:', auditErr)
    }

    return updated
  },

  /**
   * Salva alterações em campos de Produtividade com novos campos:
   * Comprimento máximo (m), Comprimento mínimo (m), kg/metro (kg/m)
   * e registra histórico e auditoria completa.
   */
  async saveProductivityWithDimensions(params: {
    id?: string
    line_id: string
    line_master_id?: string
    product_family_id?: string
    material_product_code: string
    material_product_name: string
    raw_material_type?: string
    enfornamento_type?: string
    productivity_unit: 't/h' | 'peça/h' | 'm/h'
    nominal_productivity?: number
    expected_efficiency_pct?: number
    valid_from?: string
    valid_until?: string
    active?: boolean
    max_length_m?: number | null
    min_length_m?: number | null
    kg_per_meter?: number | null
  }) {
    // Validações dos novos campos:
    if (
      params.min_length_m !== null &&
      params.min_length_m !== undefined &&
      params.max_length_m !== null &&
      params.max_length_m !== undefined &&
      params.min_length_m > params.max_length_m
    ) {
      throw new Error('Comprimento mínimo não pode ser maior que o comprimento máximo.')
    }

    if (
      params.kg_per_meter !== null &&
      params.kg_per_meter !== undefined &&
      params.kg_per_meter <= 0
    ) {
      throw new Error('kg/metro (kg/m) deve ser maior que zero.')
    }

    let previousRecord: any = null
    if (params.id) {
      try {
        previousRecord = await pb.collection('line_productivity_rates').getOne(params.id)
      } catch {
        previousRecord = null
      }
    }

    const payload: Record<string, any> = {
      line_id: params.line_id,
      line_master_id: params.line_master_id || undefined,
      product_family_id: params.product_family_id || undefined,
      material_product_code: params.material_product_code.trim().toUpperCase(),
      material_product_name: params.material_product_name.trim(),
      raw_material_type: params.raw_material_type,
      enfornamento_type: params.enfornamento_type,
      productivity_unit: params.productivity_unit,
      nominal_productivity: params.nominal_productivity,
      expected_efficiency_pct: params.expected_efficiency_pct,
      valid_from: params.valid_from,
      valid_until: params.valid_until || null,
      active: params.active !== false,
      source_mode: 'MANUAL',
      max_length_m: params.max_length_m ?? null,
      min_length_m: params.min_length_m ?? null,
      kg_per_meter: params.kg_per_meter ?? null,
    }

    let saved: any
    if (params.id) {
      saved = await pb.collection('line_productivity_rates').update(params.id, payload)
    } else {
      saved = await pb.collection('line_productivity_rates').create(payload)
    }

    // Auditoria com detalhes antes/depois
    const currentUser = pb.authStore.record || pb.authStore.model
    const isEditing = Boolean(params.id)

    try {
      const diffList: string[] = []
      if (previousRecord) {
        if (previousRecord.max_length_m !== saved.max_length_m) {
          diffList.push(
            `Comprimento máx: ${formatBrNumber(previousRecord.max_length_m)} m → ${formatBrNumber(saved.max_length_m)} m`,
          )
        }
        if (previousRecord.min_length_m !== saved.min_length_m) {
          diffList.push(
            `Comprimento mín: ${formatBrNumber(previousRecord.min_length_m)} m → ${formatBrNumber(saved.min_length_m)} m`,
          )
        }
        if (previousRecord.kg_per_meter !== saved.kg_per_meter) {
          diffList.push(
            `kg/metro: ${formatBrNumber(previousRecord.kg_per_meter)} kg/m → ${formatBrNumber(saved.kg_per_meter)} kg/m`,
          )
        }
      }

      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: (currentUser as any)?.email || '',
        user_name: (currentUser as any)?.name || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: isEditing ? 'LINE_PRODUCTIVITY_UPDATE' : 'LINE_PRODUCTIVITY_CREATE',
        resource: 'line_productivity_rates',
        resource_id: saved.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        company: 'CIAFAL',
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestre Expandida > Produtividade',
        entity: 'line_productivity_rates',
        record_id: saved.id,
        status: saved.active ? 'Ativo' : 'Inativo',
        reason: `${isEditing ? 'Edição' : 'Criação'} de produtividade com dimensões técnicas`,
        details: {
          material: saved.material_product_code,
          user: (currentUser as any)?.name || 'Usuário PCP',
          date_time_br: formatBrDateTime(),
          max_length_m: saved.max_length_m,
          min_length_m: saved.min_length_m,
          kg_per_meter: saved.kg_per_meter,
          previous_value: previousRecord,
          new_value: saved,
          diff_descriptions: diffList,
          origin: 'Ficha Mestra Expandida > Produtividade',
        },
      })
    } catch (auditErr) {
      console.warn('Falha na auditoria de produtividade:', auditErr)
    }

    return saved
  },

  /**
   * Método de validação e rastreabilidade para a Programação Mensal (Preparação para a Fase 2)
   * - Bloqueia MP inativa
   * - Se Permitir fora padrão MP = NÃO: bloqueia fora de limites técnicos
   * - Se Permitir fora padrão MP = SIM: autoriza com alerta de exceção e auditoria
   * - NUNCA permite o programador burlar a regra durante a programação (autorização exclusivamente técnica)
   */
  async validateMpForMonthlySchedule(params: {
    scheduleId?: string
    monthlyPeriod: string
    centerCode: string
    productCode: string
    rawMaterialCode: string
    application: string
    weightKg?: number
    lengthM?: number
    userId?: string
    userName?: string
    userRole?: string
  }): Promise<{
    allowed: boolean
    validationResult:
      | 'APPROVED'
      | 'REJECTED_INACTIVE'
      | 'REJECTED_OUT_OF_STANDARD'
      | 'APPROVED_WITH_EXCEPTION'
    message: string
    mpApplication?: LineRawMaterialApplication
  }> {
    const records = await pb
      .collection('line_raw_material_applications')
      .getFullList<LineRawMaterialApplication>({
        filter: `center_code = '${params.centerCode}' && product_code = '${params.productCode}' && raw_material_code = '${params.rawMaterialCode}' && application = '${params.application}'`,
      })
      .catch(() => [])

    if (records.length === 0) {
      return {
        allowed: false,
        validationResult: 'REJECTED_OUT_OF_STANDARD',
        message: 'Combinação de Matéria-Prima, Produto e Aplicação não cadastrada na Ficha Mestra.',
      }
    }

    const mpApp = records[0]

    // 1. Não permitir MP inativa na Programação Mensal
    if (mpApp.status === 'Inativo') {
      await this.recordMonthlyValidation({
        ...params,
        mpApplicationId: mpApp.id,
        validationResult: 'REJECTED_INACTIVE',
        exceptionUsed: false,
        message:
          'Matéria-prima com status INATIVO na Ficha Mestra. Uso bloqueado na Programação Mensal.',
      })

      return {
        allowed: false,
        validationResult: 'REJECTED_INACTIVE',
        message:
          'Matéria-prima com status INATIVO na Ficha Mestra. Uso bloqueado na Programação Mensal.',
        mpApplication: mpApp,
      }
    }

    // 2. Verificar limites de peso e comprimento
    let isOutOfStandard = false
    const reasons: string[] = []

    if (params.weightKg !== undefined && params.weightKg !== null) {
      if (
        mpApp.max_weight_kg !== null &&
        mpApp.max_weight_kg !== undefined &&
        params.weightKg > mpApp.max_weight_kg
      ) {
        isOutOfStandard = true
        reasons.push(
          `Peso informado (${formatBrNumber(params.weightKg)} kg) excede o máximo (${formatBrNumber(mpApp.max_weight_kg)} kg).`,
        )
      }
      if (
        mpApp.min_weight_kg !== null &&
        mpApp.min_weight_kg !== undefined &&
        params.weightKg < mpApp.min_weight_kg
      ) {
        isOutOfStandard = true
        reasons.push(
          `Peso informado (${formatBrNumber(params.weightKg)} kg) é menor que o mínimo (${formatBrNumber(mpApp.min_weight_kg)} kg).`,
        )
      }
    }

    if (params.lengthM !== undefined && params.lengthM !== null) {
      if (
        mpApp.max_mp_length_m !== null &&
        mpApp.max_mp_length_m !== undefined &&
        params.lengthM > mpApp.max_mp_length_m
      ) {
        isOutOfStandard = true
        reasons.push(
          `Comprimento informado (${formatBrNumber(params.lengthM)} m) excede o máximo (${formatBrNumber(mpApp.max_mp_length_m)} m).`,
        )
      }
      if (
        mpApp.min_mp_length_m !== null &&
        mpApp.min_mp_length_m !== undefined &&
        params.lengthM < mpApp.min_mp_length_m
      ) {
        isOutOfStandard = true
        reasons.push(
          `Comprimento informado (${formatBrNumber(params.lengthM)} m) é menor que o mínimo (${formatBrNumber(mpApp.min_mp_length_m)} m).`,
        )
      }
    }

    if (isOutOfStandard) {
      // Se permitir fora padrão MP = NÃO: bloqueio rígido
      if (!mpApp.allow_out_of_standard_mp) {
        const msg = `Bloqueio: Matéria-prima fora dos limites técnicos cadastrados na Ficha Mestra (${reasons.join(' ')}).`
        await this.recordMonthlyValidation({
          ...params,
          mpApplicationId: mpApp.id,
          validationResult: 'REJECTED_OUT_OF_STANDARD',
          exceptionUsed: false,
          message: msg,
        })

        return {
          allowed: false,
          validationResult: 'REJECTED_OUT_OF_STANDARD',
          message: msg,
          mpApplication: mpApp,
        }
      }

      // Se permitir fora padrão MP = SIM: autorização técnica com alerta oficial
      const alertMsg =
        'Matéria-prima fora do padrão técnico — exceção autorizada pela Ficha Mestra.'
      await this.recordMonthlyValidation({
        ...params,
        mpApplicationId: mpApp.id,
        validationResult: 'APPROVED_WITH_EXCEPTION',
        exceptionUsed: true,
        message: alertMsg,
      })

      return {
        allowed: true,
        validationResult: 'APPROVED_WITH_EXCEPTION',
        message: alertMsg,
        mpApplication: mpApp,
      }
    }

    // 3. Aprovado padrão dentro dos limites técnicos
    await this.recordMonthlyValidation({
      ...params,
      mpApplicationId: mpApp.id,
      validationResult: 'APPROVED',
      exceptionUsed: false,
      message:
        'Matéria-prima e aplicação aprovadas conforme especificação técnica da Ficha Mestra.',
    })

    return {
      allowed: true,
      validationResult: 'APPROVED',
      message:
        'Matéria-prima e aplicação aprovadas conforme especificação técnica da Ficha Mestra.',
      mpApplication: mpApp,
    }
  },

  /**
   * Grava registro na coleção de validações e rastreabilidade para a Fase 2
   */
  async recordMonthlyValidation(params: {
    scheduleId?: string
    monthlyPeriod: string
    centerCode: string
    productCode: string
    rawMaterialCode: string
    application: string
    mpApplicationId?: string
    validationResult:
      | 'APPROVED'
      | 'REJECTED_INACTIVE'
      | 'REJECTED_OUT_OF_STANDARD'
      | 'APPROVED_WITH_EXCEPTION'
    exceptionUsed: boolean
    message: string
    userId?: string
    userName?: string
    userRole?: string
  }) {
    try {
      await pb.collection('pcp_monthly_schedule_mp_validations').create({
        schedule_id: params.scheduleId || '',
        monthly_period: params.monthlyPeriod,
        center_code: params.centerCode,
        product_code: params.productCode,
        raw_material_code: params.rawMaterialCode,
        application: params.application,
        mp_application_id: params.mpApplicationId || '',
        validation_result: params.validationResult,
        exception_used: params.exceptionUsed,
        exception_alert_message: params.message,
        user_id: params.userId || '',
        user_name: params.userName || 'Sistema PCP',
        user_role: params.userRole || 'PCP_PROGRAMMER',
        validated_at_formatted: formatBrDateTime(),
      })
    } catch (err) {
      console.warn('Falha ao gravar rastreabilidade de validação mensal:', err)
    }
  },
}

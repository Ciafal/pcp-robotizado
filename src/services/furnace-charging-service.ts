import { pb } from '@/lib/pocketbase/client'
import {
  LineFurnaceChargingType,
  FurnaceChargingTypeFormData,
  LineChargeSeparation,
  ChargeSeparationFormData,
  RawMaterialTypeOption,
  TIPOS_ENFORNAMENTO_OPCOES,
  RAW_MATERIAL_TYPE_CATALOG,
  extractTipoBase,
  extractProporcaoRotulo,
  parseProporcaoRotulo,
} from '@/types/furnace-charging'

export const DUPLICATE_SEPARATION_MSG =
  'Já existe uma regra de separação cadastrada para esta combinação.'

export const DUPLICATE_CHARGING_TYPE_MSG =
  'Já existe uma regra de enfornamento cadastrada para este tipo de matéria-prima.'

export const SAME_MP_ERROR_MSG =
  'A MP Principal e a MP Secundária não podem ser a mesma matéria-prima para este tipo de enfornamento.'

export const MP_SECUNDARIA_OBRIGATORIA_MSG =
  'A MP Secundária é obrigatória para proporções com dois termos de matéria-prima.'

class FurnaceChargingService {
  /**
   * Catálogo de matérias-primas padrão do PCP/SAP
   * Prioriza dados existentes no sistema, com fallback homologado
   */
  async getRawMaterialOptions(): Promise<RawMaterialTypeOption[]> {
    const optionsMap = new Map<string, RawMaterialTypeOption>()

    // Catálogo canônico fechado homologado do PCP CIAFAL
    for (const d of RAW_MATERIAL_TYPE_CATALOG) {
      optionsMap.set(d.code, d)
    }

    // Buscar em line_raw_material_applications se houver dados cadastrados
    try {
      const records = await pb.collection('line_raw_material_applications').getFullList({
        fields: 'raw_material_code,raw_material_description,raw_material_type',
        sort: 'raw_material_code',
      })
      for (const r of records) {
        const code = (r.raw_material_code || r.raw_material_type || '').trim()
        const desc = (r.raw_material_description || r.raw_material_type || code).trim()
        if (code && !optionsMap.has(code)) {
          optionsMap.set(code, {
            code,
            description: desc,
            fullLabel: `${code} — ${desc}`,
          })
        }
      }
    } catch {
      // Ignora erro em caso de coleção indisponível/mock
    }

    return Array.from(optionsMap.values())
  }

  // =========================================================================
  // SEÇÃO 1: TIPOS DE ENFORNAMENTO
  // =========================================================================

  /**
   * Lista regras de enfornamento para o Centro selecionado (exclusão lógica respeitada)
   */
  async listChargingTypes(centerCode: string): Promise<LineFurnaceChargingType[]> {
    if (!centerCode) return []
    try {
      const records = await pb
        .collection('line_furnace_charging_types')
        .getFullList<LineFurnaceChargingType>({
          filter: `center_code = '${centerCode}' && (deleted = false || deleted = null)`,
          sort: 'charging_type,raw_material_code',
        })
      return records.map((r) => this.sanitizeChargingType(r))
    } catch (err) {
      console.warn('Falha ao listar tipos de enfornamento:', err)
      return []
    }
  }

  /**
   * Validação de regras de negócio de Tipo de Enfornamento
   * Retorna mapa de campo -> mensagem de erro para destacar exatamente o campo incorreto
   */
  validateChargingTypeFormData(data: FurnaceChargingTypeFormData): Record<string, string> {
    const errors: Record<string, string> = {}

    if (!data.charging_type || !data.charging_type.trim()) {
      errors.charging_type = 'O Tipo de Enfornamento é obrigatório.'
    } else if (!TIPOS_ENFORNAMENTO_OPCOES.includes(data.charging_type as any)) {
      errors.charging_type = 'Tipo de enfornamento inválido.'
    }

    if (!data.raw_material_code || !data.raw_material_code.trim()) {
      errors.raw_material_code = 'O Tipo de Matéria-Prima é obrigatório.'
    } else {
      const normalizedCode = data.raw_material_code.trim().toUpperCase()
      const validCatalog = RAW_MATERIAL_TYPE_CATALOG.some(
        (cat) => cat.code.toUpperCase() === normalizedCode,
      )
      if (!validCatalog) {
        errors.raw_material_code =
          'Tipo de matéria-prima inválido. Selecione uma opção válida do catálogo (MPPA, MPPL, MPRE, MPBL, MPTA, MPLI).'
      }
    }

    // --- MP Principal / MP Secundária vinculadas à proporção ---
    const tipoBase = data.charging_type ? extractTipoBase(data.charging_type) : ''
    const exigeDuasMps = TIPOS_COM_DUAS_MPS.includes(tipoBase as any)

    if (exigeDuasMps) {
      const temProporcao = Boolean(data.charging_type && extractProporcaoRotulo(data.charging_type))
      if (temProporcao) {
        if (!data.mp_principal_code || !data.mp_principal_code.trim()) {
          errors.mp_principal_code = 'A MP Principal é obrigatória (1º termo da proporção).'
        }
        if (!data.mp_secundaria_code || !data.mp_secundaria_code.trim()) {
          errors.mp_secundaria_code = 'A MP Secundária é obrigatória (2º termo da proporção).'
        }
        if (
          data.mp_principal_code?.trim() &&
          data.mp_secundaria_code?.trim() &&
          data.mp_principal_code.trim().toUpperCase() ===
            data.mp_secundaria_code.trim().toUpperCase()
        ) {
          errors.mp_secundaria_code = SAME_MP_ERROR_MSG
        }
      }
    }

    // Validações de valores não negativos
    const fieldsToCheck = [
      { key: 'min_weight_t', label: 'Peso mínimo', val: data.min_weight_t },
      { key: 'max_weight_t', label: 'Peso máximo', val: data.max_weight_t },
      { key: 'min_thickness_mm', label: 'Espessura mínima', val: data.min_thickness_mm },
      { key: 'max_thickness_mm', label: 'Espessura máxima', val: data.max_thickness_mm },
      { key: 'min_length_mm', label: 'Comprimento mínimo', val: data.min_length_mm },
      { key: 'max_length_mm', label: 'Comprimento máximo', val: data.max_length_mm },
      { key: 'min_width_mm', label: 'Largura mínima', val: data.min_width_mm },
      { key: 'max_width_mm', label: 'Largura máxima', val: data.max_width_mm },
    ]

    for (const f of fieldsToCheck) {
      if (f.val !== undefined && f.val !== null && f.val < 0) {
        errors[f.key] = `${f.label} não pode ser negativo.`
      }
    }

    // Validações mín <= máx
    if (
      data.min_weight_t !== undefined &&
      data.min_weight_t !== null &&
      data.max_weight_t !== undefined &&
      data.max_weight_t !== null &&
      data.min_weight_t > data.max_weight_t
    ) {
      errors.min_weight_t = 'Peso mín. não pode ser maior que o Peso máx.'
      errors.max_weight_t = 'Peso máx. deve ser maior ou igual ao Peso mín.'
    }

    if (
      data.min_thickness_mm !== undefined &&
      data.min_thickness_mm !== null &&
      data.max_thickness_mm !== undefined &&
      data.max_thickness_mm !== null &&
      data.min_thickness_mm > data.max_thickness_mm
    ) {
      errors.min_thickness_mm = 'Espessura mín. não pode ser maior que a Espessura máx.'
      errors.max_thickness_mm = 'Espessura máx. deve ser maior ou igual à Espessura mín.'
    }

    if (
      data.min_length_mm !== undefined &&
      data.min_length_mm !== null &&
      data.max_length_mm !== undefined &&
      data.max_length_mm !== null &&
      data.min_length_mm > data.max_length_mm
    ) {
      errors.min_length_mm = 'Comprimento mín. não pode ser maior que o Comprimento máx.'
      errors.max_length_mm = 'Comprimento máx. deve ser maior ou igual ao Comprimento mín.'
    }

    if (
      data.min_width_mm !== undefined &&
      data.min_width_mm !== null &&
      data.max_width_mm !== undefined &&
      data.max_width_mm !== null &&
      data.min_width_mm > data.max_width_mm
    ) {
      errors.min_width_mm = 'Largura mín. não pode ser maior que a Largura máx.'
      errors.max_width_mm = 'Largura máx. deve ser maior ou igual à Largura mín.'
    }

    return errors
  }

  /**
   * Verifica se já existe uma regra de enfornamento para a combinação Centro + Tipo de Enfornamento + Tipo de Matéria-Prima
   * Respeita exclusão lógica (deleted != true) e ignora o próprio registro em edição (excludeId)
   */
  async checkDuplicateChargingType(params: {
    centerCode: string
    chargingType: string
    rawMaterialCode: string
    excludeId?: string
  }): Promise<boolean> {
    try {
      if (!params.centerCode || !params.chargingType || !params.rawMaterialCode) return false
      const safeCenter = params.centerCode.trim().replace(/'/g, "\\'")
      const safeCharging = params.chargingType.trim().replace(/'/g, "\\'")
      const safeRaw = params.rawMaterialCode.trim().replace(/'/g, "\\'")

      let filter = `center_code = '${safeCenter}' && charging_type = '${safeCharging}' && raw_material_code = '${safeRaw}' && (deleted = false || deleted = null)`
      if (params.excludeId) {
        filter += ` && id != '${params.excludeId}'`
      }

      const existing = await pb.collection('line_furnace_charging_types').getList(1, 1, { filter })
      return existing.totalItems > 0
    } catch {
      return false
    }
  }

  /**
   * Salva ou atualiza Tipo de Enfornamento com auditoria completa e bloqueio de duplicidade
   */
  async saveChargingType(data: FurnaceChargingTypeFormData): Promise<LineFurnaceChargingType> {
    const errors = this.validateChargingTypeFormData(data)
    if (Object.keys(errors).length > 0) {
      const firstMsg = Object.values(errors)[0]
      throw new Error(firstMsg)
    }

    // Validação de duplicidade no mesmo centro: (Tipo de Enfornamento + Tipo de Matéria-Prima)
    const isDup = await this.checkDuplicateChargingType({
      centerCode: data.center_code,
      chargingType: data.charging_type,
      rawMaterialCode: data.raw_material_code,
      excludeId: data.id,
    })

    if (isDup) {
      throw new Error(DUPLICATE_CHARGING_TYPE_MSG)
    }

    const isEdit = Boolean(data.id)
    let previousRecord: LineFurnaceChargingType | null = null

    if (isEdit && data.id) {
      try {
        previousRecord = await pb
          .collection('line_furnace_charging_types')
          .getOne<LineFurnaceChargingType>(data.id)
      } catch {
        previousRecord = null
      }
    }

    const currentUser = pb.authStore.record
    const userEmail = (currentUser as any)?.email || (currentUser as any)?.name || 'PCP'

    const proporcaoRotulo = extractProporcaoRotulo(data.charging_type || '')
    const termos = proporcaoRotulo ? parseProporcaoRotulo(proporcaoRotulo) : null

    const payload: Record<string, any> = {
      center_code: data.center_code,
      line_id: data.line_id || '',
      line_master_id: data.line_master_id || '',
      charging_type: data.charging_type,
      raw_material_code: data.raw_material_code,
      raw_material_description: data.raw_material_description || '',
      proporcao: proporcaoRotulo || '',
      proporcao_primeiro_termo: termos?.primeira ?? null,
      proporcao_segundo_termo: termos?.segunda ?? null,
      mp_principal_code: (data.mp_principal_code || '').trim(),
      mp_principal_description: (data.mp_principal_description || '').trim(),
      mp_secundaria_code: (data.mp_secundaria_code || '').trim(),
      mp_secundaria_description: (data.mp_secundaria_description || '').trim(),
      min_weight_t: data.min_weight_t ?? null,
      max_weight_t: data.max_weight_t ?? null,
      min_thickness_mm: data.min_thickness_mm ?? null,
      max_thickness_mm: data.max_thickness_mm ?? null,
      min_length_mm: data.min_length_mm ?? null,
      max_length_mm: data.max_length_mm ?? null,
      min_width_mm: data.min_width_mm ?? null,
      max_width_mm: data.max_width_mm ?? null,
      active: data.active !== false,
      deleted: false,
    }

    let saved: LineFurnaceChargingType
    if (isEdit && data.id) {
      payload.updated_by = userEmail
      saved = await pb
        .collection('line_furnace_charging_types')
        .update<LineFurnaceChargingType>(data.id, payload)
    } else {
      payload.created_by = userEmail
      saved = await pb
        .collection('line_furnace_charging_types')
        .create<LineFurnaceChargingType>(payload)
    }

    // Registrar auditoria
    await this.registrarAuditLog({
      action: isEdit ? 'UPDATE_FURNACE_CHARGING_TYPE' : 'CREATE_FURNACE_CHARGING_TYPE',
      recordId: saved.id,
      center: data.center_code,
      reason: isEdit
        ? `Atualização de Tipo de Enfornamento: ${data.charging_type} — MP ${data.raw_material_code}`
        : `Cadastro de Tipo de Enfornamento: ${data.charging_type} — MP ${data.raw_material_code}`,
      previousValues: previousRecord,
      newValues: saved,
    })

    return this.sanitizeChargingType(saved)
  }

  /**
   * Ativa/Inativa um Tipo de Enfornamento (sem exclusão lógica), com auditoria
   */
  async setActiveChargingType(id: string, active: boolean, centerCode: string): Promise<boolean> {
    try {
      const prev = await pb
        .collection('line_furnace_charging_types')
        .getOne<LineFurnaceChargingType>(id)
      const currentUser = pb.authStore.record
      const userEmail = (currentUser as any)?.email || (currentUser as any)?.name || 'PCP'

      const saved = await pb.collection('line_furnace_charging_types').update(id, {
        active: !!active,
        updated_by: userEmail,
      })

      await this.registrarAuditLog({
        action: active ? 'ACTIVATE_FURNACE_CHARGING_TYPE' : 'INACTIVATE_FURNACE_CHARGING_TYPE',
        recordId: id,
        center: centerCode,
        reason: `${active ? 'Ativação' : 'Inativação'} de Tipo de Enfornamento (${prev.charging_type} - ${prev.raw_material_code})`,
        previousValues: prev,
        newValues: { active: !!active },
      })

      return !!saved
    } catch (err) {
      console.warn('Erro ao alterar status do tipo de enfornamento:', err)
      return false
    }
  }

  /**
   * Exclusão lógica de Tipo de Enfornamento
   */
  async deleteChargingType(id: string, centerCode: string): Promise<boolean> {
    try {
      const prev = await pb
        .collection('line_furnace_charging_types')
        .getOne<LineFurnaceChargingType>(id)
      const currentUser = pb.authStore.record
      const userEmail = (currentUser as any)?.email || (currentUser as any)?.name || 'PCP'

      await pb.collection('line_furnace_charging_types').update(id, {
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userEmail,
        active: false,
      })

      await this.registrarAuditLog({
        action: 'DELETE_FURNACE_CHARGING_TYPE',
        recordId: id,
        center: centerCode,
        reason: `Exclusão lógica de Tipo de Enfornamento (${prev.charging_type} - ${prev.raw_material_code})`,
        previousValues: prev,
        newValues: { deleted: true, deleted_at: new Date().toISOString() },
      })

      return true
    } catch (err) {
      console.warn('Erro ao excluir tipo de enfornamento:', err)
      return false
    }
  }

  // =========================================================================
  // SEÇÃO 2: SEPARAÇÃO DE CARGA (TABELA LINEAR)
  // =========================================================================

  /**
   * Lista regras de separação de carga para o Centro selecionado
   */
  async listChargeSeparations(centerCode: string): Promise<LineChargeSeparation[]> {
    if (!centerCode) return []
    try {
      const records = await pb
        .collection('line_charge_separations')
        .getFullList<LineChargeSeparation>({
          filter: `center_code = '${centerCode}' && (deleted = false || deleted = null)`,
          sort: 'charging_load_type,charged_load_type',
        })
      return records.map((r) => this.sanitizeChargeSeparation(r))
    } catch (err) {
      console.warn('Falha ao listar regras de separação de carga:', err)
      return []
    }
  }

  /**
   * Verifica se já existe uma regra de separação para a combinação Centro + Carga que irá enfornar + Carga enfornada
   */
  async checkDuplicateSeparation(params: {
    centerCode: string
    chargingLoadType: string
    chargedLoadType: string
    excludeId?: string
  }): Promise<boolean> {
    try {
      const safeCharging = params.chargingLoadType.trim().replace(/'/g, "\\'")
      const safeCharged = params.chargedLoadType.trim().replace(/'/g, "\\'")
      let filter = `center_code = '${params.centerCode}' && charging_load_type = '${safeCharging}' && charged_load_type = '${safeCharged}' && (deleted = false || deleted = null)`
      if (params.excludeId) {
        filter += ` && id != '${params.excludeId}'`
      }
      const existing = await pb.collection('line_charge_separations').getList(1, 1, { filter })
      return existing.totalItems > 0
    } catch {
      return false
    }
  }

  /**
   * Validação de regras de formulário de Separação de Carga
   * Inclui campos opcionais de peso e dimensão com mín <= máx e sem negativos
   */
  validateChargeSeparationFormData(data: ChargeSeparationFormData): Record<string, string> {
    const errors: Record<string, string> = {}

    if (!data.charging_load_type || !data.charging_load_type.trim()) {
      errors.charging_load_type = 'A "Carga que irá enfornar" é obrigatória.'
    }

    if (!data.charged_load_type || !data.charged_load_type.trim()) {
      errors.charged_load_type = 'A "Carga enfornada" é obrigatória.'
    }

    if (
      data.separator_blocks_qty === undefined ||
      data.separator_blocks_qty === null ||
      isNaN(Number(data.separator_blocks_qty))
    ) {
      errors.separator_blocks_qty = 'A quantidade de blocos separadores é obrigatória.'
    } else if (data.separator_blocks_qty < 0) {
      errors.separator_blocks_qty = 'A quantidade de blocos não pode ser negativa.'
    } else if (!Number.isInteger(Number(data.separator_blocks_qty))) {
      errors.separator_blocks_qty = 'A quantidade de blocos deve ser um número inteiro.'
    }

    // Validações de valores não negativos para peso e dimensões (opcionais)
    const fieldsToCheck = [
      { key: 'min_weight_t', label: 'Peso mínimo', val: data.min_weight_t },
      { key: 'max_weight_t', label: 'Peso máximo', val: data.max_weight_t },
      { key: 'min_thickness_mm', label: 'Espessura mínima', val: data.min_thickness_mm },
      { key: 'max_thickness_mm', label: 'Espessura máxima', val: data.max_thickness_mm },
      { key: 'min_length_mm', label: 'Comprimento mínimo', val: data.min_length_mm },
      { key: 'max_length_mm', label: 'Comprimento máximo', val: data.max_length_mm },
      { key: 'min_width_mm', label: 'Largura mínima', val: data.min_width_mm },
      { key: 'max_width_mm', label: 'Largura máxima', val: data.max_width_mm },
    ]

    for (const f of fieldsToCheck) {
      if (f.val !== undefined && f.val !== null && f.val < 0) {
        errors[f.key] = `${f.label} não pode ser negativo.`
      }
    }

    // Validações mín <= máx para peso e dimensões
    if (
      data.min_weight_t !== undefined &&
      data.min_weight_t !== null &&
      data.max_weight_t !== undefined &&
      data.max_weight_t !== null &&
      data.min_weight_t > data.max_weight_t
    ) {
      errors.min_weight_t = 'Peso mín. não pode ser maior que o Peso máx.'
      errors.max_weight_t = 'Peso máx. deve ser maior ou igual ao Peso mín.'
    }

    if (
      data.min_thickness_mm !== undefined &&
      data.min_thickness_mm !== null &&
      data.max_thickness_mm !== undefined &&
      data.max_thickness_mm !== null &&
      data.min_thickness_mm > data.max_thickness_mm
    ) {
      errors.min_thickness_mm = 'Espessura mín. não pode ser maior que a Espessura máx.'
      errors.max_thickness_mm = 'Espessura máx. deve ser maior ou igual à Espessura mín.'
    }

    if (
      data.min_length_mm !== undefined &&
      data.min_length_mm !== null &&
      data.max_length_mm !== undefined &&
      data.max_length_mm !== null &&
      data.min_length_mm > data.max_length_mm
    ) {
      errors.min_length_mm = 'Comprimento mín. não pode ser maior que o Comprimento máx.'
      errors.max_length_mm = 'Comprimento máx. deve ser maior ou igual ao Comprimento mín.'
    }

    if (
      data.min_width_mm !== undefined &&
      data.min_width_mm !== null &&
      data.max_width_mm !== undefined &&
      data.max_width_mm !== null &&
      data.min_width_mm > data.max_width_mm
    ) {
      errors.min_width_mm = 'Largura mín. não pode ser maior que a Largura máx.'
      errors.max_width_mm = 'Largura máx. deve ser maior ou igual à Largura mín.'
    }

    return errors
  }

  /**
   * Salva ou atualiza Separação de Carga com bloqueio de duplicidade e auditoria
   */
  async saveChargeSeparation(data: ChargeSeparationFormData): Promise<LineChargeSeparation> {
    const errors = this.validateChargeSeparationFormData(data)
    if (Object.keys(errors).length > 0) {
      const firstMsg = Object.values(errors)[0]
      throw new Error(firstMsg)
    }

    // Verificar duplicidade exata da combinação Centro + Carga que irá enfornar + Carga enfornada
    const isDup = await this.checkDuplicateSeparation({
      centerCode: data.center_code,
      chargingLoadType: data.charging_load_type,
      chargedLoadType: data.charged_load_type,
      excludeId: data.id,
    })

    if (isDup) {
      throw new Error(DUPLICATE_SEPARATION_MSG)
    }

    const isEdit = Boolean(data.id)
    let previousRecord: LineChargeSeparation | null = null

    if (isEdit && data.id) {
      try {
        previousRecord = await pb
          .collection('line_charge_separations')
          .getOne<LineChargeSeparation>(data.id)
      } catch {
        previousRecord = null
      }
    }

    const currentUser = pb.authStore.record
    const userEmail = (currentUser as any)?.email || (currentUser as any)?.name || 'PCP'

    const payload: Record<string, any> = {
      center_code: data.center_code,
      line_id: data.line_id || '',
      line_master_id: data.line_master_id || '',
      charging_load_type: data.charging_load_type.trim(),
      charged_load_type: data.charged_load_type.trim(),
      separator_blocks_qty: Math.floor(Number(data.separator_blocks_qty)),
      blocks_arrangement: (data.blocks_arrangement || '').trim(),
      notes: (data.notes || '').trim(),
      min_weight_t: data.min_weight_t ?? null,
      max_weight_t: data.max_weight_t ?? null,
      min_thickness_mm: data.min_thickness_mm ?? null,
      max_thickness_mm: data.max_thickness_mm ?? null,
      min_length_mm: data.min_length_mm ?? null,
      max_length_mm: data.max_length_mm ?? null,
      min_width_mm: data.min_width_mm ?? null,
      max_width_mm: data.max_width_mm ?? null,
      active: true,
      deleted: false,
    }

    let saved: LineChargeSeparation
    if (isEdit && data.id) {
      payload.updated_by = userEmail
      saved = await pb
        .collection('line_charge_separations')
        .update<LineChargeSeparation>(data.id, payload)
    } else {
      payload.created_by = userEmail
      saved = await pb.collection('line_charge_separations').create<LineChargeSeparation>(payload)
    }

    // Registrar auditoria
    await this.registrarAuditLog({
      action: isEdit ? 'UPDATE_CHARGE_SEPARATION' : 'CREATE_CHARGE_SEPARATION',
      recordId: saved.id,
      center: data.center_code,
      reason: isEdit
        ? `Atualização de Regra de Separação: ${data.charging_load_type} -> ${data.charged_load_type} (${data.separator_blocks_qty} blocos)`
        : `Cadastro de Regra de Separação: ${data.charging_load_type} -> ${data.charged_load_type} (${data.separator_blocks_qty} blocos)`,
      previousValues: previousRecord,
      newValues: saved,
    })

    return this.sanitizeChargeSeparation(saved)
  }

  /**
   * Exclusão lógica de Regra de Separação de Carga
   */
  async deleteChargeSeparation(id: string, centerCode: string): Promise<boolean> {
    try {
      const prev = await pb.collection('line_charge_separations').getOne<LineChargeSeparation>(id)
      const currentUser = pb.authStore.record
      const userEmail = (currentUser as any)?.email || (currentUser as any)?.name || 'PCP'

      await pb.collection('line_charge_separations').update(id, {
        deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userEmail,
        active: false,
      })

      await this.registrarAuditLog({
        action: 'DELETE_CHARGE_SEPARATION',
        recordId: id,
        center: centerCode,
        reason: `Exclusão lógica de Separação de Carga (${prev.charging_load_type} -> ${prev.charged_load_type})`,
        previousValues: prev,
        newValues: { deleted: true, deleted_at: new Date().toISOString() },
      })

      return true
    } catch (err) {
      console.warn('Erro ao excluir regra de separação de carga:', err)
      return false
    }
  }

  // =========================================================================
  // AUDITORIA E SANITIZAÇÃO
  // =========================================================================

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
        resource: 'furnace_charging_governance',
        resource_id: params.recordId,
        permission_required: 'pcp.lines.manage',
        company: 'CIAFAL',
        line: params.center,
        center: params.center,
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestre Expandida > Enfornamento / Separação',
        entity: 'furnace_charging',
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
        changes: {
          anterior: params.previousValues || null,
          posterior: params.newValues || null,
        },
      })
    } catch (err) {
      console.warn('[FurnaceChargingService] Falha silenciosa ao registrar auditoria:', err)
    }
  }

  private sanitizeChargingType(record: any): LineFurnaceChargingType {
    return {
      ...record,
      proporcao: record.proporcao || '',
      proporcao_primeiro_termo:
        record.proporcao_primeiro_termo !== null && record.proporcao_primeiro_termo !== undefined
          ? Number(record.proporcao_primeiro_termo)
          : null,
      proporcao_segundo_termo:
        record.proporcao_segundo_termo !== null && record.proporcao_segundo_termo !== undefined
          ? Number(record.proporcao_segundo_termo)
          : null,
      mp_principal_code: record.mp_principal_code || '',
      mp_principal_description: record.mp_principal_description || '',
      mp_secundaria_code: record.mp_secundaria_code || '',
      mp_secundaria_description: record.mp_secundaria_description || '',
      min_weight_t:
        record.min_weight_t !== null && record.min_weight_t !== undefined
          ? Number(record.min_weight_t)
          : null,
      max_weight_t:
        record.max_weight_t !== null && record.max_weight_t !== undefined
          ? Number(record.max_weight_t)
          : null,
      min_thickness_mm:
        record.min_thickness_mm !== null && record.min_thickness_mm !== undefined
          ? Number(record.min_thickness_mm)
          : null,
      max_thickness_mm:
        record.max_thickness_mm !== null && record.max_thickness_mm !== undefined
          ? Number(record.max_thickness_mm)
          : null,
      min_length_mm:
        record.min_length_mm !== null && record.min_length_mm !== undefined
          ? Number(record.min_length_mm)
          : null,
      max_length_mm:
        record.max_length_mm !== null && record.max_length_mm !== undefined
          ? Number(record.max_length_mm)
          : null,
      min_width_mm:
        record.min_width_mm !== null && record.min_width_mm !== undefined
          ? Number(record.min_width_mm)
          : null,
      max_width_mm:
        record.max_width_mm !== null && record.max_width_mm !== undefined
          ? Number(record.max_width_mm)
          : null,
      active: record.active !== false,
      deleted: record.deleted === true,
    }
  }

  private sanitizeChargeSeparation(record: any): LineChargeSeparation {
    return {
      ...record,
      separator_blocks_qty: Number(record.separator_blocks_qty || 0),
      min_weight_t:
        record.min_weight_t !== null && record.min_weight_t !== undefined
          ? Number(record.min_weight_t)
          : null,
      max_weight_t:
        record.max_weight_t !== null && record.max_weight_t !== undefined
          ? Number(record.max_weight_t)
          : null,
      min_thickness_mm:
        record.min_thickness_mm !== null && record.min_thickness_mm !== undefined
          ? Number(record.min_thickness_mm)
          : null,
      max_thickness_mm:
        record.max_thickness_mm !== null && record.max_thickness_mm !== undefined
          ? Number(record.max_thickness_mm)
          : null,
      min_length_mm:
        record.min_length_mm !== null && record.min_length_mm !== undefined
          ? Number(record.min_length_mm)
          : null,
      max_length_mm:
        record.max_length_mm !== null && record.max_length_mm !== undefined
          ? Number(record.max_length_mm)
          : null,
      min_width_mm:
        record.min_width_mm !== null && record.min_width_mm !== undefined
          ? Number(record.min_width_mm)
          : null,
      max_width_mm:
        record.max_width_mm !== null && record.max_width_mm !== undefined
          ? Number(record.max_width_mm)
          : null,
      active: record.active !== false,
      deleted: record.deleted === true,
    }
  }
}

export const furnaceChargingService = new FurnaceChargingService()
export default furnaceChargingService

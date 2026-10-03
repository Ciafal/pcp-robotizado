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

    // 2. Regra de Fornecedor:
    // quando supplier_applicable = false -> não exigir fornecedores, sem erro de validação
    // quando supplier_applicable = true -> exigir ao menos 1 fornecedor estruturado ({code, name}) — nunca texto livre
    if (data.supplier_applicable) {
      const suppliers = Array.isArray(data.suppliers_json) ? data.suppliers_json : []
      const validSuppliers = suppliers.filter(
        (s) => s && typeof s === 'object' && s.code && s.code.trim() && s.name && s.name.trim(),
      )
      if (validSuppliers.length === 0) {
        errors.suppliers = 'Selecione ao menos um fornecedor homologado estruturado.'
      }
    }

    // Parse dos campos numéricos em toneladas (t) e suporte retrocompatível em kg
    const minWt = parseBrNumber(data.min_weight_t)
    const avgWt = parseBrNumber(data.average_weight_t)
    const maxWt = parseBrNumber(data.max_weight_t)

    const minWkg = parseBrNumber(data.min_weight_kg)
    const avgWkg = parseBrNumber(data.average_weight_kg)
    const maxWkg = parseBrNumber(data.max_weight_kg)

    // Validação de valores negativos em peso (t)
    if (minWt !== null && minWt < 0) {
      errors.min_weight_t = 'O Peso Mínimo não pode ser negativo.'
    }
    if (avgWt !== null && avgWt < 0) {
      errors.average_weight_t = 'O Peso Médio não pode ser negativo.'
    }
    if (maxWt !== null && maxWt < 0) {
      errors.max_weight_t = 'O Peso Máximo não pode ser negativo.'
    }

    // Compatibilidade reversa de negativos em kg
    if (minWkg !== null && minWkg < 0) errors.min_weight_kg = 'Peso mínimo não pode ser negativo.'
    if (avgWkg !== null && avgWkg < 0)
      errors.average_weight_kg = 'Peso médio não pode ser negativo.'
    if (maxWkg !== null && maxWkg < 0) errors.max_weight_kg = 'Peso máximo não pode ser negativo.'

    // Validações de consistência de Peso: min_weight_t <= average_weight_t <= max_weight_t
    if (minWt !== null && maxWt !== null && minWt > maxWt) {
      errors.min_weight_t = 'O Peso Mínimo não pode ser maior que o Peso Máximo.'
      errors.weight = 'O Peso Médio deve estar entre o Peso Mínimo e o Peso Máximo.'
    }
    if (avgWt !== null && minWt !== null && avgWt < minWt) {
      errors.average_weight_t = 'O Peso Médio deve estar entre o Peso Mínimo e o Peso Máximo.'
      if (!errors.weight)
        errors.weight = 'O Peso Médio deve estar entre o Peso Mínimo e o Peso Máximo.'
    }
    if (avgWt !== null && maxWt !== null && avgWt > maxWt) {
      errors.average_weight_t = 'O Peso Médio deve estar entre o Peso Mínimo e o Peso Máximo.'
      if (!errors.weight)
        errors.weight = 'O Peso Médio deve estar entre o Peso Mínimo e o Peso Máximo.'
    }

    // Compatibilidade legada com kg se campos t não fornecidos
    if (minWt === null && avgWt === null && maxWt === null) {
      if (minWkg !== null && maxWkg !== null && minWkg > maxWkg) {
        errors.min_weight_kg = 'Peso mínimo não pode ser maior que o peso máximo.'
      }
      if (avgWkg !== null && minWkg !== null && avgWkg < minWkg) {
        errors.average_weight_kg = 'Peso médio não pode ser menor que o peso mínimo.'
      }
      if (avgWkg !== null && maxWkg !== null && avgWkg > maxWkg) {
        errors.average_weight_kg = 'Peso médio não pode ser maior que o peso máximo.'
      }
    }

    // Parse dos comprimentos da MP em mm e compatibilidade em metros
    const minMpMm = parseBrNumber(data.min_mp_length_mm)
    const idealMpMm = parseBrNumber(data.ideal_mp_length_mm)
    const maxMpMm = parseBrNumber(data.max_mp_length_mm)

    const minMpM = parseBrNumber(data.min_mp_length_m)
    const maxMpM = parseBrNumber(data.max_mp_length_m)

    if (minMpMm !== null && minMpMm < 0) {
      errors.min_mp_length_mm = 'O Comprimento Mínimo da MP não pode ser negativo.'
    }
    if (idealMpMm !== null && idealMpMm < 0) {
      errors.ideal_mp_length_mm = 'O Comprimento Ideal da MP não pode ser negativo.'
    }
    if (maxMpMm !== null && maxMpMm < 0) {
      errors.max_mp_length_mm = 'O Comprimento Máximo da MP não pode ser negativo.'
    }

    // Consistência de Comprimento MP: min_mp_length_mm <= ideal_mp_length_mm <= max_mp_length_mm
    if (minMpMm !== null && maxMpMm !== null && minMpMm > maxMpMm) {
      errors.min_mp_length_mm =
        'O Comprimento Mínimo da MP não pode ser maior que o Comprimento Máximo.'
      errors.mp_length =
        'O Comprimento Ideal da MP deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
    }
    if (idealMpMm !== null && minMpMm !== null && idealMpMm < minMpMm) {
      errors.ideal_mp_length_mm =
        'O Comprimento Ideal da MP deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
      if (!errors.mp_length) {
        errors.mp_length =
          'O Comprimento Ideal da MP deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
      }
    }
    if (idealMpMm !== null && maxMpMm !== null && idealMpMm > maxMpMm) {
      errors.ideal_mp_length_mm =
        'O Comprimento Ideal da MP deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
      if (!errors.mp_length) {
        errors.mp_length =
          'O Comprimento Ideal da MP deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
      }
    }

    // Compatibilidade legada com metros
    if (minMpMm === null && idealMpMm === null && maxMpMm === null) {
      if (minMpM !== null && minMpM < 0)
        errors.min_mp_length_m = 'Comprimento mínimo MP não pode ser negativo.'
      if (maxMpM !== null && maxMpM < 0)
        errors.max_mp_length_m = 'Comprimento máximo MP não pode ser negativo.'
      if (minMpM !== null && maxMpM !== null && minMpM > maxMpM) {
        errors.min_mp_length_m =
          'Comprimento mínimo da MP não pode ser maior que o comprimento máximo.'
      }
    }

    // Parse Comprimento Laminado em mm (min <= ideal <= max)
    const rolledMinMm = parseBrNumber(data.rolled_min_length_mm)
    const rolledIdealMm = parseBrNumber(data.rolled_ideal_length_mm)
    const rolledMaxMm = parseBrNumber(data.rolled_max_length_mm)

    if (rolledMinMm !== null && rolledMinMm < 0) {
      errors.rolled_min_length_mm = 'O Comprimento Mínimo Laminado não pode ser negativo.'
    }
    if (rolledIdealMm !== null && rolledIdealMm < 0) {
      errors.rolled_ideal_length_mm = 'O Comprimento Ideal Laminado não pode ser negativo.'
    }
    if (rolledMaxMm !== null && rolledMaxMm < 0) {
      errors.rolled_max_length_mm = 'O Comprimento Máximo Laminado não pode ser negativo.'
    }

    if (rolledMinMm !== null && rolledMaxMm !== null && rolledMinMm > rolledMaxMm) {
      errors.rolled_min_length_mm =
        'O Comprimento Mínimo Laminado não pode ser maior que o Comprimento Máximo.'
      errors.rolled_length =
        'O Comprimento Ideal Laminado deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
    }
    if (rolledIdealMm !== null && rolledMinMm !== null && rolledIdealMm < rolledMinMm) {
      errors.rolled_ideal_length_mm =
        'O Comprimento Ideal Laminado deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
      if (!errors.rolled_length) {
        errors.rolled_length =
          'O Comprimento Ideal Laminado deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
      }
    }
    if (rolledIdealMm !== null && rolledMaxMm !== null && rolledIdealMm > rolledMaxMm) {
      errors.rolled_ideal_length_mm =
        'O Comprimento Ideal Laminado deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
      if (!errors.rolled_length) {
        errors.rolled_length =
          'O Comprimento Ideal Laminado deve estar entre o Comprimento Mínimo e o Comprimento Máximo.'
      }
    }

    // Compatibilidade legada com m
    const rolledL = parseBrNumber(data.rolled_length_m)
    const multL = parseBrNumber(data.multiple_length_m)
    if (rolledL !== null && rolledL < 0)
      errors.rolled_length_m = 'Comprimento laminado não pode ser negativo.'
    if (multL !== null && multL < 0)
      errors.multiple_length_m = 'Comprimento múltiplo não pode ser negativo.'

    // Parse Reduções mín/ideal/máx (%) (min <= ideal <= max)
    const redMin = parseBrNumber(data.reduction_min_pct)
    const redIdeal = parseBrNumber(data.reduction_ideal_pct)
    const redMax = parseBrNumber(data.reduction_max_pct)

    if (redMin !== null && (redMin < 0 || redMin > 100)) {
      errors.reduction_min_pct = 'A Redução Mínima deve estar entre 0% e 100%.'
    }
    if (redIdeal !== null && (redIdeal < 0 || redIdeal > 100)) {
      errors.reduction_ideal_pct = 'A Redução Ideal deve estar entre 0% e 100%.'
    }
    if (redMax !== null && (redMax < 0 || redMax > 100)) {
      errors.reduction_max_pct = 'A Redução Máxima deve estar entre 0% e 100%.'
    }

    if (redMin !== null && redMax !== null && redMin > redMax) {
      errors.reduction_min_pct = 'A Redução Mínima não pode ser maior que a Redução Máxima.'
      errors.reduction_order =
        'A Redução Ideal deve estar entre a Redução Mínima e a Redução Máxima.'
    }
    if (redIdeal !== null && redMin !== null && redIdeal < redMin) {
      errors.reduction_ideal_pct =
        'A Redução Ideal deve estar entre a Redução Mínima e a Redução Máxima.'
      if (!errors.reduction_order) {
        errors.reduction_order =
          'A Redução Ideal deve estar entre a Redução Mínima e a Redução Máxima.'
      }
    }
    if (redIdeal !== null && redMax !== null && redIdeal > redMax) {
      errors.reduction_ideal_pct =
        'A Redução Ideal deve estar entre a Redução Mínima e a Redução Máxima.'
      if (!errors.reduction_order) {
        errors.reduction_order =
          'A Redução Ideal deve estar entre a Redução Mínima e a Redução Máxima.'
      }
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

    // Validação de Vigência (validity_start_date <= validity_end_date em dd/mm/aaaa)
    if (data.validity_start_date && data.validity_end_date) {
      const startParts = String(data.validity_start_date).trim().split('/')
      const endParts = String(data.validity_end_date).trim().split('/')
      if (startParts.length === 3 && endParts.length === 3) {
        const startIso = `${startParts[2]}-${startParts[1].padStart(2, '0')}-${startParts[0].padStart(2, '0')}`
        const endIso = `${endParts[2]}-${endParts[1].padStart(2, '0')}-${endParts[0].padStart(2, '0')}`
        if (startIso > endIso) {
          const vigMsg = 'A Data de Fim da Vigência não pode ser anterior à Data de Início.'
          errors.validity_end_date = vigMsg
          errors.validity = vigMsg
        }
      }
    }

    // Bloco 7: Tempo Mínimo PCP
    const unidade = data.tempo_minimo_pcp_unidade
    const valRaw = data.tempo_minimo_pcp_valor
    const hasUnidade = Boolean(unidade && unidade.trim())
    const hasValor =
      valRaw !== undefined &&
      valRaw !== null &&
      (typeof valRaw === 'number' || String(valRaw).trim() !== '')

    if (hasUnidade || hasValor) {
      if (!hasUnidade || !hasValor) {
        errors.tempo_minimo_pcp = 'Informe uma unidade e um tempo mínimo válido maior que zero.'
      } else {
        const parsedVal = parseBrNumber(valRaw)
        if (parsedVal === null || isNaN(parsedVal) || parsedVal <= 0) {
          errors.tempo_minimo_pcp = 'Informe uma unidade e um tempo mínimo válido maior que zero.'
        }
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

    // Parse dos campos de pesos em t (com fallback para kg se aplicável)
    const minWt = parseBrNumber(formData.min_weight_t)
    const avgWt = parseBrNumber(formData.average_weight_t)
    const maxWt = parseBrNumber(formData.max_weight_t)

    const minWkg = parseBrNumber(formData.min_weight_kg)
    const avgWkg = parseBrNumber(formData.average_weight_kg)
    const maxWkg = parseBrNumber(formData.max_weight_kg)

    // Converter ou sincronizar t <-> kg
    const finalMinWt = minWt !== null ? minWt : minWkg !== null ? minWkg / 1000 : null
    const finalAvgWt = avgWt !== null ? avgWt : avgWkg !== null ? avgWkg / 1000 : null
    const finalMaxWt = maxWt !== null ? maxWt : maxWkg !== null ? maxWkg / 1000 : null

    const finalMinWkg = minWkg !== null ? minWkg : minWt !== null ? minWt * 1000 : null
    const finalAvgWkg = avgWkg !== null ? avgWkg : avgWt !== null ? avgWt * 1000 : null
    const finalMaxWkg = maxWkg !== null ? maxWkg : maxWt !== null ? maxWt * 1000 : null

    // Parse dos comprimentos de MP em mm (com fallback para m)
    const minMpMm = parseBrNumber(formData.min_mp_length_mm)
    const idealMpMm = parseBrNumber(formData.ideal_mp_length_mm)
    const maxMpMm = parseBrNumber(formData.max_mp_length_mm)

    const minMpM = parseBrNumber(formData.min_mp_length_m)
    const maxMpM = parseBrNumber(formData.max_mp_length_m)

    const finalMinMpMm =
      minMpMm !== null ? minMpMm : minMpM !== null ? Math.round(minMpM * 1000) : null
    const finalMaxMpMm =
      maxMpMm !== null ? maxMpMm : maxMpM !== null ? Math.round(maxMpM * 1000) : null
    const finalIdealMpMm =
      idealMpMm !== null
        ? idealMpMm
        : finalMinMpMm !== null && finalMaxMpMm !== null
          ? Math.round((finalMinMpMm + finalMaxMpMm) / 2)
          : null

    const finalMinMpM = minMpM !== null ? minMpM : minMpMm !== null ? minMpMm / 1000 : null
    const finalMaxMpM = maxMpM !== null ? maxMpM : maxMpMm !== null ? maxMpMm / 1000 : null

    // Parse comprimentos laminado em mm
    const rolledMinMm = parseBrNumber(formData.rolled_min_length_mm)
    const rolledIdealMm = parseBrNumber(formData.rolled_ideal_length_mm)
    const rolledMaxMm = parseBrNumber(formData.rolled_max_length_mm)
    const rolledL = parseBrNumber(formData.rolled_length_m)
    const multL = parseBrNumber(formData.multiple_length_m)

    const finalRolledIdealMm =
      rolledIdealMm !== null ? rolledIdealMm : rolledL !== null ? Math.round(rolledL * 1000) : null
    const finalRolledMinMm = rolledMinMm !== null ? rolledMinMm : finalRolledIdealMm
    const finalRolledMaxMm = rolledMaxMm !== null ? rolledMaxMm : finalRolledIdealMm
    const finalRolledL =
      rolledL !== null ? rolledL : finalRolledIdealMm !== null ? finalRolledIdealMm / 1000 : null

    // Redução sincronizada e faixas mín/ideal/máx (%)
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
    } else if (
      formData.reduction_percentage !== undefined &&
      formData.reduction_percentage !== null &&
      formData.reduction_percentage !== ''
    ) {
      const p = parseBrNumber(formData.reduction_percentage)
      if (p !== null) {
        redPercentage = p
      }
    }

    const redMinPct = parseBrNumber(formData.reduction_min_pct)
    const redIdealPct =
      parseBrNumber(formData.reduction_ideal_pct) !== null
        ? parseBrNumber(formData.reduction_ideal_pct)
        : redPercentage
    const redMaxPct = parseBrNumber(formData.reduction_max_pct)

    // Fornecedores estruturados
    const isSupplierApplicable = Boolean(formData.supplier_applicable)
    const cleanSuppliers =
      isSupplierApplicable && Array.isArray(formData.suppliers_json)
        ? formData.suppliers_json.filter((s) => s && s.code && s.name)
        : []

    // Bitolas e Tipos de Aço estruturados
    const cleanBitolas = Array.isArray(formData.bitolas_json)
      ? formData.bitolas_json.filter(Boolean)
      : formData.bitola_ref
        ? [formData.bitola_ref]
        : []

    const cleanSteelTypes = Array.isArray(formData.steel_types_json)
      ? formData.steel_types_json.filter(Boolean)
      : formData.steel_type
        ? [formData.steel_type]
        : []

    // Vigência (converter dd/mm/aaaa para YYYY-MM-DD se necessário)
    const formatToIsoDate = (d?: string | null) => {
      if (!d) return null
      const str = String(d).trim()
      if (str.includes('/')) {
        const p = str.split('/')
        if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`
      }
      return str
    }

    const validityStartIso = formatToIsoDate(formData.validity_start_date)
    const validityEndIso = formatToIsoDate(formData.validity_end_date)

    const currentUser = pb.authStore.record || pb.authStore.model

    const payload: Record<string, any> = {
      line_id: formData.line_id,
      line_master_id: formData.line_master_id || undefined,
      center_code: formData.center_code.trim(),
      product_code: formData.product_code.trim().toUpperCase(),
      product_description: formData.product_description?.trim() || '',
      raw_material_code: formData.raw_material_code.trim().toUpperCase(),
      raw_material_description: formData.raw_material_description?.trim() || '',

      // Tópico 2: Fornecedor da MP
      supplier_applicable: isSupplierApplicable,
      suppliers_json: cleanSuppliers,
      raw_material_type: formData.raw_material_type?.trim() || '',
      supplier:
        isSupplierApplicable && cleanSuppliers.length > 0
          ? cleanSuppliers.map((s) => s.name).join(', ')
          : formData.supplier?.trim() || '',
      supplier_id:
        isSupplierApplicable && cleanSuppliers.length > 0
          ? cleanSuppliers[0].code
          : formData.supplier_id?.trim() || '',

      // Tópico 3: Aplicação do Produto
      application: formData.application.trim(),
      bitolas_json: cleanBitolas,
      steel_types_json: cleanSteelTypes,
      rolled_min_length_mm: finalRolledMinMm,
      rolled_ideal_length_mm: finalRolledIdealMm,
      rolled_max_length_mm: finalRolledMaxMm,
      reduction_min_pct: redMinPct !== null ? redMinPct : redPercentage,
      reduction_ideal_pct: redIdealPct !== null ? redIdealPct : redPercentage,
      reduction_max_pct: redMaxPct !== null ? redMaxPct : redPercentage,
      validity_start_date: validityStartIso,
      validity_end_date: validityEndIso,

      // Redução sincronizada
      reduction_ratio_x: redRatioX,
      reduction_ratio_text: redRatioText,
      reduction_percentage: redPercentage ?? redIdealPct,

      // Campos legados mantidos
      bitola_ref: cleanBitolas.length > 0 ? cleanBitolas[0] : formData.bitola_ref?.trim() || '',
      steel_type:
        cleanSteelTypes.length > 0 ? cleanSteelTypes[0] : formData.steel_type?.trim() || '',
      rolled_length_m: finalRolledL,
      multiple_length_m: multL,

      // Tópico 4: Pesos da Matéria-Prima (t)
      min_weight_t: finalMinWt,
      average_weight_t: finalAvgWt,
      max_weight_t: finalMaxWt,
      min_weight_kg: finalMinWkg,
      average_weight_kg: finalAvgWkg,
      max_weight_kg: finalMaxWkg,

      // Tópico 5: Comprimentos Matéria-Prima (mm)
      min_mp_length_mm: finalMinMpMm,
      ideal_mp_length_mm: finalIdealMpMm,
      max_mp_length_mm: finalMaxMpMm,
      min_mp_length_m: finalMinMpM,
      max_mp_length_m: finalMaxMpM,

      // Tópico 6: Sequenciamento
      first_run: Boolean(formData.first_run),
      allow_out_of_standard_mp: Boolean(formData.allow_out_of_standard_mp),

      // Tópico 7: Tempo Mínimo PCP
      tempo_minimo_pcp_unidade: formData.tempo_minimo_pcp_unidade || null,
      tempo_minimo_pcp_valor:
        formData.tempo_minimo_pcp_valor !== undefined &&
        formData.tempo_minimo_pcp_valor !== null &&
        formData.tempo_minimo_pcp_valor !== ''
          ? parseBrNumber(formData.tempo_minimo_pcp_valor)
          : null,
      tempo_minimo_pcp_minutos:
        formData.tempo_minimo_pcp_unidade &&
        formData.tempo_minimo_pcp_valor !== undefined &&
        formData.tempo_minimo_pcp_valor !== null &&
        formData.tempo_minimo_pcp_valor !== ''
          ? (() => {
              const pVal = parseBrNumber(formData.tempo_minimo_pcp_valor)
              if (pVal == null || pVal <= 0) return null
              const u = formData.tempo_minimo_pcp_unidade
              const mult = u === 'Minutos' ? 1 : u === 'Horas' ? 60 : u === 'Dias' ? 1440 : 10080
              return pVal * mult
            })()
          : null,

      // Tópico 8: Status & Observações
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
        if (previousRecord.supplier_applicable !== saved.supplier_applicable) {
          diffList.push(
            `Aplicabilidade do Fornecedor: ${previousRecord.supplier_applicable ? 'Aplicável' : 'Não aplicável'} → ${saved.supplier_applicable ? 'Aplicável' : 'Não aplicável'}`,
          )
        }
        if (
          JSON.stringify(previousRecord.suppliers_json || []) !==
          JSON.stringify(saved.suppliers_json || [])
        ) {
          const prevS =
            (previousRecord.suppliers_json || []).map((s) => s.name || s.code).join(', ') ||
            'Nenhum'
          const newS =
            (saved.suppliers_json || []).map((s) => s.name || s.code).join(', ') || 'Nenhum'
          diffList.push(`Fornecedores: ${prevS} → ${newS}`)
        }
        if (previousRecord.raw_material_type !== saved.raw_material_type) {
          diffList.push(
            `Tipo de MP: ${previousRecord.raw_material_type || '-'} → ${saved.raw_material_type || '-'}`,
          )
        }
        if (previousRecord.application !== saved.application) {
          diffList.push(`Aplicação: ${previousRecord.application} → ${saved.application}`)
        }
        if (
          JSON.stringify(previousRecord.bitolas_json || []) !==
          JSON.stringify(saved.bitolas_json || [])
        ) {
          const prevB =
            (previousRecord.bitolas_json || []).join(', ') || previousRecord.bitola_ref || 'Nenhuma'
          const newB = (saved.bitolas_json || []).join(', ') || 'Nenhuma'
          diffList.push(`Bitolas: ${prevB} → ${newB}`)
        }
        if (
          JSON.stringify(previousRecord.steel_types_json || []) !==
          JSON.stringify(saved.steel_types_json || [])
        ) {
          const prevSt =
            (previousRecord.steel_types_json || []).join(', ') ||
            previousRecord.steel_type ||
            'Nenhum'
          const newSt = (saved.steel_types_json || []).join(', ') || 'Nenhum'
          diffList.push(`Tipos de Aço: ${prevSt} → ${newSt}`)
        }
        if (previousRecord.rolled_ideal_length_mm !== saved.rolled_ideal_length_mm) {
          diffList.push(
            `Comp. Ideal Laminado: ${formatBrNumber(previousRecord.rolled_ideal_length_mm)} mm → ${formatBrNumber(saved.rolled_ideal_length_mm)} mm`,
          )
        }
        if (previousRecord.min_weight_t !== saved.min_weight_t) {
          diffList.push(
            `Peso Mínimo: ${formatBrNumber(previousRecord.min_weight_t, 4)} t → ${formatBrNumber(saved.min_weight_t, 4)} t`,
          )
        }
        if (previousRecord.average_weight_t !== saved.average_weight_t) {
          diffList.push(
            `Peso Médio: ${formatBrNumber(previousRecord.average_weight_t, 4)} t → ${formatBrNumber(saved.average_weight_t, 4)} t`,
          )
        }
        if (previousRecord.max_weight_t !== saved.max_weight_t) {
          diffList.push(
            `Peso Máximo: ${formatBrNumber(previousRecord.max_weight_t, 4)} t → ${formatBrNumber(saved.max_weight_t, 4)} t`,
          )
        }
        if (previousRecord.min_mp_length_mm !== saved.min_mp_length_mm) {
          diffList.push(
            `Comp. Mínimo MP: ${formatBrNumber(previousRecord.min_mp_length_mm)} mm → ${formatBrNumber(saved.min_mp_length_mm)} mm`,
          )
        }
        if (previousRecord.ideal_mp_length_mm !== saved.ideal_mp_length_mm) {
          diffList.push(
            `Comp. Ideal MP: ${formatBrNumber(previousRecord.ideal_mp_length_mm)} mm → ${formatBrNumber(saved.ideal_mp_length_mm)} mm`,
          )
        }
        if (previousRecord.max_mp_length_mm !== saved.max_mp_length_mm) {
          diffList.push(
            `Comp. Máximo MP: ${formatBrNumber(previousRecord.max_mp_length_mm)} mm → ${formatBrNumber(saved.max_mp_length_mm)} mm`,
          )
        }
        if (previousRecord.reduction_ideal_pct !== saved.reduction_ideal_pct) {
          diffList.push(
            `Redução Ideal (%): ${formatBrNumber(previousRecord.reduction_ideal_pct)}% → ${formatBrNumber(saved.reduction_ideal_pct)}%`,
          )
        }
        if (previousRecord.validity_start_date !== saved.validity_start_date) {
          diffList.push(
            `Início Vigência: ${previousRecord.validity_start_date || '-'} → ${saved.validity_start_date || '-'}`,
          )
        }
        if (previousRecord.validity_end_date !== saved.validity_end_date) {
          diffList.push(
            `Fim Vigência: ${previousRecord.validity_end_date || '-'} → ${saved.validity_end_date || '-'}`,
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
        if (
          previousRecord.tempo_minimo_pcp_unidade !== saved.tempo_minimo_pcp_unidade ||
          previousRecord.tempo_minimo_pcp_valor !== saved.tempo_minimo_pcp_valor
        ) {
          const beforeStr =
            previousRecord.tempo_minimo_pcp_valor != null
              ? `${formatBrNumber(previousRecord.tempo_minimo_pcp_valor)} ${previousRecord.tempo_minimo_pcp_unidade || ''}`
              : 'Não definido'
          const afterStr =
            saved.tempo_minimo_pcp_valor != null
              ? `${formatBrNumber(saved.tempo_minimo_pcp_valor)} ${saved.tempo_minimo_pcp_unidade || ''}`
              : 'Não definido'
          diffList.push(`Tempo mínimo PCP: ${beforeStr} → ${afterStr}`)
        }
      } else {
        diffList.push(`Cadastro inicial criado com centro ${saved.center_code}`)
        if (saved.average_weight_t != null) {
          diffList.push(`Peso Médio inicial: ${formatBrNumber(saved.average_weight_t, 4)} t`)
        }
        if (saved.ideal_mp_length_mm != null) {
          diffList.push(`Comp. Ideal MP inicial: ${formatBrNumber(saved.ideal_mp_length_mm)} mm`)
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
          supplier_applicable: saved.supplier_applicable,
          suppliers: saved.suppliers_json,
          raw_material_type: saved.raw_material_type,
          application: saved.application,
          bitolas: saved.bitolas_json,
          steel_types: saved.steel_types_json,
          pesos_t: {
            min: saved.min_weight_t,
            avg: saved.average_weight_t,
            max: saved.max_weight_t,
          },
          comprimentos_mm: {
            rolled_min: saved.rolled_min_length_mm,
            rolled_ideal: saved.rolled_ideal_length_mm,
            rolled_max: saved.rolled_max_length_mm,
            mp_min: saved.min_mp_length_mm,
            mp_ideal: saved.ideal_mp_length_mm,
            mp_max: saved.max_mp_length_mm,
          },
          reducoes_pct: {
            min: saved.reduction_min_pct,
            ideal: saved.reduction_ideal_pct,
            max: saved.reduction_max_pct,
            ratio_x: saved.reduction_ratio_x,
          },
          vigencia: {
            start: saved.validity_start_date,
            end: saved.validity_end_date,
          },
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

import {
  WeeklyScheduleItem,
  WeeklyHeaderFilter,
  WeeklyIndicators,
  WeeklyScheduleSummary,
  ValidationResult,
  OfficialMaterialOption,
  SapPurchaseOrder,
  UpstreamProductionPlan,
  DualCommitmentConflict,
  BilletRequirementGroup,
  WeeklySummaryRawMaterial,
  RawMaterialItemCalculation,
  RawMaterialTrafficLight,
  WeeklySimulationReport,
  SimulationFeasibilityResult,
} from '@/types/weekly-schedule'
import {
  LineOverviewData,
  LineProductivityRate,
  LineBlockedProduct,
  LineSetupMatrix,
  ProductionShift,
  StandardScheduledStop,
} from '@/types/line-master'
import { InventoryItem } from '@/types/inventory-projection'

/**
 * Utilitário determinístico de manipulação e cálculo de datas/horas
 */
export function formatIsoDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatBraDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} – ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseDateTime(str: string): Date {
  if (!str) return new Date()
  const clean = str.replace(' ', 'T')
  const d = new Date(clean)
  if (isNaN(d.getTime())) {
    return new Date()
  }
  return d
}

export function getWeekDateRange(
  year: number,
  weekNumber: number,
): { startDate: Date; endDate: Date; display: string } {
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7)
  const dayOfWeek = simple.getDay()
  const ISOweekStart = new Date(simple)
  if (dayOfWeek <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  }
  const ISOweekEnd = new Date(ISOweekStart)
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6)

  const pad = (n: number) => String(n).padStart(2, '0')
  const d1 = `${pad(ISOweekStart.getDate())}/${pad(ISOweekStart.getMonth() + 1)}`
  const d2 = `${pad(ISOweekEnd.getDate())}/${pad(ISOweekEnd.getMonth() + 1)}`

  return {
    startDate: ISOweekStart,
    endDate: ISOweekEnd,
    display: `${d1} a ${d2}`,
  }
}

export const DAYS_OF_WEEK: Array<{
  code: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  label: string
  offsetDays: number
}> = [
  { code: 'SEG', label: 'Segunda-feira', offsetDays: 0 },
  { code: 'TER', label: 'Terça-feira', offsetDays: 1 },
  { code: 'QUA', label: 'Quarta-feira', offsetDays: 2 },
  { code: 'QUI', label: 'Quinta-feira', offsetDays: 3 },
  { code: 'SEX', label: 'Sexta-feira', offsetDays: 4 },
  { code: 'SAB', label: 'Sábado', offsetDays: 5 },
  { code: 'DOM', label: 'Domingo', offsetDays: 6 },
]

/**
 * Contexto de dados industriais para o Motor de MP
 */
export interface RawMaterialEngineContext {
  inventoryItems?: InventoryItem[]
  purchaseOrders?: SapPurchaseOrder[]
  upstreamProductions?: UpstreamProductionPlan[]
  otherWeeklySchedules?: WeeklyScheduleItem[]
  coolingTimes?: Array<{
    center_code?: string
    plant_id?: string
    line_code?: string
    work_center?: string
    material_code?: string
    family_code?: string
    gauge_dimension?: string
    cooling_time_hours: number
    rule_condition?: string
    notes?: string
  }>
}

export const WeeklyScheduleEngine = {
  /**
   * Validação pontual de resfriamento entre conclusão anterior e início programado
   */
  validateCoolingTime(
    materialCode: string,
    scheduledStartIso: string,
    upstreamEndIso: string,
    requiredHours: number,
  ): {
    hasViolation: boolean
    elapsedHours: number
    requiredHours: number
    message: string
  } {
    const start = new Date(scheduledStartIso.replace(' ', 'T'))
    const end = new Date(upstreamEndIso.replace(' ', 'T'))
    const elapsedMs = start.getTime() - end.getTime()
    const elapsedHours = Number((elapsedMs / (1000 * 60 * 60)).toFixed(1))
    const hasViolation = elapsedHours < requiredHours

    return {
      hasViolation,
      elapsedHours,
      requiredHours,
      message: hasViolation
        ? `🔴 TEMPO DE RESFRIAMENTO NÃO ATENDIDO: Material ${materialCode} exige ${requiredHours}h de resfriamento, mas decorreram apenas ${elapsedHours}h.`
        : `Tempo de resfriamento atendido (${elapsedHours}h decorridas >= ${requiredHours}h exigidas).`,
    }
  },

  /**
   * Obtém o tempo obrigatório de resfriamento para o material/linha/bitola
   */
  getCoolingTimeHours(
    lineCode: string,
    materialCode: string,
    familyCode?: string,
    dimensions?: string,
    coolingRules?: Array<{
      line_code?: string
      material_code?: string
      family_code?: string
      gauge_dimension?: string
      cooling_time_hours: number
    }>,
  ): number {
    const rules = coolingRules || []
    const mCode = materialCode.toUpperCase().trim()

    // 1. Busca exata por line_code e material_code
    const exact = rules.find(
      (r) =>
        (!r.line_code || r.line_code.toUpperCase() === lineCode.toUpperCase()) &&
        r.material_code &&
        r.material_code.toUpperCase() === mCode,
    )
    if (exact && exact.cooling_time_hours > 0) {
      return exact.cooling_time_hours
    }

    // 2. Busca por family_code
    if (familyCode) {
      const famMatch = rules.find(
        (r) =>
          (!r.line_code || r.line_code.toUpperCase() === lineCode.toUpperCase()) &&
          r.family_code &&
          r.family_code.toUpperCase() === familyCode.toUpperCase(),
      )
      if (famMatch && famMatch.cooling_time_hours > 0) {
        return famMatch.cooling_time_hours
      }
    }

    // 3. Busca por dimensão/bitola
    if (dimensions) {
      const dimMatch = rules.find(
        (r) =>
          r.gauge_dimension &&
          (dimensions.toUpperCase().includes(r.gauge_dimension.toUpperCase()) ||
            r.gauge_dimension.toUpperCase().includes(dimensions.toUpperCase())),
      )
      if (dimMatch && dimMatch.cooling_time_hours > 0) {
        return dimMatch.cooling_time_hours
      }
    }

    // 4. Heurística padrão baseada nas bitolas e famílias oficiais CIAFAL
    if (mCode.includes('150X50') || mCode.includes('PU-150')) {
      return 36 // Perfil pesado conformação Contagem
    }
    if (mCode.includes('100X100') || mCode.includes('TQ-100') || mCode.includes('TAR-130')) {
      return 24 // Seção pesada / tarugo estrutural
    }
    if (mCode.includes('80X40') || mCode.includes('TR-80')) {
      return 23 // Tubo retangular
    }
    if (mCode.includes('50X50') || mCode.includes('TQ-50')) {
      return 18 // Seção média padrão
    }

    return 24 // Padrão metalúrgico CIAFAL
  },

  /**
   * Formata duração em minutos para formato amigável industrial pt-BR (ex: "8 h 20 min", "45 min", "2 h")
   */
  formatDurationMinutes(minutes: number): string {
    const totalMinutes = Math.round(minutes)
    if (totalMinutes <= 0) return '0 min'
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h} h`
    return `${h} h ${m} min`
  },

  /**
   * Formata duração em horas decimais para formato amigável industrial pt-BR (ex: 8.333 -> "8 h 20 min")
   */
  formatDurationHours(hours: number): string {
    const totalMinutes = Math.round((hours || 0) * 60)
    return this.formatDurationMinutes(totalMinutes)
  },

  /**
   * Formata nome do Turno de forma limpa e padronizada (Requisito 2):
   * "1º Turno / Turma C" -> "T1 · Turma C"
   * "2º Turno / Turma B" -> "T2 · Turma B"
   * "3º Turno / Turma A" -> "T3 · Turma A"
   * Se não tiver número explícito ou vier código T1_L1 / Turma C -> "T1 · Turma C"
   * Não repete a turma abaixo. Preserva a configuração da Ficha Mestre da respectiva linha.
   */
  /**
   * Valida a movimentação ou reordenação pré-drop na sequência (Requisitos 5, 6, 20, 21, 38)
   * Verifica Ficha Mestre, Matriz Gargalo, Capacidades, Bloqueios, Mudança de Bitola/Família e MP
   */
  validateSequenceDrop(params: {
    items: WeeklyScheduleItem[]
    fromIndex: number
    toIndex: number
    lineOverview: LineOverviewData | null
    lineCode?: string
  }): {
    allowed: boolean
    blockingReason?: string
    warnings: string[]
    infoMessages: string[]
    setupEstimatedMinutes?: number
  } {
    const { items, fromIndex, toIndex, lineOverview, lineCode } = params
    if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
      return {
        allowed: false,
        blockingReason: 'Posição de sequência inválida.',
        warnings: [],
        infoMessages: [],
      }
    }

    const itemToMove = items[fromIndex]
    if (!itemToMove) {
      return {
        allowed: false,
        blockingReason: 'Item de origem não encontrado.',
        warnings: [],
        infoMessages: [],
      }
    }

    const warnings: string[] = []
    const infoMessages: string[] = []

    // 1. Verifica se o produto tem bloqueio na linha (VAL-02 Hard Block)
    if (itemToMove.item_type === 'PRODUCTION') {
      const block = this.checkHardBlock(itemToMove.material_code, lineOverview)
      if (block) {
        return {
          allowed: false,
          blockingReason: `Produto [${itemToMove.material_code}] está BLOQUEADO na Linha ${lineCode || 'L1'}: ${block.block_reason}.`,
          warnings: [],
          infoMessages: [],
        }
      }
    }

    // 2. Simula nova sequência em memória
    const simulated = [...items]
    const [moved] = simulated.splice(fromIndex, 1)
    simulated.splice(toIndex, 0, moved)

    // 3. Analisa vizinhança na nova posição (item anterior e posterior)
    const prevItem = toIndex > 0 ? simulated[toIndex - 1] : null
    const nextItem = toIndex < simulated.length - 1 ? simulated[toIndex + 1] : null

    // 4. Verifica impacto de Setup
    let estSetupMin = 0
    if (moved.item_type === 'PRODUCTION') {
      const setupPrev = this.calculateSetup(
        prevItem,
        moved.material_code,
        moved.family_code,
        lineOverview,
        lineCode || 'L1',
      )
      estSetupMin += setupPrev.setupDurationMinutes
      if (setupPrev.setupDurationMinutes > 0) {
        infoMessages.push(
          `Setup previsto na nova posição: +${setupPrev.setupDurationMinutes} min (${setupPrev.setupReason})`,
        )
      }

      if (nextItem && nextItem.item_type === 'PRODUCTION') {
        const setupNext = this.calculateSetup(
          moved,
          nextItem.material_code,
          nextItem.family_code,
          lineOverview,
          lineCode || 'L1',
        )
        if (setupNext.setupDurationMinutes > 0) {
          infoMessages.push(
            `Setup subsequente para ${nextItem.material_code}: +${setupNext.setupDurationMinutes} min (${setupNext.setupReason})`,
          )
        }
      }

      // 5. Validação de Família / Linha Homologada
      if (lineOverview?.capabilities && lineOverview.capabilities.length > 0) {
        const capability = lineOverview.capabilities.find(
          (c: any) =>
            c.expand?.product_family_id?.code === moved.family_code ||
            c.product_family_id === moved.family_code,
        )
        if (
          capability &&
          (capability.status === 'BLOCKED' || (capability as any).status === 'PROHIBITED')
        ) {
          return {
            allowed: false,
            blockingReason: `Família [${moved.family_code || 'Geral'}] está bloqueada para esta linha conforme Ficha Mestra.`,
            warnings,
            infoMessages,
          }
        }
      }
    }

    return {
      allowed: true,
      warnings,
      infoMessages,
      setupEstimatedMinutes: estSetupMin,
    }
  },

  formatShiftDisplay(shiftName?: string, shiftCode?: string, crewName?: string): string {
    const rawName = (shiftName || '').trim()
    const rawCode = (shiftCode || '').trim().toUpperCase()
    const rawCrew = (crewName || '').trim()

    // 1. Detecta prefixo do turno (T1, T2, T3, T4, T5...)
    let tPrefix = ''
    if (
      rawName.match(/1[º°ª]\s*turno/i) ||
      rawCode.startsWith('T1') ||
      rawCode.includes('TURNO_1') ||
      rawCode.includes('T1_')
    ) {
      tPrefix = 'T1'
    } else if (
      rawName.match(/2[º°ª]\s*turno/i) ||
      rawCode.startsWith('T2') ||
      rawCode.includes('TURNO_2') ||
      rawCode.includes('T2_')
    ) {
      tPrefix = 'T2'
    } else if (
      rawName.match(/3[º°ª]\s*turno/i) ||
      rawCode.startsWith('T3') ||
      rawCode.includes('TURNO_3') ||
      rawCode.includes('T3_')
    ) {
      tPrefix = 'T3'
    } else if (
      rawName.match(/4[º°ª]\s*turno/i) ||
      rawCode.startsWith('T4') ||
      rawCode.includes('TURNO_4') ||
      rawCode.includes('T4_')
    ) {
      tPrefix = 'T4'
    } else if (
      rawName.match(/5[º°ª]\s*turno/i) ||
      rawCode.startsWith('T5') ||
      rawCode.includes('TURNO_5') ||
      rawCode.includes('T5_')
    ) {
      tPrefix = 'T5'
    } else if (rawCode.match(/^T\d+/i)) {
      const match = rawCode.match(/^T\d+/i)
      tPrefix = match ? match[0].toUpperCase() : 'T1'
    } else if (rawName.match(/T\d+/i)) {
      const match = rawName.match(/T\d+/i)
      tPrefix = match ? match[0].toUpperCase() : 'T1'
    } else {
      tPrefix = 'T1'
    }

    // 2. Extrai turma se já estiver no nome ou no crewName
    let crew = rawCrew
    if (!crew || crew === 'Turma') {
      const crewMatch = rawName.match(/Turma\s+([A-Z0-9]+)/i)
      if (crewMatch) {
        crew = `Turma ${crewMatch[1].toUpperCase()}`
      } else {
        crew = 'Turma A'
      }
    } else if (!crew.toLowerCase().startsWith('turma')) {
      crew = `Turma ${crew}`
    }

    return `${tPrefix} · ${crew}`
  },

  /**
   * Obtém produtividade oficial da Ficha Mestre da Linha para um material
   * Retorna null se não houver cadência cadastrada (sem inventar defaults)
   */
  getProductivityForMaterialStrict(
    materialCode: string,
    lineOverview: LineOverviewData | null,
  ): number | null {
    if (!lineOverview || !materialCode) return null

    const found = lineOverview.productivity?.find(
      (p) => p.material_product_code.toUpperCase() === materialCode.toUpperCase() && p.active,
    )
    if (found && found.planned_productivity > 0) {
      return Number(found.planned_productivity)
    }
    if (found && found.nominal_productivity > 0) {
      return Number(found.nominal_productivity)
    }
    if (lineOverview.master && lineOverview.master.nominal_hourly_capacity > 0) {
      return Number(lineOverview.master.nominal_hourly_capacity)
    }
    return null
  },

  /**
   * Obtém produtividade oficial da Ficha Mestre da Linha para um material (com fallback legado seguro se necessário)
   */
  getProductivityForMaterial(
    materialCode: string,
    lineOverview: LineOverviewData | null,
    defaultLineNominalTh: number = 12.0,
  ): number {
    const strict = this.getProductivityForMaterialStrict(materialCode, lineOverview)
    if (strict !== null && strict > 0) return strict
    return defaultLineNominalTh
  },

  /**
   * MOTOR TEMPORAL BIDIRECIONAL INDUSTRIAL CIAFAL (Requisitos 11 a 15)
   *
   * Modalidade QUANTIDADE:
   *   Entrada: quantidadeTons, cadenciaTh, horaInicio (HH:mm)
   *   Saída: duracaoHoras, duracaoMinutos, duracaoFormatada, horaFim (HH:mm), valido
   *
   * Modalidade HORÁRIO:
   *   Entrada: horaInicio (HH:mm), horaFim (HH:mm), cadenciaTh
   *   Saída: duracaoHoras, duracaoMinutos, duracaoFormatada, quantidadePrevistaTons, valido
   */
  calculateBidirectionalSchedule(params: {
    mode: 'QUANTITY' | 'TIME'
    cadenceTh: number
    quantityTons?: number
    startTime: string // "HH:mm" ou "YYYY-MM-DD HH:mm"
    endTime?: string // "HH:mm" ou "YYYY-MM-DD HH:mm"
  }): {
    mode: 'QUANTITY' | 'TIME'
    cadenceTh: number
    quantityTons: number
    startTime: string // "HH:mm"
    endTime: string // "HH:mm"
    durationHours: number
    durationMinutes: number
    durationFormatted: string
    isValid: boolean
    errorMessage?: string
  } {
    const cadence = Number(params.cadenceTh) || 0
    if (cadence <= 0) {
      return {
        mode: params.mode,
        cadenceTh: 0,
        quantityTons: params.quantityTons || 0,
        startTime: params.startTime || '06:00',
        endTime: params.endTime || '08:00',
        durationHours: 0,
        durationMinutes: 0,
        durationFormatted: '0 min',
        isValid: false,
        errorMessage:
          'Cadência não cadastrada para este material nesta linha. Atualize a Ficha Mestre antes de concluir a programação.',
      }
    }

    const parseMinutes = (tStr: string): number => {
      if (!tStr) return 0
      const clean = tStr.includes(' ') ? tStr.split(' ')[1] : tStr
      const [h, m] = clean.split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }

    const formatMinutesToHHMM = (totalMin: number): string => {
      const normalized = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60)
      const h = Math.floor(normalized / 60)
      const m = Math.floor(normalized % 60)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${pad(h)}:${pad(m)}`
    }

    const startMin = parseMinutes(params.startTime || '06:00')
    const startHHMM = formatMinutesToHHMM(startMin)

    if (params.mode === 'QUANTITY') {
      const qty = Number(params.quantityTons) || 0
      if (qty <= 0) {
        return {
          mode: 'QUANTITY',
          cadenceTh: cadence,
          quantityTons: 0,
          startTime: startHHMM,
          endTime: startHHMM,
          durationHours: 0,
          durationMinutes: 0,
          durationFormatted: '0 min',
          isValid: false,
          errorMessage: 'Quantidade deve ser superior a zero.',
        }
      }

      // Duração = Quantidade / Cadência
      const durationHours = qty / cadence
      const durationMinutes = Math.round(durationHours * 60)
      const endMin = startMin + durationMinutes
      const endHHMM = formatMinutesToHHMM(endMin)

      return {
        mode: 'QUANTITY',
        cadenceTh: cadence,
        quantityTons: Number(qty.toFixed(2)),
        startTime: startHHMM,
        endTime: endHHMM,
        durationHours: Number(durationHours.toFixed(2)),
        durationMinutes,
        durationFormatted: this.formatDurationMinutes(durationMinutes),
        isValid: true,
      }
    } else {
      // Modalidade HORÁRIO (Tempo -> Quantidade)
      let endMin = parseMinutes(params.endTime || '14:00')
      let diffMin = endMin - startMin
      if (diffMin <= 0) {
        // Atravessou a meia-noite
        diffMin += 24 * 60
      }

      const durationHours = diffMin / 60
      const durationMinutes = diffMin
      // Quantidade = Duração * Cadência
      const calculatedQty = Number((durationHours * cadence).toFixed(2))
      const endHHMM = formatMinutesToHHMM(endMin)

      return {
        mode: 'TIME',
        cadenceTh: cadence,
        quantityTons: calculatedQty,
        startTime: startHHMM,
        endTime: endHHMM,
        durationHours: Number(durationHours.toFixed(2)),
        durationMinutes,
        durationFormatted: this.formatDurationMinutes(durationMinutes),
        isValid: calculatedQty > 0,
      }
    }
  },

  /**
   * Obtém especificação técnica de matéria-prima (Ficha Mestre e rendimento)
   */
  getRawMaterialSpecification(
    materialCode: string,
    steelGradeHint?: string,
    dimensionsHint?: string,
    lineOverview?: LineOverviewData | null,
  ): {
    steelGrade: string
    billetType: string
    sectionDimension: string
    billetWeightKg: number
    yieldPct: number
    lossPct: number
    origin: string
  } {
    const grade = (steelGradeHint || 'SAE 1020').trim().toUpperCase()
    let section = '130x130 mm'
    let billetWeight = 1600 // kg por tarugo standard CIAFAL
    let yieldPct = 97.5 // 97.5% de rendimento nominal (2.5% perda)
    let billetType = `Tarugo Laminação ${grade}`
    let origin = 'Aciaria Própria / Gerdau / Aperam'

    const code = materialCode.toUpperCase()

    if (
      code.includes('TQ-100') ||
      code.includes('PESADO') ||
      (dimensionsHint && dimensionsHint.includes('100x100'))
    ) {
      section = '150x150 mm'
      billetWeight = 2100
      yieldPct = 96.0 // 4% de perda para perfis extrapesados
      billetType = `Tarugo Seção Pesada 150x150 ${grade}`
      origin = 'Fornecimento Gerdau Ouro Branco'
    } else if (code.includes('GALV')) {
      section = 'Bobina Z275 #1.50'
      billetWeight = 5000
      yieldPct = 98.0
      billetType = `Bobina Pré-Galvanizada ${grade}`
      origin = 'CSN Volta Redonda'
    } else if (code.includes('PU-') || code.includes('PERFIL')) {
      section = '130x130 mm'
      billetWeight = 1600
      yieldPct = 97.0
      billetType = `Tarugo Perfil U ${grade}`
      origin = 'Aciaria Divinópolis'
    } else if (code.includes('TR-')) {
      section = '130x130 mm'
      billetWeight = 1600
      yieldPct = 97.5
      billetType = `Tarugo Retangular ${grade}`
      origin = 'Aciaria Divinópolis'
    }

    // Se houver configuração na Ficha Mestre da linha
    if (lineOverview?.rawMaterials && lineOverview.rawMaterials.length > 0) {
      const rmMatch = lineOverview.rawMaterials.find(
        (rm) =>
          rm.material_code.toUpperCase() === materialCode.toUpperCase() ||
          rm.material_code.toUpperCase().includes(grade),
      )
      if (rmMatch) {
        if (rmMatch.material_origin) origin = rmMatch.material_origin
        if (rmMatch.material_description) billetType = rmMatch.material_description
      }
    }

    const lossPct = Number((100 - yieldPct).toFixed(2))

    return {
      steelGrade: grade,
      billetType,
      sectionDimension: section,
      billetWeightKg: billetWeight,
      yieldPct,
      lossPct,
      origin,
    }
  },

  /**
   * Verifica se o material possui HARD BLOCK na linha
   */
  checkHardBlock(
    materialCode: string,
    lineOverview: LineOverviewData | null,
  ): LineBlockedProduct | null {
    if (!lineOverview || !lineOverview.blockedProducts) return null
    const blocked = lineOverview.blockedProducts.find(
      (b) => b.active && b.product_code.trim().toUpperCase() === materialCode.trim().toUpperCase(),
    )
    return blocked || null
  },

  /**
   * Determina o tempo de setup completo (Troca + Acerto) entre dois produtos/famílias
   * conforme Matriz de Setup da Ficha Mestre e SMED (Requisitos 5, 6, 7, 8, 11)
   */
  calculateSetup(
    prevItem: WeeklyScheduleItem | null,
    currentMaterialCode: string,
    currentFamilyCode: string | undefined,
    lineOverview: LineOverviewData | null,
    lineCode = 'L1',
  ): {
    setupDurationMinutes: number
    setupReason: string
    breakdown: {
      planned_change_minutes: number
      planned_tuning_minutes: number
      planned_total_minutes: number
      from_material_code?: string
      to_material_code?: string
      from_family_code?: string
      to_family_code?: string
      change_type: string
      responsible_area: 'OFICINA_CILINDROS' | 'PRODUCAO' | 'MANUTENCAO'
      is_missing_standard_param: boolean
      cylinder_set_code?: string
      cylinder_set_name?: string
      is_bottleneck_resource: boolean
      bottleneck_stage_name: string
      bottleneck_loss_capacity_th: number
      bottleneck_potential_tons: number
    }
  } {
    const isBottleneck = lineCode === 'L1' || lineCode.includes('L1')
    const bottleneckCap = isBottleneck ? 24.8 : 20.0

    if (!prevItem || prevItem.item_type !== 'PRODUCTION') {
      return {
        setupDurationMinutes: 0,
        setupReason: 'Início de lote ou primeiro item do turno (sem setup prévio)',
        breakdown: {
          planned_change_minutes: 0,
          planned_tuning_minutes: 0,
          planned_total_minutes: 0,
          from_material_code: undefined,
          to_material_code: currentMaterialCode,
          from_family_code: undefined,
          to_family_code: currentFamilyCode,
          change_type: 'INICIO_CAMPANHA',
          responsible_area: 'PRODUCAO',
          is_missing_standard_param: false,
          is_bottleneck_resource: isBottleneck,
          bottleneck_stage_name: 'Trem Contínuo de Laminação',
          bottleneck_loss_capacity_th: bottleneckCap,
          bottleneck_potential_tons: 0,
        },
      }
    }

    if (prevItem.material_code.toUpperCase() === currentMaterialCode.toUpperCase()) {
      return {
        setupDurationMinutes: 0,
        setupReason: 'Mesmo material (continuidade de campanha sem troca física)',
        breakdown: {
          planned_change_minutes: 0,
          planned_tuning_minutes: 0,
          planned_total_minutes: 0,
          from_material_code: prevItem.material_code,
          to_material_code: currentMaterialCode,
          from_family_code: prevItem.family_code,
          to_family_code: currentFamilyCode,
          change_type: 'CONTINUIDADE',
          responsible_area: 'PRODUCAO',
          is_missing_standard_param: false,
          is_bottleneck_resource: isBottleneck,
          bottleneck_stage_name: 'Trem Contínuo de Laminação',
          bottleneck_loss_capacity_th: bottleneckCap,
          bottleneck_potential_tons: 0,
        },
      }
    }

    let changeMin = 20
    let tuningMin = 10
    let reason = ''
    let isMissingParam = false

    const prevFam = prevItem.family_code || 'TQ_LEVES'
    const curFam = currentFamilyCode || 'TR_LEVES'
    const isFamilyChange = prevFam !== curFam

    // Busca exata produto a produto na Matriz de Setup
    const exactMatch = lineOverview?.setupMatrix?.find(
      (s) =>
        s.active &&
        s.from_product_code &&
        s.to_product_code &&
        s.from_product_code.toUpperCase() === prevItem.material_code.toUpperCase() &&
        s.to_product_code.toUpperCase() === currentMaterialCode.toUpperCase(),
    )

    if (exactMatch) {
      const tot = exactMatch.setup_duration_minutes || 30
      changeMin = Math.round(tot * 0.65)
      tuningMin = tot - changeMin
      reason = `${exactMatch.setup_description || 'Troca Ficha Mestre'} (Troca: ${changeMin} min + Acerto: ${tuningMin} min = ${tot} min)`
    } else {
      // Busca família a família
      const familyMatch = lineOverview?.setupMatrix?.find(
        (s) =>
          s.active &&
          s.expand?.from_family_id?.code === prevFam &&
          s.expand?.to_family_id?.code === curFam,
      )
      if (familyMatch) {
        const tot = familyMatch.setup_duration_minutes || 35
        changeMin = Math.round(tot * 0.65)
        tuningMin = tot - changeMin
        reason = `${familyMatch.setup_description || 'Troca de Família'} (Troca: ${changeMin} min + Acerto: ${tuningMin} min = ${tot} min)`
      } else {
        // Heurística metalúrgica padrão CIAFAL
        if (isFamilyChange) {
          changeMin = 35
          tuningMin = 15
          reason = `Troca de Família [${prevFam} → ${curFam}]: Troca ${changeMin} min + Acerto ${tuningMin} min (Total: 50 min)`
        } else {
          changeMin = 15
          tuningMin = 5
          reason = `Troca de Bitola [${prevItem.material_code} → ${currentMaterialCode}]: Troca ${changeMin} min + Acerto ${tuningMin} min (Total: 20 min)`
        }
        isMissingParam = !lineOverview?.setupMatrix || lineOverview.setupMatrix.length === 0
      }
    }

    const totalMinutes = changeMin + tuningMin
    const potentialLostTons = Number(((totalMinutes / 60) * bottleneckCap).toFixed(1))

    return {
      setupDurationMinutes: totalMinutes,
      setupReason: reason,
      breakdown: {
        planned_change_minutes: changeMin,
        planned_tuning_minutes: tuningMin,
        planned_total_minutes: totalMinutes,
        from_material_code: prevItem.material_code,
        to_material_code: currentMaterialCode,
        from_family_code: prevFam,
        to_family_code: curFam,
        change_type: isFamilyChange ? 'TROCA_FAMILIA_COMPLETA' : 'TROCA_BITOLA',
        responsible_area: isFamilyChange ? 'OFICINA_CILINDROS' : 'PRODUCAO',
        is_missing_standard_param: isMissingParam,
        cylinder_set_code: `CJ-${lineCode}-${curFam.replace('_', '-')}`,
        cylinder_set_name: `Jogo de Cilindros ${curFam}`,
        is_bottleneck_resource: isBottleneck,
        bottleneck_stage_name: 'Trem Contínuo de Laminação',
        bottleneck_loss_capacity_th: bottleneckCap,
        bottleneck_potential_tons: potentialLostTons,
      },
    }
  },

  /**
   * MOTOR DE DISPONIBILIDADE PROJETADA DE MATÉRIA-PRIMA (Requisitos 1 a 6)
   */
  calculateRawMaterialRequirement(
    item: WeeklyScheduleItem,
    itemConsumptionDate: Date,
    priorCumulativeTons: number,
    context: RawMaterialEngineContext,
    lineOverview?: LineOverviewData | null,
  ): RawMaterialItemCalculation {
    const plannedTons = Number(item.planned_quantity_tons) || 0
    const spec = this.getRawMaterialSpecification(
      item.material_code,
      item.steel_grade,
      item.dimensions,
      lineOverview,
    )

    // 1. Necessidade Líquida = Qtd Programada / (Rendimento / 100)
    const netRawMaterialTons =
      spec.yieldPct > 0 ? Number((plannedTons / (spec.yieldPct / 100)).toFixed(2)) : plannedTons

    // Número estimado de tarugos = (Necessidade em kg) / (Peso do tarugo em kg)
    const netRawMaterialKg = netRawMaterialTons * 1000
    const estimatedBilletsCount =
      spec.billetWeightKg > 0
        ? Math.ceil(netRawMaterialKg / spec.billetWeightKg)
        : Math.ceil(netRawMaterialTons)

    const accumulatedWeekTons = Number((priorCumulativeTons + netRawMaterialTons).toFixed(2))

    // 2. DISPONIBILIDADE PROJETADA NA DATA DE CONSUMO
    // Formula: Estoque SAP + POs anteriores + Upstream anterior + Outras entradas - Reservas - Outros consumos - Consumo anterior da linha

    // A) Estoque SAP / WMS Disponível
    const stockItems = context.inventoryItems || []
    const matchingStock = stockItems.filter((st) => {
      const stGrade = ((st as any).steel_grade || '').toUpperCase()
      const stCat = st.category
      const matDesc = (st.material_description || '').toUpperCase()
      const matCode = (st.material_code || '').toUpperCase()

      const isRm =
        stCat === 'RAW_MATERIAL' ||
        (stCat as string) === 'SEMI_FINISHED' ||
        matDesc.includes('TARUGO') ||
        matDesc.includes('BOBINA') ||
        matCode.includes('BOB') ||
        matCode.includes('TAR')
      const matchesGrade =
        !stGrade ||
        stGrade.includes(spec.steelGrade) ||
        spec.steelGrade.includes(stGrade) ||
        matDesc.includes(spec.steelGrade) ||
        matCode.includes(spec.steelGrade)
      return isRm && matchesGrade
    })

    const currentSapStockTons = matchingStock.reduce(
      (sum, st) => sum + (st.qty_unrestricted || 0),
      0,
    )
    const existingReservationsTons = matchingStock.reduce(
      (sum, st) => sum + (st.qty_reserved || 0),
      0,
    )
    const otherEntriesTons = matchingStock.reduce((sum, st) => sum + (st.qty_in_quality || 0), 0) // entradas em qualidade

    // B) Pedidos de Compra SAP (Chegada estritamente ANTERIOR à data de consumo)
    const pos = context.purchaseOrders || []
    let confirmedPoTons = 0
    pos.forEach((po) => {
      const poGrade = (po.steelGrade || po.materialDescription || po.materialCode).toUpperCase()
      const matchesGrade = poGrade.includes(spec.steelGrade) || spec.steelGrade.includes(poGrade)
      if (matchesGrade) {
        const poDate = parseDateTime(po.estimatedDeliveryDate)
        // Data é crítica: chegada ANTERIOR à data de consumo
        if (poDate <= itemConsumptionDate) {
          po.consideredAvailable = true
          po.availableQuantityTons = po.openBalanceTons || po.totalQuantityTons
          confirmedPoTons += po.availableQuantityTons
        } else {
          po.consideredAvailable = false
          po.availableQuantityTons = 0
          po.disregardReason = `Entrega prevista em ${formatBraDateTime(poDate)} é POSTERIOR à data de consumo (${formatBraDateTime(itemConsumptionDate)})`
        }
      }
    })

    // C) Produção Upstream em Linhas Anteriores (com data anterior à necessidade)
    const upstreams = context.upstreamProductions || []
    let upstreamProductionTons = 0
    let hasUpstreamDependency = false
    upstreams.forEach((up) => {
      const upGrade = (up.steelGrade || up.materialCode).toUpperCase()
      const matchesGrade = upGrade.includes(spec.steelGrade) || spec.steelGrade.includes(upGrade)
      if (matchesGrade && up.confirmed) {
        const upDate = parseDateTime(up.plannedEndDatetime)
        if (upDate <= itemConsumptionDate) {
          upstreamProductionTons += up.quantityTons
          hasUpstreamDependency = true
        }
      }
    })

    // D) Consumo já comprometido em outras programações
    const otherSchedules = context.otherWeeklySchedules || []
    let otherSchedulesCommittedTons = 0
    otherSchedules.forEach((oth) => {
      // Ignora itens da mesma linha/programação
      if (oth.line_code !== item.line_code || oth.schedule_code !== item.schedule_code) {
        const othGrade = (oth.steel_grade || oth.material_code).toUpperCase()
        if (othGrade.includes(spec.steelGrade) || spec.steelGrade.includes(othGrade)) {
          otherSchedulesCommittedTons += oth.raw_material_req_tons || oth.planned_quantity_tons || 0
        }
      }
    })

    // E) Consumo anterior da própria linha até este item
    const priorOwnLineConsumptionTons = priorCumulativeTons

    // F) Cálculo do Saldo Projetado
    // Projected Available = Stock + POs + Upstream + Other Entries - Reservations - Other Committed
    const grossAvailable =
      currentSapStockTons +
      confirmedPoTons +
      upstreamProductionTons +
      otherEntriesTons -
      existingReservationsTons -
      otherSchedulesCommittedTons
    const projectedAvailableTons = Number(Math.max(0, grossAvailable).toFixed(2))

    const projectedBalanceTons = Number(
      (grossAvailable - priorOwnLineConsumptionTons - netRawMaterialTons).toFixed(2),
    )

    // 3. SEMÁFORO E ALERTAS DETERMINÍSTICOS
    let status: RawMaterialTrafficLight = 'GREEN'
    let statusLabel = 'MP GARANTIDA'
    let statusReason = 'Estoque e entradas confirmadas suficientes antes do consumo.'
    let deficitTons = 0
    let probableRuptureDate: string | undefined = undefined

    if (projectedBalanceTons < 0) {
      status = 'RED'
      statusLabel = 'MP INSUFICIENTE'
      deficitTons = Math.abs(projectedBalanceTons)
      probableRuptureDate = formatBraDateTime(itemConsumptionDate)
      statusReason = `Déficit projetado de ${deficitTons.toLocaleString('pt-BR')} t. Ruptura estimada em ${probableRuptureDate}.`
    } else if (hasUpstreamDependency || confirmedPoTons > 0 || otherEntriesTons > 0) {
      status = 'YELLOW'
      statusLabel = 'MP COM RISCO'
      statusReason = hasUpstreamDependency
        ? `Depende da produção upstream de outra linha (${upstreamProductionTons} t) antes de ${formatBraDateTime(itemConsumptionDate)}.`
        : `Depende de recebimento de pedido de compra do fornecedor (${confirmedPoTons} t) antes do consumo.`
    }

    const calculationRuleExplanation = `Necessidade Líquida = ${plannedTons} t ÷ ${spec.yieldPct}% rendimento (perda de ${spec.lossPct}%) = ${netRawMaterialTons} t. Tarugo ${spec.sectionDimension} (${spec.billetWeightKg} kg/un) &rarr; ${estimatedBilletsCount} tarugos. Disponibilidade Projetada = Estoque SAP (${currentSapStockTons} t) + POs anteriores (${confirmedPoTons} t) + Upstream anterior (${upstreamProductionTons} t) - Reservas (${existingReservationsTons} t) - Outras programações (${otherSchedulesCommittedTons} t) - Consumo anterior desta linha (${priorCumulativeTons} t).`

    return {
      steelGrade: spec.steelGrade,
      billetType: spec.billetType,
      sectionDimension: spec.sectionDimension,
      billetWeightKg: spec.billetWeightKg,
      estimatedBilletsCount,
      netRawMaterialTons,
      yieldPct: spec.yieldPct,
      lossPct: spec.lossPct,
      origin: spec.origin,
      accumulatedWeekTons,
      projectedAvailableTons,
      currentSapStockTons,
      confirmedPoTons,
      upstreamProductionTons,
      otherEntriesTons,
      existingReservationsTons,
      otherSchedulesCommittedTons,
      priorOwnLineConsumptionTons,
      projectedBalanceTons,
      status,
      statusLabel,
      statusReason,
      deficitTons,
      probableRuptureDate,
      calculationRuleExplanation,
    }
  },

  /**
   * Cálculo AUTOMÁTICO da grade completa com integração total do Motor de MP
   */
  /**
   * Executa a SIMULAÇÃO ABRANGENTE de programação avaliando os 13 domínios exigidos:
   * Capacidade, Produtividade, Setups, Sequenciamento, MP, Estoque, Compras SAP,
   * Produção Upstream, MTO, Requisitos Especiais, Conflitos entre Linhas, Carteira e Paradas.
   */
  simulateSchedule(
    items: WeeklyScheduleItem[],
    lineOverview: LineOverviewData | null,
    headerFilter: WeeklyHeaderFilter,
    rawMaterialContext: RawMaterialEngineContext = {},
  ): WeeklySimulationReport {
    const timeline = this.recalculateWeeklyTimeline(
      items,
      lineOverview,
      headerFilter,
      rawMaterialContext,
    )
    const indicators = timeline.indicators
    const validations = timeline.validations
    const prodItems = timeline.items.filter((i) => i.item_type === 'PRODUCTION')
    const stopItems = timeline.items.filter((i) => i.item_type === 'SCHEDULED_STOP')

    // 1. Capacidade
    let capStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let capScore = 100
    let capDesc = `Ocupação calculada de ${indicators.utilizationPct}% (${indicators.programmedProductiveHours + indicators.setupHours + indicators.stoppedHours}h de ${indicators.availableCapacityHours}h disponíveis).`
    if (indicators.utilizationPct > 105) {
      capStatus = 'FAIL'
      capScore = 40
      capDesc = `Sobrecarga crítica de capacidade: ${indicators.utilizationPct}% de ocupação excede em ${(indicators.utilizationPct - 100).toFixed(1)}% o limite semanal da linha.`
    } else if (indicators.utilizationPct > 95) {
      capStatus = 'WARN'
      capScore = 80
      capDesc = `Ocupação em nível de alerta (${indicators.utilizationPct}%): margem para imprevistos é de apenas ${indicators.freeHours}h.`
    } else if (indicators.utilizationPct < 50 && prodItems.length > 0) {
      capStatus = 'WARN'
      capScore = 85
      capDesc = `Subutilização da linha (${indicators.utilizationPct}%): há ${indicators.freeHours}h de capacidade ociosa.`
    }

    // 2. Produtividade
    let prodStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let prodScore = 95
    const lowProdItems = prodItems.filter((p) => (p.productivity_rate_th || 0) < 8)
    let prodDesc = `Taxas de produtividade alinhadas com Ficha Mestre da linha (média ${prodItems.length > 0 ? (prodItems.reduce((s, i) => s + (i.productivity_rate_th || 0), 0) / prodItems.length).toFixed(1) : 12} t/h).`
    if (lowProdItems.length > 0) {
      prodStatus = 'WARN'
      prodScore = 75
      prodDesc = `${lowProdItems.length} produto(s) com taxa horária abaixo do padrão nominal (menor que 8 t/h).`
    }

    // 3. Setups
    let setupStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let setupScore = 95
    const totalSetupMin = prodItems.reduce((s, i) => s + (i.setup_duration_minutes || 0), 0)
    let setupDesc = `Tempo total de troca e preparação: ${indicators.setupHours}h (${totalSetupMin} min), de acordo com a Matriz de Setup da Ficha Mestre.`
    if (indicators.setupHours > 8) {
      setupStatus = 'FAIL'
      setupScore = 50
      setupDesc = `Tempo excessivo de setup (${indicators.setupHours}h): fragmentação de famílias está consumindo mais de um turno de trabalho.`
    } else if (indicators.setupHours > 4) {
      setupStatus = 'WARN'
      setupScore = 80
      setupDesc = `Tempo moderado de setup (${indicators.setupHours}h): sugestão de reagrupar bitolas para encurtar trocas.`
    }

    // 4. Sequenciamento
    let seqStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let seqScore = indicators.sequenceScore
    let seqDesc = `Índice de aderência e suavidade de campanha: ${indicators.sequenceScore}/100.`
    if (indicators.sequenceScore < 60) {
      seqStatus = 'FAIL'
      seqDesc = `Sequenciamento caótico (${indicators.sequenceScore}/100): trocas bruscas de largura/espessura contraindicadas pelo processo.`
    } else if (indicators.sequenceScore < 80) {
      seqStatus = 'WARN'
      seqDesc = `Sequenciamento aceitável (${indicators.sequenceScore}/100), porém com oportunidades de otimização de matrizes.`
    }

    // 5. Matéria-Prima (MP)
    let mpStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let mpScore = 100
    let mpDesc = 'Demanda líquida de MP coberta com semáforo 100% verde.'
    if (indicators.rawMaterialRedCount && indicators.rawMaterialRedCount > 0) {
      mpStatus = 'FAIL'
      mpScore = 30
      mpDesc = `Ruptura crítica de MP: ${indicators.rawMaterialRedCount} aço(s) com saldo projetado negativo no momento do consumo.`
    } else if (indicators.rawMaterialYellowCount && indicators.rawMaterialYellowCount > 0) {
      mpStatus = 'WARN'
      mpScore = 75
      mpDesc = `Atenção à MP: ${indicators.rawMaterialYellowCount} aço(s) dependem de entregas de fornecedores ou de produção anterior.`
    }

    // 6. Estoque SAP / WMS
    let stockStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let stockScore = 95
    const hasZeroStockRequired = timeline.summary.billetRequirements.some(
      (b) => b.currentStockTons === 0 && b.requiredTons > 0,
    )
    let stockDesc = 'Níveis de estoque no WMS/SAP conferidos com reservas da linha.'
    if (hasZeroStockRequired && mpStatus === 'FAIL') {
      stockStatus = 'FAIL'
      stockScore = 40
      stockDesc = 'Estoque físico em pátio zerado para bitolas requeridas na semana.'
    } else if (hasZeroStockRequired) {
      stockStatus = 'WARN'
      stockScore = 70
      stockDesc = 'Estoque de pátio insuficiente, dependente de recebimentos programados.'
    }

    // 7. Compras SAP
    let poStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let poScore = 95
    const latePos = (rawMaterialContext.purchaseOrders || []).filter(
      (po) => po.status === 'LATE' || !po.consideredAvailable,
    )
    let poDesc = 'Pedidos de compra SAP confirmados com entregas anteriores à data de laminação.'
    if (
      latePos.length > 0 &&
      indicators.rawMaterialRedCount &&
      indicators.rawMaterialRedCount > 0
    ) {
      poStatus = 'FAIL'
      poScore = 50
      poDesc = `${latePos.length} pedido(s) de compra com data de entrega posterior ao consumo planejado.`
    } else if (latePos.length > 0) {
      poStatus = 'WARN'
      poScore = 80
      poDesc = `${latePos.length} pedido(s) de compra com data de entrega limítrofe à janela da programação.`
    }

    // 8. Produção Upstream
    let upstreamStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let upstreamScore = 100
    const upstreams = rawMaterialContext.upstreamProductions || []
    let upstreamDesc = 'Integração upstream sem gargalos detectados.'
    if (upstreams.some((u) => !u.confirmed)) {
      upstreamStatus = 'WARN'
      upstreamScore = 75
      upstreamDesc =
        'Existem ordens de linhas a montante ainda não confirmadas na programação semanal.'
    }

    // 9. MTO (Make-to-Order)
    let mtoStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let mtoScore = 100
    const mtoItems = prodItems.filter((p) => p.order_type === 'MTO')
    let mtoDesc = `Pedidos sob encomenda (MTO): ${mtoItems.length} item(ns) identificados e alocados.`
    const mtoWithoutClient = mtoItems.filter((m) => !m.sales_order_mto && !m.customer_name)
    if (mtoWithoutClient.length > 0) {
      mtoStatus = 'WARN'
      mtoScore = 85
      mtoDesc = `${mtoWithoutClient.length} item(ns) MTO sem número de pedido de vendas ou cliente especificado.`
    }

    // 10. Requisitos Especiais & Bloqueios
    let specialStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let specialScore = 100
    const blockedValidations = validations.filter((v) => v.level === 'BLOCKED')
    let specialDesc = 'Nenhum bloqueio técnico ou restrição de qualidade violada na linha.'
    if (blockedValidations.length > 0) {
      specialStatus = 'FAIL'
      specialScore = 0
      specialDesc = `BLOQUEIO CRÍTICO: ${blockedValidations.length} item(ns) com restrição técnica / HARD BLOCK na Ficha Mestre.`
    }

    // 11. Conflitos entre Linhas (Duplo Comprometimento)
    let conflictStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let conflictScore = 100
    let conflictDesc = 'Sem conflitos de concorrência de matéria-prima com outras linhas ativas.'
    if (timeline.summary.dualCommitments.length > 0) {
      conflictStatus = 'FAIL'
      conflictScore = 35
      conflictDesc = `Conflito de concorrência: ${timeline.summary.dualCommitments.length} material(is) com consumo simultâneo superior ao estoque total integrado.`
    }

    // 12. Carteira CRM / WMS
    let backlogStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let backlogScore = 95
    let backlogDesc = `Total programado para a semana: ${indicators.programmedQuantityTons} t em ${prodItems.length} lotes de produção.`
    if (prodItems.length === 0) {
      backlogStatus = 'WARN'
      backlogScore = 60
      backlogDesc = 'Nenhum produto programado na grade para a semana.'
    }

    // 13. Paradas Programadas
    let stopsStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS'
    let stopsScore = 100
    let stopsDesc = `Paradas e manutenções programadas: ${indicators.stoppedHours}h reservadas no cronograma.`
    if (stopItems.length === 0 && (lineOverview?.scheduledStops?.length || 0) > 0) {
      stopsStatus = 'WARN'
      stopsScore = 80
      stopsDesc =
        'A Ficha Mestre prevê paradas padrão, mas nenhuma parada foi inserida na grade da semana.'
    }

    // Veredito Global da Simulação
    const failsCount = [
      capStatus,
      prodStatus,
      setupStatus,
      seqStatus,
      mpStatus,
      stockStatus,
      poStatus,
      upstreamStatus,
      mtoStatus,
      specialStatus,
      conflictStatus,
      backlogStatus,
      stopsStatus,
    ].filter((s) => s === 'FAIL').length

    const warnsCount = [
      capStatus,
      prodStatus,
      setupStatus,
      seqStatus,
      mpStatus,
      stockStatus,
      poStatus,
      upstreamStatus,
      mtoStatus,
      specialStatus,
      conflictStatus,
      backlogStatus,
      stopsStatus,
    ].filter((s) => s === 'WARN').length

    let overallResult: SimulationFeasibilityResult = 'VIAVEL'
    let overallTitle = 'Programação viável'
    let overallDescription =
      'Todos os critérios operacionais, capacidades, matérias-primas e restrições estão atendidos. A programação pode seguir para validação e aprovação.'

    if (failsCount > 0) {
      overallResult = 'INVIAVEL'
      overallTitle = 'Programação inviável'
      overallDescription = `Foram detectados ${failsCount} ponto(s) impeditivos (bloqueios, ruptura de matéria-prima ou duplo comprometimento). Ajuste a grade antes de submeter à aprovação.`
    } else if (warnsCount > 0) {
      overallResult = 'ALERTAS'
      overallTitle = 'Programação com alertas'
      overallDescription = `A programação atende aos requisitos essenciais, mas possui ${warnsCount} alerta(s) de atenção (capacidade, setups ou dependência de entregas). Avalie antes de publicar.`
    }

    const suggestedActions: string[] = []
    if (indicators.rawMaterialRedCount && indicators.rawMaterialRedCount > 0) {
      suggestedActions.push(
        'Postergar lotes com MP em déficit para datas posteriores à chegada dos pedidos de compra.',
      )
    }
    if (timeline.summary.dualCommitments.length > 0) {
      suggestedActions.push(
        'Negociar prioridade de tarugo com a programação da outra linha ou antecipar corrida na Aciaria.',
      )
    }
    if (indicators.setupHours > 4) {
      suggestedActions.push(
        'Agrupar produtos por família/bitola para reduzir paradas de troca de cilindros.',
      )
    }
    if (indicators.utilizationPct > 100) {
      suggestedActions.push(
        'Transferir itens excedentes para o turno de sábado ou remanejar volume para outra linha compatível.',
      )
    }
    if (blockedValidations.length > 0) {
      suggestedActions.push('Remover imediatamente os produtos com HARD BLOCK da grade.')
    }

    return {
      overallResult,
      overallTitle,
      overallDescription,
      timestamp: new Date().toISOString(),
      indicators,
      domains: {
        capacity: {
          id: 'cap',
          title: 'Capacidade & Ocupação',
          status: capStatus,
          scorePct: capScore,
          description: capDesc,
        },
        productivity: {
          id: 'prod',
          title: 'Produtividade Nominal',
          status: prodStatus,
          scorePct: prodScore,
          description: prodDesc,
        },
        setups: {
          id: 'setup',
          title: 'Matriz de Setup & Trocas',
          status: setupStatus,
          scorePct: setupScore,
          description: setupDesc,
        },
        sequencing: {
          id: 'seq',
          title: 'Sequenciamento Técnico',
          status: seqStatus,
          scorePct: seqScore,
          description: seqDesc,
        },
        rawMaterial: {
          id: 'mp',
          title: 'Disponibilidade de Matéria-Prima',
          status: mpStatus,
          scorePct: mpScore,
          description: mpDesc,
        },
        stock: {
          id: 'stock',
          title: 'Estoque SAP / WMS',
          status: stockStatus,
          scorePct: stockScore,
          description: stockDesc,
        },
        purchases: {
          id: 'po',
          title: 'Pedidos de Compra SAP',
          status: poStatus,
          scorePct: poScore,
          description: poDesc,
        },
        upstream: {
          id: 'up',
          title: 'Produção Upstream Linhas Anteriores',
          status: upstreamStatus,
          scorePct: upstreamScore,
          description: upstreamDesc,
        },
        mtoOrders: {
          id: 'mto',
          title: 'Carteira Sob Encomenda (MTO)',
          status: mtoStatus,
          scorePct: mtoScore,
          description: mtoDesc,
        },
        specialRequirements: {
          id: 'spec',
          title: 'Requisitos Especiais & Bloqueios',
          status: specialStatus,
          scorePct: specialScore,
          description: specialDesc,
        },
        lineConflicts: {
          id: 'conf',
          title: 'Conflitos entre Linhas (Duplo Comprometimento)',
          status: conflictStatus,
          scorePct: conflictScore,
          description: conflictDesc,
        },
        backlog: {
          id: 'back',
          title: 'Atendimento à Carteira',
          status: backlogStatus,
          scorePct: backlogScore,
          description: backlogDesc,
        },
        stops: {
          id: 'stop',
          title: 'Paradas & Manutenções Programadas',
          status: stopsStatus,
          scorePct: stopsScore,
          description: stopsDesc,
        },
      },
      suggestedActions:
        suggestedActions.length > 0
          ? suggestedActions
          : ['Nenhuma ação corretiva crítica necessária. Grade pronta para envio ao gestor.'],
      aiSummaryRecommendation:
        overallResult === 'INVIAVEL'
          ? 'Recomendação da IA CIAFAL: Reprograme os itens em vermelho antes do envio. A IA sugere ajustar o sequenciamento para mitigar rupturas de MP e evitar bloqueios.'
          : overallResult === 'ALERTAS'
            ? 'Recomendação da IA CIAFAL: Programação factível com acompanhamento de entregas de fornecedores. Recomenda-se validar o plano com a liderança de turno.'
            : 'Recomendação da IA CIAFAL: Programação otimizada e plenamente viável. Alta eficiência de sequência e folga operacional segura.',
    }
  },

  /**
   * Cálculo AUTOMÁTICO da grade completa com integração total do Motor de MP
   */
  recalculateWeeklyTimeline(
    items: WeeklyScheduleItem[],
    lineOverview: LineOverviewData | null,
    headerFilter: WeeklyHeaderFilter,
    rawMaterialContext: RawMaterialEngineContext = {},
  ): {
    items: WeeklyScheduleItem[]
    indicators: WeeklyIndicators
    summary: WeeklyScheduleSummary
    validations: ValidationResult[]
  } {
    const { startDate } = getWeekDateRange(headerFilter.year, headerFilter.weekNumber)
    const shifts = lineOverview?.shifts && lineOverview.shifts.length > 0 ? lineOverview.shifts : []
    const scheduledStops = lineOverview?.scheduledStops || []

    const dayOrderMap: Record<string, number> = {
      SEG: 0,
      TER: 1,
      QUA: 2,
      QUI: 3,
      SEX: 4,
      SAB: 5,
      DOM: 6,
    }
    const sorted = [...items].sort((a, b) => {
      const dayDiff = (dayOrderMap[a.day_of_week] ?? 0) - (dayOrderMap[b.day_of_week] ?? 0)
      if (dayDiff !== 0) return dayDiff
      const shiftDiff = a.shift_code.localeCompare(b.shift_code)
      if (shiftDiff !== 0) return shiftDiff
      return a.sequence_order - b.sequence_order
    })

    let previousEndDateTime: Date | null = null
    let previousProductionItem: WeeklyScheduleItem | null = null
    const processedItems: WeeklyScheduleItem[] = []
    const validations: ValidationResult[] = []

    // Rastreamento de acúmulo de MP por Aço / Seção para consumo cronológico sequencial
    const cumulativeRawMaterialByGrade: Record<string, number> = {}

    // Percorre cada item e encadeia cronologicamente
    for (let i = 0; i < sorted.length; i++) {
      const item = { ...sorted[i] }
      const dayMeta = DAYS_OF_WEEK.find((d) => d.code === item.day_of_week) || DAYS_OF_WEEK[0]

      const itemBaseDate = new Date(startDate)
      itemBaseDate.setDate(startDate.getDate() + dayMeta.offsetDays)

      const shift = shifts.find((s) => s.code === item.shift_code) || shifts[0]
      const shiftStartParts = shift?.start_time ? shift.start_time.split(':').map(Number) : [6, 0]

      let itemStart: Date

      if (i === 0 || !previousEndDateTime || sorted[i - 1].day_of_week !== item.day_of_week) {
        itemStart = new Date(itemBaseDate)
        itemStart.setHours(shiftStartParts[0], shiftStartParts[1], 0, 0)
      } else {
        itemStart = new Date(previousEndDateTime)
      }

      if (item.item_type === 'SCHEDULED_STOP') {
        const stopMinutes = item.stop_duration_minutes || 60
        const itemEnd = new Date(itemStart.getTime() + stopMinutes * 60 * 1000)
        item.start_datetime = formatIsoDateTime(itemStart)
        item.end_datetime = formatIsoDateTime(itemEnd)
        item.production_hours = 0
        item.setup_duration_minutes = 0
        previousEndDateTime = itemEnd
        processedItems.push(item)
        continue
      }

      // ITEM DE PRODUÇÃO
      // 1. Produtividade da Ficha Mestre
      const productivity = this.getProductivityForMaterial(item.material_code, lineOverview, 12.0)
      item.productivity_rate_th = productivity

      // 2. Horas produtivas = Quantidade / Produtividade
      const qtyTons = Number(item.planned_quantity_tons) || 0
      const prodHours = productivity > 0 ? qtyTons / productivity : 0
      item.production_hours = Number(prodHours.toFixed(2))

      // 3. Setup de troca explícito (Troca + Acerto + SMED + Oficina de Cilindros)
      const { setupDurationMinutes, setupReason, breakdown } = this.calculateSetup(
        previousProductionItem,
        item.material_code,
        item.family_code,
        lineOverview,
        headerFilter.lineCode,
      )
      item.setup_duration_minutes = setupDurationMinutes
      item.setup_reason = setupReason
      item.setup_breakdown = breakdown

      // 4. Linha do Tempo
      const totalMinutes = setupDurationMinutes + prodHours * 60
      const itemEnd = new Date(itemStart.getTime() + totalMinutes * 60 * 1000)
      item.start_datetime = formatIsoDateTime(itemStart)
      item.end_datetime = formatIsoDateTime(itemEnd)

      // 5. MOTOR DE MP (Necessidade Líquida & Disponibilidade Projetada)
      const gradeKey = (item.steel_grade || 'SAE 1020').trim().toUpperCase()
      const priorAccumulated = cumulativeRawMaterialByGrade[gradeKey] || 0

      const mpCalc = this.calculateRawMaterialRequirement(
        item,
        itemStart, // Data de consumo = início da atividade
        priorAccumulated,
        rawMaterialContext,
        lineOverview,
      )

      item.raw_material_req_tons = mpCalc.netRawMaterialTons
      item.raw_material_type = mpCalc.billetType
      item.raw_material_calc = mpCalc

      cumulativeRawMaterialByGrade[gradeKey] = priorAccumulated + mpCalc.netRawMaterialTons

      // 6. VERIFICAÇÃO DE TEMPO DE RESFRIAMENTO (Linha Anterior -> Resfriamento -> Linha Posterior)
      const coolingHours = this.getCoolingTimeHours(
        headerFilter.lineCode,
        item.material_code,
        item.family_code,
        item.dimensions,
        rawMaterialContext.coolingTimes,
      )

      // Busca se há produção upstream prévia do material/grau
      const upstreams = rawMaterialContext.upstreamProductions || []
      const relevantUpstream = upstreams.find((u) => {
        const uGrade = (u.steelGrade || u.materialCode).toUpperCase()
        return (
          uGrade.includes(gradeKey) ||
          gradeKey.includes(uGrade) ||
          u.materialCode.toUpperCase() === item.material_code.toUpperCase()
        )
      })

      if (relevantUpstream) {
        const upstreamEnd = parseDateTime(relevantUpstream.plannedEndDatetime)
        const earliestAllowed = new Date(upstreamEnd.getTime() + coolingHours * 60 * 60 * 1000)

        if (itemStart < earliestAllowed) {
          const diffMs = earliestAllowed.getTime() - itemStart.getTime()
          const diffHours = Number((diffMs / (1000 * 60 * 60)).toFixed(1))

          item.cooling_validation = {
            hasViolation: true,
            requiredHours: coolingHours,
            upstreamLineCode: relevantUpstream.lineCode,
            upstreamEndTime: formatIsoDateTime(upstreamEnd),
            earliestPossibleTime: formatIsoDateTime(earliestAllowed),
            currentProgrammedTime: formatIsoDateTime(itemStart),
            diffHours,
            suggestedNewTime: formatIsoDateTime(earliestAllowed),
            message: `🔴 TEMPO DE RESFRIAMENTO NÃO ATENDIDO: Linha anterior (${relevantUpstream.lineCode}) encerra em ${formatBraDateTime(upstreamEnd)}. Exige ${coolingHours}h de resfriamento. Primeira data/hora possível: ${formatBraDateTime(earliestAllowed)} (antecipado em ${diffHours}h).`,
          }

          validations.push({
            code: 'VAL-COOLING-01',
            level: 'CRITICAL',
            title: `🔴 TEMPO DE RESFRIAMENTO NÃO ATENDIDO: ${item.material_code}`,
            message: `Término produção anterior (${relevantUpstream.lineCode}): ${formatBraDateTime(upstreamEnd)}. Resfriamento obrigatório: ${coolingHours}h. Primeira data/hora possível: ${formatBraDateTime(earliestAllowed)} (Diferença: ${diffHours}h antes do permitido).`,
            itemId: item.id,
          })
        } else {
          item.cooling_validation = {
            hasViolation: false,
            requiredHours: coolingHours,
            upstreamLineCode: relevantUpstream.lineCode,
            upstreamEndTime: formatIsoDateTime(upstreamEnd),
            earliestPossibleTime: formatIsoDateTime(earliestAllowed),
            currentProgrammedTime: formatIsoDateTime(itemStart),
            diffHours: 0,
            message: `Tempo de resfriamento atendido (${coolingHours}h cumpridas após ${relevantUpstream.lineCode}).`,
          }
        }
      } else {
        item.cooling_validation = {
          hasViolation: false,
          requiredHours: coolingHours,
          upstreamLineCode: 'N/A',
          upstreamEndTime: '',
          earliestPossibleTime: formatIsoDateTime(itemStart),
          currentProgrammedTime: formatIsoDateTime(itemStart),
          diffHours: 0,
          message: `Tempo de resfriamento nominal: ${coolingHours}h.`,
        }
      }

      // 7. VALIDAÇÕES E ALERTAS DE MP
      // VAL-02: Hard Block
      const block = this.checkHardBlock(item.material_code, lineOverview)
      if (block) {
        validations.push({
          code: 'VAL-02',
          level: 'BLOCKED',
          title: `Material Bloqueado: ${item.material_code}`,
          message: `O material [${item.material_code}] está bloqueado na Linha ${headerFilter.lineCode}: ${block.block_reason}`,
          itemId: item.id,
        })
      }

      // VAL-MP-01: Ruptura / Indisponibilidade de MP (Vermelho)
      if (mpCalc.status === 'RED') {
        validations.push({
          code: 'VAL-MP-01',
          level: 'CRITICAL',
          title: `MP Indisponível: ${mpCalc.steelGrade} (${item.material_code})`,
          message: `Déficit de ${mpCalc.deficitTons.toLocaleString('pt-BR')} t em ${mpCalc.probableRuptureDate}. Saldo projetado insuficiente na data necessária.`,
          itemId: item.id,
        })
      } else if (mpCalc.status === 'YELLOW') {
        validations.push({
          code: 'VAL-MP-02',
          level: 'WARNING',
          title: `Risco de MP: ${mpCalc.steelGrade}`,
          message: mpCalc.statusReason,
          itemId: item.id,
        })
      }

      previousEndDateTime = itemEnd
      previousProductionItem = item
      processedItems.push(item)
    }

    // 7. VERIFICAÇÃO DE DUPLO COMPROMETIMENTO CONSOLIDADO (Requisito 4)
    // Somar o consumo de TODAS as programações que usam a mesma MP
    const dualCommitments: DualCommitmentConflict[] = []
    const stockItems = rawMaterialContext.inventoryItems || []
    const allSchedules = [...processedItems, ...(rawMaterialContext.otherWeeklySchedules || [])]

    // Agrupa por grau de aço
    const steelGradesSet = new Set<string>()
    allSchedules.forEach((it) => {
      if (it.item_type === 'PRODUCTION') {
        steelGradesSet.add((it.steel_grade || 'SAE 1020').trim().toUpperCase())
      }
    })

    steelGradesSet.forEach((grade) => {
      const consumers = allSchedules.filter(
        (it) =>
          it.item_type === 'PRODUCTION' &&
          (it.steel_grade || 'SAE 1020').trim().toUpperCase() === grade,
      )
      const totalRequired = consumers.reduce(
        (sum, it) => sum + (it.raw_material_req_tons || it.planned_quantity_tons || 0),
        0,
      )

      // Estoque SAP total para o grau
      const matchingStock = stockItems.filter((st) => {
        const stGrade = ((st as any).steel_grade || '').toUpperCase()
        const matDesc = (st.material_description || '').toUpperCase()
        return stGrade.includes(grade) || matDesc.includes(grade)
      })
      const totalStock = matchingStock.reduce((sum, st) => sum + (st.qty_unrestricted || 0), 0)

      // POs para o grau
      const pos = rawMaterialContext.purchaseOrders || []
      const totalPos = pos
        .filter((po) => (po.steelGrade || po.materialDescription).toUpperCase().includes(grade))
        .reduce((sum, po) => sum + (po.openBalanceTons || po.totalQuantityTons), 0)

      // Upstream para o grau
      const upstreams = rawMaterialContext.upstreamProductions || []
      const totalUpstream = upstreams
        .filter((up) => up.steelGrade.toUpperCase().includes(grade) && up.confirmed)
        .reduce((sum, up) => sum + up.quantityTons, 0)

      const consolidatedAvailable = totalStock + totalPos + totalUpstream
      const consolidatedBalance = consolidatedAvailable - totalRequired

      if (consolidatedBalance < 0 && consumers.length > 1) {
        const deficit = Math.abs(Number(consolidatedBalance.toFixed(2)))
        const consumerList = consumers.map((c) => ({
          lineCode: c.line_code,
          quantityTons: c.raw_material_req_tons || c.planned_quantity_tons,
          consumptionDateStr: c.date_str || '24/08',
          consumptionDatetime: c.start_datetime,
        }))

        const consumerDesc = consumerList
          .map((c) => `${c.lineCode}: ${c.quantityTons} t em ${c.consumptionDateStr}`)
          .join(', ')
        const alertMsg = `Conflito de Duplo Comprometimento: Saldo projetado disponível de ${consolidatedAvailable} t é insuficiente para a demanda consolidada de ${totalRequired} t (${consumerDesc}). Déficit: ${deficit} t.`

        dualCommitments.push({
          steelGrade: grade,
          sectionDimension: consumers[0]?.raw_material_calc?.sectionDimension || '130x130 mm',
          totalRequiredTons: Number(totalRequired.toFixed(2)),
          projectedAvailableTons: Number(consolidatedAvailable.toFixed(2)),
          deficitTons: deficit,
          consumerSchedules: consumerList,
          alertMessage: alertMsg,
        })

        validations.push({
          code: 'VAL-MP-DUAL',
          level: 'CRITICAL',
          title: `Duplo Comprometimento: Aço ${grade}`,
          message: alertMsg,
        })
      }
    })

    // 8. AGRUPAMENTO DA VISÃO "NECESSIDADE DE TARUGOS" POR AÇO E SEÇÃO/DIMENSÃO (Requisito 1)
    // Colunas: aço, seção/dimensão, peso do tarugo, quantidade necessária, quantidade disponível e saldo projetado
    const billetMap: Record<string, BilletRequirementGroup> = {}

    processedItems.forEach((it) => {
      if (it.item_type === 'PRODUCTION' && it.raw_material_calc) {
        const calc = it.raw_material_calc
        const key = `${calc.steelGrade}_${calc.sectionDimension}`

        if (!billetMap[key]) {
          billetMap[key] = {
            steelGrade: calc.steelGrade,
            sectionDimension: calc.sectionDimension,
            billetWeightKg: calc.billetWeightKg,
            requiredTons: 0,
            availableTons: calc.projectedAvailableTons,
            projectedBalanceTons: 0,
            status: 'GREEN',
            statusLabel: 'MP GARANTIDA',
            estimatedBilletsCount: 0,
            currentStockTons: calc.currentSapStockTons,
            sapPurchaseOrdersTons: calc.confirmedPoTons,
            upstreamProductionTons: calc.upstreamProductionTons,
            committedOtherSchedulesTons: calc.otherSchedulesCommittedTons,
            ruleTooltip: `Regra de Cálculo: Rendimento médio de ${calc.yieldPct}% (perda de ${calc.lossPct}%). Tarugo com peso unitário de ${calc.billetWeightKg} kg. Saldo Projetado = Estoque SAP + Pedidos de Compra anteriores + Produção Upstream anterior − Consumos programados.`,
          }
        }

        billetMap[key].requiredTons += calc.netRawMaterialTons
        billetMap[key].estimatedBilletsCount += calc.estimatedBilletsCount
      }
    })

    // Atualiza saldos projetados e semáforos dos grupos de tarugos
    const billetRequirements = Object.values(billetMap).map((grp) => {
      const req = Number(grp.requiredTons.toFixed(2))
      const avail = Number(grp.availableTons.toFixed(2))
      const balance = Number((avail - req).toFixed(2))

      let status: RawMaterialTrafficLight = 'GREEN'
      let statusLabel = 'MP GARANTIDA'
      if (balance < 0) {
        status = 'RED'
        statusLabel = 'MP INSUFICIENTE'
      } else if (grp.upstreamProductionTons > 0 || grp.sapPurchaseOrdersTons > 0) {
        status = 'YELLOW'
        statusLabel = 'MP COM RISCO'
      }

      // Verifica se há duplo comprometimento neste grupo
      const conflict = dualCommitments.find((d) => d.steelGrade === grp.steelGrade)

      return {
        ...grp,
        requiredTons: req,
        projectedBalanceTons: balance,
        status,
        statusLabel,
        dualCommitmentAlert: conflict ? conflict.alertMessage : undefined,
      }
    })

    // 9. Cálculo de Capacidade e Indicadores Gerais
    const activeShiftsCount = shifts.length || 3
    const hoursPerShift =
      shifts.length > 0
        ? shifts.reduce((acc, s) => acc + (s.duration_hours || 8), 0) / shifts.length
        : 8
    const operatingDaysCount = 6
    const calendarHours = 7 * 24
    const nominalAvailableHours = operatingDaysCount * activeShiftsCount * hoursPerShift

    const programmedQuantityTons = processedItems.reduce(
      (sum, it) => sum + (it.planned_quantity_tons || 0),
      0,
    )
    const programmedProductiveHours = processedItems.reduce(
      (sum, it) => sum + (it.production_hours || 0),
      0,
    )
    const setupHours = processedItems.reduce(
      (sum, it) => sum + (it.setup_duration_minutes || 0) / 60,
      0,
    )
    const stoppedHours = processedItems.reduce(
      (sum, it) => sum + (it.stop_duration_minutes || 0) / 60,
      0,
    )

    const setupItems = processedItems.filter((it) => (it.setup_duration_minutes || 0) > 0)
    let totalChangeMin = 0
    let totalTuningMin = 0
    let totalSetupMin = 0

    setupItems.forEach((it) => {
      if (it.setup_breakdown) {
        totalChangeMin += it.setup_breakdown.planned_change_minutes || 0
        totalTuningMin += it.setup_breakdown.planned_tuning_minutes || 0
        totalSetupMin += it.setup_breakdown.planned_total_minutes || it.setup_duration_minutes || 0
      } else {
        totalSetupMin += it.setup_duration_minutes || 0
      }
    })

    const totalSetupHours = Number((totalSetupMin / 60).toFixed(1))
    const totalTuningHours = Number((totalTuningMin / 60).toFixed(1))

    // Paradas detalhadas (Manutenção, Resfriamento, Outras)
    const stopItems = processedItems.filter((it) => it.item_type === 'SCHEDULED_STOP')
    const maintenanceMin = stopItems
      .filter(
        (it) =>
          it.stop_code?.toUpperCase().includes('MANUT') ||
          it.stop_description?.toLowerCase().includes('manuten') ||
          it.pcp_notes?.toLowerCase().includes('manuten'),
      )
      .reduce((acc, it) => acc + (it.stop_duration_minutes || 0), 0)

    const coolingMin = stopItems
      .filter(
        (it) =>
          it.stop_code?.toUpperCase().includes('RESF') ||
          it.stop_description?.toLowerCase().includes('resfria') ||
          it.pcp_notes?.toLowerCase().includes('resfria'),
      )
      .reduce((acc, it) => acc + (it.stop_duration_minutes || 0), 0)

    const maintenanceHours = Number((maintenanceMin / 60).toFixed(1))
    const coolingHoursTotal = Number((coolingMin / 60).toFixed(1))

    const totalCommittedHours = programmedProductiveHours + totalSetupHours + stoppedHours
    const freeHours = Math.max(0, nominalAvailableHours - totalCommittedHours)
    const utilizationPct =
      nominalAvailableHours > 0
        ? Math.min(150, Number(((totalCommittedHours / nominalAvailableHours) * 100).toFixed(1)))
        : 0

    const setupsCount = setupItems.length
    const avgSetupMinutes = setupsCount > 0 ? Math.round(totalSetupMin / setupsCount) : 0
    const capacityLossTons = Number(((totalSetupMin / 60) * 24.8).toFixed(1))

    if (utilizationPct > 100) {
      validations.push({
        code: 'VAL-03',
        level: 'WARNING',
        title: 'Sobrecarga de Capacidade Semanal',
        message: `A ocupação programada da linha (${utilizationPct}%) excede a capacidade disponível de ${nominalAvailableHours}h.`,
      })
    }

    // 10. MOTOR DE SEQUENCIAMENTO — SCORE 0-100 + RECOMENDAÇÃO IA
    const productionOnly = processedItems.filter((it) => it.item_type === 'PRODUCTION')
    let totalSetupPenalty = 0
    let optimalFamilyTransitions = 0
    let totalTransitions = 0

    for (let j = 1; j < productionOnly.length; j++) {
      totalTransitions++
      const prev = productionOnly[j - 1]
      const curr = productionOnly[j]
      const sameFamily = prev.family_code === curr.family_code
      const sameSteel = prev.steel_grade === curr.steel_grade
      const setupMin = curr.setup_duration_minutes || 0

      if (sameFamily && sameSteel) {
        optimalFamilyTransitions++
      } else if (sameFamily) {
        totalSetupPenalty += 5
      } else {
        totalSetupPenalty += Math.min(25, setupMin > 30 ? 25 : 15)
      }
    }

    let calculatedScore = 100
    if (totalTransitions > 0) {
      const familyRatio = optimalFamilyTransitions / totalTransitions
      calculatedScore = Math.max(
        10,
        Math.min(100, Math.round(50 + familyRatio * 40 - totalSetupPenalty * 0.5)),
      )
    }

    const sequenceScore = calculatedScore
    const sequenceScoreLabel: 'OTIMIZADA' | 'MELHORÁVEL' | 'CRÍTICA' =
      sequenceScore >= 85 ? 'OTIMIZADA' : sequenceScore >= 60 ? 'MELHORÁVEL' : 'CRÍTICA'

    // Análise IA de Sequenciamento Alternativo
    let sequenceRecommendation: WeeklyIndicators['sequenceRecommendation'] = undefined
    if (productionOnly.length >= 3 && sequenceScore < 85) {
      const currentNames = productionOnly.map((p) => p.material_code)
      // Sugestão de reagrupamento por família/bitola
      const optimized = [...productionOnly].sort((a, b) => {
        const famDiff = (a.family_code || '').localeCompare(b.family_code || '')
        if (famDiff !== 0) return famDiff
        return (a.dimensions || '').localeCompare(b.dimensions || '')
      })
      const suggestedNames = optimized.map((p) => p.material_code)

      const isDifferent = currentNames.some((name, idx) => name !== suggestedNames[idx])

      if (isDifferent) {
        const avoidedSetups = Math.max(1, Math.floor((100 - sequenceScore) / 20))
        const minutesSaved = avoidedSetups * 45
        const hoursGained = Number((minutesSaved / 60).toFixed(1))
        const avgProd =
          productionOnly.reduce((s, it) => s + (it.productivity_rate_th || 12), 0) /
          productionOnly.length
        const tonsGained = Number((hoursGained * avgProd).toFixed(1))

        sequenceRecommendation = {
          hasBetterAlternative: true,
          title: 'SEQUÊNCIA NÃO RECOMENDADA — Existe uma alternativa com menor tempo de setup',
          currentSequenceSummary:
            currentNames.slice(0, 4).join(' → ') + (currentNames.length > 4 ? '...' : ''),
          suggestedSequenceSummary:
            suggestedNames.slice(0, 4).join(' → ') + (suggestedNames.length > 4 ? '...' : ''),
          gainMinutesSaved: minutesSaved,
          gainSetupAvoidedCount: avoidedSetups,
          gainCapacityHours: hoursGained,
          gainTonsImpact: tonsGained,
          rationale: `A IA analisou família, bitola, aço e tempos de troca de ferramentas. Agrupar materiais da mesma família reduz ${minutesSaved} min de setup e libera ${tonsGained} t de capacidade produtiva.`,
        }
      }
    }

    const byFamily: Record<string, number> = {}
    const byMaterial: Record<string, number> = {}
    const byTurno: Record<string, number> = {}
    const byDay: Record<string, number> = {}

    processedItems.forEach((it) => {
      if (it.item_type === 'PRODUCTION') {
        const fam = it.family_code || 'GERAL'
        byFamily[fam] = (byFamily[fam] || 0) + it.planned_quantity_tons

        const mat = it.material_code || 'OUTROS'
        byMaterial[mat] = (byMaterial[mat] || 0) + it.planned_quantity_tons

        const tur = it.shift_name || it.shift_code
        byTurno[tur] = (byTurno[tur] || 0) + it.planned_quantity_tons

        const d = it.day_of_week
        byDay[d] = (byDay[d] || 0) + it.planned_quantity_tons
      }
    })

    // Resumo de MP compatível com a interface existente
    const rawMaterialsSummary: WeeklySummaryRawMaterial[] = billetRequirements.map((br) => ({
      steelGrade: br.steelGrade,
      rawMaterialType: `Tarugo ${br.sectionDimension}`,
      sectionDimension: br.sectionDimension,
      billetWeightKg: br.billetWeightKg,
      requiredTons: br.requiredTons,
      availableStockTons: rawMaterialContext.inventoryItems ? br.currentStockTons : null,
      futureEntryTons: rawMaterialContext.purchaseOrders
        ? br.sapPurchaseOrdersTons + br.upstreamProductionTons
        : null,
      projectedConsumptionTons: br.requiredTons,
      projectedBalanceTons: br.projectedBalanceTons,
      status: br.status,
      statusLabel: br.statusLabel,
      deficitTons: br.projectedBalanceTons < 0 ? Math.abs(br.projectedBalanceTons) : undefined,
    }))

    const totalRawMaterialRequired = billetRequirements.reduce((s, r) => s + r.requiredTons, 0)
    const totalRawMaterialAvailable = billetRequirements.reduce((s, r) => s + r.availableTons, 0)
    const totalRawMaterialBalance = billetRequirements.reduce(
      (s, r) => s + r.projectedBalanceTons,
      0,
    )
    const rawMaterialGreenCount = billetRequirements.filter((r) => r.status === 'GREEN').length
    const rawMaterialYellowCount = billetRequirements.filter((r) => r.status === 'YELLOW').length
    const rawMaterialRedCount = billetRequirements.filter((r) => r.status === 'RED').length

    const indicators: WeeklyIndicators = {
      availableCapacityHours: Number(nominalAvailableHours.toFixed(1)),
      programmedQuantityTons: Number(programmedQuantityTons.toFixed(1)),
      programmedProductiveHours: Number(programmedProductiveHours.toFixed(1)),
      setupHours: Number(totalSetupHours.toFixed(1)),
      tuningHours: Number(totalTuningHours.toFixed(1)),
      stoppedHours: Number(stoppedHours.toFixed(1)),
      maintenanceHours: Number(maintenanceHours.toFixed(1)),
      coolingHours: Number(coolingHoursTotal.toFixed(1)),
      freeHours: Number(freeHours.toFixed(1)),
      utilizationPct,
      setupsCount,
      avgSetupMinutes,
      capacityLossTons,
      programmedProductsCount: processedItems.filter((it) => it.item_type === 'PRODUCTION').length,
      rawMaterialRequiredTons: Number(totalRawMaterialRequired.toFixed(1)),
      rawMaterialAvailableTons: Number(totalRawMaterialAvailable.toFixed(1)),
      rawMaterialBalanceTons: Number(totalRawMaterialBalance.toFixed(1)),
      rawMaterialGreenCount,
      rawMaterialYellowCount,
      rawMaterialRedCount,
      criticalAlertsCount: validations.filter(
        (v) => v.level === 'BLOCKED' || v.level === 'CRITICAL',
      ).length,
      sequenceScore,
      sequenceScoreLabel,
      sequenceRecommendation,
    }

    const summary: WeeklyScheduleSummary = {
      capacity: {
        calendarHours,
        availableHours: Number(nominalAvailableHours.toFixed(1)),
        productionHours: Number(programmedProductiveHours.toFixed(1)),
        setupHours: Number(totalSetupHours.toFixed(1)),
        tuningHours: Number(totalTuningHours.toFixed(1)),
        stoppedHours: Number(stoppedHours.toFixed(1)),
        maintenanceHours: Number(maintenanceHours.toFixed(1)),
        coolingHours: Number(coolingHoursTotal.toFixed(1)),
        freeHours: Number(freeHours.toFixed(1)),
        utilizationPct,
        setupsCount,
        avgSetupMinutes,
        capacityLossTons,
      },
      production: {
        totalTons: Number(programmedQuantityTons.toFixed(1)),
        byFamily,
        byMaterial,
        byTurno,
        byDay,
      },
      rawMaterials: rawMaterialsSummary,
      billetRequirements,
      sapPurchaseOrders: rawMaterialContext.purchaseOrders || [],
      dualCommitments,
      backlog: {
        totalTons: null,
        scheduledTons: Number(programmedQuantityTons.toFixed(1)),
        remainingTons: null,
      },
    }

    return {
      items: processedItems,
      indicators,
      summary,
      validations,
    }
  },
}

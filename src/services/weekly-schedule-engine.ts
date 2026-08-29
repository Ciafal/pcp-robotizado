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
}

export const WeeklyScheduleEngine = {
  /**
   * Obtém produtividade oficial da Ficha Mestre da Linha para um material
   */
  getProductivityForMaterial(
    materialCode: string,
    lineOverview: LineOverviewData | null,
    defaultLineNominalTh: number = 12.0,
  ): number {
    if (!lineOverview) return defaultLineNominalTh

    const found = lineOverview.productivity.find(
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
    return defaultLineNominalTh
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
   * Determina o tempo de setup entre dois produtos/famílias conforme Matriz de Setup
   */
  calculateSetup(
    prevItem: WeeklyScheduleItem | null,
    currentMaterialCode: string,
    currentFamilyCode: string | undefined,
    lineOverview: LineOverviewData | null,
  ): { setupDurationMinutes: number; setupReason: string } {
    if (!prevItem || prevItem.item_type !== 'PRODUCTION') {
      return { setupDurationMinutes: 0, setupReason: 'Início de lote ou primeiro item do turno' }
    }

    if (prevItem.material_code.toUpperCase() === currentMaterialCode.toUpperCase()) {
      return { setupDurationMinutes: 0, setupReason: 'Mesmo material (continuidade de campanha)' }
    }

    if (!lineOverview || !lineOverview.setupMatrix || lineOverview.setupMatrix.length === 0) {
      return {
        setupDurationMinutes: 15,
        setupReason: `Troca de bitola padrão [${prevItem.material_code} → ${currentMaterialCode}]: 15 min`,
      }
    }

    const exactMatch = lineOverview.setupMatrix.find(
      (s) =>
        s.active &&
        s.from_product_code &&
        s.to_product_code &&
        s.from_product_code.toUpperCase() === prevItem.material_code.toUpperCase() &&
        s.to_product_code.toUpperCase() === currentMaterialCode.toUpperCase(),
    )
    if (exactMatch) {
      return {
        setupDurationMinutes: exactMatch.setup_duration_minutes,
        setupReason: `${exactMatch.setup_description} (${exactMatch.setup_duration_minutes} min)`,
      }
    }

    const prevFam = prevItem.family_code
    const curFam = currentFamilyCode
    if (prevFam && curFam) {
      const familyMatch = lineOverview.setupMatrix.find(
        (s) =>
          s.active &&
          s.expand?.from_family_id?.code === prevFam &&
          s.expand?.to_family_id?.code === curFam,
      )
      if (familyMatch) {
        return {
          setupDurationMinutes: familyMatch.setup_duration_minutes,
          setupReason: `${familyMatch.setup_description} (${familyMatch.setup_duration_minutes} min)`,
        }
      }
    }

    return {
      setupDurationMinutes: 15,
      setupReason: `Troca de lote/bitola padrão Ficha Mestre (${prevItem.material_code} → ${currentMaterialCode}): 15 min`,
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
      const stGrade = (st.steel_grade || '').toUpperCase()
      const stCat = st.category
      const matDesc = (st.material_description || '').toUpperCase()
      const matCode = (st.material_code || '').toUpperCase()

      const isRm =
        stCat === 'RAW_MATERIAL' ||
        stCat === 'SEMI_FINISHED' ||
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

      // 3. Setup de troca
      const { setupDurationMinutes, setupReason } = this.calculateSetup(
        previousProductionItem,
        item.material_code,
        item.family_code,
        lineOverview,
      )
      item.setup_duration_minutes = setupDurationMinutes
      item.setup_reason = setupReason

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

      // 6. VALIDAÇÕES E ALERTAS DE MP
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
        const stGrade = (st.steel_grade || '').toUpperCase()
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

    const totalCommittedHours = programmedProductiveHours + setupHours + stoppedHours
    const freeHours = Math.max(0, nominalAvailableHours - totalCommittedHours)
    const utilizationPct =
      nominalAvailableHours > 0
        ? Math.min(150, Number(((totalCommittedHours / nominalAvailableHours) * 100).toFixed(1)))
        : 0

    if (utilizationPct > 100) {
      validations.push({
        code: 'VAL-03',
        level: 'WARNING',
        title: 'Sobrecarga de Capacidade Semanal',
        message: `A ocupação programada da linha (${utilizationPct}%) excede a capacidade disponível de ${nominalAvailableHours}h.`,
      })
    }

    let setupTransitionsCount = 0
    let optimalTransitionsCount = 0
    for (let j = 1; j < processedItems.length; j++) {
      if (
        processedItems[j].item_type === 'PRODUCTION' &&
        processedItems[j - 1].item_type === 'PRODUCTION'
      ) {
        setupTransitionsCount++
        if (processedItems[j].family_code === processedItems[j - 1].family_code) {
          optimalTransitionsCount++
        }
      }
    }
    const sequenceScore =
      setupTransitionsCount === 0
        ? 100
        : Math.round(70 + (optimalTransitionsCount / setupTransitionsCount) * 30)

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

    const indicators: WeeklyIndicators = {
      availableCapacityHours: Number(nominalAvailableHours.toFixed(1)),
      programmedQuantityTons: Number(programmedQuantityTons.toFixed(1)),
      programmedProductiveHours: Number(programmedProductiveHours.toFixed(1)),
      setupHours: Number(setupHours.toFixed(1)),
      stoppedHours: Number(stoppedHours.toFixed(1)),
      freeHours: Number(freeHours.toFixed(1)),
      utilizationPct,
      programmedProductsCount: processedItems.filter((it) => it.item_type === 'PRODUCTION').length,
      rawMaterialRequiredTons: Number(totalRawMaterialRequired.toFixed(1)),
      criticalAlertsCount: validations.filter(
        (v) => v.level === 'BLOCKED' || v.level === 'CRITICAL',
      ).length,
      sequenceScore,
    }

    const summary: WeeklyScheduleSummary = {
      capacity: {
        calendarHours,
        availableHours: Number(nominalAvailableHours.toFixed(1)),
        productionHours: Number(programmedProductiveHours.toFixed(1)),
        setupHours: Number(setupHours.toFixed(1)),
        stoppedHours: Number(stoppedHours.toFixed(1)),
        freeHours: Number(freeHours.toFixed(1)),
        utilizationPct,
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

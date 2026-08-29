import {
  WeeklyScheduleItem,
  WeeklyHeaderFilter,
  WeeklyIndicators,
  WeeklyScheduleSummary,
  ValidationResult,
  OfficialMaterialOption,
} from '@/types/weekly-schedule'
import {
  LineOverviewData,
  LineProductivityRate,
  LineBlockedProduct,
  LineSetupMatrix,
  ProductionShift,
  StandardScheduledStop,
} from '@/types/line-master'

/**
 * Utilitário determinístico de manipulação e cálculo de datas/horas
 */
export function formatIsoDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function parseDateTime(str: string): Date {
  // Trata formatos "YYYY-MM-DD HH:mm" ou ISO
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
  // Cálculo ISO da semana
  const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7)
  const dayOfWeek = simple.getDay()
  const ISOweekStart = new Date(simple)
  // Segunda-feira como início da semana (ISO)
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
      // Setup padrão se não houver matriz específica: 15 min
      return {
        setupDurationMinutes: 15,
        setupReason: `Troca de bitola padrão [${prevItem.material_code} → ${currentMaterialCode}]: 15 min`,
      }
    }

    // Busca exata por código de produto
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

    // Busca por família de produto
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

    // Default quando troca de material dentro da mesma família
    return {
      setupDurationMinutes: 15,
      setupReason: `Troca de lote/bitola padrão Ficha Mestre (${prevItem.material_code} → ${currentMaterialCode}): 15 min`,
    }
  },

  /**
   * Cálculo AUTOMÁTICO da grade: Início previsto, fim previsto, setup, encadeamento contínuo
   * Lógica INVERSA: Programador informa quantidade (t) -> Horas = Quantidade / Produtividade.
   */
  recalculateWeeklyTimeline(
    items: WeeklyScheduleItem[],
    lineOverview: LineOverviewData | null,
    headerFilter: WeeklyHeaderFilter,
  ): {
    items: WeeklyScheduleItem[]
    indicators: WeeklyIndicators
    summary: WeeklyScheduleSummary
    validations: ValidationResult[]
  } {
    const { startDate } = getWeekDateRange(headerFilter.year, headerFilter.weekNumber)
    const shifts = lineOverview?.shifts && lineOverview.shifts.length > 0 ? lineOverview.shifts : []
    const scheduledStops = lineOverview?.scheduledStops || []

    // Agrupa e ordena os itens cronologicamente por Dia -> Turno -> Sequência
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

    // Percorre cada item e encadeia cronologicamente
    for (let i = 0; i < sorted.length; i++) {
      const item = { ...sorted[i] }
      const dayMeta = DAYS_OF_WEEK.find((d) => d.code === item.day_of_week) || DAYS_OF_WEEK[0]

      // Data base para o dia corrente
      const itemBaseDate = new Date(startDate)
      itemBaseDate.setDate(startDate.getDate() + dayMeta.offsetDays)

      // Turno correspondente
      const shift = shifts.find((s) => s.code === item.shift_code) || shifts[0]
      const shiftStartParts = shift?.start_time ? shift.start_time.split(':').map(Number) : [6, 0]

      let itemStart: Date

      if (i === 0 || !previousEndDateTime || sorted[i - 1].day_of_week !== item.day_of_week) {
        // Primeiro item do dia: começa no início do turno do dia
        itemStart = new Date(itemBaseDate)
        itemStart.setHours(shiftStartParts[0], shiftStartParts[1], 0, 0)
      } else {
        // Encadeamento contínuo: o término de uma operação alimenta o início da próxima
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

      // 4. Necessidade de MP: 1 t produzida com rendimento nominal (aprox ~1.03t de MP ou 1:1)
      item.raw_material_req_tons = Number((qtyTons * 1.025).toFixed(2))
      item.raw_material_type = item.steel_grade
        ? `Tarugo / Bobina Aço ${item.steel_grade}`
        : 'Aço Comercial Gerdau/Aperam'

      // 5. Linha do Tempo: Duração total = Setup (minutos) + Produção (horas)
      const totalMinutes = setupDurationMinutes + prodHours * 60
      const itemEnd = new Date(itemStart.getTime() + totalMinutes * 60 * 1000)
      item.start_datetime = formatIsoDateTime(itemStart)
      item.end_datetime = formatIsoDateTime(itemEnd)

      // Validações determinísticas
      // VAL-01 / VAL-02: Hard Block
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

      previousEndDateTime = itemEnd
      previousProductionItem = item
      processedItems.push(item)
    }

    // Cálculo das Capacidades e Resumo da Semana
    // Turnos ativos e paradas programadas da linha
    const activeShiftsCount = shifts.length || 3
    const hoursPerShift =
      shifts.length > 0
        ? shifts.reduce((acc, s) => acc + (s.duration_hours || 8), 0) / shifts.length
        : 8
    const operatingDaysCount = 6 // CIAFAL opera Seg a Sab normalmente
    const calendarHours = 7 * 24 // 168h na semana
    const nominalAvailableHours = operatingDaysCount * activeShiftsCount * hoursPerShift // ex: 6 * 3 * 8 = 144h

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

    // VAL-03: Capacidade Excedida (>100%)
    if (utilizationPct > 100) {
      validations.push({
        code: 'VAL-03',
        level: 'WARNING',
        title: 'Sobrecarga de Capacidade Semanal',
        message: `A ocupação programada da linha (${utilizationPct}%) excede a capacidade disponível de ${nominalAvailableHours}h.`,
      })
    }

    // Score da Sequência (Baseado na minimização de setups e ordenação por bitola/família)
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

    // Agrupamentos para o Resumo
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

    // Necessidade de MP Consolidada
    const rawMaterialMap: Record<string, { grade: string; type: string; tons: number }> = {}
    processedItems.forEach((it) => {
      if (it.item_type === 'PRODUCTION') {
        const grade = it.steel_grade || 'SAE 1020'
        const key = `${grade}_${it.raw_material_type || 'TARUGO'}`
        if (!rawMaterialMap[key]) {
          rawMaterialMap[key] = {
            grade,
            type: it.raw_material_type || 'Tarugo de Laminação',
            tons: 0,
          }
        }
        rawMaterialMap[key].tons += it.raw_material_req_tons || 0
      }
    })

    const rawMaterialsSummary = Object.values(rawMaterialMap).map((rm) => ({
      steelGrade: rm.grade,
      rawMaterialType: rm.type,
      requiredTons: Number(rm.tons.toFixed(1)),
      availableStockTons: null, // "Aguardando dados do SAP/WMS" quando não integrado
      futureEntryTons: null,
      projectedConsumptionTons: Number(rm.tons.toFixed(1)),
      projectedBalanceTons: null,
    }))

    const totalRawMaterialRequired = Object.values(rawMaterialMap).reduce((s, r) => s + r.tons, 0)

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
      backlog: {
        totalTons: null, // Aguardando dados do SAP/WMS
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

/**
 * MOTOR DE EQUILÍBRIO DE ESTOQUE E COBERTURA CIAFAL
 * Fórmula:
 * Cobertura em Dias = (Estoque Atual + Produção Programada + Entradas Previstas - Carteira) / Consumo Diário Médio
 *
 * Regra:
 * - Comparar bitolas da mesma família com tolerância inicial de ±5 dias de cobertura.
 * - Ultrapassou tolerância → pedir justificativa, classificar desvio, aprovação conforme alçada.
 * - Identificar automaticamente: Ruptura (<0 dias), Excesso (>45 dias), Subprodução, Sobreprodução e Estoque Desbalanceado.
 */

export interface StockBalanceItem {
  materialCode: string
  description: string
  family: string
  line: string
  gaugeMm: number
  currentStockTons: number
  scheduledProductionTons: number
  plannedIncomingTons: number
  backlogTons: number
  averageDailyConsumptionTons: number // Faturamento diário médio
  abcClass?: 'A' | 'B' | 'C'
}

export interface StockBalanceItemResult extends StockBalanceItem {
  netProjectedStockTons: number
  coverageDays: number
  familyAverageCoverageDays: number
  deviationFromFamilyDays: number
  status: 'RUPTURA' | 'CRITICO' | 'EQUILIBRADO' | 'EXCESSO' | 'DESBALANCEADO'
  isDeviationAboveTolerance: boolean
  requiresJustification: boolean
  justificationRequiredReason?: string
  suggestedAction: 'PROGRAMAR_URGENTE' | 'AUMENTAR_LOTE' | 'REDUZIR_LOTE' | 'POSTERGAR' | 'MANTER'
}

export interface FamilyStockBalanceSummary {
  family: string
  line: string
  itemsCount: number
  totalStockTons: number
  totalBacklogTons: number
  familyAverageCoverageDays: number
  minCoverageDays: number
  maxCoverageDays: number
  coverageSpreadDays: number // max - min
  isFamilyBalanced: boolean // spread <= 10 dias (tolerância +-5)
  unbalancedItemsCount: number
  items: StockBalanceItemResult[]
}

export class StockBalanceEngine {
  public static readonly COVERAGE_TOLERANCE_DAYS = 5.0 // +-5 dias

  public static evaluateStockBalance(items: StockBalanceItem[]): {
    itemsResult: StockBalanceItemResult[]
    familiesSummary: FamilyStockBalanceSummary[]
    overallStatus: {
      totalItems: number
      ruptureCount: number
      excessCount: number
      desbalancedCount: number
    }
  } {
    if (!items || items.length === 0) {
      return {
        itemsResult: [],
        familiesSummary: [],
        overallStatus: { totalItems: 0, ruptureCount: 0, excessCount: 0, desbalancedCount: 0 },
      }
    }

    // 1. Cálculo preliminar de cobertura individual
    const preliminaryItems = items.map((item) => {
      const netProjected =
        item.currentStockTons +
        item.scheduledProductionTons +
        item.plannedIncomingTons -
        item.backlogTons
      const daily = item.averageDailyConsumptionTons > 0 ? item.averageDailyConsumptionTons : 1.0
      const coverage = netProjected / daily

      return {
        ...item,
        netProjectedStockTons: netProjected,
        coverageDays: coverage,
      }
    })

    // 2. Agrupar por família e calcular média da família
    const familyGroups: Record<string, typeof preliminaryItems> = {}
    preliminaryItems.forEach((item) => {
      const key = `${item.line}_${item.family}`
      if (!familyGroups[key]) familyGroups[key] = []
      familyGroups[key].push(item)
    })

    const familySummaries: Record<string, { avgCoverage: number; min: number; max: number }> = {}
    Object.keys(familyGroups).forEach((key) => {
      const group = familyGroups[key]
      const totalCoverage = group.reduce((sum, i) => sum + i.coverageDays, 0)
      const avg = totalCoverage / group.length
      const coverages = group.map((i) => i.coverageDays)
      familySummaries[key] = {
        avgCoverage: avg,
        min: Math.min(...coverages),
        max: Math.max(...coverages),
      }
    })

    // 3. Montar resultado completo por item
    let ruptureCount = 0
    let excessCount = 0
    let desbalancedCount = 0

    const itemsResult: StockBalanceItemResult[] = preliminaryItems.map((item) => {
      const key = `${item.line}_${item.family}`
      const famInfo = familySummaries[key]
      const deviation = item.coverageDays - famInfo.avgCoverage
      const isDeviationAboveTolerance = Math.abs(deviation) > this.COVERAGE_TOLERANCE_DAYS

      let status: StockBalanceItemResult['status'] = 'EQUILIBRADO'
      let suggestedAction: StockBalanceItemResult['suggestedAction'] = 'MANTER'
      let requiresJustification = false
      let justificationRequiredReason: string | undefined = undefined

      if (item.coverageDays < 0) {
        status = 'RUPTURA'
        suggestedAction = 'PROGRAMAR_URGENTE'
        requiresJustification = true
        justificationRequiredReason = `Ruptura projetada: Cobertura negativa de ${item.coverageDays.toFixed(1)} dias com demanda de carteira em aberto.`
        ruptureCount++
      } else if (item.coverageDays < 7) {
        status = 'CRITICO'
        suggestedAction = 'AUMENTAR_LOTE'
      } else if (item.coverageDays > 45) {
        status = 'EXCESSO'
        suggestedAction = 'POSTERGAR'
        requiresJustification = true
        justificationRequiredReason = `Excesso de estoque: Cobertura de ${item.coverageDays.toFixed(1)} dias (> 45 dias padrão CIAFAL).`
        excessCount++
      } else if (isDeviationAboveTolerance) {
        status = 'DESBALANCEADO'
        suggestedAction = deviation > 0 ? 'REDUZIR_LOTE' : 'AUMENTAR_LOTE'
        requiresJustification = true
        justificationRequiredReason = `Desbalanceamento de família: Desvio de ${deviation > 0 ? '+' : ''}${deviation.toFixed(1)} dias em relação à média da família (${famInfo.avgCoverage.toFixed(1)} dias). Tolerância máxima é ±5 dias.`
        desbalancedCount++
      }

      return {
        ...item,
        familyAverageCoverageDays: famInfo.avgCoverage,
        deviationFromFamilyDays: deviation,
        status,
        isDeviationAboveTolerance,
        requiresJustification,
        justificationRequiredReason,
        suggestedAction,
      }
    })

    // 4. Montar resumos por família
    const familiesSummary: FamilyStockBalanceSummary[] = Object.keys(familyGroups).map((key) => {
      const groupItems = itemsResult.filter((i) => `${i.line}_${i.family}` === key)
      const first = groupItems[0]
      const famInfo = familySummaries[key]
      const spread = famInfo.max - famInfo.min
      const unbalancedItems = groupItems.filter(
        (i) => i.isDeviationAboveTolerance || i.status === 'RUPTURA' || i.status === 'EXCESSO',
      )

      return {
        family: first.family,
        line: first.line,
        itemsCount: groupItems.length,
        totalStockTons: groupItems.reduce((s, i) => s + i.currentStockTons, 0),
        totalBacklogTons: groupItems.reduce((s, i) => s + i.backlogTons, 0),
        familyAverageCoverageDays: famInfo.avgCoverage,
        minCoverageDays: famInfo.min,
        maxCoverageDays: famInfo.max,
        coverageSpreadDays: spread,
        isFamilyBalanced: spread <= 10.0,
        unbalancedItemsCount: unbalancedItems.length,
        items: groupItems,
      }
    })

    return {
      itemsResult,
      familiesSummary,
      overallStatus: {
        totalItems: itemsResult.length,
        ruptureCount,
        excessCount,
        desbalancedCount,
      },
    }
  }
}

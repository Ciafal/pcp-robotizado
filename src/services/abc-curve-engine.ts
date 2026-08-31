/**
 * MOTOR DE CÁLCULO E GOVERNANÇA DA CURVA ABC CIAFAL
 * Avaliável por SKU / Linha / Família / Período.
 * Base: Faturamento Histórico (ou Tonelagem Faturada) e Participação Acumulada.
 * Faixas Padrão CIAFAL:
 * - Classe A: até ~80% da receita acumulada
 * - Classe B: dos 80% até ~95% (~15% da receita)
 * - Classe C: dos 95% até 100% (~5% da receita)
 *
 * Regra Crítica: Item Classe A não pode ter estoque projetado negativo antes do próximo ciclo.
 */

export interface ABCItemInput {
  sku: string
  description: string
  family: string
  line: string
  revenueHistoricalBrl: number
  volumeHistoricalTons: number
  currentStockTons?: number
  projectedStockTons?: number
  nextCycleDate?: string
}

export interface ABCClassificationResult {
  sku: string
  description: string
  family: string
  line: string
  revenueHistoricalBrl: number
  revenueSharePercent: number
  accumulatedRevenueSharePercent: number
  abcClass: 'A' | 'B' | 'C'
  isCriticalRiskA: boolean
  criticalRiskJustification?: string
  priorityScore: number // Score de prioridade para a IA Programadora
}

export interface ABCSummaryByLine {
  line: string
  totalRevenue: number
  countClassA: number
  countClassB: number
  countClassC: number
  revenueClassA: number
  revenueClassB: number
  revenueClassC: number
  items: ABCClassificationResult[]
}

export class ABCCurveEngine {
  /**
   * Calcula a Curva ABC oficial com base nos itens fornecidos.
   */
  public static calculateCurve(items: ABCItemInput[]): ABCClassificationResult[] {
    if (!items || items.length === 0) return []

    // 1. Ordena decrescente por receita
    const sorted = [...items].sort((a, b) => b.revenueHistoricalBrl - a.revenueHistoricalBrl)
    const totalRevenue = sorted.reduce((sum, item) => sum + (item.revenueHistoricalBrl || 0), 0)

    if (totalRevenue === 0) {
      return sorted.map((item) => ({
        sku: item.sku,
        description: item.description,
        family: item.family,
        line: item.line,
        revenueHistoricalBrl: 0,
        revenueSharePercent: 0,
        accumulatedRevenueSharePercent: 0,
        abcClass: 'C',
        isCriticalRiskA: false,
        priorityScore: 30,
      }))
    }

    let accumulatedRevenue = 0
    return sorted.map((item) => {
      accumulatedRevenue += item.revenueHistoricalBrl
      const share = (item.revenueHistoricalBrl / totalRevenue) * 100
      const accumulatedShare = (accumulatedRevenue / totalRevenue) * 100

      let abcClass: 'A' | 'B' | 'C' = 'C'
      let priorityScore = 40

      if (accumulatedShare <= 80.5) {
        abcClass = 'A'
        priorityScore = 95
      } else if (accumulatedShare <= 95.5) {
        abcClass = 'B'
        priorityScore = 70
      } else {
        abcClass = 'C'
        priorityScore = 40
      }

      // REGRA CRÍTICA: item classe A não pode ficar com estoque projetado negativo antes do próximo ciclo
      const isNegativeProjected =
        (item.projectedStockTons !== undefined && item.projectedStockTons < 0) ||
        (item.currentStockTons !== undefined && item.currentStockTons <= 0)

      const isCriticalRiskA = abcClass === 'A' && isNegativeProjected
      let criticalRiskJustification: string | undefined = undefined

      if (isCriticalRiskA) {
        criticalRiskJustification = `ALERTA CRÍTICO: Item Classe A (${item.sku}) representa ${share.toFixed(1)}% do faturamento e possui estoque projetado negativo (${item.projectedStockTons ?? item.currentStockTons} t). Risco direto de ruptura comercial.`
        priorityScore = 100 // Máxima prioridade de sequenciamento
      }

      return {
        sku: item.sku,
        description: item.description,
        family: item.family,
        line: item.line,
        revenueHistoricalBrl: item.revenueHistoricalBrl,
        revenueSharePercent: share,
        accumulatedRevenueSharePercent: accumulatedShare,
        abcClass,
        isCriticalRiskA,
        criticalRiskJustification,
        priorityScore,
      }
    })
  }

  /**
   * Consolida indicadores ABC por linha
   */
  public static summarizeByLine(items: ABCItemInput[]): Record<string, ABCSummaryByLine> {
    const classified = this.calculateCurve(items)
    const summary: Record<string, ABCSummaryByLine> = {}

    classified.forEach((item) => {
      if (!summary[item.line]) {
        summary[item.line] = {
          line: item.line,
          totalRevenue: 0,
          countClassA: 0,
          countClassB: 0,
          countClassC: 0,
          revenueClassA: 0,
          revenueClassB: 0,
          revenueClassC: 0,
          items: [],
        }
      }

      const s = summary[item.line]
      s.totalRevenue += item.revenueHistoricalBrl
      s.items.push(item)

      if (item.abcClass === 'A') {
        s.countClassA++
        s.revenueClassA += item.revenueHistoricalBrl
      } else if (item.abcClass === 'B') {
        s.countClassB++
        s.revenueClassB += item.revenueHistoricalBrl
      } else {
        s.countClassC++
        s.revenueClassC += item.revenueHistoricalBrl
      }
    })

    return summary
  }
}

import { describe, it, expect } from 'vitest'
import { MPSdcProjectionEngine } from '@/services/mp-sdc-projection-engine'
import { initialSdcPools } from '@/services/mp-sidercentro-service'

describe('MPSdcProjectionEngine — Matéria-Prima Sidercentro (SDC)', () => {
  it('1. Deve calcular corretamente o Estoque Total segregando DS03, DP04 Elegível e Sucata', () => {
    const result = MPSdcProjectionEngine.calculateTotalAvailableStock({
      stockSdcDs03: 105.7,
      stockCiafalDp04: 54.28,
      isCiafalEligible: true,
      stockKs: 10.0,
      isKsEligible: true,
      stockThinPlates: 5.0,
      stockUsableScrap: 15.9,
      validReceipts: 20.0,
    })

    expect(result.totalStockTons).toBe(210.88)
    expect(result.eligibleCiafalTons).toBe(54.28)
    expect(result.composition.ds03).toBe(105.7)
    expect(result.composition.usableScrap).toBe(15.9)
  })

  it('2. Não deve incluir estoque DP04 CIAFAL se não houver elegibilidade técnica autorizada', () => {
    const result = MPSdcProjectionEngine.calculateTotalAvailableStock({
      stockSdcDs03: 100.0,
      stockCiafalDp04: 50.0,
      isCiafalEligible: false, // Regra restrita
      stockKs: 0,
      isKsEligible: false,
      stockThinPlates: 0,
      stockUsableScrap: 0,
      validReceipts: 0,
    })

    expect(result.totalStockTons).toBe(100.0)
    expect(result.eligibleCiafalTons).toBe(0)
  })

  it('3. Deve calcular o Saldo Projetado na Semana N+1 (Saldo = Saldo Ant + L2 + Rec - Consumo)', () => {
    const balance = MPSdcProjectionEngine.calculateProjectedBalance({
      currentStock: 175.88,
      projectedL2Useful: 40.0,
      receipts: 20.0,
      programmedConsumption: 65.55,
    })

    expect(balance).toBe(170.33)
  })

  it('4. Deve calcular a Necessidade Líquida de MP (Demanda + Estoque Mínimo - Disponibilidade)', () => {
    // Caso com necessidade
    const need1 = MPSdcProjectionEngine.calculateMpNeed({
      demandHorizonTons: 200.0,
      minStockDesiredTons: 50.0,
      projectedAvailabilityTons: 180.0,
    })
    expect(need1.hasNeed).toBe(true)
    expect(need1.needTons).toBe(70.0)

    // Caso sem necessidade
    const need2 = MPSdcProjectionEngine.calculateMpNeed({
      demandHorizonTons: 100.0,
      minStockDesiredTons: 50.0,
      projectedAvailabilityTons: 180.0,
    })
    expect(need2.hasNeed).toBe(false)
    expect(need2.needTons).toBe(0)
  })

  it('5. Deve resolver Cobertura Dupla (Estatística e Cronológica) detectando Ruptura', () => {
    const coverage = MPSdcProjectionEngine.calculateDualCoverage({
      availableStockTons: 100.0,
      dailyAverageConsumption: 10.0,
      dailySchedule: [
        { dateStr: '2026-08-25', consumptionTons: 30.0 },
        { dateStr: '2026-08-26', consumptionTons: 40.0 },
        { dateStr: '2026-08-27', consumptionTons: 40.0 }, // Saldo atinge < 20 (est mín)
      ],
      minStockLimitTons: 20.0,
    })

    expect(coverage.statisticalDays).toBe(10)
    expect(coverage.isRupture).toBe(true)
    expect(coverage.chronologicalDate).toBe('2026-08-27')
  })

  it('6. Deve resolver Aços Compatíveis em Pools de MP (ex: POOL_AC_B)', () => {
    const poolRes = MPSdcProjectionEngine.resolveCompatiblePoolSteels(
      'POOL_AC_B',
      initialSdcPools,
      'AC',
    )

    expect(poolRes.primarySteel).toBe('AC')
    expect(poolRes.canSubstitute).toBe(true)
    expect(poolRes.alternativeSteels).toContain('Classe B')
  })

  it('7. Deve avaliar Aderência da Produção L2 cruzando com Saldo Real sem falso alarme', () => {
    const adherenceRes = MPSdcProjectionEngine.evaluateL2AdherenceRisk({
      plannedTons: 100.0,
      realizedTons: 83.3,
      currentStockTons: 300.0, // Alto estoque disponível
      dailyConsumptionTons: 10.0,
    })

    expect(adherenceRes.adherencePct).toBe(83.3)
    expect(adherenceRes.trafficLight).toBe('AMARELO')
    expect(adherenceRes.operationalRiskSummary).toContain('mitiga o risco de ruptura')
  })

  it('8. Deve fornecer explicabilidade de cálculo para auditoria operacional', () => {
    const explanation = MPSdcProjectionEngine.explainSdcCalculation('ESTOQUE_BASE_SDC', {
      ds03: 105.7,
      dp04: 54.28,
      ks: 10.0,
      sucata: 15.9,
      entradas: 0,
    })

    expect(explanation.title).toContain('Matriz de Estoque Base Sidercentro')
    expect(explanation.result).toBe(185.88)
    expect(explanation.stepByStep.length).toBeGreaterThanOrEqual(3)
  })

  it('9. Deve fornecer dados de homologação comparativa com a planilha legada com status CONFORME', () => {
    const legacyData = MPSdcProjectionEngine.getLegacyExcelSdcComparisonData()
    expect(legacyData.length).toBeGreaterThan(0)
    expect(legacyData.every((item) => item.status === 'CONFORME')).toBe(true)
  })
})

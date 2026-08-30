import { describe, it, expect } from 'vitest'
import { MPCentralProjectionEngine } from '@/services/mp-central-projection-engine'

describe('MPCentralProjectionEngine - CIAFAL Regras Oficiais de Matéria-Prima', () => {
  it('deve calcular a projeção de MP para SAE 1020 com dupla metodologia', () => {
    const result = MPCentralProjectionEngine.calculateSteelProjection(
      'SAE 1020',
      'TARUGO',
      {
        ks: 380.0,
        otherDepots: 276.4,
        slabs: 0,
        billets: 120.0,
        blooms: 536.4,
        otherShapes: 0,
        unrestricted: 610.4,
        quality: 46.0,
        blocked: 0,
      },
      {
        l1Tons: 195.0,
        l2Tons: 116.8,
        monthlyAverage: 368.3,
      },
      {
        confirmedReceipts: 120.0,
        transitOrders: 85.0,
        projectedL2Prod: 150.0,
        l2YieldFactor: 0.95,
      },
      {
        finishedStockTons: 920.0,
        finishedMonthlyDemand: 370.0,
      },
      [],
      80.0,
    )

    expect(result.steelGrade).toBe('SAE 1020')
    expect(result.totalAvailableTons).toBeGreaterThan(600)
    expect(result.excelCoverageDays).toBeGreaterThan(40)
    expect(result.dailyRuptureDays).toBeGreaterThan(0)
    expect(result.totalChainCoverageDays).toBeGreaterThan(100)
    expect(result.dataSourceInfo.isOfficial).toBe(true)
  })

  it('deve fornecer explicabilidade passo a passo para cálculo de Ruptura', () => {
    const payload = MPCentralProjectionEngine.explainCalculation('RUPTURA_MP', {
      totalAvailable: 656.4,
      confirmedReceipts: 120.0,
      programmedConsumption: 311.8,
      monthlyAverage: 368.3,
    })

    expect(payload.formula).toBeDefined()
    expect(payload.variables['Estoque Atual Disponível']).toBe('656.4 t')
    expect(payload.stepByStep.length).toBe(4)
    expect(payload.result).toBeGreaterThan(0)
  })

  it('deve validar homologação contra planilhas legadas Excel com zero divergências críticas', () => {
    const items = MPCentralProjectionEngine.getLegacyExcelComparisonData()
    expect(items.length).toBeGreaterThan(0)
    const criticalDiffs = items.filter((i) => i.status === 'DIVERGENCIA_CRITICA')
    expect(criticalDiffs.length).toBe(0)
  })

  it('deve classificar formas de material corretamente', () => {
    expect(MPCentralProjectionEngine.classifyShape('MP-PL-8620-80', 'PLACA')).toBe('PLACA')
    expect(MPCentralProjectionEngine.classifyShape('MP-PQ-1045', 'PALANQUILHA')).toBe('PALANQUILHA')
    expect(MPCentralProjectionEngine.classifyShape('MP-TG-1020-130', 'TARUGO 130X130')).toBe(
      'TARUGO',
    )
  })
})

import { describe, it, expect } from 'vitest'
import { MPIndustrializerEngine } from '../services/mp-industrializer-engine'

describe('MPIndustrializerEngine — Motor Operacional do Industrializador (Arcelor / L1)', () => {
  it('1. Deve calcular necessidade teórica com rendimento contratual de 93% (6.000 / 0.93 = 6.451,61 t)', () => {
    const result = MPIndustrializerEngine.calculateTheoreticalNeed(6000, 0.93)
    expect(result.theoreticalNeedTons).toBe(6451.61)
    expect(result.historicalReferenceTons).toBe(6420.0)
    expect(result.deltaExplanation).toContain('6.451,61')
  })

  it('2. Deve aplicar a regra TB-002 de compatibilidade dimensional de tarugos corretamente', () => {
    // Meta > 18.0 t/h -> Aceita 130x130 e 150x150
    const highProd = MPIndustrializerEngine.checkBilletCompatibility(22.5, 18.0)
    expect(highProd.canUse130).toBe(true)
    expect(highProd.canUse150).toBe(true)
    expect(highProd.ruleApplied).toContain('Elegível a Tarugo 130x130 ou 150x150')

    // Meta <= 18.0 t/h -> Restrito a 130x130
    const lowProd = MPIndustrializerEngine.checkBilletCompatibility(16.0, 18.0)
    expect(lowProd.canUse130).toBe(true)
    expect(lowProd.canUse150).toBe(false)
    expect(lowProd.ruleApplied).toContain('Restrito a Tarugo 130x130')
  })

  it('3. Deve recomendar alocação inteligente preservando tarugos 130x130 para produtos restritivos', () => {
    const orders = [
      { orderNumber: 'OF-01', productCode: 'BAR-16', productivityTh: 16.0, requiredTons: 100 }, // só 130
      { orderNumber: 'OF-02', productCode: 'BAR-22', productivityTh: 22.0, requiredTons: 100 }, // aceita 150
    ]
    const recommendations = MPIndustrializerEngine.recommendBilletAllocation(orders, 200, 150)
    expect(recommendations[0].recommendedBillet).toBe('130x130')
    expect(recommendations[1].recommendedBillet).toBe('150x150')
    expect(recommendations[1].savingsScarcityRisk).toBe(true)
  })

  it('4. Deve separar estoques físicos (DP07, DP18, DP20, Descarga) e trânsito no cálculo dimensional', () => {
    const inv = {
      dp18_whole_tons: 500,
      dp07_cut_ready_tons: 100,
      dp20_ks_pointed_tons: 50,
      awaiting_unloading_tons: 50,
      received_tons: 1000,
    }
    const transits: any[] = [
      { dimension_section: '130x130', quantity_tons: 200, status: 'EM_TRANSITO' },
    ]

    const summary = MPIndustrializerEngine.calculateDimensionSummary(
      '130x130',
      inv,
      transits,
      300, // semana
      800, // total
      3000,
    )

    expect(summary.total_physical_ciafal_tons).toBe(700) // 500+100+50+50
    expect(summary.in_transit_tons).toBe(200)
    expect(summary.physical_plus_transit_tons).toBe(900)
    expect(summary.projected_balance_tons).toBe(100) // 900 - 800
    expect(summary.status).toBe('AMARELO') // physical 700 < consumption 800, mas transit cobre
  })

  it('5. Deve identificar a primeira data, ordem e déficit de ruptura cronológica de MP', () => {
    const orders = [
      {
        date: '2026-03-02',
        week: 'W10',
        order_number: 'OF-100',
        product_code: 'P1',
        product_name: 'Produto 1',
        steel_grade: '1020',
        meta_productivity_th: 16.0,
        programmed_quantity_tons: 279.0, // 279 / 0.93 = 300 t
      },
      {
        date: '2026-03-03',
        week: 'W10',
        order_number: 'OF-101',
        product_code: 'P2',
        product_name: 'Produto 2',
        steel_grade: '1020',
        meta_productivity_th: 16.0,
        programmed_quantity_tons: 279.0, // 279 / 0.93 = 300 t -> déficit!
      },
    ]

    const result = MPIndustrializerEngine.projectChronologicalSchedule(
      orders,
      400, // initialStock130 (não dá para 600 t)
      100,
      [],
      0.93,
    )

    expect(result.firstRupture).toBeDefined()
    expect(result.firstRupture?.date).toBe('2026-03-03')
    expect(result.firstRupture?.order_number).toBe('OF-101')
    expect(result.firstRupture?.missing_tons).toBe(200)
    expect(result.rows[1].operational_status).toBe('FALTA_DE_MP')
  })

  it('6. Deve fornecer explicabilidade detalhada de cálculos passo a passo', () => {
    const explainYield = MPIndustrializerEngine.explainCellCalculation('RENDIMENTO_CONTRATUAL', {
      programmedProduction: 6000,
      yieldRate: 0.93,
    })
    expect(explainYield.title).toContain('Rendimento Metálico Contratual')
    expect(explainYield.result).toBe('6451.61')
    expect(explainYield.regulatoryStandardRef).toContain('Contrato de Industrialização')
  })
})

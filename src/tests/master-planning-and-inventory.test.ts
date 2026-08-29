import { describe, it, expect } from 'vitest'
import { DeterministicInventoryEngine } from '@/services/deterministic-inventory-engine'
import { DeterministicMasterPlanningEngine } from '@/services/deterministic-master-planning-engine'
import { InventoryItem, MasterPlanItem } from '@/types/master-planning-inventory'

describe('DeterministicInventoryEngine — Regras CIAFAL', () => {
  const mockMpItem: InventoryItem = {
    id: 'inv-001',
    plant_code: '1000',
    storage_location: '0001',
    material_code: 'MP-TARUGO-1020',
    material_description: 'Tarugo SAE 1020 150x150',
    category: 'RAW_MATERIAL',
    family_code: 'SAE 1020',
    batch_number: 'LT-2025-09',
    unit: 't',
    qty_unrestricted: 120,
    qty_blocked: 0,
    qty_in_quality: 10,
    qty_reserved: 0,
    qty_total: 130,
    min_stock: 40,
    source_mode: 'SAP',
    last_sync: '2025-03-01T08:00:00Z',
    consumer_line_code: 'L1',
  }

  it('deve projetar o estoque dia a dia e calcular a data de ruptura', () => {
    const projection = DeterministicInventoryEngine.calculateStockProjection(
      mockMpItem,
      'SCENARIO_A_APPROVED',
      30,
      new Date('2025-03-01'),
    )

    expect(projection.currentStockTons).toBe(120)
    expect(projection.timeline).toHaveLength(30)
    expect(projection.daysOfCoverage).toBeGreaterThan(0)
    expect(projection.averageDailyConsumptionTons).toBeGreaterThan(0)
    expect(projection.scenarioId).toBe('SCENARIO_A_APPROVED')
  })

  it('deve calcular a cobertura industrial integrada da cadeia de forma correta', () => {
    const items: InventoryItem[] = [
      mockMpItem,
      {
        ...mockMpItem,
        id: 'inv-002',
        category: 'SEMI_FINISHED',
        material_code: 'SEMI-BOB-1020',
        qty_unrestricted: 80,
      },
      {
        ...mockMpItem,
        id: 'inv-003',
        category: 'FINISHED_GOOD',
        material_code: 'ACAB-TUBO-1020',
        qty_unrestricted: 150,
      },
    ]

    const integrated = DeterministicInventoryEngine.calculateIntegratedCoverage(items)
    expect(integrated).toBeInstanceOf(Array)
    const sae1020 = integrated.find((i) => i.steelGrade === 'SAE 1020')
    expect(sae1020).toBeDefined()
    expect(sae1020?.totalChainCoverageDays).toBeGreaterThan(0)
  })
})

describe('DeterministicMasterPlanningEngine — Regras CIAFAL', () => {
  const mockPlanItems: MasterPlanItem[] = [
    {
      id: 'item-1',
      item_code: 'PMP-001',
      plan_code: 'PLAN-2025-03',
      product_code: 'PROD-A',
      product_name: 'Tubo Estrutural 100x100',
      family_code: 'TUBOS',
      steel_grade: 'SAE 1020',
      line_code: 'L1',
      plant_code: '1000',
      production_nature: 'PRODUCAO_PROPRIA',
      order_type: 'MTS',
      period_ref: '2025-03',
      planned_tons: 500,
      programmed_tons: 500,
      produced_tons: 500,
      firm_sales_tons: 480,
      crm_forecast_tons: 520,
      final_stock_tons: 20,
      adherence_volume_pct: 100,
      adherence_mix_pct: 100,
      adherence_temporal_pct: 100,
      gap_tons: 0,
      forecast_accuracy_pct: 95,
      forecast_bias_pct: 4,
    },
    {
      id: 'item-2',
      item_code: 'PMP-002',
      plan_code: 'PLAN-2025-03',
      product_code: 'PROD-B',
      product_name: 'Perfil U 200x50',
      family_code: 'PERFIS',
      steel_grade: 'SAE 1045',
      line_code: 'L2',
      plant_code: '1000',
      production_nature: 'PRODUCAO_PROPRIA',
      order_type: 'MTO',
      period_ref: '2025-03',
      planned_tons: 500,
      programmed_tons: 400,
      produced_tons: 0, // Não produziu nada de B
      firm_sales_tons: 450,
      crm_forecast_tons: 500,
      final_stock_tons: 0,
      adherence_volume_pct: 0,
      adherence_mix_pct: 0,
      adherence_temporal_pct: 0,
      gap_tons: 500,
      forecast_accuracy_pct: 0,
      forecast_bias_pct: 100,
    },
  ]

  it('NÃO deve permitir falsa aderência por volume quando o mix for desequilibrado (Regra 20)', () => {
    // Simula: Prod A produziu 1000t (planejado 500) e Prod B produziu 0t (planejado 500). Volume total é 1000t/1000t = 100%, mas Mix deve ser 50%
    const unbalancedItems: MasterPlanItem[] = [
      { ...mockPlanItems[0], planned_tons: 500, produced_tons: 1000 },
      { ...mockPlanItems[1], planned_tons: 500, produced_tons: 0 },
    ]

    const adherence = DeterministicMasterPlanningEngine.calculateAdherenceKPIs(unbalancedItems)

    expect(adherence.totalPlannedTons).toBe(1000)
    expect(adherence.totalProducedTons).toBe(1000)
    expect(adherence.adherenceVolumePct).toBe(100) // 100% de volume
    expect(adherence.adherenceMixPct).toBe(50) // 50% de mix! Prova que a regra 20 foi respeitada
    expect(adherence.adherenceOverallPct).toBeLessThan(100)
  })

  it('deve calcular Forecast Accuracy e Forecast Bias identificando Overplanning ou Underplanning', () => {
    const metrics = DeterministicMasterPlanningEngine.calculateForecastMetrics(mockPlanItems)
    expect(metrics.forecastAccuracyPct).toBeGreaterThanOrEqual(0)
    expect(metrics.forecastBiasPct).toBeDefined()
    expect(['POSITIVE_BIAS_OVERPLANNING', 'NEGATIVE_BIAS_UNDERPLANNING', 'BALANCED']).toContain(
      metrics.forecastBiasType,
    )
  })

  it('deve simular cenários "E Se?" (What-If) com impacto em MP, Semiacabados e Capacidade', () => {
    const simulation = DeterministicMasterPlanningEngine.runWhatIfSimulation(mockPlanItems, {
      crmOpportunitiesConversionChangePct: 15,
      salesVolumeChangePct: 20,
      keyCustomerPostponed: false,
      mpArrivalDelayDays: 5,
      lineCapacityLossPct: 10,
      forecastShiftPct: 0,
    })

    expect(simulation.simulatedDemandTons).toBeGreaterThan(0)
    expect(simulation.requiredMpTons).toBeGreaterThan(0)
    expect(simulation.feasibilityScorePct).toBeGreaterThan(0)
    expect(simulation.criticalBottlenecks.length).toBeGreaterThan(0)
  })
})

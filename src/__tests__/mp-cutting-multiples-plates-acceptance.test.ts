import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import type {
  MPCuttingOptimizationFilters,
  MPCuttingWeightStandard,
} from '@/types/mp-cutting-weight-standards'

// Mock do pocketbase para isolamento dos testes de motor
vi.mock('@/lib/pocketbase/client', () => ({
  pb: {
    collection: vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([]),
    })),
  },
  default: {
    collection: vi.fn(() => ({
      getFullList: vi.fn().mockResolvedValue([]),
    })),
  },
}))

describe('MPCuttingOptimizationEngineService — Plano de Corte para Múltiplos a partir de Placas', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Padrões de teste homologados pela engenharia CIAFAL
  const standardsHomologados: MPCuttingWeightStandard[] = [
    {
      code: 'PAD-BLOCO-1600',
      description: 'Bloco Padrão 1,600 t',
      cutting_type: 'MULTIPLOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['PLACA-1020'],
      target_weight_kg: 1600,
      min_weight_kg: 1550,
      max_weight_kg: 1650,
      priority: 'ALTA',
      start_date: '2026-01-01',
      status: 'ATIVO',
    },
    {
      code: 'PAD-BLOCO-1100',
      description: 'Bloco Padrão 1,100 t',
      cutting_type: 'MULTIPLOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['PLACA-1020'],
      target_weight_kg: 1100,
      min_weight_kg: 1050,
      max_weight_kg: 1150,
      priority: 'ALTA',
      start_date: '2026-01-01',
      status: 'ATIVO',
    },
  ]

  it('1. Exemplo homologado: Placa de 8,000 t sem perdas técnicas', async () => {
    // Forçar perda zero para validar estritamente o exemplo homologado
    vi.spyOn(mpCuttingOptimizationEngineService, 'getTechnicalParameters').mockResolvedValueOnce({
      material_code: 'PLACA-1020',
      center_code: 'SEML1',
      nominal_length_mm: 6000,
      gauge_dimension: 'Placa 200 × 1200 mm',
      density_kg_m3: 7850,
      linear_mass_kg_m: 1884,
      cutting_width_mm: 5.0,
      theoretical_loss_pct: 0, // sem perdas no caso homologado
      is_valid: true,
      missing_parameters: [],
    })

    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-1020',
      selected_standard_codes: [],
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      plate_gross_weight_tons: 8.0,
      allow_mixed_standards: true,
    }

    const simResult = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsHomologados,
      8.0,
    )

    expect(simResult.cutting_type).toBe('MULTIPLOS')
    expect(simResult.scenarios.length).toBe(6)

    // Cenário A: Padrão Único 1,600 t -> 5 blocos de 1,600 t = 8,000 t aproveitadas, sobra 0,000 t
    const scenA = simResult.scenarios.find((s) => s.id === 'SCENARIO_MULT_PURE_A')
    expect(scenA).toBeDefined()
    expect(scenA?.produced_quantity).toBe(5)
    expect(scenA?.used_weight_kg).toBe(8000)
    expect(scenA?.estimated_leftover_kg).toBe(0)
    expect(scenA?.yield_pct).toBe(100)

    // Cenário B: Padrão Único 1,100 t -> 7 blocos de 1,100 t = 7,700 t aproveitadas, sobra 0,300 t
    const scenB = simResult.scenarios.find((s) => s.id === 'SCENARIO_MULT_PURE_B')
    expect(scenB).toBeDefined()
    expect(scenB?.produced_quantity).toBe(7)
    expect(scenB?.used_weight_kg).toBe(7700)
    expect(scenB?.estimated_leftover_kg).toBe(300)
    expect(scenB?.yield_pct).toBe(96.25)

    // Cenário Misto: 3 blocos de 1,600 t (4,800 t) + 2 blocos de 1,100 t (2,200 t) = 7,000 t, sobra 1,000 t
    const mixedScens = simResult.scenarios.filter((s) => s.id.startsWith('SCENARIO_MULT_MIXED_'))
    expect(mixedScens.length).toBeGreaterThan(0)
    const comb3x2 = mixedScens.find(
      (s) =>
        s.composition.multiples_summary?.some(
          (m) => m.quantity === 3 && m.unit_weight_tons === 1.6,
        ) &&
        s.composition.multiples_summary?.some(
          (m) => m.quantity === 2 && m.unit_weight_tons === 1.1,
        ),
    )
    expect(comb3x2).toBeDefined()
    expect(comb3x2?.used_weight_kg).toBe(7000)
    expect(comb3x2?.estimated_leftover_kg).toBe(1000)

    // Recomendação: Cenário A tem maior aproveitamento (100% de rendimento)
    expect(simResult.best_scenario_id).toBe('SCENARIO_MULT_PURE_A')
  })

  it('2. Caso com perdas técnicas reais cadastradas: peso disponível = peso bruto - perdas', async () => {
    // Simular perda cadastrada de 2%
    vi.spyOn(mpCuttingOptimizationEngineService, 'getTechnicalParameters').mockResolvedValueOnce({
      material_code: 'PLACA-1020',
      center_code: 'SEML1',
      nominal_length_mm: 6000,
      gauge_dimension: 'Placa 200 × 1200 mm',
      density_kg_m3: 7850,
      linear_mass_kg_m: 1884,
      cutting_width_mm: 5.0,
      theoretical_loss_pct: 2.0, // 2% perda
      is_valid: true,
      missing_parameters: [],
    })

    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-1020',
      selected_standard_codes: [],
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      plate_gross_weight_tons: 8.0,
      allow_mixed_standards: true,
    }

    const simResult = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsHomologados,
      8.0,
    )

    // Perda técnica = 8,000 * 2% = 0,160 t (160 kg)
    // Peso útil disponível = 8,000 - 0,160 = 7,840 t (7840 kg)
    // Para 1,600 t: floor(7,840 / 1,600) = 4 blocos = 6,400 t (6400 kg)
    // Sobra = 7,840 - 6,400 = 1,440 t (1440 kg)
    const scenA = simResult.scenarios.find((s) => s.id === 'SCENARIO_MULT_PURE_A')
    expect(scenA).toBeDefined()
    expect(scenA?.produced_quantity).toBe(4)
    expect(scenA?.used_weight_kg).toBe(6400)
    expect(scenA?.cutting_loss_kg).toBe(160)
    expect(scenA?.estimated_leftover_kg).toBe(1440)

    // Balanço de massa estrito: 6400 + 160 + 1440 = 8000 kg (8,000 t)
    expect(
      (scenA?.used_weight_kg || 0) +
        (scenA?.cutting_loss_kg || 0) +
        (scenA?.estimated_leftover_kg || 0),
    ).toBe(8000)
  })

  it('3. Sobra nunca é bloco válido e quantidade N é estritamente inteira (sem fracionamento)', async () => {
    vi.spyOn(mpCuttingOptimizationEngineService, 'getTechnicalParameters').mockResolvedValueOnce({
      material_code: 'PLACA-1020',
      center_code: 'SEML1',
      nominal_length_mm: 6000,
      gauge_dimension: 'Placa 200 × 1200 mm',
      density_kg_m3: 7850,
      linear_mass_kg_m: 1884,
      cutting_width_mm: 5.0,
      theoretical_loss_pct: 0,
      is_valid: true,
      missing_parameters: [],
    })

    // Placa de 3,500 t para blocos de 1,600 t
    // floor(3,500 / 1,600) = 2 blocos (3,200 t), sobra 0,300 t
    // A sobra de 0,300 t NUNCA pode ser considerada bloco
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-1020',
      selected_standard_codes: [],
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      plate_gross_weight_tons: 3.5,
      allow_mixed_standards: false,
    }

    const simResult = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsHomologados,
      3.5,
    )

    const scenA = simResult.scenarios.find((s) => s.id === 'SCENARIO_MULT_PURE_A')
    expect(scenA?.produced_quantity).toBe(2)
    expect(scenA?.used_weight_kg).toBe(3200)
    expect(scenA?.estimated_leftover_kg).toBe(300)
    expect(Number.isInteger(scenA?.produced_quantity)).toBe(true)
  })

  it('4. Combinação mista bloqueada quando allow_mixed_standards === false', async () => {
    vi.spyOn(mpCuttingOptimizationEngineService, 'getTechnicalParameters').mockResolvedValueOnce({
      material_code: 'PLACA-1020',
      center_code: 'SEML1',
      nominal_length_mm: 6000,
      gauge_dimension: 'Placa 200 × 1200 mm',
      density_kg_m3: 7850,
      linear_mass_kg_m: 1884,
      cutting_width_mm: 5.0,
      theoretical_loss_pct: 0,
      is_valid: true,
      missing_parameters: [],
    })

    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-1020',
      selected_standard_codes: [],
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      plate_gross_weight_tons: 8.0,
      allow_mixed_standards: false, // Bloquear mistura
    }

    const simResult = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsHomologados,
      8.0,
    )

    const mixedBlocked = simResult.scenarios.find((s) => s.id === 'SCENARIO_MULT_MIXED_BLOCKED')
    expect(mixedBlocked).toBeDefined()
    expect(mixedBlocked?.status).toBe('INVIÁVEL')
    expect(mixedBlocked?.inviability_reason).toContain('desautorizada')
  })

  it('5. Exigir informação de peso da placa real quando não informado / indisponível', async () => {
    const filtersWithoutWeight: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-1020',
      selected_standard_codes: [],
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      plate_gross_weight_tons: undefined,
      required_weight_tons: undefined,
      selected_batch_available_stock: undefined,
    }

    await expect(
      mpCuttingOptimizationEngineService.generateComparativeScenarios(
        filtersWithoutWeight,
        standardsHomologados,
      ),
    ).rejects.toThrow(/Peso real da placa não informado ou indisponível/)
  })

  it('6. Regressão obrigatória: Tipo de corte BLOCOS permanece inalterado', async () => {
    const filtersBlocos: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'BLOCOS',
      material_code: 'TARUGO-130-1020',
      selected_standard_codes: [],
      optimization_criterion: 'MELHOR_EQUILIBRIO',
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
    }

    const simResult = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filtersBlocos,
      [],
    )

    expect(simResult.cutting_type).toBe('BLOCOS')
    expect(simResult.scenarios.length).toBe(6)
    // No modo blocos, os cenários oficiais 1 a 6 são mantidos
    expect(simResult.scenarios[0].id).toBe('SCENARIO_1_MAX_YIELD')
    expect(simResult.scenarios[0].composition.distribution[0].dimension_display).toMatch(
      /130 × 130 × \d+ mm/,
    )
  })

  it('7. Exclusão estrita de BOBINAS e GEOMETRIA e consumo de múltiplos BLOCOS ou PLACAS', async () => {
    vi.spyOn(mpCuttingOptimizationEngineService, 'getTechnicalParameters').mockResolvedValueOnce({
      material_code: 'PLACA-1020',
      center_code: 'SEML1',
      nominal_length_mm: 6000,
      gauge_dimension: 'Placa 200 × 1200 mm',
      density_kg_m3: 7850,
      linear_mass_kg_m: 1884,
      cutting_width_mm: 5.0,
      theoretical_loss_pct: 0,
      is_valid: true,
      missing_parameters: [],
    })

    const standardsMistos: MPCuttingWeightStandard[] = [
      {
        code: 'PAD-PLACA-1600',
        description: 'Placa Padrão 1,600 t',
        cutting_type: 'PLACAS', // Aceito
        company_code: 'CIAFAL',
        center_codes: ['SEML1'],
        material_codes: ['PLACA-1020'],
        target_weight_kg: 1600,
        min_weight_kg: 1550,
        max_weight_kg: 1650,
        priority: 'ALTA',
        start_date: '2026-01-01',
        status: 'ATIVO',
      },
      {
        code: 'PAD-BLOCO-1100',
        description: 'Bloco Complementar 1,100 t',
        cutting_type: 'BLOCOS', // Aceito
        company_code: 'CIAFAL',
        center_codes: ['SEML1'],
        material_codes: ['PLACA-1020'],
        target_weight_kg: 1100,
        min_weight_kg: 1050,
        max_weight_kg: 1150,
        priority: 'MEDIA',
        start_date: '2026-01-01',
        status: 'ATIVO',
      },
      {
        code: 'PAD-BOBINA-2000',
        description: 'Bobina Ativa 2,000 t',
        cutting_type: 'BOBINAS', // EXCLUÍDO
        company_code: 'CIAFAL',
        center_codes: ['SEML1'],
        material_codes: ['PLACA-1020'],
        target_weight_kg: 2000,
        min_weight_kg: 1950,
        max_weight_kg: 2050,
        priority: 'ALTA',
        start_date: '2026-01-01',
        status: 'ATIVO',
      },
      {
        code: 'PAD-GEOM-1500',
        description: 'Geometria Ativa 1,500 t',
        cutting_type: 'GEOMETRIA', // EXCLUÍDO
        company_code: 'CIAFAL',
        center_codes: ['SEML1'],
        material_codes: ['PLACA-1020'],
        target_weight_kg: 1500,
        min_weight_kg: 1450,
        max_weight_kg: 1550,
        priority: 'ALTA',
        start_date: '2026-01-01',
        status: 'ATIVO',
      },
      {
        code: 'PAD-GEOM-CORTE-1200',
        description: 'Geometria do Corte Ativa 1,200 t',
        cutting_type: 'GEOMETRIA_DO_CORTE', // EXCLUÍDO
        company_code: 'CIAFAL',
        center_codes: ['SEML1'],
        material_codes: ['PLACA-1020'],
        target_weight_kg: 1200,
        min_weight_kg: 1150,
        max_weight_kg: 1250,
        priority: 'ALTA',
        start_date: '2026-01-01',
        status: 'ATIVO',
      },
    ]

    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-1020',
      selected_standard_codes: ['PAD-PLACA-1600'],
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      plate_gross_weight_tons: 9.1,
      allow_mixed_standards: true,
    }

    const simResult = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsMistos,
      9.1,
    )

    // (a) Múltiplo PLACA como prioritário maximizado primeiro (5 placas de 1,600 t)
    // (b) Complementar BLOCO de 1,100 t preenche a sobra de 1,100 t exatamente
    const bestScen = simResult.scenarios.find((s) => s.id === simResult.best_scenario_id)
    expect(bestScen).toBeDefined()
    expect(bestScen?.used_weight_kg).toBe(9100)
    expect(bestScen?.estimated_leftover_kg).toBe(0)

    const summary = bestScen?.composition.multiples_summary || []
    const prioPlaca = summary.find((s) => s.standard_code === 'PAD-PLACA-1600')
    const compBloco = summary.find((s) => s.standard_code === 'PAD-BLOCO-1100')

    expect(prioPlaca).toBeDefined()
    expect(prioPlaca?.quantity).toBe(5)
    expect(prioPlaca?.classification).toBe('PRIORITARIO')

    expect(compBloco).toBeDefined()
    expect(compBloco?.quantity).toBe(1)
    expect(compBloco?.classification).toBe('COMPLEMENTAR')

    // (c) BOBINAS e GEOMETRIA NUNCA aparecem em nenhum cenário
    for (const scen of simResult.scenarios) {
      const scenSummary = scen.composition.multiples_summary || []
      expect(scenSummary.some((s) => s.standard_code === 'PAD-BOBINA-2000')).toBe(false)
      expect(scenSummary.some((s) => s.standard_code === 'PAD-GEOM-1500')).toBe(false)
      expect(scenSummary.some((s) => s.standard_code === 'PAD-GEOM-CORTE-1200')).toBe(false)
    }

    // (d) Balanço fechando: blocos + perdas + sobra = peso bruto/útil
    const usedKg = bestScen?.used_weight_kg || 0
    const lossKg = bestScen?.cutting_loss_kg || 0
    const leftoverKg = bestScen?.estimated_leftover_kg || 0
    expect(usedKg + lossKg + leftoverKg).toBe(9100)

    // (e) Rendimento nunca > 100%
    expect(bestScen?.yield_pct).toBe(100)
    for (const scen of simResult.scenarios) {
      expect(scen.yield_pct).toBeLessThanOrEqual(100)
    }
  })
})

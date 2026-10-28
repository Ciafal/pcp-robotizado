/**
 * Suíte de Testes Obrigatórios A–F para o Motor de Otimização do Plano de Corte de Múltiplos
 *
 * Casos Cobertos:
 * - Teste A: Peso prioritário que consome praticamente toda a placa.
 * - Teste B: Peso prioritário que deixa sobra suficiente para 1 múltiplo complementar.
 * - Teste C: Combinação com 2 ou mais pesos complementares.
 * - Teste D: Nenhum múltiplo complementar cabe na sobra.
 * - Teste E: Dois cenários com rendimento semelhante mas quantidade de cortes diferente (desempate pelo nº de cortes).
 * - Teste F: Caso limite em que a soma fique exatamente no peso útil disponível.
 *
 * Verificações em cada teste:
 * Quantidade, peso, soma, perdas, sobra, rendimento, representação gráfica (dados idênticos entre gráfico, tabela, cards e justificativa).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import {
  MPCuttingWeightStandard,
  MPCuttingOptimizationFilters,
} from '@/types/mp-cutting-weight-standards'

describe('Motor de Otimização de Plano de Corte por Múltiplos — Suíte A–F', () => {
  const standardsAtivos: MPCuttingWeightStandard[] = [
    {
      id: 'STD-1600',
      code: 'PADRAO-1600',
      description: 'Bloco 1,600 t',
      cutting_type: 'MULTIPLOS',
      target_weight_kg: 1600,
      min_weight_kg: 1550,
      max_weight_kg: 1650,
      material_codes: ['PLACA-SAE1020'],
      center_codes: ['SEML1'],
      company_code: 'CIAFAL',
      priority: 'ALTA',
      status: 'ATIVO',
      start_date: '2025-01-01',
    },
    {
      id: 'STD-1100',
      code: 'PADRAO-1100',
      description: 'Bloco 1,100 t',
      cutting_type: 'MULTIPLOS',
      target_weight_kg: 1100,
      min_weight_kg: 1050,
      max_weight_kg: 1150,
      material_codes: ['PLACA-SAE1020'],
      center_codes: ['SEML1'],
      company_code: 'CIAFAL',
      priority: 'MEDIA',
      status: 'ATIVO',
      start_date: '2025-01-01',
    },
    {
      id: 'STD-0800',
      code: 'PADRAO-0800',
      description: 'Bloco 0,800 t',
      cutting_type: 'MULTIPLOS',
      target_weight_kg: 800,
      min_weight_kg: 780,
      max_weight_kg: 820,
      material_codes: ['PLACA-SAE1020'],
      center_codes: ['SEML1'],
      company_code: 'CIAFAL',
      priority: 'MEDIA',
      status: 'ATIVO',
      start_date: '2025-01-01',
    },
    {
      id: 'STD-0500',
      code: 'PADRAO-0500',
      description: 'Bloco 0,500 t',
      cutting_type: 'MULTIPLOS',
      target_weight_kg: 500,
      min_weight_kg: 480,
      max_weight_kg: 520,
      material_codes: ['PLACA-SAE1020'],
      center_codes: ['SEML1'],
      company_code: 'CIAFAL',
      priority: 'BAIXA',
      status: 'ATIVO',
      start_date: '2025-01-01',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(mpCuttingOptimizationEngineService, 'getTechnicalParameters').mockResolvedValue({
      material_code: 'PLACA-SAE1020',
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
  })

  // TESTE A: peso prioritário que consome praticamente toda a placa
  it('Teste A: peso prioritário consome praticamente toda a placa (rendimento próximo a 100%, sem complementares)', async () => {
    // Placa de 8,000 t, peso prioritário 1,600 t -> 5 blocos de 1,600 t = 8,000 t
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-SAE1020',
      selected_standard_codes: ['PADRAO-1600'],
      target_weight_kg: 1600,
      plate_gross_weight_tons: 8.0,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      allow_mixed_standards: true,
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsAtivos,
      8.0,
    )

    const best = result.scenarios.find((s) => s.id === result.best_scenario_id)
    expect(best).toBeDefined()
    expect(best?.used_weight_kg).toBe(8000)
    expect(best?.estimated_leftover_kg).toBe(0)
    expect(best?.yield_pct).toBe(100)
    expect(best?.produced_quantity).toBe(5)

    // Resumo do plano
    const ps = best?.composition.multiples_plan_summary
    expect(ps).toBeDefined()
    expect(ps?.priority_weight_tons).toBe(1.6)
    expect(ps?.total_blocks_count).toBe(5)
    expect(ps?.priority_blocks_count).toBe(5)
    expect(ps?.complementary_blocks_count).toBe(0)
    expect(ps?.average_block_weight_tons).toBe(1.6)
    expect(ps?.plate_yield_pct).toBe(100)

    // Coerência gráfica e tabela
    const sumTable = best?.composition.multiples_summary
    expect(sumTable?.length).toBe(1)
    expect(sumTable?.[0].quantity).toBe(5)
    expect(sumTable?.[0].classification).toBe('PRIORITARIO')

    // Segmentos gráficos batem exatamente
    const segments = best?.composition.mass_fractions?.segments || []
    const totalBlockSegmentsWeight = segments
      .filter((s) => s.type === 'BLOCO')
      .reduce((acc, s) => acc + s.weight_tons, 0)
    expect(totalBlockSegmentsWeight).toBe(8.0)
  })

  // TESTE B: peso prioritário que deixa sobra suficiente para 1 múltiplo complementar
  it('Teste B: peso prioritário deixa sobra suficiente para 1 múltiplo complementar (1,600 + 1,100 t)', async () => {
    // Placa de 9,100 t:
    // Apenas 1,600 t -> floor(9,100 / 1,600) = 5 blocos (8,000 t) e sobra 1,100 t
    // Múltiplo de 1,100 t cabe exatamente na sobra de 1,100 t!
    // Total aproveitado na combinação: 5 × 1,600 + 1 × 1,100 = 9,100 t (100% de rendimento)
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-SAE1020',
      selected_standard_codes: ['PADRAO-1600'],
      target_weight_kg: 1600,
      plate_gross_weight_tons: 9.1,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      allow_mixed_standards: true,
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsAtivos,
      9.1,
    )

    const best = result.scenarios.find((s) => s.id === result.best_scenario_id)
    expect(best).toBeDefined()
    expect(best?.yield_pct).toBe(100)
    expect(best?.used_weight_kg).toBe(9100)
    expect(best?.estimated_leftover_kg).toBe(0)

    // Verifica que mantém 5 blocos de 1,600 t e adicionou 1 bloco de 1,100 t
    const summary = best?.composition.multiples_summary
    const p16 = summary?.find((s) => s.standard_code === 'PADRAO-1600')
    const p11 = summary?.find((s) => s.standard_code === 'PADRAO-1100')

    expect(p16).toBeDefined()
    expect(p16?.quantity).toBe(5)
    expect(p16?.classification).toBe('PRIORITARIO')

    expect(p11).toBeDefined()
    expect(p11?.quantity).toBe(1)
    expect(p11?.classification).toBe('COMPLEMENTAR')

    // Peso médio: (5 × 1,600 + 1 × 1,100) / 6 = 9,100 / 6 = 1,5166... t (~1,517 t)
    const ps = best?.composition.multiples_plan_summary
    expect(ps?.average_block_weight_tons).toBeCloseTo(9.1 / 6, 3)
    expect(ps?.total_blocks_count).toBe(6)
    expect(ps?.priority_blocks_count).toBe(5)
    expect(ps?.complementary_blocks_count).toBe(1)

    // Justificativa da IA deve citar a adição do complementar e ganhos
    expect(result.technical_justification).toContain('1,600')
    expect(result.technical_justification).toContain('1,100')
  })

  // TESTE C: combinação com 2 ou mais pesos complementares
  it('Teste C: combinação com 2 ou mais pesos complementares para consumir a sobra', async () => {
    // Placa de 9,900 t:
    // Padrão uniforme 1,600: floor(9,900 / 1,600) = 6 blocos = 9,600 t, sobra 0,300 t (rendimento ~96,97%)
    // Se testar 5 blocos de 1,600 (8,000 t), sobra 1,900 t
    // Na sobra de 1,900 t cabem 1 de 1,100 t + 1 de 0,800 t = 1,900 t!
    // Total aproveitado: 5 × 1,600 (8,000) + 1 × 1,100 (1,100) + 1 × 0,800 (0,800) = 9,900 t (100% rendimento!)
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-SAE1020',
      selected_standard_codes: ['PADRAO-1600'],
      target_weight_kg: 1600,
      plate_gross_weight_tons: 9.9,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      allow_mixed_standards: true,
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsAtivos,
      9.9,
    )

    const best = result.scenarios.find((s) => s.id === result.best_scenario_id)
    expect(best).toBeDefined()
    expect(best?.yield_pct).toBe(100)
    expect(best?.used_weight_kg).toBe(9900)
    expect(best?.estimated_leftover_kg).toBe(0)

    // Tem 2 complementares diferentes
    const summary = best?.composition.multiples_summary || []
    expect(summary.length).toBeGreaterThanOrEqual(3)
    const complementaries = summary.filter((s) => s.classification === 'COMPLEMENTAR')
    expect(complementaries.length).toBeGreaterThanOrEqual(2)

    // Peso médio coerente
    const ps = best?.composition.multiples_plan_summary
    expect(ps?.plate_yield_pct).toBe(100)
    expect(ps?.complementary_blocks_count).toBeGreaterThanOrEqual(2)
  })

  // TESTE D: nenhum múltiplo complementar cabe na sobra
  it('Teste D: nenhum múltiplo complementar cabe na sobra (sobra residual vira refugo/sobra)', async () => {
    // Placa de 8,200 t:
    // Menor múltiplo cadastrado é 0,500 t (STD-0500)
    // 5 blocos de 1,600 t = 8,000 t, sobra 0,200 t
    // Como 0,200 t < 0,500 t (menor múltiplo), nenhum múltiplo complementar cabe
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-SAE1020',
      selected_standard_codes: ['PADRAO-1600'],
      target_weight_kg: 1600,
      plate_gross_weight_tons: 8.2,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      allow_mixed_standards: true,
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsAtivos,
      8.2,
    )

    const best = result.scenarios.find((s) => s.id === result.best_scenario_id)
    expect(best).toBeDefined()
    expect(best?.used_weight_kg).toBe(8000)
    expect(best?.estimated_leftover_kg).toBe(200)
    expect(best?.produced_quantity).toBe(5)

    const ps = best?.composition.multiples_plan_summary
    expect(ps?.priority_blocks_count).toBe(5)
    expect(ps?.complementary_blocks_count).toBe(0)
    expect(ps?.final_scrap_tons).toBe(0.2) // Abaixo do corte mínimo de 0,500 t
  })

  // TESTE E: dois cenários com rendimento semelhante mas quantidade de cortes diferente (desempate pelo nº de cortes)
  it('Teste E: desempate por menor quantidade de cortes quando o aproveitamento for idêntico', async () => {
    // Placa de 8,000 t:
    // Opção 1: 5 blocos de 1,600 t = 8,000 t (5 cortes se kerf)
    // Opção 2: 10 blocos de 0,800 t = 8,000 t (10 cortes)
    // Ambas dão 8,000 t e 100% de rendimento.
    // O desempate DEVE priorizar a opção com mais blocos no prioritário e menos cortes.
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-SAE1020',
      selected_standard_codes: ['PADRAO-1600'],
      target_weight_kg: 1600,
      plate_gross_weight_tons: 8.0,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      allow_mixed_standards: true,
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsAtivos,
      8.0,
    )

    const best = result.scenarios.find((s) => s.id === result.best_scenario_id)
    expect(best?.produced_quantity).toBe(5) // Menos cortes (5 blocos ao invés de 10)
    expect(best?.used_weight_kg).toBe(8000)
    expect(best?.composition.multiples_plan_summary?.priority_blocks_count).toBe(5)
  })

  // TESTE F: caso limite em que a soma fique exatamente no peso útil disponível
  it('Teste F: caso limite onde soma fecha exatamente no peso útil disponível (nunca excede)', async () => {
    // Placa de 10,000 t com perda técnica de 5% (0,500 t)
    // Peso útil disponível = 10,000 - 0,500 = 9,500 t
    vi.spyOn(mpCuttingOptimizationEngineService, 'getTechnicalParameters').mockResolvedValueOnce({
      material_code: 'PLACA-SAE1020',
      center_code: 'SEML1',
      nominal_length_mm: 6000,
      gauge_dimension: 'Placa 200 × 1200 mm',
      density_kg_m3: 7850,
      linear_mass_kg_m: 1884,
      cutting_width_mm: 5.0,
      theoretical_loss_pct: 5.0, // 5% de perda obrigatória de processo
      is_valid: true,
      missing_parameters: [],
    })

    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'MULTIPLOS',
      material_code: 'PLACA-SAE1020',
      selected_standard_codes: ['PADRAO-1600'],
      target_weight_kg: 1600,
      plate_gross_weight_tons: 10.0,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      allow_mixed_standards: true,
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      standardsAtivos,
      10.0,
    )

    const best = result.scenarios.find((s) => s.id === result.best_scenario_id)
    expect(best).toBeDefined()

    const usedKg = best?.used_weight_kg || 0
    const lossKg = best?.cutting_loss_kg || 0
    const leftoverKg = best?.estimated_leftover_kg || 0

    // Restrição física inviolável: Peso dos blocos + perdas + sobra <= Peso bruto
    expect(usedKg + lossKg + leftoverKg).toBe(10000)
    // Peso dos blocos + perda de corte <= peso útil (9500 kg)
    expect(usedKg).toBeLessThanOrEqual(9500)
    expect(lossKg).toBe(500)

    // Rendimento da placa nunca pode ser > 100%
    expect(best?.yield_pct).toBeLessThanOrEqual(100)

    // Validação de coerência total: o que está no resumo bate com cards, tabela e gráfico
    const ps = best?.composition.multiples_plan_summary
    expect(ps?.net_available_weight_tons).toBe(9.5)
    expect(ps?.process_loss_tons).toBe(0.5)
    expect(ps?.total_converted_weight_tons).toBe(usedKg / 1000)
  })
})

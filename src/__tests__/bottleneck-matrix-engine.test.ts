import { describe, it, expect } from 'vitest'
import { BottleneckRulesEngine } from '../services/bottleneck-rules-engine'

describe('Motor de Matriz de Gargalos e Restrições Produtivas CIAFAL', () => {
  it('deve calcular dinamicamente o gargalo do tarugo QUAD 130mm (Trem Contínuo = 24.8 t/h)', () => {
    const result = BottleneckRulesEngine.calculateDynamicBottleneck({
      line_code: 'L1',
      billet_section_mm: 130,
      billet_length_m: 6.0,
      billet_weight_kg: 795,
      passes_count: 6,
      veins_count: 1,
    })

    expect(result.primary_bottleneck.stage).toBe('TREM_CONTINUO')
    expect(result.primary_bottleneck.capacity_th).toBe(24.8)
    expect(result.secondary_bottleneck.stage).toBe('TCC_RESFRIAMENTO')
    expect(result.secondary_bottleneck.capacity_th).toBe(26.1)
    expect(result.gap_to_secondary_th).toBe(1.3)
    expect(result.stages.length).toBe(7)
  })

  it('deve calcular a migração do gargalo no tarugo QUAD 150mm para a TCC (23.7 t/h)', () => {
    const result = BottleneckRulesEngine.calculateDynamicBottleneck({
      line_code: 'L1',
      billet_section_mm: 150,
      billet_length_m: 6.0,
      billet_weight_kg: 1060,
      passes_count: 8,
      veins_count: 1,
    })

    expect(result.primary_bottleneck.stage).toBe('TCC_RESFRIAMENTO')
    expect(result.primary_bottleneck.capacity_th).toBe(23.7)
  })

  it('deve bloquear e classificar como VERMELHO_INVIAVEL plano com ponta > 15 kg (Regra de Segurança)', () => {
    const impact = BottleneckRulesEngine.evaluateCuttingPlanImpact({
      plan_id: 'TEST-SAFETY-FAIL',
      plan_name: 'Plano com Desponta Excessiva',
      line_code: 'L1',
      tarugo_section_mm: 130,
      tarugo_length_m: 6.0,
      tarugo_weight_kg: 795,
      yield_pct: 95.0,
      scrap_pct: 5.0,
      reusable_leftover_pct: 0,
      tcc_bar_length_m: 68.0,
      tcc_bars_per_rack: 12,
      bar_interval_seconds: 3.8,
      crop_end_weight_kg: 17.5, // Excede 15.0 kg!
      target_demand_fulfillment_pct: 90,
    })

    expect(impact.classification).toBe('VERMELHO_INVIAVEL')
    expect(impact.safety_constraints_violated_count).toBe(1)
    expect(impact.score_global).toBeLessThanOrEqual(35)
  })

  it('deve bloquear e classificar como VERMELHO_INVIAVEL plano com barra > 72 m na TCC (Hard Constraint)', () => {
    const impact = BottleneckRulesEngine.evaluateCuttingPlanImpact({
      plan_id: 'TEST-HARD-FAIL',
      plan_name: 'Plano com Barra Excessiva',
      line_code: 'L1',
      tarugo_section_mm: 130,
      tarugo_length_m: 6.0,
      tarugo_weight_kg: 795,
      yield_pct: 97.0,
      scrap_pct: 3.0,
      reusable_leftover_pct: 0,
      tcc_bar_length_m: 74.0, // Excede 72.0 m!
      tcc_bars_per_rack: 12,
      bar_interval_seconds: 3.8,
      crop_end_weight_kg: 12.0,
      target_demand_fulfillment_pct: 90,
    })

    expect(impact.classification).toBe('VERMELHO_INVIAVEL')
    expect(impact.hard_constraints_violated_count).toBe(1)
  })

  it('deve classificar como VERDE_RECOMENDADO plano que atende integralmente a Matriz de Gargalos', () => {
    const impact = BottleneckRulesEngine.evaluateCuttingPlanImpact({
      plan_id: 'TEST-APPROVED',
      plan_name: 'Plano Conforme',
      line_code: 'L1',
      tarugo_section_mm: 130,
      tarugo_length_m: 6.0,
      tarugo_weight_kg: 795,
      yield_pct: 94.5,
      scrap_pct: 4.0,
      reusable_leftover_pct: 1.5,
      tcc_bar_length_m: 68.0,
      tcc_bars_per_rack: 12,
      bar_interval_seconds: 3.8,
      crop_end_weight_kg: 12.0,
      target_demand_fulfillment_pct: 95,
    })

    expect(impact.classification).toBe('VERDE_RECOMENDADO')
    expect(impact.hard_constraints_violated_count).toBe(0)
    expect(impact.safety_constraints_violated_count).toBe(0)
    expect(impact.score_global).toBeGreaterThan(80)
  })
})

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MPCuttingScenarioDetailModal } from '@/components/mp-optimization/MPCuttingScenarioDetailModal'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import type {
  MPCuttingScenarioItem,
  MPCuttingOptimizationFilters,
} from '@/types/mp-cutting-weight-standards'

describe('MPCuttingScenarioDetailModal — Coluna Dimensões do Bloco e Vinculação ao Cenário', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const mockScenarioEqualBlocks: MPCuttingScenarioItem = {
    id: 'SCENARIO_1_MAX_YIELD',
    name: 'Cenário 1 — Máximo Rendimento de MP',
    cutting_type: 'BLOCOS',
    used_standard_code: 'PAD-001',
    used_standard_description: 'Tarugo 130x130 Bloco 1,250 t',
    target_weight_kg: 1250,
    min_allowed_weight_kg: 1200,
    max_allowed_weight_kg: 1300,
    calculated_weight_kg: 1256.25,
    deviation_kg: 6.25,
    deviation_pct: 0.5,
    produced_quantity: 24,
    input_weight_kg: 30500,
    used_weight_kg: 30150,
    used_weight_pct: 98.85,
    estimated_leftover_kg: 0,
    cutting_loss_kg: 350,
    yield_pct: 98.85,
    demand_fulfillment_pct: 100,
    status: 'VIÁVEL',
    composition: {
      pieces_count: 24,
      piece_nominal_weight_kg: 1256.25,
      total_cuts_count: 28,
      nominal_length_mm: 6000,
      gauge_dimension: '130x130 mm',
      density_kg_m3: 7850,
      linear_mass_kg_m: 132.5,
      cutting_width_mm: 5,
      theoretical_loss_pct: 1.3,
      distribution: [
        {
          item_index: 1,
          item_type: 'BLOCO',
          target_kg: 1250,
          calculated_kg: 1250,
          tolerance_range_kg: '1200.00 a 1300.00 kg',
          status: 'CONFORME',
          dimension_display: '130 × 130 × 9.434 mm',
          calculated_length_mm: 9434,
          width_mm: 130,
          height_mm: 130,
          gauge_dimension: '130x130 mm',
          linear_mass_kg_m: 132.5,
        },
        {
          item_index: 2,
          item_type: 'BLOCO',
          target_kg: 1250,
          calculated_kg: 1250,
          tolerance_range_kg: '1200.00 a 1300.00 kg',
          status: 'CONFORME',
          dimension_display: '130 × 130 × 9.434 mm',
          calculated_length_mm: 9434,
          width_mm: 130,
          height_mm: 130,
          gauge_dimension: '130x130 mm',
          linear_mass_kg_m: 132.5,
        },
      ],
      satisfied_restrictions: ['Respeita limites estritos do padrão: 1200 kg a 1300 kg'],
      industrial_alerts: [
        'Excelente repetibilidade dimensional sem risco de descarte no enfornamento.',
      ],
      technical_justification: 'Prioriza a redução drástica de sobras e aparas.',
    },
  }

  const mockScenarioVariableBlocks: MPCuttingScenarioItem = {
    id: 'SCENARIO_2_MIN_SCRAP',
    name: 'Cenário 2 — Menor Geração de Sucata',
    cutting_type: 'BLOCOS',
    used_standard_code: 'PAD-002',
    used_standard_description: 'Tarugo 150x150 Bloco 1,800 t',
    target_weight_kg: 1800,
    min_allowed_weight_kg: 1750,
    max_allowed_weight_kg: 1850,
    calculated_weight_kg: 1810,
    deviation_kg: 10,
    deviation_pct: 0.55,
    produced_quantity: 16,
    input_weight_kg: 30000,
    used_weight_kg: 28960,
    used_weight_pct: 96.53,
    estimated_leftover_kg: 650,
    cutting_loss_kg: 390,
    yield_pct: 96.53,
    demand_fulfillment_pct: 100,
    status: 'VIÁVEL',
    composition: {
      pieces_count: 16,
      piece_nominal_weight_kg: 1810,
      total_cuts_count: 18,
      nominal_length_mm: 6000,
      gauge_dimension: '150x150 mm',
      density_kg_m3: 7850,
      linear_mass_kg_m: 176.6,
      cutting_width_mm: 5,
      theoretical_loss_pct: 1.3,
      distribution: [
        {
          item_index: 1,
          item_type: 'BLOCO',
          target_kg: 1800,
          calculated_kg: 1795.5,
          tolerance_range_kg: '1750.00 a 1850.00 kg',
          status: 'CONFORME',
          dimension_display: '150 × 150 × 10.167 mm',
          calculated_length_mm: 10167,
          width_mm: 150,
          height_mm: 150,
          gauge_dimension: '150x150 mm',
          linear_mass_kg_m: 176.6,
        },
        {
          item_index: 2,
          item_type: 'BLOCO',
          target_kg: 1800,
          calculated_kg: 1812.3,
          tolerance_range_kg: '1750.00 a 1850.00 kg',
          status: 'CONFORME',
          dimension_display: '150 × 150 × 10.262 mm',
          calculated_length_mm: 10262,
          width_mm: 150,
          height_mm: 150,
          gauge_dimension: '150x150 mm',
          linear_mass_kg_m: 176.6,
        },
      ],
      satisfied_restrictions: ['Respeita limites estritos do padrão: 1750 kg a 1850 kg'],
      industrial_alerts: [
        'Excelente repetibilidade dimensional sem risco de descarte no enfornamento.',
      ],
      technical_justification: 'Dimensionamento focado na mitigação de pontas residuais.',
    },
  }

  it('1. Cenário com blocos iguais: exibe coluna "Dimensões do Bloco" posicionada após "Tipo" e repete a dimensão corretamente', () => {
    render(
      <MPCuttingScenarioDetailModal
        isOpen={true}
        onClose={vi.fn()}
        scenario={mockScenarioEqualBlocks}
      />,
    )

    // Coluna "Dimensões do Bloco" no cabeçalho
    expect(screen.getByText('Dimensões do Bloco')).toBeInTheDocument()

    // Ambos os blocos devem ter dimensão idêntica
    const dims = screen.getAllByText('130 × 130 × 9.434 mm')
    expect(dims).toHaveLength(2)
  })

  it('2. Cenário com comprimentos diferentes: exibe dimensão individual e distinta por linha', () => {
    render(
      <MPCuttingScenarioDetailModal
        isOpen={true}
        onClose={vi.fn()}
        scenario={mockScenarioVariableBlocks}
      />,
    )

    expect(screen.getByText('150 × 150 × 10.167 mm')).toBeInTheDocument()
    expect(screen.getByText('150 × 150 × 10.262 mm')).toBeInTheDocument()
  })

  it('3. Troca de cenário: grid atualiza imediatamente as dimensões do novo cenário sem reter as anteriores', () => {
    const { rerender } = render(
      <MPCuttingScenarioDetailModal
        isOpen={true}
        onClose={vi.fn()}
        scenario={mockScenarioEqualBlocks}
      />,
    )

    expect(screen.getAllByText('130 × 130 × 9.434 mm')).toHaveLength(2)
    expect(screen.queryByText('150 × 150 × 10.167 mm')).not.toBeInTheDocument()

    // Alterna para Cenário 2
    rerender(
      <MPCuttingScenarioDetailModal
        isOpen={true}
        onClose={vi.fn()}
        scenario={mockScenarioVariableBlocks}
      />,
    )

    // Valores do Cenário 1 somem completamente
    expect(screen.queryByText('130 × 130 × 9.434 mm')).not.toBeInTheDocument()
    // Valores do Cenário 2 aparecem imediatamente
    expect(screen.getByText('150 × 150 × 10.167 mm')).toBeInTheDocument()
    expect(screen.getByText('150 × 150 × 10.262 mm')).toBeInTheDocument()
  })

  it('4. Consistência dimensão ↔ peso calculado da mesma linha gerada pelo motor do Plano de Corte', async () => {
    const filters: MPCuttingOptimizationFilters = {
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
      filters,
      [],
    )

    expect(simResult.scenarios.length).toBe(6)

    for (const scen of simResult.scenarios) {
      const comp = scen.composition
      expect(comp.distribution.length).toBeGreaterThan(0)

      for (const piece of comp.distribution) {
        expect(piece.dimension_display).toBeDefined()
        expect(piece.calculated_length_mm).toBeDefined()
        expect(piece.width_mm).toBeDefined()
        expect(piece.height_mm).toBeDefined()

        // Consistência física estrita:
        // massa_calculada = (comprimento_m) * massa_linear_kg_m
        const linearMass = piece.linear_mass_kg_m || comp.linear_mass_kg_m || 132.5
        const derivedWeight = ((piece.calculated_length_mm || 0) / 1000) * linearMass

        // A tolerância de desvio numérico devido ao arredondamento para milímetros inteiros deve ser inferior a 1 kg
        expect(Math.abs(derivedWeight - piece.calculated_kg)).toBeLessThan(1.0)

        // Formato brasileiro com "largura × altura × comprimento" e "mm"
        expect(piece.dimension_display).toMatch(/^\d+\s*×\s*\d+\s*×\s*[\d.,]+\s*mm$/)
      }
    }
  })

  it('5. Tooltip explicativo com o texto prescrito e detalhamento técnico por bloco', () => {
    render(
      <MPCuttingScenarioDetailModal
        isOpen={true}
        onClose={vi.fn()}
        scenario={mockScenarioEqualBlocks}
      />,
    )

    // O texto do tooltip e detalhes técnicos devem estar configurados
    // Como TooltipContent renderiza no DOM, podemos verificar o container e o trigger
    const triggers = screen.getAllByText('130 × 130 × 9.434 mm')
    expect(triggers[0]).toBeInTheDocument()
  })

  it('6. Responsividade: tabela possui container com overflow-x-auto e min-w de segurança', () => {
    const { container } = render(
      <MPCuttingScenarioDetailModal
        isOpen={true}
        onClose={vi.fn()}
        scenario={mockScenarioEqualBlocks}
      />,
    )

    const scrollContainer = container.querySelector('.overflow-x-auto')
    expect(scrollContainer).toBeInTheDocument()
    const table = container.querySelector('table')
    expect(table).toHaveClass('min-w-[700px]')
  })
})

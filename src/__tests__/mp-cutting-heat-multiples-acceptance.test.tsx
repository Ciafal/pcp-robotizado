import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MPCuttingScenarioDetailModal } from '@/components/mp-optimization/MPCuttingScenarioDetailModal'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import type {
  MPCuttingScenarioItem,
  MPCuttingOptimizationFilters,
} from '@/types/mp-cutting-weight-standards'

// Mock dos serviços de backend
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

describe('Seleção de Corrida e Múltiplos — Testes de Aceitação', () => {
  it('1. Cenário individualizado com múltiplos possui corrida e número do múltiplo em cada bloco', () => {
    const mockScenarioWithMultiples: any = {
      id: 'SCEN-1',
      name: 'Cenário Individualizado',
      title: 'Cenário Individualizado',
      cutting_type: 'BLOCOS',
      type: 'BLOCOS',
      pieces_count: 2,
      target_unit_weight_kg: 1250,
      calculated_unit_weight_kg: 1250,
      total_calculated_weight_kg: 2500,
      residual_loss_weight_kg: 20,
      residual_loss_pct: 0.8,
      yield_pct: 99.2,
      cuts_count: 2,
      ai_score: 95,
      is_ai_recommended: true,
      composition: {
        pieces_count: 2,
        piece_nominal_weight_kg: 1250,
        nominal_length_mm: 6000,
        density_kg_m3: 7850,
        linear_mass_kg_m: 132.5,
        gauge_dimension: '130 × 130 mm',
        total_cuts_count: 2,
        technical_justification: 'Individualizado por múltiplos',
        satisfied_restrictions: [
          'Rastreabilidade individualizada por Corrida (CORR-9921) e 2 Múltiplo(s)',
        ],
        industrial_alerts: [],
        distribution: [
          {
            item_index: 1,
            item_type: 'BLOCO',
            heat_number: 'CORR-9921',
            multiple_number: 'M-001',
            dimension_display: '130 × 130 × 1.598 mm',
            target_kg: 1250,
            calculated_kg: 1250,
            tolerance_range_kg: '1200 a 1300 kg',
            status: 'CONFORME',
            origin_type: 'SAP',
          },
          {
            item_index: 2,
            item_type: 'BLOCO',
            heat_number: 'CORR-9921',
            multiple_number: 'M-002',
            dimension_display: '130 × 130 × 1.602 mm',
            target_kg: 1250,
            calculated_kg: 1252,
            tolerance_range_kg: '1200 a 1300 kg',
            status: 'CONFORME',
            origin_type: 'HOMOLOGACAO',
          },
        ],
      },
    }

    render(
      <MPCuttingScenarioDetailModal
        isOpen={true}
        onClose={vi.fn()}
        scenario={mockScenarioWithMultiples}
      />,
    )

    // Colunas de Corrida e Múltiplo devem ser exibidas
    expect(screen.getByText('Corrida')).toBeInTheDocument()
    expect(screen.getByText('Múltiplo')).toBeInTheDocument()

    // Registros devem exibir a corrida e o múltiplo correspondente
    const corridaItems = screen.getAllByText('CORR-9921')
    expect(corridaItems.length).toBe(2)
    expect(screen.getByText('M-001')).toBeInTheDocument()
    expect(screen.getByText('M-002')).toBeInTheDocument()
    expect(screen.getByText('Homol.')).toBeInTheDocument()
  })

  it('2. Modo agregado (sem múltiplos selecionados) exibe "—" para corrida e múltiplo', () => {
    const mockScenarioAggregated: any = {
      id: 'SCEN-2',
      name: 'Cenário Agregado Padrão',
      title: 'Cenário Agregado Padrão',
      cutting_type: 'BLOCOS',
      type: 'BLOCOS',
      pieces_count: 1,
      target_unit_weight_kg: 1250,
      calculated_unit_weight_kg: 1250,
      total_calculated_weight_kg: 1250,
      residual_loss_weight_kg: 15,
      residual_loss_pct: 1.2,
      yield_pct: 98.8,
      cuts_count: 1,
      ai_score: 90,
      is_ai_recommended: false,
      composition: {
        pieces_count: 1,
        piece_nominal_weight_kg: 1250,
        nominal_length_mm: 6000,
        density_kg_m3: 7850,
        linear_mass_kg_m: 132.5,
        gauge_dimension: '130 × 130 mm',
        total_cuts_count: 1,
        technical_justification: 'Agregado padrão',
        satisfied_restrictions: ['Cálculo com parâmetros agregados da Ficha Mestra'],
        industrial_alerts: [],
        distribution: [
          {
            item_index: 1,
            item_type: 'BLOCO',
            dimension_display: '130 × 130 × 1.598 mm',
            target_kg: 1250,
            calculated_kg: 1250,
            tolerance_range_kg: '1200 a 1300 kg',
            status: 'CONFORME',
          },
        ],
      },
    }

    render(
      <MPCuttingScenarioDetailModal
        isOpen={true}
        onClose={vi.fn()}
        scenario={mockScenarioAggregated}
      />,
    )

    // Devem aparecer os traços "—" para não individualizado
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('3. Motor de otimização gera os 6 cenários comparativos preservando a regra de negócio', async () => {
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'BLOCOS',
      material_code: 'TARUGO-130-1020',
      selected_standard_codes: ['PAD-130-PADRAO'],
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
    }

    const simulation = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      [],
    )

    expect(simulation.scenarios).toHaveLength(6)
    expect(simulation.best_scenario_id).toBeDefined()
    expect(simulation.filter_parameters_snapshot).toEqual(filters)
  })
})

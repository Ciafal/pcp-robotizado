import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MPCuttingScenarioDetailModal } from '@/components/mp-optimization/MPCuttingScenarioDetailModal'
import type { MPCuttingScenarioItem } from '@/types/mp-cutting-weight-standards'

describe('MPCuttingScenarioDetailModal — Apresentação de Múltiplos vs Blocos', () => {
  const scenarioMultiples: MPCuttingScenarioItem = {
    id: 'SCENARIO_MULT_PURE_A',
    name: 'Cenário 1 — Padrão Único 1,600 t',
    cutting_type: 'MULTIPLOS',
    used_standard_code: 'PAD-BLOCO-1600',
    used_standard_description: 'Bloco Padrão 1,600 t',
    target_weight_kg: 1600,
    min_allowed_weight_kg: 1550,
    max_allowed_weight_kg: 1650,
    calculated_weight_kg: 1600,
    deviation_kg: 0,
    deviation_pct: 0,
    produced_quantity: 5,
    input_weight_kg: 8000,
    used_weight_kg: 8000,
    used_weight_pct: 100,
    estimated_leftover_kg: 0,
    cutting_loss_kg: 0,
    yield_pct: 100,
    demand_fulfillment_pct: 100,
    status: 'VIÁVEL',
    raw_material_code: 'PLACA-SAE-1020',
    raw_material_description: 'Placa de Laminação 200x1200',
    batch_number: 'LOTE-88912',
    batch_initial_stock: 8.0,
    batch_used_quantity: 8.0,
    batch_projected_balance: 0,
    batch_unit: 't',
    composition: {
      pieces_count: 5,
      piece_nominal_weight_kg: 1600,
      total_cuts_count: 5,
      distribution: [],
      satisfied_restrictions: ['Peso bruto da placa: 8,000 t', 'Balanço estrito de massa validado'],
      industrial_alerts: ['Excelente rendimento'],
      technical_justification: 'Produção com Bloco Padrão 1,600 t.',
      multiples_summary: [
        {
          block_standard: 'Bloco 1,600 t',
          quantity: 5,
          unit_weight_tons: 1.6,
          total_weight_tons: 8.0,
        },
      ],
      plate_info: {
        plate_code: 'PLACA-88912',
        material_code: 'PLACA-SAE-1020',
        batch_number: 'LOTE-88912',
        gross_weight_tons: 8.0,
        technical_loss_tons: 0,
        net_available_weight_tons: 8.0,
        used_weight_tons: 8.0,
        leftover_weight_tons: 0,
        reference_block: '5×1,600 t',
      },
      mass_fractions: {
        blocks_pct: 100,
        loss_pct: 0,
        leftover_pct: 0,
        segments: [
          {
            type: 'BLOCO',
            label: 'B1 (1,600 t)',
            weight_tons: 1.6,
            percentage: 20,
            color: '#1e3a8a',
          },
          {
            type: 'BLOCO',
            label: 'B2 (1,600 t)',
            weight_tons: 1.6,
            percentage: 20,
            color: '#1e3a8a',
          },
        ],
      },
    },
  }

  const scenarioBlocos: MPCuttingScenarioItem = {
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
      distribution: [
        {
          item_index: 1,
          item_type: 'BLOCO',
          target_kg: 1250,
          calculated_kg: 1250,
          tolerance_range_kg: '1200.00 a 1300.00 kg',
          status: 'CONFORME',
          dimension_display: '130 × 130 × 9.434 mm',
        },
      ],
      satisfied_restrictions: ['Limites respeitados'],
      industrial_alerts: [],
      technical_justification: 'Redução drástica de aparas',
    },
  }

  it('1. Renderiza layout dedicado de Múltiplos com os 5 cards e o título oficial', () => {
    render(
      <MPCuttingScenarioDetailModal isOpen={true} onClose={vi.fn()} scenario={scenarioMultiples} />,
    )

    // Título de Múltiplos
    expect(
      screen.getByText('Cenário de Corte para Múltiplos — Máximo Aproveitamento da Placa'),
    ).toBeInTheDocument()

    // 5 cards obrigatórios
    expect(screen.getByText('Rendimento da Placa %')).toBeInTheDocument()
    expect(screen.getByText('Peso Total Aproveitado t')).toBeInTheDocument()
    expect(screen.getByText('Quantidade de Blocos')).toBeInTheDocument()
    expect(screen.getByText('Peso Total de Perdas t')).toBeInTheDocument()
    expect(screen.getByText('Sobra Final da Placa t')).toBeInTheDocument()

    // Quadro de identificação da placa
    expect(screen.getByText('Identificação da Placa e Parâmetros de Entrada')).toBeInTheDocument()
    expect(screen.getByText('PLACA-88912')).toBeInTheDocument()
    expect(screen.getByText('8,000 t')).toBeInTheDocument()

    // Distribuição de corte da placa (barra horizontal de massa)
    expect(
      screen.getByText('Distribuição de Corte da Placa (Divisão Proporcional em Massa)'),
    ).toBeInTheDocument()

    // Tabela simplificada de blocos
    expect(screen.getByText('Bloco 1,600 t')).toBeInTheDocument()
    expect(screen.getByText('Total Produzido')).toBeInTheDocument()
  })

  it('2. Preserva layout de Blocos sem regressão quando cutting_type === "BLOCOS"', () => {
    render(
      <MPCuttingScenarioDetailModal isOpen={true} onClose={vi.fn()} scenario={scenarioBlocos} />,
    )

    // Título legado preservado
    expect(screen.getByText('Cenário 1 — Máximo Rendimento de MP')).toBeInTheDocument()
    // Tabela detalhada de peças com Dimensões do Bloco
    expect(screen.getByText('Dimensões do Bloco')).toBeInTheDocument()
    expect(screen.getByText('130 × 130 × 9.434 mm')).toBeInTheDocument()
    expect(screen.getByText('Rendimento Metálico')).toBeInTheDocument()
  })
})

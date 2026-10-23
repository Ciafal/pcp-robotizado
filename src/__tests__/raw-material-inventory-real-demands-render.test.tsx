import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DemandasInventarioTable } from '@/components/pcp/inventory/DemandasInventarioTable'
import { InventoryDemand } from '@/types/pcp-inventory-demands'

describe('Passo 3: Renderização de DemandasInventarioTable com dados reais do live backend', () => {
  // Payloads reais exatos extraídos da coleção pcp_mp_inventory_demands
  // (INV-2026-000002, INV-2026-000003, INV-2026-000004, INV-2026-000005)
  const realDemand2: InventoryDemand = {
    id: 'x1i3gqjcnopoblp',
    control_number: 'INV-2026-000002',
    company: 'CIAFAL',
    line: 'L1',
    center: 'FORNO1',
    storage_deposit: 'DP07',
    production_order: 'OP-2025-0891',
    material_code: 'ST930',
    material_description: 'Tarugo Laminado ST930 130mm',
    unit_of_measure: 'pçs',
    priority: 'Normal',
    status: 'Parcial',
    total_pieces_required: 200,
    total_pieces_inventoried: 40,
    divergence_pieces: -160,
    divergence_pct: -80,
    cycle_count: 1,
    generation_date_formatted: '28/09/2026 14:00',
    requester_name: 'Programador PCP',
    requester_role: 'PCP_PROGRAMMER',
    // Array com múltiplos campos preenchidos
    materials_summary: [
      {
        material_code: 'ST930',
        material_description: 'Tarugo Laminado ST930 130mm',
        heat_number: 'COR-8821',
        quantity_tons: 24,
        calculated_pieces: 200,
        unit_weight_kg: 120,
        unit_weight_t: 0.12,
        weight_origin: 'LOCAL_CADASTRO',
      },
    ],
  }

  const realDemand3: InventoryDemand = {
    id: 'yqc8b7mx8w8ohgq',
    control_number: 'INV-2026-000003',
    company: 'Ciafal',
    line: 'L1',
    center: 'FORNOL1',
    storage_deposit: 'DP07',
    production_order: 'OP-2025-0892',
    material_code: 'st90',
    material_description: 'Material não encontrado no SAP.',
    unit_of_measure: 'pçs',
    priority: 'Urgente',
    status: 'Cancelado',
    total_pieces_required: 0,
    total_pieces_inventoried: 30,
    divergence_pieces: 30,
    divergence_pct: 0,
    cycle_count: 1,
    generation_date_formatted: '29/09/2026 11:56',
    requester_name: 'Administrador Geral CIAFAL',
    requester_role: 'PCP_PROGRAMMER',
    // unit_weight_kg e unit_weight_t null
    materials_summary: [
      {
        material_code: 'st90',
        material_description: 'Material não encontrado no SAP.',
        heat_number: '1',
        quantity_tons: 20,
        calculated_pieces: 0,
        unit_weight_kg: null,
        unit_weight_t: null,
        weight_origin: 'LOCAL_CADASTRO',
      },
    ],
  }

  const realDemand4: InventoryDemand = {
    id: 'm87s4oinj9u9fq1',
    control_number: 'INV-2026-000004',
    company: 'CIAFAL',
    line: 'ENF_L1',
    center: 'Forno L1',
    storage_deposit: 'DP07',
    production_order: 'OP-2025-0891',
    material_code: 'st950',
    material_description: 'Material não encontrado no SAP.',
    unit_of_measure: 'pçs',
    priority: 'Urgente',
    status: 'Aberto',
    total_pieces_required: 0,
    total_pieces_inventoried: 0,
    divergence_pieces: 0,
    divergence_pct: -100,
    cycle_count: 1,
    generation_date_formatted: '30/09/2026 07:59',
    requester_name: 'Administrador Geral CIAFAL',
    requester_role: 'PCP_PROGRAMMER',
    // heat_number vazio ("") e unit_weight null
    materials_summary: [
      {
        material_code: 'st950',
        material_description: 'Material não encontrado no SAP.',
        heat_number: '',
        quantity_tons: 30,
        calculated_pieces: 0,
        unit_weight_kg: null,
        unit_weight_t: null,
        weight_origin: 'LOCAL_CADASTRO',
      },
    ],
  }

  const realDemand5: InventoryDemand = {
    id: 'aju67flfa0415ia',
    control_number: 'INV-2026-000005',
    company: 'CIAFAL',
    line: 'ENF_L1',
    center: 'Forno L1',
    storage_deposit: 'DP07',
    production_order: 'OP-2025-0892',
    material_code: 'St950',
    material_description: 'Material não encontrado no SAP.',
    unit_of_measure: 'pçs',
    priority: 'Normal',
    status: 'Parcial',
    total_pieces_required: 0,
    total_pieces_inventoried: 150,
    divergence_pieces: 150,
    divergence_pct: 0,
    cycle_count: 1,
    generation_date_formatted: '30/09/2026 10:05',
    requester_name: 'Administrador Geral CIAFAL',
    requester_role: 'PCP_PROGRAMMER',
    // heat_number vazio (""), unit_weight null
    materials_summary: [
      {
        material_code: 'St950',
        material_description: 'Material não encontrado no SAP.',
        heat_number: '',
        quantity_tons: 10,
        calculated_pieces: 0,
        unit_weight_kg: null,
        unit_weight_t: null,
        weight_origin: 'LOCAL_CADASTRO',
      },
    ],
  }

  it('renderiza os 4 registros reais do banco (INV-2026-000002..000005) sem lançar exceção', () => {
    const realDemands = [realDemand2, realDemand3, realDemand4, realDemand5]

    render(
      <DemandasInventarioTable
        demands={realDemands}
        loading={false}
        onVisualizar={vi.fn()}
        onLancar={vi.fn()}
        onHistorico={vi.fn()}
        onCancelar={vi.fn().mockResolvedValue(undefined)}
        onRefresh={vi.fn()}
      />,
    )

    // Valida que os 4 números de controle aparecem no documento
    expect(screen.getByText('INV-2026-000002')).toBeDefined()
    expect(screen.getByText('INV-2026-000003')).toBeDefined()
    expect(screen.getByText('INV-2026-000004')).toBeDefined()
    expect(screen.getByText('INV-2026-000005')).toBeDefined()

    // Valida exibição dos solicitantes reais
    expect(screen.getByText('Programador PCP')).toBeDefined()
    expect(screen.getAllByText('Administrador Geral CIAFAL').length).toBeGreaterThanOrEqual(1)

    // Valida tratamento de 'Sem corrida' para corridas vazias (INV-2026-000004 / 000005)
    expect(screen.getAllByText('Sem corrida').length).toBeGreaterThanOrEqual(2)

    // Valida corrida COR-8821 presente
    expect(screen.getByText('COR-8821')).toBeDefined()
  })

  it('renderiza com resiliência para materials_summary nulo, string JSON e objeto avulso', () => {
    const rawVariantDemands: any[] = [
      {
        ...realDemand2,
        id: 'var-null',
        control_number: 'INV-2026-000006',
        materials_summary: null, // materials_summary nulo
      },
      {
        ...realDemand3,
        id: 'var-str-json',
        control_number: 'INV-2026-000007',
        materials_summary: JSON.stringify([
          {
            material_code: 'STRING_JSON_MP',
            material_description: 'MP vinda de string JSON',
            heat_number: 'COR-JSON',
            quantity_tons: 15,
            calculated_pieces: 10,
          },
        ]), // materials_summary string JSON
      },
      {
        ...realDemand4,
        id: 'var-single-obj',
        control_number: 'INV-2026-000008',
        materials_summary: {
          material_code: 'SINGLE_OBJ_MP',
          material_description: 'Objeto único em vez de array',
          heat_number: '',
          quantity_tons: 5,
        }, // materials_summary objeto não-array
      },
      {
        ...realDemand5,
        id: 'var-corrupt-str',
        control_number: 'INV-2026-000009',
        materials_summary: '{invalid-json', // string inválida não deve quebrar
      },
    ]

    render(
      <DemandasInventarioTable
        demands={rawVariantDemands}
        loading={false}
        onVisualizar={vi.fn()}
        onLancar={vi.fn()}
        onHistorico={vi.fn()}
        onCancelar={vi.fn().mockResolvedValue(undefined)}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('INV-2026-000006')).toBeDefined()
    expect(screen.getByText('INV-2026-000007')).toBeDefined()
    expect(screen.getByText('INV-2026-000008')).toBeDefined()
    expect(screen.getByText('INV-2026-000009')).toBeDefined()
    expect(screen.getByText('STRING_JSON_MP')).toBeDefined()
    expect(screen.getByText('SINGLE_OBJ_MP')).toBeDefined()
  })

  it('renderiza corretamente o estado vazio sem lançar erro', () => {
    render(
      <DemandasInventarioTable
        demands={[]}
        loading={false}
        onVisualizar={vi.fn()}
        onLancar={vi.fn()}
        onHistorico={vi.fn()}
        onCancelar={vi.fn().mockResolvedValue(undefined)}
        onRefresh={vi.fn()}
      />,
    )

    expect(
      screen.getByText(
        'Nenhum inventário de matéria-prima encontrado para os filtros selecionados.',
      ),
    ).toBeDefined()
  })

  it('renderiza corretamente o estado de erro com mensagem e botão de nova tentativa', () => {
    const handleRefresh = vi.fn()
    render(
      <DemandasInventarioTable
        demands={[]}
        loading={false}
        error="Falha de conexão com a coleção pcp_mp_inventory_demands (PCP-6D3F62A7)"
        onVisualizar={vi.fn()}
        onLancar={vi.fn()}
        onHistorico={vi.fn()}
        onCancelar={vi.fn().mockResolvedValue(undefined)}
        onRefresh={handleRefresh}
      />,
    )

    expect(
      screen.getByText(/Falha de conexão com a coleção pcp_mp_inventory_demands/i),
    ).toBeDefined()
    expect(screen.getByText('Tentar novamente')).toBeDefined()
  })

  it('renderiza o estado de loading com spinner sem exceção', () => {
    render(
      <DemandasInventarioTable
        demands={[]}
        loading={true}
        onVisualizar={vi.fn()}
        onLancar={vi.fn()}
        onHistorico={vi.fn()}
        onCancelar={vi.fn().mockResolvedValue(undefined)}
        onRefresh={vi.fn()}
      />,
    )

    expect(screen.getByText('Carregando demandas de inventário...')).toBeDefined()
  })
})

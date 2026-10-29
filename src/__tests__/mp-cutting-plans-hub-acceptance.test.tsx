import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResponsiveHorizontalNav } from '@/components/common/ResponsiveHorizontalNav'
import { MPDimensionalOperationalGrid } from '@/components/mp-optimization/MPDimensionalOperationalGrid'
import { MPDimensionalItem } from '@/types/mp-optimization'
import { Scissors, Boxes, Sliders } from 'lucide-react'

describe('Planos de Corte — Navegação Horizontal Responsiva e Grade Operacional', () => {
  it('deve renderizar a barra de navegação com itens acessíveis e abas ativas', () => {
    const items = [
      { id: 'item-1', label: 'Item Um', icon: Scissors },
      { id: 'item-2', label: 'Item Dois', icon: Boxes },
      { id: 'item-3', label: 'Item Três', icon: Sliders },
    ]

    const onSelect = vi.fn()

    render(
      <ResponsiveHorizontalNav
        items={items}
        activeId="item-2"
        onSelect={onSelect}
        ariaLabel="Teste Nav"
      />,
    )

    const tab2 = screen.getByRole('tab', { name: /Item Dois/i })
    expect(tab2).toBeInTheDocument()
    expect(tab2).toHaveAttribute('aria-selected', 'true')

    const tab1 = screen.getByRole('tab', { name: /Item Um/i })
    expect(tab1).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(tab1)
    expect(onSelect).toHaveBeenCalledWith('item-1')
  })

  it('deve renderizar a grade de Estoque Dimensional com cards e cabeçalhos completos', () => {
    const mockItems: MPDimensionalItem[] = [
      {
        id: 'rec-001',
        material_code: '10000452',
        material_description: 'Tarugo Redondo 130mm SAE 1020',
        steel_grade: 'SAE 1020',
        center_code: '1020',
        storage_location: 'DP04',
        batch_number: 'LT-998',
        heat_number: 'CR-887',
        supplier_code: 'GERDAU',
        supplier_name: 'Gerdau Aços Especiais',
        item_type: 'BLOCO',
        thickness_mm: 130,
        width_mm: 130,
        length_mm: 6000,
        weight_kg: 5268,
        reservation_status: 'LIVRE',
        original_application: 'Laminado Redondo',
        current_application: 'Laminado Redondo',
        sap_block_status: '01_DISPONIVEL',
        dimensional_classification: 'NIVEL_1_IDEAL',
        reception_date: '2026-03-01T10:00:00Z',
        created: '2026-03-01T10:00:00Z',
        updated: '2026-03-01T10:00:00Z',
      },
    ]

    render(<MPDimensionalOperationalGrid items={mockItems} isLoading={false} />)

    // Título oficial
    expect(
      screen.getByText(/Estoque Dimensional Rastreável — Placas, Blocos, Peças e Sobras/i),
    ).toBeInTheDocument()

    // Verificação de unidade em toneladas com 3 casas decimais (5.268 t)
    expect(screen.getAllByText(/5,268 t/i).length).toBeGreaterThan(0)

    // Colunas da grade
    expect(screen.getByText('10000452')).toBeInTheDocument()
    expect(screen.getByText('Tarugo Redondo 130mm SAE 1020')).toBeInTheDocument()
    expect(screen.getByText('SAE 1020')).toBeInTheDocument()
  })

  it('deve apresentar estado vazio honesto quando não houver dados SAP integrados', () => {
    render(<MPDimensionalOperationalGrid items={[]} isLoading={false} />)

    expect(screen.getByText(/Aguardando sincronização com depósitos SAP/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Informação não disponível na integração SAP no momento/i),
    ).toBeInTheDocument()
  })

  it('deve permitir abrir o detalhamento do estoque dimensional ao clicar no item', () => {
    const mockItems: MPDimensionalItem[] = [
      {
        id: 'rec-002',
        material_code: '10000452',
        material_description: 'Tarugo Redondo 130mm SAE 1020',
        steel_grade: 'SAE 1020',
        center_code: '1020',
        storage_location: 'DP04',
        batch_number: 'LT-998',
        heat_number: 'CR-887',
        supplier_code: 'GERDAU',
        supplier_name: 'Gerdau Aços Especiais',
        item_type: 'BLOCO',
        thickness_mm: 130,
        width_mm: 130,
        length_mm: 6000,
        weight_kg: 5268,
        reservation_status: 'LIVRE',
        original_application: 'Laminado Redondo',
        current_application: 'Laminado Redondo',
        sap_block_status: '01_DISPONIVEL',
        dimensional_classification: 'NIVEL_1_IDEAL',
        reception_date: '2026-03-01T10:00:00Z',
        created: '2026-03-01T10:00:00Z',
        updated: '2026-03-01T10:00:00Z',
      },
    ]

    render(<MPDimensionalOperationalGrid items={mockItems} isLoading={false} />)

    const row = screen.getByText('10000452')
    fireEvent.click(row)

    expect(screen.getByText(/Detalhamento do Estoque Dimensional/i)).toBeInTheDocument()
  })
})

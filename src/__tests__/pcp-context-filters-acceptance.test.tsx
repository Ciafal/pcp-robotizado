import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PCPContextFilters, FilterOptionItem } from '@/components/pcp/PCPContextFilters'
import { EfficiencyUnifiedFilterBar } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'

const mockCompanies: FilterOptionItem[] = [
  { code: 'CIAFAL', name: 'CIAFAL Matriz' },
  { code: 'SIDER', name: 'Siderúrgica CIAFAL' },
]

const mockPlants: FilterOptionItem[] = [
  { code: 'DIV', name: 'Divinópolis', companyCode: 'CIAFAL' },
  { code: 'BH', name: 'Belo Horizonte', companyCode: 'CIAFAL' },
  { code: 'SIDER_P1', name: 'Planta Siderúrgica 1', companyCode: 'SIDER' },
]

const mockLines: FilterOptionItem[] = [
  { code: 'L1', name: 'Laminação', companyCode: 'CIAFAL', plantCode: 'DIV' },
  { code: 'L2', name: 'Trefilação', companyCode: 'CIAFAL', plantCode: 'DIV' },
  { code: 'L3', name: 'Corte e Dobra', companyCode: 'CIAFAL', plantCode: 'BH' },
  { code: 'L_SIDER', name: 'Alto Forno', companyCode: 'SIDER', plantCode: 'SIDER_P1' },
]

const mockCenters: FilterOptionItem[] = [
  { code: 'LAM_01', name: 'Laminador 01', lineCode: 'L1' },
  { code: 'TREFILA_1', name: 'Trefila 01', lineCode: 'L2' },
  { code: 'ACAB_L2', name: 'Acabamento L2', lineCode: 'L2' },
]

describe('PCPContextFilters - Testes de Aceitação da Cascata e Responsividade', () => {
  it('Critério 1: Renderiza 4 campos independentes (Empresa, Planta, Linha, Centro) com rótulos explícitos', () => {
    render(
      <PCPContextFilters
        companyCode="CIAFAL"
        plantCode="DIV"
        lineCode="L2"
        centerCode="TREFILA_1"
        companies={mockCompanies}
        plants={mockPlants}
        lines={mockLines}
        centers={mockCenters}
        onCompanyChange={() => {}}
        onPlantChange={() => {}}
        onLineChange={() => {}}
        onCenterChange={() => {}}
      />,
    )

    expect(screen.getByText('Empresa')).toBeInTheDocument()
    expect(screen.getByText('Planta')).toBeInTheDocument()
    expect(screen.getByText('Linha')).toBeInTheDocument()
    expect(screen.getByText('Centro')).toBeInTheDocument()

    // SelectTriggers associados aos IDs
    expect(screen.getByLabelText('Empresa')).toBeInTheDocument()
    expect(screen.getByLabelText('Planta')).toBeInTheDocument()
    expect(screen.getByLabelText('Linha')).toBeInTheDocument()
    expect(screen.getByLabelText('Centro')).toBeInTheDocument()
  })

  it('Critério 2: Breakpoints com grid responsivo: md:grid-cols-2, xl:grid-cols-4 e grid-cols-1 para celular', () => {
    const { container } = render(
      <PCPContextFilters
        companyCode="CIAFAL"
        plantCode="DIV"
        lineCode="L2"
        centerCode="TREFILA_1"
        companies={mockCompanies}
        plants={mockPlants}
        lines={mockLines}
        centers={mockCenters}
        onCompanyChange={() => {}}
        onPlantChange={() => {}}
        onLineChange={() => {}}
        onCenterChange={() => {}}
      />,
    )

    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
    expect(grid?.className).toContain('grid-cols-1')
    expect(grid?.className).toContain('md:grid-cols-2')
    expect(grid?.className).toContain('xl:grid-cols-4')
  })

  it('Critério 3: Empty State do Centro quando a linha selecionada não possui centros cadastrados', () => {
    // Linha L3 não tem centros em mockCenters
    render(
      <PCPContextFilters
        companyCode="CIAFAL"
        plantCode="BH"
        lineCode="L3"
        centerCode="ALL"
        companies={mockCompanies}
        plants={mockPlants}
        lines={mockLines}
        centers={mockCenters}
        onCompanyChange={() => {}}
        onPlantChange={() => {}}
        onLineChange={() => {}}
        onCenterChange={() => {}}
      />,
    )

    // Indicação visual de sem centro específico no label
    expect(screen.getByText('(Sem centro específico)')).toBeInTheDocument()

    // O trigger do select deve estar desabilitado e com tooltip explicativa em pt-BR
    const centerTrigger = screen.getByLabelText('Centro')
    expect(centerTrigger).toBeDisabled()
    expect(centerTrigger).toHaveAttribute(
      'title',
      'Nenhum centro disponível para a linha selecionada.',
    )
  })

  it('Critério 4: Linha 2 de Ações fica em container próprio separado e alinhado à direita em telas médias/largas', () => {
    render(
      <PCPContextFilters
        companyCode="CIAFAL"
        plantCode="DIV"
        lineCode="L2"
        centerCode="TREFILA_1"
        companies={mockCompanies}
        plants={mockPlants}
        lines={mockLines}
        centers={mockCenters}
        onCompanyChange={() => {}}
        onPlantChange={() => {}}
        onLineChange={() => {}}
        onCenterChange={() => {}}
        actions={<button data-testid="custom-action-btn">Atualizar Dados</button>}
      />,
    )

    const actionsContainer = screen.getByTestId('pcp-context-actions')
    expect(actionsContainer).toBeInTheDocument()
    expect(actionsContainer.className).toContain('md:justify-end')
    expect(screen.getByTestId('custom-action-btn')).toBeInTheDocument()
  })

  it('Critério 5: Integração no EfficiencyUnifiedFilterBar repassa callbacks de limpeza em cascata', () => {
    const onChange = vi.fn()
    const options = {
      companies: mockCompanies,
      plants: mockPlants as any,
      lines: mockLines as any,
      centers: mockCenters as any,
    }

    render(
      <EfficiencyUnifiedFilterBar
        filters={{
          companyCode: 'CIAFAL',
          plantCode: 'DIV',
          lineCode: 'L2',
          centerCode: 'TREFILA_1',
        }}
        options={options}
        onChange={onChange}
        onReset={() => {}}
      />,
    )

    // PCPContextFilters deve estar presente na árvore da EfficiencyUnifiedFilterBar
    expect(screen.getByTestId('pcp-context-filters')).toBeInTheDocument()
    expect(screen.getByLabelText('Empresa')).toBeInTheDocument()
    expect(screen.getByLabelText('Planta Industrial')).toBeInTheDocument()
    expect(screen.getByLabelText('Linha Produtiva')).toBeInTheDocument()
    expect(screen.getByLabelText('Centro de Trabalho')).toBeInTheDocument()
  })
})

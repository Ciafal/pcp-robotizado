import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DemandaSucessoModal } from '@/components/pcp/inventory/DemandaSucessoModal'
import { DemandasInventarioTable } from '@/components/pcp/inventory/DemandasInventarioTable'
import { InventoryDemand } from '@/types/pcp-inventory-demands'

describe('DemandaSucessoModal & Atualização Imediata do Grid', () => {
  const mockDemand: InventoryDemand = {
    id: 'dem-test-01',
    control_number: 'INV-2026-000001',
    company: 'CIAFAL',
    line: 'L1',
    center: 'FORNOL1',
    storage_deposit: 'DP07',
    production_order: 'OP-45000192',
    material_code: 'TAR-130-1020',
    material_description: 'Tarugo SAE 1020 130mm x 12m',
    priority: 'Normal',
    status: 'Gerada',
    total_pieces_required: 80,
    total_pieces_inventoried: 0,
    divergence_pieces: -80,
    divergence_pct: -100,
    created: '2026-09-27T10:00:00.000Z',
    materials_summary: [
      {
        material_code: 'TAR-130-1020',
        material_description: 'Tarugo SAE 1020 130mm x 12m',
        heat_number: 'CORR-9988',
        quantity_tons: 24,
        calculated_pieces: 80,
      },
    ],
  }

  it('exibe título, mensagem com número real da demanda e resumo completo dos campos', () => {
    const handleClose = vi.fn()
    const handleView = vi.fn()

    render(
      <DemandaSucessoModal
        open={true}
        onOpenChange={vi.fn()}
        demand={mockDemand}
        onClose={handleClose}
        onViewDetails={handleView}
      />,
    )

    // Título do modal
    expect(screen.getByText('DEMANDA GERADA COM SUCESSO')).toBeDefined()

    // Mensagem com número real retornado pelo backend
    expect(screen.getByText(/Demanda de Inventário nº/i)).toBeDefined()
    expect(screen.getAllByText('INV-2026-000001').length).toBeGreaterThan(0)

    // Resumo: Empresa, Linha, Centro, Depósito, OP, Qtd MP
    expect(screen.getByText('CIAFAL')).toBeDefined()
    expect(screen.getByText('L1')).toBeDefined()
    expect(screen.getByText('FORNOL1')).toBeDefined()
    expect(screen.getByText('DP07')).toBeDefined()
    expect(screen.getByText('OP-45000192')).toBeDefined()
    expect(screen.getByText('1 matéria-prima')).toBeDefined()

    // Solicitante ao lado de Data/Hora da Criação (ETAPA D)
    expect(screen.getByText('Solicitante')).toBeDefined()
    expect(screen.getByText('Data/Hora da Criação')).toBeDefined()

    // Botões Fechar e Visualizar Demanda
    const closeBtn = screen.getByRole('button', { name: /Fechar/i })
    const viewBtn = screen.getByRole('button', { name: /Visualizar Demanda/i })

    expect(closeBtn).toBeDefined()
    expect(viewBtn).toBeDefined()

    // Clicar em Fechar aciona onClose
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()

    // Clicar em Visualizar Demanda aciona onViewDetails com a demanda real
    fireEvent.click(viewBtn)
    expect(handleView).toHaveBeenCalledWith(mockDemand)
  })

  it('exibe aviso discreto quando a demanda recém-criada não atende aos filtros ativos da tabela', () => {
    const demandsList: InventoryDemand[] = [
      mockDemand, // Centro: FORNOL1
    ]

    const { rerender } = render(
      <DemandasInventarioTable
        demands={demandsList}
        loading={false}
        onVisualizar={vi.fn()}
        onLancar={vi.fn()}
        onHistorico={vi.fn()}
        onCancelar={vi.fn().mockResolvedValue(undefined)}
        onRefresh={vi.fn()}
        lastCreatedDemand={mockDemand}
      />,
    )

    // A demanda aparece normalmente sem filtros
    expect(screen.getByText('INV-2026-000001')).toBeDefined()

    // Agora aplicamos um filtro que exclui essa demanda (ex.: buscar outro centro)
    const centerFilterInput = screen.getByPlaceholderText('Centro...')
    fireEvent.change(centerFilterInput, { target: { value: 'CENTRO_INEXISTENTE' } })

    // A mensagem discreta deve aparecer sem quebrar a aplicação
    expect(
      screen.getByText('Demanda gerada com sucesso. O registro não aparece no filtro atual.'),
    ).toBeDefined()
  })
})

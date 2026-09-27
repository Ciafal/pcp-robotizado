import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NovaDemandaInventarioModal } from '@/components/pcp/inventory/NovaDemandaInventarioModal'

// Mock dos serviços para teste unitário/renderização isolada
vi.mock('@/services/pcp-inventory-demands-service', () => ({
  pcpInventoryDemandsService: {
    createDemand: vi.fn(),
  },
}))

vi.mock('@/services/sap-material-service', () => ({
  sapMaterialService: {
    getMaterialWeight: vi.fn().mockResolvedValue({
      material_code: 'ST930',
      unit_weight_t: 0.3,
      unit_weight_kg: 300,
      source: 'LOCAL_CADASTRO',
      is_available: true,
      material_description: 'Tarugo ST930 130mm',
    }),
  },
}))

vi.mock('@/services/pcp-production-service', () => ({
  pcpProductionService: {
    getOrders: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('NovaDemandaInventarioModal — Alinhamento do Bloco 3: Matérias-Primas', () => {
  it('renderiza o bloco de matérias-primas com estrutura de grid responsiva, labels e inputs alinhados e mesma altura', () => {
    const { container } = render(
      <NovaDemandaInventarioModal open={true} onOpenChange={vi.fn()} onSuccess={vi.fn()} />,
    )

    // Título do Bloco 3
    expect(screen.getByText(/Bloco 3: Matérias-Primas/i)).toBeDefined()

    // Labels da Linha 1
    const labelCod = screen.getByText(/Código MP \*/i)
    const labelDesc = screen.getByText(/Descrição da MP/i)
    const labelCorrida = screen.getByText(/Corrida \(opcional\)/i)

    expect(labelCod).toBeDefined()
    expect(labelDesc).toBeDefined()
    expect(labelCorrida).toBeDefined()

    // Labels da Linha 2
    const labelQtd = screen.getByText(/Quantidade \(t\) \*/i)
    const labelPeso = screen.getByText(/Peso Unitário \(t\)/i)
    const labelPecas = screen.getByText(/Qtd\. Calculada \(peças\)/i)

    expect(labelQtd).toBeDefined()
    expect(labelPeso).toBeDefined()
    expect(labelPecas).toBeDefined()

    // Fórmula visual deve estar presente discretamente sem quebrar alinhamento
    const formulaBadge = screen.getByText(/Qtd\. \(t\) ÷ Peso \(t\)/i)
    expect(formulaBadge).toBeDefined()

    // Verifica a marcação de classes do grid responsivo (1 col celular, 2 col tablet md, 3 col desktop lg)
    const gridRows = container.querySelectorAll('.grid.items-end')
    expect(gridRows.length).toBeGreaterThanOrEqual(2)

    gridRows.forEach((row) => {
      // Classes responsivas
      expect(row.className).toContain('grid-cols-1')
      expect(row.className).toContain('md:grid-cols-2')
      expect(row.className).toContain('lg:grid-cols-3')
      expect(row.className).toContain('items-end')
    })

    // Todos os inputs do bloco de matéria-prima devem ter a mesma altura (h-9)
    const inputCod = screen.getByPlaceholderText('Código MP')
    const inputDesc = screen.getByPlaceholderText('Descrição técnica')
    const inputCorrida = screen.getByPlaceholderText('Nº da Corrida (opcional)')
    const inputQtd = screen.getByPlaceholderText('Ex.: 24,00')

    expect(inputCod.className).toContain('h-9')
    expect(inputDesc.className).toContain('h-9')
    expect(inputCorrida.className).toContain('h-9')
    expect(inputQtd.className).toContain('h-9')
  })

  it('preserva alinhamento e classes consistentes ao adicionar uma nova matéria-prima pelo botão "+ Matéria-prima"', () => {
    const { container } = render(
      <NovaDemandaInventarioModal open={true} onOpenChange={vi.fn()} onSuccess={vi.fn()} />,
    )

    const addBtn = screen.getByRole('button', { name: /\+ Matéria-prima/i })
    expect(addBtn).toBeDefined()

    fireEvent.click(addBtn)

    // Agora existem Item #1 e Item #2
    expect(screen.getByText('Item #1 de Matéria-Prima')).toBeDefined()
    expect(screen.getByText('Item #2 de Matéria-Prima')).toBeDefined()

    // Ambos os itens devem ter grids com a mesma estrutura
    const gridRows = container.querySelectorAll('.grid.items-end')
    // 2 itens x 2 linhas = 4 linhas de grid
    expect(gridRows.length).toBe(4)

    gridRows.forEach((row) => {
      expect(row.className).toContain('grid-cols-1')
      expect(row.className).toContain('md:grid-cols-2')
      expect(row.className).toContain('lg:grid-cols-3')
      expect(row.className).toContain('items-end')
    })
  })
})

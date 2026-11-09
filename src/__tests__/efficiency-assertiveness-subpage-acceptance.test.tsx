import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EfficiencyAssertivenessSubpage } from '@/pages/EfficiencyAssertivenessSubpage'
import * as hierarchyService from '@/services/efficiency-assertiveness-hierarchy-service'
import type { CenterEfficiencyRow } from '@/services/efficiency-center-service'

// Mock dos serviços de backend
vi.mock('@/services/efficiency-assertiveness-hierarchy-service', async (importOriginal) => {
  const actual = await importOriginal<typeof hierarchyService>()
  return {
    ...actual,
    fetchRawCenterEfficiencyRows: vi.fn(),
    fetchOpsForCenter: vi.fn(),
  }
})

describe('EfficiencyAssertivenessSubpage - Aceitação Parte 2', () => {
  const mockCenters: CenterEfficiencyRow[] = [
    {
      centerCode: 'LAM-01',
      centerName: 'Laminador de Desbaste',
      lineCode: 'L1',
      lineName: 'Laminação a Quente',
      plantCode: 'DIV',
      companyCode: 'CIAFAL',
      plannedProductCode: 'TQ-50',
      plannedProductName: 'Tubo Quadrado 50x50',
      plannedQuantityTons: 400.0,
      realizedQuantityTons: 380.0,
      plannedStart: '2026-11-09 08:00:00',
      realStart: '2026-11-09 08:15:00',
      differenceTons: -20.0,
      adherencePct: 95.0,
      delayMinutes: 15,
      status: 'DENTRO_ESPERADO',
      ordersCount: 2,
      programacaoOrigem: {
        scheduleCode: 'PROG-01',
        version: 1,
        status: 'PUBLICADA',
        totalItems: 2,
      },
      mesAvailable: true,
      details: [],
    },
    {
      centerCode: 'LAM-02',
      centerName: 'Laminador Intermediário',
      lineCode: 'L1',
      lineName: 'Laminação a Quente',
      plantCode: 'DIV',
      companyCode: 'CIAFAL',
      plannedProductCode: 'TQ-30',
      plannedProductName: 'Tubo Quadrado 30x30',
      plannedQuantityTons: 0,
      realizedQuantityTons: null,
      plannedStart: null,
      realStart: null,
      differenceTons: 0,
      adherencePct: null,
      delayMinutes: null,
      status: 'DENTRO_ESPERADO',
      ordersCount: 0,
      programacaoOrigem: {
        scheduleCode: 'PROG-01',
        version: 1,
        status: 'PUBLICADA',
        totalItems: 0,
      },
      mesAvailable: true,
      details: [],
    },
  ]

  const mockOps = [
    {
      id: 'op-101',
      opNumber: 'OP-100071301',
      materialCode: 'TQ-50X50',
      materialDescription: 'Tubo Quadrado 50x50x2.0mm',
      batchNumber: 'LOTE-99',
      productName: 'Tubo Quadrado 50x50',
      scheduledDate: '2026-11-09',
      plannedStart: '2026-11-09 08:00:00',
      realStart: '2026-11-09 08:15:00',
      plannedQuantityTons: 200.0,
      realizedQuantityTons: 190.0,
      percentualRealizado: 95.0,
      statusOp: 'CONCLUIDA',
      statusMes: 'FINALIZADO_OPERADOR',
      statusSap: 'CONFIRMADA_TOTAL',
    },
    {
      id: 'op-102',
      opNumber: 'OP-100071302',
      materialCode: 'TQ-50X50',
      materialDescription: 'Tubo Quadrado 50x50x2.0mm',
      batchNumber: null,
      productName: 'Tubo Quadrado 50x50',
      scheduledDate: '2026-11-09',
      plannedStart: '2026-11-09 10:00:00',
      realStart: '2026-11-09 10:05:00',
      plannedQuantityTons: 200.0,
      realizedQuantityTons: 190.0,
      percentualRealizado: 95.0,
      statusOp: 'CONCLUIDA',
      statusMes: 'FINALIZADO_OPERADOR',
      statusSap: 'CONFIRMADA_TOTAL',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hierarchyService.fetchRawCenterEfficiencyRows).mockResolvedValue(mockCenters)
    vi.mocked(hierarchyService.fetchOpsForCenter).mockResolvedValue(mockOps)
  })

  it('Critério 1: Não existem mais as colunas Início no Horário e Aderência de Volume na tabela e existe % Realizado', async () => {
    render(<EfficiencyAssertivenessSubpage />)

    await waitFor(() => {
      expect(
        screen.getByText(/Assertividade Operacional por Linha de Produção/i),
      ).toBeInTheDocument()
    })

    // Cabeçalhos que NÃO devem existir na tabela
    expect(
      screen.queryByRole('columnheader', { name: /Início no Horário/i }),
    ).not.toBeInTheDocument()
    // Aderência de Volume card superior pode ter o título, mas a tabela NÃO pode ter coluna Aderência de Volume
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    expect(headers).not.toContain('Início no Horário')
    expect(headers).not.toContain('Aderência de Volume')

    // Cabeçalho % Realizado DEVE existir
    expect(headers).toContain('% Realizado')
  })

  it('Critério 2: Clicar em uma linha expande os centros e clicar de novo recolhe', async () => {
    render(<EfficiencyAssertivenessSubpage />)

    await waitFor(() => {
      expect(screen.getByText('L1')).toBeInTheDocument()
    })

    // Inicialmente os centros NÃO estão visíveis
    expect(screen.queryByText('LAM-01')).not.toBeInTheDocument()

    // Clica na linha L1
    const l1Row = screen.getByText('L1').closest('tr')!
    fireEvent.click(l1Row)

    // Agora os centros de L1 estão visíveis na mesma tabela
    await waitFor(() => {
      expect(screen.getByText('LAM-01')).toBeInTheDocument()
      expect(screen.getByText('Laminador de Desbaste')).toBeInTheDocument()
    })

    // Clica de novo na linha L1 para recolher
    fireEvent.click(l1Row)
    await waitFor(() => {
      expect(screen.queryByText('LAM-01')).not.toBeInTheDocument()
    })
  })

  it('Critério 3: Clicar em um centro expande as Ordens de Produção dele com % Realizado por OP', async () => {
    render(<EfficiencyAssertivenessSubpage />)

    await waitFor(() => {
      expect(screen.getByText('L1')).toBeInTheDocument()
    })

    // Expande a linha L1
    const l1Row = screen.getByText('L1').closest('tr')!
    fireEvent.click(l1Row)

    await waitFor(() => {
      expect(screen.getByText('LAM-01')).toBeInTheDocument()
    })

    // Clica no centro LAM-01
    const centerRow = screen.getByText('LAM-01').closest('tr')!
    fireEvent.click(centerRow)

    // Lazy loading carrega e exibe as OPs
    await waitFor(() => {
      expect(screen.getByText('OP-100071301')).toBeInTheDocument()
      expect(screen.getByText('OP-100071302')).toBeInTheDocument()
    })

    // Verifica que o fetchOpsForCenter foi chamado com o centro correspondente
    expect(hierarchyService.fetchOpsForCenter).toHaveBeenCalledWith(
      'LAM-01',
      'L1',
      expect.anything(),
      expect.anything(),
    )
  })

  it('Critério 4: Com Programado = 0, exibe "—" sem NaN ou erro', async () => {
    render(<EfficiencyAssertivenessSubpage />)

    await waitFor(() => {
      expect(screen.getByText('L1')).toBeInTheDocument()
    })

    // Expande a linha L1 para ver LAM-02 (que tem programado = 0)
    const l1Row = screen.getByText('L1').closest('tr')!
    fireEvent.click(l1Row)

    await waitFor(() => {
      expect(screen.getByText('LAM-02')).toBeInTheDocument()
    })

    const lam02Row = screen.getByText('LAM-02').closest('tr')!
    // Não pode conter NaN, Infinity ou erro
    expect(lam02Row.textContent).not.toContain('NaN')
    expect(lam02Row.textContent).not.toContain('Infinity')
    expect(lam02Row.textContent).toContain('—')
  })

  it('Critério 5: Alteração de filtros recarrega os dados da hierarquia', async () => {
    render(<EfficiencyAssertivenessSubpage />)

    await waitFor(() => {
      expect(hierarchyService.fetchRawCenterEfficiencyRows).toHaveBeenCalledTimes(1)
    })

    // Altera o filtro de linha usando a barra unificada
    const lineSelect = screen.getByLabelText(/Linha Produtiva/i)
    fireEvent.change(lineSelect, { target: { value: 'L1' } })

    await waitFor(() => {
      expect(hierarchyService.fetchRawCenterEfficiencyRows).toHaveBeenCalledTimes(2)
    })
  })
})

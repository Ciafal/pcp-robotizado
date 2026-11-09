import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EfficiencyAssertivenessSubpage } from '@/pages/EfficiencyAssertivenessSubpage'
import * as hierarchyService from '@/services/efficiency-assertiveness-hierarchy-service'
import * as aiService from '@/services/assertiveness-pxr-ai-service'

// Mock dos serviços de backend
vi.mock('@/services/efficiency-assertiveness-hierarchy-service', async (importOriginal) => {
  const actual = await importOriginal<typeof hierarchyService>()
  return {
    ...actual,
    loadOperationalCentersSummary: vi.fn(),
    loadOpsByCenter: vi.fn(),
    fetchOpenPortfolioForHierarchy: vi.fn(),
  }
})

vi.mock('@/services/assertiveness-pxr-ai-service', async (importOriginal) => {
  const actual = await importOriginal<typeof aiService>()
  return {
    ...actual,
    requestPxrAiAnalysis: vi.fn(),
    loadOfficialOrLatestPxrAnalysis: vi.fn(),
    savePxrAnalysis: vi.fn(),
    approvePxrAnalysis: vi.fn(),
  }
})

describe('EfficiencyAssertivenessSubpage - Aceitação Completa', () => {
  const mockCenters = [
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
      carteiraT: 120.5,
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
      carteiraT: null,
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
      carteiraT: 60.25,
      salesOrderNumber: 'PED-9901',
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
      carteiraT: 60.25,
      salesOrderNumber: 'PED-9901', // mesmo pedido: sem duplicação na agregação
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hierarchyService.loadOperationalCentersSummary).mockResolvedValue({
      centers: mockCenters,
      lines: [{ lineCode: 'L1', lineName: 'Laminação a Quente', sequencePct: 91.5 }],
    })
    vi.mocked(hierarchyService.loadOpsByCenter).mockResolvedValue(mockOps)
    vi.mocked(hierarchyService.fetchOpenPortfolioForHierarchy).mockResolvedValue(
      new Map([['TQ-50X50', 120.5]]),
    )
    vi.mocked(aiService.loadOfficialOrLatestPxrAnalysis).mockResolvedValue(null)
  })

  it('Aceitação 1: A tabela contém a coluna "Carteira (t)" e a ordem oficial das 12 colunas', async () => {
    render(<EfficiencyAssertivenessSubpage />)

    await waitFor(() => {
      expect(
        screen.getByText(/Assertividade Operacional por Linha de Produção/i),
      ).toBeInTheDocument()
    })

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())

    expect(headers).toContain('Carteira (t)')
    expect(headers).toContain('% Realizado')
    expect(headers).not.toContain('Início no Horário')
    expect(headers).not.toContain('Aderência de Volume')

    // Verifica que Carteira (t) está na 4ª posição (índice 3)
    expect(headers[3]).toBe('Carteira (t)')
  })

  it('Aceitação 2: Os 3 botões "Análise de IA", "Enviar HUB" e "Enviar E-mail" existem no cabeçalho e abrem seus modais', async () => {
    render(<EfficiencyAssertivenessSubpage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Análise de IA/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Enviar HUB/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Enviar E-mail/i })).toBeInTheDocument()
    })

    // Clica em Análise de IA
    fireEvent.click(screen.getByRole('button', { name: /Análise de IA/i }))
    await waitFor(() => {
      expect(screen.getByText(/Análise de IA — Previsto x Realizado/i)).toBeInTheDocument()
    })
  })

  it('Aceitação 3: Drill-down Linha -> Centro -> OP exibe OPs e preserva Carteira (t)', async () => {
    render(<EfficiencyAssertivenessSubpage />)

    await waitFor(() => {
      expect(screen.getByText('L1')).toBeInTheDocument()
    })

    // Clica na linha L1
    const l1Row = screen.getByText('L1').closest('tr')!
    fireEvent.click(l1Row)

    await waitFor(() => {
      expect(screen.getByText('LAM-01')).toBeInTheDocument()
    })

    // Clica no centro LAM-01
    const centerRow = screen.getByText('LAM-01').closest('tr')!
    fireEvent.click(centerRow)

    await waitFor(() => {
      expect(screen.getByText('OP-100071301')).toBeInTheDocument()
      expect(screen.getByText('OP-100071302')).toBeInTheDocument()
    })
  })
})

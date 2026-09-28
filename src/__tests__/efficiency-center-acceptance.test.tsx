import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EfficiencyCenterCards } from '@/components/control-tower/efficiency/EfficiencyCenterCards'
import { EfficiencyCenterTable } from '@/components/control-tower/efficiency/EfficiencyCenterTable'
import { EfficiencyCenterFiltersBar } from '@/components/control-tower/efficiency/EfficiencyCenterFiltersBar'
import {
  CenterEfficiencySummaryCards,
  CenterEfficiencyRow,
} from '@/services/efficiency-center-service'

describe('Visão Eficiência Centro - Testes de Componentes e Aceitação', () => {
  const mockSummary: CenterEfficiencySummaryCards = {
    totalCenters: 4,
    totalPlannedTons: 500.5,
    totalRealizedTons: 480.25,
    overallAdherencePct: 95.9,
    withinPlannedCount: 3,
    withinPlannedPct: 75.0,
    delayedCount: 1,
    delayedPct: 25.0,
    estimatedImpactTons: 20.25,
  }

  const mockRows: CenterEfficiencyRow[] = [
    {
      centerCode: 'LAM-01',
      centerName: 'Laminação 01',
      lineCode: 'L1',
      lineName: 'Linha 1',
      plantCode: 'DIV',
      companyCode: 'CIAFAL',
      plannedProductCode: 'TQ-50',
      plannedProductName: 'Treliça TQ-50',
      plannedQuantityTons: 250,
      realizedQuantityTons: 245,
      plannedStart: '2025-05-10T07:00:00Z',
      realStart: '2025-05-10T07:10:00Z',
      differenceTons: -5,
      adherencePct: 98.0,
      delayMinutes: 10,
      status: 'DENTRO_PLANEJADO',
      ordersCount: 1,
      programacaoOrigem: {
        scheduleCode: 'PROG-2025-W19',
        version: 2,
        status: 'PUBLICADO',
        totalItems: 3,
      },
      mesAvailable: true,
      details: [
        {
          orderNumber: 'OP-1001',
          productCode: 'TQ-50',
          productDescription: 'Treliça TQ-50 Nervurada',
          scheduledSequence: 1,
          plannedQuantityTons: 250,
          realizedQuantityTons: 245,
          plannedStart: '2025-05-10T07:00:00Z',
          realStart: '2025-05-10T07:10:00Z',
          plannedEnd: '2025-05-10T15:00:00Z',
          realEnd: '2025-05-10T15:05:00Z',
          stopsCount: 1,
          stopsDurationMinutes: 15,
          hasDeviation: false,
          deviationReason: null,
          operationalImpact: null,
          mesStatus: 'CONFIRMADO',
          sapStatus: 'LIBERADO',
          postingsCount: 4,
        },
      ],
    },
    {
      centerCode: 'TRE-02',
      centerName: 'Trefilação 02',
      lineCode: 'L2',
      lineName: 'Linha 2',
      plantCode: 'DIV',
      companyCode: 'CIAFAL',
      plannedProductCode: 'AR-60',
      plannedProductName: 'Arame Recozido 6.0mm',
      plannedQuantityTons: 100,
      realizedQuantityTons: null, // sem apontamento do MES
      plannedStart: '2025-05-10T08:00:00Z',
      realStart: null,
      differenceTons: null,
      adherencePct: null,
      delayMinutes: null,
      status: 'SEM_APONTAMENTO',
      ordersCount: 1,
      programacaoOrigem: {
        scheduleCode: 'PROG-2025-W19',
        version: 2,
        status: 'PUBLICADO',
        totalItems: 1,
      },
      mesAvailable: false,
      details: [],
    },
  ]

  it('renderiza os 7 cards sintéticos com valores e formatação ABNT', () => {
    render(<EfficiencyCenterCards summary={mockSummary} loading={false} />)

    // 1. Centros analisados
    expect(screen.getByText('Centros analisados')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()

    // 2. Produção prevista (500,50 t)
    expect(screen.getByText('Produção prevista')).toBeInTheDocument()
    expect(screen.getByText('500,50 t')).toBeInTheDocument()

    // 3. Produção realizada (480,25 t)
    expect(screen.getByText('Produção realizada')).toBeInTheDocument()
    expect(screen.getByText('480,25 t')).toBeInTheDocument()

    // 4. Aderência ao planejado (95,9%)
    expect(screen.getByText('Aderência ao planejado')).toBeInTheDocument()
    expect(screen.getByText('95,9%')).toBeInTheDocument()

    // 5. Centros no planejado (3 (75,0%))
    expect(screen.getByText('Centros no planejado')).toBeInTheDocument()
    expect(screen.getByText('3 (75,0%)')).toBeInTheDocument()

    // 6. Centros com atraso (1 (25,0%))
    expect(screen.getByText('Centros com atraso')).toBeInTheDocument()
    expect(screen.getByText('1 (25,0%)')).toBeInTheDocument()

    // 7. Impacto estimado (20,25 t)
    expect(screen.getByText('Impacto estimado')).toBeInTheDocument()
    expect(screen.getByText('20,25 t')).toBeInTheDocument()
  })

  it('renderiza os cards em estado quando dado não disponível', () => {
    const emptySummary: CenterEfficiencySummaryCards = {
      totalCenters: 0,
      totalPlannedTons: 0,
      totalRealizedTons: null,
      overallAdherencePct: null,
      withinPlannedCount: 0,
      withinPlannedPct: 0,
      delayedCount: 0,
      delayedPct: 0,
      estimatedImpactTons: 0,
    }
    render(<EfficiencyCenterCards summary={emptySummary} loading={false} />)

    // Deve conter "Dado não disponível" para os campos nulos
    const unavailableElements = screen.getAllByText('Dado não disponível')
    expect(unavailableElements.length).toBeGreaterThanOrEqual(2)
  })

  it('renderiza a tabela analítica com as colunas obrigatórias e status', () => {
    render(
      <EfficiencyCenterTable
        rows={mockRows}
        loading={false}
        activeProgramacaoId="PROG-2025-W19"
        activeProgramacaoVersion={2}
      />,
    )

    // Colunas obrigatórias
    expect(screen.getByText('Centro')).toBeInTheDocument()
    expect(screen.getByText('Linha')).toBeInTheDocument()
    expect(screen.getByText('Produto Previsto')).toBeInTheDocument()
    expect(screen.getByText('Qtd. Prevista')).toBeInTheDocument()
    expect(screen.getByText('Qtd. Realizada')).toBeInTheDocument()
    expect(screen.getByText('Início Previsto')).toBeInTheDocument()
    expect(screen.getByText('Início Real')).toBeInTheDocument()
    expect(screen.getByText('Diferença')).toBeInTheDocument()
    expect(screen.getByText('Aderência')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    // Conteúdo das linhas
    expect(screen.getByText('Laminação 01')).toBeInTheDocument()
    expect(screen.getByText('Trefilação 02')).toBeInTheDocument()
    expect(screen.getByText('Dentro do planejado')).toBeInTheDocument()
    expect(screen.getByText('Sem apontamento')).toBeInTheDocument()

    // Dado não disponível na linha 2 que não tem apontamento
    const unavail = screen.getAllByText('Dado não disponível')
    expect(unavail.length).toBeGreaterThanOrEqual(2)
  })

  it('expande a linha do centro e exibe detalhes operacionais de ordens e paradas', () => {
    render(<EfficiencyCenterTable rows={mockRows} loading={false} />)

    // Detalhes não visíveis antes de expandir
    expect(screen.queryByText('OP-1001')).not.toBeInTheDocument()

    // Clica no botão de expansão da primeira linha
    const expandButtons = screen.getAllByTitle('Expandir detalhes operacionais')
    fireEvent.click(expandButtons[0])

    // Agora deve exibir detalhes da OP
    expect(screen.getByText('OP-1001')).toBeInTheDocument()
    expect(screen.getByText('Treliça TQ-50 Nervurada')).toBeInTheDocument()
    expect(screen.getByText('1 (15 min)')).toBeInTheDocument() // Paradas
  })

  it('exibe estado vazio amigável quando nenhum centro é encontrado', () => {
    render(<EfficiencyCenterTable rows={[]} loading={false} />)
    expect(
      screen.getByText('Nenhum dado encontrado para os filtros selecionados.'),
    ).toBeInTheDocument()
  })

  it('exibe estado de erro e permite tentar novamente', () => {
    const handleRetry = vi.fn()
    render(
      <EfficiencyCenterTable
        rows={[]}
        loading={false}
        error="Falha de rede ao consultar o MES."
        onRetry={handleRetry}
      />,
    )
    expect(
      screen.getByText('Não foi possível carregar a eficiência dos centros'),
    ).toBeInTheDocument()
    expect(screen.getByText('Falha de rede ao consultar o MES.')).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /Tentar novamente/i })
    fireEvent.click(retryBtn)
    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('dispara aplicação e limpeza de filtros', () => {
    const handleApply = vi.fn()
    const handleReset = vi.fn()

    render(
      <EfficiencyCenterFiltersBar
        initialFilters={{
          companyCode: 'ALL',
          plantCode: 'ALL',
          lineCode: 'ALL',
          centerCode: 'ALL',
          status: 'ALL',
        }}
        options={{
          companies: [{ code: 'CIAFAL', name: 'Ciafal Siderurgia' }],
          plants: [{ code: 'DIV', name: 'Divinópolis', companyCode: 'CIAFAL' }],
          lines: [{ code: 'L1', name: 'Linha 1', plantCode: 'DIV' }],
          centers: [{ code: 'LAM-01', name: 'Laminação 01', lineCode: 'L1' }],
        }}
        onApplyFilters={handleApply}
        onResetFilters={handleReset}
      />,
    )

    // Clica em Aplicar filtros
    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i })
    fireEvent.click(applyBtn)
    expect(handleApply).toHaveBeenCalledTimes(1)

    // Clica em Limpar filtros
    const resetBtn = screen.getByRole('button', { name: /Limpar filtros/i })
    fireEvent.click(resetBtn)
    expect(handleReset).toHaveBeenCalledTimes(1)
  })
})

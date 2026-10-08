import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnaliseRealTimeSafePage } from '@/pages/AnaliseRealTimeSafePage'
import { PcpRealtimeAnalysisService } from '@/services/pcp-realtime-analysis-service'
import { PcpRealtimeAiService } from '@/services/pcp-realtime-ai-service'
import {
  RealtimeDataPayload,
  RealtimeProductivityConsolidated,
  RealtimeOrderProductivityItem,
} from '@/types/pcp-realtime-analysis'

describe('Suíte de Aceite — Card e Modal "Produtividade t/h" na Análise Real Time', () => {
  const mockProductivityConsolidated: RealtimeProductivityConsolidated = {
    plannedProductivityTh: 20.0,
    realizedProductivityTh: 18.5,
    deviationTh: -1.5,
    deviationPct: -7.5,
    achievementPct: 92.5,
    totalRealizedTons: 370.0,
    totalPlannedTons: 400.0,
    totalProductiveHours: 20.0,
    totalStoppedHours: 3.5,
    ordersCount: 2,
  }

  const mockOrderProductivityList: RealtimeOrderProductivityItem[] = [
    {
      opNumber: 'OP-2025-001',
      centerCode: 'LAM_01',
      lineCode: 'LAM_01',
      centerName: 'Laminação 01',
      lineName: 'Laminação 01',
      materialCode: 'ACO-1020',
      materialDescription: 'Barra Redonda 1020',
      bitola: 'Ø 25 mm',
      steelGrade: 'SAE 1020',
      plannedQuantityTons: 200.0,
      realizedQuantityTons: 190.0,
      plannedProductivityTh: 20.0,
      realizedProductivityTh: 19.0,
      deviationTh: -1.0,
      deviationPct: -5.0,
      productiveHours: 10.0,
      stoppedHours: 1.5,
      mainStopReason: 'Troca de cilindro',
      status: 'DENTRO_PREVISTO',
      ruleOrigin: 'Ficha Mestra line_productivity_rates',
    },
    {
      opNumber: 'OP-2025-002',
      centerCode: 'LAM_01',
      lineCode: 'LAM_01',
      centerName: 'Laminação 01',
      lineName: 'Laminação 01',
      materialCode: 'ACO-1045',
      materialDescription: 'Barra Chata 1045',
      bitola: '50 x 10 mm',
      steelGrade: 'SAE 1045',
      plannedQuantityTons: 200.0,
      realizedQuantityTons: 180.0,
      plannedProductivityTh: 20.0,
      realizedProductivityTh: 18.0,
      deviationTh: -2.0,
      deviationPct: -10.0,
      productiveHours: 10.0,
      stoppedHours: 2.0,
      mainStopReason: 'Falta de Tarugo',
      status: 'ABAIXO_PREVISTO',
      ruleOrigin: 'Ficha Mestra line_productivity_rates',
    },
  ]

  const mockPayload: RealtimeDataPayload = {
    environment: 'Homologação',
    dataFetchedAt: '2025-05-10T14:30:00.000Z',
    staleThresholdMinutes: 15,
    isStale: false,
    qualityStatus: 'ONLINE',
    qualityMessage: 'Telemetria MES 4.0 e RFC SAP sincronizadas em tempo real.',
    companies: [{ code: 'CIAFAL', name: 'CIAFAL Wilson Santos' }],
    lines: [{ code: 'LAM_01', name: 'Laminação 01', companyCode: 'CIAFAL' }],
    centers: [{ code: 'LAM_01', name: 'Laminação 01', lineCode: 'LAM_01', companyCode: 'CIAFAL' }],
    consolidatedCompany: {
      companyCode: 'CIAFAL',
      companyName: 'CIAFAL Wilson Santos',
      totalCenters: 1,
      centersOperating: 1,
      centersStopped: 0,
      centersInSetup: 0,
      centersScheduledStop: 0,
      centersWithoutSchedule: 0,
      oeePct: 86.4,
      utilizationPct: 89.2,
      metallicYieldPct: 97.5,
      plannedProductionTons: 400.0,
      realizedProductionTons: 370.0,
      achievementPct: 92.5,
      deviationTons: -30.0,
      currentProductionRatePerHour: 18.5,
      totalStoppedTimeSeconds: 12600,
      totalInputTons: 379.48,
      totalGoodTons: 370.0,
      productivityConsolidated: mockProductivityConsolidated,
    },
    linesData: [
      {
        lineCode: 'LAM_01',
        lineName: 'Laminação 01',
        plantCode: 'PL_01',
        plantName: 'Planta Principal',
        companyCode: 'CIAFAL',
        companyName: 'CIAFAL Wilson Santos',
        status: 'NORMAL',
        scheduleSituation: 'SEM_ATRASO',
        realizedTons: 370.0,
        plannedTons: 400.0,
        achievementPct: 92.5,
        oeePct: 86.4,
        utilizationPct: 89.2,
        metallicYieldPct: 97.5,
        currentRatePerHour: 18.5,
        plannedRatePerHour: 20.0,
        currentProduct: 'Barra Redonda 1020',
        accumulatedStopsSeconds: 12600,
        lastUpdated: '2025-05-10T14:30:00.000Z',
        isStale: false,
        centersCount: 0,
        centersRunning: 0,
        centersStopped: 0,
        centers: [],
      },
    ],
    periodRange: {
      period: 'DIA',
      startDate: '2025-05-10',
      endDate: '2025-05-10',
      startDatetimeIso: '2025-05-10T00:00:00.000Z',
      endDatetimeIso: '2025-05-10T23:59:59.999Z',
      label: 'Hoje (10/05/2025)',
      isCurrentPeriodInProgress: true,
      elapsedFractionOfPeriod: 0.6,
    },
    orderProductivityList: mockOrderProductivityList,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValue(mockPayload)
  })

  // 1. O novo card aparece junto aos demais cards da tela
  it('Critério 1 & 2: Card "Produtividade t/h" aparece no grid consolidado com Prevista, Realizada e Desvio', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('card-produtividade-th')).toBeInTheDocument()
    })

    const card = screen.getByTestId('card-produtividade-th')
    expect(card).toHaveTextContent('Produtividade t/h')
    // Realizada consolidada
    expect(card).toHaveTextContent('18,50 t/h')
    // Prevista ponderada
    expect(card).toHaveTextContent('20,00 t/h')
    // Desvio
    expect(card).toHaveTextContent('-1,50 t/h')
    // Atingimento % opcional
    expect(card).toHaveTextContent('92,50 %')
  })

  // 3. Produtividade prevista usa média ponderada das bitolas/ordens (peso = tonelagem planejada)
  it('Critério 3: Produtividade prevista é a média ponderada Σ(cadência × peso) / Σ(pesos)', () => {
    const orders: RealtimeOrderProductivityItem[] = [
      {
        opNumber: 'OP-1',
        centerCode: 'C1',
        lineCode: 'L1',
        materialCode: 'M1',
        materialDescription: 'Material 1',
        bitola: '10 mm',
        steelGrade: '1020',
        plannedQuantityTons: 100.0, // peso 100
        realizedQuantityTons: 90.0,
        plannedProductivityTh: 10.0, // 10 t/h -> 100 * 10 = 1000
        realizedProductivityTh: 9.0,
        deviationTh: -1.0,
        deviationPct: -10.0,
        productiveHours: 10.0,
        stoppedHours: 1.0,
        mainStopReason: '-',
        status: 'DENTRO_PREVISTO',
      },
      {
        opNumber: 'OP-2',
        centerCode: 'C1',
        lineCode: 'L1',
        materialCode: 'M2',
        materialDescription: 'Material 2',
        bitola: '20 mm',
        steelGrade: '1020',
        plannedQuantityTons: 300.0, // peso 300
        realizedQuantityTons: 300.0,
        plannedProductivityTh: 30.0, // 30 t/h -> 300 * 30 = 9000
        realizedProductivityTh: 30.0,
        deviationTh: 0,
        deviationPct: 0,
        productiveHours: 10.0,
        stoppedHours: 0,
        mainStopReason: '-',
        status: 'DENTRO_PREVISTO',
      },
    ]

    // Média ponderada esperada = (1000 + 9000) / 400 = 10000 / 400 = 25.00 t/h
    const consolidated = PcpRealtimeAnalysisService.calculateConsolidatedProductivity(orders)
    expect(consolidated).not.toBeNull()
    expect(consolidated?.plannedProductivityTh).toBe(25.0)
    expect(consolidated?.totalPlannedTons).toBe(400.0)
  })

  // 4. Produtividade realizada = produção real (t) ÷ tempo produtivo real (h)
  it('Critério 4: Produtividade realizada é produção real total (t) ÷ tempo produtivo total (h)', () => {
    const orders: RealtimeOrderProductivityItem[] = [
      {
        opNumber: 'OP-1',
        centerCode: 'C1',
        lineCode: 'L1',
        materialCode: 'M1',
        materialDescription: 'Material 1',
        bitola: '10 mm',
        steelGrade: '1020',
        plannedQuantityTons: 100.0,
        realizedQuantityTons: 150.0, // 150 t
        plannedProductivityTh: 20.0,
        realizedProductivityTh: 15.0,
        deviationTh: -5.0,
        deviationPct: -25.0,
        productiveHours: 10.0, // 10 h
        stoppedHours: 2.0,
        mainStopReason: '-',
        status: 'ABAIXO_PREVISTO',
      },
      {
        opNumber: 'OP-2',
        centerCode: 'C1',
        lineCode: 'L1',
        materialCode: 'M2',
        materialDescription: 'Material 2',
        bitola: '20 mm',
        steelGrade: '1020',
        plannedQuantityTons: 100.0,
        realizedQuantityTons: 250.0, // 250 t
        plannedProductivityTh: 20.0,
        realizedProductivityTh: 25.0,
        deviationTh: 5.0,
        deviationPct: 25.0,
        productiveHours: 10.0, // 10 h
        stoppedHours: 0,
        mainStopReason: '-',
        status: 'ACIMA_PREVISTO',
      },
    ]

    // Realizada = (150 + 250) / (10 + 10) = 400 / 20 = 20.00 t/h
    const consolidated = PcpRealtimeAnalysisService.calculateConsolidatedProductivity(orders)
    expect(consolidated).not.toBeNull()
    expect(consolidated?.realizedProductivityTh).toBe(20.0)
    expect(consolidated?.totalRealizedTons).toBe(400.0)
    expect(consolidated?.totalProductiveHours).toBe(20.0)
  })

  // 4.1 Proteção contra divisão por zero e N/D
  it('Critério 4.1: Retorna N/D quando não há produção ou tempo produtivo, evitando divisão por zero', () => {
    const emptyConsolidated = PcpRealtimeAnalysisService.calculateConsolidatedProductivity([])
    expect(emptyConsolidated).toBeNull()

    const zeroTimeOrder: RealtimeOrderProductivityItem[] = [
      {
        opNumber: 'OP-ZERO',
        centerCode: 'C1',
        lineCode: 'L1',
        materialCode: 'M1',
        materialDescription: 'Material Zero',
        bitola: '10 mm',
        steelGrade: '1020',
        plannedQuantityTons: 0,
        realizedQuantityTons: 0,
        plannedProductivityTh: null,
        realizedProductivityTh: null,
        deviationTh: null,
        deviationPct: null,
        productiveHours: 0,
        stoppedHours: 0,
        mainStopReason: '-',
        status: 'DENTRO_PREVISTO',
      },
    ]

    const cons = PcpRealtimeAnalysisService.calculateConsolidatedProductivity(zeroTimeOrder)
    expect(cons?.plannedProductivityTh).toBeNull()
    expect(cons?.realizedProductivityTh).toBeNull()
    expect(cons?.deviationTh).toBeNull()
  })

  // 5. Card respeita filtros de período, empresa, linha, centro, turno e situação
  it('Critério 5: Ao alterar o filtro de período, a requisição é disparada com o novo período', async () => {
    const fetchSpy = vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData')

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('card-produtividade-th')).toBeInTheDocument()
    })

    const btnSemana = screen.getByTestId('period-filter-SEMANA')
    fireEvent.click(btnSemana)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          period: 'SEMANA',
        }),
      )
    })
  })

  // 6 & 7. Clique no card abre modal com detalhamento por ordem
  it('Critério 6 & 7: Clique no card abre o modal "Detalhamento da Produtividade t/h" exibindo a tabela por OP', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('card-produtividade-th')).toBeInTheDocument()
    })

    const card = screen.getByTestId('card-produtividade-th')
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByTestId('realtime-productivity-detail-modal')).toBeInTheDocument()
    })

    // Título do modal
    expect(screen.getByText('Detalhamento da Produtividade t/h')).toBeInTheDocument()

    // Mini-cards no topo do modal
    expect(screen.getByText('Σ(Cadência×t) / Σt')).toBeInTheDocument()
    expect(screen.getByText('Produção real ÷ tempo')).toBeInTheDocument()

    // OPs na tabela
    expect(screen.getByText('OP-2025-001')).toBeInTheDocument()
    expect(screen.getByText('OP-2025-002')).toBeInTheDocument()
    expect(screen.getByText('Barra Redonda 1020')).toBeInTheDocument()
    expect(screen.getByText('Barra Chata 1045')).toBeInTheDocument()
    expect(screen.getByText('Troca de cilindro')).toBeInTheDocument()
    expect(screen.getByText('Falta de Tarugo')).toBeInTheDocument()
  })

  // 8. Modal apresenta análises por IA baseadas em paradas e desvios reais
  it('Critério 8: Painel de Análise IA Orientativa de 7 blocos está presente e exibe causas reais e correlações', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('card-produtividade-th')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('card-produtividade-th'))

    await waitFor(() => {
      expect(screen.getByTestId('realtime-productivity-detail-modal')).toBeInTheDocument()
    })

    // Aguardar o carregamento assíncrono da IA
    await waitFor(
      () => {
        expect(screen.getByText(/Análise IA Orientativa de Produtividade/i)).toBeInTheDocument()
        expect(screen.getByText(/1\. Resumo Executivo/i)).toBeInTheDocument()
        expect(screen.getByText(/2\. Ordens com Maior Desvio Negativo/i)).toBeInTheDocument()
        expect(screen.getByText(/3\. Ordens com Melhor Desempenho/i)).toBeInTheDocument()
        expect(screen.getByText(/4\. Principais Causas Prováveis de Perda/i)).toBeInTheDocument()
        expect(screen.getByText(/5\. Correlação com Paradas Operacionais/i)).toBeInTheDocument()
        expect(screen.getByText(/6\. Impacto Operacional Estimado/i)).toBeInTheDocument()
        expect(screen.getByText(/7\. Ações Recomendadas Orientativas/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  // 9. Sem dados suficientes para a IA, responde exatamente o texto sem alucinar
  it('Critério 9: IA responde "Sem dados suficientes para concluir a causa com segurança." quando faltam evidências', () => {
    const emptyAnalysis = PcpRealtimeAiService.generateProductivityAnalysis({
      consolidated: null,
      orders: [],
    })

    expect(emptyAnalysis.hasSufficientData).toBe(false)
    expect(emptyAnalysis.insufficientDataReason).toBe(
      'Sem dados suficientes para concluir a causa com segurança.',
    )
    expect(emptyAnalysis.executiveSummary).toBe(
      'Sem dados suficientes para concluir a causa com segurança.',
    )
  })

  // 10. Botões Fechar, Exportar Excel e Exportar PDF funcionam sem erro
  it('Critério 10: Botões de ação do cabeçalho do modal têm handlers ativos', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('card-produtividade-th')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('card-produtividade-th'))

    await waitFor(() => {
      expect(screen.getByTestId('realtime-productivity-detail-modal')).toBeInTheDocument()
    })

    // Botões no cabeçalho
    expect(screen.getByRole('button', { name: /Exportar Excel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exportar PDF/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Atualizar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fechar/i })).toBeInTheDocument()

    // Testar clique em Fechar fecha o modal
    fireEvent.click(screen.getByRole('button', { name: /Fechar/i }))
    await waitFor(() => {
      expect(screen.queryByTestId('realtime-productivity-detail-modal')).not.toBeInTheDocument()
    })
  })
})

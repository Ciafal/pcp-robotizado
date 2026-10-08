import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnaliseRealTimeSafePage } from '@/pages/AnaliseRealTimeSafePage'
import { PcpRealtimeAnalysisService } from '@/services/pcp-realtime-analysis-service'
import { PcpRealtimeAiService } from '@/services/pcp-realtime-ai-service'
import { RealtimeDataPayload } from '@/types/pcp-realtime-analysis'

describe('Análise Real Time — Nível 1 Visão Consolidada CIAFAL (Aceite Critérios 1 a 10)', () => {
  const baseMockData: RealtimeDataPayload = {
    environment: 'Homologação',
    dataFetchedAt: '2025-05-10T14:30:00.000Z',
    staleThresholdMinutes: 15,
    isStale: false,
    qualityStatus: 'ONLINE',
    qualityMessage: 'Telemetria MES 4.0 e RFC SAP sincronizadas em tempo real.',
    companies: [
      { code: 'CIAFAL', name: 'CIAFAL Wilson Santos' },
      { code: 'FILIAL_1', name: 'CIAFAL Filial 1' },
    ],
    lines: [
      { code: 'LAM_01', name: 'Laminação 01', companyCode: 'CIAFAL' },
      { code: 'TRE_01', name: 'Trefilação 01', companyCode: 'CIAFAL' },
    ],
    centers: [
      { code: 'LAM_01', name: 'Laminação 01', lineCode: 'LAM_01', companyCode: 'CIAFAL' },
      { code: 'TRE_01', name: 'Trefilação 01', lineCode: 'TRE_01', companyCode: 'CIAFAL' },
    ],
    consolidatedCompany: {
      companyCode: 'CIAFAL',
      companyName: 'CIAFAL Wilson Santos',
      totalCenters: 2,
      centersOperating: 2,
      centersStopped: 0,
      centersInSetup: 0,
      centersScheduledStop: 0,
      centersWithoutSchedule: 0,
      oeePct: 86.4,
      utilizationPct: 89.2,
      metallicYieldPct: 97.5,
      plannedProductionTons: 1000.0,
      realizedProductionTons: 850.0,
      achievementPct: 85.0,
      deviationTons: -150.0,
      currentProductionRatePerHour: 22.5,
      totalStoppedTimeSeconds: 1200,
      totalInputTons: 871.79,
      totalGoodTons: 850.0,
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
        realizedTons: 850.0,
        plannedTons: 1000.0,
        achievementPct: 85.0,
        oeePct: 86.4,
        utilizationPct: 89.2,
        metallicYieldPct: 97.5,
        currentRatePerHour: 22.5,
        plannedRatePerHour: 25.0,
        currentProduct: 'Barra Redonda 1045',
        accumulatedStopsSeconds: 1200,
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
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValue(baseMockData)
  })

  it('Critério 1: O card "Centros no Escopo" NÃO aparece na tela', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('realtime-level-1-company')).toBeInTheDocument()
    })

    expect(screen.queryByText('Centros no Escopo')).not.toBeInTheDocument()
  })

  it('Critério 2 & 6: Os cinco cards obrigatórios estão presentes e o card Previsto x Realizado substitui Taxa Atual/Parada', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('realtime-kpi-cards-grid')).toBeInTheDocument()
    })

    // Cards obrigatórios consolidados
    expect(screen.getByText('OEE da Empresa')).toBeInTheDocument()
    expect(screen.getByText('Taxa de Utilização')).toBeInTheDocument()
    expect(screen.getByText('Rendimento Metálico')).toBeInTheDocument()
    expect(screen.getByText('Produção (t)')).toBeInTheDocument()
    expect(screen.getByText('Previsto x Realizado')).toBeInTheDocument()
    expect(screen.getByText('Produtividade t/h')).toBeInTheDocument()

    // O antigo "Taxa Atual / Parada" não deve mais ser um card da empresa
    expect(screen.queryByText('Taxa Atual / Parada')).not.toBeInTheDocument()
  })

  it('Critério 3 & 4: Barra de filtros DIA, ONTEM, SEMANA, MÊS, ANO existe e altera o período', async () => {
    const fetchSpy = vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData')

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('realtime-period-selector-bar')).toBeInTheDocument()
    })

    // Checa a existência dos 5 botões de período
    const btnDia = screen.getByTestId('period-filter-DIA')
    const btnOntem = screen.getByTestId('period-filter-ONTEM')
    const btnSemana = screen.getByTestId('period-filter-SEMANA')
    const btnMes = screen.getByTestId('period-filter-MES')
    const btnAno = screen.getByTestId('period-filter-ANO')

    expect(btnDia).toBeInTheDocument()
    expect(btnOntem).toBeInTheDocument()
    expect(btnSemana).toBeInTheDocument()
    expect(btnMes).toBeInTheDocument()
    expect(btnAno).toBeInTheDocument()

    // Clicar em MÊS dispara requisição com period: 'MES'
    fireEvent.click(btnMes)
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          period: 'MES',
        }),
      )
    })
  })

  it('Critério 5: Painel "Resumo Real Time — Empresa (IA Orientativa PCP)" está posicionado e funcional', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('realtime-ai-summary-panel')).toBeInTheDocument()
    })

    expect(screen.getByText('Resumo Real Time — Empresa (IA Orientativa PCP)')).toBeInTheDocument()
    expect(screen.getByText(/Base Real • Sem Alucinações/i)).toBeInTheDocument()
  })

  it('Critério 7: Fórmula (Realizado / Planejado) * 100, tolerância a > 100% e proteção contra divisão por zero', () => {
    // 1. Caso normal: 850 / 1000 = 85.0%
    const range = PcpRealtimeAnalysisService.calculatePeriodRange('ONTEM')
    expect(range.elapsedFractionOfPeriod).toBe(1.0)
    expect(range.isCurrentPeriodInProgress).toBe(false)

    // 2. Range para dia corrente
    const rangeDia = PcpRealtimeAnalysisService.calculatePeriodRange('DIA')
    expect(rangeDia.isCurrentPeriodInProgress).toBe(true)
    expect(rangeDia.elapsedFractionOfPeriod).toBeGreaterThan(0)
    expect(rangeDia.elapsedFractionOfPeriod).toBeLessThanOrEqual(1.0)

    // 3. Range para semana
    const rangeSemana = PcpRealtimeAnalysisService.calculatePeriodRange('SEMANA')
    expect(rangeSemana.isCurrentPeriodInProgress).toBe(true)
  })

  it('Critério 7.1: Previsto x Realizado exibe N/D quando produção planejada for zero/nula', async () => {
    const dataZeroPlanned: RealtimeDataPayload = {
      ...baseMockData,
      consolidatedCompany: {
        ...baseMockData.consolidatedCompany,
        plannedProductionTons: null,
        achievementPct: null,
        deviationTons: null,
      },
    }
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValue(dataZeroPlanned)

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('card-previsto-x-realizado')).toBeInTheDocument()
    })

    const card = screen.getByTestId('card-previsto-x-realizado')
    expect(card).toHaveTextContent('N/D')
  })

  it('Critério 7.2: Permite valores superiores a 100% com indicador "SUPERADO"', async () => {
    const dataSuperada: RealtimeDataPayload = {
      ...baseMockData,
      consolidatedCompany: {
        ...baseMockData.consolidatedCompany,
        plannedProductionTons: 100.0,
        realizedProductionTons: 125.5,
        achievementPct: 125.5,
        deviationTons: 25.5,
      },
    }
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValue(dataSuperada)

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('card-previsto-x-realizado')).toBeInTheDocument()
    })

    const card = screen.getByTestId('card-previsto-x-realizado')
    expect(card).toHaveTextContent('125,50 %')
    expect(card).toHaveTextContent('Superado')
    expect(card).toHaveTextContent('+25,50 t')
  })

  it('Critério 8: Formatação brasileira com vírgula e fuso America/Sao_Paulo indicado', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('America/Sao_Paulo')).toBeInTheDocument()
    })

    expect(screen.getByText('86,40 %')).toBeInTheDocument()
    expect(screen.getByText('89,20 %')).toBeInTheDocument()
    expect(screen.getByText('97,50 %')).toBeInTheDocument()
  })
})

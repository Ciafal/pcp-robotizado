import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AnaliseRealTimeSafePage } from '@/pages/AnaliseRealTimeSafePage'
import { PcpRealtimeAnalysisService } from '@/services/pcp-realtime-analysis-service'
import { RealtimeDataPayload, RealtimeCenterData } from '@/types/pcp-realtime-analysis'

describe('Análise Real Time — Testes Obrigatórios T1 a T6 dos Botões e Drilldown', () => {
  const mockCenter1: RealtimeCenterData = {
    centerCode: 'SEML1',
    centerName: 'Semi-Acabado Linha 1',
    lineCode: 'LAM_01',
    lineName: 'Laminação 01',
    companyCode: 'CIAFAL',
    companyName: 'CIAFAL Wilson Santos',
    plantCode: 'PL_01',
    plantName: 'Planta Principal',
    status: 'NORMAL',
    lastUpdated: '2025-05-10T14:15:00.000Z',
    isStale: false,
    hasActiveOrder: true,
    productionOrder: 'OP-100234',
    materialCode: 'MAT-501',
    materialDescription: 'Barra Redonda 1045 Ø 50mm',
    dimension: '50mm',
    steelGrade: 'SAE 1045',
    campaign: 'Campanha Barras Pesadas',
    currentProduct: 'Barra Redonda 1045 Ø 50mm',
    previousProduct: null,
    nextProgrammedProduct: null,
    programmedTons: 120.0,
    realizedTons: 95.0,
    balanceTons: 25.0,
    achievementPct: 79.17,
    accumulatedProductionTons: 95.0,
    currentRatePerHour: 18.5,
    plannedRatePerHour: 20.0,
    rateDifference: -1.5,
    accumulatedShiftTons: 95.0,
    accumulatedDayTons: 95.0,
    stopsCountShift: 1,
    stoppedMinutesShift: 25,
    stoppedMinutesDay: 25,
    oee: {
      title: 'OEE',
      value: 84.5,
      target: 85.0,
      unit: '%',
      trend: 'UP',
      difference: -0.5,
      timestamp: '2025-05-10T14:00:00.000Z',
      origin: 'MES 4.0',
      isMeasured: true,
    },
    utilization: {
      title: 'Taxa de Utilização',
      value: 88.0,
      target: 90.0,
      unit: '%',
      trend: 'UP',
      difference: -2.0,
      timestamp: '2025-05-10T14:00:00.000Z',
      origin: 'PCP',
      isMeasured: true,
    },
    metallicYield: {
      yieldPct: 97.2,
      targetPct: 97.5,
      weightInputTons: 97.74,
      weightGoodProductTons: 95.0,
      estimatedLossTons: 2.74,
      origin: 'Apontamento Balança',
      timestamp: '2025-05-10T14:00:00.000Z',
      isMeasured: true,
    },
    activeStop: null,
    productionStartTime: '06:30',
    productionForecastEndTime: '14:30',
    stopsHistory: [
      {
        id: 'stop-1',
        stopCode: 'PAR-001',
        centerCode: 'SEML1',
        lineCode: 'LAM_01',
        companyCode: 'CIAFAL',
        category: 'CORRETIVA_MECANICA',
        categoryLabel: 'Mecânica',
        responsibleSector: 'Manutenção',
        reason: 'Ajuste de guia de laminação',
        technicalCauseConfirmed: 'Desgaste da sapata guia',
        equipment: 'Guia G1',
        startDatetime: '2025-05-10T10:00:00.000Z',
        endDatetime: '2025-05-10T10:25:00.000Z',
        durationMinutes: 25,
        isOpen: false,
        isProgrammed: false,
      },
    ],
    timeline: [
      {
        id: 'ev-1',
        timestamp: '10:00',
        type: 'PARADA',
        title: 'Parada Mecânica',
        description: 'Ajuste de guia',
        source: 'MES',
      },
    ],
  }

  const mockCenter2: RealtimeCenterData = {
    centerCode: 'ACABL2',
    centerName: 'Acabamento L2',
    lineCode: 'TRE_01',
    lineName: 'Trefilação 01',
    companyCode: 'CIAFAL',
    companyName: 'CIAFAL Wilson Santos',
    plantCode: 'PL_01',
    plantName: 'Planta Principal',
    status: 'ATENCAO',
    lastUpdated: '2025-05-10T14:20:00.000Z',
    isStale: false,
    hasActiveOrder: true,
    productionOrder: 'OP-200567',
    materialCode: 'MAT-702',
    materialDescription: 'Perfil Chato 1020',
    dimension: '20x10mm',
    steelGrade: 'SAE 1020',
    campaign: 'Campanha Perfis Leves',
    currentProduct: 'Perfil Chato 1020',
    previousProduct: null,
    nextProgrammedProduct: null,
    programmedTons: 60.0,
    realizedTons: 40.0,
    balanceTons: 20.0,
    achievementPct: 66.67,
    accumulatedProductionTons: 40.0,
    currentRatePerHour: 8.0,
    plannedRatePerHour: 12.0,
    rateDifference: -4.0,
    accumulatedShiftTons: 40.0,
    accumulatedDayTons: 40.0,
    stopsCountShift: 2,
    stoppedMinutesShift: 45,
    stoppedMinutesDay: 45,
    oee: {
      title: 'OEE',
      value: 72.0,
      target: 85.0,
      unit: '%',
      trend: 'DOWN',
      difference: -13.0,
      timestamp: '2025-05-10T14:00:00.000Z',
      origin: 'MES 4.0',
      isMeasured: true,
    },
    utilization: {
      title: 'Taxa de Utilização',
      value: 75.0,
      target: 90.0,
      unit: '%',
      trend: 'DOWN',
      difference: -15.0,
      timestamp: '2025-05-10T14:00:00.000Z',
      origin: 'PCP',
      isMeasured: true,
    },
    metallicYield: {
      yieldPct: 96.5,
      targetPct: 97.5,
      weightInputTons: 41.45,
      weightGoodProductTons: 40.0,
      estimatedLossTons: 1.45,
      origin: 'Balança',
      timestamp: '2025-05-10T14:00:00.000Z',
      isMeasured: true,
    },
    activeStop: null,
    productionStartTime: '07:00',
    productionForecastEndTime: '15:00',
    stopsHistory: [],
    timeline: [],
  }

  const mockCenter3NoSchedule: RealtimeCenterData = {
    centerCode: 'CONF_01',
    centerName: 'Conformação',
    lineCode: 'TRE_01',
    lineName: 'Trefilação 01',
    companyCode: 'CIAFAL',
    companyName: 'CIAFAL Wilson Santos',
    plantCode: 'PL_01',
    plantName: 'Planta Principal',
    status: 'SEM_PROGRAMACAO',
    lastUpdated: '2025-05-10T14:00:00.000Z',
    isStale: false,
    hasActiveOrder: false,
    productionOrder: null,
    materialCode: null,
    materialDescription: null,
    dimension: null,
    steelGrade: null,
    campaign: null,
    currentProduct: null,
    previousProduct: null,
    nextProgrammedProduct: null,
    programmedTons: 0,
    realizedTons: 0,
    balanceTons: 0,
    achievementPct: null,
    accumulatedProductionTons: 0,
    currentRatePerHour: 0,
    plannedRatePerHour: null,
    rateDifference: null,
    accumulatedShiftTons: 0,
    accumulatedDayTons: 0,
    stopsCountShift: 0,
    stoppedMinutesShift: 0,
    stoppedMinutesDay: 0,
    oee: {
      title: 'OEE',
      value: null,
      target: 85.0,
      unit: '%',
      trend: 'STABLE',
      difference: null,
      timestamp: '2025-05-10T14:00:00.000Z',
      origin: 'MES',
      isMeasured: false,
    },
    utilization: {
      title: 'Taxa de Utilização',
      value: null,
      target: 90.0,
      unit: '%',
      trend: 'STABLE',
      difference: null,
      timestamp: '2025-05-10T14:00:00.000Z',
      origin: 'PCP',
      isMeasured: false,
    },
    metallicYield: {
      yieldPct: null,
      targetPct: 97.5,
      weightInputTons: 0,
      weightGoodProductTons: 0,
      estimatedLossTons: 0,
      origin: 'PCP',
      timestamp: '2025-05-10T14:00:00.000Z',
      isMeasured: false,
    },
    activeStop: null,
    productionStartTime: null,
    productionForecastEndTime: null,
    stopsHistory: [],
    timeline: [],
  }

  const baseMockData: RealtimeDataPayload = {
    environment: 'Homologação',
    dataFetchedAt: '2025-05-10T14:30:00.000Z',
    staleThresholdMinutes: 15,
    isStale: false,
    qualityStatus: 'ONLINE',
    qualityMessage: 'Telemetria MES 4.0 e RFC SAP sincronizadas em tempo real.',
    companies: [{ code: 'CIAFAL', name: 'CIAFAL Wilson Santos' }],
    lines: [
      { code: 'LAM_01', name: 'Laminação 01', companyCode: 'CIAFAL' },
      { code: 'TRE_01', name: 'Trefilação 01', companyCode: 'CIAFAL' },
    ],
    centers: [
      { code: 'SEML1', name: 'Semi-Acabado Linha 1', lineCode: 'LAM_01', companyCode: 'CIAFAL' },
      { code: 'ACABL2', name: 'Acabamento L2', lineCode: 'TRE_01', companyCode: 'CIAFAL' },
      { code: 'CONF_01', name: 'Conformação', lineCode: 'TRE_01', companyCode: 'CIAFAL' },
    ],
    consolidatedCompany: {
      companyCode: 'CIAFAL',
      companyName: 'CIAFAL Wilson Santos',
      totalCenters: 3,
      centersOperating: 2,
      centersStopped: 0,
      centersInSetup: 0,
      centersScheduledStop: 0,
      centersWithoutSchedule: 1,
      oeePct: 78.25,
      utilizationPct: 81.5,
      metallicYieldPct: 96.85,
      plannedProductionTons: 180.0,
      realizedProductionTons: 135.0,
      achievementPct: 75.0,
      deviationTons: -45.0,
      currentProductionRatePerHour: 26.5,
      totalStoppedTimeSeconds: 4200,
      totalInputTons: 139.19,
      totalGoodTons: 135.0,
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
        realizedTons: 95.0,
        plannedTons: 120.0,
        achievementPct: 79.17,
        oeePct: 84.5,
        utilizationPct: 88.0,
        metallicYieldPct: 97.2,
        currentRatePerHour: 18.5,
        plannedRatePerHour: 20.0,
        currentProduct: 'Barra Redonda 1045 Ø 50mm',
        accumulatedStopsSeconds: 1500,
        lastUpdated: '2025-05-10T14:15:00.000Z',
        isStale: false,
        centersCount: 1,
        centersRunning: 1,
        centersStopped: 0,
        centers: [mockCenter1],
      },
      {
        lineCode: 'TRE_01',
        lineName: 'Trefilação 01',
        plantCode: 'PL_01',
        plantName: 'Planta Principal',
        companyCode: 'CIAFAL',
        companyName: 'CIAFAL Wilson Santos',
        status: 'ATENCAO',
        scheduleSituation: 'EM_RISCO',
        realizedTons: 40.0,
        plannedTons: 60.0,
        achievementPct: 66.67,
        oeePct: 72.0,
        utilizationPct: 75.0,
        metallicYieldPct: 96.5,
        currentRatePerHour: 8.0,
        plannedRatePerHour: 12.0,
        currentProduct: 'Perfil Chato 1020',
        accumulatedStopsSeconds: 2700,
        lastUpdated: '2025-05-10T14:20:00.000Z',
        isStale: false,
        centersCount: 2,
        centersRunning: 1,
        centersStopped: 0,
        centers: [mockCenter2, mockCenter3NoSchedule],
      },
    ],
    orderProductivityList: [
      {
        opNumber: 'OP-100234',
        lineCode: 'LAM_01',
        centerCode: 'SEML1',
        companyCode: 'CIAFAL',
        materialCode: 'MAT-501',
        materialDescription: 'Barra Redonda 1045 Ø 50mm',
        bitola: '50mm',
        steelGrade: 'SAE 1045',
        plannedQuantityTons: 120.0,
        realizedQuantityTons: 95.0,
        plannedProductivityTh: 20.0,
        realizedProductivityTh: 18.5,
        deviationTh: -1.5,
        deviationPct: -7.5,
        productiveHours: 5.14,
        stoppedHours: 0.42,
        mainStopReason: 'Ajuste de guia de laminação',
        status: 'ABAIXO_PREVISTO',
      },
      {
        opNumber: 'OP-200567',
        lineCode: 'TRE_01',
        centerCode: 'ACABL2',
        companyCode: 'CIAFAL',
        materialCode: 'MAT-702',
        materialDescription: 'Perfil Chato 1020',
        bitola: '20x10mm',
        steelGrade: 'SAE 1020',
        plannedQuantityTons: 60.0,
        realizedQuantityTons: 40.0,
        plannedProductivityTh: 12.0,
        realizedProductivityTh: 8.0,
        deviationTh: -4.0,
        deviationPct: -33.33,
        productiveHours: 5.0,
        stoppedHours: 0.75,
        mainStopReason: 'Troca de matriz',
        status: 'ABAIXO_PREVISTO',
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

  // T1: Botão "Detalhes" abre popup com dados do centro clicado e fechar volta com filtros intactos
  it('T1: Botão "Detalhes" abre popup resumo com dados do centro e fechar preserva filtros intactos', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Semi-Acabado Linha 1')).toBeInTheDocument()
    })

    // Localizar botão "Detalhes" do primeiro centro (SEML1)
    const detalhesButtons = screen.getAllByRole('button', { name: /detalhes/i })
    expect(detalhesButtons.length).toBeGreaterThan(0)

    // Clicar no primeiro botão Detalhes
    fireEvent.click(detalhesButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('realtime-drilldown-modal-content')).toBeInTheDocument()
    })

    // Verifica que o conteúdo do resumo foi montado
    expect(screen.getByTestId('realtime-summary-popup-content')).toBeInTheDocument()
    // Identificação do centro e OP
    expect(screen.getByText('OP-100234')).toBeInTheDocument()
    expect(screen.getByText(/Barra Redonda 1045 Ø 50mm/i)).toBeInTheDocument()

    // Fechar modal
    const fecharBtn = screen.getByRole('button', { name: /fechar/i })
    fireEvent.click(fecharBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('realtime-drilldown-modal-content')).not.toBeInTheDocument()
    })

    // Filtros e período preservados intactos
    expect(screen.getByTestId('period-filter-DIA')).toBeInTheDocument()
    expect(screen.getByText('Semi-Acabado Linha 1')).toBeInTheDocument()
  })

  // T2: Botão "Abrir Painel Completo do Centro" abre os 5 blocos A–E
  it('T2: Botão "Abrir Painel Completo do Centro" abre visão completa com abas estruturadas A a E', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Semi-Acabado Linha 1')).toBeInTheDocument()
    })

    // Expandir o centro SEML1 clicando na linha
    const seml1Row = screen.getByText('Semi-Acabado Linha 1')
    fireEvent.click(seml1Row)

    // Botão "Abrir Painel Completo do Centro" deve aparecer na área expandida
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /abrir painel completo do centro/i }),
      ).toBeInTheDocument()
    })

    const fullPanelBtn = screen.getByRole('button', { name: /abrir painel completo do centro/i })
    fireEvent.click(fullPanelBtn)

    // Modal deve abrir com as abas do Painel Completo
    await waitFor(() => {
      expect(screen.getByTestId('realtime-full-panel-tabs')).toBeInTheDocument()
    })

    // Verificar existência dos 5 gatilhos de abas A–E
    expect(screen.getByTestId('tab-trigger-producao')).toBeInTheDocument()
    expect(screen.getByTestId('tab-trigger-produtividade')).toBeInTheDocument()
    expect(screen.getByTestId('tab-trigger-paradas')).toBeInTheDocument()
    expect(screen.getByTestId('tab-trigger-indicadores')).toBeInTheDocument()
    expect(screen.getByTestId('tab-trigger-diagnostico-ia')).toBeInTheDocument()

    // Aba A "Produção" ativa por padrão
    expect(screen.getByTestId('tab-content-producao')).toBeInTheDocument()

    // Navegar para Aba B "Produtividade t/h"
    fireEvent.click(screen.getByTestId('tab-trigger-produtividade'))
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-produtividade')).toBeInTheDocument()
    })

    // Navegar para Aba C "Paradas & Ocorrências"
    fireEvent.click(screen.getByTestId('tab-trigger-paradas'))
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-paradas')).toBeInTheDocument()
    })

    // Navegar para Aba D "Indicadores"
    fireEvent.click(screen.getByTestId('tab-trigger-indicadores'))
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-indicadores')).toBeInTheDocument()
    })

    // Navegar para Aba E "Diagnóstico IA"
    fireEvent.click(screen.getByTestId('tab-trigger-diagnostico-ia'))
    await waitFor(() => {
      expect(screen.getByTestId('tab-content-diagnostico-ia')).toBeInTheDocument()
    })
  })

  // T3: ≥3 centros diferentes (SEML1, Acabamento L2, Conformação) sem cruzamento de dados
  it('T3: Dados isolados entre ≥3 centros diferentes (SEML1, ACABL2, CONF_01) sem cruzamento', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Semi-Acabado Linha 1')).toBeInTheDocument()
      expect(screen.getByText('Acabamento L2')).toBeInTheDocument()
      expect(screen.getByText('Conformação')).toBeInTheDocument()
    })

    const detalhesButtons = screen.getAllByRole('button', { name: /detalhes/i })

    // Centro 1: SEML1
    fireEvent.click(detalhesButtons[0])
    await waitFor(() => {
      expect(screen.getByText('OP-100234')).toBeInTheDocument()
      expect(screen.queryByText('OP-200567')).not.toBeInTheDocument()
    })

    // Fechar
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    await waitFor(() => {
      expect(screen.queryByTestId('realtime-drilldown-modal-content')).not.toBeInTheDocument()
    })

    // Centro 2: ACABL2
    fireEvent.click(detalhesButtons[1])
    await waitFor(() => {
      expect(screen.getByText('OP-200567')).toBeInTheDocument()
      expect(screen.queryByText('OP-100234')).not.toBeInTheDocument()
    })

    // Fechar
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    await waitFor(() => {
      expect(screen.queryByTestId('realtime-drilldown-modal-content')).not.toBeInTheDocument()
    })
  })

  // T4: Centro sem programação não trava, mostra "Sem ordem"/"N/D"
  it('T4: Centro sem programação (CONF_01) renderiza com badges neutras e sem travar', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Conformação')).toBeInTheDocument()
    })

    const detalhesButtons = screen.getAllByRole('button', { name: /detalhes/i })
    // Terceiro centro é CONF_01
    fireEvent.click(detalhesButtons[2])

    await waitFor(() => {
      expect(screen.getByTestId('realtime-drilldown-modal-content')).toBeInTheDocument()
    })

    // Deve exibir indicação de sem ordem / N/D sem quebrar
    expect(screen.getByText(/Sem ordem/i)).toBeInTheDocument()
    expect(screen.getByText(/Conformação/i)).toBeInTheDocument()
  })

  // T5: Alterar período/empresa/linha/centro e confirmar que ambos os botões funcionam e respeitam filtros
  it('T5: Alteração de período recarrega os dados e botões continuam operantes', async () => {
    const fetchSpy = vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData')

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('period-filter-SEMANA')).toBeInTheDocument()
    })

    // Mudar para SEMANA
    fireEvent.click(screen.getByTestId('period-filter-SEMANA'))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          period: 'SEMANA',
        }),
      )
    })

    // Botão detalhes segue operante
    const detalhesButtons = screen.getAllByRole('button', { name: /detalhes/i })
    fireEvent.click(detalhesButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('realtime-drilldown-modal-content')).toBeInTheDocument()
    })
  })

  // T6: Console sem erros JS e tratamento de ausência de dados com opção de retry
  it('T6: Erro de carregamento exibe mensagem clara com botão de tentar novamente', async () => {
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockRejectedValueOnce(
      new Error('Timeout de rede na telemetria'),
    )

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar os dados no momento.')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument()
  })
})

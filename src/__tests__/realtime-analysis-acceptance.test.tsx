import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { officialNavGroups } from '@/components/layout/PCPNavigation'
import { RealtimeAnalysisPage } from '@/pages/RealtimeAnalysisPage'
import { PcpRealtimeAnalysisService } from '@/services/pcp-realtime-analysis-service'
import { PcpRealtimeAiService } from '@/services/pcp-realtime-ai-service'
import { RealtimeDataPayload } from '@/types/pcp-realtime-analysis'

// Mock de dados representativos para teste de aceitação
const mockPayload: RealtimeDataPayload = {
  environment: 'Produção',
  dataFetchedAt: '2026-10-07T10:42:18.000Z',
  staleThresholdMinutes: 15,
  isStale: false,
  qualityStatus: 'ONLINE',
  qualityMessage: 'Telemetria MES 4.0 conectada',
  companies: [
    { code: 'CIAFAL', name: 'CIAFAL Wilson Santos' },
    { code: 'KS-FERRADURA', name: 'KS - Ferradura' },
  ],
  lines: [
    { code: 'L1', name: 'Linha 1 — Laminação', companyCode: 'CIAFAL' },
    { code: 'L2', name: 'Linha 2 — Perfis Pesados', companyCode: 'CIAFAL' },
  ],
  centers: [
    { code: 'SEML1', name: 'L1 (SEML1)', lineCode: 'L1', companyCode: 'CIAFAL' },
    { code: 'LAML2', name: 'L2 (LAML2)', lineCode: 'L2', companyCode: 'CIAFAL' },
  ],
  consolidatedCompany: {
    companyCode: 'CIAFAL',
    companyName: 'CIAFAL Wilson Santos',
    totalCenters: 2,
    centersOperating: 1,
    centersStopped: 1,
    centersInSetup: 0,
    centersScheduledStop: 0,
    centersWithoutSchedule: 0,
    oeePct: 86.5,
    utilizationPct: 91.2,
    metallicYieldPct: 97.55,
    plannedProductionTons: 350.0,
    realizedProductionTons: 360.5,
    achievementPct: 103.0,
    deviationTons: 10.5,
    currentProductionRatePerHour: 25.5,
    totalStoppedTimeSeconds: 1500,
    totalInputTons: 370.0,
    totalGoodTons: 360.5,
  },
  linesData: [
    {
      lineCode: 'L1',
      lineName: 'Linha 1 — Laminação',
      companyCode: 'CIAFAL',
      companyName: 'CIAFAL Wilson Santos',
      plantCode: 'DIV',
      plantName: 'Planta Divinópolis',
      status: 'NORMAL',
      scheduleSituation: 'ADIANTADA',
      realizedTons: 180.0,
      plannedTons: 175.0,
      achievementPct: 102.86,
      oeePct: 88.4,
      utilizationPct: 92.0,
      metallicYieldPct: 97.6,
      currentRatePerHour: 13.5,
      plannedRatePerHour: 12.5,
      currentProduct: 'Tubo Industrial 50x50',
      accumulatedStopsSeconds: 0,
      lastUpdated: '2026-10-07T10:42:18.000Z',
      isStale: false,
      centersCount: 1,
      centersRunning: 1,
      centersStopped: 0,
      centers: [
        {
          centerCode: 'SEML1',
          centerName: 'Linha 1 — Laminação',
          lineCode: 'L1',
          lineName: 'Linha 1 — Laminação',
          companyCode: 'CIAFAL',
          companyName: 'CIAFAL Wilson Santos',
          plantCode: 'DIV',
          plantName: 'Planta Divinópolis',
          status: 'NORMAL',
          lastUpdated: '2026-10-07T10:42:18.000Z',
          isStale: false,
          hasActiveOrder: true,
          productionOrder: 'OP-2025-0891',
          materialCode: 'TUB-50-50',
          materialDescription: 'Tubo Industrial 50x50',
          dimension: '50 x 50 mm',
          steelGrade: 'SAE 1020',
          campaign: 'Campanha Q3/2026',
          currentProduct: 'Tubo Industrial 50x50',
          previousProduct: 'Barra Chata 2"',
          nextProgrammedProduct: 'Perfil U 3"',
          productionStartTime: '07:15:00',
          productionForecastEndTime: '16:00:00',
          programmedTons: 175.0,
          realizedTons: 180.0,
          balanceTons: -5.0,
          achievementPct: 102.86,
          accumulatedProductionTons: 180.0,
          plannedRatePerHour: 12.5,
          currentRatePerHour: 13.5,
          rateDifference: 1.0,
          accumulatedShiftTons: 180.0,
          accumulatedDayTons: 180.0,
          oee: {
            title: 'OEE',
            value: 88.4,
            target: 85.0,
            unit: '%',
            difference: 3.4,
            trend: 'UP',
            origin: 'MES 4.0 / Apontamento Real',
            timestamp: '2026-10-07T10:42:18.000Z',
            isMeasured: true,
          },
          utilization: {
            title: 'Taxa de Utilização',
            value: 92.0,
            target: 88.0,
            unit: '%',
            difference: 4.0,
            trend: 'UP',
            origin: 'PCP / Horas Produtivas',
            timestamp: '2026-10-07T10:42:18.000Z',
            isMeasured: true,
          },
          metallicYield: {
            weightInputTons: 184.4,
            weightGoodProductTons: 180.0,
            yieldPct: 97.6,
            targetPct: 97.44,
            estimatedLossTons: 4.4,
            origin: 'Apontamento MES',
            timestamp: '2026-10-07T10:42:18.000Z',
            isMeasured: true,
          },
          activeStop: null,
          stopsCountShift: 0,
          stoppedMinutesShift: 0,
          stoppedMinutesDay: 0,
          stopsHistory: [],
          timeline: [
            {
              id: 't-1',
              timestamp: '07:00:00',
              type: 'INICIO_TURNO',
              title: 'Início de Turno',
              description: 'Turno 1 iniciado',
              source: 'PCP',
            },
          ],
        },
      ],
    },
    {
      lineCode: 'L2',
      lineName: 'Linha 2 — Perfis Pesados',
      companyCode: 'CIAFAL',
      companyName: 'CIAFAL Wilson Santos',
      plantCode: 'CTG',
      plantName: 'Planta Contagem',
      status: 'CRITICO',
      scheduleSituation: 'ATRASADA',
      realizedTons: 180.5,
      plannedTons: 175.0,
      achievementPct: 103.14,
      oeePct: 84.6,
      utilizationPct: 90.4,
      metallicYieldPct: 97.5,
      currentRatePerHour: 12.0,
      plannedRatePerHour: 25.0,
      currentProduct: 'Perfil I 6"',
      accumulatedStopsSeconds: 1500,
      lastUpdated: '2026-10-07T10:42:18.000Z',
      isStale: false,
      centersCount: 1,
      centersRunning: 0,
      centersStopped: 1,
      centers: [
        {
          centerCode: 'LAML2',
          centerName: 'Linha 2 — Perfis Pesados',
          lineCode: 'L2',
          lineName: 'Linha 2 — Perfis Pesados',
          companyCode: 'CIAFAL',
          companyName: 'CIAFAL Wilson Santos',
          plantCode: 'CTG',
          plantName: 'Planta Contagem',
          status: 'CRITICO',
          lastUpdated: '2026-10-07T10:42:18.000Z',
          isStale: false,
          hasActiveOrder: true,
          productionOrder: 'OP-2025-0902',
          materialCode: 'PERF-I-6',
          materialDescription: 'Perfil I 6" Standard',
          dimension: '150 x 75 mm',
          steelGrade: 'ASTM A36',
          campaign: 'Campanha Vigas',
          currentProduct: 'Perfil I 6"',
          previousProduct: 'Perfil U 4"',
          nextProgrammedProduct: 'Perfil I 8"',
          productionStartTime: '07:30:00',
          productionForecastEndTime: '17:00:00',
          programmedTons: 175.0,
          realizedTons: 180.5,
          balanceTons: -5.5,
          achievementPct: 103.14,
          accumulatedProductionTons: 180.5,
          plannedRatePerHour: 25.0,
          currentRatePerHour: 0.0,
          rateDifference: -25.0,
          accumulatedShiftTons: 180.5,
          accumulatedDayTons: 180.5,
          oee: {
            title: 'OEE',
            value: 84.6,
            target: 85.0,
            unit: '%',
            difference: -0.4,
            trend: 'DOWN',
            origin: 'MES 4.0 / Apontamento Real',
            timestamp: '2026-10-07T10:42:18.000Z',
            isMeasured: true,
          },
          utilization: {
            title: 'Taxa de Utilização',
            value: 90.4,
            target: 88.0,
            unit: '%',
            difference: 2.4,
            trend: 'UP',
            origin: 'PCP / Horas Produtivas',
            timestamp: '2026-10-07T10:42:18.000Z',
            isMeasured: true,
          },
          metallicYield: {
            weightInputTons: 185.1,
            weightGoodProductTons: 180.5,
            yieldPct: 97.5,
            targetPct: 97.0,
            estimatedLossTons: 4.6,
            origin: 'Apontamento MES',
            timestamp: '2026-10-07T10:42:18.000Z',
            isMeasured: true,
          },
          activeStop: {
            id: 'st-01',
            stopCode: 'STP-20261007-01',
            centerCode: 'LAML2',
            lineCode: 'L2',
            companyCode: 'CIAFAL',
            startDatetime: '2026-10-07T10:15:00.000Z',
            durationMinutes: 27,
            isOpen: true,
            category: 'CORRETIVA_MECANICA',
            categoryLabel: 'Corretiva Mecânica',
            responsibleSector: 'Manutenção Mecânica',
            reason: 'Embuchamento e aquecimento de mancal',
            isProgrammed: false,
          },
          stopsCountShift: 1,
          stoppedMinutesShift: 27,
          stoppedMinutesDay: 27,
          stopsHistory: [],
          timeline: [],
        },
      ],
    },
  ],
}

describe('Suíte de Aceitação: Análise Real Time — PCP Robotizado', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValue(mockPayload)
  })

  it('1. Item "Análise real time" existe exatamente no menu PRINCIPAL e preserva Principal e Torre de Controle', () => {
    const principalGroup = officialNavGroups.find((g) => g.groupTitle === 'PRINCIPAL')
    expect(principalGroup).toBeDefined()
    expect(principalGroup?.items).toHaveLength(3)

    const titles = principalGroup?.items.map((i) => i.title)
    expect(titles).toEqual(['Principal', 'Torre de Controle', 'Análise real time'])

    const realtimeItem = principalGroup?.items.find((i) => i.title === 'Análise real time')
    expect(realtimeItem?.href).toBe('/pcp/analise-real-time')
  })

  it('2. Tela renderiza com Título "Análise Real Time — PCP", Subtítulo e Indicadores do Cabeçalho', async () => {
    render(
      <BrowserRouter>
        <RealtimeAnalysisPage />
      </BrowserRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Acompanhamento operacional de empresas, linhas e centros produtivos'),
    ).toBeInTheDocument()

    expect(screen.getByText(/Ambiente: Produção/i)).toBeInTheDocument()
    expect(screen.getByText(/Atualizado às/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Atualizar/i })).toBeInTheDocument()
  })

  it('3. Nível 1 — Visão Consolidada da Empresa exibe os cards obrigatórios e respeita formatação pt-BR', async () => {
    render(
      <BrowserRouter>
        <RealtimeAnalysisPage />
      </BrowserRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('realtime-level-1-company')).toBeInTheDocument()
    })

    expect(screen.getByText('Centros no Escopo')).toBeInTheDocument()
    expect(screen.getByText('OEE da Empresa')).toBeInTheDocument()
    expect(screen.getByText('Taxa de Utilização')).toBeInTheDocument()
    expect(screen.getByText('Rendimento Metálico')).toBeInTheDocument()

    // Valida formatação de vírgula decimal pt-BR
    expect(screen.getByText('86,50 %')).toBeInTheDocument()
    expect(screen.getByText('91,20 %')).toBeInTheDocument()
    expect(screen.getByText('97,55 %')).toBeInTheDocument()
  })

  it('4. Permite atingimento acima de 100% com texto "Previsto: 103,00 %"', async () => {
    render(
      <BrowserRouter>
        <RealtimeAnalysisPage />
      </BrowserRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('realtime-level-3-centers')).toBeInTheDocument()
    })

    // No centro L2 atingimento é 103,14 %
    expect(screen.getByText(/Previsto: 103,14 %/i)).toBeInTheDocument()
  })

  it('5. Resumo Operacional IA é determinístico, sem inventar dados, separando fatos de alertas', () => {
    const summary = PcpRealtimeAiService.generateCompanySummary(
      mockPayload.consolidatedCompany,
      mockPayload.linesData,
    )

    expect(summary.level).toBe('EMPRESA')
    expect(summary.factualPoints.length).toBeGreaterThan(0)
    expect(summary.calculatedAlerts.length).toBeGreaterThan(0)
    expect(summary.aiInterpretations.length).toBe(3) // 3 maiores pontos de atenção do PCP
    expect(summary.nextActionAdvice).toBeTruthy()
  })

  it('6. Drill-down abre modal com 94% viewport desktop ao clicar em detalhes de centro', async () => {
    render(
      <BrowserRouter>
        <RealtimeAnalysisPage />
      </BrowserRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Detalhes/i })[0]).toBeInTheDocument()
    })

    const detailButtons = screen.getAllByRole('button', { name: /Detalhes/i })
    fireEvent.click(detailButtons[0])

    await waitFor(() => {
      const modal = screen.getByTestId('realtime-drilldown-modal-content')
      expect(modal).toBeInTheDocument()
      expect(modal.className).toContain('w-[94vw]')
      expect(modal.className).toContain('h-[94vh]')
    })
  })
})

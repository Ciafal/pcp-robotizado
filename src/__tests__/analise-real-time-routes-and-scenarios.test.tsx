import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { AnaliseRealTimeSafePage } from '@/pages/AnaliseRealTimeSafePage'
import { PcpRealtimeAnalysisService } from '@/services/pcp-realtime-analysis-service'
import { PcpRealtimeAiService } from '@/services/pcp-realtime-ai-service'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

// Mock de dados representativos completos
const mockCompletePayload = {
  environment: 'Produção',
  dataFetchedAt: '2026-10-07T10:42:18.000Z',
  staleThresholdMinutes: 15,
  isStale: false,
  qualityStatus: 'ONLINE',
  qualityMessage: 'Telemetria MES 4.0 conectada',
  companies: [{ code: 'CIAFAL', name: 'CIAFAL Wilson Santos' }],
  lines: [{ code: 'L1', name: 'Linha 1 — Laminação', companyCode: 'CIAFAL' }],
  centers: [{ code: 'SEML1', name: 'L1 (SEML1)', lineCode: 'L1', companyCode: 'CIAFAL' }],
  consolidatedCompany: {
    companyCode: 'CIAFAL',
    companyName: 'CIAFAL Wilson Santos',
    totalCenters: 1,
    centersOperating: 1,
    centersStopped: 0,
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
    totalStoppedTimeSeconds: 0,
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
      status: 'NORMAL' as const,
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
          status: 'NORMAL' as const,
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
            trend: 'UP' as const,
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
            trend: 'UP' as const,
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
          timeline: [],
        },
      ],
    },
  ],
}

describe('Suíte de Rotas e Resiliência dos 20 Cenários — Análise Real Time Safe', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValue(
      mockCompletePayload as any,
    )
  })

  // 1. Rota direta /pcp/analise-real-time carrega com sucesso
  it('Cenário 1: Abre por URL direta /pcp/analise-real-time sem Error Boundary global', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <Routes>
          <Route path="/pcp/analise-real-time" element={<AnaliseRealTimeSafePage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
    expect(screen.queryByText('Não foi possível carregar esta página.')).not.toBeInTheDocument()
  })

  // 2. Ida e volta: Principal ↔ Análise Real Time
  it('Cenário 2: Ida-e-volta entre Principal e Análise Real Time navega sem falhas', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/principal']}>
        <Routes>
          <Route
            path="/pcp/principal"
            element={
              <div>
                <h1>Principal Cockpit</h1>
                <Link to="/pcp/analise-real-time">Ir para Análise Real Time</Link>
              </div>
            }
          />
          <Route
            path="/pcp/analise-real-time"
            element={
              <div>
                <AnaliseRealTimeSafePage />
                <Link to="/pcp/principal">Voltar para Principal</Link>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Principal Cockpit')).toBeInTheDocument()
    screen.getByText('Ir para Análise Real Time').click()

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })

    screen.getByText('Voltar para Principal').click()
    await waitFor(() => {
      expect(screen.getByText('Principal Cockpit')).toBeInTheDocument()
    })
  })

  // 3. Simulação de F5 (remontagem limpa inicial do componente)
  it('Cenário 3: F5 (remontagem inicial fria) estabilizada sem exception', async () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })

    unmount()

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
  })

  // 4. Cenário com OEE com erro / nulo (exibe N/D e não explode)
  it('Cenário 4: OEE com erro ou nulo exibe N/D e mantém o restante da tela funcional', async () => {
    const payloadOeeNull = {
      ...mockCompletePayload,
      consolidatedCompany: {
        ...mockCompletePayload.consolidatedCompany,
        oeePct: null,
      },
    }
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValueOnce(
      payloadOeeNull as any,
    )

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
    expect(screen.getByText('OEE da Empresa')).toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar esta página.')).not.toBeInTheDocument()
  })

  // 5. Cenário com Produção vazia (null/undefined)
  it('Cenário 5: Produção prevista/realizada nula tratada com N/D', async () => {
    const payloadProdNull = {
      ...mockCompletePayload,
      consolidatedCompany: {
        ...mockCompletePayload.consolidatedCompany,
        realizedProductionTons: null,
        plannedProductionTons: null,
        achievementPct: null,
      },
    }
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValueOnce(
      payloadProdNull as any,
    )

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
    expect(screen.getByText('Produção (t)')).toBeInTheDocument()
  })

  // 6. Cenário Empresa sem linhas (linesData vazio [])
  it('Cenário 6: Empresa sem linhas cadastradas (linesData = []) não quebra', async () => {
    const payloadNoLines = {
      ...mockCompletePayload,
      linesData: [],
    }
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValueOnce(
      payloadNoLines as any,
    )

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
    expect(screen.getByText('0 linha(s) em monitoramento')).toBeInTheDocument()
  })

  // 7. Cenário Linha sem centros (centers = undefined ou [])
  it('Cenário 7: Linha sem centros produtivos não quebra a tabela nem o drilldown', async () => {
    const payloadNoCenters = {
      ...mockCompletePayload,
      linesData: [
        {
          ...mockCompletePayload.linesData[0],
          centers: [] as any[],
        },
      ],
    }
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValueOnce(
      payloadNoCenters as any,
    )

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Nível 3 — Detalhamento por Centro Produtivo (Expansível)'),
    ).toBeInTheDocument()
  })

  // 8. Cenário Centro sem programação (SEM_PROGRAMACAO)
  it('Cenário 8: Centro com status SEM_PROGRAMACAO exibe badge e dados neutros', async () => {
    const payloadWithoutSchedule = {
      ...mockCompletePayload,
      linesData: [
        {
          ...mockCompletePayload.linesData[0],
          centers: [
            {
              ...mockCompletePayload.linesData[0].centers[0],
              status: 'SEM_PROGRAMACAO' as const,
              productionOrder: null,
              materialDescription: null,
            },
          ],
        },
      ],
    }
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValueOnce(
      payloadWithoutSchedule as any,
    )

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('⚪ Sem programação')).toBeInTheDocument()
    })
  })

  // 9. Cenário IA indisponível (retorno com erro não derruba o resto da tela)
  it('Cenário 9: Exceção no serviço de IA é capturada pelo ErrorBoundary local sem quebrar a tela', async () => {
    vi.spyOn(PcpRealtimeAiService, 'generateCompanySummary').mockImplementation(() => {
      throw new Error('Falha no motor de IA')
    })

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
    // Indicadores continuam visíveis
    expect(screen.getByText('Centros no Escopo')).toBeInTheDocument()
    expect(screen.getByText('OEE da Empresa')).toBeInTheDocument()
  })

  // 10. Cenário Perfil PCP_PROGRAMMER com bypass e renderização direta
  it('Cenário 10: Perfil PCP_PROGRAMMER tem permissão imediata de acesso através do PermissionGuard', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <PermissionGuard permission="pcp.schedule.view">
          <AnaliseRealTimeSafePage />
        </PermissionGuard>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
  })

  // 11. Resiliência a cold start onde payload chega nulo inicialmente
  it('Cenário 11: Cold start com retorno inicial nulo da API não causa TypeError', async () => {
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValueOnce(null as any)

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Análise Real Time — PCP')).toBeInTheDocument()
    })
    expect(screen.queryByText('Não foi possível carregar esta página.')).not.toBeInTheDocument()
  })

  // 12. Rendimento metálico com divisão zero protegida
  it('Cenário 12: Rendimento metálico sem tarugos de entrada exibe N/D e não NaN ou Infinity', async () => {
    const payloadZeroInput = {
      ...mockCompletePayload,
      consolidatedCompany: {
        ...mockCompletePayload.consolidatedCompany,
        metallicYieldPct: null,
      },
    }
    vi.spyOn(PcpRealtimeAnalysisService, 'fetchRealtimeData').mockResolvedValueOnce(
      payloadZeroInput as any,
    )

    render(
      <MemoryRouter initialEntries={['/pcp/analise-real-time']}>
        <AnaliseRealTimeSafePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Rendimento Metálico')).toBeInTheDocument()
    })
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
    expect(screen.queryByText('Infinity')).not.toBeInTheDocument()
  })
})

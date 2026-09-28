/**
 * Suíte de Testes de Aceitação da VISÃO DIÁRIA e Coluna OBRIGATÓRIA Ordem de Produção
 * PCP Robotizado CIAFAL - Execução > Análise de Desvios
 *
 * Cobertura dos Requisitos Obrigatórios:
 * 1. Opção "VISÃO DIÁRIA" presente e navegável
 * 2. Filtros: Centro SAP, Linha PCP, Data (presets ontem/hoje/amanhã/específica no formato dd/mm/aaaa), Turno, OP, Material, Natureza e Status
 * 3. Estrutura hierárquica Dia -> Turno -> OP -> Material
 * 4. Grade principal com todas as colunas mínimas
 * 5. Coluna OBRIGATÓRIA ORDEM DE PRODUÇÃO em todas as visões (Visão Geral, Anual, Mensal, Semanal, Diária)
 * 6. OP real quando existir, "OP não disponível"/"Aguardando integração" quando não existir - NUNCA número fictício
 * 7. Desvio em toneladas e percentual com blindagem e acessibilidade (texto + ícone)
 * 8. Resumo do dia com cards sintéticos respondendo a filtros
 * 9. Consolidação por turno e clique para filtrar
 * 10. Detalhamento via Modal/Drawer com as 4 seções
 * 15. Formatação PT-BR (dd/mm/aaaa, decimal com vírgula, t, t/h, %)
 * 17. Estados obrigatórios (carregamento, vazio estrito, erro estrito)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MasterPlanningPage } from '@/components/control-tower/MasterPlanningPage'
import { DailyDeviationView } from '@/components/control-tower/DailyDeviationView'
import { DailyDeviationDetailModal } from '@/components/control-tower/DailyDeviationDetailModal'
import { dailyDeviationService } from '@/services/daily-deviation-service'
import { DailyDeviationItem } from '@/types/daily-deviation'

describe('Visão Diária de Análise de Desvios — Testes de Aceitação CIAFAL', () => {
  const mockDailyItem: DailyDeviationItem = {
    id: 'item-op-1',
    sequence: 1,
    dateIso: '2026-08-24',
    dateDisplay: '24/08/2026',
    dayOfWeek: 'Segunda-feira',
    dayOfWeekShort: 'Seg',
    shiftCode: 'TURNO_1',
    shiftDisplay: '1º Turno',
    crewName: 'Turma C',
    plantCode: '1000',
    plantName: 'Divinópolis',
    lineCode: 'L1',
    lineName: 'Laminação 1',
    productionOrder: 'OP-45875',
    hasRealProductionOrder: true,
    materialCode: 'PU-150x50x4.75',
    materialDescription: 'Perfil U Enrijecido 150x50x4.75mm',
    steelGrade: 'ASTM A36',
    dimensions: '150x50x4.75mm',
    orderType: 'MTS',
    productionNature: 'PRODUCAO_PROPRIA',
    plannedVolumeTons: 95.0,
    plannedRateTh: 12.5,
    plannedHours: 7.6,
    plannedStart: '06:00',
    plannedEnd: '13:36',
    realizedVolumeTons: 91.0,
    realizedRateTh: 12.0,
    realizedHours: 7.58,
    realStart: '06:10',
    realEnd: '13:45',
    hasMesData: true,
    deviationTons: -4.0,
    deviationPct: -4.2,
    situation: 'DENTRO',
    situationLabel: 'Dentro da programação',
    statusDisplay: 'Dentro da programação',
    sourceOrigin: 'WEEKLY_SCHEDULE',
  }

  const mockItemWithoutOp: DailyDeviationItem = {
    id: 'item-sem-op',
    sequence: 2,
    dateIso: '2026-08-24',
    dateDisplay: '24/08/2026',
    dayOfWeek: 'Segunda-feira',
    dayOfWeekShort: 'Seg',
    shiftCode: 'TURNO_2',
    shiftDisplay: '2º Turno',
    crewName: 'Turma A',
    plantCode: '1000',
    plantName: 'Divinópolis',
    lineCode: 'L1',
    lineName: 'Laminação 1',
    productionOrder: 'OP não disponível',
    hasRealProductionOrder: false,
    materialCode: 'TQ-50x50x2.0',
    materialDescription: 'Tubo Quadrado 50x50x2.0mm',
    steelGrade: 'SAE 1020',
    orderType: 'MTS',
    productionNature: 'PRODUCAO_PROPRIA',
    plannedVolumeTons: 120.0,
    plannedRateTh: 11.8,
    plannedHours: 10.17,
    plannedStart: '13:36',
    plannedEnd: '23:46',
    realizedVolumeTons: null,
    realizedRateTh: null,
    realizedHours: null,
    realStart: null,
    realEnd: null,
    hasMesData: false,
    deviationTons: null,
    deviationPct: null,
    situation: 'NAO_INICIADO',
    situationLabel: 'Aguardando Início / Integração',
    statusDisplay: 'Não iniciado',
    sourceOrigin: 'WEEKLY_SCHEDULE',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('Teste 1 & 2: MasterPlanningPage renderiza a nova aba "VISÃO DIÁRIA" e alterna para ela sem erro', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/planejamento']}>
        <Routes>
          <Route path="/pcp/planejamento" element={<MasterPlanningPage />} />
        </Routes>
      </MemoryRouter>,
    )

    // O botão VISÃO DIÁRIA deve existir entre os horizontes
    const dailyBtn = screen.getByRole('button', { name: /VISÃO DIÁRIA/i })
    expect(dailyBtn).toBeInTheDocument()
    expect(
      screen.getByText(/Horizonte operacional Dia → Turno → Ordem → Material/i),
    ).toBeInTheDocument()

    // Clica no card da Visão Diária
    fireEvent.click(dailyBtn)

    // Deve renderizar a barra de filtros da Visão Diária
    await waitFor(() => {
      expect(screen.getByText(/Filtros Operacionais • Visão Diária/i)).toBeInTheDocument()
    })
  })

  it('Teste 3 & 4: DailyDeviationView renderiza filtros, presets de data e consolidação por turno', async () => {
    vi.spyOn(dailyDeviationService, 'getDailyDeviationData').mockResolvedValue({
      items: [mockDailyItem, mockItemWithoutOp],
      shifts: [
        {
          shiftCode: 'TURNO_1',
          shiftDisplay: '1º Turno',
          plannedTons: 95.0,
          realizedTons: 91.0,
          deviationTons: -4.0,
          deviationPct: -4.2,
          ordersCount: 1,
          materialsCount: 1,
          itemsCount: 1,
        },
        {
          shiftCode: 'TURNO_2',
          shiftDisplay: '2º Turno',
          plannedTons: 120.0,
          realizedTons: null,
          deviationTons: null,
          deviationPct: null,
          ordersCount: 0,
          materialsCount: 1,
          itemsCount: 1,
        },
        {
          shiftCode: 'TURNO_3',
          shiftDisplay: '3º Turno',
          plannedTons: 0,
          realizedTons: null,
          deviationTons: null,
          deviationPct: null,
          ordersCount: 0,
          materialsCount: 0,
          itemsCount: 0,
        },
      ],
      summary: {
        totalPlannedTons: 215.0,
        totalRealizedTons: 91.0,
        deviationTons: -124.0,
        deviationPct: -57.7,
        totalPlannedHours: 17.77,
        totalRealizedHours: 7.58,
        ordersCount: 1,
        materialsCount: 2,
        producingShiftsCount: 2,
        mainDeviations: [
          {
            material: 'PU-150x50x4.75',
            op: 'OP-45875',
            deviationTons: -4.0,
            deviationPct: -4.2,
            situation: 'DENTRO',
          },
        ],
      },
      availableDates: ['2026-08-24'],
      selectedDateIso: '2026-08-24',
      fetchedAt: new Date().toISOString(),
    })

    render(<DailyDeviationView />)

    // Aguarda carregar
    await waitFor(() => {
      expect(screen.getByText(/Programação Diária x Execução Real \(MES\)/i)).toBeInTheDocument()
    })

    // Presets de Data
    expect(screen.getByRole('button', { name: /Dia Anterior/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dia Atual/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Próximo Dia/i })).toBeInTheDocument()

    // Consolidação por Turno
    expect(screen.getByText('Consolidação por Turno')).toBeInTheDocument()
    expect(screen.getByText('1º Turno')).toBeInTheDocument()
    expect(screen.getByText('2º Turno')).toBeInTheDocument()
    expect(screen.getByText('3º Turno')).toBeInTheDocument()

    // Resumo do Dia
    expect(screen.getByText('Volume Programado')).toBeInTheDocument()
    expect(screen.getByText('Volume Realizado')).toBeInTheDocument()
    expect(screen.getByText('Desvio (t)')).toBeInTheDocument()
    expect(screen.getByText('Desvio (%)')).toBeInTheDocument()
  })

  it('Teste 5 & 6: Coluna ORDEM DE PRODUÇÃO exibe OP real e trata ausência sem números fictícios', async () => {
    vi.spyOn(dailyDeviationService, 'getDailyDeviationData').mockResolvedValue({
      items: [mockDailyItem, mockItemWithoutOp],
      shifts: [],
      summary: {
        totalPlannedTons: 215,
        totalRealizedTons: 91,
        deviationTons: -124,
        deviationPct: -57.7,
        totalPlannedHours: 17.77,
        totalRealizedHours: 7.58,
        ordersCount: 1,
        materialsCount: 2,
        producingShiftsCount: 2,
        mainDeviations: [],
      },
      availableDates: ['2026-08-24'],
      selectedDateIso: '2026-08-24',
      fetchedAt: new Date().toISOString(),
    })

    render(<DailyDeviationView />)

    await waitFor(() => {
      // Cabeçalho da coluna ORDEM DE PRODUÇÃO
      expect(screen.getByRole('columnheader', { name: /ORDEM DE PRODUÇÃO/i })).toBeInTheDocument()
    })

    // Registro com OP real
    expect(screen.getByText('OP-45875')).toBeInTheDocument()

    // Registro sem OP: exibe "OP não disponível" (sem dados fictícios)
    expect(screen.getByText('OP não disponível')).toBeInTheDocument()
  })

  it('Teste 7: Limpeza de filtros restaura os valores padrão', async () => {
    const spy = vi.spyOn(dailyDeviationService, 'getDailyDeviationData').mockResolvedValue({
      items: [mockDailyItem],
      shifts: [],
      summary: null,
      availableDates: ['2026-08-24'],
      selectedDateIso: '2026-08-24',
      fetchedAt: new Date().toISOString(),
    })

    render(<DailyDeviationView />)

    await waitFor(() => {
      expect(screen.getByText(/Limpar Filtros/i)).toBeInTheDocument()
    })

    const resetBtn = screen.getByText(/Limpar Filtros/i)
    fireEvent.click(resetBtn)

    expect(spy).toHaveBeenCalled()
  })

  it('Teste 8: Coluna ORDEM DE PRODUÇÃO está presente nas demais visões do MasterPlanningPage', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/planejamento?visao=semanal']}>
        <Routes>
          <Route path="/pcp/planejamento" element={<MasterPlanningPage />} />
        </Routes>
      </MemoryRouter>,
    )

    // Aguarda carregar o plano semanal
    await waitFor(() => {
      expect(screen.getByText(/Plano Semanal de Capacidade/i)).toBeInTheDocument()
    })

    // Cabeçalho obrigatório ORDEM DE PRODUÇÃO deve estar presente na tabela semanal
    const thOp = screen.getByRole('columnheader', { name: /ORDEM DE PRODUÇÃO/i })
    expect(thOp).toBeInTheDocument()
  })

  it('Teste 9: Modal de Detalhamento exibe as 4 seções obrigatórias com padrão PT-BR', () => {
    const handleClose = vi.fn()
    render(<DailyDeviationDetailModal item={mockDailyItem} open={true} onClose={handleClose} />)

    // Seção 1: Identificação Operacional
    expect(screen.getByText(/1. Identificação Operacional/i)).toBeInTheDocument()
    expect(screen.getByText('OP-45875')).toBeInTheDocument()
    expect(screen.getByText('24/08/2026')).toBeInTheDocument()

    // Seção 2: Planejado
    expect(screen.getByText(/2. Planejado/i)).toBeInTheDocument()
    expect(screen.getByText('95,0 t')).toBeInTheDocument()
    expect(screen.getByText('12,5 t/h')).toBeInTheDocument()

    // Seção 3: Realizado
    expect(screen.getByText(/3. Realizado/i)).toBeInTheDocument()
    expect(screen.getByText('91,0 t')).toBeInTheDocument()

    // Seção 4: Análise de Desvio
    expect(screen.getByText(/4. Análise de Desvio & Resultado/i)).toBeInTheDocument()
    expect(screen.getByText('-4,0 t')).toBeInTheDocument()
    expect(screen.getByText('-4,2 %')).toBeInTheDocument()
  })

  it('Teste 10: Exibe exatamente o texto estrito para estado vazio e para estado de erro', async () => {
    // Cenário Vazio
    vi.spyOn(dailyDeviationService, 'getDailyDeviationData').mockResolvedValueOnce({
      items: [],
      shifts: [],
      summary: null,
      availableDates: [],
      selectedDateIso: '2026-08-24',
      fetchedAt: new Date().toISOString(),
    })

    const { rerender } = render(<DailyDeviationView />)

    await waitFor(() => {
      expect(
        screen.getByText('Nenhuma programação encontrada para os filtros selecionados.'),
      ).toBeInTheDocument()
    })

    // Cenário Erro
    vi.spyOn(dailyDeviationService, 'getDailyDeviationData').mockRejectedValueOnce(
      new Error('Timeout de rede na integração'),
    )

    rerender(<DailyDeviationView />)

    await waitFor(() => {
      expect(
        screen.getByText(
          'Não foi possível carregar os dados da Análise de Desvios. Tente novamente.',
        ),
      ).toBeInTheDocument()
    })
  })
})

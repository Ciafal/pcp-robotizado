import { describe, it, expect } from 'vitest'
import { MonthlyScheduleEngine, MONTH_WEEKS_2026_AUG } from '@/services/monthly-schedule-engine'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

describe('ETAPA 5 — Visão Mensal (Programação Mensal) Engine & Integração', () => {
  const mockWeeklyItems: WeeklyScheduleItem[] = [
    {
      id: 'item-demo-1',
      schedule_code: 'WS-L1-2026-W35',
      company_code: 'CIAFAL',
      plant_code: 'PLANTA_1',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: '24/08 a 30/08/2026',
      day_of_week: 'SEG',
      date_str: '24/08',
      shift_code: 'T1_L1',
      shift_name: '1º Turno Matutino',
      crew_name: 'Turma A',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'TQ-50x50x2.0',
      material_description: 'Tubo Quadrado 50x50x2.0mm',
      steel_grade: 'SAE 1020',
      order_type: 'MTS',
      planned_quantity_tons: 120,
      productivity_rate_th: 28.2,
      production_hours: 4.25,
      setup_duration_minutes: 0,
      start_datetime: '2026-08-24 06:00',
      end_datetime: '2026-08-24 10:15',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 126.0,
    },
    {
      id: 'item-demo-2',
      schedule_code: 'WS-L1-2026-W35',
      company_code: 'CIAFAL',
      plant_code: 'PLANTA_1',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: '24/08 a 30/08/2026',
      day_of_week: 'SEG',
      date_str: '24/08',
      shift_code: 'T1_L1',
      shift_name: '1º Turno Matutino',
      crew_name: 'Turma A',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'TR-60x30x2.0',
      material_description: 'Tubo Retangular 60x30x2.0mm',
      steel_grade: 'SAE 1020',
      order_type: 'MTO',
      planned_quantity_tons: 70,
      productivity_rate_th: 5.82,
      production_hours: 3.25,
      setup_duration_minutes: 20,
      start_datetime: '2026-08-24 10:35',
      end_datetime: '2026-08-24 14:00',
      status: 'AGUARDANDO_OBSERVACOES',
      awaiting_observations: {
        is_awaiting: true,
        reason: 'Validação de tolerância dimensional pelo cliente',
        observation: 'Pedido MTO retido',
        responsible: 'Comercial / PCP',
        date_time: '2026-08-24 08:30',
      },
      version: 1,
      raw_material_req_tons: 73.5,
    },
  ]

  it('1. Deve cobrir exatamente as 5 semanas do mês de Agosto/2026 (S35 a S39)', () => {
    expect(MONTH_WEEKS_2026_AUG).toEqual([35, 36, 37, 38, 39])

    const grid = MonthlyScheduleEngine.buildMonthlyGrid(mockWeeklyItems, 'L1', 35, 2026)
    expect(grid.length).toBe(5)
    expect(grid.map((w) => w.weekLabel)).toEqual(['S35', 'S36', 'S37', 'S38', 'S39'])

    // Cada semana deve ter exatamente 7 dias (SEG a DOM)
    grid.forEach((week) => {
      expect(week.days.length).toBe(7)
      expect(week.days.map((d) => d.dayOfWeek)).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'])
    })
  })

  it('2. Cada dia deve mapear e consolidar os registros da base única da semanal', () => {
    const grid = MonthlyScheduleEngine.buildMonthlyGrid(mockWeeklyItems, 'L1', 35, 2026)
    const seg24 = grid[0].days[0]

    expect(seg24.dateStr).toBe('24/08')
    expect(seg24.totalTons).toBe(190) // 120 + 70
    expect(seg24.productsCount).toBe(2)
    expect(seg24.hasMto).toBe(true)
    expect(seg24.mtoTons).toBe(70)
    expect(seg24.hasObservations).toBe(true)
    expect(seg24.observationsCount).toBe(1)
  })

  it('3. KPIs Mensais devem refletir a faixa única consolidada obrigatória', () => {
    const grid = MonthlyScheduleEngine.buildMonthlyGrid(mockWeeklyItems, 'L1', 35, 2026)
    const kpis = MonthlyScheduleEngine.getMonthlyKpis(grid, mockWeeklyItems)

    expect(kpis.availableCapacityHours).toBe(620.0)
    expect(kpis.programmedHours).toBe(518.0)
    expect(kpis.occupancyPct).toBe(83.5)
    expect(kpis.productionTons).toBe(5840.0)
    expect(kpis.setupHours).toBe(72.0)
    expect(kpis.stopsHours).toBe(31.0)
    expect(kpis.mtsTons).toBe(4180.0)
    expect(kpis.mtoTons).toBe(1660.0)
    expect(kpis.observationsCount).toBe(6)
    expect(kpis.criticalAlertsCount).toBe(4)
  })

  it('4. Painel de MP & Tarugos deve incluir Primeira Data de Risco para cada item', () => {
    const rawMaterials = MonthlyScheduleEngine.getMonthlyRawMaterials()
    expect(rawMaterials.length).toBeGreaterThanOrEqual(4)

    rawMaterials.forEach((rm) => {
      expect(rm.steelGrade).toBeDefined()
      expect(rm.firstRiskDate).toBeDefined()
      expect(typeof rm.firstRiskDate === 'string' || rm.firstRiskDate === null).toBe(true)
      expect(rm.status).toMatch(/GREEN|YELLOW|RED/)
    })

    const sae1020 = rawMaterials.find((r) => r.steelGrade === 'SAE 1020')
    expect(sae1020?.firstRiskDate).toBe('27/08/2026')
  })

  it('5. Carteira do Mês deve calcular a equação de atendimento projetado', () => {
    const backlog = MonthlyScheduleEngine.getMonthlyBacklogSummary()

    // Carteira início + novos pedidos - programado = carteira projetada final
    const expectedFinal =
      backlog.startMonthBacklogTons + backlog.newOrdersTons - backlog.programmedMonthTons
    expect(backlog.projectedFinalBacklogTons).toBe(expectedFinal)
    expect(backlog.fulfillmentPct).toBeGreaterThan(0)
    expect(backlog.mtsSharePct + backlog.mtoSharePct).toBeCloseTo(100, 0)
  })

  it('6. Aguardando Observações deve listar pendências com responsável e prazo', () => {
    const awaitingObs = MonthlyScheduleEngine.getMonthlyAwaitingObs(mockWeeklyItems)
    expect(awaitingObs.length).toBeGreaterThanOrEqual(1)

    awaitingObs.forEach((obs) => {
      expect(obs.materialCode).toBeDefined()
      expect(obs.responsible).toBeDefined()
      expect(obs.deadline).toBeDefined()
      expect(obs.weekNumber).toBeDefined()
    })
  })

  it('7. Análise IA Mensal deve gerar parecer consultivo completo sem alterar dados', () => {
    const grid = MonthlyScheduleEngine.buildMonthlyGrid(mockWeeklyItems, 'L1', 35, 2026)
    const kpis = MonthlyScheduleEngine.getMonthlyKpis(grid, mockWeeklyItems)
    const report = MonthlyScheduleEngine.generateMonthlyAiAnalysis(grid, kpis)

    expect(report.overviewVerdict).toBeDefined()
    expect(report.mainRisks.length).toBeGreaterThanOrEqual(1)
    expect(report.sequencingOpportunities.length).toBeGreaterThanOrEqual(1)
    expect(report.criticalWeeks.length).toBeGreaterThanOrEqual(1)
    expect(report.rawMaterialRisks.length).toBeGreaterThanOrEqual(1)
    expect(report.usableIdleCapacity.length).toBeGreaterThanOrEqual(1)
    expect(report.mtoOrdersAtRisk.length).toBeGreaterThanOrEqual(1)
  })
})

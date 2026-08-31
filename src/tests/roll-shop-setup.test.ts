import { describe, it, expect } from 'vitest'
import { rollShopSetupService, OFFICIAL_CYLINDER_SETS } from '@/services/roll-shop-service'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'

describe('rollShopSetupService — Testes de Integração Setup e Oficina de Cilindros', () => {
  const mockFilter: WeeklyHeaderFilter = {
    companyCode: 'CIAFAL',
    plantCode: 'PLANTA_1',
    lineCode: 'L1',
    year: 2026,
    weekNumber: 35,
    periodDisplay: '24/08/2026 a 30/08/2026',
  }

  const mockLineOverview: LineOverviewData = {
    line: {
      id: 'line-l1-id',
      code: 'L1',
      name: 'Linha 1 - Perfis Leves',
      plant: 'PLANTA_1',
      process: 'LAMINACAO',
      status: 'ACTIVE',
    },
    hierarchy: [],
    managers: [],
    approvers: [],
    sequencing: [],
    shifts: [
      {
        id: 'shift-1',
        line_id: 'line-l1-id',
        code: 'T1_L1',
        name: '1º Turno Matutino',
        start_time: '06:00',
        end_time: '14:00',
        duration_hours: 8,
        break_minutes: 40,
        applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
        crosses_midnight: false,
        active: true,
      },
      {
        id: 'shift-2',
        line_id: 'line-l1-id',
        code: 'T2_L1',
        name: '2º Turno Vespertino',
        start_time: '14:00',
        end_time: '22:00',
        duration_hours: 8,
        break_minutes: 40,
        applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
        crosses_midnight: false,
        active: true,
      },
      {
        id: 'shift-3',
        line_id: 'line-l1-id',
        code: 'T3_L1',
        name: '3º Turno Noturno',
        start_time: '22:00',
        end_time: '06:00',
        duration_hours: 8,
        break_minutes: 40,
        applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
        crosses_midnight: true,
        active: true,
      },
    ],
    calendar: {
      id: 'cal-1',
      line_id: 'line-l1-id',
      year: 2026,
      month: 8,
      operating_days_count: 26,
      work_saturdays: true,
      work_sundays: false,
      work_holidays: false,
      active: true,
    },
    capabilities: [],
    productivity: [],
    rawMaterials: [],
    blockedProducts: [],
    setups: [],
    setupMatrix: [],
    scheduledStops: [],
    constraints: [],
    rulePacks: [],
    history: [],
    alerts: [],
    completeness: 100,
    readyForScheduling: true,
  }

  it('deve validar que um setup com planned_change_minutes=45 e planned_tuning_minutes=20 resulta em planned_total_minutes=65 (fórmula troca + acerto) e gera demanda na Oficina com esses tempos', () => {
    // 1. Setup com 45 min de troca física e 20 min de acerto/afinação
    const plannedChange = 45
    const plannedTuning = 20
    const plannedTotal = plannedChange + plannedTuning // Fórmula troca + acerto = 65

    expect(plannedTotal).toBe(65)

    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-prod-1',
        schedule_code: 'WS-L1-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'SEG',
        date_str: '24/08',
        shift_code: 'T1_L1',
        shift_name: '1º Turno Matutino',
        crew_name: 'Turma C',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        material_description: 'Tubo Quadrado 50x50x2.0mm',
        family_code: 'TQ_LEVES',
        steel_grade: 'SAE 1020',
        dimensions: '50x50x2.0mm',
        order_type: 'MTS',
        planned_quantity_tons: 100,
        productivity_rate_th: 20.0,
        production_hours: 5.0,
        setup_duration_minutes: 0,
        start_datetime: '2026-08-24 06:00',
        end_datetime: '2026-08-24 11:00',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 105,
      },
      {
        id: 'item-prod-2',
        schedule_code: 'WS-L1-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'SEG',
        date_str: '24/08',
        shift_code: 'T1_L1',
        shift_name: '1º Turno Matutino',
        crew_name: 'Turma C',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: 'TR-60x30x2.0',
        material_description: 'Tubo Retangular 60x30x2.0mm',
        family_code: 'TR_LEVES',
        steel_grade: 'SAE 1020',
        dimensions: '60x30x2.0mm',
        order_type: 'MTS',
        planned_quantity_tons: 80,
        productivity_rate_th: 18.0,
        production_hours: 4.44,
        setup_duration_minutes: plannedTotal,
        setup_breakdown: {
          from_material_code: 'TQ-50x50x2.0',
          to_material_code: 'TR-60x30x2.0',
          from_family_code: 'TQ_LEVES',
          to_family_code: 'TR_LEVES',
          planned_change_minutes: plannedChange,
          planned_tuning_minutes: plannedTuning,
          planned_total_minutes: plannedTotal,
          cylinder_set_code: OFFICIAL_CYLINDER_SETS.TR_LEVES.set_code,
          cylinder_set_name: OFFICIAL_CYLINDER_SETS.TR_LEVES.set_name,
        },
        start_datetime: '2026-08-24 12:05',
        end_datetime: '2026-08-24 16:30',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 84,
      },
    ]

    const result = rollShopSetupService.syncScheduleWithRollShop(items, mockFilter, mockLineOverview)
    expect(result.demands.length).toBeGreaterThan(0)

    const demand = result.demands.find((d) => d.schedule_item_id === 'item-prod-2')
    expect(demand).toBeDefined()
    expect(demand?.times.planned_change_duration_minutes).toBe(45)
    expect(demand?.times.planned_tuning_duration_minutes).toBe(20)
    expect(demand?.times.planned_total_duration_minutes).toBe(65)
    expect(demand?.tooling.cylinder_set_code).toBe(OFFICIAL_CYLINDER_SETS.TR_LEVES.set_code)
  })

  it('deve garantir que getRollShopIndicators retorna potential_throughput_loss_tons > 0 quando há setups', () => {
    const indicators = rollShopSetupService.getRollShopIndicators('L1')
    expect(indicators).toBeDefined()
    expect(indicators.potential_throughput_loss_tons).toBeGreaterThan(0)
    expect(indicators.setups_next_7_days).toBeGreaterThan(0)
    expect(indicators.avg_total_setup_minutes).toBeGreaterThan(0)
  })

  it('deve garantir que generateAISetupRecommendations retorna ao menos 3 recomendações (SEQUENCE_OPTIMIZATION, BOTTLENECK_SETUP, STANDARD_TIME_REVISION)', () => {
    const recs = rollShopSetupService.generateAISetupRecommendations([], 'L1')
    expect(recs.length).toBeGreaterThanOrEqual(3)

    const types = recs.map((r) => r.type)
    expect(types).toContain('SEQUENCE_OPTIMIZATION')
    expect(types).toContain('BOTTLENECK_SETUP')
    expect(types).toContain('STANDARD_TIME_REVISION')

    const seqRec = recs.find((r) => r.type === 'SEQUENCE_OPTIMIZATION')
    expect(seqRec?.minutes_saved).toBe(65)

    const bottleRec = recs.find((r) => r.type === 'BOTTLENECK_SETUP')
    expect(bottleRec?.bottleneck_capacity_th).toBe(24.8)

    const standardRec = recs.find((r) => r.type === 'STANDARD_TIME_REVISION')
    expect(standardRec?.historical_evidence?.sample_size).toBe(14)
  })

  it('deve conter conjuntos homologados oficiais da CIAFAL na constante OFFICIAL_CYLINDER_SETS', () => {
    expect(OFFICIAL_CYLINDER_SETS).toHaveProperty('TQ_LEVES')
    expect(OFFICIAL_CYLINDER_SETS).toHaveProperty('TR_LEVES')
    expect(OFFICIAL_CYLINDER_SETS).toHaveProperty('PERFIS_U')
    expect(OFFICIAL_CYLINDER_SETS).toHaveProperty('REDONDOS')
    expect(OFFICIAL_CYLINDER_SETS.PERFIS_U.set_code).toBe('CJ-L1-PU-150')
  })
})

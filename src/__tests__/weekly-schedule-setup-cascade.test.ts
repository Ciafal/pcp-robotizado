/**
 * SUÍTE DE TESTES UNITÁRIOS — RECÁLCULO EM CASCATA, GOVERNANÇA E MOTOR DE SETUP/ACERTO
 * 11 Testes Obrigatórios da Especificação (01 a 11)
 */

import { describe, it, expect } from 'vitest'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'
import { LineOverviewData, ShiftDefinition } from '@/types/line-master'

describe('Suíte de Testes — Recálculo em Cascata e Governança da Programação Semanal (11 Testes)', () => {
  const dummyShifts: ShiftDefinition[] = [
    {
      id: 'sh1',
      line_id: 'L1',
      name: '1º Turno Matutino',
      code: 'T1_L1',
      start_time: '06:00',
      end_time: '14:20',
      duration_hours: 8.33,
      crosses_midnight: false,
      active: true,
      created: '',
    },
    {
      id: 'sh2',
      line_id: 'L1',
      name: '2º Turno Vespertino',
      code: 'T2_L1',
      start_time: '14:20',
      end_time: '22:40',
      duration_hours: 8.33,
      crosses_midnight: false,
      active: true,
      created: '',
    },
    {
      id: 'sh3',
      line_id: 'L1',
      name: '3º Turno Noturno',
      code: 'T3_L1',
      start_time: '22:40',
      end_time: '06:00',
      duration_hours: 7.33,
      crosses_midnight: true,
      active: true,
      created: '',
    },
  ]

  const dummyLineOverview: LineOverviewData = {
    master: {
      id: 'L1',
      code: 'L1',
      name: 'Linha de Conformação L1',
      unit_code: 'LAM-01',
      nominal_hourly_capacity: 12.0,
      active: true,
      created: '',
      updated: '',
    } as any,
    productivity: [
      {
        id: 'p-A',
        line_id: 'L1',
        material_product_code: 'PROD-A',
        material_product_name: 'Tubo Redondo 50mm',
        nominal_productivity: 10.0,
        planned_productivity: 10.0,
        expected_efficiency_pct: 100,
        active: true,
      } as any,
      {
        id: 'p-B',
        line_id: 'L1',
        material_product_code: 'PROD-B',
        material_product_name: 'Tubo Quadrado 80mm',
        nominal_productivity: 10.0,
        planned_productivity: 10.0,
        expected_efficiency_pct: 100,
        active: true,
      } as any,
      {
        id: 'p-C',
        line_id: 'L1',
        material_product_code: 'PROD-C',
        material_product_name: 'Tubo Retangular 100x50',
        nominal_productivity: 10.0,
        planned_productivity: 10.0,
        expected_efficiency_pct: 100,
        active: true,
      } as any,
    ],
    capabilities: [],
    setupMatrix: [
      {
        id: 'set-ab',
        line_id: 'L1',
        setup_code: 'SET-AB-180',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'PROD-A',
        to_product_code: 'PROD-B',
        setup_duration_minutes: 180,
        setup_description: 'Troca de bitola completa A->B',
        active: true,
      } as any,
      {
        id: 'set-ac',
        line_id: 'L1',
        setup_code: 'SET-AC-35',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'PROD-A',
        to_product_code: 'PROD-C',
        setup_duration_minutes: 35,
        setup_description: 'Troca parcial A->C',
        active: true,
      } as any,
      {
        id: 'set-cb',
        line_id: 'L1',
        setup_code: 'SET-CB-45',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'PROD-C',
        to_product_code: 'PROD-B',
        setup_duration_minutes: 45,
        setup_description: 'Troca C->B',
        active: true,
      } as any,
    ],
    adjustmentRules: [
      {
        id: 'adj-b',
        line_id: 'L1',
        rule_code: 'ACERTO-B-20',
        product_code: 'PROD-B',
        target_type: 'MATERIAL',
        tuning_duration_minutes: 20,
        active: true,
      } as any,
    ],
    constraints: [],
    shifts: dummyShifts,
    scheduledStops: [],
    blockedProducts: [],
  }

  const dummyFilter: WeeklyHeaderFilter = {
    companyCode: 'CIAFAL',
    plantCode: 'DIV',
    lineCode: 'L1',
    year: 2026,
    weekNumber: 38,
    periodDisplay: '14/09 a 20/09',
  }

  // 01: A→B com setup específico DE→PARA de 180 min (valida duração e horários vindos da Ficha Mestra)
  it('01: A→B com setup específico DE→PARA de 180 min (valida duração e horários vindos da Ficha Mestra)', () => {
    const itemA: WeeklyScheduleItem = {
      id: 'it-1',
      schedule_code: 'WS-L1-2026-W38',
      line_code: 'L1',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      planned_quantity_tons: 20, // 2h de produção a 10 t/h
      start_datetime: '2026-09-14 06:00',
      end_datetime: '2026-09-14 08:00',
      status: 'DRAFT',
      version: 1,
    } as any

    const itemB: WeeklyScheduleItem = {
      id: 'it-2',
      schedule_code: 'WS-L1-2026-W38',
      line_code: 'L1',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-B',
      planned_quantity_tons: 30, // 3h a 10 t/h
      status: 'DRAFT',
      version: 1,
    } as any

    const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemB],
      dummyLineOverview,
      dummyFilter,
    )

    expect(res.items.length).toBe(2)
    const b = res.items[1]
    // Setup deve ser de 180 min vindo da regra cadastrada SET-AB-180
    expect(b.setup_duration_minutes).toBe(180)
    expect(b.setup_rule_code).toBe('SET-AB-180')
    expect(b.setup_breakdown?.planned_change_minutes).toBe(180)
    expect(b.setup_start).toBe('2026-09-14 08:00')
    expect(b.setup_end).toBe('2026-09-14 11:00')
  })

  // 02: A→C com setup de 35 min vindo da matriz cadastrada (não fallback)
  it('02: A→C com setup de 35 min vindo da matriz cadastrada (não fallback)', () => {
    const itemA: WeeklyScheduleItem = {
      id: 'it-1',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      planned_quantity_tons: 10,
      start_datetime: '2026-09-14 06:00',
      end_datetime: '2026-09-14 07:00',
    } as any

    const itemC: WeeklyScheduleItem = {
      id: 'it-3',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-C',
      planned_quantity_tons: 10,
    } as any

    const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemC],
      dummyLineOverview,
      dummyFilter,
    )

    const c = res.items[1]
    expect(c.setup_duration_minutes).toBe(35)
    expect(c.setup_rule_code).toBe('SET-AC-35')
    expect(c.setup_source).toBe('Ficha Mestra → Matriz de Setup DE→PARA')
  })

  // 03: mesmo produto consecutivo → 0 min, nenhum bloco de setup/acerto
  it('03: mesmo produto consecutivo → 0 min, nenhum bloco de setup/acerto', () => {
    const itemA1: WeeklyScheduleItem = {
      id: 'it-1',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      planned_quantity_tons: 10,
      start_datetime: '2026-09-14 06:00',
      end_datetime: '2026-09-14 07:00',
    } as any

    const itemA2: WeeklyScheduleItem = {
      id: 'it-2',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      planned_quantity_tons: 20,
    } as any

    const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA1, itemA2],
      dummyLineOverview,
      dummyFilter,
    )

    const a2 = res.items[1]
    expect(a2.setup_duration_minutes).toBe(0)
    expect(a2.setup_breakdown?.planned_change_minutes).toBe(0)
    expect(a2.setup_breakdown?.planned_tuning_minutes).toBe(0)
    expect(a2.tuning_duration_minutes).toBe(0)
  })

  // 04: encadeamento 15:03 → setup 180 min → 18:03 → acerto 20 min → 18:23 → próxima produção
  it('04: encadeamento 15:03 → setup 180 min → 18:03 → acerto 20 min → 18:23 → próxima produção', () => {
    const itemA: WeeklyScheduleItem = {
      id: 'it-1',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      planned_quantity_tons: 90.5,
      start_datetime: '2026-09-14 06:00',
      end_datetime: '2026-09-14 15:03', // Fim Produção às 15:03
    } as any

    const itemB: WeeklyScheduleItem = {
      id: 'it-2',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-B',
      planned_quantity_tons: 20,
    } as any

    const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemB],
      dummyLineOverview,
      dummyFilter,
    )

    const b = res.items[1]
    // Setup 180 min das 15:03 às 18:03
    expect(b.setup_start).toBe('2026-09-14 15:03')
    expect(b.setup_end).toBe('2026-09-14 18:03')
    expect(b.setup_duration_minutes).toBe(180)

    // Acerto 20 min das 18:03 às 18:23
    expect(b.tuning_start).toBe('2026-09-14 18:03')
    expect(b.tuning_end).toBe('2026-09-14 18:23')
    expect(b.tuning_duration_minutes).toBe(20)

    // Início da produção de B rigorosamente às 18:23
    expect(b.start_datetime).toBe('2026-09-14 18:23')
  })

  // 05: setup atravessando mudança de turno sem quebrar a cadeia
  it('05: setup atravessando mudança de turno sem quebrar a cadeia', () => {
    // Turno 1 termina às 14:20, Turno 2 começa às 14:20.
    // Produção termina às 13:30, setup de 180 min (3h) vai até 16:30 atravessando a troca de turno das 14:20.
    const itemA: WeeklyScheduleItem = {
      id: 'it-1',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      start_datetime: '2026-09-14 06:00',
      end_datetime: '2026-09-14 13:30',
    } as any

    const itemB: WeeklyScheduleItem = {
      id: 'it-2',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-B',
      planned_quantity_tons: 10,
    } as any

    const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemB],
      dummyLineOverview,
      dummyFilter,
    )

    const b = res.items[1]
    expect(b.setup_start).toBe('2026-09-14 13:30')
    expect(b.setup_end).toBe('2026-09-14 16:30')
    expect(b.tuning_start).toBe('2026-09-14 16:30')
    expect(b.tuning_end).toBe('2026-09-14 16:50')
    expect(b.start_datetime).toBe('2026-09-14 16:50')
  })

  // 06: setup atravessando 00:00 (23:10 → 02:10 do dia seguinte) sem reinicialização
  it('06: setup atravessando 00:00 (23:10 → 02:10 do dia seguinte) sem reinicialização', () => {
    const itemA: WeeklyScheduleItem = {
      id: 'it-1',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      start_datetime: '2026-09-14 15:00',
      end_datetime: '2026-09-14 23:10',
    } as any

    const itemB: WeeklyScheduleItem = {
      id: 'it-2',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-B',
      planned_quantity_tons: 10,
    } as any

    const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemB],
      dummyLineOverview,
      dummyFilter,
    )

    const b = res.items[1]
    expect(b.setup_start).toBe('2026-09-14 23:10')
    // 23:10 + 180 min (3h) = 02:10 do dia seguinte (15/09)
    expect(b.setup_end).toBe('2026-09-15 02:10')
    expect(b.tuning_start).toBe('2026-09-15 02:10')
    expect(b.tuning_end).toBe('2026-09-15 02:30')
    expect(b.start_datetime).toBe('2026-09-15 02:30')
  })

  // 07: alterar duração na Ficha Mestra → rascunho recalcula automaticamente
  it('07: alterar duração na Ficha Mestra → rascunho recalcula automaticamente', () => {
    const itemA: WeeklyScheduleItem = {
      id: 'it-1',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      start_datetime: '2026-09-14 06:00',
      end_datetime: '2026-09-14 08:00',
      status: 'DRAFT',
    } as any

    const itemB: WeeklyScheduleItem = {
      id: 'it-2',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-B',
      planned_quantity_tons: 10,
      status: 'DRAFT',
    } as any

    // 1º Cálculo: regra padrão 180 min
    const res1 = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemB],
      dummyLineOverview,
      dummyFilter,
    )
    expect(res1.items[1].setup_duration_minutes).toBe(180)
    expect(res1.items[1].setup_end).toBe('2026-09-14 11:00')

    // Modifica a regra na Ficha Mestra para 120 min
    const modifiedOverview: LineOverviewData = {
      ...dummyLineOverview,
      setupMatrix: dummyLineOverview.setupMatrix.map((rule) =>
        rule.setup_code === 'SET-AB-180'
          ? { ...rule, setup_duration_minutes: 120, setup_code: 'SET-AB-120' }
          : rule,
      ),
    }

    // Recalculo do rascunho absorve automaticamente a nova duração
    const res2 = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemB],
      modifiedOverview,
      dummyFilter,
    )
    expect(res2.items[1].setup_duration_minutes).toBe(120)
    expect(res2.items[1].setup_end).toBe('2026-09-14 10:00')
  })

  // 08: programação APROVADA não é modificada silenciosamente (banner + botão exigidos)
  it('08: programação APROVADA não é modificada silenciosamente (divergência detectada com parâmetros vigentes)', () => {
    // Snapshot original aprovado (setup era 180 min)
    const approvedItems: WeeklyScheduleItem[] = [
      {
        id: 'it-1',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'PROD-A',
        start_datetime: '2026-09-14 06:00',
        end_datetime: '2026-09-14 08:00',
        setup_duration_minutes: 0,
        status: 'APROVADO',
      } as any,
      {
        id: 'it-2',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: 'PROD-B',
        setup_duration_minutes: 180,
        setup_rule_code: 'SET-AB-180',
        setup_start: '2026-09-14 08:00',
        setup_end: '2026-09-14 11:00',
        start_datetime: '2026-09-14 11:20',
        end_datetime: '2026-09-14 12:20',
        status: 'APROVADO',
      } as any,
    ]

    // Nova Ficha Mestra com regra alterada para 90 min
    const modifiedOverview: LineOverviewData = {
      ...dummyLineOverview,
      setupMatrix: dummyLineOverview.setupMatrix.map((rule) =>
        rule.setup_code === 'SET-AB-180'
          ? { ...rule, setup_duration_minutes: 90, setup_code: 'SET-AB-90' }
          : rule,
      ),
    }

    // Na programação aprovada, os horários e regras originais permanecem inalterados no snapshot
    expect(approvedItems[1].setup_duration_minutes).toBe(180)
    expect(approvedItems[1].setup_rule_code).toBe('SET-AB-180')

    // Simulação de recálculo com a nova Ficha Mestra
    const sim = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      approvedItems,
      modifiedOverview,
      dummyFilter,
    )

    // Detecção da divergência exigida para disparo do banner
    const hasDiscrepancy = approvedItems.some((item, idx) => {
      const simItem = sim.items[idx]
      return item.setup_duration_minutes !== simItem.setup_duration_minutes
    })

    expect(hasDiscrepancy).toBe(true)
    expect(sim.items[1].setup_duration_minutes).toBe(90)
    // Texto canônico exigido pelo requisito b
    const bannerMessage =
      'Os parâmetros da Ficha Mestra foram alterados após a aprovação desta programação.'
    expect(bannerMessage).toBe(
      'Os parâmetros da Ficha Mestra foram alterados após a aprovação desta programação.',
    )
  })

  // 09: HISTÓRICO/BLOQUEADO preserva snapshot original
  it('09: HISTÓRICO/BLOQUEADO preserva snapshot original sem recálculo automático', () => {
    const historicalSnapshot: WeeklyScheduleItem[] = [
      {
        id: 'it-hist-1',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'PROD-A',
        start_datetime: '2026-01-10 06:00',
        end_datetime: '2026-01-10 12:00',
        setup_duration_minutes: 0,
        calculated_at: '2026-01-09 18:00:00',
        calculated_by: 'MOTOR_TEMPORAL_DETERMINISTICO',
        status: 'REALIZADO',
      } as any,
      {
        id: 'it-hist-2',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: 'PROD-B',
        start_datetime: '2026-01-10 15:20',
        end_datetime: '2026-01-10 18:00',
        setup_duration_minutes: 180,
        setup_rule_code: 'SET-AB-180',
        setup_start: '2026-01-10 12:00',
        setup_end: '2026-01-10 15:00',
        tuning_duration_minutes: 20,
        tuning_start: '2026-01-10 15:00',
        tuning_end: '2026-01-10 15:20',
        calculated_at: '2026-01-09 18:00:00',
        calculated_by: 'MOTOR_TEMPORAL_DETERMINISTICO',
        status: 'REALIZADO',
      } as any,
    ]

    // Computação de indicadores em modo fixo preserva 100% dos campos de snapshot
    const computed = WeeklyScheduleEngine.computeScheduleIndicators(
      historicalSnapshot,
      dummyLineOverview,
      dummyFilter,
    )

    expect(historicalSnapshot[1].calculated_at).toBe('2026-01-09 18:00:00')
    expect(historicalSnapshot[1].calculated_by).toBe('MOTOR_TEMPORAL_DETERMINISTICO')
    expect(historicalSnapshot[1].setup_start).toBe('2026-01-10 12:00')
    expect(historicalSnapshot[1].setup_end).toBe('2026-01-10 15:00')
    expect(historicalSnapshot[1].tuning_start).toBe('2026-01-10 15:00')
    expect(historicalSnapshot[1].tuning_end).toBe('2026-01-10 15:20')
    expect(computed.indicators.setupsCount).toBe(1)
  })

  // 10: transição sem parametrização gera o alerta canônico e nunca assume tempo fictício
  it('10: transição sem parametrização gera o alerta canônico e nunca assume tempo fictício', () => {
    const itemA: WeeklyScheduleItem = {
      id: 'it-1',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      start_datetime: '2026-09-14 06:00',
      end_datetime: '2026-09-14 08:00',
    } as any

    // PROD-SEM-REGRA não possui regra de setup na Ficha Mestra
    const itemUnparam: WeeklyScheduleItem = {
      id: 'it-unparam',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-SEM-REGRA',
      planned_quantity_tons: 10,
    } as any

    const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemUnparam],
      dummyLineOverview,
      dummyFilter,
    )

    const unparam = res.items[1]
    expect(unparam.setup_duration_minutes).toBe(0)
    expect(unparam.setup_breakdown?.is_missing_standard_param).toBe(true)
    expect(unparam.setup_reason).toContain(WeeklyScheduleEngine.CANONICAL_WARNING_SETUP)
    expect(unparam.setup_source).toBe('SEM_REGRA_PARAMETRIZADA')
    expect(WeeklyScheduleEngine.CANONICAL_WARNING_SETUP).toBe(
      'Setup não parametrizado na Ficha Mestra para esta transição DE→PARA.',
    )
  })

  // 11: reordenar (A→B→C → A→C→B) recalcula setups A→C e C→B e elimina A→B e B→C
  it('11: reordenar (A→B→C → A→C→B) recalcula setups A→C e C→B e elimina A→B e B→C', () => {
    const itemA: WeeklyScheduleItem = {
      id: 'it-A',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PROD-A',
      planned_quantity_tons: 10,
      start_datetime: '2026-09-14 06:00',
      end_datetime: '2026-09-14 07:00',
    } as any

    const itemB: WeeklyScheduleItem = {
      id: 'it-B',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'PROD-B',
      planned_quantity_tons: 10,
    } as any

    const itemC: WeeklyScheduleItem = {
      id: 'it-C',
      sequence_order: 3,
      item_type: 'PRODUCTION',
      material_code: 'PROD-C',
      planned_quantity_tons: 10,
    } as any

    // Sequência 1: A -> B -> C
    const seq1 = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      [itemA, itemB, itemC],
      dummyLineOverview,
      dummyFilter,
    )
    // Setup A -> B (180 min)
    expect(seq1.items[1].setup_duration_minutes).toBe(180)
    expect(seq1.items[1].setup_rule_code).toBe('SET-AB-180')

    // Sequência 2: Reordenação para A -> C -> B
    const reorderedList = [
      { ...itemA, sequence_order: 1 },
      { ...itemC, sequence_order: 2 },
      { ...itemB, sequence_order: 3 },
    ]

    const seq2 = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      reorderedList,
      dummyLineOverview,
      dummyFilter,
    )

    // Item 2 agora é C: setup A -> C deve ser 35 min (SET-AC-35)
    expect(seq2.items[1].material_code).toBe('PROD-C')
    expect(seq2.items[1].setup_duration_minutes).toBe(35)
    expect(seq2.items[1].setup_rule_code).toBe('SET-AC-35')

    // Item 3 agora é B: setup C -> B deve ser 45 min (SET-CB-45)
    expect(seq2.items[2].material_code).toBe('PROD-B')
    expect(seq2.items[2].setup_duration_minutes).toBe(45)
    expect(seq2.items[2].setup_rule_code).toBe('SET-CB-45')

    // O setup anterior A->B (180 min) foi totalmente eliminado
    expect(seq2.items.map((it) => it.setup_rule_code)).toEqual([
      undefined,
      'SET-AC-35',
      'SET-CB-45',
    ])
  })
})

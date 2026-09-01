/**
 * SUÍTE DE TESTES DE ACEITE INDUSTRIAL PCP ROBOTIZADO
 * Verificação rigorosa dos 14 Critérios de Aceite para a Montagem Semanal
 */

import { describe, it, expect } from 'vitest'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'
import { VersioningEngine } from '@/services/versioning-engine'

describe('Suíte de Aceite — Motor Temporal de Programação Industrial CIAFAL', () => {
  const dummyOverview: LineOverviewData = {
    master: {
      id: 'l1',
      name: 'Linha de Laminação L1',
      unit_code: 'LAM-01',
      nominal_hourly_capacity: 12.0,
      active: true,
      created: '',
      updated: '',
    } as any,
    productivity: [
      {
        id: 'p1',
        line_id: 'l1',
        material_product_code: 'TQ-50x50x2.0',
        material_product_name: 'Tubo Quadrado 50x50 #2.00',
        dimension_spec: '50x50 mm #2.00',
        productivity_unit: 't/h',
        nominal_productivity: 12.0,
        planned_productivity: 12.0,
        expected_efficiency_pct: 90,
        source_mode: 'FICHA_MESTRA',
        active: true,
        created: '',
        updated: '',
      },
      {
        id: 'p2',
        line_id: 'l1',
        material_product_code: 'TR-100x50x3.0',
        material_product_name: 'Tubo Retangular 100x50 #3.00',
        dimension_spec: '100x50 mm #3.00',
        productivity_unit: 't/h',
        nominal_productivity: 15.0,
        planned_productivity: 15.0,
        expected_efficiency_pct: 90,
        source_mode: 'FICHA_MESTRA',
        active: true,
        created: '',
        updated: '',
      },
    ],
    capabilities: [
      {
        id: 'c1',
        line_id: 'l1',
        product_family_id: 'fam-tq',
        status: 'QUALIFIED',
        specific_capacity: 12.0,
        min_gauge_mm: 1.5,
        max_gauge_mm: 4.0,
        active: true,
        created: '',
        updated: '',
      },
      {
        id: 'c2',
        line_id: 'l1',
        product_family_id: 'fam-proibida',
        status: 'BLOCKED',
        specific_capacity: 0,
        active: true,
        created: '',
        updated: '',
      },
    ],
    setupMatrix: [
      {
        id: 's1',
        line_id: 'l1',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'TQ-50x50x2.0',
        to_product_code: 'TR-100x50x3.0',
        setup_duration_minutes: 40,
        setup_description: 'Troca de bitola e rolos formadores',
        active: true,
        created: '',
        updated: '',
      },
    ],
    processConstraints: [],
    shifts: [
      {
        id: 'sh1',
        line_id: 'l1',
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
        line_id: 'l1',
        name: '2º Turno Vespertino',
        code: 'T2_L1',
        start_time: '14:20',
        end_time: '22:40',
        duration_hours: 8.33,
        crosses_midnight: false,
        active: true,
        created: '',
      },
    ],
    scheduledStops: [],
    blockedProducts: [
      {
        id: 'b1',
        line_id: 'l1',
        product_code: 'BLOQ-999',
        block_reason: 'Rolo de conformação em manutenção corretiva.',
        is_hard_block: true,
        blocked_by: 'Engenharia',
        active: true,
        created: '',
        updated: '',
      },
    ],
    responsibleUser: null,
  }

  // TESTE 01: Turno sem duplicidade
  it('TESTE 01: Formata turno como "T1 · Turma C" sem duplicar turma e preserva configuração da linha', () => {
    const formatted1 = WeeklyScheduleEngine.formatShiftDisplay(
      '1º Turno / Turma C',
      'T1_L1',
      'Turma C',
    )
    expect(formatted1).toBe('T1 · Turma C')

    const formatted2 = WeeklyScheduleEngine.formatShiftDisplay(
      '2º Turno Vespertino',
      'T2_L1',
      'Turma A',
    )
    expect(formatted2).toBe('T2 · Turma A')

    const formatted3 = WeeklyScheduleEngine.formatShiftDisplay(
      '3º Turno Noturno',
      'T3_L1',
      'Turma B',
    )
    expect(formatted3).toBe('T3 · Turma B')
  })

  // TESTE 04: Quantidade -> Tempo
  it('TESTE 04: Motor Temporal Bidirecional (Quantidade -> Tempo): 100 t, 12 t/h, 06:00 -> ~8 h 20 min, fim ~14:20', () => {
    const res = WeeklyScheduleEngine.calculateBidirectionalSchedule({
      mode: 'QUANTITY',
      cadenceTh: 12.0,
      quantityTons: 100,
      startTime: '06:00',
    })

    expect(res.isValid).toBe(true)
    expect(res.durationMinutes).toBe(500) // 8h 20min = 500 minutos
    expect(res.durationFormatted).toBe('8 h 20 min')
    expect(res.endTime).toBe('14:20')
  })

  // TESTE 05: Tempo -> Quantidade
  it('TESTE 05: Motor Temporal Bidirecional (Tempo -> Quantidade): 06:00->14:00, 12 t/h -> 8 h, 96 t', () => {
    const res = WeeklyScheduleEngine.calculateBidirectionalSchedule({
      mode: 'TIME',
      cadenceTh: 12.0,
      startTime: '06:00',
      endTime: '14:00',
    })

    expect(res.isValid).toBe(true)
    expect(res.durationHours).toBe(8)
    expect(res.quantityTons).toBe(96)
    expect(res.durationFormatted).toBe('8 h')
  })

  // TESTE 29: Cadência ausente
  it('TESTE 29: Bloqueia cálculo se cadência não estiver cadastrada na Ficha Mestre (sem valores fictícios)', () => {
    const strictCadence = WeeklyScheduleEngine.getProductivityForMaterialStrict(
      'MAT-SEM-CADENCIA',
      dummyOverview,
    )
    expect(strictCadence).toBeNull()

    const res = WeeklyScheduleEngine.calculateBidirectionalSchedule({
      mode: 'QUANTITY',
      cadenceTh: 0,
      quantityTons: 100,
      startTime: '06:00',
    })
    expect(res.isValid).toBe(false)
    expect(res.errorMessage).toContain('Cadência não cadastrada para este material nesta linha')
  })

  // TESTE 06 e 07: Drag-and-drop, preview e recálculo da timeline
  it('TESTE 06 e 07: Reordenação 4->2 atualiza sequências para 1, 2, 3, 4 e recalcula horários', () => {
    const itemA: WeeklyScheduleItem = {
      id: 'item-1',
      schedule_code: 'WS-L1-2026-W35',
      company_code: 'CIAFAL',
      plant_code: 'DIV',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: '24/08 a 30/08',
      day_of_week: 'SEG',
      date_str: '24/08',
      shift_code: 'T1_L1',
      shift_name: 'T1 · Turma A',
      crew_name: 'Turma A',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'TQ-50x50x2.0',
      material_description: 'Tubo Quadrado 50x50',
      order_type: 'MTS',
      planned_quantity_tons: 60,
      productivity_rate_th: 12,
      production_hours: 5,
      setup_duration_minutes: 0,
      start_datetime: '2026-08-24 06:00',
      end_datetime: '2026-08-24 11:00',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 65,
    }

    const itemB: WeeklyScheduleItem = {
      ...itemA,
      id: 'item-2',
      sequence_order: 2,
      material_code: 'TQ-50x50x2.0',
      planned_quantity_tons: 36,
    }

    const itemC: WeeklyScheduleItem = {
      ...itemA,
      id: 'item-3',
      sequence_order: 3,
      material_code: 'TQ-50x50x2.0',
      planned_quantity_tons: 48,
    }

    const itemD: WeeklyScheduleItem = {
      ...itemA,
      id: 'item-4',
      sequence_order: 4,
      material_code: 'TR-100x50x3.0',
      planned_quantity_tons: 60,
      productivity_rate_th: 15,
    }

    const initialItems = [itemA, itemB, itemC, itemD]

    // Validação pré-drop do item 4 para a posição 2 (índice 3 para índice 1)
    const valDrop = WeeklyScheduleEngine.validateSequenceDrop({
      items: initialItems,
      fromIndex: 3,
      toIndex: 1,
      lineOverview: dummyOverview,
      lineCode: 'L1',
    })
    expect(valDrop.allowed).toBe(true)

    // Reordena
    const reordered = [...initialItems]
    const [moved] = reordered.splice(3, 1)
    reordered.splice(1, 0, moved)
    const reindexed = reordered.map((it, idx) => ({ ...it, sequence_order: idx + 1 }))

    expect(reindexed[0].id).toBe('item-1')
    expect(reindexed[1].id).toBe('item-4') // Produto D na posição 2
    expect(reindexed[2].id).toBe('item-2') // Produto B na posição 3
    expect(reindexed[3].id).toBe('item-3') // Produto C na posição 4
    expect(reindexed.map((i) => i.sequence_order)).toEqual([1, 2, 3, 4])

    // Recalcula Timeline
    const filter: WeeklyHeaderFilter = {
      companyCode: 'CIAFAL',
      plantCode: 'DIV',
      lineCode: 'L1',
      year: 2026,
      weekNumber: 35,
      periodDisplay: '24/08 a 30/08',
    }
    const recalc = WeeklyScheduleEngine.recalculateWeeklyTimeline(reindexed, dummyOverview, filter)
    expect(recalc.items.length).toBe(4)
    expect(recalc.items[1].material_code).toBe('TR-100x50x3.0')
    expect(recalc.items[1].setup_duration_minutes).toBeGreaterThanOrEqual(20) // Setup calculado automaticamente
  })

  // TESTE 08: Setup inserido proporcionalmente
  it('TESTE 08: Mudança de bitola insere setup proporcional na timeline', () => {
    const itemPrev: WeeklyScheduleItem = {
      id: 'i1',
      schedule_code: 'WS-L1-2026-W35',
      company_code: 'CIAFAL',
      plant_code: 'DIV',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: '24/08 a 30/08',
      day_of_week: 'SEG',
      date_str: '24/08',
      shift_code: 'T1_L1',
      shift_name: 'T1 · Turma A',
      crew_name: 'Turma A',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'TQ-50x50x2.0',
      material_description: 'Tubo Quadrado',
      order_type: 'MTS',
      planned_quantity_tons: 50,
      productivity_rate_th: 12,
      production_hours: 4.17,
      setup_duration_minutes: 0,
      start_datetime: '2026-08-24 06:00',
      end_datetime: '2026-08-24 10:10',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 55,
    }

    const setupResult = WeeklyScheduleEngine.calculateSetup(
      itemPrev,
      'TR-100x50x3.0',
      'fam-tr',
      dummyOverview,
      'L1',
    )
    expect(setupResult.setupDurationMinutes).toBe(40) // Da Matriz de Setup da Ficha Mestre
    expect(setupResult.breakdown.planned_change_minutes).toBeGreaterThan(0)
    expect(setupResult.breakdown.planned_tuning_minutes).toBeGreaterThan(0)
  })

  // TESTE 10: Versionamento
  it('TESTE 10: Gera diffs e versionamento para auditoria na Central de Alterações', () => {
    const prevItem: WeeklyScheduleItem = {
      id: 'item-v1',
      schedule_code: 'WS-L1-2026-W35',
      company_code: 'CIAFAL',
      plant_code: 'DIV',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: '24/08 a 30/08',
      day_of_week: 'SEG',
      date_str: '24/08',
      shift_code: 'T1_L1',
      shift_name: 'T1 · Turma A',
      crew_name: 'Turma A',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'TQ-50x50x2.0',
      material_description: 'Tubo Quadrado',
      order_type: 'MTS',
      planned_quantity_tons: 100,
      productivity_rate_th: 12,
      production_hours: 8.33,
      setup_duration_minutes: 0,
      start_datetime: '2026-08-24 06:00',
      end_datetime: '2026-08-24 14:20',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 110,
    }

    const modifiedItem: WeeklyScheduleItem = {
      ...prevItem,
      planned_quantity_tons: 120, // Mudança de 20 t
      sequence_order: 2, // Mudança de sequência
    }

    const diffs = VersioningEngine.computeScheduleDiffs([prevItem], [modifiedItem])
    expect(diffs.length).toBeGreaterThanOrEqual(1)
    const qtyDiff = diffs.find((d) => d.changeType === 'QUANTIDADE_ALTERADA')
    expect(qtyDiff).toBeDefined()
    expect(qtyDiff?.previousValue).toBe('100')
    expect(qtyDiff?.newValue).toBe('120')
  })
})

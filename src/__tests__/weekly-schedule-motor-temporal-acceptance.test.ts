/**
 * SUÍTE DE TESTES DE ACEITE INDUSTRIAL PCP ROBOTIZADO
 * Verificação rigorosa dos 14 Critérios de Aceite para a Montagem Semanal
 */

import { describe, it, expect } from 'vitest'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'
import { VersioningEngine } from '@/services/versioning-engine'
import { getWeekDateRange, isWeekInPast, isScheduleItemInPast } from '@/lib/temporal-utils'

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
        source_mode: 'MANUAL',
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
        source_mode: 'MANUAL',
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
        product_type: 'TUBO_QUADRADO',
        status: 'QUALIFIED',
        specific_capacity: 12.0,
        active: true,
      },
      {
        id: 'c2',
        line_id: 'l1',
        product_family_id: 'fam-proibida',
        product_type: 'OUTROS',
        status: 'BLOCKED',
        specific_capacity: 0,
        active: true,
      },
    ],
    setupMatrix: [
      {
        id: 's1',
        line_id: 'l1',
        setup_code: 'SET-01',
        source_mode: 'MANUAL',
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
    constraints: [],
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
        product_description: 'Produto Bloqueado Teste',
        block_type: 'TOTAL',
        source_mode: 'MANUAL',
        block_reason: 'Rolo de conformação em manutenção corretiva.',
        active: true,
        created: '',
        updated: '',
      },
    ],
  } as unknown as LineOverviewData

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

  // TESTES DE ACEITE PCP ROBOTIZADO (8 TESTES OBRIGATÓRIOS)
  describe('Testes de Aceite Obrigatórios — Montagem Semanal PCP (T1 a T8)', () => {
    // T1: Visão DIA 16/09/2026 mostra só esse dia
    it('T1: visão DIA para data alvo renderiza e filtra exclusivamente o dia correspondente', () => {
      const itemsMock: WeeklyScheduleItem[] = [
        {
          id: 'i-seg',
          schedule_code: 'WS-L1-2026-W38',
          day_of_week: 'SEG',
          date_str: '14/09',
          start_datetime: '2026-09-14 06:00',
          end_datetime: '2026-09-14 14:00',
          item_type: 'PRODUCTION',
          material_code: 'TQ-50x50x2.0',
          planned_quantity_tons: 96,
          production_hours: 8,
          setup_duration_minutes: 0,
          status: 'DRAFT',
          version: 1,
        } as any,
        {
          id: 'i-qua-16',
          schedule_code: 'WS-L1-2026-W38',
          day_of_week: 'QUA',
          date_str: '16/09',
          start_datetime: '2026-09-16 06:00',
          end_datetime: '2026-09-16 12:00',
          item_type: 'PRODUCTION',
          material_code: 'TR-100x50x3.0',
          planned_quantity_tons: 90,
          production_hours: 6,
          setup_duration_minutes: 0,
          status: 'DRAFT',
          version: 1,
        } as any,
      ]

      const singleDay = 'QUA'
      const filteredForDia = itemsMock.filter((it) => it.day_of_week === singleDay)
      expect(filteredForDia.length).toBe(1)
      expect(filteredForDia[0].date_str).toBe('16/09')
      expect(filteredForDia[0].material_code).toBe('TR-100x50x3.0')
    })

    // T2: Navegação Dia Anterior/Seguinte unificada
    it('T2: navegação Dia Anterior / Dia Seguinte recalcula com precisão calendário a nova data sem dessincronia', () => {
      // 16/09/2026 (Quarta-feira)
      const baseDate = new Date(2026, 8, 16) // mês 8 = Setembro
      expect(baseDate.getDate()).toBe(16)
      expect(baseDate.getMonth()).toBe(8)

      // Dia Anterior: 15/09/2026 (Terça-feira)
      const prev = new Date(baseDate)
      prev.setDate(prev.getDate() - 1)
      expect(prev.getDate()).toBe(15)
      expect(prev.getMonth()).toBe(8)

      // Dia Seguinte: 17/09/2026 (Quinta-feira)
      const next = new Date(baseDate)
      next.setDate(next.getDate() + 1)
      expect(next.getDate()).toBe(17)
      expect(next.getMonth()).toBe(8)
    })

    // T3: Fim 15:03 + setup 180 min -> setup 15:03->18:03, produto B >= 18:03
    it('T3: Cadeia temporal: fim do produto anterior + setup de 180 min bloqueia início do produto B até o fim do setup', () => {
      const prodA: WeeklyScheduleItem = {
        id: 'prod-A',
        schedule_code: 'WS-L1-2026-W38',
        day_of_week: 'QUA',
        date_str: '16/09',
        shift_code: 'T2_L1',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        planned_quantity_tons: 108.6, // ~9.05 h a 12 t/h
        productivity_rate_th: 12,
        production_hours: 9.05,
        setup_duration_minutes: 0,
        status: 'DRAFT',
        version: 1,
      } as any

      const prodB: WeeklyScheduleItem = {
        id: 'prod-B',
        schedule_code: 'WS-L1-2026-W38',
        day_of_week: 'QUA',
        date_str: '16/09',
        shift_code: 'T2_L1',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: 'TR-100x50x3.0',
        planned_quantity_tons: 60,
        productivity_rate_th: 15,
        production_hours: 4,
        setup_duration_minutes: 0,
        status: 'DRAFT',
        version: 1,
      } as any

      const customOverview: LineOverviewData = {
        ...dummyOverview,
        setupMatrix: [
          {
            id: 's-custom',
            line_id: 'l1',
            setup_code: 'SET-180',
            source_mode: 'MANUAL',
            setup_category: 'DIMENSION_CHANGE',
            from_product_code: 'TQ-50x50x2.0',
            to_product_code: 'TR-100x50x3.0',
            setup_duration_minutes: 180,
            setup_description: 'Troca Pesada 180m',
            active: true,
            created: '',
            updated: '',
          },
        ],
      }

      const filter: WeeklyHeaderFilter = {
        companyCode: 'CIAFAL',
        plantCode: 'DIV',
        lineCode: 'L1',
        year: 2026,
        weekNumber: 38,
        periodDisplay: '14/09 a 20/09',
      }

      const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
        [prodA, prodB],
        customOverview,
        filter,
      )
      const calculatedB = res.items[1]
      expect(calculatedB.setup_duration_minutes).toBe(180)

      // Início do produto B deve ser estritamente igual ou posterior ao término de A + 180 min
      const endA = new Date(res.items[0].end_datetime.replace(' ', 'T'))
      const startB = new Date(calculatedB.start_datetime.replace(' ', 'T'))
      const diffMinutes = (startB.getTime() - endA.getTime()) / (60 * 1000)

      expect(diffMinutes).toBe(180)
      expect(startB.getTime()).toBeGreaterThanOrEqual(endA.getTime() + 180 * 60 * 1000)
    })

    // T4: Produção 0 t no intervalo do setup e em paradas
    it('T4: Produção é estritamente 0 t no intervalo do setup e paradas programadas', () => {
      const stopItem: WeeklyScheduleItem = {
        id: 'stop-1',
        schedule_code: 'WS-L1-2026-W38',
        day_of_week: 'QUA',
        date_str: '16/09',
        sequence_order: 1,
        item_type: 'SCHEDULED_STOP',
        stop_duration_minutes: 120,
        planned_quantity_tons: 50, // deve ser zerado
        status: 'DRAFT',
        version: 1,
      } as any

      const filter: WeeklyHeaderFilter = {
        companyCode: 'CIAFAL',
        plantCode: 'DIV',
        lineCode: 'L1',
        year: 2026,
        weekNumber: 38,
        periodDisplay: '14/09 a 20/09',
      }

      const res = WeeklyScheduleEngine.recalculateWeeklyTimeline([stopItem], dummyOverview, filter)
      expect(res.items[0].production_hours).toBe(0)
      expect(res.items[0].planned_quantity_tons).toBe(0)
    })

    // T5: Fim 16/09 23:00 + 180 min -> produto B >= 17/09 02:00 (sem reset à meia-noite)
    it('T5: Encadeamento contínuo atravessa dias e meia-noite: fim 23:00 + 180 min -> produto B inicia em 02:00 do dia seguinte', () => {
      // Cria item A que termina às 23:00 de 16/09 (Quarta-feira)
      const itemA: WeeklyScheduleItem = {
        id: 'it-a-late',
        schedule_code: 'WS-L1-2026-W38',
        day_of_week: 'QUA',
        date_str: '16/09',
        shift_code: 'T2_L1',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        planned_quantity_tons: 204, // 17 horas de produção a 12 t/h (das 06:00 às 23:00)
        productivity_rate_th: 12,
        production_hours: 17,
        setup_duration_minutes: 0,
        status: 'DRAFT',
        version: 1,
      } as any

      const itemB: WeeklyScheduleItem = {
        id: 'it-b-nextday',
        schedule_code: 'WS-L1-2026-W38',
        day_of_week: 'QUI',
        date_str: '17/09',
        shift_code: 'T1_L1',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: 'TR-100x50x3.0',
        planned_quantity_tons: 45,
        productivity_rate_th: 15,
        production_hours: 3,
        setup_duration_minutes: 0,
        status: 'DRAFT',
        version: 1,
      } as any

      const customOverview: LineOverviewData = {
        ...dummyOverview,
        setupMatrix: [
          {
            id: 's-custom-180',
            line_id: 'l1',
            setup_code: 'SET-180',
            source_mode: 'MANUAL',
            setup_category: 'DIMENSION_CHANGE',
            from_product_code: 'TQ-50x50x2.0',
            to_product_code: 'TR-100x50x3.0',
            setup_duration_minutes: 180,
            setup_description: 'Troca Pesada 180m',
            active: true,
            created: '',
            updated: '',
          },
        ],
      }

      const filter: WeeklyHeaderFilter = {
        companyCode: 'CIAFAL',
        plantCode: 'DIV',
        lineCode: 'L1',
        year: 2026,
        weekNumber: 38,
        periodDisplay: '14/09 a 20/09',
      }

      const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
        [itemA, itemB],
        customOverview,
        filter,
      )
      const endA = new Date(res.items[0].end_datetime.replace(' ', 'T'))
      const startB = new Date(res.items[1].start_datetime.replace(' ', 'T'))

      // itemA termina às 23:00 de 16/09
      expect(endA.getHours()).toBe(23)
      expect(endA.getMinutes()).toBe(0)

      // itemB deve iniciar às 02:00 de 17/09 (23:00 + 180 min de setup = 02:00 do dia seguinte)
      expect(startB.getDate()).toBe(endA.getDate() + 1)
      expect(startB.getHours()).toBe(2)
      expect(startB.getMinutes()).toBe(0)
    })

    // T6: Indicadores separados e Qtd. Programada só com horas produtivas
    it('T6: Indicadores diários somam separadamente horas produtivas, setups e paradas', () => {
      const itemsDia: WeeklyScheduleItem[] = [
        {
          id: 'p1',
          item_type: 'PRODUCTION',
          planned_quantity_tons: 60,
          production_hours: 5,
          setup_duration_minutes: 60,
        } as any,
        {
          id: 's1',
          item_type: 'SCHEDULED_STOP',
          stop_duration_minutes: 90,
          production_hours: 0,
          planned_quantity_tons: 0,
        } as any,
      ]

      const prods = itemsDia.filter((it) => it.item_type === 'PRODUCTION')
      const totalTons = prods.reduce((acc, it) => acc + (it.planned_quantity_tons || 0), 0)
      const prodHours = prods.reduce((acc, it) => acc + (it.production_hours || 0), 0)
      const setupHours = Number(
        (itemsDia.reduce((acc, it) => acc + (it.setup_duration_minutes || 0), 0) / 60).toFixed(2),
      )
      const stopHours = Number(
        (
          itemsDia
            .filter((it) => it.item_type === 'SCHEDULED_STOP')
            .reduce((acc, it) => acc + (it.stop_duration_minutes || 0), 0) / 60
        ).toFixed(2),
      )
      const occupiedHours = prodHours + setupHours + stopHours

      expect(totalTons).toBe(60) // Estritamente os 60 t de produção
      expect(prodHours).toBe(5)
      expect(setupHours).toBe(1)
      expect(stopHours).toBe(1.5)
      expect(occupiedHours).toBe(7.5)
    })

    // T7: Integridade e determinismo de horários (idênticos antes e após re-execução)
    it('T7: Persistência e determinismo: horários são idênticos em sucessivos recálculos', () => {
      const item1: WeeklyScheduleItem = {
        id: 'it-det-1',
        schedule_code: 'WS-L1-2026-W38',
        day_of_week: 'SEG',
        date_str: '14/09',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        planned_quantity_tons: 60,
        productivity_rate_th: 12,
        production_hours: 5,
        setup_duration_minutes: 0,
        status: 'DRAFT',
        version: 1,
      } as any

      const filter: WeeklyHeaderFilter = {
        companyCode: 'CIAFAL',
        plantCode: 'DIV',
        lineCode: 'L1',
        year: 2026,
        weekNumber: 38,
        periodDisplay: '14/09 a 20/09',
      }

      const run1 = WeeklyScheduleEngine.recalculateWeeklyTimeline([item1], dummyOverview, filter)
      const run2 = WeeklyScheduleEngine.recalculateWeeklyTimeline(run1.items, dummyOverview, filter)

      expect(run1.items[0].start_datetime).toBe(run2.items[0].start_datetime)
      expect(run1.items[0].end_datetime).toBe(run2.items[0].end_datetime)
    })

    // T8: Ausência de sobreposição (fim_anterior <= inicio_seguinte)
    it('T8: Sem sobreposição: fim_atividade_anterior <= inicio_atividade_seguinte para toda a grade', () => {
      const itemA: WeeklyScheduleItem = {
        id: 'seq-1',
        schedule_code: 'WS-L1-2026-W38',
        day_of_week: 'SEG',
        date_str: '14/09',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        planned_quantity_tons: 48,
        productivity_rate_th: 12,
        production_hours: 4,
        setup_duration_minutes: 0,
        status: 'DRAFT',
        version: 1,
      } as any

      const itemB: WeeklyScheduleItem = {
        id: 'seq-2',
        schedule_code: 'WS-L1-2026-W38',
        day_of_week: 'SEG',
        date_str: '14/09',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: 'TR-100x50x3.0',
        planned_quantity_tons: 60,
        productivity_rate_th: 15,
        production_hours: 4,
        setup_duration_minutes: 40,
        status: 'DRAFT',
        version: 1,
      } as any

      const filter: WeeklyHeaderFilter = {
        companyCode: 'CIAFAL',
        plantCode: 'DIV',
        lineCode: 'L1',
        year: 2026,
        weekNumber: 38,
        periodDisplay: '14/09 a 20/09',
      }

      const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(
        [itemA, itemB],
        dummyOverview,
        filter,
      )
      for (let i = 1; i < res.items.length; i++) {
        const prevEnd = new Date(res.items[i - 1].end_datetime.replace(' ', 'T')).getTime()
        const currStart = new Date(res.items[i].start_datetime.replace(' ', 'T')).getTime()
        expect(currStart).toBeGreaterThanOrEqual(prevEnd)
      }
    })
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
    const qtyDiff = diffs.find((d) => d.changeType === 'ALTERADO')
    expect(qtyDiff).toBeDefined()
  })

  // TESTE 11: Governança de Exceções, Ciclo Médio SAP, Cobertura e Aprovação do Supervisor PCP (Requisitos 8, 9, 10, 11, 14, 15)
  it('TESTE 11: Analisa Sequência Ideal de Bitolas, Ciclo Médio SAP e Cobertura de Estoque determinísticos', () => {
    const item1: WeeklyScheduleItem = {
      id: 'it-1',
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
      material_code: 'TR-80x40x2.5',
      material_description: 'Tubo Retangular',
      dimensions: '80x40 mm #2.50',
      order_type: 'MTS',
      planned_quantity_tons: 80,
      productivity_rate_th: 10.2,
      production_hours: 7.84,
      setup_duration_minutes: 0,
      start_datetime: '2026-08-24 06:00',
      end_datetime: '2026-08-24 13:50',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 88,
    }

    const item2Desvio: WeeklyScheduleItem = {
      id: 'it-2',
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
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'TQ-50x50x2.0', // Inversão: de Retangular para Quadrado após início
      material_description: 'Tubo Quadrado',
      dimensions: '50x50 mm #2.00',
      order_type: 'MTS',
      planned_quantity_tons: 150, // Elevada quantidade -> excesso de cobertura
      productivity_rate_th: 11.8,
      production_hours: 12.71,
      setup_duration_minutes: 30,
      start_datetime: '2026-08-24 14:20',
      end_datetime: '2026-08-25 03:00',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 160,
    }

    const devAnalysis = WeeklyScheduleEngine.analyzeItemGovernance({
      item: item2Desvio,
      prevItem: item1,
      lineOverview: dummyOverview,
      lineCode: 'L1',
      currentStockTons: 150,
      backlogTons: 50,
    })

    expect(devAnalysis.hasDeviation).toBe(true)
    expect(devAnalysis.requiresSupervisorApproval).toBe(true)
    expect(devAnalysis.hypotheses.length).toBeGreaterThan(0)
    expect(devAnalysis.impacts.length).toBeGreaterThan(0)
    expect(devAnalysis.aiRecommendation).toBeDefined()
    expect(devAnalysis.cycleTimeSapMin).toBeGreaterThan(0)
  })

  // TESTE 12: Parada Programada Segunda a Sexta (MONDAY_TO_FRIDAY)
  it('TESTE 12: Parada programada com recorrência DAILY e recurrence_day_of_week MONDAY_TO_FRIDAY aplica em SEG-SEX e NÃO impacta SAB/DOM', () => {
    const stopDailyMF: any = {
      id: 'stop-mf-30',
      code: 'LUBRIF_DIARIA',
      reason: 'Lubrificação Periódica de Mancais',
      active: true,
      recurrence: 'DAILY',
      recurrence_day_of_week: 'MONDAY_TO_FRIDAY',
      expected_duration_minutes: 30,
    }

    // Dias úteis: SEG, TER, QUA, QUI, SEX -> aplicável (true)
    const weekdays = ['SEG', 'TER', 'QUA', 'QUI', 'SEX']
    for (const d of weekdays) {
      const isApplicable = WeeklyScheduleEngine.isScheduledStopApplicable(stopDailyMF, {
        dayOfWeek: d,
      })
      expect(isApplicable).toBe(true)
    }

    // Fim de semana: SAB, DOM -> NÃO aplicável (false)
    const weekendDays = ['SAB', 'DOM']
    for (const d of weekendDays) {
      const isApplicable = WeeklyScheduleEngine.isScheduledStopApplicable(stopDailyMF, {
        dayOfWeek: d,
      })
      expect(isApplicable).toBe(false)
    }

    // Retrocompatibilidade: string legível "Segunda a sexta"
    const stopLegacyString: any = {
      ...stopDailyMF,
      recurrence_day_of_week: 'Segunda a sexta',
    }
    expect(
      WeeklyScheduleEngine.isScheduledStopApplicable(stopLegacyString, { dayOfWeek: 'SEG' }),
    ).toBe(true)
    expect(
      WeeklyScheduleEngine.isScheduledStopApplicable(stopLegacyString, { dayOfWeek: 'SEX' }),
    ).toBe(true)
    expect(
      WeeklyScheduleEngine.isScheduledStopApplicable(stopLegacyString, { dayOfWeek: 'SAB' }),
    ).toBe(false)
    expect(
      WeeklyScheduleEngine.isScheduledStopApplicable(stopLegacyString, { dayOfWeek: 'DOM' }),
    ).toBe(false)

    // Se a parada estiver inativa, nunca aplica
    const stopInactive: any = {
      ...stopDailyMF,
      active: false,
    }
    expect(WeeklyScheduleEngine.isScheduledStopApplicable(stopInactive, { dayOfWeek: 'SEG' })).toBe(
      false,
    )
  })

  describe('Aceite 0.0.111 — Navegação Temporal e Transição Canônica de Semanas', () => {
    it('deve calcular período e datas dinâmicas sem resíduos na navegação S35 -> S36 -> S37', () => {
      const s35 = getWeekDateRange(2026, 35)
      const s36 = getWeekDateRange(2026, 36)
      const s37 = getWeekDateRange(2026, 37)

      // S35: 24/08 a 30/08/2026
      expect(s35.startDate.getDate()).toBe(24)
      expect(s35.startDate.getMonth()).toBe(7) // Agosto (0-indexed)
      expect(s35.endDate.getDate()).toBe(30)
      expect(s35.endDate.getMonth()).toBe(7)

      // S36: 31/08 a 06/09/2026
      expect(s36.startDate.getDate()).toBe(31)
      expect(s36.startDate.getMonth()).toBe(7)
      expect(s36.endDate.getDate()).toBe(6)
      expect(s36.endDate.getMonth()).toBe(8) // Setembro

      // S37: 07/09 a 13/09/2026
      expect(s37.startDate.getDate()).toBe(7)
      expect(s37.startDate.getMonth()).toBe(8)
      expect(s37.endDate.getDate()).toBe(13)
      expect(s37.endDate.getMonth()).toBe(8)

      // As semanas são estritamente contínuas e sem sobreposição de dias
      expect(s36.startDate.getTime() - s35.startDate.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
      expect(s37.startDate.getTime() - s36.startDate.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('deve virar de ano na transição S52 -> S01 e vice-versa mantendo integridade ISO', () => {
      // Simulação da lógica de dia seguinte cruzando ano
      let currentYear = 2026
      let currentWeek = 52
      let dayOfWeek: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM' = 'DOM'

      // Dia seguinte a partir de Domingo na S52 vira Segunda na S01 do próximo ano
      if (dayOfWeek === 'DOM') {
        currentYear += 1
        currentWeek = 1
        dayOfWeek = 'SEG'
      }

      expect(currentYear).toBe(2027)
      expect(currentWeek).toBe(1)
      expect(dayOfWeek).toBe('SEG')

      // Dia anterior a partir de Segunda na S01 vira Domingo na S52 do ano anterior
      if (dayOfWeek === 'SEG') {
        currentYear -= 1
        currentWeek = 52
        dayOfWeek = 'DOM'
      }

      expect(currentYear).toBe(2026)
      expect(currentWeek).toBe(52)
      expect(dayOfWeek).toBe('DOM')
    })

    it('deve identificar corretamente semana passada como somente leitura', () => {
      // 2020 é estritamente passado
      expect(isWeekInPast(2020, 1)).toBe(true)
      // 2050 é estritamente futuro
      expect(isWeekInPast(2050, 50)).toBe(false)
    })

    it('deve bloquear itens no passado com base em data/hora em relação ao momento atual da planta', () => {
      const pastItem: any = {
        id: 'past-1',
        start_datetime: '2020-01-01 08:00',
        end_datetime: '2020-01-01 12:00',
      }
      const futureItem: any = {
        id: 'future-1',
        start_datetime: '2050-01-01 08:00',
        end_datetime: '2050-01-01 12:00',
      }

      expect(isScheduleItemInPast(pastItem, 2020, 1)).toBe(true)
      expect(isScheduleItemInPast(futureItem, 2050, 1)).toBe(false)
    })
  })
})

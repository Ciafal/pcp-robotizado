import { describe, it, expect } from 'vitest'
import { WeeklyScheduleEngine, RawMaterialEngineContext } from '../services/weekly-schedule-engine'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '../types/weekly-schedule'
import { LineOverviewData } from '../types/line-master'

describe('WeeklyScheduleEngine - Motor de MP e Disponibilidade Projetada', () => {
  const dummyFilter: WeeklyHeaderFilter = {
    companyCode: 'CIAFAL',
    plantCode: 'PLANTA_1',
    lineCode: 'L1',
    year: 2026,
    weekNumber: 35,
    periodDisplay: '24/08 a 30/08',
  }

  const dummyLineOverview = {
    line: {
      id: 'line-l1',
      code: 'L1',
      name: 'Linha 1 - Laminação',
      status: 'ACTIVE',
      active: true,
      created: '',
      updated: '',
    } as any,
    master: {
      id: 'lm-1',
      line_id: 'line-l1',
      line_code: 'L1',
      status: 'ACTIVE',
      version: 1,
      nominal_hourly_capacity: 15.0,
      oee_target_pct: 85,
      active: true,
      created: '',
      updated: '',
    } as any,
    shifts: [
      {
        id: 's1',
        code: 'T1',
        name: '1º Turno',
        start_time: '06:00',
        end_time: '14:00',
        duration_hours: 8,
        active: true,
        created: '',
        updated: '',
      } as any,
    ],
    productivity: [
      {
        id: 'p1',
        line_id: 'line-l1',
        material_product_code: 'TQ-100x100',
        material_product_name: 'Tubo Quadrado 100x100',
        productivity_unit: 't/h',
        planned_productivity: 15.0,
        nominal_productivity: 15.0,
        source_mode: 'MANUAL',
        active: true,
        created: '',
        updated: '',
      } as any,
      {
        id: 'p2',
        line_id: 'line-l1',
        material_product_code: 'PU-150x50',
        material_product_name: 'Perfil U 150x50',
        productivity_unit: 't/h',
        planned_productivity: 12.5,
        nominal_productivity: 12.5,
        source_mode: 'MANUAL',
        active: true,
        created: '',
        updated: '',
      } as any,
    ],
    setupMatrix: [],
    blockedProducts: [
      {
        id: 'bp-1',
        line_id: 'line-l1',
        product_code: 'BAR-ESP-500',
        product_description: 'Barra Especial Bloqueada',
        block_type: 'TECHNICAL',
        block_reason: 'Restrição metalúrgica de resfriamento',
        source_mode: 'MANUAL',
        active: true,
        created: '',
        updated: '',
      } as any,
    ],
    rawMaterials: [],
    scheduledStops: [],
  } as unknown as LineOverviewData

  it('deve calcular corretamente a duração das atividades baseado na quantidade e produtividade', () => {
    const items: WeeklyScheduleItem[] = [
      {
        id: '1',
        schedule_code: 'WS-L1-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'SEG',
        date_str: '24/08',
        shift_code: 'T1',
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-100x100',
        material_description: 'Tubo Quadrado 100x100',
        order_type: 'MTS',
        planned_quantity_tons: 30, // 30t a 15t/h = 2.0h
        productivity_rate_th: 15,
        production_hours: 0,
        setup_duration_minutes: 0,
        start_datetime: '',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 0,
      },
    ]

    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      items,
      dummyLineOverview,
      dummyFilter,
    )

    expect(result.items[0].production_hours).toBe(2)
    expect(result.items[0].raw_material_req_tons).toBeGreaterThan(30) // com perda metálica
    expect(result.indicators.programmedQuantityTons).toBe(30)
    expect(result.indicators.programmedProductiveHours).toBe(2)
  })

  it('deve identificar produtos bloqueados por restrição (Hard Block)', () => {
    const items: WeeklyScheduleItem[] = [
      {
        id: 'block-test',
        schedule_code: 'WS-L1-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'TER',
        date_str: '25/08',
        shift_code: 'T1',
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'BAR-ESP-500',
        material_description: 'Barra Especial Bloqueada',
        order_type: 'MTS',
        planned_quantity_tons: 50,
        productivity_rate_th: 12,
        production_hours: 0,
        setup_duration_minutes: 0,
        start_datetime: '',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 0,
      },
    ]

    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      items,
      dummyLineOverview,
      dummyFilter,
    )

    const blockedVal = result.validations.find((v) => v.level === 'BLOCKED')
    expect(blockedVal).toBeDefined()
    expect(blockedVal?.message).toContain('está bloqueado na Linha L1')
  })

  // REQUISITO 9 / TESTE 5: Considerar produção upstream de outra linha quando anterior à necessidade
  it('[TESTE 5] deve considerar produção upstream de outra linha quando confirmada e anterior à necessidade', () => {
    // Exemplo do usuário: L1 precisa de 150 t em 28/08, estoque atual 70 t, mas L2 produz 100 t dessa MP em 26/08 -> Total projetado = 170 t
    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-l1-teste5',
        schedule_code: 'WS-L1-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'QUI', // 28/08
        date_str: '28/08',
        shift_code: 'T1',
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'PU-150x50',
        material_description: 'Perfil U 150x50',
        steel_grade: 'SAE 1020',
        order_type: 'MTS',
        planned_quantity_tons: 145, // Com rendimento 97% -> ~149.5t de MP
        productivity_rate_th: 15,
        production_hours: 0,
        setup_duration_minutes: 0,
        start_datetime: '2026-08-28 06:00',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 0,
      },
    ]

    const context: RawMaterialEngineContext = {
      inventoryItems: [
        {
          id: 'inv-1',
          plant_code: '1000',
          plant_name: 'Planta Divinópolis',
          storage_location: 'DEP-01',
          storage_location_name: 'Pátio MP',
          material_code: 'TAR-130-1020',
          material_description: 'Tarugo SAE 1020',
          category: 'RAW_MATERIAL',
          unit: 't',
          qty_unrestricted: 70, // 70 t em estoque
          qty_blocked: 0,
          qty_in_quality: 0,
          qty_reserved: 0,
          qty_total: 70,
          source_mode: 'SAP',
          last_sync: new Date().toISOString(),
          steel_grade: 'SAE 1020',
        } as any,
      ],
      upstreamProductions: [
        {
          lineCode: 'L2',
          lineName: 'Linha L2',
          scheduleCode: 'WS-L2-2026-W35',
          materialCode: 'TAR-130-1020',
          steelGrade: 'SAE 1020',
          sectionDimension: '130x130 mm',
          quantityTons: 100, // L2 produz 100 t
          plannedEndDatetime: '2026-08-26 14:00', // Em 26/08 (anterior ao consumo de 28/08)
          confirmed: true,
        },
      ],
      purchaseOrders: [],
      otherWeeklySchedules: [],
    }

    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      items,
      dummyLineOverview,
      dummyFilter,
      context,
    )

    const processed = result.items[0]
    expect(processed.raw_material_calc).toBeDefined()
    // Disponibilidade Projetada = 70 t (estoque) + 100 t (L2 upstream em 26/08) = 170 t
    expect(processed.raw_material_calc?.currentSapStockTons).toBe(70)
    expect(processed.raw_material_calc?.upstreamProductionTons).toBe(100)
    expect(processed.raw_material_calc?.projectedAvailableTons).toBe(170)
    // Saldo projetado positivo (170 - ~149.5 > 0) -> Status não é RED
    expect(processed.raw_material_calc?.projectedBalanceTons).toBeGreaterThan(0)
    expect(processed.raw_material_calc?.status).toBe('YELLOW') // Amarelo pois depende de upstream
    expect(processed.raw_material_calc?.statusReason).toContain('Depende da produção upstream de outra linha')
  })

  // REQUISITO 9 / TESTE 6: Pedido de compra que chega depois da produção -> Alerta crítico de indisponibilidade na data
  it('[TESTE 6] pedido de compra que chega depois da produção NÃO deve contar como disponível e gerar alerta crítico', () => {
    // Consumo ocorre em 25/08, mas PO chega apenas em 29/08 (posterior)
    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-l1-teste6',
        schedule_code: 'WS-L1-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'TER', // 25/08
        date_str: '25/08',
        shift_code: 'T1',
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-100x100-1045',
        material_description: 'Tubo 100x100 Aço SAE 1045',
        steel_grade: 'SAE 1045',
        order_type: 'MTS',
        planned_quantity_tons: 80,
        productivity_rate_th: 15,
        production_hours: 0,
        setup_duration_minutes: 0,
        start_datetime: '2026-08-25 08:00', // Consumo em 25/08
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 0,
      },
    ]

    const context: RawMaterialEngineContext = {
      inventoryItems: [], // Zero estoque atual
      purchaseOrders: [
        {
          orderNumber: '4500999999',
          materialCode: 'TAR-150-1045',
          materialDescription: 'Tarugo 150x150 SAE 1045',
          steelGrade: 'SAE 1045',
          supplierCode: 'FORN-01',
          supplierName: 'Aperam',
          totalQuantityTons: 100,
          receivedQuantityTons: 0,
          openBalanceTons: 100,
          estimatedDeliveryDate: '2026-08-29 18:00', // Chega 29/08 (depois de 25/08!)
          status: 'IN_TRANSIT',
          consideredAvailable: true,
          availableQuantityTons: 100,
        },
      ],
      upstreamProductions: [],
      otherWeeklySchedules: [],
    }

    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      items,
      dummyLineOverview,
      dummyFilter,
      context,
    )

    const processed = result.items[0]
    expect(processed.raw_material_calc).toBeDefined()
    // PO chega tarde -> 0 toneladas consideradas disponíveis
    expect(processed.raw_material_calc?.confirmedPoTons).toBe(0)
    expect(processed.raw_material_calc?.projectedAvailableTons).toBe(0)
    expect(processed.raw_material_calc?.projectedBalanceTons).toBeLessThan(0)
    // Semáforo Vermelho de Ruptura
    expect(processed.raw_material_calc?.status).toBe('RED')
    expect(processed.raw_material_calc?.statusLabel).toBe('MP INSUFICIENTE')

    // Alerta Crítico disparado nas validações
    const criticalMpVal = result.validations.find((v) => v.code === 'VAL-MP-01')
    expect(criticalMpVal).toBeDefined()
    expect(criticalMpVal?.level).toBe('CRITICAL')
    expect(criticalMpVal?.message).toContain('Déficit')

    // O PO no contexto deve ter sido marcado como NÃO disponível com o motivo
    const poResult = context.purchaseOrders?.[0]
    expect(poResult?.consideredAvailable).toBe(false)
    expect(poResult?.disregardReason).toContain('POSTERIOR')
  })

  // REQUISITO 9 / TESTE 7: Duas linhas consumindo o mesmo saldo -> Detectar conflito consolidado de duplo comprometimento
  it('[TESTE 7] duas linhas consumindo o mesmo saldo de MP devem gerar alerta de conflito de duplo comprometimento consolidado', () => {
    // Linha 1 precisa de 150 t em 29/08
    const itemsL1: WeeklyScheduleItem[] = [
      {
        id: 'item-l1-teste7',
        schedule_code: 'WS-L1-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'SEX', // 29/08
        date_str: '29/08',
        shift_code: 'T1',
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'PU-150x50',
        material_description: 'Perfil U 150x50',
        steel_grade: 'SAE 1020',
        order_type: 'MTS',
        planned_quantity_tons: 150,
        productivity_rate_th: 15,
        production_hours: 0,
        setup_duration_minutes: 0,
        start_datetime: '2026-08-29 06:00',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 154.6,
      },
    ]

    // Linha 3 concorrente consumindo 100 t em 30/08
    const otherSchedules: WeeklyScheduleItem[] = [
      {
        id: 'item-l3-teste7',
        schedule_code: 'WS-L3-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L3',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'SAB', // 30/08
        date_str: '30/08',
        shift_code: 'T1',
        shift_name: '1º Turno',
        crew_name: 'Turma B',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-100x100',
        material_description: 'Tubo 100x100',
        steel_grade: 'SAE 1020',
        order_type: 'MTS',
        planned_quantity_tons: 100,
        productivity_rate_th: 15,
        production_hours: 0,
        setup_duration_minutes: 0,
        start_datetime: '2026-08-30 06:00',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 104.2,
      },
    ]

    // Saldo disponível total = 200 t (inferior a 154.6 + 104.2 = 258.8 t)
    const context: RawMaterialEngineContext = {
      inventoryItems: [
        {
          id: 'inv-1020',
          plant_code: '1000',
          plant_name: 'Planta Divinópolis',
          storage_location: 'DEP-01',
          storage_location_name: 'Pátio MP',
          material_code: 'TAR-130-1020',
          material_description: 'Tarugo SAE 1020',
          category: 'RAW_MATERIAL',
          unit: 't',
          qty_unrestricted: 200, // Saldo total = 200 t
          qty_blocked: 0,
          qty_in_quality: 0,
          qty_reserved: 0,
          qty_total: 200,
          source_mode: 'SAP',
          last_sync: new Date().toISOString(),
          steel_grade: 'SAE 1020',
        } as any,
      ],
      upstreamProductions: [],
      purchaseOrders: [],
      otherWeeklySchedules: otherSchedules,
    }

    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      itemsL1,
      dummyLineOverview,
      dummyFilter,
      context,
    )

    // Deve detectar o conflito consolidado de Duplo Comprometimento
    expect(result.summary.dualCommitments).toBeDefined()
    expect(result.summary.dualCommitments.length).toBeGreaterThan(0)

    const conflict = result.summary.dualCommitments[0]
    expect(conflict.steelGrade).toBe('SAE 1020')
    expect(conflict.projectedAvailableTons).toBe(200)
    expect(conflict.deficitTons).toBeGreaterThan(0)
    expect(conflict.consumerSchedules.length).toBe(2)
    expect(conflict.alertMessage).toContain('Conflito de Duplo Comprometimento')

    // Deve conter validação com nível CRITICAL
    const dualVal = result.validations.find((v) => v.code === 'VAL-MP-DUAL')
    expect(dualVal).toBeDefined()
    expect(dualVal?.level).toBe('CRITICAL')
  })

  it('deve calcular corretamente os novos indicadores consolidados de semáforo na WeeklyIndicatorsBar', () => {
    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-ind-1',
        schedule_code: 'WS-L1-2026-W35',
        company_code: 'CIAFAL',
        plant_code: 'PLANTA_1',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        period_display: '24/08 a 30/08',
        day_of_week: 'SEG',
        date_str: '24/08',
        shift_code: 'T1',
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-100x100',
        material_description: 'Tubo Quadrado 100x100',
        steel_grade: 'SAE 1020',
        order_type: 'MTS',
        planned_quantity_tons: 50,
        productivity_rate_th: 15,
        production_hours: 0,
        setup_duration_minutes: 0,
        start_datetime: '2026-08-24 06:00',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 0,
      },
    ]

    const context: RawMaterialEngineContext = {
      inventoryItems: [
        {
          id: 'inv-100',
          plant_code: '1000',
          plant_name: 'Planta Divinópolis',
          storage_location: 'DEP-01',
          storage_location_name: 'Pátio MP',
          material_code: 'TAR-130-1020',
          material_description: 'Tarugo SAE 1020',
          category: 'RAW_MATERIAL',
          unit: 't',
          qty_unrestricted: 100, // 100t disponíveis > 50t demanda
          qty_blocked: 0,
          qty_in_quality: 0,
          qty_reserved: 0,
          qty_total: 100,
          source_mode: 'SAP',
          last_sync: new Date().toISOString(),
          steel_grade: 'SAE 1020',
        } as any,
      ],
      upstreamProductions: [],
      purchaseOrders: [],
      otherWeeklySchedules: [],
    }

    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(
      items,
      dummyLineOverview,
      dummyFilter,
      context,
    )

    expect(result.indicators.rawMaterialAvailableTons).toBe(100)
    expect(result.indicators.rawMaterialRequiredTons).toBeGreaterThan(50)
    expect(result.indicators.rawMaterialBalanceTons).toBeGreaterThan(0)
    expect(result.indicators.rawMaterialGreenCount).toBe(1)
    expect(result.indicators.rawMaterialRedCount).toBe(0)
    expect(result.indicators.rawMaterialYellowCount).toBe(0)
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WeeklyScheduleEngine, getWeekDateRange } from '@/services/weekly-schedule-engine'
import { weeklyScheduleService } from '@/services/weekly-schedule-service'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'

describe('PCP Robotizado - Montagem Semanal Operacional (Testes Funcionais CIAFAL)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockLineOverviewL1: LineOverviewData = {
    line: {
      id: 'line-l1-id',
      code: 'L1',
      name: 'Linha 1 - Laminação Contínua',
      type: 'LAMINACAO',
      active: true,
    } as any,
    master: {
      id: 'master-l1',
      production_line_id: 'line-l1-id',
      name: 'Ficha Mestre Linha L1',
      nominal_hourly_capacity: 12.0,
      active: true,
    } as any,
    productivity: [
      {
        id: 'prod-1',
        material_product_code: 'TQ-50x50x2.0',
        material_product_name: 'Tubo Quadrado 50x50x2.0mm',
        planned_productivity: 12.5,
        nominal_productivity: 12.0,
        active: true,
      } as any,
      {
        id: 'prod-2',
        material_product_code: 'TR-80x40x2.5',
        material_product_name: 'Tubo Retangular 80x40x2.5mm',
        planned_productivity: 10.0,
        nominal_productivity: 10.0,
        active: true,
      } as any,
    ],
    blockedProducts: [
      {
        id: 'block-1',
        production_line_id: 'line-l1-id',
        product_code: 'PERF-PESADO-300',
        product_description: 'Perfil Pesado 300mm Incompatível com Trem L1',
        block_reason: 'Restrição física de rolos e potência do trem desbastador.',
        valid_from: '2026-01-10',
        active: true,
      } as any,
      {
        id: 'block-2',
        production_line_id: 'line-l1-id',
        product_code: 'BLOCKED-MAT-99',
        product_description: 'Material Especial Não Homologado',
        block_reason: 'Velocidade excessiva de resfriamento causa trinca.',
        valid_from: '2026-02-01',
        active: true,
      } as any,
    ],
    setupMatrix: [
      {
        id: 'setup-1',
        from_product_code: 'TQ-50x50x2.0',
        to_product_code: 'TR-80x40x2.5',
        setup_duration_minutes: 25,
        setup_description: 'Troca de matrizes quadrada para retangular',
        active: true,
      } as any,
    ],
    shifts: [
      { id: 's1', code: 'T1_L1', name: '1º Turno Matutino', start_time: '06:00', end_time: '14:20', duration_hours: 8 } as any,
      { id: 's2', code: 'T2_L1', name: '2º Turno Vespertino', start_time: '14:20', end_time: '22:40', duration_hours: 8 } as any,
      { id: 's3', code: 'T3_L1', name: '3º Turno Noturno', start_time: '22:40', end_time: '06:00', duration_hours: 8 } as any,
    ],
    scheduledStops: [
      { id: 'stop-1', code: 'PREV_01', description: 'Manutenção Preventiva Semanal', duration_minutes: 60, active: true } as any,
    ],
    capabilities: [],
    rawMaterials: [],
    history: [],
    hierarchy: [],
    managers: [],
    approvers: [],
    sequencing: [],
    setups: [],
    constraints: [],
    rulePacks: [],
    alerts: [],
    completeness: 100,
    readyForScheduling: true,
  }

  const mockHeaderFilter: WeeklyHeaderFilter = {
    companyCode: 'CIAFAL',
    plantCode: 'PLANTA_1',
    lineCode: 'L1',
    year: 2026,
    weekNumber: 35,
    periodDisplay: '24/08 a 30/08',
  }

  // =========================================================================
  // TESTE 1: Selecionar L1 e Semana 35 (Período e Ficha Mestre)
  // =========================================================================
  it('TESTE 1: Deve calcular corretamente o período da semana e carregar a Ficha Mestre da linha L1', () => {
    const range = getWeekDateRange(2026, 35)
    expect(range.display).toBe('24/08 a 30/08')
    expect(mockLineOverviewL1.line.code).toBe('L1')
    expect(mockLineOverviewL1.master?.nominal_hourly_capacity).toBe(12.0)
    expect(mockLineOverviewL1.shifts.length).toBe(3)
  })

  // =========================================================================
  // TESTE 2: Adicionar produto válido informando somente 100 t
  // O sistema obtém automaticamente: produtividade, horas necessárias, setup, início/fim e saldo de capacidade
  // =========================================================================
  it('TESTE 2: Ao informar somente 100 t de produto válido, o sistema calcula horas, setup, início/fim e capacidade automaticamente', () => {
    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-1',
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
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        material_description: 'Tubo Quadrado 50x50x2.0mm',
        family_code: 'TUB_QUAD',
        steel_grade: 'SAE 1020',
        order_type: 'MTS',
        planned_quantity_tons: 100, // Programador informa apenas 100 t
        productivity_rate_th: 0,
        production_hours: 0,
        setup_duration_minutes: 0,
        start_datetime: '',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 0,
      },
    ]

    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(items, mockLineOverviewL1, mockHeaderFilter)
    const processedItem = result.items[0]

    // 1. Produtividade obtida da Ficha Mestre (12.5 t/h)
    expect(processedItem.productivity_rate_th).toBe(12.5)

    // 2. Horas calculadas = 100 / 12.5 = 8.00 h
    expect(processedItem.production_hours).toBe(8.0)

    // 3. Setup do primeiro item = 0 min
    expect(processedItem.setup_duration_minutes).toBe(0)

    // 4. Início e Término automáticos (Início 06:00 -> Término 14:00)
    expect(processedItem.start_datetime).toContain('06:00')
    expect(processedItem.end_datetime).toContain('14:00')

    // 5. Demanda de MP calculada
    expect(processedItem.raw_material_req_tons).toBe(102.5)

    // 6. Indicadores de Capacidade e Saldo
    expect(result.indicators.programmedQuantityTons).toBe(100)
    expect(result.indicators.programmedProductiveHours).toBe(8.0)
    expect(result.indicators.availableCapacityHours).toBe(144.0) // 6 dias * 3 turnos * 8h
    expect(result.indicators.freeHours).toBe(136.0) // 144 - 8
    expect(result.indicators.utilizationPct).toBe(5.6)
  })

  // =========================================================================
  // TESTE 3: Adicionar material bloqueado -> Erro e impedimento (HARD BLOCK)
  // =========================================================================
  it('TESTE 3: Deve detectar material bloqueado (HARD BLOCK) e emitir validação crítica de impedimento', () => {
    // 1. Verificação direta pelo motor
    const blockedCheck = WeeklyScheduleEngine.checkHardBlock('PERF-PESADO-300', mockLineOverviewL1)
    expect(blockedCheck).not.toBeNull()
    expect(blockedCheck?.product_code).toBe('PERF-PESADO-300')
    expect(blockedCheck?.block_reason).toContain('Restrição física')

    // 2. Simulação de tentativa de item bloqueado na timeline
    const blockedItems: WeeklyScheduleItem[] = [
      {
        id: 'item-blocked',
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
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'PERF-PESADO-300',
        material_description: 'Perfil Pesado Bloqueado',
        order_type: 'MTO',
        planned_quantity_tons: 50,
        productivity_rate_th: 10,
        production_hours: 5,
        setup_duration_minutes: 0,
        start_datetime: '',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 51.25,
      },
    ]

    const result = WeeklyScheduleEngine.recalculateWeeklyTimeline(blockedItems, mockLineOverviewL1, mockHeaderFilter)
    expect(result.validations.length).toBeGreaterThan(0)
    const blockValidation = result.validations.find((v) => v.code === 'VAL-02')
    expect(blockValidation).toBeDefined()
    expect(blockValidation?.level).toBe('BLOCKED')
    expect(result.indicators.criticalAlertsCount).toBe(1)
  })

  // =========================================================================
  // TESTE 8: Arrastar produto para outra posição / reordenar -> Recalcular em tempo real setup, horários, capacidade e score
  // =========================================================================
  it('TESTE 8: Deve recalcular em tempo real setup, linha do tempo e score ao inverter a sequência', () => {
    // Ordem Inicial: TQ-50x50x2.0 (Item 1) -> TR-80x40x2.5 (Item 2)
    const seqA: WeeklyScheduleItem[] = [
      {
        id: 'it-1',
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
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        material_description: 'Tubo Quadrado',
        family_code: 'TUB_QUAD',
        order_type: 'MTS',
        planned_quantity_tons: 100,
        productivity_rate_th: 12.5,
        production_hours: 8,
        setup_duration_minutes: 0,
        start_datetime: '',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 102.5,
      },
      {
        id: 'it-2',
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
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 2,
        item_type: 'PRODUCTION',
        material_code: 'TR-80x40x2.5',
        material_description: 'Tubo Retangular',
        family_code: 'TUB_RET',
        order_type: 'MTS',
        planned_quantity_tons: 50,
        productivity_rate_th: 10.0,
        production_hours: 5,
        setup_duration_minutes: 0,
        start_datetime: '',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 51.25,
      },
    ]

    const resA = WeeklyScheduleEngine.recalculateWeeklyTimeline(seqA, mockLineOverviewL1, mockHeaderFilter)
    // Na seqA, o Item 2 tem setup específico da matriz (25 min)
    expect(resA.items[1].setup_duration_minutes).toBe(25)
    expect(resA.items[1].start_datetime).toContain('14:00') // Término de it-1 (06:00 + 8h)
    // Término = 14:00 + 25 min setup + 5h prod = 19:25
    expect(resA.items[1].end_datetime).toContain('19:25')

    // Reordenação / Arrastar: TR-80x40x2.5 (Item 1) -> TQ-50x50x2.0 (Item 2)
    const seqB: WeeklyScheduleItem[] = [
      { ...seqA[1], sequence_order: 1 },
      { ...seqA[0], sequence_order: 2 },
    ]

    const resB = WeeklyScheduleEngine.recalculateWeeklyTimeline(seqB, mockLineOverviewL1, mockHeaderFilter)
    // O novo primeiro item (TR-80x40x2.5) começa às 06:00 e dura 5h -> término 11:00
    expect(resB.items[0].start_datetime).toContain('06:00')
    expect(resB.items[0].end_datetime).toContain('11:00')
    expect(resB.items[0].setup_duration_minutes).toBe(0)

    // O segundo item agora começa às 11:00
    expect(resB.items[1].start_datetime).toContain('11:00')
    expect(resB.indicators.programmedQuantityTons).toBe(150)
    expect(resB.indicators.sequenceScore).toBeGreaterThanOrEqual(70)
  })

  // =========================================================================
  // TESTE ADICIONAL: Inclusão de Parada Programada reduzindo capacidade
  // =========================================================================
  it('Deve incluir paradas programadas na linha do tempo e deduzir da capacidade disponível', () => {
    const itemsWithStop: WeeklyScheduleItem[] = [
      {
        id: 'it-prod',
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
        shift_name: '1º Turno',
        crew_name: 'Turma A',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'TQ-50x50x2.0',
        material_description: 'Tubo Quadrado',
        order_type: 'MTS',
        planned_quantity_tons: 50,
        productivity_rate_th: 12.5,
        production_hours: 4,
        setup_duration_minutes: 0,
        start_datetime: '',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 51.25,
      },
      {
        id: 'it-stop',
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
        shift_name: '1º Turno',
        crew_name: 'Manutenção',
        sequence_order: 2,
        item_type: 'SCHEDULED_STOP',
        material_code: 'PARADA_MANUT',
        material_description: 'Manutenção Preventiva',
        order_type: 'MTS',
        planned_quantity_tons: 0,
        productivity_rate_th: 0,
        production_hours: 0,
        setup_duration_minutes: 0,
        stop_duration_minutes: 90,
        start_datetime: '',
        end_datetime: '',
        status: 'DRAFT',
        version: 1,
        raw_material_req_tons: 0,
      },
    ]

    const res = WeeklyScheduleEngine.recalculateWeeklyTimeline(itemsWithStop, mockLineOverviewL1, mockHeaderFilter)
    expect(res.indicators.stoppedHours).toBe(1.5) // 90 min = 1.5h
    expect(res.items[1].start_datetime).toContain('10:00') // Início 06:00 + 4h de prod
    expect(res.items[1].end_datetime).toContain('11:30') // 10:00 + 1.5h de parada
  })
})

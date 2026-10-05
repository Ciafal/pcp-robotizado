import { describe, it, expect } from 'vitest'
import {
  WeeklyScheduleEngine,
  findFirstAvailableStartTime,
} from '../services/weekly-schedule-engine'
import { LineOverviewData } from '../types/line-master'
import { WeeklyScheduleItem } from '../types/weekly-schedule'

describe('WeeklyScheduleEngine - findFirstAvailableStartTime', () => {
  const mockLineOverview: LineOverviewData = {
    line_code: 'L1',
    line_name: 'Linha 1 - Laminação',
    shifts: [
      {
        id: 'shift-1',
        line_code: 'L1',
        code: 'T1_L1',
        name: '1º Turno Matutino',
        start_time: '06:00',
        end_time: '14:20',
        active: true,
      },
      {
        id: 'shift-2',
        line_code: 'L1',
        code: 'T2_L1',
        name: '2º Turno Vespertino',
        start_time: '14:20',
        end_time: '22:40',
        active: true,
      },
    ],
    scheduledStops: [],
  } as any

  it('(d) Sugere início do turno quando não há blocos ocupados', () => {
    const res = findFirstAvailableStartTime({
      items: [],
      dayOfWeek: 'SEG',
      shiftCode: 'T1_L1',
      durationMinutes: 120,
      lineOverview: mockLineOverview,
      targetDate: '2026-03-30',
    })

    expect(res.suggestedStartTime).toBe('06:00')
    expect(res.isShiftStart).toBe(true)
    expect(res.shiftOfficialStartTime).toBe('06:00')
  })

  it('(a) Lê o início oficial do turno REAL de lineOverview.shifts e nunca 06:00 fixo para turnos alternativos', () => {
    const customLineOverview: LineOverviewData = {
      ...mockLineOverview,
      shifts: [
        {
          id: 'shift-special',
          line_code: 'L1',
          code: 'T_CUSTOM',
          name: 'Turno Especial',
          start_time: '07:30',
          end_time: '16:00',
          active: true,
        },
      ],
    } as any

    const res = findFirstAvailableStartTime({
      items: [],
      dayOfWeek: 'SEG',
      shiftCode: 'T_CUSTOM',
      durationMinutes: 90,
      lineOverview: customLineOverview,
      targetDate: '2026-03-30',
    })

    expect(res.suggestedStartTime).toBe('07:30')
    expect(res.isShiftStart).toBe(true)
    expect(res.shiftOfficialStartTime).toBe('07:30')
  })

  it('(f) Sugere o término do último bloco quando já existe produto programado (ex: 06:00 -> 10:15)', () => {
    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-1',
        sequence_order: 1,
        day_of_week: 'SEG',
        shift_code: 'T1_L1',
        material_code: 'VERGALHAO-10MM',
        planned_quantity_tons: 85,
        start_datetime: 'SEG 06:00',
        end_datetime: 'SEG 10:15',
        status: 'PUBLISHED',
        item_type: 'PRODUCTION',
      } as any,
    ]

    const res = findFirstAvailableStartTime({
      items,
      dayOfWeek: 'SEG',
      shiftCode: 'T1_L1',
      durationMinutes: 120,
      lineOverview: mockLineOverview,
      targetDate: '2026-03-30',
    })

    expect(res.suggestedStartTime).toBe('10:15')
    expect(res.isShiftStart).toBe(false)
  })

  it('(b) Consolida e funde blocos ocupados incluindo setup e paradas programadas', () => {
    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-1',
        sequence_order: 1,
        day_of_week: 'SEG',
        shift_code: 'T1_L1',
        material_code: 'VERGALHAO-10MM',
        start_datetime: 'SEG 06:00',
        end_datetime: 'SEG 08:00',
        status: 'PUBLISHED',
        item_type: 'PRODUCTION',
      } as any,
      {
        id: 'item-2',
        sequence_order: 2,
        day_of_week: 'SEG',
        shift_code: 'T1_L1',
        material_code: 'VERGALHAO-12MM',
        setup_start: '08:00',
        setup_end: '08:45',
        start_datetime: 'SEG 08:45',
        end_datetime: 'SEG 11:30',
        status: 'PUBLISHED',
        item_type: 'PRODUCTION',
      } as any,
    ]

    const res = findFirstAvailableStartTime({
      items,
      dayOfWeek: 'SEG',
      shiftCode: 'T1_L1',
      durationMinutes: 60,
      lineOverview: mockLineOverview,
      targetDate: '2026-03-30',
    })

    expect(res.suggestedStartTime).toBe('11:30')
  })

  it('(e) Identifica gap livre entre blocos quando cabe a duração integral', () => {
    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-1',
        sequence_order: 1,
        day_of_week: 'SEG',
        shift_code: 'T1_L1',
        material_code: 'PROD-A',
        start_datetime: 'SEG 06:00',
        end_datetime: 'SEG 07:30',
        status: 'PUBLISHED',
        item_type: 'PRODUCTION',
      } as any,
      {
        id: 'item-2',
        sequence_order: 2,
        day_of_week: 'SEG',
        shift_code: 'T1_L1',
        material_code: 'PROD-B',
        start_datetime: 'SEG 10:00',
        end_datetime: 'SEG 13:00',
        status: 'PUBLISHED',
        item_type: 'PRODUCTION',
      } as any,
    ]

    // Gap entre 07:30 e 10:00 é 150 minutos.
    // Duração solicitada: 90 minutos -> deve sugerir 07:30
    const res = findFirstAvailableStartTime({
      items,
      dayOfWeek: 'SEG',
      shiftCode: 'T1_L1',
      durationMinutes: 90,
      lineOverview: mockLineOverview,
      targetDate: '2026-03-30',
    })

    expect(res.suggestedStartTime).toBe('07:30')
    expect(res.isShiftStart).toBe(false)

    // Se duração solicitada for 180 min (maior que o gap de 150 min) -> sugere fim do último bloco (13:00)
    const res2 = findFirstAvailableStartTime({
      items,
      dayOfWeek: 'SEG',
      shiftCode: 'T1_L1',
      durationMinutes: 180,
      lineOverview: mockLineOverview,
      targetDate: '2026-03-30',
    })

    expect(res2.suggestedStartTime).toBe('13:00')
  })

  it('Ignora itens cancelados na consolidação de blocos ocupados', () => {
    const items: WeeklyScheduleItem[] = [
      {
        id: 'item-cancelled',
        sequence_order: 1,
        day_of_week: 'SEG',
        shift_code: 'T1_L1',
        material_code: 'PROD-CANCELLED',
        start_datetime: 'SEG 06:00',
        end_datetime: 'SEG 10:00',
        status: 'CANCELLED',
        item_type: 'PRODUCTION',
      } as any,
    ]

    const res = findFirstAvailableStartTime({
      items,
      dayOfWeek: 'SEG',
      shiftCode: 'T1_L1',
      durationMinutes: 60,
      lineOverview: mockLineOverview,
      targetDate: '2026-03-30',
    })

    expect(res.suggestedStartTime).toBe('06:00')
    expect(res.isShiftStart).toBe(true)
  })
})

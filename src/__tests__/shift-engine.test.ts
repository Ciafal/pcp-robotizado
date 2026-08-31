import { describe, it, expect } from 'vitest'
import { ShiftEngine } from '@/services/shift-engine'
import { ProductionShift } from '@/types/line-master'

describe('ShiftEngine — Motor de Turnos da Ficha Mestra', () => {
  it('deve calcular corretamente a duração de turno diurno (ex: 06:00 -> 14:00)', () => {
    const result = ShiftEngine.calculateShiftDuration('06:00', '14:00', 0)
    expect(result.durationHours).toBe(8)
    expect(result.crossesMidnight).toBe(false)
  })

  it('deve calcular com precisão turno noturno que atravessa a meia-noite (22:00 -> 06:00)', () => {
    const result = ShiftEngine.calculateShiftDuration('22:00', '06:00', 0)
    expect(result.durationHours).toBe(8)
    expect(result.crossesMidnight).toBe(true)
  })

  it('deve calcular escala 12x36 noturna (19:00 -> 07:00)', () => {
    const result = ShiftEngine.calculateShiftDuration('19:00', '07:00', 60) // 1h de intervalo
    expect(result.durationHours).toBe(11)
    expect(result.crossesMidnight).toBe(true)
  })

  it('deve respeitar vigência histórica (valid_from e valid_until)', () => {
    const shifts: ProductionShift[] = [
      {
        id: 's1',
        line_id: 'L1',
        code: 'T1-LEGACY',
        name: 'Turno Antigo',
        start_time: '08:00',
        end_time: '16:00',
        duration_hours: 8,
        active: true,
        valid_until: '2026-08-31',
      },
      {
        id: 's2',
        line_id: 'L1',
        code: 'T1-NEW',
        name: 'Turno Novo',
        start_time: '06:00',
        end_time: '14:00',
        duration_hours: 8,
        active: true,
        valid_from: '2026-09-01',
      },
    ]

    const augustShifts = ShiftEngine.getActiveShiftsForDate(shifts, '2026-08-15')
    expect(augustShifts.length).toBe(1)
    expect(augustShifts[0].code).toBe('T1-LEGACY')

    const septShifts = ShiftEngine.getActiveShiftsForDate(shifts, '2026-09-15')
    expect(septShifts.length).toBe(1)
    expect(septShifts[0].code).toBe('T1-NEW')
  })

  it('deve calcular taxa de ocupação real acima de 100% sem truncar', () => {
    const occupancy = ShiftEngine.calculateRealOccupancy(26.0, 16.0)
    expect(occupancy.occupancyPct).toBe(162.5)
    expect(occupancy.isOverloaded).toBe(true)
    expect(occupancy.alertMessage).toContain('SOBRECARGA DE CAPACIDADE')
  })
})

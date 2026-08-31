import { ProductionShift } from '@/types/line-master'

/**
 * SERVIÇO CENTRAL DE MOTOR DE TURNOS & CAPACIDADE DINÂMICA
 * A ÚNICA fonte de verdade é a FICHA MESTRA DA LINHA PRODUTIVA:
 * EMPRESA → PLANTA → LINHA → FICHA MESTRA → CALENDÁRIO OPERACIONAL → TURNOS → HORÁRIOS → CAPACIDADE
 */
export const ShiftEngine = {
  /**
   * Calcula a duração real em horas de um turno a partir de HH:mm inicial e final.
   * Trata com precisão turnos diurnos e turnos noturnos que atravessam a meia-noite (ex: 22:00 -> 06:00 = 8h).
   */
  calculateShiftDuration(
    startTime: string,
    endTime: string,
    breakMinutes: number = 0,
  ): {
    durationHours: number
    crossesMidnight: boolean
  } {
    if (!startTime || !endTime) return { durationHours: 8.0, crossesMidnight: false }

    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return { durationHours: 8.0, crossesMidnight: false }
    }

    const startTotalMinutes = startH * 60 + startM
    let endTotalMinutes = endH * 60 + endM

    let crossesMidnight = false
    if (endTotalMinutes <= startTotalMinutes) {
      endTotalMinutes += 24 * 60 // Adiciona 24 horas para cruzar a meia-noite
      crossesMidnight = true
    }

    const netMinutes = Math.max(0, endTotalMinutes - startTotalMinutes - breakMinutes)
    const durationHours = Number((netMinutes / 60).toFixed(2))

    return {
      durationHours,
      crossesMidnight,
    }
  },

  /**
   * Filtra os turnos vigentes para uma linha em uma data de referência específica (YYYY-MM-DD).
   * Garante preservação do histórico de vigência sem sobrescrever programações passadas.
   */
  getActiveShiftsForDate(shifts: ProductionShift[], targetDateIso?: string): ProductionShift[] {
    if (!shifts || shifts.length === 0) return []

    const refDate = targetDateIso ? new Date(targetDateIso) : new Date()

    return shifts.filter((s) => {
      if (!s.active) return false

      if (s.valid_from) {
        const from = new Date(s.valid_from)
        if (refDate < from) return false
      }

      if (s.valid_until) {
        const until = new Date(s.valid_until)
        if (refDate > until) return false
      }

      return true
    })
  },

  /**
   * Calcula a capacidade diária disponível (em horas) para uma linha a partir dos turnos vigentes na Ficha Mestra.
   */
  calculateDailyAvailableHours(shifts: ProductionShift[], targetDateIso?: string): number {
    const activeShifts = this.getActiveShiftsForDate(shifts, targetDateIso)
    if (activeShifts.length === 0) return 0

    return activeShifts.reduce((acc, s) => {
      if (s.duration_hours && s.duration_hours > 0) {
        return acc + s.duration_hours
      }
      const calc = this.calculateShiftDuration(s.start_time, s.end_time, s.break_minutes || 0)
      return acc + calc.durationHours
    }, 0)
  },

  /**
   * Calcula a taxa real de ocupação da linha (Programado ÷ Disponível * 100).
   * NUNCA trunca em 100%, exibindo a sobrecarga real se houver (ex: 26h / 16h = 162,5%).
   */
  calculateRealOccupancy(
    programmedHours: number,
    availableHours: number,
  ): {
    occupancyPct: number
    isOverloaded: boolean
    alertMessage?: string
  } {
    if (availableHours <= 0) {
      return {
        occupancyPct: programmedHours > 0 ? 100 : 0,
        isOverloaded: programmedHours > 0,
        alertMessage: 'Capacidade não configurada ou 0 h disponíveis.',
      }
    }

    const pct = Number(((programmedHours / availableHours) * 100).toFixed(1))
    const isOverloaded = pct > 100

    return {
      occupancyPct: pct,
      isOverloaded,
      alertMessage: isOverloaded
        ? `SOBRECARGA DE CAPACIDADE (${pct}% de ocupação operacional)`
        : undefined,
    }
  },
}

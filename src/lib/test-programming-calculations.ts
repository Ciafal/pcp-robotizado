/**
 * Utilitários e Motor de Cálculo de Período e Desvios (PCP x MES 4.0)
 * CIAFAL PCP Robotizado
 *
 * Cobre estritamente os critérios de aceite:
 * C1: 25/09/2026 08:00 → 25/09/2026 10:30 ⇒ duração prevista "2 h 30 min".
 * C2: 25/09/2026 22:00 → 26/09/2026 03:00 ⇒ "5 h" (meia-noite OK).
 * C3: início 10:00 / fim 09:00 (mesmo dia) ⇒ salvamento bloqueado com a mensagem exata:
 *     "A data/hora de término do teste deve ser posterior à data/hora de início."
 * C5: previsto 08:00–10:00 / realizado 08:15–10:45 ⇒
 *     atraso de início (+15 min), desvio de término (+45 min), duração prevista (2 h),
 *     duração realizada (2 h 30 min), desvio absoluto (+30 min), desvio percentual (+25 %).
 */

import { formatNumberPTBR } from './formatters-ptbr'

export const MSG_REGRA_1_DATA_HORA =
  'A data/hora de término do teste deve ser posterior à data/hora de início.'

/**
 * Converte data (YYYY-MM-DD ou DD/MM/AAAA) e hora (HH:mm) para Date (horário operacional local).
 */
export function parseDateTimeOperational(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null

  let year = 0
  let month = 0
  let day = 0

  const cleanDate = dateStr.trim()
  if (cleanDate.includes('-')) {
    // YYYY-MM-DD
    const parts = cleanDate.split('-').map(Number)
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null
    year = parts[0]
    month = parts[1] - 1
    day = parts[2]
  } else if (cleanDate.includes('/')) {
    // DD/MM/YYYY
    const parts = cleanDate.split('/').map(Number)
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null
    day = parts[0]
    month = parts[1] - 1
    year = parts[2]
  } else {
    return null
  }

  const cleanTime = timeStr.trim()
  const timeParts = cleanTime.split(':').map(Number)
  if (timeParts.length < 2 || isNaN(timeParts[0]) || isNaN(timeParts[1])) return null
  const hours = timeParts[0]
  const minutes = timeParts[1]
  const seconds = timeParts.length > 2 && !isNaN(timeParts[2]) ? timeParts[2] : 0

  const d = new Date(year, month, day, hours, minutes, seconds, 0)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Formata minutos em formato brasileiro padrão do PCP:
 * 150 -> "2 h 30 min"
 * 300 -> "5 h"
 * 45 -> "45 min"
 * 120 -> "2 h"
 * 0 -> "0 min"
 */
export function formatDurationPCP(totalMinutes: number): string {
  if (isNaN(totalMinutes) || totalMinutes <= 0) return '0 min'

  const rounded = Math.round(totalMinutes)
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60

  if (hours > 0 && mins > 0) {
    return `${hours} h ${mins} min`
  }
  if (hours > 0 && mins === 0) {
    return `${hours} h`
  }
  return `${mins} min`
}

/**
 * Formata desvio em minutos com sinal explícito:
 * +15 -> "+15 min"
 * -10 -> "-10 min"
 * 0 -> "0 min"
 */
export function formatDeltaMinutes(minutes: number): string {
  if (isNaN(minutes)) return '-'
  const rounded = Math.round(minutes)
  if (rounded > 0) return `+${rounded} min`
  if (rounded < 0) return `${rounded} min`
  return '0 min'
}

/**
 * Formata desvio percentual em padrão brasileiro:
 * 25 -> "+25 %" ou "+25,0 %"
 * 12.5 -> "+12,5 %"
 * -5 -> "-5,0 %"
 * 0 -> "0,0 %"
 */
export function formatDeltaPercent(pct: number): string {
  if (isNaN(pct) || !isFinite(pct)) return '-'
  const isInteger = Math.abs(pct - Math.round(pct)) < 0.001
  const decimals = isInteger ? 0 : 1
  const formatted = formatNumberPTBR(Math.abs(pct), decimals)

  if (pct > 0) return `+${formatted} %`
  if (pct < 0) return `-${formatted} %`
  return `${formatted} %`
}

/**
 * Valida o período previsto e calcula a duração automática.
 * Regra 1: Fim anterior ou igual a início é inválido se campos completos.
 * Regra 2: Cruzamento de meia-noite é suportado quando endDate > startDate ou mesmo se no dia seguinte.
 */
export function calculatePeriodDuration(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): {
  totalMinutes: number
  formatted: string
  isValid: boolean
  errorMessage?: string
} {
  if (!startDate || !startTime || !endDate || !endTime) {
    return {
      totalMinutes: 0,
      formatted: '0 min',
      isValid: false,
      errorMessage: 'Todos os campos do período são obrigatórios.',
    }
  }

  const startDt = parseDateTimeOperational(startDate, startTime)
  const endDt = parseDateTimeOperational(endDate, endTime)

  if (!startDt || !endDt) {
    return {
      totalMinutes: 0,
      formatted: '0 min',
      isValid: false,
      errorMessage: 'Formato de data ou hora inválido.',
    }
  }

  const diffMs = endDt.getTime() - startDt.getTime()

  // Regra 1 estrita: data/hora de término deve ser POSTERIOR à data/hora de início
  if (diffMs <= 0) {
    return {
      totalMinutes: 0,
      formatted: '0 min',
      isValid: false,
      errorMessage: MSG_REGRA_1_DATA_HORA,
    }
  }

  const totalMinutes = Math.round(diffMs / (1000 * 60))
  const formatted = formatDurationPCP(totalMinutes)

  return {
    totalMinutes,
    formatted,
    isValid: true,
  }
}

export interface CalculatedDeviations {
  start_deviation_minutes: number
  start_deviation_formatted: string
  end_deviation_minutes: number
  end_deviation_formatted: string
  planned_duration_minutes: number
  planned_duration_formatted: string
  actual_duration_minutes: number
  actual_duration_formatted: string
  duration_deviation_minutes: number
  duration_deviation_formatted: string
  percentage_deviation: number
  percentage_deviation_formatted: string
  classification: 'DENTRO_PREVISTO' | 'DESVIO_MODERADO' | 'DESVIO_CRITICO'
}

/**
 * Calcula todos os desvios entre Previsto e Realizado conforme os requisitos.
 * Critério C5:
 * previsto 08:00–10:00 (120m), realizado 08:15–10:45 (150m)
 * => atraso início (+15 min)
 * => desvio término (+45 min)
 * => duração prevista (2 h)
 * => duração realizada (2 h 30 min)
 * => desvio duração (+30 min)
 * => desvio percentual (+25 %)
 */
export function calculateTestDeviations(
  planned: {
    startDate: string
    startTime: string
    endDate: string
    endTime: string
  },
  actual: {
    startDate?: string
    startTime?: string
    endDate?: string
    endTime?: string
  },
): CalculatedDeviations | null {
  if (!actual?.startDate || !actual?.startTime || !actual?.endDate || !actual?.endTime) {
    return null
  }

  const pStart = parseDateTimeOperational(planned.startDate, planned.startTime)
  const pEnd = parseDateTimeOperational(planned.endDate, planned.endTime)
  const aStart = parseDateTimeOperational(actual.startDate, actual.startTime)
  const aEnd = parseDateTimeOperational(actual.endDate, actual.endTime)

  if (!pStart || !pEnd || !aStart || !aEnd) return null

  // Desvio de início: real − previsto
  const startDevMin = Math.round((aStart.getTime() - pStart.getTime()) / (1000 * 60))

  // Desvio de término: real − previsto
  const endDevMin = Math.round((aEnd.getTime() - pEnd.getTime()) / (1000 * 60))

  // Duração prevista e realizada
  const plannedDurationMin = Math.max(
    0,
    Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60)),
  )
  const actualDurationMin = Math.max(
    0,
    Math.round((aEnd.getTime() - aStart.getTime()) / (1000 * 60)),
  )

  // Desvio de duração: realizada − prevista
  const durationDevMin = actualDurationMin - plannedDurationMin

  // Desvio percentual: ((realizada − prevista) / prevista) * 100
  let pctDev = 0
  if (plannedDurationMin > 0) {
    pctDev = Math.round(((actualDurationMin - plannedDurationMin) / plannedDurationMin) * 1000) / 10
  }

  // Classificação do semáforo:
  // Verde (Dentro do previsto): atraso <= 10 min e variação duração <= 10%
  // Amarelo (Desvio moderado): atraso <= 30 min ou variação duração <= 25%
  // Vermelho (Desvio crítico): atraso > 30 min ou variação duração > 25%
  let classification: 'DENTRO_PREVISTO' | 'DESVIO_MODERADO' | 'DESVIO_CRITICO' = 'DENTRO_PREVISTO'
  const absPct = Math.abs(pctDev)
  if (Math.abs(startDevMin) > 30 || absPct > 25) {
    classification = 'DESVIO_CRITICO'
  } else if (Math.abs(startDevMin) > 10 || absPct > 10) {
    classification = 'DESVIO_MODERADO'
  }

  return {
    start_deviation_minutes: startDevMin,
    start_deviation_formatted: formatDeltaMinutes(startDevMin),
    end_deviation_minutes: endDevMin,
    end_deviation_formatted: formatDeltaMinutes(endDevMin),
    planned_duration_minutes: plannedDurationMin,
    planned_duration_formatted: formatDurationPCP(plannedDurationMin),
    actual_duration_minutes: actualDurationMin,
    actual_duration_formatted: formatDurationPCP(actualDurationMin),
    duration_deviation_minutes: durationDevMin,
    duration_deviation_formatted: formatDeltaMinutes(durationDevMin),
    percentage_deviation: pctDev,
    percentage_deviation_formatted: formatDeltaPercent(pctDev),
    classification,
  }
}

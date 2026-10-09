/**
 * UTILITÁRIOS TEMPORAIS CENTRAIS — CIAFAL PCP ROBOTIZADO
 * Timezone da Planta: America/Sao_Paulo (UTC-3)
 * Centralização do bloqueio temporal: semanas passadas, dias passados, horários passados
 */

export const PLANT_TIMEZONE = 'America/Sao_Paulo'

/**
 * Retorna a data/hora atual no fuso da planta (America/Sao_Paulo)
 */
export function getPlantNow(): Date {
  // Converte a hora atual para a representação local de America/Sao_Paulo
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: PLANT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(new Date())
    const partMap: Record<string, string> = {}
    parts.forEach((p) => {
      partMap[p.type] = p.value
    })
    const isoString = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}`
    const d = new Date(isoString)
    if (!isNaN(d.getTime())) return d
  } catch {
    // fallback
  }
  return new Date()
}

/**
 * Retorna o número da semana ISO e ano ISO para uma data qualquer
 */
export function getIsoWeekAndYear(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Dia da semana ISO: Segunda = 1, Domingo = 7
  const dayNum = d.getUTCDay() || 7
  // Ajusta para quinta-feira da mesma semana
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

/**
 * Retorna o número de semanas ISO em determinado ano (52 ou 53)
 */
export function getIsoWeeksInYear(year: number): number {
  // O ano tem 53 semanas se 1 de janeiro ou 31 de dezembro for uma quinta-feira
  const dec28 = new Date(Date.UTC(year, 11, 28))
  return getIsoWeekAndYear(dec28).week
}

/**
 * Retorna a semana e ano ISO atuais no fuso da planta
 */
export function getCurrentPlantIsoWeek(): { year: number; week: number } {
  return getIsoWeekAndYear(getPlantNow())
}

/**
 * Retorna início e fim da semana ISO (Segunda-feira 00:00 até Domingo 23:59:59)
 */
export function getWeekDateRange(
  year: number,
  weekNumber: number,
): { startDate: Date; endDate: Date; display: string } {
  // ISO 8601 week 1 is the week with the first Thursday of the year (or Jan 4th)
  // Find Thursday of week weekNumber: Jan 4 + (weekNumber - 1) * 7
  // Then Monday is Thursday - 3 days
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayOfWeekJan4 = jan4.getUTCDay() || 7 // 1 = Monday, 7 = Sunday
  const monWeek1 = new Date(Date.UTC(year, 0, 4 - (dayOfWeekJan4 - 1)))

  const monday = new Date(monWeek1.getTime() + (weekNumber - 1) * 7 * 86400000)
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday.getTime() + 6 * 86400000)
  sunday.setUTCHours(23, 59, 59, 999)

  // Local dates matching UTC day for UI representation
  const startDate = new Date(
    monday.getUTCFullYear(),
    monday.getUTCMonth(),
    monday.getUTCDate(),
    0,
    0,
    0,
    0,
  )
  const endDate = new Date(
    sunday.getUTCFullYear(),
    sunday.getUTCMonth(),
    sunday.getUTCDate(),
    23,
    59,
    59,
    999,
  )

  const pad = (n: number) => String(n).padStart(2, '0')
  const d1 = `${pad(startDate.getDate())}/${pad(startDate.getMonth() + 1)}/${startDate.getFullYear()}`
  const d2 = `${pad(endDate.getDate())}/${pad(endDate.getMonth() + 1)}/${endDate.getFullYear()}`

  return {
    startDate,
    endDate,
    display: `${d1} a ${d2}`,
  }
}

/**
 * Retorna a data (Date) de um dia específico da semana selecionada
 */
export function getDateForDayOfWeek(
  year: number,
  weekNumber: number,
  dayOfWeek: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
): Date {
  const dayOffsetMap: Record<string, number> = {
    SEG: 0,
    TER: 1,
    QUA: 2,
    QUI: 3,
    SEX: 4,
    SAB: 5,
    DOM: 6,
  }
  const range = getWeekDateRange(year, weekNumber)
  const offset = dayOffsetMap[dayOfWeek] ?? 0
  const d = new Date(range.startDate)
  d.setDate(range.startDate.getDate() + offset)
  return d
}

/**
 * Determina se a semana é estritamente passada (terminou antes de hoje no fuso da planta)
 */
export function isWeekInPast(year: number, weekNumber: number): boolean {
  const current = getCurrentPlantIsoWeek()
  if (year < current.year) return true
  if (year > current.year) return false
  return weekNumber < current.week
}

/**
 * Determina se o dia específico da semana selecionada é estritamente passado.
 * Se a semana for passada: true.
 * Se a semana for futura: false.
 * Se a semana for atual: true se o dia for anterior a hoje.
 */
export function isDayInPast(
  year: number,
  weekNumber: number,
  dayOfWeek: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
): boolean {
  if (isWeekInPast(year, weekNumber)) return true
  const current = getCurrentPlantIsoWeek()
  if (year > current.year || (year === current.year && weekNumber > current.week)) {
    return false
  }

  // Semana atual: compara data do dia com hoje (00:00)
  const dayDate = getDateForDayOfWeek(year, weekNumber, dayOfWeek)
  dayDate.setHours(0, 0, 0, 0)
  const plantToday = getPlantNow()
  plantToday.setHours(0, 0, 0, 0)

  return dayDate.getTime() < plantToday.getTime()
}

/**
 * Determina se um horário ou item é passado considerando:
 * 1. Semana passada => sempre passado
 * 2. Semana futura => nunca passado
 * 3. Semana atual:
 *    - Dia anterior => passado
 *    - Dia posterior => futuro
 *    - Mesmo dia => verifica se end_datetime ou start_datetime já ocorreu na hora da planta
 */
export function isScheduleItemInPast(
  item: {
    year?: number
    week_number?: number
    day_of_week?: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM' | string
    start_datetime?: string
    end_datetime?: string
    date_str?: string
  },
  activeYear?: number,
  activeWeek?: number,
): boolean {
  const itemYear = item.year || activeYear
  const itemWeek = item.week_number || activeWeek

  if (itemYear && itemWeek) {
    if (isWeekInPast(itemYear, itemWeek)) return true
    const current = getCurrentPlantIsoWeek()
    if (itemYear > current.year || (itemYear === current.year && itemWeek > current.week)) {
      return false
    }
  }

  // Se tem dia da semana e ano/semana
  if (itemYear && itemWeek && item.day_of_week) {
    const dayKey = item.day_of_week as 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
    if (['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].includes(dayKey)) {
      if (isDayInPast(itemYear, itemWeek, dayKey)) {
        return true
      }
    }
  }

  // Se tiver start_datetime ou end_datetime explícito ("YYYY-MM-DD HH:mm" ou ISO)
  const checkTimeStr = item.end_datetime || item.start_datetime
  if (checkTimeStr) {
    const cleanStr = checkTimeStr.includes('T') ? checkTimeStr : checkTimeStr.replace(' ', 'T')
    const parsed = new Date(cleanStr)
    if (!isNaN(parsed.getTime())) {
      const now = getPlantNow()
      return parsed.getTime() < now.getTime()
    }
  }

  return false
}

/**
 * Mensagens padrão do sistema (Requisito 10)
 */
export const TEMPORAL_MESSAGES = {
  ITEM_PAST_BLOCKED: 'Não é permitido alterar programação com data/hora do passado.',
  ADD_PAST_BLOCKED: 'Não é permitido adicionar programação em data passada.',
  WEEK_HISTORICAL_READONLY: 'Esta semana é histórica e está disponível somente para consulta.',
  WEEK_FUTURE_EMPTY: 'Nenhuma programação cadastrada para esta semana.',
  LOADING_WEEK: (w: number) => `Carregando programação da S${String(w).padStart(2, '0')}...`,
} as const

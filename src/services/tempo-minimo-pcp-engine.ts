/**
 * Motor de Validação e Conversão de Tempo Mínimo PCP
 * Integrado entre a Ficha Mestra (Matéria-prima por Aplicação) e a Montagem Semanal
 */

import { LineRawMaterialApplication } from '@/types/raw-material-application'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { formatBrNumber, parseBrNumber } from '@/lib/number-format'

export type TempoMinimoUnidade = 'Minutos' | 'Horas' | 'Dias' | 'Semanas'

export interface TempoMinimoEvaluation {
  allowed: boolean
  hasParameter: boolean
  rawMaterialCode: string
  productCode: string
  application?: string
  requiredUnit?: TempoMinimoUnidade
  requiredValue?: number
  requiredMinutes: number
  availableMinutes: number
  availableDisplay: string
  requiredDisplay: string
  earliestAllowedDate: string // DD/MM/AAAA HH:mm
  earliestAllowedIso: string
  blockingReason?: string
  allEvaluations?: Array<{
    rawMaterialCode: string
    allowed: boolean
    requiredDisplay: string
    availableDisplay: string
    requiredMinutes: number
  }>
}

export function convertTempoMinimoToMinutes(
  valor: number,
  unidade: TempoMinimoUnidade | string,
): number {
  if (!valor || valor <= 0) return 0
  switch (unidade) {
    case 'Minutos':
      return valor
    case 'Horas':
      return valor * 60
    case 'Dias':
      return valor * 24 * 60
    case 'Semanas':
      return valor * 7 * 24 * 60
    default:
      return valor * 60
  }
}

export function formatTempoMinimoDisplay(
  valor: number | null | undefined,
  unidade: string | null | undefined,
): string {
  if (valor == null || !unidade) return 'Não cadastrado na Ficha Mestre'
  const formattedVal = formatBrNumber(valor, valor % 1 === 0 ? 0 : 2)
  return `${formattedVal} ${unidade}`
}

export function formatMinutesFriendly(mins: number): string {
  if (mins <= 0) return '0 min'
  if (mins < 60) return `${Math.round(mins)} min`
  const hours = mins / 60
  if (hours < 48) {
    const formatted = formatBrNumber(hours, hours % 1 === 0 ? 0 : 1)
    return `${formatted} h`
  }
  const days = hours / 24
  const formatted = formatBrNumber(days, days % 1 === 0 ? 0 : 1)
  return `${formatted} dias`
}

export function formatDateTimeBr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Valida a antecedência mínima para uma programação em relação a um conjunto de regras de MP por aplicação.
 * Antecedência disponível = Data/hora prevista de início da produção − Data/hora da criação/reprogramação (now)
 * Se houver múltiplas MPs, avalia todas e a MAIS RESTRITIVA prevalece.
 */
export function evaluateTempoMinimoPcp(params: {
  productCode: string
  plannedStartDateTime: string | Date // ex: '2026-09-28 18:00' ou ISO
  referenceNow?: Date // default = new Date()
  rawMaterialCodes?: string[] // ex: ['MP-01', 'MP-02']
  applicationsList: LineRawMaterialApplication[]
  centerCode?: string
}): TempoMinimoEvaluation {
  const {
    productCode,
    plannedStartDateTime,
    referenceNow = new Date(),
    rawMaterialCodes = [],
    applicationsList = [],
    centerCode,
  } = params

  const cleanProduct = (productCode || '').trim().toUpperCase()
  const cleanCenter = (centerCode || '').trim().toUpperCase()

  // Converte data de início prevista
  let startMs = 0
  if (plannedStartDateTime instanceof Date) {
    startMs = plannedStartDateTime.getTime()
  } else if (typeof plannedStartDateTime === 'string') {
    const cleanStr = plannedStartDateTime.includes('T')
      ? plannedStartDateTime
      : plannedStartDateTime.replace(' ', 'T')
    startMs = new Date(cleanStr).getTime()
  }

  const nowMs = referenceNow.getTime()
  const availableMinutes = (startMs - nowMs) / (60 * 1000)
  const availableDisplay = formatMinutesFriendly(Math.max(0, availableMinutes))

  // Filtra as regras cadastradas que correspondam ao produto e MPs
  const matchingRules: LineRawMaterialApplication[] = []

  // Normaliza códigos de MP informados
  const targetMpCodes = rawMaterialCodes.map((c) => (c || '').trim().toUpperCase()).filter(Boolean)

  for (const app of applicationsList) {
    if (cleanCenter && app.center_code && app.center_code.toUpperCase() !== cleanCenter) {
      continue
    }

    const appProd = (app.product_code || '').trim().toUpperCase()
    const appMp = (app.raw_material_code || '').trim().toUpperCase()

    const matchesProduct = !cleanProduct || appProd === cleanProduct
    const matchesMp = targetMpCodes.length === 0 || targetMpCodes.includes(appMp)

    if (matchesProduct && matchesMp && app.status === 'Ativo') {
      matchingRules.push(app)
    }
  }

  // Se não houver correspondência com MP, mas tivermos regras para o produto
  if (matchingRules.length === 0 && cleanProduct) {
    for (const app of applicationsList) {
      if (cleanCenter && app.center_code && app.center_code.toUpperCase() !== cleanCenter) {
        continue
      }
      if (
        (app.product_code || '').trim().toUpperCase() === cleanProduct &&
        app.status === 'Ativo'
      ) {
        matchingRules.push(app)
      }
    }
  }

  // Filtra apenas as que possuem Tempo Mínimo PCP configurado
  const rulesWithTempo = matchingRules.filter(
    (r) =>
      Boolean(r.tempo_minimo_pcp_unidade) &&
      r.tempo_minimo_pcp_valor != null &&
      Number(r.tempo_minimo_pcp_valor) > 0,
  )

  if (rulesWithTempo.length === 0) {
    return {
      allowed: true,
      hasParameter: false,
      rawMaterialCode: targetMpCodes[0] || 'N/D',
      productCode,
      requiredMinutes: 0,
      availableMinutes,
      availableDisplay,
      requiredDisplay: 'Tempo mínimo PCP não cadastrado na Ficha Mestre.',
      earliestAllowedDate: formatDateTimeBr(new Date(nowMs)),
      earliestAllowedIso: new Date(nowMs).toISOString(),
    }
  }

  // Avalia todas as regras encontradas
  const subEvaluations = rulesWithTempo.map((rule) => {
    const val = Number(rule.tempo_minimo_pcp_valor)
    const unit = rule.tempo_minimo_pcp_unidade as TempoMinimoUnidade
    const reqMins = convertTempoMinimoToMinutes(val, unit)
    const allowed = availableMinutes >= reqMins

    return {
      rule,
      rawMaterialCode: rule.raw_material_code,
      requiredValue: val,
      requiredUnit: unit,
      requiredMinutes: reqMins,
      allowed,
      requiredDisplay: `${formatBrNumber(val, val % 1 === 0 ? 0 : 2)} ${unit}`,
      availableDisplay,
    }
  })

  // Prevalece a restrição MAIS SEVERA / RESTRITIVA (maior requiredMinutes)
  subEvaluations.sort((a, b) => b.requiredMinutes - a.requiredMinutes)
  const mostRestrictive = subEvaluations[0]

  const earliestAllowedMs = nowMs + mostRestrictive.requiredMinutes * 60 * 1000
  const earliestAllowedDate = formatDateTimeBr(new Date(earliestAllowedMs))

  const allPassed = subEvaluations.every((e) => e.allowed)
  // Identifica a primeira MP falha ou a mais severa
  const failingEvaluation = subEvaluations.find((e) => !e.allowed) || mostRestrictive

  if (!allPassed) {
    return {
      allowed: false,
      hasParameter: true,
      rawMaterialCode: failingEvaluation.rawMaterialCode,
      productCode,
      application: failingEvaluation.rule.application,
      requiredUnit: failingEvaluation.requiredUnit,
      requiredValue: failingEvaluation.requiredValue,
      requiredMinutes: failingEvaluation.requiredMinutes,
      availableMinutes,
      availableDisplay,
      requiredDisplay: failingEvaluation.requiredDisplay,
      earliestAllowedDate: formatDateTimeBr(
        new Date(nowMs + failingEvaluation.requiredMinutes * 60 * 1000),
      ),
      earliestAllowedIso: new Date(
        nowMs + failingEvaluation.requiredMinutes * 60 * 1000,
      ).toISOString(),
      blockingReason: `A programação não pode ser realizada porque a matéria-prima ${failingEvaluation.rawMaterialCode} exige antecedência mínima de ${failingEvaluation.requiredDisplay}.`,
      allEvaluations: subEvaluations.map((s) => ({
        rawMaterialCode: s.rawMaterialCode,
        allowed: s.allowed,
        requiredDisplay: s.requiredDisplay,
        availableDisplay: s.availableDisplay,
        requiredMinutes: s.requiredMinutes,
      })),
    }
  }

  return {
    allowed: true,
    hasParameter: true,
    rawMaterialCode: mostRestrictive.rawMaterialCode,
    productCode,
    application: mostRestrictive.rule.application,
    requiredUnit: mostRestrictive.requiredUnit,
    requiredValue: mostRestrictive.requiredValue,
    requiredMinutes: mostRestrictive.requiredMinutes,
    availableMinutes,
    availableDisplay,
    requiredDisplay: mostRestrictive.requiredDisplay,
    earliestAllowedDate,
    earliestAllowedIso: new Date(earliestAllowedMs).toISOString(),
    allEvaluations: subEvaluations.map((s) => ({
      rawMaterialCode: s.rawMaterialCode,
      allowed: s.allowed,
      requiredDisplay: s.requiredDisplay,
      availableDisplay: s.availableDisplay,
      requiredMinutes: s.requiredMinutes,
    })),
  }
}

/**
 * Validação simplificada a partir de um item de programação semanal
 */
export function evaluateItemTempoMinimoPcp(
  item: WeeklyScheduleItem,
  applicationsList: LineRawMaterialApplication[],
  referenceNow = new Date(),
): TempoMinimoEvaluation {
  const mpCodes: string[] = []
  if (item.raw_material_material_code) {
    mpCodes.push(item.raw_material_material_code)
  }
  if (item.raw_material_rows && Array.isArray(item.raw_material_rows)) {
    for (const r of item.raw_material_rows) {
      if (r.materialCode && !mpCodes.includes(r.materialCode)) {
        mpCodes.push(r.materialCode)
      }
    }
  }

  return evaluateTempoMinimoPcp({
    productCode: item.material_code,
    plannedStartDateTime: item.start_datetime,
    referenceNow,
    rawMaterialCodes: mpCodes,
    applicationsList,
    centerCode: item.line_code,
  })
}

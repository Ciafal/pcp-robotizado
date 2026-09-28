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

export interface TempoMinimoPcpApplicationItem {
  id?: string
  line_id?: string
  center_code?: string
  product_code?: string
  raw_material_code?: string
  application?: string
  status?: string
  tempo_minimo_pcp_unidade?: TempoMinimoUnidade | string | null
  tempo_minimo_pcp_valor?: number | null
  tempo_minimo_pcp_minutos?: number | null
}

export interface TempoMinimoPcpEvaluationResult {
  isValid: boolean
  hasRuleConfigured: boolean
  tempoMinimoExigidoMinutos: number
  antecedenciaDisponivelMinutos: number
  minutosMinimosExigidos: number
  minutosDisponiveis: number
  horasMinimasExigidas: number
  horasDisponiveis: number
  tempoMinimoFormatado: string
  antecedenciaDisponivelFormatada: string
  primeiroInicioPermitido: Date | null
  primeiroInicioPermitidoFormatado: string
  primeiroInicioPermitidoIso: string
  message: string
  blockingItem: TempoMinimoPcpApplicationItem | null
  violatingItems: TempoMinimoPcpApplicationItem[]
  violatingRules: Array<{
    rawMaterialCode: string
    valor: number
    unidade: string
    requiredMinutes: number
    availableMinutes: number
  }>
  mostRestrictiveRule?: {
    rawMaterialCode: string
    valor: number
    unidade: string
    requiredMinutes: number
  } | null
  allEvaluatedRules?: Array<{
    rawMaterialCode: string
    valor: number
    unidade: string
    requiredMinutes: number
    atendido: boolean
  }>
}

export function calculateMinimoPcpAntecedencia(
  unidade: TempoMinimoUnidade | string | null | undefined,
  valor: number | null | undefined,
): number {
  if (!valor || valor <= 0) return 0
  return convertTempoMinimoToMinutes(valor, (unidade as TempoMinimoUnidade) || 'Horas')
}

export function formatMinutosToDisplay(minutos: number): string {
  if (!minutos || minutos <= 0) return '0 min'
  if (minutos < 60) return `${Math.round(minutos)} min`
  if (minutos % (24 * 60) === 0 && minutos >= 24 * 60) {
    const d = minutos / (24 * 60)
    return `${d} d`
  }
  if (minutos % 60 === 0) {
    const h = minutos / 60
    return `${h} h`
  }
  const h = minutos / 60
  return `${formatBrNumber(h, 1)} h`
}

export function parseDateAndTimeToDate(
  dateStr: string | Date | undefined | null,
  timeStr?: string | null,
): Date {
  if (!dateStr) return new Date()
  if (dateStr instanceof Date) return dateStr

  const trimmed = dateStr.trim()
  if (timeStr && timeStr.trim()) {
    const cleanTime = timeStr.trim().slice(0, 5)
    if (trimmed.includes('T')) {
      const justDate = trimmed.split('T')[0]
      return new Date(`${justDate}T${cleanTime}:00`)
    }
    return new Date(`${trimmed}T${cleanTime}:00`)
  }

  if (trimmed.includes('T')) return new Date(trimmed)
  if (trimmed.includes(' ')) return new Date(trimmed.replace(' ', 'T'))
  return new Date(trimmed)
}

export function formatDateToBrDateTime(d: Date): string {
  return formatDateTimeBr(d)
}

export function calculatePrimeiroInicioPermitido(now: Date, minutosMinimos: number): Date {
  return new Date(now.getTime() + minutosMinimos * 60 * 1000)
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
export function evaluateTempoMinimoPcpLegacy(params: {
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
export interface EvaluateTempoMinimoPcpParams {
  centerCode?: string
  productCode?: string
  rawMaterialCode?: string
  rawMaterialCodes?: string[]
  application?: string
  targetStartDateTime?: string | Date
  plannedStartDateTime?: string | Date
  now?: Date
  referenceNow?: Date
  applications?: TempoMinimoPcpApplicationItem[] | LineRawMaterialApplication[]
  applicationsList?: LineRawMaterialApplication[]
}

/**
 * Validação centralizada e universal de Tempo Mínimo PCP
 * Retorna resultado duplo (compatível tanto com testes T1-T12 quanto com o alerta da UI e guards).
 */
export function evaluateTempoMinimoPcp(
  params: EvaluateTempoMinimoPcpParams,
): TempoMinimoPcpEvaluationResult & TempoMinimoEvaluation {
  const productCode = (params.productCode || '').trim()
  const centerCode = (params.centerCode || '').trim()
  const now = params.now || params.referenceNow || new Date()
  const targetDateInput = params.targetStartDateTime || params.plannedStartDateTime || new Date()

  const targetDate =
    targetDateInput instanceof Date
      ? targetDateInput
      : new Date(
          typeof targetDateInput === 'string' &&
            !targetDateInput.includes('T') &&
            targetDateInput.includes(' ')
            ? targetDateInput.replace(' ', 'T')
            : targetDateInput,
        )

  const rawApps = params.applications || params.applicationsList || []
  const appsList: LineRawMaterialApplication[] = rawApps.map((a: any) => ({
    id: a.id || '',
    line_id: a.line_id || '',
    center_code: a.center_code || '',
    product_code: a.product_code || '',
    raw_material_code: a.raw_material_code || '',
    application: a.application || '',
    tempo_minimo_pcp_unidade: a.tempo_minimo_pcp_unidade || null,
    tempo_minimo_pcp_valor:
      a.tempo_minimo_pcp_valor != null ? Number(a.tempo_minimo_pcp_valor) : null,
    tempo_minimo_pcp_minutos:
      a.tempo_minimo_pcp_minutos != null ? Number(a.tempo_minimo_pcp_minutos) : null,
    status: (a.status || 'Ativo') as 'Ativo' | 'Inativo',
    first_run: false,
    allow_out_of_standard_mp: false,
  }))

  const rawMaterialCodes: string[] = []
  if (params.rawMaterialCode && params.rawMaterialCode.trim()) {
    rawMaterialCodes.push(params.rawMaterialCode.trim())
  }
  if (params.rawMaterialCodes && Array.isArray(params.rawMaterialCodes)) {
    for (const c of params.rawMaterialCodes) {
      if (c && c.trim() && !rawMaterialCodes.includes(c.trim())) {
        rawMaterialCodes.push(c.trim())
      }
    }
  }

  const legacyEval = evaluateTempoMinimoPcpLegacy({
    productCode,
    plannedStartDateTime: targetDate,
    referenceNow: now,
    rawMaterialCodes,
    applicationsList: appsList,
    centerCode,
  })

  // Calcula valores detalhados
  const nowMs = now.getTime()
  const targetMs = targetDate.getTime()
  const availableMinutes = (targetMs - nowMs) / (60 * 1000)
  const availableMinutesRounded = Math.round(availableMinutes)

  // Filtra regras correspondentes
  const cleanProd = productCode.toUpperCase()
  const cleanCenter = centerCode.toUpperCase()
  const targetMpCodes = rawMaterialCodes.map((c) => c.toUpperCase())

  const matching = appsList.filter((app) => {
    if (cleanCenter && app.center_code && app.center_code.toUpperCase() !== cleanCenter)
      return false
    const appProd = (app.product_code || '').trim().toUpperCase()
    const appMp = (app.raw_material_code || '').trim().toUpperCase()

    const matchesProd = !cleanProd || appProd === cleanProd
    const matchesMp = targetMpCodes.length === 0 || targetMpCodes.includes(appMp)
    return matchesProd && matchesMp && app.status !== 'Inativo'
  })

  const rulesWithTempo = matching.filter(
    (r) =>
      Boolean(r.tempo_minimo_pcp_unidade) &&
      r.tempo_minimo_pcp_valor != null &&
      Number(r.tempo_minimo_pcp_valor) > 0,
  )

  const hasRuleConfigured = rulesWithTempo.length > 0

  if (!hasRuleConfigured) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const formattedNow = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    return {
      ...legacyEval,
      isValid: true,
      hasRuleConfigured: false,
      tempoMinimoExigidoMinutos: 0,
      antecedenciaDisponivelMinutos: availableMinutesRounded,
      minutosMinimosExigidos: 0,
      minutosDisponiveis: availableMinutesRounded,
      horasMinimasExigidas: 0,
      horasDisponiveis: availableMinutes / 60,
      tempoMinimoFormatado: '0 min',
      antecedenciaDisponivelFormatada: formatMinutesFriendly(availableMinutes),
      primeiroInicioPermitido: now,
      primeiroInicioPermitidoFormatado: formattedNow,
      primeiroInicioPermitidoIso: now.toISOString(),
      message: 'Nenhuma restrição de Tempo Mínimo PCP configurada.',
      blockingItem: null,
      violatingItems: [],
      violatingRules: [],
      mostRestrictiveRule: null,
      allEvaluatedRules: [],
    }
  }

  const evaluatedRules = rulesWithTempo.map((r) => {
    const val = Number(r.tempo_minimo_pcp_valor)
    const unit = r.tempo_minimo_pcp_unidade as TempoMinimoUnidade
    const reqMins = convertTempoMinimoToMinutes(val, unit)
    const atendido = availableMinutes >= reqMins
    return {
      rawApp: r,
      rawMaterialCode: r.raw_material_code,
      valor: val,
      unidade: unit,
      requiredMinutes: reqMins,
      availableMinutes: availableMinutesRounded,
      atendido,
    }
  })

  evaluatedRules.sort((a, b) => b.requiredMinutes - a.requiredMinutes)
  const mostRestrictive = evaluatedRules[0]
  const violating = evaluatedRules.filter((e) => !e.atendido)
  const isValid = violating.length === 0

  const blockingRule = violating.length > 0 ? violating[0] : null
  const blockingItem = blockingRule ? (blockingRule.rawApp as TempoMinimoPcpApplicationItem) : null

  const maxReqMinutes = mostRestrictive.requiredMinutes
  const primeiroInicio = calculatePrimeiroInicioPermitido(now, maxReqMinutes)
  const pad = (n: number) => String(n).padStart(2, '0')
  const primeiroInicioFormatado = `${pad(primeiroInicio.getDate())}/${pad(primeiroInicio.getMonth() + 1)}/${primeiroInicio.getFullYear()} ${pad(primeiroInicio.getHours())}:${pad(primeiroInicio.getMinutes())}`

  const valorFormatado = formatBrNumber(
    mostRestrictive.valor,
    mostRestrictive.valor % 1 === 0 ? 0 : 2,
  )
  const msg = !isValid
    ? `Movimentação não permitida ou programação bloqueada: a matéria-prima ${blockingRule?.rawMaterialCode || mostRestrictive.rawMaterialCode} exige antecedência mínima de ${valorFormatado} ${mostRestrictive.unidade}. Primeiro início permitido: ${primeiroInicioFormatado}.`
    : 'Antecedência mínima atendida.'

  return {
    ...legacyEval,
    isValid,
    hasRuleConfigured: true,
    tempoMinimoExigidoMinutos: maxReqMinutes,
    antecedenciaDisponivelMinutos: availableMinutesRounded,
    minutosMinimosExigidos: maxReqMinutes,
    minutosDisponiveis: availableMinutesRounded,
    horasMinimasExigidas: maxReqMinutes / 60,
    horasDisponiveis: availableMinutes / 60,
    tempoMinimoFormatado: `${valorFormatado} ${mostRestrictive.unidade}`,
    antecedenciaDisponivelFormatada: formatMinutesFriendly(availableMinutes),
    primeiroInicioPermitido: primeiroInicio,
    primeiroInicioPermitidoFormatado: primeiroInicioFormatado,
    primeiroInicioPermitidoIso: primeiroInicio.toISOString(),
    message: msg,
    blockingItem,
    violatingItems: violating.map((v) => v.rawApp as TempoMinimoPcpApplicationItem),
    violatingRules: violating.map((v) => ({
      rawMaterialCode: v.rawMaterialCode,
      valor: v.valor,
      unidade: v.unidade,
      requiredMinutes: v.requiredMinutes,
      availableMinutes: v.availableMinutes,
    })),
    mostRestrictiveRule: {
      rawMaterialCode: mostRestrictive.rawMaterialCode,
      valor: mostRestrictive.valor,
      unidade: mostRestrictive.unidade,
      requiredMinutes: mostRestrictive.requiredMinutes,
    },
    allEvaluatedRules: evaluatedRules.map((e) => ({
      rawMaterialCode: e.rawMaterialCode,
      valor: e.valor,
      unidade: e.unidade,
      requiredMinutes: e.requiredMinutes,
      atendido: e.atendido,
    })),
  }
}

export function validateDerivedScheduleTempoMinimo(params: {
  destinationCenterCode: string
  productCode: string
  targetStartDateTime: string | Date
  now?: Date
  applications: TempoMinimoPcpApplicationItem[] | LineRawMaterialApplication[]
}): TempoMinimoPcpEvaluationResult {
  return evaluateTempoMinimoPcp({
    centerCode: params.destinationCenterCode,
    productCode: params.productCode,
    targetStartDateTime: params.targetStartDateTime,
    now: params.now,
    applications: params.applications,
  })
}

export function evaluateItemTempoMinimoPcp(
  item: WeeklyScheduleItem,
  applicationsList: LineRawMaterialApplication[],
  referenceNow = new Date(),
): TempoMinimoPcpEvaluationResult & TempoMinimoEvaluation {
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

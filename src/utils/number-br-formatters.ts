/**
 * Utilitários de Formatação Numérica no Padrão Brasileiro (pt-BR)
 * 1.250,50 kg / 6,00 m — vírgula como separador decimal, ponto de milhar
 */

/**
 * Converte número ou string formatada em pt-BR (ex: "1.250,50" ou "6,00") para number JavaScript.
 * Retorna null se vazio ou indefinido.
 * Lança erro ou retorna NaN se inválido.
 */
export function parseBrNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') {
    return isNaN(val) ? null : val
  }
  if (typeof val !== 'string') return null

  const trimmed = val.trim()
  if (!trimmed) return null

  // Remove pontos de milhar e substitui vírgula decimal por ponto
  // Ex: "1.250,50" -> "1250.50"
  // Ex: "1250,5" -> "1250.5"
  // Ex: "1250.50" (se já digitado sem vírgula) -> trata com cuidado
  let normalized = trimmed
  if (normalized.includes(',') && normalized.includes('.')) {
    // Possui milhar e decimal: "1.250,50"
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (normalized.includes(',')) {
    // Apenas vírgula decimal: "1250,50"
    normalized = normalized.replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    // Apenas pontos no padrão de milhar ex "1.250"
    normalized = normalized.replace(/\./g, '')
  }

  const num = Number(normalized)
  return isNaN(num) ? NaN : num
}

/**
 * Formata um número para o padrão pt-BR com casas decimais fixas (padrão 2 casas).
 * Ex: 1250.5 -> "1.250,50"
 */
export function formatBrNumber(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || isNaN(val)) return ''
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formata com sufixo de unidade (ex: "1.250,50 kg" ou "6,00 m")
 */
export function formatBrWithUnit(
  val: number | null | undefined,
  unit: string,
  decimals = 2,
): string {
  if (val === null || val === undefined || isNaN(val)) return '-'
  return `${formatBrNumber(val, decimals)} ${unit}`
}

/**
 * Formata data e hora no padrão brasileiro (dd/mm/aaaa, 24 h).
 * Ex: 25/09/2026, 14:35
 */
export function formatBrDateTime(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Regra de Sincronização e Cálculo de Redução:
 * Duas representações simultâneas e sincronizadas:
 * 1) Razão 1:X (ex: 1:5 onde X=5)
 * 2) Redução (%) = (1 - 1/X) * 100
 * Exemplo: 1:5 -> (1 - 1/5) * 100 = 80,00%
 *
 * Se X <= 0 ou divisão por zero: inválido.
 */
export interface ReductionCalculationResult {
  ratioX: number
  ratioText: string // "1:5" ou "1:5,00"
  percentage: number // 80.00
  percentageText: string // "80,00%"
  isValid: boolean
  error?: string
}

export function calculateReductionFromRatioX(rawRatioX: unknown): ReductionCalculationResult {
  const x = parseBrNumber(rawRatioX)
  if (x === null) {
    return {
      ratioX: 0,
      ratioText: '',
      percentage: 0,
      percentageText: '',
      isValid: false,
    }
  }

  if (isNaN(x) || x <= 0) {
    return {
      ratioX: x,
      ratioText: `1:${rawRatioX}`,
      percentage: 0,
      percentageText: '',
      isValid: false,
      error: 'A razão deve ser maior que zero (divisão por zero não permitida).',
    }
  }

  if (x < 1) {
    return {
      ratioX: x,
      ratioText: `1:${formatBrNumber(x, 2)}`,
      percentage: 0,
      percentageText: '',
      isValid: false,
      error: 'Para conformação/redução, a razão 1:X deve ter X >= 1.',
    }
  }

  // Redução (%) = (1 - 1/X) * 100
  const pct = (1 - 1 / x) * 100
  const cleanPct = Math.round(pct * 100) / 100

  // Se X for inteiro ex: 5 -> texto "1:5", se for fracionário ex: 5.5 -> "1:5,50"
  const ratioText = Number.isInteger(x) ? `1:${x}` : `1:${formatBrNumber(x, 2)}`

  return {
    ratioX: x,
    ratioText,
    percentage: cleanPct,
    percentageText: `${formatBrNumber(cleanPct, 2)}%`,
    isValid: true,
  }
}

/**
 * Converte percentual para Razão 1:X (inverso):
 * Pct = (1 - 1/X) * 100 => 1 - Pct/100 = 1/X => X = 1 / (1 - Pct/100)
 * Exemplo: 80% => 1 / (1 - 0.8) = 1 / 0.2 = 5 -> 1:5
 */
export function calculateReductionFromPercentage(rawPct: unknown): ReductionCalculationResult {
  const pct = parseBrNumber(rawPct)
  if (pct === null) {
    return {
      ratioX: 0,
      ratioText: '',
      percentage: 0,
      percentageText: '',
      isValid: false,
    }
  }

  if (isNaN(pct) || pct < 0 || pct >= 100) {
    return {
      ratioX: 0,
      ratioText: '',
      percentage: pct,
      percentageText: `${rawPct}%`,
      isValid: false,
      error: 'Percentual de redução deve estar entre 0% e 99,99%.',
    }
  }

  if (pct === 0) {
    return {
      ratioX: 1,
      ratioText: '1:1',
      percentage: 0,
      percentageText: '0,00%',
      isValid: true,
    }
  }

  const factor = 1 - pct / 100
  if (factor <= 0) {
    return {
      ratioX: 0,
      ratioText: '',
      percentage: pct,
      percentageText: '',
      isValid: false,
      error: 'Percentual inválido geraria divisão por zero.',
    }
  }

  const x = 1 / factor
  const cleanX = Math.round(x * 100) / 100
  const ratioText = Number.isInteger(cleanX) ? `1:${cleanX}` : `1:${formatBrNumber(cleanX, 2)}`

  return {
    ratioX: cleanX,
    ratioText,
    percentage: pct,
    percentageText: `${formatBrNumber(pct, 2)}%`,
    isValid: true,
  }
}

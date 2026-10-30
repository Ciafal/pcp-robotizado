/**
 * Utilitários para parsing e formatação numérica no padrão pt-BR
 */

/**
 * Normaliza string pt-BR ou en-US para número.
 * Exemplos aceitos:
 *  - "24,00" -> 24.00
 *  - "1,00" -> 1.00
 *  - "5,50" -> 5.50
 *  - "24,500" -> 24.500
 *  - "1.250,750" -> 1250.750
 *  - "1250.75" -> 1250.75
 * Retorna NaN se inválido ou vazio.
 */
export function parsePtBrNumber(val: string | number | null | undefined): number {
  if (val == null) return NaN
  if (typeof val === 'number') return val
  const trimmed = String(val).trim()
  if (!trimmed) return NaN

  // Se tem ponto e vírgula (ex: "1.250,750" ou "1,250.75")
  if (trimmed.includes('.') && trimmed.includes(',')) {
    const lastDot = trimmed.lastIndexOf('.')
    const lastComma = trimmed.lastIndexOf(',')
    if (lastComma > lastDot) {
      // Padrão pt-BR: 1.250,750 -> remove ponto de milhar, troca vírgula por ponto decimal
      const clean = trimmed.replace(/\./g, '').replace(',', '.')
      return Number(clean)
    } else {
      // Padrão en-US com vírgula de milhar: 1,250.75
      const clean = trimmed.replace(/,/g, '')
      return Number(clean)
    }
  }

  // Se tem apenas vírgula (ex: "24,00", "5,50", "24,500")
  if (trimmed.includes(',')) {
    const clean = trimmed.replace(',', '.')
    return Number(clean)
  }

  // Se tem apenas ponto ou dígitos simples (ex: "24.00", "24")
  return Number(trimmed)
}

/**
 * Formata um número para pt-BR com número de casas decimais.
 */
export function formatPtBrNumber(
  val: number | null | undefined,
  minDecimals: number = 0,
  maxDecimals: number = 3,
): string {
  if (val == null || isNaN(val)) return ''
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })
}

// Aliases para compatibilidade com módulos legados
export const formatBrNumber = formatPtBrNumber
export const parseBrNumber = parsePtBrNumber

/**
 * Formata número no padrão brasileiro pt-BR aceitando opções (ex: min/max fraction digits).
 */
export function formatNumberPtBr(
  val: number | string | null | undefined,
  optionsOrDecimals?: number | { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  if (val == null || val === '') return ''
  const num = typeof val === 'number' ? val : parsePtBrNumber(val)
  if (isNaN(num)) return ''
  if (typeof optionsOrDecimals === 'number') {
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: optionsOrDecimals,
      maximumFractionDigits: optionsOrDecimals,
    })
  }
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: optionsOrDecimals?.minimumFractionDigits ?? 0,
    maximumFractionDigits: optionsOrDecimals?.maximumFractionDigits ?? 3,
  })
}

export const formatNumberPTBR = (
  val: number | string | null | undefined,
  minDecimals: number = 0,
  maxDecimals: number = 3,
): string => {
  if (val == null || val === '') return ''
  const num = typeof val === 'number' ? val : parsePtBrNumber(val)
  return formatPtBrNumber(num, minDecimals, maxDecimals)
}

/**
 * Fórmula oficial de cálculo de peças:
 * peças = Quantidade (t) ÷ Peso Unitário (t)
 * Regra de arredondamento: inteiro, arredondar para cima (Math.ceil).
 * NUNCA exibir decimais.
 * Exemplo: 24,00 ÷ 0,120 = 200 peças.
 */
export function calculatePiecesFromTons(
  quantityTons: number,
  unitWeightTons: number | null | undefined,
): number {
  if (!quantityTons || quantityTons <= 0) return 0
  if (!unitWeightTons || unitWeightTons <= 0) return 0

  // Arredondamento para cima (Math.ceil) conforme especificação técnica
  // Protege contra imprecisões de ponto flutuante (ex.: 200.00000000000003 -> 200)
  const raw = quantityTons / unitWeightTons
  const rounded = Math.round(raw * 1000000) / 1000000
  return Math.ceil(rounded)
}

/**
 * PADRÃO OFICIAL CENTRALIZADO PARA TONELADAS NA TELA SIDERCENTRO E PCP:
 * - Unidade estrita: "t" (espaço entre número e unidade)
 * - 3 casas decimais obrigatórias
 * - Separador de milhar: "."
 * - Separador decimal: ","
 * - Opção de sinal explícito (+ / -) quando solicitado
 * Ex:
 * 881.5 -> "881,500 t"
 * 1010 -> "+1.010,000 t" (com includeSign=true)
 * -782 -> "-782,000 t"
 */
export function formatTonsSdc(
  val: number | string | null | undefined,
  options?: {
    includeSign?: boolean
    fallback?: string
  },
): string {
  const fallback = options?.fallback ?? '0,000 t'
  if (val === null || val === undefined || val === '') return fallback

  const num = typeof val === 'number' ? val : parsePtBrNumber(val)
  if (isNaN(num)) return fallback

  const isNegative = num < 0
  const isPositive = num > 0
  const absNum = Math.abs(num)

  // Formatação pt-BR com exatamente 3 casas decimais
  const formattedAbs = absNum.toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })

  let prefix = ''
  if (isNegative) {
    prefix = '-'
  } else if (isPositive && options?.includeSign) {
    prefix = '+'
  }

  return `${prefix}${formattedAbs} t`
}

/**
 * FORMATAÇÃO PADRONIZADA DE PERCENTUAIS (EX: "XX,XX %"):
 * Regra obrigatória:
 * - Duas casas decimais fixas (ex: 45,00 % / 57,30 % / 89,20 % / 95,00 % / 103,30 %)
 * - Vírgula decimal
 * - Espaço antes do símbolo %
 * - Se número entre 0 e 1 (ex.: 0.45), converter multiplicando por 100
 */
export function formatPercentStandard(
  val: number | string | null | undefined,
  fallback: string = '0,00 %',
): string {
  if (val === null || val === undefined || val === '') return fallback
  const num = typeof val === 'number' ? val : parsePtBrNumber(val)
  if (isNaN(num)) return fallback

  let normalized = num
  if (normalized > 0 && normalized < 1.0) {
    normalized = normalized * 100
  }

  const formattedNum = normalized.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `${formattedNum} %`
}

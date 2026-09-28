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

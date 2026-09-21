/**
 * FORMATADORES CENTRALIZADOS PADRÃO BRASILEIRO (pt-BR)
 * CIAFAL PCP ROBOTIZADO
 *
 * Regras estritas:
 * - Decimal: vírgula (,)
 * - Milhar: ponto (.)
 * - Tonelada: "t" (sempre padrão 0,00 t, ex: 180,50 t, 6,84 t)
 * - Quilograma: "kg" (ex: 12.540,75 kg)
 * - Percentuais: "X,XX %" (ex: 90,00 %)
 * - Datas: DD/MM/AAAA (ex: 19/09/2026)
 * - Data e Hora: DD/MM/AAAA HH:mm ou DD/MM/AAAA HH:mm:ss (ex: 19/09/2026 10:27:26)
 * - Meses em português: janeiro...dezembro
 * - Dias da semana em português: segunda-feira...domingo
 * - Timezone de referência: America/Sao_Paulo (UTC-3)
 */

export const PTBR_LOCALE = 'pt-BR'
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'
export const DADO_NAO_DISPONIVEL = 'Dado não disponível para esta análise.'

/**
 * Formata um número no padrão brasileiro:
 * 1250.5 -> "1.250,50"
 */
export function formatNumberPTBR(
  valor: number | string | null | undefined,
  casasDecimais: number = 2,
  fallback: string = '0,00',
): string {
  if (valor === null || valor === undefined || valor === '') return fallback
  const num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'))
  if (isNaN(num)) return fallback

  return num.toLocaleString(PTBR_LOCALE, {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  })
}

/**
 * Formata quantidade física preservando a grandeza e aplicando a unidade correta:
 * 't' (Tonelada) ou 'kg' (Quilograma)
 * Ex: formatQuantity(6.84, 't') -> "6,84 t"
 * Ex: formatQuantity(12540.75, 'kg') -> "12.540,75 kg"
 */
/**
 * Formata toneladas no padrão brasileiro/ABNT:
 * 120 -> "120,00 t" ou com casasDecimais customizado
 * Ex: formatTonsPtBr(120) -> "120,00 t"
 * Ex: formatTonsPtBr(120, 1) -> "120,0 t"
 */
export function formatTonsPtBr(
  valor: number | string | null | undefined,
  casasDecimais: number = 2,
  fallback: string = '0,00 t',
): string {
  return formatQuantity(valor, 't', casasDecimais, fallback)
}

export function formatQuantity(
  valor: number | string | null | undefined,
  unidade: 't' | 'kg' | 't/h' | 'mm' | 'm' | string = 't',
  casasDecimais?: number,
  fallback: string = '0,00 t',
): string {
  if (valor === null || valor === undefined || valor === '') return fallback

  let raw = valor
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[^\d.,-]/g, '').trim()
    raw = parseFloat(cleaned.replace(',', '.'))
  }
  if (isNaN(raw as number)) return fallback

  // Normalização estrita da unidade ABNT/SI
  let normalizedUnit = unidade.trim()
  if (/^tons?$|^toneladas?$|^ton\.?$/i.test(normalizedUnit)) normalizedUnit = 't'
  if (/^kgs?$|^quilos?$|^quilogramas?$/i.test(normalizedUnit)) normalizedUnit = 'kg'
  if (/^grams?$|^gramas?$|^gr?$/i.test(normalizedUnit)) normalizedUnit = 'g'
  if (/^hrs?$|^horas?$|^hours?$/i.test(normalizedUnit)) normalizedUnit = 'h'
  if (/^mins?$|^minutos?$|^minutes?$/i.test(normalizedUnit)) normalizedUnit = 'min'
  if (/^segs?$|^segundos?$|^seconds?$/i.test(normalizedUnit)) normalizedUnit = 's'
  if (/^metros?$|^mts?$/i.test(normalizedUnit)) normalizedUnit = 'm'
  if (/^centimetros?$|^cms?$/i.test(normalizedUnit)) normalizedUnit = 'cm'
  if (/^milimetros?$|^mms?$/i.test(normalizedUnit)) normalizedUnit = 'mm'
  if (/^litros?$|^lts?$/i.test(normalizedUnit)) normalizedUnit = 'L'
  if (/^graus?$|^celsius?$|^°\s*c$/i.test(normalizedUnit)) normalizedUnit = '°C'
  if (/^porcento$|^percent$/i.test(normalizedUnit)) normalizedUnit = '%'

  // Decimais padrão: 2 para toneladas (125,50 t), 2 para kg (15.350,75 kg), 2 para h (7,50 h)
  const dec =
    casasDecimais !== undefined
      ? casasDecimais
      : normalizedUnit === 't' ||
          normalizedUnit === 'kg' ||
          normalizedUnit === 'h' ||
          normalizedUnit === 't/h'
        ? 2
        : normalizedUnit === 'mm' ||
            normalizedUnit === 'm' ||
            normalizedUnit === 'min' ||
            normalizedUnit === 's'
          ? 0
          : 2
  const numStr = formatNumberPTBR(raw, dec)

  return `${numStr} ${normalizedUnit}`
}

/**
 * Formata percentual no padrão brasileiro:
 * 90 -> "90,00 %"
 * 5.5 -> "5,50 %"
 */
export function formatPercentagePTBR(
  valor: number | string | null | undefined,
  casasDecimais: number = 2,
  fallback: string = '0,00 %',
): string {
  if (valor === null || valor === undefined || valor === '') return fallback
  let num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'))
  if (isNaN(num)) return fallback

  // Se o valor interno estiver entre 0 e 1 (ex: 0.91 ou 0.855), converter para percentual (0.91 -> 91, 0.855 -> 85.5)
  // Nota: Não converte se for exatamente 0 ou 1, a menos que especificado (ou se for fração)
  // Em regras industriais, OEE e eficiências < 1.0 (ex: 0.91) representam 91.00%
  // Se for > 0 e < 1.0, multiplicar por 100.
  if (num > 0 && num < 1.0) {
    num = num * 100
  }

  return `${formatNumberPTBR(num, casasDecimais)} %`
}

/**
 * Formata moeda no padrão brasileiro: R$ 15.250,50
 */
export function formatCurrencyPTBR(
  valor: number | string | null | undefined,
  fallback: string = 'R$ 0,00',
): string {
  if (valor === null || valor === undefined || valor === '') return fallback
  const num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'))
  if (isNaN(num)) return fallback

  return num.toLocaleString(PTBR_LOCALE, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Converte input digitado pelo usuário (com vírgula ou ponto decimal) em número puro para cálculos e envio à API.
 * Ex: "10,50" -> 10.5
 * Ex: "1.250,50" -> 1250.5
 */
export function parseNumberPTBR(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return isNaN(input) ? null : input

  const str = String(input).trim()
  if (!str) return null

  // Remove pontos de milhar e substitui vírgula por ponto
  const normalized = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

/**
 * Interpreta com segurança uma entrada de data (Date, string ISO "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss")
 * e evita o erro clássico de offset de fuso em strings YYYY-MM-DD.
 */
export function parseDateSafe(data: string | Date | null | undefined): Date | null {
  if (!data) return null
  if (data instanceof Date) {
    return isNaN(data.getTime()) ? null : data
  }

  const str = String(data).trim()
  if (!str) return null

  // Se já for DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/').map(Number)
    const dt = new Date(y, m - 1, d, 12, 0, 0)
    return isNaN(dt.getTime()) ? null : dt
  }

  // Se for YYYY-MM-DD simples sem horário, tratar como meio-dia local para não retroceder no fuso
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number)
    const dt = new Date(y, m - 1, d, 12, 0, 0)
    return isNaN(dt.getTime()) ? null : dt
  }

  const dt = new Date(str)
  return isNaN(dt.getTime()) ? null : dt
}

/**
 * Formata uma data no formato brasileiro DD/MM/AAAA:
 * "2026-09-19" -> "19/09/2026"
 */
export function formatDatePTBR(
  data: string | Date | null | undefined,
  fallback: string = '-',
): string {
  const parsed = parseDateSafe(data)
  if (!parsed) return fallback

  const dia = String(parsed.getDate()).padStart(2, '0')
  const mes = String(parsed.getMonth() + 1).padStart(2, '0')
  const ano = parsed.getFullYear()

  return `${dia}/${mes}/${ano}`
}

/**
 * Formata data e hora no formato brasileiro DD/MM/AAAA HH:mm ou DD/MM/AAAA HH:mm:ss
 */
export function formatDateTimePTBR(
  dataHora: string | Date | null | undefined,
  comSegundos: boolean = false,
  fallback: string = '-',
): string {
  const parsed = parseDateSafe(dataHora)
  if (!parsed) return fallback

  const dia = String(parsed.getDate()).padStart(2, '0')
  const mes = String(parsed.getMonth() + 1).padStart(2, '0')
  const ano = parsed.getFullYear()
  const hora = String(parsed.getHours()).padStart(2, '0')
  const min = String(parsed.getMinutes()).padStart(2, '0')

  if (comSegundos) {
    const seg = String(parsed.getSeconds()).padStart(2, '0')
    return `${dia}/${mes}/${ano} ${hora}:${min}:${seg}`
  }

  return `${dia}/${mes}/${ano} ${hora}:${min}`
}

/**
 * Nomes por extenso dos meses em português (pt-BR)
 */
export const MESES_PTBR = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const

/**
 * Nomes por extenso dos dias da semana em português (pt-BR)
 */
export const DIAS_SEMANA_PTBR = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const

/**
 * Formata data por extenso em português: "19 de setembro de 2026"
 */
export function formatDateExtensoPTBR(
  data: string | Date | null | undefined,
  fallback: string = '-',
): string {
  const parsed = parseDateSafe(data)
  if (!parsed) return fallback

  const dia = parsed.getDate()
  const mes = MESES_PTBR[parsed.getMonth()]
  const ano = parsed.getFullYear()

  return `${dia} de ${mes} de ${ano}`
}

/**
 * Placeholders e labels padronizados em português
 */
export const PTBR_LABELS = {
  selecioneData: 'Selecione a data',
  dataInicial: 'Data inicial',
  dataFinal: 'Data final',
  hoje: 'Hoje',
  cancelar: 'Cancelar',
  confirmar: 'Confirmar',
  limpar: 'Limpar',
  filtrar: 'Filtrar',
  toneladaUnidade: 't',
  quilogramaUnidade: 'kg',
  naoDisponivel: DADO_NAO_DISPONIVEL,
} as const

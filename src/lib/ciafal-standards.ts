/**
 * DICIONÁRIO CENTRAL DE TERMOS, PADRÕES DE NOMENCLATURA E UTILITÁRIOS ABNT / SI
 * CIAFAL Wilson Santos — Módulo PCP Robotizado
 *
 * Diretrizes:
 * - Português (Brasil) formal, técnico e corporativo.
 * - Siglas oficiais preservadas: SAP ECC, WMS, TMS, MES, PCP, AOM, CRM, SGQ.
 * - Unidades ABNT/SI: espaço obrigatório entre valor e símbolo (18 t/h, 150 mm, 25 t, 80 °C, 35 %).
 * - Sem pluralização de símbolos: 20 kg (não "20 kgs"), 5 h (não "5 hs").
 * - Formatação numérica brasileira: 1.250,50 / R$ 125.430,50.
 * - Tratamento seguro de strings e fallback para valores não disponíveis.
 */

export const CIAFAL_TERMS = {
  // Entidades e Processos
  RAW_MATERIAL: 'Matéria-prima',
  RAW_MATERIAL_ABBR: 'MP',
  PRODUCTION: 'Produção',
  PRODUCTION_LINE: 'Linha de produção',
  INDUSTRIALIZATION: 'Industrialização',
  SCHEDULING: 'Programação',
  PLANNING: 'Planejamento',
  INVENTORY: 'Estoque',
  AVAILABILITY: 'Disponibilidade',
  CAPACITY: 'Capacidade',
  PRODUCTIVITY: 'Produtividade',
  BOTTLENECK: 'Gargalo',
  CONSTRAINT: 'Restrição',
  PRODUCTION_ORDER: 'Ordem de produção',
  ORDER_ABBR: 'OP',
  SALES_ORDER: 'Pedido de venda',
  TRANSPORT: 'Transporte',
  TRUCK_TRAILER: 'Carreta',
  CLIENT: 'Cliente',
  MATERIAL: 'Material',
  APPLICATION: 'Aplicação',
  REAPPLICATION: 'Reaplicação',
  YIELD: 'Rendimento metálico',
  DEVIATION: 'Desvio',
  FORECAST: 'Previsão',
  REALIZED: 'Realizado',
  PROGRAMMED: 'Programado',
  BALANCE: 'Saldo',
  SCRAP: 'Sucata',
  REMAINDER: 'Sobra',
  POOL_525: 'Pool 525 kg',
  POOL_510: 'Pool 510 kg',
  NOT_AVAILABLE: 'Não disponível',
  AWAITING_INTEGRATION: 'Aguardando integração',
} as const

export const CIAFAL_SYSTEM_ACRONYMS = {
  SAP: 'SAP ECC',
  WMS: 'WMS',
  TMS: 'TMS',
  MES: 'MES',
  PCP: 'PCP',
  AOM: 'AOM',
  CRM: 'CRM',
  SGQ: 'SGQ',
  QLIK: 'QLIK',
} as const

/**
 * Formata números no padrão ABNT / Brasileiro:
 * 1250.5 -> "1.250,5"
 */
export function formatAbntNumber(
  value: number | string | null | undefined,
  decimals: number = 1,
  fallback = '0',
): string {
  if (value === null || value === undefined || value === '') return fallback
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (isNaN(num)) return fallback

  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formata moeda no padrão brasileiro: R$ 1.250,50
 */
export function formatAbntCurrency(value: number | null | undefined, fallback = 'R$ 0,00'): string {
  if (value === null || value === undefined || isNaN(value)) return fallback
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Normaliza e formata valor com unidade de medida ABNT / SI.
 * Garante espaço entre o valor e o símbolo.
 * Exemplos:
 *  formatAbntUnit(18.5, 't/h') -> "18,5 t/h"
 *  formatAbntUnit(150, 'mm', 0) -> "150 mm"
 *  formatAbntUnit(25.3, '%', 1) -> "25,3 %"
 *  formatAbntUnit(80, '°C', 0) -> "80 °C"
 *  formatAbntUnit(120, 'min', 0) -> "120 min"
 *  formatAbntUnit(4.5, 'h', 1) -> "4,5 h"
 *  formatAbntUnit(950, 'kg', 0) -> "950 kg"
 */
export function formatAbntUnit(
  value: number | string | null | undefined,
  unit:
    | 't/h'
    | 't'
    | 'kg'
    | 'mm'
    | 'm'
    | 'm²'
    | 'm³'
    | '%'
    | '°C'
    | 'min'
    | 'h'
    | 'dias'
    | 'd'
    | string,
  decimals = 1,
): string {
  if (value === null || value === undefined || value === '') return CIAFAL_TERMS.NOT_AVAILABLE

  // Limpar possíveis unidades sujas em strings
  let rawVal = value
  if (typeof rawVal === 'string') {
    const cleaned = rawVal.replace(/t\/h|ton\/h|tons\/hr|t|kg|kgs|mm|min|h|hs|%/gi, '').trim()
    rawVal = parseFloat(cleaned.replace(',', '.'))
  }

  const formattedNum = formatAbntNumber(rawVal, decimals)

  // Tratamento de símbolo normalizado
  let normalizedUnit = unit.trim()
  if (/^tons?$/i.test(normalizedUnit) || /^toneladas?$/i.test(normalizedUnit)) normalizedUnit = 't'
  if (
    /^tons?\/h(r)?$/i.test(normalizedUnit) ||
    /^t\/hr$/i.test(normalizedUnit) ||
    /^t\/hora$/i.test(normalizedUnit)
  )
    normalizedUnit = 't/h'
  if (/^kgs?$/i.test(normalizedUnit) || /^quilos?$/i.test(normalizedUnit)) normalizedUnit = 'kg'
  if (/^hs?$/i.test(normalizedUnit) || /^horas?$/i.test(normalizedUnit)) normalizedUnit = 'h'
  if (/^mins?$/i.test(normalizedUnit) || /^minutos?$/i.test(normalizedUnit)) normalizedUnit = 'min'

  return `${formattedNum} ${normalizedUnit}`
}

/**
 * Formata data no padrão brasileiro DD/MM/AAAA
 */
export function formatAbntDate(
  dateInput: string | Date | null | undefined,
  includeTime = false,
  fallback = 'Data não disponível',
): string {
  if (!dateInput) return fallback
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return fallback

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  if (includeTime) {
    const hours = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} às ${hours}:${mins}`
  }

  return `${day}/${month}/${year}`
}

/**
 * Formata carimbo de atualização com garantia de nunca parecer dado recente se for antigo.
 */
export function formatUpdateTimestamp(dateInput?: string | Date | null): {
  label: string
  isStale: boolean
} {
  if (!dateInput) {
    return { label: 'Aguardando sincronização', isStale: true }
  }

  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) {
    return { label: 'Data inválida', isStale: true }
  }

  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60))

  if (diffMinutes < 2) {
    return { label: 'Atualizado em tempo real', isStale: false }
  } else if (diffMinutes < 60) {
    return { label: `Atualizado há ${diffMinutes} min`, isStale: false }
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60)
    return { label: `Atualizado há ${hours} h`, isStale: hours > 6 }
  } else {
    return {
      label: `Dados de ${formatAbntDate(d, true)} (possivelmente desatualizados)`,
      isStale: true,
    }
  }
}

/**
 * Sanitiza texto eliminando strings proibidas como null, undefined, [object Object].
 */
export function sanitizeDisplay(val: any, fallback = '—'): string {
  if (val === null || val === undefined) return fallback
  const s = String(val).trim()
  if (s === '' || s === 'undefined' || s === 'null' || s === '[object Object]') {
    return fallback
  }
  return s
}

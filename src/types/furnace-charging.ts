/**
 * Utilitários centrais de Tipos de Enfornamento (Ficha Mestra Expandida)
 * HUB CIAFAL - PCP Robotizado
 *
 * Fonte ÚNICA de:
 * - Tipos de enfornamento e suas proporções de referência (com vírgula decimal pt-BR)
 * - Sugestões de MP principal/secundária (apenas parâmetros de referência, não fixas)
 * - Formatação/parse de proporção (rótulo pt-BR <-> valores decimais de dados)
 */

import { formatNumberPtBr, parsePtBrNumber } from '@/lib/number-format'

/** Opções EXATAS de Tipo de Enfornamento exigidas pelo PCP (rótulo = valor em banco). */
export const TIPOS_ENFORNAMENTO_OPCOES = [
  'Frio',
  'Quente',
  'Tapete (1:1)',
  'Tapete (1,3:1)',
  'Tapete (1,5:1)',
  'Tapete (2:1)',
  'Tapete (1:2)',
  'Normal',
  'Intercalado (1:1)',
  'Intercalado (1,3:1)',
  'Intercalado (1,5:1)',
  'Intercalado (2:1)',
  'Intercalado (3:1)',
  'Frente forno',
] as const

export type TipoEnfornamentoNome = (typeof TIPOS_ENFORNAMENTO_OPCOES)[number]

export interface RawMaterialTypeOption {
  code: string
  description: string
  fullLabel: string
}

/** Catálogo fechado e canônico de tipos de matéria-prima homologados no PCP/SAP CIAFAL. */
export const RAW_MATERIAL_TYPE_CATALOG: RawMaterialTypeOption[] = [
  { code: 'MPPA', description: 'Palanquilha', fullLabel: 'MPPA — Palanquilha' },
  { code: 'MPPL', description: 'Placa', fullLabel: 'MPPL — Placa' },
  { code: 'MPRE', description: 'Tarugo Retrabalhado', fullLabel: 'MPRE — Tarugo Retrabalhado' },
  { code: 'MPBL', description: 'Bloco', fullLabel: 'MPBL — Bloco' },
  { code: 'MPTA', description: 'Tarugo', fullLabel: 'MPTA — Tarugo' },
  { code: 'MPLI', description: 'Lingote', fullLabel: 'MPLI — Lingote' },
]

/**
 * Proporções de referência por tipo base de enfornamento (sem o rótulo "(x:y)").
 * As MPs sugeridas são PARÂMETROS DE REFERÊNCIA — o usuário cadastra a MP real,
 * o código nunca fixa MP principal/secundária.
 */
export interface ProporcaoEnfornamento {
  /** Rótulo pt-BR com vírgula decimal, ex.: "1,3:1" — é o que vai para o banco. */
  rotulo: string
  /** Primeiro termo da razão (MP Principal). */
  primeira: number
  /** Segundo termo da razão (MP Secundária). */
  segunda: number
  /** MP sugerida como principal (parâmetro de referência). */
  mpPrincipalSugerida?: string
  /** MP sugerida como secundária (parâmetro de referência). */
  mpSecundariaSugerida?: string
}

export const PROPORCOES_POR_TIPO: Record<string, ProporcaoEnfornamento[]> = {
  Tapete: [
    { rotulo: '1:1', primeira: 1, segunda: 1, mpPrincipalSugerida: 'MPPA' },
    { rotulo: '1,3:1', primeira: 1.3, segunda: 1, mpPrincipalSugerida: 'MPPA' },
    { rotulo: '1,5:1', primeira: 1.5, segunda: 1, mpPrincipalSugerida: 'MPPA' },
    { rotulo: '1:1', primeira: 1, segunda: 1, mpPrincipalSugerida: 'MPPL' },
    { rotulo: '1:1,3', primeira: 1, segunda: 1.3, mpPrincipalSugerida: 'MPPL' },
    { rotulo: '1:1,5', primeira: 1, segunda: 1.5, mpPrincipalSugerida: 'MPPL' },
  ],
  Intercalado: [
    {
      rotulo: '1:2',
      primeira: 1,
      segunda: 2,
      mpPrincipalSugerida: 'MPPA',
      mpSecundariaSugerida: 'MPPL',
    },
    {
      rotulo: '2:1',
      primeira: 2,
      segunda: 1,
      mpPrincipalSugerida: 'MPPL',
      mpSecundariaSugerida: 'MPPA',
    },
    { rotulo: '1:1', primeira: 1, segunda: 1 },
    { rotulo: '3:1', primeira: 3, segunda: 1 },
  ],
}

/** Tipos base que exigem proporção e DUAS MPs distintas (principal ≠ secundária). */
export const TIPOS_COM_DUAS_MPS = ['Tapete', 'Intercalado'] as const

/** Tipos base que exigem proporção (mesmo com MP única). */
export const TIPOS_COM_PROPORCAO = ['Tapete', 'Intercalado'] as const

/** Extrai o tipo base de um rótulo completo. Ex.: "Intercalado (2:1)" -> "Intercalado". */
export function extractTipoBase(rotuloCompleto: string): string {
  const idx = rotuloCompleto.indexOf('(')
  const base = idx > 0 ? rotuloCompleto.slice(0, idx).trim() : rotuloCompleto.trim()
  return base
}

/** Extrai o termo da proporção de um rótulo completo. Ex.: "Intercalado (2:1)" -> "2:1". */
export function extractProporcaoRotulo(rotuloCompleto: string): string | null {
  const match = rotuloCompleto.match(/\(([^)]+)\)/)
  return match ? match[1] : null
}

/**
 * Converte o rótulo pt-BR de proporção em termos decimais.
 * Ex.: "2:1" -> { primeira: 2, segunda: 1 }; "1,3:1" -> { primeira: 1.3, segunda: 1 }
 */
export function parseProporcaoRotulo(rotulo: string): { primeira: number; segunda: number } | null {
  if (!rotulo) return null
  const partes = rotulo.split(':')
  if (partes.length !== 2) return null
  const primeira = parsePtBrNumber(partes[0])
  const segunda = parsePtBrNumber(partes[1])
  if (isNaN(primeira) || isNaN(segunda) || primeira <= 0 || segunda <= 0) return null
  return { primeira, segunda }
}

/** Formata um termo decimal em pt-BR. Ex.: 1.3 -> "1,3"; 2 -> "2". */
export function formatTermoPtBr(val: number): string {
  return formatNumberPtBr(val, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/** Monta o rótulo pt-BR a partir dos termos decimais. Ex.: (1.3, 1) -> "1,3:1". */
export function buildProporcaoRotulo(primeira: number, segunda: number): string {
  return `${formatTermoPtBr(primeira)}:${formatTermoPtBr(segunda)}`
}

/**
 * Resumo automático exigido pelo usuário, ex.:
 * "INTERCALADO — 2:1 / Placa (MP Principal) → 2 partes / Palanquilha (MP Secundária) → 1 parte"
 */
export function buildResumoEnfornamento(params: {
  tipoBase: string
  proporcaoRotulo: string | null
  mpPrincipalDescricao?: string | null
  mpSecundariaDescricao?: string | null
  proporcaoTermos?: { primeira: number; segunda: number } | null
}): string {
  const {
    tipoBase,
    proporcaoRotulo,
    mpPrincipalDescricao,
    mpSecundariaDescricao,
    proporcaoTermos,
  } = params
  if (!tipoBase) return ''
  const partes: string[] = [tipoBase.toUpperCase()]
  if (proporcaoRotulo) partes.push(proporcaoRotulo)

  const p1 = mpPrincipalDescricao?.trim()
  const p2 = mpSecundariaDescricao?.trim()
  if (!p1 && !p2) return partes.join(' — ')

  const termos = proporcaoTermos ?? (proporcaoRotulo ? parseProporcaoRotulo(proporcaoRotulo) : null)
  if (p1) {
    partes.push(
      termos
        ? `${p1} (MP Principal) → ${formatTermoPtBr(termos.primeira)} parte${termos.primeira > 1 ? 's' : ''}`
        : `${p1} (MP Principal)`,
    )
  }
  if (p2) {
    partes.push(
      termos
        ? `${p2} (MP Secundária) → ${formatTermoPtBr(termos.segunda)} parte${termos.segunda > 1 ? 's' : ''}`
        : `${p2} (MP Secundária)`,
    )
  }
  return partes.join(' / ')
}

/**
 * Motor de drill-down da Análise de Carteira (HUB CIAFAL).
 *
 * Regra de ouro: o drill detalha EXATAMENTE o mesmo conjunto de dados usado para
 * calcular o card — as linhas são construídas a partir do mesmo array e do mesmo
 * extrator, garantindo: valor do card = soma dos registros do drill.
 *
 * Nenhum dado SAP é mockado aqui: os valores vêm dos itens calculados pelo
 * carteira-engine (ex.: estoque_semiacabado_tons).
 */
import { CarteiraItem } from '@/types/carteira-analise'

export interface LinhaDrillMaterial {
  material: string
  descricao: string
  familia: string
  linha: string
  origem: string
  /** Valor que compõe o card (mesma fórmula do card). */
  valor_tons: number
  estoque_livre_tons: number
  estoque_mto_tons: number
  estoque_semiacabado_tons: number
  carteira_aberta_tons: number
  saldo_positivo_tons: number
  saldo_negativo_tons: number
  curva?: string
  semiacabado_ciafal_tons: number
  semiacabado_vallourec_tons: number
}

/**
 * Constrói as linhas do Nível 2 (resumo por material) a partir do mesmo array
 * usado para calcular o card. Cada linha carrega o valor extraído pela MESMA
 * fórmula do card, de modo que a soma das linhas fecha com o valor do card.
 */
export function linhasPorMaterial(
  itens: CarteiraItem[],
  extrairValor: (it: CarteiraItem) => number,
  mapaCurva?: Map<string, string>,
): LinhaDrillMaterial[] {
  return itens.map((it) => ({
    material: it.codigo_material || '',
    descricao: it.descricao_material || '',
    familia: it.familia || '',
    linha: it.linha || '',
    origem: it.origem_produto || '',
    valor_tons: extrairValor(it) || 0,
    estoque_livre_tons: it.estoque_livre_tons || 0,
    estoque_mto_tons: it.estoque_mto_tons || 0,
    estoque_semiacabado_tons: it.estoque_semiacabado_tons || 0,
    carteira_aberta_tons: it.carteira_aberta_tons || 0,
    saldo_positivo_tons: it.saldo_positivo_tons || 0,
    saldo_negativo_tons: it.saldo_negativo_tons || 0,
    curva: mapaCurva?.get(it.codigo_material || '') || 'C',
    semiacabado_ciafal_tons: it.estoque_semiacabado_ciafal_tons ?? it.estoque_semiacabado_tons ?? 0,
    semiacabado_vallourec_tons: it.estoque_semiacabado_vallourec_tons ?? 0,
  }))
}

/**
 * Nível 3 do card Saldo Semiacabado: decomposição por origem do estoque
 * (CIAFAL / Vallourec). A soma das origens = valor da linha do material.
 */
export function nivel3Semiacabado(linha: LinhaDrillMaterial): Record<string, any>[] {
  return [
    {
      origem: 'Semiacabado CIAFAL',
      valor_tons: linha.semiacabado_ciafal_tons,
      estoque_livre_tons: linha.estoque_livre_tons,
      estoque_mto_tons: linha.estoque_mto_tons,
      carteira_aberta_tons: linha.carteira_aberta_tons,
    },
    {
      origem: 'Semiacabado Vallourec',
      valor_tons: linha.semiacabado_vallourec_tons,
      estoque_livre_tons: linha.estoque_livre_tons,
      estoque_mto_tons: linha.estoque_mto_tons,
      carteira_aberta_tons: linha.carteira_aberta_tons,
    },
  ]
}

/**
 * Nível 3 genérico de cards de estoque/carteira: composição do item por tipo
 * de estoque (livre, MTO, semiacabado) — soma = composição real do material.
 */
export function nivel3ComposicaoEstoque(linha: LinhaDrillMaterial): Record<string, any>[] {
  return [
    { tipo_estoque: 'Estoque livre', valor_tons: linha.estoque_livre_tons },
    { tipo_estoque: 'Estoque MTO', valor_tons: linha.estoque_mto_tons },
    { tipo_estoque: 'Estoque semiacabado', valor_tons: linha.estoque_semiacabado_tons },
    { tipo_estoque: 'Carteira aberta (demanda)', valor_tons: linha.carteira_aberta_tons },
  ]
}

/**
 * Extratores padrão (mesma fórmula usada pelos cards das visões).
 */
export const extratoresCard = {
  carteiraTotal: (it: CarteiraItem) => it.carteira_aberta_tons || 0,
  estoqueLivre: (it: CarteiraItem) => it.estoque_livre_tons || 0,
  estoqueMto: (it: CarteiraItem) => it.estoque_mto_tons || 0,
  semiacabadoConsolidado: (it: CarteiraItem) => it.estoque_semiacabado_tons || 0,
  saldoPositivo: (it: CarteiraItem) => it.saldo_positivo_tons || 0,
  saldoNegativo: (it: CarteiraItem) => Math.abs(it.saldo_negativo_tons || 0),
}

/** Lista de valores únicos ordenada para popular filtros do drill. */
export function opcoesFiltro(linhas: Record<string, any>[], chave: string): string[] {
  const set = new Set<string>()
  linhas.forEach((l) => {
    const v = l[chave]
    if (v !== undefined && v !== null && String(v).trim() !== '') set.add(String(v))
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

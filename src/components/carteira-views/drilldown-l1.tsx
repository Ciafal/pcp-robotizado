/**
 * Construção do drill-down da Carteira L1 (HUB CIAFAL) para o DrilldownCardModal.
 *
 * Regra de ouro (idêntica à drilldown-geral.tsx): cada card detalha EXATAMENTE o
 * mesmo array usado para calcular o card (itensL1) com a MESMA fórmula — os
 * extratores vêm de carteira-drill-engine (fonte única, sem duplicação). Assim a
 * soma das linhas do drill fecha com o valor exibido no card. Nenhum dado é mockado.
 *
 * Na L1 o semiacabado JÁ compõe o Estoque Disponível — a indicação "Já compõe o
 * Estoque Disponível" do card é preservada na fórmula do drill.
 */
import { DrilldownCardConfig, ColunaDrill } from './DrilldownCardModal'
import { CarteiraItem } from '@/types/carteira-analise'
import {
  linhasPorMaterial,
  LinhaDrillMaterial,
  extratoresCard,
  nivel3Semiacabado,
  nivel3ComposicaoEstoque,
} from '@/lib/carteira-drill-engine'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

/** Título exibido no cabeçalho do drill ("Drill-down — [Nome do card]"). */
export const TITULOS_CARDS_L1: Record<string, string> = {
  SALDO_SEMIACABADO: 'Saldo Semiacabado',
  CARTEIRA_TOTAL: 'Carteira Vendas (t)',
  ESTOQUE_LIVRE: 'Estoque Livre (t)',
  ESTOQUE_MTO: 'Estoque MTO (t)',
  SALDO_POSITIVO: 'Saldo Estoque (+) (t)',
  SALDO_NEGATIVO: 'Carteira Negativa (t)',
}

type ExtratorL1 = (it: CarteiraItem) => number

interface EspecCardL1 {
  extrair: ExtratorL1
  filtro?: (it: CarteiraItem) => boolean
  contagem?: boolean
  rotuloValor: string
  rotuloFormula: string
}

const ESPECIFICACOES_L1: Record<string, EspecCardL1> = {
  SALDO_SEMIACABADO: {
    extrair: extratoresCard.semiacabadoConsolidado,
    filtro: (it) => extratoresCard.semiacabadoConsolidado(it) > 0,
    rotuloValor: 'Semiacabado (t)',
    rotuloFormula:
      'Soma do Estoque Semiacabado (t) dos materiais da L1 — já compõe o Estoque Disponível da L1',
  },
  CARTEIRA_TOTAL: {
    extrair: extratoresCard.carteiraTotal,
    rotuloValor: 'Carteira (t)',
    rotuloFormula: 'Soma da carteira aberta (t) dos materiais da L1 (Carteira Vendas)',
  },
  ESTOQUE_LIVRE: {
    extrair: extratoresCard.estoqueLivre,
    filtro: (it) => extratoresCard.estoqueLivre(it) > 0,
    rotuloValor: 'Estoque livre (t)',
    rotuloFormula: 'Soma do Estoque Livre (t) dos materiais da L1',
  },
  ESTOQUE_MTO: {
    extrair: extratoresCard.estoqueMto,
    filtro: (it) => extratoresCard.estoqueMto(it) > 0,
    rotuloValor: 'Estoque MTO (t)',
    rotuloFormula: 'Soma do Estoque MTO (t) dos materiais da L1',
  },
  SALDO_POSITIVO: {
    extrair: extratoresCard.saldoPositivo,
    filtro: (it) => extratoresCard.saldoPositivo(it) > 0,
    rotuloValor: 'Saldo (+) (t)',
    rotuloFormula:
      'Soma do Saldo Estoque positivo (t) dos materiais da L1 (MAX(0; Disp − Demanda))',
  },
  SALDO_NEGATIVO: {
    extrair: extratoresCard.saldoNegativo,
    filtro: (it) => extratoresCard.saldoNegativo(it) > 0,
    rotuloValor: 'Carteira negativa (t)',
    rotuloFormula:
      'Soma do valor absoluto da Carteira Negativa (t) dos materiais da L1 (MIN(0; Disp − Demanda))',
  },
}

const fmtT = (v: number) => formatNumberPTBR(v, 2)

/** Agrega os registros por material preservando a fórmula do card (soma fecha). */
function linhasNivel2(
  itensL1: CarteiraItem[],
  espec: EspecCardL1,
  mapaCurva?: Map<string, string>,
): LinhaDrillMaterial[] {
  return linhasPorMaterial(itensL1, espec.extrair, mapaCurva)
    .filter((l) => Math.abs(l.valor_tons) > 0.0000001)
    .sort((a, b) => b.valor_tons - a.valor_tons)
}

function colunasNivel2(contagem: boolean, rotuloValor: string): ColunaDrill<LinhaDrillMaterial>[] {
  return [
    {
      key: 'material',
      label: 'Material',
      render: (l) => <span className="font-mono font-semibold text-[#004C97]">{l.material}</span>,
    },
    { key: 'descricao', label: 'Descrição' },
    { key: 'familia', label: 'Família', align: 'center' },
    { key: 'origem', label: 'Origem', align: 'center' },
    { key: 'curva', label: 'Curva', align: 'center' },
    {
      key: 'valor_tons',
      label: rotuloValor,
      align: 'right',
      render: (l) =>
        contagem ? (
          <span className="font-bold">{Math.round(l.valor_tons).toLocaleString('pt-BR')}</span>
        ) : (
          <span className="font-bold">{fmtT(l.valor_tons)}</span>
        ),
    },
    {
      key: 'estoque_livre_tons',
      label: 'Estoque livre (t)',
      align: 'right',
      render: (l) => fmtT(l.estoque_livre_tons),
    },
    {
      key: 'estoque_mto_tons',
      label: 'Estoque MTO (t)',
      align: 'right',
      render: (l) => fmtT(l.estoque_mto_tons),
    },
    {
      key: 'estoque_semiacabado_tons',
      label: 'Semiacabado (t)',
      align: 'right',
      render: (l) => fmtT(l.estoque_semiacabado_tons),
    },
    {
      key: 'carteira_aberta_tons',
      label: 'Carteira (t)',
      align: 'right',
      render: (l) => fmtT(l.carteira_aberta_tons),
    },
    {
      key: 'saldo_positivo_tons',
      label: 'Saldo (+) (t)',
      align: 'right',
      render: (l) => (l.saldo_positivo_tons > 0 ? `+${fmtT(l.saldo_positivo_tons)}` : '—'),
    },
    {
      key: 'saldo_negativo_tons',
      label: 'Carteira neg. (t)',
      align: 'right',
      render: (l) => (l.saldo_negativo_tons < 0 ? fmtT(l.saldo_negativo_tons) : '—'),
    },
  ]
}

const colunasNivel3Semiacabado: ColunaDrill<Record<string, any>>[] = [
  { key: 'origem', label: 'Origem do semiacabado' },
  { key: 'valor_tons', label: 'Saldo (t)', align: 'right', render: (l) => fmtT(l.valor_tons) },
  {
    key: 'estoque_livre_tons',
    label: 'Estoque livre (t)',
    align: 'right',
    render: (l) => fmtT(l.estoque_livre_tons),
  },
  {
    key: 'estoque_mto_tons',
    label: 'Estoque MTO (t)',
    align: 'right',
    render: (l) => fmtT(l.estoque_mto_tons),
  },
  {
    key: 'carteira_aberta_tons',
    label: 'Carteira (t)',
    align: 'right',
    render: (l) => fmtT(l.carteira_aberta_tons),
  },
]

const colunasNivel3Composicao: ColunaDrill<Record<string, any>>[] = [
  { key: 'tipo_estoque', label: 'Componente' },
  {
    key: 'valor_tons',
    label: 'Valor (t)',
    align: 'right',
    render: (l) => fmtT(l.valor_tons),
  },
]

export interface CtxCardL1 {
  cardId: string
  tituloCard: string
  /** Mesmo array usado para calcular o valor do card (itensL1). */
  itensL1: CarteiraItem[]
  mapaCurva?: Map<string, string>
  filtrosHerdados?: Record<string, string>
}

/** Monta a config do DrilldownCardModal para um card da Carteira L1 (ou null). */
export function buildConfigCardL1(ctx: CtxCardL1): DrilldownCardConfig<LinhaDrillMaterial> | null {
  const { cardId, tituloCard, itensL1, mapaCurva, filtrosHerdados } = ctx

  const espec = ESPECIFICACOES_L1[cardId]
  if (!espec) return null

  const linhas = linhasNivel2(itensL1, espec, mapaCurva)
  const valorNumerico = linhas.reduce((s, l) => s + l.valor_tons, 0)
  const ehSemiacabado = cardId === 'SALDO_SEMIACABADO'

  return {
    tituloCard,
    nomeVisao: 'Carteira L1',
    valorConsolidado: `${fmtT(valorNumerico)} t`,
    composicao: [
      {
        rotulo: espec.rotuloFormula,
        valor: `${fmtT(valorNumerico)} t`,
        operador: '=',
        destaque: true,
      },
    ],
    fonteDados: 'SAP RFC ZSD28C via carteira-engine',
    centroLinha: 'Linha L1 • Laminação de Perfis Leves',
    filtrosHerdados,
    linhas,
    colunas: colunasNivel2(!!espec.contagem, espec.rotuloValor),
    colunasNivel3: ehSemiacabado ? colunasNivel3Semiacabado : colunasNivel3Composicao,
    buildNivel3: (l) => (ehSemiacabado ? nivel3Semiacabado(l) : nivel3ComposicaoEstoque(l)),
    filtrosLocais: ['familia', 'origem', 'curva'],
    valorNumerico,
    extrairValorLinha: (l) => l.valor_tons,
  }
}

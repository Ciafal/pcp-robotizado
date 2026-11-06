/**
 * Construção do drill-down da Carteira L2 (HUB CIAFAL) para o DrilldownCardModal.
 *
 * Regra de ouro (idêntica à drilldown-l1.tsx / drilldown-geral.tsx): cada card
 * detalha EXATAMENTE o mesmo array usado para calcular o card (itensL2) com a
 * MESMA fórmula — os extratores vêm de carteira-drill-engine (fonte única, sem
 * duplicação). Assim a soma das linhas do drill fecha com o valor exibido no card.
 * Nenhum dado é mockado.
 *
 * Particularidade da L2: o card Saldo Semiacabado usa saldoSemiacabadoItemTons
 * (Semi CIAFAL + Semi Vallourec), e o semiacabado JÁ compõe o Estoque Disponível
 * da L2 — o nível 3 decompõe cada material nas parcelas CIAFAL/Vallourec
 * (nivel3Semiacabado do engine), cuja soma fecha com o valor da linha.
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
import { saldoSemiacabadoItemTons } from './SaldoSemiacabadoCard'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

/** Título exibido no cabeçalho do drill ("Drill-down — [Nome do card]"). */
export const TITULOS_CARDS_L2: Record<string, string> = {
  SALDO_SEMIACABADO: 'Saldo Semiacabado',
  CARTEIRA_TOTAL: 'Carteira Vendas (t)',
  ESTOQUE_LIVRE: 'Estoque Livre (t)',
  ESTOQUE_MTO: 'Estoque MTO (t)',
  SALDO_POSITIVO: 'Saldo Estoque (+) (t)',
  SALDO_NEGATIVO: 'Carteira Negativa (t)',
}

type ExtratorL2 = (it: CarteiraItem) => number

interface EspecCardL2 {
  extrair: ExtratorL2
  filtro?: (it: CarteiraItem) => boolean
  contagem?: boolean
  rotuloValor: string
  rotuloFormula: string
}

const ESPECIFICACOES_L2: Record<string, EspecCardL2> = {
  SALDO_SEMIACABADO: {
    extrair: saldoSemiacabadoItemTons,
    filtro: (it) => saldoSemiacabadoItemTons(it) > 0,
    rotuloValor: 'Semiacabado (t)',
    rotuloFormula:
      'Soma do Saldo Semiacabado (t) dos materiais da L2 — Semi CIAFAL + Semi Vallourec (já compõe o Estoque Disponível da L2)',
  },
  CARTEIRA_TOTAL: {
    extrair: extratoresCard.carteiraTotal,
    rotuloValor: 'Carteira (t)',
    rotuloFormula: 'Soma da carteira aberta (t) dos materiais da L2 (Carteira Vendas)',
  },
  ESTOQUE_LIVRE: {
    extrair: extratoresCard.estoqueLivre,
    filtro: (it) => extratoresCard.estoqueLivre(it) > 0,
    rotuloValor: 'Estoque livre (t)',
    rotuloFormula: 'Soma do Estoque Livre (t) dos materiais da L2',
  },
  ESTOQUE_MTO: {
    extrair: extratoresCard.estoqueMto,
    filtro: (it) => extratoresCard.estoqueMto(it) > 0,
    rotuloValor: 'Estoque MTO (t)',
    rotuloFormula: 'Soma do Estoque MTO (t) dos materiais da L2',
  },
  SALDO_POSITIVO: {
    extrair: extratoresCard.saldoPositivo,
    filtro: (it) => extratoresCard.saldoPositivo(it) > 0,
    rotuloValor: 'Saldo (+) (t)',
    rotuloFormula:
      'Soma do Saldo Estoque positivo (t) dos materiais da L2 (MAX(0; Disp − Demanda))',
  },
  SALDO_NEGATIVO: {
    extrair: extratoresCard.saldoNegativo,
    filtro: (it) => extratoresCard.saldoNegativo(it) > 0,
    rotuloValor: 'Carteira negativa (t)',
    rotuloFormula:
      'Soma do valor absoluto da Carteira Negativa (t) dos materiais da L2 (MIN(0; Disp − Demanda))',
  },
}

const fmtT = (v: number) => formatNumberPTBR(v, 2)

/** Agrega os registros por material preservando a fórmula do card (soma fecha). */
function linhasNivel2(
  itensL2: CarteiraItem[],
  espec: EspecCardL2,
  mapaCurva?: Map<string, string>,
): LinhaDrillMaterial[] {
  return linhasPorMaterial(itensL2, espec.extrair, mapaCurva)
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

export interface CtxCardL2 {
  cardId: string
  tituloCard: string
  /** Mesmo array usado para calcular o valor do card (itensL2). */
  itensL2: CarteiraItem[]
  mapaCurva?: Map<string, string>
  filtrosHerdados?: Record<string, string>
}

/** Monta a config do DrilldownCardModal para um card da Carteira L2 (ou null). */
export function buildConfigCardL2(ctx: CtxCardL2): DrilldownCardConfig<LinhaDrillMaterial> | null {
  const { cardId, tituloCard, itensL2, mapaCurva, filtrosHerdados } = ctx

  const espec = ESPECIFICACOES_L2[cardId]
  if (!espec) return null

  const linhas = linhasNivel2(itensL2, espec, mapaCurva)
  const valorNumerico = linhas.reduce((s, l) => s + l.valor_tons, 0)
  const ehSemiacabado = cardId === 'SALDO_SEMIACABADO'

  return {
    tituloCard,
    nomeVisao: 'Carteira L2',
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
    centroLinha: 'Linha L2 • Laminação de Perfis Pesados e Blocos',
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

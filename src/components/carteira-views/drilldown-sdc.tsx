/**
 * Construção do drill-down da Carteira SDC (HUB CIAFAL) para o DrilldownCardModal.
 *
 * Regra de ouro (idêntica à drilldown-l1.tsx / drilldown-l2.tsx): cada card
 * detalha EXATAMENTE o mesmo array usado para calcular o card (o array integral
 * `itens` da SDC, o mesmo passado ao CarteiraSDCEngine.calcularKpis — nunca
 * itensFiltrados) com a MESMA fórmula dos extratores. Assim a soma das linhas
 * do drill fecha com o valor exibido no card. Nenhum dado é mockado.
 *
 * Na SDC NÃO há níveis 3 de semiacabado (CarteiraSDCItem não tem campo de
 * semiacabado): o nível 3 é a composição de estoque do material (total,
 * disponível, qualidade, bloqueado, carteira, programado, em produção).
 */
import { DrilldownCardConfig, ColunaDrill } from './DrilldownCardModal'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

/** Título exibido no cabeçalho do drill ("Drill-down — [Nome do card]"). */
export const TITULOS_CARDS_SDC: Record<string, string> = {
  CARTEIRA_TOTAL: 'Carteira Total SDC',
  DEFICIT_ATUAL: 'Déficit Atual (-)',
  ITENS_COM_DEFICIT: 'Itens com Déficit',
  EM_PRODUCAO: 'Em Produção (t)',
  COBERTURA_PROGRAMADA: 'Cobertura Programada',
  ITENS_CRITICOS: 'Itens Críticos',
}

type ExtratorSDC = (it: CarteiraSDCItem) => number

interface EspecCardSDC {
  extrair: ExtratorSDC
  filtro?: (it: CarteiraSDCItem) => boolean
  contagem?: boolean
  rotuloValor: string
  rotuloFormula: string
}

/** Extratores = mesma fórmula de CarteiraSDCEngine.calcularKpis (fonte única). */
const ESPECIFICACOES_SDC: Record<string, EspecCardSDC> = {
  CARTEIRA_TOTAL: {
    extrair: (it) => it.carteira_t,
    rotuloValor: 'Carteira (t)',
    rotuloFormula: 'Soma da carteira aberta (t) dos materiais da SDC (centro SDPL)',
  },
  DEFICIT_ATUAL: {
    extrair: (it) => (it.saldo_t < 0 ? Math.abs(it.saldo_t) : 0),
    filtro: (it) => it.saldo_t < 0,
    rotuloValor: 'Déficit (t)',
    rotuloFormula:
      'Soma do valor absoluto dos saldos negativos (t) dos materiais da SDC (MIN(0; Estoque − Carteira))',
  },
  ITENS_COM_DEFICIT: {
    extrair: (it) => (it.saldo_t < 0 ? 1 : 0),
    filtro: (it) => it.saldo_t < 0,
    contagem: true,
    rotuloValor: 'Itens',
    rotuloFormula: 'Contagem de materiais da SDC com saldo negativo (Estoque − Carteira < 0)',
  },
  EM_PRODUCAO: {
    extrair: (it) => it.em_producao_t,
    filtro: (it) => it.em_producao_t > 0,
    rotuloValor: 'Em produção (t)',
    rotuloFormula: 'Soma da tonelagem em produção (t) dos materiais da SDC',
  },
  COBERTURA_PROGRAMADA: {
    extrair: (it) => (it.status === 'COBERTURA PROGRAMADA' ? 1 : 0),
    filtro: (it) => it.status === 'COBERTURA PROGRAMADA',
    contagem: true,
    rotuloValor: 'Itens',
    rotuloFormula:
      'Contagem de materiais da SDC com status "COBERTURA PROGRAMADA" (saldo projetado ≥ 0)',
  },
  ITENS_CRITICOS: {
    extrair: (it) => (it.status === 'CRÍTICO' || it.status === 'SEM ESTOQUE' ? 1 : 0),
    filtro: (it) => it.status === 'CRÍTICO' || it.status === 'SEM ESTOQUE',
    contagem: true,
    rotuloValor: 'Itens',
    rotuloFormula:
      'Contagem de materiais da SDC com status "CRÍTICO" ou "SEM ESTOQUE" (sem programação / sem estoque)',
  },
}

const fmtT = (v: number) => formatNumberPTBR(v, 2)

/** Agrega os registros por material preservando a fórmula do card (soma fecha). */
function linhasNivel2(itensSDC: CarteiraSDCItem[], espec: EspecCardSDC) {
  const mapa = new Map<string, LinhaSDC>()
  itensSDC.forEach((it) => {
    const valor = espec.extrair(it)
    const existente = mapa.get(it.material)
    if (existente) {
      existente.valor_tons += valor
    } else {
      mapa.set(it.material, {
        material: it.material,
        descricao: it.descricao,
        familia: it.familia || 'Perfis SDC',
        origem: it.origem_producao,
        curva: it.curva_abc || '—',
        status: it.status,
        valor_tons: valor,
        estoque_total_tons: it.estoque_total_t,
        estoque_disponivel_tons: it.estoque_disponivel_t ?? it.estoque_total_t,
        estoque_qualidade_tons: it.estoque_qualidade_t ?? 0,
        estoque_bloqueado_tons: it.estoque_bloqueado_t ?? 0,
        carteira_tons: it.carteira_t,
        programado_tons: it.programado_t,
        em_producao_tons: it.em_producao_t,
        saldo_tons: it.saldo_t,
        cobertura_pct: it.cobertura_pct,
      })
    }
  })
  return Array.from(mapa.values())
    .filter((l) => Math.abs(l.valor_tons) > 0.0000001)
    .sort((a, b) => b.valor_tons - a.valor_tons)
}

interface LinhaSDC {
  material: string
  descricao: string
  familia: string
  origem: string
  curva: string
  status: string
  valor_tons: number
  estoque_total_tons: number
  estoque_disponivel_tons: number
  estoque_qualidade_tons: number
  estoque_bloqueado_tons: number
  carteira_tons: number
  programado_tons: number
  em_producao_tons: number
  saldo_tons: number
  cobertura_pct: number
}

function colunasNivel2(contagem: boolean, rotuloValor: string): ColunaDrill<LinhaSDC>[] {
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
      key: 'carteira_tons',
      label: 'Carteira (t)',
      align: 'right',
      render: (l) => fmtT(l.carteira_tons),
    },
    {
      key: 'estoque_total_tons',
      label: 'Estoque total (t)',
      align: 'right',
      render: (l) => fmtT(l.estoque_total_tons),
    },
    {
      key: 'programado_tons',
      label: 'Programado (t)',
      align: 'right',
      render: (l) => fmtT(l.programado_tons),
    },
    {
      key: 'em_producao_tons',
      label: 'Em produção (t)',
      align: 'right',
      render: (l) => fmtT(l.em_producao_tons),
    },
    {
      key: 'saldo_tons',
      label: 'Saldo (t)',
      align: 'right',
      render: (l) =>
        l.saldo_tons < 0 ? (
          <span className="text-rose-700">{fmtT(l.saldo_tons)}</span>
        ) : (
          fmtT(l.saldo_tons)
        ),
    },
    {
      key: 'cobertura_pct',
      label: 'Cobertura',
      align: 'right',
      render: (l) => `${formatNumberPTBR(l.cobertura_pct, 1)}%`,
    },
  ]
}

const colunasNivel3Composicao: ColunaDrill<Record<string, any>>[] = [
  { key: 'tipo_estoque', label: 'Componente' },
  {
    key: 'valor_tons',
    label: 'Valor (t)',
    align: 'right',
    render: (l) =>
      l.valor_tons < 0 ? (
        <span className="text-rose-700">{fmtT(l.valor_tons)}</span>
      ) : (
        fmtT(l.valor_tons)
      ),
  },
]

/** Nível 3 = composição de estoque do material (campos reais de CarteiraSDCItem). */
function nivel3ComposicaoEstoqueSDC(l: LinhaSDC): Record<string, any>[] {
  return [
    { tipo_estoque: 'Estoque Total SDPL (t)', valor_tons: l.estoque_total_tons },
    { tipo_estoque: 'Estoque Disponível (t)', valor_tons: l.estoque_disponivel_tons },
    { tipo_estoque: 'Estoque em Qualidade (t)', valor_tons: l.estoque_qualidade_tons },
    { tipo_estoque: 'Estoque Bloqueado (t)', valor_tons: l.estoque_bloqueado_tons },
    { tipo_estoque: 'Carteira (t)', valor_tons: -l.carteira_tons },
    { tipo_estoque: 'Programado (t)', valor_tons: l.programado_tons },
    { tipo_estoque: 'Em Produção (t)', valor_tons: l.em_producao_tons },
    { tipo_estoque: 'Saldo (t) = Estoque − Carteira', valor_tons: l.saldo_tons },
  ]
}

export interface CtxCardSDC {
  cardId: string
  tituloCard: string
  /** Mesmo array integral usado para calcular o valor do card via calcularKpis (NUNCA itensFiltrados). */
  itens: CarteiraSDCItem[]
  filtrosHerdados?: Record<string, string>
}

/** Monta a config do DrilldownCardModal para um card da Carteira SDC (ou null). */
export function buildConfigCardSDC(ctx: CtxCardSDC): DrilldownCardConfig<LinhaSDC> | null {
  const { cardId, tituloCard, itens, filtrosHerdados } = ctx

  const espec = ESPECIFICACOES_SDC[cardId]
  if (!espec) return null

  const linhas = linhasNivel2(itens, espec)
  const valorNumerico = linhas.reduce((s, l) => s + l.valor_tons, 0)

  return {
    tituloCard,
    nomeVisao: 'Carteira SDC',
    valorConsolidado: espec.contagem
      ? `${Math.round(valorNumerico).toLocaleString('pt-BR')} itens`
      : `${fmtT(valorNumerico)} t`,
    composicao: [
      {
        rotulo: espec.rotuloFormula,
        valor: espec.contagem
          ? `${Math.round(valorNumerico).toLocaleString('pt-BR')} itens`
          : `${fmtT(valorNumerico)} t`,
        operador: '=',
        destaque: true,
      },
    ],
    fonteDados: 'SAP RFC ZSD28C • Centro SDPL (Sidercentro)',
    centroLinha: 'Centro SDPL • Sidercentro',
    filtrosHerdados,
    linhas,
    colunas: colunasNivel2(!!espec.contagem, espec.rotuloValor),
    colunasNivel3: colunasNivel3Composicao,
    buildNivel3: (l) => nivel3ComposicaoEstoqueSDC(l),
    filtrosLocais: ['familia', 'origem', 'curva', 'status'],
    valorNumerico,
    extrairValorLinha: (l) => l.valor_tons,
  }
}

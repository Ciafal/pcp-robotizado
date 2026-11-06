/**
 * Construção do drill-down da Carteira Geral (HUB CIAFAL) para o DrilldownCardModal.
 *
 * Regra de ouro: cada card detalha EXATAMENTE o mesmo array usado para calcular o
 * card (todosItensCalculados, Geral + SDC) com a MESMA fórmula — assim a soma das
 * linhas do drill fecha com o valor exibido no card. Nenhum dado é mockado.
 *
 * O Nível 2 agrega por código de material (a soma continua fechando, pois a
 * agregação é aditiva) e o Nível 3 expõe os registros originais do material
 * (ou a decomposição CIAFAL/Vallourec no card de Saldo Semiacabado).
 */
import { DrilldownCardConfig, ColunaDrill, ComposicaoCalculo } from './DrilldownCardModal'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'
import { CarteiraItem } from '@/types/carteira-analise'
import { saldoSemiacabadoItemTons } from './SaldoSemiacabadoCard'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

export interface RegistroDrillGeral {
  cliente: string
  linha: string
  origem: string
  carteira_tons: number
  valor: number
  data_desejada: string
}

export interface LinhaDrillGeral {
  material: string
  descricao: string
  familia: string
  linha: string
  origem: string
  centro: string
  curva: string
  risco: string
  /** Valor que compõe o card — mesma fórmula do card. */
  valor: number
  carteira_tons: number
  estoque_disponivel_tons: number
  estoque_bloqueado_tons: number
  deficit_tons: number
  programado_tons: number
  saldo_projetado_tons: number
  em_producao_tons: number
  semiacabado_ciafal_tons: number
  semiacabado_vallourec_tons: number
  registros: RegistroDrillGeral[]
}

type ExtratorGeral = (it: ItemCurvaAbcCalculado) => number

interface EspecCard {
  extrair: ExtratorGeral
  filtro?: (it: ItemCurvaAbcCalculado) => boolean
  contagem?: boolean
  rotuloValor: string
  rotuloFormula: string
}

/** Decomposição semiacabada do item original (CarteiraItem tem os campos; SDC não). */
function semiItem(orig: unknown): { ciafal: number; vallourec: number } {
  if (!orig || typeof orig !== 'object') return { ciafal: 0, vallourec: 0 }
  const o = orig as Record<string, unknown>
  if ('estoque_semiacabado_tons' in o || 'estoque_semiacabado_ciafal_tons' in o) {
    return {
      ciafal: Number(o.estoque_semiacabado_ciafal_tons ?? o.estoque_semiacabado_tons ?? 0),
      vallourec: Number(o.estoque_semiacabado_vallourec_tons ?? 0),
    }
  }
  return { ciafal: 0, vallourec: 0 }
}

const valorFaturadoItem = (it: ItemCurvaAbcCalculado): number => {
  const orig = it.origemItemOriginal as CarteiraItem | undefined
  const f = orig && typeof orig.qtd_faturada_tons === 'number' ? orig.qtd_faturada_tons : 0
  return isNaN(f) ? 0 : f
}

const ESPECIFICACOES: Record<string, EspecCard> = {
  SALDO_SEMIACABADO: {
    extrair: (it) => saldoSemiacabadoItemTons((it.origemItemOriginal ?? {}) as CarteiraItem),
    filtro: (it) => saldoSemiacabadoItemTons((it.origemItemOriginal ?? {}) as CarteiraItem) > 0,
    rotuloValor: 'Saldo semiacabado (t)',
    rotuloFormula:
      'Soma de Semi CIAFAL (ou consolidado) + Semi Vallourec por registro (Geral + SDC) — não compõe o Estoque Disponível',
  },
  CARTEIRA_TOTAL: {
    extrair: (it) => it.carteira_tons,
    rotuloValor: 'Carteira (t)',
    rotuloFormula: 'Soma da carteira aberta (t) de todos os registros consolidados (Geral + SDC)',
  },
  TOTAL_ITENS: {
    extrair: () => 1,
    contagem: true,
    rotuloValor: 'Qtd. registros',
    rotuloFormula: 'Contagem de registros de carteira consolidados (Geral + SDC)',
  },
  ESTOQUE_DISPONIVEL: {
    extrair: (it) => it.estoque_disponivel_tons,
    filtro: (it) => it.estoque_disponivel_tons > 0,
    rotuloValor: 'Estoque disp. (t)',
    rotuloFormula: 'Soma do estoque disponível (t) dos registros (livre − bloqueado)',
  },
  ESTOQUE_QUALIDADE: {
    extrair: (it) => it.estoque_qualidade_tons,
    filtro: (it) => it.estoque_qualidade_tons > 0,
    rotuloValor: 'Estoque qualidade (t)',
    rotuloFormula: 'Soma do estoque em inspeção de qualidade (t) dos registros',
  },
  ESTOQUE_BLOQUEADO: {
    extrair: (it) => it.estoque_bloqueado_tons,
    filtro: (it) => it.estoque_bloqueado_tons > 0,
    rotuloValor: 'Estoque bloqueado (t)',
    rotuloFormula: 'Soma do estoque bloqueado (t) dos registros (bloqueio comercial/SGQ)',
  },
  DEFICIT_ATUAL: {
    extrair: (it) => it.deficit_tons,
    filtro: (it) => it.deficit_tons > 0,
    rotuloValor: 'Déficit (t)',
    rotuloFormula: 'Soma do déficit físico (t) dos registros com saldo negativo',
  },
  ITENS_COM_DEFICIT: {
    extrair: (it) => (it.deficit_tons > 0 ? 1 : 0),
    contagem: true,
    rotuloValor: 'Qtd. registros',
    rotuloFormula: 'Contagem de registros com déficit físico (t) > 0',
  },
  EM_PRODUCAO: {
    extrair: (it) => it.em_producao_tons,
    filtro: (it) => it.em_producao_tons > 0,
    rotuloValor: 'Em produção (t)',
    rotuloFormula: 'Soma do volume em produção (t) nos registros (OPs em execução)',
  },
  COBERTURA_PROGRAMADA: {
    extrair: (it) => it.programado_tons,
    filtro: (it) => it.programado_tons > 0,
    rotuloValor: 'Programado (t)',
    rotuloFormula: 'Soma do volume programado (t) pelo sequenciamento PCP nos registros',
  },
  SALDO_PROJETADO: {
    extrair: (it) => it.saldo_projetado_tons,
    rotuloValor: 'Saldo projetado (t)',
    rotuloFormula: 'Soma do saldo projetado (t) de TODOS os registros (saldo atual + programado)',
  },
  ITENS_CRITICOS: {
    extrair: (it) => (it.risco === 'CRITICO' ? 1 : 0),
    contagem: true,
    rotuloValor: 'Qtd. registros',
    rotuloFormula: 'Contagem de registros classificados com risco CRÍTICO',
  },
  ITENS_SEM_PROGRAMACAO: {
    extrair: (it) => (it.deficit_tons > 0 && it.programado_tons === 0 ? 1 : 0),
    contagem: true,
    rotuloValor: 'Qtd. registros',
    rotuloFormula: 'Contagem de registros com déficit (t) > 0 e sem OP programada',
  },
  ITENS_RISCO_RUPTURA: {
    extrair: (it) => (it.deficit_tons > 0 && it.saldo_projetado_tons < 0 ? 1 : 0),
    contagem: true,
    rotuloValor: 'Qtd. registros',
    rotuloFormula: 'Contagem de registros com déficit (t) > 0 e saldo projetado negativo',
  },
  FATURAMENTO_FISICO: {
    extrair: valorFaturadoItem,
    filtro: (it) => valorFaturadoItem(it) > 0,
    rotuloValor: 'Faturado (t)',
    rotuloFormula: 'Soma do volume físico faturado (t) — últimos 3 meses completos + mês atual',
  },
  CURVA_A: {
    extrair: () => 1,
    filtro: (it) => it.curva_abc === 'A',
    contagem: true,
    rotuloValor: 'Qtd. registros',
    rotuloFormula: 'Contagem de registros classificados na Curva A (até o corte de volume A)',
  },
  CURVA_B: {
    extrair: () => 1,
    filtro: (it) => it.curva_abc === 'B',
    contagem: true,
    rotuloValor: 'Qtd. registros',
    rotuloFormula: 'Contagem de registros classificados na Curva B',
  },
  CURVA_C: {
    extrair: () => 1,
    filtro: (it) => it.curva_abc === 'C',
    contagem: true,
    rotuloValor: 'Qtd. registros',
    rotuloFormula: 'Contagem de registros classificados na Curva C (cauda longa)',
  },
}

function piorRisco(a: string, b: string): string {
  const peso: Record<string, number> = { NORMAL: 0, ATENCAO: 1, CRITICO: 2 }
  return (peso[a] ?? 0) >= (peso[b] ?? 0) ? a : b
}

/** Agrega os registros calculados por código de material (soma aditiva → fecha com o card). */
export function agregarPorMaterial(
  itens: ItemCurvaAbcCalculado[],
  extrair: ExtratorGeral,
  filtro?: (it: ItemCurvaAbcCalculado) => boolean,
): LinhaDrillGeral[] {
  const mapa = new Map<
    string,
    LinhaDrillGeral & {
      _linhas: Set<string>
      _origens: Set<string>
    }
  >()

  itens.forEach((it) => {
    if (filtro && !filtro(it)) return
    const v = extrair(it) || 0
    const orig = (it.origemItemOriginal ?? {}) as Partial<CarteiraItem>
    const semi = semiItem(orig)
    const reg: RegistroDrillGeral = {
      cliente: it.cliente || '—',
      linha: it.linha || '—',
      origem: orig.origem_produto || it.tipo_carteira || '—',
      carteira_tons: it.carteira_tons || 0,
      valor: v,
      data_desejada: it.data_desejada || '—',
    }

    const atual = mapa.get(it.codigo_material)
    if (atual) {
      atual.valor += v
      atual.carteira_tons += it.carteira_tons || 0
      atual.estoque_disponivel_tons += it.estoque_disponivel_tons || 0
      atual.estoque_bloqueado_tons += it.estoque_bloqueado_tons || 0
      atual.deficit_tons += it.deficit_tons || 0
      atual.programado_tons += it.programado_tons || 0
      atual.saldo_projetado_tons += it.saldo_projetado_tons || 0
      atual.em_producao_tons += it.em_producao_tons || 0
      atual.semiacabado_ciafal_tons += semi.ciafal
      atual.semiacabado_vallourec_tons += semi.vallourec
      atual.risco = piorRisco(atual.risco, it.risco)
      atual._linhas.add(it.linha || '—')
      atual._origens.add(reg.origem)
      atual.registros.push(reg)
    } else {
      mapa.set(it.codigo_material, {
        material: it.codigo_material,
        descricao: it.descricao_material || '',
        familia: it.familia || 'OUTROS',
        linha: it.linha || '—',
        origem: reg.origem,
        centro: it.centro || '—',
        curva: it.curva_abc || 'C',
        risco: it.risco,
        valor: v,
        carteira_tons: it.carteira_tons || 0,
        estoque_disponivel_tons: it.estoque_disponivel_tons || 0,
        estoque_bloqueado_tons: it.estoque_bloqueado_tons || 0,
        deficit_tons: it.deficit_tons || 0,
        programado_tons: it.programado_tons || 0,
        saldo_projetado_tons: it.saldo_projetado_tons || 0,
        em_producao_tons: it.em_producao_tons || 0,
        semiacabado_ciafal_tons: semi.ciafal,
        semiacabado_vallourec_tons: semi.vallourec,
        registros: [reg],
        _linhas: new Set([it.linha || '—']),
        _origens: new Set([reg.origem]),
      })
    }
  })

  return Array.from(mapa.values())
    .filter((l) => Math.abs(l.valor) > 0.0000001)
    .map((l) => ({
      ...l,
      linha: Array.from(l._linhas).sort().join(', '),
      origem: Array.from(l._origens).sort().join(', '),
    }))
    .sort((a, b) => b.valor - a.valor)
}

const fmtT = (v: number) => formatNumberPTBR(v, 2)

function colunasNivel2(contagem: boolean, rotuloValor: string): ColunaDrill<LinhaDrillGeral>[] {
  return [
    {
      key: 'material',
      label: 'Material',
      render: (l) => <span className="font-mono font-semibold text-[#004C97]">{l.material}</span>,
    },
    { key: 'descricao', label: 'Descrição' },
    { key: 'familia', label: 'Família' },
    { key: 'linha', label: 'Linha' },
    { key: 'origem', label: 'Origem' },
    { key: 'centro', label: 'Centro', align: 'center' },
    { key: 'curva', label: 'Curva', align: 'center' },
    { key: 'risco', label: 'Risco', align: 'center' },
    {
      key: 'valor',
      label: rotuloValor,
      align: 'right',
      render: (l) =>
        contagem ? (
          <span className="font-bold">{Math.round(l.valor).toLocaleString('pt-BR')}</span>
        ) : (
          <span className="font-bold">{fmtT(l.valor)}</span>
        ),
    },
    {
      key: 'carteira_tons',
      label: 'Carteira (t)',
      align: 'right',
      render: (l) => fmtT(l.carteira_tons),
    },
    {
      key: 'estoque_disponivel_tons',
      label: 'Estoque disp. (t)',
      align: 'right',
      render: (l) => fmtT(l.estoque_disponivel_tons),
    },
    {
      key: 'deficit_tons',
      label: 'Déficit (t)',
      align: 'right',
      render: (l) => fmtT(l.deficit_tons),
    },
    {
      key: 'programado_tons',
      label: 'Programado (t)',
      align: 'right',
      render: (l) => fmtT(l.programado_tons),
    },
    {
      key: 'saldo_projetado_tons',
      label: 'Saldo proj. (t)',
      align: 'right',
      render: (l) => fmtT(l.saldo_projetado_tons),
    },
  ]
}

const colunasNivel3Registros: ColunaDrill<Record<string, any>>[] = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'linha', label: 'Linha' },
  { key: 'origem', label: 'Origem' },
  {
    key: 'carteira_tons',
    label: 'Carteira (t)',
    align: 'right',
    render: (l) => fmtT(l.carteira_tons),
  },
  { key: 'valor', label: 'Valor do card (t)', align: 'right', render: (l) => fmtT(l.valor) },
  { key: 'data_desejada', label: 'Data desejada', align: 'center' },
]

const colunasNivel3Semiacabado: ColunaDrill<Record<string, any>>[] = [
  { key: 'origem', label: 'Origem do semiacabado' },
  { key: 'valor_tons', label: 'Saldo (t)', align: 'right', render: (l) => fmtT(l.valor_tons) },
  {
    key: 'carteira_aberta_tons',
    label: 'Carteira (t)',
    align: 'right',
    render: (l) => fmtT(l.carteira_aberta_tons),
  },
]

function composicaoCard(
  rotuloFormula: string,
  valorNumerico: number,
  contagem?: boolean,
): ComposicaoCalculo[] {
  return [
    {
      rotulo: rotuloFormula,
      valor: contagem
        ? `${Math.round(valorNumerico).toLocaleString('pt-BR')} registro(s)`
        : `${fmtT(valorNumerico)} t`,
      operador: '=',
      destaque: true,
    },
  ]
}

export interface CtxCardGeral {
  cardId: string
  tituloCard: string
  itensCalc: ItemCurvaAbcCalculado[]
  faturamentoFisico: { total: number; erro: boolean; tem: boolean }
  filtrosHerdados?: Record<string, string>
}

/** Monta a config do DrilldownCardModal para um card da Carteira Geral (ou null). */
export function buildConfigCardGeral(
  ctx: CtxCardGeral,
): DrilldownCardConfig<LinhaDrillGeral> | null {
  const { cardId, tituloCard, itensCalc, faturamentoFisico, filtrosHerdados } = ctx

  if (cardId === 'FATURAMENTO_FISICO' && (faturamentoFisico.erro || !faturamentoFisico.tem)) {
    return {
      tituloCard,
      nomeVisao: 'Carteira Geral',
      valorConsolidado: faturamentoFisico.erro
        ? 'Informação temporariamente indisponível'
        : 'Dado não disponível',
      composicao: [
        { rotulo: 'Volume físico faturado (t) — últimos 3 meses + mês atual', valor: '—' },
      ],
      fonteDados: 'SAP RFC ZSD28C via carteira-engine',
      filtrosHerdados,
      indisponivel: true,
      mensagemIndisponivel: faturamentoFisico.erro
        ? 'Informação temporariamente indisponível — não foi possível calcular o faturamento físico.'
        : 'Dado não disponível — nenhum faturamento físico registrado no período (últimos 3 meses + atual).',
      linhas: [],
      colunas: colunasNivel2(false, 'Faturado (t)'),
      colunasNivel3: colunasNivel3Registros,
    }
  }

  const espec = ESPECIFICACOES[cardId]
  if (!espec) return null

  const linhas = agregarPorMaterial(itensCalc, espec.extrair, espec.filtro)
  const valorNumerico = linhas.reduce((s, l) => s + l.valor, 0)

  return {
    tituloCard,
    nomeVisao: 'Carteira Geral',
    valorConsolidado: espec.contagem
      ? `${Math.round(valorNumerico).toLocaleString('pt-BR')} itens`
      : `${fmtT(valorNumerico)} t`,
    composicao: composicaoCard(espec.rotuloFormula, valorNumerico, espec.contagem),
    fonteDados: 'SAP RFC ZSD28C via carteira-engine',
    filtrosHerdados,
    linhas,
    colunas: colunasNivel2(!!espec.contagem, espec.rotuloValor),
    colunasNivel3:
      cardId === 'SALDO_SEMIACABADO' ? colunasNivel3Semiacabado : colunasNivel3Registros,
    buildNivel3: (l) =>
      cardId === 'SALDO_SEMIACABADO'
        ? [
            {
              origem: 'Semiacabado CIAFAL',
              valor_tons: l.semiacabado_ciafal_tons,
              carteira_aberta_tons: l.carteira_tons,
            },
            {
              origem: 'Semiacabado Vallourec',
              valor_tons: l.semiacabado_vallourec_tons,
              carteira_aberta_tons: l.carteira_tons,
            },
          ]
        : (l.registros as Record<string, any>[]),
    filtrosLocais: ['familia', 'linha', 'origem', 'centro', 'curva'],
    valorNumerico,
    extrairValorLinha: (l) => l.valor,
  }
}

/** Drill de grupo (Análise Gráfica) e de faixa (Curva ABC): valor = Σ carteira (t). */
export function buildConfigGrupoOuFaixa(
  tituloCard: string,
  itens: ItemCurvaAbcCalculado[],
  filtrosHerdados?: Record<string, string>,
): DrilldownCardConfig<LinhaDrillGeral> {
  const linhas = agregarPorMaterial(itens, (it) => it.carteira_tons)
  const valorNumerico = linhas.reduce((s, l) => s + l.valor, 0)
  return {
    tituloCard,
    nomeVisao: 'Carteira Geral',
    valorConsolidado: `${fmtT(valorNumerico)} t`,
    composicao: [
      {
        rotulo: 'Soma da carteira aberta (t) dos materiais do grupo/faixa selecionado',
        valor: `${fmtT(valorNumerico)} t`,
        operador: '=',
        destaque: true,
      },
    ],
    fonteDados: 'SAP RFC ZSD28C via carteira-engine',
    filtrosHerdados,
    linhas,
    colunas: colunasNivel2(false, 'Carteira (t)'),
    colunasNivel3: colunasNivel3Registros,
    buildNivel3: (l) => l.registros as Record<string, any>[],
    filtrosLocais: ['familia', 'linha', 'origem', 'centro', 'curva'],
    valorNumerico,
    extrairValorLinha: (l) => l.valor,
  }
}

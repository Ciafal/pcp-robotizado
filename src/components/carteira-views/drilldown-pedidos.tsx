/**
 * Adaptadores e Construtores Oficiais de Drill-down para:
 * - Pedidos em Carteira (8 cards)
 * - Pedidos com Saldos Residuais (7 cards)
 *
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 *
 * Regra de ouro da CIAFAL:
 * - Cada card detalha EXATAMENTE o mesmo conjunto de dados que gerou o card.
 * - Valor do card = soma das linhas do drill (fechamento matemático).
 * - Nível 2 lista o resumo detalhado por item/pedido com filtros locais.
 * - Nível 3 detalha informações operacionais e datas.
 */

import React from 'react'
import { DrilldownCardConfig, ColunaDrill, ComposicaoCalculo } from './DrilldownCardModal'
import {
  PedidoCarteiraAnalitico,
  PedidoCarteiraItem,
  KpisPedidosCarteira,
  KpisPedidosSaldosResiduais,
} from '@/types/pcp-pedidos-carteira'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

export interface CardConfigDrill {
  id: string
  titulo: string
  subtitulo: string
  tipoVisualizacao?: string
  unidade?: string
}

export interface ExtratorCard<T = PedidoCarteiraItem> {
  valorCard: (itens: T[]) => number
  filtraLinhas: (itens: T[]) => T[]
  valorLinha: (item: T) => number
  formulaExplicada: string
}

export interface LinhaDrillPedido {
  id: string
  pedido_sap: string
  item_sap: string
  codigo_cliente: string
  nome_cliente: string
  codigo_material: string
  descricao_material: string
  familia: string
  bitola: string
  centro: string
  linha: string
  status: string
  data_pedido: string
  data_prevista: string
  dias_atraso: number
  saldo_aberto_t: number
  percentual_residual: number
  valor_saldo_brl: number
  estoque_livre_t: number
  valor: number
}

// 8 Cards da Visão "Pedidos em Carteira"
export const CARDS_CONFIG_PEDIDOS_CARTEIRA: CardConfigDrill[] = [
  {
    id: 'TOTAL_PEDIDOS',
    titulo: 'Total de Pedidos',
    subtitulo: 'Ordens de venda ativas na carteira SAP ECC',
  },
  {
    id: 'TOTAL_ITENS',
    titulo: 'Total de Itens',
    subtitulo: 'Linhas ativas de pedidos na carteira',
  },
  {
    id: 'QUANTIDADE_CARTEIRA_TONS',
    titulo: 'Quantidade em Carteira (t)',
    subtitulo: 'Volume físico total em aberto na carteira',
  },
  {
    id: 'VALOR_TOTAL_CARTEIRA_RS',
    titulo: 'Valor Total em Carteira (R$)',
    subtitulo: 'Montante financeiro total dos saldos em aberto',
  },
  {
    id: 'PEDIDOS_COM_RESIDUAL',
    titulo: 'Pedidos com Saldo Residual',
    subtitulo: 'Ordens de venda com itens residuais conforme parâmetros',
  },
  {
    id: 'PEDIDOS_COM_ATRASO',
    titulo: 'Pedidos com Atraso',
    subtitulo: 'Ordens de venda com data de entrega prometida vencida',
  },
  {
    id: 'PEDIDOS_COM_DEFICIT',
    titulo: 'Pedidos com Déficit de Estoque',
    subtitulo: 'Itens com necessidade de produção sem cobertura de estoque',
  },
  {
    id: 'PEDIDOS_COBERTURA_DISPONIVEL',
    titulo: 'Pedidos com Cobertura Disponível',
    subtitulo: 'Itens com estoque disponível para faturamento imediato',
  },
]

// 7 Cards da Visão "Pedidos com Saldos Residuais"
export const CARDS_CONFIG_SALDOS_RESIDUAIS: CardConfigDrill[] = [
  {
    id: 'RESIDUAL_PEDIDOS',
    titulo: 'Total de Pedidos com Saldo Residual',
    subtitulo: 'Ordens de venda que contêm saldo residual',
  },
  {
    id: 'RESIDUAL_ITENS',
    titulo: 'Qtd de Itens Residuais',
    subtitulo: 'Linhas de pedido identificadas como sobras/resíduos',
  },
  {
    id: 'RESIDUAL_SALDO_TONS',
    titulo: 'Saldo Residual Total (t)',
    subtitulo: 'Volume físico total dos saldos residuais em toneladas',
  },
  {
    id: 'RESIDUAL_VALOR_RS',
    titulo: 'Valor Financeiro Residual (R$)',
    subtitulo: 'Montante financeiro dos itens com saldo residual',
  },
  {
    id: 'RESIDUAL_CLIENTES',
    titulo: 'Clientes com Pedidos Residuais',
    subtitulo: 'Clientes distintos impactados por ordens residuais',
  },
  {
    id: 'RESIDUAL_VENCIDOS',
    titulo: 'Pedidos Residuais Vencidos',
    subtitulo: 'Itens residuais com data de entrega expirada',
  },
  {
    id: 'RESIDUAL_PERCENTUAL_CARTEIRA',
    titulo: '% da Carteira em Saldo Residual',
    subtitulo: 'Proporção do volume residual sobre a carteira total',
  },
]

// Extratores canônicos dos 8 cards de Pedidos em Carteira
export const extratoresCardPedidosCarteira: Record<string, ExtratorCard<PedidoCarteiraItem>> = {
  TOTAL_PEDIDOS: {
    valorCard: (itens) => new Set(itens.map((i) => i.pedido_sap)).size,
    filtraLinhas: (itens) => itens,
    valorLinha: () => 1,
    formulaExplicada: 'Total de ordens de venda distintas ativas na carteira SAP ECC.',
  },
  TOTAL_ITENS: {
    valorCard: (itens) => itens.length,
    filtraLinhas: (itens) => itens,
    valorLinha: () => 1,
    formulaExplicada: 'Total de linhas/itens ativos de pedidos na carteira SAP.',
  },
  QUANTIDADE_CARTEIRA_TONS: {
    valorCard: (itens) => itens.reduce((s, i) => s + (i.saldo_aberto_t || 0), 0),
    filtraLinhas: (itens) => itens.filter((i) => (i.saldo_aberto_t || 0) > 0),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Soma das quantidades em aberto oficiais dos itens em carteira (t).',
  },
  VALOR_TOTAL_CARTEIRA_RS: {
    valorCard: (itens) =>
      itens.reduce((s, i) => s + (i.valor_saldo_brl || i.valor_saldo_rs || 0), 0),
    filtraLinhas: (itens) => itens.filter((i) => (i.valor_saldo_brl || i.valor_saldo_rs || 0) > 0),
    valorLinha: (item) => item.valor_saldo_brl || item.valor_saldo_rs || 0,
    formulaExplicada: 'Soma do valor financeiro do saldo em aberto dos itens em carteira (R$).',
  },
  PEDIDOS_COM_RESIDUAL: {
    valorCard: (itens) =>
      new Set(
        itens
          .filter(
            (i) =>
              i.eh_saldo_residual ||
              (i.percentual_residual || 0) <= 5 ||
              (i.saldo_aberto_t || 0) <= 2,
          )
          .map((i) => i.pedido_sap),
      ).size,
    filtraLinhas: (itens) =>
      itens.filter(
        (i) =>
          i.eh_saldo_residual || (i.percentual_residual || 0) <= 5 || (i.saldo_aberto_t || 0) <= 2,
      ),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Ordens de venda com itens residuais atendendo aos parâmetros configurados.',
  },
  PEDIDOS_COM_ATRASO: {
    valorCard: (itens) =>
      new Set(itens.filter((i) => i.tem_atraso || i.atrasado).map((i) => i.pedido_sap)).size,
    filtraLinhas: (itens) => itens.filter((i) => i.tem_atraso || i.atrasado),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Ordens de venda com data prometida anterior à data atual.',
  },
  PEDIDOS_COM_DEFICIT: {
    valorCard: (itens) =>
      new Set(
        itens.filter((i) => i.tem_deficit_estoque || i.deficit_estoque).map((i) => i.pedido_sap),
      ).size,
    filtraLinhas: (itens) => itens.filter((i) => i.tem_deficit_estoque || i.deficit_estoque),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Ordens de venda com itens sem cobertura de estoque na fábrica.',
  },
  PEDIDOS_COBERTURA_DISPONIVEL: {
    valorCard: (itens) =>
      new Set(
        itens
          .filter((i) => i.tem_cobertura_disponivel || i.cobertura_disponivel)
          .map((i) => i.pedido_sap),
      ).size,
    filtraLinhas: (itens) =>
      itens.filter((i) => i.tem_cobertura_disponivel || i.cobertura_disponivel),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada:
      'Ordens de venda cujos itens possuem estoque livre disponível para faturamento.',
  },
}

// Extratores canônicos dos 7 cards de Saldos Residuais
export const extratoresCardSaldosResiduais: Record<string, ExtratorCard<PedidoCarteiraItem>> = {
  RESIDUAL_PEDIDOS: {
    valorCard: (itens) => new Set(itens.map((i) => i.pedido_sap)).size,
    filtraLinhas: (itens) => itens,
    valorLinha: () => 1,
    formulaExplicada: 'Contagem de ordens de venda distintas contendo saldos residuais.',
  },
  RESIDUAL_ITENS: {
    valorCard: (itens) => itens.length,
    filtraLinhas: (itens) => itens,
    valorLinha: () => 1,
    formulaExplicada: 'Contagem de itens/posições de pedidos classificados como saldo residual.',
  },
  RESIDUAL_SALDO_TONS: {
    valorCard: (itens) => itens.reduce((s, i) => s + (i.saldo_aberto_t || 0), 0),
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Soma do volume físico em aberto (t) de todos os itens com saldo residual.',
  },
  RESIDUAL_VALOR_RS: {
    valorCard: (itens) =>
      itens.reduce((s, i) => s + (i.valor_saldo_brl || i.valor_saldo_rs || 0), 0),
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => item.valor_saldo_brl || item.valor_saldo_rs || 0,
    formulaExplicada: 'Montante financeiro remanescente dos itens com saldo residual (R$).',
  },
  RESIDUAL_CLIENTES: {
    valorCard: (itens) =>
      new Set(
        itens.map((i) => i.codigo_cliente || i.cliente_codigo || i.nome_cliente || i.cliente_nome),
      ).size,
    filtraLinhas: (itens) => itens,
    valorLinha: () => 1,
    formulaExplicada: 'Quantidade de clientes distintos que possuem pedidos residuais.',
  },
  RESIDUAL_VENCIDOS: {
    valorCard: (itens) => itens.filter((i) => i.tem_atraso || i.atrasado).length,
    filtraLinhas: (itens) => itens.filter((i) => i.tem_atraso || i.atrasado),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Itens residuais cuja data prevista de entrega no SAP já expirou.',
  },
  RESIDUAL_PERCENTUAL_CARTEIRA: {
    valorCard: (itens) => itens.reduce((s, i) => s + (i.saldo_aberto_t || 0), 0),
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada:
      'Distribuição do volume residual por material e cliente (% sobre total carteira).',
  },
}

const fmtT = (v: number) => `${formatNumberPTBR(v, 2)} t`
const fmtMoeda = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

function mapearLinhasDrill(
  itens: PedidoCarteiraAnalitico[],
  extrairValor: (it: PedidoCarteiraAnalitico) => number,
): LinhaDrillPedido[] {
  return itens.map((it) => ({
    id: it.id || `${it.pedido_sap}-${it.item_sap}`,
    pedido_sap: it.pedido_sap,
    item_sap: it.item_sap,
    codigo_cliente: it.codigo_cliente || it.cliente_codigo || '',
    nome_cliente: it.nome_cliente || it.cliente_nome || '',
    codigo_material: it.codigo_material || it.material_codigo || '',
    descricao_material: it.descricao_material || it.material_descricao || '',
    familia: it.familia || '',
    bitola: it.bitola || '',
    centro: it.centro || '',
    linha: it.linha || '',
    status: it.status || 'NOVO',
    data_pedido: it.data_pedido || '',
    data_prevista: it.data_prevista || it.data_prevista_entrega || '',
    dias_atraso: it.dias_atraso ?? it.dias_em_atraso ?? 0,
    saldo_aberto_t: it.saldo_aberto_t || 0,
    percentual_residual: it.percentual_residual ?? it.percentual_saldo ?? 0,
    valor_saldo_brl: it.valor_saldo_brl ?? it.valor_saldo_rs ?? 0,
    estoque_livre_t: it.estoque_livre_t ?? it.estoque_disponivel_t ?? 0,
    valor: extrairValor(it),
  }))
}

function obterColunasDrill(
  rotuloValor: string,
  eMonetario = false,
  eContagem = false,
): ColunaDrill<LinhaDrillPedido>[] {
  return [
    { key: 'pedido_sap', label: 'Pedido SAP', align: 'left' },
    { key: 'item_sap', label: 'Item', align: 'center' },
    { key: 'nome_cliente', label: 'Cliente', align: 'left' },
    { key: 'codigo_material', label: 'Material', align: 'left' },
    { key: 'linha', label: 'Linha', align: 'center' },
    { key: 'centro', label: 'Centro', align: 'center' },
    { key: 'status', label: 'Status', align: 'center' },
    {
      key: 'saldo_aberto_t',
      label: 'Saldo (t)',
      align: 'right',
      render: (l) => fmtT(l.saldo_aberto_t),
    },
    {
      key: 'valor_saldo_brl',
      label: 'Valor (R$)',
      align: 'right',
      render: (l) => fmtMoeda(l.valor_saldo_brl),
    },
    {
      key: 'valor',
      label: rotuloValor,
      align: 'right',
      render: (l) => {
        if (eMonetario) return fmtMoeda(l.valor)
        if (eContagem) return String(Math.round(l.valor))
        return fmtT(l.valor)
      },
    },
  ]
}

const colunasNivel3Pedido: ColunaDrill<Record<string, any>>[] = [
  { key: 'campo', label: 'Parâmetro Operacional', align: 'left' },
  { key: 'detalhe', label: 'Valor / Informação SAP', align: 'left' },
]

function buildNivel3Pedido(l: LinhaDrillPedido): Record<string, any>[] {
  return [
    { campo: 'Ordem / Posição SAP', detalhe: `${l.pedido_sap} / item ${l.item_sap}` },
    { campo: 'Cliente', detalhe: `${l.codigo_cliente} — ${l.nome_cliente}` },
    { campo: 'Material / Descrição', detalhe: `${l.codigo_material} — ${l.descricao_material}` },
    { campo: 'Família / Bitola', detalhe: `${l.familia} • ${l.bitola}` },
    { campo: 'Centro / Linha', detalhe: `Centro ${l.centro} | Linha ${l.linha}` },
    { campo: 'Status do Item', detalhe: l.status },
    { campo: 'Data do Pedido', detalhe: l.data_pedido || '—' },
    { campo: 'Data Prevista de Entrega', detalhe: l.data_prevista || '—' },
    {
      campo: 'Dias em Atraso',
      detalhe: l.dias_atraso > 0 ? `${l.dias_atraso} dias de atraso` : 'No prazo',
    },
    { campo: 'Saldo em Aberto', detalhe: fmtT(l.saldo_aberto_t) },
    { campo: 'Percentual Residual', detalhe: `${formatNumberPTBR(l.percentual_residual, 2)}%` },
    { campo: 'Valor Financeiro do Saldo', detalhe: fmtMoeda(l.valor_saldo_brl) },
    { campo: 'Estoque Livre de Produção', detalhe: fmtT(l.estoque_livre_t) },
  ]
}

/**
 * Constrói a configuração oficial do DrilldownCardModal para Pedidos em Carteira
 */
export function buildDrilldownPedidosCarteira(
  cardId: string,
  itens: PedidoCarteiraAnalitico[],
  kpis?: KpisPedidosCarteira | null,
): DrilldownCardConfig<LinhaDrillPedido> {
  // Mapeamento defensivo de ids de cards chamados pela view
  const normalizarId: Record<string, string> = {
    TOTAL_PEDIDOS: 'TOTAL_PEDIDOS',
    TOTAL_ITENS: 'TOTAL_ITENS',
    QUANTIDADE_CARTEIRA: 'QUANTIDADE_CARTEIRA_TONS',
    QUANTIDADE_CARTEIRA_TONS: 'QUANTIDADE_CARTEIRA_TONS',
    VALOR_TOTAL_CARTEIRA: 'VALOR_TOTAL_CARTEIRA_RS',
    VALOR_TOTAL_CARTEIRA_RS: 'VALOR_TOTAL_CARTEIRA_RS',
    SALDO_RESIDUAL: 'PEDIDOS_COM_RESIDUAL',
    PEDIDOS_COM_RESIDUAL: 'PEDIDOS_COM_RESIDUAL',
    PEDIDOS_ATRASO: 'PEDIDOS_COM_ATRASO',
    PEDIDOS_COM_ATRASO: 'PEDIDOS_COM_ATRASO',
    DEFICIT_ESTOQUE: 'PEDIDOS_COM_DEFICIT',
    PEDIDOS_COM_DEFICIT: 'PEDIDOS_COM_DEFICIT',
    COBERTURA_DISPONIVEL: 'PEDIDOS_COBERTURA_DISPONIVEL',
    PEDIDOS_COBERTURA_DISPONIVEL: 'PEDIDOS_COBERTURA_DISPONIVEL',
  }

  const idOficial = normalizarId[cardId] || cardId
  const cardConfig = CARDS_CONFIG_PEDIDOS_CARTEIRA.find((c) => c.id === idOficial) || {
    id: cardId,
    titulo: 'Detalhe de Pedidos',
    subtitulo: 'Ordens de venda ativas na carteira',
  }

  const extrator = extratoresCardPedidosCarteira[idOficial] || {
    valorCard: (l: PedidoCarteiraAnalitico[]) => l.length,
    filtraLinhas: (l: PedidoCarteiraAnalitico[]) => l,
    valorLinha: () => 1,
    formulaExplicada: 'Detalhamento analítico das linhas de carteira.',
  }

  const itensFiltrados = extrator.filtraLinhas(itens)
  const linhas = mapearLinhasDrill(itensFiltrados, extrator.valorLinha)

  const eMonetario = idOficial === 'VALOR_TOTAL_CARTEIRA_RS'
  const eToneladas = idOficial === 'QUANTIDADE_CARTEIRA_TONS'
  const eContagemItens = idOficial === 'TOTAL_ITENS'

  let valorNumerico = extrator.valorCard(itens)
  if (kpis) {
    if (idOficial === 'TOTAL_PEDIDOS' && kpis.totalPedidos !== undefined)
      valorNumerico = kpis.totalPedidos
    if (idOficial === 'TOTAL_ITENS' && kpis.totalItens !== undefined)
      valorNumerico = kpis.totalItens
    if (idOficial === 'QUANTIDADE_CARTEIRA_TONS' && kpis.quantidadeTotalCarteiraTons !== undefined)
      valorNumerico = kpis.quantidadeTotalCarteiraTons
    if (idOficial === 'VALOR_TOTAL_CARTEIRA_RS' && kpis.valorTotalCarteiraBrl !== undefined)
      valorNumerico = kpis.valorTotalCarteiraBrl
    if (idOficial === 'PEDIDOS_COM_RESIDUAL' && kpis.pedidosComSaldoResidual !== undefined)
      valorNumerico = kpis.pedidosComSaldoResidual
    if (idOficial === 'PEDIDOS_COM_ATRASO' && kpis.pedidosComAtraso !== undefined)
      valorNumerico = kpis.pedidosComAtraso
    if (idOficial === 'PEDIDOS_COM_DEFICIT' && kpis.pedidosComDeficitEstoque !== undefined)
      valorNumerico = kpis.pedidosComDeficitEstoque
    if (
      idOficial === 'PEDIDOS_COBERTURA_DISPONIVEL' &&
      kpis.pedidosComCoberturaDisponivel !== undefined
    )
      valorNumerico = kpis.pedidosComCoberturaDisponivel
  }

  let valorConsolidado = `${Math.round(valorNumerico).toLocaleString('pt-BR')} pedidos`
  if (eMonetario) valorConsolidado = fmtMoeda(valorNumerico)
  else if (eToneladas) valorConsolidado = fmtT(valorNumerico)
  else if (eContagemItens)
    valorConsolidado = `${Math.round(valorNumerico).toLocaleString('pt-BR')} itens`

  const composicao: ComposicaoCalculo[] = [
    {
      rotulo: extrator.formulaExplicada,
      valor: valorConsolidado,
      operador: '=',
      destaque: true,
    },
  ]

  return {
    tituloCard: cardConfig.titulo,
    nomeVisao: 'Pedidos em Carteira',
    valorConsolidado,
    composicao,
    fonteDados: 'SAP ECC RFC ZSD28C / carteira_items oficial',
    linhas,
    colunas: obterColunasDrill('Composição do Card', eMonetario, !eMonetario && !eToneladas),
    colunasNivel3: colunasNivel3Pedido,
    buildNivel3: buildNivel3Pedido,
    filtrosLocais: ['linha', 'centro', 'status', 'familia'],
    valorNumerico,
    extrairValorLinha: (l) => l.valor,
  }
}

/**
 * Constrói a configuração oficial do DrilldownCardModal para Pedidos com Saldos Residuais
 */
export function buildDrilldownSaldosResiduais(
  cardId: string,
  itensResiduais: PedidoCarteiraAnalitico[],
  kpis?: KpisPedidosSaldosResiduais | null,
): DrilldownCardConfig<LinhaDrillPedido> {
  const cardConfig = CARDS_CONFIG_SALDOS_RESIDUAIS.find((c) => c.id === cardId) || {
    id: cardId,
    titulo: 'Saldos Residuais',
    subtitulo: 'Ordens de venda com saldo residual',
  }

  const extrator = extratoresCardSaldosResiduais[cardId] || {
    valorCard: (l: PedidoCarteiraAnalitico[]) => l.length,
    filtraLinhas: (l: PedidoCarteiraAnalitico[]) => l,
    valorLinha: (it: PedidoCarteiraAnalitico) => it.saldo_aberto_t || 0,
    formulaExplicada: 'Detalhamento analítico de saldos residuais.',
  }

  const itensFiltrados = extrator.filtraLinhas(itensResiduais)
  const linhas = mapearLinhasDrill(itensFiltrados, extrator.valorLinha)

  const eMonetario = cardId === 'RESIDUAL_VALOR_RS'
  const eToneladas = cardId === 'RESIDUAL_SALDO_TONS'
  const ePercentual = cardId === 'RESIDUAL_PERCENTUAL_CARTEIRA'
  const eContagemItens = cardId === 'RESIDUAL_ITENS'
  const eContagemClientes = cardId === 'RESIDUAL_CLIENTES'

  let valorNumerico = extrator.valorCard(itensResiduais)
  if (kpis) {
    if (cardId === 'RESIDUAL_PEDIDOS' && kpis.totalPedidosComResidual !== undefined)
      valorNumerico = kpis.totalPedidosComResidual
    if (cardId === 'RESIDUAL_ITENS' && kpis.totalItensResiduais !== undefined)
      valorNumerico = kpis.totalItensResiduais
    if (cardId === 'RESIDUAL_SALDO_TONS' && kpis.saldoResidualTotalTons !== undefined)
      valorNumerico = kpis.saldoResidualTotalTons
    if (cardId === 'RESIDUAL_VALOR_RS' && kpis.valorFinanceiroResidualBrl !== undefined)
      valorNumerico = kpis.valorFinanceiroResidualBrl
    if (cardId === 'RESIDUAL_CLIENTES' && kpis.totalClientesComResiduais !== undefined)
      valorNumerico = kpis.totalClientesComResiduais
    if (cardId === 'RESIDUAL_VENCIDOS' && kpis.pedidosResiduaisVencidos !== undefined)
      valorNumerico = kpis.pedidosResiduaisVencidos
    if (
      cardId === 'RESIDUAL_PERCENTUAL_CARTEIRA' &&
      kpis.percentualCarteiraEmResidual !== undefined
    )
      valorNumerico = kpis.percentualCarteiraEmResidual
  }

  let valorConsolidado = `${Math.round(valorNumerico).toLocaleString('pt-BR')} pedidos`
  if (eMonetario) valorConsolidado = fmtMoeda(valorNumerico)
  else if (eToneladas) valorConsolidado = fmtT(valorNumerico)
  else if (ePercentual) valorConsolidado = `${formatNumberPTBR(valorNumerico, 2)}%`
  else if (eContagemItens)
    valorConsolidado = `${Math.round(valorNumerico).toLocaleString('pt-BR')} itens`
  else if (eContagemClientes)
    valorConsolidado = `${Math.round(valorNumerico).toLocaleString('pt-BR')} clientes`

  const composicao: ComposicaoCalculo[] = [
    {
      rotulo: extrator.formulaExplicada,
      valor: valorConsolidado,
      operador: '=',
      destaque: true,
    },
  ]

  return {
    tituloCard: cardConfig.titulo,
    nomeVisao: 'Pedidos com Saldos Residuais',
    valorConsolidado,
    composicao,
    fonteDados: 'SAP ECC RFC ZSD28C / pcp_residual_balance_parameters',
    linhas,
    colunas: obterColunasDrill(
      'Composição do Card',
      eMonetario,
      !eMonetario && !eToneladas && !ePercentual,
    ),
    colunasNivel3: colunasNivel3Pedido,
    buildNivel3: buildNivel3Pedido,
    filtrosLocais: ['linha', 'centro', 'status', 'familia'],
    valorNumerico,
    extrairValorLinha: (l) => l.valor,
  }
}

/**
 * Adaptadores de Drill-down para Pedidos em Carteira e Saldos Residuais
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 *
 * Reutiliza a infraestrutura canônica de DrilldownCardModal:
 * - Extratores de Card para Pedidos em Carteira (8 cards)
 * - Extratores de Card para Saldos Residuais (7 cards)
 */

import React from 'react'
import {
  ExtratorCard,
  TipoVisualizacaoDrilldown,
  UnidadeMetrica,
} from '@/lib/carteira-drill-engine'
import { PedidoCarteiraItem } from '@/types/pcp-pedidos-carteira'

export interface CardConfigDrill {
  id: string
  titulo: string
  subtitulo: string
  tipoVisualizacao: TipoVisualizacaoDrilldown
  unidade: UnidadeMetrica
}

// 8 Cards da Visão "Pedidos em Carteira"
export const CARDS_CONFIG_PEDIDOS_CARTEIRA: CardConfigDrill[] = [
  {
    id: 'TOTAL_PEDIDOS',
    titulo: 'Total de Pedidos',
    subtitulo: 'Ordens de venda ativas na carteira SAP ECC',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'TOTAL_ITENS',
    titulo: 'Total de Itens',
    subtitulo: 'Linhas ativas de pedidos na carteira',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'QUANTIDADE_CARTEIRA_TONS',
    titulo: 'Quantidade em Carteira (t)',
    subtitulo: 'Volume físico total em aberto na carteira',
    tipoVisualizacao: 'material',
    unidade: 'toneladas',
  },
  {
    id: 'VALOR_TOTAL_CARTEIRA_RS',
    titulo: 'Valor Total em Carteira (R$)',
    subtitulo: 'Montante financeiro total dos saldos em aberto',
    tipoVisualizacao: 'material',
    unidade: 'monetario',
  },
  {
    id: 'PEDIDOS_COM_RESIDUAL',
    titulo: 'Pedidos com Saldo Residual',
    subtitulo: 'Ordens de venda com itens residuais conforme parâmetros',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'PEDIDOS_COM_ATRASO',
    titulo: 'Pedidos com Atraso',
    subtitulo: 'Ordens de venda com data de entrega prometida vencida',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'PEDIDOS_COM_DEFICIT',
    titulo: 'Pedidos com Déficit de Estoque',
    subtitulo: 'Itens com necessidade de produção sem cobertura de estoque',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'PEDIDOS_COBERTURA_DISPONIVEL',
    titulo: 'Pedidos com Cobertura Disponível',
    subtitulo: 'Itens com estoque disponível para faturamento imediato',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
]

// 7 Cards da Visão "Pedidos com Saldos Residuais"
export const CARDS_CONFIG_SALDOS_RESIDUAIS: CardConfigDrill[] = [
  {
    id: 'RESIDUAL_PEDIDOS',
    titulo: 'Total de Pedidos com Saldo Residual',
    subtitulo: 'Ordens de venda que contêm saldo residual',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'RESIDUAL_ITENS',
    titulo: 'Qtd de Itens Residuais',
    subtitulo: 'Linhas de pedido identificadas como sobras/resíduos',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'RESIDUAL_SALDO_TONS',
    titulo: 'Saldo Residual Total (t)',
    subtitulo: 'Volume físico total dos saldos residuais em toneladas',
    tipoVisualizacao: 'material',
    unidade: 'toneladas',
  },
  {
    id: 'RESIDUAL_VALOR_RS',
    titulo: 'Valor Financeiro Residual (R$)',
    subtitulo: 'Montante financeiro dos itens com saldo residual',
    tipoVisualizacao: 'material',
    unidade: 'monetario',
  },
  {
    id: 'RESIDUAL_CLIENTES',
    titulo: 'Clientes com Pedidos Residuais',
    subtitulo: 'Clientes distintos impactados por ordens residuais',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'RESIDUAL_VENCIDOS',
    titulo: 'Pedidos Residuais Vencidos',
    subtitulo: 'Itens residuais com data de entrega expirada',
    tipoVisualizacao: 'material',
    unidade: 'quantidade',
  },
  {
    id: 'RESIDUAL_PERCENTUAL_CARTEIRA',
    titulo: '% da Carteira em Saldo Residual',
    subtitulo: 'Proporção do volume residual sobre a carteira total',
    tipoVisualizacao: 'material',
    unidade: 'percentual',
  },
]

// Extratores dos 8 cards de Pedidos em Carteira
export const extratoresCardPedidosCarteira: Record<string, ExtratorCard<PedidoCarteiraItem>> = {
  TOTAL_PEDIDOS: {
    valorCard: (itens) => new Set(itens.map((i) => i.pedido_sap)).size,
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => 1,
    formulaExplicada: 'Total de ordens de venda distintas ativas na carteira SAP ECC.',
  },
  TOTAL_ITENS: {
    valorCard: (itens) => itens.length,
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => 1,
    formulaExplicada: 'Total de linhas ativas de pedidos na carteira SAP.',
  },
  QUANTIDADE_CARTEIRA_TONS: {
    valorCard: (itens) => itens.reduce((s, i) => s + (i.saldo_aberto_t || 0), 0),
    filtraLinhas: (itens) => itens.filter((i) => (i.saldo_aberto_t || 0) > 0),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Soma das quantidades em aberto oficiais dos itens em carteira (t).',
  },
  VALOR_TOTAL_CARTEIRA_RS: {
    valorCard: (itens) => itens.reduce((s, i) => s + (i.valor_saldo_rs || 0), 0),
    filtraLinhas: (itens) => itens.filter((i) => (i.valor_saldo_rs || 0) > 0),
    valorLinha: (item) => item.valor_saldo_rs || 0,
    formulaExplicada: 'Soma do valor financeiro do saldo em aberto dos itens (t × R$/t).',
  },
  PEDIDOS_COM_RESIDUAL: {
    valorCard: (itens) =>
      new Set(
        itens
          .filter((i) => (i.percentual_residual || 0) <= 5 || (i.saldo_aberto_t || 0) <= 2)
          .map((i) => i.pedido_sap),
      ).size,
    filtraLinhas: (itens) =>
      itens.filter((i) => (i.percentual_residual || 0) <= 5 || (i.saldo_aberto_t || 0) <= 2),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Ordens de venda com itens residuais atendendo aos parâmetros configurados.',
  },
  PEDIDOS_COM_ATRASO: {
    valorCard: (itens) => new Set(itens.filter((i) => i.atrasado).map((i) => i.pedido_sap)).size,
    filtraLinhas: (itens) => itens.filter((i) => i.atrasado),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Ordens de venda com data prometida anterior à data atual.',
  },
  PEDIDOS_COM_DEFICIT: {
    valorCard: (itens) =>
      new Set(itens.filter((i) => i.deficit_estoque).map((i) => i.pedido_sap)).size,
    filtraLinhas: (itens) => itens.filter((i) => i.deficit_estoque),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Ordens de venda com itens sem cobertura de estoque na fábrica.',
  },
  PEDIDOS_COBERTURA_DISPONIVEL: {
    valorCard: (itens) =>
      new Set(itens.filter((i) => i.cobertura_disponivel).map((i) => i.pedido_sap)).size,
    filtraLinhas: (itens) => itens.filter((i) => i.cobertura_disponivel),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada:
      'Ordens de venda cujos itens possuem estoque livre disponível para faturamento.',
  },
}

// Extratores dos 7 cards de Saldos Residuais
export function buildDrilldownPedidosCarteira(cardId: string, itens: any[], kpis: any): any {
  return {
    tituloCard: cardId,
    nomeVisao: 'Pedidos em Carteira',
    valorConsolidado: '0',
    composicao: [],
    fonteDados: 'SAP ECC RFC ZSD28C',
    linhas: itens,
    colunas: [],
  }
}

export const extratoresCardSaldosResiduais: Record<string, ExtratorCard<PedidoCarteiraItem>> = {
  RESIDUAL_PEDIDOS: {
    valorCard: (itens) => new Set(itens.map((i) => i.pedido_sap)).size,
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => 1,
    formulaExplicada: 'Contagem de ordens de venda distintas contendo saldos residuais.',
  },
  RESIDUAL_ITENS: {
    valorCard: (itens) => itens.length,
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => 1,
    formulaExplicada: 'Contagem de itens/posições de pedidos classificados como saldo residual.',
  },
  RESIDUAL_SALDO_TONS: {
    valorCard: (itens) => itens.reduce((s, i) => s + (i.saldo_aberto_t || 0), 0),
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Soma do volume físico em aberto (t) de todos os itens com saldo residual.',
  },
  RESIDUAL_VALOR_RS: {
    valorCard: (itens) => itens.reduce((s, i) => s + (i.valor_saldo_rs || 0), 0),
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => item.valor_saldo_rs || 0,
    formulaExplicada: 'Montante financeiro remanescente dos itens com saldo residual (R$).',
  },
  RESIDUAL_CLIENTES: {
    valorCard: (itens) => new Set(itens.map((i) => i.cliente_codigo || i.cliente_nome)).size,
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => 1,
    formulaExplicada: 'Quantidade de clientes distintos que possuem pedidos residuais.',
  },
  RESIDUAL_VENCIDOS: {
    valorCard: (itens) => itens.filter((i) => i.atrasado).length,
    filtraLinhas: (itens) => itens.filter((i) => i.atrasado),
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Itens residuais cuja data prevista de entrega no SAP já expirou.',
  },
  RESIDUAL_PERCENTUAL_CARTEIRA: {
    valorCard: (itens) => {
      const soma = itens.reduce((s, i) => s + (i.saldo_aberto_t || 0), 0)
      return soma > 0 ? soma : 0
    },
    filtraLinhas: (itens) => itens,
    valorLinha: (item) => item.saldo_aberto_t || 0,
    formulaExplicada: 'Distribuição percentual do volume residual por material e cliente.',
  },
}

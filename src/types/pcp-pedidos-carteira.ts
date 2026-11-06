/**
 * Tipagens oficiais para Pedidos em Carteira e Saldos Residuais
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 */

export type OperadorComparacao = 'MENOR' | 'MENOR_IGUAL' | 'MAIOR' | 'MAIOR_IGUAL' | 'ENTRE'

export type RelacaoLogica = 'E' | 'OU'

export interface ParametrosSaldoResidual {
  id?: string
  operador_saldo: OperadorComparacao
  valor_saldo_t: number
  valor_saldo_max_t?: number
  operador_percentual: OperadorComparacao
  valor_percentual: number
  valor_percentual_max?: number
  relacao_logica: RelacaoLogica
  ativo?: boolean
  responsavel_nome?: string
  responsavel_email?: string
  justificativa?: string
  created?: string
  updated?: string
}

export const PARAMETROS_SALDO_RESIDUAL_PADRAO: ParametrosSaldoResidual = {
  operador_saldo: 'MENOR_IGUAL',
  valor_saldo_t: 2.0,
  operador_percentual: 'MENOR_IGUAL',
  valor_percentual: 5.0,
  relacao_logica: 'OU',
  ativo: true,
}

export type StatusItemCarteira =
  | 'NOVO'
  | 'EM_PRODUCAO'
  | 'PROGRAMADO'
  | 'ATENDIDO_PARCIAL'
  | 'BLOQUEADO'
  | 'ATRASADO'
  | 'CONCLUIDO'

export interface EntregaItemHistorico {
  numero_remessa?: string
  data_remessa: string
  quantidade_t: number
  nota_fiscal?: string
}

export interface PedidoCarteiraAnalitico {
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
  qtd_original_t: number
  qtd_entregue_t: number
  saldo_aberto_t: number
  percentual_residual: number
  data_pedido: string
  data_prevista: string
  valor_saldo_brl: number
  preco_unitario_brl?: number
  valor_original_brl?: number
  status: StatusItemCarteira
  dias_atraso: number
  tem_atraso: boolean
  tem_deficit_estoque: boolean
  tem_cobertura_disponivel: boolean
  eh_saldo_residual: boolean
  estoque_livre_t: number
  estoque_disponivel_t: number
  status_crm?: string
  protocolo_crm?: string
  historico_entregas?: EntregaItemHistorico[]
}

export interface KpisPedidosCarteira {
  totalPedidos: number
  totalItens: number
  quantidadeTotalCarteiraTons: number
  valorTotalCarteiraBrl: number
  pedidosComSaldoResidual: number
  pedidosComAtraso: number
  pedidosComDeficitEstoque: number
  pedidosComCoberturaDisponivel: number
}

export interface KpisPedidosSaldosResiduais {
  totalPedidosComResidual: number
  totalItensResiduais: number
  saldoResidualTotalTons: number
  valorFinanceiroResidualBrl: number
  totalClientesComResiduais: number
  pedidosResiduaisVencidos: number
  percentualCarteiraEmResidual: number
}

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
  cliente_codigo?: string
  cliente_nome?: string
  codigo_material: string
  descricao_material: string
  familia: string
  bitola: string
  centro: string
  linha: string
  empresa?: string
  material_codigo?: string
  material_descricao?: string
  qtd_original_t: number
  quantidade_original_t?: number
  percentual_saldo?: number
  status_analise_crm?: StatusAnaliseCrm
  qtd_entregue_t: number
  saldo_aberto_t: number
  percentual_residual: number
  data_pedido: string
  data_prevista: string
  data_desejada?: string
  valor_saldo_brl: number
  valor_saldo_rs?: number
  preco_unitario_brl?: number
  valor_original_brl?: number
  status: StatusItemCarteira
  dias_atraso: number
  tem_atraso: boolean
  atrasado?: boolean
  tem_deficit_estoque: boolean
  deficit_estoque?: boolean
  tem_cobertura_disponivel: boolean
  cobertura_disponivel?: boolean
  eh_saldo_residual: boolean
  estoque_livre_t: number
  estoque_disponivel_t: number
  status_crm?: string
  protocolo_crm?: string
  historico_entregas?: EntregaItemHistorico[]
}

/** Alias para compatibilidade com testes e componentes */
export type PedidoCarteiraItem = PedidoCarteiraAnalitico

export type StatusAnaliseCrm =
  | 'PENDENTE'
  | 'EM_ANALISE'
  | 'MANTER_PEDIDO'
  | 'SOLICITAR_AJUSTE'
  | 'SOLICITAR_CANCELAMENTO'
  | 'CONCLUIDO'

export interface CrmRevisionPendency {
  id: string
  protocol: string
  sales_order_number: string
  sales_order_item: string
  client_code: string
  client_name: string
  material_code: string
  material_description: string
  tonnage: number
  financial_value: number
  status: StatusAnaliseCrm
  observation?: string
  requested_by_name: string
  requested_at: string
  assigned_team?: string
  assigned_to?: string
  history?: Array<{
    status: StatusAnaliseCrm
    updated_at: string
    updated_by: string
    note: string
  }>
}

export interface AnaliseIaResidual {
  total_itens: number
  saldo_total_t: number
  valor_total_rs: number
  pedidos_vencidos: number
  impacto_planejamento: string
  clientes_concentracao: Array<{
    cliente: string
    itens: number
    saldo_t: number
    valor_rs: number
  }>
  materiais_recorrentes: Array<{
    material: string
    descricao: string
    ocorrencias: number
    saldo_t: number
  }>
  recomendacoes_comerciais: string[]
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

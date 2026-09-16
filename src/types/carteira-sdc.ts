/**
 * Tipos Oficiais para Carteira SDC (Sidercentro / Centro WERKS = SDPL)
 * Módulo PCP Robotizado - CIAFAL
 */

export type StatusCarteiraSDC =
  | 'COBERTO'
  | 'DÉFICIT'
  | 'EM PRODUÇÃO'
  | 'COBERTURA PROGRAMADA'
  | 'COBERTURA PARCIAL'
  | 'SEM CARTEIRA'
  | 'SEM ESTOQUE'
  | 'CRÍTICO'

export type SituacaoProducaoSDC =
  | 'Em produção CIAFAL'
  | 'Programado CIAFAL'
  | 'Em industrialização SDC'
  | 'Programado SDC'
  | 'Sem programação'
  | 'Produção concluída'

export type OrigemProducaoSDC = 'CIAFAL' | 'Sidercentro' | 'Outra'

export interface CarteiraSDCItem {
  id?: string
  material: string // Código SAP (ex: C1000A360600)
  descricao: string
  familia?: string
  bitola?: string
  qualidade_aco?: string
  curva_abc?: string // A, B, C quando existir
  carteira_t: number // Carteira (t)
  estoque_total_t: number // Estoque Total (t) no centro SDPL
  estoque_disponivel_t?: number
  estoque_qualidade_t?: number
  estoque_bloqueado_t?: number
  saldo_t: number // Saldo (t) = Estoque Total - Carteira
  programado_t: number // Programado (t)
  em_producao_t: number // Em Produção (t)
  saldo_projetado_t: number // Saldo Projetado (t) = Estoque Total + Programado + Em Produção - Carteira
  cobertura_pct: number // (Estoque Total / Carteira) * 100 ou 100 se carteira 0
  status: StatusCarteiraSDC
  situacao_producao: SituacaoProducaoSDC
  origem_producao: OrigemProducaoSDC
  data_prevista?: string // Data Prevista de retorno/produção
  data_desejada?: string // Data desejada da carteira/pedido
  alerta?: string
  alertas_lista?: string[]
  centro_sap: 'SDPL' // Centro obrigatório
  empresa: string // Sidercentro / CIAFAL
  pedidos_compoem?: Array<{
    ordem_venda: string
    item_ordem: string
    cliente: string
    quantidade_t: number
    data_desejada: string
  }>
  programacao_detalhe?: {
    quantidade_t: number
    centro_produtivo: string
    linha: string
    data_prevista: string
    status: string
  }
  industrializacao_sdc?: {
    destinada_t: number
    em_processo_t: number
    concluida_t: number
    previsao_retorno?: string
  }
}

export interface CarteiraSDCKpis {
  carteira_total_t: number
  estoque_total_t: number
  deficit_atual_t: number // Soma dos saldos negativos em valor absoluto
  itens_com_deficit_count: number
  em_producao_total_t: number
  itens_cobertura_programada_count: number
  itens_criticos_count: number
  total_itens: number
}

export interface CarteiraSDCImportRow {
  material: string
  descricao: string
  curva_abc?: string
  carteira_t: number
  estoque_total_t: number
  familia?: string
  bitola?: string
  qualidade_aco?: string
  programado_t?: number
  em_producao_t?: number
  origem_producao?: OrigemProducaoSDC
  data_prevista?: string
  data_desejada?: string
  estoque_bloqueado_t?: number
  centro_sap?: string
}

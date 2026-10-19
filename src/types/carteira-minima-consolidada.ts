import { CarteiraMinimaItem } from './carteira-minima'

export type CarteiraVisaoModo = 'MATERIAL' | 'BITOLA' | 'FAMILIA'

export interface MaterialConsolidadoItem {
  id: string
  material: string
  descricao_material: string
  familia: string
  bitola: string
  tipo_aco: string
  pedido_venda: string
  item_pedido: string
  pedido_formatado: string
  cliente?: string
  carteira_tons: number
  estoque_livre_tons: number
  saldo_produzir_tons: number
  producao_minima_tons: number | null
  producao_minima_status: 'RECEBIDO' | 'NAO_RECEBIDO'
  diferenca_minimo_tons: number | null
  centro: string
  linha: string
  empresa: string
  data_desejada: string
  criticidade: 'ALTA' | 'MEDIA' | 'BAIXA'
}

export interface CarteiraConsolidadaRow {
  id: string
  tipo: 'BITOLA' | 'FAMILIA'
  chave: string // Nome da bitola ou família
  linha_centro: string // Ex: "L1 / 1100" ou "1100"
  centro: string
  linha: string
  empresa: string
  materiais_count: number
  materiais_codigos: string[]
  pedidos_count: number
  pedidos_numeros: string[]
  carteira_total_tons: number
  estoque_livre_total_tons: number
  saldo_total_produzir_tons: number
  producao_minima_tipo: 'VALOR' | 'INDIVIDUAL_NECESSARIA' | 'NAO_RECEBIDO'
  producao_minima_tons: number | null
  diferenca_tons: number | null
  situacao:
    | 'Atendida'
    | 'Não atingida'
    | 'Análise individual necessária'
    | 'Lote mínimo não recebido'
  materiais: MaterialConsolidadoItem[]
}

export interface CarteiraConsolidadaAiReport {
  timestamp: string
  visao: 'BITOLA' | 'FAMILIA'
  totalAgrupamentosAbaixoMinimo: number
  totalOportunidadesConsolidacao: number
  totalMateriaisComEstoque: number
  restricoesIdentificadas: string[]
  riscosNaoAtendimento: string[]
  recomendacoesPcp: string[]
  resumoExecutivo: string
  detalhesAgrupamentos: Array<{
    chave: string
    linhaCentro: string
    saldoProduzir: number
    producaoMinima: string
    situacao: string
    materiaisCount: number
    pedidosCount: number
    recomendacaoEspecifica: string
  }>
}

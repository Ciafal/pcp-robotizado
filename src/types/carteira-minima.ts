/**
 * Types para o subtópico "Carteira mínima não atingida"
 * Módulo: PCP Robotizado > Análise de Carteira
 * HUB CIAFAL
 */

export type CriticidadeCarteiraMinima = 'Crítico' | 'Atenção' | 'Monitoramento' | 'Normal'

export interface CarteiraMinimaItem {
  id: string
  /** Material (código SAP) */
  material: string
  /** Texto breve / Descrição do material */
  descricao_material: string
  /** Carteira total do item/pedido (t) */
  carteira_tons: number
  /** Estoque livre disponível no SAP (t) */
  estoque_livre_tons: number
  /** Saldo a produzir = Carteira - Estoque livre (t) */
  saldo_produzir_tons: number
  /** Quantidade mínima de produção / laminação (t) */
  producao_minima_tons: number
  /** Diferença para atingir o lote mínimo = Produção mínima - Saldo a produzir (t) */
  diferenca_minimo_tons: number
  /** Pedido de venda SAP */
  pedido_venda: string
  /** Item do pedido de venda SAP */
  item_pedido: string
  /** Pedido formatado para exibição "251967 / 10" */
  pedido_formatado: string
  /** Data desejada pelo cliente (ISO ou YYYY-MM-DD) */
  data_desejada: string
  /** Tempo médio de ciclo do material/produto (minutos ou horas) */
  tempo_ciclo_minutos?: number
  /** Descrição legível do tempo de ciclo (ex: "45 min", "2.5 h") */
  tempo_ciclo_formatado?: string
  /** Centro produtivo SAP (ex: "1100", "SDPL") */
  centro: string
  /** Linha de produção (ex: "L1", "L2", "LAM-01") */
  linha?: string
  /** Empresa (ex: "CIAFAL", "SIDERCENTRO") */
  empresa?: string
  /** Classificação quantitativa de criticidade */
  criticidade: CriticidadeCarteiraMinima
  /** Motivo quantitativo da criticidade */
  motivo_criticidade?: string
  /** Análise / Observação gerada pela IA (sempre objetiva, baseada em fatos reais) */
  observacao_ia?: string
  /** Diagnóstico aprofundado gerado pela IA para o modal de detalhamento */
  analise_detalhada_ia?: string
  /** Recomendações operacionais geradas pela IA */
  recomendacoes_ia?: string[]
  cliente_nome?: string
  percentual_atingido?: number
}

export interface CarteiraMinimaFilterParams {
  empresa?: string
  centro?: string
  linha?: string
  material?: string
  pedido?: string
  busca?: string
  periodoInicio?: string
  periodoFim?: string
  dataDesejadaInicio?: string
  dataDesejadaFim?: string
  criticidade?: CriticidadeCarteiraMinima | 'TODAS'
}

export interface CarteiraMinimaTotalizadores {
  /** Itens abaixo da carteira mínima */
  total_itens_abaixo_minimo: number
  /** Carteira total (t) */
  carteira_total_tons: number
  /** Estoque livre total (t) */
  estoque_livre_total_tons: number
  /** Saldo total a produzir (t) */
  saldo_total_produzir_tons: number
  /** Quantidade de pedidos afetados */
  pedidos_afetados_count: number
  totalItensAbaixoMinimo?: number
  totalItensCriticos?: number
  totalItensAtencao?: number
  totalItensNormais?: number
  totalSaldoProduzirTons?: number
  totalDiferencaTons?: number
}

export type CarteiraMinimaKpis = CarteiraMinimaTotalizadores
export type CarteiraMinimaFiltros = CarteiraMinimaFilterParams
export interface SapCarteiraMinimaSyncResult {
  success: boolean
  itens: CarteiraMinimaItem[]
  totalizadores: CarteiraMinimaTotalizadores
  ultimaAtualizacaoSap: string | null
  isFallback: boolean
  fcaConfigured: boolean
  statusMessage: string
  errorMessage?: string
}

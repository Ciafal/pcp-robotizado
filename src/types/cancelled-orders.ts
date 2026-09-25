/**
 * Tipos Oficiais para Gestão de Pedidos Cancelados no PCP Robotizado - HUB CIAFAL
 * Padrão ABNT / CIAFAL
 */

export type CancellationCategory =
  | 'PCP/Planejamento'
  | 'Comercial'
  | 'Cliente'
  | 'Crédito/Financeiro'
  | 'Logística'
  | 'Qualidade/Indústria'
  | 'Cadastro/Processo'
  | 'Externo'

export type ProbableResponsibility =
  | 'PCP'
  | 'Comercial'
  | 'Cliente'
  | 'Crédito/Financeiro'
  | 'Logística'
  | 'Qualidade'
  | 'Indústria'
  | 'Suprimentos'
  | 'Cadastro'
  | 'Sistema'
  | 'Externo'
  | 'Indefinido'

export type ConfidenceLevel = 'Alta' | 'Média' | 'Baixa' | 'Dados insuficientes'

export type AvoidableClassification =
  | 'Potencialmente evitável'
  | 'Provavelmente não evitável'
  | 'Necessita investigação'

export type AnalysisStatus = 'Pendente' | 'Em Análise' | 'Validado' | 'Discordado' | 'Ação Criada'

export type PriorityLevel = 'Crítica' | 'Alta' | 'Média' | 'Baixa'

export interface HistoricalContextData {
  estoqueDisponivelDataPedido?: number | null
  estoqueDataDesejada?: number | null
  producaoRealizadaMesmoDia?: number | null
  ultimaProducaoMaterialData?: string | null
  quantidadeUltimaProducao?: number | null
  coberturaEstoqueUltimaCampanhaDias?: number | null
  carteiraExistenteUltimaProgramacao?: number | null
  novasEntradasCarteiraAposProgramacao?: number | null
  consumoMaterialUltimos30Dias?: number | null
  estoqueMateriaisSimilares?: number | null
  materiaPrimaDisponivel?: number | null
  proximaCampanhaData?: string | null
  programacaoSemanalVigenteStatus?: string | null
  historicoCancelamentosMesmoMaterialCount?: number
  historicoCancelamentosMesmoClienteCount?: number
  historicoPeriodosComCancelamento?: string[]
}

export interface AIAnalysisResult {
  hasInconsistency: boolean
  verificationStatus:
    | 'Inconsistência encontrada'
    | 'Coerente com dados disponíveis'
    | 'Dados insuficientes para confirmar a causa'
  probableCause: string
  suggestedResponsibility: ProbableResponsibility
  confidenceLevel: ConfidenceLevel
  avoidableStatus: AvoidableClassification
  priority: PriorityLevel
  actionSuggested: string
  evidences: string[]
  hypotheses: string[]
  missingData: string[]
  consultedData: string[]
  consultedPeriod: string
  limitations: string[]
  recurringPatternDetected?: boolean
  recurringReason?: string
}

export interface CancelledOrderRecord {
  id: string
  empresa: string
  centro: string
  linha: string
  ordem_venda: string
  item_ordem: string
  data_ordem: string
  cliente_codigo: string
  cliente_nome: string
  representante_vendedor: string
  material_codigo: string
  material_descricao: string
  familia: string
  curva_abc: 'A' | 'B' | 'C'
  tipo_carteira: string
  quantidade_original_ov_t: number
  quantidade_faturada_t: number
  saldo_cancelado_t: number
  unidade_medida: string
  estoque_disponivel_data_t: number | null
  preco_liquido: number
  valor_cancelado_brl: number
  condicao_pagamento: string
  prazo: string
  status_faturamento: string
  data_desejada_cliente: string
  data_prevista_producao: string
  data_efetiva_producao?: string
  status_recusa: string
  motivo_original_sap: string
  categoria_motivo: CancellationCategory
  observacao: string
  data_hora_cancelamento: string
  usuario_operacao: string
  is_demo: boolean

  // Análise da IA
  has_ai_inconsistency: boolean
  ai_verification_status: string
  ai_probable_cause: string
  ai_suggested_responsibility: ProbableResponsibility
  ai_confidence_level: ConfidenceLevel
  ai_avoidable_status: AvoidableClassification
  ai_priority: PriorityLevel
  ai_action_suggested: string
  ai_analysis_payload?: AIAnalysisResult

  // Governança humana
  analysis_status: AnalysisStatus
  validated_cause?: string
  validated_responsibility?: ProbableResponsibility
  validated_by_user_name?: string
  validated_at?: string
  human_notes?: string
  action_plan_id?: string

  // Dados de contexto para IA (quando integrados com SAP/PCP)
  context_data?: HistoricalContextData
}

export interface CancellationReasonCatalogItem {
  id?: string
  category: CancellationCategory
  reason: string
  default_probable_responsibility: ProbableResponsibility
  active: boolean
  sort_order: number
}

export interface ActionPlan5W2H {
  id: string
  code: string
  order_id: string
  ordem_venda: string
  item_ordem: string
  cliente_nome: string
  material_codigo: string
  motivo_original: string
  causa_provavel: string
  evidencias: string
  centro_linha: string
  impacto_toneladas: number
  impacto_financeiro_brl: number
  what_acao: string
  why_motivo: string
  who_responsavel: string
  when_prazo: string
  where_local: string
  how_como: string
  how_much_custo: string
  status: 'Aberto' | 'Em Andamento' | 'Concluído' | 'Cancelado'
  created_by_name: string
  created_at: string
}

export interface CancelledOrdersFilterState {
  periodoInicio: string
  periodoFim: string
  mes: string
  ano: string
  empresa: string
  linha: string
  centro: string
  cliente: string
  representante: string
  material: string
  familia: string
  tipoCarteira: string
  motivoCancelamento: string
  categoriaMotivo: string
  responsabilidadeProvavel: string
  statusAnalise: string
  comInconsistenciaIA: string // 'todos' | 'sim' | 'nao'
  recorrencia: string // 'todos' | 'recorrente' | 'nao_recorrente'
  evitabilidade: string // 'todos' | 'evitavel' | 'nao_evitavel' | 'investigacao'
  curvaAbc: string // 'todos' | 'A' | 'B' | 'C'
  buscaGeral: string
}

export interface CancellationExecutiveKPIs {
  totalPedidosQtd: number
  totalVolumeToneladas: number
  totalValorBrl: number
  percentualCarteiraCancelada: number
  pcpQtd: number
  pcpToneladas: number
  comercialQtd: number
  comercialToneladas: number
  principalMotivoNome: string
  principalMotivoToneladas: number
  reincidentesQtd: number
  inconsistenciasIAQtd: number
  potencialmenteEvitaveisQtd: number
  potencialmenteEvitaveisToneladas: number
}

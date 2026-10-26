/**
 * Tipagens Oficiais do Módulo de Saldos Residuais do PCP Robotizado (HUB CIAFAL)
 */

export type ResidualBalanceRuleType =
  | 'MENOR_OU_IGUAL'
  | 'MENOR_QUE'
  | 'MAIOR_OU_IGUAL'
  | 'MAIOR_QUE'
  | 'FAIXA_QUANTIDADE'

export type ResidualBalanceCriticality = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export type ResidualBalanceStatus =
  | 'DENTRO_PARAMETRO'
  | 'SALDO_RESIDUAL_IDENTIFICADO'
  | 'ACAO_NECESSARIA'
  | 'EM_TRATAMENTO'
  | 'REGULARIZADO'
  | 'REGULARIZADO_AUTOMATICO'

export interface ResidualBalanceParameter {
  id: string
  deposito: string
  deposito_nome?: string
  descricao: string
  tipo_regra: ResidualBalanceRuleType
  quantidade?: number
  quantidade_min?: number
  quantidade_max?: number
  unidade_medida: string
  acao_recomendada: string
  acao_detalhe?: string
  responsavel_acao?: string
  prazo_valor?: number
  prazo_unidade?: 'HORAS' | 'DIAS'
  criticidade: ResidualBalanceCriticality
  ativo: boolean
  excluido_logico: boolean
  criado_por_id?: string
  criado_por_nome?: string
  atualizado_por_id?: string
  atualizado_por_nome?: string
  created?: string
  updated?: string
}

export interface RuleMatchInfo {
  regra_id: string
  descricao: string
  criticidade: ResidualBalanceCriticality
  limite_parametrizado: number
  diferenca: number
  acao_recomendada: string
  responsavel_acao?: string
  prazo_display?: string
  regra_especificidade: number // para desempate
}

export interface RawStockItem {
  deposito: string
  deposito_nome?: string
  material_codigo: string
  material_descricao: string
  lote: string
  quantidade_atual: number
  unidade_medida: string
  data_movimento?: string
  origem_dados?: 'SAP_RFC' | 'DATABASE_SNAPSHOT' | 'PROVISIONAL_CADASTRO'
}

export interface ResidualBalanceItem {
  id?: string
  deposito: string
  deposito_nome?: string
  material_codigo: string
  material_descricao: string
  lote: string
  quantidade_atual: number
  unidade_medida: string
  limite_parametrizado?: number
  diferenca?: number
  data_identificacao: string
  status: ResidualBalanceStatus
  regra_aplicada_id?: string
  regra_aplicada_descricao?: string
  regras_atingidas?: RuleMatchInfo[]
  acao_recomendada?: string
  responsavel_acao?: string
  criticidade?: ResidualBalanceCriticality
  prazo_display?: string
  tempo_como_residual_display?: string
  ultima_atualizacao?: string
  ultima_atualizacao_origem?: string
  quantidade_anterior?: number
}

export interface ResidualBalanceActionRecord {
  id: string
  saldo_id?: string
  deposito: string
  material_codigo: string
  material_descricao?: string
  lote: string
  quantidade_residual: number
  unidade_medida: string
  regra_aplicada?: string
  acao_prevista?: string
  acao_realizada: string
  responsavel: string
  data_acao: string
  status_anterior?: string
  status_novo: ResidualBalanceStatus
  observacao?: string
  usuario_id?: string
  usuario_nome?: string
  usuario_email?: string
  created?: string
}

export interface DepositResidualSummary {
  deposito: string
  deposito_nome?: string
  total_materiais: number
  total_lotes: number
  volume_residual: number
  unidade_medida: string
  acoes_necessarias: number
  em_tratamento: number
  regularizados: number
  ultima_atualizacao: string
  status_deposito: 'VERDE' | 'AMARELO' | 'VERMELHO'
}

export interface ResidualBalancesExecutiveCards {
  depositos_com_residual: number
  materiais_com_residual: number
  lotes_com_residual: number
  volume_total_residual: number
  unidade_medida_predominante: string
  acoes_necessarias: number
  em_tratamento: number
}

export interface MassRegularizeItemResult {
  id?: string
  material_codigo: string
  lote: string
  deposito: string
  resultado: 'Sucesso' | 'Não processado'
  motivo: string
  success: boolean
}

export interface MassRegularizeResponse {
  success: boolean
  batch_id: string
  summary: {
    total_processados: number
    regularizados: number
    nao_processados: number
  }
  results: MassRegularizeItemResult[]
  timestamp: string
  message?: string
}

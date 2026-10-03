export type OutOfStandardCompatibility =
  | 'COMPATIBLE'
  | 'COMPATIBLE_WITH_RESERVATION'
  | 'INCOMPATIBLE'
  | 'AWAITING_EVALUATION'

export type OutOfStandardSituation = 'EM_ANALISE' | 'APROVADA' | 'REPROVADA' | 'CANCELADA'

export interface ParameterComparisonResult {
  parametro: string
  peca_atual: string
  nova_aplicacao: string
  limite_min?: number
  limite_max?: number
  valor_atual?: number
  unidade: string
  resultado: 'CONFORME' | 'DIVERGENTE' | 'NAO_PARAMETRIZADO'
  observacao?: string
}

export interface MPOutOfStandardEvaluationRecord {
  id: string
  numero_sequencial: string // AMP-000001/2026 gerado atomicamente no backend
  centro: string
  material_codigo: string
  material_descricao: string
  item_identificacao: string
  lote: string
  corrida?: string
  fornecedor: string
  aplicacao_atual: string
  deposito?: string
  peso_kg: number
  espessura_mm: number
  largura_mm: number
  comprimento_mm: number
  bloco_b_motivo: string
  bloco_b_nova_aplicacao: string
  bloco_b_permite_fora_padrao: boolean
  nova_espessura_min_mm?: number
  nova_espessura_max_mm?: number
  nova_largura_min_mm?: number
  nova_largura_max_mm?: number
  nova_comprimento_min_mm?: number
  nova_comprimento_max_mm?: number
  nova_peso_min_kg?: number
  nova_peso_max_kg?: number
  comparativo_json: ParameterComparisonResult[]
  compatibilidade: OutOfStandardCompatibility
  regra_tecnica_status: 'PARAMETRIZADA' | 'NAO_PARAMETRIZADA'
  regra_tecnica_detalhes?: string
  situacao: OutOfStandardSituation
  avaliador_id: string
  avaliador_nome: string
  avaliador_matricula?: string
  data_avaliacao: string
  decidido_por_id?: string
  decidido_por_nome?: string
  data_decisao?: string
  decisao_observacao?: string
  cancelado: boolean
  cancelado_por_id?: string
  cancelado_por_nome?: string
  data_cancelamento?: string
  motivo_cancelamento?: string
  ia_analise_json?: Record<string, unknown>
  ia_recomendacao?: string
  ia_score?: number
  origem_dados_mp: 'CADASTROS_PCP' | 'SAP_RFC_PENDENTE'
  created?: string
  updated?: string
}

export interface CreateEvaluationPayload {
  centro: string
  material_codigo: string
  material_descricao?: string
  item_identificacao: string
  lote?: string
  corrida?: string
  fornecedor?: string
  aplicacao_atual: string
  deposito?: string
  peso_kg: number
  espessura_mm: number
  largura_mm: number
  comprimento_mm: number
  bloco_b_motivo: string
  bloco_b_nova_aplicacao: string
  bloco_b_permite_fora_padrao: boolean
  nova_espessura_min_mm?: number
  nova_espessura_max_mm?: number
  nova_largura_min_mm?: number
  nova_largura_max_mm?: number
  nova_comprimento_min_mm?: number
  nova_comprimento_max_mm?: number
  nova_peso_min_kg?: number
  nova_peso_max_kg?: number
  comparativo_json: ParameterComparisonResult[]
  compatibilidade: OutOfStandardCompatibility
  regra_tecnica_status: 'PARAMETRIZADA' | 'NAO_PARAMETRIZADA'
  regra_tecnica_detalhes?: string
  situacao?: OutOfStandardSituation
  avaliador_id?: string
  avaliador_nome?: string
  avaliador_matricula?: string
  data_avaliacao?: string
  origem_dados_mp?: 'CADASTROS_PCP' | 'SAP_RFC_PENDENTE'
  ia_analise_json?: Record<string, unknown>
  ia_recomendacao?: string
  ia_score?: number
}

export interface MPSelectionCandidate {
  id: string
  source: 'FICHA_MESTRA' | 'PRIORIDADES' | 'INVENTARIO' | 'APLICACOES'
  centro: string
  material_codigo: string
  material_descricao: string
  item_identificacao: string
  lote: string
  corrida?: string
  fornecedor: string
  aplicacao_atual: string
  deposito: string
  peso_kg: number
  espessura_mm: number
  largura_mm: number
  comprimento_mm: number
  status_operacional?: string
}

export interface ApplicationRequirementCandidate {
  id: string
  application_code: string
  application_name: string
  min_thickness_mm?: number
  max_thickness_mm?: number
  min_width_mm?: number
  max_width_mm?: number
  min_length_mm?: number
  max_length_mm?: number
  min_weight_kg?: number
  max_weight_kg?: number
  allows_out_of_ideal?: boolean
  source_type: 'REQUISITO_OFICIAL' | 'CAPACIDADE_LINHA' | 'DOCUMENTO_TECNICO'
  is_parameterized: boolean
}

export type SapPendencyType = 'COGI' | 'CO1P'

export type SapPendencyCategory =
  | 'Estoque'
  | 'Saldo/Reserva'
  | 'Contábil'
  | 'Cadastro'
  | 'Lote'
  | 'Ordem de Produção'
  | 'Confirmação'
  | 'Integração'
  | 'Outros'

export type SapPendencyCriticality = 'CRITICA' | 'URGENTE' | 'ATENCAO' | 'BAIXA'

export type SapTreatmentStatus =
  | 'Nova'
  | 'Em análise'
  | 'Em tratamento'
  | 'Aguardando outra área'
  | 'Corrigida'
  | 'Aguardando reprocessamento SAP'
  | 'Reprocessada'
  | 'Não resolvida'
  | 'Encerrada'

export type ResponsibleArea =
  | 'PCP'
  | 'Produção'
  | 'Estoque'
  | 'Suprimentos'
  | 'Contabilidade'
  | 'Fiscal'
  | 'TI'
  | 'Cadastro'
  | 'Qualidade'
  | 'Manutenção'

export interface SgqProcedureGuidance {
  sgq_document_code: string
  sgq_document_title: string
  sgq_document_revision: string
  sgq_applicable_procedure: string
  sgq_recommended_step?: string
  sgq_procedure_responsible?: string
  sgq_restrictions?: string
  sgq_notes?: string
  has_sgq_document: boolean
}

export interface SapCogiPendency {
  id: string
  empresa_code?: string
  centro_code: string
  linha_code?: string
  work_center?: string
  op_number?: string
  material_code: string
  material_description: string
  deposito?: string
  lote?: string
  tipo_movimento: string
  quantidade: number
  unidade_medida: string
  area_funcional?: string
  contador_tecnico?: string
  data_criacao: string
  data_erro: string
  sap_message: string // Preservada ipsi literis
  sap_msg_code: string
  sap_status?: string
  idade_horas: number
  categoria_ia: SapPendencyCategory
  criticality: SapPendencyCriticality
  area_responsavel_sugerida: ResponsibleArea
  treatment_status: SapTreatmentStatus
  responsavel_tratamento_id?: string
  responsavel_tratamento_nome?: string
  sgq_document_code?: string
  sgq_document_title?: string
  sgq_document_revision?: string
  impacta_programacao?: boolean
  bloqueia_fechamento?: boolean
  reincidente?: boolean
  reincidencia_chave?: string
  recorrencia_count?: number
  ai_diagnosis_facts?: string[]
  ai_diagnosis_hypotheses?: string[]
  ai_recommended_action?: {
    problema_identificado: string
    possivel_impacto: string
    verificar: string[]
    procedimento_sgq?: string
  }
  treatment_notes?: string
  is_demo?: boolean
  created?: string
  updated?: string
}

export interface SapCo1pPendency {
  id: string
  empresa_code?: string
  centro_code: string
  linha_code?: string
  work_center?: string
  op_number: string
  confirmation_number: string
  confirmation_counter: string
  reservation_number?: string
  processo_confirmacao: string // ex: "Baixa por explosão"
  material_code: string
  material_description: string
  operacao?: string
  data_hora_confirmacao: string
  data_hora_geracao_pendencia: string
  sap_message: string // Preservada ipsi literis
  sap_msg_code: string
  sap_status?: string
  idade_horas: number
  categoria_ia: SapPendencyCategory
  criticality: SapPendencyCriticality
  area_responsavel_sugerida: ResponsibleArea
  treatment_status: SapTreatmentStatus
  responsavel_tratamento_id?: string
  responsavel_tratamento_nome?: string
  sgq_document_code?: string
  sgq_document_title?: string
  sgq_document_revision?: string
  impacta_programacao?: boolean
  bloqueia_fechamento?: boolean
  reincidente?: boolean
  reincidencia_chave?: string
  recorrencia_count?: number
  ai_diagnosis_facts?: string[]
  ai_diagnosis_hypotheses?: string[]
  ai_recommended_action?: {
    problema_identificado: string
    possivel_impacto: string
    verificar: string[]
    procedimento_sgq?: string
  }
  treatment_notes?: string
  is_demo?: boolean
  created?: string
  updated?: string
}

export interface SapPendencyAuditLog {
  id: string
  pendency_type: SapPendencyType
  pendency_id: string
  op_number?: string
  material_code?: string
  action: string
  previous_status?: string
  new_status?: string
  assigned_user_id?: string
  assigned_user_name?: string
  sgq_document_code?: string
  comment?: string
  ai_analysis_generated?: any
  user_id?: string
  user_name?: string
  user_email?: string
  created?: string
}

export interface SapPendencySgqMapping {
  id: string
  category: SapPendencyCategory
  sap_msg_code?: string
  movement_type?: string
  sgq_document_code: string
  sgq_document_title: string
  sgq_document_revision: string
  sgq_applicable_procedure: string
  sgq_recommended_step?: string
  sgq_procedure_responsible?: string
  sgq_restrictions?: string
  sgq_notes?: string
  active?: boolean
  created?: string
  updated?: string
}

export interface SapPendenciesFilters {
  empresa?: string
  centro?: string
  linha?: string
  work_center?: string
  op_number?: string
  material?: string
  deposito?: string
  lote?: string
  tipo_movimento?: string
  categoria?: string
  criticality?: string
  area_responsavel?: string
  treatment_status?: string
  data_inicial?: string
  data_final?: string
  idade_min_horas?: number
  somente_criticas?: boolean
  somente_reincidentes?: boolean
  somente_impactam_programacao?: boolean
  search?: string
}

export interface ExecutiveCardsStats {
  total: number
  criticas: number
  urgentes: number
  maior_24h: number
  maior_48h: number
  ordens_impactadas: number
  quantidade_toneladas: number
  centro_top: { centro: string; count: number }
  categoria_top: { categoria: string; count: number }
  reincidentes: number
}

export interface AiAnalysisSummary {
  situacao_atual: string
  prioridade_imediata: string
  principal_problema: string
  concentracao: string
  reincidencia: string
  acoes_previstas: string[]
  fonte_sgq: string[]
}

export interface SimilarOccurrencesResult {
  total_encontradas: number
  primeira_ocorrencia: string
  ultima_ocorrencia: string
  tempo_medio_solucao_horas: number
  reincidencia_apos_correcao_pct: number
  tratamentos_utilizados: { status: string; count: number; responsavel: string }[]
  registros_similares: (SapCogiPendency | SapCo1pPendency)[]
}

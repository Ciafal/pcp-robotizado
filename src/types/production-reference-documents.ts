export interface ProductionReferenceDocumentCriteria {
  empresa?: string
  centro?: string
  linha?: string
  centro_trabalho?: string
  material?: string
  familia?: string
  tipo_movimento?: string
  tipo_ordem?: string
  categoria_erro?: string
  codigo_mensagem_sap?: string
  transacao_origem?: string
  processo?: string
  data_validade_inicio?: string
  data_validade_fim?: string
}

export type ProductionReferenceApplication =
  | 'Ordens de Produção'
  | 'Análise de Ordens'
  | 'Apontamentos'
  | 'Erro de Apontamento'
  | 'Confirmação de Produção'
  | 'COGI'
  | 'CO1P'
  | 'Estoque'
  | 'Reserva'
  | 'Lote'
  | 'Material'
  | 'Centro'
  | 'Centro de Trabalho'
  | 'Tipo de Movimento'
  | 'Contábil'
  | 'Cadastro'
  | 'Integração SAP'
  | 'Fechamento de Ordem'
  | 'Reprocessamento'
  | 'Divergência de quantidade'
  | 'Outros'

export const PRODUCTION_REFERENCE_APPLICATIONS: ProductionReferenceApplication[] = [
  'Ordens de Produção',
  'Análise de Ordens',
  'Apontamentos',
  'Erro de Apontamento',
  'Confirmação de Produção',
  'COGI',
  'CO1P',
  'Estoque',
  'Reserva',
  'Lote',
  'Material',
  'Centro',
  'Centro de Trabalho',
  'Tipo de Movimento',
  'Contábil',
  'Cadastro',
  'Integração SAP',
  'Fechamento de Ordem',
  'Reprocessamento',
  'Divergência de quantidade',
  'Outros',
]

export type ProductionAiCategory =
  | 'Estoque'
  | 'Saldo/Reserva'
  | 'Contábil'
  | 'Cadastro'
  | 'Lote'
  | 'Ordem de Produção'
  | 'Confirmação'
  | 'Apontamento'
  | 'Integração'
  | 'Material'
  | 'Centro/Centro de Trabalho'
  | 'Tipo de Movimento'
  | 'Outros'

export const PRODUCTION_AI_CATEGORIES: ProductionAiCategory[] = [
  'Estoque',
  'Saldo/Reserva',
  'Contábil',
  'Cadastro',
  'Lote',
  'Ordem de Produção',
  'Confirmação',
  'Apontamento',
  'Integração',
  'Material',
  'Centro/Centro de Trabalho',
  'Tipo de Movimento',
  'Outros',
]

export type ProductionReferencePriority = 'ALTA' | 'MEDIA' | 'BAIXA'

export interface ProductionReferenceDocument {
  id: string
  document_ref: string
  document_code: string
  title: string
  revision: string
  revision_date?: string
  status: 'VIGENTE' | 'OBSOLETO' | 'CANCELADO' | 'SUBSTITUIDO'
  document_type?: string
  process?: string
  responsible_area?: string
  validity_date_start?: string
  validity_date_end?: string
  document_author?: string
  source?: string
  original_url?: string
  last_sync_at?: string
  applications: ProductionReferenceApplication[]
  ai_categories: ProductionAiCategory[]
  criteria?: ProductionReferenceDocumentCriteria
  priority: ProductionReferencePriority
  is_primary: boolean
  active: boolean
  has_new_revision_available?: boolean
  new_revision_details?: {
    previous_revision: string
    new_revision: string
    release_date: string
    impact_summary: string
  }
  extractable_content?: string
  created_by_user_id?: string
  created_by_user_name?: string
  created?: string
  updated?: string
  is_demo?: boolean
}

export interface ProductionReferenceGovernanceLog {
  id: string
  reference_document_id: string
  document_code: string
  revision: string
  action:
    | 'ASSOCIACAO_CRIADA'
    | 'ASSOCIACAO_ATUALIZADA'
    | 'ASSOCIACAO_INATIVADA'
    | 'ASSOCIACAO_REATIVADA'
    | 'ASSOCIACAO_REMOVIDA'
    | 'NOVA_REVISAO_DETECTADA'
    | 'NOVA_REVISAO_APLICADA'
  applications?: ProductionReferenceApplication[]
  categories?: ProductionAiCategory[]
  criteria?: ProductionReferenceDocumentCriteria
  priority?: ProductionReferencePriority
  is_primary?: boolean
  previous_value?: any
  new_value?: any
  user_id?: string
  user_name?: string
  user_email?: string
  details?: string
  created?: string
}

export interface ProductionAiActionContext {
  occurrence_id: string
  occurrence_type: 'COGI' | 'CO1P' | 'APONTAMENTO' | 'ORDEM'
  op_number?: string
  material_code?: string
  material_description?: string
  centro_code?: string
  linha_code?: string
  work_center?: string
  deposito?: string
  lote?: string
  tipo_movimento?: string
  quantidade?: number
  unidade_medida?: string
  confirmation_number?: string
  reservation_number?: string
  sap_msg_code?: string
  sap_message?: string
  categoria_ia?: string
  criticality?: string
  current_status?: string
}

export interface ProductionProposedAiAction {
  occurrence_id: string
  analysis_timestamp: string
  // 1) Problema identificado (objetivo)
  problema_identificado: string
  // 2) Classificação
  classificacao: {
    categoria: string
    subcategoria: string
    criticidade: 'CRITICA' | 'URGENTE' | 'ATENCAO' | 'BAIXA'
  }
  // 3) Evidências identificadas
  evidencias: {
    tipo_fato: string
    mensagem_sap: string
    codigo_mensagem: string
    ordem?: string
    material?: string
    centro?: string
    deposito?: string
    movimento?: string
    confirmacao?: string
    reserva?: string
    lote?: string
  }
  // Fatos vs Hipóteses vs Orientação
  fatos_identificados: string[]
  hipoteses_ia: string[]
  orientacao_documentada: string[]
  // 4) Ação proposta objetiva vinda do documento oficial
  passos_acao_proposta: string[]
  // 5) Área sugerida
  area_sugerida:
    | 'PCP'
    | 'Produção'
    | 'Estoque'
    | 'Contabilidade'
    | 'Fiscal'
    | 'Qualidade'
    | 'Cadastro'
    | 'TI'
    | 'Manutenção'
  // 6) Documento oficial utilizado
  documento_utilizado?: {
    id: string
    codigo: string
    titulo: string
    revisao: string
    status: string
    is_primary: boolean
    prioridade: string
    trecho_aplicavel?: string
    original_url?: string
  }
  // Cenários de aderência do documento
  referencia_nao_localizada: boolean
  documento_insuficiente: boolean
  detalhes_insuficiencia?: {
    o_que_determina: string
    o_que_precisa_validacao_humana: string
  }
  // Divergência com histórico
  divergencia_historico?: {
    identificada: boolean
    mensagem: string
    tratamento_anterior?: string
    procedimento_vigente?: string
  }
  // Rastreabilidade obrigatória
  rastreabilidade: {
    id_analise: string
    timestamp: string
    documentos_consultados: string[]
    revisoes_consultadas: string[]
    trechos_regras_utilizados: string[]
    categoria_identificada: string
    dados_utilizados: Record<string, any>
    resultado: string
  }
}

export interface ProductionTreatmentRecordInput {
  occurrence_id: string
  occurrence_type: 'COGI' | 'CO1P' | 'APONTAMENTO' | 'ORDEM'
  op_number?: string
  material_code?: string
  document_code?: string
  document_title?: string
  document_revision?: string
  proposed_action: string
  actual_action_taken: string
  responsible_name: string
  responsible_area?: string
  outcome: string
  reprocessing_done: boolean
  resolved: boolean
  divergence_identified?: boolean
  divergence_notes?: string
  observation?: string
  ai_traceability_data?: any
}

export interface ProductionTreatmentHistoryItem extends ProductionTreatmentRecordInput {
  id: string
  created: string
  user_name?: string
}

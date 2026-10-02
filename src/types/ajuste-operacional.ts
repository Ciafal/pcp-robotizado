/**
 * Types para Ajustes Operacionais, Meu Dia e Integrações do PCP Robotizado
 * Conforme especificação da Etapa 1 (Controle de Produção / Check-list Fechamento)
 */

export type AjusteOperacionalStatusOrigem = 'ERRO' | 'PENDENTE'

export type AjusteOperacionalTipo =
  | 'Apontamento'
  | 'Estoque'
  | 'Movimento SAP'
  | 'Ordem de produção'
  | 'Divergência de quantidade'
  | 'Fechamento'
  | 'Cadastro'
  | 'Processo'
  | 'Outro'

export type AjusteOperacionalPrioridade = 'Baixa' | 'Média' | 'Alta' | 'Crítica'

export type AjusteOperacionalStatus =
  | 'Nova'
  | 'Em andamento'
  | 'Aguardando informação'
  | 'Concluída'
  | 'Cancelada'

export interface AjusteOperacional {
  id: string
  numero: string // Formato AOP-000001/AAAA
  ano: number
  sequencial_ano: number
  checklist_item_id: string
  checklist_modelo_id?: string
  competencia: string // MM/AAAA

  werks?: string
  empresa_nome?: string
  linha_id?: string
  linha_code?: string
  linha_name?: string
  centro_id?: string
  centro_code?: string
  centro_name?: string

  status_origem: AjusteOperacionalStatusOrigem
  tipo: AjusteOperacionalTipo
  descricao: string
  acao_necessaria: string
  prioridade: AjusteOperacionalPrioridade
  prazo: string // ISO date

  ordem_sap?: string
  material?: string
  lote?: string
  quantidade?: number
  transacao_sap?: string
  observacao_adicional?: string

  solicitante_id?: string
  solicitante_nome: string
  responsavel_id?: string
  responsavel_nome: string

  status: AjusteOperacionalStatus
  concluida_em?: string
  validada_pcp: boolean
  validada_por_nome?: string
  validada_em?: string
  justificativa_cancelamento?: string
  justificativa_reabertura?: string

  meu_dia_id?: string
  excluido?: boolean
  excluido_em?: string
  excluido_por?: string

  created?: string
  updated?: string
}

export interface AjusteOperacionalEvidencia {
  id: string
  ajuste_id: string
  arquivo?: string
  nome_arquivo: string
  tipo_mime?: string
  tamanho_bytes?: number
  url_ou_caminho?: string
  registrado_por: string
  registrado_por_id?: string
  registrado_em: string
  observacao?: string
  excluido?: boolean
  created?: string
  updated?: string
}

export interface AjusteOperacionalHistorico {
  id: string
  ajuste_id: string
  usuario: string
  usuario_id?: string
  acao: string
  valor_anterior?: string
  valor_novo?: string
  data_hora: string
  detalhes_json?: any
  created?: string
  updated?: string
}

export interface MeuDiaPendencia {
  id: string
  origem_sistema: string // 'PCP Robotizado'
  modulo: string // 'Controle de Produção'
  funcao: string // 'Check-list Fechamento'
  categoria: string // 'PCP — Ajuste Operacional'
  titulo: string // "PCP | Ajuste Operacional | [código+descrição curta] | [linha]"
  competencia: string // MM/AAAA
  empresa?: string
  linha?: string
  linha_id?: string
  centro?: string
  centro_id?: string
  codigo_atividade?: string
  atividade_titulo?: string
  status_origem?: string
  tipo_pendencia: string
  descricao: string
  acao_necessaria: string
  prioridade: AjusteOperacionalPrioridade
  prazo: string
  solicitante_id?: string
  solicitante_nome: string
  responsavel_id?: string
  responsavel_nome: string
  responsavel_email?: string
  data_hora: string
  link_origem: string
  ajuste_id?: string
  ajuste_numero?: string
  status: AjusteOperacionalStatus
  concluida_em?: string
  concluida_por?: string
  observacao_conclusao?: string
  created?: string
  updated?: string
}

export interface GestorLinhaInfo {
  usuario_id: string
  usuario_nome: string
  usuario_email: string
  tipo_responsabilidade: string // 'PRIMARY_MANAGER' | 'SUBSTITUTE_MANAGER' | etc.
  cargo?: string
  linha_id?: string
  linha_code?: string
  linha_name?: string
  centro_code?: string
  fonte_localizacao: 'line_managers_assignment' | 'production_lines' | 'sap_work_center'
}

export interface AnaliseIaAjusteResultado {
  resumo_ocorrencia: string
  descricao_revisada: string
  causa_provavel: string
  proximos_passos: string[]
  ocorrencias_semelhantes: Array<{
    competencia: string
    descricao: string
    solucao_adotada: string
    tempo_resolucao?: string
  }>
  dados_para_conferir: string[]
  restricoes_respeitadas: {
    nao_alterou_status: true
    nao_concluiu_pendencia: true
    nao_executou_sap: true
    nao_enviou_email_sem_confirmacao: true
  }
}

export interface CriarAjusteInput {
  checklist_item_id: string
  checklist_modelo_id?: string
  competencia: string
  codigo_atividade: string
  atividade_titulo: string
  status_origem: AjusteOperacionalStatusOrigem
  tipo: AjusteOperacionalTipo
  descricao: string
  acao_necessaria: string
  prioridade: AjusteOperacionalPrioridade
  prazo: string // ISO string ou YYYY-MM-DD

  werks?: string
  empresa_nome?: string
  linha_id?: string
  linha_code?: string
  linha_name?: string
  centro_id?: string
  centro_code?: string
  centro_name?: string

  ordem_sap?: string
  material?: string
  lote?: string
  quantidade?: number
  transacao_sap?: string
  observacao_adicional?: string

  solicitante_id?: string
  solicitante_nome: string
  responsavel_id?: string
  responsavel_nome?: string
  responsavel_email?: string

  evidencias_iniciais?: Array<{
    nome_arquivo: string
    url_ou_caminho?: string
    tipo_mime?: string
    tamanho_bytes?: number
  }>

  // Se true, ignora o aviso de duplicidade e permite criar com justificativa
  forcar_criacao_duplicada?: boolean
  justificativa_duplicidade?: string
}

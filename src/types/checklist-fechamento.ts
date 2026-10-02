export type ChecklistFrequencia = 'diaria' | 'semanal' | 'mensal' | 'somente_fechamento'

export type ChecklistFonteDados = 'Manual' | 'SAP RFC' | 'MES' | 'Integração HUB'

export type ChecklistItemStatus = 'OK' | 'ERRO' | 'PENDENTE'

export type ChecklistExecucaoStatus =
  | 'Pendente'
  | 'Em andamento'
  | 'Com erro'
  | 'Aguardando fechamento'
  | 'Fechado'

export type ChecklistOcorrenciaTipo =
  | 'DIVERGENCIA'
  | 'SOLICITACAO_INVENTARIO'
  | 'ACAO_CORRETIVA'
  | 'COMENTARIO'
  | 'ERRO_SAP'
  | 'AJUSTE_RETROATIVO'

export type ChecklistOcorrenciaStatus = 'Aberta' | 'Em tratamento' | 'Solucionada' | 'Cancelada'

export interface ChecklistAtividadeModelo {
  id: string
  codigo: string
  sequencia: number
  titulo: string
  descricao_detalhada: string
  categoria: string
  linha_centro_relacionado: string
  empresa: string
  // Campos estruturados de localização
  werks?: string
  line_id?: string
  line_code?: string
  line_name?: string
  center_id?: string
  center_code?: string
  center_name?: string
  transacao_sap: string
  deposito_sap: string
  frequencia: ChecklistFrequencia
  obrigatoria: boolean
  responsavel_padrao: string
  area_responsavel: string
  prazo_relativo_fechamento: string
  manual_documento_referencia: string
  regra_validacao: string
  campo_observacao: string
  permite_evidencia: boolean
  ativa: boolean
  data_inicio_vigencia: string
  data_fim_vigencia?: string
  fonte_dados: ChecklistFonteDados
  status_regra: string // Ex: "Oficial", "Regra em validação", "Pendente de validação de processo"
  metadata?: Record<string, any>
  created?: string
  updated?: string
}

export interface ChecklistFechamentoExecucao {
  id: string
  competencia: string // MM/AAAA
  ano: number
  mes: number
  empresa: string
  linha_centro?: string
  responsavel: string
  responsavel_id?: string
  data_inicio: string
  data_limite: string // 2º dia útil do mês seguinte à competência
  status_geral: ChecklistExecucaoStatus
  data_fechamento?: string
  fechado_por?: string
  percentual_concluido: number
  total_atividades: number
  total_ok: number
  total_erro: number
  total_pendente: number
  total_obrigatorias: number
  ordens_fechadas: number
  ordens_pendentes: number
  snapshot_regras?: any
  observacoes_gerais?: string
  analise_ia_resumo?: string
  created?: string
  updated?: string
}

export type DestinatarioGrupo = 'Contabilidade' | 'Produção' | 'PCP' | 'Diretoria' | 'Outro'

export interface FechamentoDestinatario {
  id: string
  grupo: DestinatarioGrupo
  nome: string
  usuario?: string
  email: string
  ativo: boolean
  created?: string
  updated?: string
}

export type FechamentoComunicacaoStatus = 'Rascunho' | 'Enviado' | 'Erro'

export interface FechamentoComunicacao {
  id: string
  execucao_id: string
  competencia: string
  assunto: string
  corpo_mensagem: string
  destinatarios_json: { nome: string; email: string; grupo?: string }[]
  grupo_destinatario?: string
  data_envio: string
  enviado_por: string
  remetente_email?: string
  status: FechamentoComunicacaoStatus
  sucesso?: boolean
  erro_detalhe?: string
  eh_reenvio?: boolean
  comunicacao_original_id?: string
  created?: string
  updated?: string
}

export interface FechamentoAnaliseIaResultado {
  resumo_executivo: {
    situacao_geral: string
    principais_pendencias: string[]
    principais_erros: string[]
    risco_prazo: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
    atividades_criticas: string[]
  }
  analise_ordens: {
    ordens_nao_encerradas: number
    fechamento_divergente: string[]
    desvios_rendimento: string[]
    possiveis_apontamentos_faltantes: string[]
    movimentos_inconsistentes: string[]
    reincidencias: string[]
  }
  analise_historica: {
    erros_recorrentes: string[]
    depositos_mais_divergencias: string[]
    linhas_fechamento_mais_demorado: string[]
    tipos_erro_repetidos: string[]
    atividades_frequentemente_fora_prazo: string[]
  }
  proximas_acoes_sugeridas: string[]
  texto_resumo_editavel: string
}

export interface ChecklistFechamentoItem {
  id: string
  execucao_id: string
  competencia: string
  modelo_id?: string
  codigo: string
  sequencia: number
  titulo: string
  descricao_detalhada: string
  categoria: string
  linha_centro_relacionado: string
  empresa: string
  // Campos estruturados de localização
  werks?: string
  line_id?: string
  line_code?: string
  line_name?: string
  center_id?: string
  center_code?: string
  center_name?: string
  transacao_sap: string
  deposito_sap: string
  obrigatoria: boolean
  responsavel_padrao: string
  area_responsavel: string
  manual_documento_referencia: string
  regra_validacao: string
  status_regra: string
  fonte_dados: string
  status: ChecklistItemStatus
  observacao?: string
  quantidade_divergencias?: number
  ordem_material_lote?: string
  acao_corretiva?: string
  executado_por?: string
  data_hora_execucao?: string
  necessita_inventario?: boolean
  historico_alteracoes?: ChecklistItemHistorico[]
  created?: string
  updated?: string
}

export interface ChecklistItemHistorico {
  timestamp: string
  usuario: string
  campo: string
  de: any
  para: any
  motivo?: string
}

export interface ChecklistOcorrencia {
  id: string
  execucao_id: string
  item_id: string
  codigo_atividade?: string
  competencia: string
  tipo: ChecklistOcorrenciaTipo
  descricao: string
  ordem?: string
  material?: string
  lote?: string
  deposito?: string
  quantidade_divergente?: number
  saldo_sap?: number
  saldo_fisico?: number
  responsavel?: string
  acao_adotada?: string
  data_correcao?: string
  status: ChecklistOcorrenciaStatus
  timeline_movimentos?: ChecklistTimelineMovimento[]
  created?: string
  updated?: string
}

export interface ChecklistTimelineMovimento {
  data_hora: string
  tipo_movimento: string // ex: 311, 261, 101, Estorno, Cancelamento
  ordem?: string
  material?: string
  lote?: string
  deposito_origem?: string
  deposito_destino?: string
  quantidade: number
  unidade: string
  usuario: string
  observacao?: string
}

export interface ChecklistEvidencia {
  id: string
  execucao_id: string
  item_id: string
  ocorrencia_id?: string
  codigo_atividade?: string
  titulo: string
  descricao?: string
  url_ou_caminho?: string
  arquivo?: string
  nome_arquivo?: string
  tamanho_bytes?: number
  tipo_mime?: string
  usuario_nome?: string
  usuario_id?: string
  created?: string
  updated?: string
}

export interface ChecklistFeriado {
  id: string
  data: string // YYYY-MM-DD
  descricao: string
  tipo: 'Nacional' | 'Estadual' | 'Municipal' | 'Corporativo' | 'Ponte'
  ano: number
  ativo: boolean
}

export * from './ajuste-operacional'

export interface PrazoFechamentoInfo {
  segundoDiaUtil: string // DD/MM/AAAA
  segundoDiaUtilIso: string // YYYY-MM-DD
  diasRestantes: number
  statusPrazo: 'NORMAL' | 'ATENCAO' | 'CRITICO' | 'VENCIDO'
  statusTexto: string
}

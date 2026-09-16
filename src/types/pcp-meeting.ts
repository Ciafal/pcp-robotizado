/**
 * TIPOS OFICIAIS DO MÓDULO REUNIÃO PCP — HUB CIAFAL
 * Atende à FATIA 1 da Reunião PCP: Governança, Briefing IA, Pauta, Prévia de ATA SGQ,
 * Bloqueio de Agendamento, Pendências e Auditoria.
 */

export type PCPMeetingStatus =
  | 'RASCUNHO'
  | 'PREPARACAO'
  | 'PREVIA_GERADA'
  | 'PREVIA_VALIDADA'
  | 'PREVIA_ENVIADA'
  | 'AGENDADA'
  | 'EM_ANDAMENTO'
  | 'REALIZADA'
  | 'ATA_FINAL_GERADA'
  | 'ATA_APROVADA'
  | 'PUBLICADA'
  | 'CANCELADA'
  | 'REAGENDADA'

export type PCPMeetingModality = 'PRESENCIAL' | 'ONLINE' | 'HIBRIDA'

export type ParticipantStatus =
  | 'CONVOCADO'
  | 'CONFIRMOU'
  | 'RECUSOU'
  | 'SEM_RESPOSTA'
  | 'PARTICIPOU'
  | 'NAO_PARTICIPOU'

export type PendencyPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'

export type PendencyStatus =
  | 'ABERTA'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_TERCEIRO'
  | 'CONCLUIDA'
  | 'CANCELADA'
  | 'VENCIDA'

export type AgendaItemPriority = 'CRITICO' | 'ALTO' | 'MEDIO' | 'INFORMATIVO'

export type AtaType = 'PREVIA' | 'FINAL'

export type AtaStatus = 'MINUTA' | 'EM_REVISAO' | 'APROVADA' | 'PUBLICADA'

export type TemplateStatus = 'VIGENTE' | 'EM_REVISAO' | 'OBSOLETO'

export type BriefingItemClassification = 'CRITICO' | 'ALTO' | 'MEDIO' | 'INFORMATIVO'

export type AtaDiffAction =
  | 'MANTER'
  | 'ATUALIZAR'
  | 'NOVA'
  | 'CONCLUIDA'
  | 'PENDENTE'
  | 'SUGESTÃO_DE_EXCLUSÃO'
  | 'NECESSITA_VALIDAÇÃO'

export interface PreviaEnvioInfo {
  data_hora: string
  usuario: string
  versao: number
  destinatarios: string[]
  canal: string // 'REGISTRO_SISTEMA_CANAL_NOTIF_PENDENTE' ou 'EMAIL_CORPORATIVO'
}

export interface RecurrenceConfig {
  enabled: boolean
  day_of_week: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX'
  start_time: string
  periodicity: 'SEMANAL' | 'QUINZENAL' | 'MENSAL'
}

export interface PCPMeetingRecord {
  id: string
  meeting_code: string // Ex: REUNIAO-000001
  title: string
  week: number // Semana ISO
  year: number
  company: string
  meeting_date: string // YYYY-MM-DD
  start_time: string // HH:mm
  expected_end_time: string // HH:mm
  modality: PCPMeetingModality
  location?: string
  room?: string
  online_link?: string
  organizer: string
  conductor: string
  objective?: string
  notes?: string
  status: PCPMeetingStatus
  briefing_gerado: boolean
  pauta_gerada: boolean
  previa_gerada: boolean
  previa_enviada: boolean
  previa_envio_info?: PreviaEnvioInfo
  agendamento_confirmado: boolean
  recurrence_config?: RecurrenceConfig
  cancellation_reason?: string
  reschedule_reason?: string
  created_by_user?: string
  created?: string
  updated?: string
}

export interface PCPMeetingParticipantRecord {
  id?: string
  meeting_id: string
  person_name: string
  person_email?: string
  role_title?: string
  area: string
  status: ParticipantStatus
  response_notes?: string
  responded_at?: string
  created?: string
  updated?: string
}

export interface PCPMeetingPendencyRecord {
  id?: string
  pendency_code: string // Ex: PEND-000001
  origin_week: number
  origin_year: number
  meeting_id: string
  area: string
  subject: string
  action: string
  responsible: string
  deadline: string // YYYY-MM-DD
  priority: PendencyPriority
  status: PendencyStatus
  last_update_note?: string
  evidence?: string
  origin?: string
  performance_action_id?: string
  created?: string
  updated?: string
}

export interface PCPMeetingDecisionRecord {
  id?: string
  meeting_id: string
  description: string
  area: string
  responsible: string
  decision_date: string // YYYY-MM-DD
  origin: 'PREVIA' | 'REUNIAO'
  notes?: string
  created?: string
  updated?: string
}

export interface PCPMeetingAgendaItemRecord {
  id?: string
  meeting_id: string
  subject: string
  area: string
  reason?: string
  priority: AgendaItemPriority
  estimated_time_min: number
  presenter: string
  decision_needed: boolean
  order: number
  origin_ref?: string
  created?: string
  updated?: string
}

export interface AtaSectionEntry {
  id: string
  topico: string
  detalhes: string
  status_info: AtaDiffAction
  responsavel?: string
  origem?: string
  dados_atuais?: string
}

export interface AtaSectionData {
  id: string
  nome: string
  obrigatorio: boolean
  ordem: number
  itens: AtaSectionEntry[]
  observacoes?: string
}

export interface AtaStructuredContent {
  template_code: string
  template_revision: number
  secoes: Record<string, AtaSectionData>
}

export interface PCPMeetingAtaRecord {
  id?: string
  meeting_id: string
  version: number
  structured_content: AtaStructuredContent
  ata_type: AtaType
  status: AtaStatus
  section_completeness?: Record<string, number> // { [secId]: percent }
  overall_completeness: number // 0 a 100
  template_code?: string
  published_at?: string
  published_by?: string
  created?: string
  updated?: string
}

export interface TemplateSectionDefinition {
  id: string
  nome: string
  obrigatorio: boolean
  ordem: number
  descricao?: string
}

export interface PCPMeetingTemplateRecord {
  id?: string
  code: string // Ex: 8.1.001-R002
  title: string
  revision: number
  revision_date: string
  effective_date: string
  structure: {
    template_code: string
    title: string
    revision: number
    secoes: TemplateSectionDefinition[]
  }
  status: TemplateStatus
  responsible: string
  created?: string
  updated?: string
}

export interface PCPMeetingLogRecord {
  id?: string
  meeting_id: string
  meeting_code?: string
  week?: number
  year?: number
  user_name: string
  user_id?: string
  action: string
  target_object: string
  previous_value?: string
  new_value?: string
  reason?: string
  metadata?: Record<string, unknown>
  created?: string
  updated?: string
}

export interface BriefingItem {
  id: string
  categoria:
    | 'MUDANCAS'
    | 'DESVIOS'
    | 'RISCO_PROGRAMACAO'
    | 'GARGALOS'
    | 'PARADAS'
    | 'MATERIA_PRIMA'
    | 'MTO_CRITICO'
    | 'CARTEIRA_RISCO'
    | 'ESTOQUE_CRITICO'
    | 'PENDENCIAS'
    | 'DECISOES_NECESSARIAS'
    | 'INFO_FALTANTE'
  titulo: string
  descricao: string
  classificacao: BriefingItemClassification
  origem_dados: string
  impacto?: string
  acao_sugerida?: string
  responsavel?: string
}

export interface PriorityTopic {
  id: string
  prioridade: BriefingItemClassification
  area: string
  assunto: string
  origem: string
  impacto: string
  situacao: string
  decisao_necessaria: boolean
  responsavel_relacionado: string
}

export interface PCPMeetingBriefingRecord {
  id?: string
  meeting_id: string
  briefing_items: BriefingItem[]
  priority_topics: PriorityTopic[]
  missing_info_count: number
  critical_items_count: number
  generated_at: string
  generated_by: string
  created?: string
  updated?: string
}

export interface OverviewMetrics {
  proximaReuniao: PCPMeetingRecord | null
  semanaPCP: number
  anoPCP: number
  statusPreparacao: string
  completudeAtaPercent: number
  previaEnviada: boolean
  participantesConvocados: number
  confirmacoes: number
  pendenciasAbertas: number
  pendenciasVencidas: number
  decisoesUltimaReuniao: number
  statusAtaAnterior: string
  itensCriticosDiscussao: number
}

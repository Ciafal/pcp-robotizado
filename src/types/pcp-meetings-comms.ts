export type MeetingModality = 'PRESENCIAL' | 'ONLINE' | 'HIBRIDA'
export type MeetingStatus = 'AGENDADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA' | 'REMARCADA'
export type MinuteStatus = 'DRAFT_IA' | 'REVISAO_PCP' | 'APROVADA' | 'PUBLICADA' | 'CANCELADA'

export type ItemClassification =
  | 'INFORMACAO'
  | 'OBSERVACAO'
  | 'DECISAO'
  | 'PENDENCIA'
  | 'ALERTA'
  | 'RISCO'
  | 'ACAO'
  | 'ALTERACAO_PROGRAMACAO'
  | 'COMUNICADO'

export type ItemCategory =
  | 'GERAL'
  | 'QUALIDADE'
  | 'MATERIA_PRIMA'
  | 'ESTOQUE'
  | 'MANUTENCAO'
  | 'LOGISTICA'
  | 'SEGURANCA'
  | 'CAPACIDADE'
  | 'PROCESSO'

export type ItemStatus =
  | 'ABERTA'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'CANCELADA'
  | 'VENCIDA'
  | 'AGUARDANDO_TERCEIRO'
  | 'SEM_ATUALIZACAO'
  | 'VALIDADO_HUMANO'
  | 'IDENTIFICADO_IA'

export type ParticipantResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'NO_RESPONSE'

export interface MeetingParticipant {
  user_id: string
  name: string
  email: string
  role?: string
  status: ParticipantResponseStatus
  responded_at?: string
  decline_reason?: string
}

export interface AgendaTopic {
  id: string
  title: string
  description?: string
  order: number
  duration_minutes?: number
  line_codes?: string[]
}

export interface RescheduleLog {
  previous_date: string
  previous_time: string
  new_date: string
  new_time: string
  reason: string
  changed_by: string
  changed_at: string
}

export interface PreMeetingBriefing {
  executive_summary: string
  key_deviations: string[]
  critical_risks: string[]
  unresolved_pendencies: Array<{
    code: string
    title: string
    line_codes: string[]
    responsible: string
    deadline: string
    status: ItemStatus
  }>
  points_for_decision: string[]
  recurrent_topics: string[]
  suggested_agenda: Array<{
    title: string
    duration_minutes: number
    focus: string
  }>
  kpi_snapshot?: {
    overall_oee: number
    schedule_adherence: number
    active_alerts_count: number
    open_pendencies_count: number
  }
}

export interface PCPMeeting {
  id: string
  code: string
  title: string
  reference_week: string
  meeting_date: string // YYYY-MM-DD
  meeting_time: string // HH:mm
  duration_minutes: number
  modality: MeetingModality
  location?: string
  online_link?: string
  organizer_id?: string
  conductor_id?: string
  minute_taker_id?: string
  status: MeetingStatus
  agenda_topics: AgendaTopic[]
  mandatory_participants: MeetingParticipant[]
  optional_participants: MeetingParticipant[]
  involved_sectors: string[]
  involved_lines: string[]
  general_notes?: string
  reschedule_history?: RescheduleLog[]
  pre_meeting_briefing?: PreMeetingBriefing
  pre_meeting_generated_at?: string
  audio_recording_url?: string
  audio_transcript_status?: string
  audio_transcript_text?: string
  created?: string
  updated?: string
  expand?: Record<string, any>
}

export interface PCPMinuteTopic {
  topic_id: string
  title: string
  items: PCPMinuteItem[]
}

export interface PCPMeetingMinute {
  id: string
  meeting_id: string
  meeting_code: string
  reference_week: string
  title: string
  version: number
  status: MinuteStatus
  executive_summary?: string
  topics_payload?: PCPMinuteTopic[]
  participants_present?: Array<{ user_id: string; name: string; email: string }>
  reviewed_by_id?: string
  reviewed_by_name?: string
  reviewed_at?: string
  published_by_id?: string
  published_by_name?: string
  published_at?: string
  email_dispatched_at?: string
  email_recipients?: Array<{ email: string; name: string; status: string }>
  created?: string
  updated?: string
}

export interface PCPMinuteItem {
  id: string
  meeting_id: string
  minute_id?: string
  item_code: string
  topic_title: string
  classification: ItemClassification
  category: ItemCategory
  title: string
  description: string
  impact_level?: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'
  responsible_user_id?: string
  responsible_name?: string
  sector?: string
  deadline?: string // YYYY-MM-DD
  status: ItemStatus
  is_ai_generated?: boolean
  ai_confidence_score?: number
  validated_by_id?: string
  validated_at?: string
  line_codes: string[]
  line_ids?: string[]
  product_code?: string
  product_name?: string
  material_code?: string
  production_order?: string
  customer_order?: string
  customer_name?: string
  schedule_code?: string
  reference_week?: string
  valid_from?: string
  valid_until?: string
  is_active_operational?: boolean
  conclusion_notes?: string
  concluded_at?: string
  concluded_by_id?: string
  history_log?: Array<{
    timestamp: string
    user_name: string
    from_status: string
    to_status: string
    note: string
  }>
  attachments?: Array<{ name: string; url: string; size?: number }>
  created?: string
  updated?: string
  expand?: Record<string, any>
}

// -------------------------------------------------------------
// CENTRAL DE COMUNICADOS PCP
// -------------------------------------------------------------

export type CommunicationType =
  | 'INFORMATIVO'
  | 'ATENCAO'
  | 'OPERACIONAL'
  | 'ALTERACAO_PROGRAMACAO'
  | 'QUALIDADE'
  | 'MATERIA_PRIMA'
  | 'ESTOQUE'
  | 'MANUTENCAO'
  | 'LOGISTICA'
  | 'SEGURANCA'
  | 'URGENTE'
  | 'CRITICO'
  | 'BLOQUEANTE'

export type CriticalityLevel = 'NORMAL' | 'ATENCAO' | 'URGENTE' | 'CRITICA' | 'BLOQUEANTE'

export type CommunicationOrigin =
  | 'MANUAL'
  | 'REUNIAO_PCP'
  | 'ATA_PCP'
  | 'PENDENCIA_PCP'
  | 'ALERTA_PCP'
  | 'ALTERACAO_PROGRAMACAO'
  | 'ANALISE_IA'
  | 'OCORRENCIA_OPERACIONAL'
  | 'QUALIDADE'
  | 'ESTOQUE_MATERIA_PRIMA'

export type CommunicationStatus = 'RASCUNHO' | 'PROGRAMADO' | 'VIGENTE' | 'ENCERRADO' | 'CANCELADO'

export type TargetAudienceType =
  | 'TODOS'
  | 'PCP'
  | 'LINHAS_ESPECIFICAS'
  | 'SETORES_ESPECIFICOS'
  | 'SUPERVISORES_GESTORES'
  | 'OPERACAO'
  | 'QUALIDADE'
  | 'ESTOQUE'
  | 'COMERCIAL'
  | 'LOGISTICA'
  | 'MANUTENCAO'
  | 'USUARIOS_ESPECIFICOS'

export interface PCPCommunication {
  id: string
  code: string
  title: string
  summary?: string
  content: string
  comm_type: CommunicationType
  criticality: CriticalityLevel
  origin_type: CommunicationOrigin
  origin_ref_id?: string
  origin_ref_code?: string
  status: CommunicationStatus
  published_at?: string
  scheduled_publish_at?: string
  valid_from: string
  valid_until?: string
  closed_at?: string
  closed_by_id?: string
  close_reason?: string
  author_id?: string
  author_name?: string
  approver_id?: string
  approver_name?: string
  approved_at?: string
  requires_acknowledgement: boolean
  ack_deadline?: string
  escalation_responsible_id?: string
  is_blocking: boolean
  block_reason?: string
  unblock_condition?: string
  unblocked_at?: string
  unblocked_by_id?: string
  target_audience_type: TargetAudienceType
  target_line_codes: string[]
  target_sectors: string[]
  target_user_ids?: string[]
  product_code?: string
  material_code?: string
  production_order?: string
  customer_order?: string
  customer_name?: string
  schedule_code?: string
  total_recipients_count?: number
  read_count?: number
  acknowledged_count?: number
  pending_count?: number
  attachments?: Array<{ name: string; url: string; size?: number }>
  is_ai_assisted?: boolean
  created?: string
  updated?: string
  expand?: Record<string, any>
  // flags computadas na interface
  user_read_state?: {
    is_read: boolean
    is_acknowledged: boolean
    read_at?: string
    acknowledged_at?: string
  }
}

export interface PCPCommunicationRead {
  id: string
  communication_id: string
  user_id: string
  user_email: string
  user_name: string
  delivered_at?: string
  viewed_at?: string
  read_at?: string
  acknowledged_at?: string
  acknowledged_version?: number
  user_role?: string
  user_sector?: string
  created?: string
  updated?: string
}

// -------------------------------------------------------------
// INBOX UNIFICADA DO PCP
// -------------------------------------------------------------
export interface PCPInboxItem {
  id: string
  type: 'REUNIAO' | 'COMUNICADO' | 'PENDENCIA' | 'ALERTA'
  title: string
  subtitle: string
  source_label: string
  priority: 'CRITICA' | 'ATENCAO' | 'NORMAL'
  deadline?: string
  created_at: string
  requires_action: boolean
  action_type?: 'ACKNOWLEDGE' | 'JOIN_MEETING' | 'RESOLVE_PENDENCY' | 'CONFIRM_INVITE'
  item_payload: any
  link: string
}

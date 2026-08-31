import { WeeklyScheduleItem, WeeklyLifecycleStage } from './weekly-schedule'

/**
 * Status de Prontidão da Oficina de Cilindros
 */
export type RollShopReadinessStatus =
  | 'READY' // 🟢 PRONTO
  | 'IN_PREPARATION' // 🟡 EM PREPARAÇÃO
  | 'DELAY_RISK' // 🔴 RISCO DE ATRASO
  | 'NOT_STARTED' // ⚫ NÃO INICIADO
  | 'BLOCKED_UNAVAILABLE' // ⛔ RISCO / SETUP NÃO VIÁVEL

/**
 * Status de Execução do Setup na Linha / MES
 */
export type SetupExecutionStatus =
  | 'PREVISTO'
  | 'PREPARANDO_OFICINA'
  | 'PRONTO_PARA_TROCA'
  | 'EM_EXECUCAO_TROCA'
  | 'EM_ACERTO'
  | 'CONCLUIDO'
  | 'ATRASADO'
  | 'CANCELADO'

/**
 * Tipo de Atividade SMED
 */
export type SmedActivityType = 'EXTERNAL' | 'INTERNAL'

/**
 * Responsável / Área principal pelo Setup
 */
export type SetupResponsibleArea =
  | 'OFICINA_CILINDROS'
  | 'PRODUCAO'
  | 'MANUTENCAO'
  | 'QUALIDADE_METROLOGIA'

/**
 * Detalhamento de Fases de SMED
 */
export interface SmedPhaseBreakdown {
  id: string
  name: string
  type: SmedActivityType
  description: string
  standardMinutes: number
  realizedMinutes?: number
  canBeExternalized: boolean
  responsible: string
}

/**
 * Estrutura completa de Tempos de Setup
 */
export interface SetupTimeBreakdown {
  preparation_minutes: number // Preparação externa
  physical_change_minutes: number // Troca física (Linha parada)
  alignment_minutes: number // Posicionamento e regulagem
  tuning_minutes: number // Acerto inicial
  inspection_release_minutes: number // Inspeção e liberação
  // Totais Padronizados
  planned_change_duration_minutes: number // Tempo previsto de troca (soma de preparação + física + alinhamento)
  planned_tuning_duration_minutes: number // Tempo previsto de acerto
  planned_total_duration_minutes: number // Tempo total = Troca + Acerto (+ demais tempos)
  // Tempos Reais MES (Ciclo Fechado)
  realized_change_duration_minutes?: number
  realized_tuning_duration_minutes?: number
  realized_total_duration_minutes?: number
  deviation_minutes?: number
  deviation_percentage?: number
}

/**
 * Recursos de Ferramental e Cilindros
 */
export interface SetupToolingResources {
  cylinder_set_code: string // Ex: "CJ-L1-CAN-204"
  cylinder_set_name: string
  cylinder_stand_positions: string[] // Ex: ["Gaiola 1", "Gaiola 2", "Gaiola 3", "Acabador"]
  guides_code?: string
  tools_code?: string
  machining_equipment_id?: string // Ex: "Torno CNC 02", "Retífica 01"
  crane_required?: boolean
  assigned_team?: string
  alternative_homologated_sets?: string[] // Conjuntos alternativos homologados
}

/**
 * Registro de Demanda da Oficina de Cilindros gerado pelo PCP
 */
export interface RollShopDemand {
  id: string
  schedule_code: string
  schedule_item_id?: string
  schedule_version: number
  company_code: string
  plant_code: string
  line_code: string
  from_material_code: string
  from_material_description?: string
  from_family_code?: string
  from_gauge_dimension?: string
  to_material_code: string
  to_material_description?: string
  to_family_code?: string
  to_gauge_dimension?: string
  change_type: string // Ex: 'TROCA_BITOLA', 'TROCA_PERFIL', 'TROCA_FAMILIA'
  // Recursos
  tooling: SetupToolingResources
  times: SetupTimeBreakdown
  // Datas e Prazos SMED
  scheduled_setup_datetime: string // Ex: '2026-08-25 14:30'
  preparation_deadline_datetime: string // Ex: '2026-08-25 13:30' (prazo limite de preparação externa)
  readiness_status: RollShopReadinessStatus
  execution_status: SetupExecutionStatus
  priority: 'ALTA' | 'NORMAL' | 'URGENTE' | 'CRITICA'
  // SMED Timeline Stages
  smed_timeline: {
    external_prep_started?: string
    set_ready_at?: string
    awaiting_line_stop?: string
    line_stop_started?: string
    tuning_started?: string
    line_released?: string
  }
  // Feedback bidirecional da Oficina para o PCP
  feedback_to_pcp?: {
    has_issue: boolean
    issue_type?:
      | 'SET_UNAVAILABLE'
      | 'CYLINDER_MACHINING'
      | 'DIMENSIONAL_PROBLEM'
      | 'SET_MAINTENANCE'
      | 'DELAY'
      | 'REPLACEMENT_REQUIRED'
      | 'READY'
    issue_details?: string
    reported_at?: string
    reported_by?: string
  }
  // Alertas
  is_frozen_window?: boolean // Está na janela de congelamento
  has_schedule_change_impact?: boolean
  impact_alert_message?: string
  created: string
  updated: string
}

/**
 * Evento de Versionamento de Setup entre PCP e Oficina
 */
export interface SetupVersionHistoryEvent {
  id: string
  schedule_code: string
  demand_id: string
  previous_version: number
  new_version: number
  change_type: 'SETUP_MAINTAINED' | 'SETUP_MODIFIED' | 'SETUP_CANCELLED' | 'NEW_SETUP'
  previous_setup_datetime: string
  new_setup_datetime: string
  previous_total_minutes: number
  new_total_minutes: number
  impact_description: string
  user_name: string
  timestamp: string
}

/**
 * Indicadores Consolidados da Oficina de Cilindros
 */
export interface RollShopIndicators {
  setups_next_7_days: number
  setups_month: number
  sets_to_prepare: number
  sets_ready: number
  delayed_preparations: number
  avg_change_time_minutes: number
  avg_tuning_time_minutes: number
  avg_total_setup_minutes: number
  adherence_planned_vs_realized_pct: number
  accumulated_smed_gain_hours: number
  potential_throughput_loss_tons: number
}

/**
 * Recomendação de IA para Setup e Gargalo
 */
export interface AISetupRecommendation {
  id: string
  type: 'SEQUENCE_OPTIMIZATION' | 'STANDARD_TIME_REVISION' | 'BOTTLENECK_SETUP' | 'ALTERNATIVE_SET'
  title: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'OPPORTUNITY'
  description: string
  current_sequence_summary?: string
  suggested_sequence_summary?: string
  setups_avoided_count?: number
  minutes_saved?: number
  capacity_hours_gain?: number
  bottleneck_stage_name?: string
  bottleneck_capacity_th?: number
  potential_throughput_unavailable_tons?: number
  historical_evidence?: {
    sample_size: number
    standard_minutes: number
    realized_median_minutes: number
    line_code: string
    from_family: string
    to_family: string
  }
  is_applied: boolean
}

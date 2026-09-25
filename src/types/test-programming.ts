/**
 * Tipos Oficiais para o Módulo de Programação de Testes Industriais (PCP Robotizado CIAFAL)
 * Ciclo: PROGRAMAÇÃO → Período Previsto → Aprovação → Execução MES 4.0 → Previsto x Realizado → Análise IA → Eficácia → Histórico
 */

import { CalculatedDeviations } from '@/lib/test-programming-calculations'

export const TEST_PROGRAMMING_STATUSES = [
  'Rascunho',
  'Enviado para Aprovação Industrial',
  'Em Aprovação Industrial',
  'Solicitação de Ajustes',
  'Aprovado pela Indústria',
  'Reprovado pela Indústria',
  'Aguardando Aprovação PCP',
  'Em Análise PCP',
  'Aprovado PCP',
  'Reprovado PCP',
  'Solicitação de Reprogramação',
  'Programado',
  'Próximo da Execução',
  'Em Execução',
  'Executado',
  'Aguardando Resultado',
  'Resultado Registrado',
  'Aguardando Avaliação de Eficácia',
  'Em Avaliação de Eficácia',
  'Ação Necessária',
  'Em Tratamento',
  'Concluído',
  'Cancelado',
] as const

export type TestProgrammingStatus = (typeof TEST_PROGRAMMING_STATUSES)[number]

export type TestCategory = 'EQUIPAMENTO' | 'MATERIA_PRIMA' | 'RECEITA_LAMINACAO'

export type ScheduleImpactType = 'PARADA_TOTAL' | 'REDUCAO_RITMO' | 'SEM_IMPACTO'

export type EfficacyEvalTiming =
  | 'Imediatamente'
  | 'Após 1 turno'
  | '24h'
  | '7 dias'
  | '30 dias'
  | 'data específica'

export type RevisionType =
  | 'Não'
  | 'Documento'
  | 'Procedimento'
  | 'Instrução de Trabalho'
  | 'Receita AOM'
  | 'Parâmetro Industrial'
  | 'Ficha Mestra'
  | 'Meta'
  | 'Indicador'
  | 'Outro'

export type RecipeChangeType =
  | 'Alteração de Layout'
  | 'Alteração de Calibração'
  | 'Nova Receita'
  | 'Ajuste de Receita'
  | 'Validação de Receita'

export type MesIntegrationStatus =
  | 'Aguardando execução'
  | 'Aguardando dados MES'
  | 'Sincronizado'
  | 'Sincronização parcial'
  | 'Erro de integração'

export interface EquipmentDynamicData {
  sapEquipmentCode: string
  sapEquipmentDescription: string
  installationLocation: string
  isNewEquipment: boolean
  hasMechanicalChange: boolean
  hasElectricalChange: boolean
  hasAutomationChange: boolean
  hasInstrumentationChange: boolean
  hasSoftwareChange: boolean
  requiresMaintenance: boolean
  requiresAutomationOrIT: boolean
}

export interface RawMaterialDynamicData {
  rawMaterialCode: string
  rawMaterialDescription: string
  rawMaterialQuantity: number
  rawMaterialUnit: string
  batchNumber: string
  supplier: string
  producedMaterialCode: string
  producedMaterialDescription: string
  plannedQuantity: number
  producedMaterialUnit: string
  gaugeDimension: string
  family: string
  productionLine: string
}

export interface RecipeDynamicData {
  changeType: RecipeChangeType
  recipeId: string
  recipeVersion: string
  recipeVersionDate: string
  material: string
  gaugeDimension: string
  family: string
  productionLine: string
  technicalNotes?: string
}

export type DynamicCategoryData =
  | { category: 'EQUIPAMENTO'; data: EquipmentDynamicData }
  | { category: 'MATERIA_PRIMA'; data: RawMaterialDynamicData }
  | { category: 'RECEITA_LAMINACAO'; data: RecipeDynamicData }

export interface FullStopImpactData {
  date: string
  shiftCode?: string
  shiftName?: string
  startTime: string
  expectedDurationMinutes: number
  calculatedEndTime: string // HH:mm CALCULADA automaticamente
  crew?: string
  scale?: string
  isSpecificTime?: boolean
}

export interface RhythmReductionImpactData {
  nominalProductivity: number // t/h
  expectedProductivity: number // t/h
  unit: string // 't/h'
  calculatedReductionPercent: number // CALCULADO automaticamente
  startDateTime: string
  endDateTime: string
}

export interface NoImpactData {
  notes?: string
}

export type ScheduleImpactData =
  | { type: 'PARADA_TOTAL'; data: FullStopImpactData }
  | { type: 'REDUCAO_RITMO'; data: RhythmReductionImpactData }
  | { type: 'SEM_IMPACTO'; data: NoImpactData }

export interface EfficacyCriteria {
  indicator: string
  expectedCondition: string
  currentValue: string
  expectedTarget: string
  unit: string
  evaluationPeriod: string
}

export interface RevisionDetails {
  item: string
  reason: string
  responsible: string
  deadline: string
  description: string
}

export interface IndustrialApprovalDecision {
  decision: 'APROVADO' | 'REPROVADO' | 'SOLICITAR_AJUSTES'
  userId: string
  userName: string
  userRole?: string
  decisionDate: string
  decisionTime: string
  observation: string
}

export interface PcpApprovalDecision {
  decision: 'APROVADO' | 'REPROVADO' | 'SOLICITAR_REPROGRAMACAO'
  userId: string
  userName: string
  userRole?: string
  decisionDate: string
  decisionTime: string
  observation: string
}

export interface ExecutionResultData {
  executedDate?: string
  executedStartTime?: string
  executedEndTime?: string
  actualProductivity?: number
  resultSummary?: string
  observations?: string
  registeredBy?: string
  registeredAt?: string
}

export interface EfficacyEvaluationData {
  isEffective?: boolean
  outcome?: 'EFICAZ' | 'INEFICAZ' | 'NOVO_TESTE_NECESSARIO'
  measuredValue?: string
  actionPlanRequired?: boolean
  actionPlanCode?: string
  actionPlanDescription?: string
  evaluatedBy?: string
  evaluatedAt?: string
  observation?: string
}

/**
 * Dados de Execução Real fornecidos pelo MES 4.0
 */
export interface MesProductionStopItem {
  id?: string
  start_time: string
  end_time: string
  duration_minutes: number
  reason_code: string
  reason_description: string
  impact_level?: 'LEVE' | 'MODERADO' | 'CRITICO'
}

export interface MesExecutionData {
  actual_start_date: string // YYYY-MM-DD
  actual_start_time: string // HH:mm
  actual_end_date: string // YYYY-MM-DD
  actual_end_time: string // HH:mm
  actual_duration_minutes: number
  actual_duration_formatted: string // "2 h 30 min"
  production_line: string
  work_center: string
  production_order: string // Ordem de produção relacionada
  material_code: string
  material_description: string
  quantity_produced: number
  quantity_unit: string
  production_speed?: number // t/h ou m/min
  operator_id?: string
  operator_name?: string
  occurrences: string[] // ocorrências/paradas do período
  stops: MesProductionStopItem[]
  main_stop_reason?: string
  raw_payload?: Record<string, unknown>
}

/**
 * Estrutura da Análise IA para Testes Industriais (Requisito 13)
 * As 7 seções exatas:
 * 1. Principais desvios
 * 2. Evidências
 * 3. Possíveis causas (SEMPRE como hipótese quando não houver causa registrada)
 * 4. Impacto produtivo
 * 5. Recorrência
 * 6. Aprendizados
 * 7. Ações sugeridas
 */
export interface TestAiAnalysisResult {
  principais_desvios: string[]
  evidencias: string[]
  possiveis_causas: string[] // hipóteses
  impacto_produtivo: string[]
  recorrencia: string[]
  aprendizados: string[]
  acoes_sugeridas: string[]
  has_sufficient_data: boolean
  warning_note?: string
  generated_at: string
}

export interface TestProgrammingRecord {
  id: string
  test_id: string // TEST-000123
  request_date: string // YYYY-MM-DD
  expected_date: string // YYYY-MM-DD (mantido para retrocompatibilidade)

  // Período Previsto do Teste (Requisito 1)
  expected_start_date: string // YYYY-MM-DD
  expected_start_time: string // HH:mm
  expected_end_date: string // YYYY-MM-DD
  expected_end_time: string // HH:mm
  expected_duration_minutes?: number
  expected_duration_formatted?: string // "2 h 30 min"

  company: string
  production_line: string
  work_center?: string
  requesting_sector: string
  requester_name: string
  requester_user_id?: string
  technical_lead: string
  industrial_approver?: string
  pcp_approver?: string
  test_type: string
  title: string
  objective: string
  description?: string
  justification: string
  test_category: TestCategory
  dynamic_category_data?: DynamicCategoryData
  schedule_impact_type: ScheduleImpactType
  impact_data?: ScheduleImpactData
  efficacy_criteria?: EfficacyCriteria
  efficacy_eval_timing?: EfficacyEvalTiming
  efficacy_eval_specific_date?: string
  doc_or_target_revision?: RevisionType
  revision_details?: RevisionDetails
  status: TestProgrammingStatus

  // Execução Real - MES 4.0 (Requisito 4)
  mes_integration_status?: MesIntegrationStatus
  mes_execution_data?: MesExecutionData
  mes_last_sync?: string
  mes_sync_message?: string

  // Objetivos Industriais Padronizados & Integração Montagem Semanal
  objectives_list?: string[] // Lista de códigos ou nomes dos objetivos
  other_objective_description?: string
  weekly_schedule_item_id?: string
  weekly_schedule_status?: 'INTEGRADO' | 'SINCRONIZADO' | 'DESVINCULADO' | 'CANCELADO'

  // Análise Previsto x Realizado & IA (Requisitos 6, 12, 13)
  deviation_metrics?: CalculatedDeviations
  ai_analysis_data?: TestAiAnalysisResult

  industrial_approval_decision?: IndustrialApprovalDecision
  pcp_approval_decision?: PcpApprovalDecision
  execution_result?: ExecutionResultData
  efficacy_evaluation?: EfficacyEvaluationData
  created?: string
  updated?: string
}

export type AuditLogOrigin = 'usuário' | 'PCP Robotizado' | 'MES 4.0' | 'integração automática'

export interface IndustrialTestObjective {
  id: string
  code: string // OBJ-01 .. OBJ-37 (e futuros)
  name: string
  description?: string
  is_custom_trigger: boolean
  active: boolean
  created_by?: string
  updated_by?: string
  created?: string
  updated?: string
}

export interface TestProgrammingLogRecord {
  id?: string
  test_programming_id: string
  test_id: string
  date: string // YYYY-MM-DD
  time: string // HH:mm:ss
  user_name: string
  user_id?: string
  user_role?: string
  action: string
  field_changed?: string
  previous_value?: string
  new_value?: string
  origin?: AuditLogOrigin
  integration_name?: string
  operation_result?: string
  center_previous?: string
  center_new?: string
  schedule_previous?: string
  schedule_new?: string
  sync_result?: string
  reason?: string
  metadata?: Record<string, unknown>
  created?: string
  updated?: string
}

export interface TestProgrammingSummaryCardMetrics {
  programados: number
  estaSemana: number
  aguardandoIndustria: number
  aguardandoPcp: number
  emExecucao: number
  aguardandoResultado: number
  aguardandoEficacia: number
  eficazes: number
  ineficazes: number
  necessitamNovoTeste: number
  comAcaoAberta: number
  acoesVencidas: number
}

/**
 * Métricas para os Cards da Área Previsto x Realizado (Requisito 8)
 */
export interface PlannedVsRealizedCardMetrics {
  testesConcluidos: number
  dentroDoPrevistoCount: number
  dentroDoPrevistoPct: number
  comDesvioCount: number
  comDesvioPct: number
  atrasoMedioInicioMinutes: number
  atrasoMedioInicioFormatted: string
  desvioMedioDuracaoMinutes: number
  desvioMedioDuracaoFormatted: string
  tempoExcedenteAcumuladoMinutes: number
  tempoExcedenteAcumuladoFormatted: string
  totalProduzidoPeriodoTons: number
  totalProduzidoPeriodoFormatted: string
}

/**
 * Tipos Oficiais para o Módulo de Programação de Testes Industriais (PCP Robotizado CIAFAL)
 * Ciclo: SOLICITAÇÃO → ANÁLISE → APROVAÇÃO INDUSTRIAL → APROVAÇÃO PCP → PROGRAMAÇÃO → EXECUÇÃO → RESULTADO → RETORNO → AVALIAÇÃO DE EFICÁCIA → REVISÕES → PLANO DE AÇÃO → GESTÃO DE PERFORMANCE → ENCERRAMENTO
 */

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
  // Matéria-prima a testar
  rawMaterialCode: string
  rawMaterialDescription: string
  rawMaterialQuantity: number
  rawMaterialUnit: string
  batchNumber: string
  supplier: string
  // Material produzido
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
  calculatedReductionPercent: number // CALCULADO automaticamente: ((nominal - expected) / nominal) * 100
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
}

export interface TestProgrammingRecord {
  id: string
  test_id: string // TEST-000001
  request_date: string // YYYY-MM-DD
  expected_date: string // YYYY-MM-DD
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
  industrial_approval_decision?: IndustrialApprovalDecision
  pcp_approval_decision?: PcpApprovalDecision
  execution_result?: ExecutionResultData
  efficacy_evaluation?: EfficacyEvaluationData
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
  previous_value?: string
  new_value?: string
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

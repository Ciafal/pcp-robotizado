/**
 * Tipos Oficiais para Gestão de MÚLTIPLAS Restrições Mínimas de Programação por Bitola (1:N)
 * Conforme Requisitos do PCP Robotizado CIAFAL
 */

export type RestrictionType = 'Horas' | 'Dias' | 'Quantidade' | string

export type RestrictionStatus = 'ATIVA' | 'INATIVA'

export interface LineGaugeMinRestriction {
  id: string
  collectionId?: string
  collectionName?: string
  line_id?: string
  line_code: string
  restriction_type: RestrictionType
  min_value: number
  unit_of_measure: string
  rule_description: string
  status: RestrictionStatus
  created_by_name?: string
  updated_by_name?: string
  has_scheduling_history?: boolean
  notes?: string
  created?: string
  updated?: string
}

export interface CreateGaugeMinRestrictionDTO {
  line_id?: string
  line_code: string
  restriction_type: RestrictionType
  min_value: number
  unit_of_measure: string
  rule_description: string
  status?: RestrictionStatus
  created_by_name?: string
  notes?: string
}

export interface UpdateGaugeMinRestrictionDTO extends Partial<CreateGaugeMinRestrictionDTO> {
  updated_by_name?: string
  has_scheduling_history?: boolean
}

/**
 * Resultado da Avaliação Individual de uma Restrição Mínima
 */
export interface RestrictionEvaluationItem {
  restrictionId: string
  restrictionType: RestrictionType
  requiredValue: number
  currentValue: number
  unitOfMeasure: string
  ruleDescription: string
  status: RestrictionStatus
  isSatisfied: boolean
  deficitValue: number
  deficitFormatted: string
  explanation: string
}

/**
 * Resultado Geral da Avaliação de Restrições Mínimas para Troca de Bitola no Centro
 */
export interface GaugeMinRestrictionEvaluation {
  company: string
  line: string
  center: string
  currentGauge: string
  nextGauge?: string
  activeRestrictionsCount: number
  satisfiedCount: number
  pendingCount: number
  allSatisfied: boolean
  overallStatus: 'RESTRIÇÃO MÍNIMA ATENDIDA' | 'RESTRIÇÃO MÍNIMA NÃO ATENDIDA'
  evaluations: RestrictionEvaluationItem[]
  pendingAlertMessage?: string
}

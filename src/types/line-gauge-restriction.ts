/**
 * Tipos Oficiais para Gestão de MÚLTIPLAS Restrições Mínimas de Programação por Bitola (1:N)
 * Conforme Requisitos do PCP Robotizado CIAFAL
 */

export type OfficialRestrictionType =
  | 'Horas'
  | 'Dias'
  | 'Quantidade'
  | 'Carga de Enfornamento'
  | 'Qualidade'
  | 'Montagem'
  | 'Sequenciamento'

export type RestrictionType = OfficialRestrictionType | string

export const RESTRICTION_TYPES: OfficialRestrictionType[] = [
  'Horas',
  'Dias',
  'Quantidade',
  'Carga de Enfornamento',
  'Qualidade',
  'Montagem',
  'Sequenciamento',
]

export const ORDERED_RESTRICTION_TYPES: OfficialRestrictionType[] = RESTRICTION_TYPES

export const RESTRICTION_TYPE_LABELS: Record<OfficialRestrictionType, string> = {
  Horas: 'Horas',
  Dias: 'Dias',
  Quantidade: 'Quantidade',
  'Carga de Enfornamento': 'Carga de Enfornamento',
  Qualidade: 'Qualidade',
  Montagem: 'Montagem',
  Sequenciamento: 'Sequenciamento',
}

export interface RestrictionTypeOption {
  order: number
  value: OfficialRestrictionType
  label: string
  defaultUnit: string
}

export const RESTRICTION_TYPE_OPTIONS: RestrictionTypeOption[] = [
  { order: 1, value: 'Horas', label: 'Horas', defaultUnit: 'h' },
  { order: 2, value: 'Dias', label: 'Dias', defaultUnit: 'dias' },
  { order: 3, value: 'Quantidade', label: 'Quantidade', defaultUnit: 't' },
  { order: 4, value: 'Carga de Enfornamento', label: 'Carga de Enfornamento', defaultUnit: 't' },
  { order: 5, value: 'Qualidade', label: 'Qualidade', defaultUnit: 'peças' },
  { order: 6, value: 'Montagem', label: 'Montagem', defaultUnit: 'h' },
  { order: 7, value: 'Sequenciamento', label: 'Sequenciamento', defaultUnit: 'peças' },
]

export const QUANTITY_UNITS: string[] = ['t', 'peças', 'm', 'kg']

export type RestrictionUnit = 'h' | 'dias' | 't' | 'peças' | 'm' | 'kg' | 'min' | string

export const DEFAULT_UNITS_BY_TYPE: Record<OfficialRestrictionType, string> = {
  Horas: 'h',
  Dias: 'dias',
  Quantidade: 't',
  'Carga de Enfornamento': 't',
  Qualidade: 'peças',
  Montagem: 'h',
  Sequenciamento: 'peças',
}

export const RESTRICTION_RULE_PLACEHOLDERS: Record<OfficialRestrictionType, string> = {
  Horas: 'Ex.: Manter no mínimo 8 horas consecutivas na mesma bitola para viabilidade operacional',
  Dias: 'Ex.: Produzir no mínimo 2 dias na mesma campanha antes de trocar ferramentais',
  Quantidade: 'Ex.: Lote mínimo de 50t para justificar setup e rendimento térmico do forno',
  'Carga de Enfornamento': 'Ex.: Carga mínima de enfornamento de 30t para manter perfil térmico',
  Qualidade:
    'Ex.: Mínimo 10 peças após acerto de bitola para liberação da CQ antes de acelerar ritmo',
  Montagem: 'Ex.: Tempo mínimo de 4h de montagem de cilindros e guias antes de liberar laminação',
  Sequenciamento: 'Ex.: Mínimo 100 barras da bitola base antes de transição para bitola fina',
}

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
  reason?: string
  reason_category?: string
  min_value_numeric?: number
  max_value_numeric?: number
  target_value?: number
  unit?: string
  product_code?: string
  family_code?: string
  gauge_dimension?: string
  steel_grade?: string
  raw_material_code?: string
  origin_center_code?: string
  target_center_code?: string
  product_from?: string
  product_to?: string
  gauge_from?: string
  gauge_to?: string
  valid_from?: string
  valid_until?: string
  rule_priority?: number
  created_by_user_id?: string
  updated_by_user_id?: string
  is_active?: boolean
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
  min_value?: number
  unit_of_measure?: string
  rule_description: string
  status?: RestrictionStatus
  reason?: string
  reason_category?: string
  min_value_numeric?: number
  max_value_numeric?: number
  target_value?: number
  unit?: string
  product_code?: string
  family_code?: string
  gauge_dimension?: string
  steel_grade?: string
  raw_material_code?: string
  origin_center_code?: string
  target_center_code?: string
  product_from?: string
  product_to?: string
  gauge_from?: string
  gauge_to?: string
  valid_from?: string
  valid_until?: string
  rule_priority?: number
  created_by_user_id?: string
  updated_by_user_id?: string
  is_active?: boolean
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

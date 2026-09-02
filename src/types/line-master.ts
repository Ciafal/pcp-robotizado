// Tipos TypeScript para Gestão de Linhas & Ficha Mestre Expandida (Prompt 03.1)
// Ciafal HUB > PCP Robotizado

export type ResourceType = 'LINE' | 'CELL' | 'MACHINE' | 'FURNACE' | 'WORKCENTER'
export type MasterDataStatus = 'ACTIVE' | 'DRAFT' | 'HISTORIC' | 'OBSOLETE'
export type SourceMode = 'MANUAL' | 'SAP'
export type SapStatus = 'CONECTADO' | 'ERRO' | 'NAO_TESTADO' | 'INDISPONIVEL'

export type ProgrammingType =
  | 'Enfornamento'
  | 'Laminação'
  | 'Envio'
  | 'Preparação'
  | 'Acabamento'
  | 'Endireitadeira'
  | 'Inspeção'
  | 'Múltiplo'
  | 'Argola'
  | 'Alto-Forno'
  | 'Aciaria'

export const PROGRAMMING_TYPES_CATALOG: ProgrammingType[] = [
  'Enfornamento',
  'Laminação',
  'Envio',
  'Preparação',
  'Acabamento',
  'Endireitadeira',
  'Inspeção',
  'Múltiplo',
  'Argola',
  'Alto-Forno',
  'Aciaria',
]

export const MULTIPLE_PROGRAMMING_STAGES_CATALOG: ProgrammingType[] = [
  'Enfornamento',
  'Laminação',
  'Envio',
  'Preparação',
  'Acabamento',
  'Endireitadeira',
  'Inspeção',
  'Argola',
  'Alto-Forno',
  'Aciaria',
]

// 1. Linha Produtiva (production_lines)
export interface ProductionLine {
  id: string
  code: string
  name: string
  description?: string
  plant: string
  process: string
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE' | 'CONFIGURING'
  is_active?: boolean
  programming_type?: ProgrammingType | string
  programming_stages?: (ProgrammingType | string)[]
  shifts_summary?: string[]
  crews_summary?: string[]
  nominal_speed?: number
  nominal_speed_unit?: string
  current_rate?: number
  target_rate?: number
  efficiency?: number
  oee?: number
  active_master_id?: string
  // Campos de Integração SAP / MES
  sap_plant_code?: string
  sap_work_center?: string
  sap_equipment_id?: string
  mes_identifier?: string
  notes?: string
  created?: string
  updated?: string
}

// 2. Ficha Mestre da Linha (line_masters)
export interface LineMaster {
  id: string
  line_id: string
  version: number
  status: MasterDataStatus
  resource_type: ResourceType
  unit: string
  sap_plant_code: string
  sector: string
  process_step: string
  // Capacidade
  nominal_hourly_capacity: number
  nominal_shift_capacity: number
  nominal_daily_capacity: number
  nominal_monthly_capacity: number
  capacity_unit: string
  min_batch_size: number
  max_batch_size: number
  planned_efficiency_pct: number
  max_recommended_utilization_pct: number
  programming_type?: ProgrammingType | string
  programming_stages?: (ProgrammingType | string)[]
  // Pulmões
  input_buffer_type?: string
  input_buffer_capacity?: number
  input_buffer_unit?: string
  output_buffer_type?: string
  output_buffer_capacity?: number
  output_buffer_unit?: string
  // Governança & Prontidão
  ready_for_scheduling: boolean
  completeness_score: number
  change_reason?: string
  approved_by?: string
  approved_at?: string
  created?: string
  updated?: string
  // Relações expandidas
  expand?: {
    line_id?: ProductionLine
    approved_by?: { id: string; name?: string; email: string }
  }
}

// 3. Catálogo de Integrações SAP (sap_integration_catalog)
export interface SapIntegrationDefinition {
  id: string
  code: string
  description: string
  integration_type: 'RFC_BAPI' | 'IDOC' | 'ODATA' | 'PI_PO' | 'SAP_DIRECT_TABLE' | 'OTHER'
  function_name: string
  standard_or_z: 'STANDARD' | 'Z_CUSTOM'
  source_object?: string
  input_mapping?: Record<string, unknown>
  output_mapping?: Record<string, unknown>
  active: boolean
  last_test?: string
  last_status: SapStatus
  last_sync_records_count?: number
  last_error_message?: string
  technical_responsible?: string
  homologation_date?: string
  environment?: string
  system_version?: string
  created?: string
  updated?: string
}

// 4. Hierarquia Organizacional Associada (line_org_hierarchy)
export interface LineOrgHierarchy {
  id: string
  line_id: string
  org_level_name: string
  org_level_order: number
  area_name: string
  job_title: string
  user_id?: string
  substitute_user_id?: string
  integration_status?: 'CONECTADO_HUB' | 'AGUARDANDO_INTEGRACAO_HUB'
  active: boolean
  notes?: string
  created?: string
  updated?: string
  expand?: {
    user_id?: { id: string; name?: string; email: string }
    substitute_user_id?: { id: string; name?: string; email: string }
  }
}

// 5. Gestores da Linha (line_managers_assignment)
export interface LineManagerAssignment {
  id: string
  line_id: string
  user_id: string
  responsibility_type: 'PRIMARY_MANAGER' | 'SUBSTITUTE_MANAGER' | 'ADDITIONAL_MANAGER'
  role_title: string
  valid_from?: string
  valid_until?: string
  scope_description?: string
  active: boolean
  created?: string
  updated?: string
  expand?: {
    user_id?: { id: string; name?: string; email: string; avatar?: string }
  }
}

// 6. Matriz de Aprovadores (line_approvers_matrix)
export interface LineApproverMatrix {
  id: string
  line_id: string
  approval_type:
    | 'PCP_APPROVAL'
    | 'LINE_MANAGER_APPROVAL'
    | 'QUALITY_APPROVAL'
    | 'EXECUTIVE_APPROVAL'
  approval_stage: 'STAGE_1_PCP' | 'STAGE_2_LINE_MANAGER' | 'STAGE_3_QUALITY' | 'STAGE_4_DIRECTOR'
  sequence_order: number
  user_id: string
  role_title: string
  requirement_type: 'MANDATORY' | 'OPTIONAL' | 'BY_RULE' | 'NOT_APPLICABLE'
  substitute_user_id?: string
  valid_from?: string
  valid_until?: string
  active: boolean
  created?: string
  updated?: string
  expand?: {
    user_id?: { id: string; name?: string; email: string }
    substitute_user_id?: { id: string; name?: string; email: string }
  }
}

// 7. Sequenciamento e Dependências de Processo (line_sequencing_dependencies)
export interface LineSequencingDependency {
  id: string
  line_id: string
  previous_process_name?: string
  previous_line_id?: string
  next_process_name?: string
  next_line_id?: string
  sequence_order: number
  relation_nature: 'MANDATORY' | 'OPTIONAL' | 'BYPASS_ALLOWED' | 'PARALLEL'
  dependency_type:
    | 'FINISH_TO_START'
    | 'START_TO_START'
    | 'FINISH_TO_FINISH'
    | 'TRANSFER_BATCH'
    | 'BUFFER_REQUIRED'
  standard_lead_time_minutes?: number
  intermediate_buffer_type?: string
  intermediate_buffer_capacity?: number
  intermediate_buffer_unit?: string
  notes?: string
  active: boolean
  created?: string
  updated?: string
  expand?: {
    previous_line_id?: ProductionLine
    next_line_id?: ProductionLine
  }
}

// 8. Produtividade por Material / Dimensão (line_productivity_rates)
export interface LineProductivityRate {
  id: string
  line_id: string
  line_master_id?: string
  product_family_id?: string
  material_product_code: string
  material_product_name: string
  dimension_spec?: string
  productivity_unit: 't/h' | 'peça/h' | 'm/h'
  nominal_productivity: number
  planned_productivity: number
  expected_efficiency_pct?: number
  source_mode: SourceMode
  sap_integration_id?: string
  valid_from?: string
  valid_until?: string
  notes?: string
  active: boolean
  created?: string
  updated?: string
  expand?: {
    product_family_id?: ProductFamily
    sap_integration_id?: SapIntegrationDefinition
  }
}

// 9. Prioridades de Matéria-Prima (line_raw_material_priorities)
export interface LineRawMaterialPriority {
  id: string
  line_id: string
  line_master_id?: string
  material_code: string
  material_description: string
  material_group?: string
  product_family_id?: string
  material_origin?: string
  priority_order: number // 1 = Máxima prioridade
  condition_rule?: string
  source_mode: SourceMode
  sap_integration_id?: string
  valid_from?: string
  valid_until?: string
  active: boolean
  created?: string
  updated?: string
  expand?: {
    product_family_id?: ProductFamily
    sap_integration_id?: SapIntegrationDefinition
  }
}

// 10. Produtos Bloqueados (line_blocked_products)
export type BlockType =
  | 'TOTAL'
  | 'TEMPORARY'
  | 'QUALITY'
  | 'TECHNICAL'
  | 'CAPACITY'
  | 'PROCESS'
  | 'OTHER'

export interface LineBlockedProduct {
  id: string
  line_id: string
  line_master_id?: string
  product_code: string
  product_description: string
  product_family_id?: string
  block_reason: string
  block_type: BlockType
  responsible_user_id?: string
  source_mode: SourceMode
  sap_integration_id?: string
  valid_from?: string
  valid_until?: string
  active: boolean
  created?: string
  updated?: string
  expand?: {
    product_family_id?: ProductFamily
    responsible_user_id?: { id: string; name?: string; email: string }
    sap_integration_id?: SapIntegrationDefinition
  }
}

// 11. Matriz De -> Para de Setup (line_setup_matrix)
export interface LineSetupMatrix {
  id: string
  line_id: string
  line_master_id?: string
  setup_code: string
  setup_description: string
  setup_category:
    | 'TOOL_CHANGE'
    | 'DIMENSION_CHANGE'
    | 'MATERIAL_CHANGE'
    | 'COLOR_CHANGE'
    | 'CLEANING_SETUP'
    | 'HEATING_CYCLE'
    | 'OTHER'
  from_family_id?: string
  to_family_id?: string
  from_product_code?: string
  to_product_code?: string
  setup_duration_minutes: number
  capacity_loss_impact?: string
  source_mode: SourceMode
  sap_integration_id?: string
  valid_from?: string
  valid_until?: string
  active: boolean
  created?: string
  updated?: string
  expand?: {
    from_family_id?: ProductFamily
    to_family_id?: ProductFamily
    sap_integration_id?: SapIntegrationDefinition
  }
}

// 12. Demais entidades existentes preservadas
export interface ProductionShift {
  id: string
  line_id: string
  line_master_id?: string
  code: string
  name: string
  description?: string
  sequence_order?: number
  start_time: string
  end_time: string
  duration_hours: number
  break_minutes?: number
  applicable_days?: string[]
  crosses_midnight?: boolean
  is_special_shift?: boolean
  active: boolean
  valid_from?: string
  valid_until?: string
  created?: string
  updated?: string
  expand?: {
    line_id?: ProductionLine
  }
}

// 12.1. Turmas Operacionais por Linha (production_crews)
export interface ProductionCrew {
  id: string
  line_id: string
  code: string
  name: string
  description?: string
  active: boolean
  valid_from?: string
  valid_until?: string
  notes?: string
  created?: string
  updated?: string
  expand?: {
    line_id?: ProductionLine
  }
}

// 12.2. Associação Turno × Turma por Linha (production_shift_crews)
export interface ProductionShiftCrew {
  id: string
  line_id: string
  shift_id: string
  crew_id: string
  day_of_week?: string
  active: boolean
  notes?: string
  created?: string
  updated?: string
  expand?: {
    line_id?: ProductionLine
    shift_id?: ProductionShift
    crew_id?: ProductionCrew
  }
}

export interface ProductionCalendar {
  id: string
  line_id: string
  year: number
  month: number
  operating_days_count: number
  work_saturdays: boolean
  work_sundays: boolean
  work_holidays: boolean
  holidays_dates?: string[]
  active: boolean
  created?: string
}

export interface ProductFamily {
  id: string
  code: string
  name: string
  standard_efficiency_pct: number
  nominal_hourly_rate: number
  active: boolean
}

export interface LineCapability {
  id: string
  line_id: string
  product_family_id: string
  product_type: string
  min_dimension_mm?: number
  max_dimension_mm?: number
  min_thickness_mm?: number
  max_thickness_mm?: number
  min_length_mm?: number
  max_length_mm?: number
  min_weight_kg?: number
  max_weight_kg?: number
  specific_capacity?: number
  status: 'QUALIFIED' | 'EXPERIMENTAL' | 'BLOCKED'
  qualification_date?: string
  active: boolean
  expand?: {
    product_family_id?: ProductFamily
  }
}

export interface LineSetup {
  id: string
  line_id: string
  code: string
  description: string
  category: string
  standard_duration_minutes: number
  affected_resource: string
  setup_type: string
  active: boolean
}

export interface StandardScheduledStop {
  id: string
  line_id: string
  code: string
  description: string
  category:
    | 'PREVENTIVE'
    | 'TOOLING_CHANGE'
    | 'CLEANING'
    | 'MEETING'
    | 'SHIFT_TRANSITION'
    | 'LUBRICATION'
  recurrence: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'PER_SHIFT'
  expected_duration_minutes: number
  scheduled_time: string
  applicable_shift?: string
  impact: string
  source_mode?: SourceMode
  sap_integration_id?: string
  valid_from?: string
  valid_until?: string
  active: boolean
}

export interface LineStructuralConstraint {
  id: string
  line_id: string
  code: string
  title: string
  classification: 'TECHNICAL' | 'PROCESS' | 'CAPACITY' | 'PHYSICAL' | 'SAFETY'
  parameter_name: string
  unit: string
  min_value?: number
  max_value?: number
  description: string
  impact: string
  active: boolean
}

export interface LineRulePackRef {
  id: string
  line_id: string
  rule_pack_code: string
  rule_pack_name: string
  version: string
  status: 'ACTIVE' | 'DRAFT' | 'TESTING'
  assigned_date: string
}

export interface LineAuditVersion {
  id: string
  line_id: string
  line_master_id: string
  version: number
  action: 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'READY_CHECK' | 'SOURCE_CHANGE'
  changed_fields: string[]
  changed_by: string
  change_reason: string
  snapshot_data: Record<string, unknown>
  created: string
  expand?: {
    changed_by?: { id: string; name?: string; email: string }
  }
}

// Visão Consolidada da Linha (DTO de UI)
export interface LineOverviewData {
  line: ProductionLine
  master?: LineMaster | null
  hierarchy: LineOrgHierarchy[]
  managers: LineManagerAssignment[]
  approvers: LineApproverMatrix[]
  sequencing: LineSequencingDependency[]
  shifts: ProductionShift[]
  crews?: ProductionCrew[]
  shiftCrews?: ProductionShiftCrew[]
  calendar?: ProductionCalendar | null
  capabilities: LineCapability[]
  productivity: LineProductivityRate[]
  rawMaterials: LineRawMaterialPriority[]
  blockedProducts: LineBlockedProduct[]
  setups: LineSetup[]
  setupMatrix: LineSetupMatrix[]
  scheduledStops: StandardScheduledStop[]
  constraints: LineStructuralConstraint[]
  rulePacks: LineRulePackRef[]
  history: LineAuditVersion[]
  alerts: LineConfigurationAlert[]
  completeness: number
  readyForScheduling: boolean
}

export interface LineConfigurationAlert {
  id: string
  level: 'CRITICAL' | 'WARNING' | 'INFO'
  category: 'GOVERNANCE' | 'ORGANIZATION' | 'PROCESS' | 'CAPACITY' | 'INTEGRATION'
  title: string
  description: string
  resolutionAction?: string
}

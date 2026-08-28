export type ResourceType =
  | 'PRODUCTION_LINE'
  | 'FURNACE'
  | 'FINISHING'
  | 'STRAIGHTENER'
  | 'REWORK'
  | 'AUXILIARY_PROCESS'
  | 'STORAGE'
  | 'OTHER'

export type CapacityUnit = 't/h' | 't' | 'kg' | 'peça' | 'm' | 'mm' | 'h' | 'min'

export type VersionStatus = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'INACTIVE'

export type SourceType =
  | 'MANUAL_CONFIG'
  | 'SAP'
  | 'ENGINEERING'
  | 'PCP_RULE'
  | 'IMPORTED'
  | 'SYSTEM'

export type ConstraintClassification =
  | 'PHYSICAL_LIMIT'
  | 'CAPACITY_LIMIT'
  | 'DIMENSIONAL_LIMIT'
  | 'MATERIAL_COMPATIBILITY'
  | 'OPERATIONAL_LIMIT'
  | 'OTHER_STRUCTURAL'

export type StopCategory =
  | 'PREVENTIVE_MAINTENANCE'
  | 'CLEANING'
  | 'CALIBRATION'
  | 'TOOL_CHANGE'
  | 'INSPECTION'
  | 'OPERATIONAL_BREAK'
  | 'OTHER'

export type StopRecurrence =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'PER_SHIFT'
  | 'PER_BATCH'
  | 'CUSTOM'

export type SetupCategory =
  | 'TOOL_CHANGE'
  | 'DIMENSION_CHANGE'
  | 'MATERIAL_CHANGE'
  | 'COLOR_CHANGE'
  | 'CLEANING_SETUP'
  | 'HEATING_CYCLE'
  | 'OTHER'

export type SetupType = 'INTERNAL' | 'EXTERNAL' | 'COMBINED'

export type CapabilityStatus = 'ALLOWED' | 'RESTRICTED' | 'PROHIBITED' | 'UNDER_TEST'

export interface ProductFamily {
  id: string
  code: string
  name: string
  description?: string
  category?: string
  active: boolean
  created?: string
  updated?: string
}

export interface LineMaster {
  id: string
  line_id: string
  version: number
  status: VersionStatus

  // Identificação estrutural
  code: string
  name: string
  description?: string
  resource_type: ResourceType
  unit: string
  sap_plant_code?: string
  sector?: string
  process_step?: string

  // Responsáveis
  primary_responsible_id?: string
  substitute_responsible_id?: string

  // Capacidade produtiva estrutural
  capacity_unit: CapacityUnit
  nominal_hourly_capacity: number
  nominal_shift_capacity?: number
  nominal_daily_capacity?: number
  nominal_monthly_capacity?: number
  planned_efficiency_pct?: number
  max_recommended_utilization_pct?: number
  min_batch_size?: number
  max_batch_size?: number
  capacity_notes?: string

  // Estoques intermediários / Buffer
  input_buffer_type?: string
  input_buffer_capacity?: number
  input_buffer_unit?: string
  output_buffer_type?: string
  output_buffer_capacity?: number
  output_buffer_unit?: string

  // Dependências industriais (Resumo)
  upstream_line_id?: string
  downstream_line_id?: string
  dependency_notes?: string

  // Governança e Vigência
  valid_from?: string
  valid_until?: string
  source_type?: SourceType
  author_id?: string
  author_email?: string
  change_reason: string
  technical_notes?: string
  diff_payload?: Record<string, { before: any; after: any }>

  // Indicadores calculados
  completeness_score: number
  ready_for_scheduling: boolean
  missing_requirements?: string[]

  created?: string
  updated?: string

  // Expansões úteis
  expand?: {
    line_id?: any
    primary_responsible_id?: any
    substitute_responsible_id?: any
    upstream_line_id?: any
    downstream_line_id?: any
  }
}

export interface ProductionShift {
  id: string
  line_id: string
  line_master_id?: string
  name: string
  code: string
  start_time: string // HH:MM
  end_time: string // HH:MM
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
}

export interface ProductionCalendar {
  id: string
  line_id: string
  line_master_id?: string
  year: number
  month?: number
  operating_days_count?: number
  work_saturdays?: boolean
  work_sundays?: boolean
  work_holidays?: boolean
  holidays_dates?: string[]
  scheduled_shutdown_periods?: any[]
  special_schedules?: any[]
  active: boolean
  notes?: string
  created?: string
  updated?: string
}

export interface StandardScheduledStop {
  id: string
  line_id: string
  line_master_id?: string
  code: string
  description: string
  category: StopCategory
  recurrence: StopRecurrence
  expected_duration_minutes: number
  scheduled_time?: string
  applicable_shift?: string
  applicable_days?: string[]
  expected_impact?: string
  active: boolean
  valid_from?: string
  valid_until?: string
  created?: string
  updated?: string
}

export interface LineSetup {
  id: string
  line_id: string
  line_master_id?: string
  code: string
  description: string
  category: SetupCategory
  standard_duration_minutes: number
  affected_resource?: string
  setup_type?: SetupType
  from_family_id?: string
  to_family_id?: string
  technical_notes?: string
  active: boolean
  valid_from?: string
  valid_until?: string
  created?: string
  updated?: string
  expand?: {
    from_family_id?: ProductFamily
    to_family_id?: ProductFamily
  }
}

export interface LineCapability {
  id: string
  line_id: string
  line_master_id?: string
  product_family_id: string
  product_type?: string
  section_type?: string
  status: CapabilityStatus

  min_dimension_mm?: number
  max_dimension_mm?: number
  min_thickness_mm?: number
  max_thickness_mm?: number
  min_length_mm?: number
  max_length_mm?: number
  min_weight_kg?: number
  max_weight_kg?: number

  specific_capacity?: number
  specific_capacity_unit?: string
  operating_conditions?: string
  technical_notes?: string
  active: boolean
  created?: string
  updated?: string
  expand?: {
    product_family_id?: ProductFamily
  }
}

export interface LineStructuralConstraint {
  id: string
  line_id: string
  line_master_id?: string
  code: string
  title: string
  classification: ConstraintClassification
  parameter_name: string
  unit: string
  min_value?: number
  max_value?: number
  description: string
  impact?: string
  active: boolean
  valid_from?: string
  valid_until?: string
  created?: string
  updated?: string
}

export interface LineRulePackRef {
  id: string
  line_id: string
  rule_pack_code: string
  rule_pack_name: string
  version: string
  status: string
  rules_count?: number
  source?: string
  valid_from?: string
  valid_until?: string
  created?: string
  updated?: string
}

export interface FullLineMasterBundle {
  line: any
  activeMaster: LineMaster | null
  versions: LineMaster[]
  shifts: ProductionShift[]
  calendar: ProductionCalendar | null
  stops: StandardScheduledStop[]
  setups: LineSetup[]
  capabilities: LineCapability[]
  constraints: LineStructuralConstraint[]
  rulePacks: LineRulePackRef[]
  families: ProductFamily[]
}

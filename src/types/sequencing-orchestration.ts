// Tipos conceituais e contratos de dados para o Sequenciamento e Orquestração Fina (Prompt 04)

export type RouteStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'INACTIVE'
  | 'SUPERSEDED'

export type EdgeRelationType = 'MANDATORY' | 'OPTIONAL' | 'ALTERNATIVE' | 'PARALLEL' | 'CONDITIONAL'

export type BufferPhysicalType = 'BUFFER_FISICO' | 'BUFFER_OPERACIONAL' | 'BUFFER_SEGURANCA'

export type CapacityPeriodType = 'SHIFT' | 'DAY' | 'WEEK' | 'MONTH'

export type BottleneckRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type DataSourceClassification =
  | 'ESTIMATED_MOCK'
  | 'MANUAL_AUDITED'
  | 'MES_40_INTEGRATED'
  | 'SAP_CONFIRMED'

export interface ProductionRouteNode {
  id?: string
  route_id?: string
  line_id: string
  line_code: string
  process_name: string
  logical_order: number
  nominal_rate?: number
  capacity_unit?: string // ex: t/h, peça/h, m/h
  input_buffer_min?: number
  input_buffer_max?: number
  output_buffer_min?: number
  output_buffer_max?: number
  conditions_json?: Record<string, unknown>
  created?: string
  updated?: string
}

export interface ProductionRouteEdge {
  id?: string
  route_id?: string
  origin_line_code: string
  target_line_code: string
  relation_type: EdgeRelationType
  priority: number
  is_precedence_mandatory: boolean
  lead_time_minutes: number
  buffer_min_tons: number
  buffer_max_tons: number
  buffer_target_tons: number
  buffer_physical_type: BufferPhysicalType
  buffer_unit: string
  current_buffer_stock: number
  projected_buffer_stock: number
  condition_expression?: string
  status: RouteStatus
  created?: string
  updated?: string
}

export interface ProductionRoute {
  id: string
  code: string
  description: string
  product_code?: string
  family_id?: string
  family_code?: string
  version: number
  status: RouteStatus
  active: boolean
  valid_from?: string
  valid_until?: string
  preferred: boolean
  author_id?: string
  author_name?: string
  change_reason?: string
  metadata?: Record<string, unknown>
  nodes?: ProductionRouteNode[]
  edges?: ProductionRouteEdge[]
  created?: string
  updated?: string
}

export interface ProductionCapacityLog {
  id: string
  line_id: string
  line_code: string
  period_type: CapacityPeriodType
  period_ref: string
  unit: string // t, t/h, peça, m
  nominal_capacity: number
  // Perdas planejadas
  planned_stops_loss: number
  planned_setup_loss: number
  planned_calendar_loss: number
  other_planned_loss: number
  programmable_capacity: number // Nominal - perdas planejadas
  // Perdas durante execução (reais)
  unplanned_stops_loss: number
  unplanned_setup_loss: number
  maintenance_loss: number
  material_shortage_loss: number
  quality_defect_loss: number
  bottleneck_loss: number
  operational_loss: number
  other_execution_loss: number
  realized_capacity: number // Programmable - perdas de execução
  total_lost_capacity: number
  utilization_pct: number
  efficiency_pct: number
  bottleneck_risk: BottleneckRiskLevel
  data_source: DataSourceClassification
  created?: string
  updated?: string
}

export interface RouteProductQueryResult {
  product: string
  family?: string
  validRoutes: ProductionRoute[]
  preferredRoute: ProductionRoute | null
  constraints: {
    code: string
    type: 'CAPACITY' | 'DIMENSIONAL' | 'LEAD_TIME' | 'BUFFER' | 'SCOPE'
    description: string
    severity: 'BLOCK' | 'WARNING' | 'INFO'
    line_code?: string
  }[]
  warnings: string[]
}

export interface BufferAlert {
  edgeId?: string
  origin_line_code: string
  target_line_code: string
  buffer_type: BufferPhysicalType
  current_stock: number
  min_stock: number
  max_stock: number
  target_stock: number
  unit: string
  severity: 'WARNING' | 'CRITICAL' | 'NORMAL'
  alert_type:
    | 'ABOVE_MAX'
    | 'BELOW_MIN'
    | 'DEPLETION_RISK'
    | 'SATURATION_RISK'
    | 'UPSTREAM_BOTTLENECK'
    | 'DOWNSTREAM_BOTTLENECK'
    | 'BALANCED'
  message: string
}

export interface RouteValidationFeedback {
  isValid: boolean
  canBeUsedOfficially: boolean
  routeCode: string
  version: number
  status: RouteStatus
  errors: string[]
  warnings: string[]
  bottleneckSummary: {
    lineCode: string
    nominalRate: number
    programmableRate: number
    utilizationPct: number
    risk: BottleneckRiskLevel
  }[]
}

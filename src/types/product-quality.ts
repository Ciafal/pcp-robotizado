// Tipos TypeScript homologados para Classificação MTS/MTO, Ficha de Requisitos e Qualidade do Produto CIAFAL

export type ProductionClassification = 'MTS' | 'MTO'

export type RequirementConditionType = 'SIM' | 'NAO' | 'CONDICIONAL'

export type InspectionType =
  | 'ULTRASSOM'
  | 'ENSAIO_TRACAO'
  | 'ENSAIO_DOBRAMENTO'
  | 'DUREZA'
  | 'IMPACTO'
  | 'ANALISE_QUIMICA'
  | 'METALOGRAFIA'
  | 'INSPECAO_DIMENSIONAL'
  | 'INSPECAO_SUPERFICIAL'
  | 'TOTAL_CONSOLIDADO'
  | 'OUTROS'

export type QualityDemandStatus =
  | 'PREVISTA'
  | 'PROGRAMADA'
  | 'DISPONIVEL_INSPECAO'
  | 'EM_INSPECAO'
  | 'APROVADA'
  | 'REPROVADA'
  | 'PENDENTE'
  | 'LIBERADA'

export type QualityPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'

export type RequirementValidationStatus =
  | 'VALIDADO'
  | 'PENDENCIA_VALIDACAO'
  | 'CONFLITO_REQUISITOS'
  | 'EM_ANALISE'

// 1. Cadastro Mestre / Catálogo de Requisitos de Qualidade do Produto
export interface ProductQualityRequirement {
  id: string
  product_code: string
  product_name: string
  family_code?: string
  production_type: ProductionClassification
  ultrasound_requirement: RequirementConditionType
  ultrasound_condition_rule?: string
  mechanical_test_requirement: RequirementConditionType
  mechanical_test_condition_rule?: string
  mechanical_test_types?: ('TRACAO' | 'DOBRAMENTO' | 'DUREZA' | 'IMPACTO')[]
  applicable_standards?: string
  is_blocking_default?: boolean
  standard_sample_count?: number
  estimated_inspection_hours?: number
  responsible_laboratory?: string
  technical_specifications?: Record<string, any>
  active: boolean
  created?: string
  updated?: string
}

// 2. Ficha Completa de Requisitos do Pedido MTO (e rastreabilidade hierárquica)
export interface OrderRequirementSheet {
  id: string
  sheet_code: string
  order_number: string
  customer_name: string
  customer_code?: string
  sales_order_sap: string
  sales_order_item: string
  material_code: string
  material_description: string
  production_type: ProductionClassification
  quantity_tons: number
  quantity_units?: number
  unit_of_measure?: string
  order_date?: string
  desired_delivery_date: string
  confirmed_delivery_date?: string
  commercial_priority?: string
  sales_representative?: string

  // Requisitos Dimensionais
  nominal_dimension?: string
  dimensional_tolerances?: string
  length_meters?: number
  weight_kg_per_piece?: number
  dimensional_notes?: string

  // Requisitos Técnicos
  technical_standard?: string
  steel_grade?: string
  chemical_composition_reqs?: {
    C_max?: number
    Mn_max?: number
    P_max?: number
    S_max?: number
    Si_max?: number
    [key: string]: any
  }
  mechanical_properties_reqs?: {
    LE_min_MPa?: number
    LR_min_MPa?: number
    LR_MPa?: string
    Along_min_pct?: number
    Impact_J_min?: number
    [key: string]: any
  }
  heat_treatment?: string
  surface_finish_condition?: string
  packaging_requirements?: string
  marking_identification?: string
  traceability_level?: string

  // Requisitos de Qualidade
  mandatory_inspections?: string[]
  requires_ultrasound?: boolean
  ultrasound_standard?: string
  requires_mechanical_tests?: boolean
  mechanical_tests_detail?: {
    tração?: boolean
    dobramento?: boolean
    dureza?: boolean
    impacto?: boolean
    [key: string]: any
  }
  requires_chemical_analysis?: boolean
  requires_metallography?: boolean
  requires_dimensional_inspection?: boolean
  requires_surface_inspection?: boolean
  quality_certificates_required?: string[]
  special_customer_requirements?: string

  // Rastreabilidade de Origem
  requirements_sources_traceability?: {
    cadastro_mestre?: string
    cadastro_cliente?: string
    material?: string
    pedido_sap?: string
    item_pedido?: string
    especificacoes_internas?: string
    normas_tecnicas?: string
    documentos_qualidade?: string
    [key: string]: string | undefined
  }

  // Validação e Governança
  validation_status: RequirementValidationStatus
  validation_pendency_details?: string
  assigned_validator_id?: string
  validated_at?: string
  version?: number
  created?: string
  updated?: string
}

// 3. Demanda de Ultrassom / Ensaios Mecânicos / Inspeções para a Qualidade
export interface QualityInspectionDemand {
  id: string
  demand_code: string
  inspection_type: InspectionType
  line_code: string
  line_id?: string
  schedule_code?: string
  schedule_id?: string
  production_order_number: string
  sales_order_sap?: string
  sales_order_item?: string
  customer_name?: string
  product_code: string
  product_description: string
  production_type: ProductionClassification
  quantity_tons: number
  sample_count?: number
  batch_number?: string
  planned_production_date: string
  planned_inspection_date: string
  estimated_duration_hours?: number
  applicable_standard?: string
  inspection_requirement_details?: string
  acceptance_criteria?: string
  is_blocking_release: boolean
  priority: QualityPriority
  status: QualityDemandStatus
  laboratory_equipment?: string
  inspector_user_id?: string
  inspector_name?: string
  inspected_at?: string
  result_notes?: string
  certificate_number?: string
  certificate_url?: string
  non_conformity_reason?: string
  corrective_action?: string
  reschedule_history?: {
    previous_date: string
    new_date: string
    reason: string
    rescheduled_by: string
    rescheduled_at: string
  }[]
  audit_log?: {
    event: string
    by: string
    at: string
    details: string
  }[]
  created?: string
  updated?: string
}

// 4. Planejamento de Capacidade dos Laboratórios e Qualidade
export interface QualityCapacityPlanning {
  id: string
  period_ref: string
  laboratory_or_line: string
  inspection_type: InspectionType
  planned_tests_count: number
  planned_hours: number
  available_capacity_hours: number
  daily_capacity_tests_limit?: number
  utilization_pct: number
  has_overload: boolean
  overload_details?: string
  ai_capacity_alerts?: string[]
  ai_suggested_rearrangements?: string[]
  created?: string
  updated?: string
}

// 5. Diagnóstico de Pré-Programação da IA Analista (Qualidade & MTS/MTO)
export interface QualityPreProgramAnalysis {
  scheduleCode: string
  totalItems: number
  mtsCount: number
  mtoCount: number
  ultrasoundDemandsCount: number
  mechanicalTestsCount: number
  totalInspectionHoursNeeded: number
  requirementsFound: {
    title: string
    category: 'MTS' | 'MTO' | 'ULTRASSOM' | 'ENSAIO_MECANICO' | 'INSPECAO' | 'NORMA'
    description: string
    count: number
  }[]
  risksIdentified: {
    id: string
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    title: string
    description: string
    affectedOrders: string[]
    blockingReleaseRisk: boolean
    suggestedAction: string
  }[]
  recommendations: {
    id: string
    type: 'REARRANGE_SEQUENCE' | 'SPLIT_LAB_SHIFT' | 'VALIDATE_REQUIREMENT' | 'STOCK_SAFETY_ADJUST'
    title: string
    description: string
    impactTons: number
    gainHours: number
  }[]
  isConsistencyApproved: boolean
  hardBlockCount: number
}

// Tipos e Interfaces para o Módulo de Gestão de Estoques e Projeção por Linha (Prompt 06)

export type InventoryCategory = 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_GOOD' | 'OTHER'

export type InventorySourceMode = 'SAP' | 'MANUAL'

export type SapFunctionType = 'STANDARD' | 'Z_CUSTOM'

export type StockProjectionStatus =
  | 'BELOW_MINIMUM'
  | 'ABOVE_MAXIMUM'
  | 'RISK_OF_STOCKOUT'
  | 'RISK_OF_OVERFLOW'
  | 'TARGET_RANGE'
  | 'WAITING_TIME_CONSTRAINT'
  | 'UPSTREAM_SHORTAGE'
  | 'DOWNSTREAM_CONSTRAINT'

export type FlowDirection = 'INPUT' | 'OUTPUT'

export type FlowType =
  | 'UPSTREAM_PRODUCTION'
  | 'SAP_STOCK'
  | 'SEMI_FINISHED_BUFFER'
  | 'REWORK'
  | 'TRANSFER'
  | 'FUTURE_SCHEDULE'
  | 'LINE_CONSUMPTION'
  | 'LINE_PRODUCTION'
  | 'EXPEDITION'
  | 'DOWNSTREAM_PROCESS'

// ==========================================
// 1. Gestão de Estoques (SAP Read-Only / Operational Cache)
// ==========================================

export interface InventoryItem {
  id: string
  plant_code: string // Centro SAP (ex: 1000 - Divinópolis)
  plant_name?: string
  storage_location: string // Depósito SAP (ex: 0001, DEP-MP-01)
  storage_location_name?: string
  material_code: string
  material_description: string
  category: InventoryCategory
  family_code?: string
  batch_number?: string
  unit: string // 't', 'kg', 'peça', 'm' (peso SEMPRE 't')
  qty_unrestricted: number // Quantidade Disponível
  qty_blocked: number // Quantidade Bloqueada
  qty_in_quality: number // Em Controle de Qualidade
  qty_reserved: number // Reservado para OPs
  qty_total: number // Estoque Total
  min_stock?: number
  target_stock?: number
  max_stock?: number
  source_mode: InventorySourceMode
  sap_function_type?: SapFunctionType
  sap_function_name?: string
  last_sync: string
  sync_status?: 'SYNCED' | 'WARNING' | 'ERROR' | 'MANUAL'
  consumer_line_code?: string
  producer_line_code?: string
  created?: string
  updated?: string
}

export interface InventorySnapshot {
  id: string
  snapshot_timestamp: string
  plant_code: string
  storage_location: string
  material_code: string
  category: string
  batch_number?: string
  qty_total: number
  unit: string
  source_type: string
  source_function?: string
  records_count?: number
}

export interface InventoryKPIs {
  rawMaterialTons: number // MP (t)
  semiFinishedTons: number // Semiacabado (t)
  finishedGoodsTons: number // Acabado (t)
  itemsBelowMinCount: number
  itemsAboveMaxCount: number
  itemsZeroStockCount: number
  totalItemsCount: number
  lastSyncTime: string
  sapConnected: boolean
}

// ==========================================
// 2. Motor de Projeção de Estoque por Linha
// ==========================================

export interface ProjectionFlowDefinition {
  id: string
  name: string
  direction: FlowDirection
  flowType: FlowType
  sourceOrTargetLineCode?: string
  storageLocationCode?: string
  fixedRatePerHourOrDay?: number
  multiplier?: number
  coolingTimeHours?: number // Tempo de espera/resfriamento
  isScheduleDependent: boolean
  description?: string
  active: boolean
}

export interface CalendarSpecificStockRule {
  dayOfWeek: number // 0 = Domingo, 5 = Sexta
  dayName: string
  customMinTons?: number
  customTargetTons?: number
  customMaxTons?: number
  description?: string
}

export interface LineProjectionConfig {
  id?: string
  line_id?: string
  line_code: string
  horizon_days: number
  initial_stock_tons: number
  unit: string // 't'
  min_stock_limit: number
  target_stock_limit: number
  max_stock_limit: number
  friday_target_stock_limit?: number
  cooling_time_hours?: number
  cooling_rules_payload?: {
    familyCode?: string
    productCode?: string
    requiredCoolingHours: number
    notes?: string
  }[]
  calendar_rules_payload?: CalendarSpecificStockRule[]
  input_flow_definitions: ProjectionFlowDefinition[]
  output_flow_definitions: ProjectionFlowDefinition[]
  hourly_productivity_rate: number // t/h
  operating_hours_per_day: number // Horas por dia (ex: 21h em 3 turnos de 7h)
  active: boolean
  version: number
}

export interface ProjectionInputItemDetail {
  id: string
  originLine: string
  scheduleCode?: string
  orderNumber?: string
  materialCode: string
  materialDescription: string
  quantityTons: number
  scheduledTime: string
  coolingUntil?: string
  isPhysicallyAvailable: boolean
  isProcessReady: boolean
  sourceSystem: 'SAP' | 'PCP_PROGRAMACAO' | 'MANUAL'
}

export interface DailyProjectionRow {
  date: string
  dayOfWeekName: string
  dayIndex: number
  initialStockTons: number
  inputTonsTotal: number
  availableInputTons: number // Excluindo material em resfriamento
  coolingWaitingTons: number // Em resfriamento
  outputConsumptionTons: number
  finalStockTons: number
  minLimitTons: number
  targetLimitTons: number
  maxLimitTons: number
  status: StockProjectionStatus
  operatingHours: number
  productivityRate: number
  inputDetails: ProjectionInputItemDetail[]
  alerts: string[]
}

export interface ProjectionEngineResult {
  lineCode: string
  horizon: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  generatedAt: string
  calculationType: 'ACTUAL' | 'PROJECTED' | 'SIMULATED'
  initialStock: number
  dailyRows: DailyProjectionRow[]
  summary: {
    minStockReached: number
    maxStockReached: number
    stockoutRiskDays: number
    overflowRiskDays: number
    averageDailyConsumption: number
    totalInputTons: number
    totalOutputTons: number
  }
}

// ==========================================
// 3. Visão Operacional Tabular de Programação
// ==========================================

export interface TabularScheduleItem {
  id: string
  seq: number
  dataDetalhada: string // Ex: 01/09/2026
  data: string // Ex: 01/09
  dia: string // Ex: Terça
  turno: string // Ex: 1º Turno (06:00 - 14:00)
  turma: string // Ex: Turma A
  horaInicio: string // Ex: 06:00
  horaFimPrevisto?: string
  codigo: string // Ex: TB-5050-1020
  produto: string // Ex: Tubo Industrial 50x50x2.00
  mtoOrIndustrializacao: 'MTO' | 'INDUSTRIALIZACAO' | 'MTS'
  cliente: string // Ex: Usiminas / Açotubo
  comprimentoMetros: number // Ex: 6.00 m
  embalagem: string // Ex: Fardo 50 barras com cinta
  programadoTons: number // Quantidade programada (t)
  produtividadeTh: number // t/h
  horasDisponiveis: number // Horas do turno / alocadas
  totalL1Tons: number // Total de L1 consumido/produzido
  totalL2Tons: number // Total de L2 consumido/produzido
  totalTons: number // Total geral
  ordemSap?: string
  ordemPcp?: string
  familia?: string
  bitolaDimensao?: string
  lote?: string
  deposito?: string
  prioridade?: number
  rotaCodigo?: string
  status: 'PROGRAMADO' | 'EM_PROCESSO' | 'CONCLUIDO' | 'BLOQUEADO' | 'MANUAL_OVERRIDE'
  isManualOverridden?: boolean
  overrideReason?: string
  originalSeq?: number
  overriddenBy?: string
  overriddenAt?: string
  stockEntryBeforeTons?: number
  stockEntryAfterTons?: number
  stockExitProjectedTons?: number
  alerts?: string[]
}

export interface ManualOverridePayload {
  itemId: string
  orderNumber: string
  originalSeq: number
  newSeq: number
  reason: string
  justificationNotes?: string
  authorName: string
  authorRole: string
  impactValidation: {
    hardConstraintsViolated: boolean
    violatedConstraintMessages: string[]
    capacityConflict: boolean
    setupTimeIncreasedMinutes: number
    bufferRiskDetected: boolean
    isValidToApply: boolean
  }
}

export interface TabularColumnConfig {
  key: keyof TabularScheduleItem | string
  label: string
  visible: boolean
  required: boolean
  order: number
  align?: 'left' | 'center' | 'right'
  minWidth?: number
  isNumeric?: boolean
}

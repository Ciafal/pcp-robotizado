/**
 * Tipos Oficiais para Planejadores MRP SAP (MARC-DISPO / T024D)
 * e Grupos MRP SAP (MARC-DISGR)
 * Módulo PCP Robotizado - HUB CIAFAL
 */

export interface SapMrpControllerItem {
  id: string
  dispo: string // Código DISPO no SAP MARC
  description?: string // Descrição (vazia se a fonte SAP não fornecer)
  werks: string // Centro / Planta SAP (ex: 1001, 1002, 2001, 2101, 3001)
  company_code?: string // Código da Empresa no PCP (CIAFAL, KS-FERRADURA, etc.)
  materials_count?: number // Quantidade de materiais que utilizam este DISPO naquele WERKS
  last_sync?: string // Data/Hora ISO da última sincronização
  origin_source: 'SAP_RFC' | 'CACHE'
  is_active?: boolean
  created?: string
  updated?: string
}

export interface SapMrpGroupItem {
  id: string
  disgr: string // Código DISGR no SAP MARC
  description?: string // Descrição (vazia se a fonte SAP não fornecer)
  werks: string // Centro / Planta SAP (ex: 1001, 1002, 2001, 2101, 3001)
  company_code?: string // Código da Empresa no PCP (CIAFAL, KS-FERRADURA, etc.)
  last_sync?: string // Data/Hora ISO da última sincronização
  origin_source: 'SAP_RFC' | 'CACHE'
  is_active?: boolean
  created?: string
  updated?: string
}

export interface MrpControllerResolutionCriteria {
  company_id?: string
  company_code?: string
  werks: string
  line_code?: string
  line_id?: string
  mrp_controller_code: string // MARC-DISPO
  target_date?: string | Date
  material_code?: string
  material_description?: string
}

// Mantido para compatibilidade anterior da Frente 6
export interface MrpResolutionCriteria {
  company_id?: string
  company_code?: string
  werks: string
  line_code?: string
  line_id?: string
  mrp_group_code: string // MARC-DISGR
  target_date?: string | Date
  material_code?: string
  material_description?: string
}

export type MatrixResolutionStatus =
  | 'VALID'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'NO_MRP_CONTROLLER'
  | 'NOT_HOMOLOGATED'
  | 'EXPIRED'

export interface MatrixResolutionResult {
  status: MatrixResolutionStatus
  matched_matrix?: any
  matched_matrices?: any[]
  message: string
  details?: {
    material_code?: string
    material_description?: string
    mrp_controller_code?: string
    mrp_controller_description?: string
    mrp_group_code?: string
    company_code?: string
    werks: string
    line_code?: string
    target_date?: string
    action_label?: string
  }
}

export type PCPUserRole =
  | 'PCP_ADMIN'
  | 'PCP_PROGRAMMER'
  | 'LINE_MANAGER'
  | 'PRODUCTION_VIEWER'
  | 'EXECUTIVE_VIEWER'
  | 'AUDITOR'

export type ScopeType = 'GLOBAL' | 'UNIT' | 'CENTER' | 'PRODUCTION_LINE' | 'PROCESS'

export interface UserProfile {
  id: string
  email: string
  name: string
  role: PCPUserRole
  avatar?: string
  role_details?: {
    name: string
    description: string
    hierarchy_level: number
  } | null
}

export interface Permission {
  key: string
  name: string
  category: string
  is_critical: boolean
  source?: 'ROLE' | 'EXCEPTION_GRANT'
  description?: string
}

export interface AccessScope {
  id: string
  scope_type: ScopeType
  target_id?: string
  target_code?: string
  target_name?: string
  valid_from?: string
  valid_until?: string
  active: boolean
}

export interface Delegation {
  id: string
  delegator_id: string
  scope_type: ScopeType
  target_id?: string
  reason: string
  start_date: string
  end_date: string
  active: boolean
}

export interface AuthPermissionsResponse {
  user: UserProfile
  is_global: boolean
  scopes: AccessScope[]
  delegations: Delegation[]
  permissions: Permission[]
  permission_keys: string[]
}

export interface ProductionLine {
  id: string
  name: string
  code: string
  status: 'running' | 'idle' | 'stopped' | 'maintenance'
  target_rate: number
  current_rate: number
  active_order: string
  operator: string
  efficiency: number
  created?: string
  updated?: string
}

export interface PCPAlert {
  id: string
  title: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  message: string
  line_id: string
  category: string
  acknowledged: boolean
  created?: string
  updated?: string
  expand?: {
    line_id?: ProductionLine
  }
}

export interface PCPAuditLog {
  id: string
  user_id?: string
  user_email?: string
  user_name?: string
  user_role?: string
  event_type:
    | 'ACCESS_GRANTED'
    | 'ACCESS_DENIED'
    | 'PERMISSION_CHANGED'
    | 'ROLE_ASSIGNED'
    | 'ROLE_REMOVED'
    | 'SCOPE_ASSIGNED'
    | 'SCOPE_REMOVED'
    | 'UNAUTHORIZED_ACTION_ATTEMPT'
    | 'SCHEDULE_ACTION'
    | 'RULE_ACTION'
    | 'DELEGATION_CREATED'
  action: string
  resource: string
  resource_id?: string
  permission_required?: string
  scope?: string
  outcome: 'ALLOW' | 'DENY' | 'SUCCESS' | 'FAILED'
  ip_address?: string
  user_agent?: string
  details?: Record<string, unknown>
  created?: string
}

export interface PCPRole {
  id: string
  name: string
  code: PCPUserRole
  description: string
  hierarchy_level: number
  is_system: boolean
}

export interface PCPPermissionException {
  id: string
  user_id: string
  permission_id: string
  type: 'GRANT' | 'DENY'
  reason?: string
  valid_until?: string
  granted_by?: string
  expand?: {
    permission_id?: Permission
  }
}

export interface PCPLineResponsible {
  id: string
  line_id: string
  user_id: string
  role_type: 'PRIMARY' | 'SUBSTITUTE' | 'ADDITIONAL'
  active: boolean
  expand?: {
    user_id?: UserProfile
    line_id?: ProductionLine
  }
}

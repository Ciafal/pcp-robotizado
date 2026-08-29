import pb from '@/lib/pocketbase/client'
import {
  AuthPermissionsResponse,
  PCPAlert,
  PCPAuditLog,
  PCPLineResponsible,
  PCPRole,
  Permission,
  ProductionLine,
  UserProfile,
} from '@/types/pcp-auth'

export const authService = {
  /**
   * Resolve permissões e escopos do usuário atual a partir do backend
   */
  async resolvePermissions(): Promise<AuthPermissionsResponse> {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      throw new Error('Sessão não autenticada no HUB CIAFAL')
    }

    try {
      const response = await pb.send<AuthPermissionsResponse>('/backend/v1/auth/permissions', {
        method: 'GET',
      })
      return response
    } catch (err) {
      console.warn('Fallback de permissões locais:', err)
      const user = pb.authStore.record
      const role = (user?.role as any) || 'PRODUCTION_VIEWER'
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.email,
          role: role,
        },
        is_global: role === 'PCP_ADMIN' || role === 'EXECUTIVE_VIEWER',
        scopes: [
          {
            id: 'fallback',
            scope_type: role === 'PCP_ADMIN' ? 'GLOBAL' : 'PRODUCTION_LINE',
            target_id: 'ALL',
            target_name: 'Escopo Geral CIAFAL',
            active: true,
          },
        ],
        delegations: [],
        permissions: [],
        permission_keys:
          role === 'PCP_ADMIN'
            ? ['*']
            : role === 'EXECUTIVE_VIEWER'
              ? [
                  'pcp.dashboard.view',
                  'pcp.executive.view',
                  'pcp.executive.ask_ai',
                  'pcp.executive.investigate',
                  'pcp.executive.actions.manage',
                  'pcp.executive.export',
                  'pcp.executive.manage_briefing',
                  'pcp.inventory.overview',
                  'pcp.inventory.raw_material',
                  'pcp.inventory.semi_finished',
                  'pcp.inventory.finished_goods',
                  'pcp.inventory.coverage',
                  'pcp.inventory.discrepancies',
                  'pcp.inventory.ai',
                  'pcp.masterplan.overview',
                  'pcp.masterplan.adherence',
                  'pcp.masterplan.deviations',
                  'pcp.masterplan.demand_crm',
                  'pcp.masterplan.forecast_ai',
                  'pcp.masterplan.versions',
                ]
              : role === 'PCP_PROGRAMMER'
                ? [
                    'pcp.dashboard.view',
                    'pcp.executive.view',
                    'pcp.executive.ask_ai',
                    'pcp.executive.investigate',
                    'pcp.executive.actions.manage',
                    'pcp.executive.export',
                    'pcp.optimization.view',
                    'pcp.optimization.create',
                    'pcp.optimization.run',
                    'pcp.optimization.compare',
                    'pcp.optimization.convert',
                    'pcp.optimization.manage_objectives',
                    'pcp.routes.view',
                    'pcp.routes.create',
                    'pcp.routes.edit',
                    'pcp.routes.simulate',
                    'pcp.inventory.overview',
                    'pcp.inventory.raw_material',
                    'pcp.inventory.semi_finished',
                    'pcp.inventory.finished_goods',
                    'pcp.inventory.coverage',
                    'pcp.inventory.discrepancies',
                    'pcp.inventory.ai',
                    'pcp.masterplan.overview',
                    'pcp.masterplan.adherence',
                    'pcp.masterplan.deviations',
                    'pcp.masterplan.demand_crm',
                    'pcp.masterplan.forecast_ai',
                    'pcp.masterplan.versions',
                  ]
                : [
                    'pcp.dashboard.view',
                    'pcp.executive.view',
                    'pcp.optimization.view',
                    'pcp.optimization.compare',
                    'pcp.inventory.overview',
                    'pcp.masterplan.overview',
                  ],
      }
    }
  },

  /**
   * Loga uma ação de segurança ou tentativa no backend
   */
  async logAuditEvent(payload: {
    event_type: PCPAuditLog['event_type']
    action: string
    resource: string
    resource_id?: string
    permission_required?: string
    scope?: string
    outcome: 'ALLOW' | 'DENY' | 'SUCCESS' | 'FAILED'
    details?: Record<string, unknown>
  }): Promise<void> {
    try {
      await pb.send('/backend/v1/auth/audit-log', {
        method: 'POST',
        body: payload,
      })
    } catch (err) {
      console.error('Erro ao enviar audit log:', err)
    }
  },

  /**
   * Lista todos os usuários cadastrados no HUB
   */
  async listUsers(): Promise<UserProfile[]> {
    const records = await pb.collection('users').getFullList({
      sort: 'name',
    })
    return records.map((r: any) => ({
      id: r.id,
      email: r.email,
      name: r.name || r.email,
      role: r.role || 'PRODUCTION_VIEWER',
      avatar: r.avatar,
    }))
  },

  /**
   * Atualiza a role de um usuário (PCP_ADMIN)
   */
  async updateUserRole(userId: string, newRole: string): Promise<void> {
    await pb.collection('users').update(userId, { role: newRole })
  },

  /**
   * Lista todas as permissões cadastradas
   */
  async listPermissions(): Promise<Permission[]> {
    const records = await pb.collection('pcp_permissions').getFullList({
      sort: 'category,name',
    })
    return records.map((r: any) => ({
      key: r.key,
      name: r.name,
      category: r.category,
      is_critical: r.is_critical,
      description: r.description,
    }))
  },

  /**
   * Lista perfis do sistema
   */
  async listRoles(): Promise<PCPRole[]> {
    const records = await pb.collection('pcp_roles').getFullList({
      sort: 'hierarchy_level,name',
    })
    return records.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      hierarchy_level: r.hierarchy_level,
      is_system: r.is_system,
    }))
  },

  /**
   * Lista escopos de um usuário ou de todos
   */
  async listScopes(userId?: string) {
    const filter = userId ? `user_id = '${userId}'` : ''
    return await pb.collection('pcp_access_scopes').getFullList({
      filter,
      sort: '-created',
    })
  },

  /**
   * Cria ou atualiza um escopo
   */
  async saveScope(data: {
    user_id: string
    scope_type: string
    target_id?: string
    target_code?: string
    target_name?: string
    active: boolean
  }) {
    return await pb.collection('pcp_access_scopes').create(data)
  },

  /**
   * Remove um escopo
   */
  async deleteScope(scopeId: string) {
    return await pb.collection('pcp_access_scopes').delete(scopeId)
  },

  /**
   * Lista exceções de permissão
   */
  async listPermissionExceptions(userId?: string) {
    const filter = userId ? `user_id = '${userId}'` : ''
    return await pb.collection('pcp_permission_exceptions').getFullList({
      filter,
      expand: 'permission_id',
    })
  },

  /**
   * Adiciona exceção (GRANT ou DENY)
   */
  async savePermissionException(data: {
    user_id: string
    permission_id: string
    type: 'GRANT' | 'DENY'
    reason: string
  }) {
    return await pb.collection('pcp_permission_exceptions').create(data)
  },

  /**
   * Remove exceção
   */
  async deletePermissionException(exceptionId: string) {
    return await pb.collection('pcp_permission_exceptions').delete(exceptionId)
  },

  /**
   * Lista trilha de auditoria com filtros
   */
  async listAuditLogs(options?: {
    page?: number
    perPage?: number
    eventType?: string
    userEmail?: string
    outcome?: string
  }) {
    const filters: string[] = []
    if (options?.eventType && options.eventType !== 'ALL') {
      filters.push(`event_type = '${options.eventType}'`)
    }
    if (options?.userEmail) {
      filters.push(`user_email ~ '${options.userEmail}'`)
    }
    if (options?.outcome && options.outcome !== 'ALL') {
      filters.push(`outcome = '${options.outcome}'`)
    }

    const filterString = filters.join(' && ')
    const page = options?.page || 1
    const perPage = options?.perPage || 30

    return await pb.collection('pcp_audit_logs').getList(page, perPage, {
      filter: filterString,
      sort: '-created',
    })
  },

  /**
   * Lista linhas de produção
   */
  async listProductionLines(): Promise<ProductionLine[]> {
    const records = await pb.collection('production_lines').getFullList({
      sort: 'code',
    })
    return records.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      status: r.status,
      target_rate: r.target_rate,
      current_rate: r.current_rate,
      active_order: r.active_order,
      operator: r.operator,
      efficiency: r.efficiency,
      created: r.created,
      updated: r.updated,
    }))
  },

  /**
   * Atualiza linha de produção com validação de escopo
   */
  async updateProductionLine(lineId: string, data: Partial<ProductionLine>) {
    return await pb.collection('production_lines').update(lineId, data)
  },

  /**
   * Lista alertas industriais
   */
  async listAlerts(): Promise<PCPAlert[]> {
    const records = await pb.collection('pcp_alerts').getFullList({
      sort: '-created',
      expand: 'line_id',
    })
    return records.map((r: any) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
      message: r.message,
      line_id: r.line_id,
      category: r.category,
      acknowledged: r.acknowledged,
      created: r.created,
      updated: r.updated,
      expand: r.expand,
    }))
  },

  /**
   * Reconhece alerta
   */
  async acknowledgeAlert(alertId: string, acknowledged: boolean = true) {
    return await pb.collection('pcp_alerts').update(alertId, { acknowledged })
  },

  /**
   * Lista responsáveis por linhas
   */
  async listLineResponsibles(): Promise<PCPLineResponsible[]> {
    const records = await pb.collection('pcp_line_responsibles').getFullList({
      expand: 'user_id,line_id',
    })
    return records.map((r: any) => ({
      id: r.id,
      line_id: r.line_id,
      user_id: r.user_id,
      role_type: r.role_type,
      active: r.active,
      expand: r.expand,
    }))
  },

  /**
   * Salva responsável de linha
   */
  async saveLineResponsible(data: {
    line_id: string
    user_id: string
    role_type: 'PRIMARY' | 'SUBSTITUTE' | 'ADDITIONAL'
    active: boolean
  }) {
    return await pb.collection('pcp_line_responsibles').create(data)
  },

  /**
   * Lista delegações ativas
   */
  async listDelegations() {
    return await pb.collection('pcp_delegations').getFullList({
      sort: '-created',
      expand: 'delegator_id,delegate_id',
    })
  },

  /**
   * Cria nova delegação temporária
   */
  async createDelegation(data: {
    delegator_id: string
    delegate_id: string
    scope_type: string
    target_id?: string
    reason: string
    start_date: string
    end_date: string
    active: boolean
  }) {
    return await pb.collection('pcp_delegations').create(data)
  },
}

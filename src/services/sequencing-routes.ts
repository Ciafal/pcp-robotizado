import pb from '@/lib/pocketbase/client'
import {
  ProductionRoute,
  ProductionRouteNode,
  ProductionRouteEdge,
  ProductionCapacityLog,
  CapacityPeriodType,
} from '@/types/sequencing-orchestration'
import { authService } from '@/services/pcp-auth'

export const sequencingRoutesService = {
  /**
   * Listar todas as rotas de produção cadastradas com nós e edges expandidos
   */
  async listRoutes(includeDrafts = true): Promise<ProductionRoute[]> {
    try {
      const filter = includeDrafts ? '' : "status = 'APPROVED' && active = true"
      const records = await pb.collection('production_routes').getFullList<ProductionRoute>({
        filter,
        sort: '-version,code',
      })

      // Buscar nodes e edges correspondentes
      const [allNodes, allEdges] = await Promise.all([
        pb.collection('production_route_nodes').getFullList<ProductionRouteNode>({
          sort: 'logical_order',
        }),
        pb.collection('production_route_edges').getFullList<ProductionRouteEdge>({
          sort: 'priority',
        }),
      ])

      return records.map((r) => ({
        ...r,
        nodes: allNodes.filter((n) => n.route_id === r.id),
        edges: allEdges.filter((e) => e.route_id === r.id),
      }))
    } catch (err) {
      console.error('Erro ao buscar production_routes:', err)
      return []
    }
  },

  /**
   * Buscar uma rota específica pelo ID
   */
  async getRouteById(routeId: string): Promise<ProductionRoute | null> {
    try {
      const route = await pb.collection('production_routes').getOne<ProductionRoute>(routeId)
      const [nodes, edges] = await Promise.all([
        pb.collection('production_route_nodes').getFullList<ProductionRouteNode>({
          filter: `route_id = '${routeId}'`,
          sort: 'logical_order',
        }),
        pb.collection('production_route_edges').getFullList<ProductionRouteEdge>({
          filter: `route_id = '${routeId}'`,
          sort: 'priority',
        }),
      ])
      return {
        ...route,
        nodes,
        edges,
      }
    } catch (err) {
      console.error('Erro ao buscar rota por ID:', err)
      return null
    }
  },

  /**
   * Criar ou atualizar rota em DRAFT (gerando nova versão se já aprovada)
   */
  async saveRoute(data: Partial<ProductionRoute>): Promise<ProductionRoute> {
    let savedRoute: ProductionRoute
    const user = pb.authStore.record

    if (data.id) {
      // Se for uma rota já aprovada sendo editada, mantemos integridade criando nova versão ou atualizando DRAFT
      savedRoute = await pb.collection('production_routes').update<ProductionRoute>(data.id, {
        ...data,
        updated: new Date().toISOString(),
      })
    } else {
      savedRoute = await pb.collection('production_routes').create<ProductionRoute>({
        ...data,
        version: data.version || 1,
        status: data.status || 'DRAFT',
        active: data.active ?? false,
        author_id: user?.id,
        author_name: user?.name || user?.email,
      })
    }

    // Registrar na Trilha de Auditoria
    await authService.logAuditEvent({
      event_type: 'SCHEDULE_ACTION',
      action: data.id ? 'UPDATE_PRODUCTION_ROUTE' : 'CREATE_PRODUCTION_ROUTE',
      resource: 'PRODUCTION_ROUTE',
      resource_id: savedRoute.id,
      permission_required: 'pcp.route.create',
      scope: savedRoute.code,
      outcome: 'SUCCESS',
      details: {
        code: savedRoute.code,
        version: savedRoute.version,
        status: savedRoute.status,
      },
    })

    return savedRoute
  },

  /**
   * Submeter Rota para Aprovação Dupla (PCP -> Gestor de Linha)
   */
  async submitRouteForApproval(
    routeId: string,
    changeReason: string,
  ): Promise<{ approvalId: string }> {
    const route = await pb.collection('production_routes').getOne<ProductionRoute>(routeId)
    const user = pb.authStore.record

    // 1. Atualizar status da rota para PENDING_APPROVAL
    await pb.collection('production_routes').update(routeId, {
      status: 'PENDING_APPROVAL',
      change_reason: changeReason,
    })

    // 2. Criar registro na esteira de aprovação dupla
    const approvalRecord = await pb.collection('line_double_approvals').create({
      entity_type: 'PRODUCTION_ROUTE',
      entity_id: routeId,
      line_code: route.code,
      version: `V${route.version}`,
      change_reason: changeReason,
      status: 'PENDING_PCP',
    })

    // 3. Auditoria
    await authService.logAuditEvent({
      event_type: 'SCHEDULE_ACTION',
      action: 'SUBMIT_ROUTE_DOUBLE_APPROVAL',
      resource: 'PRODUCTION_ROUTE',
      resource_id: routeId,
      permission_required: 'pcp.route.submit',
      scope: route.code,
      outcome: 'SUCCESS',
      details: {
        changeReason,
        author: user?.name || user?.email,
        version: route.version,
      },
    })

    return { approvalId: approvalRecord.id }
  },

  /**
   * Executar Etapa de Aprovação (PCP ou Gestor de Linha)
   */
  async approveRouteStage(
    approvalId: string,
    stage: 'PCP' | 'LINE_MANAGER',
    notes: string,
  ): Promise<{ status: string }> {
    const user = pb.authStore.record
    if (!user) throw new Error('Usuário não autenticado.')

    const approval = await pb.collection('line_double_approvals').getOne(approvalId)
    const routeId = approval.entity_id

    const nowStr = new Date().toISOString()
    let newStatus = approval.status

    if (stage === 'PCP') {
      newStatus = 'PENDING_LINE_MANAGER'
      await pb.collection('line_double_approvals').update(approvalId, {
        pcp_approver_id: user.id,
        pcp_approved_at: nowStr,
        pcp_notes: notes,
        status: newStatus,
      })
    } else if (stage === 'LINE_MANAGER') {
      newStatus = 'APPROVED'
      await pb.collection('line_double_approvals').update(approvalId, {
        line_manager_approver_id: user.id,
        line_manager_approved_at: nowStr,
        line_manager_notes: notes,
        status: newStatus,
      })

      // Se ambas as fases aprovarem, ativar oficialmente a rota e seus edges
      if (routeId) {
        await pb.collection('production_routes').update(routeId, {
          status: 'APPROVED',
          active: true,
        })
        const edges = await pb.collection('production_route_edges').getFullList({
          filter: `route_id = '${routeId}'`,
        })
        for (const edge of edges) {
          await pb.collection('production_route_edges').update(edge.id, {
            status: 'APPROVED',
          })
        }
      }
    }

    // Auditoria
    await authService.logAuditEvent({
      event_type: 'SCHEDULE_ACTION',
      action: `APPROVE_ROUTE_${stage}`,
      resource: 'LINE_DOUBLE_APPROVAL',
      resource_id: approvalId,
      permission_required: stage === 'PCP' ? 'pcp.route.approve.pcp' : 'pcp.route.approve.manager',
      scope: approval.line_code,
      outcome: 'SUCCESS',
      details: {
        stage,
        approver: user.name || user.email,
        notes,
        newStatus,
      },
    })

    return { status: newStatus }
  },

  /**
   * Rejeitar Rota
   */
  async rejectRoute(approvalId: string, reason: string): Promise<void> {
    const user = pb.authStore.record
    const approval = await pb.collection('line_double_approvals').getOne(approvalId)
    const routeId = approval.entity_id

    await pb.collection('line_double_approvals').update(approvalId, {
      status: 'REJECTED',
      line_manager_notes: `REJEITADO por ${user?.name}: ${reason}`,
    })

    if (routeId) {
      await pb.collection('production_routes').update(routeId, {
        status: 'REJECTED',
        active: false,
      })
    }

    await authService.logAuditEvent({
      event_type: 'SCHEDULE_ACTION',
      action: 'REJECT_ROUTE_DOUBLE_APPROVAL',
      resource: 'LINE_DOUBLE_APPROVAL',
      resource_id: approvalId,
      permission_required: 'pcp.schedule.reject',
      scope: approval.line_code,
      outcome: 'SUCCESS',
      details: { reason, rejectedBy: user?.name || user?.email },
    })
  },

  /**
   * Salvar Edge da Rota
   */
  async saveEdge(edge: Partial<ProductionRouteEdge>): Promise<ProductionRouteEdge> {
    if (edge.id) {
      return await pb
        .collection('production_route_edges')
        .update<ProductionRouteEdge>(edge.id, edge)
    }
    return await pb.collection('production_route_edges').create<ProductionRouteEdge>(edge)
  },

  /**
   * Listar Logs dos 4 Conceitos de Capacidade
   */
  async listCapacityLogs(periodType: CapacityPeriodType = 'DAY'): Promise<ProductionCapacityLog[]> {
    try {
      const records = await pb
        .collection('production_capacity_logs')
        .getFullList<ProductionCapacityLog>({
          filter: `period_type = '${periodType}'`,
          sort: 'line_code',
        })
      return records
    } catch (err) {
      console.error('Erro ao buscar capacity logs:', err)
      return []
    }
  },

  /**
   * Salvar ou Atualizar Snapshot de Capacidade
   */
  async saveCapacityLog(log: Partial<ProductionCapacityLog>): Promise<ProductionCapacityLog> {
    if (log.id) {
      return await pb
        .collection('production_capacity_logs')
        .update<ProductionCapacityLog>(log.id, log)
    }
    return await pb.collection('production_capacity_logs').create<ProductionCapacityLog>(log)
  },
}

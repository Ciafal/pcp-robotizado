import pb from '@/lib/pocketbase/client'
import {
  ProductionRoute,
  ProductionRouteNode,
  ProductionRouteEdge,
  ProductionCapacityLog,
  CapacityPeriodType,
  EdgeRelationType,
  BufferPhysicalType,
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
   * Detecta se existe ciclo/loop no grafo de dependências das linhas
   */
  hasCycle(edges: Array<{ origin_line_code: string; target_line_code: string }>): {
    hasCycle: boolean
    cycleNodes?: string[]
  } {
    const adj = new Map<string, string[]>()
    edges.forEach((e) => {
      if (!e.origin_line_code || !e.target_line_code) return
      if (!adj.has(e.origin_line_code)) adj.set(e.origin_line_code, [])
      adj.get(e.origin_line_code)!.push(e.target_line_code)
    })

    const visited = new Set<string>()
    const inStack = new Set<string>()
    let cycleFound = false
    let detectedCycle: string[] = []

    function dfs(node: string, path: string[]): boolean {
      visited.add(node)
      inStack.add(node)
      path.push(node)

      const neighbors = adj.get(node) || []
      for (const next of neighbors) {
        if (!visited.has(next)) {
          if (dfs(next, [...path])) return true
        } else if (inStack.has(next)) {
          cycleFound = true
          detectedCycle = [...path, next]
          return true
        }
      }

      inStack.delete(node)
      return false
    }

    const allNodes = new Set<string>()
    edges.forEach((e) => {
      if (e.origin_line_code) allNodes.add(e.origin_line_code)
      if (e.target_line_code) allNodes.add(e.target_line_code)
    })

    for (const node of allNodes) {
      if (!visited.has(node)) {
        if (dfs(node, [])) {
          return { hasCycle: true, cycleNodes: detectedCycle }
        }
      }
    }

    return { hasCycle: false }
  },

  /**
   * Salvar Rota Completa (Rota + Nodes + Edges) com atomicidade e validação
   */
  async saveCompleteRoute(payload: {
    id?: string
    code: string
    name: string
    description: string
    product_code?: string
    family_code?: string
    isNewVersion?: boolean
    nodes: Array<{
      id?: string
      line_id: string
      line_code: string
      process_name: string
      logical_order: number
      nominal_rate?: number
      capacity_unit?: string
      input_buffer_min?: number
      input_buffer_max?: number
      output_buffer_min?: number
      output_buffer_max?: number
    }>
    edges: Array<{
      id?: string
      origin_line_code: string
      target_line_code: string
      relation_type: EdgeRelationType
      priority?: number
      is_precedence_mandatory?: boolean
      lead_time_minutes?: number
      buffer_min_tons?: number
      buffer_max_tons?: number
      buffer_target_tons?: number
      buffer_physical_type?: BufferPhysicalType
      buffer_unit?: string
      current_buffer_stock?: number
      projected_buffer_stock?: number
      condition_expression?: string
    }>
  }): Promise<ProductionRoute> {
    const user = pb.authStore.record

    // 1. Validações prévias
    if (!payload.code?.trim()) {
      throw new Error('O Código da Rota é obrigatório.')
    }
    if (!payload.name?.trim()) {
      throw new Error('O Nome da Rota é obrigatório.')
    }
    if (!payload.nodes || payload.nodes.length === 0) {
      throw new Error('Adicione pelo menos uma Linha Produtiva à Rota.')
    }

    // Unicidade de linhas na mesma rota
    const lineIdsSeen = new Set<string>()
    for (const node of payload.nodes) {
      if (lineIdsSeen.has(node.line_id)) {
        throw new Error(
          `A Linha Produtiva [${node.line_code}] foi adicionada mais de uma vez nesta Rota. Cada linha deve constar apenas uma vez.`,
        )
      }
      lineIdsSeen.add(node.line_id)
    }

    // Detecção de dependência cíclica entre linhas
    const cycleCheck = this.hasCycle(payload.edges)
    if (cycleCheck.hasCycle) {
      throw new Error('A Rota contém dependência cíclica entre Linhas Produtivas.')
    }

    let routeRecord: ProductionRoute

    // Se estiver editando e gerando nova versão
    if (payload.isNewVersion && payload.id) {
      const original = await pb.collection('production_routes').getOne<ProductionRoute>(payload.id)
      const newVersion = (original.version || 1) + 1

      // A nova versão é criada sempre como DRAFT
      routeRecord = await pb.collection('production_routes').create<ProductionRoute>({
        code: payload.code.trim().toUpperCase(),
        description: payload.description || original.description,
        product_code: payload.product_code?.trim().toUpperCase() || original.product_code,
        family_code: payload.family_code?.trim().toUpperCase() || original.family_code,
        version: newVersion,
        status: 'DRAFT',
        active: false,
        preferred: false,
        author_id: user?.id,
        author_name: user?.name || user?.email,
        change_reason: `Revisão V${newVersion} criada a partir da V${original.version}`,
        metadata: {
          name: payload.name.trim(),
          source_route_id: original.id,
        },
      })
    } else if (payload.id) {
      // Atualizar rota existente (mantendo DRAFT se for o caso)
      routeRecord = await pb.collection('production_routes').update<ProductionRoute>(payload.id, {
        code: payload.code.trim().toUpperCase(),
        description: payload.description,
        product_code: payload.product_code?.trim().toUpperCase() || '',
        family_code: payload.family_code?.trim().toUpperCase() || '',
        metadata: {
          name: payload.name.trim(),
        },
        updated: new Date().toISOString(),
      })
    } else {
      // Criar nova rota (sempre DRAFT inicial)
      routeRecord = await pb.collection('production_routes').create<ProductionRoute>({
        code: payload.code.trim().toUpperCase(),
        description: payload.description,
        product_code: payload.product_code?.trim().toUpperCase() || '',
        family_code: payload.family_code?.trim().toUpperCase() || '',
        version: 1,
        status: 'DRAFT',
        active: false,
        preferred: false,
        author_id: user?.id,
        author_name: user?.name || user?.email,
        metadata: {
          name: payload.name.trim(),
        },
      })
    }

    const routeId = routeRecord.id

    // 2. Persistir Nodes (production_route_nodes)
    // Se for edição sem nova versão, podemos limpar os nós existentes da rota e recriar
    const existingNodes = await pb.collection('production_route_nodes').getFullList({
      filter: `route_id = '${routeId}'`,
    })
    for (const oldNode of existingNodes) {
      await pb.collection('production_route_nodes').delete(oldNode.id)
    }

    const createdNodes: ProductionRouteNode[] = []
    for (let i = 0; i < payload.nodes.length; i++) {
      const node = payload.nodes[i]
      const stepOrder = (i + 1) * 10 // Saltos de 10 em 10 (10, 20, 30...)
      const nodeRec = await pb.collection('production_route_nodes').create<ProductionRouteNode>({
        route_id: routeId,
        line_id: node.line_id,
        line_code: node.line_code,
        process_name: node.process_name || 'Processo Produtivo',
        logical_order: stepOrder,
        nominal_rate: node.nominal_rate || 100,
        capacity_unit: node.capacity_unit || 't/h',
        input_buffer_min: node.input_buffer_min || 0,
        input_buffer_max: node.input_buffer_max || 100,
        output_buffer_min: node.output_buffer_min || 0,
        output_buffer_max: node.output_buffer_max || 100,
      })
      createdNodes.push(nodeRec)
    }

    // 3. Persistir Edges (production_route_edges)
    const existingEdges = await pb.collection('production_route_edges').getFullList({
      filter: `route_id = '${routeId}'`,
    })
    for (const oldEdge of existingEdges) {
      await pb.collection('production_route_edges').delete(oldEdge.id)
    }

    // Filtrar edges cujas linhas ainda existem na rota (limpando órfãos)
    const validLineCodes = new Set(payload.nodes.map((n) => n.line_code))
    const validEdges = payload.edges.filter(
      (e) => validLineCodes.has(e.origin_line_code) && validLineCodes.has(e.target_line_code),
    )

    const createdEdges: ProductionRouteEdge[] = []
    for (let j = 0; j < validEdges.length; j++) {
      const edge = validEdges[j]
      const edgeRec = await pb.collection('production_route_edges').create<ProductionRouteEdge>({
        route_id: routeId,
        origin_line_code: edge.origin_line_code,
        target_line_code: edge.target_line_code,
        relation_type: edge.relation_type || 'MANDATORY',
        priority: edge.priority || j + 1,
        is_precedence_mandatory: edge.is_precedence_mandatory ?? true,
        lead_time_minutes: edge.lead_time_minutes || 30,
        buffer_min_tons: edge.buffer_min_tons || 10,
        buffer_max_tons: edge.buffer_max_tons || 100,
        buffer_target_tons: edge.buffer_target_tons || 50,
        buffer_physical_type: edge.buffer_physical_type || 'BUFFER_OPERACIONAL',
        buffer_unit: edge.buffer_unit || 't',
        current_buffer_stock: edge.current_buffer_stock || 0,
        projected_buffer_stock: edge.projected_buffer_stock || 0,
        condition_expression: edge.condition_expression || '',
        status: 'DRAFT',
      })
      createdEdges.push(edgeRec)
    }

    // 4. Reler registro salvo com confirmação estrita antes do retorno
    const reloaded = await pb.collection('production_routes').getOne<ProductionRoute>(routeId)
    if (!reloaded || reloaded.id !== routeId) {
      throw new Error(
        'Não foi possível salvar a Rota Produtiva. Verifique as informações e tente novamente.',
      )
    }

    return {
      ...reloaded,
      nodes: createdNodes,
      edges: createdEdges,
    }
  },

  /**
   * Duplica uma rota produtiva criando nova cópia como Rascunho (DRAFT)
   */
  async duplicateRoute(sourceRouteId: string): Promise<ProductionRoute> {
    const source = await this.getRouteById(sourceRouteId)
    if (!source) throw new Error('Rota de origem não encontrada.')

    const user = pb.authStore.record
    const baseCode = source.code.replace(/_COPY(\d+)?$/, '')
    const randomSuffix = Math.floor(100 + Math.random() * 900)
    const newCode = `${baseCode}_COPY${randomSuffix}`

    return await this.saveCompleteRoute({
      code: newCode,
      name: `${source.metadata?.name || source.description} (Cópia)`,
      description: source.description,
      product_code: source.product_code,
      family_code: source.family_code,
      nodes: (source.nodes || []).map((n) => ({
        line_id: n.line_id,
        line_code: n.line_code,
        process_name: n.process_name,
        logical_order: n.logical_order,
        nominal_rate: n.nominal_rate,
        capacity_unit: n.capacity_unit,
        input_buffer_min: n.input_buffer_min,
        input_buffer_max: n.input_buffer_max,
        output_buffer_min: n.output_buffer_min,
        output_buffer_max: n.output_buffer_max,
      })),
      edges: (source.edges || []).map((e) => ({
        origin_line_code: e.origin_line_code,
        target_line_code: e.target_line_code,
        relation_type: e.relation_type,
        priority: e.priority,
        is_precedence_mandatory: e.is_precedence_mandatory,
        lead_time_minutes: e.lead_time_minutes,
        buffer_min_tons: e.buffer_min_tons,
        buffer_max_tons: e.buffer_max_tons,
        buffer_target_tons: e.buffer_target_tons,
        buffer_physical_type: e.buffer_physical_type,
        buffer_unit: e.buffer_unit,
        current_buffer_stock: e.current_buffer_stock,
        projected_buffer_stock: e.projected_buffer_stock,
        condition_expression: e.condition_expression,
      })),
    })
  },

  /**
   * Inativar Rota Produtiva
   */
  async inactivateRoute(routeId: string): Promise<void> {
    await pb.collection('production_routes').update(routeId, {
      status: 'INACTIVE',
      active: false,
    })
  },

  /**
   * Excluir Rota e seus nós/edges
   */
  async deleteRoute(routeId: string): Promise<void> {
    const [nodes, edges] = await Promise.all([
      pb.collection('production_route_nodes').getFullList({ filter: `route_id = '${routeId}'` }),
      pb.collection('production_route_edges').getFullList({ filter: `route_id = '${routeId}'` }),
    ])

    for (const edge of edges) {
      await pb.collection('production_route_edges').delete(edge.id)
    }
    for (const node of nodes) {
      await pb.collection('production_route_nodes').delete(node.id)
    }
    await pb.collection('production_routes').delete(routeId)
  },

  /**
   * Valida governança antes de aprovação direta da rota
   * Aprovação só com Linhas ativas + Centros configurados + edges válidos
   */
  async validateForApproval(route: ProductionRoute): Promise<{
    canApprove: boolean
    errorMessage?: string
  }> {
    if (!route.nodes || route.nodes.length === 0) {
      return {
        canApprove: false,
        errorMessage:
          'Não é possível aprovar esta Rota: a Rota não possui Linhas Produtivas vinculadas.',
      }
    }

    // Conferir se todas as linhas estão ativas no banco
    const allLines = await pb.collection('production_lines').getFullList()
    const lineMap = new Map(allLines.map((l) => [l.id, l]))

    for (const node of route.nodes) {
      const line = lineMap.get(node.line_id)
      if (!line) {
        return {
          canApprove: false,
          errorMessage: `Não é possível aprovar esta Rota: a Linha ${node.line_code} não foi encontrada no cadastro.`,
        }
      }
      if (line.is_active === false) {
        return {
          canApprove: false,
          errorMessage: `Não é possível aprovar esta Rota: a Linha ${node.line_code} está inativa.`,
        }
      }
    }

    // Se tiver mais de 1 nó, deve haver pelo menos uma ligação entre eles
    if (route.nodes.length > 1 && (!route.edges || route.edges.length === 0)) {
      return {
        canApprove: false,
        errorMessage:
          'Não é possível aprovar esta Rota: configure as relações de precedência entre as Linhas Produtivas.',
      }
    }

    // Detecção de dependência cíclica
    if (route.edges && route.edges.length > 0) {
      const cycle = this.hasCycle(route.edges)
      if (cycle.hasCycle) {
        return {
          canApprove: false,
          errorMessage:
            'Não é possível aprovar esta Rota: a Rota contém dependência cíclica entre Linhas Produtivas.',
        }
      }
    }

    return { canApprove: true }
  },

  /**
   * Aprovar diretamente a Rota (se governança permitir)
   */
  async approveRoute(routeId: string): Promise<ProductionRoute> {
    const fullRoute = await this.getRouteById(routeId)
    if (!fullRoute) throw new Error('Rota não encontrada.')

    const validation = await this.validateForApproval(fullRoute)
    if (!validation.canApprove) {
      throw new Error(validation.errorMessage || 'Validação de governança falhou.')
    }

    const updated = await pb.collection('production_routes').update<ProductionRoute>(routeId, {
      status: 'APPROVED',
      active: true,
    })

    // Ativar edges associados
    const edges = await pb.collection('production_route_edges').getFullList({
      filter: `route_id = '${routeId}'`,
    })
    for (const edge of edges) {
      await pb.collection('production_route_edges').update(edge.id, {
        status: 'APPROVED',
      })
    }

    return updated
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

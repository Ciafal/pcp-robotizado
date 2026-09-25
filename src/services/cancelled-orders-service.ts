/**
 * Service de Gestão de Pedidos Cancelados no PCP Robotizado - HUB CIAFAL
 * Integração híbrida PocketBase + fallback resiliente com dados de demonstração identificados.
 * Auditoria imutável integrada ao pcpAuditService.
 */

import pb from '@/lib/pocketbase/client'
import {
  CancelledOrderRecord,
  ActionPlan5W2H,
  CancellationReasonCatalogItem,
  CancelledOrdersFilterState,
  CancellationExecutiveKPIs,
  ProbableResponsibility,
  AnalysisStatus,
} from '@/types/cancelled-orders'
import { getPopulatedDemoOrders } from '@/data/cancelled-orders-seed'
import { OFFICIAL_CANCELLATION_CATALOG } from '@/data/cancellation-reasons-catalog'
import { pcpAuditService } from '@/services/pcp-audit-service'
import { CancelledOrdersAIEngine } from '@/services/cancelled-orders-ai-engine'
import {
  crmRevisionIntegrationService,
  CreateRevisionRequestParams,
  RespondRevisionParams,
} from '@/services/crm-revision-integration-service'

class CancelledOrdersService {
  private memoryOrders: CancelledOrderRecord[] = []
  private memoryCatalog: CancellationReasonCatalogItem[] = [...OFFICIAL_CANCELLATION_CATALOG]
  private memoryActionPlans: ActionPlan5W2H[] = []
  private initialized = false

  public async init(): Promise<void> {
    if (this.initialized) return

    try {
      // Tenta carregar catálogo do PocketBase
      const catalogRecords = await pb.collection('pcp_cancellation_reasons_catalog').getFullList({
        sort: 'sort_order',
      })
      if (catalogRecords && catalogRecords.length > 0) {
        this.memoryCatalog = catalogRecords.map((r: any) => ({
          id: r.id,
          category: r.category,
          reason: r.reason,
          default_probable_responsibility: r.default_probable_responsibility,
          active: Boolean(r.active),
          sort_order: Number(r.sort_order),
        }))
      }
    } catch {
      // Fallback para catálogo oficial estrito
      this.memoryCatalog = [...OFFICIAL_CANCELLATION_CATALOG]
    }

    try {
      // Tenta buscar pedidos reais do PocketBase
      const ordersRecords = await pb.collection('pcp_cancelled_orders').getFullList({
        sort: '-data_ordem',
      })
      if (ordersRecords && ordersRecords.length > 0) {
        this.memoryOrders = ordersRecords.map((r: any) => ({
          id: r.id,
          empresa: r.empresa,
          centro: r.centro,
          linha: r.linha,
          ordem_venda: r.ordem_venda,
          item_ordem: r.item_ordem,
          data_ordem: r.data_ordem,
          cliente_codigo: r.cliente_codigo,
          cliente_nome: r.cliente_nome,
          representante_vendedor: r.representante_vendedor,
          material_codigo: r.material_codigo,
          material_descricao: r.material_descricao,
          familia: r.familia,
          curva_abc: r.curva_abc || 'B',
          tipo_carteira: r.tipo_carteira,
          quantidade_original_ov_t: Number(r.quantidade_original_ov_t || 0),
          quantidade_faturada_t: Number(r.quantidade_faturada_t || 0),
          saldo_cancelado_t: Number(r.saldo_cancelado_t || 0),
          unidade_medida: r.unidade_medida || 'TO',
          estoque_disponivel_data_t:
            r.estoque_disponivel_data_t !== null ? Number(r.estoque_disponivel_data_t) : null,
          preco_liquido: Number(r.preco_liquido || 0),
          valor_cancelado_brl: Number(r.valor_cancelado_brl || 0),
          condicao_pagamento: r.condicao_pagamento,
          prazo: r.prazo,
          status_faturamento: r.status_faturamento,
          data_desejada_cliente: r.data_desejada_cliente,
          data_prevista_producao: r.data_prevista_producao,
          data_efetiva_producao: r.data_efetiva_producao,
          status_recusa: r.status_recusa,
          motivo_original_sap: r.motivo_original_sap,
          categoria_motivo: r.categoria_motivo,
          observacao: r.observacao,
          data_hora_cancelamento: r.data_hora_cancelamento,
          usuario_operacao: r.usuario_operacao,
          is_demo: Boolean(r.is_demo),
          has_ai_inconsistency: Boolean(r.has_ai_inconsistency),
          ai_verification_status: r.ai_verification_status,
          ai_probable_cause: r.ai_probable_cause,
          ai_suggested_responsibility: r.ai_suggested_responsibility,
          ai_confidence_level: r.ai_confidence_level,
          ai_avoidable_status: r.ai_avoidable_status,
          ai_priority: r.ai_priority,
          ai_action_suggested: r.ai_action_suggested,
          ai_analysis_payload: r.ai_analysis_payload,
          analysis_status: r.analysis_status || 'Pendente',
          validated_cause: r.validated_cause,
          validated_responsibility: r.validated_responsibility,
          validated_by_user_name: r.validated_by_user_name,
          validated_at: r.validated_at,
          human_notes: r.human_notes,
          action_plan_id: r.action_plan_id,
        }))
      } else {
        this.memoryOrders = getPopulatedDemoOrders()
      }
    } catch {
      this.memoryOrders = getPopulatedDemoOrders()
    }

    try {
      // Carregar planos 5W2H
      const plans = await pb.collection('pcp_cancelled_action_plans').getFullList({
        sort: '-created',
      })
      if (plans && plans.length > 0) {
        this.memoryActionPlans = plans.map((p: any) => ({
          id: p.id,
          code: p.code,
          order_id: p.order_id,
          ordem_venda: p.ordem_venda,
          item_ordem: p.item_ordem,
          cliente_nome: p.cliente_nome,
          material_codigo: p.material_codigo,
          motivo_original: p.motivo_original,
          causa_provavel: p.causa_provavel,
          evidencias: p.evidencias,
          centro_linha: p.centro_linha,
          impacto_toneladas: Number(p.impacto_toneladas || 0),
          impacto_financeiro_brl: Number(p.impacto_financeiro_brl || 0),
          what_acao: p.what_acao,
          why_motivo: p.why_motivo,
          who_responsavel: p.who_responsavel,
          when_prazo: p.when_prazo,
          where_local: p.where_local,
          how_como: p.how_como,
          how_much_custo: p.how_much_custo,
          status: p.status || 'Aberto',
          created_by_name: p.created_by_name || 'Usuário PCP',
          created_at: p.created,
        }))
      }
    } catch {
      // silencia fallback
    }

    this.initialized = true
  }

  public async getOrders(filters?: CancelledOrdersFilterState): Promise<CancelledOrderRecord[]> {
    await this.init()
    await crmRevisionIntegrationService.init()

    // Sincroniza estado das solicitações de revisão CRM na lista
    const crmPendencies = await crmRevisionIntegrationService.getAllPendencies()
    if (crmPendencies.length > 0) {
      this.memoryOrders.forEach((order) => {
        const lastPendency = crmPendencies.find(
          (p) =>
            p.order_id === order.id ||
            (p.ordem_venda === order.ordem_venda && p.item_ordem === order.item_ordem),
        )
        if (lastPendency) {
          order.crm_protocolo = lastPendency.protocolo
          order.crm_data_solicitacao = lastPendency.data_solicitacao
          order.crm_responsavel = lastPendency.responsavel_destino
          order.crm_status = lastPendency.status_crm
          order.crm_motivo_solicitacao = lastPendency.motivo_solicitacao
          order.motivo_validado_apos_revisao = lastPendency.motivo_validado_apos_revisao
          order.crm_observacao = lastPendency.observacao_crm
          order.crm_responsavel_validacao = lastPendency.responsavel_validacao_crm
          order.crm_pendency_id = lastPendency.id

          if (lastPendency.status_crm === 'Em análise') {
            order.analysis_status = 'Revisão solicitada'
          } else if (
            lastPendency.status_crm === 'Motivo corrigido' ||
            lastPendency.status_crm === 'Motivo confirmado'
          ) {
            order.analysis_status = 'Revisado'
          } else if (
            lastPendency.status_crm === 'Concluído' ||
            lastPendency.status_crm === 'Improcedente'
          ) {
            order.analysis_status = 'Concluído'
          }
        }
      })
    }

    let list = [...this.memoryOrders]

    if (!filters) return list

    if (filters.buscaGeral?.trim()) {
      const q = filters.buscaGeral.toLowerCase().trim()
      list = list.filter(
        (o) =>
          o.ordem_venda.toLowerCase().includes(q) ||
          o.item_ordem.toLowerCase().includes(q) ||
          o.cliente_nome.toLowerCase().includes(q) ||
          o.material_codigo.toLowerCase().includes(q) ||
          o.material_descricao.toLowerCase().includes(q) ||
          o.motivo_original_sap.toLowerCase().includes(q),
      )
    }

    if (filters.centro && filters.centro !== 'todos') {
      list = list.filter((o) => o.centro === filters.centro)
    }

    if (filters.linha && filters.linha !== 'todas') {
      list = list.filter((o) => o.linha === filters.linha)
    }

    if (filters.empresa && filters.empresa !== 'todas') {
      list = list.filter((o) => o.empresa === filters.empresa)
    }

    if (filters.categoriaMotivo && filters.categoriaMotivo !== 'todas') {
      list = list.filter((o) => o.categoria_motivo === filters.categoriaMotivo)
    }

    if (filters.motivoCancelamento && filters.motivoCancelamento !== 'todos') {
      list = list.filter((o) => o.motivo_original_sap === filters.motivoCancelamento)
    }

    if (filters.responsabilidadeProvavel && filters.responsabilidadeProvavel !== 'todas') {
      list = list.filter(
        (o) =>
          (o.validated_responsibility || o.ai_suggested_responsibility) ===
          filters.responsabilidadeProvavel,
      )
    }

    if (filters.statusAnalise && filters.statusAnalise !== 'todos') {
      list = list.filter((o) => o.analysis_status === filters.statusAnalise)
    }

    if (filters.comInconsistenciaIA && filters.comInconsistenciaIA !== 'todos') {
      const wantInconsistency = filters.comInconsistenciaIA === 'sim'
      list = list.filter((o) => o.has_ai_inconsistency === wantInconsistency)
    }

    if (filters.curvaAbc && filters.curvaAbc !== 'todos') {
      list = list.filter((o) => o.curva_abc === filters.curvaAbc)
    }

    if (filters.cliente && filters.cliente !== 'todos') {
      list = list.filter(
        (o) => o.cliente_codigo === filters.cliente || o.cliente_nome === filters.cliente,
      )
    }

    if (filters.material && filters.material !== 'todos') {
      list = list.filter((o) => o.material_codigo === filters.material)
    }

    if (filters.recorrencia && filters.recorrencia !== 'todos') {
      if (filters.recorrencia === 'recorrente') {
        list = list.filter((o) => o.ai_analysis_payload?.recurringPatternDetected === true)
      } else {
        list = list.filter((o) => !o.ai_analysis_payload?.recurringPatternDetected)
      }
    }

    if (filters.evitabilidade && filters.evitabilidade !== 'todos') {
      if (filters.evitabilidade === 'evitavel') {
        list = list.filter((o) => o.ai_avoidable_status === 'Potencialmente evitável')
      } else if (filters.evitabilidade === 'nao_evitavel') {
        list = list.filter((o) => o.ai_avoidable_status === 'Provavelmente não evitável')
      } else if (filters.evitabilidade === 'investigacao') {
        list = list.filter((o) => o.ai_avoidable_status === 'Necessita investigação')
      }
    }

    return list
  }

  public async getOrderById(id: string): Promise<CancelledOrderRecord | null> {
    await this.init()
    const found = this.memoryOrders.find((o) => o.id === id)
    return found || null
  }

  public async getCatalog(): Promise<CancellationReasonCatalogItem[]> {
    await this.init()
    return this.memoryCatalog
  }

  public calculateKPIs(orders: CancelledOrderRecord[]): CancellationExecutiveKPIs {
    const totalPedidosQtd = orders.length
    const totalVolumeToneladas = orders.reduce((acc, o) => acc + (o.saldo_cancelado_t || 0), 0)
    const totalValorBrl = orders.reduce((acc, o) => acc + (o.valor_cancelado_brl || 0), 0)

    // Estimativa de carteira total do período (base histórica proporcional CIAFAL ~ 18.000 t)
    const carteiraTotalEstimadaT = 18500.0
    const percentualCarteiraCancelada =
      carteiraTotalEstimadaT > 0 ? (totalVolumeToneladas / carteiraTotalEstimadaT) * 100 : 0

    const pcpOrders = orders.filter((o) => o.categoria_motivo === 'PCP/Planejamento')
    const pcpQtd = pcpOrders.length
    const pcpToneladas = pcpOrders.reduce((acc, o) => acc + (o.saldo_cancelado_t || 0), 0)

    const comercialOrders = orders.filter((o) => o.categoria_motivo === 'Comercial')
    const comercialQtd = comercialOrders.length
    const comercialToneladas = comercialOrders.reduce(
      (acc, o) => acc + (o.saldo_cancelado_t || 0),
      0,
    )

    // Principal motivo
    const mapMotivos: Record<string, number> = {}
    orders.forEach((o) => {
      mapMotivos[o.motivo_original_sap] =
        (mapMotivos[o.motivo_original_sap] || 0) + (o.saldo_cancelado_t || 0)
    })
    let principalMotivoNome = 'Nenhum'
    let principalMotivoToneladas = 0
    Object.entries(mapMotivos).forEach(([motivo, ton]) => {
      if (ton > principalMotivoToneladas) {
        principalMotivoToneladas = ton
        principalMotivoNome = motivo
      }
    })

    const reincidentesQtd = orders.filter(
      (o) => o.ai_analysis_payload?.recurringPatternDetected,
    ).length
    const inconsistenciasIAQtd = orders.filter((o) => o.has_ai_inconsistency).length
    const evitaveis = orders.filter((o) => o.ai_avoidable_status === 'Potencialmente evitável')
    const potencialmenteEvitaveisQtd = evitaveis.length
    const potencialmenteEvitaveisToneladas = evitaveis.reduce(
      (acc, o) => acc + (o.saldo_cancelado_t || 0),
      0,
    )

    return {
      totalPedidosQtd,
      totalVolumeToneladas,
      totalValorBrl,
      percentualCarteiraCancelada,
      pcpQtd,
      pcpToneladas,
      comercialQtd,
      comercialToneladas,
      principalMotivoNome,
      principalMotivoToneladas,
      reincidentesQtd,
      inconsistenciasIAQtd,
      potencialmenteEvitaveisQtd,
      potencialmenteEvitaveisToneladas,
    }
  }

  /**
   * Salva feedback/validação humana do usuário garantindo preservação do motivo SAP original
   */
  public async submitHumanFeedback(params: {
    orderId: string
    newStatus: AnalysisStatus
    validatedCause?: string
    validatedResponsibility?: ProbableResponsibility
    humanNotes?: string
    userName: string
  }): Promise<CancelledOrderRecord> {
    await this.init()
    const idx = this.memoryOrders.findIndex((o) => o.id === params.orderId)
    if (idx === -1) {
      throw new Error(`Pedido com ID ${params.orderId} não encontrado.`)
    }

    const order = this.memoryOrders[idx]
    const valorAnterior = {
      status: order.analysis_status,
      validated_cause: order.validated_cause,
      validated_responsibility: order.validated_responsibility,
      human_notes: order.human_notes,
    }

    const updated: CancelledOrderRecord = {
      ...order,
      analysis_status: params.newStatus,
      validated_cause:
        params.validatedCause !== undefined ? params.validatedCause : order.validated_cause,
      validated_responsibility:
        params.validatedResponsibility !== undefined
          ? params.validatedResponsibility
          : order.validated_responsibility,
      human_notes: params.humanNotes !== undefined ? params.humanNotes : order.human_notes,
      validated_by_user_name: params.userName,
      validated_at: new Date().toLocaleString('pt-BR'),
    }

    this.memoryOrders[idx] = updated

    // Tenta persistir no PocketBase se não for somente demo
    try {
      await pb.collection('pcp_cancelled_orders').update(order.id, {
        analysis_status: updated.analysis_status,
        validated_cause: updated.validated_cause,
        validated_responsibility: updated.validated_responsibility,
        human_notes: updated.human_notes,
        validated_by_user_name: updated.validated_by_user_name,
        validated_at: updated.validated_at,
      })
    } catch {
      // Mantém na memória com segurança
    }

    // Registra na governança de auditoria imutável
    try {
      await pcpAuditService.recordLog({
        user_name: params.userName,
        action: `~ VALIDAÇÃO HUMANA CANCELAMENTO [${order.ordem_venda}/${order.item_ordem}]`,
        entity: 'pcp_cancelled_orders',
        record_id: order.id,
        module: 'Gestão de Carteira',
        screen: 'Pedidos Cancelados',
        line: order.linha,
        center: order.centro,
        reason: updated.analysis_status,
        justification: `Validação humana registrada: status '${updated.analysis_status}', resp '${updated.validated_responsibility || 'PCP'}'`,
        details: {
          before_state: valorAnterior,
          after_state: {
            status: updated.analysis_status,
            validated_cause: updated.validated_cause,
            validated_responsibility: updated.validated_responsibility,
            human_notes: updated.human_notes,
          },
        },
      })
    } catch {
      // Auditoria resiliente
    }
    return updated
  }

  /**
   * Cria Plano de Ação 5W2H para o pedido cancelado
   */
  public async createActionPlan(
    plan: Omit<ActionPlan5W2H, 'id' | 'code' | 'created_at'>,
  ): Promise<ActionPlan5W2H> {
    await this.init()
    const code = `5W2H-CANC-${Date.now().toString().slice(-6)}`
    const newPlan: ActionPlan5W2H = {
      ...plan,
      id: `PLAN-${Date.now()}`,
      code,
      created_at: new Date().toLocaleString('pt-BR'),
    }

    try {
      const record = await pb.collection('pcp_cancelled_action_plans').create({
        code: newPlan.code,
        order_id: newPlan.order_id,
        ordem_venda: newPlan.ordem_venda,
        item_ordem: newPlan.item_ordem,
        cliente_nome: newPlan.cliente_nome,
        material_codigo: newPlan.material_codigo,
        motivo_original: newPlan.motivo_original,
        causa_provavel: newPlan.causa_provavel,
        evidencias: newPlan.evidencias,
        centro_linha: newPlan.centro_linha,
        impacto_toneladas: newPlan.impacto_toneladas,
        impacto_financeiro_brl: newPlan.impacto_financeiro_brl,
        what_acao: newPlan.what_acao,
        why_motivo: newPlan.why_motivo,
        who_responsavel: newPlan.who_responsavel,
        when_prazo: newPlan.when_prazo,
        where_local: newPlan.where_local,
        how_como: newPlan.how_como,
        how_much_custo: newPlan.how_much_custo,
        status: newPlan.status,
        created_by_name: newPlan.created_by_name,
      })
      newPlan.id = record.id
    } catch {
      // Fallback em memória
    }

    this.memoryActionPlans.unshift(newPlan)

    // Atualiza status do pedido para Ação Criada
    const orderIdx = this.memoryOrders.findIndex((o) => o.id === plan.order_id)
    if (orderIdx !== -1) {
      this.memoryOrders[orderIdx].analysis_status = 'Ação Criada'
      this.memoryOrders[orderIdx].action_plan_id = newPlan.code
    }

    // Auditoria
    try {
      await pcpAuditService.recordLog({
        user_name: newPlan.created_by_name,
        action: `+ NOVO PLANO 5W2H CANCELAMENTO [${newPlan.code}]`,
        entity: 'pcp_cancelled_action_plans',
        record_id: newPlan.id,
        module: 'Gestão de Carteira',
        screen: 'Pedidos Cancelados',
        line: plan.centro_linha,
        center: plan.centro_linha,
        reason: newPlan.code,
        justification: `Plano de ação ${newPlan.code} criado para OV ${newPlan.ordem_venda}: ${newPlan.what_acao}`,
        details: { plan: newPlan },
      })
    } catch {
      // silencia
    }
    return newPlan
  }

  public async getActionPlans(): Promise<ActionPlan5W2H[]> {
    await this.init()
    return this.memoryActionPlans
  }

  /**
   * Solicita revisão ao CRM 360º para um pedido cancelado
   */
  public async requestCrmRevision(
    params: Omit<CreateRevisionRequestParams, 'order'> & { orderId: string },
  ): Promise<{ order: CancelledOrderRecord; pendency: any }> {
    await this.init()
    const order = await this.getOrderById(params.orderId)
    if (!order) {
      throw new Error(`Pedido com ID ${params.orderId} não encontrado.`)
    }

    const pendency = await crmRevisionIntegrationService.createRevisionRequest({
      order,
      motivoSolicitacao: params.motivoSolicitacao,
      justificativa: params.justificativa,
      prioridade: params.prioridade,
      responsavelDestino: params.responsavelDestino,
      prazoRetorno: params.prazoRetorno,
      solicitanteNome: params.solicitanteNome,
    })

    const idx = this.memoryOrders.findIndex((o) => o.id === order.id)
    if (idx !== -1) {
      this.memoryOrders[idx] = {
        ...this.memoryOrders[idx],
        analysis_status: 'Revisão solicitada',
        crm_protocolo: pendency.protocolo,
        crm_data_solicitacao: pendency.data_solicitacao,
        crm_responsavel: pendency.responsavel_destino,
        crm_status: pendency.status_crm,
        crm_motivo_solicitacao: pendency.motivo_solicitacao,
        crm_pendency_id: pendency.id,
      }
    }

    return {
      order: this.memoryOrders[idx !== -1 ? idx : 0],
      pendency,
    }
  }

  /**
   * Responde solicitação de revisão via CRM 360º
   */
  public async respondCrmRevision(
    params: RespondRevisionParams,
  ): Promise<{ order: CancelledOrderRecord | null; pendency: any }> {
    await this.init()
    const pendency = await crmRevisionIntegrationService.respondRevision(params)

    let updatedOrder: CancelledOrderRecord | null = null
    const idx = this.memoryOrders.findIndex(
      (o) =>
        o.id === pendency.order_id ||
        (o.ordem_venda === pendency.ordem_venda && o.item_ordem === pendency.item_ordem),
    )

    if (idx !== -1) {
      let newAnalysisStatus: any = 'Revisado'
      if (params.statusCrm === 'Concluído' || params.statusCrm === 'Improcedente') {
        newAnalysisStatus = 'Concluído'
      } else if (params.statusCrm === 'Em análise') {
        newAnalysisStatus = 'Em análise CRM'
      }

      this.memoryOrders[idx] = {
        ...this.memoryOrders[idx],
        analysis_status: newAnalysisStatus,
        crm_status: pendency.status_crm,
        motivo_validado_apos_revisao: pendency.motivo_validado_apos_revisao,
        crm_observacao: pendency.observacao_crm,
        crm_responsavel_validacao: pendency.responsavel_validacao_crm,
      }
      updatedOrder = this.memoryOrders[idx]
    }

    return {
      order: updatedOrder,
      pendency,
    }
  }

  public triggerAIReanalysis(order: CancelledOrderRecord): CancelledOrderRecord {
    const analysis = CancelledOrdersAIEngine.analyzeOrder(order, this.memoryOrders)
    const updated: CancelledOrderRecord = {
      ...order,
      has_ai_inconsistency: analysis.hasInconsistency,
      ai_verification_status: analysis.verificationStatus,
      ai_probable_cause: analysis.probableCause,
      ai_suggested_responsibility: analysis.suggestedResponsibility,
      ai_confidence_level: analysis.confidenceLevel,
      ai_avoidable_status: analysis.avoidableStatus,
      ai_priority: analysis.priority,
      ai_action_suggested: analysis.actionSuggested,
      ai_analysis_payload: analysis,
    }

    const idx = this.memoryOrders.findIndex((o) => o.id === order.id)
    if (idx !== -1) {
      this.memoryOrders[idx] = updated
    }
    return updated
  }
}

export const cancelledOrdersService = new CancelledOrdersService()

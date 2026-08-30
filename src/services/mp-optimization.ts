import pb from '@/lib/pocketbase/client'
import {
  MPDimensionalItem,
  MPApplicationRequirement,
  MPCuttingPlan,
  MPReapplicationOpportunity,
  MPWorkflowApproval,
  MPApplicationAuditHistory,
  MPPlannedVsRealized,
  MPSapIntegrationQueueItem,
  MPOptimizationParameters,
  MPPurchaseOrder,
  MPFutureReception,
  MPFutureInventoryProjection,
  HorizonCategory,
} from '@/types/mp-optimization'

export const mpOptimizationService = {
  // 1. Pedidos de Compra SAP ECC (ME23N / ME2M)
  async getPurchaseOrders(
    filters?: string,
    sort: string = '-order_date',
  ): Promise<MPPurchaseOrder[]> {
    try {
      const records = await pb.collection('mp_purchase_orders').getFullList<MPPurchaseOrder>({
        filter: filters,
        sort,
      })
      return records
    } catch (err) {
      console.warn('mp_purchase_orders getFullList empty or offline:', err)
      return []
    }
  },

  async createPurchaseOrder(data: Partial<MPPurchaseOrder>): Promise<MPPurchaseOrder> {
    return await pb.collection('mp_purchase_orders').create<MPPurchaseOrder>(data)
  },

  async updatePurchaseOrder(id: string, data: Partial<MPPurchaseOrder>): Promise<MPPurchaseOrder> {
    return await pb.collection('mp_purchase_orders').update<MPPurchaseOrder>(id, data)
  },

  // 2. Recebimentos Futuros de MP (Horizontes HOJE / 7 / 15 / 30 / 60 / 90 Dias)
  async getFutureReceptions(
    horizon?: HorizonCategory,
    filters?: string,
  ): Promise<MPFutureReception[]> {
    try {
      const combinedFilter = [horizon ? `horizon_category = "${horizon}"` : '', filters || '']
        .filter(Boolean)
        .join(' && ')

      const records = await pb.collection('mp_future_receptions').getFullList<MPFutureReception>({
        filter: combinedFilter || undefined,
        sort: 'expected_date',
      })
      return records
    } catch (err) {
      console.warn('mp_future_receptions getFullList empty or offline:', err)
      return []
    }
  },

  async createFutureReception(data: Partial<MPFutureReception>): Promise<MPFutureReception> {
    return await pb.collection('mp_future_receptions').create<MPFutureReception>(data)
  },

  // 3. Projeção de Estoque Futuro de MP (Estoque Atual + Pedidos + Recebimentos - Consumo)
  async getFutureInventoryProjections(
    horizon?: HorizonCategory,
    filters?: string,
  ): Promise<MPFutureInventoryProjection[]> {
    try {
      const combinedFilter = [horizon ? `horizon_category = "${horizon}"` : '', filters || '']
        .filter(Boolean)
        .join(' && ')

      const records = await pb
        .collection('mp_future_inventory_projection')
        .getFullList<MPFutureInventoryProjection>({
          filter: combinedFilter || undefined,
          sort: 'material_code,steel_grade',
        })
      return records
    } catch (err) {
      console.warn('mp_future_inventory_projection getFullList empty or offline:', err)
      return []
    }
  },

  async createFutureInventoryProjection(
    data: Partial<MPFutureInventoryProjection>,
  ): Promise<MPFutureInventoryProjection> {
    return await pb
      .collection('mp_future_inventory_projection')
      .create<MPFutureInventoryProjection>(data)
  },

  // 4. Estoque Dimensional Real Rastreável (Individual por Bloco / Placa / Sobra)
  async getDimensionalInventory(
    filters?: string,
    sort: string = '-created',
  ): Promise<MPDimensionalItem[]> {
    try {
      const records = await pb
        .collection('mp_dimensional_inventory')
        .getFullList<MPDimensionalItem>({
          filter: filters,
          sort,
        })
      return records
    } catch (err) {
      console.warn('mp_dimensional_inventory getFullList empty or offline:', err)
      return []
    }
  },

  async createDimensionalItem(data: Partial<MPDimensionalItem>): Promise<MPDimensionalItem> {
    return await pb.collection('mp_dimensional_inventory').create<MPDimensionalItem>(data)
  },

  async updateDimensionalItem(
    id: string,
    data: Partial<MPDimensionalItem>,
  ): Promise<MPDimensionalItem> {
    return await pb.collection('mp_dimensional_inventory').update<MPDimensionalItem>(id, data)
  },

  // 5. Matriz Oficial de Requisitos por Aplicação (ZPPMP, ZBITOLAS, ZPPT045, ZPPT058)
  async getApplicationRequirements(filters?: string): Promise<MPApplicationRequirement[]> {
    try {
      const records = await pb
        .collection('mp_application_requirements')
        .getFullList<MPApplicationRequirement>({
          filter: filters,
          sort: 'priority_order,application_code',
        })
      return records
    } catch (err) {
      console.warn('mp_application_requirements getFullList empty or offline:', err)
      return []
    }
  },

  // 6. Planos Inteligentes de Corte Versionados
  async getCuttingPlans(
    filters?: string,
    sort: string = '-version,-created',
  ): Promise<MPCuttingPlan[]> {
    try {
      const records = await pb.collection('mp_cutting_plans').getFullList<MPCuttingPlan>({
        filter: filters,
        sort,
      })
      return records
    } catch (err) {
      console.warn('mp_cutting_plans getFullList empty or offline:', err)
      return []
    }
  },

  async createCuttingPlan(data: Partial<MPCuttingPlan>): Promise<MPCuttingPlan> {
    return await pb.collection('mp_cutting_plans').create<MPCuttingPlan>(data)
  },

  async updateCuttingPlan(id: string, data: Partial<MPCuttingPlan>): Promise<MPCuttingPlan> {
    return await pb.collection('mp_cutting_plans').update<MPCuttingPlan>(id, data)
  },

  // 7. Oportunidades de Reaplicação e Cortes Existentes
  async getReapplicationOpportunities(
    filters?: string,
    sort: string = '-ai_score',
  ): Promise<MPReapplicationOpportunity[]> {
    try {
      const records = await pb
        .collection('mp_reapplication_opportunities')
        .getFullList<MPReapplicationOpportunity>({
          filter: filters,
          sort,
        })
      return records
    } catch (err) {
      console.warn('mp_reapplication_opportunities getFullList empty or offline:', err)
      return []
    }
  },

  async createReapplicationOpportunity(
    data: Partial<MPReapplicationOpportunity>,
  ): Promise<MPReapplicationOpportunity> {
    return await pb
      .collection('mp_reapplication_opportunities')
      .create<MPReapplicationOpportunity>(data)
  },

  async updateReapplicationOpportunity(
    id: string,
    data: Partial<MPReapplicationOpportunity>,
  ): Promise<MPReapplicationOpportunity> {
    return await pb
      .collection('mp_reapplication_opportunities')
      .update<MPReapplicationOpportunity>(id, data)
  },

  // 8. Governança e Fluxo de Aprovações em 2 Fases (PCP + Produção + Qualidade)
  async getWorkflowApprovals(
    filters?: string,
    sort: string = '-created',
  ): Promise<MPWorkflowApproval[]> {
    try {
      const records = await pb.collection('mp_workflow_approvals').getFullList<MPWorkflowApproval>({
        filter: filters,
        sort,
      })
      return records
    } catch (err) {
      console.warn('mp_workflow_approvals getFullList empty or offline:', err)
      return []
    }
  },

  async createWorkflowApproval(data: Partial<MPWorkflowApproval>): Promise<MPWorkflowApproval> {
    return await pb.collection('mp_workflow_approvals').create<MPWorkflowApproval>(data)
  },

  async updateWorkflowApproval(
    id: string,
    data: Partial<MPWorkflowApproval>,
  ): Promise<MPWorkflowApproval> {
    return await pb.collection('mp_workflow_approvals').update<MPWorkflowApproval>(id, data)
  },

  // 9. Histórico de Alterações de Aplicação (Auditoria ZPPT058 / ZMM029)
  async getAuditHistory(
    filters?: string,
    sort: string = '-event_timestamp',
  ): Promise<MPApplicationAuditHistory[]> {
    try {
      const records = await pb
        .collection('mp_application_audit_history')
        .getFullList<MPApplicationAuditHistory>({
          filter: filters,
          sort,
        })
      return records
    } catch (err) {
      console.warn('mp_application_audit_history getFullList empty or offline:', err)
      return []
    }
  },

  async recordApplicationModification(
    data: Partial<MPApplicationAuditHistory>,
  ): Promise<MPApplicationAuditHistory> {
    return await pb
      .collection('mp_application_audit_history')
      .create<MPApplicationAuditHistory>(data)
  },

  // 10. Plano x Real (Aderência e Feedback Estatístico para IA)
  async getPlannedVsRealized(
    filters?: string,
    sort: string = '-execution_date',
  ): Promise<MPPlannedVsRealized[]> {
    try {
      const records = await pb
        .collection('mp_planned_vs_realized')
        .getFullList<MPPlannedVsRealized>({
          filter: filters,
          sort,
        })
      return records
    } catch (err) {
      console.warn('mp_planned_vs_realized getFullList empty or offline:', err)
      return []
    }
  },

  // 11. Fila de Integração PostgreSQL → SAP ECC (Ciclo Criado → Aprovado → Enviado → Ordem SAP)
  async getSapIntegrationQueue(
    filters?: string,
    sort: string = '-created',
  ): Promise<MPSapIntegrationQueueItem[]> {
    try {
      const records = await pb
        .collection('mp_sap_integration_queue')
        .getFullList<MPSapIntegrationQueueItem>({
          filter: filters,
          sort,
        })
      return records
    } catch (err) {
      console.warn('mp_sap_integration_queue getFullList empty or offline:', err)
      return []
    }
  },

  async enqueueSapIntegration(
    data: Partial<MPSapIntegrationQueueItem>,
  ): Promise<MPSapIntegrationQueueItem> {
    return await pb.collection('mp_sap_integration_queue').create<MPSapIntegrationQueueItem>(data)
  },

  async updateSapIntegrationItem(
    id: string,
    data: Partial<MPSapIntegrationQueueItem>,
  ): Promise<MPSapIntegrationQueueItem> {
    return await pb
      .collection('mp_sap_integration_queue')
      .update<MPSapIntegrationQueueItem>(id, data)
  },

  // 12. Parâmetros de Otimização e Pesos Parametrizáveis da IA
  async getOptimizationParameters(): Promise<MPOptimizationParameters[]> {
    try {
      const records = await pb
        .collection('mp_optimization_parameters')
        .getFullList<MPOptimizationParameters>()
      return records
    } catch (err) {
      console.warn('mp_optimization_parameters getFullList empty or offline:', err)
      return []
    }
  },

  async saveOptimizationParameters(
    id: string,
    data: Partial<MPOptimizationParameters>,
  ): Promise<MPOptimizationParameters> {
    if (id && id !== 'default-config') {
      return await pb
        .collection('mp_optimization_parameters')
        .update<MPOptimizationParameters>(id, data)
    }
    return await pb.collection('mp_optimization_parameters').create<MPOptimizationParameters>(data)
  },
}

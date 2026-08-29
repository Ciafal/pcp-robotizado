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
} from '@/types/mp-optimization'

export const mpOptimizationService = {
  // 1. Estoque Dimensional
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

  // 2. Requisitos por Aplicação
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

  // 3. Planos de Corte
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

  // 4. Oportunidades de Reaplicação
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

  // 5. Governança e Aprovações
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

  // 6. Histórico de Alterações de Aplicação (ZPPT058 / ZMM029)
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

  // 7. Plano x Real
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

  // 8. Fila de Integração SAP
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

  // 9. Parâmetros de Otimização
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

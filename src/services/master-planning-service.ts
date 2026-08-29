// Serviço Oficial de Planejamento Mestre de Produção (PMP / S&OP) CIAFAL
// Integração: SAP ECC (Ordens/Capacidades), CRM 360º (Forecast Ponderado), Central de Sequenciamento.

import pb from '@/lib/pocketbase/client'
import {
  MasterPlanHeader,
  MasterPlanItem,
  CRMForecastRecord,
  MasterPlanVersion,
  MasterPlanningKPIs,
  PlanHorizon,
  WhatIfSimulationParams,
  WhatIfSimulationResult,
} from '@/types/master-planning-inventory'
import { DeterministicMasterPlanningEngine } from './deterministic-master-planning-engine'

export class MasterPlanningService {
  /**
   * Consulta os Planos Mestres por horizonte (ANUAL, MENSAL, SEMANAL)
   */
  public async getMasterPlans(params?: {
    horizon?: PlanHorizon
    plantCode?: string
    periodRef?: string
  }): Promise<MasterPlanHeader[]> {
    try {
      const filterParts: string[] = []
      if (params?.horizon) {
        filterParts.push(`horizon_type = '${params.horizon}'`)
      }
      if (params?.plantCode && params.plantCode !== 'ALL') {
        filterParts.push(`plant_code = '${params.plantCode}'`)
      }
      if (params?.periodRef) {
        filterParts.push(`period_ref = '${params.periodRef}'`)
      }

      const records = await pb.collection('master_plans').getFullList({
        filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
        sort: '-period_ref,-version',
      })

      return records.map((r: any) => ({
        id: r.id,
        plan_code: r.plan_code,
        title: r.title,
        horizon_type: r.horizon_type,
        period_ref: r.period_ref,
        year: r.year,
        month: r.month,
        version: r.version || 1,
        status: r.status || 'VIGENTE',
        plant_code: r.plant_code,
        total_planned_tons: r.total_planned_tons || 0,
        total_produced_tons: r.total_produced_tons || 0,
        firm_demand_tons: r.firm_demand_tons || 0,
        crm_forecast_tons: r.crm_forecast_tons || 0,
        adherence_volume_pct: r.adherence_volume_pct || 0,
        adherence_mix_pct: r.adherence_mix_pct || 0,
        adherence_temporal_pct: r.adherence_temporal_pct || 0,
        adherence_overall_pct: r.adherence_overall_pct || 0,
        forecast_accuracy_pct: r.forecast_accuracy_pct || 0,
        forecast_bias_pct: r.forecast_bias_pct || 0,
        responsible_name: r.responsible_name || 'Engenharia de Planejamento CIAFAL',
        change_reason: r.change_reason,
        created: r.created,
        updated: r.updated,
      }))
    } catch {
      return []
    }
  }

  /**
   * Consulta Itens do Plano Mestre
   */
  public async getPlanItems(params?: {
    planCode?: string
    lineCode?: string
    productCode?: string
    plantCode?: string
  }): Promise<MasterPlanItem[]> {
    try {
      const filterParts: string[] = []
      if (params?.planCode) {
        filterParts.push(`plan_code = '${params.planCode}'`)
      }
      if (params?.lineCode && params.lineCode !== 'ALL') {
        filterParts.push(`line_code = '${params.lineCode}'`)
      }
      if (params?.productCode) {
        filterParts.push(`product_code = '${params.productCode}'`)
      }
      if (params?.plantCode && params.plantCode !== 'ALL') {
        filterParts.push(`plant_code = '${params.plantCode}'`)
      }

      const records = await pb.collection('master_plan_items').getFullList({
        filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
        sort: 'line_code,product_code',
      })

      return records.map((r: any) => ({
        id: r.id,
        item_code: r.item_code,
        plan_code: r.plan_code,
        product_code: r.product_code,
        product_name: r.product_name || r.product_code,
        family_code: r.family_code || 'TUBOS',
        steel_grade: r.steel_grade || 'SAE 1020',
        line_code: r.line_code || 'L1',
        plant_code: r.plant_code || '1000',
        production_nature: r.production_nature || 'PRODUCAO_PROPRIA',
        order_type: r.order_type || 'MTS',
        period_ref: r.period_ref,
        planned_tons: r.planned_tons || 0,
        programmed_tons: r.programmed_tons || 0,
        produced_tons: r.produced_tons || 0,
        firm_sales_tons: r.firm_sales_tons || 0,
        crm_forecast_tons: r.crm_forecast_tons || 0,
        final_stock_tons: r.final_stock_tons || 0,
        adherence_volume_pct: r.adherence_volume_pct || 0,
        adherence_mix_pct: r.adherence_mix_pct || 0,
        adherence_temporal_pct: r.adherence_temporal_pct || 0,
        gap_tons: r.gap_tons || 0,
        forecast_accuracy_pct: r.forecast_accuracy_pct || 0,
        forecast_bias_pct: r.forecast_bias_pct || 0,
        deviation_cause: r.deviation_cause,
        deviation_justification: r.deviation_justification,
        action_plan: r.action_plan,
        created: r.created,
        updated: r.updated,
      }))
    } catch {
      return []
    }
  }

  /**
   * Consulta registros de Previsibilidade Comercial do CRM 360º
   */
  public async getCRMForecast(params?: {
    periodRef?: string
    demandLayer?: string
    salesRep?: string
  }): Promise<CRMForecastRecord[]> {
    try {
      const filterParts: string[] = []
      if (params?.periodRef) {
        filterParts.push(`period_ref = '${params.periodRef}'`)
      }
      if (params?.demandLayer && params.demandLayer !== 'ALL') {
        filterParts.push(`demand_layer = '${params.demandLayer}'`)
      }

      const records = await pb.collection('crm_forecast_records').getFullList({
        filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
        sort: '-weighted_tons',
      })

      return records.map((r: any) => ({
        id: r.id,
        record_code: r.record_code,
        customer_code: r.customer_code,
        customer_name: r.customer_name,
        sales_rep_name: r.sales_rep_name || 'Equipe Comercial CIAFAL',
        region: r.region || 'Sudeste / MG',
        segment: r.segment || 'Construção Civil',
        product_code: r.product_code,
        product_name: r.product_name,
        family_code: r.family_code,
        steel_grade: r.steel_grade,
        demand_layer: r.demand_layer,
        funnel_stage: r.funnel_stage,
        probability_pct: r.probability_pct || 50,
        quantity_tons: r.quantity_tons || 0,
        weighted_tons: r.weighted_tons || 0,
        period_ref: r.period_ref,
        expected_date: r.expected_date,
        last_purchase_date: r.last_purchase_date,
        historical_conversion_pct: r.historical_conversion_pct || 65,
        status: r.status || 'ATIVO',
      }))
    } catch {
      return []
    }
  }

  /**
   * Consulta versões históricas do Plano Mestre
   */
  public async getPlanVersions(planCode?: string): Promise<MasterPlanVersion[]> {
    try {
      const records = await pb.collection('master_plan_versions').getFullList({
        filter: planCode ? `plan_code = '${planCode}'` : undefined,
        sort: '-version_number',
      })

      return records.map((r: any) => ({
        id: r.id,
        version_code: r.version_code,
        plan_code: r.plan_code,
        version_number: r.version_number,
        period_ref: r.period_ref,
        author_name: r.author_name,
        author_email: r.author_email,
        change_reason: r.change_reason,
        valid_from: r.valid_from,
        valid_until: r.valid_until,
        total_planned_tons: r.total_planned_tons || 0,
        crm_forecast_tons: r.crm_forecast_tons || 0,
        crm_active_snapshot: r.crm_active_snapshot,
        plan_payload: r.plan_payload,
        created: r.created,
        updated: r.updated,
      }))
    } catch {
      return []
    }
  }

  /**
   * Consolida KPIs Executivos do PMP
   */
  public getKPIs(items: MasterPlanItem[], plan?: MasterPlanHeader): MasterPlanningKPIs {
    return DeterministicMasterPlanningEngine.getMasterPlanningKPIs(items, plan)
  }

  /**
   * Executa Simulação "E Se?" (What-If)
   */
  public simulateWhatIf(
    items: MasterPlanItem[],
    params: WhatIfSimulationParams,
  ): WhatIfSimulationResult {
    return DeterministicMasterPlanningEngine.runWhatIfSimulation(items, params)
  }

  /**
   * Atualiza justificativa e causa de desvio de um item do plano
   */
  public async updateItemDeviation(
    itemId: string,
    data: {
      deviation_cause: string
      deviation_justification: string
      action_plan: string
    },
  ): Promise<boolean> {
    try {
      await pb.collection('master_plan_items').update(itemId, data)

      await pb.collection('pcp_audit_logs').create({
        event_type: 'SCHEDULE_ACTION',
        action: 'MASTER_PLAN_DEVIATION_JUSTIFIED',
        resource: 'MASTER_PLAN_ITEM',
        resource_id: itemId,
        scope: 'GLOBAL',
        outcome: 'SUCCESS',
        details: data,
      })

      return true
    } catch {
      return false
    }
  }
}

export const masterPlanningService = new MasterPlanningService()
export default masterPlanningService

import pb from '@/lib/pocketbase/client'
import {
  ProductQualityRequirement,
  OrderRequirementSheet,
  QualityInspectionDemand,
  QualityCapacityPlanning,
  QualityPreProgramAnalysis,
  InspectionType,
  QualityDemandStatus,
} from '@/types/product-quality'

export const qualityService = {
  // 1. Catálogo Mestre de Requisitos de Qualidade
  async listProductQualityRequirements(): Promise<ProductQualityRequirement[]> {
    try {
      const records = await pb.collection('product_quality_requirements').getFullList({
        sort: 'product_code',
      })
      return records as unknown as ProductQualityRequirement[]
    } catch (err) {
      console.warn('Fallback product_quality_requirements:', err)
      return []
    }
  },

  async getProductQualityRequirementByCode(
    productCode: string,
  ): Promise<ProductQualityRequirement | null> {
    try {
      const record = await pb
        .collection('product_quality_requirements')
        .getFirstListItem(`product_code = '${productCode}'`)
      return record as unknown as ProductQualityRequirement
    } catch {
      return null
    }
  },

  async saveProductQualityRequirement(
    data: Partial<ProductQualityRequirement>,
  ): Promise<ProductQualityRequirement> {
    if (data.id) {
      return (await pb
        .collection('product_quality_requirements')
        .update(data.id, data)) as unknown as ProductQualityRequirement
    }
    return (await pb
      .collection('product_quality_requirements')
      .create(data)) as unknown as ProductQualityRequirement
  },

  // 2. Fichas de Requisitos do Pedido MTO
  async listOrderRequirementSheets(): Promise<OrderRequirementSheet[]> {
    try {
      const records = await pb.collection('order_requirement_sheets').getFullList({
        sort: '-created',
      })
      return records as unknown as OrderRequirementSheet[]
    } catch (err) {
      console.warn('Fallback order_requirement_sheets:', err)
      return []
    }
  },

  async getRequirementSheetByOrder(orderNumber: string): Promise<OrderRequirementSheet | null> {
    try {
      const record = await pb
        .collection('order_requirement_sheets')
        .getFirstListItem(`order_number = '${orderNumber}' || sheet_code = '${orderNumber}'`)
      return record as unknown as OrderRequirementSheet
    } catch {
      return null
    }
  },

  async getRequirementSheetBySalesOrder(
    salesOrder: string,
    item = '10',
  ): Promise<OrderRequirementSheet | null> {
    try {
      const record = await pb
        .collection('order_requirement_sheets')
        .getFirstListItem(`sales_order_sap = '${salesOrder}' && sales_order_item = '${item}'`)
      return record as unknown as OrderRequirementSheet
    } catch {
      return null
    }
  },

  async saveOrderRequirementSheet(
    data: Partial<OrderRequirementSheet>,
  ): Promise<OrderRequirementSheet> {
    if (data.id) {
      return (await pb
        .collection('order_requirement_sheets')
        .update(data.id, data)) as unknown as OrderRequirementSheet
    }
    return (await pb
      .collection('order_requirement_sheets')
      .create(data)) as unknown as OrderRequirementSheet
  },

  // 3. Demandas de Qualidade (Ultrassom, Ensaios Mecânicos, etc.)
  async listQualityDemands(filter?: string): Promise<QualityInspectionDemand[]> {
    try {
      const records = await pb.collection('quality_inspection_demands').getFullList({
        filter: filter || undefined,
        sort: 'planned_inspection_date,priority',
      })
      return records as unknown as QualityInspectionDemand[]
    } catch (err) {
      console.warn('Fallback quality_inspection_demands:', err)
      return []
    }
  },

  async createQualityDemand(
    data: Partial<QualityInspectionDemand>,
  ): Promise<QualityInspectionDemand> {
    return (await pb
      .collection('quality_inspection_demands')
      .create(data)) as unknown as QualityInspectionDemand
  },

  async updateQualityDemandStatus(
    demandId: string,
    status: QualityDemandStatus,
    payload: {
      inspectorName?: string
      resultNotes?: string
      certificateNumber?: string
      nonConformityReason?: string
      auditEvent?: string
    },
  ): Promise<QualityInspectionDemand> {
    const demand = (await pb
      .collection('quality_inspection_demands')
      .getOne(demandId)) as unknown as QualityInspectionDemand

    const currentLogs = demand.audit_log || []
    const newLog = {
      event: payload.auditEvent || `STATUS_CHANGED_TO_${status}`,
      by: payload.inspectorName || pb.authStore.record?.email || 'Usuário do Sistema',
      at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      details:
        payload.resultNotes || payload.nonConformityReason || `Status alterado para ${status}`,
    }

    const updateData: Partial<QualityInspectionDemand> = {
      status,
      audit_log: [newLog, ...currentLogs],
    }

    if (payload.inspectorName) updateData.inspector_name = payload.inspectorName
    if (payload.resultNotes) updateData.result_notes = payload.resultNotes
    if (payload.certificateNumber) updateData.certificate_number = payload.certificateNumber
    if (payload.nonConformityReason) updateData.non_conformity_reason = payload.nonConformityReason
    if (status === 'APROVADA' || status === 'REPROVADA' || status === 'LIBERADA') {
      updateData.inspected_at = new Date().toISOString().replace('T', ' ').substring(0, 16)
    }

    return (await pb
      .collection('quality_inspection_demands')
      .update(demandId, updateData)) as unknown as QualityInspectionDemand
  },

  // 4. Reprogramação de Item: Atualiza data da Demanda de Qualidade preservando histórico
  async rescheduleQualityDemand(
    demandId: string,
    newPlannedDate: string,
    reason: string,
  ): Promise<QualityInspectionDemand> {
    const demand = (await pb
      .collection('quality_inspection_demands')
      .getOne(demandId)) as unknown as QualityInspectionDemand

    const history = demand.reschedule_history || []
    history.push({
      previous_date: demand.planned_inspection_date,
      new_date: newPlannedDate,
      reason,
      rescheduled_by: pb.authStore.record?.email || 'PCP_PROGRAMADOR',
      rescheduled_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
    })

    const auditLog = demand.audit_log || []
    auditLog.unshift({
      event: 'SCHEDULE_REPROGRAMMED',
      by: pb.authStore.record?.email || 'PCP_PROGRAMADOR',
      at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      details: `Reprogramado de ${demand.planned_inspection_date} para ${newPlannedDate}. Motivo: ${reason}`,
    })

    return (await pb.collection('quality_inspection_demands').update(demandId, {
      planned_inspection_date: newPlannedDate,
      reschedule_history: history,
      audit_log: auditLog,
    })) as unknown as QualityInspectionDemand
  },

  // 5. Planejamento de Capacidade dos Laboratórios
  async listQualityCapacityPlanning(periodRef?: string): Promise<QualityCapacityPlanning[]> {
    try {
      const records = await pb.collection('quality_capacity_planning').getFullList({
        filter: periodRef ? `period_ref = '${periodRef}'` : undefined,
        sort: 'period_ref,laboratory_or_line',
      })
      return records as unknown as QualityCapacityPlanning[]
    } catch (err) {
      console.warn('Fallback quality_capacity_planning:', err)
      return []
    }
  },

  // 6. Geração Automática de Demandas de Qualidade a partir da Programação
  async generateDemandsFromScheduleItems(
    items: {
      orderNumber: string
      productCode: string
      productName: string
      productionType: 'MTS' | 'MTO'
      quantityTons: number
      lineCode: string
      plannedDate: string
      salesOrder?: string
      salesOrderItem?: string
      customerName?: string
      requiresUltrasound?: boolean
      requiresMechanical?: boolean
    }[],
  ): Promise<{ generatedCount: number; demands: QualityInspectionDemand[] }> {
    const generated: QualityInspectionDemand[] = []
    const requirements = await this.listProductQualityRequirements()
    const reqMap = new Map(requirements.map((r) => [r.product_code, r]))

    for (const item of items) {
      const req = reqMap.get(item.productCode)
      const isMto = item.productionType === 'MTO'

      // Checa Ultrassom
      const needsUS =
        item.requiresUltrasound ||
        req?.ultrasound_requirement === 'SIM' ||
        (req?.ultrasound_requirement === 'CONDICIONAL' && isMto)

      if (needsUS) {
        const demandCode = `QID-${Date.now().toString().slice(-4)}-US-${Math.floor(Math.random() * 900 + 100)}`
        try {
          const rec = await this.createQualityDemand({
            demand_code: demandCode,
            inspection_type: 'ULTRASSOM',
            line_code: item.lineCode,
            production_order_number: item.orderNumber,
            sales_order_sap: item.salesOrder || (isMto ? 'SO-SAP-PEND' : ''),
            sales_order_item: item.salesOrderItem || '10',
            customer_name: item.customerName || (isMto ? 'Cliente MTO' : 'Mercado Geral CIAFAL'),
            product_code: item.productCode,
            product_description: item.productName,
            production_type: item.productionType,
            quantity_tons: item.quantityTons,
            sample_count: 4,
            planned_production_date: item.plannedDate,
            planned_inspection_date: item.plannedDate,
            estimated_duration_hours: req?.estimated_inspection_hours || 2.0,
            applicable_standard: req?.applicable_standards || 'ASME Sec. V / ASTM E213',
            inspection_requirement_details:
              req?.ultrasound_condition_rule ||
              'Ensaio de Ultrassom 100% obrigatório para liberação.',
            acceptance_criteria: 'Conforme norma técnica homologada.',
            is_blocking_release: true,
            priority: isMto ? 'ALTA' : 'MEDIA',
            status: 'PREVISTA',
            laboratory_equipment: 'Aparelho US Krautkramer USM 36 / Phased Array',
            audit_log: [
              {
                event: 'DEMAND_AUTOMATICALLY_GENERATED',
                by: 'PCP Robotizado CIAFAL',
                at: new Date().toISOString().replace('T', ' ').substring(0, 16),
                details: 'Demanda de Ultrassom gerada antecipadamente para a Qualidade.',
              },
            ],
          })
          generated.push(rec)
        } catch (e) {
          console.warn('Erro ao gerar demanda US automática:', e)
        }
      }

      // Checa Ensaios Mecânicos
      const needsEM =
        item.requiresMechanical ||
        req?.mechanical_test_requirement === 'SIM' ||
        (req?.mechanical_test_requirement === 'CONDICIONAL' && isMto)

      if (needsEM) {
        const testType = req?.mechanical_test_types?.[0] || 'TRACAO'
        const demandCode = `QID-${Date.now().toString().slice(-4)}-EM-${Math.floor(Math.random() * 900 + 100)}`
        try {
          const rec = await this.createQualityDemand({
            demand_code: demandCode,
            inspection_type: testType === 'TRACAO' ? 'ENSAIO_TRACAO' : 'ENSAIO_DOBRAMENTO',
            line_code: item.lineCode,
            production_order_number: item.orderNumber,
            sales_order_sap: item.salesOrder || (isMto ? 'SO-SAP-PEND' : ''),
            sales_order_item: item.salesOrderItem || '10',
            customer_name: item.customerName || (isMto ? 'Cliente MTO' : 'Mercado Geral CIAFAL'),
            product_code: item.productCode,
            product_description: item.productName,
            production_type: item.productionType,
            quantity_tons: item.quantityTons,
            sample_count: req?.standard_sample_count || 2,
            planned_production_date: item.plannedDate,
            planned_inspection_date: item.plannedDate,
            estimated_duration_hours: 1.5,
            applicable_standard: req?.applicable_standards || 'ABNT NBR ISO 6892-1',
            inspection_requirement_details:
              req?.mechanical_test_condition_rule ||
              'Ensaio mecânico obrigatório para certificação.',
            acceptance_criteria: 'Critérios mínimos de escoamento e resistência à tração.',
            is_blocking_release: req?.is_blocking_default ?? true,
            priority: isMto ? 'ALTA' : 'MEDIA',
            status: 'PREVISTA',
            laboratory_equipment: 'Máquina Universal de Ensaios EMIC 600kN',
            audit_log: [
              {
                event: 'DEMAND_AUTOMATICALLY_GENERATED',
                by: 'PCP Robotizado CIAFAL',
                at: new Date().toISOString().replace('T', ' ').substring(0, 16),
                details: 'Demanda de Ensaio Mecânico gerada a partir da programação.',
              },
            ],
          })
          generated.push(rec)
        } catch (e) {
          console.warn('Erro ao gerar demanda EM automática:', e)
        }
      }
    }

    return {
      generatedCount: generated.length,
      demands: generated,
    }
  },
}

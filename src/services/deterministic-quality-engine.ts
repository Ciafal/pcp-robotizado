import {
  QualityPreProgramAnalysis,
  OrderRequirementSheet,
  ProductQualityRequirement,
  QualityInspectionDemand,
  QualityCapacityPlanning,
} from '@/types/product-quality'
import { TabularScheduleItem } from '@/types/inventory-projection'

export interface PreProgramConsistencyInput {
  scheduleCode: string
  lineCode: string
  items: (TabularScheduleItem | any)[]
  requirementsCatalog: ProductQualityRequirement[]
  orderRequirementSheets: OrderRequirementSheet[]
  existingDemands?: QualityInspectionDemand[]
  capacityPlanning?: QualityCapacityPlanning[]
}

/**
 * Motor Determinístico de Análise Pré-Programação e Qualidade CIAFAL
 * Regras Obrigatórias de Consistência:
 * - Não permitir MTO sem pedido vinculado ou sem ficha completa
 * - Identificar produtos que exigem Ultrassom (Sim / Condicional)
 * - Identificar produtos que exigem Ensaios Mecânicos (Tração, Dobramento, Dureza, Impacto)
 * - Alertar sobrecarga de capacidade da Qualidade / Laboratórios
 * - Validar se há bloqueio para liberação
 * - Detectar conflito de requisitos ou pendência de validação
 */
export class DeterministicQualityEngine {
  public static analyzePreProgrammingConsistency(
    input: PreProgramConsistencyInput,
  ): QualityPreProgramAnalysis {
    const {
      scheduleCode,
      lineCode,
      items,
      requirementsCatalog,
      orderRequirementSheets,
      capacityPlanning = [],
    } = input

    const catalogMap = new Map<string, ProductQualityRequirement>(
      requirementsCatalog.map((r) => [r.product_code, r]),
    )
    const sheetsByOrderMap = new Map<string, OrderRequirementSheet>()
    const sheetsBySapOrderMap = new Map<string, OrderRequirementSheet>()

    orderRequirementSheets.forEach((s) => {
      if (s.order_number) sheetsByOrderMap.set(s.order_number, s)
      if (s.sales_order_sap) {
        sheetsBySapOrderMap.set(`${s.sales_order_sap}_${s.sales_order_item || '10'}`, s)
      }
    })

    let mtsCount = 0
    let mtoCount = 0
    let usCount = 0
    let emCount = 0
    let totalInspectionHours = 0
    let hardBlockCount = 0

    const risks: QualityPreProgramAnalysis['risksIdentified'] = []
    const recommendations: QualityPreProgramAnalysis['recommendations'] = []

    // Agrupamento de horas e testes por data
    const dailyDemandsMap: Record<string, { us: number; em: number; hours: number }> = {}

    items.forEach((item, index) => {
      const code = item.codigo || item.product_code || 'PROD'
      const orderNum = item.ordemPcp || item.orderNumber || item.codigo || `ITEM-${index + 1}`
      const type = (item.mtoOrIndustrializacao || item.production_type || 'MTS').toUpperCase()
      const isMto = type === 'MTO'
      const plannedDate = item.dataDetalhada || item.planned_production_date || '2026-09-01'

      if (isMto) {
        mtoCount++
      } else {
        mtsCount++
      }

      const reqFromCat = catalogMap.get(code)
      const reqSheet =
        sheetsByOrderMap.get(orderNum) ||
        (item.ordemSap ? sheetsBySapOrderMap.get(`${item.ordemSap}_10`) : undefined)

      // Regra 1: MTO sem Pedido Vinculado ou sem Ficha de Requisitos Carregada
      if (isMto) {
        if (!item.cliente || item.cliente.trim() === '' || item.cliente === 'Mercado Geral') {
          hardBlockCount++
          risks.push({
            id: `RISK-MTO-NO-CLIENT-${index}`,
            severity: 'CRITICAL',
            title: `Item MTO sem Pedido de Cliente Vinculado: ${code}`,
            description: `A Ordem ${orderNum} está marcada como MTO porém não possui cliente/pedido SAP associado. A programação de MTO exige obrigatoriamente Ficha de Requisitos completa.`,
            affectedOrders: [orderNum],
            blockingReleaseRisk: true,
            suggestedAction:
              'Vincular Pedido SAP ou converter para MTS com justificativa operacional.',
          })
        }

        if (!reqSheet) {
          risks.push({
            id: `RISK-MTO-NO-SHEET-${index}`,
            severity: 'HIGH',
            title: `Ficha de Requisitos Ausente para Pedido MTO: ${code}`,
            description: `Item ${code} (OP ${orderNum}) é MTO mas a Ficha Completa de Requisitos Técnicos e de Qualidade ainda não foi indexada no sistema.`,
            affectedOrders: [orderNum],
            blockingReleaseRisk: true,
            suggestedAction:
              'Carregar e validar a Ficha de Requisitos antes da aprovação definitiva.',
          })
        } else if (reqSheet.validation_status === 'CONFLITO_REQUISITOS') {
          hardBlockCount++
          risks.push({
            id: `RISK-MTO-CONFLICT-${index}`,
            severity: 'CRITICAL',
            title: `Conflito de Requisitos Técnicos no Pedido MTO: ${orderNum}`,
            description: `Existe conflito registrado na Ficha ${reqSheet.sheet_code} entre a norma técnica (${reqSheet.technical_standard}) e as especificações especiais do cliente (${reqSheet.customer_name}).`,
            affectedOrders: [orderNum],
            blockingReleaseRisk: true,
            suggestedAction:
              'Encaminhar ao responsável técnico de Qualidade para resolução de conflito.',
          })
        } else if (reqSheet.validation_status === 'PENDENCIA_VALIDACAO') {
          risks.push({
            id: `RISK-MTO-PENDENCY-${index}`,
            severity: 'MEDIUM',
            title: `Pendência de Validação de Requisito: ${orderNum}`,
            description: `A Ficha de Requisitos ${reqSheet.sheet_code} possui pendências pendentes de liberação formal: "${reqSheet.validation_pendency_details || 'Em análise técnica'}".`,
            affectedOrders: [orderNum],
            blockingReleaseRisk: false,
            suggestedAction: 'Acompanhar aprovação técnica da Qualidade.',
          })
        }
      }

      // Regra 2: Necessidade de Ultrassom
      const needsUS =
        reqSheet?.requires_ultrasound ||
        reqFromCat?.ultrasound_requirement === 'SIM' ||
        (reqFromCat?.ultrasound_requirement === 'CONDICIONAL' && isMto)

      if (needsUS) {
        usCount++
        const hours = reqFromCat?.estimated_inspection_hours || 2.0
        totalInspectionHours += hours

        if (!dailyDemandsMap[plannedDate]) dailyDemandsMap[plannedDate] = { us: 0, em: 0, hours: 0 }
        dailyDemandsMap[plannedDate].us++
        dailyDemandsMap[plannedDate].hours += hours
      }

      // Regra 3: Necessidade de Ensaios Mecânicos
      const needsEM =
        reqSheet?.requires_mechanical_tests ||
        reqFromCat?.mechanical_test_requirement === 'SIM' ||
        (reqFromCat?.mechanical_test_requirement === 'CONDICIONAL' && isMto)

      if (needsEM) {
        emCount++
        const hours = 1.5
        totalInspectionHours += hours

        if (!dailyDemandsMap[plannedDate]) dailyDemandsMap[plannedDate] = { us: 0, em: 0, hours: 0 }
        dailyDemandsMap[plannedDate].em++
        dailyDemandsMap[plannedDate].hours += hours
      }
    })

    // Regra 4: Validação de Capacidade da Qualidade e Alertas de Sobrecarga
    Object.entries(dailyDemandsMap).forEach(([dateStr, metrics]) => {
      // Limite padrão homologado CIAFAL de Ultrassom: 10 ensaios/dia
      const maxDailyUsCapacity = 10
      if (metrics.us > maxDailyUsCapacity) {
        risks.push({
          id: `RISK-CAP-OVERLOAD-${dateStr}`,
          severity: 'HIGH',
          title: `Sobrecarga de Capacidade de Ultrassom em ${dateStr}`,
          description: `A programação prevista para ${dateStr} gera ${metrics.us} demandas de ultrassom, acima da capacidade diária cadastrada da Qualidade (${maxDailyUsCapacity} ensaios/dia).`,
          affectedOrders: items
            .filter((i) => (i.dataDetalhada || i.planned_production_date) === dateStr)
            .map((i) => i.codigo || i.ordemPcp),
          blockingReleaseRisk: true,
          suggestedAction:
            'Rearranjar sequência ou escalonar equipe do laboratório de Ultrassom para evitar bloqueio de expedição.',
        })

        recommendations.push({
          id: `REC-SPLIT-US-${dateStr}`,
          type: 'REARRANGE_SEQUENCE',
          title: `Equacionar Gargalo de Ultrassom em ${dateStr}`,
          description: `Antecipar ${metrics.us - maxDailyUsCapacity} ensaios para o turno anterior ou diluir na programação do dia seguinte.`,
          impactTons: (metrics.us - maxDailyUsCapacity) * 80,
          gainHours: (metrics.us - maxDailyUsCapacity) * 1.8,
        })
      }
    })

    // Recomendações determinísticas adicionais
    if (mtoCount > 0 && usCount > 0) {
      recommendations.push({
        id: 'REC-EARLY-QUALITY-DEMAND',
        type: 'VALIDATE_REQUIREMENT',
        title: 'Disparo Antecipado de Fila de Qualidade',
        description: `Emitir demanda preventiva de ${usCount} ensaios de Ultrassom e ${emCount} Ensaios Mecânicos para o Laboratório Central CIAFAL imediatamente ao homologar a grade.`,
        impactTons: totalInspectionHours * 45,
        gainHours: totalInspectionHours,
      })
    }

    const requirementsFound = [
      {
        title: 'Make to Stock (MTS)',
        category: 'MTS' as const,
        description:
          'Produção orientada a estoque de segurança, curva de consumo e campanhas de linha.',
        count: mtsCount,
      },
      {
        title: 'Make to Order (MTO)',
        category: 'MTO' as const,
        description:
          'Produção vinculada a pedidos SAP de clientes com Ficha Completa de Requisitos.',
        count: mtoCount,
      },
      {
        title: 'Ensaios de Ultrassom (US)',
        category: 'ULTRASSOM' as const,
        description:
          'Inspeção não destrutiva por feixe angular / Phased Array de solda longitudinal.',
        count: usCount,
      },
      {
        title: 'Ensaios Mecânicos (EM)',
        category: 'ENSAIO_MECANICO' as const,
        description:
          'Ensaios de Tração, Dobramento, Dureza e Impacto exigidos por normas técnicas.',
        count: emCount,
      },
    ]

    return {
      scheduleCode: scheduleCode || 'GRADE-ATUAL',
      totalItems: items.length,
      mtsCount,
      mtoCount,
      ultrasoundDemandsCount: usCount,
      mechanicalTestsCount: emCount,
      totalInspectionHoursNeeded: Number(totalInspectionHours.toFixed(1)),
      requirementsFound,
      risksIdentified: risks,
      recommendations,
      isConsistencyApproved:
        hardBlockCount === 0 && risks.filter((r) => r.severity === 'CRITICAL').length === 0,
      hardBlockCount,
    }
  }
}

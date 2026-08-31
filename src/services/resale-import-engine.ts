/**
 * MOTOR DE CÁLCULO E VALIDAÇÃO DE REVENDA E IMPORTADOS CIAFAL
 * Fórmula de Necessidade Líquida:
 * Necessidade Líquida = Carteira - Estoque Próprio - Revenda Disponível - Importado Disponível - Entrada Importada Confirmada - Produção Já Programada
 *
 * Regra Crítica:
 * - Detectar duplicidade de produção própria x pedido de revenda x pedido importado antes de gerar sobreprodução.
 */

export interface ResaleImportOrder {
  orderId: string
  clientName: string
  materialCode: string
  materialDescription: string
  family: string
  line: string
  backlogTons: number
  ownStockTons: number
  resaleAvailableTons: number
  importedAvailableTons: number
  importedConfirmedIncomingTons: number
  scheduledProductionTons: number
  hasDuplicateResaleOrder?: boolean
  duplicateDetails?: string
}

export interface ResaleImportCalculationResult {
  orderId: string
  materialCode: string
  backlogTons: number
  totalNonProductionCoverageTons: number
  netProductionNeedTons: number
  hasDuplicationRisk: boolean
  duplicationRiskMessage?: string
  fulfillmentStrategy:
    | 'USAR_ESTOQUE_PROPRIO'
    | 'USAR_REVENDA'
    | 'USAR_IMPORTADO'
    | 'PROGRAMAR_LAMINACAO'
    | 'AGUARDAR_IMPORTACAO'
    | 'DUPLICIDADE_BLOQUEADA'
  suggestedActionDescription: string
}

export class ResaleImportEngine {
  public static calculateNetNeed(order: ResaleImportOrder): ResaleImportCalculationResult {
    const totalNonProductionCoverage =
      order.ownStockTons +
      order.resaleAvailableTons +
      order.importedAvailableTons +
      order.importedConfirmedIncomingTons

    // Necessidade Líquida = Carteira - Estoque Próprio - Revenda - Importado Disponível - Entrada Importada Confirmada - Produção Já Programada
    const netProductionNeedTons = Math.max(
      0,
      order.backlogTons - totalNonProductionCoverage - order.scheduledProductionTons,
    )

    let hasDuplicationRisk = false
    let duplicationRiskMessage: string | undefined = undefined

    // Detecção de duplicidade: se já há revenda/importado que cobre a carteira e ainda assim há produção programada
    if (order.scheduledProductionTons > 0 && totalNonProductionCoverage >= order.backlogTons) {
      hasDuplicationRisk = true
      duplicationRiskMessage = `ALERTA DE SOBREPRODUÇÃO/DUPLICIDADE: Carteira de ${order.backlogTons.toFixed(1)} t já está 100% coberta por estoque próprio (${order.ownStockTons.toFixed(1)} t) e revenda/importados (${(order.resaleAvailableTons + order.importedAvailableTons + order.importedConfirmedIncomingTons).toFixed(1)} t). A produção programada de ${order.scheduledProductionTons.toFixed(1)} t gerará excesso de estoque.`
    } else if (order.hasDuplicateResaleOrder) {
      hasDuplicationRisk = true
      duplicationRiskMessage = `DUPLICIDADE DETECTADA: Pedido de compra de Revenda/Importado já cadastrado no SAP para o mesmo cliente/material. Detalhes: ${order.duplicateDetails || 'Duplicação confirmada'}.`
    }

    let fulfillmentStrategy: ResaleImportCalculationResult['fulfillmentStrategy'] =
      'PROGRAMAR_LAMINACAO'
    let suggestedActionDescription = ''

    if (hasDuplicationRisk) {
      fulfillmentStrategy = 'DUPLICIDADE_BLOQUEADA'
      suggestedActionDescription =
        'Bloquear nova OP e cancelar/revisar produção programada duplicada com revenda/importados.'
    } else if (order.ownStockTons >= order.backlogTons) {
      fulfillmentStrategy = 'USAR_ESTOQUE_PROPRIO'
      suggestedActionDescription = `Atender carteira integralmente via Estoque Próprio (${order.ownStockTons.toFixed(1)} t).`
    } else if (order.resaleAvailableTons >= order.backlogTons - order.ownStockTons) {
      fulfillmentStrategy = 'USAR_REVENDA'
      suggestedActionDescription = `Alocar estoque comercial de Revenda (${order.resaleAvailableTons.toFixed(1)} t) para atendimento imediato.`
    } else if (
      order.importedAvailableTons >=
      order.backlogTons - order.ownStockTons - order.resaleAvailableTons
    ) {
      fulfillmentStrategy = 'USAR_IMPORTADO'
      suggestedActionDescription = `Alocar lote de Importado disponível no WMS (${order.importedAvailableTons.toFixed(1)} t).`
    } else if (
      order.importedConfirmedIncomingTons >= netProductionNeedTons &&
      netProductionNeedTons > 0
    ) {
      fulfillmentStrategy = 'AGUARDAR_IMPORTACAO'
      suggestedActionDescription = `Aguardar entrada de Navio/DI confirmada (${order.importedConfirmedIncomingTons.toFixed(1)} t) sem abrir laminação própria.`
    } else {
      fulfillmentStrategy = 'PROGRAMAR_LAMINACAO'
      suggestedActionDescription = `Necessidade líquida confirmada de ${netProductionNeedTons.toFixed(1)} t. Programar campanha industrial na linha ${order.line}.`
    }

    return {
      orderId: order.orderId,
      materialCode: order.materialCode,
      backlogTons: order.backlogTons,
      totalNonProductionCoverageTons: totalNonProductionCoverage,
      netProductionNeedTons,
      hasDuplicationRisk,
      duplicationRiskMessage,
      fulfillmentStrategy,
      suggestedActionDescription,
    }
  }

  public static processBatch(orders: ResaleImportOrder[]): {
    results: ResaleImportCalculationResult[]
    totalBacklogTons: number
    totalCoveredByNonProductionTons: number
    totalNetNeedTons: number
    duplicationRisksCount: number
  } {
    const results = orders.map((o) => this.calculateNetNeed(o))
    const totalBacklogTons = orders.reduce((sum, o) => sum + o.backlogTons, 0)
    const totalCoveredByNonProductionTons = results.reduce(
      (sum, r) => sum + r.totalNonProductionCoverageTons,
      0,
    )
    const totalNetNeedTons = results.reduce((sum, r) => sum + r.netProductionNeedTons, 0)
    const duplicationRisksCount = results.filter((r) => r.hasDuplicationRisk).length

    return {
      results,
      totalBacklogTons,
      totalCoveredByNonProductionTons,
      totalNetNeedTons,
      duplicationRisksCount,
    }
  }
}

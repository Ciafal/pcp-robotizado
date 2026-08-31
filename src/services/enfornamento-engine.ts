/**
 * MOTOR DE ENFORNAMENTO L1, L2 E A QUENTE COM DEPENDÊNCIAS DE LINHAS
 * Fluxo L1:
 * Solicitação de Inventário → Preparação de Tarugos → Retorno de Inventário → Validação → Montagem da Sequência → Liberação.
 *
 * Registra:
 * MP Solicitada, MP Disponível SAP, MP Física, Peças, Corridas, Dimensões, Aplicação, Localização WMS, Sequência, Quantidade, Saldo após utilização.
 *
 * Regras:
 * - Nenhuma programação de enfornamento pode ignorar restrições da Matriz de Gargalos.
 * - Enfornamento a Quente: validação de dependências KS -> L2 -> L1 -> ENDL1/ACABL2.
 * - Bloqueia consumo se linha fornecedora não estiver concluída ou fora da janela térmica.
 */

export interface EnfornamentoBatchItem {
  id: string
  sequencePosition: number
  line: 'L1' | 'L2' | 'SDC' | 'ENDL1' | 'ACABL2'
  productDescription: string
  gaugeMm: number
  targetSteelGrade: string
  orderQuantityTons: number
  rawMaterialCode: string
  rawMaterialType: string // ex: "TARUGO 130x130", "TARUGO 150x150", "BLOCO"
  rawMaterialDimensionMm: string
  rawMaterialHeatNumber: string // Corrida
  piecesCount: number
  wmsLocation: string
  sapAvailableStockTons: number
  wmsPhysicalStockTons: number
  application: string
  balanceAfterUseTons: number
  isHotCharging: boolean
  upstreamLineCode?: string
  upstreamBatchStatus?: 'PENDENTE' | 'EM_PRODUCAO' | 'LIBERADO' | 'CONCLUIDO'
  coolingTimeRequiredHours?: number
  coolingTimeElapsedHours?: number
  bottleneckMatrixApproved: boolean
  bottleneckValidationRemarks?: string
  workflowStep:
    | 'SOLICITACAO_INVENTARIO'
    | 'PREPARACAO_TARUGOS'
    | 'RETORNO_INVENTARIO'
    | 'VALIDACAO_PCP'
    | 'MONTAGEM_SEQUENCIA'
    | 'LIBERADO_FORNO'
}

export interface EnfornamentoValidationResult {
  batchId: string
  canReleaseToFurnace: boolean
  workflowStep: EnfornamentoBatchItem['workflowStep']
  bottleneckClearance: boolean
  mpAvailabilityClearance: boolean
  upstreamLineClearance: boolean
  blockingReasons: string[]
  warnings: string[]
  aiExplanation: string
}

export class EnfornamentoEngine {
  public static validateBatch(item: EnfornamentoBatchItem): EnfornamentoValidationResult {
    const blockingReasons: string[] = []
    const warnings: string[] = []

    // 1. Validação com Matriz de Gargalo (Nenhuma programação de enfornamento pode ignorar gargalos)
    let bottleneckClearance = true
    if (!item.bottleneckMatrixApproved) {
      bottleneckClearance = false
      blockingReasons.push(
        `BLOQUEIO MATRIZ GARGALO: O item ${item.productDescription} viola as restrições de passagem ou capacidade máxima dos gargalos homologados da linha ${item.line}. Motivo: ${item.bottleneckValidationRemarks || 'Restrição de vazão no forno/gaiola'}.`,
      )
    }

    // 2. Validação de Estoque Físico e SAP de MP
    let mpAvailabilityClearance = true
    if (item.wmsPhysicalStockTons < item.orderQuantityTons) {
      mpAvailabilityClearance = false
      blockingReasons.push(
        `MP FÍSICA INSUFICIENTE: Saldo físico WMS no endereço ${item.wmsLocation} (${item.wmsPhysicalStockTons.toFixed(1)} t) é menor que a carga programada (${item.orderQuantityTons.toFixed(1)} t).`,
      )
    } else if (item.sapAvailableStockTons < item.orderQuantityTons) {
      warnings.push(
        `DIVERGÊNCIA SAP: Saldo contábil no SAP (${item.sapAvailableStockTons.toFixed(1)} t) diverge do físico (${item.wmsPhysicalStockTons.toFixed(1)} t). Regularizar via MIGO/ZPP86 antes do fechamento de OP.`,
      )
    }

    // 3. Validação de Enfornamento a Quente / Dependência entre Linhas
    let upstreamLineClearance = true
    if (item.isHotCharging) {
      if (!item.upstreamLineCode) {
        upstreamLineClearance = false
        blockingReasons.push(
          'Linha fornecedora a montante não informada para enfornamento a quente.',
        )
      } else if (
        item.upstreamBatchStatus !== 'LIBERADO' &&
        item.upstreamBatchStatus !== 'CONCLUIDO'
      ) {
        upstreamLineClearance = false
        blockingReasons.push(
          `DEPENDÊNCIA DE LINHA: A linha montante ${item.upstreamLineCode} ainda não concluiu ou liberou o lote (Status atual: ${item.upstreamBatchStatus || 'NÃO INICIADO'}). Não é permitido programar o processo consumidor antes do fornecedor.`,
        )
      }

      // Validação de resfriamento metalúrgico se aplicável
      if (item.coolingTimeRequiredHours && item.coolingTimeElapsedHours !== undefined) {
        if (item.coolingTimeElapsedHours < item.coolingTimeRequiredHours) {
          upstreamLineClearance = false
          blockingReasons.push(
            `TEMPO DE CURA/RESFRIAMENTO: Material requer ${item.coolingTimeRequiredHours}h de resfriamento metalúrgico antes da transferência. Tempo decorrido atual: ${item.coolingTimeElapsedHours}h.`,
          )
        }
      }
    }

    const canReleaseToFurnace =
      blockingReasons.length === 0 && item.workflowStep === 'LIBERADO_FORNO'

    let aiExplanation = ''
    if (blockingReasons.length > 0) {
      aiExplanation = `Bloqueio de Enfornamento: ${blockingReasons.join(' | ')}`
    } else if (warnings.length > 0) {
      aiExplanation = `Enfornamento autorizado com ressalvas: ${warnings.join(' | ')}`
    } else {
      aiExplanation = `Lote 100% validado para enfornamento na linha ${item.line}. MP corrida ${item.rawMaterialHeatNumber} (${item.piecesCount} peças) conferida no WMS ${item.wmsLocation}. Saldo residual projetado: ${item.balanceAfterUseTons.toFixed(1)} t.`
    }

    return {
      batchId: item.id,
      canReleaseToFurnace,
      workflowStep: item.workflowStep,
      bottleneckClearance,
      mpAvailabilityClearance,
      upstreamLineClearance,
      blockingReasons,
      warnings,
      aiExplanation,
    }
  }

  public static advanceWorkflowStep(
    currentStep: EnfornamentoBatchItem['workflowStep'],
  ): EnfornamentoBatchItem['workflowStep'] {
    switch (currentStep) {
      case 'SOLICITACAO_INVENTARIO':
        return 'PREPARACAO_TARUGOS'
      case 'PREPARACAO_TARUGOS':
        return 'RETORNO_INVENTARIO'
      case 'RETORNO_INVENTARIO':
        return 'VALIDACAO_PCP'
      case 'VALIDACAO_PCP':
        return 'MONTAGEM_SEQUENCIA'
      case 'MONTAGEM_SEQUENCIA':
        return 'LIBERADO_FORNO'
      case 'LIBERADO_FORNO':
        return 'LIBERADO_FORNO'
    }
  }
}

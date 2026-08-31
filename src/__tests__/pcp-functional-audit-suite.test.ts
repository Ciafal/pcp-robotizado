import { describe, it, expect, beforeEach } from 'vitest'
import { PCPUnifiedRulesEngine, RuleValidationContext } from '../services/unified-rules-engine'
import { MinBatchEngine } from '../services/min-batch-engine'
import { ABCCurveEngine, ABCItemInput } from '../services/abc-curve-engine'
import { StockBalanceEngine, StockBalanceItem } from '../services/stock-balance-engine'
import { ResaleImportEngine, ResaleImportOrder } from '../services/resale-import-engine'
import { DesbasteL1Engine, DesbasteL1Status } from '../services/desbaste-l1-engine'
import { EnfornamentoEngine, EnfornamentoBatchItem } from '../services/enfornamento-engine'
import { JustificationValidator } from '../services/execution-governance-engines'
import { aiProgrammerEngine, ProgrammingCandidateItem } from '../services/ai-programmer-engine'

describe('SUÍTE DE AUDITORIA E TESTES OBRIGATÓRIOS DO PCP ROBOTIZADO CIAFAL', () => {
  let rulesEngine: PCPUnifiedRulesEngine

  beforeEach(() => {
    rulesEngine = PCPUnifiedRulesEngine.getInstance()
  })

  // 1. Lote mínimo não formado
  it('Cenário 1: Lote mínimo não formado deve bloquear programação e não gerar data confirmada', () => {
    const minBatchRes = MinBatchEngine.calculate({
      line: 'L1',
      family: 'REDONDOS',
      materialCode: 'RED-50.8-SAE1045',
      availableBacklogTons: 15.0, // 15t / 22.5tph = 0.66h < 3.0h mínimas
      productivityTonsPerHour: 22.5,
    })

    expect(minBatchRes.status).toBe('PARCIAL')
    expect(minBatchRes.requiredMinHours).toBe(3.0)
    expect(minBatchRes.requiredMinTons).toBe(67.5)
    expect(minBatchRes.missingTons).toBe(52.5)
    expect(minBatchRes.canGenerateConfirmedEstimatedDate).toBe(false)
  })

  // 2. Lote mínimo formado
  it('Cenário 2: Lote mínimo formado com sucesso libera confirmação de programação', () => {
    const minBatchRes = MinBatchEngine.calculate({
      line: 'L1',
      family: 'REDONDOS',
      materialCode: 'RED-50.8-SAE1045',
      availableBacklogTons: 70.0,
      productivityTonsPerHour: 22.5,
    })

    expect(minBatchRes.status).toBe('FORMADO')
    expect(minBatchRes.missingTons).toBe(0)
    expect(minBatchRes.canGenerateConfirmedEstimatedDate).toBe(true)
  })

  // 3. Exceção de lote mínimo autorizada com justificativa
  it('Cenário 3: Exceção de lote mínimo aprovada formalmente permite avanço com status EXCEÇÃO APROVADA', () => {
    const minBatchRes = MinBatchEngine.calculate({
      line: 'L2',
      family: 'REDONDOS',
      materialCode: 'RED-63.5-SAE5160',
      availableBacklogTons: 30.0,
      productivityTonsPerHour: 25.0,
      exception: {
        approved: true,
        reason: 'Atendimento emergencial de parada de montadora cliente com aval da Diretoria',
        requestedBy: 'Vendas Especiais',
        approvedBy: 'Carlos Mendes',
        approvedAt: '2025-08-15 14:30',
        exceptionalQuantityTons: 30.0,
        predictedImpact: 'Setup adicional de 45 minutos absorvido na campanha',
        approvalRole: 'GERENCIA_INDUSTRIAL',
      },
    })

    expect(minBatchRes.status).toBe('EXCECAO_APROVADA')
    expect(minBatchRes.canGenerateConfirmedEstimatedDate).toBe(true)
  })

  // 4. Item Classe A prestes a ficar negativo (Ruptura crítica)
  it('Cenário 4: Item Classe A com estoque projetado negativo deve disparar prioridade máxima e alerta de ruptura', () => {
    const items: ABCItemInput[] = [
      {
        sku: 'SKU_CLASSE_A_CRITICO',
        description: 'Barra Redonda 50,8mm 1045',
        family: 'REDONDOS',
        line: 'L1',
        revenueHistoricalBrl: 8000000,
        volumeHistoricalTons: 1200,
        currentStockTons: 0,
        projectedStockTons: -50,
      },
      {
        sku: 'SKU_CLASSE_B',
        description: 'Barra Quadrada 32mm 1020',
        family: 'QUADRADOS',
        line: 'L1',
        revenueHistoricalBrl: 1500000,
        volumeHistoricalTons: 300,
        currentStockTons: 100,
        projectedStockTons: 80,
      },
      {
        sku: 'SKU_CLASSE_C',
        description: 'Perfil Especial',
        family: 'ESPECIAIS',
        line: 'L1',
        revenueHistoricalBrl: 500000,
        volumeHistoricalTons: 50,
        currentStockTons: 20,
        projectedStockTons: 15,
      },
    ]

    const results = ABCCurveEngine.calculateCurve(items)
    const itemA = results.find((r) => r.sku === 'SKU_CLASSE_A_CRITICO')

    expect(itemA).toBeDefined()
    expect(itemA?.abcClass).toBe('A')
    expect(itemA?.isCriticalRiskA).toBe(true)
    expect(itemA?.priorityScore).toBe(100)
    expect(itemA?.criticalRiskJustification).toContain('ALERTA CRÍTICO')
  })

  // 5. Equilíbrio de Estoque entre bitolas da mesma família (+-5 dias)
  it('Cenário 5: Desvio de cobertura de estoque superior a +-5 dias deve ser identificado como desbalanceado e exigir justificativa', () => {
    const stockItems: StockBalanceItem[] = [
      {
        materialCode: 'RED-38',
        description: 'Redondo 38mm',
        family: 'REDONDOS',
        line: 'L1',
        gaugeMm: 38,
        currentStockTons: 100,
        scheduledProductionTons: 0,
        plannedIncomingTons: 0,
        backlogTons: 20,
        averageDailyConsumptionTons: 4, // Cobertura = 80/4 = 20 dias
      },
      {
        materialCode: 'RED-50',
        description: 'Redondo 50mm',
        family: 'REDONDOS',
        line: 'L1',
        gaugeMm: 50,
        currentStockTons: 10,
        scheduledProductionTons: 0,
        plannedIncomingTons: 0,
        backlogTons: 5,
        averageDailyConsumptionTons: 5, // Cobertura = 5/5 = 1 dia
      },
    ]

    const result = StockBalanceEngine.evaluateStockBalance(stockItems)
    const famSummary = result.familiesSummary[0]

    expect(famSummary.isFamilyBalanced).toBe(false) // Spread > 10 dias
    expect(result.itemsResult.some((i) => i.isDeviationAboveTolerance)).toBe(true)
  })

  // 6. Matéria-prima insuficiente
  it('Cenário 6: Matéria-prima disponível inferior à quantidade necessária deve bloquear o motor', () => {
    const ctx: RuleValidationContext = {
      materialCode: 'RED-50.8-SAE1045',
      line: 'L1',
      quantityTons: 100.0,
      rawMaterialAvailableTons: 40.0, // Insuficiente
    }

    const val = rulesEngine.evaluateCanProgram(ctx)
    expect(val.canProgram).toBe(false)
    expect(val.blockingIssuesCount).toBeGreaterThan(0)
    expect(val.evaluations.some((e) => e.ruleCode === 'MP_INSUFICIENTE')).toBe(true)
  })

  // 7. Detecção de duplicidade: Produção Própria x Revenda / Importado
  it('Cenário 7: Pedido de compra de Revenda ou Importado existente deve acusar duplicidade e evitar sobreprodução', () => {
    const order: ResaleImportOrder = {
      orderId: 'PED-REV-8891',
      clientName: 'Cliente Industrial',
      materialCode: 'RED-45-SAE1045',
      materialDescription: 'Redondo 45mm 1045',
      family: 'REDONDOS',
      line: 'L1',
      backlogTons: 50.0,
      ownStockTons: 10.0,
      resaleAvailableTons: 40.0, // Cobre 100% da necessidade restante
      importedAvailableTons: 0,
      importedConfirmedIncomingTons: 0,
      scheduledProductionTons: 50.0, // Duplicado!
    }

    const calc = ResaleImportEngine.calculateNetNeed(order)
    expect(calc.hasDuplicationRisk).toBe(true)
    expect(calc.fulfillmentStrategy).toBe('DUPLICIDADE_BLOQUEADA')
    expect(calc.duplicationRiskMessage).toContain('SOBREPRODUÇÃO/DUPLICIDADE')
  })

  // 8. Troca de Desbaste L1 próxima do limite (12.000t +- 1.000t)
  it('Cenário 8: Desbaste L1 excedendo 13.000t deve bloquear e recomendar parada sincronizada', () => {
    const status: DesbasteL1Status = {
      lastChangeDate: '2025-04-10',
      accumulatedProductionTons: 13200, // Excedeu 13.000t
      targetLifespanTons: 12000,
      toleranceMinTons: 11000,
      toleranceMaxTons: 13000,
      realizedLifespanPreviousCycleTons: 12100,
      estimatedNextChangeDate: '2025-08-25',
      currentRollPairCode: 'DESB-PAR-02',
      rollShopStockPairAvailable: true,
      scheduledMaintenanceStopAvailableDate: '2025-08-26',
      scheduledMaintenanceDurationHours: 10,
    }

    const rec = DesbasteL1Engine.evaluate(status)
    expect(rec.status).toBe('CRITICO_EXCEDIDO')
    expect(rec.isChangeUrgentBlocking).toBe(true)
    expect(rec.synergyWithMaintenance).toBe(true)
    expect(rec.recommendedStopDurationHours).toBe(10)
  })

  // 9. Enfornamento com dependência entre linhas a montante
  it('Cenário 9: Enfornamento a quente com linha fornecedora não concluída deve ser bloqueado', () => {
    const batchItem: EnfornamentoBatchItem = {
      id: 'ENF_BATCH_99',
      sequencePosition: 1,
      line: 'L1',
      productDescription: 'Barra Especial',
      gaugeMm: 60,
      targetSteelGrade: '1045',
      orderQuantityTons: 50,
      rawMaterialCode: 'TAR-150',
      rawMaterialType: 'TARUGO 150x150',
      rawMaterialDimensionMm: '150x150x6000',
      rawMaterialHeatNumber: 'CORR-99881',
      piecesCount: 45,
      wmsLocation: 'PATIO_B_RUA_04',
      sapAvailableStockTons: 60,
      wmsPhysicalStockTons: 60,
      application: 'MOLA',
      balanceAfterUseTons: 10,
      isHotCharging: true,
      upstreamLineCode: 'KS',
      upstreamBatchStatus: 'EM_PRODUCAO', // Não liberado ainda
      bottleneckMatrixApproved: true,
      workflowStep: 'MONTAGEM_SEQUENCIA',
    }

    const val = EnfornamentoEngine.validateBatch(batchItem)
    expect(val.upstreamLineClearance).toBe(false)
    expect(val.canReleaseToFurnace).toBe(false)
    expect(val.blockingReasons.some((r) => r.includes('DEPENDÊNCIA DE LINHA'))).toBe(true)
  })

  // 10. Validação semântica de justificativas vagas
  it('Cenário 10: Justificativas vagas como "ajuste" ou "revisão" devem ser sumariamente rejeitadas', () => {
    const vague1 = JustificationValidator.evaluate('ajuste')
    expect(vague1.isValid).toBe(false)
    expect(vague1.isVague).toBe(true)

    const vague2 = JustificationValidator.evaluate('revisão de programação')
    expect(vague2.isValid).toBe(false)

    const valid = JustificationValidator.evaluate(
      'Atraso de MP fornecida pela Arcelor corrida 8812 - necessidade de readequar sequência',
    )
    expect(valid.isValid).toBe(true)
    expect(valid.isVague).toBe(false)
  })

  // 11. IA Programadora determinística sem caixa-preta
  it('Cenário 11: IA Programadora gera sequenciamento com justificativa clara e bloqueio seguro dos candidatos incompatíveis', () => {
    const candidates: ProgrammingCandidateItem[] = [
      {
        id: 'CAND_OK',
        orderNumber: 'OP-1001',
        clientName: 'Cliente A',
        materialCode: 'RED-50',
        materialDescription: 'Redondo 50mm 1045',
        family: 'REDONDOS',
        line: 'L1',
        gaugeMm: 50,
        steelGrade: '1045',
        productType: 'MTS',
        requestedDate: '2025-08-20',
        backlogTons: 80.0,
        currentStockTons: 5.0,
        scheduledProductionTons: 0,
        availableMpTons: 100.0,
        rawMaterialCode: 'TAR-150',
        revenueHistoricalBrl: 500000,
        dailyConsumptionTons: 10.0,
      },
      {
        id: 'CAND_NO_MP',
        orderNumber: 'OP-1002',
        clientName: 'Cliente B',
        materialCode: 'RED-60',
        materialDescription: 'Redondo 60mm 1045',
        family: 'REDONDOS',
        line: 'L1',
        gaugeMm: 60,
        steelGrade: '1045',
        productType: 'MTS',
        requestedDate: '2025-08-21',
        backlogTons: 80.0,
        currentStockTons: 0,
        scheduledProductionTons: 0,
        availableMpTons: 10.0, // Falta MP
        rawMaterialCode: 'TAR-150',
        revenueHistoricalBrl: 400000,
        dailyConsumptionTons: 8.0,
      },
    ]

    const result = aiProgrammerEngine.generateOptimizedSequence('L1', 'Semana 34', candidates, 7000)
    expect(result.scheduledItemsCount).toBe(1)
    expect(result.blockedItemsCount).toBe(1)
    expect(result.sequence[0].candidate.id).toBe('CAND_OK')
    expect(result.sequence[0].aiExplanation.reasons.length).toBeGreaterThan(0)
    expect(result.blockedCandidates[0].candidate.id).toBe('CAND_NO_MP')
  })
})

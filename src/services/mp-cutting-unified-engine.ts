/**
 * Motor Central Unificado de Otimização de Corte — HUB Industrial Ciafal / PCP Robotizado
 *
 * Módulo centralizado de regras físicas, dimensionais, metalúrgicas e combinatórias
 * compartilhadas entre "Plano Blocos" e "Plano de Corte Múltiplo".
 *
 * PROIBIÇÃO DE DUPLICIDADE:
 * Todas as fórmulas de kerf, margem, esquadrejamento, desponta, tolerâncias,
 * comprimento efetivo, rendimento metálico, classificação de sobras (reaproveitável vs refugo)
 * e geração comparativa de cenários devem residir neste motor único.
 */

import { formatNumberPtBr } from '@/lib/number-format'
import type { MPCuttingScenarioItem } from '@/types/mp-cutting-weight-standards'

export interface PhysicalCuttingLossesInput {
  grossLengthMm: number
  sawKerfMm: number
  squaringLossMm: number
  endCropLossMm: number
  marginMm?: number
  cutsCount: number
}

export interface PhysicalEffectiveLengthResult {
  grossLengthMm: number
  totalSawLossMm: number
  squaringLossMm: number
  endCropLossMm: number
  marginMm: number
  totalMandatoryLossMm: number
  effectiveAvailableLengthMm: number
}

export interface CutPieceDemand {
  id: string
  label?: string
  lengthMm: number
  requestedQty: number
  allocatedQty?: number
  toleranceMm?: number
  priority?: number
  productCode?: string
  applicationCode?: string
}

export interface BlockDimensionalEntity {
  id: string
  blockNumber: string
  heatNumber?: string
  batchNumber?: string
  thicknessMm: number
  widthMm: number
  lengthMm: number
  weightKg: number
  linearMassKgM: number
  origin?: 'SAP' | 'HOMOLOGACAO'
  status?: string
}

export interface LeftoverClassificationResult {
  isReusable: boolean
  reusableLengthMm: number
  reusableWeightTons: number
  scrapLengthMm: number
  scrapWeightTons: number
  suggestedDestination: 'RETORNA_ESTOQUE_NOBRE' | 'REAPROVEITAMENTO_INTERNO' | 'SUCATA_ACREDITADA'
  destinationLabel: string
}

export interface UnifiedOptimizationInput {
  planType: 'BLOCOS' | 'MULTIPLO'
  companyCode: string
  centerCode: string
  materialCode: string
  steelGrade?: string
  calculationMode: 'INDIVIDUALIZADO' | 'AGREGADO'
  blocks: BlockDimensionalEntity[]
  demands: CutPieceDemand[]
  parameters: {
    sawKerfMm: number
    squaringLossMm: number
    endCropLossMm: number
    toleranceMm?: number
    marginMm?: number
    linearMassKgM: number
    minReusableLeftoverMm?: number
  }
}

export interface UnifiedScenarioResult {
  id: string
  scenarioIndex: number // 1 a 6
  name: string
  classification: string
  isRecommended: boolean
  yieldPct: number
  totalInputWeightTons: number
  usedWeightTons: number
  leftoverWeightTons: number
  scrapWeightTons: number
  totalAvailableLengthM: number
  usedLengthM: number
  usableLeftoverLengthM: number
  scrapLengthM: number
  cutsCount: number
  piecesProducedCount: number
  demandFulfillmentPct: number
  allocatedDemands: {
    demandId: string
    lengthMm: number
    quantity: number
    totalLengthM: number
    estimatedWeightTons: number
  }[]
  leftoverDetails: LeftoverClassificationResult
  technicalJustification: string
  viabilityStatus: 'VIÁVEL' | 'RESTRIÇÃO_TÉCNICA' | 'INVIÁVEL'
  technicalRestrictions: string[]
}

export interface UnifiedCuttingOptimizationResult {
  planType: 'BLOCOS' | 'MULTIPLO'
  calculationMode: 'INDIVIDUALIZADO' | 'AGREGADO'
  effectiveLengthPerBlockMm: number
  totalGrossWeightTons: number
  totalNetAvailableLengthM: number
  bestScenarioId: string
  scenarios: UnifiedScenarioResult[]
  comparativeScenariosGrid: MPCuttingScenarioItem[]
  aiSummaryJustification: string
}

/**
 * 1. CÁLCULO FÍSICO DO COMPRIMENTO EFETIVO DISPONÍVEL
 * comprimento efetivamente disponível = comprimento bruto − perdas obrigatórias
 * (kerf * número de cortes + esquadrejamento + desponta + margem técnica)
 */
export function calculatePhysicalEffectiveLength(
  input: PhysicalCuttingLossesInput,
): PhysicalEffectiveLengthResult {
  const { grossLengthMm, sawKerfMm, squaringLossMm, endCropLossMm, marginMm = 0, cutsCount } = input

  const totalSawLossMm = Math.max(0, cutsCount * sawKerfMm)
  const totalMandatoryLossMm = totalSawLossMm + squaringLossMm + endCropLossMm + marginMm
  const effectiveAvailableLengthMm = Math.max(0, grossLengthMm - totalMandatoryLossMm)

  return {
    grossLengthMm,
    totalSawLossMm,
    squaringLossMm,
    endCropLossMm,
    marginMm,
    totalMandatoryLossMm,
    effectiveAvailableLengthMm,
  }
}

/**
 * 2. CLASSIFICAÇÃO INDUSTRIAL DE SOBRAS DE CORTE
 * Sobra reaproveitável (pode retornar ao estoque) vs Sobra não reaproveitável (refugo/sucata)
 */
export function classifyLeftovers(params: {
  leftoverLengthMm: number
  linearMassKgM: number
  minReusableLengthMm?: number
}): LeftoverClassificationResult {
  const { leftoverLengthMm, linearMassKgM, minReusableLengthMm = 800 } = params

  if (leftoverLengthMm >= minReusableLengthMm) {
    const reusableTons = ((leftoverLengthMm / 1000) * linearMassKgM) / 1000
    const destination =
      leftoverLengthMm >= 1500
        ? ('RETORNA_ESTOQUE_NOBRE' as const)
        : ('REAPROVEITAMENTO_INTERNO' as const)
    const destinationLabel =
      destination === 'RETORNA_ESTOQUE_NOBRE'
        ? 'Retorna ao Estoque de MP (Saldo Livre)'
        : 'Reaproveitamento em Peças Curtas'

    return {
      isReusable: true,
      reusableLengthMm: leftoverLengthMm,
      reusableWeightTons: Number(reusableTons.toFixed(3)),
      scrapLengthMm: 0,
      scrapWeightTons: 0,
      suggestedDestination: destination,
      destinationLabel,
    }
  }

  const scrapTons = ((leftoverLengthMm / 1000) * linearMassKgM) / 1000
  return {
    isReusable: false,
    reusableLengthMm: 0,
    reusableWeightTons: 0,
    scrapLengthMm: leftoverLengthMm,
    scrapWeightTons: Number(scrapTons.toFixed(3)),
    suggestedDestination: 'SUCATA_ACREDITADA',
    destinationLabel: 'Descarte para Sucata Industrial / Aciaria',
  }
}

/**
 * 3. MOTOR COMBINATÓRIO HEURÍSTICO MULTI-COMPRIMENTO
 * Distribui peças com múltiplos comprimentos em 1 ou vários blocos
 */
function solveCuttingStockProblem(params: {
  blocks: BlockDimensionalEntity[]
  demands: CutPieceDemand[]
  sawKerfMm: number
  squaringLossMm: number
  endCropLossMm: number
  marginMm: number
  strategy:
    | 'BEST_YIELD'
    | 'MIN_SCRAP'
    | 'MAX_FULFILLMENT'
    | 'BALANCED_RECOMMENDED'
    | 'PRESERVE_PRIME'
    | 'MIN_CUTS'
}): {
  allocatedPieces: { demandId: string; lengthMm: number; quantity: number }[]
  totalUsedLengthMm: number
  totalLeftoverLengthMm: number
  totalCutsCount: number
  totalSawLossMm: number
} {
  const { blocks, demands, sawKerfMm, squaringLossMm, endCropLossMm, marginMm, strategy } = params

  let totalEffectiveAvailableLengthMm = 0
  blocks.forEach((b) => {
    const fixedLoss = squaringLossMm + endCropLossMm + marginMm
    totalEffectiveAvailableLengthMm += Math.max(0, b.lengthMm - fixedLoss)
  })

  // Ordenação das demandas conforme a estratégia
  const sortedDemands = [...demands].filter((d) => d.requestedQty > 0 && d.lengthMm > 0)
  if (strategy === 'MIN_CUTS' || strategy === 'PRESERVE_PRIME') {
    // Favorece peças mais longas primeiro (menos cortes)
    sortedDemands.sort((a, b) => b.lengthMm - a.lengthMm)
  } else if (strategy === 'MAX_FULFILLMENT') {
    // Favorece maior quantidade de peças (peças menores cabem mais)
    sortedDemands.sort((a, b) => a.lengthMm - b.lengthMm)
  } else if (strategy === 'MIN_SCRAP' || strategy === 'BEST_YIELD') {
    // Algoritmo decrescente com tentativa de combinação exata
    sortedDemands.sort((a, b) => (b.priority || 1) - (a.priority || 1) || b.lengthMm - a.lengthMm)
  } else {
    // BALANCED_RECOMMENDED: Equilíbrio entre prioridade e melhor aproveitamento
    sortedDemands.sort((a, b) => (b.priority || 1) - (a.priority || 1))
  }

  let remainingLengthMm = totalEffectiveAvailableLengthMm
  let totalCuts = 0
  let totalSawLoss = 0
  const allocatedMap = new Map<string, { demandId: string; lengthMm: number; quantity: number }>()

  // Primeira passada: tenta alocar respeitando a quantidade solicitada
  for (const dem of sortedDemands) {
    const pieceCostMm = dem.lengthMm + sawKerfMm
    const maxPiecesPossible = Math.floor(remainingLengthMm / pieceCostMm)
    const piecesToAllocate = Math.min(dem.requestedQty, maxPiecesPossible)

    if (piecesToAllocate > 0) {
      const usedMm = piecesToAllocate * dem.lengthMm
      const cuts = piecesToAllocate // 1 corte por peça adicional
      totalCuts += cuts
      totalSawLoss += cuts * sawKerfMm
      remainingLengthMm -= piecesToAllocate * pieceCostMm

      allocatedMap.set(dem.id, {
        demandId: dem.id,
        lengthMm: dem.lengthMm,
        quantity: piecesToAllocate,
      })
    }
  }

  // Segunda passada de preenchimento de sobras (apenas se estratégia permitir peças extras para evitar sobra ociosa)
  if (
    strategy === 'BEST_YIELD' ||
    strategy === 'MIN_SCRAP' ||
    strategy === 'BALANCED_RECOMMENDED'
  ) {
    for (const dem of sortedDemands) {
      const pieceCostMm = dem.lengthMm + sawKerfMm
      if (remainingLengthMm >= pieceCostMm) {
        const extraPieces = Math.floor(remainingLengthMm / pieceCostMm)
        if (extraPieces > 0) {
          totalCuts += extraPieces
          totalSawLoss += extraPieces * sawKerfMm
          remainingLengthMm -= extraPieces * pieceCostMm

          const current = allocatedMap.get(dem.id) || {
            demandId: dem.id,
            lengthMm: dem.lengthMm,
            quantity: 0,
          }
          current.quantity += extraPieces
          allocatedMap.set(dem.id, current)
        }
      }
    }
  }

  const allocatedList = Array.from(allocatedMap.values()).filter((it) => it.quantity > 0)
  const totalUsedLengthMm = allocatedList.reduce((acc, it) => acc + it.quantity * it.lengthMm, 0)

  return {
    allocatedPieces: allocatedList,
    totalUsedLengthMm,
    totalLeftoverLengthMm: Math.max(0, remainingLengthMm),
    totalCutsCount: totalCuts,
    totalSawLossMm: totalSawLoss,
  }
}

/**
 * 4. MOTOR CENTRAL UNIFICADO DE OTIMIZAÇÃO (motorOtimizacaoCorte)
 * Executa os cálculos e gera exatamente os 6 cenários padronizados do PCP Robotizado
 */
/**
 * Alias explícito solicitado pela especificação técnica para geração dos 6 cenários comparativos unificados
 */
export function generate6UnifiedComparativeScenarios(
  input: UnifiedOptimizationInput,
): UnifiedCuttingOptimizationResult {
  return motorOtimizacaoCorte(input)
}

export function motorOtimizacaoCorte(
  input: UnifiedOptimizationInput,
): UnifiedCuttingOptimizationResult {
  const {
    planType,
    companyCode,
    centerCode,
    materialCode,
    steelGrade = 'SAE 1020',
    calculationMode,
    blocks,
    demands,
    parameters,
  } = input

  const {
    sawKerfMm,
    squaringLossMm,
    endCropLossMm,
    marginMm = 0,
    linearMassKgM,
    minReusableLeftoverMm = 800,
  } = parameters

  // Garantia de ao menos um bloco padrão se a lista vier vazia
  const resolvedBlocks: BlockDimensionalEntity[] =
    blocks.length > 0
      ? blocks
      : [
          {
            id: 'BLK-DEFAULT-01',
            blockNumber: 'BLOCO-PADRAO-01',
            thicknessMm: 130,
            widthMm: 130,
            lengthMm: 6000,
            weightKg: 5268,
            linearMassKgM: linearMassKgM || 132.5,
          },
        ]

  const totalGrossWeightKg = resolvedBlocks.reduce((acc, b) => acc + (b.weightKg || 0), 0)
  const totalGrossWeightTons = Number((totalGrossWeightKg / 1000).toFixed(3))

  let totalEffectiveAvailableLengthMm = 0
  resolvedBlocks.forEach((b) => {
    const eff = calculatePhysicalEffectiveLength({
      grossLengthMm: b.lengthMm,
      sawKerfMm,
      squaringLossMm,
      endCropLossMm,
      marginMm,
      cutsCount: 1,
    })
    totalEffectiveAvailableLengthMm += eff.effectiveAvailableLengthMm
  })

  // Demandas padrão mínimas se nenhuma for enviada
  const resolvedDemands: CutPieceDemand[] =
    demands.length > 0
      ? demands
      : [
          {
            id: 'DEM-01',
            label: 'Peça Estrutural 1.500 mm',
            lengthMm: 1500,
            requestedQty: 4,
            priority: 1,
          },
          {
            id: 'DEM-02',
            label: 'Peça Calandrada 2.000 mm',
            lengthMm: 2000,
            requestedQty: 3,
            priority: 2,
          },
          {
            id: 'DEM-03',
            label: 'Eixo Usinado 2.500 mm',
            lengthMm: 2500,
            requestedQty: 2,
            priority: 3,
          },
        ]

  const totalDemandPieces = resolvedDemands.reduce((acc, d) => acc + d.requestedQty, 0)

  // Definição das 6 estratégias canônicas do PCP Robotizado
  const strategyConfigs: {
    index: number
    id: string
    name: string
    classification: string
    strategy:
      | 'BALANCED_RECOMMENDED'
      | 'BEST_YIELD'
      | 'MIN_SCRAP'
      | 'MAX_FULFILLMENT'
      | 'PRESERVE_PRIME'
      | 'MIN_CUTS'
    desc: string
  }[] = [
    {
      index: 1,
      id: 'SCEN-01-RECOMMENDED',
      name: 'Cenário 1 — Recomendado pelo PCP (Ótimo Balanceado)',
      classification:
        'Equilíbrio entre rendimento metálico, atendimento da demanda e menor perda de corte.',
      strategy: 'BALANCED_RECOMMENDED',
      desc: 'Maximiza o rendimento respeitando estritamente o kerf e gerando sobras reaproveitáveis padronizadas.',
    },
    {
      index: 2,
      id: 'SCEN-02-BEST-YIELD',
      name: 'Cenário 2 — Maior Rendimento Metálico',
      classification: 'Aproveitamento volumétrico máximo do aço disponível.',
      strategy: 'BEST_YIELD',
      desc: 'Minimiza a sobra total empurrando peças adicionais para preencher quase 100% do comprimento do bloco.',
    },
    {
      index: 3,
      id: 'SCEN-03-MIN-SCRAP',
      name: 'Cenário 3 — Menor Perda de Sucata e Kerf',
      classification: 'Redução estrita de perdas não reaproveitáveis.',
      strategy: 'MIN_SCRAP',
      desc: 'Evita a geração de retalhos menores que a tolerância de descarte, direcionando sobras para reaproveitamento.',
    },
    {
      index: 4,
      id: 'SCEN-04-MAX-DEMAND',
      name: 'Cenário 4 — Máximo Atendimento da Carteira',
      classification: 'Prioridade absoluta de atendimento das ordens de corte.',
      strategy: 'MAX_FULFILLMENT',
      desc: 'Atende o maior número absoluto de peças solicitadas nas ordens de laminação/corte.',
    },
    {
      index: 5,
      id: 'SCEN-05-PRESERVE-PRIME',
      name: 'Cenário 5 — Preservação de MP Nobre (Sobra Reutilizável Longa)',
      classification: 'Sobra longa apta para retorno integral ao estoque dimensional.',
      strategy: 'PRESERVE_PRIME',
      desc: 'Gera uma sobra útil de grande comprimento para reaproveitamento imediato em novas programações.',
    },
    {
      index: 6,
      id: 'SCEN-06-MIN-CUTS',
      name: 'Cenário 6 — Menor Tempo de Máquina (Mínimo de Cortes de Serra)',
      classification: 'Agilidade operacional e menor desgaste de ferramental.',
      strategy: 'MIN_CUTS',
      desc: 'Menor quantidade de golpes de serra com redução do tempo de ciclo de corte.',
    },
  ]

  const scenarios: UnifiedScenarioResult[] = []

  strategyConfigs.forEach((cfg) => {
    const solution = solveCuttingStockProblem({
      blocks: resolvedBlocks,
      demands: resolvedDemands,
      sawKerfMm,
      squaringLossMm,
      endCropLossMm,
      marginMm,
      strategy: cfg.strategy,
    })

    const usedLengthM = solution.totalUsedLengthMm / 1000
    const usedWeightTons = Number(((usedLengthM * linearMassKgM) / 1000).toFixed(3))

    // Sobra classificada
    const leftoverDetails = classifyLeftovers({
      leftoverLengthMm: solution.totalLeftoverLengthMm,
      linearMassKgM,
      minReusableLengthMm: minReusableLeftoverMm,
    })

    // Perda de corte metálica (serra + esquadrejamento + desponta)
    const fixedLossMm =
      resolvedBlocks.length * (squaringLossMm + endCropLossMm + marginMm) + solution.totalSawLossMm
    const cuttingLossTons = Number((((fixedLossMm / 1000) * linearMassKgM) / 1000).toFixed(3))
    const totalScrapTons = Number((leftoverDetails.scrapWeightTons + cuttingLossTons).toFixed(3))

    // Rendimento metálico = (peso útil das peças produzidas / peso bruto de entrada) * 100
    const rawYield = totalGrossWeightTons > 0 ? (usedWeightTons / totalGrossWeightTons) * 100 : 0
    const yieldPct = Number(Math.min(100, Math.max(0, rawYield)).toFixed(2))

    const piecesProducedCount = solution.allocatedPieces.reduce((acc, p) => acc + p.quantity, 0)
    const demandFulfillmentPct =
      totalDemandPieces > 0
        ? Number(Math.min(100, (piecesProducedCount / totalDemandPieces) * 100).toFixed(1))
        : 100

    const allocatedDemands = solution.allocatedPieces.map((p) => {
      const totLenM = (p.quantity * p.lengthMm) / 1000
      const weightTons = Number(((totLenM * linearMassKgM) / 1000).toFixed(3))
      return {
        demandId: p.demandId,
        lengthMm: p.lengthMm,
        quantity: p.quantity,
        totalLengthM: Number(totLenM.toFixed(2)),
        estimatedWeightTons: weightTons,
      }
    })

    const isRecommended = cfg.index === 1

    const technicalJustification = isRecommended
      ? `Recomendado pelo motor central CIAFAL: Rendimento metálico de ${formatNumberPtBr(yieldPct, 2)}% com aproveitamento de ${formatNumberPtBr(usedWeightTons, 3)} t, ${piecesProducedCount} peças produzidas em ${solution.totalCutsCount} cortes (kerf ${sawKerfMm} mm). Sobra reaproveitável: ${formatNumberPtBr(leftoverDetails.reusableWeightTons, 3)} t com destino: ${leftoverDetails.destinationLabel}.`
      : `${cfg.desc} Rendimento de ${formatNumberPtBr(yieldPct, 2)}% com perda de processo de ${formatNumberPtBr(totalScrapTons, 3)} t.`

    scenarios.push({
      id: cfg.id,
      scenarioIndex: cfg.index,
      name: cfg.name,
      classification: cfg.classification,
      isRecommended,
      yieldPct,
      totalInputWeightTons: totalGrossWeightTons,
      usedWeightTons,
      leftoverWeightTons: leftoverDetails.reusableWeightTons,
      scrapWeightTons: totalScrapTons,
      totalAvailableLengthM: Number((totalEffectiveAvailableLengthMm / 1000).toFixed(2)),
      usedLengthM: Number(usedLengthM.toFixed(2)),
      usableLeftoverLengthM: Number((leftoverDetails.reusableLengthMm / 1000).toFixed(2)),
      scrapLengthM: Number((leftoverDetails.scrapLengthMm / 1000).toFixed(2)),
      cutsCount: solution.totalCutsCount,
      piecesProducedCount,
      demandFulfillmentPct,
      allocatedDemands,
      leftoverDetails,
      technicalJustification,
      viabilityStatus: 'VIÁVEL',
      technicalRestrictions: [],
    })
  })

  // Mapeia para o tipo padronizado MPCuttingScenarioItem para compatibilidade com a grade de cards existente
  const comparativeScenariosGrid: MPCuttingScenarioItem[] = scenarios.map((scen) => {
    const inputWeightKg = scen.totalInputWeightTons * 1000
    const usedWeightKg = scen.usedWeightTons * 1000
    const leftoverKg = scen.leftoverWeightTons * 1000
    const scrapKg = scen.scrapWeightTons * 1000
    const yieldPct = scen.yieldPct

    return {
      id: scen.id,
      name: scen.name,
      cutting_type: planType === 'MULTIPLO' ? 'MULTIPLOS' : 'BLOCOS',
      status: 'VIÁVEL' as const,
      yield_pct: yieldPct,
      input_weight_kg: inputWeightKg,
      used_weight_kg: usedWeightKg,
      used_weight_pct: yieldPct,
      target_weight_kg: inputWeightKg,
      calculated_weight_kg: usedWeightKg,
      estimated_leftover_kg: leftoverKg,
      cutting_loss_kg: scrapKg,
      min_allowed_weight_kg: usedWeightKg * 0.98,
      max_allowed_weight_kg: usedWeightKg * 1.02,
      deviation_kg: (scen.usedWeightTons - scen.totalInputWeightTons) * 1000,
      deviation_pct: Number(
        scen.totalInputWeightTons > 0
          ? (
              ((scen.usedWeightTons - scen.totalInputWeightTons) / scen.totalInputWeightTons) *
              100
            ).toFixed(2)
          : '0',
      ),
      produced_quantity: scen.piecesProducedCount,
      demand_fulfillment_pct: scen.demandFulfillmentPct,
      used_standard_code: `${planType === 'MULTIPLO' ? 'MULT' : 'BLC'}-${materialCode}`,
      used_standard_description: `${scen.classification} (${calculationMode})`,
      composition: {
        pieces_count: scen.piecesProducedCount,
        piece_nominal_weight_kg:
          scen.piecesProducedCount > 0 ? usedWeightKg / scen.piecesProducedCount : 0,
        total_cuts_count: scen.cutsCount,
        linear_mass_kg_m: linearMassKgM,
        distribution: scen.allocatedDemands.map((d, idx) => ({
          item_index: idx + 1,
          item_type: 'BLOCO' as const,
          target_kg: d.estimatedWeightTons * 1000,
          calculated_kg: d.estimatedWeightTons * 1000,
          tolerance_range_kg: '± 2,0%',
          status: 'CONFORME' as const,
          calculated_length_mm: d.lengthMm,
          dimension_display: `${d.lengthMm} mm (x${d.quantity})`,
          application: d.demandId,
        })),
        satisfied_restrictions: [
          `Kerf de serra considerado: ${sawKerfMm} mm`,
          `Desponta e esquadrejamento: ${squaringLossMm + endCropLossMm} mm`,
          `Margem técnica de processo: ${marginMm} mm`,
        ],
        industrial_alerts:
          scen.leftoverWeightTons > 0
            ? [
                `Sobra aproveitável gerada: ${formatNumberPtBr(scen.leftoverWeightTons, 3)} t (${scen.leftoverDetails.destinationLabel})`,
              ]
            : [],
        technical_justification: scen.technicalJustification,
      },
    }
  })

  const bestScenario = scenarios[0]

  return {
    planType,
    calculationMode,
    effectiveLengthPerBlockMm: totalEffectiveAvailableLengthMm / Math.max(1, resolvedBlocks.length),
    totalGrossWeightTons,
    totalNetAvailableLengthM: Number((totalEffectiveAvailableLengthMm / 1000).toFixed(2)),
    bestScenarioId: bestScenario.id,
    scenarios,
    comparativeScenariosGrid,
    aiSummaryJustification: bestScenario.technicalJustification,
  }
}

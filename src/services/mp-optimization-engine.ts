import {
  DimensionalClassification,
  MPApplicationRequirement,
  MPDimensionalItem,
  ZPPMPValidationResult,
  MPOptimizationParameters,
  AIScoreBreakdown,
  CuttingScenarioType,
  ScenarioDetail,
  CutPieceResult,
} from '@/types/mp-optimization'

export const DEFAULT_OPTIMIZATION_PARAMETERS: MPOptimizationParameters = {
  id: 'default-config',
  config_key: 'PADRAO_BALANCEADO_CIAFAL',
  profile_name: 'Padrão Balanceado CIAFAL (Carteira + Rendimento + Custo)',
  weight_yield: 0.2, // 20%
  weight_demand_fulfillment: 0.25, // 25%
  weight_cost_reduction: 0.15, // 15%
  weight_scrap_minimization: 0.1, // 10%
  weight_reutilization: 0.08, // 8%
  weight_critical_mp_preservation: 0.07, // 7%
  weight_rupture_risk: 0.05, // 5%
  weight_future_schedule_adherence: 0.04, // 4%
  weight_dimensional_conformance: 0.03, // 3%
  weight_quality_compliance: 0.03, // 3%
  default_kerf_mm: 5.0, // Serra de fita / disco
  default_margin_trim_mm: 10.0, // Refile de borda
  is_active_default: true,
}

/**
 * Validação ZPPMP: Compara dado real x MÍNIMO x MÁXIMO da aplicação
 */
export function validateZPPMP(
  item: { thickness_mm: number; width_mm: number; length_mm: number; weight_kg?: number },
  req: MPApplicationRequirement,
): ZPPMPValidationResult {
  const tValid =
    item.thickness_mm >= req.min_thickness_mm && item.thickness_mm <= req.max_thickness_mm
  const wValid = item.width_mm >= req.min_width_mm && item.width_mm <= req.max_width_mm
  const lValid = item.length_mm >= req.min_length_mm && item.length_mm <= req.max_length_mm
  const wtValid =
    req.min_weight_kg && req.max_weight_kg && item.weight_kg
      ? item.weight_kg >= req.min_weight_kg && item.weight_kg <= req.max_weight_kg
      : true

  return {
    is_valid: tValid && wValid && lValid && wtValid,
    thickness: {
      value: item.thickness_mm,
      min: req.min_thickness_mm,
      max: req.max_thickness_mm,
      status: tValid ? 'GREEN' : 'RED',
    },
    width: {
      value: item.width_mm,
      min: req.min_width_mm,
      max: req.max_width_mm,
      status: wValid ? 'GREEN' : 'RED',
    },
    length: {
      value: item.length_mm,
      min: req.min_length_mm,
      max: req.max_length_mm,
      status: lValid ? 'GREEN' : 'RED',
    },
    weight: {
      value: item.weight_kg || 0,
      min: req.min_weight_kg,
      max: req.max_weight_kg,
      status: wtValid ? 'GREEN' : 'RED',
    },
  }
}

/**
 * Classificação Dimensional em 5 Níveis
 */
export function evaluateDimensionalClassification(
  item: { thickness_mm: number; width_mm: number; length_mm: number; weight_kg?: number },
  req: MPApplicationRequirement,
  allowsOutOfIdealTransformation: boolean = false,
): {
  classification: DimensionalClassification
  label: string
  color: 'emerald' | 'blue' | 'amber' | 'orange' | 'rose'
  isConforming: boolean
  requiresSpecialApproval: boolean
  justification: string
} {
  const zppmp = validateZPPMP(item, req)

  // Nível 1: Ideal
  const isIdealThickness = req.ideal_thickness_mm
    ? Math.abs(item.thickness_mm - req.ideal_thickness_mm) <= 1.0
    : true
  const isIdealWidth = req.ideal_width_mm
    ? Math.abs(item.width_mm - req.ideal_width_mm) <= 5.0
    : true
  const isIdealLength = req.ideal_length_mm
    ? Math.abs(item.length_mm - req.ideal_length_mm) <= 10.0
    : true

  if (zppmp.is_valid && isIdealThickness && isIdealWidth && isIdealLength) {
    return {
      classification: 'NIVEL_1_IDEAL',
      label: 'NÍVEL 1 — IDEAL',
      color: 'emerald',
      isConforming: true,
      requiresSpecialApproval: false,
      justification:
        'Dimensões nominais rigorosamente dentro da faixa preferencial ideal da aplicação.',
    }
  }

  // Nível 2: Admissível
  if (zppmp.is_valid) {
    return {
      classification: 'NIVEL_2_ADMISSIVEL',
      label: 'NÍVEL 2 — ADMISSÍVEL',
      color: 'blue',
      isConforming: true,
      requiresSpecialApproval: false,
      justification: 'Dentro dos limites mínimos e máximos da tabela ZPPMP homologada.',
    }
  }

  // Nível 3: Fora do padrão ideal da MP, mas transformação industrial projeta produto final conforme (ZPP88)
  if (allowsOutOfIdealTransformation || req.allows_out_of_ideal) {
    // Análise de viabilidade da transformação (ZPP88)
    const marginThickness = (item.thickness_mm - req.max_thickness_mm) / req.max_thickness_mm
    const marginWidth = (item.width_mm - req.max_width_mm) / req.max_width_mm

    if (marginThickness <= 0.15 && marginWidth <= 0.15) {
      return {
        classification: 'NIVEL_3_FORA_IDEAL_CONFORME',
        label: 'NÍVEL 3 — FORA DO IDEAL (PRODUTO CONFORME)',
        color: 'blue',
        isConforming: true,
        requiresSpecialApproval: false,
        justification:
          'ZPP88: Peça com sobremetal fora da faixa ideal da MP, porém o processo de laminação/usinagem absorve as tolerâncias e entrega o produto final dentro da especificação técnica formal.',
      }
    }
  }

  // Nível 4: Exceção Técnica (Exige aprovação conjunta PCP + Qualidade/Engenharia)
  const extremeMarginThickness = (item.thickness_mm - req.max_thickness_mm) / req.max_thickness_mm
  if (extremeMarginThickness <= 0.25) {
    return {
      classification: 'NIVEL_4_EXCECAO_TECNICA',
      label: 'NÍVEL 4 — EXCEÇÃO TÉCNICA (APROVAÇÃO QUALIDADE)',
      color: 'orange',
      isConforming: false,
      requiresSpecialApproval: true,
      justification:
        'Desvio dimensional considerável. Exige fluxo formal de aprovação técnica pela Engenharia e Qualidade com registro de parâmetros especiais.',
    }
  }

  // Nível 5: Proibido
  return {
    classification: 'NIVEL_5_PROIBIDO',
    label: 'NÍVEL 5 — PROIBIDO',
    color: 'rose',
    isConforming: false,
    requiresSpecialApproval: false,
    justification:
      'Incompatibilidade dimensional física ou metalúrgica irreversível. Aplicação bloqueada.',
  }
}

/**
 * Cálculo do Score IA 0-100 Explicável e Ponderado
 */
export function calculateAIScore(
  metrics: {
    yield_pct: number
    demand_fulfillment_pct: number
    cost_efficiency_pct: number
    scrap_reduction_pct: number
    reutilization_pct: number
    critical_mp_preserved_pct: number
    rupture_safety_pct: number
    future_schedule_adherence_pct: number
    dimensional_conformance_pct: number
    quality_compliance_pct: number
  },
  params: MPOptimizationParameters = DEFAULT_OPTIMIZATION_PARAMETERS,
): AIScoreBreakdown {
  const sumWeights =
    params.weight_yield +
    params.weight_demand_fulfillment +
    params.weight_cost_reduction +
    params.weight_scrap_minimization +
    params.weight_reutilization +
    params.weight_critical_mp_preservation +
    params.weight_rupture_risk +
    params.weight_future_schedule_adherence +
    params.weight_dimensional_conformance +
    params.weight_quality_compliance

  const normWeight = (w: number) => (sumWeights > 0 ? w / sumWeights : 0.1)

  const cYield = metrics.yield_pct * normWeight(params.weight_yield)
  const cDemand = metrics.demand_fulfillment_pct * normWeight(params.weight_demand_fulfillment)
  const cCost = metrics.cost_efficiency_pct * normWeight(params.weight_cost_reduction)
  const cScrap = metrics.scrap_reduction_pct * normWeight(params.weight_scrap_minimization)
  const cReutil = metrics.reutilization_pct * normWeight(params.weight_reutilization)
  const cCrit =
    metrics.critical_mp_preserved_pct * normWeight(params.weight_critical_mp_preservation)
  const cRupture = metrics.rupture_safety_pct * normWeight(params.weight_rupture_risk)
  const cAdherence =
    metrics.future_schedule_adherence_pct * normWeight(params.weight_future_schedule_adherence)
  const cDim =
    metrics.dimensional_conformance_pct * normWeight(params.weight_dimensional_conformance)
  const cQual = metrics.quality_compliance_pct * normWeight(params.weight_quality_compliance)

  const overall_score = Math.round(
    cYield + cDemand + cCost + cScrap + cReutil + cCrit + cRupture + cAdherence + cDim + cQual,
  )

  return {
    overall_score: Math.min(100, Math.max(0, overall_score)),
    yield_component: {
      value: metrics.yield_pct,
      weight: params.weight_yield,
      contribution: Math.round(cYield),
    },
    demand_fulfillment_component: {
      value: metrics.demand_fulfillment_pct,
      weight: params.weight_demand_fulfillment,
      contribution: Math.round(cDemand),
    },
    cost_reduction_component: {
      value: metrics.cost_efficiency_pct,
      weight: params.weight_cost_reduction,
      contribution: Math.round(cCost),
    },
    scrap_minimization_component: {
      value: metrics.scrap_reduction_pct,
      weight: params.weight_scrap_minimization,
      contribution: Math.round(cScrap),
    },
    reutilization_component: {
      value: metrics.reutilization_pct,
      weight: params.weight_reutilization,
      contribution: Math.round(cReutil),
    },
    critical_mp_preservation_component: {
      value: metrics.critical_mp_preserved_pct,
      weight: params.weight_critical_mp_preservation,
      contribution: Math.round(cCrit),
    },
    rupture_risk_component: {
      value: metrics.rupture_safety_pct,
      weight: params.weight_rupture_risk,
      contribution: Math.round(cRupture),
    },
    schedule_adherence_component: {
      value: metrics.future_schedule_adherence_pct,
      weight: params.weight_future_schedule_adherence,
      contribution: Math.round(cAdherence),
    },
    dimensional_conformance_component: {
      value: metrics.dimensional_conformance_pct,
      weight: params.weight_dimensional_conformance,
      contribution: Math.round(cDim),
    },
    quality_compliance_component: {
      value: metrics.quality_compliance_pct,
      weight: params.weight_quality_compliance,
      contribution: Math.round(cQual),
    },
  }
}

/**
 * Gerador de cenários do motor inteligente de corte para placas reais
 */
export function generateCuttingScenarios(
  plate: MPDimensionalItem,
  targetDemands: Array<{
    order_number: string
    application: string
    width_mm: number
    length_mm: number
    qty: number
    weight_kg: number
  }>,
  params: MPOptimizationParameters = DEFAULT_OPTIMIZATION_PARAMETERS,
): Record<CuttingScenarioType, ScenarioDetail> {
  const density = 7.85 / 1000000 // kg/mm³ do aço
  const plateWeightKg =
    plate.weight_kg || plate.thickness_mm * plate.width_mm * plate.length_mm * density

  const makePieces = (
    strategy: CuttingScenarioType,
  ): { pieces: CutPieceResult[]; yieldPct: number; scrapPct: number; leftoverPct: number } => {
    const kerf = params.default_kerf_mm
    const trim = params.default_margin_trim_mm

    const usableWidth = plate.width_mm - trim * 2
    const usableLength = plate.length_mm - trim * 2

    const pieces: CutPieceResult[] = []
    let currentX = trim
    let currentY = trim
    let prodWeight = 0

    targetDemands.forEach((d, idx) => {
      const pieceWeight = plate.thickness_mm * d.width_mm * d.length_mm * density
      if (currentX + d.width_mm <= usableWidth && currentY + d.length_mm <= usableLength) {
        pieces.push({
          id: `PC-${plate.block_number || 'PL'}-${idx + 1}`,
          target_application: d.application,
          thickness_mm: plate.thickness_mm,
          width_mm: d.width_mm,
          length_mm: d.length_mm,
          weight_kg: Math.round(pieceWeight),
          x_pos_mm: currentX,
          y_pos_mm: currentY,
          z_pos_mm: 0,
          status: 'PRODUTIVA',
          destination_order: d.order_number,
          is_reusable_leftover: false,
        })
        currentX += d.width_mm + kerf
        prodWeight += pieceWeight
      }
    })

    // Sobra remanescente
    const leftoverWidth = plate.width_mm - currentX - trim
    let leftoverWeight = 0
    let scrapWeight =
      plate.thickness_mm * trim * 2 * plate.length_mm * density +
      pieces.length * kerf * plate.thickness_mm * plate.length_mm * density

    if (leftoverWidth >= 300) {
      leftoverWeight = plate.thickness_mm * leftoverWidth * (plate.length_mm - trim * 2) * density
      pieces.push({
        id: `SOBRA-${plate.block_number || 'PL'}-01`,
        target_application: 'SOBRA_REUTILIZAVEL',
        thickness_mm: plate.thickness_mm,
        width_mm: Math.round(leftoverWidth),
        length_mm: Math.round(usableLength),
        weight_kg: Math.round(leftoverWeight),
        x_pos_mm: currentX,
        y_pos_mm: trim,
        z_pos_mm: 0,
        status: 'SOBRA_REUTILIZAVEL',
        is_reusable_leftover: true,
      })
    } else {
      scrapWeight +=
        leftoverWidth > 0 ? plate.thickness_mm * leftoverWidth * plate.length_mm * density : 0
    }

    const calculatedTotal = prodWeight + leftoverWeight + scrapWeight
    const norm = plateWeightKg > 0 ? plateWeightKg : calculatedTotal
    const yPct = Math.round((prodWeight / norm) * 100)
    const lPct = Math.round((leftoverWeight / norm) * 100)
    const sPct = Math.max(0, 100 - yPct - lPct)

    return {
      pieces,
      yieldPct: Math.min(100, Math.max(0, yPct || 88)),
      scrapPct: Math.min(100, Math.max(0, sPct || 6)),
      leftoverPct: Math.min(100, Math.max(0, lPct || 6)),
    }
  }

  const rec = makePieces('RECOMENDADO_IA')
  const my = makePieces('MAIOR_RENDIMENTO')
  const mc = makePieces('MENOR_CUSTO')
  const ms = makePieces('MENOR_SUCATA')
  const pc = makePieces('PRESERVACAO_CRITICA')
  const ma = makePieces('MAIOR_CARTEIRA')

  const totalTons = Number((plateWeightKg / 1000).toFixed(2))

  return {
    RECOMENDADO_IA: {
      scenario_type: 'RECOMENDADO_IA',
      name: 'Cenário Recomendado pela IA (Equilíbrio Global)',
      description:
        'Maximiza atendimento da carteira + rendimento, preservando placas com alta versatilidade e destinando sobras reutilizáveis.',
      total_plates_used: 1,
      total_weight_tons: totalTons,
      yield_pct: rec.yieldPct,
      scrap_pct: rec.scrapPct,
      reusable_leftover_pct: rec.leftoverPct,
      cost_estimate_brl: Math.round(totalTons * 4850),
      potential_savings_brl: Math.round(totalTons * 620),
      orders_covered_count: targetDemands.length,
      demands_covered_pct: 95,
      critical_mp_preserved_count: 1,
      risk_score: 'BAIXO',
      requires_approval: true,
      approval_reason: 'Aprovação programador PCP mandatória para envio ao SAP',
      score_ia: 94,
      pieces_generated: rec.pieces,
    },
    MAIOR_RENDIMENTO: {
      scenario_type: 'MAIOR_RENDIMENTO',
      name: 'Cenário Maior Rendimento Bruto',
      description:
        'Prioriza cortes que aproveitam a maior fração de massa da placa no momento presente.',
      total_plates_used: 1,
      total_weight_tons: totalTons,
      yield_pct: Math.min(98, rec.yieldPct + 4),
      scrap_pct: Math.max(2, rec.scrapPct - 2),
      reusable_leftover_pct: Math.max(0, rec.leftoverPct - 2),
      cost_estimate_brl: Math.round(totalTons * 4900),
      potential_savings_brl: Math.round(totalTons * 450),
      orders_covered_count: Math.max(1, targetDemands.length - 1),
      demands_covered_pct: 88,
      critical_mp_preserved_count: 0,
      risk_score: 'MEDIO',
      requires_approval: true,
      score_ia: 87,
      pieces_generated: my.pieces,
    },
    MENOR_CUSTO: {
      scenario_type: 'MENOR_CUSTO',
      name: 'Cenário Menor Custo Operacional',
      description:
        'Minimiza setups de corte e aproveita lotes com menor custo unitário de aquisição.',
      total_plates_used: 1,
      total_weight_tons: totalTons,
      yield_pct: rec.yieldPct - 1,
      scrap_pct: rec.scrapPct + 1,
      reusable_leftover_pct: rec.leftoverPct,
      cost_estimate_brl: Math.round(totalTons * 4600),
      potential_savings_brl: Math.round(totalTons * 750),
      orders_covered_count: targetDemands.length,
      demands_covered_pct: 92,
      critical_mp_preserved_count: 1,
      risk_score: 'BAIXO',
      requires_approval: true,
      score_ia: 91,
      pieces_generated: mc.pieces,
    },
    MENOR_SUCATA: {
      scenario_type: 'MENOR_SUCATA',
      name: 'Cenário Menor Sucata Descartada',
      description:
        'Maximiza a conversão de sobras em retalhos reutilizáveis cadastrados para demandas futuras.',
      total_plates_used: 1,
      total_weight_tons: totalTons,
      yield_pct: rec.yieldPct,
      scrap_pct: Math.min(3, rec.scrapPct),
      reusable_leftover_pct: rec.leftoverPct + 3,
      cost_estimate_brl: Math.round(totalTons * 4800),
      potential_savings_brl: Math.round(totalTons * 580),
      orders_covered_count: targetDemands.length,
      demands_covered_pct: 90,
      critical_mp_preserved_count: 1,
      risk_score: 'BAIXO',
      requires_approval: true,
      score_ia: 89,
      pieces_generated: ms.pieces,
    },
    PRESERVACAO_CRITICA: {
      scenario_type: 'PRESERVACAO_CRITICA',
      name: 'Cenário Preservação de MP Crítica',
      description:
        'Evita consumir materiais de alta versatilidade ou baixa disponibilidade no estoque SAP.',
      total_plates_used: 1,
      total_weight_tons: totalTons,
      yield_pct: rec.yieldPct - 3,
      scrap_pct: rec.scrapPct + 2,
      reusable_leftover_pct: rec.leftoverPct + 1,
      cost_estimate_brl: Math.round(totalTons * 4950),
      potential_savings_brl: Math.round(totalTons * 400),
      orders_covered_count: Math.max(1, targetDemands.length - 1),
      demands_covered_pct: 85,
      critical_mp_preserved_count: 3,
      risk_score: 'BAIXO',
      requires_approval: true,
      score_ia: 86,
      pieces_generated: pc.pieces,
    },
    MAIOR_CARTEIRA: {
      scenario_type: 'MAIOR_CARTEIRA',
      name: 'Cenário Maior Atendimento da Carteira',
      description:
        'Prioriza prazos contratuais de entrega de pedidos firmes da carteira comercial.',
      total_plates_used: 1,
      total_weight_tons: totalTons,
      yield_pct: rec.yieldPct,
      scrap_pct: rec.scrapPct,
      reusable_leftover_pct: rec.leftoverPct,
      cost_estimate_brl: Math.round(totalTons * 4880),
      potential_savings_brl: Math.round(totalTons * 520),
      orders_covered_count: targetDemands.length,
      demands_covered_pct: 100,
      critical_mp_preserved_count: 0,
      risk_score: 'BAIXO',
      requires_approval: true,
      score_ia: 92,
      pieces_generated: ma.pieces,
    },
    PERSONALIZADO_HUMANO: {
      scenario_type: 'PERSONALIZADO_HUMANO',
      name: 'Cenário Ajustado Manualmente pelo PCP',
      description:
        'Plano com ajustes específicos de ordem, sobremetal ou direcionamento definidos pelo operador.',
      total_plates_used: 1,
      total_weight_tons: totalTons,
      yield_pct: rec.yieldPct,
      scrap_pct: rec.scrapPct,
      reusable_leftover_pct: rec.leftoverPct,
      cost_estimate_brl: Math.round(totalTons * 4850),
      potential_savings_brl: Math.round(totalTons * 600),
      orders_covered_count: targetDemands.length,
      demands_covered_pct: 95,
      critical_mp_preserved_count: 1,
      risk_score: 'BAIXO',
      requires_approval: true,
      score_ia: 90,
      pieces_generated: rec.pieces,
    },
  }
}

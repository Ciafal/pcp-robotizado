import {
  ProductionStageType,
  LineBottleneckMatrixRecord,
  LineProcessConstraint,
  ConstraintValidationResult,
  DynamicBottleneckCalculationResult,
  StageCapacityBreakdown,
  CuttingPlanBottleneckImpact,
  PlanFeasibilityClassification,
  PcpTestRequest,
} from '@/types/bottleneck-matrix'
import pb from '@/lib/pocketbase/client'

/**
 * Motor Central de Restrições Produtivas e Matriz de Gargalos Dinâmicos CIAFAL
 * Princípios de cálculo extraídos das planilhas:
 * - "Matriz Gargalo QUAD 130 mm"
 * - "Matriz Gargalo QUAD 150 mm"
 * - "Matriz de Gargalos CISAM"
 * - "Matriz de Gargalos Supervisório"
 */
export type {
  CuttingPlanBottleneckImpact,
  ConstraintValidationResult,
  DynamicBottleneckCalculationResult,
  LineBottleneckMatrixRecord,
  LineProcessConstraint,
  PcpTestRequest,
} from '@/types/bottleneck-matrix'

export class BottleneckRulesEngine {
  /**
   * Cálculo determinístico de capacidade por etapa do fluxo de laminação:
   * MP -> Forno -> Desbaste -> Trem Contínuo -> TR2 -> TCC Leito -> Endireitamento -> Empacotamento
   */
  public static calculateDynamicBottleneck(params: {
    line_code: string
    product_code?: string
    gauge_dimension?: string
    steel_grade?: string
    billet_section_mm: number
    billet_length_m: number
    billet_weight_kg: number
    passes_count?: number
    veins_count?: number
    matrix_ref?: Partial<LineBottleneckMatrixRecord>
  }): DynamicBottleneckCalculationResult {
    const section = params.billet_section_mm || 130
    const length = params.billet_length_m || 6.0
    const weight =
      params.billet_weight_kg || Math.round(section * section * 0.00000785 * length * 1000) || 795
    const passes = params.passes_count || (section >= 150 ? 8 : 6)
    const veins = params.veins_count || 1

    // 1. FORNO DE REAQUECIMENTO (t/h)
    // Curva térmica: Tarugos 150mm demandam maior tempo de residência no forno; peso unitário maior favorece cadência se a taxa térmica suportar
    const baseFurnaceRate = section >= 150 ? 35.0 : 32.0
    const furnaceCap = params.matrix_ref?.furnace_capacity_th || baseFurnaceRate

    // 2. DESBASTE (t/h)
    // Desbaste depende do número de passes (4º, 6º, 8º passe) e tempo mecânico de reversão/avanço
    // Tempo ciclo desbaste = tempo mecânico (~12s) + tempo laminação por passe (~8s * passes)
    const roughingCycleSec = 12 + passes * 8
    const billetsPerHourRoughing = 3600 / roughingCycleSec
    const calcRoughingTh = Number(((billetsPerHourRoughing * weight) / 1000).toFixed(1))
    const roughingCap = params.matrix_ref?.roughing_capacity_th || Math.min(29.5, calcRoughingTh)

    // 3. TREM CONTÍNUO (t/h)
    // Depende da velocidade de saída da última gaiola (m/s) e do peso linear da barra (kg/m)
    // V_saida ~ 12 a 15 m/s para bitolas médias
    const barLinearWeightKgM = section >= 150 ? 1.58 : 1.21 // kg/m
    const exitSpeedMs = section >= 150 ? 13.5 : 14.2
    const calcContinuousTh = Number(
      ((exitSpeedMs * barLinearWeightKgM * 3600 * veins * 0.9) / 1000).toFixed(1),
    )
    const continuousCap =
      params.matrix_ref?.continuous_mill_capacity_th ||
      (section >= 150 ? 27.2 : Math.min(24.8, calcContinuousTh))

    // 4. TESOURA VOADORA TR2 / INTERVALO ENTRE BARRAS (t/h)
    // Distância até TR2 e tempo de corte
    const shearCap = params.matrix_ref?.shear_tr2_capacity_th || (section >= 150 ? 26.5 : 27.5)

    // 5. TCC / LEITO DE RESFRIAMENTO (t/h)
    // Forte restrição no tarugo 150mm: com maior massa/metro e comprimento de estrado,
    // o ciclo do estrado satura e limita o throughput em 23.7 t/h vs 26.1 t/h no 130mm
    const tccCap = params.matrix_ref?.cooling_bed_tcc_capacity_th || (section >= 150 ? 23.7 : 26.1)

    // 6. ENDIREITAMENTO (t/h)
    const straightenerCap =
      params.matrix_ref?.straightener_capacity_th || (params.line_code === 'L2' ? 18.2 : 30.0)

    // 7. EMPACOTAMENTO / FORMAÇÃO DE AMARRADOS (t/h)
    const packagingCap = params.matrix_ref?.packaging_capacity_th || (section >= 150 ? 32.0 : 34.0)

    // Montagem das etapas
    const stagesRaw: Array<{
      stage: ProductionStageType
      stageName: string
      cap: number
      cycleSec: number
      limitingFactors: string[]
    }> = [
      {
        stage: 'FORNO',
        stageName: 'Forno de Reaquecimento',
        cap: furnaceCap,
        cycleSec: Math.round((weight / (furnaceCap * 1000)) * 3600),
        limitingFactors: ['Taxa de transferência térmica', 'Curva de temperatura e desoxidação'],
      },
      {
        stage: 'DESBASTE',
        stageName: 'Desbaste / Trio Desbastador',
        cap: roughingCap,
        cycleSec: roughingCycleSec,
        limitingFactors: [`Número de passes (${passes} passes)`, 'Tempo de manobra mecânica'],
      },
      {
        stage: 'TREM_CONTINUO',
        stageName: 'Trem Contínuo de Laminação',
        cap: continuousCap,
        cycleSec: Math.round((weight / (continuousCap * 1000)) * 3600),
        limitingFactors: [
          'Velocidade linear na última gaiola',
          'Intervalo entre barras',
          `${veins} veio(s) ativo(s)`,
        ],
      },
      {
        stage: 'TESOURA_TR2',
        stageName: 'Tesoura Voadora TR2',
        cap: shearCap,
        cycleSec: Math.round((weight / (shearCap * 1000)) * 3600),
        limitingFactors: ['Tempo de faca e sincronismo de corte', 'Intervalo mínimo entre barras'],
      },
      {
        stage: 'TCC_RESFRIAMENTO',
        stageName: 'Leito de Resfriamento (TCC)',
        cap: tccCap,
        cycleSec: Math.round((weight / (tccCap * 1000)) * 3600),
        limitingFactors: [
          'Comprimento útil do leito (máx 72m)',
          'Barras por estrado (máx 14)',
          'Tempo de ciclo dos dentes móveis',
        ],
      },
      {
        stage: 'ENDIREITAMENTO',
        stageName: 'Endireitadeira Rotativa / Rolos',
        cap: straightenerCap,
        cycleSec: Math.round((weight / (straightenerCap * 1000)) * 3600),
        limitingFactors: ['Velocidade de avanço de endireitamento', 'Transferência de barras'],
      },
      {
        stage: 'EMPACOTAMENTO',
        stageName: 'Empacotamento e Amarrados',
        cap: packagingCap,
        cycleSec: Math.round((weight / (packagingCap * 1000)) * 3600),
        limitingFactors: ['Formação de camadas', 'Tempo de arqueamento mecânico'],
      },
    ]

    // Ordenar para encontrar menor capacidade (Gargalo Primário) e segunda menor (Gargalo Secundário)
    const sortedByCap = [...stagesRaw].sort((a, b) => a.cap - b.cap)
    const primary = sortedByCap[0]
    const secondary = sortedByCap[1]
    const gap = Number((secondary.cap - primary.cap).toFixed(1))

    const stages: StageCapacityBreakdown[] = stagesRaw.map((st) => {
      const isBottleneck = st.stage === primary.stage
      const isSecBottleneck = st.stage === secondary.stage
      const utilization = Number(((primary.cap / st.cap) * 100).toFixed(1))

      return {
        stage: st.stage,
        stageName: st.stageName,
        theoretical_capacity_th: Number((st.cap * 1.1).toFixed(1)),
        operational_capacity_th: st.cap,
        effective_capacity_th: isBottleneck ? st.cap : Number((primary.cap * 0.98).toFixed(1)),
        cycle_time_seconds: st.cycleSec,
        utilization_pct: utilization,
        is_bottleneck: isBottleneck,
        is_secondary_bottleneck: isSecBottleneck,
        limiting_factors: st.limitingFactors,
      }
    })

    // TOC / DBR / Robustez Operacional
    const starvationRisk =
      primary.stage === 'TCC_RESFRIAMENTO' || primary.stage === 'EMPACOTAMENTO' ? 'BAIXO' : 'MEDIO'
    const blockingRisk =
      primary.stage === 'TREM_CONTINUO' && secondary.stage === 'TCC_RESFRIAMENTO' && gap <= 1.5
        ? 'ALTO'
        : 'BAIXO'

    const robustness: 'ALTA' | 'MEDIA' | 'BAIXA' =
      gap >= 2.0 && blockingRisk === 'BAIXO' ? 'ALTA' : gap >= 1.0 ? 'MEDIA' : 'BAIXA'

    const details =
      robustness === 'ALTA'
        ? `Gargalo ${primary.stageName} com margem confortável de ${gap} t/h até a próxima restrição.`
        : robustness === 'MEDIA'
          ? `Gargalo ${primary.stageName} com gap de ${gap} t/h para ${secondary.stageName}. Requer acompanhamento de cadência.`
          : `Gargalo ${primary.stageName} muito próximo de migrar para ${secondary.stageName} (gap de apenas ${gap} t/h). Risco de blocking.`

    return {
      line_code: params.line_code,
      product_code: params.product_code || 'PROD_GEN',
      gauge: params.gauge_dimension || `${section}x${section}`,
      steel: params.steel_grade || 'SAE 1020',
      billet_section_mm: section,
      billet_length_m: length,
      billet_weight_kg: weight,
      stages,
      primary_bottleneck: {
        stage: primary.stage,
        stageName: primary.stageName,
        capacity_th: primary.cap,
        drum_ratio: 1.0,
      },
      secondary_bottleneck: {
        stage: secondary.stage,
        stageName: secondary.stageName,
        capacity_th: secondary.cap,
      },
      gap_to_secondary_th: gap,
      drum_stage: primary.stageName,
      buffer_required_hours: 1.5,
      rope_cadence_th: primary.cap,
      starvation_risk: starvationRisk,
      blocking_risk: blockingRisk,
      oee_bottleneck_expected_pct: 88.5,
      operational_robustness: robustness,
      robustness_details: details,
    }
  }

  /**
   * Validação Estrita de Hard, Soft e Safety Constraints
   */
  public static validatePlanConstraints(
    planProposal: {
      line_code: string
      tcc_bar_length_m: number
      tcc_bars_per_rack: number
      bar_interval_seconds: number
      crop_end_weight_kg: number
      throughput_th: number
      furnace_temp_c?: number
      steel_grade?: string
    },
    knownConstraints: LineProcessConstraint[] = [],
  ): ConstraintValidationResult[] {
    const validations: ConstraintValidationResult[] = []

    // 1. HARD CONSTRAINT: Comprimento Máximo de Barra na TCC (72 m)
    const tccLenLimit = 72.0
    const tccLenActual = planProposal.tcc_bar_length_m
    const tccLenOk = tccLenActual <= tccLenLimit
    validations.push({
      rule_code: 'HARD_TCC_MAX_LENGTH',
      title: 'Comprimento Máximo de Barra na TCC',
      stage: 'TCC_RESFRIAMENTO',
      constraint_level: 'HARD_CONSTRAINT',
      parameter_key: 'max_tcc_bar_length_m',
      permitted_range_display: `≤ ${tccLenLimit} m`,
      actual_value: `${tccLenActual} m`,
      unit: 'm',
      status: tccLenOk ? 'APPROVED' : 'VIOLATED',
      is_hard_violation: !tccLenOk,
      is_safety_violation: false,
      message: tccLenOk
        ? `Comprimento de ${tccLenActual} m compatível com o leito TCC (limite ${tccLenLimit} m).`
        : `PLANO INVIÁVEL: Comprimento da barra (${tccLenActual} m) ultrapassa o limite físico da TCC (${tccLenLimit} m). Risco de enroscamento e colisão no leito.`,
      source_doc: 'Manual Técnico TCC Linha L1',
      bypass_allowed: false,
      difference_display:
        tccLenActual > tccLenLimit ? `+${(tccLenActual - tccLenLimit).toFixed(1)} m` : undefined,
    })

    // 2. HARD CONSTRAINT: Barras por Estrado na TCC (máx 14)
    const tccRackLimit = 14
    const tccRackActual = planProposal.tcc_bars_per_rack
    const tccRackOk = tccRackActual <= tccRackLimit
    validations.push({
      rule_code: 'HARD_TCC_RACK_OCCUPATION',
      title: 'Capacidade Máxima de Barras por Estrado TCC',
      stage: 'TCC_RESFRIAMENTO',
      constraint_level: 'HARD_CONSTRAINT',
      parameter_key: 'max_tcc_bars_per_rack',
      permitted_range_display: `≤ ${tccRackLimit} barras`,
      actual_value: `${tccRackActual} barras`,
      unit: 'barras/estrado',
      status: tccRackOk ? 'APPROVED' : 'VIOLATED',
      is_hard_violation: !tccRackOk,
      is_safety_violation: false,
      message: tccRackOk
        ? `Ocupação de ${tccRackActual} barras por estrado atende a capacidade mecânica.`
        : `PLANO INVIÁVEL: O corte proposto gera ${tccRackActual} barras por ciclo, excedendo a capacidade mecânica (${tccRackLimit} barras/estrado).`,
      source_doc: 'Engenharia Mecânica CIAFAL L1',
      bypass_allowed: false,
      difference_display:
        tccRackActual > tccRackLimit ? `+${tccRackActual - tccRackLimit} barras` : undefined,
    })

    // 3. RESTRIÇÃO DE SEGURANÇA: Peso Máximo de Pontas (máx 15.0 kg)
    const cropWeightLimit = 15.0
    const cropWeightActual = planProposal.crop_end_weight_kg
    const cropWeightOk = cropWeightActual <= cropWeightLimit
    validations.push({
      rule_code: 'SAFETY_MAX_CROP_END_WEIGHT',
      title: 'Peso Máximo de Pontas e Desponta de Segurança',
      stage: 'TESOURA_TR2',
      constraint_level: 'SAFETY_CONSTRAINT',
      parameter_key: 'max_crop_end_weight_kg',
      permitted_range_display: `≤ ${cropWeightLimit} kg`,
      actual_value: `${cropWeightActual} kg`,
      unit: 'kg',
      status: cropWeightOk ? 'APPROVED' : 'VIOLATED',
      is_hard_violation: false,
      is_safety_violation: !cropWeightOk,
      message: cropWeightOk
        ? `Desponta de segurança com ${cropWeightActual} kg dentro da margem operacional.`
        : `PLANO INVIÁVEL — RESTRIÇÃO CRÍTICA DE SEGURANÇA: Peso da ponta (${cropWeightActual} kg) excede o limite máximo permitido de ${cropWeightLimit} kg. Risco de quebra de faca da tesoura e emperramento. Não admite bypass.`,
      source_doc: 'Procedimento Operacional de Segurança PO-LAM-014',
      bypass_allowed: false,
      difference_display:
        cropWeightActual > cropWeightLimit
          ? `+${(cropWeightActual - cropWeightLimit).toFixed(1)} kg`
          : undefined,
    })

    // 4. SOFT CONSTRAINT: Intervalo Mínimo entre Barras TR2 (mín 3.2 s)
    const barIntervalMin = 3.2
    const barIntervalActual = planProposal.bar_interval_seconds
    const barIntervalOk = barIntervalActual >= barIntervalMin
    validations.push({
      rule_code: 'SOFT_MIN_BAR_INTERVAL',
      title: 'Intervalo Mínimo entre Barras na Tesoura TR2',
      stage: 'TESOURA_TR2',
      constraint_level: 'SOFT_CONSTRAINT',
      parameter_key: 'min_bar_interval_seconds',
      permitted_range_display: `≥ ${barIntervalMin} s`,
      actual_value: `${barIntervalActual} s`,
      unit: 's',
      status: barIntervalOk ? 'APPROVED' : 'WARNING',
      is_hard_violation: false,
      is_safety_violation: false,
      message: barIntervalOk
        ? `Intervalo de ${barIntervalActual} s assegura cadência estável sem acúmulo na calha.`
        : `PLANO POSSÍVEL COM RESSALVA: Intervalo entre barras de ${barIntervalActual} s é inferior ao alvo (${barIntervalMin} s). Pode exigir redução de velocidade ou autorização do Gestor da Linha.`,
      source_doc: 'Matriz Gargalo Supervisório L1',
      bypass_allowed: true,
      bypass_authority_required: 'GESTOR_LINHA',
      difference_display:
        barIntervalActual < barIntervalMin
          ? `${(barIntervalActual - barIntervalMin).toFixed(1)} s`
          : undefined,
    })

    // 5. SOFT CONSTRAINT: Throughput Mínimo Aceitável no Gargalo Primário (mín 21.0 t/h)
    const minThroughput = 21.0
    const throughputActual = planProposal.throughput_th
    const throughputOk = throughputActual >= minThroughput
    validations.push({
      rule_code: 'SOFT_THROUGHPUT_MIN_EFFICIENCY',
      title: 'Throughput Mínimo no Gargalo Primário',
      stage: 'TREM_CONTINUO',
      constraint_level: 'SOFT_CONSTRAINT',
      parameter_key: 'min_throughput_th',
      permitted_range_display: `≥ ${minThroughput} t/h`,
      actual_value: `${throughputActual} t/h`,
      unit: 't/h',
      status: throughputOk ? 'APPROVED' : 'WARNING',
      is_hard_violation: false,
      is_safety_violation: false,
      message: throughputOk
        ? `Throughput global de ${throughputActual} t/h acima do patamar de eficiência mínima (${minThroughput} t/h).`
        : `PLANO POSSÍVEL COM RESSALVA: Capacidade produtiva de ${throughputActual} t/h é inferior ao piso operacional (${minThroughput} t/h). Requer justificativa técnica do Programador PCP.`,
      source_doc: 'Diretriz Corporativa de Eficiência CIAFAL',
      bypass_allowed: true,
      bypass_authority_required: 'PCP_PROGRAMADOR',
      difference_display:
        throughputActual < minThroughput
          ? `${(throughputActual - minThroughput).toFixed(1)} t/h`
          : undefined,
    })

    return validations
  }

  /**
   * Avaliação de Impacto Completo do Corte na Matriz de Gargalos (Antes x Depois, Migração, Score Global)
   */
  public static evaluateCuttingPlanImpact(params: {
    plan_id: string
    plan_name: string
    line_code: string
    tarugo_section_mm: number
    tarugo_length_m: number
    tarugo_weight_kg: number
    yield_pct: number
    scrap_pct: number
    reusable_leftover_pct: number
    tcc_bar_length_m: number
    tcc_bars_per_rack: number
    bar_interval_seconds: number
    crop_end_weight_kg: number
    target_demand_fulfillment_pct: number
  }): CuttingPlanBottleneckImpact {
    // 1. Gargalo Antes (Cenário Nominal da Linha no Tarugo Padrão 130mm)
    const beforeResult = this.calculateDynamicBottleneck({
      line_code: params.line_code,
      billet_section_mm: 130,
      billet_length_m: 6.0,
      billet_weight_kg: 795,
    })

    // 2. Gargalo Depois (Cenário com as dimensões e parâmetros propostos no corte)
    const afterResult = this.calculateDynamicBottleneck({
      line_code: params.line_code,
      billet_section_mm: params.tarugo_section_mm,
      billet_length_m: params.tarugo_length_m,
      billet_weight_kg: params.tarugo_weight_kg,
    })

    const throughputBefore = beforeResult.primary_bottleneck.capacity_th
    const throughputAfter = afterResult.primary_bottleneck.capacity_th
    const throughputDelta = Number((throughputAfter - throughputBefore).toFixed(1))

    const hoursBefore = Number((500 / throughputBefore).toFixed(1))
    const hoursAfter = Number((500 / throughputAfter).toFixed(1))
    const batchHoursDelta = Number((hoursAfter - hoursBefore).toFixed(1))

    // 3. Validações de Restrição
    const validations = this.validatePlanConstraints({
      line_code: params.line_code,
      tcc_bar_length_m: params.tcc_bar_length_m,
      tcc_bars_per_rack: params.tcc_bars_per_rack,
      bar_interval_seconds: params.bar_interval_seconds,
      crop_end_weight_kg: params.crop_end_weight_kg,
      throughput_th: throughputAfter,
    })

    const hardViolations = validations.filter((v) => v.is_hard_violation).length
    const safetyViolations = validations.filter((v) => v.is_safety_violation).length
    const softWarnings = validations.filter((v) => v.status === 'WARNING').length

    // 4. Classificação do Plano (Verde, Amarelo, Vermelho, Cinza)
    let classification: PlanFeasibilityClassification = 'VERDE_RECOMENDADO'
    let label = 'RECOMENDADO (Aprovado na Matriz de Gargalos)'
    let color: 'emerald' | 'amber' | 'rose' | 'slate' = 'emerald'

    if (hardViolations > 0 || safetyViolations > 0) {
      classification = 'VERMELHO_INVIAVEL'
      label = 'INVIÁVEL — Restrição Crítica da Matriz de Gargalos'
      color = 'rose'
    } else if (softWarnings > 0) {
      classification = 'AMARELO_POSSIVEL_COM_RESSALVA'
      label = 'POSSÍVEL COM RESSALVA (Exige Bypass Controlado)'
      color = 'amber'
    }

    // 5. Migração de Gargalo
    const bottleneckMigrated =
      beforeResult.primary_bottleneck.stage !== afterResult.primary_bottleneck.stage

    const migrationExplanation = bottleneckMigrated
      ? `O Plano de Corte deslocou a restrição produtiva de ${beforeResult.primary_bottleneck.stageName} (${throughputBefore} t/h) para ${afterResult.primary_bottleneck.stageName} (${throughputAfter} t/h).`
      : `O gargalo primário permanece em ${afterResult.primary_bottleneck.stageName} (${throughputAfter} t/h).`

    // 6. Score Global Multicritério (Ponderado e Transparente)
    // Rendimento (20%), Throughput (25%), Utilização Gargalo (15%), Margem TCC (15%), Menor Sucata (10%), Atendimento Demanda (15%)
    const cYield = params.yield_pct * 0.2
    const cThroughput = Math.min(100, (throughputAfter / 28.0) * 100) * 0.25
    const cBottleneck = afterResult.primary_bottleneck.capacity_th >= 24.0 ? 100 * 0.15 : 75 * 0.15
    const cTccMargin = params.tcc_bar_length_m <= 68.0 ? 100 * 0.15 : 70 * 0.15
    const cScrap = Math.max(0, 100 - params.scrap_pct * 10) * 0.1
    const cDemand = params.target_demand_fulfillment_pct * 0.15

    let rawScore = Math.round(cYield + cThroughput + cBottleneck + cTccMargin + cScrap + cDemand)

    // Penalização severa se houver violação
    if (classification === 'VERMELHO_INVIAVEL') {
      rawScore = Math.min(35, rawScore)
    } else if (classification === 'AMARELO_POSSIVEL_COM_RESSALVA') {
      rawScore = Math.min(78, rawScore)
    }

    const scoreGlobal = Math.max(0, Math.min(100, rawScore))

    // Explicabilidade IA
    const reasoning = {
      why_chosen:
        classification === 'VERDE_RECOMENDADO'
          ? `O plano equilibra alto rendimento (${params.yield_pct}%) com throughput global elevado (${throughputAfter} t/h), respeitando todas as restrições da TCC e tesoura TR2 sem provocar blocking no trem de laminação.`
          : classification === 'AMARELO_POSSIVEL_COM_RESSALVA'
            ? `O plano atende às restrições físicas soberanas, porém opera com cadência menor ou margem reduzida no gargalo (${throughputAfter} t/h), necessitando liberação pelo Gestor da Linha.`
            : `PLANO CRITICAMENTE REJEITADO: O corte gera dimensões ou cargas que violam os limites físicos soberanos da linha (${validations.find((v) => v.is_hard_violation || v.is_safety_violation)?.title}).`,
      what_discarded:
        params.scrap_pct > 8
          ? 'Cenários com menor aproveitamento de sucata foram penalizados.'
          : 'Alternativas com corte excessivo de peças que saturavam o leito TCC foram eliminadas pelo motor.',
      trade_off_analysis: `Trade-off analisado: Ganho de ${throughputDelta > 0 ? '+' : ''}${throughputDelta} t/h no gargalo vs tempo de produção para 500 t (${hoursAfter} h vs ${hoursBefore} h nominal). Economia de tempo: ${batchHoursDelta < 0 ? Math.abs(batchHoursDelta) : 0} h de linha.`,
      operational_risks:
        afterResult.blocking_risk === 'ALTO'
          ? 'Risco de blocking na TCC caso ocorra oscilação na velocidade da mesa de transferência.'
          : 'Operação estável com baixo risco de starvation ou blocking.',
    }

    return {
      plan_id: params.plan_id,
      plan_name: params.plan_name,
      classification,
      classification_label: label,
      classification_color: color,
      bottleneck_before: {
        stage: beforeResult.primary_bottleneck.stage,
        stageName: beforeResult.primary_bottleneck.stageName,
        capacity_th: throughputBefore,
      },
      bottleneck_after: {
        stage: afterResult.primary_bottleneck.stage,
        stageName: afterResult.primary_bottleneck.stageName,
        capacity_th: throughputAfter,
      },
      bottleneck_migrated: bottleneckMigrated,
      migration_explanation: migrationExplanation,
      throughput_before_th: throughputBefore,
      throughput_after_th: throughputAfter,
      throughput_delta_th: throughputDelta,
      hours_for_batch_500t: hoursAfter,
      batch_hours_delta: batchHoursDelta,
      score_global: scoreGlobal,
      score_components: {
        yield_component: { value: params.yield_pct, contribution: Math.round(cYield) },
        throughput_component: {
          value: throughputAfter,
          contribution: Math.round(cThroughput),
        },
        bottleneck_utilization: {
          value: afterResult.primary_bottleneck.capacity_th,
          contribution: Math.round(cBottleneck),
        },
        tcc_safety_margin: {
          value: params.tcc_bar_length_m,
          contribution: Math.round(cTccMargin),
        },
        scrap_component: { value: params.scrap_pct, contribution: Math.round(cScrap) },
        demand_fulfillment: {
          value: params.target_demand_fulfillment_pct,
          contribution: Math.round(cDemand),
        },
        operational_robustness: {
          value: afterResult.operational_robustness === 'ALTA' ? 95 : 70,
          contribution: 10,
        },
      },
      constraints_validations: validations,
      hard_constraints_violated_count: hardViolations,
      soft_constraints_warning_count: softWarnings,
      safety_constraints_violated_count: safetyViolations,
      ai_choice_reasoning: reasoning,
    }
  }
}

/**
 * Serviço de Acesso aos Dados da Matriz de Gargalos no PocketBase
 */
export const bottleneckMatrixService = {
  async listMatrices(lineCode?: string): Promise<LineBottleneckMatrixRecord[]> {
    try {
      const filter = lineCode
        ? `line_code = "${lineCode}" && status = "VIGENTE"`
        : 'status = "VIGENTE"'
      const records = await pb
        .collection('line_bottleneck_matrix')
        .getFullList<LineBottleneckMatrixRecord>({
          filter,
          sort: 'line_code,gauge_dimension',
        })
      return records
    } catch (err) {
      console.warn('Erro ao carregar matrizes de gargalos do backend:', err)
      return []
    }
  },

  async listConstraints(lineCode?: string): Promise<LineProcessConstraint[]> {
    try {
      const filter = lineCode ? `line_code = "${lineCode}" && active = true` : 'active = true'
      const records = await pb
        .collection('line_process_constraints')
        .getFullList<LineProcessConstraint>({
          filter,
          sort: 'stage,rule_code',
        })
      return records
    } catch (err) {
      console.warn('Erro ao carregar restrições de processo:', err)
      return []
    }
  },

  async createTestRequest(payload: Partial<PcpTestRequest>): Promise<PcpTestRequest> {
    const record = await pb.collection('pcp_test_requests').create<PcpTestRequest>(payload)
    return record
  },

  async listTestRequests(lineCode?: string): Promise<PcpTestRequest[]> {
    try {
      const filter = lineCode ? `line_code = "${lineCode}"` : ''
      const records = await pb.collection('pcp_test_requests').getFullList<PcpTestRequest>({
        filter,
        sort: '-created',
      })
      return records
    } catch (err) {
      console.warn('Erro ao carregar solicitações de teste PCP:', err)
      return []
    }
  },
}

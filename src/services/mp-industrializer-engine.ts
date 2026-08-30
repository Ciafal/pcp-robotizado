/**
 * Motor Operacional Especialista de Matéria-Prima do Industrializador — CIAFAL
 * Integração: SAP ECC (MB52 DP07/DP18/DP20), Programação L1, TMS/Trânsito, KS e Regras TB-002
 */

import {
  MPIndustrializerContract,
  MPIndustrializerInventoryItem,
  MPIndustrializerTransitItem,
  MPIndustrializerMatrixItem,
  MPIndustrializerDimensionSummary,
  MPIndustrializerScheduleRow,
  CalculationExplainPayload,
  IndustrializerStatus,
} from '@/types/mp-optimization'

export interface AllocationRecommendation {
  orderNumber: string
  productCode: string
  recommendedBillet: '130x130' | '150x150'
  reason: string
  savingsScarcityRisk: boolean
}

export class MPIndustrializerEngine {
  /**
   * 1. Cálculo do Semáforo Específico do Industrializador
   * Verde = cobertura suficiente
   * Amarelo = cobertura reduzida ou dependente de recebimento futuro
   * Laranja = recebimento precisa ocorrer antes de determinada programação
   * Vermelho = programação sem cobertura / FALTA DE MP
   * Cinza = integração pendente / desatualizada
   */
  public static calculateTrafficLight(params: {
    projectedBalance: number
    physicalBalance: number
    hasRupture: boolean
    hasPendingTransit: boolean
    isDataConnected: boolean
  }): IndustrializerStatus {
    if (!params.isDataConnected) return 'CINZA'
    if (params.hasRupture || params.projectedBalance < 0) return 'VERMELHO'
    if (params.physicalBalance < 0 && params.projectedBalance >= 0) return 'LARANJA'
    if (params.hasPendingTransit || params.physicalBalance < 150) return 'AMARELO'
    return 'VERDE'
  }

  /**
   * 2. Cálculo Teórico da Necessidade de MP vs Prática Histórica
   * MP necessária teórica = Produção Programada / Rendimento Metálico (ex: 6.000 / 0.93 = 6.451,61 t)
   */
  public static calculateTheoreticalNeed(
    programmedProductionTons: number,
    metallicYieldRate: number = 0.93,
  ): {
    theoreticalNeedTons: number
    historicalReferenceTons: number
    deltaExplanation: string
  } {
    const yieldSafe = metallicYieldRate > 0 ? metallicYieldRate : 0.93
    const theoreticalNeedTons = Number((programmedProductionTons / yieldSafe).toFixed(2))
    // Manual traz ~6.420 t para 6.000 t (fator prático ~1.07 vs 1/0.93 = 1.07527)
    const historicalReferenceTons = Number((programmedProductionTons * 1.07).toFixed(2))

    return {
      theoreticalNeedTons,
      historicalReferenceTons,
      deltaExplanation:
        'A fórmula contratual exata (6.000 / 0,93 = 6.451,61 t) reflete o rendimento metálico oficial de 93,0%. A referência histórica de 6.420 t (~1,07x) é exibida para validação comparativa do PCP sem alterar o rigor matemático.',
    }
  }

  /**
   * 3. Regra TB-002 de Compatibilidade Dimensional de Tarugos
   * Meta/produtividade > 18.0 t/h: aceita 130x130 ou 150x150
   * Meta/produtividade <= 18.0 t/h: exige exclusivamente 130x130
   */
  public static checkBilletCompatibility(
    productivityTh: number,
    productivityThresholdTh: number = 18.0,
  ): {
    canUse130: boolean
    canUse150: boolean
    ruleApplied: string
  } {
    const canUse150 = productivityTh > productivityThresholdTh
    return {
      canUse130: true, // 130x130 é universal na linha leve L1
      canUse150,
      ruleApplied: canUse150
        ? `Meta/hora (${productivityTh.toFixed(1)} t/h > ${productivityThresholdTh.toFixed(1)} t/h): Elegível a Tarugo 130x130 ou 150x150 (TB-002)`
        : `Meta/hora (${productivityTh.toFixed(1)} t/h ≤ ${productivityThresholdTh.toFixed(1)} t/h): Restrito a Tarugo 130x130 (TB-002)`,
    }
  }

  /**
   * 4. Alocação Inteligente e Preservação de MP Restritiva
   * Prioriza 150x150 em produtos que aceitam ambas as seções quando o saldo de 130x130 é crítico
   */
  public static recommendBilletAllocation(
    orders: Array<{
      orderNumber: string
      productCode: string
      productivityTh: number
      requiredTons: number
    }>,
    stock130: number,
    stock150: number,
  ): AllocationRecommendation[] {
    let running130 = stock130
    let running150 = stock150

    return orders.map((ord) => {
      const compat = this.checkBilletCompatibility(ord.productivityTh)

      if (!compat.canUse150) {
        running130 -= ord.requiredTons
        return {
          orderNumber: ord.orderNumber,
          productCode: ord.productCode,
          recommendedBillet: '130x130',
          reason: 'Restrição técnica mandatória: Meta ≤ 18,0 t/h (TB-002)',
          savingsScarcityRisk: false,
        }
      }

      // Se aceita 150x150 e há estoque de 150x150 disponível, preserva o 130x130 para os produtos que só aceitam 130
      if (running150 >= ord.requiredTons) {
        running150 -= ord.requiredTons
        return {
          orderNumber: ord.orderNumber,
          productCode: ord.productCode,
          recommendedBillet: '150x150',
          reason:
            'Alocação Inteligente: Produto aceita 150x150 (meta > 18 t/h). Preservando tarugos 130x130 para ordens restritivas.',
          savingsScarcityRisk: true,
        }
      } else {
        running130 -= ord.requiredTons
        return {
          orderNumber: ord.orderNumber,
          productCode: ord.productCode,
          recommendedBillet: '130x130',
          reason:
            'Produto aceita 150x150 mas estoque de 150x150 é insuficiente; alocando 130x130 disponível.',
          savingsScarcityRisk: false,
        }
      }
    })
  }

  /**
   * 5. Cálculos Originais do Manual da Rotina Arcelor / Industrializador
   * - Estoque Total = Estoque Disponível (DP18 + DP07 + DP20) + Descarga considerada disponível
   * - Necessidade semana atual = Consumo semana atual - Estoque Total
   * - Consumo Total = Σ consumos das semanas do horizonte
   * - Necessidade Total = Consumo Total - Estoque Total
   * - Saldo Projetado = Estoque Físico + Recebimentos/Trânsito - Consumo Projetado
   */
  public static calculateDimensionSummary(
    dimension: '130x130' | '150x150' | string,
    inv: Partial<MPIndustrializerInventoryItem>,
    transits: MPIndustrializerTransitItem[],
    consumptionWeek: number,
    consumptionTotal: number,
    monthlyTarget: number = 3000,
  ): MPIndustrializerDimensionSummary {
    const dp18 = inv.dp18_whole_tons || 0
    const dp07 = inv.dp07_cut_ready_tons || 0
    const dp20 = inv.dp20_ks_pointed_tons || 0
    const awaitingUnloading = inv.awaiting_unloading_tons || 0

    const totalPhysical = dp18 + dp07 + dp20 + awaitingUnloading
    const inTransit = transits
      .filter((t) => t.dimension_section === dimension && t.status === 'EM_TRANSITO')
      .reduce((sum, t) => sum + (t.quantity_tons || 0), 0)

    const received = inv.received_tons || dp18 + dp07 + dp20
    const toReceive = Math.max(0, monthlyTarget - received)
    const receivedPct = monthlyTarget > 0 ? (received / monthlyTarget) * 100 : 0

    const physicalPlusTransit = totalPhysical + inTransit
    const projectedBalance = physicalPlusTransit - consumptionTotal

    const needWeek = Math.max(0, consumptionWeek - totalPhysical)
    const needTotal = Math.max(0, consumptionTotal - totalPhysical)

    const status = this.calculateTrafficLight({
      projectedBalance,
      physicalBalance: totalPhysical - consumptionTotal,
      hasRupture: projectedBalance < 0,
      hasPendingTransit: inTransit > 0,
      isDataConnected: true,
    })

    return {
      dimension,
      supplied_monthly_target_tons: monthlyTarget,
      in_transit_tons: inTransit,
      received_tons: received,
      received_pct: Number(receivedPct.toFixed(1)),
      to_receive_tons: toReceive,
      dp18_tons: dp18,
      dp07_tons: dp07,
      dp20_tons: dp20,
      awaiting_unloading_tons: awaitingUnloading,
      total_physical_ciafal_tons: totalPhysical,
      programmed_consumption_week_tons: consumptionWeek,
      need_week_current_tons: needWeek,
      programmed_consumption_total_tons: consumptionTotal,
      physical_plus_transit_tons: physicalPlusTransit,
      projected_balance_tons: projectedBalance,
      accumulated_received_tons: received,
      total_need_tons: needTotal,
      status,
    }
  }

  /**
   * 6. Projeção Cronológica com Detecção Exata de Ruptura (Data, Turno, Ordem e Horas de Linha)
   */
  public static projectChronologicalSchedule(
    orders: Array<{
      date: string
      week: string
      order_number: string
      product_code: string
      product_name: string
      steel_grade: string
      meta_productivity_th: number
      programmed_quantity_tons: number
      billet_choice?: '130x130' | '150x150'
    }>,
    initialStock130: number,
    initialStock150: number,
    transits: MPIndustrializerTransitItem[],
    metallicYield: number = 0.93,
  ): {
    rows: MPIndustrializerScheduleRow[]
    firstRupture?: {
      date: string
      order_number: string
      product_name: string
      missing_dimension: '130x130' | '150x150'
      missing_tons: number
      deadline_date: string
      line_impact_hours: number
    }
    totalProgrammedTons: number
    totalRequiredMpTons: number
  } {
    let balance130 = initialStock130
    let balance150 = initialStock150
    let firstRuptureFound: any = null

    const rows: MPIndustrializerScheduleRow[] = []
    let totalProg = 0
    let totalReq = 0

    orders.forEach((ord) => {
      const yieldSafe = metallicYield > 0 ? metallicYield : 0.93
      const requiredMp = Number((ord.programmed_quantity_tons / yieldSafe).toFixed(2))
      totalProg += ord.programmed_quantity_tons
      totalReq += requiredMp

      const compat = this.checkBilletCompatibility(ord.meta_productivity_th)
      const allocatedBillet =
        ord.billet_choice || (compat.canUse150 && balance150 >= requiredMp ? '150x150' : '130x130')

      const balanceBefore = allocatedBillet === '130x130' ? balance130 : balance150

      // Considera trânsito com chegada antes ou na data da ordem
      const matchingTransit = transits
        .filter(
          (t) => t.dimension_section === allocatedBillet && t.expected_arrival_date <= ord.date,
        )
        .reduce((sum, t) => sum + (t.quantity_tons || 0), 0)

      const balanceAfter = balanceBefore - requiredMp

      if (allocatedBillet === '130x130') {
        balance130 = balanceAfter
      } else {
        balance150 = balanceAfter
      }

      const isRupture = balanceAfter < 0
      let operationalStatus: MPIndustrializerScheduleRow['operational_status'] = 'DISPONIVEL_AREA'
      let observation = 'Temos MP disponível na área'

      if (isRupture) {
        operationalStatus = 'FALTA_DE_MP'
        observation = `FALTA DE MP: Déficit de ${Math.abs(balanceAfter).toFixed(1)} t em ${allocatedBillet}.`
        if (!firstRuptureFound) {
          const hoursImpact = Number(
            (ord.programmed_quantity_tons / (ord.meta_productivity_th || 20)).toFixed(1),
          )
          firstRuptureFound = {
            date: ord.date,
            order_number: ord.order_number,
            product_name: ord.product_name,
            missing_dimension: allocatedBillet,
            missing_tons: Math.abs(balanceAfter),
            deadline_date: ord.date,
            line_impact_hours: hoursImpact,
          }
        }
      } else if (balanceBefore < requiredMp && balanceBefore + matchingTransit >= requiredMp) {
        operationalStatus = 'DEPENDENTE_TRANSITO'
        observation = 'Dependente de trânsito em rota'
      } else if (balanceAfter < 50) {
        operationalStatus = 'ATENCAO'
        observation = 'Estoque residual crítico'
      }

      rows.push({
        date: ord.date,
        week: ord.week,
        order_number: ord.order_number,
        product_code: ord.product_code,
        product_name: ord.product_name,
        steel_grade: ord.steel_grade,
        meta_productivity_th: ord.meta_productivity_th,
        programmed_quantity_tons: ord.programmed_quantity_tons,
        metallic_yield_applied: metallicYield,
        required_mp_tons: requiredMp,
        standard_billet: '130x130',
        authorized_alternative_billet: compat.canUse150 ? '150x150' : undefined,
        allocated_billet: allocatedBillet,
        balance_before_tons: Number(balanceBefore.toFixed(1)),
        consumption_tons: requiredMp,
        balance_after_tons: Number(balanceAfter.toFixed(1)),
        transit_available_date: matchingTransit,
        operational_status: operationalStatus,
        observation,
        is_rupture: isRupture,
        impacted_hours: isRupture
          ? Number((ord.programmed_quantity_tons / (ord.meta_productivity_th || 20)).toFixed(1))
          : undefined,
      })
    })

    return {
      rows,
      firstRupture: firstRuptureFound || undefined,
      totalProgrammedTons: Number(totalProg.toFixed(1)),
      totalRequiredMpTons: Number(totalReq.toFixed(1)),
    }
  }

  /**
   * 7. Explicabilidade da Célula ("Como foi calculado?")
   */
  public static explainCellCalculation(
    cellType:
      | 'NECESSIDADE_TOTAL'
      | 'SALDO_PROJETADO'
      | 'COMPATIBILIDADE_TB002'
      | 'RENDIMENTO_CONTRATUAL'
      | 'DATA_RUPTURA',
    params: Record<string, any>,
  ): CalculationExplainPayload {
    switch (cellType) {
      case 'RENDIMENTO_CONTRATUAL': {
        const prod = Number(params.programmedProduction || 6000)
        const yieldRate = Number(params.yieldRate || 0.93)
        const req = prod / yieldRate
        return {
          title: 'Explicabilidade: MP Requerida por Rendimento Metálico Contratual',
          formula: 'MP Necessária = Volume de Produção Programada / Rendimento Metálico (%)',
          variables: {
            'Produção Programada': `${prod.toFixed(1)} t`,
            'Rendimento Metálico Contratual': `${(yieldRate * 100).toFixed(1)}%`,
          },
          stepByStep: [
            `1. Identificação do volume de produto acabado programado na L1: ${prod.toFixed(1)} t`,
            `2. Aplicação do rendimento metálico contratual versionado: ${(yieldRate * 100).toFixed(1)}% (fonte: Contrato Arcelor 2026)`,
            `3. Cálculo determinístico: ${prod.toFixed(1)} / ${yieldRate} = ${req.toFixed(2)} t de tarugo bruto`,
            `4. Comparativo de homologação: A referência prática histórica de ~6.420 t aproxima-se dos ${req.toFixed(2)} t matemáticos.`,
          ],
          result: req.toFixed(2),
          resultFormatted: `${req.toFixed(2)} t`,
          unit: 't',
          regulatoryStandardRef: 'Contrato de Industrialização CIAFAL-Arcelor & TB-002',
          excelLegacyRef: 'Rotina de Acompanhamento de Tarugos Arcelor - PCP L1',
        }
      }

      case 'COMPATIBILIDADE_TB002': {
        const meta = Number(params.metaTh || 22.0)
        const elegivel150 = meta > 18.0
        return {
          title: 'Explicabilidade: Compatibilidade Dimensional TB-002 (130x130 vs 150x150)',
          formula:
            'Se Meta Produtividade > 18,0 t/h → Aceita 130x130 ou 150x150; Se ≤ 18,0 t/h → Apenas 130x130',
          variables: {
            'Meta Produtividade do Produto': `${meta.toFixed(1)} t/h`,
            'Limite Parametrizado (TB-002)': '18,0 t/h',
          },
          stepByStep: [
            `1. Leitura da velocidade e produtividade do produto na Linha Leve L1: ${meta.toFixed(1)} t/h`,
            `2. Avaliação da regra técnica TB-002: ${meta.toFixed(1)} t/h ${elegivel150 ? '> 18,0 t/h' : '≤ 18,0 t/h'}`,
            `3. Resultado: ${elegivel150 ? 'ELEGÍVEL para tarugos 130x130 e 150x150' : 'RESTRITO exclusivamente para tarugos 130x130'}`,
            `4. Diretriz de IA: Se o produto aceita 150x150, recomenda-se alocar 150x150 para preservar o 130x130 para os produtos restritivos.`,
          ],
          result: elegivel150 ? '130x130 ou 150x150' : '130x130',
          resultFormatted: elegivel150 ? 'Compatível 130 e 150' : 'Restrito 130',
          unit: 'seção',
          regulatoryStandardRef: 'Norma Técnica Operacional TB-002 Rev.05',
        }
      }

      case 'SALDO_PROJETADO': {
        const fis = Number(params.physicalStock || 500)
        const trn = Number(params.inTransit || 150)
        const con = Number(params.totalConsumption || 400)
        const sal = fis + trn - con
        return {
          title: 'Explicabilidade: Saldo Projetado de MP do Industrializador',
          formula: 'Saldo Projetado = Estoque Físico CIAFAL + MP em Trânsito − Consumo Programado',
          variables: {
            'Estoque Físico CIAFAL (DP18+DP07+DP20+Descarga)': `${fis.toFixed(1)} t`,
            'MP em Trânsito': `+${trn.toFixed(1)} t`,
            'Consumo Total Programado L1': `-${con.toFixed(1)} t`,
          },
          stepByStep: [
            `1. Somatória da MP física presente no Centro CFPL: ${fis.toFixed(1)} t`,
            `2. Adição da MP em trânsito com previsão confirmada: +${trn.toFixed(1)} t`,
            `3. Dedução do consumo sequencial das ordens L1: -${con.toFixed(1)} t`,
            `4. Saldo Projetado Resultante: ${sal.toFixed(1)} t`,
          ],
          result: sal.toFixed(1),
          resultFormatted: `${sal.toFixed(1)} t`,
          unit: 't',
          regulatoryStandardRef: 'Procedimento de Controle de Matéria-Prima de Terceiros',
        }
      }

      case 'NECESSIDADE_TOTAL': {
        const con = Number(params.totalConsumption || 600)
        const fis = Number(params.physicalStock || 400)
        const nec = Math.max(0, con - fis)
        return {
          title: 'Explicabilidade: Necessidade Total de Envio pelo Industrializador',
          formula: 'Necessidade Total = Consumo Total Programado − Estoque Físico CIAFAL',
          variables: {
            'Consumo Total do Horizonte': `${con.toFixed(1)} t`,
            'Estoque Físico na Planta': `${fis.toFixed(1)} t`,
          },
          stepByStep: [
            `1. Demanda total calculada para a carteira de ordens: ${con.toFixed(1)} t`,
            `2. MP física disponível no pátio e corte: ${fis.toFixed(1)} t`,
            `3. Necessidade líquida de envio a comunicar ao cliente: ${nec.toFixed(1)} t`,
          ],
          result: nec.toFixed(1),
          resultFormatted: `${nec.toFixed(1)} t`,
          unit: 't',
        }
      }

      case 'DATA_RUPTURA': {
        const dataRupt = params.ruptureDate || 'Não há risco'
        const ord = params.orderNumber || 'N/A'
        const tons = Number(params.missingTons || 0)
        return {
          title: 'Explicabilidade: Determinação da Primeira Data e Ordem de Ruptura',
          formula: 'Momento exato em que Saldo Anterior < Consumo da Próxima Ordem Programada',
          variables: {
            'Data Prevista da Ruptura': dataRupt,
            'Primeira Ordem Afetada': ord,
            'Volume Faltante': `${tons.toFixed(1)} t`,
          },
          stepByStep: [
            '1. O motor cronológico consome ordem a ordem segundo a sequência aprovada da L1.',
            '2. Ao cruzar o zero, a ordem exata é capturada imediatamente pelo algoritmo.',
            `3. Disparo automático de status "FALTA DE MP" e alerta de parada de linha.`,
          ],
          result: dataRupt,
          resultFormatted: dataRupt,
          unit: 'data',
        }
      }
    }
  }
}

export default MPIndustrializerEngine

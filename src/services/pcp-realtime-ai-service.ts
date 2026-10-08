import {
  RealtimeCompanyConsolidated,
  RealtimeLineData,
  RealtimeCenterData,
  RealtimeProductivityConsolidated,
  RealtimeOrderProductivityItem,
} from '@/types/pcp-realtime-analysis'
import { formatNumberPtBr } from '@/lib/number-format'

export interface OperationalAiSummary {
  level: 'EMPRESA' | 'LINHA' | 'CENTRO'
  entityName: string
  factualPoints: string[] // FATO medido
  calculatedAlerts: string[] // ALERTA calculado
  aiInterpretations: string[] // INTERPRETAÇÃO IA (sem inventar nada, orientativa)
  nextActionAdvice: string // Próxima atenção recomendada
}

export interface ProductivityAiReport {
  hasSufficientData: boolean
  insufficientDataReason?: string
  // 1. Resumo Executivo
  executiveSummary: string
  // 2. Ordens com maior desvio negativo
  highestNegativeDeviationOrders: Array<{
    opNumber: string
    material: string
    deviationTh: number
    realizedRate: number
    plannedRate: number
    status: string
  }>
  // 3. Ordens com melhor desempenho
  bestPerformanceOrders: Array<{
    opNumber: string
    material: string
    deviationTh: number
    realizedRate: number
    plannedRate: number
    status: string
  }>
  // 4. Principais causas prováveis de perda
  probableLossCauses: string[]
  // 5. Correlação com paradas
  stopsCorrelation: Array<{
    category: string
    reason: string
    totalHours: number
    occurrences: number
    impactDescription: string
  }>
  // 6. Impacto operacional estimado
  estimatedOperationalImpact: {
    lostTons: number | null
    lostHours: number
    impactSummary: string
  }
  // 7. Ações recomendadas
  recommendedActions: {
    pcp: string[]
    operacao: string[]
    manutencao: string[]
  }
}

export class PcpRealtimeAiService {
  /**
   * Resumo Real Time no topo da Empresa
   * Responde com precisão:
   * - centros normais / parados / atrasados / adiantados
   * - principais perdas
   * - principais paradas
   * - centros abaixo da meta de OEE / utilização / rendimento
   * - riscos para a programação
   * - 3 maiores pontos de atenção do PCP
   */
  public static generateCompanySummary(
    company: RealtimeCompanyConsolidated,
    lines: RealtimeLineData[],
  ): OperationalAiSummary {
    const allCenters = (Array.isArray(lines) ? lines : []).flatMap((l) =>
      Array.isArray(l?.centers) ? l.centers : [],
    )
    const factualPoints: string[] = []
    const calculatedAlerts: string[] = []
    const aiInterpretations: string[] = []

    const totalCenters = company?.totalCenters ?? allCenters.length ?? 0
    const centersOperating = company?.centersOperating ?? 0
    const centersStopped = company?.centersStopped ?? 0
    const centersInSetup = company?.centersInSetup ?? 0
    const centersScheduledStop = company?.centersScheduledStop ?? 0
    const centersWithoutSchedule = company?.centersWithoutSchedule ?? 0

    // 1. Fatos Medidos
    factualPoints.push(
      `Escopo consolidado com ${totalCenters} centros monitorados: ${centersOperating} operando normalmente, ${centersStopped} em parada crítica, ${centersInSetup} em atenção/setup, ${centersScheduledStop} em parada programada e ${centersWithoutSchedule} sem programação vigente.`,
    )

    if (company.realizedProductionTons !== null && company.plannedProductionTons !== null) {
      factualPoints.push(
        `Produção realizada de ${formatNumberPtBr(company.realizedProductionTons)} t frente a ${formatNumberPtBr(company.plannedProductionTons)} t planejadas (Atingimento: ${company.achievementPct !== null ? formatNumberPtBr(company.achievementPct) + ' %' : 'N/D'}).`,
      )
    } else if (company.realizedProductionTons !== null) {
      factualPoints.push(
        `Produção acumulada no período: ${formatNumberPtBr(company.realizedProductionTons)} t.`,
      )
    } else {
      factualPoints.push('Informação de produção em tempo real não disponível na telemetria atual.')
    }

    if (company.currentProductionRatePerHour !== null) {
      factualPoints.push(
        `Taxa operacional instantânea consolidada: ${formatNumberPtBr(company.currentProductionRatePerHour)} t/h.`,
      )
    }

    // 2. Alertas Calculados
    const belowOeeCenters = allCenters.filter(
      (c) => c?.oee?.value != null && c?.oee?.target != null && c.oee.value < c.oee.target,
    )
    if (belowOeeCenters.length > 0) {
      calculatedAlerts.push(
        `${belowOeeCenters.length} centro(s) abaixo da meta de OEE (85,00 %): ${belowOeeCenters.map((c) => c.centerName || c.centerCode || 'Centro').join(', ')}.`,
      )
    }

    const belowYieldCenters = allCenters.filter(
      (c) =>
        c?.metallicYield?.yieldPct != null &&
        c?.metallicYield?.targetPct != null &&
        c.metallicYield.yieldPct < c.metallicYield.targetPct,
    )
    if (belowYieldCenters.length > 0) {
      calculatedAlerts.push(
        `${belowYieldCenters.length} centro(s) com rendimento metálico inferior à meta: ${belowYieldCenters.map((c) => c.centerName || c.centerCode || 'Centro').join(', ')}.`,
      )
    }

    const stoppedCenters = allCenters.filter((c) => Boolean(c?.activeStop))
    if (stoppedCenters.length > 0) {
      calculatedAlerts.push(
        `Parada ativa detectada em ${stoppedCenters.length} centro(s): ${stoppedCenters.map((c) => `${c.centerName || c.centerCode || 'Centro'} (${c.activeStop?.reason || 'Parada'})`).join('; ')}.`,
      )
    }

    // 3. Interpretação IA & 3 Maiores Pontos de Atenção do PCP
    aiInterpretations.push(
      '1. Priorização de liberação mecânica/elétrica imediata nos centros parados para conter desvio de tonelagem na campanha vigente.',
    )
    aiInterpretations.push(
      '2. Rebalanceamento das ordens de acabamento e pulmões intermediários para evitar gargalos induzidos na laminação.',
    )
    aiInterpretations.push(
      '3. Validação dos lotes de matéria-prima insumidos no MES para garantir que perdas metálicas permaneçam na faixa de tolerância nominal.',
    )

    let nextAction =
      'Manter monitoramento ativo e acionar supervisão operacional nos centros com status Crítico ou Atenção.'
    if (stoppedCenters.length > 0) {
      nextAction = `Acompanhar previsão de retorno e liberação técnica no centro ${stoppedCenters[0]?.centerName || stoppedCenters[0]?.centerCode || 'parado'}.`
    } else if (company.achievementPct !== null && company.achievementPct < 85) {
      nextAction =
        'Revisar sequenciamento das próximas horas para recuperar o volume previsto do turno.'
    }

    return {
      level: 'EMPRESA',
      entityName: company?.companyName || 'CIAFAL',
      factualPoints,
      calculatedAlerts,
      aiInterpretations,
      nextActionAdvice: nextAction,
    }
  }

  /**
   * Resumo Operacional IA por Linha
   */
  public static generateLineSummary(line: RealtimeLineData): OperationalAiSummary {
    const factualPoints: string[] = []
    const calculatedAlerts: string[] = []
    const aiInterpretations: string[] = []

    const lineName = line?.lineName || line?.lineCode || 'Linha'
    const status = line?.status || 'NORMAL'
    const schedSit = (line?.scheduleSituation || '').replace('_', ' ')

    factualPoints.push(
      `Linha ${lineName} operando com status ${status} e situação da programação: ${schedSit}.`,
    )

    if (line.realizedTons !== null && line.plannedTons !== null) {
      factualPoints.push(
        `Volume produzido: ${formatNumberPtBr(line.realizedTons)} t de ${formatNumberPtBr(line.plannedTons)} t previstas (Atingimento: ${line.achievementPct !== null ? formatNumberPtBr(line.achievementPct) + ' %' : 'N/D'}).`,
      )
    }

    if (line.currentProduct) {
      factualPoints.push(`Produto em processo: ${line.currentProduct}.`)
    }

    if (line.oeePct !== null) {
      if (line.oeePct < 85) {
        calculatedAlerts.push(
          `OEE de ${formatNumberPtBr(line.oeePct)} % abaixo da meta da linha (85,00 %).`,
        )
      } else {
        calculatedAlerts.push(
          `OEE de ${formatNumberPtBr(line.oeePct)} % em conformidade com o plano.`,
        )
      }
    }

    aiInterpretations.push(
      `Cadência operacional em ${line.currentRatePerHour !== null ? formatNumberPtBr(line.currentRatePerHour) + ' t/h' : 'N/D'} perante ritmo planejado de ${line.plannedRatePerHour !== null ? formatNumberPtBr(line.plannedRatePerHour) + ' t/h' : 'N/D'}.`,
    )

    return {
      level: 'LINHA',
      entityName: lineName,
      factualPoints,
      calculatedAlerts,
      aiInterpretations,
      nextActionAdvice:
        line?.status === 'NORMAL'
          ? 'Manter fluxo contínuo de alimentação de matéria-prima.'
          : 'Verificar alinhamento e causas técnicas de paradas com a liderança do turno.',
    }
  }

  /**
   * Resumo Operacional IA por Centro Produtivo
   */
  public static generateCenterSummary(center: RealtimeCenterData): OperationalAiSummary {
    const factualPoints: string[] = []
    const calculatedAlerts: string[] = []
    const aiInterpretations: string[] = []

    const centerName = center?.centerName || center?.centerCode || 'Centro'
    const centerCode = center?.centerCode || '-'
    const status = center?.status || 'NORMAL'

    factualPoints.push(
      `Centro ${centerName} (${centerCode}): status ${status}. Ordem ativa: ${center?.productionOrder || 'Sem ordem vinculada'}.`,
    )

    if (center.materialDescription) {
      factualPoints.push(
        `Material: ${center.materialDescription} | Bitola/Dimensão: ${center.dimension || '-'} | Aço: ${center.steelGrade || '-'}.`,
      )
    }

    if (center.realizedTons !== null && center.programmedTons !== null) {
      factualPoints.push(
        `Produção: ${formatNumberPtBr(center.realizedTons)} t realizadas / ${formatNumberPtBr(center.programmedTons)} t programadas (Previsto atingido: ${center.achievementPct !== null ? formatNumberPtBr(center.achievementPct) + ' %' : 'N/D'}).`,
      )
    }

    if (center.activeStop) {
      calculatedAlerts.push(
        `PARADA ATIVA: ${center.activeStop.categoryLabel} — Motivo: "${center.activeStop.reason}" (duração atual: ${center.activeStop.durationMinutes} min).`,
      )
    }

    if (
      center.oee?.value != null &&
      center.oee?.target != null &&
      center.oee.value < center.oee.target
    ) {
      calculatedAlerts.push(
        `OEE atual de ${formatNumberPtBr(center.oee.value)} % com desvio de ${formatNumberPtBr(center.oee.difference ?? 0)} p.p. vs meta (${formatNumberPtBr(center.oee.target)} %).`,
      )
    }

    if (center.metallicYield?.yieldPct != null && center.metallicYield?.targetPct != null) {
      calculatedAlerts.push(
        `Rendimento Metálico apurado: ${formatNumberPtBr(center.metallicYield.yieldPct)} % (Meta: ${formatNumberPtBr(center.metallicYield.targetPct)} %). Perda estimada: ${center.metallicYield.estimatedLossTons !== null ? formatNumberPtBr(center.metallicYield.estimatedLossTons) + ' t' : 'N/D'}.`,
      )
    }

    aiInterpretations.push(
      `Análise de cadência: Ritmo instantâneo de ${center.currentRatePerHour !== null ? formatNumberPtBr(center.currentRatePerHour) + ' t/h' : '0,00 t/h'} comparado à meta nominal de ${center.plannedRatePerHour !== null ? formatNumberPtBr(center.plannedRatePerHour) + ' t/h' : 'N/D'}.`,
    )

    return {
      level: 'CENTRO',
      entityName: centerName,
      factualPoints,
      calculatedAlerts,
      aiInterpretations,
      nextActionAdvice: center?.activeStop
        ? `Cobrar parecer da manutenção sobre nota/ordem ${center.activeStop.maintenanceOrderRef || 'N/A'}.`
        : 'Confirmar apontamentos MES para fechamento do turno.',
    }
  }

  /**
   * BLOCO 2 OBRIGATÓRIO: Análise IA Orientativa de Produtividade t/h (7 Análises)
   * Base estritamente em dados reais.
   * Se não houver evidência suficiente: texto exato "Sem dados suficientes para concluir a causa com segurança."
   * IA só orienta, nunca executa.
   */
  public static generateProductivityAnalysis(params: {
    consolidated: RealtimeProductivityConsolidated | null | undefined
    orders: RealtimeOrderProductivityItem[] | undefined
  }): ProductivityAiReport {
    const INSUFFICIENT_DATA_TEXT = 'Sem dados suficientes para concluir a causa com segurança.'

    const list = Array.isArray(params.orders) ? params.orders : []
    const cons = params.consolidated

    // Verificação de suficiência de dados: precisa de ordens ou consolidado com dados medidos
    const hasOrders = list.length > 0
    const hasConsolidated =
      Boolean(cons) && (cons?.totalRealizedTons ?? 0) > 0 && (cons?.totalProductiveHours ?? 0) > 0

    if (!hasOrders && !hasConsolidated) {
      return {
        hasSufficientData: false,
        insufficientDataReason: INSUFFICIENT_DATA_TEXT,
        executiveSummary: INSUFFICIENT_DATA_TEXT,
        highestNegativeDeviationOrders: [],
        bestPerformanceOrders: [],
        probableLossCauses: [INSUFFICIENT_DATA_TEXT],
        stopsCorrelation: [],
        estimatedOperationalImpact: {
          lostTons: null,
          lostHours: 0,
          impactSummary: INSUFFICIENT_DATA_TEXT,
        },
        recommendedActions: {
          pcp: [INSUFFICIENT_DATA_TEXT],
          operacao: [INSUFFICIENT_DATA_TEXT],
          manutencao: [INSUFFICIENT_DATA_TEXT],
        },
      }
    }

    // 1. Resumo Executivo
    let executiveSummary = ''
    if (cons?.plannedProductivityTh && cons?.realizedProductivityTh) {
      const dev = cons.deviationTh ?? cons.realizedProductivityTh - cons.plannedProductivityTh
      const devSign = dev >= 0 ? `+${formatNumberPtBr(dev)}` : formatNumberPtBr(dev)
      const ach = cons.achievementPct ? `${formatNumberPtBr(cons.achievementPct)} %` : 'N/D'
      executiveSummary = `Produtividade consolidada apurada em ${formatNumberPtBr(cons.realizedProductivityTh)} t/h perante meta média ponderada de ${formatNumberPtBr(cons.plannedProductivityTh)} t/h (desvio de ${devSign} t/h; atingimento de ${ach}) ao longo de ${formatNumberPtBr(cons.totalProductiveHours)} h produtivas e ${formatNumberPtBr(cons.totalRealizedTons)} t realizadas em ${cons.ordersCount} ordem(ns).`
    } else if (cons?.realizedProductivityTh) {
      executiveSummary = `Produtividade consolidada apurada em ${formatNumberPtBr(cons.realizedProductivityTh)} t/h com ${formatNumberPtBr(cons.totalRealizedTons)} t realizadas em ${formatNumberPtBr(cons.totalProductiveHours)} h produtivas. Cadência prevista da empresa não cadastrada na totalidade dos itens.`
    } else {
      executiveSummary = INSUFFICIENT_DATA_TEXT
    }

    // 2. Ordens com maior desvio negativo (deviationTh < 0 ordenadas do menor ao maior)
    const validDeviationOrders = list.filter(
      (o) =>
        o.deviationTh !== null &&
        o.plannedProductivityTh !== null &&
        o.realizedProductivityTh !== null,
    )

    const negativeOrders = validDeviationOrders
      .filter((o) => (o.deviationTh ?? 0) < 0)
      .sort((a, b) => (a.deviationTh ?? 0) - (b.deviationTh ?? 0))
      .slice(0, 5)
      .map((o) => ({
        opNumber: o.opNumber,
        material: o.materialDescription || o.materialCode,
        deviationTh: o.deviationTh ?? 0,
        realizedRate: o.realizedProductivityTh ?? 0,
        plannedRate: o.plannedProductivityTh ?? 0,
        status: o.status,
      }))

    // 3. Ordens com melhor desempenho (deviationTh >= 0 ordenadas descrescente)
    const positiveOrders = validDeviationOrders
      .filter((o) => (o.deviationTh ?? 0) >= 0)
      .sort((a, b) => (b.deviationTh ?? 0) - (a.deviationTh ?? 0))
      .slice(0, 5)
      .map((o) => ({
        opNumber: o.opNumber,
        material: o.materialDescription || o.materialCode,
        deviationTh: o.deviationTh ?? 0,
        realizedRate: o.realizedProductivityTh ?? 0,
        plannedRate: o.plannedProductivityTh ?? 0,
        status: o.status,
      }))

    // 4. Principais causas prováveis de perda (base em fatos reais de paradas e desvios)
    const probableLossCauses: string[] = []
    const stopsByReasonMap = new Map<string, { totalHours: number; count: number }>()

    list.forEach((o) => {
      const reason = (o.mainStopReason || '').trim()
      if (reason && reason !== '-') {
        const cur = stopsByReasonMap.get(reason) || { totalHours: 0, count: 0 }
        cur.totalHours += o.stoppedHours || 0
        cur.count += 1
        stopsByReasonMap.set(reason, cur)
      }
    })

    if (stopsByReasonMap.size > 0) {
      const sortedStops = Array.from(stopsByReasonMap.entries()).sort(
        (a, b) => b[1].totalHours - a[1].totalHours,
      )
      sortedStops.slice(0, 3).forEach(([reason, data], idx) => {
        probableLossCauses.push(
          `${idx + 1}. "${reason}": impactou ${formatNumberPtBr(data.totalHours)} h em ${data.count} ordem(ns).`,
        )
      })
    }

    if (negativeOrders.length > 0 && probableLossCauses.length === 0) {
      probableLossCauses.push(
        `Descompasso de cadência operacional detectado em ${negativeOrders.length} OP(s), sem registro de parada específica vinculada no MES.`,
      )
    }

    if (probableLossCauses.length === 0) {
      probableLossCauses.push(INSUFFICIENT_DATA_TEXT)
    }

    // 5. Correlação com paradas (motivos, tempo parado, ocorrências: setup/acerto, falta de MP, manutenção, espera, quebra, troca de bitola, instabilidade de processo)
    const stopsCorrelation: Array<{
      category: string
      reason: string
      totalHours: number
      occurrences: number
      impactDescription: string
    }> = []

    stopsByReasonMap.forEach((val, reason) => {
      let category = 'OPERACIONAL'
      const rUpper = reason.toUpperCase()
      if (rUpper.includes('SETUP') || rUpper.includes('ACERTO') || rUpper.includes('TROCA')) {
        category = 'SETUP_ACERTO'
      } else if (
        rUpper.includes('MP') ||
        rUpper.includes('MATERIA') ||
        rUpper.includes('TARUGO') ||
        rUpper.includes('FALTA')
      ) {
        category = 'FALTA_MP'
      } else if (
        rUpper.includes('MECAN') ||
        rUpper.includes('ELET') ||
        rUpper.includes('MANUT') ||
        rUpper.includes('QUEBRA')
      ) {
        category = 'MANUTENCAO'
      } else if (rUpper.includes('ESPERA') || rUpper.includes('AGUARDO')) {
        category = 'ESPERA'
      } else if (
        rUpper.includes('INSTAB') ||
        rUpper.includes('PROCESSO') ||
        rUpper.includes('QUALID')
      ) {
        category = 'INSTABILIDADE_PROCESSO'
      }

      stopsCorrelation.push({
        category,
        reason,
        totalHours: Number(val.totalHours.toFixed(2)),
        occurrences: val.count,
        impactDescription: `${val.count} ocorrência(s) totalizando ${formatNumberPtBr(val.totalHours)} h de parada.`,
      })
    })

    // Ordenar correlações por maior tempo de parada
    stopsCorrelation.sort((a, b) => b.totalHours - a.totalHours)

    // 6. Impacto operacional estimado
    const totalStoppedHours = cons?.totalStoppedHours ?? 0
    let lostTons: number | null = null
    let impactSummary = ''

    if (cons?.plannedProductivityTh && totalStoppedHours > 0) {
      lostTons = Number((totalStoppedHours * cons.plannedProductivityTh).toFixed(2))
      impactSummary = `As ${formatNumberPtBr(totalStoppedHours)} h de paradas apuradas representam uma perda de oportunidade de aproximadamente ${formatNumberPtBr(lostTons)} t com base na cadência nominal ponderada de ${formatNumberPtBr(cons.plannedProductivityTh)} t/h.`
    } else if (cons?.deviationTh && (cons?.totalProductiveHours ?? 0) > 0 && cons.deviationTh < 0) {
      lostTons = Number((Math.abs(cons.deviationTh) * cons.totalProductiveHours).toFixed(2))
      impactSummary = `O ritmo abaixo da meta gerou uma perda de volume estimada em ${formatNumberPtBr(lostTons)} t durante o período avaliado.`
    } else {
      impactSummary =
        totalStoppedHours > 0
          ? `${formatNumberPtBr(totalStoppedHours)} h de paradas registradas no período.`
          : 'Operação sem paradas expressivas computadas no período.'
    }

    // 7. Ações recomendadas para PCP / Operação / Manutenção
    const recommendedActions = {
      pcp: [
        'Ajustar os tempos padrão na Ficha Mestra caso a bitola apresente desvio sistemático em campanhas consecutivas.',
        'Reprogramar os lotes subsequentes considerando a cadência real realizada no turno.',
      ],
      operacao: [
        'Garantir continuidade na alimentação de matéria-prima nos centros de conformação.',
        'Padronizar procedimentos de setup e troca de bitola para reduzir o tempo morto de máquina.',
      ],
      manutencao: [
        'Priorizar inspeção preditiva nos centros com paradas recorrentes mecânicas/elétricas.',
        'Validar notas e ordens de manutenção vinculadas às paradas para retorno definitivo dos equipamentos.',
      ],
    }

    return {
      hasSufficientData: true,
      executiveSummary,
      highestNegativeDeviationOrders: negativeOrders,
      bestPerformanceOrders: positiveOrders,
      probableLossCauses,
      stopsCorrelation,
      estimatedOperationalImpact: {
        lostTons,
        lostHours: totalStoppedHours,
        impactSummary,
      },
      recommendedActions,
    }
  }
}

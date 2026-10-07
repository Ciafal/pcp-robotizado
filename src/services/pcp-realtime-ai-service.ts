import {
  RealtimeCompanyConsolidated,
  RealtimeLineData,
  RealtimeCenterData,
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
    const allCenters = (lines || []).flatMap((l) => l?.centers || [])
    const factualPoints: string[] = []
    const calculatedAlerts: string[] = []
    const aiInterpretations: string[] = []

    // 1. Fatos Medidos
    factualPoints.push(
      `Escopo consolidado com ${company.totalCenters} centros monitorados: ${company.centersOperating} operando normalmente, ${company.centersStopped} em parada crítica, ${company.centersInSetup} em atenção/setup, ${company.centersScheduledStop} em parada programada e ${company.centersWithoutSchedule} sem programação vigente.`,
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
      entityName: company.companyName,
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

    factualPoints.push(
      `Linha ${line.lineName} operando com status ${line.status} e situação da programação: ${line.scheduleSituation.replace('_', ' ')}.`,
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
      entityName: line.lineName,
      factualPoints,
      calculatedAlerts,
      aiInterpretations,
      nextActionAdvice:
        line.status === 'NORMAL'
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

    factualPoints.push(
      `Centro ${center.centerName} (${center.centerCode}): status ${center.status}. Ordem ativa: ${center.productionOrder || 'Sem ordem vinculada'}.`,
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
      entityName: center.centerName,
      factualPoints,
      calculatedAlerts,
      aiInterpretations,
      nextActionAdvice: center.activeStop
        ? `Cobrar parecer da manutenção sobre nota/ordem ${center.activeStop.maintenanceOrderRef || 'N/A'}.`
        : 'Confirmar apontamentos MES para fechamento do turno.',
    }
  }
}

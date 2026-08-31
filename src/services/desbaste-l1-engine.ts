/**
 * MOTOR DE CONTROLE DE VIDA ÚTIL DO DESBASTE L1 CIAFAL
 * Regras:
 * - Valor inicial de referência: 12.000 t produzidas
 * - Tolerância operacional: ±1.000 t (11.000 t a 13.000 t)
 * - Integração: PCM e Oficina de Cilindros
 * - Duração padrão da parada: ~8 h (parada normal) / ~10 h (evento trimestral com inspeção profunda)
 * - IA avalia antecipar/postergar com base em paradas programadas de fim de semana, mão de obra e produtividade.
 */

export interface DesbasteL1Status {
  lastChangeDate: string
  accumulatedProductionTons: number
  targetLifespanTons: number
  toleranceMinTons: number
  toleranceMaxTons: number
  realizedLifespanPreviousCycleTons: number
  estimatedNextChangeDate: string
  currentRollPairCode: string
  rollShopStockPairAvailable: boolean
  scheduledMaintenanceStopAvailableDate?: string
  scheduledMaintenanceDurationHours?: number
}

export interface DesbasteRecommendation {
  accumulatedProductionTons: number
  targetLifespanTons: number
  percentageUsed: number
  remainingTonsUntilTarget: number
  status: 'NORMAL' | 'ATENCAO_TROCA_PROXIMA' | 'LIMITE_ATINGIDO' | 'CRITICO_EXCEDIDO'
  shouldScheduleChange: boolean
  isChangeUrgentBlocking: boolean
  recommendedStopDurationHours: number
  recommendedDate: string
  avoidWeekend: boolean
  aiRationale: string
  synergyWithMaintenance: boolean
}

export class DesbasteL1Engine {
  public static readonly DEFAULT_TARGET_TONS = 12000
  public static readonly DEFAULT_TOLERANCE_TONS = 1000

  public static evaluate(status: DesbasteL1Status): DesbasteRecommendation {
    const target = status.targetLifespanTons || this.DEFAULT_TARGET_TONS
    const minTol = status.toleranceMinTons || target - this.DEFAULT_TOLERANCE_TONS
    const maxTol = status.toleranceMaxTons || target + this.DEFAULT_TOLERANCE_TONS

    const percentageUsed = (status.accumulatedProductionTons / target) * 100
    const remaining = target - status.accumulatedProductionTons

    let desbasteStatus: DesbasteRecommendation['status'] = 'NORMAL'
    let shouldScheduleChange = false
    let isChangeUrgentBlocking = false
    let recommendedStopDurationHours = 8
    let synergyWithMaintenance = false

    if (status.accumulatedProductionTons >= maxTol) {
      desbasteStatus = 'CRITICO_EXCEDIDO'
      shouldScheduleChange = true
      isChangeUrgentBlocking = true
    } else if (status.accumulatedProductionTons >= target) {
      desbasteStatus = 'LIMITE_ATINGIDO'
      shouldScheduleChange = true
      isChangeUrgentBlocking = false
    } else if (status.accumulatedProductionTons >= minTol) {
      desbasteStatus = 'ATENCAO_TROCA_PROXIMA'
      shouldScheduleChange = true
      isChangeUrgentBlocking = false
    } else {
      desbasteStatus = 'NORMAL'
    }

    // Avaliação de Sinergia com Manutenção do PCM
    let recommendedDate = status.estimatedNextChangeDate
    if (status.scheduledMaintenanceStopAvailableDate) {
      synergyWithMaintenance = true
      recommendedDate = status.scheduledMaintenanceStopAvailableDate
      if (
        status.scheduledMaintenanceDurationHours &&
        status.scheduledMaintenanceDurationHours >= 10
      ) {
        recommendedStopDurationHours = 10 // Evento trimestral
      }
    }

    let aiRationale = ''
    switch (desbasteStatus) {
      case 'CRITICO_EXCEDIDO':
        aiRationale = `BLOQUEIO: Desbaste L1 acumulou ${status.accumulatedProductionTons.toLocaleString('pt-BR')} t, ultrapassando a tolerância máxima técnica (${maxTol.toLocaleString('pt-BR')} t). A Oficina de Cilindros e o PCM exigem parada imediata de ${recommendedStopDurationHours}h para substituição dos cilindros de desbaste para prevenir trincas e quebra de mancais.`
        break
      case 'LIMITE_ATINGIDO':
        aiRationale = `Desbaste L1 atingiu 100% da vida útil (${status.accumulatedProductionTons.toLocaleString('pt-BR')} t / ${target.toLocaleString('pt-BR')} t). Troca recomendada no próximo intervalo de parada de 8h útil, evitando turnos de fim de semana para garantir equipe completa de montagem.`
        break
      case 'ATENCAO_TROCA_PROXIMA':
        aiRationale = `Desbaste L1 entrou na faixa de tolerância (${status.accumulatedProductionTons.toLocaleString('pt-BR')} t acumuladas). Aproveitar a parada preventiva programada do PCM em ${recommendedDate} (${recommendedStopDurationHours}h) para executar a troca em conjunto, sem perda adicional de disponibilidade da linha.`
        break
      case 'NORMAL':
        aiRationale = `Vida útil do desbaste L1 em operação normal: ${percentageUsed.toFixed(1)}% consumido (${remaining.toLocaleString('pt-BR')} t restantes). Nenhuma intervenção necessária no ciclo atual.`
        break
    }

    return {
      accumulatedProductionTons: status.accumulatedProductionTons,
      targetLifespanTons: target,
      percentageUsed,
      remainingTonsUntilTarget: remaining,
      status: desbasteStatus,
      shouldScheduleChange,
      isChangeUrgentBlocking,
      recommendedStopDurationHours,
      recommendedDate,
      avoidWeekend: true,
      aiRationale,
      synergyWithMaintenance,
    }
  }
}

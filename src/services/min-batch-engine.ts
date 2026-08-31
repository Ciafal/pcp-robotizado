/**
 * MOTOR DE CÁLCULO E GESTÃO DE LOTE MÍNIMO CIAFAL
 * Regras:
 * - L1 = mínimo 3 horas para qualquer bitola
 * - L2 = redondos 6 horas (em cenário formal de baixa carteira pode usar 4 horas), blocos/quadrados/tarugos sem tempo mínimo obrigatório
 * - SDC = mínimo 1 dia (24h)
 *
 * Conversão: horas mínimas x produtividade = tonelagem mínima.
 * Status: NÃO FORMADO | PARCIAL | FORMADO | EXCEÇÃO APROVADA
 * Exceção exige motivo, solicitante, aprovador, data/hora, quantidade excepcional, impacto previsto.
 */

export interface MinBatchCalculationInput {
  line: string
  family: string
  materialCode: string
  gaugeMm?: number
  availableBacklogTons: number // Carteira disponível
  productivityTonsPerHour?: number
  isLowBacklogScenario?: boolean // Cenário de baixa carteira (L2 4h)
  exception?: {
    approved: boolean
    reason: string
    requestedBy: string
    approvedBy: string
    approvedAt: string
    exceptionalQuantityTons: number
    predictedImpact: string
    approvalRole: string
  }
}

export type MinBatchStatus = 'NAO_FORMADO' | 'PARCIAL' | 'FORMADO' | 'EXCECAO_APROVADA'

export interface MinBatchCalculationResult {
  line: string
  family: string
  materialCode: string
  status: MinBatchStatus
  requiredMinHours: number
  expectedProductivityTph: number
  requiredMinTons: number
  availableBacklogTons: number
  missingTons: number
  missingHours: number
  equivalentHours: number
  canGenerateConfirmedEstimatedDate: boolean
  formattedStatusLabel: string
  explanation: string
  exceptionDetails?: MinBatchCalculationInput['exception']
}

export class MinBatchEngine {
  public static calculate(input: MinBatchCalculationInput): MinBatchCalculationResult {
    const productivity =
      input.productivityTonsPerHour || this.getDefaultProductivity(input.line, input.gaugeMm)
    const requiredMinHours = this.getMinHours(input.line, input.family, input.isLowBacklogScenario)
    const requiredMinTons = requiredMinHours * productivity
    const equivalentHours = productivity > 0 ? input.availableBacklogTons / productivity : 0

    const missingTons = Math.max(0, requiredMinTons - input.availableBacklogTons)
    const missingHours = productivity > 0 ? missingTons / productivity : 0

    let status: MinBatchStatus = 'NAO_FORMADO'

    if (
      input.exception?.approved &&
      input.exception.reason &&
      input.exception.reason.trim().length > 10
    ) {
      status = 'EXCECAO_APROVADA'
    } else if (requiredMinTons === 0 || input.availableBacklogTons >= requiredMinTons) {
      status = 'FORMADO'
    } else if (input.availableBacklogTons > 0 && input.availableBacklogTons < requiredMinTons) {
      status = 'PARCIAL'
    } else {
      status = 'NAO_FORMADO'
    }

    // Lote mínimo não formado não deve gerar data estimada como confirmada
    const canGenerateConfirmedEstimatedDate = status === 'FORMADO' || status === 'EXCECAO_APROVADA'

    let explanation = ''
    switch (status) {
      case 'FORMADO':
        explanation = `Lote formado com sucesso: ${input.availableBacklogTons.toFixed(1)} t (${equivalentHours.toFixed(1)}h) atende à exigência mínima de ${requiredMinTons.toFixed(1)} t (${requiredMinHours}h) na linha ${input.line}.`
        break
      case 'PARCIAL':
        explanation = `Lote parcial: faltam ${missingTons.toFixed(1)} t (${missingHours.toFixed(1)}h) para atingir o lote mínimo de ${requiredMinTons.toFixed(1)} t. Data estimada de entrega permanece NÃO confirmada.`
        break
      case 'NAO_FORMADO':
        explanation = `Lote não formado: carteira zerada ou insuficiente (${input.availableBacklogTons.toFixed(1)} t de ${requiredMinTons.toFixed(1)} t necessárias). Não programar até consolidação da carteira.`
        break
      case 'EXCECAO_APROVADA':
        explanation = `Lote liberado por exceção formal aprovada por ${input.exception?.approvedBy} (${input.exception?.approvalRole}). Motivo: ${input.exception?.reason}. Impacto previsto: ${input.exception?.predictedImpact}.`
        break
    }

    return {
      line: input.line,
      family: input.family,
      materialCode: input.materialCode,
      status,
      requiredMinHours,
      expectedProductivityTph: productivity,
      requiredMinTons,
      availableBacklogTons: input.availableBacklogTons,
      missingTons,
      missingHours,
      equivalentHours,
      canGenerateConfirmedEstimatedDate,
      formattedStatusLabel: this.formatStatus(status),
      explanation,
      exceptionDetails: input.exception,
    }
  }

  public static getMinHours(
    line: string,
    family: string,
    isLowBacklogScenario: boolean = false,
  ): number {
    if (line === 'L1') {
      return 3.0 // 3 horas para qualquer bitola
    }
    if (line === 'L2') {
      const isRedondo =
        family.toUpperCase().includes('REDONDO') || family.toUpperCase().includes('RD')
      if (isRedondo) {
        return isLowBacklogScenario ? 4.0 : 6.0
      }
      // Blocos / Quadrados / Tarugos sem tempo mínimo obrigatório
      return 0.0
    }
    if (line === 'SDC') {
      return 24.0 // 1 dia de produção (24h)
    }
    return 2.0 // Padrão acabamento/outras
  }

  public static getDefaultProductivity(line: string, gaugeMm?: number): number {
    switch (line) {
      case 'L1':
        return 22.5
      case 'L2':
        return gaugeMm && gaugeMm > 50 ? 30.0 : 25.0
      case 'SDC':
        return 18.0
      case 'ENDL1':
      case 'ACABL2':
        return 15.0
      case 'KS':
        return 28.0
      default:
        return 20.0
    }
  }

  private static formatStatus(status: MinBatchStatus): string {
    switch (status) {
      case 'FORMADO':
        return 'FORMADO'
      case 'PARCIAL':
        return 'PARCIAL'
      case 'NAO_FORMADO':
        return 'NÃO FORMADO'
      case 'EXCECAO_APROVADA':
        return 'EXCEÇÃO APROVADA'
    }
  }
}

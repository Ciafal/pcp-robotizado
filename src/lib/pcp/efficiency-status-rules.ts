/**
 * Regras e Limiares de Classificação Operacional de Eficiência por Centro
 * Módulo: PCP Robotizado -> Execução -> Previsto x Realizado -> Eficiência Centro
 *
 * Arquitetura: Centralizada em configuração única com tipagem estrita,
 * pronta para migração futura para configuração administrativa persistida (ex: banco de dados/SAP).
 *
 * Limiares Padrão Adotados:
 * 1. Sem Apontamento (cinza/branco):
 *    - Realizado === 0 (ou sem nenhum apontamento registrado) mesmo com previsto > 0 ou ordem agendada.
 * 2. Dentro do Planejado (verde):
 *    - Aderência >= 95.0% e desvio temporal <= 15 minutos (sem atraso relevante de início/término).
 * 3. Atenção (amarelo):
 *    - Aderência entre 85.0% e 94.99%, OU desvio temporal entre 16 e 45 minutos.
 * 4. Atrasado (laranja):
 *    - Aderência entre 70.0% e 84.99%, OU desvio temporal entre 46 e 120 minutos.
 * 5. Crítico (vermelho):
 *    - Aderência < 70.0%, OU desvio temporal > 120 minutos, OU bloqueio operacional não tratado.
 */

export type CenterOperationalStatus =
  | 'DENTRO_PLANEJADO'
  | 'ATENCAO'
  | 'ATRASADO'
  | 'CRITICO'
  | 'SEM_APONTAMENTO'

export interface CenterStatusThresholds {
  /** Aderência mínima (%) para status Dentro do Planejado (padrão: 95) */
  withinPlannedMinAdherencePct: number
  /** Tolerância máxima de atraso em minutos para Dentro do Planejado (padrão: 15) */
  withinPlannedMaxDelayMinutes: number

  /** Aderência mínima (%) para status Atenção (padrão: 85) */
  attentionMinAdherencePct: number
  /** Tolerância máxima de atraso em minutos para Atenção (padrão: 45) */
  attentionMaxDelayMinutes: number

  /** Aderência mínima (%) para status Atrasado (padrão: 70) */
  delayedMinAdherencePct: number
  /** Tolerância máxima de atraso em minutos para Atrasado (padrão: 120) */
  delayedMaxDelayMinutes: number
}

export interface StatusVisualConfig {
  status: CenterOperationalStatus
  label: string
  shortLabel: string
  description: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  dotColor: string
  textColor: string
}

export const DEFAULT_STATUS_THRESHOLDS: Readonly<CenterStatusThresholds> = Object.freeze({
  withinPlannedMinAdherencePct: 95.0,
  withinPlannedMaxDelayMinutes: 15,
  attentionMinAdherencePct: 85.0,
  attentionMaxDelayMinutes: 45,
  delayedMinAdherencePct: 70.0,
  delayedMaxDelayMinutes: 120,
})

export const STATUS_VISUAL_MAP: Record<CenterOperationalStatus, StatusVisualConfig> = {
  DENTRO_PLANEJADO: {
    status: 'DENTRO_PLANEJADO',
    label: 'Dentro do planejado',
    shortLabel: 'No prazo',
    description: 'Produção e horários aderentes às metas operacionais da CIAFAL.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-300',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-600',
  },
  ATENCAO: {
    status: 'ATENCAO',
    label: 'Atenção',
    shortLabel: 'Atenção',
    description: 'Pequena oscilação de ritmo ou atraso de até 45 min requer monitoramento.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-600',
  },
  ATRASADO: {
    status: 'ATRASADO',
    label: 'Atrasado',
    shortLabel: 'Atrasado',
    description: 'Atraso significativo no início ou volume entre 70% e 85% do previsto.',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-300',
    dotColor: 'bg-orange-500',
    textColor: 'text-orange-600',
  },
  CRITICO: {
    status: 'CRITICO',
    label: 'Crítico',
    shortLabel: 'Crítico',
    description: 'Desvio severo (> 120 min de atraso, quebra de rendimento ou < 70% da meta).',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300',
    dotColor: 'bg-rose-500',
    textColor: 'text-rose-600',
  },
  SEM_APONTAMENTO: {
    status: 'SEM_APONTAMENTO',
    label: 'Sem apontamento',
    shortLabel: 'Pendente',
    description: 'Nenhum apontamento do MES 4.0 registrado para o período ou centro.',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    dotColor: 'bg-slate-400',
    textColor: 'text-slate-500',
  },
}

export interface EvaluateStatusParams {
  plannedQty: number
  realizedQty: number
  adherencePct?: number | null
  delayMinutes?: number | null
  hasPostings?: boolean
  isCriticalStop?: boolean
}

/**
 * Classifica dinamicamente o status operacional de um centro a partir dos dados do Previsto x Realizado.
 */
export function evaluateCenterOperationalStatus(
  params: EvaluateStatusParams,
  thresholds: CenterStatusThresholds = DEFAULT_STATUS_THRESHOLDS,
): CenterOperationalStatus {
  const { plannedQty, realizedQty, delayMinutes = 0, hasPostings, isCriticalStop = false } = params

  // 1. Sem apontamento: nem apontamentos do MES e quantidade realizada zerada
  const explicitNoPostings = hasPostings === false
  const noVolumePostings = realizedQty <= 0 && plannedQty > 0
  if (explicitNoPostings || (hasPostings === undefined && noVolumePostings)) {
    return 'SEM_APONTAMENTO'
  }

  // 2. Parada crítica ou desvio grave conhecido
  if (isCriticalStop) {
    return 'CRITICO'
  }

  // Calcula aderência caso não venha informada
  const adherence =
    params.adherencePct != null
      ? params.adherencePct
      : plannedQty > 0
        ? (realizedQty / plannedQty) * 100
        : 100

  const safeDelay = Math.max(0, delayMinutes ?? 0)

  // 3. Regras por limiares
  if (
    adherence < thresholds.delayedMinAdherencePct ||
    safeDelay > thresholds.delayedMaxDelayMinutes
  ) {
    return 'CRITICO'
  }

  if (
    adherence < thresholds.attentionMinAdherencePct ||
    safeDelay > thresholds.attentionMaxDelayMinutes
  ) {
    return 'ATRASADO'
  }

  if (
    adherence < thresholds.withinPlannedMinAdherencePct ||
    safeDelay > thresholds.withinPlannedMaxDelayMinutes
  ) {
    return 'ATENCAO'
  }

  return 'DENTRO_PLANEJADO'
}

/**
 * Helper para obter visual e rótulos do status
 */
export function getStatusVisual(status: CenterOperationalStatus): StatusVisualConfig {
  return STATUS_VISUAL_MAP[status] || STATUS_VISUAL_MAP.SEM_APONTAMENTO
}

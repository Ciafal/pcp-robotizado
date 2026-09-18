/**
 * SERVIÇO DETERMINÍSTICO DE AVALIAÇÃO DE RESTRIÇÕES MÍNIMAS POR BITOLA
 * PCP ROBOTIZADO CIAFAL
 *
 * Responsabilidade:
 * Dado um Centro/Linha, uma bitola em questão (ou sequência proposta de itens),
 * carregar as restrições com status ATIVA e calcular individualmente:
 *
 * 1. QUANTIDADE: acumular a quantidade total programada para a MESMA bitola,
 *    somando produtos diferentes da mesma bitola (ex.: Produto A 50t + B 40t + C 70t = 160t).
 *    Troca de produto/pedido/cliente/ordem NÃO quebra o acumulado se a bitola continuar a mesma;
 *    apenas troca EFETIVA de bitola encerra o bloco contínuo.
 *
 * 2. HORAS: somar SOMENTE tempo efetivo previsto de produção da bitola
 *    (NÃO contar setup, troca de bitola, paradas programadas/corretivas, manutenção, intervalos).
 *    Continuidade entre dias: produção que atravessa a virada do dia (ex.: 18/09 22h -> 19/09 06h)
 *    conta como tempo contínuo usando calendários/turnos/jornadas reais do Centro.
 *
 * 3. DIAS: converter a permanência da bitola em dias produtivos usando o calendário
 *    produtivo/turnos do Centro (não simples data final - data inicial).
 *
 * Cada restrição -> ATENDIDA ou NÃO ATENDIDA com déficit legível.
 * Status geral: ATENDIDA somente se TODAS as ativas forem satisfeitas (lógica E).
 */

import pb from '@/lib/pocketbase/client'
import {
  LineGaugeMinRestriction,
  RestrictionEvaluationItem,
  GaugeMinRestrictionEvaluation,
} from '@/types/line-gauge-restriction'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { ProductionShift } from '@/types/line-master'
import { ShiftEngine } from './shift-engine'
import { pcpAuditService } from './pcp-audit-service'

export interface EvaluateGaugeContext {
  company?: string
  lineCode: string
  centerCode?: string
  currentGauge: string
  nextGauge?: string
  items: WeeklyScheduleItem[]
  shifts?: ProductionShift[]
  activeRestrictions?: LineGaugeMinRestriction[]
  user?: {
    id?: string
    name?: string
    email?: string
  }
}

/**
 * Normaliza string de bitola para comparação estrita (remove espaços extras, uppercase)
 */
export function normalizeGauge(dimensionOrGauge?: string | null): string {
  if (!dimensionOrGauge) return ''
  return String(dimensionOrGauge).trim().toUpperCase()
}

/**
 * Extrai a bitola a partir de um item de programação
 */
export function extractGaugeFromItem(item: WeeklyScheduleItem): string {
  return normalizeGauge(item.dimensions || item.material_code)
}

/**
 * Localiza o bloco contínuo de produção para a bitola informada dentro da lista de itens.
 * Se targetItemIndex for fornecido, pega o bloco contínuo da mesma bitola que contém esse índice.
 * Caso contrário, localiza o último bloco contínuo da bitola (ou bloco corrente antes da troca).
 */
export function extractContinuousGaugeBlock(
  items: WeeklyScheduleItem[],
  targetGauge: string,
  targetItemIndex?: number,
): WeeklyScheduleItem[] {
  const normTarget = normalizeGauge(targetGauge)
  if (!normTarget || !items || items.length === 0) return []

  // Filtra itens produtivos (ignora paradas ou setups puros se estiverem isolados, mas mantém a ordem sequencial)
  const orderedItems = [...items].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))

  let startIdx = -1
  let endIdx = -1

  if (
    targetItemIndex !== undefined &&
    targetItemIndex >= 0 &&
    targetItemIndex < orderedItems.length
  ) {
    // Expande para trás e para frente a partir de targetItemIndex
    const seedItem = orderedItems[targetItemIndex]
    const seedGauge = extractGaugeFromItem(seedItem)
    if (seedGauge !== normTarget) {
      // Se o item do índice não bate com a bitola, busca onde ela ocorre
      return extractContinuousGaugeBlock(items, targetGauge)
    }

    startIdx = targetItemIndex
    while (startIdx > 0) {
      const prev = orderedItems[startIdx - 1]
      if (prev.item_type === 'PRODUCTION' && extractGaugeFromItem(prev) !== normTarget) {
        break
      }
      startIdx--
    }

    endIdx = targetItemIndex
    while (endIdx < orderedItems.length - 1) {
      const next = orderedItems[endIdx + 1]
      if (next.item_type === 'PRODUCTION' && extractGaugeFromItem(next) !== normTarget) {
        break
      }
      endIdx++
    }
  } else {
    // Encontra o último bloco da bitola na sequência
    for (let i = orderedItems.length - 1; i >= 0; i--) {
      const it = orderedItems[i]
      if (it.item_type === 'PRODUCTION' && extractGaugeFromItem(it) === normTarget) {
        endIdx = i
        break
      }
    }

    if (endIdx === -1) return []

    startIdx = endIdx
    while (startIdx > 0) {
      const prev = orderedItems[startIdx - 1]
      if (prev.item_type === 'PRODUCTION' && extractGaugeFromItem(prev) !== normTarget) {
        break
      }
      startIdx--
    }
  }

  if (startIdx === -1 || endIdx === -1) return []

  // Retorna os itens desse intervalo contínuo
  return orderedItems.slice(startIdx, endIdx + 1)
}

/**
 * Calcula os acumulados contínuos da bitola:
 * - totalQuantityTons: soma SOMENTE de planned_quantity_tons dos itens de PRODUÇÃO
 * - totalProductionHours: soma SOMENTE de production_hours efetivas (sem setup, paradas, etc.)
 * - productiveDays: conversão de horas produtivas em dias produtivos usando a capacidade diária dos turnos
 */
export function calculateContinuousGaugeMetrics(
  blockItems: WeeklyScheduleItem[],
  shifts?: ProductionShift[],
): {
  totalQuantityTons: number
  totalProductionHours: number
  productiveDays: number
  dailyAvailableHours: number
} {
  const prodItems = blockItems.filter(
    (it) => it.item_type === 'PRODUCTION' && (it.planned_quantity_tons || it.production_hours),
  )

  const totalQuantityTons = prodItems.reduce(
    (sum, it) => sum + (Number(it.planned_quantity_tons) || 0),
    0,
  )

  // HORAS: somar SOMENTE tempo efetivo previsto de produção da bitola
  // NÃO contar setup_duration_minutes, tuning_duration_minutes, paradas programadas/corretivas
  const totalProductionHours = prodItems.reduce((sum, it) => {
    if (it.production_hours && it.production_hours > 0) {
      return sum + Number(it.production_hours)
    }
    // Se não tiver production_hours explícito, calcula via quantidade e cadência
    const qty = Number(it.planned_quantity_tons) || 0
    const cadence = Number(it.productivity_rate_th) || 0
    if (cadence > 0) {
      return sum + qty / cadence
    }
    return sum
  }, 0)

  // DIAS: converter permanência em dias produtivos usando os turnos/calendário do Centro
  let dailyAvailableHours = 24.0
  if (shifts && shifts.length > 0) {
    const calcHours = ShiftEngine.calculateDailyAvailableHours(shifts)
    if (calcHours > 0) {
      dailyAvailableHours = calcHours
    }
  }

  const productiveDays = dailyAvailableHours > 0 ? totalProductionHours / dailyAvailableHours : 0

  return {
    totalQuantityTons: Number(totalQuantityTons.toFixed(2)),
    totalProductionHours: Number(totalProductionHours.toFixed(2)),
    productiveDays: Number(productiveDays.toFixed(2)),
    dailyAvailableHours,
  }
}

/**
 * Formata duração em horas e minutos legíveis: ex "7h30", "8h", "45 min"
 */
export function formatHoursAndMinutes(hours: number): string {
  if (hours <= 0) return '0h'
  const totalMin = Math.round(hours * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

export const gaugeRestrictionEvaluationService = {
  /**
   * Carrega as restrições ATIVAS do PocketBase para a linha/centro especificado.
   */
  async loadActiveRestrictions(lineCode: string): Promise<LineGaugeMinRestriction[]> {
    try {
      const records = await pb
        .collection('line_gauge_min_restrictions')
        .getFullList<LineGaugeMinRestriction>({
          filter: `line_code = '${lineCode}' && status = 'ATIVA'`,
          sort: 'created',
        })
      return records.map((r) => ({
        ...r,
        status: (r.status as 'ATIVA' | 'INATIVA') || 'ATIVA',
      }))
    } catch (err) {
      console.warn(`Aviso ao carregar restrições ativas para ${lineCode}:`, err)
      return []
    }
  },

  /**
   * Avalia as restrições mínimas para um contexto de troca de bitola ou verificação de bloco.
   * Lógica puramente determinística.
   */
  evaluate(context: EvaluateGaugeContext): GaugeMinRestrictionEvaluation {
    const {
      company = 'CIAFAL',
      lineCode,
      centerCode = lineCode,
      currentGauge,
      nextGauge,
      items,
      shifts,
      activeRestrictions = [],
    } = context

    const normCurrent = normalizeGauge(currentGauge)
    const normNext = normalizeGauge(nextGauge)

    // Se não há restrições ativas, está automaticamente atendido
    if (!activeRestrictions || activeRestrictions.length === 0) {
      return {
        company,
        line: lineCode,
        center: centerCode,
        currentGauge: normCurrent,
        nextGauge: normNext || undefined,
        activeRestrictionsCount: 0,
        satisfiedCount: 0,
        pendingCount: 0,
        allSatisfied: true,
        overallStatus: 'RESTRIÇÃO MÍNIMA ATENDIDA',
        evaluations: [],
      }
    }

    // Isola o bloco contínuo da mesma bitola
    const continuousBlock = extractContinuousGaugeBlock(items, normCurrent)
    const metrics = calculateContinuousGaugeMetrics(continuousBlock, shifts)

    const evaluations: RestrictionEvaluationItem[] = []

    for (const rule of activeRestrictions) {
      const reqVal = Number(rule.min_value) || 0
      let curVal = 0
      let deficitVal = 0
      let isSatisfied = false
      let deficitFormatted = ''
      let explanation = ''

      const typeUpper = (rule.restriction_type || '').toUpperCase()

      if (typeUpper === 'QUANTIDADE') {
        curVal = metrics.totalQuantityTons
        deficitVal = Math.max(0, reqVal - curVal)
        isSatisfied = curVal >= reqVal
        const uom = rule.unit_of_measure || 't'
        deficitFormatted = isSatisfied
          ? `${curVal.toLocaleString('pt-BR')} ${uom} / mínimo ${reqVal.toLocaleString('pt-BR')} ${uom}`
          : `${curVal.toLocaleString('pt-BR')} ${uom} / mínimo ${reqVal.toLocaleString('pt-BR')} ${uom} — Déficit: ${deficitVal.toLocaleString('pt-BR')} ${uom}`
        explanation = isSatisfied
          ? `Quantidade acumulada da bitola (${curVal} ${uom}) atinge o mínimo exigido (${reqVal} ${uom}).`
          : `Quantidade acumulada da bitola (${curVal} ${uom}) abaixo do mínimo exigido (${reqVal} ${uom}). Déficit de ${deficitVal.toFixed(1)} ${uom}.`
      } else if (typeUpper === 'HORAS') {
        curVal = metrics.totalProductionHours
        deficitVal = Math.max(0, reqVal - curVal)
        isSatisfied = curVal >= reqVal
        const curFormatted = formatHoursAndMinutes(curVal)
        const reqFormatted = formatHoursAndMinutes(reqVal)
        const defFormatted = formatHoursAndMinutes(deficitVal)
        deficitFormatted = isSatisfied
          ? `${curFormatted} / mínimo ${reqFormatted}`
          : `${curFormatted} / mínimo ${reqFormatted} — Déficit: ${defFormatted}`
        explanation = isSatisfied
          ? `Tempo efetivo de produção da bitola (${curFormatted}) atende ao mínimo de ${reqFormatted}.`
          : `Tempo efetivo de produção da bitola (${curFormatted}) abaixo do mínimo exigido de ${reqFormatted}. Déficit de ${defFormatted}.`
      } else if (typeUpper === 'DIAS') {
        curVal = metrics.productiveDays
        deficitVal = Math.max(0, reqVal - curVal)
        isSatisfied = curVal >= reqVal
        const uom = rule.unit_of_measure || 'dia(s)'
        deficitFormatted = isSatisfied
          ? `${curVal.toFixed(1)} ${uom} / mínimo ${reqVal} ${uom}`
          : `${curVal.toFixed(1)} ${uom} / mínimo ${reqVal} ${uom} — Déficit: ${deficitVal.toFixed(1)} ${uom}`
        explanation = isSatisfied
          ? `Permanência em dias produtivos (${curVal.toFixed(1)} ${uom}) atende ao mínimo de ${reqVal} ${uom}.`
          : `Permanência em dias produtivos (${curVal.toFixed(1)} ${uom}) abaixo do mínimo de ${reqVal} ${uom}. Déficit de ${deficitVal.toFixed(1)} ${uom}.`
      } else {
        // Fallback genérico para outro tipo
        curVal = metrics.totalQuantityTons
        deficitVal = Math.max(0, reqVal - curVal)
        isSatisfied = curVal >= reqVal
        deficitFormatted = isSatisfied
          ? `${curVal} / mínimo ${reqVal}`
          : `${curVal} / mínimo ${reqVal} — Déficit: ${deficitVal}`
        explanation = isSatisfied ? 'Regra atendida.' : 'Regra pendente.'
      }

      evaluations.push({
        restrictionId: rule.id,
        restrictionType: rule.restriction_type,
        requiredValue: reqVal,
        currentValue: Number(curVal.toFixed(2)),
        unitOfMeasure: rule.unit_of_measure,
        ruleDescription: rule.rule_description,
        status: rule.status,
        isSatisfied,
        deficitValue: Number(deficitVal.toFixed(2)),
        deficitFormatted,
        explanation,
      })
    }

    const satisfiedCount = evaluations.filter((e) => e.isSatisfied).length
    const pendingCount = evaluations.length - satisfiedCount
    // Lógica E: atendida SOMENTE se TODAS as ativas forem satisfeitas
    const allSatisfied = pendingCount === 0

    const pendingAlertMessage = allSatisfied
      ? undefined
      : 'A troca para a próxima bitola não atende todas as restrições parametrizadas para este Centro.'

    return {
      company,
      line: lineCode,
      center: centerCode,
      currentGauge: normCurrent,
      nextGauge: normNext || undefined,
      activeRestrictionsCount: activeRestrictions.length,
      satisfiedCount,
      pendingCount,
      allSatisfied,
      overallStatus: allSatisfied ? 'RESTRIÇÃO MÍNIMA ATENDIDA' : 'RESTRIÇÃO MÍNIMA NÃO ATENDIDA',
      evaluations,
      pendingAlertMessage,
    }
  },

  /**
   * Avalia e registra em auditoria oficial caso resulte em bloqueio ou pendência.
   */
  async evaluateAndAudit(context: EvaluateGaugeContext): Promise<GaugeMinRestrictionEvaluation> {
    const result = this.evaluate(context)

    // Se NÃO atendida, registra auditoria oficial em pcp_audit_logs
    if (!result.allSatisfied) {
      try {
        await pcpAuditService.recordLog({
          action: `Restrição Mínima por Bitola Não Atendida na Linha ${context.lineCode} (${result.pendingCount} pendência(s))`,
          event_type: 'Alerta Operacional',
          module: 'Programação',
          screen: 'Montagem Semanal',
          company: context.company || 'CIAFAL',
          line: context.lineCode,
          center: context.centerCode || context.lineCode,
          record_id: context.currentGauge,
          entity: 'line_gauge_min_restrictions',
          source: 'Sistema',
          status: 'Bloqueio / Alerta',
          outcome: 'WARN',
          reason: 'Troca de bitola com restrição mínima não atingida',
          justification: `A bitola ${context.currentGauge} possui restrições pendentes antes da troca: ${result.pendingAlertMessage}`,
          details: {
            line_code: context.lineCode,
            current_gauge: context.currentGauge,
            next_gauge: context.nextGauge,
            active_count: result.activeRestrictionsCount,
            satisfied_count: result.satisfiedCount,
            pending_count: result.pendingCount,
            evaluations: result.evaluations.map((e) => ({
              type: e.restrictionType,
              req: e.requiredValue,
              cur: e.currentValue,
              uom: e.unitOfMeasure,
              satisfied: e.isSatisfied,
              deficitFormatted: e.deficitFormatted,
            })),
          },
        })
      } catch (audErr) {
        console.warn('Falha ao auditar alerta de restrição mínima de bitola:', audErr)
      }
    }

    return result
  },
}

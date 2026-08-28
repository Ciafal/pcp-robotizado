import {
  ProductionRoute,
  ProductionRouteNode,
  ProductionRouteEdge,
  RouteProductQueryResult,
  BufferAlert,
  RouteValidationFeedback,
  BottleneckRiskLevel,
  ProductionCapacityLog,
} from '@/types/sequencing-orchestration'
import { ProductionLineEntity } from '@/services/production-network'

/**
 * Camada Lógica: SequencingOrchestrator
 * Implementação determinística das regras industriais de orquestração fina,
 * precedência N:N, validação de rotas, buffers e sinalização de gargalos.
 * (NÃO substitui o solver definitivo CP-SAT/MILP, apenas valida determinísticamente as condições de contorno).
 */
export class SequencingOrchestrator {
  /**
   * Responde determinísticamente: "Para este produto/família, quais rotas produtivas são válidas?"
   */
  public static queryValidRoutesForProduct(
    productCode: string,
    familyCode: string | undefined,
    allRoutes: ProductionRoute[],
    lines: ProductionLineEntity[],
    capacityLogs: ProductionCapacityLog[] = [],
  ): RouteProductQueryResult {
    const validRoutes: ProductionRoute[] = []
    const warnings: string[] = []
    const constraints: RouteProductQueryResult['constraints'] = []

    const cleanProduct = productCode.trim().toUpperCase()
    const cleanFamily = (familyCode || '').trim().toUpperCase()

    // 1. Filtrar rotas associadas ao produto ou família que estejam APPROVED
    for (const r of allRoutes) {
      const matchProduct = r.product_code && r.product_code.toUpperCase() === cleanProduct
      const matchFamily =
        (r.family_code && r.family_code.toUpperCase() === cleanFamily) ||
        (!r.product_code && !r.family_code)

      if (matchProduct || matchFamily) {
        if (r.status === 'APPROVED' && r.active) {
          validRoutes.push(r)
        } else if (r.status !== 'APPROVED') {
          warnings.push(
            `Rota [${r.code} V${r.version}] associada ao produto está com status ${r.status} (não elegível para o motor oficial).`,
          )
        }
      }
    }

    // 2. Se nenhuma rota aprovada for encontrada
    if (validRoutes.length === 0) {
      constraints.push({
        code: 'NO_VALID_ROUTE',
        type: 'SCOPE',
        description: `Ausência de rota produtiva com status APPROVED cadastrada para o produto ${cleanProduct} / família ${cleanFamily || 'Geral'}.`,
        severity: 'BLOCK',
      })
    }

    // 3. Avaliar gargalos e capacidades nas linhas pertencentes às rotas válidas
    for (const r of validRoutes) {
      if (r.nodes) {
        for (const node of r.nodes) {
          const cap = capacityLogs.find((c) => c.line_code === node.line_code)
          if (cap) {
            if (cap.bottleneck_risk === 'CRITICAL' || cap.bottleneck_risk === 'HIGH') {
              warnings.push(
                `Atenção: Linha ${node.line_code} na Rota [${r.code}] opera com risco de saturação ${cap.bottleneck_risk} (Capacidade Programável: ${cap.programmable_capacity} ${cap.unit}).`,
              )
              constraints.push({
                code: `BOTTLENECK_${node.line_code}`,
                type: 'CAPACITY',
                description: `Gargalo potencial detectado na linha ${node.line_code}. Utilização projetada: ${cap.utilization_pct}%.`,
                severity: cap.bottleneck_risk === 'CRITICAL' ? 'BLOCK' : 'WARNING',
                line_code: node.line_code,
              })
            }
          }
        }
      }
    }

    // 4. Identificar rota preferencial
    const preferredRoute =
      validRoutes.find((r) => r.preferred) || (validRoutes.length > 0 ? validRoutes[0] : null)

    return {
      product: cleanProduct,
      family: cleanFamily,
      validRoutes,
      preferredRoute,
      constraints,
      warnings,
    }
  }

  /**
   * Validação Estrutural Completa de uma Rota Produtiva N:N
   */
  public static validateRoute(
    route: ProductionRoute,
    lines: ProductionLineEntity[],
    capacityLogs: ProductionCapacityLog[] = [],
  ): RouteValidationFeedback {
    const errors: string[] = []
    const warnings: string[] = []
    const lineCodes = new Set(lines.map((l) => l.code))

    const isApproved = route.status === 'APPROVED'

    // 1. Regra de Homologação: Apenas rotas APPROVED podem ser oficiais
    if (!isApproved) {
      errors.push(
        `A Rota [${route.code} V${route.version}] possui status '${route.status}'. Somente rotas com status 'APPROVED' podem ser consideradas oficiais pelo motor de sequenciamento.`,
      )
    }

    const nodes = route.nodes || []
    const edges = route.edges || []

    if (nodes.length === 0 && edges.length === 0) {
      errors.push(`A Rota [${route.code}] não possui nós ou ligações cadastradas.`)
    }

    // 2. Validação dos Nós (Linhas existentes, ordem lógica)
    const nodeLineCodes = new Set<string>()
    for (const n of nodes) {
      nodeLineCodes.add(n.line_code)
      if (!lineCodes.has(n.line_code)) {
        errors.push(
          `Nó da rota referencia a linha [${n.line_code}] que não existe no cadastro mestre de linhas.`,
        )
      }
    }

    // 3. Validação das Ligações (Edges N:N, Predecessores, Sucessores, Buffers)
    for (const edge of edges) {
      if (!lineCodes.has(edge.origin_line_code)) {
        errors.push(
          `Ligação aponta linha de origem inexistente [${edge.origin_line_code}] na malha.`,
        )
      }
      if (!lineCodes.has(edge.target_line_code)) {
        errors.push(
          `Ligação aponta linha de destino inexistente [${edge.target_line_code}] na malha.`,
        )
      }
      if (edge.buffer_min_tons > edge.buffer_max_tons) {
        errors.push(
          `Buffer inconsistente na relação ${edge.origin_line_code} ➔ ${edge.target_line_code}: Mínimo (${edge.buffer_min_tons} t) maior que Máximo (${edge.buffer_max_tons} t).`,
        )
      }
      if (edge.lead_time_minutes < 0) {
        errors.push(
          `Lead time negativo (${edge.lead_time_minutes} min) na relação ${edge.origin_line_code} ➔ ${edge.target_line_code}.`,
        )
      }

      // Alertas de Buffer
      if (edge.current_buffer_stock < edge.buffer_min_tons) {
        warnings.push(
          `Aviso de Buffer: Pulmão entre ${edge.origin_line_code} e ${edge.target_line_code} está abaixo do estoque mínimo (${edge.current_buffer_stock} t < ${edge.buffer_min_tons} t). Risco de esvaziamento.`,
        )
      } else if (edge.current_buffer_stock > edge.buffer_max_tons) {
        warnings.push(
          `Aviso de Buffer: Pulmão entre ${edge.origin_line_code} e ${edge.target_line_code} excede o limite máximo (${edge.current_buffer_stock} t > ${edge.buffer_max_tons} t). Risco de saturação a montante.`,
        )
      }
    }

    // 4. Detecção de Ciclos Não Tratados
    const adj = new Map<string, string[]>()
    edges.forEach((e) => {
      const list = adj.get(e.origin_line_code) || []
      list.push(e.target_line_code)
      adj.set(e.origin_line_code, list)
    })

    const visited = new Set<string>()
    const recStack = new Set<string>()
    const detectCycle = (node: string, path: string[]): boolean => {
      visited.add(node)
      recStack.add(node)
      const neighbors = adj.get(node) || []
      for (const next of neighbors) {
        if (!visited.has(next)) {
          if (detectCycle(next, [...path, next])) return true
        } else if (recStack.has(next)) {
          errors.push(`Dependência cíclica não tratada detectada: ${[...path, next].join(' ➔ ')}`)
          return true
        }
      }
      recStack.delete(node)
      return false
    }

    for (const edge of edges) {
      if (!visited.has(edge.origin_line_code)) {
        detectCycle(edge.origin_line_code, [edge.origin_line_code])
      }
    }

    // 5. Sumário de Gargalos
    const bottleneckSummary = nodes.map((node) => {
      const cap = capacityLogs.find((c) => c.line_code === node.line_code)
      const nominal = node.nominal_rate || cap?.nominal_capacity || 120
      const prog = cap?.programmable_capacity || nominal * 0.88
      const util = cap?.utilization_pct || 85.0
      const risk = (cap?.bottleneck_risk || (util > 90 ? 'HIGH' : 'LOW')) as BottleneckRiskLevel
      return {
        lineCode: node.line_code,
        nominalRate: nominal,
        programmableRate: prog,
        utilizationPct: util,
        risk,
      }
    })

    return {
      isValid: errors.length === 0,
      canBeUsedOfficially: errors.length === 0 && isApproved,
      routeCode: route.code,
      version: route.version,
      status: route.status,
      errors,
      warnings,
      bottleneckSummary,
    }
  }

  /**
   * Avalia criticidade dos Pulmões / Buffers das relações
   */
  public static evaluateBufferHealth(edges: ProductionRouteEdge[]): BufferAlert[] {
    return edges.map((e) => {
      let severity: BufferAlert['severity'] = 'NORMAL'
      let alert_type: BufferAlert['alert_type'] = 'BALANCED'
      let message = `Pulmão em operação normal (${e.current_buffer_stock} ${e.buffer_unit || 't'}).`

      if (e.current_buffer_stock < e.buffer_min_tons) {
        severity = 'WARNING'
        alert_type = 'BELOW_MIN'
        message = `Estoque do buffer (${e.current_buffer_stock} t) abaixo do mínimo exigido (${e.buffer_min_tons} t). Risco de esvaziamento à jusante.`
      } else if (e.current_buffer_stock > e.buffer_max_tons) {
        severity = 'CRITICAL'
        alert_type = 'ABOVE_MAX'
        message = `Estoque do buffer (${e.current_buffer_stock} t) acima do limite físico (${e.buffer_max_tons} t). Risco de saturação e parada na linha ${e.origin_line_code}.`
      } else if (e.projected_buffer_stock && e.projected_buffer_stock < e.buffer_min_tons * 0.8) {
        severity = 'WARNING'
        alert_type = 'DEPLETION_RISK'
        message = `Projeção de esvaziamento iminente nas próximas 2h (${e.projected_buffer_stock} t).`
      } else if (e.projected_buffer_stock && e.projected_buffer_stock > e.buffer_max_tons * 0.95) {
        severity = 'WARNING'
        alert_type = 'SATURATION_RISK'
        message = `Projeção de sobrecarga iminente no pulmão (${e.projected_buffer_stock} t).`
      }

      return {
        edgeId: e.id,
        origin_line_code: e.origin_line_code,
        target_line_code: e.target_line_code,
        buffer_type: e.buffer_physical_type || 'BUFFER_OPERACIONAL',
        current_stock: e.current_buffer_stock,
        min_stock: e.buffer_min_tons,
        max_stock: e.buffer_max_tons,
        target_stock: e.buffer_target_tons,
        unit: e.buffer_unit || 't',
        severity,
        alert_type,
        message,
      }
    })
  }

  /**
   * Cálculo Determinístico dos 4 Conceitos de Capacidade
   * NOMINAL -> - perdas planejadas -> PROGRAMÁVEL -> - perdas reais de execução -> REALIZADA
   */
  public static calculateFourCapacities(input: {
    nominalCapacity: number
    plannedStopsLoss: number
    plannedSetupLoss: number
    plannedCalendarLoss: number
    otherPlannedLoss?: number
    unplannedStopsLoss: number
    unplannedSetupLoss: number
    maintenanceLoss: number
    materialShortageLoss: number
    qualityDefectLoss: number
    bottleneckLoss: number
    operationalLoss: number
    otherExecutionLoss?: number
  }) {
    const totalPlannedLoss =
      input.plannedStopsLoss +
      input.plannedSetupLoss +
      input.plannedCalendarLoss +
      (input.otherPlannedLoss || 0)

    const programmableCapacity = Math.max(0, input.nominalCapacity - totalPlannedLoss)

    const totalExecutionLoss =
      input.unplannedStopsLoss +
      input.unplannedSetupLoss +
      input.maintenanceLoss +
      input.materialShortageLoss +
      input.qualityDefectLoss +
      input.bottleneckLoss +
      input.operationalLoss +
      (input.otherExecutionLoss || 0)

    const realizedCapacity = Math.max(0, programmableCapacity - totalExecutionLoss)
    const totalLostCapacity = totalPlannedLoss + totalExecutionLoss

    const utilizationPct =
      input.nominalCapacity > 0
        ? Number(((realizedCapacity / input.nominalCapacity) * 100).toFixed(1))
        : 0

    const efficiencyPct =
      programmableCapacity > 0
        ? Number(((realizedCapacity / programmableCapacity) * 100).toFixed(1))
        : 0

    let bottleneckRisk: BottleneckRiskLevel = 'LOW'
    if (utilizationPct >= 95 || programmableCapacity < input.nominalCapacity * 0.6) {
      bottleneckRisk = 'CRITICAL'
    } else if (utilizationPct >= 85 || input.bottleneckLoss > 5) {
      bottleneckRisk = 'HIGH'
    } else if (utilizationPct >= 75) {
      bottleneckRisk = 'MEDIUM'
    }

    return {
      nominalCapacity: input.nominalCapacity,
      totalPlannedLoss,
      programmableCapacity,
      totalExecutionLoss,
      realizedCapacity,
      totalLostCapacity,
      utilizationPct,
      efficiencyPct,
      bottleneckRisk,
      breakdown: {
        plannedStops: input.plannedStopsLoss,
        plannedSetup: input.plannedSetupLoss,
        plannedCalendar: input.plannedCalendarLoss,
        unplannedStops: input.unplannedStopsLoss,
        unplannedSetup: input.unplannedSetupLoss,
        maintenance: input.maintenanceLoss,
        materialShortage: input.materialShortageLoss,
        qualityDefect: input.qualityDefectLoss,
        bottleneck: input.bottleneckLoss,
        operational: input.operationalLoss,
      },
    }
  }
}

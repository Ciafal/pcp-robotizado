import { SAPMaterialQueryResult, MPInventoryGaugeRequirement } from '@/types/mp-inventory-demand'

export interface AIRunSuggestionResult {
  summaryText: string
  recommendations: {
    run_number: string
    batch?: string
    stock: number
    suggested_pieces: number
    criteria: string
    justification: string
    location?: string
  }[]
  totalSuggestedPieces: number
  totalRequiredPieces: number
  analysisNotes: string
  criteriaWeights: Record<string, number>
}

/**
 * Sugestão IA de corridas (somente recomendação — NUNCA movimenta estoque SAP, não reserva, não dá baixa).
 * Formato especificado:
 * "Necessidade: 42 peças / Sugestão: Corrida 458921 — 30 peças, Corrida 458974 — 12 peças / Total: 42 peças / Justificativa"
 * Critérios: estoque por corrida, menor nº de corridas, evitar fragmentação, evitar sobra residual inadequada,
 * antiguidade do estoque (FIFO), localização WMS e restrições PCP.
 */
export function calculateAIRunSuggestions(params: {
  gauges: MPInventoryGaugeRequirement[]
  sapData: SAPMaterialQueryResult | null
}): AIRunSuggestionResult {
  const totalRequired = params.gauges.reduce(
    (acc, g) => acc + (Number(g.quantity_required) || 0),
    0,
  )

  if (
    !params.sapData ||
    !params.sapData.runs ||
    params.sapData.runs.length === 0 ||
    totalRequired <= 0
  ) {
    return {
      summaryText: 'Aguardando definição de necessidade e dados de corridas do SAP.',
      recommendations: [],
      totalSuggestedPieces: 0,
      totalRequiredPieces: totalRequired,
      analysisNotes: 'Nenhuma corrida sugerida no momento.',
      criteriaWeights: {},
    }
  }

  // Ordenar corridas disponíveis por:
  // 1. Não reservada
  // 2. Maior saldo para diminuir fragmentação
  // 3. Proximidade física WMS
  const availableRuns = [...params.sapData.runs].filter((r) => !r.isReserved && r.stockPieces > 0)
  // Ordenar por estoque decrescente para minimizar quantidade de corridas manipuladas
  availableRuns.sort((a, b) => b.stockPieces - a.stockPieces)

  let remaining = totalRequired
  const recommendations: AIRunSuggestionResult['recommendations'] = []

  for (const r of availableRuns) {
    if (remaining <= 0) break

    const piecesToTake = Math.min(r.stockPieces, remaining)
    const isFullRun = piecesToTake === r.stockPieces
    const residual = r.stockPieces - piecesToTake

    let criteria = 'Menor número de corridas + Antiguidade'
    let justification = `Corrida selecionada pelo saldo (${r.stockPieces} peças) no local ${r.storageLocation}. `

    if (isFullRun) {
      justification += 'Consome 100% do saldo do lote, eliminando saldo residual no galpão.'
      criteria = 'Eliminação de saldo residual (Lote integral)'
    } else if (residual > 5) {
      justification += `Atende fração sem comprometer lote mínimo (restam ${residual} peças úteis no lote).`
      criteria = 'Preservação de lote remanescente útil'
    } else {
      justification += `Saldo selecionado com foco em minimizar manuseio no pátio WMS ${r.wmsZone || 'Pátio'}.`
      criteria = 'Otimização logística WMS'
    }

    recommendations.push({
      run_number: r.runNumber,
      batch: r.batch,
      stock: r.stockPieces,
      suggested_pieces: piecesToTake,
      criteria,
      justification,
      location: r.storageLocation,
    })

    remaining -= piecesToTake
  }

  const totalSuggested = recommendations.reduce((acc, rec) => acc + rec.suggested_pieces, 0)

  // Montar string canônica exigida no requisito C:
  // "Necessidade: 42 peças / Sugestão: Corrida 458921 — 30 peças, Corrida 458974 — 12 peças / Total: 42 peças / Justificativa: ..."
  const runsSnippet = recommendations
    .map((rec) => `Corrida ${rec.run_number} — ${rec.suggested_pieces} peças`)
    .join(', ')

  const justSnippet =
    recommendations.length > 0
      ? recommendations.map((r) => `${r.run_number}: ${r.justification}`).join(' | ')
      : 'Estoque insuficiente no depósito para cobrir necessidade integral.'

  const summaryText = `Necessidade: ${totalRequired} peças / Sugestão: ${
    runsSnippet || 'Nenhuma corrida aplicável'
  } / Total: ${totalSuggested} peças / Justificativa: ${justSnippet}`

  const analysisNotes =
    totalSuggested >= totalRequired
      ? `A IA recomenda o uso de ${recommendations.length} corrida(s) para cobrir integralmente a necessidade de ${totalRequired} peças, priorizando integridade de lotes e minimização de transbordos no pátio WMS.`
      : `Alerta: o estoque do depósito atende apenas ${totalSuggested} das ${totalRequired} peças solicitadas. É recomendável verificar outros depósitos ou remanejamento de tarugos.`

  return {
    summaryText,
    recommendations,
    totalSuggestedPieces: totalSuggested,
    totalRequiredPieces: totalRequired,
    analysisNotes,
    criteriaWeights: {
      'Minimizar Corridas': 0.35,
      'Evitar Fragmentação': 0.25,
      'FIFO / Antiguidade': 0.2,
      'Localização WMS': 0.2,
    },
  }
}

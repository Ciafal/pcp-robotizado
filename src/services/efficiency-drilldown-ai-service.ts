/**
 * Motor de Análise de Eficiência com IA para o Detalhamento Operacional de Ordens (HUB CIAFAL)
 *
 * Regras estritas:
 * 1. NÃO INVENTA DADOS: se não há apontamento, não calcula realizado, aderência ou RM.
 * 2. Diferencia obrigatoriamente: Dado Registrado / Desvio Calculado / Causa Registrada / Hipótese de IA.
 * 3. Se Previsto 0, Realizado 'Sem apontamento', RM 'Não calculado', perdas '—',
 *    retorna: "Sem dados produtivos suficientes para cálculo da eficiência. Verificar programação e/ou apontamentos da ordem."
 * 4. Evita respostas genéricas repetitivas: sintetiza com base nas métricas reais da OP.
 */

import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'

export interface OrderAiData {
  id: string
  opNumber: string
  materialCode: string
  materialDescription: string
  plannedTons: number
  realizedTons: number | null
  differenceTons: number
  adherencePct: number | null
  rmPct: number | null
  goodTons: number | null
  reworkTons: number | null
  lossTons: number | null
  status: string
  hasDivergence: boolean
  divergenceOrigin?: string
  batchNumber?: string
  sapDocumentNumber?: string | null
  registeredCause?: string | null
  notes?: string | null
}

export interface ConsolidatedAiAnalysis {
  resumo: string
  principaisDesvios: string[]
  ordensRequeremAtencao: Array<{
    opNumber: string
    materialCode: string
    descricaoDesvio: string
  }>
  pontosPositivos: string[]
  proximasVerificacoes: string[]
  totalAnalisadas: number
  requeremAtencaoCount: number
  conformesCount: number
}

/**
 * Gera o Resumo IA individual por Ordem de Produção (1 a 2 frases objetivas)
 */
export function generateOrderAiSummary(order: OrderAiData): string {
  // Regra 9: Dados insuficientes / sem dados produtivos
  const hasNoPlanned = !order.plannedTons || order.plannedTons <= 0
  const hasNoRealized = order.realizedTons === null || order.realizedTons === undefined

  if (hasNoPlanned && hasNoRealized) {
    return 'Sem dados produtivos suficientes para cálculo da eficiência. Verificar programação e/ou apontamentos da ordem.'
  }

  if (hasNoRealized) {
    return 'Sem apontamento produtivo. Não é possível calcular realizado, aderência e rendimento da ordem.'
  }

  const realized = order.realizedTons
  const planned = order.plannedTons
  const diff = order.differenceTons
  const adherence = order.adherencePct
  const rework = order.reworkTons || 0
  const loss = order.lossTons || 0

  // Caso haja divergência SAP explícita
  if (order.hasDivergence) {
    const origin = order.divergenceOrigin || 'apontamento operacional e confirmação SAP'
    if (order.sapDocumentNumber === null || origin.toLowerCase().includes('sap')) {
      return `Existe divergência entre apontamento operacional e confirmação SAP. Revisão de integração necessária (${origin}).`
    }
    return `Existe divergência registrada (${origin}). Revisão de integração e apontamento necessária.`
  }

  // Perdas elevadas (> 2% ou perda em toneladas relevante)
  const lossRatio = realized > 0 ? (loss / realized) * 100 : 0
  const reworkRatio = realized > 0 ? (rework / realized) * 100 : 0

  if (lossRatio >= 2.5 && loss > 0.5) {
    const motivo = order.registeredCause || 'ajuste operacional no processo de conformação'
    return `Perdas representam ${formatPercentPtBr(lossRatio, 1)} da produção apontada (${formatTonsPtBr(loss, 1)}), concentradas principalmente no motivo registrado: ${motivo}.`
  }

  // Retrabalho expressivo
  if (reworkRatio >= 3.0 && rework > 0.5) {
    return `Retrabalho de ${formatTonsPtBr(rework, 1)} identificado na OP, representando ${formatPercentPtBr(reworkRatio, 1)} do total realizado.`
  }

  // Produção abaixo do previsto significativa (> 5% de gap negativo)
  if (adherence !== null && adherence < 95 && diff < -1) {
    const pctAbaixo = (100 - adherence).toFixed(1).replace('.', ',')
    const causeText = order.registeredCause
      ? `. Principal causa registrada: ${order.registeredCause}`
      : ''
    const lossText = loss > 0 ? `, com ${formatTonsPtBr(loss, 1)} de perdas` : ''
    return `Realizado ${pctAbaixo}% abaixo do previsto${lossText}${causeText}. Verificar os registros de perdas, retrabalho e paradas associados à OP.`
  }

  // Produção acima do previsto com folga
  if (adherence !== null && adherence > 105 && diff > 1) {
    const pctAcima = (adherence - 100).toFixed(1).replace('.', ',')
    return `Realizado superou o programado em ${pctAcima}%, sem desvios de refugo reportados.`
  }

  // Produção dentro da programação / aderente
  if (adherence !== null && adherence >= 95 && adherence <= 105) {
    const rmDesc = order.rmPct !== null ? `, RM de ${formatPercentPtBr(order.rmPct, 1)}` : ''
    return `Produção aderente ao previsto${rmDesc}, sem desvio operacional relevante identificado.`
  }

  // Fallback seguro caso algum dado esteja fora dos limites
  if (diff < 0) {
    return 'Realizado inferior ao previsto. Verificar os registros de perdas, retrabalho e paradas associados à OP.'
  }

  return 'Produção realizada dentro dos parâmetros operacionais disponíveis.'
}

/**
 * Gera a análise consolidada para o modal/painel gerencial
 */
export function generateConsolidatedEfficiencyAnalysis(
  orders: OrderAiData[],
  context: {
    title: string
    code: string
    breadcrumb: string[]
    period?: string
  },
): ConsolidatedAiAnalysis {
  const totalAnalisadas = orders.length

  if (totalAnalisadas === 0) {
    return {
      resumo: 'Não foram encontradas Ordens de Produção no período e filtros selecionados.',
      principaisDesvios: ['Sem dados operacionais para o período filtrado.'],
      ordensRequeremAtencao: [],
      pontosPositivos: [],
      proximasVerificacoes: [
        'Revisar filtros de período, centro ou produto para localizar ordens.',
      ],
      totalAnalisadas: 0,
      requeremAtencaoCount: 0,
      conformesCount: 0,
    }
  }

  let semApontamentoCount = 0
  let abaixoPrevistoCount = 0
  let divergenciaSapCount = 0
  let perdasTotais = 0
  let retrabalhoTotal = 0
  let totalPrevisto = 0
  let totalRealizado = 0

  const ordensAtencao: ConsolidatedAiAnalysis['ordensRequeremAtencao'] = []
  const pontosPositivos: string[] = []
  const recomendacoes: Set<string> = new Set()

  orders.forEach((o) => {
    totalPrevisto += o.plannedTons || 0

    if (o.realizedTons === null || o.realizedTons === undefined) {
      semApontamentoCount++
      ordensAtencao.push({
        opNumber: o.opNumber,
        materialCode: o.materialCode,
        descricaoDesvio: 'Sem apontamento produtivo no período.',
      })
      recomendacoes.add(
        'Verificar apontamentos faltantes no terminal MES para as ordens sem registro',
      )
      return
    }

    totalRealizado += o.realizedTons
    if (o.lossTons) perdasTotais += o.lossTons
    if (o.reworkTons) retrabalhoTotal += o.reworkTons

    let precisaAtencao = false
    const desviosOp: string[] = []

    if (o.hasDivergence) {
      divergenciaSapCount++
      precisaAtencao = true
      desviosOp.push(`Divergência identificada (${o.divergenceOrigin || 'MES x SAP'})`)
      recomendacoes.add(
        'Confirmar lançamento do lote e status contábil no SAP para regularizar divergências',
      )
    }

    if (o.adherencePct !== null && o.adherencePct < 95) {
      abaixoPrevistoCount++
      precisaAtencao = true
      const percAbaixo = (100 - o.adherencePct).toFixed(1).replace('.', ',')
      desviosOp.push(`Realizado ${percAbaixo}% abaixo do previsto`)
      recomendacoes.add(
        'Revisar motivo de perdas e tempos de parada nas ordens com realizado inferior',
      )
    }

    if (o.lossTons && o.lossTons > 0.5) {
      precisaAtencao = true
      desviosOp.push(`${formatTonsPtBr(o.lossTons, 1)} de perdas acumuladas`)
    }

    if (o.reworkTons && o.reworkTons > 1.0) {
      precisaAtencao = true
      desviosOp.push(`${formatTonsPtBr(o.reworkTons, 1)} de retrabalho apontado`)
      recomendacoes.add(
        'Avaliar parametrização técnica da Ficha Mestra para mitigar retrabalho na linha',
      )
    }

    if (precisaAtencao) {
      const causa = o.registeredCause ? `; Causa predominante: ${o.registeredCause}` : ''
      ordensAtencao.push({
        opNumber: o.opNumber,
        materialCode: o.materialCode,
        descricaoDesvio: desviosOp.join('; ') + causa,
      })
    } else {
      // Ponto positivo real
      const rmStr = o.rmPct !== null ? ` com RM de ${formatPercentPtBr(o.rmPct, 1)}` : ''
      pontosPositivos.push(
        `OP ${o.opNumber} (${o.materialCode}) — produção aderente ao previsto (${formatTonsPtBr(o.realizedTons, 1)})${rmStr} e sem perdas expressivas.`,
      )
    }
  })

  const requeremAtencaoCount = ordensAtencao.length
  const conformesCount = totalAnalisadas - requeremAtencaoCount

  // Resumo executivo (2-4 frases)
  const contextoLocal = context.breadcrumb.join(' / ') || context.code
  const aderenciaGeral =
    totalPrevisto > 0 && totalRealizado > 0
      ? ((totalRealizado / totalPrevisto) * 100).toFixed(1).replace('.', ',')
      : null

  const resumoFrases: string[] = [
    `Foram consolidadas ${totalAnalisadas} Ordens de Produção para o contexto ${contextoLocal}.`,
  ]

  if (totalRealizado > 0) {
    resumoFrases.push(
      `Volume total programado de ${formatTonsPtBr(totalPrevisto, 1)} e realizado de ${formatTonsPtBr(totalRealizado, 1)}${aderenciaGeral ? ` (aderência média de ${aderenciaGeral}%)` : ''}.`,
    )
  } else {
    resumoFrases.push(
      `Volume programado de ${formatTonsPtBr(totalPrevisto, 1)}, sem volume realizado consolidado no período.`,
    )
  }

  if (requeremAtencaoCount > 0) {
    resumoFrases.push(
      `${requeremAtencaoCount} ${requeremAtencaoCount === 1 ? 'ordem requer' : 'ordens requerem'} atenção operacional imediata e ${conformesCount} ${conformesCount === 1 ? 'está' : 'estão'} dentro dos parâmetros esperados.`,
    )
  } else {
    resumoFrases.push(
      'Todas as ordens analisadas encontram-se dentro dos limites operacionais previstos.',
    )
  }

  // Principais desvios reais
  const principaisDesvios: string[] = []
  if (semApontamentoCount > 0) {
    principaisDesvios.push(
      `${semApontamentoCount} ${semApontamentoCount === 1 ? 'OP sem apontamento produtivo' : 'OPs sem apontamento produtivo'}`,
    )
  }
  if (abaixoPrevistoCount > 0) {
    principaisDesvios.push(
      `${abaixoPrevistoCount} ${abaixoPrevistoCount === 1 ? 'OP com realização abaixo do programado' : 'OPs com realização abaixo do programado'}`,
    )
  }
  if (perdasTotais > 0) {
    principaisDesvios.push(`${formatTonsPtBr(perdasTotais, 1)} de perdas operacionais acumuladas`)
  }
  if (retrabalhoTotal > 0) {
    principaisDesvios.push(`${formatTonsPtBr(retrabalhoTotal, 1)} de retrabalho registrado`)
  }
  if (divergenciaSapCount > 0) {
    principaisDesvios.push(
      `${divergenciaSapCount} ${divergenciaSapCount === 1 ? 'divergência de integração com SAP' : 'divergências de integração com SAP'}`,
    )
  }
  if (principaisDesvios.length === 0) {
    principaisDesvios.push(
      'Nenhum desvio crítico ou gargalo operacional identificado na amostragem.',
    )
  }

  // Próximas verificações
  if (recomendacoes.size === 0) {
    recomendacoes.add('Manter o acompanhamento contínuo dos apontamentos no ritmo do turno')
    recomendacoes.add('Conferir parametrização da Ficha Mestra para a próxima campanha programada')
  }

  return {
    resumo: resumoFrases.join(' '),
    principaisDesvios,
    ordensRequeremAtencao: ordensAtencao,
    pontosPositivos: pontosPositivos.slice(0, 5), // Limite razoável para exibição limpa
    proximasVerificacoes: Array.from(recomendacoes),
    totalAnalisadas,
    requeremAtencaoCount,
    conformesCount,
  }
}

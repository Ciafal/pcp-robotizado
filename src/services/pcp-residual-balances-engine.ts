/**
 * Motor Matemático e de Classificação de Saldos Residuais
 *
 * Regras Obrigatórias do Negócio:
 * 1. MÚLTIPLOS parâmetros por depósito (avalia todas as regras ativas do depósito).
 * 2. PRIORIDADE:
 *    - 1º: Maior criticidade (CRITICA > ALTA > MEDIA > BAIXA).
 *    - 2º: Em caso de empate, regra mais específica (FAIXA > MENOR_OU_IGUAL / MAIOR_OU_IGUAL > MENOR_QUE / MAIOR_QUE).
 *    - Todas as regras atingidas são registradas no item para transparência e auditoria.
 * 3. REGULARIZAÇÃO AUTOMÁTICA:
 *    - Se um saldo anteriormente identificado deixar de atender ao critério de residual
 *      por atualização na quantidade, NÃO apaga o alerta: marca como 'REGULARIZADO_AUTOMATICO'
 *      preservando quantidade anterior, quantidade atual, regra que estava ativa e rastreabilidade.
 */

import {
  ResidualBalanceParameter,
  ResidualBalanceItem,
  ResidualBalanceRuleType,
  ResidualBalanceCriticality,
  RuleMatchInfo,
  RawStockItem,
} from '../types/pcp-residual-balances'

const CRITICALITY_WEIGHT: Record<ResidualBalanceCriticality, number> = {
  CRITICA: 4,
  ALTA: 3,
  MEDIA: 2,
  BAIXA: 1,
}

const RULE_SPECIFICITY: Record<ResidualBalanceRuleType, number> = {
  FAIXA_QUANTIDADE: 5,
  MENOR_OU_IGUAL: 4,
  MAIOR_OU_IGUAL: 4,
  MENOR_QUE: 3,
  MAIOR_QUE: 3,
}

/**
 * Converte unidade para comparação se necessário (ex.: t para kg).
 * Se as unidades forem iguais, retorna 1. Se t -> kg retorna 1000. Se kg -> t retorna 0.001.
 */
export function normalizeUnitConversion(qty: number, fromUnit: string, toUnit: string): number {
  const from = fromUnit.trim().toLowerCase()
  const to = toUnit.trim().toLowerCase()
  if (from === to) return qty

  if (from === 't' && to === 'kg') return qty * 1000
  if (from === 'kg' && to === 't') return qty / 1000
  if (from === 'ton' && to === 'kg') return qty * 1000
  if (from === 'kg' && to === 'ton') return qty / 1000

  return qty
}

/**
 * Avalia se uma quantidade atende à condição de uma regra de parâmetro
 */
export function testRuleMatch(
  param: ResidualBalanceParameter,
  stockQty: number,
  stockUnit: string,
): { matches: boolean; diff: number; limit: number } {
  if (!param.ativo || param.excluido_logico) {
    return { matches: false, diff: 0, limit: 0 }
  }

  // Normalizar quantidade do estoque para a unidade do parâmetro
  const normalizedStock = normalizeUnitConversion(stockQty, stockUnit, param.unidade_medida)

  let matches = false
  let limit = 0
  let diff = 0

  switch (param.tipo_regra) {
    case 'MENOR_OU_IGUAL': {
      limit = param.quantidade ?? 0
      matches = normalizedStock <= limit
      diff = limit - normalizedStock
      break
    }
    case 'MENOR_QUE': {
      limit = param.quantidade ?? 0
      matches = normalizedStock < limit
      diff = limit - normalizedStock
      break
    }
    case 'MAIOR_OU_IGUAL': {
      limit = param.quantidade ?? 0
      matches = normalizedStock >= limit
      diff = normalizedStock - limit
      break
    }
    case 'MAIOR_QUE': {
      limit = param.quantidade ?? 0
      matches = normalizedStock > limit
      diff = normalizedStock - limit
      break
    }
    case 'FAIXA_QUANTIDADE': {
      const min = param.quantidade_min ?? 0
      const max = param.quantidade_max ?? 0
      matches = normalizedStock >= min && normalizedStock <= max
      limit = max
      diff = max - normalizedStock
      break
    }
  }

  return { matches, diff, limit }
}

/**
 * Classifica um item de estoque contra os parâmetros ativos de seu depósito
 */
export function classifyStockItem(
  stock: RawStockItem,
  parameters: ResidualBalanceParameter[],
  existingResidual?: ResidualBalanceItem | null,
): ResidualBalanceItem {
  const nowIso = new Date().toISOString()
  const depParams = parameters.filter(
    (p) =>
      p.deposito.trim().toUpperCase() === stock.deposito.trim().toUpperCase() &&
      p.ativo &&
      !p.excluido_logico,
  )

  const matchedRules: RuleMatchInfo[] = []

  for (const param of depParams) {
    const { matches, diff, limit } = testRuleMatch(
      param,
      stock.quantidade_atual,
      stock.unidade_medida,
    )
    if (matches) {
      const prazoStr =
        param.prazo_valor != null && param.prazo_valor > 0
          ? `${param.prazo_valor} ${param.prazo_unidade === 'DIAS' ? 'dias' : 'h'}`
          : undefined

      matchedRules.push({
        regra_id: param.id,
        descricao: param.descricao,
        criticidade: param.criticidade,
        limite_parametrizado: limit,
        diferenca: diff,
        acao_recomendada: param.acao_recomendada,
        responsavel_acao: param.responsavel_acao,
        prazo_display: prazoStr,
        regra_especificidade: RULE_SPECIFICITY[param.tipo_regra] || 1,
      })
    }
  }

  // Ordenar regras atingidas por prioridade:
  // 1º Maior criticidade
  // 2º Maior especificidade
  matchedRules.sort((a, b) => {
    const weightDiff = CRITICALITY_WEIGHT[b.criticidade] - CRITICALITY_WEIGHT[a.criticidade]
    if (weightDiff !== 0) return weightDiff
    return b.regra_especificidade - a.regra_especificidade
  })

  const primaryRule = matchedRules[0]

  // Se já existia um registro anterior
  const previousStatus = existingResidual?.status
  const previousQty = existingResidual?.quantidade_atual

  // Caso 1: Nenhuma regra atingida
  if (!primaryRule) {
    // Se anteriormente era um saldo residual ativo (não regularizado), agora regularizou automaticamente
    if (
      existingResidual &&
      (previousStatus === 'SALDO_RESIDUAL_IDENTIFICADO' ||
        previousStatus === 'ACAO_NECESSARIA' ||
        previousStatus === 'EM_TRATAMENTO')
    ) {
      return {
        ...existingResidual,
        quantidade_anterior: previousQty,
        quantidade_atual: stock.quantidade_atual,
        status: 'REGULARIZADO_AUTOMATICO',
        ultima_atualizacao: nowIso,
        ultima_atualizacao_origem: 'REGULARIZACAO_AUTOMATICA_QUANTIDADE',
        regras_atingidas: [],
      }
    }

    return {
      id: existingResidual?.id,
      deposito: stock.deposito,
      deposito_nome: stock.deposito_nome,
      material_codigo: stock.material_codigo,
      material_descricao: stock.material_descricao,
      lote: stock.lote,
      quantidade_atual: stock.quantidade_atual,
      unidade_medida: stock.unidade_medida,
      data_identificacao: existingResidual?.data_identificacao || nowIso,
      status: 'DENTRO_PARAMETRO',
      regras_atingidas: [],
      ultima_atualizacao: nowIso,
    }
  }

  // Caso 2: Pelo menos uma regra atingida
  // Preservar status de tratamento se já estiver em andamento ou regularizado manualmente
  let status: ResidualBalanceItem['status'] = 'SALDO_RESIDUAL_IDENTIFICADO'

  if (primaryRule.criticidade === 'CRITICA' || primaryRule.criticidade === 'ALTA') {
    status = 'ACAO_NECESSARIA'
  }

  if (existingResidual) {
    if (existingResidual.status === 'EM_TRATAMENTO') {
      status = 'EM_TRATAMENTO'
    } else if (existingResidual.status === 'REGULARIZADO') {
      status = 'REGULARIZADO'
    }
  }

  const dataIdentificacao = existingResidual?.data_identificacao || nowIso

  return {
    id: existingResidual?.id,
    deposito: stock.deposito,
    deposito_nome: stock.deposito_nome,
    material_codigo: stock.material_codigo,
    material_descricao: stock.material_descricao,
    lote: stock.lote,
    quantidade_atual: stock.quantidade_atual,
    unidade_medida: stock.unidade_medida,
    limite_parametrizado: primaryRule.limite_parametrizado,
    diferenca: primaryRule.diferenca,
    data_identificacao: dataIdentificacao,
    status,
    regra_aplicada_id: primaryRule.regra_id,
    regra_aplicada_descricao: primaryRule.descricao,
    regras_atingidas: matchedRules,
    acao_recomendada: primaryRule.acao_recomendada,
    responsavel_acao: primaryRule.responsavel_acao || existingResidual?.responsavel_acao,
    criticidade: primaryRule.criticidade,
    prazo_display: primaryRule.prazo_display,
    tempo_como_residual_display: formatTimeSinceIdentification(dataIdentificacao),
    ultima_atualizacao: nowIso,
    quantidade_anterior: previousQty !== stock.quantidade_atual ? previousQty : undefined,
  }
}

/**
 * Calcula o tempo transcorrido em formato legível pt-BR
 */
export function formatTimeSinceIdentification(isoDate: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime()
    if (isNaN(diffMs) || diffMs < 0) return 'Recente'

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (totalHours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60))
      return `${Math.max(minutes, 1)} min`
    }
    if (totalHours < 24) {
      return `${totalHours} h`
    }
    const days = Math.floor(totalHours / 24)
    const remHours = totalHours % 24
    if (remHours === 0) return `${days} dias`
    return `${days}d ${remHours}h`
  } catch (_) {
    return '-'
  }
}

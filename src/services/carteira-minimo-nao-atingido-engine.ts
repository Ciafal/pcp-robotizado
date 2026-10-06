/**
 * MOTOR CENTRAL DETERMINÍSTICO DE MÍNIMO NÃO ATINGIDO
 * PCP Robotizado HUB CIAFAL (React + Vite + TS)
 *
 * Responsabilidades:
 * 1. Agrupamento determinístico por (material + centro + linha + regra industrial).
 * 2. Consolidação de todos os pedidos abertos do mesmo material antes de testar o mínimo
 *    (nunca avaliar pedido individual quando formam a mesma campanha de produção).
 * 3. Quantidade considerada para programação:
 *      Qtd considerada = max(0, carteira_tons - estoque_disponivel_tons)
 *      ou qtd_considerada = carteira_tons + estoque_disponivel_tons dependendo da regra,
 *      mas rigorosamente: para programação de produção industrial, a necessidade líquida
 *      a produzir = max(0, carteira_tons - estoque_disponivel_tons) + programado_tons já existente
 *      OU quantidade total para rodar na campanha = saldo_a_produzir.
 *      Quando a campanha considera a carteira inteira do material:
 *      Qtd considerada para programação = saldo_a_produzir (ou carteira se sem estoque dedutível).
 *      Fórmula exata especificada:
 *        Déficit = Mínimo - Quantidade considerada para programação
 *        Exibir SOMENTE quando Déficit > 0 (Déficit = Mínimo - Qtd > 0, ou seja, Qtd < Mínimo).
 * 4. Status determinístico:
 *    - 'Crítico': Prazo curto (≤ 3 dias ou atrasado), curva A ou déficit > 60% do lote mínimo com prazo vencendo.
 *    - 'Aguardando composição de lote': Déficit substancial (Qtd < 70% do mínimo) com prazo disponível para agrupamento.
 *    - 'Próximo do mínimo': Qtd ≥ 70% do lote mínimo (déficit ≤ 30% do mínimo).
 * 5. Cadeia de precedência da fonte do mínimo (sem novas tabelas/campos):
 *    (1) Restrições de bitola ativas por linha (LineGaugeMinRestriction via line-gauge-restriction-service / gauge-restriction-evaluation)
 *    (2) min_batch_size da linha (production_lines / line_masters)
 *    (3) Regras centrais carteira_regras_config / DEFAULT_CIAFAL_RULES (RULE_LM_L1, RULE_LM_L2_ROUND, RULE_LM_SDC_DIA),
 *        convertendo por produtividade t/h da Ficha Mestra quando a regra for em tempo/horas.
 *    (4) Parâmetro producao_minima_tons do carteira-minima-service.ts (RFC Z_RFC_CARTEIRA_MINIMA_PROD) ou default industrial (15.0 t).
 * 6. Suporte às 5 visões:
 *    - Geral: todos os elegíveis da carteira consolidada
 *    - L1: roteados Linha 1 (linha === 'L1' ou iniciais C, Q, R, V)
 *    - L2: roteados Linha 2 (linha === 'L2' ou iniciais R, Q, B, S)
 *    - MTO: classificados MTO com vínculo do pedido
 *    - SDC: carteira Sidercentro/SDC (SDPL)
 */

import { CarteiraItem } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { LineGaugeMinRestriction } from '@/types/line-gauge-restriction'
import { unifiedRulesEngine } from './unified-rules-engine'
import { pcpAuditService } from './pcp-audit-service'

export type StatusMinimoNaoAtingido =
  | 'Crítico'
  | 'Aguardando composição de lote'
  | 'Próximo do mínimo'

export interface PedidoComposicaoMinimo {
  ordem_venda: string
  item_ordem: string
  cliente: string
  quantidade_tons: number
  data_desejada?: string
}

export interface ItemMinimoNaoAtingido {
  id: string
  chave_agrupamento: string
  codigo_material: string
  descricao_material: string
  cliente: string // Principal cliente ou múltiplos ("CIAFAL + 2 clientes")
  clientes_lista: string[]
  pedidos: PedidoComposicaoMinimo[]
  pedidos_count: number
  centro: string
  linha: string
  tipo_carteira: 'Geral' | 'L1' | 'L2' | 'MTO' | 'SDC'
  curva_abc: 'A' | 'B' | 'C'

  // Volumes quantitativos
  carteira_tons: number
  estoque_disponivel_tons: number
  programado_tons: number
  qtd_considerada_programacao_tons: number

  // Mínimo e déficit
  minimo_necessario_tons: number
  fonte_minimo: string
  deficit_tons: number
  deficit_formatado: string
  unidade: string // sempre 't'

  // Prazo e status
  data_necessidade?: string
  dias_restantes?: number
  status: StatusMinimoNaoAtingido
  motivo_status: string

  // Análise IA
  analise_ia: {
    diagnostico: string
    recomendacoes: string[]
  }

  // Drilldown multi-seção
  detalhe_comercial: {
    total_pedidos: number
    faturamento_estimado_brl: number
    clientes_principais: Array<{ nome: string; quantidade_tons: number }>
    data_mais_urgente?: string
  }
  detalhe_pcp: {
    linha_sugerida: string
    cadencia_th?: number
    horas_necessarias_lote?: number
    regra_aplicada: string
  }
  detalhe_estoque: {
    estoque_livre_tons: number
    estoque_mto_tons: number
    estoque_semiacabado_tons: number
  }
  detalhe_historico: {
    observacoes: string[]
  }
}

export interface MinimoNaoAtingidoSummary {
  total_materiais: number
  total_deficit_tons: number
  total_carteira_tons: number
  total_qtd_considerada_tons: number
  criticos_count: number
  aguardando_lote_count: number
  proximo_minimo_count: number
  card_principal_texto: string // Ex: "5 itens"
  card_adicional_texto: string // Ex: "Déficit para mínimo: 42,50 t"
  itens: ItemMinimoNaoAtingido[]
}

export interface MinimoResolutionContext {
  activeGaugeRestrictions?: LineGaugeMinRestriction[]
  lineMinBatchSizes?: Record<string, number> // line_code -> min_batch_size
  lineProductivityRates?: Record<string, number> // line_code -> t/h
  regraFallbackMinimoTons?: number // default 15.0 t
}

/**
 * Arredonda para 2 casas decimais (padrão toneladas exibição pt-BR)
 */
export function round2(num: number): number {
  if (typeof num !== 'number' || isNaN(num)) return 0
  return Math.round(num * 100) / 100
}

/**
 * Formata número no padrão brasileiro com 2 casas decimais (ex: 42,50)
 */
export function formatPtBr(num: number): string {
  const rounded = round2(num)
  return rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Determina a fonte e valor do lote mínimo em toneladas segundo a cadeia de precedência:
 * (1) Restrições ativas de bitola (LineGaugeMinRestriction)
 * (2) min_batch_size da production_lines / line_masters
 * (3) Regras centrais carteira_regras_config / DEFAULT_CIAFAL_RULES (RULE_LM_L1, RULE_LM_L2_ROUND, RULE_LM_SDC_DIA)
 *     convertendo por produtividade t/h da Ficha Mestra quando a regra for em tempo/horas
 * (4) Parâmetro producao_minima_tons do carteira-minima-service.ts (RFC Z_RFC_CARTEIRA_MINIMA_PROD) ou default industrial (15.0 t)
 */
export function resolverMinimoNecessario(params: {
  material: string
  linha: string
  centro: string
  gaugeMm?: number
  context?: MinimoResolutionContext
}): { minimoTons: number; fonte: string; regraAplicada: string } {
  const { material, linha, centro, gaugeMm, context } = params
  const linhaNorm = (linha || '').trim().toUpperCase()
  const centroNorm = (centro || '').trim().toUpperCase()

  // (1) Restrições de bitola por linha (line_gauge_min_restrictions)
  if (context?.activeGaugeRestrictions && context.activeGaugeRestrictions.length > 0) {
    const matching = context.activeGaugeRestrictions.filter(
      (r) =>
        r.status === 'ATIVA' &&
        (r.line_code?.toUpperCase() === linhaNorm || r.line_code?.toUpperCase() === centroNorm),
    )

    for (const rule of matching) {
      const minVal = Number(rule.min_value) || 0
      if (minVal > 0) {
        const type = (rule.restriction_type || '').toUpperCase()
        if (type === 'QUANTIDADE' || rule.unit_of_measure === 't') {
          return {
            minimoTons: round2(minVal),
            fonte: `Restrição de Bitola (${rule.line_code} - ${rule.rule_description || 'Mínimo Quantidade'})`,
            regraAplicada: rule.rule_description || 'Line Gauge Restriction (t)',
          }
        }
        if (type === 'HORAS' || rule.unit_of_measure === 'h') {
          const rate =
            context?.lineProductivityRates?.[linhaNorm] ||
            unifiedRulesEngine.getExpectedProductivity(linhaNorm, gaugeMm)
          const tons = minVal * rate
          return {
            minimoTons: round2(tons),
            fonte: `Restrição de Bitola (${minVal}h @ ${rate.toFixed(1)} t/h)`,
            regraAplicada: `${rule.rule_description || 'Line Gauge Restriction (Horas)'} = ${tons.toFixed(1)} t`,
          }
        }
        if (type === 'DIAS' || rule.unit_of_measure?.includes('dia')) {
          const rate =
            context?.lineProductivityRates?.[linhaNorm] ||
            unifiedRulesEngine.getExpectedProductivity(linhaNorm, gaugeMm)
          const tons = minVal * 24 * rate
          return {
            minimoTons: round2(tons),
            fonte: `Restrição de Bitola (${minVal} dia(s) @ 24h = ${tons.toFixed(1)} t)`,
            regraAplicada: `${rule.rule_description || 'Line Gauge Restriction (Dias)'}`,
          }
        }
      }
    }
  }

  // (2) min_batch_size da production_lines / line_masters
  if (context?.lineMinBatchSizes && context.lineMinBatchSizes[linhaNorm] !== undefined) {
    const batchSize = Number(context.lineMinBatchSizes[linhaNorm])
    if (batchSize > 0) {
      return {
        minimoTons: round2(batchSize),
        fonte: `Ficha Mestra Linha ${linhaNorm} (min_batch_size)`,
        regraAplicada: `Lote mínimo cadastral da linha ${linhaNorm}`,
      }
    }
  }

  // (3) Regras centrais carteira_regras_config / unifiedRulesEngine
  // L1: RULE_LM_L1 (3 horas de produção)
  if (linhaNorm === 'L1') {
    const ruleL1 = unifiedRulesEngine.getRuleByCode('LOTE_MINIMO_L1_HORAS')
    const minHours = ruleL1?.minValue ?? 3.0
    const prodTh =
      context?.lineProductivityRates?.['L1'] ||
      unifiedRulesEngine.getExpectedProductivity('L1', gaugeMm)
    const minTons = minHours * prodTh // 3.0 * 22.5 = 67.5 t ou calibrado
    return {
      minimoTons: round2(minTons),
      fonte: `Regra Central RULE_LM_L1 (${minHours}h @ ${prodTh.toFixed(1)} t/h)`,
      regraAplicada: ruleL1?.ruleName || 'Lote Mínimo L1 (3 horas)',
    }
  }

  // L2: RULE_LM_L2_ROUND (6 horas redondos / 4 horas baixa carteira)
  if (linhaNorm === 'L2') {
    const ruleL2 = unifiedRulesEngine.getRuleByCode('LOTE_MINIMO_L2_REDONDOS')
    const minHours = ruleL2?.minValue ?? 6.0
    const prodTh =
      context?.lineProductivityRates?.['L2'] ||
      unifiedRulesEngine.getExpectedProductivity('L2', gaugeMm)
    const minTons = minHours * prodTh // 6.0 * 25.0 = 150.0 t
    return {
      minimoTons: round2(minTons),
      fonte: `Regra Central RULE_LM_L2_ROUND (${minHours}h @ ${prodTh.toFixed(1)} t/h)`,
      regraAplicada: ruleL2?.ruleName || 'Lote Mínimo L2 Redondos (6 horas)',
    }
  }

  // SDC: RULE_LM_SDC_DIA (24 horas / 1 dia contínuo)
  if (linhaNorm === 'SDC' || centroNorm === 'SDPL') {
    const ruleSDC = unifiedRulesEngine.getRuleByCode('LOTE_MINIMO_SDC_DIA')
    const minHours = ruleSDC?.minValue ?? 24.0
    const prodTh =
      context?.lineProductivityRates?.['SDC'] ||
      unifiedRulesEngine.getExpectedProductivity('SDC', gaugeMm)
    const minTons = minHours * prodTh // 24h * 18 t/h = 432 t ou lote de campanha 30 t
    // Quando regra for muito alta para item isolado, respeita parametrização de lote mínimo
    return {
      minimoTons: round2(minTons),
      fonte: `Regra Central RULE_LM_SDC_DIA (${minHours}h @ ${prodTh.toFixed(1)} t/h)`,
      regraAplicada: ruleSDC?.ruleName || 'Lote Mínimo SDC (1 dia de produção)',
    }
  }

  // (4) Parâmetro producao_minima_tons do carteira-minima-service.ts (RFC Z_RFC_CARTEIRA_MINIMA_PROD)
  const fallback = context?.regraFallbackMinimoTons ?? 15.0
  return {
    minimoTons: round2(fallback),
    fonte: `Parâmetro Industrial RFC Z_RFC_CARTEIRA_MINIMA_PROD (${fallback.toFixed(2)} t)`,
    regraAplicada: 'Padrão Geral Carteira Mínima Produção',
  }
}

/**
 * Normaliza data ISO / YYYY-MM-DD para objeto Date seguro
 */
function parseDateSegura(dataStr?: string): Date | null {
  if (!dataStr) return null
  const clean = dataStr.split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    if (!isNaN(d.getTime())) return d
  }
  return null
}

/**
 * Calcula a diferença em dias entre uma data alvo e hoje
 */
function calcularDiasAte(dataStr?: string, hojeRef?: Date): number | undefined {
  const d = parseDateSegura(dataStr)
  if (!d) return undefined
  const hoje = hojeRef ? new Date(hojeRef) : new Date()
  hoje.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diffMs = d.getTime() - hoje.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Classifica o status do item de acordo com a proximidade do lote mínimo e urgência
 */
export function classificarStatusMinimo(params: {
  qtdConsideradaTons: number
  minimoNecessarioTons: number
  deficitTons: number
  diasRestantes?: number
  curvaAbc?: string
}): { status: StatusMinimoNaoAtingido; motivo: string } {
  const { qtdConsideradaTons, minimoNecessarioTons, deficitTons, diasRestantes, curvaAbc } = params

  if (minimoNecessarioTons <= 0 || deficitTons <= 0) {
    return {
      status: 'Próximo do mínimo',
      motivo: 'Mínimo atingido ou sem déficit.',
    }
  }

  const pctAtingido = (qtdConsideradaTons / minimoNecessarioTons) * 100

  // 1. CRÍTICO:
  // - Dias restantes vencidos ou ≤ 3 dias
  // - Ou Curva A com dias restantes ≤ 7 dias
  // - Ou déficit muito alto (> 60% do lote) com prazo curto (≤ 7 dias)
  if (
    diasRestantes !== undefined &&
    (diasRestantes <= 3 ||
      (curvaAbc === 'A' && diasRestantes <= 7) ||
      (pctAtingido < 40 && diasRestantes <= 7))
  ) {
    const diasTxt =
      diasRestantes < 0
        ? `Prazo vencido há ${Math.abs(diasRestantes)} dia(s)`
        : `Prazo crítico de ${diasRestantes} dia(s)`
    return {
      status: 'Crítico',
      motivo: `${diasTxt}. Falta ${formatPtBr(deficitTons)} t para viabilizar programação da linha sem gerar atraso ao cliente.`,
    }
  }

  // 2. PRÓXIMO DO MÍNIMO:
  // - Qtd considerada ≥ 70% do lote mínimo (déficit ≤ 30% do mínimo)
  if (pctAtingido >= 70) {
    return {
      status: 'Próximo do mínimo',
      motivo: `Carteira atinge ${pctAtingido.toFixed(1)}% do lote mínimo. Faltam apenas ${formatPtBr(deficitTons)} t para atingir ${formatPtBr(minimoNecessarioTons)} t.`,
    }
  }

  // 3. AGUARDANDO COMPOSIÇÃO DE LOTE:
  // - Déficit substancial (Qtd < 70% do mínimo) com prazo disponível para agrupamento comercial
  return {
    status: 'Aguardando composição de lote',
    motivo: `Volume de ${formatPtBr(qtdConsideradaTons)} t (${pctAtingido.toFixed(1)}% do mínimo). Aguardando consolidação de novas ordens comerciais ou antecipação.`,
  }
}

/**
 * Construtor da análise IA estrita baseada exclusivamente nos fatos do item
 */
function construirAnaliseIA(item: {
  material: string
  descricao: string
  carteira: number
  estoque: number
  programado: number
  qtdConsiderada: number
  minimo: number
  deficit: number
  status: StatusMinimoNaoAtingido
  linha: string
  centro: string
  pedidosCount: number
}): { diagnostico: string; recomendacoes: string[] } {
  const pct = item.minimo > 0 ? ((item.qtdConsiderada / item.minimo) * 100).toFixed(1) : '0.0'
  const diagnostico =
    `Item classificado com status [${item.status.toUpperCase()}]. ` +
    `Volume total da carteira em ${formatPtBr(item.carteira)} t (consolidado de ${item.pedidosCount} pedido(s) abertos). ` +
    `Considerando o estoque livre (${formatPtBr(item.estoque)} t) e quantidade já programada (${formatPtBr(item.programado)} t), ` +
    `o saldo apurado para a campanha é de ${formatPtBr(item.qtdConsiderada)} t (${pct}% do lote mínimo de ${formatPtBr(item.minimo)} t). ` +
    `Déficit apurado: ${formatPtBr(item.deficit)} t.`

  const recomendacoes: string[] = [
    `Verificar com o time comercial a possibilidade de antecipação de pedidos futuros do mesmo material (${item.material}).`,
    `Avaliar a composição de campanha mista de laminação na linha ${item.linha} com materiais de mesma família ou bitola adjacente.`,
    `Consultar no sequenciamento semanal se há ordens em montagem para o centro ${item.centro} onde este lote possa ser acoplado.`,
    `Atenção: Esta recomendação é um apoio analítico do PCP Robotizado. Qualquer alteração em ordens ou programação exige confirmação humana.`,
  ]

  return { diagnostico, recomendacoes }
}

/**
 * REGRA CENTRAL ÚNICA:
 * Processa uma lista genérica de registros (CarteiraItem ou CarteiraSDCItem)
 * e retorna o dataset agrupado determinístico de materiais com mínimo não atingido.
 */
export function calcularMinimoNaoAtingido(params: {
  itens: Array<CarteiraItem | CarteiraSDCItem>
  tipoVisao: 'Geral' | 'L1' | 'L2' | 'MTO' | 'SDC'
  context?: MinimoResolutionContext
  hojeRef?: Date
}): MinimoNaoAtingidoSummary {
  const { itens, tipoVisao, context, hojeRef } = params

  if (!itens || itens.length === 0) {
    return {
      total_materiais: 0,
      total_deficit_tons: 0,
      total_carteira_tons: 0,
      total_qtd_considerada_tons: 0,
      criticos_count: 0,
      aguardando_lote_count: 0,
      proximo_minimo_count: 0,
      card_principal_texto: '0 itens',
      card_adicional_texto: 'Déficit para mínimo: 0,00 t',
      itens: [],
    }
  }

  // 1. Filtragem por visão (quando chamada diretamente sem filtro prévio)
  const itensElegiveis = itens.filter((it) => {
    // Normalização polimórfica CarteiraItem vs CarteiraSDCItem
    const isSDC = 'material' in it && !('codigo_material' in it)
    const mat =
      (isSDC ? (it as CarteiraSDCItem).material : (it as CarteiraItem).codigo_material) || ''
    const linha =
      (isSDC ? (it as CarteiraSDCItem).centro || 'SDC' : (it as CarteiraItem).linha) || ''
    const centro =
      (isSDC ? (it as CarteiraSDCItem).centro_sap || 'SDPL' : (it as CarteiraItem).centro) || ''
    const tipoOrdem = isSDC ? 'SDC' : (it as CarteiraItem).tipo_ordem

    if (tipoVisao === 'Geral') return true

    if (tipoVisao === 'L1') {
      return linha === 'L1' || ['C', 'Q', 'R', 'V'].includes(mat.charAt(0).toUpperCase())
    }

    if (tipoVisao === 'L2') {
      return linha === 'L2' || ['R', 'Q', 'B', 'S'].includes(mat.charAt(0).toUpperCase())
    }

    if (tipoVisao === 'MTO') {
      return tipoOrdem === 'MTO'
    }

    if (tipoVisao === 'SDC') {
      return isSDC || centro === 'SDPL' || linha === 'SDC'
    }

    return true
  })

  // 2. Agrupamento determinístico por (material + centro + linha)
  // Consolidação de todos os pedidos abertos do mesmo material antes de testar o mínimo!
  interface AgrupamentoAcumulado {
    material: string
    descricao: string
    centro: string
    linha: string
    curvaAbc: 'A' | 'B' | 'C'
    carteiraTotal: number
    estoqueLivreTotal: number
    programadoTotal: number
    pedidos: PedidoComposicaoMinimo[]
    clientesSet: Set<string>
    dataMaisUrgente?: string
    faturamentoEstimadoBrl: number
  }

  const grupos = new Map<string, AgrupamentoAcumulado>()

  for (const raw of itensElegiveis) {
    const isSDC = 'material' in raw && !('codigo_material' in raw)
    const sdc = isSDC ? (raw as CarteiraSDCItem) : null
    const standard = !isSDC ? (raw as CarteiraItem) : null

    const mat = (sdc ? sdc.material : standard?.codigo_material) || 'INDEFINIDO'
    const desc = (sdc ? sdc.descricao : standard?.descricao_material) || mat
    const centro = (sdc ? sdc.centro_sap || 'SDPL' : standard?.centro) || '1100'
    const linha = (sdc ? sdc.origem_producao || 'SDC' : standard?.linha) || 'L1'
    const curva = ((sdc ? sdc.curva_abc : standard?.curva_abc) || 'C').toUpperCase() as
      | 'A'
      | 'B'
      | 'C'

    const carteira =
      Number(
        sdc ? sdc.carteira_t : standard?.carteira_aberta_tons || standard?.qtd_ordem_tons || 0,
      ) || 0
    const estoque =
      Number(
        sdc
          ? sdc.estoque_total_t || sdc.estoque_disponivel_t || 0
          : standard?.estoque_livre_tons || 0,
      ) || 0
    const programado =
      Number(
        sdc ? sdc.programado_t || sdc.em_producao_t || 0 : standard?.qtd_programada_tons || 0,
      ) || 0

    const cliente = (sdc ? sdc.empresa || 'Sidercentro' : standard?.nome_cliente) || 'Cliente'
    const ordem = (sdc ? 'SDC-AGRUP' : standard?.ordem_venda) || 'ORDEM'
    const itemOrd = (sdc ? '10' : standard?.item_ordem) || '10'
    const dataDesejada =
      (sdc ? sdc.data_desejada || sdc.data_prevista : standard?.data_desejada) || ''

    // Chave única determinística: material + centro + linha
    const chave = `${mat.trim().toUpperCase()}__${centro.trim().toUpperCase()}__${linha.trim().toUpperCase()}`

    let grupo = grupos.get(chave)
    if (!grupo) {
      grupo = {
        material: mat.trim().toUpperCase(),
        descricao: desc,
        centro: centro.trim().toUpperCase(),
        linha: linha.trim().toUpperCase(),
        curvaAbc: curva,
        carteiraTotal: 0,
        estoqueLivreTotal: 0,
        programadoTotal: 0,
        pedidos: [],
        clientesSet: new Set<string>(),
        dataMaisUrgente: dataDesejada,
        faturamentoEstimadoBrl: 0,
      }
      grupos.set(chave, grupo)
    }

    grupo.carteiraTotal += carteira
    // O estoque é mantido como o maior saldo livre reportado para o material naquele centro
    // (evita somar em dobro o mesmo estoque livre que já pertence ao material)
    if (estoque > grupo.estoqueLivreTotal) {
      grupo.estoqueLivreTotal = estoque
    }
    grupo.programadoTotal += programado

    if (cliente) grupo.clientesSet.add(cliente)

    grupo.pedidos.push({
      ordem_venda: ordem,
      item_ordem: itemOrd,
      cliente,
      quantidade_tons: round2(carteira),
      data_desejada: dataDesejada,
    })

    if (dataDesejada) {
      if (!grupo.dataMaisUrgente || dataDesejada < grupo.dataMaisUrgente) {
        grupo.dataMaisUrgente = dataDesejada
      }
    }
  }

  // 3. Avaliar Mínimo e Déficit para cada grupo consolidado
  const resultados: ItemMinimoNaoAtingido[] = []

  for (const [chave, g] of grupos.entries()) {
    const carteiraConsolidada = round2(g.carteiraTotal)
    const estoqueDisponivel = round2(g.estoqueLivreTotal)
    const programadoConsolidado = round2(g.programadoTotal)

    // Quantidade considerada para programação industrial:
    // Saldo real que necessita de ordem de produção = max(0, carteiraConsolidada - estoqueDisponivel)
    // Se a carteira já estiver parcialmente coberta por estoque, a necessidade real de produção é a diferença.
    // Se não há estoque, é a carteira total.
    const saldoNecessidade = Math.max(0, carteiraConsolidada - estoqueDisponivel)

    // A quantidade considerada para atingir o lote mínimo de produção da campanha é o saldo a produzir
    // (ou a própria carteira se saldoNecessidade > 0)
    const qtdConsiderada = round2(saldoNecessidade > 0 ? saldoNecessidade : carteiraConsolidada)

    // Resolver lote mínimo aplicável pela cadeia de precedência
    const resolucao = resolverMinimoNecessario({
      material: g.material,
      linha: g.linha,
      centro: g.centro,
      context,
    })

    const minimoNecessario = round2(resolucao.minimoTons)

    // Fórmula obrigatória: Déficit = Mínimo - Quantidade considerada para programação
    // Exibir SOMENTE quando Déficit > 0
    const deficit = round2(minimoNecessario - qtdConsiderada)

    // SE deficit <= 0, significa que o mínimo FOI ATINGIDO — fica fora do card!
    if (deficit <= 0) {
      continue
    }

    const diasRestantes = calcularDiasAte(g.dataMaisUrgente, hojeRef)
    const { status, motivo } = classificarStatusMinimo({
      qtdConsideradaTons: qtdConsiderada,
      minimoNecessarioTons: minimoNecessario,
      deficitTons: deficit,
      diasRestantes,
      curvaAbc: g.curvaAbc,
    })

    // Montar texto legível do cliente
    const clientesArr = Array.from(g.clientesSet)
    let clientePrincipal = clientesArr[0] || 'Vários Clientes'
    if (clientesArr.length === 2) {
      clientePrincipal = `${clientesArr[0]} e ${clientesArr[1]}`
    } else if (clientesArr.length > 2) {
      clientePrincipal = `${clientesArr[0]} (+${clientesArr.length - 1} clientes)`
    }

    // Análise IA
    const analiseIa = construirAnaliseIA({
      material: g.material,
      descricao: g.descricao,
      carteira: carteiraConsolidada,
      estoque: estoqueDisponivel,
      programado: programadoConsolidado,
      qtdConsiderada,
      minimo: minimoNecessario,
      deficit,
      status,
      linha: g.linha,
      centro: g.centro,
      pedidosCount: g.pedidos.length,
    })

    // Faturamento estimado referencial (R$ 6.200/t padrão aços longos se não informado)
    const precoMedioT = 6200
    const faturamentoBrl = round2(carteiraConsolidada * precoMedioT)

    const itemResultado: ItemMinimoNaoAtingido = {
      id: `min_nao_atingido_${chave}`,
      chave_agrupamento: chave,
      codigo_material: g.material,
      descricao_material: g.descricao,
      cliente: clientePrincipal,
      clientes_lista: clientesArr,
      pedidos: g.pedidos,
      pedidos_count: g.pedidos.length,
      centro: g.centro,
      linha: g.linha,
      tipo_carteira: tipoVisao,
      curva_abc: g.curvaAbc,
      carteira_tons: carteiraConsolidada,
      estoque_disponivel_tons: estoqueDisponivel,
      programado_tons: programadoConsolidado,
      qtd_considerada_programacao_tons: qtdConsiderada,
      minimo_necessario_tons: minimoNecessario,
      fonte_minimo: resolucao.fonte,
      deficit_tons: deficit,
      deficit_formatado: `Faltam ${formatPtBr(deficit)} t para atingir o mínimo`,
      unidade: 't',
      data_necessidade: g.dataMaisUrgente,
      dias_restantes: diasRestantes,
      status,
      motivo_status: motivo,
      analise_ia: analiseIa,
      detalhe_comercial: {
        total_pedidos: g.pedidos.length,
        faturamento_estimado_brl: faturamentoBrl,
        clientes_principais: clientesArr.map((c) => ({
          nome: c,
          quantidade_tons: round2(
            g.pedidos.filter((p) => p.cliente === c).reduce((s, p) => s + p.quantidade_tons, 0),
          ),
        })),
        data_mais_urgente: g.dataMaisUrgente,
      },
      detalhe_pcp: {
        linha_sugerida: g.linha,
        regra_aplicada: resolucao.regraAplicada,
      },
      detalhe_estoque: {
        estoque_livre_tons: estoqueDisponivel,
        estoque_mto_tons: 0,
        estoque_semiacabado_tons: 0,
      },
      detalhe_historico: {
        observacoes: [
          `Agrupamento determinístico de ${g.pedidos.length} pedido(s) em aberto.`,
          `Fonte do mínimo: ${resolucao.fonte}.`,
        ],
      },
    }

    resultados.push(itemResultado)
  }

  // 4. Ordenar resultados por maior déficit por padrão
  resultados.sort((a, b) => b.deficit_tons - a.deficit_tons)

  // 5. Totalizadores consolidados
  const totalMateriais = resultados.length
  const totalDeficit = round2(resultados.reduce((s, it) => s + it.deficit_tons, 0))
  const totalCarteira = round2(resultados.reduce((s, it) => s + it.carteira_tons, 0))
  const totalQtdCons = round2(
    resultados.reduce((s, it) => s + it.qtd_considerada_programacao_tons, 0),
  )

  const criticos = resultados.filter((r) => r.status === 'Crítico').length
  const aguardando = resultados.filter((r) => r.status === 'Aguardando composição de lote').length
  const proximo = resultados.filter((r) => r.status === 'Próximo do mínimo').length

  const itensTexto = totalMateriais === 1 ? '1 item' : `${totalMateriais} itens`
  const deficitTexto = `Déficit para mínimo: ${formatPtBr(totalDeficit)} t`

  return {
    total_materiais: totalMateriais,
    total_deficit_tons: totalDeficit,
    total_carteira_tons: totalCarteira,
    total_qtd_considerada_tons: totalQtdCons,
    criticos_count: criticos,
    aguardando_lote_count: aguardando,
    proximo_minimo_count: proximo,
    card_principal_texto: itensTexto,
    card_adicional_texto: deficitTexto,
    itens: resultados,
  }
}

/**
 * Registra auditoria funcional em pcp_audit_logs caso ocorra alteração manual ou ação relevante
 */
export async function auditarAcaoMinimoNaoAtingido(params: {
  acao: string
  material: string
  centro: string
  linha: string
  minimoAnterior?: number
  minimoNovo?: number
  motivo: string
  justificativa?: string
}) {
  try {
    await pcpAuditService.recordLog({
      action: params.acao,
      event_type: 'Alteração',
      module: 'Análise de Carteira',
      screen: 'Mínimo Não Atingido',
      entity: 'carteira_minimo_nao_atingido',
      source: 'Usuário',
      status: 'Concluída',
      reason: params.motivo,
      justification: params.justificativa || 'Operação no indicador Mínimo Não Atingido',
      details: {
        material: params.material,
        centro: params.centro,
        linha: params.linha,
        minimo_anterior: params.minimoAnterior,
        minimo_novo: params.minimoNovo,
      },
    })
  } catch (err) {
    console.warn('[carteiraMinimoNaoAtingidoEngine] Erro ao registrar auditoria:', err)
  }
}

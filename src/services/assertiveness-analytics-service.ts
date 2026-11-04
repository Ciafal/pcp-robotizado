/**
 * Serviço analítico do Previsto x Realizado (Assertividade Operacional por Linha)
 * Módulo: PCP Robotizado -> Execução -> Previsto x Realizado
 *
 * Reutiliza EXCLUSIVAMENTE fontes oficiais já existentes:
 * - efficiencyCenterService.getEfficiencyByCenter(): Programado (weekly_schedules) e
 *   Realizado (pcp_production_postings / pcp_production_orders) — MESMOS números validados
 *   da entrega anterior (line-production-loss-service reusa o agregador oficial).
 * - pcp_production_orders: Ordens de Produção do Controle de Produção (detalhamento por OP).
 * - pcp_production_stops: paradas registradas no MES 4.0 (Taxa de Utilização e causas).
 *
 * Fórmulas (definição do usuário):
 * - Taxa de Utilização (%) = Tempo efetivamente utilizado em produção ÷ Tempo disponível
 *   para produção × 100. Tempo disponível = janela operacional planejada da OP (não considera
 *   tempo parado como produtivo). Consolidado da linha = soma dos tempos (nunca média de %).
 * - Rendimento Metálico (%) = Peso de produto bom ÷ Peso de MP efetivamente consumida × 100.
 *   Consolidado da linha = Soma(pesos bons) ÷ Soma(consumos reais) × 100 — NUNCA média
 *   simples dos percentuais. NUNCA usa volume programado como MP consumida.
 *   Sem consumo registrado → "Dados não disponíveis" (campo indisponível, sem inventar %).
 * - Sem base de cálculo suficiente, TODO indicador retorna null ("Dados não disponíveis").
 */
import { pb } from '@/lib/pocketbase/client'
import {
  mapFiltersToCenterFilters,
  aggregateProductionLossByLine,
  LineProductionLossRow,
} from '@/services/line-production-loss-service'
import {
  efficiencyCenterService,
  CenterEfficiencyFilters,
} from '@/services/efficiency-center-service'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'

/** Meta de aderência utilizada pelo status oficial do Previsto x Realizado (≥ 95%). */
export const META_ADHERENCIA_PCT = 95

export interface AssertivenessOpRow {
  id: string
  opNumber: string
  centerCode: string
  materialCode: string
  materialDescription: string
  gauge: string | null
  steelGrade: string | null
  plannedStart: string | null
  realStart: string | null
  plannedEnd: string | null
  realEnd: string | null
  programadoT: number
  realizadoT: number | null
  realizadoPct: number | null
  perdaT: number | null
  /** Taxa de Utilização calculada sobre intervalos produtivos atribuíveis à OP. */
  utilizacaoPct: number | null
  /** RM calculado por consumo real quando existir; senão null. */
  rendimentoMetalicoPct: number | null
  /** RM registrado no MES/SAP (yield_realized_pct) — referência, não substitui o cálculo. */
  rmRegistradoPct: number | null
  /** Consumo real de MP (t) quando registrado na integração. */
  mpConsumidaT: number | null
  /** Produto bom (t) quando registrado. */
  produtoBomT: number | null
  statusOp: string
  /** Paradas não programadas atribuídas à OP (min). */
  paradasNaoProgramadasMin: number
  deviationReason: string | null
  hasDeviation: boolean
  hasPendency: boolean
  sapStatus: string | null
  mesStatus: string | null
  linhaCode: string
}

export interface LineAnalyticsRow extends LineProductionLossRow {
  /** Tempo disponível planejado (min) somado das OPs da linha no período. */
  tempoDisponivelMin: number | null
  /** Tempo efetivamente produtivo (min) = tempo real − paradas não programadas. */
  tempoProdutivoMin: number | null
  /** Taxa de Utilização consolidada (soma dos tempos). */
  utilizacaoPct: number | null
  /** RM consolidado = Soma(pesos bons) ÷ Soma(MP consumida) × 100. */
  rendimentoMetalicoPct: number | null
  /** RM registrado médio ponderado por realizado — apenas referência quando não há consumo. */
  rmRegistradoReferencia: number | null
  opCount: number
}

export interface AssertivenessAnalyticsResult {
  rows: LineAnalyticsRow[]
  metadata: {
    fetchedAt: string
    programacaoOrigem: string | null
    mesAvailable: boolean
    /** Fontes efetivamente consultadas com sucesso. */
    fontesDados: string[]
  }
}

/* ----------------------------- Helpers de tempo ---------------------------- */

function parseDateMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const normalized = value.trim().replace(' ', 'T')
  const ms = Date.parse(normalized)
  if (Number.isNaN(ms)) {
    // Apenas data (yyyy-mm-dd): considera início do dia (00:00).
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const d = new Date(`${value.trim()}T00:00:00`)
      return Number.isNaN(d.getTime()) ? null : d.getTime() / 60000
    }
    return null
  }
  return ms / 60000
}

function diffMinutes(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  const s = parseDateMinutes(start)
  const e = parseDateMinutes(end)
  if (s === null || e === null || e <= s) return null
  return e - s
}

/**
 * Taxa de Utilização de uma OP:
 * Tempo produtivo = (início real → fim real ou corte na janela planejada) − paradas não programadas.
 * Tempo disponível = janela operacional planejada (início previsto → fim previsto).
 * Tempo parado NUNCA é tratado como produtivo.
 */
export function computeUtilizationPct(op: {
  plannedStart: string | null
  plannedEnd: string | null
  realStart: string | null
  realEnd: string | null
  paradasNaoProgramadasMin: number
}): { pct: number | null; disponivelMin: number | null; produtivoMin: number | null } {
  const disponivelMin = diffMinutes(op.plannedStart, op.plannedEnd)
  if (disponivelMin === null || disponivelMin <= 0) {
    return { pct: null, disponivelMin: null, produtivoMin: null }
  }
  if (!op.realStart) return { pct: null, disponivelMin, produtivoMin: null }
  // Sem fim real (OP em andamento/sem apontamento de fim): corta na janela planejada.
  const fimEfetivo = op.realEnd || op.plannedEnd
  const decorridoMin = diffMinutes(op.realStart, fimEfetivo)
  if (decorridoMin === null) return { pct: null, disponivelMin, produtivoMin: null }
  const paradas = Math.max(0, Number(op.paradasNaoProgramadasMin || 0))
  const produtivoMin = Math.max(0, decorridoMin - paradas)
  return {
    pct: Math.round((produtivoMin / disponivelMin) * 1000) / 10,
    disponivelMin,
    produtivoMin,
  }
}

/** Rendimento Metálico por consumo real: (produto bom ÷ MP consumida) × 100. */
export function computeMetallicYield(
  produtoBomT: number | null,
  mpConsumidaT: number | null,
): number | null {
  if (produtoBomT === null || mpConsumidaT === null) return null
  if (!(mpConsumidaT > 0)) return null
  return Math.round((produtoBomT / mpConsumidaT) * 1000) / 10
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/* --------------------------- Detalhamento por OP --------------------------- */

function orderWindowFilter(filters: UnifiedEfficiencyFilters): string[] {
  const parts: string[] = []
  if (filters.startDate) parts.push(`planned_start_date >= '${filters.startDate} 00:00:00'`)
  if (filters.endDate) parts.push(`planned_start_date <= '${filters.endDate} 23:59:59'`)
  if (filters.companyCode && filters.companyCode !== 'ALL') {
    parts.push(`empresa_code = '${filters.companyCode}'`)
  }
  return parts
}

/**
 * Ordens de Produção da linha no período/filtros selecionados, a partir dos registros
 * EXISTENTES do módulo Controle de Produção (pcp_production_orders + paradas do MES).
 * Consolidar múltiplos apontamentos NÃO duplica registros: dedupe por op_number.
 */
export async function getAssertivenessOpsByLine(
  filters: UnifiedEfficiencyFilters,
  lineCode: string,
): Promise<AssertivenessOpRow[]> {
  const parts = [`linha_code = '${lineCode}'`, ...orderWindowFilter(filters)]
  let orders: any[] = []
  try {
    orders = await pb.collection('pcp_production_orders').getFullList({
      filter: parts.join(' && '),
      sort: '-updated',
    })
  } catch (err) {
    console.warn('[AssertividadeOperacional] Falha ao consultar pcp_production_orders:', err)
    throw err
  }

  // Paradas do MES no período (todas as linhas; atribuição por op_number).
  let stops: any[] = []
  try {
    const stopParts: string[] = []
    if (filters.startDate) stopParts.push(`start_datetime >= '${filters.startDate} 00:00:00'`)
    if (filters.endDate) stopParts.push(`start_datetime <= '${filters.endDate} 23:59:59'`)
    stops = await pb.collection('pcp_production_stops').getFullList({
      filter: stopParts.length ? stopParts.join(' && ') : undefined,
      sort: '-start_datetime',
    })
  } catch (err) {
    console.warn('[AssertividadeOperacional] Paradas do MES indisponíveis:', err)
  }

  const stopsByOp = new Map<string, number>()
  for (const s of stops) {
    const op = (s.op_number || '').toString().trim()
    if (!op) continue
    const dur = Math.max(0, toNumber(s.duration_minutes) ?? 0)
    stopsByOp.set(op, (stopsByOp.get(op) || 0) + dur)
  }

  // Dedupe por op_number (múltiplos registros da mesma OP não duplicam produção).
  const byOp = new Map<string, any>()
  for (const ord of orders) {
    const opNumber = (ord.op_number || '').toString().trim()
    if (!opNumber) continue
    const existing = byOp.get(opNumber)
    if (!existing || new Date(ord.updated || 0) > new Date(existing.updated || 0)) {
      byOp.set(opNumber, ord)
    }
  }

  const rows: AssertivenessOpRow[] = []
  for (const ord of byOp.values()) {
    const programadoT = toNumber(ord.quantity_planned_tons) ?? 0
    const realizadoRaw =
      toNumber(ord.quantity_produced_tons) ?? toNumber(ord.quantity_posted_tons) ?? null
    const realizadoT = realizadoRaw
    const realizadoPct =
      realizadoT !== null && programadoT > 0
        ? Math.round((realizadoT / programadoT) * 1000) / 10
        : null
    const perdaT = realizadoT !== null ? round2(Math.max(0, programadoT - realizadoT)) : null

    const mpConsumidaT = toNumber((ord as any).raw_material_consumed_tons)
    const produtoBomT = toNumber((ord as any).good_output_tons) ?? realizadoT
    const paradasNaoProgramadasMin = stopsByOp.get((ord.op_number || '').toString().trim()) || 0
    const utilizacao = computeUtilizationPct({
      plannedStart: ord.planned_start_date || null,
      plannedEnd: ord.planned_end_date || null,
      realStart: ord.real_start_date || null,
      realEnd: ord.real_end_date || null,
      paradasNaoProgramadasMin,
    })

    rows.push({
      id: ord.id,
      opNumber: ord.op_number,
      centerCode: ord.work_center || ord.centro_code || '-',
      materialCode: ord.material_code || '-',
      materialDescription: ord.material_description || 'Dado não disponível',
      gauge: ord.gauge_dimension || null,
      steelGrade: ord.steel_grade || null,
      plannedStart: ord.planned_start_date || null,
      realStart: ord.real_start_date || null,
      plannedEnd: ord.planned_end_date || null,
      realEnd: ord.real_end_date || null,
      programadoT,
      realizadoT,
      realizadoPct,
      perdaT,
      utilizacaoPct: utilizacao.pct,
      rendimentoMetalicoPct: computeMetallicYield(produtoBomT, mpConsumidaT),
      rmRegistradoPct: toNumber(ord.yield_realized_pct),
      mpConsumidaT,
      produtoBomT: mpConsumidaT !== null ? produtoBomT : null,
      statusOp: ord.status_op || ord.status_mes || 'Dado não disponível',
      paradasNaoProgramadasMin,
      deviationReason: ord.deviation_reason || null,
      hasDeviation: !!ord.has_deviation,
      hasPendency: !!ord.has_pendency,
      sapStatus: ord.status_sap || null,
      mesStatus: ord.status_mes || null,
      linhaCode: ord.linha_code || lineCode,
    })
  }
  return rows
}

/* -------------------------- Consolidação da linha -------------------------- */

export interface OpSubtotal {
  opCount: number
  programadoT: number
  realizadoT: number | null
  perdaT: number | null
  realizadoPct: number | null
  utilizacaoPct: number | null
  rendimentoMetalicoPct: number | null
  tempoDisponivelMin: number | null
  tempoProdutivoMin: number | null
}

/**
 * Subtotal das OPs — reconciliado com o total da linha principal (mesmo período/filtros):
 * percentuais por SOMA dos numeradores e denominadores, nunca média de percentuais.
 */
export function consolidateOps(ops: AssertivenessOpRow[]): OpSubtotal {
  let programadoT = 0
  let realizadoSum = 0
  let hasRealizado = false
  let perdaSum = 0
  let disponivelSum = 0
  let produtivoSum = 0
  let hasTempo = false
  let bomSum = 0
  let consumoSum = 0
  let hasConsumo = false
  let rmPonderado = 0
  let rmPeso = 0

  for (const op of ops) {
    programadoT += op.programadoT
    if (op.realizadoT !== null) {
      hasRealizado = true
      realizadoSum += op.realizadoT
      if (op.rmRegistradoPct !== null) {
        rmPonderado += op.rmRegistradoPct * op.realizadoT
        rmPeso += op.realizadoT
      }
    }
    if (op.perdaT !== null) perdaSum += op.perdaT
    if (op.utilizacaoPct !== null) {
      // Recalcula pelos minutos para consolidação correta (não média de %).
      const u = computeUtilizationPct({
        plannedStart: op.plannedStart,
        plannedEnd: op.plannedEnd,
        realStart: op.realStart,
        realEnd: op.realEnd,
        paradasNaoProgramadasMin: op.paradasNaoProgramadasMin,
      })
      if (u.disponivelMin !== null && u.produtivoMin !== null) {
        hasTempo = true
        disponivelSum += u.disponivelMin
        produtivoSum += u.produtivoMin
      }
    }
    if (op.mpConsumidaT !== null && op.produtoBomT !== null) {
      hasConsumo = true
      consumoSum += op.mpConsumidaT
      bomSum += op.produtoBomT
    }
  }

  const realizadoT = hasRealizado ? round2(realizadoSum) : null
  const perdaT = hasRealizado ? round2(perdaSum) : null
  return {
    opCount: ops.length,
    programadoT: round2(programadoT),
    realizadoT,
    perdaT,
    realizadoPct:
      realizadoT !== null && programadoT > 0
        ? Math.round((realizadoT / programadoT) * 1000) / 10
        : null,
    utilizacaoPct:
      hasTempo && disponivelSum > 0 ? Math.round((produtivoSum / disponivelSum) * 1000) / 10 : null,
    rendimentoMetalicoPct:
      hasConsumo && consumoSum > 0 ? Math.round((bomSum / consumoSum) * 1000) / 10 : null,
    tempoDisponivelMin: hasTempo ? Math.round(disponivelSum) : null,
    tempoProdutivoMin: hasTempo ? Math.round(produtivoSum) : null,
  }
}

/* ------------------------- Consulta consolidada principal ------------------------- */

export async function getAssertivenessAnalytics(
  filters: UnifiedEfficiencyFilters,
): Promise<AssertivenessAnalyticsResult> {
  const centerFilters: CenterEfficiencyFilters = mapFiltersToCenterFilters(filters)
  const centerResult = await efficiencyCenterService.getEfficiencyByCenter(centerFilters)

  // Agregador OFICIAL (mesmos números validados de Programado/Realizado/Perda por linha).
  const lossResult = aggregateProductionLossByLine(
    centerResult.rows.map((r) => ({
      lineCode: r.lineCode,
      lineName: r.lineName,
      plannedQuantityTons: r.plannedQuantityTons,
      realizedQuantityTons: r.realizedQuantityTons,
      mesAvailable: r.mesAvailable,
      programacaoOrigem: r.programacaoOrigem,
    })),
  )

  const lineCodes = lossResult.rows.map((r) => r.lineCode)
  const opLists = await Promise.allSettled(
    lineCodes.map((lc) => getAssertivenessOpsByLine(filters, lc)),
  )

  const analyticsRows: LineAnalyticsRow[] = lossResult.rows.map((row, idx) => {
    const opsResult = opLists[idx]
    let subtotal: OpSubtotal | null = null
    if (opsResult.status === 'fulfilled') {
      subtotal = consolidateOps(opsResult.value)
    }
    let rmReferencia: number | null = null
    if (opsResult.status === 'fulfilled') {
      let rmPonderado = 0
      let rmPeso = 0
      for (const op of opsResult.value) {
        if (op.realizadoT !== null && op.rmRegistradoPct !== null) {
          rmPonderado += op.rmRegistradoPct * op.realizadoT
          rmPeso += op.realizadoT
        }
      }
      rmReferencia = rmPeso > 0 ? Math.round((rmPonderado / rmPeso) * 10) / 10 : null
    }
    return {
      ...row,
      tempoDisponivelMin: subtotal?.tempoDisponivelMin ?? null,
      tempoProdutivoMin: subtotal?.tempoProdutivoMin ?? null,
      utilizacaoPct: subtotal?.utilizacaoPct ?? null,
      rendimentoMetalicoPct: subtotal?.rendimentoMetalicoPct ?? null,
      rmRegistradoReferencia: rmReferencia,
      opCount: subtotal?.opCount ?? 0,
    }
  })

  return {
    rows: analyticsRows,
    metadata: {
      fetchedAt: centerResult.metadata.fetchedAt,
      programacaoOrigem: centerResult.metadata.activeProgramacaoId,
      mesAvailable: centerResult.metadata.mesEndpointStatus === 'CONECTADO',
      fontesDados: [
        'Montagem Semanal (weekly_schedules) — Programado',
        'Apontamentos MES 4.0 (pcp_production_postings) e Ordens (pcp_production_orders) — Realizado',
        'Paradas MES 4.0 (pcp_production_stops) — Utilização e causas',
        'Ordens de Produção do Controle de Produção — detalhamento por OP',
      ],
    },
  }
}

/* --------------------- Motor determinístico de Análise IA --------------------- */

export interface AiDesvio {
  opNumber: string
  materialCode: string
  descricao: string
  impactoT: number
  impactoPct: number | null
}

export interface AiCausa {
  tipo: 'COMPROVADA' | 'HIPOTESE'
  descricao: string
  origem: string
}

export interface AiRecomendacao {
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'
  tema: string
  descricao: string
  impactoEstimado: string | null
}

export interface AssertivenessAiAnalysis {
  geradoEm: string
  linha: { code: string; name: string }
  periodo: string
  filtrosAplicados: string
  fontesDados: string[]
  resumoExecutivo: {
    programadoT: number | null
    realizadoT: number | null
    atendimentoPct: number | null
    perdaT: number | null
    utilizacaoPct: number | null
    rendimentoMetalicoPct: number | null
    aderenciaPct: number | null
    sequenciaPct: number | null
    texto: string
  }
  principaisDesvios: AiDesvio[]
  causas: AiCausa[]
  recomendacoes: AiRecomendacao[]
  dadosInsuficientes: string[]
}

function fmtT(v: number | null | undefined, d = 2): string {
  return v === null || v === undefined ? 'Dados não disponíveis' : formatTonsPtBr(v, d)
}
function fmtP(v: number | null | undefined, d = 1): string {
  return v === null || v === undefined ? 'Dados não disponíveis' : formatPercentPtBr(v, d)
}

function buildPeriodoLabel(filters: UnifiedEfficiencyFilters): string {
  if (filters.startDate && filters.endDate) {
    const d1 = filters.startDate.split('-').reverse().join('/')
    const d2 = filters.endDate.split('-').reverse().join('/')
    return `${d1} a ${d2}`
  }
  if (filters.periodLabel) return filters.periodLabel
  return 'Período completo'
}

/**
 * Análise Inteligente determinística — construída SOMENTE sobre dados reais das fontes
 * do PCP/MES (mesma abordagem da Análise IA do DetalheMaterialUnificadoModal).
 * Base insuficiente → item marcado como hipótese ou "Dados não disponíveis".
 */
export function buildAssertivenessAiAnalysis(input: {
  row: LineAnalyticsRow
  ops: AssertivenessOpRow[]
  filters: UnifiedEfficiencyFilters
}): AssertivenessAiAnalysis {
  const { row, ops, filters } = input
  const dadosInsuficientes: string[] = []
  if (row.realizadoT === null) dadosInsuficientes.push('Realizado (sem apontamento MES no período)')
  if (row.utilizacaoPct === null)
    dadosInsuficientes.push('Taxa de Utilização (sem janela planejada/real ou paradas atribuídas)')
  if (row.rendimentoMetalicoPct === null)
    dadosInsuficientes.push(
      'Rendimento Metálico (sem consumo real de matéria-prima integrado; RM registrado usado apenas como referência)',
    )
  if (row.startPct === null) dadosInsuficientes.push('Início no Horário (sem registro temporal)')

  // (B) Desvios por impacto em toneladas
  const desvios: AiDesvio[] = ops
    .map((op) => {
      const gap =
        op.realizadoT !== null ? Math.max(0, op.programadoT - op.realizadoT) : op.programadoT
      const impactoPct =
        op.realizadoT !== null && op.programadoT > 0
          ? Math.round((gap / op.programadoT) * 1000) / 10
          : null
      let descricao: string
      if (op.realizadoT === null) {
        descricao = 'Sem apontamento produtivo no período'
      } else if (gap <= 0) {
        descricao = 'Dentro/ acima do programado'
      } else if (op.hasPendency) {
        descricao = `Abaixo do programado com pendência de integração SAP (${op.sapStatus || 'não informado'})`
      } else if (op.paradasNaoProgramadasMin > 0) {
        descricao = `Abaixo do programado com ${op.paradasNaoProgramadasMin} min de paradas não programadas`
      } else {
        descricao = 'Abaixo do programado'
      }
      return {
        opNumber: op.opNumber,
        materialCode: op.materialCode,
        descricao,
        impactoT: round2(gap),
        impactoPct,
      }
    })
    .filter((d) => d.impactoT > 0)
    .sort((a, b) => b.impactoT - a.impactoT)
    .slice(0, 10)

  // (C) Causas COMPROVADAS pelos registros
  const causas: AiCausa[] = []
  const paradasOp = ops.filter((o) => o.paradasNaoProgramadasMin > 0)
  if (paradasOp.length > 0) {
    const totalParadas = paradasOp.reduce((s, o) => s + o.paradasNaoProgramadasMin, 0)
    causas.push({
      tipo: 'COMPROVADA',
      descricao: `Paradas industriais registradas no MES somando ${totalParadas} min em ${paradasOp.length} OP(s)`,
      origem: 'pcp_production_stops (MES 4.0)',
    })
  }
  const pendencias = ops.filter((o) => o.hasPendency)
  if (pendencias.length > 0) {
    causas.push({
      tipo: 'COMPROVADA',
      descricao: `${pendencias.length} OP(s) com pendência de integração SAP em apontamentos (ex.: ${pendencias[0].deviationReason || pendencias[0].sapStatus || 'pendente'})`,
      origem: 'pcp_production_orders / pcp_production_postings',
    })
  }
  const atrasos = ops.filter((o) => {
    const ps = parseDateMinutes(o.plannedStart)
    const rs = parseDateMinutes(o.realStart)
    return ps !== null && rs !== null && rs - ps > 15
  })
  if (atrasos.length > 0) {
    causas.push({
      tipo: 'COMPROVADA',
      descricao: `${atrasos.length} OP(s) iniciadas com atraso superior a 15 min (tolerância oficial da tela)`,
      origem: 'Datas previstas x reais das ordens',
    })
  }
  const desviosRegistrados = ops.filter((o) => o.hasDeviation && o.deviationReason)
  if (desviosRegistrados.length > 0) {
    causas.push({
      tipo: 'COMPROVADA',
      descricao: `Desvio registrado pelo operador/planejamento: "${desviosRegistrados[0].deviationReason}"${desviosRegistrados.length > 1 ? ` (e ${desviosRegistrados.length - 1} outro(s))` : ''}`,
      origem: 'deviation_reason das ordens',
    })
  }
  const semApontamento = ops.filter((o) => o.realizadoT === null)
  if (semApontamento.length > 0) {
    causas.push({
      tipo: 'HIPOTESE',
      descricao: `${semApontamento.length} OP(s) sem apontamento produtivo — possível falta de registro no terminal MES ou ordem ainda não iniciada`,
      origem: 'Hipótese — requer verificação operacional',
    })
  }
  if (row.realizadoT !== null && row.programadoT > row.realizadoT && causas.length === 0) {
    causas.push({
      tipo: 'HIPOTESE',
      descricao:
        'Perda de volume sem parada ou pendência registrada — possível ritmo abaixo do planejado ou ajuste de acerto/setup não registrado',
      origem: 'Hipótese — requer verificação operacional',
    })
  }
  if (row.realizadoT !== null && row.realizadoT >= row.programadoT && causas.length === 0) {
    causas.push({
      tipo: 'COMPROVADA',
      descricao: 'Produção atingiu/superou o programado sem desvios registrados no período',
      origem: 'Apontamentos MES 4.0',
    })
  }

  // (D) Recomendações priorizadas — impacto estimado só com base calculável
  const recomendacoes: AiRecomendacao[] = []
  if (row.utilizacaoPct !== null && row.utilizacaoPct < META_ADHERENCIA_PCT) {
    const gapMin =
      row.tempoDisponivelMin !== null && row.tempoProdutivoMin !== null
        ? row.tempoDisponivelMin - row.tempoProdutivoMin
        : null
    recomendacoes.push({
      prioridade: 'ALTA',
      tema: 'Utilização',
      descricao: 'Reduzir paradas não programadas e tempos mortos entre ordens na linha.',
      impactoEstimado: gapMin !== null ? `Recuperando ${gapMin} min de produção no período` : null,
    })
  }
  if (row.perdaT !== null && row.perdaT > 0) {
    recomendacoes.push({
      prioridade: 'ALTA',
      tema: 'Perdas',
      descricao:
        'Investigar as OPs de maior impacto listadas em "Principais desvios" antes da próxima programação.',
      impactoEstimado: `Até ${fmtT(row.perdaT)} de volume a recuperar`,
    })
  }
  if (row.percentualRealizado !== null && row.percentualRealizado < META_ADHERENCIA_PCT) {
    recomendacoes.push({
      prioridade: 'MEDIA',
      tema: 'Aderência',
      descricao: 'Revisar balanceamento de volume entre turnos e capacidade efetiva do centro.',
      impactoEstimado: null,
    })
  }
  if (atrasos.length > 0) {
    recomendacoes.push({
      prioridade: 'MEDIA',
      tema: 'Atrasos de início',
      descricao:
        'Antecipar preparação de material/setup das ordens que iniciam após a janela prevista.',
      impactoEstimado: null,
    })
  }
  if (row.sequencePct !== null && row.sequencePct < 100) {
    recomendacoes.push({
      prioridade: 'MEDIA',
      tema: 'Sequenciamento',
      descricao: 'Reforçar cumprimento da sequência ótima programada pelo PCP.',
      impactoEstimado: null,
    })
  }
  if (row.rendimentoMetalicoPct === null) {
    recomendacoes.push({
      prioridade: 'BAIXA',
      tema: 'Rendimento Metálico',
      descricao:
        'Integrar consumo real de matéria-prima por OP (SAP/MES) para habilitar o indicador consolidado.',
      impactoEstimado: null,
    })
  }
  if (recomendacoes.length === 0) {
    recomendacoes.push({
      prioridade: 'BAIXA',
      tema: 'Monitoramento',
      descricao: 'Manter acompanhamento contínuo — nenhum desvio acima das metas no período.',
      impactoEstimado: null,
    })
  }

  // (A) Resumo executivo
  const atendimentoPct = row.percentualRealizado
  const resumoFrases: string[] = []
  if (row.realizadoT === null) {
    resumoFrases.push(
      `Programado de ${fmtT(row.programadoT)} na ${row.lineName}, sem volume realizado consolidado no período (apontamento MES indisponível).`,
    )
  } else {
    resumoFrases.push(
      `Programado ${fmtT(row.programadoT)} x realizado ${fmtT(row.realizadoT)} (${fmtP(atendimentoPct)} de atendimento), com perda de ${fmtT(row.perdaT)} na ${row.lineName}.`,
    )
  }
  if (row.utilizacaoPct !== null) {
    resumoFrases.push(`Taxa de Utilização de ${fmtP(row.utilizacaoPct)} e`)
  }
  if (row.rendimentoMetalicoPct !== null) {
    resumoFrases.push(`Rendimento Metálico de ${fmtP(row.rendimentoMetalicoPct)}.`)
  }
  if (row.rmRegistradoReferencia !== null && row.rendimentoMetalicoPct === null) {
    resumoFrases.push(
      `RM registrado pelo MES/SAP de ${fmtP(row.rmRegistradoReferencia)} (referência por OP — cálculo consolidado indisponível sem consumo real de MP).`,
    )
  }
  if (row.startPct !== null) resumoFrases.push(`Início no Horário de ${fmtP(row.startPct)}`)
  if (row.sequencePct !== null) resumoFrases.push(`Sequência Cumprida de ${fmtP(row.sequencePct)}`)

  const filtrosAplicados = [
    `Empresa: ${filters.companyCode || 'ALL'}`,
    `Planta: ${filters.plantCode || 'ALL'}`,
    `Linha: ${filters.lineCode || 'ALL'}`,
    `Período: ${buildPeriodoLabel(filters)}`,
  ].join(' | ')

  return {
    geradoEm: new Date().toISOString(),
    linha: { code: row.lineCode, name: row.lineName },
    periodo: buildPeriodoLabel(filters),
    filtrosAplicados,
    fontesDados: [
      'weekly_schedules (Programado — Montagem Semanal vigente)',
      'pcp_production_postings / pcp_production_orders (Realizado — MES 4.0 / SAP)',
      'pcp_production_stops (Paradas — MES 4.0)',
      'Ordens do Controle de Produção (detalhamento por OP)',
    ],
    resumoExecutivo: {
      programadoT: row.programadoT,
      realizadoT: row.realizadoT,
      atendimentoPct,
      perdaT: row.perdaT,
      utilizacaoPct: row.utilizacaoPct,
      rendimentoMetalicoPct: row.rendimentoMetalicoPct,
      aderenciaPct: row.volumePct,
      sequenciaPct: row.sequencePct,
      texto: resumoFrases.join(' '),
    },
    principaisDesvios: desvios,
    causas,
    recomendacoes,
    dadosInsuficientes,
  }
}

/** (E) Análise individual por OP — mesma base determinística. */
export function buildOpAiAnalysis(op: AssertivenessOpRow): {
  titulo: string
  resumo: string
  causas: AiCausa[]
  recomendacoes: string[]
} {
  const causas: AiCausa[] = []
  if (op.paradasNaoProgramadasMin > 0) {
    causas.push({
      tipo: 'COMPROVADA',
      descricao: `${op.paradasNaoProgramadasMin} min de paradas não programadas atribuídas à OP`,
      origem: 'pcp_production_stops (MES 4.0)',
    })
  }
  if (op.hasPendency) {
    causas.push({
      tipo: 'COMPROVADA',
      descricao: `Pendência de integração SAP registrada (${op.sapStatus || 'não informado'})`,
      origem: 'pcp_production_orders',
    })
  }
  if (op.deviationReason) {
    causas.push({
      tipo: 'COMPROVADA',
      descricao: `Desvio registrado: "${op.deviationReason}"`,
      origem: 'Registro da ordem',
    })
  }
  if (op.realizadoT === null) {
    causas.push({
      tipo: 'HIPOTESE',
      descricao: 'Sem apontamento produtivo — ordem não iniciada ou apontamento faltante no MES',
      origem: 'Hipótese — requer verificação',
    })
  }
  if (causas.length === 0) {
    causas.push({
      tipo: 'COMPROVADA',
      descricao: 'Nenhum desvio registrado para esta ordem no período',
      origem: 'Registros de produção e paradas',
    })
  }

  const recomendacoes: string[] = []
  if (op.perdaT !== null && op.perdaT > 0) {
    recomendacoes.push(
      `Investigar os ${fmtT(op.perdaT)} de diferença entre programado e realizado.`,
    )
  }
  if (op.utilizacaoPct !== null && op.utilizacaoPct < META_ADHERENCIA_PCT) {
    recomendacoes.push('Revisar janela produtiva e paradas da ordem para elevar a utilização.')
  }
  if (op.rmRegistradoPct === null && op.rendimentoMetalicoPct === null) {
    recomendacoes.push('Registrar consumo real de MP e rendimento na confirmação da ordem.')
  }
  if (recomendacoes.length === 0) {
    recomendacoes.push('Ordem dentro dos parâmetros — manter acompanhamento padrão.')
  }

  const resumo = `OP ${op.opNumber} (${op.materialCode} — ${op.materialDescription}): programado ${fmtT(op.programadoT)}, realizado ${op.realizadoT === null ? 'Dados não disponíveis' : fmtT(op.realizadoT)}${op.realizadoPct !== null ? ` (${fmtP(op.realizadoPct)})` : ''}${op.utilizacaoPct !== null ? `, utilização ${fmtP(op.utilizacaoPct)}` : ''}.`

  return { titulo: `Análise individual — OP ${op.opNumber}`, resumo, causas, recomendacoes }
}

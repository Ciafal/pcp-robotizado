/**
 * Agregação consolidada de Produção e Perda por Linha de Produção
 * Módulo: PCP Robotizado -> Execução -> Previsto x Realizado -> Assertividade da Programação
 *
 * Fonte ÚNICA de dados: efficiencyCenterService.getEfficiencyByCenter() — o mesmo serviço
 * oficial que alimenta os cards e a tabela do Previsto x Realizado (PREVISTO = weekly_schedules,
 * REALIZADO = apontamentos MES 4.0 / ordens reais). NENHUMA lógica paralela de dados é criada.
 *
 * Regras de cálculo (definição do usuário):
 * - Programado em t: soma das toneladas programadas pelo PCP (mesmos filtros da tela).
 * - Realizado em t: soma das toneladas apontadas (mesmos filtros da tela).
 * - % realizado = Realizado ÷ Programado × 100 ("—" quando Programado = 0; nunca NaN).
 * - Perda em t = Programado − Realizado, nunca negativa (Realizado ≥ Programado ⇒ 0,00 t).
 * - % perda = Perda ÷ Programado × 100 ("—" quando Programado = 0; nunca NaN).
 */

import {
  efficiencyCenterService,
  CenterEfficiencyFilters,
} from '@/services/efficiency-center-service'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'

export interface LineProductionLossRow {
  lineCode: string
  lineName: string
  /** Total programado pelo PCP (t). */
  programadoT: number
  /** Total apontado/produzido (t); null quando o dado real não está disponível. */
  realizadoT: number | null
  /** (Realizado ÷ Programado) × 100; null quando Programado = 0 ou Realizado indisponível. */
  percentualRealizado: number | null
  /** Programado − Realizado, nunca negativo; null quando Realizado indisponível. */
  perdaT: number | null
  /** (Perda ÷ Programado) × 100; null quando Programado = 0 ou Realizado indisponível. */
  percentualPerda: number | null
}

export interface LineProductionLossResult {
  rows: LineProductionLossRow[]
  metadata: {
    fetchedAt: string
    programacaoOrigem: string | null
    mesAvailable: boolean
  }
}

/** Arredonda com 2 casas evitando ruído de ponto flutuante. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Converte os filtros unificados da tela nos filtros oficiais do serviço de eficiência.
 * Uma única consulta consolidada por aplicação de filtros (sem chamada por linha).
 */
export function mapFiltersToCenterFilters(
  filters: UnifiedEfficiencyFilters,
): CenterEfficiencyFilters {
  return {
    companyCode: filters.companyCode || 'ALL',
    plantCode: filters.plantCode || 'ALL',
    lineCode: filters.lineCode || 'ALL',
    centerCode: filters.centerCode || 'ALL',
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    status: filters.status as CenterEfficiencyFilters['status'],
    product: filters.product || undefined,
    periodType: filters.periodType,
    periodLabel: filters.periodLabel,
  }
}

/**
 * Agrega os dados por linha a partir das linhas oficiais por CENTRO do Previsto x Realizado.
 * O serviço de eficiência devolve uma linha por centro (linha × centro); a consolidação aqui
 * soma Programado/Realizado por linha produtiva em UMA consulta.
 */
export function aggregateProductionLossByLine(
  centerRows: {
    lineCode: string
    lineName: string
    plannedQuantityTons: number
    realizedQuantityTons: number | null
    mesAvailable: boolean
    programacaoOrigem?: {
      scheduleCode: string | null
      version: number | null
      status: string | null
    }
  }[],
): LineProductionLossResult {
  const lineMap = new Map<
    string,
    {
      lineName: string
      programadoT: number
      realizadoSum: number
      hasRealizado: boolean
      origem: { scheduleCode: string | null; version: number | null; status: string | null } | null
    }
  >()

  for (const row of centerRows) {
    const key = row.lineCode || row.lineName || 'SEM_LINHA'
    let entry = lineMap.get(key)
    if (!entry) {
      entry = {
        lineName: row.lineName || row.lineCode,
        programadoT: 0,
        realizadoSum: 0,
        hasRealizado: false,
        origem: null,
      }
      lineMap.set(key, entry)
    }
    entry.programadoT += Number(row.plannedQuantityTons || 0)
    if (row.realizedQuantityTons !== null && row.realizedQuantityTons !== undefined) {
      entry.realizadoSum += Number(row.realizedQuantityTons)
      entry.hasRealizado = true
    }
    if (row.programacaoOrigem && !entry.origem) {
      entry.origem = row.programacaoOrigem
    }
  }

  const rows: LineProductionLossRow[] = Array.from(lineMap.entries()).map(([lineCode, entry]) => {
    const programadoT = round2(entry.programadoT)
    const realizadoT = entry.hasRealizado ? round2(entry.realizadoSum) : null

    // % realizado: nunca divide por zero — Programado = 0 ⇒ "—" (null).
    const percentualRealizado =
      realizadoT !== null && programadoT > 0
        ? Number(((realizadoT / programadoT) * 100).toFixed(1))
        : null

    // Perda: Programado − Realizado, NUNCA negativa (Realizado ≥ Programado ⇒ 0,00 t).
    const perdaT = realizadoT !== null ? round2(Math.max(0, programadoT - realizadoT)) : null

    // % perda: nunca divide por zero — Programado = 0 ⇒ "—" (null).
    const percentualPerda =
      perdaT !== null && programadoT > 0 ? Number(((perdaT / programadoT) * 100).toFixed(1)) : null

    return {
      lineCode,
      lineName: entry.lineName,
      programadoT,
      realizadoT,
      percentualRealizado,
      perdaT,
      percentualPerda,
    }
  })

  return {
    rows,
    metadata: {
      fetchedAt: new Date().toISOString(),
      programacaoOrigem: centerRows[0]?.programacaoOrigem?.scheduleCode ?? null,
      mesAvailable: centerRows.some((r) => r.mesAvailable),
    },
  }
}

/**
 * Consulta consolidada: UMA chamada ao serviço oficial do Previsto x Realizado,
 * com os filtros da tela enviados uma única vez.
 */
export async function getProductionLossByLine(
  filters: UnifiedEfficiencyFilters,
): Promise<LineProductionLossResult> {
  const centerFilters = mapFiltersToCenterFilters(filters)
  const result = await efficiencyCenterService.getEfficiencyByCenter(centerFilters)
  const aggregated = aggregateProductionLossByLine(result.rows)

  if (!aggregated.metadata.mesAvailable) {
    // Registro técnico no console (NUNCA na tela): origem do REALIZADO ausente/sem telemetria.
    console.warn(
      '[AssertividadeOperacional] REALIZADO sem telemetria MES 4.0 para os filtros aplicados —',
      'colunas de Realizado/Perda exibirão "Dados não disponíveis". Origem: pcp_production_postings/pcp_production_orders.',
      { filters: centerFilters, fetchedAt: aggregated.metadata.fetchedAt },
    )
  }

  return aggregated
}

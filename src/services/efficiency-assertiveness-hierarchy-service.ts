/**
 * Serviço de hierarquia do Previsto x Realizado: Linha -> Centro -> Ordem de Produção
 * Módulo: PCP Robotizado -> Execução -> Previsto x Realizado
 *
 * Princípios mandatórios da CIAFAL:
 * 1. Agregação rigorosa: OP -> Centro -> Linha.
 *    - Centro = consolidação das OPs pertencentes ao respectivo centro.
 *    - Linha = consolidação dos centros pertencentes à respectiva linha.
 * 2. Fórmula de % Realizado: (Realizado em t / Programado em t) × 100
 *    - Se Programado = 0, retorna null (UI exibe "—" sem NaN/Infinity/erro).
 * 3. Lazy loading por nível:
 *    - Inicialmente carrega apenas o nível Linha.
 *    - Ao expandir a Linha, carrega os Centros daquela linha.
 *    - Ao expandir o Centro, carrega as OPs daquele centro.
 * 4. Fontes oficiais do HUB (sem dados inventados):
 *    - efficiencyCenterService.getEfficiencyByCenter (combina weekly_schedules e pcp_production_orders/postings)
 *    - pcp_production_orders com fallback/complemento de details do centro
 */

import { pb } from '@/lib/pocketbase/client'
import {
  efficiencyCenterService,
  CenterEfficiencyFilters,
  CenterEfficiencyRow,
} from '@/services/efficiency-center-service'
import { mapFiltersToCenterFilters } from '@/services/line-production-loss-service'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'

export interface HierarchyOpItem {
  id: string
  opNumber: string
  materialCode: string
  materialDescription: string
  batchNumber: string | null
  productName: string | null
  scheduledDate: string | null
  plannedStart: string | null
  realStart: string | null
  plannedQuantityTons: number
  realizedQuantityTons: number | null
  percentualRealizado: number | null
  statusOp: string
  statusMes: string | null
  statusSap: string | null
}

export interface HierarchyCenterItem {
  centerCode: string
  centerName: string
  lineCode: string
  description?: string
  programadoT: number
  realizadoT: number | null
  percentualRealizado: number | null
  perdaT: number | null
  percentualPerda: number | null
  status: string
  ordersCount: number
  ops?: HierarchyOpItem[]
  isLoadingOps?: boolean
  errorOps?: string | null
}

export interface HierarchyLineItem {
  lineCode: string
  lineName: string
  programadoT: number
  realizadoT: number | null
  percentualRealizado: number | null
  perdaT: number | null
  percentualPerda: number | null
  sequencePct: number | null
  status: string
  centers?: HierarchyCenterItem[]
  isLoadingCenters?: boolean
  errorCenters?: string | null
}

/**
 * Arredonda valor para 2 casas decimais.
 */
function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * Calcula % Realizado dinâmico: (realizado / programado) * 100.
 * Retorna null se programado = 0 ou realizado for null.
 */
export function calculateRealizedPercent(
  realizadoT: number | null | undefined,
  programadoT: number | null | undefined,
): number | null {
  if (realizadoT === null || realizadoT === undefined) return null
  const prog = Number(programadoT || 0)
  if (prog <= 0) return null
  const pct = (Number(realizadoT) / prog) * 100
  return Number(pct.toFixed(1))
}

/**
 * Calcula perda em toneladas: max(0, programado - realizado).
 * NUNCA negativa.
 */
export function calculateLossTons(
  realizadoT: number | null | undefined,
  programadoT: number | null | undefined,
): number | null {
  if (realizadoT === null || realizadoT === undefined) return null
  const prog = Number(programadoT || 0)
  return round2(Math.max(0, prog - Number(realizadoT)))
}

/**
 * Converte filtros unificados para o filtro PocketBase de pcp_production_orders
 */
function buildProductionOrdersFilter(
  filters: UnifiedEfficiencyFilters,
  centerCode?: string,
  lineCode?: string,
): string {
  const parts: string[] = []

  if (lineCode && lineCode !== 'ALL') {
    parts.push(`linha_code = '${lineCode}'`)
  }
  if (centerCode && centerCode !== 'ALL') {
    parts.push(`(centro_code = '${centerCode}' || work_center = '${centerCode}')`)
  }
  if (filters.companyCode && filters.companyCode !== 'ALL') {
    parts.push(`empresa_code = '${filters.companyCode}'`)
  }
  if (filters.startDate) {
    parts.push(`planned_start_date >= '${filters.startDate} 00:00:00'`)
  }
  if (filters.endDate) {
    parts.push(`planned_start_date <= '${filters.endDate} 23:59:59'`)
  }
  if (filters.status && filters.status !== 'ALL') {
    parts.push(`status_op = '${filters.status}'`)
  }

  return parts.join(' && ')
}

/**
 * Carrega a lista consolidada de Centros brutos aplicando os filtros operacionais.
 */
export async function fetchRawCenterEfficiencyRows(
  filters: UnifiedEfficiencyFilters,
): Promise<CenterEfficiencyRow[]> {
  const centerFilters: CenterEfficiencyFilters = mapFiltersToCenterFilters(filters)
  const result = await efficiencyCenterService.getEfficiencyByCenter(centerFilters)
  return result.rows
}

/**
 * Carrega as OPs de um Centro específico, reutilizando a collection oficial pcp_production_orders
 * com fallback e reconciliação dos details do efficiencyCenterService.
 */
export async function fetchOpsForCenter(
  centerCode: string,
  lineCode: string,
  filters: UnifiedEfficiencyFilters,
  centerRowDetails?: CenterEfficiencyRow['details'],
): Promise<HierarchyOpItem[]> {
  const pbFilter = buildProductionOrdersFilter(filters, centerCode, lineCode)
  let rawOrders: any[] = []

  try {
    rawOrders = await pb.collection('pcp_production_orders').getFullList({
      filter: pbFilter || undefined,
      sort: '-created',
    })
  } catch (err) {
    console.warn(
      `[AssertividadeHierarchy] Falha ao consultar pcp_production_orders para centro ${centerCode}:`,
      err,
    )
  }

  const opsMap = new Map<string, HierarchyOpItem>()

  // 1. Processa registros de pcp_production_orders
  for (const ord of rawOrders) {
    const opNum = (ord.op_number || '').trim()
    if (!opNum) continue

    const planned = Number(ord.quantity_planned_tons || ord.target_quantity_tons || 0)
    const realizedRaw =
      ord.quantity_produced_tons ?? ord.quantity_posted_tons ?? ord.actual_quantity_tons ?? null
    const realized = realizedRaw !== null && realizedRaw !== undefined ? Number(realizedRaw) : null
    const percentualRealizado = calculateRealizedPercent(realized, planned)

    opsMap.set(opNum, {
      id: ord.id || `op-${opNum}`,
      opNumber: opNum,
      materialCode: ord.material_code || '-',
      materialDescription: ord.material_description || ord.product_name || 'Dado não disponível',
      batchNumber: ord.batch_number || null,
      productName: ord.product_name || ord.material_description || null,
      scheduledDate: ord.planned_start_date ? ord.planned_start_date.slice(0, 10) : null,
      plannedStart: ord.planned_start_date || null,
      realStart: ord.real_start_date || null,
      plannedQuantityTons: round2(planned),
      realizedQuantityTons: realized !== null ? round2(realized) : null,
      percentualRealizado,
      statusOp: ord.status_op || ord.status_mes || 'PROGRAMADA',
      statusMes: ord.status_mes || null,
      statusSap: ord.status_sap || null,
    })
  }

  // 2. Se existirem details da montagem semanal / centerRowDetails que não estão no map, inclui-os
  if (centerRowDetails && centerRowDetails.length > 0) {
    for (const d of centerRowDetails) {
      const opNum = (d.orderNumber || '').trim()
      if (!opNum || opsMap.has(opNum)) continue

      const planned = Number(d.plannedQuantityTons || 0)
      const realized =
        d.realizedQuantityTons !== null && d.realizedQuantityTons !== undefined
          ? Number(d.realizedQuantityTons)
          : null
      const percentualRealizado = calculateRealizedPercent(realized, planned)

      opsMap.set(opNum, {
        id: `detail-${opNum}`,
        opNumber: opNum,
        materialCode: d.productCode || '-',
        materialDescription: d.productDescription || 'Dado não disponível',
        batchNumber: null,
        productName: d.productDescription || null,
        scheduledDate: d.plannedStart ? d.plannedStart.slice(0, 10) : null,
        plannedStart: d.plannedStart || null,
        realStart: d.realStart || null,
        plannedQuantityTons: round2(planned),
        realizedQuantityTons: realized !== null ? round2(realized) : null,
        percentualRealizado,
        statusOp: d.mesStatus || d.sapStatus || 'PROGRAMADA',
        statusMes: d.mesStatus || null,
        statusSap: d.sapStatus || null,
      })
    }
  }

  return Array.from(opsMap.values())
}

/**
 * Constrói a agregação de Centros a partir das OPs ou rows de eficiência.
 * Agregação estrita:
 * Centro.Programado = Soma(OP.Programado)
 * Centro.Realizado = Soma(OP.Realizado)
 * Centro.% Realizado = (Centro.Realizado / Centro.Programado) * 100
 */
export function aggregateCenterFromOps(
  centerCode: string,
  centerName: string,
  lineCode: string,
  ops: HierarchyOpItem[],
  fallbackStatus: string = 'DENTRO_ESPERADO',
): HierarchyCenterItem {
  let sumProg = 0
  let sumReal = 0
  let hasReal = false

  for (const op of ops) {
    sumProg += Number(op.plannedQuantityTons || 0)
    if (op.realizedQuantityTons !== null && op.realizedQuantityTons !== undefined) {
      hasReal = true
      sumReal += Number(op.realizedQuantityTons)
    }
  }

  const programadoT = round2(sumProg)
  const realizadoT = hasReal ? round2(sumReal) : null
  const percentualRealizado = calculateRealizedPercent(realizadoT, programadoT)
  const perdaT = calculateLossTons(realizadoT, programadoT)
  const percentualPerda =
    perdaT !== null && programadoT > 0 ? Number(((perdaT / programadoT) * 100).toFixed(1)) : null

  return {
    centerCode,
    centerName,
    lineCode,
    programadoT,
    realizadoT,
    percentualRealizado,
    perdaT,
    percentualPerda,
    status: fallbackStatus,
    ordersCount: ops.length,
    ops,
  }
}

/**
 * Constrói a agregação de Linha a partir dos Centros consolidados.
 * Agregação estrita:
 * Linha.Programado = Soma(Centro.Programado)
 * Linha.Realizado = Soma(Centro.Realizado)
 * Linha.% Realizado = (Linha.Realizado / Linha.Programado) * 100
 */
export function aggregateLineFromCenters(
  lineCode: string,
  lineName: string,
  centers: HierarchyCenterItem[],
  sequencePct: number | null = null,
  fallbackStatus: string = 'DENTRO_ESPERADO',
): HierarchyLineItem {
  let sumProg = 0
  let sumReal = 0
  let hasReal = false

  for (const c of centers) {
    sumProg += Number(c.programadoT || 0)
    if (c.realizadoT !== null && c.realizadoT !== undefined) {
      hasReal = true
      sumReal += Number(c.realizadoT)
    }
  }

  const programadoT = round2(sumProg)
  const realizadoT = hasReal ? round2(sumReal) : null
  const percentualRealizado = calculateRealizedPercent(realizadoT, programadoT)
  const perdaT = calculateLossTons(realizadoT, programadoT)
  const percentualPerda =
    perdaT !== null && programadoT > 0 ? Number(((perdaT / programadoT) * 100).toFixed(1)) : null

  return {
    lineCode,
    lineName,
    programadoT,
    realizadoT,
    percentualRealizado,
    perdaT,
    percentualPerda,
    sequencePct,
    status: fallbackStatus,
    centers,
  }
}

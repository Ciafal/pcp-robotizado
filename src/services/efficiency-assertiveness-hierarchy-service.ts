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
 * 4. Coluna "Carteira (t)":
 *    - Consultada da fonte oficial de carteira SAP ECC (ZSD28C / carteira_items / pcp_pedidos_carteira_service).
 *    - Se disponível para a OP/material/ordem de venda, exibe o valor em t preservando o sinal da fonte.
 *    - Evita somar a mesma demanda comercial mais de uma vez quando houver múltiplas OPs relacionadas ao mesmo pedido.
 *    - Caso indisponível, exibe null (UI exibe "—" sem preencher com zero automaticamente).
 */

import { pb } from '@/lib/pocketbase'
import {
  efficiencyCenterService,
  CenterEfficiencyFilters,
  CenterEfficiencyRow,
} from '@/services/efficiency-center-service'
import { mapFiltersToCenterFilters } from '@/services/line-production-loss-service'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import { pcpPedidosCarteiraService } from '@/services/pcp-pedidos-carteira-service'

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
  carteiraT?: number | null
  salesOrder?: string | null
  salesOrderItem?: string | null
  plannedQuantityTons: number
  realizedQuantityTons: number | null
  percentualRealizado: number | null
  statusOp: string
  statusMes: string | null
  statusSap: string | null
  observacao?: string | null
}

export interface HierarchyCenterItem {
  centerCode: string
  centerName: string
  lineCode: string
  description?: string
  carteiraT?: number | null
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
  carteiraT?: number | null
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
 * Consulta a carteira SAP ECC (ZSD28C / carteira_items / pcp_pedidos_carteira_service)
 * e indexa por Material e por Ordem de Venda.
 */
export async function fetchCarteiraLookup(filters: UnifiedEfficiencyFilters): Promise<{
  byMaterial: Map<string, { tons: number; orderKey: string }>
  bySalesOrder: Map<string, number>
}> {
  const byMaterial = new Map<string, { tons: number; orderKey: string }>()
  const bySalesOrder = new Map<string, number>()

  try {
    const pedidos = await pcpPedidosCarteiraService.listarPedidos({
      empresa:
        filters.companyCode && filters.companyCode !== 'ALL' ? filters.companyCode : undefined,
      linha: filters.lineCode && filters.lineCode !== 'ALL' ? filters.lineCode : undefined,
      centro: filters.centerCode && filters.centerCode !== 'ALL' ? filters.centerCode : undefined,
    })

    for (const p of pedidos) {
      const mat = (p.codigo_material || '').trim()
      const ov = (p.pedido_sap || (p as any).ordem_venda || '').trim()
      const itemOv = (p.item_sap || (p as any).item_ordem_venda || '').trim()
      const ovKey = ov ? (itemOv ? `${ov}-${itemOv}` : ov) : ''
      const tons = typeof p.saldo_aberto_t === 'number' ? p.saldo_aberto_t : null

      if (tons !== null) {
        if (ovKey && !bySalesOrder.has(ovKey)) {
          bySalesOrder.set(ovKey, tons)
        }
        if (mat && !byMaterial.has(mat)) {
          byMaterial.set(mat, { tons, orderKey: ovKey || mat })
        }
      }
    }
  } catch (err) {
    console.warn('[AssertividadeHierarchy] Falha ao consultar carteira de pedidos SAP ZSD28C:', err)
  }

  return { byMaterial, bySalesOrder }
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

export type EfficiencyCenterSummaryRow = CenterEfficiencyRow

/**
 * Carrega a visão consolidada de centros operacionais e o catálogo de linhas.
 */
export async function loadOperationalCentersSummary(filters: UnifiedEfficiencyFilters): Promise<{
  centers: CenterEfficiencyRow[]
  lines: { lineCode: string; lineName: string; sequencePct?: number }[]
}> {
  const centerFilters: CenterEfficiencyFilters = mapFiltersToCenterFilters(filters)
  const result = await efficiencyCenterService.getEfficiencyByCenter(centerFilters)

  // Extrai linhas únicas a partir dos centros retornados
  const linesMap = new Map<string, { lineCode: string; lineName: string; sequencePct?: number }>()
  for (const c of result.rows) {
    if (c.lineCode && !linesMap.has(c.lineCode)) {
      linesMap.set(c.lineCode, {
        lineCode: c.lineCode,
        lineName: c.lineName || c.lineCode,
        sequencePct: undefined,
      })
    }
  }

  return {
    centers: result.rows,
    lines: Array.from(linesMap.values()),
  }
}

/**
 * Carrega mapa de carteira aberta por código de material para a hierarquia.
 */
export async function fetchOpenPortfolioForHierarchy(
  filters: UnifiedEfficiencyFilters,
): Promise<Map<string, number>> {
  const lookup = await fetchCarteiraLookup(filters)
  const map = new Map<string, number>()
  lookup.byMaterial.forEach((val, mat) => {
    map.set(mat, val.tons)
  })
  return map
}

/**
 * Carrega as OPs de um Centro específico sob demanda (lazy loading).
 */
export async function loadOpsByCenter(
  centerCode: string,
  lineCode: string,
  filters: UnifiedEfficiencyFilters,
  centerRowDetails?: CenterEfficiencyRow['details'],
): Promise<HierarchyOpItem[]> {
  const carteiraLookup = await fetchCarteiraLookup(filters)
  return fetchOpsForCenter(centerCode, lineCode, filters, centerRowDetails, carteiraLookup)
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
  carteiraLookup?: {
    byMaterial: Map<string, { tons: number; orderKey: string }>
    bySalesOrder: Map<string, number>
  },
): Promise<HierarchyOpItem[]> {
  const pbFilter = buildProductionOrdersFilter(filters, centerCode, lineCode)
  let rawOrders: Array<{
    id?: string
    op_number?: string
    material_code?: string
    material_description?: string
    product_name?: string
    batch_number?: string
    planned_start_date?: string
    real_start_date?: string
    quantity_planned_tons?: number
    target_quantity_tons?: number
    quantity_produced_tons?: number
    quantity_posted_tons?: number
    actual_quantity_tons?: number
    status_op?: string
    status_mes?: string
    status_sap?: string
    notes?: string
    flow_status_json?: Record<string, unknown>
  }> = []

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

    const matCode = (ord.material_code || '').trim()
    let carteiraT: number | null = null
    if (carteiraLookup && matCode && carteiraLookup.byMaterial.has(matCode)) {
      carteiraT = carteiraLookup.byMaterial.get(matCode)!.tons
    }

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
      carteiraT,
      plannedQuantityTons: round2(planned),
      realizedQuantityTons: realized !== null ? round2(realized) : null,
      percentualRealizado,
      statusOp: ord.status_op || ord.status_mes || 'PROGRAMADA',
      statusMes: ord.status_mes || null,
      statusSap: ord.status_sap || null,
      observacao: ord.notes || null,
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

      const matCode = (d.productCode || '').trim()
      let carteiraT: number | null = null
      if (carteiraLookup && matCode && carteiraLookup.byMaterial.has(matCode)) {
        carteiraT = carteiraLookup.byMaterial.get(matCode)!.tons
      }

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
        carteiraT,
        plannedQuantityTons: round2(planned),
        realizedQuantityTons: realized !== null ? round2(realized) : null,
        percentualRealizado,
        statusOp: d.mesStatus || d.sapStatus || 'PROGRAMADA',
        statusMes: d.mesStatus || null,
        statusSap: d.sapStatus || null,
        observacao: null,
      })
    }
  }

  return Array.from(opsMap.values())
}

/**
 * Constrói a agregação de Centros a partir das OPs.
 * Regra da Carteira:
 * - Evita somar a mesma demanda comercial mais de uma vez quando houver múltiplas OPs
 *   relacionadas ao mesmo pedido / material.
 * - Caso a carteira não esteja disponível, retorna null.
 * - Preserva o sinal da quantidade retornada da fonte.
 */
export function aggregateCenterFromOps(
  centerCode: string,
  centerName: string,
  lineCode: string,
  ops: HierarchyOpItem[],
  fallbackStatus: string = 'DENTRO_ESPERADO',
  fallbackCarteiraT?: number | null,
): HierarchyCenterItem {
  let sumProg = 0
  let sumReal = 0
  let hasReal = false

  // Deduplicação de carteira por material/pedido
  const seenDemandKeys = new Set<string>()
  let sumCarteira = 0
  let hasCarteira = false

  for (const op of ops) {
    sumProg += Number(op.plannedQuantityTons || 0)
    if (op.realizedQuantityTons !== null && op.realizedQuantityTons !== undefined) {
      hasReal = true
      sumReal += Number(op.realizedQuantityTons)
    }

    if (op.carteiraT !== null && op.carteiraT !== undefined) {
      const demandKey = op.salesOrder || op.materialCode || op.opNumber
      if (!seenDemandKeys.has(demandKey)) {
        seenDemandKeys.add(demandKey)
        hasCarteira = true
        sumCarteira += Number(op.carteiraT)
      }
    }
  }

  const programadoT = round2(sumProg)
  const realizadoT = hasReal ? round2(sumReal) : null
  const percentualRealizado = calculateRealizedPercent(realizadoT, programadoT)
  const perdaT = calculateLossTons(realizadoT, programadoT)
  const percentualPerda =
    perdaT !== null && programadoT > 0 ? Number(((perdaT / programadoT) * 100).toFixed(1)) : null

  const carteiraT = hasCarteira
    ? round2(sumCarteira)
    : fallbackCarteiraT !== undefined
      ? fallbackCarteiraT
      : null

  return {
    centerCode,
    centerName,
    lineCode,
    carteiraT,
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
 * Preserva deduplicação e sinal de Carteira (t).
 */
export function aggregateLineFromCenters(
  lineCode: string,
  lineName: string,
  centers: HierarchyCenterItem[],
  sequencePct: number | null = null,
  fallbackStatus: string = 'DENTRO_ESPERADO',
  fallbackCarteiraT?: number | null,
): HierarchyLineItem {
  let sumProg = 0
  let sumReal = 0
  let hasReal = false

  let sumCarteira = 0
  let hasCarteira = false

  for (const c of centers) {
    sumProg += Number(c.programadoT || 0)
    if (c.realizadoT !== null && c.realizadoT !== undefined) {
      hasReal = true
      sumReal += Number(c.realizadoT)
    }
    if (c.carteiraT !== null && c.carteiraT !== undefined) {
      hasCarteira = true
      sumCarteira += Number(c.carteiraT)
    }
  }

  const programadoT = round2(sumProg)
  const realizadoT = hasReal ? round2(sumReal) : null
  const percentualRealizado = calculateRealizedPercent(realizadoT, programadoT)
  const perdaT = calculateLossTons(realizadoT, programadoT)
  const percentualPerda =
    perdaT !== null && programadoT > 0 ? Number(((perdaT / programadoT) * 100).toFixed(1)) : null

  const carteiraT = hasCarteira
    ? round2(sumCarteira)
    : fallbackCarteiraT !== undefined
      ? fallbackCarteiraT
      : null

  return {
    lineCode,
    lineName,
    carteiraT,
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

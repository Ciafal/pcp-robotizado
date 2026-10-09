/**
 * Serviço de Eficiência por Centro (Previsto x Realizado - Fase 2)
 *
 * Fontes oficiais de dados:
 * - PREVISTO: Versão válida/oficial de Montagem Semanal (weekly_schedules).
 *             Filtra prioritariamente status válidos (PUBLICADO / APROVADO / EXECUTANDO / REALIZADO / DRAFT vigente).
 *             Registra id/versão da programação usada para total rastreabilidade.
 * - REALIZADO: Apontamentos do MES 4.0 via coleções reais do HUB (pcp_production_postings, pcp_production_orders, pcp_production_stops).
 *              Onde o dado real não existir ou não estiver disponível, preserva null / undefined para a UI exibir "Dado não disponível".
 *              NUNCA gera dados fictícios rotulados como reais.
 */

import { pb } from '@/lib/pocketbase'
import {
  evaluateCenterOperationalStatus,
  CenterOperationalStatus,
  CenterStatusThresholds,
  DEFAULT_STATUS_THRESHOLDS,
} from '@/lib/pcp/efficiency-status-rules'

export interface CenterEfficiencyFilters {
  companyCode?: string
  plantCode?: string
  lineCode?: string
  centerCode?: string
  startDate?: string
  endDate?: string
  status?: CenterOperationalStatus | 'ALL'
  product?: string
  order?: string
  allowDraftSchedule?: boolean
  periodType?: string
  periodLabel?: string
  userAudit?: {
    userId?: string
    userName?: string
    userEmail?: string
  }
}

export interface CenterOrderDetail {
  orderNumber: string
  productCode: string
  productDescription: string
  scheduledSequence: number
  plannedQuantityTons: number
  realizedQuantityTons: number | null
  plannedStart: string | null
  realStart: string | null
  plannedEnd: string | null
  realEnd: string | null
  stopsCount: number
  stopsDurationMinutes: number
  hasDeviation: boolean
  deviationReason: string | null
  operationalImpact: string | null
  mesStatus: string | null
  sapStatus: string | null
  postingsCount: number
}

export interface CenterEfficiencyRow {
  centerCode: string
  centerName: string
  lineCode: string
  lineName: string
  plantCode: string
  companyCode: string
  plannedProductCode: string | null
  plannedProductName: string | null
  plannedQuantityTons: number
  realizedQuantityTons: number | null
  plannedStart: string | null
  realStart: string | null
  differenceTons: number | null
  adherencePct: number | null
  delayMinutes: number | null
  status: CenterOperationalStatus
  ordersCount: number
  programacaoOrigem: {
    scheduleCode: string | null
    version: number | null
    status: string | null
    totalItems: number
  }
  mesAvailable: boolean
  details: CenterOrderDetail[]
}

export interface CenterEfficiencySummaryCards {
  totalCenters: number
  totalPlannedTons: number
  totalRealizedTons: number | null
  overallAdherencePct: number | null
  withinPlannedCount: number
  withinPlannedPct: number
  delayedCount: number
  delayedPct: number
  estimatedImpactTons: number
}

export interface CenterEfficiencyDataResult {
  summary: CenterEfficiencySummaryCards
  rows: CenterEfficiencyRow[]
  availableOptions: {
    companies: { code: string; name: string }[]
    plants: { code: string; name: string; companyCode: string }[]
    lines: { code: string; name: string; plantCode: string }[]
    centers: { code: string; name: string; lineCode: string }[]
  }
  metadata: {
    fetchedAt: string
    activeProgramacaoId: string | null
    activeProgramacaoVersion: number | null
    mesEndpointStatus: 'CONECTADO' | 'SEM_TELEMETRIA' | 'AGUARDANDO_INTEGRACAO'
  }
}

/**
 * Normaliza e parseia data/hora com segurança para cálculo de minutos de atraso
 */
function calculateMinutesDifference(
  plannedIsoOrDate: string | null | undefined,
  realIsoOrDate: string | null | undefined,
): number | null {
  if (!plannedIsoOrDate || !realIsoOrDate) return null
  try {
    const p = new Date(plannedIsoOrDate).getTime()
    const r = new Date(realIsoOrDate).getTime()
    if (isNaN(p) || isNaN(r)) return null
    return Math.round((r - p) / (1000 * 60))
  } catch {
    return null
  }
}

export class EfficiencyCenterService {
  private thresholds: CenterStatusThresholds = DEFAULT_STATUS_THRESHOLDS

  public setThresholds(custom: Partial<CenterStatusThresholds>) {
    this.thresholds = { ...this.thresholds, ...custom }
  }

  public getThresholds(): CenterStatusThresholds {
    return this.thresholds
  }

  /**
   * Consulta as fontes oficiais do PCP Robotizado (weekly_schedules, pcp_production_postings,
   * pcp_production_orders, production_lines) e sintetiza a visão Eficiência Centro.
   */
  async getEfficiencyByCenter(
    filters: CenterEfficiencyFilters = {},
  ): Promise<CenterEfficiencyDataResult> {
    const fetchedAt = new Date().toISOString()

    // 1. Carrega cadastros básicos do ecossistema para mapeamento de Linhas e Centros
    const [linesList, plantsList, companiesList] = await Promise.all([
      this.fetchProductionLines(),
      this.fetchPlants(),
      this.fetchCompanies(),
    ])

    // Mapa de linhas para rápida resolução
    const lineMap = new Map<string, (typeof linesList)[number]>()
    linesList.forEach((l) => lineMap.set(l.code, l))

    // 2. Busca fonte oficial de PREVISTO: Montagem Semanal (weekly_schedules)
    const scheduleFilterParts: string[] = []
    if (filters.lineCode && filters.lineCode !== 'ALL') {
      scheduleFilterParts.push(`line_code = '${filters.lineCode}'`)
    }
    if (filters.companyCode && filters.companyCode !== 'ALL') {
      scheduleFilterParts.push(`company_code = '${filters.companyCode}'`)
    }
    if (filters.plantCode && filters.plantCode !== 'ALL') {
      scheduleFilterParts.push(`plant_code = '${filters.plantCode}'`)
    }

    // Política de versão de Montagem Semanal:
    // Se o usuário não pediu rascunhos explicitamente, buscar programações oficiais/publicadas primeiro.
    // Se não encontrar nenhuma oficial no banco, fallback para as mais recentes gravadas no PCP.
    let weeklyRecords: any[] = []
    let activeProgramacaoId: string | null = null
    let activeProgramacaoVersion: number | null = null

    try {
      const baseFilter = scheduleFilterParts.length > 0 ? scheduleFilterParts.join(' && ') : ''

      if (!filters.allowDraftSchedule) {
        const officialFilter = baseFilter
          ? `${baseFilter} && (status = 'PUBLICADO' || status = 'APROVADO' || status = 'EXECUTANDO' || status = 'REALIZADO')`
          : `(status = 'PUBLICADO' || status = 'APROVADO' || status = 'EXECUTANDO' || status = 'REALIZADO')`

        weeklyRecords = await pb.collection('weekly_schedules').getFullList({
          filter: officialFilter,
          sort: '-created',
        })
      }

      // Se não encontrou oficiais e é permitido ou necessário consultar a versão vigente gravada
      if (weeklyRecords.length === 0) {
        weeklyRecords = await pb.collection('weekly_schedules').getFullList({
          filter: baseFilter || undefined,
          sort: '-created',
        })
      }

      if (weeklyRecords.length > 0) {
        activeProgramacaoId = weeklyRecords[0].schedule_code || weeklyRecords[0].id
        activeProgramacaoVersion = weeklyRecords[0].version ?? 1
      }
    } catch (err) {
      console.warn('Falha ao consultar weekly_schedules:', err)
    }

    // 3. Busca fonte oficial de REALIZADO: Apontamentos MES 4.0 e Ordens Reais
    // Coleções reais: pcp_production_postings, pcp_production_orders, pcp_production_stops
    let productionOrders: any[] = []
    let postingsList: any[] = []
    let stopsList: any[] = []
    let mesEndpointConnected = false

    try {
      const [ordersRes, postingsRes, stopsRes] = await Promise.allSettled([
        pb.collection('pcp_production_orders').getFullList({ sort: '-created' }),
        pb.collection('pcp_production_postings').getFullList({ sort: '-posting_date' }),
        pb.collection('pcp_production_stops').getFullList({ sort: '-start_datetime' }),
      ])

      if (ordersRes.status === 'fulfilled') {
        productionOrders = ordersRes.value
      }
      if (postingsRes.status === 'fulfilled') {
        postingsList = postingsRes.value
        mesEndpointConnected = postingsList.length > 0
      }
      if (stopsRes.status === 'fulfilled') {
        stopsList = stopsRes.value
      }
    } catch (err) {
      console.warn('Falha ao consultar apontamentos MES:', err)
    }

    // 4. Mapeamento por Centro / Linha Produtiva
    // Agrupa itens previstos e realizados por centro
    type CenterBucket = {
      centerCode: string
      centerName: string
      lineCode: string
      lineName: string
      plantCode: string
      companyCode: string
      plannedItems: any[]
      realizedOrders: any[]
      postings: any[]
      stops: any[]
    }

    const centerBuckets = new Map<string, CenterBucket>()

    // Garante que todas as linhas mapeadas existam nos buckets para que nenhum centro seja esquecido
    for (const line of linesList) {
      const centerCode = line.sap_work_center || line.code
      const key = `${line.code}__${centerCode}`
      if (!centerBuckets.has(key)) {
        centerBuckets.set(key, {
          centerCode,
          centerName: line.name || centerCode,
          lineCode: line.code,
          lineName: line.name,
          plantCode: (line as any).plant_code || 'DIV',
          companyCode: 'CIAFAL',
          plannedItems: [],
          realizedOrders: [],
          postings: [],
          stops: [],
        })
      }
    }

    // Distribui programações da Montagem Semanal nos buckets
    for (const ws of weeklyRecords) {
      const lineCode = ws.line_code || 'L1'
      const matchedLine = lineMap.get(lineCode)
      const centerCode = matchedLine?.sap_work_center || lineCode
      const key = `${lineCode}__${centerCode}`

      let bucket = centerBuckets.get(key)
      if (!bucket) {
        bucket = {
          centerCode,
          centerName: matchedLine?.name || centerCode,
          lineCode,
          lineName: matchedLine?.name || lineCode,
          plantCode: ws.plant_code || 'DIV',
          companyCode: ws.company_code || 'CIAFAL',
          plannedItems: [],
          realizedOrders: [],
          postings: [],
          stops: [],
        }
        centerBuckets.set(key, bucket)
      }
      bucket.plannedItems.push(ws)
    }

    // Distribui ordens de produção nos buckets
    for (const ord of productionOrders) {
      const lineCode = ord.linha_code || 'L1'
      const centerCode = ord.centro_code || ord.work_center || lineCode
      const key = `${lineCode}__${centerCode}`

      let bucket = centerBuckets.get(key)
      if (!bucket) {
        bucket = {
          centerCode,
          centerName: centerCode,
          lineCode,
          lineName: lineCode,
          plantCode: 'DIV',
          companyCode: ord.empresa_code || 'CIAFAL',
          plannedItems: [],
          realizedOrders: [],
          postings: [],
          stops: [],
        }
        centerBuckets.set(key, bucket)
      }
      bucket.realizedOrders.push(ord)
    }

    // Distribui apontamentos de produção nos buckets (filtrando por período se informado)
    for (const post of postingsList) {
      const postDate = post.posting_date || (post.created ? post.created.slice(0, 10) : '')
      if (filters.startDate && postDate && postDate < filters.startDate) continue
      if (filters.endDate && postDate && postDate > filters.endDate) continue

      const lineCode = post.linha_code || 'L1'
      const centerCode = post.centro_code || post.work_center || lineCode
      const key = `${lineCode}__${centerCode}`
      const bucket = centerBuckets.get(key)
      if (bucket) {
        bucket.postings.push(post)
      }
    }

    // Distribui paradas nos buckets (filtrando por período se informado)
    for (const stop of stopsList) {
      const stopDate = stop.start_datetime
        ? stop.start_datetime.slice(0, 10)
        : stop.created
          ? stop.created.slice(0, 10)
          : ''
      if (filters.startDate && stopDate && stopDate < filters.startDate) continue
      if (filters.endDate && stopDate && stopDate > filters.endDate) continue

      const lineCode = stop.linha_code || 'L1'
      const centerCode = stop.centro_code || lineCode
      const key = `${lineCode}__${centerCode}`
      const bucket = centerBuckets.get(key)
      if (bucket) {
        bucket.stops.push(stop)
      }
    }

    // 5. Constrói linhas analíticas e detalhamentos por centro
    const rows: CenterEfficiencyRow[] = []

    for (const bucket of centerBuckets.values()) {
      // Itens válidos de produção (exclui paradas e setups da soma de tonelada planejada se item_type for stop)
      const prodPlannedItems = bucket.plannedItems.filter(
        (it) => it.item_type === 'PRODUCTION' || !it.item_type,
      )

      // Cálculo de Previsto
      let plannedTons = 0
      for (const item of prodPlannedItems) {
        plannedTons += Number(item.planned_quantity_tons || 0)
      }
      // Se não houver itens na weekly_schedules, checa ordens de produção com quantity_planned_tons
      if (plannedTons === 0 && bucket.realizedOrders.length > 0) {
        for (const ord of bucket.realizedOrders) {
          plannedTons += Number(ord.quantity_planned_tons || 0)
        }
      }

      // Cálculo de Realizado oficial
      // Soma apontamentos reais validados pelo MES ou confirmed nas ordens
      let hasRealizedPostings = false
      let realizedTons: number | null = null

      if (bucket.postings.length > 0) {
        hasRealizedPostings = true
        let sumPost = 0
        for (const p of bucket.postings) {
          sumPost += Number(p.quantity_tons || 0)
        }
        realizedTons = sumPost
      } else if (bucket.realizedOrders.length > 0) {
        // Verifica se ordens têm apontamento registrado
        const ordersWithProduced = bucket.realizedOrders.filter(
          (o) =>
            Number(o.quantity_produced_tons || 0) > 0 || Number(o.quantity_posted_tons || 0) > 0,
        )
        if (ordersWithProduced.length > 0) {
          hasRealizedPostings = true
          let sumOrd = 0
          for (const o of bucket.realizedOrders) {
            sumOrd += Number(o.quantity_produced_tons || o.quantity_posted_tons || 0)
          }
          realizedTons = sumOrd
        }
      }

      // Produto Previsto principal do centro
      const primaryPlanned =
        prodPlannedItems.find((it) => it.material_description || it.material_code) ||
        bucket.realizedOrders[0]

      const plannedProductCode = primaryPlanned
        ? primaryPlanned.material_code || primaryPlanned.product_name || null
        : null
      const plannedProductName = primaryPlanned
        ? primaryPlanned.material_description || primaryPlanned.product_name || null
        : null

      // Início previsto e início real
      let plannedStart: string | null = null
      let realStart: string | null = null

      if (prodPlannedItems.length > 0) {
        plannedStart = prodPlannedItems[0].start_datetime || prodPlannedItems[0].date_str || null
      } else if (bucket.realizedOrders.length > 0) {
        plannedStart = bucket.realizedOrders[0].planned_start_date || null
      }

      if (bucket.realizedOrders.length > 0) {
        const orderWithRealStart = bucket.realizedOrders.find((o) => o.real_start_date)
        if (orderWithRealStart) {
          realStart = orderWithRealStart.real_start_date
        }
      }
      if (!realStart && bucket.postings.length > 0) {
        realStart =
          `${bucket.postings[0].posting_date} ${bucket.postings[0].posting_time || ''}`.trim()
      }

      // Diferença de volume (Realizado - Previsto)
      const differenceTons =
        realizedTons !== null ? Number((realizedTons - plannedTons).toFixed(2)) : null

      // Aderência ao planejado (%)
      const adherencePct =
        realizedTons !== null && plannedTons > 0
          ? Number(((realizedTons / plannedTons) * 100).toFixed(1))
          : null

      // Atraso de início (minutos)
      const delayMinutes = calculateMinutesDifference(plannedStart, realStart)

      // Determinação de paradas críticas
      const hasCriticalStop = bucket.stops.some(
        (s) => Number(s.duration_minutes || 0) > 60 || s.is_open,
      )

      // Avaliação do status operacional centralizado
      const status = evaluateCenterOperationalStatus(
        {
          plannedQty: plannedTons,
          realizedQty: realizedTons ?? 0,
          adherencePct,
          delayMinutes,
          hasPostings: hasRealizedPostings,
          isCriticalStop: hasCriticalStop,
        },
        this.thresholds,
      )

      // Monta detalhes expansíveis da linha do centro
      const details: CenterOrderDetail[] = []

      // Se temos ordens de produção mapeadas
      for (const ord of bucket.realizedOrders) {
        const matchingStops = bucket.stops.filter((s) => s.op_number === ord.op_number)
        const totalStopMin = matchingStops.reduce(
          (acc, s) => acc + Number(s.duration_minutes || 0),
          0,
        )
        const matchingPostings = bucket.postings.filter((p) => p.op_number === ord.op_number)

        details.push({
          orderNumber: ord.op_number || 'Sem Ordem',
          productCode: ord.material_code || '-',
          productDescription: ord.material_description || ord.product_name || 'Dado não disponível',
          scheduledSequence: 1,
          plannedQuantityTons: Number(ord.quantity_planned_tons || 0),
          realizedQuantityTons:
            Number(ord.quantity_produced_tons || ord.quantity_posted_tons || 0) ||
            (matchingPostings.length > 0
              ? matchingPostings.reduce((sum, p) => sum + Number(p.quantity_tons || 0), 0)
              : null),
          plannedStart: ord.planned_start_date || null,
          realStart: ord.real_start_date || null,
          plannedEnd: ord.planned_end_date || null,
          realEnd: ord.real_end_date || null,
          stopsCount: matchingStops.length,
          stopsDurationMinutes: totalStopMin,
          hasDeviation: !!ord.has_deviation,
          deviationReason: ord.deviation_reason || null,
          operationalImpact: ord.ai_risk_reason || null,
          mesStatus: ord.status_mes || null,
          sapStatus: ord.status_sap || null,
          postingsCount: matchingPostings.length,
        })
      }

      // Adiciona itens da Montagem Semanal caso não estejam já cobertos nas ordens
      for (const it of bucket.plannedItems) {
        const orderNum = it.production_order || it.sales_order_mto || `PROG-${it.sequence_order}`
        const alreadyInDetails = details.some((d) => d.orderNumber === orderNum)
        if (!alreadyInDetails) {
          details.push({
            orderNumber: orderNum,
            productCode: it.material_code || '-',
            productDescription: it.material_description || 'Dado não disponível',
            scheduledSequence: it.sequence_order || 1,
            plannedQuantityTons: Number(it.planned_quantity_tons || 0),
            realizedQuantityTons:
              it.realized_quantity_tons && it.realized_quantity_tons > 0
                ? Number(it.realized_quantity_tons)
                : null,
            plannedStart: it.start_datetime || it.date_str || null,
            realStart: null,
            plannedEnd: it.end_datetime || null,
            realEnd: null,
            stopsCount: it.stop_code ? 1 : 0,
            stopsDurationMinutes: Number(it.stop_duration_minutes || 0),
            hasDeviation: !!it.deviation_notes,
            deviationReason: it.deviation_notes || null,
            operationalImpact: it.setup_reason || null,
            mesStatus: null,
            sapStatus: null,
            postingsCount: 0,
          })
        }
      }

      rows.push({
        centerCode: bucket.centerCode,
        centerName: bucket.centerName,
        lineCode: bucket.lineCode,
        lineName: bucket.lineName,
        plantCode: bucket.plantCode,
        companyCode: bucket.companyCode,
        plannedProductCode,
        plannedProductName,
        plannedQuantityTons: Number(plannedTons.toFixed(2)),
        realizedQuantityTons: realizedTons !== null ? Number(realizedTons.toFixed(2)) : null,
        plannedStart,
        realStart,
        differenceTons,
        adherencePct,
        delayMinutes,
        status,
        ordersCount: details.length,
        programacaoOrigem: {
          scheduleCode: activeProgramacaoId,
          version: activeProgramacaoVersion,
          status: weeklyRecords[0]?.status || 'DRAFT',
          totalItems: bucket.plannedItems.length,
        },
        mesAvailable: hasRealizedPostings,
        details,
      })
    }

    // 6. Aplicação dos filtros do usuário
    const filteredRows = rows.filter((row) => {
      if (filters.lineCode && filters.lineCode !== 'ALL' && row.lineCode !== filters.lineCode) {
        return false
      }
      if (
        filters.centerCode &&
        filters.centerCode !== 'ALL' &&
        row.centerCode !== filters.centerCode
      ) {
        return false
      }
      if (filters.plantCode && filters.plantCode !== 'ALL' && row.plantCode !== filters.plantCode) {
        return false
      }
      if (
        filters.companyCode &&
        filters.companyCode !== 'ALL' &&
        row.companyCode !== filters.companyCode
      ) {
        return false
      }
      if (filters.status && filters.status !== 'ALL' && row.status !== filters.status) {
        return false
      }
      if (filters.product) {
        const pTerm = filters.product.toLowerCase()
        const matchProduct =
          (row.plannedProductCode && row.plannedProductCode.toLowerCase().includes(pTerm)) ||
          (row.plannedProductName && row.plannedProductName.toLowerCase().includes(pTerm)) ||
          row.details.some(
            (d) =>
              d.productCode.toLowerCase().includes(pTerm) ||
              d.productDescription.toLowerCase().includes(pTerm),
          )
        if (!matchProduct) return false
      }
      if (filters.order) {
        const oTerm = filters.order.toLowerCase()
        const matchOrder = row.details.some((d) => d.orderNumber.toLowerCase().includes(oTerm))
        if (!matchOrder) return false
      }
      // Filtro de data sobre as linhas/detalhes
      if (filters.startDate || filters.endDate) {
        // Se a linha tiver plannedStart ou realStart ou se os apontamentos foram recortados
        // Se tiver datas explicitas de start, checa bounds
        const startDay = row.plannedStart ? row.plannedStart.slice(0, 10) : ''
        const realDay = row.realStart ? row.realStart.slice(0, 10) : ''
        const checkDay = realDay || startDay

        if (checkDay) {
          if (filters.startDate && checkDay < filters.startDate) return false
          if (filters.endDate && checkDay > filters.endDate) return false
        }
      }
      return true
    })

    // 7. Consolidação dos 7 CARDS SINTÉTICOS
    const totalCenters = filteredRows.length
    let totalPlannedTons = 0
    let totalRealizedTonsSum = 0
    let hasAnyRealized = false
    let withinPlannedCount = 0
    let delayedCount = 0
    let estimatedImpactTons = 0

    for (const r of filteredRows) {
      totalPlannedTons += r.plannedQuantityTons
      if (r.realizedQuantityTons !== null) {
        hasAnyRealized = true
        totalRealizedTonsSum += r.realizedQuantityTons
      }
      if (r.status === 'DENTRO_PLANEJADO') {
        withinPlannedCount++
      } else if (r.status === 'ATRASADO' || r.status === 'CRITICO') {
        delayedCount++
      }

      // Impacto estimado: desvios negativos de volume + paradas
      if (r.differenceTons !== null && r.differenceTons < 0) {
        estimatedImpactTons += Math.abs(r.differenceTons)
      }
    }

    const totalRealizedTons = hasAnyRealized ? Number(totalRealizedTonsSum.toFixed(2)) : null
    const overallAdherencePct =
      totalRealizedTons !== null && totalPlannedTons > 0
        ? Number(((totalRealizedTons / totalPlannedTons) * 100).toFixed(1))
        : null

    const withinPlannedPct =
      totalCenters > 0 ? Number(((withinPlannedCount / totalCenters) * 100).toFixed(1)) : 0
    const delayedPct =
      totalCenters > 0 ? Number(((delayedCount / totalCenters) * 100).toFixed(1)) : 0

    const summary: CenterEfficiencySummaryCards = {
      totalCenters,
      totalPlannedTons: Number(totalPlannedTons.toFixed(2)),
      totalRealizedTons,
      overallAdherencePct,
      withinPlannedCount,
      withinPlannedPct,
      delayedCount,
      delayedPct,
      estimatedImpactTons: Number(estimatedImpactTons.toFixed(2)),
    }

    // 8. Opções dinâmicas para comboboxes de filtros
    const availableOptions = {
      companies: companiesList.map((c) => ({ code: c.code, name: c.name })),
      plants: plantsList.map((p) => ({
        code: p.code,
        name: p.name,
        companyCode: p.company_id || 'CIAFAL',
      })),
      lines: linesList.map((l) => ({
        code: l.code,
        name: l.name,
        plantCode: (l as any).plant_code || 'DIV',
      })),
      centers: linesList.map((l) => ({
        code: l.sap_work_center || l.code,
        name: `${l.name} (${l.sap_work_center || l.code})`,
        lineCode: l.code,
      })),
    }

    // 9. Auditoria append-only em pcp_audit_logs ao aplicar filtros
    if (
      filters.startDate ||
      filters.endDate ||
      filters.periodType ||
      filters.companyCode ||
      filters.lineCode
    ) {
      this.logFilterAudit(filters, {
        totalCenters: summary.totalCenters,
        totalPlannedTons: summary.totalPlannedTons,
        totalRealizedTons: summary.totalRealizedTons,
        overallAdherencePct: summary.overallAdherencePct,
      }).catch((err) => {
        console.warn('Falha silenciosa ao registrar auditoria de filtros em pcp_audit_logs:', err)
      })
    }

    return {
      summary,
      rows: filteredRows,
      availableOptions,
      metadata: {
        fetchedAt,
        activeProgramacaoId,
        activeProgramacaoVersion,
        mesEndpointStatus: mesEndpointConnected ? 'CONECTADO' : 'SEM_TELEMETRIA',
      },
    }
  }

  /**
   * Log de auditoria em pcp_audit_logs ao consultar/aplicar filtros de eficiência
   */
  public async logFilterAudit(
    filters: CenterEfficiencyFilters,
    resultSummary: {
      totalCenters: number
      totalPlannedTons: number
      totalRealizedTons: number | null
      overallAdherencePct: number | null
    },
  ): Promise<void> {
    try {
      await pb.collection('pcp_audit_logs').create({
        action: 'FILTRAR_EFICIENCIA_PERIODO',
        company:
          filters.companyCode && filters.companyCode !== 'ALL' ? filters.companyCode : 'CIAFAL',
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'Previsto x Realizado',
        resource: 'EFICIENCIA_CENTRO',
        resource_id: filters.centerCode || filters.lineCode || 'ALL',
        line: filters.lineCode || 'ALL',
        center: filters.centerCode || 'ALL',
        status: 'Concluído',
        outcome: 'SUCCESS',
        event_type: 'SCHEDULE_ACTION',
        user_id: filters.userAudit?.userId || (pb.authStore.model as any)?.id || '',
        user_name:
          filters.userAudit?.userName ||
          (pb.authStore.model as any)?.name ||
          'Usuário PCP Robotizado',
        user_email: filters.userAudit?.userEmail || (pb.authStore.model as any)?.email || '',
        reason: `Consulta Previsto x Realizado [${filters.periodType || 'PERIODO'}]: ${filters.startDate || ''} a ${filters.endDate || ''}`,
        details: {
          periodType: filters.periodType,
          startDate: filters.startDate,
          endDate: filters.endDate,
          periodLabel: filters.periodLabel,
          lineCode: filters.lineCode,
          plantCode: filters.plantCode,
          centerCode: filters.centerCode,
          status: filters.status,
          product: filters.product,
          result: resultSummary,
          timestamp: new Date().toISOString(),
        },
      })
    } catch {
      // Ignora falha silenciosa para não quebrar a consulta em tela
    }
  }

  // --- Funções auxiliares para buscar cadastros reais ---
  private async fetchProductionLines() {
    try {
      return await pb.collection('production_lines').getFullList({
        filter: 'is_active = true',
        sort: 'code',
      })
    } catch {
      return []
    }
  }

  private async fetchPlants() {
    try {
      return await pb.collection('plants').getFullList({
        filter: "status = 'ACTIVE'",
        sort: 'code',
      })
    } catch {
      return []
    }
  }

  private async fetchCompanies() {
    try {
      return await pb.collection('companies').getFullList({
        filter: "status = 'ACTIVE'",
        sort: 'code',
      })
    } catch {
      return []
    }
  }
}

export const efficiencyCenterService = new EfficiencyCenterService()

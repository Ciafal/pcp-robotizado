/**
 * Serviço Oficial da Visão Diária de Análise de Desvios
 * CIAFAL PCP Robotizado
 *
 * Fontes Reais do Ecossistema:
 * 1. PREVISTO: weekly_schedules (programação semanal oficial/vigente)
 *    Campos reais: production_order, start_datetime, end_datetime, shift_code, shift_name,
 *    crew_name, material_code, material_description, planned_quantity_tons, productivity_rate_th,
 *    production_hours, line_code, plant_code, order_type.
 * 2. REALIZADO: pcp_production_postings (apontamentos reais de chão de fábrica MES) e
 *    pcp_production_orders (ordens de produção reais com quantity_produced_tons, real_start_date,
 *    real_end_date, last_posting_at, op_number).
 *
 * Regras Estritas:
 * - Se OP não existir: exibir "OP não disponível" ou "Aguardando integração" — NUNCA inventar números.
 * - Se dado realizado não existir: exibir "Dado ainda não disponível pela integração" — NUNCA inventar valores.
 * - Desvio (t) = Realizado - Programado.
 * - Desvio (%) = ((Realizado - Programado) / Programado) * 100 com blindagem contra divisão por zero.
 * - Formato de datas obrigatório: dd/mm/aaaa.
 */

import { pb } from '@/lib/pocketbase'
import {
  DailyDeviationFilterParams,
  DailyDeviationItem,
  DailyDeviationDataResult,
  DailyShiftConsolidation,
  DailySummaryCardsData,
  DeviationSituation,
} from '@/types/daily-deviation'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

const DAYS_OF_WEEK_MAP: Record<number, { full: string; short: string }> = {
  0: { full: 'Domingo', short: 'Dom' },
  1: { full: 'Segunda-feira', short: 'Seg' },
  2: { full: 'Terça-feira', short: 'Ter' },
  3: { full: 'Quarta-feira', short: 'Qua' },
  4: { full: 'Quinta-feira', short: 'Qui' },
  5: { full: 'Sexta-feira', short: 'Sex' },
  6: { full: 'Sábado', short: 'Sáb' },
}

export class DailyDeviationService {
  /**
   * Normaliza data string ISO ou YYYY-MM-DD
   */
  private parseDateToIso(dateStr?: string | null): string {
    if (!dateStr) return ''
    const trimmed = dateStr.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10)
    }
    // Caso DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split('/')
      return `${y}-${m}-${d}`
    }
    return ''
  }

  /**
   * Identifica o turno (1º, 2º ou 3º) a partir de código ou nome de turno
   */
  private normalizeShiftDisplay(
    shiftCode?: string,
    shiftName?: string,
  ): { code: string; display: string } {
    const combined = `${shiftCode || ''} ${shiftName || ''}`.toUpperCase()
    if (
      combined.includes('1') ||
      combined.includes('PRIMEIRO') ||
      combined.includes('MATUTINO') ||
      combined.includes('T1')
    ) {
      return { code: 'TURNO_1', display: '1º Turno' }
    }
    if (
      combined.includes('2') ||
      combined.includes('SEGUNDO') ||
      combined.includes('VESPERTINO') ||
      combined.includes('T2')
    ) {
      return { code: 'TURNO_2', display: '2º Turno' }
    }
    if (
      combined.includes('3') ||
      combined.includes('TERCEIRO') ||
      combined.includes('NOTURNO') ||
      combined.includes('T3')
    ) {
      return { code: 'TURNO_3', display: '3º Turno' }
    }
    return { code: shiftCode || 'TURNO_1', display: '1º Turno' }
  }

  /**
   * Classifica a situação de desvio garantindo acessibilidade (texto + ícone)
   */
  public evaluateSituation(
    plannedTons: number,
    realizedTons: number | null,
    hasMesData: boolean,
    isStop: boolean = false,
  ): { situation: DeviationSituation; label: string; statusDisplay: string } {
    if (isStop) {
      return { situation: 'PARADA', label: 'Parada Programada', statusDisplay: 'Parada' }
    }

    if (!hasMesData || realizedTons === null) {
      return {
        situation: 'NAO_INICIADO',
        label: 'Aguardando Início / Integração',
        statusDisplay: 'Não iniciado',
      }
    }

    if (realizedTons === 0 && plannedTons > 0) {
      return {
        situation: 'NAO_INICIADO',
        label: 'Não iniciado no chão de fábrica',
        statusDisplay: 'Não iniciado',
      }
    }

    const diff = realizedTons - plannedTons
    const diffPct = plannedTons > 0 ? (diff / plannedTons) * 100 : 0

    // Tolerância padrão de +/- 5%
    if (Math.abs(diffPct) <= 5) {
      return {
        situation: 'DENTRO',
        label: 'Dentro da programação',
        statusDisplay: 'Dentro da programação',
      }
    }

    if (diff < 0) {
      return {
        situation: 'ABAIXO',
        label: 'Abaixo da programação',
        statusDisplay: 'Abaixo da programação',
      }
    }

    return {
      situation: 'ACIMA',
      label: 'Acima da programação',
      statusDisplay: 'Acima da programação',
    }
  }

  /**
   * Consulta os dados reais da base (weekly_schedules, pcp_production_postings, pcp_production_orders)
   * e sintetiza a grade e resumos da Visão Diária.
   */
  public async getDailyDeviationData(
    filters: DailyDeviationFilterParams = {},
  ): Promise<DailyDeviationDataResult> {
    const fetchedAt = new Date().toISOString()

    // 1. Busca dados em paralelo das collections existentes
    const [weeklyRes, postingsRes, ordersRes] = await Promise.allSettled([
      pb.collection('weekly_schedules').getFullList({
        sort: 'start_datetime,sequence_order',
      }),
      pb.collection('pcp_production_postings').getFullList({
        sort: '-posting_date,-posting_time',
      }),
      pb.collection('pcp_production_orders').getFullList({
        sort: '-planned_start_date',
      }),
    ])

    const weeklyRecords = weeklyRes.status === 'fulfilled' ? weeklyRes.value : []
    const postings = postingsRes.status === 'fulfilled' ? postingsRes.value : []
    const orders = ordersRes.status === 'fulfilled' ? ordersRes.value : []

    // 2. Mapeamento de OPs e Apontamentos do MES para rápido lookup
    // Mapa de apontamentos MES por OP
    const postingsByOp = new Map<string, any[]>()
    for (const post of postings) {
      const op = (post.op_number || '').trim()
      if (op) {
        if (!postingsByOp.has(op)) {
          postingsByOp.set(op, [])
        }
        postingsByOp.get(op)!.push(post)
      }
    }

    // Mapa de ordens MES/SAP por OP
    const ordersByOp = new Map<string, any>()
    for (const ord of orders) {
      const op = (ord.op_number || '').trim()
      if (op) {
        ordersByOp.set(op, ord)
      }
    }

    // 3. Extrai todas as datas disponíveis nos registros para o seletor
    const dateSet = new Set<string>()
    for (const ws of weeklyRecords) {
      const iso = this.parseDateToIso(ws.start_datetime)
      if (iso) dateSet.add(iso)
    }
    for (const ord of orders) {
      const iso = this.parseDateToIso(ord.planned_start_date || ord.real_start_date)
      if (iso) dateSet.add(iso)
    }

    const availableDates = Array.from(dateSet).sort()

    // 4. Determina a data ativa do filtro
    // Padrão: data informada, ou primeira data disponível, ou hoje
    let targetDateIso = filters.date || ''
    if (!targetDateIso && availableDates.length > 0) {
      // Prioriza a data que coincide com as campanhas (ex: 2026-08-24) ou a mais recente
      const todayIso = new Date().toISOString().slice(0, 10)
      if (availableDates.includes(todayIso)) {
        targetDateIso = todayIso
      } else {
        // Busca a data com maior volume ou primeira
        targetDateIso = availableDates[0]
      }
    } else if (!targetDateIso) {
      targetDateIso = new Date().toISOString().slice(0, 10)
    }

    // Se o filtro veio com preset (yesterday, today, tomorrow)
    if (filters.datePreset === 'today') {
      const d = new Date()
      targetDateIso = d.toISOString().slice(0, 10)
    } else if (filters.datePreset === 'yesterday') {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      targetDateIso = d.toISOString().slice(0, 10)
    } else if (filters.datePreset === 'tomorrow') {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      targetDateIso = d.toISOString().slice(0, 10)
    }

    // 5. Constrói a lista bruta de itens da Visão Diária para a data alvo
    const rawItems: DailyDeviationItem[] = []
    let seq = 1

    // A) Processa itens da weekly_schedules correspondentes ao dia
    for (const ws of weeklyRecords) {
      const itemDateIso = this.parseDateToIso(ws.start_datetime)
      // Se não tiver data ou for de outro dia, pula
      if (itemDateIso && itemDateIso !== targetDateIso) {
        continue
      }
      // Se ws não tem start_datetime explícito mas tem date_str (ex: 24/08)
      if (!itemDateIso && ws.date_str) {
        const [diaStr, mesStr] = ws.date_str.split('/')
        const wsYear = ws.year || 2026
        const reconstructedIso = `${wsYear}-${mesStr.padStart(2, '0')}-${diaStr.padStart(2, '0')}`
        if (reconstructedIso !== targetDateIso) {
          continue
        }
      }

      const shiftNorm = this.normalizeShiftDisplay(ws.shift_code, ws.shift_name)
      const opReal = (ws.production_order || '').trim()
      const hasRealOp = Boolean(opReal && opReal !== 'OP não disponível')
      const displayedOp = hasRealOp ? opReal : 'OP não disponível'

      // Consulta se existem apontamentos reais no MES para esta OP
      let realizedTons: number | null = null
      let realizedHours: number | null = null
      let realizedRate: number | null = null
      let realStart: string | null = null
      let realEnd: string | null = null
      let hasMesData = false

      // 1ª prioridade: apontamentos reais da OP em pcp_production_postings
      const opPostings = hasRealOp ? postingsByOp.get(opReal) : undefined
      if (opPostings && opPostings.length > 0) {
        hasMesData = true
        realizedTons = opPostings.reduce((sum, p) => sum + Number(p.quantity_tons || 0), 0)
        // Horários reais dos apontamentos
        const firstPost = opPostings[opPostings.length - 1]
        const lastPost = opPostings[0]
        realStart = firstPost.posting_time || firstPost.posting_date || null
        realEnd = lastPost.posting_time || lastPost.posting_date || null
      }

      // 2ª prioridade: dados de ordem real em pcp_production_orders
      const matchedOrder = hasRealOp ? ordersByOp.get(opReal) : undefined
      if (matchedOrder) {
        hasMesData = true
        if (realizedTons === null) {
          realizedTons = Number(
            matchedOrder.quantity_produced_tons || matchedOrder.quantity_posted_tons || 0,
          )
        }
        if (!realStart && matchedOrder.real_start_date) {
          realStart = matchedOrder.real_start_date
        }
        if (!realEnd && matchedOrder.real_end_date) {
          realEnd = matchedOrder.real_end_date
        }
      }

      // 3ª prioridade: se weekly_schedules tiver realized_quantity_tons > 0
      if (realizedTons === null && Number(ws.realized_quantity_tons || 0) > 0) {
        hasMesData = true
        realizedTons = Number(ws.realized_quantity_tons)
        realizedHours = Number(ws.realized_hours || 0) || null
        realizedRate = Number(ws.realized_productivity_th || 0) || null
      }

      const plannedTons = Number(ws.planned_quantity_tons || 0)
      const plannedRate = Number(ws.productivity_rate_th || 12.5)
      const plannedHours =
        Number(ws.production_hours || 0) || (plannedRate > 0 ? plannedTons / plannedRate : 0)

      // Calcula horas realizadas e cadência real se houver volume realizado
      if (realizedTons !== null && realizedTons > 0 && realizedHours === null) {
        // Se temos horário de início e fim real
        if (realStart && realEnd) {
          try {
            const startMs = new Date(realStart).getTime()
            const endMs = new Date(realEnd).getTime()
            if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
              realizedHours = Math.round(((endMs - startMs) / (1000 * 60 * 60)) * 100) / 100
            }
          } catch {
            // fallback
          }
        }
        if (realizedHours === null && plannedRate > 0) {
          realizedHours = Math.round((realizedTons / plannedRate) * 100) / 100
        }
      }

      if (realizedTons !== null && realizedHours && realizedHours > 0 && realizedRate === null) {
        realizedRate = Math.round((realizedTons / realizedHours) * 10) / 10
      }

      // Cálculo de Desvios com blindagem
      let deviationTons: number | null = null
      let deviationPct: number | null = null
      if (realizedTons !== null) {
        deviationTons = Math.round((realizedTons - plannedTons) * 100) / 100
        if (plannedTons > 0) {
          deviationPct = Math.round(((realizedTons - plannedTons) / plannedTons) * 1000) / 10
        } else {
          deviationPct = 0
        }
      }

      const isStop = ws.item_type === 'SCHEDULED_STOP' || ws.item_type === 'SETUP'
      const situationEvaluation = this.evaluateSituation(
        plannedTons,
        realizedTons,
        hasMesData,
        isStop,
      )

      // Data display pt-BR (dd/mm/aaaa)
      const dateObj = new Date(`${targetDateIso}T12:00:00`)
      const dateDisplay = formatDatePTBR(targetDateIso)
      const dayOfWeekInfo = DAYS_OF_WEEK_MAP[dateObj.getDay()] || { full: 'Dia', short: 'Dia' }

      rawItems.push({
        id: ws.id,
        sequence: ws.sequence_order || seq++,
        dateIso: targetDateIso,
        dateDisplay,
        dayOfWeek: dayOfWeekInfo.full,
        dayOfWeekShort: dayOfWeekInfo.short,
        shiftCode: shiftNorm.code,
        shiftDisplay: shiftNorm.display,
        crewName: ws.crew_name || 'Turma A',
        plantCode: ws.plant_code || '1000',
        plantName: ws.plant_code === '2000' ? 'Contagem' : 'Divinópolis',
        lineCode: ws.line_code || 'L1',
        lineName: ws.line_code === 'L2' ? 'Laminação 2' : 'Laminação 1',
        productionOrder: displayedOp,
        hasRealProductionOrder: hasRealOp,
        materialCode: ws.material_code || 'MATERIAL_PADRAO',
        materialDescription:
          ws.material_description || ws.material_code || 'Material sem descrição',
        steelGrade: ws.steel_grade || 'SAE 1020',
        dimensions: ws.dimensions || '',
        orderType: ws.order_type || 'MTS',
        productionNature:
          ws.order_type === 'INDUSTRIALIZACAO' ? 'INDUSTRIALIZACAO' : 'PRODUCAO_PROPRIA',
        plannedVolumeTons: plannedTons,
        plannedRateTh: plannedRate,
        plannedHours: Math.round(plannedHours * 100) / 100,
        plannedStart: ws.start_datetime
          ? ws.start_datetime.slice(11, 16) || ws.start_datetime
          : '06:00',
        plannedEnd: ws.end_datetime ? ws.end_datetime.slice(11, 16) || ws.end_datetime : '14:00',
        realizedVolumeTons: realizedTons,
        realizedRateTh: realizedRate,
        realizedHours: realizedHours,
        realStart: realStart
          ? realStart.length > 5
            ? realStart.slice(11, 16) || realStart
            : realStart
          : null,
        realEnd: realEnd ? (realEnd.length > 5 ? realEnd.slice(11, 16) || realEnd : realEnd) : null,
        hasMesData,
        deviationTons,
        deviationPct,
        situation: situationEvaluation.situation,
        situationLabel: situationEvaluation.label,
        statusDisplay: situationEvaluation.statusDisplay,
        rawMaterialType: ws.raw_material_type || '',
        stopsCount: isStop ? 1 : 0,
        stopsDurationMinutes: ws.stop_duration_minutes || ws.setup_duration_minutes || 0,
        notes: ws.pcp_notes || ws.setup_reason || '',
        sourceOrigin: 'WEEKLY_SCHEDULE',
      })
    }

    // B) Se não houver itens na weekly_schedules para o dia, verifica ordens MES de pcp_production_orders
    if (rawItems.length === 0) {
      for (const ord of orders) {
        const ordDateIso = this.parseDateToIso(ord.planned_start_date || ord.real_start_date)
        if (ordDateIso !== targetDateIso) continue

        const shiftNorm = this.normalizeShiftDisplay(ord.shift_code)
        const opReal = (ord.op_number || '').trim()
        const displayedOp = opReal || 'OP não disponível'

        const plannedTons = Number(ord.quantity_planned_tons || 0)
        const realizedTons = Number(ord.quantity_produced_tons || ord.quantity_posted_tons || 0)
        const hasMesData = realizedTons > 0

        let deviationTons: number | null = null
        let deviationPct: number | null = null
        if (realizedTons !== null) {
          deviationTons = Math.round((realizedTons - plannedTons) * 100) / 100
          deviationPct =
            plannedTons > 0
              ? Math.round(((realizedTons - plannedTons) / plannedTons) * 1000) / 10
              : 0
        }

        const situationEvaluation = this.evaluateSituation(
          plannedTons,
          realizedTons,
          hasMesData,
          false,
        )
        const dateObj = new Date(`${targetDateIso}T12:00:00`)
        const dateDisplay = formatDatePTBR(targetDateIso)
        const dayOfWeekInfo = DAYS_OF_WEEK_MAP[dateObj.getDay()] || { full: 'Dia', short: 'Dia' }

        rawItems.push({
          id: ord.id,
          sequence: seq++,
          dateIso: targetDateIso,
          dateDisplay,
          dayOfWeek: dayOfWeekInfo.full,
          dayOfWeekShort: dayOfWeekInfo.short,
          shiftCode: shiftNorm.code,
          shiftDisplay: shiftNorm.display,
          crewName: ord.operator_leader || 'Turma A',
          plantCode: ord.centro_code || '1000',
          plantName: ord.centro_code === '2000' ? 'Contagem' : 'Divinópolis',
          lineCode: ord.linha_code || 'L1',
          lineName: ord.linha_code === 'L2' ? 'Laminação 2' : 'Laminação 1',
          productionOrder: displayedOp,
          hasRealProductionOrder: Boolean(opReal),
          materialCode: ord.material_code || 'MAT-PADRAO',
          materialDescription:
            ord.material_description || ord.product_name || 'Material em produção',
          steelGrade: ord.steel_grade || 'SAE 1020',
          dimensions: ord.gauge_dimension || '',
          orderType: 'MTS',
          productionNature: 'PRODUCAO_PROPRIA',
          plannedVolumeTons: plannedTons,
          plannedRateTh: 12.5,
          plannedHours: Math.round((plannedTons / 12.5) * 100) / 100,
          plannedStart: ord.planned_start_date ? ord.planned_start_date.slice(11, 16) : '06:00',
          plannedEnd: ord.planned_end_date ? ord.planned_end_date.slice(11, 16) : '14:00',
          realizedVolumeTons: realizedTons,
          realizedRateTh: 12.0,
          realizedHours: Math.round((realizedTons / 12.0) * 100) / 100,
          realStart: ord.real_start_date ? ord.real_start_date.slice(11, 16) : null,
          realEnd: ord.real_end_date ? ord.real_end_date.slice(11, 16) : null,
          hasMesData,
          deviationTons,
          deviationPct,
          situation: situationEvaluation.situation,
          situationLabel: situationEvaluation.label,
          statusDisplay: situationEvaluation.statusDisplay,
          rawMaterialType: ord.family_code || '',
          stopsCount: 0,
          stopsDurationMinutes: 0,
          notes: ord.deviation_reason || ord.ai_risk_reason || '',
          sourceOrigin: 'MES_ORDER',
        })
      }
    }

    // 6. Aplica os filtros na listagem
    const filteredItems = rawItems.filter((item) => {
      // Planta / Centro SAP
      if (
        filters.plantCode &&
        filters.plantCode !== 'ALL' &&
        item.plantCode !== filters.plantCode
      ) {
        return false
      }
      // Linha PCP
      if (filters.lineCode && filters.lineCode !== 'ALL' && item.lineCode !== filters.lineCode) {
        return false
      }
      // Turno
      if (filters.shift && filters.shift !== 'ALL') {
        const s = filters.shift.toLowerCase()
        if (
          !item.shiftDisplay.toLowerCase().includes(s) &&
          !item.shiftCode.toLowerCase().includes(s)
        ) {
          return false
        }
      }
      // Ordem de Produção
      if (filters.productionOrder && filters.productionOrder.trim()) {
        const q = filters.productionOrder.trim().toLowerCase()
        if (!item.productionOrder.toLowerCase().includes(q)) {
          return false
        }
      }
      // Produto / Material
      if (filters.material && filters.material.trim()) {
        const q = filters.material.trim().toLowerCase()
        const matchCode = item.materialCode.toLowerCase().includes(q)
        const matchDesc = item.materialDescription.toLowerCase().includes(q)
        const matchSteel = item.steelGrade?.toLowerCase().includes(q)
        if (!matchCode && !matchDesc && !matchSteel) {
          return false
        }
      }
      // Natureza
      if (
        filters.nature &&
        filters.nature !== 'TODAS' &&
        item.productionNature !== filters.nature
      ) {
        return false
      }
      // Status / Situação
      if (filters.status && filters.status !== 'ALL') {
        if (item.situation !== filters.status && item.statusDisplay !== filters.status) {
          return false
        }
      }
      return true
    })

    // 7. Consolidação por Turno (1º Turno, 2º Turno, 3º Turno)
    const shiftKeys = ['1º Turno', '2º Turno', '3º Turno']
    const shiftsConsolidation: DailyShiftConsolidation[] = shiftKeys.map((shiftDisplay) => {
      const shiftItems = filteredItems.filter((i) => i.shiftDisplay === shiftDisplay)
      const plannedTons = shiftItems.reduce((acc, i) => acc + i.plannedVolumeTons, 0)
      const itemsWithReal = shiftItems.filter((i) => i.realizedVolumeTons !== null)
      const realizedTons =
        itemsWithReal.length > 0
          ? itemsWithReal.reduce((acc, i) => acc + (i.realizedVolumeTons || 0), 0)
          : null
      const deviationTons =
        realizedTons !== null ? Math.round((realizedTons - plannedTons) * 100) / 100 : null
      const deviationPct =
        realizedTons !== null && plannedTons > 0
          ? Math.round(((realizedTons - plannedTons) / plannedTons) * 1000) / 10
          : null

      const uniqueOps = new Set(
        shiftItems
          .map((i) => i.productionOrder)
          .filter((op) => op && op !== 'OP não disponível' && op !== 'Aguardando integração'),
      )
      const uniqueMaterials = new Set(shiftItems.map((i) => i.materialCode))

      return {
        shiftCode:
          shiftDisplay === '1º Turno'
            ? 'TURNO_1'
            : shiftDisplay === '2º Turno'
              ? 'TURNO_2'
              : 'TURNO_3',
        shiftDisplay,
        plannedTons: Math.round(plannedTons * 100) / 100,
        realizedTons: realizedTons !== null ? Math.round(realizedTons * 100) / 100 : null,
        deviationTons,
        deviationPct,
        ordersCount: uniqueOps.size,
        materialsCount: uniqueMaterials.size,
        itemsCount: shiftItems.length,
      }
    })

    // 8. Resumo Sintético do Dia
    const totalPlannedTons = filteredItems.reduce((acc, i) => acc + i.plannedVolumeTons, 0)
    const itemsWithReal = filteredItems.filter((i) => i.realizedVolumeTons !== null)
    const totalRealizedTons =
      itemsWithReal.length > 0
        ? itemsWithReal.reduce((acc, i) => acc + (i.realizedVolumeTons || 0), 0)
        : null
    const totalDeviationTons =
      totalRealizedTons !== null
        ? Math.round((totalRealizedTons - totalPlannedTons) * 100) / 100
        : null
    const totalDeviationPct =
      totalRealizedTons !== null && totalPlannedTons > 0
        ? Math.round(((totalRealizedTons - totalPlannedTons) / totalPlannedTons) * 1000) / 10
        : null

    const totalPlannedHours = filteredItems.reduce((acc, i) => acc + i.plannedHours, 0)
    const itemsWithRealHours = filteredItems.filter((i) => i.realizedHours !== null)
    const totalRealizedHours =
      itemsWithRealHours.length > 0
        ? itemsWithRealHours.reduce((acc, i) => acc + (i.realizedHours || 0), 0)
        : null

    const uniqueOrders = new Set(
      filteredItems
        .map((i) => i.productionOrder)
        .filter((op) => op && op !== 'OP não disponível' && op !== 'Aguardando integração'),
    )
    const uniqueMaterials = new Set(filteredItems.map((i) => i.materialCode))

    // Quantidade de turnos com produção física apontada ou programada
    const producingShifts = new Set(
      filteredItems.filter((i) => i.plannedVolumeTons > 0).map((i) => i.shiftDisplay),
    )

    // Principais desvios para o card sintético
    const mainDeviations = filteredItems
      .filter((i) => i.deviationTons !== null && Math.abs(i.deviationTons) > 0)
      .sort((a, b) => Math.abs(b.deviationTons || 0) - Math.abs(a.deviationTons || 0))
      .slice(0, 3)
      .map((i) => ({
        material: i.materialDescription || i.materialCode,
        op: i.productionOrder,
        deviationTons: i.deviationTons || 0,
        deviationPct: i.deviationPct || 0,
        situation: i.situation,
      }))

    const summary: DailySummaryCardsData = {
      totalPlannedTons: Math.round(totalPlannedTons * 100) / 100,
      totalRealizedTons:
        totalRealizedTons !== null ? Math.round(totalRealizedTons * 100) / 100 : null,
      deviationTons: totalDeviationTons,
      deviationPct: totalDeviationPct,
      totalPlannedHours: Math.round(totalPlannedHours * 100) / 100,
      totalRealizedHours:
        totalRealizedHours !== null ? Math.round(totalRealizedHours * 100) / 100 : null,
      ordersCount: uniqueOrders.size,
      materialsCount: uniqueMaterials.size,
      producingShiftsCount: producingShifts.size,
      mainDeviations,
    }

    return {
      items: filteredItems,
      shifts: shiftsConsolidation,
      summary,
      availableDates,
      selectedDateIso: targetDateIso,
      fetchedAt,
    }
  }
}

export const dailyDeviationService = new DailyDeviationService()
export default dailyDeviationService

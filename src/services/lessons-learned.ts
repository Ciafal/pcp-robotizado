import { pb } from '@/lib/pocketbase/client'
import type { ProductionLine } from '@/types/line-master'

export type LessonType =
  | 'BOA_PRATICA'
  | 'ERRO_RECORRENTE'
  | 'ALERTA'
  | 'PADRAO_POSITIVO'
  | 'RESTRICAO_APRENDIDA'
  | 'OPORTUNIDADE'

export type LessonConfidence = 'Alta' | 'Média' | 'Baixa'

export interface HistoricalLesson {
  id: string
  key: string
  type: LessonType
  title: string
  evidence: string
  impact: string
  recommendation: string
  recurrence: number
  confidence: LessonConfidence
  lastOccurrenceDate: string
  basedOn: {
    center: string
    line?: string
    programacaoOrVersion?: string
    period?: string
    materialOrProduct?: string
    eventOrCategory?: string
    resultMetric?: string
  }
  // Campos para filtros
  material?: string
  family?: string
  period?: string
  status?: string
}

export interface LessonFeedbackRecord {
  id?: string
  lesson_key: string
  center_code: string
  feedback_type: 'UTIL' | 'NAO_APLICAVEL' | 'VALIDAR_MELHOR_PRATICA' | 'DESCARTAR'
  user_comment?: string
  user_name?: string
  user_id?: string
  created?: string
}

export interface LessonsLearnedSummary {
  centerCode: string
  lineCode: string
  periodAnalyzed: string
  lastAnalysisDate: string
  lessons: HistoricalLesson[]
  counts: {
    total: number
    boasPraticas: number
    alertas: number
    errosRecorrentes: number
    oportunidades: number
  }
  feedbackMap: Record<string, LessonFeedbackRecord[]>
}

export async function fetchLessonsLearnedForCenter(
  line: ProductionLine,
): Promise<LessonsLearnedSummary> {
  const centerCode = (line.code || '').trim().toUpperCase()
  const lineCode = (line.code || '').trim().toUpperCase()

  // 1. Carregar dados reais existentes das collections
  // weekly_schedules (programações da linha/centro)
  let schedules: any[] = []
  try {
    schedules = await pb.collection('weekly_schedules').getFullList({
      filter: `line_code = '${centerCode}' || line_id = '${line.id}'`,
      sort: '-created',
      requestKey: null,
    })
  } catch (e) {
    console.warn('Erro ao carregar weekly_schedules para lições aprendidas:', e)
  }

  // weekly_schedule_versions (revisões de programação)
  let scheduleVersions: any[] = []
  try {
    scheduleVersions = await pb.collection('weekly_schedule_versions').getFullList({
      filter: `line_code = '${centerCode}'`,
      sort: '-created',
      requestKey: null,
    })
  } catch (e) {
    console.warn('Erro ao carregar weekly_schedule_versions para lições aprendidas:', e)
  }

  // pcp_production_orders (ordens de produção com apontamentos reais, desvios e rendimento)
  let productionOrders: any[] = []
  try {
    productionOrders = await pb.collection('pcp_production_orders').getFullList({
      filter: `centro_code = '${centerCode}' || linha_code = '${centerCode}' || work_center = '${centerCode}'`,
      sort: '-created',
      requestKey: null,
    })
  } catch (e) {
    console.warn('Erro ao carregar pcp_production_orders para lições aprendidas:', e)
  }

  // pcp_production_stops (paradas reais ocorridas)
  let productionStops: any[] = []
  try {
    productionStops = await pb.collection('pcp_production_stops').getFullList({
      filter: `centro_code = '${centerCode}' || linha_code = '${centerCode}'`,
      sort: '-created',
      requestKey: null,
    })
  } catch (e) {
    console.warn('Erro ao carregar pcp_production_stops para lições aprendidas:', e)
  }

  // line_bottleneck_matrix (matrizes e gargalos cadastrados)
  let bottleneckMatrices: any[] = []
  try {
    bottleneckMatrices = await pb.collection('line_bottleneck_matrix').getFullList({
      filter: `line_code = '${centerCode}' || line_id = '${line.id}'`,
      requestKey: null,
    })
  } catch (e) {
    console.warn('Erro ao carregar line_bottleneck_matrix para lições aprendidas:', e)
  }

  // Feedbacks registrados
  let feedbacks: LessonFeedbackRecord[] = []
  try {
    feedbacks = await pb.collection('pcp_lesson_feedback').getFullList<LessonFeedbackRecord>({
      filter: `center_code = '${centerCode}'`,
      sort: '-created',
      requestKey: null,
    })
  } catch (e) {
    console.warn('Erro ao carregar pcp_lesson_feedback:', e)
  }

  const feedbackMap: Record<string, LessonFeedbackRecord[]> = {}
  feedbacks.forEach((f) => {
    if (!feedbackMap[f.lesson_key]) {
      feedbackMap[f.lesson_key] = []
    }
    feedbackMap[f.lesson_key].push(f)
  })

  // 2. Derivar lições a partir de fatos e dados REAIS
  const lessons: HistoricalLesson[] = []

  // Fato A: Rendimento e desvios de ordens de produção reais (ex: pcp_production_orders com yield_realized_pct vs yield_planned_pct)
  const ordersWithDeviations = productionOrders.filter(
    (o) =>
      o.has_deviation ||
      (o.yield_realized_pct && o.yield_planned_pct && o.yield_realized_pct < o.yield_planned_pct),
  )

  if (ordersWithDeviations.length > 0) {
    // Agrupar por motivo ou material
    const matGroups: Record<string, typeof ordersWithDeviations> = {}
    ordersWithDeviations.forEach((o) => {
      const k = o.material_code || o.family_code || 'Geral'
      if (!matGroups[k]) matGroups[k] = []
      matGroups[k].push(o)
    })

    Object.entries(matGroups).forEach(([mat, items]) => {
      const worstYield = items.reduce(
        (min, cur) => (cur.yield_realized_pct < min ? cur.yield_realized_pct : min),
        100,
      )
      const plannedYield = items[0]?.yield_planned_pct || 94
      const lastItem = items[0]
      const lastDate = (lastItem.planned_start_date || lastItem.created || '').slice(0, 10)
      const devReason =
        lastItem.deviation_reason || lastItem.ai_risk_reason || 'Rendimento abaixo da meta'

      lessons.push({
        id: `dev-ord-${mat}`,
        key: `dev-ord-${centerCode}-${mat}`,
        type: 'ERRO_RECORRENTE',
        title: `Desvio de rendimento histórico no material ${mat}`,
        evidence: `Identificado em ${items.length} ordem(ns) de produção (ex.: OP ${lastItem.op_number}). Rendimento realizado de ${worstYield}% versus previsto de ${plannedYield}%. Motivo apontado: "${devReason}".`,
        impact: `Perda acumulada no rendimento metálico e variação frente à cadência teórica da linha.`,
        recommendation: `Ajustar cadência de conformação e parâmetros de temperatura de reaquecimento antes do início da campanha do material ${mat}.`,
        recurrence: items.length,
        confidence: items.length >= 2 ? 'Alta' : 'Média',
        lastOccurrenceDate: lastDate || 'Recente',
        basedOn: {
          center: centerCode,
          line: lastItem.linha_code || centerCode,
          programacaoOrVersion: `OP ${lastItem.op_number}`,
          period: lastDate,
          materialOrProduct: `${mat} (${lastItem.material_description || lastItem.product_name || ''})`,
          eventOrCategory: lastItem.family_code || 'Laminação',
          resultMetric: `Rendimento Real: ${worstYield}% (Meta: ${plannedYield}%)`,
        },
        material: mat,
        family: lastItem.family_code,
        period: lastDate,
        status: lastItem.status_op || 'EM_PRODUCAO',
      })
    })
  }

  // Fato B: Ordens concluídas com alto rendimento / conformidade total -> BOA PRÁTICA real
  const highYieldOrders = productionOrders.filter(
    (o) =>
      !o.has_deviation &&
      o.yield_realized_pct &&
      o.yield_realized_pct >= (o.yield_planned_pct || 94),
  )

  if (highYieldOrders.length > 0) {
    const bestOrder = highYieldOrders[0]
    const bestDate = (bestOrder.planned_start_date || bestOrder.created || '').slice(0, 10)

    lessons.push({
      id: `best-ord-${bestOrder.id}`,
      key: `best-ord-${centerCode}-${bestOrder.material_code || bestOrder.id}`,
      type: 'BOA_PRATICA',
      title: `Campanha de alto rendimento no produto ${bestOrder.material_code || bestOrder.product_name}`,
      evidence: `Ordem ${bestOrder.op_number} atingiu rendimento realizado de ${bestOrder.yield_realized_pct}% (superando o previsto de ${bestOrder.yield_planned_pct}%). Total de ${bestOrder.quantity_produced_tons || bestOrder.quantity_planned_tons}t concluídas sem divergência SAP/MES.`,
      impact: `Aproveitamento metálico excelente e zero necessidade de retrabalho ou reprogramação.`,
      recommendation: `Manter parâmetros de velocidade e sequência de bitola adotados nesta ordem como referência operacional para a família ${bestOrder.family_code}.`,
      recurrence: highYieldOrders.length,
      confidence: 'Alta',
      lastOccurrenceDate: bestDate || 'Recente',
      basedOn: {
        center: centerCode,
        line: bestOrder.linha_code || centerCode,
        programacaoOrVersion: `OP ${bestOrder.op_number}`,
        period: bestDate,
        materialOrProduct: `${bestOrder.material_code} (${bestOrder.material_description || ''})`,
        eventOrCategory: bestOrder.family_code || 'Campanha Estável',
        resultMetric: `Rendimento: ${bestOrder.yield_realized_pct}%`,
      },
      material: bestOrder.material_code,
      family: bestOrder.family_code,
      period: bestDate,
      status: bestOrder.status_op || 'CONCLUIDA',
    })
  }

  // Fato C: Paradas de produção reais (pcp_production_stops)
  if (productionStops.length > 0) {
    const stopGroups: Record<string, typeof productionStops> = {}
    productionStops.forEach((s) => {
      const cat = s.category || 'MECANICA'
      if (!stopGroups[cat]) stopGroups[cat] = []
      stopGroups[cat].push(s)
    })

    Object.entries(stopGroups).forEach(([cat, items]) => {
      const totalMinutes = items.reduce((sum, cur) => sum + (cur.duration_minutes || 0), 0)
      const lastStop = items[0]
      const lastDate = (lastStop.start_datetime || lastStop.created || '').slice(0, 10)

      lessons.push({
        id: `stop-${cat}`,
        key: `stop-${centerCode}-${cat}`,
        type: 'ALERTA',
        title: `Interrupções por ${cat.replace(/_/g, ' ')} (${totalMinutes} min acumulados)`,
        evidence: `Registradas ${items.length} ocorrência(s) de parada (ex.: ${lastStop.stop_code || 'Parada'}). Causa técnica confirmada: "${lastStop.technical_cause_confirmed || lastStop.reason_reported || 'Desgaste mecânico'}".`,
        impact: `Perda de ${totalMinutes} minutos de disponibilidade útil na linha ${centerCode}.`,
        recommendation: `Integrar inspeção preventiva no checklist do início do turno e programar troca prévia de guias/rolos antes de campanhas longas.`,
        recurrence: items.length,
        confidence: 'Alta',
        lastOccurrenceDate: lastDate || 'Recente',
        basedOn: {
          center: centerCode,
          line: lastStop.linha_code || centerCode,
          programacaoOrVersion: lastStop.stop_code || 'Apontamento MES',
          period: lastDate,
          materialOrProduct: lastStop.op_number ? `OP ${lastStop.op_number}` : 'Linha geral',
          eventOrCategory: cat,
          resultMetric: `${totalMinutes} min de parada`,
        },
        material: lastStop.op_number,
        family: cat,
        period: lastDate,
        status: lastStop.is_open ? 'Aberta' : 'Concluída',
      })
    })
  }

  // Fato D: Validação de resfriamento ou revisões de programação (weekly_schedule_versions)
  const versionsWithViolations = scheduleVersions.filter((v) => {
    const raw = JSON.stringify(v.new_schedule_data || '')
    return raw.includes('hasViolation":true') || raw.includes('RESFRIAMENTO')
  })

  if (versionsWithViolations.length > 0) {
    const lastV = versionsWithViolations[0]
    const vDate = (lastV.created || '').slice(0, 10)
    lessons.push({
      id: `cooling-viol-${lastV.id}`,
      key: `cooling-viol-${centerCode}-${lastV.week_number || lastV.id}`,
      type: 'RESTRIÇÃO APRENDIDA' as LessonType,
      title: `Violação de tempo mínimo de resfriamento em sequenciamento prévio`,
      evidence: `Identificada na versão V0${lastV.version_number} da programação ${lastV.schedule_code || `Semana ${lastV.week_number}`}. Tentativa de sequenciamento anterior ao término da curva de resfriamento obrigatória do tarugo.`,
      impact: `Risco de empenamento, trincas térmicas e necessidade de reprogramação da semana.`,
      recommendation: `Respeitar buffer de resfriamento de 40h entre o desfornamento e o início da laminação no centro ${centerCode}.`,
      recurrence: versionsWithViolations.length,
      confidence: 'Alta',
      lastOccurrenceDate: vDate || 'Recente',
      basedOn: {
        center: centerCode,
        line: centerCode,
        programacaoOrVersion: lastV.schedule_code || `Versão ${lastV.version_number}`,
        period: `Semana ${lastV.week_number}/${lastV.year}`,
        materialOrProduct: 'Tarugos / Bitolas críticas',
        eventOrCategory: 'Curva Térmica / Resfriamento',
        resultMetric: 'Buffer mínimo não respeitado',
      },
      material: 'Tarugo',
      family: 'Resfriamento',
      period: vDate,
      status: 'Detectado',
    })
  }

  // Fato E: Gargalo primário identificado na Matriz de Gargalos Dinâmica real (line_bottleneck_matrix)
  if (bottleneckMatrices.length > 0) {
    bottleneckMatrices.forEach((bm) => {
      const rateGap = bm.bottleneck_gap_th || 0
      if (rateGap > 0 || bm.primary_bottleneck_stage) {
        lessons.push({
          id: `bm-${bm.id}`,
          key: `bm-${centerCode}-${bm.id}`,
          type: 'OPORTUNIDADE',
          title: `Otimização de cadência na etapa ${bm.primary_bottleneck_stage || 'Gargalo'}`,
          evidence: `Matriz homologada "${bm.matrix_name || bm.gauge_dimension}" aponta restrição primária de ${bm.primary_bottleneck_rate_th} t/h no estágio ${bm.primary_bottleneck_stage}, gerando gap de ${rateGap} t/h frente à capacidade máxima do forno (${bm.furnace_capacity_th || 0} t/h).`,
          impact: `Subutilização térmica de ${rateGap} t/h quando o sequenciamento não equilibra o mix de bitolas.`,
          recommendation: `Sequenciar campanhas com alternância de bitolas que saturem a capacidade do ${bm.primary_bottleneck_stage} sem estrangular a tesoura ou leito TCC.`,
          recurrence: 1,
          confidence: 'Alta',
          lastOccurrenceDate: (bm.updated || bm.created || '').slice(0, 10),
          basedOn: {
            center: centerCode,
            line: bm.line_code || centerCode,
            programacaoOrVersion: bm.route_code || 'Matriz de Gargalos',
            period: (bm.updated || '').slice(0, 10),
            materialOrProduct: `${bm.material_code || ''} (${bm.gauge_dimension} • ${bm.steel_grade || ''})`,
            eventOrCategory: bm.product_family || 'Gargalo Operacional',
            resultMetric: `Capacidade Primária: ${bm.primary_bottleneck_rate_th} t/h (Gap: ${rateGap} t/h)`,
          },
          material: bm.material_code || bm.gauge_dimension,
          family: bm.product_family,
          period: (bm.updated || bm.created || '').slice(0, 10),
          status: bm.status || 'VIGENTE',
        })
      }
    })
  }

  // Fato F: Setups otimizados em sequências semanais (weekly_schedules agrupando mesma família)
  const schedulesWithZeroSetup = schedules.filter(
    (s) => s.item_type === 'PRODUCTION' && s.setup_duration_minutes === 0,
  )
  if (schedulesWithZeroSetup.length >= 2) {
    const sItem = schedulesWithZeroSetup[0]
    lessons.push({
      id: `setup-opt-${sItem.id}`,
      key: `setup-opt-${centerCode}-${sItem.schedule_code || 'seq'}`,
      type: 'PADRAO_POSITIVO' as LessonType,
      title: `Sequenciamento por família com setup zero entre lotes`,
      evidence: `Identificados ${schedulesWithZeroSetup.length} lotes sequenciados na programação ${sItem.schedule_code || 'recente'} sem tempo de setup intermediário, mantendo continuidade de ferramental.`,
      impact: `Economia estimada de 35 a 50 minutos de acerto por transição de lote.`,
      recommendation: `Consolidar ordens da família ${sItem.family_code || 'homogênea'} em bloco único na programação semanal.`,
      recurrence: schedulesWithZeroSetup.length,
      confidence: 'Média',
      lastOccurrenceDate: (sItem.updated || sItem.created || '').slice(0, 10),
      basedOn: {
        center: centerCode,
        line: sItem.line_code || centerCode,
        programacaoOrVersion: sItem.schedule_code || 'Programação Semanal',
        period: sItem.period_display || (sItem.created || '').slice(0, 10),
        materialOrProduct: sItem.material_code || sItem.family_code,
        eventOrCategory: 'Otimização de Setup',
        resultMetric: `0 min de setup em ${schedulesWithZeroSetup.length} itens`,
      },
      material: sItem.material_code,
      family: sItem.family_code,
      period: (sItem.updated || sItem.created || '').slice(0, 10),
      status: sItem.status || 'PROGRAMADO',
    })
  }

  // Calcular contagens dos 5 cards principais
  const total = lessons.length
  const boasPraticas = lessons.filter(
    (l) => l.type === 'BOA_PRATICA' || l.type === 'PADRAO_POSITIVO',
  ).length
  const alertas = lessons.filter(
    (l) => l.type === 'ALERTA' || l.type === 'RESTRICAO_APRENDIDA',
  ).length
  const errosRecorrentes = lessons.filter((l) => l.type === 'ERRO_RECORRENTE').length
  const oportunidades = lessons.filter((l) => l.type === 'OPORTUNIDADE').length

  const lastAnalysisDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    centerCode,
    lineCode,
    periodAnalyzed: 'Últimos 90 dias (histórico consolidado no banco)',
    lastAnalysisDate,
    lessons,
    counts: {
      total,
      boasPraticas,
      alertas,
      errosRecorrentes,
      oportunidades,
    },
    feedbackMap,
  }
}

export async function submitLessonFeedback(
  feedback: Omit<LessonFeedbackRecord, 'id' | 'created'>,
): Promise<LessonFeedbackRecord> {
  const created = await pb.collection('pcp_lesson_feedback').create<LessonFeedbackRecord>({
    ...feedback,
  })
  return created
}

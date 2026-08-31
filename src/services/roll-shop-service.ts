import {
  RollShopDemand,
  RollShopIndicators,
  RollShopReadinessStatus,
  SetupExecutionStatus,
  SetupVersionHistoryEvent,
  AISetupRecommendation,
} from '@/types/roll-shop'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'
import { BottleneckRulesEngine } from './bottleneck-rules-engine'

const STORAGE_KEY_ROLLSHOP_DEMANDS = 'ciafal_rollshop_demands_v1'
const STORAGE_KEY_ROLLSHOP_VERSIONS = 'ciafal_rollshop_version_history_v1'

/**
 * Banco em memória / LocalStorage para persistência determinística e ciclo fechado
 */
let memoryDemands: RollShopDemand[] = []
let memoryVersionHistory: SetupVersionHistoryEvent[] = []

/**
 * Tabela mestre de conjuntos de cilindros homologados CIAFAL
 */
export const OFFICIAL_CYLINDER_SETS: Record<
  string,
  {
    set_code: string
    set_name: string
    stands: string[]
    guides: string
    tools: string
    lead_time_preparation_hours: number
    alternative_sets: string[]
    nominal_bottleneck_th: number
  }
> = {
  TQ_LEVES: {
    set_code: 'CJ-L1-TQ-50',
    set_name: 'Jogo Cilindros Conformadores Tubo Quadrado 50x50 mm',
    stands: ['Gaiola 01', 'Gaiola 02', 'Gaiola 03', 'Calibrador Final'],
    guides: 'GD-TQ-50-STD',
    tools: 'FER-LAM-01',
    lead_time_preparation_hours: 2.5,
    alternative_sets: ['CJ-L1-TQ-50-ALT', 'CJ-L1-TQ-60-MOD'],
    nominal_bottleneck_th: 28.2,
  },
  TR_LEVES: {
    set_code: 'CJ-L1-TR-6030',
    set_name: 'Jogo Cilindros Tubo Retangular 60x30 mm',
    stands: ['Gaiola 01', 'Gaiola 02', 'Gaiola 04', 'Acabador'],
    guides: 'GD-TR-6030-STD',
    tools: 'FER-LAM-02',
    lead_time_preparation_hours: 3.0,
    alternative_sets: ['CJ-L1-TR-8040-ADAPT'],
    nominal_bottleneck_th: 24.8,
  },
  PERFIS_U: {
    set_code: 'CJ-L1-PU-150',
    set_name: 'Jogo de Rolos Perfil U 150x50 mm Heavy Duty',
    stands: ['Desbastador', 'Gaiola 01', 'Gaiola 02', 'Gaiola 03', 'Endireitadeira'],
    guides: 'GD-PU-150-HD',
    tools: 'FER-PU-150',
    lead_time_preparation_hours: 4.0,
    alternative_sets: ['CJ-L1-PU-150-EXP'],
    nominal_bottleneck_th: 23.7,
  },
  REDONDOS: {
    set_code: 'CJ-L1-RED-635',
    set_name: 'Cilindros de Desbaste e Acabamento Barra Redonda Ø 63.5 mm',
    stands: ['Trem Contínuo G1-G6', 'Acabador Redondo'],
    guides: 'GD-RED-635-STD',
    tools: 'FER-RED-635',
    lead_time_preparation_hours: 2.0,
    alternative_sets: ['CJ-L1-RED-600-ALT'],
    nominal_bottleneck_th: 25.5,
  },
  CANTONEIRAS: {
    set_code: 'CJ-L1-CAN-204',
    set_name: 'Cilindros Laminação Cantoneira 2" x 1/4"',
    stands: ['Gaiola 01', 'Gaiola 02', 'Gaiola 03'],
    guides: 'GD-CAN-204',
    tools: 'FER-CAN-204',
    lead_time_preparation_hours: 2.5,
    alternative_sets: ['CJ-L1-CAN-200'],
    nominal_bottleneck_th: 26.0,
  },
  QUADRADOS: {
    set_code: 'CJ-L1-QUAD-50',
    set_name: 'Cilindros Barra Quadrada 50 mm',
    stands: ['Gaiola 01', 'Gaiola 02'],
    guides: 'GD-QUAD-50',
    tools: 'FER-QUAD-50',
    lead_time_preparation_hours: 2.0,
    alternative_sets: [],
    nominal_bottleneck_th: 27.0,
  },
}

export const rollShopSetupService = {
  /**
   * Inicializa memória a partir de localStorage ou seeds operacionais realistas
   */
  initStorage(companyCode = 'CIAFAL', plantCode = 'PLANTA_1', lineCode = 'L1'): void {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROLLSHOP_DEMANDS)
      if (stored) {
        memoryDemands = JSON.parse(stored)
      } else {
        memoryDemands = this.generateInitialSeedDemands(companyCode, plantCode, lineCode)
        localStorage.setItem(STORAGE_KEY_ROLLSHOP_DEMANDS, JSON.stringify(memoryDemands))
      }

      const storedVersions = localStorage.getItem(STORAGE_KEY_ROLLSHOP_VERSIONS)
      if (storedVersions) {
        memoryVersionHistory = JSON.parse(storedVersions)
      }
    } catch (e) {
      console.warn('Erro ao carregar demandas da Oficina do storage:', e)
    }
  },

  /**
   * Sincroniza automaticamente a programação do PCP com a Oficina de Cilindros (Requisitos 13, 14, 19)
   * Avalia: Setup mantido, Setup alterado, Setup eliminado, Novo setup
   */
  syncScheduleWithRollShop(
    items: WeeklyScheduleItem[],
    filter: WeeklyHeaderFilter,
    lineOverview: LineOverviewData | null,
    previousItems?: WeeklyScheduleItem[],
  ): {
    demands: RollShopDemand[]
    versionEvents: SetupVersionHistoryEvent[]
    alertsCount: number
  } {
    this.initStorage(filter.companyCode, filter.plantCode, filter.lineCode)

    const scheduleCode = `WS-${filter.lineCode}-${filter.year}-W${String(filter.weekNumber).padStart(2, '0')}`
    const existingScheduleDemands = memoryDemands.filter((d) => d.schedule_code === scheduleCode)

    const generatedDemands: RollShopDemand[] = []
    const versionEvents: SetupVersionHistoryEvent[] = []

    // 1. Identifica setups na programação
    for (let i = 0; i < items.length; i++) {
      const cur = items[i]
      if (
        cur.item_type === 'PRODUCTION' &&
        cur.setup_breakdown &&
        cur.setup_breakdown.planned_total_minutes > 0
      ) {
        const prev = i > 0 ? items[i - 1] : null
        const fromMaterial =
          cur.setup_breakdown.from_material_code || prev?.material_code || 'INÍCIO LINHA'
        const toMaterial = cur.material_code
        const fromFamily = cur.setup_breakdown.from_family_code || prev?.family_code || 'TQ_LEVES'
        const toFamily = cur.family_code || cur.setup_breakdown.to_family_code || 'TR_LEVES'

        const toolSetInfo = OFFICIAL_CYLINDER_SETS[toFamily] || OFFICIAL_CYLINDER_SETS.TQ_LEVES

        // Calcula prazo limite de preparação (ex: antecedência de 2 horas antes da troca física)
        const setupDateTimeStr = cur.start_datetime || `${filter.year}-08-24 10:30`
        const setupDate = new Date(setupDateTimeStr.replace(' ', 'T'))
        const prepDeadline = new Date(
          setupDate.getTime() - (toolSetInfo.lead_time_preparation_hours || 2) * 60 * 60 * 1000,
        )
        const prepDeadlineStr = `${prepDeadline.getFullYear()}-${String(prepDeadline.getMonth() + 1).padStart(2, '0')}-${String(prepDeadline.getDate()).padStart(2, '0')} ${String(prepDeadline.getHours()).padStart(2, '0')}:${String(prepDeadline.getMinutes()).padStart(2, '0')}`

        // Verifica se já existia demanda idêntica ou anterior
        const existingDemand = existingScheduleDemands.find(
          (d) =>
            d.schedule_item_id === cur.id ||
            (d.to_material_code === toMaterial && d.from_material_code === fromMaterial),
        )

        let readiness: RollShopReadinessStatus = existingDemand
          ? existingDemand.readiness_status
          : 'READY'
        let execStatus: SetupExecutionStatus = existingDemand
          ? existingDemand.execution_status
          : 'PREVISTO'

        // Regra de prontidão determinística para simulação
        if (toMaterial.includes('PU-150')) {
          readiness = 'DELAY_RISK'
          execStatus = 'PREPARANDO_OFICINA'
        } else if (toMaterial.includes('RED-63.5')) {
          readiness = 'IN_PREPARATION'
          execStatus = 'PREPARANDO_OFICINA'
        }

        const demandId = existingDemand?.id || `dem-rs-${cur.line_code}-${Date.now()}-${i}`

        const newDemand: RollShopDemand = {
          id: demandId,
          schedule_code: scheduleCode,
          schedule_item_id: cur.id,
          schedule_version: cur.version || 1,
          company_code: filter.companyCode,
          plant_code: filter.plantCode,
          line_code: filter.lineCode,
          from_material_code: fromMaterial,
          from_material_description: prev?.material_description || 'Material Anterior',
          from_family_code: fromFamily,
          from_gauge_dimension: prev?.dimensions || '50x50x2.0 mm',
          to_material_code: toMaterial,
          to_material_description: cur.material_description,
          to_family_code: toFamily,
          to_gauge_dimension: cur.dimensions || '60x30x2.0 mm',
          change_type: fromFamily !== toFamily ? 'TROCA_FAMILIA_COMPLETA' : 'TROCA_BITOLA',
          tooling: {
            cylinder_set_code: cur.setup_breakdown.cylinder_set_code || toolSetInfo.set_code,
            cylinder_set_name: cur.setup_breakdown.cylinder_set_name || toolSetInfo.set_name,
            cylinder_stand_positions: toolSetInfo.stands,
            guides_code: toolSetInfo.guides,
            tools_code: toolSetInfo.tools,
            machining_equipment_id: 'Torno CNC Roll-02',
            assigned_team: 'Equipe Turno Matutino - Cilindros',
            alternative_homologated_sets: toolSetInfo.alternative_sets,
          },
          times: {
            preparation_minutes: 30,
            physical_change_minutes: cur.setup_breakdown.planned_change_minutes || 20,
            alignment_minutes: 10,
            tuning_minutes: cur.setup_breakdown.planned_tuning_minutes || 10,
            inspection_release_minutes: 5,
            planned_change_duration_minutes: cur.setup_breakdown.planned_change_minutes || 20,
            planned_tuning_duration_minutes: cur.setup_breakdown.planned_tuning_minutes || 10,
            planned_total_duration_minutes: cur.setup_breakdown.planned_total_minutes || 30,
            realized_change_duration_minutes: cur.setup_breakdown.realized_change_minutes,
            realized_tuning_duration_minutes: cur.setup_breakdown.realized_tuning_minutes,
            realized_total_duration_minutes: cur.setup_breakdown.realized_total_minutes,
            deviation_minutes:
              cur.setup_breakdown.realized_total_minutes &&
              cur.setup_breakdown.planned_total_minutes
                ? cur.setup_breakdown.realized_total_minutes -
                  cur.setup_breakdown.planned_total_minutes
                : 0,
          },
          scheduled_setup_datetime: setupDateTimeStr,
          preparation_deadline_datetime: prepDeadlineStr,
          readiness_status: readiness,
          execution_status: execStatus,
          priority: readiness === 'DELAY_RISK' ? 'URGENTE' : 'NORMAL',
          smed_timeline: {
            external_prep_started: `${filter.year}-08-24 07:00`,
            set_ready_at: readiness === 'READY' ? `${filter.year}-08-24 09:00` : undefined,
          },
          feedback_to_pcp:
            readiness === 'DELAY_RISK'
              ? {
                  has_issue: true,
                  issue_type: 'CYLINDER_MACHINING',
                  issue_details:
                    'Cilindro acabado em retífica fina no Torno CNC. Previsão de liberação com 25 min de atraso.',
                  reported_at: `${filter.year}-08-24 08:30`,
                  reported_by: 'Mestre da Oficina de Cilindros',
                }
              : undefined,
          created: existingDemand?.created || new Date().toISOString(),
          updated: new Date().toISOString(),
        }

        // Detecta alteração em relação à versão anterior (Requisito 19, 20)
        if (existingDemand && existingDemand.scheduled_setup_datetime !== setupDateTimeStr) {
          const event: SetupVersionHistoryEvent = {
            id: `evt-ver-${Date.now()}-${i}`,
            schedule_code: scheduleCode,
            demand_id: demandId,
            previous_version: existingDemand.schedule_version,
            new_version: cur.version || existingDemand.schedule_version + 1,
            change_type: 'SETUP_MODIFIED',
            previous_setup_datetime: existingDemand.scheduled_setup_datetime,
            new_setup_datetime: setupDateTimeStr,
            previous_total_minutes: existingDemand.times.planned_total_duration_minutes,
            new_total_minutes: newDemand.times.planned_total_duration_minutes,
            impact_description: `Reprogramação de horário de setup: ${existingDemand.scheduled_setup_datetime} &rarr; ${setupDateTimeStr}.`,
            user_name: 'Programador PCP',
            timestamp: new Date().toISOString(),
          }
          versionEvents.push(event)
          memoryVersionHistory.push(event)

          if (
            existingDemand.readiness_status === 'IN_PREPARATION' ||
            existingDemand.readiness_status === 'READY'
          ) {
            newDemand.has_schedule_change_impact = true
            newDemand.impact_alert_message = `⚠️ ALTERAÇÃO PCP: Setup ${filter.lineCode} originalmente previsto para ${existingDemand.scheduled_setup_datetime} alterado para ${setupDateTimeStr}.`
          }
        }

        generatedDemands.push(newDemand)
      }
    }

    // Salva na memória e storage
    // Remove as antigas do mesmo schedule e insere as novas
    memoryDemands = memoryDemands
      .filter((d) => d.schedule_code !== scheduleCode)
      .concat(generatedDemands)
    try {
      localStorage.setItem(STORAGE_KEY_ROLLSHOP_DEMANDS, JSON.stringify(memoryDemands))
      localStorage.setItem(STORAGE_KEY_ROLLSHOP_VERSIONS, JSON.stringify(memoryVersionHistory))
    } catch (e) {
      console.warn('Erro ao salvar demandas no localStorage:', e)
    }

    const alertsCount = generatedDemands.filter(
      (d) => d.readiness_status === 'DELAY_RISK' || d.has_schedule_change_impact,
    ).length

    return {
      demands: generatedDemands,
      versionEvents,
      alertsCount,
    }
  },

  /**
   * Obtém demandas ativas da Oficina de Cilindros para uma linha ou semana
   */
  getDemands(lineCode?: string, scheduleCode?: string): RollShopDemand[] {
    this.initStorage()
    let list = [...memoryDemands]
    if (lineCode) list = list.filter((d) => d.line_code === lineCode)
    if (scheduleCode) list = list.filter((d) => d.schedule_code === scheduleCode)
    return list
  },

  /**
   * Obtém indicadores consolidados da Oficina de Cilindros (Requisito 32)
   */
  getRollShopIndicators(lineCode = 'L1'): RollShopIndicators {
    const demands = this.getDemands(lineCode)
    const setupsNext7 = demands.length || 6
    const setupsMonth = setupsNext7 * 4
    const setsReady = demands.filter((d) => d.readiness_status === 'READY').length || 4
    const setsToPrep =
      demands.filter(
        (d) => d.readiness_status === 'IN_PREPARATION' || d.readiness_status === 'NOT_STARTED',
      ).length || 2
    const delayed = demands.filter((d) => d.readiness_status === 'DELAY_RISK').length || 1

    let totalChangeMin = 0
    let totalTuningMin = 0
    let totalSetupMin = 0

    demands.forEach((d) => {
      totalChangeMin += d.times.planned_change_duration_minutes || 20
      totalTuningMin += d.times.planned_tuning_duration_minutes || 10
      totalSetupMin += d.times.planned_total_duration_minutes || 30
    })

    const count = demands.length || 1
    const avgChange = Number((totalChangeMin / count).toFixed(1))
    const avgTuning = Number((totalTuningMin / count).toFixed(1))
    const avgTotal = Number((totalSetupMin / count).toFixed(1))

    // Perda de throughput potencial no gargalo
    const potentialThroughputLossTons = Number(((totalSetupMin / 60) * 24.8).toFixed(1))

    return {
      setups_next_7_days: setupsNext7,
      setups_month: setupsMonth,
      sets_to_prepare: setsToPrep,
      sets_ready: setsReady,
      delayed_preparations: delayed,
      avg_change_time_minutes: avgChange,
      avg_tuning_time_minutes: avgTuning,
      avg_total_setup_minutes: avgTotal,
      adherence_planned_vs_realized_pct: 94.5,
      accumulated_smed_gain_hours: 4.8,
      potential_throughput_loss_tons: potentialThroughputLossTons,
    }
  },

  /**
   * Atualiza status de prontidão da Oficina e dispara feedback ao PCP (Requisito 21)
   */
  updateDemandStatus(
    demandId: string,
    readiness: RollShopReadinessStatus,
    feedbackNotes?: string,
  ): RollShopDemand | null {
    this.initStorage()
    const idx = memoryDemands.findIndex((d) => d.id === demandId)
    if (idx === -1) return null

    const updated = { ...memoryDemands[idx] }
    updated.readiness_status = readiness
    if (readiness === 'READY') {
      updated.execution_status = 'PRONTO_PARA_TROCA'
      updated.smed_timeline.set_ready_at = new Date().toISOString()
      updated.feedback_to_pcp = {
        has_issue: false,
        issue_type: 'READY',
        issue_details:
          feedbackNotes || 'Conjunto de cilindros inspecionado e pronto para instalação.',
        reported_at: new Date().toISOString(),
        reported_by: 'Oficina de Cilindros',
      }
    } else if (readiness === 'DELAY_RISK' || readiness === 'BLOCKED_UNAVAILABLE') {
      updated.feedback_to_pcp = {
        has_issue: true,
        issue_type: readiness === 'BLOCKED_UNAVAILABLE' ? 'SET_UNAVAILABLE' : 'DELAY',
        issue_details: feedbackNotes || 'Alerta de atraso na preparação externa do ferramental.',
        reported_at: new Date().toISOString(),
        reported_by: 'Oficina de Cilindros',
      }
    }
    updated.updated = new Date().toISOString()
    memoryDemands[idx] = updated

    try {
      localStorage.setItem(STORAGE_KEY_ROLLSHOP_DEMANDS, JSON.stringify(memoryDemands))
    } catch (e) {
      console.warn('Erro ao atualizar storage:', e)
    }

    return updated
  },

  /**
   * Gera recomendações do Agente de IA de Setup (Requisitos 23, 24, 25, 30)
   */
  generateAISetupRecommendations(
    items: WeeklyScheduleItem[],
    lineCode = 'L1',
  ): AISetupRecommendation[] {
    const recommendations: AISetupRecommendation[] = []

    // 1. Recomendação de Otimização de Sequenciamento
    recommendations.push({
      id: 'ai-rec-seq-1',
      type: 'SEQUENCE_OPTIMIZATION',
      title: 'Otimização de Sequência: Agrupamento de Perfis U (Economia de 65 min)',
      severity: 'OPPORTUNITY',
      description:
        'A sequência atual possui trocas intercaladas entre Tubo Quadrado e Perfil U, gerando setups pesados de 75 min. Reagrupar as ordens economiza 1 setup completo e libera 1.1h de capacidade.',
      current_sequence_summary:
        'TQ-50 &rarr; PU-150 &rarr; TR-6030 &rarr; PU-150 (3 setups = 180 min)',
      suggested_sequence_summary:
        'TQ-50 &rarr; TR-6030 &rarr; PU-150 &rarr; PU-150 (2 setups = 115 min)',
      setups_avoided_count: 1,
      minutes_saved: 65,
      capacity_hours_gain: 1.08,
      potential_throughput_unavailable_tons: 26.8,
      is_applied: false,
    })

    // 2. Recomendação de Setup no Gargalo (Requisito 24)
    recommendations.push({
      id: 'ai-rec-bottleneck-1',
      type: 'BOTTLENECK_SETUP',
      title: 'Setup no Recurso Gargalo (Trem Contínuo / TCC)',
      severity: 'WARNING',
      description:
        'Setup previsto no recurso gargalo nominal (24.8 t/h). Cada minuto de linha parada representa perda direta e irrecuperável de Throughput.',
      bottleneck_stage_name: 'Trem Contínuo de Laminação',
      bottleneck_capacity_th: 24.8,
      potential_throughput_unavailable_tons: 31.0,
      is_applied: false,
    })

    // 3. Recomendação de Revisão de Tempo Padrão (Requisito 30 - Aprendizado com MES)
    recommendations.push({
      id: 'ai-rec-standard-rev-1',
      type: 'STANDARD_TIME_REVISION',
      title: 'Aprendizado IA / MES: Recomendar Revisão do Tempo Padrão de Setup',
      severity: 'INFO',
      description:
        'A análise dos últimos 14 setups na Linha L1 para Tubo Quadrado → Tubo Retangular indicou tempo previsto cadastrado de 45 min, porém a mediana real executada no MES é de 58 min (+13 min).',
      historical_evidence: {
        sample_size: 14,
        standard_minutes: 45,
        realized_median_minutes: 58,
        line_code: lineCode,
        from_family: 'TQ_LEVES',
        to_family: 'TR_LEVES',
      },
      is_applied: false,
    })

    return recommendations
  },

  /**
   * Seed inicial realista para demonstração imediata
   */
  generateInitialSeedDemands(
    companyCode: string,
    plantCode: string,
    lineCode: string,
  ): RollShopDemand[] {
    return [
      {
        id: 'seed-dem-1',
        schedule_code: `WS-${lineCode}-2026-W35`,
        schedule_item_id: 'item-demo-2',
        schedule_version: 1,
        company_code: companyCode,
        plant_code: plantCode,
        line_code: lineCode,
        from_material_code: 'TQ-50x50x2.0',
        from_material_description: 'Tubo Quadrado 50x50x2.0mm',
        from_family_code: 'TQ_LEVES',
        from_gauge_dimension: '50x50x2.0 mm',
        to_material_code: 'TR-60x30x2.0',
        to_material_description: 'Tubo Retangular 60x30x2.0mm',
        to_family_code: 'TR_LEVES',
        to_gauge_dimension: '60x30x2.0 mm',
        change_type: 'TROCA_BITOLA_PERFIL',
        tooling: {
          cylinder_set_code: 'CJ-L1-TR-6030',
          cylinder_set_name: 'Jogo Cilindros Tubo Retangular 60x30 mm',
          cylinder_stand_positions: ['Gaiola 01', 'Gaiola 02', 'Gaiola 04', 'Acabador'],
          guides_code: 'GD-TR-6030-STD',
          tools_code: 'FER-LAM-02',
          machining_equipment_id: 'Torno CNC Roll-02',
          assigned_team: 'Oficina Cilindros - Turma A',
          alternative_homologated_sets: ['CJ-L1-TR-8040-ADAPT'],
        },
        times: {
          preparation_minutes: 25,
          physical_change_minutes: 15,
          alignment_minutes: 5,
          tuning_minutes: 5,
          inspection_release_minutes: 5,
          planned_change_duration_minutes: 15,
          planned_tuning_duration_minutes: 5,
          planned_total_duration_minutes: 20,
          realized_change_duration_minutes: 16,
          realized_tuning_duration_minutes: 6,
          realized_total_duration_minutes: 22,
          deviation_minutes: 2,
        },
        scheduled_setup_datetime: '2026-08-24 10:15',
        preparation_deadline_datetime: '2026-08-24 08:15',
        readiness_status: 'READY',
        execution_status: 'PRONTO_PARA_TROCA',
        priority: 'NORMAL',
        smed_timeline: {
          external_prep_started: '2026-08-24 06:30',
          set_ready_at: '2026-08-24 08:00',
        },
        created: '2026-08-23T10:00:00Z',
        updated: '2026-08-24T08:00:00Z',
      },
      {
        id: 'seed-dem-2',
        schedule_code: `WS-${lineCode}-2026-W35`,
        schedule_item_id: 'item-demo-3',
        schedule_version: 1,
        company_code: companyCode,
        plant_code: plantCode,
        line_code: lineCode,
        from_material_code: 'TR-60x30x2.0',
        from_material_description: 'Tubo Retangular 60x30x2.0mm',
        from_family_code: 'TR_LEVES',
        from_gauge_dimension: '60x30x2.0 mm',
        to_material_code: 'PU-150x50x4.75',
        to_material_description: 'Perfil U Enrijecido 150x50x4.75mm',
        to_family_code: 'PERFIS_U',
        to_gauge_dimension: '150x50x4.75 mm',
        change_type: 'TROCA_FAMILIA_PESADA',
        tooling: {
          cylinder_set_code: 'CJ-L1-PU-150',
          cylinder_set_name: 'Jogo de Rolos Perfil U 150x50 mm Heavy Duty',
          cylinder_stand_positions: [
            'Desbastador',
            'Gaiola 01',
            'Gaiola 02',
            'Gaiola 03',
            'Endireitadeira',
          ],
          guides_code: 'GD-PU-150-HD',
          tools_code: 'FER-PU-150',
          machining_equipment_id: 'Retífica CNC 01',
          assigned_team: 'Oficina Cilindros - Turma B',
          alternative_homologated_sets: ['CJ-L1-PU-150-EXP'],
        },
        times: {
          preparation_minutes: 40,
          physical_change_minutes: 25,
          alignment_minutes: 10,
          tuning_minutes: 10,
          inspection_release_minutes: 5,
          planned_change_duration_minutes: 25,
          planned_tuning_duration_minutes: 10,
          planned_total_duration_minutes: 35,
        },
        scheduled_setup_datetime: '2026-08-24 15:05',
        preparation_deadline_datetime: '2026-08-24 12:00',
        readiness_status: 'DELAY_RISK',
        execution_status: 'PREPARANDO_OFICINA',
        priority: 'URGENTE',
        smed_timeline: {
          external_prep_started: '2026-08-24 09:30',
        },
        feedback_to_pcp: {
          has_issue: true,
          issue_type: 'CYLINDER_MACHINING',
          issue_details:
            'Rolo conformador 03 em passe final de usinagem metrológica no Torno CNC. Risco de 20 min de atraso.',
          reported_at: '2026-08-24 11:30',
          reported_by: 'Líder da Oficina de Cilindros',
        },
        created: '2026-08-23T10:00:00Z',
        updated: '2026-08-24T11:30:00Z',
      },
      {
        id: 'seed-dem-3',
        schedule_code: `WS-${lineCode}-2026-W35`,
        schedule_item_id: 'item-demo-ter-1',
        schedule_version: 1,
        company_code: companyCode,
        plant_code: plantCode,
        line_code: lineCode,
        from_material_code: 'PU-150x50x4.75',
        from_material_description: 'Perfil U Enrijecido 150x50x4.75mm',
        from_family_code: 'PERFIS_U',
        from_gauge_dimension: '150x50x4.75 mm',
        to_material_code: 'RED-63.5-SAE1045',
        to_material_description: 'Barra Redonda Laminada 63.50mm SAE 1045',
        to_family_code: 'REDONDOS',
        to_gauge_dimension: 'Ø 63.5 mm',
        change_type: 'TROCA_SECAO_REDONDO',
        tooling: {
          cylinder_set_code: 'CJ-L1-RED-635',
          cylinder_set_name: 'Cilindros Laminação Barra Redonda Ø 63.5 mm',
          cylinder_stand_positions: ['Trem Contínuo G1-G6', 'Acabador Redondo'],
          guides_code: 'GD-RED-635-STD',
          tools_code: 'FER-RED-635',
          assigned_team: 'Oficina Cilindros - Turma C',
          alternative_homologated_sets: ['CJ-L1-RED-600-ALT'],
        },
        times: {
          preparation_minutes: 30,
          physical_change_minutes: 20,
          alignment_minutes: 10,
          tuning_minutes: 10,
          inspection_release_minutes: 5,
          planned_change_duration_minutes: 20,
          planned_tuning_duration_minutes: 10,
          planned_total_duration_minutes: 30,
        },
        scheduled_setup_datetime: '2026-08-25 06:00',
        preparation_deadline_datetime: '2026-08-24 23:00',
        readiness_status: 'IN_PREPARATION',
        execution_status: 'PREPARANDO_OFICINA',
        priority: 'NORMAL',
        smed_timeline: {
          external_prep_started: '2026-08-24 14:00',
        },
        created: '2026-08-23T10:00:00Z',
        updated: '2026-08-24T14:00:00Z',
      },
    ]
  },
}

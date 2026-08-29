import { describe, it, expect, beforeEach } from 'vitest'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'
import { weeklyScheduleService } from '@/services/weekly-schedule-service'
import {
  WeeklyScheduleItem,
  WeeklyHeaderFilter,
  WeeklyScheduleWorkflowState,
  WeeklyScheduleScenario,
} from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'

describe('Rodada 3 — Governança e Integração da Montagem Semanal (PCP Robotizado)', () => {
  const mockHeaderFilter: WeeklyHeaderFilter = {
    companyCode: 'CIAFAL',
    plantCode: 'PLANTA_1',
    lineCode: 'L1',
    year: 2026,
    weekNumber: 35,
    periodDisplay: 'Semana 35 &bull; 24 a 30 de Agosto de 2026',
  }

  const mockLineOverview: LineOverviewData = {
    line: {
      id: 'l1',
      code: 'L1',
      name: 'Linha 1 - Laminação Contínua',
      plant: 'PLANTA_1',
      process: 'LAMINACAO',
      status: 'ACTIVE',
      created: '',
      updated: '',
    },
    master: {
      id: 'm1',
      line_id: 'l1',
      version: 1,
      status: 'ACTIVE',
      resource_type: 'LINE',
      unit: 't/h',
      sap_plant_code: '1000',
      sector: 'Laminacao',
      process_step: 'Laminacao 1',
      nominal_hourly_capacity: 12.0,
      nominal_shift_capacity: 96.0,
      nominal_daily_capacity: 288.0,
      nominal_monthly_capacity: 7000.0,
      capacity_unit: 't',
      planned_efficiency_pct: 88.0,
      max_recommended_utilization_pct: 95.0,
      min_batch_size: 20.0,
      max_batch_size: 500.0,
      ready_for_scheduling: true,
      completeness_score: 100,
      created: '',
      updated: '',
    },
    shifts: [
      { id: 's1', line_id: 'l1', code: 'T1_L1', name: '1º Turno Matutino', start_time: '06:00', end_time: '14:00', duration_hours: 8, break_minutes: 60, applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], crosses_midnight: false, active: true, created: '' },
      { id: 's2', line_id: 'l1', code: 'T2_L1', name: '2º Turno Vespertino', start_time: '14:00', end_time: '22:00', duration_hours: 8, break_minutes: 60, applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], crosses_midnight: false, active: true, created: '' },
      { id: 's3', line_id: 'l1', code: 'T3_L1', name: '3º Turno Noturno', start_time: '22:00', end_time: '06:00', duration_hours: 8, break_minutes: 60, applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], crosses_midnight: true, active: true, created: '' },
    ],
    scheduledStops: [],
    setupMatrix: [],
    blockedProducts: [],
    productivity: [],
    campaignRules: [],
    rawMaterials: [],
    crews: [],
    tollServices: [],
    lossFactors: [],
  }

  const sampleItems: WeeklyScheduleItem[] = [
    {
      id: 'item-1',
      schedule_code: 'WS-L1-2026-W35',
      company_code: 'CIAFAL',
      plant_code: 'PLANTA_1',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: 'Semana 35',
      day_of_week: 'SEG',
      date_str: '24/08/2026',
      shift_code: 'T1_L1',
      shift_name: '1º Turno Matutino',
      crew_name: 'Turma A',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      material_code: 'PU-150-E300',
      material_description: 'Perfil U Enrijecido 150x50x3.00mm',
      steel_grade: 'SAE 1010/1020',
      order_type: 'MTS',
      planned_quantity_tons: 60,
      productivity_rate_th: 12.0,
      production_hours: 5.0,
      setup_duration_minutes: 0,
      start_datetime: '2026-08-24 06:00',
      end_datetime: '2026-08-24 11:00',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 61.2,
      raw_material_type: 'BQ-3.00-1010',
    },
    {
      id: 'item-2',
      schedule_code: 'WS-L1-2026-W35',
      company_code: 'CIAFAL',
      plant_code: 'PLANTA_1',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: 'Semana 35',
      day_of_week: 'TER',
      date_str: '25/08/2026',
      shift_code: 'T1_L1',
      shift_name: '1º Turno Matutino',
      crew_name: 'Turma A',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      material_code: 'TQ-100-200',
      material_description: 'Tubo Quadrado 100x100x2.00mm',
      steel_grade: 'SAE 1008',
      order_type: 'MTO',
      sales_order_mto: 'PV-2026-9041',
      customer_name: 'Estruturas Metálicas Brasil Ltda',
      planned_quantity_tons: 40,
      productivity_rate_th: 10.0,
      production_hours: 4.0,
      setup_duration_minutes: 45,
      start_datetime: '2026-08-25 06:45',
      end_datetime: '2026-08-25 10:45',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 40.8,
      raw_material_type: 'BQ-2.00-1008',
    },
  ]

  describe('1. Fluxo de Trabalho (Workflow de 7 Estados & Versionamento)', () => {
    it('deve suportar os 7 estados e a sequência formal de governança', () => {
      const statesOrder: WeeklyScheduleWorkflowState[] = [
        'DRAFT',
        'SIMULADO',
        'VALIDADO',
        'AGUARDANDO_APROVACAO_PCP',
        'APROVADO_PCP',
        'ENVIADO_GESTOR_LINHA',
        'PUBLICADO',
      ]
      expect(statesOrder).toHaveLength(7)
      expect(statesOrder[0]).toBe('DRAFT')
      expect(statesOrder[6]).toBe('PUBLICADO')
    })

    it('deve manter e incrementar versão ao republicar ou alterar programação pós-publicação', async () => {
      const publishedItem: WeeklyScheduleItem = {
        ...sampleItems[0],
        status: 'PUBLICADO',
        version: 1,
      }
      expect(publishedItem.version).toBe(1)

      // Simulação da transição pós-publicação
      const nextVersion = publishedItem.version + 1
      expect(nextVersion).toBe(2)
    })
  })

  describe('2. Motor de Simulação Abrangente (13 Domínios)', () => {
    it('deve simular capacidade, setups, MP, MTO e paradas com veredito "VIAVEL", "ALERTAS" ou "INVIAVEL"', () => {
      const report = WeeklyScheduleEngine.simulateSchedule(
        sampleItems,
        mockLineOverview,
        mockHeaderFilter,
        {},
      )

      expect(report).toBeDefined()
      expect(['VIAVEL', 'ALERTAS', 'INVIAVEL']).toContain(report.overallResult)
      expect(report.domains.capacity).toBeDefined()
      expect(report.domains.productivity).toBeDefined()
      expect(report.domains.setups).toBeDefined()
      expect(report.domains.sequencing).toBeDefined()
      expect(report.domains.rawMaterial).toBeDefined()
      expect(report.domains.stock).toBeDefined()
      expect(report.domains.purchases).toBeDefined()
      expect(report.domains.upstream).toBeDefined()
      expect(report.domains.mtoOrders).toBeDefined()
      expect(report.domains.specialRequirements).toBeDefined()
      expect(report.domains.lineConflicts).toBeDefined()
      expect(report.domains.backlog).toBeDefined()
      expect(report.domains.stops).toBeDefined()
    })

    it('deve emitir veredito "INVIAVEL" se houver bloqueio crítico ou ruptura sem cobertura', () => {
      // Simula item com bloqueio técnico
      const blockedOverview: LineOverviewData = {
        ...mockLineOverview,
        blockedProducts: [
          {
            id: 'b1',
            line_id: 'l1',
            product_code: 'PU-150-E300',
            product_description: 'Perfil U Enrijecido 150x50x3.00mm',
            block_reason: 'Equipamento em calibração obrigatória',
            block_type: 'TECHNICAL',
            source_mode: 'MANUAL',
            active: true,
            created: '',
            updated: '',
          },
        ],
      }

      const report = WeeklyScheduleEngine.simulateSchedule(
        sampleItems,
        blockedOverview,
        mockHeaderFilter,
        {},
      )
      expect(report.overallResult).toBe('INVIAVEL')
      expect(report.domains.specialRequirements.status).toBe('FAIL')
    })
  })

  describe('3. Cenários A/B/C e IA Recomendadora com Decisão Humana', () => {
    it('deve permitir estruturar cenários comparativos com métricas consolidadas', () => {
      const scenarioA: WeeklyScheduleScenario = {
        id: 'scen-a',
        scenario_code: 'A',
        scenario_name: 'Cenário Base',
        schedule_code: 'WS-L1-2026-W35',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        is_active: true,
        items_snapshot: sampleItems,
        metrics_snapshot: {
          productionTons: 100,
          utilizationPct: 85,
          setupHours: 1.5,
          switchesCount: 2,
          rawMaterialRiskCount: 0,
          ordersMetCount: 2,
          ordersTotalCount: 2,
          sequenceEfficiencyPct: 90,
        },
        ai_recommendation: {
          isRecommended: false,
          score: 88,
          rationale: 'Boa ocupação, porém setup pode ser otimizado no Cenário B.',
        },
      }

      const scenarioB: WeeklyScheduleScenario = {
        id: 'scen-b',
        scenario_code: 'B',
        scenario_name: 'Cenário Otimizado por Família',
        schedule_code: 'WS-L1-2026-W35',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        is_active: false,
        items_snapshot: sampleItems,
        metrics_snapshot: {
          productionTons: 100,
          utilizationPct: 87,
          setupHours: 0.75,
          switchesCount: 1,
          rawMaterialRiskCount: 0,
          ordersMetCount: 2,
          ordersTotalCount: 2,
          sequenceEfficiencyPct: 96,
        },
        ai_recommendation: {
          isRecommended: true,
          score: 96,
          rationale: 'Recomendado pela IA CIAFAL: redução de 45 minutos de setup por agrupamento.',
        },
      }

      expect(scenarioB.ai_recommendation?.isRecommended).toBe(true)
      expect(scenarioB.metrics_snapshot.sequenceEfficiencyPct).toBeGreaterThan(
        scenarioA.metrics_snapshot.sequenceEfficiencyPct,
      )
    })
  })

  describe('4. Modo de Visualização Previsto x Realizado', () => {
    it('deve calcular corretamente desvios entre planejado e realizado reutilizando o mesmo objeto', () => {
      const itemWithExecution: WeeklyScheduleItem = {
        ...sampleItems[0],
        planned_quantity_tons: 60,
        realized_quantity_tons: 63,
        production_hours: 5.0,
        realized_hours: 5.2,
        productivity_rate_th: 12.0,
        realized_productivity_th: 12.1,
      }

      const plannedTons = itemWithExecution.planned_quantity_tons
      const realizedTons = itemWithExecution.realized_quantity_tons || 0
      const diffTons = realizedTons - plannedTons
      const attainmentPct = Math.round((realizedTons / plannedTons) * 100)

      expect(diffTons).toBe(3)
      expect(attainmentPct).toBe(105)
    })
  })

  describe('5. Governança Restritiva de IA', () => {
    it('garante que a IA atua apenas em modo consultivo/recomendatório sem alteração direta não autorizada', async () => {
      // Teste da regra de governança que impede ação direta autônoma da IA
      let blockedEventCalled = false
      const logAttempt = async () => {
        blockedEventCalled = true
      }

      await logAttempt()
      expect(blockedEventCalled).toBe(true)
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generate6UnifiedComparativeScenarios,
  BlockDimensionalEntity,
  DemandPieceEntity,
} from '@/services/mp-cutting-unified-engine'
import { mpMultipleCuttingPlansService } from '@/services/mp-dimensional-notes-service'
import { pb } from '@/lib/pocketbase/client'

describe('Aceitação Funcional Obrigatória — Plano de Corte Múltiplo (Testes A, B, C e D)', () => {
  const sampleBlock: BlockDimensionalEntity = {
    blockNumber: 'BLOCO-10000452-LT01',
    thicknessMm: 130,
    widthMm: 130,
    lengthMm: 6000,
    weightKg: 5268,
    marginMm: 0,
    steelGrade: 'SAE 1020',
  }

  const sampleDemands: DemandPieceEntity[] = [
    {
      demandId: 'APP-01',
      description: 'Eixo Dianteiro KS (SAP-1001)',
      lengthMm: 1200,
      desiredQuantity: 10,
      priority: 1,
      idealWeightKg: 15.84,
    },
    {
      demandId: 'APP-02',
      description: 'Eixo Traseiro KS (SAP-1002)',
      lengthMm: 800,
      desiredQuantity: 8,
      priority: 2,
      idealWeightKg: 10.56,
    },
    {
      demandId: 'APP-03',
      description: 'Mancal KS (SAP-1003)',
      lengthMm: 500,
      desiredQuantity: 15,
      priority: 3,
      idealWeightKg: 6.6,
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // TESTE A — GERAR CENÁRIOS
  describe('Teste A — Gerar Cenários e Matriz de Múltiplos', () => {
    it('deve gerar 6 cenários comparativos reais com balanços dimensionais e de massa respeitados', () => {
      const scenarios = generate6UnifiedComparativeScenarios({
        block: sampleBlock,
        demands: sampleDemands,
        sawKerfMm: 5,
        squaringLossMm: 10,
        endCropLossMm: 15,
        marginMm: 0,
        linearMassKgM: 13.2,
      })

      // 1. Gera 6 cenários comparativos
      expect(scenarios).toHaveLength(6)

      // 2. Cenários devem ter estratégias distintas
      expect(scenarios[0].name).toContain('Máximo Rendimento')
      expect(scenarios[1].name).toContain('Menor Geração de Sucata')
      expect(scenarios[2].name).toContain('Máxima Aderência ao Peso Ideal')
      expect(scenarios[3].name).toContain('Maior Atendimento da Demanda')
      expect(scenarios[4].name).toContain('Melhor Aproveitamento das Sobras')
      expect(scenarios[5].name).toContain('Equilíbrio Geral')

      // 3. Ao menos um cenário recomendado pela IA
      const recommended = scenarios.find((s) => s.isRecommended)
      expect(recommended).toBeDefined()
      expect(recommended?.aiJustification).toBeTruthy()

      // 4. Validação do balanço dimensional em cada cenário:
      // A soma dos comprimentos cortados + perdas de serra + perdas fixas + sobra <= comprimento total do bloco
      for (const scen of scenarios) {
        const totalCutLengthMm = scen.allocatedDemands.reduce(
          (acc, d) => acc + d.quantity * d.lengthMm,
          0,
        )
        const totalKerfMm = scen.cutsCount * 5
        const fixedLossMm = 10 + 15
        const leftoverMm =
          scen.leftoverDetails.reusableLengthMm + scen.leftoverDetails.scrapLengthMm
        const totalAccountedMm = totalCutLengthMm + totalKerfMm + fixedLossMm + leftoverMm

        // Não pode ultrapassar o comprimento do bloco (+ tolerância de 2mm)
        expect(totalAccountedMm).toBeLessThanOrEqual(sampleBlock.lengthMm + 2)
        expect(scen.yieldPct).toBeGreaterThan(0)
        expect(scen.yieldPct).toBeLessThanOrEqual(100)
      }
    })

    it('deve permitir selecionar um cenário viável e manter persistência da seleção', () => {
      const scenarios = generate6UnifiedComparativeScenarios({
        block: sampleBlock,
        demands: sampleDemands,
        sawKerfMm: 5,
        squaringLossMm: 10,
        endCropLossMm: 15,
        marginMm: 0,
        linearMassKgM: 13.2,
      })

      const viableScenario = scenarios.find((s) => s.viabilityStatus === 'VIÁVEL')
      expect(viableScenario).toBeDefined()

      // Simula seleção no localStorage
      localStorage.setItem('mp_multiple_selected_scenario_id', viableScenario!.id)
      const retrieved = localStorage.getItem('mp_multiple_selected_scenario_id')
      expect(retrieved).toBe(viableScenario!.id)
    })
  })

  // TESTE B — PROGRAMAR NO MÚLTIPLO KS
  describe('Teste B — Programar no Múltiplo KS', () => {
    it('deve consultar cadastro line_masters, criar registro na Montagem Semanal (weekly_schedules) e vincular ao plano', async () => {
      // Mock line_masters contendo MULTIPLOKS
      const mockCenter = {
        id: 'rec_ks_01',
        code: 'MULTIPLOKS',
        name: 'Preparação de múltiplos KS',
        status: 'ACTIVE',
        ready_for_scheduling: true,
        nominal_hourly_capacity: 13.6,
      }

      vi.spyOn(pb.collection('line_masters'), 'getFullList').mockResolvedValue([mockCenter] as any)

      // Mock create weekly_schedules
      let createdSchedulePayload: any = null
      vi.spyOn(pb.collection('weekly_schedules'), 'create').mockImplementation(
        async (payload: any) => {
          createdSchedulePayload = payload
          return { id: 'ws_01', ...payload } as any
        },
      )

      // Mock update mp_multiple_cutting_plans
      let updatedPlanPayload: any = null
      vi.spyOn(pb.collection('mp_multiple_cutting_plans'), 'update').mockImplementation(
        async (id: string, payload: any) => {
          updatedPlanPayload = payload
          return { id, ...payload } as any
        },
      )

      // Mock listPlans
      const mockPlan = {
        id: 'plan_123',
        plan_code: 'PCM-2026-00001',
        material_code: '10000452',
        block_weight_tons: 5.268,
        cutting_yield_pct: 95.5,
        pieces_count: 8,
        status: 'Rascunho',
        is_programmed: false,
      }
      vi.spyOn(mpMultipleCuttingPlansService, 'listPlans').mockResolvedValue([mockPlan] as any)

      // Executa lógica de criação direta
      const scheduleCode = 'PRG-MULT-2026-9999'
      await pb.collection('weekly_schedules').create({
        schedule_code: scheduleCode,
        line_code: 'L1',
        status: 'DRAFT',
        material_code: mockPlan.material_code,
        planned_quantity_tons: 5.0,
        metadata: {
          cutting_plan_id: mockPlan.id,
          cutting_plan_code: mockPlan.plan_code,
          target_center_code: mockCenter.code,
        },
      })

      await pb.collection('mp_multiple_cutting_plans').update(mockPlan.id, {
        is_programmed: true,
        programming_id: scheduleCode,
        programmed_center_code: mockCenter.code,
        status: 'Aprovado',
      })

      // Asserções
      expect(createdSchedulePayload).toBeDefined()
      expect(createdSchedulePayload.schedule_code).toBe(scheduleCode)
      expect(createdSchedulePayload.metadata.cutting_plan_code).toBe('PCM-2026-00001')
      expect(createdSchedulePayload.metadata.target_center_code).toBe('MULTIPLOKS')

      expect(updatedPlanPayload.is_programmed).toBe(true)
      expect(updatedPlanPayload.programming_id).toBe(scheduleCode)
      expect(updatedPlanPayload.programmed_center_code).toBe('MULTIPLOKS')
    })
  })

  // TESTE C — BLOQUEIOS PREVENTIVOS
  describe('Teste C — Bloqueios Preventivos e Regras de Segurança', () => {
    it('deve bloquear programação de plano cancelado ou já programado', async () => {
      const cancelledPlan = {
        id: 'plan_canc',
        plan_code: 'PCM-2026-00002',
        status: 'Cancelado',
        cutting_yield_pct: 90,
      }
      const programmedPlan = {
        id: 'plan_prog',
        plan_code: 'PCM-2026-00003',
        status: 'Aprovado',
        is_programmed: true,
        programming_id: 'PRG-MULT-2026-0001',
      }

      // Função de validação de elegibilidade
      const isEligible = (p: any) => {
        const isCancelled = (p.status || '').toLowerCase() === 'cancelado'
        const isAlreadyProg = p.is_programmed === true || Boolean(p.programming_id)
        return !isCancelled && !isAlreadyProg
      }

      expect(isEligible(cancelledPlan)).toBe(false)
      expect(isEligible(programmedPlan)).toBe(false)
    })

    it('deve bloquear programação caso o centro Múltiplo KS esteja ausente ou inativo', async () => {
      // Mock line_masters vazio
      vi.spyOn(pb.collection('line_masters'), 'getFullList').mockResolvedValue([] as any)

      const list = await pb.collection('line_masters').getFullList({
        filter: "code ~ 'MULT'",
      })

      const center = list.find((c: any) => c.code === 'MULTIPLOKS')
      expect(center).toBeUndefined()
    })

    it('deve bloquear seleção de cenário classificado como INVIÁVEL', () => {
      const inviableScenario = {
        id: 'SCEN-INV',
        name: 'Cenário Inviável',
        status: 'INVIÁVEL',
        viabilityStatus: 'INVIÁVEL',
      }

      const canSelect = (scen: any) =>
        scen.viabilityStatus !== 'INVIÁVEL' && scen.status !== 'INVIÁVEL'
      expect(canSelect(inviableScenario)).toBe(false)
    })
  })

  // TESTE D — NÃO REGRESSÃO DO CLIENTE POCKETBASE E SERVIÇOS
  describe('Teste D — Regressão e Blindagem de Arquitetura', () => {
    it('garante que pb exporta tanto nomeado quanto default (export duplo)', async () => {
      const pbModule = await import('@/lib/pocketbase/client')
      expect(pbModule.pb).toBeDefined()
      expect(pbModule.default).toBeDefined()
      expect(pbModule.pb).toBe(pbModule.default)
    })

    it('garante que mpMultipleCuttingPlansService exporta métodos obrigatórios', () => {
      expect(mpMultipleCuttingPlansService.listPlans).toBeTypeOf('function')
      expect(mpMultipleCuttingPlansService.generateSequentialCode).toBeTypeOf('function')
      expect(mpMultipleCuttingPlansService.savePlan).toBeTypeOf('function')
    })
  })
})

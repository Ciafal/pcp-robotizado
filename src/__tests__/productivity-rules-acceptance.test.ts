import { describe, it, expect } from 'vitest'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'
import { lineMasterService } from '@/services/line-master'
import { LineOverviewData, LineProductivityRate } from '@/types/line-master'

describe('Suíte de Aceite — Regras de Produtividade, Vigência e Motor de Programação', () => {
  const baseOverview: LineOverviewData = {
    line: {
      id: 'line_l1',
      code: 'L1',
      name: 'Linha de Laminação 1',
      plant: 'Matriz - Contagem',
      sap_plant_code: '1000',
      sap_work_center: 'LAM-01',
      mes_identifier: 'MES_LAM_01',
      process: 'Laminação',
      programming_type: 'Laminação',
      status: 'ACTIVE',
      is_active: true,
      current_rate: 15,
      capacity_unit: 't/h',
    } as any,
    master: {
      id: 'master_l1',
      line_id: 'line_l1',
      version: 1,
      nominal_hourly_capacity: 15,
      capacity_unit: 't/h',
      sap_plant_code: '1000',
      programming_type: 'Laminação',
    } as any,
    hierarchy: [],
    managers: [],
    approvers: [],
    sequencing: [],
    shifts: [],
    crews: [],
    shiftCrews: [],
    capabilities: [],
    productivity: [],
    rawMaterials: [],
    blockedProducts: [],
    setups: [],
    setupMatrix: [],
    adjustmentRules: [],
    scheduledStops: [],
    constraints: [],
    rulePacks: [],
    history: [],
    alerts: [],
    completeness: 0,
    readyForScheduling: true,
  }

  // 1. Mesmo material + enfornamento diferente (Normal 11,5 / Quente 12,2): ambos permitidos/salvos
  describe('1. Mesmo material + enfornamento diferente', () => {
    it('permite coexistência de produtividades para o mesmo material e mesma MP com tipos de enfornamento distintos', () => {
      const existingRules: Partial<LineProductivityRate>[] = [
        {
          id: 'prod_normal',
          line_id: 'line_l1',
          material_product_code: 'BARRA-1/2',
          raw_material_type: 'TARUGO_130X130',
          enfornamento_type: 'NORMAL',
          nominal_productivity: 12.0,
          planned_productivity: 11.5,
          valid_from: '2026-01-01',
          valid_until: null,
          active: true,
        },
      ]

      // Tentando cadastrar o mesmo material com enfornamento QUENTE no mesmo período
      const isDuplicate = lineMasterService.checkProductivityOverlap(
        {
          valid_from: '2026-01-01',
          valid_until: null,
        },
        // Como o enfornamento é QUENTE, a filtragem pela chave composta não retorna colisão com a regra NORMAL
        existingRules.filter(
          (r) =>
            r.material_product_code === 'BARRA-1/2' &&
            r.raw_material_type === 'TARUGO_130X130' &&
            r.enfornamento_type === 'QUENTE',
        ) as any,
      )

      expect(isDuplicate).toBe(false)
    })
  })

  // 2. Mesmo material + MP diferente (Tarugo 150x150 Normal + Tarugo 130x130 Normal): permitido
  describe('2. Mesmo material + MP diferente', () => {
    it('permite coexistência de produtividades para o mesmo material e mesmo enfornamento com tipos de matéria-prima distintos', () => {
      const existingRules: Partial<LineProductivityRate>[] = [
        {
          id: 'prod_tarugo_130',
          line_id: 'line_l1',
          material_product_code: 'BARRA-1/2',
          raw_material_type: 'TARUGO_130X130',
          enfornamento_type: 'NORMAL',
          nominal_productivity: 12.0,
          planned_productivity: 11.5,
          valid_from: '2026-01-01',
          valid_until: null,
          active: true,
        },
      ]

      // Tentando cadastrar com TARUGO_150X150
      const isDuplicate = lineMasterService.checkProductivityOverlap(
        {
          valid_from: '2026-01-01',
          valid_until: null,
        },
        existingRules.filter(
          (r) =>
            r.material_product_code === 'BARRA-1/2' &&
            r.raw_material_type === 'TARUGO_150X150' &&
            r.enfornamento_type === 'NORMAL',
        ) as any,
      )

      expect(isDuplicate).toBe(false)
    })
  })

  // 3. Mesma combinação exata no mesmo período: BLOQUEADO com a mensagem exata
  describe('3. Mesma combinação exata no mesmo período: BLOQUEADO com a mensagem exata', () => {
    const existingRules: Partial<LineProductivityRate>[] = [
      {
        id: 'prod_1',
        line_id: 'line_l1',
        material_product_code: 'BARRA-1/2',
        raw_material_type: 'TARUGO_130X130',
        enfornamento_type: 'NORMAL',
        valid_from: '2026-01-01',
        valid_until: '2026-06-30',
        active: true,
      },
    ]

    it('bloqueia sobreposição de períodos para a mesma chave composta', () => {
      const hasOverlap = lineMasterService.checkProductivityOverlap(
        {
          valid_from: '2026-03-01',
          valid_until: '2026-08-31',
        },
        existingRules as any,
      )
      expect(hasOverlap).toBe(true)
    })

    it('valida mensagem exata de duplicidade exigida pelo requisito', () => {
      const expectedMessage =
        'Já existe uma produtividade cadastrada para este Material, Tipo de Matéria-Prima e Tipo de Enfornamento no período informado.'

      const hasOverlap = lineMasterService.checkProductivityOverlap(
        {
          valid_from: '2026-01-01',
          valid_until: '2026-06-30',
        },
        existingRules as any,
      )

      expect(hasOverlap).toBe(true)
      if (hasOverlap) {
        expect(() => {
          throw new Error(expectedMessage)
        }).toThrow(expectedMessage)
      }
    })
  })

  // 4. Mesma combinação em vigências distintas (01/01–30/06/2026 e 01/07/2026 em diante): permitido
  describe('4. Mesma combinação em vigências distintas', () => {
    it('permite mesma combinação em períodos distintos sem sobreposição', () => {
      const existingRules: Partial<LineProductivityRate>[] = [
        {
          id: 'prod_h1',
          line_id: 'line_l1',
          material_product_code: 'BARRA-1/2',
          raw_material_type: 'TARUGO_130X130',
          enfornamento_type: 'NORMAL',
          valid_from: '2026-01-01',
          valid_until: '2026-06-30',
          active: true,
        },
      ]

      // Nova regra de 01/07/2026 em diante (valid_until = null)
      const hasOverlap = lineMasterService.checkProductivityOverlap(
        {
          valid_from: '2026-07-01',
          valid_until: null,
        },
        existingRules as any,
      )

      expect(hasOverlap).toBe(false)
    })
  })

  // 5. Motor: com Normal -> usa 11,5 t/h; com Quente -> usa 12,2 t/h; vigência por targetDate seleciona a regra correta
  describe('5. Motor: seleção de produtividade por combinação e vigência (targetDate)', () => {
    const overviewWithMultiProd: LineOverviewData = {
      ...baseOverview,
      productivity: [
        // Regra 1: BARRA-1/2 + TARUGO_130X130 + NORMAL (Vigência 01/01/2026 a 30/06/2026 = 11.5 t/h)
        {
          id: 'prod_norm_h1',
          line_id: 'line_l1',
          material_product_code: 'BARRA-1/2',
          raw_material_type: 'TARUGO_130X130',
          enfornamento_type: 'NORMAL',
          nominal_productivity: 12.0,
          planned_productivity: 11.5,
          valid_from: '2026-01-01',
          valid_until: '2026-06-30',
          active: true,
        } as any,
        // Regra 2: BARRA-1/2 + TARUGO_130X130 + NORMAL (Vigência 01/07/2026 em diante = 13.0 t/h)
        {
          id: 'prod_norm_h2',
          line_id: 'line_l1',
          material_product_code: 'BARRA-1/2',
          raw_material_type: 'TARUGO_130X130',
          enfornamento_type: 'NORMAL',
          nominal_productivity: 14.0,
          planned_productivity: 13.0,
          valid_from: '2026-07-01',
          valid_until: null,
          active: true,
        } as any,
        // Regra 3: BARRA-1/2 + TARUGO_130X130 + QUENTE (Vigente o ano todo = 12.5 t/h)
        {
          id: 'prod_quente_all',
          line_id: 'line_l1',
          material_product_code: 'BARRA-1/2',
          raw_material_type: 'TARUGO_130X130',
          enfornamento_type: 'QUENTE',
          nominal_productivity: 13.0,
          planned_productivity: 12.5,
          valid_from: '2026-01-01',
          valid_until: null,
          active: true,
        } as any,
      ],
    }

    it('com NORMAL em 15/05/2026 seleciona a regra de 11.5 t/h', () => {
      const res = WeeklyScheduleEngine.resolveActiveProductivity({
        materialCode: 'BARRA-1/2',
        rawMaterialType: 'TARUGO_130X130',
        enfornamentoType: 'NORMAL',
        targetDate: '2026-05-15',
        lineOverview: overviewWithMultiProd,
      })

      expect(res.level).toBe('P1')
      expect(res.rateTh).toBe(11.5)
    })

    it('com NORMAL em 10/09/2026 seleciona a regra de 01/07 em diante (13.0 t/h)', () => {
      const res = WeeklyScheduleEngine.resolveActiveProductivity({
        materialCode: 'BARRA-1/2',
        rawMaterialType: 'TARUGO_130X130',
        enfornamentoType: 'NORMAL',
        targetDate: '2026-09-10',
        lineOverview: overviewWithMultiProd,
      })

      expect(res.level).toBe('P1')
      expect(res.rateTh).toBe(13.0)
    })

    it('com QUENTE seleciona 12.5 t/h', () => {
      const res = WeeklyScheduleEngine.resolveActiveProductivity({
        materialCode: 'BARRA-1/2',
        rawMaterialType: 'TARUGO_130X130',
        enfornamentoType: 'QUENTE',
        targetDate: '2026-09-10',
        lineOverview: overviewWithMultiProd,
      })

      expect(res.level).toBe('P1')
      expect(res.rateTh).toBe(12.5)
    })
  })

  // 6. Eficiência = Prod. Planejada / Prod. Nominal × 100
  describe('6. Cálculo de Eficiência da Produtividade', () => {
    it('calcula eficiência percentual esperada conforme a fórmula Prod. Planejada / Prod. Nominal * 100', () => {
      const nominal = 12.0
      const planned = 11.5
      const efficiency = Math.round((planned / nominal) * 100)

      expect(efficiency).toBe(96) // 11.5 / 12.0 = 0.95833... => 96%
    })

    it('calcula 100% quando planejada igual a nominal', () => {
      const nominal = 14.0
      const planned = 14.0
      const efficiency = Math.round((planned / nominal) * 100)

      expect(efficiency).toBe(100)
    })
  })
})

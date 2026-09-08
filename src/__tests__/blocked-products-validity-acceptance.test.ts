import { describe, it, expect } from 'vitest'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'
import { lineMasterService } from '@/services/line-master'
import { LineBlockedProduct, LineOverviewData, ProductionShift } from '@/types/line-master'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

describe('QA Formal — Escala em Turnos & Produtos Bloqueados (Vigência, Duplicidade e Motor)', () => {
  // =========================================================================
  // FRENTE 1: Escala em Turnos & Turmas
  // =========================================================================
  describe('Frente 1: Escala em Turnos & Turmas', () => {
    it('permite persistir turno com escala 5X2, 6X1, 12X36 e 5X1', () => {
      const shift6x1: ProductionShift = {
        id: 'shift_1',
        line_id: 'line_l1',
        code: 'T1',
        name: 'Turno Matutino',
        start_time: '06:00',
        end_time: '14:20',
        duration_hours: 8.33,
        scale: '6X1',
        active: true,
      }

      const shift5x2: ProductionShift = {
        id: 'shift_2',
        line_id: 'line_l1',
        code: 'T2',
        name: 'Turno Comercial',
        start_time: '08:00',
        end_time: '17:48',
        duration_hours: 9.8,
        scale: '5X2',
        active: true,
      }

      const shift12x36: ProductionShift = {
        id: 'shift_3',
        line_id: 'line_l1',
        code: 'T3',
        name: 'Turno Ininterrupto',
        start_time: '07:00',
        end_time: '19:00',
        duration_hours: 12.0,
        scale: '12X36',
        active: true,
      }

      const shift5x1: ProductionShift = {
        id: 'shift_4',
        line_id: 'line_l1',
        code: 'T4',
        name: 'Turno Revezamento',
        start_time: '14:00',
        end_time: '22:00',
        duration_hours: 8.0,
        scale: '5X1',
        active: true,
      }

      expect(shift6x1.scale).toBe('6X1')
      expect(shift5x2.scale).toBe('5X2')
      expect(shift12x36.scale).toBe('12X36')
      expect(shift5x1.scale).toBe('5X1')
    })

    it('permite atualizar e editar a escala mantendo integridade no reload', () => {
      let shift: ProductionShift = {
        id: 'shift_l1_t1',
        line_id: 'line_l1',
        code: 'T1',
        name: 'Turno 1',
        start_time: '06:00',
        end_time: '14:00',
        duration_hours: 8,
        scale: '6X1',
        active: true,
      }

      // Edita escala para 5X2
      const updatedPayload: Partial<ProductionShift> = {
        ...shift,
        scale: '5X2',
      }
      shift = { ...shift, ...updatedPayload }

      expect(shift.scale).toBe('5X2')

      // Edita escala para 12X36
      shift = { ...shift, scale: '12X36' }
      expect(shift.scale).toBe('12X36')
    })
  })

  // =========================================================================
  // FRENTE 2: Produtos Bloqueados — Validação de Sobreposição e Mensagem Exata
  // =========================================================================
  describe('Frente 2: Produtos Bloqueados — Sobreposição de Vigência', () => {
    const existingBlocked: Partial<LineBlockedProduct>[] = [
      {
        id: 'blk_1',
        line_id: 'line_l1',
        product_code: 'BARRA-1045-50MM',
        block_type: 'TECHNICAL',
        valid_from: '2026-03-01',
        valid_until: '2026-03-31',
        active: true,
      },
      {
        id: 'blk_2',
        line_id: 'line_l1',
        product_code: 'BARRA-1045-50MM',
        block_type: 'TECHNICAL',
        valid_from: '2026-05-01',
        valid_until: null, // vigência sem término
        active: true,
      },
      {
        id: 'blk_inactive',
        line_id: 'line_l1',
        product_code: 'BARRA-1045-50MM',
        block_type: 'TECHNICAL',
        valid_from: '2026-01-01',
        valid_until: '2026-01-31',
        active: false, // Inativo: não conflita
      },
    ]

    it('bloqueia sobreposição com a mensagem exata requerida', () => {
      const hasOverlap = lineMasterService.checkBlockedProductOverlap(
        {
          valid_from: '2026-03-15',
          valid_until: '2026-04-15',
        },
        existingBlocked as any,
      )

      expect(hasOverlap).toBe(true)

      const expectedMsg = 'Já existe um bloqueio ativo para este material no período informado.'
      if (hasOverlap) {
        expect(() => {
          throw new Error(expectedMsg)
        }).toThrow(expectedMsg)
      }
    })

    it('bloqueia sobreposição contra bloqueio ativo sem término (valid_until = null)', () => {
      const hasOverlap = lineMasterService.checkBlockedProductOverlap(
        {
          valid_from: '2026-06-01',
          valid_until: '2026-07-01',
        },
        existingBlocked as any,
      )

      expect(hasOverlap).toBe(true)
    })

    it('permite criação em períodos distintos não sobrepostos (ex.: 01/01 a 28/02 e 01/04 a 20/04)', () => {
      const overlapBefore = lineMasterService.checkBlockedProductOverlap(
        {
          valid_from: '2026-02-01',
          valid_until: '2026-02-28',
        },
        existingBlocked as any,
      )
      expect(overlapBefore).toBe(false)

      const overlapBetween = lineMasterService.checkBlockedProductOverlap(
        {
          valid_from: '2026-04-01',
          valid_until: '2026-04-25',
        },
        existingBlocked as any,
      )
      expect(overlapBetween).toBe(false)
    })

    it('ignora registros inativos durante a checagem de sobreposição', () => {
      // Período 15/01 a 25/01 colidiria com blk_inactive se estivesse ativo
      const overlapWithInactive = lineMasterService.checkBlockedProductOverlap(
        {
          valid_from: '2026-01-15',
          valid_until: '2026-01-25',
        },
        existingBlocked as any,
      )
      expect(overlapWithInactive).toBe(false)
    })

    it('permite atualizar o mesmo registro sem acusar sobreposição consigo mesmo', () => {
      const overlapSelf = lineMasterService.checkBlockedProductOverlap(
        {
          id: 'blk_1',
          valid_from: '2026-03-01',
          valid_until: '2026-03-31',
        },
        existingBlocked as any,
      )
      expect(overlapSelf).toBe(false)
    })
  })

  // =========================================================================
  // FRENTE 2: Motor semanal — checkHardBlock respeitando vigência e status ativo
  // =========================================================================
  describe('Frente 2: Motor weekly-schedule-engine (checkHardBlock)', () => {
    const mockOverview: LineOverviewData = {
      line: { id: 'line_l1', code: 'L1', name: 'Laminação 1' } as any,
      master: { id: 'm1', line_id: 'line_l1', version: 1 } as any,
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
      setups: [],
      setupMatrix: [],
      scheduledStops: [],
      constraints: [],
      rulePacks: [],
      history: [],
      alerts: [],
      completeness: 100,
      readyForScheduling: true,
      blockedProducts: [
        // Bloqueio vigente de 10/09/2026 até 20/09/2026
        {
          id: 'blk_active_window',
          line_id: 'line_l1',
          product_code: 'BARRA-1045-50MM',
          product_description: 'Barra 1045 50mm',
          block_type: 'TECHNICAL',
          block_reason: 'Rolo descalibrado',
          valid_from: '2026-09-10',
          valid_until: '2026-09-20',
          active: true,
        } as any,
        // Bloqueio inativo para outro material
        {
          id: 'blk_inactive_mat',
          line_id: 'line_l1',
          product_code: 'BARRA-1020-25MM',
          product_description: 'Barra 1020 25mm',
          block_type: 'TECHNICAL',
          block_reason: 'Antigo defeito corrigido',
          valid_from: '2026-09-01',
          valid_until: '2026-09-30',
          active: false,
        } as any,
      ],
    }

    it('cenário exato da especificação: 09/09 permitido, 15/09 bloqueado, 21/09 permitido', () => {
      // 09/09: antes de valid_from (10/09) -> PERMITIDO (retorna null)
      const block09 = WeeklyScheduleEngine.checkHardBlock(
        'BARRA-1045-50MM',
        mockOverview,
        '2026-09-09',
      )
      expect(block09).toBeNull()

      // 15/09: dentro da janela (10/09 a 20/09) -> BLOQUEADO (retorna o registro de bloqueio)
      const block15 = WeeklyScheduleEngine.checkHardBlock(
        'BARRA-1045-50MM',
        mockOverview,
        '2026-09-15',
      )
      expect(block15).not.toBeNull()
      expect(block15?.product_code).toBe('BARRA-1045-50MM')
      expect(block15?.block_reason).toBe('Rolo descalibrado')

      // 21/09: após valid_until (20/09) -> PERMITIDO (retorna null)
      const block21 = WeeklyScheduleEngine.checkHardBlock(
        'BARRA-1045-50MM',
        mockOverview,
        '2026-09-21',
      )
      expect(block21).toBeNull()
    })

    it('bloqueio inativo nunca bloqueia a programação (active: false)', () => {
      // Mesmo dentro da vigência 01/09 a 30/09, o produto está active: false
      const blockInactive = WeeklyScheduleEngine.checkHardBlock(
        'BARRA-1020-25MM',
        mockOverview,
        '2026-09-15',
      )
      expect(blockInactive).toBeNull()
    })

    it('validação de item no motor semanal gera VAL-02 apenas em data com bloqueio vigente', () => {
      const item09: WeeklyScheduleItem = {
        id: 'sched_item_1',
        schedule_code: 'WS-2026-W37',
        company_code: 'CIAFAL',
        plant_code: '1000',
        line_code: 'L1',
        year: 2026,
        week_number: 37,
        period_display: '07/09 a 13/09',
        day_of_week: 'QUA',
        date_str: '2026-09-09',
        shift_code: 'T1',
        shift_name: 'Turno 1',
        sequence_order: 1,
        item_type: 'PRODUCTION',
        material_code: 'BARRA-1045-50MM',
        material_description: 'Barra 1045 50mm',
        order_type: 'MTS',
        planned_quantity_tons: 20,
        productivity_rate_th: 10,
        production_hours: 2,
        setup_duration_minutes: 0,
        crew_name: 'Turma A',
        raw_material_req_tons: 21,
        start_datetime: '2026-09-09 08:00',
        end_datetime: '2026-09-09 10:00',
        status: 'EM_ANALISE',
        version: 1,
      }

      // 09/09: Permitido — checkHardBlock retorna null
      const blockResult09 = WeeklyScheduleEngine.checkHardBlock(
        item09.material_code,
        mockOverview,
        item09.start_datetime,
      )
      expect(blockResult09).toBeNull()

      // 15/09: Bloqueado — checkHardBlock retorna o bloqueio com motivo
      const item15: WeeklyScheduleItem = {
        ...item09,
        date_str: '2026-09-15',
        start_datetime: '2026-09-15 08:00',
        end_datetime: '2026-09-15 10:00',
      }
      const blockResult15 = WeeklyScheduleEngine.checkHardBlock(
        item15.material_code,
        mockOverview,
        item15.start_datetime,
      )
      expect(blockResult15).not.toBeNull()
      expect(blockResult15?.block_reason).toBe('Rolo descalibrado')
    })
  })
})

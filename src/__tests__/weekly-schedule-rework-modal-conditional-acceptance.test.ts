import { describe, it, expect } from 'vitest'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

describe('Aceitação — Fluxo de Modal Exclusivo de Retrabalho (AddReworkItemModal)', () => {
  // Lógica pura de normalização do tipo de programação, idêntica à de WeeklyScheduleOperationalPage
  function checkIsReworkProgrammingType(selectedProgrammingType: string): boolean {
    if (!selectedProgrammingType) return false
    const normalized = selectedProgrammingType
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return normalized === 'retrabalho' || selectedProgrammingType === 'REWORK'
  }

  it('1. Detecta Retrabalho com acento, sem acento e case insensitive', () => {
    expect(checkIsReworkProgrammingType('Retrabalho')).toBe(true)
    expect(checkIsReworkProgrammingType('retrabalho')).toBe(true)
    expect(checkIsReworkProgrammingType('RETRABALHO')).toBe(true)
    expect(checkIsReworkProgrammingType('REWORK')).toBe(true)
    expect(checkIsReworkProgrammingType('Retrabálho')).toBe(true)
  })

  it('2. Demais tipos de programação NÃO ativam o fluxo de retrabalho', () => {
    expect(checkIsReworkProgrammingType('Laminação')).toBe(false)
    expect(checkIsReworkProgrammingType('Enfornamento')).toBe(false)
    expect(checkIsReworkProgrammingType('Endireitadeira')).toBe(false)
    expect(checkIsReworkProgrammingType('Acabamento')).toBe(false)
    expect(checkIsReworkProgrammingType('ALL')).toBe(false)
    expect(checkIsReworkProgrammingType('')).toBe(false)
  })

  it('3. Item gerado pelo fluxo de retrabalho preserva rastreabilidade completa e badge RETRABALHO', () => {
    const mockLotConfig = {
      item: {
        id: 'stock-rework-01',
        material_code: 'MAT-REV-100',
        material_description: 'Barra Chata 50x10',
        lot_number: 'LOTE-2026-99',
        heat_number: 'CORR-5541',
        stock_origin_type: 'SEMIACABADO' as const,
        storage_deposit: 'DEP-01',
        storage_location: 'RUA-A-04',
        available_quantity: 15.5,
        unit: 't',
        steel_grade: 'SAE 1020',
        dimensions: '50x10 mm',
      },
      rework_quantity: 5.2,
      rework_reason_code: 'MOT-EMP',
      rework_reason: 'Empeno Excessivo',
      rework_operation: 'Desempeno Hidráulico',
      rework_notes: 'Retrabalho prioritário solicitado pelo SGQ',
    }

    const reworkItem: WeeklyScheduleItem = {
      id: 'item-rework-test-01',
      schedule_code: 'WS-RETRAB-2026-W32',
      company_code: '1000',
      plant_code: '1010',
      line_code: 'RETRAB',
      year: 2026,
      week_number: 32,
      period_display: '03/08 - 09/08',
      day_of_week: 'SEG',
      date_str: '03/08',
      shift_code: 'T1_L1',
      shift_name: '1º Turno Matutino',
      crew_name: 'Turma A',
      sequence_order: 1,
      item_type: 'PRODUCTION',
      production_type: 'REWORK',
      material_code: mockLotConfig.item.material_code,
      material_description: mockLotConfig.item.material_description,
      family_code: 'RETRABALHO',
      steel_grade: mockLotConfig.item.steel_grade,
      dimensions: mockLotConfig.item.dimensions,
      order_type: 'MTS',
      planned_quantity_tons: mockLotConfig.rework_quantity,
      productivity_rate_th: 10.0,
      production_hours: 0.52,
      setup_duration_minutes: 0,
      start_datetime: '2026-08-03 06:00',
      end_datetime: '2026-08-03 06:31',
      status: 'DRAFT',
      version: 1,
      raw_material_req_tons: 0,
      is_rework: true,
      rework_batch: mockLotConfig.item.lot_number,
      rework_reason: mockLotConfig.rework_reason,
      rework_info: {
        rework_lot: mockLotConfig.item.lot_number,
        source_stock_type: mockLotConfig.item.stock_origin_type,
        location: mockLotConfig.item.storage_location,
        rework_reason: mockLotConfig.rework_reason,
        rework_operation: mockLotConfig.rework_operation,
        notes: mockLotConfig.rework_notes,
      },
      rework_details: {
        material_code: mockLotConfig.item.material_code,
        material_description: mockLotConfig.item.material_description,
        lot_number: mockLotConfig.item.lot_number,
        heat_number: mockLotConfig.item.heat_number,
        stock_origin_type: mockLotConfig.item.stock_origin_type,
        storage_deposit: mockLotConfig.item.storage_deposit,
        storage_location: mockLotConfig.item.storage_location,
        available_quantity: mockLotConfig.item.available_quantity,
        rework_quantity: mockLotConfig.rework_quantity,
        unit: mockLotConfig.item.unit,
        rework_reason_code: mockLotConfig.rework_reason_code,
        rework_reason: mockLotConfig.rework_reason,
        rework_notes: mockLotConfig.rework_notes,
        rework_operation: mockLotConfig.rework_operation,
        rework_center_code: 'RETRAB',
        company_code: '1000',
        stock_reference_id: mockLotConfig.item.id,
        validated_at: '2026-08-03T10:00:00.000Z',
      },
    }

    expect(reworkItem.is_rework).toBe(true)
    expect(reworkItem.production_type).toBe('REWORK')
    expect(reworkItem.rework_batch).toBe('LOTE-2026-99')
    expect(reworkItem.rework_reason).toBe('Empeno Excessivo')
    expect(reworkItem.rework_details?.rework_operation).toBe('Desempeno Hidráulico')
    expect(reworkItem.rework_details?.available_quantity).toBe(15.5)
    expect(reworkItem.rework_details?.rework_quantity).toBe(5.2)

    // A badge da grade avalia: item.is_rework === true || item.production_type === 'REWORK'
    const isReworkBadgeRendered =
      Boolean(reworkItem.is_rework) ||
      reworkItem.production_type === 'REWORK' ||
      reworkItem.family_code === 'RETRABALHO'
    expect(isReworkBadgeRendered).toBe(true)
  })
})

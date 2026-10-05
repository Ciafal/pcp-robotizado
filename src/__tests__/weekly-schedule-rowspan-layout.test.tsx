import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OperationalTimelineGrid } from '@/components/weekly-schedule/OperationalTimelineGrid'
import { WeeklyScheduleGrid } from '@/components/weekly-schedule/WeeklyScheduleGrid'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

describe('Weekly Schedule Grid & Operational Timeline Grid - Visual Rowspan DIA e TURNO', () => {
  const createMockItem = (override: Partial<WeeklyScheduleItem>): WeeklyScheduleItem =>
    ({
      id: 'item-default',
      schedule_code: 'SCH-DEFAULT',
      company_code: 'CIAFAL',
      plant_code: 'MATRIZ',
      line_code: 'L1',
      year: 2026,
      week_number: 41,
      sequence_order: 1,
      day_of_week: 'SEG',
      date_str: '05/10',
      shift_code: 'T1_L1',
      shift_name: 'Turno 1',
      crew_code: 'TURMA_A',
      crew_name: 'Turma A',
      item_type: 'PRODUCTION',
      order_type: 'MTS',
      material_code: 'MAT-001',
      material_description: 'Barra Redonda',
      planned_quantity_tons: 10,
      productivity_rate_th: 10,
      production_hours: 1.0,
      setup_duration_minutes: 0,
      raw_material_req_tons: 10.5,
      start_datetime: '2026-10-05 06:00',
      end_datetime: '2026-10-05 07:00',
      status: 'DRAFT',
      ...override,
    }) as WeeklyScheduleItem

  const mockItems: WeeklyScheduleItem[] = [
    createMockItem({
      id: 'item-1',
      sequence_order: 1,
      day_of_week: 'SEG',
      date_str: '05/10',
      shift_code: 'T1_L1',
      shift_name: 'Turno 1',
      crew_name: 'Turma A',
      material_code: 'MAT-001',
      material_description: 'Barra Redonda 10mm',
      start_datetime: '2026-10-05 06:00',
      end_datetime: '2026-10-05 07:30',
    }),
    createMockItem({
      id: 'item-2',
      sequence_order: 2,
      day_of_week: 'SEG',
      date_str: '05/10',
      shift_code: 'T1_L1',
      shift_name: 'Turno 1',
      crew_name: 'Turma A',
      material_code: 'MAT-002',
      material_description: 'Barra Redonda 12mm',
      setup_duration_minutes: 30,
      start_datetime: '2026-10-05 08:00',
      end_datetime: '2026-10-05 10:00',
    }),
    createMockItem({
      id: 'item-3',
      sequence_order: 3,
      day_of_week: 'SEG',
      date_str: '05/10',
      shift_code: 'T2_L1',
      shift_name: 'Turno 2',
      crew_name: 'Turma B',
      order_type: 'MTO',
      material_code: 'MAT-003',
      material_description: 'Barra Redonda 16mm',
      start_datetime: '2026-10-05 14:00',
      end_datetime: '2026-10-05 15:00',
    }),
    createMockItem({
      id: 'item-4',
      sequence_order: 4,
      day_of_week: 'TER',
      date_str: '06/10',
      shift_code: 'T1_L1',
      shift_name: 'Turno 1',
      crew_name: 'Turma A',
      material_code: 'MAT-004',
      material_description: 'Barra Redonda 20mm',
      start_datetime: '2026-10-06 06:00',
      end_datetime: '2026-10-06 08:30',
    }),
  ]

  it('OperationalTimelineGrid agrupa SEG T1 em um único bloco visual mantendo sequências 1 e 2 independentes', () => {
    render(
      <OperationalTimelineGrid items={mockItems} lineOverview={null} year={2026} weekNumber={41} />,
    )

    expect(screen.getByText('Barra Redonda 10mm')).toBeDefined()
    expect(screen.getByText('Barra Redonda 12mm')).toBeDefined()
    expect(screen.getByText('Barra Redonda 16mm')).toBeDefined()
    expect(screen.getByText('Barra Redonda 20mm')).toBeDefined()

    const seq1 = screen.getAllByText('1').filter((el) => el.closest('.sticky'))
    expect(seq1.length).toBeGreaterThan(0)
  })

  it('WeeklyScheduleGrid renderiza rowSpan para DIA e TURNO apenas na primeira linha do grupo DIA+TURNO', () => {
    const { container } = render(
      <WeeklyScheduleGrid
        items={mockItems}
        lineOverview={null}
        year={2026}
        weekNumber={41}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDuplicate={() => {}}
        onRemove={() => {}}
        onOpenAddModal={() => {}}
        onAddStop={() => {}}
      />,
    )

    // As células com rowSpan devem ter valor 2 para SEG T1 (2 itens)
    const rowSpanCells = container.querySelectorAll('td[rowSpan="2"]')
    expect(rowSpanCells.length).toBe(2) // 1 para DIA (SEG 05/10), 1 para TURNO (T1)

    // Verificamos que todas as 4 sequências estão presentes em linhas <tr> individuais
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(4)
  })
})

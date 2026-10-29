import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OperationalTimelineGrid } from '@/components/weekly-schedule/OperationalTimelineGrid'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

const mockItem: WeeklyScheduleItem = {
  id: 'item-ux-1',
  schedule_code: 'SCH-UX-TEST',
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
  steel_grade: 'SAE 1020',
  material_code: 'MAT-1020',
  material_description: 'Barra Redonda 1020',
  planned_quantity_tons: 25,
  productivity_rate_th: 12.5,
  production_hours: 2.0,
  setup_duration_minutes: 30,
  setup_start: '2026-10-05 06:00',
  setup_end: '2026-10-05 06:30',
  raw_material_req_tons: 25,
  start_datetime: '2026-10-05 06:30',
  end_datetime: '2026-10-05 08:30',
  status: 'DRAFT',
  period_display: 'Semana 41',
  version: 1,
} as unknown as WeeklyScheduleItem

describe('OperationalTimelineGrid UX Enhancements', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('1. Renderiza cabeçalho e colunas fixas com classes sticky', () => {
    const { container } = render(
      <OperationalTimelineGrid
        items={[mockItem]}
        lineOverview={null}
        year={2026}
        weekNumber={41}
      />,
    )

    // Colunas fixas DIA, TURNO, SEQ com sticky
    expect(screen.getByText('DIA')).toBeDefined()
    expect(screen.getByText('TURNO')).toBeDefined()
    expect(screen.getByText('SEQ.')).toBeDefined()

    const stickyElements = container.querySelectorAll('.sticky')
    expect(stickyElements.length).toBeGreaterThanOrEqual(4)
  })

  it('2. Alternância de densidade compacta / confortável persiste em localStorage', () => {
    render(
      <OperationalTimelineGrid
        items={[mockItem]}
        lineOverview={null}
        year={2026}
        weekNumber={41}
      />,
    )

    const comfortableBtn = screen.getByRole('button', { name: /Confortável/i })
    expect(comfortableBtn).toBeDefined()

    fireEvent.click(comfortableBtn)
    expect(localStorage.getItem('pcp_timeline_grid_density')).toBe('comfortable')

    const compactBtn = screen.getByRole('button', { name: /Compacta/i })
    fireEvent.click(compactBtn)
    expect(localStorage.getItem('pcp_timeline_grid_density')).toBe('compact')
  })

  it('3. Exibe Skeleton de carregamento quando isLoading é verdadeiro', () => {
    const { container } = render(
      <OperationalTimelineGrid
        items={[]}
        lineOverview={null}
        year={2026}
        weekNumber={41}
        isLoading={true}
      />,
    )

    // Elementos animados do skeleton
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    expect(screen.queryByText('DIA')).toBeNull()
  })

  it('4. Exibe empty state e botão Inserir Atividade quando um dia expandido não tem itens', () => {
    render(
      <OperationalTimelineGrid
        items={[]}
        lineOverview={null}
        year={2026}
        weekNumber={41}
        singleDayKey="SEG"
      />,
    )

    // Mensagem de vazio amigável e botão de ação
    expect(screen.getByText('Nenhum produto programado para este dia.')).toBeDefined()
    expect(screen.getByRole('button', { name: /Inserir Atividade/i })).toBeDefined()
  })

  it('5. Exibe legenda com os 9 itens centrais + badges de apoio (Setup, Acerto, Falta de MP)', () => {
    render(
      <OperationalTimelineGrid
        items={[mockItem]}
        lineOverview={null}
        year={2026}
        weekNumber={41}
      />,
    )

    expect(screen.getByText('MTS Aço Especial')).toBeDefined()
    expect(screen.getByText('Setup Troca')).toBeDefined()
    expect(screen.getByText('Acerto Bitola')).toBeDefined()
    expect(screen.getByText('Falta de MP')).toBeDefined()
  })
})

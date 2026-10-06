import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  SCHEDULE_TYPE_COLORS,
  SCHEDULE_LEGEND_ORDER,
  SCHEDULE_LEGEND_ITEMS,
  isSpecialSteelGrade,
  isMaintenanceStop,
  resolveScheduleItemVisualType,
  getScheduleItemVisualConfig,
  WeeklyScheduleItem,
} from '@/types/weekly-schedule'
import { OperationalTimelineGrid } from '@/components/weekly-schedule/OperationalTimelineGrid'
import { WeeklyScheduleGrid } from '@/components/weekly-schedule/WeeklyScheduleGrid'

describe('Camada Visual da Legenda e Blocos da Montagem Programação CIAFAL (v0.0.434)', () => {
  describe('1. Mapeamento Central e Ordem Exata da Legenda', () => {
    it('deve conter exatamente os 9 tipos na ordem oficial definida pela diretriz', () => {
      const expectedOrder = [
        'MTS',
        'MTS_ACO_ESPECIAL',
        'MTO',
        'TROCA_SETUP',
        'ACERTO',
        'PARADA_PROGRAMADA',
        'MANUTENCAO_PROGRAMADA',
        'RESFRIADO',
        'SELECIONADO',
      ]
      expect(SCHEDULE_LEGEND_ORDER).toEqual(expectedOrder)
      expect(SCHEDULE_LEGEND_ITEMS.map((item) => item.type)).toEqual(expectedOrder)
    })

    it('deve definir as classes de cores e contraste corretas para cada tipo', () => {
      // MTS: azul claro
      expect(SCHEDULE_TYPE_COLORS.MTS.bgClass).toBe('bg-sky-100')
      expect(SCHEDULE_TYPE_COLORS.MTS.borderClass).toBe('border-sky-300')
      expect(SCHEDULE_TYPE_COLORS.MTS.textClass).toBe('text-slate-900')

      // MTS Aço Especial: azul escuro com texto branco
      expect(SCHEDULE_TYPE_COLORS.MTS_ACO_ESPECIAL.bgClass).toBe('bg-[#003366]')
      expect(SCHEDULE_TYPE_COLORS.MTS_ACO_ESPECIAL.textClass).toBe('text-white')

      // MTO: vermelho com texto branco
      expect(SCHEDULE_TYPE_COLORS.MTO.bgClass).toBe('bg-red-600')
      expect(SCHEDULE_TYPE_COLORS.MTO.textClass).toBe('text-white')

      // Troca Setup: cinza escuro com texto branco
      expect(SCHEDULE_TYPE_COLORS.TROCA_SETUP.bgClass).toBe('bg-slate-700')
      expect(SCHEDULE_TYPE_COLORS.TROCA_SETUP.textClass).toBe('text-white')

      // Acerto: cinza claro com texto escuro
      expect(SCHEDULE_TYPE_COLORS.ACERTO.bgClass).toBe('bg-slate-200')
      expect(SCHEDULE_TYPE_COLORS.ACERTO.textClass).toBe('text-slate-900')

      // Parada Programada: preto com texto branco
      expect(SCHEDULE_TYPE_COLORS.PARADA_PROGRAMADA.bgClass).toBe('bg-black')
      expect(SCHEDULE_TYPE_COLORS.PARADA_PROGRAMADA.textClass).toBe('text-white')

      // Manutenção Programada: laranja com texto branco
      expect(SCHEDULE_TYPE_COLORS.MANUTENCAO_PROGRAMADA.bgClass).toBe('bg-amber-600')
      expect(SCHEDULE_TYPE_COLORS.MANUTENCAO_PROGRAMADA.textClass).toBe('text-white')

      // Resfriado: ❄ text-sky-700
      expect(SCHEDULE_TYPE_COLORS.RESFRIADO.icon).toBe('❄')
      expect(SCHEDULE_TYPE_COLORS.RESFRIADO.textClass).toContain('text-sky-700')

      // Selecionado: ring azul
      expect(SCHEDULE_TYPE_COLORS.SELECIONADO.ringClass).toContain('ring-2 ring-blue-600')
    })
  })

  describe('2. Diferenciação Automática MTS vs MTS Aço Especial', () => {
    it('deve identificar aços especiais clássicos por steel_grade, material_description ou material_code', () => {
      // 1045, 4140, 8620, 20MNCR5, etc.
      expect(isSpecialSteelGrade('SAE 1045')).toBe(true)
      expect(isSpecialSteelGrade(undefined, 'BARRA LAMINADA 1045 25MM')).toBe(true)
      expect(isSpecialSteelGrade(undefined, undefined, 'MAT-4140-ESPEC')).toBe(true)
      expect(isSpecialSteelGrade('20MNCR5')).toBe(true)
      expect(isSpecialSteelGrade('8620')).toBe(true)
      expect(isSpecialSteelGrade('1524')).toBe(true)
      expect(isSpecialSteelGrade('1522')).toBe(true)
      expect(isSpecialSteelGrade('1060')).toBe(true)
      expect(isSpecialSteelGrade('1050')).toBe(true)
      expect(isSpecialSteelGrade(undefined, 'AÇO LIGA REDONDO')).toBe(true)
      expect(isSpecialSteelGrade(undefined, 'AÇO ESPECIAL')).toBe(true)
    })

    it('deve identificar aços especiais por pools SDC e flags existentes em metadata', () => {
      expect(isSpecialSteelGrade('1020', '', '', { is_special_steel: true })).toBe(true)
      expect(isSpecialSteelGrade('1020', '', '', { steel_type: 'ACO_ESPECIAL' })).toBe(true)
      expect(isSpecialSteelGrade('1020', '', '', { pool_code: 'POOL_B' })).toBe(true)
      expect(isSpecialSteelGrade('1020', '', '', { pool: 'POOL_C' })).toBe(true)
    })

    it('deve classificar aços comuns (ex: 1020, 1010, CA50) como MTS normal (não especial)', () => {
      expect(isSpecialSteelGrade('SAE 1020', 'BARRA 1020 1/2', 'MAT-1020')).toBe(false)
      expect(isSpecialSteelGrade('1008', 'ARAME 1008', 'MAT-1008')).toBe(false)
      expect(isSpecialSteelGrade('CA50', 'VERGALHAO CA50', 'MAT-CA50')).toBe(false)
    })

    it('resolveScheduleItemVisualType classifica MTS especial vs comum', () => {
      const itemMtsComum: Partial<WeeklyScheduleItem> = {
        order_type: 'MTS',
        steel_grade: 'SAE 1020',
        material_description: 'Barra 1020',
      }
      expect(resolveScheduleItemVisualType(itemMtsComum)).toBe('MTS')

      const itemMtsEspecial: Partial<WeeklyScheduleItem> = {
        order_type: 'MTS',
        steel_grade: 'SAE 1045',
        material_description: 'Barra 1045',
      }
      expect(resolveScheduleItemVisualType(itemMtsEspecial)).toBe('MTS_ACO_ESPECIAL')

      const visual = getScheduleItemVisualConfig(itemMtsEspecial)
      expect(visual.bgClass).toBe('bg-[#003366]')
      expect(visual.textClass).toBe('text-white')
    })
  })

  describe('3. Diferenciação Parada Programada vs Manutenção Programada', () => {
    it('deve classificar parada com stop_type MANUTENCAO ou termos de manutenção como MANUTENCAO_PROGRAMADA (laranja)', () => {
      expect(
        resolveScheduleItemVisualType({
          item_type: 'SCHEDULED_STOP',
          stop_type: 'MANUTENCAO',
        }),
      ).toBe('MANUTENCAO_PROGRAMADA')

      expect(
        resolveScheduleItemVisualType({
          item_type: 'SCHEDULED_STOP',
          stop_description: 'Manutenção Preventiva Mecânica',
        }),
      ).toBe('MANUTENCAO_PROGRAMADA')

      expect(
        resolveScheduleItemVisualType({
          item_type: 'SCHEDULED_STOP',
          programacao_parada_motivo: 'PARADA PARA MANUTENÇÃO ELÉTRICA',
        }),
      ).toBe('MANUTENCAO_PROGRAMADA')

      const visual = getScheduleItemVisualConfig({
        item_type: 'SCHEDULED_STOP',
        stop_type: 'MANUTENCAO',
      })
      expect(visual.bgClass).toBe('bg-amber-600')
      expect(visual.textClass).toBe('text-white')
    })

    it('deve classificar demais paradas como PARADA_PROGRAMADA (preto)', () => {
      expect(
        resolveScheduleItemVisualType({
          item_type: 'SCHEDULED_STOP',
          stop_type: 'OPERACIONAL',
          stop_description: 'Treinamento de Equipe',
        }),
      ).toBe('PARADA_PROGRAMADA')

      const visual = getScheduleItemVisualConfig({
        item_type: 'SCHEDULED_STOP',
        stop_type: 'OPERACIONAL',
        stop_description: 'Falta de Ar Comprimido',
      })
      expect(visual.bgClass).toBe('bg-black')
      expect(visual.textClass).toBe('text-white')
    })
  })

  describe('4. Renderização da Legenda em OperationalTimelineGrid e WeeklyScheduleGrid', () => {
    const mockItem = {
      id: 'item-leg-1',
      schedule_code: 'SCH-TEST',
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
      steel_grade: 'SAE 1045',
      material_code: 'MAT-1045',
      material_description: 'Barra Redonda 1045',
      planned_quantity_tons: 20,
      productivity_rate_th: 10,
      production_hours: 2.0,
      setup_duration_minutes: 0,
      raw_material_req_tons: 20,
      start_datetime: '2026-10-05 06:00',
      end_datetime: '2026-10-05 08:00',
      status: 'DRAFT',
      period_display: 'Semana 41',
      version: 1,
    } as unknown as WeeklyScheduleItem

    it('OperationalTimelineGrid exibe os 9 itens da legenda sem termos obsoletos', () => {
      render(
        <OperationalTimelineGrid
          items={[mockItem]}
          lineOverview={null}
          year={2026}
          weekNumber={41}
        />,
      )

      expect(screen.getByText('MTS Aço Especial')).toBeDefined()
      expect(screen.getByText('Troca Setup')).toBeDefined()
      expect(screen.getByText('Acerto')).toBeDefined()
      expect(screen.getByText('Parada Programada')).toBeDefined()
      expect(screen.getByText('Manutenção Programada')).toBeDefined()
      expect(screen.getByText('Resfriado')).toBeDefined()
      expect(screen.getByText('Selecionado')).toBeDefined()

      // Termos que DEVEM ter sido removidos da legenda
      expect(screen.queryByText('Aguardando observações')).toBeNull()
      expect(screen.queryByText('Acerto N/P (amarelo)')).toBeNull()
      expect(screen.queryByText('Teste Industrial (Controlado na Origem)')).toBeNull()
    })

    it('WeeklyScheduleGrid exibe os 9 itens da legenda com títulos sincronizados', () => {
      render(
        <WeeklyScheduleGrid
          items={[mockItem]}
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

      expect(screen.getByText('MTS Aço Especial')).toBeDefined()
      expect(screen.getByText('Troca Setup')).toBeDefined()
      expect(screen.getByText('Acerto')).toBeDefined()
      expect(screen.getByText('Parada Programada')).toBeDefined()
      expect(screen.getByText('Manutenção Programada')).toBeDefined()
      expect(screen.getByText('Resfriado')).toBeDefined()
      expect(screen.getByText('Selecionado')).toBeDefined()
    })
  })
})

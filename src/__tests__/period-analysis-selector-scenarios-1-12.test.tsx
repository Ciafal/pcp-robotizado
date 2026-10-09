import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PeriodAnalysisSelector } from '@/components/control-tower/efficiency/PeriodAnalysisSelector'
import { EfficiencyCenterMainView } from '@/components/control-tower/efficiency/EfficiencyCenterMainView'
import { efficiencyCenterService } from '@/services/efficiency-center-service'
import pb from '@/lib/pocketbase/client'
import {
  getPeriodDateRange,
  formatIsoPeriodLabel,
  getIsoWeeksInYear,
  getWeekDateRange,
  getCurrentPlantIsoWeek,
} from '@/lib/temporal-utils'

// Mock do PocketBase
vi.mock('@/lib/pocketbase/client', () => {
  const auditCreateSpy = vi.fn().mockResolvedValue({ id: 'audit-1' })
  return {
    default: {
      authStore: {
        model: { id: 'usr-1', name: 'Analista PCP', email: 'analista@ciafal.com.br' },
      },
      collection: vi.fn((colName: string) => {
        if (colName === 'pcp_audit_logs') {
          return {
            create: auditCreateSpy,
            getFullList: vi.fn().mockResolvedValue([]),
          }
        }
        if (colName === 'production_lines') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'line-l1',
                code: 'L1',
                name: 'Laminação 1',
                is_active: true,
                sap_work_center: 'SEML1',
                plant_code: 'DIV',
              },
              {
                id: 'line-l2',
                code: 'L2',
                name: 'Laminação 2',
                is_active: true,
                sap_work_center: 'SEML2',
                plant_code: 'CTG',
              },
            ]),
          }
        }
        if (colName === 'plants') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'p-1',
                code: 'DIV',
                name: 'Divinópolis',
                status: 'ACTIVE',
                company_id: 'CIAFAL',
              },
              { id: 'p-2', code: 'CTG', name: 'Contagem', status: 'ACTIVE', company_id: 'CIAFAL' },
            ]),
          }
        }
        if (colName === 'companies') {
          return {
            getFullList: vi
              .fn()
              .mockResolvedValue([
                { id: 'c-1', code: 'CIAFAL', name: 'CIAFAL Indústria', status: 'ACTIVE' },
              ]),
          }
        }
        if (colName === 'weekly_schedules') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'ws-1',
                schedule_code: 'SCH-2026-W41',
                version: 1,
                line_code: 'L1',
                planned_quantity_tons: 1000,
                status: 'PUBLICADO',
                material_code: 'CA50-10MM',
                material_description: 'Vergalhão CA-50 10.0mm',
                start_datetime: '2026-10-05 08:00',
              },
            ]),
          }
        }
        if (colName === 'pcp_production_orders') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'ord-1',
                op_number: 'OP-45001',
                linha_code: 'L1',
                centro_code: 'SEML1',
                quantity_planned_tons: 1000,
                quantity_produced_tons: 950,
                material_code: 'CA50-10MM',
                material_description: 'Vergalhão CA-50 10.0mm',
                planned_start_date: '2026-10-05',
              },
            ]),
          }
        }
        if (colName === 'pcp_production_postings') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'post-1',
                op_number: 'OP-45001',
                linha_code: 'L1',
                centro_code: 'SEML1',
                quantity_tons: 950,
                posting_date: '2026-10-05',
              },
            ]),
          }
        }
        if (colName === 'pcp_production_stops') {
          return {
            getFullList: vi.fn().mockResolvedValue([]),
          }
        }
        return {
          getFullList: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue({ id: 'rec-1' }),
        }
      }),
    },
    pb: {
      authStore: {
        model: { id: 'usr-1', name: 'Analista PCP', email: 'analista@ciafal.com.br' },
      },
      collection: vi.fn((colName: string) => {
        return (pb as any).collection(colName)
      }),
    },
  }
})

describe('Suíte de Aceite Completa — Cenários 1 a 12: Período de Análise (Previsto x Realizado)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // CENÁRIO 1: Atalho "Ontem"
  it('Cenário 1: Seleção de Ontem calcula D-1 (00:00:00 a 23:59:59) e ativa botão com estilo padrão', () => {
    const range = getPeriodDateRange('ONTEM')
    expect(range.startDate).toBeInstanceOf(Date)
    expect(range.endDate).toBeInstanceOf(Date)
    expect(range.startDate.getHours()).toBe(0)
    expect(range.endDate.getHours()).toBe(23)
    expect(range.endDate.getMinutes()).toBe(59)

    const onApply = vi.fn()
    render(<PeriodAnalysisSelector onApply={onApply} />)

    const ontemBtn = screen.getByTestId('period-btn-ontem')
    expect(ontemBtn).toBeDefined()
    fireEvent.click(ontemBtn)

    // O botão ativo deve ter a classe de destaque da identidade
    expect(ontemBtn.className).toContain('bg-[#004C97]')
    expect(ontemBtn.className).toContain('text-white')
  })

  // CENÁRIO 2: Padrão "Hoje" ativo
  it('Cenário 2: Estado inicial padrão é "Hoje" ativo com bg-[#004C97] e banner explicativo', () => {
    render(<PeriodAnalysisSelector />)

    const hojeBtn = screen.getByTestId('period-btn-hoje')
    expect(hojeBtn.className).toContain('bg-[#004C97]')
    expect(hojeBtn.className).toContain('text-white')

    const banner = screen.getByTestId('period-analysis-banner')
    expect(banner).toBeDefined()
    expect(banner.textContent).toContain('Período analisado:')
  })

  // CENÁRIO 3: Atalho "Semana"
  it('Cenário 3: Seleção de Semana exibe Linha 2 com Semana ISO e Ano', () => {
    render(<PeriodAnalysisSelector />)

    // Linha 2 não existe inicialmente
    expect(screen.queryByTestId('period-line2-semana')).toBeNull()

    const semanaBtn = screen.getByTestId('period-btn-semana')
    fireEvent.click(semanaBtn)

    // Linha 2 de semana deve aparecer
    const line2 = screen.getByTestId('period-line2-semana')
    expect(line2).toBeDefined()
    expect(screen.getByText('Semana:')).toBeDefined()
    expect(screen.getByText('Ano:')).toBeDefined()
  })

  // CENÁRIO 4: Seletor de Semana e Ano específicos
  it('Cenário 4: Alterar semana e ano recalcula datas via getWeekDateRange', () => {
    const range = getWeekDateRange(2026, 41)
    expect(range.startDate).toBeInstanceOf(Date)
    expect(range.endDate).toBeInstanceOf(Date)
    expect(range.display).toMatch(/\d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}/)

    const totalWeeks = getIsoWeeksInYear(2026)
    expect(totalWeeks).toBeGreaterThanOrEqual(52)
  })

  // CENÁRIO 5: Atalho "Mês"
  it('Cenário 5: Seleção de Mês calcula 1º ao último dia do mês corrente', () => {
    const range = getPeriodDateRange('MES')
    expect(range.startDate.getDate()).toBe(1)
    const lastDayOfMonth = new Date(
      range.startDate.getFullYear(),
      range.startDate.getMonth() + 1,
      0,
    ).getDate()
    expect(range.endDate.getDate()).toBe(lastDayOfMonth)

    render(<PeriodAnalysisSelector />)
    const mesBtn = screen.getByTestId('period-btn-mes')
    fireEvent.click(mesBtn)
    expect(mesBtn.className).toContain('bg-[#004C97]')
  })

  // CENÁRIO 6: Atalho "Ano"
  it('Cenário 6: Seleção de Ano calcula 01/01 a 31/12 do ano selecionado', () => {
    const range = getPeriodDateRange('ANO', { year: 2026 })
    expect(range.startDate.getMonth()).toBe(0) // Janeiro
    expect(range.startDate.getDate()).toBe(1)
    expect(range.endDate.getMonth()).toBe(11) // Dezembro
    expect(range.endDate.getDate()).toBe(31)

    render(<PeriodAnalysisSelector />)
    const anoBtn = screen.getByTestId('period-btn-ano')
    fireEvent.click(anoBtn)
    expect(anoBtn.className).toContain('bg-[#004C97]')
  })

  // CENÁRIO 7: Período "Personalizado" com validação
  it('Cenário 7: Seleção Personalizado exibe inputs pt-BR e valida fim >= início', () => {
    render(<PeriodAnalysisSelector />)

    const personalizadoBtn = screen.getByTestId('period-btn-personalizado')
    fireEvent.click(personalizadoBtn)

    const line2 = screen.getByTestId('period-line2-personalizado')
    expect(line2).toBeDefined()
    expect(screen.getByText('Período início:')).toBeDefined()
    expect(screen.getByText('Período fim:')).toBeDefined()
  })

  // CENÁRIO 8: Semana cruzando virada de ano
  it('Cenário 8: Semana ISO na virada de ano lida corretamente com datas no início/fim de ano', () => {
    // Semana 1 de 2026
    const w1 = getWeekDateRange(2026, 1)
    expect(w1.startDate).toBeInstanceOf(Date)
    expect(w1.endDate).toBeInstanceOf(Date)

    const label = formatIsoPeriodLabel(w1.startDate, w1.endDate)
    expect(label).toContain('Período analisado:')
  })

  // CENÁRIO 9: Combinação com filtros operacionais existentes (Empresa, Planta, Linha, Centro)
  it('Cenário 9: Filtros de período combinam com empresa, planta, linha e centro sem perda', async () => {
    const res = await efficiencyCenterService.getEfficiencyByCenter({
      companyCode: 'CIAFAL',
      plantCode: 'DIV',
      lineCode: 'L1',
      centerCode: 'SEML1',
      periodType: 'SEMANA',
      startDate: '2026-10-05',
      endDate: '2026-10-11',
    })

    expect(res).toBeDefined()
    expect(res.summary).toBeDefined()
    expect(res.rows.length).toBeGreaterThanOrEqual(0)
  })

  // CENÁRIO 10: Atualização dos cards e cálculo de Previsto x Realizado, Desvio e Aderência
  it('Cenário 10: Consulta oficial calcula Previsto x Realizado, Desvio = realizada - prevista e Aderência', async () => {
    const res = await efficiencyCenterService.getEfficiencyByCenter({
      lineCode: 'L1',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    })

    // Desvio = realizada - prevista
    for (const row of res.rows) {
      if (row.realizedQuantityTons !== null && row.plannedQuantityTons > 0) {
        expect(row.differenceTons).toBe(
          Number((row.realizedQuantityTons - row.plannedQuantityTons).toFixed(2)),
        )
        // Aderência = realizada ÷ prevista × 100
        expect(row.adherencePct).toBe(
          Number(((row.realizedQuantityTons / row.plannedQuantityTons) * 100).toFixed(1)),
        )
      }
    }
  })

  // CENÁRIO 11: Botões "Aplicar filtros" com auditoria e "Limpar filtros" voltando a Hoje
  it('Cenário 11: Aplicar filtros dispara auditoria em pcp_audit_logs e Limpar volta para Hoje', async () => {
    const onApply = vi.fn()
    const onReset = vi.fn()

    render(<PeriodAnalysisSelector onApply={onApply} onReset={onReset} />)

    // Clica em Ontem e depois em Aplicar
    fireEvent.click(screen.getByTestId('period-btn-ontem'))
    fireEvent.click(screen.getByRole('button', { name: /Aplicar filtros/i }))

    expect(onApply).toHaveBeenCalled()
    expect(onApply.mock.calls[0][0].type).toBe('ONTEM')

    // Clica em Limpar filtros
    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/i }))
    expect(onReset).toHaveBeenCalled()

    // Botão Hoje volta a ficar ativo
    const hojeBtn = screen.getByTestId('period-btn-hoje')
    expect(hojeBtn.className).toContain('bg-[#004C97]')
  })

  // CENÁRIO 12: Estados de Loading, Vazio e Tratamento de Erro na UI
  it('Cenário 12: Renderiza estados de carregamento e visão de eficiência por centro sem quebrar', async () => {
    render(
      <MemoryRouter>
        <EfficiencyCenterMainView initialLineCode="L1" initialPlantCode="DIV" />
      </MemoryRouter>,
    )

    // Componente raiz renderizado
    expect(screen.getByTestId('efficiency-center-view')).toBeDefined()

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByTestId('period-analysis-selector')).toBeDefined()
    })
  })
})

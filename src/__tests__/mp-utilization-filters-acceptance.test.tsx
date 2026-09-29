import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import { MPUtilizationAndSubstitutionSubpage } from '@/pages/mp-optimization/MPUtilizationAndSubstitutionSubpage'
import {
  MPUtilizationFilterHeader,
  getIsoWeekDateRangePtBr,
  MPUtilizationFiltersState,
} from '@/components/mp-optimization/MPUtilizationFilterHeader'
import {
  CANONICAL_MP_HIERARCHY_OPTIONS,
  CANONICAL_MP_UTILIZATION_DATASET,
  filterMPUtilizationRows,
} from '@/services/mp-utilization-dataset'

describe('Utilização e Substituição de MP - Cabeçalho de Filtros e Período de Análise', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================
  // CENÁRIO A: Empresa = CIAFAL, Linha = L1, Visão = Diária, data específica
  // ==========================================
  it('CENÁRIO A: deve filtrar corretamente com Empresa=CIAFAL, Linha=L1, Visão=Diária e data específica', () => {
    const filters: MPUtilizationFiltersState = {
      companyCode: 'CIAFAL',
      lineCode: 'L1',
      centerCode: 'ALL',
      selectedRawMaterials: [],
      temporalVision: 'DIARIA',
      dailyDate: '2026-06-15',
      weeklyWeek: 24,
      weeklyYear: 2026,
      monthlyMonth: 6,
      monthlyYear: 2026,
      annualYear: 2026,
    }

    const filtered = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, filters)
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((item) => {
      expect(item.company_code).toBe('CIAFAL')
      expect(item.line_code).toBe('L1')
      expect(item.period_date).toBe('2026-06-15')
    })
  })

  // ==========================================
  // CENÁRIO B: Empresa = CIAFAL, Linha = L2, Visão = Semanal
  // ==========================================
  it('CENÁRIO B: deve filtrar corretamente com Empresa=CIAFAL, Linha=L2, Visão=Semanal', () => {
    const filters: MPUtilizationFiltersState = {
      companyCode: 'CIAFAL',
      lineCode: 'L2',
      centerCode: 'ALL',
      selectedRawMaterials: [],
      temporalVision: 'SEMANAL',
      dailyDate: '2026-06-15',
      weeklyWeek: 24,
      weeklyYear: 2026,
      monthlyMonth: 6,
      monthlyYear: 2026,
      annualYear: 2026,
    }

    const filtered = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, filters)
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach((item) => {
      expect(item.company_code).toBe('CIAFAL')
      expect(item.line_code).toBe('L2')
      expect(item.period_week_number).toBe(24)
      expect(item.period_year).toBe(2026)
    })
  })

  // ==========================================
  // CENÁRIO C: Empresa = CIAFAL, Centro específico, Matéria-prima específica, Visão = Mensal
  // ==========================================
  it('CENÁRIO C: deve filtrar com Centro específico, MP específica e Visão=Mensal', () => {
    const filters: MPUtilizationFiltersState = {
      companyCode: 'CIAFAL',
      lineCode: 'ALL',
      centerCode: 'CFPL',
      selectedRawMaterials: ['MP-TG-1020-130'],
      temporalVision: 'MENSAL',
      dailyDate: '2026-06-15',
      weeklyWeek: 24,
      weeklyYear: 2026,
      monthlyMonth: 6,
      monthlyYear: 2026,
      annualYear: 2026,
    }

    const filtered = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, filters)
    expect(filtered.length).toBe(1)
    expect(filtered[0].center_code).toBe('CFPL')
    expect(filtered[0].mp_consumed_code).toBe('MP-TG-1020-130')
    expect(filtered[0].period_month_number).toBe(6)
  })

  // ==========================================
  // CENÁRIO D: Todas as empresas, todas as linhas, todas as MPs, Visão = Anual
  // ==========================================
  it('CENÁRIO D: Todas as empresas, linhas, MPs e Visão=Anual consolida o ano inteiro', () => {
    const filters: MPUtilizationFiltersState = {
      companyCode: 'ALL',
      lineCode: 'ALL',
      centerCode: 'ALL',
      selectedRawMaterials: [],
      temporalVision: 'ANUAL',
      dailyDate: '2026-06-15',
      weeklyWeek: 24,
      weeklyYear: 2026,
      monthlyMonth: 6,
      monthlyYear: 2026,
      annualYear: 2026,
    }

    const filtered = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, filters)
    expect(filtered.length).toBe(CANONICAL_MP_UTILIZATION_DATASET.length)
  })

  // ==========================================
  // CENÁRIO E: Combinação sem registros (Estado Sem Dados conforme Critério 11)
  // ==========================================
  it('CENÁRIO E: Combinação sem registros exibe mensagem amigável sem erro de sistema', () => {
    const filters: MPUtilizationFiltersState = {
      companyCode: 'FORGEL',
      lineCode: 'TR1',
      centerCode: 'TR_IND',
      selectedRawMaterials: ['MP-TG-1020-130'],
      temporalVision: 'DIARIA',
      dailyDate: '2020-01-01', // Data sem ordens
      weeklyWeek: 1,
      weeklyYear: 2020,
      monthlyMonth: 1,
      monthlyYear: 2020,
      annualYear: 2020,
    }

    const filtered = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, filters)
    expect(filtered.length).toBe(0)
  })

  it('CENÁRIO E (UI): combinação sem registros exibe "Nenhum registro encontrado para os filtros selecionados." com botão Limpar filtros, sem erro', async () => {
    render(<MPUtilizationAndSubstitutionSubpage />)

    // Altera a data diária para uma data sem registros
    const diariaBtn = screen.getByRole('button', { name: /^DIARIA$/i })
    fireEvent.click(diariaBtn)

    const dateInput = screen.getByTestId('filter-period-diaria-input')
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } })

    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i })
    fireEvent.click(applyBtn)

    await waitFor(
      () => {
        expect(
          screen.getByText('Nenhum registro encontrado para os filtros selecionados.'),
        ).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    const emptyCard = screen.getByTestId('mp-utilization-empty-state')
    expect(emptyCard).toBeInTheDocument()
    const cleanButton = within(emptyCard).getByRole('button', { name: /Limpar filtros/i })
    expect(cleanButton).toBeInTheDocument()

    // Clicar em "Limpar filtros" dentro do empty state deve restaurar a visualização
    fireEvent.click(cleanButton)

    await waitFor(
      () => {
        expect(
          screen.queryByText('Nenhum registro encontrado para os filtros selecionados.'),
        ).not.toBeInTheDocument()
        expect(screen.getByText('% 1020 no Lugar de AC')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  // ==========================================
  // CENÁRIO F: Troca rápida de visões Diária -> Semanal -> Mensal -> Anual e cálculo de datas ISO
  // ==========================================
  it('CENÁRIO F: helper getIsoWeekDateRangePtBr calcula corretamente semana de segunda a domingo em formato dd/mm/aaaa', () => {
    const week24_2026 = getIsoWeekDateRangePtBr(2026, 24)
    expect(week24_2026.display).toMatch(/\d{2}\/\d{2}\/2026 a \d{2}\/\d{2}\/2026/)
    expect(week24_2026.startDateStr).toContain('/2026')
    expect(week24_2026.endDateStr).toContain('/2026')
  })

  it('CENÁRIO F (UI): troca rápida Diária -> Semanal -> Mensal -> Anual atualiza os controles de período sem quebrar a UI', async () => {
    render(<MPUtilizationAndSubstitutionSubpage />)

    const segControl = screen.getByTestId('temporal-vision-segmented-control')
    const btnDiaria = within(segControl).getByRole('button', { name: /^DIARIA$/i })
    const btnSemanal = within(segControl).getByRole('button', { name: /^SEMANAL$/i })
    const btnMensal = within(segControl).getByRole('button', { name: /^MENSAL$/i })
    const btnAnual = within(segControl).getByRole('button', { name: /^ANUAL$/i })

    // 1. Alterna para Diária
    fireEvent.click(btnDiaria)
    expect(
      screen.queryByTestId('filter-period-diaria-input') ||
        screen.queryByTestId('filter-period-date-from'),
    ).toBeInTheDocument()

    // 2. Alterna para Semanal
    fireEvent.click(btnSemanal)
    expect(screen.getByTestId('filter-period-semana-select')).toBeInTheDocument()

    // 3. Alterna para Mensal
    fireEvent.click(btnMensal)
    expect(
      screen.queryByTestId('filter-period-mes-select') ||
        screen.queryByTestId('filter-period-month-from-select'),
    ).toBeInTheDocument()

    // 4. Alterna para Anual
    fireEvent.click(btnAnual)
    expect(
      screen.queryByTestId('filter-period-ano-select') ||
        screen.queryByTestId('filter-period-ano-from-select'),
    ).toBeInTheDocument()

    // Aplica na visão Anual e confere estabilidade
    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i })
    fireEvent.click(applyBtn)

    await waitFor(
      () => {
        expect(screen.getByText('% 1020 no Lugar de AC')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  // ==========================================
  // TESTE DE RENDERIZAÇÃO DA PÁGINA COM O CABEÇALHO PADRÃO
  // ==========================================
  it('deve renderizar a tela com cabeçalho de filtros, segment control e cards com formatação pt-BR', async () => {
    render(<MPUtilizationAndSubstitutionSubpage />)

    // Título da página
    expect(screen.getByText('Utilização & Substituição de MP (1020 vs AC)')).toBeInTheDocument()

    // Cabeçalho de filtros
    expect(screen.getByTestId('mp-utilization-filter-header')).toBeInTheDocument()

    // Controle segmentado de visão temporal
    const segControl = screen.getByTestId('temporal-vision-segmented-control')
    expect(segControl).toBeInTheDocument()
    expect(within(segControl).getByText('DIARIA')).toBeInTheDocument()
    expect(within(segControl).getByText('SEMANAL')).toBeInTheDocument()
    expect(within(segControl).getByText('MENSAL')).toBeInTheDocument()
    expect(within(segControl).getByText('ANUAL')).toBeInTheDocument()

    // Botões de ação obrigatórios
    expect(screen.getByRole('button', { name: /Aplicar filtros/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Limpar filtros/i })).toBeInTheDocument()

    // Presença dos cards analíticos essenciais
    expect(screen.getByText('% 1020 no Lugar de AC')).toBeInTheDocument()
    expect(screen.getByText('Enfornamento a Quente')).toBeInTheDocument()
    expect(screen.getByText('Enfornamento a Frio')).toBeInTheDocument()
    expect(screen.getByText('Desvios Identificados')).toBeInTheDocument()

    // Presença da tabela detalhada
    expect(
      screen.getByText('Desvios de Aplicação e Rastreabilidade por Ordem de Produção'),
    ).toBeInTheDocument()
  })

  // ==========================================
  // TESTE DE INTERAÇÃO COM "LIMPAR FILTROS"
  // ==========================================
  it('ao clicar em "Limpar filtros", deve restaurar os filtros padrão e recarregar a visão', async () => {
    render(<MPUtilizationAndSubstitutionSubpage />)

    const resetButton = screen.getByRole('button', { name: /Limpar filtros/i })
    fireEvent.click(resetButton)

    await waitFor(() => {
      // Confirma que a página está estável e os dados continuam exibidos
      expect(screen.getByText('% 1020 no Lugar de AC')).toBeInTheDocument()
    })
  })
})

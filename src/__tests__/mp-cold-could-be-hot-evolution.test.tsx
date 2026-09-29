import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MPUtilizationAndSubstitutionSubpage } from '@/pages/mp-optimization/MPUtilizationAndSubstitutionSubpage'
import {
  filterMPUtilizationRows,
  CANONICAL_MP_UTILIZATION_DATASET,
} from '@/services/mp-utilization-dataset'
import { MPCentralProjectionEngine } from '@/services/mp-central-projection-engine'

// Mock para ResizeObserver utilizado pelo Recharts
;(globalThis as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('Suíte de Aceitação: Evolução Utilização e Substituição de MP - Potencial Térmico e IA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // CENÁRIO 1: Empresa=CIAFAL, Linha=L1, Centro=CFPL, Período=De 01/06/2026 até 30/06/2026
  // =========================================================================
  it('Cenário 1: filtra Empresa=CIAFAL, Linha=L1, Centro=CFPL, Período=De 01/06/2026 até 30/06/2026 e atualiza card, IA e gráfico', async () => {
    const filtered = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, {
      companyCode: 'CIAFAL',
      lineCode: 'L1',
      centerCode: 'CFPL',
      selectedRawMaterials: [],
      temporalVision: 'DIARIA',
      periodMode: 'DATA',
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      dailyDate: '2026-06-15',
      weeklyWeek: 24,
      weeklyYear: 2026,
      monthlyMonth: 6,
      monthlyYear: 2026,
      annualYear: 2026,
    })

    // Deve encontrar ordens em CFPL de Junho/2026 (ex: OP-2026-9901 e OP-2026-9922)
    expect(filtered.length).toBeGreaterThan(0)
    const ordersWithPotential = filtered.filter((r) => r.could_be_hot_charging)
    expect(ordersWithPotential.length).toBeGreaterThan(0)
    expect(ordersWithPotential[0].potential_hot_tons).toBe(25.5)

    // Renderiza na tela
    render(<MPUtilizationAndSubstitutionSubpage />)

    // Alterna para o modo "Por Data"
    const btnData = screen.getByTestId('period-mode-data')
    fireEvent.click(btnData)

    const inputFrom = screen.getByTestId('filter-period-date-from')
    const inputTo = screen.getByTestId('filter-period-date-to')
    fireEvent.change(inputFrom, { target: { value: '2026-06-01' } })
    fireEvent.change(inputTo, { target: { value: '2026-06-30' } })

    // Aplica os filtros
    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      // Verifica presença do novo card
      expect(screen.getByTestId('card-enfornamento-frio-potencial-quente')).toBeInTheDocument()
      expect(screen.getByText('Enfornamento frio que poderia ser quente')).toBeInTheDocument()

      // Verifica presença da seção de IA
      expect(screen.getByTestId('mp-utilization-ai-analysis-section')).toBeInTheDocument()
      expect(
        screen.getByText(/Análise de IA • O que deveria ter sido realizado/i),
      ).toBeInTheDocument()

      // Verifica presença do gráfico de barras mensal
      expect(screen.getByTestId('mp-monthly-charging-bar-chart')).toBeInTheDocument()
      expect(
        screen.getByText(/Evolução mensal do enfornamento frio com potencial para quente/i),
      ).toBeInTheDocument()
    })
  })

  // =========================================================================
  // CENÁRIO 2: Empresa=CIAFAL, Linha=L2, Período=De Junho/2026 até Agosto/2026
  // =========================================================================
  it('Cenário 2: filtra Empresa=CIAFAL, Linha=L2, Período=De Junho/2026 até Agosto/2026 e consolida meses no gráfico', async () => {
    const filtered = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, {
      companyCode: 'CIAFAL',
      lineCode: 'L2',
      centerCode: 'ALL',
      selectedRawMaterials: [],
      temporalVision: 'MENSAL',
      periodMode: 'MES',
      monthFrom: 6,
      yearMonthFrom: 2026,
      monthTo: 8,
      yearMonthTo: 2026,
      dailyDate: '2026-06-15',
      weeklyWeek: 24,
      weeklyYear: 2026,
      monthlyMonth: 6,
      monthlyYear: 2026,
      annualYear: 2026,
    })

    // Deve trazer ordens da L2 em Junho, Julho e Agosto (OP-2026-9908, OP-2026-9930, OP-2026-0711, OP-2026-0820)
    expect(filtered.length).toBeGreaterThanOrEqual(4)
    const potentialHotOrders = filtered.filter((r) => r.could_be_hot_charging)
    expect(potentialHotOrders.length).toBeGreaterThanOrEqual(2)

    render(<MPUtilizationAndSubstitutionSubpage />)

    // Alterna para o modo "Por Mês"
    const btnMes = screen.getByTestId('period-mode-mes')
    fireEvent.click(btnMes)

    expect(screen.getByTestId('filter-period-month-from-select')).toBeInTheDocument()
    expect(screen.getByTestId('filter-period-month-to-select')).toBeInTheDocument()

    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(screen.getByTestId('card-enfornamento-frio-potencial-quente')).toBeInTheDocument()
      expect(screen.getByTestId('mp-utilization-ai-analysis-section')).toBeInTheDocument()
      expect(screen.getByTestId('mp-monthly-charging-bar-chart')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // CENÁRIO 3: Empresa=CIAFAL, Matéria-prima específica, Período=De 2025 até 2026
  // =========================================================================
  it('Cenário 3: filtra Empresa=CIAFAL, MP específica (MP-TG-1020-130), Período=De 2025 até 2026', async () => {
    const filtered = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, {
      companyCode: 'CIAFAL',
      lineCode: 'ALL',
      centerCode: 'ALL',
      selectedRawMaterials: ['MP-TG-1020-130'],
      temporalVision: 'ANUAL',
      periodMode: 'ANO',
      yearFrom: 2025,
      yearTo: 2026,
      dailyDate: '2026-06-15',
      weeklyWeek: 24,
      weeklyYear: 2026,
      monthlyMonth: 6,
      monthlyYear: 2026,
      annualYear: 2026,
    })

    // Deve incluir tanto ordens de 2026 quanto de 2025
    expect(filtered.some((r) => r.period_year === 2025)).toBe(true)
    expect(filtered.some((r) => r.period_year === 2026)).toBe(true)

    render(<MPUtilizationAndSubstitutionSubpage />)

    // Alterna para "Por Ano"
    const btnAno = screen.getByTestId('period-mode-ano')
    fireEvent.click(btnAno)

    expect(screen.getByTestId('filter-period-ano-from-select')).toBeInTheDocument()
    expect(screen.getByTestId('filter-period-ano-to-select')).toBeInTheDocument()

    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      expect(screen.getByTestId('card-enfornamento-frio-potencial-quente')).toBeInTheDocument()
      expect(screen.getByTestId('mp-utilization-ai-analysis-section')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // CENÁRIO 4: Combinação sem registros (Estado Vazio Seguro)
  // =========================================================================
  it('Cenário 4: combinação sem registros exibe estados vazios organizados sem falha na página', async () => {
    const emptyRows = filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, {
      companyCode: 'EMPRESA_INEXISTENTE',
      lineCode: 'ALL',
      centerCode: 'ALL',
      selectedRawMaterials: [],
      temporalVision: 'MENSAL',
      periodMode: 'DATA',
      dateFrom: '2029-01-01',
      dateTo: '2029-01-02',
      dailyDate: '2029-01-01',
      weeklyWeek: 1,
      weeklyYear: 2029,
      monthlyMonth: 1,
      monthlyYear: 2029,
      annualYear: 2029,
    })

    expect(emptyRows.length).toBe(0)

    render(<MPUtilizationAndSubstitutionSubpage />)

    // Altera data para período futuro sem registros
    const btnData = screen.getByTestId('period-mode-data')
    fireEvent.click(btnData)

    const inputFrom = screen.getByTestId('filter-period-date-from')
    const inputTo = screen.getByTestId('filter-period-date-to')
    fireEvent.change(inputFrom, { target: { value: '2029-01-01' } })
    fireEvent.change(inputTo, { target: { value: '2029-01-02' } })

    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i })
    fireEvent.click(applyBtn)

    await waitFor(() => {
      // Estado vazio central
      expect(
        screen.getByText('Nenhum registro encontrado para os filtros selecionados.'),
      ).toBeInTheDocument()
      // Botão Limpar filtros disponível
      expect(screen.getAllByRole('button', { name: /Limpar filtros/i }).length).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // CENÁRIO 5: Troca de modo de período (Data -> Mês -> Ano)
  // =========================================================================
  it('Cenário 5: troca dinâmica do modo de período (Data -> Mês -> Ano) alternando inputs e persistindo filtros', async () => {
    render(<MPUtilizationAndSubstitutionSubpage />)

    const btnData = screen.getByTestId('period-mode-data')
    const btnMes = screen.getByTestId('period-mode-mes')
    const btnAno = screen.getByTestId('period-mode-ano')

    // 1. Alterna para Data
    fireEvent.click(btnData)
    expect(screen.getByTestId('filter-period-date-from')).toBeInTheDocument()
    expect(screen.getByTestId('filter-period-date-to')).toBeInTheDocument()

    // 2. Alterna para Mês
    fireEvent.click(btnMes)
    expect(screen.getByTestId('filter-period-month-from-select')).toBeInTheDocument()
    expect(screen.getByTestId('filter-period-month-to-select')).toBeInTheDocument()

    // 3. Alterna para Ano
    fireEvent.click(btnAno)
    expect(screen.getByTestId('filter-period-ano-from-select')).toBeInTheDocument()
    expect(screen.getByTestId('filter-period-ano-to-select')).toBeInTheDocument()
  })

  // =========================================================================
  // CENÁRIO 6: Validação de período inválido (Até < De)
  // =========================================================================
  it('Cenário 6: impede aplicação de intervalo inválido (Até < De) e informa o motivo claramente', async () => {
    render(<MPUtilizationAndSubstitutionSubpage />)

    const btnData = screen.getByTestId('period-mode-data')
    fireEvent.click(btnData)

    const inputFrom = screen.getByTestId('filter-period-date-from')
    const inputTo = screen.getByTestId('filter-period-date-to')

    // Data final anterior à data inicial
    fireEvent.change(inputFrom, { target: { value: '2026-06-30' } })
    fireEvent.change(inputTo, { target: { value: '2026-06-01' } })

    // Mensagem clara de validação
    expect(screen.getByTestId('period-validation-error-banner')).toBeInTheDocument()
    expect(
      screen.getByText(/A data final \("Até"\) não pode ser anterior à data inicial \("De"\)/i),
    ).toBeInTheDocument()

    // O botão Aplicar filtros deve estar desabilitado
    const applyBtn = screen.getByRole('button', { name: /Aplicar filtros/i })
    expect(applyBtn).toBeDisabled()
  })

  // =========================================================================
  // CENÁRIO 7: Cálculo do indicador e explicador de cálculo
  // =========================================================================
  it('Cenário 7: explicador de cálculo do indicador "enfornamento frio que poderia ser quente"', () => {
    const payload = MPCentralProjectionEngine.explainCalculation(
      'ENFORNAMENTO_FRIO_POTENCIAL_QUENTE' as any,
      {
        totalColdTons: 100,
        potentialHotTons: 32.5,
        impactedOrders: 4,
      },
    )

    expect(payload.title).toContain('Enfornamento frio que poderia ser quente')
    expect(payload.result).toBe(32.5)
    expect(payload.formula).toContain('% Oportunidade =')
    expect(payload.regulatoryStandardRef).toBeDefined()
  })
})

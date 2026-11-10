import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TestProgrammingPage from '@/pages/TestProgrammingPage'
import { testProgrammingService } from '@/services/test-programming-service'
import { TestProgrammingRecord } from '@/types/test-programming'

// Mock de serviços e hooks
vi.mock('@/services/test-programming-service', () => ({
  testProgrammingService: {
    list: vi.fn(),
    calculateMetrics: vi.fn(),
    listHubUsers: vi.fn().mockResolvedValue([]),
    listActiveTestTypes: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-pcp', name: 'Analista PCP', role: 'PCP' },
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockTests: TestProgrammingRecord[] = [
  {
    id: 't-1',
    test_id: 'TESTE-001',
    company: 'CIAFAL',
    production_line: 'L1',
    work_center: 'LAM-01',
    request_date: '2025-05-01',
    expected_date: '2025-05-15',
    expected_start_date: '2025-05-15',
    expected_start_time: '08:00',
    expected_end_date: '2025-05-15',
    expected_end_time: '12:00',
    expected_duration_minutes: 240,
    expected_duration_formatted: '4h',
    requesting_sector: 'PCP',
    requester_name: 'João Silva',
    technical_lead: 'Marcos Costa',
    test_type: 'Homologação Operacional',
    title: 'Teste de Nova Matéria Prima Aço Especial',
    objective: 'Testar novo aço',
    justification: 'Redução de custo',
    status: 'Aguardando Aprovação PCP',
    needs_revision: false,
    test_category: 'MATERIA_PRIMA',
    schedule_impact_type: 'PARADA_TOTAL',
  },
  {
    id: 't-2',
    test_id: 'TESTE-002',
    company: 'CIAFAL',
    production_line: 'L2',
    work_center: 'LAM-02',
    request_date: '2025-05-02',
    expected_date: '2025-05-16',
    expected_start_date: '2025-05-16',
    expected_start_time: '14:00',
    expected_end_date: '2025-05-16',
    expected_end_time: '16:00',
    expected_duration_minutes: 120,
    expected_duration_formatted: '2h',
    requesting_sector: 'Qualidade',
    requester_name: 'Ana Paula',
    technical_lead: 'Carlos Lima',
    test_type: 'Validação Dimensional',
    title: 'Validação de Nova Receita Bitola 140mm',
    objective: 'Validar dimensões',
    justification: 'Atendimento SGQ',
    status: 'Aguardando Avaliação de Eficácia',
    needs_revision: false,
    test_category: 'RECEITA_LAMINACAO',
    schedule_impact_type: 'SEM_IMPACTO',
  },
]

describe('TestProgrammingPage — Faixa Superior de Cards de Indicadores (Apresentação e Responsividade)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(testProgrammingService.list).mockResolvedValue(mockTests)
    vi.mocked(testProgrammingService.calculateMetrics).mockReturnValue({
      programados: 5,
      estaSemana: 3,
      aguardandoIndustria: 2,
      aguardandoPcp: 4,
      emExecucao: 1,
      aguardandoResultado: 2,
      aguardandoEficacia: 6,
      eficazes: 8,
      ineficazes: 1,
      necessitamNovoTeste: 2,
      comAcaoAberta: 3,
      acoesVencidas: 0,
    })
  })

  it('1. Renderiza a grade de cards com grid responsivo auto-fit e minmax(160px, 1fr)', async () => {
    render(
      <MemoryRouter>
        <TestProgrammingPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('test-programming-indicator-cards-grid')).toBeInTheDocument()
    })

    const gridEl = screen.getByTestId('test-programming-indicator-cards-grid')
    expect(gridEl.className).toContain('grid-cols-[repeat(auto-fit,minmax(160px,1fr))]')
    expect(gridEl.className).not.toContain('xl:grid-cols-12')
  })

  it('2. Exibe os títulos dos cards de forma COMPLETA sem abreviações e sem ellipsis/truncate', async () => {
    render(
      <MemoryRouter>
        <TestProgrammingPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Aguardando aprovação PCP')).toBeInTheDocument()
    })

    // Títulos obrigatórios completos
    expect(screen.getByText('Programados')).toBeInTheDocument()
    expect(screen.getByText('Esta Semana')).toBeInTheDocument()
    expect(screen.getByText('Aguardando aprovação industrial')).toBeInTheDocument()
    expect(screen.getByText('Aguardando aprovação PCP')).toBeInTheDocument()
    expect(screen.getByText('Em execução')).toBeInTheDocument()
    expect(screen.getByText('Aguardando resultado')).toBeInTheDocument()
    expect(screen.getByText('Aguardando avaliação de eficácia')).toBeInTheDocument()
    expect(screen.getByText('Eficazes')).toBeInTheDocument()
    expect(screen.getByText('Ineficazes')).toBeInTheDocument()
    expect(screen.getByText('Novo teste necessário')).toBeInTheDocument()
    expect(screen.getByText('Com ação aberta')).toBeInTheDocument()
    expect(screen.getByText('Ações vencidas')).toBeInTheDocument()

    // Garante que as abreviações antigas não existem
    expect(screen.queryByText('Aguard. PCP')).toBeNull()
    expect(screen.queryByText('Aguard. Indústria')).toBeNull()
    expect(screen.queryByText('Aguard. Resultado')).toBeNull()
    expect(screen.queryByText('Aguard. Eficácia')).toBeNull()
    expect(screen.queryByText('Novo Teste Nec.')).toBeNull()

    // Verifica que nenhum título do card possui classes de truncamento (truncate, overflow-hidden, nowrap)
    const titlePcp = screen.getByText('Aguardando aprovação PCP')
    expect(titlePcp.className).not.toContain('truncate')
    expect(titlePcp.className).not.toContain('overflow-hidden')
    expect(titlePcp.className).not.toContain('whitespace-nowrap')
    expect(titlePcp.className).toContain('break-words')
  })

  it('3. Hierarquia visual: valor numérico tem destaque e precede a descrição', async () => {
    render(
      <MemoryRouter>
        <TestProgrammingPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('indicator-card-aguardandoPcp')).toBeInTheDocument()
    })

    const cardPcp = screen.getByTestId('indicator-card-aguardandoPcp')
    expect(cardPcp).toHaveTextContent('4')
    expect(cardPcp).toHaveTextContent('Aguardando aprovação PCP')

    // Ordem dos nós: o número aparece antes do texto no HTML do botão
    const textContent = cardPcp.textContent || ''
    const idxNumber = textContent.indexOf('4')
    const idxTitle = textContent.indexOf('Aguardando aprovação PCP')
    expect(idxNumber).toBeLessThan(idxTitle)
  })

  it('4. Clique no card de indicador mantém o filtro ativo e permite toggle', async () => {
    render(
      <MemoryRouter>
        <TestProgrammingPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('indicator-card-aguardandoPcp')).toBeInTheDocument()
    })

    const cardPcp = screen.getByTestId('indicator-card-aguardandoPcp')
    fireEvent.click(cardPcp)

    expect(screen.getByText('Ativo')).toBeInTheDocument()
    expect(screen.getByText('Limpar Filtro Card')).toBeInTheDocument()

    // Toggle off
    fireEvent.click(cardPcp)
    expect(screen.queryByText('Ativo')).toBeNull()
    expect(screen.queryByText('Limpar Filtro Card')).toBeNull()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RulesEnginePage } from '@/pages/RulesEnginePage'
import { CoolingCalculatorWidget } from '@/components/rules-engine/CoolingCalculatorWidget'
import { pcpRulesService } from '@/services/pcp-rules-service'
import { lineMasterService } from '@/services/line-master'

// Mock dos serviços de backend
vi.mock('@/services/pcp-rules-service', () => ({
  pcpRulesService: {
    listSetupAcerto: vi.fn(),
    listScheduledStops: vi.fn(),
    listCoolingTimes: vi.fn(),
    listSequencingRules: vi.fn(),
    listPendingRevisions: vi.fn(),
    listRuleAuditLogs: vi.fn(),
  },
}))

vi.mock('@/services/line-master', () => ({
  lineMasterService: {
    listLines: vi.fn(),
  },
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('RulesEnginePage & CoolingCalculatorWidget — Aceitação de Responsividade e Identidade Visual Ciafal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(lineMasterService.listLines).mockResolvedValue([
      { id: 'l1', code: 'L1', name: 'Laminação 1', plant: 'Contagem', active: true } as any,
      { id: 'l2', code: 'L2', name: 'Laminação 2', plant: 'Contagem', active: true } as any,
    ])
    vi.mocked(pcpRulesService.listSetupAcerto).mockResolvedValue([
      {
        id: 's-1',
        line_code: 'L1',
        center_code: 'LAM-01',
        work_center: 'LAM-01',
        from_family_code: 'RED',
        from_code_prefix: '1020',
        from_description_gauge: 'Redondo 1020',
        to_family_code: 'CHAT',
        to_code_prefix: '1045',
        to_description_gauge: 'Chato 1045',
        setup_time_minutes: 45,
        tuning_time_minutes: 15,
        status: 'ATIVO',
        validity_start: '01/01/2025',
        validity_end: '31/12/2026',
        last_revision: '2025-01-15',
        responsible_name: 'Engenharia',
      } as any,
    ])
    vi.mocked(pcpRulesService.listScheduledStops).mockResolvedValue([])
    vi.mocked(pcpRulesService.listCoolingTimes).mockResolvedValue([
      {
        id: 'c-1',
        center_code: 'LAM-01',
        origin_line_code: 'L1',
        dest_line_code: 'L2',
        family_code: 'RED',
        gauge_dimension: '50mm',
        cooling_time_hours: 24,
        unit: 'h',
        status: 'ATIVO',
        valid_from: '2025-01-01',
        valid_until: '2026-12-31',
        responsible_name: 'Metalurgia',
      } as any,
    ])
    vi.mocked(pcpRulesService.listSequencingRules).mockResolvedValue([])
    vi.mocked(pcpRulesService.listPendingRevisions).mockResolvedValue([])
    vi.mocked(pcpRulesService.listRuleAuditLogs).mockResolvedValue([])
  })

  it('1. A barra de abas de RulesEnginePage tem container com overflow-x-auto e isolamento pb-2 para scroll', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/pcp/motor-regras']}>
        <RulesEnginePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('1. Setup & Acerto')).toBeInTheDocument()
    })

    // Localiza o container da lista de abas
    const tabsListContainer = container.querySelector('.overflow-x-auto')
    expect(tabsListContainer).not.toBeNull()
    expect(tabsListContainer?.className).toContain('overflow-x-auto')
    expect(tabsListContainer?.className).toContain('pb-2')
  })

  it('2. Todas as 7 abas do Motor de Regras são renderizadas com títulos completos', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/motor-regras']}>
        <RulesEnginePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('1. Setup & Acerto')).toBeInTheDocument()
      expect(screen.getByText('2. Paradas Programadas')).toBeInTheDocument()
      expect(screen.getByText('3. Tempo de Resfriamento')).toBeInTheDocument()
      expect(screen.getByText('4. Regras de Sequenciamento')).toBeInTheDocument()
      expect(screen.getByText('5. Parâmetros Mestres CP-SAT')).toBeInTheDocument()
      expect(screen.getByText('6. Histórico de Revisões')).toBeInTheDocument()
      expect(screen.getByText('7. Trilha de Auditoria')).toBeInTheDocument()
    })
  })

  it('3. Navegação para a aba "3. Tempo de Resfriamento" renderiza o widget CoolingCalculatorWidget e a tabela oficial', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/motor-regras?tab=resfriamento']}>
        <RulesEnginePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/SIMULADOR DE DEPENDÊNCIA TÉRMICA & DISPONIBILIDADE PRODUTIVA/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Tabela Oficial de Resfriamento & Cura Metalúrgica/i),
      ).toBeInTheDocument()
    })
  })

  it('4. CoolingCalculatorWidget usa a identidade visual Ciafal (#004C97) e fundo branco limpo', () => {
    const { container } = render(<CoolingCalculatorWidget />)

    expect(
      screen.getByText(/SIMULADOR DE DEPENDÊNCIA TÉRMICA & DISPONIBILIDADE PRODUTIVA/i),
    ).toBeInTheDocument()

    // O título ou ícone contém a cor azul Ciafal #004C97
    const ciafalElements = container.querySelectorAll(
      '[class*="#004C97"], [class*="text-[#004C97]"], [class*="ring-[#004C97]"]',
    )
    expect(ciafalElements.length).toBeGreaterThan(0)
  })

  it('5. CoolingCalculatorWidget calcula determinística e corretamente o atendimento ou bloqueio térmico', async () => {
    render(<CoolingCalculatorWidget />)

    // Valores padrão: Término 25/08 às 14:00, 24h resfriamento => disponível 26/08 às 14:00.
    // Programado: 26/08 às 08:00 => NÃO atendido (faltam 6h)
    expect(screen.getByText(/Resfriamento Não Atendido/i)).toBeInTheDocument()
    expect(screen.getByText(/Bloqueio Térmico/i)).toBeInTheDocument()

    // Altera o horário programado na linha destino para mais tarde (ex: 2026-08-27T08:00)
    const inputs = screen.getAllByDisplayValue(/2026-08/i)
    const destInput = inputs[1] // O segundo input de datetime-local

    fireEvent.change(destInput, { target: { value: '2026-08-27T10:00' } })

    await waitFor(() => {
      expect(screen.getByText(/Resfriamento Atendido/i)).toBeInTheDocument()
      expect(screen.getByText(/Fluxo Liberado/i)).toBeInTheDocument()
    })
  })

  it('6. O botão "Restaurar" reinicializa os parâmetros padrão do simulador', async () => {
    render(<CoolingCalculatorWidget />)

    const restoreBtn = screen.getByRole('button', { name: /Restaurar/i })
    fireEvent.click(restoreBtn)

    expect(screen.getByText(/Resfriamento Não Atendido/i)).toBeInTheDocument()
  })

  it('7. Preserva estritamente o export duplo em src/lib/pocketbase/client.ts (export { pb } e export default pb)', async () => {
    const clientModule = await import('@/lib/pocketbase/client')
    expect(clientModule.pb).toBeDefined()
    expect(clientModule.default).toBeDefined()
    expect(clientModule.pb).toBe(clientModule.default)
  })
})

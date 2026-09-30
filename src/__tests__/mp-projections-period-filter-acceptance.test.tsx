import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import { MPProjectionsSubpage } from '@/pages/mp-optimization/MPProjectionsSubpage'
import {
  parseDatePtBr,
  formatDatePtBr,
  applyDateMask,
} from '@/components/mp-optimization/DateInputPtBr'
import { pcpAuditService } from '@/services/pcp-audit-service'

// Mock de recharts para testes rápidos de interface
vi.mock('recharts', async () => {
  const actual = await vi.importActual<any>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="recharts-container">{children}</div>
    ),
    LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
    Legend: () => <div />,
    ReferenceLine: () => <div />,
  }
})

describe('Gestão de MP > Projeções de MP - Filtro de Período Personalizado "Período de / Até"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // TESTE 1: Helpers e Validações de Máscara / Data pt-BR
  // =========================================================================
  describe('DateInputPtBr Helpers (Máscara, Parse e Formatação pt-BR)', () => {
    it('deve aplicar máscara progressiva DD/MM/AAAA corretamente', () => {
      expect(applyDateMask('01')).toBe('01')
      expect(applyDateMask('0110')).toBe('01/10')
      expect(applyDateMask('01102026')).toBe('01/10/2026')
      expect(applyDateMask('01/10/2026')).toBe('01/10/2026')
      // Letras e símbolos são descartados
      expect(applyDateMask('abc01def10ghi2026')).toBe('01/10/2026')
    })

    it('deve fazer parse de data pt-BR válida e rejeitar inválidas', () => {
      const valid = parseDatePtBr('01/10/2026')
      expect(valid).not.toBeNull()
      expect(valid?.getDate()).toBe(1)
      expect(valid?.getMonth()).toBe(9) // 0-based: 9 = Outubro
      expect(valid?.getFullYear()).toBe(2026)

      // Rejeita dia inválido (ex: 31 de abril)
      expect(parseDatePtBr('31/04/2026')).toBeNull()
      // Rejeita mês inválido
      expect(parseDatePtBr('15/13/2026')).toBeNull()
      // Rejeita formato incompleto ou vazio
      expect(parseDatePtBr('')).toBeNull()
      expect(parseDatePtBr('01/10')).toBeNull()
    })

    it('deve formatar Date para DD/MM/AAAA sem retrocesso de fuso', () => {
      const date = new Date(2026, 8, 29, 12, 0, 0) // 29/09/2026
      expect(formatDatePtBr(date)).toBe('29/09/2026')
    })
  })

  // =========================================================================
  // TESTES OBRIGATÓRIOS DO USUÁRIO NA TELA REAL
  // =========================================================================
  describe('Cenários Obrigatórios da Especificação do Usuário na Tela Real', () => {
    it('(1) Renderização inicial: exibe campos Período de, Até, Buscar por aço, Aço, Forma e Horizonte', () => {
      render(<MPProjectionsSubpage />)

      expect(screen.getByText('Projeções de MP & Ruptura da Cadeia Integrada')).toBeInTheDocument()
      expect(
        screen.getByText('Matriz de Projeção de Estoque, Ruptura e Cobertura Total da Cadeia'),
      ).toBeInTheDocument()

      // Filtros existentes
      expect(screen.getByPlaceholderText('Buscar por aço...')).toBeInTheDocument()
      expect(screen.getByText('Aço:')).toBeInTheDocument()
      expect(screen.getByText('Forma:')).toBeInTheDocument()
      expect(screen.getByText('Horizonte:')).toBeInTheDocument()

      // Novos campos de período lado a lado
      expect(screen.getByText('Período de:')).toBeInTheDocument()
      expect(screen.getByText('Até:')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('01/10/2026')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('31/10/2026')).toBeInTheDocument()
    })

    it('(2) Cenário 01/10/2026 até 31/10/2026 (válido, dados recalculados no intervalo e auditoria)', async () => {
      const auditSpy = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({} as any)

      render(<MPProjectionsSubpage />)

      const startInput = screen.getByLabelText('Período de')
      const endInput = screen.getByLabelText('Até')

      fireEvent.change(startInput, { target: { value: '01/10/2026' } })
      fireEvent.change(endInput, { target: { value: '31/10/2026' } })

      // Aguarda aplicação do debounce
      await waitFor(
        () => {
          expect(
            screen.getByText(/Período personalizado ativo: 01\/10\/2026 até 31\/10\/2026 \(31d\)/i),
          ).toBeInTheDocument()
        },
        { timeout: 1500 },
      )

      // Matriz atualizada com texto do período filtrado
      expect(
        screen.getByText(/Período Filtrado: 01\/10\/2026 até 31\/10\/2026 \(31 dias\)/i),
      ).toBeInTheDocument()

      // Sem mensagem de erro
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      // Auditoria chamada via pcpAuditService
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'APLICAR_FILTRO_PERIODO_PERSONALIZADO',
          screen: 'Gestão de MP > Projeções de MP',
          details: expect.objectContaining({
            periodo_inicial: '01/10/2026',
            periodo_final: '31/10/2026',
            dias_intervalo: 31,
          }),
        }),
      )
    })

    it('(3) Cenário 01/10/2026 até 01/10/2026 (dia único válido)', async () => {
      render(<MPProjectionsSubpage />)

      const startInput = screen.getByLabelText('Período de')
      const endInput = screen.getByLabelText('Até')

      fireEvent.change(startInput, { target: { value: '01/10/2026' } })
      fireEvent.change(endInput, { target: { value: '01/10/2026' } })

      await waitFor(
        () => {
          expect(
            screen.getByText(/Período personalizado ativo: 01\/10\/2026 até 01\/10\/2026 \(1d\)/i),
          ).toBeInTheDocument()
        },
        { timeout: 1500 },
      )

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('(4) Data inicial maior que data final (bloqueado com mensagem oficial)', async () => {
      render(<MPProjectionsSubpage />)

      const startInput = screen.getByLabelText('Período de')
      const endInput = screen.getByLabelText('Até')

      // De 30/11/2026, Até 01/11/2026
      fireEvent.change(startInput, { target: { value: '30/11/2026' } })
      fireEvent.change(endInput, { target: { value: '01/11/2026' } })

      await waitFor(
        () => {
          expect(
            screen.getByText('A data inicial não pode ser posterior à data final.'),
          ).toBeInTheDocument()
        },
        { timeout: 1000 },
      )

      // Não exibe o badge de período ativo quando bloqueado
      expect(screen.queryByText(/Período personalizado ativo:/i)).not.toBeInTheDocument()
    })

    it('(5) Somente "Período de" preenchido (bloqueado com mensagem oficial)', async () => {
      render(<MPProjectionsSubpage />)

      const startInput = screen.getByLabelText('Período de')
      fireEvent.change(startInput, { target: { value: '01/10/2026' } })

      await waitFor(
        () => {
          expect(
            screen.getByText(
              'Informe a data inicial e a data final para aplicar o período personalizado.',
            ),
          ).toBeInTheDocument()
        },
        { timeout: 1000 },
      )

      expect(screen.queryByText(/Período personalizado ativo:/i)).not.toBeInTheDocument()
    })

    it('(6) Somente "Até" preenchido (bloqueado com mensagem oficial)', async () => {
      render(<MPProjectionsSubpage />)

      const endInput = screen.getByLabelText('Até')
      fireEvent.change(endInput, { target: { value: '31/10/2026' } })

      await waitFor(
        () => {
          expect(
            screen.getByText(
              'Informe a data inicial e a data final para aplicar o período personalizado.',
            ),
          ).toBeInTheDocument()
        },
        { timeout: 1000 },
      )

      expect(screen.queryByText(/Período personalizado ativo:/i)).not.toBeInTheDocument()
    })

    it('(7) Limpeza das duas datas (retorno ao estado anterior e funcionamento normal do Horizonte)', async () => {
      render(<MPProjectionsSubpage />)

      const startInput = screen.getByLabelText('Período de')
      const endInput = screen.getByLabelText('Até')

      // 1. Aplica período válido
      fireEvent.change(startInput, { target: { value: '01/10/2026' } })
      fireEvent.change(endInput, { target: { value: '15/10/2026' } })

      await waitFor(
        () => {
          expect(screen.getByText(/Período personalizado ativo:/i)).toBeInTheDocument()
        },
        { timeout: 1500 },
      )

      // 2. Clica no botão "Limpar período"
      const clearPeriodBtn = screen.getByRole('button', { name: /Limpar período/i })
      fireEvent.click(clearPeriodBtn)

      await waitFor(
        () => {
          expect(screen.queryByText(/Período personalizado ativo:/i)).not.toBeInTheDocument()
          expect(screen.queryByRole('alert')).not.toBeInTheDocument()
          // Retornou ao Horizonte padrão (30 dias)
          expect(screen.getByText(/• Horizonte: 30 dias/i)).toBeInTheDocument()
        },
        { timeout: 1000 },
      )
    })

    it('(8) Limpeza individual via botão "X" de cada campo', async () => {
      render(<MPProjectionsSubpage />)

      const startInput = screen.getByLabelText('Período de')
      fireEvent.change(startInput, { target: { value: '01/10/2026' } })

      // Botão X de limpeza individual aparece
      const clearButtons = screen.getAllByRole('button', { name: 'Limpar data' })
      expect(clearButtons.length).toBeGreaterThan(0)

      fireEvent.click(clearButtons[0])

      expect((startInput as HTMLInputElement).value).toBe('')
    })

    it('(9) Combinação com filtro de Busca por Aço', async () => {
      render(<MPProjectionsSubpage />)

      const searchInput = screen.getByPlaceholderText('Buscar por aço...')
      fireEvent.change(searchInput, { target: { value: '1045' } })

      // Na matriz, apenas SAE 1045 deve estar presente
      expect(screen.getByText('SAE 1045')).toBeInTheDocument()
      expect(screen.queryByText('SAE 1020')).not.toBeInTheDocument()

      // Aplica período personalizado simultaneamente sem perder o filtro de aço
      const startInput = screen.getByLabelText('Período de')
      const endInput = screen.getByLabelText('Até')
      fireEvent.change(startInput, { target: { value: '01/10/2026' } })
      fireEvent.change(endInput, { target: { value: '31/10/2026' } })

      await waitFor(
        () => {
          expect(screen.getByText(/Período personalizado ativo:/i)).toBeInTheDocument()
          expect(screen.getByText('SAE 1045')).toBeInTheDocument()
          expect(screen.queryByText('SAE 1020')).not.toBeInTheDocument()
        },
        { timeout: 1500 },
      )
    })

    it('(10) Preservação do filtro ao abrir modais (Explicabilidade, Homologação Excel e Simulação)', async () => {
      render(<MPProjectionsSubpage />)

      const startInput = screen.getByLabelText('Período de')
      const endInput = screen.getByLabelText('Até')
      fireEvent.change(startInput, { target: { value: '05/10/2026' } })
      fireEvent.change(endInput, { target: { value: '25/10/2026' } })

      await waitFor(
        () => {
          expect(
            screen.getByText(/Período personalizado ativo: 05\/10\/2026 até 25\/10\/2026/i),
          ).toBeInTheDocument()
        },
        { timeout: 1500 },
      )

      // Abre modal de Simulação de Compras
      const simButton = screen.getByRole('button', { name: /Simulação de Compras/i })
      fireEvent.click(simButton)

      // Modal aberto
      expect(screen.getByText('Simulação de Compras de MP')).toBeInTheDocument()

      // Fecha o modal
      const closeBtn = screen.getByRole('button', { name: /Fechar/i })
      fireEvent.click(closeBtn)

      // Período personalizado permanece íntegro
      expect(
        screen.getByText(/Período personalizado ativo: 05\/10\/2026 até 25\/10\/2026/i),
      ).toBeInTheDocument()
      expect((startInput as HTMLInputElement).value).toBe('05/10/2026')
      expect((endInput as HTMLInputElement).value).toBe('25/10/2026')
    })

    it('(11) Seleção via Popover Calendário pt-BR', async () => {
      render(<MPProjectionsSubpage />)

      const calButtons = screen.getAllByRole('button', { name: 'Abrir calendário' })
      expect(calButtons.length).toBe(2)

      // Abre popover do primeiro campo
      fireEvent.click(calButtons[0])

      // Popover exibe dias da semana em pt-BR (Dom, Seg, Ter...) e botão "Hoje"
      expect(screen.getByText('Dom')).toBeInTheDocument()
      expect(screen.getByText('Seg')).toBeInTheDocument()
      expect(screen.getByText(/Hoje \(/i)).toBeInTheDocument()

      // Clica em Hoje
      const hojeBtn = screen.getByText(/Hoje \(/i)
      fireEvent.click(hojeBtn)

      const startInput = screen.getByLabelText('Período de') as HTMLInputElement
      expect(startInput.value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    })
  })
})

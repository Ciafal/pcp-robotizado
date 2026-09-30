/**
 * Testes de Aceitação da Regra de Período — Gestão de MP > Projeções de MP
 *
 * Regra do Período:
 * 1. Data inicial fixa = hoje (preenchimento automático, formato DD/MM/AAAA, somente leitura).
 * 2. Horizonte: opções "-" (ausência/null), 7 Dias, 15 Dias, 30 Dias, 60 Dias, 90 Dias. Padrão inicial: 30 Dias.
 * 3. Regra de exclusividade Horizonte x Data final:
 *    - Se Horizonte tem valor (7/15/30/60/90): Data final vazia e desabilitada.
 *    - Se Horizonte = "-": Data final habilitada.
 *    - Se selecionar Horizonte com Data final preenchida: limpa Data final e desabilita.
 *    - Se trocar Horizonte para "-": remove horizonte, habilita Data final, aguarda preenchimento.
 * 4. Validação da Data final: obrigatória, DD/MM/AAAA, igual ou posterior a hoje.
 *    Se anterior a hoje: "A data final não pode ser anterior à data atual."
 * 5. Indicador de período vigente exibido na tela.
 * 6. Testes obrigatórios 1 a 6 do usuário.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MPProjectionsSubpage } from '../pages/mp-optimization/MPProjectionsSubpage'
import { pcpAuditService } from '../services/pcp-audit-service'
import { formatDatePtBr } from '../components/mp-optimization/DateInputPtBr'

// Mock de ResizeObserver para Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock

describe('Projeções de MP — Regra de Período (Aceitação Funcional)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({
      id: 'mock-audit-id',
      action: 'APLICAR_FILTRO_PERIODO_PERSONALIZADO',
    } as any)
  })

  const todayStr = formatDatePtBr(new Date())

  it('(Critérios 1, 2, 4, 6, 7) Estado inicial: Data inicial = hoje (readOnly), Horizonte = 30 Dias, Data final vazia e desabilitada', () => {
    render(<MPProjectionsSubpage />)

    // Data inicial preenchida com a data de hoje e somente leitura
    const startInput = screen.getByLabelText('Data inicial') as HTMLInputElement
    expect(startInput).toBeInTheDocument()
    expect(startInput.value).toBe(todayStr)
    expect(startInput.readOnly).toBe(true)

    // Não deve haver botão de limpar nem calendário no campo de Data inicial
    expect(screen.queryByRole('button', { name: 'Limpar data' })).not.toBeInTheDocument()

    // Data final vazia e desabilitada
    const endInput = screen.getByLabelText('Data final') as HTMLInputElement
    expect(endInput).toBeInTheDocument()
    expect(endInput.value).toBe('')
    expect(endInput.disabled).toBe(true)

    // Indicador de período vigente exibido com 30 dias
    expect(
      screen.getByText(new RegExp(`Período: ${todayStr} a .+ • Horizonte: 30 dias`)),
    ).toBeInTheDocument()
  })

  it('Teste 1 Obrigatório: Horizonte = 7 Dias → projeção iniciando em hoje', async () => {
    render(<MPProjectionsSubpage />)

    const startInput = screen.getByLabelText('Data inicial') as HTMLInputElement
    expect(startInput.value).toBe(todayStr)

    // O trigger do Select do horizonte
    const horizonTrigger = screen.getByLabelText('Horizonte')
    fireEvent.click(horizonTrigger)

    // Seleciona 7 Dias
    const opt7 = await screen.findByRole('option', { name: '7 Dias' })
    fireEvent.click(opt7)

    // Período vigente deve indicar Horizonte: 7 dias e iniciar em hoje
    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`Período: ${todayStr} a .+ • Horizonte: 7 dias`)),
      ).toBeInTheDocument()
    })

    const endInput = screen.getByLabelText('Data final') as HTMLInputElement
    expect(endInput.disabled).toBe(true)
    expect(endInput.value).toBe('')
  })

  it('Teste 2 Obrigatório: Horizonte = 30 Dias → Data final indisponível (vazia e desabilitada)', () => {
    render(<MPProjectionsSubpage />)

    const endInput = screen.getByLabelText('Data final') as HTMLInputElement
    expect(endInput.disabled).toBe(true)
    expect(endInput.value).toBe('')
  })

  it('Teste 3 Obrigatório: Horizonte = "-" e Data final = 31/12/2026 → projeção de hoje até 31/12/2026', async () => {
    render(<MPProjectionsSubpage />)

    // Trocar Horizonte para "-"
    const horizonTrigger = screen.getByLabelText('Horizonte')
    fireEvent.click(horizonTrigger)

    const optNone = await screen.findByRole('option', { name: '-' })
    fireEvent.click(optNone)

    // Data final agora está habilitada
    const endInput = screen.getByLabelText('Data final') as HTMLInputElement
    expect(endInput.disabled).toBe(false)

    // Preenche 31/12/2026
    fireEvent.change(endInput, { target: { value: '31/12/2026' } })

    // Aguarda debounce e validação
    await waitFor(
      () => {
        expect(
          screen.getByText(new RegExp(`Período: ${todayStr} a 31/12/2026 • Período personalizado`)),
        ).toBeInTheDocument()
      },
      { timeout: 1500 },
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('Teste 4 Obrigatório: Horizonte = "-" e Data final anterior a hoje → bloquear com a mensagem exigida', async () => {
    render(<MPProjectionsSubpage />)

    // Trocar Horizonte para "-"
    const horizonTrigger = screen.getByLabelText('Horizonte')
    fireEvent.click(horizonTrigger)

    const optNone = await screen.findByRole('option', { name: '-' })
    fireEvent.click(optNone)

    const endInput = screen.getByLabelText('Data final') as HTMLInputElement
    expect(endInput.disabled).toBe(false)

    // Data passada proposital: 01/01/2020
    fireEvent.change(endInput, { target: { value: '01/01/2020' } })

    await waitFor(
      () => {
        expect(
          screen.getByText('A data final não pode ser anterior à data atual.'),
        ).toBeInTheDocument()
      },
      { timeout: 1000 },
    )

    // Não deve aplicar período personalizado inválido
    expect(screen.queryByText(/• Período personalizado/i)).not.toBeInTheDocument()
  })

  it('Teste 5 Obrigatório: Data final preenchida → selecionar Horizonte 60 Dias → limpar Data final e usar Horizonte', async () => {
    render(<MPProjectionsSubpage />)

    // 1. Vai para "-"
    const horizonTrigger = screen.getByLabelText('Horizonte')
    fireEvent.click(horizonTrigger)
    const optNone = await screen.findByRole('option', { name: '-' })
    fireEvent.click(optNone)

    const endInput = screen.getByLabelText('Data final') as HTMLInputElement
    expect(endInput.disabled).toBe(false)

    // 2. Preenche Data final com 31/12/2026
    fireEvent.change(endInput, { target: { value: '31/12/2026' } })

    await waitFor(() => {
      expect(screen.getByText(/• Período personalizado/)).toBeInTheDocument()
    })

    // 3. Seleciona Horizonte 60 Dias
    fireEvent.click(horizonTrigger)
    const opt60 = await screen.findByRole('option', { name: '60 Dias' })
    fireEvent.click(opt60)

    // Data final deve ser limpa e desabilitada
    await waitFor(() => {
      expect(endInput.value).toBe('')
      expect(endInput.disabled).toBe(true)
      expect(
        screen.getByText(new RegExp(`Período: ${todayStr} a .+ • Horizonte: 60 dias`)),
      ).toBeInTheDocument()
    })
  })

  it('Teste 6 Obrigatório: Horizonte 90 Dias → selecionar "-" → liberar Data final e aguardar preenchimento', async () => {
    render(<MPProjectionsSubpage />)

    const horizonTrigger = screen.getByLabelText('Horizonte')

    // 1. Seleciona 90 Dias
    fireEvent.click(horizonTrigger)
    const opt90 = await screen.findByRole('option', { name: '90 Dias' })
    fireEvent.click(opt90)

    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`Período: ${todayStr} a .+ • Horizonte: 90 dias`)),
      ).toBeInTheDocument()
    })

    const endInput = screen.getByLabelText('Data final') as HTMLInputElement
    expect(endInput.disabled).toBe(true)

    // 2. Troca para "-"
    fireEvent.click(horizonTrigger)
    const optNone = await screen.findByRole('option', { name: '-' })
    fireEvent.click(optNone)

    // Data final agora deve estar liberada e vazia, aguardando preenchimento
    expect(endInput.disabled).toBe(false)
    expect(endInput.value).toBe('')
    expect(screen.getByText(/Informe uma Data final para a projeção/i)).toBeInTheDocument()
  })

  it('Filtro de busca por aço e filtros de visualização operam harmoniosamente com a regra de período', async () => {
    render(<MPProjectionsSubpage />)

    const searchInput = screen.getByPlaceholderText('Buscar por aço...')
    fireEvent.change(searchInput, { target: { value: '1045' } })

    expect(screen.getByText('SAE 1045')).toBeInTheDocument()
    expect(screen.queryByText('SAE 1020')).not.toBeInTheDocument()

    // Data inicial continua hoje
    const startInput = screen.getByLabelText('Data inicial') as HTMLInputElement
    expect(startInput.value).toBe(todayStr)
  })
})

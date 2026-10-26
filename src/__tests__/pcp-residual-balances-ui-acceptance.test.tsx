import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResidualBalancesTable } from '../components/residual-balances/ResidualBalancesTable'
import { ResidualBalanceMassActionModal } from '../components/residual-balances/ResidualBalanceMassActionModal'
import { ResidualBalanceItem } from '../types/pcp-residual-balances'
import { pb } from '../lib/pocketbase/client'

const mockItems: ResidualBalanceItem[] = [
  {
    id: 's1',
    deposito: 'DP07',
    deposito_nome: 'Laminação',
    material_codigo: 'MP-IN-FUND-001',
    material_descricao: 'Sucata Miúda Forjaria',
    lote: 'L-2403-001',
    quantidade_atual: 150.5,
    unidade_medida: 'kg',
    limite_parametrizado: 100,
    diferenca: 50.5,
    data_identificacao: '2026-10-26T08:00:00.000Z',
    status: 'ACAO_NECESSARIA',
    acao_recomendada: 'Regularização de estoque',
    responsavel_acao: 'PCP / Programação',
    regra_aplicada_descricao: 'Limite DP07',
  },
  {
    id: 's2',
    deposito: 'DP03',
    deposito_nome: 'Aciaria',
    material_codigo: 'MP-BAR-1045-02',
    material_descricao: 'Barra Redonda 1045',
    lote: 'L-2403-002',
    quantidade_atual: 275,
    unidade_medida: 'kg',
    limite_parametrizado: 200,
    diferenca: 75,
    data_identificacao: '2026-10-26T08:30:00.000Z',
    status: 'EM_TRATAMENTO',
    acao_recomendada: 'Priorizar consumo',
    responsavel_acao: 'PCP / Aciaria',
    regra_aplicada_descricao: 'Limite DP03',
  },
]

describe('UI/UX: Seleção Múltipla e Modal de Regularização em Massa (CIAFAL)', () => {
  it('deve exibir checkbox por linha e barra de ações em massa quando houver registros selecionados', () => {
    const onSelectionChange = vi.fn()
    const onOpenMassRegularize = vi.fn()

    const { rerender } = render(
      <ResidualBalancesTable
        items={mockItems}
        selectedItems={[]}
        onSelectionChange={onSelectionChange}
        onOpenMassRegularize={onOpenMassRegularize}
        onViewDetail={vi.fn()}
        onStartTreatment={vi.fn()}
        onRegisterAction={vi.fn()}
        onRegularize={vi.fn()}
        onViewHistory={vi.fn()}
      />,
    )

    // Sem seleção: barra de ações não é exibida
    expect(screen.queryByText(/REGULARIZAR SALDOS/i)).toBeNull()

    // Com 1 item selecionado: exibe a barra no formato especificado
    rerender(
      <ResidualBalancesTable
        items={mockItems}
        selectedItems={[mockItems[0]]}
        onSelectionChange={onSelectionChange}
        onOpenMassRegularize={onOpenMassRegularize}
        onViewDetail={vi.fn()}
        onStartTreatment={vi.fn()}
        onRegisterAction={vi.fn()}
        onRegularize={vi.fn()}
        onViewHistory={vi.fn()}
      />,
    )

    expect(screen.getByText(/1 saldo selecionado/i)).toBeDefined()
    expect(screen.getByText(/Limpar seleção/i)).toBeDefined()
    const regButton = screen.getByRole('button', { name: /REGULARIZAR SALDOS/i })
    expect(regButton).toBeDefined()

    // Clicar em REGULARIZAR SALDOS chama o callback
    fireEvent.click(regButton)
    expect(onOpenMassRegularize).toHaveBeenCalledTimes(1)
  })

  it('deve permitir selecionar e desselecionar todos os registros visíveis no cabeçalho', () => {
    const onSelectionChange = vi.fn()

    render(
      <ResidualBalancesTable
        items={mockItems}
        selectedItems={[]}
        onSelectionChange={onSelectionChange}
        onOpenMassRegularize={vi.fn()}
        onViewDetail={vi.fn()}
        onStartTreatment={vi.fn()}
        onRegisterAction={vi.fn()}
        onRegularize={vi.fn()}
        onViewHistory={vi.fn()}
      />,
    )

    const headerCheckbox = screen.getByLabelText(/Selecionar todos os registros visíveis/i)
    fireEvent.click(headerCheckbox)

    // Deve ter chamado com todos os mockItems
    expect(onSelectionChange).toHaveBeenCalledWith(mockItems)
  })

  it('deve renderizar o modal com resumo dos selecionados, validação de campos e tela de confirmação', async () => {
    pb.authStore.save('token-test', {
      id: 'u1',
      name: 'Gestor Teste',
      email: 'gestor@ciafal.com.br',
      role: 'PCP_ADMIN',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
    } as any)

    const onClose = vi.fn()
    const onSuccess = vi.fn()

    render(
      <ResidualBalanceMassActionModal
        open={true}
        onClose={onClose}
        selectedItems={mockItems}
        onSuccess={onSuccess}
      />,
    )

    // Título do modal
    expect(screen.getByText(/Regularização de Saldos Residuais/i)).toBeDefined()

    // Resumo dos selecionados
    expect(screen.getByText(/2 saldos/i)).toBeDefined()
    expect(screen.getByText(/425,50 kg/i)).toBeDefined() // 150.5 + 275

    // Campos obrigatórios Ação e Motivo
    expect(screen.getByText(/Ação de Regularização \*/i)).toBeDefined()
    expect(screen.getByText(/Motivo \/ Justificativa \*/i)).toBeDefined()

    // Avançar para tela de confirmação
    const advanceButton = screen.getByRole('button', { name: /Avançar para Confirmação/i })
    fireEvent.click(advanceButton)

    // Tela de confirmação
    expect(screen.getByText(/Confirmar regularização em massa\?/i)).toBeDefined()
    expect(screen.getByText(/Você está prestes a regularizar/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Confirmar regularização/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Voltar/i })).toBeDefined()
  })

  it('deve exibir mensagem de estado vazio quando nenhum saldo for encontrado para os filtros', () => {
    render(
      <ResidualBalancesTable
        items={[]}
        loading={false}
        selectedItems={[]}
        onSelectionChange={vi.fn()}
        onOpenMassRegularize={vi.fn()}
        onViewDetail={vi.fn()}
        onStartTreatment={vi.fn()}
        onRegisterAction={vi.fn()}
        onRegularize={vi.fn()}
        onViewHistory={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/Nenhum saldo residual encontrado para os filtros selecionados\./i),
    ).toBeDefined()
  })
})

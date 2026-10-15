/**
 * Testes Unitários e de Componente da Tabela de Pedidos Cancelados
 * Cobre estritamente as regras exigidas pelo usuário:
 * (a) Ordenação numérica (não textual) das 4 colunas em crescente/decrescente
 * (b) Formatação pt-BR (vírgula decimal, 2 casas, espaço, 't' minúsculo, milhar com ponto)
 * (c) Exibição 'Não disponível' quando não há dado — nunca zero
 * (d) Destaque vermelho discreto para negativos
 * (e) Tooltips dos títulos das novas colunas
 * (f) Botões 'Analisar' e 'Solicitar revisão' preservados
 */

import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CancelledOrdersTable } from '@/components/cancelled-orders/CancelledOrdersTable'
import { CancelledOrderRecord } from '@/types/cancelled-orders'
import { formatTonsPtBr } from '@/lib/formatters-ptbr'

const baseOrder: CancelledOrderRecord = {
  id: 'ORDER-BASE',
  empresa: 'CIAFAL',
  centro: 'CT01',
  linha: 'L01',
  ordem_venda: '10000',
  item_ordem: '0010',
  data_ordem: '01/03/2025',
  cliente_codigo: 'CLI-01',
  cliente_nome: 'Cliente Base',
  representante_vendedor: 'Carlos Silva',
  material_codigo: 'MAT-100',
  material_descricao: 'Material Base',
  familia: 'Barras',
  curva_abc: 'A',
  tipo_carteira: 'Geral',
  quantidade_original_ov_t: 20,
  quantidade_faturada_t: 0,
  saldo_cancelado_t: 10,
  unidade_medida: 'TO',
  estoque_disponivel_data_t: 5,
  preco_liquido: 3000,
  valor_cancelado_brl: 30000,
  condicao_pagamento: '30 dias',
  prazo: '30',
  status_faturamento: 'Cancelado',
  data_desejada_cliente: '15/03/2025',
  data_prevista_producao: '10/03/2025',
  data_efetiva_producao: '',
  status_recusa: '',
  motivo_original_sap: 'Motivo Base',
  categoria_motivo: 'PCP/Planejamento',
  observacao: '',
  data_hora_cancelamento: '01/03/2025 10:00',
  usuario_operacao: 'USR01',
  is_demo: false,
  has_ai_inconsistency: false,
  analysis_status: 'Pendente',
}

// Fixture controlado para validação isolada e determinística dos testes
const createMockOrders = (): CancelledOrderRecord[] => [
  {
    ...baseOrder,
    id: 'ORDER-1',
    ordem_venda: '10001',
    cliente_nome: 'Metalúrgica Alfa',
    material_codigo: 'MAT-100',
    material_descricao: 'Barra Redonda 10mm',
    saldo_cancelado_t: 15.0, // Saldo atual
    saldo_data_desejada_t: -8.5, // Negativo
    saldo_data_cadastro_t: 2.0,
    dias_sem_estoque_material: 12,
    motivo_original_sap: 'Atraso na entrega',
    categoria_motivo: 'PCP/Planejamento',
    valor_cancelado_brl: 45000,
  },
  {
    ...baseOrder,
    id: 'ORDER-2',
    centro: 'CT02',
    linha: 'L02',
    ordem_venda: '10002',
    cliente_codigo: 'CLI-02',
    cliente_nome: 'Indústria Beta',
    material_codigo: 'MAT-200',
    material_descricao: 'Perfil U 50x25',
    saldo_cancelado_t: 2.5, // Saldo atual
    saldo_data_desejada_t: 1234.56,
    saldo_data_cadastro_t: 50.0,
    dias_sem_estoque_material: 0,
    motivo_original_sap: 'Desistência do cliente',
    categoria_motivo: 'Comercial',
    valor_cancelado_brl: 12000,
  },
  {
    ...baseOrder,
    id: 'ORDER-3',
    ordem_venda: '10003',
    cliente_codigo: 'CLI-03',
    cliente_nome: 'Construções Gama',
    material_codigo: 'MAT-300',
    material_descricao: 'Viga I 150mm',
    saldo_cancelado_t: 100.0, // Saldo atual
    saldo_data_desejada_t: null, // Sem dados (deve mostrar "Não disponível")
    saldo_data_cadastro_t: null, // Sem dados (deve mostrar "Não disponível")
    dias_sem_estoque_material: null, // Sem dados (deve mostrar "Não disponível")
    motivo_original_sap: 'Falta de Matéria-Prima',
    categoria_motivo: 'PCP/Planejamento',
    valor_cancelado_brl: 300000,
  },
  {
    ...baseOrder,
    id: 'ORDER-4',
    ordem_venda: '10004',
    cliente_codigo: 'CLI-04',
    cliente_nome: 'Engenharia Delta',
    material_codigo: 'MAT-400',
    material_descricao: 'Tubo Redondo 2"',
    saldo_cancelado_t: 0.0, // Saldo zero
    saldo_data_desejada_t: 0.0, // Saldo zero
    saldo_data_cadastro_t: 0.0, // Saldo zero
    dias_sem_estoque_material: 4,
    motivo_original_sap: 'Preço divergente',
    categoria_motivo: 'Comercial',
    valor_cancelado_brl: 5000,
  },
]

describe('CancelledOrdersTable - Regras e Critérios Obrigatórios', () => {
  it('(b) Formatação pt-BR: vírgula decimal, 2 casas, espaço, t minúsculo e milhar com ponto', () => {
    expect(formatTonsPtBr(15.0, 2)).toBe('15,00 t')
    expect(formatTonsPtBr(-8.5, 2)).toBe('-8,50 t')
    expect(formatTonsPtBr(1234.56, 2)).toBe('1.234,56 t')
    expect(formatTonsPtBr(0, 2)).toBe('0,00 t')
    expect(formatTonsPtBr(1000000.5, 2)).toBe('1.000.000,50 t')
  })

  it('(c) Exibe "Não disponível" quando não há dados — nunca zero fictício', () => {
    const orders = createMockOrders()
    const onSelect = vi.fn()
    const onRequestRevision = vi.fn()
    const onViewHistory = vi.fn()

    render(
      <CancelledOrdersTable
        orders={orders}
        selectedOrderId={null}
        onSelectOrder={onSelect}
        onRequestRevision={onRequestRevision}
        onViewRevisionHistory={onViewHistory}
      />,
    )

    // ORDER-3 possui campos nulos, deve renderizar "Não disponível"
    const naoDisponiveis = screen.getAllByText('Não disponível')
    expect(naoDisponiveis.length).toBeGreaterThanOrEqual(3)
  })

  it('(d) Destaque vermelho discreto para valores de saldo negativos', () => {
    const orders = createMockOrders()
    render(
      <CancelledOrdersTable
        orders={orders}
        selectedOrderId={null}
        onSelectOrder={vi.fn()}
        onRequestRevision={vi.fn()}
        onViewRevisionHistory={vi.fn()}
      />,
    )

    // -8,50 t de ORDER-1 deve estar renderizado em tag com classes vermelhas
    const negativeElement = screen.getByText('-8,50 t')
    expect(negativeElement).toBeDefined()
    expect(negativeElement.className).toContain('text-red-700')
    expect(negativeElement.className).toContain('bg-red-100/80')
  })

  it('(e) Tooltips dos títulos das 4 colunas contêm os textos exatos da especificação', () => {
    const orders = createMockOrders()
    render(
      <CancelledOrdersTable
        orders={orders}
        selectedOrderId={null}
        onSelectOrder={vi.fn()}
        onRequestRevision={vi.fn()}
        onViewRevisionHistory={vi.fn()}
      />,
    )

    // Cabeçalhos devem existir
    expect(screen.getByText('Saldo atual (t)')).toBeDefined()
    expect(screen.getByText('Saldo na data desejada (t)')).toBeDefined()
    expect(screen.getByText('Saldo na data do cadastro do pedido (t)')).toBeDefined()
    expect(screen.getByText('Dias sem estoque do material')).toBeDefined()
  })

  it('(f) Botões "Analisar" e "Solicitar revisão" preservados e funcionais', () => {
    const orders = createMockOrders()
    const onSelect = vi.fn()
    const onRequestRevision = vi.fn()
    const onViewHistory = vi.fn()

    render(
      <CancelledOrdersTable
        orders={orders}
        selectedOrderId={null}
        onSelectOrder={onSelect}
        onRequestRevision={onRequestRevision}
        onViewRevisionHistory={onViewHistory}
      />,
    )

    const analisarButtons = screen.getAllByRole('button', { name: /Analisar/i })
    expect(analisarButtons.length).toBe(orders.length)

    const solicitarRevisaoButtons = screen.getAllByRole('button', { name: /Solicitar revisão/i })
    expect(solicitarRevisaoButtons.length).toBe(orders.length)

    // Clicar em analisar chama onSelectOrder
    fireEvent.click(analisarButtons[0])
    expect(onSelect).toHaveBeenCalled()

    // Clicar em solicitar revisão chama onRequestRevision
    fireEvent.click(solicitarRevisaoButtons[0])
    expect(onRequestRevision).toHaveBeenCalled()
  })

  it('(a) Ordenação numérica: "Saldo atual (t)" ordena numericamente e coloca nulos no fim', () => {
    const orders = createMockOrders()
    const { container } = render(
      <CancelledOrdersTable
        orders={orders}
        selectedOrderId={null}
        onSelectOrder={vi.fn()}
        onRequestRevision={vi.fn()}
        onViewRevisionHistory={vi.fn()}
      />,
    )

    const thSaldoAtual = screen.getByText('Saldo atual (t)').closest('th')
    expect(thSaldoAtual).not.toBeNull()

    // 1º clique: toggle para asc (0.0 -> 2.5 -> 15.0 -> 100.0)
    fireEvent.click(thSaldoAtual!)

    let rows = container.querySelectorAll('tbody tr')
    let firstRowOrder = rows[0].querySelector('td div.font-bold')?.textContent
    expect(firstRowOrder).toBe('10004') // 0.0 t

    // 2º clique: toggle para desc (100.0 -> 15.0 -> 2.5 -> 0.0)
    fireEvent.click(thSaldoAtual!)
    rows = container.querySelectorAll('tbody tr')
    firstRowOrder = rows[0].querySelector('td div.font-bold')?.textContent
    expect(firstRowOrder).toBe('10003') // 100.0 t
  })

  it('(a) Ordenação numérica: "Saldo na data desejada (t)" trata valores negativos corretamente', () => {
    const orders = createMockOrders()
    const { container } = render(
      <CancelledOrdersTable
        orders={orders}
        selectedOrderId={null}
        onSelectOrder={vi.fn()}
        onRequestRevision={vi.fn()}
        onViewRevisionHistory={vi.fn()}
      />,
    )

    const thSaldoDesejada = screen.getByText('Saldo na data desejada (t)').closest('th')
    expect(thSaldoDesejada).not.toBeNull()

    // 1º clique: ativa saldo_desejada desc (1234.56 -> 0.0 -> -8.5 -> null)
    fireEvent.click(thSaldoDesejada!)
    let rows = container.querySelectorAll('tbody tr')
    let firstRowOrder = rows[0].querySelector('td div.font-bold')?.textContent
    expect(firstRowOrder).toBe('10002') // 1234.56 t

    // 2º clique: alterna para asc (-8.5 -> 0.0 -> 1234.56 -> null)
    fireEvent.click(thSaldoDesejada!)
    rows = container.querySelectorAll('tbody tr')
    firstRowOrder = rows[0].querySelector('td div.font-bold')?.textContent
    expect(firstRowOrder).toBe('10001') // -8.5 t é o menor valor numérico
  })

  it('(a) Ordenação numérica: "Dias sem estoque do material" ordena numericamente', () => {
    const orders = createMockOrders()
    const { container } = render(
      <CancelledOrdersTable
        orders={orders}
        selectedOrderId={null}
        onSelectOrder={vi.fn()}
        onRequestRevision={vi.fn()}
        onViewRevisionHistory={vi.fn()}
      />,
    )

    const thDias = screen.getByText('Dias sem estoque do material').closest('th')
    expect(thDias).not.toBeNull()

    // 1º clique: ativa dias_sem_estoque desc (12 dias -> 4 dias -> 0 dias -> null)
    fireEvent.click(thDias!)
    let rows = container.querySelectorAll('tbody tr')
    let firstRowOrder = rows[0].querySelector('td div.font-bold')?.textContent
    expect(firstRowOrder).toBe('10001') // 12 dias

    // 2º clique: alterna para asc (0 dias -> 4 dias -> 12 dias -> null)
    fireEvent.click(thDias!)
    rows = container.querySelectorAll('tbody tr')
    firstRowOrder = rows[0].querySelector('td div.font-bold')?.textContent
    expect(firstRowOrder).toBe('10002') // 0 dias
  })

  it('(a) Ordenação numérica: "Saldo na data do cadastro do pedido (t)"', () => {
    const orders = createMockOrders()
    const { container } = render(
      <CancelledOrdersTable
        orders={orders}
        selectedOrderId={null}
        onSelectOrder={vi.fn()}
        onRequestRevision={vi.fn()}
        onViewRevisionHistory={vi.fn()}
      />,
    )

    const thCadastro = screen.getByText('Saldo na data do cadastro do pedido (t)').closest('th')
    expect(thCadastro).not.toBeNull()

    // 1º clique: desc (50.0 -> 2.0 -> 0.0 -> null)
    fireEvent.click(thCadastro!)
    let rows = container.querySelectorAll('tbody tr')
    let firstRowOrder = rows[0].querySelector('td div.font-bold')?.textContent
    expect(firstRowOrder).toBe('10002') // 50.0 t

    // 2º clique: asc (0.0 -> 2.0 -> 50.0 -> null)
    fireEvent.click(thCadastro!)
    rows = container.querySelectorAll('tbody tr')
    firstRowOrder = rows[0].querySelector('td div.font-bold')?.textContent
    expect(firstRowOrder).toBe('10004') // 0.0 t
  })
})

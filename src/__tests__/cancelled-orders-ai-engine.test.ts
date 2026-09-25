/**
 * Testes Automatizados dos Cenários Analíticos A, B, C, D e E da IA
 * Requisito 32: Teste Obrigatório da Lógica de IA
 * - Cenário A: Sem estoque em pronta entrega, estoque 0 t -> coerente, verifica produção, cobertura, MP.
 * - Cenário B: Sem estoque em pronta entrega, pedido 1,000 t, estoque 1,605 t -> INCONSISTÊNCIA, recomenda verificar reservas.
 * - Cenário C: Sem estoque em pronta entrega, produção 60 t na mesma data -> INCONSISTÊNCIA, investigar horário.
 * - Cenário D: Mesmo cliente + mesmo material + mesmo motivo em três períodos -> Alerta "Padrão recorrente identificado".
 * - Cenário E: Dados insuficientes -> "Dados insuficientes para confirmar a causa", sem inventar dados.
 */

import { describe, it, expect } from 'vitest'
import { CancelledOrdersAIEngine } from '@/services/cancelled-orders-ai-engine'
import { CancelledOrderRecord } from '@/types/cancelled-orders'

describe('CancelledOrdersAIEngine - Cenários A a E Obrigatórios', () => {
  it('Cenário A: Motivo "Sem estoque em pronta entrega" com estoque na data 0,000 t', () => {
    const order: Partial<CancelledOrderRecord> = {
      id: 'TEST-A',
      ordem_venda: '4500000001',
      item_ordem: '000010',
      cliente_nome: 'CLIENTE TESTE A',
      material_codigo: 'PER-U-100',
      motivo_original_sap: 'Sem estoque em pronta entrega',
      saldo_cancelado_t: 5.0,
      estoque_disponivel_data_t: 0.0,
      context_data: {
        estoqueDisponivelDataPedido: 0.0,
        estoqueDataDesejada: 0.0,
        coberturaEstoqueUltimaCampanhaDias: 10,
        materiaPrimaDisponivel: 150.0,
        proximaCampanhaData: '25/02/2025',
      },
    }

    const result = CancelledOrdersAIEngine.analyzeOrder(order, [])

    expect(result.hasInconsistency).toBe(false)
    expect(result.verificationStatus).toBe('Coerente com dados disponíveis')
    expect(result.evidences.some((e) => e.includes('0,000 t'))).toBe(true)
    expect(result.evidences.some((e) => e.includes('Cobertura da última campanha: 10 dias'))).toBe(
      true,
    )
    expect(result.evidences.some((e) => e.includes('Matéria-prima vinculada: 150,0 t'))).toBe(true)
  })

  it('Cenário B: Motivo "Sem estoque em pronta entrega" com estoque aparente superior (1,605 t vs 1,000 t)', () => {
    const order: Partial<CancelledOrderRecord> = {
      id: 'TEST-B',
      ordem_venda: '4500000002',
      item_ordem: '000010',
      cliente_nome: 'CLIENTE TESTE B',
      material_codigo: 'PER-U-100',
      motivo_original_sap: 'Sem estoque em pronta entrega',
      saldo_cancelado_t: 1.0,
      estoque_disponivel_data_t: 1.605,
      context_data: {
        estoqueDataDesejada: 1.605,
        estoqueDisponivelDataPedido: 1.605,
      },
    }

    const result = CancelledOrdersAIEngine.analyzeOrder(order, [])

    expect(result.hasInconsistency).toBe(true)
    expect(result.verificationStatus).toBe('Inconsistência encontrada')
    expect(result.confidenceLevel).toBe('Alta')
    expect(result.avoidableStatus).toBe('Potencialmente evitável')
    expect(result.evidences.some((e) => e.includes('1,605 t disponíveis'))).toBe(true)
    expect(result.evidences.some((e) => e.includes('1,000 t'))).toBe(true)
    expect(result.actionSuggested.toLowerCase()).toContain('bloqueio de estoque')
  })

  it('Cenário C: Motivo "Sem estoque em pronta entrega" com produção de 60 t na mesma data', () => {
    const order: Partial<CancelledOrderRecord> = {
      id: 'TEST-C',
      ordem_venda: '4500000003',
      item_ordem: '000010',
      cliente_nome: 'CLIENTE TESTE C',
      material_codigo: 'BAR-CH-50',
      motivo_original_sap: 'Sem estoque em pronta entrega',
      saldo_cancelado_t: 15.0,
      estoque_disponivel_data_t: 0.0,
      context_data: {
        producaoRealizadaMesmoDia: 60.0,
      },
    }

    const result = CancelledOrdersAIEngine.analyzeOrder(order, [])

    expect(result.hasInconsistency).toBe(true)
    expect(result.verificationStatus).toBe('Inconsistência encontrada')
    expect(result.evidences.some((e) => e.includes('60,0 t na mesma data'))).toBe(true)
    expect(result.actionSuggested.toLowerCase()).toContain(
      'horário do pedido versus liberação da produção',
    )
  })

  it('Cenário D: Mesmo cliente + mesmo material + mesmo motivo em 3 períodos (Padrão recorrente)', () => {
    const history: CancelledOrderRecord[] = [
      {
        id: 'HIST-1',
        empresa: 'CIAFAL',
        centro: 'L1',
        linha: 'L1',
        ordem_venda: '4500000010',
        item_ordem: '000010',
        data_ordem: '10/01/2025',
        cliente_codigo: 'CLI-RECORRENTE',
        cliente_nome: 'CLIENTE RECORRENTE LTDA',
        material_codigo: 'MAT-RECORRENTE',
        material_descricao: 'PERFIL RECORRENTE',
        motivo_original_sap: 'Falta de data de programação',
        saldo_cancelado_t: 10,
        valor_cancelado_brl: 50000,
        familia: 'PERFIS',
        categoria_motivo: 'PCP/Planejamento',
        has_ai_inconsistency: false,
        ai_verification_status: '',
        ai_probable_cause: '',
        ai_suggested_responsibility: 'PCP',
        ai_confidence_level: 'Alta',
        ai_avoidable_status: 'Potencialmente evitável',
        ai_priority: 'Alta',
        ai_action_suggested: '',
        analysis_status: 'Pendente',
        is_demo: true,
        curva_abc: 'A',
        tipo_carteira: 'REV',
        unidade_medida: 'TO',
        preco_liquido: 5000,
        prazo: '30D',
        status_faturamento: 'CANCELADO',
        data_desejada_cliente: '15/01/2025',
        data_prevista_producao: '20/01/2025',
        status_recusa: 'RECUSADO',
        observacao: '',
        data_hora_cancelamento: '',
        usuario_operacao: '',
        quantidade_original_ov_t: 10,
        quantidade_faturada_t: 0,
        condicao_pagamento: '30D',
        representante_vendedor: 'VENDAS',
        estoque_disponivel_data_t: 0,
      },
      {
        id: 'HIST-2',
        empresa: 'CIAFAL',
        centro: 'L1',
        linha: 'L1',
        ordem_venda: '4500000011',
        item_ordem: '000010',
        data_ordem: '10/02/2025',
        cliente_codigo: 'CLI-RECORRENTE',
        cliente_nome: 'CLIENTE RECORRENTE LTDA',
        material_codigo: 'MAT-RECORRENTE',
        material_descricao: 'PERFIL RECORRENTE',
        motivo_original_sap: 'Falta de data de programação',
        saldo_cancelado_t: 12,
        valor_cancelado_brl: 60000,
        familia: 'PERFIS',
        categoria_motivo: 'PCP/Planejamento',
        has_ai_inconsistency: false,
        ai_verification_status: '',
        ai_probable_cause: '',
        ai_suggested_responsibility: 'PCP',
        ai_confidence_level: 'Alta',
        ai_avoidable_status: 'Potencialmente evitável',
        ai_priority: 'Alta',
        ai_action_suggested: '',
        analysis_status: 'Pendente',
        is_demo: true,
        curva_abc: 'A',
        tipo_carteira: 'REV',
        unidade_medida: 'TO',
        preco_liquido: 5000,
        prazo: '30D',
        status_faturamento: 'CANCELADO',
        data_desejada_cliente: '15/02/2025',
        data_prevista_producao: '20/02/2025',
        status_recusa: 'RECUSADO',
        observacao: '',
        data_hora_cancelamento: '',
        usuario_operacao: '',
        quantidade_original_ov_t: 12,
        quantidade_faturada_t: 0,
        condicao_pagamento: '30D',
        representante_vendedor: 'VENDAS',
        estoque_disponivel_data_t: 0,
      },
    ]

    const orderCurrent: Partial<CancelledOrderRecord> = {
      id: 'TEST-D-CURR',
      ordem_venda: '4500000012',
      item_ordem: '000010',
      cliente_codigo: 'CLI-RECORRENTE',
      cliente_nome: 'CLIENTE RECORRENTE LTDA',
      material_codigo: 'MAT-RECORRENTE',
      motivo_original_sap: 'Falta de data de programação',
      saldo_cancelado_t: 15.0,
      context_data: {
        historicoPeriodosComCancelamento: ['Jan/25', 'Fev/25', 'Mar/25'],
      },
    }

    const result = CancelledOrdersAIEngine.analyzeOrder(orderCurrent, history)

    expect(result.recurringPatternDetected).toBe(true)
    expect(result.recurringReason).toContain('Padrão recorrente identificado')
    expect(result.priority).toBe('Crítica')
  })

  it('Cenário E: Sem dados suficientes para confirmar a causa', () => {
    const order: Partial<CancelledOrderRecord> = {
      id: 'TEST-E',
      ordem_venda: '4500000005',
      item_ordem: '000010',
      cliente_nome: 'CLIENTE SEM HISTORICO',
      material_codigo: 'MAT-SEM-SNAPSHOT',
      motivo_original_sap: 'Sem estoque em pronta entrega',
      saldo_cancelado_t: 6.0,
      estoque_disponivel_data_t: null,
      context_data: {
        estoqueDisponivelDataPedido: null,
        estoqueDataDesejada: undefined,
        producaoRealizadaMesmoDia: undefined,
        materiaPrimaDisponivel: undefined,
      },
    }

    const result = CancelledOrdersAIEngine.analyzeOrder(order, [])

    expect(result.hasInconsistency).toBe(false)
    expect(result.verificationStatus).toBe('Dados insuficientes para confirmar a causa')
    expect(result.probableCause).toBe('Dados insuficientes para confirmar a causa')
    expect(result.confidenceLevel).toBe('Dados insuficientes')
    expect(result.missingData.length).toBeGreaterThan(0)
  })
})

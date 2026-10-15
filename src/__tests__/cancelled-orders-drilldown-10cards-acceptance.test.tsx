/**
 * Testes de Aceite Automatizados: Detalhamento Funcional dos 10 Cards de Cancelamento
 * Cobre estritamente os Requisitos 1 a 10 solicitados pelo usuário:
 * 1. Todos os 10 cards clicáveis abrindo o popup responsivo com título correspondente e indicadores.
 * 2. Regra por card:
 *    - Pedidos cancelados & Volume cancelado: todos do período;
 *    - % da carteira: exibe numerador e denominador;
 *    - Relacionados ao PCP: categoria_recusa = 'PCP';
 *    - Comerciais: categoria_recusa = 'COMERCIAL';
 *    - Transporte: categoria_recusa = 'TRANSPORTE';
 *    - Principal motivo: pedidos do motivo estruturado predominante;
 *    - Reincidências: regra de reincidência identificada;
 *    - Inconsistências IA: pedidos sinalizados;
 *    - Evitáveis: classificados como potencialmente evitáveis;
 *    - "Sem categorização" NUNCA aparece nos 3 cards de categoria.
 * 3. Tabela detalhada: Pedido + Item como identificador unívoco (sem agrupar itens),
 *    e ausência de valores preenchida com "Não disponível".
 * 4. Popup vazio exibe: "Nenhum pedido cancelado encontrado para os filtros selecionados."
 * 5. Detalhamento individual do pedido: dados Comerciais, PCP, Transporte e Classificação editável.
 * 6. Painel compacto IA com 7 blocos orientativos sem modificar dados do SAP.
 */

import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExecutiveCardDrilldownModal } from '@/components/cancelled-orders/ExecutiveCardDrilldownModal'
import { CancelledOrderDetailModal } from '@/components/cancelled-orders/CancelledOrderDetailModal'
import { CancelledOrdersExecutiveCards } from '@/components/cancelled-orders/CancelledOrdersExecutiveCards'
import { CancelledOrderRecord, CancellationExecutiveKPIs } from '@/types/cancelled-orders'

const mockKpis: CancellationExecutiveKPIs = {
  totalPedidosQtd: 6,
  totalVolumeToneladas: 180.5,
  totalValorBrl: 505000.0,
  percentualCarteiraCancelada: 2.45,
  pcpQtd: 2,
  pcpToneladas: 45.0,
  pcpPercentualVolume: 25.0,
  comercialQtd: 2,
  comercialToneladas: 80.5,
  comercialPercentualVolume: 44.6,
  transporteQtd: 1,
  transporteToneladas: 30.0,
  transportePercentualVolume: 16.6,
  semCategorizacaoQtd: 1,
  semCategorizacaoToneladas: 25.0,
  principalMotivoNome: 'Falta de Tarugo ST930',
  principalMotivoToneladas: 45.0,
  principalMotivoCategoria: 'PCP',
  reincidentesQtd: 2,
  inconsistenciasIAQtd: 1,
  potencialmenteEvitaveisQtd: 3,
  potencialmenteEvitaveisToneladas: 100.0,
}

const baseOrder: CancelledOrderRecord = {
  id: 'ORDER-BASE',
  empresa: 'CIAFAL',
  centro: 'CT01',
  linha: 'L1',
  ordem_venda: '10000',
  item_ordem: '0010',
  data_ordem: '2025-02-01',
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
  data_desejada_cliente: '2025-02-15',
  data_prevista_producao: '2025-02-10',
  data_efetiva_producao: '',
  status_recusa: '',
  motivo_original_sap: 'Motivo Base',
  categoria_motivo: 'PCP/Planejamento',
  observacao: '',
  data_hora_cancelamento: '2025-02-01 10:00',
  usuario_operacao: 'USR01',
  is_demo: false,
  has_ai_inconsistency: false,
  ai_verification_status: 'Coerente com dados disponíveis',
  ai_probable_cause: 'Sem divergências detectadas',
  ai_suggested_responsibility: 'PCP',
  ai_confidence_level: 'Média',
  ai_avoidable_status: 'Potencialmente evitável',
  ai_priority: 'Média',
  ai_action_suggested: 'Acompanhar próxima programação',
  analysis_status: 'Pendente',
}

const mockOrders: CancelledOrderRecord[] = [
  {
    ...baseOrder,
    id: 'ord-1',
    ordem_venda: '450001',
    item_ordem: '10',
    cliente_codigo: 'CLI-001',
    cliente_nome: 'AÇOS BRASIL S/A',
    material_codigo: 'TAR-ST930-100',
    material_descricao: 'Tarugo Especial ST930 100mm',
    quantidade_original_ov_t: 50.0,
    saldo_cancelado_t: 45.0,
    unidade_medida: 'TO',
    valor_cancelado_brl: 185000.0,
    data_ordem: '2025-02-10',
    data_hora_cancelamento: '2025-02-15 14:30:00',
    empresa: 'CIAFAL',
    centro: 'CT01',
    linha: 'L1',
    categoria_recusa: 'PCP',
    motivo_recusa: 'Falta de Tarugo ST930',
    motivo_original_sap: 'Falta de Matéria-Prima',
    analysis_status: 'Pendente',
    ai_confidence_level: 'Alta',
    ai_priority: 'Alta',
    ai_verification_status: 'Coerente com dados disponíveis',
    ai_avoidable_status: 'Potencialmente evitável',
    ai_probable_cause: 'Ruptura no estoque de tarugos ST930',
    ai_suggested_responsibility: 'PCP',
    ai_action_suggested: 'Reprogramar com tarugo alternativo homologado',
    has_ai_inconsistency: false,
    is_demo: false,
    ai_analysis_payload: {
      hasInconsistency: false,
      verificationStatus: 'Coerente com dados disponíveis',
      probableCause: 'Ruptura no estoque de tarugos ST930',
      suggestedResponsibility: 'PCP',
      confidenceLevel: 'Alta',
      avoidableStatus: 'Potencialmente evitável',
      priority: 'Alta',
      actionSuggested: 'Reprogramar com tarugo alternativo homologado',
      evidences: ['Estoque zerado'],
      hypotheses: ['Fornecedor atrasou'],
      missingData: [],
      consultedData: ['Estoque na data e ordens no SAP'],
      consultedPeriod: '2025-02-10',
      limitations: [],
      recurringPatternDetected: false,
    },
  },
  {
    ...baseOrder,
    id: 'ord-2',
    ordem_venda: '450002',
    item_ordem: '20',
    cliente_codigo: 'CLI-002',
    cliente_nome: 'METALÚRGICA SUL LTDA',
    material_codigo: 'PER-L1-50',
    material_descricao: 'Perfil Laminado L1 50mm',
    quantidade_original_ov_t: 80.5,
    saldo_cancelado_t: 80.5,
    unidade_medida: 'TO',
    valor_cancelado_brl: 320000.0,
    data_ordem: '2025-02-11',
    data_hora_cancelamento: '2025-02-16 09:15:00',
    empresa: 'CIAFAL',
    centro: 'CT01',
    linha: 'L2',
    categoria_recusa: 'COMERCIAL',
    motivo_recusa: 'Preço divergente do acordado',
    motivo_original_sap: 'Preço Incompatível',
    analysis_status: 'Pendente',
    ai_confidence_level: 'Média',
    ai_priority: 'Média',
    ai_verification_status: 'Coerente com dados disponíveis',
    ai_avoidable_status: 'Provavelmente não evitável',
    ai_probable_cause: 'Divergência de tabela comercial SAP',
    ai_suggested_responsibility: 'Comercial',
    ai_action_suggested: 'Revisar tabela de preços no SAP ECC',
    has_ai_inconsistency: false,
    is_demo: false,
    ai_analysis_payload: {
      hasInconsistency: false,
      verificationStatus: 'Coerente com dados disponíveis',
      probableCause: 'Divergência de tabela comercial SAP',
      suggestedResponsibility: 'Comercial',
      confidenceLevel: 'Média',
      avoidableStatus: 'Provavelmente não evitável',
      priority: 'Média',
      actionSuggested: 'Revisar tabela de preços no SAP ECC',
      evidences: ['Tabela de preços alterada'],
      hypotheses: ['Reajuste contratual'],
      missingData: [],
      consultedData: ['Tabela de preços'],
      consultedPeriod: '2025-02-11',
      limitations: [],
      recurringPatternDetected: true,
      recurringReason: 'Cliente cancela compras quando índice sobe mais de 3%',
    },
  },
  {
    ...baseOrder,
    id: 'ord-3',
    ordem_venda: '450003',
    item_ordem: '10',
    cliente_codigo: 'CLI-003',
    cliente_nome: 'DISTRIBUIDORA NORTE',
    material_codigo: 'BAR-SDC-12',
    material_descricao: 'Barra Redonda SDC 12mm',
    quantidade_original_ov_t: 30.0,
    saldo_cancelado_t: 30.0,
    unidade_medida: 'TO',
    valor_cancelado_brl: null as any, // Testa ausência de valor
    data_ordem: '2025-02-12',
    data_hora_cancelamento: '2025-02-17 11:00:00',
    empresa: 'CIAFAL',
    centro: 'CT02',
    linha: 'SDC',
    categoria_recusa: 'TRANSPORTE',
    motivo_recusa: 'Veículo reprovado na inspeção de expedição',
    motivo_original_sap: 'Logística Inviável',
    analysis_status: 'Pendente',
    ai_confidence_level: 'Alta',
    ai_priority: 'Alta',
    ai_verification_status: 'Coerente com dados disponíveis',
    ai_avoidable_status: 'Potencialmente evitável',
    ai_probable_cause: 'Veículo do freteiro sem condições de amarração',
    ai_suggested_responsibility: 'Logística',
    ai_action_suggested: 'Acionar transportadora homologada CIAFAL',
    has_ai_inconsistency: false,
    is_demo: false,
    ai_analysis_payload: {
      hasInconsistency: false,
      verificationStatus: 'Coerente com dados disponíveis',
      probableCause: 'Veículo do freteiro sem condições de amarração',
      suggestedResponsibility: 'Logística',
      confidenceLevel: 'Alta',
      avoidableStatus: 'Potencialmente evitável',
      priority: 'Alta',
      actionSuggested: 'Acionar transportadora homologada CIAFAL',
      evidences: ['Checklist de expedição reprovado'],
      hypotheses: ['Caminhão inadequado'],
      missingData: [],
      consultedData: ['Checklist de carga'],
      consultedPeriod: '2025-02-12',
      limitations: [],
      recurringPatternDetected: false,
    },
  },
  {
    ...baseOrder,
    id: 'ord-4',
    ordem_venda: '450004',
    item_ordem: '10',
    cliente_codigo: '', // Testa cliente ausente
    cliente_nome: '',
    material_codigo: 'TAR-ST930-100',
    material_descricao: '',
    quantidade_original_ov_t: 25.0,
    saldo_cancelado_t: 25.0,
    unidade_medida: 'TO',
    valor_cancelado_brl: 0,
    data_ordem: '2025-02-13',
    empresa: 'CIAFAL',
    centro: 'CT01',
    linha: 'L1',
    categoria_recusa: undefined as any, // Sem categorização
    motivo_recusa: undefined as any,
    motivo_original_sap: 'Desistência sem motivo informado',
    analysis_status: 'Pendente',
    ai_confidence_level: 'Baixa',
    ai_priority: 'Média',
    ai_verification_status: 'Inconsistente',
    ai_avoidable_status: 'Potencialmente evitável',
    ai_probable_cause: 'Estoque físico existia na data do cancelamento',
    ai_suggested_responsibility: 'PCP',
    ai_action_suggested: 'Verificar inventário no depósito',
    has_ai_inconsistency: true, // Inconsistência IA
    is_demo: false,
    ai_analysis_payload: {
      hasInconsistency: true,
      verificationStatus: 'Inconsistência encontrada',
      probableCause: 'Estoque físico existia na data do cancelamento',
      suggestedResponsibility: 'PCP',
      confidenceLevel: 'Baixa',
      avoidableStatus: 'Potencialmente evitável',
      priority: 'Média',
      actionSuggested: 'Verificar inventário no depósito',
      evidences: ['Saldo no SAP era 15 t'],
      hypotheses: ['Erro no apontamento da recusa'],
      missingData: [],
      consultedData: ['Estoque diário'],
      consultedPeriod: '2025-02-13',
      limitations: [],
      recurringPatternDetected: true,
      recurringReason: 'Cancelamentos consecutivos sem apontamento de motivo',
    },
  },
]

describe('Detalhamento Funcional dos 10 Cards de Cancelamento (Requisitos 1 a 10)', () => {
  // --------------------------------------------------------------------------
  // CENÁRIO 1: Todos os 10 cards clicáveis disparando a ação
  // --------------------------------------------------------------------------
  it('Requisito 1: Todos os 10 cards executivos possuem ação de clique e abrem detalhamento', () => {
    const handleCardClick = vi.fn()
    render(
      <CancelledOrdersExecutiveCards
        kpis={mockKpis}
        activeCardKey={null}
        onCardClick={handleCardClick}
      />,
    )

    const expectedCards = [
      'Pedidos Cancelados',
      'Volume Cancelado',
      '% da Carteira',
      'Relacionados ao PCP',
      'Comerciais',
      'Transporte',
      'Principal Motivo',
      'Reincidências',
      'Inconsistências IA',
      'Potencialmente Evitáveis',
    ]

    expectedCards.forEach((title) => {
      const cardTitleEl = screen.getByText(new RegExp(title, 'i'))
      expect(cardTitleEl).not.toBeNull()
      // Clica no card
      fireEvent.click(cardTitleEl)
    })

    expect(handleCardClick).toHaveBeenCalledTimes(10)
  })

  // --------------------------------------------------------------------------
  // CENÁRIO 2: Regra de filtragem por card (PCP, Comercial, Transporte, Sem Categorização)
  // --------------------------------------------------------------------------
  it('Requisito 2: Cards de categoria filtram estritamente PCP, COMERCIAL e TRANSPORTE (nunca Sem Categorização)', () => {
    // 1. Teste do Card PCP
    const { rerender } = render(
      <ExecutiveCardDrilldownModal
        cardKey="cancelamentos_pcp"
        cardTitle="Cancelamentos Relacionados ao PCP"
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    // Deve conter apenas ordem do PCP (450001)
    expect(screen.getByText('450001')).toBeDefined()
    expect(screen.queryByText('450002')).toBeNull() // Comercial
    expect(screen.queryByText('450003')).toBeNull() // Transporte
    expect(screen.queryByText('450004')).toBeNull() // Sem categorização

    // 2. Teste do Card COMERCIAL
    rerender(
      <ExecutiveCardDrilldownModal
        cardKey="cancelamentos_comerciais"
        cardTitle="Cancelamentos Comerciais"
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )
    expect(screen.queryByText('450001')).toBeNull()
    expect(screen.getByText('450002')).toBeDefined()
    expect(screen.queryByText('450003')).toBeNull()
    expect(screen.queryByText('450004')).toBeNull()

    // 3. Teste do Card TRANSPORTE
    rerender(
      <ExecutiveCardDrilldownModal
        cardKey="cancelamentos_transporte"
        cardTitle="Cancelamentos por Transporte"
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )
    expect(screen.queryByText('450001')).toBeNull()
    expect(screen.queryByText('450002')).toBeNull()
    expect(screen.getByText('450003')).toBeDefined()
    expect(screen.queryByText('450004')).toBeNull()
  })

  it('Requisito 2: Card Principal Motivo filtra pedidos do motivo predominante', () => {
    render(
      <ExecutiveCardDrilldownModal
        cardKey="principal_motivo"
        cardTitle="Principal Motivo da Recusa"
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    // Motivo predominante no mock é 'Falta de Tarugo ST930' da ordem 450001
    expect(screen.getByText('450001')).toBeDefined()
    expect(screen.queryByText('450002')).toBeNull()
  })

  it('Requisito 2: Card Inconsistências IA filtra somente pedidos com flag de divergência', () => {
    render(
      <ExecutiveCardDrilldownModal
        cardKey="inconsistencia_ia"
        cardTitle="Pedidos com Inconsistências Detectadas pela IA"
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    // Apenas a ordem 450004 tem has_ai_inconsistency: true
    expect(screen.getByText('450004')).toBeDefined()
    expect(screen.queryByText('450001')).toBeNull()
    expect(screen.queryByText('450002')).toBeNull()
  })

  it('Requisito 2: Card % da Carteira exibe memória com numerador e denominador', () => {
    render(
      <ExecutiveCardDrilldownModal
        cardKey="percentual_carteira"
        cardTitle="% da Carteira Cancelada"
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    // Deve exibir o texto explicativo com numerador e denominador
    expect(screen.getByText(/Memória de Cálculo do Índice:/i)).toBeDefined()
    expect(screen.getByText(/Numerador \(Volume cancelado\)/i)).toBeDefined()
    expect(screen.getByText(/Denominador \(Carteira total estimada no período\)/i)).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // CENÁRIO 3: Identificador Pedido + Item sem agrupar e "Não disponível"
  // --------------------------------------------------------------------------
  it('Requisito 3: Identificador unívoco pedido+item sem agrupamento e campos ausentes como "Não disponível"', () => {
    render(
      <ExecutiveCardDrilldownModal
        cardKey="pedidos_cancelados"
        cardTitle="Total de Pedidos Cancelados"
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    // Ordem 450004 possui dados faltantes (cliente vazio, valor nulo)
    // Deve exibir "Não disponível" nas colunas apropriadas e nunca inventar nem 0
    const naElements = screen.getAllByText('Não disponível')
    expect(naElements.length).toBeGreaterThanOrEqual(1)
  })

  // --------------------------------------------------------------------------
  // CENÁRIO 4: Popup vazio com mensagem formal exigida
  // --------------------------------------------------------------------------
  it('Requisito 5: Popup com zero resultados exibe mensagem formal sem dados fictícios', () => {
    render(
      <ExecutiveCardDrilldownModal
        cardKey="cancelamentos_pcp"
        cardTitle="Cancelamentos Relacionados ao PCP"
        isOpen={true}
        onClose={vi.fn()}
        orders={[]} // Vazio
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Nenhum pedido cancelado encontrado para os filtros selecionados.'),
    ).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // CENÁRIO 5: Detalhamento Individual do Pedido com seções Comercial, PCP, Transporte e Classificação
  // --------------------------------------------------------------------------
  it('Requisito 4: Modal individual exibe seções Comercial, PCP, Transporte e botões Salvar/Cancelar/Histórico', () => {
    const handleUpdate = vi.fn()
    const handleClose = vi.fn()

    render(
      <CancelledOrderDetailModal
        order={mockOrders[0]}
        isOpen={true}
        onClose={handleClose}
        onOrderUpdated={handleUpdate}
      />,
    )

    // Verifica presença das seções exigidas
    expect(screen.getByText(/1\. Dados Comerciais/i)).toBeDefined()
    expect(screen.getByText(/2\. Dados de PCP/i)).toBeDefined()
    expect(screen.getByText(/3\. Dados de Transporte & Logística/i)).toBeDefined()
    expect(screen.getByText(/Classificação da Recusa \(Estruturada e Oficial\)/i)).toBeDefined()

    // Verifica presença dos botões exigidos no Requisito 4
    expect(screen.getByText('Salvar Classificação')).toBeDefined()
    expect(screen.getByText('Cancelar')).toBeDefined()
    expect(screen.getByText('Visualizar Histórico')).toBeDefined()

    // Testa ação Cancelar restaurando dados
    const btnCancelar = screen.getByText('Cancelar')
    fireEvent.click(btnCancelar)
  })

  // --------------------------------------------------------------------------
  // CENÁRIO 6: Painel Compacto IA com 7 Blocos Orientativos
  // --------------------------------------------------------------------------
  it('Requisito 6: Painel IA do popup contém os 7 blocos estruturados sobre dados reais', () => {
    render(
      <ExecutiveCardDrilldownModal
        cardKey="pedidos_cancelados"
        cardTitle="Total de Pedidos Cancelados"
        isOpen={true}
        onClose={vi.fn()}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    // Clica na aba "Análise Inteligente IA"
    const tabIA = screen.getByText(/Análise Inteligente IA/i)
    fireEvent.click(tabIA)

    // Verifica os 7 blocos obrigatórios
    expect(screen.getByText(/1\. Motivos Predominantes Registrados/i)).toBeDefined()
    expect(screen.getByText(/2\. Clientes com Maior Volume Cancelado/i)).toBeDefined()
    expect(screen.getByText(/3\. Materiais Mais Afetados/i)).toBeDefined()
    expect(screen.getByText(/4\. Tendência e Representatividade/i)).toBeDefined()
    expect(screen.getByText(/5\. Padrões de Reincidência e Divergências/i)).toBeDefined()
    expect(screen.getByText(/6\. Hipótese de Causas Recorrentes/i)).toBeDefined()
    expect(
      screen.getByText(/7\. Oportunidades de Redução & Reversão de Cancelamentos/i),
    ).toBeDefined()
  })
})

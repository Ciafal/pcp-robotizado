/**
 * Testes de Aceitação: Pedidos em Carteira e Pedidos com Saldos Residuais
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 */

import { describe, it, expect, vi } from 'vitest'
import { PcpPedidosCarteiraService } from '@/services/pcp-pedidos-carteira-service'
import {
  PedidoCarteiraItem,
  ParametrosSaldoResidual,
  PARAMETROS_SALDO_RESIDUAL_PADRAO,
} from '@/types/pcp-pedidos-carteira'
import {
  CARDS_CONFIG_PEDIDOS_CARTEIRA,
  CARDS_CONFIG_SALDOS_RESIDUAIS,
  extratoresCardPedidosCarteira,
  extratoresCardSaldosResiduais,
} from '@/components/carteira-views/drilldown-pedidos'

describe('PcpPedidosCarteiraService - Lógica e Fórmulas de Saldo Residual', () => {
  const itemMock1: PedidoCarteiraItem = {
    id: 'item-1',
    pedido_sap: '4500123456',
    item_sap: '000010',
    codigo_cliente: 'CLI001',
    nome_cliente: 'METALURGICA ABC',
    cliente_codigo: 'CLI001',
    cliente_nome: 'METALURGICA ABC',
    codigo_material: 'ACO-1020-001',
    descricao_material: 'BARRA CHATA 1020 2X1/4',
    material_codigo: 'ACO-1020-001',
    material_descricao: 'BARRA CHATA 1020 2X1/4',
    familia: 'BARRAS CHATAS',
    bitola: '2" X 1/4"',
    centro: '1100',
    linha: 'L1',
    empresa: 'CIAFAL',
    quantidade_original_t: 10.0,
    quantidade_entregue_t: 9.0,
    saldo_aberto_t: 1.0,
    percentual_residual: 10.0, // 1/10 = 10%
    data_pedido: '2026-10-01',
    data_prevista_entrega: '2026-10-15',
    qtd_original_t: 10.0,
    qtd_entregue_t: 9.0,
    data_prevista: '2026-10-15',
    valor_saldo_brl: 5000,
    preco_unitario_brl: 5000,
    valor_original_brl: 50000,
    status: 'ATRASADO',
    dias_atraso: 20,
    tem_atraso: true,
    tem_deficit_estoque: true,
    tem_cobertura_disponivel: false,
    eh_saldo_residual: false,
    estoque_livre_t: 0.2,
    atrasado: true,
    dias_em_atraso: 20,
    deficit_estoque: true,
    cobertura_disponivel: false,
    estoque_disponivel_t: 0.2,
    percentual_saldo: 10.0,
  }

  const itemMock2: PedidoCarteiraItem = {
    id: 'item-2',
    pedido_sap: '4500123457',
    item_sap: '000020',
    codigo_cliente: 'CLI002',
    nome_cliente: 'INDUSTRIA XYZ',
    cliente_codigo: 'CLI002',
    cliente_nome: 'INDUSTRIA XYZ',
    codigo_material: 'ACO-1045-002',
    descricao_material: 'REDONDO 1045 1 POL',
    material_codigo: 'ACO-1045-002',
    material_descricao: 'REDONDO 1045 1 POL',
    familia: 'REDONDOS',
    bitola: '1"',
    centro: '1200',
    linha: 'L2',
    empresa: 'CIAFAL',
    quantidade_original_t: 100.0,
    quantidade_entregue_t: 96.0,
    saldo_aberto_t: 4.0,
    percentual_residual: 4.0, // 4/100 = 4%
    data_pedido: '2026-10-05',
    data_prevista_entrega: '2026-12-01',
    qtd_original_t: 100.0,
    qtd_entregue_t: 96.0,
    data_prevista: '2026-12-01',
    valor_saldo_brl: 24000,
    preco_unitario_brl: 6000,
    valor_original_brl: 600000,
    status: 'ATENDIDO_PARCIAL',
    dias_atraso: 0,
    tem_atraso: false,
    tem_deficit_estoque: false,
    tem_cobertura_disponivel: true,
    eh_saldo_residual: false,
    estoque_livre_t: 10.0,
    atrasado: false,
    dias_em_atraso: 0,
    deficit_estoque: false,
    cobertura_disponivel: true,
    estoque_disponivel_t: 10.0,
    percentual_saldo: 4.0,
  }

  const itemMockGrande: PedidoCarteiraItem = {
    id: 'item-3',
    pedido_sap: '4500123458',
    item_sap: '000010',
    codigo_cliente: 'CLI003',
    nome_cliente: 'GRANDE CLIENTE',
    cliente_codigo: 'CLI003',
    cliente_nome: 'GRANDE CLIENTE',
    codigo_material: 'ACO-1020-003',
    descricao_material: 'PERFIL I 6 POL',
    material_codigo: 'ACO-1020-003',
    material_descricao: 'PERFIL I 6 POL',
    familia: 'PERFIS',
    bitola: '6"',
    centro: '1100',
    linha: 'L1',
    empresa: 'CIAFAL',
    quantidade_original_t: 50.0,
    quantidade_entregue_t: 0.0,
    saldo_aberto_t: 50.0,
    percentual_residual: 100.0,
    data_pedido: '2026-11-01',
    data_prevista_entrega: '2026-11-20',
    qtd_original_t: 50.0,
    qtd_entregue_t: 0.0,
    data_prevista: '2026-11-20',
    valor_saldo_brl: 350000,
    preco_unitario_brl: 7000,
    valor_original_brl: 350000,
    status: 'NOVO',
    dias_atraso: 0,
    tem_atraso: false,
    tem_deficit_estoque: false,
    tem_cobertura_disponivel: false,
    eh_saldo_residual: false,
    estoque_livre_t: 0,
    atrasado: false,
    dias_em_atraso: 0,
    deficit_estoque: false,
    cobertura_disponivel: false,
    estoque_disponivel_t: 0,
    percentual_saldo: 100.0,
  }

  it('deve avaliar corretamente operadores com relação E (AND)', () => {
    // Parâmetros: Saldo <= 2.0 t E Percentual <= 5%
    const paramsE: ParametrosSaldoResidual = {
      operador_saldo: 'MENOR_IGUAL',
      valor_saldo_t: 2.0,
      operador_percentual: 'MENOR_IGUAL',
      valor_percentual: 5.0,
      relacao_logica: 'E',
    }

    // itemMock1: Saldo 1.0 (<= 2) mas % 10.0 (> 5) -> Falso com E
    expect(PcpPedidosCarteiraService.itemAtendeParametros(itemMock1, paramsE)).toBe(false)

    // itemMock2: Saldo 4.0 (> 2) e % 4.0 (<= 5) -> Falso com E
    expect(PcpPedidosCarteiraService.itemAtendeParametros(itemMock2, paramsE)).toBe(false)
  })

  it('deve avaliar corretamente operadores com relação OU (OR)', () => {
    // Exemplo do usuário: Saldo <= 2,00 t OU Percentual <= 5,00%
    const paramsOU: ParametrosSaldoResidual = {
      operador_saldo: 'MENOR_IGUAL',
      valor_saldo_t: 2.0,
      operador_percentual: 'MENOR_IGUAL',
      valor_percentual: 5.0,
      relacao_logica: 'OU',
    }

    // itemMock1: Saldo 1.0 <= 2.0 -> Verdadeiro
    expect(PcpPedidosCarteiraService.itemAtendeParametros(itemMock1, paramsOU)).toBe(true)

    // itemMock2: % 4.0 <= 5.0 -> Verdadeiro
    expect(PcpPedidosCarteiraService.itemAtendeParametros(itemMock2, paramsOU)).toBe(true)

    // itemMockGrande: Saldo 50 e % 100 -> Falso
    expect(PcpPedidosCarteiraService.itemAtendeParametros(itemMockGrande, paramsOU)).toBe(false)
  })

  it('deve tratar divisão por zero de forma segura', () => {
    const itemZero: PedidoCarteiraItem = {
      ...itemMock1,
      quantidade_original_t: 0,
      saldo_aberto_t: 0,
      percentual_residual: 0,
    }

    expect(
      PcpPedidosCarteiraService.itemAtendeParametros(itemZero, PARAMETROS_SALDO_RESIDUAL_PADRAO),
    ).toBe(true)
  })

  it('deve calcular KPIs de Pedidos em Carteira com fidelidade', () => {
    const itens = [itemMock1, itemMock2, itemMockGrande]
    const kpis = PcpPedidosCarteiraService.calcularKpisPedidosCarteira(
      itens,
      PARAMETROS_SALDO_RESIDUAL_PADRAO,
    )

    expect(kpis.total_pedidos).toBe(3)
    expect(kpis.total_itens).toBe(3)
    expect(kpis.quantidade_total_carteira_t).toBe(55.0) // 1.0 + 4.0 + 50.0
    expect(kpis.valor_total_carteira_rs).toBe(379000) // 5000 + 24000 + 350000
    expect(kpis.pedidos_com_atraso).toBe(1)
    expect(kpis.pedidos_com_deficit).toBe(1)
    expect(kpis.pedidos_cobertura_disponivel).toBe(1)
  })

  it('deve calcular KPIs de Saldos Residuais e percentual sobre a carteira', () => {
    const residuais = [itemMock1, itemMock2]
    const todos = [itemMock1, itemMock2, itemMockGrande]

    const kpis = PcpPedidosCarteiraService.calcularKpisSaldosResiduais(residuais, todos)

    expect(kpis.total_pedidos).toBe(2)
    expect(kpis.total_itens).toBe(2)
    expect(kpis.saldo_total_t).toBe(5.0) // 1.0 + 4.0
    expect(kpis.valor_total_rs).toBe(29000) // 5000 + 24000
    expect(kpis.pedidos_vencidos).toBe(1)
    // 5.0 / 55.0 = 9.09%
    expect(kpis.percentual_carteira_total).toBeCloseTo(9.09, 1)
  })

  it('deve gerar análise de IA consistente sem inventar dados', () => {
    const analise = PcpPedidosCarteiraService.gerarAnaliseIaResiduais([itemMock1, itemMock2])

    expect(analise.qtd_total_residuais).toBe(2)
    expect(analise.saldo_total_t).toBe(5.0)
    expect(analise.valor_total_rs).toBe(29000)
    expect(analise.pedidos_vencidos).toBe(1)
    expect(analise.clientes_concentracao.length).toBeGreaterThan(0)
    expect(analise.recomendacoes_comerciais.length).toBeGreaterThan(0)
  })
})

describe('Drill-down de Cards de Pedidos em Carteira e Saldos Residuais', () => {
  it('deve possuir 8 cards configurados para Pedidos em Carteira e 7 para Saldos Residuais', () => {
    expect(CARDS_CONFIG_PEDIDOS_CARTEIRA.length).toBe(8)
    expect(CARDS_CONFIG_SALDOS_RESIDUAIS.length).toBe(7)
  })

  it('deve possuir extrator cadastrado para cada um dos 8 cards de Pedidos em Carteira', () => {
    CARDS_CONFIG_PEDIDOS_CARTEIRA.forEach((c) => {
      expect(extratoresCardPedidosCarteira[c.id]).toBeDefined()
    })
  })

  it('deve possuir extrator cadastrado para cada um dos 7 cards de Saldos Residuais', () => {
    CARDS_CONFIG_SALDOS_RESIDUAIS.forEach((c) => {
      expect(extratoresCardSaldosResiduais[c.id]).toBeDefined()
    })
  })
})

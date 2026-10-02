import { describe, it, expect, vi, beforeEach } from 'vitest'
import { carteiraMinimaService } from '@/services/carteira-minima-service'
import {
  comercialComunicadoService,
  USUARIOS_CORPORATIVOS_HUB,
  gerarChaveItem,
} from '@/services/comercial-comunicado-service'
import { CarteiraMinimaItem } from '@/types/carteira-minima'
import { DestinatarioHub } from '@/types/comercial-comunicado'

describe('Motor de Cálculo e Regras da Carteira Mínima Não Atingida', () => {
  const item1: CarteiraMinimaItem = {
    id: 'cm_01',
    material: 'C352DIN30470C',
    descricao_material: 'BARRA CHATA 35X2 DIN 304',
    pedido_venda: '251967',
    item_pedido: '10',
    pedido_formatado: '251967 / 10',
    carteira_tons: 15.5,
    estoque_livre_tons: 5.683,
    saldo_produzir_tons: 9.817,
    producao_minima_tons: 30.0,
    diferenca_minimo_tons: 20.183,
    percentual_atingido: 32.7,
    data_desejada: '2026-09-30',
    centro: '1100',
    linha: 'L1',
    criticidade: 'Crítico',
    empresa: 'CIAFAL',
    cliente_nome: 'METALÚRGICA SUL',
  }

  const item2: CarteiraMinimaItem = {
    id: 'cm_02',
    material: 'TB50X50X300',
    descricao_material: 'TUBO QUADRADO 50X50',
    pedido_venda: '252110',
    item_pedido: '20',
    pedido_formatado: '252110 / 20',
    carteira_tons: 25.0,
    estoque_livre_tons: 5.0,
    saldo_produzir_tons: 20.0,
    producao_minima_tons: 35.0,
    diferenca_minimo_tons: 15.0,
    percentual_atingido: 57.1,
    data_desejada: '2026-10-15',
    centro: '1100',
    linha: 'L2',
    criticidade: 'Atenção',
    empresa: 'CIAFAL',
    cliente_nome: 'INDUSTRIA ABC',
  }

  const item3: CarteiraMinimaItem = {
    id: 'cm_03',
    material: 'RD100DIN',
    descricao_material: 'BARRA REDONDA 100MM',
    pedido_venda: '253000',
    item_pedido: '10',
    pedido_formatado: '253000 / 10',
    carteira_tons: 40.0,
    estoque_livre_tons: 5.0,
    saldo_produzir_tons: 35.0,
    producao_minima_tons: 40.0,
    diferenca_minimo_tons: 5.0,
    percentual_atingido: 87.5,
    data_desejada: '2026-11-01',
    centro: '1200',
    linha: 'L1',
    criticidade: 'Normal',
    empresa: 'CIAFAL',
    cliente_nome: 'COMERCIO FERRO LTDA',
  }

  it('deve calcular o saldo a produzir estritamente como carteira − estoque livre', () => {
    // Regra fundamental: saldo = carteira - estoque
    const saldo1 = Number((item1.carteira_tons - item1.estoque_livre_tons).toFixed(3))
    expect(saldo1).toBe(9.817)
    expect(item1.saldo_produzir_tons).toBe(saldo1)

    const saldo2 = item2.carteira_tons - item2.estoque_livre_tons
    expect(saldo2).toBe(20.0)
    expect(item2.saldo_produzir_tons).toBe(saldo2)
  })

  it('deve calcular KPIs consolidados corretamente (total de itens, toneladas em risco e média)', () => {
    const kpis = carteiraMinimaService.calcularKpis([item1, item2, item3])
    expect(kpis.totalItensAbaixoMinimo).toBe(3)
    expect(kpis.totalItensCriticos).toBe(1)
    expect(kpis.totalItensAtencao).toBe(1)
    expect(kpis.totalItensNormais).toBe(1)

    // Soma dos saldos: 9.817 + 20.0 + 35.0 = 64.817
    expect(kpis.totalSaldoProduzirTons).toBeCloseTo(64.817, 3)

    // Soma das diferenças: 20.183 + 15.0 + 5.0 = 40.183
    expect(kpis.totalDiferencaTons).toBeCloseTo(40.183, 3)
  })

  it('deve gerar chave do item de forma canônica e determinística', () => {
    const chave1 = gerarChaveItem(item1)
    expect(chave1).toBe('251967_10_C352DIN30470C')

    const chave2 = gerarChaveItem(item2)
    expect(chave2).toBe('252110_20_TB50X50X300')
  })
})

describe('Serviço de Comunicado ao Comercial — Regras de Negócio', () => {
  const itemCritico: CarteiraMinimaItem = {
    id: 'cm_crit',
    material: 'C352DIN30470C',
    descricao_material: 'BARRA CHATA 35X2 DIN 304',
    pedido_venda: '251967',
    item_pedido: '10',
    pedido_formatado: '251967 / 10',
    carteira_tons: 15.5,
    estoque_livre_tons: 5.683,
    saldo_produzir_tons: 9.817,
    producao_minima_tons: 30.0,
    diferenca_minimo_tons: 20.183,
    percentual_atingido: 32.7,
    data_desejada: '2026-09-30',
    centro: '1100',
    linha: 'L1',
    criticidade: 'Crítico',
  }

  const itemNormal: CarteiraMinimaItem = {
    id: 'cm_norm',
    material: 'BARRA_NORM',
    descricao_material: 'BARRA NORMAL',
    pedido_venda: '300100',
    item_pedido: '10',
    pedido_formatado: '300100 / 10',
    carteira_tons: 20.0,
    estoque_livre_tons: 5.0,
    saldo_produzir_tons: 15.0,
    producao_minima_tons: 20.0,
    diferenca_minimo_tons: 5.0,
    percentual_atingido: 75.0,
    data_desejada: '2026-12-01',
    centro: '1100',
    linha: 'L1',
    criticidade: 'Normal',
  }

  it('deve sugerir prioridade Crítica quando pelo menos um item selecionado for Crítico', () => {
    const prioridade = comercialComunicadoService.sugerirPrioridade([itemNormal, itemCritico])
    expect(prioridade).toBe('Crítica')
  })

  it('deve sugerir prioridade Normal quando todos forem normais', () => {
    const prioridade = comercialComunicadoService.sugerirPrioridade([itemNormal])
    expect(prioridade).toBe('Normal')
  })

  it('deve gerar assunto padrão no formato "PCP | Carteira mínima não atingida | [quantidade] item(ns)"', () => {
    const ass1 = comercialComunicadoService.gerarAssuntoPadrao(1)
    expect(ass1).toBe('PCP | Carteira mínima não atingida | 1 item')

    const ass3 = comercialComunicadoService.gerarAssuntoPadrao(3)
    expect(ass3).toBe('PCP | Carteira mínima não atingida | 3 itens')
  })

  it('deve gerar mensagem consolidada contendo materiais, pedidos, saldo e produção mínima com números reais', () => {
    const msg = comercialComunicadoService.gerarMensagemConsolidada([itemCritico])
    expect(msg).toContain('C352DIN30470C')
    expect(msg).toContain('251967 / 10')
    expect(msg).toContain('9,817 t')
    expect(msg).toContain('30,000 t')
    expect(msg).toContain('30/09/2026')
    expect(msg).toContain('Identificamos 1 item com carteira abaixo da quantidade mínima')
  })

  it('deve aprimorar texto com IA mantendo estritamente todos os dados de negócio', () => {
    const textoOriginal = comercialComunicadoService.gerarMensagemConsolidada([itemCritico])
    const textoIa = comercialComunicadoService.melhorarTextoComIa(
      textoOriginal,
      [itemCritico],
      'Crítica',
    )

    // Deve manter os dados de negócio intactos
    expect(textoIa).toContain('C352DIN30470C')
    expect(textoIa).toContain('251967 / 10')
    expect(textoIa).toContain('9,817 t')
    expect(textoIa).toContain('30,000 t')
    expect(textoIa).toContain('30/09/2026')
    expect(textoIa).toContain('CRÍTICA')
  })

  it('deve sugerir destinatários da área Comercial do HUB corporativo', () => {
    const todos = USUARIOS_CORPORATIVOS_HUB
    const sugeridos = comercialComunicadoService.sugerirDestinatarios([itemCritico], todos)

    expect(sugeridos.length).toBeGreaterThan(0)
    expect(sugeridos.some((s) => s.sector === 'Comercial' || s.grupo?.includes('Comercial'))).toBe(
      true,
    )
  })

  it('deve rejeitar envio sem destinatários ou sem itens', async () => {
    await expect(
      comercialComunicadoService.enviarComunicadoAoComercial({
        itens: [],
        assunto: 'Assunto teste',
        mensagem: 'Mensagem teste',
        prioridade: 'Normal',
        destinos: ['COMERCIAL_HUB'],
        destinatarios: [USUARIOS_CORPORATIVOS_HUB[0]],
      }),
    ).rejects.toThrow('Selecione pelo menos 1 item')

    await expect(
      comercialComunicadoService.enviarComunicadoAoComercial({
        itens: [itemCritico],
        assunto: 'Assunto teste',
        mensagem: 'Mensagem teste',
        prioridade: 'Normal',
        destinos: ['COMERCIAL_HUB'],
        destinatarios: [],
      }),
    ).rejects.toThrow('Selecione pelo menos 1 destinatário corporativo')
  })

  it('deve gerar número sequencial no padrão COM-PCP-000001/2026 e realizar envio com sucesso', async () => {
    const resultado = await comercialComunicadoService.enviarComunicadoAoComercial({
      itens: [itemCritico],
      assunto: 'PCP | Carteira mínima não atingida | 1 item',
      mensagem: 'Mensagem teste completa de auditoria',
      prioridade: 'Crítica',
      destinos: ['COMERCIAL_HUB', 'MEU_DIA'],
      dataMeuDia: '30/09/2026',
      destinatarios: [USUARIOS_CORPORATIVOS_HUB[0]],
    })

    expect(resultado.success).toBe(true)
    expect(resultado.numeroSequencial).toMatch(/^COM-PCP-\d{6}\/\d{4}$/)
    expect(resultado.itensEnviadosCount).toBe(1)
    expect(resultado.destinatariosCount).toBe(1)
    expect(resultado.destinosTexto).toBe('Comercial + Meu Dia')

    // O status do item deve mudar para "Enviado"
    const statusItem = await comercialComunicadoService.verificarItemJaEnviado(itemCritico)
    expect(statusItem).not.toBeNull()
    expect(statusItem?.status).toBe('Enviado')
    expect(statusItem?.total_envios).toBeGreaterThanOrEqual(1)
    expect(statusItem?.ultimo_comunicado_numero).toBe(resultado.numeroSequencial)
  })

  it('deve permitir reenvio sem bloqueio e registrar no histórico', async () => {
    // Primeiro envio já feito no teste anterior; segundo envio
    const res2 = await comercialComunicadoService.enviarComunicadoAoComercial({
      itens: [itemCritico],
      assunto: 'PCP | Reenvio | 1 item',
      mensagem: 'Reenvio de cobrança urgente',
      prioridade: 'Crítica',
      destinos: ['COMERCIAL_HUB'],
      destinatarios: [USUARIOS_CORPORATIVOS_HUB[0], USUARIOS_CORPORATIVOS_HUB[1]],
      ehReenvioConfirmado: true,
    })

    expect(res2.success).toBe(true)
    const statusItem2 = await comercialComunicadoService.verificarItemJaEnviado(itemCritico)
    expect(statusItem2?.total_envios).toBeGreaterThanOrEqual(2)
    expect(statusItem2?.historico_envios_json.length).toBeGreaterThanOrEqual(2)
  })
})

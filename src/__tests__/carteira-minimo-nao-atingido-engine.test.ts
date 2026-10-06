import { describe, it, expect } from 'vitest'
import {
  calcularMinimoNaoAtingido,
  resolverMinimoNecessario,
  classificarStatusMinimo,
  round2,
  formatPtBr,
} from '@/services/carteira-minimo-nao-atingido-engine'
import { CarteiraItem } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'

describe('Motor de Mínimo Não Atingido - Cenários Obrigatórios A, B, C, D e E', () => {
  /**
   * CENÁRIO A:
   * Carteira 8,00 t / mínimo 15,00 t → não atingido, déficit 7,00 t
   */
  it('CENÁRIO A: carteira 8,00 t / mínimo 15,00 t → não atingido, déficit 7,00 t', () => {
    const itemA: Partial<CarteiraItem> = {
      codigo_material: 'MAT-TESTE-A',
      descricao_material: 'Perfil Teste Cenário A',
      centro: '1100',
      linha: 'LINHA-PADRAO',
      carteira_aberta_tons: 8.0,
      estoque_livre_tons: 0,
      qtd_programada_tons: 0,
      nome_cliente: 'Cliente Alpha',
      ordem_venda: '4500000001',
      item_ordem: '10',
      curva_abc: 'B',
    }

    const resultado = calcularMinimoNaoAtingido({
      itens: [itemA as CarteiraItem],
      tipoVisao: 'Geral',
      context: {
        regraFallbackMinimoTons: 15.0,
      },
    })

    expect(resultado.total_materiais).toBe(1)
    expect(resultado.total_deficit_tons).toBe(7.0)
    expect(resultado.card_principal_texto).toBe('1 item')
    expect(resultado.card_adicional_texto).toBe('Déficit para mínimo: 7,00 t')

    const item = resultado.itens[0]
    expect(item.codigo_material).toBe('MAT-TESTE-A')
    expect(item.carteira_tons).toBe(8.0)
    expect(item.minimo_necessario_tons).toBe(15.0)
    expect(item.deficit_tons).toBe(7.0)
    expect(item.deficit_formatado).toBe('Faltam 7,00 t para atingir o mínimo')
  })

  /**
   * CENÁRIO B:
   * Carteira 15,00 t / mínimo 15,00 t → atingido, fora do card
   */
  it('CENÁRIO B: 15,00 t / 15,00 t → atingido, fora do card', () => {
    const itemB: Partial<CarteiraItem> = {
      codigo_material: 'MAT-TESTE-B',
      descricao_material: 'Perfil Teste Cenário B',
      centro: '1100',
      linha: 'LINHA-PADRAO',
      carteira_aberta_tons: 15.0,
      estoque_livre_tons: 0,
      qtd_programada_tons: 0,
      nome_cliente: 'Cliente Beta',
      ordem_venda: '4500000002',
      item_ordem: '10',
      curva_abc: 'A',
    }

    const resultado = calcularMinimoNaoAtingido({
      itens: [itemB as CarteiraItem],
      tipoVisao: 'Geral',
      context: {
        regraFallbackMinimoTons: 15.0,
      },
    })

    expect(resultado.total_materiais).toBe(0)
    expect(resultado.total_deficit_tons).toBe(0)
    expect(resultado.card_principal_texto).toBe('0 itens')
    expect(resultado.card_adicional_texto).toBe('Déficit para mínimo: 0,00 t')
    expect(resultado.itens.length).toBe(0)
  })

  /**
   * CENÁRIO C:
   * Carteira 18,00 t / mínimo 15,00 t → atingido, fora do card
   */
  it('CENÁRIO C: 18,00 t / 15,00 t → atingido, fora do card', () => {
    const itemC: Partial<CarteiraItem> = {
      codigo_material: 'MAT-TESTE-C',
      descricao_material: 'Perfil Teste Cenário C',
      centro: '1100',
      linha: 'LINHA-PADRAO',
      carteira_aberta_tons: 18.0,
      estoque_livre_tons: 0,
      qtd_programada_tons: 0,
      nome_cliente: 'Cliente Gamma',
      ordem_venda: '4500000003',
      item_ordem: '10',
      curva_abc: 'A',
    }

    const resultado = calcularMinimoNaoAtingido({
      itens: [itemC as CarteiraItem],
      tipoVisao: 'Geral',
      context: {
        regraFallbackMinimoTons: 15.0,
      },
    })

    expect(resultado.total_materiais).toBe(0)
    expect(resultado.total_deficit_tons).toBe(0)
    expect(resultado.itens.length).toBe(0)
  })

  /**
   * CENÁRIO D:
   * Pedidos 4 + 5 + 3 t mesmo material/centro → 1 material, déficit 3,00 t (não 3 itens)
   */
  it('CENÁRIO D: pedidos 4+5+3 t mesmo material/centro → 1 material, déficit 3,00 t (não 3 itens)', () => {
    const pedidosD: Partial<CarteiraItem>[] = [
      {
        codigo_material: 'MAT-AGRUPADO-D',
        descricao_material: 'Cantoneira 2"x1/4" Laminada',
        centro: '1100',
        linha: 'L1',
        carteira_aberta_tons: 4.0,
        estoque_livre_tons: 0,
        qtd_programada_tons: 0,
        nome_cliente: 'Cliente Sul 1',
        ordem_venda: '4500000101',
        item_ordem: '10',
        curva_abc: 'B',
      },
      {
        codigo_material: 'MAT-AGRUPADO-D',
        descricao_material: 'Cantoneira 2"x1/4" Laminada',
        centro: '1100',
        linha: 'L1',
        carteira_aberta_tons: 5.0,
        estoque_livre_tons: 0,
        qtd_programada_tons: 0,
        nome_cliente: 'Cliente Sul 2',
        ordem_venda: '4500000102',
        item_ordem: '10',
        curva_abc: 'B',
      },
      {
        codigo_material: 'MAT-AGRUPADO-D',
        descricao_material: 'Cantoneira 2"x1/4" Laminada',
        centro: '1100',
        linha: 'L1',
        carteira_aberta_tons: 3.0,
        estoque_livre_tons: 0,
        qtd_programada_tons: 0,
        nome_cliente: 'Cliente Sul 3',
        ordem_venda: '4500000103',
        item_ordem: '10',
        curva_abc: 'B',
      },
    ]

    const resultado = calcularMinimoNaoAtingido({
      itens: pedidosD as CarteiraItem[],
      tipoVisao: 'Geral',
      context: {
        // Fixando mínimo de 15,00 t para teste da consolidação
        lineMinBatchSizes: { L1: 15.0 },
      },
    })

    // Garante que NÃO contou 3 itens isolados, mas exatamente 1 material consolidado!
    expect(resultado.total_materiais).toBe(1)
    expect(resultado.card_principal_texto).toBe('1 item')
    expect(resultado.itens[0].pedidos_count).toBe(3)
    expect(resultado.itens[0].carteira_tons).toBe(12.0) // 4 + 5 + 3 = 12 t
    expect(resultado.itens[0].minimo_necessario_tons).toBe(15.0)
    expect(resultado.itens[0].deficit_tons).toBe(3.0) // 15 - 12 = 3 t
    expect(resultado.total_deficit_tons).toBe(3.0)
  })

  /**
   * CENÁRIO E:
   * Item sai do card automaticamente ao atingir o mínimo (12,00 t + 3,50 t = 15,50 t)
   */
  it('CENÁRIO E: item sai do card automaticamente ao atingir o mínimo (12,00 t + 3,50 t = 15,50 t)', () => {
    // Estado inicial: 12,00 t contra mínimo de 15,00 t (está no card com déficit 3,00 t)
    const pedidoInicial: Partial<CarteiraItem>[] = [
      {
        codigo_material: 'MAT-DINAMICO-E',
        descricao_material: 'Barra Redonda 1" 1045',
        centro: '1100',
        linha: 'L2',
        carteira_aberta_tons: 12.0,
        estoque_livre_tons: 0,
        qtd_programada_tons: 0,
        nome_cliente: 'Indústria Mecânica A',
        ordem_venda: '4500000201',
        item_ordem: '10',
      },
    ]

    const antes = calcularMinimoNaoAtingido({
      itens: pedidoInicial as CarteiraItem[],
      tipoVisao: 'L2',
      context: {
        lineMinBatchSizes: { L2: 15.0 },
      },
    })

    expect(antes.total_materiais).toBe(1)
    expect(antes.total_deficit_tons).toBe(3.0)

    // Entrada de novo pedido de 3,50 t do mesmo material
    const pedidoAdicional: Partial<CarteiraItem> = {
      codigo_material: 'MAT-DINAMICO-E',
      descricao_material: 'Barra Redonda 1" 1045',
      centro: '1100',
      linha: 'L2',
      carteira_aberta_tons: 3.5,
      estoque_livre_tons: 0,
      qtd_programada_tons: 0,
      nome_cliente: 'Indústria Mecânica B',
      ordem_venda: '4500000202',
      item_ordem: '10',
    }

    const carteiraAtualizada = [...pedidoInicial, pedidoAdicional] as CarteiraItem[]

    // Recálculo reativo da função central
    const depois = calcularMinimoNaoAtingido({
      itens: carteiraAtualizada,
      tipoVisao: 'L2',
      context: {
        lineMinBatchSizes: { L2: 15.0 },
      },
    })

    // Soma = 12 + 3.5 = 15.50 t > 15.00 t => déficit <= 0 => SAI AUTOMATICAMENTE DO CARD!
    expect(depois.total_materiais).toBe(0)
    expect(depois.total_deficit_tons).toBe(0)
    expect(depois.itens.length).toBe(0)
  })

  /**
   * TESTE ADICIONAL DE CONSISTÊNCIA NAS 5 VISÕES
   */
  it('Segmentação consistente nas 5 visões (Geral, L1, L2, MTO e SDC)', () => {
    const itensMix: Array<Partial<CarteiraItem>> = [
      // Item L1
      {
        codigo_material: 'C1020-001',
        descricao_material: 'Cantoneira L1',
        centro: '1100',
        linha: 'L1',
        carteira_aberta_tons: 5.0,
        tipo_ordem: 'MTS',
      },
      // Item L2
      {
        codigo_material: 'R1045-001',
        descricao_material: 'Redondo L2',
        centro: '1100',
        linha: 'L2',
        carteira_aberta_tons: 6.0,
        tipo_ordem: 'MTS',
      },
      // Item MTO
      {
        codigo_material: 'MTO-ESPECIAL',
        descricao_material: 'Especial Sob Encomenda',
        centro: '1100',
        linha: 'L1',
        carteira_aberta_tons: 7.0,
        tipo_ordem: 'MTO',
      },
    ]

    const itemSDC: Partial<CarteiraSDCItem> = {
      material: 'SDC-PERFIL-01',
      descricao: 'Perfil Especial Sidercentro',
      centro_sap: 'SDPL',
      origem_producao: 'Sidercentro',
      carteira_t: 10.0,
      estoque_total_t: 0,
    }

    const todos = [...(itensMix as CarteiraItem[]), itemSDC as unknown as CarteiraItem]

    const ctx = {
      lineMinBatchSizes: { L1: 15.0, L2: 15.0, SDC: 20.0 },
      regraFallbackMinimoTons: 15.0,
    }

    // 1. Visão Geral (consolida tudo)
    const resGeral = calcularMinimoNaoAtingido({ itens: todos, tipoVisao: 'Geral', context: ctx })
    expect(resGeral.total_materiais).toBe(4)

    // 2. Visão L1
    const resL1 = calcularMinimoNaoAtingido({ itens: todos, tipoVisao: 'L1', context: ctx })
    expect(resL1.total_materiais).toBe(2) // C1020-001 e MTO-ESPECIAL (ambos linha L1)

    // 3. Visão L2
    const resL2 = calcularMinimoNaoAtingido({ itens: todos, tipoVisao: 'L2', context: ctx })
    expect(resL2.total_materiais).toBe(1) // R1045-001

    // 4. Visão MTO
    const resMTO = calcularMinimoNaoAtingido({ itens: todos, tipoVisao: 'MTO', context: ctx })
    expect(resMTO.total_materiais).toBe(1) // MTO-ESPECIAL
    expect(resMTO.itens[0].codigo_material).toBe('MTO-ESPECIAL')

    // 5. Visão SDC
    const resSDC = calcularMinimoNaoAtingido({
      itens: [itemSDC as CarteiraSDCItem],
      tipoVisao: 'SDC',
      context: ctx,
    })
    expect(resSDC.total_materiais).toBe(1)
    expect(resSDC.itens[0].codigo_material).toBe('SDC-PERFIL-01')
    expect(resSDC.itens[0].minimo_necessario_tons).toBe(20.0)
    expect(resSDC.itens[0].deficit_tons).toBe(10.0)
  })

  /**
   * TESTE DA CADEIA DE PRECEDÊNCIA
   */
  it('Cadeia de precedência de resolução do lote mínimo', () => {
    // Nível 1: Restrição de bitola ativa por linha
    const r1 = resolverMinimoNecessario({
      material: 'BIT-001',
      linha: 'L1',
      centro: '1100',
      context: {
        activeGaugeRestrictions: [
          {
            id: 'rule-1',
            line_code: 'L1',
            min_value: 25.0,
            unit_of_measure: 't',
            status: 'ATIVA',
            restriction_type: 'QUANTIDADE',
            rule_description: 'Bitola Pesada Lote 25t',
          } as any,
        ],
        lineMinBatchSizes: { L1: 15.0 },
      },
    })
    expect(r1.minimoTons).toBe(25.0)
    expect(r1.fonte).toContain('Restrição de Bitola')

    // Nível 2: min_batch_size da Ficha Mestra
    const r2 = resolverMinimoNecessario({
      material: 'MAT-002',
      linha: 'L2',
      centro: '1100',
      context: {
        lineMinBatchSizes: { L2: 35.0 },
      },
    })
    expect(r2.minimoTons).toBe(35.0)
    expect(r2.fonte).toContain('Ficha Mestra Linha L2')

    // Nível 3: Regras centrais (RULE_LM_L1 com 3h @ 22.5 t/h)
    const r3 = resolverMinimoNecessario({
      material: 'MAT-003',
      linha: 'L1',
      centro: '1100',
    })
    expect(r3.minimoTons).toBeGreaterThan(0)
    expect(r3.fonte).toContain('RULE_LM_L1')

    // Nível 4: Fallback padrão industrial
    const r4 = resolverMinimoNecessario({
      material: 'OUTRO',
      linha: 'GERAL',
      centro: '1100',
      context: {
        regraFallbackMinimoTons: 15.0,
      },
    })
    expect(r4.minimoTons).toBe(15.0)
    expect(r4.fonte).toContain('RFC Z_RFC_CARTEIRA_MINIMA_PROD')
  })

  /**
   * TESTE DE FORMATAÇÃO E STATUS
   */
  it('Padrão pt-BR e classificação de criticidade', () => {
    expect(formatPtBr(42.5)).toBe('42,50')
    expect(formatPtBr(125450.0)).toBe('125.450,00')

    const statCritico = classificarStatusMinimo({
      qtdConsideradaTons: 3.0,
      minimoNecessarioTons: 15.0,
      deficitTons: 12.0,
      diasRestantes: 2,
    })
    expect(statCritico.status).toBe('Crítico')

    const statProximo = classificarStatusMinimo({
      qtdConsideradaTons: 12.0,
      minimoNecessarioTons: 15.0,
      deficitTons: 3.0,
      diasRestantes: 15,
    })
    expect(statProximo.status).toBe('Próximo do mínimo')

    const statAguardando = classificarStatusMinimo({
      qtdConsideradaTons: 5.0,
      minimoNecessarioTons: 15.0,
      deficitTons: 10.0,
      diasRestantes: 20,
    })
    expect(statAguardando.status).toBe('Aguardando composição de lote')
  })
})

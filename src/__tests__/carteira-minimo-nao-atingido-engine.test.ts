import { describe, it, expect, beforeEach } from 'vitest'
import {
  calcularMinimoNaoAtingido,
  normalizarCodigoMaterialSap,
  consultarLoteMinimoOficialSap,
  formatarDataHoraPtBr,
  formatarToneladasPtBr,
} from '@/services/carteira-minimo-nao-atingido-engine'
import {
  SapMaterialLoteMinimoRecord,
  sapMaterialLoteMinimoService,
} from '@/services/sap-material-lote-minimo-service'
import { CarteiraItem } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'

describe('Motor de Mínimo Não Atingido - Regra Oficial SAP RFC por Código de Material', () => {
  beforeEach(() => {
    sapMaterialLoteMinimoService.clearMemoryCache()
  })

  /**
   * CENÁRIO A:
   * Carteira 8,00 t / mínimo 15,00 t (da réplica SAP) → não atingido, déficit 7,00 t
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

    const replicaSap = new Map<string, SapMaterialLoteMinimoRecord>([
      [
        'MAT-TESTE-A',
        {
          id: 'rec-a',
          codigo_material: 'MAT-TESTE-A',
          lote_minimo: 15.0,
          origem: 'SAP / RFC',
          last_sync: '2026-03-30T10:00:00.000Z',
          unidade_medida: 't',
        },
      ],
    ])

    const resultado = calcularMinimoNaoAtingido({
      itens: [itemA as CarteiraItem],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaSap,
    })

    expect(resultado.total_materiais_abaixo_minimo).toBe(1)
    expect(resultado.total_toneladas_faltantes).toBe(7.0)
    expect(resultado.total_toneladas_carteira_afetada).toBe(8.0)

    const item = resultado.materiais_abaixo[0]
    expect(item.codigo_material).toBe('MAT-TESTE-A')
    expect(item.quantidade_consolidada_tons).toBe(8.0)
    expect(item.lote_minimo_tons).toBe(15.0)
    expect(item.falta_para_minimo_tons).toBe(7.0)
    expect(item.status_lote).toBe('MINIMO_NAO_ATINGIDO')
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

    const replicaSap = new Map<string, SapMaterialLoteMinimoRecord>([
      [
        'MAT-TESTE-B',
        {
          id: 'rec-b',
          codigo_material: 'MAT-TESTE-B',
          lote_minimo: 15.0,
          origem: 'SAP / RFC',
          last_sync: '2026-03-30T10:00:00.000Z',
          unidade_medida: 't',
        },
      ],
    ])

    const resultado = calcularMinimoNaoAtingido({
      itens: [itemB as CarteiraItem],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaSap,
    })

    expect(resultado.total_materiais_abaixo_minimo).toBe(0)
    expect(resultado.total_toneladas_faltantes).toBe(0)
    expect(resultado.materiais_abaixo.length).toBe(0)
    expect(resultado.total_materiais_atingidos).toBe(1)
    expect(resultado.materiais_atingidos[0].codigo_material).toBe('MAT-TESTE-B')
    expect(resultado.materiais_atingidos[0].status_lote).toBe('MINIMO_ATINGIDO')
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

    const replicaSap = new Map<string, SapMaterialLoteMinimoRecord>([
      [
        'MAT-TESTE-C',
        {
          id: 'rec-c',
          codigo_material: 'MAT-TESTE-C',
          lote_minimo: 15.0,
          origem: 'SAP / RFC',
          last_sync: '2026-03-30T10:00:00.000Z',
          unidade_medida: 't',
        },
      ],
    ])

    const resultado = calcularMinimoNaoAtingido({
      itens: [itemC as CarteiraItem],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaSap,
    })

    expect(resultado.total_materiais_abaixo_minimo).toBe(0)
    expect(resultado.total_toneladas_faltantes).toBe(0)
    expect(resultado.materiais_abaixo.length).toBe(0)
    expect(resultado.total_materiais_atingidos).toBe(1)
  })

  /**
   * CENÁRIO D:
   * Pedidos 4 + 5 + 3 t mesmo material/centro → 1 material consolidado (12,00 t), déficit 3,00 t (não 3 itens)
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

    const replicaSap = new Map<string, SapMaterialLoteMinimoRecord>([
      [
        'MAT-AGRUPADO-D',
        {
          id: 'rec-d',
          codigo_material: 'MAT-AGRUPADO-D',
          lote_minimo: 15.0,
          origem: 'SAP / RFC',
          unidade_medida: 't',
        },
      ],
    ])

    const resultado = calcularMinimoNaoAtingido({
      itens: pedidosD as CarteiraItem[],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaSap,
    })

    // Garante que NÃO contou 3 ocorrências isoladas, mas exatamente 1 material consolidado!
    expect(resultado.total_materiais_abaixo_minimo).toBe(1)
    expect(resultado.materiais_abaixo[0].pedidos_consolidados_count).toBe(3)
    expect(resultado.materiais_abaixo[0].quantidade_consolidada_tons).toBe(12.0) // 4 + 5 + 3 = 12 t
    expect(resultado.materiais_abaixo[0].lote_minimo_tons).toBe(15.0)
    expect(resultado.materiais_abaixo[0].falta_para_minimo_tons).toBe(3.0) // 15 - 12 = 3 t
    expect(resultado.total_toneladas_faltantes).toBe(3.0)
  })

  /**
   * CENÁRIO E:
   * Item sai do card automaticamente ao atingir o mínimo (12,00 t + 3,50 t = 15,50 t)
   */
  it('CENÁRIO E: item sai do card automaticamente ao atingir o mínimo (12,00 t + 3,50 t = 15,50 t)', () => {
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

    const replicaSap = new Map<string, SapMaterialLoteMinimoRecord>([
      [
        'MAT-DINAMICO-E',
        {
          id: 'rec-e',
          codigo_material: 'MAT-DINAMICO-E',
          lote_minimo: 15.0,
          origem: 'SAP / RFC',
          unidade_medida: 't',
        },
      ],
    ])

    const antes = calcularMinimoNaoAtingido({
      itens: pedidoInicial as CarteiraItem[],
      tipoVisao: 'L2',
      replicaSapPorCodigo: replicaSap,
    })

    expect(antes.total_materiais_abaixo_minimo).toBe(1)
    expect(antes.total_toneladas_faltantes).toBe(3.0)

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
      replicaSapPorCodigo: replicaSap,
    })

    // Soma = 12 + 3.5 = 15.50 t >= 15.00 t => falta_para_minimo = 0 => SAI AUTOMATICAMENTE DO CARD DE NÃO ATINGIDOS!
    expect(depois.total_materiais_abaixo_minimo).toBe(0)
    expect(depois.total_toneladas_faltantes).toBe(0)
    expect(depois.materiais_abaixo.length).toBe(0)
    expect(depois.total_materiais_atingidos).toBe(1)
    expect(depois.materiais_atingidos[0].codigo_material).toBe('MAT-DINAMICO-E')
    expect(depois.materiais_atingidos[0].quantidade_consolidada_tons).toBe(15.5)
  })

  /**
   * TESTE DE ATUALIZAÇÃO DA RÉPLICA: 15,00 t → 18,00 t COM ORIGEM "Integração SAP RFC"
   * Verifica a evolução dinâmica do lote mínimo via ingestão/sincronização RFC SAP
   */
  it('TESTE DE ATUALIZAÇÃO DA RÉPLICA: 15,00 t → 18,00 t com origem "Integração SAP RFC"', () => {
    // 1. Estado inicial na réplica: material MAT-RFC-SYNC com 15,00 t
    const replicaInicial = new Map<string, SapMaterialLoteMinimoRecord>([
      [
        'MAT-RFC-SYNC',
        {
          id: 'rec-sync-1',
          codigo_material: 'MAT-RFC-SYNC',
          descricao_material: 'Barra Chata Laminada 2x3/8',
          lote_minimo: 15.0,
          unidade_medida: 't',
          origem: 'Integração SAP RFC',
          valor_anterior: null,
          last_sync: '2026-03-30T08:00:00.000Z',
          rfc_execucao: 'Z_RFC_MATERIAL_LOTE_MINIMO',
        },
      ],
    ])

    const carteira: Partial<CarteiraItem>[] = [
      {
        codigo_material: 'MAT-RFC-SYNC',
        descricao_material: 'Barra Chata Laminada 2x3/8',
        centro: '1100',
        linha: 'L1',
        carteira_aberta_tons: 16.0, // 16 t em carteira
      },
    ]

    // Com lote mínimo inicial de 15,00 t, carteira de 16,00 t ATINGE o mínimo
    const resultadoAntes = calcularMinimoNaoAtingido({
      itens: carteira as CarteiraItem[],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaInicial,
    })
    expect(resultadoAntes.total_materiais_abaixo_minimo).toBe(0)
    expect(resultadoAntes.total_materiais_atingidos).toBe(1)

    // 2. SAP atualiza o lote mínimo para 18,00 t via RFC com origem "Integração SAP RFC"
    const replicaAtualizada = new Map<string, SapMaterialLoteMinimoRecord>([
      [
        'MAT-RFC-SYNC',
        {
          id: 'rec-sync-1',
          codigo_material: 'MAT-RFC-SYNC',
          descricao_material: 'Barra Chata Laminada 2x3/8',
          lote_minimo: 18.0,
          unidade_medida: 't',
          origem: 'Integração SAP RFC',
          valor_anterior: 15.0, // Registra valor anterior
          last_sync: '2026-03-30T14:30:00.000Z',
          rfc_execucao: 'Z_RFC_MATERIAL_LOTE_MINIMO',
        },
      ],
    ])

    // 3. Consulta direta da réplica atualizada
    const consulta = consultarLoteMinimoOficialSap('MAT-RFC-SYNC', replicaAtualizada)
    expect(consulta.lote_minimo).toBe(18.0)
    expect(consulta.origem).toBe('Integração SAP RFC')

    // 4. Com o novo lote mínimo de 18,00 t, a carteira de 16,00 t agora fica ABAIXO do mínimo!
    const resultadoDepois = calcularMinimoNaoAtingido({
      itens: carteira as CarteiraItem[],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaAtualizada,
    })

    expect(resultadoDepois.total_materiais_abaixo_minimo).toBe(1)
    expect(resultadoDepois.total_toneladas_faltantes).toBe(2.0) // 18 - 16 = 2,00 t
    expect(resultadoDepois.materiais_abaixo[0].codigo_material).toBe('MAT-RFC-SYNC')
    expect(resultadoDepois.materiais_abaixo[0].lote_minimo_tons).toBe(18.0)
    expect(resultadoDepois.materiais_abaixo[0].falta_para_minimo_tons).toBe(2.0)
    expect(resultadoDepois.materiais_abaixo[0].origem_lote_minimo).toBe('Integração SAP RFC')
  })

  /**
   * TESTE DE REGRA CRÍTICA: Código sem retorno da RFC SAP
   * Deve ser classificado como "SEM_PARAMETRIZACAO_SAP" ("Lote mínimo não recebido"),
   * sem inventar default, sem zero, e isolado na seção de inconsistência.
   */
  it('Código sem retorno da RFC SAP → status SEM_PARAMETRIZACAO_SAP (Lote mínimo não recebido)', () => {
    const itemSemSap: Partial<CarteiraItem> = {
      codigo_material: 'COD-SEM-RFC',
      descricao_material: 'Produto sem RFC SAP',
      carteira_aberta_tons: 25.0,
      curva_abc: 'A',
    }

    // Réplica vazia (ou sem este código)
    const replicaVazia = new Map<string, SapMaterialLoteMinimoRecord>()

    const resultado = calcularMinimoNaoAtingido({
      itens: [itemSemSap as CarteiraItem],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaVazia,
    })

    expect(resultado.total_materiais_abaixo_minimo).toBe(0)
    expect(resultado.total_materiais_atingidos).toBe(0)
    expect(resultado.total_materiais_sem_minimo_sap).toBe(1)
    expect(resultado.total_toneladas_sem_minimo_sap).toBe(25.0)

    const mat = resultado.materiais_sem_minimo_sap[0]
    expect(mat.codigo_material).toBe('COD-SEM-RFC')
    expect(mat.status_lote).toBe('SEM_PARAMETRIZACAO_SAP')
    expect(mat.inconsistencia_dados).toBe(true)
    expect(mat.lote_minimo_tons).toBeNull()
    expect(mat.falta_para_minimo_tons).toBe(0)
  })

  /**
   * TESTE DE CONSISTÊNCIA NAS 5 VISÕES (Geral, L1, L2, MTO e SDC)
   * As 5 visões consom o MESMO motor central e a mesma réplica SAP
   */
  it('As 5 visões (Geral, L1, L2, MTO e SDC) consom o mesmo motor central e réplica SAP', () => {
    const itensGerais: Partial<CarteiraItem>[] = [
      {
        codigo_material: 'MAT-L1',
        descricao_material: 'Perfil L1',
        linha: 'L1',
        centro: '1100',
        carteira_aberta_tons: 10.0,
      },
      {
        codigo_material: 'MAT-L2',
        descricao_material: 'Perfil L2',
        linha: 'L2',
        centro: '1100',
        carteira_aberta_tons: 12.0,
      },
      {
        codigo_material: 'MAT-MTO',
        descricao_material: 'Perfil MTO',
        linha: 'L1',
        centro: '1100',
        tipo_ordem: 'MTO',
        carteira_aberta_tons: 6.0,
      },
    ]

    const itensSDC: Partial<CarteiraSDCItem>[] = [
      {
        material: 'MAT-SDC',
        descricao: 'Perfil Sidercentro SDPL',
        centro_sap: 'SDPL',
        origem_producao: 'Sidercentro',
        carteira_t: 14.0,
      },
    ]

    const replicaSap = new Map<string, SapMaterialLoteMinimoRecord>([
      [
        'MAT-L1',
        {
          id: '1',
          codigo_material: 'MAT-L1',
          lote_minimo: 15.0,
          origem: 'SAP / RFC',
        },
      ],
      [
        'MAT-L2',
        {
          id: '2',
          codigo_material: 'MAT-L2',
          lote_minimo: 15.0,
          origem: 'SAP / RFC',
        },
      ],
      [
        'MAT-MTO',
        {
          id: '3',
          codigo_material: 'MAT-MTO',
          lote_minimo: 10.0,
          origem: 'SAP / RFC',
        },
      ],
      [
        'MAT-SDC',
        {
          id: '4',
          codigo_material: 'MAT-SDC',
          lote_minimo: 20.0,
          origem: 'SAP / RFC',
        },
      ],
    ])

    // 1. Visão Geral (todos juntos)
    const resGeral = calcularMinimoNaoAtingido({
      itens: [...(itensGerais as CarteiraItem[]), ...(itensSDC as any)],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaSap,
    })
    expect(resGeral.total_materiais_abaixo_minimo).toBe(4)

    // 2. Visão L1
    const resL1 = calcularMinimoNaoAtingido({
      itens: [itensGerais[0] as CarteiraItem],
      tipoVisao: 'L1',
      replicaSapPorCodigo: replicaSap,
    })
    expect(resL1.total_materiais_abaixo_minimo).toBe(1)
    expect(resL1.materiais_abaixo[0].codigo_material).toBe('MAT-L1')
    expect(resL1.materiais_abaixo[0].falta_para_minimo_tons).toBe(5.0)

    // 3. Visão L2
    const resL2 = calcularMinimoNaoAtingido({
      itens: [itensGerais[1] as CarteiraItem],
      tipoVisao: 'L2',
      replicaSapPorCodigo: replicaSap,
    })
    expect(resL2.total_materiais_abaixo_minimo).toBe(1)
    expect(resL2.materiais_abaixo[0].codigo_material).toBe('MAT-L2')
    expect(resL2.materiais_abaixo[0].falta_para_minimo_tons).toBe(3.0)

    // 4. Visão MTO
    const resMTO = calcularMinimoNaoAtingido({
      itens: [itensGerais[2] as CarteiraItem],
      tipoVisao: 'MTO',
      replicaSapPorCodigo: replicaSap,
    })
    expect(resMTO.total_materiais_abaixo_minimo).toBe(1)
    expect(resMTO.materiais_abaixo[0].codigo_material).toBe('MAT-MTO')
    expect(resMTO.materiais_abaixo[0].falta_para_minimo_tons).toBe(4.0)

    // 5. Visão SDC (CarteiraSDCItem com material e carteira_t)
    const resSDC = calcularMinimoNaoAtingido({
      itens: itensSDC as CarteiraSDCItem[],
      tipoVisao: 'SDC',
      replicaSapPorCodigo: replicaSap,
    })
    expect(resSDC.total_materiais_abaixo_minimo).toBe(1)
    expect(resSDC.materiais_abaixo[0].codigo_material).toBe('MAT-SDC')
    expect(resSDC.materiais_abaixo[0].carteira).toBe('SDC')
    expect(resSDC.materiais_abaixo[0].quantidade_consolidada_tons).toBe(14.0)
    expect(resSDC.materiais_abaixo[0].lote_minimo_tons).toBe(20.0)
    expect(resSDC.materiais_abaixo[0].falta_para_minimo_tons).toBe(6.0) // 20 - 14 = 6 t
  })

  /**
   * TESTE DE FORMATADORES E NORMALIZAÇÃO PT-BR
   */
  it('Funções utilitárias: normalização e formatação pt-BR estrita', () => {
    expect(normalizarCodigoMaterialSap('  mat-001  ')).toBe('MAT-001')
    expect(normalizarCodigoMaterialSap('')).toBe('')
    expect(normalizarCodigoMaterialSap(null)).toBe('')

    expect(formatarToneladasPtBr(15.5)).toBe('15,50 t')
    expect(formatarToneladasPtBr(0)).toBe('0,00 t')
    expect(formatarToneladasPtBr(null)).toBe('N/D')

    const dataFormatada = formatarDataHoraPtBr('2026-03-30T10:15:00.000Z')
    expect(dataFormatada).toMatch(/\d{2}\/\d{2}\/2026 \d{2}:\d{2}/)
  })
})

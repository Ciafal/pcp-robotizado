import { describe, it, expect } from 'vitest'
import {
  carteiraMinimaConsolidadaService,
  CLASSIFICACAO_NAO_IDENTIFICADA,
} from '@/services/carteira-minima-consolidada-service'
import { CarteiraMinimaItem } from '@/types/carteira-minima'

describe('CarteiraMinimaConsolidadaService — Consolidação por Bitola e Família', () => {
  const itensMock: CarteiraMinimaItem[] = [
    {
      id: 'item-1',
      material: '100010',
      descricao_material: 'BARRA CHATA 1" X 1/8" SAE 1020',
      carteira_tons: 12.0,
      estoque_livre_tons: 2.0,
      saldo_produzir_tons: 10.0,
      producao_minima_tons: 15.0,
      diferenca_minimo_tons: 5.0,
      pedido_venda: 'PED-101',
      item_pedido: '10',
      pedido_formatado: 'PED-101/10',
      data_desejada: '2025-05-10',
      tempo_ciclo_minutos: 40,
      tempo_ciclo_formatado: '40 min',
      centro: '1100',
      linha: 'L1',
      empresa: 'CIAFAL',
      criticidade: 'Crítico',
      motivo_criticidade: 'Saldo crítico',
      observacao_ia: 'Item com carteira abaixo do lote mínimo.',
      analise_detalhada_ia: 'Diagnóstico IA detalhado',
      recomendacoes_ia: ['Recomendação 1'],
    },
    {
      id: 'item-2',
      material: '100010', // Mesmo material, outro pedido
      descricao_material: 'BARRA CHATA 1" X 1/8" SAE 1020',
      carteira_tons: 8.0,
      estoque_livre_tons: 2.0, // Mesmo estoque livre cadastrado do material
      saldo_produzir_tons: 6.0,
      producao_minima_tons: 15.0,
      diferenca_minimo_tons: 9.0,
      pedido_venda: 'PED-102',
      item_pedido: '10',
      pedido_formatado: 'PED-102/10',
      data_desejada: '2025-05-15',
      tempo_ciclo_minutos: 40,
      tempo_ciclo_formatado: '40 min',
      centro: '1100',
      linha: 'L1',
      empresa: 'CIAFAL',
      criticidade: 'Atenção',
      motivo_criticidade: 'Saldo moderado',
      observacao_ia: 'Item com carteira abaixo do lote mínimo.',
      analise_detalhada_ia: 'Diagnóstico IA detalhado',
      recomendacoes_ia: ['Recomendação 2'],
    },
    {
      id: 'item-3',
      material: '100020',
      descricao_material: 'CANTONEIRA 2" X 1/4" SAE 1045',
      carteira_tons: 14.0,
      estoque_livre_tons: 4.0,
      saldo_produzir_tons: 10.0,
      producao_minima_tons: 15.0,
      diferenca_minimo_tons: 5.0,
      pedido_venda: 'PED-103',
      item_pedido: '20',
      pedido_formatado: 'PED-103/20',
      data_desejada: '2025-05-20',
      tempo_ciclo_minutos: 50,
      tempo_ciclo_formatado: '50 min',
      centro: '1100',
      linha: 'L1',
      empresa: 'CIAFAL',
      criticidade: 'Monitoramento',
      motivo_criticidade: 'Saldo baixo',
      observacao_ia: 'Item com carteira abaixo do lote mínimo.',
      analise_detalhada_ia: 'Diagnóstico IA detalhado',
      recomendacoes_ia: ['Recomendação 3'],
    },
    {
      id: 'item-4',
      material: '999999',
      descricao_material: 'PRODUTO ESPECIFICO CUSTOMIZADO', // Sem bitola/família identificável
      carteira_tons: 5.0,
      estoque_livre_tons: 0.0,
      saldo_produzir_tons: 5.0,
      producao_minima_tons: 0, // Sem retorno de lote mínimo
      diferenca_minimo_tons: 0,
      pedido_venda: 'PED-104',
      item_pedido: '10',
      pedido_formatado: 'PED-104/10',
      data_desejada: '2025-05-25',
      tempo_ciclo_minutos: 30,
      tempo_ciclo_formatado: '30 min',
      centro: '1100',
      linha: 'L1',
      empresa: 'CIAFAL',
      criticidade: 'Crítico',
      motivo_criticidade: 'Sem lote mínimo',
      observacao_ia: 'Sem retorno SAP',
      analise_detalhada_ia: 'Diagnóstico',
      recomendacoes_ia: [],
    },
  ]

  it('extrai bitola e família corretamente a partir da descrição técnica', () => {
    const bitola1 = carteiraMinimaConsolidadaService.extrairBitola(
      '100010',
      'BARRA CHATA 1" X 1/8" SAE 1020',
    )
    expect(bitola1).toBe('1" X 1/8"')

    const familia1 = carteiraMinimaConsolidadaService.extrairFamilia(
      '100010',
      'BARRA CHATA 1" X 1/8" SAE 1020',
    )
    expect(familia1).toBe('Barras Chatas')

    const bitola2 = carteiraMinimaConsolidadaService.extrairBitola(
      '100020',
      'CANTONEIRA 2" X 1/4" SAE 1045',
    )
    expect(bitola2).toBe('2" X 1/4"')

    const familia2 = carteiraMinimaConsolidadaService.extrairFamilia(
      '100020',
      'CANTONEIRA 2" X 1/4" SAE 1045',
    )
    expect(familia2).toBe('Cantoneiras')
  })

  it('classifica materiais sem bitola/família como "Classificação não identificada"', () => {
    const bitolaDesconhecida = carteiraMinimaConsolidadaService.extrairBitola(
      '999999',
      'PRODUTO ESPECIFICO',
    )
    expect(bitolaDesconhecida).toBe(CLASSIFICACAO_NAO_IDENTIFICADA)

    const familiaDesconhecida = carteiraMinimaConsolidadaService.extrairFamilia(
      '999999',
      'PRODUTO ESPECIFICO',
    )
    expect(familiaDesconhecida).toBe(CLASSIFICACAO_NAO_IDENTIFICADA)
  })

  it('consolida por Bitola sem duplicar estoques ou pedidos', async () => {
    const rows = await carteiraMinimaConsolidadaService.consolidar(itensMock, 'BITOLA')

    // Deve agrupar item-1 e item-2 na mesma bitola 1" X 1/8"
    const grupoChata = rows.find((r) => r.chave === '1" X 1/8"')
    expect(grupoChata).toBeDefined()
    expect(grupoChata?.materiais_count).toBe(1) // 1 material único (100010)
    expect(grupoChata?.pedidos_count).toBe(2) // 2 pedidos únicos (PED-101 e PED-102)
    expect(grupoChata?.carteira_total_tons).toBe(20.0) // 12 + 8
    expect(grupoChata?.estoque_livre_total_tons).toBe(2.0) // Estoque sem duplicar
    expect(grupoChata?.saldo_total_produzir_tons).toBe(16.0) // 10 + 6
    expect(grupoChata?.producao_minima_tons).toBe(15.0) // Mínimo homogêneo da RFC
    expect(grupoChata?.diferenca_tons).toBe(1.0) // 16 - 15 = +1.0
    expect(grupoChata?.situacao).toBe('Atendida') // 16 >= 15
  })

  it('indica "Lote mínimo não recebido" quando RFC não retorna mínimo para o código', async () => {
    const rows = await carteiraMinimaConsolidadaService.consolidar(itensMock, 'BITOLA')
    const grupoNaoIdentificado = rows.find((r) => r.chave === CLASSIFICACAO_NAO_IDENTIFICADA)

    expect(grupoNaoIdentificado).toBeDefined()
    expect(grupoNaoIdentificado?.situacao).toBe('Lote mínimo não recebido')
  })

  it('consolida por Família agrupando cantoneiras e barras chatas', async () => {
    const rows = await carteiraMinimaConsolidadaService.consolidar(itensMock, 'FAMILIA')

    const grupoCantoneiras = rows.find((r) => r.chave === 'Cantoneiras')
    expect(grupoCantoneiras).toBeDefined()
    expect(grupoCantoneiras?.carteira_total_tons).toBe(14.0)
    expect(grupoCantoneiras?.saldo_total_produzir_tons).toBe(10.0)
    expect(grupoCantoneiras?.producao_minima_tons).toBe(15.0)
    expect(grupoCantoneiras?.situacao).toBe('Não atingida')
  })

  it('gera relatório de IA com as seções prescritas sem dados inventados', () => {
    const rows = [
      {
        id: 'r1',
        tipo: 'BITOLA' as const,
        chave: '1" X 1/8"',
        linha_centro: 'L1 / 1100',
        centro: '1100',
        linha: 'L1',
        empresa: 'CIAFAL',
        materiais_count: 2,
        materiais_codigos: ['100010', '100011'],
        pedidos_count: 2,
        pedidos_numeros: ['PED-1', 'PED-2'],
        carteira_total_tons: 20,
        estoque_livre_total_tons: 2,
        saldo_total_produzir_tons: 18,
        producao_minima_tipo: 'VALOR' as const,
        producao_minima_tons: 15,
        diferenca_tons: 3,
        situacao: 'Atendida' as const,
        materiais: [],
      },
      {
        id: 'r2',
        tipo: 'BITOLA' as const,
        chave: '2" X 1/4"',
        linha_centro: 'L1 / 1100',
        centro: '1100',
        linha: 'L1',
        empresa: 'CIAFAL',
        materiais_count: 1,
        materiais_codigos: ['100020'],
        pedidos_count: 1,
        pedidos_numeros: ['PED-3'],
        carteira_total_tons: 10,
        estoque_livre_total_tons: 0,
        saldo_total_produzir_tons: 10,
        producao_minima_tipo: 'VALOR' as const,
        producao_minima_tons: 15,
        diferenca_tons: -5,
        situacao: 'Não atingida' as const,
        materiais: [],
      },
    ]

    const report = carteiraMinimaConsolidadaService.gerarAnaliseIa(rows, 'BITOLA')

    expect(report.visao).toBe('BITOLA')
    expect(report.totalAgrupamentosAbaixoMinimo).toBe(1)
    expect(report.totalOportunidadesConsolidacao).toBe(1)
    expect(report.totalMateriaisComEstoque).toBe(1)
    expect(report.recomendacoesPcp.length).toBeGreaterThan(0)
    expect(report.resumoExecutivo).toContain('Bitola')
    expect(report.detalhesAgrupamentos.length).toBe(2)
  })
})

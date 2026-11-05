import { describe, it, expect } from 'vitest'
import {
  OPCOES_ORDENACAO_CARTEIRA_GERAL,
  enriquecerItensCarteiraGeral,
  ordenarItensCarteiraGeral,
} from '@/services/carteira-geral-ordenacao-engine'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'

describe('Carteira Geral - Reforma Parte 2 (Ordenação e 17 Colunas)', () => {
  it('deve conter exatamente as 18 opções oficiais no filtro "Ordenar por"', () => {
    expect(OPCOES_ORDENACAO_CARTEIRA_GERAL).toHaveLength(18)

    const labelsEsperadas = [
      'Material / descrição',
      'Código',
      'Carteira — maior para menor',
      'Carteira — menor para maior',
      'Estoque disponível — maior para menor',
      'Estoque disponível — menor para maior',
      'Média diária faturamento — maior para menor',
      'Média diária faturamento — menor para maior',
      'Dias de estoque — menor para maior',
      'Dias de estoque — maior para menor',
      'Data fim estoque — mais próxima',
      'Data fim estoque — mais distante',
      'Dias estoque negativo — maior para menor',
      'Déficit — maior para menor',
      'Saldo projetado — menor para maior',
      'Representatividade faturamento % — maior para menor',
      'Representatividade faturamento % — menor para maior',
      'Risco — maior criticidade primeiro',
    ]

    const labelsAtuais = OPCOES_ORDENACAO_CARTEIRA_GERAL.map((o) => o.label)
    expect(labelsAtuais).toEqual(labelsEsperadas)
  })

  it('deve enriquecer itens com média diária, dias de estoque, representatividade % e ordenar de verdade', () => {
    const itensMock: ItemCurvaAbcCalculado[] = [
      {
        codigo_material: '000000000000100001',
        descricao_material: 'CANTONEIRA 25,4 X 4,50',
        linha: 'L1',
        centro: '2010',
        carteira_tons: 150.0,
        estoque_disponivel_tons: 30.0,
        programado_tons: 50.0,
        deficit_tons: 70.0,
        saldo_projetado_tons: -20.0,
        saldo_atual_tons: -120.0,
        estoque_bloqueado_tons: 0,
        estoque_qualidade_tons: 0,
        em_producao_tons: 0,
        entradas_previstas_tons: 0,
        faturamento_brl: 0,
        familia: 'CANTONEIRA',
        dias_cobertura: null,
        criticidade: 'ALTA',
        situacao: 'NORMAL',
        tipo_carteira: 'GERAL',
        participacao_individual_pct: 75.0,
        participacao_acumulada_pct: 75.0,
        curva_abc: 'A',
        risco: 'CRITICO',
        origemItemOriginal: {
          codigo_material: '000000000000100001',
          descricao: 'CANTONEIRA 25,4 X 4,50',
          qtd_faturada_tons: 300.0,
          faturamento_mensal_estimado_t: 100.0,
        } as any,
      },
      {
        codigo_material: '000000000000200002',
        descricao_material: 'BARRA CHATA 50 X 6,35',
        linha: 'L2',
        centro: '2020',
        carteira_tons: 50.0,
        estoque_disponivel_tons: 100.0,
        programado_tons: 0,
        deficit_tons: 0,
        saldo_projetado_tons: 50.0,
        saldo_atual_tons: 50.0,
        estoque_bloqueado_tons: 0,
        estoque_qualidade_tons: 0,
        em_producao_tons: 0,
        entradas_previstas_tons: 0,
        faturamento_brl: 0,
        familia: 'BARRA_CHATA',
        dias_cobertura: null,
        criticidade: 'BAIXA',
        situacao: 'NORMAL',
        tipo_carteira: 'GERAL',
        participacao_individual_pct: 25.0,
        participacao_acumulada_pct: 100.0,
        curva_abc: 'B',
        risco: 'NORMAL',
        origemItemOriginal: {
          codigo_material: '000000000000200002',
          descricao: 'BARRA CHATA 50 X 6,35',
          qtd_faturada_tons: 100.0,
          faturamento_mensal_estimado_t: 33.3,
        } as any,
      },
    ]

    const enriquecidos = enriquecerItensCarteiraGeral(itensMock)
    expect(enriquecidos).toHaveLength(2)

    // Representatividade calculada sobre o universo filtrado (300t + 100t = 400t)
    // Item 1: 300 / 400 * 100 = 75,00 %
    // Item 2: 100 / 400 * 100 = 25,00 %
    expect(enriquecidos[0].representatividadeFatTexto).toBe('75,00 %')
    expect(enriquecidos[1].representatividadeFatTexto).toBe('25,00 %')

    // Ordenação por Dias de estoque — menor para maior
    const ordenadoDiasAsc = ordenarItensCarteiraGeral(enriquecidos, 'DIAS_ESTOQUE_ASC')
    expect(ordenadoDiasAsc[0].item.codigo_material).toBe('000000000000100001')
    expect(ordenadoDiasAsc[1].item.codigo_material).toBe('000000000000200002')

    // Ordenação por Dias de estoque — maior para menor
    const ordenadoDiasDesc = ordenarItensCarteiraGeral(enriquecidos, 'DIAS_ESTOQUE_DESC')
    expect(ordenadoDiasDesc[0].item.codigo_material).toBe('000000000000200002')
    expect(ordenadoDiasDesc[1].item.codigo_material).toBe('000000000000100001')

    // Ordenação por Risco — maior criticidade primeiro
    const ordenadoRisco = ordenarItensCarteiraGeral(enriquecidos, 'RISCO_CRITICIDADE')
    expect(ordenadoRisco[0].item.risco).toBe('CRITICO')
    expect(ordenadoRisco[1].item.risco).toBe('NORMAL')
  })

  it('deve enviar itens sem dados para o fim da lista em qualquer ordenação', () => {
    const itensSemDados: ItemCurvaAbcCalculado[] = [
      {
        codigo_material: 'SEM_CONSUMO',
        descricao_material: 'MATERIAL SEM CONSUMO',
        linha: 'L1',
        centro: '2010',
        carteira_tons: 10.0,
        estoque_disponivel_tons: 0,
        programado_tons: 0,
        deficit_tons: 0,
        saldo_projetado_tons: 0,
        saldo_atual_tons: 0,
        estoque_bloqueado_tons: 0,
        estoque_qualidade_tons: 0,
        em_producao_tons: 0,
        entradas_previstas_tons: 0,
        faturamento_brl: 0,
        familia: 'OUTROS',
        dias_cobertura: null,
        criticidade: 'BAIXA',
        situacao: 'NORMAL',
        tipo_carteira: 'GERAL',
        participacao_individual_pct: 0,
        participacao_acumulada_pct: 0,
        curva_abc: 'C',
        risco: 'NORMAL',
        origemItemOriginal: null as any,
      },
      {
        codigo_material: 'COM_CONSUMO',
        descricao_material: 'MATERIAL COM CONSUMO',
        linha: 'L1',
        centro: '2010',
        carteira_tons: 50.0,
        estoque_disponivel_tons: 20.0,
        programado_tons: 0,
        deficit_tons: 0,
        saldo_projetado_tons: 10.0,
        saldo_atual_tons: 10.0,
        estoque_bloqueado_tons: 0,
        estoque_qualidade_tons: 0,
        em_producao_tons: 0,
        entradas_previstas_tons: 0,
        faturamento_brl: 0,
        familia: 'OUTROS',
        dias_cobertura: null,
        criticidade: 'BAIXA',
        situacao: 'NORMAL',
        tipo_carteira: 'GERAL',
        participacao_individual_pct: 100.0,
        participacao_acumulada_pct: 100.0,
        curva_abc: 'A',
        risco: 'NORMAL',
        origemItemOriginal: {
          codigo_material: 'COM_CONSUMO',
          qtd_faturada_tons: 90.0,
        } as any,
      },
    ]

    const enriquecidos = enriquecerItensCarteiraGeral(itensSemDados)
    expect(enriquecidos[0].mediaDiariaTexto).toBe('Sem consumo histórico')

    const ordenadoAsc = ordenarItensCarteiraGeral(enriquecidos, 'MEDIA_FAT_ASC')
    // O com consumo deve vir primeiro, e o sem consumo deve ir para o fim
    expect(ordenadoAsc[0].item.codigo_material).toBe('COM_CONSUMO')
    expect(ordenadoAsc[1].item.codigo_material).toBe('SEM_CONSUMO')

    const ordenadoDesc = ordenarItensCarteiraGeral(enriquecidos, 'MEDIA_FAT_DESC')
    expect(ordenadoDesc[0].item.codigo_material).toBe('COM_CONSUMO')
    expect(ordenadoDesc[1].item.codigo_material).toBe('SEM_CONSUMO')
  })
})

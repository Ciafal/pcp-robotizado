import { describe, it, expect } from 'vitest'
import {
  CoberturaTemporalEngine,
  InputCalculoTemporal,
  ParametrosGovernancaTemporal,
} from '../services/cobertura-temporal-engine'

describe('Motor Único de Cobertura Temporal & Previsão — 7 Carteiras CIAFAL', () => {
  const parametrosPadrao: ParametrosGovernancaTemporal = {
    diasHistoricoFaturamento: 90,
    tipoCalendario: 'CORRIDOS',
    considerarEstoqueQualidade: false,
    considerarEstoqueBloqueado: false,
    limiarDiasAtencao: 5,
    limiarDiasCritico: 2,
  }

  // As 7 carteiras com suas origens de reposição correspondentes
  const carteiras = [
    { nome: 'Carteira Geral', origem: 'GERAL', origemReposicao: 'Transferência entre centros' },
    { nome: 'Carteira L1', origem: 'L1', origemReposicao: 'Programação de Produção L1' },
    { nome: 'Carteira L2', origem: 'L2', origemReposicao: 'Programação de Produção L2' },
    { nome: 'Carteira MTO', origem: 'MTO', origemReposicao: 'Ordem de Produção (OP)' },
    { nome: 'Carteira Revenda', origem: 'REVENDA', origemReposicao: 'Pedido de Compra' },
    {
      nome: 'Carteira Importado',
      origem: 'IMPORTADO',
      origemReposicao: 'Importação (ETA + Desembaraço)',
    },
    {
      nome: 'Carteira SDC',
      origem: 'SDC',
      origemReposicao: 'Retorno Industrialização Sidercentro',
    },
  ] as const

  carteiras.forEach(({ nome, origem, origemReposicao }) => {
    describe(`${nome} (${origem})`, () => {
      // Cenário A: Data análise 16/09/2026, estoque 5 t, média 1 t/dia -> fim 21/09/2026, reposição 24/09/2026 -> 3 dias negativos, RISCO DE RUPTURA
      it('Cenário A: Risco de ruptura com gap de 3 dias de estoque negativo', () => {
        const input: InputCalculoTemporal = {
          origemCarteira: origem,
          materialCodigo: `MAT-${origem}-01`,
          materialDescricao: `Material Teste ${origem}`,
          dataBaseAnalise: '16/09/2026',
          estoqueFisicoTotalT: 5,
          estoqueBloqueadoT: 0,
          estoqueQualidadeT: 0,
          mediaDiariaParametrizadaT: 1.0,
          pedidos: [
            {
              numeroDocumento: 'DEM-001',
              item: '10',
              dataDesejada: '18/09/2026',
              quantidadeTons: 2.0,
            },
          ],
          reposicoesFuturas: [
            {
              idDocumento: 'REP-001',
              origem: origemReposicao,
              tipoDocumento: 'PROGRAMACAO',
              dataPrevista: '24/09/2026',
              quantidadeTons: 10,
              observacao: 'Reposição confirmada',
            },
          ],
          parametros: parametrosPadrao,
        }

        const res = CoberturaTemporalEngine.calcular(input)

        expect(res.estoqueDisponivelUtilizavelT).toBe(5)
        expect(res.mediaDiariaFaturamentoT).toBe(1.0)
        expect(res.diasCobertura).toBe(5)
        expect(res.dataFimEstoqueFormatada).toBe('21/09/2026')
        expect(res.proximaDataPrevistaFormatada).toContain('24/09/2026')
        expect(res.diasEstoqueNegativo).toBe(3)
        expect(res.diasEstoqueNegativoFormatado).toBe('3')
        expect(res.temGapRuptura).toBe(true)
        expect(res.status).toBe('RISCO DE RUPTURA')
      })

      // Cenário B: Reposição antecede o fim do estoque (19/09/2026 vs 21/09/2026) -> gap 0, COBERTURA PRESERVADA
      it('Cenário B: Reposição antecede o fim do estoque -> gap 0, status COBERTURA PRESERVADA', () => {
        const input: InputCalculoTemporal = {
          origemCarteira: origem,
          materialCodigo: `MAT-${origem}-02`,
          materialDescricao: `Material Teste ${origem} Antecede`,
          dataBaseAnalise: '16/09/2026',
          estoqueFisicoTotalT: 5,
          estoqueBloqueadoT: 0,
          estoqueQualidadeT: 0,
          mediaDiariaParametrizadaT: 1.0,
          pedidos: [
            {
              numeroDocumento: 'DEM-002',
              item: '10',
              dataDesejada: '17/09/2026',
              quantidadeTons: 1.0,
            },
          ],
          reposicoesFuturas: [
            {
              idDocumento: 'REP-002',
              origem: origemReposicao,
              tipoDocumento: 'PROGRAMACAO',
              dataPrevista: '19/09/2026',
              quantidadeTons: 10,
              observacao: 'Chegada antecipada',
            },
          ],
          parametros: parametrosPadrao,
        }

        const res = CoberturaTemporalEngine.calcular(input)

        expect(res.diasCobertura).toBe(5)
        expect(res.dataFimEstoqueFormatada).toBe('21/09/2026')
        expect(res.proximaDataPrevistaFormatada).toContain('19/09/2026')
        expect(res.diasEstoqueNegativo).toBe(0)
        expect(res.diasEstoqueNegativoFormatado).toBe('0')
        expect(res.temGapRuptura).toBe(false)
        expect(res.status).toBe('COBERTURA PRESERVADA')
      })

      // Cenário C: Sem reposição prevista -> dias estoque negativo "Indeterminado", status SEM REPOSIÇÃO PREVISTA
      it('Cenário C: Sem reposição prevista -> dias estoque negativo Indeterminado, status SEM REPOSIÇÃO PREVISTA', () => {
        const input: InputCalculoTemporal = {
          origemCarteira: origem,
          materialCodigo: `MAT-${origem}-03`,
          materialDescricao: `Material Teste ${origem} Sem Reposição`,
          dataBaseAnalise: '16/09/2026',
          estoqueFisicoTotalT: 5,
          estoqueBloqueadoT: 0,
          estoqueQualidadeT: 0,
          mediaDiariaParametrizadaT: 1.0,
          pedidos: [],
          reposicoesFuturas: [],
          parametros: parametrosPadrao,
        }

        const res = CoberturaTemporalEngine.calcular(input)

        expect(res.diasCobertura).toBe(5)
        expect(res.dataFimEstoqueFormatada).toBe('21/09/2026')
        expect(res.proximaDataPrevistaFormatada).toBe('Sem reposição prevista')
        expect(res.diasEstoqueNegativo).toBeNull()
        expect(res.diasEstoqueNegativoFormatado).toBe('Indeterminado')
        expect(res.temGapRuptura).toBe(true)
        expect(res.status).toBe('SEM REPOSIÇÃO PREVISTA')
      })
    })
  })

  // Teste de ordenação cronológica estrita das entradas futuras
  it('Ordenação cronológica estrita: seleciona a primeira entrada futura real independente da ordem de inserção', () => {
    const input: InputCalculoTemporal = {
      origemCarteira: 'GERAL',
      materialCodigo: 'MAT-ORD-01',
      materialDescricao: 'Teste Ordenação Estrita',
      dataBaseAnalise: '16/09/2026',
      estoqueFisicoTotalT: 5,
      estoqueBloqueadoT: 0,
      estoqueQualidadeT: 0,
      mediaDiariaParametrizadaT: 1.0,
      pedidos: [
        { numeroDocumento: 'P2', item: '1', dataDesejada: '25/09/2026', quantidadeTons: 1 },
        { numeroDocumento: 'P1', item: '1', dataDesejada: '18/09/2026', quantidadeTons: 1 },
      ],
      reposicoesFuturas: [
        {
          idDocumento: 'R3',
          origem: 'L1',
          tipoDocumento: 'OP',
          dataPrevista: '30/09/2026',
          quantidadeTons: 5,
        },
        {
          idDocumento: 'R1',
          origem: 'SDC',
          tipoDocumento: 'RETORNO',
          dataPrevista: '22/09/2026',
          quantidadeTons: 8,
        },
        {
          idDocumento: 'R2',
          origem: 'REVENDA',
          tipoDocumento: 'PC',
          dataPrevista: '28/09/2026',
          quantidadeTons: 4,
        },
      ],
      parametros: parametrosPadrao,
    }

    const res = CoberturaTemporalEngine.calcular(input)
    expect(res.proximaDataDemandaFormatada).toBe('18/09/2026')
    expect(res.proximaDataPrevistaFormatada).toBe('22/09/2026 · SDC')
    expect(res.diasEstoqueNegativo).toBe(1)
  })

  // Teste de estoque zero -> CRÍTICO
  it('Estoque disponível utilizável igual a 0 gera status imediato CRÍTICO', () => {
    const input: InputCalculoTemporal = {
      origemCarteira: 'SDC',
      materialCodigo: 'MAT-ZERO',
      materialDescricao: 'Estoque Zero',
      dataBaseAnalise: '16/09/2026',
      estoqueFisicoTotalT: 2,
      estoqueBloqueadoT: 2, // 2 - 2 = 0 utilizável
      estoqueQualidadeT: 0,
      mediaDiariaParametrizadaT: 1.0,
      pedidos: [],
      reposicoesFuturas: [],
      parametros: parametrosPadrao,
    }

    const res = CoberturaTemporalEngine.calcular(input)
    expect(res.estoqueDisponivelUtilizavelT).toBe(0)
    expect(res.diasCobertura).toBe(0)
    expect(res.status).toBe('CRÍTICO')
  })
})

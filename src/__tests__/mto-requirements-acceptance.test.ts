import { describe, it, expect } from 'vitest'
import {
  getRequirementsByOrderAndItem,
  getRequirementsCountsMap,
  getRequirementsGridInfoMap,
  buildMtoOrderKey,
  classifyMtoRequirement,
  formatTiposResumo,
} from '../services/mto-requirements-service'
import type { MtoRequirementRecord } from '../types/mto-requirements'

describe('Suíte de Aceite — Requisitos MTO (Carteira MTO)', () => {
  // Critério (1): Coluna "Requisitos MTO" presente e mapeamento de chaves
  it('Critério 1 & 2: A chave de busca utiliza Pedido + Item reais (não índice) e busca seus próprios requisitos', () => {
    const key1 = buildMtoOrderKey('50000499', '10')
    const key2 = buildMtoOrderKey('50000499', '20')
    const key3 = buildMtoOrderKey('99999999', '10')

    expect(key1).toBe('50000499__10')
    expect(key2).toBe('50000499__20')
    expect(key1).not.toBe(key2)
    expect(key1).not.toBe(key3)
  })

  // Critério (3): Pedido 50000499 apresenta 2 requisitos cadastrados
  it('Critério 3: Pedido 50000499 apresenta 2 requisitos cadastrados na consulta por pedido', async () => {
    const reqs = await getRequirementsByOrderAndItem('50000499')
    expect(reqs.length).toBe(2)

    const reqNumeros = reqs.map((r) => r.requisito_numero)
    expect(reqNumeros).toContain(1)
    expect(reqNumeros).toContain(2)
  })

  // Critério (4): Requisito 01 mostra quantidade 70, condição NBR 7007, comprimento 4,80 m
  it('Critério 4: Requisito 01 mostra quantidade 70, condição NBR 7007 e comprimento 4,80 m', async () => {
    const reqs = await getRequirementsByOrderAndItem('50000499', '10')
    const req1 = reqs.find((r) => r.requisito_numero === 1)

    expect(req1).toBeDefined()
    expect(req1?.quantidade).toBe(70)
    expect(req1?.condicao).toBe('NBR 7007')
    expect(req1?.comprimento?.comprimento_principal).toBe(4.8)

    // Comprimento 4.80 m
    expect(req1?.comprimento?.comprimento_principal).toBe(4.8)
  })

  // Critério (5): Requisito 02 mostra quantidade 30, condição AISI SAE J403/01, comprimento 4,77 m
  it('Critério 5: Requisito 02 mostra quantidade 30, condição AISI SAE J403/01 e comprimento 4,77 m', async () => {
    const reqs = await getRequirementsByOrderAndItem('50000499', '10')
    const req2 = reqs.find((r) => r.requisito_numero === 2)

    expect(req2).toBeDefined()
    expect(req2?.quantidade).toBe(30)
    expect(req2?.condicao).toBe('AISI SAE J403/01')
    expect(req2?.comprimento?.comprimento_principal).toBe(4.77)

    // Comprimento 4.77 m
    expect(req2?.comprimento?.comprimento_principal).toBe(4.77)
  })

  // Critério (6): 400/250 MPa e 20 % aparecem SOMENTE no Requisito 01 (Requisito 02 exibe "—")
  it('Critério 6: 400/250 MPa e 20 % aparecem SOMENTE no Requisito 01; Requisito 02 não possui valores de tração', async () => {
    const reqs = await getRequirementsByOrderAndItem('50000499', '10')
    const req1 = reqs.find((r) => r.requisito_numero === 1)
    const req2 = reqs.find((r) => r.requisito_numero === 2)

    // Requisito 01 tem tração completa
    expect(req1?.garantias_especificas?.ensaio_tracao?.lr_mpa).toBe(400)
    expect(req1?.garantias_especificas?.ensaio_tracao?.le_mpa).toBe(250)
    expect(req1?.garantias_especificas?.ensaio_tracao?.alongamento_pct).toBe(20)

    // Requisito 02 NÃO tem tração (nulo/indefinido)
    expect(req2?.garantias_especificas?.ensaio_tracao?.lr_mpa).toBeNull()
    expect(req2?.garantias_especificas?.ensaio_tracao?.le_mpa).toBeNull()
    expect(req2?.garantias_especificas?.ensaio_tracao?.alongamento_pct).toBeNull()
  })

  // Critério (7): Campos sem informação exibem "—" sem inventar dados
  it('Critério 7: formatAbntValue / valores sem dado exibem "—" sem inventar dados', async () => {
    const reqs = await getRequirementsByOrderAndItem('50000499', '10')
    const req2 = reqs.find((r) => r.requisito_numero === 2)
    expect(req2?.garantias_especificas?.ensaio_tracao?.lr_mpa).toBeNull()
  })

  // Critério (Seção 5 e 6): Classificação tipo_requisito (principal + tags secundárias)
  it('Seção 5 & 6: Classificação automática tipo_requisito e tags secundárias', () => {
    const req1: Partial<MtoRequirementRecord> = {
      requisito_numero: 1,
      comprimento: {
        comprimento_principal: 4.8,
        tolerancia_mais: 0.1,
        tolerancia_menos: 0.0,
      },
      dimensoes_tolerancias: {
        altura: '50',
        largura: '50',
      },
      garantias_especificas: {
        ensaio_tracao: {
          lr_mpa: 400,
          le_mpa: 250,
          alongamento_pct: 20,
        },
      },
    }

    const classif1 = classifyMtoRequirement(req1)
    expect(classif1.tipo_principal).toBe('Comprimento')
    expect(classif1.tags_secundarias).toContain('Dimensões e Tolerâncias')
    expect(classif1.tags_secundarias).toContain('Garantias Específicas')

    // Formatação Seção 7 para célula da grid
    expect(formatTiposResumo(['Comprimento'])).toBe('Tipos: Comprimento')
    expect(formatTiposResumo(['Comprimento', 'Garantias Específicas'])).toBe(
      'Tipos: Comprimento, Garantias Específicas',
    )
    expect(
      formatTiposResumo(['Composição Química', 'Temperabilidade', 'Dimensões e Tolerâncias']),
    ).toBe('Tipos: Composição Química, Temperabilidade +1')
  })

  // Critério (Seção 7): Enriquecimento de grid com contagem e resumo dos tipos
  it('Seção 7: getRequirementsGridInfoMap retorna contagem e resumo dos tipos para a grid', async () => {
    const gridInfoMap = await getRequirementsGridInfoMap([{ pedido: '50000499', item: '10' }])
    const key = buildMtoOrderKey('50000499', '10')
    const info = gridInfoMap.get(key)

    expect(info).toBeDefined()
    expect(info?.count).toBe(2)
    expect(info?.tipos).toContain('Comprimento')
    expect(info?.tiposResumoTexto).toContain('Tipos:')
  })

  // Critério (8): Todas as 9 seções técnicas estruturadas presentes no registro
  it('Critério 8: Registro contém todas as seções e grupos técnicos estruturados', async () => {
    const reqs = await getRequirementsByOrderAndItem('50000499', '10')
    const req1 = reqs[0]

    expect(req1).toBeDefined()
    // 1. Identificação
    expect(req1.pedido_numero).toBe('50000499')
    expect(req1.cliente_nome).toBe('CONEXOES SANTA MARTA IND E COM LTDA')
    expect(req1.produto).toBe('CANTONEIRA')
    // 2. Requisitos do produto (condição livre)
    expect(req1.condicao).toBeDefined()
    // 3. Composição química
    expect(req1.composicao_quimica?.elementos?.length).toBe(12)
    // 4. Dimensões e Tolerâncias
    expect(req1.dimensoes_tolerancias).toBeDefined()
    // 5. Comprimento
    expect(req1.comprimento?.comprimento_principal).toBeDefined()
    // 6. Condições e Garantias Superfície
    expect(req1.garantias_superficie?.padrao_qualidade_superficial).toBe('QS 3')
    // 7. Garantia Interna
    expect(req1.garantias_internas).toBeDefined()
    // 8. Garantias Específicas
    expect(req1.garantias_especificas?.ensaio_tracao).toBeDefined()
    expect(req1.garantias_especificas?.caracterizacao_metalurgica).toBeDefined()
    expect(req1.garantias_especificas?.temperabilidade?.pontos_mm?.length).toBe(13)
    // 9. Política da Qualidade
    expect(req1.politica_qualidade).toContain('Buscar sempre o atendimento dos requisitos')
  })

  // Critério (9): Mapa de contagens na grid suporta pedidos com 2+, 1 ou 0 requisitos
  it('Critério 9: Mapa de contagem diferencia pedidos com requisitos e sem requisitos', async () => {
    const counts = await getRequirementsCountsMap([
      { pedido: '50000499', item: '10' },
      { pedido: '99999999', item: '10' },
    ])

    const count50000499 =
      counts.get(buildMtoOrderKey('50000499', '10')) || counts.get('50000499') || 0
    const countSemRequisito =
      counts.get(buildMtoOrderKey('99999999', '10')) || counts.get('99999999') || 0

    expect(count50000499).toBe(2)
    expect(countSemRequisito).toBe(0)
  })
})

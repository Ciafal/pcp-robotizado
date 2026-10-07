import { describe, it, expect } from 'vitest'
import {
  getRequirementsByOrderAndItem,
  getRequirementsCountsMap,
  buildMtoOrderKey,
} from '../services/mto-requirements-service'
import { formatAbntValue } from '../components/carteira-views/ConsultarRequisitosMTOModal'

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

    // Formatação ABNT
    const formatadoComprimento = formatAbntValue(req1?.comprimento?.comprimento_principal, 'm')
    expect(formatadoComprimento).toBe('4,80 m')
  })

  // Critério (5): Requisito 02 mostra quantidade 30, condição AISI SAE J403/01, comprimento 4,77 m
  it('Critério 5: Requisito 02 mostra quantidade 30, condição AISI SAE J403/01 e comprimento 4,77 m', async () => {
    const reqs = await getRequirementsByOrderAndItem('50000499', '10')
    const req2 = reqs.find((r) => r.requisito_numero === 2)

    expect(req2).toBeDefined()
    expect(req2?.quantidade).toBe(30)
    expect(req2?.condicao).toBe('AISI SAE J403/01')
    expect(req2?.comprimento?.comprimento_principal).toBe(4.77)

    // Formatação ABNT
    const formatadoComprimento = formatAbntValue(req2?.comprimento?.comprimento_principal, 'm')
    expect(formatadoComprimento).toBe('4,77 m')
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

    expect(
      formatAbntValue(req1?.garantias_especificas?.ensaio_tracao?.lr_mpa, 'MPa', { decimals: 0 }),
    ).toBe('400 MPa')
    expect(
      formatAbntValue(req1?.garantias_especificas?.ensaio_tracao?.le_mpa, 'MPa', { decimals: 0 }),
    ).toBe('250 MPa')
    expect(
      formatAbntValue(req1?.garantias_especificas?.ensaio_tracao?.alongamento_pct, '%', {
        decimals: 0,
      }),
    ).toBe('20 %')

    // Requisito 02 NÃO tem tração (nulo/indefinido) e exibe "—"
    expect(req2?.garantias_especificas?.ensaio_tracao?.lr_mpa).toBeNull()
    expect(req2?.garantias_especificas?.ensaio_tracao?.le_mpa).toBeNull()
    expect(req2?.garantias_especificas?.ensaio_tracao?.alongamento_pct).toBeNull()

    expect(
      formatAbntValue(req2?.garantias_especificas?.ensaio_tracao?.lr_mpa, 'MPa', { decimals: 0 }),
    ).toBe('—')
    expect(
      formatAbntValue(req2?.garantias_especificas?.ensaio_tracao?.le_mpa, 'MPa', { decimals: 0 }),
    ).toBe('—')
    expect(
      formatAbntValue(req2?.garantias_especificas?.ensaio_tracao?.alongamento_pct, '%', {
        decimals: 0,
      }),
    ).toBe('—')
  })

  // Critério (7): Campos sem informação exibem "—" sem inventar dados
  it('Critério 7: formatAbntValue exibe "—" para valores nulos, vazios ou indefinidos sem inventar dados', () => {
    expect(formatAbntValue(null)).toBe('—')
    expect(formatAbntValue(undefined)).toBe('—')
    expect(formatAbntValue('')).toBe('—')
    expect(formatAbntValue(null, 'mm')).toBe('—')
    expect(formatAbntValue(null, '°C')).toBe('—')
    expect(formatAbntValue(null, 'J')).toBe('—')
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

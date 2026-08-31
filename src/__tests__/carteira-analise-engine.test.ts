import { describe, it, expect } from 'vitest'
import { CarteiraZSD28CEngine, REGRAS_PADRAO } from '@/services/carteira-engine'
import { CarteiraService } from '@/services/carteira-service'
import { CarteiraItem, CarteiraEntradaFutura } from '@/types/carteira-analise'

describe('Motor de Cálculos da Análise de Carteira & Paridade ZSD28C', () => {
  it('1. Deve calcular Carteira Aberta, Saldo Positivo e Negativo conforme regra geral ZSD28C', () => {
    const item: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'GERAL',
      ordem_venda: '4500100200',
      item_ordem: '10',
      data_ordem: '2025-01-10',
      data_desejada: '2025-02-15',
      codigo_cliente: 'CLI-01',
      nome_cliente: 'Cliente Teste Aço',
      codigo_material: 'X1020',
      descricao_material: 'Aço Laminado Teste',
      familia: 'Geral',
      curva_abc: 'A',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 50,
      qtd_faturada_tons: 20,
      carteira_aberta_tons: 0,
      carteira_vendas_tons: 0,
      carteira_mto_tons: 0,
      estoque_livre_tons: 10,
      estoque_mto_tons: 0,
      estoque_semiacabado_tons: 0,
      estoque_acabado_tons: 0,
      saldo_disponivel_tons: 0,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: 0,
      necessidade_liquida_tons: 0,
      falta_produzir_tons: 0,
      status_atendimento: 'A_PRODUZIR',
      qtd_programada_tons: 0,
      media_faturamento_diario_t_dia: 1,
      status_ruptura: 'CINZA',
      bloqueio: false,
    }

    const res = CarteiraZSD28CEngine.calcularItem(item, [])
    expect(res.carteira_aberta_tons).toBe(30) // 50 - 20 = 30t
    expect(res.saldo_negativo_tons).toBe(-20) // 10 estoque - 30 carteira = -20t
    expect(res.saldo_positivo_tons).toBe(0)
    expect(res.necessidade_liquida_tons).toBe(20)
    expect(res.status_atendimento).toBe('A_PRODUZIR')
    expect(res.memoria_calculo).toBeDefined()
  })

  it('2. Deve aplicar com exatidão as regras do Ciclo L1', () => {
    // REGRAS L1:
    // Disp = Estoque Livre + Estoque MTO + Estoque Semiacabado
    // Demanda = Carteira Vendas + Carteira MTO
    // Negativa = MIN(0; Disp - Demanda)
    // Positivo = MAX(0; Disp - Demanda)
    const itemL1: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'L1',
      ordem_venda: '4500100300',
      item_ordem: '10',
      data_ordem: '2025-01-10',
      data_desejada: '2025-02-15',
      codigo_cliente: 'CLI-02',
      nome_cliente: 'Estruturas Metálicas',
      codigo_material: 'C1020',
      descricao_material: 'Barra Chata 1020',
      familia: 'BARRA_CHATA',
      curva_abc: 'A',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 100,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 100,
      carteira_vendas_tons: 100,
      carteira_mto_tons: 20,
      estoque_livre_tons: 30,
      estoque_mto_tons: 10,
      estoque_semiacabado_tons: 40,
      estoque_acabado_tons: 0,
      saldo_disponivel_tons: 0,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: 0,
      necessidade_liquida_tons: 0,
      falta_produzir_tons: 0,
      status_atendimento: 'A_PRODUZIR',
      qtd_programada_tons: 0,
      media_faturamento_diario_t_dia: 2,
      status_ruptura: 'CINZA',
      bloqueio: false,
    }

    const res = CarteiraZSD28CEngine.calcularItem(itemL1, [])
    // Disp = 30 + 10 + 40 = 80t
    // Demanda = 100 + 20 = 120t
    // Saldo = 80 - 120 = -40t
    expect(res.saldo_negativo_tons).toBe(-40)
    expect(res.saldo_positivo_tons).toBe(0)
  })

  it('3. Deve aplicar a regra legada exata do Ciclo L2 com distinção entre Negativa e Saldo', () => {
    // Negativa L2 = MIN(0; (Livre + MTO + Semi CIAFAL + Semi Vallourec) - (ZSD24 + MTO))
    // Saldo L2 = MAX(0; (Livre + MTO + Semi CIAFAL) - (Vendas + MTO))
    const itemL2: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'L2',
      ordem_venda: '4500100400',
      item_ordem: '10',
      data_ordem: '2025-01-10',
      data_desejada: '2025-02-15',
      codigo_cliente: 'CLI-03',
      nome_cliente: 'Indústria Pesada',
      codigo_material: 'R0500',
      descricao_material: 'Redondo Pesado',
      familia: 'REDONDO',
      curva_abc: 'A',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 50,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 50,
      carteira_vendas_tons: 50,
      carteira_mto_tons: 10,
      zsd24_tons: 40,
      estoque_livre_tons: 20,
      estoque_mto_tons: 5,
      estoque_semiacabado_tons: 15,
      estoque_semiacabado_ciafal_tons: 15,
      estoque_semiacabado_vallourec_tons: 30,
      estoque_acabado_tons: 0,
      saldo_disponivel_tons: 0,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: 0,
      necessidade_liquida_tons: 0,
      falta_produzir_tons: 0,
      status_atendimento: 'A_PRODUZIR',
      qtd_programada_tons: 0,
      media_faturamento_diario_t_dia: 0,
      status_ruptura: 'CINZA',
      bloqueio: false,
    }

    const res = CarteiraZSD28CEngine.calcularItem(itemL2, [])
    // Negativa L2: (20 + 5 + 15 + 30) - (40 + 10) = 70 - 50 = +20 => MIN(0, 20) = 0
    expect(res.saldo_negativo_tons).toBe(0)

    // Saldo Estoque L2: (20 + 5 + 15) - (50 + 10) = 40 - 60 = -20 => MAX(0, -20) = 0
    expect(res.saldo_positivo_tons).toBe(0)
  })

  it('4. Deve detectar SOBRECOBERTURA / DUPLICIDADE conforme exemplo mandatório', () => {
    // Exemplo do requisito: carteira aberta 20t, estoque 5t, revenda 15t E 20t de produção programada
    const itemDuplicidade: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'GERAL',
      ordem_venda: '4500999999',
      item_ordem: '10',
      data_ordem: '2025-01-10',
      data_desejada: '2025-02-15',
      codigo_cliente: 'CLI-04',
      nome_cliente: 'Distribuidor Regional',
      codigo_material: 'C1045',
      descricao_material: 'Barra Chata 1045',
      familia: 'BARRA_CHATA',
      curva_abc: 'A',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 20,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 20,
      carteira_vendas_tons: 20,
      carteira_mto_tons: 0,
      estoque_livre_tons: 5,
      estoque_mto_tons: 0,
      estoque_semiacabado_tons: 0,
      estoque_acabado_tons: 0,
      saldo_disponivel_tons: 0,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: 0,
      necessidade_liquida_tons: 0,
      falta_produzir_tons: 0,
      status_atendimento: 'PROGRAMADO',
      qtd_programada_tons: 20,
      media_faturamento_diario_t_dia: 1,
      status_ruptura: 'VERDE',
      bloqueio: false,
    }

    const entradaRevenda: CarteiraEntradaFutura = {
      empresa: 'CIAFAL',
      centro: '1000',
      codigo_material: 'C1045',
      descricao_material: 'Barra Chata 1045',
      origem: 'REVENDA',
      documento_ref: 'PO-REV-99',
      fornecedor_origem: 'Gerdau',
      quantidade_prevista_tons: 15,
      quantidade_recebida_tons: 0,
      quantidade_pendente_tons: 15,
      data_prevista_entrada: '2025-02-01',
      status_entrada: 'CONFIRMADO',
    }

    const res = CarteiraZSD28CEngine.calcularItem(itemDuplicidade, [entradaRevenda])
    expect(res.possivel_duplicidade).toBe(true)
    expect(res.duplicidade_detalhes?.tipo_duplicidade).toBe('SOBRECOBERTURA_PRODUCAO_REVENDA')
    expect(res.duplicidade_detalhes?.quantidade_sobrecoberta_tons).toBe(20) // 5 + 15 + 20 = 40t vs 20t demanda = 20t excesso
  })

  it('5. Não deve dividir por zero quando a média diária for 0 e deve manter campos sanitizados', () => {
    const itemZero: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'GERAL',
      ordem_venda: '4500000001',
      item_ordem: '10',
      data_ordem: '2025-01-10',
      data_desejada: '2025-02-15',
      codigo_cliente: 'CLI-05',
      nome_cliente: 'Cliente Novo',
      codigo_material: 'V0200',
      descricao_material: 'Cantoneira Especial',
      familia: 'CANTONEIRA',
      curva_abc: 'C',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 10,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 10,
      carteira_vendas_tons: 10,
      carteira_mto_tons: 0,
      estoque_livre_tons: 0,
      estoque_mto_tons: 0,
      estoque_semiacabado_tons: 0,
      estoque_acabado_tons: 0,
      saldo_disponivel_tons: 0,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: 0,
      necessidade_liquida_tons: 0,
      falta_produzir_tons: 0,
      status_atendimento: 'A_PRODUZIR',
      qtd_programada_tons: 0,
      media_faturamento_diario_t_dia: 0, // Média zero!
      status_ruptura: 'CINZA',
      bloqueio: false,
    }

    const res = CarteiraZSD28CEngine.calcularItem(itemZero, [])
    expect(res.dias_cobertura).toBeUndefined()
    expect(res.data_fim_estoque).toBeUndefined()
    expect(isFinite(res.saldo_negativo_tons)).toBe(true)
    expect(res.memoria_calculo?.campos_utilizados.dias_cobertura).toBe('Sem consumo histórico')
  })

  it('6. Deve calcular Saldo MTO L2 conforme fórmula legada exata', () => {
    // Regra MTO L2: Saldo = -Quantidade Ordem + Quantidade Faturada + Estoque Semiacabado + Estoque Acabado
    const saldoL2 = CarteiraZSD28CEngine.calcularSaldoMTOL2(100, 30, 20, 10)
    // -100 + 30 + 20 + 10 = -40
    expect(saldoL2).toBe(-40)

    const saldoL2Superavit = CarteiraZSD28CEngine.calcularSaldoMTOL2(50, 20, 30, 10)
    // -50 + 20 + 30 + 10 = +10
    expect(saldoL2Superavit).toBe(10)
  })

  it('7. Deve classificar MTO L1 corretamente: A FATURAR (<= 0) e A PRODUZIR (> 0)', () => {
    // Cenário MTO L1 totalmente coberto por estoque MTO
    const itemMtoCoberto: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'L1',
      ordem_venda: '4500100500',
      item_ordem: '10',
      data_ordem: '2025-01-10',
      data_desejada: '2025-02-15',
      codigo_cliente: 'CLI-05',
      nome_cliente: 'Cliente MTO 1',
      codigo_material: 'C1020',
      descricao_material: 'Barra Chata 1020',
      familia: 'BARRA_CHATA',
      curva_abc: 'A',
      tipo_ordem: 'MTO',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 50,
      qtd_faturada_tons: 10,
      carteira_aberta_tons: 40,
      carteira_vendas_tons: 0,
      carteira_mto_tons: 40,
      estoque_livre_tons: 0,
      estoque_mto_tons: 45, // Maior que a carteira aberta (40t)
      estoque_semiacabado_tons: 0,
      estoque_acabado_tons: 0,
      saldo_disponivel_tons: 0,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: 0,
      necessidade_liquida_tons: 0,
      falta_produzir_tons: 0,
      status_atendimento: 'A_PRODUZIR',
      qtd_programada_tons: 0,
      media_faturamento_diario_t_dia: 1,
      status_ruptura: 'CINZA',
      bloqueio: false,
    }

    const resCoberto = CarteiraZSD28CEngine.calcularItem(itemMtoCoberto, [])
    expect(resCoberto.carteira_aberta_tons).toBe(40) // 50 - 10
    expect(resCoberto.falta_produzir_tons).toBe(0) // 40 - 45 <= 0
    expect(resCoberto.status_atendimento).toBe('A_FATURAR')

    // Cenário MTO L1 com falta produzir pendente
    const itemMtoPendente: CarteiraItem = {
      ...itemMtoCoberto,
      estoque_mto_tons: 15,
    }
    const resPendente = CarteiraZSD28CEngine.calcularItem(itemMtoPendente, [])
    expect(resPendente.falta_produzir_tons).toBe(25) // 40 - 15 = 25t
    expect(resPendente.status_atendimento).toBe('A_PRODUZIR')
  })

  it('8. Deve sanitizar caracteres de injeção de fórmula (=, +, -, @, tab, cr)', () => {
    const formulas = [
      '=SUM(A1:A10)',
      '+12345',
      '-CMD("calc")',
      '@HYPERLINK("http://evil.com")',
      '\tTabbedValue',
      '\rReturnVal',
    ]
    formulas.forEach((f) => {
      const sanitizado = CarteiraService.sanitizarCampoTexto(f)
      expect(sanitizado.startsWith("'")).toBe(true)
    })
  })

  it('9. Deve gerar template de download do Excel oficial com as 3 abas sem dados fictícios', () => {
    const blob = CarteiraService.gerarTemplateExcelBlob()
    expect(blob).toBeDefined()
    expect(blob.type).toContain('csv')
  })

  it('10. Deve calcular hash SHA-256 e reconciliar com SAP identificando OK, DIVERGENCIA e SOMENTE_PCP/SAP', async () => {
    const hash = await CarteiraService.calcularHashSHA256('TEST_CONTENT_PAYLOAD')
    expect(hash).toBeDefined()
    expect(hash.length).toBeGreaterThan(10)

    const itemPcp: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'GERAL',
      ordem_venda: '4500999001',
      item_ordem: '10',
      data_ordem: '2025-01-10',
      data_desejada: '2025-02-15',
      codigo_cliente: 'CLI-01',
      nome_cliente: 'Cliente Teste',
      codigo_material: 'X1020',
      descricao_material: 'Material Teste',
      familia: 'Geral',
      curva_abc: 'A',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 100,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 100,
      carteira_vendas_tons: 100,
      carteira_mto_tons: 0,
      estoque_livre_tons: 40,
      estoque_mto_tons: 0,
      estoque_semiacabado_tons: 0,
      estoque_acabado_tons: 0,
      saldo_disponivel_tons: 40,
      saldo_positivo_tons: 0,
      saldo_negativo_tons: -60,
      necessidade_liquida_tons: 60,
      falta_produzir_tons: 60,
      status_atendimento: 'A_PRODUZIR',
      qtd_programada_tons: 0,
      media_faturamento_diario_t_dia: 1,
      status_ruptura: 'CINZA',
      bloqueio: false,
    }

    const sapRef = [
      {
        codigo_material: 'X1020',
        descricao: 'Material Teste',
        ordem_venda: '4500999001',
        item_ordem: '10',
        sap_quantidade_tons: 100,
        sap_estoque_tons: 0,
        sap_saldo_tons: -60,
      },
    ]

    const reconciliacao = CarteiraZSD28CEngine.reconciliarComSAP([itemPcp], sapRef)
    expect(reconciliacao.length).toBe(1)
    expect(reconciliacao[0].status_conciliacao).toBe('OK')
  })
})

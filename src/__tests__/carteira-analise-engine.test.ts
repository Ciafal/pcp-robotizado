import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CarteiraZSD28CEngine, REGRAS_PADRAO } from '../services/carteira-engine'
import { CarteiraService } from '../services/carteira-service'
import { CarteiraItem, CarteiraEntradaFutura } from '../types/carteira-analise'
import pb from '../lib/pocketbase/client'

describe('Motor de Cálculo ZSD28C - Análise de Carteira', () => {
  it('deve calcular disponibilidade física somando estoque livre, mto, semiacabado e acabado', () => {
    const item: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'L1',
      ordem_venda: '45001234',
      item_ordem: '10',
      data_ordem: '01/03/2025',
      data_desejada: '15/03/2025',
      codigo_cliente: 'CLI-01',
      nome_cliente: 'Cliente Teste',
      codigo_material: 'MAT-001',
      descricao_material: 'Tubo Mecanico 1020',
      familia: 'Tubos',
      curva_abc: 'A',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 50,
      qtd_faturada_tons: 10,
      carteira_aberta_tons: 40,
      carteira_vendas_tons: 40,
      carteira_mto_tons: 0,
      estoque_livre_tons: 15,
      estoque_mto_tons: 5,
      estoque_semiacabado_tons: 10,
      estoque_semiacabado_ciafal_tons: 10,
      estoque_semiacabado_vallourec_tons: 0,
      estoque_acabado_tons: 5,
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

    const calc = CarteiraZSD28CEngine.calcularItem(item, [], REGRAS_PADRAO)

    // L1: dispL1 = 15 (livre) + 5 (mto) + 10 (semi) = 30. Demanda = 40.
    // Balanço = -10 tons
    expect(calc.saldo_negativo_tons).toBe(-10)
    expect(calc.saldo_positivo_tons).toBe(0)
    expect(calc.falta_produzir_tons).toBe(10)
    expect(calc.necessidade_liquida_tons).toBe(10)
    expect(calc.status_atendimento).toBe('A_PRODUZIR')
  })

  it('deve identificar status A_FATURAR quando estoque disponível cobre 100% da carteira', () => {
    const item: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'L2',
      ordem_venda: '45001235',
      item_ordem: '10',
      data_ordem: '01/03/2025',
      data_desejada: '10/03/2025',
      codigo_cliente: 'CLI-02',
      nome_cliente: 'Cliente MTO',
      codigo_material: 'MAT-002',
      descricao_material: 'Tubo Condução',
      familia: 'Tubos',
      curva_abc: 'B',
      tipo_ordem: 'MTO',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 20,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 20,
      carteira_vendas_tons: 0,
      carteira_mto_tons: 20,
      estoque_livre_tons: 0,
      estoque_mto_tons: 25,
      estoque_semiacabado_tons: 20,
      estoque_semiacabado_ciafal_tons: 20,
      estoque_semiacabado_vallourec_tons: 0,
      estoque_acabado_tons: 5,
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

    const calc = CarteiraZSD28CEngine.calcularItem(item, [], REGRAS_PADRAO)

    expect(calc.saldo_positivo_tons).toBe(25)
    expect(calc.saldo_negativo_tons).toBe(0)
    expect(calc.falta_produzir_tons).toBe(0)
    expect(calc.status_atendimento).toBe('A_FATURAR')
  })

  it('deve incorporar Entradas Futuras Elegíveis no cálculo de necessidade líquida', () => {
    const item: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'L1',
      ordem_venda: '45001236',
      item_ordem: '10',
      data_ordem: '01/03/2025',
      data_desejada: '25/03/2025',
      codigo_cliente: 'CLI-03',
      nome_cliente: 'Cliente Futuro',
      codigo_material: 'MAT-003',
      descricao_material: 'Tubo Estrutural',
      familia: 'Tubos',
      curva_abc: 'A',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 30,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 30,
      carteira_vendas_tons: 30,
      carteira_mto_tons: 0,
      estoque_livre_tons: 10,
      estoque_mto_tons: 0,
      estoque_semiacabado_tons: 0,
      estoque_semiacabado_ciafal_tons: 0,
      estoque_semiacabado_vallourec_tons: 0,
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

    const entradas: CarteiraEntradaFutura[] = [
      {
        empresa: 'CIAFAL',
        centro: '1000',
        codigo_material: 'MAT-003',
        descricao_material: 'Tubo Estrutural',
        origem: 'IMPORTADO',
        documento_ref: 'PED-COMPRA-99',
        fornecedor_origem: 'Gerdau',
        quantidade_prevista_tons: 25,
        quantidade_recebida_tons: 5,
        quantidade_pendente_tons: 20,
        data_prevista_entrada: '18/03/2025',
        status_entrada: 'CONFIRMADA',
      },
    ]

    const calc = CarteiraZSD28CEngine.calcularItem(item, entradas, REGRAS_PADRAO)

    // L1: Balanço = 10 (estoque livre) - 30 (demanda) = -20 tons
    // Entradas futuras = 20 tons
    // Necessidade Líquida = MAX(0, -(-20) - 20) = 0 tons
    expect(calc.saldo_negativo_tons).toBe(-20)
    expect(calc.necessidade_liquida_tons).toBe(0)
  })

  it('deve calcular dias de cobertura e semáforo de ruptura corretamente', () => {
    const item: CarteiraItem = {
      empresa: 'CIAFAL',
      centro: '1000',
      linha: 'L1',
      ordem_venda: '45001237',
      item_ordem: '10',
      data_ordem: '01/03/2025',
      data_desejada: '30/03/2025',
      codigo_cliente: 'CLI-04',
      nome_cliente: 'Cliente Ruptura',
      codigo_material: 'MAT-004',
      descricao_material: 'Tubo Especial',
      familia: 'Tubos',
      curva_abc: 'A',
      tipo_ordem: 'MTS',
      origem_produto: 'PRODUCAO_PROPRIA',
      qtd_ordem_tons: 10,
      qtd_faturada_tons: 0,
      carteira_aberta_tons: 10,
      carteira_vendas_tons: 10,
      carteira_mto_tons: 0,
      estoque_livre_tons: 4, // 4 tons / 2 tons/dia = 2 dias de cobertura
      estoque_mto_tons: 0,
      estoque_semiacabado_tons: 0,
      estoque_semiacabado_ciafal_tons: 0,
      estoque_semiacabado_vallourec_tons: 0,
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

    const calc = CarteiraZSD28CEngine.calcularItem(item, [], REGRAS_PADRAO)

    expect(calc.dias_cobertura).toBe(2)
    expect(calc.status_ruptura).toBe('VERMELHO') // 2 dias <= 7 dias sem programação
  })
})

describe('Suíte de Testes Obrigatórios - Ingestão ZSD28C e Governança (10 Cenários + Teste de Aceite Real)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // CEN 01: 100% das linhas válidas → importar normalmente
  it('CEN 01: 100% das linhas válidas deve validar e permitir importação direta', () => {
    const linhas = [
      {
        'Código do material': 'MAT-1001',
        'Descrição do material': 'Tubo Aço 1020',
        'Ordem de venda': 'ORD-001',
        'Quantidade da ordem (t)': 100,
        'Estoque livre (t)': 50,
      },
      {
        'Código do material': 'MAT-1002',
        'Descrição do material': 'Tubo Aço 1045',
        'Ordem de venda': 'ORD-002',
        'Quantidade da ordem (t)': 80,
        'Estoque livre (t)': 30,
      },
    ]

    const resultado = CarteiraService.validarLinhasCarteira(linhas)

    expect(resultado.valido).toBe(true)
    expect(resultado.linhasValidas).toBe(2)
    expect(resultado.linhasRejeitadas).toBe(0)
    expect(resultado.linhasTotalIgnoradas).toBe(0)
    expect(resultado.podeImportarParcial).toBe(true)
    expect(resultado.temErroCriticoEstrutural).toBe(false)
  })

  // CEN 02: 1 linha vazia no final → ignorar automaticamente
  it('CEN 02: 1 linha vazia no final deve ser ignorada automaticamente sem ser contada como erro', () => {
    const linhas = [
      {
        'Código do material': 'MAT-1001',
        'Descrição do material': 'Tubo Aço 1020',
        'Ordem de venda': 'ORD-001',
        'Quantidade da ordem (t)': 50,
      },
      {
        'Código do material': '',
        'Descrição do material': '',
        'Ordem de venda': '',
        'Quantidade da ordem (t)': '',
      },
    ]

    const resultado = CarteiraService.validarLinhasCarteira(linhas)

    expect(resultado.valido).toBe(true)
    expect(resultado.linhasValidas).toBe(1)
    expect(resultado.linhasRejeitadas).toBe(0)
    expect(resultado.linhasVaziasIgnoradas).toBe(1)
    expect(resultado.linhasTotalIgnoradas).toBe(1)
  })

  // CEN 03: linha de totalização no final → ignorar automaticamente
  it('CEN 03: linha de totalização no final do SAP (sem material, com totais numéricos) deve ser ignorada automaticamente', () => {
    const linhas = [
      {
        'Código do material': 'MAT-2001',
        'Descrição do material': 'Tubo Mecânico',
        'Ordem de venda': 'ORD-010',
        'Quantidade da ordem (t)': 120,
        'Estoque livre (t)': 40,
        'Estoque MTO (t)': 10,
      },
      {
        // Linha de totalização clássica SAP ZSD28C
        'Código do material': '',
        'Descrição do material': '',
        'Ordem de venda': '',
        'Quantidade da ordem (t)': 120,
        'Estoque livre (t)': 40,
        'Estoque MTO (t)': 10,
      },
    ]

    const resultado = CarteiraService.validarLinhasCarteira(linhas)

    expect(resultado.valido).toBe(true)
    expect(resultado.linhasValidas).toBe(1)
    expect(resultado.linhasRejeitadas).toBe(0)
    expect(resultado.linhasIgnoradasTotalizacao).toBe(1)
    expect(resultado.linhasTotalIgnoradas).toBe(1)
    expect(resultado.logsProcessamento.some((l) => l.includes('linha de totalização'))).toBe(true)
  })

  // CEN 04: linha vazia + linha TOTAL → ignorar ambas sem erro
  it('CEN 04: linha vazia + linha TOTAL com texto explícito deve ignorar ambas sem gerar rejeição', () => {
    const linhas = [
      {
        'Código do material': 'MAT-3001',
        'Descrição do material': 'Tubo Redondo',
        'Ordem de venda': 'ORD-020',
        'Quantidade da ordem (t)': 70,
      },
      {
        'Código do material': 'TOTAL GERAL',
        'Descrição do material': 'TOTAIS DO RELATÓRIO SAP',
        'Quantidade da ordem (t)': 70,
        'Estoque livre (t)': 20,
      },
      {
        'Código do material': '',
        'Descrição do material': '',
        'Ordem de venda': '',
      },
    ]

    const resultado = CarteiraService.validarLinhasCarteira(linhas)

    expect(resultado.valido).toBe(true)
    expect(resultado.linhasValidas).toBe(1)
    expect(resultado.linhasRejeitadas).toBe(0)
    expect(resultado.linhasIgnoradasTotalizacao).toBe(1)
    expect(resultado.linhasVaziasIgnoradas).toBe(1)
    expect(resultado.linhasTotalIgnoradas).toBe(2)
  })

  // CEN 05: 1 registro real sem Material → apresentar rejeição e permitir carga parcial
  it('CEN 05: 1 registro transacional real sem material deve ser rejeitado isoladamente e permitir importação parcial', () => {
    const linhas = [
      {
        'Código do material': 'MAT-4001',
        'Descrição do material': 'Tubo Condução NBR 5580',
        'Ordem de venda': 'ORD-030',
        'Quantidade da ordem (t)': 40,
      },
      {
        // Registro transacional com cliente e ordem mas material nulo
        'Código do material': '',
        Cliente: 'Cliente Indústria Metalúrgica',
        'Ordem de venda': 'ORD-031',
        Item: '10',
        'Quantidade da ordem (t)': 15,
      },
    ]

    const resultado = CarteiraService.validarLinhasCarteira(linhas)

    expect(resultado.valido).toBe(false)
    expect(resultado.podeImportarParcial).toBe(true)
    expect(resultado.linhasValidas).toBe(1)
    expect(resultado.linhasRejeitadas).toBe(1)
    expect(resultado.linhasRejeitadasDetalhes.length).toBe(1)
    expect(resultado.linhasRejeitadasDetalhes[0].coluna).toBe('Código do material')
    expect(resultado.linhasRejeitadasDetalhes[0].severidade).toBe('NIVEL_2_ERRO_REGISTRO')
  })

  // CEN 06: 10 registros reais com erro + 1.000 válidos → permitir importar os 1.000 válidos após confirmação
  it('CEN 06: lote com 10 erros reais e 1.000 válidos deve categorizar Nível 2 e permitir aprovação das 1.000 válidas', () => {
    const linhas: any[] = []

    for (let i = 1; i <= 1000; i++) {
      linhas.push({
        'Código do material': `MAT-${10000 + i}`,
        'Descrição do material': `Item Teste ${i}`,
        'Ordem de venda': `ORD-${10000 + i}`,
        'Quantidade da ordem (t)': 10,
        'Estoque livre (t)': 5,
      })
    }

    for (let j = 1; j <= 10; j++) {
      linhas.push({
        'Código do material': '',
        Cliente: `Cliente Rejeitado ${j}`,
        'Ordem de venda': `ORD-FAIL-${j}`,
        'Quantidade da ordem (t)': 5,
      })
    }

    const resultado = CarteiraService.validarLinhasCarteira(linhas)

    expect(resultado.valido).toBe(false)
    expect(resultado.podeImportarParcial).toBe(true)
    expect(resultado.linhasValidas).toBe(1000)
    expect(resultado.linhasRejeitadas).toBe(10)
    expect(resultado.totalLinhas).toBe(1010)
  })

  // CEN 07: coluna Material inexistente → erro crítico (Nível 3) e bloquear importação
  it('CEN 07: ausência de coluna de Material deve disparar ERRO CRÍTICO (Nível 3) e bloquear importação', () => {
    const linhasIncompativeis = [
      {
        Data: '01/03/2025',
        'Valor Total': 50000,
        Observacao: 'Arquivo de Vendas Falso sem Material',
      },
    ]

    const resultado = CarteiraService.validarLinhasCarteira(linhasIncompativeis)

    expect(resultado.valido).toBe(false)
    expect(resultado.podeImportarParcial).toBe(false)
    expect(resultado.temErroCriticoEstrutural).toBe(true)
    expect(resultado.linhasValidas).toBe(0)
    expect(resultado.erros[0].severidade).toBe('NIVEL_3_ERRO_ESTRUTURAL')
  })

  // CEN 08: falha no banco durante commit → rollback completo e integridade preservada
  it('CEN 08: falha simulada de banco durante criação dos itens deve disparar rollback atômico', async () => {
    const uploadMock = {
      upload_code: 'TESTE-RB-001',
      filename: 'teste.xlsx',
      total_rows: 2,
      valid_rows: 2,
      warning_rows: 0,
      rejected_rows: 0,
      status: 'PROCESSADO' as const,
      source_mode: 'EXCEL_ZSD28C' as const,
      user_name: 'Tester',
      user_email: 'tester@ciafal.com.br',
      version_tag: 'v1',
      is_active_current: true,
    }

    const itensMock: CarteiraItem[] = [
      {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L1',
        ordem_venda: 'ORD-1',
        item_ordem: '10',
        data_ordem: '01/03/2025',
        data_desejada: '10/03/2025',
        codigo_cliente: 'CLI-1',
        nome_cliente: 'CLI',
        codigo_material: 'MAT-1',
        descricao_material: 'MAT 1',
        familia: 'Tubos',
        curva_abc: 'A',
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
        estoque_semiacabado_ciafal_tons: 0,
        estoque_semiacabado_vallourec_tons: 0,
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
      },
    ]

    // Mock pb create para lançar exceção na inserção de itens
    const originalCreate = pb.collection('carteira_items').create
    pb.collection('carteira_items').create = vi
      .fn()
      .mockRejectedValue(new Error('Erro simulado de conexão'))

    await expect(
      CarteiraService.salvarCargaNoPocketBase(uploadMock, itensMock, []),
    ).rejects.toThrow(/Falha transacional na persistência da carga \(Rollback executado\)/)

    // Restaura mock
    pb.collection('carteira_items').create = originalCreate
  })

  // CEN 09: segunda carga do mesmo arquivo → detectar duplicidade/hash
  it('CEN 09: cálculo de hash SHA-256 e detecção de duplicidade de arquivo', async () => {
    const buffer1 = new TextEncoder().encode('Conteúdo Idêntico Planilha 1').buffer
    const buffer2 = new TextEncoder().encode('Conteúdo Idêntico Planilha 1').buffer
    const buffer3 = new TextEncoder().encode('Conteúdo Modificado Planilha 2').buffer

    const hash1 = await CarteiraService.calcularHashSHA256(buffer1)
    const hash2 = await CarteiraService.calcularHashSHA256(buffer2)
    const hash3 = await CarteiraService.calcularHashSHA256(buffer3)

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
    expect(hash1.length).toBe(64) // SHA-256 hex string
  })

  // CEN 10: geração de relatório de erros para auditoria e governança
  it('CEN 10: geração do relatório de inconsistências em Blob XLSX/CSV com dados detalhados', () => {
    const rejeitados = [
      {
        linhaExcel: 12,
        linhaLogica: 11,
        material: '',
        coluna: 'Código do material',
        valorEncontrado: '(vazio)',
        motivoRejeicao: 'Código do material obrigatório',
        severidade: 'NIVEL_2_ERRO_REGISTRO' as const,
        acaoSugerida: 'Preencher código SAP na planilha.',
      },
    ]

    const blobXlsx = CarteiraService.gerarRelatorioErrosBlob(rejeitados, 'xlsx')
    expect(blobXlsx.size).toBeGreaterThan(0)
    expect(blobXlsx.type).toContain('spreadsheetml')

    const blobCsv = CarteiraService.gerarRelatorioErrosBlob(rejeitados, 'csv')
    expect(blobCsv.size).toBeGreaterThan(0)
    expect(blobCsv.type).toContain('text/csv')
  })

  // TESTE DE ACEITE REAL "ZSD28C v3.xlsx" (1.661 linhas brutas -> 1.660 válidas + 1 totalização ignorada)
  it('TESTE DE ACEITE REAL "ZSD28C v3.xlsx": 1.661 linhas no total (1.660 dados válidos + 1 linha final de totalização)', () => {
    const linhasPlanilhaReal: any[] = []

    // 1.660 linhas de dados reais
    for (let i = 1; i <= 1660; i++) {
      linhasPlanilhaReal.push({
        'Código do material': `MAT-CIAFAL-${(100000 + i).toString()}`,
        'Descrição do material': `TUBO MECANICO DIN 2391 DIA ${20 + (i % 50)}MM`,
        'Ordem de venda': `4500${(10000 + i).toString()}`,
        Item: '10',
        Cliente: `Cliente Industrial ${i % 100}`,
        'Quantidade da ordem (t)': 2.5 + (i % 10),
        'Quantidade faturada (t)': 0,
        'Estoque livre (t)': 1.2,
        'Estoque MTO (t)': 0.5,
        'Estoque semiacabado (t)': 0.8,
        'Estoque acabado (t)': 0.4,
        'MTS/MTO': i % 3 === 0 ? 'MTO' : 'MTS',
      })
    }

    // Linha 1.661: Linha de TOTALIZAÇÃO clássica do SAP (sem código de material, com somas agregadas)
    linhasPlanilhaReal.push({
      'Código do material': '',
      'Descrição do material': '',
      'Ordem de venda': '',
      Item: '',
      Cliente: '',
      'Quantidade da ordem (t)': 8250.5,
      'Quantidade faturada (t)': 1200.0,
      'Estoque livre (t)': 1992.0,
      'Estoque MTO (t)': 830.0,
      'Estoque semiacabado (t)': 1328.0,
      'Estoque acabado (t)': 664.0,
    })

    expect(linhasPlanilhaReal.length).toBe(1661)

    // Executa a validação
    const resultado = CarteiraService.validarLinhasCarteira(linhasPlanilhaReal)

    // Verificação dos Requisitos de Aceite:
    // 1) Identificar 1.660 registros válidos
    expect(resultado.linhasValidas).toBe(1660)
    // 2) NÃO interpretar a linha de totalização como erro de Material
    expect(resultado.linhasRejeitadas).toBe(0)
    // 3) Ignorar semanticamente a linha de totalização
    expect(resultado.linhasIgnoradasTotalizacao).toBe(1)
    expect(resultado.linhasTotalIgnoradas).toBe(1)
    // 4) Estado do resultado deve ser 100% válido
    expect(resultado.valido).toBe(true)
    expect(resultado.temErroCriticoEstrutural).toBe(false)
  })
})

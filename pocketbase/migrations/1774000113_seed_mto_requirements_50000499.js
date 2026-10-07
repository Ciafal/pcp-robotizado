migrate(
  (app) => {
    // Inserção idempotente dos 2 requisitos de homologação para o Pedido 50000499 (Item 10)
    const col = app.findCollectionByNameOrId('mto_requirements')
    if (!col) return

    const politicaQualidadeTexto =
      'Buscar sempre o atendimento dos requisitos para satisfazer os clientes, produzir e comercializar laminados a quente, utilizando recursos de forma otimizada, satisfazendo as partes interessadas, melhorando continuamente.'

    // Requisito 01
    let existeReq1 = false
    try {
      const rec = app.findFirstRecordByFilter(
        'mto_requirements',
        "pedido_numero = '50000499' && requisito_numero = 1",
      )
      if (rec) existeReq1 = true
    } catch (_) {
      existeReq1 = false
    }

    if (!existeReq1) {
      const rec1 = new Record(col, {
        requisito_id: 'REQ-01',
        requisito_numero: 1,
        pedido_numero: '50000499',
        item_pedido: '10',
        codigo_documento: 'MTO-50000499-01',
        cliente_nome: 'CONEXOES SANTA MARTA IND E COM LTDA',
        produto: 'CANTONEIRA',
        aplicacao: 'NÃO INFORMADA',
        classe_aco: '1006/1022M',
        responsavel_consulta: 'Emiraldo Xavier',
        norma_aplicavel: 'NBR 15980',
        numero_pecas: null,
        quantidade: 70,
        data_consulta: '05/06/2026',
        descricao_material: 'CANT. 25,4 X 4,50 -1006/1022- MTO',
        condicao: 'NBR 7007',
        composicao_quimica: {
          elementos: [
            { elemento: 'C', min: null, max: null },
            { elemento: 'Mn', min: null, max: null },
            { elemento: 'Si', min: null, max: null },
            { elemento: 'P', min: null, max: null },
            { elemento: 'S', min: null, max: null },
            { elemento: 'Cr', min: null, max: null },
            { elemento: 'Ni', min: null, max: null },
            { elemento: 'Mo', min: null, max: null },
            { elemento: 'Al', min: null, max: null },
            { elemento: 'B', min: null, max: null },
            { elemento: 'Cu', min: null, max: null },
            { elemento: 'H', min: null, max: null },
          ],
        },
        dimensoes_tolerancias: {
          raio_canto: null,
          romboidade: null,
          altura: null,
          largura: null,
          unidade: 'mm',
        },
        comprimento: {
          comprimento_principal: 4.8,
          tolerancia_mais: 0.1,
          tolerancia_menos: 0.0,
          multiplo_1: null,
          multiplo_2: null,
          multiplo_3: null,
          curtos_min: null,
          curtos_max: null,
          curtos_pct: null,
          unidade: 'm',
        },
        garantias_superficie: {
          aplicacao: 'NÃO INFORMADA',
          padrao_qualidade_superficial: 'QS 3',
          observacoes: null,
        },
        garantias_internas: {
          garantia_interna: null,
          metodo: null,
          valor_maximo: null,
          queda_eco_fundo: null,
        },
        garantias_especificas: {
          ensaio_tracao: {
            lr_mpa: 400,
            le_mpa: 250,
            alongamento_pct: 20,
          },
          dureza: {
            tipo_dureza: null,
            maximo: null,
            minimo: null,
          },
          ensaio_charpy: {
            orientacao: null,
            temperatura_c: null,
            valor_minimo_j: null,
          },
          caracterizacao_metalurgica: {
            tamanho_grao_austenitico: null,
            descarbonetacao: null,
            microinclusoes_astm_e45_a: {
              af: null,
              bf: null,
              cf: null,
              df: null,
              ag: null,
              bg: null,
              cg: null,
              dg: null,
            },
          },
          temperabilidade: {
            pontos_mm: [
              { pos_mm: '1,5', valor: null },
              { pos_mm: '3', valor: null },
              { pos_mm: '5', valor: null },
              { pos_mm: '7', valor: null },
              { pos_mm: '9', valor: null },
              { pos_mm: '11', valor: null },
              { pos_mm: '13', valor: null },
              { pos_mm: '15', valor: null },
              { pos_mm: '20', valor: null },
              { pos_mm: '25', valor: null },
              { pos_mm: '30', valor: null },
              { pos_mm: '35', valor: null },
              { pos_mm: '40', valor: null },
            ],
            escala_polegada_16: Array.from({ length: 32 }, (_, i) => ({
              pos: i + 1,
              valor: null,
            })),
          },
        },
        politica_qualidade: politicaQualidadeTexto,
        origem_dados: 'Massa de Homologação MTO',
        criado_por_usuario: 'sistema.homologacao@ciafal.com.br',
      })
      app.save(rec1)
    }

    // Requisito 02
    let existeReq2 = false
    try {
      const rec = app.findFirstRecordByFilter(
        'mto_requirements',
        "pedido_numero = '50000499' && requisito_numero = 2",
      )
      if (rec) existeReq2 = true
    } catch (_) {
      existeReq2 = false
    }

    if (!existeReq2) {
      const rec2 = new Record(col, {
        requisito_id: 'REQ-02',
        requisito_numero: 2,
        pedido_numero: '50000499',
        item_pedido: '10',
        codigo_documento: 'MTO-50000499-02',
        cliente_nome: 'CONEXOES SANTA MARTA IND E COM LTDA',
        produto: 'CANTONEIRA',
        aplicacao: 'NÃO INFORMADA',
        classe_aco: '1006/1022M',
        responsavel_consulta: 'Emiraldo Xavier',
        norma_aplicavel: 'NBR 15980',
        numero_pecas: null,
        quantidade: 30,
        data_consulta: '05/06/2026',
        descricao_material: 'CANT. 25,4 X 4,50 -1006/1022- MTO',
        condicao: 'AISI SAE J403/01',
        composicao_quimica: {
          elementos: [
            { elemento: 'C', min: null, max: null },
            { elemento: 'Mn', min: null, max: null },
            { elemento: 'Si', min: null, max: null },
            { elemento: 'P', min: null, max: null },
            { elemento: 'S', min: null, max: null },
            { elemento: 'Cr', min: null, max: null },
            { elemento: 'Ni', min: null, max: null },
            { elemento: 'Mo', min: null, max: null },
            { elemento: 'Al', min: null, max: null },
            { elemento: 'B', min: null, max: null },
            { elemento: 'Cu', min: null, max: null },
            { elemento: 'H', min: null, max: null },
          ],
        },
        dimensoes_tolerancias: {
          raio_canto: null,
          romboidade: null,
          altura: null,
          largura: null,
          unidade: 'mm',
        },
        comprimento: {
          comprimento_principal: 4.77,
          tolerancia_mais: 0.1,
          tolerancia_menos: 0.0,
          multiplo_1: null,
          multiplo_2: null,
          multiplo_3: null,
          curtos_min: null,
          curtos_max: null,
          curtos_pct: null,
          unidade: 'm',
        },
        garantias_superficie: {
          aplicacao: 'NÃO INFORMADA',
          padrao_qualidade_superficial: 'QS 3',
          observacoes: null,
        },
        garantias_internas: {
          garantia_interna: null,
          metodo: null,
          valor_maximo: null,
          queda_eco_fundo: null,
        },
        garantias_especificas: {
          ensaio_tracao: {
            lr_mpa: null,
            le_mpa: null,
            alongamento_pct: null,
          },
          dureza: {
            tipo_dureza: null,
            maximo: null,
            minimo: null,
          },
          ensaio_charpy: {
            orientacao: null,
            temperatura_c: null,
            valor_minimo_j: null,
          },
          caracterizacao_metalurgica: {
            tamanho_grao_austenitico: null,
            descarbonetacao: null,
            microinclusoes_astm_e45_a: {
              af: null,
              bf: null,
              cf: null,
              df: null,
              ag: null,
              bg: null,
              cg: null,
              dg: null,
            },
          },
          temperabilidade: {
            pontos_mm: [
              { pos_mm: '1,5', valor: null },
              { pos_mm: '3', valor: null },
              { pos_mm: '5', valor: null },
              { pos_mm: '7', valor: null },
              { pos_mm: '9', valor: null },
              { pos_mm: '11', valor: null },
              { pos_mm: '13', valor: null },
              { pos_mm: '15', valor: null },
              { pos_mm: '20', valor: null },
              { pos_mm: '25', valor: null },
              { pos_mm: '30', valor: null },
              { pos_mm: '35', valor: null },
              { pos_mm: '40', valor: null },
            ],
            escala_polegada_16: Array.from({ length: 32 }, (_, i) => ({
              pos: i + 1,
              valor: null,
            })),
          },
        },
        politica_qualidade: politicaQualidadeTexto,
        origem_dados: 'Massa de Homologação MTO',
        criado_por_usuario: 'sistema.homologacao@ciafal.com.br',
      })
      app.save(rec2)
    }

    // Também garantir que o Pedido 50000499 (item 10) esteja na carteira_items
    if (app.hasTable('carteira_items')) {
      let existeItemGrid = false
      try {
        const rec = app.findFirstRecordByFilter(
          'carteira_items',
          "ordem_venda = '50000499' && item_ordem = '10'",
        )
        if (rec) existeItemGrid = true
      } catch (_) {
        existeItemGrid = false
      }

      if (!existeItemGrid) {
        const carteiraCol = app.findCollectionByNameOrId('carteira_items')
        const recItem = new Record(carteiraCol, {
          upload_code: 'HOMOLOGACAO-MTO',
          empresa: '1000',
          centro: '1000',
          linha: 'L1',
          ordem_venda: '50000499',
          item_ordem: '10',
          data_ordem: '2026-06-05',
          data_desejada: '2026-06-20',
          codigo_cliente: 'CLI-50000499',
          nome_cliente: 'CONEXOES SANTA MARTA IND E COM LTDA',
          codigo_material: 'CANT-25.4X4.50-MTO',
          descricao_material: 'CANT. 25,4 X 4,50 -1006/1022- MTO',
          familia: 'CANTONEIRA',
          curva_abc: 'A',
          tipo_atendimento: 'MTO',
          tipo_ordem: 'MTO',
          origem_produto: 'PRODUCAO_PROPRIA',
          qtd_ordem_tons: 100, // 70 + 30
          qtd_faturada_tons: 0,
          carteira_aberta_tons: 100,
          carteira_vendas_tons: 100,
          carteira_mto_tons: 100,
          estoque_livre_tons: 0,
          estoque_mto_tons: 0,
          estoque_semiacabado_tons: 0,
          estoque_acabado_tons: 0,
          saldo_disponivel_tons: -100,
          saldo_positivo_tons: 0,
          saldo_negativo_tons: 100,
          necessidade_liquida_tons: 100,
          falta_produzir_tons: 100,
          status_atendimento: 'A_PRODUZIR',
          qtd_programada_tons: 0,
          bloqueio: false,
        })
        app.save(recItem)
      }
    }
  },
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'mto_requirements',
        "pedido_numero = '50000499'",
        '-created',
        100,
      )
      for (const r of records) {
        app.delete(r)
      }
    } catch (_) {}
    try {
      const cartRec = app.findFirstRecordByFilter(
        'carteira_items',
        "ordem_venda = '50000499' && item_ordem = '10'",
      )
      if (cartRec) app.delete(cartRec)
    } catch (_) {}
  },
)

migrate(
  (app) => {
    // 1. Atualizar a coleção pcp_cancelled_orders de forma estritamente idempotente
    const colOrders = app.findCollectionByNameOrId('pcp_cancelled_orders')
    if (colOrders) {
      let changed = false

      if (!colOrders.fields.getByName('categoria_recusa')) {
        colOrders.fields.add(
          new SelectField({
            name: 'categoria_recusa',
            required: false,
            maxSelect: 1,
            values: ['COMERCIAL', 'PCP', 'TRANSPORTE'],
          }),
        )
        changed = true
      }

      if (!colOrders.fields.getByName('motivo_recusa')) {
        colOrders.fields.add(
          new TextField({
            name: 'motivo_recusa',
            required: false,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(colOrders)
      }
    }

    // 2. Atualizar ou criar campos no catálogo de motivos pcp_cancellation_reasons_catalog
    const colCatalog = app.findCollectionByNameOrId('pcp_cancellation_reasons_catalog')
    if (colCatalog) {
      let catalogChanged = false
      if (!colCatalog.fields.getByName('categoria_recusa')) {
        colCatalog.fields.add(
          new SelectField({
            name: 'categoria_recusa',
            required: false,
            maxSelect: 1,
            values: ['COMERCIAL', 'PCP', 'TRANSPORTE'],
          }),
        )
        catalogChanged = true
      }

      if (catalogChanged) {
        app.save(colCatalog)
      }

      // Popular motivos padrão estruturados para COMERCIAL, PCP, TRANSPORTE se não existirem
      const seedMotivos = [
        // Comercial
        { categoria_recusa: 'COMERCIAL', reason: 'Preço não aceito', sort_order: 1 },
        { categoria_recusa: 'COMERCIAL', reason: 'Condição comercial', sort_order: 2 },
        { categoria_recusa: 'COMERCIAL', reason: 'Prazo comercial', sort_order: 3 },
        { categoria_recusa: 'COMERCIAL', reason: 'Preço acima do concorrente', sort_order: 4 },
        { categoria_recusa: 'COMERCIAL', reason: 'Melhores condições comerciais', sort_order: 5 },
        // PCP
        { categoria_recusa: 'PCP', reason: 'Falta de estoque', sort_order: 10 },
        { categoria_recusa: 'PCP', reason: 'Falta de matéria-prima', sort_order: 11 },
        { categoria_recusa: 'PCP', reason: 'Restrição de laminação', sort_order: 12 },
        { categoria_recusa: 'PCP', reason: 'Capacidade produtiva', sort_order: 13 },
        { categoria_recusa: 'PCP', reason: 'Sem estoque em pronta entrega', sort_order: 14 },
        { categoria_recusa: 'PCP', reason: 'Falta de data de programação', sort_order: 15 },
        { categoria_recusa: 'PCP', reason: 'Sem data de laminação', sort_order: 16 },
        { categoria_recusa: 'PCP', reason: 'Carteira mínima não atingida', sort_order: 17 },
        { categoria_recusa: 'PCP', reason: 'Atraso na data de laminação', sort_order: 18 },
        // Transporte
        { categoria_recusa: 'TRANSPORTE', reason: 'Falta de veículo', sort_order: 20 },
        { categoria_recusa: 'TRANSPORTE', reason: 'Frete não aprovado', sort_order: 21 },
        { categoria_recusa: 'TRANSPORTE', reason: 'Transportadora indisponível', sort_order: 22 },
        { categoria_recusa: 'TRANSPORTE', reason: 'Restrição de entrega', sort_order: 23 },
        { categoria_recusa: 'TRANSPORTE', reason: 'Prazo logístico incompatível', sort_order: 24 },
        { categoria_recusa: 'TRANSPORTE', reason: 'Sem carga para região', sort_order: 25 },
        { categoria_recusa: 'TRANSPORTE', reason: 'Material não retirado', sort_order: 26 },
        { categoria_recusa: 'TRANSPORTE', reason: 'Política de frete', sort_order: 27 },
      ]

      try {
        const existingRecords = app.findRecordsByFilter(
          'pcp_cancellation_reasons_catalog',
          'id != ""',
          '-created',
          200,
        )
        const existingReasons = new Set(existingRecords.map((r) => r.getString('reason')))

        for (let i = 0; i < seedMotivos.length; i++) {
          const item = seedMotivos[i]
          if (!existingReasons.has(item.reason)) {
            const newRec = new Record(colCatalog, {
              category:
                item.categoria_recusa === 'COMERCIAL'
                  ? 'Comercial'
                  : item.categoria_recusa === 'PCP'
                    ? 'PCP/Planejamento'
                    : 'Logística',
              categoria_recusa: item.categoria_recusa,
              reason: item.reason,
              default_probable_responsibility:
                item.categoria_recusa === 'COMERCIAL'
                  ? 'Comercial'
                  : item.categoria_recusa === 'PCP'
                    ? 'PCP'
                    : 'Logística',
              active: true,
              sort_order: item.sort_order,
            })
            app.save(newRec)
          } else {
            // Atualizar categoria_recusa se ainda estiver vazio
            const match = existingRecords.find((r) => r.getString('reason') === item.reason)
            if (match && !match.getString('categoria_recusa')) {
              match.set('categoria_recusa', item.categoria_recusa)
              app.save(match)
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao atualizar pcp_cancellation_reasons_catalog na migração:', e)
      }
    }
  },
  (app) => {
    // Rollback idempotente
    try {
      const col = app.findCollectionByNameOrId('pcp_cancelled_orders')
      if (col) {
        if (col.fields.getByName('categoria_recusa')) col.fields.removeByName('categoria_recusa')
        if (col.fields.getByName('motivo_recusa')) col.fields.removeByName('motivo_recusa')
        app.save(col)
      }
      const colCat = app.findCollectionByNameOrId('pcp_cancellation_reasons_catalog')
      if (colCat && colCat.fields.getByName('categoria_recusa')) {
        colCat.fields.removeByName('categoria_recusa')
        app.save(colCat)
      }
    } catch (_) {}
  },
)

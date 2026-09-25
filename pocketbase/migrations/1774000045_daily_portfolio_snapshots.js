// Migration idempotente para criar a collection daily_portfolio_snapshots
// Segue o padrão PocketBase Skip Cloud: if (!app.hasTable)

migrate(
  (app) => {
    if (app.hasTable('daily_portfolio_snapshots')) {
      return
    }

    const collection = new Collection({
      name: 'daily_portfolio_snapshots',
      type: 'base',
      system: false,
      schema: [
        {
          name: 'data',
          type: 'text',
          required: true,
        },
        {
          name: 'material',
          type: 'text',
          required: true,
        },
        {
          name: 'descricao',
          type: 'text',
        },
        {
          name: 'familia',
          type: 'text',
        },
        {
          name: 'tipo_material',
          type: 'text',
        },
        {
          name: 'curva_abc',
          type: 'select',
          maxSelect: 1,
          values: ['A', 'B', 'C'],
        },
        {
          name: 'centro',
          type: 'text',
          required: true,
        },
        {
          name: 'linha',
          type: 'text',
        },
        {
          name: 'saldo_carteira',
          type: 'number',
          required: true,
        },
        {
          name: 'estoque_disponivel',
          type: 'number',
        },
        {
          name: 'programacao_existente',
          type: 'number',
        },
        {
          name: 'producao_realizada',
          type: 'number',
        },
        {
          name: 'origem_dados',
          type: 'text',
        },
        {
          name: 'is_demo',
          type: 'bool',
        },
      ],
      listRule: '',
      viewRule: '',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('daily_portfolio_snapshots')
      if (collection) {
        app.delete(collection)
      }
    } catch (e) {
      // Silencia se não encontrar
    }
  },
)

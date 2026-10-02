/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Migration idempotente para registrar/garantir a collection carteira_minima_consultas ou assegurar integridade
    if (!app.hasTable('carteira_minima_consultas')) {
      const collection = new Collection({
        name: 'carteira_minima_consultas',
        type: 'base',
        schema: [
          {
            name: 'tipo_consulta',
            type: 'text',
            required: false,
          },
          {
            name: 'total_itens',
            type: 'number',
            required: false,
          },
          {
            name: 'carteira_total_tons',
            type: 'number',
            required: false,
          },
          {
            name: 'saldo_total_tons',
            type: 'number',
            required: false,
          },
          {
            name: 'filtros_aplicados',
            type: 'json',
            required: false,
          },
          {
            name: 'solicitante',
            type: 'text',
            required: false,
          },
          {
            name: 'origem_dados',
            type: 'text',
            required: false,
          },
        ],
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('carteira_minima_consultas')
      if (col) {
        app.delete(col)
      }
    } catch {
      // noop se não existir
    }
  },
)

migrate(
  (app) => {
    // Garantir coleção line_raw_material_restrictions de forma idempotente e compatível
    if (!app.hasTable('line_raw_material_restrictions')) {
      const collection = new Collection({
        name: 'line_raw_material_restrictions',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
      })
      app.save(collection)
    }

    const col = app.findCollectionByNameOrId('line_raw_material_restrictions')
    col.listRule = ''
    col.viewRule = ''
    col.createRule = ''
    col.updateRule = ''
    col.deleteRule = null
    app.save(col)
  },
  (app) => {},
)

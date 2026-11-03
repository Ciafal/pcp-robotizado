migrate(
  (app) => {
    // 1. Assegurar campos de comprimento de matéria-prima (m) em line_product_families
    if (app.hasTable('line_product_families')) {
      const col = app.findCollectionByNameOrId('line_product_families')
      const existingNames = new Set(col.fields.map((f) => f.name))

      if (!existingNames.has('comprimento_min_mp')) {
        col.fields.add(
          new NumberField({
            name: 'comprimento_min_mp',
            min: 0,
          }),
        )
      }

      if (!existingNames.has('comprimento_max_mp')) {
        col.fields.add(
          new NumberField({
            name: 'comprimento_max_mp',
            min: 0,
          }),
        )
      }

      app.save(col)
    }

    // 2. Criar coleção opcional/suporte para histórico e vínculos normalizados de bitolas se não existir
    if (!app.hasTable('line_family_gauges')) {
      const gaugesCol = new Collection({
        name: 'line_family_gauges',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // exclusão física bloqueada, exclusão lógica via status/deleted
        fields: [
          new TextField({
            name: 'family_id',
            required: true,
          }),
          new TextField({
            name: 'bitola',
            required: true,
          }),
          new TextField({
            name: 'description',
          }),
          new BoolField({
            name: 'active',
          }),
          new BoolField({
            name: 'deleted',
          }),
          new TextField({
            name: 'deleted_at',
          }),
          new TextField({
            name: 'deleted_by',
          }),
        ],
      })

      app.save(gaugesCol)
    }
  },
  (app) => {
    // Reversão segura e idempotente
    try {
      if (app.hasTable('line_product_families')) {
        const col = app.findCollectionByNameOrId('line_product_families')
        const toRemove = ['comprimento_min_mp', 'comprimento_max_mp']
        col.fields = col.fields.filter((f) => !toRemove.includes(f.name))
        app.save(col)
      }
    } catch (_) {}
  },
)

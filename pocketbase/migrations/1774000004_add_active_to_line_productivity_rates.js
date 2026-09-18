/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('line_productivity_rates')
    if (collection) {
      const existingField = collection.fields.getByName('active')
      if (!existingField) {
        collection.fields.addAt(
          collection.fields.length,
          new BoolField({
            name: 'active',
            required: false,
          }),
        )
        app.save(collection)
      }

      // Atualiza registros existentes que tenham active nulo ou indefinido para true
      try {
        app
          .db()
          .newQuery('UPDATE line_productivity_rates SET active = 1 WHERE active IS NULL')
          .execute()
      } catch (e) {
        // Ignorar se falhar em SQLite vazio
      }
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('line_productivity_rates')
    if (collection) {
      const field = collection.fields.getByName('active')
      if (field) {
        collection.fields.removeByName('active')
        app.save(collection)
      }
    }
  },
)

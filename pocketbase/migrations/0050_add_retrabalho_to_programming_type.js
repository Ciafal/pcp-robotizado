/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collections = ['production_lines', 'line_masters']

    for (const name of collections) {
      try {
        const collection = app.findCollectionByNameOrId(name)
        if (!collection) continue

        const field = collection.fields.getByName('programming_type')
        if (field) {
          const currentVals = field.values || []
          if (!currentVals.includes('Retrabalho')) {
            field.values = [...currentVals, 'Retrabalho']
            app.save(collection)
          }
        }
      } catch (e) {
        // ignore if collection or field not found
      }
    }
  },
  (app) => {
    const collections = ['production_lines', 'line_masters']

    for (const name of collections) {
      try {
        const collection = app.findCollectionByNameOrId(name)
        if (!collection) continue

        const field = collection.fields.getByName('programming_type')
        if (field && field.values) {
          field.values = field.values.filter((v) => v !== 'Retrabalho')
          app.save(collection)
        }
      } catch (e) {
        // ignore
      }
    }
  },
)

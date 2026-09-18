/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('line_productivity_rates')
    if (collection) {
      const nominalField = collection.fields.getByName('nominal_productivity')
      if (nominalField) {
        nominalField.required = false
        app.save(collection)
      }
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('line_productivity_rates')
    if (collection) {
      const nominalField = collection.fields.getByName('nominal_productivity')
      if (nominalField) {
        nominalField.required = true
        app.save(collection)
      }
    }
  },
)

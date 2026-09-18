/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('line_productivity_rates')
    if (collection) {
      const plannedField = collection.fields.getByName('planned_productivity')
      if (plannedField) {
        plannedField.required = false
        app.save(collection)
      }
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('line_productivity_rates')
    if (collection) {
      const plannedField = collection.fields.getByName('planned_productivity')
      if (plannedField) {
        plannedField.required = true
        app.save(collection)
      }
    }
  },
)

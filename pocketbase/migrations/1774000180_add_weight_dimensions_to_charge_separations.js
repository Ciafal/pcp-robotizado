/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    if (app.hasTable('line_charge_separations')) {
      const col = app.findCollectionByNameOrId('line_charge_separations')

      const fieldsToAdd = [
        'min_weight_t',
        'max_weight_t',
        'min_thickness_mm',
        'max_thickness_mm',
        'min_length_mm',
        'max_length_mm',
        'min_width_mm',
        'max_width_mm',
      ]

      let modified = false
      for (const fieldName of fieldsToAdd) {
        if (!col.fields.getByName(fieldName)) {
          col.fields.add(new NumberField({ name: fieldName }))
          modified = true
        }
      }

      if (modified) {
        app.save(col)
      }
    }
  },
  (app) => {
    if (app.hasTable('line_charge_separations')) {
      const col = app.findCollectionByNameOrId('line_charge_separations')
      const fieldsToRemove = [
        'min_weight_t',
        'max_weight_t',
        'min_thickness_mm',
        'max_thickness_mm',
        'min_length_mm',
        'max_length_mm',
        'min_width_mm',
        'max_width_mm',
      ]

      for (const fieldName of fieldsToRemove) {
        try {
          col.fields.removeByName(fieldName)
        } catch (_) {}
      }
      app.save(col)
    }
  },
)

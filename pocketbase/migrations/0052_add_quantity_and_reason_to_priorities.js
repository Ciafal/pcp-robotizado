migrate(
  (app) => {
    // 1. Adicionar quantity_tons e priority_reason em line_raw_material_priorities
    const prioCol = app.findCollectionByNameOrId('line_raw_material_priorities')
    if (prioCol) {
      let changed = false
      if (!prioCol.fields.getByName('quantity_tons')) {
        prioCol.fields.add(
          new NumberField({
            name: 'quantity_tons',
            required: false,
            min: 0,
          }),
        )
        changed = true
      }
      if (!prioCol.fields.getByName('priority_reason')) {
        prioCol.fields.add(
          new TextField({
            name: 'priority_reason',
            required: false,
            max: 500,
          }),
        )
        changed = true
      }
      if (changed) {
        app.save(prioCol)
      }
    }
  },
  (app) => {
    try {
      const prioCol = app.findCollectionByNameOrId('line_raw_material_priorities')
      if (prioCol) {
        if (prioCol.fields.getByName('quantity_tons')) {
          prioCol.fields.removeByName('quantity_tons')
        }
        if (prioCol.fields.getByName('priority_reason')) {
          prioCol.fields.removeByName('priority_reason')
        }
        app.save(prioCol)
      }
    } catch (_) {}
  },
)

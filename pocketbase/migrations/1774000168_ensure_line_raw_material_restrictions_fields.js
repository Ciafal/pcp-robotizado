migrate(
  (app) => {
    let col = null
    try {
      col = app.findCollectionByNameOrId('line_raw_material_restrictions')
    } catch (_) {}

    if (col) {
      // Remover campos caso existam previamente com definições parciais
      const fieldsToAdd = [
        new TextField({ name: 'center_code', required: true }),
        new TextField({ name: 'line_id', required: false }),
        new TextField({ name: 'line_master_id', required: false }),
        new TextField({ name: 'material_code', required: true }),
        new TextField({ name: 'material_description', required: true }),
        new TextField({ name: 'bitola_mp', required: false }),
        new JSONField({ name: 'restricted_product_gauges', required: true }),
        new DateField({ name: 'valid_from', required: true }),
        new DateField({ name: 'valid_until', required: false }),
        new TextField({ name: 'reason', required: true }),
        new TextField({ name: 'notes', required: false }),
        new BoolField({ name: 'active', required: false }),
        new BoolField({ name: 'deleted', required: false }),
        new TextField({ name: 'deleted_at', required: false }),
        new TextField({ name: 'deleted_by', required: false }),
        new TextField({ name: 'created_by', required: false }),
        new TextField({ name: 'updated_by', required: false }),
      ]

      for (let i = 0; i < fieldsToAdd.length; i++) {
        const field = fieldsToAdd[i]
        const existing = col.fields.getByName(field.name)
        if (!existing) {
          col.fields.add(field)
        }
      }

      if (!col.fields.getByName('created')) {
        col.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      }
      if (!col.fields.getByName('updated')) {
        col.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      }

      col.listRule = '@request.auth.id != ""'
      col.viewRule = '@request.auth.id != ""'
      col.createRule = '@request.auth.id != ""'
      col.updateRule = '@request.auth.id != ""'
      col.deleteRule = null

      app.save(col)
    }
  },
  (app) => {},
)

migrate(
  (app) => {
    let col = null
    try {
      col = app.findCollectionByNameOrId('line_raw_material_restrictions')
    } catch (_) {
      col = null
    }

    if (!col) {
      const collection = new Collection({
        name: 'line_raw_material_restrictions',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
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
          new AutodateField({ name: 'created', onCreate: true, onUpdate: false }),
          new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }),
        ],
        indexes: [
          'CREATE INDEX idx_lrmr_center ON line_raw_material_restrictions (center_code, active, deleted)',
          'CREATE INDEX idx_lrmr_mat ON line_raw_material_restrictions (center_code, material_code, active, deleted)',
        ],
      })

      app.save(collection)
    } else {
      const requiredFields = [
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

      for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i]
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

      try {
        if (!col.indexes) {
          col.indexes = []
        }
        const hasIdxCenter = col.indexes.some((idx) => idx.indexOf('idx_lrmr_center') !== -1)
        if (!hasIdxCenter) {
          col.indexes.push(
            'CREATE INDEX idx_lrmr_center ON line_raw_material_restrictions (center_code, active, deleted)',
          )
        }
        const hasIdxMat = col.indexes.some((idx) => idx.indexOf('idx_lrmr_mat') !== -1)
        if (!hasIdxMat) {
          col.indexes.push(
            'CREATE INDEX idx_lrmr_mat ON line_raw_material_restrictions (center_code, material_code, active, deleted)',
          )
        }
      } catch (_) {}

      app.save(col)
    }
  },
  (app) => {
    // down() noop seguro
  },
)

migrate(
  (app) => {
    const linesCol = app.findCollectionByNameOrId('production_lines')

    const adjustmentTimeRules = new Collection({
      name: 'adjustment_time_rules',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'material_code',
          type: 'text',
          required: true,
        },
        {
          name: 'material_description',
          type: 'text',
        },
        {
          name: 'sample_type',
          type: 'select',
          required: true,
          values: ['PEQUENA', 'MEDIA', 'GRANDE', 'TARUGO'],
          maxSelect: 1,
        },
        {
          name: 'duration_minutes',
          type: 'number',
          required: true,
          min: 0.1,
        },
        {
          name: 'valid_from',
          type: 'date',
          required: true,
        },
        {
          name: 'valid_until',
          type: 'date',
        },
        {
          name: 'active',
          type: 'bool',
        },
        {
          name: 'metadata',
          type: 'json',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_atr_line_mat_sample_act ON adjustment_time_rules (line_id, material_code, sample_type, active)',
        'CREATE INDEX idx_atr_line ON adjustment_time_rules (line_id, active)',
      ],
    })

    app.save(adjustmentTimeRules)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('adjustment_time_rules')
      app.delete(col)
    } catch (_) {}
  },
)

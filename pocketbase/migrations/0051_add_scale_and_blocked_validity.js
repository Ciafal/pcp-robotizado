migrate(
  (app) => {
    // 1. Adicionar campo 'scale' (select: 5X2, 6X1, 12X36, 5X1) em production_shifts
    const shiftsCol = app.findCollectionByNameOrId('production_shifts')
    if (!shiftsCol.fields.getByName('scale')) {
      shiftsCol.fields.add(
        new SelectField({
          name: 'scale',
          required: false,
          values: ['5X2', '6X1', '12X36', '5X1'],
          maxSelect: 1,
        }),
      )
      app.save(shiftsCol)
    }

    // 2. Adicionar campos 'valid_from' e 'valid_until' em line_blocked_products
    const blockedCol = app.findCollectionByNameOrId('line_blocked_products')
    if (!blockedCol.fields.getByName('valid_from')) {
      blockedCol.fields.add(
        new DateField({
          name: 'valid_from',
          required: false,
        }),
      )
    }
    if (!blockedCol.fields.getByName('valid_until')) {
      blockedCol.fields.add(
        new DateField({
          name: 'valid_until',
          required: false,
        }),
      )
    }
    app.save(blockedCol)
  },
  (app) => {
    try {
      const shiftsCol = app.findCollectionByNameOrId('production_shifts')
      const scaleField = shiftsCol.fields.getByName('scale')
      if (scaleField) {
        shiftsCol.fields.removeByName('scale')
        app.save(shiftsCol)
      }
    } catch (_) {}

    try {
      const blockedCol = app.findCollectionByNameOrId('line_blocked_products')
      if (blockedCol.fields.getByName('valid_from')) {
        blockedCol.fields.removeByName('valid_from')
      }
      if (blockedCol.fields.getByName('valid_until')) {
        blockedCol.fields.removeByName('valid_until')
      }
      app.save(blockedCol)
    } catch (_) {}
  },
)

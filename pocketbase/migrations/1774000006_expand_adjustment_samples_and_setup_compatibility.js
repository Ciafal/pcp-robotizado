migrate(
  (app) => {
    const atr = app.findCollectionByNameOrId('adjustment_time_rules')

    // 1. Update sample_type field to include PLACA, PALANQUILHA, LINGOTE
    const sampleField = atr.fields.getByName('sample_type')
    if (sampleField) {
      sampleField.values = [
        'PEQUENA',
        'MEDIA',
        'GRANDE',
        'TARUGO',
        'PLACA',
        'PALANQUILHA',
        'LINGOTE',
      ]
    }

    // 2. Add family_id relation if not exists to allow structured family link
    if (!atr.fields.getByName('family_id')) {
      const pfCol = app.findCollectionByNameOrId('product_families')
      atr.fields.add(
        new RelationField({
          name: 'family_id',
          collectionId: pfCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // 3. Add family_code text if not exists
    if (!atr.fields.getByName('family_code')) {
      atr.fields.add(
        new TextField({
          name: 'family_code',
          required: false,
        }),
      )
    }

    // 4. Add setup_id relation in adjustment_time_rules (optional direct link)
    if (!atr.fields.getByName('setup_id')) {
      const setupCol = app.findCollectionByNameOrId('line_setup_matrix')
      atr.fields.add(
        new RelationField({
          name: 'setup_id',
          collectionId: setupCol.id,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    app.save(atr)

    // Also check line_setup_matrix: add default_adjustment_id if desirable
    const lsm = app.findCollectionByNameOrId('line_setup_matrix')
    if (!lsm.fields.getByName('default_adjustment_id')) {
      lsm.fields.add(
        new RelationField({
          name: 'default_adjustment_id',
          collectionId: atr.id,
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(lsm)
    }
  },
  (app) => {
    // down migration
    try {
      const atr = app.findCollectionByNameOrId('adjustment_time_rules')
      const sampleField = atr.fields.getByName('sample_type')
      if (sampleField) {
        sampleField.values = ['PEQUENA', 'MEDIA', 'GRANDE', 'TARUGO']
        app.save(atr)
      }
    } catch (_) {}
  },
)

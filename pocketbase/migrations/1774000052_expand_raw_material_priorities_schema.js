migrate(
  (app) => {
    const prioCol = app.findCollectionByNameOrId('line_raw_material_priorities')
    if (prioCol) {
      let changed = false

      if (!prioCol.fields.getByName('bitola')) {
        prioCol.fields.add(
          new TextField({
            name: 'bitola',
            required: false,
            max: 50,
          }),
        )
        changed = true
      }

      if (!prioCol.fields.getByName('criterio_prioridade')) {
        prioCol.fields.add(
          new TextField({
            name: 'criterio_prioridade',
            required: false,
            max: 50,
          }),
        )
        changed = true
      }

      if (!prioCol.fields.getByName('descricao_outro_criterio')) {
        prioCol.fields.add(
          new TextField({
            name: 'descricao_outro_criterio',
            required: false,
            max: 250,
          }),
        )
        changed = true
      }

      if (!prioCol.fields.getByName('idempotency_key')) {
        prioCol.fields.add(
          new TextField({
            name: 'idempotency_key',
            required: false,
            max: 100,
          }),
        )
        changed = true
      }

      if (!prioCol.fields.getByName('criado_por')) {
        prioCol.fields.add(
          new TextField({
            name: 'criado_por',
            required: false,
            max: 100,
          }),
        )
        changed = true
      }

      if (!prioCol.fields.getByName('atualizado_por')) {
        prioCol.fields.add(
          new TextField({
            name: 'atualizado_por',
            required: false,
            max: 100,
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
        const fieldsToRemove = [
          'bitola',
          'criterio_prioridade',
          'descricao_outro_criterio',
          'idempotency_key',
          'criado_por',
          'atualizado_por',
        ]
        fieldsToRemove.forEach((f) => {
          if (prioCol.fields.getByName(f)) {
            prioCol.fields.removeByName(f)
          }
        })
        app.save(prioCol)
      }
    } catch (_) {}
  },
)

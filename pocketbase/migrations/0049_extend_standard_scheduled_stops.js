migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('standard_scheduled_stops')

    if (!col.fields.getByName('relation_type')) {
      col.fields.add(
        new SelectField({
          name: 'relation_type',
          required: false,
          values: [
            'PROGRAMADA_MANUTENCAO',
            'TROCA_CAMPANHA',
            'LIMPEZA_5S',
            'SETUP_BITOLA',
            'REFEICAO_DDS',
            'OUTROS',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('gauge_material_code')) {
      col.fields.add(
        new TextField({
          name: 'gauge_material_code',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('gauge_dimension')) {
      col.fields.add(
        new TextField({
          name: 'gauge_dimension',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('start_time')) {
      col.fields.add(
        new TextField({
          name: 'start_time',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('end_time')) {
      col.fields.add(
        new TextField({
          name: 'end_time',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('time_applicable')) {
      col.fields.add(
        new BoolField({
          name: 'time_applicable',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('reason')) {
      col.fields.add(
        new TextField({
          name: 'reason',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('standard_scheduled_stops')
    const f1 = col.fields.getByName('relation_type')
    if (f1) col.fields.remove(f1)
    const f2 = col.fields.getByName('gauge_material_code')
    if (f2) col.fields.remove(f2)
    const f3 = col.fields.getByName('gauge_dimension')
    if (f3) col.fields.remove(f3)
    const f4 = col.fields.getByName('start_time')
    if (f4) col.fields.remove(f4)
    const f5 = col.fields.getByName('end_time')
    if (f5) col.fields.remove(f5)
    const f6 = col.fields.getByName('time_applicable')
    if (f6) col.fields.remove(f6)
    const f7 = col.fields.getByName('reason')
    if (f7) col.fields.remove(f7)
    app.save(col)
  },
)

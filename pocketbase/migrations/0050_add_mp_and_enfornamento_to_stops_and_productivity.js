migrate(
  (app) => {
    // 1. standard_scheduled_stops: raw_material_type, enfornamento_type, recurrence_day_of_week
    const colStops = app.findCollectionByNameOrId('standard_scheduled_stops')

    if (!colStops.fields.getByName('raw_material_type')) {
      colStops.fields.add(
        new TextField({
          name: 'raw_material_type',
          required: false,
        }),
      )
    }

    if (!colStops.fields.getByName('enfornamento_type')) {
      colStops.fields.add(
        new TextField({
          name: 'enfornamento_type',
          required: false,
        }),
      )
    }

    if (!colStops.fields.getByName('recurrence_day_of_week')) {
      colStops.fields.add(
        new TextField({
          name: 'recurrence_day_of_week',
          required: false,
        }),
      )
    }

    app.save(colStops)

    // 2. line_productivity_rates: raw_material_type, enfornamento_type
    const colProd = app.findCollectionByNameOrId('line_productivity_rates')

    if (!colProd.fields.getByName('raw_material_type')) {
      colProd.fields.add(
        new TextField({
          name: 'raw_material_type',
          required: false,
        }),
      )
    }

    if (!colProd.fields.getByName('enfornamento_type')) {
      colProd.fields.add(
        new TextField({
          name: 'enfornamento_type',
          required: false,
        }),
      )
    }

    app.save(colProd)
  },
  (app) => {
    const colStops = app.findCollectionByNameOrId('standard_scheduled_stops')
    const s1 = colStops.fields.getByName('raw_material_type')
    if (s1) colStops.fields.remove(s1)
    const s2 = colStops.fields.getByName('enfornamento_type')
    if (s2) colStops.fields.remove(s2)
    const s3 = colStops.fields.getByName('recurrence_day_of_week')
    if (s3) colStops.fields.remove(s3)
    app.save(colStops)

    const colProd = app.findCollectionByNameOrId('line_productivity_rates')
    const p1 = colProd.fields.getByName('raw_material_type')
    if (p1) colProd.fields.remove(p1)
    const p2 = colProd.fields.getByName('enfornamento_type')
    if (p2) colProd.fields.remove(p2)
    app.save(colProd)
  },
)

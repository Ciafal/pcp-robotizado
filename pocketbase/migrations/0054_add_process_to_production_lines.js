migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('production_lines')
    if (!col.fields.getByName('process')) {
      col.fields.add(
        new TextField({
          name: 'process',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('production_lines')
    if (col.fields.getByName('process')) {
      col.fields.removeByName('process')
      app.save(col)
    }
  },
)

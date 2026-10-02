migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('line_sequencing_dependencies')
    if (!col) return

    let modified = false

    if (!col.fields.getByName('status')) {
      col.fields.add(
        new SelectField({
          name: 'status',
          required: false,
          values: ['ATIVO', 'INATIVO'],
          maxSelect: 1,
        }),
      )
      modified = true
    }

    if (modified) {
      app.save(col)
    }

    // Preenche registros existentes sem status: se active === false -> INATIVO, senão -> ATIVO
    try {
      const records = app.findRecordsByFilter('line_sequencing_dependencies', '1 = 1', '', 500, 0)
      for (const rec of records) {
        if (!rec.getString('status')) {
          const isActive = rec.getBool('active') !== false
          rec.set('status', isActive ? 'ATIVO' : 'INATIVO')
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    const col = app.findCollectionByNameOrId('line_sequencing_dependencies')
    if (!col) return

    if (col.fields.getByName('status')) {
      col.fields.removeByName('status')
      app.save(col)
    }
  },
)

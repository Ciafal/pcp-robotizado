migrate(
  (app) => {
    const line = app.findRecordById('production_lines', 'd73ih9nvlbx7q31')
    if (line) {
      line.set('is_active', false)
      line.set('process', 'Enfornamento / Forno')
      app.save(line)
    }
  },
  (app) => {
    const line = app.findRecordById('production_lines', 'd73ih9nvlbx7q31')
    if (line) {
      line.set('is_active', true)
      app.save(line)
    }
  },
)

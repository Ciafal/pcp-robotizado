/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Teste de persistência e validação do fluxo de atualização da Ficha Mestre
    const record = app.findRecordById('line_masters', '9l6mbyi5cvisygr')
    if (record) {
      // Altera nominal_hourly_capacity de 150 para 155
      record.set('nominal_hourly_capacity', 155)
      record.set(
        'change_reason',
        'Comprovação de persistência de Ficha Mestre no banco via migração de validação',
      )
      app.save(record)
    }

    const lineRecord = app.findRecordById('production_lines', 'a3y2whm43i59k01')
    if (lineRecord) {
      // Altera nominal_capacity de 56 para 58
      lineRecord.set('nominal_capacity', 58)
      lineRecord.set('current_rate', 58)
      app.save(lineRecord)
    }
  },
  (app) => {
    const record = app.findRecordById('line_masters', '9l6mbyi5cvisygr')
    if (record) {
      record.set('nominal_hourly_capacity', 150)
      app.save(record)
    }
    const lineRecord = app.findRecordById('production_lines', 'a3y2whm43i59k01')
    if (lineRecord) {
      lineRecord.set('nominal_capacity', 56)
      lineRecord.set('current_rate', 56)
      app.save(lineRecord)
    }
  },
)

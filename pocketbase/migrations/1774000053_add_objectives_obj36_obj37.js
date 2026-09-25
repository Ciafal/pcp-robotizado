/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('industrial_test_objectives')
    if (!collection) {
      return
    }

    const objectivesToAdd = [
      {
        code: 'OBJ-36',
        name: 'Retorno de produção pós-parada anual',
        description:
          'Utilizar para testes realizados durante o processo de retomada da operação após a parada anual da linha/centro produtivo.',
        is_custom_trigger: false,
        active: true,
        created_by: 'system',
        updated_by: 'system',
      },
      {
        code: 'OBJ-37',
        name: 'Retorno de produção pós-parada programada',
        description:
          'Utilizar para testes realizados durante o retorno da operação após uma parada programada da linha/centro produtivo.',
        is_custom_trigger: false,
        active: true,
        created_by: 'system',
        updated_by: 'system',
      },
    ]

    for (const obj of objectivesToAdd) {
      try {
        const existing = app.findFirstRecordByFilter(
          'industrial_test_objectives',
          `code = '${obj.code}'`,
        )
        if (existing) {
          continue
        }
      } catch (_err) {
        // Record not found, continue to insert
      }

      const record = new Record(collection)
      record.set('code', obj.code)
      record.set('name', obj.name)
      record.set('description', obj.description)
      record.set('is_custom_trigger', obj.is_custom_trigger)
      record.set('active', obj.active)
      record.set('created_by', obj.created_by)
      record.set('updated_by', obj.updated_by)
      app.save(record)
    }
  },
  (app) => {
    try {
      const rec36 = app.findFirstRecordByFilter('industrial_test_objectives', "code = 'OBJ-36'")
      if (rec36) app.delete(rec36)
    } catch (_e) {}

    try {
      const rec37 = app.findFirstRecordByFilter('industrial_test_objectives', "code = 'OBJ-37'")
      if (rec37) app.delete(rec37)
    } catch (_e) {}
  },
)

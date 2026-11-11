/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    if (app.hasTable('line_furnace_charging_types')) {
      const col = app.findCollectionByNameOrId('line_furnace_charging_types')

      const fieldsToAdd = [
        { ctor: 'text', name: 'proporcao' },
        { ctor: 'number', name: 'proporcao_primeiro_termo' },
        { ctor: 'number', name: 'proporcao_segundo_termo' },
        { ctor: 'text', name: 'mp_principal_code' },
        { ctor: 'text', name: 'mp_principal_description' },
        { ctor: 'text', name: 'mp_secundaria_code' },
        { ctor: 'text', name: 'mp_secundaria_description' },
      ]

      let modified = false
      for (const f of fieldsToAdd) {
        if (!col.fields.getByName(f.name)) {
          col.fields.add(
            f.ctor === 'text' ? new TextField({ name: f.name }) : new NumberField({ name: f.name }),
          )
          modified = true
        }
      }

      if (modified) {
        app.save(col)
      }
    }
  },
  (app) => {
    if (app.hasTable('line_furnace_charging_types')) {
      const col = app.findCollectionByNameOrId('line_furnace_charging_types')
      for (const fieldName of [
        'proporcao',
        'proporcao_primeiro_termo',
        'proporcao_segundo_termo',
        'mp_principal_code',
        'mp_principal_description',
        'mp_secundaria_code',
        'mp_secundaria_description',
      ]) {
        try {
          col.fields.removeByName(fieldName)
        } catch (_) {}
      }
      app.save(col)
    }
  },
)

/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir campos em pcp_mp_inventory_items para contagem física e vínculo com demanda
    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')
      let changed = false

      if (!itemsCol.fields.getByName('notes')) {
        itemsCol.fields.add(
          new TextField({
            name: 'notes',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('location_wms')) {
        itemsCol.fields.add(
          new TextField({
            name: 'location_wms',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('entry_date_formatted')) {
        itemsCol.fields.add(
          new TextField({
            name: 'entry_date_formatted',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('user_id')) {
        itemsCol.fields.add(
          new TextField({
            name: 'user_id',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('user_name')) {
        itemsCol.fields.add(
          new TextField({
            name: 'user_name',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('user_role')) {
        itemsCol.fields.add(
          new TextField({
            name: 'user_role',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('pieces_count')) {
        itemsCol.fields.add(
          new NumberField({
            name: 'pieces_count',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('run_number')) {
        itemsCol.fields.add(
          new TextField({
            name: 'run_number',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('gauge')) {
        itemsCol.fields.add(
          new TextField({
            name: 'gauge',
            required: false,
          }),
        )
        changed = true
      }

      if (!itemsCol.fields.getByName('is_count_entry')) {
        itemsCol.fields.add(
          new BoolField({
            name: 'is_count_entry',
            required: false,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(itemsCol)
      }
    }

    // 2. Garantir índices de performance
    try {
      app
        .db()
        .newQuery(
          'CREATE INDEX IF NOT EXISTS idx_pcp_items_demand_entry ON pcp_mp_inventory_items (demand_id, is_count_entry);',
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    // Rollback idempotente
    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')
      const fieldsToRemove = [
        'notes',
        'location_wms',
        'entry_date_formatted',
        'user_id',
        'user_name',
        'user_role',
        'pieces_count',
        'run_number',
        'gauge',
        'is_count_entry',
      ]
      let changed = false
      for (const f of fieldsToRemove) {
        const fieldObj = itemsCol.fields.getByName(f)
        if (fieldObj) {
          itemsCol.fields.remove(fieldObj)
          changed = true
        }
      }
      if (changed) {
        app.save(itemsCol)
      }
    }
  },
)

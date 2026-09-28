/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000061: Garantir esquema idempotente e campos estritos para
 * Demandas de Inventário e Matérias-Primas Vinculadas:
 * - pcp_mp_inventory_demands: materials_summary, demand_id, control_number, indexes
 * - pcp_mp_inventory_items: demand_id, control_number, heat_number, unit_weight_t, calculated_pieces
 */
migrate(
  (app) => {
    // 1. Atualizar ou garantir collection pcp_mp_inventory_demands
    if (app.hasTable('pcp_mp_inventory_demands')) {
      const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
      let changed = false

      if (!demandsCol.fields.getByName('materials_summary')) {
        demandsCol.fields.add(
          new JSONField({
            name: 'materials_summary',
            required: false,
          }),
        )
        changed = true
      }

      if (!demandsCol.fields.getByName('production_order')) {
        demandsCol.fields.add(
          new TextField({
            name: 'production_order',
            required: false,
          }),
        )
        changed = true
      }

      if (!demandsCol.fields.getByName('company')) {
        demandsCol.fields.add(
          new TextField({
            name: 'company',
            required: false,
          }),
        )
        changed = true
      }

      if (!demandsCol.fields.getByName('line')) {
        demandsCol.fields.add(
          new TextField({
            name: 'line',
            required: false,
          }),
        )
        changed = true
      }

      if (!demandsCol.fields.getByName('center')) {
        demandsCol.fields.add(
          new TextField({
            name: 'center',
            required: false,
          }),
        )
        changed = true
      }

      if (!demandsCol.fields.getByName('storage_deposit')) {
        demandsCol.fields.add(
          new TextField({
            name: 'storage_deposit',
            required: false,
          }),
        )
        changed = true
      }

      if (!demandsCol.fields.getByName('priority')) {
        demandsCol.fields.add(
          new TextField({
            name: 'priority',
            required: false,
          }),
        )
        changed = true
      }

      if (!demandsCol.fields.getByName('status')) {
        demandsCol.fields.add(
          new TextField({
            name: 'status',
            required: false,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(demandsCol)
      }
    }

    // 2. Atualizar ou garantir collection pcp_mp_inventory_items
    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')
      let itemsChanged = false

      if (!itemsCol.fields.getByName('demand_id')) {
        itemsCol.fields.add(
          new TextField({
            name: 'demand_id',
            required: false,
          }),
        )
        itemsChanged = true
      }

      if (!itemsCol.fields.getByName('control_number')) {
        itemsCol.fields.add(
          new TextField({
            name: 'control_number',
            required: false,
          }),
        )
        itemsChanged = true
      }

      if (!itemsCol.fields.getByName('heat_number')) {
        itemsCol.fields.add(
          new TextField({
            name: 'heat_number',
            required: false,
          }),
        )
        itemsChanged = true
      }

      if (!itemsCol.fields.getByName('unit_weight_t')) {
        itemsCol.fields.add(
          new NumberField({
            name: 'unit_weight_t',
            required: false,
          }),
        )
        itemsChanged = true
      }

      if (!itemsCol.fields.getByName('calculated_pieces')) {
        itemsCol.fields.add(
          new NumberField({
            name: 'calculated_pieces',
            required: false,
          }),
        )
        itemsChanged = true
      }

      if (itemsChanged) {
        app.save(itemsCol)
      }
    }

    // 3. Garantir indexes essenciais de busca por demanda
    try {
      app
        .db()
        .newQuery(
          'CREATE INDEX IF NOT EXISTS idx_pcp_mp_items_demand_id ON pcp_mp_inventory_items (demand_id);',
        )
        .execute()
      app
        .db()
        .newQuery(
          'CREATE INDEX IF NOT EXISTS idx_pcp_mp_items_control_number ON pcp_mp_inventory_items (control_number);',
        )
        .execute()
      app
        .db()
        .newQuery(
          'CREATE INDEX IF NOT EXISTS idx_pcp_inv_dem_ctrl ON pcp_mp_inventory_demands (control_number);',
        )
        .execute()
    } catch (_) {
      // Ignora se index já existir
    }
  },
  (app) => {
    // Reversível / no-op seguro
  },
)

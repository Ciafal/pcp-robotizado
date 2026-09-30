/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Assegurar campos de ciclo em pcp_mp_inventory_demands e pcp_mp_inventory_items
    if (app.hasTable('pcp_mp_inventory_demands')) {
      const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
      let changed = false

      if (!demandsCol.fields.getByName('cycle_count')) {
        demandsCol.fields.add(
          new NumberField({
            name: 'cycle_count',
            required: false,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(demandsCol)
      }
    }

    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')
      let changed = false

      if (!itemsCol.fields.getByName('cycle_number')) {
        itemsCol.fields.add(
          new NumberField({
            name: 'cycle_number',
            required: false,
          }),
        )
        changed = true
      }

      if (changed) {
        app.save(itemsCol)
      }
    }

    // 2. Normalizar status existentes em pcp_mp_inventory_demands via SQL direto
    // Mapeamentos:
    // 'Gerada' -> 'Aberto'
    // 'Em inventário' | 'Em inventario' | 'Inventário parcial' | 'Inventario parcial' -> 'Parcial'
    // 'Cancelada' -> 'Cancelado'
    // 'Inventário concluído' | 'Inventario concluido' | 'Concluido' -> 'Concluído'
    if (app.hasTable('pcp_mp_inventory_demands')) {
      try {
        app
          .db()
          .newQuery(
            "UPDATE pcp_mp_inventory_demands SET status = 'Aberto' WHERE LOWER(status) IN ('gerada', 'aberta', 'aberto')",
          )
          .execute()
        app
          .db()
          .newQuery(
            "UPDATE pcp_mp_inventory_demands SET status = 'Parcial' WHERE LOWER(status) IN ('em inventário', 'em inventario', 'inventário parcial', 'inventario parcial', 'parcial')",
          )
          .execute()
        app
          .db()
          .newQuery(
            "UPDATE pcp_mp_inventory_demands SET status = 'Cancelado' WHERE LOWER(status) IN ('cancelada', 'cancelado')",
          )
          .execute()
        app
          .db()
          .newQuery(
            "UPDATE pcp_mp_inventory_demands SET status = 'Concluído' WHERE LOWER(status) IN ('inventário concluído', 'inventario concluido', 'concluido', 'concluído')",
          )
          .execute()
        app
          .db()
          .newQuery(
            'UPDATE pcp_mp_inventory_demands SET cycle_count = 1 WHERE cycle_count IS NULL OR cycle_count < 1',
          )
          .execute()
      } catch (err) {
        console.error('Erro na normalização de status de pcp_mp_inventory_demands via SQL:', err)
      }
    }

    // 3. Normalizar cycle_number nos itens existentes (se cycle_number for null ou 0, definir para 1)
    if (app.hasTable('pcp_mp_inventory_items')) {
      try {
        app
          .db()
          .newQuery(
            'UPDATE pcp_mp_inventory_items SET cycle_number = 1 WHERE is_count_entry = true AND (cycle_number IS NULL OR cycle_number < 1)',
          )
          .execute()
      } catch (errIt) {
        console.error('Erro ao definir cycle_number inicial nos itens via SQL:', errIt)
      }
    }
  },
  (app) => {
    // Reversão não necessária / no-op
  },
)

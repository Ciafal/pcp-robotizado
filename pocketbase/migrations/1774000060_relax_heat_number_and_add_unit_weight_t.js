migrate(
  (app) => {
    // 1. Tornar heat_number e campos não obrigatórios em pcp_mp_inventory_items para permitir demandas de inventário sem corrida
    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')

      // heat_number
      const heatField = itemsCol.fields.getByName('heat_number')
      if (heatField) {
        heatField.required = false
      }

      // Outros campos legados que eram obrigatórios mas não fazem sentido em demandas livres de inventário
      const fieldsToRelax = [
        'enfornamento_date',
        'expected_enfornamento_time',
        'produced_gauge_product',
        'enfornamento_type',
        'planned_requirement_tons',
        'pcp_planned_sequence',
        'schedule_version',
        'company',
        'line',
        'center',
        'raw_material_description',
        'inventory_id',
        'inventory_code',
        'item_control_key',
      ]

      for (const fName of fieldsToRelax) {
        const f = itemsCol.fields.getByName(fName)
        if (f) {
          f.required = false
        }
      }

      // Adicionar unit_weight_t e weight_origin se não existirem
      if (!itemsCol.fields.getByName('unit_weight_t')) {
        itemsCol.fields.add(new NumberField({ name: 'unit_weight_t' }))
      }
      if (!itemsCol.fields.getByName('weight_origin')) {
        itemsCol.fields.add(new TextField({ name: 'weight_origin' }))
      }

      app.save(itemsCol)
    }

    // 2. Garantir que pcp_mp_inventory_demands não exija campos desnecessários
    if (app.hasTable('pcp_mp_inventory_demands')) {
      const demCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
      const matCodeField = demCol.fields.getByName('material_code')
      if (matCodeField) {
        matCodeField.required = false
      }
      app.save(demCol)
    }
  },
  (app) => {
    // Revert no-op
  },
)

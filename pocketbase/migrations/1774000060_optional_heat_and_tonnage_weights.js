/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar pcp_mp_inventory_demands se necessário
    if (app.hasTable('pcp_mp_inventory_demands')) {
      const demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
      // Garantir campo observation opcional
      // Garantir materials_summary
      if (!demandsCol.fields.getByName('materials_summary')) {
        demandsCol.fields.add(new JSONField({ name: 'materials_summary' }))
      }
      app.save(demandsCol)
    }

    // 2. Atualizar pcp_mp_inventory_items para suportar unit_weight_t e origin, e heat_number opcional
    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')

      // heat_number opcional
      const heatField = itemsCol.fields.getByName('heat_number')
      if (heatField) {
        heatField.required = false
      }

      // unit_weight_t (em toneladas)
      if (!itemsCol.fields.getByName('unit_weight_t')) {
        itemsCol.fields.add(new NumberField({ name: 'unit_weight_t' }))
      }

      // weight_origin ('SAP_RFC' | 'LOCAL_MASTER' | 'NOT_AVAILABLE')
      if (!itemsCol.fields.getByName('weight_origin')) {
        itemsCol.fields.add(new TextField({ name: 'weight_origin' }))
      }

      app.save(itemsCol)
    }

    // 3. Atualizar pcp_mp_inventory_runs para suportar corrida opcional ou vincular sem bloqueio
    if (app.hasTable('pcp_mp_inventory_runs')) {
      const runsCol = app.findCollectionByNameOrId('pcp_mp_inventory_runs')
      const runNumField = runsCol.fields.getByName('run_number')
      if (runNumField) {
        runNumField.required = false
      }
      app.save(runsCol)
    }
  },
  (app) => {
    // Revert no-op para segurança
  },
)

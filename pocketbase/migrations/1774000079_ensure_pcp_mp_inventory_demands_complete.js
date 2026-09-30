/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Migration de garantia de schema idempotente para pcp_mp_inventory_demands
    // Garante que a collection existe com TODOS os campos necessários para geração e ciclo de demandas
    let collection = null
    try {
      collection = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
    } catch (_) {
      collection = null
    }

    const requiredFields = [
      { name: 'control_number', type: 'text', required: true },
      { name: 'company', type: 'text', required: true },
      { name: 'line', type: 'text', required: true },
      { name: 'center', type: 'text', required: true },
      { name: 'storage_deposit', type: 'text', required: true },
      { name: 'production_order', type: 'text', required: true },
      { name: 'material_code', type: 'text', required: false },
      { name: 'material_description', type: 'text', required: false },
      { name: 'unit_of_measure', type: 'text', required: false },
      { name: 'sap_stock', type: 'number', required: false },
      { name: 'sap_last_sync', type: 'text', required: false },
      { name: 'sap_query_status', type: 'text', required: false },
      { name: 'priority', type: 'text', required: true },
      { name: 'status', type: 'text', required: true },
      { name: 'observation', type: 'text', required: false },
      { name: 'requester_id', type: 'text', required: false },
      { name: 'requester_name', type: 'text', required: false },
      { name: 'requester_role', type: 'text', required: false },
      { name: 'generation_date_formatted', type: 'text', required: false },
      { name: 'total_pieces_required', type: 'number', required: false },
      { name: 'total_pieces_inventoried', type: 'number', required: false },
      { name: 'divergence_pieces', type: 'number', required: false },
      { name: 'divergence_pct', type: 'number', required: false },
      { name: 'cycle_count', type: 'number', required: false },
      { name: 'materials_summary', type: 'json', required: false },
      { name: 'gauge', type: 'text', required: false },
      { name: 'application', type: 'text', required: false },
      { name: 'cancellation_reason', type: 'text', required: false },
      { name: 'cancelled_at', type: 'text', required: false },
      { name: 'cancelled_by', type: 'text', required: false },
      { name: 'concluded_at', type: 'text', required: false },
      { name: 'concluded_by', type: 'text', required: false },
      { name: 'sap_snapshot_balance', type: 'number', required: false },
      { name: 'sap_snapshot_at', type: 'text', required: false },
      { name: 'sap_snapshot_divergence', type: 'number', required: false },
      { name: 'sap_snapshot_status', type: 'text', required: false },
      { name: 'ai_suggestion_payload', type: 'json', required: false },
    ]

    if (!collection) {
      const newCol = new Collection({
        name: 'pcp_mp_inventory_demands',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        indexes: [],
      })

      for (const f of requiredFields) {
        newCol.fields.addAt(newCol.fields.length, new Field(f))
      }

      app.save(newCol)
    } else {
      // Collection já existe: garante que todos os campos estão presentes e regras de API estão abertas
      let changed = false

      for (const f of requiredFields) {
        if (!collection.fields.getByName(f.name)) {
          collection.fields.addAt(collection.fields.length, new Field(f))
          changed = true
        }
      }

      if (collection.listRule !== '') {
        collection.listRule = ''
        changed = true
      }
      if (collection.viewRule !== '') {
        collection.viewRule = ''
        changed = true
      }
      if (collection.createRule !== '') {
        collection.createRule = ''
        changed = true
      }
      if (collection.updateRule !== '') {
        collection.updateRule = ''
        changed = true
      }

      if (changed) {
        app.save(collection)
      }
    }
  },
  (app) => {
    // Reversão segura não-destrutiva
  },
)

/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Reconciliação / Criação gerenciada da collection pcp_mp_inventory_demands
    let demandsCol = null
    try {
      demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
    } catch (_) {
      demandsCol = null
    }

    const demandFields = [
      { name: 'control_number', type: 'text', required: true },
      { name: 'company', type: 'text', required: true },
      { name: 'line', type: 'text', required: true },
      { name: 'center', type: 'text', required: true },
      { name: 'storage_deposit', type: 'text', required: true },
      { name: 'production_order', type: 'text', required: false },
      { name: 'material_code', type: 'text', required: false },
      { name: 'material_description', type: 'text', required: false },
      { name: 'unit_of_measure', type: 'text', required: false },
      { name: 'sap_stock', type: 'number', required: false },
      { name: 'sap_last_sync', type: 'text', required: false },
      { name: 'sap_query_status', type: 'text', required: false },
      { name: 'priority', type: 'text', required: false },
      { name: 'status', type: 'text', required: false },
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

    if (!demandsCol) {
      demandsCol = new Collection({
        name: 'pcp_mp_inventory_demands',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        indexes: [],
      })

      for (let i = 0; i < demandFields.length; i++) {
        demandsCol.fields.addAt(demandsCol.fields.length, new Field(demandFields[i]))
      }

      app.save(demandsCol)
    } else {
      let changed = false
      for (let i = 0; i < demandFields.length; i++) {
        const f = demandFields[i]
        if (!demandsCol.fields.getByName(f.name)) {
          demandsCol.fields.addAt(demandsCol.fields.length, new Field(f))
          changed = true
        }
      }

      // Garante regras abertas / permissivas
      if (demandsCol.listRule !== '') {
        demandsCol.listRule = ''
        changed = true
      }
      if (demandsCol.viewRule !== '') {
        demandsCol.viewRule = ''
        changed = true
      }
      if (demandsCol.createRule !== '') {
        demandsCol.createRule = ''
        changed = true
      }
      if (demandsCol.updateRule !== '') {
        demandsCol.updateRule = ''
        changed = true
      }
      if (demandsCol.deleteRule !== '') {
        demandsCol.deleteRule = ''
        changed = true
      }

      if (changed) {
        app.save(demandsCol)
      }
    }

    // 2. Reconciliação dos campos de pcp_mp_inventory_history
    // Schema original tem: inventory_id, inventory_item_id, event_type, user_name, user_id, schedule_version, previous_value, new_value, divergence_snapshot, lead_time_seconds, description, timestamp
    // Adiciona com segurança: demand_id, control_number, user_role, summary, details, cycle_number, inventory_order_id
    let historyCol = null
    try {
      historyCol = app.findCollectionByNameOrId('pcp_mp_inventory_history')
    } catch (_) {
      historyCol = null
    }

    if (historyCol) {
      const historyExtraFields = [
        { name: 'demand_id', type: 'text', required: false },
        { name: 'control_number', type: 'text', required: false },
        { name: 'inventory_order_id', type: 'text', required: false },
        { name: 'user_role', type: 'text', required: false },
        { name: 'summary', type: 'text', required: false },
        { name: 'details', type: 'json', required: false },
        { name: 'cycle_number', type: 'number', required: false },
      ]

      let histChanged = false
      for (let i = 0; i < historyExtraFields.length; i++) {
        const hf = historyExtraFields[i]
        if (!historyCol.fields.getByName(hf.name)) {
          historyCol.fields.addAt(historyCol.fields.length, new Field(hf))
          histChanged = true
        }
      }

      // Garante regras de leitura e criação para pcp_mp_inventory_history
      if (historyCol.listRule !== '') {
        historyCol.listRule = ''
        histChanged = true
      }
      if (historyCol.viewRule !== '') {
        historyCol.viewRule = ''
        histChanged = true
      }
      if (historyCol.createRule !== '') {
        historyCol.createRule = ''
        histChanged = true
      }

      if (histChanged) {
        app.save(historyCol)
      }
    }
  },
  (_) => {
    // Reversão segura não-destrutiva
  },
)

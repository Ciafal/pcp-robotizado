/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Recriação Idempotente da collection 'pcp_mp_inventory_demands'
    let demandsCol = null
    try {
      demandsCol = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
    } catch (_) {
      demandsCol = null
    }

    if (!demandsCol && !app.hasTable('pcp_mp_inventory_demands')) {
      const col = new Collection({
        name: 'pcp_mp_inventory_demands',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'control_number', type: 'text', required: true },
          { name: 'company', type: 'text', required: true },
          { name: 'line', type: 'text', required: true },
          { name: 'center', type: 'text', required: true },
          { name: 'storage_deposit', type: 'text', required: true },
          { name: 'production_order', type: 'text' },
          { name: 'material_code', type: 'text' },
          { name: 'material_description', type: 'text' },
          { name: 'unit_of_measure', type: 'text' },
          { name: 'sap_stock', type: 'number' },
          { name: 'sap_last_sync', type: 'text' },
          { name: 'sap_query_status', type: 'text' },
          {
            name: 'priority',
            type: 'select',
            required: true,
            values: ['Baixa', 'Normal', 'Alta', 'Urgente'],
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'Aberto',
              'Gerada',
              'Em inventário',
              'Parcial',
              'Inventário parcial',
              'Concluído',
              'Inventário concluído',
              'Cancelado',
              'Cancelada',
            ],
          },
          { name: 'observation', type: 'text' },
          { name: 'requester_id', type: 'text' },
          { name: 'requester_name', type: 'text' },
          { name: 'requester_role', type: 'text' },
          { name: 'generation_date_formatted', type: 'text' },
          { name: 'total_pieces_required', type: 'number' },
          { name: 'total_pieces_inventoried', type: 'number' },
          { name: 'divergence_pieces', type: 'number' },
          { name: 'divergence_pct', type: 'number' },
          { name: 'ai_suggestion_payload', type: 'json' },
          { name: 'cancellation_reason', type: 'text' },
          { name: 'cancelled_at', type: 'text' },
          { name: 'cancelled_by', type: 'text' },
          { name: 'concluded_at', type: 'text' },
          { name: 'concluded_by', type: 'text' },
          { name: 'cycle_count', type: 'number' },
          { name: 'materials_summary', type: 'json' },
          { name: 'gauge', type: 'text' },
          { name: 'application', type: 'text' },
          { name: 'sap_snapshot_balance', type: 'number' },
          { name: 'sap_snapshot_at', type: 'text' },
          {
            name: 'sap_snapshot_status',
            type: 'text',
          },
          { name: 'sap_snapshot_divergence', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_inv_demands_ctrl ON pcp_mp_inventory_demands (control_number)',
          'CREATE INDEX idx_inv_demands_company ON pcp_mp_inventory_demands (company)',
          'CREATE INDEX idx_inv_demands_line ON pcp_mp_inventory_demands (line)',
          'CREATE INDEX idx_inv_demands_center ON pcp_mp_inventory_demands (center)',
          'CREATE INDEX idx_inv_demands_status ON pcp_mp_inventory_demands (status)',
          'CREATE INDEX idx_inv_demands_op ON pcp_mp_inventory_demands (production_order)',
        ],
      })
      app.save(col)
    }

    // 2. Garantir que API rules estejam públicas/desbloqueadas para o módulo funcionar
    try {
      const col = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
      if (col) {
        col.listRule = "@request.auth.id != '' || @request.auth.id = ''"
        col.viewRule = "@request.auth.id != '' || @request.auth.id = ''"
        col.createRule = "@request.auth.id != '' || @request.auth.id = ''"
        col.updateRule = "@request.auth.id != '' || @request.auth.id = ''"
        col.deleteRule = "@request.auth.id != '' || @request.auth.id = ''"
        app.save(col)
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão segura
    try {
      if (app.hasTable('pcp_mp_inventory_demands')) {
        const col = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
        if (col) app.delete(col)
      }
    } catch (_) {}
  },
)

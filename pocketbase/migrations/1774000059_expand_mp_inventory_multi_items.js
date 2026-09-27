/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Garantir tabela pcp_mp_inventory_demands
    if (!app.hasTable('pcp_mp_inventory_demands')) {
      const demands = new Collection({
        name: 'pcp_mp_inventory_demands',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'control_number', type: 'text', required: true },
          { name: 'company', type: 'text', required: true },
          { name: 'line', type: 'text', required: true },
          { name: 'center', type: 'text', required: true },
          { name: 'storage_deposit', type: 'text', required: true },
          { name: 'production_order', type: 'text' },
          { name: 'material_code', type: 'text' },
          { name: 'material_description', type: 'text' },
          {
            name: 'priority',
            type: 'select',
            required: true,
            values: ['Normal', 'Urgente', 'Alta', 'Baixa'],
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Gerada', 'Em inventário', 'Inventário parcial', 'Concluída', 'Cancelada'],
          },
          { name: 'total_pieces_required', type: 'number' },
          { name: 'total_pieces_inventoried', type: 'number' },
          { name: 'divergence_pieces', type: 'number' },
          { name: 'divergence_pct', type: 'number' },
          { name: 'gauge', type: 'text' },
          { name: 'application', type: 'text' },
          { name: 'observation', type: 'text' },
          { name: 'materials_summary', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcp_inv_dem_ctrl ON pcp_mp_inventory_demands (control_number)',
          'CREATE INDEX idx_pcp_inv_dem_status ON pcp_mp_inventory_demands (status)',
          'CREATE INDEX idx_pcp_inv_dem_center ON pcp_mp_inventory_demands (center)',
          'CREATE INDEX idx_pcp_inv_dem_order ON pcp_mp_inventory_demands (production_order)',
        ],
      })
      app.save(demands)
    } else {
      const demands = app.findCollectionByNameOrId('pcp_mp_inventory_demands')
      demands.listRule = ''
      demands.viewRule = ''
      demands.createRule = ''
      demands.updateRule = ''
      demands.deleteRule = ''
      if (!demands.fields.getByName('production_order')) {
        demands.fields.add(new TextField({ name: 'production_order' }))
      }
      if (!demands.fields.getByName('materials_summary')) {
        demands.fields.add(new JSONField({ name: 'materials_summary' }))
      }
      app.save(demands)
    }

    // 2. Garantir tabela pcp_mp_inventory_items (itens de matéria-prima por demanda)
    // Se a tabela legada pcp_mp_inventory_items já existir, enriquecemos campos necessários
    if (app.hasTable('pcp_mp_inventory_items')) {
      const itemsCol = app.findCollectionByNameOrId('pcp_mp_inventory_items')
      itemsCol.listRule = ''
      itemsCol.viewRule = ''
      itemsCol.createRule = ''
      itemsCol.updateRule = ''
      itemsCol.deleteRule = ''
      if (!itemsCol.fields.getByName('demand_id')) {
        itemsCol.fields.add(new TextField({ name: 'demand_id' }))
      }
      if (!itemsCol.fields.getByName('control_number')) {
        itemsCol.fields.add(new TextField({ name: 'control_number' }))
      }
      if (!itemsCol.fields.getByName('quantity_tons')) {
        itemsCol.fields.add(new NumberField({ name: 'quantity_tons' }))
      }
      if (!itemsCol.fields.getByName('calculated_pieces')) {
        itemsCol.fields.add(new NumberField({ name: 'calculated_pieces' }))
      }
      if (!itemsCol.fields.getByName('unit_weight_kg')) {
        itemsCol.fields.add(new NumberField({ name: 'unit_weight_kg' }))
      }
      app.save(itemsCol)
    }

    // 3. Garantir tabela pcp_mp_inventory_audit_events
    if (!app.hasTable('pcp_mp_inventory_audit_events')) {
      const auditCol = new Collection({
        name: 'pcp_mp_inventory_audit_events',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'demand_id', type: 'text' },
          { name: 'control_number', type: 'text', required: true },
          { name: 'event_type', type: 'text', required: true },
          { name: 'event_description', type: 'text', required: true },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_role', type: 'text' },
          { name: 'before_data', type: 'json' },
          { name: 'after_data', type: 'json' },
          { name: 'pieces_count', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_inv_aud_dem ON pcp_mp_inventory_audit_events (demand_id)',
          'CREATE INDEX idx_pcp_inv_aud_ctrl ON pcp_mp_inventory_audit_events (control_number)',
          'CREATE INDEX idx_pcp_inv_aud_evt ON pcp_mp_inventory_audit_events (event_type)',
        ],
      })
      app.save(auditCol)
    } else {
      const auditCol = app.findCollectionByNameOrId('pcp_mp_inventory_audit_events')
      auditCol.listRule = ''
      auditCol.viewRule = ''
      auditCol.createRule = ''
      auditCol.updateRule = ''
      auditCol.deleteRule = ''
      if (!auditCol.fields.getByName('before_data')) {
        auditCol.fields.add(new JSONField({ name: 'before_data' }))
      }
      if (!auditCol.fields.getByName('after_data')) {
        auditCol.fields.add(new JSONField({ name: 'after_data' }))
      }
      app.save(auditCol)
    }

    // 4. Garantir tabela pcp_mp_inventory_entries
    if (!app.hasTable('pcp_mp_inventory_entries')) {
      const entriesCol = new Collection({
        name: 'pcp_mp_inventory_entries',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'demand_id', type: 'text', required: true },
          { name: 'item_id', type: 'text' },
          { name: 'run_id', type: 'text' },
          { name: 'control_number', type: 'text', required: true },
          { name: 'run_number', type: 'text', required: true },
          { name: 'location_wms', type: 'text', required: true },
          { name: 'pieces_count', type: 'number', required: true },
          { name: 'user_id', type: 'text' },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_role', type: 'text' },
          { name: 'entry_date_formatted', type: 'text' },
          { name: 'observation', type: 'text' },
          { name: 'is_active', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_inv_ent_dem ON pcp_mp_inventory_entries (demand_id)',
          'CREATE INDEX idx_pcp_inv_ent_ctrl ON pcp_mp_inventory_entries (control_number)',
          'CREATE INDEX idx_pcp_inv_ent_run ON pcp_mp_inventory_entries (run_number)',
        ],
      })
      app.save(entriesCol)
    } else {
      const entriesCol = app.findCollectionByNameOrId('pcp_mp_inventory_entries')
      entriesCol.listRule = ''
      entriesCol.viewRule = ''
      entriesCol.createRule = ''
      entriesCol.updateRule = ''
      entriesCol.deleteRule = ''
      if (!entriesCol.fields.getByName('item_id')) {
        entriesCol.fields.add(new TextField({ name: 'item_id' }))
      }
      app.save(entriesCol)
    }

    // 5. Garantir tabela pcp_mp_inventory_gauges
    if (!app.hasTable('pcp_mp_inventory_gauges')) {
      const gaugesCol = new Collection({
        name: 'pcp_mp_inventory_gauges',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'demand_id', type: 'text', required: true },
          { name: 'gauge_description', type: 'text', required: true },
          { name: 'application', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_pcp_inv_gaug_dem ON pcp_mp_inventory_gauges (demand_id)'],
      })
      app.save(gaugesCol)
    }

    // 6. Garantir tabela pcp_mp_inventory_runs
    if (!app.hasTable('pcp_mp_inventory_runs')) {
      const runsCol = new Collection({
        name: 'pcp_mp_inventory_runs',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'demand_id', type: 'text', required: true },
          { name: 'run_number', type: 'text', required: true },
          { name: 'status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_pcp_inv_runs_dem ON pcp_mp_inventory_runs (demand_id)'],
      })
      app.save(runsCol)
    }
  },
  (app) => {
    // Revert no-op para segurança
  },
)

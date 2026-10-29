migrate(
  (app) => {
    // 1. mp_dimensional_inventory_notes
    if (!app.hasTable('mp_dimensional_inventory_notes')) {
      const notesCol = new Collection({
        name: 'mp_dimensional_inventory_notes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'material_id', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'block_number', type: 'text' },
          { name: 'batch_number', type: 'text' },
          { name: 'heat_number', type: 'text' },
          { name: 'note_text', type: 'text', required: true },
          { name: 'author_name', type: 'text', required: true },
          { name: 'author_email', type: 'text' },
          { name: 'author_role', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_din_mat ON mp_dimensional_inventory_notes (material_id)',
          'CREATE INDEX idx_mp_din_code ON mp_dimensional_inventory_notes (material_code)',
        ],
      })
      app.save(notesCol)
    }

    // 2. mp_multiple_cutting_plans
    if (!app.hasTable('mp_multiple_cutting_plans')) {
      const multiPlansCol = new Collection({
        name: 'mp_multiple_cutting_plans',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'plan_code', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text' },
          { name: 'steel_grade', type: 'text' },
          { name: 'batch_number', type: 'text' },
          { name: 'heat_number', type: 'text' },
          { name: 'supplier_code', type: 'text' },
          { name: 'supplier_name', type: 'text' },
          { name: 'center_code', type: 'text' },
          { name: 'line_code', type: 'text' },
          { name: 'gauge_dimension', type: 'text' },
          { name: 'block_weight_tons', type: 'number' },
          { name: 'thickness_mm', type: 'number' },
          { name: 'width_mm', type: 'number' },
          { name: 'length_mm', type: 'number' },
          { name: 'linear_mass_kg_m', type: 'number' },
          { name: 'projected_rolled_length_m', type: 'number' },
          { name: 'cutting_yield_pct', type: 'number' },
          { name: 'total_used_length_m', type: 'number' },
          { name: 'leftover_length_m', type: 'number' },
          { name: 'leftover_weight_tons', type: 'number' },
          { name: 'scrap_length_m', type: 'number' },
          { name: 'scrap_weight_tons', type: 'number' },
          { name: 'pieces_count', type: 'number' },
          { name: 'ai_score', type: 'number' },
          { name: 'ai_technical_justification', type: 'text' },
          { name: 'allocated_applications_json', type: 'json' },
          { name: 'multiples_summary_json', type: 'json' },
          { name: 'status', type: 'text' },
          { name: 'created_by_user_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_mcp_code ON mp_multiple_cutting_plans (plan_code)',
          'CREATE INDEX idx_mp_mcp_mat ON mp_multiple_cutting_plans (material_code)',
          'CREATE INDEX idx_mp_mcp_heat ON mp_multiple_cutting_plans (heat_number)',
        ],
      })
      app.save(multiPlansCol)
    }
  },
  (app) => {
    if (app.hasTable('mp_dimensional_inventory_notes')) {
      const col = app.findCollectionByNameOrId('mp_dimensional_inventory_notes')
      app.delete(col)
    }
    if (app.hasTable('mp_multiple_cutting_plans')) {
      const col = app.findCollectionByNameOrId('mp_multiple_cutting_plans')
      app.delete(col)
    }
  },
)

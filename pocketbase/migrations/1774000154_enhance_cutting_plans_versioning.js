migrate(
  (app) => {
    // 1. mp_multiple_cutting_plans: criar se não existir ou enriquecer se existir
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
          // Campos adicionados na 1774000154
          { name: 'version', type: 'number', min: 1 },
          { name: 'plan_type', type: 'text' },
          { name: 'parent_plan_id', type: 'text' },
          { name: 'is_latest', type: 'bool' },
          { name: 'version_notes', type: 'text' },
          { name: 'distribution_cuts_json', type: 'json' },
          { name: 'audit_history_json', type: 'json' },
          { name: 'responsible_user_name', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_mcp_code ON mp_multiple_cutting_plans (plan_code)',
          'CREATE INDEX idx_mp_mcp_mat ON mp_multiple_cutting_plans (material_code)',
          'CREATE INDEX idx_mp_mcp_heat ON mp_multiple_cutting_plans (heat_number)',
          'CREATE INDEX idx_mp_mcp_latest ON mp_multiple_cutting_plans (is_latest)',
          'CREATE INDEX idx_mp_mcp_type ON mp_multiple_cutting_plans (plan_type)',
        ],
      })
      app.save(multiPlansCol)
    } else {
      const col = app.findCollectionByNameOrId('mp_multiple_cutting_plans')
      if (!col.fields.getByName('version')) {
        col.fields.add(new NumberField({ name: 'version', min: 1 }))
      }
      if (!col.fields.getByName('plan_type')) {
        col.fields.add(new TextField({ name: 'plan_type' }))
      }
      if (!col.fields.getByName('parent_plan_id')) {
        col.fields.add(new TextField({ name: 'parent_plan_id' }))
      }
      if (!col.fields.getByName('is_latest')) {
        col.fields.add(new BoolField({ name: 'is_latest' }))
      }
      if (!col.fields.getByName('version_notes')) {
        col.fields.add(new TextField({ name: 'version_notes' }))
      }
      if (!col.fields.getByName('distribution_cuts_json')) {
        col.fields.add(new JSONField({ name: 'distribution_cuts_json' }))
      }
      if (!col.fields.getByName('audit_history_json')) {
        col.fields.add(new JSONField({ name: 'audit_history_json' }))
      }
      if (!col.fields.getByName('responsible_user_name')) {
        col.fields.add(new TextField({ name: 'responsible_user_name' }))
      }
      app.save(col)
    }

    // 2. mp_cutting_plan_sequences
    if (!app.hasTable('mp_cutting_plan_sequences')) {
      const seqCol = new Collection({
        name: 'mp_cutting_plan_sequences',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'prefix', type: 'text', required: true },
          { name: 'year', type: 'number', required: true },
          { name: 'current_number', type: 'number', required: true },
          { name: 'sequence_key', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_seq_key ON mp_cutting_plan_sequences (sequence_key)',
          'CREATE UNIQUE INDEX idx_mp_seq_prefix_year ON mp_cutting_plan_sequences (prefix, year)',
        ],
      })
      app.save(seqCol)
    }
  },
  (app) => {
    if (app.hasTable('mp_cutting_plan_sequences')) {
      const col = app.findCollectionByNameOrId('mp_cutting_plan_sequences')
      app.delete(col)
    }
  },
)

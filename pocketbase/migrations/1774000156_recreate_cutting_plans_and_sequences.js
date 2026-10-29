migrate(
  (app) => {
    // 1. mp_multiple_cutting_plans
    if (!app.hasTable('mp_multiple_cutting_plans')) {
      const collection = new Collection({
        name: 'mp_multiple_cutting_plans',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          new TextField({ name: 'plan_code', required: true }),
          new TextField({ name: 'material_code', required: true }),
          new TextField({ name: 'material_description' }),
          new TextField({ name: 'steel_grade' }),
          new TextField({ name: 'batch_number' }),
          new TextField({ name: 'heat_number' }),
          new TextField({ name: 'supplier_code' }),
          new TextField({ name: 'supplier_name' }),
          new TextField({ name: 'center_code' }),
          new TextField({ name: 'line_code' }),
          new TextField({ name: 'gauge_dimension' }),
          new NumberField({ name: 'block_weight_tons' }),
          new NumberField({ name: 'thickness_mm' }),
          new NumberField({ name: 'width_mm' }),
          new NumberField({ name: 'length_mm' }),
          new NumberField({ name: 'linear_mass_kg_m' }),
          new NumberField({ name: 'projected_rolled_length_m' }),
          new NumberField({ name: 'cutting_yield_pct' }),
          new NumberField({ name: 'total_used_length_m' }),
          new NumberField({ name: 'leftover_length_m' }),
          new NumberField({ name: 'leftover_weight_tons' }),
          new NumberField({ name: 'scrap_length_m' }),
          new NumberField({ name: 'scrap_weight_tons' }),
          new NumberField({ name: 'pieces_count' }),
          new NumberField({ name: 'ai_score' }),
          new TextField({ name: 'ai_technical_justification' }),
          new JSONField({ name: 'allocated_applications_json' }),
          new JSONField({ name: 'multiples_summary_json' }),
          new TextField({ name: 'status' }),
          new TextField({ name: 'created_by_user_name' }),
          new NumberField({ name: 'version', min: 1 }),
          new TextField({ name: 'plan_type' }),
          new TextField({ name: 'parent_plan_id' }),
          new BoolField({ name: 'is_latest' }),
          new TextField({ name: 'version_notes' }),
          new JSONField({ name: 'distribution_cuts_json' }),
          new JSONField({ name: 'audit_history_json' }),
          new TextField({ name: 'responsible_user_name' }),
        ],
        indexes: [
          'CREATE INDEX idx_mp_mcp_code ON mp_multiple_cutting_plans (plan_code)',
          'CREATE INDEX idx_mp_mcp_mat ON mp_multiple_cutting_plans (material_code)',
          'CREATE INDEX idx_mp_mcp_heat ON mp_multiple_cutting_plans (heat_number)',
          'CREATE INDEX idx_mp_mcp_latest ON mp_multiple_cutting_plans (is_latest)',
          'CREATE INDEX idx_mp_mcp_type ON mp_multiple_cutting_plans (plan_type)',
        ],
      })
      app.save(collection)
    }

    // 2. mp_cutting_plan_sequences
    if (!app.hasTable('mp_cutting_plan_sequences')) {
      const seqCol = new Collection({
        name: 'mp_cutting_plan_sequences',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          new TextField({ name: 'prefix', required: true }),
          new NumberField({ name: 'year', required: true }),
          new NumberField({ name: 'current_number', required: true }),
          new TextField({ name: 'sequence_key', required: true }),
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
    try {
      if (app.hasTable('mp_cutting_plan_sequences')) {
        const col = app.findCollectionByNameOrId('mp_cutting_plan_sequences')
        app.delete(col)
      }
    } catch (_) {}
    try {
      if (app.hasTable('mp_multiple_cutting_plans')) {
        const col = app.findCollectionByNameOrId('mp_multiple_cutting_plans')
        app.delete(col)
      }
    } catch (_) {}
  },
)

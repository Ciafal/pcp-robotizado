// Migration 1774000133: Adicionar campos de lote e material em mp_cutting_simulations
migrate(
  (app) => {
    if (app.hasTable('mp_cutting_simulations')) {
      const col = app.findCollectionByNameOrId('mp_cutting_simulations')

      if (!col.fields.getByName('raw_material_code')) {
        col.fields.add(
          new TextField({
            name: 'raw_material_code',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('raw_material_description')) {
        col.fields.add(
          new TextField({
            name: 'raw_material_description',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('batch_number')) {
        col.fields.add(
          new TextField({
            name: 'batch_number',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('batch_initial_stock')) {
        col.fields.add(
          new NumberField({
            name: 'batch_initial_stock',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('batch_used_quantity')) {
        col.fields.add(
          new NumberField({
            name: 'batch_used_quantity',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('batch_projected_balance')) {
        col.fields.add(
          new NumberField({
            name: 'batch_projected_balance',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('storage_location')) {
        col.fields.add(
          new TextField({
            name: 'storage_location',
            required: false,
          }),
        )
      }

      if (!col.fields.getByName('center_code')) {
        col.fields.add(
          new TextField({
            name: 'center_code',
            required: false,
          }),
        )
      }

      app.save(col)
    } else {
      // Criação completa idempotente caso a tabela ainda não exista no live
      const simCol = new Collection({
        name: 'mp_cutting_simulations',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          { name: 'simulation_code', type: 'text', required: true },
          { name: 'company_code', type: 'text', required: true },
          { name: 'center_code', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'cutting_type', type: 'text', required: true },
          { name: 'optimization_criterion', type: 'text', required: true },
          { name: 'required_quantity', type: 'number', required: false },
          { name: 'required_weight_tons', type: 'number', required: false },
          { name: 'selected_standard_codes', type: 'json', required: false },
          { name: 'filter_parameters_snapshot', type: 'json', required: false },
          { name: 'scenarios_json', type: 'json', required: true },
          { name: 'best_scenario_id', type: 'text', required: false },
          { name: 'selected_scenario_id', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['SIMULADO', 'SELECIONADO', 'APROVADO_PCP', 'CANCELADO'],
          },
          { name: 'approved_plan_code', type: 'text', required: false },
          { name: 'created_by_user_name', type: 'text', required: false },
          { name: 'technical_justification', type: 'text', required: false },
          // Novos campos de persistência de Lote e Material
          { name: 'raw_material_code', type: 'text', required: false },
          { name: 'raw_material_description', type: 'text', required: false },
          { name: 'batch_number', type: 'text', required: false },
          { name: 'batch_initial_stock', type: 'number', required: false },
          { name: 'batch_used_quantity', type: 'number', required: false },
          { name: 'batch_projected_balance', type: 'number', required: false },
          { name: 'storage_location', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_cst_sim_code ON mp_cutting_simulations (simulation_code)',
          'CREATE INDEX idx_mp_cst_center_mat ON mp_cutting_simulations (center_code, material_code)',
          'CREATE INDEX idx_mp_cst_status ON mp_cutting_simulations (status)',
        ],
      })
      app.save(simCol)
    }
  },
  (app) => {
    // Reversão segura
    try {
      if (app.hasTable('mp_cutting_simulations')) {
        const col = app.findCollectionByNameOrId('mp_cutting_simulations')
        if (col.fields.getByName('raw_material_code')) col.fields.removeByName('raw_material_code')
        if (col.fields.getByName('raw_material_description'))
          col.fields.removeByName('raw_material_description')
        if (col.fields.getByName('batch_number')) col.fields.removeByName('batch_number')
        if (col.fields.getByName('batch_initial_stock'))
          col.fields.removeByName('batch_initial_stock')
        if (col.fields.getByName('batch_used_quantity'))
          col.fields.removeByName('batch_used_quantity')
        if (col.fields.getByName('batch_projected_balance'))
          col.fields.removeByName('batch_projected_balance')
        if (col.fields.getByName('storage_location')) col.fields.removeByName('storage_location')
        app.save(col)
      }
    } catch (_) {}
  },
)

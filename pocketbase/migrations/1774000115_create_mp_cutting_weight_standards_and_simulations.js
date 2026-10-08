migrate(
  (app) => {
    // 1. mp_cutting_weight_standards (Padrões de Peso para Corte)
    if (!app.hasTable('mp_cutting_weight_standards')) {
      const standardsCol = new Collection({
        name: 'mp_cutting_weight_standards',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Bloqueia destruição física; preserva padrões históricos (apenas inativação)
        fields: [
          new TextField({
            name: 'code',
            required: true,
          }),
          new TextField({
            name: 'description',
            required: true,
          }),
          new SelectField({
            name: 'cutting_type',
            required: true,
            maxSelect: 1,
            values: ['BLOCOS', 'MULTIPLOS'],
          }),
          new TextField({
            name: 'company_code',
            required: true,
          }),
          new JSONField({
            name: 'center_codes', // Múltiplos centros permitidos
            required: true,
          }),
          new JSONField({
            name: 'material_codes', // Seleção múltipla de MP
            required: true,
          }),
          new TextField({
            name: 'steel_family',
            required: false,
          }),
          new NumberField({
            name: 'target_weight_kg',
            required: true,
            min: 0.001,
          }),
          new NumberField({
            name: 'min_weight_kg',
            required: true,
            min: 0.001,
          }),
          new NumberField({
            name: 'max_weight_kg',
            required: true,
            min: 0.001,
          }),
          new NumberField({
            name: 'tolerance_lower_val',
            required: true,
            min: 0,
          }),
          new SelectField({
            name: 'tolerance_lower_type',
            required: true,
            maxSelect: 1,
            values: ['KG', 'PERCENT'],
          }),
          new NumberField({
            name: 'tolerance_upper_val',
            required: true,
            min: 0,
          }),
          new SelectField({
            name: 'tolerance_upper_type',
            required: true,
            maxSelect: 1,
            values: ['KG', 'PERCENT'],
          }),
          new SelectField({
            name: 'priority',
            required: true,
            maxSelect: 1,
            values: ['ALTA', 'MEDIA', 'BAIXA'],
          }),
          new DateField({
            name: 'start_date',
            required: true,
          }),
          new DateField({
            name: 'end_date',
            required: false,
          }),
          new SelectField({
            name: 'status',
            required: true,
            maxSelect: 1,
            values: ['ATIVO', 'INATIVO'],
          }),
          new TextField({
            name: 'technical_notes',
            required: false,
          }),
          new TextField({
            name: 'created_by_user_name',
            required: false,
          }),
          new TextField({
            name: 'updated_by_user_name',
            required: false,
          }),
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_cws_code ON mp_cutting_weight_standards (code)',
          'CREATE INDEX idx_mp_cws_status ON mp_cutting_weight_standards (status)',
          'CREATE INDEX idx_mp_cws_company ON mp_cutting_weight_standards (company_code)',
          'CREATE INDEX idx_mp_cws_type ON mp_cutting_weight_standards (cutting_type)',
        ],
      })
      app.save(standardsCol)
    }

    // 2. mp_cutting_simulations (Histórico de Simulações e Cenários Comparativos)
    if (!app.hasTable('mp_cutting_simulations')) {
      const simulationsCol = new Collection({
        name: 'mp_cutting_simulations',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
          new TextField({
            name: 'simulation_code',
            required: true,
          }),
          new TextField({
            name: 'company_code',
            required: true,
          }),
          new TextField({
            name: 'center_code',
            required: true,
          }),
          new TextField({
            name: 'material_code',
            required: true,
          }),
          new TextField({
            name: 'cutting_type',
            required: true,
          }),
          new TextField({
            name: 'optimization_criterion',
            required: true,
          }),
          new NumberField({
            name: 'required_quantity',
            required: false,
          }),
          new NumberField({
            name: 'required_weight_tons',
            required: false,
          }),
          new JSONField({
            name: 'selected_standard_codes',
            required: false,
          }),
          new JSONField({
            name: 'filter_parameters_snapshot',
            required: false,
          }),
          new JSONField({
            name: 'scenarios_json',
            required: true,
          }),
          new TextField({
            name: 'best_scenario_id',
            required: false,
          }),
          new TextField({
            name: 'selected_scenario_id',
            required: false,
          }),
          new SelectField({
            name: 'status',
            required: true,
            maxSelect: 1,
            values: ['SIMULADO', 'SELECIONADO', 'APROVADO_PCP', 'CANCELADO'],
          }),
          new TextField({
            name: 'approved_plan_code',
            required: false,
          }),
          new TextField({
            name: 'created_by_user_name',
            required: false,
          }),
          new TextField({
            name: 'technical_justification',
            required: false,
          }),
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_cst_sim_code ON mp_cutting_simulations (simulation_code)',
          'CREATE INDEX idx_mp_cst_center_mat ON mp_cutting_simulations (center_code, material_code)',
          'CREATE INDEX idx_mp_cst_status ON mp_cutting_simulations (status)',
        ],
      })
      app.save(simulationsCol)
    }
  },
  (app) => {
    try {
      if (app.hasTable('mp_cutting_simulations')) {
        const col = app.findCollectionByNameOrId('mp_cutting_simulations')
        app.delete(col)
      }
      if (app.hasTable('mp_cutting_weight_standards')) {
        const col = app.findCollectionByNameOrId('mp_cutting_weight_standards')
        app.delete(col)
      }
    } catch (_) {}
  },
)

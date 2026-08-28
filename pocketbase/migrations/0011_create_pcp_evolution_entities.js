migrate(
  (app) => {
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const usersCol = app.findCollectionByNameOrId('users')

    // 1. product_line_performances (Cadastro de Performance por Linha / Produto / Família)
    let perfCol
    try {
      perfCol = app.findCollectionByNameOrId('product_line_performances')
    } catch (_) {
      perfCol = new Collection({
        name: 'product_line_performances',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'PCP_ADMIN' || @request.auth.role = 'PCP_PROGRAMMER'",
        updateRule: "@request.auth.role = 'PCP_ADMIN' || @request.auth.role = 'PCP_PROGRAMMER'",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'company_code', type: 'text', required: true },
          { name: 'plant_code', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          { name: 'product_code', type: 'text', required: true },
          { name: 'product_name', type: 'text', required: true },
          { name: 'family_code', type: 'text', required: true },
          { name: 'min_capacity_rate', type: 'number', required: true },
          { name: 'max_capacity_rate', type: 'number', required: true },
          { name: 'planned_capacity_rate', type: 'number', required: true },
          { name: 'min_efficiency_pct', type: 'number', required: true },
          { name: 'expected_efficiency_pct', type: 'number', required: true },
          { name: 'standard_setup_minutes', type: 'number', required: true },
          { name: 'expected_yield_pct', type: 'number' },
          { name: 'restrictions_notes', type: 'text' },
          { name: 'version', type: 'number', required: true },
          { name: 'source_mode', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_plp_line_prod ON product_line_performances (line_code, product_code, version)',
        ],
      })
      app.save(perfCol)
    }

    // 2. production_deviations (Gatilhos Automáticos de Desvio & Ciclo de Aprendizado)
    let devCol
    try {
      devCol = app.findCollectionByNameOrId('production_deviations')
    } catch (_) {
      devCol = new Collection({
        name: 'production_deviations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'company_code', type: 'text', required: true },
          { name: 'plant_code', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          { name: 'order_number', type: 'text', required: true },
          { name: 'product_code', type: 'text', required: true },
          { name: 'family_code', type: 'text', required: true },
          { name: 'period', type: 'text' },
          { name: 'shift', type: 'text' },
          { name: 'planned_qty', type: 'number' },
          { name: 'projected_qty', type: 'number' },
          { name: 'realized_qty', type: 'number' },
          { name: 'gap_qty', type: 'number' },
          { name: 'adherence_pct', type: 'number' },
          { name: 'efficiency_pct', type: 'number' },
          { name: 'cause_taxonomy', type: 'text', required: true },
          { name: 'justification', type: 'text', required: true },
          { name: 'action_plan', type: 'text', required: true },
          { name: 'responsible_name', type: 'text', required: true },
          { name: 'deadline', type: 'text', required: true },
          { name: 'is_recurrent', type: 'bool' },
          { name: 'previous_action_efficacy', type: 'text' },
          { name: 'param_revision_proposed', type: 'bool' },
          { name: 'proposed_param_details', type: 'json' },
          { name: 'status', type: 'text', required: true },
          { name: 'efficacy_status', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pdev_line_ord ON production_deviations (line_code, order_number)',
        ],
      })
      app.save(devCol)
    }

    // 3. production_line_relationships (Dependências Múltiplas N:N e Roteamento Condicional)
    let relCol
    try {
      relCol = app.findCollectionByNameOrId('production_line_relationships')
    } catch (_) {
      relCol = new Collection({
        name: 'production_line_relationships',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'PCP_ADMIN'",
        updateRule: "@request.auth.role = 'PCP_ADMIN'",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'origin_line_code', type: 'text', required: true },
          { name: 'target_line_code', type: 'text', required: true },
          { name: 'relation_type', type: 'text', required: true },
          { name: 'product_code', type: 'text' },
          { name: 'family_code', type: 'text' },
          { name: 'routing_condition', type: 'text' },
          { name: 'priority_order', type: 'number' },
          { name: 'allocation_pct', type: 'number' },
          { name: 'capacity_limit_rate', type: 'number' },
          { name: 'standard_lead_time_minutes', type: 'number' },
          { name: 'buffer_min_tons', type: 'number' },
          { name: 'buffer_max_tons', type: 'number' },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          { name: 'status', type: 'text', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_plr_orig_dest ON production_line_relationships (origin_line_code, target_line_code)',
        ],
      })
      app.save(relCol)
    }

    // 4. line_double_approvals (Esteira de Aprovação Dupla: PCP + Gestor da Linha)
    let appCol
    try {
      appCol = app.findCollectionByNameOrId('line_double_approvals')
    } catch (_) {
      appCol = new Collection({
        name: 'line_double_approvals',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'entity_type', type: 'text', required: true }, // LINE_MASTER | RULE_PACK | SCHEDULE
          { name: 'entity_id', type: 'text', required: true },
          { name: 'line_code', type: 'text', required: true },
          { name: 'version', type: 'text', required: true },
          { name: 'change_reason', type: 'text', required: true },
          { name: 'pcp_approver_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'pcp_approved_at', type: 'date' },
          { name: 'pcp_notes', type: 'text' },
          {
            name: 'line_manager_approver_id',
            type: 'relation',
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'line_manager_approved_at', type: 'date' },
          { name: 'line_manager_notes', type: 'text' },
          { name: 'status', type: 'text', required: true }, // DRAFT | PENDING_PCP | PENDING_LINE_MANAGER | APPROVED | REJECTED
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_lda_ent ON line_double_approvals (entity_type, entity_id, version)',
        ],
      })
      app.save(appCol)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('product_line_performances'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('production_deviations'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('production_line_relationships'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('line_double_approvals'))
    } catch (_) {}
  },
)

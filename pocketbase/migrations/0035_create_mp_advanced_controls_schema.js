migrate(
  (app) => {
    // 1. mp_destinations_inventory (Visão de Lotes por Destino, Industrializadores, Sobras e Classificação de Forma)
    let destInvCol
    try {
      destInvCol = app.findCollectionByNameOrId('mp_destinations_inventory')
    } catch (_) {
      destInvCol = new Collection({
        name: 'mp_destinations_inventory',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'batch_number', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_text', type: 'text' },
          { name: 'steel_grade', type: 'text', required: true },
          {
            name: 'mp_shape',
            type: 'select',
            values: ['PLACA', 'PALANQUILHA', 'TARUGO', 'LINGOTE', 'OUTRO'],
          },
          { name: 'storage_location', type: 'text', required: true },
          { name: 'storage_name', type: 'text' },
          { name: 'qty_unrestricted_tons', type: 'number', required: true },
          { name: 'qty_quality_tons', type: 'number' },
          { name: 'qty_blocked_tons', type: 'number' },
          { name: 'qty_total_tons', type: 'number', required: true },
          {
            name: 'destination_type',
            type: 'select',
            values: [
              'PRODUCAO_PROPRIA',
              'CLIENTE_INDUSTRIALIZADOR',
              'LINHA_INTERNA',
              'SEPARACAO',
              'SEM_APLICACAO',
              'OUTRO',
            ],
          },
          { name: 'destination_name', type: 'text', required: true },
          { name: 'client_name', type: 'text' },
          { name: 'client_code', type: 'text' },
          { name: 'application_code', type: 'text' },
          { name: 'physical_location', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'is_leftover', type: 'bool' },
          { name: 'leftover_age_days', type: 'number' },
          { name: 'qty_reserved_tons', type: 'number' },
          { name: 'qty_committed_tons', type: 'number' },
          { name: 'qty_effectively_free_tons', type: 'number' },
          { name: 'coverage_days', type: 'number' },
          { name: 'data_source', type: 'text' },
          { name: 'last_sync_date', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_destinv_batch ON mp_destinations_inventory (batch_number)',
          'CREATE INDEX idx_mp_destinv_mat ON mp_destinations_inventory (material_code, steel_grade)',
          'CREATE INDEX idx_mp_destinv_dest ON mp_destinations_inventory (destination_name, destination_type)',
          'CREATE INDEX idx_mp_destinv_client ON mp_destinations_inventory (client_name)',
        ],
      })
      app.save(destInvCol)
    }

    // 2. mp_batch_classification_history (Histórico e Fotografia Comparativa entre Fotos do Lote)
    let batchHistCol
    try {
      batchHistCol = app.findCollectionByNameOrId('mp_batch_classification_history')
    } catch (_) {
      batchHistCol = new Collection({
        name: 'mp_batch_classification_history',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'batch_number', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'change_type', type: 'text', required: true },
          { name: 'previous_destination', type: 'text' },
          { name: 'current_destination', type: 'text' },
          { name: 'previous_steel', type: 'text' },
          { name: 'current_steel', type: 'text' },
          { name: 'previous_application', type: 'text' },
          { name: 'current_application', type: 'text' },
          { name: 'previous_tons', type: 'number' },
          { name: 'current_tons', type: 'number' },
          { name: 'delta_tons', type: 'number' },
          { name: 'changed_at', type: 'date', required: true },
          { name: 'responsible_user_or_system', type: 'text', required: true },
          { name: 'alert_severity', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_batchhist_batch ON mp_batch_classification_history (batch_number)',
          'CREATE INDEX idx_mp_batchhist_date ON mp_batch_classification_history (changed_at DESC)',
        ],
      })
      app.save(batchHistCol)
    }

    // 3. mp_special_steels_projection (Projeção por Semana/Dia/Turno, Dimensões 525kg/510kg, Pools e Fatores de Rendimento)
    let specSteelCol
    try {
      specSteelCol = app.findCollectionByNameOrId('mp_special_steels_projection')
    } catch (_) {
      specSteelCol = new Collection({
        name: 'mp_special_steels_projection',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'scenario_name', type: 'text', required: true },
          { name: 'dimension_pool', type: 'text', required: true },
          { name: 'steel_class', type: 'text', required: true },
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'period_ref', type: 'text', required: true },
          { name: 'date_str', type: 'text', required: true },
          { name: 'shift_code', type: 'text' },
          { name: 'initial_stock_tons', type: 'number', required: true },
          { name: 'receptions_tons', type: 'number' },
          { name: 'l2_production_tons', type: 'number' },
          { name: 'l2_useful_production_tons', type: 'number' },
          { name: 'l2_factor_applied', type: 'number' },
          { name: 'scheduled_consumption_tons', type: 'number', required: true },
          { name: 'final_stock_tons', type: 'number', required: true },
          { name: 'min_stock_limit_tons', type: 'number' },
          { name: 'is_rupture', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_specsteel_scen ON mp_special_steels_projection (scenario_name, dimension_pool, steel_class)',
          'CREATE INDEX idx_mp_specsteel_date ON mp_special_steels_projection (date_str, period_ref)',
        ],
      })
      app.save(specSteelCol)
    }

    // 4. mp_l1_requirements_matrix (Matriz de Necessidade L1, KS, Depósitos DP07/04, Produção L2 e Fornecedores)
    let l1ReqCol
    try {
      l1ReqCol = app.findCollectionByNameOrId('mp_l1_requirements_matrix')
    } catch (_) {
      l1ReqCol = new Collection({
        name: 'mp_l1_requirements_matrix',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'dimension_desc', type: 'text', required: true },
          { name: 'stock_ks_tons', type: 'number' },
          { name: 'stock_dp07_tons', type: 'number' },
          { name: 'stock_dp04_tons', type: 'number' },
          { name: 'stock_other_depots_tons', type: 'number' },
          { name: 'ks_cut_tons', type: 'number' },
          { name: 'l2_production_weekly_tons', type: 'number' },
          { name: 'po_supplier_balance_tons', type: 'number' },
          { name: 'l1_schedule_weekly_tons', type: 'number' },
          { name: 'total_consumption_tons', type: 'number', required: true },
          { name: 'projected_balance_tons', type: 'number', required: true },
          { name: 'min_stock_tons', type: 'number' },
          { name: 'need_produce_l2_tons', type: 'number' },
          { name: 'need_l2_week', type: 'text' },
          { name: 'need_l2_deadline', type: 'date' },
          { name: 'impacted_l1_orders_json', type: 'json' },
          { name: 'auto_status', type: 'text', required: true },
          { name: 'human_observation', type: 'text' },
          { name: 'physical_location_summary', type: 'text' },
          { name: 'suppliers_breakdown_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_l1req_steel ON mp_l1_requirements_matrix (steel_grade, dimension_desc)',
          'CREATE INDEX idx_mp_l1req_status ON mp_l1_requirements_matrix (auto_status)',
        ],
      })
      app.save(l1ReqCol)
    }

    // 5. mp_utilization_history (Histórico de Utilização, Substituição 1020 vs AC, Enfornamento Quente/Frio e Desvios por Ordem)
    let utilHistCol
    try {
      utilHistCol = app.findCollectionByNameOrId('mp_utilization_history')
    } catch (_) {
      utilHistCol = new Collection({
        name: 'mp_utilization_history',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'order_number', type: 'text', required: true },
          { name: 'period_week', type: 'text' },
          { name: 'period_month', type: 'text' },
          { name: 'period_year', type: 'number' },
          { name: 'product_code', type: 'text', required: true },
          { name: 'product_description', type: 'text' },
          { name: 'produced_tons', type: 'number', required: true },
          { name: 'mp_consumed_code', type: 'text', required: true },
          { name: 'mp_consumed_tons', type: 'number', required: true },
          { name: 'steel_grade', type: 'text', required: true },
          { name: 'origin_group', type: 'text' },
          { name: 'supplier_name', type: 'text' },
          { name: 'hot_charging_tons', type: 'number' },
          { name: 'cold_charging_tons', type: 'number' },
          { name: 'charging_type', type: 'select', values: ['QUENTE', 'FRIO', 'MISTO'] },
          { name: 'standard_mp_rule', type: 'text' },
          { name: 'could_be_ac', type: 'bool' },
          { name: 'could_be_a', type: 'bool' },
          { name: 'should_be_1020', type: 'bool' },
          { name: 'is_substitute_application', type: 'bool' },
          { name: 'substitution_category', type: 'text' },
          { name: 'deviation_detected', type: 'bool' },
          { name: 'deviation_impact_tons', type: 'number' },
          { name: 'deviation_reason', type: 'text' },
          { name: 'observation', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mp_util_order ON mp_utilization_history (order_number, product_code)',
          'CREATE INDEX idx_mp_util_steel ON mp_utilization_history (steel_grade, period_month, period_year)',
          'CREATE INDEX idx_mp_util_dev ON mp_utilization_history (deviation_detected, is_substitute_application)',
        ],
      })
      app.save(utilHistCol)
    }

    // 6. mp_governance_parameters (Parâmetros versionados: Limite Sobra 0,35t, Fator Atendimento L2, Estoque Mínimo)
    let govParamCol
    try {
      govParamCol = app.findCollectionByNameOrId('mp_governance_parameters')
    } catch (_) {
      govParamCol = new Collection({
        name: 'mp_governance_parameters',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'param_key', type: 'text', required: true },
          { name: 'param_name', type: 'text', required: true },
          { name: 'param_value', type: 'number', required: true },
          { name: 'unit', type: 'text' },
          { name: 'version', type: 'number', required: true },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          { name: 'line_target', type: 'text' },
          { name: 'source_authority', type: 'text' },
          { name: 'responsible_name', type: 'text' },
          { name: 'description', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_mp_gov_key ON mp_governance_parameters (param_key, version)'],
      })
      app.save(govParamCol)
    }

    // 7. Definir Agente de IA Especialista em Matéria-Prima via $ai.agents.define
    try {
      $ai.agents.define(app, {
        slug: 'ciafal-mp-analyst-agent',
        name: 'Agente Especialista em Matéria-Prima CIAFAL',
        description:
          'Agente de IA especializado na análise contínua de estoques de MP, projeções de ruptura, simulação de compras, balanço por destino/industrializadores, atendimento L2 e desvios de aplicação.',
        systemPrompt:
          'Você é o Engenheiro Especialista em Matéria-Prima e PCP do HUB CIAFAL. Analise estoque atual, consumo programado, recebimentos futuros SAP ECC, sobras sem aplicação, disponibilidade de clientes industrializadores, níveis de aços especiais e desvios de substituição (como 1020 no lugar de AC). Explique fórmulas, aponte causas de ruptura e proponha ações assertivas em conformidade com as regras CIAFAL.',
        tier: 'fast',
        tools: [
          { collection: 'mp_destinations_inventory', perms: { read: true, list: true } },
          { collection: 'mp_special_steels_projection', perms: { read: true, list: true } },
          { collection: 'mp_l1_requirements_matrix', perms: { read: true, list: true } },
          { collection: 'mp_utilization_history', perms: { read: true, list: true } },
          { collection: 'mp_future_inventory_projection', perms: { read: true, list: true } },
          { collection: 'mp_purchase_orders', perms: { read: true, list: true } },
          { collection: 'mp_dimensional_inventory', perms: { read: true, list: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text: 'Diretrizes Oficiais CIAFAL MP: Pantone 2945 (#004C97), limite padrão de sobra sem aplicação 0,35t, fator de atendimento L2 parametrizável, dupla metodologia de ruptura (modelo Excel histórico vs motor diário de ruptura operacional), rastreabilidade total lote a lote e integração oficial SAP ECC.',
            },
          },
        ],
      })
    } catch (e) {
      console.log('Skip AI Agent creation skipped or not supported:', e)
    }
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'ciafal-mp-analyst-agent')
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_governance_parameters'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_utilization_history'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_l1_requirements_matrix'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_special_steels_projection'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_batch_classification_history'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('mp_destinations_inventory'))
    } catch (_) {}
  },
)

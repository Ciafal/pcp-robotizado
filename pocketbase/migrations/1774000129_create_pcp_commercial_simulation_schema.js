migrate(
  (app) => {
    // 1. Coleção principal de Simulações Comerciais
    if (!app.hasTable('pcp_commercial_simulations')) {
      const colSim = new Collection({
        name: 'pcp_commercial_simulations',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'simulation_code', type: 'text', required: true }, // ex.: SIM-000001/2026
          { name: 'year', type: 'number', required: true },
          { name: 'seq_number', type: 'number', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'customer_code', type: 'text', required: false },
          { name: 'product_code', type: 'text', required: true },
          { name: 'product_description', type: 'text', required: false },
          { name: 'requested_quantity_tons', type: 'number', required: true },
          { name: 'unit_measure', type: 'text', required: false }, // padrão 't'
          { name: 'requested_deadline', type: 'text', required: true }, // dd/mm/aaaa ou YYYY-MM-DD
          { name: 'order_or_opportunity', type: 'text', required: false },
          {
            name: 'commercial_priority',
            type: 'select',
            required: false,
            values: ['NORMAL', 'ALTA', 'ESTRATEGICA', 'URGENTE'],
          },
          { name: 'notes', type: 'text', required: false },
          // Status da simulação
          {
            name: 'viability',
            type: 'select',
            required: true,
            values: ['VIAVEL', 'VIAVEL_COM_AJUSTE', 'PARCIALMENTE_VIAVEL', 'NAO_VIAVEL'],
          },
          { name: 'best_date_possible', type: 'text', required: false },
          { name: 'date_difference_days', type: 'number', required: false },
          { name: 'quantity_possible_requested_date', type: 'number', required: false },
          { name: 'quantity_possible_requested_pct', type: 'number', required: false },
          { name: 'quantity_total_possible', type: 'number', required: false },
          { name: 'date_total_quantity_available', type: 'text', required: false },
          {
            name: 'raw_material_status',
            type: 'select',
            required: false,
            values: [
              'DISPONIVEL',
              'PARCIALMENTE_DISPONIVEL',
              'INDISPONIVEL',
              'AGUARDANDO_RECEBIMENTO',
            ],
          },
          { name: 'capacity_impact_text', type: 'text', required: false },
          {
            name: 'schedule_change_severity',
            type: 'select',
            required: false,
            values: [
              'NAO_NECESSARIA',
              'PEQUENO_AJUSTE',
              'REPROGRAMACAO_NECESSARIA',
              'IMPACTO_CRITICO',
            ],
          },
          { name: 'impacted_orders_count', type: 'number', required: false },
          { name: 'delayed_orders_count', type: 'number', required: false },
          { name: 'selected_scenario_id', type: 'text', required: false }, // A, B, C
          {
            name: 'approval_status',
            type: 'select',
            required: true,
            values: [
              'SIMULADA',
              'AGUARDANDO_ANALISE_PCP',
              'APROVADA_PCP',
              'REPROVADA_PCP',
              'SOLICITADO_AJUSTE_PCP',
            ],
          },
          { name: 'is_data_complete', type: 'bool', required: false },
          { name: 'missing_data_reasons', type: 'json', required: false },
          { name: 'snapshot_id', type: 'text', required: false },
          { name: 'created_by_id', type: 'text', required: false },
          { name: 'created_by_name', type: 'text', required: false },
          { name: 'created_by_role', type: 'text', required: false },
          { name: 'created_by_email', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcs_code ON pcp_commercial_simulations (simulation_code)',
          'CREATE INDEX idx_pcs_cust ON pcp_commercial_simulations (customer_name)',
          'CREATE INDEX idx_pcs_prod ON pcp_commercial_simulations (product_code)',
          'CREATE INDEX idx_pcs_status ON pcp_commercial_simulations (approval_status)',
          'CREATE INDEX idx_pcs_created ON pcp_commercial_simulations (created)',
        ],
      })
      app.save(colSim)
    }

    // 2. Coleção de Snapshots Imutáveis de Resultados da Simulação
    if (!app.hasTable('pcp_simulation_snapshots')) {
      const colSnap = new Collection({
        name: 'pcp_simulation_snapshots',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'simulation_id', type: 'text', required: true },
          { name: 'simulation_code', type: 'text', required: true },
          { name: 'parameters_snapshot', type: 'json', required: true },
          { name: 'kpis_snapshot', type: 'json', required: true },
          { name: 'production_centers_snapshot', type: 'json', required: true },
          { name: 'sequence_impact_snapshot', type: 'json', required: true },
          { name: 'delivery_impact_snapshot', type: 'json', required: true },
          { name: 'delayed_orders_snapshot', type: 'json', required: true },
          { name: 'raw_material_snapshot', type: 'json', required: true },
          { name: 'capacity_snapshot', type: 'json', required: true },
          { name: 'setup_sequencing_snapshot', type: 'json', required: true },
          { name: 'scenarios_comparison_snapshot', type: 'json', required: true },
          { name: 'commercial_response_snapshot', type: 'json', required: true },
          { name: 'gantt_comparison_snapshot', type: 'json', required: true },
          { name: 'data_reliability_snapshot', type: 'json', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: [
          'CREATE INDEX idx_pss_sim_id ON pcp_simulation_snapshots (simulation_id)',
          'CREATE INDEX idx_pss_sim_code ON pcp_simulation_snapshots (simulation_code)',
        ],
      })
      app.save(colSnap)
    }

    // 3. Coleção de Solicitações e Decisões de Análise do PCP
    if (!app.hasTable('pcp_simulation_analysis_requests')) {
      const colReq = new Collection({
        name: 'pcp_simulation_analysis_requests',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'simulation_id', type: 'text', required: true },
          { name: 'simulation_code', type: 'text', required: true },
          { name: 'customer_name', type: 'text', required: true },
          { name: 'product_code', type: 'text', required: true },
          { name: 'product_description', type: 'text', required: false },
          { name: 'requested_quantity_tons', type: 'number', required: true },
          { name: 'requested_deadline', type: 'text', required: true },
          { name: 'chosen_scenario', type: 'text', required: true }, // 'A', 'B', 'C'
          { name: 'calculated_best_date', type: 'text', required: false },
          { name: 'commercial_notes', type: 'text', required: false },
          { name: 'requester_id', type: 'text', required: true },
          { name: 'requester_name', type: 'text', required: true },
          { name: 'requester_email', type: 'text', required: false },
          { name: 'requester_role', type: 'text', required: false },
          { name: 'request_datetime', type: 'text', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'AGUARDANDO_ANALISE_PCP',
              'APROVADA_PCP',
              'REPROVADA_PCP',
              'SOLICITADO_AJUSTE_PCP',
            ],
          },
          { name: 'pcp_analyst_id', type: 'text', required: false },
          { name: 'pcp_analyst_name', type: 'text', required: false },
          { name: 'pcp_decision_datetime', type: 'text', required: false },
          { name: 'pcp_feedback_notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_psar_sim ON pcp_simulation_analysis_requests (simulation_id)',
          'CREATE INDEX idx_psar_status ON pcp_simulation_analysis_requests (status)',
          'CREATE INDEX idx_psar_req ON pcp_simulation_analysis_requests (request_datetime)',
        ],
      })
      app.save(colReq)
    }

    // 4. Cadastrar Permissões RBAC na tabela pcp_permissions se ela existir
    if (app.hasTable('pcp_permissions')) {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      const newPerms = [
        {
          name: 'Consultar e Criar Simulação Comercial',
          key: 'pcp.simulation.view',
          category: 'Simulação Comercial',
          description:
            'Permite ao Comercial criar cenários virtuais, consultar viabilidade e submeter ao PCP.',
          is_critical: false,
        },
        {
          name: 'Submeter Simulação para Análise do PCP',
          key: 'pcp.simulation.submit',
          category: 'Simulação Comercial',
          description:
            'Permite ao Comercial enviar solicitações formais de avaliação de simulação para o PCP.',
          is_critical: false,
        },
        {
          name: 'Analisar e Decidir Simulações Comerciais',
          key: 'pcp.simulation.decide',
          category: 'Simulação Comercial',
          description:
            'Permite aos analistas e programadores do PCP aprovar, reprovar ou solicitar ajuste de simulações.',
          is_critical: true,
        },
        {
          name: 'Gestão Completa de Simulações Comerciais',
          key: 'pcp.simulation.manage',
          category: 'Simulação Comercial',
          description:
            'Permite a supervisores e gestores visualizar todos os cenários, auditoria e histórico integral.',
          is_critical: true,
        },
      ]

      newPerms.forEach((p) => {
        try {
          const existing = app.findFirstRecordByFilter('pcp_permissions', `key = '${p.key}'`)
          if (!existing) {
            const rec = new Record(permsCol)
            rec.set('name', p.name)
            rec.set('key', p.key)
            rec.set('category', p.category)
            rec.set('description', p.description)
            rec.set('is_critical', p.is_critical)
            app.save(rec)
          }
        } catch (_) {}
      })
    }
  },
  (app) => {
    try {
      const c3 = app.findCollectionByNameOrId('pcp_simulation_analysis_requests')
      if (c3) app.delete(c3)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('pcp_simulation_snapshots')
      if (c2) app.delete(c2)
    } catch (_) {}
    try {
      const c1 = app.findCollectionByNameOrId('pcp_commercial_simulations')
      if (c1) app.delete(c1)
    } catch (_) {}
  },
)

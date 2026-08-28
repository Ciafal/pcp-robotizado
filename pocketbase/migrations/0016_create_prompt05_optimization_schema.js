migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    // 1. optimization_scenarios
    let scenCol
    try {
      scenCol = app.findCollectionByNameOrId('optimization_scenarios')
    } catch (_) {
      scenCol = new Collection({
        name: 'optimization_scenarios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'code', type: 'text', required: true },
          { name: 'description', type: 'text' },
          {
            name: 'type',
            type: 'select',
            values: ['BASELINE', 'SCENARIO_A', 'SCENARIO_B', 'SCENARIO_C', 'SCENARIO_D', 'CUSTOM'],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'profile',
            type: 'select',
            values: ['ATENDIMENTO', 'PRODUTIVIDADE', 'ESTOQUE', 'BALANCEADO', 'CUSTOM'],
            required: true,
            maxSelect: 1,
          },
          { name: 'horizon', type: 'text', required: true },
          { name: 'start_date', type: 'date' },
          { name: 'end_date', type: 'date' },
          { name: 'target_lines', type: 'json' },
          { name: 'target_products', type: 'json' },
          { name: 'objectives_weights', type: 'json' },
          { name: 'assumptions', type: 'text' },
          { name: 'solver_timeout_seconds', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: ['DRAFT', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
            required: true,
            maxSelect: 1,
          },
          { name: 'is_baseline', type: 'bool' },
          { name: 'responsible_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'responsible_name', type: 'text' },
          { name: 'latest_run_id', type: 'text' },
          { name: 'summary_kpis', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_opt_scen_code ON optimization_scenarios (code)',
          'CREATE INDEX idx_opt_scen_status ON optimization_scenarios (status)',
        ],
      })
      app.save(scenCol)
    }

    // 2. optimization_runs
    let runsCol
    try {
      runsCol = app.findCollectionByNameOrId('optimization_runs')
    } catch (_) {
      runsCol = new Collection({
        name: 'optimization_runs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'scenario_id',
            type: 'relation',
            collectionId: scenCol.id,
            required: true,
            maxSelect: 1,
          },
          { name: 'engine_name', type: 'text', required: true },
          { name: 'engine_version', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'solver_solution_status',
            type: 'select',
            values: ['OPTIMAL', 'FEASIBLE', 'NO_SOLUTION', 'TIME_LIMIT', 'INFEASIBLE'],
            maxSelect: 1,
          },
          { name: 'execution_time_ms', type: 'number' },
          { name: 'objective_value', type: 'number' },
          { name: 'variables_count', type: 'number' },
          { name: 'constraints_count', type: 'number' },
          { name: 'gap_pct', type: 'number' },
          { name: 'input_snapshot', type: 'json' },
          { name: 'metrics_result', type: 'json' },
          { name: 'bottlenecks_result', type: 'json' },
          { name: 'executed_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'executed_by_name', type: 'text' },
          { name: 'error_message', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_opt_runs_scen ON optimization_runs (scenario_id, created DESC)',
          'CREATE INDEX idx_opt_runs_status ON optimization_runs (status)',
        ],
      })
      app.save(runsCol)
    }

    // 3. scenario_items (demand allocations per run)
    let scenItemsCol
    try {
      scenItemsCol = app.findCollectionByNameOrId('scenario_items')
    } catch (_) {
      scenItemsCol = new Collection({
        name: 'scenario_items',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'scenario_id',
            type: 'relation',
            collectionId: scenCol.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'run_id',
            type: 'relation',
            collectionId: runsCol.id,
            required: true,
            maxSelect: 1,
          },
          { name: 'demand_id', type: 'text', required: true },
          { name: 'order_number', type: 'text', required: true },
          { name: 'product_code', type: 'text', required: true },
          { name: 'product_name', type: 'text' },
          { name: 'family_code', type: 'text' },
          { name: 'demanded_quantity_tons', type: 'number', required: true },
          { name: 'allocated_quantity_tons', type: 'number' },
          {
            name: 'allocation_status',
            type: 'select',
            values: ['ALLOCATED', 'PARTIALLY_ALLOCATED', 'UNALLOCATED'],
            required: true,
            maxSelect: 1,
          },
          { name: 'unallocated_reason', type: 'text' },
          { name: 'assigned_line_id', type: 'relation', collectionId: linesCol.id, maxSelect: 1 },
          { name: 'assigned_line_code', type: 'text' },
          { name: 'route_id', type: 'text' },
          { name: 'route_code', type: 'text' },
          { name: 'route_version', type: 'number' },
          { name: 'raw_material_code', type: 'text' },
          { name: 'raw_material_priority', type: 'number' },
          { name: 'start_time', type: 'text' },
          { name: 'end_time', type: 'text' },
          { name: 'sequence_order', type: 'number' },
          { name: 'setup_duration_minutes', type: 'number' },
          { name: 'lead_time_minutes', type: 'number' },
          { name: 'deterministic_explanation', type: 'text' },
          { name: 'manual_override', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_scen_items_run ON scenario_items (run_id, allocation_status)',
          'CREATE INDEX idx_scen_items_scen ON scenario_items (scenario_id)',
        ],
      })
      app.save(scenItemsCol)
    }

    // 4. pcp_schedules (Official schedule proposals and versions)
    let schedulesCol
    try {
      schedulesCol = app.findCollectionByNameOrId('pcp_schedules')
    } catch (_) {
      schedulesCol = new Collection({
        name: 'pcp_schedules',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'horizon', type: 'text', required: true },
          { name: 'period_ref', type: 'text', required: true },
          { name: 'version', type: 'number', required: true },
          {
            name: 'origin_type',
            type: 'select',
            values: ['SYSTEM_GENERATED', 'AI_GENERATED', 'MANUAL', 'MIGRATED'],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'workflow_status',
            type: 'select',
            values: [
              'DRAFT',
              'PCP_REVIEW',
              'PENDING_DOUBLE_APPROVAL',
              'APPROVED_OFFICIAL',
              'REJECTED',
              'SUPERSEDED',
            ],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'source_scenario_id',
            type: 'relation',
            collectionId: scenCol.id,
            maxSelect: 1,
          },
          { name: 'source_run_id', type: 'relation', collectionId: runsCol.id, maxSelect: 1 },
          { name: 'created_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'reviewed_by_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'pcp_approval_notes', type: 'text' },
          { name: 'line_manager_approval_notes', type: 'text' },
          { name: 'total_planned_tons', type: 'number' },
          { name: 'total_items_count', type: 'number' },
          { name: 'adherence_projected_pct', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_schedules_code_ver ON pcp_schedules (code, version)',
          'CREATE INDEX idx_schedules_wf_status ON pcp_schedules (workflow_status)',
        ],
      })
      app.save(schedulesCol)
    }

    // 5. Cadastrar Novas Permissões Granulares do Prompt 05
    const prompt05Permissions = [
      {
        key: 'pcp.optimization.view',
        name: 'Visualizar Otimização e Cenários',
        category: 'Otimização CP-SAT',
        is_critical: false,
        description: 'Permite consultar cenários de otimização, simulações e métricas do solver',
      },
      {
        key: 'pcp.optimization.create',
        name: 'Criar Cenários de Otimização',
        category: 'Otimização CP-SAT',
        is_critical: false,
        description: 'Permite criar novos cenários, definir horizontes e configurar premissas',
      },
      {
        key: 'pcp.optimization.run',
        name: 'Executar Solver CP-SAT',
        category: 'Otimização CP-SAT',
        is_critical: true,
        description: 'Disparar motor de otimização determinístico com restrições e objetivos',
      },
      {
        key: 'pcp.optimization.compare',
        name: 'Comparar Cenários Multicritério',
        category: 'Otimização CP-SAT',
        is_critical: false,
        description: 'Acessar comparativo de até 4 cenários, baseline e trade-offs',
      },
      {
        key: 'pcp.optimization.convert',
        name: 'Transformar Cenário em Proposta',
        category: 'Otimização CP-SAT',
        is_critical: true,
        description: 'Converter cenário em proposta de programação oficial (PCP_REVIEW)',
      },
      {
        key: 'pcp.optimization.manage_objectives',
        name: 'Gerenciar Pesos e Perfis de Objetivos',
        category: 'Otimização CP-SAT',
        is_critical: true,
        description: 'Editar pesos de soft constraints e perfis de otimização A/B/C/D',
      },
    ]

    const permMap = {}
    for (const p of prompt05Permissions) {
      try {
        const existing = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
        permMap[p.key] = existing
      } catch (_) {
        const rec = new Record(permissionsCol)
        rec.set('key', p.key)
        rec.set('name', p.name)
        rec.set('category', p.category)
        rec.set('is_critical', p.is_critical)
        rec.set('description', p.description)
        app.save(rec)
        permMap[p.key] = rec
      }
    }

    // 6. Atribuir aos Perfis
    const roleMappings = {
      PCP_ADMIN: [
        'pcp.optimization.view',
        'pcp.optimization.create',
        'pcp.optimization.run',
        'pcp.optimization.compare',
        'pcp.optimization.convert',
        'pcp.optimization.manage_objectives',
      ],
      PCP_PROGRAMMER: [
        'pcp.optimization.view',
        'pcp.optimization.create',
        'pcp.optimization.run',
        'pcp.optimization.compare',
        'pcp.optimization.convert',
        'pcp.optimization.manage_objectives',
      ],
      LINE_MANAGER: ['pcp.optimization.view', 'pcp.optimization.compare'],
      PRODUCTION_VIEWER: ['pcp.optimization.view', 'pcp.optimization.compare'],
      EXECUTIVE_VIEWER: ['pcp.optimization.view', 'pcp.optimization.compare'],
      AUDITOR: ['pcp.optimization.view', 'pcp.optimization.compare'],
    }

    for (const [rCode, keys] of Object.entries(roleMappings)) {
      try {
        const roleRec = app.findFirstRecordByData('pcp_roles', 'code', rCode)
        for (const k of keys) {
          const permRec = permMap[k]
          if (!permRec) continue
          const existing = app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const rp = new Record(rolePermsCol)
            rp.set('role_id', roleRec.id)
            rp.set('permission_id', permRec.id)
            app.save(rp)
          }
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('pcp_schedules'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('scenario_items'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('optimization_runs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('optimization_scenarios'))
    } catch (_) {}
  },
)

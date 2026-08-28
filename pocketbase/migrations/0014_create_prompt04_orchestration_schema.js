migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const familiesCol = app.findCollectionByNameOrId('product_families')
    const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    // 1. Production Routes (production_routes)
    let routesCol
    try {
      routesCol = app.findCollectionByNameOrId('production_routes')
    } catch (_) {
      routesCol = new Collection({
        name: 'production_routes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          { name: 'product_code', type: 'text' },
          { name: 'family_id', type: 'relation', collectionId: familiesCol.id, maxSelect: 1 },
          { name: 'family_code', type: 'text' },
          { name: 'version', type: 'number', required: true },
          {
            name: 'status',
            type: 'select',
            values: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'INACTIVE', 'SUPERSEDED'],
            required: true,
            maxSelect: 1,
          },
          { name: 'active', type: 'bool' },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          { name: 'preferred', type: 'bool' },
          { name: 'author_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
          { name: 'author_name', type: 'text' },
          { name: 'change_reason', type: 'text' },
          { name: 'metadata', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pr_code_ver ON production_routes (code, version)',
          'CREATE INDEX idx_pr_status ON production_routes (status)',
        ],
      })
      app.save(routesCol)
    }

    // 2. Production Route Nodes (production_route_nodes)
    let nodesCol
    try {
      nodesCol = app.findCollectionByNameOrId('production_route_nodes')
    } catch (_) {
      nodesCol = new Collection({
        name: 'production_route_nodes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'route_id',
            type: 'relation',
            collectionId: routesCol.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'line_id',
            type: 'relation',
            collectionId: linesCol.id,
            required: true,
            maxSelect: 1,
          },
          { name: 'line_code', type: 'text', required: true },
          { name: 'process_name', type: 'text', required: true },
          { name: 'logical_order', type: 'number', required: true },
          { name: 'nominal_rate', type: 'number' },
          { name: 'capacity_unit', type: 'text' },
          { name: 'input_buffer_min', type: 'number' },
          { name: 'input_buffer_max', type: 'number' },
          { name: 'output_buffer_min', type: 'number' },
          { name: 'output_buffer_max', type: 'number' },
          { name: 'conditions_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_prn_route_ord ON production_route_nodes (route_id, logical_order)',
        ],
      })
      app.save(nodesCol)
    }

    // 3. Production Route Edges (production_route_edges)
    let edgesCol
    try {
      edgesCol = app.findCollectionByNameOrId('production_route_edges')
    } catch (_) {
      edgesCol = new Collection({
        name: 'production_route_edges',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'route_id',
            type: 'relation',
            collectionId: routesCol.id,
            required: true,
            maxSelect: 1,
          },
          { name: 'origin_line_code', type: 'text', required: true },
          { name: 'target_line_code', type: 'text', required: true },
          {
            name: 'relation_type',
            type: 'select',
            values: ['MANDATORY', 'OPTIONAL', 'ALTERNATIVE', 'PARALLEL', 'CONDITIONAL'],
            required: true,
            maxSelect: 1,
          },
          { name: 'priority', type: 'number' },
          { name: 'is_precedence_mandatory', type: 'bool' },
          { name: 'lead_time_minutes', type: 'number' },
          { name: 'buffer_min_tons', type: 'number' },
          { name: 'buffer_max_tons', type: 'number' },
          { name: 'buffer_target_tons', type: 'number' },
          { name: 'buffer_physical_type', type: 'text' },
          { name: 'buffer_unit', type: 'text' },
          { name: 'current_buffer_stock', type: 'number' },
          { name: 'projected_buffer_stock', type: 'number' },
          { name: 'condition_expression', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'INACTIVE', 'SUPERSEDED'],
            required: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pre_route_lines ON production_route_edges (route_id, origin_line_code, target_line_code)',
        ],
      })
      app.save(edgesCol)
    }

    // 4. Capacity Logs / Snapshots (production_capacity_logs)
    let capCol
    try {
      capCol = app.findCollectionByNameOrId('production_capacity_logs')
    } catch (_) {
      capCol = new Collection({
        name: 'production_capacity_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          {
            name: 'line_id',
            type: 'relation',
            collectionId: linesCol.id,
            required: true,
            maxSelect: 1,
          },
          { name: 'line_code', type: 'text', required: true },
          {
            name: 'period_type',
            type: 'select',
            values: ['SHIFT', 'DAY', 'WEEK', 'MONTH'],
            required: true,
            maxSelect: 1,
          },
          { name: 'period_ref', type: 'text', required: true },
          { name: 'unit', type: 'text', required: true },
          { name: 'nominal_capacity', type: 'number', required: true },
          { name: 'planned_stops_loss', type: 'number' },
          { name: 'planned_setup_loss', type: 'number' },
          { name: 'planned_calendar_loss', type: 'number' },
          { name: 'other_planned_loss', type: 'number' },
          { name: 'programmable_capacity', type: 'number', required: true },
          { name: 'unplanned_stops_loss', type: 'number' },
          { name: 'unplanned_setup_loss', type: 'number' },
          { name: 'maintenance_loss', type: 'number' },
          { name: 'material_shortage_loss', type: 'number' },
          { name: 'quality_defect_loss', type: 'number' },
          { name: 'bottleneck_loss', type: 'number' },
          { name: 'operational_loss', type: 'number' },
          { name: 'other_execution_loss', type: 'number' },
          { name: 'realized_capacity', type: 'number', required: true },
          { name: 'total_lost_capacity', type: 'number', required: true },
          { name: 'utilization_pct', type: 'number' },
          { name: 'efficiency_pct', type: 'number' },
          {
            name: 'bottleneck_risk',
            type: 'select',
            values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            maxSelect: 1,
          },
          {
            name: 'data_source',
            type: 'select',
            values: ['ESTIMATED_MOCK', 'MANUAL_AUDITED', 'MES_40_INTEGRATED', 'SAP_CONFIRMED'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcl_line_period ON production_capacity_logs (line_code, period_type, period_ref)',
        ],
      })
      app.save(capCol)
    }

    // 5. Cadastrar Novas Permissões Granulares do Prompt 04
    const newPermissions = [
      {
        key: 'pcp.route.view',
        name: 'Visualizar Rotas e Roteamentos N:N',
        category: 'Roteamento',
        is_critical: false,
        description: 'Consulta a rotas, predecessores, sucessores e grafos produtivos',
      },
      {
        key: 'pcp.route.create',
        name: 'Criar Rota Produtiva',
        category: 'Roteamento',
        is_critical: false,
        description: 'Criação de novos caminhos e matrizes de roteamento',
      },
      {
        key: 'pcp.route.edit',
        name: 'Editar Rota Produtiva',
        category: 'Roteamento',
        is_critical: true,
        description: 'Modificação de edges, buffers e predecessores da malha',
      },
      {
        key: 'pcp.route.submit',
        name: 'Submeter Rota para Aprovação',
        category: 'Roteamento',
        is_critical: false,
        description: 'Envio de rota em DRAFT para workflow de dupla aprovação',
      },
      {
        key: 'pcp.route.approve.pcp',
        name: 'Aprovar Rota (Fase 1 - PCP)',
        category: 'Aprovação',
        is_critical: true,
        description: 'Validação técnica e deferimento de rota pelo PCP',
      },
      {
        key: 'pcp.route.approve.manager',
        name: 'Aprovar Rota (Fase 2 - Gestor)',
        category: 'Aprovação',
        is_critical: true,
        description: 'Homologação de rota pelo gestor das linhas impactadas',
      },
      {
        key: 'pcp.capacity.manage',
        name: 'Gerenciar 4 Conceitos de Capacidade',
        category: 'Capacidade',
        is_critical: true,
        description: 'Ajuste de paradas programadas, perdas e capacidades programáveis',
      },
    ]

    const permMap = {}
    for (const p of newPermissions) {
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
        'pcp.route.view',
        'pcp.route.create',
        'pcp.route.edit',
        'pcp.route.submit',
        'pcp.route.approve.pcp',
        'pcp.route.approve.manager',
        'pcp.capacity.manage',
      ],
      PCP_PROGRAMMER: [
        'pcp.route.view',
        'pcp.route.create',
        'pcp.route.edit',
        'pcp.route.submit',
        'pcp.route.approve.pcp',
      ],
      LINE_MANAGER: ['pcp.route.view', 'pcp.route.approve.manager'],
      PRODUCTION_VIEWER: ['pcp.route.view'],
      EXECUTIVE_VIEWER: ['pcp.route.view'],
      AUDITOR: ['pcp.route.view'],
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
      app.delete(app.findCollectionByNameOrId('production_capacity_logs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('production_route_edges'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('production_route_nodes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('production_routes'))
    } catch (_) {}
  },
)

migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const plantsCol = app.findCollectionByNameOrId('plants')
    const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    // 1. inventory_items (Gestão de Estoques SAP/PCP)
    let invCol
    try {
      invCol = app.findCollectionByNameOrId('inventory_items')
    } catch (_) {
      invCol = new Collection({
        name: 'inventory_items',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'plant_code', type: 'text', required: true },
          { name: 'storage_location', type: 'text', required: true }, // Depósito SAP ex: DEP-MP-01
          { name: 'storage_location_name', type: 'text' },
          { name: 'material_code', type: 'text', required: true },
          { name: 'material_description', type: 'text', required: true },
          {
            name: 'category',
            type: 'select',
            values: ['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOOD', 'OTHER'],
            required: true,
            maxSelect: 1,
          },
          { name: 'family_code', type: 'text' },
          { name: 'batch_number', type: 'text' },
          { name: 'unit', type: 'text', required: true }, // 't', 'kg', 'peça', 'm'
          { name: 'qty_unrestricted', type: 'number', required: true }, // Disponível
          { name: 'qty_blocked', type: 'number' },
          { name: 'qty_in_quality', type: 'number' },
          { name: 'qty_reserved', type: 'number' },
          { name: 'qty_total', type: 'number', required: true },
          { name: 'min_stock', type: 'number' },
          { name: 'target_stock', type: 'number' },
          { name: 'max_stock', type: 'number' },
          {
            name: 'source_mode',
            type: 'select',
            values: ['SAP', 'MANUAL'],
            required: true,
            maxSelect: 1,
          },
          {
            name: 'sap_function_type',
            type: 'select',
            values: ['STANDARD', 'Z_CUSTOM'],
            maxSelect: 1,
          },
          { name: 'sap_function_name', type: 'text' },
          { name: 'last_sync', type: 'date' },
          { name: 'sync_status', type: 'text' },
          { name: 'consumer_line_code', type: 'text' },
          { name: 'producer_line_code', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_inv_mat_dep ON inventory_items (material_code, storage_location)',
          'CREATE INDEX idx_inv_category ON inventory_items (category)',
          'CREATE INDEX idx_inv_plant ON inventory_items (plant_code)',
        ],
      })
      app.save(invCol)
    }

    // 2. inventory_snapshots (Snapshots históricos de sincronização)
    let invSnapCol
    try {
      invSnapCol = app.findCollectionByNameOrId('inventory_snapshots')
    } catch (_) {
      invSnapCol = new Collection({
        name: 'inventory_snapshots',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'snapshot_timestamp', type: 'date', required: true },
          { name: 'plant_code', type: 'text', required: true },
          { name: 'storage_location', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'category', type: 'text', required: true },
          { name: 'batch_number', type: 'text' },
          { name: 'qty_total', type: 'number', required: true },
          { name: 'unit', type: 'text', required: true },
          { name: 'source_type', type: 'text', required: true }, // 'SAP_RFC', 'BAPI_MATERIAL_STOCK', 'Z_PCP_STOCK_GET'
          { name: 'source_function', type: 'text' },
          { name: 'records_count', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_inv_snap_time ON inventory_snapshots (snapshot_timestamp DESC)',
          'CREATE INDEX idx_inv_snap_mat ON inventory_snapshots (material_code)',
        ],
      })
      app.save(invSnapCol)
    }

    // 3. line_projection_configs (Configuração genérica de projeção de estoque por linha)
    let projConfigCol
    try {
      projConfigCol = app.findCollectionByNameOrId('line_projection_configs')
    } catch (_) {
      projConfigCol = new Collection({
        name: 'line_projection_configs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'line_id', type: 'relation', collectionId: linesCol.id, maxSelect: 1 },
          { name: 'line_code', type: 'text', required: true },
          { name: 'horizon_days', type: 'number', required: true },
          { name: 'initial_stock_tons', type: 'number', required: true },
          { name: 'unit', type: 'text', required: true }, // 't'
          { name: 'min_stock_limit', type: 'number', required: true },
          { name: 'target_stock_limit', type: 'number', required: true },
          { name: 'max_stock_limit', type: 'number', required: true },
          { name: 'friday_target_stock_limit', type: 'number' }, // Regra de calendário específica
          { name: 'cooling_time_hours', type: 'number' }, // Tempo de espera / resfriamento antes de disponível
          { name: 'cooling_rules_payload', type: 'json' }, // Regras parametrizáveis por produto / família
          { name: 'calendar_rules_payload', type: 'json' }, // CalendarSpecificStockRules
          { name: 'input_flow_definitions', type: 'json' }, // ProjectionFlowDefinition[] de Entrada
          { name: 'output_flow_definitions', type: 'json' }, // ProjectionFlowDefinition[] de Saída
          { name: 'hourly_productivity_rate', type: 'number' }, // t/h para cálculo de produção
          { name: 'operating_hours_per_day', type: 'number' }, // Horas diárias programáveis
          { name: 'active', type: 'bool' },
          { name: 'version', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_proj_config_line ON line_projection_configs (line_code)'],
      })
      app.save(projConfigCol)
    }

    // 4. Cadastrar Novas Permissões Granulares do Prompt 06
    const prompt06Permissions = [
      {
        key: 'pcp.inventory.view',
        name: 'Visualizar Gestão de Estoques',
        category: 'Gestão de Estoques',
        is_critical: false,
        description:
          'Permite visualizar estoques consolidados por depósito SAP, centro e categoria (MP, Semiacabado, Acabado)',
      },
      {
        key: 'pcp.inventory.sync',
        name: 'Sincronizar Estoques SAP',
        category: 'Gestão de Estoques',
        is_critical: true,
        description: 'Permite disparar leitura RFC/BAPI no SAP e atualizar snapshots de estoque',
      },
      {
        key: 'pcp.projection.view',
        name: 'Visualizar Projeção de Estoques',
        category: 'Projeção de Estoques',
        is_critical: false,
        description:
          'Permite consultar projeção de entrada, saída e saldo de estoque por linha produtiva',
      },
      {
        key: 'pcp.projection.configure',
        name: 'Configurar Motor de Projeção',
        category: 'Projeção de Estoques',
        is_critical: true,
        description:
          'Permite parametrizar fluxos de entrada/saída, estoques de segurança, resfriamento e metas por linha',
      },
      {
        key: 'pcp.projection.simulate',
        name: 'Simular Cenários de Estoque',
        category: 'Projeção de Estoques',
        is_critical: false,
        description:
          'Permite simular impactos na curva de estoque a partir de alterações no CP-SAT',
      },
      {
        key: 'pcp.schedule.table.view',
        name: 'Visualizar Tabela de Programação Operacional',
        category: 'Programação Tabular',
        is_critical: false,
        description:
          'Permite visualizar a programação de produção em formato tabular detalhado por produto e turno',
      },
      {
        key: 'pcp.schedule.table.configure',
        name: 'Configurar Colunas da Tabela',
        category: 'Programação Tabular',
        is_critical: false,
        description:
          'Permite customizar colunas ativas, ordem e preferências da visualização operacional',
      },
      {
        key: 'pcp.schedule.override',
        name: 'Realizar Manual Override de Sequência',
        category: 'Programação Tabular',
        is_critical: true,
        description:
          'Permite alterar manualmente a sequência de produção gerada pelo motor com justificativa e validação de restrições',
      },
    ]

    const permMap = {}
    for (const p of prompt06Permissions) {
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

    // 5. Atribuir aos Perfis RBAC
    const roleMappings = {
      PCP_ADMIN: [
        'pcp.inventory.view',
        'pcp.inventory.sync',
        'pcp.projection.view',
        'pcp.projection.configure',
        'pcp.projection.simulate',
        'pcp.schedule.table.view',
        'pcp.schedule.table.configure',
        'pcp.schedule.override',
      ],
      PCP_PROGRAMMER: [
        'pcp.inventory.view',
        'pcp.inventory.sync',
        'pcp.projection.view',
        'pcp.projection.configure',
        'pcp.projection.simulate',
        'pcp.schedule.table.view',
        'pcp.schedule.table.configure',
        'pcp.schedule.override',
      ],
      LINE_MANAGER: [
        'pcp.inventory.view',
        'pcp.projection.view',
        'pcp.schedule.table.view',
        'pcp.schedule.table.configure',
      ],
      PRODUCTION_VIEWER: ['pcp.inventory.view', 'pcp.projection.view', 'pcp.schedule.table.view'],
      EXECUTIVE_VIEWER: ['pcp.inventory.view', 'pcp.projection.view', 'pcp.schedule.table.view'],
      AUDITOR: ['pcp.inventory.view', 'pcp.projection.view', 'pcp.schedule.table.view'],
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
      app.delete(app.findCollectionByNameOrId('line_projection_configs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('inventory_snapshots'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('inventory_items'))
    } catch (_) {}
  },
)

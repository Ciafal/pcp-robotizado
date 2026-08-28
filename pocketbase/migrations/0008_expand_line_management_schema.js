migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const linesCol = app.findCollectionByNameOrId('production_lines')
    const lineMastersCol = app.findCollectionByNameOrId('line_masters')
    const productFamiliesCol = app.findCollectionByNameOrId('product_families')
    const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolePermissionsCol = app.findCollectionByNameOrId('pcp_role_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')

    // 1. Catálogo Central de Integrações SAP (SapIntegrationDefinition)
    const sapIntegrationCatalog = new Collection({
      name: 'sap_integration_catalog',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'description', type: 'text', required: true },
        {
          name: 'integration_type',
          type: 'select',
          required: true,
          values: ['RFC_BAPI', 'IDOC', 'ODATA', 'PI_PO', 'SAP_DIRECT_TABLE', 'OTHER'],
          maxSelect: 1,
        },
        { name: 'function_name', type: 'text', required: true },
        {
          name: 'standard_or_z',
          type: 'select',
          required: true,
          values: ['STANDARD', 'Z_CUSTOM'],
          maxSelect: 1,
        },
        { name: 'source_object', type: 'text' },
        { name: 'input_mapping', type: 'json' },
        { name: 'output_mapping', type: 'json' },
        { name: 'active', type: 'bool' },
        { name: 'last_test', type: 'date' },
        {
          name: 'last_status',
          type: 'select',
          values: ['CONECTADO', 'ERRO', 'NAO_TESTADO', 'INDISPONIVEL'],
          maxSelect: 1,
        },
        { name: 'last_sync_records_count', type: 'number', min: 0 },
        { name: 'last_error_message', type: 'text' },
        { name: 'technical_responsible', type: 'text' },
        { name: 'homologation_date', type: 'date' },
        { name: 'environment', type: 'text' },
        { name: 'system_version', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_sap_cat_code ON sap_integration_catalog (code)'],
    })
    app.save(sapIntegrationCatalog)

    // 2. Hierarquia Organizacional Associada à Linha (production_line_org_hierarchy)
    const lineOrgHierarchy = new Collection({
      name: 'line_org_hierarchy',
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
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'org_level_name', type: 'text', required: true }, // ex: Diretoria Industrial, Gerência Industrial, etc.
        { name: 'org_level_order', type: 'number', required: true, min: 1 },
        { name: 'area_name', type: 'text', required: true },
        { name: 'job_title', type: 'text', required: true },
        { name: 'user_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'substitute_user_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'integration_status', type: 'text' }, // AGUARDANDO_INTEGRACAO_HUB ou CONECTADO_HUB
        { name: 'active', type: 'bool' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_loh_line ON line_org_hierarchy (line_id, org_level_order)'],
    })
    app.save(lineOrgHierarchy)

    // 3. Gestores da Linha (line_managers_assignment)
    const lineManagersAssignment = new Collection({
      name: 'line_managers_assignment',
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
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          maxSelect: 1,
        },
        {
          name: 'responsibility_type',
          type: 'select',
          required: true,
          values: ['PRIMARY_MANAGER', 'SUBSTITUTE_MANAGER', 'ADDITIONAL_MANAGER'],
          maxSelect: 1,
        },
        { name: 'role_title', type: 'text', required: true },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'scope_description', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_lma_line_user ON line_managers_assignment (line_id, user_id)'],
    })
    app.save(lineManagersAssignment)

    // 4. Matriz de Aprovadores (line_approvers_matrix)
    const lineApproversMatrix = new Collection({
      name: 'line_approvers_matrix',
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
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'approval_type',
          type: 'select',
          required: true,
          values: [
            'PCP_APPROVAL',
            'LINE_MANAGER_APPROVAL',
            'QUALITY_APPROVAL',
            'EXECUTIVE_APPROVAL',
          ],
          maxSelect: 1,
        },
        {
          name: 'approval_stage',
          type: 'select',
          required: true,
          values: ['STAGE_1_PCP', 'STAGE_2_LINE_MANAGER', 'STAGE_3_QUALITY', 'STAGE_4_DIRECTOR'],
          maxSelect: 1,
        },
        { name: 'sequence_order', type: 'number', required: true, min: 1 },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          maxSelect: 1,
        },
        { name: 'role_title', type: 'text', required: true },
        {
          name: 'requirement_type',
          type: 'select',
          required: true,
          values: ['MANDATORY', 'OPTIONAL', 'BY_RULE', 'NOT_APPLICABLE'],
          maxSelect: 1,
        },
        { name: 'substitute_user_id', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lam_line_seq ON line_approvers_matrix (line_id, approval_stage, sequence_order)',
      ],
    })
    app.save(lineApproversMatrix)

    // 5. Sequenciamento e Dependências de Fluxo Produtivo (line_sequencing_dependencies)
    const lineSequencingDependencies = new Collection({
      name: 'line_sequencing_dependencies',
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
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'previous_process_name', type: 'text' },
        {
          name: 'previous_line_id',
          type: 'relation',
          collectionId: linesCol.id,
          maxSelect: 1,
        },
        { name: 'next_process_name', type: 'text' },
        {
          name: 'next_line_id',
          type: 'relation',
          collectionId: linesCol.id,
          maxSelect: 1,
        },
        { name: 'sequence_order', type: 'number', required: true, min: 1 },
        {
          name: 'relation_nature',
          type: 'select',
          required: true,
          values: ['MANDATORY', 'OPTIONAL', 'BYPASS_ALLOWED', 'PARALLEL'],
          maxSelect: 1,
        },
        {
          name: 'dependency_type',
          type: 'select',
          required: true,
          values: [
            'FINISH_TO_START',
            'START_TO_START',
            'FINISH_TO_FINISH',
            'TRANSFER_BATCH',
            'BUFFER_REQUIRED',
          ],
          maxSelect: 1,
        },
        { name: 'standard_lead_time_minutes', type: 'number', min: 0 },
        { name: 'intermediate_buffer_type', type: 'text' },
        { name: 'intermediate_buffer_capacity', type: 'number', min: 0 },
        { name: 'intermediate_buffer_unit', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lsd_line ON line_sequencing_dependencies (line_id, sequence_order)',
      ],
    })
    app.save(lineSequencingDependencies)

    // 6. Produtividade por Linha / Produto / Dimensão (line_productivity_rates)
    const lineProductivityRates = new Collection({
      name: 'line_productivity_rates',
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
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMastersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'product_family_id',
          type: 'relation',
          collectionId: productFamiliesCol.id,
          maxSelect: 1,
        },
        { name: 'material_product_code', type: 'text' },
        { name: 'material_product_name', type: 'text' },
        { name: 'dimension_spec', type: 'text' },
        {
          name: 'productivity_unit',
          type: 'select',
          required: true,
          values: ['t/h', 'peça/h', 'm/h'],
          maxSelect: 1,
        },
        { name: 'nominal_productivity', type: 'number', required: true, min: 0 },
        { name: 'planned_productivity', type: 'number', required: true, min: 0 },
        { name: 'expected_efficiency_pct', type: 'number', min: 0, max: 100 },
        {
          name: 'source_mode',
          type: 'select',
          required: true,
          values: ['MANUAL', 'SAP'],
          maxSelect: 1,
        },
        {
          name: 'sap_integration_id',
          type: 'relation',
          collectionId: sapIntegrationCatalog.id,
          maxSelect: 1,
        },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'notes', type: 'text' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_lpr_line ON line_productivity_rates (line_id, active)'],
    })
    app.save(lineProductivityRates)

    // 7. Prioridades de Matéria-Prima (line_raw_material_priorities)
    const lineRawMaterialPriorities = new Collection({
      name: 'line_raw_material_priorities',
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
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMastersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'material_code', type: 'text', required: true },
        { name: 'material_description', type: 'text', required: true },
        { name: 'material_group', type: 'text' },
        {
          name: 'product_family_id',
          type: 'relation',
          collectionId: productFamiliesCol.id,
          maxSelect: 1,
        },
        { name: 'material_origin', type: 'text' }, // ex: CSN, Usiminas, Gerdau, Importado
        { name: 'priority_order', type: 'number', required: true, min: 1 }, // 1 = Máxima prioridade
        { name: 'condition_rule', type: 'text' },
        {
          name: 'source_mode',
          type: 'select',
          required: true,
          values: ['MANUAL', 'SAP'],
          maxSelect: 1,
        },
        {
          name: 'sap_integration_id',
          type: 'relation',
          collectionId: sapIntegrationCatalog.id,
          maxSelect: 1,
        },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lrmp_line_prio ON line_raw_material_priorities (line_id, priority_order)',
      ],
    })
    app.save(lineRawMaterialPriorities)

    // 8. Produtos Bloqueados (line_blocked_products)
    const lineBlockedProducts = new Collection({
      name: 'line_blocked_products',
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
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMastersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'product_code', type: 'text', required: true },
        { name: 'product_description', type: 'text', required: true },
        {
          name: 'product_family_id',
          type: 'relation',
          collectionId: productFamiliesCol.id,
          maxSelect: 1,
        },
        { name: 'block_reason', type: 'text', required: true },
        {
          name: 'block_type',
          type: 'select',
          required: true,
          values: ['TOTAL', 'TEMPORARY', 'QUALITY', 'TECHNICAL', 'CAPACITY', 'PROCESS', 'OTHER'],
          maxSelect: 1,
        },
        {
          name: 'responsible_user_id',
          type: 'relation',
          collectionId: usersCol.id,
          maxSelect: 1,
        },
        {
          name: 'source_mode',
          type: 'select',
          required: true,
          values: ['MANUAL', 'SAP'],
          maxSelect: 1,
        },
        {
          name: 'sap_integration_id',
          type: 'relation',
          collectionId: sapIntegrationCatalog.id,
          maxSelect: 1,
        },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_lbp_line ON line_blocked_products (line_id, active)'],
    })
    app.save(lineBlockedProducts)

    // 9. Matriz De -> Para de Setup (line_setup_matrix)
    const lineSetupMatrix = new Collection({
      name: 'line_setup_matrix',
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
          required: true,
          collectionId: linesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'line_master_id',
          type: 'relation',
          collectionId: lineMastersCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'setup_code', type: 'text', required: true },
        { name: 'setup_description', type: 'text', required: true },
        {
          name: 'setup_category',
          type: 'select',
          required: true,
          values: [
            'TOOL_CHANGE',
            'DIMENSION_CHANGE',
            'MATERIAL_CHANGE',
            'COLOR_CHANGE',
            'CLEANING_SETUP',
            'HEATING_CYCLE',
            'OTHER',
          ],
          maxSelect: 1,
        },
        {
          name: 'from_family_id',
          type: 'relation',
          collectionId: productFamiliesCol.id,
          maxSelect: 1,
        },
        {
          name: 'to_family_id',
          type: 'relation',
          collectionId: productFamiliesCol.id,
          maxSelect: 1,
        },
        { name: 'from_product_code', type: 'text' },
        { name: 'to_product_code', type: 'text' },
        { name: 'setup_duration_minutes', type: 'number', required: true, min: 0 },
        { name: 'capacity_loss_impact', type: 'text' },
        {
          name: 'source_mode',
          type: 'select',
          required: true,
          values: ['MANUAL', 'SAP'],
          maxSelect: 1,
        },
        {
          name: 'sap_integration_id',
          type: 'relation',
          collectionId: sapIntegrationCatalog.id,
          maxSelect: 1,
        },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_lsm_line ON line_setup_matrix (line_id, active)'],
    })
    app.save(lineSetupMatrix)

    // 10. Novas permissões no RBAC (pcp.masterdata.source.change, pcp.sap.integration.view, pcp.sap.integration.manage)
    const newPerms = [
      {
        key: 'pcp.masterdata.source.change',
        name: 'Alterar Origem da Fonte (SAP/Manual)',
        category: 'Governança & Fontes',
        is_critical: true,
        description: 'Permite alterar a fonte oficial dos dados de SAP para Manual ou vice-versa',
      },
      {
        key: 'pcp.sap.integration.view',
        name: 'Visualizar Catálogo de Integrações SAP',
        category: 'Integração SAP',
        is_critical: false,
        description: 'Visualização das definições de RFC/BAPI e status de conectividade SAP',
      },
      {
        key: 'pcp.sap.integration.manage',
        name: 'Gerenciar Catálogo e BAPIs SAP',
        category: 'Integração SAP',
        is_critical: true,
        description: 'Cadastro, teste de BAPIs e configuração do catálogo de integrações SAP',
      },
    ]

    for (const p of newPerms) {
      try {
        app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {
        const pRec = new Record(permissionsCol)
        pRec.set('name', p.name)
        pRec.set('key', p.key)
        pRec.set('category', p.category)
        pRec.set('is_critical', p.is_critical)
        pRec.set('description', p.description)
        app.save(pRec)

        // Associar automaticamente ao PCP_ADMIN
        try {
          const adminRole = app.findFirstRecordByData('pcp_roles', 'code', 'PCP_ADMIN')
          if (adminRole) {
            const rpRec = new Record(rolePermissionsCol)
            rpRec.set('role_id', adminRole.id)
            rpRec.set('permission_id', pRec.id)
            app.save(rpRec)
          }
        } catch (_) {}
      }
    }
  },
  (app) => {
    const collections = [
      'line_setup_matrix',
      'line_blocked_products',
      'line_raw_material_priorities',
      'line_productivity_rates',
      'line_sequencing_dependencies',
      'line_approvers_matrix',
      'line_managers_assignment',
      'line_org_hierarchy',
      'sap_integration_catalog',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)

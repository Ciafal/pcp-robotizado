migrate(
  (app) => {
    // 1. Coleção: sap_validation_rules_matrix (Matriz funcional de campos ZVALIDA)
    let matrixCol = null
    try {
      matrixCol = app.findCollectionByNameOrId('sap_validation_rules_matrix')
    } catch (_) {}

    if (!matrixCol) {
      matrixCol = new Collection({
        name: 'sap_validation_rules_matrix',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'group_name', type: 'text', required: true },
          { name: 'subgroup_name', type: 'text', required: false },
          { name: 'field_name', type: 'text', required: true },
          { name: 'sap_table_field', type: 'text', required: true },
          {
            name: 'comparison_source',
            type: 'select',
            required: true,
            values: ['MODELO', 'PARAMETRO_ESPERADO', 'AMBOS', 'REGRA_CUSTOM'],
            maxSelect: 1,
          },
          { name: 'expected_value_rule', type: 'text', required: false },
          { name: 'is_mandatory', type: 'bool', required: false },
          { name: 'applicability_condition', type: 'text', required: false },
          { name: 'order_index', type: 'number', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'metadata', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_svrm_group ON sap_validation_rules_matrix (group_name)',
          'CREATE INDEX idx_svrm_field ON sap_validation_rules_matrix (sap_table_field)',
          'CREATE INDEX idx_svrm_active ON sap_validation_rules_matrix (active)',
        ],
      })
      app.save(matrixCol)
    }

    // 2. Coleção: sap_validation_code_logic (Lógica de Código - 1º dígito/letra)
    let codeLogicCol = null
    try {
      codeLogicCol = app.findCollectionByNameOrId('sap_validation_code_logic')
    } catch (_) {}

    if (!codeLogicCol) {
      codeLogicCol = new Collection({
        name: 'sap_validation_code_logic',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'code_prefix', type: 'text', required: true },
          { name: 'product_type', type: 'text', required: false },
          { name: 'material_type', type: 'text', required: false },
          { name: 'material_group', type: 'text', required: false },
          { name: 'external_material_group', type: 'text', required: false },
          { name: 'valuation_class', type: 'text', required: false },
          { name: 'price_determination', type: 'text', required: false },
          { name: 'price_control', type: 'text', required: false },
          { name: 'acct_assignment_group', type: 'text', required: false },
          { name: 'item_category_group', type: 'text', required: false },
          { name: 'division', type: 'text', required: false },
          { name: 'availability_check', type: 'text', required: false },
          { name: 'cfop', type: 'text', required: false },
          { name: 'explosion_backflush', type: 'text', required: false },
          { name: 'batch_management', type: 'text', required: false },
          { name: 'storage_condition', type: 'text', required: false },
          { name: 'internal_production', type: 'text', required: false },
          { name: 'utilization', type: 'text', required: false },
          { name: 'origin', type: 'text', required: false },
          { name: 'sales_org', type: 'text', required: false },
          { name: 'additional_params', type: 'json', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_svcl_prefix ON sap_validation_code_logic (code_prefix)',
          'CREATE INDEX idx_svcl_active ON sap_validation_code_logic (active)',
        ],
      })
      app.save(codeLogicCol)
    }

    // 3. Coleção: sap_validation_price_control (Matriz de Controle de Preço)
    let priceCtrlCol = null
    try {
      priceCtrlCol = app.findCollectionByNameOrId('sap_validation_price_control')
    } catch (_) {}

    if (!priceCtrlCol) {
      priceCtrlCol = new Collection({
        name: 'sap_validation_price_control',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'valuation_class', type: 'text', required: true },
          { name: 'material_type', type: 'text', required: true },
          { name: 'price_determination', type: 'text', required: true },
          { name: 'price_control', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_svpc_lookup ON sap_validation_price_control (valuation_class, material_type)',
        ],
      })
      app.save(priceCtrlCol)
    }

    // 4. Coleção: sap_validation_procurement_type (Tipo de suprimento: E/F/X)
    let procCol = null
    try {
      procCol = app.findCollectionByNameOrId('sap_validation_procurement_type')
    } catch (_) {}

    if (!procCol) {
      procCol = new Collection({
        name: 'sap_validation_procurement_type',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'procurement_type', type: 'text', required: true },
          { name: 'special_procurement', type: 'text', required: false },
          { name: 'description', type: 'text', required: true },
          { name: 'applies_to_material_types', type: 'json', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_svpt_type ON sap_validation_procurement_type (procurement_type)',
        ],
      })
      app.save(procCol)
    }

    // 5. Coleção: sap_validation_complementary_rules (ZBITOLAS, ZPPT_08, ZPPMP, CU41, ZCOIND, VD53)
    let compCol = null
    try {
      compCol = app.findCollectionByNameOrId('sap_validation_complementary_rules')
    } catch (_) {}

    if (!compCol) {
      compCol = new Collection({
        name: 'sap_validation_complementary_rules',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          {
            name: 'rule_key',
            type: 'select',
            required: true,
            values: ['ZBITOLAS', 'ZPPT_08', 'ZPPMP', 'CU41', 'ZCOIND', 'VD53', 'OUTRAS'],
            maxSelect: 1,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'applicable_material_types', type: 'json', required: false },
          { name: 'applicable_centers', type: 'json', required: false },
          { name: 'condition_logic', type: 'text', required: false },
          { name: 'parameters', type: 'json', required: false },
          { name: 'active', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_svcr_key ON sap_validation_complementary_rules (rule_key)'],
      })
      app.save(compCol)
    }

    // 6. Coleção: sap_material_validations (Cabeçalho da Validação)
    let valCol = null
    try {
      valCol = app.findCollectionByNameOrId('sap_material_validations')
    } catch (_) {}

    if (!valCol) {
      valCol = new Collection({
        name: 'sap_material_validations',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'validation_code', type: 'text', required: true },
          { name: 'revision_number', type: 'number', required: true },
          { name: 'material_new_code', type: 'text', required: true },
          { name: 'material_model_code', type: 'text', required: true },
          { name: 'center', type: 'text', required: false },
          { name: 'material_type', type: 'text', required: false },
          { name: 'material_new_desc', type: 'text', required: false },
          { name: 'material_model_desc', type: 'text', required: false },
          { name: 'price_control', type: 'text', required: false },
          { name: 'created_at_sap', type: 'text', required: false },
          { name: 'created_by_sap', type: 'text', required: false },
          { name: 'modified_at_sap', type: 'text', required: false },
          { name: 'modified_by_sap', type: 'text', required: false },
          {
            name: 'model_status',
            type: 'select',
            required: true,
            values: ['VERDE', 'AMARELO', 'VERMELHO'],
            maxSelect: 1,
          },
          { name: 'model_warnings', type: 'json', required: false },
          { name: 'model_justification', type: 'text', required: false },
          {
            name: 'overall_status',
            type: 'select',
            required: true,
            values: [
              'AGUARDANDO_VALIDACAO',
              'EM_VALIDACAO',
              'DIVERGENTE',
              'AGUARDANDO_CORRECAO_SAP',
              'APTO_PARA_APROVACAO',
              'VALIDADO',
            ],
            maxSelect: 1,
          },
          { name: 'total_fields_analyzed', type: 'number', required: false },
          { name: 'approved_fields_count', type: 'number', required: false },
          { name: 'divergent_fields_count', type: 'number', required: false },
          { name: 'not_applicable_fields_count', type: 'number', required: false },
          { name: 'compliance_percentage', type: 'number', required: false },
          { name: 'model_movement_data', type: 'json', required: false },
          { name: 'sap_raw_new', type: 'json', required: false },
          { name: 'sap_raw_model', type: 'json', required: false },
          { name: 'sap_last_queried_at', type: 'text', required: false },
          { name: 'sap_last_queried_by', type: 'text', required: false },
          { name: 'started_at', type: 'text', required: false },
          { name: 'completed_at', type: 'text', required: false },
          { name: 'responsible_user_id', type: 'text', required: false },
          { name: 'responsible_user_name', type: 'text', required: false },
          { name: 'responsible_user_email', type: 'text', required: false },
          { name: 'is_latest_revision', type: 'bool', required: false },
          { name: 'previous_validation_id', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_smv_code_rev ON sap_material_validations (validation_code, revision_number)',
          'CREATE INDEX idx_smv_new_code ON sap_material_validations (material_new_code)',
          'CREATE INDEX idx_smv_model_code ON sap_material_validations (material_model_code)',
          'CREATE INDEX idx_smv_status ON sap_material_validations (overall_status)',
          'CREATE INDEX idx_smv_center ON sap_material_validations (center)',
        ],
      })
      app.save(valCol)
    }

    // 7. Coleção: sap_validation_field_results (Resultados por Campo da Validação)
    let fieldResCol = null
    try {
      fieldResCol = app.findCollectionByNameOrId('sap_validation_field_results')
    } catch (_) {}

    if (!fieldResCol) {
      fieldResCol = new Collection({
        name: 'sap_validation_field_results',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: "@request.auth.id != '' || @request.auth.id = ''",
        deleteRule: "@request.auth.id != '' || @request.auth.id = ''",
        fields: [
          { name: 'validation_id', type: 'text', required: true },
          { name: 'validation_code', type: 'text', required: true },
          { name: 'revision_number', type: 'number', required: true },
          { name: 'group_name', type: 'text', required: true },
          { name: 'subgroup_name', type: 'text', required: false },
          { name: 'field_name', type: 'text', required: true },
          { name: 'sap_table_field', type: 'text', required: true },
          { name: 'model_value', type: 'text', required: false },
          { name: 'new_value', type: 'text', required: false },
          { name: 'expected_parameter_value', type: 'text', required: false },
          {
            name: 'validation_result',
            type: 'select',
            required: true,
            values: ['APROVADO', 'DIVERGENTE', 'NAO_SE_APLICA'],
            maxSelect: 1,
          },
          { name: 'rule_applied', type: 'text', required: false },
          { name: 'divergence_detail', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_svfr_val_id ON sap_validation_field_results (validation_id)',
          'CREATE INDEX idx_svfr_result ON sap_validation_field_results (validation_result)',
          'CREATE INDEX idx_svfr_group ON sap_validation_field_results (group_name)',
        ],
      })
      app.save(fieldResCol)
    }

    // 8. Coleção: sap_validation_audit_logs (Trilha de auditoria imutável)
    let valAuditCol = null
    try {
      valAuditCol = app.findCollectionByNameOrId('sap_validation_audit_logs')
    } catch (_) {}

    if (!valAuditCol) {
      valAuditCol = new Collection({
        name: 'sap_validation_audit_logs',
        type: 'base',
        listRule: "@request.auth.id != '' || @request.auth.id = ''",
        viewRule: "@request.auth.id != '' || @request.auth.id = ''",
        createRule: "@request.auth.id != '' || @request.auth.id = ''",
        updateRule: null, // Imutável - não permite alteração
        deleteRule: null, // Imutável - não permite exclusão
        fields: [
          { name: 'validation_id', type: 'text', required: false },
          { name: 'validation_code', type: 'text', required: false },
          { name: 'revision_number', type: 'number', required: false },
          { name: 'user_id', type: 'text', required: false },
          { name: 'user_name', type: 'text', required: false },
          { name: 'user_email', type: 'text', required: false },
          { name: 'user_role', type: 'text', required: false },
          {
            name: 'action',
            type: 'select',
            required: true,
            values: [
              'INICIO_VALIDACAO',
              'SELECAO_CODIGO_MODELO',
              'CONSULTA_SAP',
              'ADVERTENCIA_MODELO',
              'JUSTIFICATIVA_MODELO',
              'COMPARACAO_EXECUTADA',
              'DETECCAO_DIVERGENCIA',
              'RECONSULTA_SAP',
              'APROVACAO',
              'CONCLUSAO',
              'CRIACAO_REVISAO',
            ],
            maxSelect: 1,
          },
          { name: 'material_code', type: 'text', required: false },
          { name: 'previous_value', type: 'text', required: false },
          { name: 'new_value', type: 'text', required: false },
          { name: 'sap_source', type: 'text', required: false },
          { name: 'rule_result', type: 'text', required: false },
          { name: 'justification', type: 'text', required: false },
          { name: 'previous_status', type: 'text', required: false },
          { name: 'new_status', type: 'text', required: false },
          { name: 'details', type: 'json', required: false },
          { name: 'correlation_id', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sval_val_code ON sap_validation_audit_logs (validation_code)',
          'CREATE INDEX idx_sval_mat_code ON sap_validation_audit_logs (material_code)',
          'CREATE INDEX idx_sval_action ON sap_validation_audit_logs (action)',
          'CREATE INDEX idx_sval_created ON sap_validation_audit_logs (created DESC)',
        ],
      })
      app.save(valAuditCol)
    }

    // 9. Registrar permissões RBAC para Validação SAP
    try {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      const permissionsToSeed = [
        {
          key: 'pcp.sap_validation.view',
          name: 'Visualizar Validação de Cadastro SAP',
          category: 'Cadastros',
          description: 'Acesso às abas e relatórios de validação de cadastro SAP',
          is_critical: false,
        },
        {
          key: 'pcp.sap_validation.execute',
          name: 'Executar Validação de Cadastro SAP',
          category: 'Cadastros',
          description: 'Permissão para iniciar validação, reconsultar SAP e submeter revisões',
          is_critical: false,
        },
        {
          key: 'pcp.sap_validation.approve',
          name: 'Aprovar Cadastro SAP',
          category: 'Cadastros',
          description: 'Permissão para aprovar e concluir validação de cadastro SAP',
          is_critical: true,
        },
        {
          key: 'pcp.sap_validation.admin_matrix',
          name: 'Administrar Matriz ZVALIDA',
          category: 'Cadastros',
          description: 'Carga e parametrização das tabelas da matriz ZVALIDA',
          is_critical: true,
        },
      ]

      for (let i = 0; i < permissionsToSeed.length; i++) {
        const p = permissionsToSeed[i]
        try {
          app.findFirstRecordByData('pcp_permissions', 'key', p.key)
        } catch (_) {
          const rec = new Record(permsCol)
          rec.set('key', p.key)
          rec.set('name', p.name)
          rec.set('category', p.category)
          rec.set('description', p.description)
          rec.set('is_critical', p.is_critical)
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    // Reverter coleções na ordem inversa
    const toDelete = [
      'sap_validation_audit_logs',
      'sap_validation_field_results',
      'sap_material_validations',
      'sap_validation_complementary_rules',
      'sap_validation_procurement_type',
      'sap_validation_price_control',
      'sap_validation_code_logic',
      'sap_validation_rules_matrix',
    ]
    for (let i = 0; i < toDelete.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(toDelete[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)

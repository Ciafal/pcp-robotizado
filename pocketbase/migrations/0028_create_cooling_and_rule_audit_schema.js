migrate(
  (app) => {
    // 1. Coleção para Tempos de Resfriamento (cooling_times)
    let coolingCol
    try {
      coolingCol = app.findCollectionByNameOrId('cooling_times')
    } catch (_) {
      const plantCol = app.findCollectionByNameOrId('plants')
      const lineCol = app.findCollectionByNameOrId('production_lines')
      const famCol = app.findCollectionByNameOrId('product_families')
      const userCol = app.findCollectionByNameOrId('_pb_users_auth_')

      coolingCol = new Collection({
        name: 'cooling_times',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'center_code', type: 'text', required: true },
          { name: 'plant_id', type: 'relation', collectionId: plantCol.id, maxSelect: 1 },
          { name: 'line_id', type: 'relation', collectionId: lineCol.id, maxSelect: 1 },
          { name: 'line_code', type: 'text', required: true },
          { name: 'work_center', type: 'text' },
          { name: 'material_code', type: 'text' },
          { name: 'material_description', type: 'text' },
          { name: 'family_id', type: 'relation', collectionId: famCol.id, maxSelect: 1 },
          { name: 'family_code', type: 'text' },
          { name: 'gauge_dimension', type: 'text' },
          { name: 'cooling_time_hours', type: 'number', required: true },
          { name: 'rule_condition', type: 'text' },
          { name: 'valid_from', type: 'date' },
          { name: 'valid_until', type: 'date' },
          {
            name: 'origin',
            type: 'select',
            values: ['SAP', 'MES', 'MANUAL', 'ENGENHARIA'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['ATIVO', 'INATIVO', 'EM_REVISAO', 'PENDENTE'],
            maxSelect: 1,
          },
          { name: 'responsible_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'responsible_name', type: 'text' },
          { name: 'revision_number', type: 'number' },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cooling_line ON cooling_times (line_code, status)',
          'CREATE INDEX idx_cooling_mat ON cooling_times (material_code)',
        ],
      })
      app.save(coolingCol)
    }

    // 2. Coleção para Histórico de Alterações de Regras & Parâmetros (rule_audit_logs)
    let ruleAuditCol
    try {
      ruleAuditCol = app.findCollectionByNameOrId('rule_audit_logs')
    } catch (_) {
      const userCol = app.findCollectionByNameOrId('_pb_users_auth_')

      ruleAuditCol = new Collection({
        name: 'rule_audit_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'PCP_ADMIN'",
        fields: [
          { name: 'parameter_name', type: 'text', required: true },
          { name: 'entity_type', type: 'text', required: true }, // SETUP, STOP, COOLING, SEQUENCING, RULE_PACK
          { name: 'entity_id', type: 'text' },
          { name: 'previous_value', type: 'text' },
          { name: 'new_value', type: 'text' },
          { name: 'user_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'user_name', type: 'text', required: true },
          { name: 'user_email', type: 'text' },
          { name: 'change_date', type: 'text', required: true },
          { name: 'reason', type: 'text', required: true },
          {
            name: 'origin',
            type: 'select',
            values: ['SAP', 'MES', 'MANUAL', 'IA_OPTIMIZER', 'ENGENHARIA'],
            maxSelect: 1,
          },
          {
            name: 'mes_validation_status',
            type: 'select',
            values: ['VALIDADO', 'PENDENTE', 'NAO_APLICAVEL', 'DIVERGENCIA'],
            maxSelect: 1,
          },
          { name: 'ai_recommendation', type: 'text' },
          { name: 'approver_id', type: 'relation', collectionId: userCol.id, maxSelect: 1 },
          { name: 'approver_name', type: 'text' },
          { name: 'published_at', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_rule_audit_entity ON rule_audit_logs (entity_type, created DESC)',
          'CREATE INDEX idx_rule_audit_param ON rule_audit_logs (parameter_name)',
        ],
      })
      app.save(ruleAuditCol)
    }

    // 3. Garantir Permissões RBAC de Regras
    const permsCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')
    const rolePermCol = app.findCollectionByNameOrId('pcp_role_permissions')

    const rulesPerms = [
      {
        key: 'pcp.rules.view',
        name: 'Visualizar Regras & Setup',
        category: 'Regras',
        description: 'Consulta a matrizes de setup, paradas, resfriamento e sequenciamento',
      },
      {
        key: 'pcp.rules.edit',
        name: 'Editar Regras & Setup',
        category: 'Regras',
        description: 'Edição de tempos de setup, paradas e parâmetros de sequenciamento',
      },
      {
        key: 'pcp.rules.manage',
        name: 'Gerenciar Motor de Regras',
        category: 'Regras',
        description: 'Acesso completo e administração do Motor de Regras e Parâmetros',
      },
      {
        key: 'pcp.rules.approve',
        name: 'Aprovar Revisões de Regras',
        category: 'Regras',
        description: 'Aprovação e homologação em 2 fases de parâmetros industriais',
      },
    ]

    rulesPerms.forEach((p) => {
      let existing
      try {
        existing = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {
        existing = null
      }

      let permRec = existing
      if (!permRec) {
        permRec = new Record(permsCol)
        permRec.set('key', p.key)
        permRec.set('name', p.name)
        permRec.set('category', p.category)
        permRec.set('description', p.description)
        permRec.set('is_critical', p.key !== 'pcp.rules.view')
        app.save(permRec)
      }

      // Associar às roles
      // PCP_ADMIN: todas
      // PCP_PROGRAMMER: view, edit, manage
      // LINE_MANAGER: view, approve
      // PRODUCTION_VIEWER / EXECUTIVE_VIEWER / AUDITOR: view
      const allRoles = app.findRecordsByFilter('pcp_roles', '', '', 20, 0)
      allRoles.forEach((role) => {
        const roleCode = role.getString('code')
        let shouldHave = false
        if (roleCode === 'PCP_ADMIN') shouldHave = true
        else if (
          roleCode === 'PCP_PROGRAMMER' &&
          (p.key === 'pcp.rules.view' || p.key === 'pcp.rules.edit' || p.key === 'pcp.rules.manage')
        )
          shouldHave = true
        else if (
          roleCode === 'LINE_MANAGER' &&
          (p.key === 'pcp.rules.view' || p.key === 'pcp.rules.approve')
        )
          shouldHave = true
        else if (
          (roleCode === 'PRODUCTION_VIEWER' ||
            roleCode === 'EXECUTIVE_VIEWER' ||
            roleCode === 'AUDITOR') &&
          p.key === 'pcp.rules.view'
        )
          shouldHave = true

        if (shouldHave) {
          const rpFilter = `role_id = '${role.id}' && permission_id = '${permRec.id}'`
          const existingRps = app.findRecordsByFilter('pcp_role_permissions', rpFilter, '', 1, 0)
          if (existingRps.length === 0) {
            const rp = new Record(rolePermCol)
            rp.set('role_id', role.id)
            rp.set('permission_id', permRec.id)
            app.save(rp)
          }
        }
      })
    })
  },
  (app) => {
    try {
      const cooling = app.findCollectionByNameOrId('cooling_times')
      app.delete(cooling)
    } catch (_) {}
    try {
      const audit = app.findCollectionByNameOrId('rule_audit_logs')
      app.delete(audit)
    } catch (_) {}
  },
)

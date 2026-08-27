migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. pcp_roles (Perfis do PCP)
    const rolesCollection = new Collection({
      name: 'pcp_roles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'hierarchy_level', type: 'number', min: 1, max: 10 },
        { name: 'is_system', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_pcp_roles_code ON pcp_roles (code)'],
    })
    app.save(rolesCollection)

    // 2. pcp_permissions (Catálogo de Permissões Granulares)
    const permissionsCollection = new Collection({
      name: 'pcp_permissions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'key', type: 'text', required: true },
        { name: 'category', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'is_critical', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_permissions_key ON pcp_permissions (key)',
        'CREATE INDEX idx_pcp_permissions_category ON pcp_permissions (category)',
      ],
    })
    app.save(permissionsCollection)

    // 3. pcp_role_permissions (Matriz de Permissões por Perfil)
    const rolePermissionsCollection = new Collection({
      name: 'pcp_role_permissions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'role_id',
          type: 'relation',
          required: true,
          collectionId: rolesCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'permission_id',
          type: 'relation',
          required: true,
          collectionId: permissionsCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_role_perm ON pcp_role_permissions (role_id, permission_id)',
      ],
    })
    app.save(rolePermissionsCollection)

    // 4. pcp_access_scopes (Escopo de Acesso por Usuário / Linha / Processo / Unidade)
    const accessScopesCollection = new Collection({
      name: 'pcp_access_scopes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'scope_type',
          type: 'select',
          required: true,
          values: ['GLOBAL', 'UNIT', 'CENTER', 'PRODUCTION_LINE', 'PROCESS'],
          maxSelect: 1,
        },
        { name: 'target_id', type: 'text' },
        { name: 'target_code', type: 'text' },
        { name: 'target_name', type: 'text' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_until', type: 'date' },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pcp_scopes_user ON pcp_access_scopes (user_id)',
        'CREATE INDEX idx_pcp_scopes_type ON pcp_access_scopes (scope_type, target_id)',
      ],
    })
    app.save(accessScopesCollection)

    // 5. pcp_user_permission_exceptions (Exceções de Permissão por Usuário)
    const permissionExceptionsCollection = new Collection({
      name: 'pcp_permission_exceptions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'permission_id',
          type: 'relation',
          required: true,
          collectionId: permissionsCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['GRANT', 'DENY'],
          maxSelect: 1,
        },
        { name: 'reason', type: 'text' },
        { name: 'valid_until', type: 'date' },
        {
          name: 'granted_by',
          type: 'relation',
          collectionId: usersCollection.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pcp_perm_exc ON pcp_permission_exceptions (user_id, permission_id)',
      ],
    })
    app.save(permissionExceptionsCollection)

    // 6. pcp_delegations (Delegações Temporárias de Acesso)
    const delegationsCollection = new Collection({
      name: 'pcp_delegations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'delegator_id',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          maxSelect: 1,
        },
        {
          name: 'delegate_id',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          maxSelect: 1,
        },
        {
          name: 'scope_type',
          type: 'select',
          required: true,
          values: ['GLOBAL', 'PRODUCTION_LINE', 'PROCESS'],
          maxSelect: 1,
        },
        { name: 'target_id', type: 'text' },
        { name: 'reason', type: 'text', required: true },
        { name: 'start_date', type: 'date', required: true },
        { name: 'end_date', type: 'date', required: true },
        { name: 'active', type: 'bool' },
        {
          name: 'created_by',
          type: 'relation',
          collectionId: usersCollection.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pcp_deleg_dates ON pcp_delegations (delegate_id, active)'],
    })
    app.save(delegationsCollection)

    // 7. pcp_line_responsibles (Vínculo de Gestores Responsáveis e Substitutos por Linha)
    const linesCollection = app.findCollectionByNameOrId('production_lines')
    const lineResponsiblesCollection = new Collection({
      name: 'pcp_line_responsibles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'PCP_ADMIN'",
      updateRule: "@request.auth.role = 'PCP_ADMIN'",
      deleteRule: "@request.auth.role = 'PCP_ADMIN'",
      fields: [
        {
          name: 'line_id',
          type: 'relation',
          required: true,
          collectionId: linesCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: usersCollection.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'role_type',
          type: 'select',
          required: true,
          values: ['PRIMARY', 'SUBSTITUTE', 'ADDITIONAL'],
          maxSelect: 1,
        },
        { name: 'active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pcp_line_resp ON pcp_line_responsibles (line_id, user_id)'],
    })
    app.save(lineResponsiblesCollection)

    // 8. pcp_audit_logs (Trilha de Auditoria de Segurança e Acessos)
    const auditLogsCollection = new Collection({
      name: 'pcp_audit_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null, // Immutable!
      deleteRule: null, // Immutable!
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: usersCollection.id,
          maxSelect: 1,
        },
        { name: 'user_email', type: 'text' },
        { name: 'user_name', type: 'text' },
        { name: 'user_role', type: 'text' },
        {
          name: 'event_type',
          type: 'select',
          required: true,
          values: [
            'ACCESS_GRANTED',
            'ACCESS_DENIED',
            'PERMISSION_CHANGED',
            'ROLE_ASSIGNED',
            'ROLE_REMOVED',
            'SCOPE_ASSIGNED',
            'SCOPE_REMOVED',
            'UNAUTHORIZED_ACTION_ATTEMPT',
            'SCHEDULE_ACTION',
            'RULE_ACTION',
            'DELEGATION_CREATED',
          ],
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true },
        { name: 'resource', type: 'text', required: true },
        { name: 'resource_id', type: 'text' },
        { name: 'permission_required', type: 'text' },
        { name: 'scope', type: 'text' },
        {
          name: 'outcome',
          type: 'select',
          required: true,
          values: ['ALLOW', 'DENY', 'SUCCESS', 'FAILED'],
          maxSelect: 1,
        },
        { name: 'ip_address', type: 'text' },
        { name: 'user_agent', type: 'text' },
        { name: 'details', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pcp_audit_event ON pcp_audit_logs (event_type, created DESC)',
        'CREATE INDEX idx_pcp_audit_user ON pcp_audit_logs (user_id, created DESC)',
      ],
    })
    app.save(auditLogsCollection)
  },
  (app) => {
    const collections = [
      'pcp_audit_logs',
      'pcp_line_responsibles',
      'pcp_delegations',
      'pcp_permission_exceptions',
      'pcp_access_scopes',
      'pcp_role_permissions',
      'pcp_permissions',
      'pcp_roles',
    ]

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)

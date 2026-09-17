migrate(
  (app) => {
    // Garantir que permissões de integração, auditoria e administração estejam cadastradas e vinculadas aos perfis
    const rolesCollection = app.findCollectionByNameOrId('pcp_roles')
    const permsCollection = app.findCollectionByNameOrId('pcp_permissions')
    const rolePermsCollection = app.findCollectionByNameOrId('pcp_role_permissions')

    // 1. Obter IDs das roles
    let adminRole, programmerRole, auditorRole
    try {
      adminRole = app.findFirstRecordByData('pcp_roles', 'code', 'PCP_ADMIN')
    } catch (_) {}
    try {
      programmerRole = app.findFirstRecordByData('pcp_roles', 'code', 'PCP_PROGRAMMER')
    } catch (_) {}
    try {
      auditorRole = app.findFirstRecordByData('pcp_roles', 'code', 'AUDITOR')
    } catch (_) {}

    // 2. Garantir permissões essenciais
    const requiredPerms = [
      {
        key: 'pcp.integrations.view',
        name: 'Visualizar Integrações e Monitor PCP',
        category: 'Integrações',
        description: 'Permite visualizar status, painéis e monitor de integrações PCP.',
      },
      {
        key: 'pcp.integrations.manage',
        name: 'Gerenciar Integrações PCP',
        category: 'Integrações',
        description: 'Permite configurar e gerenciar conectores e integrações.',
      },
      {
        key: 'pcp.audit.view',
        name: 'Visualizar Auditoria e Logs',
        category: 'Auditoria',
        description: 'Consulta a trilhas de auditoria, motivos e logs de governança.',
      },
      {
        key: 'pcp.admin.manage',
        name: 'Gerenciar Acessos e Configurações RBAC',
        category: 'Administração',
        description: 'Permite administrar perfis, acessos e permissões no sistema.',
      },
      {
        key: 'pcp.admin.access',
        name: 'Administração de Perfis e Acessos',
        category: 'Administração',
        description: 'Gestão completa de roles, escopos e permissões.',
      },
    ]

    const permRecords = {}
    for (const p of requiredPerms) {
      let rec
      try {
        rec = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {
        rec = new Record(permsCollection)
        rec.set('key', p.key)
        rec.set('name', p.name)
        rec.set('category', p.category)
        rec.set('description', p.description)
        rec.set('is_critical', p.key.includes('manage') || p.key.includes('access'))
        app.save(rec)
      }
      permRecords[p.key] = rec
    }

    // 3. Associar permissões aos perfis
    const grantRolePerm = (roleRecord, permRecord) => {
      if (!roleRecord || !permRecord) return
      const filter = `role_id = '${roleRecord.id}' && permission_id = '${permRecord.id}'`
      const existing = app.findRecordsByFilter('pcp_role_permissions', filter, '', 1, 0)
      if (existing && existing.length > 0) return

      const rp = new Record(rolePermsCollection)
      rp.set('role_id', roleRecord.id)
      rp.set('permission_id', permRecord.id)
      app.save(rp)
    }

    // PCP_ADMIN recebe todas
    if (adminRole) {
      for (const k in permRecords) {
        grantRolePerm(adminRole, permRecords[k])
      }
    }

    // PCP_PROGRAMMER recebe integrations.view, audit.view, admin.manage, admin.access
    if (programmerRole) {
      grantRolePerm(programmerRole, permRecords['pcp.integrations.view'])
      grantRolePerm(programmerRole, permRecords['pcp.audit.view'])
      grantRolePerm(programmerRole, permRecords['pcp.admin.manage'])
      grantRolePerm(programmerRole, permRecords['pcp.admin.access'])
    }

    // AUDITOR recebe audit.view, integrations.view
    if (auditorRole) {
      grantRolePerm(auditorRole, permRecords['pcp.audit.view'])
      grantRolePerm(auditorRole, permRecords['pcp.integrations.view'])
    }
  },
  (app) => {
    // rollback opcional não destrutivo
  },
)

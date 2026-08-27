// Hook endpoint: GET /backend/v1/auth/permissions
// Retorna a resolução completa de permissões, escopos e exceções do usuário autenticado no HUB CIAFAL
routerAdd(
  'GET',
  '/backend/v1/auth/permissions',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
    }

    const userId = authRecord.id
    const userRoleCode = authRecord.getString('role') || 'PRODUCTION_VIEWER'
    const userName = authRecord.getString('name')
    const userEmail = authRecord.getString('email')

    // 1. Localizar role no pcp_roles
    let roleRecord = null
    try {
      roleRecord = $app.findFirstRecordByData('pcp_roles', 'code', userRoleCode)
    } catch (_) {}

    // 2. Coletar permissões base do perfil
    const permissionsMap = {}
    if (roleRecord) {
      try {
        const rolePerms = $app.findRecordsByFilter(
          'pcp_role_permissions',
          `role_id = '${roleRecord.id}'`,
          '',
          200,
          0,
        )
        for (const rp of rolePerms) {
          try {
            const perm = $app.findCollectionByNameOrId('pcp_permissions')
            const permRec = $app.findFirstRecordByData(
              'pcp_permissions',
              'id',
              rp.getString('permission_id'),
            )
            if (permRec) {
              permissionsMap[permRec.getString('key')] = {
                key: permRec.getString('key'),
                name: permRec.getString('name'),
                category: permRec.getString('category'),
                is_critical: permRec.getBool('is_critical'),
                source: 'ROLE',
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // 3. Aplicar Exceções de Permissão (GRANT / DENY)
    try {
      const exceptions = $app.findRecordsByFilter(
        'pcp_permission_exceptions',
        `user_id = '${userId}'`,
        '',
        100,
        0,
      )
      for (const exc of exceptions) {
        try {
          const permRec = $app.findFirstRecordByData(
            'pcp_permissions',
            'id',
            exc.getString('permission_id'),
          )
          if (permRec) {
            const pKey = permRec.getString('key')
            const excType = exc.getString('type')
            if (excType === 'DENY') {
              delete permissionsMap[pKey]
            } else if (excType === 'GRANT') {
              permissionsMap[pKey] = {
                key: pKey,
                name: permRec.getString('name'),
                category: permRec.getString('category'),
                is_critical: permRec.getBool('is_critical'),
                source: 'EXCEPTION_GRANT',
              }
            }
          }
        } catch (_) {}
      }
    } catch (_) {}

    // 4. Buscar Escopos de Acesso do Usuário
    const scopes = []
    let isGlobal = false
    try {
      const scopeRecords = $app.findRecordsByFilter(
        'pcp_access_scopes',
        `user_id = '${userId}' && active = true`,
        '',
        50,
        0,
      )
      for (const s of scopeRecords) {
        const sType = s.getString('scope_type')
        if (sType === 'GLOBAL') isGlobal = true
        scopes.push({
          id: s.id,
          scope_type: sType,
          target_id: s.getString('target_id'),
          target_code: s.getString('target_code'),
          target_name: s.getString('target_name'),
          valid_from: s.getString('valid_from'),
          valid_until: s.getString('valid_until'),
          active: s.getBool('active'),
        })
      }
    } catch (_) {}

    // 5. Verificar Delegações Ativas Recebidas
    const delegations = []
    try {
      const nowStr = new Date().toISOString().split('T')[0]
      const delRecords = $app.findRecordsByFilter(
        'pcp_delegations',
        `delegate_id = '${userId}' && active = true`,
        '',
        20,
        0,
      )
      for (const d of delRecords) {
        delegations.push({
          id: d.id,
          delegator_id: d.getString('delegator_id'),
          scope_type: d.getString('scope_type'),
          target_id: d.getString('target_id'),
          reason: d.getString('reason'),
          start_date: d.getString('start_date'),
          end_date: d.getString('end_date'),
          active: d.getBool('active'),
        })
        if (d.getString('scope_type') === 'GLOBAL') isGlobal = true
      }
    } catch (_) {}

    return e.json(200, {
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        role: userRoleCode,
        role_details: roleRecord
          ? {
              name: roleRecord.getString('name'),
              description: roleRecord.getString('description'),
              hierarchy_level: roleRecord.getInt('hierarchy_level'),
            }
          : null,
      },
      is_global: isGlobal,
      scopes: scopes,
      delegations: delegations,
      permissions: Object.values(permissionsMap),
      permission_keys: Object.keys(permissionsMap),
    })
  },
  $apis.requireAuth(),
)

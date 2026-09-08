// Hook endpoint: GET /backend/v1/auth/permissions
// Retorna a resolução completa de permissões, escopos e exceções do usuário autenticado no HUB CIAFAL
// Com cache server-side em memória via $app.store() / globalStore com TTL (60s) e instrumentação de timing por etapa

// Invalidação do cache quando roles ou permissões forem alteradas
onRecordAfterCreateSuccess(
  (e) => {
    try {
      if (typeof $app !== 'undefined' && $app.store) {
        $app.store().remove('__rbac_catalog_cache')
        $app.store().remove('__rbac_catalog_cache_expires_at')
      }
    } catch (_) {}
    try {
      if (typeof globalThis !== 'undefined') {
        delete globalThis.__rbac_catalog_cache
        delete globalThis.__rbac_catalog_cache_expires_at
      }
    } catch (_) {}
  },
  'pcp_permissions',
  'pcp_roles',
  'pcp_role_permissions',
)

onRecordAfterUpdateSuccess(
  (e) => {
    try {
      if (typeof $app !== 'undefined' && $app.store) {
        $app.store().remove('__rbac_catalog_cache')
        $app.store().remove('__rbac_catalog_cache_expires_at')
      }
    } catch (_) {}
    try {
      if (typeof globalThis !== 'undefined') {
        delete globalThis.__rbac_catalog_cache
        delete globalThis.__rbac_catalog_cache_expires_at
      }
    } catch (_) {}
  },
  'pcp_permissions',
  'pcp_roles',
  'pcp_role_permissions',
)

onRecordAfterDeleteSuccess(
  (e) => {
    try {
      if (typeof $app !== 'undefined' && $app.store) {
        $app.store().remove('__rbac_catalog_cache')
        $app.store().remove('__rbac_catalog_cache_expires_at')
      }
    } catch (_) {}
    try {
      if (typeof globalThis !== 'undefined') {
        delete globalThis.__rbac_catalog_cache
        delete globalThis.__rbac_catalog_cache_expires_at
      }
    } catch (_) {}
  },
  'pcp_permissions',
  'pcp_roles',
  'pcp_role_permissions',
)

routerAdd(
  'GET',
  '/backend/v1/auth/permissions',
  (e) => {
    const t0 = Date.now()
    const timings = {}

    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
    }

    const userId = authRecord.id
    const userRoleCode = authRecord.getString('role') || 'PRODUCTION_VIEWER'
    const userName = authRecord.getString('name')
    const userEmail = authRecord.getString('email')

    // 1. Obter ou construir catálogo estático em cache (pcp_roles, pcp_permissions, pcp_role_permissions)
    const tCatalogStart = Date.now()
    const now = Date.now()
    let catalog = null
    let cacheHit = false

    // Tentar ler cache de globalThis ou $app.store
    try {
      if (
        typeof globalThis !== 'undefined' &&
        globalThis.__rbac_catalog_cache &&
        globalThis.__rbac_catalog_cache_expires_at > now
      ) {
        catalog = globalThis.__rbac_catalog_cache
        cacheHit = true
      }
    } catch (_) {}

    if (!catalog) {
      try {
        if (typeof $app !== 'undefined' && $app.store && $app.store().has('__rbac_catalog_cache')) {
          const exp = $app.store().get('__rbac_catalog_cache_expires_at')
          if (exp && exp > now) {
            catalog = $app.store().get('__rbac_catalog_cache')
            cacheHit = true
          }
        }
      } catch (_) {}
    }

    if (!catalog) {
      // Carregar dados e construir estrutura em memória
      const tRolesStart = Date.now()
      const rolesByCode = {}
      try {
        const rolesList = $app.findRecordsByFilter('pcp_roles', '', '', 100, 0)
        for (const r of rolesList) {
          rolesByCode[r.getString('code')] = {
            id: r.id,
            code: r.getString('code'),
            name: r.getString('name'),
            description: r.getString('description'),
            hierarchy_level: r.getInt('hierarchy_level'),
          }
        }
      } catch (err) {
        console.warn('[auth/permissions] Erro ao carregar pcp_roles:', err)
      }
      timings['query_roles_ms'] = Date.now() - tRolesStart

      const tPermsStart = Date.now()
      const allPermsById = {}
      const allPermsByKey = {}
      try {
        const permRecords = $app.findRecordsByFilter('pcp_permissions', '', '', 500, 0)
        for (const p of permRecords) {
          const item = {
            id: p.id,
            key: p.getString('key'),
            name: p.getString('name'),
            category: p.getString('category'),
            is_critical: p.getBool('is_critical'),
          }
          allPermsById[p.id] = item
          if (item.key) allPermsByKey[item.key] = item
        }
      } catch (err) {
        console.warn('[auth/permissions] Erro ao carregar pcp_permissions:', err)
      }
      timings['query_permissions_ms'] = Date.now() - tPermsStart

      const tRolePermsStart = Date.now()
      const rolePermsByRoleId = {}
      try {
        const allRolePerms = $app.findRecordsByFilter('pcp_role_permissions', '', '', 1000, 0)
        for (const rp of allRolePerms) {
          const rId = rp.getString('role_id')
          const pId = rp.getString('permission_id')
          if (!rolePermsByRoleId[rId]) {
            rolePermsByRoleId[rId] = []
          }
          rolePermsByRoleId[rId].push(pId)
        }
      } catch (err) {
        console.warn('[auth/permissions] Erro ao carregar pcp_role_permissions:', err)
      }
      timings['query_role_permissions_ms'] = Date.now() - tRolePermsStart

      catalog = {
        rolesByCode,
        allPermsById,
        allPermsByKey,
        rolePermsByRoleId,
      }

      const expiresAt = Date.now() + 60000 // 60s TTL
      try {
        if (typeof globalThis !== 'undefined') {
          globalThis.__rbac_catalog_cache = catalog
          globalThis.__rbac_catalog_cache_expires_at = expiresAt
        }
      } catch (_) {}

      try {
        if (typeof $app !== 'undefined' && $app.store) {
          $app.store().set('__rbac_catalog_cache', catalog)
          $app.store().set('__rbac_catalog_cache_expires_at', expiresAt)
        }
      } catch (_) {}
    }
    timings['catalog_total_ms'] = Date.now() - tCatalogStart
    timings['catalog_cache_hit'] = cacheHit

    // 2. Resolução de role e permissões base
    const tResolutionStart = Date.now()
    const roleDetails = catalog.rolesByCode[userRoleCode] || null
    const permissionsMap = {}

    if (userRoleCode === 'PCP_ADMIN') {
      // PCP_ADMIN recebe todas as permissões cadastradas diretamente sem consultar pcp_role_permissions
      for (const permKey in catalog.allPermsByKey) {
        const p = catalog.allPermsByKey[permKey]
        permissionsMap[permKey] = {
          key: p.key,
          name: p.name,
          category: p.category,
          is_critical: p.is_critical,
          source: 'ROLE_ADMIN',
        }
      }
    } else {
      if (roleDetails) {
        // Consultar matriz de permissões resolvida em memória a partir do catálogo
        const permIds = catalog.rolePermsByRoleId[roleDetails.id] || []
        for (const pId of permIds) {
          const perm = catalog.allPermsById[pId]
          if (perm && perm.key) {
            permissionsMap[perm.key] = {
              key: perm.key,
              name: perm.name,
              category: perm.category,
              is_critical: perm.is_critical,
              source: 'ROLE',
            }
          }
        }
      }

      // Garantir permissões de visualização operacional base por papel (fallback de segurança)
      const defaultRolePerms = {
        PCP_PROGRAMMER: [
          'pcp.schedule.view',
          'pcp.weekly_schedule.view',
          'pcp.schedule.edit',
          'pcp.weekly_schedule.edit',
          'pcp.approval.view',
          'pcp.carteira.view',
        ],
        LINE_MANAGER: [
          'pcp.schedule.view',
          'pcp.weekly_schedule.view',
          'pcp.schedule.approve',
          'pcp.masterdata.view',
          'pcp.quality.view',
          'pcp.carteira.view',
        ],
        PRODUCTION_VIEWER: [
          'pcp.schedule.view',
          'pcp.weekly_schedule.view',
          'pcp.quality.view',
          'pcp.carteira.view',
        ],
        OPERATOR: [
          'pcp.schedule.view',
          'pcp.weekly_schedule.view',
          'pcp.quality.view',
          'pcp.carteira.view',
        ],
      }
      const defaults = defaultRolePerms[userRoleCode] || ['pcp.schedule.view']
      for (const dKey of defaults) {
        if (!permissionsMap[dKey]) {
          permissionsMap[dKey] = {
            key: dKey,
            name: dKey,
            category: 'FALLBACK',
            is_critical: false,
            source: 'ROLE_DEFAULT',
          }
        }
      }
    }
    timings['resolution_base_ms'] = Date.now() - tResolutionStart

    // 3. Aplicar Exceções de Permissão (GRANT / DENY) por usuário
    const tExceptionsStart = Date.now()
    try {
      const exceptions = $app.findRecordsByFilter(
        'pcp_permission_exceptions',
        `user_id = '${userId}'`,
        '',
        100,
        0,
      )
      for (const exc of exceptions) {
        const permId = exc.getString('permission_id')
        const perm = catalog.allPermsById[permId]
        if (perm && perm.key) {
          const pKey = perm.key
          const excType = exc.getString('type')
          if (excType === 'DENY') {
            delete permissionsMap[pKey]
          } else if (excType === 'GRANT') {
            permissionsMap[pKey] = {
              key: pKey,
              name: perm.name,
              category: perm.category,
              is_critical: perm.is_critical,
              source: 'EXCEPTION_GRANT',
            }
          }
        }
      }
    } catch (err) {
      console.warn('[auth/permissions] Erro ao buscar pcp_permission_exceptions:', err)
    }
    timings['query_exceptions_ms'] = Date.now() - tExceptionsStart

    // 4. Buscar Escopos de Acesso do Usuário
    const tScopesStart = Date.now()
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
    } catch (err) {
      console.warn('[auth/permissions] Erro ao buscar pcp_access_scopes:', err)
    }
    timings['query_scopes_ms'] = Date.now() - tScopesStart

    // 5. Verificar Delegações Ativas Recebidas
    const tDelegationsStart = Date.now()
    const delegations = []
    try {
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
    } catch (err) {
      console.warn('[auth/permissions] Erro ao buscar pcp_delegations:', err)
    }
    timings['query_delegations_ms'] = Date.now() - tDelegationsStart

    const totalMs = Date.now() - t0
    timings['total_endpoint_ms'] = totalMs

    console.log(
      `[auth/permissions] userId=${userId} role=${userRoleCode} cacheHit=${cacheHit} total=${totalMs}ms breakdown=${JSON.stringify(timings)}`,
    )

    return e.json(200, {
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        role: userRoleCode,
        role_details: roleDetails
          ? {
              name: roleDetails.name,
              description: roleDetails.description,
              hierarchy_level: roleDetails.hierarchy_level,
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

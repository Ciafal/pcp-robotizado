migrate(
  (app) => {
    const rolePermissionsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    // 1. Localizar role PCP_PROGRAMMER
    let programmerRoleId = '3i4oq3u2ze6nydd'
    try {
      const programmerRole = app.findFirstRecordByData('pcp_roles', 'code', 'PCP_PROGRAMMER')
      programmerRoleId = programmerRole.id
    } catch (_) {
      // Se não achar por código, usa o id padrão
    }

    // 2. Chaves de permissão de produção para associar
    const permKeys = ['pcp.production.view', 'pcp.production.close']

    for (const key of permKeys) {
      let permRecord = null
      try {
        permRecord = app.findFirstRecordByData('pcp_permissions', 'key', key)
      } catch (_) {
        permRecord = null
      }

      if (permRecord) {
        const filter = `role_id = '${programmerRoleId}' && permission_id = '${permRecord.id}'`
        const existing = app.findRecordsByFilter('pcp_role_permissions', filter, '', 1, 0)
        if (!existing || existing.length === 0) {
          const rec = new Record(rolePermissionsCol)
          rec.set('role_id', programmerRoleId)
          rec.set('permission_id', permRecord.id)
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    // Reversão opcional (não destrutiva)
    try {
      let programmerRoleId = '3i4oq3u2ze6nydd'
      try {
        const r = app.findFirstRecordByData('pcp_roles', 'code', 'PCP_PROGRAMMER')
        programmerRoleId = r.id
      } catch (_) {}

      const permKeys = ['pcp.production.view', 'pcp.production.close']
      for (const key of permKeys) {
        try {
          const perm = app.findFirstRecordByData('pcp_permissions', 'key', key)
          const filter = `role_id = '${programmerRoleId}' && permission_id = '${perm.id}'`
          const recs = app.findRecordsByFilter('pcp_role_permissions', filter, '', 10, 0)
          for (const rec of recs) {
            app.delete(rec)
          }
        } catch (_) {}
      }
    } catch (_) {}
  },
)

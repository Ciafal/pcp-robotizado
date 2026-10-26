migrate(
  (app) => {
    const rolePermissionsCol = app.findCollectionByNameOrId('pcp_role_permissions')

    // 1. Roles que devem ter permissão de gerenciar/visualizar modelos SAP:
    // PCP_PROGRAMMER, PPC_PROGRAMMER, PCP_PLANNER, LINE_MANAGER (view)
    const targetRoles = [
      {
        code: 'PCP_PROGRAMMER',
        keys: [
          'pcp.sap_validation.view',
          'pcp.sap_validation.execute',
          'pcp.sap_validation.models.view',
          'pcp.sap_validation.models.manage',
        ],
      },
      {
        code: 'PCP_PLANNER',
        keys: ['pcp.sap_validation.view', 'pcp.sap_validation.models.view'],
      },
      {
        code: 'LINE_MANAGER',
        keys: ['pcp.sap_validation.view', 'pcp.sap_validation.models.view'],
      },
      {
        code: 'AUDITOR',
        keys: ['pcp.sap_validation.view', 'pcp.sap_validation.models.view'],
      },
    ]

    for (const roleDef of targetRoles) {
      let roleRecord = null
      try {
        roleRecord = app.findFirstRecordByData('pcp_roles', 'code', roleDef.code)
      } catch (_) {
        roleRecord = null
      }

      if (!roleRecord) continue

      for (const permKey of roleDef.keys) {
        let permRecord = null
        try {
          permRecord = app.findFirstRecordByData('pcp_permissions', 'key', permKey)
        } catch (_) {
          permRecord = null
        }

        if (!permRecord) continue

        const filter = `role_id = '${roleRecord.id}' && permission_id = '${permRecord.id}'`
        const existing = app.findRecordsByFilter('pcp_role_permissions', filter, '', 1, 0)
        if (!existing || existing.length === 0) {
          const rec = new Record(rolePermissionsCol)
          rec.set('role_id', roleRecord.id)
          rec.set('permission_id', permRecord.id)
          app.save(rec)
        }
      }
    }
  },
  (app) => {
    // Reversão limpa
    try {
      const keysToRevert = [
        'pcp.sap_validation.models.manage',
        'pcp.sap_validation.models.view',
        'pcp.sap_validation.execute',
        'pcp.sap_validation.view',
      ]
      for (const key of keysToRevert) {
        try {
          const perm = app.findFirstRecordByData('pcp_permissions', 'key', key)
          if (!perm) continue
          const recs = app.findRecordsByFilter(
            'pcp_role_permissions',
            `permission_id = '${perm.id}'`,
            '',
            50,
            0,
          )
          for (const rec of recs) {
            app.delete(rec)
          }
        } catch (_) {}
      }
    } catch (_) {}
  },
)

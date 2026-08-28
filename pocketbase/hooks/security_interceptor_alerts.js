// Hook: Interceptor de segurança e object-level authorization para Alertas Industriais (pcp_alerts)
// 1. LIST/VIEW: Filtra registros com base no escopo (pcp_access_scopes / pcp_delegations)
// 2. UPDATE/DELETE: Valida se o usuário tem escopo na linha associada e permissão pcp.alert.manage

onRecordListRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id

  if (userRole === 'PCP_ADMIN' || userRole === 'EXECUTIVE_VIEWER' || userRole === 'AUDITOR') {
    return e.next()
  }

  let isGlobal = false
  const allowedLineIds = []

  try {
    const scopes = $app.findRecordsByFilter(
      'pcp_access_scopes',
      `user_id = '${userId}' && active = true`,
      '',
      50,
      0,
    )
    for (const s of scopes) {
      const sType = s.getString('scope_type')
      const targetId = s.getString('target_id')
      if (sType === 'GLOBAL' || targetId === 'ALL') {
        isGlobal = true
        break
      }
      if (targetId) allowedLineIds.push(targetId)
    }
  } catch (_) {}

  if (!isGlobal) {
    try {
      const delegations = $app.findRecordsByFilter(
        'pcp_delegations',
        `delegate_id = '${userId}' && active = true`,
        '',
        20,
        0,
      )
      for (const d of delegations) {
        const dType = d.getString('scope_type')
        const targetId = d.getString('target_id')
        if (dType === 'GLOBAL') {
          isGlobal = true
          break
        }
        if (targetId) allowedLineIds.push(targetId)
      }
    } catch (_) {}
  }

  if (isGlobal) {
    return e.next()
  }

  // Se não tem escopo em nenhuma linha, permite apenas alertas gerais (sem line_id)
  if (allowedLineIds.length === 0) {
    const scopeFilter = "line_id = '' || line_id = null"
    const existingFilter = e.requestInfo().query.filter
    e.requestInfo().query.filter = existingFilter
      ? `(${existingFilter}) && (${scopeFilter})`
      : scopeFilter
    return e.next()
  }

  const filters = ["line_id = ''", 'line_id = null']
  for (const lid of allowedLineIds) {
    filters.push(`line_id = '${lid}'`)
  }

  const scopeFilter = `(${filters.join(' || ')})`
  const existingFilter = e.requestInfo().query.filter
  if (existingFilter) {
    e.requestInfo().query.filter = `(${existingFilter}) && (${scopeFilter})`
  } else {
    e.requestInfo().query.filter = scopeFilter
  }

  return e.next()
}, 'pcp_alerts')

onRecordViewRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id

  if (userRole === 'PCP_ADMIN' || userRole === 'EXECUTIVE_VIEWER' || userRole === 'AUDITOR') {
    return e.next()
  }

  const targetLineId = e.record.getString('line_id')
  if (!targetLineId) {
    // Alertas gerais sem linha associada são visíveis
    return e.next()
  }

  let hasScope = false
  try {
    const scopes = $app.findRecordsByFilter(
      'pcp_access_scopes',
      `user_id = '${userId}' && active = true`,
      '',
      50,
      0,
    )
    for (const s of scopes) {
      const sType = s.getString('scope_type')
      const targetId = s.getString('target_id')
      if (sType === 'GLOBAL' || targetId === 'ALL' || targetId === targetLineId) {
        hasScope = true
        break
      }
    }
  } catch (_) {}

  if (!hasScope) {
    try {
      const delegations = $app.findRecordsByFilter(
        'pcp_delegations',
        `delegate_id = '${userId}' && active = true`,
        '',
        20,
        0,
      )
      for (const d of delegations) {
        const dType = d.getString('scope_type')
        const targetId = d.getString('target_id')
        if (dType === 'GLOBAL' || targetId === targetLineId) {
          hasScope = true
          break
        }
      }
    } catch (_) {}
  }

  if (!hasScope) {
    return e.json(403, {
      code: 'FORBIDDEN_SCOPE_VIOLATION',
      message: 'Acesso negado: Alerta industrial fora do seu escopo autorizado.',
    })
  }

  return e.next()
}, 'pcp_alerts')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const targetLineId = e.record.getString('line_id')

  // 1. Validar Permissão Granular (pcp.alert.manage)
  let hasPermission = false

  if (userRole === 'PCP_ADMIN') {
    hasPermission = true
  } else {
    try {
      const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
      if (roleRec) {
        const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.alert.manage')
        if (permRec) {
          const rolePerms = $app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
            '',
            1,
            0,
          )
          if (rolePerms.length > 0) {
            hasPermission = true
          }
        }
      }
    } catch (_) {}

    try {
      const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.alert.manage')
      if (permRec) {
        const exceptions = $app.findRecordsByFilter(
          'pcp_permission_exceptions',
          `user_id = '${userId}' && permission_id = '${permRec.id}'`,
          '',
          1,
          0,
        )
        if (exceptions.length > 0) {
          const excType = exceptions[0].getString('type')
          if (excType === 'DENY') {
            hasPermission = false
          } else if (excType === 'GRANT') {
            hasPermission = true
          }
        }
      }
    } catch (_) {}
  }

  // 2. Validar Escopo
  let hasScope = false
  if (userRole === 'PCP_ADMIN' || !targetLineId) {
    hasScope = true
  } else {
    try {
      const scopes = $app.findRecordsByFilter(
        'pcp_access_scopes',
        `user_id = '${userId}' && active = true`,
        '',
        20,
        0,
      )
      for (const s of scopes) {
        const sType = s.getString('scope_type')
        const sTarget = s.getString('target_id')
        if (sType === 'GLOBAL' || sTarget === targetLineId || sTarget === 'ALL') {
          hasScope = true
          break
        }
      }
    } catch (_) {}

    if (!hasScope) {
      try {
        const delegations = $app.findRecordsByFilter(
          'pcp_delegations',
          `delegate_id = '${userId}' && active = true`,
          '',
          10,
          0,
        )
        for (const d of delegations) {
          const dType = d.getString('scope_type')
          const dTarget = d.getString('target_id')
          if (dType === 'GLOBAL' || dTarget === targetLineId) {
            hasScope = true
            break
          }
        }
      } catch (_) {}
    }
  }

  if (!hasPermission || !hasScope) {
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', authRecord.getString('email'))
      log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
      log.set('user_role', userRole)
      log.set('event_type', 'UNAUTHORIZED_ACTION_ATTEMPT')
      log.set('action', 'UPDATE_ALERT_OUTSIDE_SCOPE')
      log.set('resource', 'pcp_alerts')
      log.set('resource_id', e.record.id)
      log.set('permission_required', 'pcp.alert.manage')
      log.set('outcome', 'DENY')
      log.set('details', {
        reason: !hasPermission
          ? 'Usuário não possui permissão pcp.alert.manage'
          : 'Linha do alerta fora do escopo',
        line_id: targetLineId,
      })
      $app.save(log)
    } catch (_) {}

    return e.json(403, {
      code: 'FORBIDDEN_SCOPE_VIOLATION',
      message:
        'Acesso negado: O alerta pertence a uma linha fora do seu escopo autorizado ou perfil insuficiente.',
    })
  }

  return e.next()
}, 'pcp_alerts')

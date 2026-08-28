// Hook: Interceptor de segurança e object-level authorization para Linhas de Produção
// 1. LIST/VIEW: Filtra ou bloqueia registros fora do escopo (Object-Level Authorization)
// 2. UPDATE/CREATE/DELETE: Valida permissões granulares (pcp.masterdata.edit) consultando role, exceções e delegações

onRecordListRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id

  // PCP_ADMIN e EXECUTIVE_VIEWER têm visão global
  if (userRole === 'PCP_ADMIN' || userRole === 'EXECUTIVE_VIEWER' || userRole === 'AUDITOR') {
    return e.next()
  }

  // Obter escopos ativos do usuário
  let isGlobal = false
  const allowedLineIds = []
  const allowedLineCodes = []

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
      if (sType === 'GLOBAL') {
        isGlobal = true
        break
      }
      const targetId = s.getString('target_id')
      const targetCode = s.getString('target_code')
      if (targetId === 'ALL') {
        isGlobal = true
        break
      }
      if (targetId) allowedLineIds.push(targetId)
      if (targetCode) allowedLineCodes.push(targetCode)
    }
  } catch (_) {}

  // Verificar delegações ativas
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
        if (dType === 'GLOBAL') {
          isGlobal = true
          break
        }
        const targetId = d.getString('target_id')
        if (targetId) allowedLineIds.push(targetId)
      }
    } catch (_) {}
  }

  if (isGlobal) {
    return e.next()
  }

  // Se não tem escopo global, limitar o filtro de consulta (list)
  if (allowedLineIds.length === 0 && allowedLineCodes.length === 0) {
    // Retorna vazio adicionando filtro impossível
    e.requestInfo().query.filter = "id = 'none_authorized'"
    return e.next()
  }

  const filters = []
  for (const lid of allowedLineIds) {
    filters.push(`id = '${lid}'`)
  }
  for (const lcode of allowedLineCodes) {
    filters.push(`code = '${lcode}'`)
  }

  const scopeFilter = `(${filters.join(' || ')})`
  const existingFilter = e.requestInfo().query.filter
  if (existingFilter) {
    e.requestInfo().query.filter = `(${existingFilter}) && ${scopeFilter}`
  } else {
    e.requestInfo().query.filter = scopeFilter
  }

  return e.next()
}, 'production_lines')

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

  const targetLineId = e.record.id
  const targetLineCode = e.record.getString('code')

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
      const targetCode = s.getString('target_code')
      if (
        sType === 'GLOBAL' ||
        targetId === 'ALL' ||
        targetId === targetLineId ||
        targetCode === targetLineCode
      ) {
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
      message: 'Acesso negado: Visualização restrita a linhas do seu escopo autorizado.',
    })
  }

  return e.next()
}, 'production_lines')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const targetLineId = e.record.id
  const targetLineCode = e.record.getString('code')

  // 1. Validar Permissão Granular (pcp.masterdata.edit)
  // Checar se PCP_ADMIN ou se possui permissão via role/exceção
  let hasPermission = false

  if (userRole === 'PCP_ADMIN') {
    hasPermission = true
  } else {
    // Checar se a role tem a permissão pcp.masterdata.edit
    try {
      const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
      if (roleRec) {
        const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.masterdata.edit')
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

    // Checar Exceções Granulares (GRANT / DENY)
    try {
      const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.masterdata.edit')
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

  // 2. Validar Escopo de Acesso (Object-Level Authorization)
  let hasScope = false
  if (userRole === 'PCP_ADMIN') {
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
        const sCode = s.getString('target_code')
        if (
          sType === 'GLOBAL' ||
          sTarget === targetLineId ||
          sTarget === 'ALL' ||
          sCode === targetLineCode
        ) {
          hasScope = true
          break
        }
      }
    } catch (_) {}

    // Delegações
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
    // Registrar trilha de auditoria para tentativa não autorizada (403)
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', authRecord.getString('email'))
      log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
      log.set('user_role', userRole)
      log.set('event_type', 'UNAUTHORIZED_ACTION_ATTEMPT')
      log.set('action', 'OBJECT_LEVEL_DENIED_UPDATE_LINE')
      log.set('resource', 'production_lines')
      log.set('resource_id', targetLineId)
      log.set('permission_required', 'pcp.masterdata.edit')
      log.set('scope', targetLineCode)
      log.set('outcome', 'DENY')
      log.set('details', {
        reason: !hasPermission
          ? 'Usuário não possui permissão pcp.masterdata.edit (Role/Exceção)'
          : 'Linha fora do escopo autorizado do usuário',
      })
      $app.save(log)
    } catch (_) {}

    return e.json(403, {
      code: 'FORBIDDEN_SCOPE_VIOLATION',
      message:
        'Acesso negado: Ação não autorizada para a linha (' +
        targetLineCode +
        '). Verifique sua permissão granular e escopo no HUB CIAFAL.',
    })
  }

  // Registrar auditoria para alteração bem-sucedida
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const log = new Record(auditCol)
    log.set('user_id', userId)
    log.set('user_email', authRecord.getString('email'))
    log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
    log.set('user_role', userRole)
    log.set('event_type', 'SCHEDULE_ACTION')
    log.set('action', 'UPDATE_LINE_CONFIG')
    log.set('resource', 'production_lines')
    log.set('resource_id', targetLineId)
    log.set('permission_required', 'pcp.masterdata.edit')
    log.set('scope', targetLineCode)
    log.set('outcome', 'SUCCESS')
    log.set('details', { line_code: targetLineCode })
    $app.save(log)
  } catch (_) {}

  return e.next()
}, 'production_lines')

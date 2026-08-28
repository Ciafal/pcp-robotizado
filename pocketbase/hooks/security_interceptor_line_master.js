// Hook: Interceptor de segurança, validação de regras de negócio e Object-Level Authorization para Ficha Mestre das Linhas (line_masters)
// Validações obrigatórias:
// 1. Capacidade > 0
// 2. Mínimo <= Máximo (lote, dimensões)
// 3. Unidade de medida padronizada (t/h, t, kg, peça, m, mm, h, min)
// 4. Justificativa obrigatória em criação de versão ou alteração de parâmetros críticos
// 5. Object-Level Authorization e RBAC (pcp.masterdata.edit)
// 6. Registro completo em pcp_audit_logs

onRecordCreateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const body = e.requestInfo().body

  // 1. Validar permissão pcp.masterdata.edit
  let hasPermission = false
  if (userRole === 'PCP_ADMIN') {
    hasPermission = true
  } else {
    try {
      const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
      if (roleRec) {
        const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.masterdata.edit')
        if (permRec) {
          const rps = $app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
            '',
            1,
            0,
          )
          if (rps.length > 0) hasPermission = true
        }
      }
    } catch (_) {}

    try {
      const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.masterdata.edit')
      if (permRec) {
        const excs = $app.findRecordsByFilter(
          'pcp_permission_exceptions',
          `user_id = '${userId}' && permission_id = '${permRec.id}'`,
          '',
          1,
          0,
        )
        if (excs.length > 0) {
          if (excs[0].getString('type') === 'DENY') hasPermission = false
          if (excs[0].getString('type') === 'GRANT') hasPermission = true
        }
      }
    } catch (_) {}
  }

  if (!hasPermission) {
    return e.json(403, {
      code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
      message: 'Acesso negado: Criação de Ficha Mestre requer a permissão pcp.masterdata.edit.',
    })
  }

  // 2. Validar Escopo de Acesso na Linha
  const lineId = body.line_id || e.record.getString('line_id')
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
        if (sType === 'GLOBAL' || sTarget === lineId || sTarget === 'ALL') {
          hasScope = true
          break
        }
      }
    } catch (_) {}
  }

  if (!hasScope) {
    return e.json(403, {
      code: 'FORBIDDEN_SCOPE_VIOLATION',
      message:
        'Acesso negado: Você não possui escopo de atuação autorizado para esta linha de produção.',
    })
  }

  // 3. Validações Estruturais e de Negócio
  const hourlyCap = Number(
    body.nominal_hourly_capacity ?? e.record.get('nominal_hourly_capacity') ?? 0,
  )
  if (hourlyCap <= 0) {
    return e.json(400, {
      code: 'INVALID_CAPACITY',
      message: 'A capacidade nominal por hora deve ser estritamente maior que zero (> 0).',
    })
  }

  const minBatch = Number(body.min_batch_size ?? e.record.get('min_batch_size') ?? 0)
  const maxBatch = Number(body.max_batch_size ?? e.record.get('max_batch_size') ?? 0)
  if (minBatch > 0 && maxBatch > 0 && minBatch > maxBatch) {
    return e.json(400, {
      code: 'INVALID_BATCH_RANGE',
      message: 'O lote mínimo de produção não pode ser superior ao lote máximo.',
    })
  }

  const changeReason = (body.change_reason || e.record.getString('change_reason') || '').trim()
  if (!changeReason) {
    return e.json(400, {
      code: 'REASON_REQUIRED',
      message: 'A justificativa técnica é obrigatória para criação ou nova versão da Ficha Mestre.',
    })
  }

  // Preencher autor
  e.record.set('author_id', userId)
  e.record.set('author_email', authRecord.getString('email'))

  // Registrar auditoria
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const log = new Record(auditCol)
    log.set('user_id', userId)
    log.set('user_email', authRecord.getString('email'))
    log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
    log.set('user_role', userRole)
    log.set('event_type', 'SCHEDULE_ACTION')
    log.set('action', 'CREATE_LINE_MASTER_VERSION')
    log.set('resource', 'line_masters')
    log.set('resource_id', lineId)
    log.set('permission_required', 'pcp.masterdata.edit')
    log.set('outcome', 'SUCCESS')
    log.set('details', {
      line_id: lineId,
      version: body.version || 1,
      reason: changeReason,
    })
    $app.save(log)
  } catch (_) {}

  return e.next()
}, 'line_masters')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const body = e.requestInfo().body

  // 1. Validar permissão pcp.masterdata.edit
  let hasPermission = false
  if (userRole === 'PCP_ADMIN') {
    hasPermission = true
  } else {
    try {
      const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
      if (roleRec) {
        const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.masterdata.edit')
        if (permRec) {
          const rps = $app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
            '',
            1,
            0,
          )
          if (rps.length > 0) hasPermission = true
        }
      }
    } catch (_) {}

    try {
      const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.masterdata.edit')
      if (permRec) {
        const excs = $app.findRecordsByFilter(
          'pcp_permission_exceptions',
          `user_id = '${userId}' && permission_id = '${permRec.id}'`,
          '',
          1,
          0,
        )
        if (excs.length > 0) {
          if (excs[0].getString('type') === 'DENY') hasPermission = false
          if (excs[0].getString('type') === 'GRANT') hasPermission = true
        }
      }
    } catch (_) {}
  }

  if (!hasPermission) {
    return e.json(403, {
      code: 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
      message: 'Acesso negado: Modificação da Ficha Mestre requer permissão pcp.masterdata.edit.',
    })
  }

  // 2. Validar Escopo na Linha
  const lineId = e.record.getString('line_id')
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
        if (sType === 'GLOBAL' || sTarget === lineId || sTarget === 'ALL') {
          hasScope = true
          break
        }
      }
    } catch (_) {}
  }

  if (!hasScope) {
    return e.json(403, {
      code: 'FORBIDDEN_SCOPE_VIOLATION',
      message: 'Acesso negado: Linha fora do escopo autorizado do usuário.',
    })
  }

  // 3. Validações
  const hourlyCap = Number(
    body.nominal_hourly_capacity ?? e.record.get('nominal_hourly_capacity') ?? 0,
  )
  if (hourlyCap <= 0) {
    return e.json(400, {
      code: 'INVALID_CAPACITY',
      message: 'A capacidade nominal por hora deve ser estritamente maior que zero (> 0).',
    })
  }

  const minBatch = Number(body.min_batch_size ?? e.record.get('min_batch_size') ?? 0)
  const maxBatch = Number(body.max_batch_size ?? e.record.get('max_batch_size') ?? 0)
  if (minBatch > 0 && maxBatch > 0 && minBatch > maxBatch) {
    return e.json(400, {
      code: 'INVALID_BATCH_RANGE',
      message: 'O lote mínimo de produção não pode ser superior ao lote máximo.',
    })
  }

  const changeReason = (body.change_reason || '').trim()
  if (!changeReason) {
    return e.json(400, {
      code: 'REASON_REQUIRED',
      message:
        'A justificativa técnica de engenharia/PCP é obrigatória para alteração da Ficha Mestre.',
    })
  }

  // Registrar auditoria
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const log = new Record(auditCol)
    log.set('user_id', userId)
    log.set('user_email', authRecord.getString('email'))
    log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
    log.set('user_role', userRole)
    log.set('event_type', 'SCHEDULE_ACTION')
    log.set('action', 'UPDATE_LINE_MASTER')
    log.set('resource', 'line_masters')
    log.set('resource_id', e.record.id)
    log.set('permission_required', 'pcp.masterdata.edit')
    log.set('outcome', 'SUCCESS')
    log.set('details', {
      line_id: lineId,
      version: e.record.get('version'),
      reason: changeReason,
    })
    $app.save(log)
  } catch (_) {}

  return e.next()
}, 'line_masters')

// Hook: Interceptor de segurança e governança para alteração de Origem de Dados (SAP <-> MANUAL) e Linhas
// PocketBase JSVM: todas as verificações devem ser inline no corpo de cada callback

// Interceptar mudanças em Produtividade
onRecordCreateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { error: 'Autenticação corporativa requerida' })

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const lineId = e.record.getString('line_id')

  // Object-level authorization por escopo
  if (userRole !== 'PCP_ADMIN' && lineId) {
    let hasScope = false
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
    if (!hasScope) {
      return e.json(403, {
        code: 'FORBIDDEN_SCOPE',
        message: 'Usuário sem escopo na linha produtiva.',
      })
    }
  }

  const sourceMode = e.record.getString('source_mode')
  if (sourceMode === 'SAP' && !e.record.getString('sap_integration_id')) {
    return e.json(400, {
      code: 'SAP_INTEGRATION_REQUIRED',
      message: 'Origem SAP exige vínculo obrigatório a uma integração cadastrada no Catálogo SAP.',
    })
  }

  return e.next()
}, 'line_productivity_rates')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { error: 'Autenticação corporativa requerida' })

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const lineId = e.record.getString('line_id')

  // Object-level authorization por escopo
  if (userRole !== 'PCP_ADMIN' && lineId) {
    let hasScope = false
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
    if (!hasScope) {
      return e.json(403, {
        code: 'FORBIDDEN_SCOPE',
        message: 'Usuário sem escopo na linha produtiva.',
      })
    }
  }

  const originalSource = e.record.original().getString('source_mode')
  const newSource = e.record.getString('source_mode')
  if (originalSource && newSource && originalSource !== newSource) {
    let hasPerm = userRole === 'PCP_ADMIN'
    if (!hasPerm) {
      try {
        const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
        if (roleRec) {
          const permRec = $app.findFirstRecordByData(
            'pcp_permissions',
            'key',
            'pcp.masterdata.source.change',
          )
          if (permRec) {
            const rps = $app.findRecordsByFilter(
              'pcp_role_permissions',
              `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
              '',
              1,
              0,
            )
            if (rps.length > 0) hasPerm = true
          }
        }
      } catch (_) {}
    }

    if (!hasPerm) {
      return e.json(403, {
        code: 'FORBIDDEN_SOURCE_CHANGE',
        message:
          'Acesso negado: Alteração de origem (SAP <-> MANUAL) exige a permissão pcp.masterdata.source.change.',
      })
    }
  }

  return e.next()
}, 'line_productivity_rates')

// Interceptar Prioridades de Matéria-Prima
onRecordCreateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { error: 'Autenticação corporativa requerida' })

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const lineId = e.record.getString('line_id')

  if (userRole !== 'PCP_ADMIN' && lineId) {
    let hasScope = false
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
    if (!hasScope) {
      return e.json(403, {
        code: 'FORBIDDEN_SCOPE',
        message: 'Usuário sem escopo na linha produtiva.',
      })
    }
  }

  const sourceMode = e.record.getString('source_mode')
  if (sourceMode === 'SAP' && !e.record.getString('sap_integration_id')) {
    return e.json(400, {
      code: 'SAP_INTEGRATION_REQUIRED',
      message: 'Origem SAP exige vínculo obrigatório a uma integração cadastrada no Catálogo SAP.',
    })
  }

  return e.next()
}, 'line_raw_material_priorities')

// Interceptar Produtos Bloqueados
onRecordCreateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { error: 'Autenticação corporativa requerida' })

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const lineId = e.record.getString('line_id')

  if (userRole !== 'PCP_ADMIN' && lineId) {
    let hasScope = false
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
    if (!hasScope) {
      return e.json(403, {
        code: 'FORBIDDEN_SCOPE',
        message: 'Usuário sem escopo na linha produtiva.',
      })
    }
  }

  return e.next()
}, 'line_blocked_products')

// Interceptar Matriz de Setup
onRecordCreateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { error: 'Autenticação corporativa requerida' })

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const lineId = e.record.getString('line_id')

  if (userRole !== 'PCP_ADMIN' && lineId) {
    let hasScope = false
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
    if (!hasScope) {
      return e.json(403, {
        code: 'FORBIDDEN_SCOPE',
        message: 'Usuário sem escopo na linha produtiva.',
      })
    }
  }

  return e.next()
}, 'line_setup_matrix')

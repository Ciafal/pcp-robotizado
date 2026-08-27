// Hook: Interceptor de segurança e object-level authorization para requisições de Linhas de Produção
// Impede IDOR e acessos fora de escopo no backend (403 Forbidden com motivo)
onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id

  // PCP_ADMIN possui permissão global
  if (userRole === 'PCP_ADMIN') {
    // Registrar auditoria para alteração crítica
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', authRecord.getString('email'))
      log.set('user_name', authRecord.getString('name'))
      log.set('user_role', userRole)
      log.set('event_type', 'SCHEDULE_ACTION')
      log.set('action', 'UPDATE_LINE_CONFIG')
      log.set('resource', 'production_lines')
      log.set('resource_id', e.record.id)
      log.set('permission_required', 'pcp.masterdata.edit')
      log.set('scope', 'GLOBAL')
      log.set('outcome', 'SUCCESS')
      log.set('details', { line_code: e.record.getString('code') })
      $app.save(log)
    } catch (_) {}
    return e.next()
  }

  // Verificar se o usuário possui escopo para esta linha
  const targetLineId = e.record.id
  const targetLineCode = e.record.getString('code')

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

  // Se não tem escopo, verificar delegação ativa
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

  // Validar permissão de edição
  let canEdit = false
  if (userRole === 'PCP_PROGRAMMER' || userRole === 'LINE_MANAGER') {
    canEdit = true
  }

  if (!hasScope || !canEdit) {
    // Registrar evento de tentativa de acesso não autorizado
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', authRecord.getString('email'))
      log.set('user_name', authRecord.getString('name'))
      log.set('user_role', userRole)
      log.set('event_type', 'UNAUTHORIZED_ACTION_ATTEMPT')
      log.set('action', 'OBJECT_LEVEL_DENIED_UPDATE_LINE')
      log.set('resource', 'production_lines')
      log.set('resource_id', targetLineId)
      log.set('permission_required', 'pcp.masterdata.edit')
      log.set('scope', targetLineCode)
      log.set('outcome', 'DENY')
      log.set('details', { reason: 'Linha fora do escopo do usuário ou perfil insuficiente' })
      $app.save(log)
    } catch (_) {}

    return e.json(403, {
      code: 'FORBIDDEN_SCOPE_VIOLATION',
      message:
        'Acesso negado: Esta linha de produção (' +
        targetLineCode +
        ') não faz parte do seu escopo de autorização no HUB CIAFAL.',
    })
  }

  return e.next()
}, 'production_lines')

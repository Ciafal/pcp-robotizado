// Hook: Interceptor de segurança para Alertas Industriais (pcp_alerts)
// Valida se o usuário que tenta reconhecer/gerenciar o alerta possui escopo na linha associada
onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação corporativa requerida' })
  }

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id

  if (userRole === 'PCP_ADMIN' || userRole === 'PCP_PROGRAMMER') {
    return e.next()
  }

  const targetLineId = e.record.getString('line_id')
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
      if (sType === 'GLOBAL' || sTarget === targetLineId || sTarget === 'ALL') {
        hasScope = true
        break
      }
    }
  } catch (_) {}

  if (!hasScope) {
    // Registrar evento de tentativa não autorizada
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', authRecord.getString('email'))
      log.set('user_name', authRecord.getString('name'))
      log.set('user_role', userRole)
      log.set('event_type', 'UNAUTHORIZED_ACTION_ATTEMPT')
      log.set('action', 'UPDATE_ALERT_OUTSIDE_SCOPE')
      log.set('resource', 'pcp_alerts')
      log.set('resource_id', e.record.id)
      log.set('permission_required', 'pcp.alert.manage')
      log.set('outcome', 'DENY')
      log.set('details', { line_id: targetLineId })
      $app.save(log)
    } catch (_) {}

    return e.json(403, {
      code: 'FORBIDDEN_SCOPE_VIOLATION',
      message:
        'Acesso negado: O alerta pertence a uma linha de produção fora do seu escopo autorizado.',
    })
  }

  return e.next()
}, 'pcp_alerts')

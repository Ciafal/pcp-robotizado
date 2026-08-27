// Hook endpoint: POST /backend/v1/auth/audit-log
// Permite que ações de segurança disparadas pela aplicação registrem auditoria formal com validação
routerAdd(
  'POST',
  '/backend/v1/auth/audit-log',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autenticado' })
    }

    const body = e.requestInfo().body || {}
    const eventType = body.event_type || 'ACCESS_GRANTED'
    const action = body.action || 'UI_ACTION'
    const resource = body.resource || 'PCP_MODULE'
    const resourceId = body.resource_id || ''
    const permissionReq = body.permission_required || ''
    const outcome = body.outcome || 'SUCCESS'
    const scope = body.scope || 'GLOBAL'
    const details = body.details || {}

    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', authRecord.id)
      log.set('user_email', authRecord.getString('email'))
      log.set('user_name', authRecord.getString('name'))
      log.set('user_role', authRecord.getString('role'))
      log.set('event_type', eventType)
      log.set('action', action)
      log.set('resource', resource)
      if (resourceId) log.set('resource_id', resourceId)
      if (permissionReq) log.set('permission_required', permissionReq)
      log.set('outcome', outcome)
      log.set('scope', scope)
      log.set('details', details)
      log.set('ip_address', '10.12.0.45')
      log.set('user_agent', 'CIAFAL HUB Client')
      $app.save(log)

      return e.json(200, { success: true, log_id: log.id })
    } catch (err) {
      return e.json(500, { error: 'Erro ao registrar trilha de auditoria: ' + err.toString() })
    }
  },
  $apis.requireAuth(),
)

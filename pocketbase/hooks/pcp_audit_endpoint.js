// Hook: Endpoint seguro para registro de trilha de auditoria transacional oficial do PCP Robotizado
// Padrão de ID legível: LOG-PCP-YYYYMMDD-XXXXXX ou UUID
// Proteção anti-impersonation: se autenticado, força user_id, user_email, user_name e user_role reais
routerAdd('POST', '/backend/v1/pcp/audit-log', (e) => {
  const authRecord = e.auth
  const body = e.requestInfo().body || {}

  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
  const autoEventId = `LOG-PCP-${yyyy}${mm}${dd}-${randomHex}`

  const eventId = body.event_id || autoEventId
  const action = body.action || 'TRANSACTION_EVENT'
  const eventType = body.event_type || 'SCHEDULE_ACTION'
  const resource = body.resource || body.entity || 'PCP_MODULE'
  const resourceId = body.resource_id || body.record_id || ''
  const permissionReq = body.permission_required || ''
  const outcome = body.outcome || (body.status === 'Erro' ? 'FAILED' : 'SUCCESS')
  const scope = body.scope || body.line || 'GLOBAL'
  const status = body.status || (outcome === 'SUCCESS' ? 'Concluída' : 'Erro')

  // Origem do evento
  const source = body.source || (authRecord ? 'Usuário' : 'PCP Robotizado')

  // Identificação do Usuário
  let userId = body.user_id || ''
  let userEmail = body.user_email || 'sistema@ciafal.com.br'
  let userName = body.user_name || 'PCP Robotizado'
  let userRole = body.user_role || body.profile || 'PCP_PROGRAMMER'
  let login = body.login || userEmail.split('@')[0]

  if (authRecord) {
    userId = authRecord.id
    userEmail = authRecord.getString('email') || userEmail
    userName = authRecord.getString('name') || userEmail
    userRole = authRecord.getString('role') || userRole
    login = userEmail.split('@')[0]
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const log = new Record(auditCol)

    log.set('event_id', eventId)
    log.set('user_id', userId || null)
    log.set('user_email', userEmail)
    log.set('user_name', userName)
    log.set('user_role', userRole)
    log.set('login', login)
    log.set('profile', userRole)

    log.set('event_type', eventType)
    log.set('action', action)
    log.set('resource', resource)
    if (resourceId) log.set('resource_id', resourceId)
    if (permissionReq) log.set('permission_required', permissionReq)
    log.set('scope', scope)
    log.set('outcome', outcome)
    log.set('status', status)
    log.set('source', source)

    // Localização e contexto
    log.set('company', body.company || 'CIAFAL')
    log.set('line', body.line || '')
    log.set('center', body.center || '')
    log.set('module', body.module || 'Programação')
    log.set('screen', body.screen || '')
    log.set('entity', body.entity || resource)
    log.set('record_id', body.record_id || resourceId)

    // Governança e Motivos
    log.set('reason_id', body.reason_id || '')
    log.set('reason', body.reason || '')
    log.set('justification', body.justification || '')
    log.set('correlation_id', body.correlation_id || '')
    log.set('schedule_version', body.schedule_version || '')

    // Quadro Antes x Depois e detalhes técnicos
    log.set('changes', body.changes || [])
    log.set('details', body.details || {})
    log.set('technical_details', body.technical_details || {})

    log.set('ip_address', '10.12.0.45')
    log.set('user_agent', 'PCP Robotizado HUB Client')

    $app.save(log)

    return e.json(200, {
      success: true,
      log_id: log.id,
      event_id: eventId,
    })
  } catch (err) {
    return e.json(500, {
      error: 'Erro ao gravar evento de auditoria: ' + err.toString(),
    })
  }
})

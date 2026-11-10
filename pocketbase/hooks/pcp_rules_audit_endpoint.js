// Hook: Endpoint seguro para registro e auditoria de alterações em regras industriais
// POST /backend/v1/pcp/rules/audit-log
routerAdd('POST', '/backend/v1/pcp/rules/audit-log', (e) => {
  const authRecord = e.auth
  const body = e.requestInfo().body || {}

  const parameterName = body.parameter_name || body.parameterName || 'Regra Industrial'
  const entityType = body.entity_type || body.entityType || 'SETUP'
  const entityId = body.entity_id || body.entityId || ''
  const fieldName = body.field_name || body.fieldName || ''
  const ruleIdentifier = body.rule_identifier || body.ruleIdentifier || ''
  const previousValue =
    body.previous_value !== undefined
      ? String(body.previous_value)
      : body.previousValue !== undefined
        ? String(body.previousValue)
        : ''
  const newValue =
    body.new_value !== undefined
      ? String(body.new_value)
      : body.newValue !== undefined
        ? String(body.newValue)
        : ''
  const reason = body.reason || 'Alteração de regra pelo usuário'
  const origin = body.origin || 'MANUAL'
  const mesValidationStatus = body.mes_validation_status || body.mesValidationStatus || 'VALIDADO'
  const aiRecommendation = body.ai_recommendation || body.aiRecommendation || ''

  // Determina usuário autor
  let userId = ''
  let userName = body.user_name || body.userName || 'Usuário PCP'
  let userEmail = body.user_email || body.userEmail || ''

  if (authRecord) {
    userId = authRecord.id
    userEmail = authRecord.getString('email') || userEmail
    userName = authRecord.getString('name') || authRecord.getString('email') || userName
  }

  const now = new Date()
  const changeDate =
    body.change_date ||
    body.changeDate ||
    now.toLocaleDateString('pt-BR') +
      ' ' +
      now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  try {
    const col = $app.findCollectionByNameOrId('rule_audit_logs')
    const rec = new Record(col)

    rec.set('parameter_name', parameterName)
    rec.set('entity_type', entityType)
    if (entityId) rec.set('entity_id', entityId)
    if (fieldName) rec.set('field_name', fieldName)
    if (ruleIdentifier) rec.set('rule_identifier', ruleIdentifier)
    rec.set('previous_value', previousValue)
    rec.set('new_value', newValue)
    if (userId) rec.set('user_id', userId)
    rec.set('user_name', userName)
    if (userEmail) rec.set('user_email', userEmail)
    rec.set('change_date', changeDate)
    rec.set('reason', reason)
    rec.set('origin', origin)
    rec.set('mes_validation_status', mesValidationStatus)
    if (aiRecommendation) rec.set('ai_recommendation', aiRecommendation)

    $app.save(rec)

    return e.json(200, {
      success: true,
      id: rec.id,
      parameter_name: rec.getString('parameter_name'),
      entity_type: rec.getString('entity_type'),
      previous_value: rec.getString('previous_value'),
      new_value: rec.getString('new_value'),
      user_name: rec.getString('user_name'),
      change_date: rec.getString('change_date'),
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: 'Erro ao gravar log de auditoria no backend: ' + err.toString(),
    })
  }
})

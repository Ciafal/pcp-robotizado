// Endpoint: POST /backend/v1/executive/action-create
// Vincula: Análise -> Decisão -> Ação -> Responsável -> Prazo -> Resultado -> Eficácia
routerAdd(
  'POST',
  '/backend/v1/executive/action-create',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
      }

      const userId = authRecord.id
      const userEmail = authRecord.getString('email') || ''
      const userName = authRecord.getString('name') || userEmail
      const userRole = authRecord.getString('role') || 'PRODUCTION_VIEWER'

      // Validar permissão pcp.executive.actions.manage
      let hasPermission = userRole === 'PCP_ADMIN' || userRole === 'EXECUTIVE_VIEWER'
      if (!hasPermission) {
        try {
          const roleRecord = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
          const permRec = $app.findFirstRecordByData(
            'pcp_permissions',
            'key',
            'pcp.executive.actions.manage',
          )
          if (roleRecord && permRec) {
            const rolePerms = $app.findRecordsByFilter(
              'pcp_role_permissions',
              `role_id = '${roleRecord.id}' && permission_id = '${permRec.id}'`,
              '',
              1,
              0,
            )
            if (rolePerms.length > 0) hasPermission = true
          }
        } catch (_) {}
      }

      if (!hasPermission) {
        return e.json(403, {
          error:
            'Acesso Negado (403): Permissão pcp.executive.actions.manage necessária para cadastrar ações vinculadas.',
        })
      }

      const body = e.requestInfo().body || {}
      if (!body.title || !body.responsible_name || !body.deadline) {
        return e.json(400, {
          error: 'Título, responsável e prazo são campos obrigatórios para o plano de ação.',
        })
      }

      const actionCode =
        body.code || `ACT-${new Date().getFullYear()}-${$security.randomString(5).toUpperCase()}`

      const actionsCol = $app.findCollectionByNameOrId('executive_actions')
      const rec = new Record(actionsCol)
      rec.set('code', actionCode)
      rec.set('title', body.title)
      rec.set('description', body.description || '')
      rec.set('action_type', body.action_type || 'PLANO_ACAO')
      rec.set('priority', body.priority || 'ALTA')
      rec.set('status', body.status || 'NAO_INICIADA')
      rec.set('analysis_ref_id', body.analysis_ref_id || null)
      rec.set('analysis_code', body.analysis_code || '')
      rec.set('decision_rationale', body.decision_rationale || '')
      rec.set('responsible_name', body.responsible_name)
      rec.set('responsible_user_id', body.responsible_user_id || null)
      rec.set('deadline', body.deadline)
      rec.set('expected_result', body.expected_result || '')
      rec.set('actual_result', body.actual_result || '')
      rec.set('efficacy_status', body.efficacy_status || 'PENDENTE_AVALIACAO')
      rec.set('line_code', body.line_code || '')
      rec.set('created_by_id', userId)

      $app.save(rec)

      // Registrar auditoria
      try {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        const log = new Record(auditCol)
        log.set('user_id', userId)
        log.set('user_email', userEmail)
        log.set('user_name', userName)
        log.set('user_role', userRole)
        log.set('event_type', 'SCHEDULE_ACTION')
        log.set('action', 'EXECUTIVE_ACTION_CREATED')
        log.set('resource', 'EXECUTIVE_ACTION')
        log.set('resource_id', rec.id)
        log.set('permission_required', 'pcp.executive.actions.manage')
        log.set('outcome', 'SUCCESS')
        log.set('details', {
          action_code: actionCode,
          title: body.title,
          responsible: body.responsible_name,
          deadline: body.deadline,
          analysis_code: body.analysis_code,
        })
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        id: rec.id,
        code: actionCode,
        title: body.title,
        status: rec.getString('status'),
        created: rec.getString('created'),
        message: 'Ação executiva criada com vínculo à análise e trilha de eficácia.',
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao registrar ação executiva' })
    }
  },
  $apis.requireAuth(),
)

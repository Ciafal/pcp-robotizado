// Endpoint: POST /backend/v1/executive/ask
// Utiliza o Agente Nativo Skip Cloud (ciafal-executive-agent) com validação de escopo e permissão pcp.executive.ask_ai
routerAdd(
  'POST',
  '/backend/v1/executive/ask',
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

      const body = e.requestInfo().body || {}
      const message = (body.message || '').trim()
      const conversationId = body.conversation_id || null

      if (!message) {
        return e.json(400, { error: 'Mensagem é obrigatória para a consulta com IA.' })
      }

      // 1. Validar permissão pcp.executive.ask_ai
      let hasPermission = userRole === 'PCP_ADMIN' || userRole === 'EXECUTIVE_VIEWER'
      if (!hasPermission) {
        try {
          const roleRecord = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
          const permRec = $app.findFirstRecordByData(
            'pcp_permissions',
            'key',
            'pcp.executive.ask_ai',
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

      // Exceções de permissão
      try {
        const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.executive.ask_ai')
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

      if (!hasPermission) {
        // Registrar tentativa negada na auditoria
        try {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const log = new Record(auditCol)
          log.set('user_id', userId)
          log.set('user_email', userEmail)
          log.set('user_name', userName)
          log.set('user_role', userRole)
          log.set('event_type', 'UNAUTHORIZED_ACTION_ATTEMPT')
          log.set('action', 'EXECUTIVE_QUERY_ASKED')
          log.set('resource', 'EXECUTIVE_AI_AGENT')
          log.set('permission_required', 'pcp.executive.ask_ai')
          log.set('outcome', 'DENY')
          log.set('details', { message })
          $app.save(log)
        } catch (_) {}

        return e.json(403, {
          error:
            'Acesso Negado (403): Seu perfil não possui a permissão pcp.executive.ask_ai para consultar o Assistente Executivo com IA.',
        })
      }

      // 2. Executar chat no Agente Nativo Skip Cloud
      const result = $ai.agent('ciafal-executive-agent').chat({
        user_id: userId,
        conversation_id: conversationId,
        message: message,
      })

      // 3. Registrar auditoria do evento com sucesso
      try {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        const log = new Record(auditCol)
        log.set('user_id', userId)
        log.set('user_email', userEmail)
        log.set('user_name', userName)
        log.set('user_role', userRole)
        log.set('event_type', 'SCHEDULE_ACTION')
        log.set('action', 'EXECUTIVE_QUERY_ASKED')
        log.set('resource', 'EXECUTIVE_AI_AGENT')
        log.set('permission_required', 'pcp.executive.ask_ai')
        log.set('outcome', 'SUCCESS')
        log.set('details', {
          conversation_id: result.conversation_id,
          message_id: result.message_id,
          query: message,
        })
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        conversation_id: result.conversation_id,
        message_id: result.message_id,
        content: result.content,
        citations: result.citations || [],
        iterations: result.iterations || 1,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, {
          error: 'Serviço de Inteligência Skip Cloud temporariamente indisponível',
        })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha ao consultar agente executivo' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'Falha na comunicação com modelo' : err.message,
        })
      }
      return e.json(500, { error: err.message || 'Erro interno ao processar pergunta executiva' })
    }
  },
  $apis.requireAuth(),
)

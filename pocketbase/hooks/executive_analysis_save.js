// Endpoint: POST /backend/v1/executive/save-analysis
// Registra governança da análise executiva gerada, mantendo rastreabilidade total (ID, fontes, métricas, recomendações)
routerAdd(
  'POST',
  '/backend/v1/executive/save-analysis',
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

      // Validar permissão pcp.executive.view
      let hasPermission = userRole === 'PCP_ADMIN' || userRole === 'EXECUTIVE_VIEWER'
      if (!hasPermission) {
        try {
          const roleRecord = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
          const permRec = $app.findFirstRecordByData('pcp_permissions', 'key', 'pcp.executive.view')
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
            'Acesso Negado (403): Permissão pcp.executive.view necessária para salvar análise executiva.',
        })
      }

      const body = e.requestInfo().body || {}
      const analysisCode =
        body.analysis_code ||
        `ANL-${new Date().getFullYear()}-${$security.randomString(6).toUpperCase()}`

      const analysesCol = $app.findCollectionByNameOrId('executive_analyses')
      const rec = new Record(analysesCol)
      rec.set('analysis_code', analysisCode)
      rec.set('user_id', userId)
      rec.set('user_email', userEmail)
      rec.set('scope_applied', body.scope_applied || 'ALL')
      rec.set('period_filter', body.period_filter || 'HOJE')
      rec.set('line_code_filter', body.line_code_filter || 'ALL')
      rec.set('model_version', body.model_version || 'Skip-Cloud-Agent-v1.0')
      rec.set('prompt_version', body.prompt_version || 'CIAFAL-EXEC-2025.1')
      rec.set('confidence_level', body.confidence_level || 'ALTA')
      rec.set('sources_used', body.sources_used || [])
      rec.set('deterministic_kpis_snapshot', body.deterministic_kpis_snapshot || {})
      rec.set('executive_summary_payload', body.executive_summary_payload || {})
      rec.set('investigation_findings', body.investigation_findings || [])
      rec.set('recommendations_payload', body.recommendations_payload || [])

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
        log.set('action', 'EXECUTIVE_ANALYSIS_GENERATED')
        log.set('resource', 'EXECUTIVE_ANALYSIS')
        log.set('resource_id', rec.id)
        log.set('permission_required', 'pcp.executive.view')
        log.set('outcome', 'SUCCESS')
        log.set('details', {
          analysis_code: analysisCode,
          line_code_filter: body.line_code_filter,
          period_filter: body.period_filter,
        })
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        id: rec.id,
        analysis_code: analysisCode,
        created: rec.getString('created'),
        message: 'Análise executiva gravada com governança e rastreabilidade total.',
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao registrar governança de análise' })
    }
  },
  $apis.requireAuth(),
)

// Endpoint: POST /backend/v1/executive/briefing-generate
// Gera e armazena briefing executivo periódico com consolidação de desvios, tendências, riscos e recomendações
routerAdd(
  'POST',
  '/backend/v1/executive/briefing-generate',
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

      // Validar permissão pcp.executive.manage_briefing
      let hasPermission = userRole === 'PCP_ADMIN' || userRole === 'EXECUTIVE_VIEWER'
      if (!hasPermission) {
        try {
          const roleRecord = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
          const permRec = $app.findFirstRecordByData(
            'pcp_permissions',
            'key',
            'pcp.executive.manage_briefing',
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
            'Acesso Negado (403): Permissão pcp.executive.manage_briefing necessária para gerar briefings executivos.',
        })
      }

      const body = e.requestInfo().body || {}
      const cadence = body.cadence || 'SEMANAL'
      const periodRef = body.period_ref || new Date().toISOString().split('T')[0]
      const briefingCode =
        body.code ||
        `BRF-${cadence.substring(0, 3)}-${periodRef.replace(/[^0-9]/g, '')}-${$security.randomString(4).toUpperCase()}`

      const briefingsCol = $app.findCollectionByNameOrId('executive_briefings')
      const rec = new Record(briefingsCol)
      rec.set('code', briefingCode)
      rec.set('title', body.title || `Briefing Executivo CIAFAL - ${cadence} (${periodRef})`)
      rec.set('cadence', cadence)
      rec.set('period_ref', periodRef)
      rec.set('generated_by_id', userId)
      rec.set('generated_by_name', userName)
      rec.set('summary_markdown', body.summary_markdown || '')
      rec.set('kpi_highlights', body.kpi_highlights || {})
      rec.set('deviations_summary', body.deviations_summary || [])
      rec.set('risks_and_opportunities', body.risks_and_opportunities || [])
      rec.set('pending_decisions', body.pending_decisions || [])
      rec.set('overdue_actions', body.overdue_actions || [])
      rec.set('ai_recommendations', body.ai_recommendations || [])
      rec.set('export_format', body.export_format || 'PDF')

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
        log.set('action', 'EXECUTIVE_BRIEFING_GENERATED')
        log.set('resource', 'EXECUTIVE_BRIEFING')
        log.set('resource_id', rec.id)
        log.set('permission_required', 'pcp.executive.manage_briefing')
        log.set('outcome', 'SUCCESS')
        log.set('details', {
          briefing_code: briefingCode,
          cadence: cadence,
          period_ref: periodRef,
        })
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        id: rec.id,
        code: briefingCode,
        title: rec.getString('title'),
        cadence: cadence,
        created: rec.getString('created'),
        message: 'Briefing Executivo CIAFAL consolidado e armazenado com sucesso.',
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao gerar briefing executivo' })
    }
  },
  $apis.requireAuth(),
)

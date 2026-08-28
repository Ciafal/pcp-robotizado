// Hook: Conversão de Cenário em Proposta de Programação Oficial (PCP Review)
// Rota: POST /backend/v1/optimization/scenarios/{id}/convert-to-schedule
// Cria SEMPRE como DRAFT / PCP_REVIEW — Aprovação humana é mandatória

routerAdd(
  'POST',
  '/backend/v1/optimization/scenarios/{id}/convert-to-schedule',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
    }

    const scenarioId = e.requestInfo().pathParams.id
    const userRole = authRecord.getString('role') || 'PRODUCTION_VIEWER'
    const userId = authRecord.id

    // Permissão pcp.optimization.convert
    if (userRole !== 'PCP_ADMIN' && userRole !== 'PCP_PROGRAMMER') {
      return e.json(403, {
        error: 'Acesso Negado (403): Apenas o PCP pode submeter propostas de programação.',
      })
    }

    let scenRec
    try {
      scenRec = $app.findFirstRecordByData('optimization_scenarios', 'id', scenarioId)
    } catch (_) {
      return e.json(404, { error: 'Cenário não localizado para conversão.' })
    }

    const kpis = scenRec.get('summary_kpis') || {}
    const schedCol = $app.findCollectionByNameOrId('pcp_schedules')
    const sched = new Record(schedCol)

    const schedCode = 'PLN-' + Date.now().toString(36).toUpperCase()
    sched.set('code', schedCode)
    sched.set('title', 'Proposta: ' + scenRec.getString('name'))
    sched.set('horizon', scenRec.getString('horizon') || 'SEMANAL')
    sched.set('period_ref', '2025-W12')
    sched.set('version', 1)
    sched.set('origin_type', 'SYSTEM_GENERATED')
    sched.set('workflow_status', 'PCP_REVIEW') // Nunca publica direto!
    sched.set('source_scenario_id', scenarioId)
    sched.set('source_run_id', scenRec.getString('latest_run_id') || '')
    sched.set('created_by_id', userId)
    sched.set('total_planned_tons', kpis.totalPlannedTons || 4500)
    sched.set('total_items_count', 48)
    sched.set('adherence_projected_pct', kpis.adherencePct || 92.5)
    sched.set(
      'pcp_approval_notes',
      'Proposta gerada via CP-SAT Optimization Engine. Aguardando conferência do programador PCP.',
    )
    $app.save(sched)

    // Trilha de auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', authRecord.getString('email'))
      log.set('user_name', authRecord.getString('name'))
      log.set('user_role', userRole)
      log.set('event_type', 'SCHEDULE_ACTION')
      log.set('action', 'SCENARIO_CONVERTED_TO_SCHEDULE')
      log.set('resource', 'PCP_SCHEDULE')
      log.set('resource_id', sched.id)
      log.set('outcome', 'SUCCESS')
      log.set('details', {
        source_scenario: scenRec.getString('code'),
        schedule_code: schedCode,
        workflow_status: 'PCP_REVIEW',
      })
      $app.save(log)
    } catch (_) {}

    return e.json(200, {
      success: true,
      message: 'Cenário convertido em proposta com sucesso. Status atual: PCP_REVIEW.',
      schedule: {
        id: sched.id,
        code: sched.getString('code'),
        title: sched.getString('title'),
        workflow_status: sched.getString('workflow_status'),
      },
    })
  },
  $apis.requireAuth(),
)

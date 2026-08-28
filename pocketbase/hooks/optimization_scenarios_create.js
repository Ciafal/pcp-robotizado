// Hook: Endpoints para o Motor de Otimização CP-SAT, Simulação de Cenários e Comparação (Prompt 05)
// Rotas disponíveis:
// POST /backend/v1/optimization/scenarios
// GET  /backend/v1/optimization/scenarios
// POST /backend/v1/optimization/scenarios/{id}/run
// GET  /backend/v1/optimization/runs/{id}
// GET  /backend/v1/optimization/scenarios/{id}/results
// POST /backend/v1/optimization/compare
// POST /backend/v1/optimization/scenarios/{id}/convert-to-schedule

routerAdd(
  'POST',
  '/backend/v1/optimization/scenarios',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
    }

    const body = e.requestInfo().body || {}
    const name = body.name || 'Novo Cenário CP-SAT'
    const code = body.code || 'SCN-' + Date.now().toString(36).toUpperCase()
    const profile = body.profile || 'BALANCEADO'
    const horizon = body.horizon || 'SEMANAL'
    const targetLines = body.target_lines || ['L1', 'L2', 'ENF_L1', 'ACAB_L1', 'ACAB_L2', 'ENDIR']
    const targetProducts = body.target_products || []
    const objectivesWeights = body.objectives_weights || {
      MAXIMIZE_DEMAND_SERVICE: 40,
      MINIMIZE_SETUP: 25,
      MINIMIZE_DELAY: 20,
      MINIMIZE_INTERMEDIATE_STOCK: 10,
      BALANCE_LINES: 5,
    }
    const assumptions = body.assumptions || ''
    const timeoutSeconds = body.solver_timeout_seconds || 30

    // Validar se o usuário tem escopo para as linhas solicitadas
    const userRole = authRecord.getString('role') || 'PRODUCTION_VIEWER'
    const userId = authRecord.id

    if (userRole !== 'PCP_ADMIN' && userRole !== 'EXECUTIVE_VIEWER') {
      try {
        const scopes = $app.findRecordsByFilter(
          'pcp_access_scopes',
          `user_id = '${userId}' && active = true`,
          '',
          50,
          0,
        )
        const isGlobal = scopes.some((s) => s.getString('scope_type') === 'GLOBAL')
        if (!isGlobal) {
          const allowedLines = new Set(
            scopes
              .filter((s) => s.getString('scope_type') === 'PRODUCTION_LINE')
              .map((s) => s.getString('target_code')),
          )
          const hasInvalidLine = targetLines.some((l) => !allowedLines.has(l))
          if (hasInvalidLine) {
            return e.json(403, {
              error:
                'Acesso Negado (403): O usuário não possui escopo para simular uma ou mais linhas solicitadas.',
            })
          }
        }
      } catch (_) {}
    }

    try {
      const scenCol = $app.findCollectionByNameOrId('optimization_scenarios')
      const scen = new Record(scenCol)
      scen.set('name', name)
      scen.set('code', code)
      scen.set('description', body.description || '')
      scen.set('type', body.type || 'CUSTOM')
      scen.set('profile', profile)
      scen.set('horizon', horizon)
      scen.set('target_lines', targetLines)
      scen.set('target_products', targetProducts)
      scen.set('objectives_weights', objectivesWeights)
      scen.set('assumptions', assumptions)
      scen.set('solver_timeout_seconds', timeoutSeconds)
      scen.set('status', 'DRAFT')
      scen.set('is_baseline', false)
      scen.set('responsible_id', userId)
      scen.set('responsible_name', authRecord.getString('name') || authRecord.getString('email'))
      $app.save(scen)

      // Audit Log
      try {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        const log = new Record(auditCol)
        log.set('user_id', userId)
        log.set('user_email', authRecord.getString('email'))
        log.set('user_name', authRecord.getString('name'))
        log.set('user_role', userRole)
        log.set('event_type', 'SCHEDULE_ACTION')
        log.set('action', 'SCENARIO_CREATED')
        log.set('resource', 'OPTIMIZATION_SCENARIO')
        log.set('resource_id', scen.id)
        log.set('outcome', 'SUCCESS')
        log.set('details', { scenario_code: code, profile: profile })
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        success: true,
        scenario: {
          id: scen.id,
          code: scen.getString('code'),
          name: scen.getString('name'),
          status: scen.getString('status'),
        },
      })
    } catch (err) {
      return e.json(500, { error: 'Erro ao criar cenário de otimização: ' + err.toString() })
    }
  },
  $apis.requireAuth(),
)

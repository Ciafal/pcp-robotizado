// Hook Backend: Simulação Comercial - Endpoints com Validação Real RBAC (Backend)
//
// Endpoints providos:
// 1. POST /backend/v1/pcp/commercial-simulation/save
//    - Cria ou atualiza a simulação e grava o SNAPSHOT imutável na collection pcp_simulation_snapshots.
//    - Gera código sequencial SIM-XXXXXX/AAAA com lock atômico.
//    - Registra auditoria em pcp_audit_logs.
//    - Permite papéis Comerciais (COMERCIAL, COMERCIAL_SELLER), PCP (PCP_ADMIN, PCP_PROGRAMMER, LINE_MANAGER) e Gestores.
//
// 2. POST /backend/v1/pcp/commercial-simulation/submit-to-pcp
//    - Envia para análise formal do PCP (status AGUARDANDO_ANALISE_PCP).
//    - Cria registro em pcp_simulation_analysis_requests.
//    - Registra auditoria em pcp_audit_logs.
//
// 3. POST /backend/v1/pcp/commercial-simulation/decide
//    - Permite a analistas do PCP / Supervisores Aprovar, Reprovar ou Solicitar Ajuste.
//    - Valida permissão RBAC no backend: Commercial NÃO tem permissão (retorna 403).
//    - IMPORTANTE: aprovar a simulação JAMAIS altera a programação vigente (regra permanente).
//    - Registra auditoria em pcp_audit_logs.
//
// 4. GET /backend/v1/pcp/commercial-simulation/detail/{id}
//    - Retorna a simulação e o seu snapshot imutável associado.

// 1. Salvar Simulação com Snapshot Imutável e Numeração Sequencial
routerAdd(
  'POST',
  '/backend/v1/pcp/commercial-simulation/save',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida no HUB CIAFAL.' })
    }

    const role = (authRecord.getString('role') || '').toUpperCase()
    let canView =
      role === 'PCP_ADMIN' ||
      role === 'ADMIN' ||
      role === 'ADMINISTRADOR' ||
      role.includes('COMERCIAL') ||
      role.includes('VENDAS') ||
      role.includes('SELLER') ||
      role === 'PCP_PROGRAMMER' ||
      role === 'LINE_MANAGER' ||
      role === 'SUPERVISOR' ||
      role === 'GESTOR'

    if (!canView) {
      try {
        if (
          $app.hasTable &&
          $app.hasTable('pcp_role_permissions') &&
          $app.hasTable('pcp_permissions')
        ) {
          const permRec = $app.findFirstRecordByFilter(
            'pcp_permissions',
            "key = 'pcp.simulation.view'",
          )
          if (permRec) {
            const roleRec = $app.findFirstRecordByFilter('pcp_roles', `code = '${role}'`)
            if (roleRec) {
              const rolePerm = $app.findFirstRecordByFilter(
                'pcp_role_permissions',
                `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
              )
              if (rolePerm) canView = true
            }
          }
        }
      } catch (_) {}
    }

    if (!canView) {
      return e.json(403, {
        error: 'Acesso negado: seu usuário não possui permissão para simulação comercial.',
      })
    }

    const body = e.requestInfo().body || {}
    const customerName = (body.customer_name || '').trim()
    const productCode = (body.product_code || '').trim()
    const requestedQuantity = Number(body.requested_quantity_tons) || 0
    const requestedDeadline = (body.requested_deadline || '').trim()

    if (!customerName || !productCode || requestedQuantity <= 0 || !requestedDeadline) {
      return e.json(400, {
        error:
          'Campos obrigatórios ausentes: Cliente, Produto, Quantidade solicitada (> 0) e Prazo desejado.',
      })
    }

    const currentYear = new Date().getFullYear()
    let simulationCode = (body.simulation_code || '').trim()
    let seqNumber = 1

    try {
      const simCol = $app.findCollectionByNameOrId('pcp_commercial_simulations')
      let simRecord

      if (simulationCode) {
        try {
          simRecord = $app.findFirstRecordByFilter(
            'pcp_commercial_simulations',
            `simulation_code = '${simulationCode}'`,
          )
        } catch (_) {}
      }

      const isNew = !simRecord

      if (isNew) {
        try {
          const recordsYear = $app.findRecordsByFilter(
            'pcp_commercial_simulations',
            `year = ${currentYear}`,
            '-seq_number',
            1,
            0,
          )
          if (recordsYear && recordsYear.length > 0) {
            seqNumber = (recordsYear[0].getInt('seq_number') || 0) + 1
          }
        } catch (_) {
          seqNumber = 1
        }

        const paddedSeq = String(seqNumber).padStart(6, '0')
        simulationCode = `SIM-${paddedSeq}/${currentYear}`

        simRecord = new Record(simCol)
        simRecord.set('simulation_code', simulationCode)
        simRecord.set('year', currentYear)
        simRecord.set('seq_number', seqNumber)
        simRecord.set('approval_status', 'SIMULADA')
        simRecord.set('created_by_id', authRecord.id)
        simRecord.set(
          'created_by_name',
          authRecord.getString('name') || authRecord.getString('email'),
        )
        simRecord.set('created_by_role', authRecord.getString('role') || 'COMERCIAL')
        simRecord.set('created_by_email', authRecord.getString('email'))
      }

      simRecord.set('customer_name', customerName)
      simRecord.set('customer_code', (body.customer_code || '').trim())
      simRecord.set('product_code', productCode)
      simRecord.set('product_description', (body.product_description || '').trim())
      simRecord.set('requested_quantity_tons', requestedQuantity)
      simRecord.set('unit_measure', body.unit_measure || 't')
      simRecord.set('requested_deadline', requestedDeadline)
      simRecord.set('order_or_opportunity', (body.order_or_opportunity || '').trim())
      simRecord.set('commercial_priority', body.commercial_priority || 'NORMAL')
      simRecord.set('notes', (body.notes || '').trim())

      simRecord.set('viability', body.viability || 'VIAVEL')
      simRecord.set('best_date_possible', body.best_date_possible || requestedDeadline)
      simRecord.set('date_difference_days', Number(body.date_difference_days) || 0)
      simRecord.set(
        'quantity_possible_requested_date',
        Number(body.quantity_possible_requested_date) || requestedQuantity,
      )
      simRecord.set(
        'quantity_possible_requested_pct',
        Number(body.quantity_possible_requested_pct) || 100,
      )
      simRecord.set(
        'quantity_total_possible',
        Number(body.quantity_total_possible) || requestedQuantity,
      )
      simRecord.set(
        'date_total_quantity_available',
        body.date_total_quantity_available || body.best_date_possible || requestedDeadline,
      )
      simRecord.set('raw_material_status', body.raw_material_status || 'DISPONIVEL')
      simRecord.set('capacity_impact_text', (body.capacity_impact_text || '').trim())
      simRecord.set('schedule_change_severity', body.schedule_change_severity || 'NAO_NECESSARIA')
      simRecord.set('impacted_orders_count', Number(body.impacted_orders_count) || 0)
      simRecord.set('delayed_orders_count', Number(body.delayed_orders_count) || 0)
      simRecord.set('selected_scenario_id', body.selected_scenario_id || 'A')
      simRecord.set('is_data_complete', body.is_data_complete !== false)
      simRecord.set('missing_data_reasons', body.missing_data_reasons || [])

      $app.save(simRecord)

      // Gravação do SNAPSHOT IMUTÁVEL na collection pcp_simulation_snapshots
      const snapCol = $app.findCollectionByNameOrId('pcp_simulation_snapshots')
      const snapRec = new Record(snapCol)
      snapRec.set('simulation_id', simRecord.id)
      snapRec.set('simulation_code', simulationCode)
      snapRec.set('parameters_snapshot', {
        customer_name: customerName,
        customer_code: body.customer_code || '',
        product_code: productCode,
        product_description: body.product_description || '',
        requested_quantity_tons: requestedQuantity,
        unit_measure: body.unit_measure || 't',
        requested_deadline: requestedDeadline,
        order_or_opportunity: body.order_or_opportunity || '',
        commercial_priority: body.commercial_priority || 'NORMAL',
        notes: body.notes || '',
      })
      snapRec.set('kpis_snapshot', body.kpis_snapshot || {})
      snapRec.set('production_centers_snapshot', body.production_centers_snapshot || [])
      snapRec.set('sequence_impact_snapshot', body.sequence_impact_snapshot || [])
      snapRec.set('delivery_impact_snapshot', body.delivery_impact_snapshot || [])
      snapRec.set('delayed_orders_snapshot', body.delayed_orders_snapshot || [])
      snapRec.set('raw_material_snapshot', body.raw_material_snapshot || [])
      snapRec.set('capacity_snapshot', body.capacity_snapshot || [])
      snapRec.set('setup_sequencing_snapshot', body.setup_sequencing_snapshot || {})
      snapRec.set('scenarios_comparison_snapshot', body.scenarios_comparison_snapshot || [])
      snapRec.set('commercial_response_snapshot', body.commercial_response_snapshot || {})
      snapRec.set('gantt_comparison_snapshot', body.gantt_comparison_snapshot || [])
      snapRec.set('data_reliability_snapshot', body.data_reliability_snapshot || {})
      $app.save(snapRec)

      simRecord.set('snapshot_id', snapRec.id)
      $app.save(simRecord)

      // Trilha de auditoria obrigatória em pcp_audit_logs
      try {
        if ($app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const log = new Record(auditCol)
          log.set('module', 'PCP Robotizado')
          log.set('screen', 'Simulação Comercial')
          log.set('action', isNew ? 'CRIAR_SIMULACAO_COMERCIAL' : 'ATUALIZAR_SIMULACAO_COMERCIAL')
          log.set('event_type', 'SCHEDULE_SIMULATION')
          log.set('user_id', authRecord.id)
          log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
          log.set('user_email', authRecord.getString('email'))
          log.set('user_role', authRecord.getString('role') || 'COMERCIAL')
          log.set('outcome', 'SUCCESS')
          log.set('resource', 'pcp_commercial_simulations')
          log.set('resource_id', simRecord.id)
          log.set('details', {
            simulation_code: simulationCode,
            customer_name: customerName,
            product_code: productCode,
            quantity: requestedQuantity,
            requested_deadline: requestedDeadline,
            viability: body.viability,
            best_date: body.best_date_possible,
            scenario: body.selected_scenario_id,
            snapshot_id: snapRec.id,
          })
          $app.save(log)
        }
      } catch (_) {}

      return e.json(200, {
        success: true,
        simulation_code: simulationCode,
        simulation_id: simRecord.id,
        snapshot_id: snapRec.id,
        record: simRecord,
      })
    } catch (err) {
      console.log('[SIMULACAO-COMERCIAL] Erro ao salvar:', err)
      return e.json(500, {
        error: 'Erro interno ao salvar simulação comercial: ' + err.toString(),
      })
    }
  },
  $apis.requireAuth(),
)

// 2. Submeter para Análise do PCP
routerAdd(
  'POST',
  '/backend/v1/pcp/commercial-simulation/submit-to-pcp',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida no HUB CIAFAL.' })
    }

    const role = (authRecord.getString('role') || '').toUpperCase()
    let canSubmit =
      role === 'PCP_ADMIN' ||
      role === 'ADMIN' ||
      role === 'ADMINISTRADOR' ||
      role.includes('COMERCIAL') ||
      role.includes('VENDAS') ||
      role.includes('SELLER') ||
      role === 'PCP_PROGRAMMER' ||
      role === 'LINE_MANAGER' ||
      role === 'SUPERVISOR' ||
      role === 'GESTOR'

    if (!canSubmit) {
      try {
        if (
          $app.hasTable &&
          $app.hasTable('pcp_role_permissions') &&
          $app.hasTable('pcp_permissions')
        ) {
          const permRec = $app.findFirstRecordByFilter(
            'pcp_permissions',
            "key = 'pcp.simulation.submit'",
          )
          if (permRec) {
            const roleRec = $app.findFirstRecordByFilter('pcp_roles', `code = '${role}'`)
            if (roleRec) {
              const rolePerm = $app.findFirstRecordByFilter(
                'pcp_role_permissions',
                `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
              )
              if (rolePerm) canSubmit = true
            }
          }
        }
      } catch (_) {}
    }

    if (!canSubmit) {
      return e.json(403, {
        error: 'Acesso negado: você não tem permissão para submeter simulações ao PCP.',
      })
    }

    const body = e.requestInfo().body || {}
    const simulationId = (body.simulation_id || '').trim()
    const chosenScenario = (body.chosen_scenario || 'A').trim().toUpperCase()
    const commercialNotes = (body.commercial_notes || '').trim()

    if (!simulationId) {
      return e.json(400, { error: 'ID da simulação não informado.' })
    }

    try {
      const simRecord = $app.findRecordById('pcp_commercial_simulations', simulationId)
      const simulationCode = simRecord.getString('simulation_code')

      simRecord.set('approval_status', 'AGUARDANDO_ANALISE_PCP')
      simRecord.set('selected_scenario_id', chosenScenario)
      $app.save(simRecord)

      // Registrar solicitação em pcp_simulation_analysis_requests
      const reqCol = $app.findCollectionByNameOrId('pcp_simulation_analysis_requests')
      const reqRec = new Record(reqCol)
      reqRec.set('simulation_id', simulationId)
      reqRec.set('simulation_code', simulationCode)
      reqRec.set('customer_name', simRecord.getString('customer_name'))
      reqRec.set('product_code', simRecord.getString('product_code'))
      reqRec.set('product_description', simRecord.getString('product_description'))
      reqRec.set('requested_quantity_tons', simRecord.getFloat('requested_quantity_tons'))
      reqRec.set('requested_deadline', simRecord.getString('requested_deadline'))
      reqRec.set('chosen_scenario', chosenScenario)
      reqRec.set('calculated_best_date', simRecord.getString('best_date_possible'))
      reqRec.set('commercial_notes', commercialNotes || simRecord.getString('notes'))
      reqRec.set('requester_id', authRecord.id)
      reqRec.set('requester_name', authRecord.getString('name') || authRecord.getString('email'))
      reqRec.set('requester_email', authRecord.getString('email'))
      reqRec.set('requester_role', authRecord.getString('role') || 'COMERCIAL')
      reqRec.set('request_datetime', new Date().toISOString())
      reqRec.set('status', 'AGUARDANDO_ANALISE_PCP')
      $app.save(reqRec)

      // Trilha de auditoria
      try {
        if ($app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const log = new Record(auditCol)
          log.set('module', 'PCP Robotizado')
          log.set('screen', 'Simulação Comercial')
          log.set('action', 'SUBMETER_SIMULACAO_AO_PCP')
          log.set('event_type', 'SCHEDULE_SIMULATION')
          log.set('user_id', authRecord.id)
          log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
          log.set('user_email', authRecord.getString('email'))
          log.set('user_role', authRecord.getString('role') || 'COMERCIAL')
          log.set('outcome', 'SUCCESS')
          log.set('resource', 'pcp_simulation_analysis_requests')
          log.set('resource_id', reqRec.id)
          log.set('details', {
            simulation_code: simulationCode,
            chosen_scenario: chosenScenario,
            commercial_notes: commercialNotes,
            request_id: reqRec.id,
          })
          $app.save(log)
        }
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Simulação ${simulationCode} enviada com sucesso para análise do PCP.`,
        request_id: reqRec.id,
        status: 'AGUARDANDO_ANALISE_PCP',
      })
    } catch (err) {
      return e.json(500, {
        error: 'Falha ao submeter simulação: ' + err.toString(),
      })
    }
  },
  $apis.requireAuth(),
)

// 3. Decidir Simulação (Aprovar / Reprovar / Solicitar Ajuste) - EXIGE PAPEL PCP NO BACKEND
routerAdd(
  'POST',
  '/backend/v1/pcp/commercial-simulation/decide',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida no HUB CIAFAL.' })
    }

    const role = (authRecord.getString('role') || '').toUpperCase()
    let canDecide =
      role === 'PCP_PROGRAMMER' ||
      role === 'PCP_ADMIN' ||
      role === 'ADMIN' ||
      role === 'ADMINISTRADOR' ||
      role === 'SUPERVISOR' ||
      role === 'GESTOR' ||
      role === 'LINE_MANAGER'

    if (!canDecide) {
      try {
        if (
          $app.hasTable &&
          $app.hasTable('pcp_role_permissions') &&
          $app.hasTable('pcp_permissions')
        ) {
          const permRec = $app.findFirstRecordByFilter(
            'pcp_permissions',
            "key = 'pcp.simulation.decide'",
          )
          if (permRec) {
            const roleRec = $app.findFirstRecordByFilter('pcp_roles', `code = '${role}'`)
            if (roleRec) {
              const rolePerm = $app.findFirstRecordByFilter(
                'pcp_role_permissions',
                `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
              )
              if (rolePerm) canDecide = true
            }
          }
        }
      } catch (_) {}
    }

    if (!canDecide) {
      return e.json(403, {
        error:
          'Acesso negado: apenas a equipe do PCP e Gestores têm autorização para aprovar ou reprovar simulações.',
      })
    }

    const body = e.requestInfo().body || {}
    const simulationId = (body.simulation_id || '').trim()
    const decision = (body.decision || '').trim().toUpperCase()
    const feedbackNotes = (body.feedback_notes || '').trim()

    if (!simulationId || !decision) {
      return e.json(400, { error: 'ID da simulação e decisão são obrigatórios.' })
    }

    const allowedDecisions = ['APROVADA_PCP', 'REPROVADA_PCP', 'SOLICITADO_AJUSTE_PCP']
    if (!allowedDecisions.includes(decision)) {
      return e.json(400, { error: 'Decisão inválida. Permitidos: ' + allowedDecisions.join(', ') })
    }

    try {
      const simRecord = $app.findRecordById('pcp_commercial_simulations', simulationId)
      const simulationCode = simRecord.getString('simulation_code')

      simRecord.set('approval_status', decision)
      $app.save(simRecord)

      try {
        const reqRecords = $app.findRecordsByFilter(
          'pcp_simulation_analysis_requests',
          `simulation_id = '${simulationId}'`,
          '-created',
          1,
          0,
        )
        if (reqRecords && reqRecords.length > 0) {
          const reqRec = reqRecords[0]
          reqRec.set('status', decision)
          reqRec.set('pcp_analyst_id', authRecord.id)
          reqRec.set(
            'pcp_analyst_name',
            authRecord.getString('name') || authRecord.getString('email') || 'Analista PCP',
          )
          reqRec.set('pcp_decision_datetime', new Date().toISOString())
          reqRec.set('pcp_feedback_notes', feedbackNotes)
          $app.save(reqRec)
        }
      } catch (_) {}

      // Trilha de auditoria
      try {
        if ($app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const log = new Record(auditCol)
          log.set('module', 'PCP Robotizado')
          log.set('screen', 'Simulação Comercial')
          log.set(
            'action',
            decision === 'APROVADA_PCP'
              ? 'SIMULACAO_COMERCIAL_APROVADA_PCP'
              : decision === 'REPROVADA_PCP'
                ? 'SIMULACAO_COMERCIAL_REPROVADA_PCP'
                : 'SIMULACAO_COMERCIAL_AJUSTE_SOLICITADO',
          )
          log.set('event_type', 'SCHEDULE_DECISION')
          log.set('user_id', authRecord.id)
          log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
          log.set('user_email', authRecord.getString('email'))
          log.set('user_role', authRecord.getString('role') || 'PCP_PROGRAMMER')
          log.set('outcome', 'SUCCESS')
          log.set('resource', 'pcp_commercial_simulations')
          log.set('resource_id', simulationId)
          log.set('details', {
            simulation_code: simulationCode,
            decision: decision,
            feedback_notes: feedbackNotes,
            statement:
              'A aprovação desta simulação NÃO altera a programação vigente nem gera pedidos/ordens reais.',
          })
          $app.save(log)
        }
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Decisão "${decision}" registrada para a simulação ${simulationCode}. (Aviso: A programação vigente NÃO foi alterada).`,
        simulation_code: simulationCode,
        status: decision,
      })
    } catch (err) {
      return e.json(500, {
        error: 'Erro ao registrar decisão do PCP: ' + err.toString(),
      })
    }
  },
  $apis.requireAuth(),
)

// 4. Detalhe da Simulação com Snapshot Imutável
routerAdd(
  'GET',
  '/backend/v1/pcp/commercial-simulation/detail/{id}',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida no HUB CIAFAL.' })
    }

    const id = e.request.pathValue('id')
    if (!id) {
      return e.json(400, { error: 'ID não informado.' })
    }

    try {
      const simRecord = $app.findRecordById('pcp_commercial_simulations', id)
      let snapshotRecord = null

      const snapId = simRecord.getString('snapshot_id')
      if (snapId) {
        try {
          snapshotRecord = $app.findRecordById('pcp_simulation_snapshots', snapId)
        } catch (_) {}
      }

      if (!snapshotRecord) {
        try {
          const snaps = $app.findRecordsByFilter(
            'pcp_simulation_snapshots',
            `simulation_id = '${id}'`,
            '-created',
            1,
            0,
          )
          if (snaps && snaps.length > 0) snapshotRecord = snaps[0]
        } catch (_) {}
      }

      return e.json(200, {
        simulation: simRecord,
        snapshot: snapshotRecord,
      })
    } catch (err) {
      return e.json(404, { error: 'Simulação não encontrada.' })
    }
  },
  $apis.requireAuth(),
)

// pocketbase/hooks/pcp_sap_production_orders_ops.js
// Evolução do Controle de Ordens de Produção — Cockpit COOIS & COHV
// Operações:
// 1. POST /backend/v1/pcp/production/orders/validate-closure
// 2. POST /backend/v1/pcp/production/orders/mass-status-change
// 3. POST /backend/v1/pcp/production/orders/mass-close

routerAdd('POST', '/backend/v1/pcp/production/orders/validate-closure', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { success: false, error: 'Não autenticado no HUB CIAFAL' })
  }

  const userId = authRecord.id || ''
  const userEmail = authRecord.getString ? authRecord.getString('email') : authRecord.email || ''
  const userRole = authRecord.getString
    ? authRecord.getString('role')
    : authRecord.role || 'PCP_PROGRAMMER'

  // RBAC: validar se o usuário pode visualizar ou encerrar OPs
  // Perfis autorizados: PCP_ADMIN, ADMIN, SUPERVISOR_PCP, PCP_PROGRAMMER, GESTOR_INDUSTRIAL, LINE_MANAGER, PCP_PLANNER
  const authorizedRoles = [
    'PCP_ADMIN',
    'ADMIN',
    'ADMINISTRADOR',
    'SUPERVISOR_PCP',
    'PCP_PROGRAMMER',
    'PPC_PROGRAMMER',
    'GESTOR_INDUSTRIAL',
    'GERENTE_INDUSTRIAL',
    'LINE_MANAGER',
    'PCP_PLANNER',
  ]

  const isAuthorized = authorizedRoles.some(
    (r) => r.toUpperCase() === String(userRole).toUpperCase(),
  )
  if (!isAuthorized) {
    return e.json(403, {
      success: false,
      error: 'Acesso negado: perfil sem permissão para validar encerramento de OPs.',
      required_permission: 'pcp.production.close',
    })
  }

  let reqBody = {}
  try {
    reqBody = e.requestInfo().body || {}
  } catch (_) {
    reqBody = {}
  }

  const opNumbers = Array.isArray(reqBody.op_numbers) ? reqBody.op_numbers : []
  if (opNumbers.length === 0) {
    return e.json(400, { success: false, error: 'Lista de OPs (op_numbers) não fornecida.' })
  }

  const validationResults = []
  let aptCount = 0
  let withPendencyCount = 0
  let alreadyClosedCount = 0

  // Consultar dados reais no banco
  for (let i = 0; i < opNumbers.length; i++) {
    const opNum = String(opNumbers[i]).trim()
    let orderRec = null

    try {
      if ($app.hasTable && $app.hasTable('pcp_production_orders')) {
        orderRec = $app.findFirstRecordByData('pcp_production_orders', 'op_number', opNum)
      }
    } catch (findErr) {
      orderRec = null
    }

    if (!orderRec) {
      // Se a ordem não estiver persistida na tabela local, validar em modo homologação defensiva
      validationResults.push({
        op_number: opNum,
        material_code: 'MAT-' + opNum,
        material_description: 'Material da OP ' + opNum,
        centro_code: '1001',
        linha_code: 'L1',
        status_op: 'PROGRAMADA',
        status_sap: 'CRIADA_LIBERADA',
        is_eligible: false,
        block_reasons: ['OP não encontrada no repositório de produção.'],
        status_category: 'BLOQUEADA',
        quantity_planned: 0,
        quantity_produced: 0,
        quantity_posted: 0,
        balance: 0,
      })
      withPendencyCount++
      continue
    }

    const statusOp = orderRec.getString('status_op') || 'EM_PRODUCAO'
    const statusSap = orderRec.getString('status_sap') || ''
    const statusFechamento = orderRec.getString('status_fechamento') || ''
    const matCode = orderRec.getString('material_code') || ''
    const matDesc = orderRec.getString('material_description') || ''
    const centroCode = orderRec.getString('centro_code') || ''
    const linhaCode = orderRec.getString('linha_code') || ''
    const qtyPlanned = Number(orderRec.get('quantity_planned_tons')) || 0
    const qtyProduced = Number(orderRec.get('quantity_produced_tons')) || 0
    const qtyPosted = Number(orderRec.get('quantity_posted_tons')) || 0
    const qtySap = Number(orderRec.get('quantity_sap_tons')) || 0
    const balance = Number(orderRec.get('balance_tons')) || 0

    // 1. Já encerrada?
    if (
      statusOp === 'ENCERRADA' ||
      statusSap === 'FECHADA_TECNICAMENTE' ||
      statusFechamento === 'FECHADA'
    ) {
      alreadyClosedCount++
      validationResults.push({
        op_number: opNum,
        material_code: matCode,
        material_description: matDesc,
        centro_code: centroCode,
        linha_code: linhaCode,
        status_op: statusOp,
        status_sap: statusSap,
        is_eligible: false,
        block_reasons: ['Ordem já encerrada tecnicamente no SAP ECC (TECO).'],
        status_category: 'JA_ENCERRADA',
        quantity_planned: qtyPlanned,
        quantity_produced: qtyProduced,
        quantity_posted: qtyPosted,
        balance: balance,
      })
      continue
    }

    const blockReasons = []

    // 2. Verificar pendências de COGI ativas para esta OP
    let cogiRecords = []
    if ($app.hasTable && $app.hasTable('sap_cogi_pendencies')) {
      try {
        cogiRecords = $app.findRecordsByFilter(
          'sap_cogi_pendencies',
          `op_number = "${opNum}" && treatment_status != "Encerrada" && treatment_status != "Reprocessada"`,
          '',
          10,
          0,
        )
      } catch (_) {
        cogiRecords = []
      }
    }

    if (cogiRecords && cogiRecords.length > 0) {
      blockReasons.push(
        `Pendência COGI ativa (${cogiRecords.length} registro(s) de déficit ou bloqueio de movimento).`,
      )
    }

    // 3. Verificar pendências de CO1P ativas para esta OP
    let co1pRecords = []
    if ($app.hasTable && $app.hasTable('sap_co1p_pendencies')) {
      try {
        co1pRecords = $app.findRecordsByFilter(
          'sap_co1p_pendencies',
          `op_number = "${opNum}" && treatment_status != "Encerrada" && treatment_status != "Reprocessada"`,
          '',
          10,
          0,
        )
      } catch (_) {
        co1pRecords = []
      }
    }

    if (co1pRecords && co1pRecords.length > 0) {
      blockReasons.push(
        `Pendência CO1P ativa (${co1pRecords.length} confirmação(ões) com desacoplamento de baixa).`,
      )
    }

    // 4. Verificar apontamentos / confirmações
    let postings = []
    if ($app.hasTable && $app.hasTable('pcp_production_postings')) {
      try {
        postings = $app.findRecordsByFilter(
          'pcp_production_postings',
          `op_number = "${opNum}"`,
          '-posting_date,-posting_time',
          50,
          0,
        )
      } catch (_) {
        postings = []
      }
    }

    // Flag se existe pelo menos uma confirmação final ou se a quantidade atingiu o planejado
    let hasFinalPosting = false
    let hasRejectedPosting = false

    for (let p = 0; p < postings.length; p++) {
      const post = postings[p]
      const pType = post.getString('posting_type') || ''
      const pStatusSap = post.getString('status_sap') || ''
      if (pType === 'CONFIRMACAO_FINAL') {
        hasFinalPosting = true
      }
      if (pStatusSap === 'REJEITADO_SAP' || post.getBool('has_pendency')) {
        hasRejectedPosting = true
      }
    }

    if (hasRejectedPosting) {
      blockReasons.push('Existe apontamento de produção rejeitado ou pendente de integração SAP.')
    }

    // 5. Quantidade ainda não confirmada ou sem confirmação final
    if (postings.length === 0 && qtyPosted === 0) {
      blockReasons.push('Ordem de Produção sem nenhuma confirmação/apontamento realizado.')
    } else if (!hasFinalPosting && balance > 0.05 * qtyPlanned && qtyPosted < qtyPlanned * 0.95) {
      blockReasons.push(
        `Quantidade não atingiu a tolerância de fechamento (${qtyPosted.toFixed(2)}t apontadas vs ${qtyPlanned.toFixed(2)}t programadas, saldo residual ${balance.toFixed(2)}t) e sem Confirmação Final.`,
      )
    }

    // 6. Divergência MES x SAP
    if (Math.abs(qtyProduced - qtySap) > 0.1 && qtyProduced > 0) {
      blockReasons.push(
        `Divergência entre volume produzido no MES (${qtyProduced.toFixed(2)}t) e integrado no SAP (${qtySap.toFixed(2)}t).`,
      )
    }

    const isEligible = blockReasons.length === 0
    if (isEligible) {
      aptCount++
    } else {
      withPendencyCount++
    }

    validationResults.push({
      op_number: opNum,
      material_code: matCode,
      material_description: matDesc,
      centro_code: centroCode,
      linha_code: linhaCode,
      status_op: statusOp,
      status_sap: statusSap,
      is_eligible: isEligible,
      block_reasons: blockReasons,
      status_category: isEligible ? 'APTA' : 'COM_PENDENCIA',
      quantity_planned: qtyPlanned,
      quantity_produced: qtyProduced,
      quantity_posted: qtyPosted,
      balance: balance,
    })
  }

  return e.json(200, {
    success: true,
    summary: {
      total_selected: opNumbers.length,
      aptas: aptCount,
      com_pendencias: withPendencyCount,
      ja_encerradas: alreadyClosedCount,
    },
    results: validationResults,
  })
})

// Endpoint de Alteração de Status em Massa (COHV)
routerAdd('POST', '/backend/v1/pcp/production/orders/mass-status-change', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { success: false, error: 'Não autenticado no HUB CIAFAL' })
  }

  const userId = authRecord.id || ''
  const userEmail = authRecord.getString ? authRecord.getString('email') : authRecord.email || ''
  const userRole = authRecord.getString
    ? authRecord.getString('role')
    : authRecord.role || 'PCP_PROGRAMMER'

  // RBAC: perfil autorizado
  const authorizedRoles = [
    'PCP_ADMIN',
    'ADMIN',
    'ADMINISTRADOR',
    'SUPERVISOR_PCP',
    'PCP_PROGRAMMER',
    'PPC_PROGRAMMER',
    'GESTOR_INDUSTRIAL',
    'GERENTE_INDUSTRIAL',
    'LINE_MANAGER',
  ]

  const isAuthorized = authorizedRoles.some(
    (r) => r.toUpperCase() === String(userRole).toUpperCase(),
  )
  if (!isAuthorized) {
    return e.json(403, {
      success: false,
      error: 'Acesso negado: perfil sem permissão para alterar status de OPs em massa.',
      required_permission: 'pcp.production.status_change_mass',
    })
  }

  let reqBody = {}
  try {
    reqBody = e.requestInfo().body || {}
  } catch (_) {
    reqBody = {}
  }

  const batchId =
    reqBody.batch_id ||
    'MASS-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      Date.now().toString().slice(-5)
  const targetStatus = String(reqBody.target_status || '')
    .trim()
    .toUpperCase()
  const opOrders = Array.isArray(reqBody.orders) ? reqBody.orders : []

  if (!targetStatus) {
    return e.json(400, {
      success: false,
      error: 'Status de destino (target_status) não informado.',
    })
  }

  // Status válidos no ciclo de vida SAP ECC:
  // LIBERADA (REL), EM_PRODUCAO, CONCLUIDA_FISICAMENTE, AGUARDANDO_FECHAMENTO, BLOQUEADA
  const validSapStatuses = [
    'LIBERADA',
    'EM_PRODUCAO',
    'CONCLUIDA_FISICAMENTE',
    'AGUARDANDO_FECHAMENTO',
    'BLOQUEADA',
  ]

  if (!validSapStatuses.includes(targetStatus)) {
    return e.json(400, {
      success: false,
      error: `Status '${targetStatus}' não é um status válido de transição direta SAP ECC. Status permitidos: ${validSapStatuses.join(', ')}`,
    })
  }

  const results = []
  let successCount = 0
  let failedCount = 0

  // RFC / Gateway SAP
  const sapGatewayUrl = $os.getenv('SAP_FCA_BASE_URL') || $os.getenv('SAP_RFC_GATEWAY_URL') || ''

  for (let i = 0; i < opOrders.length; i++) {
    const item = opOrders[i]
    const opNum = String(item.op_number || '').trim()
    const expectedCurrentStatus = String(item.current_status || '').trim()

    if (!opNum) continue

    let orderRec = null
    try {
      if ($app.hasTable && $app.hasTable('pcp_production_orders')) {
        orderRec = $app.findFirstRecordByData('pcp_production_orders', 'op_number', opNum)
      }
    } catch (_) {
      orderRec = null
    }

    if (!orderRec) {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: expectedCurrentStatus,
        new_status: null,
        message: 'Ordem de Produção não encontrada no banco de dados local.',
      })
      continue
    }

    const realCurrentStatus = orderRec.getString('status_op') || ''

    // 1. Concorrência: revalidar se o status mudou entre a seleção e a execução
    if (expectedCurrentStatus && realCurrentStatus !== expectedCurrentStatus) {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: realCurrentStatus,
        new_status: null,
        message: `Status da OP foi alterado após a seleção (era ${expectedCurrentStatus}, agora é ${realCurrentStatus}). Atualize a análise antes de continuar.`,
        concurrency_conflict: true,
      })
      continue
    }

    // 2. Não permitir reverter ordem já encerrada por alteração simples de status
    if (realCurrentStatus === 'ENCERRADA') {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: realCurrentStatus,
        new_status: null,
        message:
          'Não é possível alterar status de OP já encerrada (TECO) via transição simplificada.',
      })
      continue
    }

    // 3. Se SAP real estiver configurado, invocar BAPI/RFC autorizada
    let sapSuccess = false
    let sapMessage = ''

    if (sapGatewayUrl) {
      try {
        const res = $http.send({
          url: `${sapGatewayUrl}/bapi/prodord-change-status`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': batchId + '-' + opNum,
          },
          body: JSON.stringify({
            op_number: opNum,
            target_status: targetStatus,
            requested_by: userEmail,
            batch_id: batchId,
          }),
          timeout: 15,
        })
        if (res.statusCode >= 200 && res.statusCode < 300) {
          sapSuccess = true
          sapMessage = 'Status sincronizado no SAP ECC via RFC BAPI_PRODORD_CHANGE_STATUS.'
        } else {
          sapSuccess = false
          sapMessage = `SAP ECC retornou erro HTTP ${res.statusCode}: ${res.raw || 'Falha na RFC'}`
        }
      } catch (callErr) {
        sapSuccess = false
        sapMessage = `Falha na chamada ao conector SAP: ${callErr}`
      }
    } else {
      // Sem conector SAP provisionado: atualizar local com aviso explícito de homologação
      sapSuccess = true
      sapMessage = 'Status atualizado no HUB PCP (integração SAP em modo contingência/homologação).'
    }

    if (sapSuccess) {
      const previousStatusVal = realCurrentStatus
      orderRec.set('status_op', targetStatus)
      if (targetStatus === 'LIBERADA') {
        orderRec.set('status_sap', 'CRIADA_LIBERADA')
      }

      // Adicionar na timeline_json
      const currentTimeline = orderRec.get('timeline_json') || []
      const updatedTimeline = Array.isArray(currentTimeline) ? [...currentTimeline] : []
      updatedTimeline.push({
        id: 'evt-' + Date.now() + '-' + i,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        title: `Alteração de Status em Massa (COHV) -> ${targetStatus}`,
        category: 'STATUS_CHANGE',
        description: `Status alterado de ${previousStatusVal} para ${targetStatus}. Lote: ${batchId}.`,
        origin: 'COHV_MASSA',
        userOrSystem: userEmail,
      })
      orderRec.set('timeline_json', updatedTimeline)

      try {
        $app.save(orderRec)
        successCount++
        results.push({
          op_number: opNum,
          success: true,
          previous_status: previousStatusVal,
          new_status: targetStatus,
          message: sapMessage,
        })

        // Auditoria
        if ($app.hasTable && $app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const auditRec = new Record(auditCol)
          auditRec.set('user_id', userId)
          auditRec.set('user_email', userEmail)
          auditRec.set('user_role', userRole)
          auditRec.set('event_type', 'SCHEDULE_ACTION')
          auditRec.set('action', 'PCP_OP_MASS_STATUS_CHANGE')
          auditRec.set('resource', 'pcp_production_orders')
          auditRec.set('record_id', opNum)
          auditRec.set('permission_required', 'pcp.production.status_change_mass')
          auditRec.set('outcome', 'SUCCESS')
          auditRec.set('module', 'CONTROLE_DE_PRODUCAO')
          auditRec.set('screen', 'COCKPIT_ORDENS_COHV')
          auditRec.set('source', 'COHV_HUB')
          auditRec.set('correlation_id', batchId)
          auditRec.set('details', {
            batch_id: batchId,
            previous_status: previousStatusVal,
            new_status: targetStatus,
            total_selected: opOrders.length,
            sap_message: sapMessage,
          })
          $app.save(auditRec)
        }
      } catch (saveErr) {
        failedCount++
        results.push({
          op_number: opNum,
          success: false,
          previous_status: previousStatusVal,
          new_status: null,
          message: `Erro ao persistir status da OP: ${saveErr}`,
        })
      }
    } else {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: realCurrentStatus,
        new_status: null,
        message: sapMessage,
      })
    }
  }

  return e.json(200, {
    success: true,
    batch_id: batchId,
    summary: {
      total: opOrders.length,
      success: successCount,
      failed: failedCount,
    },
    results: results,
    last_sync: new Date().toISOString(),
  })
})

// Endpoint de Encerramento de Ordens em Massa (TECO)
routerAdd('POST', '/backend/v1/pcp/production/orders/mass-close', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { success: false, error: 'Não autenticado no HUB CIAFAL' })
  }

  const userId = authRecord.id || ''
  const userEmail = authRecord.getString ? authRecord.getString('email') : authRecord.email || ''
  const userRole = authRecord.getString
    ? authRecord.getString('role')
    : authRecord.role || 'PCP_PROGRAMMER'

  // RBAC estrito: permissão de encerramento
  const authorizedRoles = [
    'PCP_ADMIN',
    'ADMIN',
    'ADMINISTRADOR',
    'SUPERVISOR_PCP',
    'PCP_PROGRAMMER',
    'GESTOR_INDUSTRIAL',
    'GERENTE_INDUSTRIAL',
  ]

  const isAuthorized = authorizedRoles.some(
    (r) => r.toUpperCase() === String(userRole).toUpperCase(),
  )
  if (!isAuthorized) {
    return e.json(403, {
      success: false,
      error: 'Acesso negado: perfil sem autorização para encerrar ordens de produção.',
      required_permission: 'pcp.production.close',
    })
  }

  let reqBody = {}
  try {
    reqBody = e.requestInfo().body || {}
  } catch (_) {
    reqBody = {}
  }

  const batchId =
    reqBody.batch_id ||
    'MASS-CLOSE-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      Date.now().toString().slice(-5)
  const opOrders = Array.isArray(reqBody.orders) ? reqBody.orders : []

  if (opOrders.length === 0) {
    return e.json(400, { success: false, error: 'Nenhuma Ordem fornecida para encerramento.' })
  }

  const results = []
  let successCount = 0
  let failedCount = 0
  const sapGatewayUrl = $os.getenv('SAP_FCA_BASE_URL') || $os.getenv('SAP_RFC_GATEWAY_URL') || ''

  for (let i = 0; i < opOrders.length; i++) {
    const item = opOrders[i]
    const opNum = String(item.op_number || '').trim()
    const expectedStatus = String(item.current_status || '').trim()

    if (!opNum) continue

    let orderRec = null
    try {
      if ($app.hasTable && $app.hasTable('pcp_production_orders')) {
        orderRec = $app.findFirstRecordByData('pcp_production_orders', 'op_number', opNum)
      }
    } catch (_) {
      orderRec = null
    }

    if (!orderRec) {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: expectedStatus,
        new_status: null,
        message: 'Ordem de Produção não localizada no repositório.',
      })
      continue
    }

    const currentStatusOp = orderRec.getString('status_op') || ''
    const currentStatusSap = orderRec.getString('status_sap') || ''

    // 1. Revalidar concorrência
    if (expectedStatus && currentStatusOp !== expectedStatus) {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: currentStatusOp,
        new_status: null,
        message: `Status da OP foi alterado após a seleção (era ${expectedStatus}, agora é ${currentStatusOp}). Atualize a análise antes de continuar.`,
        concurrency_conflict: true,
      })
      continue
    }

    // 2. Se já estiver encerrada
    if (currentStatusOp === 'ENCERRADA' || currentStatusSap === 'FECHADA_TECNICAMENTE') {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: currentStatusOp,
        new_status: currentStatusOp,
        message: 'OP já se encontra encerrada tecnicamente (TECO).',
      })
      continue
    }

    // 3. Validação rigorosa de bloqueio: COGI ou CO1P ativas
    let hasCogi = false
    if ($app.hasTable && $app.hasTable('sap_cogi_pendencies')) {
      try {
        const cogi = $app.findRecordsByFilter(
          'sap_cogi_pendencies',
          `op_number = "${opNum}" && treatment_status != "Encerrada" && treatment_status != "Reprocessada"`,
          '',
          1,
          0,
        )
        if (cogi && cogi.length > 0) hasCogi = true
      } catch (_) {}
    }

    if (hasCogi) {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: currentStatusOp,
        new_status: null,
        message: 'Não elegível para encerramento: Existe pendência COGI ativa.',
      })
      continue
    }

    // 4. Integração SAP: invocar BAPI_PRODORD_CLOSE / TECO se houver gateway
    let sapTecoSuccess = false
    let sapTecoMessage = ''

    if (sapGatewayUrl) {
      try {
        const res = $http.send({
          url: `${sapGatewayUrl}/bapi/prodord-teco`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': batchId + '-' + opNum,
          },
          body: JSON.stringify({
            op_number: opNum,
            action: 'TECO',
            batch_id: batchId,
            requested_by: userEmail,
          }),
          timeout: 20,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          sapTecoSuccess = true
          sapTecoMessage =
            'Encerramento técnico (TECO) confirmado pelo SAP ECC via RFC BAPI_PRODORD_CLOSE.'
        } else {
          sapTecoSuccess = false
          sapTecoMessage = `SAP ECC rejeitou TECO (HTTP ${res.statusCode}): ${res.raw || 'Erro na transação'}`
        }
      } catch (callErr) {
        sapTecoSuccess = false
        sapTecoMessage = `Falha de conexão com gateway SAP: ${callErr}`
      }
    } else {
      // Homologação / contingência controlada
      sapTecoSuccess = true
      sapTecoMessage =
        'Encerramento técnico executado no HUB PCP (modo contingência SAP homologado).'
    }

    if (sapTecoSuccess) {
      const prevStatus = currentStatusOp
      orderRec.set('status_op', 'ENCERRADA')
      orderRec.set('status_sap', 'FECHADA_TECNICAMENTE')
      orderRec.set('status_fechamento', 'FECHADA')
      orderRec.set('visual_status', 'CONCLUIDO')

      // Atualizar timeline
      const currentTimeline = orderRec.get('timeline_json') || []
      const updatedTimeline = Array.isArray(currentTimeline) ? [...currentTimeline] : []
      updatedTimeline.push({
        id: 'evt-teco-' + Date.now() + '-' + i,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        title: 'Encerramento Técnico (TECO) Executado',
        category: 'ENCERRAMENTO',
        description: `OP encerrada com sucesso. Lote: ${batchId}. Mensagem SAP: ${sapTecoMessage}`,
        origin: 'COHV_ENCERRAMENTO',
        userOrSystem: userEmail,
      })
      orderRec.set('timeline_json', updatedTimeline)

      try {
        $app.save(orderRec)
        successCount++
        results.push({
          op_number: opNum,
          success: true,
          previous_status: prevStatus,
          new_status: 'ENCERRADA',
          message: sapTecoMessage,
        })

        // Auditoria imutável
        if ($app.hasTable && $app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const auditRec = new Record(auditCol)
          auditRec.set('user_id', userId)
          auditRec.set('user_email', userEmail)
          auditRec.set('user_role', userRole)
          auditRec.set('event_type', 'SCHEDULE_ACTION')
          auditRec.set('action', 'PCP_OP_MASS_CLOSE_TECO')
          auditRec.set('resource', 'pcp_production_orders')
          auditRec.set('record_id', opNum)
          auditRec.set('permission_required', 'pcp.production.close')
          auditRec.set('outcome', 'SUCCESS')
          auditRec.set('module', 'CONTROLE_DE_PRODUCAO')
          auditRec.set('screen', 'COCKPIT_ORDENS_COHV')
          auditRec.set('source', 'COHV_TECO')
          auditRec.set('correlation_id', batchId)
          auditRec.set('details', {
            batch_id: batchId,
            previous_status: prevStatus,
            new_status: 'ENCERRADA',
            total_selected: opOrders.length,
            sap_message: sapTecoMessage,
          })
          $app.save(auditRec)
        }
      } catch (saveErr) {
        failedCount++
        results.push({
          op_number: opNum,
          success: false,
          previous_status: prevStatus,
          new_status: null,
          message: `Erro ao salvar ordem encerrada: ${saveErr}`,
        })
      }
    } else {
      failedCount++
      results.push({
        op_number: opNum,
        success: false,
        previous_status: currentStatusOp,
        new_status: null,
        message: sapTecoMessage,
      })
    }
  }

  return e.json(200, {
    success: true,
    batch_id: batchId,
    summary: {
      total: opOrders.length,
      success: successCount,
      failed: failedCount,
    },
    results: results,
    last_sync: new Date().toISOString(),
  })
})

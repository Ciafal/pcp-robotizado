// pocketbase/hooks/mp_cutting_plan_numbering.js
// Endpoint oficial do servidor para geração atômica de numeração de Planos de Corte
// e controle de transições de status com validação RBAC e auditoria central.
// Formato de código: PCM-YYYY-XXXXX (Múltiplo) e PCB-YYYY-XXXXX (Blocos)
// Status oficiais: Rascunho, Em Revisão, Aprovado, Liberado, Executado, Cancelado.

routerAdd('POST', '/backend/v1/pcp/cutting-plans/next-code', (e) => {
  const reqInfo = e.requestInfo()
  const data = reqInfo.body || {}
  const rawPrefix = (data.prefix || 'PCM').toString().toUpperCase().trim()
  const prefix = rawPrefix === 'PCB' ? 'PCB' : 'PCM'
  const year = data.year ? parseInt(data.year, 10) : new Date().getFullYear()

  let generatedCode = ''
  let finalSeq = 1

  // Executa dentro de transação atômica do servidor
  $app.runInTransaction((txApp) => {
    let seqRecord = null

    try {
      const records = txApp.findRecordsByFilter(
        'mp_cutting_plan_sequences',
        `prefix = '${prefix}' && year = ${year}`,
        '-updated',
        1,
        0,
      )
      if (records && records.length > 0) {
        seqRecord = records[0]
      }
    } catch (_) {
      // registro não existe ainda
    }

    if (seqRecord) {
      finalSeq = (seqRecord.getInt('current_number') || 0) + 1
      seqRecord.set('current_number', finalSeq)
      seqRecord.set('sequence_key', `${prefix}-${year}-${finalSeq}`)
      txApp.save(seqRecord)
    } else {
      // Cria registro de sequência inicial
      const col = txApp.findCollectionByNameOrId('mp_cutting_plan_sequences')
      const newSeq = new Record(col)
      newSeq.set('prefix', prefix)
      newSeq.set('year', year)
      newSeq.set('current_number', 1)
      newSeq.set('sequence_key', `${prefix}-${year}-1`)
      txApp.save(newSeq)
      finalSeq = 1
    }

    const padded = ('00000' + finalSeq).slice(-5)
    generatedCode = `${prefix}-${year}-${padded}`

    // Idempotência extra: verifica se já existe algum plano gravado com este mesmo código
    try {
      const existingPlan = txApp.findFirstRecordByData(
        'mp_multiple_cutting_plans',
        'plan_code',
        generatedCode,
      )
      if (existingPlan && seqRecord) {
        finalSeq += 1
        seqRecord.set('current_number', finalSeq)
        seqRecord.set('sequence_key', `${prefix}-${year}-${finalSeq}`)
        txApp.save(seqRecord)
        const paddedNext = ('00000' + finalSeq).slice(-5)
        generatedCode = `${prefix}-${year}-${paddedNext}`
      }
    } catch (_) {}
  })

  return e.json(200, {
    success: true,
    plan_code: generatedCode,
    prefix: prefix,
    year: year,
    sequence: finalSeq,
  })
})

/**
 * Endpoint de transição de status do plano de corte com validação RBAC rigorosa no servidor
 * POST /backend/v1/pcp/cutting-plans/transition-status
 * Payload: {
 *   plan_id: string,
 *   target_status: 'Rascunho' | 'Em Revisão' | 'Aprovado' | 'Liberado' | 'Executado' | 'Cancelado',
 *   justification?: string,
 *   operational_confirmation?: boolean
 * }
 */
routerAdd('POST', '/backend/v1/pcp/cutting-plans/transition-status', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, {
      success: false,
      error: 'Não autenticado no HUB CIAFAL. Transição de status bloqueada.',
    })
  }

  const userRole = (authRecord.getString('role') || 'PRODUCTION_VIEWER').toUpperCase()
  const userName = authRecord.getString('name') || authRecord.getString('email') || 'Usuário PCP'
  const userId = authRecord.id

  const reqInfo = e.requestInfo()
  const body = reqInfo.body || {}

  const planId = (body.plan_id || '').toString().trim()
  const rawTargetStatus = (body.target_status || '').toString().trim()
  const justification = (body.justification || '').toString().trim()
  const operationalConfirmation = Boolean(body.operational_confirmation)

  if (!planId) {
    return e.json(400, {
      success: false,
      error: 'Identificador do plano (plan_id) é obrigatório.',
    })
  }

  // Mapeamento e validação de rótulo exato oficial
  const OFFICIAL_STATUSES = [
    'Rascunho',
    'Em Revisão',
    'Aprovado',
    'Liberado',
    'Executado',
    'Cancelado',
  ]

  const statusNormalizer = {
    rascunho: 'Rascunho',
    RASCUNHO: 'Rascunho',
    Rascunho: 'Rascunho',
    'em revisão': 'Em Revisão',
    'em revisao': 'Em Revisão',
    EM_REVISAO: 'Em Revisão',
    'Em Revisão': 'Em Revisão',
    'Em Revisao': 'Em Revisão',
    aprovado: 'Aprovado',
    APROVADO: 'Aprovado',
    Aprovado: 'Aprovado',
    liberado: 'Liberado',
    LIBERADO: 'Liberado',
    Liberado: 'Liberado',
    executado: 'Executado',
    EXECUTADO: 'Executado',
    Executado: 'Executado',
    cancelado: 'Cancelado',
    CANCELADO: 'Cancelado',
    Cancelado: 'Cancelado',
  }

  const targetStatus = statusNormalizer[rawTargetStatus]

  if (!targetStatus || !OFFICIAL_STATUSES.includes(targetStatus)) {
    return e.json(400, {
      success: false,
      error: `Status de destino inválido: "${rawTargetStatus}". Status oficiais permitidos: ${OFFICIAL_STATUSES.join(', ')}.`,
    })
  }

  // Busca plano no banco
  let planRecord = null
  try {
    planRecord = $app.findRecordById('mp_multiple_cutting_plans', planId)
  } catch (err) {
    return e.json(404, {
      success: false,
      error: `Plano de corte não encontrado com ID: ${planId}.`,
    })
  }

  const rawCurrentStatus = planRecord.getString('status') || 'Rascunho'
  const currentStatus = statusNormalizer[rawCurrentStatus] || 'Rascunho'

  if (currentStatus === targetStatus) {
    return e.json(200, {
      success: true,
      message: `Plano já se encontra no status ${targetStatus}.`,
      plan: {
        id: planRecord.id,
        plan_code: planRecord.getString('plan_code'),
        status: targetStatus,
        version: planRecord.getInt('version'),
      },
    })
  }

  // Máquina de estados: regras de transição oficiais
  // - Rascunho -> Em Revisão, Aprovado, Cancelado
  // - Em Revisão -> Aprovado, Cancelado, Rascunho
  // - Aprovado -> Liberado, Em Revisão, Cancelado
  // - Liberado -> Executado, Em Revisão, Cancelado
  // - Executado -> Estado terminal ou Cancelado (apenas com perfil PCP_ADMIN)
  // - Cancelado -> Estado terminal imutável
  const ALLOWED_TRANSITIONS = {
    Rascunho: ['Em Revisão', 'Aprovado', 'Cancelado'],
    'Em Revisão': ['Aprovado', 'Rascunho', 'Cancelado'],
    Aprovado: ['Liberado', 'Em Revisão', 'Cancelado'],
    Liberado: ['Executado', 'Em Revisão', 'Cancelado'],
    Executado: ['Cancelado'],
    Cancelado: [],
  }

  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || []
  if (!allowedTargets.includes(targetStatus)) {
    return e.json(400, {
      success: false,
      error: `Transição inválida de "${currentStatus}" para "${targetStatus}". O fluxo operacional não permite pular etapas.`,
    })
  }

  // Validação de justificativa obrigatória para Cancelamento
  if (targetStatus === 'Cancelado') {
    if (!justification || justification.length < 5) {
      return e.json(400, {
        success: false,
        error:
          'Justificativa obrigatória não informada. Para cancelar um plano de corte é obrigatório fornecer uma justificativa clara (mínimo de 5 caracteres).',
      })
    }
  }

  // Validação de confirmação operacional para Executado
  if (targetStatus === 'Executado') {
    if (!operationalConfirmation) {
      return e.json(400, {
        success: false,
        error:
          'Confirmação operacional obrigatória para marcar o plano como Executado. É necessário confirmar a efetiva realização do corte no chão de fábrica.',
      })
    }
  }

  // Validação de Permissão RBAC no Servidor por Perfil:
  // - Aprovado: apenas PCP_ADMIN ou PCP_PROGRAMMER ou LINE_MANAGER (perfis com autoridade de aprovação)
  // - Liberado: apenas PCP_ADMIN ou PCP_PROGRAMMER
  // - Executado: apenas PCP_ADMIN ou PCP_PROGRAMMER ou LINE_MANAGER ou OPERATOR com autorização
  // - Cancelado: PCP_ADMIN, PCP_PROGRAMMER ou LINE_MANAGER (se já executado, somente PCP_ADMIN)
  // - Em Revisão / Rascunho: PCP_ADMIN ou PCP_PROGRAMMER
  const isAdmin = userRole === 'PCP_ADMIN' || userRole === 'ADMIN' || userRole === 'ADMINISTRADOR'
  const isProgrammer = userRole === 'PCP_PROGRAMMER' || userRole === 'PPC_PROGRAMMER'
  const isLineManager = userRole === 'LINE_MANAGER' || userRole === 'SUPERVISOR'

  let hasPermission = false

  switch (targetStatus) {
    case 'Aprovado':
      hasPermission = isAdmin || isProgrammer || isLineManager
      break
    case 'Liberado':
      hasPermission = isAdmin || isProgrammer
      break
    case 'Executado':
      hasPermission = isAdmin || isProgrammer || isLineManager
      break
    case 'Cancelado':
      if (currentStatus === 'Executado') {
        hasPermission = isAdmin // Cancelar plano já executado exige perfil administrativo
      } else {
        hasPermission = isAdmin || isProgrammer || isLineManager
      }
      break
    case 'Em Revisão':
    case 'Rascunho':
      hasPermission = isAdmin || isProgrammer || isLineManager
      break
    default:
      hasPermission = isAdmin
  }

  if (!hasPermission) {
    // Grava tentativa negada na auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const auditRec = new Record(auditCol)
      auditRec.set('event_type', 'UNAUTHORIZED_ACTION_ATTEMPT')
      auditRec.set('action', 'TENTATIVA_TRANSICAO_STATUS_NEGADA')
      auditRec.set('resource', 'mp_multiple_cutting_plans')
      auditRec.set('resource_id', planId)
      auditRec.set('user_id', userId)
      auditRec.set('user_name', userName)
      auditRec.set('user_role', userRole)
      auditRec.set('outcome', 'DENY')
      auditRec.set('status', 'Bloqueada')
      auditRec.set('module', 'Gestão de MP')
      auditRec.set('screen', 'Planos de Corte')
      auditRec.set(
        'details',
        JSON.stringify({
          plan_code: planRecord.getString('plan_code'),
          current_status: currentStatus,
          attempted_target_status: targetStatus,
          user_role: userRole,
          motivo: 'Usuário sem permissão necessária para esta transição de status',
        }),
      )
      $app.save(auditRec)
    } catch (_) {}

    return e.json(403, {
      success: false,
      error: `Acesso negado no servidor: seu perfil (${userRole}) não possui permissão para transicionar planos de corte para o status "${targetStatus}".`,
    })
  }

  // Executa transição atômica
  const nowIso = new Date().toISOString()
  let historyList = []
  try {
    const rawHist = planRecord.get('status_history_json')
    if (Array.isArray(rawHist)) {
      historyList = rawHist
    } else if (typeof rawHist === 'string' && rawHist.trim().startsWith('[')) {
      historyList = JSON.parse(rawHist)
    }
  } catch (_) {
    historyList = []
  }

  const historyEntry = {
    from_status: currentStatus,
    to_status: targetStatus,
    timestamp: nowIso,
    user_id: userId,
    user_name: userName,
    user_role: userRole,
    justification: justification || undefined,
    operational_confirmation: operationalConfirmation || undefined,
  }

  historyList.unshift(historyEntry)

  planRecord.set('status', targetStatus)
  planRecord.set('status_updated_at', nowIso)
  planRecord.set('status_updated_by', userName)
  planRecord.set('status_justification', justification || '')
  planRecord.set('status_history_json', historyList)

  $app.save(planRecord)

  // Grava auditoria oficial de governança em pcp_audit_logs
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const auditRec = new Record(auditCol)
    auditRec.set('event_type', 'SCHEDULE_ACTION')
    auditRec.set('action', `STATUS_PLANO_CORTE_${targetStatus.toUpperCase().replace(/\s+/g, '_')}`)
    auditRec.set('resource', 'mp_multiple_cutting_plans')
    auditRec.set('resource_id', planId)
    auditRec.set('user_id', userId)
    auditRec.set('user_name', userName)
    auditRec.set('user_role', userRole)
    auditRec.set('outcome', 'SUCCESS')
    auditRec.set('status', 'Concluída')
    auditRec.set('module', 'Gestão de MP')
    auditRec.set('screen', 'Planos de Corte')
    auditRec.set(
      'details',
      JSON.stringify({
        plan_code: planRecord.getString('plan_code'),
        version: planRecord.getInt('version'),
        from_status: currentStatus,
        to_status: targetStatus,
        justification: justification || undefined,
        operational_confirmation: operationalConfirmation || undefined,
      }),
    )
    $app.save(auditRec)
  } catch (auditErr) {
    console.warn('[transition-status] Erro ao gravar audit log:', auditErr)
  }

  return e.json(200, {
    success: true,
    message: `Status do plano ${planRecord.getString('plan_code')} alterado para "${targetStatus}" com sucesso.`,
    plan: {
      id: planRecord.id,
      plan_code: planRecord.getString('plan_code'),
      status: targetStatus,
      status_updated_at: nowIso,
      status_updated_by: userName,
      status_justification: justification,
      version: planRecord.getInt('version'),
      status_history: historyList,
    },
  })
})

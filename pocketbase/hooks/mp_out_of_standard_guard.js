// Hook: Interceptor de segurança e governança para Aproveitamento de MP Fora do Padrão (ZPP88/ZPP86)
// PocketBase JSVM: todas as funções e variáveis devem ser INLINE dentro do corpo de cada callback

// 1. Interceptar Criação de Avaliação (exige pcp.mp_out_of_standard.create)
onRecordCreateRequest((e) => {
  const authRecord = e.auth
  if (authRecord) {
    const userRole = authRecord.getString('role') || ''
    let hasPerm = userRole === 'PCP_ADMIN'
    if (!hasPerm) {
      try {
        const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
        if (roleRec) {
          const permRec = $app.findFirstRecordByData(
            'pcp_permissions',
            'key',
            'pcp.mp_out_of_standard.create',
          )
          if (permRec) {
            const rps = $app.findRecordsByFilter(
              'pcp_role_permissions',
              `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
              '',
              1,
              0,
            )
            if (rps.length > 0) hasPerm = true
          }
        }
      } catch (_) {}
    }

    if (!hasPerm) {
      return e.json(403, {
        code: 'FORBIDDEN_EVALUATION_CREATE',
        message:
          'Acesso negado: Criação de avaliação exige a permissão pcp.mp_out_of_standard.create.',
      })
    }
  }

  // Garantir que não movimenta estoque SAP nesta etapa
  e.record.set('estoque_movimentado', false)

  // Gerar numeração sequencial AMP-000001/AAAA se não fornecida
  let seq = e.record.getString('numero_sequencial')
  if (!seq) {
    const ano = new Date().getFullYear()
    let proximoNum = 1
    try {
      const existing = $app.findRecordsByFilter(
        'mp_out_of_standard_evaluations',
        `numero_sequencial ~ '/${ano}'`,
        '-numero_sequencial',
        1,
        0,
      )
      if (existing.length > 0) {
        const lastSeq = existing[0].getString('numero_sequencial')
        const match = lastSeq.match(/AMP-(\d+)\//)
        if (match && match[1]) {
          proximoNum = parseInt(match[1], 10) + 1
        }
      }
    } catch (_) {}
    seq = `AMP-${String(proximoNum).padStart(6, '0')}/${ano}`
    e.record.set('numero_sequencial', seq)
  }

  return e.next()
}, 'mp_out_of_standard_evaluations')

// Pós-criação: registrar log de auditoria oficial em pcp_audit_logs
onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
  const autoEventId = `LOG-PCP-${yyyy}${mm}${dd}-${randomHex}`

  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const log = new Record(auditCol)
    log.set('event_id', autoEventId)
    log.set('user_id', record.getString('avaliador_id') || null)
    log.set('user_email', record.getString('avaliador_email') || 'sistema@ciafal.com.br')
    log.set('user_name', record.getString('avaliador_nome') || 'PCP')
    log.set('user_role', record.getString('avaliador_cargo') || 'PCP_PROGRAMMER')
    log.set('login', (record.getString('avaliador_email') || 'pcp').split('@')[0])
    log.set('profile', record.getString('avaliador_cargo') || 'PCP_PROGRAMMER')

    log.set('event_type', 'RULE_ACTION')
    log.set('action', 'CRIAR_AVALIACAO_MP_FORA_PADRAO')
    log.set('resource', 'mp_out_of_standard_evaluations')
    log.set('resource_id', record.id)
    log.set('permission_required', 'pcp.mp_out_of_standard.create')
    log.set('scope', record.getString('centro') || 'GLOBAL')
    log.set('outcome', 'SUCCESS')
    log.set('status', 'Concluída')
    log.set('source', record.getString('origem_dados') || 'CADASTRO_PCP_OFICIAL')

    log.set('company', 'CIAFAL')
    log.set('center', record.getString('centro') || '')
    log.set('module', 'Gestão de MP')
    log.set('screen', 'Aproveitamento MP fora do padrão')
    log.set('entity', 'mp_out_of_standard_evaluations')
    log.set('record_id', record.id)
    log.set('reason', record.getString('motivo') || '')

    log.set('details', {
      numero_sequencial: record.getString('numero_sequencial'),
      material: record.getString('material'),
      lote: record.getString('lote'),
      aplicacao_atual: record.getString('aplicacao_atual'),
      nova_aplicacao: record.getString('nova_aplicacao'),
      permite_fora_do_padrao: record.getBool('permite_fora_do_padrao'),
      status_compatibilidade: record.getString('status_compatibilidade'),
      origem_regra: record.getString('origem_regra'),
      peso_kg: record.getInt('peso_kg'),
      dimensoes: {
        espessura_mm: record.getInt('espessura_mm'),
        largura_mm: record.getInt('largura_mm'),
        comprimento_mm: record.getInt('comprimento_mm'),
      },
    })

    log.set('technical_details', {
      zpp_reference: 'ZPP88/ZPP86',
      rfc_status: 'RFC_PENDENTE_USANDO_CADASTRO_OFICIAL',
      estoque_movimentado: false,
    })

    $app.save(log)
  } catch (err) {
    console.warn('[mp_out_of_standard_guard] Erro ao gravar log de auditoria:', err)
  }
}, 'mp_out_of_standard_evaluations')

// Bloquear exclusão física (regra de governança irrestrita)
onRecordDeleteRequest((e) => {
  return e.json(403, {
    code: 'FORBIDDEN_PHYSICAL_DELETE',
    message:
      'Acesso negado: A exclusão física de avaliações de aproveitamento de MP é proibida pela governança CIAFAL. Utilize o cancelamento lógico com justificativa obrigatória.',
  })
}, 'mp_out_of_standard_evaluations')

// 2. Interceptar Atualização de Avaliação (edição, decisão e cancelamento)
onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  const original = e.record.original()
  const oldSituacao = original.getString('situacao')
  const newSituacao = e.record.getString('situacao')

  // Se estiver alterando para Aprovada ou Reprovada -> exige pcp.mp_out_of_standard.decide
  if (oldSituacao !== newSituacao && (newSituacao === 'Aprovada' || newSituacao === 'Reprovada')) {
    if (authRecord) {
      const userRole = authRecord.getString('role') || ''
      let hasPerm = userRole === 'PCP_ADMIN'
      if (!hasPerm) {
        try {
          const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
          if (roleRec) {
            const permRec = $app.findFirstRecordByData(
              'pcp_permissions',
              'key',
              'pcp.mp_out_of_standard.decide',
            )
            if (permRec) {
              const rps = $app.findRecordsByFilter(
                'pcp_role_permissions',
                `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
                '',
                1,
                0,
              )
              if (rps.length > 0) hasPerm = true
            }
          }
        } catch (_) {}
      }

      if (!hasPerm) {
        return e.json(403, {
          code: 'FORBIDDEN_EVALUATION_DECISION',
          message:
            'Acesso negado: Decisão formal (aprovação/reprovação) exige a permissão pcp.mp_out_of_standard.decide.',
        })
      }
    }
  }

  // Se estiver alterando para Cancelada -> exige pcp.mp_out_of_standard.cancel
  if (oldSituacao !== newSituacao && newSituacao === 'Cancelada') {
    if (authRecord) {
      const userRole = authRecord.getString('role') || ''
      let hasPerm = userRole === 'PCP_ADMIN'
      if (!hasPerm) {
        try {
          const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
          if (roleRec) {
            const permRec = $app.findFirstRecordByData(
              'pcp_permissions',
              'key',
              'pcp.mp_out_of_standard.cancel',
            )
            if (permRec) {
              const rps = $app.findRecordsByFilter(
                'pcp_role_permissions',
                `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
                '',
                1,
                0,
              )
              if (rps.length > 0) hasPerm = true
            }
          }
        } catch (_) {}
      }

      if (!hasPerm) {
        return e.json(403, {
          code: 'FORBIDDEN_EVALUATION_CANCEL',
          message:
            'Acesso negado: Cancelamento de avaliação exige a permissão pcp.mp_out_of_standard.cancel.',
        })
      }
    }
  }

  // Se estiver apenas editando campos técnicos mantendo "Em análise" -> exige pcp.mp_out_of_standard.edit
  if (oldSituacao === newSituacao && authRecord) {
    const userRole = authRecord.getString('role') || ''
    let hasPerm = userRole === 'PCP_ADMIN'
    if (!hasPerm) {
      try {
        const roleRec = $app.findFirstRecordByData('pcp_roles', 'code', userRole)
        if (roleRec) {
          const permRec = $app.findFirstRecordByData(
            'pcp_permissions',
            'key',
            'pcp.mp_out_of_standard.edit',
          )
          if (permRec) {
            const rps = $app.findRecordsByFilter(
              'pcp_role_permissions',
              `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
              '',
              1,
              0,
            )
            if (rps.length > 0) hasPerm = true
          }
        }
      } catch (_) {}
    }

    if (!hasPerm) {
      return e.json(403, {
        code: 'FORBIDDEN_EVALUATION_EDIT',
        message:
          'Acesso negado: Edição de avaliação exige a permissão pcp.mp_out_of_standard.edit.',
      })
    }
  }

  // Bloqueio rigoroso: NÃO permitir alterar estoque fisicamente nesta etapa
  e.record.set('estoque_movimentado', false)

  return e.next()
}, 'mp_out_of_standard_evaluations')

// Pós-atualização: registrar log de auditoria com Antes x Depois
onRecordAfterUpdateSuccess((e) => {
  const record = e.record
  const original = e.record.original()
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
  const autoEventId = `LOG-PCP-${yyyy}${mm}${dd}-${randomHex}`

  const oldSituacao = original.getString('situacao')
  const newSituacao = record.getString('situacao')

  let action = 'ALTERAR_AVALIACAO_MP_FORA_PADRAO'
  if (oldSituacao !== newSituacao) {
    if (newSituacao === 'Aprovada') action = 'APROVAR_AVALIACAO_MP_FORA_PADRAO'
    else if (newSituacao === 'Reprovada') action = 'REPROVAR_AVALIACAO_MP_FORA_PADRAO'
    else if (newSituacao === 'Cancelada') action = 'CANCELAR_AVALIACAO_MP_FORA_PADRAO'
  }

  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const log = new Record(auditCol)
    log.set('event_id', autoEventId)
    log.set(
      'user_id',
      record.getString('responsavel_decisao_id') || record.getString('avaliador_id') || null,
    )
    log.set('user_email', record.getString('avaliador_email') || 'sistema@ciafal.com.br')
    log.set(
      'user_name',
      record.getString('responsavel_decisao_nome') || record.getString('avaliador_nome') || 'PCP',
    )
    log.set('user_role', 'PCP_PROGRAMMER')
    log.set('login', (record.getString('avaliador_email') || 'pcp').split('@')[0])
    log.set('profile', 'PCP_PROGRAMMER')

    log.set('event_type', 'RULE_ACTION')
    log.set('action', action)
    log.set('resource', 'mp_out_of_standard_evaluations')
    log.set('resource_id', record.id)
    log.set('scope', record.getString('centro') || 'GLOBAL')
    log.set('outcome', 'SUCCESS')
    log.set('status', 'Concluída')
    log.set('source', record.getString('origem_dados') || 'CADASTRO_PCP_OFICIAL')

    log.set('company', 'CIAFAL')
    log.set('center', record.getString('centro') || '')
    log.set('module', 'Gestão de MP')
    log.set('screen', 'Aproveitamento MP fora do padrão')
    log.set('entity', 'mp_out_of_standard_evaluations')
    log.set('record_id', record.id)
    log.set(
      'reason',
      record.getString('decisao_justificativa') ||
        record.getString('motivo_cancelamento') ||
        record.getString('motivo') ||
        '',
    )

    log.set('changes', [
      { campo: 'situacao', anterior: oldSituacao, novo: newSituacao },
      {
        campo: 'status_compatibilidade',
        anterior: original.getString('status_compatibilidade'),
        novo: record.getString('status_compatibilidade'),
      },
      {
        campo: 'permite_fora_do_padrao',
        anterior: original.getBool('permite_fora_do_padrao'),
        novo: record.getBool('permite_fora_do_padrao'),
      },
      {
        campo: 'aplicacao_alternativa_aprovada',
        anterior: original.getBool('aplicacao_alternativa_aprovada'),
        novo: record.getBool('aplicacao_alternativa_aprovada'),
      },
    ])

    log.set('details', {
      numero_sequencial: record.getString('numero_sequencial'),
      material: record.getString('material'),
      lote: record.getString('lote'),
      nova_aplicacao: record.getString('nova_aplicacao'),
      responsavel_decisao_nome: record.getString('responsavel_decisao_nome'),
      data_decisao: record.getString('data_decisao'),
      decisao_justificativa: record.getString('decisao_justificativa'),
    })

    log.set('technical_details', {
      zpp_reference: 'ZPP88/ZPP86',
      rfc_status: 'RFC_PENDENTE_USANDO_CADASTRO_OFICIAL',
      estoque_movimentado: false,
    })

    $app.save(log)
  } catch (err) {
    console.warn('[mp_out_of_standard_guard] Erro ao gravar log de atualização:', err)
  }
}, 'mp_out_of_standard_evaluations')

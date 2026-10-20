// Hook Backend: Saldos Residuais - Endpoints e Validação de Permissões no Backend
// Garante validação real no backend (RBAC) para:
// 1. POST /backend/v1/pcp/residual-balances/parameters (Salvar/Editar parâmetro - exige permissão de gestão)
// 2. DELETE /backend/v1/pcp/residual-balances/parameters/{id} (Exclusão lógica de parâmetro - exige permissão de gestão)
// 3. POST /backend/v1/pcp/residual-balances/action (Registrar tratamento / regularizar - valida permissão correspondente)

// 1. Salvar ou Atualizar Parâmetro
routerAdd(
  'POST',
  '/backend/v1/pcp/residual-balances/parameters',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida.' })
    }

    const role = authRecord.getString('role') || ''
    let hasPermission = role === 'PCP_ADMIN' || role === 'PCP_PROGRAMMER'
    if (!hasPermission) {
      try {
        if ($app.hasTable && $app.hasTable('pcp_role_permissions')) {
          const permRecord = $app.findFirstRecordByFilter(
            'pcp_permissions',
            "key = 'pcp.residual_balances.parameters'",
          )
          if (permRecord) {
            const roleRec = $app.findFirstRecordByFilter('pcp_roles', `code = '${role}'`)
            if (roleRec) {
              const rolePerm = $app.findFirstRecordByFilter(
                'pcp_role_permissions',
                `role_id = '${roleRec.id}' && permission_id = '${permRecord.id}'`,
              )
              if (rolePerm) hasPermission = true
            }
          }
        }
      } catch (_) {}
    }

    if (!hasPermission) {
      return e.json(403, {
        error:
          'Acesso negado: você não tem permissão para gerenciar parâmetros de saldos residuais.',
      })
    }

    const body = e.requestInfo().body || {}
    const id = (body.id || '').trim()
    const deposito = (body.deposito || '').trim().toUpperCase()
    const depositoNome = (body.deposito_nome || '').trim()
    const descricao = (body.descricao || '').trim()
    const tipoRegra = (body.tipo_regra || '').trim()
    const unidadeMedida = (body.unidade_medida || 'kg').trim()
    const acaoRecomendada = (body.acao_recomendada || '').trim()
    const acaoDetalhe = (body.acao_detalhe || '').trim()
    const responsavelAcao = (body.responsavel_acao || '').trim()
    const prazoValor = Number(body.prazo_valor) || 0
    const prazoUnidade = body.prazo_unidade === 'DIAS' ? 'DIAS' : 'HORAS'
    const criticidade = body.criticidade || 'MEDIA'
    const ativo = body.ativo !== false

    if (!deposito || !descricao || !tipoRegra || !acaoRecomendada) {
      return e.json(400, {
        error: 'Preencha todos os campos obrigatórios: Depósito, Descrição, Regra e Ação.',
      })
    }

    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'

    try {
      const col = $app.findCollectionByNameOrId('pcp_residual_balance_parameters')
      let rec
      let isNew = false

      if (id) {
        rec = $app.findRecordById('pcp_residual_balance_parameters', id)
        rec.set('atualizado_por_id', authRecord.id)
        rec.set('atualizado_por_nome', userName)
      } else {
        rec = new Record(col)
        rec.set('criado_por_id', authRecord.id)
        rec.set('criado_por_nome', userName)
        rec.set('excluido_logico', false)
        isNew = true
      }

      rec.set('deposito', deposito)
      rec.set('deposito_nome', depositoNome)
      rec.set('descricao', descricao)
      rec.set('tipo_regra', tipoRegra)
      rec.set('unidade_medida', unidadeMedida)
      rec.set('acao_recomendada', acaoRecomendada)
      rec.set('acao_detalhe', acaoDetalhe)
      rec.set('responsavel_acao', responsavelAcao)
      rec.set('prazo_valor', prazoValor)
      rec.set('prazo_unidade', prazoUnidade)
      rec.set('criticidade', criticidade)
      rec.set('ativo', ativo)

      if (tipoRegra === 'FAIXA_QUANTIDADE') {
        rec.set('quantidade_min', Number(body.quantidade_min) || 0)
        rec.set('quantidade_max', Number(body.quantidade_max) || 0)
        rec.set('quantidade', 0)
      } else {
        rec.set('quantidade', Number(body.quantidade) || 0)
        rec.set('quantidade_min', 0)
        rec.set('quantidade_max', 0)
      }

      $app.save(rec)

      // Registrar auditoria em pcp_audit_logs
      try {
        if ($app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const log = new Record(auditCol)
          log.set('module', 'Controle de Produção')
          log.set('screen', 'Saldos Residuais')
          log.set('action', isNew ? 'PARAMETRO_RESIDUAL_CRIADO' : 'PARAMETRO_RESIDUAL_EDITADO')
          log.set('event_type', 'RULE_ACTION')
          log.set('user_id', authRecord.id)
          log.set('user_name', userName)
          log.set('user_email', userEmail)
          log.set('outcome', 'SUCCESS')
          log.set('details', {
            parametro_id: rec.id,
            deposito,
            descricao,
            tipo_regra: tipoRegra,
            criticidade,
            ativo,
          })
          $app.save(log)
        }
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Parâmetro do depósito ${deposito} salvo com sucesso.`,
        record: rec,
      })
    } catch (saveErr) {
      console.log('[RESIDUAL-BALANCES] Erro ao salvar parâmetro:', saveErr)
      return e.json(500, { error: 'Não foi possível salvar o parâmetro no banco de dados.' })
    }
  },
  $apis.requireAuth(),
)

// 2. Exclusão Lógica de Parâmetro
routerAdd(
  'DELETE',
  '/backend/v1/pcp/residual-balances/parameters/{id}',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida.' })
    }

    const role = authRecord.getString('role') || ''
    let hasPermission = role === 'PCP_ADMIN' || role === 'PCP_PROGRAMMER'
    if (!hasPermission) {
      try {
        if ($app.hasTable && $app.hasTable('pcp_role_permissions')) {
          const permRecord = $app.findFirstRecordByFilter(
            'pcp_permissions',
            "key = 'pcp.residual_balances.parameters'",
          )
          if (permRecord) {
            const roleRec = $app.findFirstRecordByFilter('pcp_roles', `code = '${role}'`)
            if (roleRec) {
              const rolePerm = $app.findFirstRecordByFilter(
                'pcp_role_permissions',
                `role_id = '${roleRec.id}' && permission_id = '${permRecord.id}'`,
              )
              if (rolePerm) hasPermission = true
            }
          }
        }
      } catch (_) {}
    }

    if (!hasPermission) {
      return e.json(403, {
        error: 'Acesso negado: você não tem permissão para excluir parâmetros.',
      })
    }

    const id = e.request.pathValue('id')
    if (!id) {
      return e.json(400, { error: 'ID do parâmetro não informado.' })
    }

    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'

    try {
      const rec = $app.findRecordById('pcp_residual_balance_parameters', id)
      // Exclusão LÓGICA: marca excluido_logico = true e ativo = false
      rec.set('excluido_logico', true)
      rec.set('ativo', false)
      rec.set('atualizado_por_id', authRecord.id)
      rec.set('atualizado_por_nome', userName)
      $app.save(rec)

      // Registrar auditoria
      try {
        if ($app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const log = new Record(auditCol)
          log.set('module', 'Controle de Produção')
          log.set('screen', 'Saldos Residuais')
          log.set('action', 'PARAMETRO_RESIDUAL_EXCLUIDO_LOGICAMENTE')
          log.set('event_type', 'RULE_ACTION')
          log.set('user_id', authRecord.id)
          log.set('user_name', userName)
          log.set('user_email', userEmail)
          log.set('outcome', 'SUCCESS')
          log.set('details', {
            parametro_id: id,
            deposito: rec.getString('deposito'),
            descricao: rec.getString('descricao'),
          })
          $app.save(log)
        }
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: `Parâmetro "${rec.getString('descricao')}" excluído com sucesso.`,
      })
    } catch (err) {
      return e.json(404, { error: 'Parâmetro não encontrado ou já excluído.' })
    }
  },
  $apis.requireAuth(),
)

// 3. Registrar Ação / Regularizar Saldo Residual
routerAdd(
  'POST',
  '/backend/v1/pcp/residual-balances/action',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida.' })
    }

    const body = e.requestInfo().body || {}
    const saldoId = (body.saldo_id || '').trim()
    const deposito = (body.deposito || '').trim().toUpperCase()
    const materialCodigo = (body.material_codigo || '').trim()
    const materialDescricao = (body.material_descricao || '').trim()
    const lote = (body.lote || '').trim()
    const quantidadeResidual = Number(body.quantidade_residual) || 0
    const unidadeMedida = (body.unidade_medida || 'kg').trim()
    const regraAplicada = (body.regra_aplicada || '').trim()
    const acaoPrevista = (body.acao_prevista || '').trim()
    const acaoRealizada = (body.acao_realizada || '').trim()
    const responsavel = (body.responsavel || '').trim()
    const statusNovo = (body.status_novo || '').trim() // ACAO_NECESSARIA, EM_TRATAMENTO, REGULARIZADO
    const observacao = (body.observacao || '').trim()

    if (!deposito || !lote || !acaoRealizada || !responsavel || !statusNovo) {
      return e.json(400, {
        error: 'Campos obrigatórios ausentes: Ação realizada, Responsável e Novo Status.',
      })
    }

    const role = authRecord.getString('role') || ''
    // Validação de permissão
    if (statusNovo === 'REGULARIZADO') {
      let canRegularize = role === 'PCP_ADMIN' || role === 'PCP_PROGRAMMER'
      if (!canRegularize) {
        try {
          if ($app.hasTable && $app.hasTable('pcp_role_permissions')) {
            const permRec = $app.findFirstRecordByFilter(
              'pcp_permissions',
              "key = 'pcp.residual_balances.regularize'",
            )
            if (permRec) {
              const roleRec = $app.findFirstRecordByFilter('pcp_roles', `code = '${role}'`)
              if (roleRec) {
                const rolePerm = $app.findFirstRecordByFilter(
                  'pcp_role_permissions',
                  `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
                )
                if (rolePerm) canRegularize = true
              }
            }
          }
        } catch (_) {}
      }

      if (!canRegularize) {
        return e.json(403, {
          error:
            'Acesso negado: apenas Gestores PCP ou Administradores podem regularizar saldos residuais.',
        })
      }
    } else {
      let canTreat = role === 'PCP_ADMIN' || role === 'PCP_PROGRAMMER' || role === 'LINE_MANAGER'
      if (!canTreat) {
        try {
          if ($app.hasTable && $app.hasTable('pcp_role_permissions')) {
            const permRec = $app.findFirstRecordByFilter(
              'pcp_permissions',
              "key = 'pcp.residual_balances.treat'",
            )
            if (permRec) {
              const roleRec = $app.findFirstRecordByFilter('pcp_roles', `code = '${role}'`)
              if (roleRec) {
                const rolePerm = $app.findFirstRecordByFilter(
                  'pcp_role_permissions',
                  `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`,
                )
                if (rolePerm) canTreat = true
              }
            }
          }
        } catch (_) {}
      }

      if (!canTreat) {
        return e.json(403, {
          error: 'Acesso negado: você não tem permissão para registrar tratamentos operacionais.',
        })
      }
    }

    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'
    const nowIso = new Date().toISOString()

    try {
      // 1. Atualizar registro do saldo residual se existir
      let statusAnterior = 'SALDO_RESIDUAL_IDENTIFICADO'
      if (saldoId) {
        try {
          const saldoRec = $app.findRecordById('pcp_residual_balances', saldoId)
          statusAnterior = saldoRec.getString('status')
          saldoRec.set('status', statusNovo)
          saldoRec.set('responsavel_acao', responsavel)
          saldoRec.set('ultima_atualizacao_origem', 'TRATAMENTO_MANUAL')
          $app.save(saldoRec)
        } catch (_) {}
      }

      // 2. Gravar histórico imutável na collection pcp_residual_balance_actions
      const actionsCol = $app.findCollectionByNameOrId('pcp_residual_balance_actions')
      const actionRec = new Record(actionsCol)
      actionRec.set('saldo_id', saldoId)
      actionRec.set('deposito', deposito)
      actionRec.set('material_codigo', materialCodigo)
      actionRec.set('material_descricao', materialDescricao)
      actionRec.set('lote', lote)
      actionRec.set('quantidade_residual', quantidadeResidual)
      actionRec.set('unidade_medida', unidadeMedida)
      actionRec.set('regra_aplicada', regraAplicada)
      actionRec.set('acao_prevista', acaoPrevista)
      actionRec.set('acao_realizada', acaoRealizada)
      actionRec.set('responsavel', responsavel)
      actionRec.set('data_acao', nowIso)
      actionRec.set('status_anterior', statusAnterior)
      actionRec.set('status_novo', statusNovo)
      actionRec.set('observacao', observacao)
      actionRec.set('usuario_id', authRecord.id)
      actionRec.set('usuario_nome', userName)
      actionRec.set('usuario_email', userEmail)
      $app.save(actionRec)

      // 3. Gravar na auditoria global pcp_audit_logs
      try {
        if ($app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const log = new Record(auditCol)
          log.set('module', 'Controle de Produção')
          log.set('screen', 'Saldos Residuais')
          log.set(
            'action',
            statusNovo === 'REGULARIZADO'
              ? 'SALDO_RESIDUAL_REGULARIZADO'
              : 'TRATAMENTO_SALDO_RESIDUAL_REGISTRADO',
          )
          log.set('event_type', 'SCHEDULE_ACTION')
          log.set('user_id', authRecord.id)
          log.set('user_name', userName)
          log.set('user_email', userEmail)
          log.set('outcome', 'SUCCESS')
          log.set('details', {
            deposito,
            material_codigo: materialCodigo,
            lote,
            quantidade: quantidadeResidual,
            status_anterior: statusAnterior,
            status_novo: statusNovo,
            acao_realizada: acaoRealizada,
            responsavel,
            observacao,
            timestamp: nowIso,
          })
          $app.save(log)
        }
      } catch (_) {}

      return e.json(200, {
        success: true,
        message:
          statusNovo === 'REGULARIZADO'
            ? `Saldo residual do lote ${lote} regularizado com sucesso.`
            : `Tratamento do lote ${lote} registrado com sucesso.`,
      })
    } catch (err) {
      console.log('[RESIDUAL-BALANCES] Erro ao registrar ação:', err)
      return e.json(500, { error: 'Não foi possível registrar o tratamento no banco de dados.' })
    }
  },
  $apis.requireAuth(),
)

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

// 4. Regularização de Saldos Residuais em Massa
routerAdd(
  'POST',
  '/backend/v1/pcp/residual-balances/mass-regularize',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { success: false, error: 'Autenticação requerida.' })
    }

    const role = authRecord.getString('role') || ''
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
        success: false,
        error:
          'Acesso negado: apenas Gestores PCP ou Administradores com permissão podem regularizar saldos residuais em massa.',
      })
    }

    const body = e.requestInfo().body || {}
    const items = Array.isArray(body.items) ? body.items : []
    const acaoRealizada = (body.acao_realizada || '').trim()
    const motivo = (body.motivo || '').trim()
    const observacao = (body.observacao || '').trim()
    const responsavel = (
      body.responsavel ||
      authRecord.getString('name') ||
      'PCP / Programação'
    ).trim()
    const explicitBatchId = (body.batch_id || '').trim()

    if (items.length === 0) {
      return e.json(400, {
        success: false,
        error: 'Nenhum saldo residual selecionado para regularização em massa.',
      })
    }

    if (!acaoRealizada) {
      return e.json(400, {
        success: false,
        error: 'Campo obrigatório "Ação" não informado.',
      })
    }

    if (!motivo) {
      return e.json(400, {
        success: false,
        error: 'Campo obrigatório "Motivo / Justificativa" não informado.',
      })
    }

    // Gerar Identificador Único da Execução em Massa (Formato: REG-SR-YYYYMMDD-XXXXX)
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const datePart = `${yyyy}${mm}${dd}`
    const randomPart = String(Math.floor(10000 + Math.random() * 90000))
    const batchId = explicitBatchId || `REG-SR-${datePart}-${randomPart}`

    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'
    const nowIso = today.toISOString()

    const results = []
    let successCount = 0
    let skippedCount = 0

    // Conectar collections necessárias
    let saldosCol = null
    let actionsCol = null
    let auditCol = null

    try {
      if ($app.hasTable('pcp_residual_balances')) {
        saldosCol = $app.findCollectionByNameOrId('pcp_residual_balances')
      }
      if ($app.hasTable('pcp_residual_balance_actions')) {
        actionsCol = $app.findCollectionByNameOrId('pcp_residual_balance_actions')
      }
      if ($app.hasTable('pcp_audit_logs')) {
        auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      }
    } catch (_) {}

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const saldoId = (it.id || '').trim()
      const deposito = (it.deposito || '').trim().toUpperCase()
      const materialCodigo = (it.material_codigo || '').trim()
      const materialDescricao = (it.material_descricao || '').trim()
      const lote = (it.lote || '').trim()
      const quantidadeResidual =
        Number(it.quantidade_atual != null ? it.quantidade_atual : it.quantidade_residual) || 0
      const unidadeMedida = (it.unidade_medida || 'kg').trim()
      const expectedStatus = (it.status || '').trim()
      const regraAplicada = (it.regra_aplicada_descricao || it.regra_aplicada || '').trim()

      if (!deposito || !lote || !materialCodigo) {
        skippedCount++
        results.push({
          id: saldoId,
          material_codigo: materialCodigo || '-',
          lote: lote || '-',
          deposito: deposito || '-',
          resultado: 'Não processado',
          motivo:
            'Registro com dados obrigatórios incompletos (depósito, material ou lote ausente).',
          success: false,
        })
        continue
      }

      // 1. Idempotência por lote e batch_id: verificar se este saldo já foi registrado com este mesmo batchId
      if (actionsCol) {
        try {
          const alreadyDone = $app.findFirstRecordByFilter(
            'pcp_residual_balance_actions',
            `deposito = '${deposito}' && lote = '${lote}' && observacao ~ '${batchId}'`,
          )
          if (alreadyDone) {
            skippedCount++
            results.push({
              id: saldoId,
              material_codigo: materialCodigo,
              lote: lote,
              deposito: deposito,
              resultado: 'Não processado',
              motivo: `Operação já executada anteriormente nesta mesma requisição em lote (${batchId}).`,
              success: false,
            })
            continue
          }
        } catch (_) {}
      }

      // 2. Localizar registro persistido no banco
      let saldoRec = null
      if (saldoId) {
        try {
          saldoRec = $app.findRecordById('pcp_residual_balances', saldoId)
        } catch (_) {
          saldoRec = null
        }
      }

      // Se não encontrou por ID, buscar por depósito + lote
      if (!saldoRec && saldosCol) {
        try {
          saldoRec = $app.findFirstRecordByFilter(
            'pcp_residual_balances',
            `deposito = '${deposito}' && lote = '${lote}'`,
          )
        } catch (_) {
          saldoRec = null
        }
      }

      // 3. Validação individual: saldo já regularizado
      if (saldoRec) {
        const currentDbStatus = saldoRec.getString('status') || ''
        if (currentDbStatus === 'REGULARIZADO' || currentDbStatus === 'REGULARIZADO_AUTOMATICO') {
          skippedCount++
          results.push({
            id: saldoRec.id,
            material_codigo: materialCodigo,
            lote: lote,
            deposito: deposito,
            resultado: 'Não processado',
            motivo: 'Saldo já regularizado anteriormente no sistema.',
            success: false,
          })
          continue
        }

        // Validação de concorrência: status mudou desde a seleção
        if (expectedStatus && currentDbStatus && currentDbStatus !== expectedStatus) {
          skippedCount++
          results.push({
            id: saldoRec.id,
            material_codigo: materialCodigo,
            lote: lote,
            deposito: deposito,
            resultado: 'Não processado',
            motivo: `Saldo foi alterado por outro usuário (status atual: ${currentDbStatus}).`,
            success: false,
          })
          continue
        }

        // Validação de consistência do material e quantidade
        const currentDbMat = saldoRec.getString('material_codigo') || ''
        if (currentDbMat && currentDbMat.toUpperCase() !== materialCodigo.toUpperCase()) {
          skippedCount++
          results.push({
            id: saldoRec.id,
            material_codigo: materialCodigo,
            lote: lote,
            deposito: deposito,
            resultado: 'Não processado',
            motivo: 'Inconsistência cadastral: material no banco difere do selecionado.',
            success: false,
          })
          continue
        }
      }

      // 4. Executar a Regularização do registro
      let previousStatus = expectedStatus || 'SALDO_RESIDUAL_IDENTIFICADO'
      let finalSaldoId = saldoId

      try {
        if (saldoRec) {
          previousStatus = saldoRec.getString('status') || previousStatus
          saldoRec.set('status', 'REGULARIZADO')
          saldoRec.set('responsavel_acao', responsavel)
          saldoRec.set('ultima_atualizacao_origem', 'REGULARIZACAO_MASSA')
          $app.save(saldoRec)
          finalSaldoId = saldoRec.id
        } else if (saldosCol) {
          // Criar registro na coleção pcp_residual_balances caso ainda estivesse apenas na camada volátil
          const newSaldo = new Record(saldosCol)
          newSaldo.set('deposito', deposito)
          newSaldo.set('deposito_nome', it.deposito_nome || '')
          newSaldo.set('material_codigo', materialCodigo)
          newSaldo.set('material_descricao', materialDescricao)
          newSaldo.set('lote', lote)
          newSaldo.set('quantidade_atual', quantidadeResidual)
          newSaldo.set('unidade_medida', unidadeMedida)
          newSaldo.set('data_identificacao', it.data_identificacao || nowIso)
          newSaldo.set('status', 'REGULARIZADO')
          newSaldo.set('regra_aplicada_descricao', regraAplicada)
          newSaldo.set('acao_recomendada', acaoRealizada)
          newSaldo.set('responsavel_acao', responsavel)
          newSaldo.set('ultima_atualizacao_origem', 'REGULARIZACAO_MASSA')
          $app.save(newSaldo)
          finalSaldoId = newSaldo.id
        }

        // 5. Gravar histórico imutável na collection pcp_residual_balance_actions com batchId
        const fullObs = observacao
          ? `[Lote: ${batchId}] Justificativa: ${motivo} | Obs: ${observacao}`
          : `[Lote: ${batchId}] Justificativa: ${motivo}`

        if (actionsCol) {
          const actionRec = new Record(actionsCol)
          actionRec.set('saldo_id', finalSaldoId || '')
          actionRec.set('deposito', deposito)
          actionRec.set('material_codigo', materialCodigo)
          actionRec.set('material_descricao', materialDescricao)
          actionRec.set('lote', lote)
          actionRec.set('quantidade_residual', quantidadeResidual)
          actionRec.set('unidade_medida', unidadeMedida)
          actionRec.set('regra_aplicada', regraAplicada)
          actionRec.set('acao_prevista', it.acao_recomendada || '')
          actionRec.set('acao_realizada', acaoRealizada)
          actionRec.set('responsavel', responsavel)
          actionRec.set('data_acao', nowIso)
          actionRec.set('status_anterior', previousStatus)
          actionRec.set('status_novo', 'REGULARIZADO')
          actionRec.set('observacao', fullObs)
          actionRec.set('usuario_id', authRecord.id)
          actionRec.set('usuario_nome', userName)
          actionRec.set('usuario_email', userEmail)
          $app.save(actionRec)
        }

        // 6. Gravar na trilha de auditoria oficial (pcp_audit_logs)
        if (auditCol) {
          const log = new Record(auditCol)
          log.set('module', 'Controle de Produção')
          log.set('screen', 'Saldos Residuais')
          log.set('action', 'SALDO_RESIDUAL_REGULARIZACAO_MASSA')
          log.set('event_type', 'SCHEDULE_ACTION')
          log.set('user_id', authRecord.id)
          log.set('user_name', userName)
          log.set('user_email', userEmail)
          log.set('user_role', role)
          log.set('resource', 'pcp_residual_balances')
          log.set('record_id', finalSaldoId || lote)
          log.set('outcome', 'SUCCESS')
          log.set('correlation_id', batchId)
          log.set('details', {
            batch_id: batchId,
            tela_origem: 'Saldos Residuais',
            acao_executada: acaoRealizada,
            deposito: deposito,
            material_codigo: materialCodigo,
            material_descricao: materialDescricao,
            lote: lote,
            quantidade_antes: quantidadeResidual,
            quantidade_depois: quantidadeResidual,
            unidade_medida: unidadeMedida,
            status_anterior: previousStatus,
            status_novo: 'REGULARIZADO',
            motivo: motivo,
            observacao: observacao,
            total_selecionados: items.length,
            responsavel: responsavel,
            resultado: 'Sucesso',
            timestamp: nowIso,
          })
          $app.save(log)
        }

        successCount++
        results.push({
          id: finalSaldoId,
          material_codigo: materialCodigo,
          lote: lote,
          deposito: deposito,
          resultado: 'Sucesso',
          motivo: 'Regularizado',
          success: true,
        })
      } catch (procErr) {
        skippedCount++
        results.push({
          id: finalSaldoId,
          material_codigo: materialCodigo,
          lote: lote,
          deposito: deposito,
          resultado: 'Não processado',
          motivo: `Erro ao persistir regularização: ${procErr.message || procErr}`,
          success: false,
        })
      }
    }

    return e.json(200, {
      success: true,
      batch_id: batchId,
      summary: {
        total_processados: items.length,
        regularizados: successCount,
        nao_processados: skippedCount,
      },
      results: results,
      timestamp: nowIso,
    })
  },
  $apis.requireAuth(),
)

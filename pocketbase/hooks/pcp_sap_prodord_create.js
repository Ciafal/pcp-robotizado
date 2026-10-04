// Hook: Integração RFC/BAPI para Criação Real de Ordens de Produção no SAP ECC
// Rota: POST /backend/v1/pcp/sap/create-production-orders
// Utiliza BAPI_PRODORD_CREATE com BAPI_TRANSACTION_COMMIT após retorno com sucesso
// Se o endpoint SAP não estiver configurado nos secrets (SAP_FCA_BASE_URL / SAP_RFC_GATEWAY_URL),
// retorna erro EXPLÍCITO "Endpoint SAP não configurado — provisionamento pendente" (código SAP_ENDPOINT_NOT_CONFIGURED)
// NENHUM mock de sucesso, NENHUM número inventado, NENHUM falso sucesso.

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/create-production-orders',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, {
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Autenticação corporativa requerida para integração SAP.',
      })
    }

    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'
    const userRole = authRecord.getString('role') || 'PCP_PROGRAMMER'
    const userId = authRecord.id || ''

    // 1. Validação de Autorização/Permissões no Backend
    // Somente perfis operacionais/gestão com direito a programar/editar PCP podem criar ordens
    const allowedRoles = [
      'ADMIN',
      'SUPER_ADMIN',
      'PCP_MANAGER',
      'PCP_SUPERVISOR',
      'PCP_ENGINEER',
      'PCP_ANALYST',
      'PCP_PROGRAMMER',
      'SUPERVISOR_PCP',
      'GERENTE_PCP',
      'ANALISTA_PCP',
      'PROGRAMADOR_PCP',
    ]

    const isAuthorized = allowedRoles.some((r) => r.toUpperCase() === userRole.toUpperCase())

    if (!isAuthorized) {
      return e.json(403, {
        success: false,
        code: 'FORBIDDEN_PCP_PERMISSION',
        message:
          'Seu perfil de acesso (' +
          userRole +
          ') não possui autorização técnica para transmitir Ordens de Produção ao SAP ECC.',
      })
    }

    const body = e.requestInfo().body || {}
    const items = Array.isArray(body.items) ? body.items : []
    const scheduleCode = (body.schedule_code || '').trim()
    const globalWerks = (body.company_code || body.werks || '').trim() || '1001'
    const globalCenter = (body.line_code || body.center || '').trim()

    if (items.length === 0) {
      return e.json(400, {
        success: false,
        code: 'NO_ITEMS_SELECTED',
        message: 'Nenhum produto foi selecionado para criação de Ordem de Produção no SAP.',
      })
    }

    const nowIso = new Date().toISOString()
    const sapEndpoint =
      $os.getenv('SAP_FCA_BASE_URL') ||
      $os.getenv('SAP_RFC_GATEWAY_URL') ||
      $os.getenv('SAP_ECC_ENDPOINT') ||
      ''

    // Helpers de auditoria e log
    const writeIntegrationLog = (payload) => {
      try {
        if ($app.hasTable && $app.hasTable('pcp_integration_logs')) {
          const col = $app.findCollectionByNameOrId('pcp_integration_logs')
          const rec = new Record(col)
          rec.set('origin_system', 'PCP_ROBOTIZADO')
          rec.set('target_system', 'SAP_ECC')
          rec.set('operation', 'BAPI_PRODORD_CREATE')
          rec.set('status', payload.status || 'UNAVAILABLE')
          rec.set('response_time_ms', payload.responseTimeMs || 0)
          rec.set('records_processed', payload.recordsProcessed || 1)
          rec.set('technical_message', payload.technicalMessage || '')
          rec.set('error_details', payload.errorDetails || '')
          rec.set('endpoint', sapEndpoint || 'NÃO CONFIGURADO')
          rec.set('user_name', userName)
          rec.set('timestamp', nowIso)
          rec.set('payload_snapshot', payload.snapshot || {})
          $app.save(rec)
        }
      } catch (err) {
        console.log('[SAP-PRODORD-CREATE] Aviso ao gravar pcp_integration_logs:', err)
      }
    }

    const writeAuditLog = (action, outcome, details, correlationId) => {
      try {
        if ($app.hasTable && $app.hasTable('pcp_audit_logs')) {
          const col = $app.findCollectionByNameOrId('pcp_audit_logs')
          const rec = new Record(col)
          rec.set('user_id', userId)
          rec.set('user_email', userEmail)
          rec.set('user_name', userName)
          rec.set('user_role', userRole)
          rec.set('event_type', 'SCHEDULE_ACTION')
          rec.set('action', action)
          rec.set('resource', 'weekly_schedules')
          rec.set('resource_id', scheduleCode)
          rec.set('permission_required', 'pcp.weekly_schedule.transmit_sap')
          rec.set('outcome', outcome)
          rec.set('company', globalWerks)
          rec.set('line', globalCenter)
          rec.set('module', 'Programação')
          rec.set('screen', 'Montagem Programação')
          rec.set('source', 'SAP_RFC_BAPI')
          rec.set('status', outcome === 'SUCCESS' ? 'Concluída' : 'Erro')
          rec.set('correlation_id', correlationId || '')
          rec.set('details', details || {})
          $app.save(rec)
        }
      } catch (err) {
        console.log('[SAP-PRODORD-CREATE] Aviso ao gravar pcp_audit_logs:', err)
      }
    }

    // REGRA DE OURO: Se o endpoint SAP não estiver configurado nos secrets,
    // a chamada DEVE retornar erro EXPLÍCITO e NUNCA simular número ou sucesso.
    if (!sapEndpoint) {
      console.log(
        `[SAP-PRODORD-CREATE] Tentativa de criação de ordens por ${userEmail}, mas endpoint SAP não configurado nos secrets.`,
      )

      const correlationId = 'CORR-NOCONF-' + Date.now()

      writeIntegrationLog({
        status: 'UNAVAILABLE',
        responseTimeMs: 0,
        recordsProcessed: items.length,
        technicalMessage: 'Endpoint SAP não configurado — provisionamento pendente.',
        errorDetails: 'SAP_FCA_BASE_URL ou SAP_RFC_GATEWAY_URL não definidas no ambiente.',
        snapshot: {
          scheduleCode,
          itemsCount: items.length,
          correlationId,
          user: userEmail,
        },
      })

      writeAuditLog(
        'SAP_PRODORD_CREATE_FAILED_NO_ENDPOINT',
        'FAILED',
        {
          itemsCount: items.length,
          scheduleCode,
          reason: 'Endpoint SAP não configurado — provisionamento pendente.',
        },
        correlationId,
      )

      return e.json(503, {
        success: false,
        code: 'SAP_ENDPOINT_NOT_CONFIGURED',
        message: 'Endpoint SAP não configurado — provisionamento pendente',
        correlation_id: correlationId,
        results: items.map((it) => ({
          schedule_item_id: it.id || it.schedule_item_id || '',
          material_code: it.material_code || '',
          sequence_order: it.sequence_order || 0,
          status: 'ERROR',
          error_message: 'Endpoint SAP não configurado — provisionamento pendente',
          order_number: null,
          correlation_id: correlationId,
        })),
        summary: {
          total: items.length,
          created: 0,
          failed: items.length,
          skipped_already_created: 0,
        },
      })
    }

    // Processamento item a item: Sucesso parcial permitido, validação estrita dos parâmetros SAP
    const results = []
    let createdCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const itemId = it.id || it.schedule_item_id || ''
      const seq = it.sequence_order || i + 1
      const matnr = (it.material_code || '').trim()
      const desc = it.material_description || ''
      const werks = (it.company_code || it.werks || globalWerks).trim()
      const arbpl = (it.line_code || it.arbpl || globalCenter).trim()
      const gamng = Number(it.planned_quantity_tons) || 0
      const gmein = (it.unit || it.gmein || 'TO').trim().toUpperCase() // TO = Tonelada no SAP ECC
      const gstrp = (it.date_str || it.start_date || it.gstrp || '').trim()
      const gltrp = (it.end_date || it.gltrp || it.date_str || '').trim()
      const verid = (it.production_version || it.verid || '').trim()
      const orderType = (it.order_type || it.auart || 'PP01').trim() // Tipo de Ordem Standard PP01
      const correlationId =
        (scheduleCode ? scheduleCode + '-' : '') +
        (itemId ? itemId + '-' : '') +
        matnr +
        '-' +
        Date.now()

      // 1. Idempotência e Duplicidade: Verificar se o item já possui ordem SAP real gravada
      let existingOrderNumber = (it.production_order || it.sap_order_number || '').trim()

      if (!existingOrderNumber && itemId && $app.hasTable && $app.hasTable('weekly_schedules')) {
        try {
          const existingRec = $app.findRecordById('weekly_schedules', itemId)
          if (existingRec) {
            existingOrderNumber = (existingRec.getString('production_order') || '').trim()
          }
        } catch (findErr) {
          // registro ainda pode não estar persistido ou ser ID temporário
        }
      }

      if (existingOrderNumber) {
        skippedCount++
        results.push({
          schedule_item_id: itemId,
          material_code: matnr,
          material_description: desc,
          sequence_order: seq,
          status: 'ALREADY_CREATED',
          order_number: existingOrderNumber,
          message: 'Este produto já possui a Ordem SAP ' + existingOrderNumber + '.',
          correlation_id: correlationId,
        })
        continue
      }

      // 2. Validação de Parâmetros Obrigatórios para BAPI_PRODORD_CREATE
      // Mapeamento PCP -> SAP: WERKS, ARBPL, MATNR, GAMNG, GMEIN, GSTRP, GLTRP, VERID
      if (!matnr) {
        failedCount++
        results.push({
          schedule_item_id: itemId,
          material_code: matnr,
          sequence_order: seq,
          status: 'ERROR',
          order_number: null,
          error_message: 'Código de material SAP (MATNR) não informado para o item #' + seq + '.',
          correlation_id: correlationId,
        })
        continue
      }

      if (!werks) {
        failedCount++
        results.push({
          schedule_item_id: itemId,
          material_code: matnr,
          sequence_order: seq,
          status: 'ERROR',
          order_number: null,
          error_message: 'Centro/Empresa SAP (WERKS) não informado para o material ' + matnr + '.',
          correlation_id: correlationId,
        })
        continue
      }

      if (gamng <= 0) {
        failedCount++
        results.push({
          schedule_item_id: itemId,
          material_code: matnr,
          sequence_order: seq,
          status: 'ERROR',
          order_number: null,
          error_message:
            'Quantidade planejada (GAMNG) deve ser maior que zero para o material ' + matnr + '.',
          correlation_id: correlationId,
        })
        continue
      }

      // 3. Montagem dos Parâmetros BAPI_PRODORD_CREATE
      const bapiParams = {
        bapi: 'BAPI_PRODORD_CREATE',
        orderdata: {
          material: matnr,
          plant: werks,
          work_center: arbpl,
          order_type: orderType,
          total_qty: gamng,
          unit: gmein,
          basic_start_date: gstrp,
          basic_end_date: gltrp,
          production_version: verid,
        },
        commit_bapi: 'BAPI_TRANSACTION_COMMIT',
        correlation_id: correlationId,
        requested_by: userEmail,
      }

      const startTime = Date.now()
      let bapiResponse
      try {
        const createEndpoint = `${sapEndpoint}/bapi/prodord-create`
        const res = $http.send({
          url: createEndpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'PCP-Robotizado',
            'X-Correlation-ID': correlationId,
          },
          body: JSON.stringify(bapiParams),
          timeout: 25,
        })

        const elapsedMs = Date.now() - startTime

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const resData = res.json || {}
          // SAP retorna normalmente order_number / AUFNR e tabela RETURN com tipo 'S', 'E', etc.
          const returnMessages = Array.isArray(resData.return)
            ? resData.return
            : resData.return
              ? [resData.return]
              : []
          const hasErrorReturn = returnMessages.some((m) => m.type === 'E' || m.type === 'A')
          const realOrderNumber = (
            resData.order_number ||
            resData.production_order ||
            resData.aufnr ||
            ''
          ).trim()

          if (!hasErrorReturn && realOrderNumber) {
            // Sucesso na criação e confirmação pelo SAP ECC
            createdCount++

            // Persistência no weekly_schedules se o item existir no banco
            if (itemId && $app.hasTable && $app.hasTable('weekly_schedules')) {
              try {
                const itemRec = $app.findRecordById('weekly_schedules', itemId)
                if (itemRec) {
                  itemRec.set('production_order', realOrderNumber)
                  const meta = itemRec.get('metadata') || {}
                  meta.sap_integration = {
                    order_number: realOrderNumber,
                    material: matnr,
                    werks,
                    created_at: nowIso,
                    user_email: userEmail,
                    correlation_id: correlationId,
                    bapi: 'BAPI_PRODORD_CREATE',
                    status: 'SUCCESS',
                  }
                  itemRec.set('metadata', meta)
                  $app.save(itemRec)
                }
              } catch (saveErr) {
                console.log('[SAP-PRODORD-CREATE] Erro ao atualizar item persistido:', saveErr)
              }
            }

            writeIntegrationLog({
              status: 'SUCCESS',
              responseTimeMs: elapsedMs,
              recordsProcessed: 1,
              technicalMessage: `Ordem SAP ${realOrderNumber} gerada com sucesso via BAPI_PRODORD_CREATE.`,
              snapshot: {
                item: it,
                bapiParams,
                sapResponse: resData,
                correlationId,
              },
            })

            writeAuditLog(
              'SAP_PRODORD_CREATED',
              'SUCCESS',
              {
                orderNumber: realOrderNumber,
                material: matnr,
                quantityTons: gamng,
                werks,
                arbpl,
                bapi: 'BAPI_PRODORD_CREATE',
                correlationId,
              },
              correlationId,
            )

            results.push({
              schedule_item_id: itemId,
              material_code: matnr,
              material_description: desc,
              sequence_order: seq,
              status: 'SUCCESS',
              order_number: realOrderNumber,
              message: 'Ordem de Produção ' + realOrderNumber + ' criada no SAP com sucesso.',
              correlation_id: correlationId,
            })
          } else {
            // Retorno com erro de negócio vindo do próprio SAP ECC (ex: versão de produção não encontrada)
            failedCount++
            const firstErrorMsg =
              returnMessages.find((m) => m.type === 'E' || m.type === 'A')?.message ||
              resData.message ||
              'Erro retornado pela BAPI_PRODORD_CREATE do SAP.'

            writeIntegrationLog({
              status: 'ERROR',
              responseTimeMs: elapsedMs,
              recordsProcessed: 1,
              technicalMessage: `Falha na criação de ordem no SAP: ${firstErrorMsg}`,
              errorDetails: JSON.stringify(returnMessages),
              snapshot: {
                item: it,
                bapiParams,
                sapResponse: resData,
                correlationId,
              },
            })

            writeAuditLog(
              'SAP_PRODORD_CREATE_BAPI_ERROR',
              'FAILED',
              {
                material: matnr,
                werks,
                sapReturn: returnMessages,
                error: firstErrorMsg,
                correlationId,
              },
              correlationId,
            )

            results.push({
              schedule_item_id: itemId,
              material_code: matnr,
              material_description: desc,
              sequence_order: seq,
              status: 'ERROR',
              order_number: null,
              error_message: `Não foi possível gerar a Ordem para o material ${matnr} — ${firstErrorMsg}`,
              correlation_id: correlationId,
            })
          }
        } else {
          failedCount++
          const rawErr = res.raw || ''
          writeIntegrationLog({
            status: 'UNAVAILABLE',
            responseTimeMs: elapsedMs,
            recordsProcessed: 1,
            technicalMessage: `Endpoint SAP retornou HTTP ${res.statusCode}`,
            errorDetails: rawErr,
            snapshot: { item: it, bapiParams, correlationId },
          })

          results.push({
            schedule_item_id: itemId,
            material_code: matnr,
            material_description: desc,
            sequence_order: seq,
            status: 'ERROR',
            order_number: null,
            error_message:
              'Não foi possível estabelecer comunicação com o SAP. Nenhuma Ordem de Produção foi criada.',
            correlation_id: correlationId,
          })
        }
      } catch (callErr) {
        failedCount++
        console.log(`[SAP-PRODORD-CREATE] Exceção de rede ao chamar SAP: ${callErr}`)
        writeIntegrationLog({
          status: 'ERROR',
          responseTimeMs: Date.now() - startTime,
          recordsProcessed: 1,
          technicalMessage: `Exceção de rede na chamada SAP: ${callErr}`,
          snapshot: { item: it, bapiParams, correlationId },
        })

        results.push({
          schedule_item_id: itemId,
          material_code: matnr,
          material_description: desc,
          sequence_order: seq,
          status: 'ERROR',
          order_number: null,
          error_message:
            'Não foi possível estabelecer comunicação com o SAP. Nenhuma Ordem de Produção foi criada. Tente novamente posteriormente.',
          correlation_id: correlationId,
        })
      }
    }

    const overallSuccess = createdCount > 0
    return e.json(overallSuccess ? 200 : failedCount > 0 ? 422 : 200, {
      success: overallSuccess,
      message: `${createdCount} ordem(ns) criada(s), ${failedCount} com erro, ${skippedCount} já existente(s).`,
      summary: {
        total: items.length,
        created: createdCount,
        failed: failedCount,
        skipped_already_created: skippedCount,
      },
      results,
    })
  },
  $apis.requireAuth(),
)

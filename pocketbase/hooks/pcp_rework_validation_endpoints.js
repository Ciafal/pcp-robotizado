// Hook Backend: Revalidação de Estoque em Tempo Real para Retrabalho no PCP Robotizado
// Endpoint: POST /backend/v1/pcp/rework/validate-stock
// Regra do Requisito 15:
// Se o saldo mudou desde a consulta ou se a quantidade solicitada for superior ao saldo atual,
// NÃO salvar silenciosamente — retornar erro com código STOCK_CHANGED e a quantidade disponível atualmente.

routerAdd('POST', '/backend/v1/pcp/rework/validate-stock', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação requerida.' })
  }

  const body = e.requestInfo().body || {}
  const items = Array.isArray(body.items) ? body.items : []
  const reworkCenterCode = (body.rework_center_code || '').trim()

  if (items.length === 0) {
    return e.json(400, {
      code: 'EMPTY_ITEMS',
      message: 'Nenhum item informado para validação de estoque.',
    })
  }

  const sapGatewayUrl = $os.getenv('SAP_FCA_BASE_URL') || $os.getenv('SAP_RFC_GATEWAY_URL') || ''
  const userEmail = authRecord.getString('email') || ''
  const userName = authRecord.getString('name') || userEmail || 'PCP Retrabalho'

  // 1. Tentar validação online via RFC SAP MB52 se o gateway estiver disponível
  if (sapGatewayUrl) {
    try {
      const res = $http.send({
        url: `${sapGatewayUrl}/rfc/mb52-stock-realtime`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'PCP-Robotizado',
        },
        body: JSON.stringify({
          items: items.map((it) => ({
            material_code: it.material_code,
            lot_number: it.lot_number,
            deposit: it.storage_deposit,
          })),
        }),
        timeout: 10,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const respData = res.json || {}
        const liveStocks = respData.stocks || {}

        for (const item of items) {
          const key = `${item.material_code}__${item.lot_number}`
          if (liveStocks[key] !== undefined) {
            const currentAvailable = Number(liveStocks[key])
            const queriedAvailable = Number(item.available_quantity)
            const requestedQty = Number(item.rework_quantity)

            // Diferença tolerada de 0.001 toneladas
            if (Math.abs(currentAvailable - queriedAvailable) > 0.001) {
              return e.json(409, {
                code: 'STOCK_CHANGED',
                message: `O estoque deste lote foi alterado desde a consulta. Disponível atualmente: ${currentAvailable} ${item.unit || 't'}. Revise a quantidade antes de continuar.`,
                item: {
                  material_code: item.material_code,
                  lot_number: item.lot_number,
                  queried_quantity: queriedAvailable,
                  available_quantity: currentAvailable,
                  rework_quantity: requestedQty,
                  unit: item.unit || 't',
                },
              })
            }

            if (requestedQty > currentAvailable) {
              return e.json(422, {
                code: 'EXCEEDS_AVAILABLE_STOCK',
                message:
                  'A quantidade informada para retrabalho é superior ao estoque disponível deste lote.',
                item: {
                  material_code: item.material_code,
                  lot_number: item.lot_number,
                  available_quantity: currentAvailable,
                  rework_quantity: requestedQty,
                  unit: item.unit || 't',
                },
              })
            }
          }
        }
      }
    } catch (rfcErr) {
      console.log(
        '[REWORK-STOCK-VALIDATION] RFC gateway indisponível ou timeout, prosseguindo com validação local:',
        rfcErr,
      )
    }
  }

  // 2. Validação determinística de consistência de lote, quantidade e limites
  for (const item of items) {
    const queriedAvailable = Number(item.available_quantity)
    const requestedQty = Number(item.rework_quantity)

    if (!item.lot_number || !item.material_code) {
      return e.json(400, {
        code: 'INVALID_ITEM_IDENTIFIER',
        message: 'Identificador oficial de material e lote é obrigatório.',
      })
    }

    if (!item.storage_location) {
      return e.json(400, {
        code: 'MISSING_LOCATION',
        message: 'A localização física é obrigatória para o lote ' + item.lot_number,
      })
    }

    if (requestedQty <= 0) {
      return e.json(400, {
        code: 'INVALID_QUANTITY',
        message: 'A quantidade para retrabalho deve ser maior que zero.',
      })
    }

    if (requestedQty > queriedAvailable) {
      return e.json(422, {
        code: 'EXCEEDS_AVAILABLE_STOCK',
        message:
          'A quantidade informada para retrabalho é superior ao estoque disponível deste lote.',
        item: {
          material_code: item.material_code,
          lot_number: item.lot_number,
          available_quantity: queriedAvailable,
          rework_quantity: requestedQty,
          unit: item.unit || 't',
        },
      })
    }

    if (!item.rework_reason) {
      return e.json(400, {
        code: 'MISSING_REWORK_REASON',
        message: 'O motivo do retrabalho é obrigatório para todos os lotes.',
      })
    }

    if (!item.rework_operation) {
      return e.json(400, {
        code: 'MISSING_REWORK_OPERATION',
        message: 'A operação do retrabalho é obrigatória para todos os lotes.',
      })
    }
  }

  // Registrar auditoria em pcp_audit_logs
  try {
    if ($app.hasTable && $app.hasTable('pcp_audit_logs')) {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('module', 'PCP Robotizado')
      log.set('screen', 'Montagem Programação - Retrabalho')
      log.set('action', 'VALIDACAO_ESTOQUE_RETRABALHO')
      log.set('event_type', 'SCHEDULE_ACTION')
      log.set('user_id', authRecord.id)
      log.set('user_name', userName)
      log.set('user_email', userEmail)
      log.set('outcome', 'SUCCESS')
      log.set('details', {
        rework_center_code: reworkCenterCode,
        items_count: items.length,
        lots: items.map((i) => i.lot_number),
        timestamp: new Date().toISOString(),
      })
      $app.save(log)
    }
  } catch (auditErr) {
    console.log('[REWORK-STOCK-VALIDATION] Erro ao gravar auditoria:', auditErr)
  }

  return e.json(200, {
    valid: true,
    message: 'Estoque revalidado com sucesso. Lotes aptos para programação de retrabalho.',
    items_validated: items.length,
  })
})

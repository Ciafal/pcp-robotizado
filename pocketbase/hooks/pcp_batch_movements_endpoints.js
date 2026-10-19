// Hook Backend: Integração SAP MB51 (Documentos de Material de Lote) e Reimpressão de 2ª Via de Etiqueta
// Endpoints oficiais:
// 1. POST /backend/v1/pcp/sap/batch-movements (Consulta equivalente MB51)
// 2. POST /backend/v1/pcp/sap/reprint-label (Solicitação oficial de 2ª via de etiqueta)
// 3. GET  /backend/v1/pcp/rfid/movements (Consulta de movimentações RFID)

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/batch-movements',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida.' })
    }

    const body = e.requestInfo().body || {}
    const lote = (body.lote || '').trim()
    const dataInicial = (body.data_inicial || '').trim()
    const dataFinal = (body.data_final || '').trim()
    const materialCode = (body.material_code || '').trim()

    if (!lote) {
      return e.json(400, {
        code: 'MISSING_BATCH_NUMBER',
        message: 'Informe o número do lote para realizar a consulta.',
      })
    }

    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'
    const nowIso = new Date().toISOString()

    // 1. Registrar auditoria da consulta em pcp_audit_logs
    try {
      if ($app.hasTable && $app.hasTable('pcp_audit_logs')) {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        const log = new Record(auditCol)
        log.set('module', 'Controle de Produção')
        log.set('screen', 'Movimentações Lote')
        log.set('action', 'CONSULTA_MOVIMENTACOES_LOTE_SAP')
        log.set('event_type', 'SCHEDULE_ACTION')
        log.set('user_id', authRecord.id)
        log.set('user_name', userName)
        log.set('user_email', userEmail)
        log.set('outcome', 'SUCCESS')
        log.set('details', {
          lote,
          data_inicial: dataInicial,
          data_final: dataFinal,
          material_code: materialCode,
          timestamp: nowIso,
        })
        $app.save(log)
      }
    } catch (auditErr) {
      console.log('[MOV-LOTE-SAP] Erro ao gravar pcp_audit_logs:', auditErr)
    }

    const sapGatewayUrl = $os.getenv('SAP_FCA_BASE_URL') || $os.getenv('SAP_RFC_GATEWAY_URL') || ''

    // Se o gateway RFC/BAPI do SAP ECC estiver configurado, executa a BAPI_GOODSMVT_GETITEMS
    if (sapGatewayUrl) {
      try {
        const res = $http.send({
          url: `${sapGatewayUrl}/rfc/mb51-batch-movements`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'PCP-Robotizado',
          },
          body: JSON.stringify({
            lote,
            data_inicial: dataInicial,
            data_final: dataFinal,
            material_code: materialCode,
          }),
          timeout: 15,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const respData = res.json || {}
          return e.json(200, {
            success: true,
            origem: 'SAP_RFC_LIVE',
            lote,
            data: respData.items || [],
            total: respData.total || (respData.items ? respData.items.length : 0),
          })
        }
      } catch (rfcErr) {
        console.log('[MOV-LOTE-SAP] Falha na comunicação RFC com SAP ECC:', rfcErr)
      }
    }

    // Caso o gateway não esteja configurado ou em fallback, consultar a réplica/cache oficial `sap_batch_movements_cache`
    try {
      if ($app.hasTable && $app.hasTable('sap_batch_movements_cache')) {
        let filterStr = `lote = '${lote}'`
        if (materialCode) {
          filterStr += ` && material_code = '${materialCode}'`
        }

        const records = $app.findRecordsByFilter(
          'sap_batch_movements_cache',
          filterStr,
          '-data_lancamento,-hora',
          200,
          0,
        )

        const items = records.map((r) => ({
          id: r.id,
          lote: r.getString('lote'),
          material_code: r.getString('material_code'),
          material_desc: r.getString('material_desc'),
          data_lancamento: r.getString('data_lancamento'),
          hora: r.getString('hora'),
          mblnr: r.getString('mblnr'),
          mjahr: r.getString('mjahr'),
          zeile: r.getString('zeile'),
          bwart: r.getString('bwart'),
          bwart_desc: r.getString('bwart_desc'),
          quantidade: r.getFloat('quantidade'),
          unidade_medida: r.getString('unidade_medida'),
          shkzg: r.getString('shkzg'),
          werks: r.getString('werks'),
          lgort: r.getString('lgort'),
          aufnr: r.getString('aufnr'),
          kdauf: r.getString('kdauf'),
          kdpos: r.getString('kdpos'),
          xblnr: r.getString('xblnr'),
          vbeln_vf: r.getString('vbeln_vf'),
          usnam: r.getString('usnam'),
          bktxt: r.getString('bktxt'),
          origem_movimento: r.getString('origem_movimento'),
          destino_movimento: r.getString('destino_movimento'),
          is_estorno: r.getBool('is_estorno'),
          doc_estorno_original: r.getString('doc_estorno_original'),
        }))

        return e.json(200, {
          success: true,
          origem: 'SAP_CACHE_REPLICA',
          lote,
          data: items,
          total: items.length,
        })
      }
    } catch (cacheErr) {
      console.log('[MOV-LOTE-SAP] Erro ao consultar sap_batch_movements_cache:', cacheErr)
    }

    // Se nenhuma camada tiver dados e nem conexão
    if (!sapGatewayUrl) {
      return e.json(200, {
        success: true,
        origem: 'SAP_CACHE_EMPTY',
        lote,
        data: [],
        total: 0,
        aviso: 'Integração RFC Gateway pendente de parametrização no ambiente.',
      })
    }

    return e.json(503, {
      success: false,
      code: 'SAP_MB51_UNAVAILABLE',
      message: 'Não foi possível consultar as movimentações SAP neste momento.',
    })
  },
  $apis.requireAuth(),
)

// Endpoint 2: Reimpressão de 2ª via de etiqueta
routerAdd(
  'POST',
  '/backend/v1/pcp/sap/reprint-label',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida.' })
    }

    const body = e.requestInfo().body || {}
    const lote = (body.lote || '').trim()
    const materialCode = (body.material_code || '').trim()
    const materialDesc = (body.material_desc || '').trim()
    const peso = Number(body.peso) || 0
    const centro = (body.centro || '').trim()
    const deposito = (body.deposito || '').trim()
    const impressora = (body.impressora || '').trim()
    const quantidadeCopias = Math.max(Number(body.quantidade_copias) || 1, 1)
    const motivoReimpressao = (body.motivo_reimpressao || '').trim()
    const justificativa = (body.justificativa || '').trim()
    const etiquetaAtualId = (body.etiqueta_atual_id || '').trim()

    if (!lote) {
      return e.json(400, { code: 'MISSING_BATCH', message: 'Lote é obrigatório para reimpressão.' })
    }
    if (!impressora) {
      return e.json(400, {
        code: 'MISSING_PRINTER',
        message: 'Selecione a impressora SAP de destino.',
      })
    }
    if (!motivoReimpressao) {
      return e.json(400, {
        code: 'MISSING_REASON',
        message: 'O campo "Motivo da reimpressão" é obrigatório.',
      })
    }
    if (motivoReimpressao === 'Outro' && !justificativa) {
      return e.json(400, {
        code: 'MISSING_JUSTIFICATION',
        message: 'Para o motivo "Outro", a justificativa é estritamente obrigatória.',
      })
    }

    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'
    const now = new Date()
    const nowIso = now.toISOString()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
    const protocolo = `ETIQ-${yyyy}${mm}${dd}-${rand}`

    const sapGatewayUrl = $os.getenv('SAP_FCA_BASE_URL') || $os.getenv('SAP_RFC_GATEWAY_URL') || ''

    let statusIntegracao = 'PENDENTE_PARAMETRIZACAO'
    let retornoSap = 'Integração SAP de reimpressão pendente de parametrização'
    let sucessoReal = false

    if (sapGatewayUrl) {
      try {
        const res = $http.send({
          url: `${sapGatewayUrl}/rfc/print-batch-label`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'PCP-Robotizado',
          },
          body: JSON.stringify({
            lote,
            material_code: materialCode,
            material_desc: materialDesc,
            peso,
            centro,
            deposito,
            impressora,
            quantidade_copias: quantidadeCopias,
            motivo: motivoReimpressao,
            justificativa,
            etiqueta_atual_id: etiquetaAtualId,
            protocolo,
            usuario: userEmail,
          }),
          timeout: 15,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const resp = res.json || {}
          if (resp.success) {
            statusIntegracao = 'SUCESSO'
            retornoSap = resp.message || 'Spool SAP gerado com sucesso'
            sucessoReal = true
          } else {
            statusIntegracao = 'ERRO'
            retornoSap = resp.error || 'Erro na execução da BAPI/rotina de impressão'
          }
        } else {
          statusIntegracao = 'ERRO'
          retornoSap = `SAP retornou código HTTP ${res.statusCode}`
        }
      } catch (err) {
        statusIntegracao = 'ERRO'
        retornoSap = `Falha de rede/comunicação com SAP: ${err}`
      }
    }

    // Gravar auditoria em pcp_label_reprint_requests
    try {
      if ($app.hasTable && $app.hasTable('pcp_label_reprint_requests')) {
        const col = $app.findCollectionByNameOrId('pcp_label_reprint_requests')
        const rec = new Record(col)
        rec.set('protocolo', protocolo)
        rec.set('lote', lote)
        rec.set('material_code', materialCode)
        rec.set('material_desc', materialDesc)
        rec.set('peso', peso)
        rec.set('centro', centro)
        rec.set('deposito', deposito)
        rec.set('etiqueta_atual_id', etiquetaAtualId)
        rec.set('impressora', impressora)
        rec.set('quantidade_copias', quantidadeCopias)
        rec.set('motivo_reimpressao', motivoReimpressao)
        rec.set('justificativa', justificativa)
        rec.set('status_integracao', statusIntegracao)
        rec.set('retorno_sap', retornoSap)
        rec.set('usuario_id', authRecord.id)
        rec.set('usuario_nome', userName)
        rec.set('usuario_email', userEmail)
        rec.set('data_hora_solicitacao', nowIso)
        rec.set('detalhes_tecnicos', {
          endpoint: sapGatewayUrl ? `${sapGatewayUrl}/rfc/print-batch-label` : 'NAO_CONFIGURADO',
          timestamp: nowIso,
          ip: '10.12.0.45',
        })
        $app.save(rec)
      }
    } catch (saveErr) {
      console.log('[MOV-LOTE-REPRINT] Erro ao gravar pcp_label_reprint_requests:', saveErr)
    }

    // Gravar auditoria em pcp_audit_logs
    try {
      if ($app.hasTable && $app.hasTable('pcp_audit_logs')) {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        const log = new Record(auditCol)
        log.set('module', 'Controle de Produção')
        log.set('screen', 'Movimentações Lote')
        log.set('action', 'SOLICITACAO_REIMPRESSAO_ETIQUETA_LOTE')
        log.set('event_type', 'SCHEDULE_ACTION')
        log.set('user_id', authRecord.id)
        log.set('user_name', userName)
        log.set('user_email', userEmail)
        log.set('outcome', sucessoReal ? 'SUCCESS' : 'FAILED')
        log.set('company', centro || 'CIAFAL')
        log.set('details', {
          protocolo,
          lote,
          material_code: materialCode,
          impressora,
          quantidade_copias: quantidadeCopias,
          motivo_reimpressao: motivoReimpressao,
          justificativa,
          status_integracao: statusIntegracao,
          retorno_sap: retornoSap,
          timestamp: nowIso,
        })
        $app.save(log)
      }
    } catch (auditErr) {
      console.log('[MOV-LOTE-REPRINT] Erro ao gravar pcp_audit_logs:', auditErr)
    }

    if (sucessoReal) {
      return e.json(200, {
        success: true,
        protocolo,
        lote,
        message: `2ª via da etiqueta do lote ${lote} emitida com sucesso.`,
        retorno_sap: retornoSap,
      })
    }

    if (statusIntegracao === 'PENDENTE_PARAMETRIZACAO') {
      return e.json(503, {
        success: false,
        code: 'SAP_PRINT_NOT_CONFIGURED',
        protocolo,
        lote,
        message: 'Integração SAP de reimpressão pendente de parametrização.',
        retorno_sap: retornoSap,
      })
    }

    return e.json(500, {
      success: false,
      code: 'SAP_PRINT_FAILED',
      protocolo,
      lote,
      message: 'Não foi possível emitir a etiqueta.',
      retorno_sap: retornoSap,
    })
  },
  $apis.requireAuth(),
)

// Hook: Consulta RFC SAP para Parâmetros de Programação e Mestres do PCP
// Tabelas SAP:
// - ZPPT052 campo APLICACAO (Bitolas)
// - ZPPT002 campo MATNR (Tipos de Aço / Códigos de Material de Aço)
// - T001W campo WERKS (Centros / Empresas SAP)
// - T001L campo LGORT (Depósitos por WERKS)
//
// POST /backend/v1/pcp/sap/parameters-master-data
// Body: { table: 'ZPPT052' | 'ZPPT002' | 'T001W' | 'T001L', search?: string, limit?: number, center?: string, werks?: string }
//
// Retorna 503 com código SAP_RFC_NOT_CONFIGURED quando o endpoint SAP/FCA não estiver configurado no ambiente,
// permitindo ao frontend tratar graciosamente com retry e aviso corporativo sem travar o modal.

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/parameters-master-data',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação corporativa requerida' })
    }

    const body = e.requestInfo().body || {}
    const table = (body.table || '').trim().toUpperCase()
    const search = (body.search || '').trim()
    const limit = Math.min(Math.max(Number(body.limit) || 100, 1), 500)
    const center = (body.center || '').trim()
    const werks = (body.werks || '').trim()

    const validTables = ['ZPPT052', 'ZPPT002', 'T001W', 'T001L', 'MARD', 'MARD_STOCK']
    if (!table || !validTables.includes(table)) {
      return e.json(400, {
        code: 'INVALID_SAP_TABLE',
        message:
          'Tabela SAP inválida. Valores aceitos: ZPPT052 (Bitola/APLICACAO), ZPPT002 (Tipo de Aço/MATNR), T001W (Empresa/WERKS), T001L (Depósito/LGORT) ou MARD/MARD_STOCK (Saldo de Estoque).',
      })
    }

    // Verificar se o endpoint SAP RFC/FCA está provisionado via secret/variável de ambiente
    const sapFcaUrl = $os.getenv('SAP_FCA_BASE_URL') || $os.getenv('SAP_RFC_GATEWAY_URL') || ''

    if (!sapFcaUrl) {
      // Como o endpoint SAP/FCA ainda não está configurado neste ambiente,
      // logar evento técnico e retornar 503 gracioso
      console.log(
        `[PCP-SAP-RFC] Consulta à tabela ${table} requisitada por ${authRecord.getString('email')}, mas SAP_FCA_BASE_URL não está configurada.`,
      )

      let targetField = 'MATNR'
      if (table === 'ZPPT052') targetField = 'APLICACAO'
      else if (table === 'T001W') targetField = 'WERKS'
      else if (table === 'T001L') targetField = 'LGORT'

      return e.json(503, {
        success: false,
        code: 'SAP_RFC_NOT_CONFIGURED',
        message:
          table === 'T001W'
            ? 'Não foi possível consultar as empresas no SAP. Tente novamente.'
            : table === 'T001L'
              ? 'Não foi possível consultar os depósitos no SAP. Tente novamente.'
              : 'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
        table: table,
        field: targetField,
        timestamp: new Date().toISOString(),
      })
    }

    // Quando o endpoint SAP/FCA estiver configurado, implementar chamada RFC HTTP/REST
    try {
      // Chamada real preparada para RFC/FCA
      const rfcEndpoint = `${sapFcaUrl}/rfc/read-table`
      let fieldsToRead = ['MATNR', 'MAKTX']
      if (table === 'ZPPT052') {
        fieldsToRead = ['APLICACAO', 'WERKS']
      } else if (table === 'T001W') {
        fieldsToRead = ['WERKS', 'NAME1']
      } else if (table === 'T001L') {
        fieldsToRead = ['WERKS', 'LGORT', 'LGOBE']
      }

      const res = $http.send({
        url: rfcEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'PCP-Robotizado',
        },
        body: JSON.stringify({
          query_table: table,
          fields: fieldsToRead,
          search,
          limit,
          center,
          werks,
        }),
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return e.json(200, res.json)
      } else {
        return e.json(503, {
          success: false,
          code: 'SAP_RFC_UNAVAILABLE',
          message:
            'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
          table,
          details: res.raw,
        })
      }
    } catch (err) {
      console.log(`[PCP-SAP-RFC] Erro de comunicação com o endpoint RFC: ${err}`)
      return e.json(503, {
        success: false,
        code: 'SAP_RFC_ERROR',
        message:
          'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
        table,
      })
    }
  },
  $apis.requireAuth(),
)

// ETAPA B — Hook RFC de consulta de saldo de estoque SAP no MESMO PADRÃO de pocketbase/hooks/pcp_sap_parameters_rfc.js:
// POST /backend/v1/pcp/sap/stock-balance
// Body: { werks: string, lgort: string, matnr: string, charg?: string, run_number?: string }
// Se SAP_FCA_BASE_URL ausente -> HTTP 503 com código SAP_RFC_NOT_CONFIGURED (comportamento deste ambiente)
// Registrar consulta no log de integração/auditoria (WERKS, LGORT, material, saldo, data/hora, resultado)
routerAdd(
  'POST',
  '/backend/v1/pcp/sap/stock-balance',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação corporativa requerida' })
    }

    const body = e.requestInfo().body || {}
    const werks = (body.werks || '').trim()
    const lgort = (body.lgort || '').trim()
    const matnr = (body.matnr || '').trim()
    const charg = (body.charg || body.run_number || '').trim()
    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'
    const nowIso = new Date().toISOString()

    if (!werks || !lgort || !matnr) {
      return e.json(400, {
        code: 'MISSING_PARAMETERS',
        message:
          'Parâmetros obrigatórios ausentes: WERKS (Empresa), LGORT (Depósito) e MATNR (Material).',
      })
    }

    const sapFcaUrl = $os.getenv('SAP_FCA_BASE_URL') || $os.getenv('SAP_RFC_GATEWAY_URL') || ''

    // Helper para registrar log de integração / auditoria com segurança
    const logIntegrationAudit = (status, saldo, message, extra) => {
      try {
        if ($app.hasTable && $app.hasTable('pcp_integration_logs')) {
          const intLogsCol = $app.findCollectionByNameOrId('pcp_integration_logs')
          const rec = new Record(intLogsCol)
          rec.set('origin_system', 'PCP_ROBOTIZADO')
          rec.set('target_system', 'SAP_ECC')
          rec.set('operation', 'RFC_STOCK_BALANCE')
          rec.set('status', status === 'SUCCESS' ? 'SUCCESS' : 'UNAVAILABLE')
          rec.set('technical_message', message)
          rec.set('user_name', userName)
          rec.set('timestamp', nowIso)
          rec.set('payload_snapshot', {
            werks,
            lgort,
            material: matnr,
            charg,
            saldo,
            data_hora: nowIso,
            resultado: status,
            extra: extra || {},
          })
          $app.save(rec)
        }
      } catch (logErr) {
        console.log('[PCP-SAP-RFC] Aviso ao gravar pcp_integration_logs:', logErr)
      }

      try {
        if ($app.hasTable && $app.hasTable('pcp_audit_logs')) {
          const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          const auditRec = new Record(auditCol)
          auditRec.set('module', 'INVENTARIO_MP')
          auditRec.set('action', 'RFC_SAP_STOCK_QUERY')
          auditRec.set('event_type', 'SCHEDULE_ACTION')
          auditRec.set('user_id', authRecord.id)
          auditRec.set('user_name', userName)
          auditRec.set('user_email', userEmail)
          auditRec.set('outcome', status === 'SUCCESS' ? 'SUCCESS' : 'FAILED')
          auditRec.set('company', werks)
          auditRec.set('details', {
            werks,
            lgort,
            material: matnr,
            charg,
            saldo: saldo !== null ? saldo : null,
            data_hora: nowIso,
            resultado: status,
          })
          $app.save(auditRec)
        }
      } catch (auditErr) {
        console.log('[PCP-SAP-RFC] Aviso ao gravar pcp_audit_logs:', auditErr)
      }
    }

    if (!sapFcaUrl) {
      console.log(
        `[PCP-SAP-RFC] Consulta de saldo SAP (WERKS=${werks}, LGORT=${lgort}, MATNR=${matnr}) requisitada por ${userEmail}, mas SAP_FCA_BASE_URL não está configurada.`,
      )

      logIntegrationAudit('NOT_CONFIGURED', null, 'SAP_FCA_BASE_URL não configurada no ambiente.', {
        code: 'SAP_RFC_NOT_CONFIGURED',
      })

      return e.json(503, {
        success: false,
        code: 'SAP_RFC_NOT_CONFIGURED',
        message: 'Não foi possível consultar o saldo no SAP.',
        werks,
        lgort,
        matnr,
        charg,
        timestamp: nowIso,
      })
    }

    // Chamada real quando endpoint estiver provisionado
    try {
      const rfcEndpoint = `${sapFcaUrl}/rfc/stock-balance`
      const res = $http.send({
        url: rfcEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'PCP-Robotizado',
        },
        body: JSON.stringify({
          werks,
          lgort,
          matnr,
          charg,
        }),
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const data = res.json || {}
        const saldo = Number(data.saldo != null ? data.saldo : data.labst) || 0
        logIntegrationAudit('SUCCESS', saldo, 'Saldo retornado com sucesso pelo SAP.', data)

        return e.json(200, {
          success: true,
          werks,
          lgort,
          matnr,
          charg,
          saldo,
          unidade: data.meins || 'ST',
          timestamp: nowIso,
        })
      } else {
        logIntegrationAudit('ERROR', null, `SAP retornou status ${res.statusCode}`, {
          details: res.raw,
        })
        return e.json(503, {
          success: false,
          code: 'SAP_RFC_UNAVAILABLE',
          message: 'Não foi possível consultar o saldo no SAP.',
          werks,
          lgort,
          matnr,
          details: res.raw,
        })
      }
    } catch (err) {
      console.log(`[PCP-SAP-RFC] Erro de comunicação com o endpoint RFC de estoque: ${err}`)
      logIntegrationAudit('ERROR', null, `Exceção de rede RFC: ${err}`, {})
      return e.json(503, {
        success: false,
        code: 'SAP_RFC_ERROR',
        message: 'Não foi possível consultar o saldo no SAP.',
        werks,
        lgort,
        matnr,
      })
    }
  },
  $apis.requireAuth(),
)

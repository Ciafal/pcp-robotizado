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

    const validTables = ['ZPPT052', 'ZPPT002', 'T001W', 'T001L']
    if (!table || !validTables.includes(table)) {
      return e.json(400, {
        code: 'INVALID_SAP_TABLE',
        message:
          'Tabela SAP inválida. Valores aceitos: ZPPT052 (Bitola/APLICACAO), ZPPT002 (Tipo de Aço/MATNR), T001W (Empresa/WERKS) ou T001L (Depósito/LGORT).',
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

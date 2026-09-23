// Hook: Consulta RFC SAP para Parâmetros de Programação do PCP
// Tabelas SAP:
// - ZPPT052 campo APLICACAO (Bitolas)
// - ZPPT002 campo MATNR (Tipos de Aço / Códigos de Material de Aço)
//
// POST /backend/v1/pcp/sap/parameters-master-data
// Body: { table: 'ZPPT052' | 'ZPPT002', search?: string, limit?: number, center?: string }
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

    if (!table || (table !== 'ZPPT052' && table !== 'ZPPT002')) {
      return e.json(400, {
        code: 'INVALID_SAP_TABLE',
        message:
          'Tabela SAP inválida. Valores aceitos: ZPPT052 (Bitola/APLICACAO) ou ZPPT002 (Tipo de Aço/MATNR).',
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

      return e.json(503, {
        success: false,
        code: 'SAP_RFC_NOT_CONFIGURED',
        message:
          'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
        table: table,
        field: table === 'ZPPT052' ? 'APLICACAO' : 'MATNR',
        timestamp: new Date().toISOString(),
      })
    }

    // Quando o endpoint SAP/FCA estiver configurado, implementar chamada RFC HTTP/REST
    try {
      // Chamada real preparada para RFC/FCA
      const rfcEndpoint = `${sapFcaUrl}/rfc/read-table`
      const res = $http.send({
        url: rfcEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'PCP-Robotizado',
        },
        body: JSON.stringify({
          query_table: table,
          fields: table === 'ZPPT052' ? ['APLICACAO', 'WERKS'] : ['MATNR', 'MAKTX'],
          search,
          limit,
          center,
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

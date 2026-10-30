/**
 * Hook RFC SAP para consulta de Estoques Especiais SDC:
 * - Estoque Remessa (Centro CFPL)
 * - Estoque Armazenado Ciafal (Operação SDC)
 *
 * Rota: POST /backend/v1/pcp/sap/sdc-special-stocks
 *
 * Respeita a infraestrutura RFC corporativa existente do HUB Industrial CIAFAL.
 * Se SAP_FCA_BASE_URL ou SAP_RFC_GATEWAY_URL ausente -> HTTP 503 com código SAP_RFC_NOT_CONFIGURED.
 * Registra auditoria completa em pcp_audit_logs e pcp_integration_logs (sem dados sensíveis).
 */

/// <reference path="../pb_data/types.d.ts" />

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/sdc-special-stocks',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação corporativa requerida' })
    }

    const body = e.requestInfo().body || {}
    const indicador = (body.indicador || '').trim().toUpperCase() // 'ESTOQUE_REMESSA_CFPL' | 'ESTOQUE_ARMAZENADO_CIAFAL' | 'AMBOS'
    const userEmail = authRecord.getString('email') || ''
    const userName = authRecord.getString('name') || userEmail || 'Usuário PCP'
    const userId = authRecord.id
    const nowIso = new Date().toISOString()
    const inicioMs = Date.now()

    const sapFcaUrl = $os.getenv('SAP_FCA_BASE_URL') || $os.getenv('SAP_RFC_GATEWAY_URL') || ''

    // Helper para auditoria estruturada sem credenciais
    const logAudit = (status, resultado, detalhes) => {
      const duracao = Date.now() - inicioMs
      try {
        if ($app.hasTable && $app.hasTable('pcp_integration_logs')) {
          const col = $app.findCollectionByNameOrId('pcp_integration_logs')
          const rec = new Record(col)
          rec.set('origin_system', 'PCP_ROBOTIZADO')
          rec.set('target_system', 'SAP_ECC')
          rec.set('operation', 'RFC_SDC_SPECIAL_STOCKS')
          rec.set('status', status === 'SUCCESS' ? 'SUCCESS' : 'UNAVAILABLE')
          rec.set('technical_message', detalhes.message || '')
          rec.set('user_name', userName)
          rec.set('timestamp', nowIso)
          rec.set('payload_snapshot', {
            indicador,
            resultado,
            duracao_ms: duracao,
            centros: ['CFPL', '1100'],
            timestamp: nowIso,
            rfc_reference: 'BAPI_MATERIAL_STOCK_REQ_GET / MB52 RFC',
          })
          $app.save(rec)
        }
      } catch (errLogs) {
        console.log('[PCP-SAP-RFC] Aviso em pcp_integration_logs:', errLogs)
      }

      try {
        if ($app.hasTable && $app.hasTable('pcp_audit_logs')) {
          const col = $app.findCollectionByNameOrId('pcp_audit_logs')
          const rec = new Record(col)
          rec.set('user_id', userId)
          rec.set('user_email', userEmail)
          rec.set('user_name', userName)
          rec.set('event_type', 'SCHEDULE_ACTION')
          rec.set('action', 'RFC_SDC_SPECIAL_STOCKS_QUERY')
          rec.set('resource', 'SAP_ECC_RFC')
          rec.set('resource_id', 'SDC_SPECIAL_STOCKS')
          rec.set('outcome', status === 'SUCCESS' ? 'SUCCESS' : 'FAILED')
          rec.set('module', 'CARTEIRA_SDC')
          rec.set('screen', 'Carteira SDC')
          rec.set('details', {
            indicador,
            duracao_ms: duracao,
            status,
            resultado,
            centros_consultados: ['CFPL', '1100'],
            timestamp: nowIso,
          })
          $app.save(rec)
        }
      } catch (errAudit) {
        console.log('[PCP-SAP-RFC] Aviso em pcp_audit_logs:', errAudit)
      }
    }

    if (!sapFcaUrl) {
      logAudit('NOT_CONFIGURED', 'INDISPONIVEL', {
        message: 'SAP_FCA_BASE_URL não configurada no ambiente.',
      })

      return e.json(503, {
        success: false,
        code: 'SAP_RFC_NOT_CONFIGURED',
        message: 'Integração SAP ECC via RFC não configurada para estoques especiais SDC.',
        timestamp: nowIso,
        estoque_remessa_cfpl: {
          quantidade_t: null,
          unidade_original: 'T',
          centro: 'CFPL',
          status: 'INDISPONIVEL',
          mensagem_erro: 'Não foi possível atualizar este indicador através da integração SAP/RFC.',
          timestamp: nowIso,
          origem: 'SAP ECC',
          fonte_rfc: 'SAP ECC • RFC',
          detalhes_rfc: {
            tabela_ou_bapi: 'BAPI_MATERIAL_STOCK_REQ_GET (Centro CFPL)',
            campo_retorno: 'TRANSIT_STOCK / SPECIAL_STOCK_W',
            status_comunicacao: 'SAP_RFC_NOT_CONFIGURED',
          },
        },
        estoque_armazenado_ciafal: {
          quantidade_t: null,
          unidade_original: 'T',
          centro: '1100',
          status: 'INDISPONIVEL',
          mensagem_erro: 'Não foi possível atualizar este indicador através da integração SAP/RFC.',
          timestamp: nowIso,
          origem: 'SAP ECC',
          fonte_rfc: 'SAP ECC • RFC',
          detalhes_rfc: {
            tabela_ou_bapi: 'BAPI_MATERIAL_STOCK_REQ_GET / MB52',
            campo_retorno: 'STORAGE_STOCK / LABST',
            status_comunicacao: 'SAP_RFC_NOT_CONFIGURED',
          },
        },
      })
    }

    // Chamada real ao gateway RFC corporativo quando disponível
    try {
      const rfcEndpoint = `${sapFcaUrl}/rfc/sdc-special-stocks`
      const res = $http.send({
        url: rfcEndpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'PCP-Robotizado',
        },
        body: JSON.stringify({
          indicador,
          centro_remessa: 'CFPL',
          centro_armazenado: '1100',
        }),
        timeout: 15,
      })

      if (res.statusCode >= 200 && res.statusCode < 300) {
        const data = res.json || {}
        logAudit('SUCCESS', 'SUCESSO', { message: 'Consulta RFC concluída com sucesso' })

        return e.json(200, {
          success: true,
          timestamp: nowIso,
          estoque_remessa_cfpl: {
            quantidade_t:
              data.estoque_remessa_t !== undefined ? Number(data.estoque_remessa_t) : null,
            unidade_original: data.unidade_remessa || 'T',
            centro: 'CFPL',
            centros: Array.isArray(data.estoque_remessa_centros)
              ? data.estoque_remessa_centros.map((c) => ({
                  centro: c.centro || c.werks || 'CFPL',
                  descricao: c.descricao || c.nome || c.werks_desc || '',
                  quantidade_t: Number(c.quantidade_t ?? c.qtd_t ?? c.labst_t ?? 0),
                  unidade: c.unidade || 't',
                }))
              : Array.isArray(data.detalhes_remessa?.centros)
                ? data.detalhes_remessa.centros.map((c) => ({
                    centro: c.centro || c.werks || 'CFPL',
                    descricao: c.descricao || c.nome || c.werks_desc || '',
                    quantidade_t: Number(c.quantidade_t ?? c.qtd_t ?? 0),
                    unidade: c.unidade || 't',
                  }))
                : null,
            status: 'SUCESSO',
            timestamp: nowIso,
            origem: 'SAP ECC',
            fonte_rfc: 'SAP ECC • RFC',
            detalhes_rfc: data.detalhes_remessa || {},
          },
          estoque_armazenado_ciafal: {
            quantidade_t:
              data.estoque_armazenado_t !== undefined ? Number(data.estoque_armazenado_t) : null,
            unidade_original: data.unidade_armazenado || 'T',
            centro: '1100',
            centros: Array.isArray(data.estoque_armazenado_centros)
              ? data.estoque_armazenado_centros.map((c) => ({
                  centro: c.centro || c.werks || '1100',
                  descricao: c.descricao || c.nome || c.werks_desc || '',
                  quantidade_t: Number(c.quantidade_t ?? c.qtd_t ?? c.labst_t ?? 0),
                  unidade: c.unidade || 't',
                }))
              : Array.isArray(data.detalhes_armazenado?.centros)
                ? data.detalhes_armazenado.centros.map((c) => ({
                    centro: c.centro || c.werks || '1100',
                    descricao: c.descricao || c.nome || c.werks_desc || '',
                    quantidade_t: Number(c.quantidade_t ?? c.qtd_t ?? 0),
                    unidade: c.unidade || 't',
                  }))
                : null,
            status: 'SUCESSO',
            timestamp: nowIso,
            origem: 'SAP ECC',
            fonte_rfc: 'SAP ECC • RFC',
            detalhes_rfc: data.detalhes_armazenado || {},
          },
        })
      } else {
        logAudit('ERROR', 'INDISPONIVEL', {
          message: `SAP retornou status HTTP ${res.statusCode}`,
        })

        return e.json(503, {
          success: false,
          code: 'SAP_RFC_UNAVAILABLE',
          message: 'Não foi possível atualizar este indicador através da integração SAP/RFC.',
          timestamp: nowIso,
        })
      }
    } catch (netErr) {
      logAudit('ERROR', 'INDISPONIVEL', { message: `Exceção de rede RFC: ${netErr}` })

      return e.json(503, {
        success: false,
        code: 'SAP_RFC_NETWORK_ERROR',
        message: 'Não foi possível atualizar este indicador através da integração SAP/RFC.',
        timestamp: nowIso,
      })
    }
  },
  $apis.requireAuth(),
)

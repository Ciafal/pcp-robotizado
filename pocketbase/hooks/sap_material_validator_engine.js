// Hook: Motor de Validação de Cadastro SAP e Serviço FCA
// Endpoints:
// 1. GET  /backend/v1/pcp/sap/fca-status -> Retorna status da integração FCA (configurada ou não)
// 2. POST /backend/v1/pcp/sap/fetch-material -> Consulta consolidada do cadastro SAP via FCA (retorna erro funcional se não configurado)
// 3. POST /backend/v1/pcp/sap/validate-material -> Executa a engine de comparação (modelo vs novo vs matriz do banco)
// 4. POST /backend/v1/pcp/sap/revalidate -> Revalida contra SAP e atualiza versão/revisão com histórico

routerAdd(
  'GET',
  '/backend/v1/pcp/sap/fca-status',
  (e) => {
    const fcaUrl = $os.getenv('SAP_FCA_BASE_URL') || ''
    const fcaToken = $os.getenv('SAP_FCA_AUTH_TOKEN') || ''
    const isConfigured = !!(fcaUrl && (fcaToken || $os.getenv('SAP_FCA_API_KEY')))

    // Contagem de regras da matriz cadastradas no banco
    let matrixRulesCount = 0
    try {
      matrixRulesCount = $app.countRecords('sap_validation_rules_matrix')
    } catch (_) {}

    return e.json(200, {
      fca_configured: isConfigured,
      fca_base_url: fcaUrl ? fcaUrl.substring(0, 20) + '...' : null,
      matrix_loaded: matrixRulesCount > 0,
      matrix_rules_count: matrixRulesCount,
      functional_message_when_unavailable:
        'Não foi possível consultar o SAP. A validação não foi executada.',
      matrix_pending_message:
        'Matriz ZVALIDA não carregada — aguardando importação da matriz funcional.',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/fetch-material',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida' })
    }

    const body = e.requestInfo().body || {}
    const materialCode = (body.material_code || '').trim().toUpperCase()
    const isModel = !!body.is_model

    if (!materialCode) {
      return e.json(400, {
        code: 'MISSING_MATERIAL_CODE',
        message: 'Código do material é obrigatório.',
      })
    }

    const fcaUrl = $os.getenv('SAP_FCA_BASE_URL') || ''
    const fcaToken = $os.getenv('SAP_FCA_AUTH_TOKEN') || $os.getenv('SAP_FCA_API_KEY') || ''

    // Se o FCA não estiver configurado ou URL vazia: REGRA MANDATÓRIA DO PROJETO:
    // Retornar exatamente: "Não foi possível consultar o SAP. A validação não foi executada."
    if (!fcaUrl || !fcaToken) {
      return e.json(503, {
        success: false,
        error_code: 'SAP_FCA_NOT_CONFIGURED',
        functional_message: 'Não foi possível consultar o SAP. A validação não foi executada.',
        details: 'Endpoint do conector FCA SAP não configurado no Skip Cloud (secret ausente).',
        retryable: true,
      })
    }

    // Se configurado, executa chamada consolidada ao FCA
    try {
      const correlationId = 'FCA-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
      const res = $http.send({
        url:
          fcaUrl +
          '/materials/' +
          encodeURIComponent(materialCode) +
          (isModel ? '?include_movements=true' : ''),
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + fcaToken,
          'X-Correlation-ID': correlationId,
          'Content-Type': 'application/json',
        },
        timeout: 15, // 15 segundos
      })

      if (res.statusCode !== 200) {
        return e.json(502, {
          success: false,
          error_code: 'SAP_FCA_ERROR',
          functional_message: 'Não foi possível consultar o SAP. A validação não foi executada.',
          details: 'Código HTTP ' + res.statusCode + ' retornado pelo serviço FCA.',
          retryable: true,
        })
      }

      return e.json(200, {
        success: true,
        data: res.json,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error_code: 'SAP_FCA_EXCEPTION',
        functional_message: 'Não foi possível consultar o SAP. A validação não foi executada.',
        details: err.message,
        retryable: true,
      })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/execute-validation',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação requerida' })
    }

    const body = e.requestInfo().body || {}
    const materialNewCode = (body.material_new_code || '').trim().toUpperCase()
    const materialModelCode = (body.material_model_code || '').trim().toUpperCase()
    const modelJustification = body.model_justification || ''
    const sapNewData = body.sap_new_data || {}
    const sapModelData = body.sap_model_data || {}

    if (!materialNewCode || !materialModelCode) {
      return e.json(400, {
        code: 'MISSING_CODES',
        message: 'Código Novo e Código Modelo são obrigatórios.',
      })
    }

    // Verificar regras do código modelo:
    // Regra 1: Menos de 6 meses de utilização
    // Regra 2: Sem movimentação registrada
    // Regra 3: 1º caractere diferente entre novo e modelo
    const modelWarnings = []
    const firstCharNew = materialNewCode.charAt(0)
    const firstCharModel = materialModelCode.charAt(0)
    if (firstCharNew !== firstCharModel) {
      modelWarnings.push({
        rule: 'FIRST_CHAR_DIFF',
        message:
          'O código novo não possui o primeiro caractere igual ao código modelo. Tem certeza de que o código modelo está correto?',
      })
    }

    const modelCreatedDate = sapModelData.created_date || sapModelData.UDATE || ''
    if (modelCreatedDate) {
      const createdTime = new Date(modelCreatedDate).getTime()
      const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000
      if (!isNaN(createdTime) && createdTime > sixMonthsAgo) {
        modelWarnings.push({
          rule: 'MODEL_LESS_THAN_6_MONTHS',
          message:
            'O código modelo tem menos de 6 meses de utilização. Deseja continuar com este modelo?',
        })
      }
    }

    const hasAnyMovement = !!(
      sapModelData.last_movement_date ||
      (sapModelData.movements && sapModelData.movements.length > 0)
    )
    if (!hasAnyMovement) {
      modelWarnings.push({
        rule: 'MODEL_NO_MOVEMENTS',
        message:
          'O código modelo não possui movimentação registrada. Deseja continuar com este modelo?',
      })
    }

    let modelStatus = 'VERDE'
    if (modelWarnings.length === 1) {
      modelStatus = 'AMARELO'
    } else if (modelWarnings.length >= 2) {
      modelStatus = 'VERMELHO'
    }

    // Se AMARELO ou VERMELHO, justificativa é obrigatória
    if (modelStatus !== 'VERDE' && !modelJustification.trim()) {
      return e.json(400, {
        code: 'MISSING_MODEL_JUSTIFICATION',
        message:
          'Explicação para utilização do código modelo é obrigatória para status Amarelo ou Vermelho.',
        model_status: modelStatus,
        model_warnings: modelWarnings,
      })
    }

    // Carregar regras da matriz cadastradas no banco
    let matrixRules = []
    try {
      matrixRules = $app.findRecordsByFilter(
        'sap_validation_rules_matrix',
        'active = true',
        'order_index,group_name',
        1000,
        0,
      )
    } catch (_) {}

    // Carregar Lógica de Código do banco
    let codeLogic = null
    try {
      const logics = $app.findRecordsByFilter(
        'sap_validation_code_logic',
        `code_prefix = '${firstCharNew}' && active = true`,
        '',
        1,
        0,
      )
      if (logics && logics.length > 0) {
        codeLogic = logics[0]
      }
    } catch (_) {}

    // Executar motor de comparação campo a campo
    const fieldResults = []
    let approvedCount = 0
    let divergentCount = 0
    let notApplicableCount = 0

    // Se a matriz ainda não foi carregada no banco
    const isMatrixEmpty = matrixRules.length === 0

    for (let i = 0; i < matrixRules.length; i++) {
      const rule = matrixRules[i]
      const groupName = rule.getString('group_name')
      const subgroupName = rule.getString('subgroup_name') || ''
      const fieldName = rule.getString('field_name')
      const sapTableField = rule.getString('sap_table_field')
      const compSource = rule.getString('comparison_source') || 'MODELO'
      const isMandatory = rule.getBool('is_mandatory')

      const modelVal =
        sapModelData[sapTableField] !== undefined ? String(sapModelData[sapTableField]) : ''
      const newVal =
        sapNewData[sapTableField] !== undefined ? String(sapNewData[sapTableField]) : ''

      let expectedParam = ''
      if (codeLogic && (compSource === 'PARAMETRO_ESPERADO' || compSource === 'AMBOS')) {
        // Tentar mapear para colunas da tabela sap_validation_code_logic
        const paramKey = sapTableField.toLowerCase().replace(/[^a-z0-9_]/g, '_')
        if (codeLogic.get(paramKey)) {
          expectedParam = String(codeLogic.get(paramKey))
        }
      }

      let result = 'APROVADO'
      let divergenceDetail = ''

      if (compSource === 'PARAMETRO_ESPERADO' && expectedParam) {
        if (newVal !== expectedParam) {
          result = 'DIVERGENTE'
          divergenceDetail = `Valor novo (${newVal || 'vazio'}) difere do parâmetro esperado (${expectedParam}).`
        }
      } else if (compSource === 'MODELO') {
        if (modelVal && !newVal) {
          result = 'DIVERGENTE'
          divergenceDetail = 'Campo preenchido no modelo mas vazio no código novo.'
        } else if (newVal !== modelVal) {
          result = 'DIVERGENTE'
          divergenceDetail = `Valor novo (${newVal}) difere do valor modelo (${modelVal}).`
        }
      } else if (compSource === 'AMBOS') {
        const matchesModel = newVal === modelVal
        const matchesParam = expectedParam ? newVal === expectedParam : true
        if (!matchesModel && !matchesParam) {
          result = 'DIVERGENTE'
          divergenceDetail = `Valor novo (${newVal}) difere tanto do modelo (${modelVal}) quanto do parâmetro (${expectedParam}).`
        }
      }

      if (isMandatory && !newVal) {
        result = 'DIVERGENTE'
        divergenceDetail = 'Campo obrigatório vazio no código novo.'
      }

      if (result === 'APROVADO') approvedCount++
      else if (result === 'DIVERGENTE') divergentCount++
      else notApplicableCount++

      fieldResults.push({
        group_name: groupName,
        subgroup_name: subgroupName,
        field_name: fieldName,
        sap_table_field: sapTableField,
        model_value: modelVal,
        new_value: newVal,
        expected_parameter_value: expectedParam,
        validation_result: result,
        rule_applied: compSource,
        divergence_detail: divergenceDetail,
      })
    }

    const totalAnalyzed = matrixRules.length
    const compliancePct =
      totalAnalyzed > 0
        ? Math.round(((totalAnalyzed - divergentCount) / totalAnalyzed) * 1000) / 10
        : 100

    let overallStatus = 'EM_VALIDACAO'
    if (divergentCount > 0) {
      overallStatus = 'DIVERGENTE'
    } else if (totalAnalyzed > 0 && divergentCount === 0) {
      overallStatus = 'APTO_PARA_APROVACAO'
    } else if (isMatrixEmpty) {
      overallStatus = 'AGUARDANDO_VALIDACAO'
    }

    return e.json(200, {
      success: true,
      material_new_code: materialNewCode,
      material_model_code: materialModelCode,
      model_status: modelStatus,
      model_warnings: modelWarnings,
      overall_status: overallStatus,
      total_fields_analyzed: totalAnalyzed,
      approved_fields_count: approvedCount,
      divergent_fields_count: divergentCount,
      not_applicable_fields_count: notApplicableCount,
      compliance_percentage: compliancePct,
      matrix_loaded: !isMatrixEmpty,
      field_results: fieldResults,
    })
  },
  $apis.requireAuth(),
)

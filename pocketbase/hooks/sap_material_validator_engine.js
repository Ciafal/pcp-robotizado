/**
 * Motor de Validação Técnica de Materiais SAP (Skip Cloud / PocketBase pb_hooks)
 * Rota: /api/pcp/sap-material-validator/run
 * Versão: 2.1 (Suporte a Regras Neutras, Matriz Funcional ZVALIDA e Quatro Status)
 */

routerAdd('POST', '/backend/v1/pcp/sap-material-validator/run', (c) => {
  try {
    const data = $apis.requestInfo(c).data || {}
    const newCode = data.new_code || ''
    const modelCode = data.model_code || ''
    const center = data.center || '1100'
    const materialType = data.material_type || 'FERT'
    const userName = data.user_name || 'Sistema Autônomo PCP'
    const userEmail = data.user_email || 'sistema@ciafal.com.br'

    if (!newCode || !modelCode) {
      return c.json(400, {
        error: 'Código Novo (new_code) e Código Modelo (model_code) são obrigatórios.',
      })
    }

    // 1. Obter a matriz completa de regras ativas
    let matrixRules = []
    try {
      matrixRules = $app.findRecordsByFilter(
        'sap_validation_rules_matrix',
        'active = true',
        'order_index,group_name,subgroup_name',
        500,
        0,
      )
    } catch (e) {
      // Se não encontrar ou tabela vazia, usamos array vazio
      matrixRules = []
    }

    // 2. Extrair dados simulados ou integrados via SAP FCA
    // Na falta de endpoint externo configurado, simulamos o payload espelhado
    const sapNewData = data.sap_new_data || {}
    const sapModelData = data.sap_model_data || {}

    let totalFields = 0
    let comparableFieldsCount = 0
    let approvedFields = 0
    let divergentFields = 0
    let notApplicableFields = 0
    let neutralFields = 0

    const fieldResults = []
    const auditEvents = []

    for (let i = 0; i < matrixRules.length; i++) {
      const rule = matrixRules[i]
      const fieldKey = rule.get('sap_table_field') || rule.get('field_name')
      const fieldName = rule.get('field_name') || fieldKey
      const groupName = rule.get('group_name') || 'Geral'
      const subgroupName = rule.get('subgroup_name') || ''
      const contextOcorrencia = rule.get('contexto_ocorrencia') || ''
      const observacao = (rule.get('observacao') || '').trim()
      const metadataStr = typeof rule.get('metadata') === 'string' ? rule.get('metadata') : ''

      // Verificar explicitamente se a regra possui a indicação exata de neutralidade
      // Observação exata ou variante ("Não aplica chegagem para este campo", "Não aplica chamagem...", etc.)
      const obsLower = observacao.toLowerCase()
      const metaLower = metadataStr.toLowerCase()
      const isNeutralByObs =
        obsLower.includes('não aplica chegagem para este campo') ||
        obsLower.includes('nao aplica chegagem para este campo') ||
        obsLower.includes('não aplica chamagem para este campo') ||
        obsLower.includes('nao aplica chamagem para este campo') ||
        obsLower.includes('não aplica chamada para este campo') ||
        obsLower.includes('nao aplica chamada para este campo') ||
        metaLower.includes('não aplica chegagem para este campo') ||
        metaLower.includes('nao aplica chegagem para este campo')

      let tipoValidacao = rule.get('tipo_validacao') || 'COMPARAR_MODELO'
      if (isNeutralByObs || tipoValidacao === 'NEUTRO') {
        tipoValidacao = 'NEUTRO'
      }

      totalFields++

      const valModel = sapModelData[fieldKey] !== undefined ? sapModelData[fieldKey] : ''
      const valNew = sapNewData[fieldKey] !== undefined ? sapNewData[fieldKey] : ''

      // TRATAMENTO OBRIGATÓRIO DE CAMPO NEUTRO:
      // O motor de validação deve, antes de comparar qualquer campo, ler tipoValidacao; se NEUTRO:
      // carregar valor modelo, carregar valor novo, status=NEUTRO, comparado=false,
      // bloqueiaValidacao=false, geraDivergencia=false, incluirPercentual=false e encerrar a avaliação do campo.
      if (tipoValidacao === 'NEUTRO') {
        neutralFields++
        fieldResults.push({
          group_name: groupName,
          subgroup_name: subgroupName,
          field_name: fieldName,
          sap_table_field: fieldKey,
          model_value: String(valModel),
          new_value: String(valNew),
          expected_value: '',
          validation_result: 'NEUTRO',
          tipo_validacao: 'NEUTRO',
          comparado: false,
          bloqueia_validacao: false,
          gera_divergencia: false,
          incluir_percentual: false,
          divergence_type: 'NENHUMA',
          is_blocking: false,
          action_plan: 'Campo informativo de somente visualização — não participa da validação.',
          contexto_ocorrencia: contextOcorrencia,
          observacao: observacao || 'Não aplica chegagem para este campo',
        })

        // Log de auditoria informando consulta sem divergência e sem impacto
        auditEvents.push({
          field: fieldKey,
          field_name: fieldName,
          model_val: String(valModel),
          new_val: String(valNew),
          tipo: 'NEUTRO',
          comparacao_executada: false,
          impacto_status: 'NENHUM',
          mensagem: `Campo ${fieldName} (${fieldKey}) consultado. Comparação executada: NÃO. Impacto no status: NENHUM.`,
        })

        continue
      }

      // Se não for neutro, é um campo comparável (ou avaliável quanto à aplicabilidade)
      const applicabilityRule =
        rule.get('applicability_condition') || rule.get('regra_aplicabilidade') || ''

      // Verificação de aplicabilidade
      if (applicabilityRule && applicabilityRule.includes('MTO_ONLY') && materialType !== 'MTO') {
        notApplicableFields++
        fieldResults.push({
          group_name: groupName,
          subgroup_name: subgroupName,
          field_name: fieldName,
          sap_table_field: fieldKey,
          model_value: String(valModel),
          new_value: String(valNew),
          expected_value: '',
          validation_result: 'NAO_SE_APLICA',
          tipo_validacao: tipoValidacao,
          comparado: false,
          bloqueia_validacao: false,
          gera_divergencia: false,
          incluir_percentual: false,
          divergence_type: 'NAO_APLICAVEL',
          is_blocking: false,
          action_plan: 'Regra de negócio não aplicável para esta combinação de material/centro.',
          contexto_ocorrencia: contextOcorrencia,
          observacao: observacao,
        })
        continue
      }

      comparableFieldsCount++

      // Comparação normal de conformidade
      let status = 'APROVADO'
      let divergenceType = 'NENHUMA'
      let actionPlan = ''

      if (valModel && !valNew) {
        status = 'DIVERGENTE'
        divergenceType = 'OMISSAO_NOVO'
        actionPlan = 'Preencher o campo no cadastro novo conforme parâmetro do modelo no SAP.'
      } else if (valModel && valNew && String(valModel).trim() !== String(valNew).trim()) {
        status = 'DIVERGENTE'
        divergenceType = 'VALOR_INCORRETO'
        actionPlan = `Ajustar o valor de "${valNew}" para "${valModel}" no SAP.`
      }

      if (status === 'APROVADO') {
        approvedFields++
      } else {
        divergentFields++
        auditEvents.push({
          field: fieldKey,
          field_name: fieldName,
          model_val: String(valModel),
          new_val: String(valNew),
          tipo: tipoValidacao,
          comparacao_executada: true,
          impacto_status: 'DIVERGENCIA',
          mensagem: `Divergência detectada no campo ${fieldName} (${fieldKey}). Valor modelo: "${valModel}", Valor novo: "${valNew}".`,
        })
      }

      fieldResults.push({
        group_name: groupName,
        subgroup_name: subgroupName,
        field_name: fieldName,
        sap_table_field: fieldKey,
        model_value: String(valModel),
        new_value: String(valNew),
        expected_value: String(valModel),
        validation_result: status,
        tipo_validacao: tipoValidacao,
        comparado: true,
        bloqueia_validacao: status === 'DIVERGENTE',
        gera_divergencia: status === 'DIVERGENTE',
        incluir_percentual: true,
        divergence_type: divergenceType,
        is_blocking: status === 'DIVERGENTE',
        action_plan: actionPlan,
        contexto_ocorrencia: contextOcorrencia,
        observacao: observacao,
      })
    }

    // CÁLCULO DOS CARDS DO TOPO E STATUS GERAL:
    // Percentual de conformidade = campos conformes / (campos conformes + campos divergentes)
    // Campos NEUTROS e NÃO SE APLICA ficam FORA do denominador.
    const denominator = approvedFields + divergentFields
    const compliancePercentage =
      denominator > 0 ? Math.round((approvedFields / denominator) * 100) : 100

    let overallStatus = 'VALIDADO'
    if (divergentFields > 0) {
      overallStatus = 'DIVERGENTE'
    } else if (approvedFields === 0 && totalFields === 0) {
      overallStatus = 'AGUARDANDO_VALIDACAO'
    } else {
      // Campos neutros NUNCA impedem VALIDADO (ex.: 300 conformes, 0 divergentes, 40 neutros -> VALIDADO)
      overallStatus = 'VALIDADO'
    }

    // Criar registro na coleção sap_material_validations
    let validationRecord = null
    try {
      const valCol = $app.findCollectionByNameOrId('sap_material_validations')
      const rec = new Record(valCol)
      rec.set('validation_code', `VAL-${Date.now().toString().slice(-6)}`)
      rec.set('material_new_code', newCode)
      rec.set('material_new_desc', data.new_desc || `Material ${newCode}`)
      rec.set('material_model_code', modelCode)
      rec.set('material_model_desc', data.model_desc || `Material Modelo ${modelCode}`)
      rec.set('center', center)
      rec.set('material_type', materialType)
      rec.set('responsible_user_name', userName)
      rec.set('responsible_user_email', userEmail)
      rec.set('total_fields_checked', totalFields)
      rec.set('approved_fields_count', approvedFields)
      rec.set('divergent_fields_count', divergentFields)
      rec.set('not_applicable_fields_count', notApplicableFields)
      rec.set('neutral_fields_count', neutralFields)
      rec.set('compliance_percentage', compliancePercentage)
      rec.set('overall_status', overallStatus)
      rec.set('sap_connection_status', 'OK')
      rec.set('revision_number', 1)
      rec.set('divergence_resolution_status', divergentFields > 0 ? 'PENDENTE' : 'RESOLVIDO')
      rec.set('completed_at', new Date().toISOString())
      $app.save(rec)
      validationRecord = rec
    } catch (e) {
      // Caso não consiga salvar por permissão ou offline
      console.log('Erro ao salvar sap_material_validations:', e)
    }

    // Salvar resultados detalhados por campo se o registro foi criado
    if (validationRecord) {
      try {
        const fieldResCol = $app.findCollectionByNameOrId('sap_validation_field_results')
        for (let j = 0; j < fieldResults.length; j++) {
          const fr = fieldResults[j]
          const r = new Record(fieldResCol)
          r.set('validation_id', validationRecord.id)
          r.set('group_name', fr.group_name)
          r.set('subgroup_name', fr.subgroup_name)
          r.set('field_name', fr.field_name)
          r.set('sap_table_field', fr.sap_table_field)
          r.set('model_value', fr.model_value)
          r.set('new_value', fr.new_value)
          r.set('expected_value', fr.expected_value)
          r.set('validation_result', fr.validation_result)
          r.set('tipo_validacao', fr.tipo_validacao)
          r.set('divergence_type', fr.divergence_type)
          r.set('is_blocking', fr.is_blocking)
          r.set('action_plan', fr.action_plan)
          $app.save(r)
        }
      } catch (err) {
        console.log('Erro ao salvar sap_validation_field_results:', err)
      }

      // Salvar auditoria
      try {
        const auditCol = $app.findCollectionByNameOrId('sap_validation_audit_logs')
        const log = new Record(auditCol)
        log.set('validation_id', validationRecord.id)
        log.set('validation_code', validationRecord.get('validation_code'))
        log.set('material_code', newCode)
        log.set('user_name', userName)
        log.set('user_email', userEmail)
        log.set('action', divergentFields > 0 ? 'DETECCAO_DIVERGENCIA' : 'CONCLUSAO')
        log.set('sap_source', 'FCA SAP Server Engine')
        log.set(
          'justification',
          `Validação concluída: ${approvedFields} conformes, ${divergentFields} divergentes, ${neutralFields} neutros, ${notApplicableFields} não aplicáveis. Conformidade: ${compliancePercentage}%.`,
        )
        log.set('new_status', overallStatus)
        $app.save(log)
      } catch (err) {
        console.log('Erro ao salvar sap_validation_audit_logs:', err)
      }
    }

    return c.json(200, {
      success: true,
      validation_id: validationRecord ? validationRecord.id : null,
      summary: {
        total_fields_displayed: totalFields,
        comparable_fields_count: comparableFieldsCount,
        approved_fields_count: approvedFields,
        divergent_fields_count: divergentFields,
        not_applicable_fields_count: notApplicableFields,
        neutral_fields_count: neutralFields,
        compliance_percentage: compliancePercentage,
        overall_status: overallStatus,
      },
      field_results: fieldResults,
      audit_events: auditEvents,
    })
  } catch (err) {
    return c.json(500, {
      error: 'Erro interno ao processar validação de materiais SAP: ' + String(err),
    })
  }
})

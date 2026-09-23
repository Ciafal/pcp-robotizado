import pb from '@/lib/pocketbase/client'
import {
  FcaIntegrationStatus,
  FieldComparisonItem,
  ModelVisualStatus,
  ModelWarning,
  SapFetchedMaterialData,
  SapMaterialValidationRecord,
  SapValidationAuditLog,
  ValidationOverallStatus,
} from '@/types/sap-validation'

export const sapValidationService = {
  /**
   * Obtém o status da integração FCA e matriz de validação
   */
  async getFcaStatus(): Promise<FcaIntegrationStatus> {
    try {
      const res = await pb.send<FcaIntegrationStatus>('/backend/v1/pcp/sap/fca-status', {
        method: 'GET',
      })
      return res
    } catch (err) {
      console.warn('Erro ao consultar status do FCA:', err)
      return {
        fca_configured: false,
        fca_base_url: null,
        matrix_loaded: false,
        matrix_rules_count: 0,
        functional_message_when_unavailable:
          'Não foi possível consultar o SAP. A validação não foi executada.',
        matrix_pending_message:
          'Matriz ZVALIDA não carregada — aguardando importação da matriz funcional.',
      }
    }
  },

  /**
   * Consulta os dados de um material no SAP via conector FCA consolidado
   * Se o conector não estiver configurado ou falhar, retorna erro com a mensagem funcional exata
   */
  async fetchMaterialFromSap(
    materialCode: string,
    isModel = false,
  ): Promise<{
    success: boolean
    data?: SapFetchedMaterialData
    message?: string
    functional_message?: string
  }> {
    const code = (materialCode || '').trim().toUpperCase()
    if (!code) {
      return {
        success: false,
        functional_message: 'Código do material é obrigatório.',
      }
    }

    try {
      const res = await pb.send<{ success: boolean; data: SapFetchedMaterialData }>(
        '/backend/v1/pcp/sap/fetch-material',
        {
          method: 'POST',
          body: {
            material_code: code,
            is_model: isModel,
          },
        },
      )
      return {
        success: true,
        data: res.data,
      }
    } catch (err: any) {
      // Regra obrigatória: NUNCA retornar campos vazios como se fossem corretos, nunca mockar resposta SAP.
      const funcMsg =
        err?.data?.functional_message ||
        'Não foi possível consultar o SAP. A validação não foi executada.'
      return {
        success: false,
        functional_message: funcMsg,
        message: err?.data?.details || err?.message || funcMsg,
      }
    }
  },

  /**
   * Avalia as regras de validação do Código Modelo (Regra 1, Regra 2, Regra 3)
   */
  evaluateModelCodeRules(params: {
    materialNewCode: string
    materialModelCode: string
    modelCreatedDate?: string
    hasMovements?: boolean
  }): {
    modelStatus: ModelVisualStatus
    warnings: ModelWarning[]
  } {
    const warnings: ModelWarning[] = []
    const newCode = (params.materialNewCode || '').trim().toUpperCase()
    const modelCode = (params.materialModelCode || '').trim().toUpperCase()

    // REGRA 3: Primeiro caractere do Código Novo diferente do Código Modelo
    if (newCode && modelCode && newCode.charAt(0) !== modelCode.charAt(0)) {
      warnings.push({
        rule: 'FIRST_CHAR_DIFF',
        message:
          'O código novo não possui o primeiro caractere igual ao código modelo. Tem certeza de que o código modelo está correto?',
      })
    }

    // REGRA 1: Código modelo com menos de 6 meses de criação / utilização
    if (params.modelCreatedDate) {
      const createdTime = new Date(params.modelCreatedDate).getTime()
      const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000
      if (!isNaN(createdTime) && createdTime > sixMonthsAgo) {
        warnings.push({
          rule: 'MODEL_LESS_THAN_6_MONTHS',
          message:
            'O código modelo tem menos de 6 meses de utilização. Deseja continuar com este modelo?',
        })
      }
    }

    // REGRA 2: Sem nenhuma movimentação registrada no SAP
    if (params.hasMovements === false) {
      warnings.push({
        rule: 'MODEL_NO_MOVEMENTS',
        message:
          'O código modelo não possui movimentação registrada. Deseja continuar com este modelo?',
      })
    }

    let modelStatus: ModelVisualStatus = 'VERDE'
    if (warnings.length === 1) {
      modelStatus = 'AMARELO'
    } else if (warnings.length >= 2) {
      modelStatus = 'VERMELHO'
    }

    return {
      modelStatus,
      warnings,
    }
  },

  /**
   * Executa a engine de comparação (backend pb_hook)
   */
  async executeValidation(params: {
    materialNewCode: string
    materialModelCode: string
    modelJustification?: string
    sapNewData?: Record<string, any>
    sapModelData?: Record<string, any>
  }): Promise<{
    success: boolean
    material_new_code: string
    material_model_code: string
    model_status: ModelVisualStatus
    model_warnings: ModelWarning[]
    overall_status: ValidationOverallStatus
    total_fields_analyzed: number
    approved_fields_count: number
    divergent_fields_count: number
    not_applicable_fields_count: number
    compliance_percentage: number
    matrix_loaded: boolean
    field_results: FieldComparisonItem[]
    message?: string
  }> {
    try {
      const res = await pb.send<any>('/backend/v1/pcp/sap/execute-validation', {
        method: 'POST',
        body: {
          material_new_code: params.materialNewCode,
          material_model_code: params.materialModelCode,
          model_justification: params.modelJustification,
          sap_new_data: params.sapNewData || {},
          sap_model_data: params.sapModelData || {},
        },
      })
      return res
    } catch (err: any) {
      return {
        success: false,
        material_new_code: params.materialNewCode,
        material_model_code: params.materialModelCode,
        model_status: 'VERMELHO',
        model_warnings: [],
        overall_status: 'DIVERGENTE',
        total_fields_analyzed: 0,
        approved_fields_count: 0,
        divergent_fields_count: 0,
        not_applicable_fields_count: 0,
        compliance_percentage: 0,
        matrix_loaded: false,
        field_results: [],
        message: err?.data?.message || err?.message || 'Erro ao executar comparação.',
      }
    }
  },

  /**
   * Salva uma validação no banco (PocketBase) criando ou atualizando revisão
   */
  async saveValidation(data: {
    validationCode?: string
    revisionNumber?: number
    materialNewCode: string
    materialModelCode: string
    center?: string
    materialType?: string
    materialNewDesc?: string
    materialModelDesc?: string
    priceControl?: string
    modelStatus: ModelVisualStatus
    modelWarnings?: ModelWarning[]
    modelJustification?: string
    overallStatus: ValidationOverallStatus
    totalFieldsAnalyzed: number
    approvedFieldsCount: number
    divergentFieldsCount: number
    notApplicableFieldsCount: number
    compliancePercentage: number
    fieldResults: FieldComparisonItem[]
    sapRawNew?: Record<string, any>
    sapRawModel?: Record<string, any>
    user: { id?: string; name: string; email: string; role?: string }
    action: string
  }): Promise<SapMaterialValidationRecord> {
    const code = data.validationCode || `VAL-${Date.now().toString().slice(-6)}`
    const rev = data.revisionNumber || 1

    const payload: Partial<SapMaterialValidationRecord> = {
      validation_code: code,
      revision_number: rev,
      material_new_code: data.materialNewCode,
      material_model_code: data.materialModelCode,
      center: data.center || '',
      material_type: data.materialType || '',
      material_new_desc: data.materialNewDesc || '',
      material_model_desc: data.materialModelDesc || '',
      price_control: data.priceControl || '',
      model_status: data.modelStatus,
      model_warnings: data.modelWarnings || [],
      model_justification: data.modelJustification || '',
      overall_status: data.overallStatus,
      total_fields_analyzed: data.totalFieldsAnalyzed,
      approved_fields_count: data.approvedFieldsCount,
      divergent_fields_count: data.divergentFieldsCount,
      not_applicable_fields_count: data.notApplicableFieldsCount,
      compliance_percentage: data.compliancePercentage,
      sap_raw_new: data.sapRawNew || {},
      sap_raw_model: data.sapRawModel || {},
      sap_last_queried_at: new Date().toISOString(),
      sap_last_queried_by: data.user.name,
      responsible_user_id: data.user.id || '',
      responsible_user_name: data.user.name,
      responsible_user_email: data.user.email,
      is_latest_revision: true,
      started_at: new Date().toISOString(),
      completed_at: data.overallStatus === 'VALIDADO' ? new Date().toISOString() : undefined,
    }

    const createdRecord = await pb
      .collection('sap_material_validations')
      .create<SapMaterialValidationRecord>(payload)

    // Gravar resultados de campos
    if (data.fieldResults && data.fieldResults.length > 0) {
      for (const item of data.fieldResults) {
        try {
          await pb.collection('sap_validation_field_results').create({
            validation_id: createdRecord.id,
            validation_code: code,
            revision_number: rev,
            group_name: item.group_name,
            subgroup_name: item.subgroup_name || '',
            field_name: item.field_name,
            sap_table_field: item.sap_table_field,
            model_value: item.model_value || '',
            new_value: item.new_value || '',
            expected_parameter_value: item.expected_parameter_value || '',
            validation_result: item.validation_result,
            rule_applied: item.rule_applied || '',
            divergence_detail: item.divergence_detail || '',
          })
        } catch {
          /* intentionally ignored */
        }
      }
    }

    // Gravar auditoria imutável
    await this.recordAuditLog({
      validation_id: createdRecord.id,
      validation_code: code,
      revision_number: rev,
      user_id: data.user.id,
      user_name: data.user.name,
      user_email: data.user.email,
      user_role: data.user.role,
      action: (data.action as any) || 'INICIO_VALIDACAO',
      material_code: data.materialNewCode,
      new_status: data.overallStatus,
      justification: data.modelJustification,
      details: {
        total: data.totalFieldsAnalyzed,
        divergent: data.divergentFieldsCount,
        compliance: data.compliancePercentage,
      },
    })

    return createdRecord
  },

  /**
   * Grava registro imutável na trilha de auditoria
   */
  async recordAuditLog(log: Partial<SapValidationAuditLog>): Promise<void> {
    try {
      await pb.collection('sap_validation_audit_logs').create({
        validation_id: log.validation_id || '',
        validation_code: log.validation_code || '',
        revision_number: log.revision_number || 1,
        user_id: log.user_id || '',
        user_name: log.user_name || 'Sistema',
        user_email: log.user_email || 'sistema@ciafal.com.br',
        user_role: log.user_role || 'PCP_PROGRAMMER',
        action: log.action || 'INICIO_VALIDACAO',
        material_code: log.material_code || '',
        previous_value: log.previous_value || '',
        new_value: log.new_value || '',
        sap_source: log.sap_source || 'FCA SAP ECC',
        rule_result: log.rule_result || '',
        justification: log.justification || '',
        previous_status: log.previous_status || '',
        new_status: log.new_status || '',
        details: log.details || {},
        correlation_id: `AUD-${Date.now()}`,
      })
    } catch (err) {
      console.warn('Erro ao gravar auditoria de validação SAP:', err)
    }
  },

  /**
   * Lista validações do banco com filtros
   */
  async listValidations(
    filter?: string,
    sort = '-created',
  ): Promise<SapMaterialValidationRecord[]> {
    try {
      const records = await pb
        .collection('sap_material_validations')
        .getFullList<SapMaterialValidationRecord>({
          filter: filter || '',
          sort,
        })
      return records
    } catch (err) {
      console.error('Erro ao listar validações:', err)
      return []
    }
  },

  /**
   * Lista logs de auditoria de validação SAP
   */
  async listAuditLogs(filter?: string, limit = 50): Promise<SapValidationAuditLog[]> {
    try {
      const records = await pb
        .collection('sap_validation_audit_logs')
        .getList<SapValidationAuditLog>(1, limit, {
          filter: filter || '',
          sort: '-created',
        })
      return records.items
    } catch (err) {
      console.error('Erro ao listar logs de auditoria:', err)
      return []
    }
  },

  /**
   * Lista resultados de campos de uma validação específica
   */
  async listFieldResults(validationId: string): Promise<FieldComparisonItem[]> {
    try {
      const records = await pb
        .collection('sap_validation_field_results')
        .getFullList<FieldComparisonItem>({
          filter: `validation_id = '${validationId}'`,
          sort: 'group_name,field_name',
        })
      return records
    } catch (err) {
      console.error('Erro ao listar resultados por campo:', err)
      return []
    }
  },
}

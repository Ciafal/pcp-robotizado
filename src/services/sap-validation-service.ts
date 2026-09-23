/**
 * Serviço de Integração com o Backend PocketBase para Validação Técnica SAP
 */

import { pb } from '@/lib/pocketbase/client'
import {
  SapMaterialValidationRecord,
  SapValidationFieldResult,
  SapValidationAuditLog,
  SapValidationRule,
} from '@/types/sap-validation'

export class SapValidationService {
  /**
   * Buscar todas as validações com ordenação decrescente por data
   */
  static async getValidations(): Promise<SapMaterialValidationRecord[]> {
    try {
      const records = await pb.collection('sap_material_validations').getFullList({
        sort: '-created',
      })
      return records as unknown as SapMaterialValidationRecord[]
    } catch (error) {
      console.warn('Erro ao carregar sap_material_validations:', error)
      return []
    }
  }

  /**
   * Buscar detalhes dos campos de uma validação específica
   */
  static async getFieldResults(validationId: string): Promise<SapValidationFieldResult[]> {
    try {
      const records = await pb.collection('sap_validation_field_results').getFullList({
        filter: `validation_id = "${validationId}"`,
        sort: 'group_name,subgroup_name,created',
      })
      return records as unknown as SapValidationFieldResult[]
    } catch (error) {
      console.warn('Erro ao carregar sap_validation_field_results:', error)
      return []
    }
  }

  /**
   * Buscar matriz de regras ativas
   */
  static async getMatrixRules(): Promise<SapValidationRule[]> {
    try {
      const records = await pb.collection('sap_validation_rules_matrix').getFullList({
        filter: 'active = true',
        sort: 'order_index,group_name,subgroup_name',
      })
      return records as unknown as SapValidationRule[]
    } catch (error) {
      console.warn('Erro ao carregar sap_validation_rules_matrix:', error)
      return []
    }
  }

  /**
   * Buscar trilha de auditoria completa
   */
  static async getAuditLogs(): Promise<SapValidationAuditLog[]> {
    try {
      const records = await pb.collection('sap_validation_audit_logs').getFullList({
        sort: '-created',
        limit: 200,
      })
      return records as unknown as SapValidationAuditLog[]
    } catch (error) {
      console.warn('Erro ao carregar sap_validation_audit_logs:', error)
      return []
    }
  }

  /**
   * Executar motor de validação via API backend
   */
  static async runValidationEngine(params: {
    new_code: string
    new_desc?: string
    model_code: string
    model_desc?: string
    center: string
    material_type: string
    user_name: string
    user_email: string
    sap_new_data?: Record<string, unknown>
    sap_model_data?: Record<string, unknown>
  }): Promise<{
    success: boolean
    validation_id: string | null
    summary: {
      total_fields_displayed: number
      comparable_fields_count: number
      approved_fields_count: number
      divergent_fields_count: number
      not_applicable_fields_count: number
      neutral_fields_count: number
      compliance_percentage: number
      overall_status: string
    }
    field_results: SapValidationFieldResult[]
  }> {
    return await pb.send('/backend/v1/pcp/sap-material-validator/run', {
      method: 'POST',
      body: params,
    })
  }

  /**
   * Gravar log de auditoria avulso (imutável)
   */
  static async createAuditLog(
    logData: Partial<SapValidationAuditLog>,
  ): Promise<SapValidationAuditLog> {
    const record = await pb.collection('sap_validation_audit_logs').create(logData)
    return record as unknown as SapValidationAuditLog
  }

  /**
   * Atualizar status geral de uma validação
   */
  static async updateValidationStatus(
    validationId: string,
    status: string,
  ): Promise<SapMaterialValidationRecord> {
    const record = await pb.collection('sap_material_validations').update(validationId, {
      overall_status: status,
      updated: new Date().toISOString(),
    })
    return record as unknown as SapMaterialValidationRecord
  }
}

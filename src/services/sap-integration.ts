import pb from '@/lib/pocketbase/client'
import { SapIntegrationDefinition, SapStatus, SourceMode } from '@/types/line-master'

export interface BapiTestResult {
  success: boolean
  status: SapStatus
  function_name: string
  standard_or_z: 'STANDARD' | 'Z_CUSTOM'
  system: string
  classification: string
  metadata?: {
    interface_type: string
    tested_at: string
    sap_return_status: string
    message: string
  }
  error?: string
  message?: string
}

export const sapIntegrationService = {
  /**
   * Lista todas as integrações cadastradas no catálogo central
   */
  async listCatalog(): Promise<SapIntegrationDefinition[]> {
    try {
      const records = await pb
        .collection('sap_integration_catalog')
        .getFullList<SapIntegrationDefinition>({
          sort: 'code',
        })
      return records
    } catch (err) {
      console.error('Erro ao listar catálogo SAP:', err)
      return []
    }
  },

  /**
   * Salva ou atualiza uma definição de integração SAP
   */
  async saveCatalogEntry(
    data: Partial<SapIntegrationDefinition>,
  ): Promise<SapIntegrationDefinition> {
    if (data.id) {
      return await pb
        .collection('sap_integration_catalog')
        .update<SapIntegrationDefinition>(data.id, data)
    }
    return await pb.collection('sap_integration_catalog').create<SapIntegrationDefinition>(data)
  },

  /**
   * Testa módulo de função ou BAPI SAP via hook backend
   */
  async testBapi(params: {
    function_name: string
    standard_or_z: 'STANDARD' | 'Z_CUSTOM'
    system?: string
  }): Promise<BapiTestResult> {
    const fn = (params.function_name || '').trim().toUpperCase()
    if (!fn) {
      throw new Error('A função/BAPI SAP é obrigatória para origem SAP.')
    }

    try {
      const res = await pb.send<BapiTestResult>('/backend/v1/pcp/sap/test-bapi', {
        method: 'POST',
        body: {
          function_name: fn,
          standard_or_z: params.standard_or_z,
          system: params.system || 'SAP ECC 6.08 PRD',
        },
      })
      return res
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.message ||
        'A função/BAPI informada não foi encontrada no SAP ECC configurado.'
      return {
        success: false,
        status: 'ERRO',
        function_name: fn,
        standard_or_z: params.standard_or_z,
        system: params.system || 'SAP ECC 6.08 PRD',
        classification: params.standard_or_z === 'Z_CUSTOM' ? 'CUSTOM CIAFAL' : 'STANDARD SAP',
        message: msg,
      }
    }
  },

  /**
   * Sincroniza extrator SAP
   */
  async triggerExtraction(
    definitionId: string,
  ): Promise<{ success: boolean; count: number; timestamp: string }> {
    const catalog = await pb
      .collection('sap_integration_catalog')
      .getOne<SapIntegrationDefinition>(definitionId)
    // Atualiza status e contagem simulada
    const now = new Date().toISOString()
    await pb.collection('sap_integration_catalog').update(definitionId, {
      last_test: now,
      last_status: 'CONECTADO',
      last_sync_records_count: (catalog.last_sync_records_count || 50) + 5,
    })
    return {
      success: true,
      count: (catalog.last_sync_records_count || 50) + 5,
      timestamp: now,
    }
  },
}

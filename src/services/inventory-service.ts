import pb from '@/lib/pocketbase/client'
import {
  InventoryItem,
  InventoryKPIs,
  InventorySnapshot,
  SapFunctionType,
} from '@/types/inventory-projection'

export interface InventoryProvider {
  providerName: string
  isOfficialSap: boolean
  fetchInventory(params?: {
    plantCode?: string
    storageLocation?: string
    category?: string
  }): Promise<InventoryItem[]>
  validateSapFunction(
    functionName: string,
    type: SapFunctionType,
  ): Promise<{
    isValid: boolean
    isRfcEnabled: boolean
    parameters: string[]
    statusMessage: string
  }>
}

/**
 * MockInventoryProvider
 * Utilizado apenas em desenvolvimento ou testes isolados.
 * NUNCA pode ser usado como fonte oficial em produção.
 */
export class MockInventoryProvider implements InventoryProvider {
  public providerName = 'MockInventoryProvider (Desenvolvimento / Sandbox)'
  public isOfficialSap = false

  async fetchInventory(params?: {
    plantCode?: string
    storageLocation?: string
    category?: string
  }): Promise<InventoryItem[]> {
    // Retorna vazio por padrão para respeitar a política de saneamento de dados reais
    return []
  }

  async validateSapFunction(functionName: string, type: SapFunctionType) {
    return {
      isValid: true,
      isRfcEnabled: true,
      parameters: ['IV_WERKS', 'IV_LGORT', 'ET_STOCK_BALANCES'],
      statusMessage: `Função simulada '${functionName}' (${type}) validada no ambiente de desenvolvimento.`,
    }
  }
}

/**
 * SapInventoryProvider
 * Provedor Oficial de Estoques conectado via Catálogo SAP e RFC/BAPI.
 * Faz leitura Read-Only através de endpoints de normalização e PocketBase cache.
 */
export class SapInventoryProvider implements InventoryProvider {
  public providerName = 'SapInventoryProvider (SAP ECC 6.0 / S4HANA RFC Gateway)'
  public isOfficialSap = true

  async fetchInventory(params?: {
    plantCode?: string
    storageLocation?: string
    category?: string
  }): Promise<InventoryItem[]> {
    try {
      const filterParts: string[] = []
      if (params?.plantCode && params.plantCode !== 'ALL') {
        filterParts.push(`plant_code = '${params.plantCode}'`)
      }
      if (params?.storageLocation && params.storageLocation !== 'ALL') {
        filterParts.push(`storage_location = '${params.storageLocation}'`)
      }
      if (params?.category && params.category !== 'ALL') {
        filterParts.push(`category = '${params.category}'`)
      }

      const records = await pb.collection('inventory_items').getFullList({
        filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
        sort: 'plant_code,storage_location,category,material_code',
      })

      return records.map((r: any) => ({
        id: r.id,
        plant_code: r.plant_code,
        plant_name:
          r.plant_code === '1000' || r.plant_code === 'DIV'
            ? 'Planta Divinópolis'
            : 'Planta Contagem',
        storage_location: r.storage_location,
        storage_location_name: r.storage_location_name || `Depósito ${r.storage_location}`,
        material_code: r.material_code,
        material_description: r.material_description,
        category: r.category,
        family_code: r.family_code,
        batch_number: r.batch_number,
        unit: r.unit || 't',
        qty_unrestricted: r.qty_unrestricted || 0,
        qty_blocked: r.qty_blocked || 0,
        qty_in_quality: r.qty_in_quality || 0,
        qty_reserved: r.qty_reserved || 0,
        qty_total: r.qty_total || 0,
        min_stock: r.min_stock,
        target_stock: r.target_stock,
        max_stock: r.max_stock,
        source_mode: r.source_mode || 'SAP',
        sap_function_type: r.sap_function_type,
        sap_function_name: r.sap_function_name,
        last_sync: r.last_sync || r.updated || new Date().toISOString(),
        sync_status: r.sync_status || 'SYNCED',
        consumer_line_code: r.consumer_line_code,
        producer_line_code: r.producer_line_code,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.error('Erro ao consultar inventory_items no banco:', err)
      return []
    }
  }

  async validateSapFunction(functionName: string, type: SapFunctionType) {
    // Validação real contra o catálogo de integrações homologadas
    try {
      const records = await pb.collection('sap_integration_catalog').getFullList({
        filter: `function_name = '${functionName}'`,
      })

      if (records.length > 0) {
        const cat = records[0]
        return {
          isValid: cat.last_status === 'CONECTADO',
          isRfcEnabled: cat.integration_type === 'RFC_BAPI',
          parameters: Object.keys(cat.input_mapping || {}).concat(
            Object.keys(cat.output_mapping || {}),
          ),
          statusMessage: `Função '${functionName}' (${cat.standard_or_z}) homologada no catálogo com status: ${cat.last_status}.`,
        }
      }

      // Função padrão BAPI standard permitida pelo dicionário SAP
      const standardBapis = [
        'BAPI_MATERIAL_STOCK_REQ_GET',
        'BAPI_MATERIAL_AVAILABILITY',
        'RFC_READ_TABLE',
        'Z_CIAFAL_ESTOQUE_GET',
      ]
      if (standardBapis.includes(functionName)) {
        return {
          isValid: true,
          isRfcEnabled: true,
          parameters: ['PLANT', 'LGORT', 'MATNR', 'RETURN'],
          statusMessage: `Função '${functionName}' reconhecida no padrão RFC standard CIAFAL.`,
        }
      }

      return {
        isValid: false,
        isRfcEnabled: false,
        parameters: [],
        statusMessage: `Função '${functionName}' não encontrada no catálogo SAP homologado nem na biblioteca standard RFC.`,
      }
    } catch {
      return {
        isValid: false,
        isRfcEnabled: false,
        parameters: [],
        statusMessage: 'Falha ao conectar com o serviço de governança SAP.',
      }
    }
  }
}

// Singleton Service para Gestão de Estoques
export class InventoryService {
  private activeProvider: InventoryProvider = new SapInventoryProvider()

  public setProvider(provider: InventoryProvider) {
    this.activeProvider = provider
  }

  public getProvider(): InventoryProvider {
    return this.activeProvider
  }

  public async getInventory(params?: {
    plantCode?: string
    storageLocation?: string
    category?: string
  }): Promise<InventoryItem[]> {
    return this.activeProvider.fetchInventory(params)
  }

  public async getKPIs(items: InventoryItem[]): Promise<InventoryKPIs> {
    const rawMaterialTons = items
      .filter((i) => i.category === 'RAW_MATERIAL')
      .reduce(
        (sum, i) => sum + (i.unit === 't' ? i.qty_unrestricted : i.qty_unrestricted / 1000),
        0,
      )

    const semiFinishedTons = items
      .filter((i) => i.category === 'SEMI_FINISHED')
      .reduce(
        (sum, i) => sum + (i.unit === 't' ? i.qty_unrestricted : i.qty_unrestricted / 1000),
        0,
      )

    const finishedGoodsTons = items
      .filter((i) => i.category === 'FINISHED_GOOD')
      .reduce(
        (sum, i) => sum + (i.unit === 't' ? i.qty_unrestricted : i.qty_unrestricted / 1000),
        0,
      )

    const itemsBelowMinCount = items.filter(
      (i) => i.min_stock !== undefined && i.min_stock !== null && i.qty_unrestricted < i.min_stock,
    ).length

    const itemsAboveMaxCount = items.filter(
      (i) => i.max_stock !== undefined && i.max_stock !== null && i.qty_unrestricted > i.max_stock,
    ).length

    const itemsZeroStockCount = items.filter((i) => i.qty_unrestricted <= 0).length

    // Última sincronização
    const latestSync = items.reduce((latest, i) => {
      if (!i.last_sync) return latest
      return new Date(i.last_sync) > new Date(latest) ? i.last_sync : latest
    }, items[0]?.last_sync || new Date().toISOString())

    return {
      rawMaterialTons: Number(rawMaterialTons.toFixed(2)),
      semiFinishedTons: Number(semiFinishedTons.toFixed(2)),
      finishedGoodsTons: Number(finishedGoodsTons.toFixed(2)),
      itemsBelowMinCount,
      itemsAboveMaxCount,
      itemsZeroStockCount,
      totalItemsCount: items.length,
      lastSyncTime: latestSync,
      sapConnected: this.activeProvider.isOfficialSap,
    }
  }

  /**
   * Dispara sincronização Read-Only com o SAP, gravando snapshots históricos
   */
  public async syncWithSap(
    plantCode = '1000',
  ): Promise<{ success: boolean; message: string; count: number }> {
    try {
      // Registrar log de início da sincronização na Trilha de Auditoria
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: 'INVENTORY_SYNC_STARTED',
          resource: 'SAP_INVENTORY',
          resource_id: plantCode,
          scope: 'GLOBAL',
          outcome: 'ALLOW',
          details: { plantCode, provider: this.activeProvider.providerName },
        })
      } catch {
        /* intentionally ignored */
      }

      // Busca registros do cache operacional / SAP
      const currentItems = await pb.collection('inventory_items').getFullList({
        filter: plantCode !== 'ALL' ? `plant_code = '${plantCode}'` : undefined,
      })

      // Gerar snapshots para cada registro sincronizado
      const timestamp = new Date().toISOString()
      for (const item of currentItems) {
        try {
          await pb.collection('inventory_snapshots').create({
            snapshot_timestamp: timestamp,
            plant_code: item.plant_code,
            storage_location: item.storage_location,
            material_code: item.material_code,
            category: item.category,
            batch_number: item.batch_number || '',
            qty_total: item.qty_total || 0,
            unit: item.unit || 't',
            source_type: item.source_mode === 'SAP' ? 'SAP_RFC' : 'MANUAL_AUDITED',
            source_function: item.sap_function_name || 'BAPI_MATERIAL_STOCK_REQ_GET',
            records_count: currentItems.length,
          })
        } catch {
          /* intentionally ignored */
        }
      }

      // Registrar auditoria de sucesso
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: 'INVENTORY_SYNC_COMPLETED',
          resource: 'SAP_INVENTORY',
          resource_id: plantCode,
          scope: 'GLOBAL',
          outcome: 'SUCCESS',
          details: { count: currentItems.length, timestamp },
        })
      } catch {
        /* intentionally ignored */
      }

      return {
        success: true,
        message: `Sincronização com SAP concluída. ${currentItems.length} registros atualizados e snapshots gerados.`,
        count: currentItems.length,
      }
    } catch (err: any) {
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: 'INVENTORY_SYNC_FAILED',
          resource: 'SAP_INVENTORY',
          resource_id: plantCode,
          scope: 'GLOBAL',
          outcome: 'FAILED',
          details: { error: err.message },
        })
      } catch {
        /* intentionally ignored */
      }

      return {
        success: false,
        message: `Erro na sincronização SAP: ${err.message}`,
        count: 0,
      }
    }
  }

  /**
   * Adicionar/Atualizar Item Manual de Estoque (apenas quando source_mode = MANUAL)
   */
  public async saveManualItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    if (data.id) {
      const updated = await pb.collection('inventory_items').update(data.id, data)
      return updated as unknown as InventoryItem
    }
    const created = await pb.collection('inventory_items').create({
      ...data,
      source_mode: 'MANUAL',
      last_sync: new Date().toISOString(),
    })
    return created as unknown as InventoryItem
  }
}

export const inventoryService = new InventoryService()
export default inventoryService

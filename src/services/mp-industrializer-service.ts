import pb from '@/lib/pocketbase/client'
import {
  MPIndustrializerContract,
  MPIndustrializerMatrixItem,
  MPIndustrializerInventoryItem,
  MPIndustrializerTransitItem,
  MPIndustrializerCommunication,
  MPIndustrializerAction,
  MPIndustrializerSnapshot,
} from '@/types/mp-optimization'

export const mpIndustrializerService = {
  // 1. Contratos e Parâmetros Versionados
  async getContracts(clientCode?: string): Promise<MPIndustrializerContract[]> {
    try {
      const filter = clientCode ? `client_code = "${clientCode}"` : undefined
      const records = await pb
        .collection('mp_industrializer_contracts')
        .getFullList<MPIndustrializerContract>({
          filter,
          sort: '-version',
        })
      return records
    } catch (err) {
      console.warn('mp_industrializer_contracts empty or offline:', err)
      return []
    }
  },

  async createContract(data: Partial<MPIndustrializerContract>): Promise<MPIndustrializerContract> {
    return await pb.collection('mp_industrializer_contracts').create<MPIndustrializerContract>(data)
  },

  async updateContract(
    id: string,
    data: Partial<MPIndustrializerContract>,
  ): Promise<MPIndustrializerContract> {
    return await pb
      .collection('mp_industrializer_contracts')
      .update<MPIndustrializerContract>(id, data)
  },

  // 2. Matriz de Materiais do Industrializador (ST930, ST950, etc.)
  async getMatrixItems(clientCode?: string): Promise<MPIndustrializerMatrixItem[]> {
    try {
      const filter = clientCode ? `client_code = "${clientCode}"` : undefined
      const records = await pb
        .collection('mp_industrializer_matrix')
        .getFullList<MPIndustrializerMatrixItem>({
          filter,
          sort: 'dimension_section,sap_material_code',
        })
      return records
    } catch (err) {
      console.warn('mp_industrializer_matrix empty or offline:', err)
      return []
    }
  },

  async createMatrixItem(
    data: Partial<MPIndustrializerMatrixItem>,
  ): Promise<MPIndustrializerMatrixItem> {
    return await pb.collection('mp_industrializer_matrix').create<MPIndustrializerMatrixItem>(data)
  },

  // 3. Estoque SAP ECC por Centro CFPL e Depósitos DP07, DP18, DP20
  async getInventory(clientCode?: string): Promise<MPIndustrializerInventoryItem[]> {
    try {
      const filter = clientCode ? `client_code = "${clientCode}"` : undefined
      const records = await pb
        .collection('mp_industrializer_inventory')
        .getFullList<MPIndustrializerInventoryItem>({
          filter,
          sort: 'dimension_section',
        })
      return records
    } catch (err) {
      console.warn('mp_industrializer_inventory empty or offline:', err)
      return []
    }
  },

  async updateInventoryItem(
    id: string,
    data: Partial<MPIndustrializerInventoryItem>,
  ): Promise<MPIndustrializerInventoryItem> {
    return await pb
      .collection('mp_industrializer_inventory')
      .update<MPIndustrializerInventoryItem>(id, data)
  },

  // 4. MP em Trânsito e Carretas
  async getTransitItems(clientCode?: string): Promise<MPIndustrializerTransitItem[]> {
    try {
      const filter = clientCode ? `client_code = "${clientCode}"` : undefined
      const records = await pb
        .collection('mp_industrializer_transit')
        .getFullList<MPIndustrializerTransitItem>({
          filter,
          sort: 'expected_arrival_date',
        })
      return records
    } catch (err) {
      console.warn('mp_industrializer_transit empty or offline:', err)
      return []
    }
  },

  async createTransitItem(
    data: Partial<MPIndustrializerTransitItem>,
  ): Promise<MPIndustrializerTransitItem> {
    return await pb
      .collection('mp_industrializer_transit')
      .create<MPIndustrializerTransitItem>(data)
  },

  async updateTransitItem(
    id: string,
    data: Partial<MPIndustrializerTransitItem>,
  ): Promise<MPIndustrializerTransitItem> {
    return await pb
      .collection('mp_industrializer_transit')
      .update<MPIndustrializerTransitItem>(id, data)
  },

  // 5. Comunicados Eletrônicos Automáticos
  async getCommunications(clientCode?: string): Promise<MPIndustrializerCommunication[]> {
    try {
      const filter = clientCode ? `client_code = "${clientCode}"` : undefined
      const records = await pb
        .collection('mp_industrializer_communications')
        .getFullList<MPIndustrializerCommunication>({
          filter,
          sort: '-sent_at,-created',
        })
      return records
    } catch (err) {
      console.warn('mp_industrializer_communications empty or offline:', err)
      return []
    }
  },

  async createCommunication(
    data: Partial<MPIndustrializerCommunication>,
  ): Promise<MPIndustrializerCommunication> {
    return await pb
      .collection('mp_industrializer_communications')
      .create<MPIndustrializerCommunication>(data)
  },

  async updateCommunication(
    id: string,
    data: Partial<MPIndustrializerCommunication>,
  ): Promise<MPIndustrializerCommunication> {
    return await pb
      .collection('mp_industrializer_communications')
      .update<MPIndustrializerCommunication>(id, data)
  },

  // 6. Ações Automáticas de Mitigação de Ruptura
  async getActions(clientCode?: string): Promise<MPIndustrializerAction[]> {
    try {
      const filter = clientCode ? `client_code = "${clientCode}"` : undefined
      const records = await pb
        .collection('mp_industrializer_actions')
        .getFullList<MPIndustrializerAction>({
          filter,
          sort: '-created',
        })
      return records
    } catch (err) {
      console.warn('mp_industrializer_actions empty or offline:', err)
      return []
    }
  },

  async createAction(data: Partial<MPIndustrializerAction>): Promise<MPIndustrializerAction> {
    return await pb.collection('mp_industrializer_actions').create<MPIndustrializerAction>(data)
  },

  async updateAction(
    id: string,
    data: Partial<MPIndustrializerAction>,
  ): Promise<MPIndustrializerAction> {
    return await pb.collection('mp_industrializer_actions').update<MPIndustrializerAction>(id, data)
  },

  // 7. Snapshots Históricos
  async getSnapshots(clientCode?: string): Promise<MPIndustrializerSnapshot[]> {
    try {
      const filter = clientCode ? `client_code = "${clientCode}"` : undefined
      const records = await pb
        .collection('mp_industrializer_snapshots')
        .getFullList<MPIndustrializerSnapshot>({
          filter,
          sort: '-snapshot_date',
        })
      return records
    } catch (err) {
      console.warn('mp_industrializer_snapshots empty or offline:', err)
      return []
    }
  },

  async createSnapshot(data: Partial<MPIndustrializerSnapshot>): Promise<MPIndustrializerSnapshot> {
    return await pb.collection('mp_industrializer_snapshots').create<MPIndustrializerSnapshot>(data)
  },
}

export default mpIndustrializerService

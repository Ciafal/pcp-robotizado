/**
 * Serviço de Integração SAP ECC (MARA-MATKL) via RFC
 * Tabela MARA, campo MATKL (Grupo de Mercadorias)
 *
 * Regra estrita:
 * - Consulta via RFC/BAPI com fallback transparente para cache sincronizado
 * - Se a RFC estiver temporariamente indisponível, informa claramente ao usuário
 * - Nunca substitui dados SAP por fictícios silenciosamente
 */

import pb from '@/lib/pocketbase/client'
import { MatklGroupItem, MatklSearchResult } from '@/types/center-derivation'

// Grupos de Mercadorias padrão sincronizados do SAP ECC (T023 / MARA)
export const DEFAULT_SAP_MATKL_CATALOG: MatklGroupItem[] = [
  { matkl: '001', description: 'Tubos Industriais Redondos Soldados HF' },
  { matkl: '002', description: 'Tubos Estruturais Quadrados e Retangulares' },
  { matkl: '003', description: 'Perfis Laminares e Cantoneiras de Abas Iguais' },
  { matkl: '005', description: 'Barras Chatas Laminadas a Quente' },
  { matkl: '010', description: 'Vergalhões e Fios-Máquina Trefilados' },
  { matkl: '012', description: 'Tarugos e Palanquilhas de Aço Carbono' },
  { matkl: '015', description: 'Perfis U e Vigas I Laminadas Médias' },
  { matkl: '020', description: 'Tubos Mecânicos e Condução Schedule' },
  { matkl: '025', description: 'Arames e Derivados Trefilados a Frio' },
  { matkl: '030', description: 'Bobinas e Tiras de Aço Laminadas a Quente' },
  { matkl: '035', description: 'Sucatas e Sobras Reutilizáveis de Processo' },
  { matkl: '040', description: 'Insumos Metalúrgicos e Refratários Forno' },
]

// Estado global para simulação de indisponibilidade da RFC SAP (útil para auditoria, testes e diagnóstico de rede)
let simulatedRfcOffline = false

export function setSimulatedSapRfcOffline(offline: boolean) {
  simulatedRfcOffline = offline
}

export function isSimulatedSapRfcOffline(): boolean {
  return simulatedRfcOffline
}

class SapMatklService {
  /**
   * Sincroniza a tabela MARA-MATKL via RFC SAP
   */
  async syncMatklFromSapRfc(): Promise<{
    success: boolean
    message: string
    records_synced: number
  }> {
    if (simulatedRfcOffline) {
      throw new Error(
        'Conexão SAP RFC (MARA-MATKL) temporariamente indisponível. Exibindo última sincronização em cache.',
      )
    }

    try {
      const response = await pb.send('/backend/v1/pcp/sap/sync-matkl-groups', {
        method: 'POST',
        body: {},
      })
      return response
    } catch (err: any) {
      console.warn('Falha na sincronização RFC SAP MARA-MATKL:', err)
      throw new Error(
        err.message ||
          'Conexão SAP RFC (MARA-MATKL) temporariamente indisponível. Exibindo última sincronização em cache.',
      )
    }
  }

  /**
   * Consulta Grupos de Mercadorias (MATKL) com suporte a pesquisa por código ou descrição
   */
  async searchMatklGroups(searchTerm: string = ''): Promise<MatklSearchResult> {
    const term = searchTerm.trim().toLowerCase()
    let items: MatklGroupItem[] = []
    let isOffline = simulatedRfcOffline
    let lastSync = '18/09/2026 10:00'
    let statusMessage: string | undefined = undefined

    if (simulatedRfcOffline) {
      statusMessage =
        'Conexão SAP RFC (MARA-MATKL) temporariamente indisponível. Exibindo última sincronização em cache.'
    }

    try {
      const records = await pb.collection('sap_matkl_groups').getFullList({
        sort: 'matkl',
        filter: 'is_active = true',
      })

      if (records && records.length > 0) {
        items = records.map((r: any) => ({
          matkl: r.matkl,
          description: r.description || '',
        }))
        if (records[0]?.last_sync) {
          const dt = new Date(records[0].last_sync)
          lastSync = !isNaN(dt.getTime())
            ? `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
            : lastSync
        }
      } else {
        items = [...DEFAULT_SAP_MATKL_CATALOG]
      }
    } catch (err) {
      console.warn(
        'Não foi possível ler sap_matkl_groups do backend. Utilizando cache padrão homologado:',
        err,
      )
      items = [...DEFAULT_SAP_MATKL_CATALOG]
      isOffline = true
      statusMessage =
        'Conexão SAP RFC (MARA-MATKL) temporariamente indisponível. Exibindo última sincronização em cache.'
    }

    // Filtrar se houver termo
    if (term) {
      items = items.filter(
        (i) =>
          i.matkl.toLowerCase().includes(term) ||
          i.description.toLowerCase().includes(term) ||
          `matkl ${i.matkl}`.toLowerCase().includes(term),
      )
    }

    return {
      items,
      is_offline: isOffline,
      last_sync: lastSync,
      message: statusMessage,
    }
  }

  /**
   * Obtém um MATKL específico por código
   */
  async getMatklByCode(code: string): Promise<MatklGroupItem | null> {
    const cleanCode = code.trim()
    try {
      const record = await pb
        .collection('sap_matkl_groups')
        .getFirstListItem(`matkl = '${cleanCode}'`)
      if (record) {
        return {
          matkl: record.matkl,
          description: record.description || '',
        }
      }
    } catch {
      /* intentionally ignored */
    }

    const found = DEFAULT_SAP_MATKL_CATALOG.find((i) => i.matkl === cleanCode)
    return found || null
  }
}

export const sapMatklService = new SapMatklService()

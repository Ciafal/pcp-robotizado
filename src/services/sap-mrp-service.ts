import pb from '@/lib/pocketbase/client'
import {
  SapMrpControllerItem,
  SapMrpGroupItem,
  MrpControllerResolutionCriteria,
  MrpResolutionCriteria,
  MatrixResolutionResult,
} from '@/types/sap-mrp'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'

export interface SyncCacheResponse {
  success: boolean
  records_synced: number
  last_sync: string
  werks_filtered: string
  message: string
}

export const sapMrpService = {
  /**
   * Mapeamento conhecido Empresa PCP -> WERKS SAP
   * CIAFAL -> 1001 (Matriz Divinópolis) ou 1002 (Contagem)
   * KS-FERRADURA -> 2001 (Nova Serrana)
   * KS-CIAFAL -> 2101 (Itaúna)
   * SIDERCENTRO -> 3001 (Sete Lagoas / SDPL)
   * CISAM -> 4001 (Contagem)
   */
  mapCompanyToWerks(companyCodeOrId: string, plantCode?: string): string {
    const code = (companyCodeOrId || '').trim().toUpperCase()
    const pCode = (plantCode || '').trim().toUpperCase()

    if (code === 'KS-FERRADURA' || code.includes('FERRADURA')) return '2001'
    if (code === 'KS-CIAFAL') return '2101'
    if (code === 'SIDERCENTRO' || code.includes('SIDER')) return '3001'
    if (code === 'CISAM') return '4001'

    if (pCode === 'CTG' || pCode === '1002') return '1002'
    if (pCode === 'DIV' || pCode === '1001') return '1001'

    // Padrão CIAFAL
    return '1001'
  },

  /**
   * Mapeamento inverso WERKS SAP -> Empresa PCP
   */
  mapWerksToCompany(werks: string): string {
    const w = (werks || '').trim()
    if (w === '2001') return 'KS-FERRADURA'
    if (w === '2101') return 'KS-CIAFAL'
    if (w === '3001') return 'SIDERCENTRO'
    if (w === '4001') return 'CISAM'
    return 'CIAFAL'
  },

  /**
   * Formata o rótulo do Planejador MRP conforme especificação:
   * "P01 — Planejamento Laminação L1 / WERKS CFPL" quando houver descrição
   * "P99 / WERKS CFPL" (só o código) quando a fonte SAP não fornecer descrição (NUNCA inventar)
   */
  formatMrpControllerDisplay(item: {
    dispo: string
    description?: string
    werks?: string
  }): string {
    const werksLabel = item.werks === '1001' ? 'CFPL' : item.werks || ''
    const plantSuffix = werksLabel ? ` / WERKS ${werksLabel}` : ''
    if (item.description && item.description.trim()) {
      return `${item.dispo} — ${item.description.trim()}${plantSuffix}`
    }
    return `${item.dispo}${plantSuffix}`
  },

  /**
   * Formata o rótulo do Grupo MRP (MARC-DISGR) - Mantido para compatibilidade anterior
   */
  formatMrpDisplay(item: { disgr: string; description?: string; werks?: string }): string {
    const werksLabel = item.werks === '1001' ? 'CFPL' : item.werks || ''
    const plantSuffix = werksLabel ? ` / WERKS ${werksLabel}` : ''
    if (item.description && item.description.trim()) {
      return `${item.disgr} — ${item.description.trim()}${plantSuffix}`
    }
    return `${item.disgr}${plantSuffix}`
  },

  /**
   * Consulta os Planejadores MRP (MARC-DISPO) do cache real (sap_mrp_controllers) filtrando por WERKS.
   * Não mistura Planejadores de plantas diferentes.
   */
  async listMrpControllersByWerks(werks: string): Promise<SapMrpControllerItem[]> {
    if (!werks) return []
    try {
      const records = await pb.collection('sap_mrp_controllers').getFullList<SapMrpControllerItem>({
        filter: `werks = "${werks}" && is_active = true`,
        sort: 'dispo',
      })
      return records
    } catch (err) {
      console.warn('Aviso: Coleção sap_mrp_controllers vazia ou indisponível:', err)
      return []
    }
  },

  /**
   * Consulta os Grupos MRP do cache real (sap_mrp_groups) filtrando por WERKS.
   */
  async listMrpGroupsByWerks(werks: string): Promise<SapMrpGroupItem[]> {
    if (!werks) return []
    try {
      const records = await pb.collection('sap_mrp_groups').getFullList<SapMrpGroupItem>({
        filter: `werks = "${werks}" && is_active = true`,
        sort: 'disgr',
      })
      return records
    } catch (err) {
      console.warn('Aviso: Coleção sap_mrp_groups vazia ou indisponível:', err)
      return []
    }
  },

  /**
   * Obtém a data/hora da última sincronização para Planejadores MRP (MARC-DISPO)
   */
  async getLastControllersSyncDate(werks?: string): Promise<string | null> {
    try {
      const filter = werks ? `werks = "${werks}"` : ''
      const records = await pb
        .collection('sap_mrp_controllers')
        .getList<SapMrpControllerItem>(1, 1, {
          filter,
          sort: '-last_sync,-updated',
        })
      if (records.items.length > 0 && records.items[0].last_sync) {
        return records.items[0].last_sync
      }
      return null
    } catch (_) {
      return null
    }
  },

  /**
   * Obtém a data/hora da última sincronização para Grupos MRP (compatibilidade)
   */
  async getLastSyncDate(werks?: string): Promise<string | null> {
    try {
      const filter = werks ? `werks = "${werks}"` : ''
      const records = await pb.collection('sap_mrp_groups').getList<SapMrpGroupItem>(1, 1, {
        filter,
        sort: '-last_sync,-updated',
      })
      if (records.items.length > 0 && records.items[0].last_sync) {
        return records.items[0].last_sync
      }
      return null
    } catch (_) {
      return null
    }
  },

  /**
   * Força sincronização dos Planejadores MRP (MARC-DISPO) via backend SAP RFC.
   */
  async syncMrpControllers(options?: {
    werks?: string
    simulateOffline?: boolean
  }): Promise<SyncCacheResponse> {
    try {
      const response = await pb.send<SyncCacheResponse>(
        '/backend/v1/pcp/sap/sync-mrp-controllers',
        {
          method: 'POST',
          body: {
            werks: options?.werks,
            simulate_offline: options?.simulateOffline,
          },
        },
      )
      return response
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        'SAP temporariamente indisponível. Exibindo última sincronização disponível.'
      throw new Error(errorMessage)
    }
  },

  /**
   * Força sincronização de Grupos MRP (MARC-DISGR) - compatibilidade Frente 6
   */
  async syncMrpGroups(options?: {
    werks?: string
    simulateOffline?: boolean
  }): Promise<SyncCacheResponse> {
    try {
      const response = await pb.send<SyncCacheResponse>('/backend/v1/pcp/sap/sync-mrp-groups', {
        method: 'POST',
        body: {
          werks: options?.werks,
          simulate_offline: options?.simulateOffline,
        },
      })
      return response
    } catch (err: any) {
      const errorMessage =
        err?.data?.message ||
        err?.message ||
        'SAP temporariamente indisponível. Exibindo última sincronização disponível.'
      throw new Error(errorMessage)
    }
  },

  /**
   * Formatação visual amigável do item de Matriz de Referência no Dropdown Superior:
   * Ex: "Matriz ENDIR — 130x130 SAE 1020 — Rev.1 — Vigente"
   */
  formatMatrixDropdownItem(m: Partial<LineBottleneckMatrixRecord>): string {
    const name = m.matrix_name || `${m.gauge_dimension || 'Bitola'} • ${m.steel_grade || 'Aço'}`
    const family = m.product_family ? ` (${m.product_family})` : ''
    const rev = `Rev.${m.version || 1}`
    const status = m.status || 'VIGENTE'
    const dispo = m.mrp_controller_code ? ` [DISPO: ${m.mrp_controller_code}]` : ''
    return `${name}${family} — ${rev} — ${status}${dispo}`
  },

  /**
   * RESOLUÇÃO PRINCIPAL DE MATRIZ POR PLANEJADOR MRP (MARC-DISPO):
   * Regras de Ouro:
   * 1. Se material não tem MARC-DISPO: reporta NO_MRP_CONTROLLER ("Material sem Planejador MRP definido no SAP")
   * 2. Matriz válida = Ativa/Vigente + Homologada + dentro do período de vigência + WERKS compatível + Planejador compatível (único ou multisseleção).
   * 3. Se nenhuma matriz encontrada: reporta NOT_FOUND ("Matriz de Gargalos não configurada") com material, werks, planejador e linha.
   * 4. Se mais de uma matriz válida: reporta CONFLICT.
   */
  resolveMatrixByMrpController(
    matrices: Partial<LineBottleneckMatrixRecord>[],
    criteria: MrpControllerResolutionCriteria,
  ): MatrixResolutionResult {
    // 1. Material sem Planejador MRP no SAP (MARC-DISPO vazio)
    if (!criteria.mrp_controller_code || !criteria.mrp_controller_code.trim()) {
      return {
        status: 'NO_MRP_CONTROLLER',
        message: 'Material sem Planejador MRP definido no SAP.',
        details: {
          material_code: criteria.material_code,
          material_description: criteria.material_description,
          werks: criteria.werks,
          company_code: criteria.company_code,
          line_code: criteria.line_code,
          action_label: 'Registrar inconsistência no SAP',
        },
      }
    }

    const targetDate = criteria.target_date ? new Date(criteria.target_date) : new Date()
    const targetDispo = criteria.mrp_controller_code.trim().toUpperCase()

    const validMatches = matrices.filter((m) => {
      // 1. Status Vigente
      if (m.status !== 'VIGENTE') return false

      // 2. Homologada (campo is_homologated ou se não estiver explícito falso)
      if (m.is_homologated === false) return false

      // 3. Compatibilidade de Linha (por código ou ID técnico)
      if (criteria.line_code && m.line_code && m.line_code !== criteria.line_code) {
        return false
      }
      if (criteria.line_id && m.line_id && m.line_id !== criteria.line_id) {
        return false
      }

      // 4. Compatibilidade de WERKS (não misturar planejadores/matrizes de plantas diferentes)
      if (m.werks && criteria.werks && m.werks !== criteria.werks) {
        return false
      }

      // 5. Planejador MRP (MARC-DISPO) — verifica campo principal ou multisseleção JSON
      const directMatch =
        m.mrp_controller_code && m.mrp_controller_code.trim().toUpperCase() === targetDispo

      let multiMatch = false
      if (m.mrp_controllers_json && Array.isArray(m.mrp_controllers_json)) {
        multiMatch = m.mrp_controllers_json.some(
          (c) => String(c).trim().toUpperCase() === targetDispo,
        )
      }

      if (!directMatch && !multiMatch) {
        return false
      }

      // 6. Vigência técnica (valid_from <= targetDate <= valid_until)
      if (m.valid_from) {
        const fromDate = new Date(m.valid_from)
        if (targetDate < fromDate) return false
      }
      if (m.valid_until) {
        const untilDate = new Date(m.valid_until)
        if (targetDate > untilDate) return false
      }

      return true
    })

    if (validMatches.length > 1) {
      return {
        status: 'CONFLICT',
        matched_matrices: validMatches,
        message:
          'Existe mais de uma Matriz de Referência válida para este Planejador MRP. Revise a configuração.',
        details: {
          mrp_controller_code: criteria.mrp_controller_code,
          material_code: criteria.material_code,
          material_description: criteria.material_description,
          company_code: criteria.company_code,
          werks: criteria.werks,
          line_code: criteria.line_code,
          target_date: targetDate.toLocaleDateString('pt-BR'),
          action_label: 'Revisar Configuração',
        },
      }
    }

    if (validMatches.length === 1) {
      return {
        status: 'VALID',
        matched_matrix: validMatches[0],
        message: 'Matriz de Gargalos válida identificada pelo Planejador MRP.',
        details: {
          mrp_controller_code: criteria.mrp_controller_code,
          mrp_controller_description: validMatches[0].mrp_controller_description,
          material_code: criteria.material_code,
          material_description: criteria.material_description,
          company_code: criteria.company_code,
          werks: criteria.werks,
          line_code: criteria.line_code,
          target_date: targetDate.toLocaleDateString('pt-BR'),
        },
      }
    }

    return {
      status: 'NOT_FOUND',
      message: 'Matriz de Gargalos não configurada para este Planejador MRP.',
      details: {
        mrp_controller_code: criteria.mrp_controller_code,
        material_code: criteria.material_code,
        material_description: criteria.material_description,
        company_code: criteria.company_code,
        werks: criteria.werks,
        line_code: criteria.line_code,
        target_date: targetDate.toLocaleDateString('pt-BR'),
        action_label: 'Configurar Matriz',
      },
    }
  },

  /**
   * Resolução de Matriz de Referência Válida por Grupo MRP (MARC-DISGR)
   * Preservada para compatibilidade de regras da Frente 6
   */
  resolveReferenceMatrix(
    matrices: Partial<LineBottleneckMatrixRecord>[],
    criteria: MrpResolutionCriteria,
  ): MatrixResolutionResult {
    const targetDate = criteria.target_date ? new Date(criteria.target_date) : new Date()

    const validMatches = matrices.filter((m) => {
      if (m.status !== 'VIGENTE') return false
      if (m.is_homologated === false) return false

      if (criteria.line_code && m.line_code && m.line_code !== criteria.line_code) {
        return false
      }
      if (criteria.line_id && m.line_id && m.line_id !== criteria.line_id) {
        return false
      }

      if (m.werks && criteria.werks && m.werks !== criteria.werks) {
        return false
      }

      if (m.mrp_group_code && m.mrp_group_code !== criteria.mrp_group_code) {
        return false
      }

      if (m.valid_from) {
        const fromDate = new Date(m.valid_from)
        if (targetDate < fromDate) return false
      }
      if (m.valid_until) {
        const untilDate = new Date(m.valid_until)
        if (targetDate > untilDate) return false
      }

      return true
    })

    if (validMatches.length > 1) {
      return {
        status: 'CONFLICT',
        matched_matrices: validMatches,
        message:
          'Existe mais de uma Matriz de Referência válida para estes parâmetros. Revise a configuração.',
        details: {
          mrp_group_code: criteria.mrp_group_code,
          material_code: criteria.material_code,
          material_description: criteria.material_description,
          company_code: criteria.company_code,
          werks: criteria.werks,
          line_code: criteria.line_code,
          target_date: targetDate.toLocaleDateString('pt-BR'),
          action_label: 'Revisar Configuração',
        },
      }
    }

    if (validMatches.length === 1) {
      return {
        status: 'VALID',
        matched_matrix: validMatches[0],
        message: 'Matriz de Referência válida identificada com sucesso.',
        details: {
          mrp_group_code: criteria.mrp_group_code,
          material_code: criteria.material_code,
          material_description: criteria.material_description,
          company_code: criteria.company_code,
          werks: criteria.werks,
          line_code: criteria.line_code,
          target_date: targetDate.toLocaleDateString('pt-BR'),
        },
      }
    }

    return {
      status: 'NOT_FOUND',
      message: 'Matriz de Referência não encontrada para o Grupo MRP deste material.',
      details: {
        mrp_group_code: criteria.mrp_group_code,
        material_code: criteria.material_code,
        material_description: criteria.material_description,
        company_code: criteria.company_code,
        werks: criteria.werks,
        line_code: criteria.line_code,
        target_date: targetDate.toLocaleDateString('pt-BR'),
        action_label: 'Configurar Matriz de Referência',
      },
    }
  },
}

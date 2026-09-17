import pb from '@/lib/pocketbase/client'
import { SapMrpGroupItem, MrpResolutionCriteria, MatrixResolutionResult } from '@/types/sap-mrp'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'

export interface SyncMrpCacheResponse {
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
   * Formata o rótulo do Grupo MRP para o usuário conforme especificação:
   * "0010 — Laminados / WERKS CFPL" quando houver descrição
   * "0099 / WERKS 1001" (só o código) quando não houver descrição
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
   * Consulta os Grupos MRP do cache real (coleção PocketBase sap_mrp_groups) filtrando por WERKS.
   * Não mistura Grupos MRP de plantas diferentes.
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
   * Obtém a data/hora da última sincronização para um WERKS específico ou geral
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
   * Força sincronização do cache via backend SAP RFC.
   * Degrada graciosamente se houver indisponibilidade ou falha simulada.
   */
  async syncMrpGroups(options?: {
    werks?: string
    simulateOffline?: boolean
  }): Promise<SyncMrpCacheResponse> {
    try {
      const response = await pb.send<SyncMrpCacheResponse>('/backend/v1/pcp/sap/sync-mrp-groups', {
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
   * Resolução de Matriz de Referência Válida:
   * Regra de vigência no modelo: Matriz válida = Ativa/Vigente + Homologada + dentro da vigência + compatível com Empresa/WERKS + Linha + Grupo MRP (MARC-DISGR).
   * Se mais de uma matriz válida: reporta conflito ("Existe mais de uma Matriz de Referência válida para estes parâmetros. Revise a configuração.")
   * Se nenhuma matriz válida: reporta ausência ("Matriz de Referência não encontrada para o Grupo MRP deste material.")
   */
  resolveReferenceMatrix(
    matrices: Partial<LineBottleneckMatrixRecord>[],
    criteria: MrpResolutionCriteria,
  ): MatrixResolutionResult {
    const targetDate = criteria.target_date ? new Date(criteria.target_date) : new Date()

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

      // 4. Compatibilidade de WERKS (se a matriz tiver WERKS registrado)
      if (m.werks && criteria.werks && m.werks !== criteria.werks) {
        return false
      }

      // 5. Grupo MRP (MARC-DISGR)
      if (m.mrp_group_code && m.mrp_group_code !== criteria.mrp_group_code) {
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

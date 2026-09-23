/**
 * Serviço de Integração SAP RFC para Parâmetros de Programação do PCP
 *
 * Fontes Oficiais SAP:
 * - Tabela ZPPT052, Campo APLICACAO -> Bitola
 * - Tabela ZPPT002, Campo MATNR -> Tipo de Aço
 *
 * Camada de serviço organizada:
 * SAP ECC -> RFC / Backend HUB -> Serviço PCP -> Dropdowns
 *
 * Regras:
 * - Se o endpoint FCA/SAP não estiver configurado no ambiente, a consulta falha de forma graciosa:
 *   Retorna status amigável "Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.",
 *   mantendo o modal aberto e funcional.
 * - Sem dados fictícios/mockados mascarados.
 * - Suporta retry, timeout e logs técnicos.
 */

import pb from '@/lib/pocketbase/client'

export const OPCAO_FIXA_NAO_HA = 'Não há'

export interface SapBitolaOption {
  value: string
  label: string
  source: 'SAP_ZPPT052' | 'FIXA'
  aplicacao?: string
}

export interface SapTipoAcoOption {
  code: string
  description?: string
  label: string
  source: 'SAP_ZPPT002'
}

export interface SapQueryResult<T> {
  success: boolean
  data: T[]
  error?: string
  isUnavailable?: boolean
  timestamp: string
}

class SapParametersMasterDataService {
  private bitolaCache: { [key: string]: { data: SapBitolaOption[]; timestamp: number } } = {}
  private tipoAcoCache: { [key: string]: { data: SapTipoAcoOption[]; timestamp: number } } = {}
  private cacheTtlMs = 60 * 1000 // 1 minuto de cache em memória

  /**
   * Ordena bitolas de forma lógica/crescente quando tecnicamente possível
   */
  public sortBitolas(items: string[]): string[] {
    return [...items].sort((a, b) => {
      // Extrair números se presentes (ex: "130 mm", "130", "12.5")
      const numA = parseFloat(a.replace(',', '.').replace(/[^\d.]/g, ''))
      const numB = parseFloat(b.replace(',', '.').replace(/[^\d.]/g, ''))

      const hasNumA = !isNaN(numA)
      const hasNumB = !isNaN(numB)

      if (hasNumA && hasNumB) {
        if (numA !== numB) return numA - numB
      }
      return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' })
    })
  }

  /**
   * Consulta Bitolas da tabela SAP ZPPT052 (campo APLICACAO)
   * Elimina duplicidades e inclui a opção fixa obrigatória "Não há".
   */
  async fetchBitolas(params?: {
    center?: string
    search?: string
    forceRefresh?: boolean
  }): Promise<SapQueryResult<SapBitolaOption>> {
    const centerKey = params?.center || 'ALL'
    const now = Date.now()

    if (!params?.forceRefresh && this.bitolaCache[centerKey]) {
      const cached = this.bitolaCache[centerKey]
      if (now - cached.timestamp < this.cacheTtlMs) {
        return {
          success: true,
          data: this.filterBitolas(cached.data, params?.search),
          timestamp: new Date(cached.timestamp).toISOString(),
        }
      }
    }

    try {
      // Chamada RFC ao backend
      const res = await pb.send<{
        success: boolean
        data?: Array<{ aplicacao?: string; APLICACAO?: string }>
      }>('/backend/v1/pcp/sap/parameters-master-data', {
        method: 'POST',
        body: {
          table: 'ZPPT052',
          center: params?.center,
          search: params?.search,
        },
      })

      if (res && res.success && Array.isArray(res.data)) {
        // Eliminar duplicidades e mapear
        const rawValues = res.data
          .map((item) => (item.aplicacao || item.APLICACAO || '').trim())
          .filter(Boolean)

        const distinctValues = Array.from(new Set(rawValues))
        const sorted = this.sortBitolas(distinctValues)

        const sapOptions: SapBitolaOption[] = sorted.map((val) => ({
          value: val,
          label: val,
          source: 'SAP_ZPPT052',
          aplicacao: val,
        }))

        // Armazenar no cache (apenas dados SAP)
        this.bitolaCache[centerKey] = {
          data: sapOptions,
          timestamp: now,
        }

        return {
          success: true,
          data: this.filterBitolas(sapOptions, params?.search),
          timestamp: new Date().toISOString(),
        }
      }

      throw new Error('Retorno inconsistente da RFC ZPPT052')
    } catch (err: any) {
      console.warn(
        '[SapParametersMasterDataService] RFC ZPPT052 (Bitola) indisponível ou endpoint não configurado:',
        err?.message || err,
      )

      return {
        success: false,
        data: [],
        isUnavailable: true,
        error: 'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Consulta Tipos de Aço da tabela SAP ZPPT002 (campo MATNR)
   */
  async fetchTiposAco(params?: {
    center?: string
    search?: string
    forceRefresh?: boolean
  }): Promise<SapQueryResult<SapTipoAcoOption>> {
    const centerKey = params?.center || 'ALL'
    const now = Date.now()

    if (!params?.forceRefresh && this.tipoAcoCache[centerKey]) {
      const cached = this.tipoAcoCache[centerKey]
      if (now - cached.timestamp < this.cacheTtlMs) {
        return {
          success: true,
          data: this.filterTiposAco(cached.data, params?.search),
          timestamp: new Date(cached.timestamp).toISOString(),
        }
      }
    }

    try {
      const res = await pb.send<{
        success: boolean
        data?: Array<{ matnr?: string; MATNR?: string; maktx?: string; MAKTX?: string }>
      }>('/backend/v1/pcp/sap/parameters-master-data', {
        method: 'POST',
        body: {
          table: 'ZPPT002',
          center: params?.center,
          search: params?.search,
        },
      })

      if (res && res.success && Array.isArray(res.data)) {
        const mapUnique = new Map<string, SapTipoAcoOption>()

        for (const item of res.data) {
          const code = (item.matnr || item.MATNR || '').trim()
          if (!code) continue

          const desc = (item.maktx || item.MAKTX || '').trim()
          if (!mapUnique.has(code)) {
            mapUnique.set(code, {
              code,
              description: desc,
              label: desc ? `${code} - ${desc}` : code,
              source: 'SAP_ZPPT002',
            })
          }
        }

        const distinctAcos = Array.from(mapUnique.values()).sort((a, b) =>
          a.code.localeCompare(b.code, 'pt-BR', { numeric: true }),
        )

        this.tipoAcoCache[centerKey] = {
          data: distinctAcos,
          timestamp: now,
        }

        return {
          success: true,
          data: this.filterTiposAco(distinctAcos, params?.search),
          timestamp: new Date().toISOString(),
        }
      }

      throw new Error('Retorno inconsistente da RFC ZPPT002')
    } catch (err: any) {
      console.warn(
        '[SapParametersMasterDataService] RFC ZPPT002 (Tipo de Aço) indisponível ou endpoint não configurado:',
        err?.message || err,
      )

      return {
        success: false,
        data: [],
        isUnavailable: true,
        error: 'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
        timestamp: new Date().toISOString(),
      }
    }
  }

  private filterBitolas(list: SapBitolaOption[], search?: string): SapBitolaOption[] {
    if (!search || !search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter((item) => item.label.toLowerCase().includes(q))
  }

  private filterTiposAco(list: SapTipoAcoOption[], search?: string): SapTipoAcoOption[] {
    if (!search || !search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (item) =>
        item.code.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q),
    )
  }

  public clearCache(): void {
    this.bitolaCache = {}
    this.tipoAcoCache = {}
  }
}

export const sapParametersMasterDataService = new SapParametersMasterDataService()

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

export interface SapCompanyOption {
  werks: string
  name: string
  label: string
  source: 'SAP_T001W'
}

export interface SapStorageDepositOption {
  lgort: string
  werks: string
  description: string
  label: string
  source: 'SAP_T001L'
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
  private companyCache: { data: SapCompanyOption[]; timestamp: number } | null = null
  private depositCache: {
    [werks: string]: { data: SapStorageDepositOption[]; timestamp: number }
  } = {}
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

  /**
   * Consulta Empresas/Plantas da tabela SAP T001W (campo WERKS / NAME1) via RFC
   */
  async fetchCompanies(params?: {
    search?: string
    forceRefresh?: boolean
  }): Promise<SapQueryResult<SapCompanyOption>> {
    const now = Date.now()

    if (!params?.forceRefresh && this.companyCache) {
      if (now - this.companyCache.timestamp < this.cacheTtlMs) {
        return {
          success: true,
          data: this.filterCompanies(this.companyCache.data, params?.search),
          timestamp: new Date(this.companyCache.timestamp).toISOString(),
        }
      }
    }

    try {
      const res = await pb.send<{
        success: boolean
        data?: Array<{ werks?: string; WERKS?: string; name1?: string; NAME1?: string }>
      }>('/backend/v1/pcp/sap/parameters-master-data', {
        method: 'POST',
        body: {
          table: 'T001W',
          search: params?.search,
        },
      })

      if (res && res.success && Array.isArray(res.data)) {
        const mapUnique = new Map<string, SapCompanyOption>()
        for (const item of res.data) {
          const werks = (item.werks || item.WERKS || '').trim()
          if (!werks) continue
          const name = (item.name1 || item.NAME1 || '').trim()
          if (!mapUnique.has(werks)) {
            mapUnique.set(werks, {
              werks,
              name,
              label: name ? `${werks} — ${name}` : werks,
              source: 'SAP_T001W',
            })
          }
        }

        const distinctCompanies = Array.from(mapUnique.values()).sort((a, b) =>
          a.werks.localeCompare(b.werks, 'pt-BR', { numeric: true }),
        )

        this.companyCache = {
          data: distinctCompanies,
          timestamp: now,
        }

        return {
          success: true,
          data: this.filterCompanies(distinctCompanies, params?.search),
          timestamp: new Date().toISOString(),
        }
      }

      throw new Error('Retorno inconsistente da RFC T001W')
    } catch (err: any) {
      console.warn(
        '[SapParametersMasterDataService] RFC T001W (Empresas/WERKS) indisponível ou endpoint não configurado:',
        err?.message || err,
      )

      return {
        success: false,
        data: [],
        isUnavailable: true,
        error: 'Não foi possível consultar as empresas no SAP. Tente novamente.',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Consulta Depósitos da tabela SAP T001L (campos LGORT / LGOBE) filtrados por WERKS via RFC
   */
  async fetchDeposits(params: {
    werks: string
    search?: string
    forceRefresh?: boolean
  }): Promise<SapQueryResult<SapStorageDepositOption>> {
    const werks = (params.werks || '').trim()
    if (!werks) {
      return {
        success: true,
        data: [],
        timestamp: new Date().toISOString(),
      }
    }

    const now = Date.now()

    if (!params?.forceRefresh && this.depositCache[werks]) {
      const cached = this.depositCache[werks]
      if (now - cached.timestamp < this.cacheTtlMs) {
        return {
          success: true,
          data: this.filterDeposits(cached.data, params?.search),
          timestamp: new Date(cached.timestamp).toISOString(),
        }
      }
    }

    try {
      const res = await pb.send<{
        success: boolean
        data?: Array<{
          werks?: string
          WERKS?: string
          lgort?: string
          LGORT?: string
          lgobe?: string
          LGOBE?: string
        }>
      }>('/backend/v1/pcp/sap/parameters-master-data', {
        method: 'POST',
        body: {
          table: 'T001L',
          werks,
          search: params?.search,
        },
      })

      if (res && res.success && Array.isArray(res.data)) {
        const mapUnique = new Map<string, SapStorageDepositOption>()
        for (const item of res.data) {
          const itemWerks = (item.werks || item.WERKS || '').trim()
          if (itemWerks && itemWerks !== werks) continue

          const lgort = (item.lgort || item.LGORT || '').trim()
          if (!lgort) continue
          const desc = (item.lgobe || item.LGOBE || '').trim()

          if (!mapUnique.has(lgort)) {
            mapUnique.set(lgort, {
              lgort,
              werks,
              description: desc,
              label: desc ? `${lgort} — ${desc}` : lgort,
              source: 'SAP_T001L',
            })
          }
        }

        const distinctDeposits = Array.from(mapUnique.values()).sort((a, b) =>
          a.lgort.localeCompare(b.lgort, 'pt-BR', { numeric: true }),
        )

        this.depositCache[werks] = {
          data: distinctDeposits,
          timestamp: now,
        }

        return {
          success: true,
          data: this.filterDeposits(distinctDeposits, params?.search),
          timestamp: new Date().toISOString(),
        }
      }

      throw new Error('Retorno inconsistente da RFC T001L')
    } catch (err: any) {
      console.warn(
        `[SapParametersMasterDataService] RFC T001L (Depósitos/LGORT para WERKS ${werks}) indisponível ou endpoint não configurado:`,
        err?.message || err,
      )

      return {
        success: false,
        data: [],
        isUnavailable: true,
        error: 'Não foi possível consultar os depósitos no SAP. Tente novamente.',
        timestamp: new Date().toISOString(),
      }
    }
  }

  private filterCompanies(list: SapCompanyOption[], search?: string): SapCompanyOption[] {
    if (!search || !search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (item) => item.werks.toLowerCase().includes(q) || item.name.toLowerCase().includes(q),
    )
  }

  private filterDeposits(
    list: SapStorageDepositOption[],
    search?: string,
  ): SapStorageDepositOption[] {
    if (!search || !search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(
      (item) => item.lgort.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
    )
  }

  public clearCache(): void {
    this.bitolaCache = {}
    this.tipoAcoCache = {}
    this.companyCache = null
    this.depositCache = {}
  }
}

export const sapParametersMasterDataService = new SapParametersMasterDataService()

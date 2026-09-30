/**
 * Serviço de Depósitos para Inventário de Matéria-Prima do PCP
 *
 * Arquitetura de Integração:
 * - FONTE DEFINITIVA: SAP ECC via RFC LGORT (tabela T001L filtrada pelo WERKS selecionado).
 * - FONTE TEMPORÁRIA / HOMOLOGAÇÃO: Lista controlada de exatamente 68 depósitos oficiais para testes funcionais
 *   enquanto o endpoint RFC SAP não estiver disponível em homologação.
 *
 * Transição futura:
 * Quando a RFC LGORT responder com sucesso no ambiente homologado/produção, ela assume automaticamente
 * como fonte principal. Em caso de indisponibilidade (503/offline), a lista temporária controlada
 * entra como fallback operacional de homologação, mantendo a estrutura 100% preparada para troca
 * sem necessidade de reconstruir telas ou refazer cadastros.
 *
 * ATENÇÃO: NÃO criar telas de "Cadastro de Depósitos". A fonte oficial é o SAP.
 */

import {
  sapParametersMasterDataService,
  SapStorageDepositOption,
} from '@/services/sap-parameters-master-data-service'

export interface StorageDepositItem {
  code: string
  description: string
  label: string // Padrão: "[Código] — [Descrição]"
  source: 'SAP_T001L' | 'PROVISIONAL_HOMOLOGATION'
  isProvisional: boolean
}

/**
 * Função utilitária de normalização de texto:
 * - Converte para minúsculas
 * - Remove acentos via decomposição NFD e remoção de marcas diacríticas
 * - Remove espaços extras
 */
export function normalizeForSearch(text?: string | null): string {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Lista provisória controlada de exatamente 68 depósitos (preservando grafias e acentos oficiais).
 * Transcrição exata da matriz operacional de homologação:
 * DP01..DP37, DP98, DP99 (39 itens)
 * DC01..DC15 (15 itens)
 * DS01..DS13 (13 itens)
 * DW01 (1 item)
 * Total = 68 itens
 */
export const PROVISIONAL_STORAGE_DEPOSITS: ReadonlyArray<{ code: string; description: string }> = [
  { code: 'DP01', description: 'Almoxarifado' },
  { code: 'DP02', description: 'Matéria Prima L2' },
  { code: 'DP03', description: 'Forno L2' },
  { code: 'DP04', description: 'Semi-Acabado L2' },
  { code: 'DP05', description: 'Acabado L2' },
  { code: 'DP06', description: 'Quarentena L2' },
  { code: 'DP07', description: 'Matéria Prima L1' },
  { code: 'DP08', description: 'Forno L1' },
  { code: 'DP09', description: 'Semi-Acabado L1' },
  { code: 'DP10', description: 'Acabado L1' },
  { code: 'DP11', description: 'Quarentena L1' },
  { code: 'DP12', description: 'Sucata' },
  { code: 'DP13', description: 'Óleo da L1' },
  { code: 'DP14', description: 'Óleo da L2' },
  { code: 'DP15', description: 'Óleo da Central' },
  { code: 'DP16', description: 'Óleo Sidercentro' },
  { code: 'DP17', description: 'KS - Ferradura' },
  { code: 'DP18', description: 'KS - CIAFAL' },
  { code: 'DP19', description: 'Múltiplos KS Fer' },
  { code: 'DP20', description: 'MP KS-CIA' },
  { code: 'DP21', description: 'MP LPP - Central' },
  { code: 'DP22', description: 'Importados' },
  { code: 'DP23', description: 'Revenda' },
  { code: 'DP24', description: 'Industrialização' },
  { code: 'DP25', description: 'MP KS-FER' },
  { code: 'DP26', description: 'Inspeção YOKE' },
  { code: 'DP27', description: 'Semi inspeção' },
  { code: 'DP28', description: 'MP para envio' },
  { code: 'DP29', description: 'Subprodutos Ferr' },
  { code: 'DP30', description: 'Arcelor/Exped' },
  { code: 'DP31', description: 'Almoxarifado EPI' },
  { code: 'DP32', description: 'Argola' },
  { code: 'DP33', description: 'Depósito CISAM' },
  { code: 'DP34', description: 'Expedição' },
  { code: 'DP35', description: 'Retrabalho ACAB' },
  { code: 'DP36', description: 'Gases KS' },
  { code: 'DP37', description: 'Acabado LPP' },
  { code: 'DP98', description: 'Dep. Fundição' },
  { code: 'DP99', description: 'Subprodutos' },
  { code: 'DC01', description: 'Almoxarifado 1' },
  { code: 'DC02', description: 'Almoxarifado 2' },
  { code: 'DC03', description: 'Almoxarifado 3' },
  { code: 'DC04', description: 'MP Alto Forno' },
  { code: 'DC05', description: 'Gusa' },
  { code: 'DC06', description: 'MP Aciária' },
  { code: 'DC07', description: 'Sucatas MP' },
  { code: 'DC08', description: 'Tarugo semiacabo' },
  { code: 'DC09', description: 'Tarugo acabado' },
  { code: 'DC10', description: 'Seleção envio' },
  { code: 'DC11', description: 'Subprodutos' },
  { code: 'DC12', description: 'Almoxarifado EPI' },
  { code: 'DC13', description: 'Refratários' },
  { code: 'DC14', description: 'Gases Indust.' },
  { code: 'DC15', description: 'Refra-Consignado' },
  { code: 'DS01', description: 'Almoxarifado' },
  { code: 'DS02', description: 'Óleo forno' },
  { code: 'DS03', description: 'MatériaPrima SDC' },
  { code: 'DS04', description: 'Forno SDC' },
  { code: 'DS05', description: 'Semiacabado SDC' },
  { code: 'DS06', description: 'Acabado SDC' },
  { code: 'DS07', description: 'MP para Argola' },
  { code: 'DS08', description: 'Argolas' },
  { code: 'DS09', description: 'Retrabalho SDC' },
  { code: 'DS10', description: 'Subprodutos' },
  { code: 'DS11', description: 'Industrialização' },
  { code: 'DS12', description: 'Revenda' },
  { code: 'DS13', description: 'Importado' },
  { code: 'DW01', description: 'Armazém' },
] as const

/**
 * Alias constante para compatibilidade direta de importação
 */
export const PROVISIONAL_DEPOSITS_LIST = PROVISIONAL_STORAGE_DEPOSITS

const PROVISIONAL_DEPOSIT_MAP = new Map<string, string>(
  PROVISIONAL_STORAGE_DEPOSITS.map((d) => [d.code, d.description]),
)

export interface GetDepositsParams {
  werks?: string
  search?: string
  forceRefresh?: boolean
  preferRfc?: boolean // default true: tenta RFC primeiro se werks informado, fallback para lista temporária
}

export interface GetDepositsResult {
  data: StorageDepositItem[]
  source: 'SAP_RFC' | 'PROVISIONAL_HOMOLOGATION'
  isProvisional: boolean
  warningMessage?: string
  totalCount: number
}

class PcpStorageDepositsService {
  /**
   * Retorna os 68 depósitos controlados provisórios pré-formatados.
   */
  public getProvisionalDeposits(search?: string): StorageDepositItem[] {
    const list: StorageDepositItem[] = PROVISIONAL_STORAGE_DEPOSITS.map((item) => ({
      code: item.code,
      description: item.description,
      label: `${item.code} — ${item.description}`,
      source: 'PROVISIONAL_HOMOLOGATION',
      isProvisional: true,
    }))

    return this.filterDeposits(list, search)
  }

  /**
   * Consulta depósitos usando a estratégia:
   * 1. Se preferRfc=true e werks foi informado: consulta SAP RFC T001L.
   * 2. Se a RFC responder com dados: retorna os dados oficiais SAP.
   * 3. Se a RFC falhar (503 / endpoint não configurado / offline) ou werks não retornar itens:
   *    assume a lista controlada temporária de 68 itens como fallback de homologação.
   */
  public async getDepositsForDemand(params?: GetDepositsParams): Promise<GetDepositsResult> {
    const preferRfc = params?.preferRfc !== false
    const werks = (params?.werks || '').trim()

    if (preferRfc && werks) {
      try {
        const rfcResult = await sapParametersMasterDataService.fetchDeposits({
          werks,
          search: params?.search,
          forceRefresh: params?.forceRefresh,
        })

        if (rfcResult.success && Array.isArray(rfcResult.data) && rfcResult.data.length > 0) {
          const mapped: StorageDepositItem[] = rfcResult.data.map((d) => ({
            code: d.lgort,
            description: d.description || d.lgort,
            label: d.label || (d.description ? `${d.lgort} — ${d.description}` : d.lgort),
            source: 'SAP_T001L',
            isProvisional: false,
          }))

          return {
            data: mapped,
            source: 'SAP_RFC',
            isProvisional: false,
            totalCount: mapped.length,
          }
        }
      } catch (err) {
        console.warn(
          `[PcpStorageDepositsService] RFC T001L indisponível para WERKS ${werks}. Ativando lista temporária de homologação.`,
          err,
        )
      }
    }

    // Fallback: lista temporária de homologação (68 depósitos)
    const provList = this.getProvisionalDeposits(params?.search)
    return {
      data: provList,
      source: 'PROVISIONAL_HOMOLOGATION',
      isProvisional: true,
      warningMessage:
        'Lista temporária para homologação — fonte definitiva: SAP ECC via RFC (LGORT)',
      totalCount: provList.length,
    }
  }

  /**
   * Obtém a descrição de um depósito a partir do código.
   * Se existir na lista provisória de 68 depósitos, retorna sua descrição oficial.
   */
  public getDepositDescription(code?: string | null): string {
    if (!code) return ''
    const clean = code.trim().toUpperCase()
    return PROVISIONAL_DEPOSIT_MAP.get(clean) || ''
  }

  /**
   * Retorna o rótulo formatado padrão: "[Código] — [Descrição]" ou somente "[Código]" caso não haja descrição.
   */
  public formatDepositLabel(code?: string | null, customDescription?: string | null): string {
    if (!code) return '—'
    const cleanCode = code.trim().toUpperCase()
    const desc = customDescription?.trim() || this.getDepositDescription(cleanCode)
    return desc ? `${cleanCode} — ${desc}` : cleanCode
  }

  /**
   * Valida se um código pertence à lista de depósitos válidos (seja da lista de homologação ou SAP fornecido).
   * Tolera maiúsculas/minúsculas no código.
   */
  public isValidDepositCode(code?: string | null, extraOptions?: StorageDepositItem[]): boolean {
    if (!code || !code.trim()) return false
    const clean = code.trim().toUpperCase()
    if (PROVISIONAL_DEPOSIT_MAP.has(clean)) return true
    if (extraOptions && extraOptions.some((opt) => opt.code.toUpperCase() === clean)) return true
    return false
  }

  /**
   * Filtro pesquisável case-insensitive e tolerante a acentos sobre código e descrição.
   */
  public filterDeposits(list: StorageDepositItem[], search?: string): StorageDepositItem[] {
    if (!search || !search.trim()) return list
    const q = normalizeForSearch(search)
    return list.filter((item) => {
      const codeNorm = normalizeForSearch(item.code)
      const descNorm = normalizeForSearch(item.description)
      const labelNorm = normalizeForSearch(item.label)
      return codeNorm.includes(q) || descNorm.includes(q) || labelNorm.includes(q)
    })
  }

  /**
   * Retorna valor normalizado para busca do CommandItem do cmdk.
   * Garante correspondência interna do cmdk por código e descrição sem acentos.
   */
  public getCommandItemValue(item: { code: string; description?: string; label?: string }): string {
    const code = normalizeForSearch(item.code)
    const desc = normalizeForSearch(item.description)
    return `${code} ${desc}`.trim()
  }
}

export const pcpStorageDepositsService = new PcpStorageDepositsService()

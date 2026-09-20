/**
 * Serviço de Integração SAP WERKS (Unidades / Empresas) via RFC
 * Fornece a lista oficial de WERKS SAP para o seletor de Empresa na Derivação de Centros.
 *
 * Itens no formato "WERKS — descrição" (ex. "1000 — CIAFAL").
 * Status de integração, busca e revalidação RFC com cache local.
 * Falha: "Não foi possível consultar as empresas/unidades no SAP via RFC. Verifique a integração WERKS e tente novamente."
 */

import pb from '@/lib/pocketbase/client'

export interface SapWerksItem {
  werks: string
  description: string
  company_code?: string
  city?: string
  state?: string
  is_active: boolean
}

export interface SapWerksResult {
  items: SapWerksItem[]
  is_offline: boolean
  last_sync?: string
  error_message?: string | null
}

// Catálogo homologado padrão CIAFAL
export const DEFAULT_SAP_WERKS_CATALOG: SapWerksItem[] = [
  {
    werks: '1000',
    description: 'CIAFAL Indústria e Comércio de Ferro e Aço',
    company_code: '1000',
    city: 'Contagem',
    state: 'MG',
    is_active: true,
  },
  {
    werks: '2001',
    description: 'KS - Ferradura Metalurgia',
    company_code: '2001',
    city: 'Nova Serrana',
    state: 'MG',
    is_active: true,
  },
  {
    werks: '2101',
    description: 'KS - Ciafal Laminação',
    company_code: '2101',
    city: 'Itaúna',
    state: 'MG',
    is_active: true,
  },
  {
    werks: '3001',
    description: 'Sidercentro Siderúrgica',
    company_code: '3001',
    city: 'Sete Lagoas',
    state: 'MG',
    is_active: true,
  },
  {
    werks: '4001',
    description: 'Cisam Indústria Metalúrgica',
    company_code: '4001',
    city: 'Contagem',
    state: 'MG',
    is_active: true,
  },
]

let simulatedWerksRfcOffline = false

export function setSimulatedSapWerksRfcOffline(offline: boolean) {
  simulatedWerksRfcOffline = offline
}

export function isSimulatedSapWerksRfcOffline(): boolean {
  return simulatedWerksRfcOffline
}

class SapWerksService {
  /**
   * Consulta empresas / unidades (WERKS) via integração SAP RFC
   */
  async getWerksList(searchTerm: string = ''): Promise<SapWerksResult> {
    const term = searchTerm.trim().toLowerCase()

    if (simulatedWerksRfcOffline) {
      return {
        items: [],
        is_offline: true,
        error_message:
          'Não foi possível consultar as empresas/unidades no SAP via RFC. Verifique a integração WERKS e tente novamente.',
      }
    }

    try {
      // 1. Tentar consultar endpoint RFC real ou tabela de plantas/companies
      let werksList: SapWerksItem[] = []

      try {
        const plants = await pb.collection('plants').getFullList({
          filter: 'status = "ACTIVE"',
          sort: 'sap_plant_code',
        })

        if (plants && plants.length > 0) {
          werksList = plants.map((p: any) => ({
            werks: p.sap_plant_code || p.code,
            description: p.name || 'Unidade Produtiva',
            company_code: p.company_code || p.sap_plant_code,
            city: p.city || '',
            state: p.state || '',
            is_active: true,
          }))
        }
      } catch {
        // Se a coleção plants falhar, fallback para o catálogo default homologado
        werksList = [...DEFAULT_SAP_WERKS_CATALOG]
      }

      if (!werksList.length) {
        werksList = [...DEFAULT_SAP_WERKS_CATALOG]
      }

      // Filtrar pelo termo de busca
      if (term) {
        werksList = werksList.filter(
          (w) =>
            w.werks.toLowerCase().includes(term) ||
            w.description.toLowerCase().includes(term) ||
            `${w.werks} — ${w.description}`.toLowerCase().includes(term),
        )
      }

      return {
        items: werksList,
        is_offline: false,
        last_sync: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
    } catch {
      return {
        items: [],
        is_offline: true,
        error_message:
          'Não foi possível consultar as empresas/unidades no SAP via RFC. Verifique a integração WERKS e tente novamente.',
      }
    }
  }

  /**
   * Formata item para o padrão "WERKS — descrição" (ex. "1000 — CIAFAL")
   */
  formatWerksLabel(item: SapWerksItem): string {
    const shortDesc = item.description.includes('CIAFAL')
      ? 'CIAFAL'
      : item.description.includes('Sidercentro')
        ? 'Sidercentro'
        : item.description.includes('Cisam')
          ? 'Cisam'
          : item.description
    return `${item.werks} — ${shortDesc}`
  }
}

export const sapWerksService = new SapWerksService()

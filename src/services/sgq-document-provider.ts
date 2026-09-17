/**
 * Provider de integração SGQ (Sistema de Gestão da Qualidade / Informação Documentada)
 * ETAPA 1 da integração PCP + SGQ.
 * Interface e implementação padrão sem mocks ou dados fictícios.
 */

export type SgqDocumentStatus = 'VIGENTE' | 'OBSOLETO' | 'CANCELADO' | 'SUBSTITUIDO'

export type SgqInterferenceCategory =
  | 'SEQUENCING'
  | 'SETUP'
  | 'PRODUCTIVITY'
  | 'BOTTLENECK_MATRIX'
  | 'MP_UTILIZATION'

export const SGQ_INTERFERENCE_CATEGORY_LABELS: Record<SgqInterferenceCategory, string> = {
  SEQUENCING: 'Sequenciamento',
  SETUP: 'Setup & Matriz de Troca',
  PRODUCTIVITY: 'Produtividade & Velocidade',
  BOTTLENECK_MATRIX: 'Gargalos & Restrições',
  MP_UTILIZATION: 'Utilização de Matéria-Prima',
}

export const SGQ_INTERFERENCE_CATEGORY_COLORS: Record<
  SgqInterferenceCategory,
  { bg: string; text: string; border: string }
> = {
  SEQUENCING: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  SETUP: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  PRODUCTIVITY: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  BOTTLENECK_MATRIX: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  MP_UTILIZATION: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
}

export interface SgqDocument {
  id: string
  code: string
  title: string
  revision: string
  status: SgqDocumentStatus
  documentType?: string
  responsibleArea?: string
  process?: string
  validityDate?: string
  originalUrl?: string
  activeRevisionRef?: string
}

export interface SgqSearchFilters {
  code?: string
  name?: string
  documentType?: string
  process?: string
  responsibleArea?: string
  revision?: string
  status?: SgqDocumentStatus | ''
  validityDate?: string
  keyword?: string
}

export interface SgqIntegrationStatus {
  connected: boolean
  message: string
  lastSyncAt?: string
  endpoint?: string
}

export interface ISgqDocumentProvider {
  isAvailable(): Promise<boolean>
  getIntegrationStatus(): Promise<SgqIntegrationStatus>
  searchDocuments(filters: SgqSearchFilters): Promise<SgqDocument[]>
  getDocumentById(id: string): Promise<SgqDocument | null>
}

/**
 * Implementação padrão enquanto a integração oficial do SGQ Informação Documentada não estiver conectada.
 * Retorna connected=false, listas vazias e mensagem clara ao usuário — SEM mocks e SEM travar a UI.
 */
export class DefaultSgqDocumentProvider implements ISgqDocumentProvider {
  async isAvailable(): Promise<boolean> {
    return false
  }

  async getIntegrationStatus(): Promise<SgqIntegrationStatus> {
    return {
      connected: false,
      message:
        'A integração com o SGQ > Informação Documentada ainda não está conectada. Os documentos controlados aparecerão aqui quando a integração for ativada.',
    }
  }

  async searchDocuments(_filters: SgqSearchFilters): Promise<SgqDocument[]> {
    // Sem dados fictícios — integração pendente
    return []
  }

  async getDocumentById(_id: string): Promise<SgqDocument | null> {
    return null
  }
}

export const sgqDocumentProvider: ISgqDocumentProvider = new DefaultSgqDocumentProvider()

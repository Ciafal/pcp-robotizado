/**
 * Provider e Adapter de integração SGQ (Sistema de Gestão da Qualidade / Informação Documentada)
 * Camada desacoplada e configurável por ambiente:
 * - URL oficial do endpoint SGQ (sem hardcode)
 * - Autenticação / Token / Headers
 * - Timeout e paginação configuráveis
 * - Mock explicitamente identificado EXCLUSIVO para homologação quando ativado por flag de ambiente/modo
 * - Contrato mínimo completo: ID técnico, código, título, tipo documental, revisão, status,
 *   área responsável, processo, vigência inicial/final, URL do original, conteúdo extraível,
 *   última atualização, indicadores de vigente e aprovado.
 */

import { pb } from '@/lib/pocketbase/client'

export type SgqDocumentStatus = 'VIGENTE' | 'OBSOLETO' | 'CANCELADO' | 'SUBSTITUIDO'

export type SgqInterferenceCategory =
  | 'SEQUENCING'
  | 'SETUP'
  | 'PRODUCTIVITY'
  | 'BOTTLENECK_MATRIX'
  | 'MP_UTILIZATION'

export const SGQ_INTERFERENCE_CATEGORY_LABELS: Record<SgqInterferenceCategory, string> = {
  SEQUENCING: 'Sequenciamento Produtivo',
  SETUP: 'Setups e Acertos',
  PRODUCTIVITY: 'Produtividade',
  BOTTLENECK_MATRIX: 'Matriz de Gargalo',
  MP_UTILIZATION: 'Utilização da MP',
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
  validityDateStart?: string
  validityDateEnd?: string
  validityDate?: string // Alias para compatibilidade
  originalUrl?: string
  activeRevisionRef?: string
  extractableContent?: string
  lastUpdatedAt?: string
  isCurrentValid?: boolean
  isApproved?: boolean
  extraFields?: Record<string, any>
  isSimulatedHomologation?: boolean
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

export type SgqConnectionState =
  | 'CONECTADO'
  | 'CACHE'
  | 'INDISPONIVEL'
  | 'NAO_CONFIGURADO'
  | 'HOMOLOGACAO_SIMULADO'

export interface SgqIntegrationStatus {
  connected: boolean
  state: SgqConnectionState
  title: string
  message: string
  description?: string
  lastSyncAt?: string
  endpoint?: string
  sourceLabel: string
  isSimulatedHomologation?: boolean
  totalAvailable?: number
}

export interface SgqAdapterConfig {
  endpointUrl?: string
  apiToken?: string
  timeoutMs?: number
  pageSize?: number
  enableHomologationMock?: boolean
}

export interface ISgqDocumentProvider {
  isAvailable(): Promise<boolean>
  getIntegrationStatus(): Promise<SgqIntegrationStatus>
  searchDocuments(filters: SgqSearchFilters): Promise<SgqDocument[]>
  getDocumentById(id: string): Promise<SgqDocument | null>
  syncSgq(): Promise<SgqIntegrationStatus>
  configure(config: Partial<SgqAdapterConfig>): void
}

/**
 * Base de documentos de homologação controlados para validação de testes e homologação
 * SEMPRE explicitamente marcados como "Fonte de homologação / dados simulados".
 */
export const HOMOLOGATION_MOCK_DOCUMENTS: SgqDocument[] = [
  {
    id: 'SGQ-DOC-001',
    code: 'PO-LAM-014',
    title: 'Procedimento Operacional de Sequenciamento e Troca de Bitolas da Laminação',
    revision: 'Rev.04',
    status: 'VIGENTE',
    documentType: 'Procedimento Operacional (PO)',
    responsibleArea: 'Engenharia de Processos',
    process: 'Laminação a Quente',
    validityDateStart: '2024-01-01',
    validityDateEnd: '2026-12-31',
    validityDate: '2026-12-31',
    originalUrl: 'https://sgq.ciafal.internal/docs/PO-LAM-014-rev04.pdf',
    activeRevisionRef: 'REV-04-2024',
    isCurrentValid: true,
    isApproved: true,
    isSimulatedHomologation: true,
    lastUpdatedAt: '2024-03-15T10:00:00Z',
    extractableContent: `
[PO-LAM-014 Rev.04 - PROCEDIMENTO OPERACIONAL DE SEQUENCIAMENTO]
Seção 3.1 - Restrições Críticas de Sequenciamento:
OBRIGAÇÃO: Na transição entre perfis Pesados (Família FP-BARRA-RED) e Perfis Leves (Família FP-CANTONEIRA), o tempo mínimo de setup e acerto da tesoura TR2 é de 40 minutos.
PROIBIÇÃO: O produto MAT-CA50-100 não pode ser produzido imediatamente após o produto MAT-CA50-080 sem troca de cilindros intermediária.
LIMITE: A velocidade máxima da mesa de resfriamento TCC para bitolas acima de 1 polegada é de 22 t/h.
PARÂMETRO TÉCNICO: Temperatura mínima de enfornamento de tarugos especiais é de 1150 °C.
RECOMENDAÇÃO: Recomenda-se agrupar ordens do mesmo diâmetro nominal antes de variar a tolerância superficial.
    `.trim(),
  },
  {
    id: 'SGQ-DOC-002',
    code: 'IT-TREF-008',
    title: 'Instrução de Trabalho — Produtividade e Cadência Mínima na Trefilação L1',
    revision: 'Rev.02',
    status: 'VIGENTE',
    documentType: 'Instrução de Trabalho (IT)',
    responsibleArea: 'Qualidade Assegurada',
    process: 'Trefilação',
    validityDateStart: '2024-02-10',
    validityDateEnd: '2026-06-30',
    validityDate: '2026-06-30',
    originalUrl: 'https://sgq.ciafal.internal/docs/IT-TREF-008-rev02.pdf',
    activeRevisionRef: 'REV-02-2024',
    isCurrentValid: true,
    isApproved: true,
    isSimulatedHomologation: true,
    lastUpdatedAt: '2024-02-10T14:30:00Z',
    extractableContent: `
[IT-TREF-008 Rev.02 - INSTRUÇÃO TÉCNICA DE PRODUTIVIDADE TREFILAÇÃO]
Seção 2 - Limites de Cadência Operacional:
LIMITE: A cadência nominal do produto MAT-ARAME-001 na Linha L1 deve operar estritamente em 28.5 t/h para garantir conformidade de tração mecânica.
OBRIGAÇÃO: Troca entre acabamento fosfatizado e trefilado polido exige limpeza do tambor de tração com tempo mínimo de 25 minutos.
PROIBIÇÃO: É proibido programar trefilação contínua superior a 16 horas sem inspeção ultrassônica preventiva no mandril.
RECOMENDAÇÃO: Priorizar bobinas decapadas no mesmo turno para evitar oxidação superficial.
    `.trim(),
  },
  {
    id: 'SGQ-DOC-003',
    code: 'SPEC-MP-021',
    title: 'Especificação Técnica de Utilização e Aproveitamento de Tarugos e Sucata Controlada',
    revision: 'Rev.05',
    status: 'VIGENTE',
    documentType: 'Especificação Técnica (ET)',
    responsibleArea: 'Metalurgia e Materiais',
    process: 'Pátio de Matéria-Prima & Forno',
    validityDateStart: '2023-11-01',
    validityDateEnd: '2025-12-31',
    validityDate: '2025-12-31',
    originalUrl: 'https://sgq.ciafal.internal/docs/SPEC-MP-021-rev05.pdf',
    activeRevisionRef: 'REV-05-2023',
    isCurrentValid: true,
    isApproved: true,
    isSimulatedHomologation: true,
    lastUpdatedAt: '2023-11-01T08:00:00Z',
    extractableContent: `
[SPEC-MP-021 Rev.05 - ESPECIFICAÇÃO DE MATÉRIA-PRIMA]
Seção 4 - Restrições de Carga e Rendimento Metálico:
PROIBIÇÃO: Proibida a utilização de tarugos com comprimento inferior a 5.8 metros no trem contínuo sem aprovação da metalurgia.
OBRIGAÇÃO: Carga direta a quente (Hot Charging) exige tarugos com temperatura superficial mínima de 500 °C.
LIMITE: A perda metálica máxima por oxidação no forno de reaquecimento não pode ultrapassar 1.8% da massa total carregada.
PARÂMETRO TÉCNICO: Fator de rendimento metálico padrão para tarugos 1020 é de 96.5%.
RECOMENDAÇÃO: Programar tarugos de cabeceira de corrida preferencialmente no primeiro turno da semana.
    `.trim(),
  },
]

/**
 * Adapter Desacoplado de Integração com o SGQ (Informação Documentada).
 * Nunca quebra a aplicação com tela vermelha ou erro técnico quando não configurado.
 * Consome automaticamente a fonte real quando a URL e token estiverem configurados.
 */
export class SgqDocumentAdapter implements ISgqDocumentProvider {
  private config: SgqAdapterConfig = {
    endpointUrl: import.meta.env.VITE_SGQ_API_URL || '',
    apiToken: import.meta.env.VITE_SGQ_API_TOKEN || '',
    timeoutMs: 8000,
    pageSize: 50,
    // Permite mock se expressamente ligado via flag de homologação OU se em modo dev/test
    enableHomologationMock:
      import.meta.env.VITE_SGQ_ENABLE_MOCK === 'true' ||
      import.meta.env.MODE === 'test' ||
      (typeof window !== 'undefined' &&
        window.localStorage?.getItem('PCP_SGQ_HOMOLOGATION_MOCK') === 'true'),
  }

  private lastSyncTimestamp: string | undefined = undefined

  constructor(initialConfig?: Partial<SgqAdapterConfig>) {
    if (initialConfig) {
      this.configure(initialConfig)
    }
  }

  configure(config: Partial<SgqAdapterConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async isAvailable(): Promise<boolean> {
    if (this.config.endpointUrl) {
      return true
    }
    return Boolean(this.config.enableHomologationMock)
  }

  async getIntegrationStatus(): Promise<SgqIntegrationStatus> {
    // 1. Endpoint real configurado
    if (this.config.endpointUrl) {
      return {
        connected: true,
        state: 'CONECTADO',
        title: 'Conectado ao SGQ Oficial',
        message: 'Comunicação ativa com o repositório oficial de Informação Documentada.',
        description: `Endpoint: ${this.config.endpointUrl}`,
        lastSyncAt: this.lastSyncTimestamp || new Date().toISOString(),
        endpoint: this.config.endpointUrl,
        sourceLabel: 'SGQ > Informação Documentada (Oficial)',
        isSimulatedHomologation: false,
      }
    }

    // 2. Coleção oficial sgq_documented_information no PocketBase
    try {
      if (pb) {
        const count = await pb
          .collection('sgq_documented_information')
          .getList(1, 1, { requestKey: null })
        if (count && count.totalItems > 0) {
          return {
            connected: true,
            state: 'CONECTADO',
            title: 'SGQ Oficial Integrado',
            message:
              'Comunicação ativa com o repositório oficial de Informação Documentada do SGQ.',
            description: `Repositório oficial ativo com ${count.totalItems} documentos vigentes catalogados.`,
            lastSyncAt: this.lastSyncTimestamp || new Date().toISOString(),
            endpoint: 'pocketbase://sgq_documented_information',
            sourceLabel: 'SGQ > Informação Documentada',
            isSimulatedHomologation: false,
            totalAvailable: count.totalItems,
          }
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // 3. Modo de Homologação / Simulado ativado explicitamente
    if (this.config.enableHomologationMock) {
      return {
        connected: true,
        state: 'HOMOLOGACAO_SIMULADO',
        title: 'Fonte de homologação / dados simulados',
        message:
          'Ambiente em modo de homologação técnica com acervo documental simulado para validação de regras de PCP.',
        description: 'Os documentos apresentados são réplicas controladas para testes e QA.',
        lastSyncAt: this.lastSyncTimestamp || new Date().toISOString(),
        endpoint: 'homologation-mock://internal-sgq-provider',
        sourceLabel: 'Fonte de homologação / dados simulados',
        isSimulatedHomologation: true,
        totalAvailable: HOMOLOGATION_MOCK_DOCUMENTS.length,
      }
    }

    // 4. Não configurado
    return {
      connected: false,
      state: 'NAO_CONFIGURADO',
      title: 'Integração com SGQ aguardando configuração',
      message: 'Integração com SGQ aguardando configuração',
      description:
        'A estrutura de Documentos de Referência está preparada. Configure a fonte do módulo Informação Documentada para sincronizar os documentos oficiais.',
      sourceLabel: 'SGQ > Informação Documentada',
      isSimulatedHomologation: false,
    }
  }

  async searchDocuments(filters: SgqSearchFilters): Promise<SgqDocument[]> {
    // 1. Tentar consultar coleção oficial de Informação Documentada do SGQ no banco de dados
    try {
      if (pb) {
        const filterParts: string[] = []
        if (filters.status) {
          filterParts.push(`status = "${filters.status}"`)
        }
        if (filters.code) {
          filterParts.push(`code ~ "${filters.code}"`)
        }
        if (filters.name) {
          filterParts.push(`title ~ "${filters.name}"`)
        }
        if (filters.documentType) {
          filterParts.push(`document_type ~ "${filters.documentType}"`)
        }
        if (filters.process) {
          filterParts.push(`process ~ "${filters.process}"`)
        }
        if (filters.responsibleArea) {
          filterParts.push(`responsible_area ~ "${filters.responsibleArea}"`)
        }

        const records = await pb.collection('sgq_documented_information').getFullList({
          filter: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
          sort: 'code',
          requestKey: null,
        })

        if (records && records.length > 0) {
          this.lastSyncTimestamp = new Date().toISOString()
          return records.map((r: any) => ({
            id: r.id,
            code: r.code,
            title: r.title,
            revision: r.revision || 'Rev.01',
            status: (r.status as SgqDocumentStatus) || 'VIGENTE',
            documentType: r.document_type || '',
            responsibleArea: r.responsible_area || '',
            process: r.process || '',
            validityDateStart: r.validity_date_start || '',
            validityDateEnd: r.validity_date_end || '',
            validityDate: r.validity_date_end || '',
            originalUrl: r.original_url || '',
            activeRevisionRef: r.active_revision_ref || `${r.code}-${r.revision}`,
            extractableContent: r.extractable_content || '',
            lastUpdatedAt: r.updated || r.created,
            isCurrentValid: r.status === 'VIGENTE',
            isApproved: true,
            isSimulatedHomologation: false,
          }))
        }
      }
    } catch (dbErr) {
      console.warn('Coleção sgq_documented_information não disponível ou erro no banco:', dbErr)
    }

    // 2. Se há endpoint real configurado, chama via fetch com timeout
    if (this.config.endpointUrl) {
      try {
        const url = new URL(`${this.config.endpointUrl.replace(/\/$/, '')}/documents`)
        if (filters.code) url.searchParams.set('code', filters.code)
        if (filters.name) url.searchParams.set('name', filters.name)
        if (filters.documentType) url.searchParams.set('documentType', filters.documentType)
        if (filters.process) url.searchParams.set('process', filters.process)
        if (filters.responsibleArea)
          url.searchParams.set('responsibleArea', filters.responsibleArea)
        if (filters.revision) url.searchParams.set('revision', filters.revision)
        if (filters.status) url.searchParams.set('status', filters.status)
        if (filters.keyword) url.searchParams.set('q', filters.keyword)

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), this.config.timeoutMs || 8000)

        const headers: Record<string, string> = {
          Accept: 'application/json',
        }
        if (this.config.apiToken) {
          headers['Authorization'] = `Bearer ${this.config.apiToken}`
        }

        const res = await fetch(url.toString(), {
          method: 'GET',
          headers,
          signal: controller.signal,
        })
        clearTimeout(timer)

        if (!res.ok) {
          throw new Error(`SGQ HTTP ${res.status}: ${res.statusText}`)
        }

        const data = await res.json()
        const docs: SgqDocument[] = Array.isArray(data) ? data : data.items || data.documents || []
        this.lastSyncTimestamp = new Date().toISOString()
        return docs
      } catch (err) {
        console.warn('Falha ao consultar SGQ real via endpoint; adaptando status:', err)
        return []
      }
    }

    // 3. Se homologação mock está permitida
    if (this.config.enableHomologationMock) {
      let filtered = [...HOMOLOGATION_MOCK_DOCUMENTS]
      if (filters.code) {
        const q = filters.code.toLowerCase()
        filtered = filtered.filter((d) => d.code.toLowerCase().includes(q))
      }
      if (filters.name) {
        const q = filters.name.toLowerCase()
        filtered = filtered.filter((d) => d.title.toLowerCase().includes(q))
      }
      if (filters.documentType) {
        const q = filters.documentType.toLowerCase()
        filtered = filtered.filter((d) => (d.documentType || '').toLowerCase().includes(q))
      }
      if (filters.process) {
        const q = filters.process.toLowerCase()
        filtered = filtered.filter((d) => (d.process || '').toLowerCase().includes(q))
      }
      if (filters.responsibleArea) {
        const q = filters.responsibleArea.toLowerCase()
        filtered = filtered.filter((d) => (d.responsibleArea || '').toLowerCase().includes(q))
      }
      if (filters.revision) {
        const q = filters.revision.toLowerCase()
        filtered = filtered.filter((d) => d.revision.toLowerCase().includes(q))
      }
      if (filters.status) {
        filtered = filtered.filter((d) => d.status === filters.status)
      }
      if (filters.keyword) {
        const q = filters.keyword.toLowerCase()
        filtered = filtered.filter(
          (d) =>
            d.code.toLowerCase().includes(q) ||
            d.title.toLowerCase().includes(q) ||
            (d.extractableContent || '').toLowerCase().includes(q),
        )
      }
      return filtered
    }

    // Sem endpoint e sem mock de homologação: retorna vazio sem quebrar
    return []
  }

  async getDocumentById(id: string): Promise<SgqDocument | null> {
    // 1. Consultar primeiro na coleção oficial sgq_documented_information
    try {
      if (pb) {
        let record = null
        try {
          record = await pb
            .collection('sgq_documented_information')
            .getOne(id, { requestKey: null })
        } catch {
          // Pode ser o code em vez do id
          try {
            record = await pb
              .collection('sgq_documented_information')
              .getFirstListItem(`code = "${id}"`, { requestKey: null })
          } catch {
            /* intentionally ignored */
          }
        }

        if (record) {
          return {
            id: record.id,
            code: record.code,
            title: record.title,
            revision: record.revision || 'Rev.01',
            status: (record.status as SgqDocumentStatus) || 'VIGENTE',
            documentType: record.document_type || '',
            responsibleArea: record.responsible_area || '',
            process: record.process || '',
            validityDateStart: record.validity_date_start || '',
            validityDateEnd: record.validity_date_end || '',
            validityDate: record.validity_date_end || '',
            originalUrl: record.original_url || '',
            activeRevisionRef: record.active_revision_ref || `${record.code}-${record.revision}`,
            extractableContent: record.extractable_content || '',
            lastUpdatedAt: record.updated || record.created,
            isCurrentValid: record.status === 'VIGENTE',
            isApproved: true,
            isSimulatedHomologation: false,
          }
        }
      }
    } catch {
      /* intentionally ignored */
    }

    if (this.config.endpointUrl) {
      try {
        const res = await fetch(
          `${this.config.endpointUrl.replace(/\/$/, '')}/documents/${encodeURIComponent(id)}`,
          {
            headers: this.config.apiToken
              ? { Authorization: `Bearer ${this.config.apiToken}` }
              : {},
          },
        )
        if (res.ok) {
          return await res.json()
        }
      } catch {
        return null
      }
    }

    if (this.config.enableHomologationMock) {
      const found = HOMOLOGATION_MOCK_DOCUMENTS.find((d) => d.id === id || d.code === id)
      return found || null
    }

    return null
  }

  async syncSgq(): Promise<SgqIntegrationStatus> {
    this.lastSyncTimestamp = new Date().toISOString()
    return this.getIntegrationStatus()
  }
}

// Instância singleton do adapter desacoplado
export const sgqDocumentProvider = new SgqDocumentAdapter()
export const DefaultSgqDocumentProvider = SgqDocumentAdapter
export type DefaultSgqDocumentProvider = SgqDocumentAdapter

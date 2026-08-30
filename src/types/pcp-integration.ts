export type IntegrationEnvironment = 'MOCK' | 'HOMOLOGACAO' | 'PRODUCAO'

export type IntegrationDestination = 'MES' | 'CRM' | 'TMS' | 'SAP' | 'WMS'

export type IntegrationEventType =
  | 'PROGRAMACAO_PUBLICADA'
  | 'ORDEM_REPROGRAMADA'
  | 'PREVISAO_LOGISTICA_ATUALIZADA'
  | 'OP_CRIADA_ATUALIZADA'
  | 'RECONCILIACAO_VERSAO'
  | 'TESTE_CONEXAO'

export type IntegrationEventStatus =
  | 'PENDENTE'
  | 'ENVIANDO'
  | 'ENVIADO'
  | 'RECEBIDO'
  | 'PROCESSADO'
  | 'ERRO'
  | 'INTERVENCAO_NECESSARIA'
  | 'EVENTO_JA_PROCESSADO'
  | 'NAO_APLICAVEL'

export interface IntegrationEventPayload {
  event_id: string
  origem: 'PCP'
  destino: IntegrationDestination
  tipo_evento: IntegrationEventType
  programacao_id: string // "WS-L1-2026-W35"
  programacao_item_id?: string
  versao: string // "V04"
  versao_num: number
  ambiente: IntegrationEnvironment
  payload: Record<string, any>
  status: IntegrationEventStatus
  tentativas: number
  max_tentativas: number
  criado_em: string
  enviado_em?: string
  recebido_em?: string
  processado_em?: string
  retorno_em?: string
  mensagem_erro?: string
  retorno_payload?: Record<string, any>
  responsavel_acao?: string
  reconciliado?: boolean
  reconciliado_em?: string
  id?: string
  created?: string
  updated?: string
}

export type ConnectorInterfaceType =
  | 'REST_API'
  | 'RFC_BAPI'
  | 'POSTGRESQL_BRIDGE'
  | 'EVENT_BUS_WEBHOOK'
  | 'IDOC_FILE'

export type ConnectorStatus = 'CONECTADO' | 'DESCONECTADO' | 'DEGRADADO' | 'EM_TESTE'

export interface ConnectorConfig {
  id?: string
  system_code: 'SAP_ECC' | 'MES' | 'CRM_360' | 'TMS' | 'WMS' | string
  system_name: string
  ambiente: IntegrationEnvironment
  interface_type: ConnectorInterfaceType
  endpoint: string
  method: string
  status: ConnectorStatus
  latency_ms: number
  pending_queue_count: number
  errors_count: number
  last_communication_at?: string
  last_success_at?: string
  last_error_at?: string
  last_error_message?: string
  retry_policy_json?: {
    maxRetries: number
    backoffSec: number
    alertOnFailure: boolean
  }
  description: string
  admin_permission_required: string
  updated_by_user?: string
  created?: string
  updated?: string
}

export interface IntegrationMonitorKPIs {
  eventsTodayCount: number
  pendingCount: number
  processedCount: number
  errorCount: number
  retryCount: number
  avgProcessingTimeMs: number
}

export interface ReconciliationResult {
  hasDivergence: boolean
  system: IntegrationDestination
  pcpVersion: string
  targetSystemVersion: string
  divergenceDetails: string
  suggestedAction: string
}

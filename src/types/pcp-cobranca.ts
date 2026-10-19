export type CobrancaMeuDiaStatus = 'ENVIADO' | 'ERRO' | 'PENDENTE' | 'NAO_APLICAVEL'
export type CobrancaEmailStatus =
  | 'ENVIADO'
  | 'AGUARDANDO_SMTP'
  | 'ERRO'
  | 'PENDENTE'
  | 'NAO_APLICAVEL'

export interface PCPCobrancaRecord {
  id: string
  codigo_cobranca: string // ex: COB-123456
  pendencia_id: string
  pendencia_codigo: string // ex: PEND-000001
  sequencial_pendencia: number // 1, 2, 3...
  data_hora: string

  assunto?: string
  acao?: string
  area?: string
  reuniao_origem?: string
  prazo?: string
  dias_aberto?: number
  status_pendencia?: string

  emissor_id: string
  emissor_nome: string
  emissor_email?: string
  destinatario_id?: string
  destinatario_nome: string
  destinatario_email: string

  mensagem_complementar?: string

  status_meu_dia: CobrancaMeuDiaStatus
  meu_dia_id?: string
  meu_dia_enviado_em?: string
  meu_dia_erro_motivo?: string

  status_email: CobrancaEmailStatus
  email_enviado_em?: string
  email_erro_motivo?: string
  email_destinatario_real?: string

  idempotency_key?: string
  metadata?: Record<string, any>

  created?: string
  updated?: string
}

export interface EnviarCobrancaParams {
  pendencia_id: string
  mensagem_complementar?: string
  idempotency_key?: string
}

export interface EnviarCobrancaResponse {
  success: boolean
  message: string
  cobranca: {
    id: string
    codigo_cobranca: string
    sequencial_pendencia: number
    status_meu_dia: CobrancaMeuDiaStatus
    status_email: CobrancaEmailStatus
    meu_dia_id?: string
    meu_dia_erro_motivo?: string
    email_erro_motivo?: string
    destinatario_nome: string
    destinatario_email: string
    data_hora: string
  }
  already_processed?: boolean
}

export interface ReenviarCanalParams {
  cobranca_id: string
  canal: 'meu_dia' | 'email'
}

export interface ReenviarCanalResponse {
  success: boolean
  message: string
}

/**
 * TIPOS OFICIAIS — DISTRIBUIÇÃO E CONFIRMAÇÃO DE LEITURA DE ATAS PCP (HUB CIAFAL)
 * Norma SGQ 8.1.001-R002 Rev 8
 */

export type CanalDistribuicao = 'HUB' | 'EMAIL'

export type StatusDistribuicaoHub =
  | 'PUBLICADO'
  | 'NOTIFICADO'
  | 'AGUARDANDO_CONFIRMACAO'
  | 'LEITURA_CONFIRMADA'
  | 'ERRO'

export type StatusDistribuicaoEmail =
  | 'PENDENTE'
  | 'PENDENTE_SMTP'
  | 'ENVIADO'
  | 'ENTREGUE'
  | 'LEITURA_CONFIRMADA'
  | 'ERRO'

export type StatusDistribuicaoGeral = StatusDistribuicaoHub | StatusDistribuicaoEmail

export interface DestinatarioAtaItem {
  id: string
  name: string
  email: string
  role?: string
  sector?: string
  isParticipant?: boolean
  isCc?: boolean
}

export interface PcpAtaDistribuicaoRecord {
  id: string
  ata_id: string
  meeting_id: string
  meeting_code?: string
  meeting_date?: string
  meeting_title?: string
  canal: CanalDistribuicao
  versao_ata: number
  is_minuta: boolean
  assunto: string
  mensagem_complementar?: string
  exigir_confirmacao: boolean
  destinatarios_json: DestinatarioAtaItem[]
  destinatarios_count: number
  cc_json?: DestinatarioAtaItem[]
  emissor_id?: string
  emissor_nome?: string
  emissor_email?: string
  pdf_nome_arquivo?: string
  pdf_identificador?: string
  comunicado_hub_id?: string
  status_distribuicao: StatusDistribuicaoGeral
  detalhes_status?: string
  idempotency_key?: string
  confirmacoes_count?: number
  created?: string
  updated?: string
}

export interface PcpAtaDestinatarioEnvioRecord {
  id: string
  distribuicao_id: string
  ata_id: string
  meeting_id: string
  versao_ata: number
  canal: CanalDistribuicao
  user_id?: string
  destinatario_nome: string
  destinatario_email: string
  setor?: string
  is_cc?: boolean
  status_envio: StatusDistribuicaoGeral
  enviado_em?: string
  confirmado_leitura?: boolean
  confirmado_em?: string
  canal_confirmacao?: string
  ip_origem?: string
  detalhes_envio?: string
  created?: string
  updated?: string
}

export interface PcpAtaConfirmacaoLeituraRecord {
  id: string
  ata_id: string
  meeting_id: string
  distribuicao_id?: string
  destinatario_envio_id?: string
  codigo_ata: string
  versao_ata: number
  user_id?: string
  user_nome: string
  user_email: string
  setor?: string
  canal_acesso?: string
  confirmado_em: string
  ip_origem?: string
  user_agent?: string
  declaracao_leitura?: string
  created?: string
  updated?: string
}

export interface EnviarComunicadoHubParams {
  ataId: string
  meetingId: string
  meetingCode: string
  meetingDate: string
  meetingTitle: string
  versaoAta: number
  isMinuta: boolean
  assunto: string
  mensagemComplementar?: string
  exigirConfirmacao: boolean
  destinatarios: DestinatarioAtaItem[]
  pdfNomeArquivo: string
  pdfBase64?: string
  currentUser: {
    id?: string
    name: string
    email?: string
    role?: string
  }
}

export interface EnviarEmailAtaParams {
  ataId: string
  meetingId: string
  meetingCode: string
  meetingDate: string
  meetingTitle: string
  versaoAta: number
  isMinuta: boolean
  assunto: string
  mensagemComplementar?: string
  exigirConfirmacao: boolean
  destinatarios: DestinatarioAtaItem[]
  destinatariosCc?: DestinatarioAtaItem[]
  pdfNomeArquivo: string
  pdfBlob?: Blob
  pdfBase64?: string
  corpoEmailHtml: string
  currentUser: {
    id?: string
    name: string
    email?: string
    role?: string
  }
}

export interface ConfirmarLeituraAtaParams {
  ataId: string
  meetingId: string
  codigoAta: string
  versaoAta: number
  canalAcesso?: string
  currentUser: {
    id?: string
    name: string
    email?: string
    sector?: string
    role?: string
  }
}

export interface IndicadoresHistoricoDistribuicao {
  totalDestinatarios: number
  enviosBemSucedidos: number
  confirmacoesRecebidas: number
  pendentesConfirmacao: number
  percentualConfirmado: number
  totalDistribuicoes: number
}

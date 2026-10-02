/**
 * Types para o Envio de Comunicado ao Comercial a partir da tela
 * "Carteira mínima não atingida" (PCP Robotizado > Análise de Carteira).
 */

import { CarteiraMinimaItem, CriticidadeCarteiraMinima } from './carteira-minima'

export type PrioridadeComunicado = 'Normal' | 'Atenção' | 'Crítica'

export type StatusComunicadoComercial =
  | 'Não enviado'
  | 'Enviado'
  | 'Em análise'
  | 'Respondido'
  | 'Encerrado'

export type DestinoComunicado = 'COMERCIAL_HUB' | 'MEU_DIA'

export interface DestinatarioHub {
  id: string
  name: string
  email: string
  role?: string
  sector?: string
  isVendedorResponsavel?: boolean
  grupo?: string
}

export interface ItemResumoComunicado {
  id: string
  material: string
  descricao_material: string
  pedido_venda: string
  item_pedido: string
  pedido_formatado: string
  carteira_tons: number
  estoque_livre_tons: number
  saldo_produzir_tons: number
  producao_minima_tons: number
  data_desejada: string
  centro: string
  linha: string
  criticidade: CriticidadeCarteiraMinima
  vendedor_responsavel?: string
}

export interface ComunicadoComercialRecord {
  id: string
  numero_sequencial: string // Ex: COM-PCP-000001/2026
  tipo: string // "Carteira mínima não atingida"
  assunto: string
  mensagem: string
  mensagem_original?: string
  prioridade: PrioridadeComunicado
  destinos_json: DestinoComunicado[]
  data_meu_dia?: string // dd/mm/aaaa
  destinatarios_json: DestinatarioHub[]
  itens_relacionados_json: ItemResumoComunicado[]
  itens_count: number
  remetente_id: string
  remetente_nome: string
  remetente_email: string
  origem_sistema: string // "PCP Robotizado"
  modulo_origem: string
  link_origem: string
  status: 'Enviado' | 'Em análise' | 'Respondido' | 'Encerrado'
  foi_aprimorado_ia?: boolean
  leitura_confirmada?: boolean
  leitura_confirmada_em?: string
  leitura_confirmada_por?: string
  resposta_comercial?: string
  respondido_em?: string
  respondido_por?: string
  created?: string
  updated?: string
}

export interface HistoricoItemEnvio {
  comunicado_id: string
  numero_sequencial: string
  data_envio: string // dd/mm/aaaa HH:mm
  enviado_por: string
  prioridade: PrioridadeComunicado
  destinos: DestinoComunicado[]
  destinatarios: string[]
  assunto: string
}

export interface ItemComercialStatus {
  id?: string
  item_chave: string // ex: "PED-251967_10_C352DIN30470C"
  material: string
  pedido_venda: string
  item_pedido: string
  ultimo_comunicado_id?: string
  ultimo_comunicado_numero?: string
  ultimo_envio_em?: string // dd/mm/aaaa HH:mm
  ultimo_envio_por?: string
  total_envios: number
  status: StatusComunicadoComercial
  historico_envios_json: HistoricoItemEnvio[]
}

export interface EnviarComunicadoPayload {
  itens: CarteiraMinimaItem[]
  assunto: string
  mensagem: string
  mensagemOriginal?: string
  prioridade: PrioridadeComunicado
  destinos: DestinoComunicado[]
  dataMeuDia?: string // dd/mm/aaaa
  destinatarios: DestinatarioHub[]
  foiAprimoradoIa?: boolean
  ehReenvioConfirmado?: boolean
}

export interface EnvioComunicadoResult {
  success: boolean
  numeroSequencial: string
  comunicado: ComunicadoComercialRecord
  itensEnviadosCount: number
  destinatariosCount: number
  destinosTexto: string
  mensagemRetorno: string
}

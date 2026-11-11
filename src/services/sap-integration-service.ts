// Camada de integração SAP para o tópico "Envio de MP KS → Ciafal".
// ESTRUTURA PRONTA PARA RFC/BAPI — hoje NÃO há RFC real conectada ao HUB.
// Os movimentos (311/313/315, estorno 316) são exercícios locais simulados e
// PERSISTIDOS no PocketBase (mp_ks_ciafal_movimentos) com idempotência.
// Interfaces espelham ZPPPMP, ZPPT045, ZPPT003, ZPP_USUARIO, ZPP82, ZBITOLAS, MARC, MARD, MSEG, MAKT.
// O item de "pontos que ainda dependem de RFC/BAPI real" está no relatório da entrega.

/** ZPPPMP — programação vigente (só versões *00) */
export interface ZPPPMPRegistro {
  WERKS: string
  SPWOC: string // semana
  VERSAO: string // *00
  DTREF: string
  UNAME: string // elaborado por
  APLICACAO: string
  MATNR: string
  MAKTX: string
  PESO_ALVO: number
  PREVISTO: number
  ATENDIDO: number
  SELECAO: number
}

/** ZPPT045 — peças físicas individuais (fonte, não alterada) */
export interface ZPPT045Registro {
  WERKS: string
  ORIGEM: 'KSC' | 'KSF' | 'CISAM'
  MATNR: string
  MAKTX: string
  APLICACAO: string
  PESO: number
  CORRIDA: string
  LETRA: string
  NR_BLOCO: string
  DT_ENVIO: string
  DEPOSITO: string
  STATUS_BLOCO: string
}

/** ZPPT003 — composição química por corrida (certificado OK?) */
export interface ZPPT003Registro {
  CORRIDA: string
  ELEMENTO: string
  VALOR: number
}

/** ZPP_USUARIO — login operacional (ZPP85/ZPP46A) */
export interface ZPPUSUARIORegistro {
  MATRICULA: string
  NOME: string
  SENHA: string
  LIN_PROD: string // EXP = Expedidor
  CENTRO: string
  ATIVO: boolean
}

/** ZPP82 — códigos de motivo */
export interface ZPP82Registro {
  CODIGO: string
  DESCRICAO: string
  ATIVO: boolean
}

/** ZBITOLAS — aplicações */
export interface ZBITOLASRegistro {
  APLICACAO: string
  DESCRICAO: string
}

/** MARC/MARD — material e estoque por depósito */
export interface MARDDados {
  MATNR: string
  WERKS: string
  LGORT: string
  LABST: number // estoque livre
}

/** MSEG — documento de material (311/313/315/316) */
export interface MSEGDados {
  MBLNR: string
  MJAHR: string
  ZEILE: number
  BWART: string // tipo de movimento
  MATNR: string
  WERKS: string
  LGORT: string
  UMLGO: string
  MENGE: number
}

export type MovimentoSapTipo = '311' | '313' | '315' | '316'

export interface MovimentoSapRequest {
  tipo: MovimentoSapTipo
  pecaId: string
  idempotencyKey: string
  centro: string
  depositoOrigem: string
  depositoDestino: string
  usuario: { matricula: string; nome: string }
  payload?: Record<string, unknown>
}

export interface MovimentoSapResultado {
  ok: boolean
  documento: string
  simulado: true
  mensagem: string
}

/**
 * PONTO DE TROCA PARA RFC REAL:
 * quando a RFC/BAPI for conectada, implementar aqui a chamada BAPI_GOODSMVT_CREATE
 * (311/313/315/316) mantendo a idempotência via idempotencyKey (ex. XBLNR).
 * Até lá, o exercício é local e persistido em mp_ks_ciafal_movimentos pelos hooks pb.
 */
export function descreverMovimento(
  tipo: MovimentoSapTipo,
  origem: string,
  destino: string,
): string {
  const mapa: Record<MovimentoSapTipo, string> = {
    '311': `Transferência 311 ${origem} → ${destino} (exercício local, sem RFC)`,
    '313': `Saída 313 ${origem} → ${destino} (material em trânsito, exercício local)`,
    '315': `Recebimento 315 ${origem} → ${destino} (trânsito → livre, exercício local)`,
    '316': `Estorno 316 (exercício local, sem RFC)`,
  }
  return mapa[tipo]
}

/** Depósito de estoque por origem (regra fixa do processo) */
export const DEPOSITO_POR_ORIGEM: Record<string, string> = {
  KSC: 'DP20',
  KSF: 'DP25',
  CISAM: 'DC09',
}

/** DP de expedição consolidada e DPs de destino */
export const DP28 = 'DP28'
export const DP02 = 'DP02' // destino L2
export const DP07 = 'DP07' // destino L1

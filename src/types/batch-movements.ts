export interface SapBatchMovement {
  id?: string
  lote: string
  material_code: string
  material_desc?: string
  data_lancamento: string // dd/mm/aaaa ou yyyy-mm-dd
  hora?: string // HH:mm:ss
  mblnr: string // Documento de material
  mjahr: string // Ano
  zeile: string // Item
  bwart: string // Tipo de movimento (101, 102, 261, 262, 311, 315, 501, 511, 541, 561, 601, 631, etc.)
  bwart_desc?: string // Descrição oficial vinda do SAP
  quantidade: number
  unidade_medida?: string
  shkzg?: string // S (positivo/entrada) ou H (negativo/saída)
  werks?: string // Centro
  lgort?: string // Depósito
  aufnr?: string // Ordem de produção
  kdauf?: string // Pedido de venda
  kdpos?: string // Item pedido
  xblnr?: string // Doc de referência
  vbeln_vf?: string // Doc faturamento
  usnam?: string // Usuário SAP
  bktxt?: string // Texto de cabeçalho
  origem_movimento?: string
  destino_movimento?: string
  is_estorno?: boolean
  doc_estorno_original?: string
  raw_payload?: Record<string, unknown>
}

export interface RfidMovement {
  id: string
  data_leitura: string // dd/mm/aaaa ou yyyy-mm-dd
  hora_leitura: string // HH:mm:ss
  tag_rfid: string
  epc?: string
  lote: string
  material_code: string
  material_desc?: string
  quantidade?: number
  unidade_medida?: string
  localizacao_anterior?: string
  localizacao_atual: string
  deposito?: string
  centro?: string
  equipamento_coletor?: string
  usuario?: string
  tipo_coleta?: string // Inventário, Movimentação Interna, Expedição, Entrada Produção
  numero_coleta_inventario?: string
  origem?: string
  destino?: string
  status?: string // OK, Divergente, Validado
  observacao?: string
}

export type TimelineEventType =
  | 'SAP_ENTRADA_PRODUCAO'
  | 'SAP_CONSUMO'
  | 'SAP_TRANSFERENCIA'
  | 'SAP_EXPEDICAO'
  | 'SAP_ESTORNO'
  | 'SAP_OUTRO'
  | 'RFID_LEITURA'
  | 'RFID_EXPEDICAO'
  | 'ETIQUETA_IMPRESSA'
  | 'ETIQUETA_SOLICITADA'

export interface IntegratedTraceabilityEvent {
  id: string
  data_hora: string // ISO ou dd/mm/aaaa HH:mm:ss para ordenação
  data_display: string
  hora_display: string
  origem: 'SAP' | 'RFID' | 'HUB' | 'ETIQUETA'
  tipo_evento: TimelineEventType
  titulo: string
  descricao: string
  lote: string
  material_code: string
  material_desc?: string
  quantidade?: number
  unidade_medida?: string
  centro?: string
  deposito?: string
  localizacao_fisica?: string
  documento_referencia?: string
  usuario?: string
  // Correlação
  correlacionado: boolean
  correlacao_id?: string
  status_correlacao: 'CORRELACIONADO' | 'CORRELACAO_NAO_CONFIRMADA' | 'SEM_CORRESPONDENCIA'
  // Divergências automáticas
  tem_divergencia: boolean
  tipo_divergencia?:
    | 'SAP_SEM_RFID' // SAP movimentou mas RFID não confirmou
    | 'RFID_SEM_SAP' // RFID movimentou mas SAP não tem movimento correspondente
    | 'LOCALIZACAO_DIVERGENTE' // Localização física RFID difere do depósito contábil SAP
  detalhe_divergencia?: string
  sap_ref?: SapBatchMovement
  rfid_ref?: RfidMovement
}

export interface BatchSummary {
  lote: string
  material_code: string
  material_desc: string
  materiais_relacionados: { code: string; desc: string; count: number }[]
  centro: string
  deposito_atual: string
  quantidade_inicial: number
  quantidade_movimentada: number
  saldo_atual: number
  unidade_medida: string
  ultima_movimentacao_data_hora: string
  ultima_movimentacao_origem: 'SAP' | 'RFID' | 'NÃO INFORMADO'
  status_lote: 'Ativo' | 'Bloqueado' | 'Esgotado' | 'Em Trânsito' | 'Pendente'
  peso_estimado_kg?: number
  etiqueta_atual_id?: string
}

export interface BatchFilterParams {
  lote: string // Obrigatório
  data_inicial?: string
  data_final?: string
  material_code?: string
}

export interface LabelReprintRequest {
  lote: string
  material_code: string
  material_desc?: string
  peso?: number
  centro?: string
  deposito?: string
  etiqueta_atual_id?: string
  impressora: string
  quantidade_copias: number
  motivo_reimpressao:
    | 'Etiqueta danificada'
    | 'Etiqueta perdida'
    | 'Etiqueta ilegível'
    | 'Divergência de impressão'
    | 'Troca de embalagem'
    | 'Solicitação da operação'
    | 'Outro'
  justificativa?: string
}

export interface LabelReprintResult {
  success: boolean
  protocolo: string
  lote: string
  message: string
  retorno_sap?: string
  code?: string
}

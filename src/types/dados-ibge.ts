/**
 * Tipos Oficiais — Peça 1: Dados IBGE (Controle de Produção)
 * Consolidação mensal dos dados de produção para fechamento e envio à Contabilidade.
 */

export interface DadosIbgeFiltros {
  empresa: string // '1000', '2000' ou WERKS selecionado
  linha: string // 'L1', 'L2' ou ID da linha selecionada
  centros: string[] // Array de códigos de centros selecionados (multi-seleção)
  mtart: string // 'TODOS' ou tipo específico ('FERT', 'HALB', etc.)
  mes: string // '01' a '12'
  ano: string // '2025', '2026', '2027'...
}

export interface RegistroRastreabilidadeIbge {
  id: string
  origem: 'APONTAMENTO_MES' | 'ORDEM_PRODUCAO' | 'PROGRAMACAO_SEMANAL'
  op_number: string
  posting_code?: string
  data_hora: string // Formato ISO ou dd/mm/aaaa hh:mm
  data_hora_formatada: string // dd/mm/aaaa 24h
  quantidade: number
  unidade: string
  sap_document_number?: string
  usuario_origem: string
  status_processamento: string
  detalhes_tecnicos?: string
}

export interface LinhaConsolidadaIbge {
  id: string
  empresa_code: string
  empresa_nome: string
  linha_code: string
  linha_nome: string
  centro_code: string
  centro_nome: string
  tipo_material: string // MTART
  tipo_material_descricao: string // ex: "FERT — Produto Acabado"
  material_code: string
  material_descricao: string
  competencia: string // ex: "09/2026"
  quantidade_produzida: number
  unidade_medida: string // ex: "t", "kg", "peça"
  status_fechamento: 'Pendente' | 'Conferida' | 'Enviada à Contabilidade'
  total_registros: number
  centros_envolvidos: string[]
  registros_rastreabilidade: RegistroRastreabilidadeIbge[]
}

export interface TotalizadoresIbge {
  centros_selecionados_count: number
  materiais_distintos_count: number
  quantidades_por_unidade: Record<string, number> // Discriminado por UM: ex: { "t": 125.4, "peça": 340 }
  total_registros: number
  status_geral: 'Pendente' | 'Conferida' | 'Enviada à Contabilidade'
  contagem_por_status: {
    pendente: number
    conferida: number
    enviada: number
  }
}

export interface OpcaoMtart {
  codigo: string
  descricao: string
  label: string
}

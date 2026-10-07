/**
 * Tipagens estruturadas para Requisitos MTO (Make-to-Order)
 * Relacionamento 1:N com Pedido e Item do Pedido
 */

export interface ElementoQuimico {
  elemento: string
  min: number | null
  max: number | null
}

export interface ComposicaoQuimicaRequisito {
  elementos: ElementoQuimico[]
}

export interface DimensoesToleranciasRequisito {
  raio_canto?: number | string | null
  romboidade?: number | string | null
  altura?: number | string | null
  largura?: number | string | null
  unidade?: string
}

export interface ComprimentoRequisito {
  comprimento_principal?: number | null // em metros (ex: 4.80)
  tolerancia_mais?: number | null // em metros (ex: 0.10)
  tolerancia_menos?: number | null // em metros (ex: 0.00)
  multiplo_1?: number | null
  multiplo_2?: number | null
  multiplo_3?: number | null
  curtos_min?: number | null
  curtos_max?: number | null
  curtos_pct?: number | null
  unidade?: string
}

export interface GarantiasSuperficieRequisito {
  aplicacao?: string | null
  padrao_qualidade_superficial?: string | null // ex: QS 3
  observacoes?: string | null
}

export interface GarantiasInternasRequisito {
  garantia_interna?: string | null
  metodo?: string | null
  valor_maximo?: string | number | null
  queda_eco_fundo?: string | null
}

export interface EnsaioTracaoRequisito {
  lr_mpa?: number | null // Limite de Resistência à Tração (MPa)
  le_mpa?: number | null // Limite de Escoamento (MPa)
  alongamento_pct?: number | null // Alongamento (%)
}

export interface DurezaRequisito {
  tipo_dureza?: string | null
  maximo?: number | string | null
  minimo?: number | string | null
}

export interface EnsaioCharpyRequisito {
  orientacao?: string | null
  temperatura_c?: number | null // °C
  valor_minimo_j?: number | null // J
}

export interface MicroinclusoesAstmE45A {
  af?: number | string | null
  bf?: number | string | null
  cf?: number | string | null
  df?: number | string | null
  ag?: number | string | null
  bg?: number | string | null
  cg?: number | string | null
  dg?: number | string | null
}

export interface CaracterizacaoMetalurgicaRequisito {
  tamanho_grao_austenitico?: string | null
  descarbonetacao?: string | null
  microinclusoes_astm_e45_a?: MicroinclusoesAstmE45A
}

export interface PontoTemperabilidadeMm {
  pos_mm: string // ex: "1,5", "3", "5", etc.
  valor?: number | string | null
}

export interface PontoTemperabilidadePol {
  pos: number // 1 a 32 (1/16")
  valor?: number | string | null
}

export interface TemperabilidadeRequisito {
  pontos_mm?: PontoTemperabilidadeMm[]
  escala_polegada_16?: PontoTemperabilidadePol[]
}

export interface GarantiasEspecificasRequisito {
  ensaio_tracao?: EnsaioTracaoRequisito
  dureza?: DurezaRequisito
  ensaio_charpy?: EnsaioCharpyRequisito
  caracterizacao_metalurgica?: CaracterizacaoMetalurgicaRequisito
  temperabilidade?: TemperabilidadeRequisito
}

export type TipoRequisitoMTO =
  | 'Composição Química'
  | 'Comprimento'
  | 'Dimensões e Tolerâncias'
  | 'Garantias Específicas'
  | 'Temperabilidade'

export interface MtoRequirementClassification {
  tipo_principal: TipoRequisitoMTO
  tags_secundarias: TipoRequisitoMTO[]
  todos_tipos: TipoRequisitoMTO[]
}

export interface MtoRequirementRecord {
  id: string
  requisito_id: string // ex: "REQ-01"
  requisito_numero: number // 1, 2, ...
  pedido_numero: string // ex: "50000499"
  item_pedido: string // ex: "10"
  codigo_documento?: string
  cliente_nome?: string
  produto?: string
  aplicacao?: string
  classe_aco?: string
  responsavel_consulta?: string
  norma_aplicavel?: string
  numero_pecas?: number | null
  quantidade?: number | null
  data_consulta?: string
  descricao_material?: string

  // Classificação do Requisito MTO (Seção 5 e 6)
  tipo_requisito?: TipoRequisitoMTO
  tags_secundarias?: TipoRequisitoMTO[]

  // Seção 2: Requisitos do Produto (condição é texto livre)
  condicao?: string

  // Grupos estruturados
  composicao_quimica?: ComposicaoQuimicaRequisito
  dimensoes_tolerancias?: DimensoesToleranciasRequisito
  comprimento?: ComprimentoRequisito
  garantias_superficie?: GarantiasSuperficieRequisito
  garantias_internas?: GarantiasInternasRequisito
  garantias_especificas?: GarantiasEspecificasRequisito
  politica_qualidade?: string

  // Auditoria
  origem_dados?: string
  criado_por_usuario?: string
  atualizado_por_usuario?: string
  created?: string
  updated?: string
}

export interface MtoRequirementAuditLog {
  id?: string
  pedido_numero: string
  item_pedido: string
  requisito_id?: string
  acao: 'CRIACAO' | 'EDICAO' | 'IMPORTACAO'
  origem: string
  usuario?: string
  valores_anteriores?: Record<string, unknown> | null
  valores_posteriores?: Record<string, unknown> | null
  data_hora: string
}

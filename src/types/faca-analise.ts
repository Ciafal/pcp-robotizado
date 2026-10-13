/**
 * Tipos Oficiais para o subtópico "Análise de FACA"
 * Localização: PCP Robotizado > Análise de Carteira > Análise de FACA
 */

export interface FacaMaterialParametrizado {
  id?: string
  codigo_material: string
  descricao_material: string
  grupo_faca: string
  familia: string
  bitola: string
  tipo_aco: string
  dimensoes: string
  comprimento_mm: number
  centro: string
  empresa: string
  linha_preferencial: string
  carteira_minima_lam_t: number
  is_mto: boolean
  classificacao_sap_origem: string
  homologado_por: string
  ativo: boolean
  observacoes_tecnicas: string
}

export interface FacaVinculoPaMp {
  id?: string
  codigo_pa: string
  descricao_pa: string
  codigo_mp: string
  descricao_mp: string
  tipo_aco_mp: string
  bitola_mp: string
  dimensoes_mp: string
  rendimento_transformacao: number // Ex: 0.92 para 92%
  perdas_previstas_pct: number // Ex: 8.0 para 8%
  origem_cadastro: string
  prioridade_consumo: number // 1 = primária, 2 = alternativa
  centro: string
  ativo: boolean
  notas_tecnicas: string
}

export type StatusAtendimentoFaca =
  | 'ATENDIDO_ESTOQUE'
  | 'PARCIALMENTE_COBERTO'
  | 'NECESSITA_PRODUCAO'
  | 'MP_INSUFICIENTE'
  | 'LOTE_MINIMO_PENDENTE'
  | 'SEM_PEDIDO_ESTOQUE_LIVRE'
  | 'PEDIDO_CANCELADO'

export type PrevisaoFaturamentoStatus =
  | 'FATURAMENTO_CONFIRMADO'
  | 'POTENCIAL_FATURAMENTO'
  | 'AGUARDANDO_PRODUCAO'
  | 'FATURAMENTO_IMPEDIDO'
  | 'NAO_APLICAVEL'

export interface FacaItemAnalitico {
  id: string
  codigo_material: string // 1
  descricao: string // 2
  grupo_faca: string // 3
  bitola: string // 4
  tipo_aco: string // 5
  cliente: string // 6
  pedido_sap: string // 7
  item_pedido: string
  data_prevista_entrega: string // 8 (dd/mm/aaaa)
  carteira_aberta_t: number // 9
  estoque_livre_pa_t: number // 10
  estoque_semiacabado_t: number // 11
  estoque_qualidade_t: number // 12
  estoque_bloqueado_t: number // 13
  estoque_comprometido_t: number // 14
  saldo_disponivel_atendimento_t: number // 15 = max(0, estoque_livre_pa_t - carteira_aberta_t) ou livre efetivo
  saldo_a_produzir_t: number // 16 = max(0, carteira_aberta_t - estoque_livre_pa_t)
  quantidade_programada_t: number // 17
  materia_prima_vinculada: string // 18 (código e descrição MP)
  codigo_mp_vinculada: string
  mp_disponivel_t: number // 19
  mp_necessaria_t: number // 20 = saldo_a_produzir_t / rendimento_transformacao
  rendimento_transformacao: number
  carteira_minima_lam_t: number // 21
  valor_faturamento_previsto_brl: number // 22
  preco_unitario_brl_t: number
  previsao_faturamento: PrevisaoFaturamentoStatus // 23
  status_atendimento: StatusAtendimentoFaca // 24
  observacoes_ia: string // 25
  // Metadados adicionais para detalhamento
  centro: string
  empresa: string
  linha_preferencial: string
  is_mto: boolean
  motivo_cancelamento?: string
  historico_pedidos?: Array<{
    pedido: string
    data: string
    qtd_t: number
    cliente: string
    status: string
  }>
  historico_movimentacoes?: Array<{
    tipo: string
    data: string
    qtd_t: number
    documento: string
    deposito: string
  }>
  pendencias_comerciais?: string
  pendencias_industriais?: string
}

export interface FacaMateriaPrimaDetalhe {
  codigo_mp: string
  descricao_mp: string
  tipo_aco: string
  dimensoes: string
  centro: string
  deposito: string
  estoque_fisico_t: number
  estoque_disponivel_t: number
  estoque_qualidade_t: number
  estoque_bloqueado_t: number
  mp_destinada_pedidos_t: number // Reservado por alocação
  mp_prevista_recebimento_t: number
  mp_necessaria_carteira_t: number
  saldo_apos_atendimento_t: number
  rendimento_transformacao: number // Ex: 0.92
  perdas_previstas_pct: number
  producao_possivel_estoque_t: number // estoque_disponivel_t * rendimento
  materiais_pa_vinculados: string[]
  status_suficiencia: 'SUFICIENTE' | 'CRITICO' | 'ATENCAO'
  alerta: string
}

export interface FacaCardKpis {
  carteira_total_t: number // pedidos abertos (t)
  estoque_disponivel_pa_t: number // produto acabado para faturamento (t)
  necessidade_producao_t: number // volume líquido a produzir (t)
  mp_especifica_disponivel_t: number // MP disponível (t)
  mp_necessaria_t: number // MP necessária líquida (t)
  faturamento_potencial_brl: number // R$ pedidos com cobertura
  faturamento_confirmado_brl: number // R$ faturamento confirmado
  estoque_sem_pedido_t: number // PA sem carteira ativa (t)
  carteira_minima_abaixo_t: number // materiais abaixo do lote mínimo (t)
  pedidos_criticos_count: number // risco de não atendimento
}

export type TipoAlertaFaca =
  | 'A_ESTOQUE_SEM_FATURAMENTO'
  | 'B_PEDIDO_SUPERIOR_ESTOQUE'
  | 'C_CARTEIRA_MINIMA_NAO_ATINGIDA'
  | 'D_PRODUCAO_POSTERIOR_CAMPANHA'
  | 'E_PEDIDO_CANCELADO_ESTOQUE_REMANESCENTE'
  | 'F_MP_INSUFICIENTE'

export interface FacaAlertaIA {
  id: string
  tipo: TipoAlertaFaca
  titulo: string
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'
  codigo_material: string
  descricao_material: string
  motivo_tecnico: string
  quantidade_envolvida_t: number
  acao_sugerida: string
  area_responsavel: 'PCP' | 'Comercial' | 'Produção' | 'Gestão de MP'
  impacto_financeiro_brl?: number
}

export interface FacaAcaoResponsavel {
  pendencia: string
  material: string
  acao_recomendada: string
  area_responsavel: 'PCP' | 'Comercial' | 'Produção' | 'Gestão de MP'
  prazo_previsto: string
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'
}

export interface FacaRelatorioExecutivo {
  titulo: string
  data_referencia: string
  empresa: string
  centro: string
  versao: number
  resumo_executivo: string
  situacao_carteira_estoque: Array<{
    material: string
    descricao: string
    carteira_t: number
    estoque_t: number
    a_produzir_t: number
    previsao_faturamento: string
    observacoes: string
  }>
  analise_materia_prima: {
    disponibilidade_total_t: number
    consumo_projetado_t: number
    necessidade_adicional_t: number
    saldo_futuro_t: number
    detalhes_texto: string
  }
  pendencias_comerciais: string[]
  pendencias_industriais: string[]
  previsao_faturamento: {
    faturamento_confirmado_brl: number
    potencial_faturamento_brl: number
    aguardando_producao_brl: number
    faturamento_impedido_brl: number
    detalhes_periodo: Array<{
      periodo: string
      confirmado_t: number
      confirmado_brl: number
      dependente_producao_t: number
      dependente_producao_brl: number
    }>
  }
  recomendacoes_ia: {
    pcp: string[]
    comercial: string[]
    producao: string[]
    gestao_mp: string[]
  }
  acoes_responsaveis: FacaAcaoResponsavel[]
}

export interface FacaAnaliseHistoricoItem {
  id: string
  codigo_analise: string
  titulo: string
  data_referencia: string
  empresa: string
  centro: string
  versao: number
  status: 'RASCUNHO' | 'REVISADO' | 'APROVADO' | 'ENVIADO' | 'FALHA_ENVIO'
  responsavel_nome: string
  responsavel_email: string
  resumo_executivo: string
  relatorio_estruturado: FacaRelatorioExecutivo
  created?: string
  updated?: string
}

export interface FacaEnvioEmailItem {
  id: string
  codigo_envio: string
  analise_id?: string
  codigo_analise: string
  remetente_nome: string
  remetente_email: string
  destinatarios_para: string[]
  destinatarios_cc: string[]
  areas_envolvidas: string[]
  assunto: string
  corpo_html: string
  anexo_pdf_gerado: boolean
  data_hora_envio: string
  status_envio: string
  mensagem_retorno: string
}

export interface FacaFiltrosState {
  empresa: string
  centro: string
  linha: string
  material: string
  bitola: string
  tipo_aco: string
  cliente: string
  periodo: string
  status_carteira: string
  situacao_mp: string
}

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

export type FacaTipoDisponibilidadeMp =
  | 'tarugo_disponivel'
  | 'saldo_cortar_ks'
  | 'mp_sem_cortar'
  | 'mp_derivada'
  | 'mp_produzir_l2'
  | 'semiacabado_transformavel'
  | 'outro'

export type FacaOrigemMpDerivada =
  | 'tarugo'
  | 'palanquilha'
  | 'material_bruto'
  | 'saldo_ks'
  | 'producao_l2'
  | 'outra_estoque_intermediario'

export type FacaFormaConsolidacaoMp = 'toneladas' | 'peca' | 'lote' | 'saldo_equivalente_tonelada'

export type FacaRegraExibicaoMp =
  | 'somar_estoque_imediato'
  | 'somar_apenas_potencial'
  | 'exibir_separado'
  | 'nao_consolidar'

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
  // Bloco 3 + MP derivada (migration 1774000122)
  familia_grupo_pa?: string
  flag_mp_derivada: boolean
  tipo_disponibilidade_mp: FacaTipoDisponibilidadeMp
  tipo_disponibilidade_outro?: string // texto livre quando tipo = 'outro'
  origem_mp_derivada: FacaOrigemMpDerivada
  exige_corte: boolean
  disponivel_sem_corte: boolean
  fator_conversao: number
  forma_consolidacao: FacaFormaConsolidacaoMp
  regra_exibicao: FacaRegraExibicaoMp
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

/** Item detalhado do balanço de MP FACA (Tarugos Livres, KS a Cortar, L2 a Produzir) */
export interface FacaMpItemDisponibilidade {
  id: string
  codigo_mp: string
  descricao_mp: string
  tipo_aco: string
  bitola: string
  dimensoes: string
  empresa: string
  centro: string // WERKS (ex: 1100, 1000)
  deposito: string // LGORT (DP07, DP04, DP18, DP20, DP03, etc.)
  lote?: string
  unidade_medida: string // 't'
  status_qualidade: 'LIVRE' | 'CONTROLE_QUALIDADE' | 'BLOQUEADO'
  destinacao_produtiva: 'FACA' | 'GERAL' | 'COMPARTILHADA'

  // Quantidades físicas e disponibilidade imediata
  quantidade_fisica_t: number
  quantidade_comprometida_t: number // Reservas SAP e alocações ativas
  estoque_livre_t: number // Disponibilidade imediata apta tecnicamente

  // Saldos futuros de produção/corte
  ks_saldo_a_cortar_t: number // Saldo a cortar na KS (líquido com rendimento)
  ks_rendimento_corte_pct: number // Ex: 96%
  ks_perdas_pct: number // Ex: 4%
  ks_status: 'CONFIRMADO' | 'PROGRAMADO' | 'ESTIMADO' | 'NAO_APLICAVEL'
  ks_ordem_corte?: string

  l2_saldo_a_produzir_t: number // Saldo de MP a produzir na L2
  l2_rendimento_pct: number // Ex: 92%
  l2_status: 'CONFIRMADO' | 'PROGRAMADO' | 'ESTIMADO' | 'NAO_APLICAVEL'
  l2_ordem_producao?: string
  l2_passa_por_ks: boolean // Evita dupla contagem no fluxo L2 -> KS

  // Consolidação por item
  sobreposicao_fluxo_t: number // Dedução se L2 alimenta KS
  sobreposicao_estoque_ks_t: number // Dedução estoque↔KS na mesma massa (MP sem corte)
  disponibilidade_liquida_t: number // Total potencial consolidado deste item
  previsao_disponibilidade: string // Ex: 'Imediata', '22/10/2026', 'Aguardando OP'

  // Rastreabilidade e compatibilidade técnica
  produtos_faca_compativeis: Array<{
    codigo_pa: string
    descricao_pa: string
    rendimento: number
    prioridade: number
  }>
  origem_saldo: 'ESTOQUE' | 'KS' | 'L2' | 'MISTO'
  fonte_rfc: string // 'SAP ECC • RFC MB52 / CS03 / MD04'
  data_hora_sincronizacao: string // dd/mm/aaaa hh:mm
  status_sincronizacao: 'SINCRONIZADO' | 'PARCIAL' | 'NAO_DISPONIVEL'

  // MP derivada e categorias de leitura (parametrização 1774000122)
  canal_estoque: 'PRINCIPAL' | 'DERIVADA'
  em_mp_derivada: boolean
  tipo_disponibilidade: FacaTipoDisponibilidadeMp
  tipo_disponibilidade_desc?: string // inclui texto livre quando tipo = 'outro'
  origem_mp_derivada?: FacaOrigemMpDerivada
  exige_corte: boolean
  disponivel_imediata: boolean
  pode_atender_faca_diretamente: boolean
  fator_conversao: number
  forma_consolidacao: FacaFormaConsolidacaoMp
  regra_exibicao: FacaRegraExibicaoMp
  categoria_leitura:
    | 'MP_DISPONIVEL_IMEDIATA'
    | 'MP_DERIVADA_DISPONIVEL'
    | 'MP_DEPENDENTE_CORTE'
    | 'MP_DEPENDENTE_PRODUCAO'
}

/** Agregação por tipo de aço para balanço e gráficos */
export interface FacaMpConsolidadoPorAco {
  tipo_aco: string
  tarugos_disponiveis_t: number
  ks_a_cortar_t: number
  l2_a_produzir_t: number
  sobreposicao_deduzida_t: number
  potencial_total_t: number
  mp_necessaria_carteira_t: number
  saldo_projetado_t: number
  status_cobertura: 'COBERTO_TOTAL' | 'COBERTO_IMEDIATO' | 'DEPENDENTE_KS_L2' | 'DEFICIT_CRITICO'
}

/** Resumo por categoria de leitura do popup MP Específica Disponível */
export interface FacaMpResumoCategoria {
  categoria:
    | 'TARUGOS_DISPONIVEIS'
    | 'MP_DERIVADA_SEM_CORTE'
    | 'KS_SALDO_CORTAR'
    | 'L2_MP_A_PRODUZIR'
    | 'TOTAL_POTENCIAL'
  titulo: string
  descricao: string
  quantidade_t: number
  quantidade_itens: number
  destaque: string
  respeita_regra_exibicao: boolean
}

/** Estrutura do novo card consolidado de MP Específica Disponível */
export interface FacaMpCardDisponibilidade {
  // Informação 1: MP Disponível Agora (t) - estoque livre em depósitos aptos
  mp_disponivel_agora_t: number
  tarugos_disponiveis_t: number
  depositos_considerados: string[] // ['DP07', 'DP04', 'DP18', 'DP20']

  // Componentes futuros
  ks_saldo_a_cortar_t: number
  l2_mp_a_produzir_t: number
  sobreposicoes_deduzidas_t: number

  // MP derivada (volumes não inferidos de carteira; só estoque parametrizado)
  mp_derivada_sem_corte_t: number
  mp_derivada_regra_apenas_potencial_t: number
  mp_derivada_exibicao_separada_t: number
  mp_derivada_nao_consolidada_t: number

  // Informação 2: MP Potencial (t) - imediata + futura líquida KS + L2 - sobreposição
  mp_potencial_total_t: number

  // Resumo por categoria para o popup
  resumo_por_categoria: FacaMpResumoCategoria[]

  // Quebra por tipo de aço e depósitos
  por_tipo_aco: FacaMpConsolidadoPorAco[]
  itens_detalhados: FacaMpItemDisponibilidade[]

  // Metadados de integração SAP RFC
  fonte_identificada: string
  ultima_atualizacao: string // dd/mm/aaaa hh:mm
  status_sincronizacao: 'SINCRONIZADO' | 'PARCIAL' | 'NAO_DISPONIVEL'
  mensagem_status: string // 'Dado não disponível' quando a RFC não retorna
  ha_dados_integrados: boolean
}

export interface FacaCardKpis {
  carteira_total_t: number // pedidos abertos (t)
  estoque_disponivel_pa_t: number // produto acabado para faturamento (t)
  necessidade_producao_t: number // volume líquido a produzir (t)
  mp_especifica_disponivel_t: number // MP disponível agora (t) - estoque físico livre
  mp_potencial_t?: number // MP potencial consolidada (t) - agora + KS + L2 sem dupla contagem
  mp_detalhe_consolidado?: FacaMpCardDisponibilidade // Balanço técnico completo de MP
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

export type TipoOrdemAtendimento = 'MTS' | 'MTO'
export type OrigemProduto = 'PRODUCAO_PROPRIA' | 'REVENDA' | 'IMPORTADO' | 'INDUSTRIALIZACAO'
export type StatusAtendimento =
  | 'A_FATURAR'
  | 'A_PRODUZIR'
  | 'PROGRAMADO'
  | 'BLOQUEADO'
  | 'ENTREGA_FUTURA'
export type StatusRuptura = 'VERDE' | 'AMARELO' | 'VERMELHO' | 'CINZA'

export interface MemoriaCalculoAuditavel {
  formula_aplicada: string
  campos_utilizados: Record<string, any>
  explicacao_passo_a_passo: string[]
  regra_versao: string
  fonte_dado: string
  data_hora_apuracao: string
}

export interface DuplicidadeDetalhes {
  tipo_duplicidade: 'SOBRECOBERTURA_PRODUCAO_REVENDA' | 'PRODUCAO_DUPLA' | 'ORDEM_DUPLICADA'
  descricao: string
  evidencia: string
  quantidade_sobrecoberta_tons: number
}

export interface CarteiraItem {
  id?: string
  upload_id?: string
  upload_code?: string
  source_system?: string
  source_transaction?: string
  source_file?: string
  source_load_id?: string
  source_row?: number
  rule_version_applied?: string
  environment?: string
  empresa: string
  centro: string
  linha: string
  ordem_venda: string
  item_ordem: string
  data_ordem: string
  data_desejada: string
  codigo_cliente: string
  nome_cliente: string
  codigo_material: string
  descricao_material: string
  familia: string
  curva_abc: string
  tipo_ordem: TipoOrdemAtendimento
  origem_produto: OrigemProduto
  qtd_ordem_tons: number
  qtd_faturada_tons: number
  carteira_aberta_tons: number
  carteira_vendas_tons: number
  carteira_mto_tons: number
  estoque_livre_tons: number
  estoque_mto_tons: number
  estoque_semiacabado_tons: number
  estoque_semiacabado_ciafal_tons?: number
  estoque_semiacabado_vallourec_tons?: number
  estoque_acabado_tons: number
  disponibilidade_fisica_elegivel_tons?: number
  saldo_disponivel_tons: number
  saldo_positivo_tons: number
  saldo_negativo_tons: number
  necessidade_liquida_tons: number
  falta_produzir_tons: number
  status_atendimento: StatusAtendimento
  qtd_programada_tons: number
  data_programada?: string
  semana_programada?: string
  linha_programada?: string
  media_faturamento_diario_t_dia: number
  dias_cobertura?: number
  data_fim_estoque?: string
  status_ruptura: StatusRuptura
  bloqueio: boolean
  motivo_bloqueio?: string
  observacao?: string
  possivel_duplicidade?: boolean
  duplicidade_detalhes?: DuplicidadeDetalhes
  memoria_calculo?: MemoriaCalculoAuditavel
  zsd24_tons?: number
  material_dp04?: string
  utilizacao_livre?: string
  material_vallourec?: string
  dp27?: string
  created?: string
}

export interface CarteiraEntradaFutura {
  id?: string
  upload_code?: string
  empresa: string
  centro: string
  codigo_material: string
  descricao_material: string
  origem: 'REVENDA' | 'IMPORTADO' | 'PRODUCAO_INTERNA' | 'OUTROS'
  documento_ref: string
  fornecedor_origem: string
  quantidade_prevista_tons: number
  quantidade_recebida_tons: number
  quantidade_pendente_tons: number
  data_prevista_entrada: string
  status_entrada: 'CONFIRMADO' | 'EM_TRANSITO' | 'DESEMBARACO' | 'ATRASADO' | 'CANCELADO' | string
  observacao?: string
  created?: string
}

export interface CarteiraUpload {
  id?: string
  upload_code: string
  filename: string
  file_hash?: string
  file_hash_sha256?: string
  snapshot_version?: string
  execution_status?: string
  reconciliation_status?: string
  environment?: string
  lineage_summary?: any
  file_size_bytes?: number
  total_rows: number
  valid_rows: number
  warning_rows: number
  rejected_rows: number
  status: 'EM_ANALISE' | 'PROCESSADO' | 'REJEITADO' | 'REVERTIDO'
  source_mode: 'EXCEL_QAS' | 'SAP_ECC_RFC' | 'CSV_MANUAL' | 'MOCK_DEMO'
  user_name: string
  user_email: string
  version_tag: string
  validation_log?: any
  summary_kpis?: any
  is_active_current: boolean
  created?: string
}

export interface CarteiraCicloSnapshot {
  id?: string
  snapshot_code: string
  ciclo_tipo: 'CICLO_L1' | 'CICLO_L2' | 'GERAL'
  ano: number
  semana: number
  total_carteira_tons: number
  total_estoque_livre_tons: number
  total_estoque_mto_tons: number
  total_estoque_semiacabado_tons: number
  total_saldo_positivo_tons: number
  total_saldo_negativo_tons: number
  total_necessidade_liquida_tons: number
  qtd_itens_analisados: number
  qtd_itens_ruptura_critica: number
  qtd_duplicidades_detectadas: number
  meta_atendimento_pct: number
  created?: string
}

export interface CarteiraIAInsight {
  id?: string
  insight_code: string
  titulo: string
  criticidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'
  categoria:
    | 'CURVA_A_CRITICA'
    | 'RUPTURA_IMINENTE'
    | 'DUPLICIDADE_ATENDIMENTO'
    | 'MTO_SEM_PROGRAMACAO'
    | 'ENTRADA_FUTURA_ATRASADA'
    | 'OPORTUNIDADE_MTS'
  problema_encontrado: string
  evidencia: string
  impacto: string
  causa_provavel: string
  acao_sugerida: string
  nivel_confianca_pct: number
  materiais_afetados?: string[]
  duplicidade_envolvida?: boolean
  created?: string
}

export interface CarteiraRegraConfig {
  id?: string
  chave_regra: string
  titulo_regra: string
  descricao: string
  categoria: 'L1' | 'L2' | 'MTO' | 'REVENDA' | 'IMPORTADO' | 'RUPTURA'
  parametros_json: any
  ativa: boolean
  versao: string
  modificado_por: string
  justificativa_alteracao?: string
}

export interface ReconciliacaoSAPResult {
  codigo_material: string
  descricao: string
  ordem_venda: string
  item_ordem: string
  pcp_quantidade_tons: number
  sap_quantidade_tons: number
  diff_quantidade_tons: number
  pcp_estoque_tons: number
  sap_estoque_tons: number
  diff_estoque_tons: number
  pcp_saldo_tons: number
  sap_saldo_tons: number
  diff_saldo_tons: number
  status_conciliacao:
    | 'OK'
    | 'PARIDADE_100'
    | 'DIVERGENCIA'
    | 'SEM_CORRESPONDENCIA'
    | 'SOMENTE_SAP'
    | 'SOMENTE_PCP'
    | 'CAMPO_DEPENDENTE_SAP'
  detalhes: string
}

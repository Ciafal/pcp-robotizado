/**
 * Metadata centralizada e DESCRITIVA dos indicadores do Resumo Mensal de Entregas PCP
 * (Programação → Entregas PCP → Resumo Mensal de Entregas).
 *
 * Regras desta metadata (PARTE 2 da reforma do Resumo Mensal):
 * - NÃO contém regra de cálculo: os valores são calculados no próprio
 *   ResumoMensalPage a partir dos registros de pcp_monthly_summaries.
 * - Contém apenas identificação: código, título por extenso, unidade de medida,
 *   tipo do indicador e descrição para tooltip.
 * - Indicador sem unidade física (ex.: versão vigente) usa unidade null —
 *   NUNCA inventar unidade.
 * - Siglas: esta tela exibe contadores de fluxo de vida do resumo (não siglas
 *   RE/RA/EN de faturamento). A sigla exibida em chip é derivada do campo
 *   `sigla` abaixo; quando o indicador não tem sigla consolidada no cadastro,
 *   o campo fica null e a chip não é renderizada.
 */

export type ResumoMensalIndicadorTipo = 'quantidade' | 'contagem' | 'versao'

export interface ResumoMensalIndicadorMetadata {
  /** Chave interna estável do indicador (usada pela tela para buscar metadata) */
  codigo: string
  /** Nome do indicador por extenso, título compreensível exibido no card */
  titulo: string
  /** Sigla quando existir (chip junto ao status); null quando não houver sigla consolidada */
  sigla: string | null
  /**
   * Unidade de medida exibida junto ao valor (padrão ABNT/SI, com espaço).
   * null = indicador sem unidade física — não exibir unidade inventada.
   */
  unidade: string | null
  /** Tipo do indicador (contagem, versao etc.) */
  tipo: ResumoMensalIndicadorTipo
  /** Descrição curta exibida como tooltip de apoio */
  descricao: string
}

export const RESUMO_MENSAL_INDICADORES: Record<string, ResumoMensalIndicadorMetadata> = {
  resumos: {
    codigo: 'resumos',
    titulo: 'Resumos no Período',
    sigla: null,
    unidade: 'un.',
    tipo: 'contagem',
    descricao:
      'Total de resumos mensais carregados para o filtro Empresa/Linha/Centro/Ano/Mês vigente.',
  },
  rascunhos: {
    codigo: 'rascunhos',
    titulo: 'Rascunhos Gerados por IA',
    sigla: null,
    unidade: 'un.',
    tipo: 'contagem',
    descricao: 'Resumos no status RASCUNHO_IA, aguardando revisão do PCP.',
  },
  emEdicao: {
    codigo: 'emEdicao',
    titulo: 'Resumos em Edição',
    sigla: null,
    unidade: 'un.',
    tipo: 'contagem',
    descricao: 'Resumos no status EM_EDICAO_PCP, em revisão manual pelo programador.',
  },
  aguardandoAprovacao: {
    codigo: 'aguardandoAprovacao',
    titulo: 'Resumos em Aprovação',
    sigla: null,
    unidade: 'un.',
    tipo: 'contagem',
    descricao: 'Resumos no status AGUARDANDO_APROVACAO, pendentes de aprovação.',
  },
  publicados: {
    codigo: 'publicados',
    titulo: 'Resumos Publicados',
    sigla: null,
    unidade: 'un.',
    tipo: 'contagem',
    descricao: 'Resumos nos status PUBLICADO ou ENVIADO — fluxo concluído no período.',
  },
  leiturasPendentes: {
    codigo: 'leiturasPendentes',
    titulo: 'Leituras Pendentes',
    sigla: null,
    unidade: 'un.',
    tipo: 'contagem',
    descricao: 'Destinatários que ainda não confirmaram a leitura dos resumos publicados.',
  },
  leiturasConfirmadas: {
    codigo: 'leiturasConfirmadas',
    titulo: 'Leituras Confirmadas',
    sigla: null,
    unidade: 'un.',
    tipo: 'contagem',
    descricao: 'Confirmações de leitura registradas pelos destinatários dos resumos.',
  },
  versaoAtual: {
    codigo: 'versaoAtual',
    titulo: 'Versão Vigente do Resumo',
    sigla: null,
    unidade: null, // Indicador de versão/status: NÃO possui unidade física
    tipo: 'versao',
    descricao: 'Tag da versão vigente do resumo selecionado (ex.: V01, V02).',
  },
}

/** Busca metadata por código com fallback seguro (nunca quebra a renderização). */
export function getResumoMensalIndicador(codigo: string): ResumoMensalIndicadorMetadata | null {
  return RESUMO_MENSAL_INDICADORES[codigo] ?? null
}

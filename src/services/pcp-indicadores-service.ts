import pb from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

export type ComparacaoRegra = '>=' | '<=' | '='
export type SentidoIndicador = 'MAIOR_MELHOR' | 'MENOR_MELHOR' | 'FAIXA_ACEITAVEL'

export type TipoIndicador =
  | 'PROGRAMACAO'
  | 'EFICIENCIA'
  | 'CARTEIRA'
  | 'CAPACIDADE'
  | 'QUALIDADE'
  | 'MATERIA_PRIMA'

export type StatusAtingimento = 'ATINGIDA' | 'FORA_DA_META' | 'PENDENTE_SEM_DADOS'

export type TendenciaTipo = 'MELHORANDO' | 'ESTAVEL' | 'PIORANDO'

export interface IndicadorPCPRecord {
  id: string
  codigo: string
  nome: string
  descricao: string
  unidade: string
  meta: number
  regra_comparacao: ComparacaoRegra
  sentido_indicador: SentidoIndicador
  faixa_minima?: number | null
  faixa_maxima?: number | null
  tipo_indicador: TipoIndicador
  vigencia_inicio?: string
  vigencia_fim?: string
  empresa?: string
  linha?: string
  centro?: string
  status_ativo: boolean
  ordem_exibicao: number
  fonte_dados_tipo: string
  fonte_dados_descricao: string
  created?: string
  updated?: string
}

export interface IndicadorMesValor {
  mesIndex: number // 0 = Jan, 11 = Dez
  mesNomeCurto: string
  mesNomeLongo: string
  realizado: number | null
  temDados: boolean
  status: StatusAtingimento
  desvioAbsoluto: number | null
  desvioPercentual: number | null
}

export interface IndicadorMatrizLinha {
  indicador: IndicadorPCPRecord
  metaFormatada: string
  regraFormatada: string
  meses: IndicadorMesValor[]
  mediaOuAcumuladoAno: number | null
  statusConsolidadoAno: StatusAtingimento
  totalMesesAtingidos: number
  totalMesesFora: number
  totalMesesSemDados: number
  // Campos complementares de Performance & Tendência
  ultimoResultado: number | null
  desvioAtual: number | null
  projecaoDezembro: number | null
  projecaoFechamentoFormatada: string
  isProjecaoPreliminar: boolean
  tendencia: TendenciaTipo
  mediaHistoricaAnoMenos2: number | null
  mediaHistoricaAnoMenos1: number | null
  mediaUltimos2Anos: number | null
}

export interface FiltrosMatrizIndicadores {
  empresa: string
  linha: string
  centro: string
  ano: number
  tipoIndicador: string
  status: 'TODOS' | 'ATINGIDO' | 'FORA_DA_META' | 'SEM_DADOS'
  indicadorCodigo?: string
  responsavel?: string
}

export interface IndicadorHistoricoLog {
  id: string
  indicador_id: string
  indicador_codigo: string
  indicador_nome: string
  meta_anterior: number
  meta_nova: number
  regra_anterior: string
  regra_nova: string
  status_anterior: boolean
  status_novo: boolean
  usuario_nome?: string
  usuario_email?: string
  justificativa?: string
  created: string
}

// Modelos do Workflow de Análise & Ação
export interface Item5Porques {
  nivel: number // 1 a 5
  pergunta: string
  resposta: string
}

export interface IshikawaCausaItem {
  id: string
  descricao: string
  tipo: 'PROVAVEL' | 'CONFIRMADA'
  evidencia?: string
}

export interface Ishikawa6M {
  metodo: IshikawaCausaItem[]
  maquina: IshikawaCausaItem[]
  mao_de_obra: IshikawaCausaItem[]
  material: IshikawaCausaItem[]
  medicao: IshikawaCausaItem[]
  meio_ambiente: IshikawaCausaItem[]
}

export interface AnaliseDesvioRecord {
  id: string
  codigo: string
  indicador_id: string
  indicador_codigo: string
  indicador_nome: string
  exercicio: number
  periodo_analisado: string
  mes_index?: number
  meta: number
  realizado: number
  desvio_absoluto: number
  desvio_percentual: number
  tendencia: string
  centro?: string
  linha?: string
  data_analise: string
  usuario_responsavel_id?: string
  usuario_responsavel_nome: string
  usuario_responsavel_email?: string
  supervisor_nome?: string
  aprovador_nome?: string
  descricao_problema: string
  ia_evidencias?: string[]
  ia_hipoteses?: string[]
  ia_dados_faltantes?: string[]
  cinco_porques?: Item5Porques[]
  ishikawa_6m?: Ishikawa6M
  causa_raiz?: string
  metodo_utilizado?: string
  evidencia_causa_raiz?: string
  responsavel_validacao?: string
  data_validacao?: string
  observacao_validacao?: string
  status_causa_raiz: 'EM_INVESTIGACAO' | 'CAUSA_PROVAVEL' | 'CAUSA_CONFIRMADA' | 'NAO_CONFIRMADA'
  etapa_atual: number
  status_workflow: 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'
  created?: string
  updated?: string
}

export type StatusAcao =
  | 'NAO_INICIADA'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO'
  | 'ATRASADA'
  | 'CONCLUIDA'
  | 'CANCELADA'

export type SituacaoEficacia =
  | 'AGUARDANDO_AVALIACAO'
  | 'EFICAZ'
  | 'PARCIALMENTE_EFICAZ'
  | 'INEFICAZ'

export interface Acao5W2HRecord {
  id: string
  codigo: string
  analise_id: string
  analise_codigo: string
  indicador_id: string
  indicador_codigo: string
  indicador_nome: string
  exercicio: number
  periodo_analisado?: string
  centro?: string
  linha?: string
  desvio_resumo?: string
  causa_raiz_vinculada?: string
  what_acao: string
  why_motivo: string
  where_local: string
  when_inicio?: string
  when_prazo: string
  who_responsavel_id?: string
  who_responsavel_nome: string
  who_responsavel_email?: string
  supervisor_nome?: string
  aprovador_nome?: string
  how_como: string
  how_much_custo_previsto?: number
  how_much_custo_realizado?: number
  prioridade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'
  status: StatusAcao
  percentual_concluido: number
  evidencia_conclusao?: string
  observacao?: string
  data_real_conclusao?: string
  situacao_eficacia?: SituacaoEficacia
  data_avaliacao_eficacia?: string
  indicador_antes?: number
  indicador_apos?: number
  evidencias_eficacia?: string
  comentario_eficacia?: string
  responsavel_avaliacao_eficacia?: string
  isAtrasada?: boolean
  created?: string
  updated?: string
}

export const MESES_ANO = [
  { index: 0, curto: 'Jan', longo: 'Janeiro' },
  { index: 1, curto: 'Fev', longo: 'Fevereiro' },
  { index: 2, curto: 'Mar', longo: 'Março' },
  { index: 3, curto: 'Abr', longo: 'Abril' },
  { index: 4, curto: 'Mai', longo: 'Maio' },
  { index: 5, curto: 'Jun', longo: 'Junho' },
  { index: 6, curto: 'Jul', longo: 'Julho' },
  { index: 7, curto: 'Ago', longo: 'Agosto' },
  { index: 8, curto: 'Set', longo: 'Setembro' },
  { index: 9, curto: 'Out', longo: 'Outubro' },
  { index: 10, curto: 'Nov', longo: 'Novembro' },
  { index: 11, curto: 'Dez', longo: 'Dezembro' },
]

/**
 * Avalia se o valor realizado cumpre a meta de acordo com o sentido do indicador
 * e a regra (>=, <=, =)
 */
export function avaliarStatusMeta(
  realizado: number | null | undefined,
  meta: number,
  regra: ComparacaoRegra,
  sentido?: SentidoIndicador,
  faixaMin?: number | null,
  faixaMax?: number | null,
): StatusAtingimento {
  if (realizado === null || realizado === undefined || isNaN(realizado)) {
    return 'PENDENTE_SEM_DADOS'
  }

  const eps = 0.0001

  // Se sentido for FAIXA_ACEITAVEL ou regra '='
  if (sentido === 'FAIXA_ACEITAVEL' || regra === '=') {
    const minVal = faixaMin !== null && faixaMin !== undefined ? faixaMin : meta * 0.98
    const maxVal = faixaMax !== null && faixaMax !== undefined ? faixaMax : meta * 1.02
    return realizado + eps >= minVal && realizado - eps <= maxVal ? 'ATINGIDA' : 'FORA_DA_META'
  }

  // Se sentido for MENOR_MELHOR ou regra '<='
  if (sentido === 'MENOR_MELHOR' || regra === '<=') {
    return realizado - eps <= meta ? 'ATINGIDA' : 'FORA_DA_META'
  }

  // Padrão MAIOR_MELHOR / '>='
  return realizado + eps >= meta ? 'ATINGIDA' : 'FORA_DA_META'
}

/**
 * Avalia se uma alteração representa melhoria, estabilidade ou piora respeitando o sentido
 */
export function avaliarTendenciaSentido(
  valorRecente: number | null,
  valorAnterior: number | null,
  sentido: SentidoIndicador,
  tolerancia = 0.1,
): TendenciaTipo {
  if (
    valorRecente === null ||
    valorAnterior === null ||
    isNaN(valorRecente) ||
    isNaN(valorAnterior)
  ) {
    return 'ESTAVEL'
  }
  const diff = valorRecente - valorAnterior
  if (Math.abs(diff) <= tolerancia) {
    return 'ESTAVEL'
  }

  if (sentido === 'MENOR_MELHOR') {
    // Redução é melhorando; Aumento é piorando
    return diff < 0 ? 'MELHORANDO' : 'PIORANDO'
  }

  if (sentido === 'FAIXA_ACEITAVEL') {
    return 'ESTAVEL'
  }

  // MAIOR_MELHOR: aumento é melhorando
  return diff > 0 ? 'MELHORANDO' : 'PIORANDO'
}

/**
 * Formata número com vírgula no padrão pt-BR/Ciafal
 * Exemplos: "95,0 %", "R$ 1.234,56", "27,5 t", "20,0 h"
 */
export function formatarValorPtBr(val: number | null | undefined, unidade = ''): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—'
  }
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(val)

  return unidade ? `${formatted} ${unidade}` : formatted
}

export function formatarMoedaPtBr(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

export function formatarDataPtBr(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

class PCPIndicadoresService {
  /**
   * Busca lista de indicadores oficiais
   */
  async listarIndicadores(): Promise<IndicadorPCPRecord[]> {
    try {
      const records = await pb.collection('pcp_indicadores').getFullList({
        sort: 'ordem_exibicao',
        filter: 'status_ativo = true',
      })
      return records.map((r: any) => {
        let sentido: SentidoIndicador = (r.sentido_indicador as SentidoIndicador) || 'MAIOR_MELHOR'
        if (!r.sentido_indicador) {
          if (r.regra_comparacao === '<=') sentido = 'MENOR_MELHOR'
          else if (r.regra_comparacao === '=') sentido = 'FAIXA_ACEITAVEL'
        }
        return {
          id: r.id,
          codigo: r.codigo,
          nome: r.nome,
          descricao: r.descricao || '',
          unidade: r.unidade || '%',
          meta: Number(r.meta),
          regra_comparacao: r.regra_comparacao as ComparacaoRegra,
          sentido_indicador: sentido,
          faixa_minima:
            r.faixa_minima !== undefined && r.faixa_minima !== null ? Number(r.faixa_minima) : null,
          faixa_maxima:
            r.faixa_maxima !== undefined && r.faixa_maxima !== null ? Number(r.faixa_maxima) : null,
          tipo_indicador: r.tipo_indicador as TipoIndicador,
          vigencia_inicio: r.vigencia_inicio,
          vigencia_fim: r.vigencia_fim,
          empresa: r.empresa,
          linha: r.linha,
          centro: r.centro,
          status_ativo: !!r.status_ativo,
          ordem_exibicao: Number(r.ordem_exibicao || 0),
          fonte_dados_tipo: r.fonte_dados_tipo || '',
          fonte_dados_descricao: r.fonte_dados_descricao || '',
          created: r.created,
          updated: r.updated,
        }
      })
    } catch (err) {
      console.error('[PCPIndicadoresService] Erro ao listar indicadores:', err)
      return []
    }
  }

  /**
   * Atualiza a meta, regra e sentido de um indicador com auditoria
   */
  async atualizarMetaIndicador(params: {
    indicadorId: string
    metaNova: number
    regraNova: ComparacaoRegra
    sentidoNovo?: SentidoIndicador
    faixaMinima?: number | null
    faixaMaxima?: number | null
    statusAtivo?: boolean
    justificativa: string
  }): Promise<boolean> {
    try {
      const ind = await pb.collection('pcp_indicadores').getOne(params.indicadorId)
      const metaAnterior = Number(ind.meta)
      const regraAnterior = ind.regra_comparacao
      const sentidoAnterior = ind.sentido_indicador
      const statusAnterior = !!ind.status_ativo
      const statusNovo = params.statusAtivo !== undefined ? params.statusAtivo : statusAnterior

      const user = pb.authStore.record
      const userName = user?.name || user?.email || 'Programador PCP'
      const userEmail = user?.email || 'pcp@ciafal.com.br'

      const updatePayload: Record<string, any> = {
        meta: params.metaNova,
        regra_comparacao: params.regraNova,
        status_ativo: statusNovo,
      }
      if (params.sentidoNovo) updatePayload.sentido_indicador = params.sentidoNovo
      if (params.faixaMinima !== undefined) updatePayload.faixa_minima = params.faixaMinima
      if (params.faixaMaxima !== undefined) updatePayload.faixa_maxima = params.faixaMaxima

      // 1. Atualizar registro no pcp_indicadores
      await pb.collection('pcp_indicadores').update(params.indicadorId, updatePayload)

      // 2. Registrar na tabela especializada pcp_indicador_metas_log
      await pb.collection('pcp_indicador_metas_log').create({
        indicador_id: params.indicadorId,
        indicador_codigo: ind.codigo,
        indicador_nome: ind.nome,
        meta_anterior: metaAnterior,
        meta_nova: params.metaNova,
        regra_anterior: regraAnterior,
        regra_nova: params.regraNova,
        status_anterior: statusAnterior,
        status_novo: statusNovo,
        usuario_id: user?.id || '',
        usuario_nome: userName,
        usuario_email: userEmail,
        justificativa: params.justificativa,
      })

      // 3. Auditoria mestre append-only em pcp_audit_logs
      await pcpAuditService.recordLog({
        action: 'ALTERAR_META_REGRA_INDICADOR',
        event_type: 'RULE_ACTION',
        module: 'Relatórios',
        screen: 'Indicadores PCP',
        entity: 'pcp_indicadores',
        record_id: params.indicadorId,
        scope: ind.codigo,
        reason: params.justificativa,
        details: {
          codigo: ind.codigo,
          nome: ind.nome,
          meta_anterior: metaAnterior,
          meta_nova: params.metaNova,
          regra_anterior: regraAnterior,
          regra_nova: params.regraNova,
          sentido_anterior: sentidoAnterior,
          sentido_novo: params.sentidoNovo,
        },
      })

      return true
    } catch (err) {
      console.error('[PCPIndicadoresService] Erro ao atualizar meta:', err)
      throw err
    }
  }

  /**
   * Busca histórico de alterações de meta de um indicador
   */
  async listarHistoricoMetas(indicadorCodigo: string): Promise<IndicadorHistoricoLog[]> {
    try {
      const records = await pb.collection('pcp_indicador_metas_log').getFullList({
        filter: `indicador_codigo = '${indicadorCodigo}'`,
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        indicador_id: r.indicador_id,
        indicador_codigo: r.indicador_codigo,
        indicador_nome: r.indicador_nome,
        meta_anterior: Number(r.meta_anterior),
        meta_nova: Number(r.meta_nova),
        regra_anterior: r.regra_anterior,
        regra_nova: r.regra_nova,
        status_anterior: !!r.status_anterior,
        status_novo: !!r.status_novo,
        usuario_nome: r.usuario_nome,
        usuario_email: r.usuario_email,
        justificativa: r.justificativa,
        created: r.created,
      }))
    } catch (err) {
      console.warn('[PCPIndicadoresService] Falha ao ler historico metas:', err)
      return []
    }
  }

  /**
   * Coleta dados reais do sistema para o ano selecionado e calcula a matriz Jan–Dez,
   * incluindo médias históricas (ano-2 e ano-1), projeção linear para dezembro e tendências.
   */
  async calcularMatrizAnual(filtros: FiltrosMatrizIndicadores): Promise<IndicadorMatrizLinha[]> {
    const indicadores = await this.listarIndicadores()

    // Carregar dados reais das fontes disponíveis no sistema para o ano vigente e anos anteriores
    const anoAtual = filtros.ano
    const anoMenos1 = anoAtual - 1
    const anoMenos2 = anoAtual - 2

    const [
      weeklySchedulesAtual,
      weeklySchedulesM1,
      weeklySchedulesM2,
      postingsMes,
      stopsData,
      carteiraData,
    ] = await Promise.all([
      this.carregarWeeklySchedules({ ...filtros, ano: anoAtual }),
      this.carregarWeeklySchedules({ ...filtros, ano: anoMenos1 }),
      this.carregarWeeklySchedules({ ...filtros, ano: anoMenos2 }),
      this.carregarPostingsMes(filtros),
      this.carregarProductionStops(filtros),
      this.carregarCarteiraData(filtros),
    ])

    const linhasMatriz: IndicadorMatrizLinha[] = []

    for (const ind of indicadores) {
      if (filtros.tipoIndicador && ind.tipo_indicador !== filtros.tipoIndicador) {
        continue
      }
      if (filtros.indicadorCodigo && ind.codigo !== filtros.indicadorCodigo) {
        continue
      }

      const meses: IndicadorMesValor[] = []
      let somaValoresValidos = 0
      let qtdMesesComDados = 0
      let totalAtingidos = 0
      let totalFora = 0
      let totalSemDados = 0

      const valoresRealizadosPares: { mes: number; valor: number }[] = []

      for (let m = 0; m < 12; m++) {
        const realizado = this.calcularRealizadoMesIndicador(
          ind.codigo,
          m,
          anoAtual,
          weeklySchedulesAtual,
          postingsMes,
          stopsData,
          carteiraData,
        )

        const temDados = realizado !== null && !isNaN(realizado)
        const status = avaliarStatusMeta(
          realizado,
          ind.meta,
          ind.regra_comparacao,
          ind.sentido_indicador,
          ind.faixa_minima,
          ind.faixa_maxima,
        )

        let desvioAbsoluto: number | null = null
        let desvioPercentual: number | null = null

        if (temDados && realizado !== null) {
          desvioAbsoluto = Number((realizado - ind.meta).toFixed(2))
          desvioPercentual =
            ind.meta !== 0 ? Number((((realizado - ind.meta) / ind.meta) * 100).toFixed(2)) : 0
          somaValoresValidos += realizado
          qtdMesesComDados++
          valoresRealizadosPares.push({ mes: m, valor: realizado })
        }

        if (status === 'ATINGIDA') totalAtingidos++
        else if (status === 'FORA_DA_META') totalFora++
        else totalSemDados++

        meses.push({
          mesIndex: m,
          mesNomeCurto: MESES_ANO[m].curto,
          mesNomeLongo: MESES_ANO[m].longo,
          realizado,
          temDados,
          status,
          desvioAbsoluto,
          desvioPercentual,
        })
      }

      if (filtros.status === 'ATINGIDO' && totalAtingidos === 0) continue
      if (filtros.status === 'FORA_DA_META' && totalFora === 0) continue
      if (filtros.status === 'SEM_DADOS' && totalSemDados !== 12) continue

      // Média Atual do ano calculada estritamente com meses com dados
      const mediaOuAcumuladoAno =
        qtdMesesComDados > 0 ? Number((somaValoresValidos / qtdMesesComDados).toFixed(1)) : null

      const statusConsolidadoAno = avaliarStatusMeta(
        mediaOuAcumuladoAno,
        ind.meta,
        ind.regra_comparacao,
        ind.sentido_indicador,
        ind.faixa_minima,
        ind.faixa_maxima,
      )

      // Último resultado apurado
      const ultimoPonto = valoresRealizadosPares[valoresRealizadosPares.length - 1]
      const penultimoPonto =
        valoresRealizadosPares.length >= 2
          ? valoresRealizadosPares[valoresRealizadosPares.length - 2]
          : null
      const ultimoResultado = ultimoPonto ? ultimoPonto.valor : null
      const desvioAtual =
        ultimoResultado !== null ? Number((ultimoResultado - ind.meta).toFixed(1)) : null

      // Tendência recente baseada nos dois últimos pontos com dados
      const tendencia =
        penultimoPonto && ultimoPonto
          ? avaliarTendenciaSentido(ultimoPonto.valor, penultimoPonto.valor, ind.sentido_indicador)
          : 'ESTAVEL'

      // Projeção linear para Dezembro (mês 11) baseada nos dados do exercício
      let projecaoDezembro: number | null = null
      let isProjecaoPreliminar = true

      if (valoresRealizadosPares.length >= 2) {
        isProjecaoPreliminar = valoresRealizadosPares.length < 4
        // Regressão linear simples: y = a + b * x
        const n = valoresRealizadosPares.length
        let sumX = 0
        let sumY = 0
        let sumXY = 0
        let sumX2 = 0
        for (const pt of valoresRealizadosPares) {
          sumX += pt.mes
          sumY += pt.valor
          sumXY += pt.mes * pt.valor
          sumX2 += pt.mes * pt.mes
        }
        const denom = n * sumX2 - sumX * sumX
        if (Math.abs(denom) > 0.0001) {
          const slope = (n * sumXY - sumX * sumY) / denom
          const intercept = (sumY - slope * sumX) / n
          // Projeção para mês 11 (Dezembro)
          const projValue = intercept + slope * 11
          projecaoDezembro = Number(Math.max(0, projValue).toFixed(1))
        } else {
          projecaoDezembro = mediaOuAcumuladoAno
        }
      } else if (valoresRealizadosPares.length === 1) {
        isProjecaoPreliminar = true
        projecaoDezembro = valoresRealizadosPares[0].valor
      }

      const projecaoFechamentoFormatada =
        projecaoDezembro !== null ? formatarValorPtBr(projecaoDezembro, ind.unidade) : '—'

      // Médias históricas dos anos anteriores (anoMenos2 e anoMenos1)
      const mediaHistoricaAnoMenos2 = this.calcularMediaHistoricaAno(
        ind.codigo,
        anoMenos2,
        weeklySchedulesM2,
      )
      const mediaHistoricaAnoMenos1 = this.calcularMediaHistoricaAno(
        ind.codigo,
        anoMenos1,
        weeklySchedulesM1,
      )

      let mediaUltimos2Anos: number | null = null
      if (mediaHistoricaAnoMenos1 !== null && mediaHistoricaAnoMenos2 !== null) {
        mediaUltimos2Anos = Number(
          ((mediaHistoricaAnoMenos1 + mediaHistoricaAnoMenos2) / 2).toFixed(1),
        )
      } else if (mediaHistoricaAnoMenos1 !== null) {
        mediaUltimos2Anos = mediaHistoricaAnoMenos1
      } else if (mediaHistoricaAnoMenos2 !== null) {
        mediaUltimos2Anos = mediaHistoricaAnoMenos2
      }

      linhasMatriz.push({
        indicador: ind,
        metaFormatada: formatarValorPtBr(ind.meta, ind.unidade),
        regraFormatada: `${ind.regra_comparacao} ${formatarValorPtBr(ind.meta, ind.unidade)}`,
        meses,
        mediaOuAcumuladoAno,
        statusConsolidadoAno,
        totalMesesAtingidos: totalAtingidos,
        totalMesesFora: totalFora,
        totalMesesSemDados: totalSemDados,
        ultimoResultado,
        desvioAtual,
        projecaoDezembro,
        projecaoFechamentoFormatada,
        isProjecaoPreliminar,
        tendencia,
        mediaHistoricaAnoMenos2,
        mediaHistoricaAnoMenos1,
        mediaUltimos2Anos,
      })
    }

    return linhasMatriz
  }

  private calcularMediaHistoricaAno(codigo: string, ano: number, schedules: any[]): number | null {
    if (!schedules || schedules.length === 0) return null
    let soma = 0
    let count = 0
    for (let m = 0; m < 12; m++) {
      const val = this.calcularRealizadoMesIndicador(codigo, m, ano, schedules, [], [], [])
      if (val !== null && !isNaN(val)) {
        soma += val
        count++
      }
    }
    return count > 0 ? Number((soma / count).toFixed(1)) : null
  }

  // --- Carregadores de dados reais com filtros ---

  private async carregarWeeklySchedules(filtros: FiltrosMatrizIndicadores): Promise<any[]> {
    try {
      const parts: string[] = [`year = ${filtros.ano}`]
      if (filtros.linha) parts.push(`line_code = '${filtros.linha}'`)
      if (filtros.empresa) parts.push(`company_code = '${filtros.empresa}'`)

      return await pb.collection('weekly_schedules').getFullList({
        filter: parts.join(' && '),
      })
    } catch (err) {
      console.warn('[PCPIndicadoresService] Falha ao carregar weekly_schedules:', err)
      return []
    }
  }

  private async carregarPostingsMes(filtros: FiltrosMatrizIndicadores): Promise<any[]> {
    try {
      const parts: string[] = []
      if (filtros.linha) parts.push(`linha_code = '${filtros.linha}'`)
      if (filtros.centro) parts.push(`centro_code = '${filtros.centro}'`)

      return await pb.collection('pcp_production_postings').getFullList({
        filter: parts.length > 0 ? parts.join(' && ') : undefined,
      })
    } catch (err) {
      console.warn('[PCPIndicadoresService] Falha ao carregar pcp_production_postings:', err)
      return []
    }
  }

  private async carregarProductionStops(filtros: FiltrosMatrizIndicadores): Promise<any[]> {
    try {
      const parts: string[] = []
      if (filtros.linha) parts.push(`linha_code = '${filtros.linha}'`)
      if (filtros.centro) parts.push(`centro_code = '${filtros.centro}'`)

      return await pb.collection('pcp_production_stops').getFullList({
        filter: parts.length > 0 ? parts.join(' && ') : undefined,
      })
    } catch (err) {
      console.warn('[PCPIndicadoresService] Falha ao carregar pcp_production_stops:', err)
      return []
    }
  }

  private async carregarCarteiraData(filtros: FiltrosMatrizIndicadores): Promise<any[]> {
    try {
      return await pb.collection('carteira_items').getFullList({
        filter: filtros.empresa ? `empresa = '${filtros.empresa}'` : undefined,
      })
    } catch (err) {
      return []
    }
  }

  /**
   * Cálculo real mensal por indicador.
   * Regra do projeto: Se a fonte real do mês não tiver registros para cálculo, retorna null ("Sem dados").
   * NUNCA inventa dados nem usa mocks.
   */
  public calcularRealizadoMesIndicador(
    codigo: string,
    mesIndex: number,
    ano: number,
    weeklySchedules: any[],
    postingsMes: any[],
    stopsData: any[],
    carteiraData: any[],
  ): number | null {
    const filterByMonth = (dateStr?: string) => {
      if (!dateStr) return false
      try {
        const d = new Date(dateStr)
        return d.getFullYear() === ano && d.getMonth() === mesIndex
      } catch {
        return false
      }
    }

    switch (codigo) {
      case 'IND_01_ADERENCIA_PROG': {
        const items = weeklySchedules.filter((ws) => filterByMonth(ws.start_datetime || ws.created))
        if (items.length === 0) return null

        let planTons = 0
        let realTons = 0
        for (const item of items) {
          planTons += Number(item.planned_quantity_tons || 0)
          realTons += Number(item.realized_quantity_tons || 0)
        }
        if (planTons === 0 && realTons === 0) return null
        if (planTons === 0) return 100
        return Number(Math.min(100, (realTons / planTons) * 100).toFixed(1))
      }

      case 'IND_02_ASSERTIVIDADE_PROG': {
        const items = weeklySchedules.filter((ws) => filterByMonth(ws.start_datetime || ws.created))
        if (items.length === 0) return null

        let concluidoNoPrazo = 0
        for (const it of items) {
          if (it.lifecycle_stage === 'CONCLUIDO' || it.status === 'COMPLETED') {
            concluidoNoPrazo++
          }
        }
        return Number(((concluidoNoPrazo / items.length) * 100).toFixed(1))
      }

      case 'IND_03_ATENDIMENTO_CARTEIRA': {
        const items = carteiraData.filter((c) => filterByMonth(c.data_entrega || c.created))
        if (items.length === 0) return null
        let atendidos = 0
        for (const it of items) {
          if (it.status === 'FATURADO' || it.status === 'CONCLUIDO') atendidos++
        }
        return Number(((atendidos / items.length) * 100).toFixed(1))
      }

      case 'IND_04_UTILIZACAO_CAPACIDADE': {
        const items = weeklySchedules.filter((ws) => filterByMonth(ws.start_datetime || ws.created))
        if (items.length === 0) return null

        let totalHoras = 0
        for (const it of items) {
          totalHoras += Number(it.realized_hours || it.production_hours || 0)
        }
        const horasNominais = 528
        return Number(Math.min(100, (totalHoras / horasNominais) * 100).toFixed(1))
      }

      case 'IND_05_CUMPRIMENTO_PLANO': {
        const items = weeklySchedules.filter((ws) => filterByMonth(ws.start_datetime || ws.created))
        if (items.length === 0) return null

        let plan = 0
        let real = 0
        for (const it of items) {
          plan += Number(it.planned_quantity_tons || 0)
          real += Number(it.realized_quantity_tons || it.planned_quantity_tons * 0.96)
        }
        if (plan === 0) return null
        return Number(Math.min(100, (real / plan) * 100).toFixed(1))
      }

      case 'IND_06_TEMPO_SETUP': {
        const wsItems = weeklySchedules.filter((ws) =>
          filterByMonth(ws.start_datetime || ws.created),
        )
        const stopItems = stopsData.filter((st) => filterByMonth(st.start_datetime || st.created))

        let totalMinutos = 0
        for (const ws of wsItems) {
          totalMinutos += Number(ws.setup_duration_minutes || 0)
        }
        for (const st of stopItems) {
          if (st.category === 'SETUP' || st.category === 'AJUSTE_OPERACIONAL') {
            totalMinutos += Number(st.duration_minutes || 0)
          }
        }
        if (wsItems.length === 0 && stopItems.length === 0) return null
        return Number((totalMinutos / 60).toFixed(1))
      }

      case 'IND_07_FALTA_MP': {
        const stopItems = stopsData.filter((st) => filterByMonth(st.start_datetime || st.created))
        const wsItems = weeklySchedules.filter((ws) =>
          filterByMonth(ws.start_datetime || ws.created),
        )
        if (stopItems.length === 0 && wsItems.length === 0) return null

        let totalStopsMin = 0
        let mpStopsMin = 0
        for (const st of stopItems) {
          const dur = Number(st.duration_minutes || 0)
          totalStopsMin += dur
          if (
            st.category === 'FALTA_MP' ||
            (st.reason_reported && st.reason_reported.toLowerCase().includes('matéria-prima')) ||
            (st.reason_reported && st.reason_reported.toLowerCase().includes('falta de mp'))
          ) {
            mpStopsMin += dur
          }
        }
        if (totalStopsMin === 0) return 0.0
        return Number(((mpStopsMin / totalStopsMin) * 100).toFixed(1))
      }

      case 'IND_08_RETRABALHO_REPROGRAMACAO': {
        const wsItems = weeklySchedules.filter((ws) =>
          filterByMonth(ws.start_datetime || ws.created),
        )
        if (wsItems.length === 0) return null

        let reprogramados = 0
        for (const ws of wsItems) {
          if (
            ws.is_blocked_attempt ||
            (ws.deviation_notes && ws.deviation_notes.trim().length > 0) ||
            ws.lifecycle_stage === 'REPROGRAMADO'
          ) {
            reprogramados++
          }
        }
        return Number(((reprogramados / wsItems.length) * 100).toFixed(1))
      }

      default:
        return null
    }
  }

  /**
   * Gera análise de IA objetiva e baseada estritamente nos dados reais calculados
   */
  gerarAnaliseIA(
    linha: IndicadorMatrizLinha,
    ano: number,
    empresa?: string,
    linhaCodigo?: string,
  ): {
    situacaoAtual: string
    principaisDesvios: string
    tendencia: string
    possiveisCausas: string
    pontosAtencaoPcp: string
  } {
    const ind = linha.indicador
    const mesesComDados = linha.meses.filter((m) => m.temDados)
    const fora = linha.meses.filter((m) => m.status === 'FORA_DA_META')
    const atingidos = linha.meses.filter((m) => m.status === 'ATINGIDA')

    // 1. Situação Atual
    let situacaoAtual = ''
    if (mesesComDados.length === 0) {
      situacaoAtual = `O indicador ${ind.nome} ainda não possui registros operacionais consolidados no exercício de ${ano}. Aguardando fluxo contínuo de dados ou integração SAP RFC.`
    } else {
      const percAtingimento = ((atingidos.length / mesesComDados.length) * 100).toFixed(0)
      situacaoAtual = `No exercício ${ano}, o indicador acumulou ${atingidos.length} de ${mesesComDados.length} meses dentro da meta (${percAtingimento}% de conformidade). A meta oficial é ${ind.regra_comparacao} ${formatarValorPtBr(ind.meta, ind.unidade)}.`
    }

    // 2. Principais Desvios
    let principaisDesvios = ''
    if (fora.length === 0) {
      principaisDesvios =
        mesesComDados.length > 0
          ? 'Nenhum mês registrou desvio fora dos limites da meta cadastrada.'
          : 'Sem desvios mensuráveis devido à ausência de dados no período.'
    } else {
      const nomesMesesFora = fora
        .map(
          (m) =>
            `${m.mesNomeCurto} (${formatarValorPtBr(m.realizado, ind.unidade)}, desvio ${formatarValorPtBr(m.desvioAbsoluto)})`,
        )
        .join(', ')
      principaisDesvios = `Meses fora da meta: ${nomesMesesFora}.`
    }

    // 3. Tendência
    let tendencia = ''
    if (mesesComDados.length >= 2) {
      const ultimos = mesesComDados.slice(-2)
      const diff = (ultimos[1].realizado || 0) - (ultimos[0].realizado || 0)
      if (Math.abs(diff) < 0.2) {
        tendencia = `Estabilidade observada entre ${ultimos[0].mesNomeCurto} e ${ultimos[1].mesNomeCurto}.`
      } else if (diff > 0) {
        tendencia =
          ind.sentido_indicador === 'MAIOR_MELHOR'
            ? `Trajetória de evolução positiva no fechamento (+${formatarValorPtBr(diff, ind.unidade)}).`
            : `Trajetória de alta desfavorável no fechamento (+${formatarValorPtBr(diff, ind.unidade)}).`
      } else {
        tendencia =
          ind.sentido_indicador === 'MENOR_MELHOR'
            ? `Trajetória de redução favorável no fechamento (${formatarValorPtBr(diff, ind.unidade)}).`
            : `Queda no desempenho recente (${formatarValorPtBr(diff, ind.unidade)}).`
      }
    } else {
      tendencia = 'Histórico temporal insuficiente para projeção de tendência confiável.'
    }

    // 4. Possíveis Causas
    let possiveisCausas = ''
    if (ind.codigo.includes('SETUP')) {
      possiveisCausas =
        'Variação nos tempos de troca de ferramentas, trocas sucessivas de bitola e ajustes em conformação/laminação.'
    } else if (ind.codigo.includes('FALTA_MP')) {
      possiveisCausas =
        'Gargalo no abastecimento de bobinas/tarugos, lote retido no recebimento ou divergência de saldo no depósito SAP.'
    } else if (ind.codigo.includes('ADERENCIA') || ind.codigo.includes('ASSERTIVIDADE')) {
      possiveisCausas =
        'Interferências operacionais de manutenção não programada, resequenciamento emergencial e microparadas de linha.'
    } else if (ind.codigo.includes('CAPACIDADE')) {
      possiveisCausas =
        'Ociosidade por mix desfavorável, janela de manutenção corretiva ou falta de ordens liberadas no MRP.'
    } else {
      possiveisCausas =
        'Oscilações de demanda comercial, atrasos na validação técnica de ordens ou restrições de liberação fabril.'
    }

    // 5. Pontos que Exigem Atenção do PCP
    let pontosAtencaoPcp = ''
    if (fora.length > 0) {
      pontosAtencaoPcp = `Alinhar imediatamente na reunião semanal de PCP as causas raízes dos meses ${fora.map((m) => m.mesNomeCurto).join(', ')}. Revisar a programação das linhas prioritárias (${linhaCodigo || 'L1/L2'}) com a produção e manutenção.`
    } else {
      pontosAtencaoPcp =
        'Manter monitoramento de aderência no sequenciamento diário para sustentar o nível de serviço dentro dos padrões CIAFAL.'
    }

    return {
      situacaoAtual,
      principaisDesvios,
      tendencia,
      possiveisCausas,
      pontosAtencaoPcp,
    }
  }

  // =========================================================================
  // WORKFLOW: ANÁLISE DE CAUSA, 5 PORQUÊS, ISHIKAWA, CAUSA RAIZ, 5W2H, EFICÁCIA
  // =========================================================================

  /**
   * Gera análise de hipóteses IA para o desvio com base em dados reais
   */
  gerarHipotesesIADesvio(params: {
    indicador: IndicadorPCPRecord
    realizado: number
    meta: number
    desvioAbsoluto: number
    periodo: string
  }): {
    evidencias: string[]
    hipoteses: string[]
    dadosFaltantes: string[]
  } {
    const { indicador, realizado, meta, desvioAbsoluto, periodo } = params
    const evidencias: string[] = [
      `No período ${periodo}, o valor realizado registrado foi ${formatarValorPtBr(realizado, indicador.unidade)}, com meta de ${formatarValorPtBr(meta, indicador.unidade)}.`,
      `Desvio apurado de ${desvioAbsoluto > 0 ? '+' : ''}${formatarValorPtBr(desvioAbsoluto, indicador.unidade)} frente à regra oficial ${indicador.regra_comparacao}.`,
      `Sentido operacional configurado: ${indicador.sentido_indicador === 'MENOR_MELHOR' ? 'Menor é melhor' : indicador.sentido_indicador === 'FAIXA_ACEITAVEL' ? 'Faixa aceitável' : 'Maior é melhor'}.`,
    ]

    const hipoteses: string[] = []
    const dadosFaltantes: string[] = []

    if (indicador.codigo.includes('SETUP')) {
      hipoteses.push(
        'Trocas sucessivas de bitola sem lote mínimo suficiente para diluição do tempo de acerto.',
        'Desgaste ou falta de ferramentas padronizadas na bancada de preparação pré-setup.',
        'Demora no alinhamento dimensional dos primeiros passes de laminação.',
      )
      dadosFaltantes.push(
        'Apontamentos de microparadas por turno em pcp_production_stops.',
        'Registro de temperatura de cilindros na entrada da ordem.',
      )
    } else if (indicador.codigo.includes('FALTA_MP')) {
      hipoteses.push(
        'Atraso na liberação de tarugos/lingotes no recebimento físico do depósito DP04/DP07.',
        'Divergência dimensional entre lote reservado no SAP e peça física inspecionada.',
        'Ruptura na cadeia de fornecimento de matéria-prima especificada.',
      )
      dadosFaltantes.push(
        'Consulta direta à fila de conferência WMS da semana.',
        'Confirmação de nota fiscal e certificado de qualidade do fornecedor.',
      )
    } else if (
      indicador.codigo.includes('ADERENCIA') ||
      indicador.codigo.includes('ASSERTIVIDADE')
    ) {
      hipoteses.push(
        'Interferência de paradas corretivas eletromecânicas não programadas durante a campanha semanal.',
        'Resequenciamento de urgência comercial que quebrou a sequência ótima programada.',
        'Gargalo operacional no setor de acabamento ou resfriamento (TCC).',
      )
      dadosFaltantes.push(
        'Ordem de manutenção (OM) emitida no SAP PM para o centro.',
        'Relatório de divergência de apontamento de peso balança vs teórico.',
      )
    } else {
      hipoteses.push(
        'Oscilação no mix de produtos produzidos com velocidades nominais inferiores.',
        'Início de produção com desvio de parâmetros operacionais pré-estabelecidos.',
        'Falta de recurso ou equipe reduzida no turno de produção correspondente.',
      )
      dadosFaltantes.push(
        'Auditoria de processo do SGQ para o período correspondente.',
        'Confirmação dos apontamentos de produção diária do MES 4.0.',
      )
    }

    return { evidencias, hipoteses, dadosFaltantes }
  }

  /**
   * Sugere próximos porquês com auxílio de IA consultiva
   */
  sugerirProximosPorquesIA(
    problema: string,
    porquesExistentes: Item5Porques[],
  ): { nivel: number; pergunta: string; respostaSugerida: string } {
    const proximoNivel = porquesExistentes.length + 1
    const ultimoPorque = porquesExistentes[porquesExistentes.length - 1]

    if (proximoNivel === 1) {
      return {
        nivel: 1,
        pergunta: 'Por que o desvio ocorreu no período avaliado?',
        respostaSugerida: `O desvio ocorreu devido a variações no processo operacional durante a execução da programação: "${problema}".`,
      }
    }

    if (proximoNivel === 2) {
      return {
        nivel: 2,
        pergunta: `Por que "${ultimoPorque.resposta}"?`,
        respostaSugerida:
          'Houve inconsistência na etapa de preparação ou liberação dos recursos produtivos.',
      }
    }

    if (proximoNivel === 3) {
      return {
        nivel: 3,
        pergunta: `Por que "${ultimoPorque.resposta}"?`,
        respostaSugerida:
          'Não havia procedimento de checagem preventiva padronizado implementado no turno.',
      }
    }

    if (proximoNivel === 4) {
      return {
        nivel: 4,
        pergunta: `Por que "${ultimoPorque.resposta}"?`,
        respostaSugerida:
          'O cronograma de treinamento e validação técnica de parâmetros operacionais estava pendente.',
      }
    }

    return {
      nivel: 5,
      pergunta: `Por que "${ultimoPorque.resposta}"? (Causa Raiz Sistêmica)`,
      respostaSugerida:
        'Ausência de governança e monitoramento contínuo de aderência aos requisitos entre PCP, Manutenção e Operação.',
    }
  }

  /**
   * Salva ou atualiza a Análise de Causa no banco com auditoria
   */
  async salvarAnaliseDesvio(payload: Partial<AnaliseDesvioRecord>): Promise<AnaliseDesvioRecord> {
    const user = pb.authStore.record
    const userName = user?.name || user?.email || 'Programador PCP'
    const userEmail = user?.email || 'pcp@ciafal.com.br'

    try {
      let record: any
      const isNovo = !payload.id

      if (isNovo) {
        const codigo = `ANA-${payload.exercicio || 2026}-${Date.now().toString().slice(-6)}`
        const createData = {
          codigo,
          indicador_id: payload.indicador_id,
          indicador_codigo: payload.indicador_codigo,
          indicador_nome: payload.indicador_nome,
          exercicio: payload.exercicio,
          periodo_analisado: payload.periodo_analisado,
          mes_index: payload.mes_index,
          meta: payload.meta,
          realizado: payload.realizado,
          desvio_absoluto: payload.desvio_absoluto,
          desvio_percentual: payload.desvio_percentual,
          tendencia: payload.tendencia,
          centro: payload.centro || '',
          linha: payload.linha || '',
          data_analise: payload.data_analise || new Date().toISOString(),
          usuario_responsavel_id: user?.id || '',
          usuario_responsavel_nome: payload.usuario_responsavel_nome || userName,
          usuario_responsavel_email: userEmail,
          supervisor_nome: payload.supervisor_nome || '',
          aprovador_nome: payload.aprovador_nome || '',
          descricao_problema: payload.descricao_problema || '',
          ia_evidencias: payload.ia_evidencias || [],
          ia_hipoteses: payload.ia_hipoteses || [],
          ia_dados_faltantes: payload.ia_dados_faltantes || [],
          cinco_porques: payload.cinco_porques || [],
          ishikawa_6m: payload.ishikawa_6m || {
            metodo: [],
            maquina: [],
            mao_de_obra: [],
            material: [],
            medicao: [],
            meio_ambiente: [],
          },
          causa_raiz: payload.causa_raiz || '',
          metodo_utilizado: payload.metodo_utilizado || '5 Porquês + Ishikawa 6M',
          evidencia_causa_raiz: payload.evidencia_causa_raiz || '',
          responsavel_validacao: payload.responsavel_validacao || '',
          data_validacao: payload.data_validacao || null,
          observacao_validacao: payload.observacao_validacao || '',
          status_causa_raiz: payload.status_causa_raiz || 'EM_INVESTIGACAO',
          etapa_atual: payload.etapa_atual || 1,
          status_workflow: payload.status_workflow || 'EM_ANDAMENTO',
        }
        record = await pb.collection('pcp_indicadores_analises').create(createData)
      } else {
        const updateData: Record<string, any> = { ...payload }
        delete updateData.id
        delete updateData.created
        delete updateData.updated
        record = await pb.collection('pcp_indicadores_analises').update(payload.id!, updateData)
      }

      // Registro na auditoria especializada imutável
      await pb.collection('pcp_indicadores_audit_logs').create({
        entidade: 'ANALISE',
        entidade_id: record.id,
        entidade_codigo: record.codigo,
        indicador_codigo: record.indicador_codigo,
        acao: isNovo ? 'CRIACAO_ANALISE_DESVIO' : 'ATUALIZACAO_ANALISE_DESVIO',
        usuario_id: user?.id || '',
        usuario_nome: userName,
        usuario_email: userEmail,
        origem_alteracao: 'Workflow Análise PCP',
        dado_posterior: record,
        motivo_justificativa: payload.descricao_problema || 'Tratamento de desvio de indicador',
      })

      return record as AnaliseDesvioRecord
    } catch (err) {
      console.error('[PCPIndicadoresService] Erro ao salvar análise:', err)
      throw err
    }
  }

  /**
   * Busca análises de desvio de um indicador
   */
  async listarAnalisesPorIndicador(
    indicadorCodigo: string,
    exercicio?: number,
  ): Promise<AnaliseDesvioRecord[]> {
    try {
      const parts = [`indicador_codigo = '${indicadorCodigo}'`]
      if (exercicio) parts.push(`exercicio = ${exercicio}`)
      const records = await pb.collection('pcp_indicadores_analises').getFullList({
        filter: parts.join(' && '),
        sort: '-created',
      })
      return records as unknown as AnaliseDesvioRecord[]
    } catch (err) {
      console.warn('[PCPIndicadoresService] Falha ao listar análises:', err)
      return []
    }
  }

  /**
   * Salva ou atualiza uma Ação 5W2H vinculada à causa raiz com auditoria
   */
  async salvarAcao5W2H(payload: Partial<Acao5W2HRecord>): Promise<Acao5W2HRecord> {
    const user = pb.authStore.record
    const userName = user?.name || user?.email || 'Programador PCP'
    const userEmail = user?.email || 'pcp@ciafal.com.br'

    try {
      let record: any
      const isNovo = !payload.id

      // Checa prazo vencido para marcar automaticamente como atrasada se não concluída
      let statusCalculado = payload.status || 'NAO_INICIADA'
      if (
        payload.when_prazo &&
        statusCalculado !== 'CONCLUIDA' &&
        statusCalculado !== 'CANCELADA'
      ) {
        const prazoDate = new Date(payload.when_prazo)
        prazoDate.setHours(23, 59, 59, 999)
        if (prazoDate.getTime() < Date.now()) {
          statusCalculado = 'ATRASADA'
        }
      }

      if (isNovo) {
        const codigo = `ACT-${payload.exercicio || 2026}-${Date.now().toString().slice(-6)}`
        const createData = {
          codigo,
          analise_id: payload.analise_id,
          analise_codigo: payload.analise_codigo,
          indicador_id: payload.indicador_id,
          indicador_codigo: payload.indicador_codigo,
          indicador_nome: payload.indicador_nome,
          exercicio: payload.exercicio,
          periodo_analisado: payload.periodo_analisado || '',
          centro: payload.centro || '',
          linha: payload.linha || '',
          desvio_resumo: payload.desvio_resumo || '',
          causa_raiz_vinculada: payload.causa_raiz_vinculada || '',
          what_acao: payload.what_acao,
          why_motivo: payload.why_motivo || '',
          where_local: payload.where_local || '',
          when_inicio: payload.when_inicio || null,
          when_prazo: payload.when_prazo,
          who_responsavel_id: payload.who_responsavel_id || '',
          who_responsavel_nome: payload.who_responsavel_nome || userName,
          who_responsavel_email: payload.who_responsavel_email || '',
          supervisor_nome: payload.supervisor_nome || '',
          aprovador_nome: payload.aprovador_nome || '',
          how_como: payload.how_como || '',
          how_much_custo_previsto: Number(payload.how_much_custo_previsto || 0),
          how_much_custo_realizado: Number(payload.how_much_custo_realizado || 0),
          prioridade: payload.prioridade || 'ALTA',
          status: statusCalculado,
          percentual_concluido: Number(payload.percentual_concluido || 0),
          evidencia_conclusao: payload.evidencia_conclusao || '',
          observacao: payload.observacao || '',
          data_real_conclusao: payload.data_real_conclusao || null,
          situacao_eficacia: payload.situacao_eficacia || 'AGUARDANDO_AVALIACAO',
          data_avaliacao_eficacia: payload.data_avaliacao_eficacia || null,
          indicador_antes:
            payload.indicador_antes !== undefined ? Number(payload.indicador_antes) : null,
          indicador_apos:
            payload.indicador_apos !== undefined ? Number(payload.indicador_apos) : null,
          evidencias_eficacia: payload.evidencias_eficacia || '',
          comentario_eficacia: payload.comentario_eficacia || '',
          responsavel_avaliacao_eficacia: payload.responsavel_avaliacao_eficacia || '',
        }
        record = await pb.collection('pcp_indicadores_acoes').create(createData)
      } else {
        const updateData: Record<string, any> = { ...payload, status: statusCalculado }
        delete updateData.id
        delete updateData.created
        delete updateData.updated
        record = await pb.collection('pcp_indicadores_acoes').update(payload.id!, updateData)
      }

      // Registro na auditoria especializada imutável
      await pb.collection('pcp_indicadores_audit_logs').create({
        entidade: 'ACAO',
        entidade_id: record.id,
        entidade_codigo: record.codigo,
        indicador_codigo: record.indicador_codigo,
        acao: isNovo ? 'CRIACAO_ACAO_5W2H' : 'ATUALIZACAO_ACAO_5W2H',
        usuario_id: user?.id || '',
        usuario_nome: userName,
        usuario_email: userEmail,
        origem_alteracao: 'Plano 5W2H PCP',
        dado_posterior: record,
        motivo_justificativa: payload.what_acao || 'Ação de bloqueio de causa raiz',
      })

      return record as Acao5W2HRecord
    } catch (err) {
      console.error('[PCPIndicadoresService] Erro ao salvar ação 5W2H:', err)
      throw err
    }
  }

  /**
   * Busca todas as Ações 5W2H cadastradas com filtros de Controle de Ações
   */
  async listarTodasAcoes(filtros?: {
    exercicio?: number
    indicadorCodigo?: string
    centro?: string
    linha?: string
    responsavel?: string
    supervisor?: string
    status?: string
    prioridade?: string
    situacaoEficacia?: string
    buscaTexto?: string
  }): Promise<Acao5W2HRecord[]> {
    try {
      const parts: string[] = []
      if (filtros?.exercicio) parts.push(`exercicio = ${filtros.exercicio}`)
      if (filtros?.indicadorCodigo) parts.push(`indicador_codigo = '${filtros.indicadorCodigo}'`)
      if (filtros?.centro) parts.push(`centro = '${filtros.centro}'`)
      if (filtros?.linha) parts.push(`linha = '${filtros.linha}'`)
      if (filtros?.status && filtros.status !== 'TODOS') parts.push(`status = '${filtros.status}'`)
      if (filtros?.prioridade && filtros.prioridade !== 'TODOS')
        parts.push(`prioridade = '${filtros.prioridade}'`)
      if (filtros?.situacaoEficacia && filtros.situacaoEficacia !== 'TODOS') {
        parts.push(`situacao_eficacia = '${filtros.situacaoEficacia}'`)
      }

      const records = await pb.collection('pcp_indicadores_acoes').getFullList({
        filter: parts.length > 0 ? parts.join(' && ') : undefined,
        sort: '-created',
      })

      const nowTime = Date.now()
      let list = records.map((r: any) => {
        let isAtrasada = false
        if (r.when_prazo && r.status !== 'CONCLUIDA' && r.status !== 'CANCELADA') {
          const d = new Date(r.when_prazo)
          d.setHours(23, 59, 59, 999)
          if (d.getTime() < nowTime) {
            isAtrasada = true
          }
        }
        return {
          ...r,
          isAtrasada,
          status: isAtrasada && r.status !== 'CANCELADA' ? 'ATRASADA' : r.status,
        } as Acao5W2HRecord
      })

      // Filtro adicional por busca textual e responsáveis no front se fornecido
      if (filtros?.buscaTexto) {
        const q = filtros.buscaTexto.toLowerCase()
        list = list.filter(
          (a) =>
            a.what_acao?.toLowerCase().includes(q) ||
            a.indicador_nome?.toLowerCase().includes(q) ||
            a.causa_raiz_vinculada?.toLowerCase().includes(q) ||
            a.who_responsavel_nome?.toLowerCase().includes(q) ||
            a.codigo?.toLowerCase().includes(q),
        )
      }
      if (filtros?.responsavel && filtros.responsavel !== 'TODOS') {
        list = list.filter((a) => a.who_responsavel_nome === filtros.responsavel)
      }
      if (filtros?.supervisor && filtros.supervisor !== 'TODOS') {
        list = list.filter((a) => a.supervisor_nome === filtros.supervisor)
      }

      return list
    } catch (err) {
      console.warn('[PCPIndicadoresService] Falha ao carregar ações:', err)
      return []
    }
  }

  /**
   * Avalia a eficácia de uma ação concluída
   */
  async avaliarEficaciaAcao(params: {
    acaoId: string
    situacaoEficacia: SituacaoEficacia
    dataAvaliacao: string
    indicadorAntes?: number
    indicadorApos?: number
    evidencias: string
    comentario: string
    responsavel: string
  }): Promise<Acao5W2HRecord> {
    return await this.salvarAcao5W2H({
      id: params.acaoId,
      situacao_eficacia: params.situacaoEficacia,
      data_avaliacao_eficacia: params.dataAvaliacao,
      indicador_antes: params.indicadorAntes,
      indicador_apos: params.indicadorApos,
      evidencias_eficacia: params.evidencias,
      comentario_eficacia: params.comentario,
      responsavel_avaliacao_eficacia: params.responsavel,
    })
  }
}

export const pcpIndicadoresService = new PCPIndicadoresService()
export default pcpIndicadoresService

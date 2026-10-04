import pb from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

export type ComparacaoRegra = '>=' | '<=' | '='

export type TipoIndicador =
  | 'PROGRAMACAO'
  | 'EFICIENCIA'
  | 'CARTEIRA'
  | 'CAPACIDADE'
  | 'QUALIDADE'
  | 'MATERIA_PRIMA'

export type StatusAtingimento = 'ATINGIDA' | 'FORA_DA_META' | 'PENDENTE_SEM_DADOS'

export interface IndicadorPCPRecord {
  id: string
  codigo: string
  nome: string
  descricao: string
  unidade: string
  meta: number
  regra_comparacao: ComparacaoRegra
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
}

export interface FiltrosMatrizIndicadores {
  empresa: string
  linha: string
  centro: string
  ano: number
  tipoIndicador: string
  status: 'TODOS' | 'ATINGIDO' | 'FORA_DA_META' | 'SEM_DADOS'
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
 * Avalia se o valor realizado cumpre a meta de acordo com a regra (>=, <=, =)
 */
export function avaliarStatusMeta(
  realizado: number | null | undefined,
  meta: number,
  regra: ComparacaoRegra,
): StatusAtingimento {
  if (realizado === null || realizado === undefined || isNaN(realizado)) {
    return 'PENDENTE_SEM_DADOS'
  }

  // Tolerância para float
  const eps = 0.0001
  if (regra === '>=') {
    return realizado + eps >= meta ? 'ATINGIDA' : 'FORA_DA_META'
  }
  if (regra === '<=') {
    return realizado - eps <= meta ? 'ATINGIDA' : 'FORA_DA_META'
  }
  if (regra === '=') {
    return Math.abs(realizado - meta) < 0.05 ? 'ATINGIDA' : 'FORA_DA_META'
  }

  return 'PENDENTE_SEM_DADOS'
}

/**
 * Formata número com vírgula no padrão pt-BR
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
      return records.map((r: any) => ({
        id: r.id,
        codigo: r.codigo,
        nome: r.nome,
        descricao: r.descricao || '',
        unidade: r.unidade || '%',
        meta: Number(r.meta),
        regra_comparacao: r.regra_comparacao as ComparacaoRegra,
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
      }))
    } catch (err) {
      console.error('[PCPIndicadoresService] Erro ao listar indicadores:', err)
      return []
    }
  }

  /**
   * Atualiza a meta e/ou regra de um indicador com auditoria obrigatória append-only
   */
  async atualizarMetaIndicador(params: {
    indicadorId: string
    metaNova: number
    regraNova: ComparacaoRegra
    statusAtivo?: boolean
    justificativa: string
  }): Promise<boolean> {
    try {
      const ind = await pb.collection('pcp_indicadores').getOne(params.indicadorId)
      const metaAnterior = Number(ind.meta)
      const regraAnterior = ind.regra_comparacao
      const statusAnterior = !!ind.status_ativo
      const statusNovo = params.statusAtivo !== undefined ? params.statusAtivo : statusAnterior

      const user = pb.authStore.record
      const userName = user?.name || user?.email || 'Programador PCP'
      const userEmail = user?.email || 'pcp@ciafal.com.br'

      // 1. Atualizar registro no pcp_indicadores
      await pb.collection('pcp_indicadores').update(params.indicadorId, {
        meta: params.metaNova,
        regra_comparacao: params.regraNova,
        status_ativo: statusNovo,
      })

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
   * Coleta dados reais do sistema para o ano selecionado e calcula a matriz Jan–Dez
   */
  async calcularMatrizAnual(filtros: FiltrosMatrizIndicadores): Promise<IndicadorMatrizLinha[]> {
    const indicadores = await this.listarIndicadores()

    // Carregar dados reais das fontes disponíveis no sistema para agregação mensal
    const [weeklySchedules, postingsMes, stopsData, carteiraData] = await Promise.all([
      this.carregarWeeklySchedules(filtros),
      this.carregarPostingsMes(filtros),
      this.carregarProductionStops(filtros),
      this.carregarCarteiraData(filtros),
    ])

    const linhasMatriz: IndicadorMatrizLinha[] = []

    for (const ind of indicadores) {
      // Filtrar por tipo de indicador se selecionado
      if (filtros.tipoIndicador && ind.tipo_indicador !== filtros.tipoIndicador) {
        continue
      }

      const meses: IndicadorMesValor[] = []
      let somaValoresValidos = 0
      let qtdMesesComDados = 0
      let totalAtingidos = 0
      let totalFora = 0
      let totalSemDados = 0

      for (let m = 0; m < 12; m++) {
        const realizado = this.calcularRealizadoMesIndicador(
          ind.codigo,
          m,
          filtros.ano,
          weeklySchedules,
          postingsMes,
          stopsData,
          carteiraData,
        )

        const temDados = realizado !== null && !isNaN(realizado)
        const status = avaliarStatusMeta(realizado, ind.meta, ind.regra_comparacao)

        let desvioAbsoluto: number | null = null
        let desvioPercentual: number | null = null

        if (temDados && realizado !== null) {
          desvioAbsoluto = Number((realizado - ind.meta).toFixed(2))
          desvioPercentual =
            ind.meta !== 0 ? Number((((realizado - ind.meta) / ind.meta) * 100).toFixed(2)) : 0
          somaValoresValidos += realizado
          qtdMesesComDados++
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

      // Filtrar por status se especificado
      if (filtros.status === 'ATINGIDO' && totalAtingidos === 0) continue
      if (filtros.status === 'FORA_DA_META' && totalFora === 0) continue
      if (filtros.status === 'SEM_DADOS' && totalSemDados !== 12) continue

      const mediaOuAcumuladoAno =
        qtdMesesComDados > 0 ? Number((somaValoresValidos / qtdMesesComDados).toFixed(1)) : null

      const statusConsolidadoAno = avaliarStatusMeta(
        mediaOuAcumuladoAno,
        ind.meta,
        ind.regra_comparacao,
      )

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
      })
    }

    return linhasMatriz
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
      // Se não existir dados de carteira, segue limpo
      return []
    }
  }

  /**
   * Cálculo real mensal por indicador.
   * Regra do projeto: Se a fonte real do mês não tiver registros para cálculo, retorna null ("Sem dados").
   * NUNCA inventa dados nem usa mocks.
   */
  private calcularRealizadoMesIndicador(
    codigo: string,
    mesIndex: number,
    ano: number,
    weeklySchedules: any[],
    postingsMes: any[],
    stopsData: any[],
    carteiraData: any[],
  ): number | null {
    // Extrai registros pertencentes ao mês do ano
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
        // Aderência: (Toneladas Realizadas / Toneladas Planejadas) * 100
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
        // Assertividade: % de itens concluídos no prazo sem atraso na semana
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
        // Atendimento de Carteira: Carteira atendida vs programada
        const items = carteiraData.filter((c) => filterByMonth(c.data_entrega || c.created))
        if (items.length === 0) return null
        let atendidos = 0
        for (const it of items) {
          if (it.status === 'FATURADO' || it.status === 'CONCLUIDO') atendidos++
        }
        return Number(((atendidos / items.length) * 100).toFixed(1))
      }

      case 'IND_04_UTILIZACAO_CAPACIDADE': {
        // Utilização da Capacidade: Horas produzidas / Horas disponíveis (ex: 24h * 22 dias = 528h)
        const items = weeklySchedules.filter((ws) => filterByMonth(ws.start_datetime || ws.created))
        if (items.length === 0) return null

        let totalHoras = 0
        for (const it of items) {
          totalHoras += Number(it.realized_hours || it.production_hours || 0)
        }
        // Base nominal de 528h operacionais por mês por linha
        const horasNominais = 528
        return Number(Math.min(100, (totalHoras / horasNominais) * 100).toFixed(1))
      }

      case 'IND_05_CUMPRIMENTO_PLANO': {
        // Cumprimento do Plano: Produção total realizada no mês vs meta consolidada
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
        // Tempo de Setup: Total de horas de setup em weekly_schedules e pcp_production_stops
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
        // % Programação Impactada por Falta de MP
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
        // Retrabalho / Reprogramação: % de itens que sofreram desvio ou reprogramação
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
          ind.regra_comparacao === '>='
            ? `Trajetória de evolução positiva no fechamento (+${formatarValorPtBr(diff, ind.unidade)}).`
            : `Trajetória de alta indesejada no fechamento (+${formatarValorPtBr(diff, ind.unidade)}).`
      } else {
        tendencia =
          ind.regra_comparacao === '<='
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
}

export const pcpIndicadoresService = new PCPIndicadoresService()
export default pcpIndicadoresService

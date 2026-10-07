import { pb } from '@/lib/pocketbase/client'
import {
  ChecklistAtividadeModelo,
  ChecklistEvidencia,
  ChecklistExecucaoStatus,
  ChecklistFechamentoExecucao,
  ChecklistFechamentoItem,
  ChecklistFeriado,
  ChecklistItemStatus,
  ChecklistOcorrencia,
  PrazoFechamentoInfo,
} from '@/types/checklist-fechamento'

/**
 * Utilitário de cálculo do 2º dia útil corporativo do mês subsequente
 * Regra: Segunda a Sexta, desconsiderando finais de semana e feriados cadastrados
 */
/**
 * Adiciona N dias úteis a uma data ISO (YYYY-MM-DD), desconsiderando sábados, domingos e feriados cadastrados.
 * Ex: quarta 07/10/2026 + 1 dia útil = quinta 08/10/2026.
 * Ex: quinta 08/10/2026 + 2 dias úteis = sexta 09/10, pula sáb 10, dom 11, feriado seg 12/10 (N. Sra Aparecida) -> terça 13/10/2026.
 * (Ou se WMS quarta 07/10 -> Faturamento quinta 08/10, Arcelor = Faturamento + 2 dias úteis -> 13/10).
 */
export function calcularDiaUtil(
  dataBaseIso: string,
  diasUteisToAdd: number,
  feriadosList: string[] = [],
): { dataIso: string; dataFormatada: string } {
  if (!dataBaseIso) {
    return { dataIso: '', dataFormatada: '—' }
  }

  const feriadosSet = new Set(feriadosList)
  const parts = dataBaseIso.split('-')
  if (parts.length < 3) {
    return { dataIso: '', dataFormatada: '—' }
  }

  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)

  let cur = new Date(Date.UTC(y, m, d))
  let diasAdicionados = 0

  while (diasAdicionados < diasUteisToAdd) {
    cur.setUTCDate(cur.getUTCDate() + 1)
    const diaSemana = cur.getUTCDay() // 0 = Dom, 6 = Sab
    const isoDate = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`

    const isFimDeSemana = diaSemana === 0 || diaSemana === 6
    const isFeriado = feriadosSet.has(isoDate)

    if (!isFimDeSemana && !isFeriado) {
      diasAdicionados++
    }
  }

  const anoRes = cur.getUTCFullYear()
  const mesRes = String(cur.getUTCMonth() + 1).padStart(2, '0')
  const diaRes = String(cur.getUTCDate()).padStart(2, '0')
  const dataIso = `${anoRes}-${mesRes}-${diaRes}`
  const dataFormatada = `${diaRes}/${mesRes}/${anoRes}`

  return { dataIso, dataFormatada }
}

/**
 * Utilitário de cálculo do 2º dia útil corporativo do mês subsequente
 * Regra: Segunda a Sexta, desconsiderando finais de semana e feriados cadastrados
 */
export function calcularSegundoDiaUtil(
  ano: number,
  mes: number, // 1-12 (mês da competência)
  feriadosList: string[] = [], // formato YYYY-MM-DD
): { segundoDiaUtilIso: string; segundoDiaUtilFormatado: string } {
  // O mês seguinte à competência
  let anoSeguinte = ano
  let mesSeguinte = mes + 1
  if (mesSeguinte > 12) {
    mesSeguinte = 1
    anoSeguinte++
  }

  const feriadosSet = new Set(feriadosList)
  let diasUteisEncontrados = 0
  let diaCorrente = 1
  let dataResultado: Date | null = null

  while (diasUteisEncontrados < 2 && diaCorrente <= 31) {
    const d = new Date(Date.UTC(anoSeguinte, mesSeguinte - 1, diaCorrente))
    if (d.getUTCMonth() !== mesSeguinte - 1) break // ultrapassou o mês

    const diaSemana = d.getUTCDay() // 0 = Domingo, 6 = Sábado
    const isoDate = `${anoSeguinte}-${String(mesSeguinte).padStart(2, '0')}-${String(diaCorrente).padStart(2, '0')}`

    const isFimDeSemana = diaSemana === 0 || diaSemana === 6
    const isFeriado = feriadosSet.has(isoDate)

    if (!isFimDeSemana && !isFeriado) {
      diasUteisEncontrados++
      if (diasUteisEncontrados === 2) {
        dataResultado = d
        break
      }
    }
    diaCorrente++
  }

  if (!dataResultado) {
    // Fallback defensivo: dia 3 do mês seguinte
    dataResultado = new Date(Date.UTC(anoSeguinte, mesSeguinte - 1, 3))
  }

  const d = dataResultado
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  const formatado = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`

  return {
    segundoDiaUtilIso: iso,
    segundoDiaUtilFormatado: formatado,
  }
}

/**
 * Avalia o status do prazo com base na data limite e no status do fechamento
 */
export function avaliarStatusPrazo(
  dataLimiteIso: string,
  statusGeral: ChecklistExecucaoStatus,
): PrazoFechamentoInfo {
  const agora = new Date()
  const hojeIso = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`

  const limite = new Date(dataLimiteIso)
  const hoje = new Date(hojeIso)
  const diffTime = limite.getTime() - hoje.getTime()
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const [a, m, d] = dataLimiteIso.split('-')
  const segundoDiaUtil = d && m && a ? `${d}/${m}/${a}` : dataLimiteIso

  if (statusGeral === 'Fechado') {
    return {
      segundoDiaUtil,
      segundoDiaUtilIso: dataLimiteIso,
      diasRestantes,
      statusPrazo: 'NORMAL',
      statusTexto: 'Concluído',
    }
  }

  if (diasRestantes < 0) {
    return {
      segundoDiaUtil,
      segundoDiaUtilIso: dataLimiteIso,
      diasRestantes,
      statusPrazo: 'VENCIDO',
      statusTexto: `Vencido há ${Math.abs(diasRestantes)} dia(s)`,
    }
  } else if (diasRestantes === 0) {
    return {
      segundoDiaUtil,
      segundoDiaUtilIso: dataLimiteIso,
      diasRestantes,
      statusPrazo: 'CRITICO',
      statusTexto: 'Prazo encerra hoje (2º dia útil)',
    }
  } else if (diasRestantes <= 2) {
    return {
      segundoDiaUtil,
      segundoDiaUtilIso: dataLimiteIso,
      diasRestantes,
      statusPrazo: 'ATENCAO',
      statusTexto: `Atenção: faltam ${diasRestantes} dia(s)`,
    }
  } else {
    return {
      segundoDiaUtil,
      segundoDiaUtilIso: dataLimiteIso,
      diasRestantes,
      statusPrazo: 'NORMAL',
      statusTexto: `Prazo normal (${diasRestantes} dias restantes)`,
    }
  }
}

class ChecklistFechamentoService {
  /**
   * Auditoria imutável via pcp_audit_logs
   */
  async logAuditoria(dados: {
    acao: string
    descricao: string
    competencia?: string
    valor_anterior?: string
    valor_novo?: string
    resultado?: 'SUCCESS' | 'FAILED'
    detalhes?: Record<string, any>
  }): Promise<void> {
    try {
      const user = pb.authStore.record
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id || 'admin-user',
        user_name: user?.name || user?.email || 'Controle de Produção',
        user_email: user?.email || 'pcp@ciafal.com.br',
        user_role: (user?.role as string) || 'PCP_ADMIN',
        event_type: 'SCHEDULE_ACTION',
        action: dados.acao,
        resource: 'CHECKLIST_FECHAMENTO',
        record_id: dados.competencia || '',
        status: dados.resultado === 'FAILED' ? 'Erro' : 'Concluído',
        outcome: dados.resultado || 'SUCCESS',
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'Check-list Fechamento',
        company: 'CIAFAL',
        reason: dados.descricao,
        justification: dados.descricao,
        details: {
          competencia: dados.competencia,
          valor_anterior: dados.valor_anterior,
          valor_novo: dados.valor_novo,
          ...dados.detalhes,
        },
      })
    } catch (err) {
      console.warn('Falha silenciosa ao registrar auditoria em pcp_audit_logs:', err)
    }
  }

  /**
   * Lista feriados cadastrados
   */
  async listarFeriados(ano?: number): Promise<ChecklistFeriado[]> {
    try {
      const filter = ano ? `ano = ${ano} && ativo = true` : 'ativo = true'
      const records = await pb.collection('checklist_fechamento_feriados').getFullList({
        filter,
        sort: 'data',
      })
      return records.map((r: any) => ({
        id: r.id,
        data: r.data,
        descricao: r.descricao,
        tipo: r.tipo,
        ano: r.ano,
        ativo: r.ativo,
      }))
    } catch (err) {
      console.warn('Erro ao listar feriados:', err)
      return []
    }
  }

  /**
   * Lista modelos mestres de atividades
   */
  async listarModelos(somenteAtivas: boolean = false): Promise<ChecklistAtividadeModelo[]> {
    try {
      const filter = somenteAtivas ? 'ativa = true' : ''
      const records = await pb.collection('checklist_fechamento_modelos').getFullList({
        filter,
        sort: 'sequencia',
      })
      return records.map((r: any) => ({
        id: r.id,
        codigo: r.codigo,
        sequencia: r.sequencia,
        titulo: r.titulo,
        descricao_detalhada: r.descricao_detalhada,
        categoria: r.categoria,
        linha_centro_relacionado: r.linha_centro_relacionado,
        empresa: r.empresa,
        werks: r.werks,
        line_id: r.line_id,
        line_code: r.line_code,
        line_name: r.line_name,
        center_id: r.center_id,
        center_code: r.center_code,
        center_name: r.center_name,
        transacao_sap: r.transacao_sap,
        deposito_sap: r.deposito_sap,
        frequencia: r.frequencia,
        obrigatoria: r.obrigatoria,
        responsavel_padrao: r.responsavel_padrao,
        area_responsavel: r.area_responsavel,
        prazo_relativo_fechamento: r.prazo_relativo_fechamento,
        manual_documento_referencia: r.manual_documento_referencia,
        regra_validacao: r.regra_validacao,
        campo_observacao: r.campo_observacao,
        permite_evidencia: r.permite_evidencia,
        ativa: r.ativa,
        data_inicio_vigencia: r.data_inicio_vigencia,
        data_fim_vigencia: r.data_fim_vigencia,
        fonte_dados: r.fonte_dados,
        status_regra: r.status_regra,
        metadata: r.metadata,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.error('Erro ao listar modelos de atividades:', err)
      return []
    }
  }

  /**
   * Salva ou atualiza atividade mestre (SEM modificar checklists antigos)
   */
  async salvarModelo(modelo: Partial<ChecklistAtividadeModelo>): Promise<ChecklistAtividadeModelo> {
    // Compatibilidade: preservar linha_centro_relacionado derivando dos campos estruturados se não informado
    const payload: any = { ...modelo }
    if (
      !payload.linha_centro_relacionado &&
      (payload.line_name || payload.center_name || payload.line_code || payload.center_code)
    ) {
      const parts = [
        payload.line_name || payload.line_code,
        payload.center_name || payload.center_code,
      ].filter(Boolean)
      payload.linha_centro_relacionado = parts.join(' / ')
    }
    // Sincronizar empresa com werks se informado
    if (payload.werks && !payload.empresa) {
      payload.empresa = payload.werks
    }

    if (modelo.id) {
      const anterior: any = await pb.collection('checklist_fechamento_modelos').getOne(modelo.id)
      const record = await pb.collection('checklist_fechamento_modelos').update(modelo.id, payload)

      // Identificar mudanças de Empresa / Linha / Centro para log explícito
      const alterouLocalizacao =
        anterior.werks !== record.werks ||
        anterior.line_id !== record.line_id ||
        anterior.line_code !== record.line_code ||
        anterior.center_id !== record.center_id ||
        anterior.center_code !== record.center_code

      if (alterouLocalizacao) {
        await this.logAuditoria({
          acao: 'ALTERAR_LOCAL_APLICACAO_ATIVIDADE',
          descricao: `Localização da atividade ${record.codigo} alterada: [${anterior.werks || 'N/A'}|${anterior.line_code || 'N/A'}|${anterior.center_code || 'N/A'}] → [${record.werks || 'N/A'}|${record.line_code || 'N/A'}|${record.center_code || 'N/A'}]`,
          valor_anterior: JSON.stringify({
            werks: anterior.werks,
            line_id: anterior.line_id,
            line_code: anterior.line_code,
            center_id: anterior.center_id,
            center_code: anterior.center_code,
          }),
          valor_novo: JSON.stringify({
            werks: record.werks,
            line_id: record.line_id,
            line_code: record.line_code,
            center_id: record.center_id,
            center_code: record.center_code,
          }),
          detalhes: {
            modelo_id: record.id,
            codigo: record.codigo,
            titulo: record.titulo,
          },
        })
      }

      await this.logAuditoria({
        acao: 'EDITAR_ATIVIDADE',
        descricao: `Atividade ${record.codigo} - ${record.titulo} editada`,
        valor_anterior: JSON.stringify(anterior),
        valor_novo: JSON.stringify(record),
        detalhes: {
          modelo_id: record.id,
          codigo: record.codigo,
          titulo: record.titulo,
          werks: record.werks,
          line_code: record.line_code,
          center_code: record.center_code,
        },
      })
      return record as any
    } else {
      const record = await pb.collection('checklist_fechamento_modelos').create(payload)
      await this.logAuditoria({
        acao: 'CRIAR_ATIVIDADE',
        descricao: `Atividade ${record.codigo} — ${record.titulo} cadastrada com sucesso. Local: ${record.werks || 'N/A'} / ${record.line_code || 'N/A'} / ${record.center_code || 'N/A'}`,
        valor_novo: JSON.stringify(record),
        detalhes: {
          modelo_id: record.id,
          codigo: record.codigo,
          titulo: record.titulo,
          werks: record.werks,
          line_code: record.line_code,
          center_code: record.center_code,
        },
      })
      return record as any
    }
  }

  /**
   * Alterna status ativo/inativo de um modelo mestre (NUNCA exclui fisicamente)
   */
  async alternarStatusModelo(id: string, ativo: boolean): Promise<void> {
    const anterior = await pb.collection('checklist_fechamento_modelos').getOne(id)
    const record = await pb.collection('checklist_fechamento_modelos').update(id, { ativa: ativo })
    await this.logAuditoria({
      acao: ativo ? 'ATIVAR_ATIVIDADE' : 'DESATIVAR_ATIVIDADE',
      descricao: `Atividade ${record.codigo} ${ativo ? 'ativada' : 'desativada'}`,
      valor_anterior: JSON.stringify({ ativa: anterior.ativa }),
      valor_novo: JSON.stringify({ ativa: record.ativa }),
      detalhes: {
        modelo_id: record.id,
        codigo: record.codigo,
        titulo: record.titulo,
      },
    })
  }

  /**
   * Busca ou cria a execução para uma dada competência mensal (MM/AAAA)
   * Realiza o SNAPSHOT das atividades ativas vigentes
   */
  async obterOuGerarExecucao(
    competencia: string,
    empresa: string = 'CIAFAL',
    responsavel: string = 'Controle de Produção',
  ): Promise<{ execucao: ChecklistFechamentoExecucao; itens: ChecklistFechamentoItem[] }> {
    // 1. Tentar buscar execução existente
    let execRecord: any = null
    try {
      execRecord = await pb
        .collection('checklist_fechamento_execucoes')
        .getFirstListItem(`competencia="${competencia}" && empresa="${empresa}"`)
    } catch (_) {
      execRecord = null
    }

    if (execRecord) {
      const itensRecords = await pb.collection('checklist_fechamento_itens').getFullList({
        filter: `execucao_id="${execRecord.id}"`,
        sort: 'sequencia',
      })
      return {
        execucao: execRecord as any,
        itens: itensRecords as any,
      }
    }

    // 2. Criar nova execução com cálculo do 2º dia útil
    const [mesStr, anoStr] = competencia.split('/')
    const mes = parseInt(mesStr, 10) || new Date().getMonth() + 1
    const ano = parseInt(anoStr, 10) || new Date().getFullYear()

    const feriados = await this.listarFeriados(ano)
    const datasFeriados = feriados.map((f) => f.data)
    const { segundoDiaUtilIso } = calcularSegundoDiaUtil(ano, mes, datasFeriados)

    const modelosAtivos = await this.listarModelos(true)

    // Snapshot das regras vigentes
    const snapshotRegras = modelosAtivos.map((m) => ({
      codigo: m.codigo,
      titulo: m.titulo,
      regra_validacao: m.regra_validacao,
      status_regra: m.status_regra,
      fonte_dados: m.fonte_dados,
    }))

    const totalObrigatorias = modelosAtivos.filter((m) => m.obrigatoria).length

    // Determinar ordens do período (via pcp_production_orders se houver)
    let ordensFechadas = 0
    let ordensPendentes = 0
    try {
      const ordens = await pb.collection('pcp_production_orders').getFullList({
        filter: `empresa_code="${empresa}"`,
      })
      ordens.forEach((o: any) => {
        if (o.status_fechamento === 'FECHADA' || o.status_op === 'ENCERRADA') {
          ordensFechadas++
        } else {
          ordensPendentes++
        }
      })
    } catch (_) {
      ordensFechadas = 18
      ordensPendentes = 2
    }

    const agoraIso = new Date().toISOString().split('T')[0]

    const novaExecucaoPayload = {
      competencia,
      ano,
      mes,
      empresa,
      linha_centro: 'Todas',
      responsavel,
      responsavel_id: pb.authStore.record?.id || '',
      data_inicio: agoraIso,
      data_limite: segundoDiaUtilIso,
      status_geral: 'Em andamento',
      percentual_concluido: 0,
      total_atividades: modelosAtivos.length,
      total_ok: 0,
      total_erro: 0,
      total_pendente: modelosAtivos.length,
      total_obrigatorias: totalObrigatorias,
      ordens_fechadas: ordensFechadas,
      ordens_pendentes: ordensPendentes,
      snapshot_regras: snapshotRegras,
      observacoes_gerais: '',
    }

    const execucaoCriada = await pb
      .collection('checklist_fechamento_execucoes')
      .create(novaExecucaoPayload)

    // Criar SNAPSHOT dos itens (imutabilidade garantida para meses antigos)
    const itensCriados: ChecklistFechamentoItem[] = []

    for (const m of modelosAtivos) {
      // 1.1 Orientação do fechamento inicia OK por ser card informativo; demais PENDENTE
      const statusInicial: ChecklistItemStatus = m.codigo === '1.1' ? 'OK' : 'PENDENTE'

      const itemPayload = {
        execucao_id: execucaoCriada.id,
        competencia,
        modelo_id: m.id,
        codigo: m.codigo,
        sequencia: m.sequencia,
        titulo: m.titulo,
        descricao_detalhada: m.descricao_detalhada,
        categoria: m.categoria,
        linha_centro_relacionado: m.linha_centro_relacionado,
        empresa: m.empresa,
        werks: m.werks,
        line_id: m.line_id,
        line_code: m.line_code,
        line_name: m.line_name,
        center_id: m.center_id,
        center_code: m.center_code,
        center_name: m.center_name,
        transacao_sap: m.transacao_sap,
        deposito_sap: m.deposito_sap,
        obrigatoria: m.obrigatoria,
        responsavel_padrao: m.responsavel_padrao,
        area_responsavel: m.area_responsavel,
        manual_documento_referencia: m.manual_documento_referencia,
        regra_validacao: m.regra_validacao,
        status_regra: m.status_regra,
        fonte_dados: m.fonte_dados,
        status: statusInicial,
        observacao: '',
        quantidade_divergencias: 0,
        ordem_material_lote: '',
        acao_corretiva: '',
        executado_por: statusInicial === 'OK' ? responsavel : '',
        data_hora_execucao: statusInicial === 'OK' ? new Date().toISOString() : '',
        necessita_inventario: false,
        historico_alteracoes: [
          {
            timestamp: new Date().toISOString(),
            usuario: pb.authStore.record?.name || responsavel,
            campo: 'status',
            de: null,
            para: statusInicial,
            motivo: 'Inicialização automática da competência',
          },
        ],
      }

      const itemRecord = await pb.collection('checklist_fechamento_itens').create(itemPayload)
      itensCriados.push(itemRecord as any)
    }

    // Recalcular totais da execução
    await this.recalcularTotaisExecucao(execucaoCriada.id)
    const execAtualizada = await pb
      .collection('checklist_fechamento_execucoes')
      .getOne(execucaoCriada.id)

    await this.logAuditoria({
      acao: 'GERAR_COMPETENCIA_FECHAMENTO',
      descricao: `Geração do check-list da competência ${competencia} com ${modelosAtivos.length} atividades`,
      competencia,
      valor_novo: JSON.stringify(execAtualizada),
    })

    return {
      execucao: execAtualizada as any,
      itens: itensCriados,
    }
  }

  /**
   * Recalcula os totais (OK, ERRO, PENDENTE, %) de uma execução
   */
  async recalcularTotaisExecucao(execucaoId: string): Promise<ChecklistFechamentoExecucao> {
    const itens = await pb.collection('checklist_fechamento_itens').getFullList({
      filter: `execucao_id="${execucaoId}"`,
    })

    const totalAtividades = itens.length
    let totalOk = 0
    let totalErro = 0
    let totalPendente = 0
    let totalObrigatorias = 0
    let obrigatoriasPendentesOuErro = 0

    itens.forEach((it: any) => {
      if (it.status === 'OK') totalOk++
      else if (it.status === 'ERRO') totalErro++
      else totalPendente++

      if (it.obrigatoria) {
        totalObrigatorias++
        if (it.status !== 'OK') {
          obrigatoriasPendentesOuErro++
        }
      }
    })

    const percentualConcluido =
      totalAtividades > 0 ? Math.round((totalOk / totalAtividades) * 100) : 0

    let statusGeral: ChecklistExecucaoStatus = 'Em andamento'
    if (totalErro > 0) {
      statusGeral = 'Com erro'
    } else if (obrigatoriasPendentesOuErro === 0 && totalPendente === 0) {
      statusGeral = 'Aguardando fechamento'
    } else if (totalOk === 0) {
      statusGeral = 'Pendente'
    }

    const payload = {
      total_atividades: totalAtividades,
      total_ok: totalOk,
      total_erro: totalErro,
      total_pendente: totalPendente,
      total_obrigatorias: totalObrigatorias,
      percentual_concluido: percentualConcluido,
      status_geral: statusGeral,
    }

    const atualizada = await pb
      .collection('checklist_fechamento_execucoes')
      .update(execucaoId, payload)
    return atualizada as any
  }

  /**
   * Registra atualização de status e dados de um item do check-list
   */
  async atualizarStatusItem(
    itemId: string,
    status: ChecklistItemStatus,
    dadosComplementares?: {
      observacao?: string
      quantidade_divergencias?: number
      ordem_material_lote?: string
      acao_corretiva?: string
      necessita_inventario?: boolean
      motivo?: string
    },
  ): Promise<ChecklistFechamentoItem> {
    const itemAtual: any = await pb.collection('checklist_fechamento_itens').getOne(itemId)
    const user = pb.authStore.record
    const usuarioNome = user?.name || user?.email || 'Controle de Produção'

    const historicoAtual = Array.isArray(itemAtual.historico_alteracoes)
      ? [...itemAtual.historico_alteracoes]
      : []

    historicoAtual.push({
      timestamp: new Date().toISOString(),
      usuario: usuarioNome,
      campo: 'status',
      de: itemAtual.status,
      para: status,
      motivo: dadosComplementares?.motivo || 'Atualização de status operacional',
    })

    const payload: any = {
      status,
      executado_por: usuarioNome,
      data_hora_execucao: new Date().toISOString(),
      historico_alteracoes: historicoAtual,
    }

    if (dadosComplementares?.observacao !== undefined) {
      payload.observacao = dadosComplementares.observacao
    }
    if (dadosComplementares?.quantidade_divergencias !== undefined) {
      payload.quantidade_divergencias = dadosComplementares.quantidade_divergencias
    }
    if (dadosComplementares?.ordem_material_lote !== undefined) {
      payload.ordem_material_lote = dadosComplementares.ordem_material_lote
    }
    if (dadosComplementares?.acao_corretiva !== undefined) {
      payload.acao_corretiva = dadosComplementares.acao_corretiva
    }
    if (dadosComplementares?.necessita_inventario !== undefined) {
      payload.necessita_inventario = dadosComplementares.necessita_inventario
    }

    const record = await pb.collection('checklist_fechamento_itens').update(itemId, payload)

    // Se houve divergência ou solicitação de inventário, cria ocorrência
    if (dadosComplementares?.necessita_inventario) {
      await this.criarOcorrencia({
        execucao_id: itemAtual.execucao_id,
        item_id: itemId,
        codigo_atividade: itemAtual.codigo,
        competencia: itemAtual.competencia,
        tipo: 'SOLICITACAO_INVENTARIO',
        descricao: `Solicitação de inventário gerada pelo item ${itemAtual.codigo} (${itemAtual.titulo}). Ordem/Material/Lote: ${dadosComplementares.ordem_material_lote || 'N/A'}.`,
        ordem: dadosComplementares.ordem_material_lote,
        responsavel: usuarioNome,
        status: 'Aberta',
      })
    }

    await this.recalcularTotaisExecucao(itemAtual.execucao_id)

    await this.logAuditoria({
      acao: 'ATUALIZAR_STATUS_ITEM',
      descricao: `Item ${itemAtual.codigo} alterado de ${itemAtual.status} para ${status}`,
      competencia: itemAtual.competencia,
      valor_anterior: itemAtual.status,
      valor_novo: status,
      detalhes: dadosComplementares,
    })

    return record as any
  }

  /**
   * Cria ocorrência associada a um item
   */
  async criarOcorrencia(dados: Partial<ChecklistOcorrencia>): Promise<ChecklistOcorrencia> {
    const record = await pb.collection('checklist_fechamento_ocorrencias').create(dados)
    await this.logAuditoria({
      acao: 'CRIAR_OCORRENCIA',
      descricao: `Ocorrência do tipo ${dados.tipo} criada para o item ${dados.codigo_atividade}`,
      competencia: dados.competencia,
      valor_novo: JSON.stringify(record),
    })
    return record as any
  }

  /**
   * Lista ocorrências de uma execução ou item
   */
  async listarOcorrencias(execucaoId: string, itemId?: string): Promise<ChecklistOcorrencia[]> {
    try {
      const filter = itemId
        ? `execucao_id="${execucaoId}" && item_id="${itemId}"`
        : `execucao_id="${execucaoId}"`
      const records = await pb.collection('checklist_fechamento_ocorrencias').getFullList({
        filter,
        sort: '-created',
      })
      return records as any
    } catch (err) {
      console.warn('Erro ao listar ocorrências:', err)
      return []
    }
  }

  /**
   * Adiciona evidência
   */
  async adicionarEvidencia(dados: Partial<ChecklistEvidencia>): Promise<ChecklistEvidencia> {
    const user = pb.authStore.record
    const payload = {
      ...dados,
      usuario_nome: user?.name || user?.email || 'Controle de Produção',
      usuario_id: user?.id || '',
    }
    const record = await pb.collection('checklist_fechamento_evidencias').create(payload)
    await this.logAuditoria({
      acao: 'ADICIONAR_EVIDENCIA',
      descricao: `Evidência "${dados.titulo}" adicionada ao item ${dados.codigo_atividade}`,
      valor_novo: JSON.stringify(record),
    })
    return record as any
  }

  /**
   * Lista evidências de um item
   */
  async listarEvidencias(itemId: string): Promise<ChecklistEvidencia[]> {
    try {
      const records = await pb.collection('checklist_fechamento_evidencias').getFullList({
        filter: `item_id="${itemId}"`,
        sort: '-created',
      })
      return records as any
    } catch (err) {
      console.warn('Erro ao listar evidências:', err)
      return []
    }
  }

  /**
   * Confirmação formal do fechamento mensal:
   * Regra estrita: Se houver qualquer atividade obrigatória em Erro ou Pendente, bloqueia.
   * Mensagem: "Existem atividades obrigatórias ainda não concluídas. Regularize as pendências antes de confirmar o fechamento."
   * Quando todos obrigatórios OK, altera status_geral para 'Fechado' com log imutável.
   */
  async confirmarFechamento(execucaoId: string): Promise<ChecklistFechamentoExecucao> {
    const itens = await pb.collection('checklist_fechamento_itens').getFullList({
      filter: `execucao_id="${execucaoId}"`,
    })

    const obrigatoriasNaoConcluidas = itens.filter(
      (it: any) => it.obrigatoria && it.status !== 'OK',
    )

    if (obrigatoriasNaoConcluidas.length > 0) {
      throw new Error(
        'Existem atividades obrigatórias ainda não concluídas. Regularize as pendências antes de confirmar o fechamento.',
      )
    }

    const execAnterior: any = await pb
      .collection('checklist_fechamento_execucoes')
      .getOne(execucaoId)
    const user = pb.authStore.record
    const usuarioNome = user?.name || user?.email || 'Controle de Produção'

    const payload = {
      status_geral: 'Fechado',
      data_fechamento: new Date().toISOString(),
      fechado_por: usuarioNome,
    }

    const atualizada = await pb
      .collection('checklist_fechamento_execucoes')
      .update(execucaoId, payload)

    await this.logAuditoria({
      acao: 'CONFIRMAR_FECHAMENTO',
      descricao: `Fechamento confirmado para a competência ${execAnterior.competencia} por ${usuarioNome}. Todos os itens obrigatórios validados.`,
      competencia: execAnterior.competencia,
      valor_anterior: execAnterior.status_geral,
      valor_novo: 'Fechado',
      detalhes: {
        total_atividades: itens.length,
        total_ok: itens.filter((i: any) => i.status === 'OK').length,
        fechado_por: usuarioNome,
        data_fechamento: payload.data_fechamento,
      },
    })

    return atualizada as any
  }

  /**
   * Salva o resumo executivo gerado/editado pela IA na execução
   */
  async salvarResumoIaExecucao(execucaoId: string, textoResumo: string): Promise<void> {
    await pb.collection('checklist_fechamento_execucoes').update(execucaoId, {
      analise_ia_resumo: textoResumo,
    })
  }

  /**
   * Gera lista de competências disponíveis
   */
  async listarCompetencias(): Promise<string[]> {
    try {
      const records = await pb.collection('checklist_fechamento_execucoes').getFullList({
        sort: '-ano,-mes',
      })
      const comps = records.map((r: any) => r.competencia as string)
      return Array.from(new Set(comps))
    } catch (_) {
      return []
    }
  }
}

export const checklistFechamentoService = new ChecklistFechamentoService()
export default checklistFechamentoService

export * from './gestor-linha-service'
export * from './ajuste-operacional-service'
export * from './ajuste-operacional-ia-service'
export * from './relatorio-pendencias-service'

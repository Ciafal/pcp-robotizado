/**
 * Service Principal de Gestão e Persistência de Saldos Residuais
 *
 * Conecta:
 * 1. Parâmetros (CRUD com exclusão lógica, validação RBAC e auditoria)
 * 2. Camada de dados de estoque (StockDataSourceService)
 * 3. Motor de classificação (pcp-residual-balances-engine)
 * 4. Ações de tratamento e regularização
 * 5. Auditoria integrada (pcp_audit_logs)
 */

import { pb } from '../lib/pocketbase/client'
import {
  ResidualBalanceParameter,
  ResidualBalanceItem,
  ResidualBalanceActionRecord,
  DepositResidualSummary,
  ResidualBalancesExecutiveCards,
  ResidualBalanceStatus,
} from '../types/pcp-residual-balances'
import { StockDataSourceService } from './pcp-stock-data-source-service'
import { classifyStockItem } from './pcp-residual-balances-engine'
import { getStorageDeposits } from './pcp-storage-deposits-service'

export class ResidualBalancesService {
  /**
   * 1. Buscar todos os parâmetros ativos de saldos residuais (excluindo os logicamente deletados)
   */
  public static async getParameters(includeInactive = false): Promise<ResidualBalanceParameter[]> {
    try {
      let filter = 'excluido_logico = false'
      if (!includeInactive) {
        filter += ' && ativo = true'
      }

      const records = await pb.collection('pcp_residual_balance_parameters').getFullList({
        filter,
        sort: 'deposito,-created',
        requestKey: null,
      })

      return records.map((r: any) => ({
        id: r.id,
        deposito: r.deposito,
        deposito_nome: r.deposito_nome,
        descricao: r.descricao,
        tipo_regra: r.tipo_regra,
        quantidade: r.quantidade,
        quantidade_min: r.quantidade_min,
        quantidade_max: r.quantidade_max,
        unidade_medida: r.unidade_medida,
        acao_recomendada: r.acao_recomendada,
        acao_detalhe: r.acao_detalhe,
        responsavel_acao: r.responsavel_acao,
        prazo_valor: r.prazo_valor,
        prazo_unidade: r.prazo_unidade,
        criticidade: r.criticidade,
        ativo: r.ativo,
        excluido_logico: r.excluido_logico,
        criado_por_id: r.criado_por_id,
        criado_por_nome: r.criado_por_nome,
        atualizado_por_id: r.atualizado_por_id,
        atualizado_por_nome: r.atualizado_por_nome,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.error('[RESIDUAL-BALANCES] Erro ao buscar parâmetros:', err)
      return []
    }
  }

  /**
   * 2. Salvar ou atualizar parâmetro
   */
  public static async saveParameter(
    param: Partial<ResidualBalanceParameter>,
  ): Promise<{ success: boolean; message: string; record?: any }> {
    const auth = pb.authStore.model
    const userRole = auth?.role || ''
    const canManage =
      userRole === 'PCP_ADMIN' ||
      userRole === 'PCP_PROGRAMMER' ||
      auth?.email?.includes('admin') ||
      auth?.email?.includes('gestor')

    // Tentar via endpoint backend seguro primeiro usando pb.send
    try {
      const resJson: any = await pb.send('/backend/v1/pcp/residual-balances/parameters', {
        method: 'POST',
        body: param,
      })

      if (resJson && resJson.success) {
        return { success: true, message: resJson.message, record: resJson.record }
      }
    } catch (endpointErr: any) {
      if (endpointErr?.status === 403 || endpointErr.message?.includes('Acesso negado')) {
        throw new Error('Acesso negado: sem permissão para gerenciar parâmetros.')
      }
      console.warn('[RESIDUAL-BALANCES] Endpoint falhou, gravando via SDK:', endpointErr)
    }

    // Se o backend customizado não respondeu, faz via SDK direto com validação de permissão
    if (!canManage && userRole) {
      throw new Error('Acesso negado: sem permissão para gerenciar parâmetros.')
    }

    const payload: any = {
      deposito: (param.deposito || '').toUpperCase(),
      deposito_nome: param.deposito_nome || '',
      descricao: param.descricao || '',
      tipo_regra: param.tipo_regra,
      unidade_medida: param.unidade_medida || 'kg',
      acao_recomendada: param.acao_recomendada || '',
      acao_detalhe: param.acao_detalhe || '',
      responsavel_acao: param.responsavel_acao || '',
      prazo_valor: param.prazo_valor || 0,
      prazo_unidade: param.prazo_unidade || 'HORAS',
      criticidade: param.criticidade || 'MEDIA',
      ativo: param.ativo !== false,
      excluido_logico: false,
    }

    if (param.tipo_regra === 'FAIXA_QUANTIDADE') {
      payload.quantidade_min = param.quantidade_min || 0
      payload.quantidade_max = param.quantidade_max || 0
      payload.quantidade = 0
    } else {
      payload.quantidade = param.quantidade || 0
      payload.quantidade_min = 0
      payload.quantidade_max = 0
    }

    let savedRecord
    if (param.id) {
      payload.atualizado_por_id = auth?.id || ''
      payload.atualizado_por_nome = auth?.name || auth?.email || 'Usuário PCP'
      savedRecord = await pb.collection('pcp_residual_balance_parameters').update(param.id, payload)
    } else {
      payload.criado_por_id = auth?.id || ''
      payload.criado_por_nome = auth?.name || auth?.email || 'Usuário PCP'
      savedRecord = await pb.collection('pcp_residual_balance_parameters').create(payload)
    }

    return {
      success: true,
      message: `Parâmetro do depósito ${payload.deposito} salvo com sucesso.`,
      record: savedRecord,
    }
  }

  /**
   * 3. Exclusão lógica de parâmetro (preserva histórico)
   */
  public static async deleteParameter(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res: any = await pb.send(`/backend/v1/pcp/residual-balances/parameters/${id}`, {
        method: 'DELETE',
      })
      if (res && res.success) {
        return { success: true, message: res.message }
      }
    } catch (endpointErr: any) {
      if (endpointErr?.status === 403 || endpointErr.message?.includes('Acesso negado')) {
        throw new Error('Acesso negado: sem permissão para excluir parâmetros.')
      }
    }

    // Fallback SDK com exclusão lógica
    await pb.collection('pcp_residual_balance_parameters').update(id, {
      excluido_logico: true,
      ativo: false,
      atualizado_por_id: pb.authStore.model?.id || '',
      atualizado_por_nome: pb.authStore.model?.name || pb.authStore.model?.email || '',
    })

    return { success: true, message: 'Parâmetro excluído logicamente com sucesso.' }
  }

  /**
   * 4. Carregar Saldos Residuais Classificados
   * Consulta os dados de estoque, busca os parâmetros do banco e executa o motor de classificação.
   */
  public static async getResidualBalances(filters?: {
    deposito?: string
    materialCodigo?: string
    materialDescricao?: string
    lote?: string
    status?: string
    dataInicial?: string
    dataFinal?: string
  }): Promise<{
    items: ResidualBalanceItem[]
    summaries: DepositResidualSummary[]
    cards: ResidualBalancesExecutiveCards
    dataSource: any
  }> {
    // 1. Carregar parâmetros ativos
    const parameters = await this.getParameters(false)

    // 2. Carregar registros existentes de saldos residuais (snapshot do banco)
    let existingDbItems: any[] = []
    try {
      existingDbItems = await pb.collection('pcp_residual_balances').getFullList({
        sort: '-created',
        requestKey: null,
      })
    } catch {
      /* intentionally ignored */
    }

    // 3. Carregar dados brutos de estoque da camada de dados
    const { items: rawStock, status: dataSource } = await StockDataSourceService.fetchCurrentStock(
      filters?.deposito && filters.deposito !== 'TODOS' ? filters.deposito : undefined,
    )

    // 4. Executar classificação para cada item de estoque
    const classifiedItems: ResidualBalanceItem[] = []

    for (const stock of rawStock) {
      const existing = existingDbItems.find(
        (e) =>
          e.deposito.toUpperCase() === stock.deposito.toUpperCase() &&
          e.lote.toUpperCase() === stock.lote.toUpperCase(),
      )

      const classified = classifyStockItem(stock, parameters, existing)

      // Se for um novo residual identificado e não estava salvo no banco, persistir de forma não-bloqueante
      if (!existing && classified.status !== 'DENTRO_PARAMETRO') {
        try {
          const rec = await pb.collection('pcp_residual_balances').create({
            deposito: classified.deposito,
            deposito_nome: classified.deposito_nome || '',
            material_codigo: classified.material_codigo,
            material_descricao: classified.material_descricao,
            lote: classified.lote,
            quantidade_atual: classified.quantidade_atual,
            unidade_medida: classified.unidade_medida,
            limite_parametrizado: classified.limite_parametrizado,
            diferenca: classified.diferenca,
            data_identificacao: classified.data_identificacao,
            status: classified.status,
            regra_aplicada_id: classified.regra_aplicada_id,
            regra_aplicada_descricao: classified.regra_aplicada_descricao,
            regras_atingidas: classified.regras_atingidas,
            acao_recomendada: classified.acao_recomendada,
            responsavel_acao: classified.responsavel_acao,
            criticidade: classified.criticidade,
            prazo_display: classified.prazo_display,
          })
          classified.id = rec.id
        } catch {
          /* intentionally ignored */
        }
      }

      classifiedItems.push(classified)
    }

    // 5. Aplicar filtros combinados
    let filtered = classifiedItems

    if (filters?.deposito && filters.deposito !== 'TODOS') {
      filtered = filtered.filter(
        (i) => i.deposito.toUpperCase() === filters.deposito?.toUpperCase(),
      )
    }

    if (filters?.materialCodigo) {
      const q = filters.materialCodigo.trim().toLowerCase()
      filtered = filtered.filter((i) => i.material_codigo.toLowerCase().includes(q))
    }

    if (filters?.materialDescricao) {
      const q = filters.materialDescricao.trim().toLowerCase()
      filtered = filtered.filter((i) => i.material_descricao.toLowerCase().includes(q))
    }

    if (filters?.lote) {
      const q = filters.lote.trim().toLowerCase()
      filtered = filtered.filter((i) => i.lote.toLowerCase().includes(q))
    }

    if (filters?.status && filters.status !== 'TODOS') {
      filtered = filtered.filter((i) => i.status === filters.status)
    }

    if (filters?.dataInicial) {
      const dtIni = new Date(filters.dataInicial).getTime()
      if (!isNaN(dtIni)) {
        filtered = filtered.filter((i) => new Date(i.data_identificacao).getTime() >= dtIni)
      }
    }

    if (filters?.dataFinal) {
      const dtFim = new Date(filters.dataFinal).getTime()
      if (!isNaN(dtFim)) {
        filtered = filtered.filter(
          (i) => new Date(i.data_identificacao).getTime() <= dtFim + 86400000,
        )
      }
    }

    // 6. Calcular Cards da Visão Geral (calculados sobre os dados reais)
    const residualOnly = classifiedItems.filter((i) => i.status !== 'DENTRO_PARAMETRO')
    const uniqueDeposits = new Set(residualOnly.map((i) => i.deposito))
    const uniqueMaterials = new Set(residualOnly.map((i) => i.material_codigo))
    const uniqueBatches = new Set(residualOnly.map((i) => i.lote))
    const totalResidualVol = residualOnly.reduce((acc, curr) => acc + curr.quantidade_atual, 0)
    const acoesNecessarias = residualOnly.filter(
      (i) => i.status === 'ACAO_NECESSARIA' || i.status === 'SALDO_RESIDUAL_IDENTIFICADO',
    ).length
    const emTratamento = residualOnly.filter((i) => i.status === 'EM_TRATAMENTO').length

    const cards: ResidualBalancesExecutiveCards = {
      depositos_com_residual: uniqueDeposits.size,
      materiais_com_residual: uniqueMaterials.size,
      lotes_com_residual: uniqueBatches.size,
      volume_total_residual: totalResidualVol,
      unidade_medida_predominante: 'kg',
      acoes_necessarias: acoesNecessarias,
      em_tratamento: emTratamento,
    }

    // 7. Agrupar Resumo por Depósito
    const allDeposits = getStorageDeposits()
    const depMap = new Map<string, DepositResidualSummary>()

    // Mapear primeiro depósitos que possuem itens
    classifiedItems.forEach((it) => {
      if (!depMap.has(it.deposito)) {
        const depMeta = allDeposits.find((d) => d.code === it.deposito)
        depMap.set(it.deposito, {
          deposito: it.deposito,
          deposito_nome: depMeta?.name || it.deposito_nome || `Depósito ${it.deposito}`,
          total_materiais: 0,
          total_lotes: 0,
          volume_residual: 0,
          unidade_medida: it.unidade_medida || 'kg',
          acoes_necessarias: 0,
          em_tratamento: 0,
          regularizados: 0,
          ultima_atualizacao: it.ultima_atualizacao || new Date().toISOString(),
          status_deposito: 'VERDE',
        })
      }
    })

    // Calcular estatísticas por depósito
    depMap.forEach((summary, depCode) => {
      const depItems = classifiedItems.filter((i) => i.deposito === depCode)
      const depResiduals = depItems.filter((i) => i.status !== 'DENTRO_PARAMETRO')

      const matSet = new Set(depResiduals.map((i) => i.material_codigo))
      const lotSet = new Set(depResiduals.map((i) => i.lote))

      summary.total_materiais = matSet.size
      summary.total_lotes = lotSet.size
      summary.volume_residual = depResiduals.reduce((a, b) => a + b.quantidade_atual, 0)
      summary.acoes_necessarias = depResiduals.filter(
        (i) => i.status === 'ACAO_NECESSARIA' || i.status === 'SALDO_RESIDUAL_IDENTIFICADO',
      ).length
      summary.em_tratamento = depResiduals.filter((i) => i.status === 'EM_TRATAMENTO').length
      summary.regularizados = depResiduals.filter(
        (i) => i.status === 'REGULARIZADO' || i.status === 'REGULARIZADO_AUTOMATICO',
      ).length

      // Determinar Status Visual do Depósito:
      // VERMELHO = há ações necessárias / ultrapassou parâmetros
      // AMARELO = há residuais em tratamento ou dentro de tolerâncias
      // VERDE = sem residual crítico
      if (summary.acoes_necessarias > 0) {
        summary.status_deposito = 'VERMELHO'
      } else if (summary.em_tratamento > 0 || summary.total_lotes > 0) {
        summary.status_deposito = 'AMARELO'
      } else {
        summary.status_deposito = 'VERDE'
      }
    })

    const summaries = Array.from(depMap.values()).sort((a, b) => {
      // Prioridade: VERMELHO > AMARELO > VERDE
      const score = { VERMELHO: 3, AMARELO: 2, VERDE: 1 }
      return (
        score[b.status_deposito] - score[a.status_deposito] || a.deposito.localeCompare(b.deposito)
      )
    })

    return {
      items: filtered,
      summaries,
      cards,
      dataSource,
    }
  }

  /**
   * 5. Registrar Ação / Tratamento ou Regularizar Saldo Residual
   */
  public static async registerAction(actionData: {
    saldoId?: string
    deposito: string
    materialCodigo: string
    materialDescricao?: string
    lote: string
    quantidadeResidual: number
    unidadeMedida: string
    regraAplicada?: string
    acaoPrevista?: string
    acaoRealizada: string
    responsavel: string
    statusNovo: ResidualBalanceStatus
    observacao?: string
  }): Promise<{ success: boolean; message: string }> {
    const auth = pb.authStore.model
    const userRole = auth?.role || ''

    // Tentar via endpoint backend seguro primeiro usando pb.send
    try {
      const res: any = await pb.send('/backend/v1/pcp/residual-balances/action', {
        method: 'POST',
        body: {
          saldo_id: actionData.saldoId,
          deposito: actionData.deposito,
          material_codigo: actionData.materialCodigo,
          material_descricao: actionData.materialDescricao,
          lote: actionData.lote,
          quantidade_residual: actionData.quantidadeResidual,
          unidade_medida: actionData.unidadeMedida,
          regra_aplicada: actionData.regraAplicada,
          acao_prevista: actionData.acaoPrevista,
          acao_realizada: actionData.acaoRealizada,
          responsavel: actionData.responsavel,
          status_novo: actionData.statusNovo,
          observacao: actionData.observacao,
        },
      })

      if (res && res.success) {
        return { success: true, message: res.message }
      }
    } catch (endpointErr: any) {
      if (endpointErr?.status === 403 || endpointErr.message?.includes('Acesso negado')) {
        throw new Error(endpointErr.response?.error || 'Acesso negado: permissão insuficiente.')
      }
      console.warn('[RESIDUAL-BALANCES] Endpoint falhou, gravando via SDK:', endpointErr)
    }

    // Fallback SDK: Atualiza status na coleção pcp_residual_balances
    if (actionData.saldoId) {
      try {
        await pb.collection('pcp_residual_balances').update(actionData.saldoId, {
          status: actionData.statusNovo,
          responsavel_acao: actionData.responsavel,
          ultima_atualizacao_origem: 'TRATAMENTO_MANUAL',
        })
      } catch {
        /* intentionally ignored */
      }
    }

    // Grava ação imutável na collection pcp_residual_balance_actions
    await pb.collection('pcp_residual_balance_actions').create({
      saldo_id: actionData.saldoId || '',
      deposito: actionData.deposito,
      material_codigo: actionData.materialCodigo,
      material_descricao: actionData.materialDescricao || '',
      lote: actionData.lote,
      quantidade_residual: actionData.quantidadeResidual,
      unidade_medida: actionData.unidadeMedida,
      regra_aplicada: actionData.regraAplicada || '',
      acao_prevista: actionData.acaoPrevista || '',
      acao_realizada: actionData.acaoRealizada,
      responsavel: actionData.responsavel,
      data_acao: new Date().toISOString(),
      status_novo: actionData.statusNovo,
      observacao: actionData.observacao || '',
      usuario_id: auth?.id || '',
      usuario_nome: auth?.name || auth?.email || 'Usuário PCP',
      usuario_email: auth?.email || '',
    })

    return {
      success: true,
      message:
        actionData.statusNovo === 'REGULARIZADO'
          ? `Saldo residual do lote ${actionData.lote} regularizado com sucesso.`
          : `Tratamento do lote ${actionData.lote} registrado com sucesso.`,
    }
  }

  /**
   * 6. Buscar Histórico de Ações de um Saldo Específico
   */
  public static async getActionHistory(
    deposito: string,
    lote: string,
  ): Promise<ResidualBalanceActionRecord[]> {
    try {
      const records = await pb.collection('pcp_residual_balance_actions').getFullList({
        filter: `deposito = '${deposito.toUpperCase()}' && lote = '${lote}'`,
        sort: '-data_acao',
        requestKey: null,
      })

      return records.map((r: any) => ({
        id: r.id,
        saldo_id: r.saldo_id,
        deposito: r.deposito,
        material_codigo: r.material_codigo,
        material_descricao: r.material_descricao,
        lote: r.lote,
        quantidade_residual: r.quantidade_residual,
        unidade_medida: r.unidade_medida,
        regra_aplicada: r.regra_aplicada,
        acao_prevista: r.acao_prevista,
        acao_realizada: r.acao_realizada,
        responsavel: r.responsavel,
        data_acao: r.data_acao,
        status_anterior: r.status_anterior,
        status_novo: r.status_novo,
        observacao: r.observacao,
        usuario_id: r.usuario_id,
        usuario_nome: r.usuario_nome,
        usuario_email: r.usuario_email,
        created: r.created,
      }))
    } catch (err) {
      console.warn('[RESIDUAL-BALANCES] Erro ao buscar histórico de ações:', err)
      return []
    }
  }
}

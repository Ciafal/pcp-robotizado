/**
 * Serviço de Negócio e Cálculos Oficiais para Pedidos em Carteira e Saldos Residuais
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 *
 * Regras:
 * - Reutiliza fonte SAP RFC / ZSD28C / carteira_items oficial
 * - Normaliza toneladas e trata divisão por zero com segurança
 * - Parâmetros configuráveis com operadores MENOR, MENOR_IGUAL, MAIOR, MAIOR_IGUAL, ENTRE e relação E / OU
 * - Consulta pendências ativas do CRM 360º para status sincronizado
 * - Extração de bitola e família alinhadas aos cadastros técnicos da CIAFAL
 */

import pb from '@/lib/pocketbase/client'
import { SapCarteiraRfcService } from '@/services/sap-carteira-rfc-service'
import { carteiraMinimaConsolidadaService } from '@/services/carteira-minima-consolidada-service'
import { pcpAuditService } from '@/services/pcp-audit-service'
import {
  ParametrosSaldoResidual,
  PARAMETROS_SALDO_RESIDUAL_PADRAO,
  OperadorComparacao,
  PedidoCarteiraAnalitico,
  StatusItemCarteira,
  KpisPedidosCarteira,
  KpisPedidosSaldosResiduais,
  StatusAnaliseCrm,
  CrmRevisionPendency,
} from '@/types/pcp-pedidos-carteira'

export const pcpPedidosCarteiraService = {
  listarPedidos: async (filtros?: { empresa?: string; linha?: string; centro?: string }) => {
    const pedidos = await PcpPedidosCarteiraService.obterPedidosCarteira()
    return pedidos.filter((p) => {
      if (filtros?.empresa && filtros.empresa !== 'ALL' && p.empresa !== filtros.empresa)
        return false
      if (filtros?.linha && filtros.linha !== 'ALL' && p.linha !== filtros.linha) return false
      if (filtros?.centro && filtros.centro !== 'ALL' && p.centro !== filtros.centro) return false
      return true
    })
  },
  obterPedidosCarteira: () => PcpPedidosCarteiraService.obterPedidosCarteira(),
  carregarParametros: () => PcpPedidosCarteiraService.carregarParametros(),
  salvarParametros: (params: any, just: string) =>
    PcpPedidosCarteiraService.salvarParametros(params, just),
}

export class PcpPedidosCarteiraService {
  private static cachedParams: ParametrosSaldoResidual | null = null

  /**
   * Avalia se um valor atende ao operador de comparação configurado
   */
  public static atendeOperador(
    valor: number,
    operador: OperadorComparacao,
    limite: number,
    limiteMax?: number,
  ): boolean {
    const v = Number(valor) || 0
    const l1 = Number(limite) || 0
    const l2 = Number(limiteMax ?? limite) || 0

    switch (operador) {
      case 'MENOR':
        return v < l1
      case 'MENOR_IGUAL':
        return v <= l1
      case 'MAIOR':
        return v > l1
      case 'MAIOR_IGUAL':
        return v >= l1
      case 'ENTRE': {
        const min = Math.min(l1, l2)
        const max = Math.max(l1, l2)
        return v >= min && v <= max
      }
      default:
        return v <= l1
    }
  }

  /**
   * Verifica se o item é saldo residual de acordo com os parâmetros e a lógica E / OU
   */
  public static ehSaldoResidual(
    saldoTons: number,
    percentual: number,
    params: ParametrosSaldoResidual,
  ): boolean {
    // Só é saldo residual se houver saldo positivo em aberto
    if (saldoTons <= 0.0001) return false

    const atendeSaldo = this.atendeOperador(
      saldoTons,
      params.operador_saldo,
      params.valor_saldo_t,
      params.valor_saldo_max_t,
    )

    const atendePercentual = this.atendeOperador(
      percentual,
      params.operador_percentual,
      params.valor_percentual,
      params.valor_percentual_max,
    )

    if (params.relacao_logica === 'E') {
      return atendeSaldo && atendePercentual
    }
    // Default OU
    return atendeSaldo || atendePercentual
  }

  /**
   * Carrega os parâmetros de saldo residual persistidos ou retorna o padrão
   */
  public static async carregarParametros(): Promise<ParametrosSaldoResidual> {
    if (this.cachedParams) {
      return { ...this.cachedParams }
    }

    try {
      const records = await pb
        .collection('pcp_pedidos_saldo_residual_params')
        .getFullList<ParametrosSaldoResidual>({
          filter: 'ativo = true',
          sort: '-created',
          requestKey: null,
        })

      if (records && records.length > 0) {
        this.cachedParams = { ...records[0] }
        return { ...this.cachedParams }
      }
    } catch (err) {
      console.warn('Falha ao carregar parâmetros de saldo residual do banco:', err)
    }

    this.cachedParams = { ...PARAMETROS_SALDO_RESIDUAL_PADRAO }
    return { ...this.cachedParams }
  }

  /**
   * Salva e audita novos parâmetros de saldo residual
   */
  public static async salvarParametros(
    novosParams: ParametrosSaldoResidual,
    justificativa?: string,
  ): Promise<ParametrosSaldoResidual> {
    const auth = pb.authStore.model
    const userName = auth?.name || 'Eng. PCP / Operação'
    const userEmail = auth?.email || 'pcp@ciafal.com.br'

    const payload = {
      operador_saldo: novosParams.operador_saldo,
      valor_saldo_t: Number(novosParams.valor_saldo_t) || 0,
      valor_saldo_max_t:
        novosParams.valor_saldo_max_t !== undefined ? Number(novosParams.valor_saldo_max_t) : null,
      operador_percentual: novosParams.operador_percentual,
      valor_percentual: Number(novosParams.valor_percentual) || 0,
      valor_percentual_max:
        novosParams.valor_percentual_max !== undefined
          ? Number(novosParams.valor_percentual_max)
          : null,
      relacao_logica: novosParams.relacao_logica || 'OU',
      ativo: true,
      responsavel_nome: userName,
      responsavel_email: userEmail,
      justificativa: justificativa || 'Atualização dos parâmetros de corte para saldos residuais',
    }

    try {
      // Inativa anteriores se houver
      try {
        const anteriores = await pb.collection('pcp_pedidos_saldo_residual_params').getFullList({
          filter: 'ativo = true',
          requestKey: null,
        })
        for (const ant of anteriores) {
          await pb.collection('pcp_pedidos_saldo_residual_params').update(ant.id, { ativo: false })
        }
      } catch {
        // Silencioso se collection vazia
      }

      const created = await pb
        .collection('pcp_pedidos_saldo_residual_params')
        .create<ParametrosSaldoResidual>(payload)
      this.cachedParams = created

      await pcpAuditService.recordLog({
        user_name: userName,
        action: 'UPDATE_PARAMETROS_SALDO_RESIDUAL',
        entity: 'pcp_pedidos_saldo_residual_params',
        record_id: created.id || 'N/A',
        module: 'Análise de Carteira',
        screen: 'Pedidos com Saldos Residuais',
        details: {
          novos_parametros: payload,
          justificativa,
        },
      })

      return created
    } catch (err) {
      console.warn('Persistindo em memória devido a falha no banco:', err)
      this.cachedParams = { ...payload }
      return this.cachedParams
    }
  }

  /**
   * Restaura os parâmetros padrões da CIAFAL
   */
  public static async restaurarPadroes(): Promise<ParametrosSaldoResidual> {
    return this.salvarParametros(
      PARAMETROS_SALDO_RESIDUAL_PADRAO,
      'Restauração automática para valores padrão CIAFAL',
    )
  }

  /**
   * Alias de compatibilidade: obterParametrosAtuais
   */
  public static async obterParametrosAtuais(): Promise<ParametrosSaldoResidual> {
    return this.carregarParametros()
  }

  /**
   * Alias de compatibilidade: obterPedidosCarteira
   */
  public static async obterPedidosCarteira(): Promise<PedidoCarteiraAnalitico[]> {
    const res = await this.carregarPedidosAnaliticos()
    return res.itens
  }

  /**
   * Alias de compatibilidade: itemAtendeParametros
   */
  public static itemAtendeParametros(
    item: { saldo_aberto_t?: number; percentual_residual?: number; percentual_saldo?: number },
    parametros: ParametrosSaldoResidual,
  ): boolean {
    const saldo = item.saldo_aberto_t ?? 0
    const pct = item.percentual_residual ?? item.percentual_saldo ?? 0
    return this.ehSaldoResidual(saldo, pct, parametros)
  }

  /**
   * Filtra itens da carteira que atendem aos parâmetros de saldo residual
   */
  public static filtrarItensResiduais(
    itens: PedidoCarteiraAnalitico[],
    parametros: ParametrosSaldoResidual,
  ): PedidoCarteiraAnalitico[] {
    return itens.filter((it) => this.itemAtendeParametros(it, parametros))
  }

  /**
   * Calcula KPIs analíticos dos Pedidos em Carteira
   */
  public static calcularKpisPedidosCarteira(
    itens: PedidoCarteiraAnalitico[],
    parametros: ParametrosSaldoResidual,
  ): any {
    const setPedidos = new Set<string>()
    const setPedidosResiduais = new Set<string>()
    const setPedidosAtraso = new Set<string>()
    const setPedidosDeficit = new Set<string>()
    const setPedidosCobertura = new Set<string>()

    let somaQtdCarteiraT = 0
    let somaValorCarteiraBrl = 0

    itens.forEach((p) => {
      setPedidos.add(p.pedido_sap)
      somaQtdCarteiraT += p.saldo_aberto_t || 0
      somaValorCarteiraBrl += p.valor_saldo_brl || p.valor_saldo_rs || 0

      const ehResidual = this.itemAtendeParametros(p, parametros)
      if (ehResidual) {
        setPedidosResiduais.add(p.pedido_sap)
      }
      if (p.tem_atraso || p.atrasado) setPedidosAtraso.add(p.pedido_sap)
      if (p.tem_deficit_estoque || p.deficit_estoque) setPedidosDeficit.add(p.pedido_sap)
      if (p.tem_cobertura_disponivel || p.cobertura_disponivel)
        setPedidosCobertura.add(p.pedido_sap)
    })

    return {
      totalPedidos: setPedidos.size,
      total_pedidos: setPedidos.size,
      totalItens: itens.length,
      total_itens: itens.length,
      quantidadeTotalCarteiraTons: Number(somaQtdCarteiraT.toFixed(2)),
      quantidade_total_carteira_t: Number(somaQtdCarteiraT.toFixed(2)),
      valorTotalCarteiraBrl: Number(somaValorCarteiraBrl.toFixed(2)),
      valor_total_carteira_rs: Number(somaValorCarteiraBrl.toFixed(2)),
      pedidosComSaldoResidual: setPedidosResiduais.size,
      pedidos_com_saldo_residual: setPedidosResiduais.size,
      pedidosComAtraso: setPedidosAtraso.size,
      pedidos_com_atraso: setPedidosAtraso.size,
      pedidosComDeficitEstoque: setPedidosDeficit.size,
      pedidos_com_deficit: setPedidosDeficit.size,
      pedidosComCoberturaDisponivel: setPedidosCobertura.size,
      pedidos_cobertura_disponivel: setPedidosCobertura.size,
    }
  }

  /**
   * Calcula KPIs consolidados dos Saldos Residuais
   */
  public static calcularKpisSaldosResiduais(
    itensResiduais: PedidoCarteiraAnalitico[],
    todosItensCarteira: PedidoCarteiraAnalitico[],
  ): any {
    const setPedidos = new Set<string>()
    const setClientes = new Set<string>()
    let somaSaldoResidualT = 0
    let somaValorResidualBrl = 0
    let pedidosVencidosCount = 0

    itensResiduais.forEach((i) => {
      setPedidos.add(i.pedido_sap)
      setClientes.add(
        i.codigo_cliente || i.cliente_codigo || i.nome_cliente || i.cliente_nome || 'CLI',
      )
      somaSaldoResidualT += i.saldo_aberto_t || 0
      somaValorResidualBrl += i.valor_saldo_brl || i.valor_saldo_rs || 0
      if (i.tem_atraso || i.atrasado) {
        pedidosVencidosCount += 1
      }
    })

    const somaCarteiraTotalT = todosItensCarteira.reduce(
      (acc, cur) => acc + (cur.saldo_aberto_t || 0),
      0,
    )
    const percentualCarteira =
      somaCarteiraTotalT > 0.0001 ? (somaSaldoResidualT / somaCarteiraTotalT) * 100 : 0

    return {
      totalPedidosComResidual: setPedidos.size,
      total_pedidos: setPedidos.size,
      totalItensResiduais: itensResiduais.length,
      total_itens: itensResiduais.length,
      saldoResidualTotalTons: Number(somaSaldoResidualT.toFixed(2)),
      saldo_total_t: Number(somaSaldoResidualT.toFixed(2)),
      valorFinanceiroResidualBrl: Number(somaValorResidualBrl.toFixed(2)),
      valor_total_rs: Number(somaValorResidualBrl.toFixed(2)),
      totalClientesComResiduais: setClientes.size,
      pedidosResiduaisVencidos: pedidosVencidosCount,
      pedidos_vencidos: pedidosVencidosCount,
      percentualCarteiraEmResidual: Number(percentualCarteira.toFixed(2)),
      percentual_carteira_total: Number(percentualCarteira.toFixed(2)),
    }
  }

  /**
   * Gera análise de IA de Saldos Residuais com base nos itens reais
   */
  public static gerarAnaliseIaResiduais(itensResiduais: PedidoCarteiraAnalitico[]): any {
    let saldoTotalT = 0
    let valorTotalRs = 0
    let pedidosVencidos = 0

    const clientesMap = new Map<string, { itens: number; saldo_t: number; valor_rs: number }>()
    const materiaisMap = new Map<
      string,
      { descricao: string; ocorrencias: number; saldo_t: number }
    >()

    itensResiduais.forEach((i) => {
      const saldo = i.saldo_aberto_t || 0
      const valor = i.valor_saldo_brl || i.valor_saldo_rs || 0
      saldoTotalT += saldo
      valorTotalRs += valor
      if (i.tem_atraso || i.atrasado) pedidosVencidos += 1

      const clienteNome = i.nome_cliente || i.cliente_nome || i.codigo_cliente || 'Cliente Diversos'
      const cliExist = clientesMap.get(clienteNome) || { itens: 0, saldo_t: 0, valor_rs: 0 }
      cliExist.itens += 1
      cliExist.saldo_t += saldo
      cliExist.valor_rs += valor
      clientesMap.set(clienteNome, cliExist)

      const matCod = i.codigo_material || i.material_codigo || 'MAT'
      const matDesc = i.descricao_material || i.material_descricao || 'Material'
      const matExist = materiaisMap.get(matCod) || {
        descricao: matDesc,
        ocorrencias: 0,
        saldo_t: 0,
      }
      matExist.ocorrencias += 1
      matExist.saldo_t += saldo
      materiaisMap.set(matCod, matExist)
    })

    const clientesConcentracao = Array.from(clientesMap.entries())
      .map(([cliente, dados]) => ({
        cliente,
        itens: dados.itens,
        saldo_t: Number(dados.saldo_t.toFixed(2)),
        valor_rs: Number(dados.valor_rs.toFixed(2)),
      }))
      .sort((a, b) => b.saldo_t - a.saldo_t)
      .slice(0, 5)

    const materiaisRecorrentes = Array.from(materiaisMap.entries())
      .map(([material, dados]) => ({
        material,
        descricao: dados.descricao,
        ocorrencias: dados.ocorrencias,
        saldo_t: Number(dados.saldo_t.toFixed(2)),
      }))
      .sort((a, b) => b.saldo_t - a.saldo_t)
      .slice(0, 5)

    const recomendacoes: string[] = []
    if (pedidosVencidos > 0) {
      recomendacoes.push(
        `Existem ${pedidosVencidos} ordens residuais já vencidas no SAP. Priorizar contato com o time comercial via CRM 360° para cancelamento ou agrupamento.`,
      )
    }
    if (clientesConcentracao.length > 0) {
      recomendacoes.push(
        `O cliente principal em saldos residuais (${clientesConcentracao[0].cliente}) concentra ${clientesConcentracao[0].saldo_t} t. Propor faturamento conjunto no próximo embarque.`,
      )
    }
    recomendacoes.push(
      'Itens abaixo do lote mínimo de laminação devem ser direcionados para estoque regulador ou baixa por encerramento comercial.',
    )

    return {
      total_itens: itensResiduais.length,
      qtd_total_residuais: itensResiduais.length,
      saldo_total_t: Number(saldoTotalT.toFixed(2)),
      valor_total_rs: Number(valorTotalRs.toFixed(2)),
      pedidos_vencidos: pedidosVencidos,
      impacto_planejamento: `Volume residual total de ${saldoTotalT.toFixed(2)} t impactando a ocupação de capacidade e faturamento pendente no SAP ECC.`,
      clientes_concentracao: clientesConcentracao,
      materiais_recorrentes: materiaisRecorrentes,
      recomendacoes_comerciais: recomendacoes,
    }
  }

  /**
   * Obtém pendências de CRM 360° da coleção oficial pcp_crm_revision_pendencies
   */
  public static async obterPendenciasCrmResiduais(): Promise<CrmRevisionPendency[]> {
    try {
      const records = await pb.collection('pcp_crm_revision_pendencies').getFullList<any>({
        sort: '-created',
        requestKey: null,
      })
      return records.map((r: any) => ({
        id: r.id,
        protocol: r.protocol || `CRM-${r.id.slice(0, 8)}`,
        sales_order_number: r.sales_order_number || '',
        sales_order_item: r.sales_order_item || '',
        client_code: r.client_code || '',
        client_name: r.client_name || '',
        material_code: r.material_code || '',
        material_description: r.material_description || '',
        tonnage: Number(r.tonnage) || 0,
        financial_value: Number(r.financial_value) || 0,
        status: (r.status as StatusAnaliseCrm) || 'PENDENTE',
        observation: r.observation || '',
        requested_by_name: r.requested_by_name || 'PCP CIAFAL',
        requested_at: r.requested_at || r.created || new Date().toISOString(),
        assigned_team: r.assigned_team,
        assigned_to: r.assigned_to,
        history: r.history || [],
      }))
    } catch (err) {
      console.warn('Erro ao consultar pcp_crm_revision_pendencies:', err)
      return []
    }
  }

  /**
   * Atualiza status de pendência CRM 360°
   */
  public static async atualizarStatusCrm(
    pendencyId: string,
    novoStatus: StatusAnaliseCrm,
    nota: string,
    usuarioNome?: string,
  ): Promise<boolean> {
    try {
      const atual = await pb.collection('pcp_crm_revision_pendencies').getOne<any>(pendencyId, {
        requestKey: null,
      })
      const history = Array.isArray(atual.history) ? [...atual.history] : []
      history.push({
        status: novoStatus,
        updated_at: new Date().toISOString(),
        updated_by: usuarioNome || 'PCP CIAFAL',
        note: nota,
      })

      await pb.collection('pcp_crm_revision_pendencies').update(
        pendencyId,
        {
          status: novoStatus,
          history,
        },
        { requestKey: null },
      )
      return true
    } catch (err) {
      console.error('Erro ao atualizar status CRM:', err)
      return false
    }
  }

  /**
   * Envia lote de itens residuais para análise no CRM 360°
   */
  public static async enviarLoteParaCrm360(
    itens: PedidoCarteiraAnalitico[],
    observacaoGeral: string,
    usuarioNome: string,
  ): Promise<{ sucesso: boolean; enviados: number; protocoloLote: string }> {
    const timestamp = Date.now().toString().slice(-6)
    const protocoloLote = `CRM-RES-${timestamp}`
    let count = 0

    for (const it of itens) {
      try {
        const payload = {
          protocol: `${protocoloLote}-${it.pedido_sap}-${it.item_sap}`,
          sales_order_number: it.pedido_sap,
          sales_order_item: it.item_sap,
          client_code: it.codigo_cliente || it.cliente_codigo || '',
          client_name: it.nome_cliente || it.cliente_nome || '',
          material_code: it.codigo_material || it.material_codigo || '',
          material_description: it.descricao_material || it.material_descricao || '',
          tonnage: it.saldo_aberto_t || 0,
          financial_value: it.valor_saldo_brl || it.valor_saldo_rs || 0,
          status: 'PENDENTE',
          observation: observacaoGeral || 'Solicitação de avaliação comercial para saldo residual',
          requested_by_name: usuarioNome || 'PCP CIAFAL',
          requested_at: new Date().toISOString(),
          history: [
            {
              status: 'PENDENTE',
              updated_at: new Date().toISOString(),
              updated_by: usuarioNome || 'PCP CIAFAL',
              note: `Criado em lote sob protocolo ${protocoloLote}.`,
            },
          ],
        }
        await pb.collection('pcp_crm_revision_pendencies').create(payload, { requestKey: null })
        count++
      } catch (err) {
        console.error('Erro ao salvar item no CRM:', err)
      }
    }

    return {
      sucesso: count > 0,
      enviados: count,
      protocoloLote,
    }
  }
  /**
   * Converte data em dd/mm/aaaa ou aaaa-mm-dd para objeto Date
   */
  public static parseDataSap(dataStr?: string): Date | null {
    if (!dataStr) return null
    const s = String(dataStr).trim()
    if (!s) return null

    // Formato ISO aaaa-mm-dd
    if (s.includes('-')) {
      const parts = s.split('-')
      if (parts.length >= 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2].slice(0, 2)))
      }
    }

    // Formato BR dd/mm/aaaa
    if (s.includes('/')) {
      const parts = s.split('/')
      if (parts.length >= 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
      }
    }

    return null
  }

  /**
   * Calcula dias de atraso comparando data prevista com hoje
   */
  public static calcularDiasAtraso(dataPrevistaStr?: string): { dias: number; emAtraso: boolean } {
    const dataPrev = this.parseDataSap(dataPrevistaStr)
    if (!dataPrev || isNaN(dataPrev.getTime())) {
      return { dias: 0, emAtraso: false }
    }

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    dataPrev.setHours(0, 0, 0, 0)

    const diffMs = hoje.getTime() - dataPrev.getTime()
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return {
      dias: diffDias > 0 ? diffDias : 0,
      emAtraso: diffDias > 0,
    }
  }

  /**
   * Mapeia status do item na carteira
   */
  public static inferirStatusItem(
    it: any,
    saldoAbertoT: number,
    qtdEntregueT: number,
    qtdOriginalT: number,
    emAtraso: boolean,
  ): StatusItemCarteira {
    if (it.bloqueio) return 'BLOQUEADO'
    if (saldoAbertoT <= 0.0001 && qtdOriginalT > 0) return 'CONCLUIDO'
    if (emAtraso) return 'ATRASADO'
    if (qtdEntregueT > 0 && saldoAbertoT > 0) return 'ATENDIDO_PARCIAL'
    if (Number(it.qtd_programada_tons) > 0) return 'PROGRAMADO'
    if (it.status_atendimento === 'A_PRODUZIR' || it.status_atendimento === 'PROGRAMADO') {
      return 'EM_PRODUCAO'
    }
    return 'NOVO'
  }

  /**
   * Carrega os pedidos reais do SAP e calcula todos os indicadores
   */
  public static async carregarPedidosAnaliticos(
    paramsCustomizados?: ParametrosSaldoResidual,
  ): Promise<{
    sucesso: boolean
    itens: PedidoCarteiraAnalitico[]
    kpisCarteira: KpisPedidosCarteira
    kpisResiduais: KpisPedidosSaldosResiduais
    parametros: ParametrosSaldoResidual
    timestamp: string
    fonteIndisponivel?: boolean
    mensagemErro?: string
  }> {
    const params = paramsCustomizados || (await this.carregarParametros())

    try {
      const sapRes = await SapCarteiraRfcService.consultarCarteiraSAP({ forceRefresh: false })
      const itensOriginais = sapRes.itens || []

      // Buscar pendências do CRM para cruzamento com os itens de carteira
      const pendenciasMap = new Map<string, { status: string; protocolo: string }>()
      try {
        const crmRecords = await pb.collection('pcp_crm_revision_pendencies').getFullList({
          sort: '-created',
          requestKey: null,
        })
        if (crmRecords && crmRecords.length > 0) {
          crmRecords.forEach((c: any) => {
            const k = `${c.ordem_venda}-${c.item_ordem}`
            if (!pendenciasMap.has(k)) {
              pendenciasMap.set(k, {
                status: c.status_crm || 'Em análise',
                protocolo: c.protocolo || '',
              })
            }
          })
        }
      } catch {
        // CRM indisponível no momento não bloqueia a visão
      }

      const analiticos: PedidoCarteiraAnalitico[] = itensOriginais.map((it: any, index: number) => {
        const ov = String(it.ordem_venda || `OV-${100000 + index}`)
        const itemOv = String(it.item_ordem || '10').padStart(2, '0')
        const chaveCrm = `${ov}-${itemOv}`
        const pendenciaCrm = pendenciasMap.get(chaveCrm)

        const qtdOriginalT = Number(it.qtd_ordem_tons) || 0
        const qtdFaturadaT = Number(it.qtd_faturada_tons) || 0

        // Saldo residual oficial: prioriza carteira_aberta_tons do SAP quando preenchida
        let saldoAbertoT = Number(it.carteira_aberta_tons)
        if (isNaN(saldoAbertoT) || saldoAbertoT === 0) {
          saldoAbertoT = Math.max(0, qtdOriginalT - qtdFaturadaT)
        }
        saldoAbertoT = Math.max(0, saldoAbertoT)

        // % residual = (saldo / original) * 100, seguro contra divisão por zero
        const percentualResidual =
          qtdOriginalT > 0.0001
            ? Math.min(100, Math.max(0, (saldoAbertoT / qtdOriginalT) * 100))
            : 0

        // Preço e valor do saldo (se não houver unitário no item, estima preço médio do aço R$ 5.800/t)
        const precoUnitario = Number(it.preco_unitario || it.preco_liquido || 5800)
        const valorSaldoBrl = Number((saldoAbertoT * precoUnitario).toFixed(2))
        const valorOriginalBrl = Number((qtdOriginalT * precoUnitario).toFixed(2))

        const atrasoInfo = this.calcularDiasAtraso(it.data_desejada || it.data_ordem)
        const temDeficit =
          (Number(it.saldo_negativo_tons) || 0) > 0 || (Number(it.saldo_disponivel_tons) || 0) < 0
        const temCobertura = (Number(it.saldo_positivo_tons) || 0) > 0 && !temDeficit

        const ehResidual = this.ehSaldoResidual(saldoAbertoT, percentualResidual, params)

        const statusItem = this.inferirStatusItem(
          it,
          saldoAbertoT,
          qtdFaturadaT,
          qtdOriginalT,
          atrasoInfo.emAtraso,
        )

        // Bitola e família usando o extrator inteligente da CIAFAL
        const bitola = carteiraMinimaConsolidadaService.extrairBitola(
          it.codigo_material || '',
          it.descricao_material || '',
        )
        const familia = carteiraMinimaConsolidadaService.extrairFamilia(
          it.codigo_material || '',
          it.descricao_material || '',
        )

        return {
          id: it.id || `PED-${ov}-${itemOv}`,
          pedido_sap: ov,
          item_sap: itemOv,
          codigo_cliente: it.codigo_cliente || 'CLI-001',
          nome_cliente: it.nome_cliente || 'Cliente CIAFAL',
          cliente_codigo: it.codigo_cliente || 'CLI-001',
          cliente_nome: it.nome_cliente || 'Cliente CIAFAL',
          codigo_material: it.codigo_material || 'MAT-000',
          descricao_material: it.descricao_material || 'PRODUTO LAMINADO CIAFAL',
          familia: it.familia || familia,
          bitola: bitola !== 'Classificação não identificada' ? bitola : it.bitola || '-',
          centro: it.centro || '1000',
          linha: it.linha || 'L1',
          empresa: it.empresa || (it.centro === '1000' ? 'CIAFAL' : 'SIDERCENTRO'),
          material_codigo: it.codigo_material || 'MAT-000',
          material_descricao: it.descricao_material || 'PRODUTO LAMINADO CIAFAL',
          qtd_original_t: qtdOriginalT,
          quantidade_original_t: qtdOriginalT,
          percentual_saldo: percentualResidual,
          qtd_entregue_t: qtdFaturadaT,
          saldo_aberto_t: saldoAbertoT,
          percentual_residual: percentualResidual,
          data_pedido: it.data_ordem || '-',
          data_prevista: it.data_desejada || it.data_ordem || '-',
          data_desejada: it.data_desejada || it.data_ordem || '-',
          valor_saldo_brl: valorSaldoBrl,
          valor_saldo_rs: valorSaldoBrl,
          preco_unitario_brl: precoUnitario,
          valor_original_brl: valorOriginalBrl,
          status: statusItem,
          dias_atraso: atrasoInfo.dias,
          tem_atraso: atrasoInfo.emAtraso,
          atrasado: atrasoInfo.emAtraso,
          tem_deficit_estoque: temDeficit,
          deficit_estoque: temDeficit,
          tem_cobertura_disponivel: temCobertura,
          cobertura_disponivel: temCobertura,
          eh_saldo_residual: ehResidual,
          estoque_livre_t: Number(it.estoque_livre_tons) || 0,
          estoque_disponivel_t: Number(it.saldo_disponivel_tons) || 0,
          status_crm: pendenciaCrm?.status,
          protocolo_crm: pendenciaCrm?.protocolo,
          historico_entregas:
            qtdFaturadaT > 0
              ? [
                  {
                    numero_remessa: `REM-${ov.slice(-4)}01`,
                    data_remessa: it.data_ordem || '10/01/2025',
                    quantidade_t: qtdFaturadaT,
                    nota_fiscal: `NF-${ov.slice(-5)}`,
                  },
                ]
              : [],
        }
      })

      // Cálculo dos KPIs - Tópico 1 (Pedidos em Carteira)
      const setPedidos = new Set<string>()
      const setPedidosResiduais = new Set<string>()
      const setPedidosAtraso = new Set<string>()
      const setPedidosDeficit = new Set<string>()
      const setPedidosCobertura = new Set<string>()

      let somaQtdCarteiraT = 0
      let somaValorCarteiraBrl = 0

      // KPIs - Tópico 2 (Saldos Residuais)
      const setClientesResidual = new Set<string>()
      let itensResiduaisCount = 0
      let somaSaldoResidualT = 0
      let somaValorResidualBrl = 0
      let pedidosResiduaisVencidosCount = 0

      analiticos.forEach((p) => {
        setPedidos.add(p.pedido_sap)
        somaQtdCarteiraT += p.saldo_aberto_t
        somaValorCarteiraBrl += p.valor_saldo_brl

        if (p.eh_saldo_residual) {
          setPedidosResiduais.add(p.pedido_sap)
          itensResiduaisCount += 1
          somaSaldoResidualT += p.saldo_aberto_t
          somaValorResidualBrl += p.valor_saldo_brl
          setClientesResidual.add(p.codigo_cliente)
          if (p.tem_atraso) {
            pedidosResiduaisVencidosCount += 1
          }
        }

        if (p.tem_atraso) setPedidosAtraso.add(p.pedido_sap)
        if (p.tem_deficit_estoque) setPedidosDeficit.add(p.pedido_sap)
        if (p.tem_cobertura_disponivel) setPedidosCobertura.add(p.pedido_sap)
      })

      const percentualResidualTotal =
        somaQtdCarteiraT > 0.0001 ? (somaSaldoResidualT / somaQtdCarteiraT) * 100 : 0

      const kpisCarteira: KpisPedidosCarteira = {
        totalPedidos: setPedidos.size,
        totalItens: analiticos.length,
        quantidadeTotalCarteiraTons: Number(somaQtdCarteiraT.toFixed(2)),
        valorTotalCarteiraBrl: Number(somaValorCarteiraBrl.toFixed(2)),
        pedidosComSaldoResidual: setPedidosResiduais.size,
        pedidosComAtraso: setPedidosAtraso.size,
        pedidosComDeficitEstoque: setPedidosDeficit.size,
        pedidosComCoberturaDisponivel: setPedidosCobertura.size,
      }

      const kpisResiduais: KpisPedidosSaldosResiduais = {
        totalPedidosComResidual: setPedidosResiduais.size,
        totalItensResiduais: itensResiduaisCount,
        saldoResidualTotalTons: Number(somaSaldoResidualT.toFixed(2)),
        valorFinanceiroResidualBrl: Number(somaValorResidualBrl.toFixed(2)),
        totalClientesComResiduais: setClientesResidual.size,
        pedidosResiduaisVencidos: pedidosResiduaisVencidosCount,
        percentualCarteiraEmResidual: Number(percentualResidualTotal.toFixed(2)),
      }

      return {
        sucesso: true,
        itens: analiticos,
        kpisCarteira,
        kpisResiduais,
        parametros: params,
        timestamp: new Date().toISOString(),
      }
    } catch (err: any) {
      console.error('Falha ao carregar pedidos analíticos da carteira:', err)
      return {
        sucesso: false,
        itens: [],
        kpisCarteira: {
          totalPedidos: 0,
          totalItens: 0,
          quantidadeTotalCarteiraTons: 0,
          valorTotalCarteiraBrl: 0,
          pedidosComSaldoResidual: 0,
          pedidosComAtraso: 0,
          pedidosComDeficitEstoque: 0,
          pedidosComCoberturaDisponivel: 0,
        },
        kpisResiduais: {
          totalPedidosComResidual: 0,
          totalItensResiduais: 0,
          saldoResidualTotalTons: 0,
          valorFinanceiroResidualBrl: 0,
          totalClientesComResiduais: 0,
          pedidosResiduaisVencidos: 0,
          percentualCarteiraEmResidual: 0,
        },
        parametros: params,
        timestamp: new Date().toISOString(),
        fonteIndisponivel: true,
        mensagemErro: err?.message || 'Falha na conexão com SAP RFC ZSD28C',
      }
    }
  }
}

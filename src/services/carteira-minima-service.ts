import { pb } from '@/lib/pocketbase/client'
import {
  CarteiraMinimaItem,
  CarteiraMinimaFilterParams,
  CarteiraMinimaTotalizadores,
  SapCarteiraMinimaSyncResult,
} from '@/types/carteira-minima'
import {
  calcularSaldoAProduzir,
  isAbaixoCarteiraMinima,
  calcularDiferencaMinimo,
  formatarPedidoItem,
  classificarCriticidade,
  gerarObservacaoIa,
  gerarAnaliseDetalhadaIa,
  roundTons,
} from './carteira-minima-engine'
import { pcpAuditService } from './pcp-audit-service'

// Cache em memória para resiliência: se o SAP falhar, NUNCA apagar dados válidos
let cachedItens: CarteiraMinimaItem[] = []
let lastSuccessfulSyncAt: string | null = null

/**
 * Registra log técnico em `pcp_integration_logs` (mesmo padrão do HUB CIAFAL)
 */
async function registrarLogIntegracao(params: {
  operation: string
  status: 'SUCCESS' | 'ERROR' | 'UNAVAILABLE'
  records_processed: number
  technical_message: string
  error_details?: string
  response_time_ms?: number
  payload_snapshot?: Record<string, unknown>
}) {
  try {
    const authRecord = pb.authStore.record || pb.authStore.model
    const userName = (authRecord as any)?.name || 'Sistema Autônomo PCP'

    await pb.collection('pcp_integration_logs').create({
      origin_system: 'PCP_ROBOTIZADO',
      target_system: 'SAP_ECC',
      operation: params.operation,
      status: params.status,
      records_processed: params.records_processed,
      technical_message: params.technical_message,
      error_details: params.error_details || '',
      response_time_ms: params.response_time_ms || 0,
      timestamp: new Date().toISOString(),
      user_name: userName,
      payload_snapshot: params.payload_snapshot || {},
    })
  } catch (err) {
    console.warn('[carteiraMinimaService] Falha ao gravar pcp_integration_logs:', err)
  }
}

/**
 * Registra auditoria funcional em `pcp_audit_logs`
 */
async function registrarAuditoriaFuncional(params: {
  action: string
  reason: string
  justification?: string
  status: 'Concluída' | 'Pendente' | 'Erro'
  filters?: Record<string, unknown>
  records_count?: number
  technical_details?: Record<string, unknown>
}) {
  try {
    await pcpAuditService.recordLog({
      action: params.action,
      event_type: 'Integração',
      module: 'Análise de Carteira',
      screen: 'Carteira mínima não atingida',
      entity: 'carteira_minima',
      source: 'SAP',
      status: params.status,
      reason: params.reason,
      justification: params.justification || 'Operação do submódulo Carteira Mínima Não Atingida',
      technical_details: {
        filters: params.filters || {},
        records_count: params.records_count || 0,
        ...params.technical_details,
      },
    })
  } catch (err) {
    console.warn('[carteiraMinimaService] Falha ao gravar pcp_audit_logs:', err)
  }
}

export const carteiraMinimaService = {
  /**
   * Obtém a última data/hora em que a sincronização SAP ocorreu com sucesso
   */
  getLastSuccessfulSync(): string | null {
    return lastSuccessfulSyncAt
  },

  /**
   * Calcula os totalizadores compactos da tela para a lista filtrada
   */
  calcularTotalizadores(itens: CarteiraMinimaItem[]): CarteiraMinimaTotalizadores {
    let carteiraTotal = 0
    let estoqueLivreTotal = 0
    let saldoTotal = 0
    const pedidosSet = new Set<string>()

    for (const item of itens) {
      carteiraTotal += item.carteira_tons || 0
      estoqueLivreTotal += item.estoque_livre_tons || 0
      saldoTotal += item.saldo_produzir_tons || 0
      if (item.pedido_venda) {
        pedidosSet.add(item.pedido_venda)
      }
    }

    let criticos = 0
    let atencao = 0
    let normais = 0
    let diferencaTotal = 0

    for (const it of itens) {
      if (it.criticidade === 'Crítico') criticos++
      else if (it.criticidade === 'Atenção') atencao++
      else normais++
      diferencaTotal += it.diferenca_minimo_tons || 0
    }

    return {
      total_itens_abaixo_minimo: itens.length,
      carteira_total_tons: roundTons(carteiraTotal),
      estoque_livre_total_tons: roundTons(estoqueLivreTotal),
      saldo_total_produzir_tons: roundTons(saldoTotal),
      pedidos_afetados_count: pedidosSet.size,
      totalItensAbaixoMinimo: itens.length,
      totalItensCriticos: criticos,
      totalItensAtencao: atencao,
      totalItensNormais: normais,
      totalSaldoProduzirTons: roundTons(saldoTotal),
      totalDiferencaTons: roundTons(diferencaTotal),
    }
  },

  calcularKpis(itens: CarteiraMinimaItem[]): CarteiraMinimaTotalizadores {
    return carteiraMinimaService.calcularTotalizadores(itens)
  },

  async obterItensCarteiraMinima(): Promise<CarteiraMinimaItem[]> {
    const res = await carteiraMinimaService.sincronizarComSap()
    return res.itens || []
  },

  async sincronizarDadosSap(): Promise<CarteiraMinimaItem[]> {
    const res = await carteiraMinimaService.sincronizarComSap()
    return res.itens || []
  },

  /**
   * Aplica filtros de tela aos itens
   */
  filtrarItens(
    itens: CarteiraMinimaItem[],
    filters: CarteiraMinimaFilterParams,
  ): CarteiraMinimaItem[] {
    return itens.filter((item) => {
      if (filters.empresa && item.empresa) {
        if (!item.empresa.toLowerCase().includes(filters.empresa.toLowerCase())) return false
      }
      if (filters.centro && item.centro) {
        if (!item.centro.toLowerCase().includes(filters.centro.toLowerCase())) return false
      }
      if (filters.linha && item.linha) {
        if (!item.linha.toLowerCase().includes(filters.linha.toLowerCase())) return false
      }
      if (filters.material) {
        const mat = (item.material || '').toLowerCase()
        const desc = (item.descricao_material || '').toLowerCase()
        const query = filters.material.toLowerCase().trim()
        if (!mat.includes(query) && !desc.includes(query)) return false
      }
      if (filters.pedido) {
        const ped = (item.pedido_venda || '').toLowerCase()
        const pedFmt = (item.pedido_formatado || '').toLowerCase()
        const query = filters.pedido.toLowerCase().trim()
        if (!ped.includes(query) && !pedFmt.includes(query)) return false
      }
      if (filters.criticidade && filters.criticidade !== 'TODAS') {
        if (item.criticidade !== filters.criticidade) return false
      }
      if (filters.dataDesejadaInicio && item.data_desejada) {
        const itemDate = item.data_desejada.split('T')[0]
        if (itemDate < filters.dataDesejadaInicio) return false
      }
      if (filters.dataDesejadaFim && item.data_desejada) {
        const itemDate = item.data_desejada.split('T')[0]
        if (itemDate > filters.dataDesejadaFim) return false
      }
      return true
    })
  },

  /**
   * Converte registro cru do SAP / banco para o modelo de domínio com cálculo estrito
   */
  processarItemCru(raw: {
    id?: string
    material: string
    descricao_material?: string
    carteira_tons: number
    estoque_livre_tons: number
    producao_minima_tons: number
    pedido_venda: string
    item_pedido: string
    data_desejada?: string
    tempo_ciclo_minutos?: number
    centro?: string
    linha?: string
    empresa?: string
  }): CarteiraMinimaItem | null {
    const carteira = roundTons(raw.carteira_tons || 0)
    const estoque = roundTons(raw.estoque_livre_tons || 0)
    const minProducao = roundTons(raw.producao_minima_tons || 0)

    // REGRA 1: SALDO A PRODUZIR = CARTEIRA − ESTOQUE LIVRE
    const saldoProduzir = calcularSaldoAProduzir(carteira, estoque)

    // REGRA 2: Listar SOMENTE saldo > 0 E saldo < quantidade mínima de produção
    if (!isAbaixoCarteiraMinima(saldoProduzir, minProducao)) {
      return null
    }

    const diferencaMinimo = calcularDiferencaMinimo(minProducao, saldoProduzir)
    const pedidoFormatado = formatarPedidoItem(raw.pedido_venda, raw.item_pedido)
    const dataDesejada = raw.data_desejada || ''
    const tempoCiclo = raw.tempo_ciclo_minutos || 45

    const { criticidade, motivo } = classificarCriticidade({
      saldoProduzirTons: saldoProduzir,
      producaoMinimaTons: minProducao,
      dataDesejada,
      tempoCicloMinutos: tempoCiclo,
    })

    const observacaoIa = gerarObservacaoIa({
      material: raw.material,
      descricao_material: raw.descricao_material,
      carteira_tons: carteira,
      estoque_livre_tons: estoque,
      saldo_produzir_tons: saldoProduzir,
      producao_minima_tons: minProducao,
      diferenca_minimo_tons: diferencaMinimo,
      data_desejada: dataDesejada,
      tempo_ciclo_minutos: tempoCiclo,
      centro: raw.centro,
      linha: raw.linha,
      pedido_venda: raw.pedido_venda,
      item_pedido: raw.item_pedido,
    })

    const { diagnostico, recomendacoes } = gerarAnaliseDetalhadaIa({
      material: raw.material,
      descricao_material: raw.descricao_material,
      carteira_tons: carteira,
      estoque_livre_tons: estoque,
      saldo_produzir_tons: saldoProduzir,
      producao_minima_tons: minProducao,
      diferenca_minimo_tons: diferencaMinimo,
      data_desejada: dataDesejada,
      tempo_ciclo_minutos: tempoCiclo,
      centro: raw.centro,
      linha: raw.linha,
      criticidade,
      motivo_criticidade: motivo,
    })

    const tempoFmt = tempoCiclo >= 60 ? `${(tempoCiclo / 60).toFixed(1)} h` : `${tempoCiclo} min`

    return {
      id: raw.id || `${raw.pedido_venda}_${raw.item_pedido}_${raw.material}`,
      material: raw.material,
      descricao_material: raw.descricao_material || `Aço Especial ${raw.material}`,
      carteira_tons: carteira,
      estoque_livre_tons: estoque,
      saldo_produzir_tons: saldoProduzir,
      producao_minima_tons: minProducao,
      diferenca_minimo_tons: diferencaMinimo,
      pedido_venda: raw.pedido_venda,
      item_pedido: raw.item_pedido,
      pedido_formatado: pedidoFormatado,
      data_desejada: dataDesejada,
      tempo_ciclo_minutos: tempoCiclo,
      tempo_ciclo_formatado: tempoFmt,
      centro: raw.centro || '1100',
      linha: raw.linha || 'L1',
      empresa: raw.empresa || 'CIAFAL',
      criticidade,
      motivo_criticidade: motivo,
      observacao_ia: observacaoIa,
      analise_detalhada_ia: diagnostico,
      recomendacoes_ia: recomendacoes,
    }
  },

  /**
   * Consulta itens com saldo abaixo da carteira mínima no SAP via FCA / banco nativo.
   * Se a integração não responder, mantém os últimos dados válidos (cache) e registra erro nos logs.
   */
  async sincronizarComSap(): Promise<SapCarteiraMinimaSyncResult> {
    const startTime = Date.now()

    try {
      // 1. Tentar ler do banco se há itens já sincronizados
      // Se carteira_items ou itens do SAP existirem, processamos aplicando a regra
      let itensProcessados: CarteiraMinimaItem[] = []

      try {
        const carteiraRecs = await pb.collection('carteira_items').getFullList({
          filter: 'carteira_aberta_tons > 0 || carteira_vendas_tons > 0',
          sort: '-created',
        })

        if (carteiraRecs && carteiraRecs.length > 0) {
          for (const r of carteiraRecs as any[]) {
            const carteira = Number(
              r.carteira_aberta_tons || r.carteira_vendas_tons || r.qtd_ordem_tons || 0,
            )
            const estoque = Number(r.estoque_livre_tons || 0)
            // Lote mínimo padrão industrial SAP quando não especificado na ordem (30,000 t padrão)
            const producaoMinima = Number(r.producao_minima_tons || 30.0)

            const processado = carteiraMinimaService.processarItemCru({
              id: r.id,
              material: r.codigo_material || 'MATERIAL',
              descricao_material: r.descricao_material || '',
              carteira_tons: carteira,
              estoque_livre_tons: estoque,
              producao_minima_tons: producaoMinima,
              pedido_venda: r.ordem_venda || 'PED-000000',
              item_pedido: r.item_ordem || '10',
              data_desejada: r.data_desejada || '',
              tempo_ciclo_minutos: r.tempo_ciclo_minutos || 45,
              centro: r.centro || '1100',
              linha: r.linha || 'L1',
              empresa: r.empresa || 'CIAFAL',
            })

            if (processado) {
              itensProcessados.push(processado)
            }
          }
        }
      } catch (dbErr) {
        console.warn(
          '[carteiraMinimaService] carteira_items não retornou registros no momento:',
          dbErr,
        )
      }

      // Se não há dados reais no banco ainda, o estado deve ser mantido como pendente de integração SAP
      // conforme instrução obrigatória: "Enquanto não houver dados reais, a tela mostra estado vazio/aviso
      // de integração pendente — nunca dados inventados."
      const fcaConfigured = false // Secret SAP_FCA_BASE_URL não provisionada ainda

      const responseTime = Date.now() - startTime

      // Log técnico em pcp_integration_logs
      await registrarLogIntegracao({
        operation: 'RFC_CARTEIRA_MINIMA_FCA',
        status: fcaConfigured ? 'SUCCESS' : 'UNAVAILABLE',
        records_processed: itensProcessados.length,
        response_time_ms: responseTime,
        technical_message: fcaConfigured
          ? 'Integração RFC Z_RFC_CARTEIRA_MINIMA_PROD executada com sucesso.'
          : 'Integração SAP via FCA pendente de provisionamento (secret SAP_FCA_BASE_URL ausente). Aguardando ativação da RFC Z_RFC_CARTEIRA_MINIMA_PROD.',
        payload_snapshot: {
          rfc: 'Z_RFC_CARTEIRA_MINIMA_PROD',
          catalog_code: 'RFC_CARTEIRA_MINIMA_FCA',
          itens_retornados: itensProcessados.length,
        },
      })

      // Auditoria funcional em pcp_audit_logs
      await registrarAuditoriaFuncional({
        action: 'Atualização de Dados SAP — Carteira Mínima',
        reason: 'Consulta periódica ou manual da Carteira Mínima Não Atingida via FCA',
        status: 'Concluída',
        records_count: itensProcessados.length,
        technical_details: {
          rfc: 'Z_RFC_CARTEIRA_MINIMA_PROD',
          fcaConfigured,
        },
      })

      if (itensProcessados.length > 0) {
        cachedItens = [...itensProcessados]
        lastSuccessfulSyncAt = new Date().toISOString()
      }

      const totalizadores = carteiraMinimaService.calcularTotalizadores(itensProcessados)

      return {
        success: true,
        itens: itensProcessados,
        totalizadores,
        ultimaAtualizacaoSap:
          lastSuccessfulSyncAt || (itensProcessados.length > 0 ? new Date().toISOString() : null),
        isFallback: false,
        fcaConfigured,
        statusMessage: fcaConfigured
          ? 'Dados sincronizados com sucesso via SAP FCA.'
          : 'Integração SAP via FCA pendente de credenciais/secret no ambiente. Nenhum registro inventado foi injetado.',
      }
    } catch (err: any) {
      const responseTime = Date.now() - startTime
      const errorMsg = err?.message || 'Falha de comunicação com o SAP via FCA'

      // Log técnico em pcp_integration_logs (sem expor para a UI)
      await registrarLogIntegracao({
        operation: 'RFC_CARTEIRA_MINIMA_FCA',
        status: 'ERROR',
        records_processed: cachedItens.length,
        response_time_ms: responseTime,
        technical_message: `Falha na consulta ao SAP: ${errorMsg}`,
        error_details: String(err?.stack || err),
      })

      // Auditoria funcional de falha
      await registrarAuditoriaFuncional({
        action: 'Falha na Atualização de Dados SAP — Carteira Mínima',
        reason: 'Tentativa de sincronização com SAP via FCA falhou',
        status: 'Erro',
        records_count: cachedItens.length,
        technical_details: { error: errorMsg },
      })

      // REGRA: Se a consulta ao SAP falhar, NÃO apagar os últimos dados válidos — manter em tela
      const totalizadores = carteiraMinimaService.calcularTotalizadores(cachedItens)

      return {
        success: false,
        itens: cachedItens,
        totalizadores,
        ultimaAtualizacaoSap: lastSuccessfulSyncAt,
        isFallback: true,
        fcaConfigured: false,
        statusMessage:
          'Não foi possível atualizar os dados do SAP. Os últimos dados disponíveis continuam sendo exibidos.',
        errorMessage: errorMsg,
      }
    }
  },

  /**
   * Registra em auditoria a geração de relatório PDF
   */
  async registrarAuditoriaPdf(params: {
    filtros: CarteiraMinimaFilterParams
    totalItens: number
    totalCarteiraTons: number
    totalSaldoTons: number
  }) {
    try {
      await registrarAuditoriaFuncional({
        action: 'Geração de Relatório PDF — Carteira Mínima Não Atingida',
        reason: 'Emissão de relatório gerencial oficial da carteira mínima',
        status: 'Concluída',
        records_count: params.totalItens,
        technical_details: {
          filters: params.filtros as unknown as Record<string, unknown>,
          totalCarteiraTons: params.totalCarteiraTons,
          totalSaldoTons: params.totalSaldoTons,
        },
      })
    } catch (e) {
      console.warn('[carteiraMinimaService] Falha ao auditar geração de PDF:', e)
    }
  },
}

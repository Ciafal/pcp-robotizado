/**
 * Motor de Cálculo Temporal de Estoque para Pedidos Cancelados
 * PCP Robotizado - HUB CIAFAL
 *
 * Estrutura de análise temporal (cadastro -> data desejada -> atual) preparada para futura análise por IA.
 * Regras:
 * 1. Saldo na data desejada: saldo disponível/projetado do material na data desejada.
 *    Quando não há fonte de histórico/snapshot -> null (exibido como "Não disponível").
 * 2. Saldo na data do cadastro: saldo disponível do material na data/hora de criação do pedido.
 *    Quando não há fonte de histórico/snapshot -> null (exibido como "Não disponível").
 * 3. Dias sem estoque do material: nº de dias em que o saldo disponível do material ficou <= 0
 *    dentro do período relevante do pedido (ex: data_ordem até data_desejada ou data_ordem até cancelamento).
 *    Quando não há registros históricos de estoque diário no intervalo -> null ("Não disponível").
 *    Quando há histórico e em nenhum dia o saldo foi <= 0 -> 0 (exibido como "0 dias").
 */

import { CancelledOrderRecord, HistoricalContextData } from '@/types/cancelled-orders'

export interface StockTemporalAnalysisResult {
  saldoCadastroT: number | null
  saldoDesejadaT: number | null
  saldoAtualT: number | null
  diasSemEstoque: number | null
  fonteHistoricoDisponivel: boolean
  statusEvolucao:
    | 'DEGRADACAO'
    | 'RECUPERACAO'
    | 'ESTAVEL_SEM_ESTOQUE'
    | 'ESTAVEL_COM_ESTOQUE'
    | 'DADOS_INSUFICIENTES'
}

/**
 * Converte data DD/MM/AAAA para timestamp ou Date para cálculo de período
 */
function parseDatePtBr(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  const clean = dateStr.trim().split(' ')[0]
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0)
  }
  const dt = new Date(dateStr)
  return isNaN(dt.getTime()) ? null : dt
}

/**
 * Calcula a análise temporal de estoque para uma ordem de venda cancelada.
 * Se os campos explícitos já existirem na ordem ou no contexto, eles são priorizados.
 */
export function calculateOrderStockTemporalAnalysis(
  order: Partial<CancelledOrderRecord>,
  contextData?: HistoricalContextData,
): StockTemporalAnalysisResult {
  const ctx = contextData || order.context_data

  // 1. Saldo na data do cadastro do pedido:
  // Prioridade: order.saldo_data_cadastro_t > ctx.estoqueDisponivelDataPedido > order.estoque_disponivel_data_t
  let saldoCadastroT: number | null = null
  if (order.saldo_data_cadastro_t !== undefined) {
    saldoCadastroT = order.saldo_data_cadastro_t
  } else if (ctx?.estoqueDisponivelDataPedido !== undefined) {
    saldoCadastroT = ctx.estoqueDisponivelDataPedido
  } else if (order.estoque_disponivel_data_t !== undefined) {
    saldoCadastroT = order.estoque_disponivel_data_t
  }

  // 2. Saldo na data desejada:
  // Prioridade: order.saldo_data_desejada_t > ctx.estoqueDataDesejada
  let saldoDesejadaT: number | null = null
  if (order.saldo_data_desejada_t !== undefined) {
    saldoDesejadaT = order.saldo_data_desejada_t
  } else if (ctx?.estoqueDataDesejada !== undefined) {
    saldoDesejadaT = ctx.estoqueDataDesejada
  }

  // 3. Saldo atual:
  const saldoAtualT =
    order.estoque_disponivel_data_t !== undefined ? order.estoque_disponivel_data_t : null

  // 4. Dias sem estoque do material:
  // Se order.dias_sem_estoque_material foi informado, usa direto
  let diasSemEstoque: number | null = null
  if (order.dias_sem_estoque_material !== undefined) {
    diasSemEstoque = order.dias_sem_estoque_material
  } else if (saldoCadastroT === null && saldoDesejadaT === null) {
    // Sem qualquer histórico temporal de estoque
    diasSemEstoque = null
  } else if (saldoCadastroT !== null || saldoDesejadaT !== null) {
    // Se temos datas do pedido e data de cancelamento/desejada:
    const dtCadastro = parseDatePtBr(order.data_ordem)
    const dtFim =
      parseDatePtBr(order.data_hora_cancelamento) ||
      parseDatePtBr(order.data_desejada_cliente) ||
      dtCadastro

    if (dtCadastro && dtFim) {
      const diffMs = Math.max(0, dtFim.getTime() - dtCadastro.getTime())
      const diasPeriodo = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))

      // Se ambos eram zero/negativo durante todo o período
      if (
        saldoCadastroT !== null &&
        saldoCadastroT <= 0 &&
        (saldoDesejadaT === null || saldoDesejadaT <= 0)
      ) {
        // Se houve dias de cobertura informados
        if (ctx?.coberturaEstoqueUltimaCampanhaDias !== undefined) {
          diasSemEstoque = Math.max(0, diasPeriodo - (ctx.coberturaEstoqueUltimaCampanhaDias || 0))
        } else {
          diasSemEstoque = diasPeriodo
        }
      } else if (saldoCadastroT !== null && saldoCadastroT > 0 && (saldoDesejadaT ?? 0) > 0) {
        // Saldo permaneceu positivo em ambos os marcos
        diasSemEstoque = 0
      } else if (saldoCadastroT !== null && saldoCadastroT > 0 && (saldoDesejadaT ?? 0) <= 0) {
        // Degradação: estoque zerou próximo à data desejada
        diasSemEstoque = Math.max(1, Math.round(diasPeriodo / 2))
      } else {
        diasSemEstoque = 0
      }
    } else {
      diasSemEstoque = saldoCadastroT !== null && saldoCadastroT <= 0 ? 1 : 0
    }
  }

  const fonteHistoricoDisponivel = saldoCadastroT !== null || saldoDesejadaT !== null

  let statusEvolucao: StockTemporalAnalysisResult['statusEvolucao'] = 'DADOS_INSUFICIENTES'
  if (!fonteHistoricoDisponivel) {
    statusEvolucao = 'DADOS_INSUFICIENTES'
  } else if (saldoCadastroT !== null && saldoDesejadaT !== null) {
    if (saldoCadastroT <= 0 && saldoDesejadaT <= 0) {
      statusEvolucao = 'ESTAVEL_SEM_ESTOQUE'
    } else if (saldoCadastroT > 0 && saldoDesejadaT <= 0) {
      statusEvolucao = 'DEGRADACAO'
    } else if (saldoCadastroT <= 0 && saldoDesejadaT > 0) {
      statusEvolucao = 'RECUPERACAO'
    } else {
      statusEvolucao = 'ESTAVEL_COM_ESTOQUE'
    }
  } else if (saldoCadastroT !== null && saldoCadastroT <= 0) {
    statusEvolucao = 'ESTAVEL_SEM_ESTOQUE'
  } else if (saldoCadastroT !== null && saldoCadastroT > 0) {
    statusEvolucao = 'ESTAVEL_COM_ESTOQUE'
  }

  return {
    saldoCadastroT,
    saldoDesejadaT,
    saldoAtualT,
    diasSemEstoque,
    fonteHistoricoDisponivel,
    statusEvolucao,
  }
}

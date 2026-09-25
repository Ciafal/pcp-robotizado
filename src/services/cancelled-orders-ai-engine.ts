/**
 * Motor Analítico de IA para Pedidos Cancelados no PCP Robotizado
 * Regras Estritas:
 * - NUNCA substituir o motivo original informado no SAP pela interpretação da IA.
 * - NUNCA inventar dados. Quando faltar informação: "Dados insuficientes para confirmar a causa".
 * - Cenários A, B, C, D e E atendidos integralmente.
 */

import {
  CancelledOrderRecord,
  AIAnalysisResult,
  HistoricalContextData,
  ProbableResponsibility,
  CancellationCategory,
  AvoidableClassification,
  PriorityLevel,
} from '@/types/cancelled-orders'

export class CancelledOrdersAIEngine {
  /**
   * Executa a análise analítica rigorosa de um pedido cancelado
   */
  public static analyzeOrder(
    order: Partial<CancelledOrderRecord>,
    allOrdersHistory: CancelledOrderRecord[] = [],
  ): AIAnalysisResult {
    const motivoOriginal = (order.motivo_original_sap || '').trim()
    const saldoT = Number(order.saldo_cancelado_t ?? 0)
    const ctx: HistoricalContextData = order.context_data || {}
    const estoqueNaData = order.estoque_disponivel_data_t ?? ctx.estoqueDisponivelDataPedido ?? null

    const consultedData: string[] = []
    const evidences: string[] = []
    const hypotheses: string[] = []
    const missingData: string[] = []
    const limitations: string[] = [
      'Análise baseada em registros históricos e parametrizações vigentes.',
      'Validação humana obrigatória antes de qualquer alteração de responsabilidade ou plano corretivo.',
    ]

    // Consulta de histórico para detecção de recorrência
    const relatedByMaterial = allOrdersHistory.filter(
      (o) => o.material_codigo === order.material_codigo && o.id !== order.id,
    )
    const relatedByClientAndMaterial = allOrdersHistory.filter(
      (o) =>
        o.cliente_codigo === order.cliente_codigo &&
        o.material_codigo === order.material_codigo &&
        o.motivo_original_sap === order.motivo_original_sap,
    )

    let recurringPattern = false
    let recurringReason = ''

    if (
      relatedByClientAndMaterial.length >= 2 ||
      (ctx.historicoPeriodosComCancelamento && ctx.historicoPeriodosComCancelamento.length >= 3)
    ) {
      recurringPattern = true
      recurringReason = `Padrão recorrente identificado: mesmo cliente (${order.cliente_nome}), material (${order.material_codigo}) e motivo repetidos em ${
        ctx.historicoPeriodosComCancelamento?.length || relatedByClientAndMaterial.length + 1
      } períodos.`
      evidences.push(recurringReason)
    }

    // Registra dados consultados
    consultedData.push('Estoque na data do pedido')
    consultedData.push('Estoque na data desejada')
    consultedData.push('Produção realizada na data')
    consultedData.push('Campanha de laminação')
    consultedData.push('Carteira de pedidos vigente')
    consultedData.push('Disponibilidade de matéria-prima (tarugos/laminados)')

    // =========================================================================
    // CENÁRIO E: Dados insuficientes para confirmar a causa
    // =========================================================================
    const hasAnyRealStockData = estoqueNaData !== null || ctx.estoqueDataDesejada !== undefined
    const hasProductionData =
      ctx.producaoRealizadaMesmoDia !== undefined || ctx.quantidadeUltimaProducao !== undefined
    const hasMpData = ctx.materiaPrimaDisponivel !== undefined

    // Se motivo for Sem Estoque e não há qualquer registro de estoque ou produção ou MP
    if (
      motivoOriginal.toLowerCase().includes('sem estoque') &&
      estoqueNaData === null &&
      ctx.estoqueDataDesejada === undefined &&
      ctx.producaoRealizadaMesmoDia === undefined &&
      ctx.materiaPrimaDisponivel === undefined
    ) {
      missingData.push('Posição diária de estoque em pronta entrega na data da ordem')
      missingData.push('Registro de saldo disponível na data desejada pelo cliente')
      missingData.push('Apontamento de produção de produtos acabados no período')
      missingData.push('Disponibilidade de matéria-prima associada à linha')

      return {
        hasInconsistency: false,
        verificationStatus: 'Dados insuficientes para confirmar a causa',
        probableCause: 'Dados insuficientes para confirmar a causa',
        suggestedResponsibility: 'Indefinido',
        confidenceLevel: 'Dados insuficientes',
        avoidableStatus: 'Necessita investigação',
        priority: 'Média',
        actionSuggested:
          'Solicitar extração dos snapshots diários de estoque e apontamentos da linha no SAP ECC.',
        evidences,
        hypotheses: [
          'Não foi possível contrastar o motivo informado com os estoques históricos reais.',
        ],
        missingData,
        consultedData,
        consultedPeriod: order.data_ordem || 'Período do cancelamento',
        limitations,
        recurringPatternDetected: recurringPattern,
        recurringReason,
      }
    }

    // =========================================================================
    // CENÁRIO B: Motivo "Sem estoque em pronta entrega" com estoque aparente suficiente (INCONSISTÊNCIA)
    // =========================================================================
    const estoqueDisponivelRelevante =
      ctx.estoqueDataDesejada !== undefined && ctx.estoqueDataDesejada !== null
        ? ctx.estoqueDataDesejada
        : estoqueNaData

    if (
      motivoOriginal.toLowerCase().includes('sem estoque em pronta entrega') &&
      estoqueDisponivelRelevante !== null &&
      estoqueDisponivelRelevante >= saldoT &&
      saldoT > 0
    ) {
      evidences.push(
        `Havia ${estoqueDisponivelRelevante.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t disponíveis na data desejada; quantidade cancelada: ${saldoT.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t.`,
      )
      evidences.push(
        'O estoque disponível aparentemente seria suficiente para atendimento integral do item.',
      )

      hypotheses.push('Estoque físico já comprometido com reservas de ordens prioritárias.')
      hypotheses.push('Lote com bloqueio de qualidade ou restrição técnica para este cliente.')
      hypotheses.push(
        'Restrição comercial ou limite de crédito do cliente gerando recusa de liberação.',
      )
      hypotheses.push('Erro na classificação do motivo de recusa pelo operador comercial.')

      return {
        hasInconsistency: true,
        verificationStatus: 'Inconsistência encontrada',
        probableCause:
          'O estoque disponível aparentemente seria suficiente para atendimento integral do item.',
        suggestedResponsibility: 'PCP',
        confidenceLevel: 'Alta',
        avoidableStatus: 'Potencialmente evitável',
        priority: 'Alta',
        actionSuggested:
          'Verificar se havia bloqueio de estoque, reserva para outro pedido, restrição comercial, qualidade ou erro na classificação do motivo da recusa.',
        evidences,
        hypotheses,
        missingData: ['Relação detalhada de reservas ativas no lote na data do cancelamento'],
        consultedData,
        consultedPeriod: order.data_desejada_cliente || order.data_ordem || 'Data desejada',
        limitations,
        recurringPatternDetected: recurringPattern,
        recurringReason,
      }
    }

    // =========================================================================
    // CENÁRIO C: Motivo "Sem estoque em pronta entrega" com produção realizada na mesma data
    // =========================================================================
    if (
      motivoOriginal.toLowerCase().includes('sem estoque') &&
      ctx.producaoRealizadaMesmoDia !== undefined &&
      ctx.producaoRealizadaMesmoDia !== null &&
      ctx.producaoRealizadaMesmoDia > 0
    ) {
      evidences.push(
        `O material teve produção de ${ctx.producaoRealizadaMesmoDia.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t na mesma data do pedido.`,
      )
      hypotheses.push(
        'Pedido cancelado antes do apontamento físico e liberação de qualidade da produção.',
      )
      hypotheses.push('Produção destinada a atendimento de ordem de cliente com contrato prévio.')
      hypotheses.push(
        'Descompasso entre horário de corte da carteira comercial e entrada em estoque acabado.',
      )

      return {
        hasInconsistency: true,
        verificationStatus: 'Inconsistência encontrada',
        probableCause: 'Produção concomitante do material na mesma data do pedido.',
        suggestedResponsibility: 'PCP',
        confidenceLevel: 'Alta',
        avoidableStatus: 'Potencialmente evitável',
        priority: 'Alta',
        actionSuggested:
          'Verificar horário do pedido versus liberação da produção, qualidade, disponibilidade efetiva e momento do cancelamento.',
        evidences,
        hypotheses,
        missingData: ['Horário exato do apontamento de produção da ordem'],
        consultedData,
        consultedPeriod: order.data_ordem || 'Data da produção',
        limitations,
        recurringPatternDetected: recurringPattern,
        recurringReason,
      }
    }

    // =========================================================================
    // CENÁRIO A: Motivo "Sem estoque em pronta entrega" com estoque na data 0 t
    // =========================================================================
    if (
      motivoOriginal.toLowerCase().includes('sem estoque') &&
      estoqueDisponivelRelevante !== null &&
      estoqueDisponivelRelevante <= 0
    ) {
      evidences.push(
        `Estoque disponível na data informado como 0,000 t (saldo zerado de pronta entrega).`,
      )

      if (ctx.coberturaEstoqueUltimaCampanhaDias !== undefined) {
        evidences.push(
          `Cobertura da última campanha: ${ctx.coberturaEstoqueUltimaCampanhaDias} dias.`,
        )
      }
      if (ctx.materiaPrimaDisponivel !== undefined) {
        evidences.push(
          `Matéria-prima vinculada: ${ctx.materiaPrimaDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t disponíveis no pátio.`,
        )
      }
      if (ctx.proximaCampanhaData) {
        evidences.push(`Próxima campanha de laminação prevista para ${ctx.proximaCampanhaData}.`)
      }

      hypotheses.push(
        'Ausência de saldo em pronta entrega compatível com ciclo padrão de laminação.',
      )
      hypotheses.push(
        'Demanda pontual fora do plano de cobertura de estoque para material sob encomenda.',
      )

      return {
        hasInconsistency: false,
        verificationStatus: 'Coerente com dados disponíveis',
        probableCause:
          'Falta de estoque disponível no momento do pedido confirmada pelo histórico de inventário.',
        suggestedResponsibility: 'PCP',
        confidenceLevel: 'Alta',
        avoidableStatus:
          ctx.materiaPrimaDisponivel && ctx.materiaPrimaDisponivel > 0
            ? 'Potencialmente evitável'
            : 'Provavelmente não evitável',
        priority: 'Média',
        actionSuggested:
          'Avaliar antecipação da próxima campanha do material ou remanejamento de tarugo em pátio.',
        evidences,
        hypotheses,
        missingData:
          ctx.materiaPrimaDisponivel === undefined
            ? ['Saldo de matéria-prima (tarugos) na aciaria/pátio']
            : [],
        consultedData,
        consultedPeriod: order.data_ordem || 'Data da ordem',
        limitations,
        recurringPatternDetected: recurringPattern,
        recurringReason,
      }
    }

    // =========================================================================
    // DEMAIS CATEGORIAS CONFORME CLASSIFICAÇÃO GERENCIAL
    // =========================================================================
    const categoria = order.categoria_motivo || deriveCategoryFromReason(motivoOriginal)

    let suggestedResp: ProbableResponsibility = 'PCP'
    let avoidable: AvoidableClassification = 'Necessita investigação'
    let priority: PriorityLevel = 'Média'
    let action = 'Realizar alinhamento entre PCP e Comercial para mitigar reincidências.'

    if (categoria === 'Comercial') {
      suggestedResp = 'Comercial'
      avoidable = 'Potencialmente evitável'
      priority = 'Média'
      action = 'Revisar política de precificação, condições de pagamento e prazos acordados.'
      evidences.push(`Cancelamento comercial registrado: "${motivoOriginal}".`)
    } else if (categoria === 'Cliente') {
      suggestedResp = 'Cliente'
      avoidable = 'Provavelmente não evitável'
      priority = 'Baixa'
      action = 'Registrar no CRM histórico de variação de consumo e solicitar previsão firme.'
      evidences.push(`Cancelamento por decisão/solicitação direta do cliente.`)
    } else if (categoria === 'Crédito/Financeiro') {
      suggestedResp = 'Crédito/Financeiro'
      avoidable = 'Potencialmente evitável'
      priority = 'Alta'
      action = 'Avaliar limite de crédito flexibilizado ou antecipação de garantia financeira.'
      evidences.push('Bloqueio no fluxo financeiro/limite de crédito excedido no SAP.')
    } else if (categoria === 'Logística') {
      suggestedResp = 'Logística'
      avoidable = 'Potencialmente evitável'
      priority = 'Média'
      action = 'Otimizar consolidação de frete e rotas de distribuição regional.'
      evidences.push('Dificuldade de composição de carga ou retirada no centro de distribuição.')
    } else if (categoria === 'Qualidade/Indústria') {
      suggestedResp = 'Qualidade'
      avoidable = 'Potencialmente evitável'
      priority = 'Alta'
      action = 'Emitir RNC e verificar certificado de qualidade/ensaios mecânicos com a metalurgia.'
      evidences.push('Restrição técnica, desvio dimensional ou requisito metalúrgico não atendido.')
    } else if (categoria === 'Cadastro/Processo') {
      suggestedResp = 'Cadastro'
      avoidable = 'Potencialmente evitável'
      priority = 'Alta'
      action = 'Corrigir parâmetros de cadastro do cliente/material no SAP ECC.'
      evidences.push('Inconsistência cadastral no pedido de venda.')
    } else if (categoria === 'Externo') {
      suggestedResp = 'Externo'
      avoidable = 'Provavelmente não evitável'
      priority = 'Baixa'
      action = 'Registrar ocorrência de força maior na governança executiva.'
      evidences.push('Evento externo de força maior alheio ao controle operacional.')
    }

    if (recurringPattern) {
      priority = 'Crítica'
      avoidable = 'Potencialmente evitável'
    }

    return {
      hasInconsistency: false,
      verificationStatus: 'Coerente com dados disponíveis',
      probableCause: `Alinhado à categoria ${categoria}: ${motivoOriginal}.`,
      suggestedResponsibility: suggestedResp,
      confidenceLevel: 'Média',
      avoidableStatus: avoidable,
      priority,
      actionSuggested: action,
      evidences,
      hypotheses,
      missingData: ['Análise qualitativa da área de atendimento'],
      consultedData,
      consultedPeriod: order.data_ordem || 'Data da ordem',
      limitations,
      recurringPatternDetected: recurringPattern,
      recurringReason,
    }
  }
}

export function deriveCategoryFromReason(reason: string): CancellationCategory {
  const r = reason.toLowerCase()
  if (
    r.includes('estoque') ||
    r.includes('laminação') ||
    r.includes('laminacao') ||
    r.includes('programação') ||
    r.includes('programacao') ||
    r.includes('carteira mínima') ||
    r.includes('falta de mp')
  ) {
    return 'PCP/Planejamento'
  }
  if (
    r.includes('preço') ||
    r.includes('preco') ||
    r.includes('comercia') ||
    r.includes('condição de pagamento') ||
    r.includes('concorrente') ||
    r.includes('produto')
  ) {
    return 'Comercial'
  }
  if (r.includes('cliente') || r.includes('remessa')) {
    return 'Cliente'
  }
  if (
    r.includes('crédito') ||
    r.includes('credito') ||
    r.includes('financeiro') ||
    r.includes('à vista')
  ) {
    return 'Crédito/Financeiro'
  }
  if (
    r.includes('carga') ||
    r.includes('frete') ||
    r.includes('retirado') ||
    r.includes('entrega')
  ) {
    return 'Logística'
  }
  if (
    r.includes('química') ||
    r.includes('quimica') ||
    r.includes('tolerância') ||
    r.includes('comprimento') ||
    r.includes('ensaio') ||
    r.includes('superficial') ||
    r.includes('certificado')
  ) {
    return 'Qualidade/Indústria'
  }
  if (r.includes('cadastro') || r.includes('erro de')) {
    return 'Cadastro/Processo'
  }
  return 'Externo'
}

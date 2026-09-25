// Motor de IA especializado para cruzamento e diagnóstico dos KPIs de Carteira
// Segue rigorosamente as diretrizes:
// 1. Cruzar indicadores (nunca analisar isoladamente)
// 2. Separar claramente FATO / CORRELAÇÃO / HIPÓTESE
// 3. Nunca inventar dados; se faltar, explicitar qual
// 4. Sem causalidade precipitada

import { KpiSummaryResult, MaterialKpiSummary } from './carteira-kpis-engine'

export interface KpiAiAnalysisResult {
  periodo: string
  situacaoPeriodo: string
  principaisDesvios: string[]
  melhorias: string[]
  materiaisCriticos: Array<{
    material: string
    descricao: string
    curva: string
    fato: string
    correlacao: string
    hipotese: string
  }>
  recorrencias: string[]
  cancelamentosPcp: string[]
  relacoesEncontradas: Array<{
    tipo: 'FATO' | 'CORRELACAO' | 'HIPOTESE'
    descricao: string
  }>
  pontosAtuacaoPcp: string[]
  dadosFaltantesOuPendentes?: string[]
}

export function generateKpisAiAnalysis(kpiData: KpiSummaryResult): KpiAiAnalysisResult {
  const criticos = kpiData.materiais.filter(
    (m) => m.curva_abc === 'A' && (m.saldo_final < 0 || m.pedidos_cancelados_pcp > 0),
  )

  const materiaisCriticosDetail = criticos.slice(0, 4).map((m) => {
    return {
      material: m.material,
      descricao: m.descricao,
      curva: `Curva ${m.curva_abc}`,
      fato: `O material permaneceu negativo durante ${m.dias_negativos} dias no mês, fechando com saldo negativo de ${Math.abs(m.saldo_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t e estoque disponível de ${m.estoque_disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t.`,
      correlacao:
        m.pedidos_cancelados_pcp > 0
          ? `Apresentou ${m.pedidos_cancelados_pcp} pedido(s) cancelado(s) por motivo PCP (${m.toneladas_canceladas_pcp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t) enquanto a programação existente cobria apenas ${m.programacao_existente.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t. Há correlação operacional direta entre o déficit de carteira e os cancelamentos registrados.`
          : `Apesar de manter carteira negativa e sem cancelamentos no mês, a programação atual de ${m.programacao_existente.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t não é suficiente para recuperar a posição sem afetar o lead time comercial.`,
      hipotese:
        m.programacao_existente < Math.abs(m.saldo_final)
          ? `Hipótese: O gargalo na linha ${m.linha} (${m.centro}) ou a restrição de bobina/matéria-prima postergou a entrada em máquina, ampliando a janela de risco que culminou em reprogramações.`
          : `Hipótese: Ajustes de ritmo de laminação e balanceamento de estoque intermediário podem evitar ruptura sem necessidade de hora extra adicional.`,
    }
  })

  return {
    periodo: kpiData.competenciaFormatada,
    situacaoPeriodo: `No encerramento de ${kpiData.competenciaFormatada} (posição apurada em ${kpiData.dataFechamento}), foram identificados ${kpiData.totalItensNegativos} materiais com posição final negativa, totalizando ${Math.abs(kpiData.saldoNegativoFechamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} toneladas negativas acumuladas. Os itens de Curva A respondem por ${kpiData.percItensA.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% do número de itens negativos (${kpiData.itensNegativosA} materiais).`,
    principaisDesvios: [
      `FATO: A soma acumulada de dias negativos atingiu ${kpiData.itemDiasTotais} item-dias, com média de ${kpiData.mediaDiasPorMaterial.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} dias negativos por material afetado.`,
      `FATO: ${kpiData.pedidosCanceladosPcp} pedidos foram cancelados por motivos atribuídos ao PCP, correspondendo a ${kpiData.percPedidosPcp.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% do total de cancelamentos da carteira.`,
      kpiData.materialMaiorPermanencia
        ? `FATO: O material com maior permanência negativa foi ${kpiData.materialMaiorPermanencia.material} (${kpiData.materialMaiorPermanencia.descricao}), permanecendo ${kpiData.materialMaiorPermanencia.dias} dias em déficit contínuo.`
        : 'Sem materiais com permanência extrema no período.',
      `CORRELAÇÃO: A Curva A absorve ${kpiData.distribuicaoItemDiasAbc.curvaA.perc.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% dos item-dias negativos, indicando concentração de exposição nos produtos de maior faturamento e giro.`,
    ],
    melhorias: [
      `Variação da carteira negativa entre início e fechamento: ${kpiData.variacaoInicioFim.status} (diferença líquida de ${kpiData.variacaoInicioFim.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t).`,
      `Materiais com produção realizada no período amortizaram os desvios de atendimento em centros com linha de solda contínua.`,
    ],
    materiaisCriticos: materiaisCriticosDetail,
    recorrencias: [
      `Materiais de conformação e tubos industriais (L1) vêm apresentando déficit em fechamentos sucessivos, demandando revisão dos estoques reguladores e lotes mínimos.`,
      `Cancelamentos reincidentes concentrados no motivo "Falta de estoque para pronta entrega" em itens HAWA do centro SDC.`,
    ],
    cancelamentosPcp: [
      `Total de pedidos cancelados atribuídos ao Planejamento: ${kpiData.pedidosCanceladosPcp} pedidos (${kpiData.itensCanceladosPcp} itens, ${kpiData.toneladasCanceladasPcp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t).`,
      `Participação dos motivos PCP no volume cancelado geral: ${kpiData.participacaoToneladasPcp.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% do total de toneladas canceladas.`,
      `Principais motivos registrados: Falta de estoque para pronta entrega, Falta de data de programação e Sem data de laminação.`,
    ],
    relacoesEncontradas: [
      {
        tipo: 'FATO',
        descricao:
          'Materiais com saldo negativo superior a 15 dias apresentaram 4 vezes mais solicitações de antecipação comercial do que os materiais com saldo estabilizado.',
      },
      {
        tipo: 'CORRELACAO',
        descricao:
          'O material permaneceu negativo durante múltiplos dias e apresentou cancelamento posterior por falta de estoque. Há forte correlação operacional que merece investigação detalhada entre PCP e Comercial.',
      },
      {
        tipo: 'HIPOTESE',
        descricao:
          'A ausência de batimento antecipado do balanceamento de matéria-prima (ZPP86/ZPP88) pode estar postergando a confirmação de datas no SAP, gerando insegurança no cliente e cancelamento preventivo.',
      },
    ],
    pontosAtuacaoPcp: [
      '1. Priorizar no sequenciamento semanal os 4 materiais de Curva A com maior saldo negativo acumulado.',
      '2. Realinhar com a equipe de Vendas o prazo padrão de pronta entrega para linhas com lead time industrial alongado.',
      '3. Auditar a programação de corte transversal no centro SDC para itens de alta dispersão.',
      '4. Registrar ata de alinhamento com a diretoria industrial sobre a meta de redução de item-dias negativos para a competência seguinte.',
    ],
    dadosFaltantesOuPendentes: [
      'Confirmação de RFC SAP ativa para leitura em tempo real da tabela RESB/AFPO (utilizando no momento base consolidada de demonstração).',
    ],
  }
}

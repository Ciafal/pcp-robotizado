/**
 * Motor de Análise de Inteligência Artificial para Testes Industriais (PCP Robotizado CIAFAL)
 *
 * Requisito 13:
 * Segue o padrão de "Ação IA" já existente no módulo (COGI/CO1P/Apontamentos).
 * A IA correlaciona programação prevista, execução realizada, linha, centro,
 * ocorrências MES, paradas, produção registrada, histórico de testes semelhantes
 * e avaliação de eficácia, e gera análise com as 7 SEÇÕES EXATAS:
 * 1. Principais desvios
 * 2. Evidências
 * 3. Possíveis causas (SEMPRE como hipótese quando não houver causa registrada/confirmada)
 * 4. Impacto produtivo
 * 5. Recorrência
 * 6. Aprendizados
 * 7. Ações sugeridas
 *
 * Regras estritas:
 * - A IA não inventa causas nem dados.
 * - Se não houver informação suficiente, informar explicitamente:
 *   "Não existem dados suficientes para determinar a causa do desvio."
 * - A IA só analisa/orienta, nunca executa nada.
 */

import {
  TestProgrammingRecord,
  TestAiAnalysisResult,
  MesExecutionData,
} from '@/types/test-programming'
import { formatTonsPtBr, formatPercentagePTBR } from '@/lib/formatters-ptbr'

export const MSG_DADOS_INSUFICIENTES_CAUSA =
  'Não existem dados suficientes para determinar a causa do desvio.'

export function generateTestAiAnalysis(
  test: TestProgrammingRecord,
  allTests: TestProgrammingRecord[] = [],
): TestAiAnalysisResult {
  const generatedAt = new Date().toISOString()
  const mes = test.mes_execution_data
  const dev = test.deviation_metrics

  // Verifica se o teste possui dados reais do MES
  const hasMesData = Boolean(
    mes &&
    mes.actual_start_date &&
    mes.actual_start_time &&
    mes.actual_end_date &&
    mes.actual_end_time,
  )

  // 1. Principais Desvios
  const principaisDesvios: string[] = []
  if (dev) {
    if (dev.start_deviation_minutes !== 0) {
      const verb = dev.start_deviation_minutes > 0 ? 'Atraso' : 'Adiantamento'
      principaisDesvios.push(
        `${verb} no início do teste: ${dev.start_deviation_formatted} (Previsto: ${test.expected_start_time || '08:00'} → Realizado: ${mes?.actual_start_time}).`,
      )
    }
    if (dev.end_deviation_minutes !== 0) {
      const verb = dev.end_deviation_minutes > 0 ? 'Atraso' : 'Término antecipado'
      principaisDesvios.push(
        `${verb} no término do teste: ${dev.end_deviation_formatted} (Previsto: ${test.expected_end_time || '10:30'} → Realizado: ${mes?.actual_end_time}).`,
      )
    }
    if (dev.duration_deviation_minutes !== 0) {
      principaisDesvios.push(
        `Variação da duração total: ${dev.duration_deviation_formatted} (${dev.percentage_deviation_formatted}) frente ao planejado de ${dev.planned_duration_formatted}.`,
      )
    }
    if (principaisDesvios.length === 0) {
      principaisDesvios.push(
        'Execução dentro das janelas programadas: início, término e duração sem variações significativas.',
      )
    }
  } else if (!hasMesData) {
    principaisDesvios.push(
      'Dados de execução realizada ainda não integrados via MES 4.0; desvios cronológicos pendentes de sincronização.',
    )
  }

  // 2. Evidências
  const evidencias: string[] = []
  evidencias.push(`Linha de Produção: ${test.production_line} | Empresa: ${test.company}.`)
  if (test.work_center) {
    evidencias.push(`Centro de Trabalho SAP: ${test.work_center}.`)
  }
  evidencias.push(
    `Período Planejado PCP: ${test.expected_start_date} ${test.expected_start_time || '08:00'} até ${test.expected_end_date || test.expected_start_date} ${test.expected_end_time || '10:30'} (Duração: ${test.expected_duration_formatted || '2 h 30 min'}).`,
  )

  if (hasMesData && mes) {
    evidencias.push(
      `Período Realizado MES 4.0: ${mes.actual_start_date} ${mes.actual_start_time} até ${mes.actual_end_date} ${mes.actual_end_time} (Duração Real: ${mes.actual_duration_formatted}).`,
    )
    if (mes.production_order) {
      evidencias.push(`Ordem de Produção (OP) vinculada no MES: ${mes.production_order}.`)
    }
    if (mes.material_code) {
      evidencias.push(
        `Material registrado: ${mes.material_code} - ${mes.material_description || 'Material Industrial'}.`,
      )
    }
    if (typeof mes.quantity_produced === 'number') {
      evidencias.push(
        `Volume efetivamente produzido: ${formatTonsPtBr(mes.quantity_produced)} (Unidade: ${mes.quantity_unit || 't'}).`,
      )
    }
    if (mes.occurrences && mes.occurrences.length > 0) {
      evidencias.push(
        `Ocorrências registradas pelo operador no MES: ${mes.occurrences.join('; ')}.`,
      )
    }
    if (mes.stops && mes.stops.length > 0) {
      const stopsStr = mes.stops
        .map((s) => `${s.reason_description} (${s.duration_minutes} min)`)
        .join(', ')
      evidencias.push(`Paradas apontadas no período: ${stopsStr}.`)
    }
  } else {
    evidencias.push('Execução Real: Aguardando sincronização de telemetria e ordens do MES 4.0.')
  }

  // 3. Possíveis Causas (SEMPRE como hipótese quando não houver causa confirmada)
  const possiveisCausas: string[] = []
  let hasSufficientData = false

  if (hasMesData && mes) {
    const hasStops = mes.stops && mes.stops.length > 0
    const hasOccurrences = mes.occurrences && mes.occurrences.length > 0
    const hasExplicitReason = Boolean(mes.main_stop_reason)

    if (hasExplicitReason) {
      hasSufficientData = true
      possiveisCausas.push(
        `[Causa Apontada no MES]: Motivo principal registrado em chão de fábrica: "${mes.main_stop_reason}".`,
      )
    }

    if (hasStops) {
      hasSufficientData = true
      mes.stops.forEach((s) => {
        possiveisCausas.push(
          `[Hipótese Operacional]: Parada codificada "${s.reason_code} - ${s.reason_description}" consumiu ${s.duration_minutes} min durante o intervalo do teste.`,
        )
      })
    }

    if (hasOccurrences) {
      hasSufficientData = true
      mes.occurrences.forEach((occ) => {
        possiveisCausas.push(
          `[Hipótese Técnica]: Evento de chão de fábrica registrado: "${occ}". Requer validação com a engenharia/operação.`,
        )
      })
    }

    if (!hasExplicitReason && !hasStops && !hasOccurrences) {
      // Regra estrita: se não há informação suficiente, declarar explicitamente
      hasSufficientData = false
      possiveisCausas.push(MSG_DADOS_INSUFICIENTES_CAUSA)
    }
  } else {
    hasSufficientData = false
    possiveisCausas.push(MSG_DADOS_INSUFICIENTES_CAUSA)
  }

  // 4. Impacto Produtivo
  const impactoProdutivo: string[] = []
  if (test.schedule_impact_type === 'PARADA_TOTAL') {
    const stopMins =
      (test.impact_data?.data as any)?.expectedDurationMinutes ||
      test.expected_duration_minutes ||
      0
    impactoProdutivo.push(
      `Planejamento PCP com Parada Total estimada de ${stopMins} min na linha ${test.production_line}.`,
    )
  } else if (test.schedule_impact_type === 'REDUCAO_RITMO') {
    const red = (test.impact_data?.data as any)?.calculatedReductionPercent || 0
    impactoProdutivo.push(
      `Planejamento PCP com Redução de Ritmo estimada em ${formatPercentagePTBR(red)} da capacidade nominal.`,
    )
  } else {
    impactoProdutivo.push('Planejamento PCP parametrizado como Sem Impacto de parada nominal.')
  }

  if (hasMesData && mes) {
    if (typeof mes.quantity_produced === 'number') {
      impactoProdutivo.push(
        `Produção realizada contabilizada pelo MES: ${formatTonsPtBr(mes.quantity_produced)}.`,
      )
    }
    if (mes.stops && mes.stops.length > 0) {
      const totalStopsMin = mes.stops.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)
      impactoProdutivo.push(
        `Tempo total improdutivo decorrente de paradas no período: ${totalStopsMin} min.`,
      )
    }
    if (dev?.duration_deviation_minutes && dev.duration_deviation_minutes > 0) {
      impactoProdutivo.push(
        `Tempo excedente de retenção da linha produtiva: +${dev.duration_deviation_minutes} min além do concedido pelo PCP.`,
      )
    }
  } else {
    impactoProdutivo.push('Impacto produtivo real consolidado será apurado após dados do MES 4.0.')
  }

  // 5. Recorrência (analisando histórico de testes na mesma linha / categoria)
  const recorrencia: string[] = []
  const similarTests = allTests.filter(
    (t) =>
      t.id !== test.id &&
      t.production_line === test.production_line &&
      t.test_category === test.test_category,
  )

  if (similarTests.length > 0) {
    const testsWithDev = similarTests.filter(
      (t) => t.deviation_metrics && t.deviation_metrics.classification !== 'DENTRO_PREVISTO',
    )
    recorrencia.push(
      `Foram localizados ${similarTests.length} testes semelhantes na Linha ${test.production_line} (Categoria: ${test.test_category}).`,
    )
    if (testsWithDev.length > 0) {
      recorrencia.push(
        `Histórico indica recorrência de variações: ${testsWithDev.length} de ${similarTests.length} testes apresentaram desvios anteriores de duração ou início.`,
      )
    } else {
      recorrencia.push(
        'Histórico na linha apresenta padrão de alta aderência nos testes anteriores cadastrados.',
      )
    }
  } else {
    recorrencia.push(
      `Primeiro registro com esta combinação de Linha (${test.production_line}) e Categoria (${test.test_category}) na base ativa do PCP Robotizado.`,
    )
  }

  // 6. Aprendizados
  const aprendizados: string[] = []
  if (test.efficacy_evaluation) {
    if (test.efficacy_evaluation.outcome === 'EFICAZ') {
      aprendizados.push(
        `Teste validado como EFICAZ pelo time técnico (${test.efficacy_evaluation.evaluatedBy || 'Engenharia'}). Parâmetros aptos para consolidação na Ficha Mestra.`,
      )
    } else if (test.efficacy_evaluation.outcome === 'INEFICAZ') {
      aprendizados.push(
        'Teste avaliado como INEFICAZ. Requer revisão das premissas e análise das restrições industriais.',
      )
    } else if (test.efficacy_evaluation.outcome === 'NOVO_TESTE_NECESSARIO') {
      aprendizados.push(
        'Resultados inconclusivos: foi apontada a necessidade de novo teste em janela futura.',
      )
    }
  } else {
    aprendizados.push('Avaliação de eficácia ainda pendente do encerramento das etapas técnicas.')
  }

  if (dev?.classification === 'DESVIO_CRITICO') {
    aprendizados.push(
      'Necessário reavaliar tempo padrão de setup e intervenção técnica concedido na programação inicial do PCP.',
    )
  }

  // 7. Ações Sugeridas (A IA só analisa/orienta, NUNCA executa)
  const acoesSugeridas: string[] = []
  if (!hasMesData) {
    acoesSugeridas.push(
      'Acionar botão "Sincronizar MES" assim que a execução do turno estiver finalizada pelo chão de fábrica.',
    )
  }
  if (dev?.start_deviation_minutes && dev.start_deviation_minutes > 15) {
    acoesSugeridas.push(
      'Alinhar com a supervisão de turno a liberação pontual da linha no horário programado pelo PCP.',
    )
  }
  if (dev?.duration_deviation_minutes && dev.duration_deviation_minutes > 20) {
    acoesSugeridas.push(
      'Revisar o tempo concedido no roteiro de testes industriais na Ficha Mestra para próximas intervenções similares.',
    )
  }
  if (test.efficacy_evaluation?.actionPlanRequired) {
    acoesSugeridas.push(
      `Acompanhar plano de ação corporativo (${test.efficacy_evaluation.actionPlanCode || 'PLANO PENDENTE'}) cadastrado para este teste.`,
    )
  }
  acoesSugeridas.push(
    'Apresentar análise na Reunião Semanal de Programação de Produção para deliberação conjunta PCP x Engenharia.',
  )

  return {
    principais_desvios: principaisDesvios,
    evidencias,
    possiveis_causas: possiveisCausas,
    impacto_produtivo: impactoProdutivo,
    recorrencia,
    aprendizados,
    acoes_sugeridas: acoesSugeridas,
    has_sufficient_data: hasSufficientData,
    generated_at: generatedAt,
  }
}

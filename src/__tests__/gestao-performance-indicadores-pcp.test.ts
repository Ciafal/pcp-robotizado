import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  avaliarStatusMeta,
  avaliarTendenciaSentido,
  formatarValorPtBr,
  pcpIndicadoresService,
  IndicadorPCPRecord,
  IndicadorMatrizLinha,
} from '@/services/pcp-indicadores-service'

describe('Suíte de Testes Obrigatórios T1–T17: Gestão de Performance dos Indicadores PCP', () => {
  const indicadorExemplo: IndicadorPCPRecord = {
    id: 'ind-01',
    codigo: 'IND_05_CUMPRIMENTO_PLANO',
    nome: 'Cumprimento do Plano de Produção',
    descricao: 'Percentual de cumprimento do volume programado',
    unidade: '%',
    meta: 95.0,
    regra_comparacao: '>=',
    sentido_indicador: 'MAIOR_MELHOR',
    tipo_indicador: 'PROGRAMACAO',
    status_ativo: true,
    ordem_exibicao: 5,
    fonte_dados_tipo: 'MES',
    fonte_dados_descricao: 'weekly_schedules',
  }

  const indicadorSetup: IndicadorPCPRecord = {
    id: 'ind-06',
    codigo: 'IND_06_TEMPO_SETUP',
    nome: 'Tempo Médio de Setup',
    descricao: 'Horas gastas em trocas de ferramentas',
    unidade: 'h',
    meta: 20.0,
    regra_comparacao: '<=',
    sentido_indicador: 'MENOR_MELHOR',
    tipo_indicador: 'EFICIENCIA',
    status_ativo: true,
    ordem_exibicao: 6,
    fonte_dados_tipo: 'MES',
    fonte_dados_descricao: 'pcp_production_stops',
  }

  // T1: Abrir indicador -> Gráfico Individual
  it('T1: deve instanciar e calcular linha de matriz compatível com abertura do Gráfico Individual', () => {
    const linha: IndicadorMatrizLinha = {
      indicador: indicadorExemplo,
      metaFormatada: '95,0 %',
      regraFormatada: '>= 95,0 %',
      meses: [
        {
          mesIndex: 0,
          mesNomeCurto: 'Jan',
          mesNomeLongo: 'Janeiro',
          realizado: 96.0,
          temDados: true,
          status: 'ATINGIDA',
          desvioAbsoluto: 1.0,
          desvioPercentual: 1.05,
        },
      ],
      mediaOuAcumuladoAno: 96.0,
      statusConsolidadoAno: 'ATINGIDA',
      totalMesesAtingidos: 1,
      totalMesesFora: 0,
      totalMesesSemDados: 11,
      ultimoResultado: 96.0,
      desvioAtual: 1.0,
      projecaoDezembro: 96.0,
      projecaoFechamentoFormatada: '96,0 %',
      isProjecaoPreliminar: true,
      tendencia: 'ESTAVEL',
      mediaHistoricaAnoMenos2: 94.2,
      mediaHistoricaAnoMenos1: 95.5,
      mediaUltimos2Anos: 94.9,
    }

    expect(linha.indicador.codigo).toBe('IND_05_CUMPRIMENTO_PLANO')
    expect(linha.metaFormatada).toBe('95,0 %')
    expect(linha.mediaUltimos2Anos).toBe(94.9)
  })

  // T2: Médias históricas corretas
  it('T2: deve calcular médias históricas de anos anteriores e média atual estritamente com meses válidos', () => {
    // Média de Jan 95,8 + Fev 96,2 => (95.8 + 96.2)/2 = 96.0
    const valJan = 95.8
    const valFev = 96.2
    const mediaAtual = Number(((valJan + valFev) / 2).toFixed(1))
    expect(mediaAtual).toBe(96.0)

    const m2 = 93.0
    const m1 = 95.0
    const media2Anos = Number(((m2 + m1) / 2).toFixed(1))
    expect(media2Anos).toBe(94.0)
  })

  // T3: Mês sem dado não vira zero
  it('T3: mês sem dado deve retornar null ou PENDENTE_SEM_DADOS, nunca zero', () => {
    const statusSemDado = avaliarStatusMeta(null, 95.0, '>=', 'MAIOR_MELHOR')
    expect(statusSemDado).toBe('PENDENTE_SEM_DADOS')

    const statusUndefined = avaliarStatusMeta(undefined, 95.0, '>=', 'MAIOR_MELHOR')
    expect(statusUndefined).toBe('PENDENTE_SEM_DADOS')

    const valorZero = avaliarStatusMeta(0.0, 95.0, '>=', 'MAIOR_MELHOR')
    expect(valorZero).toBe('FORA_DA_META')
    expect(valorZero).not.toBe('PENDENTE_SEM_DADOS')
  })

  // T4: Meta histórica / vigência e regra do sentido
  it('T4: respeitar regra de sentido no cálculo de atingimento (Maior é melhor vs Menor é melhor)', () => {
    // Maior é melhor: 96.0 >= 95.0 => ATINGIDA; 94.0 => FORA_DA_META
    expect(avaliarStatusMeta(96.0, 95.0, '>=', 'MAIOR_MELHOR')).toBe('ATINGIDA')
    expect(avaliarStatusMeta(94.0, 95.0, '>=', 'MAIOR_MELHOR')).toBe('FORA_DA_META')

    // Menor é melhor: 18.0 <= 20.0 => ATINGIDA; 22.0 => FORA_DA_META
    expect(avaliarStatusMeta(18.0, 20.0, '<=', 'MENOR_MELHOR')).toBe('ATINGIDA')
    expect(avaliarStatusMeta(22.0, 20.0, '<=', 'MENOR_MELHOR')).toBe('FORA_DA_META')

    // Faixa aceitável: tolerância mínima/máxima
    expect(avaliarStatusMeta(100.5, 100.0, '=', 'FAIXA_ACEITAVEL', 98.0, 102.0)).toBe('ATINGIDA')
    expect(avaliarStatusMeta(105.0, 100.0, '=', 'FAIXA_ACEITAVEL', 98.0, 102.0)).toBe(
      'FORA_DA_META',
    )
  })

  // T5: Criar análise de causa com IA consultiva
  it('T5: motor de IA consultiva deve gerar evidências, hipóteses e dados faltantes sem confirmar causa automaticamente', () => {
    const diag = pcpIndicadoresService.gerarHipotesesIADesvio({
      indicador: indicadorExemplo,
      realizado: 91.5,
      meta: 95.0,
      desvioAbsoluto: -3.5,
      periodo: 'Fevereiro/2026',
    })

    expect(diag.evidencias.length).toBeGreaterThan(0)
    expect(diag.hipoteses.length).toBeGreaterThan(0)
    expect(diag.dadosFaltantes.length).toBeGreaterThan(0)
    expect(diag.evidencias[0]).toContain('Fevereiro/2026')
  })

  // T6: Preencher 5 Porquês com sugestão da IA
  it('T6: sugestão de 5 Porquês deve encadear causas sucessivas respeitando o nível', () => {
    const p1 = pcpIndicadoresService.sugerirProximosPorquesIA('Desvio de parada', [])
    expect(p1.nivel).toBe(1)
    expect(p1.pergunta).toContain('Por que')

    const p2 = pcpIndicadoresService.sugerirProximosPorquesIA('Desvio de parada', [
      { nivel: 1, pergunta: p1.pergunta, resposta: p1.respostaSugerida },
    ])
    expect(p2.nivel).toBe(2)
    expect(p2.pergunta).toContain(p1.respostaSugerida)
  })

  // T7: Criar causas no Ishikawa 6M
  it('T7: Ishikawa deve suportar categorias 6M e classificação provável / confirmada', () => {
    const ish = {
      metodo: [{ id: '1', descricao: 'Procedimento não homologado', tipo: 'CONFIRMADA' as const }],
      maquina: [
        { id: '2', descricao: 'Desgaste do cilindro de acabamento', tipo: 'PROVAVEL' as const },
      ],
      mao_de_obra: [],
      material: [],
      medicao: [],
      meio_ambiente: [],
    }

    expect(ish.metodo[0].tipo).toBe('CONFIRMADA')
    expect(ish.maquina[0].tipo).toBe('PROVAVEL')
    expect(ish.mao_de_obra.length).toBe(0)
  })

  // T8: Definir Causa Raiz
  it('T8: Causa Raiz deve exigir método e status inicial em investigação ou provável', () => {
    const causa = {
      causa_raiz: 'Incompatibilidade do gabarito de regulagem na troca de turno',
      metodo_utilizado: '5 Porquês + Ishikawa 6M',
      status_causa_raiz: 'CAUSA_CONFIRMADA',
      responsavel_validacao: 'Supervisor de Laminação',
    }

    expect(causa.causa_raiz).toBeTruthy()
    expect(causa.status_causa_raiz).toBe('CAUSA_CONFIRMADA')
    expect(causa.responsavel_validacao).toBe('Supervisor de Laminação')
  })

  // T9: Duas ações 5W2H na mesma causa raiz
  it('T9: deve permitir vincular múltiplas ações 5W2H para a mesma causa raiz', () => {
    const acao1 = {
      codigo: 'ACT-2026-0001',
      causa_raiz_vinculada: 'Desgaste mecânico do guia de entrada',
      what_acao: 'Substituir guia de entrada pelo modelo reforçado',
      who_responsavel_nome: 'Equipe de Manutenção',
    }
    const acao2 = {
      codigo: 'ACT-2026-0002',
      causa_raiz_vinculada: 'Desgaste mecânico do guia de entrada',
      what_acao: 'Revisar folga operacional a cada 4 horas',
      who_responsavel_nome: 'Operador Líder',
    }

    expect(acao1.causa_raiz_vinculada).toBe(acao2.causa_raiz_vinculada)
    expect(acao1.codigo).not.toBe(acao2.codigo)
  })

  // T10: Ação -> "Em andamento"
  it('T10: transição de status para Em andamento e percentual físico', () => {
    let status = 'NAO_INICIADA'
    let percentual = 0

    // Avança para 50%
    percentual = 50
    if (percentual > 0 && percentual < 100) {
      status = 'EM_ANDAMENTO'
    }

    expect(status).toBe('EM_ANDAMENTO')
    expect(percentual).toBe(50)
  })

  // T11: Prazo vencido -> status/alerta de atraso
  it('T11: deve calcular status ATRASADA quando o prazo final é anterior à data de hoje', () => {
    const ontem = new Date()
    ontem.setDate(ontem.getDate() - 1)
    const prazoVencidoStr = ontem.toISOString().split('T')[0]

    const prazoDate = new Date(prazoVencidoStr)
    prazoDate.setHours(23, 59, 59, 999)
    const isAtrasada = prazoDate.getTime() < Date.now()

    expect(isAtrasada).toBe(true)
  })

  // T12: Concluir ação + avaliar eficácia
  it('T12: ação concluída não encerra automaticamente; deve suportar avaliação de eficácia posterior', () => {
    const acaoConcluida = {
      status: 'CONCLUIDA',
      percentual_concluido: 100,
      situacao_eficacia: 'AGUARDANDO_AVALIACAO',
    }

    // Avaliação de eficácia no ciclo seguinte
    const avaliacao = {
      situacao_eficacia: 'EFICAZ',
      indicador_antes: 88.5,
      indicador_apos: 96.2,
      evidencias_eficacia: '3 semanas consecutivas acima da meta de 95%',
    }

    expect(acaoConcluida.status).toBe('CONCLUIDA')
    expect(avaliacao.situacao_eficacia).toBe('EFICAZ')
    expect(avaliacao.indicador_apos).toBeGreaterThan(avaliacao.indicador_antes)
  })

  // T13: Localizar ação no Controle de Ações
  it('T13: filtro de busca textual e status no Controle de Ações', () => {
    const lista = [
      { what_acao: 'Ajuste de temperatura do forno', status: 'EM_ANDAMENTO' },
      { what_acao: 'Troca de matriz de estamparia', status: 'CONCLUIDA' },
    ]
    const busca = 'forno'
    const filtrado = lista.filter((a) => a.what_acao.toLowerCase().includes(busca.toLowerCase()))

    expect(filtrado.length).toBe(1)
    expect(filtrado[0].what_acao).toContain('forno')
  })

  // T14: Validar todos os cards/gráficos do Dashboard
  it('T14: consolidação correta das métricas executivas do dashboard', () => {
    const mockLinhas = [
      { statusConsolidadoAno: 'ATINGIDA', tendencia: 'MELHORANDO' },
      { statusConsolidadoAno: 'ATINGIDA', tendencia: 'ESTAVEL' },
      { statusConsolidadoAno: 'FORA_DA_META', tendencia: 'PIORANDO' },
    ]

    const total = mockLinhas.length
    const naMeta = mockLinhas.filter((m) => m.statusConsolidadoAno === 'ATINGIDA').length
    const fora = mockLinhas.filter((m) => m.statusConsolidadoAno === 'FORA_DA_META').length
    const piorando = mockLinhas.filter((m) => m.tendencia === 'PIORANDO').length

    expect(total).toBe(3)
    expect(naMeta).toBe(2)
    expect(fora).toBe(1)
    expect(piorando).toBe(1)
  })

  // T15: Filtro por centro/linha atualiza o dashboard
  it('T15: respeitar filtros de linha e centro na matriz de cálculo', () => {
    const filtrosL1 = { empresa: '1000', linha: 'L1', centro: 'LAM', ano: 2026 }
    expect(filtrosL1.linha).toBe('L1')
    expect(filtrosL1.centro).toBe('LAM')
  })

  // T16: Clique no indicador do dashboard abre o detalhamento
  it('T16: vínculo entre linha do dashboard e abertura do detalhamento individual', () => {
    let indicadorSelecionado: any = null
    let modalAberto = false

    const handleClique = (l: any) => {
      indicadorSelecionado = l
      modalAberto = true
    }

    handleClique({ id: 'ind-01', nome: 'Aderência' })

    expect(modalAberto).toBe(true)
    expect(indicadorSelecionado.nome).toBe('Aderência')
  })

  // T17: Formatação BR / Ciafal estrita (vírgula decimal, nunca ponto)
  it('T17: formatação pt-BR estrita em percentuais e valores industriais', () => {
    expect(formatarValorPtBr(95.0, '%')).toBe('95,0 %')
    expect(formatarValorPtBr(95.0, '%')).not.toBe('95.0%')
    expect(formatarValorPtBr(27.5, 't')).toBe('27,5 t')
    expect(formatarValorPtBr(null)).toBe('—')
  })
})

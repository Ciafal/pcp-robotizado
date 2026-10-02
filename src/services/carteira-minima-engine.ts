import { CarteiraMinimaItem, CriticidadeCarteiraMinima } from '@/types/carteira-minima'

/**
 * Arredonda valor para 3 casas decimais (padrão toneladas no PCP CIAFAL).
 */
export function roundTons(val: number): number {
  if (typeof val !== 'number' || isNaN(val)) return 0
  return Math.round(val * 1000) / 1000
}

/**
 * REGRA PRINCIPAL DE NEGÓCIO:
 * SALDO A PRODUZIR = CARTEIRA − ESTOQUE LIVRE
 *
 * Exemplo de validação obrigatória da especificação:
 * Carteira 68,000 t − Estoque livre 58,183 t = 9,817 t.
 */
export function calcularSaldoAProduzir(carteiraTons: number, estoqueLivreTons: number): number {
  const c = typeof carteiraTons === 'number' && !isNaN(carteiraTons) ? carteiraTons : 0
  const e = typeof estoqueLivreTons === 'number' && !isNaN(estoqueLivreTons) ? estoqueLivreTons : 0
  return roundTons(c - e)
}

/**
 * REGRA DE FILTRO DE LISTAGEM:
 * Listar SOMENTE registros onde:
 * saldo a produzir > 0 E saldo a produzir < quantidade mínima de produção.
 *
 * Não listar materiais cujo estoque livre já atenda integralmente a carteira (saldo <= 0).
 * Não listar materiais cujo saldo atinja ou supere a quantidade mínima de produção (saldo >= minima).
 */
export function isAbaixoCarteiraMinima(
  saldoProduzirTons: number,
  producaoMinimaTons: number,
): boolean {
  if (typeof saldoProduzirTons !== 'number' || isNaN(saldoProduzirTons)) return false
  if (typeof producaoMinimaTons !== 'number' || isNaN(producaoMinimaTons)) return false
  if (producaoMinimaTons <= 0) return false

  return saldoProduzirTons > 0 && saldoProduzirTons < producaoMinimaTons
}

/**
 * Calcula a diferença para atingir o lote mínimo de produção:
 * DIFERENÇA = PRODUÇÃO MÍNIMA − SALDO A PRODUZIR
 */
export function calcularDiferencaMinimo(
  producaoMinimaTons: number,
  saldoProduzirTons: number,
): number {
  const min =
    typeof producaoMinimaTons === 'number' && !isNaN(producaoMinimaTons) ? producaoMinimaTons : 0
  const saldo =
    typeof saldoProduzirTons === 'number' && !isNaN(saldoProduzirTons) ? saldoProduzirTons : 0
  return roundTons(Math.max(0, min - saldo))
}

/**
 * Formata número de pedido e item no formato estrito exigido: "251967 / 10"
 */
export function formatarPedidoItem(pedido: string, item: string): string {
  const p = (pedido || '').trim() || '—'
  const i = (item || '').trim() || '10'
  return `${p} / ${i}`
}

/**
 * CLASSIFICAÇÃO QUANTITATIVA DE CRITICIDADE:
 * Baseada em critérios objetivos determinísticos (prazos vs tempo de ciclo vs proximidade do mínimo).
 *
 * - Crítico:
 *     Prazo vencido, vencendo hoje ou prazo restante inferior/muito próximo ao tempo de ciclo médio de produção
 *     (dias úteis até data desejada <= 3 dias OU dias úteis < (tempo_ciclo_horas / 8)).
 * - Atenção:
 *     Carteira abaixo do mínimo com saldo substancial pendente, mas ainda há prazo hábil para tratamento
 *     (prazo entre 4 e 15 dias, ou diferença para o mínimo > 30% do lote mínimo).
 * - Monitoramento:
 *     Pequena diferença para atingir o mínimo (ex: saldo >= 70% do lote mínimo, diferença <= 30%)
 *     com prazo confortável (> 15 dias) e alta viabilidade de complementação da carteira.
 */
export interface CriticidadeResult {
  criticidade: CriticidadeCarteiraMinima
  motivo: string
}

export function classificarCriticidade(params: {
  saldoProduzirTons: number
  producaoMinimaTons: number
  dataDesejada: string
  tempoCicloMinutos?: number
  hojeRef?: Date
}): CriticidadeResult {
  const {
    saldoProduzirTons,
    producaoMinimaTons,
    dataDesejada,
    tempoCicloMinutos = 0,
    hojeRef,
  } = params

  const hoje = hojeRef ? new Date(hojeRef) : new Date()
  hoje.setHours(0, 0, 0, 0)

  let diasRestantes = 999
  if (dataDesejada) {
    // Trata formato YYYY-MM-DD ou ISO
    const parts = dataDesejada.split('T')[0].split('-')
    if (parts.length === 3) {
      const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      targetDate.setHours(0, 0, 0, 0)
      const diffMs = targetDate.getTime() - hoje.getTime()
      diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24))
    }
  }

  const tempoCicloHoras = (tempoCicloMinutos || 0) / 60
  // Dias industriais estimados para processar o ciclo
  const diasCicloEstimado = Math.max(1, Math.ceil(tempoCicloHoras / 16)) // 2 turnos/dia

  const pctAtingido = producaoMinimaTons > 0 ? (saldoProduzirTons / producaoMinimaTons) * 100 : 0
  const diferencaTons = roundTons(Math.max(0, producaoMinimaTons - saldoProduzirTons))

  // 1. CRÍTICO:
  // Prazo incompatível ou muito próximo considerando o tempo médio de ciclo
  if (diasRestantes <= diasCicloEstimado || diasRestantes <= 3) {
    return {
      criticidade: 'Crítico',
      motivo:
        diasRestantes < 0
          ? `Prazo do cliente vencido (${Math.abs(diasRestantes)} dias em atraso). Tempo de ciclo incompatível.`
          : `Prazo crítico de ${diasRestantes} dia(s) incompatível ou muito próximo ao tempo de ciclo (${tempoCicloMinutos} min).`,
    }
  }

  // 2. MONITORAMENTO:
  // Pequena diferença para atingir o mínimo (saldo >= 70% do lote mínimo) com prazo confortável (> 15 dias)
  if (pctAtingido >= 70 && diasRestantes > 15) {
    return {
      criticidade: 'Monitoramento',
      motivo: `Saldo já atinge ${pctAtingido.toFixed(1)}% do mínimo (falta apenas ${diferencaTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t) com prazo confortável (${diasRestantes} dias).`,
    }
  }

  // 3. ATENÇÃO:
  // Carteira abaixo do mínimo, mas ainda há prazo para tratamento operacional / agrupamento
  return {
    criticidade: 'Atenção',
    motivo: `Saldo de ${saldoProduzirTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t distante do mínimo (${diferencaTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t faltantes); prazo de ${diasRestantes} dias disponível para agrupamento.`,
  }
}

/**
 * MOTOR DE IA INTEGRADA:
 * Gera observação e diagnóstico com base EXCLUSIVAMENTE nos dados reais do item.
 *
 * REGRA ABSOLUTA DO PROJETO:
 * - A IA nunca inventa estoque, pedido, prazo, quantidade ou condição industrial;
 * - Quando não houver informação suficiente, exibe "Dado não disponível para análise.";
 * - A IA só analisa e recomenda — NUNCA altera pedidos, quantidades, datas ou programação;
 * - Decisão operacional sempre fica com o usuário.
 */
export function gerarObservacaoIa(item: {
  material: string
  descricao_material?: string
  carteira_tons: number
  estoque_livre_tons: number
  saldo_produzir_tons: number
  producao_minima_tons: number
  diferenca_minimo_tons: number
  data_desejada: string
  tempo_ciclo_minutos?: number
  centro?: string
  linha?: string
  pedido_venda?: string
  item_pedido?: string
}): string {
  if (
    !item.material ||
    item.producao_minima_tons === undefined ||
    item.saldo_produzir_tons === undefined
  ) {
    return 'Dado não disponível para análise.'
  }

  const saldoFmt = item.saldo_produzir_tons.toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
  const minFmt = item.producao_minima_tons.toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
  const difFmt = item.diferenca_minimo_tons.toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })

  const tempoTxt =
    item.tempo_ciclo_minutos && item.tempo_ciclo_minutos > 0
      ? `${item.tempo_ciclo_minutos} min`
      : 'dado não cadastrado'

  let dataTxt = 'data não informada'
  if (item.data_desejada) {
    const parts = item.data_desejada.split('T')[0].split('-')
    if (parts.length === 3) {
      dataTxt = `${parts[2]}/${parts[1]}/${parts[0]}`
    }
  }

  return `Carteira mínima de laminação não atingida. Saldo disponível para produção de ${saldoFmt} t frente à produção mínima de ${minFmt} t (diferença de ${difFmt} t). Verificar possibilidade de agrupamento com outras demandas, ajuste do pedido ou complementação da carteira considerando a data desejada (${dataTxt}) e o tempo médio de ciclo (${tempoTxt}).`
}

/**
 * Gera diagnóstico analítico estruturado da IA para o popup de detalhamento.
 */
export function gerarAnaliseDetalhadaIa(item: {
  material: string
  descricao_material?: string
  carteira_tons: number
  estoque_livre_tons: number
  saldo_produzir_tons: number
  producao_minima_tons: number
  diferenca_minimo_tons: number
  data_desejada: string
  tempo_ciclo_minutos?: number
  centro?: string
  linha?: string
  criticidade: CriticidadeCarteiraMinima
  motivo_criticidade: string
}): {
  diagnostico: string
  recomendacoes: string[]
} {
  const saldoFmt = item.saldo_produzir_tons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })
  const minFmt = item.producao_minima_tons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })
  const difFmt = item.diferenca_minimo_tons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })
  const estFmt = item.estoque_livre_tons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })

  const pctSaldoMinimo =
    item.producao_minima_tons > 0
      ? ((item.saldo_produzir_tons / item.producao_minima_tons) * 100).toFixed(1)
      : '0.0'

  const diagnostico =
    `Item classificado em nível [${item.criticidade.toUpperCase()}]. ` +
    `A carteira requer ${item.carteira_tons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t, sendo ${estFmt} t atendidas por estoque livre em depósito. ` +
    `O saldo real pendente de laminação é de ${saldoFmt} t, correspondente a ${pctSaldoMinimo}% do lote mínimo exigido pela linha (${minFmt} t), restando ${difFmt} t para viabilizar o setup produtivo.`

  const recomendacoes: string[] = [
    `Verificar na carteira geral se há outros pedidos pendentes do mesmo material (${item.material}) para montagem de campanha/lote conjunto.`,
    `Avaliar junto à área comercial a antecipação de pedidos de faturamento futuro para preenchimento das ${difFmt} t faltantes.`,
    `Analisar com o programador da linha ${item.linha || 'do centro'} a inclusão deste item em transição de bitola compatível, minimizando o impacto de setup.`,
    `Atenção: A decisão final sobre antecipação, reprogramação ou liberação excepcional cabe exclusivamente à equipe de PCP e liderança industrial.`,
  ]

  return { diagnostico, recomendacoes }
}

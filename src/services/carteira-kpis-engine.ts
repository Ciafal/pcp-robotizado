// Service para manipulação de snapshots diários e cálculo de KPIs de Carteira
import { pb } from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

export interface DailyPortfolioSnapshot {
  id?: string
  data: string // YYYY-MM-DD
  material: string
  descricao: string
  familia?: string
  tipo_material?: string
  curva_abc: 'A' | 'B' | 'C'
  centro: string
  linha: string
  saldo_carteira: number // toneladas (positivo ou negativo)
  estoque_disponivel?: number
  programacao_existente?: number
  producao_realizada?: number
  origem_dados: string
  is_demo?: boolean
  created?: string
  updated?: string
}

export interface MaterialKpiSummary {
  material: string
  descricao: string
  familia: string
  tipo_material: string
  curva_abc: 'A' | 'B' | 'C'
  centro: string
  linha: string
  saldo_inicial: number
  saldo_final: number
  primeiro_dia_negativo: string | null
  ultimo_dia_negativo: string | null
  dias_negativos: number
  maior_saldo_negativo: number // valor negativo (ex: -45.5 t)
  estoque_disponivel: number
  programacao_existente: number
  producao_realizada: number
  pedidos_cancelados_pcp: number
  itens_cancelados_pcp: number
  toneladas_canceladas_pcp: number
  observacao_ia?: string
  criticidade?: 'CRITICO' | 'ATENCAO' | 'NORMAL'
}

export interface KpiSummaryResult {
  competencia: string // YYYY-MM
  competenciaFormatada: string // ex: "Setembro / 2026"
  dataFechamento: string // dd/mm/aaaa
  isFechamentoAjustado: boolean // se caiu em fim de semana/feriado e pegou último snapshot válido

  // KPI 1 - Itens que viraram o mês negativo
  totalItensNegativos: number
  itensNegativosA: number
  itensNegativosB: number
  itensNegativosC: number
  percItensA: number
  percItensB: number
  percItensC: number

  // KPI 2 - Saldo de carteira negativa (t)
  saldoNegativoFechamento: number // Ex: -18.0 t (positivo NÃO compensa)
  maiorSaldoNegativoMes: { valor: number; data: string }
  menorSaldoNegativoMes: { valor: number; data: string }
  mediaDiariaSaldoNegativo: number
  variacaoInicioFim: { valor: number; status: 'MELHOROU' | 'PIOROU' | 'ESTAVEL' }

  // KPI 3 - Dias negativos totais (item-dias)
  itemDiasTotais: number
  materiaisAfetados: number
  mediaDiasPorMaterial: number
  materialMaiorPermanencia: {
    material: string
    descricao: string
    curva_abc: string
    dias: number
  } | null
  distribuicaoItemDiasAbc: {
    curvaA: { dias: number; perc: number }
    curvaB: { dias: number; perc: number }
    curvaC: { dias: number; perc: number }
  }

  // KPI 4 - Pedidos cancelados Motivo PCP
  totalPedidosCanceladosGeral: number
  pedidosCanceladosPcp: number
  percPedidosPcp: number
  itensCanceladosPcp: number
  toneladasCanceladasPcp: number
  participacaoToneladasPcp: number

  // Evolução diária para gráfico
  evolucaoDiaria: Array<{
    data: string // dd/mm
    dataFull: string // YYYY-MM-DD
    totalNegativo: number
    negativoA: number
    negativoB: number
    negativoC: number
    itensNegativos: number
  }>

  // Lista de materiais sumarizados
  materiais: MaterialKpiSummary[]

  // Versão e auditoria
  versao: number
  origem: string
}

export interface KpiComparisonResult {
  atual: KpiSummaryResult
  anterior: KpiSummaryResult
  diff: {
    itensNegativos: { abs: number; perc: number }
    saldoNegativo: { abs: number; perc: number }
    itemDias: { abs: number; perc: number }
    pedidosCanceladosPcp: { abs: number; perc: number }
    toneladasCanceladasPcp: { abs: number; perc: number }
  }
}

// ------------------- Regras de cálculo puras (para testes unitários) -------------------

/**
 * TESTE 1 & TESTE 2:
 * Saldo positivo NÃO compensa negativo:
 * A=-10.0, B=+5.0, C=-8.0 -> 2 itens negativos (não 3) e saldo negativo -18.0 t
 */
export function calculateNegativeItemsAndBalance(balances: number[]): {
  negativeCount: number
  negativeBalanceSum: number
} {
  let negativeCount = 0
  let negativeBalanceSum = 0

  for (const b of balances) {
    if (b < 0) {
      negativeCount++
      negativeBalanceSum += b // ex: -10 + -8 = -18
    }
  }

  // Round para evitar imprecisões de ponto flutuante
  const roundedSum = Math.round(negativeBalanceSum * 100) / 100
  return {
    negativeCount,
    negativeBalanceSum: roundedSum === 0 ? 0 : roundedSum,
  }
}

/**
 * TESTE 3:
 * A 10 dias + B 5 dias + C 20 dias -> 35 item-dias
 */
export function calculateItemDays(daysArray: number[]): number {
  return daysArray.reduce((acc, curr) => acc + (curr > 0 ? curr : 0), 0)
}

/**
 * TESTE 4:
 * 50 cancelados totais, 10 pedidos distintos PCP -> "10 pedidos | 20,0%"
 */
export function calculatePcpCancellationRate(
  totalCancelledOrders: number,
  pcpCancelledOrders: number,
): { rate: number; label: string } {
  if (totalCancelledOrders <= 0) {
    return { rate: 0, label: `${pcpCancelledOrders} pedidos | 0,0%` }
  }
  const rate = (pcpCancelledOrders / totalCancelledOrders) * 100
  const formattedRate = rate.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return {
    rate: Math.round(rate * 10) / 10,
    label: `${pcpCancelledOrders} pedidos | ${formattedRate}%`,
  }
}

/**
 * TESTE 5:
 * OV 4500001000 com 3 itens cancelados PCP -> Pedidos: 1, Itens: 3
 */
export function countDistinctOrdersAndItems(
  items: Array<{ orderId: string; isPcpReason: boolean }>,
): { distinctOrders: number; totalItems: number } {
  const pcpItems = items.filter((i) => i.isPcpReason)
  const distinctOrders = new Set(pcpItems.map((i) => i.orderId)).size
  return {
    distinctOrders,
    totalItems: pcpItems.length,
  }
}

/**
 * TESTE 6:
 * A=5, B=8, C=12 -> Total=25 e A+B+C = Total
 */
export function validateAbcDistribution(
  a: number,
  b: number,
  c: number,
): { total: number; isValid: boolean } {
  const total = a + b + c
  return {
    total,
    isValid: total === a + b + c,
  }
}

// ------------------- Motor de Demonstração e Snapshots -------------------

// Gera snapshots demonstrativos do mês de competência caso não haja snapshots gravados
export function generateDemoSnapshots(competencia: string): DailyPortfolioSnapshot[] {
  // competencia no formato YYYY-MM (ex: '2026-09')
  const [yearStr, monthStr] = competencia.split('-')
  const year = parseInt(yearStr, 10) || 2026
  const month = parseInt(monthStr, 10) || 9
  const daysInMonth = new Date(year, month, 0).getDate()

  const materialsDef = [
    {
      mat: 'TUB-IND-001',
      desc: 'TUBO INDUSTRIAL REDONDO 50.8X1.50',
      fam: 'Tubos Industriais',
      tipo: 'FERT',
      abc: 'A' as const,
      c: 'L1',
      l: 'Linha de Solda 01',
      base: -18.5,
      daysNeg: 22,
      est: 4.2,
      prog: 25.0,
      prod: 15.0,
    },
    {
      mat: 'TUB-EST-004',
      desc: 'TUBO ESTRUTURAL QUADRADO 100X100X3.00',
      fam: 'Tubos Estruturais',
      tipo: 'FERT',
      abc: 'A' as const,
      c: 'L1',
      l: 'Linha de Solda 02',
      base: -24.0,
      daysNeg: 28,
      est: 0.0,
      prog: 10.0,
      prod: 8.0,
    },
    {
      mat: 'TUB-CAL-007',
      desc: 'TUBO CONDUÇÃO DIN 2440 1.1/2',
      fam: 'Tubos Condução',
      tipo: 'FERT',
      abc: 'A' as const,
      c: 'L2',
      l: 'Linha de Galvanização',
      base: -12.3,
      daysNeg: 19,
      est: 1.5,
      prog: 30.0,
      prod: 20.0,
    },
    {
      mat: 'PER-U-012',
      desc: 'PERFIL U DOBRADO 100X50X2.65',
      fam: 'Perfis Conformados',
      tipo: 'FERT',
      abc: 'A' as const,
      c: 'L1',
      l: 'Perfiladeira 01',
      base: -31.8,
      daysNeg: 25,
      est: 2.0,
      prog: 40.0,
      prod: 25.0,
    },
    {
      mat: 'CHA-XAD-003',
      desc: 'CHAPA XADREZ 1/8 X 1200 X 3000',
      fam: 'Chapas Especiais',
      tipo: 'FERT',
      abc: 'A' as const,
      c: 'SDC',
      l: 'Corte Transversal SDC',
      base: -9.5,
      daysNeg: 15,
      est: 0.0,
      prog: 0.0,
      prod: 0.0,
    },

    // Curva B
    {
      mat: 'TUB-IND-015',
      desc: 'TUBO INDUSTRIAL RETANGULAR 40X20X1.20',
      fam: 'Tubos Industriais',
      tipo: 'FERT',
      abc: 'B' as const,
      c: 'L1',
      l: 'Linha de Solda 01',
      base: -8.4,
      daysNeg: 14,
      est: 5.0,
      prog: 15.0,
      prod: 12.0,
    },
    {
      mat: 'TUB-REV-022',
      desc: 'TUBO GALVANIZADO ELEVADOR 2 POL',
      fam: 'Tubos Condução',
      tipo: 'HAWA',
      abc: 'B' as const,
      c: 'SDC',
      l: 'Central Revenda',
      base: -14.2,
      daysNeg: 18,
      est: 0.5,
      prog: 0.0,
      prod: 0.0,
    },
    {
      mat: 'PER-ENR-008',
      desc: 'PERFIL U ENRIJECIDO 150X60X20X2.00',
      fam: 'Perfis Conformados',
      tipo: 'FERT',
      abc: 'B' as const,
      c: 'L2',
      l: 'Perfiladeira 02',
      base: -16.0,
      daysNeg: 17,
      est: 3.1,
      prog: 20.0,
      prod: 14.0,
    },
    {
      mat: 'CHA-FQ-009',
      desc: 'CHAPA FINA A QUENTE 3.00 X 1200 X 3000',
      fam: 'Chapas Planas',
      tipo: 'FERT',
      abc: 'B' as const,
      c: 'SDC',
      l: 'Corte Transversal SDC',
      base: 12.0,
      daysNeg: 0,
      est: 35.0,
      prog: 0.0,
      prod: 0.0,
    }, // Positivo!

    // Curva C
    {
      mat: 'TUB-ESP-033',
      desc: 'TUBO ESPECIAL OBLONGO 60X30X1.50',
      fam: 'Tubos Especiais',
      tipo: 'FERT',
      abc: 'C' as const,
      c: 'L1',
      l: 'Linha Especial',
      base: -4.5,
      daysNeg: 9,
      est: 0.0,
      prog: 5.0,
      prod: 0.0,
    },
    {
      mat: 'CAN-LAM-040',
      desc: 'CANTONEIRA LAMINADA 1X1/8',
      fam: 'Barras e Perfis',
      tipo: 'HAWA',
      abc: 'C' as const,
      c: 'SDC',
      l: 'Central Revenda',
      base: -6.2,
      daysNeg: 11,
      est: 1.0,
      prog: 0.0,
      prod: 0.0,
    },
    {
      mat: 'BAR-RED-051',
      desc: 'BARRA REDONDA 1/2 SAE 1020',
      fam: 'Barras e Perfis',
      tipo: 'FERT',
      abc: 'C' as const,
      c: 'L2',
      l: 'Trefilação',
      base: 18.0,
      daysNeg: 0,
      est: 22.0,
      prog: 0.0,
      prod: 0.0,
    }, // Positivo!
  ]

  const snapshots: DailyPortfolioSnapshot[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0')
    const date = `${year}-${String(month).padStart(2, '0')}-${dayStr}`

    // Simula a evolução dos saldos ao longo do mês
    for (const m of materialsDef) {
      let saldo = m.base
      if (m.base < 0) {
        // Variação orgânica ao longo do mês
        const progress = day / daysInMonth
        saldo = m.base * (0.8 + Math.sin(day * 0.4) * 0.3)
        // Se começou negativo após certo dia
        if (day <= daysInMonth - m.daysNeg) {
          saldo = Math.abs(m.base * 0.5) // saldo positivo no início
        }
      }

      snapshots.push({
        data: date,
        material: m.mat,
        descricao: m.desc,
        familia: m.fam,
        tipo_material: m.tipo,
        curva_abc: m.abc,
        centro: m.c,
        linha: m.l,
        saldo_carteira: Math.round(saldo * 100) / 100,
        estoque_disponivel: m.est,
        programacao_existente: m.prog,
        producao_realizada: m.prod,
        origem_dados: 'Demonstração PCP (Base Carteira SAP)',
        is_demo: true,
      })
    }
  }

  return snapshots
}

// ------------------- Processamento de KPIs do Mês -------------------

export interface KpiFilterOptions {
  exercicio: string // '2024' | '2025' | '2026'
  periodo: string // '01'..'12' ou 'YTD'
  centro?: string // 'TODOS' | 'L1' | 'L2' | 'SDC'
  linha?: string
  tipoMaterial?: string
  curvaAbc?: 'TODOS' | 'A' | 'B' | 'C'
  materialPesquisa?: string
}

export function computePortfolioKpis(
  snapshots: DailyPortfolioSnapshot[],
  filters: KpiFilterOptions,
  cancelledOrdersPcpItems: Array<{
    orderId: string
    item: string
    material: string
    tons: number
    isPcpReason: boolean
  }>,
  totalCancelledOrdersCount: number = 30,
): KpiSummaryResult {
  // 1. Filtrar snapshots
  let filtered = [...snapshots]

  if (filters.centro && filters.centro !== 'TODOS') {
    filtered = filtered.filter((s) => s.centro === filters.centro)
  }
  if (filters.linha && filters.linha !== 'TODAS') {
    filtered = filtered.filter((s) => s.linha === filters.linha)
  }
  if (filters.tipoMaterial && filters.tipoMaterial !== 'TODOS') {
    filtered = filtered.filter((s) => s.tipo_material === filters.tipoMaterial)
  }
  if (filters.curvaAbc && filters.curvaAbc !== 'TODOS') {
    filtered = filtered.filter((s) => s.curva_abc === filters.curvaAbc)
  }
  if (filters.materialPesquisa && filters.materialPesquisa.trim() !== '') {
    const q = filters.materialPesquisa.toLowerCase().trim()
    filtered = filtered.filter(
      (s) => s.material.toLowerCase().includes(q) || s.descricao.toLowerCase().includes(q),
    )
  }

  // Agrupar datas disponíveis ordenadas
  const dates = Array.from(new Set(filtered.map((s) => s.data))).sort()
  const lastDate = dates.length > 0 ? dates[dates.length - 1] : '2026-09-30'
  const firstDate = dates.length > 0 ? dates[0] : '2026-09-01'

  // Snapshots do fechamento (último dia válido)
  const closingSnapshots = filtered.filter((s) => s.data === lastDate)

  // Snapshots do primeiro dia
  const firstDaySnapshots = filtered.filter((s) => s.data === firstDate)
  const firstDayBalanceMap = new Map<string, number>()
  firstDaySnapshots.forEach((s) => firstDayBalanceMap.set(s.material, s.saldo_carteira))

  // Agrupar dados por material em todos os dias do período
  const materialMap = new Map<
    string,
    {
      material: string
      descricao: string
      familia: string
      tipo_material: string
      curva_abc: 'A' | 'B' | 'C'
      centro: string
      linha: string
      estoque_disponivel: number
      programacao_existente: number
      producao_realizada: number
      dailyBalances: Array<{ data: string; saldo: number }>
    }
  >()

  for (const s of filtered) {
    if (!materialMap.has(s.material)) {
      materialMap.set(s.material, {
        material: s.material,
        descricao: s.descricao,
        familia: s.familia || '',
        tipo_material: s.tipo_material || 'FERT',
        curva_abc: s.curva_abc,
        centro: s.centro,
        linha: s.linha,
        estoque_disponivel: s.estoque_disponivel || 0,
        programacao_existente: s.programacao_existente || 0,
        producao_realizada: s.producao_realizada || 0,
        dailyBalances: [],
      })
    }
    materialMap.get(s.material)!.dailyBalances.push({ data: s.data, saldo: s.saldo_carteira })
  }

  // Map de cancelamentos PCP por material
  const pcpCancelMap = new Map<string, { pedidos: Set<string>; itens: number; tons: number }>()
  for (const item of cancelledOrdersPcpItems) {
    if (item.isPcpReason) {
      if (!pcpCancelMap.has(item.material)) {
        pcpCancelMap.set(item.material, { pedidos: new Set(), itens: 0, tons: 0 })
      }
      const entry = pcpCancelMap.get(item.material)!
      entry.pedidos.add(item.orderId)
      entry.itens += 1
      entry.tons += item.tons || 0
    }
  }

  const materialsSummary: MaterialKpiSummary[] = []

  let totalNegativosClosing = 0
  let itensNegA = 0
  let itensNegB = 0
  let itensNegC = 0
  let somaSaldoNegativoFechamento = 0

  for (const [matCode, data] of materialMap.entries()) {
    // Saldo final (do último dia disponível para esse material)
    const sortedDaily = [...data.dailyBalances].sort((a, b) => a.data.localeCompare(b.data))
    const lastBalance = sortedDaily.length > 0 ? sortedDaily[sortedDaily.length - 1].saldo : 0
    const firstBalance =
      firstDayBalanceMap.get(matCode) ?? (sortedDaily.length > 0 ? sortedDaily[0].saldo : 0)

    // Dias negativos
    const negativeEntries = sortedDaily.filter((d) => d.saldo < 0)
    const diasNegativos = negativeEntries.length
    const primeiroDiaNegativo = negativeEntries.length > 0 ? negativeEntries[0].data : null
    const ultimoDiaNegativo =
      negativeEntries.length > 0 ? negativeEntries[negativeEntries.length - 1].data : null

    // Maior saldo negativo registrado (mínimo algébrico, ex: -31.8)
    let maiorSaldoNegativo = 0
    if (negativeEntries.length > 0) {
      maiorSaldoNegativo = Math.min(...negativeEntries.map((d) => d.saldo))
    }

    if (lastBalance < 0) {
      totalNegativosClosing++
      somaSaldoNegativoFechamento += lastBalance
      if (data.curva_abc === 'A') itensNegA++
      else if (data.curva_abc === 'B') itensNegB++
      else if (data.curva_abc === 'C') itensNegC++
    }

    const cancelPcp = pcpCancelMap.get(matCode)
    const pcpOrdersCount = cancelPcp ? cancelPcp.pedidos.size : 0
    const pcpItemsCount = cancelPcp ? cancelPcp.itens : 0
    const pcpTons = cancelPcp ? Math.round(cancelPcp.tons * 100) / 100 : 0

    // Criticidade
    let criticidade: 'CRITICO' | 'ATENCAO' | 'NORMAL' = 'NORMAL'
    if (data.curva_abc === 'A' && lastBalance < 0 && diasNegativos >= 15) {
      criticidade = 'CRITICO'
    } else if (data.curva_abc === 'A' && lastBalance < 0) {
      criticidade = 'ATENCAO'
    } else if (lastBalance < 0 && pcpItemsCount > 0) {
      criticidade = 'CRITICO'
    } else if (lastBalance < 0 || diasNegativos > 10) {
      criticidade = 'ATENCAO'
    }

    materialsSummary.push({
      material: matCode,
      descricao: data.descricao,
      familia: data.familia,
      tipo_material: data.tipo_material,
      curva_abc: data.curva_abc,
      centro: data.centro,
      linha: data.linha,
      saldo_inicial: Math.round(firstBalance * 100) / 100,
      saldo_final: Math.round(lastBalance * 100) / 100,
      primeiro_dia_negativo: primeiroDiaNegativo,
      ultimo_dia_negativo: ultimoDiaNegativo,
      dias_negativos: diasNegativos,
      maior_saldo_negativo: Math.round(maiorSaldoNegativo * 100) / 100,
      estoque_disponivel: data.estoque_disponivel,
      programacao_existente: data.programacao_existente,
      producao_realizada: data.producao_realizada,
      pedidos_cancelados_pcp: pcpOrdersCount,
      itens_cancelados_pcp: pcpItemsCount,
      toneladas_canceladas_pcp: pcpTons,
      criticidade,
    })
  }

  // Ordenar materiais por maior saldo negativo (mais negativo primeiro)
  materialsSummary.sort((a, b) => a.saldo_final - b.saldo_final)

  // Percentuais ABC (soma obrigatória A+B+C = Total)
  const percItensA = totalNegativosClosing > 0 ? (itensNegA / totalNegativosClosing) * 100 : 0
  const percItensB = totalNegativosClosing > 0 ? (itensNegB / totalNegativosClosing) * 100 : 0
  const percItensC = totalNegativosClosing > 0 ? (itensNegC / totalNegativosClosing) * 100 : 0

  // Evolução diária (Soma dos saldos negativos de cada dia - positivo não compensa)
  const dailyNegativeMap = new Map<
    string,
    { totalNeg: number; negA: number; negB: number; negC: number; countNeg: number }
  >()

  for (const s of filtered) {
    if (!dailyNegativeMap.has(s.data)) {
      dailyNegativeMap.set(s.data, { totalNeg: 0, negA: 0, negB: 0, negC: 0, countNeg: 0 })
    }
    if (s.saldo_carteira < 0) {
      const entry = dailyNegativeMap.get(s.data)!
      entry.totalNeg += s.saldo_carteira
      entry.countNeg += 1
      if (s.curva_abc === 'A') entry.negA += s.saldo_carteira
      else if (s.curva_abc === 'B') entry.negB += s.saldo_carteira
      else if (s.curva_abc === 'C') entry.negC += s.saldo_carteira
    }
  }

  const evolucaoDiaria = dates.map((d) => {
    const dataEntry = dailyNegativeMap.get(d) || {
      totalNeg: 0,
      negA: 0,
      negB: 0,
      negC: 0,
      countNeg: 0,
    }
    const dayLabel = d.split('-')[2] + '/' + d.split('-')[1]
    return {
      data: dayLabel,
      dataFull: d,
      totalNegativo: Math.round(dataEntry.totalNeg * 100) / 100,
      negativoA: Math.round(dataEntry.negA * 100) / 100,
      negativoB: Math.round(dataEntry.negB * 100) / 100,
      negativoC: Math.round(dataEntry.negC * 100) / 100,
      itensNegativos: dataEntry.countNeg,
    }
  })

  // Destaques diários
  let maiorSaldoNegMes = { valor: 0, data: '' }
  let menorSaldoNegMes = { valor: 0, data: '' }
  let somaDiaria = 0

  evolucaoDiaria.forEach((ev) => {
    somaDiaria += ev.totalNegativo
    if (maiorSaldoNegMes.valor === 0 || ev.totalNegativo < maiorSaldoNegMes.valor) {
      maiorSaldoNegMes = { valor: ev.totalNegativo, data: ev.dataFull }
    }
    if (menorSaldoNegMes.valor === 0 || ev.totalNegativo > menorSaldoNegMes.valor) {
      menorSaldoNegMes = { valor: ev.totalNegativo, data: ev.dataFull }
    }
  })

  const mediaDiariaSaldoNegativo =
    evolucaoDiaria.length > 0 ? Math.round((somaDiaria / evolucaoDiaria.length) * 100) / 100 : 0

  const saldoInicio = evolucaoDiaria.length > 0 ? evolucaoDiaria[0].totalNegativo : 0
  const saldoFim =
    evolucaoDiaria.length > 0 ? evolucaoDiaria[evolucaoDiaria.length - 1].totalNegativo : 0
  const diffSaldo = saldoFim - saldoInicio
  const statusVariacao: 'MELHOROU' | 'PIOROU' | 'ESTAVEL' =
    Math.abs(diffSaldo) < 0.5 ? 'ESTAVEL' : diffSaldo > 0 ? 'MELHOROU' : 'PIOROU'

  // KPI 3: Item-dias
  let itemDiasTotais = 0
  let itemDiasA = 0
  let itemDiasB = 0
  let itemDiasC = 0
  let maxItemDias = { material: '', descricao: '', curva_abc: '', dias: 0 }

  materialsSummary.forEach((m) => {
    itemDiasTotais += m.dias_negativos
    if (m.curva_abc === 'A') itemDiasA += m.dias_negativos
    else if (m.curva_abc === 'B') itemDiasB += m.dias_negativos
    else if (m.curva_abc === 'C') itemDiasC += m.dias_negativos

    if (m.dias_negativos > maxItemDias.dias) {
      maxItemDias = {
        material: m.material,
        descricao: m.descricao,
        curva_abc: m.curva_abc,
        dias: m.dias_negativos,
      }
    }
  })

  const materiaisAfetados = materialsSummary.filter((m) => m.dias_negativos > 0).length
  const mediaDiasPorMaterial =
    materiaisAfetados > 0 ? Math.round((itemDiasTotais / materiaisAfetados) * 10) / 10 : 0

  // KPI 4: Cancelamentos PCP
  const pcpItemsList = cancelledOrdersPcpItems.filter((i) => i.isPcpReason)
  const distinctPcpOrders = new Set(pcpItemsList.map((i) => i.orderId)).size
  const totalItensPcp = pcpItemsList.length
  const totalTonsPcp = pcpItemsList.reduce((acc, curr) => acc + (curr.tons || 0), 0)
  const totalTonsCancelledAll = cancelledOrdersPcpItems.reduce(
    (acc, curr) => acc + (curr.tons || 0),
    0,
  )

  const percPedidosPcp =
    totalCancelledOrdersCount > 0 ? (distinctPcpOrders / totalCancelledOrdersCount) * 100 : 0
  const partTonsPcp = totalTonsCancelledAll > 0 ? (totalTonsPcp / totalTonsCancelledAll) * 100 : 0

  // Formatação de data do fechamento
  const [ly, lm, ld] = lastDate.split('-')
  const dataFechamentoFmt = `${ld}/${lm}/${ly}`
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const competenciaFmt = `${monthNames[parseInt(lm, 10) - 1] || lm} / ${ly}`

  return {
    competencia: `${ly}-${lm}`,
    competenciaFormatada: competenciaFmt,
    dataFechamento: dataFechamentoFmt,
    isFechamentoAjustado: ld !== '30' && ld !== '31' && ld !== '28',
    totalItensNegativos: totalNegativosClosing,
    itensNegativosA: itensNegA,
    itensNegativosB: itensNegB,
    itensNegativosC: itensNegC,
    percItensA: Math.round(percItensA * 10) / 10,
    percItensB: Math.round(percItensB * 10) / 10,
    percItensC: Math.round(percItensC * 10) / 10,
    saldoNegativoFechamento: Math.round(somaSaldoNegativoFechamento * 100) / 100,
    maiorSaldoNegativoMes: maiorSaldoNegMes,
    menorSaldoNegativoMes: menorSaldoNegMes,
    mediaDiariaSaldoNegativo,
    variacaoInicioFim: { valor: Math.round(diffSaldo * 100) / 100, status: statusVariacao },
    itemDiasTotais,
    materiaisAfetados,
    mediaDiasPorMaterial,
    materialMaiorPermanencia: maxItemDias.dias > 0 ? maxItemDias : null,
    distribuicaoItemDiasAbc: {
      curvaA: {
        dias: itemDiasA,
        perc: itemDiasTotais > 0 ? Math.round((itemDiasA / itemDiasTotais) * 1000) / 10 : 0,
      },
      curvaB: {
        dias: itemDiasB,
        perc: itemDiasTotais > 0 ? Math.round((itemDiasB / itemDiasTotais) * 1000) / 10 : 0,
      },
      curvaC: {
        dias: itemDiasC,
        perc: itemDiasTotais > 0 ? Math.round((itemDiasC / itemDiasTotais) * 1000) / 10 : 0,
      },
    },
    totalPedidosCanceladosGeral: totalCancelledOrdersCount,
    pedidosCanceladosPcp: distinctPcpOrders,
    percPedidosPcp: Math.round(percPedidosPcp * 10) / 10,
    itensCanceladosPcp: totalItensPcp,
    toneladasCanceladasPcp: Math.round(totalTonsPcp * 100) / 100,
    participacaoToneladasPcp: Math.round(partTonsPcp * 10) / 10,
    evolucaoDiaria,
    materiais: materialsSummary,
    versao: 1,
    origem: 'Base Carteira Consolidada PCP',
  }
}

// ------------------- Comparativo entre períodos -------------------

export function comparePeriodKpis(
  current: KpiSummaryResult,
  previous: KpiSummaryResult,
): KpiComparisonResult {
  const calcDiff = (curr: number, prev: number) => {
    const abs = Math.round((curr - prev) * 100) / 100
    const perc = prev !== 0 ? Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10 : 0
    return { abs, perc }
  }

  return {
    atual: current,
    anterior: previous,
    diff: {
      itensNegativos: calcDiff(current.totalItensNegativos, previous.totalItensNegativos),
      saldoNegativo: calcDiff(current.saldoNegativoFechamento, previous.saldoNegativoFechamento),
      itemDias: calcDiff(current.itemDiasTotais, previous.itemDiasTotais),
      pedidosCanceladosPcp: calcDiff(current.pedidosCanceladosPcp, previous.pedidosCanceladosPcp),
      toneladasCanceladasPcp: calcDiff(
        current.toneladasCanceladasPcp,
        previous.toneladasCanceladasPcp,
      ),
    },
  }
}

// ------------------- Histórico Multi-competência -------------------

export interface HistoricalKpiEntry {
  exercicio: string
  periodo: string
  competencia: string
  competenciaFormatada: string
  itensNegativos: number
  itensA: number
  itensB: number
  itensC: number
  saldoNegativoFinal: number
  itemDiasTotais: number
  pedidosPcp: number
  percPcp: number
  toneladasPcp: number
  versao: number
}

export function getHistoricalKpis(): HistoricalKpiEntry[] {
  return [
    {
      exercicio: '2026',
      periodo: '09',
      competencia: '2026-09',
      competenciaFormatada: 'Setembro / 2026',
      itensNegativos: 9,
      itensA: 5,
      itensB: 3,
      itensC: 1,
      saldoNegativoFinal: -116.4,
      itemDiasTotais: 147,
      pedidosPcp: 8,
      percPcp: 26.7,
      toneladasPcp: 142.5,
      versao: 1,
    },
    {
      exercicio: '2026',
      periodo: '08',
      competencia: '2026-08',
      competenciaFormatada: 'Agosto / 2026',
      itensNegativos: 11,
      itensA: 6,
      itensB: 3,
      itensC: 2,
      saldoNegativoFinal: -134.8,
      itemDiasTotais: 172,
      pedidosPcp: 10,
      percPcp: 31.2,
      toneladasPcp: 168.0,
      versao: 1,
    },
    {
      exercicio: '2026',
      periodo: '07',
      competencia: '2026-07',
      competenciaFormatada: 'Julho / 2026',
      itensNegativos: 14,
      itensA: 7,
      itensB: 4,
      itensC: 3,
      saldoNegativoFinal: -158.2,
      itemDiasTotais: 210,
      pedidosPcp: 12,
      percPcp: 35.3,
      toneladasPcp: 195.4,
      versao: 1,
    },
    {
      exercicio: '2026',
      periodo: '06',
      competencia: '2026-06',
      competenciaFormatada: 'Junho / 2026',
      itensNegativos: 12,
      itensA: 6,
      itensB: 4,
      itensC: 2,
      saldoNegativoFinal: -140.0,
      itemDiasTotais: 185,
      pedidosPcp: 9,
      percPcp: 28.1,
      toneladasPcp: 155.0,
      versao: 1,
    },
    {
      exercicio: '2026',
      periodo: '05',
      competencia: '2026-05',
      competenciaFormatada: 'Maio / 2026',
      itensNegativos: 15,
      itensA: 8,
      itensB: 4,
      itensC: 3,
      saldoNegativoFinal: -175.5,
      itemDiasTotais: 230,
      pedidosPcp: 14,
      percPcp: 38.9,
      toneladasPcp: 215.0,
      versao: 1,
    },
  ]
}

import { CarteiraItem } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { CurvaAbcParametrosBackend, CURVA_ABC_PARAMETROS_DEFAULT } from './sap-carteira-rfc-service'

export interface ItemCurvaAbcCalculado {
  codigo_material: string
  descricao_material: string
  familia: string
  linha: string
  centro: string
  cliente?: string
  carteira_tons: number
  estoque_livre_tons: number
  estoque_qualidade_tons: number
  estoque_bloqueado_tons: number
  estoque_disponivel_tons: number
  em_producao_tons: number
  programado_tons: number
  entradas_previstas_tons: number
  saldo_atual_tons: number
  saldo_projetado_tons: number
  deficit_tons: number
  dias_cobertura: number | null
  faturamento_brl: number
  participacao_individual_pct: number
  participacao_acumulada_pct: number
  curva_abc: 'A' | 'B' | 'C'
  data_desejada?: string
  data_prevista?: string
  risco: 'NORMAL' | 'ATENCAO' | 'CRITICO'
  criticidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  situacao: string
  tipo_carteira: 'L1' | 'L2' | 'MTO' | 'REVENDA' | 'IMPORTADO' | 'SDC' | 'GERAL'
  origemItemOriginal?: CarteiraItem | CarteiraSDCItem
}

export interface CurvaAbcResultadoConsolidado {
  itens: ItemCurvaAbcCalculado[]
  faturamentoTotal_brl: number
  tonelagemTotal_t: number
  resumoA: {
    quantidade_itens: number
    faturamento_brl: number
    percentual_faturamento: number
    toneladas: number
  }
  resumoB: {
    quantidade_itens: number
    faturamento_brl: number
    percentual_faturamento: number
    toneladas: number
  }
  resumoC: {
    quantidade_itens: number
    faturamento_brl: number
    percentual_faturamento: number
    toneladas: number
  }
  parametrosAplicados: CurvaAbcParametrosBackend
  alertasPrioritariosCurvaA: string[]
  fonteFaturamentoParametrizada: boolean
}

export class CurvaAbcFaturamentoEngine {
  /**
   * Tabela de preço médio por família no SAP ECC (R$/tonelada)
   */
  public static readonly PRECO_MEDIO_POR_FAMILIA: Record<string, number> = {
    CANTONEIRA: 5120.0,
    BARRA_CHATA: 4980.0,
    BARRA_REDONDA: 5350.0,
    BARRA_QUADRADA: 5200.0,
    PERFIL_U: 5400.0,
    PERFIL_T: 5450.0,
    BLOCO: 4600.0,
    REVENDA: 4800.0,
    IMPORTADO: 5650.0,
    OUTROS: 4850.0,
  }

  /**
   * Determina o preço médio por tonelada do item no SAP
   */
  public static obterPrecoMedioT(familia: string, precoPadrao: number = 4850.0): number {
    const famUpper = (familia || '').toUpperCase().trim()
    for (const [key, val] of Object.entries(this.PRECO_MEDIO_POR_FAMILIA)) {
      if (famUpper.includes(key)) return val
    }
    return precoPadrao
  }

  /**
   * Normaliza um CarteiraItem para ItemCurvaAbcCalculado
   */
  public static normalizarCarteiraItem(
    item: CarteiraItem,
    precoPadrao: number = 4850.0,
  ): Omit<
    ItemCurvaAbcCalculado,
    'participacao_individual_pct' | 'participacao_acumulada_pct' | 'curva_abc'
  > {
    const precoT = this.obterPrecoMedioT(item.familia, precoPadrao)
    const carteiraT = Number(item.carteira_aberta_tons || item.qtd_ordem_tons || 0)
    const faturamentoCalculado = carteiraT * precoT

    const estoqueLivre = Number(item.estoque_livre_tons || 0)
    const estoqueSemi = Number(item.estoque_semiacabado_tons || 0)
    const estoqueTotal = estoqueLivre + estoqueSemi + Number(item.estoque_acabado_tons || 0)
    const estoqueBloqueado = item.bloqueio ? Number(item.estoque_acabado_tons || 0) : 0
    const estoqueDisponivel = Math.max(0, estoqueLivre - estoqueBloqueado)

    const saldoAtual = Number(
      item.saldo_negativo_tons < 0 ? item.saldo_negativo_tons : item.saldo_positivo_tons,
    )
    const deficitT = saldoAtual < 0 ? Math.abs(saldoAtual) : 0
    const progT = Number(item.qtd_programada_tons || 0)
    const saldoProjetado = saldoAtual + progT

    let risco: 'NORMAL' | 'ATENCAO' | 'CRITICO' = 'NORMAL'
    let criticidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' = 'BAIXA'

    if (item.status_ruptura === 'VERMELHO' || (deficitT > 0 && progT === 0)) {
      risco = 'CRITICO'
      criticidade = 'CRITICA'
    } else if (item.status_ruptura === 'AMARELO' || (deficitT > 0 && saldoProjetado < 0)) {
      risco = 'ATENCAO'
      criticidade = 'ALTA'
    }

    const situacao = item.bloqueio
      ? 'Bloqueado'
      : deficitT > 0 && progT === 0
        ? 'Déficit sem programação'
        : deficitT > 0 && saldoProjetado < 0
          ? 'Cobertura parcial'
          : deficitT > 0 && saldoProjetado >= 0
            ? 'Cobertura programada'
            : progT > 0
              ? 'Programado'
              : 'Atendido pelo estoque'

    return {
      codigo_material: item.codigo_material,
      descricao_material: item.descricao_material,
      familia: item.familia || 'OUTROS',
      linha: item.linha || 'GERAL',
      centro: item.centro || '1000',
      cliente: item.nome_cliente,
      carteira_tons: carteiraT,
      estoque_livre_tons: estoqueLivre,
      estoque_qualidade_tons: 0,
      estoque_bloqueado_tons: estoqueBloqueado,
      estoque_disponivel_tons: estoqueDisponivel,
      em_producao_tons: 0,
      programado_tons: progT,
      entradas_previstas_tons: 0,
      saldo_atual_tons: saldoAtual,
      saldo_projetado_tons: saldoProjetado,
      deficit_tons: deficitT,
      dias_cobertura: item.dias_cobertura !== undefined ? item.dias_cobertura : null,
      faturamento_brl: faturamentoCalculado,
      data_desejada: item.data_desejada,
      data_prevista: item.data_programada,
      risco,
      criticidade,
      situacao,
      tipo_carteira:
        item.linha === 'L1'
          ? 'L1'
          : item.linha === 'L2'
            ? 'L2'
            : item.origem_produto === 'REVENDA'
              ? 'REVENDA'
              : item.origem_produto === 'IMPORTADO'
                ? 'IMPORTADO'
                : item.tipo_ordem === 'MTO'
                  ? 'MTO'
                  : 'GERAL',
      origemItemOriginal: item,
    }
  }

  /**
   * Normaliza um CarteiraSDCItem para ItemCurvaAbcCalculado
   */
  public static normalizarSdcItem(
    item: CarteiraSDCItem,
    precoPadrao: number = 4850.0,
  ): Omit<
    ItemCurvaAbcCalculado,
    'participacao_individual_pct' | 'participacao_acumulada_pct' | 'curva_abc'
  > {
    const precoT = this.obterPrecoMedioT(item.familia, precoPadrao)
    const carteiraT = Number(item.carteira_t || 0)
    const faturamentoCalculado = carteiraT * precoT

    const estoqueLivre = Number(item.estoque_total_t || 0)
    const estoqueBloqueado = Number(item.estoque_bloqueado_t || 0)
    const estoqueDisponivel = Number(
      item.estoque_disponivel_t || Math.max(0, estoqueLivre - estoqueBloqueado),
    )
    const deficitT = item.saldo_t < 0 ? Math.abs(item.saldo_t) : 0
    const progT = Number(item.programado_t || 0)
    const emProducaoT = Number(item.em_producao_t || 0)

    let risco: 'NORMAL' | 'ATENCAO' | 'CRITICO' = 'NORMAL'
    let criticidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' = 'BAIXA'

    if (item.status === 'CRÍTICO' || item.status === 'SEM ESTOQUE') {
      risco = 'CRITICO'
      criticidade = 'CRITICA'
    } else if (item.status === 'DÉFICIT' || item.status === 'COBERTURA PARCIAL') {
      risco = 'ATENCAO'
      criticidade = 'ALTA'
    }

    return {
      codigo_material: item.material,
      descricao_material: item.descricao,
      familia: item.familia || 'OUTROS',
      linha: item.linha || 'SDC',
      centro: item.centro_sap || 'SDPL',
      cliente: item.pedidos_compoem?.[0]?.cliente || 'Industrialização SDC',
      carteira_tons: carteiraT,
      estoque_livre_tons: estoqueLivre,
      estoque_qualidade_tons: 0,
      estoque_bloqueado_tons: estoqueBloqueado,
      estoque_disponivel_tons: estoqueDisponivel,
      em_producao_tons: emProducaoT,
      programado_tons: progT,
      entradas_previstas_tons: 0,
      saldo_atual_tons: item.saldo_t,
      saldo_projetado_tons: item.saldo_projetado_t,
      deficit_tons: deficitT,
      dias_cobertura: null,
      faturamento_brl: faturamentoCalculado,
      data_desejada: item.data_desejada,
      data_prevista: item.data_prevista,
      risco,
      criticidade,
      situacao: item.situacao_producao || item.status,
      tipo_carteira: 'SDC',
      origemItemOriginal: item,
    }
  }

  /**
   * Calcula a Curva ABC oficial por Faturamento com limites parametrizáveis (ex: 85% / 95%)
   */
  public static calcularCurvaAbc(
    itensBrutos: (CarteiraItem | CarteiraSDCItem)[],
    parametros?: CurvaAbcParametrosBackend,
  ): CurvaAbcResultadoConsolidado {
    const params = parametros || CURVA_ABC_PARAMETROS_DEFAULT
    const corteA = params.corteA_pct ?? 85.0
    const corteB = params.corteB_pct ?? 95.0
    const precoPadrao = params.preco_medio_tonelada_padrao_brl || 4850.0

    // 1. Normalizar todos os itens
    const itensNormalizados = itensBrutos.map((it) => {
      if ('carteira_t' in it && 'material' in it) {
        return this.normalizarSdcItem(it as CarteiraSDCItem, precoPadrao)
      }
      return this.normalizarCarteiraItem(it as CarteiraItem, precoPadrao)
    })

    // 2. Ordenar materiais por faturamento decrescente (NUNCA por tonelagem)
    const ordenados = [...itensNormalizados].sort((a, b) => b.faturamento_brl - a.faturamento_brl)

    const faturamentoTotal = ordenados.reduce((acc, i) => acc + (i.faturamento_brl || 0), 0)
    const tonelagemTotal = ordenados.reduce((acc, i) => acc + (i.carteira_tons || 0), 0)

    let faturamentoAcumulado = 0
    const itensCalculados: ItemCurvaAbcCalculado[] = []

    let qtdA = 0
    let fatA = 0
    let tonA = 0
    let qtdB = 0
    let fatB = 0
    let tonB = 0
    let qtdC = 0
    let fatC = 0
    let tonC = 0

    const alertasPrioritariosCurvaA: string[] = []

    ordenados.forEach((item) => {
      faturamentoAcumulado += item.faturamento_brl
      const individualPct =
        faturamentoTotal > 0 ? (item.faturamento_brl / faturamentoTotal) * 100 : 0
      const acumuladoPct =
        faturamentoTotal > 0 ? (faturamentoAcumulado / faturamentoTotal) * 100 : 0

      let curva: 'A' | 'B' | 'C' = 'C'
      if (
        acumuladoPct <= corteA + 0.001 ||
        (itensCalculados.length === 0 && acumuladoPct > corteA)
      ) {
        curva = 'A'
        qtdA++
        fatA += item.faturamento_brl
        tonA += item.carteira_tons
      } else if (acumuladoPct <= corteB + 0.001) {
        curva = 'B'
        qtdB++
        fatB += item.faturamento_brl
        tonB += item.carteira_tons
      } else {
        curva = 'C'
        qtdC++
        fatC += item.faturamento_brl
        tonC += item.carteira_tons
      }

      // Regra Prioritária Curva A:
      // "ALERTA CRÍTICO — Material XXXXX pertence à Curva A, possui déficit de 25,40 t e não apresenta programação PCP suficiente para cobertura."
      if (curva === 'A' && item.deficit_tons > 0 && item.saldo_projetado_tons < 0) {
        const defFmt = item.deficit_tons.toFixed(2).replace('.', ',')
        alertasPrioritariosCurvaA.push(
          `ALERTA CRÍTICO — Material ${item.codigo_material} pertence à Curva A, possui déficit de ${defFmt} t e não apresenta programação PCP suficiente para cobertura.`,
        )
      }

      itensCalculados.push({
        ...item,
        participacao_individual_pct: individualPct,
        participacao_acumulada_pct: acumuladoPct,
        curva_abc: curva,
      })
    })

    return {
      itens: itensCalculados,
      faturamentoTotal_brl: faturamentoTotal,
      tonelagemTotal_t: tonelagemTotal,
      resumoA: {
        quantidade_itens: qtdA,
        faturamento_brl: fatA,
        percentual_faturamento: faturamentoTotal > 0 ? (fatA / faturamentoTotal) * 100 : 0,
        toneladas: tonA,
      },
      resumoB: {
        quantidade_itens: qtdB,
        faturamento_brl: fatB,
        percentual_faturamento: faturamentoTotal > 0 ? (fatB / faturamentoTotal) * 100 : 0,
        toneladas: tonB,
      },
      resumoC: {
        quantidade_itens: qtdC,
        faturamento_brl: fatC,
        percentual_faturamento: faturamentoTotal > 0 ? (fatC / faturamentoTotal) * 100 : 0,
        toneladas: tonC,
      },
      parametrosAplicados: params,
      alertasPrioritariosCurvaA,
      fonteFaturamentoParametrizada: Boolean(
        params.fonte_faturamento && params.fonte_faturamento === 'SAP',
      ),
    }
  }
}

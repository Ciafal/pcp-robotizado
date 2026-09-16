/**
 * Motor de Cálculo da Carteira SDC (Sidercentro - Centro SAP SDPL)
 * Regras Estritas do Usuário:
 *
 * 1) SALDO = ESTOQUE TOTAL − CARTEIRA
 *    Ex: 6,84 − 26,00 = −19,16 t ("Déficit de 19,16 t")
 *
 * 2) SALDO PROJETADO = ESTOQUE TOTAL + PROGRAMADO/EM PRODUÇÃO − CARTEIRA
 *    Ex: 10 + 35 − 40 = +5 t ("Cobertura projetada suficiente")
 *
 * 3) STATUS AUTOMÁTICOS:
 *    - COBERTO: saldo ≥ 0 (e carteira > 0)
 *    - DÉFICIT: saldo < 0 sem programação suficiente (saldo_projetado < 0 ou prog+em_prod == 0)
 *    - EM PRODUÇÃO: há quantidade sendo produzida (em_producao > 0)
 *    - COBERTURA PROGRAMADA: saldo < 0 mas saldo_projetado ≥ 0
 *    - COBERTURA PARCIAL: saldo < 0, há programação/produção > 0, mas saldo_projetado ainda < 0
 *    - SEM CARTEIRA: carteira == 0
 *    - SEM ESTOQUE: carteira > 0 e estoque == 0 (e sem saldo projetado positivo)
 *    - CRÍTICO: carteira > 0, estoque insuficiente (saldo < 0) e nenhuma produção/programação (programado == 0 && em_producao == 0)
 *
 * 4) SITUAÇÃO DA PRODUÇÃO:
 *    - "Em produção CIAFAL" | "Programado CIAFAL" | "Em industrialização SDC"
 *    - "Programado SDC" | "Sem programação" | "Produção concluída"
 *
 * 5) ALERTAS AUTOMÁTICOS:
 *    - "Carteira SDC com risco de atendimento: material [X] possui déficit de [Y] t e não possui programação suficiente."
 *    - "Produção programada reduz o déficit, porém ainda permanecem [Y] t sem cobertura."
 *    - "Risco de atraso na Carteira SDC." (quando data desejada anterior à data prevista)
 *    - "Existe estoque, porém parte da quantidade não está disponível para atendimento." (quando estoque bloqueado > 0)
 */

import {
  CarteiraSDCItem,
  CarteiraSDCKpis,
  StatusCarteiraSDC,
  SituacaoProducaoSDC,
  OrigemProducaoSDC,
} from '@/types/carteira-sdc'

export class CarteiraSDCEngine {
  /**
   * Arredonda com precisão de 2 casas decimais para evitar imprecisões de ponto flutuante
   */
  public static round2(val: number): number {
    return Math.round((Number(val) || 0) * 100) / 100
  }

  /**
   * Calcula um item de Carteira SDC aplicando estritamente as fórmulas e regras de status
   */
  public static calcularItem(item: {
    material: string
    descricao: string
    familia?: string
    bitola?: string
    qualidade_aco?: string
    curva_abc?: string
    carteira_t: number
    estoque_total_t: number
    estoque_disponivel_t?: number
    estoque_qualidade_t?: number
    estoque_bloqueado_t?: number
    programado_t?: number
    em_producao_t?: number
    origem_producao?: OrigemProducaoSDC
    situacao_producao?: SituacaoProducaoSDC
    data_prevista?: string
    data_desejada?: string
    centro_sap?: string
    empresa?: string
    pedidos_compoem?: any[]
    programacao_detalhe?: any
    industrializacao_sdc?: any
  }): CarteiraSDCItem {
    const carteira = Math.max(0, this.round2(item.carteira_t))
    const estoqueTotal = Math.max(0, this.round2(item.estoque_total_t))
    const programado = Math.max(0, this.round2(item.programado_t || 0))
    const emProducao = Math.max(0, this.round2(item.em_producao_t || 0))
    const estoqueBloqueado = Math.max(0, this.round2(item.estoque_bloqueado_t || 0))
    const estoqueDisponivel =
      item.estoque_disponivel_t !== undefined
        ? Math.max(0, this.round2(item.estoque_disponivel_t))
        : Math.max(0, this.round2(estoqueTotal - estoqueBloqueado))

    // FÓRMULAS CONTRATUAIS:
    // SALDO = ESTOQUE TOTAL − CARTEIRA (ex: 6.84 - 26.00 = -19.16)
    const saldo = this.round2(estoqueTotal - carteira)

    // SALDO PROJETADO = ESTOQUE TOTAL + PROGRAMADO/EM PRODUÇÃO − CARTEIRA
    const saldoProjetado = this.round2(estoqueTotal + programado + emProducao - carteira)

    // Cobertura percentual
    const coberturaPct = carteira > 0 ? this.round2((estoqueTotal / carteira) * 100) : 100

    // Origem da produção padrão
    const origemProducao: OrigemProducaoSDC = item.origem_producao || 'Sidercentro'

    // Situação da Produção textual e filtrável
    let situacaoProducao: SituacaoProducaoSDC = item.situacao_producao || 'Sem programação'
    if (!item.situacao_producao) {
      if (emProducao > 0) {
        situacaoProducao =
          origemProducao === 'CIAFAL' ? 'Em produção CIAFAL' : 'Em industrialização SDC'
      } else if (programado > 0) {
        situacaoProducao = origemProducao === 'CIAFAL' ? 'Programado CIAFAL' : 'Programado SDC'
      } else if (saldo >= 0 && carteira > 0) {
        situacaoProducao = 'Produção concluída'
      } else {
        situacaoProducao = 'Sem programação'
      }
    }

    // DETERMINAÇÃO DOS STATUS AUTOMÁTICOS
    // Hierarquia de prioridade coerente com os requisitos do usuário:
    // 1) SEM CARTEIRA: carteira = 0
    // 2) SEM ESTOQUE: carteira > 0 e estoque = 0 (e sem saldo projetado positivo)
    // 3) CRÍTICO: carteira > 0, estoque insuficiente e nenhuma produção/programação
    // 4) COBERTURA PROGRAMADA: saldo < 0 mas saldo projetado ≥ 0
    // 5) COBERTURA PARCIAL: saldo < 0, há programação, saldo projetado ainda < 0
    // 6) EM PRODUÇÃO: há quantidade sendo produzida (emProducao > 0)
    // 7) DÉFICIT: saldo < 0 sem programação suficiente
    // 8) COBERTO: saldo ≥ 0
    let status: StatusCarteiraSDC = 'COBERTO'

    const totalEmProg = this.round2(programado + emProducao)

    if (carteira === 0) {
      status = 'SEM CARTEIRA'
    } else if (estoqueTotal === 0 && totalEmProg === 0) {
      // Carteira > 0, estoque zero e sem programação: crítico e sem estoque
      status = 'SEM ESTOQUE'
    } else if (saldo < 0 && totalEmProg === 0) {
      // Carteira > 0, estoque insuficiente e NENHUMA produção/programação
      status = 'CRÍTICO'
    } else if (saldo < 0 && saldoProjetado >= 0) {
      // Saldo negativo, mas a programação (ou produção) cobre integralmente
      status = 'COBERTURA PROGRAMADA'
    } else if (saldo < 0 && totalEmProg > 0 && saldoProjetado < 0) {
      // Há produção ou programação, mas saldo projetado continua negativo
      // Se tiver em produção ativo, pode ser visualizado como EM PRODUÇÃO ou COBERTURA PARCIAL
      // Conforme requisito: "COBERTURA PARCIAL (saldo < 0, há programação, saldo projetado ainda < 0)"
      status = 'COBERTURA PARCIAL'
    } else if (emProducao > 0) {
      status = 'EM PRODUÇÃO'
    } else if (saldo < 0) {
      status = 'DÉFICIT'
    } else {
      status = 'COBERTO'
    }

    // ALERTAS AUTOMÁTICOS (textos exatos do usuário)
    const alertas: string[] = []

    // 1. "Carteira SDC com risco de atendimento: material [X] possui déficit de [Y] t e não possui programação suficiente."
    if (saldo < 0 && (totalEmProg === 0 || saldoProjetado < 0)) {
      const deficit = Math.abs(saldo).toFixed(2).replace('.', ',')
      alertas.push(
        `Carteira SDC com risco de atendimento: material ${item.material} possui déficit de ${deficit} t e não possui programação suficiente.`,
      )
    }

    // 2. "Produção programada reduz o déficit, porém ainda permanecem [Y] t sem cobertura."
    if (saldo < 0 && totalEmProg > 0 && saldoProjetado < 0) {
      const residual = Math.abs(saldoProjetado).toFixed(2).replace('.', ',')
      alertas.push(
        `Produção programada reduz o déficit, porém ainda permanecem ${residual} t sem cobertura.`,
      )
    }

    // 3. "Risco de atraso na Carteira SDC." (data desejada anterior à data prevista)
    if (item.data_desejada && item.data_prevista) {
      const dtDesejada = new Date(item.data_desejada)
      const dtPrevista = new Date(item.data_prevista)
      if (dtDesejada < dtPrevista) {
        alertas.push('Risco de atraso na Carteira SDC.')
      }
    }

    // 4. "Existe estoque, porém parte da quantidade não está disponível para atendimento." (estoque bloqueado)
    if (estoqueBloqueado > 0) {
      alertas.push(
        'Existe estoque, porém parte da quantidade não está disponível para atendimento.',
      )
    }

    const alertaPrincipal = alertas.length > 0 ? alertas[0] : undefined

    return {
      material: item.material,
      descricao: item.descricao,
      familia: item.familia || 'Perfis SDC',
      bitola: item.bitola || '-',
      qualidade_aco: item.qualidade_aco || 'SAE 1020',
      curva_abc: item.curva_abc || 'B',
      carteira_t: carteira,
      estoque_total_t: estoqueTotal,
      estoque_disponivel_t: estoqueDisponivel,
      estoque_qualidade_t: item.estoque_qualidade_t || 0,
      estoque_bloqueado_t: estoqueBloqueado,
      saldo_t: saldo,
      programado_t: programado,
      em_producao_t: emProducao,
      saldo_projetado_t: saldoProjetado,
      cobertura_pct: coberturaPct,
      status,
      situacao_producao: situacaoProducao,
      origem_producao: origemProducao,
      data_prevista: item.data_prevista,
      data_desejada: item.data_desejada,
      alerta: alertaPrincipal,
      alertas_lista: alertas,
      centro_sap: 'SDPL',
      empresa: 'Sidercentro',
      pedidos_compoem: item.pedidos_compoem || [],
      programacao_detalhe: item.programacao_detalhe,
      industrializacao_sdc: item.industrializacao_sdc,
    }
  }

  /**
   * Calcula os KPIs executivos agregados da Carteira SDC
   */
  public static calcularKpis(itens: CarteiraSDCItem[]): CarteiraSDCKpis {
    let carteiraTotal = 0
    let estoqueTotal = 0
    let deficitAtual = 0
    let itensComDeficitCount = 0
    let emProducaoTotal = 0
    let itensCoberturaProgramadaCount = 0
    let itensCriticosCount = 0

    itens.forEach((it) => {
      carteiraTotal += it.carteira_t || 0
      estoqueTotal += it.estoque_total_t || 0

      if (it.saldo_t < 0) {
        deficitAtual += Math.abs(it.saldo_t)
        itensComDeficitCount++
      }

      emProducaoTotal += it.em_producao_t || 0

      if (it.status === 'COBERTURA PROGRAMADA') {
        itensCoberturaProgramadaCount++
      }

      if (it.status === 'CRÍTICO' || it.status === 'SEM ESTOQUE') {
        itensCriticosCount++
      }
    })

    return {
      carteira_total_t: this.round2(carteiraTotal),
      estoque_total_t: this.round2(estoqueTotal),
      deficit_atual_t: this.round2(deficitAtual),
      itens_com_deficit_count: itensComDeficitCount,
      em_producao_total_t: this.round2(emProducaoTotal),
      itens_cobertura_programada_count: itensCoberturaProgramadaCount,
      itens_criticos_count: itensCriticosCount,
      total_itens: itens.length,
    }
  }

  /**
   * Ordenação: suporte a todas as colunas + "Priorizar Necessidade":
   * 1 críticos, 2 maior déficit, 3 cobertura parcial, 4 cobertura programada, 5 cobertos, 6 sem carteira
   */
  public static ordenarItens(
    itens: CarteiraSDCItem[],
    campo: string,
    direcao: 'asc' | 'desc' = 'asc',
  ): CarteiraSDCItem[] {
    const copia = [...itens]

    if (campo === 'PRIORIZAR_NECESSIDADE') {
      const pesoStatus: Record<StatusCarteiraSDC, number> = {
        CRÍTICO: 1,
        'SEM ESTOQUE': 1,
        DÉFICIT: 2,
        'COBERTURA PARCIAL': 3,
        'EM PRODUÇÃO': 4,
        'COBERTURA PROGRAMADA': 5,
        COBERTO: 6,
        'SEM CARTEIRA': 7,
      }

      return copia.sort((a, b) => {
        const pesoA = pesoStatus[a.status] ?? 99
        const pesoB = pesoStatus[b.status] ?? 99
        if (pesoA !== pesoB) return pesoA - pesoB
        // Em caso de mesmo peso, desempata pelo maior déficit (saldo mais negativo primeiro)
        return a.saldo_t - b.saldo_t
      })
    }

    return copia.sort((a, b) => {
      let valA: any = (a as any)[campo]
      let valB: any = (b as any)[campo]

      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return direcao === 'asc' ? -1 : 1
      if (valA > valB) return direcao === 'asc' ? 1 : -1
      return 0
    })
  }

  /**
   * Gera análises IA automáticas fiéis aos dados reais da Carteira SDC
   */
  public static gerarAnalisesIA(itens: CarteiraSDCItem[]): string[] {
    const analises: string[] = []

    // 1. Exemplo do usuário obrigatório:
    // "Material C1000A360600 possui carteira de 26 t e estoque de 6,84 t, resultando em déficit atual de 19,16 t. Verificar programação existente e necessidade de cobertura."
    const itemComDeficit = itens.find((i) => i.saldo_t < 0)
    if (itemComDeficit) {
      const c = itemComDeficit.carteira_t.toFixed(2).replace('.', ',')
      const e = itemComDeficit.estoque_total_t.toFixed(2).replace('.', ',')
      const d = Math.abs(itemComDeficit.saldo_t).toFixed(2).replace('.', ',')
      analises.push(
        `Material ${itemComDeficit.material} possui carteira de ${c} t e estoque de ${e} t, resultando em déficit atual de ${d} t. Verificar programação existente e necessidade de cobertura.`,
      )
    }

    // 2. Maiores déficits e críticos
    const criticos = itens.filter((i) => i.status === 'CRÍTICO' || i.status === 'SEM ESTOQUE')
    if (criticos.length > 0) {
      const materiaisCriticos = criticos
        .slice(0, 3)
        .map((c) => `${c.material} (${Math.abs(c.saldo_t).toFixed(1)} t)`)
        .join(', ')
      analises.push(
        `Atenção Crítica: ${criticos.length} itens sem estoque ou sem nenhuma programação vinculada: ${materiaisCriticos}. Demanda desatendida imediata no centro SDPL.`,
      )
    }

    // 3. Programação que não cobre (Cobertura parcial)
    const parciais = itens.filter((i) => i.status === 'COBERTURA PARCIAL')
    if (parciais.length > 0) {
      const deficitResidualTotal = parciais.reduce(
        (sum, i) => sum + Math.abs(i.saldo_projetado_t),
        0,
      )
      analises.push(
        `Industrialização Parcial: ${parciais.length} materiais possuem programação SDC/CIAFAL ativa, porém ainda restam ${deficitResidualTotal.toFixed(1)} t sem cobertura projetada. Necessário ampliar ordem de industrialização.`,
      )
    }

    // 4. Riscos de Atraso
    const atrasos = itens.filter((i) =>
      i.alertas_lista?.some((al) => al.includes('Risco de atraso')),
    )
    if (atrasos.length > 0) {
      analises.push(
        `Risco de Prazo: ${atrasos.length} itens possuem data de retorno prevista posterior à data desejada pelo cliente. Recomenda-se priorizar o lote de laminação na Sidercentro.`,
      )
    }

    // 5. Concentração por Família / Bitola
    const familiasComDeficit: Record<string, number> = {}
    itens.forEach((it) => {
      if (it.saldo_t < 0) {
        const fam = it.familia || 'Outros'
        familiasComDeficit[fam] = (familiasComDeficit[fam] || 0) + Math.abs(it.saldo_t)
      }
    })
    const entries = Object.entries(familiasComDeficit).sort((a, b) => b[1] - a[1])
    if (entries.length > 0) {
      analises.push(
        `Concentração de Déficit: A família "${entries[0][0]}" concentra o maior volume de déficit na Sidercentro (${entries[0][1].toFixed(1)} t). Alinhar campanha industrial com a coordenação fabril.`,
      )
    }

    return analises
  }
}

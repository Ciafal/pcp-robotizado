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
  AlertaCarteiraSDC,
  SeveridadeAlertaSDC,
  TipoAlertaSDC,
  ConfiguracaoVariacaoCarteiraSDC,
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

  /**
   * Constrói a chave lógica única anti-duplicação:
   * Centro + Material + Tipo de Alerta + Contexto da Carteira
   * Exemplo: SDPL:C1000A360600:DEFICIT_SEM_PROGRAMACAO:CARTEIRA_SDC
   */
  public static gerarChaveLogicaAlerta(
    centro: string,
    material: string,
    tipoAlerta: TipoAlertaSDC,
    contexto: string = 'CARTEIRA_SDC',
  ): string {
    return `${centro}:${material}:${tipoAlerta}:${contexto}`
  }

  /**
   * Gera e reconcilia alertas determinísticos da Carteira SDC aplicando estritamente as regras:
   * - Déficit sem programação: Saldo < 0 E Programado = 0 -> CRÍTICO
   * - Cobertura parcial: Saldo < 0 E Programado > 0 E Saldo Projetado < 0 -> ALTO (com déficit atual, programado, residual)
   * - Cobertura programada: Saldo < 0 E Saldo Projetado >= 0 -> INFORMATIVO (não aumenta contador de críticos)
   * - Sem estoque (Carteira > 0 E Estoque = 0): sem programação -> CRÍTICO; insuficiente -> ALTO; cobre -> INFORMATIVO
   * - Risco de prazo: Data prevista > Data necessária -> CRÍTICO/ALTO com atraso projetado em dias
   * - Alteração relevante da carteira: variação configurável absoluta e percentual
   * - Deduplicação por chave lógica + Upsert + Resolução automática com preservação de histórico
   */
  public static reconciliarAlertasSDC(
    itensAtuais: CarteiraSDCItem[],
    alertasExistentes: AlertaCarteiraSDC[] = [],
    opcoes?: {
      itensAnteriores?: CarteiraSDCItem[]
      configVariacao?: ConfiguracaoVariacaoCarteiraSDC
    },
  ): AlertaCarteiraSDC[] {
    const configVariacao: ConfiguracaoVariacaoCarteiraSDC = opcoes?.configVariacao || {
      variacaoAbsolutaMinima_t: 10,
      variacaoPercentualMinima_pct: 30,
    }

    const mapaExistentes = new Map<string, AlertaCarteiraSDC>()
    for (const al of alertasExistentes) {
      mapaExistentes.set(al.id, { ...al, historico: [...(al.historico || [])] })
    }

    const chavesDetectadasNesteCiclo = new Set<string>()
    const alertasResultado: AlertaCarteiraSDC[] = []
    const agoraIso = new Date().toISOString()

    const mapaAnteriores = new Map<string, CarteiraSDCItem>()
    if (opcoes?.itensAnteriores) {
      for (const ant of opcoes.itensAnteriores) {
        mapaAnteriores.set(ant.material, ant)
      }
    }

    for (const item of itensAtuais) {
      const centro = item.centro_sap || 'SDPL'
      const mat = item.material
      const carteira = this.round2(item.carteira_t)
      const estoque = this.round2(item.estoque_total_t)
      const saldo = this.round2(item.saldo_t)
      const programadoTotal = this.round2((item.programado_t || 0) + (item.em_producao_t || 0))
      const saldoProjetado = this.round2(item.saldo_projetado_t)
      const deficitAbs = Math.abs(saldo).toFixed(2).replace('.', ',')
      const residualAbs = Math.abs(saldoProjetado).toFixed(2).replace('.', ',')
      const progAbs = programadoTotal.toFixed(2).replace('.', ',')
      const link = `/pcp/analise-carteira/sdc?material=${encodeURIComponent(mat)}`

      // 1. REGRA: Sem estoque (Carteira > 0 E Estoque = 0)
      if (carteira > 0 && estoque === 0) {
        const chaveSemEstoque = this.gerarChaveLogicaAlerta(centro, mat, 'SEM_ESTOQUE')
        chavesDetectadasNesteCiclo.add(chaveSemEstoque)

        let sev: SeveridadeAlertaSDC = 'CRÍTICO'
        let rec = `Material ${mat} sem nenhum estoque físico em ${centro}. Avaliar abertura emergencial de ordem de produção/industrialização.`
        let desc = `Material ${mat} possui carteira de ${carteira.toFixed(2).replace('.', ',')} t e estoque ZERO no centro ${centro}.`

        if (saldoProjetado >= 0 && programadoTotal > 0) {
          sev = 'INFORMATIVO'
          rec = `Material ${mat} sem estoque físico atual, porém programação de ${progAbs} t cobre a carteira.`
          desc = `Material ${mat} sem estoque, mas programação cobre integralmente a demanda.`
        } else if (programadoTotal > 0 && saldoProjetado < 0) {
          sev = 'ALTO'
          rec = `Material ${mat} sem estoque físico atual. Programação de ${progAbs} t é insuficiente, restando ${residualAbs} t sem cobertura.`
          desc = `Material ${mat} sem estoque físico e com cobertura parcial (${progAbs} t programado, déficit residual de ${residualAbs} t).`
        }

        this.upsertAlerta(mapaExistentes, alertasResultado, chaveSemEstoque, {
          material: mat,
          descricao: item.descricao,
          tipo_alerta: 'SEM_ESTOQUE',
          estoque,
          saldo_atual: saldo,
          quantidade_programada: programadoTotal,
          saldo_projetado: saldoProjetado,
          data_desejada: item.data_desejada,
          data_prevista: item.data_prevista,
          severidade: sev,
          descricao_texto: desc,
          recomendacao: rec,
          link_detalhamento: link,
          agoraIso,
        })
      }

      // 2. REGRA: Déficit sem programação (Saldo < 0 E Programado = 0) -> CRÍTICO
      if (saldo < 0 && programadoTotal === 0) {
        const chaveDeficit = this.gerarChaveLogicaAlerta(centro, mat, 'DEFICIT_SEM_PROGRAMACAO')
        chavesDetectadasNesteCiclo.add(chaveDeficit)

        const desc = `Material ${mat} possui déficit de ${deficitAbs} t e não possui programação para cobertura.`
        const rec = `Avaliar programação/industrialização imediata no centro ${centro} para cobertura de ${deficitAbs} t.`

        this.upsertAlerta(mapaExistentes, alertasResultado, chaveDeficit, {
          material: mat,
          descricao: item.descricao,
          tipo_alerta: 'DEFICIT_SEM_PROGRAMACAO',
          estoque,
          saldo_atual: saldo,
          quantidade_programada: programadoTotal,
          saldo_projetado: saldoProjetado,
          data_desejada: item.data_desejada,
          data_prevista: item.data_prevista,
          severidade: 'CRÍTICO',
          descricao_texto: desc,
          recomendacao: rec,
          link_detalhamento: link,
          agoraIso,
        })
      }

      // 3. REGRA: Cobertura parcial (Saldo < 0 E Programado > 0 E Saldo Projetado < 0) -> ALTO
      if (saldo < 0 && programadoTotal > 0 && saldoProjetado < 0) {
        const chaveParcial = this.gerarChaveLogicaAlerta(centro, mat, 'COBERTURA_PARCIAL')
        chavesDetectadasNesteCiclo.add(chaveParcial)

        const desc = `Material ${mat} possui produção programada (${progAbs} t), porém permanecerá déficit projetado de ${residualAbs} t (déficit atual: ${deficitAbs} t).`
        const rec = `Ampliar lote programado ou ordem de industrialização em ${residualAbs} t para garantir cobertura integral.`

        this.upsertAlerta(mapaExistentes, alertasResultado, chaveParcial, {
          material: mat,
          descricao: item.descricao,
          tipo_alerta: 'COBERTURA_PARCIAL',
          estoque,
          saldo_atual: saldo,
          quantidade_programada: programadoTotal,
          saldo_projetado: saldoProjetado,
          data_desejada: item.data_desejada,
          data_prevista: item.data_prevista,
          severidade: 'ALTO',
          descricao_texto: desc,
          recomendacao: rec,
          link_detalhamento: link,
          agoraIso,
        })
      }

      // 4. REGRA: Cobertura programada (Saldo < 0 E Saldo Projetado >= 0) -> INFORMATIVO
      if (saldo < 0 && saldoProjetado >= 0) {
        const chaveCobProg = this.gerarChaveLogicaAlerta(centro, mat, 'COBERTURA_PROGRAMADA')
        chavesDetectadasNesteCiclo.add(chaveCobProg)

        const desc = `Material ${mat} possui déficit atual de ${deficitAbs} t, porém a programação existente (${progAbs} t) cobre integralmente a necessidade.`
        const rec = `Monitorar cumprimento da data prevista (${item.data_prevista || 'em definição'}) para liberação do saldo ao cliente.`

        this.upsertAlerta(mapaExistentes, alertasResultado, chaveCobProg, {
          material: mat,
          descricao: item.descricao,
          tipo_alerta: 'COBERTURA_PROGRAMADA',
          estoque,
          saldo_atual: saldo,
          quantidade_programada: programadoTotal,
          saldo_projetado: saldoProjetado,
          data_desejada: item.data_desejada,
          data_prevista: item.data_prevista,
          severidade: 'INFORMATIVO',
          descricao_texto: desc,
          recomendacao: rec,
          link_detalhamento: link,
          agoraIso,
        })
      }

      // 5. REGRA: Risco de prazo (Data prevista > Data necessária/desejada)
      if (item.data_desejada && item.data_prevista) {
        const dtDesejada = new Date(item.data_desejada)
        const dtPrevista = new Date(item.data_prevista)
        if (
          !isNaN(dtDesejada.getTime()) &&
          !isNaN(dtPrevista.getTime()) &&
          dtPrevista > dtDesejada
        ) {
          const diffMs = dtPrevista.getTime() - dtDesejada.getTime()
          const diasAtraso = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

          const chavePrazo = this.gerarChaveLogicaAlerta(centro, mat, 'RISCO_PRAZO')
          chavesDetectadasNesteCiclo.add(chavePrazo)

          const sevPrazo: SeveridadeAlertaSDC = diasAtraso >= 5 ? 'CRÍTICO' : 'ALTO'
          const desc = `Material ${mat} com risco de atraso na Carteira SDC: entrega prevista em ${item.data_prevista} ultrapassa a data desejada (${item.data_desejada}) com atraso projetado de ${diasAtraso} dia(s).`
          const rec = `Antecipar lote na escala de laminação SDC ou renegociar prazo de entrega com o cliente.`

          this.upsertAlerta(mapaExistentes, alertasResultado, chavePrazo, {
            material: mat,
            descricao: item.descricao,
            tipo_alerta: 'RISCO_PRAZO',
            estoque,
            saldo_atual: saldo,
            quantidade_programada: programadoTotal,
            saldo_projetado: saldoProjetado,
            data_desejada: item.data_desejada,
            data_prevista: item.data_prevista,
            dias_atraso_projetado: diasAtraso,
            severidade: sevPrazo,
            descricao_texto: desc,
            recomendacao: rec,
            link_detalhamento: link,
            agoraIso,
          })
        }
      }

      // 6. REGRA: Alteração relevante da carteira (parâmetro configurável)
      const itemAnterior = mapaAnteriores.get(mat)
      if (itemAnterior) {
        const deltaAbs = this.round2(carteira - itemAnterior.carteira_t)
        const pctVar =
          itemAnterior.carteira_t > 0
            ? this.round2(((carteira - itemAnterior.carteira_t) / itemAnterior.carteira_t) * 100)
            : carteira > 0
              ? 100
              : 0

        if (
          deltaAbs >= configVariacao.variacaoAbsolutaMinima_t &&
          pctVar >= configVariacao.variacaoPercentualMinima_pct
        ) {
          const chaveVar = this.gerarChaveLogicaAlerta(centro, mat, 'ALTERACAO_RELEVANTE_CARTEIRA')
          chavesDetectadasNesteCiclo.add(chaveVar)

          const desc = `Carteira SDC aumentou significativamente: Material ${mat} saltou de ${itemAnterior.carteira_t.toFixed(2).replace('.', ',')} t para ${carteira.toFixed(2).replace('.', ',')} t (+${deltaAbs.toFixed(2).replace('.', ',')} t / +${pctVar.toFixed(1).replace('.', ',')}%).`
          const rec = `Revisar capacidade disponível no centro ${centro} e alocação de matéria-prima para atender ao acréscimo de demanda.`

          this.upsertAlerta(mapaExistentes, alertasResultado, chaveVar, {
            material: mat,
            descricao: item.descricao,
            tipo_alerta: 'ALTERACAO_RELEVANTE_CARTEIRA',
            estoque,
            saldo_atual: saldo,
            quantidade_programada: programadoTotal,
            saldo_projetado: saldoProjetado,
            data_desejada: item.data_desejada,
            data_prevista: item.data_prevista,
            severidade: deltaAbs > 20 ? 'ALTO' : 'MÉDIO',
            descricao_texto: desc,
            recomendacao: rec,
            link_detalhamento: link,
            agoraIso,
          })
        }
      }
    }

    // 7. RESOLUÇÃO AUTOMÁTICA para alertas anteriores cujo problema deixou de existir
    for (const [id, alertaAntigo] of mapaExistentes.entries()) {
      if (!chavesDetectadasNesteCiclo.has(id)) {
        // Problema deixou de existir: manter histórico e marcar como Resolvido / inativo
        const jaResolvido =
          alertaAntigo.status === 'Resolvido' || alertaAntigo.status === 'Encerrado'
        const alertaResolvido: AlertaCarteiraSDC = {
          ...alertaAntigo,
          ativo: false,
          status: jaResolvido ? alertaAntigo.status : 'Resolvido',
          historico: jaResolvido
            ? alertaAntigo.historico
            : [
                ...(alertaAntigo.historico || []),
                {
                  data_hora: agoraIso,
                  usuario: 'Sistema PCP (Automático)',
                  mensagem: 'Resolvido automaticamente após atualização da programação.',
                  status_anterior: alertaAntigo.status,
                  status_novo: 'Resolvido',
                },
              ],
        }
        alertasResultado.push(alertaResolvido)
      }
    }

    return alertasResultado
  }

  private static upsertAlerta(
    mapaExistentes: Map<string, AlertaCarteiraSDC>,
    listaResultado: AlertaCarteiraSDC[],
    chaveId: string,
    dados: {
      material: string
      descricao: string
      tipo_alerta: TipoAlertaSDC
      estoque: number
      saldo_atual: number
      quantidade_programada: number
      saldo_projetado: number
      data_desejada?: string
      data_prevista?: string
      dias_atraso_projetado?: number
      severidade: SeveridadeAlertaSDC
      descricao_texto: string
      recomendacao: string
      link_detalhamento: string
      agoraIso: string
    },
  ) {
    const existente = mapaExistentes.get(chaveId)

    if (existente) {
      // Mesmo problema atualiza valores numéricos e severidade se mudou
      const severidadeMudou = existente.severidade !== dados.severidade
      const historicoAtualizado = [...(existente.historico || [])]

      if (severidadeMudou) {
        historicoAtualizado.push({
          data_hora: dados.agoraIso,
          usuario: 'Sistema PCP (Automático)',
          mensagem: `Severidade recalculada de ${existente.severidade} para ${dados.severidade} devido a alteração nos saldos/programação.`,
        })
      }

      // Se estava resolvido e voltou a falhar, reabre
      let novoStatus = existente.status
      if (
        !existente.ativo &&
        (existente.status === 'Resolvido' || existente.status === 'Encerrado')
      ) {
        novoStatus = 'Ação necessária'
        historicoAtualizado.push({
          data_hora: dados.agoraIso,
          usuario: 'Sistema PCP (Automático)',
          mensagem: 'Alerta reaberto automaticamente: condição de déficit reincidente.',
          status_anterior: existente.status,
          status_novo: 'Ação necessária',
        })
      }

      const atualizado: AlertaCarteiraSDC = {
        ...existente,
        ativo: true,
        estoque: dados.estoque,
        saldo_atual: dados.saldo_atual,
        quantidade_programada: dados.quantidade_programada,
        saldo_projetado: dados.saldo_projetado,
        data_desejada: dados.data_desejada,
        data_prevista: dados.data_prevista,
        dias_atraso_projetado: dados.dias_atraso_projetado,
        severidade: dados.severidade,
        descricao: dados.descricao_texto,
        recomendacao: dados.recomendacao,
        status: novoStatus,
        historico: historicoAtualizado,
      }
      listaResultado.push(atualizado)
    } else {
      // Novo alerta
      const novo: AlertaCarteiraSDC = {
        id: chaveId,
        origem: 'Carteira SDC',
        empresa_centro: 'SDPL',
        material: dados.material,
        descricao: dados.descricao_texto,
        tipo_alerta: dados.tipo_alerta,
        carteira: 'CARTEIRA_SDC',
        estoque: dados.estoque,
        saldo_atual: dados.saldo_atual,
        quantidade_programada: dados.quantidade_programada,
        saldo_projetado: dados.saldo_projetado,
        data_desejada: dados.data_desejada,
        data_prevista: dados.data_prevista,
        dias_atraso_projetado: dados.dias_atraso_projetado,
        severidade: dados.severidade,
        data_hora_geracao: dados.agoraIso,
        status: 'Novo',
        recomendacao: dados.recomendacao,
        link_detalhamento: dados.link_detalhamento,
        ativo: true,
        historico: [
          {
            data_hora: dados.agoraIso,
            usuario: 'Sistema PCP (Automático)',
            mensagem: `Alerta gerado com severidade ${dados.severidade}.`,
            status_novo: 'Novo',
          },
        ],
      }
      listaResultado.push(novo)
    }
  }
}

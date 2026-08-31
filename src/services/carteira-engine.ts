import {
  CarteiraItem,
  CarteiraEntradaFutura,
  CarteiraIAInsight,
  ReconciliacaoSAPResult,
  StatusRuptura,
} from '@/types/carteira-analise'

export interface RegrasParametrizadas {
  amareloDiasRuptura: number
  prefixosL1: Record<string, { familia: string; linha: string; descricao: string }>
  prefixosL2: Record<string, { familia: string; linha: string; descricao: string }>
  diasMediaFaturamentoDefeito: number
}

export const REGRAS_PADRAO: RegrasParametrizadas = {
  amareloDiasRuptura: 7,
  prefixosL1: {
    C: { familia: 'BARRA_CHATA', linha: 'L1', descricao: 'Barra Chata' },
    Q: { familia: 'BARRA_QUADRADA', linha: 'L1', descricao: 'Barra Quadrada' },
    R: { familia: 'BARRA_REDONDA', linha: 'L1', descricao: 'Barra Redonda' },
    V: { familia: 'CANTONEIRA', linha: 'L1', descricao: 'Cantoneira' },
  },
  prefixosL2: {
    R: { familia: 'REDONDO', linha: 'L2', descricao: 'Redondo' },
    Q: { familia: 'QUADRADO', linha: 'L2', descricao: 'Quadrado' },
    B: { familia: 'BLOCO', linha: 'L2', descricao: 'Bloco' },
    S: { familia: 'TARUGO', linha: 'L2', descricao: 'Tarugo / Semiacabado' },
  },
  diasMediaFaturamentoDefeito: 30,
}

export class CarteiraZSD28CEngine {
  public static calcularItem(
    item: CarteiraItem,
    entradasFuturas: CarteiraEntradaFutura[] = [],
    regras: RegrasParametrizadas = REGRAS_PADRAO,
    dataReferencia: Date = new Date(),
  ): CarteiraItem {
    const qtdOrdem = Math.max(0, Number(item.qtd_ordem_tons) || 0)
    const qtdFaturada = Math.max(0, Number(item.qtd_faturada_tons) || 0)
    const carteiraAberta = Math.max(0, qtdOrdem - qtdFaturada)

    const carteiraVendas =
      Number(item.carteira_vendas_tons) || (item.tipo_ordem === 'MTS' ? carteiraAberta : 0)
    const carteiraMto =
      Number(item.carteira_mto_tons) || (item.tipo_ordem === 'MTO' ? carteiraAberta : 0)

    const estoqueLivre = Math.max(0, Number(item.estoque_livre_tons) || 0)
    const estoqueMto = Math.max(0, Number(item.estoque_mto_tons) || 0)
    const estoqueSemi = Math.max(0, Number(item.estoque_semiacabado_tons) || 0)
    const estoqueSemiCiafal = Number(item.estoque_semiacabado_ciafal_tons) || estoqueSemi
    const estoqueSemiVallourec = Number(item.estoque_semiacabado_vallourec_tons) || 0
    const estoqueAcabado = Math.max(0, Number(item.estoque_acabado_tons) || 0)

    const entradasElegiveis = entradasFuturas.filter(
      (e) => e.codigo_material.trim().toUpperCase() === item.codigo_material.trim().toUpperCase(),
    )
    const totalEntradasFuturas = entradasElegiveis.reduce(
      (acc, cur) =>
        acc +
        Math.max(
          0,
          Number(cur.quantidade_pendente_tons) || Number(cur.quantidade_prevista_tons) || 0,
        ),
      0,
    )

    let disponibilidadeFisica = 0
    if (item.tipo_ordem === 'MTO') {
      disponibilidadeFisica = estoqueMto + estoqueAcabado
    } else {
      disponibilidadeFisica = estoqueLivre
    }

    let linha = item.linha || 'GERAL'
    const prefixo = (item.codigo_material || '').charAt(0).toUpperCase()
    if (!item.linha) {
      if (regras.prefixosL1[prefixo]) {
        linha = 'L1'
      } else if (regras.prefixosL2[prefixo]) {
        linha = 'L2'
      }
    }

    let saldoPositivo = 0
    let saldoNegativo = 0
    let necessidadeLiquida = 0
    let faltaProduzir = 0
    let statusAtendimento = item.status_atendimento || 'A_PRODUZIR'

    if (linha === 'L1') {
      const dispL1 = estoqueLivre + estoqueMto + estoqueSemi
      const demandaL1 = carteiraVendas + carteiraMto
      const balancoL1 = dispL1 - demandaL1
      saldoNegativo = Math.min(0, balancoL1)
      saldoPositivo = Math.max(0, balancoL1)
      necessidadeLiquida = Math.max(0, -saldoNegativo - totalEntradasFuturas)
      faltaProduzir =
        item.tipo_ordem === 'MTO' ? Math.max(0, carteiraAberta - estoqueMto) : necessidadeLiquida
    } else if (linha === 'L2') {
      const zsd24 = item.zsd24_tons !== undefined ? Number(item.zsd24_tons) : carteiraVendas
      const dispNegativaL2 = estoqueLivre + estoqueMto + estoqueSemiCiafal + estoqueSemiVallourec
      const demandaNegativaL2 = zsd24 + carteiraMto
      saldoNegativo = Math.min(0, dispNegativaL2 - demandaNegativaL2)

      const dispSaldoL2 = estoqueLivre + estoqueMto + estoqueSemiCiafal
      const demandaSaldoL2 = carteiraVendas + carteiraMto
      saldoPositivo = Math.max(0, dispSaldoL2 - demandaSaldoL2)

      necessidadeLiquida = Math.max(0, -saldoNegativo - totalEntradasFuturas)
      faltaProduzir =
        item.tipo_ordem === 'MTO'
          ? Math.max(0, carteiraAberta - (estoqueSemiCiafal + estoqueAcabado))
          : necessidadeLiquida
    } else {
      const balanco = disponibilidadeFisica - carteiraAberta
      saldoPositivo = Math.max(0, balanco)
      saldoNegativo = Math.min(0, balanco)
      necessidadeLiquida = Math.max(
        0,
        carteiraAberta - disponibilidadeFisica - totalEntradasFuturas,
      )
      faltaProduzir = necessidadeLiquida
    }

    if (item.tipo_ordem === 'MTO') {
      if (item.bloqueio) {
        statusAtendimento = 'BLOQUEADO'
      } else if (faltaProduzir <= 0) {
        statusAtendimento = 'A_FATURAR'
      } else if ((item.qtd_programada_tons || 0) > 0) {
        statusAtendimento = 'PROGRAMADO'
      } else {
        statusAtendimento = 'A_PRODUZIR'
      }
    } else {
      if (item.bloqueio) {
        statusAtendimento = 'BLOQUEADO'
      } else if (saldoPositivo >= carteiraAberta && carteiraAberta > 0) {
        statusAtendimento = 'A_FATURAR'
      } else if ((item.qtd_programada_tons || 0) > 0) {
        statusAtendimento = 'PROGRAMADO'
      } else {
        statusAtendimento = 'A_PRODUZIR'
      }
    }

    const mediaFaturamento = Math.max(0, Number(item.media_faturamento_diario_t_dia) || 0)
    let diasCobertura: number | undefined = undefined
    let dataFimEstoque: string | undefined = undefined
    let statusRuptura: StatusRuptura = 'CINZA'

    const estoqueAtualTotal = estoqueLivre + estoqueMto + estoqueAcabado

    if (mediaFaturamento > 0) {
      diasCobertura = Math.round((estoqueAtualTotal / mediaFaturamento) * 10) / 10
      const fimDate = new Date(dataReferencia.getTime() + diasCobertura * 24 * 60 * 60 * 1000)
      dataFimEstoque = fimDate.toISOString().split('T')[0]

      if (item.data_programada) {
        const dataProg = new Date(item.data_programada)
        const diffDias = Math.round(
          (fimDate.getTime() - dataProg.getTime()) / (24 * 60 * 60 * 1000),
        )

        if (diffDias >= 0) {
          statusRuptura = 'VERDE'
        } else if (Math.abs(diffDias) <= regras.amareloDiasRuptura) {
          statusRuptura = 'AMARELO'
        } else {
          statusRuptura = 'VERMELHO'
        }
      } else {
        if (diasCobertura <= 7) {
          statusRuptura = 'VERMELHO'
        } else if (diasCobertura <= 15) {
          statusRuptura = 'AMARELO'
        } else {
          statusRuptura = 'CINZA'
        }
      }
    } else {
      diasCobertura = undefined
      dataFimEstoque = undefined
      statusRuptura = item.data_programada ? 'VERDE' : 'CINZA'
    }

    let possivelDuplicidade = false
    let duplicidadeDetalhes = undefined

    const qtdProgramada = Number(item.qtd_programada_tons) || 0
    const coberturaTotalPlanejada = estoqueAtualTotal + totalEntradasFuturas + qtdProgramada

    if (carteiraAberta > 0 && qtdProgramada > 0 && totalEntradasFuturas > 0) {
      if (coberturaTotalPlanejada > carteiraAberta + 0.1) {
        possivelDuplicidade = true
        const excesso = Math.round((coberturaTotalPlanejada - carteiraAberta) * 100) / 100
        duplicidadeDetalhes = {
          tipo_duplicidade: 'SOBRECOBERTURA_PRODUCAO_REVENDA' as const,
          descricao: `Sobrecobertura detectada: Carteira Aberta de ${carteiraAberta.toFixed(1)} t possui Estoque (${estoqueAtualTotal.toFixed(1)} t), Entradas Futuras (${totalEntradasFuturas.toFixed(1)} t) e Produção Programada (${qtdProgramada.toFixed(1)} t). Excesso planejado: ${excesso.toFixed(1)} t.`,
          evidencia: `Material ${item.codigo_material}: Estoque ${estoqueAtualTotal.toFixed(1)}t + Entradas ${totalEntradasFuturas.toFixed(1)}t + Prog ${qtdProgramada.toFixed(1)}t = ${coberturaTotalPlanejada.toFixed(1)}t vs Demanda ${carteiraAberta.toFixed(1)}t.`,
          quantidade_sobrecoberta_tons: excesso,
        }
      }
    }

    const memoriaCalculo = {
      formula_aplicada:
        linha === 'L1'
          ? 'Regra Ciclo L1: Demanda = Carteira Vendas + Carteira MTO; Disp = Estoque Livre + MTO + Semiacabado; Saldo Neg = MIN(0; Disp - Demanda)'
          : linha === 'L2'
            ? 'Regra Legada Ciclo L2: Carteira Negativa = MIN(0; (Livre + MTO + Semi CIAFAL + Semi Vallourec) - (ZSD24 + MTO)); Saldo = MAX(0; (Livre + MTO + Semi CIAFAL) - (Vendas + MTO))'
            : 'Regra ZSD28C SAP: Carteira Aberta = Qtd Ordem - Faturada; Necessidade = Carteira Aberta - Estoque Elegível - Entradas Futuras',
      campos_utilizados: {
        qtd_ordem_tons: qtdOrdem,
        qtd_faturada_tons: qtdFaturada,
        carteira_aberta_tons: carteiraAberta,
        estoque_livre_tons: estoqueLivre,
        estoque_mto_tons: estoqueMto,
        estoque_semiacabado_tons: estoqueSemi,
        estoque_semiacabado_ciafal_tons: estoqueSemiCiafal,
        estoque_semiacabado_vallourec_tons: estoqueSemiVallourec,
        estoque_acabado_tons: estoqueAcabado,
        entradas_futuras_tons: totalEntradasFuturas,
        saldo_positivo_tons: saldoPositivo,
        saldo_negativo_tons: saldoNegativo,
        necessidade_liquida_tons: necessidadeLiquida,
        media_faturamento_diario: mediaFaturamento,
        dias_cobertura: diasCobertura ?? 'Sem consumo histórico',
      },
      explicacao_passo_a_passo: [
        `1. Carteira aberta apurada: ${carteiraAberta.toFixed(2)} t (${qtdOrdem.toFixed(2)} t pedido - ${qtdFaturada.toFixed(2)} t faturado).`,
        `2. Disponibilidade elegível apurada: ${disponibilidadeFisica.toFixed(2)} t considerando tipo ${item.tipo_ordem}.`,
        `3. Entradas futuras vinculadas: ${totalEntradasFuturas.toFixed(2)} t.`,
        `4. Saldo Positivo: ${saldoPositivo.toFixed(2)} t | Saldo Negativo: ${saldoNegativo.toFixed(2)} t.`,
        `5. Necessidade líquida apurada: ${necessidadeLiquida.toFixed(2)} t.`,
      ],
      regra_versao: 'v1.4-ZSD28C-CIAFAL',
      fonte_dado: item.upload_code ? `Carga ${item.upload_code}` : 'SAP QAS / Motor PCP',
      data_hora_apuracao: new Date().toISOString(),
    }

    return {
      ...item,
      linha,
      qtd_ordem_tons: qtdOrdem,
      qtd_faturada_tons: qtdFaturada,
      carteira_aberta_tons: carteiraAberta,
      carteira_vendas_tons: carteiraVendas,
      carteira_mto_tons: carteiraMto,
      estoque_livre_tons: estoqueLivre,
      estoque_mto_tons: estoqueMto,
      estoque_semiacabado_tons: estoqueSemi,
      estoque_semiacabado_ciafal_tons: estoqueSemiCiafal,
      estoque_semiacabado_vallourec_tons: estoqueSemiVallourec,
      estoque_acabado_tons: estoqueAcabado,
      disponibilidade_fisica_elegivel_tons: disponibilidadeFisica,
      saldo_disponivel_tons: saldoPositivo + saldoNegativo,
      saldo_positivo_tons: saldoPositivo,
      saldo_negativo_tons: saldoNegativo,
      necessidade_liquida_tons: necessidadeLiquida,
      falta_produzir_tons: faltaProduzir,
      status_atendimento: statusAtendimento,
      dias_cobertura: diasCobertura,
      data_fim_estoque: dataFimEstoque,
      status_ruptura: statusRuptura,
      possivel_duplicidade: possivelDuplicidade,
      duplicidade_detalhes: duplicidadeDetalhes,
      memoria_calculo: memoriaCalculo,
    }
  }

  public static gerarInsightsIA(
    itens: CarteiraItem[],
    entradasFuturas: CarteiraEntradaFutura[] = [],
  ): CarteiraIAInsight[] {
    const insights: CarteiraIAInsight[] = []

    const curvaACriticos = itens.filter(
      (i) => (i.curva_abc === 'A' || i.curva_abc === 'Curva A') && (i.saldo_negativo_tons || 0) < 0,
    )
    if (curvaACriticos.length > 0) {
      const tonsNegativas = curvaACriticos.reduce(
        (sum, i) => sum + Math.abs(i.saldo_negativo_tons || 0),
        0,
      )
      insights.push({
        insight_code: `IA-CURVA-A-${Date.now()}`,
        titulo: `${curvaACriticos.length} Materiais de Curva A com Saldo Negativo (${tonsNegativas.toFixed(1)} t)`,
        criticidade: 'CRITICA',
        categoria: 'CURVA_A_CRITICA',
        problema_encontrado: `Existem ${curvaACriticos.length} produtos de alta relevância comercial (Curva A) com carteira descoberta.`,
        evidencia: `Materiais impactados: ${curvaACriticos
          .slice(0, 3)
          .map((c) => c.codigo_material)
          .join(', ')}. Volume total negativo: ${tonsNegativas.toFixed(1)} t.`,
        impacto:
          'Risco de não atendimento a clientes estratégicos e impacto no faturamento da empresa.',
        causa_provavel:
          'Consumo acelerado no período ou falta de alocação de matéria-prima nas semanas anteriores.',
        acao_sugerida:
          'Priorizar inclusão no sequenciador da linha na próxima grade de montagem semanal.',
        nivel_confianca_pct: 96,
        materiais_afetados: curvaACriticos.map((i) => i.codigo_material),
      })
    }

    const rupturas = itens.filter((i) => i.status_ruptura === 'VERMELHO')
    if (rupturas.length > 0) {
      insights.push({
        insight_code: `IA-RUPTURA-${Date.now()}`,
        titulo: `${rupturas.length} Produtos com Ruptura Prevista antes da Produção`,
        criticidade: 'ALTA',
        categoria: 'RUPTURA_IMINENTE',
        problema_encontrado:
          'A data estimada de fim do estoque ocorre antes da data programada da produção.',
        evidencia: `${rupturas.length} itens possuem cobertura inferior ao lead time até a produção. Ex: ${rupturas[0].codigo_material} (Data Fim Estoque: ${rupturas[0].data_fim_estoque || 'Imediato'}).`,
        impacto: 'Parada na expedição de pedidos e reclamação de prazos pelos clientes.',
        causa_provavel:
          'Sequenciamento tardio na grade ou intervalo excessivo entre campanhas de perfil.',
        acao_sugerida:
          'Avaliar antecipação da sequência produtiva ou verificação de estoque em outros depósitos.',
        nivel_confianca_pct: 92,
        materiais_afetados: rupturas.map((i) => i.codigo_material),
      })
    }

    const duplicidades = itens.filter((i) => i.possivel_duplicidade)
    if (duplicidades.length > 0) {
      insights.push({
        insight_code: `IA-DUPLICIDADE-${Date.now()}`,
        titulo: `Possível Sobrecobertura / Duplicidade em ${duplicidades.length} Materiais`,
        criticidade: 'ALTA',
        categoria: 'DUPLICIDADE_ATENDIMENTO',
        problema_encontrado:
          'Concorrência de atendimento entre produção própria programada e compra/revenda/estoque para a mesma carteira.',
        evidencia:
          duplicidades[0].duplicidade_detalhes?.descricao ||
          'Sobrecobertura detectada entre pedidos de compra e ordens de fabricação.',
        impacto:
          'Geração de estoque excedente sem demanda firme e ocupação desnecessária de capacidade da linha.',
        causa_provavel: 'Falta de comunicação entre Comercial, Compras e PCP na alocação de lotes.',
        acao_sugerida:
          'Consultar programador do PCP para decidir entre cancelar/postergar compra de revenda ou reprogramar a linha.',
        nivel_confianca_pct: 95,
        duplicidade_envolvida: true,
        materiais_afetados: duplicidades.map((i) => i.codigo_material),
      })
    }

    const mtoSemProg = itens.filter(
      (i) =>
        i.tipo_ordem === 'MTO' &&
        i.status_atendimento === 'A_PRODUZIR' &&
        (!i.qtd_programada_tons || i.qtd_programada_tons === 0),
    )
    if (mtoSemProg.length > 0) {
      const tonsMto = mtoSemProg.reduce((sum, i) => sum + (i.carteira_aberta_tons || 0), 0)
      insights.push({
        insight_code: `IA-MTO-DESCOBERTO-${Date.now()}`,
        titulo: `${mtoSemProg.length} Ordens MTO a Produzir Sem Programação (${tonsMto.toFixed(1)} t)`,
        criticidade: 'MEDIA',
        categoria: 'MTO_SEM_PROGRAMACAO',
        problema_encontrado:
          'Pedidos sob encomenda (MTO) com saldo pendente de produção e ainda não inseridos no cronograma.',
        evidencia: `Total de ${tonsMto.toFixed(1)} t de pedidos MTO aguardando sequência fabril.`,
        impacto: 'Risco de ultrapassar a data de entrega prometida ao cliente.',
        causa_provavel: 'Aguardando validação de matéria-prima ou formação de lote mínimo.',
        acao_sugerida:
          'Verificar disponibilidade de tarugos na Gestão de MP e sequenciar na Central.',
        nivel_confianca_pct: 89,
        materiais_afetados: mtoSemProg.map((i) => i.codigo_material),
      })
    }

    const entradasAtrasadas = entradasFuturas.filter(
      (e) => e.status_entrada === 'ATRASADO' || new Date(e.data_prevista_entrada) < new Date(),
    )
    if (entradasAtrasadas.length > 0) {
      insights.push({
        insight_code: `IA-ENTRADA-ATRASADA-${Date.now()}`,
        titulo: `${entradasAtrasadas.length} Entradas Futuras (Revenda/Importado) com Previsão Vencida`,
        criticidade: 'MEDIA',
        categoria: 'ENTRADA_FUTURA_ATRASADA',
        problema_encontrado:
          'Recebimento de lotes externos previsto em data anterior à data atual.',
        evidencia: `Fornecedores: ${Array.from(new Set(entradasAtrasadas.map((e) => e.fornecedor_origem))).join(', ')}.`,
        impacto: 'Falta de material para cobertura de pedidos de revenda comprometidos.',
        causa_provavel: 'Atraso logístico ou liberação aduaneira pendente no desembaraço.',
        acao_sugerida:
          'Atualizar previsão de chegada junto a Suprimentos e verificar pedidos afetados.',
        nivel_confianca_pct: 94,
        materiais_afetados: entradasAtrasadas.map((e) => e.codigo_material),
      })
    }

    return insights
  }

  public static reconciliarComSAP(
    itensPcp: CarteiraItem[],
    dadosSapSimulados: Array<{
      codigo_material: string
      descricao: string
      ordem_venda: string
      item_ordem: string
      sap_quantidade_tons: number
      sap_estoque_tons: number
      sap_saldo_tons: number
    }>,
  ): ReconciliacaoSAPResult[] {
    return itensPcp.map((pcpItem) => {
      const sapMatch = dadosSapSimulados.find(
        (s) =>
          s.codigo_material.trim().toUpperCase() === pcpItem.codigo_material.trim().toUpperCase() &&
          s.ordem_venda === pcpItem.ordem_venda &&
          s.item_ordem === pcpItem.item_ordem,
      )

      if (!sapMatch) {
        return {
          codigo_material: pcpItem.codigo_material,
          descricao: pcpItem.descricao_material,
          ordem_venda: pcpItem.ordem_venda,
          item_ordem: pcpItem.item_ordem,
          pcp_quantidade_tons: pcpItem.carteira_aberta_tons,
          sap_quantidade_tons: 0,
          diff_quantidade_tons: pcpItem.carteira_aberta_tons,
          pcp_estoque_tons: pcpItem.disponibilidade_fisica_elegivel_tons || 0,
          sap_estoque_tons: 0,
          diff_estoque_tons: pcpItem.disponibilidade_fisica_elegivel_tons || 0,
          pcp_saldo_tons: pcpItem.saldo_positivo_tons + pcpItem.saldo_negativo_tons,
          sap_saldo_tons: 0,
          diff_saldo_tons: pcpItem.saldo_positivo_tons + pcpItem.saldo_negativo_tons,
          status_conciliacao: 'CAMPO_DEPENDENTE_SAP',
          detalhes: 'Item presente na carteira QAS sem espelho ativo na carga de conciliação SAP.',
        }
      }

      const diffQtd = Math.abs(pcpItem.carteira_aberta_tons - sapMatch.sap_quantidade_tons)
      const diffEstoque = Math.abs(
        (pcpItem.disponibilidade_fisica_elegivel_tons || 0) - sapMatch.sap_estoque_tons,
      )
      const pcpSaldo = pcpItem.saldo_positivo_tons + pcpItem.saldo_negativo_tons
      const diffSaldo = Math.abs(pcpSaldo - sapMatch.sap_saldo_tons)

      const is100 = diffQtd < 0.01 && diffEstoque < 0.01 && diffSaldo < 0.01

      return {
        codigo_material: pcpItem.codigo_material,
        descricao: pcpItem.descricao_material,
        ordem_venda: pcpItem.ordem_venda,
        item_ordem: pcpItem.item_ordem,
        pcp_quantidade_tons: pcpItem.carteira_aberta_tons,
        sap_quantidade_tons: sapMatch.sap_quantidade_tons,
        diff_quantidade_tons: diffQtd,
        pcp_estoque_tons: pcpItem.disponibilidade_fisica_elegivel_tons || 0,
        sap_estoque_tons: sapMatch.sap_estoque_tons,
        diff_estoque_tons: diffEstoque,
        pcp_saldo_tons: pcpSaldo,
        sap_saldo_tons: sapMatch.sap_saldo_tons,
        diff_saldo_tons: diffSaldo,
        status_conciliacao: is100 ? 'PARIDADE_100' : 'DIVERGENCIA',
        detalhes: is100
          ? 'Paridade funcional 1:1 confirmada com SAP ZSD28C.'
          : 'Divergência de apuração identificada — verificar momento de corte do saldo.',
      }
    })
  }
}

/**
 * MOTOR DE ANÁLISE AUTOMÁTICA & ALERTAS DE CARTEIRA (REUTILIZÁVEL)
 * PCP ROBOTIZADO — CIAFAL WILSON SANTOS
 *
 * Atende às 7 carteiras: Geral, L1, L2, MTO, Revenda, Importado e SDC.
 * Classificações:
 * - CRÍTICO: Demanda sem estoque e sem programação; ruptura confirmada/projetada; saldo projetado negativo relevante
 * - ATENÇÃO: Cobertura reduzida; programação insuficiente; risco futuro; acompanhamento
 * - INFORMATIVO: Cobertura restabelecida; produção prevista; situação regular
 * - POSITIVO: Programação suficiente; estoque + produção cobrindo a demanda; regularização de déficit anterior
 *
 * Padronização estrita pt-BR nos textos gerados:
 * - Números com vírgula para decimal e ponto para milhar
 * - Toneladas com "t" e kg com "kg"
 * - Datas no formato DD/MM/AAAA
 */

import { formatNumberPTBR, formatDatePTBR, formatQuantity } from '@/lib/formatters-ptbr'
import { CarteiraItem, CarteiraEntradaFutura } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'

export type SeveridadeAlertaCarteira = 'CRITICO' | 'ATENCAO' | 'INFORMATIVO' | 'POSITIVO'

export interface AlertaCarteiraItem {
  id: string
  classificacao: SeveridadeAlertaCarteira
  material: string
  descricao?: string
  mensagem: string
  detalhe?: string
  carteira_t?: number
  estoque_t?: number
  saldo_t?: number
  saldo_projetado_t?: number
  data_cobertura?: string
  data_producao?: string
  dias_risco?: number
}

export interface IndicadoresCarteira {
  carteiraTotal_t: number
  estoqueTotal_t: number
  deficitAtual_t: number
  itensComDeficit_count: number
  emProducao_t: number
  coberturaProgramada_t: number
  itensCriticos_count: number
  saldoProjetado_t: number
  itensSemProgramacao_count: number
  itensRiscoRuptura_count: number
  totalItens: number
  // Campos complementares opcionais quando disponíveis
  estoqueBloqueado_t?: number
  entradasPrevistas_t?: number
  mediaDiariaFaturamento_t?: number
}

export type TipoCarteiraPCP = 'GERAL' | 'L1' | 'L2' | 'MTO' | 'REVENDA' | 'IMPORTADO' | 'SDC'

export class CarteiraAnaliseEngine {
  /**
   * Arredonda com precisão de 2 casas decimais
   */
  public static round2(val: number): number {
    return Math.round((Number(val) || 0) * 100) / 100
  }

  /**
   * Analisa itens genéricos (CarteiraItem) para Carteira Geral, L1, L2, MTO, Revenda ou Importado
   */
  public static analisarCarteiraGenerica(
    tipo: TipoCarteiraPCP,
    itens: CarteiraItem[],
    entradasFuturas: CarteiraEntradaFutura[] = [],
  ): {
    indicadores: IndicadoresCarteira
    alertas: AlertaCarteiraItem[]
    analisesIA: string[]
  } {
    // 1. Filtrar pelo escopo da carteira
    let itensEscopo = itens
    if (tipo === 'L1') {
      itensEscopo = itens.filter(
        (i) =>
          i.linha === 'L1' ||
          ['C', 'Q', 'R', 'V'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
      )
    } else if (tipo === 'L2') {
      itensEscopo = itens.filter(
        (i) =>
          i.linha === 'L2' ||
          ['R', 'Q', 'B', 'S'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
      )
    } else if (tipo === 'MTO') {
      itensEscopo = itens.filter((i) => i.tipo_ordem === 'MTO' || i.tipo_ordem === 'ZPRM')
    } else if (tipo === 'REVENDA') {
      itensEscopo = itens.filter((i) => i.origem_produto === 'REVENDA')
    } else if (tipo === 'IMPORTADO') {
      itensEscopo = itens.filter((i) => i.origem_produto === 'IMPORTADO')
    }

    let carteiraTotal = 0
    let estoqueTotal = 0
    let deficitAtual = 0
    let itensComDeficitCount = 0
    let emProducaoTotal = 0
    let coberturaProgramadaTotal = 0
    let itensCriticosCount = 0
    let saldoProjetadoTotal = 0
    let itensSemProgramacaoCount = 0
    let itensRiscoRupturaCount = 0
    let estoqueBloqueadoTotal = 0
    let entradasPrevistasTotal = 0

    const alertas: AlertaCarteiraItem[] = []

    for (const it of itensEscopo) {
      const demanda = Math.max(0, this.round2(it.carteira_aberta_tons || 0))
      carteiraTotal += demanda

      // Estoque disponível conforme a especificidade da carteira
      let estoque = 0
      if (tipo === 'L1') {
        estoque = this.round2(
          (it.estoque_livre_tons || 0) +
            (it.estoque_mto_tons || 0) +
            (it.estoque_semiacabado_tons || 0),
        )
      } else if (tipo === 'L2') {
        estoque = this.round2(
          (it.estoque_livre_tons || 0) +
            (it.estoque_semiacabado_ciafal_tons || it.estoque_semiacabado_tons || 0) +
            (it.estoque_semiacabado_vallourec_tons || 0),
        )
      } else if (tipo === 'MTO') {
        estoque = this.round2(it.estoque_mto_tons || it.estoque_livre_tons || 0)
      } else if (tipo === 'REVENDA' || tipo === 'IMPORTADO') {
        estoque = this.round2(it.estoque_livre_tons || 0)
      } else {
        estoque = this.round2(it.saldo_disponivel_tons ?? (it.estoque_livre_tons || 0))
      }
      estoqueTotal += estoque

      // Saldo físico atual
      const saldo = this.round2(estoque - demanda)
      if (saldo < 0) {
        deficitAtual += Math.abs(saldo)
        itensComDeficitCount++
      }

      // Programação / Entradas
      const programadoOuProducao = this.round2(it.qtd_programada_tons || 0)
      emProducaoTotal += programadoOuProducao

      // Entradas futuras vinculadas
      const entradasItem = entradasFuturas
        .filter((e) => e.codigo_material === it.codigo_material)
        .reduce((sum, e) => sum + (e.quantidade_pendente_tons || 0), 0)
      entradasPrevistasTotal += entradasItem

      const saldoProjetado = this.round2(estoque + programadoOuProducao + entradasItem - demanda)
      saldoProjetadoTotal += saldoProjetado

      if (it.bloqueio) {
        estoqueBloqueadoTotal += demanda
      }

      const temProgramacao = programadoOuProducao > 0 || entradasItem > 0
      if (!temProgramacao && demanda > 0) {
        itensSemProgramacaoCount++
      }

      if (it.status_ruptura === 'VERMELHO') {
        itensRiscoRupturaCount++
      }

      // Análise temporal unificada
      const origemMotor =
        tipo === 'L1' ? 'L1' : tipo === 'L2' ? 'L2' : tipo === 'MTO' ? 'MTO' : 'GERAL'
      const inputTemp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
        it,
        origemMotor,
        entradasFuturas,
      )
      const resTemp = CoberturaTemporalEngine.calcular(inputTemp)

      if (resTemp.temGapRuptura || it.status_ruptura === 'VERMELHO') {
        itensCriticosCount++
      }

      if (saldo < 0 && saldoProjetado >= 0) {
        coberturaProgramadaTotal += demanda
      }

      // GERAR ALERTAS ESPECÍFICOS DO ITEM (textos-modelo solicitados)
      const mat = it.codigo_material
      const desc = it.descricao_material

      // 1. Caso MTO com requisito pendente ou atraso
      if (tipo === 'MTO') {
        if (it.bloqueio) {
          alertas.push({
            id: `mto-bloq-${it.id || mat}-${it.ordem_venda || ''}`,
            classificacao: 'CRITICO',
            material: mat,
            descricao: desc,
            mensagem: `Ordem MTO ${it.ordem_venda || ''} do cliente ${it.nome_cliente || 'N/D'} para o material ${mat}: requisito necessário não atendido ou bloqueado. Verificar liberação comercial e técnica.`,
            carteira_t: demanda,
            estoque_t: estoque,
            saldo_t: saldo,
          })
        } else if (it.falta_produzir_tons > 0 && !temProgramacao) {
          alertas.push({
            id: `mto-noprog-${it.id || mat}-${it.ordem_venda || ''}`,
            classificacao: 'CRITICO',
            material: mat,
            descricao: desc,
            mensagem: `Ordem MTO ${it.ordem_venda || ''} do cliente ${it.nome_cliente || 'N/D'} para o material ${mat} não está vinculada à programação PCP e apresenta falta a produzir de ${formatQuantity(it.falta_produzir_tons, 't')}.`,
            carteira_t: demanda,
            estoque_t: estoque,
            saldo_t: saldo,
          })
        }
      }

      // 2. Sem estoque
      if (demanda > 0 && estoque === 0) {
        if (!temProgramacao) {
          alertas.push({
            id: `sem-estoque-crit-${it.id || mat}`,
            classificacao: 'CRITICO',
            material: mat,
            descricao: desc,
            mensagem: `Material ${mat} possui demanda em carteira de ${formatQuantity(demanda, 't')}, porém não possui estoque disponível e não possui programação vinculada.`,
            carteira_t: demanda,
            estoque_t: 0,
            saldo_t: -demanda,
          })
        } else {
          alertas.push({
            id: `sem-estoque-${it.id || mat}`,
            classificacao: 'ATENCAO',
            material: mat,
            descricao: desc,
            mensagem: `Material ${mat} possui demanda em carteira, porém não possui estoque disponível. Cobertura depende de produção programada de ${formatQuantity(programadoOuProducao + entradasItem, 't')}.`,
            carteira_t: demanda,
            estoque_t: 0,
            saldo_t: -demanda,
          })
        }
      }
      // 3. Déficit com ou sem programação
      else if (saldo < 0) {
        if (!temProgramacao) {
          alertas.push({
            id: `sem-prog-${it.id || mat}`,
            classificacao: 'CRITICO',
            material: mat,
            descricao: desc,
            mensagem: `Material ${mat} apresenta demanda sem cobertura de ${formatQuantity(Math.abs(saldo), 't')} e não possui programação PCP vinculada.`,
            carteira_t: demanda,
            estoque_t: estoque,
            saldo_t: saldo,
          })
        } else if (saldoProjetado < 0) {
          alertas.push({
            id: `prog-insuf-${it.id || mat}`,
            classificacao: 'ATENCAO',
            material: mat,
            descricao: desc,
            mensagem: `Mesmo considerando a programação existente (${formatQuantity(programadoOuProducao + entradasItem, 't')}), o saldo projetado do material ${mat} permanece negativo em ${formatQuantity(Math.abs(saldoProjetado), 't')}.`,
            carteira_t: demanda,
            estoque_t: estoque,
            saldo_t: saldo,
            saldo_projetado_t: saldoProjetado,
          })
        } else {
          alertas.push({
            id: `cob-restab-${it.id || mat}`,
            classificacao: 'POSITIVO',
            material: mat,
            descricao: desc,
            mensagem: `Material ${mat} apresenta déficit atual de ${formatQuantity(Math.abs(saldo), 't')}, porém a programação existente de ${formatQuantity(programadoOuProducao + entradasItem, 't')} restabelece a cobertura projetada (+${formatQuantity(saldoProjetado, 't')}).`,
            carteira_t: demanda,
            estoque_t: estoque,
            saldo_t: saldo,
            saldo_projetado_t: saldoProjetado,
          })
        }
      }

      // 4. Risco de ruptura temporal
      if (resTemp.temGapRuptura && resTemp.diasEstoqueNegativo) {
        const dataCobStr = resTemp.dataFimEstoqueFormatada
        const proxRepStr = resTemp.proximaDataPrevistaFormatada
        alertas.push({
          id: `ruptura-${it.id || mat}`,
          classificacao: 'CRITICO',
          material: mat,
          descricao: desc,
          mensagem: `Material ${mat} apresenta cobertura projetada insuficiente para atender a demanda prevista. Fim do estoque em ${dataCobStr} e reposição em ${proxRepStr}, gerando risco de ruptura de ${resTemp.diasEstoqueNegativo} dias.`,
          carteira_t: demanda,
          estoque_t: estoque,
          saldo_t: saldo,
        })
      }
    }

    // Ordenar alertas por severidade: CRÍTICO > ATENÇÃO > INFORMATIVO > POSITIVO
    const prioridadeSeveridade: Record<SeveridadeAlertaCarteira, number> = {
      CRITICO: 1,
      ATENCAO: 2,
      INFORMATIVO: 3,
      POSITIVO: 4,
    }
    alertas.sort(
      (a, b) => prioridadeSeveridade[a.classificacao] - prioridadeSeveridade[b.classificacao],
    )

    // Gerar análises automáticas sintéticas e contextualizadas da IA para a carteira
    const analisesIA: string[] = []

    // 1. Diagnóstico de déficit
    const primeiroDeficit = alertas.find((a) => a.saldo_t && a.saldo_t < 0)
    if (
      primeiroDeficit &&
      primeiroDeficit.carteira_t !== undefined &&
      primeiroDeficit.estoque_t !== undefined
    ) {
      analisesIA.push(
        `Material ${primeiroDeficit.material} possui carteira de ${formatQuantity(primeiroDeficit.carteira_t, 't')} e estoque disponível de ${formatQuantity(primeiroDeficit.estoque_t, 't')}, resultando em déficit atual de ${formatQuantity(Math.abs(primeiroDeficit.saldo_t || 0), 't')}. Verificar programação existente e necessidade de cobertura.`,
      )
    }

    // 2. Itens críticos sem programação
    if (itensSemProgramacaoCount > 0) {
      analisesIA.push(
        `Identificados ${itensSemProgramacaoCount} materiais com demanda em carteira e sem programação vinculada no PCP. Recomenda-se sequenciamento prioritário para evitar desatendimento aos clientes.`,
      )
    }

    // 3. Efeito da programação na recuperação de cobertura
    if (coberturaProgramadaTotal > 0) {
      analisesIA.push(
        `A programação fabril vigente restabelece a cobertura projetada para ${formatQuantity(coberturaProgramadaTotal, 't')} de carteira anteriormente deficitária.`,
      )
    }

    // 4. Especificidades por carteira
    if (tipo === 'MTO') {
      const bloqCount = itensEscopo.filter((i) => i.bloqueio).length
      if (bloqCount > 0) {
        analisesIA.push(
          `Atenção na Carteira MTO: ${bloqCount} ordens possuem requisitos comerciais, de qualidade ou técnicos com pendência, impedindo o avanço para a esteira de produção.`,
        )
      } else {
        analisesIA.push(
          `Carteira MTO regular: todas as ordens vinculadas estão com requisitos técnicos validados e aptas para atendimento.`,
        )
      }
    } else if (tipo === 'REVENDA') {
      analisesIA.push(
        `Carteira Revenda monitorada: saldo físico de ${formatQuantity(estoqueTotal, 't')} suportado por ${formatQuantity(entradasPrevistasTotal, 't')} em pedidos de compra (PO) previstos.`,
      )
    } else if (tipo === 'IMPORTADO') {
      analisesIA.push(
        `Comércio Exterior & Trânsito: cobertura dependente do cumprimento das datas de atracação e desembaraço aduaneiro (${formatQuantity(entradasPrevistasTotal, 't')} em trânsito).`,
      )
    } else if (tipo === 'L1') {
      analisesIA.push(
        `Ciclo L1: Demanda total de ${formatQuantity(carteiraTotal, 't')} distribuída entre estoque livre, MTO e semiacabados para laminação de perfis leves.`,
      )
    } else if (tipo === 'L2') {
      analisesIA.push(
        `Ciclo L2: Monitoramento contínuo dos lotes de semiacabado CIAFAL e Vallourec para atendimento a perfis pesados e blocos.`,
      )
    }

    return {
      indicadores: {
        carteiraTotal_t: this.round2(carteiraTotal),
        estoqueTotal_t: this.round2(estoqueTotal),
        deficitAtual_t: this.round2(deficitAtual),
        itensComDeficit_count: itensComDeficitCount,
        emProducao_t: this.round2(emProducaoTotal),
        coberturaProgramada_t: this.round2(coberturaProgramadaTotal),
        itensCriticos_count: itensCriticosCount,
        saldoProjetado_t: this.round2(saldoProjetadoTotal),
        itensSemProgramacao_count: itensSemProgramacaoCount,
        itensRiscoRuptura_count: itensRiscoRupturaCount,
        totalItens: itensEscopo.length,
        estoqueBloqueado_t: this.round2(estoqueBloqueadoTotal),
        entradasPrevistas_t: this.round2(entradasPrevistasTotal),
      },
      alertas,
      analisesIA,
    }
  }

  /**
   * Converte a Carteira SDC para a estrutura unificada de indicadores e alertas
   */
  public static analisarCarteiraSDC(itensSDC: CarteiraSDCItem[]): {
    indicadores: IndicadoresCarteira
    alertas: AlertaCarteiraItem[]
    analisesIA: string[]
  } {
    let carteiraTotal = 0
    let estoqueTotal = 0
    let deficitAtual = 0
    let itensComDeficitCount = 0
    let emProducaoTotal = 0
    let coberturaProgramadaTotal = 0
    let itensCriticosCount = 0
    let saldoProjetadoTotal = 0
    let itensSemProgramacaoCount = 0
    let itensRiscoRupturaCount = 0
    let estoqueBloqueadoTotal = 0

    const alertas: AlertaCarteiraItem[] = []

    for (const it of itensSDC) {
      const carteira = Math.max(0, this.round2(it.carteira_t || 0))
      const estoque = Math.max(0, this.round2(it.estoque_total_t || 0))
      const programado = Math.max(0, this.round2(it.programado_t || 0))
      const emProd = Math.max(0, this.round2(it.em_producao_t || 0))
      const totalProg = this.round2(programado + emProd)
      const saldo = this.round2(it.saldo_t)
      const saldoProj = this.round2(it.saldo_projetado_t)

      carteiraTotal += carteira
      estoqueTotal += estoque
      emProducaoTotal += emProd
      saldoProjetadoTotal += saldoProj
      estoqueBloqueadoTotal += it.estoque_bloqueado_t || 0

      if (saldo < 0) {
        deficitAtual += Math.abs(saldo)
        itensComDeficitCount++
      }

      if (totalProg === 0 && carteira > 0) {
        itensSemProgramacaoCount++
      }

      if (it.status === 'COBERTURA PROGRAMADA') {
        coberturaProgramadaTotal += carteira
      }

      if (it.status === 'CRÍTICO' || it.status === 'SEM ESTOQUE') {
        itensCriticosCount++
        itensRiscoRupturaCount++
      }

      // Alertas
      if (it.status === 'CRÍTICO' || (saldo < 0 && totalProg === 0)) {
        alertas.push({
          id: `sdc-crit-${it.material}`,
          classificacao: 'CRITICO',
          material: it.material,
          descricao: it.descricao,
          mensagem: `Material ${it.material} possui carteira de ${formatQuantity(carteira, 't')} e estoque de ${formatQuantity(estoque, 't')}, resultando em déficit atual de ${formatQuantity(Math.abs(saldo), 't')}. Sem programação existente no centro SDPL.`,
          carteira_t: carteira,
          estoque_t: estoque,
          saldo_t: saldo,
        })
      } else if (it.status === 'COBERTURA PARCIAL' || (saldo < 0 && saldoProj < 0)) {
        alertas.push({
          id: `sdc-atencao-${it.material}`,
          classificacao: 'ATENCAO',
          material: it.material,
          descricao: it.descricao,
          mensagem: `Mesmo considerando a programação existente de ${formatQuantity(totalProg, 't')}, o saldo projetado do material ${it.material} permanece negativo em ${formatQuantity(Math.abs(saldoProj), 't')}.`,
          carteira_t: carteira,
          estoque_t: estoque,
          saldo_t: saldo,
          saldo_projetado_t: saldoProj,
        })
      } else if (it.status === 'COBERTURA PROGRAMADA') {
        alertas.push({
          id: `sdc-pos-${it.material}`,
          classificacao: 'POSITIVO',
          material: it.material,
          descricao: it.descricao,
          mensagem: `Material ${it.material} apresenta déficit atual, porém a programação existente restabelece a cobertura projetada (+${formatQuantity(saldoProj, 't')}).`,
          carteira_t: carteira,
          estoque_t: estoque,
          saldo_t: saldo,
          saldo_projetado_t: saldoProj,
        })
      }

      if (it.estoque_bloqueado_t && it.estoque_bloqueado_t > 0) {
        alertas.push({
          id: `sdc-bloq-${it.material}`,
          classificacao: 'ATENCAO',
          material: it.material,
          descricao: it.descricao,
          mensagem: `Material ${it.material} possui estoque total de ${formatQuantity(estoque, 't')}, porém ${formatQuantity(it.estoque_bloqueado_t, 't')} estão bloqueados e indisponíveis para atendimento.`,
          carteira_t: carteira,
          estoque_t: estoque,
          saldo_t: saldo,
        })
      }
    }

    const analisesIA: string[] = []
    const primeiroDeficit = itensSDC.find((i) => i.saldo_t < 0)
    if (primeiroDeficit) {
      analisesIA.push(
        `Material ${primeiroDeficit.material} possui carteira de ${formatQuantity(primeiroDeficit.carteira_t, 't')} e estoque de ${formatQuantity(primeiroDeficit.estoque_total_t, 't')}, resultando em déficit atual de ${formatQuantity(Math.abs(primeiroDeficit.saldo_t), 't')}. Verificar programação existente e necessidade de cobertura.`,
      )
    }

    if (itensCriticosCount > 0) {
      analisesIA.push(
        `Atenção Crítica: ${itensCriticosCount} materiais sem estoque ou sem nenhuma programação vinculada no centro SDPL. Demanda desatendida imediata na Sidercentro.`,
      )
    }

    if (coberturaProgramadaTotal > 0) {
      analisesIA.push(
        `Programação SDC/CIAFAL ativa restabelece o saldo projetado de ${itensSDC.filter((i) => i.status === 'COBERTURA PROGRAMADA').length} materiais que possuíam déficit físico imediato.`,
      )
    }

    return {
      indicadores: {
        carteiraTotal_t: this.round2(carteiraTotal),
        estoqueTotal_t: this.round2(estoqueTotal),
        deficitAtual_t: this.round2(deficitAtual),
        itensComDeficit_count: itensComDeficitCount,
        emProducao_t: this.round2(emProducaoTotal),
        coberturaProgramada_t: this.round2(coberturaProgramadaTotal),
        itensCriticos_count: itensCriticosCount,
        saldoProjetado_t: this.round2(saldoProjetadoTotal),
        itensSemProgramacao_count: itensSemProgramacaoCount,
        itensRiscoRuptura_count: itensRiscoRupturaCount,
        totalItens: itensSDC.length,
        estoqueBloqueado_t: this.round2(estoqueBloqueadoTotal),
      },
      alertas,
      analisesIA,
    }
  }
}

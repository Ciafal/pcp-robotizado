/**
 * SaldoSemiacabadoEngine — motor único e reutilizável de Saldo Semiacabado
 * (Frente 1 — Análise de Carteira, HUB CIAFAL / módulo PCP Robotizado)
 *
 * Regra única (reutilizada por Carteira Geral, L1, L2, SDC e demais visões):
 *   Saldo Semiacabado = soma das quantidades disponíveis classificadas como
 *   material semiacabado, considerando somente saldo efetivamente disponível
 *   conforme as regras atuais do PCP.
 *
 * Fonte de dados: campos de semiacabado já trazidos pelas integrações SAP
 * usadas pelo PCP (ex.: estoque_semiacabado_tons em carteira_items / RFC
 * ZSD28C; decomposição CIAFAL x Vallourec na L2). Nenhum valor é fixo/mock.
 *
 * Anti-dupla contagem: nas visões em que a regra atual do saldo já embute o
 * semiacabado na disponibilidade (L1/L2: Disp = Livre + MTO + Semiacabado),
 * o semiacabado NÃO é somado novamente ao saldo — apenas decomposto. Use
 * `saldoAjustado` somente quando a fórmula atual trabalhar a partir do
 * estoque acabado.
 *
 * Estado de erro: se a fonte não trouxer informação de semiacabado para
 * nenhum registro, o resultado é INDISPONIVEL — nunca 0,00 t silencioso.
 */

export type FonteSemiacabadoStatus = 'OK' | 'INDISPONIVEL'

export interface SaldoSemiacabadoItemAvaliado {
  codigo_material: string
  descricao_material?: string
  tons: number
}

export interface SaldoSemiacabadoResultado {
  tons_total: number
  materiais_count: number
  status: FonteSemiacabadoStatus
  mensagem_erro?: string
  itens: SaldoSemiacabadoItemAvaliado[]
}

export interface EstoqueConsideradoDetalhe {
  estoque_acabado_t: number
  saldo_semiacabado_t: number
  estoque_total_considerado_t: number
}

const toNumber = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

export class SaldoSemiacabadoEngine {
  /** Arredondamento padrão do projeto (2 casas, igual aos demais motores) */
  public static round2(val: number): number {
    return Math.round((Number(val) || 0) * 100) / 100
  }

  /**
   * Avalia o saldo semiacabado de UM registro (CarteiraItem ou similar).
   * Retorna null quando a fonte não informa semiacabado para o registro
   * (estado de indisponibilidade, nunca 0,00 t silencioso).
   */
  public static avaliarItem(registro: any): number | null {
    if (!registro || typeof registro !== 'object') return null

    // Campo consolidado vindo da integração SAP (fonte oficial)
    const direto = toNumber(registro.estoque_semiacabado_tons)
    if (direto !== null) return Math.max(0, this.round2(direto))

    // Decomposição L2: Semiacabado CIAFAL + Semiacabado Vallourec
    const ciafal = toNumber(registro.estoque_semiacabado_ciafal_tons)
    const vallourec = toNumber(registro.estoque_semiacabado_vallourec_tons)
    if (ciafal !== null || vallourec !== null) {
      return Math.max(0, this.round2((ciafal || 0) + (vallourec || 0)))
    }

    return null
  }

  /**
   * Consolida o Saldo Semiacabado para um conjunto de registros da carteira
   * (respeita o contexto da tela: passe apenas os itens da visão atual).
   */
  public static calcular(registros: any[]): SaldoSemiacabadoResultado {
    const lista = Array.isArray(registros) ? registros : []
    const itens: SaldoSemiacabadoItemAvaliado[] = []
    let semInformacao = 0

    for (const registro of lista) {
      const tons = this.avaliarItem(registro)
      if (tons === null) {
        semInformacao++
        continue
      }
      if (tons > 0) {
        itens.push({
          codigo_material: String(registro.codigo_material || ''),
          descricao_material: registro.descricao_material,
          tons,
        })
      }
    }

    const tonsTotal = this.round2(itens.reduce((s, i) => s + i.tons, 0))
    const materiais = new Set(itens.map((i) => i.codigo_material).filter(Boolean))

    if (lista.length > 0 && semInformacao === lista.length) {
      return {
        tons_total: 0,
        materiais_count: 0,
        status: 'INDISPONIVEL',
        mensagem_erro:
          'Fonte de saldo semiacabado indisponível para os materiais desta carteira (integração SAP sem informação de semiacabado).',
        itens: [],
      }
    }

    return {
      tons_total: tonsTotal,
      materiais_count: materiais.size,
      status: 'OK',
      itens,
    }
  }

  /**
   * Decomposição do Estoque Total Considerado:
   *   Estoque Total Considerado = Estoque Disponível (acabado) + Saldo Semiacabado
   */
  public static comporEstoqueConsiderado(
    estoqueDisponivelT: number,
    saldoSemiacabadoT: number,
  ): EstoqueConsideradoDetalhe {
    const acabado = Math.max(0, this.round2(Number(estoqueDisponivelT) || 0))
    const semi = Math.max(0, this.round2(Number(saldoSemiacabadoT) || 0))
    return {
      estoque_acabado_t: acabado,
      saldo_semiacabado_t: semi,
      estoque_total_considerado_t: this.round2(acabado + semi),
    }
  }

  /**
   * Saldo de Carteira Ajustado — ONLY quando a fórmula atual trabalha a partir
   * do estoque acabado: Saldo Ajustado = Saldo atual + Saldo Semiacabado
   * (o semiacabado entra como novo componente de disponibilidade; todas as
   * demais regras — estoque qualidade, bloqueado, produção, programação,
   * cobertura, MTO, restrições, curva ABC — permanecem intactas).
   * Onde o semiacabado JÁ está embutido no saldo atual (L1/L2), NÃO chamar
   * este método (evita dupla contagem).
   */
  public static saldoAjustado(saldoAtualT: number, saldoSemiacabadoT: number): number {
    return this.round2((Number(saldoAtualT) || 0) + (Number(saldoSemiacabadoT) || 0))
  }
}

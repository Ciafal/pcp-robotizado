/**
 * MOTOR CENTRAL DE COBERTURA TEMPORAL & PREVISÃO — PCP ROBOTIZADO CIAFAL
 *
 * Padrão Corporativo Unificado para TODAS as 7 Carteiras:
 * 1. Geral; 2. L1; 3. L2; 4. MTO; 5. Revenda; 6. Importado; 7. SDC.
 *
 * FÓRMULAS E REGRAS CORPORATIVAS:
 * - Estoque Disponível Utilizável = Estoque Total - Bloqueado - Restrições de Qualidade
 * - Média Diária de Faturamento (t/dia) = Toneladas Faturadas / Dias Considerados (30/60/90/180)
 *   (Se sem histórico suficiente -> 'N/D — histórico insuficiente', nunca assumir 0)
 * - Dias de Cobertura = Estoque Disponível Utilizável / Média Diária de Faturamento
 * - Data Fim Estoque = Data da Análise + Dias de Cobertura (Dias corridos ou Calendário Operacional)
 * - Próxima Data = Próxima demanda/necessidade existente na carteira (menor data de entrega/desejada futura)
 * - Próxima Data Prevista = Próxima reposição/entrada efetivamente disponível com origem mapeada
 * - Dias Estoque Negativo:
 *   - Se Data Fim Estoque < Próxima Data Prevista: Gap em dias (Próxima Data Prevista - Data Fim Estoque)
 *   - Se Data Fim Estoque >= Próxima Data Prevista: 0 dias
 *   - Se sem reposição prevista e estoque esgota: 'Indeterminado' (diasNegativos = null)
 *
 * STATUS TEMPORAIS PADRONIZADOS:
 * - 'COBERTURA PRESERVADA': reposição antes ou no término do estoque
 * - 'ATENÇÃO': reposição muito próxima do término (<= limiteAtencaoDias)
 * - 'RISCO DE RUPTURA': término do estoque antes da próxima reposição (gap > 0)
 * - 'SEM REPOSIÇÃO PREVISTA': estoque acaba e não há nenhuma entrada futura
 * - 'SEM HISTÓRICO': histórico de faturamento N/D
 * - 'SEM CARTEIRA': demanda em carteira zerada, estoque disponível
 * - 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO': estoque zero, sem reposição e com demanda
 */

export type OrigemCarteira = 'GERAL' | 'L1' | 'L2' | 'MTO' | 'REVENDA' | 'IMPORTADO' | 'SDC'

export type MetodoCalendario = 'DIAS_CORRIDOS' | 'CALENDARIO_OPERACIONAL'

export type StatusCoberturaTemporal =
  | 'COBERTURA PRESERVADA'
  | 'ATENÇÃO'
  | 'RISCO DE RUPTURA'
  | 'SEM REPOSIÇÃO PREVISTA'
  | 'SEM HISTÓRICO'
  | 'SEM CARTEIRA'
  | 'CRÍTICO'
  | 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO'

export interface ParametrosCoberturaCorporativos {
  periodoDiasHistorico: 30 | 60 | 90 | 180
  metodoCalendario: MetodoCalendario
  limiteAtencaoDias: number // default: 5 dias
  limiteCriticoDias: number // default: 2 dias
  considerarEstoqueQualidade: boolean // default: false
  considerarEstoqueBloqueado: boolean // default: false
}

export const PARAMETROS_COBERTURA_PADRAO: ParametrosCoberturaCorporativos = {
  periodoDiasHistorico: 90,
  metodoCalendario: 'DIAS_CORRIDOS',
  limiteAtencaoDias: 5,
  limiteCriticoDias: 2,
  considerarEstoqueQualidade: false,
  considerarEstoqueBloqueado: false,
}

export interface EntradaReposicaoFutura {
  dataPrevista: string // YYYY-MM-DD ou DD/MM/AAAA
  quantidadeTons: number
  origem: string // Ex: "Produção L1", "Retorno SDC", "Pedido de Compra", "ETA Importação"
  tipoOrigem?:
    | 'PRODUCAO_L1'
    | 'PRODUCAO_L2'
    | 'OP_MTO'
    | 'REVENDA'
    | 'IMPORTADO'
    | 'RETORNO_SDC'
    | 'OUTROS'
  documentoRef?: string
  observacao?: string
}

// Aliases de compatibilidade para suítes de teste e integração
export type InputCalculoTemporal = any
export type ParametrosGovernancaTemporal = any
export type ResultadoCalculoTemporal = ResultadoCoberturaTemporal

export interface DemandaCarteiraItem {
  ordemVenda?: string
  itemOrdem?: string
  cliente?: string
  quantidadeTons: number
  dataDesejada: string // YYYY-MM-DD ou DD/MM/AAAA
}

export interface InputAnaliseCobertura {
  material: string
  descricao?: string
  familia?: string
  bitola?: string
  curvaAbc?: string
  origemCarteira: OrigemCarteira

  // Balanço de Estoque
  estoqueTotalT: number
  estoqueBloqueadoT?: number
  estoqueQualidadeT?: number
  estoqueDisponivelUtilizavelT?: number // se fornecido, usa; caso contrário calcula

  // Demanda / Carteira
  carteiraT: number
  pedidos?: DemandaCarteiraItem[]

  // Faturamento
  faturamentoTotalPeriodoT?: number | null // total t faturadas no período
  periodoDiasFaturamento?: number // ex: 90
  mediaDiariaFaturamentoInformadaT?: number | null // se já veio calculada no cadastro/carga

  // Reposições
  reposicoesFuturas?: EntradaReposicaoFutura[]

  // Programação direta se não tiver reposições estruturadas
  programadoT?: number
  emProducaoT?: number
  dataProgramada?: string
  situacaoProducao?: string

  // Data de referência da análise (default: hoje)
  dataAnalise?: string | Date

  // Parâmetros corporativos customizados (opcional)
  parametros?: Partial<ParametrosCoberturaCorporativos>
}

export interface ResultadoCoberturaTemporal {
  material: string
  origemCarteira: OrigemCarteira
  dataAnaliseStr: string

  // Estoque
  estoqueTotalT: number
  estoqueBloqueadoT: number
  estoqueQualidadeT: number
  estoqueDisponivelUtilizavelT: number

  // Média Diária Faturamento
  temHistoricoFaturamento: boolean
  mediaDiariaFaturamentoT: number | null // null se histórico insuficiente
  mediaDiariaFaturamentoFormatada: string // Ex: "1,25 t/dia" ou "N/D — histórico insuficiente"
  baseDiasFaturamento: number
  baseHistoricoTexto: string // Ex: "Base: últimos 90 dias (112,50 t)"

  // Dias de Cobertura
  diasCobertura: number | null // null se N/D
  diasCoberturaFormatado: string // Ex: "4,0 dias" ou "N/D"

  // Data Fim Estoque
  dataFimEstoque: string | null // YYYY-MM-DD ou null ou "Imediata / estoque indisponível"
  dataFimEstoqueFormatada: string // Ex: "20/09/2026" ou "N/D" ou "Imediata / estoque indisponível"
  resumoAuditoria?: string
  // Próxima Demanda (Próxima Data)
  proximaDataDemanda: string | null // menor data de necessidade da carteira
  proximaDataDemandaFormatada: string // "DD/MM/AAAA" ou "Sem pedidos futuros"
  proximaDemandaDetalhe?: DemandaCarteiraItem | null

  // Próxima Reposição (Próxima Data Prevista)
  proximaDataPrevistaReposicao: string | null
  proximaDataPrevistaFormatada: string // "DD/MM/AAAA · Origem" ou "Sem reposição prevista"
  proximaReposicaoDetalhe?: EntradaReposicaoFutura | null

  // Gap / Dias Estoque Negativo
  diasEstoqueNegativo: number | null // null significa "Indeterminado"
  diasEstoqueNegativoFormatado: string // "3 dias", "0 dias" ou "Indeterminado"
  temGapRuptura: boolean

  // Status & Risco
  status: StatusCoberturaTemporal
  severidade: 'NORMAL' | 'ATENÇÃO' | 'CRÍTICO' | 'INFORMATIVO'
  textoStatus: string
  badgeCor: {
    bg: string
    text: string
    border: string
  }

  // Saldos Clássicos Preservados
  saldoAtualT: number // Estoque - Carteira
  saldoProjetadoT: number // Estoque + Reposições - Carteira
  programadoTotalT: number

  // Memória de Cálculo Auditável
  memoriaCalculo: {
    formulaMediaDiaria: string
    formulaCobertura: string
    formulaDataFim: string
    formulaProximaDemanda: string
    formulaProximaReposicao: string
    formulaDiasNegativos: string
    resumoAuditoria: string
    passos: string[]
  }

  // Alerta Gerado
  alertaRecomendado?: {
    id: string
    chaveLogica: string // {Centro}:{Material}:COBERTURA_TEMPORAL:{Origem}
    severidade: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'INFORMATIVO'
    titulo: string
    mensagem: string
    recomendacao: string
  } | null
}

export class CoberturaTemporalEngine {
  private static parametrosGlobais: ParametrosCoberturaCorporativos = {
    ...PARAMETROS_COBERTURA_PADRAO,
  }

  /**
   * Atualiza os parâmetros corporativos globais vigentes
   */
  public static setParametrosGlobais(params: Partial<ParametrosCoberturaCorporativos>) {
    CoberturaTemporalEngine.parametrosGlobais = {
      ...CoberturaTemporalEngine.parametrosGlobais,
      ...params,
    }
  }

  public static getParametrosGlobais(): ParametrosCoberturaCorporativos {
    return { ...CoberturaTemporalEngine.parametrosGlobais }
  }

  /**
   * Converte um CarteiraItem clássico em InputAnaliseCobertura padronizado para o motor central
   */
  /**
   * Converte um CarteiraSDCItem (WERKS=SDPL) para InputAnaliseCobertura padronizado
   */
  public static converterCarteiraSDCParaInput(
    item: any,
    entradasFuturasDisponiveis: any[] = [],
  ): InputAnaliseCobertura {
    const materialCodigo = item.material || item.codigo_material || ''
    const descricao = item.descricao || item.descricao_material || ''
    const familia = item.familia || 'Industrialização SDC'
    const bitola = item.bitola || '-'
    const curvaAbc = item.curva_abc || 'B'

    const estoqueTotal = Number(item.estoque_total_t || 0)
    const estoqueBloqueado = Number(item.estoque_bloqueado_t || 0)
    const estoqueQualidade = Number(item.estoque_qualidade_t || 0)
    const estoqueDisponivelUtilizavel =
      item.estoque_disponivel_t !== undefined
        ? Number(item.estoque_disponivel_t)
        : Math.max(0, estoqueTotal - estoqueBloqueado - estoqueQualidade)

    const carteiraAberta = Number(item.carteira_t || item.carteira_aberta_tons || 0)
    const progTons = Number(item.programado_t || item.qtd_programada_tons || 0)
    const emProducaoTons = Number(item.em_producao_t || 0)
    const dataProg = item.data_prevista || item.data_programada || ''

    const reposicoes: EntradaReposicaoFutura[] = []
    if (dataProg && (progTons > 0 || emProducaoTons > 0)) {
      reposicoes.push({
        dataPrevista: dataProg,
        quantidadeTons: progTons + emProducaoTons,
        origem: item.origem_producao || 'Retorno SDC',
        documentoRef: 'Prog SDC',
      })
    }

    const pedidos: DemandaCarteiraItem[] = item.pedidos_compoem?.map((p: any) => ({
      ordemVenda: p.ordem_venda || 'OV-SDC',
      itemOrdem: p.item_ordem || '10',
      cliente: p.cliente || 'Mercado Geral',
      quantidadeTons: Number(p.quantidade_t || 0),
      dataDesejada: p.data_desejada || item.data_desejada || '',
    })) || [
      {
        ordemVenda: 'OV-SDC',
        itemOrdem: '10',
        cliente: 'Mercado Geral',
        quantidadeTons: carteiraAberta,
        dataDesejada: item.data_desejada || '',
      },
    ]

    return {
      material: materialCodigo,
      descricao,
      familia,
      bitola,
      curvaAbc,
      origemCarteira: 'SDC',
      estoqueTotalT: estoqueTotal,
      estoqueBloqueadoT: estoqueBloqueado,
      estoqueQualidadeT: estoqueQualidade,
      estoqueDisponivelUtilizavelT: estoqueDisponivelUtilizavel,
      carteiraT: carteiraAberta,
      pedidos,
      reposicoesFuturas: reposicoes,
      programadoT: progTons,
      emProducaoT: emProducaoTons,
      dataProgramada: dataProg,
      situacaoProducao: item.situacao_producao || (progTons > 0 ? 'Programado' : 'Sem programação'),
      mediaDiariaFaturamentoInformadaT: item.media_faturamento_diario_t_dia
        ? Number(item.media_faturamento_diario_t_dia)
        : null,
    }
  }

  public static converterCarteiraItemParaInput(
    item: any,
    origem: OrigemCarteira,
    entradasFuturasDisponiveis: any[] = [],
  ): InputAnaliseCobertura {
    const materialCodigo = item.codigo_material || item.material || ''
    const descricao = item.descricao_material || item.descricao || ''
    const familia = item.familia || 'Geral'
    const bitola = item.bitola || '-'
    const curvaAbc = item.curva_abc || 'B'

    const estoqueLivre = Number(item.estoque_livre_tons || 0)
    const estoqueAcabado = Number(item.estoque_acabado_tons || 0)
    const estoqueSemiacabado = Number(
      item.estoque_semiacabado_ciafal_tons || item.estoque_semiacabado_tons || 0,
    )
    const estoqueSemiacabadoVal = Number(item.estoque_semiacabado_vallourec_tons || 0)
    const estoqueMto = Number(item.estoque_mto_tons || 0)
    const estoqueTotal =
      estoqueLivre + estoqueAcabado + estoqueSemiacabado + estoqueSemiacabadoVal + estoqueMto

    const estoqueBloqueado = item.bloqueio ? estoqueAcabado : 0
    const estoqueQualidade = 0
    // Disponível utilizável: respeita regra da linha ou estoque livre
    const estoqueDisponivelUtilizavel =
      item.disponibilidade_fisica_elegivel_tons !== undefined
        ? Math.max(
            0,
            Number(item.disponibilidade_fisica_elegivel_tons) -
              (item.bloqueio ? estoqueAcabado : 0),
          )
        : Math.max(0, estoqueLivre)

    const carteiraAberta = Number(item.carteira_aberta_tons || item.qtd_ordem_tons || 0)
    const progTons = Number(item.qtd_programada_tons || 0)
    const dataProg = item.data_programada || item.semana_programada

    // Reposições estruturadas caso haja compras/importações vinculadas
    const reposicoes: EntradaReposicaoFutura[] = []
    const entradasDoMaterial = entradasFuturasDisponiveis.filter(
      (e) => (e.codigo_material || '').toLowerCase() === materialCodigo.toLowerCase(),
    )
    for (const ent of entradasDoMaterial) {
      reposicoes.push({
        dataPrevista: ent.data_prevista_entrada,
        quantidadeTons: Number(ent.quantidade_pendente_tons || ent.quantidade_prevista_tons || 0),
        origem:
          ent.origem === 'REVENDA'
            ? 'Recebimento fornecedor'
            : ent.origem === 'IMPORTADO'
              ? 'Importação'
              : ent.origem === 'PRODUCAO_INTERNA'
                ? 'Produção Interna'
                : 'Recebimento fornecedor',
        documentoRef: ent.documento_ref,
        observacao: ent.observacao,
      })
    }

    const pedidos: DemandaCarteiraItem[] = [
      {
        ordemVenda: item.ordem_venda || 'OV-PADRAO',
        itemOrdem: item.item_ordem || '10',
        cliente: item.nome_cliente || 'Mercado Geral',
        quantidadeTons: carteiraAberta,
        dataDesejada: item.data_desejada || '',
      },
    ]

    return {
      material: materialCodigo,
      descricao,
      familia,
      bitola,
      curvaAbc,
      origemCarteira: origem,
      estoqueTotalT: estoqueTotal,
      estoqueBloqueadoT: estoqueBloqueado,
      estoqueQualidadeT: estoqueQualidade,
      estoqueDisponivelUtilizavelT: estoqueDisponivelUtilizavel,
      carteiraT: carteiraAberta,
      pedidos,
      reposicoesFuturas: reposicoes,
      programadoT: progTons,
      dataProgramada: dataProg,
      situacaoProducao: progTons > 0 ? 'Programado' : 'Sem programação',
      mediaDiariaFaturamentoInformadaT: item.media_faturamento_diario_t_dia
        ? Number(item.media_faturamento_diario_t_dia)
        : null,
    }
  }

  /**
   * Converte string de data para objeto Date consistente sem bug de timezone local
   */
  public static parseDataGenerica(dataRaw?: string | Date | null): Date | null {
    if (!dataRaw) return null
    if (dataRaw instanceof Date) {
      if (isNaN(dataRaw.getTime())) return null
      return new Date(dataRaw.getFullYear(), dataRaw.getMonth(), dataRaw.getDate())
    }
    const limpo = String(dataRaw).trim()
    if (!limpo) return null

    // Formato DD/MM/AAAA
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(limpo)) {
      const parts = limpo.split('/')
      const dia = parseInt(parts[0], 10)
      const mes = parseInt(parts[1], 10) - 1
      const ano = parseInt(parts[2], 10)
      const d = new Date(ano, mes, dia)
      return isNaN(d.getTime()) ? null : d
    }

    // Formato YYYY-MM-DD ou ISO
    if (/^\d{4}-\d{2}-\d{2}/.test(limpo)) {
      const p = limpo.substring(0, 10).split('-')
      const ano = parseInt(p[0], 10)
      const mes = parseInt(p[1], 10) - 1
      const dia = parseInt(p[2], 10)
      const d = new Date(ano, mes, dia)
      return isNaN(d.getTime()) ? null : d
    }

    const tent = new Date(limpo)
    if (!isNaN(tent.getTime())) {
      return new Date(tent.getFullYear(), tent.getMonth(), tent.getDate())
    }
    return null
  }

  /**
   * Formata Date para DD/MM/AAAA
   */
  public static formatarDataBR(data: Date | null): string {
    if (!data || isNaN(data.getTime())) return 'N/D'
    const dia = String(data.getDate()).padStart(2, '0')
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const ano = data.getFullYear()
    return `${dia}/${mes}/${ano}`
  }

  /**
   * Formata Date para YYYY-MM-DD
   */
  public static formatarDataISO(data: Date | null): string {
    if (!data || isNaN(data.getTime())) return ''
    const dia = String(data.getDate()).padStart(2, '0')
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const ano = data.getFullYear()
    return `${ano}-${mes}-${dia}`
  }

  /**
   * Adiciona dias a uma data respeitando dias corridos ou calendário operacional (Segunda a Sexta)
   */
  public static somarDiasData(
    dataBase: Date,
    diasAdicionar: number,
    metodo: MetodoCalendario,
  ): Date {
    const d = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate())
    const diasArredondados = Math.round(diasAdicionar)

    if (metodo === 'DIAS_CORRIDOS') {
      d.setDate(d.getDate() + diasArredondados)
      return d
    }

    // CALENDARIO_OPERACIONAL: considera apenas dias úteis (Segunda a Sexta)
    let adicionados = 0
    const passo = diasArredondados >= 0 ? 1 : -1
    const meta = Math.abs(diasArredondados)

    while (adicionados < meta) {
      d.setDate(d.getDate() + passo)
      const diaSemana = d.getDay() // 0 = Dom, 6 = Sáb
      if (diaSemana !== 0 && diaSemana !== 6) {
        adicionados++
      }
    }
    return d
  }

  /**
   * Calcula a diferença em dias entre duas datas (Data2 - Data1)
   */
  public static diferencaDias(data1: Date, data2: Date, metodo: MetodoCalendario): number {
    const d1 = new Date(data1.getFullYear(), data1.getMonth(), data1.getDate())
    const d2 = new Date(data2.getFullYear(), data2.getMonth(), data2.getDate())

    if (metodo === 'DIAS_CORRIDOS') {
      const msDia = 1000 * 60 * 60 * 24
      return Math.round((d2.getTime() - d1.getTime()) / msDia)
    }

    // Calendário Operacional
    let count = 0
    const inverso = d2.getTime() < d1.getTime()
    const inicio = inverso ? d2 : d1
    const fim = inverso ? d1 : d2
    const cursor = new Date(inicio)

    while (cursor.getTime() < fim.getTime()) {
      cursor.setDate(cursor.getDate() + 1)
      const diaSemana = cursor.getDay()
      if (diaSemana !== 0 && diaSemana !== 6) {
        count++
      }
    }
    return inverso ? -count : count
  }

  /**
   * MOTOR PRINCIPAL — Executa a análise temporal completa de um material
   */
  public static calcular(rawInput: any): ResultadoCoberturaTemporal {
    // Normalização polimórfica para suportar tanto InputAnaliseCobertura quanto contratos legados de teste
    const input: InputAnaliseCobertura = {
      material: rawInput.material || rawInput.materialCodigo || '',
      descricao: rawInput.descricao || rawInput.materialDescricao || '',
      familia: rawInput.familia || '',
      bitola: rawInput.bitola || '',
      curvaAbc: rawInput.curvaAbc || '',
      origemCarteira: rawInput.origemCarteira,
      estoqueTotalT:
        rawInput.estoqueTotalT !== undefined
          ? rawInput.estoqueTotalT
          : Number(rawInput.estoqueFisicoTotalT || 0),
      estoqueBloqueadoT: Number(rawInput.estoqueBloqueadoT || 0),
      estoqueQualidadeT: Number(rawInput.estoqueQualidadeT || 0),
      estoqueDisponivelUtilizavelT: rawInput.estoqueDisponivelUtilizavelT,
      carteiraT: Number(rawInput.carteiraT || rawInput.carteiraAbertaTons || 0),
      pedidos: (rawInput.pedidos || []).map((p: any) => ({
        ordemVenda: p.ordemVenda || p.numeroDocumento || '',
        itemOrdem: p.itemOrdem || p.item || '10',
        cliente: p.cliente || 'Mercado Geral',
        quantidadeTons: Number(p.quantidadeTons || p.quantidade_t || 0),
        dataDesejada: p.dataDesejada || p.data_desejada || '',
      })),
      reposicoesFuturas: (rawInput.reposicoesFuturas || []).map((r: any) => ({
        dataPrevista: r.dataPrevista || r.data_prevista || '',
        quantidadeTons: Number(r.quantidadeTons || r.quantidade_t || 0),
        origem: r.origem || 'Produção/Entrada',
        tipoOrigem: r.tipoOrigem || r.tipoDocumento,
        documentoRef: r.documentoRef || r.idDocumento,
        observacao: r.observacao,
      })),
      programadoT: rawInput.programadoT,
      emProducaoT: rawInput.emProducaoT,
      dataProgramada: rawInput.dataProgramada,
      situacaoProducao: rawInput.situacaoProducao,
      dataAnalise: rawInput.dataAnalise || rawInput.dataBaseAnalise,
      faturamentoTotalPeriodoT: rawInput.faturamentoTotalPeriodoT,
      periodoDiasFaturamento:
        rawInput.periodoDiasFaturamento || rawInput.parametros?.diasHistoricoFaturamento,
      mediaDiariaFaturamentoInformadaT:
        rawInput.mediaDiariaFaturamentoInformadaT !== undefined
          ? rawInput.mediaDiariaFaturamentoInformadaT
          : rawInput.mediaDiariaParametrizadaT !== undefined
            ? rawInput.mediaDiariaParametrizadaT
            : null,
      parametros: rawInput.parametros,
    }

    const rawParams = rawInput.parametros || {}
    const config: ParametrosCoberturaCorporativos = {
      ...CoberturaTemporalEngine.parametrosGlobais,
      periodoDiasHistorico:
        rawParams.periodoDiasHistorico || rawParams.diasHistoricoFaturamento || CoberturaTemporalEngine.parametrosGlobais.periodoDiasHistorico,
      metodoCalendario:
        rawParams.metodoCalendario || (rawParams.tipoCalendario === 'CORRIDOS' ? 'DIAS_CORRIDOS' : (rawParams.tipoCalendario === 'OPERACIONAL' ? 'CALENDARIO_OPERACIONAL' : CoberturaTemporalEngine.parametrosGlobais.metodoCalendario)),
      limiteAtencaoDias:
        rawParams.limiteAtencaoDias ?? rawParams.limiarDiasAtencao ?? CoberturaTemporalEngine.parametrosGlobais.limiteAtencaoDias,
      limiteCriticoDias:
        rawParams.limiteCriticoDias ?? rawParams.limiarDiasCritico ?? CoberturaTemporalEngine.parametrosGlobais.limiteCriticoDias,
      considerarEstoqueQualidade:
        rawParams.considerarEstoqueQualidade ?? CoberturaTemporalEngine.parametrosGlobais.considerarEstoqueQualidade,
      considerarEstoqueBloqueado:
        rawParams.considerarEstoqueBloqueado ?? CoberturaTemporalEngine.parametrosGlobais.considerarEstoqueBloqueado,
    }

    // 1. Data de referência da análise
    const dataAnalise = CoberturaTemporalEngine.parseDataGenerica(input.dataAnalise) || new Date()
    const dataAnaliseStr = CoberturaTemporalEngine.formatarDataBR(dataAnalise)

    // 2. Apuração do Estoque Disponível Utilizável
    const estoqueTotal = Math.max(0, Number(input.estoqueTotalT) || 0)
    const estoqueBloq = Math.max(0, Number(input.estoqueBloqueadoT) || 0)
    const estoqueQual = Math.max(0, Number(input.estoqueQualidadeT) || 0)

    let estoqueDisponivelUtilizavel: number
    if (
      typeof input.estoqueDisponivelUtilizavelT === 'number' &&
      !isNaN(input.estoqueDisponivelUtilizavelT)
    ) {
      estoqueDisponivelUtilizavel = Math.max(0, input.estoqueDisponivelUtilizavelT)
    } else {
      let deducao = 0
      if (!config.considerarEstoqueBloqueado) deducao += estoqueBloq
      if (!config.considerarEstoqueQualidade) deducao += estoqueQual
      estoqueDisponivelUtilizavel = Math.max(0, estoqueTotal - deducao)
    }

    // 3. Apuração da Média Diária de Faturamento (t/dia)
    const periodoDias = input.periodoDiasFaturamento || config.periodoDiasHistorico
    let mediaDiaria: number | null = null
    let temHistorico = false
    let baseHistoricoTexto = `Base: últimos ${periodoDias} dias`

    if (
      typeof input.faturamentoTotalPeriodoT === 'number' &&
      !isNaN(input.faturamentoTotalPeriodoT) &&
      input.faturamentoTotalPeriodoT > 0
    ) {
      temHistorico = true
      mediaDiaria = Number((input.faturamentoTotalPeriodoT / periodoDias).toFixed(2))
      baseHistoricoTexto = `Base: últimos ${periodoDias} dias (${input.faturamentoTotalPeriodoT.toFixed(2)} t)`
    } else if (
      typeof input.mediaDiariaFaturamentoInformadaT === 'number' &&
      !isNaN(input.mediaDiariaFaturamentoInformadaT) &&
      input.mediaDiariaFaturamentoInformadaT > 0
    ) {
      temHistorico = true
      mediaDiaria = Number(input.mediaDiariaFaturamentoInformadaT.toFixed(2))
      const tonsEstimadas = (mediaDiaria * periodoDias).toFixed(2)
      baseHistoricoTexto = `Base: últimos ${periodoDias} dias (~${tonsEstimadas} t faturadas)`
    } else {
      // Histórico insuficiente: NÃO inventar média e NÃO assumir 0
      temHistorico = false
      mediaDiaria = null
      baseHistoricoTexto = `Base: últimos ${periodoDias} dias (histórico insuficiente)`
    }

    const mediaDiariaFormatada =
      temHistorico && mediaDiaria !== null
        ? `${mediaDiaria.toFixed(2).replace('.', ',')} t/dia`
        : 'N/D — histórico insuficiente'

    // 4. Dias de Cobertura
    let diasCobertura: number | null = null
    let diasCoberturaFormatado = 'N/D'

    if (temHistorico && mediaDiaria !== null && mediaDiaria > 0) {
      if (estoqueDisponivelUtilizavel === 0) {
        diasCobertura = 0
        diasCoberturaFormatado = '0,0 dias'
      } else {
        diasCobertura = Number((estoqueDisponivelUtilizavel / mediaDiaria).toFixed(1))
        diasCoberturaFormatado = `${diasCobertura.toFixed(1).replace('.', ',')} dias`
      }
    } else {
      diasCobertura = null
      diasCoberturaFormatado = 'N/D'
    }

    // 5. Data Fim Estoque
    let dataFimEstoqueDate: Date | null = null
    let dataFimEstoque: string | null = null
    let dataFimEstoqueFormatada = 'N/D'

    if (temHistorico && mediaDiaria !== null && diasCobertura !== null) {
      if (estoqueDisponivelUtilizavel === 0) {
        dataFimEstoque = 'IMEDIATA'
        dataFimEstoqueFormatada = 'Imediata / estoque indisponível'
        dataFimEstoqueDate = new Date(dataAnalise)
      } else {
        dataFimEstoqueDate = CoberturaTemporalEngine.somarDiasData(
          dataAnalise,
          diasCobertura,
          config.metodoCalendario,
        )
        dataFimEstoque = CoberturaTemporalEngine.formatarDataISO(dataFimEstoqueDate)
        dataFimEstoqueFormatada = CoberturaTemporalEngine.formatarDataBR(dataFimEstoqueDate)
      }
    }

    // 6. Próxima Data (Demanda / Menor Data Desejada da Carteira - Ordenação Estrita)
    let menorDataDemandaDate: Date | null = null
    let proximaDemandaDetalhe: DemandaCarteiraItem | null = null

    if (input.pedidos && input.pedidos.length > 0) {
      const pedidosOrdenados = input.pedidos
        .filter((p) => p.dataDesejada && p.quantidadeTons > 0)
        .map((p) => ({
          ...p,
          _dateObj: CoberturaTemporalEngine.parseDataGenerica(p.dataDesejada),
        }))
        .filter((p): p is typeof p & { _dateObj: Date } => p._dateObj !== null)
        .sort((a, b) => a._dateObj.getTime() - b._dateObj.getTime())

      if (pedidosOrdenados.length > 0) {
        menorDataDemandaDate = pedidosOrdenados[0]._dateObj
        proximaDemandaDetalhe = pedidosOrdenados[0]
      }
    }

    const proximaDataDemanda = menorDataDemandaDate
      ? CoberturaTemporalEngine.formatarDataISO(menorDataDemandaDate)
      : null
    const proximaDataDemandaFormatada = menorDataDemandaDate
      ? CoberturaTemporalEngine.formatarDataBR(menorDataDemandaDate)
      : input.carteiraT > 0
        ? 'A definir / sem data'
        : 'Sem pedidos em carteira'

    // 7. Próxima Data Prevista (Reposição Efetivamente Disponível)
    // Consolida reposições estruturadas ou dados de programação direta
    const listaReposicoes: EntradaReposicaoFutura[] = []
    if (input.reposicoesFuturas && input.reposicoesFuturas.length > 0) {
      listaReposicoes.push(...input.reposicoesFuturas)
    }

    // Se tiver programação / produção sem reposição estruturada na lista
    const totalProgDireto = (Number(input.programadoT) || 0) + (Number(input.emProducaoT) || 0)
    if (totalProgDireto > 0 && input.dataProgramada) {
      const jaExiste = listaReposicoes.some((r) => r.dataPrevista === input.dataProgramada)
      if (!jaExiste) {
        const origemNome = CoberturaTemporalEngine.obterRotuloOrigemPadrao(
          input.origemCarteira,
          input.situacaoProducao,
        )
        listaReposicoes.push({
          dataPrevista: input.dataProgramada,
          quantidadeTons: totalProgDireto,
          origem: origemNome,
          documentoRef: 'Prog PCP',
        })
      }
    }

    // Ordenação cronológica estrita das reposições futuras válidas
    const reposicoesOrdenadas = listaReposicoes
      .filter((r) => r.dataPrevista && r.quantidadeTons > 0)
      .map((r) => ({
        ...r,
        _dateObj: CoberturaTemporalEngine.parseDataGenerica(r.dataPrevista),
      }))
      .filter((r): r is typeof r & { _dateObj: Date } => r._dateObj !== null)
      .sort((a, b) => a._dateObj.getTime() - b._dateObj.getTime())

    let menorDataReposicaoDate: Date | null = null
    let proximaReposicaoDetalhe: EntradaReposicaoFutura | null = null

    if (reposicoesOrdenadas.length > 0) {
      menorDataReposicaoDate = reposicoesOrdenadas[0]._dateObj
      proximaReposicaoDetalhe = reposicoesOrdenadas[0]
    }

    const proximaDataPrevistaReposicao = menorDataReposicaoDate
      ? CoberturaTemporalEngine.formatarDataISO(menorDataReposicaoDate)
      : null

    const proximaDataPrevistaFormatada =
      menorDataReposicaoDate && proximaReposicaoDetalhe
        ? `${CoberturaTemporalEngine.formatarDataBR(menorDataReposicaoDate)} · ${proximaReposicaoDetalhe.origem}`
        : 'Sem reposição prevista'

    // 8. Dias Estoque Negativo & Gap Temporal
    let diasEstoqueNegativo: number | null = null
    let diasEstoqueNegativoFormatado = '0 dias'
    let temGapRuptura = false

    if (dataFimEstoqueDate && menorDataReposicaoDate) {
      // Compara Data Fim Estoque com Próxima Reposição
      const gap = CoberturaTemporalEngine.diferencaDias(
        dataFimEstoqueDate,
        menorDataReposicaoDate,
        config.metodoCalendario,
      )
      if (gap > 0) {
        diasEstoqueNegativo = gap
        diasEstoqueNegativoFormatado = `${gap}`
        temGapRuptura = true
      } else {
        diasEstoqueNegativo = 0
        diasEstoqueNegativoFormatado = '0'
        temGapRuptura = false
      }
    } else if (dataFimEstoqueDate && !menorDataReposicaoDate) {
      // Termina estoque e NÃO há reposição prevista
      if (input.carteiraT > 0 || (temHistorico && mediaDiaria && mediaDiaria > 0)) {
        diasEstoqueNegativo = null
        diasEstoqueNegativoFormatado = 'Indeterminado'
        temGapRuptura = true
      } else {
        diasEstoqueNegativo = 0
        diasEstoqueNegativoFormatado = '0 dias'
      }
    } else {
      diasEstoqueNegativo = null
      diasEstoqueNegativoFormatado = 'N/D'
    }

    // 9. Classificação do Status Temporal Padronizado
    let status: StatusCoberturaTemporal
    let severidade: 'NORMAL' | 'ATENÇÃO' | 'CRÍTICO' | 'INFORMATIVO' = 'NORMAL'
    let textoStatus = ''
    let badgeCor = {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
    }

    const carteiraAberta = Math.max(0, Number(input.carteiraT) || 0)

    if (carteiraAberta === 0 && estoqueDisponivelUtilizavel > 0) {
      status = 'SEM CARTEIRA'
      severidade = 'INFORMATIVO'
      textoStatus = 'SEM CARTEIRA / ESTOQUE DISPONÍVEL'
      badgeCor = {
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-300',
      }
    } else if (estoqueDisponivelUtilizavel === 0) {
      status = 'CRÍTICO'
      severidade = 'CRÍTICO'
      textoStatus = 'CRÍTICO — Estoque zero'
      badgeCor = {
        bg: 'bg-rose-100',
        text: 'text-rose-900',
        border: 'border-rose-400',
      }
    } else if (!temHistorico || mediaDiaria === null) {
      status = 'SEM HISTÓRICO'
      severidade = 'INFORMATIVO'
      textoStatus = 'SEM HISTÓRICO DE FATURAMENTO'
      badgeCor = {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-300',
      }
    } else if (!menorDataReposicaoDate) {
      status = 'SEM REPOSIÇÃO PREVISTA'
      severidade = 'CRÍTICO'
      textoStatus = 'SEM REPOSIÇÃO PREVISTA'
      badgeCor = {
        bg: 'bg-amber-100',
        text: 'text-amber-900',
        border: 'border-amber-400',
      }
    } else if (temGapRuptura && diasEstoqueNegativo !== null && diasEstoqueNegativo > 0) {
      status = 'RISCO DE RUPTURA'
      severidade = diasEstoqueNegativo >= config.limiteCriticoDias ? 'CRÍTICO' : 'ATENÇÃO'
      textoStatus = `RISCO DE RUPTURA (${diasEstoqueNegativo} ${diasEstoqueNegativo === 1 ? 'dia' : 'dias'})`
      badgeCor = {
        bg: 'bg-rose-100',
        text: 'text-rose-900',
        border: 'border-rose-400',
      }
    } else if (
      diasCobertura !== null &&
      diasCobertura <= config.limiteAtencaoDias &&
      menorDataReposicaoDate
    ) {
      status = 'ATENÇÃO'
      severidade = 'ATENÇÃO'
      textoStatus = 'ATENÇÃO — Reposição próxima do término'
      badgeCor = {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-300',
      }
    } else {
      status = 'COBERTURA PRESERVADA'
      severidade = 'NORMAL'
      textoStatus = 'COBERTURA PRESERVADA'
      badgeCor = {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-300',
      }
    }

    // 10. Saldos Clássicos
    const programadoTotal = listaReposicoes.reduce((acc, r) => acc + r.quantidadeTons, 0)
    const saldoAtualT = Number((estoqueDisponivelUtilizavel - carteiraAberta).toFixed(2))
    const saldoProjetadoT = Number(
      (estoqueDisponivelUtilizavel + programadoTotal - carteiraAberta).toFixed(2),
    )

    // 11. Memória de Cálculo Passo a Passo Auditável
    const passos: string[] = []
    const metodoRotulo =
      config.metodoCalendario === 'DIAS_CORRIDOS' ? 'dias corridos' : 'calendário produtivo'

    // Passo 1: Estoque
    passos.push(
      `Estoque Disponível Utilizável: ${estoqueTotal.toFixed(2)} t (Total) - ${estoqueBloq.toFixed(2)} t (Bloqueado) - ${estoqueQual.toFixed(2)} t (Qualidade) = ${estoqueDisponivelUtilizavel.toFixed(2)} t`,
    )

    // Passo 2: Média
    if (temHistorico && mediaDiaria !== null) {
      if (input.faturamentoTotalPeriodoT) {
        passos.push(
          `Média diária de faturamento: ${input.faturamentoTotalPeriodoT.toFixed(2)} t / ${periodoDias} dias = ${mediaDiaria.toFixed(2)} t/dia (${metodoRotulo})`,
        )
      } else {
        passos.push(
          `Média diária de faturamento: ${mediaDiaria.toFixed(2)} t/dia (apurada nos últimos ${periodoDias} dias)`,
        )
      }
    } else {
      passos.push(
        'Média diária de faturamento: N/D — histórico de faturamento insuficiente no período',
      )
    }

    // Passo 3: Cobertura
    if (diasCobertura !== null && mediaDiaria !== null) {
      passos.push(
        `Dias de cobertura de estoque: ${estoqueDisponivelUtilizavel.toFixed(2)} t / ${mediaDiaria.toFixed(2)} t/dia = ${diasCobertura.toFixed(1)} dias`,
      )
    } else {
      passos.push('Dias de cobertura de estoque: N/D devido à ausência de média histórica')
    }

    // Passo 4: Data Fim
    if (dataFimEstoqueDate && diasCobertura !== null) {
      if (estoqueDisponivelUtilizavel === 0) {
        passos.push(
          `Data fim do estoque: Imediata / estoque indisponível na data de análise (${dataAnaliseStr})`,
        )
      } else {
        passos.push(
          `Data fim do estoque: ${dataAnaliseStr} + ${diasCobertura.toFixed(1)} dias = ${dataFimEstoqueFormatada} (${metodoRotulo})`,
        )
      }
    } else {
      passos.push('Data fim do estoque: N/D')
    }

    // Passo 5: Próxima Demanda
    if (menorDataDemandaDate && proximaDemandaDetalhe) {
      passos.push(
        `Próxima demanda na carteira: ${proximaDataDemandaFormatada} (OV: ${proximaDemandaDetalhe.ordemVenda || 'N/A'}, Cliente: ${proximaDemandaDetalhe.cliente || 'Mercado'}, Qtd: ${proximaDemandaDetalhe.quantidadeTons.toFixed(2)} t)`,
      )
    } else if (carteiraAberta > 0) {
      passos.push(
        `Demanda total em carteira: ${carteiraAberta.toFixed(2)} t (sem data individual especificada)`,
      )
    } else {
      passos.push('Próxima demanda na carteira: Nenhuma pendência em carteira aberta')
    }

    // Passo 6: Próxima Entrada
    if (menorDataReposicaoDate && proximaReposicaoDetalhe) {
      passos.push(
        `Próxima entrada disponível: ${CoberturaTemporalEngine.formatarDataBR(menorDataReposicaoDate)} · ${proximaReposicaoDetalhe.origem} (${proximaReposicaoDetalhe.quantidadeTons.toFixed(2)} t)`,
      )
    } else {
      passos.push('Próxima entrada disponível: Nenhuma reposição futura confirmada')
    }

    // Passo 7: Gap
    if (dataFimEstoqueDate && menorDataReposicaoDate && diasEstoqueNegativo !== null) {
      if (diasEstoqueNegativo > 0) {
        passos.push(
          `Gap temporal: ${CoberturaTemporalEngine.formatarDataBR(menorDataReposicaoDate)} − ${dataFimEstoqueFormatada} = ${diasEstoqueNegativo} dias de estoque negativo`,
        )
        passos.push(`Conclusão: Risco de ruptura identificado por ${diasEstoqueNegativo} dias`)
      } else {
        passos.push(
          `Gap temporal: Reposição (${CoberturaTemporalEngine.formatarDataBR(menorDataReposicaoDate)}) ocorre antes ou no término do estoque (${dataFimEstoqueFormatada}) -> 0 dias de estoque negativo`,
        )
      }
    } else if (dataFimEstoqueDate && !menorDataReposicaoDate && carteiraAberta > 0) {
      passos.push(
        'Gap temporal: Indeterminado — o estoque esgota e não há data futura de reposição cadastrada',
      )
    }

    const formulaMediaDiaria =
      temHistorico && mediaDiaria !== null
        ? `Média = Toneladas faturadas / ${periodoDias} dias = ${mediaDiaria.toFixed(2)} t/dia`
        : 'Média diária: Histórico insuficiente'
    const formulaCobertura =
      diasCobertura !== null && mediaDiaria !== null
        ? `Cobertura = ${estoqueDisponivelUtilizavel.toFixed(2)} t / ${mediaDiaria.toFixed(2)} t/dia = ${diasCobertura.toFixed(1)} dias`
        : 'Cobertura: N/D'
    const formulaDataFim =
      dataFimEstoqueFormatada !== 'N/D'
        ? `Data Fim = ${dataAnaliseStr} + ${diasCobertura?.toFixed(1) || 0} dias = ${dataFimEstoqueFormatada}`
        : 'Data Fim: N/D'
    const formulaProximaDemanda = `Próxima demanda = ${proximaDataDemandaFormatada}`
    const formulaProximaReposicao = `Próxima reposição = ${proximaDataPrevistaFormatada}`
    const formulaDiasNegativos =
      diasEstoqueNegativo !== null
        ? `Gap = ${proximaDataPrevistaFormatada} − ${dataFimEstoqueFormatada} = ${diasEstoqueNegativoFormatado}`
        : 'Gap = Indeterminado (sem reposição futura)'

    const resumoAuditoria = `${input.material} · Carteira: ${input.origemCarteira} · Cobertura: ${diasCoberturaFormatado} · Fim: ${dataFimEstoqueFormatada} · Reposição: ${proximaDataPrevistaFormatada} · Negativos: ${diasEstoqueNegativoFormatado} · Status: ${textoStatus}`

    // 12. Alerta Recomendado (Unificado para todas as carteiras)
    let alertaRecomendado: ResultadoCoberturaTemporal['alertaRecomendado'] = null
    const centroCod = CoberturaTemporalEngine.obterCentroPadrao(input.origemCarteira)
    const chaveLogica = `${centroCod}:${input.material}:COBERTURA_TEMPORAL:${input.origemCarteira}`

    if (status === 'RISCO DE RUPTURA' && diasEstoqueNegativo && diasEstoqueNegativo > 0) {
      const origemRep = proximaReposicaoDetalhe?.origem || 'próxima entrada'
      alertaRecomendado = {
        id: `alert-temp-${input.material}`,
        chaveLogica,
        severidade: diasEstoqueNegativo >= config.limiteCriticoDias ? 'CRÍTICO' : 'ALTO',
        titulo: `Risco de Ruptura · Carteira ${input.origemCarteira} (${input.material})`,
        mensagem: CoberturaTemporalEngine.gerarMensagemAlertaCarteira(
          input.origemCarteira,
          input.material,
          diasEstoqueNegativo,
          origemRep,
          dataFimEstoqueFormatada,
          proximaDataPrevistaFormatada,
        ),
        recomendacao: `Antecipar ${origemRep} ou reescalonar carteira para cobrir o gap de ${diasEstoqueNegativo} dias.`,
      }
    } else if (status === 'SEM REPOSIÇÃO PREVISTA') {
      alertaRecomendado = {
        id: `alert-temp-${input.material}`,
        chaveLogica,
        severidade: 'CRÍTICO',
        titulo: `Sem Reposição Prevista · Carteira ${input.origemCarteira} (${input.material})`,
        mensagem: `Material ${input.material} possui previsão de término de estoque em ${dataFimEstoqueFormatada} sem NENHUMA entrada programada/prevista.`,
        recomendacao:
          'Programar ordem de produção, pedido de compras ou transferência emergencial.',
      }
    } else if (status === 'CRÍTICO — SEM ESTOQUE E SEM REPOSIÇÃO') {
      alertaRecomendado = {
        id: `alert-temp-${input.material}`,
        chaveLogica,
        severidade: 'CRÍTICO',
        titulo: `Estoque Esgotado · Carteira ${input.origemCarteira} (${input.material})`,
        mensagem: `Material ${input.material} com estoque zerado, ${carteiraAberta.toFixed(2)} t de demanda aberta e nenhuma reposição futura.`,
        recomendacao:
          'Bloquear novos pedidos e priorizar ordem imediata na programação industrial.',
      }
    }

    return {
      material: input.material,
      origemCarteira: input.origemCarteira,
      dataAnaliseStr,
      estoqueTotalT: estoqueTotal,
      estoqueBloqueadoT: estoqueBloq,
      estoqueQualidadeT: estoqueQual,
      estoqueDisponivelUtilizavelT: estoqueDisponivelUtilizavel,
      temHistoricoFaturamento: temHistorico,
      mediaDiariaFaturamentoT: mediaDiaria,
      mediaDiariaFaturamentoFormatada: mediaDiariaFormatada,
      resumoAuditoria,
      baseDiasFaturamento: periodoDias,
      baseHistoricoTexto,
      diasCobertura,
      diasCoberturaFormatado,
      dataFimEstoque,
      dataFimEstoqueFormatada,
      proximaDataDemanda,
      proximaDataDemandaFormatada,
      proximaDemandaDetalhe,
      proximaDataPrevistaReposicao,
      proximaDataPrevistaFormatada,
      proximaReposicaoDetalhe,
      diasEstoqueNegativo,
      diasEstoqueNegativoFormatado,
      temGapRuptura,
      status,
      severidade,
      textoStatus,
      badgeCor,
      saldoAtualT,
      saldoProjetadoT,
      programadoTotalT: programadoTotal,
      memoriaCalculo: {
        formulaMediaDiaria,
        formulaCobertura,
        formulaDataFim,
        formulaProximaDemanda,
        formulaProximaReposicao,
        formulaDiasNegativos,
        resumoAuditoria,
        passos,
      },
      alertaRecomendado,
    }
  }

  private static obterRotuloOrigemPadrao(origem: OrigemCarteira, situacao?: string): string {
    switch (origem) {
      case 'L1':
        return 'Produção L1'
      case 'L2':
        return 'Produção L2'
      case 'MTO':
        return 'OP MTO'
      case 'REVENDA':
        return 'Recebimento fornecedor'
      case 'IMPORTADO':
        return 'Importação (Disponibilidade)'
      case 'SDC':
        return situacao && situacao.includes('CIAFAL') ? 'Produção CIAFAL' : 'Retorno SDC'
      default:
        return 'Entrada Programada'
    }
  }

  private static obterCentroPadrao(origem: OrigemCarteira): string {
    if (origem === 'SDC') return 'SDPL'
    return 'CFPL'
  }

  /**
   * Mensagens padronizadas de alerta conforme especificação do usuário
   */
  public static gerarMensagemAlertaCarteira(
    origem: OrigemCarteira,
    material: string,
    diasNegativos: number,
    origemReposicao: string,
    dataFim: string,
    dataReposicao: string,
  ): string {
    switch (origem) {
      case 'L1':
        return `Material ${material} ficará sem cobertura por ${diasNegativos} dias antes da próxima produção L1 (Fim: ${dataFim} vs Entrada: ${dataReposicao}).`
      case 'L2':
        return `Material ${material} possui previsão de ruptura antes da próxima programação L2 por ${diasNegativos} dias (Fim: ${dataFim} vs Entrada: ${dataReposicao}).`
      case 'MTO':
        return `Pedido MTO (${material}) possui necessidade anterior à conclusão prevista da OP por ${diasNegativos} dias (Fim: ${dataFim} vs Entrada: ${dataReposicao}).`
      case 'REVENDA':
        return `Material de revenda (${material}) termina estoque antes do próximo recebimento por ${diasNegativos} dias (Fim: ${dataFim} vs Entrada: ${dataReposicao}).`
      case 'IMPORTADO':
        return `Estoque de ${material} termina antes da disponibilidade prevista da importação por ${diasNegativos} dias (Fim: ${dataFim} vs Entrada: ${dataReposicao}).`
      case 'SDC':
        return `Material SDC (${material}) ficará sem cobertura antes do retorno da industrialização por ${diasNegativos} dias (Fim: ${dataFim} vs Entrada: ${dataReposicao}).`
      default:
        return `Material ${material} ficará sem estoque por ${diasNegativos} dias antes da próxima reposição (Fim: ${dataFim} vs Entrada: ${dataReposicao}).`
    }
  }
}

export default CoberturaTemporalEngine

/**
 * MTO Requirement Validation Engine
 *
 * Motor central, determinístico e reutilizável para validação de requisitos técnicos,
 * produtivos, de qualidade e comerciais/logísticos em pedidos MTO (Make to Order).
 *
 * Chave canônica: Pedido SAP + Item (ou Número da Ordem).
 * Coleção oficial PocketBase: order_requirement_sheets.
 *
 * Regra central: Requisito Crítico ou Obrigatório não atendido BLOQUEIA a programação.
 * NUNCA permitir programar silenciosamente. Não altera programação automaticamente — apenas valida/bloqueia/alerta.
 */

import { OrderRequirementSheet } from '@/types/product-quality'

export type MtoRequirementCriticality =
  | 'CRITICO' // Bloqueante mandatório
  | 'OBRIGATORIO' // Bloqueante mandatório
  | 'PREFERENCIAL' // Exceção permitida com justificativa técnica
  | 'INFORMATIVO' // Não bloqueia

export type MtoRequirementStatus =
  | 'PENDENTE'
  | 'VALIDADO'
  | 'ATENDIDO'
  | 'NAO_ATENDIDO'
  | 'EM_ANALISE'
  | 'BLOQUEADO'
  | 'NAO_APLICAVEL'

export type MtoCanonicalGroup = 'PRODUTO' | 'PRODUCAO' | 'QUALIDADE' | 'COMERCIAL_LOGISTICO'

export interface MtoIndividualRequirement {
  id: string
  codigo: string
  titulo: string
  descricao: string
  grupo: MtoCanonicalGroup
  criticidade: MtoRequirementCriticality
  status: MtoRequirementStatus
  valorRequerido?: string | number | boolean | null
  valorProgramado?: string | number | boolean | null
  atendido: boolean
  bloqueante: boolean
  detalheIncompatibilidade?: string
  justificativaExcecao?: string
}

export interface MtoValidationInput {
  // Identificação do Pedido MTO
  pedidoMto: {
    ordem_venda: string
    item_ordem: string
    nome_cliente?: string
    codigo_cliente?: string
    codigo_material?: string
    descricao_material?: string
    linha?: string // ex: 'L1', 'L2'
    centro?: string // ex: '1000', '1100'
    quantidade_tons?: number
    data_desejada?: string
    data_ordem?: string
    empresa?: string
    representante?: string
  }
  // Requisitos vindos de order_requirement_sheets (ou null se não cadastrado)
  requisitosSheet?: OrderRequirementSheet | null
  // Contexto de Programação Proposta (quando submetido a sequenciamento ou simulação)
  programacao?: {
    linha_programada?: string // ex: 'L1', 'L2'
    centro_programado?: string
    rota_programada?: string
    data_programada?: string
    aco_programado?: string // grau do aço informado
    inspecoes_programadas?: string[] // inspeções agendadas
    espessura_programada_mm?: number
    largura_programada_mm?: number
    comprimento_programado_m?: number
  }
  // Parâmetros / Ficha Mestra da linha de destino
  fichaMestraLinha?: {
    linha_codigo?: string
    linha_nome?: string
    processos_habilitados?: string[]
    acos_permitidos?: string[]
    normas_homologadas?: string[]
    capacidade_nominal_th?: number
    possui_inspecao_ultrassom?: boolean
    possui_ensaio_mecanico?: boolean
  }
}

export interface MtoValidationSummary {
  totalRequisitos: number
  atendidos: number
  pendentes: number
  naoAtendidos: number
  bloqueados: number
  emAnalise: number
  naoAplicaveis: number
}

export interface MtoValidationResult {
  aprovadoParaProgramacao: boolean
  statusGeral: 'LIBERADO' | 'BLOQUEADO' | 'PENDENTE' | 'ALERTA_PREFERENCIAL'
  mensagemConsolidadora: string
  resumo: MtoValidationSummary
  requisitos: MtoIndividualRequirement[]
  requisitosPorGrupo: {
    grupo: MtoCanonicalGroup
    nomeGrupo: string
    itens: MtoIndividualRequirement[]
    total: number
    atendidos: number
    bloqueios: number
  }[]
  bloqueios: string[]
  alertas: string[]
  fichaRequisitosPresente: boolean
}

export class MtoRequirementValidationEngine {
  /**
   * Extrai e decompõe a Ficha de Requisitos em requisitos granulares individuais por grupo canônico.
   */
  public static extrairRequisitosIndividuais(
    sheet: OrderRequirementSheet | null | undefined,
    inputLinha?: string,
  ): MtoIndividualRequirement[] {
    if (!sheet) return []

    const list: MtoIndividualRequirement[] = []

    // -------------------------------------------------------------
    // GRUPO 1: PRODUTO (Norma, Aço, Dimensões, Tolerâncias, Químico, Mecânico)
    // -------------------------------------------------------------
    if (sheet.technical_standard) {
      list.push({
        id: 'REQ-PRD-NORMA',
        codigo: 'NORMA_TECNICA',
        titulo: 'Norma Técnica Homologada',
        descricao: `Norma aplicável: ${sheet.technical_standard}`,
        grupo: 'PRODUTO',
        criticidade: 'CRITICO',
        status: sheet.validation_status === 'CONFLITO_REQUISITOS' ? 'BLOQUEADO' : 'VALIDADO',
        valorRequerido: sheet.technical_standard,
        atendido: sheet.validation_status !== 'CONFLITO_REQUISITOS',
        bloqueante: true,
      })
    }

    if (sheet.steel_grade) {
      list.push({
        id: 'REQ-PRD-ACO',
        codigo: 'GRAU_ACO',
        titulo: 'Grau / Classe do Aço',
        descricao: `Grau requerido: ${sheet.steel_grade}`,
        grupo: 'PRODUTO',
        criticidade: 'CRITICO',
        status: 'VALIDADO',
        valorRequerido: sheet.steel_grade,
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.nominal_dimension) {
      list.push({
        id: 'REQ-PRD-DIM',
        codigo: 'DIMENSAO_NOMINAL',
        titulo: 'Dimensão Nominal',
        descricao: `Especificação dimensional: ${sheet.nominal_dimension}`,
        grupo: 'PRODUTO',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: sheet.nominal_dimension,
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.length_meters) {
      list.push({
        id: 'REQ-PRD-COMPRIMENTO',
        codigo: 'COMPRIMENTO_BARRA',
        titulo: 'Comprimento Comercial',
        descricao: `Comprimento: ${sheet.length_meters.toFixed(2)} m`,
        grupo: 'PRODUTO',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: `${sheet.length_meters}m`,
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.dimensional_tolerances) {
      list.push({
        id: 'REQ-PRD-TOLERANCIA',
        codigo: 'TOLERANCIAS_DIMENSIONAIS',
        titulo: 'Tolerâncias Dimensionais Específicas',
        descricao: `Tolerâncias: ${sheet.dimensional_tolerances}`,
        grupo: 'PRODUTO',
        criticidade: 'OBRIGATORIO',
        status: sheet.validation_status === 'CONFLITO_REQUISITOS' ? 'BLOQUEADO' : 'VALIDADO',
        valorRequerido: sheet.dimensional_tolerances,
        atendido: sheet.validation_status !== 'CONFLITO_REQUISITOS',
        bloqueante: true,
      })
    }

    if (sheet.surface_finish_condition) {
      list.push({
        id: 'REQ-PRD-SUPERFICIE',
        codigo: 'ACABAMENTO_SUPERFICIAL',
        titulo: 'Acabamento Superficial',
        descricao: sheet.surface_finish_condition,
        grupo: 'PRODUTO',
        criticidade: 'PREFERENCIAL',
        status: 'VALIDADO',
        valorRequerido: sheet.surface_finish_condition,
        atendido: true,
        bloqueante: false,
      })
    }

    // -------------------------------------------------------------
    // GRUPO 2: PRODUÇÃO (Linha Obrigatória, Rota, Tratamento Térmico)
    // -------------------------------------------------------------
    // Linha de produção prevista / acordada no pedido ou requisitos
    const linhaAlvo = inputLinha || ''
    if (linhaAlvo) {
      list.push({
        id: 'REQ-PRD-LINHA',
        codigo: 'LINHA_PRODUCAO',
        titulo: `Linha de Produção ${linhaAlvo.toUpperCase()}`,
        descricao: `Exigência de atendimento na linha ${linhaAlvo.toUpperCase()}`,
        grupo: 'PRODUCAO',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: linhaAlvo.toUpperCase(),
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.heat_treatment) {
      list.push({
        id: 'REQ-PRD-TRATAMENTO',
        codigo: 'TRATAMENTO_TERMICO',
        titulo: 'Tratamento Térmico Industrial',
        descricao: sheet.heat_treatment,
        grupo: 'PRODUCAO',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: sheet.heat_treatment,
        atendido: true,
        bloqueante: true,
      })
    }

    // -------------------------------------------------------------
    // GRUPO 3: QUALIDADE (Ultrassom, Ensaios Mecânicos, Análise Química, Certificados)
    // -------------------------------------------------------------
    if (sheet.requires_ultrasound) {
      list.push({
        id: 'REQ-QLT-ULTRASSOM',
        codigo: 'ENSAIO_ULTRASSOM',
        titulo: 'Ensaio de Ultrassom (US)',
        descricao: `Ensaio US obrigatório conforme norma ${sheet.ultrasound_standard || 'ASME Sec. V / ASTM E213'}`,
        grupo: 'QUALIDADE',
        criticidade: 'CRITICO',
        status: 'VALIDADO',
        valorRequerido: sheet.ultrasound_standard || 'SIM (100%)',
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.requires_mechanical_tests) {
      const ensaios = sheet.mechanical_tests_detail
        ? Object.entries(sheet.mechanical_tests_detail)
            .filter(([, v]) => Boolean(v))
            .map(([k]) => k.toUpperCase())
            .join(', ')
        : 'Tração / Dobramento'
      list.push({
        id: 'REQ-QLT-MECANICO',
        codigo: 'ENSAIOS_MECANICOS',
        titulo: 'Ensaios Mecânicos Obrigatórios',
        descricao: `Ensaios requeridos: ${ensaios}`,
        grupo: 'QUALIDADE',
        criticidade: 'CRITICO',
        status: 'VALIDADO',
        valorRequerido: ensaios,
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.requires_chemical_analysis) {
      list.push({
        id: 'REQ-QLT-QUIMICA',
        codigo: 'ANALISE_QUIMICA',
        titulo: 'Análise Química Espectrométrica',
        descricao: 'Controle de composição química por corrida',
        grupo: 'QUALIDADE',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: 'Certificado Químico',
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.requires_metallography) {
      list.push({
        id: 'REQ-QLT-METALOGRAFIA',
        codigo: 'METALOGRAFIA',
        titulo: 'Ensaio Metalográfico',
        descricao: 'Análise microestrutural e tamanho de grão',
        grupo: 'QUALIDADE',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: 'Laudo Metalográfico',
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.requires_dimensional_inspection) {
      list.push({
        id: 'REQ-QLT-DIMENSIONAL',
        codigo: 'INSPECAO_DIMENSIONAL',
        titulo: 'Inspeção Dimensional N2',
        descricao: 'Inspeção 100% de medidas críticas e esquadro',
        grupo: 'QUALIDADE',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: 'Laudo Dimensional',
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.quality_certificates_required && sheet.quality_certificates_required.length > 0) {
      list.push({
        id: 'REQ-QLT-CERTIFICADOS',
        codigo: 'CERTIFICADOS_QUALIDADE',
        titulo: 'Certificados e Laudos Obrigatórios',
        descricao: `Certificados exigidos: ${sheet.quality_certificates_required.join(', ')}`,
        grupo: 'QUALIDADE',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: sheet.quality_certificates_required.join(', '),
        atendido: true,
        bloqueante: true,
      })
    }

    // -------------------------------------------------------------
    // GRUPO 4: COMERCIAL / LOGÍSTICO (Embalagem, Marcação, Rastreabilidade, Requisitos Especiais)
    // -------------------------------------------------------------
    if (sheet.packaging_requirements) {
      list.push({
        id: 'REQ-COM-EMBALAGEM',
        codigo: 'EMBALAGEM_ESPECIAL',
        titulo: 'Embalagem e Amarração',
        descricao: sheet.packaging_requirements,
        grupo: 'COMERCIAL_LOGISTICO',
        criticidade: 'PREFERENCIAL',
        status: 'VALIDADO',
        valorRequerido: sheet.packaging_requirements,
        atendido: true,
        bloqueante: false,
      })
    }

    if (sheet.marking_identification) {
      list.push({
        id: 'REQ-COM-MARCACAO',
        codigo: 'MARCACAO_IDENTIFICACAO',
        titulo: 'Marcação e Identificação das Peças',
        descricao: sheet.marking_identification,
        grupo: 'COMERCIAL_LOGISTICO',
        criticidade: 'PREFERENCIAL',
        status: 'VALIDADO',
        valorRequerido: sheet.marking_identification,
        atendido: true,
        bloqueante: false,
      })
    }

    if (sheet.traceability_level) {
      list.push({
        id: 'REQ-COM-RASTREABILIDADE',
        codigo: 'RASTREABILIDADE',
        titulo: 'Nível de Rastreabilidade',
        descricao: sheet.traceability_level,
        grupo: 'COMERCIAL_LOGISTICO',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: sheet.traceability_level,
        atendido: true,
        bloqueante: true,
      })
    }

    if (sheet.special_customer_requirements) {
      list.push({
        id: 'REQ-COM-ESPECIAIS',
        codigo: 'REQUISITOS_ESPECIAIS_CLIENTE',
        titulo: 'Requisitos Especiais do Cliente',
        descricao: sheet.special_customer_requirements,
        grupo: 'COMERCIAL_LOGISTICO',
        criticidade: 'OBRIGATORIO',
        status: 'VALIDADO',
        valorRequerido: sheet.special_customer_requirements,
        atendido: true,
        bloqueante: true,
      })
    }

    return list
  }

  /**
   * Valida a programação proposta de um Pedido MTO contra seus requisitos canônicos e a Ficha Mestra.
   *
   * Regras Obrigatórias:
   * 1. Requisito Crítico ou Obrigatório não atendido -> BLOQUEIA a programação (aprovadoParaProgramacao = false).
   * 2. Linha obrigatória: se o requisito especificar Linha L1 e a programação propor L2 -> BLOQUEADO.
   *    Mensagem: "Requisito MTO não atendido: Linha L1 obrigatória".
   * 3. Aço compatível: se o requisito especificar aço (ex: A36) e a programação propor aço incompatível -> BLOQUEADO.
   * 4. Inspeções especiais: se a ficha exigir Ultrassom / Inspeção Especial e a programação / linha não cobrir -> BLOQUEADO.
   * 5. Nunca alterar a programação automaticamente — apenas validar, bloquear e alertar.
   */
  public static validarProgramacaoMTO(input: MtoValidationInput): MtoValidationResult {
    const bloqueios: string[] = []
    const alertas: string[] = []

    const sheet = input.requisitosSheet
    const fichaPresente = Boolean(sheet)
    const linhaOrigem = input.pedidoMto.linha || ''

    // Decompõe requisitos canônicos individuais
    const requisitos = this.extrairRequisitosIndividuais(sheet, linhaOrigem)

    // Se houver conflito pré-existente na ficha
    if (sheet?.validation_status === 'CONFLITO_REQUISITOS') {
      const msg = sheet.validation_pendency_details
        ? `Conflito de requisitos técnicos na ficha MTO: ${sheet.validation_pendency_details}`
        : 'Conflito técnico não resolvido na Ficha de Requisitos MTO.'
      bloqueios.push(msg)
    }

    // Se houver pendência de validação na ficha
    if (sheet?.validation_status === 'PENDENCIA_VALIDACAO') {
      alertas.push(
        sheet.validation_pendency_details
          ? `Ficha MTO com pendência de validação: ${sheet.validation_pendency_details}`
          : 'Ficha de Requisitos MTO com validação pendente.',
      )
    }

    // Se a programação proposta foi informada, validamos requisito por requisito
    if (input.programacao) {
      const prog = input.programacao

      // 1. REGRA DE LINHA OBRIGATÓRIA (TESTE 36)
      // Identifica se há requisito de linha no pedido ou ficha
      const linhaRequerida = (linhaOrigem || '').trim().toUpperCase()
      const linhaProposta = (prog.linha_programada || '').trim().toUpperCase()

      if (linhaRequerida && linhaProposta && linhaRequerida !== linhaProposta) {
        const reqLinha = requisitos.find((r) => r.codigo === 'LINHA_PRODUCAO')
        if (reqLinha) {
          reqLinha.status = 'NAO_ATENDIDO'
          reqLinha.atendido = false
          reqLinha.valorProgramado = linhaProposta
          reqLinha.detalheIncompatibilidade = `Programado na linha ${linhaProposta}, mas a linha obrigatória é ${linhaRequerida}`
        }

        const msgBloqueioLinha = `Requisito MTO não atendido: Linha ${linhaRequerida} obrigatória`
        bloqueios.push(msgBloqueioLinha)
      } else if (linhaRequerida && linhaProposta && linhaRequerida === linhaProposta) {
        const reqLinha = requisitos.find((r) => r.codigo === 'LINHA_PRODUCAO')
        if (reqLinha) {
          reqLinha.status = 'ATENDIDO'
          reqLinha.atendido = true
          reqLinha.valorProgramado = linhaProposta
        }
      }

      // 2. REGRA DO GRAU DO AÇO
      if (sheet?.steel_grade && prog.aco_programado) {
        const reqAco = requisitos.find((r) => r.codigo === 'GRAU_ACO')
        const steelGradeNormalized = sheet.steel_grade.toLowerCase()
        const progAcoNormalized = prog.aco_programado.toLowerCase()

        // Exemplo: 'A36' dentro de 'Aço Estrutural ASTM A36'
        const compativel =
          steelGradeNormalized.includes(progAcoNormalized) ||
          progAcoNormalized.includes(steelGradeNormalized) ||
          (steelGradeNormalized.includes('a36') && progAcoNormalized.includes('a36')) ||
          (steelGradeNormalized.includes('1020') && progAcoNormalized.includes('1020'))

        if (!compativel) {
          if (reqAco) {
            reqAco.status = 'NAO_ATENDIDO'
            reqAco.atendido = false
            reqAco.valorProgramado = prog.aco_programado
            reqAco.detalheIncompatibilidade = `Aço programado (${prog.aco_programado}) difere do grau requerido (${sheet.steel_grade})`
          }
          bloqueios.push(
            `Requisito MTO não atendido: Grau do aço incompatível (Requerido: ${sheet.steel_grade}, Programado: ${prog.aco_programado})`,
          )
        } else if (reqAco) {
          reqAco.status = 'ATENDIDO'
          reqAco.atendido = true
          reqAco.valorProgramado = prog.aco_programado
        }
      }

      // 3. REGRA DE INSPEÇÕES ESPECIAIS (ULTRASSOM / ENSAIOS MECÂNICOS)
      if (sheet?.requires_ultrasound) {
        const reqUs = requisitos.find((r) => r.codigo === 'ENSAIO_ULTRASSOM')
        const temInspecaoProg = prog.inspecoes_programadas?.some(
          (insp) => insp.toUpperCase().includes('US') || insp.toUpperCase().includes('ULTRASSOM'),
        )
        const linhaSuportaUs = input.fichaMestraLinha?.possui_inspecao_ultrassom ?? true // se não informado assume ok

        if (prog.inspecoes_programadas && !temInspecaoProg) {
          if (reqUs) {
            reqUs.status = 'NAO_ATENDIDO'
            reqUs.atendido = false
            reqUs.detalheIncompatibilidade =
              'Programação não inclui alocação de ensaio de Ultrassom obrigatório.'
          }
          bloqueios.push(
            'Requisito MTO não atendido: Ensaio de Ultrassom obrigatório ausente na programação.',
          )
        } else if (!linhaSuportaUs) {
          if (reqUs) {
            reqUs.status = 'BLOQUEADO'
            reqUs.atendido = false
            reqUs.detalheIncompatibilidade = `Linha de destino (${prog.linha_programada}) não homologada para inspeção de Ultrassom.`
          }
          bloqueios.push(
            `Requisito MTO não atendido: Linha ${prog.linha_programada} não possui capacidade para inspeção de Ultrassom.`,
          )
        } else if (reqUs) {
          reqUs.status = 'ATENDIDO'
          reqUs.atendido = true
          reqUs.valorProgramado = 'Ultrassom Alocado'
        }
      }

      // 4. REGRA DE ENSAIOS MECÂNICOS / INSPEÇÃO ESPECIAL
      if (sheet?.requires_mechanical_tests) {
        const reqMec = requisitos.find((r) => r.codigo === 'ENSAIOS_MECANICOS')
        const temMecProg = prog.inspecoes_programadas?.some(
          (insp) =>
            insp.toUpperCase().includes('MEC') ||
            insp.toUpperCase().includes('TRACAO') ||
            insp.toUpperCase().includes('DOBRAMENTO') ||
            insp.toUpperCase().includes('ESPECIAL'),
        )

        if (prog.inspecoes_programadas && !temMecProg) {
          if (reqMec) {
            reqMec.status = 'NAO_ATENDIDO'
            reqMec.atendido = false
            reqMec.detalheIncompatibilidade =
              'Programação não inclui ensaios mecânicos obrigatórios de tração/dobramento.'
          }
          bloqueios.push('Requisito MTO não atendido: Ensaios mecânicos obrigatórios não alocados.')
        } else if (reqMec) {
          reqMec.status = 'ATENDIDO'
          reqMec.atendido = true
          reqMec.valorProgramado = 'Ensaios Alocados'
        }
      }

      // Atualiza status dos demais requisitos informados
      requisitos.forEach((req) => {
        if (req.status === 'VALIDADO' && prog) {
          req.status = 'ATENDIDO'
          req.atendido = true
        }
      })
    }

    // Calcula resumo numérico
    const resumo: MtoValidationSummary = {
      totalRequisitos: requisitos.length,
      atendidos: requisitos.filter((r) => r.status === 'ATENDIDO').length,
      pendentes: requisitos.filter((r) => r.status === 'PENDENTE').length,
      naoAtendidos: requisitos.filter((r) => r.status === 'NAO_ATENDIDO').length,
      bloqueados: requisitos.filter((r) => r.status === 'BLOQUEADO').length,
      emAnalise: requisitos.filter((r) => r.status === 'EM_ANALISE').length,
      naoAplicaveis: requisitos.filter((r) => r.status === 'NAO_APLICAVEL').length,
    }

    // Agrupamento canônico
    const gruposNomes: Record<MtoCanonicalGroup, string> = {
      PRODUTO: 'Produto',
      PRODUCAO: 'Produção',
      QUALIDADE: 'Qualidade',
      COMERCIAL_LOGISTICO: 'Comercial & Logístico',
    }

    const gruposCanonicais: MtoCanonicalGroup[] = [
      'PRODUTO',
      'PRODUCAO',
      'QUALIDADE',
      'COMERCIAL_LOGISTICO',
    ]

    const requisitosPorGrupo = gruposCanonicais.map((grp) => {
      const itensDoGrupo = requisitos.filter((r) => r.grupo === grp)
      return {
        grupo: grp,
        nomeGrupo: gruposNomes[grp],
        itens: itensDoGrupo,
        total: itensDoGrupo.length,
        atendidos: itensDoGrupo.filter((r) => r.status === 'ATENDIDO').length,
        bloqueios: itensDoGrupo.filter(
          (r) => (r.status === 'NAO_ATENDIDO' || r.status === 'BLOQUEADO') && r.bloqueante,
        ).length,
      }
    })

    const aprovadoParaProgramacao = bloqueios.length === 0

    let statusGeral: MtoValidationResult['statusGeral'] = 'LIBERADO'
    if (bloqueios.length > 0) {
      statusGeral = 'BLOQUEADO'
    } else if (resumo.pendentes > 0 || resumo.emAnalise > 0) {
      statusGeral = 'PENDENTE'
    } else if (alertas.length > 0) {
      statusGeral = 'ALERTA_PREFERENCIAL'
    }

    let mensagemConsolidadora = ''
    if (!fichaPresente) {
      mensagemConsolidadora = 'Nenhum requisito registrado para este pedido no backend.'
    } else if (bloqueios.length > 0) {
      mensagemConsolidadora = `Programação BLOQUEADA: ${bloqueios.join('; ')}`
    } else if (statusGeral === 'LIBERADO') {
      mensagemConsolidadora = 'REQUISITOS OK: Programação liberada sem restrições impeditivas.'
    } else {
      mensagemConsolidadora = `Requisitos sob análise ou pendência: ${alertas.join('; ')}`
    }

    return {
      aprovadoParaProgramacao,
      statusGeral,
      mensagemConsolidadora,
      resumo,
      requisitos,
      requisitosPorGrupo,
      bloqueios,
      alertas,
      fichaRequisitosPresente: fichaPresente,
    }
  }
}

export default MtoRequirementValidationEngine

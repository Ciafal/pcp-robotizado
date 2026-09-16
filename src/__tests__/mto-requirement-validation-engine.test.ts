import { describe, it, expect } from 'vitest'
import {
  MtoRequirementValidationEngine,
  MtoValidationInput,
} from '../services/mto-requirement-validation-engine'
import { OrderRequirementSheet } from '../types/product-quality'

describe('Fatia 1: MTO Requirement Validation Engine — Testes Obrigatórios CIAFAL', () => {
  const baseOrderRequirementSheet: OrderRequirementSheet = {
    id: 'sheet-test-01',
    sheet_code: 'FRS-2026-MTO-001',
    order_number: 'OP-2026-1012',
    customer_name: 'Estruturas Metálicas Brasil S.A.',
    sales_order_sap: '4500981240',
    sales_order_item: '10',
    material_code: 'PERFIL_U',
    material_description: 'Perfil U Estrutural Dobrado 100x50x3.00mm',
    production_type: 'MTO',
    quantity_tons: 720,
    desired_delivery_date: '2026-09-05',
    technical_standard: 'ABNT NBR 6355 / ASTM A36',
    steel_grade: 'Aço Estrutural ASTM A36 / NBR 7007 Grau MR250',
    nominal_dimension: '100 x 50 x 3.00 mm',
    length_meters: 12,
    dimensional_tolerances: 'Espessura ±0.15mm, Abas ±1.0mm',
    requires_ultrasound: true,
    ultrasound_standard: 'ASME Sec. V Artigo 4 / ASTM E213',
    requires_mechanical_tests: true,
    mechanical_tests_detail: { tração: true, dobramento: true },
    requires_chemical_analysis: true,
    requires_dimensional_inspection: true,
    quality_certificates_required: ['CERTIFICADO_TIPO_3_1_B', 'LAUDO_ULTRASSOM'],
    packaging_requirements: 'Fardos de 2.5 t com 4 cintas de aço',
    traceability_level: 'Rastreabilidade Total por Corrida',
    validation_status: 'VALIDADO',
  }

  // =========================================================================
  // TESTE 36 (requisito de linha):
  // Pedido MTO com linha OBRIGATÓRIA L1, tentativa de programar na L2
  // -> BLOQUEADO com mensagem clara "Requisito MTO não atendido: Linha L1 obrigatória"
  // =========================================================================
  it('TESTE 36 (requisito de linha): pedido MTO com linha OBRIGATÓRIA L1, tentativa de programar na L2 → BLOQUEADO com mensagem clara "Requisito MTO não atendido: Linha L1 obrigatória"', () => {
    const input: MtoValidationInput = {
      pedidoMto: {
        ordem_venda: '4500981240',
        item_ordem: '10',
        nome_cliente: 'Estruturas Metálicas Brasil S.A.',
        codigo_material: 'PERFIL_U',
        descricao_material: 'Perfil U Estrutural Dobrado 100x50x3.00mm',
        linha: 'L1', // Requisito mandatório do pedido: Linha L1
        centro: '1000',
        quantidade_tons: 720,
        data_desejada: '2026-09-05',
      },
      requisitosSheet: baseOrderRequirementSheet,
      programacao: {
        linha_programada: 'L2', // Tentativa errônea de programar na L2
        centro_programado: '1000',
        aco_programado: 'A36',
        inspecoes_programadas: ['ULTRASSOM', 'TRACAO_DOBRAMENTO_ESPECIAL'],
      },
    }

    const resultado = MtoRequirementValidationEngine.validarProgramacaoMTO(input)

    // Asserções obrigatórias
    expect(resultado.aprovadoParaProgramacao).toBe(false)
    expect(resultado.statusGeral).toBe('BLOQUEADO')
    expect(resultado.bloqueios.length).toBeGreaterThan(0)

    // Mensagem exata especificada no requisito
    const temMensagemBloqueioLinha = resultado.bloqueios.some((b) =>
      b.includes('Requisito MTO não atendido: Linha L1 obrigatória'),
    )
    expect(temMensagemBloqueioLinha).toBe(true)

    // Requisito granular de linha deve estar classificado como NAO_ATENDIDO e com criticidade OBRIGATORIO
    const reqLinha = resultado.requisitos.find((r) => r.codigo === 'LINHA_PRODUCAO')
    expect(reqLinha).toBeDefined()
    expect(reqLinha?.criticidade).toBe('OBRIGATORIO')
    expect(reqLinha?.status).toBe('NAO_ATENDIDO')
    expect(reqLinha?.atendido).toBe(false)
    expect(reqLinha?.bloqueante).toBe(true)
  })

  // =========================================================================
  // TESTE 37 (requisitos atendidos):
  // Linha L1 + aço A36 + inspeção especial, programação compatível
  // -> REQUISITOS OK, programação liberada
  // =========================================================================
  it('TESTE 37 (requisitos atendidos): linha L1 + aço A36 + inspeção especial, programação compatível → REQUISITOS OK, programação liberada', () => {
    const input: MtoValidationInput = {
      pedidoMto: {
        ordem_venda: '4500981240',
        item_ordem: '10',
        nome_cliente: 'Estruturas Metálicas Brasil S.A.',
        codigo_material: 'PERFIL_U',
        descricao_material: 'Perfil U Estrutural Dobrado 100x50x3.00mm',
        linha: 'L1',
        centro: '1000',
        quantidade_tons: 720,
        data_desejada: '2026-09-05',
      },
      requisitosSheet: baseOrderRequirementSheet,
      programacao: {
        linha_programada: 'L1', // Compatível
        centro_programado: '1000',
        aco_programado: 'ASTM A36', // Compatível com aço requerido
        inspecoes_programadas: ['ULTRASSOM', 'ENSAIO_MECANICO_ESPECIAL'], // Compatível com inspeções especiais
      },
      fichaMestraLinha: {
        linha_codigo: 'L1',
        linha_nome: 'Linha de Laminação 1',
        possui_inspecao_ultrassom: true,
        possui_ensaio_mecanico: true,
      },
    }

    const resultado = MtoRequirementValidationEngine.validarProgramacaoMTO(input)

    // Asserções obrigatórias
    expect(resultado.aprovadoParaProgramacao).toBe(true)
    expect(resultado.statusGeral).toBe('LIBERADO')
    expect(resultado.bloqueios.length).toBe(0)
    expect(resultado.mensagemConsolidadora).toContain('REQUISITOS OK')

    // Requisitos granulares devem estar ATENDIDOS
    const reqLinha = resultado.requisitos.find((r) => r.codigo === 'LINHA_PRODUCAO')
    expect(reqLinha?.status).toBe('ATENDIDO')
    expect(reqLinha?.atendido).toBe(true)

    const reqAco = resultado.requisitos.find((r) => r.codigo === 'GRAU_ACO')
    expect(reqAco?.status).toBe('ATENDIDO')
    expect(reqAco?.atendido).toBe(true)

    const reqUs = resultado.requisitos.find((r) => r.codigo === 'ENSAIO_ULTRASSOM')
    expect(reqUs?.status).toBe('ATENDIDO')
    expect(reqUs?.atendido).toBe(true)

    const reqMec = resultado.requisitos.find((r) => r.codigo === 'ENSAIOS_MECANICOS')
    expect(reqMec?.status).toBe('ATENDIDO')
    expect(reqMec?.atendido).toBe(true)

    // Resumo de atendimento geral dos requisitos
    expect(resultado.resumo.totalRequisitos).toBeGreaterThan(0)
    expect(resultado.resumo.atendidos).toBe(resultado.resumo.totalRequisitos)
    expect(resultado.resumo.bloqueados).toBe(0)
    expect(resultado.resumo.naoAtendidos).toBe(0)
  })

  // Teste de Estado Vazio Honesto
  it('Deve retornar estado honesto de ausência quando não houver ficha de requisitos cadastrada', () => {
    const input: MtoValidationInput = {
      pedidoMto: {
        ordem_venda: '4500999999',
        item_ordem: '10',
        nome_cliente: 'Cliente Sem Ficha',
        linha: 'L1',
      },
      requisitosSheet: null,
    }

    const resultado = MtoRequirementValidationEngine.validarProgramacaoMTO(input)

    expect(resultado.fichaRequisitosPresente).toBe(false)
    expect(resultado.mensagemConsolidadora).toBe(
      'Nenhum requisito registrado para este pedido no backend.',
    )
    expect(resultado.resumo.totalRequisitos).toBe(0)
  })

  // Teste de Bloqueio por Grau de Aço Incompatível
  it('Deve bloquear a programação quando o grau do aço for incompatível', () => {
    const input: MtoValidationInput = {
      pedidoMto: {
        ordem_venda: '4500981240',
        item_ordem: '10',
        linha: 'L1',
      },
      requisitosSheet: baseOrderRequirementSheet,
      programacao: {
        linha_programada: 'L1',
        aco_programado: 'SAE 1045', // Incompatível com A36
        inspecoes_programadas: ['ULTRASSOM', 'ENSAIO_MECANICO_ESPECIAL'],
      },
    }

    const resultado = MtoRequirementValidationEngine.validarProgramacaoMTO(input)
    expect(resultado.aprovadoParaProgramacao).toBe(false)
    expect(resultado.statusGeral).toBe('BLOQUEADO')
    expect(resultado.bloqueios.some((b) => b.includes('Grau do aço incompatível'))).toBe(true)
  })
})

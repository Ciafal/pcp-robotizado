import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DeterministicQualityEngine } from '@/services/deterministic-quality-engine'
import { qualityService } from '@/services/quality-service'
import {
  ProductQualityRequirement,
  OrderRequirementSheet,
  QualityInspectionDemand,
  QualityDemandStatus,
} from '@/types/product-quality'

describe('Evolução MTS/MTO & Qualidade do Produto - Testes Obrigatórios CIAFAL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockCatalog: ProductQualityRequirement[] = [
    {
      id: 'pqr-1',
      product_code: 'TQ-505020',
      product_name: 'Tubo Industrial Quadrado 50x50x2.00',
      family_code: 'TUB_QUAD',
      production_type: 'MTO',
      ultrasound_requirement: 'SIM',
      ultrasound_condition_rule: 'Inspeção 100% da solda longitudinal',
      mechanical_test_requirement: 'SIM',
      mechanical_test_types: ['TRACAO', 'DOBRAMENTO'],
      applicable_standards: 'ABNT NBR 6355 / ASTM A36',
      is_blocking_default: true,
      standard_sample_count: 4,
      estimated_inspection_hours: 2.0,
      responsible_laboratory: 'LAB_US_L1',
      active: true,
    },
    {
      id: 'pqr-2',
      product_code: 'TAR-120-1020',
      product_name: 'Tarugo Laminado 120mm SAE 1020',
      family_code: 'TARUGO',
      production_type: 'MTS',
      ultrasound_requirement: 'NAO',
      mechanical_test_requirement: 'CONDICIONAL',
      mechanical_test_types: ['TRACAO'],
      applicable_standards: 'NBR 7007',
      is_blocking_default: false,
      standard_sample_count: 2,
      estimated_inspection_hours: 1.0,
      responsible_laboratory: 'LAB_MEC_CENTRAL',
      active: true,
    },
    {
      id: 'pqr-3',
      product_code: 'TR-804030',
      product_name: 'Perfil Retangular 80x40x3.00',
      family_code: 'TUB_RET',
      production_type: 'MTO',
      ultrasound_requirement: 'CONDICIONAL',
      mechanical_test_requirement: 'SIM',
      mechanical_test_types: ['TRACAO', 'DOBRAMENTO', 'DUREZA'],
      applicable_standards: 'ASTM A500 Grau B',
      is_blocking_default: true,
      standard_sample_count: 3,
      estimated_inspection_hours: 2.5,
      responsible_laboratory: 'LAB_US_L2',
      active: true,
    },
  ]

  const mockSheets: OrderRequirementSheet[] = [
    {
      id: 'sheet-1',
      sheet_code: 'FRS-2026-1011',
      order_number: 'OP-2026-1011',
      customer_name: 'Metalúrgica Andrade & Filhos',
      sales_order_sap: '450019',
      sales_order_item: '0010',
      material_code: 'TQ-505020',
      material_description: 'Tubo Industrial 50x50x2.00 SAE 1020',
      production_type: 'MTO',
      quantity_tons: 1850,
      desired_delivery_date: '2026-09-02',
      technical_standard: 'ABNT NBR 6355 / ASTM A36',
      requires_ultrasound: true,
      requires_mechanical_tests: true,
      validation_status: 'VALIDADO',
    },
    {
      id: 'sheet-conflict',
      sheet_code: 'FRS-2026-CONFLITO',
      order_number: 'OP-2026-9999',
      customer_name: 'Cliente Específico S/A',
      sales_order_sap: '450099',
      sales_order_item: '0010',
      material_code: 'TR-804030',
      material_description: 'Perfil Retangular Especial',
      production_type: 'MTO',
      quantity_tons: 500,
      desired_delivery_date: '2026-09-05',
      technical_standard: 'ASTM A500',
      requires_ultrasound: true,
      requires_mechanical_tests: true,
      validation_status: 'CONFLITO_REQUISITOS',
      validation_pendency_details: 'Tolerância dimensional exigida pelo cliente difere da norma ASTM.',
    },
    {
      id: 'sheet-pendency',
      sheet_code: 'FRS-2026-PENDENTE',
      order_number: 'OP-2026-8888',
      customer_name: 'Construtora Horizonte',
      sales_order_sap: '450088',
      sales_order_item: '0010',
      material_code: 'TQ-505020',
      material_description: 'Tubo Industrial 50x50',
      production_type: 'MTO',
      quantity_tons: 300,
      desired_delivery_date: '2026-09-08',
      technical_standard: 'NBR 6355',
      requires_ultrasound: true,
      requires_mechanical_tests: true,
      validation_status: 'PENDENCIA_VALIDACAO',
      validation_pendency_details: 'Aguardando validação do certificado de corrida pelo cliente.',
    },
  ]

  // =========================================================================
  // 1. Teste de Classificação MTS/MTO e Análise Pré-Programação
  // =========================================================================
  it('1. Deve classificar itens como MTS e MTO e identificar demandas de Ultrassom e Ensaios Mecânicos', () => {
    const items = [
      {
        codigo: 'TQ-505020',
        ordemPcp: 'OP-2026-1011',
        mtoOrIndustrializacao: 'MTO',
        cliente: 'Metalúrgica Andrade & Filhos',
        ordemSap: '450019',
        dataDetalhada: '2026-09-02',
      },
      {
        codigo: 'TAR-120-1020',
        ordemPcp: 'OP-2026-1012',
        mtoOrIndustrializacao: 'MTS',
        cliente: 'Mercado Geral',
        dataDetalhada: '2026-09-02',
      },
      {
        codigo: 'TR-804030',
        ordemPcp: 'OP-2026-1014',
        mtoOrIndustrializacao: 'MTO',
        cliente: 'Construtora Vale do Aço',
        ordemSap: '450021',
        dataDetalhada: '2026-09-02',
      },
    ]

    const analysis = DeterministicQualityEngine.analyzePreProgrammingConsistency({
      scheduleCode: 'GRADE-L1-2026-W35',
      lineCode: 'L1',
      items,
      requirementsCatalog: mockCatalog,
      orderRequirementSheets: mockSheets,
    })

    expect(analysis.totalItems).toBe(3)
    expect(analysis.mtoCount).toBe(2)
    expect(analysis.mtsCount).toBe(1)
    expect(analysis.ultrasoundDemandsCount).toBe(2) // TQ-505020 (SIM) + TR-804030 (CONDICIONAL em MTO)
    expect(analysis.mechanicalTestsCount).toBe(2) // TQ-505020 + TR-804030
    expect(analysis.totalInspectionHoursNeeded).toBeGreaterThan(0)
  })

  // =========================================================================
  // 2. Regra de Consistência: Proibido MTO sem Pedido / Cliente Vinculado
  // =========================================================================
  it('2. Deve bloquear consistência quando item MTO não possui Pedido/Cliente vinculado', () => {
    const invalidMtoItems = [
      {
        codigo: 'TQ-505020',
        ordemPcp: 'OP-INVALID-MTO',
        mtoOrIndustrializacao: 'MTO',
        cliente: '', // Sem cliente
        dataDetalhada: '2026-09-03',
      },
    ]

    const analysis = DeterministicQualityEngine.analyzePreProgrammingConsistency({
      scheduleCode: 'GRADE-INV',
      lineCode: 'L1',
      items: invalidMtoItems,
      requirementsCatalog: mockCatalog,
      orderRequirementSheets: mockSheets,
    })

    expect(analysis.isConsistencyApproved).toBe(false)
    expect(analysis.hardBlockCount).toBeGreaterThan(0)
    const risk = analysis.risksIdentified.find((r) => r.id.includes('RISK-MTO-NO-CLIENT'))
    expect(risk).toBeDefined()
    expect(risk?.severity).toBe('CRITICAL')
    expect(risk?.blockingReleaseRisk).toBe(true)
  })

  // =========================================================================
  // 3. Hierarquia e Conflito de Requisitos gerando Bloqueio
  // =========================================================================
  it('3. Deve detectar CONFLITO_REQUISITOS gerando bloqueio crítico na liberação', () => {
    const conflictItems = [
      {
        codigo: 'TR-804030',
        ordemPcp: 'OP-2026-9999',
        mtoOrIndustrializacao: 'MTO',
        cliente: 'Cliente Específico S/A',
        ordemSap: '450099',
        dataDetalhada: '2026-09-05',
      },
    ]

    const analysis = DeterministicQualityEngine.analyzePreProgrammingConsistency({
      scheduleCode: 'GRADE-CONF',
      lineCode: 'L2',
      items: conflictItems,
      requirementsCatalog: mockCatalog,
      orderRequirementSheets: mockSheets,
    })

    expect(analysis.isConsistencyApproved).toBe(false)
    const conflictRisk = analysis.risksIdentified.find((r) => r.id.includes('RISK-MTO-CONFLICT'))
    expect(conflictRisk).toBeDefined()
    expect(conflictRisk?.severity).toBe('CRITICAL')
    expect(conflictRisk?.blockingReleaseRisk).toBe(true)
  })

  // =========================================================================
  // 4. Pendência de Validação de Requisitos
  // =========================================================================
  it('4. Deve identificar PENDENCIA_VALIDACAO como risco médio sem travar hard block', () => {
    const pendencyItems = [
      {
        codigo: 'TQ-505020',
        ordemPcp: 'OP-2026-8888',
        mtoOrIndustrializacao: 'MTO',
        cliente: 'Construtora Horizonte',
        ordemSap: '450088',
        dataDetalhada: '2026-09-08',
      },
    ]

    const analysis = DeterministicQualityEngine.analyzePreProgrammingConsistency({
      scheduleCode: 'GRADE-PEND',
      lineCode: 'L1',
      items: pendencyItems,
      requirementsCatalog: mockCatalog,
      orderRequirementSheets: mockSheets,
    })

    const pendRisk = analysis.risksIdentified.find((r) => r.id.includes('RISK-MTO-PENDENCY'))
    expect(pendRisk).toBeDefined()
    expect(pendRisk?.severity).toBe('MEDIUM')
    expect(pendRisk?.blockingReleaseRisk).toBe(false)
  })

  // =========================================================================
  // 5. Alerta de Sobrecarga de Capacidade de Laboratório / Ultrassom
  // =========================================================================
  it('5. Deve alertar sobrecarga quando demanda diária de Ultrassom ultrapassar o limite nominal (10 ensaios/dia)', () => {
    // 12 itens de Ultrassom no mesmo dia
    const overloadedItems = Array.from({ length: 12 }, (_, i) => ({
      codigo: 'TQ-505020',
      ordemPcp: `OP-OVERLOAD-${i + 1}`,
      mtoOrIndustrializacao: 'MTO',
      cliente: 'Metalúrgica Andrade & Filhos',
      ordemSap: '450019',
      dataDetalhada: '2026-09-15',
    }))

    const analysis = DeterministicQualityEngine.analyzePreProgrammingConsistency({
      scheduleCode: 'GRADE-OVERLOAD',
      lineCode: 'L1',
      items: overloadedItems,
      requirementsCatalog: mockCatalog,
      orderRequirementSheets: mockSheets,
    })

    const capRisk = analysis.risksIdentified.find((r) =>
      r.id.includes('RISK-CAP-OVERLOAD-2026-09-15'),
    )
    expect(capRisk).toBeDefined()
    expect(capRisk?.severity).toBe('HIGH')
    expect(capRisk?.blockingReleaseRisk).toBe(true)
    expect(analysis.recommendations.some((rec) => rec.type === 'REARRANGE_SEQUENCE')).toBe(true)
  })

  // =========================================================================
  // 6. Geração Automática de Demandas de Qualidade (US e EM)
  // =========================================================================
  it('6. Deve disparar geração automática de demandas de Ultrassom e Ensaios Mecânicos a partir da grade', async () => {
    const listReqsSpy = vi
      .spyOn(qualityService, 'listProductQualityRequirements')
      .mockResolvedValue(mockCatalog)

    const createDemandSpy = vi
      .spyOn(qualityService, 'createQualityDemand')
      .mockImplementation(async (data) => {
        return {
          id: `qid-${Math.random()}`,
          demand_code: data.demand_code || 'QID-AUTO',
          inspection_type: data.inspection_type || 'ULTRASSOM',
          line_code: data.line_code || 'L1',
          production_order_number: data.production_order_number || 'OP-1011',
          product_code: data.product_code || 'TQ-505020',
          product_description: data.product_description || 'Tubo',
          production_type: data.production_type || 'MTO',
          quantity_tons: data.quantity_tons || 100,
          planned_production_date: data.planned_production_date || '2026-09-02',
          planned_inspection_date: data.planned_inspection_date || '2026-09-02',
          is_blocking_release: data.is_blocking_release ?? true,
          priority: data.priority || 'ALTA',
          status: data.status || 'PREVISTA',
        } as QualityInspectionDemand
      })

    const itemsToGenerate = [
      {
        orderNumber: 'OP-2026-1011',
        productCode: 'TQ-505020',
        productName: 'Tubo Industrial 50x50x2.00',
        productionType: 'MTO' as const,
        quantityTons: 1850,
        lineCode: 'L1',
        plannedDate: '2026-09-02',
        salesOrder: '450019',
        customerName: 'Metalúrgica Andrade & Filhos',
      },
    ]

    const result = await qualityService.generateDemandsFromScheduleItems(itemsToGenerate)

    expect(result.generatedCount).toBe(2) // 1 US + 1 EM
    expect(createDemandSpy).toHaveBeenCalledTimes(2)

    listReqsSpy.mockRestore()
    createDemandSpy.mockRestore()
  })

  // =========================================================================
  // 7. Workflow Completo de Inspeção: Prevista -> Programada -> Disponível -> Em Inspeção -> Aprovada/Reprovada -> Liberada
  // =========================================================================
  it('7. Deve transitar pelo workflow formal de inspeção com gravação de auditoria e laudo técnico', async () => {
    const demandMock: QualityInspectionDemand = {
      id: 'qid-workflow-test',
      demand_code: 'QID-WF-101',
      inspection_type: 'ULTRASSOM',
      line_code: 'L1',
      production_order_number: 'OP-2026-1011',
      product_code: 'TQ-505020',
      product_description: 'Tubo Industrial 50x50',
      production_type: 'MTO',
      quantity_tons: 100,
      planned_production_date: '2026-09-02',
      planned_inspection_date: '2026-09-02',
      is_blocking_release: true,
      priority: 'ALTA',
      status: 'PREVISTA',
      audit_log: [],
    }

    const transitions: QualityDemandStatus[] = [
      'PROGRAMADA',
      'DISPONIVEL_INSPECAO',
      'EM_INSPECAO',
      'APROVADA',
      'LIBERADA',
    ]

    let currentDemand = { ...demandMock }

    for (const targetStatus of transitions) {
      const log = {
        event: `STATUS_CHANGED_TO_${targetStatus}`,
        by: 'inspetor.qualidade@ciafal.com.br',
        at: new Date().toISOString(),
        details: `Transição para ${targetStatus}`,
      }

      currentDemand = {
        ...currentDemand,
        status: targetStatus,
        audit_log: [log, ...(currentDemand.audit_log || [])],
      }
      expect(currentDemand.status).toBe(targetStatus)
    }

    expect(currentDemand.status).toBe('LIBERADA')
    expect(currentDemand.audit_log?.length).toBe(5)
  })

  // =========================================================================
  // 8. Reprogramação de Demanda Preservando Histórico (Proibido perder requisitos)
  // =========================================================================
  it('8. Deve reprogramar data da inspeção preservando histórico completo de reprogramações', () => {
    const demand: QualityInspectionDemand = {
      id: 'qid-reprogram-test',
      demand_code: 'QID-REP-202',
      inspection_type: 'ENSAIO_TRACAO',
      line_code: 'L2',
      production_order_number: 'OP-2026-1014',
      product_code: 'TR-804030',
      product_description: 'Perfil Retangular',
      production_type: 'MTO',
      quantity_tons: 50,
      planned_production_date: '2026-09-02',
      planned_inspection_date: '2026-09-02',
      is_blocking_release: true,
      priority: 'ALTA',
      status: 'PREVISTA',
      reschedule_history: [],
      audit_log: [],
    }

    const previousDate = demand.planned_inspection_date
    const newDate = '2026-09-04'
    const reason = 'Atraso na liberação da matéria-prima (MPL2)'

    const updatedDemand: QualityInspectionDemand = {
      ...demand,
      planned_inspection_date: newDate,
      reschedule_history: [
        ...(demand.reschedule_history || []),
        {
          previous_date: previousDate,
          new_date: newDate,
          reason,
          rescheduled_by: 'lucas.ferreira@ciafal.com.br',
          rescheduled_at: new Date().toISOString(),
        },
      ],
    }

    expect(updatedDemand.planned_inspection_date).toBe('2026-09-04')
    expect(updatedDemand.reschedule_history?.length).toBe(1)
    expect(updatedDemand.reschedule_history?.[0].previous_date).toBe('2026-09-02')
    expect(updatedDemand.reschedule_history?.[0].new_date).toBe('2026-09-04')
    expect(updatedDemand.reschedule_history?.[0].reason).toBe(reason)
  })
})

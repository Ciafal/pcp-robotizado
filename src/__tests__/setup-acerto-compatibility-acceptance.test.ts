import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SampleType,
  SAMPLE_TYPE_LABELS,
  LineSetupMatrix,
  LineAdjustmentTimeRule,
} from '@/types/line-master'
import { SetupAcertoCompatibilityEngine } from '@/services/setup-acerto-compatibility-engine'
import { lineMasterService } from '@/services/line-master'
import pb from '@/lib/pocketbase/client'
import { WeeklyScheduleMotor } from '@/services/weekly-schedule-engine'

describe('Suíte de Aceite Completa: Setup + Acertos + Compatibilidade (T1 - T15)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // =========================================================================
  // T1: "Novo Tempo de Acerto" mostra Pequena, Média, Grande, Tarugo, Placa, Palanquilha, Lingote
  // =========================================================================
  it('T1: Tipos de amostra incluem Pequena, Média, Grande, Tarugo, Placa, Palanquilha e Lingote', () => {
    const requiredTypes: SampleType[] = [
      'PEQUENA',
      'MEDIA',
      'GRANDE',
      'TARUGO',
      'PLACA',
      'PALANQUILHA',
      'LINGOTE',
    ]

    for (const st of requiredTypes) {
      expect(SAMPLE_TYPE_LABELS[st]).toBeDefined()
      expect(typeof SAMPLE_TYPE_LABELS[st]).toBe('string')
      expect(SAMPLE_TYPE_LABELS[st].length).toBeGreaterThan(0)
    }

    expect(SAMPLE_TYPE_LABELS['PLACA']).toBe('Placa')
    expect(SAMPLE_TYPE_LABELS['PALANQUILHA']).toBe('Palanquilha')
    expect(SAMPLE_TYPE_LABELS['LINGOTE']).toBe('Lingote')
  })

  // =========================================================================
  // T2: Criar Acerto Ativo e confirmar persistência após atualizar página
  // =========================================================================
  it('T2: Criar Acerto Ativo e confirmar persistência com auditoria', async () => {
    const fakeCreatedRecord = {
      id: 'atr_test_001',
      line_id: 'line_l1',
      material_code: 'TQ-50x50',
      sample_type: 'PLACA',
      duration_minutes: 25,
      valid_from: '2025-01-01',
      active: true,
    }

    const createSpy = vi
      .spyOn(pb.collection('adjustment_time_rules'), 'create')
      .mockResolvedValue(fakeCreatedRecord as any)
    const auditSpy = vi
      .spyOn(pb.collection('pcp_audit_logs'), 'create')
      .mockResolvedValue({ id: 'aud_1' } as any)

    const result = await lineMasterService.saveAdjustmentRule({
      line_id: 'line_l1',
      material_code: 'TQ-50x50',
      sample_type: 'PLACA' as any,
      duration_minutes: 25,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    })

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(result.id).toBe('atr_test_001')
    expect(result.sample_type).toBe('PLACA')
    expect(result.active).toBe(true)
    expect(auditSpy).toHaveBeenCalled()
  })

  // =========================================================================
  // T3: Editar Acerto existente sem duplicidade (atualiza o MESMO id)
  // =========================================================================
  it('T3: Editar Acerto existente atualiza o mesmo registro sem criar novo', async () => {
    const existing = {
      id: 'atr_test_001',
      line_id: 'line_l1',
      material_code: 'TQ-50x50',
      sample_type: 'MEDIA',
      duration_minutes: 20,
      valid_from: '2025-01-01',
      active: true,
    }

    vi.spyOn(pb.collection('adjustment_time_rules'), 'getOne').mockResolvedValue(existing as any)
    const updateSpy = vi.spyOn(pb.collection('adjustment_time_rules'), 'update').mockResolvedValue({
      ...existing,
      duration_minutes: 35,
      sample_type: 'LINGOTE',
    } as any)
    const createSpy = vi.spyOn(pb.collection('adjustment_time_rules'), 'create')
    vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({ id: 'aud_2' } as any)

    const updated = await lineMasterService.saveAdjustmentRule({
      id: 'atr_test_001',
      line_id: 'line_l1',
      material_code: 'TQ-50x50',
      sample_type: 'LINGOTE' as any,
      duration_minutes: 35,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    })

    expect(createSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(
      'atr_test_001',
      expect.objectContaining({
        duration_minutes: 35,
        sample_type: 'LINGOTE',
      }),
    )
    expect(updated.duration_minutes).toBe(35)
  })

  // =========================================================================
  // T4: Inativar Acerto e confirmar permanência no histórico
  // =========================================================================
  it('T4: Inativar Acerto mantém o registro existente com active=false sem deletar', async () => {
    const existing = {
      id: 'atr_test_001',
      line_id: 'line_l1',
      material_code: 'TQ-50x50',
      active: true,
    }

    vi.spyOn(pb.collection('adjustment_time_rules'), 'getOne').mockResolvedValue(existing as any)
    const updateSpy = vi.spyOn(pb.collection('adjustment_time_rules'), 'update').mockResolvedValue({
      ...existing,
      active: false,
    } as any)
    const deleteSpy = vi.spyOn(pb.collection('adjustment_time_rules'), 'delete')
    vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({ id: 'aud_3' } as any)

    const res = await lineMasterService.setAdjustmentRuleActive('atr_test_001', false)

    expect(deleteSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(
      'atr_test_001',
      expect.objectContaining({ active: false }),
    )
    expect(res.active).toBe(false)
  })

  // =========================================================================
  // T5: Editar Setup existente e confirmar persistência
  // =========================================================================
  it('T5: Editar Setup existente atualiza o mesmo ID e persiste no banco', async () => {
    const existingSetup = {
      id: 'stp_001',
      line_id: 'line_l1',
      setup_code: 'STP_PU_TQ',
      from_product_code: 'PU-100',
      to_product_code: 'TQ-50',
      setup_duration_minutes: 120,
      active: true,
    }

    vi.spyOn(pb.collection('line_setup_matrix'), 'getOne').mockResolvedValue(existingSetup as any)
    const updateSpy = vi.spyOn(pb.collection('line_setup_matrix'), 'update').mockResolvedValue({
      ...existingSetup,
      setup_duration_minutes: 90,
    } as any)
    const createSpy = vi.spyOn(pb.collection('line_setup_matrix'), 'create')
    vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({ id: 'aud_4' } as any)

    const result = await lineMasterService.saveSetupMatrix({
      id: 'stp_001',
      line_id: 'line_l1',
      from_product_code: 'PU-100',
      to_product_code: 'TQ-50',
      setup_code: 'STP_PU_TQ',
      setup_duration_minutes: 90,
      setup_category: 'DIMENSION_CHANGE',
      source_mode: 'MANUAL',
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    })

    expect(createSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(
      'stp_001',
      expect.objectContaining({
        setup_duration_minutes: 90,
      }),
    )
    expect(result.setup_duration_minutes).toBe(90)
  })

  // =========================================================================
  // T6: Inativar Setup e confirmar que deixa de ser considerado em novas programações
  // =========================================================================
  it('T6: Setup inativo não gera pendência e é ignorado pelo motor de compatibilidade', () => {
    const setups: LineSetupMatrix[] = [
      {
        id: 'stp_inactive',
        line_id: 'line_l1',
        setup_code: 'STP_OLD',
        setup_description: 'Transição Antiga',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'OLD_A',
        to_product_code: 'OLD_B',
        setup_duration_minutes: 60,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: false,
      },
    ]

    const acertos: LineAdjustmentTimeRule[] = []

    const comp = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l1',
      setupList: setups,
      acertoList: acertos,
    })

    expect(comp.totalActiveSetups).toBe(0)
    expect(comp.items[0].compatibility).toBe('INACTIVE_SETUP')
    expect(comp.items[0].isPending).toBe(false)
    expect(comp.overallStatus).toBe('GREEN')
  })

  // =========================================================================
  // T7: Cadastrar Setup sem Acerto -> Salvar, Alertar, Gerar Pendência
  // =========================================================================
  it('T7: Setup ativo sem Acerto compatível gera pendência MISSING_ACERTO', () => {
    const setups: LineSetupMatrix[] = [
      {
        id: 'stp_new',
        line_id: 'line_l1',
        setup_code: 'STP_PU_TQ',
        setup_description: 'Perfis U Dobrados → Tubos Quadrados Estruturais',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'PU-DOBRADO',
        to_product_code: 'TQ-ESTRUTURAL',
        setup_duration_minutes: 120,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: true,
      },
    ]

    const acertos: LineAdjustmentTimeRule[] = []

    const evalRes = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l1',
      setupList: setups,
      acertoList: acertos,
    })

    expect(evalRes.totalActiveSetups).toBe(1)
    expect(evalRes.compatibleSetupsCount).toBe(0)
    expect(evalRes.setupsWithoutAcertoCount).toBe(1)
    expect(evalRes.compatibilityRatePct).toBe(0)
    expect(evalRes.items[0].compatibility).toBe('MISSING_ACERTO')
    expect(evalRes.items[0].isPending).toBe(true)
    expect(evalRes.overallStatus).toBe('RED')
  })

  // =========================================================================
  // T8: Cadastrar depois o Acerto correspondente -> Muda automaticamente para COMPATÍVEL
  // =========================================================================
  it('T8: Ao incluir o Acerto correspondente, o status recalcula automaticamente para COMPATÍVEL', () => {
    const setups: LineSetupMatrix[] = [
      {
        id: 'stp_new',
        line_id: 'line_l1',
        setup_code: 'STP_PU_TQ',
        setup_description: 'Perfis U Dobrados → Tubos Quadrados Estruturais',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'PU-DOBRADO',
        to_product_code: 'TQ-ESTRUTURAL',
        setup_duration_minutes: 120,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: true,
      },
    ]

    const acertos: LineAdjustmentTimeRule[] = [
      {
        id: 'atr_tq',
        line_id: 'line_l1',
        material_code: 'TQ-ESTRUTURAL',
        material_description: 'Tubos Quadrados Estruturais',
        sample_type: 'MEDIA',
        duration_minutes: 20,
        valid_from: '2025-01-01',
        active: true,
      },
    ]

    const evalRes = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l1',
      setupList: setups,
      acertoList: acertos,
    })

    expect(evalRes.totalActiveSetups).toBe(1)
    expect(evalRes.compatibleSetupsCount).toBe(1)
    expect(evalRes.setupsWithoutAcertoCount).toBe(0)
    expect(evalRes.compatibilityRatePct).toBe(100)
    expect(evalRes.items[0].compatibility).toBe('COMPATIBLE')
    expect(evalRes.items[0].isPending).toBe(false)
    expect(evalRes.overallStatus).toBe('GREEN')
    expect(evalRes.overallStatusLabel).toBe('100% Compatível')
  })

  // =========================================================================
  // T9: Inativar o único Acerto vinculado a um Setup ativo -> Alerta prévio mostrando o Setup impactado
  // =========================================================================
  it('T9: getImpactedSetupsOnAcertoDeactivation identifica previamente setups que ficarão sem acerto', () => {
    const setups: LineSetupMatrix[] = [
      {
        id: 'stp_pu_tq',
        line_id: 'line_l1',
        setup_code: 'STP_PU_TQ',
        setup_description: 'PU -> TQ',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'PU-DOBRADO',
        to_product_code: 'TQ-ESTRUTURAL',
        setup_duration_minutes: 120,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: true,
      },
    ]

    const acertos: LineAdjustmentTimeRule[] = [
      {
        id: 'atr_unique',
        line_id: 'line_l1',
        material_code: 'TQ-ESTRUTURAL',
        sample_type: 'MEDIA',
        duration_minutes: 20,
        valid_from: '2025-01-01',
        active: true,
      },
    ]

    const impacted = SetupAcertoCompatibilityEngine.getImpactedSetupsOnAcertoDeactivation({
      lineId: 'line_l1',
      acertoIdToDeactivate: 'atr_unique',
      setupList: setups,
      acertoList: acertos,
    })

    expect(impacted.length).toBe(1)
    expect(impacted[0].id).toBe('stp_pu_tq')
    expect(impacted[0].setup_code).toBe('STP_PU_TQ')
  })

  // =========================================================================
  // T10: Abrir "Compatibilidade Setup × Acerto" e validar cards e quantidades
  // =========================================================================
  it('T10: Validar cálculo dos cards do resumo e taxa de compatibilidade', () => {
    // Cenário: 40 ativos, 34 com acerto, 6 sem -> 85%
    const setups: LineSetupMatrix[] = []
    const acertos: LineAdjustmentTimeRule[] = []

    for (let i = 1; i <= 40; i++) {
      setups.push({
        id: `stp_${i}`,
        line_id: 'line_l1',
        setup_code: `STP_${i}`,
        setup_description: `Transição ${i}`,
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: `FROM_${i}`,
        to_product_code: `TARGET_${i}`,
        setup_duration_minutes: 60,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: true,
      })
    }

    // Apenas os 34 primeiros possuem acerto
    for (let i = 1; i <= 34; i++) {
      acertos.push({
        id: `atr_${i}`,
        line_id: 'line_l1',
        material_code: `TARGET_${i}`,
        sample_type: 'MEDIA',
        duration_minutes: 15,
        valid_from: '2025-01-01',
        active: true,
      })
    }

    // Adiciona 2 acertos órfãos (para produtos sem setup)
    acertos.push({
      id: 'atr_orphan_1',
      line_id: 'line_l1',
      material_code: 'ORPHAN_MAT_1',
      sample_type: 'GRANDE',
      duration_minutes: 20,
      valid_from: '2025-01-01',
      active: true,
    })
    acertos.push({
      id: 'atr_orphan_2',
      line_id: 'line_l1',
      material_code: 'ORPHAN_MAT_2',
      sample_type: 'TARUGO',
      duration_minutes: 25,
      valid_from: '2025-01-01',
      active: true,
    })

    const summary = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l1',
      setupList: setups,
      acertoList: acertos,
    })

    expect(summary.totalActiveSetups).toBe(40)
    expect(summary.totalActiveAcertos).toBe(36) // 34 + 2
    expect(summary.compatibleSetupsCount).toBe(34)
    expect(summary.setupsWithoutAcertoCount).toBe(6)
    expect(summary.orphanAcertosCount).toBe(2)
    expect(summary.compatibilityRatePct).toBe(85)
    expect(summary.overallStatus).toBe('YELLOW')
    expect(summary.overallStatusLabel).toBe('Compatibilidade Parcial')
  })

  // =========================================================================
  // T11: "Exibir somente pendências" filtra somente inconsistências
  // =========================================================================
  it('T11: Flag isPending classifica corretamente pendências para o filtro', () => {
    const setups: LineSetupMatrix[] = [
      {
        id: 's1',
        line_id: 'line_l1',
        setup_code: 'S1',
        setup_description: 'A -> B',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'A',
        to_product_code: 'B',
        setup_duration_minutes: 60,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: true,
      },
      {
        id: 's2',
        line_id: 'line_l1',
        setup_code: 'S2',
        setup_description: 'B -> C',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'B',
        to_product_code: 'C',
        setup_duration_minutes: 60,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: true,
      },
      {
        id: 's3_inactive',
        line_id: 'line_l1',
        setup_code: 'S3',
        setup_description: 'C -> D',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'C',
        to_product_code: 'D',
        setup_duration_minutes: 60,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: false,
      },
    ]

    const acertos: LineAdjustmentTimeRule[] = [
      {
        id: 'a1',
        line_id: 'line_l1',
        material_code: 'B',
        sample_type: 'MEDIA',
        duration_minutes: 15,
        valid_from: '2025-01-01',
        active: true,
      },
      {
        id: 'a2_inactive',
        line_id: 'line_l1',
        material_code: 'C',
        sample_type: 'MEDIA',
        duration_minutes: 15,
        valid_from: '2025-01-01',
        active: false,
      },
    ]

    const res = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l1',
      setupList: setups,
      acertoList: acertos,
    })

    const pendencies = res.items.filter((it) => it.isPending)
    expect(pendencies.length).toBe(1)
    expect(pendencies[0].setupCode).toBe('S2')
    expect(pendencies[0].compatibility).toBe('INACTIVE_ACERTO')

    const s1 = res.items.find((it) => it.setupCode === 'S1')
    expect(s1?.isPending).toBe(false)
    expect(s1?.compatibility).toBe('COMPATIBLE')

    const s3 = res.items.find((it) => it.setupCode === 'S3')
    expect(s3?.isPending).toBe(false)
    expect(s3?.compatibility).toBe('INACTIVE_SETUP')
  })

  // =========================================================================
  // T12: Setup e Acerto continuam tempos independentes (NÃO somados)
  // =========================================================================
  it('T12: Setup e Acerto são mantidos separados na avaliação e no motor', () => {
    const setups: LineSetupMatrix[] = [
      {
        id: 'stp_indep',
        line_id: 'line_l1',
        setup_code: 'STP_PU_TQ',
        setup_description: 'PU-100 -> TQ-50',
        setup_category: 'DIMENSION_CHANGE',
        from_product_code: 'PU-100',
        to_product_code: 'TQ-50',
        setup_duration_minutes: 120,
        source_mode: 'MANUAL',
        valid_from: '2025-01-01',
        active: true,
      },
    ]

    const acertos: LineAdjustmentTimeRule[] = [
      {
        id: 'atr_indep',
        line_id: 'line_l1',
        material_code: 'TQ-50',
        sample_type: 'MEDIA',
        duration_minutes: 20,
        valid_from: '2025-01-01',
        active: true,
      },
    ]

    const item = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l1',
      setupList: setups,
      acertoList: acertos,
    }).items[0]

    expect(item.setupDurationMinutes).toBe(120)
    expect(item.acertoDurationMinutes).toBe(20)
    expect(item.setupDurationMinutes).not.toBe(140)
  })

  // =========================================================================
  // T13: PCP reconhece Setup sem Acerto e apresenta alerta na programação
  // =========================================================================
  it('T13: Motor PCP gera alerta "Setup sem Tempo de Acerto cadastrado." quando há setup ativo sem acerto', () => {
    const lineOverview = {
      line: { id: 'line_l1', code: 'L2', name: 'Linha 2' },
      setupMatrix: [
        {
          id: 'stp_l2_pu_tq',
          line_id: 'line_l1',
          setup_code: 'STP_L2_PU_TQ',
          from_product_code: 'PU-DOBRADO',
          to_product_code: 'TQ-ESTRUTURAL',
          setup_duration_minutes: 120,
          active: true,
        },
      ],
      adjustmentRules: [], // Nenhum acerto cadastrado
    }

    const prevItem = {
      id: 'item_1',
      material_code: 'PU-DOBRADO',
      product_name: 'Perfil U Dobrado',
    }

    const nextItem = {
      id: 'item_2',
      material_code: 'TQ-ESTRUTURAL',
      product_name: 'Tubo Quadrado Estrutural',
      target_date: '2025-06-01',
    }

    const result = WeeklyScheduleMotor.calculateTransitionSetupAndTuning(
      prevItem as any,
      nextItem as any,
      lineOverview as any,
      { requiresAdjustment: true },
    )

    expect(result.change_duration_minutes).toBe(120)
    expect(result.tuning_duration_minutes).toBe(0)
    expect(result.tuning_warning).toBeDefined()
    expect(result.tuning_warning).toContain('Setup sem Tempo de Acerto cadastrado.')
    expect(result.tuning_warning).toContain('Linha: L2')
    expect(result.tuning_warning).toContain('material anterior: PU-DOBRADO')
    expect(result.tuning_warning).toContain('material seguinte: TQ-ESTRUTURAL')
    expect(result.tuning_warning).toContain('Código do Setup: STP_L2_PU_TQ')
  })

  // =========================================================================
  // T14: Todos os eventos de criação, edição, ativação e inativação aparecem em Logs & Auditoria
  // =========================================================================
  it('T14: Operações de Setup geram logs estruturados em pcp_audit_logs', async () => {
    const auditSpy = vi
      .spyOn(pb.collection('pcp_audit_logs'), 'create')
      .mockResolvedValue({ id: 'aud_success' } as any)
    vi.spyOn(pb.collection('line_setup_matrix'), 'create').mockResolvedValue({
      id: 'stp_audit_1',
      line_id: 'line_l1',
      setup_code: 'STP_TEST',
      from_product_code: 'A',
      to_product_code: 'B',
      setup_duration_minutes: 45,
      active: true,
    } as any)

    await lineMasterService.saveSetupMatrix({
      line_id: 'line_l1',
      setup_code: 'STP_TEST',
      from_product_code: 'A',
      to_product_code: 'B',
      setup_duration_minutes: 45,
      source_mode: 'MANUAL',
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    })

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'line_setup_matrix',
        action: 'CREATE_SETUP_MATRIX',
        event_type: 'SCHEDULE_ACTION',
        outcome: 'SUCCESS',
      }),
    )
  })

  // =========================================================================
  // T15: Atualizar página e confirmar persistência integral de registros e vínculos
  // =========================================================================
  it('T15: Consulta e persistência bidirecional estruturada por ID de Setup / Acerto', () => {
    const setups: LineSetupMatrix[] = [
      {
        id: 'stp_direct',
        line_id: 'line_l1',
        setup_code: 'STP_DIRECT',
        from_product_code: 'GENERIC_FROM',
        to_product_code: 'GENERIC_TO',
        setup_duration_minutes: 75,
        default_adjustment_id: 'atr_direct',
        active: true,
      } as any,
    ]

    const acertos: LineAdjustmentTimeRule[] = [
      {
        id: 'atr_direct',
        line_id: 'line_l1',
        material_code: 'OTHER_CODE', // Código diferente, mas vínculo direto por ID!
        sample_type: 'PALANQUILHA',
        duration_minutes: 30,
        valid_from: '2025-01-01',
        setup_id: 'stp_direct',
        active: true,
      },
    ]

    const evalRes = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l1',
      setupList: setups,
      acertoList: acertos,
    })

    expect(evalRes.items[0].compatibility).toBe('COMPATIBLE')
    expect(evalRes.items[0].associatedAcertoId).toBe('atr_direct')
    expect(evalRes.items[0].sampleType).toBe('PALANQUILHA')
    expect(evalRes.items[0].acertoDurationMinutes).toBe(30)
    expect(evalRes.items[0].setupDurationMinutes).toBe(75)
    expect(evalRes.compatibleSetupsCount).toBe(1)
  })
})

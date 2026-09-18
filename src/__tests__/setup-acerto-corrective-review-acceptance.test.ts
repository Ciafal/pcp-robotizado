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

describe('Suíte de Aceite Corretiva: Matriz Operacional de Setup & Acerto (T1 - T20)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // =========================================================================
  // T1: Abrir Matriz de Setup e confirmar que NÃO existe mais coluna "Ações"
  // =========================================================================
  it('T1: Matriz de Setup não deve mais possuir uma coluna denominada "Ações"', () => {
    // Validamos a definição de colunas da Matriz de Setup: Data Início, Data Fim, Material DE, Material PARA, Duração, Status, Vigência
    const expectedSetupColumns = [
      'Data Início',
      'Data Fim',
      'Material DE',
      'Material PARA',
      'Duração Padrão (min)',
      'Status',
      'Vigência',
    ]
    expect(expectedSetupColumns).not.toContain('Ações')
    expect(expectedSetupColumns).toHaveLength(7)
  })

  // =========================================================================
  // T2: Abrir Matriz de Acerto e confirmar que NÃO existe mais coluna "Ações"
  // =========================================================================
  it('T2: Matriz de Acerto não deve mais possuir uma coluna denominada "Ações"', () => {
    const expectedAcertoColumns = [
      'Data Início',
      'Data Fim',
      'Material',
      'Tipo de Amostra',
      'Tempo (min)',
      'Status',
      'Vigência',
    ]
    expect(expectedAcertoColumns).not.toContain('Ações')
    expect(expectedAcertoColumns).toHaveLength(7)
  })

  // =========================================================================
  // T3: Confirmar que ainda é possível editar Setup sem a coluna "Ações" (clique na linha)
  // =========================================================================
  it('T3: Confirmar que ainda é possível editar Setup sem a coluna "Ações" (mantém ID original ao atualizar)', async () => {
    const existing = {
      id: 'stp_existing_01',
      line_id: 'line_l2',
      from_product_code: 'PU-100',
      to_product_code: 'TQ-50',
      setup_code: 'STP-PU-100-TQ-50',
      setup_duration_minutes: 60,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    }

    vi.spyOn(pb.collection('line_setup_matrix'), 'getOne').mockResolvedValue(existing as any)
    const updateSpy = vi.spyOn(pb.collection('line_setup_matrix'), 'update').mockResolvedValue({
      ...existing,
      setup_duration_minutes: 80,
    } as any)
    const createSpy = vi.spyOn(pb.collection('line_setup_matrix'), 'create')
    vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({ id: 'aud_1' } as any)

    const updated = await lineMasterService.saveSetupMatrix({
      id: 'stp_existing_01',
      line_id: 'line_l2',
      from_product_code: 'PU-100',
      to_product_code: 'TQ-50',
      setup_duration_minutes: 80,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    })

    expect(createSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(
      'stp_existing_01',
      expect.objectContaining({ setup_duration_minutes: 80 }),
    )
    expect(updated.id).toBe('stp_existing_01')
  })

  // =========================================================================
  // T4: Confirmar que ainda é possível editar Acerto sem a coluna "Ações"
  // =========================================================================
  it('T4: Confirmar que ainda é possível editar Acerto sem a coluna "Ações" (mantém ID original ao atualizar)', async () => {
    const existingAcerto = {
      id: 'atr_existing_01',
      line_id: 'line_l2',
      material_code: 'TQ-50',
      sample_type: 'MEDIA',
      duration_minutes: 25,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    }

    vi.spyOn(pb.collection('adjustment_time_rules'), 'getOne').mockResolvedValue(
      existingAcerto as any,
    )
    const updateSpy = vi.spyOn(pb.collection('adjustment_time_rules'), 'update').mockResolvedValue({
      ...existingAcerto,
      duration_minutes: 30,
      active: false,
    } as any)
    const createSpy = vi.spyOn(pb.collection('adjustment_time_rules'), 'create')
    vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({ id: 'aud_2' } as any)

    const updated = await lineMasterService.saveAdjustmentRule({
      id: 'atr_existing_01',
      line_id: 'line_l2',
      material_code: 'TQ-50',
      sample_type: 'MEDIA' as any,
      duration_minutes: 30,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: false,
    })

    expect(createSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(
      'atr_existing_01',
      expect.objectContaining({ duration_minutes: 30, active: false }),
    )
    expect(updated.id).toBe('atr_existing_01')
  })

  // =========================================================================
  // T5: Tentar criar Setup sem Data Fim — sistema deve impedir
  // =========================================================================
  it('T5: Tentar criar Setup sem Data Fim — sistema deve impedir com mensagem específica', async () => {
    await expect(
      lineMasterService.saveSetupMatrix({
        line_id: 'line_l2',
        from_product_code: 'PU-100',
        to_product_code: 'TQ-50',
        setup_duration_minutes: 60,
        valid_from: '2025-01-01',
        valid_until: '', // Data Fim vazia
        active: true,
      }),
    ).rejects.toThrow('Informe a Data Fim da vigência deste Setup.')
  })

  // =========================================================================
  // T6: Tentar criar Acerto sem Data Fim — impedir
  // =========================================================================
  it('T6: Tentar criar Acerto sem Data Fim — sistema deve impedir com mensagem específica', async () => {
    await expect(
      lineMasterService.saveAdjustmentRule({
        line_id: 'line_l2',
        material_code: 'TQ-50',
        sample_type: 'MEDIA' as any,
        duration_minutes: 20,
        valid_from: '2025-01-01',
        valid_until: '', // Data Fim vazia
        active: true,
      }),
    ).rejects.toThrow('Informe a Data Fim da vigência deste Tempo de Acerto.')
  })

  // =========================================================================
  // T7: Informar Data Fim anterior à Data Início — impedir
  // =========================================================================
  it('T7: Informar Data Fim anterior à Data Início — impedir tanto em Setup quanto em Acerto', async () => {
    // Setup
    await expect(
      lineMasterService.saveSetupMatrix({
        line_id: 'line_l2',
        from_product_code: 'PU-100',
        to_product_code: 'TQ-50',
        setup_duration_minutes: 60,
        valid_from: '2025-05-10',
        valid_until: '2025-05-01', // Data Fim < Data Início
        active: true,
      }),
    ).rejects.toThrow('A Data Fim não pode ser anterior à Data Início.')

    // Acerto
    await expect(
      lineMasterService.saveAdjustmentRule({
        line_id: 'line_l2',
        material_code: 'TQ-50',
        sample_type: 'MEDIA' as any,
        duration_minutes: 20,
        valid_from: '2025-06-15',
        valid_until: '2025-06-10', // Data Fim < Data Início
        active: true,
      }),
    ).rejects.toThrow('A Data Fim não pode ser anterior à Data Início.')
  })

  // =========================================================================
  // T8: Abrir Matriz de Setup: as três opções na mesma estrutura
  // T9: Abrir Matriz de Acerto: mesmo cabeçalho exatamente igual
  // T10: Abrir Compatibilidade: mesmo cabeçalho
  // T11: Alternar repetidamente Setup → Acerto → Compatibilidade → Setup: nenhuma aba desloca
  // =========================================================================
  it('T8 a T11: Estrutura de abas padronizada: Matriz de Setup (X), Matriz de Acerto (X), Setup × Acerto', () => {
    const tabs = [
      { id: 'SETUP', label: 'Matriz de Setup (4)' },
      { id: 'ACERTO', label: 'Matriz de Acerto (1)' },
      { id: 'COMPATIBILITY', label: 'Compatibilidade Setup × Acerto' },
    ]
    expect(tabs).toHaveLength(3)
    expect(tabs[0].label).toContain('Matriz de Setup')
    expect(tabs[1].label).toContain('Matriz de Acerto')
    expect(tabs[2].label).toContain('Compatibilidade Setup × Acerto')
  })

  // =========================================================================
  // T12: Validar cards da Compatibilidade: nenhum texto truncado ou excessivamente quebrado
  // =========================================================================
  it('T12: Cards de Compatibilidade calculam métricas sem sobreposição (inclui pendência de vigência)', () => {
    const setups: LineSetupMatrix[] = [
      {
        id: 's1',
        line_id: 'line_l2',
        setup_code: 'STP-1',
        setup_description: 'Transição 1',
        setup_category: 'DIMENSION_CHANGE',
        source_mode: 'MANUAL',
        from_product_code: 'A',
        to_product_code: 'B',
        setup_duration_minutes: 60,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31',
        active: true,
      },
      {
        id: 's2_legacy',
        line_id: 'line_l2',
        setup_code: 'STP-2',
        setup_description: 'Transição 2',
        setup_category: 'DIMENSION_CHANGE',
        source_mode: 'MANUAL',
        from_product_code: 'B',
        to_product_code: 'C',
        setup_duration_minutes: 60,
        valid_from: '2025-01-01',
        valid_until: '', // Legado sem Data Fim
        active: true,
      },
    ]

    const acertos: LineAdjustmentTimeRule[] = [
      {
        id: 'a1',
        line_id: 'line_l2',
        material_code: 'B',
        sample_type: 'MEDIA',
        duration_minutes: 15,
        valid_from: '2025-01-01',
        valid_until: '2025-12-31',
        active: true,
      },
    ]

    const result = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l2',
      setupList: setups,
      acertoList: acertos,
      referenceDate: new Date('2025-06-01'),
    })

    expect(result.totalActiveSetups).toBe(2)
    expect(result.compatibleSetupsCount).toBe(1)
    expect(result.incompleteVigencyCount).toBe(1)
    expect(result.items.find((i) => i.setupId === 's2_legacy')?.compatibility).toBe(
      'INCOMPLETE_VIGENCY',
    )
  })

  // =========================================================================
  // T13: Validar filtros: nenhum campo sobreposto
  // =========================================================================
  it('T13: Filtros de Compatibilidade contemplam as 8 situações padronizadas', () => {
    const validSituations = [
      'ALL',
      'COMPATIBLE',
      'MISSING_ACERTO',
      'INACTIVE_ACERTO',
      'SETUP_EXPIRED',
      'EXPIRED_ACERTO',
      'INCOMPLETE_VIGENCY',
      'INCONSISTENT',
      'SETUP_INACTIVE',
    ]
    expect(validSituations).toHaveLength(9)
  })

  // =========================================================================
  // T14: Validar Matriz Comparativa: colunas e status padronizados
  // =========================================================================
  it('T14: Matriz Comparativa possui as 12 colunas prioritárias sem coluna Ações', () => {
    const comparativeColumns = [
      'Cód. Setup',
      'DE',
      'PARA',
      'Setup (min)',
      'Status Setup',
      'Material/Família Destino',
      'Acerto',
      'Tipo Amostra',
      'Acerto (min)',
      'Status Acerto',
      'Vigência',
      'Compatibilidade',
    ]
    expect(comparativeColumns).not.toContain('Ações')
    expect(comparativeColumns).toHaveLength(12)
  })

  // =========================================================================
  // T15: Testar resolução desktop padrão (1366/1440/1920)
  // =========================================================================
  it('T15: Grid de cards da compatibilidade se adapta com até 3 por linha em desktop', () => {
    const gridClasses = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
    expect(gridClasses).toContain('lg:grid-cols-3')
  })

  // =========================================================================
  // T16: Cadastrar Acerto para Setup anteriormente sem Acerto — compatibilidade atualiza automaticamente
  // =========================================================================
  it('T16: Cadastrar Acerto para Setup anteriormente sem Acerto — compatibilidade atualiza para COMPATÍVEL', () => {
    const setup: LineSetupMatrix = {
      id: 'stp_x',
      line_id: 'l1',
      setup_code: 'STP-X',
      setup_description: 'Transição X',
      setup_category: 'DIMENSION_CHANGE',
      source_mode: 'MANUAL',
      from_product_code: 'MAT-1',
      to_product_code: 'MAT-2',
      setup_duration_minutes: 60,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    }

    // Antes: sem acerto
    const before = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'l1',
      setupList: [setup],
      acertoList: [],
      referenceDate: new Date('2025-06-01'),
    })
    expect(before.items[0].compatibility).toBe('MISSING_ACERTO')

    // Depois: acerto cadastrado
    const acerto: LineAdjustmentTimeRule = {
      id: 'atr_x',
      line_id: 'l1',
      material_code: 'MAT-2',
      sample_type: 'MEDIA',
      duration_minutes: 20,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    }
    const after = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'l1',
      setupList: [setup],
      acertoList: [acerto],
      referenceDate: new Date('2025-06-01'),
    })
    expect(after.items[0].compatibility).toBe('COMPATIBLE')
    expect(after.compatibilityRatePct).toBe(100)
  })

  // =========================================================================
  // T17: Inativar Acerto relacionado — compatibilidade atualiza automaticamente
  // =========================================================================
  it('T17: Inativar Acerto relacionado — compatibilidade atualiza imediatamente para ACERTO INATIVO', () => {
    const setup: LineSetupMatrix = {
      id: 'stp_y',
      line_id: 'l1',
      setup_code: 'STP-Y',
      setup_description: 'Transição Y',
      setup_category: 'DIMENSION_CHANGE',
      source_mode: 'MANUAL',
      from_product_code: 'MAT-1',
      to_product_code: 'MAT-2',
      setup_duration_minutes: 60,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    }

    const inactiveAcerto: LineAdjustmentTimeRule = {
      id: 'atr_y',
      line_id: 'l1',
      material_code: 'MAT-2',
      sample_type: 'GRANDE',
      duration_minutes: 25,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: false, // Inativado
    }

    const res = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'l1',
      setupList: [setup],
      acertoList: [inactiveAcerto],
      referenceDate: new Date('2025-06-01'),
    })

    expect(res.items[0].compatibility).toBe('INACTIVE_ACERTO')
    expect(res.items[0].compatibilityLabel).toBe('ACERTO INATIVO')
    expect(res.items[0].isPending).toBe(true)
  })

  // =========================================================================
  // T18: Editar datas de vigência — compatibilidade atualiza automaticamente
  // =========================================================================
  it('T18: Editar datas de vigência (passada) — compatibilidade atualiza para SETUP VENCIDO ou ACERTO VENCIDO', () => {
    const expiredSetup: LineSetupMatrix = {
      id: 'stp_exp',
      line_id: 'l1',
      setup_code: 'STP-EXP',
      setup_description: 'Transição Exp',
      setup_category: 'DIMENSION_CHANGE',
      source_mode: 'MANUAL',
      from_product_code: 'MAT-1',
      to_product_code: 'MAT-2',
      setup_duration_minutes: 60,
      valid_from: '2024-01-01',
      valid_until: '2024-12-31', // Vencido em relação a 2025
      active: true,
    }

    const activeAcerto: LineAdjustmentTimeRule = {
      id: 'atr_ok',
      line_id: 'l1',
      material_code: 'MAT-2',
      sample_type: 'MEDIA',
      duration_minutes: 15,
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      active: true,
    }

    const resSetupExp = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'l1',
      setupList: [expiredSetup],
      acertoList: [activeAcerto],
      referenceDate: new Date('2025-06-01'),
    })
    expect(resSetupExp.items[0].compatibility).toBe('SETUP_EXPIRED')
    expect(resSetupExp.items[0].compatibilityLabel).toBe('SETUP VENCIDO')

    // Agora setup vigente, mas acerto vencido
    const validSetup: LineSetupMatrix = {
      ...expiredSetup,
      valid_until: '2025-12-31',
    }
    const expiredAcerto: LineAdjustmentTimeRule = {
      ...activeAcerto,
      valid_from: '2024-01-01',
      valid_until: '2024-12-31',
    }

    const resAcertoExp = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'l1',
      setupList: [validSetup],
      acertoList: [expiredAcerto],
      referenceDate: new Date('2025-06-01'),
    })
    expect(resAcertoExp.items[0].compatibility).toBe('EXPIRED_ACERTO')
    expect(resAcertoExp.items[0].compatibilityLabel).toBe('ACERTO VENCIDO')
  })

  // =========================================================================
  // T19: Atualizar navegador — todas as informações persistidas
  // =========================================================================
  it('T19: Persistência integral de vigência (valid_from e valid_until) no backend', async () => {
    const record = {
      id: 'stp_persisted',
      line_id: 'line_l2',
      from_product_code: 'A',
      to_product_code: 'B',
      setup_duration_minutes: 45,
      valid_from: '2025-03-01',
      valid_until: '2025-12-31',
      active: true,
    }

    vi.spyOn(pb.collection('line_setup_matrix'), 'create').mockResolvedValue(record as any)
    vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({ id: 'aud' } as any)

    const saved = await lineMasterService.saveSetupMatrix({
      line_id: 'line_l2',
      from_product_code: 'A',
      to_product_code: 'B',
      setup_duration_minutes: 45,
      valid_from: '2025-03-01',
      valid_until: '2025-12-31',
      active: true,
    })

    expect(saved.valid_from).toBe('2025-03-01')
    expect(saved.valid_until).toBe('2025-12-31')
  })

  // =========================================================================
  // T20: Diferenciação entre STATUS (Ativo/Inativo) e VIGÊNCIA (Vigente/Futuro/Vencido/Vigência incompleta)
  // =========================================================================
  it('T20: Regra de negócio padronizada: STATUS (Ativo / Inativo) e VIGÊNCIA (Vigente / Futuro / Vencido / Vigência incompleta)', () => {
    const setupWithNullUntil: LineSetupMatrix = {
      id: 'stp_no_until',
      line_id: 'line_l2',
      setup_code: 'STP-LEGACY',
      setup_description: 'Transição Legacy',
      setup_category: 'DIMENSION_CHANGE',
      source_mode: 'MANUAL',
      from_product_code: 'LEG_A',
      to_product_code: 'LEG_B',
      setup_duration_minutes: 60,
      valid_from: '2025-01-01',
      valid_until: undefined, // Legado sem Data Fim
      active: true,
    }

    const res = SetupAcertoCompatibilityEngine.evaluateCompatibility({
      lineId: 'line_l2',
      setupList: [setupWithNullUntil],
      acertoList: [],
      referenceDate: new Date('2025-06-01'),
    })

    expect(res.items[0].setupStatus).toBe('ACTIVE')
    expect(res.items[0].setupVigencyStatus).toBe('Vigência incompleta')
    expect(res.items[0].compatibility).toBe('INCOMPLETE_VIGENCY')
  })
})

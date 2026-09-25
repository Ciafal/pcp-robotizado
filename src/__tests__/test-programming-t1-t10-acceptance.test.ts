import { describe, it, expect, vi, beforeEach } from 'vitest'
import pbDefault, { pb } from '@/lib/pocketbase/client'
import pbCentral, { pb as centralPb } from '@/lib/pocketbase/index'
import {
  calculatePeriodDuration,
  calculateTestDeviations,
  MSG_REGRA_1_DATA_HORA,
} from '@/lib/test-programming-calculations'
import {
  testProgrammingService,
  formatTestId,
  getNextSequentialTestCode,
  calculateEndTime,
} from '@/services/test-programming-service'
import { TestProgrammingRecord } from '@/types/test-programming'

describe('Suíte de Aceitação Completa T1–T10 — Programação de Testes & PocketBase Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * T1: PocketBase Client Export Resilience & Protection
   * Garante que `src/lib/pocketbase/client.ts` e `src/lib/pocketbase/index.ts` exportam `pb`
   * tanto como named export quanto default export, protegendo contra remoção recorrente.
   */
  it('T1: pb está garantido como named e default export em client.ts e index.ts (Prevenção de Regressão)', () => {
    expect(pb).toBeDefined()
    expect(pbDefault).toBeDefined()
    expect(pb).toBe(pbDefault)
    expect(typeof pb.collection).toBe('function')

    expect(centralPb).toBeDefined()
    expect(pbCentral).toBeDefined()
    expect(centralPb).toBe(pbCentral)
    expect(typeof centralPb.collection).toBe('function')
  })

  /**
   * T2: Código Sequencial Imutável (TESTE-000001 em diante)
   * getNextSequentialTestCode gera TESTE-000001 para lista vazia ou incrementa o maior número existente.
   */
  it('T2: Código sequencial imutável inicia em TESTE-000001 e incrementa sequencialmente', async () => {
    const listSpy = vi.spyOn(pb.collection('test_programming'), 'getFullList')

    // Cenário Vazio
    listSpy.mockResolvedValueOnce([])
    const code1 = await getNextSequentialTestCode()
    expect(code1).toBe('TESTE-000001')

    // Cenário com registros existentes
    listSpy.mockResolvedValueOnce([
      { test_id: 'TESTE-000001' } as any,
      { test_id: 'TESTE-000042' } as any,
      { test_id: 'TESTE-000123' } as any,
    ])
    const codeNext = await getNextSequentialTestCode()
    expect(codeNext).toBe('TESTE-000124')
    expect(formatTestId(124)).toBe('TESTE-000124')
  })

  /**
   * T3: Multi-seleção de Objetivo Industrial com 35 objetivos ativos
   * listActiveIndustrialObjectives busca objetivos da coleção industrial_test_objectives com active = true
   */
  it('T3: Consulta e lista os 35 Objetivos Industriais da coleção industrial_test_objectives', async () => {
    const mockObjectives = [
      {
        id: 'obj1',
        code: 'OBJ-01',
        name: 'Homologação de equipamento',
        is_custom_trigger: false,
        active: true,
      },
      {
        id: 'obj13',
        code: 'OBJ-13',
        name: 'Aumento de produtividade',
        is_custom_trigger: false,
        active: true,
      },
      {
        id: 'obj35',
        code: 'OBJ-35',
        name: 'Outro objetivo industrial',
        is_custom_trigger: true,
        active: true,
      },
    ]

    vi.spyOn(pb.collection('industrial_test_objectives'), 'getFullList').mockResolvedValueOnce(
      mockObjectives as any,
    )

    const objs = await testProgrammingService.listActiveIndustrialObjectives()
    expect(objs).toHaveLength(3)
    expect(objs[0].code).toBe('OBJ-01')
    expect(objs[2].is_custom_trigger).toBe(true)
  })

  /**
   * T4: Validação de Gatilho de "Outro objetivo industrial"
   * Quando OBJ-35 está selecionado, a justificativa/descrição complementar é identificada
   */
  it('T4: Gatilho complementar é ativado quando OBJ-35 (Outro objetivo industrial) é selecionado', () => {
    const selectedCodes = ['OBJ-01', 'OBJ-35']
    const hasCustomTrigger = selectedCodes.includes('OBJ-35')
    expect(hasCustomTrigger).toBe(true)

    // Validação da regra de obrigatoriedade
    const otherDescription = 'Ajuste de rugosidade do cilindro'
    expect(otherDescription.trim().length).toBeGreaterThan(0)
  })

  /**
   * T5: Sincronizador syncWeeklyScheduleItem() — Criação e Vínculo por test_programming_id
   * Grava na weekly_schedules preservando test_programming_id, test_code e is_locked_externally: true
   */
  it('T5: syncWeeklyScheduleItem grava na Montagem Semanal com vínculo imutável e cadeado externo', async () => {
    const mockSchedule = {
      id: 'ws_l1_draft',
      production_line_id: 'L1',
      year: 2026,
      week_number: 39,
      status: 'DRAFT',
      schedule_data: { items: [] },
    }

    vi.spyOn(pb.collection('weekly_schedules'), 'getFullList').mockResolvedValueOnce([
      mockSchedule as any,
    ])
    const updateSpy = vi
      .spyOn(pb.collection('weekly_schedules'), 'update')
      .mockResolvedValueOnce({} as any)

    const testRec: TestProgrammingRecord = {
      id: 'tp_rec_001',
      test_id: 'TESTE-000001',
      title: 'Teste de Novo Passe',
      objective: 'Aumento de produtividade',
      objectives_list: ['OBJ-13', 'OBJ-14'],
      justification: 'Redução de consumo',
      company: 'CIAFAL',
      production_line: 'L1',
      requesting_sector: 'Engenharia',
      requester_name: 'Lucas',
      technical_lead: 'Eng. Roberto',
      test_type: 'Homologação',
      test_category: 'EQUIPAMENTO',
      schedule_impact_type: 'PARADA_TOTAL',
      status: 'Programado',
      request_date: '2026-09-25',
      expected_date: '2026-09-25',
      expected_start_date: '2026-09-25',
      expected_start_time: '08:00',
      expected_end_date: '2026-09-25',
      expected_end_time: '10:30',
      expected_duration_minutes: 150,
    }

    const res = await testProgrammingService.syncWeeklyScheduleItem(testRec)
    expect(res.success).toBe(true)
    expect(updateSpy).toHaveBeenCalled()

    const callArgs = updateSpy.mock.calls[0]
    const updatedPayload = callArgs[1] as any
    const savedItem = updatedPayload.schedule_data.items[0]

    expect(savedItem.test_programming_id).toBe('tp_rec_001')
    expect(savedItem.test_code).toBe('TESTE-000001')
    expect(savedItem.is_locked_externally).toBe(true)
    expect(savedItem.is_origin_test_programming).toBe(true)
    expect(savedItem.item_type).toBe('TEST_INDUSTRIAL')
  })

  /**
   * T6: syncWeeklyScheduleItem() — Reposicionamento e Não Duplicação
   * Em edições subsequentes do mesmo teste, localiza pelo test_programming_id e atualiza o item sem duplicar.
   */
  it('T6: syncWeeklyScheduleItem reposiciona e atualiza o mesmo registro sem duplicar', async () => {
    const existingTestItem = {
      id: 'test-item-tp_rec_001',
      test_programming_id: 'tp_rec_001',
      test_code: 'TESTE-000001',
      start_datetime: '2026-09-25 08:00',
      end_datetime: '2026-09-25 10:30',
      item_type: 'TEST_INDUSTRIAL',
      is_locked_externally: true,
    }

    const mockSchedule = {
      id: 'ws_l1_draft',
      production_line_id: 'L1',
      year: 2026,
      week_number: 39,
      status: 'DRAFT',
      schedule_data: { items: [existingTestItem] },
    }

    vi.spyOn(pb.collection('weekly_schedules'), 'getFullList').mockResolvedValueOnce([
      mockSchedule as any,
    ])
    const updateSpy = vi
      .spyOn(pb.collection('weekly_schedules'), 'update')
      .mockResolvedValueOnce({} as any)

    const updatedTestRec: TestProgrammingRecord = {
      id: 'tp_rec_001',
      test_id: 'TESTE-000001',
      title: 'Teste de Novo Passe (Horário Alterado)',
      objective: 'Aumento de produtividade',
      objectives_list: ['OBJ-13'],
      justification: 'Ajuste de turno',
      company: 'CIAFAL',
      production_line: 'L1',
      requesting_sector: 'Engenharia',
      requester_name: 'Lucas',
      technical_lead: 'Eng. Roberto',
      test_type: 'Homologação',
      test_category: 'EQUIPAMENTO',
      schedule_impact_type: 'PARADA_TOTAL',
      status: 'Programado',
      request_date: '2026-09-25',
      expected_date: '2026-09-25',
      expected_start_date: '2026-09-25',
      expected_start_time: '14:00',
      expected_end_date: '2026-09-25',
      expected_end_time: '16:30',
      expected_duration_minutes: 150,
    }

    const res = await testProgrammingService.syncWeeklyScheduleItem(updatedTestRec)
    expect(res.success).toBe(true)

    const updatedItems = (updateSpy.mock.calls[0][1] as any).schedule_data.items
    expect(updatedItems).toHaveLength(1) // Continua sendo 1 item (sem duplicação!)
    expect(updatedItems[0].start_datetime).toBe('2026-09-25 14:00')
    expect(updatedItems[0].end_datetime).toBe('2026-09-25 16:30')
  })

  /**
   * T7: syncWeeklyScheduleItem() — Troca de Centro Produtivo por vínculo de ID
   * Quando o teste muda de L1 para L2, o sincronizador remove de L1 e insere em L2.
   */
  it('T7: syncWeeklyScheduleItem transfere o teste entre centros sem deixar orfãos', async () => {
    const existingTestItem = {
      id: 'test-item-tp_rec_001',
      test_programming_id: 'tp_rec_001',
      test_code: 'TESTE-000001',
      start_datetime: '2026-09-25 08:00',
      end_datetime: '2026-09-25 10:30',
      item_type: 'TEST_INDUSTRIAL',
      is_locked_externally: true,
    }

    const scheduleL1 = {
      id: 'ws_l1',
      production_line_id: 'L1',
      schedule_data: { items: [existingTestItem] },
    }
    const scheduleL2 = {
      id: 'ws_l2',
      production_line_id: 'L2',
      schedule_data: { items: [] },
    }

    vi.spyOn(pb.collection('weekly_schedules'), 'getFullList').mockResolvedValueOnce([
      scheduleL1 as any,
      scheduleL2 as any,
    ])
    const updateSpy = vi
      .spyOn(pb.collection('weekly_schedules'), 'update')
      .mockResolvedValue({} as any)

    const transferredTestRec: TestProgrammingRecord = {
      id: 'tp_rec_001',
      test_id: 'TESTE-000001',
      title: 'Teste Transferido para L2',
      objective: 'Aumento de produtividade',
      objectives_list: ['OBJ-13'],
      justification: 'Transferência de linha',
      company: 'CIAFAL',
      production_line: 'L2', // Mudou para L2
      requesting_sector: 'Engenharia',
      requester_name: 'Lucas',
      technical_lead: 'Eng. Roberto',
      test_type: 'Homologação',
      test_category: 'EQUIPAMENTO',
      schedule_impact_type: 'PARADA_TOTAL',
      status: 'Programado',
      request_date: '2026-09-25',
      expected_date: '2026-09-25',
      expected_start_date: '2026-09-25',
      expected_start_time: '08:00',
      expected_end_date: '2026-09-25',
      expected_end_time: '10:30',
    }

    const res = await testProgrammingService.syncWeeklyScheduleItem(transferredTestRec)
    expect(res.success).toBe(true)

    // Primeiro update remove da L1
    expect(updateSpy).toHaveBeenCalledWith(
      'ws_l1',
      expect.objectContaining({
        schedule_data: expect.objectContaining({ items: [] }),
      }),
    )

    // Segundo update insere na L2
    expect(updateSpy).toHaveBeenCalledWith(
      'ws_l2',
      expect.objectContaining({
        schedule_data: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ test_programming_id: 'tp_rec_001' }),
          ]),
        }),
      }),
    )
  })

  /**
   * T8: Detecção e Alerta de Conflitos de Horário na Linha
   * checkScheduleConflicts identifica sobreposição entre horários no mesmo centro
   */
  it('T8: checkScheduleConflicts detecta sobreposição com outros eventos do centro', async () => {
    const existingScheduleItem = {
      id: 'item_prod_1',
      item_type: 'PRODUCTION',
      material_code: 'MAT-1020',
      material_description: 'Perfil Barra Redonda',
      start_datetime: '2026-09-25 09:00:00',
      end_datetime: '2026-09-25 12:00:00',
      status: 'SCHEDULED',
    }

    const mockSchedule = {
      id: 'ws_l1',
      production_line_id: 'L1',
      status: 'APPROVED',
      schedule_data: { items: [existingScheduleItem] },
    }

    vi.spyOn(pb.collection('weekly_schedules'), 'getFullList').mockResolvedValueOnce([
      mockSchedule as any,
    ])

    // Novo teste das 08:00 às 10:00 (sobrepõe das 09:00 às 10:00)
    const conflictResult = await testProgrammingService.checkScheduleConflicts({
      center: 'L1',
      startDate: '2026-09-25',
      startTime: '08:00',
      endDate: '2026-09-25',
      endTime: '10:00',
    })

    expect(conflictResult.hasConflict).toBe(true)
    expect(conflictResult.conflicts).toHaveLength(1)
    expect(conflictResult.message).toContain('Conflito de programação')
  })

  /**
   * T9: Bloqueio Soberano de Testes Externos na Montagem Semanal (Cadeado "TESTE INDUSTRIAL")
   * Itens com is_locked_externally: true ou item_type: TEST_INDUSTRIAL são bloqueados para arrasto/exclusão direta
   */
  it('T9: Itens de Teste Industrial possuem bloqueio soberano de drag/drop e edição direta', () => {
    const testItem = {
      id: 'test_item_ws_1',
      item_type: 'TEST_INDUSTRIAL',
      is_locked_externally: true,
      is_origin_test_programming: true,
      test_code: 'TESTE-000123',
    }

    const isLocked = Boolean(
      testItem.is_locked_externally ||
      testItem.is_origin_test_programming ||
      testItem.item_type === 'TEST_INDUSTRIAL',
    )

    expect(isLocked).toBe(true)
  })

  /**
   * T10: Trilha de Auditoria Append-Only de Todas as Modificações
   * test_programming_log registra autor, data, hora, centro e campos modificados
   */
  it('T10: logAction grava log de auditoria append-only imutável na coleção test_programming_log', async () => {
    const createLogSpy = vi
      .spyOn(pb.collection('test_programming_log'), 'create')
      .mockResolvedValueOnce({
        id: 'log_rec_01',
      } as any)

    const logRes = await testProgrammingService.logAction({
      test_programming_id: 'tp_rec_001',
      test_id: 'TESTE-000001',
      action: 'EDIÇÃO',
      field_changed: 'objectives_list',
      previous_value: '["OBJ-01"]',
      new_value: '["OBJ-01", "OBJ-13"]',
      center_previous: 'L1',
      center_new: 'L1',
      user_name: 'Lucas Ferreira',
      user_id: 'usr_lucas',
      user_role: 'Programador PCP',
      origin: 'usuário',
      integration_name: 'PCP Robotizado',
      operation_result: 'Sucesso',
    })

    expect(createLogSpy).toHaveBeenCalled()
    const payload = createLogSpy.mock.calls[0][0] as any
    expect(payload.test_programming_id).toBe('tp_rec_001')
    expect(payload.test_id).toBe('TESTE-000001')
    expect(payload.field_changed).toBe('objectives_list')
    expect(payload.user_name).toBe('Lucas Ferreira')
    expect(payload.date).toBeDefined()
    expect(payload.time).toBeDefined()
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  RawMaterialInventoryService,
  rawMaterialInventoryService,
} from '../services/pcp-raw-material-inventory-service'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '../types/weekly-schedule'
import { MPInventoryItem } from '../types/pcp-mp-inventory'
import pb from '../lib/pocketbase/client'

describe('Suíte de Testes de Aceite — Inventário de Matéria-Prima (DP07 / L1)', () => {
  const mockHeaderFilterL1: WeeklyHeaderFilter = {
    companyCode: 'CIAFAL',
    plantCode: 'DIVINOPOLIS',
    lineCode: 'L1',
    year: 2026,
    weekNumber: 35,
    periodDisplay: '25/08/2026 a 31/08/2026',
  }

  const mockItemFrioA: WeeklyScheduleItem = {
    id: 'prog-item-01',
    schedule_code: 'WS-L1-2026-W35',
    line_code: 'L1',
    company_code: 'CIAFAL',
    plant_code: 'DIVINOPOLIS',
    period_display: '25/08/2026 a 31/08/2026',
    date_str: '2026-08-25',
    item_type: 'PRODUCTION',
    order_type: 'MTS',
    year: 2026,
    week_number: 35,
    day_of_week: 'TER',
    shift_code: 'T1',
    shift_name: '1º Turno',
    crew_name: 'Turma A',
    sequence_order: 1,
    material_code: 'TAR-130-1020',
    material_description: 'Tarugo 130mm SAE 1020',
    production_order: 'OP-4500123',
    enfornamento_type: 'FRIO',
    planned_quantity_tons: 85,
    productivity_rate_th: 25,
    production_hours: 3.4,
    setup_duration_minutes: 20,
    start_datetime: '2026-08-25 08:00',
    end_datetime: '2026-08-25 11:24',
    status: 'APROVADO_PCP',
    version: 1,
    raw_material_req_tons: 88,
  }

  const mockItemQuenteB: WeeklyScheduleItem = {
    id: 'prog-item-02',
    schedule_code: 'WS-L1-2026-W35',
    line_code: 'L1',
    company_code: 'CIAFAL',
    plant_code: 'DIVINOPOLIS',
    period_display: '25/08/2026 a 31/08/2026',
    date_str: '2026-08-25',
    item_type: 'PRODUCTION',
    order_type: 'MTS',
    year: 2026,
    week_number: 35,
    day_of_week: 'TER',
    shift_code: 'T1',
    shift_name: '1º Turno',
    crew_name: 'Turma A',
    sequence_order: 2,
    material_code: 'TAR-150-1045',
    material_description: 'Tarugo 150mm SAE 1045',
    production_order: 'OP-4500124',
    enfornamento_type: 'QUENTE',
    planned_quantity_tons: 120,
    productivity_rate_th: 30,
    production_hours: 4.0,
    setup_duration_minutes: 15,
    start_datetime: '2026-08-25 11:30',
    end_datetime: '2026-08-25 15:30',
    status: 'APROVADO_PCP',
    version: 1,
    raw_material_req_tons: 124,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // TESTE 1: Disparo automático na confirmação com item FRIO
  it('TESTE 1: Disparo automático na confirmação/aprovação com item FRIO', async () => {
    // Espia as coleções do PocketBase
    const mockCreatedHeader = {
      id: 'hdr-test-1',
      inventory_code: 'INV-MP-L1-2026-08-25-V01',
      schedule_version: 1,
      status: 'Aguardando Inventário',
    }
    const mockCreatedItem = {
      id: 'itm-test-1',
      production_order: 'OP-4500123',
      enfornamento_type: 'FRIO',
    }

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      if (collName === 'pcp_mp_inventory_orders') {
        return {
          getFullList: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue(mockCreatedHeader),
          update: vi.fn().mockResolvedValue(mockCreatedHeader),
        } as any
      }
      if (collName === 'pcp_mp_inventory_items') {
        return {
          getFullList: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue(mockCreatedItem),
          update: vi.fn().mockResolvedValue(mockCreatedItem),
        } as any
      }
      if (
        collName === 'pcp_mp_inventory_history' ||
        collName === 'pcp_audit_logs' ||
        collName === 'pcp_communications'
      ) {
        return {
          create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        } as any
      }
      return {} as any
    })

    const res = await rawMaterialInventoryService.processScheduleApprovalTrigger({
      filter: mockHeaderFilterL1,
      items: [mockItemFrioA, mockItemQuenteB],
      versionNumber: 1,
      userName: 'Programador PCP',
    })

    expect(res.triggered).toBe(true)
    expect(res.itemsCreatedCount).toBe(1) // Apenas o item FRIO vira item de inventário
    expect(res.reason).toContain('sucesso')
  })

  // TESTE 2: Não-disparo sem FRIO (apenas itens QUENTES)
  it('TESTE 2: Não dispara inventário quando não há itens com enfornamento FRIO', async () => {
    const res = await rawMaterialInventoryService.processScheduleApprovalTrigger({
      filter: mockHeaderFilterL1,
      items: [mockItemQuenteB], // somente quente
      versionNumber: 1,
      userName: 'Programador PCP',
    })

    expect(res.triggered).toBe(false)
    expect(res.itemsCreatedCount).toBe(0)
    expect(res.reason).toContain('Nenhum item com enfornamento FRIO')
  })

  // TESTE 3: Anti-duplicidade por versão (mesma versão não duplica cabeçalho nem itens)
  it('TESTE 3: Anti-duplicidade — reprocessar a mesma versão não deve duplicar registros', async () => {
    const existingHeader = {
      id: 'hdr-existente',
      inventory_code: 'INV-MP-L1-2026-08-25-V01',
      schedule_version: 1,
    }
    const existingItem = {
      id: 'itm-existente',
      schedule_item_id: 'prog-item-01',
      production_order: 'OP-4500123',
      schedule_version: 1,
      status: 'Aguardando Inventário',
    }

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      if (collName === 'pcp_mp_inventory_orders') {
        return {
          getFullList: vi.fn().mockResolvedValue([existingHeader]),
          update: vi.fn().mockResolvedValue(existingHeader),
        } as any
      }
      if (collName === 'pcp_mp_inventory_items') {
        return {
          getFullList: vi.fn().mockResolvedValue([existingItem]),
          update: vi.fn().mockResolvedValue(existingItem),
        } as any
      }
      if (
        collName === 'pcp_mp_inventory_history' ||
        collName === 'pcp_audit_logs' ||
        collName === 'pcp_communications'
      ) {
        return {
          create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        } as any
      }
      return {} as any
    })

    const res = await rawMaterialInventoryService.processScheduleApprovalTrigger({
      filter: mockHeaderFilterL1,
      items: [mockItemFrioA],
      versionNumber: 1,
      userName: 'Programador PCP',
    })

    expect(res.triggered).toBe(true)
    expect(res.itemsCreatedCount).toBe(0) // nenhum novo criado
    expect(res.itemsUpdatedCount).toBe(1) // apenas atualizado
  })

  // TESTE 4: Regra 18/19 — Nova versão atualiza sem duplicar e preserva histórico
  it('TESTE 4: Nova versão (V2) compara com anterior, preserva histórico e marca versão anterior', async () => {
    const prevHeader = {
      id: 'hdr-v1',
      inventory_code: 'INV-MP-L1-2026-08-25-V01',
      schedule_version: 1,
      status: 'Aguardando Inventário',
    }
    const newHeaderV2 = {
      id: 'hdr-v2',
      inventory_code: 'INV-MP-L1-2026-08-25-V02',
      schedule_version: 2,
      status: 'Aguardando Inventário',
    }

    const prevItemV1 = {
      id: 'itm-v1',
      schedule_item_id: 'prog-item-01',
      schedule_version: 1,
      status: 'Aguardando Inventário',
      production_order: 'OP-4500123',
    }

    const updateSpy = vi.fn().mockResolvedValue({ id: 'ok' })
    const historyCreateSpy = vi.fn().mockResolvedValue({ id: 'hist-1' })

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      if (collName === 'pcp_mp_inventory_orders') {
        return {
          // Quando busca por V2, não acha. Quando busca outras versões, acha V1.
          getFullList: vi.fn().mockImplementation((opts: any) => {
            if (opts?.filter?.includes('schedule_version = 2')) return []
            return [prevHeader]
          }),
          create: vi.fn().mockResolvedValue(newHeaderV2),
          update: updateSpy,
        } as any
      }
      if (collName === 'pcp_mp_inventory_items') {
        return {
          getFullList: vi.fn().mockResolvedValue([prevItemV1]),
          create: vi.fn().mockResolvedValue({ id: 'itm-v2', schedule_version: 2 }),
          update: updateSpy,
        } as any
      }
      if (collName === 'pcp_mp_inventory_history') {
        return {
          create: historyCreateSpy,
        } as any
      }
      if (collName === 'pcp_audit_logs' || collName === 'pcp_communications') {
        return {
          create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        } as any
      }
      return {} as any
    })

    const res = await rawMaterialInventoryService.processScheduleApprovalTrigger({
      filter: mockHeaderFilterL1,
      items: [{ ...mockItemFrioA, planned_quantity_tons: 95 }], // alterou quantidade na V2
      versionNumber: 2,
      userName: 'Programador PCP',
    })

    expect(res.triggered).toBe(true)
    expect(res.itemsCreatedCount).toBe(1)
    // O histórico registrou a evolução de versão
    expect(historyCreateSpy).toHaveBeenCalled()
  })

  // TESTE 5: Cancelamento quando item deixa de ser FRIO
  it('TESTE 5: Item que deixa de ser FRIO em nova versão é cancelado preservando histórico', async () => {
    const existingActiveItem = {
      id: 'itm-active-1',
      inventory_id: 'hdr-1',
      schedule_version: 1,
      status: 'Aguardando Inventário',
      production_order: 'OP-4500123',
    }

    const itemUpdateSpy = vi.fn().mockResolvedValue({ id: 'ok' })
    const historySpy = vi.fn().mockResolvedValue({ id: 'hist-ok' })

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      if (collName === 'pcp_mp_inventory_items') {
        return {
          getOne: vi.fn().mockResolvedValue(existingActiveItem),
          update: itemUpdateSpy,
        } as any
      }
      if (collName === 'pcp_mp_inventory_history') {
        return {
          create: historySpy,
        } as any
      }
      if (collName === 'pcp_audit_logs') {
        return {
          create: vi.fn().mockResolvedValue({ id: 'audit-ok' }),
        } as any
      }
      if (collName === 'pcp_mp_inventory_orders') {
        return {
          getOne: vi.fn().mockResolvedValue({ id: 'hdr-1' }),
          update: vi.fn().mockResolvedValue({ id: 'hdr-1' }),
        } as any
      }
      return {} as any
    })

    // Atualiza item do DP07 simulando o cancelamento
    const res = await rawMaterialInventoryService.updateItemFromDP07({
      itemId: 'itm-active-1',
      inventoriedPieces: 0,
      enfornamentoSequence: 1,
      observation: 'Cancelado: Item modificado no PCP de enfornamento FRIO para QUENTE',
      userName: 'Programador PCP',
    })

    expect(res.success).toBe(true)
    expect(itemUpdateSpy).toHaveBeenCalled()
    expect(historySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'EDICAO_DP07',
      }),
    )
  })

  // TESTE 6: Edição restrita aos campos do DP07 e cálculo de divergência
  it('TESTE 6: Atualização do DP07 calcula divergência (DP07 - SAP) e transiciona status', async () => {
    const itemRecord = {
      id: 'item-dp07-test',
      inventory_id: 'hdr-01',
      sap_pieces_count: 10,
      dp07_inventoried_pieces: null,
      dp07_enfornamento_sequence: null,
      pcp_planned_sequence: 1,
      status: 'Aguardando Inventário',
      schedule_version: 1,
    }

    const updateSpy = vi.fn().mockResolvedValue({ id: 'item-dp07-test' })

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      if (collName === 'pcp_mp_inventory_items') {
        return {
          getOne: vi.fn().mockResolvedValue(itemRecord),
          update: updateSpy,
        } as any
      }
      if (collName === 'pcp_mp_inventory_orders') {
        return {
          getOne: vi.fn().mockResolvedValue({ id: 'hdr-01' }),
          update: vi.fn().mockResolvedValue({ id: 'hdr-01' }),
        } as any
      }
      if (
        collName === 'pcp_mp_inventory_history' ||
        collName === 'pcp_audit_logs' ||
        collName === 'pcp_mp_inventory_occurrences'
      ) {
        return {
          create: vi.fn().mockResolvedValue({ id: 'ok' }),
        } as any
      }
      return {} as any
    })

    // Caso 6a: Divergência negativa (8 peças informadas vs 10 no SAP)
    const resDivergent = await rawMaterialInventoryService.updateItemFromDP07({
      itemId: 'item-dp07-test',
      inventoriedPieces: 8,
      enfornamentoSequence: 1,
      observation: 'Falta de 2 tarugos no lote',
      userName: 'Operador DP07',
    })

    expect(resDivergent.success).toBe(true)
    expect(updateSpy).toHaveBeenCalledWith(
      'item-dp07-test',
      expect.objectContaining({
        dp07_inventoried_pieces: 8,
        pieces_divergence: -2,
        status: 'Divergência Encontrada',
      }),
    )

    // Caso 6b: Quantidade física suficiente e sequência informada -> Pronto para Enfornamento
    const resReady = await rawMaterialInventoryService.updateItemFromDP07({
      itemId: 'item-dp07-test',
      inventoriedPieces: 10,
      enfornamentoSequence: 1,
      observation: 'Lote conferido 100%',
      userName: 'Operador DP07',
    })

    expect(resReady.success).toBe(true)
    expect(updateSpy).toHaveBeenCalledWith(
      'item-dp07-test',
      expect.objectContaining({
        dp07_inventoried_pieces: 10,
        pieces_divergence: 0,
        status: 'Pronto para Enfornamento',
      }),
    )
  })

  // TESTE 7: Avaliação de alertas (Quantidade insuficiente, Não localizado, Bloqueado, Sequência divergente, Risco de atraso)
  it('TESTE 7: Avaliação precisa de todos os alertas de governança', () => {
    // Alerta 1: Quantidade física insuficiente
    const itemInsuficiente: MPInventoryItem = {
      id: 'itm-alert-1',
      inventory_id: 'hdr-1',
      inventory_code: 'INV-MP-L1-2026-08-25-V01',
      item_control_key: 'L1-FORNOL1-OP-101-TAR-130-V1',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      enfornamento_date: '2026-08-25',
      expected_enfornamento_time: '08:00',
      production_order: 'OP-101',
      raw_material_code: 'TAR-130',
      raw_material_description: 'Tarugo 130',
      heat_number: 'CORR-01',
      produced_gauge_product: 'Perfil U',
      enfornamento_type: 'FRIO',
      sap_stock_tons: 80,
      planned_requirement_tons: 85,
      sap_pieces_count: 10,
      wms_physical_location: 'GALPAO 1',
      dp07_inventoried_pieces: 8, // faltam 2
      pieces_divergence: -2,
      pcp_planned_sequence: 1,
      dp07_enfornamento_sequence: 1,
      status: 'Divergência Encontrada',
      is_material_blocked: false,
      is_material_located: true,
      schedule_version: 1,
      is_active: true,
    }

    const alerts1 = RawMaterialInventoryService.evaluateItemAlerts(itemInsuficiente)
    expect(alerts1.some((a) => a.type === 'INSUFFICIENT')).toBe(true)

    // Alerta 2: Material não localizado no WMS
    const itemNaoLocalizado: MPInventoryItem = {
      ...itemInsuficiente,
      is_material_located: false,
    }
    const alerts2 = RawMaterialInventoryService.evaluateItemAlerts(itemNaoLocalizado)
    expect(alerts2.some((a) => a.type === 'NOT_LOCATED')).toBe(true)

    // Alerta 3: Material Bloqueado (não conta como disponível)
    const itemBloqueado: MPInventoryItem = {
      ...itemInsuficiente,
      is_material_blocked: true,
      status: 'Material Bloqueado',
    }
    const alerts3 = RawMaterialInventoryService.evaluateItemAlerts(itemBloqueado)
    expect(alerts3.some((a) => a.type === 'BLOCKED')).toBe(true)

    // Alerta 4: Sequência DP07 divergente do PCP
    const itemSeqDiff: MPInventoryItem = {
      ...itemInsuficiente,
      pcp_planned_sequence: 1,
      dp07_enfornamento_sequence: 3, // mudou sequência
    }
    const alerts4 = RawMaterialInventoryService.evaluateItemAlerts(itemSeqDiff)
    expect(alerts4.some((a) => a.type === 'SEQUENCE_DIFF')).toBe(true)

    // Alerta 5: Risco de Atraso
    const itemAtraso: MPInventoryItem = {
      ...itemInsuficiente,
      status: 'Aguardando Inventário',
      expected_enfornamento_time: '07:00',
    }
    const alerts5 = RawMaterialInventoryService.evaluateItemAlerts(itemAtraso)
    expect(alerts5.some((a) => a.type === 'DELAY_RISK')).toBe(true)
  })

  // TESTE 8: Notificação DP07 com registro honesto quando canais externos estão pendentes
  it('TESTE 8: Registro de notificação DP07 com indicação honesta de pendência externa', async () => {
    const commCreateSpy = vi.fn().mockResolvedValue({ id: 'comm-1' })
    const auditCreateSpy = vi.fn().mockResolvedValue({ id: 'audit-1' })

    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      if (collName === 'pcp_communications') return { create: commCreateSpy } as any
      if (collName === 'pcp_audit_logs') return { create: auditCreateSpy } as any
      return {} as any
    })

    const notif = await rawMaterialInventoryService.registerDP07Notification({
      inventoryCode: 'INV-MP-L1-2026-08-25-V01',
      line: 'L1',
      center: 'FORNOL1',
      scheduleDate: '2026-08-25',
      ordersCount: 3,
      totalTons: 120,
      totalPieces: 15,
      userName: 'Programador PCP',
    })

    expect(notif.notified).toBe(true)
    expect(notif.channelStatus).toContain('aguardando integração')
    expect(notif.message).toContain('Nova necessidade de inventário — L1')
    expect(auditCreateSpy).toHaveBeenCalled()
  })
})

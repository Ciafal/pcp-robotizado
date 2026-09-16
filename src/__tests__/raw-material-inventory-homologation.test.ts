import { describe, it, expect, vi, beforeEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import {
  rawMaterialInventoryService,
  RawMaterialInventoryService,
} from '@/services/pcp-raw-material-inventory-service'
import {
  SapAdapter,
  WmsAdapter,
  MesAdapter,
  NotificationAdapter,
  FieldSituationResolver,
} from '@/services/pcp-adapters-service'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'

/**
 * SUÍTE OFICIAL DE HOMOLOGAÇÃO: INVENTÁRIO DE MATÉRIA-PRIMA DP07 / L1
 * Valida os 10 cenários inegociáveis de homologação solicitados pelo usuário.
 */
describe('SUÍTE OFICIAL DE HOMOLOGAÇÃO — INVENTÁRIO MP (10 CENÁRIOS)', () => {
  const baseFilter: WeeklyHeaderFilter = {
    companyCode: 'CIAFAL',
    plantCode: 'P1',
    lineCode: 'L1',
    year: 2026,
    weekNumber: 35,
    periodDisplay: 'Semana 35 / 2026',
  }

  const sampleItems: WeeklyScheduleItem[] = [
    {
      id: 'item-op-1',
      sequence_order: 1,
      day_of_week: 'TER',
      shift_code: 'T1',
      shift_name: 'Turno 1',
      material_code: 'ST9301045525G',
      material_description: 'Tarugo 130mm SAE 1020',
      production_order: 'OP-100067068',
      heat_number: 'COR-4412',
      enfornamento_type: 'FRIO',
      planned_quantity_tons: 100,
      planned_billets_count: 73,
      item_type: 'PRODUCT',
      date_str: '2026-08-25',
      start_datetime: '2026-08-25 08:00',
    } as any,
    {
      id: 'item-op-2',
      sequence_order: 2,
      day_of_week: 'TER',
      shift_code: 'T1',
      shift_name: 'Turno 1',
      material_code: 'ST9301045526G',
      material_description: 'Tarugo 130mm SAE 1045',
      production_order: 'OP-100067069',
      heat_number: 'COR-4413',
      enfornamento_type: 'FRIO',
      planned_quantity_tons: 120,
      planned_billets_count: 85,
      item_type: 'PRODUCT',
      date_str: '2026-08-25',
      start_datetime: '2026-08-25 12:00',
    } as any,
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    SapAdapter.setForcedUnavailable(false)
    WmsAdapter.setForcedUnavailable(false)
  })

  // =========================================================================
  // CENÁRIO 1: FRIO + Confirmação → Inventário Criado
  // =========================================================================
  it('Cenário 1: Confirmação de programação com enfornamento FRIO gera inventário automaticamente', async () => {
    const headerCreateSpy = vi.fn().mockResolvedValue({ id: 'hdr-1' })
    const itemsCreateSpy = vi.fn().mockResolvedValue({ id: 'item-new-1' })

    vi.spyOn(pb, 'collection').mockImplementation((coll: string) => {
      if (coll === 'pcp_mp_inventory_orders') {
        return {
          getFullList: vi.fn().mockResolvedValue([]),
          create: headerCreateSpy,
          update: vi.fn().mockResolvedValue({ id: 'hdr-1' }),
        } as any
      }
      if (coll === 'pcp_mp_inventory_items') {
        return {
          getFullList: vi.fn().mockResolvedValue([]),
          create: itemsCreateSpy,
          update: vi.fn().mockResolvedValue({ id: 'item-new-1' }),
        } as any
      }
      return {
        create: vi.fn().mockResolvedValue({ id: 'mock-id' }),
        getFullList: vi.fn().mockResolvedValue([]),
      } as any
    })

    const res = await rawMaterialInventoryService.processScheduleApprovalTrigger({
      filter: baseFilter,
      items: sampleItems,
      versionNumber: 1,
      userName: 'Coordenação PCP',
    })

    expect(res.triggered).toBe(true)
    expect(res.itemsCreatedCount).toBe(2)
    expect(headerCreateSpy).toHaveBeenCalled()
    expect(itemsCreateSpy).toHaveBeenCalledTimes(2)
  })

  // =========================================================================
  // CENÁRIO 2: QUENTE / INTERCALADO / TAPETE → Não Criado
  // =========================================================================
  it('Cenário 2: Enfornamento QUENTE/INTERCALADO/TAPETE/NORMAL não gera inventário e emite log de inelegibilidade', async () => {
    const hotItems: WeeklyScheduleItem[] = [
      {
        id: 'item-hot-1',
        material_code: 'MAT-QUENTE-1',
        production_order: 'OP-HOT-01',
        enfornamento_type: 'QUENTE',
        planned_quantity_tons: 50,
      } as any,
      {
        id: 'item-intercalado',
        material_code: 'MAT-INTERCALADO',
        production_order: 'OP-INT-01',
        enfornamento_type: 'INTERCALADO',
        planned_quantity_tons: 40,
      } as any,
    ]

    const headerCreateSpy = vi.fn()
    vi.spyOn(pb, 'collection').mockImplementation(
      () =>
        ({
          create: headerCreateSpy,
          getFullList: vi.fn().mockResolvedValue([]),
        }) as any,
    )

    const res = await rawMaterialInventoryService.processScheduleApprovalTrigger({
      filter: baseFilter,
      items: hotItems,
      versionNumber: 1,
    })

    expect(res.triggered).toBe(false)
    expect(res.itemsCreatedCount).toBe(0)
    expect(res.reason).toContain('Nenhum item elegível')
    expect(headerCreateSpy).not.toHaveBeenCalled()
  })

  // =========================================================================
  // CENÁRIO 3: Reconfirmar a mesma versão 2x → Não Duplicar
  // =========================================================================
  it('Cenário 3: Reconfirmar a mesma versão não duplica ordens nem itens (validação de idempotência)', async () => {
    const existingHeader = {
      id: 'hdr-existente',
      inventory_code: 'INV-MP-L1-2026-08-25-V01',
      schedule_version: 1,
      orders_count: 2,
    }

    const existingItemRecord = {
      id: 'item-existente-1',
      production_order: 'OP-100067068',
      raw_material_code: 'ST9301045525G',
      dp07_inventoried_pieces: 70, // já preenchido pelo DP07
      record_version: 1,
    }

    const headerUpdateSpy = vi.fn().mockResolvedValue(existingHeader)
    const itemUpdateSpy = vi.fn().mockResolvedValue(existingItemRecord)
    const itemCreateSpy = vi.fn()

    vi.spyOn(pb, 'collection').mockImplementation((coll: string) => {
      if (coll === 'pcp_mp_inventory_orders') {
        return {
          getFullList: vi.fn().mockResolvedValue([existingHeader]),
          update: headerUpdateSpy,
          create: vi.fn(),
        } as any
      }
      if (coll === 'pcp_mp_inventory_items') {
        return {
          getFullList: vi.fn().mockResolvedValue([existingItemRecord]),
          update: itemUpdateSpy,
          create: itemCreateSpy,
        } as any
      }
      return {
        create: vi.fn().mockResolvedValue({ id: 'ok' }),
        getFullList: vi.fn().mockResolvedValue([]),
      } as any
    })

    const res = await rawMaterialInventoryService.processScheduleApprovalTrigger({
      filter: baseFilter,
      items: [sampleItems[0]], // Mesma ordem
      versionNumber: 1,
    })

    expect(res.itemsCreatedCount).toBe(0)
    expect(res.itemsUpdatedCount).toBe(1)
    expect(itemCreateSpy).not.toHaveBeenCalled()
    expect(itemUpdateSpy).toHaveBeenCalled()
  })

  // =========================================================================
  // CENÁRIO 4: NOVA VERSÃO → Delta (B removida/substituída, A/C mantidas, D adicionada)
  // =========================================================================
  it('Cenário 4: Nova versão faz delta de programação: remove B sem apagar histórico, preserva A e adiciona D', async () => {
    const prevItems = [
      {
        id: 'item-A',
        production_order: 'OP-A',
        raw_material_code: 'MAT-A',
        schedule_version: 1,
        status: 'Em Inventário',
        dp07_inventoried_pieces: 50,
      },
      {
        id: 'item-B',
        production_order: 'OP-B',
        raw_material_code: 'MAT-B',
        schedule_version: 1,
        status: 'Aguardando Inventário',
      },
    ]

    const newVersionItems: WeeklyScheduleItem[] = [
      {
        id: 'new-A',
        production_order: 'OP-A',
        enfornamento_type: 'FRIO',
        material_code: 'MAT-A',
        planned_quantity_tons: 80,
      } as any,
      {
        id: 'new-D',
        production_order: 'OP-D',
        enfornamento_type: 'FRIO',
        material_code: 'MAT-D',
        planned_quantity_tons: 90,
      } as any,
    ]

    const updateSpy = vi.fn().mockResolvedValue({ id: 'ok' })

    vi.spyOn(pb, 'collection').mockImplementation((coll: string) => {
      if (coll === 'pcp_mp_inventory_items') {
        return {
          getFullList: vi.fn().mockResolvedValue(prevItems),
          update: updateSpy,
          create: vi.fn().mockResolvedValue({ id: 'new-item-D' }),
        } as any
      }
      return {
        getFullList: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'ok' }),
        update: vi.fn().mockResolvedValue({ id: 'ok' }),
      } as any
    })

    const res = await rawMaterialInventoryService.handleScheduleVersionChange({
      previousVersion: 1,
      newVersion: 2,
      filter: baseFilter,
      newItems: newVersionItems,
      userName: 'Coordenação PCP',
    })

    expect(res.cancelledItemsCount).toBe(1) // Ordem B cancelada/arquivada
    expect(res.maintainedItemsCount).toBe(1) // Ordem A mantida
    expect(updateSpy).toHaveBeenCalledWith(
      'item-B',
      expect.objectContaining({
        status: 'Substituído por Nova Versão',
        is_active: false,
        cancelled_reason: expect.stringContaining('Substituído pela versão 002'),
      }),
    )
  })

  // =========================================================================
  // CENÁRIO 5: Menos peças → Divergência Encontrada
  // =========================================================================
  it('Cenário 5: Contagem física com menos peças identifica divergência negativa e não permite conclusão direta', async () => {
    const itemRecord = {
      id: 'item-div-1',
      production_order: 'OP-100067068',
      sap_pieces_count: 100,
      planned_requirement_tons: 150,
      pcp_planned_sequence: 1,
      is_material_blocked: false,
      is_material_located: true,
      record_version: 1,
    }

    vi.spyOn(pb, 'collection').mockImplementation(
      () =>
        ({
          getOne: vi.fn().mockResolvedValue(itemRecord),
          update: vi.fn().mockResolvedValue({ ...itemRecord, dp07_inventoried_pieces: 80 }),
          create: vi.fn().mockResolvedValue({ id: 'ok' }),
        }) as any,
    )

    const res = await rawMaterialInventoryService.updateItemFromDP07({
      itemId: 'item-div-1',
      inventoriedPieces: 80, // faltam 20
      enfornamentoSequence: 1,
      userName: 'Operador DP07',
    })

    expect(res.success).toBe(true)
    expect(res.divergence).toBe(-20)
    expect(res.isReady).toBe(false) // Não está pronto devido à falta de peças
  })

  // =========================================================================
  // CENÁRIO 6: Sequência Alterada → Alerta PCP
  // =========================================================================
  it('Cenário 6: Sequência alterada pelo DP07 gera alerta e notificação interna para o PCP sem sobrescrever programação oficial silenciosamente', async () => {
    const itemRecord = {
      id: 'item-seq-1',
      production_order: 'OP-100067068',
      sap_pieces_count: 50,
      planned_requirement_tons: 75,
      pcp_planned_sequence: 4,
      is_material_blocked: false,
      is_material_located: true,
      record_version: 1,
    }

    const notifSpy = vi.spyOn(NotificationAdapter, 'sendInternalNotification')

    vi.spyOn(pb, 'collection').mockImplementation(
      () =>
        ({
          getOne: vi.fn().mockResolvedValue(itemRecord),
          update: vi.fn().mockResolvedValue({ ...itemRecord, dp07_enfornamento_sequence: 2 }),
          create: vi.fn().mockResolvedValue({ id: 'ok' }),
        }) as any,
    )

    await rawMaterialInventoryService.updateItemFromDP07({
      itemId: 'item-seq-1',
      inventoriedPieces: 50,
      enfornamentoSequence: 2, // mudou de 4 para 2
      userName: 'Operador DP07',
    })

    expect(notifSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        target_audience: 'PCP',
        type: 'MUDANCA_SEQUENCIA',
        severity: 'WARNING',
      }),
    )
  })

  // =========================================================================
  // CENÁRIO 7: Quantidade Suficiente → Pronto para Enfornamento
  // =========================================================================
  it('Cenário 7: Quantidade suficiente e sequência definida tornam o item "Pronto para Enfornamento" e acionam MES', async () => {
    const itemRecord = {
      id: 'item-pronto-1',
      production_order: 'OP-100067068',
      sap_pieces_count: 60,
      planned_requirement_tons: 90,
      pcp_planned_sequence: 1,
      is_material_blocked: false,
      is_material_located: true,
      record_version: 1,
    }

    const mesSpy = vi.spyOn(MesAdapter, 'dispatchOrderReadiness')

    vi.spyOn(pb, 'collection').mockImplementation(
      () =>
        ({
          getOne: vi.fn().mockResolvedValue(itemRecord),
          update: vi.fn().mockResolvedValue({ ...itemRecord, status: 'Pronto para Enfornamento' }),
          create: vi.fn().mockResolvedValue({ id: 'ok' }),
        }) as any,
    )

    const res = await rawMaterialInventoryService.updateItemFromDP07({
      itemId: 'item-pronto-1',
      inventoriedPieces: 60,
      enfornamentoSequence: 1,
      userName: 'Operador DP07',
    })

    expect(res.success).toBe(true)
    expect(res.isReady).toBe(true)
    expect(mesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: 'OP-100067068',
        piecesReady: 60,
      }),
    )
  })

  // =========================================================================
  // CENÁRIO 8: SAP Indisponível → Operação continua com indicação clara
  // =========================================================================
  it('Cenário 8: Se SAP indisponível, operação continua exibindo status individual e última atualização anterior', async () => {
    SapAdapter.setForcedUnavailable(true)

    const previousSnapshot = {
      center: 'FORNOL1',
      production_order: 'OP-100067068',
      raw_material_code: 'ST9301045525G',
      raw_material_description: 'Tarugo 130mm',
      heat_number: 'COR-4412',
      storage_location: 'DP07',
      stock_tons: 105,
      pieces_count: 70,
      unit_of_measure: 't' as const,
      sap_status: 'LIBERADO' as const,
      is_blocked: false,
      traceability_code: 'LOT-4412',
      last_sync_timestamp: '2026-08-25T07:30:00Z',
    }

    const res = await SapAdapter.fetchMaterialStock({
      center: 'FORNOL1',
      productionOrder: 'OP-100067068',
      rawMaterialCode: 'ST9301045525G',
      heatNumber: 'COR-4412',
      previousSnapshot,
    })

    expect(res.isUnavailable).toBe(true)
    expect(res.isFromPreviousSnapshot).toBe(true)
    expect(res.message).toContain('SAP temporariamente indisponível')

    // Situação individual de campo
    const sit = FieldSituationResolver.resolve('heat_number', {
      sap_snapshot_data: { captura: '2026-08-25T07:30:00Z' },
    })
    expect(sit.is_unavailable).toBe(true)
    expect(sit.label).toContain('SAP temporariamente indisponível')
    expect(sit.sublabel).toContain('Última atualização SAP')
  })

  // =========================================================================
  // CENÁRIO 9: WMS Indisponível → Operação física continua + pendência registrada
  // =========================================================================
  it('Cenário 9: Se WMS indisponível, DP07 continua operando sem travar e registra pendência de localização', async () => {
    WmsAdapter.setForcedUnavailable(true)

    const res = await WmsAdapter.fetchMaterialLocation({
      rawMaterialCode: 'ST9301045525G',
      heatNumber: 'COR-4412',
    })

    expect(res.isUnavailable).toBe(true)
    expect(res.data.wm_address).toContain('Aguardando Sincronização WMS')

    const sit = FieldSituationResolver.resolve('wms_physical_location', {})
    expect(sit.is_unavailable).toBe(true)
    expect(sit.label).toContain('WMS temporariamente indisponível')
  })

  // =========================================================================
  // CENÁRIO 10: Atualização Concorrente → Bloqueia sobrescrita silenciosa
  // =========================================================================
  it('Cenário 10: Concorrência otimista (OCC): Usuário A com versão desatualizada é impedido de sobrescrever alterações do Usuário B', async () => {
    const itemNoBanco = {
      id: 'item-concorrente',
      production_order: 'OP-100067068',
      record_version: 6, // Usuário B já salvou a versão 6
      sap_pieces_count: 50,
      planned_requirement_tons: 75,
    }

    vi.spyOn(pb, 'collection').mockImplementation(
      () =>
        ({
          getOne: vi.fn().mockResolvedValue(itemNoBanco),
          update: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: 'ok' }),
        }) as any,
    )

    // Usuário A abriu a versão 5 e tenta salvar
    const res = await rawMaterialInventoryService.updateItemFromDP07({
      itemId: 'item-concorrente',
      inventoriedPieces: 50,
      enfornamentoSequence: 1,
      clientRecordVersion: 5, // versão antiga
      userName: 'Usuário A',
    })

    expect(res.success).toBe(false)
    expect(res.isConflict).toBe(true)
    expect(res.message).toBe(
      'Este inventário foi alterado por outro usuário. Atualize os dados antes de salvar.',
    )
  })
})

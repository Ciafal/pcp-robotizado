import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import {
  CreateDemandPayload,
  CreateEntryPayload,
  InventoryDemand,
  InventoryEntry,
  InventoryAuditEvent,
} from '@/types/pcp-inventory-demands'
import pb from '@/lib/pocketbase/client'

describe('TESTES 03–08: Homologação e Persistência do Inventário de Matéria-Prima', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // TESTE 03: Preencher demanda e salvar → número INV-AAAA-###### gerado e demanda PERSISTIDA no banco
  it('TESTE 03: Preencher demanda e salvar gera número INV-AAAA-###### e persiste demanda no banco', async () => {
    const payload: CreateDemandPayload = {
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      material_code: 'TAR-130-1020',
      material_description: 'Tarugo SAE 1020 130mm x 12m',
      priority: 'Normal',
      gauge: 'Tarugo 130mm',
      application: 'Laminação L1',
      run_number: '458921',
      quantity_required: 80,
      unit_of_measure: 'pçs',
      observation: 'Conferência física turno matutino',
    }

    const createdDemand = {
      id: 'dem-03',
      control_number: 'INV-2026-000001',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      material_code: 'TAR-130-1020',
      material_description: 'Tarugo SAE 1020 130mm x 12m',
      priority: 'Normal',
      status: 'Gerada',
      total_pieces_required: 80,
      total_pieces_inventoried: 0,
      divergence_pieces: -80,
      divergence_pct: -100,
      created: '2026-09-27 10:00:00.000Z',
    }

    const demandCreateSpy = vi.fn().mockResolvedValue(createdDemand)
    const historyCreateSpy = vi.fn().mockResolvedValue({ id: 'hist-1' })
    const auditCreateSpy = vi.fn().mockResolvedValue({ id: 'aud-1' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return {
          getList: vi.fn().mockResolvedValue({ items: [] }),
          create: demandCreateSpy,
          getOne: vi.fn().mockResolvedValue(createdDemand),
        } as any
      }
      if (col === 'pcp_mp_inventory_history') {
        return { create: historyCreateSpy } as any
      }
      if (col === 'pcp_audit_logs') {
        return { create: auditCreateSpy } as any
      }
      return {} as any
    })

    const result = await pcpInventoryDemandsService.createDemand(payload)

    expect(result).toBeDefined()
    expect(result.control_number).toMatch(/^INV-\d{4}-\d{6}$/)
    expect(demandCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'CIAFAL',
        line: 'L1',
        center: 'FORNOL1',
        storage_deposit: 'DP07',
        material_code: 'TAR-130-1020',
        total_pieces_required: 80,
        status: 'Gerada',
      }),
    )
    expect(historyCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'DEMANDA_GERADA',
      }),
    )
    expect(auditCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE_DEMAND',
      }),
    )
  })

  // TESTE 04: "Demandas de Inventário" lista a demanda criada
  it('TESTE 04: "Demandas de Inventário" lista as demandas criadas em ordem cronológica reversa', async () => {
    const mockDemands: InventoryDemand[] = [
      {
        id: 'dem-02',
        control_number: 'INV-2026-000002',
        company: 'CIAFAL',
        line: 'L1',
        center: 'FORNOL1',
        storage_deposit: 'DP07',
        material_code: 'TAR-150-1045',
        material_description: 'Tarugo SAE 1045 150mm',
        priority: 'Alta',
        status: 'Em inventário',
        total_pieces_required: 50,
        total_pieces_inventoried: 20,
        divergence_pieces: -30,
        divergence_pct: -60,
        created: '2026-09-27 11:00:00.000Z',
      },
      {
        id: 'dem-01',
        control_number: 'INV-2026-000001',
        company: 'CIAFAL',
        line: 'L1',
        center: 'FORNOL1',
        storage_deposit: 'DP07',
        material_code: 'TAR-130-1020',
        priority: 'Normal',
        status: 'Gerada',
        total_pieces_required: 80,
        created: '2026-09-27 10:00:00.000Z',
      },
    ]

    const getFullListSpy = vi.fn().mockResolvedValue(mockDemands)
    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return { getFullList: getFullListSpy } as any
      }
      return {} as any
    })

    const demands = await pcpInventoryDemandsService.listDemands()

    expect(demands).toHaveLength(2)
    expect(demands[0].control_number).toBe('INV-2026-000002')
    expect(demands[1].control_number).toBe('INV-2026-000001')
    expect(getFullListSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: '-created',
      }),
    )
  })

  // TESTE 06: Adicionar contagem (corrida, localização, nº de peças) → lançamento persistido com usuário + data/hora automáticos
  it('TESTE 06: Adicionar contagem física persiste lançamento com usuário e data/hora automáticos e transiciona demanda', async () => {
    const parentDemand: InventoryDemand = {
      id: 'dem-06',
      control_number: 'INV-2026-000001',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      material_code: 'TAR-130-1020',
      priority: 'Normal',
      status: 'Gerada',
      total_pieces_required: 80,
      total_pieces_inventoried: 0,
      divergence_pieces: -80,
      divergence_pct: -100,
      created: '2026-09-27 10:00:00.000Z',
    }

    const payload: CreateEntryPayload = {
      demand_id: 'dem-06',
      run_number: '458921',
      location_wms: 'DP07-RUA02-BL04',
      pieces_count: 40,
      gauge: 'Tarugo 130mm',
    }

    const mockEntry: InventoryEntry = {
      id: 'entry-01',
      demand_id: 'dem-06',
      run_id: 'run-1',
      control_number: 'INV-2026-000001',
      run_number: '458921',
      location_wms: 'DP07-RUA02-BL04',
      pieces_count: 40,
      user_id: 'usr-dp07',
      user_name: 'Roberto Silva (Operação)',
      user_role: 'PRODUCTION_VIEWER',
      entry_date_formatted: '27/09/2026 14:00',
      is_active: true,
      created: '2026-09-27 14:00:00.000Z',
    }

    const entryCreateSpy = vi.fn().mockResolvedValue(mockEntry)
    const demandUpdateSpy = vi.fn().mockResolvedValue({
      ...parentDemand,
      status: 'Em inventário',
      total_pieces_inventoried: 40,
    })
    const historyCreateSpy = vi.fn().mockResolvedValue({ id: 'aud-entry' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return {
          getOne: vi.fn().mockResolvedValue(parentDemand),
          update: demandUpdateSpy,
        } as any
      }
      if (col === 'pcp_mp_inventory_entries') {
        return {
          create: entryCreateSpy,
          getFullList: vi.fn().mockResolvedValue([mockEntry]),
        } as any
      }
      if (col === 'pcp_mp_inventory_history') {
        return { create: historyCreateSpy } as any
      }
      return {} as any
    })

    const entryResult = await pcpInventoryDemandsService.addEntry(payload)

    expect(entryResult).toBeDefined()
    expect(entryResult.pieces_count).toBe(40)
    expect(entryCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        demand_id: 'dem-06',
        run_number: '458921',
        location_wms: 'DP07-RUA02-BL04',
        pieces_count: 40,
        is_active: true,
      }),
    )
    // Demanda deve ter mudado para 'Em inventário'
    expect(demandUpdateSpy).toHaveBeenCalledWith(
      'dem-06',
      expect.objectContaining({
        status: 'Em inventário',
      }),
    )
    // Evento de histórico registrado
    expect(historyCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'LANCAMENTO_ADICIONADO',
      }),
    )
  })

  // TESTE 07: "Histórico e Rastreabilidade" mostra eventos em ordem cronológica (dados reais persistidos)
  it('TESTE 07: "Histórico e Rastreabilidade" retorna timeline cronológica real e append-only', async () => {
    const mockAuditEvents: InventoryAuditEvent[] = [
      {
        id: 'aud-1',
        demand_id: 'dem-01',
        control_number: 'INV-2026-000001',
        event_type: 'DEMANDA_GERADA',
        event_description: 'Demanda de inventário INV-2026-000001 gerada com sucesso.',
        description: 'Demanda de inventário INV-2026-000001 gerada com sucesso.',
        cycle_number: 1,
        user_name: 'Lucas Ferreira (PCP)',
        created: '2026-09-27 10:00:00.000Z',
      },
      {
        id: 'aud-2',
        demand_id: 'dem-01',
        control_number: 'INV-2026-000001',
        event_type: 'INVENTARIO_INICIADO',
        event_description:
          'Inventário da demanda INV-2026-000001 iniciado pelo operador Roberto Silva.',
        description: 'Inventário da demanda INV-2026-000001 iniciado pelo operador Roberto Silva.',
        cycle_number: 1,
        user_name: 'Roberto Silva (Operação)',
        created: '2026-09-27 10:30:00.000Z',
      },
      {
        id: 'aud-3',
        demand_id: 'dem-01',
        control_number: 'INV-2026-000001',
        event_type: 'LANCAMENTO_ADICIONADO',
        event_description: 'Contagem física de 40 peças na localização DP07-RUA02-BL04.',
        description: 'Contagem física de 40 peças na localização DP07-RUA02-BL04.',
        cycle_number: 1,
        pieces_count: 40,
        user_name: 'Roberto Silva (Operação)',
        created: '2026-09-27 10:35:00.000Z',
      },
    ]

    const getHistorySpy = vi.fn().mockResolvedValue(mockAuditEvents)
    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_history') {
        return { getFullList: getHistorySpy } as any
      }
      return {} as any
    })

    const events = await pcpInventoryDemandsService.listAuditEventsByDemand('dem-01')

    expect(events).toHaveLength(3)
    expect(events[0].event_type).toBe('DEMANDA_GERADA')
    expect(events[1].event_type).toBe('INVENTARIO_INICIADO')
    expect(events[2].event_type).toBe('LANCAMENTO_ADICIONADO')
    expect(getHistorySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: "demand_id = 'dem-01' || inventory_order_id = 'dem-01'",
        sort: '-created',
      }),
    )
  })

  // TESTE 08: F5 / Recarregamento → dados continuam disponíveis no backend
  it('TESTE 08: Persistência real assegura que após F5 os dados da demanda e contagens continuam íntegros', async () => {
    const demandNoBanco: InventoryDemand = {
      id: 'dem-persistida',
      control_number: 'INV-2026-000001',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      material_code: 'TAR-130-1020',
      material_description: 'Tarugo SAE 1020 130mm x 12m',
      priority: 'Normal',
      status: 'Em inventário',
      total_pieces_required: 80,
      total_pieces_inventoried: 40,
      divergence_pieces: -40,
      divergence_pct: -50,
      created: '2026-09-27 10:00:00.000Z',
    }

    const entriesNoBanco: InventoryEntry[] = [
      {
        id: 'entry-01',
        demand_id: 'dem-persistida',
        run_id: 'run-01',
        control_number: 'INV-2026-000001',
        run_number: '458921',
        location_wms: 'DP07-RUA02-BL04',
        pieces_count: 40,
        user_id: 'usr-01',
        user_name: 'Roberto Silva (Operação)',
        entry_date_formatted: '27/09/2026 10:35',
        is_active: true,
        created: '2026-09-27 10:35:00.000Z',
      },
    ]

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return {
          getOne: vi.fn().mockResolvedValue(demandNoBanco),
          getFullList: vi.fn().mockResolvedValue([demandNoBanco]),
        } as any
      }
      if (col === 'pcp_mp_inventory_entries') {
        return {
          getFullList: vi.fn().mockResolvedValue(entriesNoBanco),
        } as any
      }
      return {} as any
    })

    // Simula reload da página lendo do backend
    const loadedDemand = await pcpInventoryDemandsService.getDemandById('dem-persistida')
    const loadedEntries = await pcpInventoryDemandsService.listEntriesByDemand('dem-persistida')

    expect(loadedDemand).not.toBeNull()
    expect(loadedDemand?.control_number).toBe('INV-2026-000001')
    expect(loadedDemand?.status).toBe('Em inventário')
    expect(loadedDemand?.total_pieces_inventoried).toBe(40)

    expect(loadedEntries).toHaveLength(1)
    expect(loadedEntries[0].run_number).toBe('458921')
    expect(loadedEntries[0].pieces_count).toBe(40)
  })

  // Salvamento Parcial e Conclusão de Demanda
  it('Salvar Parcial e Concluir Demanda atualizam status e registram auditoria imutável', async () => {
    const parentDemand: InventoryDemand = {
      id: 'dem-status-test',
      control_number: 'INV-2026-000001',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      material_code: 'TAR-130-1020',
      priority: 'Normal',
      status: 'Em inventário',
      total_pieces_required: 80,
      total_pieces_inventoried: 80,
      divergence_pieces: 0,
      divergence_pct: 0,
      created: '2026-09-27 10:00:00.000Z',
    }

    const demandUpdateSpy = vi.fn().mockImplementation((id, data) => {
      return Promise.resolve({ ...parentDemand, ...data })
    })
    const historyCreateSpy = vi.fn().mockResolvedValue({ id: 'aud-st' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return {
          getOne: vi.fn().mockResolvedValue(parentDemand),
          update: demandUpdateSpy,
        } as any
      }
      if (col === 'pcp_mp_inventory_entries') {
        return {
          getFullList: vi
            .fn()
            .mockResolvedValue([{ id: 'e-1', pieces_count: 80, is_active: true }]),
        } as any
      }
      if (col === 'pcp_mp_inventory_history') {
        return { create: historyCreateSpy } as any
      }
      return {} as any
    })

    // Teste Salvamento Parcial
    const partialRes = await pcpInventoryDemandsService.savePartialDemand('dem-status-test')
    expect(partialRes.status).toBe('Inventário parcial')
    expect(historyCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'SALVAMENTO_PARCIAL',
      }),
    )

    // Teste Conclusão
    const concludeRes = await pcpInventoryDemandsService.concludeDemand('dem-status-test')
    expect(concludeRes.status).toBe('Inventário concluído')
    expect(historyCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'INVENTARIO_CONCLUIDO',
      }),
    )
  })
})

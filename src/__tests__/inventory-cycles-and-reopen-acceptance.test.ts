import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { InventoryDemand } from '@/types/pcp-inventory-demands'
import { pb } from '@/lib/pocketbase/client'

describe('PCP Inventory Demands - Status, Ciclos e Reabertura', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('Demanda Concluída é terminal e não é elegível para lançamento físico', () => {
    const demandConcluida: InventoryDemand = {
      id: 'dem-01',
      control_number: 'INV-2026-000001',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNO1',
      storage_deposit: 'DP07',
      material_code: 'ST930',
      priority: 'Normal',
      status: 'Concluído',
      cycle_count: 1,
    }
    expect(pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(demandConcluida)).toBe(false)
  })

  it('Demanda Aberta e Parcial são elegíveis para lançamento físico', () => {
    const demandAberta: InventoryDemand = {
      id: 'dem-02',
      control_number: 'INV-2026-000002',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNO1',
      storage_deposit: 'DP07',
      material_code: 'ST930',
      priority: 'Normal',
      status: 'Aberto',
      cycle_count: 1,
    }
    const demandParcial: InventoryDemand = {
      ...demandAberta,
      status: 'Parcial',
    }
    expect(pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(demandAberta)).toBe(true)
    expect(pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(demandParcial)).toBe(true)
  })

  it('Demanda Cancelada é elegível na listagem de seleção pois reabrirá ciclo', () => {
    const demandCancelada: InventoryDemand = {
      id: 'dem-03',
      control_number: 'INV-2026-000003',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      material_code: 'st90',
      priority: 'Urgente',
      status: 'Cancelado',
      cycle_count: 1,
    }
    expect(pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(demandCancelada)).toBe(true)
  })

  it('reopenDemand incrementa cycle_count (+1), define status Aberto, total_pieces_inventoried=0 e registra histórico', async () => {
    const mockDemand: InventoryDemand = {
      id: 'dem-cancelada-test',
      control_number: 'INV-2026-000003',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      material_code: 'st90',
      priority: 'Urgente',
      status: 'Cancelado',
      cycle_count: 1,
      total_pieces_required: 100,
      total_pieces_inventoried: 30,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(mockDemand)

    const updateSpy = vi.fn().mockResolvedValue({
      ...mockDemand,
      status: 'Aberto',
      cycle_count: 2,
      total_pieces_inventoried: 0,
      divergence_pieces: -100,
      divergence_pct: -100,
    })

    const createHistorySpy = vi.fn().mockResolvedValue({ id: 'hist-reopen-1' })
    const createAuditSpy = vi.fn().mockResolvedValue({ id: 'audit-reopen-1' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return {
          update: updateSpy,
        } as any
      }
      if (col === 'pcp_mp_inventory_history') {
        return {
          create: createHistorySpy,
        } as any
      }
      if (col === 'pcp_audit_logs') {
        return {
          create: createAuditSpy,
        } as any
      }
      return {} as any
    })

    const reaberta = await pcpInventoryDemandsService.reopenDemand('dem-cancelada-test')

    expect(updateSpy).toHaveBeenCalledWith(
      'dem-cancelada-test',
      expect.objectContaining({
        status: 'Aberto',
        cycle_count: 2,
        total_pieces_inventoried: 0,
      }),
    )

    expect(createHistorySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'DEMANDA_REABERTA',
        description: expect.stringContaining(
          'Inventário reaberto para novo lançamento — status anterior: Cancelado',
        ),
      }),
    )

    expect(reaberta.status).toBe('Aberto')
    expect(reaberta.cycle_count).toBe(2)
  })

  it('concludeDemand define status Concluído, snapshot SAP e usuário/data', async () => {
    const mockDemand: InventoryDemand = {
      id: 'dem-conclude-test',
      control_number: 'INV-2026-000004',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNO1',
      storage_deposit: 'DP07',
      material_code: 'ST930',
      priority: 'Normal',
      status: 'Parcial',
      cycle_count: 1,
      total_pieces_required: 200,
      total_pieces_inventoried: 195,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(mockDemand)
    vi.spyOn(pcpInventoryDemandsService, 'listEntriesByDemand').mockResolvedValue([
      {
        id: 'entry-1',
        demand_id: 'dem-conclude-test',
        run_id: 'r1',
        control_number: 'INV-2026-000004',
        run_number: 'COR-1',
        location_wms: 'DP07',
        pieces_count: 195,
        cycle_number: 1,
        entry_date_formatted: '30/09/2026 14:00',
        user_id: 'u1',
        user_name: 'Operador DP07',
        is_active: true,
      },
    ])

    const updateSpy = vi.fn().mockImplementation((id: string, payload: any) => {
      return Promise.resolve({
        ...mockDemand,
        ...payload,
      })
    })
    const createHistorySpy = vi.fn().mockResolvedValue({ id: 'hist-conclude-1' })
    const createAuditSpy = vi.fn().mockResolvedValue({ id: 'audit-conclude-1' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return {
          update: updateSpy,
        } as any
      }
      if (col === 'pcp_mp_inventory_history') {
        return {
          create: createHistorySpy,
        } as any
      }
      if (col === 'pcp_audit_logs') {
        return {
          create: createAuditSpy,
        } as any
      }
      return {} as any
    })

    const concluded = await pcpInventoryDemandsService.concludeDemand('dem-conclude-test', {
      sap_balance: 200,
      sap_status: 'CONCILIADO',
      divergence_demand: -5,
      divergence_sap: -5,
      divergence_pct: -2.5,
    })

    expect(updateSpy).toHaveBeenCalledWith(
      'dem-conclude-test',
      expect.objectContaining({
        status: 'Concluído',
        sap_snapshot_balance: 200,
        sap_snapshot_status: 'CONCILIADO',
      }),
    )

    expect(concluded.status).toBe('Concluído')
  })
})

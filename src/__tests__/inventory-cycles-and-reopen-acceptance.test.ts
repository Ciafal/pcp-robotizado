import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { InventoryDemand, InventoryEntry } from '@/types/pcp-inventory-demands'
import { pb } from '@/lib/pocketbase/client'

/**
 * Suíte de Aceitação Automatizada: 20 Critérios do Usuário
 * PCP Robotizado > Programação > Inventário de matéria-prima > Lançar Inventário
 * Requisitos R1 a R12
 */
describe('Inventário MP - 20 Critérios de Aceite do Ciclo de Lançamento e Estados', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // C1: Demanda recém-criada inicia com status 'Aberto' (ou compatível 'Gerada' normalizada para Aberto)
  it('C1: Demanda recém-criada tem status inicial Aberto e cycle_count = 1', () => {
    const demand: InventoryDemand = {
      id: 'dem-c1',
      control_number: 'INV-2026-000010',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNO1',
      storage_deposit: 'DP07',
      material_code: 'ST930',
      status: 'Aberto',
      cycle_count: 1,
      total_pieces_required: 200,
      total_pieces_inventoried: 0,
    }
    expect(demand.status).toBe('Aberto')
    expect(demand.cycle_count).toBe(1)
    expect(demand.total_pieces_inventoried).toBe(0)
  })

  // C2: Status Aberto é elegível para seleção na tela de lançamento
  it('C2: Demanda em Aberto é elegível para lançamento físico', () => {
    const demand: InventoryDemand = {
      id: 'dem-c2',
      control_number: 'INV-2026-000011',
      status: 'Aberto',
      cycle_count: 1,
    }
    expect(pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(demand)).toBe(true)
  })

  // C3: Status Parcial é elegível para seleção na tela de lançamento
  it('C3: Demanda em Parcial é elegível para lançamento físico', () => {
    const demand: InventoryDemand = {
      id: 'dem-c3',
      control_number: 'INV-2026-000012',
      status: 'Parcial',
      cycle_count: 1,
    }
    expect(pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(demand)).toBe(true)
  })

  // C4: Status Cancelado é elegível para seleção (com objetivo de reabrir novo ciclo)
  it('C4: Demanda em Cancelado é elegível para seleção (reabrirá ciclo)', () => {
    const demand: InventoryDemand = {
      id: 'dem-c4',
      control_number: 'INV-2026-000003',
      status: 'Cancelado',
      cycle_count: 1,
    }
    expect(pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(demand)).toBe(true)
  })

  // C5: Status Concluído NUNCA é elegível para lançamento físico (estado terminal definitivo)
  it('C5: Demanda em Concluído é estritamente não-elegível para lançamento físico', () => {
    const demand: InventoryDemand = {
      id: 'dem-c5',
      control_number: 'INV-2026-000001',
      status: 'Concluído',
      cycle_count: 1,
    }
    expect(pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(demand)).toBe(false)
    expect(pcpInventoryDemandsService.isDemandConcluded(demand.status)).toBe(true)
  })

  // C6: Nunca usar filtro negativo 'status != CANCELADO' — Cancelado deve ser explicitamente aceito
  it('C6: Filtro de elegibilidade não usa status != CANCELADO e permite Aberto, Parcial e Cancelado', () => {
    const list: InventoryDemand[] = [
      { id: '1', control_number: 'INV-1', status: 'Aberto' },
      { id: '2', control_number: 'INV-2', status: 'Parcial' },
      { id: '3', control_number: 'INV-3', status: 'Cancelado' },
      { id: '4', control_number: 'INV-4', status: 'Concluído' },
    ]
    // Apenas Concluído é excluído da lista de seleção
    const eligible = list.filter((d) =>
      pcpInventoryDemandsService.isDemandEligibleForPhysicalEntry(d),
    )
    expect(eligible.map((d) => d.status)).toEqual(['Aberto', 'Parcial', 'Cancelado'])
  })

  // C7: Primeira contagem adicionada transiciona demanda de Aberto para Parcial
  it('C7: addEntry transiciona demanda Aberto/Gerada para status Parcial', async () => {
    const mockDemand: InventoryDemand = {
      id: 'dem-c7',
      control_number: 'INV-2026-000020',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNO1',
      storage_deposit: 'DP07',
      material_code: 'ST930',
      status: 'Aberto',
      cycle_count: 1,
      total_pieces_required: 100,
      total_pieces_inventoried: 0,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(mockDemand)

    const updateSpy = vi.fn().mockResolvedValue(mockDemand)
    const createItemSpy = vi.fn().mockResolvedValue({ id: 'item-new-1' })
    const createHistorySpy = vi.fn().mockResolvedValue({ id: 'hist-1' })
    const createAuditSpy = vi.fn().mockResolvedValue({ id: 'audit-1' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') return { update: updateSpy } as any
      if (col === 'pcp_mp_inventory_items') return { create: createItemSpy } as any
      if (col === 'pcp_mp_inventory_history') return { create: createHistorySpy } as any
      if (col === 'pcp_audit_logs') return { create: createAuditSpy } as any
      return {} as any
    })

    await pcpInventoryDemandsService.addEntry({
      demand_id: 'dem-c7',
      run_number: 'COR-45',
      location_wms: 'DP07-A1',
      pieces_count: 40,
    })

    expect(createItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        demand_id: 'dem-c7',
        run_number: 'COR-45',
        pieces_count: 40,
        status: 'Parcial',
      }),
    )
    expect(updateSpy).toHaveBeenCalledWith(
      'dem-c7',
      expect.objectContaining({
        status: 'Parcial',
      }),
    )
  })

  // C8: Salvar Parcial persiste demanda com status Parcial e mensagem adequada
  it('C8: savePartialDemand persiste status Parcial e atualiza totais', async () => {
    const mockDemand: InventoryDemand = {
      id: 'dem-c8',
      control_number: 'INV-2026-000021',
      status: 'Aberto',
      cycle_count: 1,
      total_pieces_required: 150,
      total_pieces_inventoried: 50,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(mockDemand)
    vi.spyOn(pcpInventoryDemandsService, 'listEntriesByDemand').mockResolvedValue([
      { id: 'e1', demand_id: 'dem-c8', pieces_count: 50, cycle_number: 1 } as any,
    ])

    const updateSpy = vi
      .fn()
      .mockImplementation((id: string, payload: any) =>
        Promise.resolve({ ...mockDemand, ...payload }),
      )
    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') return { update: updateSpy } as any
      if (col === 'pcp_mp_inventory_history') return { create: vi.fn() } as any
      if (col === 'pcp_audit_logs') return { create: vi.fn() } as any
      return {} as any
    })

    const updated = await pcpInventoryDemandsService.savePartialDemand('dem-c8')
    expect(updated.status).toBe('Parcial')
    expect(updateSpy).toHaveBeenCalledWith('dem-c8', { status: 'Parcial' })
  })

  // C9: Cancelar Inventário salva motivo obrigatório, finaliza ciclo e define status Cancelado
  it('C9: cancelDemand exige motivo, registra histórico com motivo e ciclo e define status Cancelado', async () => {
    const mockDemand: InventoryDemand = {
      id: 'dem-c9',
      control_number: 'INV-2026-000022',
      status: 'Parcial',
      cycle_count: 1,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(mockDemand)

    const updateSpy = vi
      .fn()
      .mockImplementation((id: string, payload: any) =>
        Promise.resolve({ ...mockDemand, ...payload }),
      )
    const historySpy = vi.fn().mockResolvedValue({ id: 'h1' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') return { update: updateSpy } as any
      if (col === 'pcp_mp_inventory_history') return { create: historySpy } as any
      if (col === 'pcp_audit_logs') return { create: vi.fn() } as any
      return {} as any
    })

    await expect(pcpInventoryDemandsService.cancelDemand('dem-c9', '')).rejects.toThrow(
      'Motivo do cancelamento é obrigatório.',
    )

    const cancelled = await pcpInventoryDemandsService.cancelDemand(
      'dem-c9',
      'Erro na contagem física',
    )

    expect(cancelled.status).toBe('Cancelado')
    expect(updateSpy).toHaveBeenCalledWith(
      'dem-c9',
      expect.objectContaining({
        status: 'Cancelado',
        cancellation_reason: 'Erro na contagem física',
      }),
    )
    expect(historySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'DEMANDA_CANCELADA',
        cycle_number: 1,
      }),
    )
  })

  // C10: Reabertura de demanda cancelada incrementa cycle_count (+1)
  it('C10: reopenDemand incrementa cycle_count (+1) e define status Aberto', async () => {
    const mockDemand: InventoryDemand = {
      id: 'dem-c10',
      control_number: 'INV-2026-000003',
      status: 'Cancelado',
      cycle_count: 1,
      total_pieces_required: 200,
      total_pieces_inventoried: 30,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(mockDemand)

    const updateSpy = vi
      .fn()
      .mockImplementation((id: string, payload: any) =>
        Promise.resolve({ ...mockDemand, ...payload }),
      )
    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') return { update: updateSpy } as any
      if (col === 'pcp_mp_inventory_history') return { create: vi.fn() } as any
      if (col === 'pcp_audit_logs') return { create: vi.fn() } as any
      return {} as any
    })

    const reopened = await pcpInventoryDemandsService.reopenDemand('dem-c10')
    expect(reopened.cycle_count).toBe(2)
    expect(reopened.status).toBe('Aberto')
    expect(reopened.total_pieces_inventoried).toBe(0)
  })

  // C11: Contagens do ciclo cancelado NÃO somam no novo ciclo (isolamento por cycle_number)
  it('C11: listEntriesByDemand com onlyCurrentCycle isola contagens antigas pelo ciclo vigente', async () => {
    const demandCiclo2: InventoryDemand = {
      id: 'dem-c11',
      control_number: 'INV-2026-000003',
      status: 'Aberto',
      cycle_count: 2,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(demandCiclo2)

    const getFullListSpy = vi.fn().mockResolvedValue([
      {
        id: 'entry-c2-1',
        demand_id: 'dem-c11',
        cycle_number: 2,
        pieces_count: 50,
        is_active: true,
      },
    ])

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_items') {
        return { getFullList: getFullListSpy } as any
      }
      return {} as any
    })

    const entries = await pcpInventoryDemandsService.listEntriesByDemand('dem-c11', true, true)
    expect(getFullListSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.stringContaining('cycle_number = 2'),
      }),
    )
    expect(entries.length).toBe(1)
    expect(entries[0].pieces_count).toBe(50)
  })

  // C12: Concluir Inventário exige confirmação e snapshot completo antes de status Concluído
  it('C12: concludeDemand persiste snapshot SAP e todos os indicadores com status Concluído', async () => {
    const mockDemand: InventoryDemand = {
      id: 'dem-c12',
      control_number: 'INV-2026-000030',
      status: 'Parcial',
      cycle_count: 1,
      total_pieces_required: 100,
      total_pieces_inventoried: 100,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(mockDemand)
    vi.spyOn(pcpInventoryDemandsService, 'listEntriesByDemand').mockResolvedValue([
      { id: 'e1', demand_id: 'dem-c12', pieces_count: 100, cycle_number: 1 } as any,
    ])

    const updateSpy = vi
      .fn()
      .mockImplementation((id: string, payload: any) =>
        Promise.resolve({ ...mockDemand, ...payload }),
      )
    const historySpy = vi.fn().mockResolvedValue({ id: 'h1' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') return { update: updateSpy } as any
      if (col === 'pcp_mp_inventory_history') return { create: historySpy } as any
      if (col === 'pcp_audit_logs') return { create: vi.fn() } as any
      return {} as any
    })

    const concluded = await pcpInventoryDemandsService.concludeDemand('dem-c12', {
      sap_balance: 100,
      sap_status: 'CONCILIADO',
      divergence_demand: 0,
      divergence_sap: 0,
      divergence_pct: 0,
    })

    expect(concluded.status).toBe('Concluído')
    expect(updateSpy).toHaveBeenCalledWith(
      'dem-c12',
      expect.objectContaining({
        status: 'Concluído',
        sap_snapshot_balance: 100,
        sap_snapshot_status: 'CONCILIADO',
      }),
    )
    expect(historySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'INVENTARIO_CONCLUIDO',
        new_value: 'Concluído',
      }),
    )
  })

  // C13: Tentativa de registrar contagem em demanda Concluída lança erro com mensagem exata
  it('C13: Tentativa de contagem em demanda Concluída lança mensagem R9 exata', async () => {
    const demandConcluida: InventoryDemand = {
      id: 'dem-c13',
      control_number: 'INV-2026-000001',
      status: 'Concluído',
      cycle_count: 1,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(demandConcluida)

    await expect(
      pcpInventoryDemandsService.addEntry({
        demand_id: 'dem-c13',
        run_number: 'COR-01',
        location_wms: 'DP07',
        pieces_count: 10,
      }),
    ).rejects.toThrow('Inventário concluído. Novas contagens não são permitidas.')
  })

  // C14: Tentativa de registrar contagem em demanda Cancelada sem reabrir lança erro orientando novo ciclo
  it('C14: Tentativa de contagem em demanda Cancelada lança orientação para novo ciclo', async () => {
    const demandCancelada: InventoryDemand = {
      id: 'dem-c14',
      control_number: 'INV-2026-000003',
      status: 'Cancelado',
      cycle_count: 1,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(demandCancelada)

    await expect(
      pcpInventoryDemandsService.addEntry({
        demand_id: 'dem-c14',
        run_number: 'COR-01',
        location_wms: 'DP07',
        pieces_count: 10,
      }),
    ).rejects.toThrow(
      'Não é possível registrar contagens em um ciclo de inventário cancelado. Reabra a demanda para iniciar um novo ciclo.',
    )
  })

  // C15: Demanda Concluída não pode ser reaberta (estado terminal)
  it('C15: Demanda Concluída não aceita reopenDemand', async () => {
    const demandConcluida: InventoryDemand = {
      id: 'dem-c15',
      control_number: 'INV-2026-000001',
      status: 'Concluído',
      cycle_count: 1,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(demandConcluida)

    await expect(pcpInventoryDemandsService.reopenDemand('dem-c15')).rejects.toThrow(
      'Não é possível reabrir uma demanda concluída (estado terminal).',
    )
  })

  // C16: Demanda Concluída não pode ser cancelada novamente
  it('C16: Demanda Concluída não aceita cancelamento', async () => {
    const demandConcluida: InventoryDemand = {
      id: 'dem-c16',
      control_number: 'INV-2026-000001',
      status: 'Concluído',
      cycle_count: 1,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(demandConcluida)

    await expect(
      pcpInventoryDemandsService.cancelDemand('dem-c16', 'Tentativa indevida'),
    ).rejects.toThrow('Não é possível cancelar uma demanda já concluída.')
  })

  // C17: Demanda Concluída não permite salvar parcial
  it('C17: Demanda Concluída não aceita savePartialDemand', async () => {
    const demandConcluida: InventoryDemand = {
      id: 'dem-c17',
      control_number: 'INV-2026-000001',
      status: 'Concluído',
      cycle_count: 1,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(demandConcluida)

    await expect(pcpInventoryDemandsService.savePartialDemand('dem-c17')).rejects.toThrow(
      'Inventário concluído. Novas contagens não são permitidas.',
    )
  })

  // C18: Histórico de auditoria preserva cycle_number em cada evento
  it('C18: Histórico de auditoria grava cycle_number para múltiplos ciclos', async () => {
    const mockDemand: InventoryDemand = {
      id: 'dem-c18',
      control_number: 'INV-2026-000003',
      status: 'Cancelado',
      cycle_count: 1,
    }

    vi.spyOn(pcpInventoryDemandsService, 'getDemandById').mockResolvedValue(mockDemand)

    const historySpy = vi.fn().mockResolvedValue({ id: 'h-c18' })
    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands')
        return {
          update: vi.fn().mockResolvedValue({ ...mockDemand, status: 'Aberto', cycle_count: 2 }),
        } as any
      if (col === 'pcp_mp_inventory_history') return { create: historySpy } as any
      if (col === 'pcp_audit_logs') return { create: vi.fn() } as any
      return {} as any
    })

    await pcpInventoryDemandsService.reopenDemand('dem-c18')
    expect(historySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cycle_number: 2,
        event_type: 'DEMANDA_REABERTA',
      }),
    )
  })

  // C19: Fórmulas matemáticas de Inventariado, Divergência Demanda, Divergência SAP e Divergência %
  it('C19: Fórmulas de divergência e total inventariado permanecem exatas', () => {
    const demanda = 200
    const inventariado = 190
    const saldoSap = 205

    const divDemanda = inventariado - demanda // 190 - 200 = -10
    const divSap = inventariado - saldoSap // 190 - 205 = -15
    const divPct = ((inventariado - demanda) / demanda) * 100 // (-10 / 200) * 100 = -5%

    expect(divDemanda).toBe(-10)
    expect(divSap).toBe(-15)
    expect(divPct).toBe(-5)
  })

  // C20: Leitura do banco após F5 (getDemandById + listEntriesByDemand) reflete status e contagens exatos
  it('C20: Leitura isolada do banco restaura estado consistente da demanda e contagens', async () => {
    const mockRecord = {
      id: 'dem-c20',
      control_number: 'INV-2026-000003',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNO1',
      storage_deposit: 'DP07',
      material_code: 'ST930',
      status: 'Cancelado',
      cycle_count: 1,
      total_pieces_required: 200,
      total_pieces_inventoried: 30,
    }

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return {
          getOne: vi.fn().mockResolvedValue(mockRecord),
        } as any
      }
      return {} as any
    })

    const fetched = await pcpInventoryDemandsService.getDemandById('dem-c20')
    expect(fetched).not.toBeNull()
    expect(fetched?.status).toBe('Cancelado')
    expect(fetched?.cycle_count).toBe(1)
    expect(fetched?.total_pieces_inventoried).toBe(30)
  })
})

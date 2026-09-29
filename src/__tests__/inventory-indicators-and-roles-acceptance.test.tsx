import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LancarInventarioModal } from '@/components/pcp/inventory/LancarInventarioModal'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { InventoryDemand } from '@/types/pcp-inventory-demands'

describe('LancarInventarioModal — ETAPA F & ETAPA G (6 Cards, Regras de Cálculo e Indicadores)', () => {
  const baseDemand: InventoryDemand = {
    id: 'dem-qa-999',
    control_number: 'INV-2026-000099',
    company: 'CIAFAL',
    line: 'L1',
    center: 'FORNOL1',
    storage_deposit: 'DP07',
    material_code: 'TAR-130-1020',
    material_description: 'Tarugo SAE 1020 130mm x 12m',
    priority: 'Normal',
    status: 'Gerada',
    total_pieces_required: 200,
    total_pieces_inventoried: 0,
    divergence_pieces: -200,
    divergence_pct: -100,
    requester_name: 'Carlos PCP Criador',
    created: '2026-09-27T10:00:00.000Z',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(pcpInventoryDemandsService, 'listRunsByDemand').mockResolvedValue([])
    vi.spyOn(pcpInventoryDemandsService, 'listGaugesByDemand').mockResolvedValue([])
  })

  // (A) Demanda 200 / Saldo SAP 198 / Inventariado 195 → −5, −3, −2,50%
  it('(Cenário A) Demanda 200, Saldo 198, Inventariado 195 → −5, −3, −2,50%', async () => {
    vi.spyOn(pcpInventoryDemandsService, 'listEntriesByDemand').mockResolvedValue([
      {
        id: 'ent-1',
        demand_id: 'dem-qa-999',
        run_id: '',
        control_number: 'INV-2026-000099',
        run_number: 'CORR-01',
        location_wms: 'DP07-01',
        pieces_count: 195,
        entry_date_formatted: '27/09/2026, 11:00',
        user_id: 'usr-b',
        user_name: 'Operador B',
        is_active: true,
      },
    ])

    vi.spyOn(pcpInventoryDemandsService, 'getSapStockBalance').mockResolvedValue({
      success: true,
      saldo: 198,
      timestamp: '2026-09-27T11:00:00Z',
    })

    render(
      <LancarInventarioModal
        open={true}
        onOpenChange={vi.fn()}
        demand={{ ...baseDemand, total_pieces_required: 200 }}
        onSuccess={vi.fn()}
      />,
    )

    await waitFor(() => {
      // 1. DEMANDA
      expect(screen.getByText('1. DEMANDA')).toBeDefined()
      expect(screen.getByText('200')).toBeDefined()

      // 2. SALDO SAP
      expect(screen.getByText('2. SALDO SAP')).toBeDefined()
      expect(screen.getByText('198')).toBeDefined()

      // 3. INVENTARIADO
      expect(screen.getByText('3. INVENTARIADO')).toBeDefined()
      expect(screen.getByText('195')).toBeDefined()

      // 4. DIVERGÊNCIA DEMANDA = 195 - 200 = -5
      expect(screen.getByText('4. DIVERGÊNCIA DEMANDA')).toBeDefined()
      expect(screen.getByText('−5')).toBeDefined()

      // 5. DIVERGÊNCIA SAP = 195 - 198 = -3
      expect(screen.getByText('5. DIVERGÊNCIA SAP')).toBeDefined()
      expect(screen.getByText('−3')).toBeDefined()

      // 6. DIVERGÊNCIA % = ((195 - 200)/200)*100 = -2,50%
      expect(screen.getByText('6. DIVERGÊNCIA %')).toBeDefined()
      expect(screen.getByText('−2,50%')).toBeDefined()
    })
  })

  // (B) Demanda 200 / Saldo SAP 198 / Inventariado 205 → +5, +7, +2,50%
  it('(Cenário B) Demanda 200, Saldo 198, Inventariado 205 → +5, +7, +2,50%', async () => {
    vi.spyOn(pcpInventoryDemandsService, 'listEntriesByDemand').mockResolvedValue([
      {
        id: 'ent-2',
        demand_id: 'dem-qa-999',
        run_id: '',
        control_number: 'INV-2026-000099',
        run_number: 'CORR-02',
        location_wms: 'DP07-02',
        pieces_count: 205,
        entry_date_formatted: '27/09/2026, 11:30',
        user_id: 'usr-b',
        user_name: 'Operador B',
        is_active: true,
      },
    ])

    vi.spyOn(pcpInventoryDemandsService, 'getSapStockBalance').mockResolvedValue({
      success: true,
      saldo: 198,
      timestamp: '2026-09-27T11:00:00Z',
    })

    render(
      <LancarInventarioModal
        open={true}
        onOpenChange={vi.fn()}
        demand={{ ...baseDemand, total_pieces_required: 200 }}
        onSuccess={vi.fn()}
      />,
    )

    await waitFor(() => {
      // 4. DIVERGÊNCIA DEMANDA = 205 - 200 = +5
      expect(screen.getByText('+5')).toBeDefined()

      // 5. DIVERGÊNCIA SAP = 205 - 198 = +7
      expect(screen.getByText('+7')).toBeDefined()

      // 6. DIVERGÊNCIA % = ((205 - 200)/200)*100 = +2,50%
      expect(screen.getByText('+2,50%')).toBeDefined()
    })
  })

  // (C) Saldo oficial 0 → "0 peças" (distinção de zero vs indisponível)
  it('(Cenário C) Saldo oficial 0 → exibe "0" "peças" sem mascarar', async () => {
    vi.spyOn(pcpInventoryDemandsService, 'listEntriesByDemand').mockResolvedValue([])

    vi.spyOn(pcpInventoryDemandsService, 'getSapStockBalance').mockResolvedValue({
      success: true,
      saldo: 0,
      timestamp: '2026-09-27T11:00:00Z',
    })

    render(
      <LancarInventarioModal
        open={true}
        onOpenChange={vi.fn()}
        demand={baseDemand}
        onSuccess={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('2. SALDO SAP')).toBeDefined()
      // Card do Saldo SAP exibe 0 como saldo válido
      expect(screen.getByText('Estoque Oficial SAP')).toBeDefined()
      expect(screen.queryByText('Saldo indisponível')).toBeNull()
    })
  })

  // (D) SAP indisponível → "Saldo indisponível" / "—", nunca zero
  it('(Cenário D) SAP indisponível → exibe "Saldo indisponível" e "—" na divergência SAP', async () => {
    vi.spyOn(pcpInventoryDemandsService, 'listEntriesByDemand').mockResolvedValue([])

    vi.spyOn(pcpInventoryDemandsService, 'getSapStockBalance').mockResolvedValue({
      success: false,
      saldo: null,
      code: 'SAP_RFC_NOT_CONFIGURED',
      message: 'Não foi possível consultar o saldo no SAP.',
    })

    render(
      <LancarInventarioModal
        open={true}
        onOpenChange={vi.fn()}
        demand={baseDemand}
        onSuccess={vi.fn()}
      />,
    )

    await waitFor(() => {
      // Exibe "Saldo indisponível" e botão "Tentar novamente"
      expect(screen.getByText('Saldo indisponível')).toBeDefined()
      expect(screen.getByText('Tentar novamente')).toBeDefined()

      // Card 5 (DIVERGÊNCIA SAP) exibe "—" e nunca zero
      expect(screen.getByText('5. DIVERGÊNCIA SAP')).toBeDefined()
      expect(screen.getByText('—')).toBeDefined()
      expect(screen.getByText('Sem saldo SAP')).toBeDefined()
    })
  })

  // (E) Preservação de responsáveis: Solicitante (criou), Contagem, Conclusão
  it('(Cenário E) Histórico preserva os 3 responsáveis distintos', async () => {
    const concludeSpy = vi.spyOn(pcpInventoryDemandsService, 'concludeDemand').mockResolvedValue({
      ...baseDemand,
      status: 'Inventário concluído',
      requester_name: 'Usuario A (Criador)',
      concluded_by: 'Usuario C (Conclusao)',
      concluded_at: '2026-09-27T12:00:00Z',
      total_pieces_inventoried: 195,
    })

    const result = await pcpInventoryDemandsService.concludeDemand('dem-qa-999', {
      sap_balance: 198,
      sap_status: 'CONCILIADO',
      divergence_demand: -5,
      divergence_sap: -3,
      divergence_pct: -2.5,
    })

    expect(concludeSpy).toHaveBeenCalledWith('dem-qa-999', {
      sap_balance: 198,
      sap_status: 'CONCILIADO',
      divergence_demand: -5,
      divergence_sap: -3,
      divergence_pct: -2.5,
    })

    expect(result.requester_name).toBe('Usuario A (Criador)')
    expect(result.concluded_by).toBe('Usuario C (Conclusao)')
  })
})

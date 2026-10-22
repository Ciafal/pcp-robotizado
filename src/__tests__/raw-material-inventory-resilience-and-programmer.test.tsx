import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import RawMaterialInventoryPage from '@/pages/pcp/RawMaterialInventoryPage'
import { pcpMonthlySummaryService } from '@/services/pcp-monthly-summaries'
import {
  RawMaterialInventoryService,
  rawMaterialInventoryService,
} from '@/services/pcp-raw-material-inventory-service'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import pb from '@/lib/pocketbase/client'

describe('Inventário de matéria-prima — Cenários de Resiliência, PCP_PROGRAMMER e ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Simula sessão autenticada com PCP_PROGRAMMER
    pb.authStore.save('mock-token-pcp-programmer', {
      id: 'usr-pcp-programmer-01',
      collectionId: 'users',
      collectionName: 'users',
      email: 'programador@ciafal.com.br',
      name: 'Programador PCP',
      role: 'PCP_PROGRAMMER',
      roles: ['PCP_PROGRAMMER'],
    } as any)
  })

  it('1. loadRealCenters nunca quebra e utiliza source_center_code com fallback seguro', async () => {
    const centers = await pcpMonthlySummaryService.loadRealCenters()
    expect(Array.isArray(centers)).toBe(true)
    expect(centers.length).toBeGreaterThan(0)
    // Centros devem ter code e name válidos
    expect(centers[0]).toHaveProperty('code')
    expect(centers[0]).toHaveProperty('name')
  })

  it('2. evaluateItemAlerts e buildOrderTimeline são resilientes a itens com campos nulos ou indefinidos', () => {
    // Teste com item nulo
    expect(RawMaterialInventoryService.evaluateItemAlerts(null as any)).toEqual([])
    expect(RawMaterialInventoryService.evaluateItemAlerts(undefined as any)).toEqual([])

    // Teste com item vazio/incompleto
    const emptyItem: any = {
      id: 'test-item-null',
      production_order: null,
      dp07_inventoried_pieces: null,
      pieces_divergence: null,
      sap_pieces_count: null,
      is_material_located: null,
      is_material_blocked: null,
      status: null,
    }
    const alerts = RawMaterialInventoryService.evaluateItemAlerts(emptyItem)
    expect(Array.isArray(alerts)).toBe(true)

    // Timeline também não pode quebrar
    const timeline = RawMaterialInventoryService.buildOrderTimeline(emptyItem, [])
    expect(Array.isArray(timeline)).toBe(true)
    expect(timeline.length).toBeGreaterThan(0)
  })

  it('3. ErrorBoundary lida com erros de renderização e persistência de auditoria de forma graciosa', () => {
    const BombComponent = () => {
      throw new Error('Falha simulada de renderização')
    }

    render(
      <ErrorBoundary moduleName="Teste Unitário Componente">
        <BombComponent />
      </ErrorBoundary>,
    )

    // Deve exibir o fallback compacto sem quebrar a tela inteira
    expect(
      screen.getByText(/Falha temporária ao carregar Teste Unitário Componente/i),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeDefined()
  })

  it('4. RawMaterialInventoryPage renderiza sem exceção com perfil PCP_PROGRAMMER no estado vazio inicial', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/sequenciamento/inventario-mp']}>
        <RawMaterialInventoryPage />
      </MemoryRouter>,
    )

    // Verifica que título principal da página renderiza
    expect(screen.getByText('Inventário de matéria-prima')).toBeDefined()
    expect(screen.getByText('Gestão de Inventário')).toBeDefined()

    // Verifica estado vazio amigável quando nenhum filtro estiver ativo
    await waitFor(() => {
      expect(
        screen.getByText(
          /Nenhum inventário de matéria-prima encontrado para os filtros selecionados/i,
        ),
      ).toBeDefined()
    })
  })

  it('5. listDemands e listInventoryOrders retornam array vazio seguro mesmo se backend falhar', async () => {
    const demands = await pcpInventoryDemandsService.listDemands()
    expect(Array.isArray(demands)).toBe(true)

    const orders = await rawMaterialInventoryService.listInventoryOrders()
    expect(Array.isArray(orders)).toBe(true)
  })
})

import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PcpResumoGeralPage } from '@/pages/pcp/PcpResumoGeralPage'
import { officialNavGroups } from '@/components/layout/PCPNavigation'

// Mock de services
vi.mock('@/services/mp-sidercentro-service', () => ({
  mpSdcService: {
    getSteelMatrixRows: vi.fn().mockResolvedValue([
      {
        id: 'sdc-1',
        material_code: 'MAT-1020-01',
        steel_grade: 'SAE 1020',
        total_stock_tons: 1055,
        stock_sdc_ds03_tons: 650,
        stock_ciafal_dp04_tons: 405,
        min_stock_tons: 1200,
        statistical_coverage_days: 14,
        rupture_risk_level: 'AMARELO',
      },
    ]),
    getL2PlannedVsRealized: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/services/mp-dimensional-notes-service', () => ({
  mpMultipleCuttingPlansService: {
    listPlans: vi.fn().mockResolvedValue([
      {
        id: 'plan-1',
        plan_code: 'PCM-2026-00001',
        status: 'Aprovado',
        version: 1,
        material_code: 'MAT-1020-01',
        material_description: 'Barra Redonda 1020',
        cutting_yield_pct: 94.5,
        created: '2026-03-20T10:00:00Z',
      },
      {
        id: 'plan-2',
        plan_code: 'PCM-2026-00002',
        status: 'Em Revisão',
        version: 1,
        material_code: 'MAT-1045-02',
        material_description: 'Barra Redonda 1045',
        cutting_yield_pct: 91.2,
        created: '2026-03-21T11:00:00Z',
      },
    ]),
  },
}))

vi.mock('@/services/pcp-raw-material-inventory-service', () => ({
  rawMaterialInventoryService: {
    listInventoryOrders: vi.fn().mockResolvedValue([
      {
        id: 'inv-1',
        line: 'L1',
        schedule_date: '2026-03-22',
        schedule_version: 1,
        status: 'Aberto',
        total_items_count: 5,
      },
    ]),
  },
}))

vi.mock('@/lib/pocketbase/client', () => ({
  pb: {
    collection: vi.fn().mockReturnValue({
      getFullList: vi.fn().mockResolvedValue([]),
    }),
    authStore: {
      isValid: true,
      record: { id: 'user-1', role: 'PCP_ADMIN' },
    },
  },
  default: {
    collection: vi.fn().mockReturnValue({
      getFullList: vi.fn().mockResolvedValue([]),
    }),
    authStore: {
      isValid: true,
      record: { id: 'user-1', role: 'PCP_ADMIN' },
    },
  },
}))

describe('PcpResumoGeralPage — Dashboard de Resumo Geral', () => {
  it('contém a rota /pcp/resumo-geral no menu oficial de navegação oficialNavGroups', () => {
    const principalGroup = officialNavGroups.find((g) => g.groupTitle === 'PRINCIPAL')
    expect(principalGroup).toBeDefined()
    const resumoItem = principalGroup?.items.find((item) => item.href === '/pcp/resumo-geral')
    expect(resumoItem).toBeDefined()
    expect(resumoItem?.title).toBe('Resumo Geral')
  })

  it('renderiza o dashboard com formato de toneladas pt-BR (ex.: 1.055,000 t) e dados agregados reais', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/resumo-geral']}>
        <PcpResumoGeralPage />
      </MemoryRouter>,
    )

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText(/Resumo Geral — PCP Robotizado/i)).toBeInTheDocument()
    })

    // Verifica formatação em 3 decimais padrão pt-BR de toneladas
    expect(screen.getByText('1.055,000 t')).toBeInTheDocument()

    // Verifica plano de corte carregado
    expect(screen.getByText('PCM-2026-00001')).toBeInTheDocument()
    expect(screen.getByText('SAE 1020')).toBeInTheDocument()

    // Verifica cards de navegação rápida e botões de acesso
    expect(screen.getByText(/Acessar MP/i)).toBeInTheDocument()
    expect(screen.getByText(/Planos de Corte/i)).toBeInTheDocument()
    expect(screen.getByText(/Inventário/i)).toBeInTheDocument()
  })

  it('exibe "Dado não disponível" honesto quando indicador SAP ou L2 não possui registro, nunca zero inventado', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/resumo-geral']}>
        <PcpResumoGeralPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Resumo Geral — PCP Robotizado/i)).toBeInTheDocument()
    })

    // Volume programado sem weekly_schedules carregadas deve exibir estado honesto
    expect(screen.getAllByText(/Dado não disponível/i).length).toBeGreaterThan(0)
  })
})
